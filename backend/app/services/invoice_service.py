import logging
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models import Invoice, AuditLog, User
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class InvoiceService:
    """
    Handles all Invoice database operations.
    """

    # =====================================================
    # Create / Upload Invoices
    # =====================================================

    def upload_and_create_invoice(
        self,
        db: Session,
        vendor_name: str,
        invoice_number: str,
        invoice_date_str: str,
        currency: str,
        total: float,
        file: UploadFile,
    ) -> Invoice:
        """
        Validates the file extension/size, checks for duplicate invoice numbers,
        seeds a default user if none exist, uploads the file to S3, and saves
        invoice metadata and AuditLog to PostgreSQL in a transaction.
        If DB save fails, it rolls back and deletes the uploaded S3 object.
        """
        filename = file.filename or "unnamed_file"
        
        # 1. Validate File Extension
        extension = Path(filename).suffix.lstrip(".").lower()
        if extension not in settings.ALLOWED_EXTENSIONS:
            logger.warning(f"File upload rejected: extension '.{extension}' is not allowed for file '{filename}'.")
            raise HTTPException(
                status_code=400,
                detail=f"File extension '.{extension}' is not allowed. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # 2. Validate File Size
        if file.size is not None:
            file_size = file.size
        else:
            try:
                file.file.seek(0, 2)
                file_size = file.file.tell()
                file.file.seek(0)
            except Exception as e:
                logger.error(f"Failed to calculate file size for '{filename}': {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail="Unable to determine file size."
                )

        max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_size_bytes:
            logger.warning(f"File upload rejected: file size {file_size} bytes exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds the maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # 3. Handle Duplicate Invoice Numbers (Pre-check to save S3 costs)
        if self.invoice_exists(db, invoice_number):
            logger.warning(f"File upload rejected: invoice number '{invoice_number}' already exists.")
            raise HTTPException(
                status_code=409,
                detail=f"Invoice with number '{invoice_number}' already exists."
            )

        # Parse invoice_date
        try:
            if isinstance(invoice_date_str, (date, datetime)):
                invoice_date = invoice_date_str
            else:
                invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
        except Exception as e:
            logger.warning(f"File upload rejected: invalid date format '{invoice_date_str}': {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid invoice_date format. Expected format: YYYY-MM-DD."
            )

        # 4. Generate S3 Key and Upload
        s3_key = None
        try:
            logger.info(f"Uploading file '{filename}' ({file_size} bytes) to S3...")
            s3_key = storage_service.upload_file(file.file, filename)
            logger.info(f"Successfully uploaded '{filename}' to S3 key '{s3_key}'")
        except Exception as e:
            logger.error(f"S3 upload failed for file '{filename}': {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Cloud storage upload failed: {str(e)}"
            )

        # 5. Save Metadata & Audit Log inside a database transaction
        try:
            logger.info(f"Saving invoice metadata for number '{invoice_number}' to database...")
            
            # Check if there is any user in the database, and seed a default user if empty
            user = db.query(User).first()
            if not user:
                logger.info("No users found in database. Seeding a default system user...")
                user = User(name="System User", email="system@example.com")
                db.add(user)
                db.flush()

            invoice = Invoice(
                user_id=user.id,
                vendor_name=vendor_name,
                invoice_number=invoice_number,
                invoice_date=invoice_date,
                currency=currency,
                total=total,
                filename=filename,
                file_size=file_size,
                s3_key=s3_key,
                status="UPLOADED",
            )
            db.add(invoice)
            db.flush()  # Populates invoice.id for the AuditLog

            # Create AuditLog entry
            audit_log = AuditLog(
                invoice_id=invoice.id,
                action="UPLOAD",
                actor="System",
                details=f"Invoice file '{filename}' uploaded and metadata registered.",
                severity="info",
            )
            db.add(audit_log)

            db.commit()
            db.refresh(invoice)
            logger.info(f"Successfully committed invoice metadata (ID: {invoice.id}) and AuditLog.")
            return invoice

        except Exception as db_err:
            logger.error(f"Database write failed: {str(db_err)}. Initiating rollback & S3 cleanup...")
            db.rollback()

            # Clean up the S3 object if it was uploaded
            if s3_key:
                try:
                    storage_service.delete_file(s3_key)
                    logger.info(f"Cleaned up uploaded S3 object '{s3_key}' after DB transaction failure.")
                except Exception as s3_err:
                    logger.error(f"Failed to delete S3 key '{s3_key}' during cleanup: {str(s3_err)}")

            # Check if duplicate constraint failed under race conditions
            if isinstance(db_err, IntegrityError):
                logger.warning(f"Database integrity constraint failed (possible duplicate invoice number '{invoice_number}'): {str(db_err)}")
                raise HTTPException(
                    status_code=409,
                    detail=f"Invoice with number '{invoice_number}' already exists."
                )

            raise HTTPException(
                status_code=500,
                detail=f"Failed to save invoice metadata: {str(db_err)}"
            )

    def create_invoice(self, db: Session, **invoice_data) -> Invoice:
        invoice = Invoice(**invoice_data)

        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        return invoice

    # =====================================================
    # Background Processing Pipeline
    # =====================================================

    def _parse_risk_level_and_score(self, report_text: str) -> tuple[str, float]:
        """
        Parses risk level and risk score from Gemini's risk report.
        """
        import re
        level = "low"
        score = 15.0
        
        lower_text = report_text.lower()
        
        # Risk level mapping
        if "critical" in lower_text:
            level = "critical"
            score = 90.0
        elif "high" in lower_text:
            level = "high"
            score = 75.0
        elif "medium" in lower_text or "moderate" in lower_text:
            level = "medium"
            score = 50.0
        elif "low" in lower_text:
            level = "low"
            score = 15.0
            
        # Extract numerical score using regular expressions
        score_match = re.search(r"score:?\s*(\d+)", lower_text)
        if score_match:
            try:
                score = float(score_match.group(1))
            except ValueError:
                pass
        else:
            score_match_alt = re.search(r"(\d+)\s*/\s*100", lower_text)
            if score_match_alt:
                try:
                    score = float(score_match_alt.group(1))
                except ValueError:
                    pass
                    
        return level, score

    def process_invoice_pipeline(self, invoice_id: int):
        """
        Background document processing pipeline using its own dedicated DB session.
        Ingestion states: UPLOADED -> OCR_PROCESSING -> OCR_COMPLETED -> AI_PROCESSING -> EXTRACTED -> PENDING_REVIEW (or FAILED).
        """
        from app.database import SessionLocal
        from app.services.ai_service import ai_service
        from app.services.gemini_service import gemini_service
        from app.models import InvoiceItem, AuditLog

        logger.info(f"Background pipeline task triggered for invoice ID: {invoice_id}")
        db = SessionLocal()
        
        def mark_as_failed(error_message: str):
            try:
                inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
                if inv:
                    inv.status = "FAILED"
                    audit_log = AuditLog(
                        invoice_id=invoice_id,
                        action="PROCESS_FAILED",
                        actor="AI System",
                        details=error_message[:1000],
                        severity="error"
                    )
                    db.add(audit_log)
                    db.commit()
                    logger.info(f"Background pipeline for ID {invoice_id} set to FAILED state.")
            except Exception as inner_err:
                logger.error(f"Error marking invoice ID {invoice_id} as failed: {str(inner_err)}")
            finally:
                db.close()

        # ----------------------------------------------------
        # Stage 1: OCR Ingestion
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if not invoice or not invoice.s3_key:
                raise ValueError(f"No invoice record or S3 key exists for ID {invoice_id}")

            invoice.status = "OCR_PROCESSING"
            db.commit()
            logger.info(f"Stage 1 [OCR_PROCESSING] initiated for ID {invoice_id}")

            ocr_result = ai_service.extract_text(invoice.s3_key)
            
            invoice.ocr_text = ocr_result.get("text")
            invoice.ocr_confidence = ocr_result.get("confidence")
            invoice.ocr_json = ocr_result
            invoice.status = "OCR_COMPLETED"
            
            audit_log = AuditLog(
                invoice_id=invoice.id,
                action="OCR_COMPLETED",
                actor="AI System",
                details=f"OCR text extraction completed with average confidence {ocr_result.get('confidence')}%",
                severity="info"
            )
            db.add(audit_log)
            db.commit()
            logger.info(f"Stage 1 [OCR_COMPLETED] committed for ID {invoice_id}")

        except Exception as ocr_err:
            logger.error(f"OCR stage failed for ID {invoice_id}: {str(ocr_err)}")
            db.rollback()
            mark_as_failed(f"OCR stage failed: {str(ocr_err)}")
            return

        # ----------------------------------------------------
        # Stage 2: AI Extraction
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            invoice.status = "AI_PROCESSING"
            db.commit()
            logger.info(f"Stage 2 [AI_PROCESSING] initiated for ID {invoice_id}")

            invoice_json = gemini_service.extract_invoice(invoice.ocr_text or "")
            
            # Save extracted fields
            invoice.vendor_name = invoice_json.get("vendor_name") or invoice.vendor_name
            invoice.vendor_country = invoice_json.get("vendor_country") or invoice.vendor_country
            invoice.invoice_number = invoice_json.get("invoice_number") or invoice.invoice_number
            invoice.payment_terms = invoice_json.get("payment_terms") or invoice.payment_terms
            
            invoice_date_str = invoice_json.get("invoice_date")
            if invoice_date_str:
                try:
                    invoice.invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
                except Exception:
                    try:
                        invoice.invoice_date = datetime.strptime(invoice_date_str, "%d/%m/%Y").date()
                    except Exception:
                        pass

            invoice.currency = invoice_json.get("currency") or invoice.currency
            invoice.subtotal = invoice_json.get("subtotal") or invoice.subtotal
            invoice.tax = invoice_json.get("tax") or invoice.tax
            invoice.total = invoice_json.get("total") or invoice.total
            
            # Calculate FX rate and converted total
            currency = (invoice.currency or "USD").upper().strip()
            total_val = float(invoice.total or 0.0)
            rates = {
                "USD": 1.0,
                "EUR": 1.08,
                "GBP": 1.27,
                "JPY": 0.0066,
                "CAD": 0.74,
            }
            invoice.fx_rate = invoice_json.get("fx_rate") or rates.get(currency, 1.0)
            invoice.converted_total = total_val * float(invoice.fx_rate)

            # Run Validation Engine
            issues = self.run_validation_engine(invoice)
            invoice.validation_issues = issues
            
            invoice.extracted_json = invoice_json
            invoice.confidence_score = invoice.ocr_confidence or 90.0
            invoice.status = "EXTRACTED"

            # Create items
            if "items" in invoice_json and isinstance(invoice_json["items"], list):
                db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
                for item_data in invoice_json["items"]:
                    item = InvoiceItem(
                        invoice_id=invoice.id,
                        description=item_data.get("description") or "Item Description",
                        quantity=item_data.get("quantity"),
                        unit_price=item_data.get("unit_price"),
                        line_total=item_data.get("line_total")
                    )
                    db.add(item)

            audit_log = AuditLog(
                invoice_id=invoice.id,
                action="AI_COMPLETED",
                actor="AI System",
                details="AI field extraction and JSON mapping completed successfully.",
                severity="info"
            )
            db.add(audit_log)
            db.commit()
            logger.info(f"Stage 2 [EXTRACTED] committed for ID {invoice_id}")

        except Exception as ai_err:
            logger.error(f"AI Extraction stage failed for ID {invoice_id}: {str(ai_err)}")
            db.rollback()
            mark_as_failed(f"AI extraction failed: {str(ai_err)}")
            return

        # ----------------------------------------------------
        # Stage 3: Risk Assessment & Finalization
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            logger.info(f"Stage 3 [Risk Analysis] initiated for ID {invoice_id}")

            risk_report = gemini_service.generate_risk_report(invoice.extracted_json or {})
            
            # Store risk details separately
            invoice.ai_risk_summary = risk_report
            risk_level, risk_score = self._parse_risk_level_and_score(risk_report)
            invoice.risk_level = risk_level
            invoice.risk_score = risk_score
            
            invoice.status = "PENDING_REVIEW"

            audit_log = AuditLog(
                invoice_id=invoice.id,
                action="PROCESS_COMPLETE",
                actor="AI System",
                details=f"Pipeline processing finished. Risk: {risk_level.upper()} (Score: {risk_score})",
                severity="success" if risk_level == "low" else "warning"
            )
            db.add(audit_log)
            db.commit()
            logger.info(f"Stage 3 [PENDING_REVIEW] completed for ID {invoice_id}")

        except Exception as risk_err:
            logger.error(f"Risk stage failed for ID {invoice_id}: {str(risk_err)}")
            db.rollback()
            mark_as_failed(f"Risk analysis failed: {str(risk_err)}")
            return
        finally:
            db.close()

    def run_validation_engine(self, invoice: Invoice) -> list[str]:
        """
        Runs field-level validation and cross-referencing on the invoice metadata.
        Returns a list of validation issues (strings).
        """
        issues = []
        
        # 1. Zero or negative total
        total = float(invoice.total or 0.0)
        if total <= 0:
            issues.append("Invoice total is zero or negative")
            
        # 2. Future invoice date
        if invoice.invoice_date:
            inv_date = invoice.invoice_date
            if isinstance(inv_date, datetime):
                inv_date = inv_date.date()
            if inv_date > date.today():
                issues.append("Invoice date is in the future")
                
        # 3. Missing vendor country
        if not invoice.vendor_country or not invoice.vendor_country.strip():
            issues.append("Missing vendor country")
            
        # 4. Non-standard payment terms
        terms = (invoice.payment_terms or "").strip().lower()
        if not terms:
            issues.append("Non-standard payment terms")
        else:
            standard_terms = ["net 30", "net 60", "due on receipt", "net 15", "net 45", "net 90", "immediate"]
            if terms not in standard_terms:
                issues.append("Non-standard payment terms")
                
        # 5. Incomplete extraction tags
        if not invoice.vendor_name or not invoice.invoice_number or not invoice.invoice_date or total == 0:
            issues.append("Incomplete extraction tags")
            
        # 6. FX rate discrepancies
        currency = (invoice.currency or "USD").upper().strip()
        if currency != "USD":
            fx_rate = float(invoice.fx_rate) if invoice.fx_rate is not None else None
            if fx_rate is None or fx_rate == 1.0:
                issues.append("FX rate discrepancy: FX rate is missing or set to 1.0 for non-USD invoice")
            else:
                expected_converted = total * fx_rate
                conv_total = float(invoice.converted_total) if invoice.converted_total is not None else 0.0
                if abs(conv_total - expected_converted) > 0.01:
                    issues.append("FX rate discrepancy: converted total does not match total * FX rate")
                    
        return issues

    # =====================================================
    # Get By ID
    # =====================================================

    def get_invoice(self, db: Session, invoice_id: int) -> Invoice | None:
        return (
            db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

    # =====================================================
    # Get All
    # =====================================================

    def get_all_invoices(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ):
        return (
            db.query(Invoice)
            .order_by(Invoice.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # =====================================================
    # Update
    # =====================================================

    def update_invoice(
        self,
        db: Session,
        invoice: Invoice,
        **updates,
    ) -> Invoice:

        for key, value in updates.items():
            setattr(invoice, key, value)

        # Recalculate FX if total or currency changed
        if "total" in updates or "currency" in updates:
            currency = (invoice.currency or "USD").upper().strip()
            total_val = float(invoice.total or 0.0)
            rates = {
                "USD": 1.0,
                "EUR": 1.08,
                "GBP": 1.27,
                "JPY": 0.0066,
                "CAD": 0.74,
            }
            invoice.fx_rate = rates.get(currency, 1.0)
            invoice.converted_total = total_val * float(invoice.fx_rate)

        # Re-run validation engine
        invoice.validation_issues = self.run_validation_engine(invoice)

        # Create MANUAL_EDIT AuditLog
        audit_log = AuditLog(
            invoice_id=invoice.id,
            action="MANUAL_EDIT",
            actor="Manual Reviewer",
            details="Invoice fields manually updated during review.",
            severity="info"
        )
        db.add(audit_log)

        db.commit()
        db.refresh(invoice)

        return invoice

    # =====================================================
    # Approve / Reject
    # =====================================================

    def approve_invoice(
        self,
        db: Session,
        invoice: Invoice,
        notes: Optional[str] = None,
    ) -> Invoice:
        invoice.status = "APPROVED"

        audit_log = AuditLog(
            invoice_id=invoice.id,
            action="APPROVE",
            actor="Manual Reviewer",
            details=notes or "Invoice manually approved.",
            severity="success"
        )
        db.add(audit_log)

        db.commit()
        db.refresh(invoice)
        return invoice

    def reject_invoice(
        self,
        db: Session,
        invoice: Invoice,
        reason: str,
    ) -> Invoice:
        invoice.status = "REJECTED"

        audit_log = AuditLog(
            invoice_id=invoice.id,
            action="REJECT",
            actor="Manual Reviewer",
            details=reason,
            severity="error"
        )
        db.add(audit_log)

        db.commit()
        db.refresh(invoice)
        return invoice

    # =====================================================
    # Delete
    # =====================================================

    def delete_invoice_and_file(
        self,
        db: Session,
        invoice: Invoice,
    ):
        """
        Deletes the invoice record from the database and its associated file from S3.
        """
        s3_key = invoice.s3_key
        invoice_id = invoice.id

        logger.info(f"Deleting invoice ID {invoice_id} from database...")
        try:
            db.delete(invoice)
            db.commit()
            logger.info(f"Successfully deleted invoice ID {invoice_id} from database.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to delete invoice ID {invoice_id} from database: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete invoice from database: {str(e)}"
            )

        if s3_key:
            logger.info(f"Attempting to delete associated S3 file with key '{s3_key}'...")
            try:
                storage_service.delete_file(s3_key)
                logger.info(f"Successfully deleted associated S3 file '{s3_key}'.")
            except Exception as e:
                # Log but do not block since database deletion is already committed
                logger.warning(f"S3 deletion failed for key '{s3_key}' (orphaned file): {str(e)}")

    def delete_invoice(
        self,
        db: Session,
        invoice: Invoice,
    ):

        db.delete(invoice)
        db.commit()

    # =====================================================
    # Exists
    # =====================================================

    def invoice_exists(
        self,
        db: Session,
        invoice_number: str,
    ) -> bool:

        return (
            db.query(Invoice)
            .filter(Invoice.invoice_number == invoice_number)
            .first()
            is not None
        )


invoice_service = InvoiceService()
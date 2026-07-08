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

        # Re-run validation and compliance engines
        from app.services.validation_service import validation_service
        from app.services.compliance_service import compliance_service
        
        validation_service.validate_invoice(db, invoice)
        compliance_service.validate_compliance(db, invoice)

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
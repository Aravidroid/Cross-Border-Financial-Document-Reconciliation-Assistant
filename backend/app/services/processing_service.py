import logging
import re
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Invoice, InvoiceItem, AuditLog
from app.config import settings
from app.services.ai_service import ai_service
from app.services.gemini_service import gemini_service
from app.services.validation_service import validation_service
from app.services.fx_service import fx_service

logger = logging.getLogger(__name__)

class ProcessingService:
    def process_invoice_pipeline(self, invoice_id: int):
        """
        Background document processing pipeline using its own dedicated DB session.
        Ingestion states: UPLOADED -> OCR_PROCESSING -> OCR_COMPLETED -> AI_PROCESSING -> EXTRACTED -> VALIDATING -> VALIDATED -> RISK_ANALYZING -> PENDING_REVIEW (or FAILED).
        """
        logger.info(f"Background pipeline task triggered for invoice ID: {invoice_id}")
        db = SessionLocal()
        
        def mark_as_failed(error_message: str):
            try:
                # Use a fresh connection/session to log the failure in case the main transaction was corrupted
                fail_db = SessionLocal()
                inv = fail_db.query(Invoice).filter(Invoice.id == invoice_id).first()
                if inv:
                    inv.status = "FAILED"
                    audit_log = AuditLog(
                        invoice_id=invoice_id,
                        action="PROCESS_FAILED",
                        actor="AI System",
                        details=error_message[:1000],
                        severity="error"
                    )
                    fail_db.add(audit_log)
                    fail_db.commit()
                    logger.info(f"Background pipeline for ID {invoice_id} set to FAILED state.")
                fail_db.close()
            except Exception as inner_err:
                logger.error(f"Error marking invoice ID {invoice_id} as failed: {str(inner_err)}")

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
            db.close()
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
            base_currency = (settings.BASE_CURRENCY or "INR").upper().strip()
            total_val = float(invoice.total or 0.0)
            try:
                rate, _ = fx_service.get_exchange_rate(currency, base_currency)
            except Exception as e:
                logger.warning(f"Failed to fetch live FX rate for {currency} to {base_currency} in Stage 2: {str(e)}. Using fallback rates.")
                if base_currency == "INR":
                    rates = {
                        "INR": 1.0,
                        "USD": 83.5,
                        "EUR": 90.0,
                        "GBP": 106.0,
                        "JPY": 0.52,
                        "CAD": 61.0,
                    }
                else:
                    rates = {
                        "USD": 1.0,
                        "EUR": 1.08,
                        "GBP": 1.27,
                        "JPY": 0.0066,
                        "CAD": 0.74,
                    }
                rate = rates.get(currency, 1.0)
            
            invoice.fx_rate = rate
            invoice.converted_total = total_val * rate
            
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
            db.close()
            mark_as_failed(f"AI extraction failed: {str(ai_err)}")
            return

        # ----------------------------------------------------
        # Stage 3: Financial Validation (Math Firewall)
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            invoice.status = "VALIDATING"
            db.commit()
            logger.info(f"Stage 3 [VALIDATING] initiated for ID {invoice_id}")

            # Run deterministic validation service
            validation_service.validate_invoice(db, invoice)
            
            invoice.status = "VALIDATED"
            db.commit()
            logger.info(f"Stage 3 [VALIDATED] committed for ID {invoice_id}")

        except Exception as val_err:
            logger.error(f"Validation stage failed for ID {invoice_id}: {str(val_err)}")
            db.rollback()
            db.close()
            mark_as_failed(f"Financial validation failed: {str(val_err)}")
            return

        # ----------------------------------------------------
        # Stage 3.5: Regulatory Compliance Checker
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            invoice.status = "COMPLIANCE_CHECKING"
            db.commit()
            logger.info(f"Stage 3.5 [COMPLIANCE_CHECKING] initiated for ID {invoice_id}")

            from app.services.compliance_service import compliance_service
            compliance_service.validate_compliance(db, invoice)
            
            invoice.status = "COMPLIANCE_AUDITED"
            db.commit()
            logger.info(f"Stage 3.5 [COMPLIANCE_AUDITED] committed for ID {invoice_id}")

        except Exception as comp_err:
            logger.error(f"Compliance stage failed for ID {invoice_id}: {str(comp_err)}")
            db.rollback()
            db.close()
            mark_as_failed(f"Regulatory compliance checks failed: {str(comp_err)}")
            return

        # ----------------------------------------------------
        # Stage 3.7: FX Intelligence
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            invoice.status = "FX_ANALYZING"
            db.commit()
            logger.info(f"Stage 3.7 [FX_ANALYZING] initiated for ID {invoice_id}")

            fx_service.analyze_invoice_fx(invoice)
            
            invoice.status = "FX_ANALYZED"
            db.commit()
            logger.info(f"Stage 3.7 [FX_ANALYZED] committed for ID {invoice_id}")

        except Exception as fx_err:
            logger.error(f"FX stage failed for ID {invoice_id}: {str(fx_err)}")
            db.rollback()
            db.close()
            mark_as_failed(f"FX Intelligence analysis failed: {str(fx_err)}")
            return

        # ----------------------------------------------------
        # Stage 4: Risk Assessment & Finalization
        # ----------------------------------------------------
        try:
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            invoice.status = "RISK_ANALYZING"
            db.commit()
            logger.info(f"Stage 4 [Risk Analysis] initiated for ID {invoice_id}")

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
                details=f"Pipeline processing finished. Risk: {risk_level.upper()} (Score: {risk_score}), Validation Score: {invoice.validation_score}/100, Compliance Score: {invoice.compliance_score}/100",
                severity="success" if (risk_level == "low" and invoice.validation_status == "PASS" and invoice.compliance_status == "PASS") else "warning"
            )
            db.add(audit_log)
            db.commit()
            logger.info(f"Stage 4 [PENDING_REVIEW] completed for ID {invoice_id}")

        except Exception as risk_err:
            logger.error(f"Risk stage failed for ID {invoice_id}: {str(risk_err)}")
            db.rollback()
            mark_as_failed(f"Risk analysis failed: {str(risk_err)}")
            return
        finally:
            db.close()

    def _parse_risk_level_and_score(self, report_text: str) -> tuple[str, float]:
        """
        Parses risk level and risk score from Gemini's risk report.
        """
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

processing_service = ProcessingService()

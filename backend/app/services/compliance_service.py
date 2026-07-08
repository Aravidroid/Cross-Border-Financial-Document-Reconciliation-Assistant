import logging
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models import Invoice, AuditLog

logger = logging.getLogger(__name__)

class ComplianceService:
    # Allowed standard payment terms (lowercase)
    ALLOWED_TERMS = {
        "net 15",
        "net 30",
        "net 45",
        "net 60",
        "net 90",
        "due on receipt",
        "immediate",
    }

    # Common currency-to-country associations for consistency checks
    COUNTRY_CURRENCY_MAP = {
        "US": "USD",
        "DE": "EUR",
        "FR": "EUR",
        "ES": "EUR",
        "IT": "EUR",
        "NL": "EUR",
        "BE": "EUR",
        "GB": "GBP",
        "UK": "GBP",
        "JP": "JPY",
        "CA": "CAD",
    }

    # Configurable PO requirement threshold in USD (default: $10,000)
    PO_THRESHOLD_USD = 10000.0

    def validate_compliance(self, db: Session, invoice: Invoice) -> Dict[str, Any]:
        """
        Runs a deterministic 10-check compliance audit on the invoice.
        Saves compliance score, status, issues, and detailed report to the database record.
        """
        logger.info(f"Running regulatory compliance audit for invoice ID {invoice.id}")

        checks = {}
        issues = []
        has_critical_failures = False

        # Safe parsing helper
        def get_float(val, default=0.0):
            if val is None:
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        # Basic fields
        vendor_name = (invoice.vendor_name or "").strip()
        vendor_country = (invoice.vendor_country or "").strip().upper()
        invoice_number = (invoice.invoice_number or "").strip()
        tax_id = (invoice.tax_id or "").strip()
        currency = (invoice.currency or "USD").strip().upper()
        payment_terms = (invoice.payment_terms or "").strip().lower()
        po_number = (invoice.po_number or "").strip()

        # Numeric fields
        total = get_float(invoice.total, 0.0)
        subtotal = get_float(invoice.subtotal, 0.0)
        converted_total = get_float(invoice.converted_total, total)

        # ----------------------------------------------------
        # 1. Mandatory Required Fields (15 pts)
        # ----------------------------------------------------
        missing_reqs = []
        if not vendor_name:
            missing_reqs.append("vendor_name")
        if not vendor_country:
            missing_reqs.append("vendor_country")
        if not invoice_number:
            missing_reqs.append("invoice_number")
        if not invoice.invoice_date:
            missing_reqs.append("invoice_date")
        if not tax_id:
            missing_reqs.append("tax_id")
        if invoice.total is None:
            missing_reqs.append("total")

        if not missing_reqs:
            checks["required_fields"] = {"score": 15, "max": 15, "pass": True, "message": "All required regulatory fields are present."}
        else:
            checks["required_fields"] = {
                "score": 0,
                "max": 15,
                "pass": False,
                "message": f"Missing mandatory regulatory fields: {', '.join(missing_reqs)}."
            }
            issues.append(f"Missing compliance fields: {', '.join(missing_reqs)}")
            has_critical_failures = True

        # ----------------------------------------------------
        # 2. Invoice Number Format Validation (10 pts)
        # ----------------------------------------------------
        inv_num_ok = True
        inv_num_msg = "Invoice number format is valid."

        if not invoice_number:
            inv_num_ok = False
            inv_num_msg = "Invoice number is missing."
        elif len(invoice_number) < 3:
            inv_num_ok = False
            inv_num_msg = f"Invoice number '{invoice_number}' is too short (minimum 3 characters)."
        elif invoice_number.lower() in {"temp", "draft", "placeholder", "123", "abc", "12345", "test"}:
            inv_num_ok = False
            inv_num_msg = f"Invoice number '{invoice_number}' is a generic placeholder/draft identifier."
        elif not re.match(r"^[A-Za-z0-9\-/_#]+$", invoice_number):
            inv_num_ok = False
            inv_num_msg = f"Invoice number '{invoice_number}' contains invalid characters (allowed: alphanumeric, dashes, slashes, hashes, underscores)."

        if inv_num_ok:
            checks["invoice_number_format"] = {"score": 10, "max": 10, "pass": True, "message": inv_num_msg}
        else:
            checks["invoice_number_format"] = {"score": 0, "max": 10, "pass": False, "message": inv_num_msg}
            issues.append(inv_num_msg)

        # ----------------------------------------------------
        # 3. ISO-4217 Currency Validation (10 pts)
        # ----------------------------------------------------
        valid_currencies = {"USD", "EUR", "GBP", "JPY", "CAD"}
        if currency in valid_currencies:
            checks["currency_iso"] = {"score": 10, "max": 10, "pass": True, "message": f"Currency '{currency}' is standard and supported."}
        else:
            checks["currency_iso"] = {
                "score": 0,
                "max": 10,
                "pass": False,
                "message": f"Currency '{invoice.currency}' is not in the supported compliance list: {', '.join(valid_currencies)}."
            }
            issues.append(f"Invalid currency: '{invoice.currency}'")

        # ----------------------------------------------------
        # 4. Tax ID / VAT / GST Format Validation (10 pts)
        # ----------------------------------------------------
        tax_format_ok = True
        tax_format_msg = "Tax ID format is valid."

        if not tax_id:
            tax_format_ok = False
            tax_format_msg = "Tax ID is missing."
        else:
            # US Format: EIN (XX-XXXXXXX or 9 digits)
            if vendor_country == "US":
                if not re.match(r"^\d{2}-\d{7}$", tax_id) and not re.match(r"^\d{9}$", tax_id):
                    tax_format_ok = False
                    tax_format_msg = f"US Tax ID '{tax_id}' does not match standard EIN format (XX-XXXXXXX or 9 digits)."
            # UK Format: GBXXXXXXXXX (GB followed by 9 digits)
            elif vendor_country in {"GB", "UK"}:
                # Strip prefix for verification or assert prefix
                if not re.match(r"^GB\d{9}$", tax_id) and not re.match(r"^\d{9}$", tax_id):
                    tax_format_ok = False
                    tax_format_msg = f"UK Tax ID '{tax_id}' does not match UK VAT format (GB followed by 9 digits, or 9 digits)."
            # Japan Format: Corporate ID TXXXXXXXXXXXXX (T followed by 13 digits)
            elif vendor_country == "JP":
                if not re.match(r"^T\d{13}$", tax_id) and not re.match(r"^\d{13}$", tax_id):
                    tax_format_ok = False
                    tax_format_msg = f"Japan Tax ID '{tax_id}' does not match JP invoice registration format (T followed by 13 digits)."
            # EU Format: 2-letter country code + 8 to 12 alphanumeric characters
            elif re.match(r"^[A-Z]{2}$", vendor_country):
                # Loose EU check
                eu_countries = {"DE", "FR", "ES", "IT", "NL", "BE", "AT", "IE", "FI", "SE", "DK", "PL", "PT"}
                if vendor_country in eu_countries:
                    if not tax_id.startswith(vendor_country) and not tax_id.startswith("EU"):
                        tax_format_ok = False
                        tax_format_msg = f"EU Tax ID '{tax_id}' should be prefixed with the country code '{vendor_country}' or 'EU'."
                    elif not re.match(r"^[A-Z]{2}[A-Z0-9]{8,12}$", tax_id):
                        tax_format_ok = False
                        tax_format_msg = f"Tax ID '{tax_id}' does not match standard EU VAT format."
            else:
                # Generic fallback check: at least 5 alphanumeric characters
                if not re.match(r"^[A-Z0-9\-]{5,20}$", tax_id.upper()):
                    tax_format_ok = False
                    tax_format_msg = f"Tax ID '{tax_id}' is in an unrecognized format."

        if tax_format_ok:
            checks["tax_id_format"] = {"score": 10, "max": 10, "pass": True, "message": tax_format_msg}
        else:
            checks["tax_id_format"] = {"score": 0, "max": 10, "pass": False, "message": tax_format_msg}
            issues.append(tax_format_msg)

        # ----------------------------------------------------
        # 5. Country-Specific Compliance Rules (15 pts) [CRITICAL]
        # ----------------------------------------------------
        country_ok = True
        country_msg = "Invoice complies with country-specific taxation fields."

        if not vendor_country:
            country_ok = False
            country_msg = "Vendor country is missing."
        else:
            # EU Rules
            eu_countries = {"DE", "FR", "ES", "IT", "NL", "BE"}
            if vendor_country in eu_countries:
                if not tax_id:
                    country_ok = False
                    country_msg = f"EU country '{vendor_country}' requires a VAT ID."
                elif not tax_id.startswith(vendor_country):
                    country_ok = False
                    country_msg = f"EU vendor country is '{vendor_country}', but VAT ID '{tax_id}' starts with a different country prefix."
            # UK Rules
            elif vendor_country in {"GB", "UK"}:
                if not tax_id:
                    country_ok = False
                    country_msg = "UK invoice requires a VAT ID."
                elif not tax_id.startswith("GB"):
                    country_ok = False
                    country_msg = f"UK invoice VAT ID '{tax_id}' must begin with 'GB'."
            # JP Rules
            elif vendor_country == "JP":
                if not tax_id:
                    country_ok = False
                    country_msg = "Japan invoice requires a registration number."
                elif not tax_id.startswith("T"):
                    country_ok = False
                    country_msg = f"Japan Invoice Registration Number '{tax_id}' must begin with prefix 'T'."

        if country_ok:
            checks["country_compliance"] = {"score": 15, "max": 15, "pass": True, "message": country_msg}
        else:
            checks["country_compliance"] = {"score": 0, "max": 15, "pass": False, "message": country_msg}
            issues.append(country_msg)
            has_critical_failures = True

        # ----------------------------------------------------
        # 6. Invoice & Due Date Consistency (10 pts)
        # ----------------------------------------------------
        dates_ok = True
        dates_msg = "Date fields are logically consistent."

        inv_date = invoice.invoice_date
        due_date = invoice.due_date

        if inv_date:
            if isinstance(inv_date, datetime):
                inv_date = inv_date.date()
            if inv_date > date.today():
                dates_ok = False
                dates_msg = "Invoice date cannot be in the future."
        else:
            dates_ok = False
            dates_msg = "Invoice date is missing."

        if dates_ok and due_date:
            if isinstance(due_date, datetime):
                due_date = due_date.date()
            if due_date < inv_date:
                dates_ok = False
                dates_msg = f"Due date ({due_date}) cannot be earlier than invoice date ({inv_date})."
            elif (due_date - inv_date).days > 180:
                dates_ok = False
                dates_msg = f"Due date interval ({due_date - inv_date} days) exceeds maximum compliance standard of 180 days."

        if dates_ok:
            checks["date_consistency"] = {"score": 10, "max": 10, "pass": True, "message": dates_msg}
        else:
            checks["date_consistency"] = {"score": 0, "max": 10, "pass": False, "message": dates_msg}
            issues.append(dates_msg)

        # ----------------------------------------------------
        # 7. Allowed Payment Terms Validation (10 pts)
        # ----------------------------------------------------
        terms_ok = True
        if not payment_terms:
            terms_ok = False
            terms_msg = "Payment terms are missing."
        elif payment_terms not in self.ALLOWED_TERMS:
            terms_ok = False
            terms_msg = f"Payment terms '{invoice.payment_terms}' do not belong to the allowed list: {', '.join(self.ALLOWED_TERMS)}."
        else:
            terms_msg = f"Payment terms '{invoice.payment_terms}' are approved."

        if terms_ok:
            checks["payment_terms"] = {"score": 10, "max": 10, "pass": True, "message": terms_msg}
        else:
            checks["payment_terms"] = {"score": 0, "max": 10, "pass": False, "message": terms_msg}
            issues.append(terms_msg)

        # ----------------------------------------------------
        # 8. Duplicate Invoice Compliance (10 pts) [CRITICAL]
        # ----------------------------------------------------
        # Duplicate vendor + invoice number combo lookup
        has_dup_combo = False
        if invoice_number and vendor_name:
            dup = db.query(Invoice).filter(
                Invoice.invoice_number == invoice_number,
                Invoice.vendor_name == vendor_name,
                Invoice.id != invoice.id
            ).first()
            if dup:
                has_dup_combo = True

        if not has_dup_combo:
            checks["duplicate_compliance"] = {"score": 10, "max": 10, "pass": True, "message": "No other invoices exist for this vendor with the same invoice number."}
        else:
            checks["duplicate_compliance"] = {
                "score": 0,
                "max": 10,
                "pass": False,
                "message": f"Duplicate document detected: Vendor '{vendor_name}' already has an invoice with number '{invoice_number}'."
            }
            issues.append(f"Duplicate document detected: '{vendor_name}' - '{invoice_number}'")
            has_critical_failures = True

        # ----------------------------------------------------
        # 9. PO Requirement (Configurable Threshold) (5 pts)
        # ----------------------------------------------------
        po_ok = True
        po_msg = "Invoice value does not require a Purchase Order reference, or PO number is present."

        if converted_total > self.PO_THRESHOLD_USD:
            if not po_number:
                po_ok = False
                po_msg = f"Invoice total (USD {converted_total:.2f}) exceeds the compliance threshold of USD {self.PO_THRESHOLD_USD:.2f} but lacks a Purchase Order (PO) number reference."
            else:
                po_msg = f"Invoice total (USD {converted_total:.2f}) exceeds the threshold, and a valid PO reference '{po_number}' is provided."

        if po_ok:
            checks["po_requirement"] = {"score": 5, "max": 5, "pass": True, "message": po_msg}
        else:
            checks["po_requirement"] = {"score": 0, "max": 5, "pass": False, "message": po_msg}
            issues.append(po_msg)

        # ----------------------------------------------------
        # 10. Positive Value & Document Consistency Checks (5 pts)
        # ----------------------------------------------------
        consistency_ok = True
        consistency_msgs = []

        if total <= 0:
            consistency_ok = False
            consistency_msgs.append("Grand total must be positive.")
        if subtotal < 0:
            consistency_ok = False
            consistency_msgs.append("Subtotal cannot be negative.")

        # Cross-border currency/country alignment check
        expected_currency = self.COUNTRY_CURRENCY_MAP.get(vendor_country)
        if expected_currency and currency != expected_currency:
            consistency_msgs.append(f"Currency mismatch warning: vendor country is '{vendor_country}' (usually expects '{expected_currency}'), but invoice uses '{currency}'.")
            # We don't fail this check, but flag it as warning in messages

        if consistency_ok:
            checks["consistency_check"] = {
                "score": 5,
                "max": 5,
                "pass": True,
                "message": f"Consistency check passed. {'; '.join(consistency_msgs)}" if consistency_msgs else "Document consistency verified."
            }
        else:
            checks["consistency_check"] = {
                "score": 0,
                "max": 5,
                "pass": False,
                "message": f"Consistency issues: {'; '.join(consistency_msgs)}."
            }
            issues.extend(consistency_msgs)

        # ----------------------------------------------------
        # Score and Status Determination
        # ----------------------------------------------------
        total_score = sum(c["score"] for c in checks.values())
        
        # PASS if score >= 85 and no critical compliance failures
        compliance_status = "PASS" if (total_score >= 85 and not has_critical_failures) else "FAIL"

        compliance_report = {
            "score": total_score,
            "status": compliance_status,
            "has_critical_failures": has_critical_failures,
            "checks": checks,
            "details": {
                "vendor_country": vendor_country,
                "currency": currency,
                "tax_id": tax_id,
                "converted_total_usd": converted_total,
                "po_number": po_number
            }
        }

        # Save to invoice record
        invoice.compliance_score = float(total_score)
        invoice.compliance_status = compliance_status
        invoice.compliance_report = compliance_report

        # Create audit log
        audit_log = AuditLog(
            invoice_id=invoice.id,
            action="COMPLIANCE_COMPLETED" if compliance_status == "PASS" else "COMPLIANCE_FAILED",
            actor="Compliance Engine",
            details=f"Regulatory compliance checks completed. Score: {total_score}/100. Status: {compliance_status}. Issues: {len(issues)}",
            severity="info" if compliance_status == "PASS" else "error"
        )
        db.add(audit_log)

        try:
            db.commit()
            db.refresh(invoice)
            logger.info(f"Invoice ID {invoice.id} compliance audited. Status: {compliance_status}, Score: {total_score}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit compliance results for ID {invoice.id}: {str(e)}")
            raise e

        return compliance_report

compliance_service = ComplianceService()

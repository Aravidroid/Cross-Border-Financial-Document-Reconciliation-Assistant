import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models import Invoice, AuditLog, InvoiceItem

logger = logging.getLogger(__name__)

class ValidationService:
    # Supported/valid currencies and their standard decimal places
    CURRENCY_PRECISION = {
        "USD": 2,
        "EUR": 2,
        "GBP": 2,
        "CAD": 2,
        "JPY": 0,
    }

    def validate_invoice(self, db: Session, invoice: Invoice) -> Dict[str, Any]:
        """
        Runs a deterministic 10-check validation on the invoice.
        Saves validation score, status, issues list, and detailed report to the invoice database record.
        """
        logger.info(f"Running deterministic validation for invoice ID {invoice.id}")

        checks = {}
        issues = []
        has_critical_issues = False

        # Prepare currency and extraction details
        currency = (invoice.currency or "USD").upper().strip()
        precision = self.CURRENCY_PRECISION.get(currency, 2)
        extracted = invoice.extracted_json or {}

        # Safe extraction helper
        def get_float(val, default=0.0):
            if val is None:
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        # Numeric values from DB
        subtotal = get_float(invoice.subtotal, 0.0)
        tax = get_float(invoice.tax, 0.0)
        total = get_float(invoice.total, 0.0)

        # Discount & shipping from extracted_json
        discount = get_float(extracted.get("discount"), 0.0)
        shipping = get_float(extracted.get("shipping"), 0.0)

        # ----------------------------------------------------
        # 1. Required Fields Check (15 pts)
        # ----------------------------------------------------
        req_missing = []
        if not invoice.vendor_name or not invoice.vendor_name.strip():
            req_missing.append("vendor_name")
        if not invoice.invoice_number or not invoice.invoice_number.strip():
            req_missing.append("invoice_number")
        if not invoice.invoice_date:
            req_missing.append("invoice_date")
        if invoice.total is None:
            req_missing.append("total")
        if not invoice.currency or not invoice.currency.strip():
            req_missing.append("currency")

        if not req_missing:
            checks["required_fields"] = {"score": 15, "max": 15, "pass": True, "message": "All required fields are present."}
        else:
            checks["required_fields"] = {
                "score": 0,
                "max": 15,
                "pass": False,
                "message": f"Missing required fields: {', '.join(req_missing)}."
            }
            issues.append(f"Missing required fields: {', '.join(req_missing)}")

        # ----------------------------------------------------
        # 2. Duplicate Invoice Check (15 pts) [CRITICAL]
        # ----------------------------------------------------
        is_duplicate = False
        if invoice.invoice_number:
            dup = db.query(Invoice).filter(
                Invoice.invoice_number == invoice.invoice_number,
                Invoice.id != invoice.id
            ).first()
            if dup:
                is_duplicate = True

        if not is_duplicate:
            checks["duplicate_check"] = {"score": 15, "max": 15, "pass": True, "message": "Invoice number is unique."}
        else:
            checks["duplicate_check"] = {
                "score": 0,
                "max": 15,
                "pass": False,
                "message": f"Duplicate invoice detected: Invoice number '{invoice.invoice_number}' already exists in the system."
            }
            issues.append(f"Duplicate invoice detected: '{invoice.invoice_number}' already exists")
            has_critical_issues = True

        # ----------------------------------------------------
        # 3. Line Items Math Check (15 pts)
        # ----------------------------------------------------
        items_valid = True
        item_mismatches = []
        items = invoice.items or []

        for idx, item in enumerate(items):
            qty = get_float(item.quantity, 0.0)
            price = get_float(item.unit_price, 0.0)
            reported_total = get_float(item.line_total, 0.0)
            expected_total = round(qty * price, precision)

            if abs(reported_total - expected_total) > 0.02:
                items_valid = False
                item_mismatches.append(
                    f"Line {idx+1} ('{item.description or 'Item'}'): Qty {qty} * Price {price} = Expected {expected_total}, but got {reported_total}"
                )

        if items_valid:
            checks["line_items_math"] = {
                "score": 15,
                "max": 15,
                "pass": True,
                "message": f"All {len(items)} line item calculations are accurate." if items else "No line items to check."
            }
        else:
            checks["line_items_math"] = {
                "score": 0,
                "max": 15,
                "pass": False,
                "message": f"Calculations incorrect on line items: {'; '.join(item_mismatches)}."
            }
            issues.extend(item_mismatches)

        # ----------------------------------------------------
        # 4. Subtotal Reconciliation Check (10 pts)
        # ----------------------------------------------------
        subtotal_valid = True
        if items:
            sum_lines = sum(get_float(item.line_total, 0.0) for item in items)
            if abs(subtotal - sum_lines) > 0.05:
                subtotal_valid = False
                subtotal_msg = f"Sum of line totals ({sum_lines:.2f}) does not equal Subtotal ({subtotal:.2f})."
            else:
                subtotal_msg = "Sum of line totals matches subtotal."
        else:
            subtotal_msg = "No line items present; subtotal check skipped."

        if subtotal_valid:
            checks["subtotal_reconciliation"] = {"score": 10, "max": 10, "pass": True, "message": subtotal_msg}
        else:
            checks["subtotal_reconciliation"] = {"score": 0, "max": 10, "pass": False, "message": subtotal_msg}
            issues.append(subtotal_msg)

        # ----------------------------------------------------
        # 5. Grand Total Formula Check (15 pts) [CRITICAL]
        # ----------------------------------------------------
        # Firewall: Subtotal - Discount + Tax + Shipping = Grand Total
        expected_total = round(subtotal - discount + tax + shipping, precision)
        total_msg = f"Subtotal ({subtotal:.2f}) - Discount ({discount:.2f}) + Tax ({tax:.2f}) + Shipping ({shipping:.2f}) = Expected Total: {expected_total:.2f}, Actual Total: {total:.2f}."
        
        math_diff = abs(total - expected_total)
        if math_diff <= 0.05:
            checks["grand_total_math"] = {"score": 15, "max": 15, "pass": True, "message": total_msg}
        else:
            checks["grand_total_math"] = {"score": 0, "max": 15, "pass": False, "message": total_msg}
            issues.append(f"Math Firewall Mismatch: Expected {expected_total:.2f}, got {total:.2f}")
            if math_diff > 1.00:
                has_critical_issues = True

        # ----------------------------------------------------
        # 6. Decimal Precision Check (10 pts)
        # ----------------------------------------------------
        def check_precision(val):
            if val is None:
                return True
            # Check length of fractional part in string representation
            s = f"{float(val):.6f}".rstrip('0').split('.')
            frac = s[1] if len(s) > 1 else ""
            return len(frac) <= precision

        precision_ok = True
        precision_fields = []
        if not check_precision(total):
            precision_ok = False
            precision_fields.append("total")
        if not check_precision(subtotal):
            precision_ok = False
            precision_fields.append("subtotal")
        if not check_precision(tax):
            precision_ok = False
            precision_fields.append("tax")
        if not check_precision(discount):
            precision_ok = False
            precision_fields.append("discount")
        if not check_precision(shipping):
            precision_ok = False
            precision_fields.append("shipping")

        for idx, item in enumerate(items):
            if not check_precision(item.unit_price):
                precision_ok = False
                precision_fields.append(f"item {idx+1} unit price")
            if not check_precision(item.line_total):
                precision_ok = False
                precision_fields.append(f"item {idx+1} line total")

        if precision_ok:
            checks["decimal_precision"] = {
                "score": 10,
                "max": 10,
                "pass": True,
                "message": f"All amounts match the standard precision of {precision} decimals for {currency}."
            }
        else:
            checks["decimal_precision"] = {
                "score": 0,
                "max": 10,
                "pass": False,
                "message": f"Non-standard decimal precision detected in fields: {', '.join(precision_fields)} (Expected maximum {precision} decimals)."
            }
            issues.append(f"Non-standard decimal precision in: {', '.join(precision_fields)}")

        # ----------------------------------------------------
        # 7. Currency Format Check (5 pts)
        # ----------------------------------------------------
        currency_ok = currency in self.CURRENCY_PRECISION
        if currency_ok:
            checks["currency_format"] = {"score": 5, "max": 5, "pass": True, "message": f"Supported ISO 4217 currency '{currency}'."}
        else:
            checks["currency_format"] = {
                "score": 0,
                "max": 5,
                "pass": False,
                "message": f"Unsupported or improperly formatted currency '{invoice.currency}'. Supported: {', '.join(self.CURRENCY_PRECISION.keys())}."
            }
            issues.append(f"Unsupported currency: '{invoice.currency}'")

        # ----------------------------------------------------
        # 8. Line Item Required Fields Check (5 pts)
        # ----------------------------------------------------
        item_fields_ok = True
        missing_item_fields = []
        for idx, item in enumerate(items):
            missing = []
            if not item.description or not item.description.strip():
                missing.append("description")
            if item.quantity is None:
                missing.append("quantity")
            if item.unit_price is None:
                missing.append("unit_price")
            if item.line_total is None:
                missing.append("line_total")
            if missing:
                item_fields_ok = False
                missing_item_fields.append(f"Line {idx+1} lacks: {', '.join(missing)}")

        if item_fields_ok:
            checks["line_item_fields"] = {
                "score": 5,
                "max": 5,
                "pass": True,
                "message": "All line items have complete description, quantity, unit price, and line total." if items else "No line items to check."
            }
        else:
            checks["line_item_fields"] = {
                "score": 0,
                "max": 5,
                "pass": False,
                "message": f"Incomplete fields on line items: {'; '.join(missing_item_fields)}."
            }
            issues.extend(missing_item_fields)

        # ----------------------------------------------------
        # 9. Reasonable Dates Check (5 pts)
        # ----------------------------------------------------
        dates_ok = True
        dates_msg = []
        
        # Check future invoice date
        inv_date = invoice.invoice_date
        if inv_date:
            if isinstance(inv_date, datetime):
                inv_date = inv_date.date()
            if inv_date > date.today():
                dates_ok = False
                dates_msg.append("Invoice date is in the future")

        # Check due date >= invoice date
        if invoice.invoice_date and invoice.due_date:
            due_d = invoice.due_date
            if isinstance(due_d, datetime):
                due_d = due_d.date()
            if due_d < inv_date:
                dates_ok = False
                dates_msg.append(f"Due date ({due_d}) is earlier than invoice date ({inv_date})")

        if dates_ok:
            checks["reasonable_dates"] = {"score": 5, "max": 5, "pass": True, "message": "Dates are logically consistent."}
        else:
            checks["reasonable_dates"] = {"score": 0, "max": 5, "pass": False, "message": f"Date consistency issue: {'; '.join(dates_msg)}."}
            issues.extend(dates_msg)

        # ----------------------------------------------------
        # 10. Non-negative Values Check (5 pts)
        # ----------------------------------------------------
        negatives = []
        if total <= 0:
            negatives.append(f"total ({total}) must be positive")
        if subtotal < 0:
            negatives.append(f"subtotal ({subtotal}) cannot be negative")
        if tax < 0:
            negatives.append(f"tax ({tax}) cannot be negative")
        if discount < 0:
            negatives.append(f"discount ({discount}) cannot be negative")
        if shipping < 0:
            negatives.append(f"shipping ({shipping}) cannot be negative")

        for idx, item in enumerate(items):
            pr = get_float(item.unit_price, 0.0)
            lt = get_float(item.line_total, 0.0)
            if pr < 0:
                negatives.append(f"Line {idx+1} unit price ({pr}) cannot be negative")
            if lt < 0:
                negatives.append(f"Line {idx+1} line total ({lt}) cannot be negative")

        if not negatives:
            checks["non_negative_values"] = {"score": 5, "max": 5, "pass": True, "message": "All monetary values are positive or non-negative as required."}
        else:
            checks["non_negative_values"] = {
                "score": 0,
                "max": 5,
                "pass": False,
                "message": f"Negative value issues: {'; '.join(negatives)}."
            }
            issues.extend(negatives)

        # ----------------------------------------------------
        # Calculate Final Score and Status
        # ----------------------------------------------------
        total_score = sum(c["score"] for c in checks.values())
        
        # PASS if score >= 80 and no critical failures
        validation_status = "PASS" if (total_score >= 80 and not has_critical_issues) else "FAIL"

        # Prepare detailed report JSON
        validation_report = {
            "score": total_score,
            "status": validation_status,
            "has_critical_issues": has_critical_issues,
            "checks": checks,
            "details": {
                "totals": {
                    "subtotal": subtotal,
                    "discount": discount,
                    "tax": tax,
                    "shipping": shipping,
                    "total": total,
                    "expected_total": expected_total
                },
                "currency": currency,
                "precision": precision
            }
        }

        # Save results directly to the invoice record
        invoice.validation_score = float(total_score)
        invoice.validation_status = validation_status
        invoice.validation_issues = issues
        invoice.validation_report = validation_report

        # Create validation run audit log
        audit_log = AuditLog(
            invoice_id=invoice.id,
            action="VALIDATION_RUN",
            actor="Validation Engine",
            details=f"Deterministic validation completed. Score: {total_score}/100. Status: {validation_status}. Issues: {len(issues)}",
            severity="info" if validation_status == "PASS" else "warning"
        )
        db.add(audit_log)
        
        try:
            db.commit()
            db.refresh(invoice)
            logger.info(f"Invoice ID {invoice.id} validated and updated with score {total_score}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit validation results for ID {invoice.id}: {str(e)}")
            raise e

        return validation_report

validation_service = ValidationService()

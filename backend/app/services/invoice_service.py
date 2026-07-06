from sqlalchemy.orm import Session

from app.models import Invoice


class InvoiceService:
    """
    Handles all Invoice database operations.
    """

    # =====================================================
    # Create
    # =====================================================

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

        db.commit()
        db.refresh(invoice)

        return invoice

    # =====================================================
    # Delete
    # =====================================================

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
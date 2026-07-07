import logging
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import InvoiceResponse, MessageResponse
from app.services.invoice_service import invoice_service
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


# =====================================================
# Upload Invoice
# =====================================================

@router.post("/upload", response_model=InvoiceResponse)
async def upload_invoice(
    vendor_name: str = Form(...),
    invoice_number: str = Form(...),
    invoice_date: str = Form(...),
    currency: str = Form("USD"),
    total: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    logger.info(f"Handling invoice upload for vendor '{vendor_name}', invoice number '{invoice_number}'")
    return invoice_service.upload_and_create_invoice(
        db=db,
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        invoice_date_str=invoice_date,
        currency=currency,
        total=total,
        file=file,
    )


# =====================================================
# Upload History
# =====================================================

@router.get("/upload-history", response_model=list[InvoiceResponse])
def get_upload_history(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Returns the recent invoice upload history.
    """
    logger.info("Fetching recent invoice upload history...")
    try:
        return invoice_service.get_all_invoices(db, skip=skip, limit=limit)
    except Exception as e:
        logger.error(f"Failed to retrieve upload history: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve upload history."
        )


# =====================================================
# Get All Invoices
# =====================================================

@router.get("/", response_model=list[InvoiceResponse])
def get_all_invoices(
    db: Session = Depends(get_db),
):

    return invoice_service.get_all_invoices(db)


# =====================================================
# Get Invoice By ID
# =====================================================

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):

    invoice = invoice_service.get_invoice(
        db,
        invoice_id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    return invoice


# =====================================================
# Delete Invoice
# =====================================================

@router.delete("/{invoice_id}", response_model=MessageResponse)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    logger.info(f"Handling deletion for invoice ID {invoice_id}")
    invoice = invoice_service.get_invoice(
        db,
        invoice_id,
    )

    if invoice is None:
        logger.warning(f"Deletion failed: invoice ID {invoice_id} not found.")
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    invoice_service.delete_invoice_and_file(
        db,
        invoice,
    )

    return {
        "message": "Invoice deleted successfully."
    }
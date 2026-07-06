from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import InvoiceResponse, MessageResponse
from app.services.invoice_service import invoice_service
from app.services.storage_service import storage_service

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

    # Duplicate invoice check
    if invoice_service.invoice_exists(db, invoice_number):
        raise HTTPException(
            status_code=400,
            detail="Invoice already exists.",
        )

    # Upload file to S3
    s3_key = storage_service.upload_file(
        file=file.file,
        filename=file.filename,
    )

    # Save invoice metadata
    invoice = invoice_service.create_invoice(
        db=db,
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        invoice_date=datetime.strptime(invoice_date, "%Y-%m-%d").date(),
        currency=currency,
        total=total,
        filename=file.filename,
        file_size=file.size,
        s3_key=s3_key,
        status="UPLOADED",
    )

    return invoice


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

    invoice = invoice_service.get_invoice(
        db,
        invoice_id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    if invoice.s3_key:
        storage_service.delete_file(invoice.s3_key)

    invoice_service.delete_invoice(
        db,
        invoice,
    )

    return {
        "message": "Invoice deleted successfully."
    }
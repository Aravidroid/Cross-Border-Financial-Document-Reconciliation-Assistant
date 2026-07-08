import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import InvoiceResponse, MessageResponse, AuditLogResponse
from app.services.invoice_service import invoice_service
from app.services.storage_service import storage_service
from app.models import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)


class InvoiceUpdatePayload(BaseModel):
    vendor_name: str
    invoice_number: str
    total: float
    currency: str
    tax: Optional[float] = None
    payment_terms: Optional[str] = None

class ApprovePayload(BaseModel):
    notes: Optional[str] = None

class RejectPayload(BaseModel):
    reason: str

class InvoiceDetailResponse(InvoiceResponse):
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    extracted_json: Optional[dict] = None
    ai_risk_summary: Optional[str] = None
    validation_issues: Optional[list[str]] = None
    audit_logs: list[AuditLogResponse] = []

def run_pipeline_background(invoice_id: int):
    try:
        invoice_service.process_invoice_pipeline(invoice_id)
    except Exception as e:
        logger.error(f"Pipeline background thread failed for invoice {invoice_id}: {str(e)}")

# =====================================================
# Global Audit Logs
# =====================================================

@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_global_audit_logs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Returns the global audit trail.
    """
    logger.info("Fetching global audit logs...")
    try:
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Failed to retrieve global audit logs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve global audit logs."
        )


# =====================================================
# Upload Invoice
# =====================================================

@router.post("/upload", response_model=InvoiceResponse)
async def upload_invoice(
    background_tasks: BackgroundTasks,
    vendor_name: str = Form(...),
    invoice_number: str = Form(...),
    invoice_date: str = Form(...),
    currency: str = Form("USD"),
    total: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    logger.info(f"Handling invoice upload for vendor '{vendor_name}', invoice number '{invoice_number}'")
    invoice = invoice_service.upload_and_create_invoice(
        db=db,
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        invoice_date_str=invoice_date,
        currency=currency,
        total=total,
        file=file,
    )
    background_tasks.add_task(run_pipeline_background, invoice.id)
    return invoice


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

@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
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


# =====================================================
# Update Invoice Fields
# =====================================================

@router.put("/{invoice_id}", response_model=InvoiceDetailResponse)
def update_invoice(
    invoice_id: int,
    payload: InvoiceUpdatePayload,
    db: Session = Depends(get_db),
):
    logger.info(f"Updating metadata fields for invoice ID {invoice_id}")
    invoice = invoice_service.get_invoice(db, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    updates = payload.dict(exclude_unset=True)
    return invoice_service.update_invoice(db, invoice, **updates)


# =====================================================
# Approve Invoice
# =====================================================

@router.post("/{invoice_id}/approve", response_model=InvoiceDetailResponse)
def approve_invoice(
    invoice_id: int,
    payload: ApprovePayload,
    db: Session = Depends(get_db),
):
    logger.info(f"Approving invoice ID {invoice_id}")
    invoice = invoice_service.get_invoice(db, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    return invoice_service.approve_invoice(db, invoice, payload.notes)


# =====================================================
# Reject Invoice
# =====================================================

@router.post("/{invoice_id}/reject", response_model=InvoiceDetailResponse)
def reject_invoice(
    invoice_id: int,
    payload: RejectPayload,
    db: Session = Depends(get_db),
):
    logger.info(f"Rejecting invoice ID {invoice_id}")
    invoice = invoice_service.get_invoice(db, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    return invoice_service.reject_invoice(db, invoice, payload.reason)
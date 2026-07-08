from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Invoice Item
# ==========================================================

class InvoiceItemBase(BaseModel):
    description: str
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    line_total: Optional[Decimal] = None


class InvoiceItemResponse(InvoiceItemBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ==========================================================
# Invoice Upload
# ==========================================================

class InvoiceCreate(BaseModel):
    vendor_name: str
    invoice_number: str
    invoice_date: date
    currency: str = "USD"
    subtotal: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    total: Decimal


# ==========================================================
# Invoice Response
# ==========================================================

class InvoiceResponse(BaseModel):
    id: int

    vendor_name: str
    vendor_country: Optional[str] = None

    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None

    currency: str
    subtotal: Optional[Decimal]
    tax: Optional[Decimal]
    total: Decimal

    fx_rate: Optional[Decimal] = None
    converted_total: Optional[Decimal] = None
    base_currency: Optional[str] = None
    invoice_fx_rate: Optional[Decimal] = None
    current_fx_rate: Optional[Decimal] = None
    fx_rate_timestamp: Optional[datetime] = None
    fx_variance: Optional[float] = None
    fx_gain_loss: Optional[float] = None
    fx_risk_level: Optional[str] = None
    fx_recommendation: Optional[str] = None

    confidence_score: Optional[float] = None
    validation_score: Optional[float] = None
    validation_status: Optional[str] = None
    compliance_score: Optional[float] = None
    compliance_status: Optional[str] = None

    status: str

    risk_level: Optional[str] = None
    risk_score: Optional[float] = None

    filename: Optional[str] = None
    file_size: Optional[int] = None

    created_at: datetime

    items: List[InvoiceItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================================
# Dashboard
# ==========================================================

class DashboardStats(BaseModel):
    total_invoices: int
    pending_reviews: int
    approved: int
    rejected: int
    fx_exposure: float


# ==========================================================
# Analytics
# ==========================================================

class AnalyticsResponse(BaseModel):
    monthly_volume: List[Dict[str, Any]]
    currency_distribution: List[Dict[str, Any]]
    vendor_spending: List[Dict[str, Any]]
    risk_distribution: List[Dict[str, Any]]


# ==========================================================
# Audit Logs
# ==========================================================

class AuditLogResponse(BaseModel):
    id: int
    invoice_id: int
    action: str
    actor: Optional[str]
    details: Optional[str]
    severity: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================================
# Semantic Search
# ==========================================================

class SearchRequest(BaseModel):
    query: str


class SearchResult(BaseModel):
    invoice_id: int
    vendor_name: str
    invoice_number: str
    similarity: float


# ==========================================================
# Generic API Response
# ==========================================================

class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
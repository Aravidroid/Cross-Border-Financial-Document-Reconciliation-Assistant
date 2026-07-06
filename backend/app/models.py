from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    invoices: Mapped[List["Invoice"]] = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    # Basic
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    vendor_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    vendor_country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    invoice_date: Mapped[datetime] = mapped_column(Date, index=True, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    po_number: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Financial
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    subtotal: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    tax: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # FX
    fx_rate: Mapped[Optional[float]] = mapped_column(Numeric(18, 6), nullable=True)
    converted_total: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    # Processing
    status: Mapped[str] = mapped_column(String(50), index=True, nullable=False, default="PENDING")
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # AI
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    extracted_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ai_risk_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    validation_issues: Mapped[Optional[List[Any]]] = mapped_column(JSONB, nullable=True)

    # Storage
    filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    s3_key: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="invoices")
    items: Mapped[List["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="invoice", cascade="all, delete-orphan")
    embedding: Mapped[Optional["Embedding"]] = relationship("Embedding", back_populates="invoice", cascade="all, delete-orphan", uselist=False)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    unit_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    line_total: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="audit_logs")


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"), unique=True, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="embedding")

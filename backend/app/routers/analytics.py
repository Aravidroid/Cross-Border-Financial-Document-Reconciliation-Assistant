import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.finance_service import finance_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    logger.info("Fetching dashboard analytics summary...")
    return finance_service.get_summary(db)

@router.get("/currency-distribution")
def get_currency_distribution(db: Session = Depends(get_db)):
    logger.info("Fetching currency distribution stats...")
    return finance_service.get_currency_distribution(db)

@router.get("/monthly-trend")
def get_monthly_trend(months: int = 6, db: Session = Depends(get_db)):
    logger.info(f"Fetching monthly invoice trends for last {months} months...")
    return finance_service.get_monthly_trend(db, months)

@router.get("/vendor-spending")
def get_vendor_spending(db: Session = Depends(get_db)):
    logger.info("Fetching top vendor spending...")
    return finance_service.get_vendor_spending(db)

@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    logger.info("Fetching risk level distribution...")
    return finance_service.get_risk_distribution(db)

@router.get("/fx-exposure")
def get_fx_exposure(db: Session = Depends(get_db)):
    logger.info("Fetching currency FX open exposure...")
    return finance_service.get_fx_exposure(db)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings


# ==========================================================
# Database Engine
# ==========================================================

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
)


# ==========================================================
# Session Factory
# ==========================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ==========================================================
# Base Model
# ==========================================================

Base = declarative_base()


# ==========================================================
# Dependency
# ==========================================================

def get_db():
    """
    Creates a new database session for every request.

    Usage:
        db: Session = Depends(get_db)
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ==========================================================
# Create Tables
# ==========================================================

def create_tables():
    """
    Creates all database tables.

    Used during development.

    Later Alembic migrations will manage schema updates.
    """
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

    Base.metadata.create_all(bind=engine)
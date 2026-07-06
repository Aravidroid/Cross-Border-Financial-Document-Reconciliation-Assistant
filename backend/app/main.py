from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import invoices


# ==========================================================
# Application Lifespan
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once when the application starts.

    Creates database tables during development.
    Later, Alembic migrations will handle schema changes.
    """
    create_tables()

    print("ICFDRA Backend Started")
    print(f"Database Connected")
    print(f"Application: {settings.APP_NAME}")

    yield

    print("ICFDRA Backend Stopped")


# ==========================================================
# FastAPI App
# ==========================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React (Vite)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# Root Endpoint
# ==========================================================

@app.get("/")
def root():
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# ==========================================================
# Health Check
# ==========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
        "version": settings.APP_VERSION,
    }

app.include_router(invoices.router)
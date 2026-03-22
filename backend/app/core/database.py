from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,          # verify connections before use
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,         # log SQL in development
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Declarative base shared by all ORM models ─────────────────────────────────
Base = declarative_base()


# ── Dependency ────────────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and ensures it is
    closed after the request completes."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

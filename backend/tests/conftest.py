"""
pytest configuration and shared fixtures for Chronos-1 backend tests.

Uses an in-memory SQLite database via SQLAlchemy so tests run without
a live PostgreSQL instance.  All tests are fully isolated — the DB is
re-created from scratch for each test function via the `db` fixture.
"""

import os

# Force SQLite for tests before any app code is imported
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_chronos.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from main import app

# ── In-process SQLite engine ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite://"  # pure in-memory

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="function")
def db():
    """Create all tables, yield a session, then drop everything."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db):
    """TestClient with DB dependency overridden to use in-memory SQLite."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helper factories ──────────────────────────────────────────────────────────
def make_officer(client: TestClient) -> dict:
    """Register and return an officer user + tokens."""
    resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Officer",
            "email": "officer@test.com",
            "password": "Password1",
            "confirm_password": "Password1",
            "role": "officer",
        },
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


def make_planner(client: TestClient) -> dict:
    """Register and return a planner user + tokens."""
    resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Planner",
            "email": "planner@test.com",
            "password": "Password1",
            "confirm_password": "Password1",
            "role": "planner",
        },
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


def make_individual(client: TestClient) -> dict:
    """Register and return an individual user + tokens."""
    resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Individual",
            "email": "individual@test.com",
            "password": "Password1",
            "confirm_password": "Password1",
            "role": "individual",
        },
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

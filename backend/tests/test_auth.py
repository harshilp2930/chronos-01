"""Tests for /api/auth/* endpoints."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers, make_officer, make_planner


# ── Registration ──────────────────────────────────────────────────────────────
class TestRegister:
    def test_register_officer_success(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Alice Officer",
                "email": "alice@example.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "officer",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["email"] == "alice@example.com"
        assert data["user"]["role"] == "officer"
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_register_planner_success(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Bob Planner",
                "email": "bob@example.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "planner",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["user"]["role"] == "planner"

    def test_register_individual_success(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Carol Individual",
                "email": "carol@example.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "individual",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["user"]["role"] == "individual"

    def test_register_duplicate_email(self, client: TestClient):
        payload = {
            "full_name": "Dup User",
            "email": "dup@example.com",
            "password": "Password1",
            "confirm_password": "Password1",
            "role": "planner",
        }
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"]

    def test_register_weak_password(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Weak User",
                "email": "weak@example.com",
                "password": "password",       # no uppercase, no digit
                "confirm_password": "password",
                "role": "individual",
            },
        )
        assert resp.status_code == 422

    def test_register_passwords_mismatch(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Mismatch User",
                "email": "mismatch@example.com",
                "password": "Password1",
                "confirm_password": "Password2",
                "role": "individual",
            },
        )
        assert resp.status_code == 422

    def test_register_invalid_role(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Bad Role",
                "email": "badrole@example.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "admin",
            },
        )
        assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────
class TestLogin:
    def test_login_success(self, client: TestClient):
        make_officer(client)
        resp = client.post(
            "/api/auth/login",
            json={"email": "officer@test.com", "password": "Password1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "officer"
        assert "access_token" in data

    def test_login_wrong_password(self, client: TestClient):
        make_officer(client)
        resp = client.post(
            "/api/auth/login",
            json={"email": "officer@test.com", "password": "WrongPass1"},
        )
        assert resp.status_code == 401

    def test_login_unknown_email(self, client: TestClient):
        resp = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "Password1"},
        )
        assert resp.status_code == 401

    def test_login_deactivated_user(self, client: TestClient, db):
        from app.models.user import User

        make_planner(client)
        user = db.query(User).filter(User.email == "planner@test.com").first()
        user.is_active = False
        db.commit()

        resp = client.post(
            "/api/auth/login",
            json={"email": "planner@test.com", "password": "Password1"},
        )
        assert resp.status_code == 403


# ── /me ───────────────────────────────────────────────────────────────────────
class TestMe:
    def test_me_authenticated(self, client: TestClient):
        data = make_officer(client)
        resp = client.get(
            "/api/auth/me",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "officer@test.com"

    def test_me_unauthenticated(self, client: TestClient):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 403  # HTTPBearer returns 403 when no creds

    def test_me_invalid_token(self, client: TestClient):
        resp = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert resp.status_code == 401


# ── Change password ───────────────────────────────────────────────────────────
class TestChangePassword:
    def test_change_password_success(self, client: TestClient):
        data = make_planner(client)
        resp = client.post(
            "/api/auth/change-password",
            headers=auth_headers(data["access_token"]),
            json={
                "current_password": "Password1",
                "new_password": "NewPassword2",
                "confirm_new_password": "NewPassword2",
            },
        )
        assert resp.status_code == 200

        # Should be able to login with new password
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "planner@test.com", "password": "NewPassword2"},
        )
        assert login_resp.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient):
        data = make_planner(client)
        resp = client.post(
            "/api/auth/change-password",
            headers=auth_headers(data["access_token"]),
            json={
                "current_password": "WrongPassword1",
                "new_password": "NewPassword2",
                "confirm_new_password": "NewPassword2",
            },
        )
        assert resp.status_code == 400

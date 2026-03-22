"""Tests for /api/users/* endpoints (officer-only user management)."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers, make_officer, make_planner


class TestUserManagement:
    def test_officer_creates_planner(self, client: TestClient):
        officer = make_officer(client)
        resp = client.post(
            "/api/users/",
            headers=auth_headers(officer["access_token"]),
            json={
                "full_name": "New Planner",
                "email": "newplanner@test.com",
                "password": "Password1",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "planner"
        assert data["email"] == "newplanner@test.com"

    def test_planner_cannot_create_user(self, client: TestClient):
        planner = make_planner(client)
        resp = client.post(
            "/api/users/",
            headers=auth_headers(planner["access_token"]),
            json={
                "full_name": "Unauthorized",
                "email": "unauth@test.com",
                "password": "Password1",
            },
        )
        assert resp.status_code == 403

    def test_officer_lists_users(self, client: TestClient):
        officer = make_officer(client)
        make_planner(client)

        resp = client.get(
            "/api/users/",
            headers=auth_headers(officer["access_token"]),
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 2  # officer + planner

    def test_planner_cannot_list_users(self, client: TestClient):
        planner = make_planner(client)
        resp = client.get(
            "/api/users/",
            headers=auth_headers(planner["access_token"]),
        )
        assert resp.status_code == 403

    def test_officer_deactivates_user(self, client: TestClient):
        officer = make_officer(client)
        planner = make_planner(client)

        resp = client.patch(
            f"/api/users/{planner['user']['id']}/deactivate",
            headers=auth_headers(officer["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_deactivated_user_cannot_login(self, client: TestClient):
        officer = make_officer(client)
        planner = make_planner(client)

        client.patch(
            f"/api/users/{planner['user']['id']}/deactivate",
            headers=auth_headers(officer["access_token"]),
        )

        login_resp = client.post(
            "/api/auth/login",
            json={"email": "planner@test.com", "password": "Password1"},
        )
        assert login_resp.status_code == 403

    def test_officer_reactivates_user(self, client: TestClient):
        officer = make_officer(client)
        planner = make_planner(client)

        client.patch(
            f"/api/users/{planner['user']['id']}/deactivate",
            headers=auth_headers(officer["access_token"]),
        )
        resp = client.patch(
            f"/api/users/{planner['user']['id']}/reactivate",
            headers=auth_headers(officer["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is True

    def test_user_sees_own_profile(self, client: TestClient):
        planner = make_planner(client)
        resp = client.get(
            f"/api/users/{planner['user']['id']}",
            headers=auth_headers(planner["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "planner@test.com"

    def test_user_cannot_see_others_profile(self, client: TestClient):
        officer = make_officer(client)
        planner = make_planner(client)

        resp = client.get(
            f"/api/users/{officer['user']['id']}",
            headers=auth_headers(planner["access_token"]),
        )
        assert resp.status_code == 403

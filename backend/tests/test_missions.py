"""Tests for /api/missions/* endpoints."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers, make_officer, make_planner, make_individual


# ── Helpers ───────────────────────────────────────────────────────────────────
MISSION_PAYLOAD = {
    "title": "Test Mars Mission Alpha",
    "target_body": "mars",
    "launch_pad_id": "sdsc",
    "vehicle_class": "pslv",
    "orbit_type": "leo",
    "launch_date": "2026-06-15",
    "safety_buffer": "1.2",
    "azimuth_deg": "102.5",
    "corridor_width_km": "50.0",
    "downrange_km": "500.0",
}


def create_mission(client, token):
    resp = client.post(
        "/api/missions/",
        headers=auth_headers(token),
        json=MISSION_PAYLOAD,
    )
    assert resp.status_code == 201, resp.json()
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────
class TestCreateMission:
    def test_create_mission_as_planner(self, client: TestClient):
        data = make_planner(client)
        mission = create_mission(client, data["access_token"])
        assert mission["title"] == "Test Mars Mission Alpha"
        assert mission["status"] == "draft"
        assert mission["target_body"] == "mars"

    def test_create_mission_as_individual(self, client: TestClient):
        data = make_individual(client)
        mission = create_mission(client, data["access_token"])
        assert mission["status"] == "draft"

    def test_create_mission_as_officer(self, client: TestClient):
        data = make_officer(client)
        mission = create_mission(client, data["access_token"])
        assert mission["status"] == "draft"

    def test_create_mission_unauthenticated(self, client: TestClient):
        resp = client.post("/api/missions/", json=MISSION_PAYLOAD)
        assert resp.status_code == 403

    def test_create_mission_invalid_target(self, client: TestClient):
        data = make_planner(client)
        bad = {**MISSION_PAYLOAD, "target_body": "jupiter"}
        resp = client.post(
            "/api/missions/",
            headers=auth_headers(data["access_token"]),
            json=bad,
        )
        assert resp.status_code == 422


# ── List ──────────────────────────────────────────────────────────────────────
class TestListMissions:
    def test_planner_sees_only_own_missions(self, client: TestClient):
        p1 = make_planner(client)
        create_mission(client, p1["access_token"])

        # Register a second planner
        resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "Planner Two",
                "email": "planner2@test.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "planner",
            },
        )
        p2 = resp.json()
        create_mission(client, p2["access_token"])

        # Each planner should only see their own
        list1 = client.get(
            "/api/missions/", headers=auth_headers(p1["access_token"])
        ).json()
        list2 = client.get(
            "/api/missions/", headers=auth_headers(p2["access_token"])
        ).json()

        assert list1["total"] == 1
        assert list2["total"] == 1

    def test_officer_sees_all_missions(self, client: TestClient):
        planner = make_planner(client)
        create_mission(client, planner["access_token"])

        officer = make_officer(client)
        create_mission(client, officer["access_token"])

        all_missions = client.get(
            "/api/missions/", headers=auth_headers(officer["access_token"])
        ).json()

        assert all_missions["total"] == 2

    def test_filter_by_status(self, client: TestClient):
        data = make_planner(client)
        create_mission(client, data["access_token"])

        resp = client.get(
            "/api/missions/?status=draft",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

        resp = client.get(
            "/api/missions/?status=approved",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.json()["total"] == 0


# ── Get single ────────────────────────────────────────────────────────────────
class TestGetMission:
    def test_get_own_mission(self, client: TestClient):
        data = make_planner(client)
        mission = create_mission(client, data["access_token"])
        resp = client.get(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == mission["id"]

    def test_cannot_get_other_users_mission(self, client: TestClient):
        p1 = make_planner(client)
        mission = create_mission(client, p1["access_token"])

        p2_resp = client.post(
            "/api/auth/register",
            json={
                "full_name": "P2",
                "email": "p2@test.com",
                "password": "Password1",
                "confirm_password": "Password1",
                "role": "planner",
            },
        )
        p2 = p2_resp.json()

        resp = client.get(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(p2["access_token"]),
        )
        assert resp.status_code == 403

    def test_officer_can_get_any_mission(self, client: TestClient):
        planner = make_planner(client)
        mission = create_mission(client, planner["access_token"])

        officer = make_officer(client)
        resp = client.get(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(officer["access_token"]),
        )
        assert resp.status_code == 200

    def test_get_nonexistent_mission(self, client: TestClient):
        data = make_planner(client)
        import uuid
        resp = client.get(
            f"/api/missions/{uuid.uuid4()}",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 404


# ── Update ────────────────────────────────────────────────────────────────────
class TestUpdateMission:
    def test_update_draft_mission(self, client: TestClient):
        data = make_planner(client)
        mission = create_mission(client, data["access_token"])

        resp = client.put(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(data["access_token"]),
            json={"title": "Updated Mars Mission"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Mars Mission"

    def test_cannot_update_non_draft(self, client: TestClient):
        planner = make_planner(client)
        mission = create_mission(client, planner["access_token"])

        # Submit it
        client.post(
            f"/api/missions/{mission['id']}/submit",
            headers=auth_headers(planner["access_token"]),
        )

        # Try to update — should fail
        resp = client.put(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(planner["access_token"]),
            json={"title": "Should Fail"},
        )
        assert resp.status_code == 400


# ── Delete ────────────────────────────────────────────────────────────────────
class TestDeleteMission:
    def test_delete_draft_mission(self, client: TestClient):
        data = make_planner(client)
        mission = create_mission(client, data["access_token"])

        resp = client.delete(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 204

        # Verify it's gone
        resp = client.get(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(data["access_token"]),
        )
        assert resp.status_code == 404

    def test_cannot_delete_pending_mission(self, client: TestClient):
        planner = make_planner(client)
        mission = create_mission(client, planner["access_token"])

        client.post(
            f"/api/missions/{mission['id']}/submit",
            headers=auth_headers(planner["access_token"]),
        )

        resp = client.delete(
            f"/api/missions/{mission['id']}",
            headers=auth_headers(planner["access_token"]),
        )
        assert resp.status_code == 400


# ── Approval flow ─────────────────────────────────────────────────────────────
class TestApprovalFlow:
    def _get_pending_mission(self, client):
        """Create a planner, create a mission, submit it. Returns (planner_data, mission_data)."""
        planner = make_planner(client)
        mission = create_mission(client, planner["access_token"])
        submit_resp = client.post(
            f"/api/missions/{mission['id']}/submit",
            headers=auth_headers(planner["access_token"]),
        )
        assert submit_resp.status_code == 200
        return planner, submit_resp.json()

    def test_submit_sets_pending_status(self, client: TestClient):
        _, mission = self._get_pending_mission(client)
        assert mission["status"] == "pending_approval"
        assert mission["submitted_at"] is not None

    def test_individual_cannot_submit(self, client: TestClient):
        ind = make_individual(client)
        mission = create_mission(client, ind["access_token"])
        resp = client.post(
            f"/api/missions/{mission['id']}/submit",
            headers=auth_headers(ind["access_token"]),
        )
        assert resp.status_code == 403

    def test_officer_approves_mission(self, client: TestClient):
        _, mission = self._get_pending_mission(client)
        officer = make_officer(client)

        resp = client.post(
            f"/api/missions/{mission['id']}/approve",
            headers=auth_headers(officer["access_token"]),
            json={"notes": "All zones clear. Approved."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"
        assert data["officer_notes"] == "All zones clear. Approved."
        assert data["reviewed_at"] is not None

    def test_officer_rejects_mission(self, client: TestClient):
        _, mission = self._get_pending_mission(client)
        officer = make_officer(client)

        resp = client.post(
            f"/api/missions/{mission['id']}/reject",
            headers=auth_headers(officer["access_token"]),
            json={"notes": "Trajectory passes over civilian zone. Revise azimuth."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"
        assert "civilian zone" in data["officer_notes"]

    def test_planner_cannot_approve(self, client: TestClient):
        planner, mission = self._get_pending_mission(client)

        resp = client.post(
            f"/api/missions/{mission['id']}/approve",
            headers=auth_headers(planner["access_token"]),
            json={"notes": "..."},
        )
        assert resp.status_code == 403

    def test_cannot_approve_non_pending_mission(self, client: TestClient):
        planner = make_planner(client)
        mission = create_mission(client, planner["access_token"])  # draft
        officer = make_officer(client)

        resp = client.post(
            f"/api/missions/{mission['id']}/approve",
            headers=auth_headers(officer["access_token"]),
            json={"notes": "Trying to approve draft"},
        )
        assert resp.status_code == 400

    def test_reject_requires_notes(self, client: TestClient):
        _, mission = self._get_pending_mission(client)
        officer = make_officer(client)

        # No notes field — should fail Pydantic validation
        resp = client.post(
            f"/api/missions/{mission['id']}/reject",
            headers=auth_headers(officer["access_token"]),
            json={},
        )
        assert resp.status_code == 422

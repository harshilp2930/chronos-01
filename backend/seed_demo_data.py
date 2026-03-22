#!/usr/bin/env python3
"""
Seed Chronos-1 demo users and realistic mission data.

Creates/updates:
- Officer fast login: admin@chronos.dev / admin123
- Planner fast login: planner@chronos.dev / planner123
- Additional users for richer analytics

Seeds 12 realistic missions across moon/mars/venus with mixed statuses.
Safe to run multiple times: missions are upserted by title.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import mission as _mission_model  # noqa: F401
from app.models.mission import Mission
from app.models.user import User


def upsert_user(db, *, email: str, full_name: str, role: str, password: str, created_by=None) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.full_name = full_name
        user.role = role
        user.password_hash = hash_password(password)
        user.is_active = True
        if created_by is not None:
            user.created_by = created_by
        db.commit()
        db.refresh(user)
        return user

    user = User(
        full_name=full_name,
        email=email,
        role=role,
        password_hash=hash_password(password),
        is_active=True,
        created_by=created_by,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def mission_payloads(planner_id, planner2_id, individual_id, officer_id):
    today = date.today()
    now = datetime.now(timezone.utc)

    return [
        {
            "title": "Chandrayaan Polar Relay Node",
            "created_by": planner_id,
            "status": "approved",
            "target_body": "moon",
            "launch_pad_id": "sdsc",
            "vehicle_class": "lvm3",
            "orbit_type": "geo",
            "launch_date": today + timedelta(days=18),
            "safety_buffer": Decimal("1.4"),
            "azimuth_deg": Decimal("106.0"),
            "corridor_width_km": Decimal("55.0"),
            "downrange_km": Decimal("820.0"),
            "delta_v_km_s": Decimal("10.8420"),
            "scrub_risk_score": Decimal("0.26"),
            "submitted_at": now - timedelta(days=14),
            "reviewed_at": now - timedelta(days=13),
            "reviewed_by": officer_id,
            "officer_notes": "Approved with standard coastal exclusion enforcement.",
        },
        {
            "title": "Lunar South Pole ISRU Pathfinder",
            "created_by": planner_id,
            "status": "pending_approval",
            "target_body": "moon",
            "launch_pad_id": "sdsc",
            "vehicle_class": "gslv2",
            "orbit_type": "leo",
            "launch_date": today + timedelta(days=33),
            "safety_buffer": Decimal("1.3"),
            "azimuth_deg": Decimal("98.0"),
            "corridor_width_km": Decimal("48.0"),
            "downrange_km": Decimal("760.0"),
            "delta_v_km_s": Decimal("10.5110"),
            "scrub_risk_score": Decimal("0.41"),
            "submitted_at": now - timedelta(days=2),
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Mars Atmosphere Mapper-1",
            "created_by": planner_id,
            "status": "approved",
            "target_body": "mars",
            "launch_pad_id": "sdsc",
            "vehicle_class": "lvm3",
            "orbit_type": "geo",
            "launch_date": today + timedelta(days=62),
            "safety_buffer": Decimal("1.5"),
            "azimuth_deg": Decimal("112.0"),
            "corridor_width_km": Decimal("70.0"),
            "downrange_km": Decimal("980.0"),
            "delta_v_km_s": Decimal("12.3440"),
            "scrub_risk_score": Decimal("0.33"),
            "submitted_at": now - timedelta(days=26),
            "reviewed_at": now - timedelta(days=24),
            "reviewed_by": officer_id,
            "officer_notes": "Approved for transfer window W3.",
        },
        {
            "title": "Mars Relay Network Node-A",
            "created_by": planner_id,
            "status": "rejected",
            "target_body": "mars",
            "launch_pad_id": "sdsc",
            "vehicle_class": "pslv",
            "orbit_type": "sso",
            "launch_date": today + timedelta(days=49),
            "safety_buffer": Decimal("1.2"),
            "azimuth_deg": Decimal("95.0"),
            "corridor_width_km": Decimal("44.0"),
            "downrange_km": Decimal("640.0"),
            "delta_v_km_s": Decimal("11.9020"),
            "scrub_risk_score": Decimal("0.64"),
            "submitted_at": now - timedelta(days=17),
            "reviewed_at": now - timedelta(days=16),
            "reviewed_by": officer_id,
            "officer_notes": "Rejected: corridor width too narrow for risk profile.",
        },
        {
            "title": "Venus Climate Sounder",
            "created_by": planner_id,
            "status": "approved",
            "target_body": "venus",
            "launch_pad_id": "sdsc",
            "vehicle_class": "gslv2",
            "orbit_type": "geo",
            "launch_date": today + timedelta(days=78),
            "safety_buffer": Decimal("1.4"),
            "azimuth_deg": Decimal("109.5"),
            "corridor_width_km": Decimal("60.0"),
            "downrange_km": Decimal("870.0"),
            "delta_v_km_s": Decimal("11.2450"),
            "scrub_risk_score": Decimal("0.29"),
            "submitted_at": now - timedelta(days=31),
            "reviewed_at": now - timedelta(days=30),
            "reviewed_by": officer_id,
            "officer_notes": "Approved with weather hold threshold at 45% scrub risk.",
        },
        {
            "title": "Venus Aerobrake Heatshield Demo",
            "created_by": planner2_id,
            "status": "pending_approval",
            "target_body": "venus",
            "launch_pad_id": "aki",
            "vehicle_class": "sslv",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=40),
            "safety_buffer": Decimal("1.1"),
            "azimuth_deg": Decimal("88.0"),
            "corridor_width_km": Decimal("36.0"),
            "downrange_km": Decimal("430.0"),
            "delta_v_km_s": Decimal("9.8840"),
            "scrub_risk_score": Decimal("0.52"),
            "submitted_at": now - timedelta(days=1),
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Moon Resource Imaging Cluster",
            "created_by": planner2_id,
            "status": "draft",
            "target_body": "moon",
            "launch_pad_id": "vssc",
            "vehicle_class": "sounding",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=21),
            "safety_buffer": Decimal("1.0"),
            "azimuth_deg": Decimal("82.0"),
            "corridor_width_km": Decimal("22.0"),
            "downrange_km": Decimal("210.0"),
            "delta_v_km_s": Decimal("6.3110"),
            "scrub_risk_score": Decimal("0.18"),
            "submitted_at": None,
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Mars Sample Return Tech Precursor",
            "created_by": planner2_id,
            "status": "approved",
            "target_body": "mars",
            "launch_pad_id": "sdsc",
            "vehicle_class": "lvm3",
            "orbit_type": "geo",
            "launch_date": today + timedelta(days=96),
            "safety_buffer": Decimal("1.6"),
            "azimuth_deg": Decimal("114.0"),
            "corridor_width_km": Decimal("72.0"),
            "downrange_km": Decimal("1040.0"),
            "delta_v_km_s": Decimal("12.7720"),
            "scrub_risk_score": Decimal("0.35"),
            "submitted_at": now - timedelta(days=38),
            "reviewed_at": now - timedelta(days=36),
            "reviewed_by": officer_id,
            "officer_notes": "Approved. Maintain redundant abort corridor monitoring.",
        },
        {
            "title": "Venus Upper-Atmosphere Chemistry Probe",
            "created_by": individual_id,
            "status": "draft",
            "target_body": "venus",
            "launch_pad_id": "sdsc",
            "vehicle_class": "pslv",
            "orbit_type": "leo",
            "launch_date": today + timedelta(days=54),
            "safety_buffer": Decimal("1.2"),
            "azimuth_deg": Decimal("101.0"),
            "corridor_width_km": Decimal("42.0"),
            "downrange_km": Decimal("580.0"),
            "delta_v_km_s": Decimal("10.9540"),
            "scrub_risk_score": Decimal("0.44"),
            "submitted_at": None,
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Moon Far-Side Relay Demonstrator",
            "created_by": individual_id,
            "status": "draft",
            "target_body": "moon",
            "launch_pad_id": "aki",
            "vehicle_class": "sslv",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=28),
            "safety_buffer": Decimal("1.1"),
            "azimuth_deg": Decimal("91.0"),
            "corridor_width_km": Decimal("34.0"),
            "downrange_km": Decimal("390.0"),
            "delta_v_km_s": Decimal("8.9440"),
            "scrub_risk_score": Decimal("0.37"),
            "submitted_at": None,
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Mars Dust Climate Observer",
            "created_by": planner_id,
            "status": "pending_approval",
            "target_body": "mars",
            "launch_pad_id": "sdsc",
            "vehicle_class": "gslv2",
            "orbit_type": "sso",
            "launch_date": today + timedelta(days=85),
            "safety_buffer": Decimal("1.4"),
            "azimuth_deg": Decimal("108.0"),
            "corridor_width_km": Decimal("63.0"),
            "downrange_km": Decimal("910.0"),
            "delta_v_km_s": Decimal("12.1150"),
            "scrub_risk_score": Decimal("0.49"),
            "submitted_at": now - timedelta(hours=18),
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Venus Polar Cloud Imaging Orbiter",
            "created_by": planner2_id,
            "status": "rejected",
            "target_body": "venus",
            "launch_pad_id": "vssc",
            "vehicle_class": "sounding",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=17),
            "safety_buffer": Decimal("1.0"),
            "azimuth_deg": Decimal("79.0"),
            "corridor_width_km": Decimal("24.0"),
            "downrange_km": Decimal("180.0"),
            "delta_v_km_s": Decimal("6.2050"),
            "scrub_risk_score": Decimal("0.71"),
            "submitted_at": now - timedelta(days=8),
            "reviewed_at": now - timedelta(days=7),
            "reviewed_by": officer_id,
            "officer_notes": "Rejected: risk score exceeds accepted mission threshold.",
        },
        {
            "title": "Moon Gateway Logistics Flight-1",
            "created_by": planner_id,
            "status": "approved",
            "target_body": "moon",
            "launch_pad_id": "sdsc",
            "vehicle_class": "pslv",
            "orbit_type": "leo",
            "launch_date": today + timedelta(days=44),
            "safety_buffer": Decimal("1.3"),
            "azimuth_deg": Decimal("102.0"),
            "corridor_width_km": Decimal("50.0"),
            "downrange_km": Decimal("700.0"),
            "delta_v_km_s": Decimal("10.1200"),
            "scrub_risk_score": Decimal("0.31"),
            "submitted_at": now - timedelta(days=11),
            "reviewed_at": now - timedelta(days=10),
            "reviewed_by": officer_id,
            "officer_notes": "Approved for logistic window L1.",
        },
        {
            "title": "Mars Telecommunications Relay-B",
            "created_by": planner2_id,
            "status": "pending_approval",
            "target_body": "mars",
            "launch_pad_id": "vssc",
            "vehicle_class": "gslv2",
            "orbit_type": "geo",
            "launch_date": today + timedelta(days=104),
            "safety_buffer": Decimal("1.5"),
            "azimuth_deg": Decimal("111.0"),
            "corridor_width_km": Decimal("68.0"),
            "downrange_km": Decimal("990.0"),
            "delta_v_km_s": Decimal("12.4800"),
            "scrub_risk_score": Decimal("0.46"),
            "submitted_at": now - timedelta(days=3),
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Venus Night-Side Imaging Scout",
            "created_by": individual_id,
            "status": "draft",
            "target_body": "venus",
            "launch_pad_id": "aki",
            "vehicle_class": "sslv",
            "orbit_type": "sso",
            "launch_date": today + timedelta(days=57),
            "safety_buffer": Decimal("1.2"),
            "azimuth_deg": Decimal("93.0"),
            "corridor_width_km": Decimal("39.0"),
            "downrange_km": Decimal("470.0"),
            "delta_v_km_s": Decimal("10.3000"),
            "scrub_risk_score": Decimal("0.43"),
            "submitted_at": None,
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Lunar CubeSat Swarm Deployment",
            "created_by": planner2_id,
            "status": "pending_approval",
            "target_body": "moon",
            "launch_pad_id": "vssc",
            "vehicle_class": "sounding",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=24),
            "safety_buffer": Decimal("1.1"),
            "azimuth_deg": Decimal("84.0"),
            "corridor_width_km": Decimal("26.0"),
            "downrange_km": Decimal("250.0"),
            "delta_v_km_s": Decimal("7.0100"),
            "scrub_risk_score": Decimal("0.55"),
            "submitted_at": now - timedelta(hours=30),
            "reviewed_at": None,
            "reviewed_by": None,
            "officer_notes": None,
        },
        {
            "title": "Mars Entry Descent Test Vehicle",
            "created_by": planner_id,
            "status": "rejected",
            "target_body": "mars",
            "launch_pad_id": "sdsc",
            "vehicle_class": "lvm3",
            "orbit_type": "sub",
            "launch_date": today + timedelta(days=73),
            "safety_buffer": Decimal("1.6"),
            "azimuth_deg": Decimal("116.0"),
            "corridor_width_km": Decimal("75.0"),
            "downrange_km": Decimal("1080.0"),
            "delta_v_km_s": Decimal("12.9000"),
            "scrub_risk_score": Decimal("0.69"),
            "submitted_at": now - timedelta(days=12),
            "reviewed_at": now - timedelta(days=11),
            "reviewed_by": officer_id,
            "officer_notes": "Rejected pending redesign of abort envelope.",
        },
        {
            "title": "Venus Orbital Radar Mapper",
            "created_by": planner_id,
            "status": "approved",
            "target_body": "venus",
            "launch_pad_id": "sdsc",
            "vehicle_class": "gslv2",
            "orbit_type": "sso",
            "launch_date": today + timedelta(days=88),
            "safety_buffer": Decimal("1.4"),
            "azimuth_deg": Decimal("107.0"),
            "corridor_width_km": Decimal("61.0"),
            "downrange_km": Decimal("900.0"),
            "delta_v_km_s": Decimal("11.6700"),
            "scrub_risk_score": Decimal("0.34"),
            "submitted_at": now - timedelta(days=20),
            "reviewed_at": now - timedelta(days=19),
            "reviewed_by": officer_id,
            "officer_notes": "Approved for radar calibration campaign.",
        },
    ]


def upsert_mission(db, payload: dict):
    mission = db.query(Mission).filter(Mission.title == payload["title"]).first()
    if mission is None:
        mission = Mission(**payload)
        db.add(mission)
    else:
        for key, value in payload.items():
            setattr(mission, key, value)
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        officer = upsert_user(
            db,
            email="admin@chronos.dev",
            full_name="System Admin",
            role="officer",
            password="admin123",
        )
        planner = upsert_user(
            db,
            email="planner@chronos.dev",
            full_name="Mission Planner One",
            role="planner",
            password="planner123",
            created_by=officer.id,
        )
        planner2 = upsert_user(
            db,
            email="planner2@chronos.dev",
            full_name="Mission Planner Two",
            role="planner",
            password="planner234",
            created_by=officer.id,
        )
        individual = upsert_user(
            db,
            email="individual@chronos.dev",
            full_name="Independent Operator",
            role="individual",
            password="individual123",
        )

        records = mission_payloads(planner.id, planner2.id, individual.id, officer.id)
        for rec in records:
            upsert_mission(db, rec)

        total_missions = db.query(Mission).count()
        print("[ok] Demo users ready:")
        print("     officer  : admin@chronos.dev / admin123")
        print("     planner  : planner@chronos.dev / planner123")
        print("     planner2 : planner2@chronos.dev / planner234")
        print("     individual: individual@chronos.dev / individual123")
        print(f"[ok] Seeded/updated {len(records)} demo missions")
        print(f"[ok] Database mission total: {total_missions}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

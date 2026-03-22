from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
import uuid

from pydantic import BaseModel, field_validator


# ── Enumerations ──────────────────────────────────────────────────────────────
VALID_TARGETS = {"moon", "mars", "venus"}
VALID_PADS = {"sdsc", "vssc", "aki"}
VALID_VEHICLES = {"sounding", "sslv", "pslv", "gslv2", "lvm3"}
VALID_ORBITS = {"leo", "sso", "geo", "sub"}
VALID_STATUSES = {"draft", "pending_approval", "approved", "rejected"}


# ── Create / update ───────────────────────────────────────────────────────────
class MissionCreate(BaseModel):
    title: str
    target_body: str
    launch_pad_id: str
    vehicle_class: str
    orbit_type: Optional[str] = None
    launch_date: Optional[date] = None
    safety_buffer: Optional[Decimal] = Decimal("1.2")
    azimuth_deg: Optional[Decimal] = None
    corridor_width_km: Optional[Decimal] = None
    downrange_km: Optional[Decimal] = None

    @field_validator("target_body")
    @classmethod
    def validate_target(cls, v: str) -> str:
        if v not in VALID_TARGETS:
            raise ValueError(f"target_body must be one of {sorted(VALID_TARGETS)}")
        return v

    @field_validator("launch_pad_id")
    @classmethod
    def validate_pad(cls, v: str) -> str:
        if v not in VALID_PADS:
            raise ValueError(f"launch_pad_id must be one of {sorted(VALID_PADS)}")
        return v

    @field_validator("vehicle_class")
    @classmethod
    def validate_vehicle(cls, v: str) -> str:
        if v not in VALID_VEHICLES:
            raise ValueError(f"vehicle_class must be one of {sorted(VALID_VEHICLES)}")
        return v

    @field_validator("orbit_type")
    @classmethod
    def validate_orbit(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_ORBITS:
            raise ValueError(f"orbit_type must be one of {sorted(VALID_ORBITS)}")
        return v

    @field_validator("safety_buffer")
    @classmethod
    def validate_buffer(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and not (Decimal("1.0") <= v <= Decimal("2.0")):
            raise ValueError("safety_buffer must be between 1.0 and 2.0")
        return v


class MissionUpdate(BaseModel):
    """Partial update — all fields optional. Only allowed on draft missions."""
    title: Optional[str] = None
    target_body: Optional[str] = None
    launch_pad_id: Optional[str] = None
    vehicle_class: Optional[str] = None
    orbit_type: Optional[str] = None
    launch_date: Optional[date] = None
    safety_buffer: Optional[Decimal] = None
    azimuth_deg: Optional[Decimal] = None
    corridor_width_km: Optional[Decimal] = None
    downrange_km: Optional[Decimal] = None
    delta_v_km_s: Optional[Decimal] = None
    scrub_risk_score: Optional[Decimal] = None
    trajectory_data: Optional[Any] = None
    safety_zone_data: Optional[Any] = None
    optimization_data: Optional[Any] = None

    @field_validator("target_body")
    @classmethod
    def validate_target(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_TARGETS:
            raise ValueError(f"target_body must be one of {sorted(VALID_TARGETS)}")
        return v

    @field_validator("launch_pad_id")
    @classmethod
    def validate_pad(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PADS:
            raise ValueError(f"launch_pad_id must be one of {sorted(VALID_PADS)}")
        return v

    @field_validator("vehicle_class")
    @classmethod
    def validate_vehicle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_VEHICLES:
            raise ValueError(f"vehicle_class must be one of {sorted(VALID_VEHICLES)}")
        return v


# ── Approval / rejection actions ──────────────────────────────────────────────
class MissionApproveRequest(BaseModel):
    notes: Optional[str] = None


class MissionRejectRequest(BaseModel):
    notes: str   # required for rejection


# ── Response ──────────────────────────────────────────────────────────────────
class MissionOut(BaseModel):
    id: uuid.UUID
    title: str
    created_by: uuid.UUID
    status: str
    target_body: str
    launch_pad_id: str
    vehicle_class: str
    orbit_type: Optional[str] = None
    launch_date: Optional[date] = None
    safety_buffer: Optional[Decimal] = None
    azimuth_deg: Optional[Decimal] = None
    corridor_width_km: Optional[Decimal] = None
    downrange_km: Optional[Decimal] = None
    delta_v_km_s: Optional[Decimal] = None
    scrub_risk_score: Optional[Decimal] = None
    trajectory_data: Optional[Any] = None
    safety_zone_data: Optional[Any] = None
    optimization_data: Optional[Any] = None
    officer_notes: Optional[str] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MissionListResponse(BaseModel):
    total: int
    missions: list[MissionOut]

"""Pydantic schemas for safety zone endpoints."""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class SafetyZoneRequest(BaseModel):
    pad_id: str = Field(..., description="Launch pad: sdsc | vssc | aki")
    vehicle_class: str = Field("medium", description="light | medium | heavy | superheavy")
    wind_speed_kmh: float = Field(0.0, ge=0.0, le=250.0, description="Surface wind speed (km/h)")
    wind_direction_deg: float = Field(0.0, ge=0.0, lt=360.0, description="Wind FROM direction (°)")
    launch_azimuth_deg: Optional[float] = Field(
        None, ge=0.0, lt=360.0, description="Launch azimuth — if provided, corridor is computed"
    )

    @field_validator("pad_id")
    @classmethod
    def pad_must_be_valid(cls, v: str) -> str:
        if v.lower() not in {"sdsc", "vssc", "aki"}:
            raise ValueError("pad_id must be one of: sdsc, vssc, aki")
        return v.lower()

    @field_validator("vehicle_class")
    @classmethod
    def vehicle_class_valid(cls, v: str) -> str:
        if v.lower() not in {"light", "medium", "heavy", "superheavy"}:
            raise ValueError("vehicle_class must be one of: light, medium, heavy, superheavy")
        return v.lower()


class PointCheckRequest(BaseModel):
    pad_id: str = Field(..., description="Launch pad: sdsc | vssc | aki")
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    vehicle_class: str = Field("medium")
    wind_speed_kmh: float = Field(0.0, ge=0.0, le=250.0)
    wind_direction_deg: float = Field(0.0, ge=0.0, lt=360.0)

    @field_validator("pad_id")
    @classmethod
    def pad_must_be_valid(cls, v: str) -> str:
        if v.lower() not in {"sdsc", "vssc", "aki"}:
            raise ValueError("pad_id must be one of: sdsc, vssc, aki")
        return v.lower()

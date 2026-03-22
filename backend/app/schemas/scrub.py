"""Pydantic schemas for scrub risk prediction endpoint."""

from typing import Literal

from pydantic import BaseModel, Field


class ScrubPredictRequest(BaseModel):
    wind_speed_kmh: float = Field(..., ge=0.0, le=250.0)
    wind_gust_kmh: float = Field(..., ge=0.0, le=350.0)
    visibility_km: float = Field(..., ge=0.0, le=100.0)
    cloud_ceiling_ft: float = Field(..., ge=0.0, le=60000.0)
    temperature_c: float = Field(..., ge=-30.0, le=60.0)
    precipitation_mm_h: float = Field(..., ge=0.0, le=300.0)
    lightning_distance_km: float = Field(..., ge=0.0, le=1000.0)
    humidity_pct: float = Field(70.0, ge=0.0, le=100.0)
    site_id: Literal["sdsc", "vssc", "aki"] = "sdsc"


class ScrubPredictResponse(BaseModel):
    site: str
    scrub_probability: float = Field(ge=0.0, le=100.0)
    risk_level: str
    go_no_go: str
    lwcc_violations: list[str]
    top_risk_factor: str
    timestamp: str

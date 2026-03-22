"""
Pydantic schemas for simulation (physics engine) requests and responses.
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class TrajectoryRequest(BaseModel):
    origin: str = Field("earth", description="Departure body (earth)")
    target: str = Field(..., description="Target body: moon | mars | venus")
    launch_date: date
    arrival_date: date
    n_points: int = Field(200, ge=10, le=1000, description="Number of trajectory waypoints")
    use_j2: bool = Field(False, description="Apply J2 oblateness perturbation")

    @field_validator("target")
    @classmethod
    def target_must_be_valid(cls, v: str) -> str:
        if v.lower() not in {"moon", "mars", "venus"}:
            raise ValueError("target must be one of: moon, mars, venus")
        return v.lower()

    @field_validator("arrival_date")
    @classmethod
    def arrival_after_launch(cls, v: date, info) -> date:
        launch = info.data.get("launch_date")
        if launch and v <= launch:
            raise ValueError("arrival_date must be after launch_date")
        return v


class TrajectoryPoint(BaseModel):
    x: float = Field(..., description="x position (km)")
    y: float = Field(..., description="y position (km)")
    z: float = Field(..., description="z position (km)")
    t: float = Field(..., description="Elapsed seconds from launch")
    vx: float = Field(..., description="x velocity (km/s)")
    vy: float = Field(..., description="y velocity (km/s)")
    vz: float = Field(..., description="z velocity (km/s)")
    r_km: float = Field(..., description="Distance from central body (km)")


class TrajectoryResponse(BaseModel):
    target: str
    launch_date: str
    arrival_date: str
    delta_v_departure_km_s: float
    delta_v_arrival_km_s: float
    total_delta_v_km_s: float
    transfer_time_days: float
    departure_velocity: List[float]
    arrival_velocity: List[float]
    trajectory_points: List[TrajectoryPoint]
    n_points: int


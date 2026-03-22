"""Pydantic schemas for launch window optimization endpoints."""

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class LaunchWindowRequest(BaseModel):
    target: str = Field(..., description="Target body: moon | mars | venus")
    earliest_date: date = Field(..., description="Start of search window")
    latest_date: date = Field(..., description="End of search window")
    population_size: int = Field(60, ge=10, le=300, description="GA population size")
    generations: int = Field(80, ge=10, le=500, description="GA generations")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")

    @field_validator("target")
    @classmethod
    def target_valid(cls, v: str) -> str:
        if v.lower() not in {"moon", "mars", "venus"}:
            raise ValueError("target must be one of: moon, mars, venus")
        return v.lower()

    @field_validator("latest_date")
    @classmethod
    def latest_after_earliest(cls, v: date, info) -> date:
        earliest = info.data.get("earliest_date")
        if earliest and v <= earliest:
            raise ValueError("latest_date must be after earliest_date")
        return v

"""
Safety zone calculator endpoints — Phase 2.
"""

from fastapi import APIRouter, HTTPException

from app.physics.safety_zones import (
    PADS,
    calculate_safety_zones,
    classify_point,
)
from app.schemas.safety import PointCheckRequest, SafetyZoneRequest

router = APIRouter(prefix="/safety", tags=["Safety Zones"])


@router.get("/pads", summary="List all Indian launch pads")
def list_pads():
    """Return static metadata for SDSC, VSSC, and AKI launch pads."""
    return list(PADS.values())


@router.post(
    "/calculate",
    summary="Calculate dynamic safety zones for a launch pad",
    description=(
        "Computes four asymmetric safety-zone polygons (restricted, warning, "
        "caution, advisory) scaled by vehicle class and wind conditions. "
        "If launch_azimuth_deg is provided the trajectory corridor is included."
    ),
)
def calculate_zones(payload: SafetyZoneRequest):
    try:
        return calculate_safety_zones(
            pad_id=payload.pad_id,
            vehicle_class=payload.vehicle_class,
            wind_speed_kmh=payload.wind_speed_kmh,
            wind_direction_deg=payload.wind_direction_deg,
            launch_azimuth_deg=payload.launch_azimuth_deg,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post(
    "/check-point",
    summary="Classify a lat/lon coordinate against safety zones",
    description=(
        "Returns the zone classification (restricted / warning / caution / "
        "advisory / clear) for any geographic point relative to a launch pad."
    ),
)
def check_point(payload: PointCheckRequest):
    try:
        return classify_point(
            pad_id=payload.pad_id,
            point_lat=payload.lat,
            point_lon=payload.lon,
            vehicle_class=payload.vehicle_class,
            wind_speed_kmh=payload.wind_speed_kmh,
            wind_direction_deg=payload.wind_direction_deg,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

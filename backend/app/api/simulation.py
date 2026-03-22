"""
Simulation (physics engine) endpoints — Phase 2.
POST /api/simulation/trajectory — Lambert + RK4 interplanetary trajectory
"""

from datetime import date

import numpy as np
from fastapi import APIRouter, HTTPException

from app.physics.lambert import solve_lambert
from app.physics.propagator import heliocentric_position, propagate_trajectory
from app.schemas.simulation import TrajectoryRequest, TrajectoryResponse, TrajectoryPoint

router = APIRouter(prefix="/simulation", tags=["Simulation"])


def _date_to_jd(d: date) -> float:
    """Julian Date (approx) from calendar date."""
    from datetime import date as _d
    delta = (d - _d(2000, 1, 1)).days
    return 2451545.0 + delta


@router.post(
    "/trajectory",
    response_model=TrajectoryResponse,
    summary="Compute Lambert + RK4 interplanetary trajectory",
    description=(
        "Solves Lambert's problem for the requested departure/arrival dates, "
        "then integrates the heliocentric transfer arc with a 4th-order "
        "Runge-Kutta propagator. Returns Δv magnitudes and a dense trajectory."
    ),
)
def compute_trajectory(payload: TrajectoryRequest) -> TrajectoryResponse:
    launch_jd  = _date_to_jd(payload.launch_date)
    arrival_jd = _date_to_jd(payload.arrival_date)
    tof_days   = arrival_jd - launch_jd

    if tof_days <= 0:
        raise HTTPException(status_code=422, detail="arrival_date must be after launch_date.")
    if tof_days > 1500:
        raise HTTPException(status_code=422, detail="Transfer time exceeds 1500 days (unsupported).")

    try:
        r1 = heliocentric_position("earth", launch_jd)
        r2 = heliocentric_position(payload.target, arrival_jd)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        lambert = solve_lambert(r1, r2, tof_days, body="sun", prograde=True)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Lambert solver failed: {exc}. Check that the date range is physically valid.",
        )

    v1 = lambert["v1_km_s"]
    try:
        raw_points = propagate_trajectory(
            r0=r1.tolist(),
            v0=v1,
            tof_days=tof_days,
            body="sun",
            n_points=payload.n_points,
            use_j2=payload.use_j2,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Propagation failed: {exc}")

    traj_points = [
        TrajectoryPoint(
            x=p["x"], y=p["y"], z=p["z"],
            t=p["t"],
            vx=p["vx"], vy=p["vy"], vz=p["vz"],
            r_km=p["r_km"],
        )
        for p in raw_points
    ]

    return TrajectoryResponse(
        target=payload.target.capitalize(),
        launch_date=str(payload.launch_date),
        arrival_date=str(payload.arrival_date),
        delta_v_departure_km_s=round(lambert["delta_v_departure_km_s"], 4),
        delta_v_arrival_km_s=round(lambert["delta_v_arrival_km_s"], 4),
        total_delta_v_km_s=round(lambert["total_delta_v_km_s"], 4),
        transfer_time_days=round(tof_days, 2),
        departure_velocity=[round(v, 6) for v in v1],
        arrival_velocity=[round(v, 6) for v in lambert["v2_km_s"]],
        trajectory_points=traj_points,
        n_points=len(traj_points),
    )

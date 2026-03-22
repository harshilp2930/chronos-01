"""
Launch window optimizer endpoints — Phase 2.
POST /api/optimization/launch-window — Genetic algorithm search over departure dates.
"""

from fastapi import APIRouter, HTTPException

from app.ai.genetic import optimize_launch_window
from app.schemas.optimization import LaunchWindowRequest

router = APIRouter(prefix="/optimization", tags=["Optimization"])


@router.post(
    "/launch-window",
    summary="Find optimal launch windows via genetic algorithm",
    description=(
        "Searches a user-defined date range for minimum-Δv launch opportunities "
        "using a real-valued genetic algorithm combined with Lambert's problem. "
        "Returns the top-5 windows and the GA convergence history."
    ),
)
def launch_window(payload: LaunchWindowRequest):
    try:
        return optimize_launch_window(
            target=payload.target,
            earliest_date=payload.earliest_date,
            latest_date=payload.latest_date,
            population_size=payload.population_size,
            generations=payload.generations,
            seed=payload.seed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Optimizer error: {exc}")

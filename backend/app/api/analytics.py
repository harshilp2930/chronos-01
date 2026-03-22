"""
Analytics endpoints:

  GET /api/analytics/planner  — own mission stats (planner / individual)
  GET /api/analytics/officer  — system-wide stats (officer only)
"""

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_officer
from app.models.mission import Mission
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── Planner analytics ─────────────────────────────────────────────────────────
@router.get(
    "/planner",
    summary="Own mission analytics for planner / individual",
)
def planner_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    q = db.query(Mission).filter(Mission.created_by == current_user.id)
    missions = q.all()

    by_status: dict[str, int] = Counter(m.status for m in missions)  # type: ignore[assignment]
    by_target: dict[str, int] = Counter(m.target_body for m in missions)  # type: ignore[assignment]
    by_vehicle: dict[str, int] = Counter(m.vehicle_class for m in missions)  # type: ignore[assignment]

    delta_vs = [float(m.delta_v_km_s) for m in missions if m.delta_v_km_s is not None]
    scrub_risks = [float(m.scrub_risk_score) for m in missions if m.scrub_risk_score is not None]

    avg_delta_v = round(sum(delta_vs) / len(delta_vs), 4) if delta_vs else None
    avg_scrub_risk = round(sum(scrub_risks) / len(scrub_risks), 2) if scrub_risks else None

    # Average approval time (submitted_at → reviewed_at) for approved/rejected
    approval_times = []
    for m in missions:
        if m.submitted_at and m.reviewed_at:
            diff = (m.reviewed_at - m.submitted_at).total_seconds() / 86400
            approval_times.append(diff)
    avg_approval_days = (
        round(sum(approval_times) / len(approval_times), 2)
        if approval_times
        else None
    )

    delta_v_over_time = [
        {"date": str(m.launch_date), "delta_v": float(m.delta_v_km_s)}
        for m in missions
        if m.delta_v_km_s is not None and m.launch_date is not None
    ]

    return {
        "total_missions": len(missions),
        "by_status": dict(by_status),
        "by_target": dict(by_target),
        "by_vehicle": dict(by_vehicle),
        "avg_delta_v": avg_delta_v,
        "avg_scrub_risk": avg_scrub_risk,
        "delta_v_over_time": delta_v_over_time,
        "avg_approval_days": avg_approval_days,
    }


# ── Officer analytics ─────────────────────────────────────────────────────────
@router.get(
    "/officer",
    summary="System-wide analytics (officer only)",
)
def officer_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
) -> dict[str, Any]:
    all_missions = db.query(Mission).all()

    total = len(all_missions)
    approved = sum(1 for m in all_missions if m.status == "approved")
    rejected = sum(1 for m in all_missions if m.status == "rejected")
    pending = sum(1 for m in all_missions if m.status == "pending_approval")
    approval_rate = round(approved / (approved + rejected) * 100, 2) if (approved + rejected) else 0.0

    # Planner performance
    planners = db.query(User).filter(User.role.in_(["planner", "individual"])).all()
    planner_perf = []
    for planner in planners:
        p_missions = [m for m in all_missions if m.created_by == planner.id]
        p_approved = sum(1 for m in p_missions if m.status == "approved")
        p_rejected = sum(1 for m in p_missions if m.status == "rejected")
        p_submitted = sum(1 for m in p_missions if m.status in ("pending_approval", "approved", "rejected"))
        rate = round(p_approved / (p_approved + p_rejected) * 100, 1) if (p_approved + p_rejected) else 0.0
        planner_perf.append({
            "planner_id": str(planner.id),
            "planner_name": planner.full_name,
            "submitted": p_submitted,
            "approved": p_approved,
            "rejected": p_rejected,
            "approval_rate": rate,
        })

    # By vehicle success rate
    by_vehicle: dict[str, dict] = {}
    for m in all_missions:
        v = m.vehicle_class
        if v not in by_vehicle:
            by_vehicle[v] = {"approved": 0, "rejected": 0, "total": 0}
        by_vehicle[v]["total"] += 1
        if m.status == "approved":
            by_vehicle[v]["approved"] += 1
        elif m.status == "rejected":
            by_vehicle[v]["rejected"] += 1

    # By target success rate
    by_target: dict[str, dict] = {}
    for m in all_missions:
        t = m.target_body
        if t not in by_target:
            by_target[t] = {"approved": 0, "rejected": 0, "total": 0}
        by_target[t]["total"] += 1
        if m.status == "approved":
            by_target[t]["approved"] += 1
        elif m.status == "rejected":
            by_target[t]["rejected"] += 1

    # Monthly volume
    monthly: dict[str, int] = {}
    for m in all_missions:
        key = m.created_at.strftime("%Y-%m") if m.created_at else "unknown"
        monthly[key] = monthly.get(key, 0) + 1
    monthly_volume = [{"month": k, "count": v} for k, v in sorted(monthly.items())]

    return {
        "total_missions": total,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "approval_rate_pct": approval_rate,
        "planner_performance": planner_perf,
        "by_vehicle_success": by_vehicle,
        "by_target_success": by_target,
        "monthly_volume": monthly_volume,
    }

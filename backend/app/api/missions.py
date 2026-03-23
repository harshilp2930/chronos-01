"""
Mission CRUD + approval-flow endpoints:

  POST   /api/missions/                   — create mission
  GET    /api/missions/                   — list missions (own / all for officer)
  GET    /api/missions/{id}               — get single mission
  PUT    /api/missions/{id}               — update mission (draft only)
  DELETE /api/missions/{id}               — delete mission (draft only)
  POST   /api/missions/{id}/submit        — submit for approval (planner)
  POST   /api/missions/{id}/approve       — approve (officer)
  POST   /api/missions/{id}/reject        — reject  (officer)
  GET    /api/missions/{id}/export-pdf    — download PDF report
"""

from datetime import datetime, timezone
from io import BytesIO
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_officer
from app.models.mission import Mission
from app.models.user import User
from app.schemas.mission import (
    MissionApproveRequest,
    MissionCreate,
    MissionListResponse,
    MissionOut,
    MissionRejectRequest,
    MissionUpdate,
)

router = APIRouter(prefix="/missions", tags=["Missions"])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_mission_or_404(mission_id: uuid.UUID, db: Session) -> Mission:
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission {mission_id} not found.",
        )
    return mission


def _assert_owner_or_officer(mission: Mission, current_user: User) -> None:
    """Ensure user is either the mission owner or an officer."""
    if current_user.role != "officer" and mission.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this mission.",
        )


def _generate_trajectory_data_for_mission(mission: Mission) -> tuple[dict, float]:
    """Generate trajectory payload and total delta-v for a mission."""
    from datetime import date as _date
    from datetime import timedelta
    from app.physics.lambert import solve_lambert
    from app.physics.propagator import heliocentric_position, propagate_trajectory

    if not mission.launch_date:
        raise ValueError("Mission must have a launch_date before running simulation.")

    target = (mission.target_body or "").lower()
    if target not in {"moon", "mars", "venus"}:
        raise ValueError(f"Simulation not supported for target '{mission.target_body}'.")

    def _date_to_jd(d: _date) -> float:
        delta = (d - _date(2000, 1, 1)).days
        return 2451545.0 + delta

    default_tof = {"moon": 3, "mars": 200, "venus": 150}
    tof_days = default_tof[target]

    if isinstance(mission.launch_date, str):
        launch_date = _date.fromisoformat(mission.launch_date)
    else:
        launch_date = mission.launch_date

    launch_jd = _date_to_jd(launch_date)
    arrival_jd = launch_jd + tof_days

    r1 = heliocentric_position("earth", launch_jd)
    r2 = heliocentric_position(target, arrival_jd)
    lambert = solve_lambert(r1, r2, tof_days, body="sun", prograde=True)

    raw_points = propagate_trajectory(
        r0=r1.tolist(),
        v0=lambert["v1_km_s"],
        tof_days=tof_days,
        body="sun",
        n_points=200,
        use_j2=False,
    )

    arrival_date = launch_date + timedelta(days=tof_days)
    traj_data = {
        "target": mission.target_body.capitalize(),
        "launch_date": str(launch_date),
        "arrival_date": str(arrival_date),
        "delta_v_departure_km_s": round(lambert["delta_v_departure_km_s"], 4),
        "delta_v_arrival_km_s": round(lambert["delta_v_arrival_km_s"], 4),
        "total_delta_v_km_s": round(lambert["total_delta_v_km_s"], 4),
        "transfer_time_days": round(float(tof_days), 2),
        "trajectory_points": [
            {
                "x": p["x"],
                "y": p["y"],
                "z": p["z"],
                "t": p["t"],
                "vx": p["vx"],
                "vy": p["vy"],
                "vz": p["vz"],
                "r_km": p["r_km"],
            }
            for p in raw_points
        ],
    }
    return traj_data, round(lambert["total_delta_v_km_s"], 4)


# ── Create ────────────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=MissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new mission (all roles)",
)
def create_mission(
    payload: MissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = Mission(
        title=payload.title,
        created_by=current_user.id,
        status="draft",
        target_body=payload.target_body,
        launch_pad_id=payload.launch_pad_id,
        vehicle_class=payload.vehicle_class,
        orbit_type=payload.orbit_type,
        launch_date=payload.launch_date,
        safety_buffer=payload.safety_buffer,
        azimuth_deg=payload.azimuth_deg,
        corridor_width_km=payload.corridor_width_km,
        downrange_km=payload.downrange_km,
    )

    # Best-effort trajectory generation so mission has a path immediately.
    if mission.launch_date and (mission.target_body or "").lower() in {"moon", "mars", "venus"}:
        try:
            traj_data, total_dv = _generate_trajectory_data_for_mission(mission)
            mission.trajectory_data = traj_data
            mission.delta_v_km_s = total_dv
        except Exception:
            # Keep mission creation resilient; explicit /simulate can still be used.
            pass

    db.add(mission)
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── List ──────────────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=MissionListResponse,
    summary="List missions — own for planner/individual, all for officer",
)
def list_missions(
    status_filter: Optional[str] = Query(None, alias="status"),
    target: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Mission)

    # Officers see all; others see only their own
    if current_user.role != "officer":
        q = q.filter(Mission.created_by == current_user.id)

    if status_filter:
        q = q.filter(Mission.status == status_filter)
    if target:
        q = q.filter(Mission.target_body == target)

    total = q.count()
    missions = (
        q.order_by(Mission.created_at.desc()).offset(skip).limit(limit).all()
    )

    return MissionListResponse(
        total=total,
        missions=[MissionOut.model_validate(m) for m in missions],
    )


# ── Get single ────────────────────────────────────────────────────────────────
@router.get(
    "/{mission_id}",
    response_model=MissionOut,
    summary="Get a single mission by ID",
)
def get_mission(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, db)
    _assert_owner_or_officer(mission, current_user)
    return MissionOut.model_validate(mission)


# ── Update ────────────────────────────────────────────────────────────────────
@router.put(
    "/{mission_id}",
    response_model=MissionOut,
    summary="Update a mission — draft status only, owner only",
)
def update_mission(
    mission_id: uuid.UUID,
    payload: MissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, db)
    _assert_owner_or_officer(mission, current_user)

    if mission.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft missions can be updated.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    recompute_trajectory = any(
        field in update_data
        for field in {
            "target_body",
            "launch_date",
            "orbit_type",
            "vehicle_class",
            "azimuth_deg",
            "corridor_width_km",
            "downrange_km",
        }
    )

    for field, value in update_data.items():
        setattr(mission, field, value)

    if mission.launch_date and (mission.target_body or "").lower() in {"moon", "mars", "venus"}:
        if recompute_trajectory or not mission.trajectory_data:
            try:
                traj_data, total_dv = _generate_trajectory_data_for_mission(mission)
                mission.trajectory_data = traj_data
                mission.delta_v_km_s = total_dv
            except Exception:
                pass

    mission.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── Delete ────────────────────────────────────────────────────────────────────
@router.delete(
    "/{mission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mission — draft status only, owner only",
)
def delete_mission(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, db)
    _assert_owner_or_officer(mission, current_user)

    if mission.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft missions can be deleted.",
        )

    db.delete(mission)
    db.commit()


# ── Submit for approval ───────────────────────────────────────────────────────
@router.post(
    "/{mission_id}/submit",
    response_model=MissionOut,
    summary="Submit a draft mission for officer approval (planner / individual → not allowed for individuals)",
)
def submit_mission(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "individual":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Individual users do not have an approval flow.",
        )

    mission = _get_mission_or_404(mission_id, db)

    if mission.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own missions.",
        )

    if mission.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission is already in '{mission.status}' status.",
        )

    mission.status = "pending_approval"
    mission.submitted_at = datetime.now(timezone.utc)
    mission.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── Approve ───────────────────────────────────────────────────────────────────
@router.post(
    "/{mission_id}/approve",
    response_model=MissionOut,
    summary="Approve a pending mission (officer only)",
)
def approve_mission(
    mission_id: uuid.UUID,
    payload: MissionApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    mission = _get_mission_or_404(mission_id, db)

    if mission.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission must be in 'pending_approval' status to approve. Current: '{mission.status}'.",
        )

    now = datetime.now(timezone.utc)
    mission.status = "approved"
    mission.reviewed_by = current_user.id
    mission.reviewed_at = now
    mission.officer_notes = payload.notes
    mission.updated_at = now
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── Reject ────────────────────────────────────────────────────────────────────
@router.post(
    "/{mission_id}/reject",
    response_model=MissionOut,
    summary="Reject a pending mission (officer only, notes required)",
)
def reject_mission(
    mission_id: uuid.UUID,
    payload: MissionRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    mission = _get_mission_or_404(mission_id, db)

    if mission.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mission must be in 'pending_approval' status to reject. Current: '{mission.status}'.",
        )

    now = datetime.now(timezone.utc)
    mission.status = "rejected"
    mission.reviewed_by = current_user.id
    mission.reviewed_at = now
    mission.officer_notes = payload.notes
    mission.updated_at = now
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── Run Trajectory Simulation ─────────────────────────────────────────────────
@router.post(
    "/{mission_id}/simulate",
    response_model=MissionOut,
    summary="Run Lambert+RK4 trajectory simulation and persist results",
)
def simulate_mission(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = _get_mission_or_404(mission_id, db)
    _assert_owner_or_officer(mission, current_user)
    try:
        traj_data, total_dv = _generate_trajectory_data_for_mission(mission)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}")

    mission.trajectory_data = traj_data
    mission.delta_v_km_s = total_dv
    mission.updated_at      = datetime.now(timezone.utc)
    db.commit()
    db.refresh(mission)
    return MissionOut.model_validate(mission)


# ── PDF Export ────────────────────────────────────────────────────────────────
@router.get(
    "/{mission_id}/export-pdf",
    summary="Export mission report as PDF (A4)",
)
def export_pdf(
    mission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from reportlab.lib import colors
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )
    from reportlab.graphics.shapes import Drawing, Rect, String, Polygon

    # ── Color palette (Premium Light Theme) ────────────────────────────────────
    C_BG       = HexColor("#FFFFFF")
    C_SURFACE  = HexColor("#F8FAFC")
    C_ELEVATED = HexColor("#F1F5F9")
    C_BORDER   = HexColor("#E2E8F0")
    C_CYAN     = HexColor("#0891B2")
    C_BLUE     = HexColor("#2563EB")
    C_GREEN    = HexColor("#059669")
    C_AMBER    = HexColor("#D97706")
    C_ORANGE   = HexColor("#EA580C")
    C_RED      = HexColor("#DC2626")
    C_LIME     = HexColor("#65A30D")
    C_TEXT     = HexColor("#0F172A")
    C_TEXT_SEC = HexColor("#475569")
    C_TEXT_MUT = HexColor("#94A3B8")
    C_WHITE    = HexColor("#FFFFFF")

    PAGE_W, PAGE_H = A4
    L_MARGIN = 2 * cm

    mission = _get_mission_or_404(mission_id, db)
    _assert_owner_or_officer(mission, current_user)

    planner = db.query(User).filter(User.id == mission.created_by).first()
    reviewer = (
        db.query(User).filter(User.id == mission.reviewed_by).first()
        if mission.reviewed_by else None
    )

    # ── Canvas callback: dark bg + top accent line + footer strip ─────────────
    def _draw_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # 3 pt cyan accent bar at very top
        canvas.setFillColor(C_CYAN)
        canvas.rect(0, PAGE_H - 3, PAGE_W, 3, fill=1, stroke=0)
        # Footer strip
        canvas.setFillColor(C_SURFACE)
        canvas.rect(0, 0, PAGE_W, 1.1 * cm, fill=1, stroke=0)
        canvas.setFillColor(C_BORDER)
        canvas.rect(0, 1.1 * cm, PAGE_W, 0.3, fill=1, stroke=0)
        canvas.setFillColor(C_TEXT_MUT)
        canvas.setFont("Helvetica", 6.5)
        canvas.drawString(
            L_MARGIN, 0.38 * cm,
            "CHRONOS-1  \u00b7  MISSION INTELLIGENCE OPTIMIZER  \u00b7  CONFIDENTIAL",
        )
        canvas.setFillColor(C_TEXT_SEC)
        canvas.drawRightString(PAGE_W - L_MARGIN, 0.38 * cm, f"Page {doc.page}")
        canvas.restoreState()

    # ── Styles ─────────────────────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    def _ps(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    title_style   = _ps("T",  fontSize=22, textColor=C_TEXT,
                          fontName="Helvetica-Bold", leading=28, spaceAfter=4)
    meta_style    = _ps("M",  fontSize=8,  textColor=C_TEXT_SEC, spaceAfter=3)
    section_style = _ps("SH", fontSize=10, textColor=C_TEXT,
                          fontName="Helvetica-Bold", leading=14)
    key_style     = _ps("K",  fontSize=8.5, textColor=C_TEXT_SEC, leading=12)
    value_style   = _ps("V",  fontSize=8.5, textColor=C_TEXT, leading=12,
                          fontName="Helvetica-Bold")
    note_style    = _ps("N",  fontSize=8,  textColor=C_TEXT_SEC, leading=11)

    status_label = mission.status.replace("_", " ").upper()
    status_hex = {
        "DRAFT":     "#475569",
        "SUBMITTED": "#2563EB",
        "APPROVED":  "#059669",
        "REJECTED":  "#DC2626",
        "IN REVIEW": "#D97706",
    }.get(status_label, "#0891B2")

    # usable content width in points (A4 - left/right margins)
    CONTENT_W = PAGE_W - 4 * cm

    # ── Helper: section header with coloured left-accent bar & improved spacing ──
    def section_header(title_text, accent=C_CYAN):
        t = Table(
            [[Paragraph(f"  {title_text}", section_style)]],
            colWidths=[CONTENT_W],
        )
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), C_ELEVATED),
            ("LINEBEFORE",    (0, 0), (0, -1),  4, accent),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("ROUNDCORNERS",  (0, 0), (-1, -1), 2),
        ]))
        return t

    # ── Helper: dark alternating-row KV table with improved spacing ─────────────
    def kv_table(rows):
        data = [
            [Paragraph(str(k), key_style), Paragraph(str(v) if v else "\u2014", value_style)]
            for k, v in rows
        ]
        bg_cmds = [
            ("BACKGROUND", (0, i), (-1, i), C_SURFACE if i % 2 == 0 else C_ELEVATED)
            for i in range(len(data))
        ]
        t = Table(data, colWidths=[5.2 * cm, 11.8 * cm])
        t.setStyle(TableStyle([
            *bg_cmds,
            ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("ROWHEIGHT",     (0, 0), (-1, -1), 24),
        ]))
        return t

    # ── Helper: weather risk gauge (coloured zone track + needle) ─────────────
    def make_risk_gauge(risk_pct: float) -> Drawing:
        w        = float(CONTENT_W)
        h        = 58.0
        track_y  = 22.0
        track_h  = 18.0
        d = Drawing(w, h)

        # Dark base track
        d.add(Rect(0, track_y, w, track_h,
                   fillColor=C_ELEVATED, strokeColor=C_BORDER, strokeWidth=0.5))

        # Coloured risk zones
        for start, end, color in [
            (0.00, 0.25, C_GREEN),
            (0.25, 0.50, C_LIME),
            (0.50, 0.70, C_AMBER),
            (0.70, 0.85, C_ORANGE),
            (0.85, 1.00, C_RED),
        ]:
            d.add(Rect(start * w, track_y, (end - start) * w, track_h,
                       fillColor=color, strokeColor=None))

        # Zone labels above the track
        for lbl, pos, lc in [
            ("NOMINAL",   0.125, C_GREEN),
            ("MARGINAL",  0.375, C_LIME),
            ("CAUTION",   0.600, C_AMBER),
            ("HIGH RISK", 0.775, C_ORANGE),
            ("CRITICAL",  0.925, C_RED),
        ]:
            d.add(String(pos * w, track_y + track_h + 3, lbl,
                         fillColor=lc, fontSize=5.5, fontName="Helvetica-Bold",
                         textAnchor="middle"))

        # Needle + pointer triangle
        rp = max(0.0, min(1.0, risk_pct))
        nx = rp * w
        d.add(Rect(nx - 1.5, track_y - 5, 3, track_h + 10,
                   fillColor=C_TEXT, strokeColor=None))
        d.add(Polygon(
            [nx, track_y - 5, nx - 5, track_y - 15, nx + 5, track_y - 15],
            fillColor=C_TEXT, strokeColor=None,
        ))
        # Percentage value below pointer
        d.add(String(nx, 2.0, f"{rp * 100:.1f}%",
                     fillColor=C_TEXT, fontSize=10, fontName="Helvetica-Bold",
                     textAnchor="middle"))
        return d

    # ── Helper: ΔV horizontal bar chart ───────────────────────────────────────
    def make_dv_chart(dv_dep, dv_arr, total_dv):
        items = [
            ("Departure \u0394V", dv_dep,    C_CYAN),
            ("Arrival \u0394V",   dv_arr,    C_BLUE),
            ("Total \u0394V",     total_dv,  C_GREEN),
        ]
        items = [(lbl, v, c) for lbl, v, c in items if v is not None and v > 0]
        if not items:
            return None
        w         = float(CONTENT_W)
        label_w   = 100.0
        val_w     = 80.0
        bar_area  = w - label_w - val_w
        max_v     = max(v for _, v, _ in items)
        h         = float(len(items) * 28 + 10)
        d = Drawing(w, h)
        for i, (label, val, color) in enumerate(items):
            y     = h - (i + 1) * 28 + 5.0
            bar_w = (val / max_v) * bar_area if max_v > 0 else 0.0
            d.add(String(0, y + 3, label,
                         fillColor=C_TEXT_SEC, fontSize=8, textAnchor="start"))
            d.add(Rect(label_w, y, bar_area, 14,
                       fillColor=C_ELEVATED, strokeColor=C_BORDER, strokeWidth=0.3))
            if bar_w > 0:
                d.add(Rect(label_w, y, bar_w, 14,
                           fillColor=color, strokeColor=None))
            d.add(String(label_w + bar_w + 5, y + 3, f"{val:.4f} km/s",
                         fillColor=C_TEXT, fontSize=8, textAnchor="start"))
        return d

    # ── Build story ────────────────────────────────────────────────────────────
    if not mission.trajectory_data and mission.launch_date and (mission.target_body or "").lower() in {"moon", "mars", "venus"}:
        try:
            traj_data, total_dv = _generate_trajectory_data_for_mission(mission)
            mission.trajectory_data = traj_data
            mission.delta_v_km_s = total_dv
            mission.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(mission)
        except Exception:
            pass

    traj = mission.trajectory_data or {}
    story   = []

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ HEADER SECTION ─────────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    brand_row = Table(
        [[
            Paragraph('<font name="Helvetica-Bold">CHRONOS-1</font>',
                      _ps("BR", fontSize=9, textColor=C_CYAN)),
            Paragraph(f'<font color="{status_hex}"><b>{status_label}</b></font>',
                      _ps("ST", fontSize=9, textColor=C_TEXT, alignment=TA_RIGHT)),
        ]],
        colWidths=[CONTENT_W * 0.5, CONTENT_W * 0.5],
    )
    brand_row.setStyle(TableStyle([
        ("ALIGN",         (1, 0), (1, 0), "RIGHT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(brand_row)
    story.append(Paragraph(
        "MISSION INTELLIGENCE OPTIMIZER",
        _ps("Sub", fontSize=7, textColor=C_TEXT_MUT, spaceAfter=6),
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=C_CYAN, spaceAfter=12))
    story.append(Paragraph(mission.title, title_style))
    story.append(Paragraph(
        f"Mission ID: <b>{str(mission.id)[:8].upper()}</b>  \u00b7  "
        f"Generated: <b>{datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}</b>",
        meta_style,
    ))
    story.append(Spacer(1, 20))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ MISSION OVERVIEW ───────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("MISSION OVERVIEW", accent=C_CYAN))
    story.append(Spacer(1, 6))
    story.append(kv_table([
        ("Target Body",     mission.target_body.upper()),
        ("Launch Pad Site", mission.launch_pad_id.upper()),
        ("Vehicle Class",   mission.vehicle_class.upper()),
        ("Orbit Type",      mission.orbit_type.upper() if mission.orbit_type else "\u2014"),
    ]))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ LAUNCH TIMELINE ────────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("LAUNCH TIMELINE", accent=C_BLUE))
    story.append(Spacer(1, 6))
    story.append(kv_table([
        ("Scheduled Launch Date", str(mission.launch_date) if mission.launch_date else "\u2014"),
        ("Submit Date",           mission.submitted_at.strftime("%B %d, %Y") if mission.submitted_at else "Not Submitted"),
        ("Current Status",        status_label),
    ]))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ TRAJECTORY DETAILS ─────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("TRAJECTORY PATH", accent=C_CYAN))
    story.append(Spacer(1, 6))
    
    # Trajectory summary info
    transfer_time = traj.get("transfer_time_days")
    arrival_date = traj.get("arrival_date")
    departure_alt = traj.get("departure_altitude_km")
    arrival_alt = traj.get("arrival_altitude_km")
    
    trajectory_summary = [
        ("Source Body",          "Earth" if mission.target_body.lower() != "earth" else "LEO"),
        ("Destination Body",     mission.target_body.upper()),
        ("Transfer Type",        "Hohmann Transfer" if transfer_time else "Direct Trajectory"),
        ("Transfer Duration",    f"{transfer_time:.2f} days" if transfer_time else "\u2014"),
        ("Departure Altitude",   f"{departure_alt:.1f} km" if departure_alt else "Standard LEO"),
        ("Arrival Altitude",     f"{arrival_alt:.1f} km" if arrival_alt else "\u2014"),
        ("Estimated Arrival",    arrival_date or "\u2014"),
    ]
    story.append(kv_table(trajectory_summary))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ ORBITAL MECHANICS ──────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("ORBITAL MECHANICS & \u0394V PROFILE", accent=C_GREEN))
    story.append(Spacer(1, 8))
    
    total_dv_val = (
        float(mission.delta_v_km_s) if mission.delta_v_km_s
        else traj.get("total_delta_v_km_s")
    )
    dv_dep = traj.get("delta_v_departure_km_s")
    dv_arr = traj.get("delta_v_arrival_km_s")
    semi_major_axis = traj.get("semi_major_axis_au")
    semi_minor_axis = traj.get("semi_minor_axis_au")
    
    dv_chart = make_dv_chart(
        float(dv_dep) if dv_dep is not None else None,
        float(dv_arr) if dv_arr is not None else None,
        float(total_dv_val) if total_dv_val is not None else None,
    )
    if dv_chart:
        story.append(dv_chart)
        story.append(Spacer(1, 10))
    
    story.append(kv_table([
        ("Total \u0394V Required",    f"{float(total_dv_val):.4f} km/s" if total_dv_val else "\u2014"),
        ("\u0394V at Departure",      f"{float(dv_dep):.4f} km/s" if dv_dep is not None else "\u2014"),
        ("\u0394V at Arrival",        f"{float(dv_arr):.4f} km/s" if dv_arr is not None else "\u2014"),
        ("Semi-Major Axis",           f"{float(semi_major_axis):.4f} AU" if semi_major_axis else "\u2014"),
        ("Semi-Minor Axis",           f"{float(semi_minor_axis):.4f} AU" if semi_minor_axis else "\u2014"),
        ("Orbital Eccentricity",      traj.get("eccentricity") or "\u2014"),
    ]))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ WEATHER ASSESSMENT ─────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("WEATHER SCRUB RISK ASSESSMENT", accent=C_AMBER))
    story.append(Spacer(1, 10))
    if mission.scrub_risk_score is not None:
        rp = float(mission.scrub_risk_score)
        story.append(make_risk_gauge(rp))
        risk_desc = (
            "NOMINAL \u2014 Excellent launch conditions expected." if rp < 0.25 else
            "MARGINAL \u2014 Conditions acceptable, monitor for changes." if rp < 0.50 else
            "CAUTION \u2014 Weather may impact launch. Contingency plan recommended." if rp < 0.70 else
            "HIGH RISK \u2014 Significant weather concerns. Consider postponement." if rp < 0.85 else
            "CRITICAL \u2014 Launch not recommended. Conditions prohibitive."
        )
        story.append(Spacer(1, 10))
        story.append(Paragraph(risk_desc, note_style))
    else:
        story.append(Paragraph("No weather assessment data available.", note_style))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ SAFETY & OPERATIONAL CONSTRAINTS ────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("SAFETY & OPERATIONAL CONSTRAINTS", accent=C_ORANGE))
    story.append(Spacer(1, 6))
    story.append(kv_table([
        ("Safety Buffer Factor",  f"{float(mission.safety_buffer):.1f}\u00d7" if mission.safety_buffer else "\u2014"),
        ("Launch Azimuth",        f"{float(mission.azimuth_deg):.1f}\u00b0" if mission.azimuth_deg else "\u2014"),
        ("Corridor Width",        f"{float(mission.corridor_width_km):.1f} km" if mission.corridor_width_km else "\u2014"),
        ("Downrange Distance",    f"{float(mission.downrange_km):.1f} km" if mission.downrange_km else "\u2014"),
    ]))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ MISSION PERSONNEL ──────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("RESPONSIBLE PERSONNEL & APPROVALS", accent=C_GREEN))
    story.append(Spacer(1, 6))
    approval_status = "APPROVED \u2713" if mission.reviewed_by else "PENDING REVIEW"
    approval_color = "#059669" if mission.reviewed_by else "#94A3B8"
    story.append(kv_table([
        ("Mission Planner",     planner.full_name if planner else "\u2014"),
        ("Planner Contact",     planner.email if planner else "\u2014"),
        ("Approval Status",     f'<font color="{approval_color}"><b>{approval_status}</b></font>'),
        ("Reviewed By",         reviewer.full_name if reviewer else "Pending Officer Review"),
        ("Review Timestamp",    mission.reviewed_at.strftime("%B %d, %Y - %H:%M UTC") if mission.reviewed_at else "\u2014"),
        ("Officer Comments",    mission.officer_notes if mission.officer_notes else "None"),
    ]))
    story.append(Spacer(1, 18))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ MISSION HISTORY ────────────────────────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(section_header("MISSION HISTORY", accent=C_TEXT_SEC))
    story.append(Spacer(1, 6))
    story.append(kv_table([
        ("Created Date",  mission.created_at.strftime("%B %d, %Y at %H:%M UTC") if mission.created_at else "\u2014"),
        ("Modified Date", mission.updated_at.strftime("%B %d, %Y at %H:%M UTC") if mission.updated_at else "\u2014"),
        ("Submitted Date", mission.submitted_at.strftime("%B %d, %Y at %H:%M UTC") if mission.submitted_at else "Not Submitted"),
    ]))
    story.append(Spacer(1, 24))

    # ══════════════════════════════════════════════════════════════════════════
    # ┌ FINAL DISCLAIMER & CONFIDENTIALITY ─────────────────────────────────────┐
    # ══════════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=10))
    story.append(Paragraph(
        "<b>CONFIDENTIALITY NOTICE:</b> This document is generated by CHRONOS-1 Mission Intelligence Optimizer "
        "and contains proprietary mission planning data. All trajectory calculations, safety assessments, and "
        "weather evaluations are preliminary and subject to official mission review and approval.<br/><br/>"
        "<b>TECHNICAL NOTICE:</b> Transfer times, \u0394V values, and arrival dates are calculated based on "
        "Hohmann transfer orbit mechanics and current planetary positions. Actual mission performance may vary "
        "based on real-time conditions, vehicle performance, and operational constraints.",
        _ps("D", fontSize=6.5, textColor=C_TEXT_MUT, alignment=TA_CENTER, leading=9),
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "For questions or clarifications, contact the responsible mission planner or review officer.",
        _ps("D", fontSize=6.5, textColor=C_TEXT_MUT, alignment=TA_CENTER),
    ))

    # ── Render ─────────────────────────────────────────────────────────────────
    try:
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            rightMargin=2.2 * cm,
            leftMargin=2.2 * cm,
            topMargin=2.8 * cm,
            bottomMargin=2.0 * cm,
            allowSplitting=True,
        )
        doc.build(story, onFirstPage=_draw_page, onLaterPages=_draw_page)
        buf.seek(0)

        date_str  = datetime.now(timezone.utc).strftime("%Y%m%d")
        title_str = mission.title.replace(" ", "_")[:40]
        filename  = f"CHRONOS1_{title_str}_{date_str}.pdf"

        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[PDF_EXPORT_ERROR] Mission ID: {mission_id}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}. Check server logs for details.",
        )

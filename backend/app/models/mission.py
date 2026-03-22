import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    JSON,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Mission(Base):
    __tablename__ = "missions"

    # Uuid (SQLAlchemy 2.0+): native uuid on PostgreSQL, CHAR(32) on SQLite.
    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    title = Column(String(200), nullable=False)
    created_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # ── Status ────────────────────────────────────────────────────────────────
    # draft | pending_approval | approved | rejected
    status = Column(String(20), default="draft", nullable=False, index=True)

    # ── Mission parameters ────────────────────────────────────────────────────
    target_body = Column(String(50), nullable=False)       # moon | mars | venus
    launch_pad_id = Column(String(20), nullable=False)     # sdsc | vssc | aki
    vehicle_class = Column(String(20), nullable=False)     # sounding|sslv|pslv|gslv2|lvm3
    launch_date = Column(Date, nullable=True)
    orbit_type = Column(String(10), nullable=True)         # leo|sso|geo|sub

    # ── Safety zone parameters ────────────────────────────────────────────────
    safety_buffer = Column(Numeric(3, 1), default=1.2, nullable=True)
    azimuth_deg = Column(Numeric(6, 2), nullable=True)
    corridor_width_km = Column(Numeric(6, 1), nullable=True)
    downrange_km = Column(Numeric(8, 1), nullable=True)

    # ── Computed / ML fields ──────────────────────────────────────────────────
    delta_v_km_s = Column(Numeric(8, 4), nullable=True)
    scrub_risk_score = Column(Numeric(5, 2), nullable=True)

    # ── JSON blobs (physics / AI results)
    # JSON (SQLAlchemy 2.0+) maps to jsonb on PostgreSQL, TEXT on SQLite.
    trajectory_data = Column(JSON, nullable=True)
    safety_zone_data = Column(JSON, nullable=True)
    optimization_data = Column(JSON, nullable=True)

    # ── Approval fields ───────────────────────────────────────────────────────
    officer_notes = Column(Text, nullable=True)
    reviewed_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    # ── Audit timestamps ──────────────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    creator = relationship(
        "User",
        back_populates="missions",
        foreign_keys=[created_by],
    )
    reviewer = relationship(
        "User",
        back_populates="reviewed_missions",
        foreign_keys=[reviewed_by],
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Mission id={self.id} title={self.title!r} status={self.status}>"

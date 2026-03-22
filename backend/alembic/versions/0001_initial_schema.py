"""Initial schema — users and missions tables

Revision ID: 0001
Revises:
Create Date: 2026-03-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(150), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            comment="officer | planner | individual",
        ),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('officer', 'planner', 'individual')",
            name="ck_users_role",
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── missions ─────────────────────────────────────────────────────────────
    op.create_table(
        "missions",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "created_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("target_body", sa.String(50), nullable=False),
        sa.Column("launch_pad_id", sa.String(20), nullable=False),
        sa.Column("vehicle_class", sa.String(20), nullable=False),
        sa.Column("launch_date", sa.Date(), nullable=True),
        sa.Column("orbit_type", sa.String(10), nullable=True),
        sa.Column("safety_buffer", sa.Numeric(3, 1), server_default="1.2", nullable=True),
        sa.Column("azimuth_deg", sa.Numeric(6, 2), nullable=True),
        sa.Column("corridor_width_km", sa.Numeric(6, 1), nullable=True),
        sa.Column("downrange_km", sa.Numeric(8, 1), nullable=True),
        sa.Column("delta_v_km_s", sa.Numeric(8, 4), nullable=True),
        sa.Column("scrub_risk_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("trajectory_data", JSONB, nullable=True),
        sa.Column("safety_zone_data", JSONB, nullable=True),
        sa.Column("optimization_data", JSONB, nullable=True),
        sa.Column("officer_notes", sa.Text(), nullable=True),
        sa.Column(
            "reviewed_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('draft','pending_approval','approved','rejected')",
            name="ck_missions_status",
        ),
    )
    op.create_index("ix_missions_created_by", "missions", ["created_by"])
    op.create_index("ix_missions_status", "missions", ["status"])


def downgrade() -> None:
    op.drop_table("missions")
    op.drop_table("users")

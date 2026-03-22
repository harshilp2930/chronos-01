import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    # Uuid (SQLAlchemy 2.0+) is portable: native uuid on PostgreSQL,
    # CHAR(32) on SQLite — required for test compatibility.
    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        String(20),
        nullable=False,
        comment="officer | planner | individual",
    )
    # Officer who created this planner (NULL for self-registered users)
    created_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
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
    # Missions created by this user
    missions = relationship(
        "Mission",
        back_populates="creator",
        foreign_keys="Mission.created_by",
    )
    # Missions reviewed by this user (officer)
    reviewed_missions = relationship(
        "Mission",
        back_populates="reviewer",
        foreign_keys="Mission.reviewed_by",
    )
    # NOTE: Self-referential officer→planner relationship (created_by) is
    # intentionally not defined as an ORM relationship here to keep the
    # declarative setup simple. Use db.query(User).filter(...) directly.

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email} role={self.role}>"

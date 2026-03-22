"""
User management endpoints (officer only):

  GET    /api/users/                     — list all users
  GET    /api/users/{id}                 — get user profile
  POST   /api/users/                     — create planner account (officer only)
  PATCH  /api/users/{id}/deactivate      — deactivate a user
  PATCH  /api/users/{id}/reactivate      — reactivate a user
"""

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, hash_password, require_officer
from app.models.user import User
from app.schemas.auth import RegisterResponse, UserOut
from pydantic import BaseModel, EmailStr


router = APIRouter(prefix="/users", tags=["Users"])


# ── Create planner (officer only) ─────────────────────────────────────────────
class CreatePlannerRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


@router.post(
    "/",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Officer creates a planner account",
)
def create_planner(
    payload: CreatePlannerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="planner",
        created_by=current_user.id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)


# ── List all users ────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=list[UserOut],
    summary="List all users (officer only)",
)
def list_users(
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)

    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [UserOut.model_validate(u) for u in users]


# ── Get single user ───────────────────────────────────────────────────────────
@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Get user profile (officer can see any; users see their own)",
)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "officer" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserOut.model_validate(user)


# ── Deactivate ────────────────────────────────────────────────────────────────
@router.patch(
    "/{user_id}/deactivate",
    response_model=UserOut,
    summary="Deactivate a user account (officer only)",
)
def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Officers cannot deactivate their own account.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


# ── Reactivate ────────────────────────────────────────────────────────────────
@router.patch(
    "/{user_id}/reactivate",
    response_model=UserOut,
    summary="Reactivate a user account (officer only)",
)
def reactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_active = True
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)

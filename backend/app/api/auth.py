"""
Authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
  POST /api/auth/refresh
  POST /api/auth/change-password
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Register ──────────────────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (officer / planner / individual)",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Check email uniqueness
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    # 2. Resolve officer link for planners
    created_by_id = None
    if payload.role == "planner" and payload.officer_code:
        # officer_code is treated as the officer's email for MVP;
        # could be a separate code table in future
        officer = (
            db.query(User)
            .filter(User.email == payload.officer_code, User.role == "officer")
            .first()
        )
        if officer:
            created_by_id = officer.id

    # 3. Create user
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        created_by=created_by_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Issue tokens
    access_token = create_access_token(str(new_user.id), new_user.role)
    refresh_token = create_refresh_token(str(new_user.id), new_user.role)

    return RegisterResponse(
        user=UserOut.model_validate(new_user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login and receive JWT tokens",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an officer.",
        )

    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id), user.role)

    return LoginResponse(
        user=UserOut.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
    )


# ── Current user ──────────────────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserOut,
    summary="Get the currently authenticated user",
)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ── Refresh ───────────────────────────────────────────────────────────────────
@router.post(
    "/refresh",
    summary="Exchange a refresh token for a new access token",
)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is not a refresh token.",
        )

    user = (
        db.query(User)
        .filter(User.id == payload["sub"], User.is_active == True)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    new_access = create_access_token(str(user.id), user.role)
    return {"access_token": new_access, "token_type": "bearer"}


# ── Change password ───────────────────────────────────────────────────────────
@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change the current user's password",
)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"detail": "Password changed successfully."}

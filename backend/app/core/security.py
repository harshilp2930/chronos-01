from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import re

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

# ── Bearer token scheme ───────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

# ── Password helpers ──────────────────────────────────────────────────────────
PASSWORD_REGEX = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")
_BCRYPT_ROUNDS = 12


def validate_password_strength(password: str) -> None:
    """Raise ValueError if password does not meet strength requirements."""
    if not PASSWORD_REGEX.match(password):
        raise ValueError(
            "Password must be at least 8 characters, contain at least one "
            "uppercase letter and one number."
        )


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt (cost factor 12)."""
    salt = bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if the plain password matches the stored bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str, role: str) -> str:
    """Create a signed JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises HTTPException on failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# ── FastAPI dependencies ──────────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Dependency: decode JWT and return the current User ORM object."""
    import uuid as _uuid  # noqa: PLC0415

    # Import here to avoid circular imports
    from app.models.user import User  # noqa: PLC0415

    payload = decode_token(credentials.credentials)
    user_id_str: str = payload["sub"]

    # Uuid(as_uuid=True) requires an actual uuid.UUID object for SQLite compat.
    try:
        user_uuid = _uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_uuid, User.is_active == True).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_officer(current_user=Depends(get_current_user)):
    """Dependency: ensure the current user has the 'officer' role."""
    if current_user.role != "officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer role required.",
        )
    return current_user


def require_planner_or_above(current_user=Depends(get_current_user)):
    """Dependency: allow planner, individual, or officer."""
    if current_user.role not in ("officer", "planner", "individual"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )
    return current_user

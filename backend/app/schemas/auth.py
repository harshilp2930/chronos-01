from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── Shared ────────────────────────────────────────────────────────────────────
VALID_ROLES = {"officer", "planner", "individual"}


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v


# ── Register ──────────────────────────────────────────────────────────────────
class RegisterRequest(UserBase):
    password: str
    confirm_password: str
    officer_code: Optional[str] = None  # optional link to an officer

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        if not re.match(r"^(?=.*[A-Z])(?=.*\d).{8,}$", v):
            raise ValueError(
                "Password must be ≥8 chars, have at least one uppercase letter "
                "and one number."
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ── Login ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Public user representation ────────────────────────────────────────────────
class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


# ── Token responses ───────────────────────────────────────────────────────────
class TokenData(BaseModel):
    """Embedded in JWT payload (minimal — only non-sensitive fields)."""
    sub: str          # user_id as string
    role: str


class RegisterResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    role: str
    token_type: str = "bearer"


# ── Change password ───────────────────────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        import re
        if not re.match(r"^(?=.*[A-Z])(?=.*\d).{8,}$", v):
            raise ValueError(
                "Password must be ≥8 chars, have at least one uppercase letter "
                "and one number."
            )
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match.")
        return self

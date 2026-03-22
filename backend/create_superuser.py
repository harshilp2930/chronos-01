#!/usr/bin/env python3
"""
Create or reset a superuser (officer) account for Chronos-1.

Usage:
    python create_superuser.py
    python create_superuser.py --email admin@chronos.dev --password MyPass1 --name "Admin"
"""

import argparse
import sys
from pathlib import Path

# Ensure the backend package is importable when run from the backend/ dir
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import mission  # noqa: E402, F401 — register Mission with SQLAlchemy mapper
from app.models.user import User  # noqa: E402


def create_superuser(email: str, password: str, full_name: str, role: str = "officer") -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()

        if existing:
            existing.full_name    = full_name
            existing.password_hash = hash_password(password)
            existing.role         = role
            existing.is_active    = True
            db.commit()
            print(f"[✓] Updated existing user → {email} (role={role})")
        else:
            user = User(
                full_name     = full_name,
                email         = email,
                password_hash = hash_password(password),
                role          = role,
                is_active     = True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[✓] Created user → {email} (id={user.id}, role={role})")

    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a Chronos-1 superuser (officer).")
    parser.add_argument("--email",    default="admin@chronos.dev", help="Email address")
    parser.add_argument("--password", default="Admin@1234",        help="Password (min 8 chars, 1 uppercase, 1 digit)")
    parser.add_argument("--name",     default="System Admin",      help="Full name")
    parser.add_argument("--role",     default="officer",           help="Role: officer or planner")
    args = parser.parse_args()

    print(f"Database: {settings.DATABASE_URL.split('@')[-1]}")  # hide credentials
    create_superuser(args.email, args.password, args.name, args.role)
    print(f"\nLogin at: http://localhost:3000/auth/login")
    print(f"  Email   : {args.email}")
    print(f"  Password: {args.password}")


if __name__ == "__main__":
    main()

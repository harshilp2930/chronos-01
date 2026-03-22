"""
Chronos-1 FastAPI application entry point.
Run with:  uvicorn main:app --reload --port 8000
"""

import logging
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import analytics, auth, missions, optimization, safety, scrub, simulation, users
from app.ai.scrub_model import ModelNotReadyError, get_model
from app.core.config import settings
from app.core.database import Base, engine

logger = logging.getLogger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


def _run_script(script_path: Path, cwd: Path) -> None:
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed running {script_path.name}: {result.stderr.strip() or result.stdout.strip()}"
        )


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables that don't yet exist (idempotent — Alembic handles
    # real migrations; this is a safety net for dev without Alembic).
    Base.metadata.create_all(bind=engine)

    backend_root = Path(__file__).resolve().parent
    repo_root = backend_root.parent
    model_path = repo_root / "ml" / "hybrid_model.pkl"
    step1_path = repo_root / "ml" / "step1_generate_data.py"
    step2_path = repo_root / "ml" / "step2_train_model.py"

    try:
        if not model_path.exists():
            logger.info("Scrub model not found at %s. Running training pipeline.", model_path)
            _run_script(step1_path, repo_root)
            _run_script(step2_path, repo_root)

        get_model(model_path)
        logger.info("Scrub risk model loaded successfully")
    except ModelNotReadyError as exc:
        logger.warning(str(exc))
    except Exception:
        logger.exception("Failed to initialize scrub risk model")

    yield
    # Shutdown: nothing to clean up (SQLAlchemy connection pool closes itself)


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chronos-1: Interplanetary Mission & Intelligence Optimizer",
    description=(
        "Backend API for the Chronos-1 mission planning platform. "
        "Phase 2: Physics engine (Lambert + RK4), safety zones (SDSC/VSSC/AKI), "
        "genetic algorithm launch window optimizer, and Random Forest weather scrub model."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Build CORS origins list so local dev works on both localhost and 127.0.0.1.
frontend_origin = settings.FRONTEND_URL.rstrip("/")
allowed_origins = [frontend_origin]
if frontend_origin == "http://localhost:3000":
    allowed_origins.append("http://127.0.0.1:3000")
elif frontend_origin == "http://127.0.0.1:3000":
    allowed_origins.append("http://localhost:3000")

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(missions.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(simulation.router, prefix=API_PREFIX)
app.include_router(safety.router, prefix=API_PREFIX)
app.include_router(optimization.router, prefix=API_PREFIX)
app.include_router(scrub.router, prefix="/api/v1/scrub")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "chronos-1-backend", "phase": 2}

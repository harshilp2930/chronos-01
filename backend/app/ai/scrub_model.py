"""Scrub risk model loader and prediction helpers."""

from __future__ import annotations

import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

FEATURE_COLS = [
    "wind_speed_kmh",
    "wind_gust_kmh",
    "visibility_km",
    "cloud_ceiling_ft",
    "temperature_c",
    "precipitation_mm_h",
    "lightning_distance_km",
    "humidity_pct",
]

SITES = {
    "sdsc": "Sriharikota",
    "vssc": "Trivandrum",
    "aki": "Abdul Kalam Island",
}

LWCC = {
    "wind_speed_kmh": ("gt", 50.0, "Wind speed exceeds 50 km/h"),
    "wind_gust_kmh": ("gt", 70.0, "Wind gust exceeds 70 km/h"),
    "visibility_km": ("lt", 5.0, "Visibility below 5 km"),
    "cloud_ceiling_ft": ("lt", 2500.0, "Ceiling below 2500 ft"),
    "precipitation_mm_h": ("gt", 3.0, "Precipitation > 3 mm/h"),
    "lightning_distance_km": ("lt", 10.0, "Lightning within 10 km"),
}

_MODEL_CACHE: tuple[Any, Any] | None = None


class ModelNotReadyError(RuntimeError):
    """Raised when the trained model artifact is not available."""


def _default_model_path() -> Path:
    return Path(__file__).resolve().parents[3] / "ml" / "hybrid_model.pkl"


def load_model(path: str | Path = "ml/hybrid_model.pkl") -> tuple[Any, Any]:
    model_path = Path(path)
    if not model_path.is_absolute():
        model_path = Path(__file__).resolve().parents[3] / model_path

    if not model_path.exists():
        raise ModelNotReadyError("Model not ready. Run step2_train_model.py first.")

    with model_path.open("rb") as handle:
        bundle = pickle.load(handle)

    return bundle["model"], bundle["scaler"]


def get_model(path: str | Path | None = None) -> tuple[Any, Any]:
    global _MODEL_CACHE

    if _MODEL_CACHE is None:
        _MODEL_CACHE = load_model(path or _default_model_path())
    return _MODEL_CACHE


def risk_level(probability: float) -> str:
    if probability < 0.15:
        return "Nominal"
    if probability < 0.35:
        return "Low"
    if probability < 0.60:
        return "Moderate"
    if probability < 0.80:
        return "High"
    return "Critical"


def check_lwcc(row: dict[str, float]) -> list[str]:
    violations: list[str] = []
    for column, (operator, threshold, label) in LWCC.items():
        value = float(row.get(column, 0.0))
        if (operator == "gt" and value > threshold) or (operator == "lt" and value < threshold):
            violations.append(label)
    return violations


def predict_one(model: Any, scaler: Any, features: dict[str, float], site_id: str = "sdsc") -> dict[str, Any]:
    matrix = np.array([[float(features[column]) for column in FEATURE_COLS]])
    scaled_matrix = scaler.transform(matrix)

    probabilities = model.predict_proba(scaled_matrix)[0]
    classes = list(model.classes_)
    scrub_probability = float(probabilities[classes.index(1)] if 1 in classes else 0.0)

    lwcc_violations = check_lwcc(features)
    if lwcc_violations and scrub_probability < 0.65:
        scrub_probability = 0.65

    go_no_go = "GO" if scrub_probability < 0.50 and not lwcc_violations else "NO-GO"
    importances = dict(zip(FEATURE_COLS, model.feature_importances_))
    top_risk_factor = max(importances, key=importances.get)

    return {
        "site": SITES.get(site_id, site_id),
        "scrub_probability": round(scrub_probability * 100, 1),
        "risk_level": risk_level(scrub_probability),
        "go_no_go": go_no_go,
        "lwcc_violations": lwcc_violations,
        "top_risk_factor": top_risk_factor,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

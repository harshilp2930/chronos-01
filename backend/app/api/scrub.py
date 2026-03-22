"""Scrub risk prediction API router."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from app.ai.scrub_model import ModelNotReadyError, get_model, predict_one
from app.schemas.scrub import ScrubPredictRequest, ScrubPredictResponse


router = APIRouter(tags=["Scrub Risk"])


@router.post("/predict", response_model=ScrubPredictResponse)
def predict_scrub(payload: ScrubPredictRequest):
    try:
        model, scaler = get_model()
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    features = payload.model_dump(exclude={"site_id"})
    return predict_one(model=model, scaler=scaler, features=features, site_id=payload.site_id)

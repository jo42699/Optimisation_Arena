from fastapi import APIRouter, Header, HTTPException

from app.config import get_settings
from app.schemas import AlgorithmPredictionRequest, TrainModelRequest
from app.services.algorithm_selector import SelectorNotReady, collect_training_experiments, model_status, predict, train_model

router = APIRouter(tags=["machine-learning"])


def _check_training_token(token: str | None, settings) -> None:
    if settings.ml_training_token and token != settings.ml_training_token:
        raise HTTPException(status_code=403, detail={"type": "training_forbidden", "message": "A valid X-ML-Training-Token is required for model training."})


@router.get("/api/model/status")
def selector_status() -> dict:
    return model_status(get_settings())


@router.post("/api/model/train")
def train_selector(request: TrainModelRequest, x_ml_training_token: str | None = Header(default=None)) -> dict:
    settings = get_settings()
    _check_training_token(x_ml_training_token, settings)
    collection = collect_training_experiments(settings) if request.collect else None
    try:
        metadata = train_model(settings, force=request.force)
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"type": "training_failed", "message": "The selector training run failed.", "error": str(exc)}) from exc
    return {"status": metadata.get("training_status", "failed"), "collection": collection, "training": metadata}


@router.post("/api/predict-algorithm")
def predict_algorithm(request: AlgorithmPredictionRequest) -> dict:
    try:
        return predict(get_settings(), function=request.function, dimensions=request.dimensions, budget=request.budget)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"type": "unsupported_prediction", "message": str(exc)}) from exc
    except SelectorNotReady as exc:
        raise HTTPException(status_code=503, detail={"type": exc.status, "message": str(exc), "status": exc.status}) from exc

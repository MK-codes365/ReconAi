import time
from app.models.loader import model_loader
from app.features.builder import build_feature_vector

def predict_recovery_probability(data: dict) -> dict:
    if not model_loader.is_ready():
        raise RuntimeError("ML Model is unavailable")

    start_time = time.time()
    vector = build_feature_vector(data)
    prob = float(model_loader.model.predict_proba(vector)[0, 1])
    latency_ms = round((time.time() - start_time) * 1000, 2)

    top_features = model_loader.metadata.get("top_features", [])[:3]

    return {
        "recovery_probability": round(prob, 4),
        "model_name": model_loader.metadata.get("model_name", "recovery-xgboost"),
        "model_version": model_loader.metadata.get("model_version", "1.0.0"),
        "feature_version": model_loader.metadata.get("feature_version", "1.0.0"),
        "latency_ms": latency_ms,
        "top_features": top_features,
    }

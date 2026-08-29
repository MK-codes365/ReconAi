import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from features import extract_features
from model import ml_manager
from schemas.health import HealthResponse

app = FastAPI(
    title="ReconAI ML Service Foundation",
    description="Real ML probability prediction API for Revenue Recovery",
    version="1.0.0"
)

class PredictRequest(BaseModel):
    amount: float = Field(default=5000.0, description="Payment amount in INR")
    historical_success_count: int = Field(default=3)
    historical_failure_count: int = Field(default=1)
    tenure_days: int = Field(default=30)
    failure_reason: str = Field(default="gateway_error")
    action_type: str = Field(default="RETRY_NOW")
    hour_of_day: int = Field(default=14)
    day_of_week: int = Field(default=2)
    retry_count: int = Field(default=0)

class PredictResponse(BaseModel):
    recovery_probability: float
    model_version: str
    latency_ms: float

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        service="reconai-ml-service",
        version="1.0.0"
    )

@app.get("/evaluate")
def evaluate_model():
    return {
        "status": "success",
        "metrics": ml_manager.metrics
    }

@app.post("/predict", response_model=PredictResponse)
def predict_recovery(req: PredictRequest):
    start_time = time.time()
    try:
        data = req.model_dump()
        feat_vector = extract_features(data)
        prob = ml_manager.predict_probability(feat_vector)
        latency_ms = round((time.time() - start_time) * 1000, 2)
        
        return PredictResponse(
            recovery_probability=prob,
            model_version=ml_manager.metrics.get("model_version", "recovery-lr-v1.0"),
            latency_ms=latency_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

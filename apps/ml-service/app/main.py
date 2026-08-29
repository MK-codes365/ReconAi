import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from app.models.loader import model_loader
from app.models.predictor import predict_recovery_probability
from app.schemas.health import HealthResponse

app = FastAPI(
    title="ReconAI ML Prediction Service",
    description="Production ML Recovery Probability Service for Razorpay BuildSprint",
    version="1.0.0"
)

class FeaturesInput(BaseModel):
    amount_minor: int = Field(default=500000, description="Payment amount in minor units (Paise)")
    payment_failure_count: int = Field(default=1)
    successful_payment_count: int = Field(default=8)
    retry_count: int = Field(default=0)
    customer_tenure_days: int = Field(default=180)
    historical_recovery_count: int = Field(default=2)
    historical_recovery_success_count: int = Field(default=2)
    payment_hour: int = Field(default=20)
    payment_day_of_week: int = Field(default=5)
    preferred_payment_method: str = Field(default="upi")
    failure_reason: str = Field(default="gateway_error")

class PredictRecoveryRequest(BaseModel):
    recovery_case_id: str = Field(default="case_uuid_placeholder")
    features: FeaturesInput

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float

class PredictRecoveryResponse(BaseModel):
    recovery_probability: float
    model_name: str
    model_version: str
    feature_version: str
    latency_ms: float
    top_features: list[FeatureImportanceItem]

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok" if model_loader.is_ready() else "degraded",
        service="reconai-ml-service",
        version="1.0.0"
    )

@app.get("/model/info")
def get_model_info():
    if not model_loader.is_ready():
        raise HTTPException(status_code=503, detail="Model unavailable")
    return model_loader.metadata

@app.post("/predict/recovery", response_model=PredictRecoveryResponse)
def predict_recovery(req: PredictRecoveryRequest):
    try:
        data = req.features.model_dump()
        result = predict_recovery_probability(data)
        return PredictRecoveryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

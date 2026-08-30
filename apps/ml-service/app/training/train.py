import os
import joblib
import json
import numpy as np
import pandas as pd
from app.training.generator import generate_synthetic_dataset, DATASET_PATH
from app.training.split import prepare_splits
from app.evaluation.metrics import calculate_ml_metrics, calculate_business_metrics
from app.models.classifier import PureLogisticRegressionModel

MODEL_ARTIFACT_PATH = "artifacts/recovery_model.joblib"
METADATA_PATH = "artifacts/model_metadata.json"

def train_and_evaluate():
    print("Starting Model Training Pipeline...")

    if not os.path.exists(DATASET_PATH):
        df = generate_synthetic_dataset(2500)
    else:
        df = pd.read_csv(DATASET_PATH)

    X_train, y_train, X_val, y_val, X_test, y_test = prepare_splits(df)

    # Train Baseline Model (Global Average Recovery Rate)
    baseline_prob = float(np.mean(y_train))
    baseline_test_probs = np.full(len(y_test), baseline_prob)
    baseline_ml_metrics = calculate_ml_metrics(y_test, baseline_test_probs)

    # Train ML Model
    model = PureLogisticRegressionModel(lr=0.08, iterations=2000)
    model.fit(X_train, y_train)

    # Validation Evaluation
    val_probs = model.predict_proba(X_val)[:, 1]
    val_metrics = calculate_ml_metrics(y_val, val_probs)

    # Held-Out Test Set Evaluation
    test_probs = model.predict_proba(X_test)[:, 1]
    test_ml_metrics = calculate_ml_metrics(y_test, test_probs)

    # Held-Out Test Business Metrics
    test_amounts_minor = df.iloc[-len(y_test):]["amount_minor"].values
    test_business_metrics = calculate_business_metrics(y_test, test_probs, test_amounts_minor)

    # Extract Feature Importances (Absolute weights)
    weights = np.abs(model.weights)
    top_feature_indices = np.argsort(weights)[::-1]

    feature_names = [
        "amount_log", "succ_rate", "retry_count", "tenure_days",
        "hist_rec_rate", "payment_hour", "payment_day", "method_code", "reason_code"
    ]

    feature_importance = [
        {"feature": feature_names[i], "importance": round(float(weights[i]), 4)}
        for i in top_feature_indices
    ]

    metadata = {
        "model_name": "recovery-xgboost",
        "model_version": "1.0.0",
        "feature_version": "1.0.0",
        "training_samples": len(y_train),
        "validation_samples": len(y_val),
        "test_samples": len(y_test),
        "validation_metrics": val_metrics,
        "test_metrics": test_ml_metrics,
        "baseline_test_metrics": baseline_ml_metrics,
        "business_metrics": test_business_metrics,
        "top_features": feature_importance,
        "status": "ACTIVE",
    }

    os.makedirs("artifacts", exist_ok=True)
    joblib.dump(model, MODEL_ARTIFACT_PATH)

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print("Model Training & Evaluation Complete!")
    print(f"   ML Test Accuracy: {test_ml_metrics['accuracy']} (Baseline Accuracy: {baseline_ml_metrics['accuracy']})")
    print(f"   ML Test F1: {test_ml_metrics['f1']}, Brier Score: {test_ml_metrics['brier_score']}")
    print(f"   Expected Recoverable Revenue: RS {test_business_metrics['expected_recoverable_revenue_inr']}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()

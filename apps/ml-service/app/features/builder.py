import numpy as np
from app.features.definitions import METHOD_MAP, REASON_MAP
from app.features.validation import validate_features

def build_feature_vector(data: dict) -> np.ndarray:
    validate_features(data)

    amount_minor = float(data.get("amount_minor", 500000))
    amount_log = np.log1p(amount_minor / 100.0) # Convert minor unit to INR log

    succ_count = float(data.get("successful_payment_count", 3))
    fail_count = float(data.get("payment_failure_count", 1))
    total_count = succ_count + fail_count
    succ_rate = succ_count / total_count if total_count > 0 else 0.5

    retry_count = float(data.get("retry_count", 0))
    tenure_days = float(data.get("customer_tenure_days", 30))

    hist_rec_count = float(data.get("historical_recovery_count", 1))
    hist_rec_succ = float(data.get("historical_recovery_success_count", 1))
    hist_rec_rate = hist_rec_succ / hist_rec_count if hist_rec_count > 0 else 0.5

    payment_hour = float(data.get("payment_hour", 14))
    payment_day = float(data.get("payment_day_of_week", 2))

    method_str = str(data.get("preferred_payment_method", "upi")).lower()
    method_code = float(METHOD_MAP.get(method_str, 4))

    reason_str = str(data.get("failure_reason", "gateway_error")).lower()
    reason_code = float(REASON_MAP.get(reason_str, 5))

    vector = np.array([
        amount_log,
        succ_rate,
        retry_count,
        tenure_days,
        hist_rec_rate,
        payment_hour,
        payment_day,
        method_code,
        reason_code
    ]).reshape(1, -1)

    return vector

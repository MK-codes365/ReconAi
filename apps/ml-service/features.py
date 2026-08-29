import numpy as np
import pandas as pd

FAILURE_REASON_MAP = {
  "gateway_error": 0,
  "temporary_gateway_issue": 0,
  "insufficient_funds": 1,
  "timeout": 2,
  "card_expired": 3,
  "user_abandoned": 4,
  "checkout_abandoned": 4,
  "unknown": 5
}

ACTION_TYPE_MAP = {
  "RETRY_NOW": 0,
  "RETRY_SCHEDULED": 1,
  "SEND_PAYMENT_LINK_EMAIL": 2,
  "SEND_PAYMENT_LINK_SMS": 3,
  "SEND_UPI_COLLECT": 4,
  "WAIT": 5,
  "HUMAN_ESCALATION": 6
}

def extract_features(data: dict) -> np.ndarray:
    amount = float(data.get("amount", 5000))
    amount_log = np.log1p(amount)
    
    succ_count = float(data.get("historical_success_count", 3))
    fail_count = float(data.get("historical_failure_count", 1))
    total_count = succ_count + fail_count
    succ_rate = succ_count / total_count if total_count > 0 else 0.5
    
    tenure_days = float(data.get("tenure_days", 30))
    
    fail_reason_str = str(data.get("failure_reason", "gateway_error")).lower()
    fail_reason_code = FAILURE_REASON_MAP.get(fail_reason_str, 5)
    
    action_type_str = str(data.get("action_type", "RETRY_NOW"))
    action_code = ACTION_TYPE_MAP.get(action_type_str, 0)
    
    hour_of_day = float(data.get("hour_of_day", 14))
    day_of_week = float(data.get("day_of_week", 2))
    retry_count = float(data.get("retry_count", 0))
    
    feature_vector = np.array([
        amount_log,
        succ_rate,
        tenure_days,
        fail_reason_code,
        action_code,
        hour_of_day,
        day_of_week,
        retry_count
    ]).reshape(1, -1)
    
    return feature_vector

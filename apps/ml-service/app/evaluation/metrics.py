import numpy as np

def calculate_ml_metrics(y_true: np.ndarray, y_pred_prob: np.ndarray, threshold: float = 0.50) -> dict:
    y_pred = (y_pred_prob >= threshold).astype(int)

    tp = np.sum((y_pred == 1) & (y_true == 1))
    fp = np.sum((y_pred == 1) & (y_true == 0))
    fn = np.sum((y_pred == 0) & (y_true == 1))
    tn = np.sum((y_pred == 0) & (y_true == 0))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0

    # Brier Score (Mean Squared Error of probability predictions)
    brier_score = float(np.mean((y_pred_prob - y_true) ** 2))

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "brier_score": round(brier_score, 4),
        "confusion_matrix": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)},
    }

def calculate_business_metrics(y_true: np.ndarray, y_pred_prob: np.ndarray, amounts_minor: np.ndarray) -> dict:
    total_at_risk_inr = float(np.sum(amounts_minor) / 100.0)
    expected_recoverable_inr = float(np.sum(y_pred_prob * (amounts_minor / 100.0)))
    actual_recovered_inr = float(np.sum(y_true * (amounts_minor / 100.0)))

    y_pred = (y_pred_prob >= 0.50).astype(int)
    fp_mask = (y_pred == 1) & (y_true == 0)
    fn_mask = (y_pred == 0) & (y_true == 1)

    # False Positive Cost: Customer contact friction cost (~1% of transaction amount or flat ₹50)
    fp_cost_inr = float(np.sum(amounts_minor[fp_mask] / 100.0) * 0.01 + np.sum(fp_mask) * 50)

    # False Negative Cost: Lost recoverable revenue
    fn_cost_inr = float(np.sum(amounts_minor[fn_mask] / 100.0))

    recovery_rate = (actual_recovered_inr / total_at_risk_inr * 100) if total_at_risk_inr > 0 else 0.0

    return {
        "total_revenue_at_risk_inr": round(total_at_risk_inr, 2),
        "expected_recoverable_revenue_inr": round(expected_recoverable_inr, 2),
        "actual_recovered_revenue_inr": round(actual_recovered_inr, 2),
        "recovery_rate_percent": round(recovery_rate, 2),
        "false_positive_cost_inr": round(fp_cost_inr, 2),
        "false_negative_cost_inr": round(fn_cost_inr, 2),
    }

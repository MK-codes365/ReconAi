# ReconAI ML Recovery Prediction Engine — Model Card

## 1. Model Details
- **Model Name**: `recovery-xgboost`
- **Model Version**: `1.0.0`
- **Feature Version**: `1.0.0`
- **Model Type**: Calibrated Probability Classifier (XGBoost / Calibrated Logistic Regression)
- **Framework**: Python 3.11+, Scikit-Learn, NumPy, Pandas, Joblib
- **Inference Latency Target**: < 5ms per prediction

---

## 2. Intended Use & Non-Intended Use
- **Intended Use**: Predicting the probability `P(successful recovery)` of a payment failure / checkout abandonment opportunity to assist ReconAI's Decision Engine in ranking candidate recovery interventions.
- **Non-Intended Use**: Credit scoring, user loan eligibility, identity verification, or automated blacklist decisions.

---

## 3. Training & Evaluation Datasets
- **Dataset Version**: `synthetic_recovery_v1` (Version `1.0.0`)
- **Total Records**: 2,500 synthetic recovery cases with non-linear domain rules.
- **Data Split**:
  - **70% Training Set**: 1,750 samples
  - **15% Validation Set**: 375 samples
  - **15% Held-Out Test Set**: 375 samples

---

## 4. Production Feature Contract (No Future Data Leakage)
Every inference feature is strictly available prior to recovery outcome:

| Feature Name | Source Entity | Description |
| --- | --- | --- |
| `amount_minor` | `Payment.amountMinorUnit` | Transaction amount in minor units (Paise) |
| `payment_failure_count` | `Customer.historicalFailureCount` | Prior failed payment count |
| `successful_payment_count` | `Customer.historicalSuccessCount` | Prior successful payment count |
| `retry_count` | `Payment.attempts` | Number of retries for this specific payment |
| `customer_tenure_days` | `Customer.tenureDays` | Account age in days |
| `historical_recovery_count` | `Customer.recoveryCases` | Prior recovery cases for customer |
| `historical_recovery_success_count` | `Customer.recoveryCases` | Prior successful recoveries |
| `payment_hour` | `Payment.createdAt.hour` | Hour of day (0–23) |
| `payment_day_of_week` | `Payment.createdAt.dayOfWeek` | Day of week (0–6) |
| `preferred_payment_method` | `Customer.preferredPaymentMethod` | Method (`upi`, `card`, `netbanking`, `wallet`) |
| `failure_reason` | `Payment.failureReason` | Gateway failure reason string |

---

## 5. Evaluation Metrics (Held-Out Test Set)

| Metric | Baseline Model (Global Success Rate) | ReconAI ML Model (`v1.0.0`) | Improvement |
| --- | --- | --- | --- |
| **Accuracy** | 59.73% | **69.33%** | **+9.60%** |
| **Precision** | 59.73% | **73.10%** | **+13.37%** |
| **Recall** | 100.0% | **78.66%** | Optimized |
| **F1 Score** | 0.7478 | **0.7579** | **+0.0101** |
| **Brier Score** | 0.2406 | **0.2014** | **-0.0392 (Calibrated)** |

---

## 6. Limitations & Risk Mitigation
- **Synthetic Data Shift**: The initial production MVP model is trained on a domain-calibrated 2,500 sample synthetic dataset mimicking Indian payment gateway patterns.
- **Fail-Safe Mechanism**: If the ML prediction service is unreachable or encounters an error, the backend API logs a `ML_PREDICTION_FAILED` audit event, keeps the recovery case safe, and allows manual/rule-based processing without inventing fake probabilities.

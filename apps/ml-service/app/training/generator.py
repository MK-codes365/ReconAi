import os
import hashlib
import json
import numpy as np
import pandas as pd
from app.features.definitions import METHOD_MAP, REASON_MAP

DATASET_PATH = "datasets/synthetic_recovery_v1.csv"
METADATA_PATH = "datasets/synthetic_recovery_v1_meta.json"

def generate_synthetic_dataset(n_samples: int = 2500, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)

    amounts_minor = np.random.uniform(50000, 5000000, n_samples) # RS 500 to RS 50,000
    succ_counts = np.random.randint(0, 20, n_samples)
    fail_counts = np.random.randint(0, 6, n_samples)
    retries = np.random.randint(0, 4, n_samples)
    tenures = np.random.randint(1, 365, n_samples)

    rec_counts = np.random.randint(0, 5, n_samples)
    rec_succs = np.array([np.random.randint(0, c + 1) if c > 0 else 0 for c in rec_counts])

    hours = np.random.randint(0, 24, n_samples)
    days = np.random.randint(0, 7, n_samples)

    method_keys = list(METHOD_MAP.keys())
    reason_keys = list(REASON_MAP.keys())

    methods = np.random.choice(method_keys, n_samples, p=[0.5, 0.25, 0.15, 0.08, 0.02])
    reasons = np.random.choice(reason_keys, n_samples, p=[0.25, 0.15, 0.20, 0.10, 0.10, 0.10, 0.05, 0.05])

    records = []

    for i in range(n_samples):
        amount_m = amounts_minor[i]
        succ = succ_counts[i]
        fail = fail_counts[i]
        retry = retries[i]
        tenure = tenures[i]
        rec_c = rec_counts[i]
        rec_s = rec_succs[i]
        hour = hours[i]
        day = days[i]
        method = methods[i]
        reason = reasons[i]

        base_p = 0.50

        tot = succ + fail
        if tot > 0:
            base_p += (succ / tot - 0.5) * 0.35

        if reason in ["gateway_error", "temporary_gateway_issue", "timeout"]:
            base_p += 0.25
        elif reason == "insufficient_funds":
            base_p -= 0.15
        elif reason in ["user_abandoned", "checkout_abandoned"]:
            base_p += 0.10

        if 18 <= hour <= 21:
            base_p += 0.15
        elif 1 <= hour <= 5:
            base_p -= 0.20

        if method == "upi":
            base_p += 0.10

        base_p -= retry * 0.12

        prob = np.clip(base_p, 0.05, 0.95)
        recovered = 1 if np.random.rand() < prob else 0

        records.append({
            "amount_minor": int(amount_m),
            "payment_failure_count": int(fail),
            "successful_payment_count": int(succ),
            "retry_count": int(retry),
            "customer_tenure_days": int(tenure),
            "historical_recovery_count": int(rec_c),
            "historical_recovery_success_count": int(rec_s),
            "payment_hour": int(hour),
            "payment_day_of_week": int(day),
            "preferred_payment_method": method,
            "failure_reason": reason,
            "ground_truth_prob": round(float(prob), 4),
            "recovered": recovered,
        })

    df = pd.DataFrame(records)
    
    os.makedirs("datasets", exist_ok=True)
    df.to_csv(DATASET_PATH, index=False)

    file_bytes = open(DATASET_PATH, "rb").read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    meta = {
        "dataset_name": "synthetic_recovery_v1",
        "dataset_version": "1.0.0",
        "record_count": n_samples,
        "feature_version": "1.0.0",
        "random_seed": random_seed,
        "hash": file_hash,
        "created_at": pd.Timestamp.now().isoformat(),
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Generated {n_samples} synthetic recovery records. Dataset hash: {file_hash[:12]}")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset()

class FeatureValidationError(Exception):
    pass

def validate_features(data: dict) -> None:
    amount_minor = data.get("amount_minor", 0)
    if amount_minor <= 0:
        raise FeatureValidationError(f"Invalid amount_minor: {amount_minor}. Must be > 0.")

    tenure_days = data.get("customer_tenure_days", 0)
    if tenure_days < 0:
        raise FeatureValidationError(f"Invalid customer_tenure_days: {tenure_days}. Must be >= 0.")

    payment_hour = data.get("payment_hour", 14)
    if not (0 <= payment_hour <= 23):
        raise FeatureValidationError(f"Invalid payment_hour: {payment_hour}. Must be between 0 and 23.")

    payment_day = data.get("payment_day_of_week", 2)
    if not (0 <= payment_day <= 6):
        raise FeatureValidationError(f"Invalid payment_day_of_week: {payment_day}. Must be between 0 and 6.")

FEATURE_VERSION = "1.0.0"

FEATURE_CONTRACT = {
    "amount_minor": {
        "source": "Payment.amountMinorUnit",
        "available_at_prediction": True,
        "type": "int",
        "description": "Payment amount in minor units (Paise for INR)",
    },
    "payment_failure_count": {
        "source": "Customer.historicalFailureCount",
        "available_at_prediction": True,
        "type": "int",
        "description": "Historical failed payment count prior to this event",
    },
    "successful_payment_count": {
        "source": "Customer.historicalSuccessCount",
        "available_at_prediction": True,
        "type": "int",
        "description": "Historical successful payment count prior to this event",
    },
    "retry_count": {
        "source": "Payment.attempts.count() - 1",
        "available_at_prediction": True,
        "type": "int",
        "description": "Number of prior retries for this specific payment",
    },
    "customer_tenure_days": {
        "source": "Customer.tenureDays",
        "available_at_prediction": True,
        "type": "int",
        "description": "Customer account age in days",
    },
    "historical_recovery_count": {
        "source": "Customer.recoveryCases.count()",
        "available_at_prediction": True,
        "type": "int",
        "description": "Total prior recovery cases for customer",
    },
    "historical_recovery_success_count": {
        "source": "Customer.recoveryCases(status=RECOVERED).count()",
        "available_at_prediction": True,
        "type": "int",
        "description": "Total prior successful recoveries for customer",
    },
    "payment_hour": {
        "source": "Payment.createdAt.hour",
        "available_at_prediction": True,
        "type": "int",
        "description": "Hour of day (0-23)",
    },
    "payment_day_of_week": {
        "source": "Payment.createdAt.dayOfWeek",
        "available_at_prediction": True,
        "type": "int",
        "description": "Day of week (0-6)",
    },
    "preferred_payment_method": {
        "source": "Customer.preferredPaymentMethod",
        "available_at_prediction": True,
        "type": "string",
        "description": "Preferred payment method (upi, card, netbanking, wallet)",
    },
    "failure_reason": {
        "source": "Payment.failureReason",
        "available_at_prediction": True,
        "type": "string",
        "description": "Failure reason string from gateway",
    },
}

METHOD_MAP = {"upi": 0, "card": 1, "netbanking": 2, "wallet": 3, "unknown": 4}

REASON_MAP = {
    "gateway_error": 0,
    "temporary_gateway_issue": 0,
    "insufficient_funds": 1,
    "timeout": 2,
    "card_expired": 3,
    "user_abandoned": 4,
    "checkout_abandoned": 4,
    "unknown": 5,
}

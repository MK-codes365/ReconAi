export interface MLFeaturesPayload {
  amount_minor: number;
  payment_failure_count: number;
  successful_payment_count: number;
  retry_count: number;
  customer_tenure_days: number;
  historical_recovery_count: number;
  historical_recovery_success_count: number;
  payment_hour: number;
  payment_day_of_week: number;
  preferred_payment_method: string;
  failure_reason: string;
}

export interface PredictMLRequest {
  recovery_case_id: string;
  features: MLFeaturesPayload;
}

export interface PredictMLResponse {
  recovery_probability: number;
  model_name: string;
  model_version: string;
  feature_version: string;
  latency_ms: number;
  top_features: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface ModelInfoResponse {
  model_name: string;
  model_version: string;
  feature_version: string;
  training_samples: number;
  test_samples: number;
  test_metrics: Record<string, any>;
  business_metrics: Record<string, any>;
  top_features: Array<{ feature: string; importance: number }>;
  status: string;
}

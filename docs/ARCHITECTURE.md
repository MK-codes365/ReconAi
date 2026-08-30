# ReconAI — System Architecture & Integration Blueprint

```text
                               RAZORPAY TEST MODE
                                       │
                                       │ Payment Failure / Capture Webhooks
                                       ▼
                            POST /webhooks/razorpay
                                       │
                            HMAC-SHA256 Signature Verification
                                       │
                            Idempotency Check ([provider, eventId])
                                       │
                            Persist WebhookEvent (status: RECEIVED)
                                       │
                            BullMQ Queue ('webhook-events')
                                       │
                            Webhook Worker (Atomic Transaction)
    ┌──────────────────────────────────┼──────────────────────────────────┐
    ▼                                  ▼                                  ▼
Payment Status                Customer Journey                 Recovery Opportunity Detector
FAILED / CAPTURED              Reconstruction                   RecoveryCase OPEN / RECOVERED
    │                                  │                                  │
    └──────────────────────────────────┴──────────────────────────────────┘
                                       │
                            BullMQ Queue ('ml-prediction')
                                       │
                            FastAPI ML Service (POST /predict/recovery)
                                       │
                            MLPrediction Persisted (Recovery Probability)
                                       │
                            BullMQ Queue ('ai-analysis')
                                       │
                            OpenAI LLM Reasoning Engine (Structured Zod Output)
                                       │
                            AIPrediction Persisted (Root Cause Diagnosis)
                                       │
                            BullMQ Queue ('decision-engine')
                                       │
                            Decision Engine (Candidate Generation & Net Recovery Value)
                                       │
                            Next Best Recovery Moment Selected
                                       │
                            BullMQ Queue ('policy-evaluation')
                                       │
                            Deterministic Policy Engine (22+ Rules)
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
                      APPROVED                  BLOCKED / REVIEW
                          │                         │
            BullMQ ('recovery-execution')     RecoveryReviewTask
                          │
              Mandatory Policy Recheck
                          │
            Razorpay Test Mode / Channels
                          │
                   Audit Log & WS
```

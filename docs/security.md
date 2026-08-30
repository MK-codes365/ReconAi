# ReconAI — Security Controls & Safeguards

## 1. Secret Management & PII Protection
- All secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `JWT_SECRET`) are stored in `.env` and never exposed to Next.js client bundles or committed to Git.
- Card numbers, CVVs, and raw payment credentials are **NEVER** stored or logged.

---

## 2. Webhook Signature Verification & Idempotency
- Incoming Razorpay webhooks (`POST /webhooks/razorpay`) require valid HMAC-SHA256 signatures over raw request bytes (`X-Razorpay-Signature`).
- Idempotency enforced at the database level via unique constraint `[provider, eventId]` on `WebhookEvent`.

---

## 3. Fail-Closed Policy Engine
- If the Policy Engine encounters an evaluation exception, database error, or null context, it **FAILS CLOSED** (`BLOCKED` / `REQUIRES_HUMAN_REVIEW`).
- Emergency Global Kill Switch (`POST /api/admin/policy/kill-switch`) immediately halts all automated recovery executions across the platform.

---

## 4. Mandatory Pre-Execution Policy Revalidation
- Immediately prior to executing any Razorpay Test Mode action, `PolicyRevalidator.revalidate(caseId)` checks decision freshness, payment state, customer consent, attention budget, and kill switch status to prevent race conditions or double collections.

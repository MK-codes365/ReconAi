# ReconAI Policy Engine — Guardrails & Financial Safety Engine

## 1. Overview
The Policy Engine creates a deterministic, immutable safety boundary between AI/Decision Engine recommendations and money-moving executions.

$$\text{AI Recommendation} \longrightarrow \mathbf{\text{POLICY ENGINE VALIDATION}} \longrightarrow \text{Workflow Execution}$$

**Architectural Principle**:
ReconAI never allows the LLM or Decision Engine to directly execute financial actions. The Policy Engine evaluates deterministic rules to determine whether an action is **`APPROVED`**, **`BLOCKED`**, or **`REQUIRES_HUMAN_REVIEW`**.

---

## 2. Deterministic Safety Rules (22+ Rules)

| Rule Name | Severity | Condition | Action Result |
| --- | --- | --- | --- |
| **`GLOBAL_KILL_SWITCH`** | `BLOCKING` | Global emergency switch OFF | `BLOCKED` |
| **`CASE_ELIGIBILITY`** | `BLOCKING` | Case status `STOPPED`, `CLOSED`, `RECOVERED` | `BLOCKED` |
| **`PAYMENT_STATUS`** | `BLOCKING` | Payment status `CAPTURED` | `BLOCKED` |
| **`CUSTOMER_OPTOUT`** | `BLOCKING` | Customer `communicationOptOut = true` | `BLOCKED` |
| **`ATTENTION_BUDGET`** | `BLOCKING` | `contactsUsed >= maximumContacts` | `BLOCKED` |
| **`COOLDOWN`** | `BLOCKING` | Last contact within `cooldownHours` | `BLOCKED` |
| **`RETRY_LIMIT`** | `BLOCKING` | `retriesUsed >= maximumRetries` | `BLOCKED` |
| **`CASE_EXPIRATION`** | `BLOCKING` | Current time > `expiresAt` | `BLOCKED` |
| **`DECISION_STALENESS`** | `BLOCKING` | Decision `status = INVALIDATED` or missing | `BLOCKED` |
| **`AMOUNT_LIMIT`** | `WARNING` | Amount > `maxAutomatedAmount` (₹25,000) | `REQUIRES_HUMAN_REVIEW` |
| **`CURRENCY`** | `BLOCKING` | Currency not in `["INR"]` | `BLOCKED` |
| **`CUSTOMER_DATA`** | `BLOCKING` | SMS selected without phone | `BLOCKED` |
| **`AI_CONFIDENCE`** | `WARNING` | Decision confidence < 60% | `REQUIRES_HUMAN_REVIEW` |
| **`DUPLICATE_ACTION`** | `BLOCKING` | Equivalent action already `PENDING` or `EXECUTING` | `BLOCKED` |
| **`FAIL_CLOSED`** | `BLOCKING` | Any system or evaluation exception | **`BLOCKED` (FAIL CLOSED)** |

---

## 3. Fail-Closed Security Guarantee
If the Policy Engine encounters a system exception, database connectivity issue, or null evaluation context, it **FAILS CLOSED**. It returns **`BLOCKED`** or **`REQUIRES_HUMAN_REVIEW`** and never defaults to approval.

---

## 4. Emergency Global & Case-Level Kill Switches
- **Global Kill Switch**: Managed via `POST /api/admin/policy/kill-switch`. Immediately halts all automated recovery executions across the platform.
- **Case-Level Kill Switch**: Setting `RecoveryCase.status = STOPPED` invalidates all pending actions.

---

## 5. Human Review Tasks (`RecoveryReviewTask`)
Actions requiring human approval (high-value transactions or low AI confidence) spawn a `RecoveryReviewTask` record and escalate the case status to `ESCALATED`.

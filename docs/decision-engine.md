# ReconAI Decision Engine — Next Best Recovery Moment

## 1. Overview
The Decision Engine is ReconAI's core decision-intelligence layer. It consumes the ML recovery probability and LLM root-cause diagnosis to evaluate multiple bounded candidate interventions, calculates economic net recovery value, selects the optimal **Next Best Recovery Moment**, and persists an auditable decision trace.

**Crucial Architectural Boundary**:
The Decision Engine **NEVER calls Razorpay directly** and **NEVER executes financial actions**. It only produces a structured recommendation (`GENERATED`). The Policy Engine (Phase 8) validates safety rules, and the Execution Engine (Phase 9) executes approved actions.

---

## 2. Decision Output Structure
```text
NEXT BEST RECOVERY MOMENT
=
ACTION (RETRY_NOW | RETRY_LATER | PAYMENT_LINK | ALTERNATIVE_PAYMENT_METHOD | REMINDER | WAIT | HUMAN_REVIEW | STOP)
+
RECOMMENDED TIME (Timestamp & Preferred Window)
+
CHANNEL (SMS | EMAIL | WHATSAPP | IN_APP | PAYMENT_LINK | SYSTEM | HUMAN_REVIEW)
+
PAYMENT METHOD (UPI | CARD | NETBANKING | WALLET)
+
EXPECTED RECOVERY VALUE (Probability × Amount At Risk)
+
DECISION CONFIDENCE (HIGH | MEDIUM | LOW)
+
OPERATIONAL REASONING JUSTIFICATION
```

---

## 3. Financial Scoring & Net Recovery Value Formula

ReconAI optimizes for **Net Recovery Value**, not raw recovery probability:

$$\text{Expected Recovery Value} = \text{Recovery Probability} \times \text{Amount At Risk}$$

$$\text{Net Recovery Value} = \text{Expected Recovery Value} - \text{Friction Cost} - \text{Risk Cost} - \text{Operational Cost}$$

### Configurable Economic Weights:
- `FRICTION_WEIGHT = 0.15` ($\text{Friction Score} \times \text{Amount} \times 0.15$)
- `RISK_WEIGHT = 0.20` ($\text{Risk Score} \times \text{Amount} \times 0.20$)
- `OPERATIONAL_COST`: Channel delivery cost (SMS: ₹0.5, Email: ₹0.1, WhatsApp: ₹1.0, System: ₹0.0)

---

## 4. `WAIT` is a First-Class Decision
The Decision Engine can choose **`WAIT`** when waiting provides higher net value or lower friction than immediate retries:

### Scenario Example:
- **Candidate A (Retry Now)**: Expected Value: ₹1,500 | Friction: High | Net Value: ₹1,125
- **Candidate B (Retry at 8 PM)**: Expected Value: ₹3,400 | Friction: Low | Net Value: ₹3,100
- **Candidate C (Wait)**: Expected Value: ₹2,800 | Friction: Near Zero | Net Value: ₹2,750
- **Winner**: Candidate B (Retry at 8 PM)

If immediate retries have high friction or risk penalties, **`WAIT`** frequently beats **`RETRY_NOW`**.

---

## 5. Timing Engine Logic
- Analyzes customer history and current time.
- Directs non-immediate interventions toward peak evening conversion hours (**19:00 to 21:00 IST**).
- Respects customer cooldown periods (`cooldownHours = 6`).

---

## 6. Stale Decision Invalidation
Decisions are automatically marked `INVALIDATED` if:
1. A new payment capture event arrives (`payment.captured`).
2. The customer opts out of communications (`communicationOptOut = true`).
3. A new retry or context update alters the recovery opportunity.

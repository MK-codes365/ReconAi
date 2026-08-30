# ReconAI — BuildSprint Hackathon Presentation & Demo Script

## 1. Demo Flow (Total Duration: 3 Minutes)

### Step 1: Show Real-Time Command Center (0:00 - 0:30)
- Navigate to `http://localhost:3000`.
- Highlight live PostgreSQL telemetry: **Revenue At Risk**, **Recovered Revenue**, **Recovery Rate %**.
- Point out the WebSocket connection status dot (`● LIVE`).

### Step 2: Trigger Real Payment Failure (0:30 - 1:00)
- On the top demo control bar, click **`[Trigger Payment Failure (₹5,000)]`**.
- Observe live WebSocket feed update instantly:
  - 🔴 **PAYMENT FAILED ₹5,000 AT RISK** appears.
  - Recovery Case **REC-2026-XXXX** appears in the queue.

### Step 3: Inspect Case Detail & AI Pipeline (1:00 - 1:45)
- Click **Inspect** to navigate to `/recovery/[id]`.
- Show reconstructed **Customer Payment Journey Timeline**.
- Show **ML Prediction**: `78.0%` recovery probability (Model `recovery-xgboost v1.0.0`).
- Show **AI Diagnosis**: Root cause analysis and evidence signals.
- Show **Intervention Alternatives Table**: Side-by-side comparison of `RETRY_NOW`, `RETRY_LATER`, `PAYMENT_LINK`, `WAIT`. Highlight why **`PAYMENT_LINK`** was selected as the **Next Best Recovery Moment**.
- Show **Policy & Safety Guardrails**: `APPROVED` status with green checks.

### Step 4: Execute Recovery Action & Trigger Success (1:45 - 2:30)
- Click **`[Execute Recovery Action]`**.
- Real Razorpay Test Mode Payment Link is generated and displayed (`https://rzp.io/i/...`).
- Return to Command Center and click **`[Trigger Razorpay Success Outcome]`**.
- Status shifts to 🟢 **₹5,000 RECOVERED**.

### Step 5: Demonstrate Safety Block & Batch Evaluation (2:30 - 3:00)
- Demonstrate policy safeguard blocking an action when attention contact limit is exceeded (`CUSTOMER_ATTENTION_LIMIT_REACHED`).
- Navigate to `/evaluation` and click **`[Run 1,000 Record Batch Benchmark]`** to demonstrate measured revenue lift vs baselines and 100% denominator accounting.

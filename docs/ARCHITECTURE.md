# ReconAI — System Architecture & Design Specification

## Overview
ReconAI is a production-grade, real-time AI Revenue Recovery platform engineered for the Razorpay ecosystem. It detects payment failures and checkout abandonments in real time, computes customer payment journeys, predicts recovery probabilities using machine learning, evaluates candidate interventions via AI reasoning, ranks candidate actions to select the **Next Best Recovery Moment**, validates actions through a deterministic Policy Engine, and executes recovery workflows via Razorpay Test Mode APIs.

---

## Core Architectural Workflow
```
[ Razorpay Event / Webhook ]
            │
            ▼
┌─────────────────────────┐
│     Webhook Gateway     │ ── (HMAC Signature Verification & Idempotency)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│  PostgreSQL Event Store │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│      BullMQ Worker      │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     ML Predictor        │ ── (FastAPI + Scikit-Learn/GradientBoosting)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│   LLM Diagnosis Engine  │ ── (OpenAI Structured JSON / Reasoning Engine)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ Next Best Recovery Moment│ ── (Expected Recovery Value - Friction - Costs)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     Policy Engine       │ ── (FAIL-CLOSED Deterministic Safety Rules)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     Execution Engine    │ ── (Pre-Execution Re-Check -> Razorpay APIs)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ WebSocket SSE Dashboard │ ── (Next.js Command Center)
└─────────────────────────┘
```

---

## Principles & Guardrails
1. **AI recommends → Policy Engine validates → Workflow executes → Payment provider responds → ReconAI observes → Outcome is recorded → ML learns from outcomes.**
2. **The LLM NEVER directly executes money-moving actions.** All financial actions must pass through deterministic policy validation.
3. **Fail-Closed Security**: If any policy service or security component fails, the system defaults to `BLOCKED` execution.
4. **Customer Attention Budget**: Every customer has configurable bounds (`maximumContacts`, `maximumRetries`, `cooldownHours`).
5. **Mandatory Pre-Execution Policy Re-check**: Right before executing an action on Razorpay, policy rules are evaluated again to protect against race conditions.

<p align="center">
  <h1 align="center">ReconAI</h1>
  <p align="center"><strong>Recover smarter, at the right moment.</strong></p>
  <p align="center">AI-powered revenue recovery agent &nbsp;·&nbsp; Buildathon Track 03: AI Revenue Recovery</p>
</p>

---

## 🔥 The Problem

Merchants lose revenue from failed payments, abandoned checkouts, ignored payment links, failed subscriptions, and unpaid invoices. Traditional systems retry immediately or spam reminders — causing unnecessary friction and low recovery rates.

## 💡 The Solution

**ReconAI** is an AI-powered revenue recovery agent that doesn't just decide *what* action to take — it determines:

- **What** action to take (retry, send link, remind, escalate)
- **When** to take it (optimal timing based on customer history)
- **Which channel** to use (UPI, card, WhatsApp, SMS)
- **Whether to wait** instead of acting immediately

> **Example:** A ₹5,000 payment fails at 10 AM. ReconAI analyzes the customer's history and decides: *"Don't retry now. Send a UPI payment link at 8:15 PM via WhatsApp — when recovery probability is 78%."*

---

## ⚙️ Tech Stack

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF?style=for-the-badge&logo=react&logoColor=white)

### Backend
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-E74C3C?style=for-the-badge&logo=bull&logoColor=white)

### AI & ML
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)

### Infrastructure
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-0C2451?style=for-the-badge&logo=razorpay&logoColor=white)

---

## 🧠 Core Features

### 1. Batch Revenue Risk Scanner
Processes 50–100+ records at once — identifies failed payments, abandoned checkouts, expired links, and repeated failures.

### 2. Customer Recovery Journey
Builds a complete payment journey per customer instead of treating each failure in isolation.

### 3. Root Cause Intelligence
Classifies why revenue is at risk (gateway failure, insufficient funds, card decline, abandonment) with confidence scoring.

### 4. Intervention Simulator 🔥
Compares multiple recovery strategies side-by-side:

| Option | Action | Recovery Probability | Expected Recovery |
|--------|--------|---------------------|-------------------|
| 1 | Retry Now | 35% | ₹1,750 |
| 2 | Retry at 8 PM | 64% | ₹3,200 |
| **3** | **Send UPI Link at 8 PM** | **78%** | **₹3,900** |

### 5. Next Best Recovery Moment ⭐
The core innovation — selects the optimal **Action + Time + Channel** combination.

### 6. Policy & Guardrails Engine
Bounded AI with hard limits: max retries, cooldowns, opt-out respect, human review for low-confidence cases.

### 7. Customer Attention Budget 🔥
Each customer has a finite communication budget to prevent spam and maximize `Revenue Recovered − Customer Friction`.

### 8. Complete Audit Trail
Every decision logged end-to-end — from detection to recovery or escalation.

---

## 🏗️ Architecture

```
                    NEXT.JS DASHBOARD
                           │
                           ▼
                       NESTJS API
                     /           \
                    ▼             ▼
              PostgreSQL        Redis
                                  │
                                BullMQ
                                  │
                           Recovery Workers
                            /             \
                           ▼               ▼
                    FastAPI AI       Razorpay APIs
                    Decision Engine   + Webhooks
```

---

## 🔄 Recovery Workflow

```
PAYMENT EVENT → Detect Risk → Build Journey → Diagnose Root Cause
      → Generate Interventions → Compare Outcomes
      → Select Best Recovery Moment (Action + Time + Channel)
      → Policy Check → Execute → Verify Outcome
      → RECOVERED / STOPPED / ESCALATED
```

---

## 📊 Batch Evaluation Results

| Metric | Value |
|--------|-------|
| Records Processed | 120 |
| Recovery Cases Identified | 60 |
| Revenue at Risk | ₹3,50,000 |
| AI Actions Executed | 67 |
| Successful Recoveries | 31 |
| **Revenue Recovered** | **₹1,98,500** |
| **Recovery Rate** | **56.7%** |
| Policy Blocked | 12 |
| Human Escalations | 8 |

### Baseline Comparison

| Strategy | Revenue Recovered | Actions Taken |
|----------|------------------|---------------|
| Retry Everything | ₹1,20,000 | 180 |
| Generic Reminder | ₹1,45,000 | 150 |
| **ReconAI** | **₹1,98,500** | **94** |

> **More revenue recovered with fewer interventions.**

---

## 🖥️ Pages

| Page | Description |
|------|-------------|
| **Command Center** | Revenue metrics, active cases, cases needing review |
| **Recovery Case Detail** | Customer journey, root cause, intervention comparison, AI decision |
| **Audit & Results** | Batch summary, audit timeline, policy analytics |

---

## 📄 License

This project was built for the **Buildathon — Track 03: AI Revenue Recovery**.

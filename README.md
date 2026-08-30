<div align="center">

# 🚀 ReconAI

### AI-Powered Revenue Recovery Platform

<div>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma"/>
</div>

<p align="center">
  <em>Real-time intelligent payment recovery system powered by AI and machine learning</em>
</p>

</div>

---

## 📋 Table of Contents

- [Problem & Solution (STAR)](#-problem--solution-star)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)

---

## 🎯 Problem & Solution (STAR)

### **Situation**
E-commerce businesses face significant revenue loss from failed payments, abandoned carts, and checkout friction. Traditional recovery systems use generic, time-based approaches that lack personalization and often miss optimal recovery windows.

### **Task**
Build an intelligent, real-time revenue recovery platform that:
- Detects payment failures and recovery opportunities instantly
- Uses AI to personalize recovery strategies per customer
- Predicts optimal timing and channels for outreach
- Automates execution while maintaining human oversight

### **Action**
Developed **ReconAI**, a production-grade platform featuring:
- 🧠 **AI Decision Engine** - Google Gemini-powered recovery strategy generation
- 🤖 **ML Prediction Service** - Customer behavior analysis and timing optimization
- ⚡ **Real-time Processing** - Event-driven architecture with BullMQ queues
- 🔄 **State Machine** - Intelligent case management and workflow orchestration
- 📊 **Analytics Dashboard** - Real-time insights and performance tracking
- 🔌 **Payment Integration** - Razorpay webhook processing and payment link generation

### **Result**
A scalable, intelligent system that:
- ✅ Recovers lost revenue through personalized strategies
- ✅ Reduces manual intervention with automated workflows
- ✅ Optimizes recovery timing using ML predictions
- ✅ Provides actionable insights through comprehensive analytics
- ✅ Scales horizontally with microservices architecture

---

## ✨ Key Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 🎯 **Smart Detection** | Real-time identification of payment failures and recovery opportunities |
| 🤖 **AI Strategy Generation** | LLM-powered personalized recovery plans |
| 📈 **ML Predictions** | Success probability scoring and timing optimization |
| ⚡ **Queue Processing** | Async job processing with BullMQ and Redis |
| 🔔 **Multi-channel Outreach** | WhatsApp, Email, SMS integration |
| 📊 **Real-time Analytics** | Customer journey tracking and performance metrics |
| 🔐 **Secure Authentication** | JWT-based auth with role management |
| 🎨 **Modern UI** | Beautiful Next.js dashboard with Tailwind CSS |

</div>

---

## 🛠 Tech Stack

### **Frontend**
<div>
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion"/>
  <img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui&logoColor=white" alt="Radix UI"/>
  <img src="https://img.shields.io/badge/Recharts-22B5BF?style=flat-square&logo=chart.js&logoColor=white" alt="Recharts"/>
</div>

### **Backend**
<div>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/BullMQ-D92B2E?style=flat-square&logo=bull&logoColor=white" alt="BullMQ"/>
  <img src="https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white" alt="WebSocket"/>
  <img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white" alt="Zod"/>
</div>

### **AI & ML**
<div>
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=google&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI"/>
</div>

### **Database & Infrastructure**
<div>
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
</div>

### **Integrations**
<div>
  <img src="https://img.shields.io/badge/Razorpay-0C2451?style=flat-square&logo=razorpay&logoColor=white" alt="Razorpay"/>
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=flat-square&logo=whatsapp&logoColor=white" alt="WhatsApp"/>
</div>

---

## 🏗 Architecture

```mermaid
graph TB
    A[Next.js Web App] -->|API Calls| B[Express API Server]
    B -->|Webhook Events| C[Razorpay Integration]
    B -->|Queue Jobs| D[BullMQ + Redis]
    D -->|AI Worker| E[AI Service - Gemini]
    D -->|Decision Worker| F[Decision Engine]
    D -->|Execution Worker| G[Execution Engine]
    F -->|ML Predictions| H[FastAPI ML Service]
    B -->|Data Layer| I[(PostgreSQL + Prisma)]
    G -->|Notifications| J[WhatsApp/Email/SMS]
    B -->|Real-time| K[WebSocket Server]
```

**Core Components:**
- **Web App** - Next.js dashboard for monitoring and management
- **API Server** - Express backend with REST endpoints and WebSocket
- **AI Service** - LLM-powered recovery strategy generation
- **Decision Engine** - Multi-factor scoring and channel selection
- **Execution Engine** - Action orchestration and idempotency
- **ML Service** - Python-based prediction and analytics
- **Queue System** - Async job processing with retry logic

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.9+ and pip
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/reconai.git
cd reconai
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
npm run db:push
npm run db:seed
```

5. **Install Python dependencies** (for ML service)
```bash
cd apps/ml-service
pip install -r requirements.txt
```

### Running the Application

**Development mode (all services):**
```bash
npm run dev
```

**Individual services:**
```bash
npm run dev:web      # Next.js app → http://localhost:3000
npm run dev:api      # Express API → http://localhost:4000
npm run dev:ml       # ML service → http://localhost:8000
```

---

## 📁 Project Structure

```
ReconAI/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/        # App router pages
│   │   │   ├── components/ # Reusable components
│   │   │   └── lib/        # Utilities & services
│   │   └── package.json
│   │
│   ├── api/                 # Express backend
│   │   ├── src/
│   │   │   ├── ai/         # AI service & prompts
│   │   │   ├── decision-engine/  # Strategy & scoring
│   │   │   ├── execution/   # Action orchestration
│   │   │   ├── integrations/ # External services
│   │   │   └── modules/     # Core business logic
│   │   └── package.json
│   │
│   └── ml-service/          # Python ML service
│       ├── app/
│       │   ├── models/      # ML models
│       │   └── routers/     # FastAPI routes
│       └── requirements.txt
│
├── packages/                # Shared libraries
│   ├── shared-types/       # Common TypeScript types
│   ├── validation/         # Zod schemas
│   └── config/             # Shared configuration
│
└── prisma/                 # Database schema & migrations
```

---

## 📡 API Documentation

### **Authentication**
```bash
POST /api/auth/login
POST /api/auth/register
```

### **Webhooks**
```bash
POST /api/webhooks/razorpay  # Payment event processing
```

### **Recovery**
```bash
GET  /api/recovery/cases          # List all recovery cases
GET  /api/recovery/cases/:id      # Get case details
POST /api/recovery/cases/:id/action  # Execute action
GET  /api/recovery/analytics      # Analytics dashboard data
```

### **Development**
```bash
POST /api/dev/trigger-event      # Simulate events (dev only)
```

---

<div align="center">

### 🌟 Built with passion for intelligent revenue recovery

**[Documentation](./docs)** • **[Contributing](./CONTRIBUTING.md)** • **[License](./LICENSE)**

</div>

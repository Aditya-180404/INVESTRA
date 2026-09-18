# 🚔 INVESTRA
### *AI-Powered Criminal Network Analysis & Investigation Intelligence Platform*

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"Connect the information. Verify the evidence. Assist the investigator."**

INVESTRA is an enterprise-grade investigation intelligence platform engineered to bridge fragmented law enforcement data. By combining modern graph-like entity resolution, vector-based semantic search (RAG), and localized AI models, INVESTRA empowers investigators to discover hidden relationships across FIRs, cross-verify evidence, and construct actionable intelligence timelines—all within a secure, human-in-the-loop ecosystem.

---

## 🎯 Problem Statement

Modern law enforcement agencies face severe data fragmentation challenges:
* **Siloed Systems:** Case information, First Information Reports (FIRs), evidence logs, suspect profiles, vehicle registrations, and call logs are stored in disjointed databases across different police stations.
* **Manual Data Linking:** Identifying that a vehicle mentioned in one district is linked to a suspect in another requires labor-intensive manual cross-referencing.
* **Time-Critical Delays:** Critical criminal network links are often overlooked during the vital initial hours of an investigation due to information overload.

---

## 💡 Key Features & Modules

* 🔎 **Case & FIR Management:** Centralized repository for structured case files, FIR tracking, and status updates.
* 👤 **Entity Extraction & Auto-Linking:** Automatic extraction and cross-referencing of key entities (Persons, Vehicles, Phone Numbers, Locations, Bank Accounts).
* 🕸️ **Cross-Case Relationship Graph:** Visual mapping and network analysis to pinpoint shared entities across multiple open or closed cases.
* 📍 **Dynamic Investigation Timeline:** Chronological aggregation of incidents, witness statements, and evidence logs to visualize case progression.
* 📁 **Digital Evidence Management:** Chain-of-custody tracking with metadata indexing for fast cross-verification.
* 👮 **Inter-Station Coordination:** Secure role-based data sharing between different police stations and investigative divisions.
* 🧠 **RAG-Based Semantic Retrieval:** High-precision Retrieval-Augmented Generation using `pgvector` to query unstructured case files in natural language.
* 🤖 **Local AI Assistant (Ollama):** On-premise LLM integration ensuring sensitive investigation data never leaves local infrastructure.
* 🔐 **Enterprise Security:** Granular Role-Based Access Control (RBAC), JWT authentication, and comprehensive audit logs.

---

## 🧠 System Workflow

```
┌─────────────────────────────────────────────────────────┐
│              Raw Case / FIR / Evidence Data             │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │     Entity Extraction     │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │   Relationship Analysis   │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │    Cross Verification     │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ Vector Embedding & RAG    │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │   Local AI / Ollama Inference │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │  Human Investigator Review│
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │  Actionable Intelligence  │
              └───────────────────────────┘
```

---

## 🏗️ System Architecture

INVESTRA utilizes a decoupled microservices architecture designed for security, scalability, and deployment flexibility:

```
                      ┌─────────────────────────┐
                      │   React + Vite Frontend │
                      └────────────┬────────────┘
                                   │  HTTP / REST API
                                   ▼
                      ┌─────────────────────────┐
                      │  FastAPI Backend Core   │
                      └────┬───────┬───────┬────┘
                           │       │       │
          ┌────────────────┘       │       └────────────────┐
          ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Authentication   │    │  Investigation   │    │  AI & Vector RAG │
│ Service (JWT/RBAC)│    │     Engine       │    │     Engine       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │ PostgreSQL + pgvector│
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Ollama (Local LLM) │
                        └─────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS | Responsive dashboard for complex network charts and timeline visualization. |
| **Backend** | FastAPI, Python 3.12, Pydantic v2 | High-performance asynchronous RESTful API framework. |
| **Database** | PostgreSQL 16+, `pgvector` | Relational storage + vector embeddings for fast similarity search. |
| **AI / RAG** | Ollama, LangChain / LlamaIndex | On-premise local LLM execution with contextual retrieval. |
| **Security** | JWT, bcrypt, RBAC | Secure authentication and fine-grained authorization policies. |
| **Containerization** | Docker, Docker Compose | Orchestration for unified service deployment. |

---

## 🚀 Quick Start Guide

### Prerequisites

* [Docker](https://www.docker.com/get-started) (v24.0+)
* [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
* [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/INVESTRA.git
cd INVESTRA
```

### 2. Environment Configuration

Copy the example environment template and configure your secrets:

```bash
cp .env.example .env
```

*Ensure you adjust `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, and `OLLAMA_BASE_URL` in `.env` as required.*

### 3. Build & Run with Docker

```bash
# Build containers
docker compose build

# Start services in detached mode
docker compose up -d
```

### 4. Verify Running Services

```bash
docker compose ps
```

---

## 🌐 Access & API Documentation

Once the services are running, access the platform via the following endpoints:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | `http://localhost:5173` | Main Investigator Portal & Intelligence Dashboard |
| **Backend API** | `http://localhost:8000` | REST API Gateway |
| **Interactive Swagger Docs** | `http://localhost:8000/docs` | OpenAPI Specification & Live Testing |
| **ReDoc Documentation** | `http://localhost:8000/redoc` | Alternative API Documentation Format |

---

## 📊 Demo Dataset

To facilitate immediate testing and evaluation, INVESTRA includes a verified synthetic dataset representing an ongoing investigation scenario in Kolkata.

**Current Verified Dataset Metrics:**
* 📁 **15** Active & Historical Cases
* 📄 **44** Evidence Records
* 📍 **98** Investigation Timeline Events
* 👤 **80** Linked Entities (Suspects, Vehicles, Locations, Phone Numbers)
* 🧠 **65** RAG Vector Document Chunks

> *Note: The included dataset is completely synthetic and generated strictly for research, testing, and demonstration purposes. It does not represent actual law enforcement records or real individuals.*

---

## 🔐 Security & Governance

INVESTRA is engineered around a **Human-in-the-Loop (HITL)** operational doctrine. 

* **Strict Role-Based Access Control (RBAC):** Access levels are segregated between *Field Officers*, *Lead Investigators*, and *System Administrators*.
* **On-Premise Privacy:** By using Ollama for local AI inference, sensitive legal documents and evidence logs never transit third-party cloud APIs.
* **Audit Trail:** Critical operations (entity overrides, case access, data exports) are recorded in tamper-evident system logs.
* **Non-Autonomous Decision Making:** AI outputs serve strictly as investigative leads and contextual summaries; they are not intended to replace human judgment or legal procedures.

---

## ⚠️ Responsible Use & Disclaimer

INVESTRA is an academic research and demonstration project developed for **Smart India Hackathon 2026**.

* AI-generated summaries and relationship maps are advisory tools meant to assist human investigators.
* Information provided by the platform **must be independently verified** by authorized law enforcement personnel.
* The system must not be used as an autonomous basis for arrest, judicial decision-making, surveillance, or legal prosecution.

---

## 🏆 Project Info & Hackathon Details

* **Event:** Smart India Hackathon 2026
* **Team:** Five-Star
* **Project Name:** INVESTRA
* **Domain:** AI-Powered Criminal Network Analysis & Investigation Intelligence
* **Theme:** Blockchain & Cybersecurity

---

<p center="align">
  <i>Developed with ❤️ by Team Five-Star for Smart India Hackathon 2026.</i>
</p>

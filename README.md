# 🚔 INVESTRA 
### *AI-Powered Criminal Network Analysis & Investigation Intelligence Platform*
[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/) [![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) [![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/) [![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
> **Connect the information. Verify the evidence. Assist the investigator.**

INVESTRA is an AI-assisted criminal network analysis and investigation intelligence platform developed by **Team Five-Star** for **Smart India Hackathon 2026**, Problem Statement **26189 – AI-Powered Criminal Network Analysis System**, under the **Blockchain & Cybersecurity** theme.

The project addresses fragmented investigation data by combining secure ingestion, NLP/NER-based extraction, entity resolution, evidence-linked relationship analysis, timelines, semantic retrieval, AI-assisted reasoning, and human verification.

> **Core Principle**
>
> **Raw Data → AI Processing → Potential Insight → Source Evidence → Human Verification → Investigative Action**

The current implementation should be understood as an **MVP / research and demonstration system**, not as a fully deployed national law-enforcement platform. Capabilities explicitly marked as future scope are architectural directions and are not claimed as fully implemented in the current MVP.

---

# 📌 Project Identity

| Field | Details |
|---|---|
| Project | INVESTRA |
| Full Name | AI-Powered Criminal Network Analysis & Investigation Intelligence Platform |
| Event | Smart India Hackathon 2026 |
| Problem Statement ID | 26189 |
| Problem Statement | AI-Powered Criminal Network Analysis System |
| Theme | Blockchain & Cybersecurity |
| PS Category | Software |
| Team ID | 141740 |
| Team | Five-Star |
| Project Status | MVP / Research & Demonstration |

The official SIH submission material identifies the project as Problem Statement 26189, Theme "Blockchain & Cybersecurity", PS Category "Software", and Team Five-Star, Team ID 141740. fileciteturn0file0L2-L10

---

# 🌐 Live Demo & Resources

**Live Application**

https://investra-1-qc3t.onrender.com/

**Video Demonstration**

https://www.youtube.com/watch?v=toV3vzPlFcI

**Source Repository**

https://github.com/Aditya-180404/INVESTRA.git

These links are included in the SIH project material. fileciteturn0file0L101-L106

### Demo Credentials

```text
Username: admin
Password: adminpassword123
```

> These credentials are for the demonstration environment only. Production deployments must use secure credentials and secret management.

---

# 🎯 Problem Statement

Modern investigations generate information across multiple sources and formats:

- FIRs
- Case records
- CDRs
- CCTV metadata
- Financial records
- Reports
- Structured databases
- Unstructured documents

The SIH solution material specifically identifies data fragmentation, entity-resolution difficulty, false positives and AI bias, evidence/provenance, privacy/access control, and scalability as key challenges. fileciteturn0file0L109-L162

## Core Challenges

### 1. Data Fragmentation

Investigation data can originate from multiple sources and formats. Records may be incomplete, inconsistent, or unstructured.

```text
FIR
 ├── Persons
 ├── Phones
 ├── Vehicles
 └── Events

CDR
 ├── Calls
 ├── Numbers
 └── Timestamps

CCTV Metadata
 ├── Camera
 ├── Location
 └── Time

Financial Records
 ├── Accounts
 ├── Transfers
 └── Transactions
```

The objective is to bring relevant information into a unified analysis pipeline.

### 2. Entity Resolution

The same person may appear under different names or aliases. Duplicate or similar entities across records can create misleading relationships if they are incorrectly matched. fileciteturn0file0L117-L125

### 3. False Positives & AI Bias

Similarity scores and graph patterns can produce false positives. A network relationship or similarity signal must not automatically be treated as proof of criminal activity. fileciteturn0file0L134-L143

### 4. Evidence & Provenance

AI-generated insights must be traceable to their source. The intended design protects original records while using structured references for analysis. fileciteturn0file0L126-L133

### 5. Privacy & Access Control

Investigation records can contain highly sensitive information. The architecture therefore includes controlled access and audit-oriented security. fileciteturn0file0L144-L152

### 6. Scalability

Large investigations can contain thousands of entities and relationships. Processing documents, graphs, and timelines can become resource-intensive as the dataset grows. fileciteturn0file0L153-L162

---

# 💡 INVESTRA USP

INVESTRA's USP is not simply "AI for crime analysis". The project combines **evidence-first intelligence, human verification, reasoning beyond simple linking, controlled access, and source-backed retrieval**.

The SIH proposal identifies the following innovation pillars. fileciteturn0file0L55-L70

## 1. Evidence-First, Not Black-Box

Every entity, edge, and alert is designed to link directly to its source document.

```text
Source Document
      ↓
Extracted Fact
      ↓
Entity / Relationship
      ↓
AI Insight / Alert
      ↓
Source Evidence
      ↓
Human Verification
```

## 2. Human-in-the-Loop by Design

AI does not automatically decide identity or guilt.

```text
AI
 ↓
Candidate Insight
 ↓
Evidence + Explanation
 ↓
Investigator Review
 ↓
Confirm / Reject / Investigate Further
```

The SIH scenario explicitly describes a phone number appearing across three unrelated FIRs and INVESTRA flagging a possible identity connection without declaring guilt, presenting the evidence trail and asking the investigator to confirm. fileciteturn0file0L13-L19

## 3. Beyond Linking — Reasoning

INVESTRA is designed to go beyond finding relationships. The proposed intelligence layer can identify:

- Missing evidence
- Contradictions
- Case similarity
- Related sequences
- Network characteristics

These are investigative leads requiring human review. fileciteturn0file0L62-L64

## 4. RBAC + ABAC Access Control

The architecture targets granular case and attribute permissions with audit logging.

```text
Role
 +
Clearance
 +
Case Assignment
 +
Attributes
 =
Access Decision
```

The SIH solution describes case-level and attribute-level controls based on role, clearance, and case assignment, with access/query/share events recorded in an immutable audit trail. fileciteturn0file0L199-L206

## 5. Local Source-Backed Assistant

The RAG assistant is designed to explain why cases may be related using authorized evidence.

```text
Investigator Question
        ↓
Authorized Data
        ↓
Retrieval
        ↓
Relevant Evidence
        ↓
Local AI
        ↓
Source-Backed Response
```

---

# 🧠 Illustrative Investigation Scenario

A phone number appears across multiple unrelated FIRs.

INVESTRA can:

```text
FIR 1
  ↓
Phone Number X

FIR 2
  ↓
Phone Number X

FIR 3
  ↓
Phone Number X
```

The platform can flag a candidate connection and expose supporting evidence.

If an account with irregular transfers is also associated with the available records, the system can surface the relationship for investigation.

It does **not** automatically declare the person guilty or establish that two records belong to the same person.

The investigator reviews the source evidence and makes the investigative determination.

This scenario follows the project's stated "without declaring guilt" and human-confirmation approach. fileciteturn0file0L13-L19

---

# 🏗️ Complete Solution Architecture

The architecture follows the pipeline:

```text
┌─────────────────────────────────────────────────────────────┐
│                    INVESTIGATION SOURCES                    │
│                                                             │
│  PDF / FIR / CSV / CDR / CCTV Metadata / Other Records     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       SECURE INTAKE                         │
│                  Hash-Validated Upload                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         EXTRACTION                          │
│                 OCR / NLP / NER / Parsing                   │
│                                                             │
│          People • Phones • Vehicles • Events                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ENTITY RESOLUTION                        │
│                                                             │
│       Name • Phone • Address • Alias • Candidate Match      │
│                  Confidence / Similarity                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       GRAPH BUILD                            │
│                                                             │
│        Evidence-Linked Relationships + Sources              │
│                                                             │
│     CALLED • USED • MET • TRANSFERRED • OTHER EDGES         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         ANALYSIS                             │
│                                                             │
│       Network Analysis • Timeline • Case Similarity         │
│       Missing Evidence • Contradiction Detection             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                          ALERT                               │
│                                                             │
│               Potential / Candidate Insight                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     HUMAN VERIFICATION                       │
│                                                             │
│               Confirm • Reject • Investigate                 │
│                 All actions logged / audited                  │
└─────────────────────────────────────────────────────────────┘
```

The SIH architecture describes the same Ingest → Extract → Resolve → Connect → Analyze → Alert → Verify pipeline. fileciteturn0file0L21-L42

---

# 🧱 System Architecture

```text
                         ┌──────────────────────────┐
                         │       Investigator       │
                         │       / Admin User       │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │     React 18 + Vite      │
                         │       Frontend UI        │
                         └────────────┬─────────────┘
                                      │
                               HTTP / REST API
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       FastAPI Core       │
                         │       Python 3.12        │
                         └────────────┬─────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Authentication       │  │ Investigation Core   │  │ AI / RAG Engine      │
│ JWT / bcrypt / RBAC  │  │ Cases / FIR / Data  │  │ Retrieval / Ollama   │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                         ┌──────────────────────────┐
                         │      PostgreSQL 16+      │
                         │        + pgvector        │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │          Ollama           │
                         │      Local AI Runtime     │
                         └──────────────────────────┘
```

---

# 🧩 Technical Stack

The SIH technical approach identifies React 18, Vite, Tailwind CSS, FastAPI, Python 3.12, PostgreSQL 16+, pgvector, Ollama, LlamaIndex, JWT, bcrypt, RBAC, Docker, and Docker Compose. fileciteturn0file0L91-L100

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 | Application interface |
| Build Tool | Vite | Frontend development/build |
| Styling | Tailwind CSS | UI styling |
| Backend | FastAPI | REST API and application services |
| Runtime | Python 3.12 | Backend runtime |
| Database | PostgreSQL 16+ | Structured investigation/application data |
| Vector Search | pgvector | Semantic retrieval |
| RAG / AI | Ollama + LlamaIndex | Local AI and retrieval workflow |
| Authentication | JWT | Session/token authentication |
| Password Security | bcrypt | Password hashing |
| Authorization | RBAC / planned ABAC | Access control |
| Graph Analysis | NetworkX in MVP | Graph-oriented prototyping |
| Containers | Docker / Docker Compose | Reproducible deployment |

---

# 🔐 Security Architecture

Security is a central part of the project.

## Authentication

```text
User
 ↓
Credentials
 ↓
Authentication
 ↓
JWT
 ↓
Authorized Request
```

## RBAC

The platform separates administrative and investigation-oriented access.

```text
ADMIN
 ├── User / Account Management
 └── Authorized Administrative Operations

INVESTIGATOR / POLICE
 ├── Investigation Access
 ├── Case Operations
 ├── Evidence Review
 └── AI-Assisted Analysis
```

## ABAC Direction

The architecture also targets attribute-level controls.

```text
Role
+
Clearance
+
Case Assignment
+
Data Attributes
+
Context
      ↓
Access Decision
```

ABAC should be considered part of the broader architecture and future production-hardening direction unless a specific implementation is enabled in the deployed environment.

---

# 🔏 Evidence Integrity & Provenance

Evidence provenance is one of the project's core design areas.

The proposed evidence layer uses:

```text
Original File
    ↓
SHA-256 Hash
    ↓
Source Reference
    ↓
Page / Timestamp
    ↓
Structured Fact
    ↓
Graph / RAG / Analysis
```

The SIH proposal specifies SHA-256 hash verification and linking extracted facts to the original document, page, and timestamp while leaving original files untouched. fileciteturn0file0L190-L198

This creates the intended relationship:

```text
Insight
  ↓
Fact
  ↓
Source
  ↓
Evidence
```

---

# 🔎 Entity Extraction

The proposed extraction pipeline uses hybrid NLP techniques.

```text
Input Document
      ↓
OCR / Text Extraction
      ↓
Regex + NER
      ↓
Entity Identification
      ↓
Normalization
```

Target entity categories include:

- Persons
- Phone numbers
- Vehicles
- Addresses
- Events
- Other investigation-relevant entities

The SIH architecture specifically describes hybrid NLP using regex + NER for persons, phones, vehicles, and events. fileciteturn0file0L31-L34

---

# 🧬 Entity Resolution

INVESTRA follows the principle:

> **Score, Don't Assume.**

Candidate matches can be scored using signals such as:

```text
Name
+
Phone
+
Address
+
Alias
+
Other available attributes
      ↓
Similarity / Confidence Score
      ↓
Candidate Match
      ↓
Human Confirmation
```

The design explicitly avoids automatically merging records. fileciteturn0file0L163-L171

---

# 🕸️ Evidence-Linked Knowledge Graph

The graph layer represents relationships between investigation entities.

Example:

```text
             ┌─────────────┐
             │   Person A  │
             └──────┬──────┘
                    │
                 USED
                    │
                    ▼
             ┌─────────────┐
             │   Phone X   │
             └──────┬──────┘
                    │
                 CALLED
                    │
                    ▼
             ┌─────────────┐
             │   Person B  │
             └──────┬──────┘
                    │
                 APPEARS_IN
                    │
                    ▼
             ┌─────────────┐
             │   Case 102  │
             └─────────────┘
```

Possible typed relationships include:

- `CALLED`
- `USED`
- `MET`
- `TRANSFERRED`
- Case membership
- Other evidence-supported relationships

The project proposal specifically describes typed evidence-linked edges such as CALLED, USED, MET, and TRANSFERRED. fileciteturn0file0L35-L36

---

# ⏱️ Timeline & Case Similarity

The analysis layer is designed to surface:

- Related event sequences
- Timeline relationships
- Case similarity
- Missing evidence
- Contradictions

Conceptually:

```text
Case A
│
├── Event 1 ───► Event 2 ───► Event 3
│
└── Entity X

Case B
│
├── Event 4 ───► Event 5
│
└── Entity X

                ↓

        Potential Relationship
                ↓
          Evidence Review
```

The project material describes timeline and case-similarity analysis, along with detection of missing evidence and contradictions with stated reasons. fileciteturn0file0L37-L42

---

# 🧠 RAG / Local AI Architecture

INVESTRA uses a retrieval-oriented AI design.

```text
                 Investigator Query
                         │
                         ▼
                Query Processing
                         │
                         ▼
                 Vector Retrieval
                         │
                         ▼
              Relevant Case Context
                         │
                         ▼
                  Ollama / LLM
                         │
                         ▼
             Source-Backed Response
                         │
                         ▼
               Human Verification
```

The technical approach specifies **Ollama + LlamaIndex** for RAG/AI. fileciteturn0file0L94-L100

## Local AI Principle

Where Ollama is deployed locally:

```text
Sensitive Investigation Data
          ↓
      INVESTRA
          ↓
   Local Ollama Runtime
          ↓
       Local Model
```

This provides a local-inference architecture rather than requiring every investigation query to be sent to a third-party cloud LLM.

Actual privacy depends on deployment configuration and operational controls.

---

# 🔄 Complete End-to-End Workflow

```text
1. SECURE INTAKE
       ↓
FIR / PDF / CSV / CDR / Other Records
       ↓
2. EXTRACTION
       ↓
OCR / NLP / NER
       ↓
3. ENTITY RESOLUTION
       ↓
Candidate Matching
       ↓
4. GRAPH BUILD
       ↓
Evidence-Linked Relationships
       ↓
5. ANALYSIS
       ↓
Network / Timeline / Similarity
       ↓
6. ALERT
       ↓
Potential Insight
       ↓
7. HUMAN VERIFY
       ↓
Confirm / Reject / Investigate
       ↓
8. AUDIT
       ↓
Action Logged
```

---

# 📊 Current MVP Capability Matrix

This table intentionally separates the current MVP from future production capabilities.

| Capability | Status | Description |
|---|---|---|
| React frontend | ✅ MVP | Main application interface |
| FastAPI backend | ✅ MVP | REST API/application layer |
| PostgreSQL | ✅ MVP | Persistent structured data |
| pgvector | ✅ MVP / Integrated | Vector retrieval foundation |
| JWT | ✅ MVP | Authentication |
| bcrypt | ✅ MVP / Security component | Password hashing |
| RBAC | ✅ MVP / Core architecture | Role-based access |
| Docker | ✅ MVP | Containerized deployment support |
| Ollama | ✅ MVP / Supported | Local AI runtime |
| RAG | 🟡 MVP | Retrieval-assisted AI workflow |
| Case / FIR workflow | 🟡 MVP | Investigation information workflow |
| Entity extraction | 🟡 MVP | NLP/NER-based prototype capability |
| Entity resolution | 🟡 MVP | Candidate scoring / matching |
| Relationship graph | 🟡 MVP | Graph-oriented prototype |
| Timeline | 🟡 MVP | Investigation event organization |
| Evidence provenance | 🟡 MVP / Architecture | Evidence-linked workflow |
| ABAC | 🔮 Future / Hardening | Advanced attribute-level access |
| Production Neo4j | 🔮 Future | Large-scale graph database |
| Advanced OCR | 🔮 Future | Broader document ingestion |
| Multimodal analysis | 🔮 Future | CCTV/audio/image expansion |
| Cross-jurisdiction federation | 🔮 Future | Secure multi-agency intelligence sharing |
| Production blockchain ledger | 🔮 Future | Advanced tamper-evident evidence layer |
| National-scale deployment | 🔮 Future | Enterprise/production deployment |

### Status Meaning

```text
✅ MVP
Currently part of the implemented/project architecture.

🟡 MVP / Prototype
Demonstrated or architected at MVP level and may require further production hardening.

🔮 Future
Planned direction. Do not represent it as already implemented.
```

---

# 🏛️ MVP vs Future Production Architecture

## CURRENT MVP

```text
React
  +
FastAPI
  +
PostgreSQL
  +
pgvector
  +
JWT / RBAC
  +
NLP / NER
  +
NetworkX-oriented graph analysis
  +
RAG
  +
Ollama
  +
Human Review
```

The SIH proposal explicitly describes the MVP as running on **PostgreSQL + NetworkX** for fast prototyping and demo-scale performance, with a planned migration path to Neo4j for large-scale workloads. fileciteturn0file0L207-L214

## FUTURE PRODUCTION DIRECTION

```text
Secure Multi-Source Intake
          ↓
Advanced OCR / NLP / NER
          ↓
Advanced Entity Resolution
          ↓
Production Knowledge Graph
          ↓
Vector Search + Evidence Store
          ↓
Advanced Analytics
          ↓
Controlled AI Agents
          ↓
ABAC / Federation
          ↓
Human Verification
          ↓
Audited Investigative Workflow
```

---

# 🚀 Future Scope

The following capabilities are **not presented as fully implemented in the current MVP**. They represent future development and production-scale directions.

## 1. Neo4j / Production Graph Infrastructure

The current MVP uses PostgreSQL + NetworkX-oriented graph processing for prototyping.

Future versions can migrate to Neo4j or another production-grade graph system for:

- Large graph traversal
- Relationship queries
- Network analytics
- Graph persistence
- Large-scale investigations

The SIH proposal explicitly identifies Neo4j as the intended production migration direction. fileciteturn0file0L207-L214

---

## 2. Advanced OCR

Future versions can expand OCR for:

- Scanned FIRs
- Scanned reports
- Historical documents
- Multilingual documents
- Vernacular investigation records

Target workflow:

```text
Scanned Document
      ↓
OCR
      ↓
Text
      ↓
NER
      ↓
Entity Resolution
      ↓
Investigation Graph
```

---

## 3. Multimodal Evidence Processing

Future scope includes processing additional evidence formats such as:

- CCTV metadata
- Images
- Audio/transcripts
- Complex financial records
- Other authorized digital evidence

The SIH solution architecture identifies PDF/CSV/JSON FIRs, CDRs and CCTV metadata as source categories for the broader system design. fileciteturn0file0L21-L23

---

## 4. Advanced Entity Resolution

Future improvements can include:

- Alias resolution
- Multilingual name matching
- Fuzzy matching
- Phone normalization
- Address normalization
- Vehicle identifier normalization
- Better confidence calibration
- Investigator feedback loops

---

## 5. Advanced ABAC

Future production access control can evaluate:

```text
Role
+
Clearance
+
Case Assignment
+
Department
+
Data Classification
+
Context
```

before allowing access to specific information.

---

## 6. Cross-Jurisdiction Federation

Future versions can support secure collaboration across:

```text
Police Station
      ↓
District
      ↓
State
      ↓
Authorized Federation
```

This would require mature:

- ABAC
- Encryption
- Data-sharing policies
- Audit controls
- Federation protocols
- Strong identity management

---

## 7. Evidence Integrity Ledger / Blockchain Direction

Because the SIH theme is **Blockchain & Cybersecurity**, future production architecture can introduce a tamper-evident evidence ledger.

Potential workflow:

```text
Evidence File
     ↓
SHA-256 Hash
     ↓
Evidence Metadata
     ↓
Tamper-Evident Ledger
     ↓
Integrity Verification
```

This README does not claim that a complete production blockchain evidence ledger is already implemented in the MVP.

---

## 8. Advanced AI Agents

Future AI assistance can include controlled agents for:

- Evidence retrieval
- Case summarization
- Timeline generation
- Contradiction detection
- Missing-evidence identification
- Cross-case similarity
- Investigator question generation

Any agentic capability should remain evidence-grounded, authorized, auditable, and subject to human review.

---

# 📈 Expected Impact

The SIH project material describes potential economic and social benefits including faster case resolution, reduced investigation workload, improved productivity/scalability, better resource allocation, reduced financial-crime losses, improved public safety, reduced human error, evidence-based decisions, better inter-department collaboration, and protection of sensitive information. fileciteturn0file0L218-L280

These should be understood as **expected benefits/design objectives**, not measured performance claims of the current MVP.

## Economic Impact

### Faster Case Analysis

Potentially reduces time spent manually locating connections and relevant evidence.

### Reduced Manual Workload

Automates repetitive processing and cross-referencing tasks.

### Better Resource Allocation

Can help investigators focus attention on relevant evidence and candidate relationships.

### Scalability

A unified architecture can support handling more investigation records without relying entirely on manual comparison.

---

# 👥 Social Benefits

### Improved Investigation Support

Helps investigators access relevant relationships and evidence more systematically.

### Reduced Human Error

Automates repetitive processing and can highlight missing or contradictory information.

### Evidence-Based Investigation

Connects insights to their underlying sources.

### Controlled Collaboration

Supports authorized sharing of relevant information.

### Sensitive Data Protection

Uses controlled access and audit-oriented mechanisms for investigation information.

These benefits are aligned with the SIH proposal. fileciteturn0file0L240-L264

---

# 🆚 Traditional Workflow vs INVESTRA

| Investigation Aspect | Traditional / Manual Workflow | INVESTRA Approach |
|---|---|---|
| Data Analysis | Manual and fragmented | Unified AI-assisted analysis |
| Connection Discovery | Manual record searching | Graph-oriented relationship discovery |
| Evidence Verification | Manual source checking | Evidence-linked insights |
| Identity Matching | Manual comparison | Confidence-scored candidate matching |
| Investigator Work | More time spent on collection and comparison | More focus on verification and decisions |

This comparison follows the workflow comparison presented in the SIH project material. fileciteturn0file0L265-L280

---

# 🔬 Research Workflow

The research architecture follows:

```text
1. DATA INGESTION
PDF / CSV / CDR / FIR / Multiple Sources
              ↓
2. OCR & NLP
Extract Text + Entities
              ↓
3. ENTITY RESOLUTION
Link / Deduplicate Entities
              ↓
4. KNOWLEDGE GRAPH
Temporal + Multi-Layer Graph
              ↓
5. ANALYSIS & INSIGHTS
Network Analysis / Link Prediction / Pattern Discovery
              ↓
6. EXPLAINABLE OUTPUT
Visual Network / Timeline / Reports + Evidence Links
```

This six-stage research workflow is included in the SIH submission material. fileciteturn0file0L282-L309

---

# 📚 Research Context

The SIH material positions INVESTRA against existing categories of systems including CCTNS/ICJS, IBM i2 Analyst's Notebook, and open-source research projects.

The submitted comparison covers:

- Crime data integration
- OCR/NLP
- Entity resolution
- Criminal network analysis
- Temporal analysis
- GIS/geospatial analysis
- Explainability/evidence linking
- AI-assisted insights
- Open-source/customizability

The project identifies a research gap around integrated multi-source intelligence, entity resolution, temporal analysis, explainability, and AI-assisted analysis of unstructured data. fileciteturn0file0L310-L342

> **Note:** Comparisons with external systems are based on the project submission's stated comparison and should not be treated as an independent benchmark.

---

# 🧪 Validation Strategy

A production-oriented implementation should be validated at multiple layers.

## Backend

```text
API Tests
   ↓
Authentication Tests
   ↓
Authorization Tests
   ↓
Database Tests
   ↓
RAG / Retrieval Tests
```

## Frontend

```text
UI Tests
   ↓
Login Flow
   ↓
Case Workflow
   ↓
Investigation Workflow
```

## Integration

```text
Frontend
   ↓
FastAPI
   ↓
PostgreSQL
   ↓
pgvector
   ↓
Ollama
```

## Security

Important validation areas include:

- Unauthorized API access
- Role escalation
- Invalid authentication tokens
- Input validation
- Case-level data isolation
- Sensitive information exposure
- Auditability
- Secure secret management

---

# 🐳 Deployment

INVESTRA supports Docker-based deployment.

Conceptual deployment:

```text
                 Docker Compose
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Frontend     Backend    PostgreSQL
          │           │           │
          └───────────┼───────────┘
                      │
                      ▼
                    RAG
                      │
                      ▼
                   Ollama
```

---

# 🚀 Quick Start

## Prerequisites

```text
Docker 24+
Docker Compose 2.20+
Git
Python 3.12
Node.js / npm
Ollama
```

## Clone

```bash
git clone https://github.com/Aditya-180404/INVESTRA.git
cd INVESTRA
```

## Environment

If the repository contains `.env.example`:

```bash
cp .env.example .env
```

Configure deployment-specific values such as:

```env
POSTGRES_PASSWORD=<secure-password>
JWT_SECRET_KEY=<secure-secret>
OLLAMA_BASE_URL=<authorized-ollama-endpoint>
```

Never commit real passwords, JWT secrets, or API keys.

## Docker

```bash
docker compose build
docker compose up -d
```

Check services:

```bash
docker compose ps
```

## Local Development

Use Python 3.12 for backend development.

```bash
python -m venv .venv
```

Install dependencies according to the repository's current requirements.

For the frontend:

```bash
npm install
npm run dev
```

Use the repository's current directory structure as the source of truth because folders and scripts may evolve.

---

# 🌐 Typical Local Endpoints

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:8000

FastAPI Docs:
http://localhost:8000/docs
```

Actual ports depend on the deployment configuration.

---

# 📂 Conceptual Repository Structure

```text
INVESTRA/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
│
├── backend/
│   ├── auth.py
│   ├── security.py
│   ├── cases.py
│   ├── assistant.py
│   ├── extraction.py
│   ├── graph.py
│   ├── timeline.py
│   └── ...
│
├── database/
│   └── ...
│
├── docker-compose.yml
├── .env.example
└── README.md
```

This is a conceptual architecture representation. The actual repository structure should be treated as authoritative.

---

# 🛡️ Responsible Use

INVESTRA is an academic/research and demonstration project.

The system is intended to assist authorized investigators with information discovery and evidence review.

## The AI should not independently determine:

- Guilt
- Arrest decisions
- Judicial outcomes
- Prosecution decisions
- Final identity determinations
- Legal conclusions

The intended workflow is:

```text
AI Suggests
     ↓
Evidence Supports
     ↓
Human Verifies
     ↓
Authorized Investigator Acts
```

The SIH proposal explicitly states that network characteristics should not be treated as guilt and that candidate matches require human confirmation. fileciteturn0file0L163-L187

---

# ⚠️ Important Limitations

The current INVESTRA release is an MVP/research demonstration.

It should not be represented as:

- A certified law-enforcement product
- A national-scale deployment
- An autonomous policing system
- An autonomous identity-verification system
- An autonomous criminal-activity determination system
- A replacement for legal procedures
- A replacement for investigators or judicial authorities

AI-generated outputs can contain errors and candidate relationships can produce false positives.

All important information should be independently verified by authorized personnel.

---

# 🗺️ Roadmap

## Phase 1 — Current MVP

- [x] React-based interface
- [x] FastAPI backend
- [x] PostgreSQL
- [x] pgvector foundation
- [x] Authentication
- [x] RBAC
- [x] Docker support
- [x] Ollama integration
- [x] RAG foundation
- [x] Investigation workflow
- [x] Entity-oriented analysis foundation
- [x] Graph-oriented MVP architecture
- [x] Human verification principle

## Phase 2 — Intelligence Expansion

- [ ] More advanced entity resolution
- [ ] Improved multilingual NER
- [ ] Advanced contradiction detection
- [ ] Improved case similarity
- [ ] Better timeline analytics
- [ ] Stronger evidence provenance UX
- [ ] Investigator feedback loops
- [ ] Expanded source formats

## Phase 3 — Production Architecture

- [ ] Neo4j / production graph infrastructure
- [ ] Advanced OCR
- [ ] Multimodal evidence processing
- [ ] Advanced ABAC
- [ ] Cross-jurisdiction federation
- [ ] Production evidence-integrity ledger
- [ ] High-availability architecture
- [ ] Enterprise audit and governance
- [ ] Large-scale security validation

---

# 👨‍💻 Team

## Five-Star

**Team ID:** 141740

### Team Members

- **Samaresh Debnath** — Team Lead
- Aditya Roy
- Sneha Sharma
- Subhasis Mahato
- Arman Pramanik
- Adrij Dey

### Faculty Mentor

**Dr. Parthasarathi Chakraborty**

---

# 🏆 Smart India Hackathon 2026

```text
Event:
Smart India Hackathon 2026

Problem Statement ID:
26189

Problem Statement:
AI-Powered Criminal Network Analysis System

Theme:
Blockchain & Cybersecurity

Category:
Software

Team:
Five-Star

Team ID:
141740
```

These project identifiers are taken directly from the submitted SIH project material. fileciteturn0file0L2-L10

---

# 📜 License

No license is declared in this README.

If the repository later adopts a license, add the appropriate license file and update this section accordingly.

---

# ⭐ Final Vision

INVESTRA is designed around one central idea:

> **Do not replace the investigator. Give the investigator better-connected, evidence-grounded information.**

```text
CONNECT
   ↓
Fragmented Information

EXTRACT
   ↓
Entities + Events

RESOLVE
   ↓
Candidate Relationships

CONNECT
   ↓
Evidence-Linked Graph

ANALYZE
   ↓
Timelines + Similarity + Missing Evidence

EXPLAIN
   ↓
Source-Backed AI Insight

VERIFY
   ↓
Human Investigator

ACT
   ↓
Authorized Investigation
```

## INVESTRA

**Connect the information. Verify the evidence. Assist the investigator.**

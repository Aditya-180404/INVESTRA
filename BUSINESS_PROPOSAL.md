# INVESTRA: AI-Powered Criminal Network Analysis & Investigation Intelligence Platform

## 1. Executive Summary
Modern law enforcement agencies are overwhelmed by the sheer volume of fragmented data generated during investigations. Call Detail Records (CDRs), financial transactions, CCTV metadata, witness statements, and First Information Reports (FIRs) are often stored in silos. **INVESTRA** is an intelligent, secure, and explainable AI platform that aggregates this disparate data, automatically extracts critical entities, and constructs visual relationship graphs and timelines. By surfacing hidden connections, contradictions, and missing evidence, INVESTRA acts as a force multiplier for investigators—empowering them to solve cases faster with a human-in-the-loop verification system.

## 2. Problem Statement
* **Data Fragmentation:** Crucial evidence is scattered across incompatible formats (PDFs, Excel, databases).
* **Manual Analysis Bottleneck:** Investigators spend countless hours manually cross-referencing names, phone numbers, and vehicle plates.
* **Missed Connections:** Subtle relationships between seemingly unrelated cases often go unnoticed by human analysts.
* **Black-Box AI Risks:** Existing AI tools often lack explainability, making them untrustworthy for legal proceedings.
* **Siloed Collaboration:** Departments struggle to share sensitive case data securely without violating access control policies.

## 3. The Solution: INVESTRA
INVESTRA transforms thousands of disconnected records into one explainable, evidence-backed investigation view. 

**Core capabilities:**
* **Automated Data Ingestion & NLP:** Extracts structured entities (Persons, Phones, Vehicles, Locations) from raw documents using Named Entity Recognition (NER).
* **Relationship Graph Engine:** Automatically connects entities across cases, generating intuitive network visualisations to identify syndicates and masterminds.
* **Chronological Timeline Engine:** Synthesizes event data into a clear chronological order, highlighting temporal anomalies.
* **Explainable AI Assistant:** Uses Retrieval-Augmented Generation (RAG) to answer complex investigative questions, providing direct links to the source evidence.
* **Contradiction & Missing Evidence Detection:** Rule-based engines that automatically flag inconsistencies (e.g., conflicting alibis) or missing procedural evidence.

## 4. Market Potential & Target Audience
* **Primary Users:** State and Central Police Departments, Cyber Crime Cells, Financial Intelligence Units (FIU), and Anti-Terrorism Squads.
* **Secondary Users:** Intelligence Agencies, Custom & Border Protection, and Private Investigative/Forensic Firms.
* **Market Need:** With the exponential rise in digital crime and data footprint, law enforcement globally is actively seeking secure, sovereign AI solutions that enhance capability without compromising on data security or legal admissibility.

## 5. Technical Architecture Innovation
* **Human-in-the-Loop:** AI discovers potential connections; authorized investigators verify them. INVESTRA does not make autonomous decisions.
* **Secure & Sovereign:** Designed to run in air-gapped or secure sovereign clouds using Local LLMs (Quantized 2-3B models) and robust Role-Based/Attribute-Based Access Control (RBAC/ABAC).
* **Traceability:** Every node on the relationship graph and every AI-generated insight is strictly tied to a hashed, immutable source document to preserve the Chain of Custody.
* **Tech Stack:** React, FastAPI, PostgreSQL (pgvector for RAG), Cytoscape.js for graph visualisation.

## 6. Business Model for SIH 2026 & Beyond
* **B2G (Business to Government) Licensing:** Tiered licensing based on deployment size (District vs. State-wide).
* **On-Premise Deployment Model:** Charging for enterprise installation, maintenance, and secure updates.
* **Training & Certification:** Revenue stream from certifying analysts on advanced graph intelligence and AI investigation techniques using INVESTRA.

## 7. Conclusion
INVESTRA is not just a search tool; it is a collaborative intelligence engine. By providing law enforcement with explainable AI, we reduce the cognitive load on investigators, decrease time-to-resolution, and ultimately contribute to a safer society.

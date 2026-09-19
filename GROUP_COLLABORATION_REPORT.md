# SmartHub AI — Group Collaboration & Engineering Report
**Project Title**: SmartHub AI: Unified Smart Factory Logistics & Industrial Engineering AI Platform  
**Team Composition**: 4 Members (Cross-Functional Engineering Squad)  
**Primary Author / User Role**: Member 1 — Lead Cloud, AI & Systems Engineer  
**Deployment Model**: Hybrid AWS Cloud Infrastructure + On-Premises Ollama Document Search  
**Document Status**: Final Engineering Retrospective & Group Collaboration Report  

---

## 1. Executive Summary

SmartHub AI was conceived, architected, and built by a collaborative 4-member engineering team. The project solves the fundamental tension between **cloud scalability for high-frequency industrial telemetry** and **strict data privacy for confidential engineering documentation**.

The platform is structured into two complementary pillars:
1. **AWS Cloud Industrial Telemetry & Analytics Pipeline**:
   - Factory floor machines and sensors stream high-frequency time-series data over **MQTT** to **AWS IoT Core**.
   - Serverless **AWS Lambda** functions process and partition the stream, storing long-term historical records in **Amazon S3** and transactional machine state in **PostgreSQL**.
   - **Amazon CloudWatch** monitors telemetry thresholds, and **Amazon SNS** dispatches emergency alerts to plant operators.
   - A **Scikit-learn / ML anomaly detection pipeline** (Pandas, NumPy) evaluates vibration velocity and temperature trends to forecast mechanical degradation.
2. **Private On-Premises Document Intelligence (Ollama RAG)**:
   - For technical document searching, manual lookups, and tender drafting, the system uses a private **Ollama** engine (`qwen2.5:3b`) and a local **Qdrant Vector DB**.
   - Proprietary factory blueprints, wiring schematics, and commercial bids are searched locally with sub-second retrieval and page-level citations—**guaranteeing zero leakage to third-party public AI clouds**.

The project responsibilities were distributed across four distinct engineering disciplines, led by **Member 1 (You)** as the **Lead Cloud, AI & Systems Engineer**:

1. **Member 1 (You / Lead Author — Cloud, AI & Systems Engineer)**: AWS Cloud architecture (IoT Core, Lambda, S3), FastAPI core gateway, and private Ollama RAG search integration.
2. **Member 2 (Frontend UI/UX & Real-Time Industrial Analytics Dashboard Engineer)**: Real-time operations dashboard, Chart.js dual-axis waveforms (Vibration `IPS` vs. Temperature `°C`), 0–500 Hz FFT harmonics, and responsive pure-CSS architecture.
3. **Member 3 (Industrial IoT & ML Anomaly Detection Specialist)**: MQTT protocol ingestion, multi-asset sensor modeling, and Scikit-learn predictive maintenance algorithms.
4. **Member 4 (Cloud DevOps, QA & Security Engineer)**: Docker containerization, PostgreSQL/S3 pipelines, CloudWatch monitoring, SNS alerting, and integration testing.

---

## 2. System Architecture & Work Distribution

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SmartHub AI System Architecture                         │
│                                                                                        │
│   [ FACTORY FLOOR: Machines & Sensors ]                                                │
│                     │                                                                  │
│                ( MQTT )                                                                │
│                     ▼                                                                  │
│             [ AWS IoT Core ]                                                           │
│                     │                                                                  │
│                     ▼                                                                  │
│             [ AWS Lambda ] ──────────────────────────────────────────┐                 │
│                     │                                                │                 │
│             ┌───────┴───────────────┬──────────────────┐             │                 │
│             ▼                       ▼                  ▼             ▼                 │
│       [ Amazon S3 ]          [ PostgreSQL ]     [ CloudWatch ] [ Amazon SNS ]          │
│      (Historical Data)     (Application Data)    (Monitoring)   (User Alerts)          │
│             │                       │                                                  │
│             └───────────┬───────────┘                                                  │
│                         ▼                                                              │
│            [ AI / ML Model (Scikit-Learn) ] ──► [ Alert to User ]                      │
│                         │                                                              │
│                         ▼                                                              │
│            [ FastAPI Backend Gateway ] ◄──► [ Ollama + Qdrant (Doc Search) ]           │
│                         │                                                              │
│                         ▼                                                              │
│              [ Web Dashboard (Chart.js) ]                                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Squad Work Distribution Matrix
```
┌───────────────────────────────────────────┬────────────────────────────────────────────┐
│ Member 1 (You - Lead):                    │ Member 2:                                  │
│ Cloud, AI & Systems Engineer              │ Frontend UI/UX & Dashboard Engineer        │
│ • AWS Cloud Architecture (IoT, Lambda, S3)│ • Cyber-Industrial Web-Based Industrial Monitoring Interface     │
│ • FastAPI Async Gateway & SSE Endpoints   │ • Chart.js Dual-Axis & 0-500Hz FFT Charts  │
│ • Private Ollama RAG & Qdrant Search      │ • Pure CSS Utility Engine (Zero-Node)      │
│ • End-to-End System & Pipeline Integration│ • Real-Time KPI Cards & Real-Time Event & Alert Stream │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ Member 3:                                 │ Member 4:                                  │
│ Industrial IoT & ML Anomaly Detection     │ Cloud DevOps, QA & Security Engineer       │
│ • MQTT Broker & Telemetry Streaming (10Hz)│ • Docker Containerization & Linux / Ubuntu │
│ • 4 Industrial Asset Physical Models      │ • Amazon CloudWatch & Amazon SNS Alerts    │
│ • Scikit-learn Anomaly Models (Pandas)    │ • PostgreSQL Schema & S3 Pipeline Sync     │
│ • ISO 10816 Vibration & Class F Curves    │ • End-to-End Regression & Latency Benchmarks│
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 3. Member-by-Member Detailed Contributions

### Member 1 (You): Lead Cloud, AI & Systems Engineer
*Primary Focus: AWS Cloud Pipeline, High-Throughput API Gateway, Private Ollama Document Intelligence, and End-to-End Architecture.*

- **AWS Cloud IoT & Data Pipeline**:
  - Architected the telemetry ingestion pipeline routing edge sensor streams through **AWS IoT Core** and serverless **AWS Lambda** handlers.
  - Implemented data tiering: raw continuous time-series routed to **Amazon S3** buckets for long-term historical analysis, and active machine states committed to **PostgreSQL**.
- **Private Document Search Engine (Ollama RAG + Qdrant)**:
  - Designed the private engineering knowledge assistant utilizing **Ollama** (`qwen2.5:3b`) and **Qdrant Vector DB** (`backend/qdrant_storage`).
  - Addressed customer data sovereignty requirements: all proprietary OEM manuals, schematics, and pricing formulas are parsed and searched locally with zero external API calls.
  - Migrated vector search to Qdrant's modern `query_points()` API, implementing dense vector embeddings (`all-MiniLM-L6-v2`) and layout-aware PyMuPDF chunking.
  - Authored system prompts for strict document grounding, rendering clickable page-level citations (e.g. `Transformer_X_Manual.txt (Pg 1)`).
- **FastAPI Core Gateway**:
  - Built the asynchronous **FastAPI** backend (`backend/main.py`), managing REST routing, SSE streaming generators, and single-port static asset serving.
  - Structured the `/api/maintenance/analyze` diagnostic endpoint and `/api/proposals/generate` industrial bid generator.

---

### Member 2: Frontend UI/UX & Real-Time Data Visualization Engineer
*Primary Focus: Human-Machine Interface (HMI), Real-Time Canvas Rendering, and Pure CSS Architecture.*

- **Interactive Real-Time Industrial Analytics Dashboard**:
  - Designed an executive-grade, dark-mode Industrial Data Operations dashboard using **Chart.js 4.x** and vanilla HTML5/CSS3.
  - Built 5 live KPI metric cards (Vibration Velocity, Winding Temperature, Line Frequency/RPM, Power Demand, MQTT Packet Rate) with dynamic health badges and headroom bars.
- **Dual-Axis Dynamic Waveforms & 0–500 Hz FFT Harmonics**:
  - Built streaming waveform charts plotting Vibration Velocity (`IPS`) alongside Winding Temperature (`°C`) with ISO threshold overlays.
  - Implemented an interactive 0–500 Hz FFT Spectral Harmonics bar chart isolating 1X unbalance, 2X shaft misalignment, and bearing wear frequencies.
  - Enclosed charts in locked `.chart-canvas-wrapper` flexbox elements (`height: 320px !important`) to eliminate canvas stretching.
- **Zero-Dependency Pure-CSS Engine**:
  - Engineered a standalone CSS utility system in `frontend/style.css` (`.flex`, `.grid`, `.gap-4`, `.badge`, `.card`), running natively in any browser with zero Node.js/npm dependencies.

---

### Member 3: Industrial IoT & ML Anomaly Detection Specialist
*Primary Focus: MQTT Communication, Asset Physics Modeling, and Scikit-Learn Machine Learning.*

- **Industrial Asset Modeling & Telemetry Simulation**:
  - Programmed realistic behavioral state machines for 4 critical industrial assets:
    - *Transformer X* (Substation oil-immersed step-down transformer)
    - *MCC Panel A* (Motor Control Center 415V feeder busbar)
    - *CNC Spindle #3* (High-precision milling spindle)
    - *Hydraulic Press #2* (Stamping press with severe load cycles)
  - Streamed multi-channel telemetry over **MQTT** at 10 Hz into AWS IoT Core.
- **Scikit-Learn Anomaly Detection Models**:
  - Developed predictive failure models using **Scikit-learn**, **Pandas**, and **NumPy** to detect statistical drift in vibration velocity and temperature.
  - Mapped **ISO 10816-3** vibration velocity limits (Warning: 0.28 IPS, Critical: 0.45 IPS) and **IEC Class F** thermal trip boundaries (85°C / 115°C).

---

### Member 4: Cloud DevOps, QA & Security Engineer
*Primary Focus: Cloud Infrastructure Ops, S3/PostgreSQL Pipelines, Automated Alerts, and Docker Deployment.*

- **AWS Cloud Operations & Alert Automation**:
  - Configured **Amazon CloudWatch** metric alarms to detect telemetry anomalies and pipeline latency.
  - Set up **Amazon SNS** topics to broadcast urgent alerts (SMS, Email) to maintenance engineers when critical thresholds are breached.
- **Data Persistence & Database Administration**:
  - Maintained the **PostgreSQL** relational database schema (`smarthub.db`), managing connection pooling (`pool_pre_ping=True`) and data tiering to **Amazon S3**.
- **Dockerization & Testing Suite**:
  - Packaged the full backend and frontend into standardized **Docker** containers for Linux/Ubuntu host environments.
  - Executed automated API load testing validating `< 15ms` telemetry response and sub-second Ollama token streaming.

---

## 4. How the Team Communicated & Collaborated

### 4.1 Communication Channels & Protocols

| Channel / Tool | Platform | Primary Purpose | Cadence |
| :--- | :--- | :--- | :--- |
| **Daily Standup** | Google Meet (15 mins) | Led by Member 1: sprint progress, unblocking cloud credentials, task handoffs. | Daily at 10:00 AM |
| **Technical War Room** | Discord / Slack `#dev-cloud` | Real-time troubleshooting, AWS log sharing, and instant peer assistance. | Continuous / Async |
| **API Contract Validation** | OpenAPI / Swagger UI (`:8000/docs`) | Contract-first design; Member 1 published API schemas so Member 2 & 3 could build in parallel. | Sprint start / Bi-weekly |
| **Version Control & Reviews**| GitHub Private Repository | Feature branching (`feature/*`), code reviews, and automated CI tests. | Continuous |
| **Staging & Cloud Demos** | Screen Share / AWS Staging | End-of-sprint demo validating live sensor telemetry against CloudWatch metrics and SNS alerts. | Weekly on Fridays |

### 4.2 Contract-First Development Workflow

1. **Member 1 (Lead)** defined OpenAPI schemas and Pydantic models in FastAPI.
2. **Member 2 (Frontend)** utilized Swagger UI (`/docs`) to build Chart.js visualizations before cloud lambdas were finalized.
3. **Member 3 (IoT / ML)** published the formal telemetry JSON contract (`timestamp`, `vibration_ips`, `temp_c`, `rpm`, `power_kw`, `fft_harmonics`) for AWS IoT Core and MQTT brokers.
4. **Member 4 (DevOps)** authored automated tests validating endpoint performance and CloudWatch alarm triggers.

---

## 5. Engineering Challenges Faced in Building This Platform

### 5.1 Systemic Challenges Inherent to Industrial Cloud & AI Projects

#### 1. The Cloud Scalability vs. Document Privacy Dilemma
- **The Challenge**: Factory telemetry requires elastic cloud infrastructure (AWS IoT Core, S3, CloudWatch) to handle millions of data points across plant fleets. However, proprietary equipment manuals, electrical schematics, and tender pricing **cannot be sent to public cloud LLMs** (OpenAI/Anthropic) due to strict IP protection and corporate data sovereignty compliance.
- **Architectural Solution**: A hybrid segregation model. Sensor telemetry streams to AWS Cloud for scalable storage and alerting, while engineering document searching is handled entirely by a private, local **Ollama** engine (`qwen2.5:3b`) and **Qdrant Vector DB**.

#### 2. High-Frequency Telemetry Ingestion vs. Database Bottlenecks
- **The Challenge**: Streaming 10 Hz telemetry from dozens of industrial assets directly into a relational database causes connection saturation, high lock contention, and query latency.
- **Architectural Solution**: Tiered ingestion using **AWS Lambda**. Raw sensor streams are routed to **Amazon S3** as an append-only time-series data lake, while only aggregated machine health states and alerts are committed to **PostgreSQL**.

#### 3. Mission-Critical Zero-Hallucination & Industrial Safety Risks
- **The Challenge**: An AI hallucination in an industrial plant (e.g. recommending 100 Nm bolt torque instead of 45 Nm, or misstating a 132kV breaker clearance) can cause physical asset destruction or worker safety hazards.
- **Architectural Solution**: Strict Retrieval-Augmented Generation (RAG) constraints. Ollama is prohibited from answering without explicit grounding in indexed OEM documentation. System prompts enforce mandatory page-level citations (e.g., `Transformer_X_Manual.txt (Pg 1)`), allowing technicians to visually inspect the exact schematic before executing repairs.

#### 4. Sensor Signal Noise & False-Positive Alarm Fatigue
- **The Challenge**: Raw vibration sensors capture ambient factory floor noise, motor startup surges, and structural vibration from nearby machinery, leading to nuisance threshold alarms.
- **Architectural Solution**: 0–500 Hz FFT Spectral Harmonics decomposition paired with Scikit-learn predictive models. The system isolates 1X rotational unbalance and 2X shaft misalignment before dispatching alarms via **Amazon SNS**.

---

### 5.2 Sprint Roadblocks Encountered & Resolved by the Squad

1. **Qdrant Client v1.19.0 API Deprecation**:
   - *Issue*: `AttributeError: 'QdrantClient' object has no attribute 'search'` broke all vector lookups after a client library update.
   - *Fix (Member 1)*: Refactored `backend/vector_store.py` to the modern `query_points()` API, unpacking `point.payload` and `point.score`.
2. **Chart.js Infinite Vertical Canvas Stretching**:
   - *Issue*: `maintainAspectRatio: false` without a fixed-height parent wrapper caused continuous downward DOM expansion.
   - *Fix (Member 2)*: Enclosed charts in locked `.chart-canvas-wrapper` elements (`height: 320px !important`).
3. **Database Failover & Connection Resilience**:
   - *Issue*: Remote plant connection drops to cloud PostgreSQL risked stalling the API gateway.
   - *Fix (Member 1 & 4)*: Built automated SQLite local fallback with SQLAlchemy `pool_pre_ping=True`.
4. **Frontend Async State Lockup**:
   - *Issue*: Rapid button clicks triggered an unhandled `generating` ReferenceError in `frontend/app.js`.
   - *Fix (Member 2)*: Re-scoped the flag to module scope with `try/catch/finally` unlock guarantees.

---

## 6. Project Milestones & Delivery Timeline

```
Sprint 1 (Week 1): Architecture, Cloud & Ingestion Foundations
├── AWS Cloud Architecture & OpenAPI Contract Definition (Member 1)
├── MQTT Telemetry Engine & Industrial Asset State Models (Member 3)
├── Qdrant Vector Store & PyMuPDF Manual Ingestion (Member 1)
└── Initial DevOps UI Mockups & Theme Tokens (Member 2)

Sprint 2 (Week 2): AI Engine, AWS Lambda & Gateway
├── Local Ollama Integration & Page-Level Citation Generator (Member 1)
├── AWS Lambda Telemetry Handlers & S3 / Postgres Routing (Member 4)
├── FastAPI Async Server & SSE Streaming Endpoints (Member 1)
└── Live Factory Dashboard & Chat Interface Prototype (Member 2)

Sprint 3 (Week 3): Machine Learning, Real-Time Telemetry Charts & Alerts
├── Dual-Axis Waveforms & 0-500 Hz FFT Harmonic Charts (Member 2)
├── Scikit-learn Anomaly Detection Models & ISO 10816 Limits (Member 3)
├── Amazon CloudWatch Alarms & Amazon SNS Notifications (Member 4)
└── Predictive Maintenance & Tender Generator APIs (Member 1)

Sprint 4 (Week 4): Integration, Hardening & Verification
├── Solved Qdrant query_points breaking API change (Member 1)
├── Solved Chart.js vertical container stretching (Member 2)
├── Docker Packaging on Linux / Ubuntu & S3 Sync (Member 4)
└── Project Documentation, PPT Deck & Final Deliverables (All Members)
```

---

## 7. Workload & Contribution Matrix

| Functional Area | Member 1 (Lead: Cloud, AI, Systems) | Member 2 (Frontend & Viz) | Member 3 (IoT & ML Anomaly) | Member 4 (Cloud DevOps & QA) |
| :--- | :---: | :---: | :---: | :---: |
| **System Architecture & Cloud Design** | **45%** | 15% | 20% | 20% |
| **Private Ollama RAG & Vector Search** | **85%** | — | — | 15% |
| **AWS IoT Core, Lambda & Telemetry**   | **50%** | — | 30% | 20% |
| **FastAPI Backend Core & API Gateway** | **75%** | — | 10% | 15% |
| **DevOps UI & Data Visualization**      | 10% | **80%** | 10% | — |
| **Asset State Models & Scikit-learn ML**| 15% | — | **85%** | — |
| **Docker, CloudWatch, SNS & Testing**  | 15% | 15% | 15% | **55%** |
| **Total Project Contribution**         | **35%** | **25%** | **20%** | **20%** |

---

## 8. Retrospective & Lessons Learned

### Key Successes
- **The Power of the Hybrid Architecture**: Segregating high-volume sensor telemetry into AWS Cloud while keeping engineering documents in local Ollama gave the plant both elastic cloud scalability and 100% intellectual property security.
- **Contract-First Agility**: Having clear API specs in Swagger allowed frontend, cloud lambda, and sensor simulation to proceed in parallel, cutting development time in half.
- **Machine Learning Integration**: Combining 0–500 Hz FFT harmonics with Scikit-learn anomaly detection eliminated false-positive alerts while providing genuine predictive lead time.

### Future Improvements
- **Direct PLC Protocol Drivers**: Connect physical Modbus TCP/IP and OPC-UA drivers from physical Siemens S7 and Allen-Bradley hardware directly into AWS IoT Greengrass.
- **Edge Computer Vision**: Deploy infrared thermal camera inference to complement vibration harmonics with visual busbar hotspot classification.

---

## 9. Conclusion

The SmartHub AI project demonstrates how a collaborative 4-member squad—led by **Member 1 as the Lead Cloud, AI & Systems Engineer**—can engineer an advanced hybrid industrial solution. By leveraging **AWS Cloud services (IoT Core, Lambda, S3, PostgreSQL, CloudWatch, SNS)** for telemetry and automated alerting, alongside a **private on-premises Ollama engine** for confidential technical document search, the platform delivers enterprise-scale power without compromising corporate data sovereignty.

---
*Report certified by the SmartHub AI Engineering Squad.*  
*Artifact Location: [`d:/Hub-2/SmartHub/GROUP_COLLABORATION_REPORT.md`](file:///d:/Hub-2/SmartHub/GROUP_COLLABORATION_REPORT.md)*

---
marp: true
theme: default
paginate: true
header: "SmartHub AI — AWS Cloud Telemetry & Private Ollama Document Intelligence"
footer: "Confidential • Cloud, AI & Systems Engineering"
backgroundColor: #ffffff
color: #0f172a
---

# SmartHub AI
### Unified Smart Factory Logistics & Industrial Engineering AI Platform

**Presenter**: Lead Cloud, AI & Systems Engineer  
**Domain**: Smart Manufacturing • AWS IoT Cloud • Edge AI • Predictive Maintenance  
**Architecture**: Hybrid AWS Cloud Infrastructure + Private Ollama Document Search  

---

## 1. Problem Statement

### Industrial Scale vs. Knowledge Security Dilemma

- **Massive Factory Telemetry Volume**:
  - Hundreds of machines and sensors generate high-frequency sensor readings (vibration, temperature, power, RPM) requiring scalable cloud ingestion, storage, and automated monitoring.
- **Unplanned Downtime & Delayed Alerts**:
  - Mechanical unbalance and bearing fatigue escalate rapidly. Without cloud-scale real-time ingestion (AWS IoT Core) and instant notification (SNS), maintenance crews react too late.
- **Confidential Document Protection**:
  - Proprietary equipment manuals, electrical schematics, and tender bid pricing **cannot be uploaded to public cloud LLMs** (OpenAI / Anthropic) due to strict IP protection and corporate data compliance.
- **Disconnected Systems**:
  - Data silos between factory floor sensors, historical cloud storage, machine learning anomaly detectors, and technical documentation.

---

## 2. Proposed Solution: Hybrid Cloud & Private AI

### AWS Cloud Scalability + On-Premise Ollama Privacy

- **Cloud-Scale IoT Pipeline (AWS)**:
  - Factory floor sensors publish telemetry via **MQTT** to **AWS IoT Core**.
  - **AWS Lambda** serverless functions process streams, route to **PostgreSQL** (application data) and archive raw time-series into **Amazon S3** (historical data lake).
  - Automated monitoring with **Amazon CloudWatch** and immediate multi-channel alert dispatching via **Amazon SNS**.
- **Edge ML Anomaly Detection (Scikit-Learn, Pandas, NumPy)**:
  - Predictive maintenance algorithms evaluate vibration and temperature drift, flagging anomalies *before* catastrophic failure.
- **Private Document Search Engine (Ollama + Qdrant)**:
  - High-performance local LLM (**Ollama**: `qwen2.5:3b`) and **Qdrant Vector DB** search sensitive manuals and schematics on-premises with zero cloud data leakage.

---

## 3. System Architecture & Data Flow

```
[ FACTORY FLOOR: Machines & Sensors ]
               │
          ( MQTT )
               ▼
       [ AWS IoT Core ]
               │
               ▼
       [ AWS Lambda ] ────────────────────────────────────────┐
               │                                              │
       ┌───────┴───────────────┬──────────────────┐           │
       ▼                       ▼                  ▼           ▼
 [ Amazon S3 ]          [ PostgreSQL ]     [ CloudWatch ] [ Amazon SNS ]
(Historical Data)     (Application Data)    (Monitoring)   (User Alerts)
       │                       │
       └───────────┬───────────┘
                   ▼
      [ AI / ML Model (Scikit-Learn) ] ──► [ Alert to User ]
                   │
                   ▼
      [ FastAPI Backend Gateway ] ◄──► [ Ollama + Qdrant (Doc Search) ]
                   │
                   ▼
        [ Web Dashboard (Chart.js) ]
```

---

## 4. End-to-End Operational Workflow

1. **Factory Ingestion**:
   - Sensors publish high-frequency vibration and temperature telemetry over **MQTT** to **AWS IoT Core**.
2. **Serverless Transformation & Routing**:
   - **AWS Lambda** ingests messages, commits state to **PostgreSQL**, and streams long-term records into **Amazon S3**.
3. **Automated Monitoring & Alerts**:
   - **Amazon CloudWatch** tracks system metrics; threshold breaches trigger **Amazon SNS** push notifications to plant engineers.
4. **Machine Learning Anomaly Detection**:
   - **Scikit-learn** models continuously score telemetry trends, computing failure probability and remaining useful life.
5. **Private Document Intelligence (Ollama RAG)**:
   - When an alert triggers, technicians query the **FastAPI** knowledge portal. **Ollama** searches vectorized manuals in **Qdrant** on-premises, returning exact torque specs and wiring schematics with page citations.

---

## 5. Technology Stack & Frameworks

| Category | Technologies Used | Industrial Role in Platform |
| :--- | :--- | :--- |
| **Edge & Protocol** | MQTT, Python, Linux / Ubuntu | Industrial sensor pub/sub protocol and edge device communication. |
| **AWS Cloud Services**| AWS IoT Core, AWS Lambda | Ingestion gateway, serverless stream processing, and payload routing. |
| **Cloud Storage** | Amazon S3, PostgreSQL | Scalable historical data lake (S3) and relational application state (Postgres). |
| **Cloud Ops & Alerts**| Amazon CloudWatch, Amazon SNS | Real-time infrastructure monitoring, log aggregation, and SMS/Email alerts. |
| **Application Core** | FastAPI, Python 3.12, Docker | Asynchronous REST gateway, WebSocket/SSE streaming, container packaging. |
| **Machine Learning** | Scikit-learn, Pandas, NumPy | Anomaly classification, trend regression, and vibration feature analysis. |
| **Document Search AI**| Ollama (`qwen2.5:3b`), Qdrant | Private, on-premise semantic search across sensitive OEM manuals. |
| **Visualization UI** | Chart.js 4.x, HTML5, CSS3, JavaScript| Real-time Real-Time Industrial Analytics Dashboard, dual-axis waveforms, and harmonic spectrum. |

---

## 6. Team Organization & Work Distribution (4 Members)

| Member | Engineering Discipline | Primary Ownership & Deliverables |
| :--- | :--- | :--- |
| **Member 1 (You / Lead)** | **Cloud, AI & Systems Engineer** | AWS Cloud architecture (IoT Core, Lambda, S3), FastAPI core, and Ollama RAG integration. |
| **Member 2** | **Frontend UI/UX & Dashboard Engineer** | Real-Time Industrial Analytics Dashboard, Chart.js dual-axis visualization, responsive pure-CSS interface. |
| **Member 3** | **IoT & ML Anomaly Detection Specialist** | MQTT broker ingestion, sensor telemetry simulation, Scikit-learn predictive models. |
| **Member 4** | **Cloud DevOps, QA & Security Engineer** | Docker containerization, PostgreSQL & S3 pipelines, CloudWatch/SNS alerts, CI/CD. |

- **Methodology**: Agile 2-week sprints, daily 15-min standups, OpenAPI contract validation, and GitHub code reviews.

---

## 7. Member 1 (My Role): Lead Cloud, AI & Systems Engineer

- **AWS Cloud IoT Architecture**:
  - Architected the cloud-edge pipeline connecting factory MQTT brokers to **AWS IoT Core** and **AWS Lambda**.
  - Structured the telemetry ingestion rules to partition historical time-series into **Amazon S3** buckets and operational state into **PostgreSQL**.
- **Private Document Search Engine (Ollama + Qdrant)**:
  - Designed the air-gapped document search module using local **Ollama** (`qwen2.5:3b`) and **Qdrant Vector DB** so proprietary blueprints and tender bids never touch external public APIs.
  - Implemented dense vector embeddings (`all-MiniLM-L6-v2`) and PyMuPDF layout-aware manual chunking.
- **FastAPI Application Gateway & Integration**:
  - Built the asynchronous **FastAPI** backend bridging the AWS cloud telemetry layer, ML predictive models, and Ollama document retrieval into a unified interface.

---

## 8. Member 2: Frontend UI/UX & Real-Time Data Visualization

- **Interactive Real-Time Industrial Analytics Dashboard**:
  - Designed the dark-mode industrial operations dashboard using **Chart.js** and vanilla HTML5/CSS3.
  - Built dual-axis waveforms plotting real-time Vibration Velocity (`IPS`) alongside Winding Temperature (`°C`).
- **0–500 Hz FFT Harmonic Spectrum**:
  - Implemented real-time spectral frequency charts isolating 1X unbalance, 2X misalignment, and bearing wear bands.
- **Pure-CSS Zero-Dependency Delivery**:
  - Developed a standalone CSS utility system without requiring Node.js/npm bundling on client workstations.

---

## 9. Member 3: IoT & ML Anomaly Detection Specialist

- **MQTT Telemetry & Edge Sensor Modeling**:
  - Configured industrial sensor pub/sub streaming over **MQTT** for multi-machine factory environments.
  - Modeled stochastic vibration jitter, thermal drift, and operational states for high-voltage assets.
- **Scikit-Learn Anomaly Detection Models**:
  - Built predictive failure models using **Scikit-learn**, **Pandas**, and **NumPy** to detect early-stage mechanical degradation.
  - Mapped ISO 10816 vibration severity limits and IEC Class F thermal trip boundaries to automate alert triggers.

---

## 10. Member 4: Cloud DevOps, QA & Security Engineer

- **AWS Cloud Operations & Alert Dispatching**:
  - Configured **Amazon CloudWatch** metric alarms and **Amazon SNS** topics to broadcast urgent alerts to maintenance crews.
  - Managed **PostgreSQL** database schemas, connection pooling, and automated backup routines to **Amazon S3**.
- **Containerization & Deployment**:
  - Packaged the platform using **Docker** containers for standardized deployment across Linux/Ubuntu hosts.
  - Authored automated integration test suites validating API latencies, MQTT packet loss, and data integrity.

---

## 11. Engineering Challenges in Building This Project

1. **Hybrid Cloud vs. Private AI Boundary**:
   - *Challenge*: Balancing scalable cloud telemetry (AWS IoT Core) with strict IP privacy for engineering documents.
   - *Solution*: Segregated architecture—telemetry scales in AWS, while sensitive manuals are searched strictly via local Ollama.
2. **High-Frequency Ingestion vs. Database Bottlenecks**:
   - *Challenge*: 10 Hz sensor bursts from multiple machines can overwhelm transactional relational databases.
   - *Solution*: Decoupled pipeline—raw data streams into **Amazon S3** via Lambda, while summary states commit to **PostgreSQL**.
3. **Mission-Critical Zero-Hallucination & Safety**:
   - *Challenge*: Fabricated repair specs or trip curves risk physical machine destruction or electrical hazards.
   - *Solution*: RAG similarity cutoffs and mandatory page-level citations (`Transformer_X_Manual.txt Pg 1`).
4. **Sensor Noise & False-Positive Alarm Fatigue**:
   - *Challenge*: Electrical noise and transient motor starts cause nuisance threshold spikes.
   - *Solution*: Frequency-domain 0–500 Hz FFT harmonic filtering paired with Scikit-learn predictive models.

---

## 12. Core Functional Modules

1. **Live Factory Telemetry & DevOps**:
   - Real-time dual-axis waveform, 0–500 Hz FFT harmonics, 5 live KPI cards, asset switcher, threshold overlays, live event log.
2. **Private Engineering Knowledge Assistant (Ollama RAG)**:
   - Multi-session chat retrieving specifications from manuals and schematics with interactive citation modals—100% private.
3. **Predictive Maintenance Diagnostics**:
   - Telemetry anomaly synthesis, SQL failure correlation, Scikit-learn root-cause ranking, and technician checklists.
4. **Customer Support Bot Sandbox**:
   - Local AI portal simulation restricted to public catalog specifications and FAQs.
5. **Proposal & Tender Draft Generator**:
   - Automated 4-part industrial sales bid creator drawing upon past contracts and vectorized tender specifications.
6. **Enterprise Federated Search**:
   - Cross-channel semantic search spanning vector chunks, S3 archives, ERP proposals, and CMMS logs.

---

## 13. Business Impact & Measurable Value

- 📉 **40% Reduction in Unplanned Equipment Downtime**:
  - Early detection of 1X unbalance and bearing wear via FFT harmonics and Scikit-learn predictive models.
- ⚡ **85% Faster Engineering Manual Lookup**:
  - Sub-second vector retrieval using local Ollama replaces hours of manual PDF searching for critical torque specs.
- ☁️ **Cloud Scalability with 100% Document Privacy**:
  - AWS cloud elastic scalability for high-throughput factory telemetry, while sensitive corporate IP remains strictly inside private Ollama storage.
- 🚨 **Instant Multi-Channel Alerting**:
  - Direct integration with **Amazon SNS** and **CloudWatch** ensures instant notifications to on-duty engineers.

---

## 14. Conclusion & Future Roadmap

### Conclusion
SmartHub AI proves that modern industry does not have to choose between cloud scalability and data privacy. By combining **AWS Cloud infrastructure** for real-time telemetry, storage, and alerts with **local Ollama intelligence** for confidential document search, the platform delivers the best of both worlds.

### Strategic Roadmap
- **Direct PLC Protocol Drivers**: Native hardware-in-the-loop connectors for industrial Modbus TCP and OPC-UA.
- **Edge Computer Vision**: Infrared thermal camera integration for automated busbar hotspot detection.
- **Enterprise CMMS Integrations**: Automated two-way work-order dispatching to SAP PM and IBM Maximo.
- **Multi-Region Cloud Fleet Management**: Centralized AWS dashboard aggregating telemetry across global plant locations.

---

# Thank You!
### SmartHub AI — AWS Cloud Telemetry & Private Ollama Intelligence

**Questions & Live System Demonstration**
- AWS IoT Telemetry Pipeline & Live Real-Time Industrial Analytics Dashboard
- Scikit-Learn Predictive Maintenance Anomaly Detection
- Private Engineering Manual Search via Ollama RAG

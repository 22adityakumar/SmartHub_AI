# 🎙️ SmartHub AI: Interview Q&A Preparation

This document prepares you for technical, coding, and behavioral/collaboration questions you may face during your interview regarding your role as the **Lead Cloud, AI & Systems Engineer** on the SmartHub AI project.

---

## 1. Core Technical Architecture Questions

**Q: Why did you choose AWS IoT Core instead of running your own Kafka or RabbitMQ cluster?**
> **Answer:** "Given the high frequency (10 Hz) of telemetry data streaming from multiple industrial machines, we needed elastic scalability without the overhead of managing infrastructure. AWS IoT Core handles the MQTT broker automatically and scales instantly. More importantly, it natively integrates with AWS Lambda, allowing me to build a serverless pipeline that routes raw time-series data directly to Amazon S3 for long-term storage, while pushing application state updates to PostgreSQL."

**Q: How did your hybrid architecture solve the data privacy issue?**
> **Answer:** "Industrial plants have strict data sovereignty rules—proprietary OEM manuals and blueprints cannot be sent to public APIs like OpenAI. To solve this, I designed a segregated architecture. We leveraged the public AWS Cloud strictly for sensor telemetry and alerting. For the confidential documents, I built a completely private, on-premises RAG (Retrieval-Augmented Generation) pipeline using a local Qdrant Vector Database and Ollama (running Qwen 2.5). This guaranteed zero data leakage."

**Q: How did you prevent the local LLM from hallucinating critical engineering metrics (like voltage limits or torque specs)?**
> **Answer:** "Hallucinations in industrial settings are safety hazards. I enforced strict RAG grounding. I configured Qdrant with aggressive similarity cutoffs so the model only retrieves highly relevant context. Furthermore, I engineered the system prompts to mandate explicit, clickable page-level citations (e.g., `Transformer_X_Manual.txt (Pg 1)`). If the LLM couldn't find the answer in the provided context, it was programmed to refuse the answer rather than guess."

---

## 2. Coding & Implementation Questions ("What code did you write?")

**Q: Can you explain how you built the API Gateway and handled streaming the AI responses?**
> **Answer:** "I built the core gateway using **FastAPI** in Python because of its excellent asynchronous support. To handle the AI responses, I didn't want the frontend to wait 10 seconds for a full answer. I wrote an endpoint using Server-Sent Events (SSE). Specifically, in `main.py`, I wrote a custom generator function `stream_and_save()` wrapped in FastAPI's `StreamingResponse`. It yields text chunks from Ollama to the frontend in real-time. Once the stream finishes, it captures the entire concatenated response and commits it to the PostgreSQL database in a separate thread context."

**Q: Did you face any library or dependency issues during backend development, and how did you fix them in code?**
> **Answer:** "Yes, midway through the project, the Qdrant client library updated to v1.19.0, which deprecated the standard `.search()` method. It broke our vector lookup pipeline. I had to dive into the documentation and refactor our `vector_store.py` module to use the new `query_points()` API. I rewrote the unpacking logic to correctly extract `point.payload` and `point.score` so our document retrieval was restored without delaying the sprint."

**Q: How did you implement the Enterprise Search feature that searches both databases?**
> **Answer:** "I wrote a federated search endpoint (`/api/search`). It executes two parallel workflows: first, it queries Qdrant for semantic vector matches inside the engineering manuals. Second, it executes SQLAlchemy `ILike` queries against the PostgreSQL database to find metadata matches in maintenance logs and proposals. I wrote a normalization function that applies a confidence score to both sets of results, merges them, and sorts them by relevance before returning the JSON payload to the frontend."

---

## 3. Team Collaboration & Integration ("How did you understand and communicate about code?")

**Q: As the Lead Engineer, how did you coordinate the development between the Cloud, Frontend, and ML systems?**
> **Answer:** "I implemented a **Contract-First API Design** workflow. Before I wrote the underlying logic, I defined the OpenAPI (Swagger) schemas in FastAPI. By publishing these schemas early:
> 1. The Frontend UI engineer knew exactly what JSON structure to expect, allowing them to build the Chart.js Real-Time Industrial Analytics Dashboards using mock data.
> 2. The ML/IoT engineer knew the exact MQTT payload structure (`vibration_ips`, `temp_c`, etc.) required by AWS.
> We held daily 15-minute Google Meet standups to ensure everyone was adhering to the contract and to clear blockers."

**Q: How did you understand the code written by other team members, and how did you integrate it?**
> **Answer:** "We relied heavily on GitHub Pull Requests and peer reviews. For example, the ML engineer (Member 3) wrote Scikit-learn predictive models in Pandas. I reviewed their python scripts to understand their output format (the anomaly scores). Once I understood their data structure, I built a specific FastAPI endpoint (`/api/maintenance/analyze`) that ingested their telemetry JSON and passed it securely into my Ollama RAG pipeline for the AI to synthesize."

**Q: How did you communicate when something broke on the integration side?**
> **Answer:** "We maintained a technical 'war room' in Discord for instant communication. For instance, the frontend engineer ran into an async state lockup where rapid button clicks froze the UI due to a race condition in `app.js`. We hopped on a screen share, and I reviewed their JavaScript. We realized a global flag was being trapped, so we collaborated to re-scope the variables and wrap the async calls in `try/catch/finally` blocks to guarantee the UI would unlock. Similarly, when the DevOps engineer and I noticed database connection drops, we paired up to configure SQLAlchemy's `pool_pre_ping=True` to create an automated SQLite fallback."

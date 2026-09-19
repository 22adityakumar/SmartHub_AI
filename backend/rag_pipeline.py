import json
import requests
from typing import Generator, List, Dict, Any
from backend.config import OLLAMA_BASE_URL, OLLAMA_MODEL
from backend.vector_store import search_vectors
from sqlalchemy.orm import Session
from backend.models import MaintenanceHistory, Proposal

def query_ollama_stream(prompt: str, system_prompt: str = None, model: str = None) -> Generator[str, None, None]:
    model = model or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": model,
        "messages": messages,
        "stream": True
    }
    
    try:
        response = requests.post(url, json=payload, stream=True, timeout=(10, 180))
        response.raise_for_status()
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line.decode("utf-8"))
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
    except Exception as e:
        yield f"\n[Error communicating with local Ollama: {str(e)}. Please check if Ollama is running and has model '{model}' installed.]"

def stream_engineering_rag(query: str, model: str = None) -> Generator[str, None, None]:
    # 1. Search vector database for engineering documents
    hits = search_vectors(query, category="engineering", limit=5)
    
    citations = []
    context_parts = []
    for hit in hits:
        citations.append({
            "filename": hit["filename"],
            "page": hit["page"],
            "score": round(hit["score"], 3),
            "text": hit["text"]
        })
        context_parts.append(f"Source: {hit['filename']} (Page {hit['page']})\nContent: {hit['text']}")
        
    # Send citations as the first metadata line
    yield f"[CITATIONS] {json.dumps(citations)}\n"
    
    # 2. Build prompt
    context = "\n\n---\n\n".join(context_parts)
    system_prompt = (
        "You are an expert industrial engineering AI assistant.\n"
        "Your task is to answer technical questions using ONLY the provided document context below.\n"
        "If the answer cannot be found in the context, clearly state that you don't know based on the documents.\n"
        "Keep your response technical, precise, and practical.\n"
        "Structure your response logically using headers, bullet points, tables, and spacing where appropriate for clarity and readability. Always format the output in clean Markdown.\n"
        "Always cite the source document name and page number when explaining or stating facts."
    )
    
    prompt = (
        f"Document Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Please answer the question and list the exact document sources and pages used in your answer."
    )
    
    # 3. Stream from Ollama
    for chunk in query_ollama_stream(prompt, system_prompt=system_prompt, model=model):
        yield chunk

def stream_customer_support_rag(query: str, model: str = None) -> Generator[str, None, None]:
    # 1. Search vector database for customer support documents
    hits = search_vectors(query, category="customer_support", limit=5)
    
    citations = []
    context_parts = []
    for hit in hits:
        citations.append({
            "filename": hit["filename"],
            "page": hit["page"],
            "score": round(hit["score"], 3),
            "text": hit["text"]
        })
        context_parts.append(f"Source: {hit['filename']}\nContent: {hit['text']}")
        
    yield f"[CITATIONS] {json.dumps(citations)}\n"
    
    # 2. Build prompt
    context = "\n\n---\n\n".join(context_parts)
    system_prompt = (
        "You are a friendly, professional Customer Support representative for our industrial products.\n"
        "Answer customer queries politely and clearly based only on the provided documentation.\n"
        "Provide step-by-step guidance, lists, tables, and paragraphs where appropriate. Always format the response in clean Markdown.\n"
        "Do not use highly complex engineering slang unless helpful.\n"
        "If you do not know the answer, ask them to contact engineering support directly."
    )
    
    prompt = (
        f"Documentation Context:\n{context}\n\n"
        f"Customer Question: {query}\n\n"
        f"Response:"
    )
    
    for chunk in query_ollama_stream(prompt, system_prompt=system_prompt, model=model):
        yield chunk

def run_predictive_maintenance_analysis(
    equipment_name: str, 
    telemetry: str, 
    db: Session, 
    model: str = None
) -> Dict[str, Any]:
    # 1. Retrieve similar failures from database
    # Query database for items where equipment_name matches
    db_cases = db.query(MaintenanceHistory).filter(
        MaintenanceHistory.equipment_name.ilike(f"%{equipment_name}%")
    ).all()
    
    historical_context = ""
    if db_cases:
        historical_context += "Historical Maintenance/Failure Records:\n"
        for case in db_cases[:3]:
            historical_context += (
                f"- Failure Mode: {case.failure_mode}\n"
                f"  Symptoms: {case.symptoms}\n"
                f"  Resolution: {case.resolution}\n"
            )
    else:
        historical_context += "No exact historical maintenance cases found in SQL database.\n"
        
    # 2. Search engineering manuals for specifications & troubleshooting
    query_query = f"{equipment_name} maintenance troubleshooting overheating {telemetry}"
    hits = search_vectors(query_query, category="engineering", limit=3)
    
    citations = []
    manual_context = "OEM Manual Troubleshooting Sections:\n"
    for hit in hits:
        citations.append({
            "filename": hit["filename"],
            "page": hit["page"],
            "score": round(hit["score"], 3),
            "text": hit["text"]
        })
        manual_context += f"- Source: {hit['filename']} (Page {hit['page']})\n  Troubleshooting guide: {hit['text']}\n"
        
    # 3. Prompt LLM to analyze the telemetry against historical and OEM manuals
    system_prompt = (
        "You are an advanced Predictive Maintenance AI Analyzer.\n"
        "Analyze the provided equipment telemetry, historical failures, and manual specifications.\n"
        "Synthesize this data to determine: Possible causes, Recommended inspections, and a Confidence level (Low/Medium/High).\n"
        "Format your answer as a clean structured output with headings, bullet points and checklist items."
    )
    
    prompt = (
        f"Equipment: {equipment_name}\n"
        f"Telemetry Symptoms: {telemetry}\n\n"
        f"{historical_context}\n"
        f"{manual_context}\n"
        f"Please provide: Possible causes, Recommended inspections, and overall analysis confidence."
    )
    
    analysis_text = ""
    # We query synchronously for the diagnostic dashboard, or we can stream. Let's return as a JSON object
    for chunk in query_ollama_stream(prompt, system_prompt=system_prompt, model=model):
        analysis_text += chunk
        
    return {
        "analysis": analysis_text,
        "citations": citations,
        "equipment": equipment_name,
        "telemetry": telemetry
    }

def generate_proposal_draft(
    customer_name: str,
    project_name: str,
    capacity: str,
    location: str,
    db: Session,
    model: str = None
) -> Dict[str, Any]:
    # 1. Look for similar past proposals in the SQLite DB
    past_proposals = db.query(Proposal).all()
    past_proposals_context = ""
    if past_proposals:
        past_proposals_context += "Referenced Historical Bids/Proposals:\n"
        for prop in past_proposals[:2]:
            past_proposals_context += (
                f"- Project: {prop.project_name} for {prop.customer_name}\n"
                f"  Specs: {prop.capacity} in {prop.location}\n"
                f"  Extract: {prop.generated_draft[:300]}...\n\n"
            )
            
    # 2. Search engineering/proposal documentation in Vector Store
    query = f"proposal template contract specifications {capacity} substation switchgear"
    hits = search_vectors(query, category="proposals", limit=3)
    
    citations = []
    vector_context = "Standard Bid Clauses & Specifications:\n"
    for hit in hits:
        citations.append({
            "filename": hit["filename"],
            "page": hit["page"],
            "score": round(hit["score"], 3),
            "text": hit["text"]
        })
        vector_context += f"- Standard spec: {hit['text']}\n"
        
    # 3. Prompt LLM to draft the proposal
    system_prompt = (
        "You are an expert Sales Engineering Proposal Generator.\n"
        "Draft a formal technical and commercial proposal template based on the customer requirements and past templates.\n"
        "Include sections: 1. Executive Summary, 2. Technical Specifications & Compliance, 3. Project Schedule & Execution, 4. Commercial Framework.\n"
        "Ensure standard industrial engineering wording is used."
    )
    
    prompt = (
        f"New Customer Requirements:\n"
        f"- Customer: {customer_name}\n"
        f"- Project Name: {project_name}\n"
        f"- Capacity/Rating: {capacity}\n"
        f"- Location: {location}\n\n"
        f"{past_proposals_context}\n"
        f"{vector_context}\n"
        f"Draft the proposal document template now:"
    )
    
    draft_text = ""
    for chunk in query_ollama_stream(prompt, system_prompt=system_prompt, model=model):
        draft_text += chunk
        
    return {
        "draft": draft_text,
        "citations": citations,
        "customer_name": customer_name,
        "project_name": project_name,
        "capacity": capacity,
        "location": location
    }

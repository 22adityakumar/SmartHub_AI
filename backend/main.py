import os
import shutil
import json
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import requests

from backend.config import DATA_DIR, OLLAMA_BASE_URL, OLLAMA_MODEL
from backend.database import engine, Base, get_db
# Import all unified models
from backend.models import Document, ChatSession, ChatMessage, MaintenanceHistory, Proposal
from backend.models import Material, Station, Machine, SensorReading, EquipmentEvent

from backend.document_parser import parse_document
from backend.vector_store import index_document_chunks, delete_document_vectors, search_vectors, qdrant_client
from backend.rag_pipeline import (
    stream_engineering_rag, 
    stream_customer_support_rag, 
    run_predictive_maintenance_analysis, 
    generate_proposal_draft
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartHub AI API",
    description="SmartHub AI- smart Factory monitoring and private AI document system",
    version="2.0.0"
)

# ---- Factory Monitoring Endpoints ----
@app.get("/api/info")
def read_root():
    return {
        "system": "SmartHub AI",
        "subtitle": "Smart Factory Logistics & Engineering AI Platform",
        "status": "ONLINE",
        "documentation": "/docs"
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "HEALTHY"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"UNHEALTHY: {str(e)}"
    return {"status": "UP", "database": db_status}


# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Seed Data Handler
@app.on_event("startup")
def seed_database():
    db = next(get_db())
    # Check if maintenance history exists
    if db.query(MaintenanceHistory).count() == 0:
        print("Seeding SQLite with mock maintenance history logs...")
        mock_cases = [
            MaintenanceHistory(
                equipment_name="Transformer X",
                failure_mode="Cooling Fan Jammed & Overheating",
                symptoms="Oil temperature reading 95°C, high acoustic humming noise, radiator fins dusty.",
                resolution="Power shut down. Cleaned radiator fins. Removed jammed cooling fan motor, replaced with OEM spare, refilled insulation oil, and verified normal winding resistance."
            ),
            MaintenanceHistory(
                equipment_name="MCC Panel A",
                failure_mode="Terminal Block Ground Fault",
                symptoms="Main circuit breaker tripped. Visual sign of blackening on copper terminals. Insulation resistance measured at 0.5 Megaohms.",
                resolution="Replaced the carbonized terminal block. Polished contacts. Set the overcurrent protection relay threshold from 1.2x to 1.1x for safety. Re-tested insulation to 100+ Megaohms."
            ),
            MaintenanceHistory(
                equipment_name="GIS Switchgear B",
                failure_mode="SF6 Gas Pressure Leak",
                symptoms="Low gas pressure alarm triggered on DevOps (SF6 pressure drops below 0.42 MPa). Winding temp normal.",
                resolution="Conducted soap bubble leak test. Located leakage at the secondary pressure monitoring valve seal. Tightened valve connection, replaced O-ring, and refilled SF6 gas to nominal 0.55 MPa."
            )
        ]
        db.add_all(mock_cases)
        db.commit()
        print("Seeding complete.")

    # Check if documents exist
    if db.query(Document).count() == 0:
        print("Seeding SQLite and Qdrant with sample documents...")
        sample_docs = {
            "engineering": {
                "Transformer_X_Manual.txt": (
                    "Transformer X Technical Manual\n"
                    "Section 4.3: Electrical Specifications\n"
                    "The insulation class for Transformer X is Class F (155°C). Ensure winding temperature does not exceed 115°C under nominal loading conditions.\n"
                    "Recommended torque for terminal bolts in MCC Panel A is 45 Nm. Under no circumstances should the torque exceed 55 Nm to prevent copper threads stripping.\n"
                    "Relay protection is configured using standard IEEE 51 (Inverse Time Overcurrent) and IEEE 50 (Instantaneous Overcurrent) protection curves."
                )
            },
            "customer_support": {
                "Controller_FAQ.txt": (
                    "Controller Support & Warranty FAQ\n"
                    "Section 1: Warranty terms\n"
                    "Our industrial controllers are covered by a standard 24-month (2 years) warranty period starting from the date of installation. Optional extended warranty is available up to 48 months.\n"
                    "Section 2: Installation and Mounting\n"
                    "To install the controller, mount the bracket to a flat metal backplate using 4 M6 hex screws. Ensure at least 50mm of clearance around all ventilation slots to prevent throttling.\n"
                    "Section 3: Accessories Compatibility\n"
                    "The controller is compatible with standard Modbus TCP gateway modules (Part No. MB-100) and Profinet adapter cards (Part No. PN-200)."
                )
            },
            "proposals": {
                "Substation_Tender_Specs.txt": (
                    "Substation Proposal Reference Library\n"
                    "Section 1.1: General Technical Requirements\n"
                    "Scope of work includes design, engineering, supply, testing, and commissioning of a 33kV substation rated at 25MVA.\n"
                    "Civil works must include transformer foundation pads, oil drainage soak pits, and fencing conforming to local grid standards.\n"
                    "All switchgear must be SF6 gas-insulated type (GIS) rated at 31.5kA short circuit withstand for 3 seconds."
                )
            }
        }

        for category, files in sample_docs.items():
            for filename, content in files.items():
                cat_folder = DATA_DIR / category
                file_path = cat_folder / filename
                # Write to file
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                
                # Parse and Index
                chunks = parse_document(str(file_path), filename)
                if chunks:
                    try:
                        index_document_chunks(chunks, category)
                        db_doc = Document(
                            filename=filename,
                            filepath=str(file_path),
                            file_size=len(content),
                            doc_category=category,
                            chunk_count=len(chunks)
                        )
                        db.add(db_doc)
                    except Exception as e:
                        print(f"Error seeding vector search for {filename}: {e}")
        db.commit()
        print("Sample documents seeding complete.")


# Status Endpoint
@app.get("/api/status")
def get_status(db: Session = Depends(get_db)):
    # Test Ollama connection
    ollama_ok = False
    ollama_models = []
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        if r.status_code == 200:
            ollama_ok = True
            data = r.json()
            ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass
        
    doc_count = db.query(Document).count()
    session_count = db.query(ChatSession).count()
    proposal_count = db.query(Proposal).count()
    
    return {
        "ollama_connected": ollama_ok,
        "ollama_models": ollama_models,
        "current_default_model": OLLAMA_MODEL,
        "database_stats": {
            "documents": doc_count,
            "chat_sessions": session_count,
            "proposals": proposal_count
        }
    }

# Document Management Endpoints
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_category: str = Form(...),  # engineering, customer_support, proposals
    db: Session = Depends(get_db)
):
    if doc_category not in ["engineering", "customer_support", "proposals"]:
        raise HTTPException(status_code=400, detail="Invalid document category.")
        
    category_folder = DATA_DIR / doc_category
    file_path = category_folder / file.filename
    
    # Save file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get file stats
    file_size = os.path.getsize(file_path)
    
    # Parse document and extract chunks
    chunks = parse_document(str(file_path), file.filename)
    
    if not chunks:
        # Clean up empty file
        os.remove(file_path)
        raise HTTPException(
            status_code=400, 
            detail="Failed to parse document text. Please make sure the PDF is not scanned or empty."
        )
        
    # Index to Vector DB
    try:
        index_document_chunks(chunks, doc_category)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to vector-index document: {str(e)}"
        )
        
    # Store metadata in SQLite
    db_doc = Document(
        filename=file.filename,
        filepath=str(file_path),
        file_size=file_size,
        doc_category=doc_category,
        chunk_count=len(chunks)
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    return {
        "message": "File uploaded and indexed successfully.",
        "document_id": db_doc.id,
        "filename": db_doc.filename,
        "chunk_count": db_doc.chunk_count
    }

@app.get("/api/documents")
def list_documents(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if category:
        query = query.filter(Document.doc_category == category)
    docs = query.order_by(Document.upload_time.desc()).all()
    return docs

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # Delete from local file system
    if os.path.exists(doc.filepath):
        try:
            os.remove(doc.filepath)
        except Exception:
            pass
            
    # Delete from Qdrant vector database
    try:
        delete_document_vectors(doc.filename)
    except Exception as e:
        print(f"Error deleting vectors for {doc.filename}: {e}")
        
    # Delete from SQLite
    db.delete(doc)
    db.commit()
    
    return {"message": f"Document '{doc.filename}' deleted successfully."}

# Chat Session Management Endpoints
@app.post("/api/chat/session")
def create_session(title: str, feature_type: str, db: Session = Depends(get_db)):
    if feature_type not in ["engineering", "customer_support"]:
        raise HTTPException(status_code=400, detail="Invalid session feature type.")
    session = ChatSession(title=title, feature_type=feature_type)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@app.get("/api/chat/sessions")
def list_sessions(feature_type: str, db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(ChatSession.feature_type == feature_type).order_by(ChatSession.created_at.desc()).all()
    return sessions

@app.get("/api/chat/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # Query messages
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    
    return {
        "session": session,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "text": m.text,
                "citations": json.loads(m.citations) if m.citations else [],
                "created_at": m.created_at
            }
            for m in messages
        ]
    }

@app.delete("/api/chat/session/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully."}

# RAG Chat Stream Endpoint
@app.post("/api/chat/message")
async def post_message(
    session_id: str = Form(...),
    message: str = Form(...),
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # Save User message
    user_msg = ChatMessage(session_id=session_id, sender="user", text=message, citations=None)
    db.add(user_msg)
    db.commit()
    
    # Select stream generator
    if session.feature_type == "engineering":
        generator = stream_engineering_rag(message, model=model)
    elif session.feature_type == "customer_support":
        generator = stream_customer_support_rag(message, model=model)
    else:
        raise HTTPException(status_code=400, detail="Unknown feature type.")
        
    # We will build a wrapper that streams data, capturing the entire response to write to DB once completed
    def stream_and_save():
        full_text = ""
        citations_json = "[]"
        
        # Pull citations first if they are yielded
        for chunk in generator:
            if chunk.startswith("[CITATIONS]"):
                citations_json = chunk.replace("[CITATIONS]", "").strip()
                # Yield to client
                yield chunk
            else:
                full_text += chunk
                yield chunk
                
        # After stream finishes, save assistant response to SQLite
        db_assistant_msg = ChatMessage(
            session_id=session_id,
            sender="assistant",
            text=full_text,
            citations=citations_json
        )
        # We need a new session in thread context to write
        db_write = next(get_db())
        db_write.add(db_assistant_msg)
        db_write.commit()
        db_write.close()

    return StreamingResponse(stream_and_save(), media_type="text/event-stream")

# Feature 2: Predictive Maintenance Endpoint
@app.post("/api/maintenance/analyze")
def analyze_maintenance(
    equipment_name: str = Form(...),
    telemetry: str = Form(...),
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    analysis_res = run_predictive_maintenance_analysis(equipment_name, telemetry, db, model=model)
    return analysis_res

@app.get("/api/maintenance/history")
def list_maintenance_history(db: Session = Depends(get_db)):
    cases = db.query(MaintenanceHistory).order_by(MaintenanceHistory.date_recorded.desc()).all()
    return cases

@app.post("/api/maintenance/history")
def create_maintenance_history(
    equipment_name: str = Form(...),
    failure_mode: str = Form(...),
    symptoms: str = Form(...),
    resolution: str = Form(...),
    db: Session = Depends(get_db)
):
    case = MaintenanceHistory(
        equipment_name=equipment_name,
        failure_mode=failure_mode,
        symptoms=symptoms,
        resolution=resolution
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case

# Feature 5: Proposal Generator Endpoints
@app.post("/api/proposals/generate")
def generate_proposal(
    customer_name: str = Form(...),
    project_name: str = Form(...),
    capacity: str = Form(...),
    location: str = Form(...),
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    res = generate_proposal_draft(customer_name, project_name, capacity, location, db, model=model)
    
    # Save the draft to the database
    proposal = Proposal(
        customer_name=customer_name,
        project_name=project_name,
        capacity=capacity,
        location=location,
        generated_draft=res["draft"]
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    
    return {
        "id": proposal.id,
        "customer_name": proposal.customer_name,
        "project_name": proposal.project_name,
        "capacity": proposal.capacity,
        "location": proposal.location,
        "draft": proposal.generated_draft,
        "citations": res["citations"],
        "created_at": proposal.created_at
    }

@app.get("/api/proposals")
def list_proposals(db: Session = Depends(get_db)):
    props = db.query(Proposal).order_by(Proposal.created_at.desc()).all()
    return props

@app.post("/api/proposals/{proposal_id}/review")
def review_proposal(
    proposal_id: int,
    reviewed_by: str = Form(...),
    edited_draft: str = Form(...),
    db: Session = Depends(get_db)
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found.")
        
    proposal.reviewed_by = reviewed_by
    proposal.generated_draft = edited_draft
    db.commit()
    return proposal

# Feature 4: Enterprise Search Endpoint
@app.get("/api/search")
def enterprise_search(query: str, db: Session = Depends(get_db)):
    # 1. Search vector DB in general (across all files)
    # We search Qdrant for semantic matches
    semantic_results = []
    try:
        ensure_collection_exists = qdrant_client.get_collections()
        # Search engineering documents
        eng_hits = search_vectors(query, category="engineering", limit=3)
        for h in eng_hits:
            semantic_results.append({
                "type": "document_chunk",
                "source": "Manuals & Drawings (Engineering)",
                "title": f"{h['filename']} (Page {h['page']})",
                "snippet": h["text"],
                "score": h["score"]
            })
            
        # Search customer support
        support_hits = search_vectors(query, category="customer_support", limit=3)
        for h in support_hits:
            semantic_results.append({
                "type": "document_chunk",
                "source": "Customer Support (FAQ/Catalogs)",
                "title": h["filename"],
                "snippet": h["text"],
                "score": h["score"]
            })
    except Exception as e:
        print(f"Error in vector search for enterprise search: {e}")
        
    # 2. Search SQL database metadata (mock SharePoint/ERP results)
    sql_results = []
    # Search document names
    doc_matches = db.query(Document).filter(
        Document.filename.ilike(f"%{query}%")
    ).all()
    for doc in doc_matches:
        sql_results.append({
            "type": "document_metadata",
            "source": f"SharePoint (Category: {doc.doc_category})",
            "title": doc.filename,
            "snippet": f"File indexed on {doc.upload_time.strftime('%Y-%m-%d')}. Size: {doc.file_size // 1024} KB.",
            "score": 1.0
        })
        
    # Search proposals
    prop_matches = db.query(Proposal).filter(
        (Proposal.customer_name.ilike(f"%{query}%")) | 
        (Proposal.project_name.ilike(f"%{query}%"))
    ).all()
    for prop in prop_matches:
        sql_results.append({
            "type": "proposal_record",
            "source": "ERP / Sales Subsystem",
            "title": f"Proposal: {prop.project_name} for {prop.customer_name}",
            "snippet": f"Specs: {prop.capacity} in {prop.location}. Draft Status: {'Reviewed by ' + prop.reviewed_by if prop.reviewed_by else 'Pending review'}.",
            "score": 0.95
        })
        
    # Search maintenance logs
    maint_matches = db.query(MaintenanceHistory).filter(
        (MaintenanceHistory.equipment_name.ilike(f"%{query}%")) | 
        (MaintenanceHistory.failure_mode.ilike(f"%{query}%"))
    ).all()
    for m in maint_matches:
        sql_results.append({
            "type": "maintenance_log",
            "source": "DevOps / CMMS Database",
            "title": f"Maintenance: {m.equipment_name} - {m.failure_mode}",
            "snippet": f"Symptoms: {m.symptoms}. Resolution: {m.resolution}",
            "score": 0.9
        })
        
    # Combine results and sort by score
    combined = semantic_results + sql_results
    combined.sort(key=lambda x: x["score"], reverse=True)
    
    return combined

from fastapi.staticfiles import StaticFiles
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


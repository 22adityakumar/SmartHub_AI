from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import uuid
import os
from backend.config import QDRANT_PATH, EMBEDDING_MODEL_NAME

# Initialize Embeddings Model (loads locally in-memory)
print(f"Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print("Embedding model loaded successfully.")

# Initialize Qdrant Client in local path mode
qdrant_client = QdrantClient(path=QDRANT_PATH)
COLLECTION_NAME = "ie_rag_platform"

def ensure_collection():
    # Check if collection exists, otherwise create it
    collections = qdrant_client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    if not exists:
        print(f"Creating collection '{COLLECTION_NAME}' in Qdrant...")
        # all-MiniLM-L6-v2 produces 384 dimensional vectors
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        print(f"Collection '{COLLECTION_NAME}' created.")

ensure_collection()

def index_document_chunks(chunks: List[Dict[str, Any]], category: str):
    """
    Chunks format: List of dicts with keys 'text' and 'metadata'.
    """
    ensure_collection()
    if not chunks:
        return
        
    texts = [c['text'] for c in chunks]
    embeddings = embedding_model.encode(texts).tolist()
    
    points = []
    for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        # Combine default metadata with chunk details
        payload = {
            "text": chunk['text'],
            "filename": chunk['metadata']['filename'],
            "page": chunk['metadata']['page'],
            "category": category
        }
        point_id = str(uuid.uuid4())
        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload=payload
            )
        )
        
    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            wait=True,
            points=points[i:i+batch_size]
        )
    print(f"Indexed {len(chunks)} chunks in category '{category}' in Qdrant.")

def delete_document_vectors(filename: str):
    """
    Deletes all vectors belonging to a filename
    """
    ensure_collection()
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="filename",
                    match=MatchValue(value=filename)
                )
            ]
        )
    )
    print(f"Deleted vectors for filename: {filename}")

def search_vectors(query: str, category: str, limit: int = 5) -> List[Dict[str, Any]]:
    ensure_collection()
    query_vector = embedding_model.encode(query).tolist()
    
    # Filter by category
    query_filter = Filter(
        must=[
            FieldCondition(
                key="category",
                match=MatchValue(value=category)
            )
        ]
    )
    
    search_results = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit
    )
    
    results = []
    for hit in search_results.points:
        results.append({
            "text": hit.payload["text"],
            "filename": hit.payload["filename"],
            "page": hit.payload.get("page", 1),
            "score": hit.score
        })
        
    return results

"""
SmartHub AI - Database Connection
====================================
Configures SQLAlchemy engine supporting both PostgreSQL and local SQLite fallback.
Merged from FactoryFlow and RAG projects.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import DATABASE_URL

def create_db_engine(db_url):
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})
    
    try:
        eng = create_engine(db_url, pool_pre_ping=True)
        # Attempt a quick raw connection test
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        # Fallback to local SQLite file for local development
        fallback_url = "sqlite:///./smarthub.db"
        print(f"[Database] Could not connect to '{db_url}'. Falling back to '{fallback_url}'. Error: {e}")
        return create_engine(fallback_url, connect_args={"check_same_thread": False})

engine = create_db_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI Dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

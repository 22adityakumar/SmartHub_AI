"""
SmartHub AI - Application Configuration
=======================================
Combined configuration for FactoryFlow (IoT/AWS) and EngineeringAI (RAG/Ollama).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if available
load_dotenv()

# Base Directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
QDRANT_DIR = BASE_DIR / "qdrant_storage"

# Create directories if they don't exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
QDRANT_DIR.mkdir(parents=True, exist_ok=True)

# Subfolders for doc categories
(DATA_DIR / "engineering").mkdir(exist_ok=True)
(DATA_DIR / "customer_support").mkdir(exist_ok=True)
(DATA_DIR / "proposals").mkdir(exist_ok=True)

# Database Configuration (PostgreSQL preferred, SQLite fallback)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "smarthub")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("USE_SQLITE", "true").lower() == "true":
        DATABASE_URL = f"sqlite:///{BASE_DIR / 'smarthub.db'}"
    else:
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# MQTT Broker Details (Factory)
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "factory")

# AWS Configuration (Factory)
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_IOT_ENDPOINT = os.getenv("AWS_IOT_ENDPOINT", "")
AWS_S3_BUCKET_HISTORICAL = os.getenv("AWS_S3_BUCKET_HISTORICAL", "smarthub-historical-data")
AWS_SNS_TOPIC_ALERTS = os.getenv("AWS_SNS_TOPIC_ALERTS", "arn:aws:sns:us-east-1:123456789012:FactoryAlerts")

# Vector Database (Qdrant) Path
QDRANT_PATH = str(QDRANT_DIR)

# Ollama Settings (RAG)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b") 

# Embedding Settings (RAG)
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

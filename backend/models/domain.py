"""
SmartHub AI - Domain Models (SQLAlchemy ORM)
==============================================
Merged Models from FactoryFlow (IoT Logistics) and EngineeringAI (RAG/Ollama).
"""

import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base


# ==========================================
# RAG Models (Engineering AI)
# ==========================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)
    doc_category = Column(String, nullable=False)
    chunk_count = Column(Integer, default=0)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    feature_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    sender = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

class MaintenanceHistory(Base):
    __tablename__ = "maintenance_history"

    id = Column(Integer, primary_key=True, index=True)
    equipment_name = Column(String, nullable=False)
    failure_mode = Column(String, nullable=False)
    symptoms = Column(Text, nullable=False)
    resolution = Column(Text, nullable=False)
    date_recorded = Column(DateTime, default=datetime.datetime.utcnow)

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    project_name = Column(String, nullable=False)
    capacity = Column(String, nullable=False)
    location = Column(String, nullable=False)
    generated_draft = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by = Column(String, nullable=True)


# ==========================================
# FactoryFlow Models (IoT & Logistics)
# ==========================================

class Material(Base):
    __tablename__ = "materials"
    material_id = Column(String(50), primary_key=True)
    material_name = Column(String(100), nullable=False)
    category = Column(String(50))
    unit = Column(String(20))
    minimum_stock = Column(Integer, default=0)
    supplier = Column(String(100))

class MaterialBatch(Base):
    __tablename__ = "material_batches"
    batch_id = Column(String(50), primary_key=True)
    material_id = Column(String(50), nullable=False)
    quantity = Column(Integer, default=0)
    manufacture_date = Column(String(50))
    received_date = Column(String(50))
    expiry_date = Column(String(50))
    batch_status = Column(String(50))

class Inventory(Base):
    __tablename__ = "inventory"
    inventory_id = Column(String(50), primary_key=True)
    material_id = Column(String(50), nullable=False)
    batch_id = Column(String(50))
    location = Column(String(100))
    quantity = Column(Integer, default=0)
    status = Column(String(50))
    last_updated = Column(String(50))

class Station(Base):
    __tablename__ = "stations"
    station_id = Column(String(50), primary_key=True)
    station_name = Column(String(100), nullable=False)
    station_type = Column(String(50))
    location = Column(String(100))
    status = Column(String(50))

class Machine(Base):
    __tablename__ = "machines"
    machine_id = Column(String(50), primary_key=True)
    machine_name = Column(String(100), nullable=False)
    machine_type = Column(String(50))
    station_id = Column(String(50))
    status = Column(String(50))
    installation_date = Column(String(50))

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    order_id = Column(String(50), primary_key=True)
    product_name = Column(String(100), nullable=False)
    quantity = Column(Integer, default=0)
    priority = Column(String(20))
    planned_start = Column(String(50))
    planned_end = Column(String(50))
    actual_start = Column(String(50))
    actual_end = Column(String(50))
    status = Column(String(50))

class ProductionTask(Base):
    __tablename__ = "production_tasks"
    task_id = Column(String(50), primary_key=True)
    order_id = Column(String(50))
    task_type = Column(String(50))
    source_location = Column(String(100))
    destination_location = Column(String(100))
    station_id = Column(String(50))
    machine_id = Column(String(50))
    priority = Column(String(20))
    status = Column(String(50))
    planned_duration_minutes = Column(Float)
    actual_duration_minutes = Column(Float)
    created_at = Column(String(50))
    completed_at = Column(String(50))

class Product(Base):
    __tablename__ = "products"
    product_id = Column(String(50), primary_key=True)
    order_id = Column(String(50))
    product_name = Column(String(100))
    material_batch_id = Column(String(50))
    machine_id = Column(String(50))
    production_start = Column(String(50))
    production_end = Column(String(50))
    status = Column(String(50))

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    reading_id = Column(String(50), primary_key=True)
    timestamp = Column(String(50))
    machine_id = Column(String(50), nullable=False)
    temperature = Column(Float)
    vibration = Column(Float)
    current = Column(Float)
    pressure = Column(Float)
    machine_status = Column(String(50))
    is_anomaly = Column(Integer, default=0)

class EquipmentEvent(Base):
    __tablename__ = "equipment_events"
    event_id = Column(String(50), primary_key=True)
    timestamp = Column(String(50))
    machine_id = Column(String(50))
    event_type = Column(String(50))
    description = Column(Text)
    severity = Column(String(20))

class MaterialMovement(Base):
    __tablename__ = "material_movements"
    movement_id = Column(String(50), primary_key=True)
    material_id = Column(String(50))
    batch_id = Column(String(50))
    from_location = Column(String(100))
    to_location = Column(String(100))
    quantity = Column(Integer, default=0)
    movement_time = Column(String(50))
    task_id = Column(String(50))
    status = Column(String(50))

class QualityInspection(Base):
    __tablename__ = "quality_inspections"
    inspection_id = Column(String(50), primary_key=True)
    product_id = Column(String(50))
    inspection_time = Column(String(50))
    result = Column(String(50))
    defect_type = Column(String(100))
    quality_score = Column(Float)
    inspector = Column(String(100))

class TraceabilityLog(Base):
    __tablename__ = "traceability_logs"
    trace_id = Column(String(50), primary_key=True)
    product_id = Column(String(50))
    order_id = Column(String(50))
    material_batch_id = Column(String(50))
    machine_id = Column(String(50))
    station_id = Column(String(50))
    event_type = Column(String(50))
    event_time = Column(String(50))
    description = Column(Text)

class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(String(50), primary_key=True)
    alert_type = Column(String(50))
    machine_id = Column(String(50))
    task_id = Column(String(50))
    product_id = Column(String(50))
    severity = Column(String(20))
    message = Column(Text)
    created_at = Column(String(50))
    status = Column(String(50))

class AIPrediction(Base):
    __tablename__ = "ai_predictions"
    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(50))
    temperature = Column(Float)
    vibration = Column(Float)
    current = Column(Float)
    prediction = Column(String(20))
    anomaly_score = Column(Float)
    created_at = Column(String(50))

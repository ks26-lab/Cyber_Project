"""
Aegis AI Real-Time Situation Assessment & Explainable Report Model for GRIDSEC
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from app.database.connection import Base
from app.models.base import AuditMixin


class AegisReport(Base, AuditMixin):
    """
    Aegis AI Incident & Resilience Assessment Report.
    Supports continuous, versioned updates as cascades evolve.
    """
    __tablename__ = "aegis_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. RPT-AEGIS-2026-004
    simulation_id = Column(String(100), index=True, nullable=True) # Null for live grid
    incident_id = Column(String(100), ForeignKey("incidents.incident_id"), index=True, nullable=True)
    cascade_id = Column(String(100), nullable=True)
    
    version = Column(Integer, default=1, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    severity = Column(String(20), index=True, nullable=False) # CRITICAL, HIGH, ELEVATED, NOMINAL
    summary = Column(Text, nullable=False)
    situation = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    cause = Column(String(255), nullable=True)
    prediction = Column(Text, nullable=True)
    
    recommendations = Column(JSON, default=list) # List of operator decision-support actions
    confidence = Column(Float, default=0.90) # 0.0 to 1.0 confidence metric
    status = Column(String(50), default="GENERATED") # GENERATED, UPDATED, OPERATOR_REVIEWED, ARCHIVED
    
    # Explainability & Evidence links
    evidence = Column(JSON, default=list) # List of structured claims with telemetry/DSA backing
    dsa_context = Column(JSON, default=dict) # Snapshot of BFS blast, Dijkstra rerouting, DFS islands

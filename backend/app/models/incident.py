"""
Incident Management Model for GRIDSEC (Priority Queue / Heap Integration)
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from app.database.connection import Base
from app.models.base import AuditMixin

class Incident(Base, AuditMixin):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. INC-1042
    title = Column(String(255), nullable=False)
    severity = Column(String(20), index=True, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    
    source_asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    status = Column(String(50), index=True, default="DETECTED") # DETECTED, INVESTIGATING, CONTAINED, RESOLVED
    
    risk_score = Column(Float, default=50.0, nullable=False) # 0.0 to 100.0 (used in Priority Queue heap comparator)
    asset_criticality = Column(Float, default=5.0) # 1.0 to 10.0 scale
    affected_assets_count = Column(Integer, default=1)
    
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    
    description = Column(Text, nullable=False)
    recommended_action = Column(String(255), nullable=True)
    containment_playbook = Column(JSON, default=list)

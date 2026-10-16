"""
Cybersecurity & Unified Power Grid Event Models for GRIDSEC
Includes Unified Grid Event Bus models and Cascading Event Chains
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base
from app.models.base import AuditMixin


class SecurityEvent(Base, AuditMixin):
    """Legacy Cyber Intrusion / SCADA Security Event Table."""
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. EVT-2026-0842
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    source_asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    destination_asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=True)
    
    event_type = Column(String(100), index=True, nullable=False) # SCADA_ANOMALY, UNAUTHORIZED_ACCESS, etc.
    protocol = Column(String(50), default="DNP3")
    severity = Column(String(20), index=True, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW, INFO
    
    description = Column(Text, nullable=False)
    payload_sample = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE")
    mitigation_action = Column(String(200), nullable=True)


class GridEvent(Base, AuditMixin):
    """
    Unified Event Model for all Cyber-Physical events in GRIDSEC.
    Supports causal chaining via parent_event_id for root-cause provenance.
    """
    __tablename__ = "grid_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. EVT-CP-9812
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    event_type = Column(String(100), index=True, nullable=False)
    # Examples: ASSET_COMPROMISED, ASSET_ISOLATED, LINE_FAILED, LINE_OVERLOADED,
    # TRANSFORMER_OVERLOADED, VOLTAGE_VIOLATION, FREQUENCY_DEVIATION,
    # POWER_REDISTRIBUTION, ROUTE_CHANGED, CRITICAL_LOAD_EXPOSED,
    # INCIDENT_CREATED, INCIDENT_ESCALATED, INCIDENT_RESOLVED
    
    source_asset = Column(String(100), index=True, nullable=False) # e.g. "WR-RAIGARH" or "LINE-HVDC-RAI-PUG"
    affected_assets = Column(JSON, default=list) # List of asset IDs impacted
    severity = Column(String(20), index=True, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW, INFO
    cause = Column(String(255), nullable=True) # Immediate triggering reason
    
    parent_event_id = Column(String(100), ForeignKey("grid_events.event_id"), index=True, nullable=True)
    simulation_id = Column(String(100), index=True, nullable=True) # Null for live grid, non-null for sandbox simulations
    data_source = Column(String(50), default="GRIDSEC_EVENT_BUS", nullable=False)
    
    payload = Column(JSON, default=dict) # Structured telemetry or fault metadata
    
    # Self-referential causal relationships
    children_events = relationship("GridEvent", backref="parent_event", remote_side=[event_id])


class Cascade(Base, AuditMixin):
    """
    Cascading Failure Chain Model tracking multi-hop propagation.
    """
    __tablename__ = "cascades"

    id = Column(Integer, primary_key=True, index=True)
    cascade_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. CAS-2026-003
    simulation_id = Column(String(100), index=True, nullable=True)
    root_event_id = Column(String(100), ForeignKey("grid_events.event_id"), nullable=False)
    
    current_depth = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="ACTIVE", index=True) # ACTIVE, PROPAGATING, CONTAINED, TERMINATED
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    summary = Column(Text, nullable=True)
    impacted_capacity_mw = Column(Float, default=0.0)

    # Relationships
    cascade_events = relationship("CascadeEvent", back_populates="cascade", cascade="all, delete-orphan")


class CascadeEvent(Base, AuditMixin):
    """
    Association table tracking the step-by-step sequence of events within a cascade.
    """
    __tablename__ = "cascade_events"

    id = Column(Integer, primary_key=True, index=True)
    cascade_id = Column(String(100), ForeignKey("cascades.cascade_id"), index=True, nullable=False)
    event_id = Column(String(100), ForeignKey("grid_events.event_id"), index=True, nullable=False)
    parent_event_id = Column(String(100), nullable=True)
    
    depth = Column(Integer, default=1, nullable=False)
    sequence_number = Column(Integer, default=1, nullable=False)

    cascade = relationship("Cascade", back_populates="cascade_events")

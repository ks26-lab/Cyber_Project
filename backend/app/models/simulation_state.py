"""
Sandbox Simulation Scenario State Model for GRIDSEC.
Ensures baseline grid data is immutable while allowing multi-tenant simulation states.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from app.database.connection import Base
from app.models.base import AuditMixin


class SimulationScenario(Base, AuditMixin):
    """
    Simulation Sandbox Entity.
    Maintains isolated copies of asset states, tripped breakers, and injected events.
    """
    __tablename__ = "simulation_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. SIM-2026-SUB42
    name = Column(String(200), nullable=False)
    scenario_type = Column(String(50), nullable=False) # CYBER_ATTACK, N-1_CONTINGENCY, BUS_COLLAPSE, RESILIENCE_DRILL
    
    status = Column(String(50), default="CREATED", index=True) # CREATED, RUNNING, COMPLETED, RESET
    baseline_reference = Column(String(50), default="INDIA_GRID_59", nullable=False)
    
    # State overrides (e.g. {"NR-DELHI": {"status": "COMPROMISED"}, "LINE-HVDC-RAI-PUG": {"status": "DISCONNECTED"}})
    state_overrides = Column(JSON, default=dict)
    
    event_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    summary = Column(Text, nullable=True)

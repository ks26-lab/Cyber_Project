"""
Simulation & Analysis Results Models for GRIDSEC
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from app.database.connection import Base
from app.models.base import AuditMixin

class SimulationRun(Base, AuditMixin):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(String(100), unique=True, index=True, nullable=False)
    scenario_type = Column(String(50), nullable=False) # COMPROMISE, NODE_FAILURE, LINE_FAILURE, ISOLATION, RESILIENCE_TEST
    target_asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=False)
    
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    status = Column(String(50), default="RUNNING") # RUNNING, COMPLETED, FAILED
    result_summary = Column(Text, nullable=True)
    result_data = Column(JSON, default=dict)

class AnalysisResult(Base, AuditMixin):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(100), unique=True, index=True, nullable=False)
    incident_id = Column(String(100), nullable=True)
    
    analysis_type = Column(String(50), nullable=False) # IMPACT_BLAST_RADIUS, ALTERNATE_ROUTE, TOPOLOGY_CONNECTIVITY
    algorithm = Column(String(50), nullable=False) # BFS, DFS, DIJKSTRA, PRIORITY_QUEUE
    
    execution_time_ms = Column(Float, default=0.0)
    result = Column(JSON, default=dict)

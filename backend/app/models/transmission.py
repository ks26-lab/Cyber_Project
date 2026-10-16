"""
Transmission Lines & Grid Connections Graph Models for GRIDSEC
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base
from app.models.base import AuditMixin

class TransmissionLine(Base, AuditMixin):
    __tablename__ = "transmission_lines"

    id = Column(Integer, primary_key=True, index=True)
    line_id = Column(String(100), unique=True, index=True, nullable=False) # e.g. LINE-HVDC-RAI-PUG
    name = Column(String(255), nullable=False)
    
    source_asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=False)
    destination_asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=False)
    
    line_type = Column(String(50), index=True, nullable=False) # HVDC, 765kV_AC, 400kV_AC, 220kV_AC
    voltage_kv = Column(String(50), nullable=False) # ±800 kV, 765 kV AC, 400 kV AC
    capacity_mw = Column(Float, nullable=False)
    current_flow_mw = Column(Float, default=0.0)
    length_km = Column(Float, nullable=False)
    
    direction = Column(String(150), nullable=True) # e.g. WR -> SR (Western to Southern Grid)
    status = Column(String(50), default="HEALTHY") # HEALTHY, COMPROMISED, OVERLOADED, DISCONNECTED
    
    operator = Column(String(200), nullable=True)
    operator_id = Column(String(50), index=True, nullable=True)
    operator_ids = Column(JSON, default=list)
    ownership_type = Column(String(50), default="govt_central")

class GridConnection(Base, AuditMixin):
    """
    Graph Edge Table representing the power transmission graph adjacency.
    Supports multiple edge weight criteria: Distance, Impedance, Capacity Headroom, and Cyber Risk.
    """
    __tablename__ = "grid_connections"

    id = Column(Integer, primary_key=True, index=True)
    source_asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    destination_asset_id = Column(String(50), ForeignKey("assets.asset_id"), index=True, nullable=False)
    
    connection_type = Column(String(50), nullable=False) # HVDC_LINK, 765KV_AC, 400KV_AC
    
    # Graph Edge Weights for Dijkstra & Path Optimization
    weight_distance_km = Column(Float, default=100.0)
    weight_impedance_ohms = Column(Float, default=1.0)
    weight_capacity_headroom = Column(Float, default=1000.0)
    weight_risk_factor = Column(Float, default=1.0) # 1.0 (Safe) to 100.0 (Compromised)
    
    status = Column(String(50), default="ACTIVE") # ACTIVE, BLOCKED, QUARANTINED, CONGESTED

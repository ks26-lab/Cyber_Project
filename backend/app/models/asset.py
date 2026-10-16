"""
Asset and Substation / Power Plant Models for GRIDSEC
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base
from app.models.base import AuditMixin

class EnergyFirm(Base, AuditMixin):
    __tablename__ = "energy_firms"

    id = Column(Integer, primary_key=True, index=True)
    firm_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. PGCIL, ADANI, NTPC
    name = Column(String(200), nullable=False)
    short_name = Column(String(100), nullable=False)
    firm_type = Column(String(100), nullable=False) # Central Govt CPSU, Private Conglomerate, State TRANSCO
    category = Column(String(50), nullable=False) # central_govt, private, state_govt
    hq = Column(String(150), nullable=True)
    founded_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#166534")
    badge_class = Column(String(50), default="badge-forest")
    circuit_km = Column(String(50), nullable=True)
    capacity_mw = Column(Float, default=0.0)

class Asset(Base, AuditMixin):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. WR-RAIGARH
    name = Column(String(200), index=True, nullable=False)
    asset_type = Column(String(50), index=True, nullable=False) # SUBSTATION, POWER_PLANT, HVDC_TERMINAL, TRANSMISSION_NODE, CRITICAL_LOAD
    city = Column(String(100), nullable=True)
    district = Column(String(100), index=True, nullable=True)
    state = Column(String(100), index=True, nullable=False)
    pincode = Column(String(20), index=True, nullable=True)
    postal_office = Column(String(200), nullable=True)
    region = Column(String(20), index=True, nullable=False) # NR, WR, SR, ER, NER
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    capacity_mw = Column(Float, default=0.0)
    current_mw = Column(Float, default=0.0)
    voltage_kv = Column(String(100), nullable=False) # e.g. ±800kV HVDC / 765kV / 400kV
    
    status = Column(String(50), default="HEALTHY") # HEALTHY, COMPROMISED, ISOLATED, SUSPICIOUS, MAINTENANCE
    security_status = Column(String(50), default="SECURE") # SECURE, AT_RISK, BREACH_DETECTED, QUARANTINED
    risk_score = Column(Float, default=0.0) # 0.0 - 100.0
    
    operator = Column(String(200), nullable=True)
    operator_id = Column(String(50), index=True, nullable=True)
    operator_ids = Column(JSON, default=list)
    ownership_type = Column(String(50), default="govt_central")
    notes = Column(Text, nullable=True)

    # Relationships
    transformers = relationship("TransformerBay", back_populates="asset", cascade="all, delete-orphan")
    telemetry_records = relationship("Telemetry", back_populates="asset", cascade="all, delete-orphan")

class TransformerBay(Base, AuditMixin):
    __tablename__ = "transformer_bays"

    id = Column(Integer, primary_key=True, index=True)
    transformer_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. XFMR-RAI-ICT1
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    transformer_type = Column(String(50), nullable=False) # ICT, Converter XFMR, GT, DT
    rating_mva = Column(Float, nullable=False)
    primary_kv = Column(Float, nullable=False)
    secondary_kv = Column(Float, nullable=False)
    cooling = Column(String(50), default="ONAF")
    
    load_percent = Column(Float, default=70.0)
    oil_temp_c = Column(Float, default=52.0)
    winding_temp_c = Column(Float, default=62.0)
    tap_position = Column(Integer, default=9)
    dga_status = Column(String(100), default="Normal")
    status = Column(String(50), default="HEALTHY")

    asset = relationship("Asset", back_populates="transformers")

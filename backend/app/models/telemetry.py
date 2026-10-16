"""
Telemetry Model for GRIDSEC Synchrophasor PMU & SCADA Time-Series Data
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.connection import Base
from app.models.base import AuditMixin

class Telemetry(Base, AuditMixin):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    frequency_hz = Column(Float, default=50.000, nullable=False)
    voltage_kv = Column(Float, nullable=False)
    load_mw = Column(Float, nullable=False)
    reactive_power_mvar = Column(Float, default=0.0)
    
    temperature_c = Column(Float, default=45.0)
    oil_temperature_c = Column(Float, default=52.0)
    winding_temperature_c = Column(Float, default=62.0)
    tap_position = Column(Integer, default=9)
    
    status = Column(String(50), default="NOMINAL") # NOMINAL, WARNING, CRITICAL, ANOMALOUS
    data_source = Column(String(50), default="SIMULATED", nullable=False)

    asset = relationship("Asset", back_populates="telemetry_records")

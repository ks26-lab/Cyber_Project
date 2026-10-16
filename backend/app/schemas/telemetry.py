"""
Pydantic Schemas for Telemetry Stream
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class TelemetrySchema(BaseModel):
    id: Optional[int] = None
    asset_id: str
    timestamp: Optional[datetime] = None
    frequency_hz: float = 50.000
    voltage_kv: float
    load_mw: float
    reactive_power_mvar: float = 0.0
    temperature_c: float = 45.0
    oil_temperature_c: float = 52.0
    winding_temperature_c: float = 62.0
    tap_position: int = 9
    status: str = "NOMINAL"
    data_source: str = "SIMULATED"

    class Config:
        from_attributes = True

class TelemetryLiveSnapshot(BaseModel):
    asset_id: str
    asset_name: str
    frequency_hz: float
    load_mw: float
    capacity_mw: float
    load_percent: float
    voltage_kv: str
    status: str
    timestamp: datetime
    data_source: str = "SIMULATED"

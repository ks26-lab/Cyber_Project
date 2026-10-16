"""
Pydantic Schemas for Security Events
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class SecurityEventCreate(BaseModel):
    source_asset_id: str
    destination_asset_id: Optional[str] = None
    event_type: str # SCADA_ANOMALY, UNAUTHORIZED_ACCESS, DEVICE_COMPROMISE
    protocol: Optional[str] = "DNP3"
    severity: str = "HIGH" # CRITICAL, HIGH, MEDIUM, LOW
    description: str
    payload_sample: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class SecurityEventResponse(SecurityEventCreate):
    id: int
    event_id: str
    timestamp: datetime
    data_source: str = "SIMULATED"

    class Config:
        from_attributes = True

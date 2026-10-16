"""
Pydantic Schemas for Incidents and Priority Queue
"""

from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel

class IncidentBase(BaseModel):
    incident_id: str
    title: str
    severity: str
    source_asset_id: str
    status: str = "DETECTED"
    risk_score: float = 50.0
    asset_criticality: float = 5.0
    affected_assets_count: int = 1
    description: str
    recommended_action: Optional[str] = None
    containment_playbook: List[Any] = []

class IncidentCreate(BaseModel):
    title: str
    severity: str
    source_asset_id: str
    description: str
    risk_score: Optional[float] = 50.0
    asset_criticality: Optional[float] = 5.0

class IncidentResponse(IncidentBase):
    id: int
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    data_source: str = "DERIVED"

    class Config:
        from_attributes = True

class PrioritizedIncidentListResponse(BaseModel):
    total_incidents: int
    critical_count: int
    high_count: int
    algorithm: str = "Max-Heap Priority Queue (Risk Score & Severity Weighted)"
    incidents: List[IncidentResponse]

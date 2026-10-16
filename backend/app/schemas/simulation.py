"""
Pydantic Schemas for Cyber Event & Resilience Simulations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class CyberEventSimulationRequest(BaseModel):
    source: str = Field(..., example="NODE-018", description="Originating node of the anomalous packet/threat")
    destination: Optional[str] = Field(None, example="WR-RAIGARH", description="Target asset ID")
    event_type: str = Field("SCADA_ANOMALY", example="SCADA_ANOMALY")
    severity: str = Field("CRITICAL", example="CRITICAL")
    protocol: Optional[str] = Field("DNP3", example="DNP3")
    description: Optional[str] = Field("Unauthorized direct-operate breaker trip frame injected")

class CyberEventSimulationResponse(BaseModel):
    simulation_id: str
    event_id: str
    incident_id: Optional[str] = None
    affected_asset: str
    updated_security_status: str
    risk_score: float
    analysis_summary: str
    broadcast_sent: bool
    data_source: str = "SIMULATED"

class ResilienceSimulationRequest(BaseModel):
    target_asset: str = Field(..., example="WR-RAIGARH", description="Target asset to compromise / isolate")
    scenario: str = Field("COMPROMISE", example="COMPROMISE", description="COMPROMISE, NODE_FAILURE, LINE_FAILURE, ISOLATION")

class ResponseRecommendation(BaseModel):
    action: str # ISOLATE_ASSET, BLOCK_CONNECTION, REROUTE_NETWORK, MONITOR_ASSET, ESCALATE_INCIDENT
    asset: str
    reason: str
    affected_assets: List[str]
    expected_effect: str

class ResilienceSimulationResponse(BaseModel):
    simulation_id: str
    scenario: str
    target_asset: str
    before_state: Dict[str, Any]
    after_state: Dict[str, Any]
    impact_analysis: Dict[str, Any]
    alternate_path: Optional[Dict[str, Any]] = None
    recommendations: List[ResponseRecommendation]
    data_source: str = "SIMULATED"

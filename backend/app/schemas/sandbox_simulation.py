"""
Pydantic Schemas for Sandbox Simulations (Isolated What-If Scenarios)
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.unified_event import UnifiedGridEventCreate


class SimulationCreateRequest(BaseModel):
    name: str = Field(..., description="Scenario title e.g. 'Substation 42 Compromise & Overload Drill'")
    scenario_type: str = Field("CYBER_ATTACK", description="CYBER_ATTACK, LINE_FAILURE, N-1_CONTINGENCY, ISOLATION")
    target_asset_id: Optional[str] = Field(None, description="Initial target asset for the simulation drill")
    baseline_reference: Optional[str] = Field("TEST_NETWORK", description="Reference network topology: TEST_NETWORK (4-bus validated benchmark) or INDIA_GRID_59")
    initial_event: Optional[UnifiedGridEventCreate] = Field(None, description="Optional root event to trigger")


class SimulationEventRequest(BaseModel):
    event: UnifiedGridEventCreate


class SimulationStateResponse(BaseModel):
    simulation_id: str
    name: str
    scenario_type: str
    status: str
    baseline_reference: str
    event_count: int
    created_at: str
    updated_at: str
    state_overrides: Dict[str, Any]
    summary: Optional[str] = None

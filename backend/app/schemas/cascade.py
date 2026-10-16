from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.schemas.unified_event import UnifiedGridEventResponse


class CascadeEventStep(BaseModel):
    event_id: str
    parent_event_id: Optional[str] = None
    event_type: str
    source_asset: str
    severity: str
    depth: int
    sequence_number: int
    timestamp: Any

    @field_validator("timestamp", mode="before")
    @classmethod
    def serialize_timestamp(cls, v: Any) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)


class CascadeSummary(BaseModel):
    cascade_id: str
    simulation_id: Optional[str] = None
    root_event_id: str
    current_depth: int
    status: str
    started_at: Any
    completed_at: Optional[Any] = None
    total_events: int
    impacted_capacity_mw: float
    summary: Optional[str] = None

    @field_validator("started_at", "completed_at", mode="before")
    @classmethod
    def serialize_dates(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)


class CascadeDetail(CascadeSummary):
    events: List[CascadeEventStep] = []


class CascadeCandidateInfo(BaseModel):
    element_id: str
    element_type: str  # LINE, TRANSFORMER, BUS
    violation_type: str
    measured_value: float
    threshold: float
    unit: str
    overload_percent: float
    capacity_mw: float
    calculated_priority_score: float
    source_bus: Optional[str] = None
    destination_bus: Optional[str] = None


class CascadeStepSnapshot(BaseModel):
    step_number: int
    depth: int
    action_type: str  # BASELINE, INITIAL_DISTURBANCE, PROTECTION_TRIP, CASCADE_EQUILIBRIUM
    tripped_asset: str
    tripped_asset_type: Optional[str] = None
    trigger_reason: Optional[str] = None
    event_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    power_flow_status: str
    total_generation_mw: float
    total_load_mw: float
    total_losses_mw: float
    max_line_loading_percent: float
    max_transformer_loading_percent: float = 0.0
    violations_count: int
    violations: List[Dict[str, Any]] = Field(default_factory=list)
    state_overrides: Dict[str, Any] = Field(default_factory=dict)
    islands_detected: List[List[str]] = Field(default_factory=list)
    islands_count: int = 1
    dijkstra_reroute: Optional[Dict[str, Any]] = None
    bfs_reachability: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CascadeSimulationRequest(BaseModel):
    simulation_id: Optional[str] = None
    network_id: str = "TEST_NETWORK"
    initial_asset_id: str
    initial_action: str = "TRIP"  # TRIP, UNAUTHORIZED_BREAKER_COMMAND, OUT_OF_SERVICE
    max_depth: int = 10
    protection_threshold_line_loading_pct: float = 100.0
    protection_threshold_transformer_loading_pct: float = 100.0
    voltage_undervoltage_threshold_pu: float = 0.90
    voltage_overvoltage_threshold_pu: float = 1.10
    enable_dijkstra_check: bool = True
    enable_bfs_blast_radius: bool = True


class CascadeSimulationResult(BaseModel):
    cascade_id: str
    simulation_id: str
    network_id: str
    root_asset_id: str
    root_event_id: str
    status: str  # STABLE, MAX_DEPTH_REACHED, SOLVER_DIVERGED, SYSTEM_SEPARATION, TERMINATED
    termination_reason: str
    total_steps: int
    max_depth_reached: int
    tripped_assets: List[str] = Field(default_factory=list)
    initial_capacity_at_risk_mw: float = 0.0
    baseline_generation_mw: float
    baseline_losses_mw: float
    baseline_max_loading_percent: float
    final_generation_mw: float
    final_losses_mw: float
    final_max_loading_percent: float
    delta_losses_mw: float
    step_snapshots: List[CascadeStepSnapshot] = Field(default_factory=list)
    islands_detected: List[List[str]] = Field(default_factory=list)
    summary: str
    execution_time_ms: float

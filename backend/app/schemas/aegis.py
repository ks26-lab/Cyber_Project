from enum import Enum
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class GridStateSummary(BaseModel):
    health_score: float = Field(..., description="Overall power grid health score (0-100)")
    total_generation_mw: float
    total_load_mw: float
    total_losses_mw: float = 0.0
    grid_frequency_hz: float = 50.00
    monitored_nodes_count: int
    compromised_nodes_count: int


class CascadeStateSnapshot(BaseModel):
    active: bool = False
    cascade_id: Optional[str] = None
    depth: int = 0
    events_count: int = 0
    impacted_capacity_mw: float = 0.0


class ExplainableEvidence(BaseModel):
    claim: str = Field(..., description="High-level AI conclusion or warning claim")
    evidence: List[str] = Field(default_factory=list, description="Structured electrical, cyber, or topological telemetry proving the claim")


class SituationSnapshot(BaseModel):
    """
    Structured Situation Snapshot provided to Aegis AI input layer.
    Aggregates physical layer, cyber layer, and DSA analysis state.
    """
    timestamp: str
    active_incidents: List[Dict[str, Any]] = []
    active_threats: List[Dict[str, Any]] = []
    grid_state: GridStateSummary
    critical_assets: List[Dict[str, Any]] = []
    affected_assets: List[Dict[str, Any]] = []
    overloaded_lines: List[Dict[str, Any]] = []
    voltage_violations: List[Dict[str, Any]] = []
    cascade: CascadeStateSnapshot
    available_routes: List[Dict[str, Any]] = []
    recommended_actions: List[Dict[str, Any]] = []


class AegisAssessmentOutput(BaseModel):
    """
    Structured Aegis AI assessment output schema.
    Designed for decision-support (operator remains in command).
    """
    summary: str
    severity: str # CRITICAL, HIGH, ELEVATED, NOMINAL
    situation: str
    root_cause: str
    affected_assets: List[str]
    cascade_status: Dict[str, Any]
    potential_next_effects: List[str]
    recommended_actions: List[Dict[str, Any]]
    confidence: float
    evidence: List[ExplainableEvidence] = []


class EvidenceTier(str, Enum):
    OBSERVED = "OBSERVED"
    SOLVER_DERIVED = "SOLVER_DERIVED"
    INFERRED = "INFERRED"
    SIMULATOR_GROUND_TRUTH = "SIMULATOR_GROUND_TRUTH"


class TimelineEvent(BaseModel):
    step_number: int
    timestamp: str
    event_type: str
    asset_id: str
    description: str
    evidence_tier: EvidenceTier
    parent_event_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class PhysicalImpactMetric(BaseModel):
    name: str
    asset_id: str
    before_value: Optional[float] = None
    after_value: Optional[float] = None
    delta: Optional[float] = None
    percentage_change: Optional[float] = None
    unit: str = "%"


class PhysicalImpactSummary(BaseModel):
    max_line_loading_percent: Optional[float] = None
    min_bus_voltage_pu: Optional[float] = None
    total_losses_before_mw: Optional[float] = None
    total_losses_after_mw: Optional[float] = None
    losses_delta_mw: Optional[float] = None
    physical_violations_count: int = 0
    assets_tripped_count: int = 0
    metrics: List[PhysicalImpactMetric] = Field(default_factory=list)


class CyberImpactSummary(BaseModel):
    cyber_event_detected: bool = False
    attack_type: Optional[str] = None
    cyber_source: Optional[str] = None
    telemetry_inconsistency_detected: bool = False
    cyber_to_physics_mapping: str = "No cyber disturbance registered."


class DSAAnalysisSummary(BaseModel):
    hashing_operations: Dict[str, Any] = Field(default_factory=dict)
    bfs_impact_analysis: Dict[str, Any] = Field(default_factory=dict)
    dfs_island_analysis: Dict[str, Any] = Field(default_factory=dict)
    max_heap_priority_analysis: Dict[str, Any] = Field(default_factory=dict)
    dijkstra_recovery_analysis: Dict[str, Any] = Field(default_factory=dict)
    ac_solver_validation: Dict[str, Any] = Field(default_factory=dict)


class IslandAnalysisSummary(BaseModel):
    islanding_detected: bool = False
    component_count: int = 1
    main_island_size: int = 0
    isolated_islands_count: int = 0
    electrical_viability: Dict[str, str] = Field(default_factory=dict)
    narrative: str = "Grid remains in a single synchronous area."


class RecoveryAnalysisSummary(BaseModel):
    feasible_route_found: bool = False
    total_candidates: int = 0
    feasible_candidates_count: int = 0
    rejected_candidates_count: int = 0
    candidate_routes: List[Dict[str, Any]] = Field(default_factory=list)
    recommended_route: Optional[Dict[str, Any]] = None
    narrative: str = "No recovery action required or evaluated."


class AgentAnalysisSummary(BaseModel):
    detection_explanation: str = "No detection analysis recorded."
    impact_explanation: str = "No impact analysis recorded."
    priority_explanation: str = "No priority ranking recorded."
    propagation_explanation: str = "No propagation analysis recorded."
    island_explanation: str = "No island analysis recorded."
    recovery_explanation: str = "No recovery analysis recorded."


class TerminationAnalysisSummary(BaseModel):
    termination_reason: str
    explanation: str
    depth_reached: int
    max_depth_configured: int = 5


class AegisCascadeReport(BaseModel):
    """
    Complete Aegis Cascade Intelligence and Explainability Report.
    Transforms multi-agent cascade evidence into verifiable, grounded explanations.
    """
    report_id: str
    cascade_id: str
    simulation_id: Optional[str] = None
    timestamp: str
    confidence_level: str = "HIGH"  # HIGH, MEDIUM, LOW, INSUFFICIENT_EVIDENCE
    confidence_explanation: str = "Direct AC power flow and multi-agent trace convergence."
    executive_summary: str
    root_cause_vs_consequences: Dict[str, Any] = Field(default_factory=dict)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    physical_impact_summary: PhysicalImpactSummary
    cyber_impact_summary: CyberImpactSummary
    agent_analysis: AgentAnalysisSummary
    dsa_analysis: DSAAnalysisSummary
    islanding_analysis: IslandAnalysisSummary
    recovery_analysis: RecoveryAnalysisSummary
    termination_analysis: TerminationAnalysisSummary
    evidence_claims: List[ExplainableEvidence] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    dsa_context: Dict[str, Any] = Field(default_factory=dict)


class AegisReportResponse(BaseModel):
    report_id: str
    simulation_id: Optional[str] = None
    incident_id: Optional[str] = None
    cascade_id: Optional[str] = None
    version: int
    timestamp: Any
    severity: str
    summary: str
    situation: str
    impact: str
    cause: Optional[str] = None
    prediction: Optional[str] = None
    recommendations: List[Dict[str, Any]] = []
    confidence: float
    status: str
    evidence: List[ExplainableEvidence] = []
    dsa_context: Dict[str, Any] = {}

    @field_validator("timestamp", mode="before")
    @classmethod
    def serialize_timestamp(cls, v: Any) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)

    class Config:
        from_attributes = True


"""
Common Contracts and Result Data Structures for GRIDSEC Cascading Agents.
Defines base interfaces, standardized decision traces, and structured outputs.
"""

from abc import ABC, abstractmethod
from enum import Enum
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class CoordinatorState(str, Enum):
    """
    State machine states for the CascadeCoordinator workflow.
    """
    # Active Step Execution States
    RECEIVED = "RECEIVED"
    DETECTING = "DETECTING"
    IMPACT_ANALYSIS = "IMPACT_ANALYSIS"
    PRIORITIZING = "PRIORITIZING"
    PROPAGATION_DECISION = "PROPAGATION_DECISION"
    CASCADE_EXECUTION = "CASCADE_EXECUTION"
    ISLAND_ANALYSIS = "ISLAND_ANALYSIS"
    RECOVERY_ANALYSIS = "RECOVERY_ANALYSIS"
    STEP_COMPLETE = "STEP_COMPLETE"

    # Terminal States (aligned with CascadeEngine termination reasons)
    STABLE = "STABLE"
    TERMINATED = "TERMINATED"
    SOLVER_DIVERGED = "SOLVER_DIVERGED"
    SYSTEM_SEPARATION = "SYSTEM_SEPARATION"
    MAX_DEPTH_REACHED = "MAX_DEPTH_REACHED"


class PhysicalViolationRecord(BaseModel):
    """
    Standardized, strongly-typed representation of a single physical limit violation.
    Derived strictly from numerical AC power-flow solver results.
    """
    violation_id: str
    violation_type: str  # LINE_OVERLOAD, TRANSFORMER_OVERLOAD, VOLTAGE_UNDERVOLTAGE, VOLTAGE_OVERVOLTAGE, GENERATOR_LIMIT, GENERATOR_Q_LIMIT, POWER_IMBALANCE, SOLVER_DIVERGENCE, ISLAND_DETECTED
    asset_id: str
    asset_type: str  # LINE, TRANSFORMER, BUS, GENERATOR, SYSTEM
    observed_value: float
    limit_value: float
    excess: float
    unit: str = "%"
    severity: str = "WARNING"  # CRITICAL, WARNING, INFO
    provenance: str = "SOLVER_DERIVED"
    step: int = 0
    simulation_id: Optional[str] = None
    cascade_id: Optional[str] = None
    description: Optional[str] = None


class AgentDecisionTrace(BaseModel):
    """
    Lightweight, structured decision trace for Aegis explainability and provenance.
    Avoids copying large raw network models.
    """
    agent_name: str
    step: int
    input_summary: str
    decision: str
    reason: str
    confidence: float = 1.0
    severity: str = "INFO"
    evidence: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PropagationDecision(BaseModel):
    """
    Structured recommendation from PropagationAgent indicating the next candidate action.
    """
    eligible: bool = True
    candidate_asset: str
    candidate_event_type: str  # LINE_TRIP, TRANSFORMER_TRIP, etc.
    trigger_reason: str
    threshold: float
    observed_value: float
    excess: float = 0.0
    severity: str = "CRITICAL"
    priority_score: float = 0.0
    depth: int = 0
    parent_event_id: Optional[str] = None
    decision: str = "ELIGIBLE_FOR_PROPAGATION"


class IslandAgentResult(BaseModel):
    """
    Structured result specific to IslandAgent analysis.
    """
    agent_name: str = "IslandAgent"
    status: str = "SUCCESS"  # SUCCESS, NO_ACTION, SKIPPED, ERROR
    decision: str
    islanding_detected: bool
    component_count: int
    islands: List[List[str]] = Field(default_factory=list)
    main_island: Optional[List[str]] = None
    isolated_islands: List[List[str]] = Field(default_factory=list)
    island_sizes: List[int] = Field(default_factory=list)
    electrical_viability: Dict[str, str] = Field(default_factory=dict)
    solver_status: str = "CONVERGED"
    evidence: Dict[str, Any] = Field(default_factory=dict)
    reason: str = ""
    decision_trace: Optional[AgentDecisionTrace] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RecoveryRouteCandidate(BaseModel):
    """
    Structured candidate alternate route evaluated by RecoveryAgent.
    """
    route: List[str]
    distance_km: float
    hops: int
    feasible: bool
    status: str
    cost: float = 0.0
    bottlenecks: List[str] = Field(default_factory=list)
    reason: Optional[str] = None
    max_loading_percent: float = 0.0
    min_voltage_pu: float = 1.0


class RecoveryAgentResult(BaseModel):
    """
    Structured result specific to RecoveryAgent analysis.
    """
    agent_name: str = "RecoveryAgent"
    status: str = "SUCCESS"  # SUCCESS, NO_ACTION, SKIPPED, ERROR
    decision: str
    feasible_route_found: bool
    candidate_routes: List[RecoveryRouteCandidate] = Field(default_factory=list)
    feasible_routes: List[RecoveryRouteCandidate] = Field(default_factory=list)
    rejected_routes: List[RecoveryRouteCandidate] = Field(default_factory=list)
    recommended_route: Optional[RecoveryRouteCandidate] = None
    source_bus: Optional[str] = None
    destination_bus: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)
    reason: str = ""
    decision_trace: Optional[AgentDecisionTrace] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CascadeAgentResult(BaseModel):
    """
    Standardized result contract returned by every CascadeAgent.
    """
    agent_name: str
    status: str = "SUCCESS"  # SUCCESS, NO_ACTION, SKIPPED, ERROR
    decision: str
    confidence: float = 1.0
    severity: str = "INFO"  # CRITICAL, HIGH, WARNING, MEDIUM, LOW, INFO
    evidence: Dict[str, Any] = Field(default_factory=dict)
    candidate_assets: List[str] = Field(default_factory=list)
    recommended_action: Optional[str] = None
    decision_trace: Optional[AgentDecisionTrace] = None
    next_agent: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CoordinatedStepResult(BaseModel):
    """
    Structured result of a single step coordinated across all cascading agents.
    """
    step_number: int
    depth: int
    coordinator_state: CoordinatorState
    detection_result: Optional[CascadeAgentResult] = None
    impact_result: Optional[CascadeAgentResult] = None
    priority_result: Optional[CascadeAgentResult] = None
    propagation_result: Optional[CascadeAgentResult] = None
    island_result: Optional[CascadeAgentResult] = None
    recovery_result: Optional[CascadeAgentResult] = None
    decision_traces: List[AgentDecisionTrace] = Field(default_factory=list)
    tripped_asset: Optional[str] = None
    physics_validation: Optional[Any] = None
    input_state: Dict[str, Any] = Field(default_factory=dict)
    output_state: Dict[str, Any] = Field(default_factory=dict)
    solver_metrics: Dict[str, Any] = Field(default_factory=dict)
    trigger: Dict[str, Any] = Field(default_factory=dict)
    is_terminal: bool = False
    termination_reason: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CoordinatedCascadeResult(BaseModel):
    """
    End-to-end coordinated cascade analysis summary for Aegis explainability.
    """
    simulation_id: str
    cascade_id: str
    network_id: str
    status: str
    termination_reason: str
    total_steps: int
    max_depth_reached: int
    tripped_assets: List[str] = Field(default_factory=list)
    step_results: List[CoordinatedStepResult] = Field(default_factory=list)
    decision_traces: List[AgentDecisionTrace] = Field(default_factory=list)
    summary: str
    execution_time_ms: float


class CascadeAgent(ABC):
    """
    Abstract Base Class for all Cascading Analysis & Coordination Agents.
    Guarantees deterministic, contract-driven analysis without uncontrolled global mutations.
    """

    def __init__(self, agent_name: str):
        self.agent_name = agent_name

    @abstractmethod
    def analyze(self, context: Any, db: Optional[Any] = None) -> CascadeAgentResult:
        """
        Executes domain-specific analysis against the current cascade step context.
        Must return a strongly-typed CascadeAgentResult.
        """
        pass

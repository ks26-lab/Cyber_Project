"""
Pydantic Schemas for Cyber Attack Identification & Analysis Engine.
Defines formal Cyber Event models strictly separating:
1. Observed Facts (Raw telemetry, protocol indicators, authorization logs)
2. Detection Inference (Classifications, anomaly assessments, explainable evidence scoring)
3. Predicted Consequences (Downstream topological blast radius, power-flow overloads)
"""

from enum import Enum
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.unified_event import GridEventType, EventCategory, CyberStatus, ElectricalStatus


class AttackCategory(str, Enum):
    """Formal Taxonomy of Power Grid Cyber Threats."""
    UNAUTHORIZED_CONTROL = "UNAUTHORIZED_CONTROL"
    TELEMETRY_INTEGRITY = "TELEMETRY_INTEGRITY"
    CONFIGURATION_TAMPERING = "CONFIGURATION_TAMPERING"
    RECONNAISSANCE_PROBING = "RECONNAISSANCE_PROBING"
    COORDINATED_CAMPAIGN = "COORDINATED_CAMPAIGN"
    DENIAL_OF_SERVICE = "DENIAL_OF_SERVICE"
    UNKNOWN = "UNKNOWN"


class ObservedFacts(BaseModel):
    """Empirical observations without speculative attribution."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    source_identifier: str = Field("SIMULATED_SCADA_CLIENT", description="Reported IP / client / gateway ID")
    raw_protocol: str = Field("DNP3", description="DNP3, Modbus, IEC 60870-5-104, IEC 61850, IEEE C37.118")
    command_name: Optional[str] = Field(None, description="e.g. TRIP_BREAKER, WRITE_ANALOG_SETPOINT, TAP_STEP_UP, INJECT_FALSE_TELEMETRY, SET_TAP_POSITION_4")
    authorization_status: str = Field("FAILED", description="AUTHORIZED, FAILED, BYPASSED, UNVERIFIED")
    
    # Telemetry parameters (FDIA / Attack 2)
    measurement_type: Optional[str] = Field("ACTIVE_POWER_MW", description="ACTIVE_POWER_MW, VOLTAGE_PU, REACTIVE_POWER_MVAR, FREQUENCY_HZ")
    reported_value: Optional[float] = Field(None, description="Value reported by sensor/controller")
    expected_baseline_value: Optional[float] = Field(None, description="Expected value per model/physics baseline")
    discrepancy_magnitude: Optional[float] = Field(None, description="Absolute difference between reported and baseline")
    relative_error_pct: Optional[float] = Field(None, description="Percentage discrepancy relative to baseline")
    manipulation_factor: Optional[float] = Field(None, description="Configurable synthetic multiplier applied to true value")
    
    # Configuration parameters (Attack 3 / Transformer Tap Alteration)
    configuration_parameter: Optional[str] = Field(None, description="e.g. TAP_POSITION, PROTECTION_THRESHOLD, VOLTAGE_SETPOINT")
    previous_value: Optional[float] = Field(None, description="Previous parameter setting before modification")
    requested_value: Optional[float] = Field(None, description="Requested parameter setting from command")
    previous_tap: Optional[int] = Field(None, description="Previous transformer tap position (e.g. 0)")
    requested_tap: Optional[int] = Field(None, description="Requested transformer tap position (e.g. +4)")
    tap_min: Optional[int] = Field(default=-10, description="Minimum allowable transformer tap")
    tap_max: Optional[int] = Field(default=10, description="Maximum allowable transformer tap")
    tap_delta: Optional[int] = Field(None, description="Step change delta (requested_tap - previous_tap)")
    
    raw_payload_sample: Optional[str] = Field(None, description="Hex/Text representation of packet or message")
    target_asset_ref: Optional[str] = Field(None, description="Asset identifier referenced in event payload")


class TransformerTapImpactResult(BaseModel):
    """Structured Transformer Tap Alteration Physical Analysis Result."""
    target_transformer: str
    previous_tap: int
    requested_tap: int
    tap_delta: int
    tap_min: int = -10
    tap_max: int = 10
    is_tap_valid: bool = True
    validation_status: str = Field("VALID_RANGE", description="VALID_RANGE, REJECTED_INVALID_LIMITS")
    
    voltage_before_pu: Dict[str, float] = Field(default_factory=dict)
    voltage_after_pu: Dict[str, float] = Field(default_factory=dict)
    voltage_delta_pu: Dict[str, float] = Field(default_factory=dict)
    
    transformer_loading_before_percent: float = 0.0
    transformer_loading_after_percent: float = 0.0
    loading_delta_percent: float = 0.0
    
    line_loading_before_percent: Dict[str, float] = Field(default_factory=dict)
    line_loading_after_percent: Dict[str, float] = Field(default_factory=dict)
    
    system_losses_before_mw: float = 0.0
    system_losses_after_mw: float = 0.0
    loss_delta_mw: float = 0.0
    
    islanding_status: str = "NO_ISLANDING_DETECTED"
    connected_components: int = 1
    violations_detected: List[Dict[str, Any]] = Field(default_factory=list)
    details: str = ""


class CyberPhysicsConsistencyCheck(BaseModel):
    """Structured Cyber-Physical Consistency Evaluation Result."""
    target_asset: str
    measurement_type: str = "ACTIVE_POWER_MW"
    reported_telemetry_value: float
    solver_expected_value: float
    absolute_error: float
    relative_error_percent: float
    error_threshold_percent: float = 10.0
    is_consistent: bool
    violation_status: str = Field("INCONSISTENT", description="CONSISTENT, INCONSISTENT, ANOMALY_DETECTED")
    physical_state_status: str = Field("UNCHANGED_NOMINAL", description="UNCHANGED_NOMINAL, MODIFIED_IN_SANDBOX")
    details: str


class ReconnaissanceCorrelationResult(BaseModel):
    """Structured Multi-Asset Reconnaissance & Probing Correlation Result (Attack 4)."""
    source_identity: str
    event_count: int
    unique_target_count: int
    unique_event_types: List[str] = Field(default_factory=list)
    target_asset_ids: List[str] = Field(default_factory=list)
    resolved_targets: List[Dict[str, Any]] = Field(default_factory=list)
    time_window_seconds: float = 30.0
    correlated_event_ids: List[str] = Field(default_factory=list)
    asset_classes: List[str] = Field(default_factory=list)
    pattern: str = "MULTI_ASSET_RECONNAISSANCE"
    detection_confidence: float = 0.0
    evidence_factors: List[str] = Field(default_factory=list)
    physical_state_status: str = "UNCHANGED_NOMINAL"
    is_attack_confirmed: bool = True
    details: str = ""


class CampaignEventDetail(BaseModel):
    """Structured timeline step in a coordinated multi-vector cyber campaign (Attack 5)."""
    step_index: int
    timestamp: str
    phase_name: str
    target_asset_id: str
    target_asset_type: str = "SUBSTATION"
    attack_vector: str
    protocol: str
    command_name: str
    authorization_status: str
    is_physical_actuation: bool = False
    physical_consequence: str = "NONE"
    event_id: str
    raw_payload_sample: Optional[str] = None


class CampaignCorrelationResult(BaseModel):
    """Structured Coordinated Multi-Asset Cyber Campaign Correlation Result (Attack 5)."""
    campaign_id: str
    scenario_id: str = "SCN-005"
    detection_classification: str = "COORDINATED_CAMPAIGN"
    confidence_score: float = 0.0
    correlation_score: float = 0.0
    detection_state: str = Field("COORDINATED_CAMPAIGN", description="INSUFFICIENT_EVIDENCE, SUSPICIOUS_ACTIVITY, CORRELATED_ACTIVITY, COORDINATED_CAMPAIGN")
    
    source_identity: str = "DISTRIBUTED_APT_ACTOR"
    event_count: int = 4
    unique_asset_count: int = 4
    target_asset_ids: List[str] = Field(default_factory=list)
    asset_classes: List[str] = Field(default_factory=list)
    time_window_seconds: float = 60.0
    
    attack_vectors_identified: List[str] = Field(default_factory=list)
    timeline: List[CampaignEventDetail] = Field(default_factory=list)
    
    correlation_checklist: Dict[str, bool] = Field(default_factory=lambda: {
        "temporal_correlation": True,
        "source_correlation": True,
        "multi_asset_correlation": True,
        "attack_pattern_correlation": True,
        "topological_relationship": True
    })
    
    evidence_weights: Dict[str, float] = Field(default_factory=dict)
    
    # Solver Physical Impact
    physical_impact_confirmed: bool = True
    tripped_corridors: List[str] = Field(default_factory=list)
    recalculated_losses_mw: float = 0.0
    recalculated_generation_mw: float = 0.0
    voltage_violations_count: int = 0
    line_overload_count: int = 0
    islanding_status: str = "NO_ISLANDING_DETECTED"
    
    topology_blast_radius_nodes: int = 0
    max_heap_priority_rank: int = 1
    max_heap_priority_score: float = 0.0
    
    details: str = ""



class SyntheticCyberEvent(BaseModel):
    """
    Controlled synthetic event generated by the Attack Simulator.
    The ground_truth field is used strictly for offline testing evaluation
    and is never exposed to the Detection Engine.
    """
    event_id: str
    scenario_id: Optional[str] = None
    target_asset: str
    target_asset_type: Optional[str] = None
    observed: ObservedFacts
    ground_truth_category: Optional[str] = Field(None, description="Test-only ground truth; hidden from detector")
    ground_truth_action: Optional[str] = Field(None, description="Test-only simulated action; hidden from detector")
    simulation_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DetectionEvidence(BaseModel):
    """Individual empirical or physics-based evidence factor."""
    factor: str = Field(..., description="e.g. AUTHORIZATION_FAILURE, PHYSICS_TELEMETRY_RESIDUAL_HIGH")
    weight: float = Field(..., description="Additive weight contributed to confidence score")
    observation: str = Field(..., description="Human-readable description of the observation")
    rule_id: Optional[str] = None


class DetectionInference(BaseModel):
    """Engine deduction derived from observed indicators and scoring rules."""
    classification: str = Field(..., description="e.g. CONFIRMED_UNAUTHORIZED_CONTROL, TELEMETRY_ANOMALY, INSUFFICIENT_EVIDENCE")
    attack_category: AttackCategory
    detection_confidence: float = Field(..., ge=0.0, le=100.0, description="Confidence score (0 - 100)")
    confidence_level: str = Field("HIGH", description="CRITICAL (>=80), HIGH (>=60), MEDIUM (>=30), LOW (<30)")
    detection_method: str = Field("RULE_AND_PHYSICS_RESIDUAL", description="RULE_BASED, PHYSICS_RESIDUAL, HEURISTIC")
    evidence: List[DetectionEvidence] = Field(default_factory=list, description="Structured points with individual score weights")
    rules_triggered: List[str] = Field(default_factory=list)
    reasoning: str = Field(..., description="Explainable textual rationale for the classification")
    is_attack_confirmed: bool = Field(False, description="True if evidence exceeds critical threshold; False for anomalous noise")


class DetectionResult(BaseModel):
    """Result of Stage 3-4 event classification and confidence calculation."""
    inference: DetectionInference
    matched_asset: Optional[Dict[str, Any]] = None
    asset_resolution_status: str = Field("RESOLVED", description="RESOLVED, AMBIGUOUS_ASSET, UNKNOWN_ASSET")
    candidate_matches: List[Dict[str, Any]] = Field(default_factory=list)


class BlastRadiusResult(BaseModel):
    """Result of Stage 5 BFS cyber blast radius analysis."""
    source_node: str
    reachable_assets: List[Dict[str, Any]] = Field(default_factory=list)
    reachable_node_count: int = 0
    critical_assets_exposed: List[str] = Field(default_factory=list)
    total_capacity_at_risk_mw: float = 0.0
    impact_score: float = 0.0
    max_hop_depth: int = 3
    algorithm: str = "BFS (Cascading Cyber Blast Radius)"
    execution_time_us: float = 0.0


class CorrelationResult(BaseModel):
    """Result of Stage 6 multi-event correlation."""
    correlation_type: str = Field("STANDALONE_EVENT", description="STANDALONE_EVENT, CORRELATED_INCIDENT, POTENTIAL_COORDINATED_CAMPAIGN")
    correlated_event_ids: List[str] = Field(default_factory=list)
    correlation_factors: List[str] = Field(default_factory=list)
    correlated_events_detail: List[Dict[str, Any]] = Field(default_factory=list)
    campaign_confidence: float = 0.0


class PredictedConsequences(BaseModel):
    """Projected cyber and physical impact on the power grid."""
    cyber_blast_radius_nodes: int = Field(0, description="Topological reachable nodes via BFS")
    reachable_asset_ids: List[str] = Field(default_factory=list)
    critical_infrastructure_exposed: List[str] = Field(default_factory=list)
    capacity_at_risk_mw: float = Field(0.0, description="Total capacity within cyber reach")
    
    physical_action_triggered: Optional[str] = Field(None, description="Physical actuation (e.g. BREAKER_OPEN_LINE_1_3)")
    power_flow_violations_projected: List[Dict[str, Any]] = Field(default_factory=list)
    secondary_cascade_risk: str = Field("LOW", description="CRITICAL, HIGH, MEDIUM, LOW")


class CyberIncidentResult(BaseModel):
    """Incident record and Max-Heap priority details."""
    incident_id: str
    title: str
    severity: str
    status: str
    risk_score: float
    asset_criticality: float
    affected_assets_count: int
    recommended_action: str
    priority_rank: Optional[int] = None
    calculated_priority_score: float = 0.0
    scoring_breakdown: Dict[str, Any] = Field(default_factory=dict)
    algorithm: str = "DSA Max-Heap Priority Queue O(log N)"


class AegisCyberEvidence(BaseModel):
    """Structured, verified evidence object prepared for Aegis AI decision support."""
    evidence_id: str
    incident_id: str
    simulation_id: Optional[str] = None
    target_asset: str
    target_asset_name: Optional[str] = None
    detection: Dict[str, Any]
    cyber_impact: Dict[str, Any]
    physical_impact: Dict[str, Any]
    dsa_analysis: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    potential_consequences: List[str] = Field(default_factory=list)
    alternative_routes: Optional[Dict[str, Any]] = None
    recommended_containment_playbook: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class StandardizedCyberEvent(BaseModel):
    """
    Canonical Cyber Security Event representation in GRIDSEC.
    Strictly segregates Observed Facts, Detection Inference, and Predicted Consequences.
    """
    event_id: str
    simulation_id: Optional[str] = None
    target_asset_id: str
    target_asset_type: str = "SUBSTATION"
    target_asset_name: Optional[str] = None
    
    observed: ObservedFacts
    inference: DetectionInference
    prediction: PredictedConsequences
    
    correlation_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    child_event_ids: List[str] = Field(default_factory=list)
    
    status: str = Field("DETECTED", description="DETECTED, ANALYZED, MITIGATED, DISMISSED")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SyntheticScenarioDefinition(BaseModel):
    """Predefined synthetic attack template for the Cyber Defense Lab."""
    scenario_id: str
    name: str
    category: AttackCategory
    description: str
    default_target: str
    default_protocol: str
    default_severity: str
    simulated_action: str
    parameter_defaults: Dict[str, Any] = Field(default_factory=dict)


class PhysicalStateComparison(BaseModel):
    """Structured Before vs After Electrical State Comparison."""
    target_asset: str
    scenario_id: Optional[str] = None
    physical_action_applied: str = "NONE"
    is_physical_state_modified: bool = False

    # Electrical metrics before disturbance
    generation_before_mw: float = 0.0
    load_before_mw: float = 0.0
    losses_before_mw: float = 0.0
    min_voltage_before_pu: float = 1.0
    max_voltage_before_pu: float = 1.0
    max_line_loading_before_pct: float = 0.0
    max_transformer_loading_before_pct: float = 0.0

    # Electrical metrics after disturbance
    generation_after_mw: float = 0.0
    load_after_mw: float = 0.0
    losses_after_mw: float = 0.0
    min_voltage_after_pu: float = 1.0
    max_voltage_after_pu: float = 1.0
    max_line_loading_after_pct: float = 0.0
    max_transformer_loading_after_pct: float = 0.0

    # Calculated Deltas
    generation_delta_mw: float = 0.0
    losses_delta_mw: float = 0.0
    voltage_deltas_pu: Dict[str, float] = Field(default_factory=dict)
    line_loading_deltas_pct: Dict[str, float] = Field(default_factory=dict)

    islanding_status: str = "NO_ISLANDING_DETECTED"
    connected_components: int = 1
    violations_count: int = 0
    solver_converged: bool = True
    details: str = ""


class CyberSimulationRequest(BaseModel):
    """Payload to trigger a simulated attack scenario or custom cyber event in a sandbox."""
    scenario_id: Optional[str] = Field(None, description="Predefined template ID e.g. 'SCENARIO_A_BREAKER_TRIP', 'SCN-002', 'SCN-003', 'SCN-004', 'SCN-005'")
    target_asset_id: Optional[str] = Field(default=None, description="Target asset ID e.g. 'LINE-1-3', 'BUS-2', 'XFMR-3-4' or None for dynamic selection")
    simulation_id: Optional[str] = Field(None, description="Existing sandbox simulation ID or None to create new")
    baseline_network: str = Field("TEST_NETWORK", description="TEST_NETWORK (4-bus validated) or INDIA_GRID_59")
    seed: Optional[int] = Field(None, description="Deterministic pseudo-random seed for reproducible dynamic target selection")
    
    # Custom parameter overrides (None indicates use scenario template defaults or dynamic generator)
    authorization_status: Optional[str] = Field(None, description="AUTHORIZED, FAILED, BYPASSED, UNVERIFIED")
    command_name: Optional[str] = Field(None, description="Command instruction")
    source_identity: Optional[str] = Field(None, description="Source IP / client ID e.g. 'suspicious_client_01'")
    
    # Reconnaissance / Probing parameters (Attack 4)
    target_asset_ids: Optional[List[str]] = Field(None, description="List of targeted asset IDs for multi-asset reconnaissance")
    event_count: Optional[int] = Field(None, description="Number of events in synthetic probing sequence")
    time_window_seconds: Optional[float] = Field(None, description="Temporal window for synthetic sequence")
    
    # Telemetry Attack parameters (Attack 2)
    measurement_type: Optional[str] = Field(None, description="ACTIVE_POWER_MW, VOLTAGE_PU, etc.")
    reported_value: Optional[float] = Field(None, description="Reported telemetry value")
    expected_baseline_value: Optional[float] = Field(None, description="Expected baseline value")
    manipulation_factor: Optional[float] = Field(None, description="Multiplier factor e.g. 0.60 (40% falsification)")
    
    # Configuration Tampering parameters (Attack 3)
    configuration_parameter: Optional[str] = Field(None, description="TAP_POSITION, PROTECTION_THRESHOLD, etc.")
    previous_value: Optional[float] = Field(None, description="Previous parameter setting")
    requested_value: Optional[float] = Field(None, description="Requested parameter setting")
    requested_tap: Optional[int] = Field(None, description="Requested transformer tap position e.g. 4")
    previous_tap: Optional[int] = Field(None, description="Previous transformer tap position e.g. 0")
    tap_min: Optional[int] = Field(None, description="Minimum allowable transformer tap")
    tap_max: Optional[int] = Field(None, description="Maximum allowable transformer tap")
    
    protocol: Optional[str] = Field(None, description="Protocol simulated")
    apply_physical_consequence: bool = Field(True, description="Whether to execute electrical consequence in sandbox")


class CyberImpactAnalysisResponse(BaseModel):
    """Complete multi-stage analysis output returned to API clients and UI."""
    simulation_id: str
    seed: Optional[int] = None
    event: StandardizedCyberEvent
    ground_truth: Optional[Dict[str, Any]] = Field(default=None, description="Internal test-only ground truth annotated as SIMULATOR_GROUND_TRUTH")
    matched_asset: Dict[str, Any]
    bfs_blast_radius: Dict[str, Any]
    power_flow_impact: Optional[Dict[str, Any]] = None
    state_comparison: Optional[PhysicalStateComparison] = None
    physics_validation: Optional[Dict[str, Any]] = None
    cyber_physics_consistency: Optional[CyberPhysicsConsistencyCheck] = None
    transformer_tap_impact: Optional[TransformerTapImpactResult] = None
    reconnaissance_impact: Optional[ReconnaissanceCorrelationResult] = None
    campaign_impact: Optional[CampaignCorrelationResult] = None
    incident: Optional[Dict[str, Any]] = None
    correlated_events: List[Dict[str, Any]] = Field(default_factory=list)
    correlation_result: Optional[CorrelationResult] = None
    priority_ranking: Dict[str, Any]
    aegis_evidence: Dict[str, Any]
    execution_timeline: List[Dict[str, Any]]

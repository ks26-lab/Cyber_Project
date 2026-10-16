"""
Pydantic Schemas for Unified Cyber-Physical Grid Events & Causal Chains
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class EventCategory(str, Enum):
    """Four Core Event Classes in GRIDSEC."""
    CYBER_EVENT = "CYBER_EVENT"
    PHYSICAL_EVENT = "PHYSICAL_EVENT"
    SIMULATION_EVENT = "SIMULATION_EVENT"
    TELEMETRY_EVENT = "TELEMETRY_EVENT"


class CyberStatus(str, Enum):
    """Cybersecurity Integrity & Trust State of Asset or Controller."""
    SECURE = "SECURE"
    SUSPICIOUS = "SUSPICIOUS"
    COMPROMISED = "COMPROMISED"
    BREACH_DETECTED = "BREACH_DETECTED"
    ISOLATED_LOGICAL = "ISOLATED_LOGICAL"


class ElectricalStatus(str, Enum):
    """Physical Electrical Operating Status (Independent of Cyber Status)."""
    IN_SERVICE = "IN_SERVICE"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    TRIPPED = "TRIPPED"
    OVERLOADED = "OVERLOADED"
    DE_ENERGIZED = "DE_ENERGIZED"


class GridEventType(str, Enum):
    # Cyber Layer Events
    CYBER_ASSET_COMPROMISED = "CYBER_ASSET_COMPROMISED"
    ASSET_COMPROMISED = "ASSET_COMPROMISED"  # Alias for backward compatibility
    SCADA_TAMPERING = "SCADA_TAMPERING"
    UNAUTHORIZED_BREAKER_COMMAND = "UNAUTHORIZED_BREAKER_COMMAND"
    UNAUTHORIZED_CONTROL_COMMAND = "UNAUTHORIZED_CONTROL_COMMAND"
    TELEMETRY_INTEGRITY_ANOMALY = "TELEMETRY_INTEGRITY_ANOMALY"
    UNAUTHORIZED_CONFIG_CHANGE = "UNAUTHORIZED_CONFIG_CHANGE"
    REPEATED_PROBE_ANOMALY = "REPEATED_PROBE_ANOMALY"
    COORDINATED_MULTI_ASSET_ATTACK = "COORDINATED_MULTI_ASSET_ATTACK"
    FALSE_DATA_INJECTION = "FALSE_DATA_INJECTION"
    FALSE_SETPOINT_INJECTION = "FALSE_SETPOINT_INJECTION"
    ASSET_ISOLATED = "ASSET_ISOLATED"
    SCADA_ANOMALY = "SCADA_ANOMALY"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    COMMAND_INJECTION = "COMMAND_INJECTION"
    
    # Physical Electrical Events (Generated from Solver States)
    PHYSICAL_STATE_UPDATE = "PHYSICAL_STATE_UPDATE"
    LINE_TRIP = "LINE_TRIP"
    LINE_FAILED = "LINE_FAILED"  # Alias
    LINE_OVERLOAD = "LINE_OVERLOAD"
    LINE_OVERLOADED = "LINE_OVERLOADED"  # Alias
    TRANSFORMER_TRIP = "TRANSFORMER_TRIP"
    TRANSFORMER_TRIPPED = "TRANSFORMER_TRIPPED"  # Alias
    TRANSFORMER_OVERLOAD = "TRANSFORMER_OVERLOAD"
    TRANSFORMER_OVERLOADED = "TRANSFORMER_OVERLOADED"  # Alias
    VOLTAGE_UNDERVOLTAGE = "VOLTAGE_UNDERVOLTAGE"
    VOLTAGE_OVERVOLTAGE = "VOLTAGE_OVERVOLTAGE"
    VOLTAGE_VIOLATION = "VOLTAGE_VIOLATION"
    FREQUENCY_DEVIATION = "FREQUENCY_DEVIATION"
    POWER_REDISTRIBUTION = "POWER_REDISTRIBUTION"
    POWER_IMBALANCE = "POWER_IMBALANCE"
    ROUTE_CHANGED = "ROUTE_CHANGED"
    CRITICAL_LOAD_EXPOSED = "CRITICAL_LOAD_EXPOSED"
    ISLAND_DETECTED = "ISLAND_DETECTED"
    ISLAND_FORMED = "ISLAND_FORMED"
    SOLVER_DIVERGENCE = "SOLVER_DIVERGENCE"
    
    # Simulation Events
    SCENARIO_CREATED = "SCENARIO_CREATED"
    SCENARIO_SNAPSHOT = "SCENARIO_SNAPSHOT"
    SCENARIO_ROLLBACK = "SCENARIO_ROLLBACK"
    N1_CONTINGENCY_EVALUATED = "N1_CONTINGENCY_EVALUATED"

    # Incident Management Events
    INCIDENT_CREATED = "INCIDENT_CREATED"
    INCIDENT_ESCALATED = "INCIDENT_ESCALATED"
    INCIDENT_RESOLVED = "INCIDENT_RESOLVED"

    # Cascading Failure Events
    CASCADE_STARTED = "CASCADE_STARTED"
    CASCADE_STEP_STARTED = "CASCADE_STEP_STARTED"
    ROOT_DISTURBANCE = "ROOT_DISTURBANCE"
    SOLVER_STARTED = "SOLVER_STARTED"
    SOLVER_COMPLETED = "SOLVER_COMPLETED"
    PHYSICS_VALIDATION_COMPLETED = "PHYSICS_VALIDATION_COMPLETED"
    PHYSICAL_VIOLATION_DETECTED = "PHYSICAL_VIOLATION_DETECTED"
    IMPACT_ANALYSIS_COMPLETED = "IMPACT_ANALYSIS_COMPLETED"
    PRIORITY_ANALYSIS_COMPLETED = "PRIORITY_ANALYSIS_COMPLETED"
    PROPAGATION_DECISION = "PROPAGATION_DECISION"
    CASCADE_CANDIDATE_SELECTED = "CASCADE_CANDIDATE_SELECTED"
    SECONDARY_ACTION = "SECONDARY_ACTION"
    SANDBOX_STATE_CHANGED = "SANDBOX_STATE_CHANGED"
    PROTECTION_ACTION = "PROTECTION_ACTION"
    ISLAND_ANALYSIS = "ISLAND_ANALYSIS"
    RECOVERY_ANALYSIS = "RECOVERY_ANALYSIS"
    CASCADE_STATE_UPDATED = "CASCADE_STATE_UPDATED"
    CASCADE_TERMINATED = "CASCADE_TERMINATED"
    CASCADE_AGENT_STARTED = "CASCADE_AGENT_STARTED"
    CASCADE_AGENT_COMPLETED = "CASCADE_AGENT_COMPLETED"
    CASCADE_DECISION_CREATED = "CASCADE_DECISION_CREATED"
    CASCADE_STEP_REQUESTED = "CASCADE_STEP_REQUESTED"
    CASCADE_STEP_COMPLETED = "CASCADE_STEP_COMPLETED"
    AEGIS_UPDATE = "AEGIS_UPDATE"


class UnifiedGridEventBase(BaseModel):
    event_type: GridEventType = Field(..., description="Standardized event classification")
    event_category: EventCategory = Field(EventCategory.PHYSICAL_EVENT, description="Broad event category")
    source_asset: str = Field(..., description="Root asset or line originating the event")
    affected_assets: List[str] = Field(default_factory=list, description="Downstream assets impacted")
    severity: str = Field("HIGH", description="CRITICAL, HIGH, MEDIUM, LOW, INFO")
    cause: Optional[str] = Field(None, description="Immediate triggering reason")
    parent_event_id: Optional[str] = Field(None, description="Parent event ID for causal chain tracking")
    simulation_id: Optional[str] = Field(None, description="Simulation ID if triggered inside a sandbox")
    data_source: str = Field("GRIDSEC_EVENT_BUS", description="Originating engine / sensor")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event-specific electrical / cyber telemetry payload")


class UnifiedGridEventCreate(UnifiedGridEventBase):
    pass


class UnifiedGridEventResponse(UnifiedGridEventBase):
    event_id: str
    timestamp: str
    children_event_ids: List[str] = []

    class Config:
        from_attributes = True


class CausalNode(BaseModel):
    event_id: str
    event_type: str
    source_asset: str
    severity: str
    timestamp: str
    cause: Optional[str] = None
    children: List["CausalNode"] = []


class EventCorrelationRequest(BaseModel):
    event: UnifiedGridEventCreate


class EventCorrelationResponse(BaseModel):
    related: bool
    incident_id: Optional[str] = None
    cascade_id: Optional[str] = None
    confidence: float = 0.0
    correlation_reason: str


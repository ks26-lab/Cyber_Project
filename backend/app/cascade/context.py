"""
Cascade Context Schema for GRIDSEC Cascading Agents.
Encapsulates step-by-step physical and topological context passed across agents.
"""

import copy
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.power.models import PowerFlowResult, Violation
from app.cascade.contracts import CascadeAgentResult


class CascadeContext(BaseModel):
    """
    Shared, immutable step context provided to every CascadeAgent during analysis.
    Prevents uncontrolled global side-effects by encapsulating current step telemetry.
    """
    simulation_id: str
    cascade_id: str
    network_id: str = "TEST_NETWORK"
    current_depth: int = 0
    current_event_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    
    # Sandbox overrides representing active physical outages
    current_state_overrides: Dict[str, Any] = Field(default_factory=dict)
    
    # Latest physical solver results and violations
    latest_solver_result: Optional[PowerFlowResult] = None
    latest_violations: List[Violation] = Field(default_factory=list)
    physics_validation_result: Optional[Any] = None
    
    # Asset tracking
    tripped_assets: List[str] = Field(default_factory=list)
    affected_assets: List[str] = Field(default_factory=list)
    
    # Results from preceding agents in this step workflow
    previous_agent_results: Dict[str, CascadeAgentResult] = Field(default_factory=dict)
    
    # Step metadata (thresholds, flags, etc.)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def get_summary_text(self) -> str:
        """Returns a concise summary of the current step context."""
        v_count = len(self.latest_violations)
        tripped_str = ", ".join(self.tripped_assets) if self.tripped_assets else "NONE"
        return (
            f"Step Context: Depth={self.current_depth}, Tripped=[{tripped_str}], "
            f"Violations={v_count}, Network={self.network_id}"
        )

    def create_next_step(
        self,
        new_depth: int,
        new_event_id: Optional[str] = None,
        new_parent_event_id: Optional[str] = None,
        new_solver_result: Optional[PowerFlowResult] = None,
        new_violations: Optional[List[Violation]] = None,
        new_state_overrides: Optional[Dict[str, Any]] = None,
        new_tripped_assets: Optional[List[str]] = None,
        new_affected_assets: Optional[List[str]] = None,
        new_metadata: Optional[Dict[str, Any]] = None
    ) -> "CascadeContext":
        """
        Immutable factory method creating a fresh CascadeContext for the next step.
        Ensures agents never silently mutate shared historical step context.
        """
        return CascadeContext(
            simulation_id=self.simulation_id,
            cascade_id=self.cascade_id,
            network_id=self.network_id,
            current_depth=new_depth,
            current_event_id=new_event_id or self.current_event_id,
            parent_event_id=new_parent_event_id or self.current_event_id,
            current_state_overrides=copy.deepcopy(new_state_overrides if new_state_overrides is not None else self.current_state_overrides),
            latest_solver_result=new_solver_result or self.latest_solver_result,
            latest_violations=new_violations if new_violations is not None else list(self.latest_violations),
            tripped_assets=list(new_tripped_assets if new_tripped_assets is not None else self.tripped_assets),
            affected_assets=list(new_affected_assets if new_affected_assets is not None else self.affected_assets),
            previous_agent_results={},
            metadata=copy.deepcopy(new_metadata if new_metadata is not None else self.metadata)
        )

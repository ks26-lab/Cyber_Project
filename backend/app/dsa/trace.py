"""
Unified DSA Execution Trace Contract for GRID//ZERO.
Every graph, optimization, and data-structure algorithm emits a standardized
step-by-step AlgorithmTrace so the frontend Algorithm Lab, 3D City overlay,
and CAPER Inspector can replay, pause, step forward/backward, and inspect internal
data structures (FIFO Queue, Min-Heap, DSU arrays, Tarjan tin/low, DP table, Flow residuals).
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AlgorithmTraceStep(BaseModel):
    """Single atomic step in an algorithm's execution trace."""
    step_index: int
    operation: str = Field(..., description="e.g. ENQUEUE, DEQUEUE, RELAX_EDGE, BRIDGE_DETECTED, UNION, DP_UPDATE, AUGMENT_PATH")
    description: str = Field(..., description="Human-readable explanation of what happened at this step")
    pseudocode_line: int = Field(1, description="Highlighted 1-based pseudocode line index")
    active_nodes: List[str] = Field(default_factory=list)
    active_edges: List[str] = Field(default_factory=list)
    visited_nodes: List[str] = Field(default_factory=list)
    selected_edges: List[str] = Field(default_factory=list)
    frontier_state: Any = Field(default_factory=dict, description="Snapshot of internal data structure (Queue, Heap, Stack, DSU, DP row)")
    metrics_snapshot: Dict[str, Any] = Field(default_factory=dict)


class AlgorithmTrace(BaseModel):
    """Complete execution trace and complexity profile for any GRID//ZERO algorithm."""
    algorithm_id: str
    algorithm_name: str
    category: str
    network_id: str
    input_summary: Dict[str, Any]
    pseudocode: List[str] = Field(default_factory=list)
    steps: List[AlgorithmTraceStep] = Field(default_factory=list)
    final_output: Dict[str, Any] = Field(default_factory=dict)
    theoretical_time_complexity: str
    theoretical_space_complexity: str
    empirical_operations: int
    execution_time_ms: float
    grid_engineering_meaning: str
    failure_modes_and_limitations: str = ""

    @property
    def time_complexity(self) -> str:
        return self.theoretical_time_complexity

    @property
    def space_complexity(self) -> str:
        return self.theoretical_space_complexity


"""
Pydantic Schemas for DSA Graph Analysis (Impact BFS, Dijkstra Alternate Route)
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# 1. Impact Analysis
class ImpactAnalysisRequest(BaseModel):
    source_asset: str = Field(..., example="WR-RAIGARH", description="Compromised / Target substation ID")
    max_depth: Optional[int] = Field(5, description="Maximum BFS propagation hops")
    risk_threshold: Optional[float] = Field(0.3, description="Propagation impedance threshold")

class AffectedAssetDetail(BaseModel):
    asset_id: str
    name: str
    hop_distance: int
    asset_type: str
    capacity_mw: float
    state: str
    criticality: str # CRITICAL, HIGH, MEDIUM, LOW

class ImpactAnalysisResponse(BaseModel):
    source: str
    affected_assets: List[AffectedAssetDetail]
    critical_assets: List[str]
    propagation_depth: int
    impact_score: float
    total_capacity_at_risk_mw: float
    algorithm: str = "BFS (Breadth-First Search Cascading Propagation)"
    execution_time_us: float

# 2. Alternate Route Analysis
class AlternateRouteRequest(BaseModel):
    source: str = Field(..., example="WR-RAIGARH", description="Source substation ID")
    destination: str = Field(..., example="SR-PUGALUR", description="Destination substation ID")
    blocked_assets: Optional[List[str]] = Field(default=[], description="Quarantined or broken nodes to avoid")
    weight_mode: Optional[str] = Field("balanced", description="Weight metric: distance, capacity, risk, or balanced")

class AlternateRouteResponse(BaseModel):
    source: str
    destination: str
    route: List[str]
    distance_km: float
    hops: int
    available: bool
    bottleneck_capacity_mw: float
    average_risk_score: float
    weight_mode: str
    algorithm: str = "Dijkstra Min-Risk Shortest Path (Binary Min-Heap)"
    execution_time_us: float

# 3. Generic Graph Traversal
class GraphTraversalRequest(BaseModel):
    start_asset: str
    algorithm: str = "BFS" # BFS, DFS
    max_depth: Optional[int] = 6

class GraphTraversalResponse(BaseModel):
    start_asset: str
    algorithm: str
    visited_order: List[str]
    total_visited: int
    execution_time_us: float

"""
DSA Graph Analysis API Routes (BFS, Dijkstra, DFS).
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.simulation_service import simulation_service
from app.services.grid_service import grid_service
from app.dsa.dfs import DFSEngine

router = APIRouter(prefix="/analysis", tags=["DSA Graph Analysis"])


class ImpactAnalysisRequest(BaseModel):
    root_asset_id: str = Field(..., description="ID of the root compromised substation, e.g. WR-RAIGARH")
    max_hops: int = Field(3, ge=1, le=8, description="Maximum BFS propagation depth")
    decay_rate: float = Field(0.65, ge=0.1, le=1.0, description="Compromise probability decay factor per hop")


class AlternateRouteRequest(BaseModel):
    source_asset_id: str = Field(..., description="Source substation ID, e.g. NR-DELHI")
    target_asset_id: str = Field(..., description="Target substation ID, e.g. SR-PUGALUR")
    avoid_nodes: List[str] = Field(default_factory=list, description="List of compromised or isolated node IDs to bypass")
    avoid_lines: List[str] = Field(default_factory=list, description="List of tripped transmission line IDs to bypass")
    objective: str = Field("balanced", description="Optimization goal: distance, capacity, risk, or balanced")


@router.post("/impact", summary="Cascading Cyber Attack Blast Radius Analysis (BFS Algorithm)")
def analyze_cyber_impact(req: ImpactAnalysisRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Executes Breadth-First Search (BFS) starting from the root compromised asset
    to determine cascading blast radius, risk decay per transmission hop,
    and cumulative capacity at risk.
    """
    return simulation_service.run_impact_analysis(
        db=db,
        root_asset_id=req.root_asset_id,
        max_hops=req.max_hops,
        compromise_probability_decay=req.decay_rate
    )


@router.post("/alternate-route", summary="Dynamic Power Rerouting & Optimal Path Finding (Dijkstra's Algorithm)")
def compute_alternate_route(req: AlternateRouteRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Executes Dijkstra's Algorithm with a Binary Min-Heap Priority Queue on the transmission graph
    to find an optimal bypass path around compromised substations or overloaded transmission corridors.
    """
    return simulation_service.find_alternate_route(
        db=db,
        source_id=req.source_asset_id,
        target_id=req.target_asset_id,
        avoid_nodes=req.avoid_nodes,
        avoid_edges=req.avoid_lines,
        objective=req.objective
    )


@router.get("/connectivity", summary="Grid Islanding and Loop Detection Analysis (DFS Algorithm)")
def analyze_grid_connectivity(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Executes Depth-First Search (DFS) on the national transmission graph to detect:
    - Isolated grid sub-networks (Islands)
    - Transmission loops and cycles for synchronization analysis
    """
    grid_service.load_topology(db)
    islands = DFSEngine.find_connected_components(grid_service.graph)
    cycles = DFSEngine.detect_cycles(grid_service.graph)

    return {
        "total_nodes": len(grid_service.graph.nodes),
        "total_connected_islands": len(islands),
        "islands": [
            {
                "island_index": i + 1,
                "node_count": len(comp),
                "nodes": comp
            }
            for i, comp in enumerate(islands)
        ],
        "cycles_detected_count": len(cycles),
        "sample_cycles": cycles[:10]
    }

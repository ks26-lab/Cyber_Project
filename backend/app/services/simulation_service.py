"""
Simulation & DSA Resilience Analysis Engine.
Provides sandbox execution for:
- Cascading Cyber Attack Blast Radius (BFS)
- Alternate Power Path Rerouting (Dijkstra)
- Grid Islanding & Loop Detection (DFS)
"""
import uuid
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models.simulation import SimulationRun, AnalysisResult
from app.services.grid_service import grid_service
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dijkstra import DijkstraReroutingEngine
from app.dsa.dfs import DFSEngine


class SimulationService:
    def run_impact_analysis(
        self,
        db: Session,
        root_asset_id: str,
        max_hops: int = 3,
        compromise_probability_decay: float = 0.65
    ) -> Dict[str, Any]:
        grid_service.load_topology(db)
        start_time = time.perf_counter()

        result = BFSImpactEngine.calculate_impact(
            graph=grid_service.graph,
            source_node_id=root_asset_id,
            max_depth=max_hops
        )
        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        # Store analysis result in DB
        analysis_id = f"ANL-BFS-{uuid.uuid4().hex[:6].upper()}"
        res_record = AnalysisResult(
            analysis_id=analysis_id,
            analysis_type="IMPACT_BLAST_RADIUS",
            algorithm="BFS",
            execution_time_ms=exec_time,
            result=result,
            data_source="SIMULATED",
            source_url="simulation_service:bfs_engine"
        )
        db.add(res_record)
        db.commit()

        # Format consistent response fields
        return {
            "analysis_id": analysis_id,
            "root_node_id": root_asset_id,
            "root_node_name": result.get("source_name", root_asset_id),
            "max_hops": result.get("propagation_depth", max_hops),
            "total_impacted_nodes": len(result.get("affected_assets", [])),
            "cumulative_capacity_at_risk_mw": result.get("total_capacity_at_risk_mw", 0.0),
            "impact_score": result.get("impact_score", 0.0),
            "critical_assets": result.get("critical_assets", []),
            "affected_nodes": result.get("affected_assets", []),
            "algorithm": result.get("algorithm", "BFS"),
            "execution_time_ms": exec_time
        }

    def find_alternate_route(
        self,
        db: Session,
        source_id: str,
        target_id: str,
        avoid_nodes: Optional[List[str]] = None,
        avoid_edges: Optional[List[str]] = None,
        objective: str = "balanced"
    ) -> Dict[str, Any]:
        grid_service.load_topology(db)
        start_time = time.perf_counter()

        result = DijkstraReroutingEngine.find_alternate_route(
            graph=grid_service.graph,
            source=source_id,
            destination=target_id,
            blocked_assets=avoid_nodes,
            blocked_lines=avoid_edges,
            weight_mode=objective
        )
        exec_time = round((time.perf_counter() - start_time) * 1000, 2)

        analysis_id = f"ANL-DIJKSTRA-{uuid.uuid4().hex[:6].upper()}"
        res_record = AnalysisResult(
            analysis_id=analysis_id,
            analysis_type="ALTERNATE_ROUTE",
            algorithm="DIJKSTRA",
            execution_time_ms=exec_time,
            result=result,
            data_source="SIMULATED",
            source_url="simulation_service:dijkstra_engine"
        )
        db.add(res_record)
        db.commit()

        return {
            "analysis_id": analysis_id,
            "source_node_id": source_id,
            "target_node_id": target_id,
            "route_found": result.get("available", False),
            "path_node_ids": result.get("route", []),
            "total_distance_km": result.get("distance_km", 0.0),
            "total_hops": result.get("hops", 0),
            "bottleneck_capacity_mw": result.get("bottleneck_capacity_mw", 0.0),
            "average_risk_score": result.get("average_risk_score", 0.0),
            "objective": objective,
            "algorithm": result.get("algorithm", "Dijkstra"),
            "execution_time_ms": exec_time
        }

    def run_cyber_event_simulation(
        self,
        db: Session,
        target_asset_id: str,
        attack_type: str = "MALWARE_INJECTION",
        propagate: bool = True
    ) -> Dict[str, Any]:
        grid_service.load_topology(db)
        sim_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
        start_time = datetime.utcnow()

        blast = BFSImpactEngine.calculate_impact(
            graph=grid_service.graph,
            source_node_id=target_asset_id,
            max_depth=3
        )

        affected_assets = blast.get("affected_assets", [])
        alternate_routes = []
        if len(affected_assets) > 0:
            for item in affected_assets[:3]:
                tgt = item["asset_id"]
                route = DijkstraReroutingEngine.find_alternate_route(
                    graph=grid_service.graph,
                    source="NR-DELHI" if target_asset_id != "NR-DELHI" else "WR-MUMBAI",
                    destination=tgt,
                    blocked_assets=[target_asset_id]
                )
                if route.get("available"):
                    alternate_routes.append({
                        "destination": tgt,
                        "path": route.get("route"),
                        "totalDistanceKm": route.get("distance_km"),
                        "bottleneckCapacityMW": route.get("bottleneck_capacity_mw")
                    })

        summary = f"Simulated {attack_type} attack on {target_asset_id}. Impacted {len(affected_assets)} substations. Identified {len(alternate_routes)} alternate transmission paths."

        sim_record = SimulationRun(
            simulation_id=sim_id,
            scenario_type=attack_type,
            target_asset_id=target_asset_id,
            started_at=start_time,
            completed_at=datetime.utcnow(),
            status="COMPLETED",
            result_summary=summary,
            result_data={
                "blast_radius": blast,
                "alternate_routes": alternate_routes
            },
            data_source="SIMULATED",
            source_url="simulation_service:cyber_sandbox"
        )
        db.add(sim_record)
        db.commit()

        return {
            "simulation_id": sim_id,
            "status": "COMPLETED",
            "scenario": attack_type,
            "target_asset_id": target_asset_id,
            "summary": summary,
            "blast_radius": blast,
            "alternate_routes": alternate_routes
        }


simulation_service = SimulationService()

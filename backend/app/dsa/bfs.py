"""
Breadth-First Search (BFS) Engine for Cyber Threat Blast Radius & Cascading Impact Analysis
"""

import time
from collections import deque
from typing import Dict, List, Set, Tuple, Any
from app.dsa.graph import GridGraph

class BFSImpactEngine:
    @staticmethod
    def calculate_impact(graph: GridGraph, source_node_id: str, max_depth: int = 5, risk_threshold: float = 0.3) -> Dict[str, Any]:
        """
        Executes BFS traversal starting from a compromised node to calculate:
        - Cascading propagation path and depth
        - Critical assets reached (Nuclear plants, UHVDC terminals, Super-grid pooling hubs)
        - Cumulative capacity at risk (MW)
        - Composite cyber blast radius score (0 - 100)
        """
        start_time = time.perf_counter()

        if source_node_id not in graph.nodes:
            return {
                "error": f"Source asset '{source_node_id}' not found in grid topology.",
                "affected_assets": [],
                "critical_assets": [],
                "propagation_depth": 0,
                "impact_score": 0.0,
                "total_capacity_at_risk_mw": 0.0,
                "execution_time_us": 0.0
            }

        visited: Set[str] = set([source_node_id])
        queue: deque = deque([(source_node_id, 0)]) # (node_id, hop_depth)
        
        affected_assets: List[Dict[str, Any]] = []
        critical_assets: List[str] = []
        total_capacity_mw = 0.0
        max_reached_depth = 0

        source_node = graph.nodes[source_node_id]

        while queue:
            current_id, depth = queue.popleft()
            max_reached_depth = max(max_reached_depth, depth)

            if depth > max_depth:
                continue

            node = graph.nodes.get(current_id)
            if node:
                is_critical = node.type.lower() in ["nuclear", "hvdc_hub", "hvdc_terminal", "critical_load"] or node.capacity_mw >= 4000
                criticality_label = "CRITICAL" if is_critical else ("HIGH" if node.capacity_mw >= 2000 else "MEDIUM")
                
                if is_critical and current_id != source_node_id:
                    critical_assets.append(f"{node.name} ({current_id})")

                if current_id != source_node_id:
                    affected_assets.append({
                        "asset_id": current_id,
                        "name": node.name,
                        "hop_distance": depth,
                        "asset_type": node.type,
                        "capacity_mw": node.capacity_mw,
                        "state": node.state,
                        "criticality": criticality_label
                    })
                    total_capacity_mw += node.capacity_mw

            # Explore neighbors via operational outgoing transmission corridors
            for edge in graph.get_neighbors(current_id):
                if edge.status.upper() not in ("DISCONNECTED", "ISOLATED", "BLOCKED") and edge.target not in visited:
                    visited.add(edge.target)
                    queue.append((edge.target, depth + 1))

        # Calculate composite Impact Score (0 - 100)
        node_count_factor = min(40.0, len(affected_assets) * 4.5)
        capacity_factor = min(35.0, (total_capacity_mw / 25000.0) * 35.0)
        critical_factor = min(25.0, len(critical_assets) * 8.0)
        impact_score = round(min(100.0, node_count_factor + capacity_factor + critical_factor), 1)

        elapsed_us = (time.perf_counter() - start_time) * 1_000_000

        return {
            "source": source_node_id,
            "source_name": source_node.name,
            "affected_assets": affected_assets,
            "critical_assets": critical_assets,
            "propagation_depth": max_reached_depth,
            "impact_score": impact_score,
            "total_capacity_at_risk_mw": total_capacity_mw,
            "algorithm": "BFS (Cascading Cyber Blast Radius)",
            "execution_time_us": round(elapsed_us, 2)
        }

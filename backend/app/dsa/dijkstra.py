"""
Dijkstra Min-Risk & Optimal Alternate Rerouting Engine
Uses Binary Min-Heap Priority Queue with multi-criteria edge weight optimization.
"""

import heapq
import time
from typing import Dict, List, Set, Optional, Tuple, Any
from app.dsa.graph import GridGraph

class DijkstraReroutingEngine:
    @staticmethod
    def find_alternate_route(
        graph: GridGraph,
        source: str,
        destination: str,
        blocked_assets: Optional[List[str]] = None,
        blocked_lines: Optional[List[str]] = None,
        weight_mode: str = "balanced"
    ) -> Dict[str, Any]:
        """
        Computes the optimal bypass power transmission path around quarantined/compromised nodes or lines.
        Returns path, total distance, bottleneck capacity, average risk score, and execution latency.
        """
        start_time = time.perf_counter()
        blocked_set = set(blocked_assets or [])
        blocked_lines_set = set(blocked_lines or [])

        if source not in graph.nodes or destination not in graph.nodes:
            return {
                "source": source,
                "destination": destination,
                "route": [],
                "distance_km": 0.0,
                "hops": 0,
                "available": False,
                "bottleneck_capacity_mw": 0.0,
                "average_risk_score": 0.0,
                "weight_mode": weight_mode,
                "message": f"Source or destination not found in graph topology.",
                "execution_time_us": 0.0
            }

        if source == destination:
            return {
                "source": source,
                "destination": destination,
                "route": [source],
                "distance_km": 0.0,
                "hops": 0,
                "available": True,
                "bottleneck_capacity_mw": graph.nodes[source].capacity_mw,
                "average_risk_score": 0.0,
                "weight_mode": weight_mode,
                "execution_time_us": 0.0
            }

        # Priority Queue: (cumulative_weight, current_node_id, current_path, total_distance, min_capacity, sum_risk)
        distances: Dict[str, float] = {node_id: float('inf') for node_id in graph.nodes}
        distances[source] = 0.0

        min_heap: List[Tuple[float, str, List[str], float, float, float]] = [
            (0.0, source, [source], 0.0, float('inf'), 0.0)
        ]

        best_route = None

        while min_heap:
            current_dist, current_node, path, total_km, min_cap, sum_risk = heapq.heappop(min_heap)

            if current_node == destination:
                best_route = {
                    "path": path,
                    "distance_km": total_km,
                    "bottleneck_cap": min_cap if min_cap != float('inf') else 0.0,
                    "avg_risk": (sum_risk / len(path)) if path else 0.0
                }
                break

            if current_dist > distances[current_node]:
                continue

            for edge in graph.get_neighbors(current_node):
                neighbor = edge.target

                # Avoid quarantined / blocked nodes unless it is the destination
                if neighbor in blocked_set and neighbor != destination:
                    continue

                # Avoid blocked transmission lines
                if edge.line_id in blocked_lines_set or edge.line_id.replace("_REV", "") in blocked_lines_set:
                    continue

                if edge.status.upper() in ("DISCONNECTED", "BLOCKED", "ISOLATED"):
                    continue

                edge_weight = edge.get_weight(mode=weight_mode)
                new_dist = current_dist + edge_weight

                if new_dist < distances.get(neighbor, float('inf')):
                    distances[neighbor] = new_dist
                    new_path = path + [neighbor]
                    new_total_km = total_km + edge.distance_km
                    new_min_cap = min(min_cap, edge.capacity_mw)
                    new_sum_risk = sum_risk + edge.risk_factor

                    heapq.heappush(min_heap, (new_dist, neighbor, new_path, new_total_km, new_min_cap, new_sum_risk))

        elapsed_us = (time.perf_counter() - start_time) * 1_000_000

        if best_route:
            return {
                "source": source,
                "destination": destination,
                "route": best_route["path"],
                "distance_km": round(best_route["distance_km"], 1),
                "hops": len(best_route["path"]) - 1,
                "available": True,
                "bottleneck_capacity_mw": round(best_route["bottleneck_cap"], 1),
                "average_risk_score": round(best_route["avg_risk"], 2),
                "weight_mode": weight_mode,
                "algorithm": "Dijkstra Min-Risk Shortest Path (Binary Min-Heap)",
                "execution_time_us": round(elapsed_us, 2)
            }
        else:
            return {
                "source": source,
                "destination": destination,
                "route": [],
                "distance_km": 0.0,
                "hops": 0,
                "available": False,
                "bottleneck_capacity_mw": 0.0,
                "average_risk_score": 0.0,
                "weight_mode": weight_mode,
                "algorithm": "Dijkstra Min-Risk Shortest Path (Binary Min-Heap)",
                "message": "No viable alternate path exists bypassing all quarantined corridors.",
                "execution_time_us": round(elapsed_us, 2)
            }

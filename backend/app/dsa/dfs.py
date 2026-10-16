"""
Depth-First Search (DFS) Engine for Grid Islanding & Loop/Cycle Detection
"""

import time
from typing import Dict, List, Set, Any
from app.dsa.graph import GridGraph

class DFSEngine:
    @staticmethod
    def traverse(graph: GridGraph, start_node_id: str, max_depth: int = 10) -> Dict[str, Any]:
        """Performs iterative DFS to trace deep transmission cascades and island boundaries."""
        start_time = time.perf_counter()

        if start_node_id not in graph.nodes:
            return {
                "start_asset": start_node_id,
                "algorithm": "DFS",
                "visited_order": [],
                "total_visited": 0,
                "execution_time_us": 0.0
            }

        visited: Set[str] = set()
        visited_order: List[str] = []
        stack: List[tuple] = [(start_node_id, 0)]

        while stack:
            curr_id, depth = stack.pop()
            if curr_id not in visited and depth <= max_depth:
                visited.add(curr_id)
                visited_order.append(curr_id)

                for edge in reversed(graph.get_neighbors(curr_id)):
                    if edge.status.upper() in ("ACTIVE", "HEALTHY") and edge.target not in visited:
                        stack.append((edge.target, depth + 1))

        elapsed_us = (time.perf_counter() - start_time) * 1_000_000

        return {
            "start_asset": start_node_id,
            "algorithm": "DFS (Depth-First Search)",
            "visited_order": visited_order,
            "total_visited": len(visited_order),
            "execution_time_us": round(elapsed_us, 2)
        }

    @staticmethod
    def find_connected_components(graph: GridGraph) -> List[List[str]]:
        """Identifies isolated sub-grid synchronous islands using DFS."""
        visited: Set[str] = set()
        components: List[List[str]] = []

        for node_id in graph.nodes:
            if node_id not in visited:
                component: List[str] = []
                stack = [node_id]
                visited.add(node_id)

                while stack:
                    curr = stack.pop()
                    component.append(curr)
                    for edge in graph.get_neighbors(curr):
                        if edge.status.upper() in ("ACTIVE", "HEALTHY") and edge.target not in visited:
                            visited.add(edge.target)
                            stack.append(edge.target)

                components.append(component)

        return components

    @staticmethod
    def detect_cycles(graph: GridGraph) -> List[List[str]]:
        """Detects transmission closed mesh loops / cycles for grid synchronization analysis."""
        visited: Set[str] = set()
        parent: Dict[str, str] = {}
        cycles: List[List[str]] = []

        def dfs_cycle(u: str, p: str, path: List[str]):
            visited.add(u)
            for edge in graph.get_neighbors(u):
                v = edge.target
                if edge.status.upper() not in ("ACTIVE", "HEALTHY"):
                    continue
                if v == p:
                    continue
                if v in visited:
                    if v in path:
                        cycle_start = path.index(v)
                        cycle = path[cycle_start:] + [v]
                        if len(cycle) > 3:
                            cycles.append(cycle)
                else:
                    dfs_cycle(v, u, path + [v])

        for node_id in list(graph.nodes.keys()):
            if node_id not in visited:
                dfs_cycle(node_id, "", [node_id])

        return cycles


DFSTopologyEngine = DFSEngine

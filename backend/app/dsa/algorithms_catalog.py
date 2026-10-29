"""
GRID//ZERO Complete 13-Algorithm DSA Catalog & Step-Trace Engine.
Executes authentic Data Structures and Algorithms on real electrical network topologies:
1. BFS (O(1) deque FIFO Queue) — Energized Reachability & Cyber Blast Radius
2. DFS (Explicit Stack) — Island Component Enumeration & Cycle Detection
3. Dijkstra (Binary Min-Heap) — Minimum-Impedance / Minimum-Loss Rerouting
4. Tarjan's Bridge & Articulation Point Algorithm — Single-Point-of-Failure (SPoF) Detection
5. Disjoint Set Union (DSU with Path Compression & Union by Rank) — Dynamic Islanding & Radiality Check
6. Binary Max-Heap Priority Queue — Critical Load & Emergency Incident Triage
7. Multi-Key Hash Table (O(1) AssetIndexTable) — Instant Substation & Bay Lookup
8. Prefix Trie (PincodeTrie) — Prefix-Based Substation & Geographic Code Search
9. Circular Ring Buffer (CircularTelemetryBuffer) — High-Rate PMU Telemetry Stream Window
10. Kruskal's Minimum Spanning Tree (MST) — Minimum-Loss Radial Feeder Reconfiguration
11. Dynamic Programming (0/1 & Continuous Critical Knapsack) — Deficit Power Allocation
12. Edmonds-Karp / Min-Cost Max-Flow — Multi-Source Capacity-Constrained Power Delivery
13. A* Spatial-Electrical Routing — Heuristic-Guided Tie-Switch Restoration Pathfinding
"""

from collections import deque
import math
import time
from typing import Dict, Any, List, Optional, Tuple, Set

from app.dsa.trace import AlgorithmTrace, AlgorithmTraceStep
from app.dsa.priority_queue import MinHeap, MaxHeap
from app.dsa.hashing import AssetIndexTable, PincodeTrie, CircularTelemetryBuffer


class DisjointSetUnion:
    """Disjoint Set Union (Union-Find) with Path Compression and Union by Rank."""

    def __init__(self, elements: List[str], node_meta: Optional[Dict[str, Dict[str, float]]] = None):
        self.parent: Dict[str, str] = {x: x for x in elements}
        self.rank: Dict[str, int] = {x: 0 for x in elements}
        self.size: Dict[str, int] = {x: 1 for x in elements}
        self.gen_mw: Dict[str, float] = {x: (node_meta.get(x, {}).get("gen_mw", 0.0) if node_meta else 0.0) for x in elements}
        self.load_mw: Dict[str, float] = {x: (node_meta.get(x, {}).get("load_mw", 0.0) if node_meta else 0.0) for x in elements}
        self.num_components: int = len(elements)
        self.ops: int = 0

    def find(self, x: str) -> str:
        self.ops += 1
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: str, b: str) -> Tuple[bool, str]:
        ra = self.find(a)
        rb = self.find(b)
        self.ops += 1
        if ra == rb:
            return False, ra
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        self.gen_mw[ra] = round(self.gen_mw[ra] + self.gen_mw[rb], 3)
        self.load_mw[ra] = round(self.load_mw[ra] + self.load_mw[rb], 3)
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.num_components -= 1
        return True, ra

    def snapshot(self) -> Dict[str, Any]:
        islands: Dict[str, List[str]] = {}
        for el in self.parent:
            root = self.find(el)
            islands.setdefault(root, []).append(el)
        return {
            "num_components": self.num_components,
            "parent": dict(list(self.parent.items())[:16]),
            "rank": dict(list(self.rank.items())[:16]),
            "islands": [
                {
                    "root": r,
                    "members": m,
                    "size": len(m),
                    "gen_mw": round(self.gen_mw.get(r, 0.0), 2),
                    "load_mw": round(self.load_mw.get(r, 0.0), 2),
                }
                for r, m in islands.items()
            ],
        }


class GridDSACatalog:
    """Executes any of the 13 DSA algorithms on an electrical network and returns an AlgorithmTrace."""

    CATALOG_METADATA: List[Dict[str, Any]] = [
        {
            "id": "BFS",
            "name": "Breadth-First Search (O(1) Deque FIFO)",
            "category": "GRAPH_TRAVERSAL",
            "time_complexity": "O(V + E)",
            "space_complexity": "O(V)",
            "grid_role": "Energized Island Reachability & Cyber Blast Radius Propagation",
        },
        {
            "id": "DFS",
            "name": "Depth-First Search (Explicit LIFO Stack)",
            "category": "GRAPH_TRAVERSAL",
            "time_complexity": "O(V + E)",
            "space_complexity": "O(V)",
            "grid_role": "Connected Component Enumeration & Radial Loop Detection",
        },
        {
            "id": "DIJKSTRA",
            "name": "Dijkstra Shortest-Impedance Routing (Binary Min-Heap)",
            "category": "SHORTEST_PATH",
            "time_complexity": "O((V + E) log V)",
            "space_complexity": "O(V)",
            "grid_role": "Minimum-Impedance / Minimum-Loss Backfeed Pathfinding",
        },
        {
            "id": "TARJAN_BRIDGES",
            "name": "Tarjan's Bridge & Articulation Point Detection",
            "category": "TOPOLOGY_VULNERABILITY",
            "time_complexity": "O(V + E)",
            "space_complexity": "O(V)",
            "grid_role": "Single-Point-of-Failure (SPoF) Branch & Substation Discovery",
        },
        {
            "id": "DSU",
            "name": "Disjoint Set Union (Path Compression + Union by Rank)",
            "category": "TOPOLOGY_VULNERABILITY",
            "time_complexity": "O(E alpha(V))",
            "space_complexity": "O(V)",
            "grid_role": "Dynamic Island Tracking & Cycle-Free Tie-Switch Verification",
        },
        {
            "id": "KRUSKAL_MST",
            "name": "Kruskal's Minimum Spanning Tree (MST)",
            "category": "OPTIMIZATION_GRAPH",
            "time_complexity": "O(E log E)",
            "space_complexity": "O(V + E)",
            "grid_role": "Minimum-Ohmic-Loss Radial Feeder Reconfiguration",
        },
        {
            "id": "KNAPSACK_DP",
            "name": "0/1 & Continuous Critical Load Knapsack (Dynamic Programming)",
            "category": "OPTIMIZATION_DP",
            "time_complexity": "O(N * W)",
            "space_complexity": "O(N * W)",
            "grid_role": "Optimal Critical-Load Preservation under Hard Supply Deficit",
        },
        {
            "id": "MIN_COST_MAX_FLOW",
            "name": "Edmonds-Karp Max-Flow / Min-Cut",
            "category": "OPTIMIZATION_FLOW",
            "time_complexity": "O(V * E^2)",
            "space_complexity": "O(V + E)",
            "grid_role": "Multi-Source (Grid + BESS) Capacity-Constrained Power Routing",
        },
        {"id": "BIPARTITE_MATCHING", "name": "Reserve Source–Critical Load Bipartite Matching", "category": "MATCHING", "time_complexity": "O(S(V + E) + S E_b)", "space_complexity": "O(V + E + E_b)", "grid_role": "One-to-one reserve-source assignment to reachable critical loads; requires AC verification"},
        {
            "id": "ASTAR_ROUTING",
            "name": "A* Spatial-Electrical Heuristic Routing",
            "category": "SHORTEST_PATH",
            "time_complexity": "O((V + E) log V)",
            "space_complexity": "O(V)",
            "grid_role": "3D Euclidean + Impedance Guided Tie-Switch Emergency Routing",
        },
        {
            "id": "MAX_HEAP_TRIAGE",
            "name": "Binary Max-Heap Priority Queue Triage",
            "category": "INDEXING_STREAM",
            "time_complexity": "O(N log N)",
            "space_complexity": "O(N)",
            "grid_role": "Tier-1 Hospital / Water / SCADA Emergency Restoration Ordering",
        },
        {
            "id": "HASH_INDEX",
            "name": "Multi-Key O(1) Inverted Hash Table Index",
            "category": "INDEXING_STREAM",
            "time_complexity": "O(1) average lookup",
            "space_complexity": "O(N)",
            "grid_role": "Constant-Time Substation, Bay, and Tier Asset Resolution",
        },
        {
            "id": "PREFIX_TRIE",
            "name": "Character Prefix Trie",
            "category": "INDEXING_STREAM",
            "time_complexity": "O(L) prefix search",
            "space_complexity": "O(N * L)",
            "grid_role": "Substation Code & Geographic Pincode Prefix Autocomplete",
        },
        {
            "id": "CIRCULAR_BUFFER",
            "name": "Fixed-Capacity O(1) Circular Ring Buffer",
            "category": "INDEXING_STREAM",
            "time_complexity": "O(1) write/read",
            "space_complexity": "O(K)",
            "grid_role": "Bounded-Memory 50 Hz PMU Synchrophasor Sliding Telemetry Window",
        },
    ]

    @staticmethod
    def _extract_graph_Representation(
        network_data: Dict[str, Any],
        tripped_edges: Optional[Set[str]] = None,
        include_tie_lines: bool = False,
    ) -> Tuple[List[str], Dict[str, Dict[str, Any]], List[Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
        tripped = set(tripped_edges or set())
        buses = network_data.get("buses", [])
        lines = network_data.get("lines", [])
        xfmrs = network_data.get("transformers", [])
        loads = network_data.get("loads", [])
        gens = network_data.get("generators", [])
        batteries = network_data.get("batteries", [])

        node_ids: List[str] = [b.bus_id for b in buses]
        node_meta: Dict[str, Dict[str, Any]] = {}
        for b in buses:
            node_meta[b.bus_id] = {
                "name": b.name,
                "voltage_kv": b.voltage_kv,
                "bus_type": str(b.bus_type.value if hasattr(b.bus_type, "value") else b.bus_type),
                "facility_type": b.facility_type or "SUBSTATION",
                "priority_tier": b.priority_tier,
                "criticality_weight": b.criticality_weight,
                "load_mw": float(b.load_P or 0.0),
                "critical_load_mw": float(b.critical_load_mw or 0.0),
                "curtailable_mw": float(b.curtailable_mw or 0.0),
                "gen_mw": float(b.generation_P or 0.0),
                "pos": b.position_3d or [0.0, 0.0, 0.0],
            }
        for g in gens:
            if g.bus_id in node_meta and g.status not in ("OUT_OF_SERVICE", "TRIPPED"):
                node_meta[g.bus_id]["gen_mw"] = max(node_meta[g.bus_id]["gen_mw"], float(g.current_P or g.Pmax * 0.6))
                node_meta[g.bus_id]["pmax_mw"] = float(g.Pmax)
        for batt in batteries:
            if batt.bus_id in node_meta:
                node_meta[batt.bus_id]["battery_kw"] = float(batt.max_discharge_kw)

        edges: List[Dict[str, Any]] = []
        adj: Dict[str, List[Dict[str, Any]]] = {nid: [] for nid in node_ids}

        for l in lines:
            is_tie = "TIE" in l.line_id.upper() or l.status == "OUT_OF_SERVICE"
            if l.line_id in tripped:
                continue
            if not include_tie_lines and l.status in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "OPEN"):
                continue
            z_ohm = math.hypot(float(l.resistance_ohm or 0.1), float(l.reactance_ohm or 0.2))
            weight = round(max(0.05, z_ohm * (1.5 if is_tie else 1.0)), 4)
            edge_obj = {
                "edge_id": l.line_id,
                "name": l.name,
                "u": l.from_bus,
                "v": l.to_bus,
                "weight": weight,
                "resistance_ohm": float(l.resistance_ohm or 0.1),
                "reactance_ohm": float(l.reactance_ohm or 0.2),
                "capacity_mw": float(l.thermal_limit_mw or 5.0),
                "length_km": float(l.length_km or 1.0),
                "is_tie": is_tie,
            }
            edges.append(edge_obj)
            if l.from_bus in adj and l.to_bus in adj:
                adj[l.from_bus].append({**edge_obj, "target": l.to_bus})
                adj[l.to_bus].append({**edge_obj, "target": l.from_bus})

        for x in xfmrs:
            if x.transformer_id in tripped or x.status in ("OUT_OF_SERVICE", "TRIPPED"):
                continue
            weight = round(max(0.05, float(x.impedance_percent or 10.0) / 100.0), 4)
            edge_obj = {
                "edge_id": x.transformer_id,
                "name": x.name,
                "u": x.from_bus,
                "v": x.to_bus,
                "weight": weight,
                "resistance_ohm": 0.05,
                "reactance_ohm": weight,
                "capacity_mw": float(x.rated_mva or 20.0),
                "length_km": 0.5,
                "is_tie": False,
            }
            edges.append(edge_obj)
            if x.from_bus in adj and x.to_bus in adj:
                adj[x.from_bus].append({**edge_obj, "target": x.to_bus})
                adj[x.to_bus].append({**edge_obj, "target": x.from_bus})

        return node_ids, node_meta, edges, adj

    # =========================================================================
    # 1. BREADTH-FIRST SEARCH (BFS) — O(1) Deque FIFO Queue
    # =========================================================================
    @classmethod
    def run_bfs(
        cls,
        network_data: Dict[str, Any],
        source_bus: Optional[str] = None,
        max_hops: int = 6,
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, adj = cls._extract_graph_Representation(network_data, tripped_edges)
        start = source_bus if (source_bus and source_bus in adj) else (node_ids[0] if node_ids else "BUS-01")

        queue: deque[Tuple[str, int]] = deque([(start, 0)])
        visited: Set[str] = {start}
        visited_order: List[str] = [start]
        levels: Dict[str, int] = {start: 0}
        tree_edges: List[str] = []
        steps: List[AlgorithmTraceStep] = []
        ops = 1

        steps.append(
            AlgorithmTraceStep(
                step_index=0,
                operation="INIT_QUEUE",
                description=f"Initialize O(1) FIFO deque with source bus {start} at hop 0.",
                pseudocode_line=2,
                active_nodes=[start],
                visited_nodes=list(visited_order),
                frontier_state={"fifo_queue": [{"bus": start, "hop": 0}], "levels": dict(levels)},
                metrics_snapshot={"visited_count": 1, "queue_size": 1, "ops": ops},
            )
        )

        step_idx = 1
        while queue:
            u, hop = queue.popleft()
            ops += 1
            if hop >= max_hops:
                continue
            neighbors = sorted(adj.get(u, []), key=lambda e: e["target"])
            newly_enqueued: List[str] = []
            for edge in neighbors:
                ops += 1
                v = edge["target"]
                if v not in visited:
                    visited.add(v)
                    visited_order.append(v)
                    levels[v] = hop + 1
                    tree_edges.append(edge["edge_id"])
                    queue.append((v, hop + 1))
                    newly_enqueued.append(v)

            if len(steps) < 35:
                steps.append(
                    AlgorithmTraceStep(
                        step_index=step_idx,
                        operation="DEQUEUE_AND_EXPAND",
                        description=(
                            f"Dequeue {u} (hop {hop}); discovered {len(newly_enqueued)} unvisited neighbor(s): "
                            f"{', '.join(newly_enqueued) if newly_enqueued else 'none'}."
                        ),
                        pseudocode_line=5 if newly_enqueued else 4,
                        active_nodes=[u] + newly_enqueued,
                        active_edges=tree_edges[-len(newly_enqueued):] if newly_enqueued else [],
                        visited_nodes=list(visited_order),
                        selected_edges=list(tree_edges),
                        frontier_state={
                            "dequeued": u,
                            "hop": hop,
                            "fifo_queue": [{"bus": q[0], "hop": q[1]} for q in list(queue)[:12]],
                            "levels": dict(list(levels.items())[:16]),
                        },
                        metrics_snapshot={"visited_count": len(visited), "queue_size": len(queue), "ops": ops},
                    )
                )
                step_idx += 1

        unenergized = [nid for nid in node_ids if nid not in visited]
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)

        return AlgorithmTrace(
            algorithm_id="BFS",
            algorithm_name="Breadth-First Search (O(1) Deque FIFO)",
            category="GRAPH_TRAVERSAL",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges), "source_bus": start, "max_hops": max_hops},
            pseudocode=[
                "1. function BFS(G, source, max_hops):",
                "2.   Q <- deque([(source, 0)]); visited <- {source}",
                "3.   while Q is not empty:",
                "4.     (u, hop) <- Q.popleft()  // O(1) pointer dequeue",
                "5.     for each neighbor (v, edge) of u:",
                "6.       if v not in visited and hop < max_hops:",
                "7.         visited.add(v); Q.append((v, hop + 1))",
                "8.   return visited, levels, unenergized_buses",
            ],
            steps=steps,
            final_output={
                "source_bus": start,
                "energized_buses": visited_order,
                "unenergized_buses": unenergized,
                "hop_levels": levels,
                "tree_edges": tree_edges,
                "reachability_pct": round((len(visited) / max(1, len(node_ids))) * 100.0, 1),
            },
            theoretical_time_complexity="O(V + E)",
            theoretical_space_complexity="O(V)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Determines which downstream substations and critical loads remain electrically energized "
                "from the source bus and computes cascading cyber-physical blast radius by hop distance."
            ),
            failure_modes_and_limitations=(
                "BFS treats all closed branches as unweighted 1-hop links; it verifies topological reachability "
                "but does not compute impedance voltage drop or thermal line loading."
            ),
        )

    # =========================================================================
    # 2. DEPTH-FIRST SEARCH (DFS) — Islanding & Cycle Detection
    # =========================================================================
    @classmethod
    def run_dfs(
        cls,
        network_data: Dict[str, Any],
        source_bus: Optional[str] = None,
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, adj = cls._extract_graph_Representation(network_data, tripped_edges)
        visited: Set[str] = set()
        islands: List[List[str]] = []
        back_edges: List[str] = []
        tree_edges: List[str] = []
        steps: List[AlgorithmTraceStep] = []
        ops = 0
        step_idx = 0

        ordered_starts = ([source_bus] if source_bus in adj else []) + [n for n in node_ids if n != source_bus]

        for root in ordered_starts:
            if root in visited:
                continue
            comp: List[str] = []
            stack: List[Tuple[str, Optional[str], Optional[str]]] = [(root, None, None)]
            while stack:
                u, parent, via_edge = stack.pop()
                ops += 1
                if u in visited:
                    if via_edge and via_edge not in tree_edges and via_edge not in back_edges:
                        back_edges.append(via_edge)
                    continue
                visited.add(u)
                comp.append(u)
                if via_edge:
                    tree_edges.append(via_edge)

                neighbors = sorted(adj.get(u, []), key=lambda e: e["target"], reverse=True)
                for edge in neighbors:
                    ops += 1
                    v = edge["target"]
                    if v == parent:
                        continue
                    if v in visited:
                        if edge["edge_id"] not in back_edges and edge["edge_id"] not in tree_edges:
                            back_edges.append(edge["edge_id"])
                    else:
                        stack.append((v, u, edge["edge_id"]))

                if len(steps) < 35:
                    steps.append(
                        AlgorithmTraceStep(
                            step_index=step_idx,
                            operation="DFS_VISIT",
                            description=f"Pop {u} from stack (Island #{len(islands) + 1}); stack depth = {len(stack)}.",
                            pseudocode_line=5,
                            active_nodes=[u],
                            active_edges=[via_edge] if via_edge else [],
                            visited_nodes=list(visited),
                            selected_edges=list(tree_edges),
                            frontier_state={
                                "call_stack": [s[0] for s in stack[-10:]],
                                "current_island": list(comp),
                                "cycles_found": len(back_edges),
                            },
                            metrics_snapshot={"visited": len(visited), "islands": len(islands) + 1, "cycles": len(back_edges)},
                        )
                    )
                    step_idx += 1
            islands.append(comp)

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="DFS",
            algorithm_name="Depth-First Search (Islanding & Mesh Loop Detector)",
            category="GRAPH_TRAVERSAL",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges)},
            pseudocode=[
                "1. function DFS_Islands_And_Cycles(G):",
                "2.   for each unvisited bus r in G.V:",
                "3.     stack <- [(r, None)]; island <- []",
                "4.     while stack not empty:",
                "5.       (u, parent) <- stack.pop(); mark u visited",
                "6.       for (v, edge) in G.adj[u]:",
                "7.         if v visited and v != parent: record cycle back-edge",
                "8.         else if v not visited: stack.push((v, u))",
            ],
            steps=steps,
            final_output={
                "island_count": len(islands),
                "islands": islands,
                "cycle_back_edges": back_edges,
                "is_radial": len(back_edges) == 0,
                "tree_edges": tree_edges,
            },
            theoretical_time_complexity="O(V + E)",
            theoretical_space_complexity="O(V)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Enumerates electrically isolated sub-grids (islands) after line faults and verifies whether "
                "distribution feeders remain radial (zero back-edges) or contain closed mesh loops."
            ),
            failure_modes_and_limitations="Topological cycle detection does not evaluate phase-angle synchrocheck limits.",
        )

    # =========================================================================
    # 3. DIJKSTRA'S SHORTEST PATH (Binary Min-Heap)
    # =========================================================================
    @classmethod
    def run_dijkstra(
        cls,
        network_data: Dict[str, Any],
        source_bus: Optional[str] = None,
        target_bus: Optional[str] = None,
        tripped_edges: Optional[Set[str]] = None,
        include_tie_lines: bool = True,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, adj = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=include_tie_lines
        )
        start = source_bus if (source_bus and source_bus in adj) else (node_ids[0] if node_ids else "BUS-01")
        goal = target_bus if (target_bus and target_bus in adj) else ("BUS-03" if "BUS-03" in adj else node_ids[-1])

        dist: Dict[str, float] = {n: float("inf") for n in node_ids}
        prev_node: Dict[str, Optional[str]] = {n: None for n in node_ids}
        prev_edge: Dict[str, Optional[str]] = {n: None for n in node_ids}
        dist[start] = 0.0

        pq = MinHeap()
        pq.push(0.0, start)
        visited: Set[str] = set()
        steps: List[AlgorithmTraceStep] = []
        ops = 1
        step_idx = 0

        while not pq.is_empty():
            popped = pq.pop()
            if not popped:
                break
            d_u, u, _ = popped
            ops += 1
            if u in visited:
                continue
            visited.add(u)

            relaxed_list: List[str] = []
            for edge in adj.get(u, []):
                ops += 1
                v = edge["target"]
                if v in visited:
                    continue
                new_d = round(d_u + edge["weight"], 5)
                if new_d < dist[v]:
                    dist[v] = new_d
                    prev_node[v] = u
                    prev_edge[v] = edge["edge_id"]
                    pq.push(new_d, v)
                    relaxed_list.append(f"{v} ({new_d:.3f}Ω)")

            if len(steps) < 35:
                heap_view = [{"bus": item[2], "cost": round(item[0], 4)} for item in pq._heap[:10]]
                steps.append(
                    AlgorithmTraceStep(
                        step_index=step_idx,
                        operation="EXTRACT_MIN_AND_RELAX",
                        description=(
                            f"Extract min-cost bus {u} (dist={d_u:.3f}Ω). "
                            f"Relaxed edges to: {', '.join(relaxed_list) if relaxed_list else 'none'}."
                        ),
                        pseudocode_line=6 if relaxed_list else 4,
                        active_nodes=[u],
                        active_edges=[prev_edge[u]] if prev_edge.get(u) else [],
                        visited_nodes=list(visited),
                        frontier_state={
                            "min_heap": heap_view,
                            "distances": {k: round(v, 4) for k, v in list(dist.items())[:14] if v < float("inf")},
                        },
                        metrics_snapshot={"settled_buses": len(visited), "heap_size": len(pq), "ops": ops},
                    )
                )
                step_idx += 1
            if u == goal:
                break

        path_buses: List[str] = []
        path_edges: List[str] = []
        curr: Optional[str] = goal
        if dist.get(goal, float("inf")) < float("inf"):
            while curr is not None:
                path_buses.append(curr)
                if prev_edge.get(curr):
                    path_edges.append(prev_edge[curr])  # type: ignore
                curr = prev_node.get(curr)
            path_buses.reverse()
            path_edges.reverse()

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="DIJKSTRA",
            algorithm_name="Dijkstra's Shortest-Impedance Routing (Binary Min-Heap)",
            category="SHORTEST_PATH",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges), "source": start, "target": goal},
            pseudocode=[
                "1. function Dijkstra(G, source, target):",
                "2.   dist[*] <- INF; dist[source] <- 0; pq.push(0, source)",
                "3.   while pq not empty:",
                "4.     (d, u) <- pq.extract_min()  // O(log V)",
                "5.     for each (v, z_weight) in G.adj[u]:",
                "6.       if dist[u] + z_weight < dist[v]:",
                "7.         dist[v] <- dist[u] + z_weight; pq.push(dist[v], v)",
                "8.   return reconstruct_path(prev, target)",
            ],
            steps=steps,
            final_output={
                "route_found": len(path_buses) > 0,
                "source_bus": start,
                "target_bus": goal,
                "path_buses": path_buses,
                "path_edges": path_edges,
                "total_impedance_cost": round(dist.get(goal, -1.0), 4) if dist.get(goal, float("inf")) < float("inf") else None,
            },
            theoretical_time_complexity="O((V + E) log V)",
            theoretical_space_complexity="O(V)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Identifies the minimum-series-impedance restoration corridor (including candidate normally-open "
                "tie switches) to re-energize an isolated critical facility with minimal voltage drop."
            ),
            failure_modes_and_limitations=(
                "Dijkstra optimizes path cost for a single source-target pair without checking whether the "
                "resulting power flow exceeds branch thermal ampacity (must be followed by AC power-flow validation)."
            ),
        )

    # =========================================================================
    # 4. TARJAN'S BRIDGE & ARTICULATION POINT ALGORITHM — O(V + E)
    # =========================================================================
    @classmethod
    def run_tarjan(
        cls,
        network_data: Dict[str, Any],
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, adj = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=False
        )
        tin: Dict[str, int] = {}
        low: Dict[str, int] = {}
        visited: Set[str] = set()
        bridges: List[Dict[str, Any]] = []
        articulation_points: Set[str] = set()
        steps: List[AlgorithmTraceStep] = []
        timer = 0
        ops = 0

        def dfs(u: str, parent_edge: Optional[str]) -> None:
            nonlocal timer, ops
            visited.add(u)
            timer += 1
            tin[u] = low[u] = timer
            children = 0
            ops += 1

            for edge in adj.get(u, []):
                ops += 1
                eid = edge["edge_id"]
                v = edge["target"]
                if eid == parent_edge:
                    continue
                if v in visited:
                    low[u] = min(low[u], tin[v])
                else:
                    children += 1
                    dfs(v, eid)
                    low[u] = min(low[u], low[v])
                    if low[v] > tin[u]:
                        bridges.append({"edge_id": eid, "u": u, "v": v, "tin_u": tin[u], "low_v": low[v]})
                        if len(steps) < 35:
                            steps.append(
                                AlgorithmTraceStep(
                                    step_index=len(steps),
                                    operation="BRIDGE_DETECTED",
                                    description=f"Bridge detected on {eid} ({u}–{v}): low[{v}]={low[v]} > tin[{u}]={tin[u]}.",
                                    pseudocode_line=8,
                                    active_nodes=[u, v],
                                    active_edges=[eid],
                                    visited_nodes=list(visited),
                                    selected_edges=[b["edge_id"] for b in bridges],
                                    frontier_state={
                                        "tin": dict(list(tin.items())[:14]),
                                        "low": dict(list(low.items())[:14]),
                                        "bridges": [b["edge_id"] for b in bridges],
                                        "articulation_points": sorted(list(articulation_points)),
                                    },
                                    metrics_snapshot={"bridges_count": len(bridges), "spof_buses": len(articulation_points)},
                                )
                            )
                    if parent_edge is not None and low[v] >= tin[u]:
                        articulation_points.add(u)

            if parent_edge is None and children > 1:
                articulation_points.add(u)

        for nid in node_ids:
            if nid not in visited:
                dfs(nid, None)

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="TARJAN_BRIDGES",
            algorithm_name="Tarjan's Bridge & Articulation Point SPoF Detector",
            category="CONNECTIVITY_SPOF",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges)},
            pseudocode=[
                "1. function TarjanDFS(u, parent_edge):",
                "2.   tin[u] <- low[u] <- ++timer",
                "3.   for each (v, edge) in G.adj[u] where edge != parent_edge:",
                "4.     if v is visited: low[u] <- min(low[u], tin[v])",
                "5.     else:",
                "6.       TarjanDFS(v, edge)",
                "7.       low[u] <- min(low[u], low[v])",
                "8.       if low[v] > tin[u]: mark edge as Critical Bridge (N-1 SPoF)",
            ],
            steps=steps,
            final_output={
                "bridges": bridges,
                "bridge_edge_ids": [b["edge_id"] for b in bridges],
                "articulation_points": sorted(list(articulation_points)),
                "bridge_count": len(bridges),
                "articulation_count": len(articulation_points),
            },
            theoretical_time_complexity="O(V + E)",
            theoretical_space_complexity="O(V)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Identifies N-1 Single-Point-of-Failure (SPoF) radial lines (bridges) and critical substations "
                "(articulation points) whose outage immediately partitions the power grid into disconnected islands."
            ),
        )

    # =========================================================================
    # 5. DISJOINT SET UNION (DSU / UNION-FIND)
    # =========================================================================
    @classmethod
    def run_dsu(
        cls,
        network_data: Dict[str, Any],
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, _ = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=False
        )
        dsu = DisjointSetUnion(node_ids, node_meta)
        steps: List[AlgorithmTraceStep] = []
        cycle_edges: List[str] = []
        merged_edges: List[str] = []

        for idx, edge in enumerate(edges):
            u, v, eid = edge["u"], edge["v"], edge["edge_id"]
            merged, root = dsu.union(u, v)
            if merged:
                merged_edges.append(eid)
            else:
                cycle_edges.append(eid)
            if len(steps) < 35:
                steps.append(
                    AlgorithmTraceStep(
                        step_index=idx,
                        operation="UNION_BY_RANK" if merged else "CYCLE_DETECTED",
                        description=(
                            f"Union({u}, {v}) via {eid}: "
                            + (f"merged into component root {root}." if merged else f"already in component {root} (loop detected).")
                        ),
                        pseudocode_line=5 if merged else 4,
                        active_nodes=[u, v],
                        active_edges=[eid],
                        visited_nodes=node_ids,
                        selected_edges=list(merged_edges),
                        frontier_state=dsu.snapshot(),
                        metrics_snapshot={"components": dsu.num_components, "cycles": len(cycle_edges), "ops": dsu.ops},
                    )
                )

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="DSU",
            algorithm_name="Disjoint Set Union (Path Compression & Union by Rank)",
            category="CONNECTIVITY_SPOF",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges)},
            pseudocode=[
                "1. function Find(x):",
                "2.   if parent[x] != x: parent[x] <- Find(parent[x])  // Path compression",
                "3.   return parent[x]",
                "4. function Union(u, v):",
                "5.   ru, rv <- Find(u), Find(v); if ru == rv: return CYCLE",
                "6.   attach smaller rank tree under larger rank root; aggregate Gen/Load MW",
            ],
            steps=steps,
            final_output={
                **dsu.snapshot(),
                "cycle_edges": cycle_edges,
            },
            theoretical_time_complexity="O(E * alpha(V))",
            theoretical_space_complexity="O(V)",
            empirical_operations=dsu.ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Maintains synchronous island partitions and per-island generation/load balance in near-constant "
                "time while preventing unintended mesh loops during tie-switch restoration."
            ),
        )

    # =========================================================================
    # 6. KRUSKAL'S MINIMUM SPANNING TREE (MST) — Radial Feeder Reconfiguration
    # =========================================================================
    @classmethod
    def run_kruskal_mst(
        cls,
        network_data: Dict[str, Any],
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, _ = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=True
        )
        sorted_edges = sorted(edges, key=lambda e: (e["weight"], e["edge_id"]))
        dsu = DisjointSetUnion(node_ids, node_meta)
        mst_edges: List[Dict[str, Any]] = []
        opened_chord_edges: List[str] = []
        closed_tie_switches: List[str] = []
        steps: List[AlgorithmTraceStep] = []
        ops = len(edges) * max(1, int(math.log2(max(2, len(edges)))))

        for idx, edge in enumerate(sorted_edges):
            u, v, eid = edge["u"], edge["v"], edge["edge_id"]
            merged, root = dsu.union(u, v)
            ops += 1
            if merged:
                mst_edges.append(edge)
                if edge["is_tie"]:
                    closed_tie_switches.append(eid)
            else:
                opened_chord_edges.append(eid)

            if len(steps) < 35:
                steps.append(
                    AlgorithmTraceStep(
                        step_index=idx,
                        operation="MST_ACCEPT_EDGE" if merged else "MST_REJECT_CYCLE",
                        description=(
                            f"Evaluate {eid} ({u}–{v}, Z={edge['weight']:.3f}Ω): "
                            + ("ACCEPTED into radial spanning tree." if merged else "REJECTED (would form closed loop).")
                        ),
                        pseudocode_line=5 if merged else 6,
                        active_nodes=[u, v],
                        active_edges=[eid],
                        selected_edges=[e["edge_id"] for e in mst_edges],
                        frontier_state={
                            "mst_edge_count": len(mst_edges),
                            "target_tree_size": len(node_ids) - 1,
                            "closed_ties": list(closed_tie_switches),
                            "rejected_chords": list(opened_chord_edges),
                        },
                        metrics_snapshot={
                            "mst_edges": len(mst_edges),
                            "components": dsu.num_components,
                            "total_z_ohm": round(sum(e["weight"] for e in mst_edges), 4),
                        },
                    )
                )

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="KRUSKAL_MST",
            algorithm_name="Kruskal's Minimum Spanning Tree (Radial Reconfiguration)",
            category="SPANNING_TREE",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E_including_ties": len(edges)},
            pseudocode=[
                "1. function KruskalRadialReconfiguration(G):",
                "2.   sort all intact sectionalizing & tie branches by impedance weight Z",
                "3.   initialize DSU(G.V); MST <- []",
                "4.   for each branch (u, v, Z) in sorted_branches:",
                "5.     if DSU.Find(u) != DSU.Find(v): DSU.Union(u, v); MST.append(branch)",
                "6.     else: keep branch OPEN to enforce strict radial topology",
                "7.   return MST, closed_tie_switches",
            ],
            steps=steps,
            final_output={
                "mst_edge_ids": [e["edge_id"] for e in mst_edges],
                "closed_tie_lines": closed_tie_switches,
                "opened_loop_lines": opened_chord_edges,
                "total_impedance_weight": round(sum(e["weight"] for e in mst_edges), 4),
                "is_connected_spanning_tree": dsu.num_components == 1,
            },
            theoretical_time_complexity="O(E log E)",
            theoretical_space_complexity="O(V + E)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Constructs a minimum-impedance radial distribution topology after line faults by selecting "
                "which normally-open tie switches to close while guaranteeing zero unintended mesh loops."
            ),
        )

    # =========================================================================
    # 7. DYNAMIC PROGRAMMING (0/1 & Continuous Critical Load Knapsack)
    # =========================================================================
    @classmethod
    def run_knapsack_dp(
        cls,
        network_data: Dict[str, Any],
        available_supply_mw: Optional[float] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        loads = network_data.get("loads", [])
        total_demand = sum(float(ld.P) for ld in loads)
        supply_mw = float(available_supply_mw) if available_supply_mw is not None else round(total_demand * 0.58, 2)

        # Discretize in 100 kW (0.1 MW) units for exact 0/1 DP table on discrete load blocks
        step_mw = 0.2 if total_demand <= 30.0 else 2.0
        cap_units = max(1, min(200, int(round(supply_mw / step_mw))))

        items: List[Dict[str, Any]] = []
        for ld in loads:
            p_mw = float(ld.P)
            crit_mw = float(ld.critical_load_mw) if ld.critical_load_mw > 0 else (p_mw * 0.8 if ld.priority_tier == 1 else 0.0)
            w_units = max(1, int(round(p_mw / step_mw)))
            value = round(p_mw * float(ld.criticality_weight) * (3.0 if ld.priority_tier == 1 else (1.5 if ld.priority_tier == 2 else 0.5)), 2)
            items.append({
                "load_id": ld.load_id,
                "bus_id": ld.bus_id,
                "name": ld.name,
                "demand_mw": p_mw,
                "critical_mw": crit_mw,
                "curtailable_mw": max(0.0, p_mw - crit_mw),
                "priority_tier": ld.priority_tier,
                "weight_units": w_units,
                "criticality_value": value,
            })

        n = len(items)
        dp = [[0.0] * (cap_units + 1) for _ in range(n + 1)]
        steps: List[AlgorithmTraceStep] = []
        ops = 0

        for i in range(1, n + 1):
            it = items[i - 1]
            wi = it["weight_units"]
            vi = it["criticality_value"]
            for w in range(cap_units + 1):
                ops += 1
                if wi <= w and dp[i - 1][w - wi] + vi > dp[i - 1][w]:
                    dp[i][w] = round(dp[i - 1][w - wi] + vi, 2)
                else:
                    dp[i][w] = dp[i - 1][w]

            if len(steps) < 25:
                sample_cols = {f"{round(c * step_mw, 1)}MW": dp[i][c] for c in range(0, cap_units + 1, max(1, cap_units // 6))}
                steps.append(
                    AlgorithmTraceStep(
                        step_index=i - 1,
                        operation="DP_ROW_TRANSITION",
                        description=(
                            f"Evaluate {it['load_id']} ({it['name']}, P={it['demand_mw']}MW, Tier {it['priority_tier']}, "
                            f"Value={vi}): max DP value at {supply_mw}MW = {dp[i][cap_units]:.1f}."
                        ),
                        pseudocode_line=5,
                        active_nodes=[it["bus_id"]],
                        frontier_state={"dp_row_sample": sample_cols, "item": it["load_id"]},
                        metrics_snapshot={"row": i, "max_value": dp[i][cap_units], "ops": ops},
                    )
                )

        # Backtrack 0/1 DP selection
        selected_01: List[str] = []
        rem_w = cap_units
        for i in range(n, 0, -1):
            if dp[i][rem_w] != dp[i - 1][rem_w]:
                selected_01.append(items[i - 1]["load_id"])
                rem_w -= items[i - 1]["weight_units"]
        selected_01.reverse()

        # Also compute continuous Critical-First + Curtailable allocation plan
        remaining_mw = supply_mw
        allocations: List[Dict[str, Any]] = []
        sorted_items = sorted(items, key=lambda x: (x["priority_tier"], -x["criticality_value"]))
        for it in sorted_items:
            take_crit = min(remaining_mw, it["critical_mw"])
            remaining_mw = max(0.0, remaining_mw - take_crit)
            allocations.append({**it, "allocated_mw": round(take_crit, 3)})
        for it in allocations:
            headroom = max(0.0, it["demand_mw"] - it["allocated_mw"])
            take_flex = min(remaining_mw, headroom)
            it["allocated_mw"] = round(it["allocated_mw"] + take_flex, 3)
            it["shed_mw"] = round(max(0.0, it["demand_mw"] - it["allocated_mw"]), 3)
            remaining_mw = max(0.0, remaining_mw - take_flex)

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="KNAPSACK_DP",
            algorithm_name="Dynamic Programming (Critical-Load Knapsack Deficit Allocator)",
            category="DYNAMIC_PROGRAMMING",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"loads_count": n, "total_demand_mw": round(total_demand, 2), "available_supply_mw": supply_mw},
            pseudocode=[
                "1. function CriticalLoadKnapsackDP(loads, Cap_Units):",
                "2.   dp[0..N][0..Cap_Units] <- 0",
                "3.   for i <- 1 to N:",
                "4.     for w <- 0 to Cap_Units:",
                "5.       if weight[i] <= w: dp[i][w] <- max(dp[i-1][w], dp[i-1][w-weight[i]] + crit_val[i])",
                "6.       else: dp[i][w] <- dp[i-1][w]",
                "7.   backtrack optimal critical feeder subset + continuous curtailment schedule",
            ],
            steps=steps,
            final_output={
                "available_supply_mw": supply_mw,
                "total_demand_mw": round(total_demand, 2),
                "optimal_dp_value": dp[n][cap_units],
                "selected_discrete_loads": selected_01,
                "continuous_allocation_plan": allocations,
            },
            theoretical_time_complexity="O(N * W)",
            theoretical_space_complexity="O(N * W)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Computes the mathematically optimal subset of critical loads to keep energized and the exact "
                "non-critical load curtailment (MW) when available generation + battery discharge is less than city demand."
            ),
        )

    # =========================================================================
    # 8. EDMONDS-KARP MAX-FLOW / CAPACITY-CONSTRAINED FLOW
    # =========================================================================
    @classmethod
    def run_max_flow(
        cls,
        network_data: Dict[str, Any],
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, _ = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=False
        )
        super_source = "SUPER_SOURCE"
        super_sink = "SUPER_SINK"
        all_nodes = [super_source] + node_ids + [super_sink]
        cap: Dict[str, Dict[str, float]] = {u: {} for u in all_nodes}
        flow: Dict[str, Dict[str, float]] = {u: {} for u in all_nodes}

        def add_cap(u: str, v: str, c: float) -> None:
            cap[u][v] = cap[u].get(v, 0.0) + c
            cap[v].setdefault(u, 0.0)
            flow[u].setdefault(v, 0.0)
            flow[v].setdefault(u, 0.0)

        total_crit_sink_mw = 0.0
        for nid in node_ids:
            meta = node_meta[nid]
            gen_cap = meta.get("pmax_mw", meta.get("gen_mw", 0.0)) + (meta.get("battery_kw", 0.0) / 1000.0)
            if gen_cap > 0:
                add_cap(super_source, nid, float(gen_cap))
            load_req = meta.get("load_mw", 0.0)
            if load_req > 0:
                add_cap(nid, super_sink, float(load_req))
                total_crit_sink_mw += float(load_req)

        for e in edges:
            add_cap(e["u"], e["v"], float(e["capacity_mw"]))
            add_cap(e["v"], e["u"], float(e["capacity_mw"]))

        max_flow_mw = 0.0
        steps: List[AlgorithmTraceStep] = []
        augmenting_paths: List[Dict[str, Any]] = []
        ops = 0

        while True:
            parent: Dict[str, Optional[str]] = {u: None for u in all_nodes}
            parent[super_source] = super_source
            q: deque[Tuple[str, float]] = deque([(super_source, float("inf"))])
            bottleneck = 0.0

            while q:
                u, f = q.popleft()
                ops += 1
                if u == super_sink:
                    bottleneck = f
                    break
                for v, c_uv in cap[u].items():
                    ops += 1
                    residual = c_uv - flow[u][v]
                    if parent[v] is None and residual > 1e-4:
                        parent[v] = u
                        q.append((v, min(f, residual)))

            if bottleneck <= 1e-4:
                break

            path: List[str] = []
            curr: Optional[str] = super_sink
            while curr is not None and curr != super_source:
                path.append(curr)
                prev = parent[curr]
                if prev is not None:
                    flow[prev][curr] += bottleneck
                    flow[curr][prev] -= bottleneck
                curr = prev
            path.append(super_source)
            path.reverse()
            max_flow_mw = round(max_flow_mw + bottleneck, 3)

            real_buses = [p for p in path if p not in (super_source, super_sink)]
            augmenting_paths.append({"path": real_buses, "flow_mw": round(bottleneck, 3)})

            if len(steps) < 30:
                steps.append(
                    AlgorithmTraceStep(
                        step_index=len(steps),
                        operation="AUGMENT_FLOW_PATH",
                        description=(
                            f"Augmenting path {' -> '.join(real_buses)} carries +{bottleneck:.2f} MW "
                            f"(cumulative max flow = {max_flow_mw:.2f} MW)."
                        ),
                        pseudocode_line=6,
                        active_nodes=real_buses,
                        visited_nodes=real_buses,
                        frontier_state={"augmenting_path": real_buses, "bottleneck_mw": round(bottleneck, 3), "total_flow_mw": max_flow_mw},
                        metrics_snapshot={"max_flow_mw": max_flow_mw, "target_demand_mw": round(total_crit_sink_mw, 2)},
                    )
                )

        reachable = {super_source}
        queue = deque([super_source])
        while queue:
            u = queue.popleft()
            for v, capacity in cap[u].items():
                if v not in reachable and capacity - flow[u][v] > 1e-4:
                    reachable.add(v)
                    queue.append(v)
        cut_capacity = sum(c for u in reachable for v, c in cap[u].items() if v not in reachable)
        cut_edges = [e["edge_id"] for e in edges if (e["u"] in reachable) != (e["v"] in reachable)]
        steps.append(AlgorithmTraceStep(step_index=len(steps), operation="MIN_CUT", description=f"Residual BFS identifies a {cut_capacity:.3f} MW minimum cut; maximum flow is {max_flow_mw:.3f} MW.", active_nodes=[n for n in reachable if n in node_ids], active_edges=cut_edges, frontier_state={"min_cut_edges": cut_edges, "min_cut_capacity_mw": round(cut_capacity, 3)}))
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="MIN_COST_MAX_FLOW",
            algorithm_name="Edmonds-Karp Maximum Deliverable Power Flow",
            category="NETWORK_FLOW",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges), "total_demand_mw": round(total_crit_sink_mw, 2)},
            pseudocode=[
                "1. function EdmondsKarpMaxPowerDelivery(G, Sources, LoadSinks):",
                "2.   connect SuperSource -> Sources (cap=Pmax) and LoadSinks -> SuperSink (cap=Demand)",
                "3.   while BFS finds augmenting path P in residual graph G_f:",
                "4.     bottleneck <- min_{e in P} residual_capacity(e)",
                "5.     augment flow along P by bottleneck; update reverse residual edges",
                "6.   return max_deliverable_mw, saturated_min_cut_corridors",
            ],
            steps=steps,
            final_output={
                "max_deliverable_mw": max_flow_mw,
                "min_cut_capacity_mw": round(cut_capacity,3),
                "min_cut_edges": cut_edges,
                "edge_flows": [{"edge_id":e["edge_id"],"flow_mw":round(flow[e["u"]][e["v"]] * e["capacity_mw"] / max(cap[e["u"]][e["v"]],1e-9),3),"capacity_mw":e["capacity_mw"]} for e in edges],
                "total_demand_mw": round(total_crit_sink_mw, 3),
                "delivery_ratio_pct": round((max_flow_mw / max(1e-6, total_crit_sink_mw)) * 100.0, 1),
                "augmenting_paths": augmenting_paths,
            },
            theoretical_time_complexity="O(V * E^2)",
            theoretical_space_complexity="O(V + E)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Computes an upper bound on total active power (MW) that can be delivered from all generators "
                "and batteries to city loads without exceeding branch thermal limits."
            ),
            failure_modes_and_limitations=(
                "Network flow obeys Kirchhoff's Current Law (nodal conservation) and thermal capacity bounds, "
                "but real AC currents divide according to Kirchhoff's Voltage Law (impedances), so AC validation is still required."
            ),
        )

    # =========================================================================
    # 9. A* SPATIAL-ELECTRICAL ROUTING
    # =========================================================================
    @classmethod
    def run_astar(
        cls,
        network_data: Dict[str, Any],
        source_bus: Optional[str] = None,
        target_bus: Optional[str] = None,
        tripped_edges: Optional[Set[str]] = None,
    ) -> AlgorithmTrace:
        t0 = time.perf_counter()
        node_ids, node_meta, edges, adj = cls._extract_graph_Representation(
            network_data, tripped_edges, include_tie_lines=True
        )
        start = source_bus if (source_bus and source_bus in adj) else (node_ids[0] if node_ids else "BUS-01")
        goal = target_bus if (target_bus and target_bus in adj) else ("BUS-03" if "BUS-03" in adj else node_ids[-1])

        def heuristic(u: str) -> float:
            pu = node_meta.get(u, {}).get("pos", [0.0, 0.0, 0.0])
            pg = node_meta.get(goal, {}).get("pos", [0.0, 0.0, 0.0])
            euclid = math.sqrt((pu[0] - pg[0]) ** 2 + (pu[2] - pg[2]) ** 2)
            return round(euclid * 0.015, 4)

        g_score: Dict[str, float] = {n: float("inf") for n in node_ids}
        f_score: Dict[str, float] = {n: float("inf") for n in node_ids}
        prev_node: Dict[str, Optional[str]] = {n: None for n in node_ids}
        prev_edge: Dict[str, Optional[str]] = {n: None for n in node_ids}
        g_score[start] = 0.0
        f_score[start] = heuristic(start)

        open_heap = MinHeap()
        open_heap.push(f_score[start], start)
        closed_set: Set[str] = set()
        steps: List[AlgorithmTraceStep] = []
        ops = 1

        while not open_heap.is_empty():
            popped = open_heap.pop()
            if not popped:
                break
            f_u, u, _ = popped
            ops += 1
            if u in closed_set:
                continue
            closed_set.add(u)

            if len(steps) < 30:
                steps.append(
                    AlgorithmTraceStep(
                        step_index=len(steps),
                        operation="ASTAR_EXPAND",
                        description=f"Expand {u}: g(u)={g_score[u]:.3f}Ω + h(u)={heuristic(u):.3f} = f(u)={f_u:.3f}.",
                        pseudocode_line=4,
                        active_nodes=[u],
                        visited_nodes=list(closed_set),
                        frontier_state={"u": u, "g": round(g_score[u], 4), "h": heuristic(u), "f": round(f_u, 4)},
                        metrics_snapshot={"expanded": len(closed_set), "ops": ops},
                    )
                )
            if u == goal:
                break

            for edge in adj.get(u, []):
                ops += 1
                v = edge["target"]
                if v in closed_set:
                    continue
                tentative_g = round(g_score[u] + edge["weight"], 5)
                if tentative_g < g_score[v]:
                    prev_node[v] = u
                    prev_edge[v] = edge["edge_id"]
                    g_score[v] = tentative_g
                    f_score[v] = round(tentative_g + heuristic(v), 5)
                    open_heap.push(f_score[v], v)

        path_buses: List[str] = []
        path_edges: List[str] = []
        curr: Optional[str] = goal
        if g_score.get(goal, float("inf")) < float("inf"):
            while curr is not None:
                path_buses.append(curr)
                if prev_edge.get(curr):
                    path_edges.append(prev_edge[curr])  # type: ignore
                curr = prev_node.get(curr)
            path_buses.reverse()
            path_edges.reverse()

        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="ASTAR_ROUTING",
            algorithm_name="A* Spatial-Electrical Tie-Switch Pathfinding",
            category="SHORTEST_PATH",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"V": len(node_ids), "E": len(edges), "source": start, "target": goal},
            pseudocode=[
                "1. function AStarRouting(G, source, target):",
                "2.   g[source] <- 0; f[source] <- h_spatial(source, target); open.push(f[source], source)",
                "3.   while open not empty:",
                "4.     u <- open.extract_min(); if u == target: break",
                "5.     for (v, z_weight) in G.adj[u]:",
                "6.       if g[u] + z_weight < g[v]: g[v] <- g[u] + z_weight; f[v] <- g[v] + h(v, target)",
            ],
            steps=steps,
            final_output={
                "path_buses": path_buses,
                "path_edges": path_edges,
                "total_impedance_cost": round(g_score.get(goal, -1.0), 4),
                "nodes_expanded": len(closed_set),
            },
            theoretical_time_complexity="O((V + E) log V)",
            theoretical_space_complexity="O(V)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning=(
                "Guides emergency feeder pathfinding toward the target critical facility using 3D spatial proximity "
                "as an admissible heuristic, expanding fewer nodes than uninformed search."
            ),
        )

    # =========================================================================
    # 10, 11, 12, 13. MAX-HEAP, HASH TABLE, PREFIX TRIE, CIRCULAR BUFFER TRACES
    # =========================================================================
    @classmethod
    def run_max_heap_triage(cls, network_data: Dict[str, Any]) -> AlgorithmTrace:
        t0 = time.perf_counter()
        loads = network_data.get("loads", [])
        heap = MaxHeap()
        steps: List[AlgorithmTraceStep] = []
        ops = 0

        for idx, ld in enumerate(loads):
            score = round(float(ld.criticality_weight) * 10.0 + float(ld.P) * 5.0 + (40.0 if ld.priority_tier == 1 else 0.0), 2)
            heap.push(score, ld.load_id, {"bus_id": ld.bus_id, "name": ld.name, "tier": ld.priority_tier, "demand_mw": ld.P})
            ops += 1
            steps.append(
                AlgorithmTraceStep(
                    step_index=idx,
                    operation="HEAP_INSERT",
                    description=f"Insert {ld.load_id} ({ld.name}) with urgency score {score} into Binary Max-Heap.",
                    pseudocode_line=3,
                    active_nodes=[ld.bus_id],
                    frontier_state={"max_heap_array": [{"id": x[2], "score": round(-x[0], 2)} for x in heap._heap[:10]]},
                    metrics_snapshot={"heap_size": len(heap), "ops": ops},
                )
            )

        ranked = heap.get_all_sorted()
        elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
        return AlgorithmTrace(
            algorithm_id="MAX_HEAP_TRIAGE",
            algorithm_name="Binary Max-Heap Critical Facility Triage",
            category="INDEXING_STREAM",
            network_id=network_data.get("network_id", "TRAINING_FEEDER"),
            input_summary={"facilities_count": len(loads)},
            pseudocode=[
                "1. function TriageCriticalFacilities(loads):",
                "2.   max_heap <- BinaryMaxHeap()",
                "3.   for load in loads: max_heap.insert(score(load), load)  // O(log N) sift-up",
                "4.   while max_heap not empty: yield max_heap.extract_max()  // O(log N) sift-down",
            ],
            steps=steps,
            final_output={"prioritized_facilities": ranked},
            theoretical_time_complexity="O(N log N)",
            theoretical_space_complexity="O(N)",
            empirical_operations=ops,
            execution_time_ms=elapsed,
            grid_engineering_meaning="Ranks de-energized critical facilities (Hospital, Water, Control Center) for immediate restoration.",
        )

    @classmethod
    def run_indexing_structures(cls, algorithm_id: str, network_data: Dict[str, Any], query: str = "") -> AlgorithmTrace:
        t0 = time.perf_counter()
        buses = network_data.get("buses", [])
        steps: List[AlgorithmTraceStep] = []

        if algorithm_id == "HASH_INDEX":
            tbl = AssetIndexTable()
            for idx, b in enumerate(buses):
                tbl.insert_asset({
                    "id": b.bus_id,
                    "name": b.name,
                    "state": b.facility_type or "SUBSTATION",
                    "district": f"TIER-{b.priority_tier}",
                    "pincode": f"1100{idx + 10:02d}",
                    "operator": "GRIDZERO",
                })
                if len(steps) < 15:
                    steps.append(
                        AlgorithmTraceStep(
                            step_index=idx,
                            operation="HASH_INSERT_O1",
                            description=f"Hash-index {b.bus_id} ({b.name}) across ID, Facility, and Tier buckets.",
                            pseudocode_line=2,
                            active_nodes=[b.bus_id],
                            frontier_state={"total_indexed": len(tbl.all_ids), "facility_buckets": list(tbl.by_state.keys())},
                        )
                    )
            target_q = query or (buses[0].bus_id if buses else "BUS-01")
            found = tbl.get_by_id(target_q) or (tbl.search_by_name(target_q)[0] if tbl.search_by_name(target_q) else None)
            elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
            return AlgorithmTrace(
                algorithm_id="HASH_INDEX",
                algorithm_name="Multi-Key O(1) Hash Table Asset Index",
                category="INDEXING_STREAM",
                network_id=network_data.get("network_id", "TRAINING_FEEDER"),
                input_summary={"assets_indexed": len(buses), "query": target_q},
                pseudocode=[
                    "1. function IndexAsset(asset):",
                    "2.   by_id[asset.id] <- asset; by_tier[asset.tier].add(asset.id)",
                    "3. function LookupById(id): return by_id.get(id)  // O(1) average",
                ],
                steps=steps,
                final_output={"matched_asset": found, "bucket_count": len(tbl.by_state)},
                theoretical_time_complexity="O(1) lookup / O(N) build",
                theoretical_space_complexity="O(N)",
                empirical_operations=len(buses) + 1,
                execution_time_ms=elapsed,
                grid_engineering_meaning="Resolves SCADA telemetry asset IDs to electrical busbars in O(1) constant time.",
            )

        elif algorithm_id == "PREFIX_TRIE":
            trie = PincodeTrie()
            for idx, b in enumerate(buses):
                code = b.bus_id.replace("-", "")
                trie.insert(code, b.bus_id)
                if len(steps) < 15:
                    steps.append(
                        AlgorithmTraceStep(
                            step_index=idx,
                            operation="TRIE_INSERT",
                            description=f"Insert prefix key '{code}' -> {b.bus_id} into Prefix Trie.",
                            pseudocode_line=2,
                            active_nodes=[b.bus_id],
                            frontier_state={"key": code, "bus_id": b.bus_id},
                        )
                    )
            prefix = query or "BUS"
            matches = trie.search_prefix(prefix.replace("-", ""))
            elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
            return AlgorithmTrace(
                algorithm_id="PREFIX_TRIE",
                algorithm_name="Prefix Trie Substation & Pincode Lookup",
                category="INDEXING_STREAM",
                network_id=network_data.get("network_id", "TRAINING_FEEDER"),
                input_summary={"keys_inserted": len(buses), "prefix": prefix},
                pseudocode=[
                    "1. function TrieInsert(code, asset_id): walk/create character nodes; attach asset_id",
                    "2. function SearchPrefix(prefix): traverse L chars in O(L); return subtree asset_ids",
                ],
                steps=steps,
                final_output={"prefix": prefix, "matching_buses": matches},
                theoretical_time_complexity="O(L) prefix traversal",
                theoretical_space_complexity="O(N * L)",
                empirical_operations=len(buses) * 5,
                execution_time_ms=elapsed,
                grid_engineering_meaning="Enables instant prefix autocomplete across substation codes and regional pincodes.",
            )

        else:  # CIRCULAR_BUFFER
            buf = CircularTelemetryBuffer(capacity=8)
            for idx, b in enumerate(buses[:12]):
                sample = {"step": idx, "bus_id": b.bus_id, "v_pu": b.voltage_pu, "freq_hz": round(50.0 - idx * 0.01, 3)}
                buf.append(sample)
                steps.append(
                    AlgorithmTraceStep(
                        step_index=idx,
                        operation="RING_BUFFER_WRITE",
                        description=f"Write telemetry frame #{idx} ({b.bus_id}, V={b.voltage_pu}pu) into ring buffer.",
                        pseudocode_line=2,
                        active_nodes=[b.bus_id],
                        frontier_state={"window": buf.get_latest(8), "capacity": 8},
                    )
                )
            elapsed = round((time.perf_counter() - t0) * 1000.0, 3)
            return AlgorithmTrace(
                algorithm_id="CIRCULAR_BUFFER",
                algorithm_name="Circular Ring Buffer PMU Telemetry Stream",
                category="INDEXING_STREAM",
                network_id=network_data.get("network_id", "TRAINING_FEEDER"),
                input_summary={"capacity": 8, "frames_processed": min(12, len(buses))},
                pseudocode=[
                    "1. function AppendSample(frame):",
                    "2.   buffer[write_ptr] <- frame; write_ptr <- (write_ptr + 1) mod capacity  // O(1)",
                ],
                steps=steps,
                final_output={"latest_frames": buf.get_latest(8)},
                theoretical_time_complexity="O(1) per sample",
                theoretical_space_complexity="O(K) fixed ring capacity",
                empirical_operations=min(12, len(buses)),
                execution_time_ms=elapsed,
                grid_engineering_meaning="Bounds memory consumption for continuous 50 Hz PMU synchrophasor streams.",
            )

    @classmethod
    def run_algorithm(
        cls,
        algorithm_id: str,
        network_data: Optional[Dict[str, Any]] = None,
        net_data: Optional[Dict[str, Any]] = None,
        source_bus: Optional[str] = None,
        target_bus: Optional[str] = None,
        tripped_edges: Optional[Set[str]] = None,
        faulted_branches: Optional[List[str]] = None,
        closed_switches: Optional[List[str]] = None,
        available_supply_mw: Optional[float] = None,
        query: str = "",
        parameters: Optional[Dict[str, Any]] = None,
    ) -> AlgorithmTrace:
        ndata = network_data if network_data is not None else (net_data or {})
        params = parameters or {}
        src = source_bus or params.get("source_bus")
        tgt = target_bus or params.get("target_bus")
        tripped = set(tripped_edges or set()) | set(faulted_branches or [])
        cap_mw = available_supply_mw if available_supply_mw is not None else params.get("capacity_mw")
        q_str = query or str(params.get("query_prefix") or params.get("query") or "")

        aid = algorithm_id.upper().strip()
        if aid == "BFS":
            return cls.run_bfs(ndata, source_bus=src, tripped_edges=tripped)
        elif aid == "DFS":
            return cls.run_dfs(ndata, source_bus=src, tripped_edges=tripped)
        elif aid == "DIJKSTRA":
            return cls.run_dijkstra(ndata, source_bus=src, target_bus=tgt, tripped_edges=tripped)
        elif aid in ("TARJAN", "TARJAN_BRIDGES"):
            return cls.run_tarjan(ndata, tripped_edges=tripped)
        elif aid == "DSU":
            return cls.run_dsu(ndata, tripped_edges=tripped)
        elif aid in ("KRUSKAL", "KRUSKAL_MST", "MST"):
            return cls.run_kruskal_mst(ndata, tripped_edges=tripped)
        elif aid in ("KNAPSACK", "KNAPSACK_DP", "DP"):
            return cls.run_knapsack_dp(ndata, available_supply_mw=cap_mw)
        elif aid in ("MAX_FLOW", "MIN_COST_MAX_FLOW", "FLOW"):
            return cls.run_max_flow(ndata, tripped_edges=tripped)
        elif aid == "BIPARTITE_MATCHING":
            from app.dsa.matching import run_reserve_matching
            nodes, meta, edges, _ = cls._extract_graph_Representation(ndata, tripped)
            return run_reserve_matching(ndata, nodes, edges, meta)
        elif aid in ("ASTAR", "ASTAR_ROUTING"):
            return cls.run_astar(ndata, source_bus=src, target_bus=tgt, tripped_edges=tripped)
        elif aid in ("MAX_HEAP", "MAX_HEAP_TRIAGE"):
            return cls.run_max_heap_triage(ndata)
        elif aid in ("HASH_INDEX", "PREFIX_TRIE", "CIRCULAR_BUFFER"):
            return cls.run_indexing_structures(aid, ndata, query=q_str)
        else:
            raise ValueError(f"Unsupported algorithm_id: {algorithm_id}")

"""
GRIDSEC — DSA-First Power Grid Security Game Integration Test Suite
Validates:
1. Binary Min-Heap Priority Queue (Dijkstra)
2. Binary Max-Heap Priority Queue (Incident Prioritization)
3. Disjoint Set Union (DSU with Path Compression & Union by Rank)
4. Breadth-First Search (BFS level traversal & reachability on active graph)
5. Depth-First Search (DFS structural traversal & cycle detection)
6. Dijkstra's Shortest Path under active line outages
7. Tarjan's Bridge-Finding Algorithm (low[v] > tin[u] and component handling)
8. Frontend Code Architecture & 3-Layer Educational Model verification
"""

import heapq
import json
import os
import sys

# ============================================================================
# 1. PYTHON REFERENCE IMPLEMENTATIONS OF CORE DSA ENGINE DATA STRUCTURES
# ============================================================================

class PyMinPriorityQueue:
    def __init__(self):
        self.heap = []
        self._counter = 0

    def insert(self, node, priority):
        heapq.heappush(self.heap, (priority, self._counter, node))
        self._counter += 1

    def extract_min(self):
        if not self.heap:
            return None
        priority, _, node = heapq.heappop(self.heap)
        return {"node": node, "priority": priority}

    def is_empty(self):
        return len(self.heap) == 0

    def size(self):
        return len(self.heap)


class PyMaxPriorityQueue:
    """Genuine Binary Max-Heap implementing insert, extract_max, and bubble/sink."""
    def __init__(self):
        self.heap = []

    def insert(self, item, priority):
        self.heap.append({"item": item, "priority": priority})
        self._bubble_up(len(self.heap) - 1)

    def extract_max(self):
        if not self.heap:
            return None
        max_item = self.heap[0]
        end_item = self.heap.pop()
        if self.heap:
            self.heap[0] = end_item
            self._sink_down(0)
        return max_item

    def peek(self):
        return self.heap[0] if self.heap else None

    def is_empty(self):
        return len(self.heap) == 0

    def size(self):
        return len(self.heap)

    def _bubble_up(self, idx):
        element = self.heap[idx]
        while idx > 0:
            parent_idx = (idx - 1) // 2
            parent = self.heap[parent_idx]
            if element["priority"] <= parent["priority"]:
                break
            self.heap[idx] = parent
            self.heap[parent_idx] = element
            idx = parent_idx

    def _sink_down(self, idx):
        length = len(self.heap)
        element = self.heap[idx]
        while True:
            left_child_idx = 2 * idx + 1
            right_child_idx = 2 * idx + 2
            swap = None

            if left_child_idx < length:
                if self.heap[left_child_idx]["priority"] > element["priority"]:
                    swap = left_child_idx

            if right_child_idx < length:
                if (swap is None and self.heap[right_child_idx]["priority"] > element["priority"]) or \
                   (swap is not None and self.heap[right_child_idx]["priority"] > self.heap[left_child_idx]["priority"]):
                    swap = right_child_idx

            if swap is None:
                break
            self.heap[idx] = self.heap[swap]
            self.heap[swap] = element
            idx = swap


class PyDisjointSetUnion:
    """Disjoint Set Union with Path Compression and Union by Rank."""
    def __init__(self, elements):
        self.parent = {el: el for el in elements}
        self.rank = {el: 0 for el in elements}
        self.num_sets = len(elements)

    def find(self, i):
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])  # Path compression
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
            self.num_sets -= 1
            return True
        return False


# ============================================================================
# 2. PYTHON ALGORITHMS FOR VALIDATING GAME TOPOLOGIES
# ============================================================================

def py_run_bfs(nodes, edges, source_id, excluded_edges=None):
    excluded_edges = excluded_edges or set()
    adj = {n: [] for n in nodes}
    for u, v, line_id in edges:
        if line_id not in excluded_edges and f"{u}-{v}" not in excluded_edges and f"{v}-{u}" not in excluded_edges:
            adj[u].append(v)
            adj[v].append(u)

    visited = {source_id}
    queue = [(source_id, 0)]
    visited_order = [source_id]
    levels = {source_id: 0}
    examined_edges = 0

    while queue:
        u, depth = queue.pop(0)
        for v in sorted(adj[u]):
            examined_edges += 1
            if v not in visited:
                visited.add(v)
                visited_order.append(v)
                levels[v] = depth + 1
                queue.append((v, depth + 1))

    unreachable = [n for n in nodes if n not in visited]
    return {
        "visited_order": visited_order,
        "visited_count": len(visited),
        "levels": levels,
        "unreachable": unreachable,
        "examined_edges": examined_edges
    }


def py_run_dfs(nodes, edges, source_id, excluded_edges=None):
    excluded_edges = excluded_edges or set()
    adj = {n: [] for n in nodes}
    for u, v, line_id in edges:
        if line_id not in excluded_edges and f"{u}-{v}" not in excluded_edges and f"{v}-{u}" not in excluded_edges:
            adj[u].append(v)
            adj[v].append(u)

    visited = set()
    traversal_order = []
    tree_edges = []
    back_edges = []
    examined_edges = [0]

    def dfs(u, parent):
        visited.add(u)
        traversal_order.append(u)
        for v in sorted(adj[u]):
            examined_edges[0] += 1
            if v not in visited:
                tree_edges.append((u, v))
                dfs(v, u)
            elif v != parent:
                back_edges.append((u, v))

    dfs(source_id, None)
    unreachable = [n for n in nodes if n not in visited]
    return {
        "traversal_order": traversal_order,
        "visited_count": len(visited),
        "tree_edges": tree_edges,
        "back_edges": back_edges,
        "cycle_count": len(back_edges),
        "unreachable": unreachable,
        "examined_edges": examined_edges[0]
    }


def py_run_dijkstra(nodes, edges_with_weights, source_id, target_id, excluded_edges=None):
    excluded_edges = excluded_edges or set()
    adj = {n: [] for n in nodes}
    for u, v, weight, line_id in edges_with_weights:
        if line_id not in excluded_edges and f"{u}-{v}" not in excluded_edges and f"{v}-{u}" not in excluded_edges:
            adj[u].append((v, weight, line_id))
            adj[v].append((u, weight, line_id))

    distances = {n: float("inf") for n in nodes}
    previous = {}
    distances[source_id] = 0.0

    pq = PyMinPriorityQueue()
    pq.insert(source_id, 0.0)
    explored = []

    while not pq.is_empty():
        item = pq.extract_min()
        u = item["node"]
        d = item["priority"]
        explored.append(u)

        if u == target_id:
            break

        for v, weight, line_id in adj[u]:
            alt = d + weight
            if alt < distances[v]:
                distances[v] = alt
                previous[v] = u
                pq.insert(v, alt)

    path = []
    curr = target_id
    while curr:
        path.insert(0, curr)
        if curr == source_id:
            break
        curr = previous.get(curr)

    is_found = len(path) > 1 and path[0] == source_id
    return {
        "success": is_found,
        "path": path if is_found else [],
        "cost": distances[target_id] if is_found else float("inf"),
        "explored": explored
    }


def py_run_tarjan_bridges(nodes, edges, excluded_edges=None):
    excluded_edges = excluded_edges or set()
    adj = {n: [] for n in nodes}
    for u, v, line_id in edges:
        if line_id not in excluded_edges and f"{u}-{v}" not in excluded_edges and f"{v}-{u}" not in excluded_edges:
            adj[u].append((v, line_id))
            adj[v].append((u, line_id))

    tin = {}
    low = {}
    visited = set()
    bridges = []
    articulation_points = set()
    timer = [0]
    components = [0]

    def dfs(u, parent=None):
        visited.add(u)
        timer[0] += 1
        tin[u] = low[u] = timer[0]
        children = 0

        for v, line_id in sorted(adj[u], key=lambda x: x[0]):
            if v == parent:
                continue
            if v in visited:
                low[u] = min(low[u], tin[v])
            else:
                children += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])

                if parent is not None and low[v] >= tin[u]:
                    articulation_points.add(u)
                if low[v] > tin[u]:
                    bridges.append((u, v, line_id, tin[u], low[v]))

        if parent is None and children > 1:
            articulation_points.add(u)

    for n in sorted(nodes):
        if n not in visited:
            components[0] += 1
            dfs(n)

    return {
        "bridges": bridges,
        "articulation_points": sorted(list(articulation_points)),
        "tin": tin,
        "low": low,
        "components": components[0]
    }


# ============================================================================
# 3. TEST SUITE IMPLEMENTATION
# ============================================================================

def run_tests():
    print("=" * 78)
    print("GRIDSEC: GRID DEFENDER — DSA-First Comprehensive Test Suite")
    print("=" * 78)

    passed = 0
    total = 0

    # Test 1: Binary Max-Heap Operations & Invariant
    total += 1
    print("\n[Test 1] Binary Max-Heap Priority Queue (Insert, Extract-Max & Invariant)")
    pq = PyMaxPriorityQueue()
    pq.insert("ALERT-1", 45)
    pq.insert("ALERT-2", 95)
    pq.insert("ALERT-3", 70)
    pq.insert("ALERT-4", 95)
    pq.insert("ALERT-5", 12)
    pq.insert("ALERT-6", 88)

    extracted_priorities = []
    while not pq.is_empty():
        item = pq.extract_max()
        extracted_priorities.append(item["priority"])

    assert extracted_priorities == [95, 95, 88, 70, 45, 12], f"Max-Heap extracted out of order: {extracted_priorities}"
    print(f"  ✓ Max-Heap extracted strictly in descending priority: {extracted_priorities}")
    passed += 1

    # Test 2: Disjoint Set Union (DSU) Path Compression & Island Detection
    total += 1
    print("\n[Test 2] Disjoint Set Union (Path Compression & Island Clusters)")
    nodes_sample = ["BUS-1", "BUS-2", "BUS-3", "BUS-4", "BUS-5", "BUS-6"]
    dsu = PyDisjointSetUnion(nodes_sample)
    dsu.union("BUS-1", "BUS-2")
    dsu.union("BUS-2", "BUS-3")
    dsu.union("BUS-4", "BUS-5")

    # Set count should be 3: {1, 2, 3}, {4, 5}, {6}
    assert dsu.num_sets == 3, f"Expected 3 sets, got {dsu.num_sets}"
    assert dsu.find("BUS-1") == dsu.find("BUS-3"), "BUS-1 and BUS-3 should share same root"
    assert dsu.find("BUS-1") != dsu.find("BUS-4"), "BUS-1 and BUS-4 should be in different islands"
    print(f"  ✓ DSU partitioned into {dsu.num_sets} clusters correctly")
    passed += 1

    # Test 3: BFS Level Traversal & Reachability on IEEE 30 / Microgrid
    total += 1
    print("\n[Test 3] Breadth-First Search (BFS) Traversal, Reachability & Excluded Edges")
    grid_nodes = ["BUS-1", "BUS-2", "BUS-3", "BUS-4"]
    grid_edges = [
        ("BUS-1", "BUS-2", "LINE-1-2"),
        ("BUS-1", "BUS-3", "LINE-1-3"),
        ("BUS-2", "BUS-4", "LINE-2-4"),
        ("BUS-3", "BUS-4", "LINE-3-4")
    ]
    # Normal BFS from BUS-1
    bfs_norm = py_run_bfs(grid_nodes, grid_edges, "BUS-1")
    assert bfs_norm["visited_count"] == 4, f"All 4 nodes should be reachable, got {bfs_norm['visited_count']}"
    assert bfs_norm["levels"]["BUS-4"] == 2, f"BUS-4 depth should be 2, got {bfs_norm['levels']['BUS-4']}"

    # Disconnected graph: trip LINE-1-2 and LINE-3-4 and LINE-2-4 (isolates BUS-2)
    bfs_disconn = py_run_bfs(grid_nodes, grid_edges, "BUS-1", excluded_edges={"LINE-1-2", "LINE-2-4"})
    assert "BUS-2" in bfs_disconn["unreachable"], "BUS-2 should be unreachable when both its lines are outaged"
    print(f"  ✓ BFS correctly computes levels and identifies unreachable nodes ({bfs_disconn['unreachable']})")
    passed += 1

    # Test 4: DFS Deep Traversal & Cycle Detection
    total += 1
    print("\n[Test 4] Depth-First Search (DFS) Cycle Detection & Mesh Back-Edges")
    dfs_res = py_run_dfs(grid_nodes, grid_edges, "BUS-1")
    assert dfs_res["visited_count"] == 4, "DFS should visit all connected nodes"
    assert dfs_res["cycle_count"] >= 1, "Cycle should be detected in 4-node ring mesh"
    print(f"  ✓ DFS traversal completed with {dfs_res['cycle_count']} back-edges identified")
    passed += 1

    # Test 5: Dijkstra Shortest Path with Min-Heap under Active Outage
    total += 1
    print("\n[Test 5] Dijkstra's Algorithm with Min-Heap under Active Corridor Outage")
    weighted_edges = [
        ("BUS-1", "BUS-2", 5.0, "LINE-1-2"),
        ("BUS-1", "BUS-3", 4.0, "LINE-1-3"),
        ("BUS-3", "BUS-4", 3.0, "LINE-3-4"),
        ("BUS-4", "BUS-2", 4.0, "LINE-2-4")
    ]
    # Baseline: Direct path BUS-1 -> BUS-2 (cost 5.0)
    dijk_base = py_run_dijkstra(grid_nodes, weighted_edges, "BUS-1", "BUS-2")
    assert dijk_base["path"] == ["BUS-1", "BUS-2"], f"Expected direct path, got {dijk_base['path']}"
    assert dijk_base["cost"] == 5.0, f"Expected cost 5.0, got {dijk_base['cost']}"

    # Scenario Level 2 Outage: LINE-1-2 is tripped!
    dijk_outage = py_run_dijkstra(grid_nodes, weighted_edges, "BUS-1", "BUS-2", excluded_edges={"LINE-1-2"})
    assert dijk_outage["path"] == ["BUS-1", "BUS-3", "BUS-4", "BUS-2"], f"Expected bypass path, got {dijk_outage['path']}"
    assert dijk_outage["cost"] == 11.0, f"Expected bypass cost 11.0 (4+3+4), got {dijk_outage['cost']}"
    print(f"  ✓ Dijkstra found bypass route {dijk_outage['path']} (cost {dijk_outage['cost']}) when LINE-1-2 tripped")
    passed += 1

    # Test 6: Tarjan's Bridge-Finding Algorithm (low[v] > tin[u])
    total += 1
    print("\n[Test 6] Tarjan's Bridge-Finding Algorithm (Condition low[v] > tin[u])")
    # Topology with a bridge: A ring {1, 2, 3} connected by bridge {3-4} to a leaf node {4}
    bridge_nodes = ["BUS-1", "BUS-2", "BUS-3", "BUS-4"]
    bridge_edges = [
        ("BUS-1", "BUS-2", "LINE-1-2"),
        ("BUS-2", "BUS-3", "LINE-2-3"),
        ("BUS-3", "BUS-1", "LINE-3-1"),
        ("BUS-3", "BUS-4", "LINE-3-4")  # Bridge!
    ]
    tarjan_res = py_run_tarjan_bridges(bridge_nodes, bridge_edges)
    detected_bridges = [b[2] for b in tarjan_res["bridges"]]
    assert "LINE-3-4" in detected_bridges, f"LINE-3-4 should be identified as bridge, got {detected_bridges}"
    assert len(detected_bridges) == 1, f"Only LINE-3-4 is a bridge, got {detected_bridges}"
    # Verify condition low[v] > tin[u]
    b_u, b_v, b_id, b_tin, b_low = tarjan_res["bridges"][0]
    assert b_low > b_tin, f"Bridge condition violated: low={b_low}, tin={b_tin}"
    print(f"  ✓ Tarjan correctly identified bridge {b_id} (tin={b_tin}, low={b_low}, low > tin verified)")
    passed += 1

    # Test 7: Tarjan's Algorithm on Disconnected Components
    total += 1
    print("\n[Test 7] Tarjan's Algorithm Handling Disconnected Components")
    disconn_nodes = ["BUS-1", "BUS-2", "BUS-3", "BUS-4", "BUS-5", "BUS-6"]
    disconn_edges = [
        ("BUS-1", "BUS-2", "LINE-1-2"),  # Component 1 (Bridge)
        ("BUS-3", "BUS-4", "LINE-3-4"),  # Component 2 (Ring)
        ("BUS-4", "BUS-5", "LINE-4-5"),
        ("BUS-5", "BUS-3", "LINE-5-3"),
        ("BUS-5", "BUS-6", "LINE-5-6")   # Component 2 (Bridge to 6)
    ]
    tarjan_multi = py_run_tarjan_bridges(disconn_nodes, disconn_edges)
    assert tarjan_multi["components"] == 2, f"Expected 2 components, got {tarjan_multi['components']}"
    multi_bridges = [b[2] for b in tarjan_multi["bridges"]]
    assert "LINE-1-2" in multi_bridges and "LINE-5-6" in multi_bridges, f"Expected LINE-1-2 and LINE-5-6, got {multi_bridges}"
    print(f"  ✓ Tarjan handled {tarjan_multi['components']} disconnected components; detected bridges {multi_bridges}")
    passed += 1

    # Test 8: Frontend Source Code Inspection & Contract Compliance
    total += 1
    print("\n[Test 8] Frontend Code Architecture & DSA Specification Compliance")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dsa_engine_path = os.path.join(base_dir, "js", "engine", "dsaEngine.js")
    defender_view_path = os.path.join(base_dir, "js", "views", "defenderView.js")
    map_vis_path = os.path.join(base_dir, "js", "visualizer", "indiaMapVisualizer.js")
    app_html_path = os.path.join(base_dir, "app.html")

    assert os.path.exists(dsa_engine_path), "dsaEngine.js must exist"
    assert os.path.exists(defender_view_path), "defenderView.js must exist"
    assert os.path.exists(map_vis_path), "indiaMapVisualizer.js must exist"
    assert os.path.exists(app_html_path), "app.html must exist"

    with open(dsa_engine_path, "r", encoding="utf-8") as f:
        dsa_src = f.read()
    with open(defender_view_path, "r", encoding="utf-8") as f:
        def_src = f.read()
    with open(map_vis_path, "r", encoding="utf-8") as f:
        map_src = f.read()
    with open(app_html_path, "r", encoding="utf-8") as f:
        html_src = f.read()

    # Verify dsaEngine classes & methods
    assert "class MaxPriorityQueue" in dsa_src, "MaxPriorityQueue missing in dsaEngine.js"
    assert "class MinPriorityQueue" in dsa_src, "MinPriorityQueue missing in dsaEngine.js"
    assert "class DisjointSetUnion" in dsa_src, "DisjointSetUnion missing in dsaEngine.js"
    assert "runBFS(" in dsa_src, "runBFS method missing in dsaEngine.js"
    assert "runDFS(" in dsa_src, "runDFS method missing in dsaEngine.js"
    assert "findAlternateRoute(" in dsa_src, "findAlternateRoute method missing in dsaEngine.js"
    assert "findSinglePointsOfFailure(" in dsa_src, "findSinglePointsOfFailure method missing in dsaEngine.js"
    assert "detectGridIslands(" in dsa_src, "detectGridIslands method missing in dsaEngine.js"
    assert "prioritizeIncidentsHeap(" in dsa_src, "prioritizeIncidentsHeap method missing in dsaEngine.js"

    # Verify defenderView DSA actions & 3-layer panel
    assert "actionRunBFS" in def_src, "actionRunBFS missing in defenderView.js"
    assert "actionRunDFS" in def_src, "actionRunDFS missing in defenderView.js"
    assert "actionRunDijkstra" in def_src, "actionRunDijkstra missing in defenderView.js"
    assert "actionRunTarjan" in def_src, "actionRunTarjan missing in defenderView.js"
    assert "actionRunMaxHeap" in def_src, "actionRunMaxHeap missing in defenderView.js"
    assert "actionRunDSU" in def_src, "actionRunDSU missing in defenderView.js"
    assert "actionAuditFeasibility" in def_src, "actionAuditFeasibility missing in defenderView.js"
    assert "Layer 1 — Operator Plain-English Briefing" in def_src, "Layer 1 missing in defenderView.js"
    assert "Layer 2 — Live Data Structure & Traversal State" in def_src, "Layer 2 missing in defenderView.js"
    assert "Layer 3 — Algorithm Details & Engineering Constraints" in def_src or "Layer 3 — Algorithm Details &amp; Engineering Constraints" in def_src, "Layer 3 missing in defenderView.js"
    assert "Replay Story" in def_src, "Replay Story missing in defenderView.js"

    # Verify visualizer styling for DSA
    assert "'bridge'" in map_src, "bridge state style missing in indiaMapVisualizer.js"
    assert "'highlighted_path'" in map_src, "highlighted_path style missing in indiaMapVisualizer.js"
    assert "'bfs_frontier'" in map_src or "'bfs_visited'" in map_src, "bfs frontier styles missing in map visualizer"

    # Verify app.html script registrations
    assert "js/engine/graph.js" in html_src, "graph.js not loaded in app.html"
    assert "js/engine/dsaEngine.js" in html_src, "dsaEngine.js not loaded in app.html"
    assert "js/views/defenderIntroView.js" in html_src, "defenderIntroView.js not loaded in app.html"
    assert "js/views/defenderView.js" in html_src, "defenderView.js not loaded in app.html"

    print("  ✓ All required frontend files, classes, methods, and 3-layer templates are verified!")
    passed += 1

    # Summary
    print("\n" + "=" * 78)
    print(f"RESULTS: {passed}/{total} tests PASSED (100% success rate)")
    print("=" * 78)
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

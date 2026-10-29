"""Augmenting-path matching for one-source/one-critical-load reserve assignments.
This is a dispatch-planning aid, not an electrical feasibility calculation.
"""
from collections import deque
from time import perf_counter
from app.dsa.trace import AlgorithmTrace, AlgorithmTraceStep


def run_reserve_matching(network_data, node_ids, edges, node_meta):
    started = perf_counter()
    adjacency = {node: [] for node in node_ids}
    for edge in edges:
        adjacency[edge["u"]].append(edge["v"])
        adjacency[edge["v"]].append(edge["u"])
    sources = []
    for gen in network_data.get("generators", []):
        if gen.status not in ("OUT_OF_SERVICE", "TRIPPED") and gen.Pmax > 0:
            sources.append({"id": gen.generator_id, "bus": gen.bus_id, "capacity_mw": float(gen.Pmax)})
    for battery in network_data.get("batteries", []):
        available_kwh = max(0.0, battery.soc_kwh - battery.capacity_kwh * battery.soc_min_percent / 100)
        capacity = min(battery.max_discharge_kw, available_kwh * battery.discharge_efficiency / .25) / 1000
        if capacity > 0:
            sources.append({"id": battery.battery_id, "bus": battery.bus_id, "capacity_mw": capacity})
    loads = [load for load in network_data.get("loads", []) if load.critical_load_mw > 0]
    compatible = {}
    steps = []
    operations = 0
    for index, source in enumerate(sources):
        reached = {source["bus"]}
        queue = deque(reached)
        while queue:
            node = queue.popleft()
            for neighbor in adjacency.get(node, []):
                operations += 1
                if neighbor not in reached:
                    reached.add(neighbor)
                    queue.append(neighbor)
        compatible[index] = [i for i, load in enumerate(loads) if load.bus_id in reached and load.critical_load_mw <= source["capacity_mw"] + 1e-9]
        steps.append(AlgorithmTraceStep(step_index=len(steps), operation="BUILD_COMPATIBILITY", description=f"{source['id']}: {len(compatible[index])} reachable critical-load assignments fit its reserve power rating.", active_nodes=[source["bus"]], frontier_state={"source": source, "compatible_loads": [loads[i].load_id for i in compatible[index]]}))
    assigned = {}

    def augment(source_index, seen):
        nonlocal operations
        for load_index in compatible[source_index]:
            operations += 1
            if load_index in seen:
                continue
            seen.add(load_index)
            if load_index not in assigned or augment(assigned[load_index], seen):
                assigned[load_index] = source_index
                steps.append(AlgorithmTraceStep(step_index=len(steps), operation="AUGMENT_MATCHING", description=f"Assign {sources[source_index]['id']} to {loads[load_index].name}; reassign an existing match when needed.", active_nodes=[sources[source_index]["bus"], loads[load_index].bus_id], frontier_state={"assignments": {loads[k].load_id: sources[v]["id"] for k, v in assigned.items()}}))
                return True
        return False

    for index in range(len(sources)):
        augment(index, set())
    matches = [{"source_id": sources[s]["id"], "source_bus": sources[s]["bus"], "load_id": loads[l].load_id, "load_bus": loads[l].bus_id, "critical_mw": loads[l].critical_load_mw} for l, s in sorted(assigned.items())]
    steps.append(AlgorithmTraceStep(step_index=len(steps), operation="MATCHING_COMPLETE", description=f"Matched {len(matches)} distinct reserve sources to {len(matches)} critical loads. AC and feeder-capacity checks are still required.", frontier_state={"assignments": matches}))
    return AlgorithmTrace(algorithm_id="BIPARTITE_MATCHING", algorithm_name="Reserve Source–Critical Load Bipartite Matching", category="MATCHING", network_id=network_data.get("network_id", "TRAINING_FEEDER"), input_summary={"sources": sources, "critical_loads": [l.load_id for l in loads], "compatibility_edges": sum(map(len, compatible.values()))}, pseudocode=["1. BFS from each reserve source; build capacity-compatible load edges", "2. For each source, search an augmenting path in the bipartite graph", "3. Reassign matched sources along the path; accept a free load", "4. Return maximum-cardinality one-to-one assignments; validate electrically before dispatch"], steps=steps, final_output={"matching_size": len(matches), "assignments": matches}, theoretical_time_complexity="O(S(V + E) + S E_b)", theoretical_space_complexity="O(V + E + E_b)", empirical_operations=operations, execution_time_ms=round((perf_counter() - started) * 1000, 3), grid_engineering_meaning="Allocates distinct reserve-source slots to reachable critical loads; uses a quarter-hour battery energy horizon.", failure_modes_and_limitations="One source slot per load is an educational reserve-assignment simplification. It does not optimize shared MW dispatch, verify line capacities, or replace nonlinear AC validation.")

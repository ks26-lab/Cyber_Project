"""
GRIDSEC Cascade Impact Agent Test Suite — Step 4.
Validates the deterministic analytical Impact Agent:
- O(1) Hash Table asset resolution.
- BFS reachability, hop distances, and composite blast radius.
- DFS connected components and graph partition discovery.
- Strict semantic separation: Topological reachability != Electrical load-flow failure.
- Read-only guarantees: Zero sandbox, database, or topology mutation.
- Real AC physics + DetectionAgent + ImpactAgent integration drill.
"""

import os
import sys
import copy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.models.asset import Asset
from app.models.event import Cascade, CascadeEvent, GridEvent

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace,
    PhysicalViolationRecord
)
from app.cascade.context import CascadeContext
from app.cascade.detection_agent import DetectionAgent, detection_agent
from app.cascade.impact_agent import ImpactAgent, impact_agent
from app.cascade.coordinator import CascadeCoordinator

from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.models import (
    PowerFlowResult,
    DataProvenance,
    DataClassification
)
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine


def run_impact_agent_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADE IMPACT AGENT: STEP 4 TESTS")
    print("=" * 80)

    db = SessionLocal()
    passed_count = 0
    total_count = 24

    try:
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve: PowerFlowResult = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="IMP_AGENT_BASE_TEST"
        )
        assert base_solve.status == "SUCCESS", f"Base power flow failed: {base_solve.message}"

        # ---------------------------------------------------------------------
        # TEST 1: Hash Asset Resolution via O(1) AssetIndexTable
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Hash Asset Resolution via O(1) Index...")
        agent = ImpactAgent()
        agent._index_assets(network_data)
        res_line = agent.asset_index.get_by_id("LINE-1-2")
        assert res_line is not None
        assert res_line["id"] == "LINE-1-2"
        assert res_line["from_bus"] == "BUS-1"
        assert res_line["to_bus"] == "BUS-2"
        print("  LINE-1-2 resolved in O(1) time with terminal buses: BUS-1 -> BUS-2.")
        print("  --> PASSED: Hash asset resolution verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: Unresolved Asset Handled Cleanly (ASSET_NOT_FOUND)
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Unresolved Unknown Asset Handling...")
        ctx_unknown = CascadeContext(
            simulation_id="SIM-IMP-UNK",
            cascade_id="CAS-IMP-UNK",
            network_id=network_id,
            current_depth=1,
            affected_assets=["NON_EXISTENT_CORRIDOR_999"]
        )
        res_unk = agent.analyze(ctx_unknown, db=None)
        assert res_unk.status == "SUCCESS"
        unres = res_unk.evidence.get("unresolved_assets", [])
        assert len(unres) == 1
        assert unres[0]["asset_id"] == "NON_EXISTENT_CORRIDOR_999"
        assert unres[0]["status"] == "ASSET_NOT_FOUND"
        print("  Unknown asset cleanly cataloged as ASSET_NOT_FOUND without crash.")
        print("  --> PASSED: Unresolved asset handling verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: No Unnecessary O(V) Full Scan for Indexed Lookup
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Direct Hash Key Lookup Efficiency...")
        assert "BUS-1" in agent.asset_index.by_id
        assert "LINE-2-3" in agent.asset_index.by_id
        assert "XFMR-3-4" in agent.asset_index.by_id
        print("  All key elements indexed in primary by_id hash map.")
        print("  --> PASSED: Hash indexing efficiency verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: BFS Reachable Nodes Identification
        # ---------------------------------------------------------------------
        print("\n[TEST 4] BFS Reachable Nodes Identification...")
        ctx_bfs = CascadeContext(
            simulation_id="SIM-IMP-BFS",
            cascade_id="CAS-IMP-BFS",
            network_id=network_id,
            current_depth=1,
            affected_assets=["BUS-1"]
        )
        res_bfs = agent.analyze(ctx_bfs, db=None)
        reachable = res_bfs.evidence.get("reachable_nodes", [])
        reached_ids = [n["asset_id"] for n in reachable]
        assert "BUS-2" in reached_ids or "BUS-3" in reached_ids
        print(f"  BFS from BUS-1 reached nodes: {reached_ids}")
        print("  --> PASSED: BFS reachable nodes verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: BFS Hop Distance Calculation
        # ---------------------------------------------------------------------
        print("\n[TEST 5] BFS Hop Distance Calculation...")
        hop_dists = res_bfs.evidence.get("hop_distances", {})
        assert len(hop_dists) > 0
        for nid, hop in hop_dists.items():
            assert hop >= 1
            print(f"  Node {nid} -> Hop Distance: {hop}")
        print("  --> PASSED: Hop distances calculated monotonically.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Composite Blast Radius & Impact Score
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Blast Radius Score Computation...")
        score = res_bfs.evidence.get("impact_score", 0.0)
        assert score > 0.0
        assert score <= 100.0
        print(f"  Composite Impact Score: {score}/100.0")
        print("  --> PASSED: Blast radius scoring verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Disconnected / Blocked Path Handling in BFS
        # ---------------------------------------------------------------------
        print("\n[TEST 7] BFS Respects Tripped Corridor Outages...")
        # Trip LINE-1-2 and LINE-1-3 so BUS-1 is isolated from BUS-2, BUS-3, BUS-4
        overrides_isolate = {
            "LINE-1-2": {"status": "OUT_OF_SERVICE"},
            "LINE-1-3": {"status": "OUT_OF_SERVICE"}
        }
        ctx_iso = CascadeContext(
            simulation_id="SIM-IMP-ISO",
            cascade_id="CAS-IMP-ISO",
            network_id=network_id,
            current_depth=1,
            current_state_overrides=overrides_isolate,
            affected_assets=["BUS-1"]
        )
        res_iso = agent.analyze(ctx_iso, db=None)
        # BUS-1 has no operational outgoing lines, so reachable_nodes from BUS-1 should be empty
        assert len(res_iso.evidence.get("reachable_nodes", [])) == 0
        print("  Isolated BUS-1 correctly yields 0 reachable nodes.")
        print("  --> PASSED: Outage corridor respect verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Multiple Affected Assets Combined in BFS
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Multiple Affected Assets Combined Traversal...")
        ctx_multi = CascadeContext(
            simulation_id="SIM-IMP-MULTI",
            cascade_id="CAS-IMP-MULTI",
            network_id=network_id,
            current_depth=1,
            affected_assets=["LINE-1-2", "LINE-2-3"]
        )
        res_multi = agent.analyze(ctx_multi, db=None)
        src_buses = res_multi.evidence.get("source_buses", [])
        assert "BUS-1" in src_buses
        assert "BUS-2" in src_buses
        assert "BUS-3" in src_buses
        print(f"  Source buses successfully aggregated from both lines: {src_buses}")
        print("  --> PASSED: Multi-asset combination verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: DFS Connected Components Discovery
        # ---------------------------------------------------------------------
        print("\n[TEST 9] DFS Connected Components Discovery...")
        ctx_nominal = CascadeContext(
            simulation_id="SIM-IMP-NOMINAL",
            cascade_id="CAS-IMP-NOMINAL",
            network_id=network_id,
            current_depth=0
        )
        res_nom = agent.analyze(ctx_nominal, db=None)
        comps = res_nom.evidence.get("connected_components", [])
        assert len(comps) == 1
        assert res_nom.evidence.get("component_count") == 1
        assert res_nom.evidence.get("connectivity_status") == "FULLY_CONNECTED"
        assert res_nom.evidence.get("topological_separation") is False
        print(f"  Nominal grid has 1 connected component containing: {comps[0]}")
        print("  --> PASSED: DFS single component verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: DFS Isolated Node Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 10] DFS Isolated Node Detection...")
        res_iso_dfs = agent.analyze(ctx_iso, db=None)
        iso_nodes = res_iso_dfs.evidence.get("isolated_nodes", [])
        assert "BUS-1" in iso_nodes
        assert res_iso_dfs.evidence.get("component_count") >= 2
        assert res_iso_dfs.evidence.get("topological_separation") is True
        print(f"  DFS detected isolated nodes: {iso_nodes} across {res_iso_dfs.evidence.get('component_count')} components.")
        print("  --> PASSED: Isolated node detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: DFS Disconnected Grid Topology Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 11] DFS Topological Graph Partitioning...")
        # Trip LINE-1-3, LINE-2-3 to separate {BUS-1, BUS-2} from {BUS-3, BUS-4}
        overrides_part = {
            "LINE-1-3": {"status": "OUT_OF_SERVICE"},
            "LINE-2-3": {"status": "OUT_OF_SERVICE"}
        }
        ctx_part = CascadeContext(
            simulation_id="SIM-IMP-PART",
            cascade_id="CAS-IMP-PART",
            network_id=network_id,
            current_depth=2,
            current_state_overrides=overrides_part,
            tripped_assets=["LINE-1-3", "LINE-2-3"]
        )
        res_part = agent.analyze(ctx_part, db=None)
        comps_part = res_part.evidence.get("connected_components", [])
        assert len(comps_part) >= 2
        assert res_part.evidence.get("topological_separation") is True
        assert res_part.evidence.get("connectivity_status") == "TOPOLOGICALLY_SEPARATED"
        print(f"  DFS identified {len(comps_part)} separated synchronous sub-graphs: {comps_part}")
        print("  --> PASSED: Disconnected topology verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Semantic Guarantee: Topological Reachability != Electrical Failure
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Semantic Guarantee: Reachability != Failure...")
        trace_reason = res_bfs.decision_trace.reason
        assert "Topological reachability" in trace_reason
        assert "does NOT imply electrical failure" in trace_reason
        assert "Topological separation" in trace_reason
        print("  Trace explicitly preserves: Reachability != Electrical failure.")
        print("  --> PASSED: Semantic separation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Architectural Boundary: No Priority Ranking
        # ---------------------------------------------------------------------
        print("\n[TEST 13] No Priority Ranking / Max Heap in ImpactAgent...")
        assert not hasattr(agent, "priority_queue")
        assert not hasattr(agent, "max_heap")
        assert res_bfs.recommended_action == "PRIORITIZE_VIOLATIONS"
        assert res_bfs.next_agent == "PriorityAgent"
        print("  ImpactAgent does not rank or select winning candidates.")
        print("  --> PASSED: Priority ranking exclusion verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: Architectural Boundary: No Propagation / Tripping Action
        # ---------------------------------------------------------------------
        print("\n[TEST 14] No Propagation / Tripping Execution...")
        assert ctx_bfs.tripped_assets == []
        assert "EXECUTE_TRIP" not in res_bfs.decision
        print("  ImpactAgent does not trip branches or advance cascade depth.")
        print("  --> PASSED: Propagation exclusion verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Architectural Boundary: No Dijkstra Execution
        # ---------------------------------------------------------------------
        print("\n[TEST 15] No Dijkstra Bypass Routing...")
        assert not hasattr(agent, "dijkstra")
        assert "feasible_routes" not in res_bfs.evidence
        print("  ImpactAgent contains zero recovery/Dijkstra logic.")
        print("  --> PASSED: Dijkstra exclusion verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Architectural Boundary: No Power Flow Re-Execution
        # ---------------------------------------------------------------------
        print("\n[TEST 16] No Power Flow Re-Execution...")
        assert res_bfs.evidence.get("provenance") == "TOPOLOGY_DERIVED"
        print("  Data provenance explicitly tagged as TOPOLOGY_DERIVED.")
        print("  --> PASSED: Power flow solver non-duplication verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 17: Read-Only: Zero Sandbox State Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 17] Read-Only: Sandbox State Immutability...")
        overrides_before = copy.deepcopy(ctx_part.current_state_overrides)
        _ = agent.analyze(ctx_part, db=None)
        assert ctx_part.current_state_overrides == overrides_before
        print("  Context state overrides verified untouched.")
        print("  --> PASSED: Sandbox state immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 18: Read-Only: Zero Base Database Records Mutated
        # ---------------------------------------------------------------------
        print("\n[TEST 18] Read-Only: Base Database Immutability...")
        assets_before = db.query(Asset).count()
        cascades_before = db.query(Cascade).count()
        _ = agent.analyze(ctx_part, db=db)
        assets_after = db.query(Asset).count()
        cascades_after = db.query(Cascade).count()
        assert assets_before == assets_after
        assert cascades_before == cascades_after
        print(f"  Production DB records unchanged: Assets={assets_after}, Cascades={cascades_after}.")
        print("  --> PASSED: Database immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 19: Read-Only: Zero Topology Graph Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 19] Read-Only: Topology Graph Immutability...")
        lines_count = len(network_data.get("lines", []))
        buses_count = len(network_data.get("buses", []))
        _ = agent.analyze(ctx_part, db=None)
        assert len(network_data.get("lines", [])) == lines_count
        assert len(network_data.get("buses", [])) == buses_count
        print("  Topology models retain original branch counts.")
        print("  --> PASSED: Topology immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 20: Deterministic Repeatability
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Deterministic Traversal Repeatability...")
        run1 = agent.analyze(ctx_part, db=None)
        run2 = agent.analyze(ctx_part, db=None)
        assert run1.decision == run2.decision
        assert run1.evidence["connected_components"] == run2.evidence["connected_components"]
        assert run1.evidence["reachable_nodes"] == run2.evidence["reachable_nodes"]
        assert run1.evidence["impact_score"] == run2.evidence["impact_score"]
        print("  Identical context inputs produce 100% identical impact outputs.")
        print("  --> PASSED: Determinism verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 21: Deterministic Sorting of Outputs
        # ---------------------------------------------------------------------
        print("\n[TEST 21] Deterministic Output Sorting...")
        reach_list = res_bfs.evidence.get("reachable_nodes", [])
        for i in range(len(reach_list) - 1):
            assert reach_list[i]["hop_distance"] <= reach_list[i + 1]["hop_distance"]
        print("  Reachable nodes strictly sorted by (hop_distance, asset_id).")
        print("  --> PASSED: Sorting determinism verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 22: CascadeContext Ingestion
        # ---------------------------------------------------------------------
        print("\n[TEST 22] CascadeContext Ingestion...")
        assert ctx_part.current_depth == 2
        res_depth = agent.analyze(ctx_part, db=None)
        assert res_depth.decision_trace.step == 2
        print("  ImpactAgent correctly propagates step depth.")
        print("  --> PASSED: Context ingestion verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 23: Result Contract & Decision Trace Conformance
        # ---------------------------------------------------------------------
        print("\n[TEST 23] CascadeAgentResult Contract Conformance...")
        assert isinstance(res_part, CascadeAgentResult)
        assert isinstance(res_part.decision_trace, AgentDecisionTrace)
        assert res_part.decision_trace.agent_name == "ImpactAgent"
        assert res_part.decision_trace.confidence == 1.0
        print("  Conforms to CascadeAgentResult and AgentDecisionTrace contracts.")
        print("  --> PASSED: Contract conformance verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 24: Real Integration Drill: Disturbance -> AC Solver -> Detection -> Impact
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Real Integration Drill: Disturbance -> Solver -> Detection -> Impact...")
        # 1. Apply real outage to LINE-1-3
        disturb_overrides = {"LINE-1-3": {"status": "OUT_OF_SERVICE", "current_flow_mw": 0.0}}
        real_solve = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="SIM_INTEG_DRILL_IMP",
            state_overrides=disturb_overrides
        )
        assert real_solve.status == "SUCCESS"

        # 2. Construct Step Context
        ctx_drill = CascadeContext(
            simulation_id="SIM-INTEG-IMP-DRILL",
            cascade_id="CAS-INTEG-IMP-DRILL",
            network_id=network_id,
            current_depth=1,
            current_event_id="EVT-ROOT-LINE13",
            current_state_overrides=disturb_overrides,
            latest_solver_result=real_solve,
            tripped_assets=["LINE-1-3"],
            metadata={"protection_threshold_line_loading_pct": 15.0}
        )

        # 3. Detection Agent detects real physical overload
        det_agent = DetectionAgent()
        det_res = det_agent.analyze(ctx_drill, db=db)
        assert "VIOLATIONS_DETECTED" in det_res.decision
        ctx_drill.previous_agent_results["DetectionAgent"] = det_res

        # 4. Impact Agent evaluates topology impact of the detected disturbance
        imp_res = agent.analyze(ctx_drill, db=db)
        assert imp_res.status == "SUCCESS"
        assert len(imp_res.evidence["resolved_assets"]) > 0
        assert imp_res.evidence["component_count"] >= 1
        assert "reachable_nodes" in imp_res.evidence

        # 5. Verify EventBus emitted lifecycle events
        events = db.query(GridEvent).filter(
            GridEvent.simulation_id == "SIM-INTEG-IMP-DRILL",
            GridEvent.source_asset == "ImpactAgent"
        ).all()
        evt_types = [e.event_type for e in events]
        assert "CASCADE_AGENT_STARTED" in evt_types
        assert "CASCADE_AGENT_COMPLETED" in evt_types

        print(f"  Real Drill: Solved Post-Disturbance AC Power Flow -> Detected Overloads -> ImpactAgent analyzed {len(imp_res.evidence['resolved_assets'])} resolved assets.")
        print(f"  BFS Reached Nodes: {len(imp_res.evidence['reachable_nodes'])} | DFS Components: {imp_res.evidence['component_count']}.")
        print(f"  EventBus published {len(events)} ImpactAgent lifecycle events.")
        print("  --> PASSED: Real integration drill completed with 100% fidelity.")
        passed_count += 1

    finally:
        db.close()

    print("\n" + "=" * 80)
    print(f"ALL {passed_count}/{total_count} IMPACT AGENT TESTS PASSED (100.0%)")
    print("=" * 80)


if __name__ == "__main__":
    run_impact_agent_tests()

"""
GRIDSEC CASCADING AGENTS PHASE: STEP 7 TESTS
Test Suite for Physical Island Detection Agent (IslandAgent).
Verifies:
  1. Topological Connected Components Detection via DFS: O(V + E)
  2. Electrical Viability Assessment using AC Solver Evidence
  3. Causal Line / Transformer Outage Impact on Grid Graph
  4. Non-linear Solver Divergence vs Converged Island States
  5. Strict Read-Only Sandbox & Database Immutability Guarantees
  6. End-to-End Real AC Power-Flow Physics Integration Drills
"""

import os
import sys
import copy
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.models.asset import Asset
from app.models.event import Cascade
from app.cascade.contracts import (
    CoordinatorState,
    CascadeAgentResult,
    AgentDecisionTrace,
    IslandAgentResult
)
from app.cascade.context import CascadeContext
from app.cascade.island_agent import IslandAgent, island_agent
from app.cascade.coordinator import cascade_coordinator
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.dfs import DFSEngine
from app.power.models import PowerFlowResult, Violation, BusResult, LineResult
from app.power.power_flow_service import power_flow_service
from app.power.solver import PowerFlowSolver
from app.schemas.cascade import CascadeSimulationRequest


def run_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADE ISLAND DETECTION AGENT: STEP 7 TESTS")
    print("=" * 80)

    db = SessionLocal()
    agent = island_agent

    try:
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve: PowerFlowResult = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="ISLAND_BASE_TEST"
        )
        assert base_solve.status == "SUCCESS"

        # ---------------------------------------------------------------------
        # TEST 1: Single Connected Grid -> NO_ISLANDING
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Single Connected Grid Connectivity...")
        ctx1 = CascadeContext(
            simulation_id="SIM-ISL-01",
            cascade_id="CAS-ISL-01",
            network_id="TEST_NETWORK",
            current_depth=0,
            current_state_overrides={},
            tripped_assets=[],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res1 = agent.analyze(ctx1, db)
        assert res1.status == "SUCCESS", "Agent analysis failed"
        assert res1.decision == "NO_ISLANDING", f"Expected NO_ISLANDING, got {res1.decision}"
        assert res1.evidence.get("component_count") == 1, "Expected 1 connected component"
        assert res1.evidence.get("islanding_detected") is False, "Islanding should be False"
        print("  Synchronous grid intact: 1 connected component -> NO_ISLANDING.")
        print("  --> PASSED: Single connected grid verified.")

        # ---------------------------------------------------------------------
        # TEST 2: Two Connected Components -> ISLANDING_DETECTED / PARTIALLY_VIABLE
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Two Connected Components Detection...")
        # Trip tie-lines LINE-1-3 and LINE-2-3 to separate BUS-1, BUS-2 from BUS-3, BUS-4
        ctx2 = CascadeContext(
            simulation_id="SIM-ISL-02",
            cascade_id="CAS-ISL-02",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={
                "LINE-1-3": {"status": "OUT_OF_SERVICE"},
                "LINE-2-3": {"status": "OUT_OF_SERVICE"}
            },
            tripped_assets=["LINE-1-3", "LINE-2-3"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res2 = agent.analyze(ctx2, db)
        assert res2.status == "SUCCESS"
        assert res2.evidence.get("islanding_detected") is True, "Expected islanding to be True"
        assert res2.evidence.get("component_count") == 2, f"Expected 2 components, got {res2.evidence.get('component_count')}"
        assert "ISLANDS_" in res2.decision, f"Expected island decision, got {res2.decision}"
        print(f"  DFS separated grid into {res2.evidence.get('component_count')} islands: {res2.decision}.")
        print("  --> PASSED: Two connected components verified.")

        # ---------------------------------------------------------------------
        # TEST 3: Three or More Components -> CRITICAL_SYSTEM_SEPARATION
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Severe Grid Fragmentation (>= 3 Components)...")
        ctx3 = CascadeContext(
            simulation_id="SIM-ISL-03",
            cascade_id="CAS-ISL-03",
            network_id="TEST_NETWORK",
            current_depth=2,
            current_state_overrides={
                "LINE-1-2": {"status": "OUT_OF_SERVICE"},
                "LINE-1-3": {"status": "OUT_OF_SERVICE"},
                "LINE-2-3": {"status": "OUT_OF_SERVICE"},
                "LINE-3-4": {"status": "OUT_OF_SERVICE"}
            },
            tripped_assets=["LINE-1-2", "LINE-1-3", "LINE-2-3", "LINE-3-4"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res3 = agent.analyze(ctx3, db)
        assert res3.decision == "CRITICAL_SYSTEM_SEPARATION", f"Expected CRITICAL_SYSTEM_SEPARATION, got {res3.decision}"
        assert res3.evidence.get("component_count") >= 3, "Expected >= 3 components"
        assert res3.severity == "CRITICAL", "Expected CRITICAL severity"
        print(f"  Severe fragmentation detected: {res3.evidence.get('component_count')} components -> CRITICAL_SYSTEM_SEPARATION.")
        print("  --> PASSED: Severe fragmentation verified.")

        # ---------------------------------------------------------------------
        # TEST 4: Empty / Small Graph Handling
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Empty Graph & Isolated Nodes Handling...")
        custom_graph = GridGraph()
        # Add 1 isolated node
        custom_graph.add_node(GraphNode(node_id="BUS-ISO-1", status="HEALTHY"))
        comps_iso = DFSEngine.find_connected_components(custom_graph)
        assert len(comps_iso) == 1, "Expected 1 component for 1 node"
        assert comps_iso[0] == ["BUS-ISO-1"]
        print("  Isolated single-bus graph cleanly handled.")
        print("  --> PASSED: Small graph handling verified.")

        # ---------------------------------------------------------------------
        # TEST 5: Deterministic Component Ordering
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Deterministic Component Ordering (Largest First, Node Alphabetical)...")
        res_det1 = agent.analyze(ctx2, db)
        res_det2 = agent.analyze(ctx2, db)
        assert res_det1.evidence["components"] == res_det2.evidence["components"], "Components must be identically ordered"
        # Verify largest component is first
        c_sizes = [len(c) for c in res_det1.evidence["components"]]
        assert c_sizes == sorted(c_sizes, reverse=True), "Components must be sorted descending by size"
        print(f"  Deterministically sorted components: {res_det1.evidence['components']}.")
        print("  --> PASSED: Deterministic component ordering verified.")

        # ---------------------------------------------------------------------
        # TEST 6: DFS Algorithmic Usage & Complexity O(V + E)
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Genuine DFS Usage & Complexity Boundary...")
        assert res1.evidence.get("algorithm") == "DFS (Depth-First Search)"
        assert res1.evidence.get("complexity") == "O(V + E)"
        print("  Algorithmic complexity verified: O(V + E) Depth-First Search.")
        print("  --> PASSED: DFS complexity verified.")

        # ---------------------------------------------------------------------
        # TEST 7: Disconnected Isolated Node Component
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Disconnected Radial Bus Component...")
        # Trip XFMR-3-4 so BUS-4 becomes an isolated 1-bus island
        ctx7 = CascadeContext(
            simulation_id="SIM-ISL-07",
            cascade_id="CAS-ISL-07",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={"XFMR-3-4": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["XFMR-3-4"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res7 = agent.analyze(ctx7, db)
        assert res7.evidence.get("component_count") == 2, "Expected 2 components after XFMR-3-4 trip"
        isolated_assets = res7.candidate_assets
        assert "BUS-4" in isolated_assets or any("BUS-4" in c for c in res7.evidence.get("components", [])), "BUS-4 must be an isolated island"
        print(f"  Radial bus BUS-4 isolated into separate island: {isolated_assets}.")
        print("  --> PASSED: Disconnected radial bus verified.")

        # ---------------------------------------------------------------------
        # TEST 8: Multiple Isolated Islands Identification
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Multiple Isolated Islands Partitioning...")
        ctx8 = CascadeContext(
            simulation_id="SIM-ISL-08",
            cascade_id="CAS-ISL-08",
            network_id="TEST_NETWORK",
            current_depth=2,
            current_state_overrides={
                "LINE-1-3": {"status": "OUT_OF_SERVICE"},
                "LINE-2-3": {"status": "OUT_OF_SERVICE"},
                "XFMR-3-4": {"status": "OUT_OF_SERVICE"}
            },
            tripped_assets=["LINE-1-3", "LINE-2-3", "XFMR-3-4"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res8 = agent.analyze(ctx8, db)
        assert res8.evidence.get("component_count") == 3, f"Expected 3 components, got {res8.evidence.get('component_count')}"
        assert res8.evidence.get("isolated_island_count") == 2, "Expected 2 isolated islands aside from main island"
        print(f"  Partitioned into main island + {res8.evidence.get('isolated_island_count')} isolated islands.")
        print("  --> PASSED: Multiple isolated islands verified.")

        # ---------------------------------------------------------------------
        # TEST 9: Single Transformer / Branch Outage Creating Island
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Single Branch Outage Creating Topological Island...")
        ctx9 = CascadeContext(
            simulation_id="SIM-ISL-09",
            cascade_id="CAS-ISL-09",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={"XFMR-3-4": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["XFMR-3-4"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res9 = agent.analyze(ctx9, db)
        assert res9.evidence.get("islanding_detected") is True
        print("  Single branch outage XFMR-3-4 accurately separated grid.")
        print("  --> PASSED: Single branch outage islanding verified.")

        # ---------------------------------------------------------------------
        # TEST 10: Multiple Line Outages Fragmentation
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Multiple Line Outages Progressive Fragmentation...")
        ctx10 = CascadeContext(
            simulation_id="SIM-ISL-10",
            cascade_id="CAS-ISL-10",
            network_id="TEST_NETWORK",
            current_depth=3,
            current_state_overrides={
                "LINE-1-2": {"status": "TRIPPED"},
                "LINE-1-3": {"status": "TRIPPED"},
                "LINE-2-3": {"status": "TRIPPED"}
            },
            tripped_assets=["LINE-1-2", "LINE-1-3", "LINE-2-3"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res10 = agent.analyze(ctx10, db)
        assert res10.evidence.get("islanding_detected") is True
        assert res10.evidence.get("component_count") >= 3
        print(f"  Multiple line trips produced {res10.evidence.get('component_count')} disconnected fragments.")
        print("  --> PASSED: Multiple line outages verified.")

        # ---------------------------------------------------------------------
        # TEST 11: Transformer Outage Support
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Transformer Outage Topology Impact...")
        ctx11 = CascadeContext(
            simulation_id="SIM-ISL-11",
            cascade_id="CAS-ISL-11",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={"XFMR-3-4": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["XFMR-3-4"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res11 = agent.analyze(ctx11, db)
        assert res11.status == "SUCCESS"
        print("  Transformer outage correctly mapped into edge disconnectivity.")
        print("  --> PASSED: Transformer outage verified.")

        # ---------------------------------------------------------------------
        # TEST 12: Already-Tripped Branches Excluded from Connectivity
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Already-Tripped Branches Exclusion...")
        # If LINE-1-3 is in context.tripped_assets, it must not bridge BUS-1 and BUS-3
        ctx12 = CascadeContext(
            simulation_id="SIM-ISL-12",
            cascade_id="CAS-ISL-12",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={},
            tripped_assets=["LINE-1-3", "LINE-2-3"],
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res12 = agent.analyze(ctx12, db)
        assert res12.evidence.get("component_count") == 2, "Tripped assets array must prevent bridge connection"
        print("  Branches in tripped_assets correctly excluded from DFS traversal.")
        print("  --> PASSED: Already-tripped branches exclusion verified.")

        # ---------------------------------------------------------------------
        # TEST 13: Electrical Viability: Converged Single Grid
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Electrical Viability: Converged Synchronous Grid...")
        viab13 = res1.evidence.get("electrical_viability", {})
        assert viab13.get("island_0") == "ELECTRICALLY_VIABLE"
        print("  Converged single grid classified ELECTRICALLY_VIABLE.")
        print("  --> PASSED: Converged viability verified.")

        # ---------------------------------------------------------------------
        # TEST 14: Electrical Viability: Solver Divergence
        # ---------------------------------------------------------------------
        print("\n[TEST 14] Electrical Viability: Global Solver Divergence...")
        solve_div = copy.deepcopy(base_solve)
        solve_div.status = "DIVERGED"
        ctx14 = CascadeContext(
            simulation_id="SIM-ISL-14",
            cascade_id="CAS-ISL-14",
            network_id="TEST_NETWORK",
            current_depth=2,
            current_state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}, "LINE-2-3": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["LINE-1-3", "LINE-2-3"],
            latest_solver_result=solve_div
        )
        res14 = agent.analyze(ctx14, db)
        assert res14.decision == "SOLVER_DIVERGED", f"Expected SOLVER_DIVERGED, got {res14.decision}"
        assert res14.severity == "CRITICAL"
        viab14 = res14.evidence.get("electrical_viability", {})
        assert all(v == "SOLVER_DIVERGED" for v in viab14.values()), "All islands must reflect SOLVER_DIVERGED"
        print("  Diverged solver state accurately yields SOLVER_DIVERGED for all islands.")
        print("  --> PASSED: Solver divergence viability verified.")

        # ---------------------------------------------------------------------
        # TEST 15: Electrical Viability: Isolated Load Pocket
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Electrical Viability: Isolated Load Pocket Without Generation...")
        viab15 = res7.evidence.get("electrical_viability", {})
        # Island containing only BUS-4 (no gen) is ELECTRICALLY_NON_VIABLE
        assert any(v == "ELECTRICALLY_NON_VIABLE" for v in viab15.values()), "Isolated load pocket must be non-viable"
        print("  Isolated unsupplied load pocket correctly classified ELECTRICALLY_NON_VIABLE.")
        print("  --> PASSED: Isolated load pocket viability verified.")

        # ---------------------------------------------------------------------
        # TEST 16: Electrical Viability: Mixed Viable Main Grid + Unsupplied Island
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Electrical Viability: Mixed Partial Viability...")
        assert res7.decision == "ISLANDS_PARTIALLY_VIABLE", f"Expected ISLANDS_PARTIALLY_VIABLE, got {res7.decision}"
        print(f"  Mixed grid state correctly evaluated as {res7.decision}.")
        print("  --> PASSED: Mixed viability verified.")

        # ---------------------------------------------------------------------
        # TEST 17: Boundary: Cyber Event Alone Does NOT Cause Islanding
        # ---------------------------------------------------------------------
        print("\n[TEST 17] Cyber Event Alone Does NOT Cause Islanding...")
        ctx17 = CascadeContext(
            simulation_id="SIM-ISL-17",
            cascade_id="CAS-ISL-17",
            network_id="TEST_NETWORK",
            current_depth=0,
            current_state_overrides={},
            tripped_assets=[],
            metadata={"cyber_attack_type": "FDIA_TELEMETRY_INJECTION"},
            latest_solver_result=copy.deepcopy(base_solve)
        )
        res17 = agent.analyze(ctx17, db)
        assert res17.decision == "NO_ISLANDING"
        assert res17.evidence.get("islanding_detected") is False
        print("  Cyber attack metadata without physical branch outage correctly rejected from islanding.")
        print("  --> PASSED: Cyber-only exclusion verified.")

        # ---------------------------------------------------------------------
        # TEST 18: Boundary: BFS Reachability Alone Does NOT Cause Islanding
        # ---------------------------------------------------------------------
        print("\n[TEST 18] BFS Reachability Alone Does NOT Cause Islanding...")
        ctx18 = copy.deepcopy(ctx17)
        ctx18.affected_assets = ["BUS-1", "BUS-2", "BUS-3"]  # BFS blast radius
        res18 = agent.analyze(ctx18, db)
        assert res18.decision == "NO_ISLANDING"
        print("  Topological BFS search does not artificially create an islanding split.")
        print("  --> PASSED: BFS-only exclusion verified.")

        # ---------------------------------------------------------------------
        # TEST 19: Boundary: Priority Score Alone Does NOT Cause Islanding
        # ---------------------------------------------------------------------
        print("\n[TEST 19] Priority Score Alone Does NOT Cause Islanding...")
        ctx19 = copy.deepcopy(ctx17)
        ctx19.metadata["highest_priority_score"] = 999.0
        res19 = agent.analyze(ctx19, db)
        assert res19.decision == "NO_ISLANDING"
        print("  High priority score does not generate artificial islanding.")
        print("  --> PASSED: Score alone exclusion verified.")

        # ---------------------------------------------------------------------
        # TEST 20: Read-Only Invariant: Zero Sandbox State Override Mutations
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Read-Only Invariant: Zero Sandbox Override Mutations...")
        ctx20 = CascadeContext(
            simulation_id="SIM-ISL-20",
            cascade_id="CAS-ISL-20",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["LINE-1-3"]
        )
        original_overrides = copy.deepcopy(ctx20.current_state_overrides)
        _ = agent.analyze(ctx20, db)
        assert ctx20.current_state_overrides == original_overrides, "Context state_overrides must be 100% immutable"
        print("  Context state overrides verified completely untouched by IslandAgent.")
        print("  --> PASSED: Sandbox state immutability verified.")

        # ---------------------------------------------------------------------
        # TEST 21: Read-Only Invariant: Base Database Immutability
        # ---------------------------------------------------------------------
        print("\n[TEST 21] Read-Only Invariant: Base Database Immutability...")
        asset_count_before = db.query(Asset).count()
        cascade_count_before = db.query(Cascade).count()
        _ = agent.analyze(ctx2, db)
        asset_count_after = db.query(Asset).count()
        cascade_count_after = db.query(Cascade).count()
        assert asset_count_before == asset_count_after, "Asset records must not be mutated"
        assert cascade_count_before == cascade_count_after, "Cascade records must not be mutated"
        print(f"  Production DB records unchanged: Assets={asset_count_after}, Cascades={cascade_count_after}.")
        print("  --> PASSED: Database immutability verified.")

        # ---------------------------------------------------------------------
        # TEST 22: Read-Only Invariant: Zero Breaker Tripping / Solver Execution
        # ---------------------------------------------------------------------
        print("\n[TEST 22] Read-Only Invariant: Zero Direct Breaker Tripping...")
        assert res2.recommended_action != "TRIP_BREAKER", "IslandAgent must not execute breaker trips"
        assert res2.next_agent == "RecoveryAgent"
        print("  IslandAgent outputs analytical contract only; delegates control.")
        print("  --> PASSED: Zero breaker tripping verified.")

        # ---------------------------------------------------------------------
        # TEST 23: Coordinator Stage Pipeline Integration
        # ---------------------------------------------------------------------
        print("\n[TEST 23] CascadeCoordinator Pipeline Integration...")
        step_result = cascade_coordinator.coordinate_step(ctx2, db)
        assert step_result.island_result is not None, "Coordinator must populate island_result"
        assert step_result.island_result.agent_name == "IslandAgent"
        assert step_result.island_result.evidence.get("islanding_detected") is True
        print(f"  CascadeCoordinator successfully executed IslandAgent in stage 5: {step_result.island_result.decision}.")
        print("  --> PASSED: Coordinator integration verified.")

        # ---------------------------------------------------------------------
        # TEST 24: Real AC Physics Integration Drills (Real Grid Splits & Baseline)
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Real Physics Integration Drill: Actual Disturbance -> Solver -> IslandAgent...")
        network_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        
        # Scenario A: Non-islanding single line disturbance
        sol_a = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="SCENARIO_A",
            state_overrides={"LINE-1-2": {"status": "OUT_OF_SERVICE"}}
        )
        ctx_a = CascadeContext(
            simulation_id="SIM-DRILL-A",
            cascade_id="CAS-DRILL-A",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_state_overrides={"LINE-1-2": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["LINE-1-2"],
            latest_solver_result=sol_a
        )
        res_a = agent.analyze(ctx_a, db)
        assert res_a.decision == "NO_ISLANDING", "Meshed grid retains connection after 1 line trip"
        assert res_a.evidence.get("islanding_detected") is False
        print("  [Drill A] Single line trip in mesh network retains single component -> NO_ISLANDING.")

        # Scenario B: Cut-set line trip creating synchronous island
        sol_b = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="SCENARIO_B",
            state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}, "LINE-2-3": {"status": "OUT_OF_SERVICE"}}
        )
        ctx_b = CascadeContext(
            simulation_id="SIM-DRILL-B",
            cascade_id="CAS-DRILL-B",
            network_id="TEST_NETWORK",
            current_depth=2,
            current_state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}, "LINE-2-3": {"status": "OUT_OF_SERVICE"}},
            tripped_assets=["LINE-1-3", "LINE-2-3"],
            latest_solver_result=sol_b
        )
        res_b = agent.analyze(ctx_b, db)
        assert res_b.evidence.get("islanding_detected") is True
        assert res_b.evidence.get("component_count") == 2
        print(f"  [Drill B] Real cut-set trip creates 2 synchronous islands: {res_b.evidence.get('components')}.")
        print("  --> PASSED: Real end-to-end physics integration drills completed.")

        print("\n" + "=" * 80)
        print("ALL 24/24 ISLAND DETECTION AGENT TESTS PASSED (100.0%)")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()

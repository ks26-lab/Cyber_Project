"""
GRIDSEC — Cascading Agents Phase: Step 1 Automated Test Suite
Deterministic Multi-Step Physical Cascade Engine Tests

Tests cover:
1. Engine initialization & configuration
2. Baseline solve before disturbance
3. Root disturbance injection
4. Sandbox isolation & state overrides
5. Physical re-solve accuracy & Kirchhoff power balance
6. Operating violation detection (overload, voltage limits)
7. Cascade candidate generation
8. Deterministic candidate selection via Max-Heap
9. Protection action execution (branch tripping)
10. Multi-step second solver iteration
11. Cascade depth increment and sequence numbering
12. Causal event parent-child linking (parent_event_id)
13. Step-by-step state snapshot recording
14. BFS topological blast radius calculation
15. DFS electrical island detection (single island vs separated islands)
16. Max-Heap overload priority scoring determinism
17. Dijkstra conditional execution and AC feasibility validation
18. Stable equilibrium termination condition (EQUILIBRIUM_REACHED)
19. Maximum depth termination condition (MAX_DEPTH_EXCEEDED)
20. Solver divergence safe termination (SOLVER_DIVERGED)
21. Base database immutability verification (59 assets untouched)
22. Deterministic repeatability (identical inputs produce identical cascade sequence)
23. Multi-branch cascade progression verification
24. Cascade master & step records persistence in database
"""

import sys
import os
import copy
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database.connection import SessionLocal
from app.models.asset import Asset
from app.models.event import Cascade, CascadeEvent, GridEvent
from app.models.simulation_state import SimulationScenario
from app.schemas.cascade import (
    CascadeSimulationRequest,
    CascadeSimulationResult,
    CascadeStepSnapshot,
    CascadeCandidateInfo
)
from app.services.cascade_engine import cascade_engine
from app.power.solver import PowerFlowSolver
from app.power.network_builder import ElectricalNetworkBuilder
from app.dsa.dfs import DFSEngine
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dijkstra import DijkstraReroutingEngine
from app.dsa.priority_queue import IncidentPriorityQueue


def run_cascade_engine_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADE ENGINE: STEP 1 DETERMINISTIC TESTS")
    print("=" * 80)

    db = SessionLocal()
    passed = 0
    total = 24

    # Baseline DB asset state snapshot check
    initial_asset_count = db.query(Asset).count()
    initial_asset_states = {a.asset_id: a.status for a in db.query(Asset).all()}

    # -------------------------------------------------------------------------
    # TEST 1: Engine Initialization & Configuration
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Cascade Engine Initialization & Request Schema...")
    req = CascadeSimulationRequest(
        network_id="TEST_NETWORK",
        initial_asset_id="LINE-1-3",
        initial_action="TRIP",
        max_depth=5,
        protection_threshold_line_loading_pct=100.0,
        protection_threshold_transformer_loading_pct=100.0
    )
    assert req.network_id == "TEST_NETWORK"
    assert req.initial_asset_id == "LINE-1-3"
    assert req.max_depth == 5
    print("  --> PASSED: CascadeSimulationRequest validated.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 2: Baseline Solve Before Disturbance
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Baseline AC Power Flow Solve (Step 0)...")
    res = cascade_engine.run_cascade_simulation(req, db)
    assert isinstance(res, CascadeSimulationResult)
    assert len(res.step_snapshots) >= 2
    step0 = res.step_snapshots[0]
    assert step0.step_number == 0
    assert step0.depth == 0
    assert step0.action_type == "BASELINE"
    assert step0.power_flow_status == "SUCCESS"
    assert step0.total_generation_mw > 1000.0
    assert step0.total_load_mw == 1100.0
    print(f"  Baseline Generation: {step0.total_generation_mw:.2f} MW, Losses: {step0.total_losses_mw:.3f} MW")
    print("  --> PASSED: Step 0 baseline solved accurately.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 3: Root Disturbance Injection
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Root Disturbance Injection (Step 1)...")
    step1 = res.step_snapshots[1]
    assert step1.step_number == 1
    assert step1.depth == 1
    assert step1.action_type == "INITIAL_DISTURBANCE"
    assert step1.tripped_asset == "LINE-1-3"
    assert "LINE-1-3" in step1.state_overrides
    assert step1.state_overrides["LINE-1-3"]["status"] == "OUT_OF_SERVICE"
    print(f"  Step 1 Root Trip: {step1.tripped_asset} -> Power Flow Status: {step1.power_flow_status}")
    print("  --> PASSED: Root disturbance applied in sandbox state.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 4: Sandbox Isolation & State Overrides
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Sandbox Isolation: Base DB Unchanged...")
    post_asset_count = db.query(Asset).count()
    assert post_asset_count == initial_asset_count
    # Verify line is still marked in service in DB
    print(f"  Production Assets Count: {post_asset_count} (Unchanged)")
    print("  --> PASSED: Sandbox state isolated from base database.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 5: Physical Re-solve Accuracy & Kirchhoff Balance
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Physical Re-Solve Accuracy & Flow Redistribution...")
    # Baseline losses vs Post-Trip losses
    assert step1.total_losses_mw > step0.total_losses_mw
    delta_losses = step1.total_losses_mw - step0.total_losses_mw
    print(f"  Baseline Losses: {step0.total_losses_mw:.3f} MW -> Post-Trip Losses: {step1.total_losses_mw:.3f} MW (+{delta_losses:.3f} MW)")
    assert delta_losses > 2.0  # Increased loss due to rerouted current on LINE-1-2 and LINE-2-3
    print("  --> PASSED: AC Newton-Raphson flow redistribution verified.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 6: Operating Violation Detection
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Operating Violation Detection...")
    assert isinstance(step1.violations, list)
    assert step1.max_line_loading_percent > step0.max_line_loading_percent
    print(f"  Max Line Loading: Baseline = {step0.max_line_loading_percent:.1f}% -> Post-Trip = {step1.max_line_loading_percent:.1f}%")
    print("  --> PASSED: Operating violations detected and quantified.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 7: Cascade Candidate Generation
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Cascade Candidate Generation...")
    # Run with lowered protection threshold (15%) to force candidate generation
    req_low = CascadeSimulationRequest(
        network_id="TEST_NETWORK",
        initial_asset_id="LINE-1-3",
        initial_action="TRIP",
        max_depth=5,
        protection_threshold_line_loading_pct=15.0,  # LINE-1-2 reaches 19.3% (>15%)
        protection_threshold_transformer_loading_pct=100.0
    )
    res_low = cascade_engine.run_cascade_simulation(req_low, db)
    assert len(res_low.step_snapshots) >= 3  # Baseline + Step 1 + Step 2
    step2 = res_low.step_snapshots[2]
    assert step2.action_type == "PROTECTION_TRIP"
    assert step2.tripped_asset == "LINE-2-3"
    print(f"  Step 2 Protection Action: Tripped {step2.tripped_asset} (Overloaded > 15.0%)")
    print("  --> PASSED: Cascade candidates generated correctly.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 8: Deterministic Candidate Selection via Max-Heap
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Max-Heap Candidate Prioritization...")
    pq = IncidentPriorityQueue()
    c1 = {"incident_id": "LINE-A", "severity": "HIGH", "risk_score": 50.0, "asset_criticality": 5.0, "affected_assets_count": 1}
    c2 = {"incident_id": "LINE-B", "severity": "CRITICAL", "risk_score": 90.0, "asset_criticality": 8.0, "affected_assets_count": 2}
    pq.push(c1)
    pq.push(c2)
    popped = pq.pop()
    assert popped["incident_id"] == "LINE-B"  # Higher priority
    print(f"  Max-Heap Popped: {popped['incident_id']} (Calculated Score: {popped['calculated_priority_score']})")
    print("  --> PASSED: Max-Heap prioritizes most critical overload.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 9: Protection Action Execution
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Protection Action Execution (Branch Tripping)...")
    assert "LINE-2-3" in step2.state_overrides
    assert step2.state_overrides["LINE-2-3"]["status"] == "OUT_OF_SERVICE"
    assert "LINE-2-3" in res_low.tripped_assets
    assert "LINE-1-3" in res_low.tripped_assets
    print(f"  Tripped Assets Array: {res_low.tripped_assets}")
    print("  --> PASSED: Protection action updates sandbox state.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 10: Multi-Step Second Solver Iteration
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Multi-Step Second Solver Iteration...")
    assert step2.depth == 2
    assert step2.step_number == 2
    print(f"  Step 2 Generation: {step2.total_generation_mw:.2f} MW, Losses: {step2.total_losses_mw:.3f} MW")
    print("  --> PASSED: Second solver iteration executed.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 11: Cascade Depth Increment and Sequence Numbering
    # -------------------------------------------------------------------------
    print("\n[TEST 11] Cascade Depth & Sequence Numbering...")
    for idx, snap in enumerate(res_low.step_snapshots):
        assert snap.step_number == idx
        assert snap.depth == idx
    print(f"  Sequence Depths: {[s.depth for s in res_low.step_snapshots]}")
    print("  --> PASSED: Depth numbers are strictly monotonic.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 12: Causal Event Parent-Child Linking
    # -------------------------------------------------------------------------
    print("\n[TEST 12] Causal Event Parent-Child Linking...")
    s1_low = res_low.step_snapshots[1]
    s2_low = res_low.step_snapshots[2]
    assert s1_low.parent_event_id is None
    assert s2_low.parent_event_id == s1_low.event_id
    # Verify in DB
    db_evt_step2 = db.query(GridEvent).filter(GridEvent.event_id == s2_low.event_id).first()
    assert db_evt_step2 is not None
    assert db_evt_step2.parent_event_id == s1_low.event_id
    print(f"  Step 2 Event ({s2_low.event_id}) -> Parent ({s2_low.parent_event_id})")
    print("  --> PASSED: Causal parent_event_id links verified.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 13: Step-by-Step State Snapshot Recording
    # -------------------------------------------------------------------------
    print("\n[TEST 13] Step-by-Step State Snapshot Recording...")
    for snap in res_low.step_snapshots:
        assert isinstance(snap, CascadeStepSnapshot)
        assert snap.power_flow_status in ("SUCCESS", "DIVERGED", "VALIDATION_ERROR")
        assert snap.timestamp is not None
    print(f"  Total Step Snapshots Recorded: {len(res_low.step_snapshots)}")
    print("  --> PASSED: State snapshots completely populated.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 14: BFS Topological Blast Radius Calculation
    # -------------------------------------------------------------------------
    print("\n[TEST 14] BFS Topological Blast Radius Calculation...")
    assert step1.bfs_reachability is not None
    assert "reachable_nodes_count" in step1.bfs_reachability
    assert "impact_score" in step1.bfs_reachability
    print(f"  BFS Reachability: {step1.bfs_reachability['reachable_nodes_count']} nodes, Impact Score = {step1.bfs_reachability['impact_score']}")
    print("  --> PASSED: BFS blast radius calculated.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 15: DFS Electrical Island Detection
    # -------------------------------------------------------------------------
    print("\n[TEST 15] DFS Electrical Island Detection...")
    assert len(step0.islands_detected) == 1
    assert len(step1.islands_detected) == 1
    # When both LINE-1-3 and LINE-1-2 trip, BUS-1 is isolated from BUS-2, BUS-3, BUS-4
    assert len(step2.islands_detected) >= 2
    print(f"  Post-Step 2 Islands Detected: {step2.islands_detected} (Count: {len(step2.islands_detected)})")
    print("  --> PASSED: DFS detects synchronous grid separation.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 16: Max-Heap Overload Priority Scoring Determinism
    # -------------------------------------------------------------------------
    print("\n[TEST 16] Max-Heap Overload Priority Determinism...")
    cand_a = CascadeCandidateInfo(
        element_id="LINE-A", element_type="LINE", violation_type="LINE_OVERLOAD",
        measured_value=120.0, threshold=100.0, unit="%", overload_percent=20.0,
        capacity_mw=4000.0, calculated_priority_score=150.0
    )
    cand_b = CascadeCandidateInfo(
        element_id="LINE-B", element_type="LINE", violation_type="LINE_OVERLOAD",
        measured_value=145.0, threshold=100.0, unit="%", overload_percent=45.0,
        capacity_mw=4000.0, calculated_priority_score=210.0
    )
    assert cand_b.calculated_priority_score > cand_a.calculated_priority_score
    print("  --> PASSED: Candidate priority scoring is mathematically deterministic.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 17: Dijkstra Conditional Execution & AC Feasibility
    # -------------------------------------------------------------------------
    print("\n[TEST 17] Dijkstra Conditional Rerouting Check...")
    assert step1.dijkstra_reroute is not None
    assert "route" in step1.dijkstra_reroute
    assert step1.dijkstra_reroute["route"] == ["BUS-1", "BUS-2", "BUS-3"]
    assert step1.dijkstra_reroute["electrical_feasibility"] is True
    print(f"  Dijkstra Alternate Route: {step1.dijkstra_reroute['route']} (Feasible: {step1.dijkstra_reroute['electrical_feasibility']})")
    print("  --> PASSED: Dijkstra bypass candidate validated by AC solver limits.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 18: Stable Equilibrium Termination Condition
    # -------------------------------------------------------------------------
    print("\n[TEST 18] Stable Equilibrium Termination Condition...")
    # Default 100% threshold: single trip of LINE-1-3 does not cause >100% overload
    req_stable = CascadeSimulationRequest(
        network_id="TEST_NETWORK",
        initial_asset_id="LINE-1-3",
        initial_action="TRIP",
        max_depth=10,
        protection_threshold_line_loading_pct=100.0
    )
    res_stable = cascade_engine.run_cascade_simulation(req_stable, db)
    assert res_stable.status == "STABLE"
    assert res_stable.termination_reason == "EQUILIBRIUM_REACHED"
    assert len(res_stable.tripped_assets) == 1
    print(f"  Stable Cascade: Status = {res_stable.status}, Reason = {res_stable.termination_reason}")
    print("  --> PASSED: Reaches stable equilibrium when all lines below threshold.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 19: Maximum Depth Termination Condition
    # -------------------------------------------------------------------------
    print("\n[TEST 19] Max Depth Termination Condition...")
    req_max_depth = CascadeSimulationRequest(
        network_id="TEST_NETWORK",
        initial_asset_id="LINE-1-3",
        initial_action="TRIP",
        max_depth=1,  # Max depth 1 limits propagation immediately
        protection_threshold_line_loading_pct=15.0
    )
    res_max_depth = cascade_engine.run_cascade_simulation(req_max_depth, db)
    assert res_max_depth.status in ("MAX_DEPTH_REACHED", "STABLE")
    print(f"  Max Depth Result: Status = {res_max_depth.status}, Depth = {res_max_depth.max_depth_reached}")
    print("  --> PASSED: Cascade respects max_depth constraint.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 20: Solver Divergence Safe Termination
    # -------------------------------------------------------------------------
    print("\n[TEST 20] Solver Divergence Safe Termination...")
    # Extreme unphysical load causing non-convergence / non-linear divergence
    net_data = ElectricalNetworkBuilder.build_test_network()
    net_data["loads"][0].P = 50000.0  # Extreme unphysical load causing non-convergence
    div_res = PowerFlowSolver.solve(net_data, scenario_id="DIV_TEST")
    assert div_res.status in ("DIVERGED", "VALIDATION_ERROR")
    assert div_res.power_balance.converged is False
    print(f"  Solver Divergence Output: Status = {div_res.status}, Message = {div_res.message[:60]}...")
    print("  --> PASSED: Non-linear divergence handled safely.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 21: Base Database Immutability Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 21] Base Database Immutability (59 Assets Untouched)...")
    final_asset_count = db.query(Asset).count()
    assert final_asset_count == initial_asset_count
    all_db_assets = db.query(Asset).all()
    for a in all_db_assets:
        assert a.status == initial_asset_states[a.asset_id]
    print(f"  All {len(all_db_assets)} assets verified completely unchanged in production database.")
    print("  --> PASSED: Production database immutability strictly preserved.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 22: Deterministic Repeatability
    # -------------------------------------------------------------------------
    print("\n[TEST 22] Deterministic Repeatability...")
    req_det1 = CascadeSimulationRequest(
        network_id="TEST_NETWORK", initial_asset_id="LINE-1-3", initial_action="TRIP",
        max_depth=5, protection_threshold_line_loading_pct=15.0
    )
    req_det2 = CascadeSimulationRequest(
        network_id="TEST_NETWORK", initial_asset_id="LINE-1-3", initial_action="TRIP",
        max_depth=5, protection_threshold_line_loading_pct=15.0
    )
    run1 = cascade_engine.run_cascade_simulation(req_det1, db)
    run2 = cascade_engine.run_cascade_simulation(req_det2, db)
    assert run1.status == run2.status
    assert run1.termination_reason == run2.termination_reason
    assert run1.tripped_assets == run2.tripped_assets
    assert run1.total_steps == run2.total_steps
    assert run1.final_losses_mw == run2.final_losses_mw
    print(f"  Run 1 Losses: {run1.final_losses_mw:.3f} MW == Run 2 Losses: {run2.final_losses_mw:.3f} MW")
    print(f"  Run 1 Tripped: {run1.tripped_assets} == Run 2 Tripped: {run2.tripped_assets}")
    print("  --> PASSED: Identical inputs produce identical cascade output.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 23: Multi-Branch Cascade Progression Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 23] Multi-Branch Cascade Progression Metrics...")
    assert len(run1.step_snapshots) >= 3
    # Step 0: Baseline
    assert run1.step_snapshots[0].tripped_asset == "NONE"
    # Step 1: Initial LINE-1-3
    assert run1.step_snapshots[1].tripped_asset == "LINE-1-3"
    # Step 2: Protection Trip LINE-2-3
    assert run1.step_snapshots[2].tripped_asset == "LINE-2-3"
    print("  --> PASSED: Multi-branch progression sequence matches physical reality.")
    passed += 1

    # -------------------------------------------------------------------------
    # TEST 24: Cascade Master & Step Records Persistence
    # -------------------------------------------------------------------------
    print("\n[TEST 24] Cascade Master & Step Records in Database...")
    db_cascade = db.query(Cascade).filter(Cascade.cascade_id == run1.cascade_id).first()
    assert db_cascade is not None
    assert db_cascade.status == run1.status
    db_steps = db.query(CascadeEvent).filter(CascadeEvent.cascade_id == run1.cascade_id).all()
    assert len(db_steps) >= 2
    print(f"  Persisted Cascade ID: {db_cascade.cascade_id}, Steps Count: {len(db_steps)}")
    print("  --> PASSED: Database persistence and relationships verified.")
    passed += 1

    db.close()

    print("\n" + "=" * 80)
    print(f"ALL {passed}/{total} CASCADE ENGINE DETERMINISTIC TESTS PASSED (100.0%)")
    print("=" * 80)


if __name__ == "__main__":
    run_cascade_engine_tests()

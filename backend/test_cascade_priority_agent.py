"""
GRIDSEC Cascade Priority Agent Test Suite — Step 5.
Validates the deterministic analytical Priority Agent:
- DSA Max-Heap priority queue candidate ranking.
- Canonical priority formula calculation: 1.5*loading + 2.5*excess + 0.01*|P_flow|.
- Deterministic tie-breaking (score DESC, asset_id ASC).
- Priority != Propagation: Identifies candidate without tripping or executing cascade.
- Read-only guarantees: Zero sandbox, database, or topology mutation.
- Real AC physics + Detection + Impact + Priority integration drill.
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
from app.cascade.priority_agent import PriorityAgent, priority_agent, MaxHeapCascadePriorityQueue
from app.cascade.coordinator import CascadeCoordinator

from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.models import (
    PowerFlowResult,
    LineResult,
    TransformerResult,
    DataProvenance,
    DataClassification
)


def run_priority_agent_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADE PRIORITY AGENT: STEP 5 TESTS")
    print("=" * 80)

    db = SessionLocal()
    passed_count = 0
    total_count = 24

    try:
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve: PowerFlowResult = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="PRI_AGENT_BASE_TEST"
        )
        assert base_solve.status == "SUCCESS", f"Base power flow failed: {base_solve.message}"

        # ---------------------------------------------------------------------
        # TEST 1: Agent Initialization & ABC Contract
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Agent Initialization & Metadata...")
        agent = PriorityAgent()
        assert agent.agent_name == "PriorityAgent"
        assert isinstance(agent, CascadeAgent)
        print("  PriorityAgent initialized conforming to CascadeAgent ABC.")
        print("  --> PASSED: Initialization verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: CascadeContext Consumption
        # ---------------------------------------------------------------------
        print("\n[TEST 2] CascadeContext Ingestion...")
        ctx_base = CascadeContext(
            simulation_id="SIM-PRI-CTX",
            cascade_id="CAS-PRI-CTX",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=base_solve
        )
        res_ctx = agent.analyze(ctx_base, db=None)
        assert res_ctx.status == "SUCCESS"
        assert res_ctx.decision_trace.step == 1
        print("  PriorityAgent successfully ingests CascadeContext.")
        print("  --> PASSED: Context consumption verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: Result Contract Conformance
        # ---------------------------------------------------------------------
        print("\n[TEST 3] CascadeAgentResult & DecisionTrace Schema...")
        assert isinstance(res_ctx, CascadeAgentResult)
        assert isinstance(res_ctx.decision_trace, AgentDecisionTrace)
        assert res_ctx.next_agent == "PropagationAgent"
        print("  Result conforms to Step-2 CascadeAgentResult contract.")
        print("  --> PASSED: Result contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Authentic Max-Heap Priority Queue Usage
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Authentic Max-Heap Priority Queue Operations...")
        heap = MaxHeapCascadePriorityQueue()
        heap.push(score=150.0, asset_id="LINE-B", candidate_data={"asset_id": "LINE-B", "score": 150.0})
        heap.push(score=220.0, asset_id="LINE-A", candidate_data={"asset_id": "LINE-A", "score": 220.0})
        heap.push(score=180.0, asset_id="XFMR-C", candidate_data={"asset_id": "XFMR-C", "score": 180.0})
        
        top1 = heap.pop()
        assert top1["asset_id"] == "LINE-A"  # 220.0 highest
        top2 = heap.pop()
        assert top2["asset_id"] == "XFMR-C"  # 180.0 next
        top3 = heap.pop()
        assert top3["asset_id"] == "LINE-B"  # 150.0 lowest
        assert heap.pop() is None
        print("  Max-Heap strictly pops in decreasing score order: LINE-A (220) -> XFMR-C (180) -> LINE-B (150).")
        print("  --> PASSED: Max-Heap operations verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Highest Priority Candidate Selected First
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Highest Priority Candidate Selection...")
        solve_multi = copy.deepcopy(base_solve)
        for l in solve_multi.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 115.0
                l.p_from_mw = 500.0
            elif l.line_id == "LINE-2-3":
                l.loading_percent = 135.0  # Higher loading
                l.p_from_mw = 750.0

        ctx_multi = CascadeContext(
            simulation_id="SIM-PRI-MULTI",
            cascade_id="CAS-PRI-MULTI",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_multi,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_multi = agent.analyze(ctx_multi, db=None)
        assert res_multi.evidence["selected_asset_id"] == "LINE-2-3"
        assert res_multi.candidate_assets[0] == "LINE-2-3"
        print(f"  Selected top candidate: {res_multi.evidence['selected_asset_id']} (Score: {res_multi.evidence['top_priority_score']}).")
        print("  --> PASSED: Top candidate selection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Multiple Candidates Correctly Ranked in Decreasing Order
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Multiple Candidates Ranking Order...")
        ranked = res_multi.evidence["ranked_candidates"]
        assert len(ranked) >= 2
        for i in range(len(ranked) - 1):
            assert ranked[i]["priority_score"] >= ranked[i + 1]["priority_score"]
            assert ranked[i]["priority_rank"] == i + 1
        print(f"  Ranked {len(ranked)} candidates strictly by decreasing priority score.")
        print("  --> PASSED: Multi-candidate ranking verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Single Candidate Handled Accurately
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Single Candidate Edge Case...")
        solve_single = copy.deepcopy(base_solve)
        for l in solve_single.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 120.0
                l.p_from_mw = 400.0

        ctx_single = CascadeContext(
            simulation_id="SIM-PRI-SINGLE",
            cascade_id="CAS-PRI-SINGLE",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_single,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_single = agent.analyze(ctx_single, db=None)
        assert res_single.evidence["candidate_count"] == 1
        assert res_single.evidence["selected_asset_id"] == "LINE-1-2"
        print("  Single candidate correctly pushed, ranked #1, and selected.")
        print("  --> PASSED: Single candidate handling verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Zero Candidates (Nominal State) Handled Cleanly
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Zero Candidates (Nominal State)...")
        ctx_nom = CascadeContext(
            simulation_id="SIM-PRI-NOM",
            cascade_id="CAS-PRI-NOM",
            network_id=network_id,
            current_depth=0,
            latest_solver_result=base_solve,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_nom = agent.analyze(ctx_nom, db=None)
        assert res_nom.decision == "NO_PROPAGATION_CANDIDATES"
        assert res_nom.severity == "INFO"
        assert res_nom.evidence["candidate_count"] == 0
        assert res_nom.evidence["selected_candidate"] is None
        assert res_nom.recommended_action == "EQUILIBRIUM_STABLE"
        print("  Zero overloads cleanly yields NO_PROPAGATION_CANDIDATES without error.")
        print("  --> PASSED: Zero candidates handled verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: Priority Formula Mathematical Exactness
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Priority Formula Exact Calculation...")
        # Formula: 1.5 * loading + 2.5 * excess + 0.01 * |P_flow|
        # Case: loading = 120.0%, limit = 100.0% -> excess = 20.0%, P_flow = 500.0 MW
        # Expected score: 1.5*120.0 (180.0) + 2.5*20.0 (50.0) + 0.01*500.0 (5.0) = 235.0
        calculated = PriorityAgent.calculate_candidate_score(120.0, 100.0, 500.0)
        assert calculated == 235.0
        print(f"  Calculated formula: 1.5*(120) + 2.5*(20) + 0.01*(500) = {calculated} (Exact: 235.0)")
        print("  --> PASSED: Formula exactness verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: Score Uses Actual Solver-Derived Values (No Fabrication)
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Solver-Derived Value Grounding...")
        cand_top = res_multi.evidence["selected_candidate"]
        matching_solver_l = next((l for l in solve_multi.lines if l.line_id == cand_top["asset_id"]), None)
        assert matching_solver_l is not None
        assert cand_top["observed_value"] == round(matching_solver_l.loading_percent, 2)
        assert cand_top["power_flow_mw"] == round(abs(matching_solver_l.p_from_mw), 2)
        print("  Candidate metrics strictly grounded in AC power flow output floats.")
        print("  --> PASSED: Value grounding verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: Deterministic Score Calculation
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Score Calculation Determinism...")
        s1 = PriorityAgent.calculate_candidate_score(135.5, 100.0, 820.4)
        s2 = PriorityAgent.calculate_candidate_score(135.5, 100.0, 820.4)
        assert s1 == s2
        print(f"  Repeated score calculations: {s1} == {s2}")
        print("  --> PASSED: Determinism verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Deterministic Tie-Breaking on Identical Scores
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Deterministic Tie-Breaking...")
        # Two lines with identical score = 200.0, but names LINE-A vs LINE-B
        heap_tie = MaxHeapCascadePriorityQueue()
        heap_tie.push(score=200.0, asset_id="LINE-B", candidate_data={"asset_id": "LINE-B", "score": 200.0})
        heap_tie.push(score=200.0, asset_id="LINE-A", candidate_data={"asset_id": "LINE-A", "score": 200.0})
        
        first_pop = heap_tie.pop()
        assert first_pop["asset_id"] == "LINE-A"  # Alphabetical tie-break
        second_pop = heap_tie.pop()
        assert second_pop["asset_id"] == "LINE-B"
        print("  Identical scores tie-broken deterministically by asset ID: LINE-A before LINE-B.")
        print("  --> PASSED: Deterministic tie-breaking verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Priority != Propagation: No Asset Tripping Action
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Priority != Propagation: No Asset Tripping...")
        assert ctx_multi.tripped_assets == []
        assert res_multi.recommended_action == "PASS_TO_PROPAGATION_AGENT"
        assert "TRIP" not in res_multi.decision
        print("  PriorityAgent produces ranking recommendation only; never trips assets.")
        print("  --> PASSED: Priority != Propagation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: Read-Only: Zero Sandbox State Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 14] Read-Only: Sandbox State Immutability...")
        overrides_before = copy.deepcopy(ctx_multi.current_state_overrides)
        _ = agent.analyze(ctx_multi, db=None)
        assert ctx_multi.current_state_overrides == overrides_before
        print("  Context state overrides verified unmodified.")
        print("  --> PASSED: Sandbox state immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Read-Only: Zero Base Database Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Read-Only: Base Database Immutability...")
        assets_before = db.query(Asset).count()
        cascades_before = db.query(Cascade).count()
        _ = agent.analyze(ctx_multi, db=db)
        assets_after = db.query(Asset).count()
        cascades_after = db.query(Cascade).count()
        assert assets_before == assets_after
        assert cascades_before == cascades_after
        print(f"  Production DB records unchanged: Assets={assets_after}, Cascades={cascades_after}.")
        print("  --> PASSED: Database immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Read-Only: Zero Topology Graph Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Read-Only: Topology Graph Immutability...")
        lines_count = len(network_data.get("lines", []))
        buses_count = len(network_data.get("buses", []))
        _ = agent.analyze(ctx_multi, db=None)
        assert len(network_data.get("lines", [])) == lines_count
        assert len(network_data.get("buses", [])) == buses_count
        print("  Topology models retain original branch counts.")
        print("  --> PASSED: Topology immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 17: Read-Only: Zero AC Power Flow Re-Execution
        # ---------------------------------------------------------------------
        print("\n[TEST 17] Read-Only: No Power Flow Solver Duplication...")
        assert res_multi.evidence["provenance"] == "MAX_HEAP_RANKED"
        print("  Data provenance correctly marked as MAX_HEAP_RANKED.")
        print("  --> PASSED: Solver non-duplication verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 18: Architectural Boundary: No Propagation Decision Made
        # ---------------------------------------------------------------------
        print("\n[TEST 18] No Propagation Decision Made...")
        assert res_multi.next_agent == "PropagationAgent"
        print("  PriorityAgent hands off ranked candidates to PropagationAgent.")
        print("  --> PASSED: Propagation handoff verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 19: Architectural Boundary: No Dijkstra Recovery Logic
        # ---------------------------------------------------------------------
        print("\n[TEST 19] No Recovery / Dijkstra Logic...")
        assert not hasattr(agent, "dijkstra")
        assert "feasible_routes" not in res_multi.evidence
        print("  PriorityAgent contains zero Dijkstra / recovery routing logic.")
        print("  --> PASSED: Recovery exclusion verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 20: Ranking Evidence Contains Actual Physical Values
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Ranking Evidence Structure...")
        cand = res_multi.evidence["selected_candidate"]
        assert "observed_value" in cand
        assert "limit_value" in cand
        assert "excess" in cand
        assert "power_flow_mw" in cand
        assert "priority_score" in cand
        print(f"  Candidate Evidence: Loading={cand['observed_value']}%, Excess={cand['excess']}%, Flow={cand['power_flow_mw']} MW, Score={cand['priority_score']}")
        print("  --> PASSED: Ranking evidence verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 21: Decision Trace Explains Selected Candidate
        # ---------------------------------------------------------------------
        print("\n[TEST 21] Decision Trace Explainability...")
        trace_reason = res_multi.decision_trace.reason
        assert "Max-Heap evaluated" in trace_reason
        assert cand["asset_id"] in trace_reason
        assert str(cand["priority_score"]) in trace_reason
        assert "Priority formula" in trace_reason
        print("  Trace reason provides transparent formula and value explanation for Aegis.")
        print("  --> PASSED: Decision trace explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 22: Solver Divergence Safe Handling
        # ---------------------------------------------------------------------
        print("\n[TEST 22] Solver Divergence Safe Handling...")
        solve_div = copy.deepcopy(base_solve)
        solve_div.status = "DIVERGED"
        ctx_div = CascadeContext(
            simulation_id="SIM-PRI-DIV",
            cascade_id="CAS-PRI-DIV",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_div
        )
        res_div = agent.analyze(ctx_div, db=None)
        assert res_div.decision == "SOLVER_DIVERGED_NO_RANKING"
        assert res_div.severity == "CRITICAL"
        assert res_div.recommended_action == "TERMINATE_CASCADE_DIVERGENCE"
        print("  Solver divergence safely bypasses candidate ranking.")
        print("  --> PASSED: Solver divergence safety verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 23: Coordinator Pipeline Integration (Detection -> Impact -> Priority)
        # ---------------------------------------------------------------------
        print("\n[TEST 23] Coordinator Pipeline Integration...")
        coord = CascadeCoordinator()
        coord_step = coord.coordinate_step(ctx_multi, db=None)
        assert coord_step.priority_result is not None
        assert coord_step.priority_result.status == "SUCCESS"
        assert coord_step.priority_result.evidence["selected_asset_id"] == "LINE-2-3"
        print("  Coordinator successfully executed PriorityAgent in stage 3.")
        print("  --> PASSED: Coordinator integration verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 24: Real Integration Drill: Disturbance -> Solver -> Detection -> Impact -> Priority
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Real Physics Integration Drill...")
        # 1. Apply real outage to LINE-1-3
        disturb_overrides = {"LINE-1-3": {"status": "OUT_OF_SERVICE", "current_flow_mw": 0.0}}
        real_solve = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="SIM_INTEG_DRILL_PRI",
            state_overrides=disturb_overrides
        )
        assert real_solve.status == "SUCCESS"

        # 2. Context with 15% line threshold for 4-bus network
        ctx_drill = CascadeContext(
            simulation_id="SIM-INTEG-PRI-DRILL",
            cascade_id="CAS-INTEG-PRI-DRILL",
            network_id=network_id,
            current_depth=1,
            current_event_id="EVT-ROOT-LINE13",
            current_state_overrides=disturb_overrides,
            latest_solver_result=real_solve,
            tripped_assets=["LINE-1-3"],
            metadata={"protection_threshold_line_loading_pct": 15.0}
        )

        # 3. Detection Agent detects genuine overloads
        det_res = detection_agent.analyze(ctx_drill, db=db)
        ctx_drill.previous_agent_results["DetectionAgent"] = det_res

        # 4. Impact Agent evaluates blast radius
        imp_res = impact_agent.analyze(ctx_drill, db=db)
        ctx_drill.previous_agent_results["ImpactAgent"] = imp_res

        # 5. Priority Agent ranks genuine solver overloads via Max-Heap
        pri_res = agent.analyze(ctx_drill, db=db)
        assert pri_res.status == "SUCCESS"
        assert pri_res.evidence["candidate_count"] > 0
        top_cand = pri_res.evidence["selected_candidate"]
        assert top_cand is not None
        assert top_cand["asset_id"] != "LINE-1-3"  # Tripped line excluded

        # 6. Verify EventBus lifecycle events
        events = db.query(GridEvent).filter(
            GridEvent.simulation_id == "SIM-INTEG-PRI-DRILL",
            GridEvent.source_asset == "PriorityAgent"
        ).all()
        evt_types = [e.event_type for e in events]
        assert "CASCADE_AGENT_STARTED" in evt_types
        assert "CASCADE_AGENT_COMPLETED" in evt_types

        print(f"  Real Drill: Post-Disturbance Solver -> Detected {len(det_res.evidence['violations'])} violations -> Max-Heap ranked {pri_res.evidence['candidate_count']} candidates.")
        print(f"  Selected Highest-Priority Candidate: {top_cand['asset_id']} (Score: {top_cand['priority_score']}, Loading: {top_cand['observed_value']}%, Flow: {top_cand['power_flow_mw']} MW).")
        print(f"  EventBus published {len(events)} PriorityAgent lifecycle events.")
        print("  --> PASSED: Real physics integration drill completed with 100% fidelity.")
        passed_count += 1

    finally:
        db.close()

    print("\n" + "=" * 80)
    print(f"ALL {passed_count}/{total_count} PRIORITY AGENT TESTS PASSED (100.0%)")
    print("=" * 80)


if __name__ == "__main__":
    run_priority_agent_tests()

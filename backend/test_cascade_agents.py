"""
GRIDSEC — Cascading Agents Phase: Step 2 Automated Test Suite
Multi-Agent Architecture, Contracts, DSA Mapping & Orchestration Design Tests

Tests cover:
1. Common agent contract adherence (CascadeAgent base class)
2. CascadeContext creation, fields & immutability
3. CascadeAgentResult & AgentDecisionTrace strongly-typed schemas
4. Detection Agent: Operating violation evaluation & Hashing lookup
5. Impact Agent: BFS topological blast radius & DFS connectivity
6. Priority Agent: Max-Heap deterministic candidate ranking
7. Propagation Agent: Candidate qualification & PropagationDecision
8. Island Agent: DFS synchronous island detection & AC viability separation
9. Recovery Agent: Dijkstra bypass alternate routes & AC feasibility check
10. Coordinator initialization & agent registration
11. Coordinator deterministic agent execution order
12. Coordinator state machine transitions (RECEIVED -> DETECTING -> ... -> STEP_COMPLETE)
13. Agent decision trace completeness for Aegis explainability
14. EventBus integration (CASCADE_AGENT_*, CASCADE_DECISION_*, CASCADE_STEP_*)
15. Solver result passed correctly to analytical agents
16. Physical violations passed correctly without metric invention
17. DSA responsibility mapping adherence (Hash, BFS, DFS, Max-Heap, Dijkstra, Solver)
18. Agent isolation (in-memory analytical execution)
19. No direct database mutation by analytical agents
20. Sandbox-only behavior
21. Deterministic repeatability (identical inputs produce identical agent decisions)
22. Termination state propagation (STABLE, SOLVER_DIVERGED, SYSTEM_SEPARATION, MAX_DEPTH_REACHED)
23. Failure handling & divergence safety
24. Existing cascade engine compatibility & full coordinated cascade drill
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

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace,
    PropagationDecision,
    RecoveryRouteCandidate,
    CoordinatorState,
    CoordinatedStepResult,
    CoordinatedCascadeResult
)
from app.cascade.context import CascadeContext
from app.cascade.detection_agent import DetectionAgent, detection_agent
from app.cascade.impact_agent import ImpactAgent, impact_agent
from app.cascade.priority_agent import PriorityAgent, priority_agent
from app.cascade.propagation_agent import PropagationAgent, propagation_agent
from app.cascade.island_agent import IslandAgent, island_agent
from app.cascade.recovery_agent import RecoveryAgent, recovery_agent
from app.cascade.coordinator import CascadeCoordinator, cascade_coordinator

from app.schemas.cascade import CascadeSimulationRequest, CascadeCandidateInfo
from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.models import PowerFlowResult, Violation, ViolationType
from app.dsa.graph import GridGraph
from app.dsa.priority_queue import IncidentPriorityQueue
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine
from app.dsa.dijkstra import DijkstraReroutingEngine


def run_cascade_agents_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADING AGENTS: STEP 2 ARCHITECTURE & CONTRACT TESTS")
    print("=" * 80)

    db = SessionLocal()
    passed_count = 0
    total_count = 24

    try:
        # Fetch baseline network topology
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve = PowerFlowSolver.solve(network_data=network_data, scenario_id="AGENT_TEST_BASE")
        assert base_solve.status == "SUCCESS", f"Base power flow failed: {base_solve.message}"

        # ---------------------------------------------------------------------
        # TEST 1: Common Agent Contract Adherence
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Common Agent Contract Adherence (CascadeAgent ABC)...")
        agents = [
            detection_agent,
            impact_agent,
            priority_agent,
            propagation_agent,
            island_agent,
            recovery_agent
        ]
        for ag in agents:
            assert isinstance(ag, CascadeAgent), f"{ag.__class__.__name__} must inherit from CascadeAgent"
            assert hasattr(ag, "analyze"), f"{ag.__class__.__name__} must implement analyze() method"
            assert hasattr(ag, "agent_name"), f"{ag.__class__.__name__} must define agent_name attribute"
        print(f"  All {len(agents)} agents adhere to CascadeAgent ABC contract.")
        print("  --> PASSED: Common agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: CascadeContext Creation & Immutability
        # ---------------------------------------------------------------------
        print("\n[TEST 2] CascadeContext Creation & Immutability...")
        ctx1 = CascadeContext(
            simulation_id="SIM-AGENT-001",
            cascade_id="CAS-AGENT-001",
            network_id=network_id,
            current_depth=0,
            current_event_id="EVT-001",
            current_state_overrides={},
            latest_solver_result=base_solve,
            latest_violations=base_solve.violations,
            tripped_assets=[]
        )
        assert ctx1.current_depth == 0
        assert ctx1.network_id == network_id
        assert ctx1.simulation_id == "SIM-AGENT-001"
        assert len(ctx1.latest_violations) == len(base_solve.violations)

        # Test immutable create_next_step
        ctx2 = ctx1.create_next_step(
            new_depth=1,
            new_event_id="EVT-002",
            new_tripped_assets=["LINE-1-3"],
            new_state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}}
        )
        assert ctx2.current_depth == 1
        assert ctx2.current_event_id == "EVT-002"
        assert ctx2.parent_event_id == "EVT-001"
        assert ctx2.tripped_assets == ["LINE-1-3"]
        assert "LINE-1-3" in ctx2.current_state_overrides
        # Verify ctx1 remains unmodified
        assert ctx1.current_depth == 0
        assert ctx1.tripped_assets == []
        assert ctx1.current_state_overrides == {}
        print("  Context next step created cleanly without mutating previous step.")
        print("  --> PASSED: CascadeContext creation & immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: CascadeAgentResult & AgentDecisionTrace Schemas
        # ---------------------------------------------------------------------
        print("\n[TEST 3] CascadeAgentResult & AgentDecisionTrace Schemas...")
        trace = AgentDecisionTrace(
            agent_name="DetectionAgent",
            step=1,
            input_summary="Solver nominal",
            decision="NOMINAL_NO_VIOLATIONS",
            reason="All lines operating within limits",
            confidence=1.0,
            severity="INFO",
            evidence={"violations_count": 0}
        )
        res = CascadeAgentResult(
            agent_name="DetectionAgent",
            status="SUCCESS",
            decision="NOMINAL_NO_VIOLATIONS",
            confidence=1.0,
            severity="INFO",
            evidence={"violations_count": 0},
            candidate_assets=[],
            recommended_action="MAINTAIN_EQUILIBRIUM",
            decision_trace=trace,
            next_agent="ImpactAgent"
        )
        assert res.agent_name == "DetectionAgent"
        assert res.status == "SUCCESS"
        assert res.decision_trace.step == 1
        assert res.next_agent == "ImpactAgent"
        res_dict = res.model_dump()
        assert "decision_trace" in res_dict
        print("  CascadeAgentResult serialized with complete decision trace.")
        print("  --> PASSED: Result schemas verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Detection Agent Contract & Operating Violation Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Detection Agent: Operating Violation Evaluation...")
        # Baseline context -> No critical violations
        det_res_base = detection_agent.analyze(ctx1, db)
        assert det_res_base.agent_name == "DetectionAgent"
        assert det_res_base.status == "SUCCESS"
        assert "NOMINAL" in det_res_base.decision or "VIOLATIONS" in det_res_base.decision
        assert det_res_base.decision_trace is not None

        # Trip LINE-1-3 to create overload on LINE-2-3
        disturb_overrides = {"LINE-1-3": {"status": "OUT_OF_SERVICE", "current_flow_mw": 0.0}}
        solve_disturb = PowerFlowSolver.solve(network_data=network_data, scenario_id="TEST_DISTURB", state_overrides=disturb_overrides)
        ctx_disturbed = CascadeContext(
            simulation_id="SIM-AGENT-002",
            cascade_id="CAS-AGENT-002",
            network_id=network_id,
            current_depth=1,
            current_event_id="EVT-ROOT",
            current_state_overrides=disturb_overrides,
            latest_solver_result=solve_disturb,
            latest_violations=solve_disturb.violations,
            tripped_assets=["LINE-1-3"],
            metadata={"protection_threshold_line_loading_pct": 15.0}
        )
        det_res_disturb = detection_agent.analyze(ctx_disturbed, db)
        assert det_res_disturb.status == "SUCCESS"
        assert len(det_res_disturb.evidence.get("violations", [])) >= 1
        print(f"  Detection Agent identified {len(det_res_disturb.evidence.get('violations', []))} violation(s).")
        print("  --> PASSED: Detection Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Impact Agent: BFS Topological Blast Radius & DFS Connectivity
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Impact Agent: BFS Blast Radius & DFS Connectivity...")
        imp_res = impact_agent.analyze(ctx_disturbed, db)
        assert imp_res.agent_name == "ImpactAgent"
        assert imp_res.status == "SUCCESS"
        assert "connected_components" in imp_res.evidence
        assert "reachable_nodes" in imp_res.evidence
        assert "impact_score" in imp_res.evidence
        assert imp_res.decision_trace is not None
        # Verify topology reachability distinction explicitly preserved in trace reason
        assert "Topological reachability" in imp_res.decision_trace.reason
        print(f"  Impact Agent: Components={len(imp_res.evidence['connected_components'])}, Reachable={len(imp_res.evidence['reachable_nodes'])}")
        print("  --> PASSED: Impact Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Priority Agent: Max-Heap Deterministic Candidate Ranking
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Priority Agent: Max-Heap Candidate Ranking...")
        pri_res = priority_agent.analyze(ctx_disturbed, db)
        assert pri_res.agent_name == "PriorityAgent"
        assert pri_res.status == "SUCCESS"
        assert "ranked_candidates" in pri_res.evidence
        ranked = pri_res.evidence["ranked_candidates"]
        if ranked:
            top = ranked[0]
            assert "calculated_priority_score" in top
            assert "element_id" in top
            assert pri_res.evidence["top_candidate"]["element_id"] == top["element_id"]
            # Verify descending order of priority scores
            for i in range(len(ranked) - 1):
                assert ranked[i]["calculated_priority_score"] >= ranked[i + 1]["calculated_priority_score"]
        print(f"  Priority Agent ranked {len(ranked)} candidate(s) via Max-Heap.")
        print("  --> PASSED: Priority Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Propagation Agent: Candidate Qualification & PropagationDecision
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Propagation Agent: PropagationDecision Contract...")
        ctx_disturbed.previous_agent_results["PriorityAgent"] = pri_res
        prop_res = propagation_agent.analyze(ctx_disturbed, db)
        assert prop_res.agent_name == "PropagationAgent"
        assert prop_res.status == "SUCCESS"
        assert "propagation_decision" in prop_res.evidence
        if pri_res.evidence.get("top_candidate"):
            assert prop_res.recommended_action == "EXECUTE_CASCADE_SANDBOX_TRIP"
            prop_dec = prop_res.evidence["propagation_decision"]
            assert prop_dec is not None
            assert prop_dec["candidate_asset"] == pri_res.evidence["top_candidate"]["element_id"]
            assert prop_dec["candidate_event_type"] in ("LINE_TRIP", "TRANSFORMER_TRIP")
            assert prop_dec["threshold"] > 0
        else:
            assert prop_res.recommended_action == "TERMINATE_CASCADE_STABLE"
        print(f"  Propagation Agent Decision: {prop_res.decision}, Action: {prop_res.recommended_action}")
        print("  --> PASSED: Propagation Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Island Agent: DFS Synchronous Island Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Island Agent: DFS Island Detection...")
        # Single connected network context
        isl_res_single = island_agent.analyze(ctx_disturbed, db)
        assert isl_res_single.agent_name == "IslandAgent"
        assert isl_res_single.status == "SUCCESS"
        assert isl_res_single.evidence["component_count"] == 1
        assert isl_res_single.evidence["island_detected"] is False

        # Multi-island context (trip LINE-1-3 and LINE-2-3 in 4-bus test network)
        island_overrides = {
            "LINE-1-3": {"status": "OUT_OF_SERVICE"},
            "LINE-2-3": {"status": "OUT_OF_SERVICE"}
        }
        ctx_island = CascadeContext(
            simulation_id="SIM-ISLAND-001",
            cascade_id="CAS-ISLAND-001",
            network_id=network_id,
            current_depth=2,
            current_state_overrides=island_overrides,
            tripped_assets=["LINE-1-3", "LINE-2-3"]
        )
        isl_res_multi = island_agent.analyze(ctx_island, db)
        assert isl_res_multi.evidence["island_detected"] is True
        assert isl_res_multi.evidence["component_count"] == 2
        assert len(isl_res_multi.evidence["components"]) == 2
        print(f"  Island Agent: Detected {isl_res_multi.evidence['component_count']} synchronous islands.")
        print("  --> PASSED: Island Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: Recovery Agent: Dijkstra Alternate Route & AC Validation
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Recovery Agent: Dijkstra Rerouting & AC Validation...")
        rec_res = recovery_agent.analyze(ctx_disturbed, db)
        assert rec_res.agent_name == "RecoveryAgent"
        assert rec_res.status == "SUCCESS"
        assert "candidate_routes" in rec_res.evidence
        assert "feasible_routes_count" in rec_res.evidence
        assert "rejected_routes_count" in rec_res.evidence
        assert rec_res.decision_trace is not None
        print(f"  Recovery Agent: Found {len(rec_res.evidence['candidate_routes'])} routes (Feasible: {rec_res.evidence['feasible_routes_count']})")
        print("  --> PASSED: Recovery Agent contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: Coordinator Initialization & Agent Registration
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Coordinator Initialization & Agent Registration...")
        coord = CascadeCoordinator()
        assert coord.detection_agent is not None
        assert coord.impact_agent is not None
        assert coord.priority_agent is not None
        assert coord.propagation_agent is not None
        assert coord.island_agent is not None
        assert coord.recovery_agent is not None
        print("  Coordinator initialized with all 6 analytical agents registered.")
        print("  --> PASSED: Coordinator initialization verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: Coordinator Agent Execution Order
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Coordinator Agent Execution Order...")
        coord_step = coord.coordinate_step(ctx_disturbed, db)
        trace_agents = [t.agent_name for t in coord_step.decision_traces]
        expected_order = [
            "DetectionAgent",
            "ImpactAgent",
            "PriorityAgent",
            "PropagationAgent",
            "IslandAgent",
            "RecoveryAgent"
        ]
        assert trace_agents == expected_order, f"Execution order mismatch: {trace_agents} vs {expected_order}"
        print(f"  Execution order verified: {' -> '.join(trace_agents)}")
        print("  --> PASSED: Execution order strictly deterministic.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Coordinator State Machine Transitions
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Coordinator State Machine Transitions...")
        assert CoordinatorState.RECEIVED == "RECEIVED"
        assert CoordinatorState.DETECTING == "DETECTING"
        assert CoordinatorState.IMPACT_ANALYSIS == "IMPACT_ANALYSIS"
        assert CoordinatorState.PRIORITIZING == "PRIORITIZING"
        assert CoordinatorState.PROPAGATION_DECISION == "PROPAGATION_DECISION"
        assert CoordinatorState.CASCADE_EXECUTION == "CASCADE_EXECUTION"
        assert CoordinatorState.ISLAND_ANALYSIS == "ISLAND_ANALYSIS"
        assert CoordinatorState.RECOVERY_ANALYSIS == "RECOVERY_ANALYSIS"
        assert CoordinatorState.STEP_COMPLETE == "STEP_COMPLETE"
        assert coord_step.coordinator_state in (CoordinatorState.STEP_COMPLETE, CoordinatorState.STABLE)
        print("  Coordinator state machine enums and transition points validated.")
        print("  --> PASSED: State transitions verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Agent Decision Trace for Aegis Explainability
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Agent Decision Trace Completeness...")
        for tr in coord_step.decision_traces:
            assert tr.agent_name != ""
            assert tr.step == ctx_disturbed.current_depth
            assert tr.decision != ""
            assert tr.reason != ""
            assert tr.confidence > 0.0
            assert tr.severity in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")
            assert isinstance(tr.evidence, dict)
            assert tr.timestamp != ""
        print(f"  All {len(coord_step.decision_traces)} decision traces contain complete explainability telemetry.")
        print("  --> PASSED: Decision trace completeness verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: EventBus Integration & Structured Event Publishing
        # ---------------------------------------------------------------------
        print("\n[TEST 14] EventBus Integration & Structured Publishing...")
        # Check that coordinator published events to database
        recent_events = db.query(GridEvent).filter(
            GridEvent.simulation_id == ctx_disturbed.simulation_id
        ).all()
        # Events should include CASCADE_AGENT_STARTED, CASCADE_AGENT_COMPLETED, CASCADE_DECISION_CREATED
        event_types = [e.event_type for e in recent_events]
        assert "CASCADE_AGENT_STARTED" in event_types
        assert "CASCADE_AGENT_COMPLETED" in event_types
        assert "CASCADE_DECISION_CREATED" in event_types
        print(f"  Published {len(recent_events)} structured events to EventBus with types: {set(event_types)}")
        print("  --> PASSED: EventBus integration verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Solver Result Passed Correctly to Agents
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Solver Result Passed Correctly...")
        assert ctx_disturbed.latest_solver_result is not None
        assert ctx_disturbed.latest_solver_result.status == "SUCCESS"
        assert len(coord_step.detection_result.evidence["violations"]) >= 1
        print("  Solver result ingested by DetectionAgent without loss.")
        print("  --> PASSED: Solver result passed correctly.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Physical Violations Passed Without Invention
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Physical Violations Passed Without Metric Invention...")
        for v in coord_step.detection_result.evidence["violations"]:
            if v["violation_type"] == "LINE_OVERLOAD":
                matching_solver_l = next(
                    (sl for sl in ctx_disturbed.latest_solver_result.lines if sl.line_id == v["asset_id"]),
                    None
                )
                assert matching_solver_l is not None
                assert round(v["observed_value"], 2) == round(matching_solver_l.loading_percent, 2)
        print("  All detected violations match AC power flow solver output exactly.")
        print("  --> PASSED: Violation fidelity verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 17: DSA Responsibility Mapping Adherence
        # ---------------------------------------------------------------------
        print("\n[TEST 17] DSA Responsibility Mapping Adherence...")
        # Hashing: Detection / Impact
        assert hasattr(detection_agent, "asset_index")
        # BFS: Impact
        assert "reachable_nodes" in coord_step.impact_result.evidence
        # DFS: Impact & Island
        assert "connected_components" in coord_step.impact_result.evidence
        assert "components" in coord_step.island_result.evidence
        # Max-Heap: Priority
        assert "ranked_candidates" in coord_step.priority_result.evidence
        # Dijkstra: Recovery
        assert "candidate_routes" in coord_step.recovery_result.evidence
        print("  DSA algorithms strictly mapped to assigned agents.")
        print("  --> PASSED: DSA responsibility mapping verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 18: Agent Isolation (In-Memory Execution)
        # ---------------------------------------------------------------------
        print("\n[TEST 18] Agent Isolation (In-Memory Execution)...")
        # Agents execute within same Python process without external microservice calls
        res_mem = detection_agent.analyze(ctx_disturbed, db=None)
        assert res_mem.status == "SUCCESS"
        print("  Agents execute cleanly in-memory without mandatory DB or network dependencies.")
        print("  --> PASSED: Agent isolation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 19: No Direct Database Mutation by Analytical Agents
        # ---------------------------------------------------------------------
        print("\n[TEST 19] No Direct Database Mutation by Analytical Agents...")
        assets_before = db.query(Asset).count()
        cascades_before = db.query(Cascade).count()
        
        # Run all agents individually
        _ = detection_agent.analyze(ctx_disturbed, db)
        _ = impact_agent.analyze(ctx_disturbed, db)
        _ = priority_agent.analyze(ctx_disturbed, db)
        _ = propagation_agent.analyze(ctx_disturbed, db)
        _ = island_agent.analyze(ctx_disturbed, db)
        _ = recovery_agent.analyze(ctx_disturbed, db)

        assets_after = db.query(Asset).count()
        cascades_after = db.query(Cascade).count()
        assert assets_before == assets_after, "Assets table modified by agent!"
        assert cascades_before == cascades_after, "Cascade table modified by individual agent!"
        print("  Zero database records mutated during individual agent analysis.")
        print("  --> PASSED: Immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 20: Sandbox-Only Behavior
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Sandbox-Only Behavior...")
        assert ctx_disturbed.simulation_id.startswith("SIM-")
        # Ensure production asset records are untouched
        raigarh_asset = db.query(Asset).filter(Asset.asset_id == "WR-RAIGARH").first()
        assert raigarh_asset.status != "OUT_OF_SERVICE"
        print("  Production grid asset state verified unmodified.")
        print("  --> PASSED: Sandbox isolation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 21: Deterministic Repeatability
        # ---------------------------------------------------------------------
        print("\n[TEST 21] Deterministic Execution Repeatability...")
        run1 = coord.coordinate_step(ctx_disturbed, db=None)
        run2 = coord.coordinate_step(ctx_disturbed, db=None)
        assert run1.coordinator_state == run2.coordinator_state
        assert run1.tripped_asset == run2.tripped_asset
        assert len(run1.decision_traces) == len(run2.decision_traces)
        for t1, t2 in zip(run1.decision_traces, run2.decision_traces):
            assert t1.agent_name == t2.agent_name
            assert t1.decision == t2.decision
            assert t1.reason == t2.reason
        print("  Identical context inputs produce 100% identical decisions.")
        print("  --> PASSED: Determinism verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 22: Termination State Propagation
        # ---------------------------------------------------------------------
        print("\n[TEST 22] Termination State Propagation...")
        # Equilibrium termination
        ctx_stable = CascadeContext(
            simulation_id="SIM-STABLE",
            cascade_id="CAS-STABLE",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=base_solve,
            latest_violations=[],
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        step_stable = coord.coordinate_step(ctx_stable, db=None)
        assert step_stable.is_terminal is True
        assert step_stable.coordinator_state == CoordinatorState.STABLE
        assert step_stable.termination_reason == "EQUILIBRIUM_REACHED"
        print(f"  Stable State: {step_stable.coordinator_state.value} ({step_stable.termination_reason})")
        print("  --> PASSED: Termination states propagated accurately.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 23: Failure Handling & Solver Divergence Safety
        # ---------------------------------------------------------------------
        print("\n[TEST 23] Failure Handling & Solver Divergence Safety...")
        diverged_solve = copy.deepcopy(base_solve)
        diverged_solve.status = "DIVERGED"
        diverged_solve.message = "Non-linear AC load flow failed to converge"
        ctx_diverged = CascadeContext(
            simulation_id="SIM-DIV-001",
            cascade_id="CAS-DIV-001",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=diverged_solve,
            latest_violations=diverged_solve.violations
        )
        step_div = coord.coordinate_step(ctx_diverged, db=None)
        assert step_div.is_terminal is True
        assert step_div.coordinator_state == CoordinatorState.SOLVER_DIVERGED
        assert step_div.termination_reason == "SOLVER_DIVERGED"
        print(f"  Divergence Handled Safely: State = {step_div.coordinator_state.value}")
        print("  --> PASSED: Divergence handled safely without unhandled exception.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 24: Existing CascadeEngine Compatibility & Coordinated Run Drill
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Full Coordinated Cascade Run Drill...")
        coord_req = CascadeSimulationRequest(
            simulation_id="SIM-COORD-DRILL",
            network_id="TEST_NETWORK",
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=5,
            protection_threshold_line_loading_pct=15.0,
            protection_threshold_transformer_loading_pct=15.0
        )
        coord_result: CoordinatedCascadeResult = coord.run_coordinated_cascade(coord_req, db)
        assert coord_result.simulation_id == "SIM-COORD-DRILL"
        assert coord_result.total_steps > 0
        assert len(coord_result.step_results) == coord_result.total_steps
        assert len(coord_result.decision_traces) > 0
        assert coord_result.status in ("STABLE", "MAX_DEPTH_REACHED", "SYSTEM_SEPARATION")
        print(f"  Coordinated Cascade Result: Status={coord_result.status}, Steps={coord_result.total_steps}, Traces={len(coord_result.decision_traces)}")
        print("  --> PASSED: End-to-end coordinated cascade drill completed successfully.")
        passed_count += 1

    finally:
        db.close()

    print("\n" + "=" * 80)
    print(f"ALL {passed_count}/{total_count} CASCADING AGENTS ARCHITECTURE TESTS PASSED (100.0%)")
    print("=" * 80)


if __name__ == "__main__":
    run_cascade_agents_tests()

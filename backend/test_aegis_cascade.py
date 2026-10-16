"""
GRIDSEC — STEP 10: AEGIS CASCADE INTELLIGENCE & EXPLAINABILITY TESTS
Comprehensive deterministic test suite validating the complete explainability layer:
- Evidence hierarchy preservation (OBSERVED, SOLVER_DERIVED, INFERRED, SIMULATOR_GROUND_TRUTH)
- Quantitative before/after physical metrics (line loading, voltage drops, losses delta)
- Groundedness and anti-hallucination (no fabricated numbers or missing data)
- Cyber-to-physics causal separation (FDI telemetry inconsistency vs unauthorized breaker trip)
- Root cause vs intermediate consequences vs propagation events
- Algorithmic DSA explainability (Hashing, BFS, DFS, Max-Heap, Dijkstra, AC Solver)
- Topological islanding & recovery route validation explainability
- Non-autonomous operator recommendations and explicit termination analysis
- 5 genuine multi-step physics integration drills (including anti-hardcoding comparative test)
"""

import sys
import copy
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.asset import Asset
from app.models.event import Cascade, CascadeEvent, GridEvent
from app.models.aegis_report import AegisReport
from app.schemas.cascade import CascadeSimulationRequest
from app.schemas.aegis import (
    AegisCascadeReport,
    EvidenceTier,
    TimelineEvent,
    PhysicalImpactMetric,
    PhysicalImpactSummary,
    CyberImpactSummary,
    DSAAnalysisSummary,
    IslandAnalysisSummary,
    RecoveryAnalysisSummary,
    AgentAnalysisSummary,
    TerminationAnalysisSummary
)
from app.cascade.contracts import (
    CoordinatorState,
    CascadeAgentResult,
    AgentDecisionTrace,
    CoordinatedStepResult,
    CoordinatedCascadeResult
)
from app.cascade.context import CascadeContext
from app.cascade.coordinator import CascadeCoordinator
from app.services.aegis_service import AegisService, aegis_service
from app.power.models import PowerFlowResult, LineResult, TransformerResult, BusResult, PowerBalance
from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service


def build_synthetic_solver_result(
    base_res: PowerFlowResult,
    status: str = "SUCCESS",
    line_loading_map: Dict[str, float] = None,
    bus_voltages_map: Dict[str, float] = None
) -> PowerFlowResult:
    """Clones a valid base PowerFlowResult and applies test overrides."""
    res = copy.deepcopy(base_res)
    res.status = status
    if line_loading_map:
        for l in res.lines:
            if l.line_id in line_loading_map:
                l.loading_percent = line_loading_map[l.line_id]
    if bus_voltages_map:
        for b in res.buses:
            if b.bus_id in bus_voltages_map:
                b.voltage_pu = bus_voltages_map[b.bus_id]
    return res


def run_aegis_cascade_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC AEGIS CASCADE INTELLIGENCE: STEP 10 TESTS")
    print("=" * 80)

    db: Session = SessionLocal()
    passed_count = 0
    total_count = 35

    try:
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve = PowerFlowSolver.solve(network_data, "TEST_BASE_SOLVE", {})

        # ---------------------------------------------------------------------
        # TEST 1: Aegis Service Initialization & Method Existence
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Aegis Service Initialization & Method Existence...")
        svc = AegisService()
        assert hasattr(svc, "generate_cascade_assessment"), "Missing generate_cascade_assessment"
        assert hasattr(svc, "explain_cascade"), "Missing explain_cascade"
        assert hasattr(svc, "build_situation_snapshot"), "Missing build_situation_snapshot"
        print("  AegisService initialized with cascade intelligence methods present.")
        print("  --> PASSED: Initialization verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: Evidence Hierarchy & Tier Preservation
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Evidence Hierarchy & Tier Preservation...")
        step1_trace = AgentDecisionTrace(
            agent_name="DetectionAgent",
            step=1,
            input_summary="Solver result evaluated",
            decision="DETECTED_VIOLATIONS",
            reason="Line LINE-1-2 loading 114.2% exceeded 100% threshold",
            severity="WARNING",
            evidence={"violations": [{"violation_type": "LINE_OVERLOAD", "asset_id": "LINE-1-2", "observed_value": 114.2, "limit_value": 100.0}]}
        )
        step_res = CoordinatedStepResult(
            step_number=1,
            depth=1,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            detection_result=CascadeAgentResult(
                agent_name="DetectionAgent",
                decision="DETECTED_VIOLATIONS",
                evidence={"violations": [{"violation_type": "LINE_OVERLOAD", "asset_id": "LINE-1-2", "observed_value": 114.2, "limit_value": 100.0}]}
            ),
            decision_traces=[step1_trace],
            tripped_asset="LINE-1-3"
        )
        cas_res = CoordinatedCascadeResult(
            simulation_id="SIM-AEGIS-001",
            cascade_id="CAS-AEGIS-001",
            network_id=network_id,
            status="TERMINATED",
            termination_reason="EQUILIBRIUM_REACHED",
            total_steps=1,
            max_depth_reached=1,
            tripped_assets=["LINE-1-3"],
            step_results=[step_res],
            decision_traces=[step1_trace],
            summary="Single step cascade",
            execution_time_ms=120.0
        )
        report = svc.generate_cascade_assessment(cas_res)
        tiers_present = {event.evidence_tier for event in report.timeline}
        assert EvidenceTier.OBSERVED in tiers_present, "OBSERVED tier missing in timeline"
        assert EvidenceTier.SOLVER_DERIVED in tiers_present, "SOLVER_DERIVED tier missing in timeline"
        assert EvidenceTier.INFERRED in tiers_present, "INFERRED tier missing in timeline"
        print(f"  Timeline verified with preserved tiers: {tiers_present}")
        print("  --> PASSED: Evidence hierarchy preservation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: Groundedness & No Fabricated Numbers
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Groundedness & No Fabricated Numbers...")
        # Context without solver results
        empty_ctx = CascadeContext(simulation_id="SIM-EMPTY", cascade_id="CAS-EMPTY", network_id=network_id)
        report_empty = svc.generate_cascade_assessment(cas_res, initial_context=empty_ctx, final_context=empty_ctx)
        assert report_empty.physical_impact_summary.max_line_loading_percent is None or isinstance(report_empty.physical_impact_summary.max_line_loading_percent, (int, float))
        # Ensure missing total losses are None rather than invented
        assert report_empty.physical_impact_summary.total_losses_before_mw is None, "Fabricated total_losses_before_mw!"
        print("  Aegis correctly preserved None for absent solver metrics without fabricating values.")
        print("  --> PASSED: Groundedness verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Quantitative Before/After Delta Calculation
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Quantitative Before/After Delta Calculation...")
        init_pf = build_synthetic_solver_result(base_solve, line_loading_map={"LINE-1-2": 75.0})
        final_pf = build_synthetic_solver_result(base_solve, line_loading_map={"LINE-1-2": 115.0})
        init_ctx = CascadeContext(simulation_id="SIM-DELTA", cascade_id="CAS-DELTA", network_id=network_id, latest_solver_result=init_pf)
        final_ctx = CascadeContext(simulation_id="SIM-DELTA", cascade_id="CAS-DELTA", network_id=network_id, latest_solver_result=final_pf)
        report_delta = svc.generate_cascade_assessment(cas_res, initial_context=init_ctx, final_context=final_ctx)
        
        line_metric = next((m for m in report_delta.physical_impact_summary.metrics if m.asset_id == "LINE-1-2"), None)
        assert line_metric is not None, "LINE-1-2 delta metric missing"
        assert line_metric.before_value == 75.0, f"Expected before 75.0, got {line_metric.before_value}"
        assert line_metric.after_value == 115.0, f"Expected after 115.0, got {line_metric.after_value}"
        assert line_metric.delta == 40.0, f"Expected delta 40.0, got {line_metric.delta}"
        assert line_metric.percentage_change == 53.3, f"Expected percentage change 53.3%, got {line_metric.percentage_change}"
        print(f"  Line delta correctly computed: Before={line_metric.before_value}%, After={line_metric.after_value}%, Delta={line_metric.delta}%, Change={line_metric.percentage_change}%")
        print("  --> PASSED: Quantitative delta verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Chronological Timeline Reconstruction
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Chronological Timeline Reconstruction...")
        assert len(report.timeline) >= 3, f"Expected >= 3 timeline events, got {len(report.timeline)}"
        assert report.timeline[0].event_type == "INITIAL_DISTURBANCE", "First event should be INITIAL_DISTURBANCE"
        assert report.timeline[-1].event_type == "CASCADE_TERMINATION", "Last event should be CASCADE_TERMINATION"
        print(f"  Timeline events sequence: {[e.event_type for e in report.timeline]}")
        print("  --> PASSED: Timeline reconstruction verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Root Cause vs Consequence Separation
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Root Cause vs Consequence Separation...")
        rc_dict = report.root_cause_vs_consequences
        assert "root_disturbance" in rc_dict, "Missing root_disturbance"
        assert "intermediate_consequences" in rc_dict, "Missing intermediate_consequences"
        assert "propagation_events" in rc_dict, "Missing propagation_events"
        assert "system_consequences" in rc_dict, "Missing system_consequences"
        assert "LINE-1-3" in rc_dict["root_disturbance"], "Root disturbance should name LINE-1-3"
        print(f"  Root Cause: {rc_dict['root_disturbance']}")
        print(f"  Consequences: {rc_dict['intermediate_consequences']}")
        print("  --> PASSED: Root cause vs consequence separation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Cyber-to-Physics Mapping: Unauthorized Control Attack
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Cyber-to-Physics Mapping: Unauthorized Control...")
        cyber_meta_auth = {"attack_type": "UNAUTHORIZED_BREAKER_CONTROL", "source_ip": "192.168.10.55"}
        report_cyber_auth = svc.generate_cascade_assessment(cas_res, cyber_metadata=cyber_meta_auth)
        assert report_cyber_auth.cyber_impact_summary.cyber_event_detected is True
        assert report_cyber_auth.cyber_impact_summary.telemetry_inconsistency_detected is False
        assert "Unauthorized control command" in report_cyber_auth.cyber_impact_summary.cyber_to_physics_mapping
        print("  Unauthorized control properly mapped to sandbox physical transition.")
        print("  --> PASSED: Unauthorized control cyber mapping verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Cyber-to-Physics Mapping: False Data Injection Attack
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Cyber-to-Physics Mapping: False Data Injection...")
        cyber_meta_fdi = {"attack_type": "FALSE_DATA_INJECTION", "source_asset": "SUB-01-RTU"}
        report_cyber_fdi = svc.generate_cascade_assessment(cas_res, cyber_metadata=cyber_meta_fdi)
        assert report_cyber_fdi.cyber_impact_summary.cyber_event_detected is True
        assert report_cyber_fdi.cyber_impact_summary.telemetry_inconsistency_detected is True
        assert "False data injection altered SCADA telemetry without changing breaker" in report_cyber_fdi.cyber_impact_summary.cyber_to_physics_mapping
        print("  FDI attack properly isolated with telemetry-physics inconsistency flagged.")
        print("  --> PASSED: False data injection cyber mapping verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: Algorithmic DSA Explainability: Hashing Operations
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Algorithmic DSA Explainability: Hashing Operations...")
        h_ops = report.dsa_analysis.hashing_operations
        assert "Hash Table" in h_ops["algorithm"]
        assert "O(1)" in h_ops["complexity"]
        assert h_ops["lookups_count"] > 0
        print(f"  Hashing DSA: {h_ops['algorithm']} ({h_ops['complexity']}) - {h_ops['lookups_count']} lookups")
        print("  --> PASSED: Hashing DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: Algorithmic DSA Explainability: BFS Impact Analysis
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Algorithmic DSA Explainability: BFS Impact Analysis...")
        bfs_ops = report.dsa_analysis.bfs_impact_analysis
        assert "Breadth-First Search" in bfs_ops["algorithm"]
        assert "O(V + E)" in bfs_ops["complexity"]
        print(f"  BFS DSA: {bfs_ops['algorithm']} ({bfs_ops['complexity']}) - {bfs_ops['reachable_nodes_count']} nodes reached")
        print("  --> PASSED: BFS DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: Algorithmic DSA Explainability: DFS Island Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Algorithmic DSA Explainability: DFS Island Detection...")
        dfs_ops = report.dsa_analysis.dfs_island_analysis
        assert "Depth-First Search" in dfs_ops["algorithm"]
        assert "O(V + E)" in dfs_ops["complexity"]
        print(f"  DFS DSA: {dfs_ops['algorithm']} ({dfs_ops['complexity']}) - {dfs_ops['connected_components_found']} components")
        print("  --> PASSED: DFS DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Algorithmic DSA Explainability: Max-Heap Prioritization
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Algorithmic DSA Explainability: Max-Heap...")
        heap_ops = report.dsa_analysis.max_heap_priority_analysis
        assert "Max-Heap" in heap_ops["algorithm"]
        assert "O(log N)" in heap_ops["complexity"]
        print(f"  Max-Heap DSA: {heap_ops['algorithm']} ({heap_ops['complexity']})")
        print("  --> PASSED: Max-Heap DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Algorithmic DSA Explainability: Dijkstra Shortest Path
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Algorithmic DSA Explainability: Dijkstra Shortest Path...")
        dijk_ops = report.dsa_analysis.dijkstra_recovery_analysis
        assert "Dijkstra" in dijk_ops["algorithm"]
        assert "O((V + E) log V)" in dijk_ops["complexity"]
        print(f"  Dijkstra DSA: {dijk_ops['algorithm']} ({dijk_ops['complexity']})")
        print("  --> PASSED: Dijkstra DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: Algorithmic DSA Explainability: AC Power Flow Solver
        # ---------------------------------------------------------------------
        print("\n[TEST 14] Algorithmic DSA Explainability: AC Solver...")
        ac_ops = report.dsa_analysis.ac_solver_validation
        assert "Newton-Raphson" in ac_ops["algorithm"]
        assert ac_ops["status"] == "CONVERGED"
        print(f"  AC Solver DSA: {ac_ops['algorithm']} - Status: {ac_ops['status']}")
        print("  --> PASSED: AC Solver DSA explainability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Islanding Analysis: Single Synchronous Area
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Islanding Analysis: Single Synchronous Area...")
        assert report.islanding_analysis.islanding_detected is False
        assert report.islanding_analysis.component_count == 1
        assert "single synchronous area" in report.islanding_analysis.narrative.lower()
        print("  Single island correctly summarized.")
        print("  --> PASSED: Single island analysis verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Islanding Analysis: Multiple Synchronous Islands
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Islanding Analysis: Multiple Synchronous Islands...")
        step_island = CoordinatedStepResult(
            step_number=2,
            depth=2,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            island_result=CascadeAgentResult(
                agent_name="IslandAgent",
                decision="ISLANDING_DETECTED",
                evidence={
                    "islanding_detected": True,
                    "component_count": 2,
                    "main_island": ["BUS-1", "BUS-2", "BUS-3"],
                    "isolated_islands": [["BUS-4", "BUS-5"]],
                    "electrical_viability": {"ISLAND-1": "VIABLE", "ISLAND-2": "DEFICIT"}
                }
            )
        )
        cas_island = CoordinatedCascadeResult(
            simulation_id="SIM-ISL",
            cascade_id="CAS-ISL",
            network_id=network_id,
            status="TERMINATED",
            termination_reason="SYSTEM_SEPARATION",
            total_steps=2,
            max_depth_reached=2,
            tripped_assets=["LINE-1-2", "LINE-1-3"],
            step_results=[step_island],
            decision_traces=[],
            summary="Islanding cascade",
            execution_time_ms=150.0
        )
        report_isl = svc.generate_cascade_assessment(cas_island)
        assert report_isl.islanding_analysis.islanding_detected is True
        assert report_isl.islanding_analysis.component_count == 2
        assert report_isl.islanding_analysis.main_island_size == 3
        assert report_isl.islanding_analysis.isolated_islands_count == 1
        print(f"  Islanding narrative: {report_isl.islanding_analysis.narrative}")
        print("  --> PASSED: Multiple islands analysis verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 17: Recovery Analysis: Feasible Alternate Route
        # ---------------------------------------------------------------------
        print("\n[TEST 17] Recovery Analysis: Feasible Alternate Route...")
        step_rec = CoordinatedStepResult(
            step_number=1,
            depth=1,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            recovery_result=CascadeAgentResult(
                agent_name="RecoveryAgent",
                decision="FEASIBLE_ROUTE_FOUND",
                evidence={
                    "feasible_route_found": True,
                    "total_routes_evaluated": 2,
                    "feasible_routes_count": 1,
                    "rejected_routes_count": 1,
                    "recommended_route": {"route": ["BUS-1", "BUS-4", "BUS-2"], "feasible": True, "distance_km": 120.0},
                    "candidate_routes": [
                        {"route": ["BUS-1", "BUS-4", "BUS-2"], "feasible": True},
                        {"route": ["BUS-1", "BUS-5", "BUS-2"], "feasible": False}
                    ]
                }
            )
        )
        cas_rec = CoordinatedCascadeResult(
            simulation_id="SIM-REC",
            cascade_id="CAS-REC",
            network_id=network_id,
            status="TERMINATED",
            termination_reason="EQUILIBRIUM_REACHED",
            total_steps=1,
            max_depth_reached=1,
            tripped_assets=["LINE-1-2"],
            step_results=[step_rec],
            decision_traces=[],
            summary="Recovery test",
            execution_time_ms=100.0
        )
        report_rec = svc.generate_cascade_assessment(cas_rec)
        assert report_rec.recovery_analysis.feasible_route_found is True
        assert report_rec.recovery_analysis.feasible_candidates_count == 1
        assert report_rec.recovery_analysis.rejected_candidates_count == 1
        assert "BUS-1 -> BUS-4 -> BUS-2" in report_rec.recovery_analysis.narrative
        print(f"  Recovery narrative: {report_rec.recovery_analysis.narrative}")
        print("  --> PASSED: Feasible recovery analysis verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 18: Recovery Analysis: All Routes Rejected Under AC Power Flow
        # ---------------------------------------------------------------------
        print("\n[TEST 18] Recovery Analysis: All Routes Rejected...")
        step_rec_rej = CoordinatedStepResult(
            step_number=1,
            depth=1,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            recovery_result=CascadeAgentResult(
                agent_name="RecoveryAgent",
                decision="NO_FEASIBLE_ROUTE",
                evidence={
                    "feasible_route_found": False,
                    "total_routes_evaluated": 2,
                    "feasible_routes_count": 0,
                    "rejected_routes_count": 2,
                    "recommended_route": None,
                    "candidate_routes": []
                }
            )
        )
        cas_rec_rej = CoordinatedCascadeResult(
            simulation_id="SIM-REJ",
            cascade_id="CAS-REJ",
            network_id=network_id,
            status="TERMINATED",
            termination_reason="EQUILIBRIUM_REACHED",
            total_steps=1,
            max_depth_reached=1,
            tripped_assets=["LINE-1-2"],
            step_results=[step_rec_rej],
            decision_traces=[],
            summary="Rejected recovery test",
            execution_time_ms=100.0
        )
        report_rec_rej = svc.generate_cascade_assessment(cas_rec_rej)
        assert report_rec_rej.recovery_analysis.feasible_route_found is False
        assert report_rec_rej.recovery_analysis.rejected_candidates_count == 2
        assert "all were rejected during AC power-flow validation" in report_rec_rej.recovery_analysis.narrative
        print("  Rejection rationale accurately explained without recommending invalid paths.")
        print("  --> PASSED: Rejected recovery analysis verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 19: Termination Rationale: EQUILIBRIUM_REACHED
        # ---------------------------------------------------------------------
        print("\n[TEST 19] Termination Rationale: EQUILIBRIUM_REACHED...")
        report_term_eq = svc.generate_cascade_assessment(cas_res)
        assert report_term_eq.termination_analysis.termination_reason == "EQUILIBRIUM_REACHED"
        assert "equilibrium reached" in report_term_eq.termination_analysis.explanation.lower()
        print(f"  Termination explanation: {report_term_eq.termination_analysis.explanation}")
        print("  --> PASSED: Equilibrium termination explanation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 20: Termination Rationale: MAX_DEPTH_REACHED
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Termination Rationale: MAX_DEPTH_REACHED...")
        cas_max_depth = copy.deepcopy(cas_res)
        cas_max_depth.termination_reason = "MAX_DEPTH_REACHED"
        cas_max_depth.max_depth_reached = 5
        cas_max_depth.total_steps = 5
        report_max_depth = svc.generate_cascade_assessment(cas_max_depth)
        assert report_max_depth.termination_analysis.termination_reason == "MAX_DEPTH_REACHED"
        assert "maximum simulation depth limit" in report_max_depth.termination_analysis.explanation
        print("  --> PASSED: Max depth termination explanation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 21: Termination Rationale: SOLVER_DIVERGED
        # ---------------------------------------------------------------------
        print("\n[TEST 21] Termination Rationale: SOLVER_DIVERGED...")
        cas_div = copy.deepcopy(cas_res)
        cas_div.termination_reason = "SOLVER_DIVERGED"
        report_div = svc.generate_cascade_assessment(cas_div)
        assert report_div.termination_analysis.termination_reason == "SOLVER_DIVERGED"
        assert "failed to converge" in report_div.termination_analysis.explanation
        assert report_div.confidence_level == "MEDIUM", "Diverged solve should reduce confidence"
        print("  --> PASSED: Solver diverged termination explanation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 22: Non-Autonomous Operator Recommendations
        # ---------------------------------------------------------------------
        print("\n[TEST 22] Non-Autonomous Operator Recommendations...")
        recs = report.recommendations
        assert len(recs) > 0, "Recommendations should not be empty"
        for r in recs:
            assert "action_id" in r
            assert "action_type" in r
            assert "description" in r
            # Verify advisory language (inspect, review, consider, assess, system operating)
            assert any(word in r["description"].lower() for word in ["inspect", "review", "consider", "assess", "system operating"])
        print(f"  Generated {len(recs)} advisory recommendation(s).")
        print("  --> PASSED: Non-autonomous recommendations verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 23: Explicit Uncertainty Documentation
        # ---------------------------------------------------------------------
        print("\n[TEST 23] Explicit Uncertainty Documentation...")
        assert len(report.uncertainties) >= 2
        assert any("sub-second" in u.lower() or "dynamic" in u.lower() for u in report.uncertainties)
        print(f"  Uncertainties documented: {report.uncertainties}")
        print("  --> PASSED: Uncertainty representation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 24: Database Immutability During Assessment Generation
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Database Immutability During Assessment...")
        db_assets_before = db.query(Asset).count()
        report_db = svc.generate_cascade_assessment(cas_res, db=db)
        db_assets_after = db.query(Asset).count()
        assert db_assets_before == db_assets_after, "Base asset records changed!"
        assert db_assets_after == 59, f"Expected 59 assets, got {db_assets_after}"
        print("  Base database grid assets count remains exactly 59.")
        print("  --> PASSED: Database immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 25: Explain Cascade by ID from DB Record
        # ---------------------------------------------------------------------
        print("\n[TEST 25] Explain Cascade by ID from DB Record...")
        cas_id_test = f"CAS-TEST-{uuid.uuid4().hex[:6]}"
        evt_test_id = f"EVT-TEST-{uuid.uuid4().hex[:6]}"
        root_evt_db = GridEvent(
            event_id=evt_test_id,
            event_type="LINE_TRIP",
            source_asset="LINE-1-3",
            severity="HIGH",
            simulation_id="SIM-DB-TEST"
        )
        db.add(root_evt_db)
        db.commit()

        cas_db_rec = Cascade(
            cascade_id=cas_id_test,
            simulation_id="SIM-DB-TEST",
            root_event_id=evt_test_id,
            current_depth=1,
            status="TERMINATED",
            summary="Historical cascade record"
        )
        db.add(cas_db_rec)
        db.commit()
        
        reconstructed_rep = svc.explain_cascade(cas_id_test, db)
        assert reconstructed_rep is not None, "Failed to reconstruct cascade report"
        assert reconstructed_rep.cascade_id == cas_id_test
        print("  Reconstructed report from historical database records.")
        print("  --> PASSED: DB cascade explanation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 26: Agent Decision Summaries Synthesis
        # ---------------------------------------------------------------------
        print("\n[TEST 26] Agent Decision Summaries Synthesis...")
        ag_analysis = report.agent_analysis
        assert "DetectionAgent" in ag_analysis.detection_explanation
        assert "ImpactAgent" in ag_analysis.impact_explanation
        assert "PriorityAgent" in ag_analysis.priority_explanation
        assert "PropagationAgent" in ag_analysis.propagation_explanation
        print("  Agent decision narratives successfully consolidated.")
        print("  --> PASSED: Agent decisions synthesis verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 27: Structured Evidence Claims Verification
        # ---------------------------------------------------------------------
        print("\n[TEST 27] Structured Evidence Claims Verification...")
        claims = report.evidence_claims
        assert len(claims) == 3, f"Expected 3 structured claims, got {len(claims)}"
        for c in claims:
            assert c.claim is not None
            assert len(c.evidence) > 0
        print("  Structured evidence claims verified.")
        print("  --> PASSED: Evidence claims verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 28: DSA Context Dictionary Serialization
        # ---------------------------------------------------------------------
        print("\n[TEST 28] DSA Context Dictionary Serialization...")
        dsa_ctx = report.dsa_context
        assert "hashing_lookups" in dsa_ctx
        assert "bfs_impacted_nodes" in dsa_ctx
        assert "dfs_connected_components" in dsa_ctx
        assert "max_heap_candidates_ranked" in dsa_ctx
        assert "dijkstra_routes_evaluated" in dsa_ctx
        assert "ac_solver_converged" in dsa_ctx
        print(f"  DSA context: {dsa_ctx}")
        print("  --> PASSED: DSA context verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 29: Executive Summary Composition
        # ---------------------------------------------------------------------
        print("\n[TEST 29] Executive Summary Composition...")
        assert report.executive_summary.startswith("Cascade assessment")
        assert "EQUILIBRIUM_REACHED" in report.executive_summary
        assert "LINE-1-3" in report.executive_summary
        print(f"  Executive Summary: {report.executive_summary}")
        print("  --> PASSED: Executive summary verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 30: Multi-Step Timeline Sequence Ordering
        # ---------------------------------------------------------------------
        print("\n[TEST 30] Multi-Step Timeline Sequence Ordering...")
        step1 = CoordinatedStepResult(
            step_number=1,
            depth=1,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            tripped_asset="LINE-1-3"
        )
        step2 = CoordinatedStepResult(
            step_number=2,
            depth=2,
            coordinator_state=CoordinatorState.STEP_COMPLETE,
            tripped_asset="XFMR-3-4"
        )
        cas_multistep = CoordinatedCascadeResult(
            simulation_id="SIM-MULTI",
            cascade_id="CAS-MULTI",
            network_id=network_id,
            status="TERMINATED",
            termination_reason="EQUILIBRIUM_REACHED",
            total_steps=2,
            max_depth_reached=2,
            tripped_assets=["LINE-1-3", "XFMR-3-4"],
            step_results=[step1, step2],
            decision_traces=[],
            summary="Two-step cascade",
            execution_time_ms=210.0
        )
        rep_multistep = svc.generate_cascade_assessment(cas_multistep)
        step_numbers = [e.step_number for e in rep_multistep.timeline]
        # Verify step numbers are non-decreasing
        assert step_numbers == sorted(step_numbers), f"Timeline steps not in order: {step_numbers}"
        print(f"  Timeline chronological steps: {step_numbers}")
        print("  --> PASSED: Multi-step timeline ordering verified.")
        passed_count += 1

        # =====================================================================
        # GENUINE MULTI-STEP PHYSICS INTEGRATION DRILLS
        # =====================================================================

        # ---------------------------------------------------------------------
        # TEST 31 (Drill A): Real Cascade Engine to Aegis Report End-to-End
        # ---------------------------------------------------------------------
        print("\n[TEST 31] Genuine Integration Drill A: Real Multi-Step Cascade to Aegis Report...")
        coord = CascadeCoordinator()
        req_a = CascadeSimulationRequest(
            simulation_id=f"SIM-DRILL-A-{uuid.uuid4().hex[:4]}",
            network_id=network_id,
            initial_action="LINE_TRIP",
            initial_asset_id="LINE-1-3",
            max_depth=3,
            protection_threshold_line_loading_pct=100.0,
            protection_threshold_transformer_loading_pct=100.0
        )
        res_a = coord.run_coordinated_cascade(req_a, db)
        report_a = svc.generate_cascade_assessment(res_a, db=db)
        
        assert report_a.cascade_id == res_a.cascade_id
        assert report_a.physical_impact_summary.assets_tripped_count == len(res_a.tripped_assets)
        assert len(report_a.timeline) >= res_a.total_steps
        assert report_a.termination_analysis.termination_reason == res_a.termination_reason
        print(f"  [Drill A] Reconstructed report for live cascade {res_a.cascade_id}: {report_a.executive_summary}")
        print("  --> PASSED: Integration Drill A verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 32 (Drill B): Anti-Hardcoding Comparative Drill (Two Different Outages)
        # ---------------------------------------------------------------------
        print("\n[TEST 32] Genuine Integration Drill B: Anti-Hardcoding Comparative Drill...")
        req_b1 = CascadeSimulationRequest(
            simulation_id=f"SIM-DRILL-B1-{uuid.uuid4().hex[:4]}",
            network_id=network_id,
            initial_action="LINE_TRIP",
            initial_asset_id="LINE-1-3",
            max_depth=3
        )
        res_b1 = coord.run_coordinated_cascade(req_b1, db)
        rep_b1 = svc.generate_cascade_assessment(res_b1)

        req_b2 = CascadeSimulationRequest(
            simulation_id=f"SIM-DRILL-B2-{uuid.uuid4().hex[:4]}",
            network_id=network_id,
            initial_action="LINE_TRIP",
            initial_asset_id="LINE-1-2",
            max_depth=3
        )
        res_b2 = coord.run_coordinated_cascade(req_b2, db)
        rep_b2 = svc.generate_cascade_assessment(res_b2)

        # Reports must differ in root disturbance, tripped assets, and summary
        assert "LINE-1-3" in rep_b1.root_cause_vs_consequences["root_disturbance"]
        assert "LINE-1-2" in rep_b2.root_cause_vs_consequences["root_disturbance"]
        assert rep_b1.executive_summary != rep_b2.executive_summary, "Reports should not be identical!"
        print(f"  [Drill B - Run 1] Root: LINE-1-3 -> Summary: {rep_b1.executive_summary}")
        print(f"  [Drill B - Run 2] Root: LINE-1-2 -> Summary: {rep_b2.executive_summary}")
        print("  --> PASSED: Integration Drill B anti-hardcoding verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 33 (Drill C): Real Topological Separation & Islanding in Aegis
        # ---------------------------------------------------------------------
        print("\n[TEST 33] Genuine Integration Drill C: Real Islanding in Aegis Report...")
        req_drill_c = CascadeSimulationRequest(
            simulation_id=f"SIM-DRILL-C-{uuid.uuid4().hex[:4]}",
            network_id=network_id,
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=5,
            protection_threshold_line_loading_pct=15.0,
            protection_threshold_transformer_loading_pct=15.0
        )
        drill_c_res = coord.run_coordinated_cascade(req_drill_c, db)
        rep_split = svc.generate_cascade_assessment(drill_c_res)
        assert rep_split.islanding_analysis.islanding_detected is True
        assert rep_split.islanding_analysis.component_count >= 2
        assert "Topological graph split into" in rep_split.islanding_analysis.narrative
        print(f"  [Drill C] Islanding accurately reported: {rep_split.islanding_analysis.component_count} islands detected.")
        print("  --> PASSED: Integration Drill C verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 34 (Drill D): Real Recovery Agent Validation in Aegis Report
        # ---------------------------------------------------------------------
        print("\n[TEST 34] Genuine Integration Drill D: Recovery Route Rationale...")
        req_drill_d = CascadeSimulationRequest(
            simulation_id=f"SIM-DRILL-D-{uuid.uuid4().hex[:4]}",
            network_id=network_id,
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=5,
            protection_threshold_line_loading_pct=25.0,
            protection_threshold_transformer_loading_pct=25.0
        )
        drill_d_res = coord.run_coordinated_cascade(req_drill_d, db)
        rep_rec_drill = svc.generate_cascade_assessment(drill_d_res)
        assert rep_rec_drill.recovery_analysis is not None
        assert rep_rec_drill.recovery_analysis.narrative != ""
        print(f"  [Drill D] Recovery narrative: {rep_rec_drill.recovery_analysis.narrative}")
        print("  --> PASSED: Integration Drill D verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 35 (Drill E): Solver Divergence Explanation & Grounding
        # ---------------------------------------------------------------------
        print("\n[TEST 35] Genuine Integration Drill E: Solver Divergence Explanation...")
        cas_div_e = CoordinatedCascadeResult(
            simulation_id="SIM-DIV-E",
            cascade_id="CAS-DIV-E",
            network_id=network_id,
            status="FAILED",
            termination_reason="SOLVER_DIVERGED",
            total_steps=2,
            max_depth_reached=2,
            tripped_assets=["LINE-1-2", "LINE-1-3"],
            step_results=[],
            decision_traces=[],
            summary="Diverged cascade",
            execution_time_ms=190.0
        )
        rep_div_e = svc.generate_cascade_assessment(cas_div_e)
        assert rep_div_e.termination_analysis.termination_reason == "SOLVER_DIVERGED"
        assert rep_div_e.confidence_level == "MEDIUM"
        assert "solver failed to converge" in rep_div_e.termination_analysis.explanation.lower()
        print(f"  [Drill E] Divergence clearly explained: {rep_div_e.termination_analysis.explanation}")
        print("  --> PASSED: Integration Drill E verified.")
        passed_count += 1

        print("\n" + "=" * 80)
        print(f"ALL {passed_count}/{total_count} AEGIS CASCADE INTELLIGENCE TESTS PASSED (100.0%)")
        print("=" * 80)

    finally:
        db.close()


if __name__ == "__main__":
    run_aegis_cascade_tests()

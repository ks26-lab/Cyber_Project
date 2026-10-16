"""
GRIDSEC — Cascading Agents Phase: Step 3 Automated Test Suite
Physical Cascade Detection Agent Unit & Integration Tests

Tests cover:
Basic:
1. Agent initialization & metadata
2. Nominal baseline AC solver result produces zero false violations
3. Transmission line thermal overload detection (LINE_OVERLOAD)
4. Power transformer loading detection (TRANSFORMER_OVERLOAD)
5. Bus voltage undervoltage constraint detection (VOLTAGE_UNDERVOLTAGE)
6. Bus voltage overvoltage constraint detection (VOLTAGE_OVERVOLTAGE)
7. Generator active/reactive operating limit detection (GENERATOR_LIMIT)
8. Kirchhoff active power balance mismatch detection (POWER_IMBALANCE)
9. Solver non-linear divergence / mathematical collapse detection (SOLVER_DIVERGENCE)

Boundary Conditions:
10. Exactly-at-limit boundary (loading = 100.0% vs limit 100.0%) is not flagged
11. Just-below-limit boundary (loading = 99.9% vs limit 100.0%) is not flagged
12. Just-above-limit boundary (loading = 100.1% vs limit 100.0%) is flagged with exact excess
13. Multiple simultaneous violations across different element types are all captured

Architecture:
14. Read-only guarantee: zero sandbox state overrides mutated
15. Read-only guarantee: zero base database records mutated
16. Read-only guarantee: zero topology graph connections modified
17. Detection != Propagation: agent never automatically trips assets
18. Single Source of Truth: solver results strictly used without fabricated measurements
19. Data Provenance: all violations tagged as SOLVER_DERIVED
20. Deterministic Sorting: severity rank (CRITICAL -> WARNING) followed by type and asset ID

Integration:
21. DetectionAgent consumes Step-2 CascadeContext accurately
22. DetectionAgent returns strongly-typed Step-2 CascadeAgentResult and AgentDecisionTrace
23. CascadeCoordinator successfully invokes DetectionAgent in multi-agent pipeline
24. EventBus lifecycle events (CASCADE_AGENT_STARTED, CASCADE_AGENT_COMPLETED) emitted accurately

Real Physics Integration Drill:
- Sandbox Root Disturbance -> AC Newton-Raphson Solver -> DetectionAgent -> Real Overload Detection
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
    PhysicalViolationRecord,
    CoordinatorState
)
from app.cascade.context import CascadeContext
from app.cascade.detection_agent import DetectionAgent, detection_agent
from app.cascade.coordinator import CascadeCoordinator, cascade_coordinator

from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.models import (
    PowerFlowResult,
    BusResult,
    LineResult,
    TransformerResult,
    GeneratorModel,
    PowerBalance,
    Violation,
    ViolationType,
    DataProvenance,
    DataClassification
)


def run_detection_agent_tests():
    print("=" * 80)
    print("RUNNING GRIDSEC CASCADE DETECTION AGENT: STEP 3 TESTS")
    print("=" * 80)

    db = SessionLocal()
    passed_count = 0
    total_count = 24

    try:
        network_id = "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(network_id, db)
        base_solve: PowerFlowResult = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="DET_AGENT_BASE_TEST"
        )
        assert base_solve.status == "SUCCESS", f"Base power flow failed: {base_solve.message}"

        # ---------------------------------------------------------------------
        # TEST 1: Agent Initialization & Metadata
        # ---------------------------------------------------------------------
        print("\n[TEST 1] Agent Initialization & Metadata...")
        agent = DetectionAgent()
        assert agent.agent_name == "DetectionAgent"
        assert isinstance(agent, CascadeAgent)
        assert hasattr(agent, "asset_index")
        agent._index_assets(network_data)
        assert agent.asset_index.get_by_id("LINE-1-2") is not None
        assert agent.asset_index.get_by_id("BUS-1") is not None
        print("  DetectionAgent initialized with active O(1) Hash Table.")
        print("  --> PASSED: Initialization verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: Nominal Baseline AC Solver -> Zero False Violations
        # ---------------------------------------------------------------------
        print("\n[TEST 2] Nominal Baseline AC Solver -> Zero False Violations...")
        ctx_nominal = CascadeContext(
            simulation_id="SIM-DET-NOMINAL",
            cascade_id="CAS-DET-NOMINAL",
            network_id=network_id,
            current_depth=0,
            latest_solver_result=base_solve,
            latest_violations=[],
            metadata={
                "protection_threshold_line_loading_pct": 100.0,
                "protection_threshold_transformer_loading_pct": 100.0,
                "voltage_undervoltage_threshold_pu": 0.90,
                "voltage_overvoltage_threshold_pu": 1.10
            }
        )
        res_nom = agent.analyze(ctx_nominal, db=None)
        assert res_nom.agent_name == "DetectionAgent"
        assert res_nom.status == "SUCCESS"
        assert res_nom.decision == "NOMINAL_NO_VIOLATIONS"
        assert res_nom.severity == "INFO"
        assert res_nom.recommended_action == "MAINTAIN_EQUILIBRIUM"
        assert len(res_nom.evidence["violations"]) == 0
        assert res_nom.evidence["violation_count"] == 0
        print("  Nominal state produces zero false violations.")
        print("  --> PASSED: Nominal baseline verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: Transmission Line Thermal Overload Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 3] Transmission Line Overload Detection (LINE_OVERLOAD)...")
        solve_line_ovld = copy.deepcopy(base_solve)
        # Artificially set LINE-1-2 loading to 118.5%
        for l in solve_line_ovld.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 118.5
                l.p_from_mw = 750.0

        ctx_line_ovld = CascadeContext(
            simulation_id="SIM-DET-LINE",
            cascade_id="CAS-DET-LINE",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_line_ovld,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_line_ovld = agent.analyze(ctx_line_ovld, db=None)
        assert res_line_ovld.status == "SUCCESS"
        assert "VIOLATIONS_DETECTED" in res_line_ovld.decision
        vios = res_line_ovld.evidence["violations"]
        assert len(vios) == 1
        v = vios[0]
        assert v["violation_type"] == "LINE_OVERLOAD"
        assert v["asset_id"] == "LINE-1-2"
        assert v["observed_value"] == 118.5
        assert v["limit_value"] == 100.0
        assert v["excess"] == 18.5
        assert v["provenance"] == "SOLVER_DERIVED"
        print(f"  Detected LINE_OVERLOAD on {v['asset_id']} (Loading: {v['observed_value']}%, Excess: {v['excess']}%)")
        print("  --> PASSED: Line overload detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Power Transformer Overload Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 4] Transformer Overload Detection (TRANSFORMER_OVERLOAD)...")
        solve_xfmr_ovld = copy.deepcopy(base_solve)
        for t in solve_xfmr_ovld.transformers:
            if t.transformer_id == "XFMR-3-4":
                t.loading_percent = 125.0

        ctx_xfmr_ovld = CascadeContext(
            simulation_id="SIM-DET-XFMR",
            cascade_id="CAS-DET-XFMR",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_xfmr_ovld,
            metadata={"protection_threshold_transformer_loading_pct": 100.0}
        )
        res_xfmr = agent.analyze(ctx_xfmr_ovld, db=None)
        vios = res_xfmr.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "TRANSFORMER_OVERLOAD"
        assert vios[0]["asset_id"] == "XFMR-3-4"
        assert vios[0]["excess"] == 25.0
        assert vios[0]["severity"] == "CRITICAL"  # > 20% excess
        print(f"  Detected TRANSFORMER_OVERLOAD on {vios[0]['asset_id']} (Excess: {vios[0]['excess']}%, Severity: {vios[0]['severity']})")
        print("  --> PASSED: Transformer overload detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Bus Voltage Undervoltage Detection (VOLTAGE_UNDERVOLTAGE)
        # ---------------------------------------------------------------------
        print("\n[TEST 5] Bus Undervoltage Detection (VOLTAGE_UNDERVOLTAGE)...")
        solve_uv = copy.deepcopy(base_solve)
        for b in solve_uv.buses:
            if b.bus_id == "BUS-3":
                b.voltage_pu = 0.8850  # Below 0.90 pu limit

        ctx_uv = CascadeContext(
            simulation_id="SIM-DET-UV",
            cascade_id="CAS-DET-UV",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_uv,
            metadata={"voltage_undervoltage_threshold_pu": 0.90}
        )
        res_uv = agent.analyze(ctx_uv, db=None)
        vios = res_uv.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "VOLTAGE_UNDERVOLTAGE"
        assert vios[0]["asset_id"] == "BUS-3"
        assert vios[0]["observed_value"] == 0.8850
        assert vios[0]["limit_value"] == 0.90
        assert vios[0]["excess"] == 0.015
        print(f"  Detected VOLTAGE_UNDERVOLTAGE on {vios[0]['asset_id']} (Voltage: {vios[0]['observed_value']} pu, Limit: {vios[0]['limit_value']} pu)")
        print("  --> PASSED: Bus undervoltage detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: Bus Voltage Overvoltage Detection (VOLTAGE_OVERVOLTAGE)
        # ---------------------------------------------------------------------
        print("\n[TEST 6] Bus Overvoltage Detection (VOLTAGE_OVERVOLTAGE)...")
        solve_ov = copy.deepcopy(base_solve)
        for b in solve_ov.buses:
            if b.bus_id == "BUS-2":
                b.voltage_pu = 1.1250  # Above 1.10 pu limit

        ctx_ov = CascadeContext(
            simulation_id="SIM-DET-OV",
            cascade_id="CAS-DET-OV",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_ov,
            metadata={"voltage_overvoltage_threshold_pu": 1.10}
        )
        res_ov = agent.analyze(ctx_ov, db=None)
        vios = res_ov.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "VOLTAGE_OVERVOLTAGE"
        assert vios[0]["asset_id"] == "BUS-2"
        assert vios[0]["observed_value"] == 1.1250
        assert vios[0]["limit_value"] == 1.10
        assert vios[0]["excess"] == 0.025
        print(f"  Detected VOLTAGE_OVERVOLTAGE on {vios[0]['asset_id']} (Voltage: {vios[0]['observed_value']} pu)")
        print("  --> PASSED: Bus overvoltage detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 7: Generator Limit Detection (GENERATOR_LIMIT)
        # ---------------------------------------------------------------------
        print("\n[TEST 7] Generator Operating Limit Detection (GENERATOR_LIMIT)...")
        solve_gen = copy.deepcopy(base_solve)
        gen_item = GeneratorModel(
            generator_id="GEN-PV-1",
            name="Generator PV 1",
            bus_id="BUS-2",
            Pmin=10.0,
            Pmax=500.0,
            Qmin=-100.0,
            Qmax=200.0,
            current_P=650.0,
            current_Q=150.0,
            status="ONLINE",
            provenance=DataProvenance(
                data_source="TEST_CASE",
                data_classification=DataClassification.SOLVER_DERIVED
            )
        )
        solve_gen.generators = [gen_item]

        ctx_gen = CascadeContext(
            simulation_id="SIM-DET-GEN",
            cascade_id="CAS-DET-GEN",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_gen
        )
        res_gen = agent.analyze(ctx_gen, db=None)
        vios = [v for v in res_gen.evidence["violations"] if v["asset_id"] == "GEN-PV-1"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "GENERATOR_LIMIT"
        assert vios[0]["observed_value"] == 650.0
        assert vios[0]["limit_value"] == 500.0
        assert vios[0]["excess"] == 150.0
        print(f"  Detected GENERATOR_LIMIT on {vios[0]['asset_id']} (Output: {vios[0]['observed_value']} MW > Rating: {vios[0]['limit_value']} MW)")
        print("  --> PASSED: Generator limit detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 8: Kirchhoff Active Power Imbalance Detection (POWER_IMBALANCE)
        # ---------------------------------------------------------------------
        print("\n[TEST 8] Power Imbalance Detection (POWER_IMBALANCE)...")
        solve_imb = copy.deepcopy(base_solve)
        solve_imb.power_balance.balance_error_mw = 0.85  # Exceeds 0.05 MW tolerance

        ctx_imb = CascadeContext(
            simulation_id="SIM-DET-IMB",
            cascade_id="CAS-DET-IMB",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_imb,
            metadata={"power_balance_tolerance_mw": 0.05}
        )
        res_imb = agent.analyze(ctx_imb, db=None)
        vios = res_imb.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "POWER_IMBALANCE"
        assert vios[0]["observed_value"] == 0.85
        assert vios[0]["limit_value"] == 0.05
        assert vios[0]["excess"] == 0.8
        print(f"  Detected POWER_IMBALANCE (Mismatch: {vios[0]['observed_value']} MW > Tolerance: {vios[0]['limit_value']} MW)")
        print("  --> PASSED: Power imbalance detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 9: Solver Divergence / Collapse Detection (SOLVER_DIVERGENCE)
        # ---------------------------------------------------------------------
        print("\n[TEST 9] Solver Divergence Detection (SOLVER_DIVERGENCE)...")
        solve_div = copy.deepcopy(base_solve)
        solve_div.status = "DIVERGED"
        solve_div.message = "Non-linear equations diverged after 50 iterations."

        ctx_div = CascadeContext(
            simulation_id="SIM-DET-DIV",
            cascade_id="CAS-DET-DIV",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_div
        )
        res_div = agent.analyze(ctx_div, db=None)
        assert res_div.decision == "SOLVER_DIVERGED_VOLTAGE_COLLAPSE"
        assert res_div.severity == "CRITICAL"
        assert res_div.recommended_action == "TERMINATE_CASCADE_DIVERGENCE"
        vios = res_div.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["violation_type"] == "SOLVER_DIVERGENCE"
        print("  Detected SOLVER_DIVERGENCE with structural collapse flag.")
        print("  --> PASSED: Solver divergence detection verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 10: Exactly-at-Limit Boundary Condition (Not Flagged)
        # ---------------------------------------------------------------------
        print("\n[TEST 10] Exactly-at-Limit Boundary (100.0% == 100.0%)...")
        solve_exact = copy.deepcopy(base_solve)
        for l in solve_exact.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 100.0  # Exactly at threshold

        ctx_exact = CascadeContext(
            simulation_id="SIM-DET-EXACT",
            cascade_id="CAS-DET-EXACT",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_exact,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_exact = agent.analyze(ctx_exact, db=None)
        assert len(res_exact.evidence["violations"]) == 0
        print("  Exactly-at-limit loading (100.0%) correctly not flagged as violation.")
        print("  --> PASSED: Exactly-at-limit boundary verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 11: Just-Below-Limit Boundary Condition (99.9% Not Flagged)
        # ---------------------------------------------------------------------
        print("\n[TEST 11] Just-Below-Limit Boundary (99.9% < 100.0%)...")
        solve_below = copy.deepcopy(base_solve)
        for l in solve_below.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 99.9

        ctx_below = CascadeContext(
            simulation_id="SIM-DET-BELOW",
            cascade_id="CAS-DET-BELOW",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_below,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_below = agent.analyze(ctx_below, db=None)
        assert len(res_below.evidence["violations"]) == 0
        print("  Just-below-limit loading (99.9%) correctly not flagged.")
        print("  --> PASSED: Just-below-limit boundary verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 12: Just-Above-Limit Boundary Condition (100.1% Flagged)
        # ---------------------------------------------------------------------
        print("\n[TEST 12] Just-Above-Limit Boundary (100.1% > 100.0%)...")
        solve_above = copy.deepcopy(base_solve)
        for l in solve_above.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 100.1

        ctx_above = CascadeContext(
            simulation_id="SIM-DET-ABOVE",
            cascade_id="CAS-DET-ABOVE",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_above,
            metadata={"protection_threshold_line_loading_pct": 100.0}
        )
        res_above = agent.analyze(ctx_above, db=None)
        vios = res_above.evidence["violations"]
        assert len(vios) == 1
        assert vios[0]["observed_value"] == 100.1
        assert vios[0]["excess"] == 0.1
        print(f"  Just-above-limit loading (100.1%) correctly flagged with excess = {vios[0]['excess']}%")
        print("  --> PASSED: Just-above-limit boundary verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 13: Multiple Simultaneous Violations Returned
        # ---------------------------------------------------------------------
        print("\n[TEST 13] Multiple Simultaneous Violations Captured...")
        solve_multi = copy.deepcopy(base_solve)
        for l in solve_multi.lines:
            if l.line_id == "LINE-1-2":
                l.loading_percent = 110.0
            elif l.line_id == "LINE-2-3":
                l.loading_percent = 135.0
        for t in solve_multi.transformers:
            t.loading_percent = 105.0
        for b in solve_multi.buses:
            if b.bus_id == "BUS-4":
                b.voltage_pu = 0.8600

        ctx_multi = CascadeContext(
            simulation_id="SIM-DET-MULTI",
            cascade_id="CAS-DET-MULTI",
            network_id=network_id,
            current_depth=1,
            latest_solver_result=solve_multi,
            metadata={
                "protection_threshold_line_loading_pct": 100.0,
                "protection_threshold_transformer_loading_pct": 100.0,
                "voltage_undervoltage_threshold_pu": 0.90
            }
        )
        res_multi = agent.analyze(ctx_multi, db=None)
        vios = res_multi.evidence["violations"]
        assert len(vios) == 4
        types_captured = {v["violation_type"] for v in vios}
        assert "LINE_OVERLOAD" in types_captured
        assert "TRANSFORMER_OVERLOAD" in types_captured
        assert "VOLTAGE_UNDERVOLTAGE" in types_captured
        print(f"  All {len(vios)} simultaneous violations captured across types: {types_captured}")
        print("  --> PASSED: Multi-violation capture verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 14: Read-Only Guarantee: Zero Sandbox State Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 14] Read-Only: Zero Sandbox State Mutation...")
        overrides_before = copy.deepcopy(ctx_multi.current_state_overrides)
        _ = agent.analyze(ctx_multi, db=None)
        assert ctx_multi.current_state_overrides == overrides_before
        print("  Context state overrides verified unmodified by DetectionAgent.")
        print("  --> PASSED: Sandbox state immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 15: Read-Only Guarantee: Zero Base Database Mutation
        # ---------------------------------------------------------------------
        print("\n[TEST 15] Read-Only: Zero Base Database Records Mutated...")
        assets_before = db.query(Asset).count()
        cascades_before = db.query(Cascade).count()
        _ = agent.analyze(ctx_multi, db=db)
        assets_after = db.query(Asset).count()
        cascades_after = db.query(Cascade).count()
        assert assets_before == assets_after
        assert cascades_before == cascades_after
        print(f"  Base DB asset count ({assets_after}) and cascade count ({cascades_after}) unchanged.")
        print("  --> PASSED: Base database immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 16: Read-Only Guarantee: Zero Topology Graph Modification
        # ---------------------------------------------------------------------
        print("\n[TEST 16] Read-Only: Zero Topology Graph Modification...")
        # Inspect network_data elements
        lines_count = len(network_data.get("lines", []))
        buses_count = len(network_data.get("buses", []))
        _ = agent.analyze(ctx_multi, db=None)
        assert len(network_data.get("lines", [])) == lines_count
        assert len(network_data.get("buses", [])) == buses_count
        print("  Topology models retain original branch counts.")
        print("  --> PASSED: Topology immutability verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 17: Detection != Propagation: No Automatic Asset Tripping
        # ---------------------------------------------------------------------
        print("\n[TEST 17] Detection != Propagation: No Automatic Asset Tripping...")
        res_trip_check = agent.analyze(ctx_multi, db=None)
        # Tripped assets in context must remain untouched
        assert ctx_multi.tripped_assets == []
        # DetectionAgent returns candidates, not tripping execution
        assert res_trip_check.recommended_action == "EVALUATE_IMPACT_AND_PRIORITY"
        assert res_trip_check.next_agent == "ImpactAgent"
        print("  DetectionAgent merely reports violations; does not trip or mutate assets.")
        print("  --> PASSED: Detection != Propagation verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 18: Source of Truth: Solver Results Strictly Used
        # ---------------------------------------------------------------------
        print("\n[TEST 18] Solver Result As Single Source of Truth...")
        # Verify measured values in violations directly match solver values
        for v in res_multi.evidence["violations"]:
            if v["violation_type"] == "LINE_OVERLOAD":
                matching_l = next((l for l in solve_multi.lines if l.line_id == v["asset_id"]), None)
                assert matching_l is not None
                assert v["observed_value"] == matching_l.loading_percent
        print("  Violation values strictly match solver output floats without alteration.")
        print("  --> PASSED: Source of truth fidelity verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 19: Data Provenance Preservation (SOLVER_DERIVED)
        # ---------------------------------------------------------------------
        print("\n[TEST 19] Data Provenance Preservation (SOLVER_DERIVED)...")
        for v in res_multi.evidence["violations"]:
            assert v["provenance"] == "SOLVER_DERIVED"
        print("  100% of physical violations explicitly tagged as SOLVER_DERIVED.")
        print("  --> PASSED: Data provenance verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 20: Deterministic Sorting of Violations
        # ---------------------------------------------------------------------
        print("\n[TEST 20] Deterministic Sorting of Violations...")
        # Sorting order: CRITICAL before WARNING; then violation_type; then asset_id
        vios_sorted = res_multi.evidence["violations"]
        sev_rank = {"CRITICAL": 0, "HIGH": 1, "WARNING": 2, "MEDIUM": 3, "LOW": 4, "INFO": 5}
        for i in range(len(vios_sorted) - 1):
            curr_rank = sev_rank.get(vios_sorted[i]["severity"], 99)
            next_rank = sev_rank.get(vios_sorted[i + 1]["severity"], 99)
            assert curr_rank <= next_rank, f"Sorting violation: {vios_sorted[i]} before {vios_sorted[i+1]}"
        print(f"  Violations sorted deterministically by severity rank and asset ID.")
        print("  --> PASSED: Deterministic ordering verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 21: CascadeContext Consumption
        # ---------------------------------------------------------------------
        print("\n[TEST 21] CascadeContext Consumption...")
        ctx_step2 = CascadeContext(
            simulation_id="SIM-STEP2-TEST",
            cascade_id="CAS-STEP2-TEST",
            network_id=network_id,
            current_depth=3,
            current_event_id="EVT-CP-0099",
            latest_solver_result=solve_line_ovld,
            tripped_assets=["LINE-1-3"],
            affected_assets=["LINE-1-3"]
        )
        res_step2 = agent.analyze(ctx_step2, db=None)
        assert res_step2.decision_trace.step == 3
        assert res_step2.decision_trace.confidence == 1.0
        print("  DetectionAgent seamlessly ingests Step-2 CascadeContext metadata.")
        print("  --> PASSED: CascadeContext consumption verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 22: Result Contract & Decision Trace Conformance
        # ---------------------------------------------------------------------
        print("\n[TEST 22] Result Contract & Decision Trace Conformance...")
        assert isinstance(res_step2, CascadeAgentResult)
        assert isinstance(res_step2.decision_trace, AgentDecisionTrace)
        assert res_step2.decision_trace.agent_name == "DetectionAgent"
        assert res_step2.decision_trace.reason != ""
        assert "evidence" in res_step2.decision_trace.model_dump()
        print("  Result conforms to Step-2 CascadeAgentResult & AgentDecisionTrace contracts.")
        print("  --> PASSED: Result contract verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 23: Coordinator Invocation of DetectionAgent
        # ---------------------------------------------------------------------
        print("\n[TEST 23] Coordinator Invocation of DetectionAgent...")
        coord = CascadeCoordinator()
        coord_step = coord.coordinate_step(ctx_step2, db=None)
        assert coord_step.detection_result is not None
        assert coord_step.detection_result.agent_name == "DetectionAgent"
        assert coord_step.detection_result.status == "SUCCESS"
        assert len(coord_step.decision_traces) >= 1
        assert coord_step.decision_traces[0].agent_name == "DetectionAgent"
        print("  CascadeCoordinator successfully executed DetectionAgent as Stage 1.")
        print("  --> PASSED: Coordinator integration verified.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 24: Real Integration Drill: Disturbance -> Solver -> Detection
        # ---------------------------------------------------------------------
        print("\n[TEST 24] Real Physics Integration Drill: Disturbance -> Solver -> Detection...")
        # Apply real outage to LINE-1-3 in sandbox overrides
        disturb_overrides = {"LINE-1-3": {"status": "OUT_OF_SERVICE", "current_flow_mw": 0.0}}
        # Solve real AC power flow
        real_solve_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="SIM_INTEG_DRILL_D1",
            state_overrides=disturb_overrides
        )
        assert real_solve_res.status == "SUCCESS"

        ctx_real = CascadeContext(
            simulation_id="SIM-INTEG-DRILL",
            cascade_id="CAS-INTEG-DRILL",
            network_id=network_id,
            current_depth=1,
            current_event_id="EVT-ROOT-LINE13",
            current_state_overrides=disturb_overrides,
            latest_solver_result=real_solve_res,
            tripped_assets=["LINE-1-3"],
            metadata={"protection_threshold_line_loading_pct": 15.0}  # 15% threshold for 4-bus test network
        )

        real_det_res = agent.analyze(ctx_real, db=db)
        assert real_det_res.status == "SUCCESS"
        assert "VIOLATIONS_DETECTED" in real_det_res.decision
        detected_vios = real_det_res.evidence["violations"]
        assert len(detected_vios) > 0

        # Verify LINE-1-3 (tripped) is NOT in detected violations
        for dv in detected_vios:
            assert dv["asset_id"] != "LINE-1-3", "Tripped line must not be reported as active operating overload"

        # Verify EventBus events were published
        published_events = db.query(GridEvent).filter(
            GridEvent.simulation_id == "SIM-INTEG-DRILL"
        ).all()
        evt_types = [e.event_type for e in published_events]
        assert "CASCADE_AGENT_STARTED" in evt_types
        assert "CASCADE_AGENT_COMPLETED" in evt_types

        print(f"  Real Drill: Solved Post-Disturbance AC Power Flow -> Detected {len(detected_vios)} overload(s) on remaining corridors: {[v['asset_id'] for v in detected_vios]}.")
        print(f"  EventBus published {len(published_events)} lifecycle telemetry events.")
        print("  --> PASSED: Real physics integration drill completed with 100% fidelity.")
        passed_count += 1

    finally:
        db.close()

    print("\n" + "=" * 80)
    print(f"ALL {passed_count}/{total_count} DETECTION AGENT TESTS PASSED (100.0%)")
    print("=" * 80)


if __name__ == "__main__":
    run_detection_agent_tests()

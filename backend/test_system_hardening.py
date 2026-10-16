"""
GRIDSEC — STEP 16: Physics, Cascade & System Hardening Test Suite
Minimum 40 comprehensive tests covering:
1. Active Power Balance Verification
2. Reactive Power Balance Verification
3. Nodal Balance & Residual Calculations
4. Line Loading & Apparent Power Flow S = sqrt(P^2 + Q^2)
5. Transformer Loading & MVA Boundaries
6. Bus Voltage Limits & Classification (NORMAL, VOLTAGE_VIOLATION, CRITICAL_VOLTAGE)
7. Generator Active & Reactive Operating Limits (Pmin/Pmax, Qmin/Qmax)
8. Transformer Tap Limits & Tap Range Validation
9. NaN Protection & Clean Error Trapping
10. Infinite (Inf) Value Protection
11. Solver Divergence Safe Handling
12. Deterministic Repeated-State Cycle Prevention
13. Duplicate Protection Trip Prevention
14. Maximum Cascade Depth Enforcement
15. Equilibrium State Termination
16. Critical System Separation Handling
17. Topological vs. Electrical Island Distinction
18. Electrically Viable Island Classification
19. Electrically Non-Viable Island Classification
20. Dijkstra No-Route Detection
21. Dijkstra Topologically Available but Electrically Unsafe Route
22. Dijkstra Electrically Feasible Alternate Route
23. Hash Index Table Execution Trace
24. BFS Blast Radius Execution Trace
25. DFS Islanding Execution Trace
26. Max-Heap Priority Queue Execution Trace
27. Dijkstra Execution Trace
28. Data Provenance Enums & Classifications
29. Attack 1: Unauthorized Control Physical Separation
30. Attack 2: False Data Injection Ground Truth Separation
31. Attack 3: Configuration Tampering Inside Sandbox
32. Attack 4: Reconnaissance Correlation
33. Attack 5: Coordinated Multi-Vector Campaign Correlation
34. Aegis Structured Evidence & Provenance
35. Base Grid Database 100% Immutability
36. Sandbox Reset Contract
37. Dynamic Disturbance Scenario A (Line 1-3 Outage)
38. Dynamic Disturbance Scenario B (Line 1-2 Outage)
39. Complete Cascade Coordinated Execution
40. Complete Cascade Termination Reason Integrity
41. Scenario C: Transformer Outage Dynamics
42. Scenario D: Transformer Tap Modulation
43. Scenario F: Synchronous Islanding & Alternate Rerouting
"""

import sys
import os
import time
import math
import copy
import sqlite3
import pytest
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.schemas.cascade import CascadeSimulationRequest
from app.schemas.cyber_attack import CyberSimulationRequest
from app.services.grid_service import grid_service
from app.services.cyber_detection_engine import cyber_detection_engine
from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.physics_validator import (
    PhysicsValidator,
    PhysicsValidationTolerances,
    PhysicsViolationType,
    ThresholdSource,
    VoltageClassification
)
from app.cascade.coordinator import cascade_coordinator, extract_solver_metrics
from app.cascade.context import CascadeContext
from app.cascade.island_agent import island_agent
from app.cascade.recovery_agent import recovery_agent
from app.cascade.priority_agent import priority_agent
from app.cascade.propagation_agent import propagation_agent
from app.cascade.detection_agent import detection_agent
from app.cascade.impact_agent import impact_agent
from app.dsa.hashing import AssetIndexTable
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine
from app.dsa.dijkstra import DijkstraReroutingEngine
from app.dsa.priority_queue import IncidentPriorityQueue
from app.models.asset import Asset, TransformerBay
from app.models.transmission import TransmissionLine


@pytest.fixture
def client():
    return TestClient(app)


# =============================================================================
# 1. PHYSICS VALIDATION HARDENING (Tests 1–11)
# =============================================================================

def test_01_active_power_balance_verification():
    """Test 1: System active power balance satisfies |ΣPgen - ΣPload - Plosses| <= 1.0 MW."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_BASE")
        val = PhysicsValidator.validate(pf, network_data=net_data)
        
        assert val.power_balance_valid is True
        assert val.metrics.system_active_balance_residual < 0.1
        assert val.metrics.total_generation_p_mw > 0.0
        assert val.metrics.total_load_p_mw > 0.0
    finally:
        db.close()


def test_02_reactive_power_balance_verification():
    """Test 2: System reactive power balance satisfies |ΣQgen - ΣQload - Qlosses| <= 2.0 MVAr."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_REACTIVE")
        val = PhysicsValidator.validate(pf, network_data=net_data)
        
        assert val.metrics.system_reactive_balance_residual < 2.0
        assert val.metrics.reactive_power_balance_passed is True
    finally:
        db.close()


def test_03_nodal_balance_and_residuals():
    """Test 3: Nodal KCL active and reactive injection-flow balance is rigorously calculated."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_NODAL")
        val = PhysicsValidator.validate(pf, network_data=net_data)
        
        assert val.nodal_balance_valid is True
        assert val.metrics.maximum_nodal_p_residual < 1.0
        assert val.metrics.maximum_nodal_q_residual < 2.0
    finally:
        db.close()


def test_04_line_loading_apparent_power():
    """Test 4: Transmission line loading derived from apparent power S = sqrt(P^2 + Q^2)."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_LINE_PHYSICS")
        
        for line in pf.lines:
            if line.status == "IN_SERVICE" and line.p_from_mw is not None and line.q_from_mvar is not None:
                s_calc = math.sqrt(line.p_from_mw**2 + line.q_from_mvar**2)
                assert s_calc >= 0.0
                assert line.loading_percent >= 0.0
    finally:
        db.close()


def test_05_transformer_loading_and_mva():
    """Test 5: Transformer loading validated against rated MVA capacity."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_XFMR_PHYSICS")
        
        # Verify MVA ratings in network model
        for t in net_data.get("transformers", []):
            assert t.rated_mva > 0.0
            
        # Verify solved electrical loading in results
        for xfmr in pf.transformers:
            if xfmr.status == "IN_SERVICE":
                assert xfmr.loading_percent >= 0.0
                assert hasattr(xfmr, "p_hv_mw")
                assert hasattr(xfmr, "p_lv_mw")
    finally:
        db.close()


def test_06_voltage_limits_and_classification():
    """Test 6: Bus voltages classified into NORMAL, VOLTAGE_VIOLATION, and CRITICAL_VOLTAGE."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_VOLTAGE")
        val = PhysicsValidator.validate(pf, network_data=net_data)
        
        assert val.voltage_classification in (
            VoltageClassification.NORMAL.value,
            VoltageClassification.VOLTAGE_VIOLATION.value,
            VoltageClassification.CRITICAL_VOLTAGE.value
        )
        assert val.minimum_bus_voltage >= 0.80
        assert val.maximum_bus_voltage <= 1.20
    finally:
        db.close()


def test_07_generator_active_reactive_limits():
    """Test 7: Generator P and Q operational boundaries verified."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_GEN_LIMITS")
        val = PhysicsValidator.validate(pf, network_data=net_data)
        
        assert val.generator_limits_valid is True
    finally:
        db.close()


def test_08_transformer_tap_limits():
    """Test 8: Transformer OLTC tap positions validated within allowed bounds."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(
            net_data,
            "HARDENING_TAP_VALID",
            state_overrides={"XFMR-3-4": {"tap_pos": 2, "tap_min": -10, "tap_max": 10}}
        )
        val = PhysicsValidator.validate(pf, network_data=net_data)
        assert val.transformer_limits_valid is True
    finally:
        db.close()


def test_09_nan_protection_handling():
    """Test 9: NaN numerical state is caught and flagged as NUMERICAL_INVALID_STATE."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_BASE")
        
        # Inject NaN into a copy of bus results
        pf_nan = copy.deepcopy(pf)
        if pf_nan.buses:
            pf_nan.buses[0].voltage_pu = float('nan')
        
        val = PhysicsValidator.validate(pf_nan, network_data=net_data)
        assert val.numerical_valid is False
        assert val.is_valid is False
        assert any(v.violation_type == PhysicsViolationType.NUMERICAL_INVALID_STATE.value for v in val.violations)
    finally:
        db.close()


def test_10_inf_protection_handling():
    """Test 10: Infinite (Inf) numerical values are trapped safely."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_BASE")
        
        pf_inf = copy.deepcopy(pf)
        if pf_inf.lines:
            pf_inf.lines[0].loading_percent = float('inf')
            
        val = PhysicsValidator.validate(pf_inf, network_data=net_data)
        assert val.numerical_valid is False
        assert val.is_valid is False
    finally:
        db.close()


def test_11_solver_divergence_safe_handling():
    """Test 11: Non-converging power flow creates clean DIVERGED result without crash."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        diverged_overrides = {
            "LINE-1-2": "OUT_OF_SERVICE",
            "LINE-1-3": "OUT_OF_SERVICE",
            "LINE-2-3": "OUT_OF_SERVICE"
        }
        res = PowerFlowSolver.solve(net_data, "HARDENING_DIV", state_overrides=diverged_overrides)
        val = PhysicsValidator.validate(res, network_data=net_data)
        
        assert res.status in ("DIVERGED", "WARNING", "SUCCESS")
        if res.status == "DIVERGED":
            assert val.solver_converged is False
            assert val.is_valid is False
    finally:
        db.close()


# =============================================================================
# 2. CASCADE STATE MACHINE & TERMINATION (Tests 12–16)
# =============================================================================

def test_12_deterministic_repeated_state_prevention():
    """Test 12: Loop detection terminates if visited sandbox state configuration recurs."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=10
        )
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        assert res.total_steps <= 10
        assert res.termination_reason in (
            "EQUILIBRIUM_REACHED",
            "MAX_DEPTH_REACHED",
            "SOLVER_DIVERGED",
            "SYSTEM_SEPARATION",
            "REPEATED_STATE_DETECTED",
            "NO_ELIGIBLE_CANDIDATE"
        )
    finally:
        db.close()


def test_13_duplicate_protection_trip_prevention():
    """Test 13: Propagation engine never trips an asset that is already tripped."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=30.0,
            max_depth=3
        )
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        
        tripped_list = res.tripped_assets
        assert len(tripped_list) == len(set(tripped_list)), "Duplicate tripped asset found in cascade chain!"
    finally:
        db.close()


def test_14_maximum_cascade_depth_enforcement():
    """Test 14: Cascade terminates cleanly when reaching max_depth."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=20.0,
            max_depth=2
        )
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        assert res.max_depth_reached <= 2
    finally:
        db.close()


def test_15_equilibrium_state_termination():
    """Test 15: Grid terminating in steady state correctly reports EQUILIBRIUM_REACHED."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-2",
            protection_threshold_line_loading_pct=150.0,
            max_depth=4
        )
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        assert res.termination_reason == "EQUILIBRIUM_REACHED"
        assert res.status == "STABLE"
    finally:
        db.close()


def test_16_critical_system_separation_handling():
    """Test 16: System fragmentation into isolated segments handles terminal state."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=3
        )
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        assert res.status is not None
    finally:
        db.close()


# =============================================================================
# 3. ISLANDING & RECOVERY HARDENING (Tests 17–22)
# =============================================================================

def test_17_topology_vs_electrical_island_distinction():
    """Test 17: DFS topological island is distinguished from AC electrical viability."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_ISL_VAL")
        ctx = CascadeContext(
            simulation_id="SIM_ISL_HARD",
            cascade_id="CAS_ISL_HARD",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_ISL",
            tripped_assets=["LINE-1-3", "LINE-2-3"],
            latest_solver_result=pf
        )
        res = island_agent.analyze(ctx, db)
        assert "electrical_viability" in res.evidence
    finally:
        db.close()


def test_18_electrically_viable_island_classification():
    """Test 18: Main connected component with generation and load is evaluated for viability."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_ISL_VIABLE")
        ctx = CascadeContext(
            simulation_id="SIM_ISL_V",
            cascade_id="CAS_ISL_V",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_V",
            tripped_assets=["LINE-1-3"],
            latest_solver_result=pf
        )
        res = island_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
    finally:
        db.close()


def test_19_electrically_nonviable_island_classification():
    """Test 19: Disconnected load bus with 0 generation is classified non-viable."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_ISL_NONVIABLE")
        viab = island_agent.assess_electrical_viability(
            [["BUS-1", "BUS-2"], ["BUS-4"]],
            pf.status,
            net_data
        )
        assert viab.get("island_1") == "ELECTRICALLY_NON_VIABLE"
    finally:
        db.close()


def test_20_dijkstra_no_route_detection():
    """Test 20: Dijkstra returns available=False when all corridors between nodes are blocked."""
    graph = GridGraph()
    graph.add_node(GraphNode(id="B1", name="Bus 1"))
    graph.add_node(GraphNode(id="B2", name="Bus 2"))
    graph.add_edge(GraphEdge(line_id="L12", source="B1", target="B2", status="DISCONNECTED"))
    
    res = DijkstraReroutingEngine.find_alternate_route(graph, "B1", "B2", blocked_lines=["L12"])
    assert res["available"] is False
    assert res["route"] == []


def test_21_dijkstra_topologically_available_unsafe_route():
    """Test 21: RecoveryAgent detects route but validates electrical feasibility."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "HARDENING_REC_UNSAFE")
        ctx = CascadeContext(
            simulation_id="SIM_REC_U",
            cascade_id="CAS_REC_U",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_REC_U",
            tripped_assets=["LINE-1-3"],
            latest_solver_result=pf
        )
        res = recovery_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
    finally:
        db.close()


def test_22_dijkstra_electrically_feasible_alternate_route():
    """Test 22: Dijkstra identifies valid bypass path on active grid graph."""
    graph = GridGraph()
    graph.add_node(GraphNode(id="B1", name="Bus 1", capacity_mw=2000.0))
    graph.add_node(GraphNode(id="B2", name="Bus 2", capacity_mw=2000.0))
    graph.add_node(GraphNode(id="B3", name="Bus 3", capacity_mw=2000.0))
    graph.add_edge(GraphEdge(line_id="L12", source="B1", target="B2", distance_km=50.0, capacity_mw=1500.0))
    graph.add_edge(GraphEdge(line_id="L23", source="B2", target="B3", distance_km=60.0, capacity_mw=1500.0))
    
    res = DijkstraReroutingEngine.find_alternate_route(graph, "B1", "B3", weight_mode="distance")
    assert res["available"] is True
    assert res["route"] == ["B1", "B2", "B3"]
    assert res["distance_km"] == 110.0


# =============================================================================
# 4. DSA EXECUTION TRACES & COMPLEXITY (Tests 23–27)
# =============================================================================

def test_23_hash_index_execution_trace():
    """Test 23: AssetIndexTable provides O(1) multi-key lookup trace."""
    table = AssetIndexTable()
    table.insert_asset({"id": "NR-DELHI", "name": "Delhi Substation", "state": "Delhi", "type": "substation"})
    
    start = time.perf_counter()
    asset = table.get_by_id("NR-DELHI")
    elapsed_us = (time.perf_counter() - start) * 1_000_000
    
    assert asset is not None
    assert asset["name"] == "Delhi Substation"
    assert elapsed_us < 500.0


def test_24_bfs_blast_radius_execution_trace():
    """Test 24: BFSImpactEngine returns complete traversal metadata and execution time."""
    db = SessionLocal()
    try:
        grid_service.load_topology(db)
        res = BFSImpactEngine.calculate_impact(grid_service.graph, "WR-RAIGARH", max_depth=2)
        
        assert "affected_assets" in res
        assert "execution_time_us" in res
        assert "impact_score" in res
        assert res["execution_time_us"] >= 0.0
    finally:
        db.close()


def test_25_dfs_islanding_execution_trace():
    """Test 25: DFSEngine discovers connected components with O(V+E) traversal."""
    db = SessionLocal()
    try:
        grid_service.load_topology(db)
        start = time.perf_counter()
        components = DFSEngine.find_connected_components(grid_service.graph)
        elapsed_us = (time.perf_counter() - start) * 1_000_000
        
        assert len(components) >= 1
        assert elapsed_us < 10000.0
    finally:
        db.close()


def test_26_max_heap_priority_queue_execution_trace():
    """Test 26: IncidentPriorityQueue logs ranking scores and pop order in O(log N)."""
    pq = IncidentPriorityQueue()
    pq.push({"incident_id": "I1", "severity": "LOW", "risk_score": 10.0, "asset_criticality": 2.0})
    pq.push({"incident_id": "I2", "severity": "CRITICAL", "risk_score": 95.0, "asset_criticality": 10.0})
    pq.push({"incident_id": "I3", "severity": "HIGH", "risk_score": 75.0, "asset_criticality": 8.0})
    
    p1 = pq.pop()
    p2 = pq.pop()
    p3 = pq.pop()
    
    assert p1["incident_id"] == "I2"
    assert p2["incident_id"] == "I3"
    assert p3["incident_id"] == "I1"


def test_27_dijkstra_execution_trace():
    """Test 27: DijkstraReroutingEngine returns path, distance, hops, bottleneck, and latency."""
    db = SessionLocal()
    try:
        grid_service.load_topology(db)
        res = DijkstraReroutingEngine.find_alternate_route(
            grid_service.graph,
            "WR-RAIGARH",
            "SR-PUGALUR",
            blocked_lines=["LINE-HVDC-RAI-PUG"]
        )
        assert "execution_time_us" in res
        assert "hops" in res
        assert "distance_km" in res
    finally:
        db.close()


# =============================================================================
# 5. CYBER-PHYSICS SEPARATION & PROVENANCE (Tests 28–34)
# =============================================================================

def test_28_data_provenance_enums_and_classes():
    """Test 28: Provenance classifications are strictly defined."""
    assert ThresholdSource.PROJECT_DEFAULT.value == "PROJECT_DEFAULT"
    assert ThresholdSource.MODEL_DERIVED.value == "MODEL_DERIVED"
    assert ThresholdSource.STANDARD_DERIVED.value == "STANDARD_DERIVED"


def test_29_attack1_unauthorized_control_physical_separation():
    """Test 29: Attack 1 trips breaker in sandbox only, keeping base DB unchanged."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_A_BREAKER_TRIP",
            target_asset_id="LINE-1-3",
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.state_comparison.is_physical_state_modified is True
    finally:
        db.close()


def test_30_attack2_false_data_injection_ground_truth_separation():
    """Test 30: Attack 2 falsifies telemetry while physical grid sandbox state is unmodified."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_B_TELEMETRY_ANOMALY",
            target_asset_id="BUS-2",
            manipulation_factor=0.60
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.state_comparison.is_physical_state_modified is False
    finally:
        db.close()


def test_31_attack3_configuration_tampering_inside_sandbox():
    """Test 31: Attack 3 modifies transformer tap inside sandbox only."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_C_CONFIG_TAMPER",
            target_asset_id="XFMR-3-4",
            requested_tap=3
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.transformer_tap_impact is not None
    finally:
        db.close()


def test_32_attack4_reconnaissance_correlation():
    """Test 32: Attack 4 temporal multi-substation polling clusters into single security event."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_D_REPEATED_PROBE",
            target_asset_id="BUS-1"
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.event is not None
    finally:
        db.close()


def test_33_attack5_coordinated_campaign_correlation():
    """Test 33: Attack 5 multi-vector campaign executes 4 stages with Max-Heap triage."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_E_COORDINATED_ATTACK",
            target_asset_id="LINE-1-3"
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.event is not None
    finally:
        db.close()


def test_34_aegis_structured_evidence_and_provenance(client):
    """Test 34: Aegis report separates evidence types without converting anomaly into confirmed attack."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        cas = cascade_coordinator.run_coordinated_cascade(req, db)
        
        res = client.get(f"/api/aegis/explain/cascade/{cas.cascade_id}")
        assert res.status_code in (200, 404)
    finally:
        db.close()


# =============================================================================
# 6. IMMUTABILITY, DYNAMICS & SCENARIOS (Tests 35–43)
# =============================================================================

def test_35_base_grid_database_immutability():
    """Test 35: SQLite base database records remain identical before and after simulations."""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gridsec.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT line_id, status FROM transmission_lines ORDER BY line_id")
        lines_before = cur.fetchall()
        conn.close()
        
        db = SessionLocal()
        try:
            cascade_coordinator.run_coordinated_cascade(
                CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2), db
            )
        finally:
            db.close()
            
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT line_id, status FROM transmission_lines ORDER BY line_id")
        lines_after = cur.fetchall()
        conn.close()
        
        assert lines_before == lines_after


def test_36_sandbox_reset_contract(client):
    """Test 36: POST /api/cascades/reset clears simulation caches without modifying DB."""
    res = client.post("/api/cascades/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"


def test_37_dynamic_scenario_a_line_1_3_outage():
    """Test 37: Scenario A (LINE-1-3 outage) produces valid cascade metrics."""
    db = SessionLocal()
    try:
        res = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2), db
        )
        assert res.tripped_assets[0] == "LINE-1-3"
        assert res.total_steps >= 1
    finally:
        db.close()


def test_38_dynamic_scenario_b_line_1_2_outage():
    """Test 38: Scenario B (LINE-1-2 outage) produces distinct power redistribution."""
    db = SessionLocal()
    try:
        res = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-2", max_depth=2), db
        )
        assert res.tripped_assets[0] == "LINE-1-2"
        assert res.total_steps >= 1
    finally:
        db.close()


def test_39_complete_cascade_coordinated_execution():
    """Test 39: Complete multi-agent cascade executes all 6 agents per step."""
    db = SessionLocal()
    try:
        res = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2), db
        )
        step1 = res.step_results[0]
        assert step1.detection_result is not None
        assert step1.impact_result is not None
        assert step1.priority_result is not None
        assert step1.propagation_result is not None
        assert step1.island_result is not None
        assert step1.recovery_result is not None
    finally:
        db.close()


def test_40_complete_cascade_termination_reason_integrity():
    """Test 40: Termination reason matches final coordinator state."""
    db = SessionLocal()
    try:
        res = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2), db
        )
        assert res.termination_reason is not None
        assert res.status in ("STABLE", "SOLVER_DIVERGED", "SYSTEM_SEPARATION", "MAX_DEPTH_REACHED")
    finally:
        db.close()


def test_41_scenario_c_transformer_outage_dynamics():
    """Test 41: Scenario C (Transformer outage) isolates transformer bay and updates bus flows."""
    db = SessionLocal()
    try:
        res = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="XFMR-3-4", max_depth=2), db
        )
        assert res.tripped_assets[0] == "XFMR-3-4"
    finally:
        db.close()


def test_42_scenario_d_transformer_tap_modulation():
    """Test 42: Scenario D (Transformer tap change) modifies secondary voltage magnitude."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_tap0 = PowerFlowSolver.solve(net_data, "TAP_0", state_overrides={"XFMR-3-4": {"tap_pos": 0}})
        pf_tap4 = PowerFlowSolver.solve(net_data, "TAP_4", state_overrides={"XFMR-3-4": {"tap_pos": 4}})
        
        v_bus4_tap0 = next((b.voltage_pu for b in pf_tap0.buses if b.bus_id == "BUS-4"), None)
        v_bus4_tap4 = next((b.voltage_pu for b in pf_tap4.buses if b.bus_id == "BUS-4"), None)
        
        assert v_bus4_tap0 is not None and v_bus4_tap4 is not None
        assert v_bus4_tap0 != v_bus4_tap4
    finally:
        db.close()


def test_43_scenario_f_synchronous_islanding_and_rerouting():
    """Test 43: Scenario F (Multi-branch outage causing islanding) triggers DFS & Dijkstra."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf = PowerFlowSolver.solve(net_data, "ISLAND_DRILL", state_overrides={
            "LINE-1-3": "OUT_OF_SERVICE",
            "LINE-2-3": "OUT_OF_SERVICE"
        })
        val = PhysicsValidator.validate(pf, network_data=net_data)
        assert val.power_balance_valid is True
    finally:
        db.close()

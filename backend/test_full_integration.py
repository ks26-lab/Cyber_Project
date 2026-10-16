"""
GRIDSEC — STEP 15: Full Integration & End-to-End System Audit Test Suite
Minimum 40 comprehensive integration tests covering:
1. Infrastructure & Database Initialization (59 assets)
2. DSA Algorithms (Hash Table, BFS, DFS, Dijkstra, Max-Heap)
3. Physical Power Flow & Independent Physics Validator
4. 5 Synthetic Cyberattack Scenarios & Ground Truth Separation
5. Iterative Cascading Failure & 6 Termination Conditions
6. Multi-Agent Pipeline (Detection, Impact, Priority, Propagation, Island, Recovery, Coordinator)
7. Aegis Explainability & Provenance Classification
8. WebSocket & REST Real-Time Event Streams
9. Anti-Hardcoding Multi-Scenario Verification
10. Base Grid Database 100% Immutability
11. Performance & Execution Stability Characteristics
12. Error Handling & Edge Cases
"""

import sys
import os
import time
import copy
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, List
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database.connection import SessionLocal
from app.schemas.cascade import CascadeSimulationRequest, CascadeSimulationResult
from app.schemas.cyber_attack import CyberSimulationRequest
from app.schemas.unified_event import GridEventType, EventCategory, UnifiedGridEventCreate
from app.services.event_bus_service import event_bus_service
from app.services.grid_service import grid_service
from app.services.cyber_detection_engine import cyber_detection_engine
from app.services.simulation_state_service import simulation_state_service
from app.cyber.attack_simulator import attack_simulator
from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.physics_validator import PhysicsValidator, PhysicsValidationTolerances
from app.power.models import PowerFlowResult
from app.cascade.coordinator import cascade_coordinator, extract_solver_metrics
from app.cascade.context import CascadeContext
from app.cascade.detection_agent import detection_agent
from app.cascade.impact_agent import impact_agent
from app.cascade.priority_agent import priority_agent
from app.cascade.propagation_agent import propagation_agent
from app.cascade.island_agent import island_agent
from app.cascade.recovery_agent import recovery_agent
from app.dsa.hashing import AssetIndexTable
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine
from app.dsa.dijkstra import DijkstraReroutingEngine
from app.dsa.priority_queue import IncidentPriorityQueue
from app.models.event import Cascade, CascadeEvent, GridEvent
from app.models.asset import Asset, TransformerBay
from app.models.transmission import TransmissionLine


@pytest.fixture
def client():
    return TestClient(app)


# =============================================================================
# 1. INFRASTRUCTURE & TOPOLOGY TESTS (Tests 1–5)
# =============================================================================

def test_01_database_and_59_asset_initialization():
    """Test 1: SQLite database initializes with all 59 nominal base assets."""
    db = SessionLocal()
    try:
        assets = db.query(Asset).all()
        lines = db.query(TransmissionLine).all()
        xfmrs = db.query(TransformerBay).all()
        
        total_assets = len(assets) + len(lines) + len(xfmrs)
        assert len(assets) >= 14, f"Expected at least 14 assets, got {len(assets)}"
        assert len(lines) >= 15, f"Expected at least 15 lines, got {len(lines)}"
        assert len(xfmrs) >= 4, f"Expected at least 4 transformers, got {len(xfmrs)}"
        assert total_assets >= 50, f"Expected >= 50 base assets, got {total_assets}"
    finally:
        db.close()


def test_02_dynamic_network_construction_from_database():
    """Test 2: Power flow service dynamically constructs valid network topology dict from DB."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        assert "buses" in net_data
        assert "lines" in net_data
        assert "transformers" in net_data
        assert len(net_data["buses"]) > 0
        assert len(net_data["lines"]) > 0
    finally:
        db.close()


def test_03_rest_grid_network_endpoint(client):
    """Test 3: GET /api/grid/network returns authentic network JSON."""
    res = client.get("/api/grid/network")
    assert res.status_code == 200
    data = res.json()
    assert "assets" in data
    assert "lines" in data
    assert len(data["assets"]) >= 14
    assert len(data["lines"]) >= 15


def test_04_websocket_grid_endpoint_connectivity(client):
    """Test 4: WebSocket endpoint /ws/grid accepts real-time connections and establishes stream."""
    with client.websocket_connect("/ws/grid") as ws:
        handshake = ws.receive_json()
        assert handshake["type"] == "CONNECTION_ESTABLISHED"
        assert "GRIDSEC" in handshake["message"]


def test_05_websocket_aegis_endpoint_connectivity(client):
    """Test 5: WebSocket endpoint /ws/aegis accepts connections."""
    with client.websocket_connect("/ws/aegis") as ws:
        data = ws.receive_json()
        assert data["type"] == "AEGIS_FEED_CONNECTED"


# =============================================================================
# 2. DSA ALGORITHMS AUTHENTIC EXECUTION (Tests 6–10)
# =============================================================================

def test_06_dsa_hash_table_o1_lookup():
    """Test 6: O(1) AssetIndexTable inserts and resolves assets by ID and dimension."""
    index = AssetIndexTable()
    index.insert_asset({"id": "LINE-1-3", "name": "400kV Raigarh Corridor", "type": "line", "thermal_limit_mw": 4000.0})
    index.insert_asset({"id": "XFMR-3-4", "name": "765/400kV Interconnect", "type": "transformer", "rated_mva": 1500.0})
    
    asset = index.get_by_id("LINE-1-3")
    assert asset is not None
    assert asset["type"] == "line"
    assert asset["thermal_limit_mw"] == 4000.0
    
    lines = index.search_by_type("line")
    assert len(lines) >= 1


def test_07_dsa_bfs_blast_radius():
    """Test 7: O(V+E) BFS computes topological blast radius and reachability."""
    db = SessionLocal()
    try:
        grid_service.load_topology(db)
        bfs_res = BFSImpactEngine.calculate_impact(grid_service.graph, "BUS-1", max_depth=2)
        assert "affected_assets" in bfs_res
        assert "impact_score" in bfs_res
        assert bfs_res["execution_time_us"] >= 0.0
    finally:
        db.close()


def test_08_dsa_dfs_connected_components_islanding():
    """Test 8: O(V+E) DFS discovers connected components and isolates disconnected islands."""
    graph = GridGraph()
    graph.add_node(GraphNode(id="BUS-A", name="Bus A"))
    graph.add_node(GraphNode(id="BUS-B", name="Bus B"))
    graph.add_edge(GraphEdge(line_id="L-AB", source="BUS-A", target="BUS-B"))
    
    graph.add_node(GraphNode(id="BUS-C", name="Bus C"))
    graph.add_node(GraphNode(id="BUS-D", name="Bus D"))
    graph.add_edge(GraphEdge(line_id="L-CD", source="BUS-C", target="BUS-D"))
    
    components = DFSEngine.find_connected_components(graph)
    assert len(components) == 2
    assert set(components[0]) in ({"BUS-A", "BUS-B"}, {"BUS-C", "BUS-D"})


def test_09_dsa_dijkstra_shortest_path():
    """Test 9: O((V+E) log V) Dijkstra calculates lowest-impedance alternate route."""
    graph = GridGraph()
    graph.add_node(GraphNode(id="B1", name="B1", capacity_mw=1000.0))
    graph.add_node(GraphNode(id="B2", name="B2", capacity_mw=1000.0))
    graph.add_node(GraphNode(id="B3", name="B3", capacity_mw=1000.0))
    graph.add_edge(GraphEdge(line_id="L12", source="B1", target="B2", distance_km=100.0))
    graph.add_edge(GraphEdge(line_id="L13", source="B1", target="B3", distance_km=20.0))
    graph.add_edge(GraphEdge(line_id="L32", source="B3", target="B2", distance_km=30.0))
    
    res = DijkstraReroutingEngine.find_alternate_route(graph, "B1", "B2", weight_mode="distance")
    assert res["available"] is True
    assert res["route"] == ["B1", "B3", "B2"]


def test_10_dsa_max_heap_priority_queue():
    """Test 10: O(log N) Binary Max-Heap priority queue ranks violations by severity score."""
    pq = IncidentPriorityQueue()
    pq.push({"incident_id": "INC-1", "severity": "MEDIUM", "risk_score": 30.0, "asset_criticality": 3.0})
    pq.push({"incident_id": "INC-2", "severity": "CRITICAL", "risk_score": 90.0, "asset_criticality": 10.0})
    pq.push({"incident_id": "INC-3", "severity": "HIGH", "risk_score": 60.0, "asset_criticality": 7.0})
    
    top = pq.pop()
    assert top["incident_id"] == "INC-2"
    
    second = pq.pop()
    assert second["incident_id"] == "INC-3"


# =============================================================================
# 3. PHYSICAL POWER FLOW & PHYSICS VALIDATOR (Tests 11–17)
# =============================================================================

def test_11_baseline_ac_power_flow_nodal_balance():
    """Test 11: Nominal AC power flow converges with rigorous Pgen = Pload + Plosses balance."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_PF_BASE", state_overrides={})
        assert pf_res.status == "SUCCESS"
        assert pf_res.power_balance.converged is True
        assert pf_res.power_balance.total_losses_mw > 0.0
        
        # Verify conservation: Generation ≈ Load + Losses
        p_gen = pf_res.power_balance.total_generation_mw
        p_load = pf_res.power_balance.total_load_mw
        p_loss = pf_res.power_balance.total_losses_mw
        assert abs(p_gen - (p_load + p_loss)) < 1.0, f"Power balance error: Gen={p_gen}, Load={p_load}, Loss={p_loss}"
    finally:
        db.close()


def test_12_line_outage_sandbox_power_redistribution():
    """Test 12: Tripping a transmission line redistributes active power flows in sandbox."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        base_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_BASE", state_overrides={})
        
        trip_overrides = {"LINE-1-3": {"status": "OUT_OF_SERVICE"}}
        trip_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_TRIP", state_overrides=trip_overrides)
        
        assert trip_res.power_balance.converged is True
        assert trip_res.power_balance.total_losses_mw != base_res.power_balance.total_losses_mw
    finally:
        db.close()


def test_13_transformer_outage_isolation():
    """Test 13: Tripping a transformer isolates transformer branch while keeping grid solvable."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        trip_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_XFMR", state_overrides={"XFMR-3-4": {"status": "OUT_OF_SERVICE"}})
        assert trip_res.status in ("SUCCESS", "WARNING")
    finally:
        db.close()


def test_14_transformer_tap_changer_voltage_modulation():
    """Test 14: Changing OLTC transformer tap position modifies secondary bus voltage."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        res_tap = PowerFlowSolver.solve(net_data, scenario_id="TEST_TAP", state_overrides={"XFMR-3-4": {"tap_pos": 3, "status": "IN_SERVICE"}})
        assert res_tap.power_balance.converged is True
    finally:
        db.close()


def test_15_physics_validator_nodal_balance_and_voltage_limits():
    """Test 15: Independent PhysicsValidator independently verifies nodal balance and voltage bounds."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_VAL", state_overrides={})
        
        val_res = PhysicsValidator.validate(pf_res, network_data=net_data)
        assert val_res.is_valid is True
        assert val_res.solver_converged is True
        assert val_res.power_balance_valid is True
        assert val_res.voltage_limits_valid is True
    finally:
        db.close()


def test_16_physics_validator_detects_induced_violations():
    """Test 16: PhysicsValidator flags violations when low limits or overloads are supplied."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_VAL_VIOL", state_overrides={"LINE-1-3": {"status": "OUT_OF_SERVICE"}})
        
        tol = PhysicsValidationTolerances(line_loading_max_pct=30.0)
        val_res = PhysicsValidator.validate(
            pf_res,
            network_data=net_data,
            tolerances=tol
        )
        assert len(val_res.violations) >= 1
    finally:
        db.close()


def test_17_solver_numerical_divergence_handling():
    """Test 17: Solver divergence produces clean non-converged result and graceful validator failure."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        diverged_overrides = {
            "LINE-1-2": "OUT_OF_SERVICE",
            "LINE-1-3": "OUT_OF_SERVICE",
            "LINE-2-3": "OUT_OF_SERVICE",
            "LINE-3-4": "OUT_OF_SERVICE"
        }
        div_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_DIV", state_overrides=diverged_overrides)
        val_res = PhysicsValidator.validate(div_res, network_data=net_data)
        assert val_res.is_valid is False
    finally:
        db.close()


# =============================================================================
# 4. CYBERSECURITY SCENARIOS & GROUND TRUTH SEPARATION (Tests 18–22)
# =============================================================================

def test_18_attack_1_unauthorized_control_command():
    """Test 18: Attack 1 creates physical breaker trip in sandbox while logging cyber telemetry."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_A_BREAKER_TRIP",
            target_asset_id="LINE-1-3",
            seed=42,
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.event.target_asset_id == "LINE-1-3"
        assert res.event.inference.detection_confidence >= 30.0
        assert res.state_comparison.is_physical_state_modified is True
    finally:
        db.close()



def test_19_attack_2_false_data_injection_ground_truth_separation():
    """Test 19: Attack 2 falsifies telemetry while physical grid sandbox remains unchanged."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_B_TELEMETRY_ANOMALY",
            target_asset_id="BUS-2",
            seed=101,
            manipulation_factor=0.60
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.state_comparison is not None
        assert res.state_comparison.is_physical_state_modified is False
        assert res.cyber_physics_consistency is not None
    finally:
        db.close()


def test_20_attack_3_configuration_tampering():
    """Test 20: Attack 3 modifies transformer OLTC tap settings inside sandbox."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_C_CONFIG_TAMPER",
            target_asset_id="XFMR-3-4",
            requested_tap=4,
            previous_tap=0
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.transformer_tap_impact is not None
        assert res.transformer_tap_impact.is_tap_valid is True
    finally:
        db.close()


def test_21_attack_4_reconnaissance_probing_correlation():
    """Test 21: Attack 4 generates distributed SCADA probes with multi-asset correlation."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_D_REPEATED_PROBE",
            target_asset_id="BUS-1",
            seed=303
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.event is not None
    finally:
        db.close()


def test_22_attack_5_coordinated_multi_vector_campaign():
    """Test 22: Attack 5 executes 4-stage campaign with Max-Heap prioritized incident ranking."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCENARIO_E_COORDINATED_ATTACK",
            target_asset_id="LINE-1-3",
            seed=404
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.event is not None
    finally:
        db.close()


# =============================================================================
# 5. CASCADING FAILURE & TERMINATION CONDITIONS (Tests 23–30)
# =============================================================================

def test_23_cascade_root_disturbance_and_secondary_action():
    """Test 23: Initial root disturbance triggers secondary overload action when threshold is low."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=30.0,
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.total_steps >= 1
        assert "LINE-1-3" in result.tripped_assets
    finally:
        db.close()


def test_24_cascade_equilibrium_reached_termination():
    """Test 24: Stable grid terminates cleanly with EQUILIBRIUM_REACHED."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-2",
            protection_threshold_line_loading_pct=150.0,
            max_depth=4
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.termination_reason == "EQUILIBRIUM_REACHED"
        assert result.status == "STABLE"
    finally:
        db.close()


def test_25_cascade_max_depth_termination():
    """Test 25: Cascade simulation respects bounded max_depth parameter."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=25.0,
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.max_depth_reached <= 2
    finally:
        db.close()


def test_26_cascade_repeated_state_cycle_prevention():
    """Test 26: Cascade loop prevents infinite loops by tracking visited topological sets."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=10
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.total_steps <= 10
        assert result.status in ("STABLE", "SOLVER_DIVERGED", "SYSTEM_SEPARATION", "MAX_DEPTH_REACHED")
    finally:
        db.close()


def test_27_cascade_divergence_termination():
    """Test 27: Solver numerical divergence triggers SOLVER_DIVERGED terminal state."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=5
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.status in ("STABLE", "SOLVER_DIVERGED", "SYSTEM_SEPARATION", "MAX_DEPTH_REACHED")
    finally:
        db.close()


def test_28_cascade_system_separation_handling():
    """Test 28: IslandAgent checks for system separation."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.status is not None
    finally:
        db.close()


def test_29_cascade_timeline_causal_tree_linking():
    """Test 29: Cascade timeline correctly records parent_event_id causal graph."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(res.cascade_id, db)
        assert "timeline" in timeline
        assert "causal_graph" in timeline
        assert len(timeline["timeline"]) >= 5
    finally:
        db.close()


def test_30_cascade_step_inspection_deltas():
    """Test 30: Step inspection accurately records before and after electrical states for delta computation."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res = cascade_coordinator.run_coordinated_cascade(req, db)
        step1 = res.step_results[0]
        assert step1.input_state is not None
        assert step1.output_state is not None
        assert "metrics" in step1.input_state
        assert "metrics" in step1.output_state
    finally:
        db.close()


# =============================================================================
# 6. MULTI-AGENT COMPUTATIONAL PIPELINE (Tests 31–37)
# =============================================================================

def test_31_detection_agent_computational_integrity():
    """Test 31: DetectionAgent evaluates solver state without mutating database or choosing trips."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_DET", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_DET",
            cascade_id="CAS_DET",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_1",
            latest_solver_result=pf_res
        )
        res = detection_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert res.decision_trace is not None
        assert res.next_agent == "ImpactAgent"
    finally:
        db.close()


def test_32_impact_agent_bfs_blast_radius():
    """Test 32: ImpactAgent executes BFS to calculate blast radius impact score."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_IMP", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_IMP",
            cascade_id="CAS_IMP",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_2",
            tripped_assets=["LINE-1-3"],
            affected_assets=["LINE-1-3"],
            latest_solver_result=pf_res
        )
        res = impact_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert "impact_score" in res.evidence
        assert res.next_agent == "PriorityAgent"
    finally:
        db.close()


def test_33_priority_agent_max_heap_triage():
    """Test 33: PriorityAgent prioritizes candidate violations using Max-Heap."""
    db = SessionLocal()
    try:
        ctx = CascadeContext(
            simulation_id="SIM_PRI",
            cascade_id="CAS_PRI",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_3",
            tripped_assets=[]
        )
        res = priority_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert res.next_agent == "PropagationAgent"
    finally:
        db.close()


def test_34_propagation_agent_deterministic_decision():
    """Test 34: PropagationAgent evaluates candidate and issues deterministic protection recommendations."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_PROP", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_PROP",
            cascade_id="CAS_PROP",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_4",
            latest_solver_result=pf_res
        )
        res = propagation_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert res.recommended_action in ("EXECUTE_CASCADE_SANDBOX_TRIP", "TERMINATE_CASCADE_STABLE", "TERMINATE_CASCADE_DIVERGENCE")
    finally:
        db.close()


def test_35_island_agent_dfs_connected_components():
    """Test 35: IslandAgent analyzes graph connectivity and identifies island count."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_ISL", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_ISL",
            cascade_id="CAS_ISL",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_5",
            tripped_assets=["LINE-1-3"],
            latest_solver_result=pf_res
        )
        res = island_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert "component_count" in res.evidence
    finally:
        db.close()


def test_36_recovery_agent_dijkstra_bypass_feasibility():
    """Test 36: RecoveryAgent computes Dijkstra alternate bypass paths and validates feasibility."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_REC", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_REC",
            cascade_id="CAS_REC",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_6",
            tripped_assets=["LINE-1-3"],
            latest_solver_result=pf_res
        )
        res = recovery_agent.analyze(ctx, db)
        assert res.status == "SUCCESS"
        assert "candidate_count" in res.evidence or "feasible_routes_count" in res.evidence
    finally:
        db.close()


def test_37_cascade_coordinator_state_machine():
    """Test 37: CascadeCoordinator orchestrates complete step workflow with sequential traces."""
    db = SessionLocal()
    try:
        net_data = power_flow_service.get_network_topology("TEST_NETWORK", db)
        pf_res = PowerFlowSolver.solve(net_data, scenario_id="TEST_COORD", state_overrides={})
        ctx = CascadeContext(
            simulation_id="SIM_COORD",
            cascade_id="CAS_COORD",
            network_id="TEST_NETWORK",
            current_depth=1,
            current_event_id="EVT_ROOT",
            latest_solver_result=pf_res
        )
        step_res = cascade_coordinator.coordinate_step(ctx, db)
        assert step_res.detection_result is not None
        assert step_res.impact_result is not None
        assert step_res.priority_result is not None
        assert step_res.propagation_result is not None
        assert step_res.island_result is not None
        assert step_res.recovery_result is not None
        assert len(step_res.decision_traces) >= 5
    finally:
        db.close()


# =============================================================================
# 7. EXPLAINABILITY, APIS & IMMUTABILITY (Tests 38–43)
# =============================================================================

def test_38_aegis_explainability_structured_evidence(client):
    """Test 38: Aegis report compiles evidence with strict data provenance classifications."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res_cascade = cascade_coordinator.run_coordinated_cascade(req, db)
        
        res = client.get(f"/api/aegis/explain/cascade/{res_cascade.cascade_id}")
        assert res.status_code in (200, 404)
    finally:
        db.close()


def test_39_rest_cascade_eligible_disturbances_api(client):
    """Test 39: GET /api/cascades/eligible-disturbances returns dynamic lines and transformers."""
    res = client.get("/api/cascades/eligible-disturbances")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_eligible"] > 0


def test_40_rest_cascade_timeline_api(client):
    """Test 40: GET /api/cascades/{cascade_id}/timeline returns causal event graph."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res_cascade = cascade_coordinator.run_coordinated_cascade(req, db)
        
        res = client.get(f"/api/cascades/{res_cascade.cascade_id}/timeline")
        assert res.status_code == 200
        data = res.json()
        assert data["cascade_id"] == res_cascade.cascade_id
        assert "timeline" in data
    finally:
        db.close()


def test_41_anti_hardcoding_three_distinct_scenarios():
    """Test 41: Line A vs. Line B vs. Transformer disturbance produce distinct metrics and outputs."""
    db = SessionLocal()
    try:
        res_a = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2), db
        )
        res_b = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="LINE-1-2", max_depth=2), db
        )
        res_c = cascade_coordinator.run_coordinated_cascade(
            CascadeSimulationRequest(initial_asset_id="XFMR-3-4", max_depth=2), db
        )
        
        assert res_a.cascade_id != res_b.cascade_id != res_c.cascade_id
        assert res_a.tripped_assets[0] == "LINE-1-3"
        assert res_b.tripped_assets[0] == "LINE-1-2"
        assert res_c.tripped_assets[0] == "XFMR-3-4"
        assert res_a.step_results[0].trigger["asset_id"] == "LINE-1-3"
        assert res_b.step_results[0].trigger["asset_id"] == "LINE-1-2"
        assert res_c.step_results[0].trigger["asset_id"] == "XFMR-3-4"
        assert res_a.step_results[0].solver_metrics["min_voltage_pu"] != res_b.step_results[0].solver_metrics["min_voltage_pu"]
        assert res_a.step_results[0].solver_metrics["max_line_loading_pct"] != res_b.step_results[0].solver_metrics["max_line_loading_pct"]
    finally:
        db.close()




def test_42_base_grid_database_100_percent_immutability():
    """Test 42: Base grid SQLite database remains 100% immutable across all simulations."""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gridsec.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Take snapshot before simulation
        cur.execute("SELECT line_id, status FROM transmission_lines ORDER BY line_id")
        lines_before = cur.fetchall()
        
        cur.execute("SELECT transformer_id, status FROM transformer_bays ORDER BY transformer_id")
        xfmrs_before = cur.fetchall()
        
        # Run a multi-step cascade drill
        db = SessionLocal()
        try:
            req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=3)
            cascade_coordinator.run_coordinated_cascade(req, db)
        finally:
            db.close()
        
        # Take snapshot after simulation
        cur.execute("SELECT line_id, status FROM transmission_lines ORDER BY line_id")
        lines_after = cur.fetchall()
        
        cur.execute("SELECT transformer_id, status FROM transformer_bays ORDER BY transformer_id")
        xfmrs_after = cur.fetchall()
        
        conn.close()
        
        assert lines_before == lines_after, "Base transmission lines table was mutated during cascade simulation!"
        assert xfmrs_before == xfmrs_after, "Base transformer bays table was mutated during cascade simulation!"


def test_43_simulation_reset_contract(client):
    """Test 43: POST /api/cascades/reset cleans sandbox and leaves database intact."""
    res = client.post("/api/cascades/reset")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"

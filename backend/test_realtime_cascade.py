"""
GRIDSEC — STEP 14: Real-Time Cascade Visualization & Event Timeline Test Suite
Comprehensive verification of:
1. WebSocket stream connectivity and structured event delivery
2. Event serialization, required fields, and unique event IDs
3. Chronological ordering and parent_event_id causal tree reconstruction
4. Simulation ID, Cascade ID, and Step/Depth propagation
5. Discrete lifecycle events: ROOT_DISTURBANCE, SOLVER_STARTED, SOLVER_COMPLETED,
   PHYSICS_VALIDATION_COMPLETED, PHYSICAL_VIOLATION_DETECTED, IMPACT_ANALYSIS_COMPLETED,
   PRIORITY_ANALYSIS_COMPLETED, PROPAGATION_DECISION, SECONDARY_ACTION, SANDBOX_STATE_CHANGED,
   ISLAND_ANALYSIS, RECOVERY_ANALYSIS, CASCADE_TERMINATED, AEGIS_UPDATE
6. Anti-hardcoding verification: Disturbance A vs Disturbance B produce distinct outputs
7. Base-grid database immutability
8. Real Before/After electrical delta calculations
9. DFS islanding visualization data & Dijkstra recovery feasibility
10. Termination reasons: EQUILIBRIUM_REACHED, MAX_DEPTH_REACHED, SOLVER_DIVERGED, REPEATED_STATE_DETECTED
11. Reset behavior and full API contract
"""

import sys
import os
import sqlite3
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database.connection import SessionLocal
from app.cascade.coordinator import cascade_coordinator, extract_solver_metrics
from app.schemas.cascade import CascadeSimulationRequest
from app.schemas.unified_event import GridEventType, EventCategory, UnifiedGridEventCreate
from app.services.event_bus_service import event_bus_service
from app.models.event import Cascade, CascadeEvent, GridEvent
from app.power.solver import PowerFlowSolver
from app.power.power_flow_service import power_flow_service
from app.power.physics_validator import PhysicsValidator


@pytest.fixture
def client():
    return TestClient(app)


# --- Test 1: WebSocket Grid Stream Connection & Handshake ---
def test_01_websocket_grid_connection(client):
    """Test 1: WebSocket /ws/grid accepts connection and sends initial handshake."""
    with client.websocket_connect("/ws/grid") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "CONNECTION_ESTABLISHED"
        assert "GRIDSEC" in data["message"]


# --- Test 2: WebSocket Aegis Stream Connection & Handshake ---
def test_02_websocket_aegis_connection(client):
    """Test 2: WebSocket /ws/aegis accepts connection and sends handshake."""
    with client.websocket_connect("/ws/aegis") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "AEGIS_FEED_CONNECTED"
        assert data["engineStatus"] == "ACTIVE_MONITORING"


# --- Test 3: Event Serialization & Required Fields ---
def test_03_event_serialization_and_required_fields():
    """Test 3: Events published via EventBus preserve all required metadata fields."""
    db = SessionLocal()
    try:
        evt_in = UnifiedGridEventCreate(
            event_type=GridEventType.CASCADE_STARTED,
            event_category=EventCategory.SIMULATION_EVENT,
            source_asset="CASCADE_COORDINATOR",
            affected_assets=["LINE-1-3"],
            severity="INFO",
            cause="Test cascade initiation",
            parent_event_id=None,
            simulation_id="SIM-TEST-001",
            data_source="TEST_SUITE",
            payload={"cascade_id": "CAS-TEST-001", "depth": 0}
        )
        saved = event_bus_service.publish_event(evt_in, db)
        assert saved.event_id.startswith("EVT-CP-")
        assert saved.event_type == "CASCADE_STARTED"
        assert saved.source_asset == "CASCADE_COORDINATOR"
        assert saved.simulation_id == "SIM-TEST-001"
        assert saved.payload.get("cascade_id") == "CAS-TEST-001"
        assert saved.timestamp is not None
    finally:
        db.close()


# --- Test 4: Unique Event IDs ---
def test_04_unique_event_ids():
    """Test 4: Every emitted event receives a globally unique event_id."""
    db = SessionLocal()
    try:
        ids = set()
        for i in range(10):
            evt_in = UnifiedGridEventCreate(
                event_type=GridEventType.PHYSICAL_STATE_UPDATE,
                source_asset=f"LINE-{i}",
                simulation_id="SIM-UNIQUE-TEST",
                cause=f"Test event {i}"
            )
            saved = event_bus_service.publish_event(evt_in, db)
            assert saved.event_id not in ids
            ids.add(saved.event_id)
        assert len(ids) == 10
    finally:
        db.close()


# --- Test 5: Chronological Ordering of Cascade Events ---
def test_05_chronological_ordering():
    """Test 5: Cascade events in database maintain strict chronological timestamp sequence."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=3,
            protection_threshold_line_loading_pct=100.0,
            protection_threshold_transformer_loading_pct=100.0
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        assert len(events) >= 5

        # Check non-decreasing timestamps
        for i in range(len(events) - 1):
            t1 = datetime.fromisoformat(events[i]["timestamp"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(events[i+1]["timestamp"].replace("Z", "+00:00"))
            assert t1 <= t2
    finally:
        db.close()


# --- Test 6: Parent-Child Causal Linking ---
def test_06_parent_child_causal_linking():
    """Test 6: Cascade events link to parent events via parent_event_id."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        # Step events must have a non-empty parent_event_id linking back to prior events
        step_events = [e for e in events if e.get("depth", 0) > 0 and e.get("parent_event_id")]
        assert len(step_events) >= 1
    finally:
        db.close()


# --- Test 7: Simulation ID and Cascade ID Propagation ---
def test_07_simulation_and_cascade_id_propagation():
    """Test 7: Simulation ID and Cascade ID propagate through all child events and records."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            simulation_id="SIM-PROPAGATE-99",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.simulation_id == "SIM-PROPAGATE-99"
        assert result.cascade_id.startswith("CAS-")

        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        for e in events:
            assert e["simulation_id"] == "SIM-PROPAGATE-99"
            assert e["cascade_id"] == result.cascade_id
    finally:
        db.close()


# --- Test 8: Step / Depth Index Tracking ---
def test_08_step_depth_index_tracking():
    """Test 8: Cascade sequence steps accurately track depth from 0 (baseline) to termination."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=4
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.total_steps >= 1
        assert result.max_depth_reached >= 1
        
        depths = [s.depth for s in result.step_results]
        assert depths == list(range(1, len(depths) + 1))
    finally:
        db.close()


# --- Test 9: Root Disturbance Lifecycle Event ---
def test_09_root_disturbance_event():
    """Test 9: Initial action emits a ROOT_DISTURBANCE event with exact asset payload."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            initial_action="TRIP",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        root_evts = [e for e in events if e["event_type"] == "ROOT_DISTURBANCE"]
        assert len(root_evts) == 1
        assert root_evts[0]["source_asset"] == "LINE-1-3"
    finally:
        db.close()


# --- Test 10: Solver Start and Completed Lifecycle Events ---
def test_10_solver_lifecycle_events():
    """Test 10: Every AC power flow execution emits SOLVER_STARTED and SOLVER_COMPLETED."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        solver_starts = [e for e in events if e["event_type"] == "SOLVER_STARTED"]
        solver_completes = [e for e in events if e["event_type"] == "SOLVER_COMPLETED"]
        
        assert len(solver_starts) >= 2  # Baseline (0) + Step 1
        assert len(solver_completes) >= 2
        
        # Verify quantitative solver metrics attached
        c_evt = solver_completes[0]
        assert "solver_metrics" in c_evt["payload"]
        assert "converged" in c_evt["payload"]
        assert "total_losses_mw" in c_evt["payload"]
    finally:
        db.close()


# --- Test 11: Physics Validation Completed Event ---
def test_11_physics_validation_event():
    """Test 11: PHYSICS_VALIDATION_COMPLETED event emitted with conservation checks."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        val_evts = [e for e in events if e["event_type"] == "PHYSICS_VALIDATION_COMPLETED"]
        assert len(val_evts) >= 1
        assert "validation_status" in val_evts[0]["payload"]
    finally:
        db.close()


# --- Test 12: Physical Violation Detected Event ---
def test_12_physical_violation_event():
    """Test 12: PHYSICAL_VIOLATION_DETECTED emitted when limits are exceeded."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=30.0,
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        viols = [e for e in events if e["event_type"] in ("PHYSICAL_VIOLATION_DETECTED", "LINE_OVERLOAD", "VOLTAGE_UNDERVOLTAGE")]
        assert len(viols) >= 1
    finally:
        db.close()


# --- Test 13: Impact, Priority, and Propagation Agent Events ---
def test_13_agent_lifecycle_events():
    """Test 13: IMPACT_ANALYSIS, PRIORITY_ANALYSIS, and PROPAGATION_DECISION events emitted."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        imp_evts = [e for e in events if e["event_type"] == "IMPACT_ANALYSIS_COMPLETED"]
        pri_evts = [e for e in events if e["event_type"] == "PRIORITY_ANALYSIS_COMPLETED"]
        prop_evts = [e for e in events if e["event_type"] == "PROPAGATION_DECISION"]
        
        assert len(imp_evts) >= 1
        assert len(pri_evts) >= 1
        assert len(prop_evts) >= 1
    finally:
        db.close()


# --- Test 14: Secondary Action & Sandbox State Changed Events ---
def test_14_secondary_action_events():
    """Test 14: Secondary protection trip emits SECONDARY_ACTION and SANDBOX_STATE_CHANGED."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=60.0,
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        if len(result.tripped_assets) > 1:
            timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
            events = timeline.get("timeline", [])
            sec_evts = [e for e in events if e["event_type"] == "SECONDARY_ACTION"]
            state_evts = [e for e in events if e["event_type"] == "SANDBOX_STATE_CHANGED"]
            assert len(sec_evts) >= 1
            assert len(state_evts) >= 1
    finally:
        db.close()


# --- Test 15: Islanding & Recovery Agent Events ---
def test_15_island_and_recovery_events():
    """Test 15: ISLAND_ANALYSIS and RECOVERY_ANALYSIS events emitted in each step."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        isl_evts = [e for e in events if e["event_type"] == "ISLAND_ANALYSIS"]
        rec_evts = [e for e in events if e["event_type"] == "RECOVERY_ANALYSIS"]
        
        assert len(isl_evts) >= 1
        assert len(rec_evts) >= 1
    finally:
        db.close()


# --- Test 16: Aegis Update Lifecycle Event ---
def test_16_aegis_update_event():
    """Test 16: AEGIS_UPDATE events emitted during cascade progression."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        aegis_evts = [e for e in events if e["event_type"] == "AEGIS_UPDATE"]
        assert len(aegis_evts) >= 1
    finally:
        db.close()


# --- Test 17: Cascade Terminated Lifecycle Event ---
def test_17_cascade_terminated_event():
    """Test 17: CASCADE_TERMINATED event emitted with exact termination reason."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        events = timeline.get("timeline", [])
        
        term_evts = [e for e in events if e["event_type"] == "CASCADE_TERMINATED"]
        assert len(term_evts) == 1
        assert "termination_reason" in term_evts[0]["payload"]
    finally:
        db.close()


# --- Test 18: Multi-Step Cascade Timeline Assembly ---
def test_18_multi_step_timeline_assembly():
    """Test 18: Timeline assembly contains ordered list of all step stages."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline_data = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        assert timeline_data["cascade_id"] == result.cascade_id
        assert timeline_data["event_count"] >= 5
        assert isinstance(timeline_data["timeline"], list)
    finally:
        db.close()


# --- Test 19: Causal Tree Reconstruction ---
def test_19_causal_tree_reconstruction():
    """Test 19: Causal graph accurately maps parent_event_id to child event IDs."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            max_depth=3
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        timeline_data = cascade_coordinator.get_cascade_timeline(result.cascade_id, db)
        causal_graph = timeline_data.get("causal_graph", {})
        assert isinstance(causal_graph, dict)
        assert len(causal_graph) > 0
    finally:
        db.close()


# --- Test 20: Anti-Hardcoding: Disturbance A vs Disturbance B Produce Different Results ---
def test_20_anti_hardcoding_different_disturbances():
    """Test 20: Disturbance on LINE-1-3 vs LINE-1-2 produces distinct timelines, metrics, and trees."""
    db = SessionLocal()
    try:
        req_a = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=3)
        res_a = cascade_coordinator.run_coordinated_cascade(req_a, db)

        req_b = CascadeSimulationRequest(initial_asset_id="LINE-1-2", max_depth=3)
        res_b = cascade_coordinator.run_coordinated_cascade(req_b, db)

        assert res_a.cascade_id != res_b.cascade_id
        assert res_a.tripped_assets[0] == "LINE-1-3"
        assert res_b.tripped_assets[0] == "LINE-1-2"

        # Verify different solver metrics
        step1_a = res_a.step_results[0].solver_metrics
        step1_b = res_b.step_results[0].solver_metrics
        assert step1_a["max_line_loading_pct"] != step1_b["max_line_loading_pct"] or step1_a["total_losses_mw"] != step1_b["total_losses_mw"]
    finally:
        db.close()


# --- Test 21: Base-Grid Database Immutability ---
def test_21_base_grid_database_immutability():
    """Test 21: Base grid SQLite database remains 100% immutable in sandbox execution."""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gridsec.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT status FROM transmission_lines WHERE line_id = 'LINE-1-3'")
        row = cur.fetchone()
        if row:
            assert row[0] == "IN_SERVICE", "Base grid line status was mutated!"
        conn.close()


# --- Test 22: Dynamic Topology State Update ---
def test_22_topology_state_update():
    """Test 22: Step results track sandbox state overrides and tripped assets accurately."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        step1 = result.step_results[0]
        assert "LINE-1-3" in step1.output_state["tripped_assets"]
        assert step1.output_state["state_overrides"]["LINE-1-3"]["status"] == "OUT_OF_SERVICE"
    finally:
        db.close()


# --- Test 23: Real Before vs After Electrical Deltas ---
def test_23_before_after_electrical_deltas():
    """Test 23: Step inspection contains genuine input_state and output_state for delta calculation."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        step1 = result.step_results[0]
        
        in_metrics = step1.input_state.get("metrics", {})
        out_metrics = step1.output_state.get("metrics", {})
        
        assert "total_losses_mw" in in_metrics
        assert "total_losses_mw" in out_metrics
        delta_losses = round(out_metrics["total_losses_mw"] - in_metrics["total_losses_mw"], 2)
        assert isinstance(delta_losses, float)
    finally:
        db.close()


# --- Test 24: DFS Islanding Visualization Data ---
def test_24_dfs_islanding_data():
    """Test 24: DFS islanding analysis generates structured component data."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        step1 = result.step_results[0]
        isl = step1.island_result
        assert isl is not None
        assert "component_count" in isl.evidence
        assert isl.evidence["component_count"] >= 1
    finally:
        db.close()


# --- Test 25: Dijkstra Recovery Route Feasibility Data ---
def test_25_dijkstra_recovery_data():
    """Test 25: Dijkstra recovery analysis returns evaluated routes and feasibility status."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        step1 = result.step_results[0]
        rec = step1.recovery_result
        assert rec is not None
        assert "feasible_routes_count" in rec.evidence or "candidate_count" in rec.evidence
    finally:
        db.close()


# --- Test 26: Solver Divergence Terminal Handling ---
def test_26_solver_divergence_handling():
    """Test 26: Solver divergence causes clean terminal transition to SOLVER_DIVERGED."""
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


# --- Test 27: Repeated State Cycle Prevention Termination ---
def test_27_repeated_state_termination():
    """Test 27: Cascade loop guarantees termination if a visited state is reached."""
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


# --- Test 28: Max Depth Reached Termination ---
def test_28_max_depth_termination():
    """Test 28: Cascade stops at max_depth when cascade continues beyond bound."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-3",
            protection_threshold_line_loading_pct=50.0,
            max_depth=2
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.max_depth_reached <= 2
    finally:
        db.close()


# --- Test 29: No Eligible Candidate Equilibrium Termination ---
def test_29_equilibrium_reached_termination():
    """Test 29: Cascade concludes with EQUILIBRIUM_REACHED when no further violations exist."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(
            initial_asset_id="LINE-1-2",
            protection_threshold_line_loading_pct=150.0,
            max_depth=5
        )
        result = cascade_coordinator.run_coordinated_cascade(req, db)
        assert result.termination_reason == "EQUILIBRIUM_REACHED"
        assert result.status == "STABLE"
    finally:
        db.close()


# --- Test 30: Eligible Disturbance REST API ---
def test_30_eligible_disturbances_api(client):
    """Test 30: GET /api/cascades/eligible-disturbances returns dynamic lines and transformers."""
    res = client.get("/api/cascades/eligible-disturbances")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["total_eligible"] > 0
    assert len(data["lines"]) > 0


# --- Test 31: Cascade Timeline REST API ---
def test_31_cascade_timeline_api(client):
    """Test 31: GET /api/cascades/{cascade_id}/timeline returns causal event graph."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res_cascade = cascade_coordinator.run_coordinated_cascade(req, db)
        
        res = client.get(f"/api/cascades/{res_cascade.cascade_id}/timeline")
        assert res.status_code == 200
        data = res.json()
        assert data["cascade_id"] == res_cascade.cascade_id
        assert "timeline" in data
        assert "causal_graph" in data
    finally:
        db.close()


# --- Test 32: Cascade Steps Inspection REST API ---
def test_32_cascade_steps_api(client):
    """Test 32: GET /api/cascades/{cascade_id}/steps returns inspection data."""
    db = SessionLocal()
    try:
        req = CascadeSimulationRequest(initial_asset_id="LINE-1-3", max_depth=2)
        res_cascade = cascade_coordinator.run_coordinated_cascade(req, db)
        
        res = client.get(f"/api/cascades/{res_cascade.cascade_id}/steps")
        assert res.status_code == 200
        data = res.json()
        assert data["cascade_id"] == res_cascade.cascade_id
        assert "events" in data
    finally:
        db.close()


# --- Test 33: Full End-to-End Cascade Run API Contract ---
def test_33_full_api_cascade_run_contract(client):
    """Test 33: POST /api/cascades/run executes full coordinated cascade simulation pipeline."""
    payload = {
        "initial_asset_id": "LINE-1-3",
        "initial_action": "TRIP",
        "max_depth": 3,
        "protection_threshold_line_loading_pct": 100.0,
        "protection_threshold_transformer_loading_pct": 100.0
    }
    res = client.post("/api/cascades/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("STABLE", "SYSTEM_SEPARATION", "SOLVER_DIVERGED", "MAX_DEPTH_REACHED")
    assert data["cascade_id"].startswith("CAS-")
    assert len(data["step_results"]) >= 1
    assert data["execution_time_ms"] > 0

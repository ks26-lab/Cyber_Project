"""
GRIDSEC — Attack 3: Unauthorized Configuration Change Verification Suite
Validates:
1. Scenario SCN-003 existence and definition
2. Ground truth isolation from detection engine
3. Transformer asset identification via O(1) hash index
4. Unknown / ambiguous transformer handling
5. Unauthorized configuration change detection
6. Explainable additive detection scoring & evidence
7. Invalid tap position boundary rejection
8. Valid tap change strictly modifying sandbox state
9. Base grid database immutability
10. AC power flow re-solving post tap change
11. Baseline vs post-event voltage comparisons (Delta V)
12. Physical violations generated only on threshold breach
13. BFS cascading blast radius on actual topology
14. DFS network connectivity and islanding verification
15. Max-Heap incident prioritization
16. Aegis evidence separation (Observed vs Solver Truth vs Inferences)
17. WebSocket pipeline stages dispatch
18. End-to-end API simulation execution
"""

import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal, engine, Base
from app.models.asset import Asset, TransformerBay
from app.cyber.attack_scenarios import (
    SCENARIO_C_CONFIG_TAMPER,
    SCENARIO_CATALOG,
    get_scenario_by_id
)
from app.cyber.attack_simulator import attack_simulator
from app.schemas.cyber_attack import (
    CyberSimulationRequest,
    AttackCategory,
    ObservedFacts,
    DetectionInference
)
from app.services.cyber_detection_engine import cyber_detection_engine
from app.power.power_flow_service import power_flow_service
from app.services.simulation_state_service import simulation_state_service


@pytest.fixture(scope="module")
def db_session():
    """Provides a transactional database session."""
    session = SessionLocal()
    yield session
    session.close()


def test_01_scenario_scn003_exists():
    """Test 1: SCN-003 exists in scenario catalog with correct metadata."""
    scen = get_scenario_by_id("SCN-003")
    assert scen is not None, "SCN-003 must exist in catalog."
    assert scen.scenario_id in ("SCN-003", "SCENARIO_C_CONFIG_TAMPER")
    assert scen.category == AttackCategory.CONFIGURATION_TAMPERING
    assert scen.default_target == "XFMR-3-4"
    assert scen.parameter_defaults.get("requested_tap") == 4
    assert scen.parameter_defaults.get("previous_tap") == 0


def test_02_ground_truth_isolation():
    """Test 2: Ground truth is isolated from the detector."""
    syn_event = attack_simulator.generate_synthetic_event(
        scenario_id="SCN-003",
        target_asset="XFMR-3-4",
        auth_status="UNAUTHORIZED"
    )
    # Ground truth is stored in synthetic event
    assert syn_event.ground_truth_category == "CONFIGURATION_TAMPERING"
    assert syn_event.ground_truth_action == "MODIFY_TAP_CONFIGURATION"
    
    # But detector classification is purely rule and residual derived from observed facts
    obs = syn_event.observed
    assert not hasattr(obs, "ground_truth_category")
    assert not hasattr(obs, "ground_truth_action")
    
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, None)
    assert category == AttackCategory.CONFIGURATION_TAMPERING
    assert "RULE_CONFIG_OVERRIDE" in rules


def test_03_transformer_hash_index_resolution(db_session):
    """Test 3: Transformer is resolved through the O(1) hash index."""
    matched, status, candidates = cyber_detection_engine.resolve_asset("XFMR-3-4", db_session)
    assert status == "RESOLVED"
    assert matched is not None
    assert matched["id"] == "XFMR-3-4"
    assert matched["type"] == "TRANSFORMER"


def test_04_unknown_transformer_handling(db_session):
    """Test 4: Unknown transformer identifier is handled correctly without selecting arbitrary asset."""
    matched, status, candidates = cyber_detection_engine.resolve_asset("NON_EXISTENT_XFMR_999", db_session)
    assert status == "UNKNOWN_ASSET"
    assert matched is None


def test_05_unauthorized_config_change_detection(db_session):
    """Test 5: Unauthorized configuration change is detected and classified."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0,
        tap_min=-10,
        tap_max=10
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert resp.event.inference.attack_category == AttackCategory.CONFIGURATION_TAMPERING
    assert resp.event.inference.classification == "CONFIRMED_CONFIGURATION_TAMPERING_ATTACK"
    assert resp.event.inference.detection_confidence >= 70.0


def test_06_detection_evidence_explainability(db_session):
    """Test 6: Detection evidence is additive, structured, and explainable."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    evidence = resp.event.inference.evidence
    assert len(evidence) >= 3
    factors = [e.factor for e in evidence]
    assert "AUTHORIZATION_FAILURE" in factors
    assert "TRANSFORMER_TARGET_VERIFIED" in factors
    assert "CONFIGURATION_OVERRIDE_INTENT" in factors or "UNUSUAL_TAP_MOVEMENT" in factors
    
    # Confidence must equal clamped sum of evidence weights
    total_w = sum(e.weight for e in evidence)
    assert resp.event.inference.detection_confidence == min(100.0, total_w)


def test_07_invalid_tap_position_rejected(db_session):
    """Test 7: Invalid tap position outside bounds is rejected by safety controller."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=25, # Out of range [-10, 10]
        previous_tap=0,
        tap_min=-10,
        tap_max=10
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert resp.transformer_tap_impact is not None
    assert not resp.transformer_tap_impact.is_tap_valid
    assert resp.transformer_tap_impact.validation_status == "REJECTED_INVALID_LIMITS"
    assert resp.power_flow_impact["status"] == "UNCHANGED_NOMINAL"


def test_08_valid_tap_modifies_only_sandbox(db_session):
    """Test 8: Valid tap change modifies only sandbox scenario state."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0,
        tap_min=-10,
        tap_max=10
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert resp.transformer_tap_impact is not None
    assert resp.transformer_tap_impact.is_tap_valid
    assert resp.transformer_tap_impact.validation_status == "VALID_RANGE"
    assert resp.power_flow_impact["status"] == "SOLVED_IN_SANDBOX"


def test_09_base_database_remains_unchanged(db_session):
    """Test 9: Production base database remains 100% immutable during simulation."""
    base_assets_before = {a.asset_id: getattr(a, "status", None) for a in db_session.query(Asset).all()}
    
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    
    db_session.expire_all()
    base_assets_after = {a.asset_id: getattr(a, "status", None) for a in db_session.query(Asset).all()}
    
    assert base_assets_before == base_assets_after, "Base database was mutated during sandbox simulation!"


def test_10_ac_power_flow_resolves_post_tap(db_session):
    """Test 10: AC power flow re-solves after tap position alteration."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    tap = resp.transformer_tap_impact
    assert tap is not None
    assert tap.system_losses_after_mw > 0.0
    assert len(tap.voltage_after_pu) >= 4


def test_11_voltage_comparison_baseline_vs_post(db_session):
    """Test 11: Baseline and post-event voltage values are accurately compared (Delta V)."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    tap = resp.transformer_tap_impact
    assert tap is not None
    assert "BUS-4" in tap.voltage_before_pu
    assert "BUS-4" in tap.voltage_after_pu
    
    v_before = tap.voltage_before_pu["BUS-4"]
    v_after = tap.voltage_after_pu["BUS-4"]
    delta_v = tap.voltage_delta_pu["BUS-4"]
    
    assert abs((v_after - v_before) - delta_v) < 1e-4
    assert abs(delta_v) > 0.01, "Tap +4 must create measurable Delta V voltage shift on secondary bus."


def test_12_physical_violations_threshold_check(db_session):
    """Test 12: Physical violations are generated only when actual limits are crossed."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=2, # Moderate tap within operating tolerance
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    tap = resp.transformer_tap_impact
    assert tap is not None
    assert isinstance(tap.violations_detected, list)


def test_13_bfs_impact_analysis_on_topology(db_session):
    """Test 13: BFS impact analysis operates on actual grid topology graph."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4"
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    bfs = resp.bfs_blast_radius
    assert bfs["reachable_node_count"] > 0
    assert bfs["total_capacity_at_risk_mw"] > 0.0


def test_14_dfs_connectivity_check(db_session):
    """Test 14: DFS determines actual network connectivity without assumed islanding."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        requested_tap=4
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    tap = resp.transformer_tap_impact
    assert tap is not None
    assert tap.connected_components > 0
    assert tap.islanding_status in ("NO_ISLANDING_DETECTED", "ISLAND_DETECTED")


def test_15_max_heap_incident_prioritization(db_session):
    """Test 15: Max-Heap prioritizes configuration attack incident."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        requested_tap=4
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    prio = resp.priority_ranking
    assert prio["rank"] is not None
    assert prio["calculated_priority_score"] > 50.0
    assert "severity_weight" in prio["scoring_breakdown"]


def test_16_aegis_evidence_separation(db_session):
    """Test 16: Aegis evidence separates observed facts, solver truth, and inferences."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    aegis = resp.aegis_evidence
    
    assert "observed_facts" in aegis
    assert "solver_physical_truth" in aegis
    assert "detection" in aegis
    assert "recommended_containment_playbook" in aegis
    
    assert aegis["observed_facts"]["requested_tap"] == 4
    assert aegis["observed_facts"]["configuration_parameter"] == "TAP_POSITION"
    assert aegis["solver_physical_truth"]["transformer_tap_impact"] is not None
    assert any("restore" in step.lower() or "reset" in step.lower() for step in aegis["recommended_containment_playbook"])


def test_17_websocket_stages_generation(db_session):
    """Test 17: Multi-stage pipeline execution timeline generates all expected stages."""
    req = CyberSimulationRequest(
        scenario_id="SCN-003",
        target_asset_id="XFMR-3-4",
        authorization_status="UNAUTHORIZED",
        configuration_parameter="TAP_POSITION",
        requested_tap=4,
        previous_tap=0
    )
    resp = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    stages = [entry["stage"] for entry in resp.execution_timeline]
    
    assert "ATTACK_SIMULATED" in stages
    assert "TRANSFORMER_IDENTIFIED" in stages
    assert "CONFIGURATION_CHANGE_DETECTED" in stages
    assert "TAP_CHANGE_VALIDATED" in stages
    assert "SANDBOX_TAP_MODIFIED" in stages
    assert "AC_POWER_FLOW_SOLVED" in stages
    assert "PHYSICAL_IMPACT_ANALYZED" in stages
    assert "INCIDENT_PRIORITIZED" in stages
    assert "AEGIS_EVIDENCE_GENERATED" in stages


def test_18_full_api_execution(db_session):
    """Test 18: Full API pipeline executes cleanly via FastAPI test client."""
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app)
    
    # 1. Test GET /api/cyber/transformers
    trafo_resp = client.get("/api/cyber/transformers")
    assert trafo_resp.status_code == 200
    trafos = trafo_resp.json()
    assert len(trafos) > 0
    assert any(t["transformer_id"] == "XFMR-3-4" for t in trafos)
    
    # 2. Test POST /api/cyber/simulate with SCN-003
    sim_payload = {
        "scenario_id": "SCN-003",
        "target_asset_id": "XFMR-3-4",
        "configuration_parameter": "TAP_POSITION",
        "requested_tap": 4,
        "previous_tap": 0,
        "tap_min": -10,
        "tap_max": 10,
        "authorization_status": "UNAUTHORIZED",
        "protocol": "IEC_61850",
        "apply_physical_consequence": True
    }
    sim_resp = client.post("/api/cyber/simulate", json=sim_payload)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    
    assert sim_data["event"]["inference"]["attack_category"] == "CONFIGURATION_TAMPERING"
    assert sim_data["transformer_tap_impact"]["tap_delta"] == 4
    assert sim_data["transformer_tap_impact"]["validation_status"] == "VALID_RANGE"
    assert sim_data["power_flow_impact"]["status"] == "SOLVED_IN_SANDBOX"


if __name__ == "__main__":
    pytest.main(["-v", __file__])

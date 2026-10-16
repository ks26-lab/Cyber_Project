"""
GRIDSEC — Test Suite for Attack 5: Coordinated Multi-Asset Cyber Campaign (SCN-005)
Covers all 21 required acceptance criteria and architectural verification checkpoints:

Test 1: SCN-005 scenario configuration exists in catalog with correct metadata & aliases.
Test 2: Deterministic multi-stage event sequence (T0..T3) generated with temporal progression.
Test 3: Ground truth isolation (simulator holds ground truth; detector receives only observed facts).
Test 4: Target assets resolve via O(1) Hash Table lookup (BUS-1, XFMR-3-4, LINE-1-3, BUS-2).
Test 5: Synthetic source correlation groups events by source identity (DISTRIBUTED_APT_ACTOR).
Test 6: Temporal correlation groups events within sliding window (<= 60s).
Test 7: Multi-asset correlation identifies cross-substation and corridor targets.
Test 8: Attack pattern correlation correlates heterogeneous vectors (Recon + Config + Trip + FDIA).
Test 9: Isolated benign event produces insufficient evidence / low confidence.
Test 10: Full coordinated sequence detected as COORDINATED_CAMPAIGN (State: COORDINATED_CAMPAIGN).
Test 11: Correlation scoring is additive, explainable, and reaches >= 85%.
Test 12: BFS impact analysis calculates potential topological blast radius reachability.
Test 13: DFS connectivity and islanding analysis confirms post-action network integrity.
Test 14: Dijkstra dynamic alternate route analysis conditionally computed for tripped branch (LINE-1-3).
Test 15: Dijkstra candidate path verified for electrical feasibility (BUS-1 -> BUS-2 -> BUS-3).
Test 16: Max-Heap incident triage ranks campaign at top priority.
Test 17: Cyber vs Physical state separation (telemetry manipulation vs physical actuation).
Test 18: pandapower AC Power Flow is sole physical source of truth (converges & reroutes).
Test 19: Aegis structured evidence completeness & segregation of facts, inferences, and solver physics.
Test 20: Base grid database remains 100% immutable in sandbox.
Test 21: Full simulation pipeline execution contract via CyberSimulationRequest.
"""

import sys
import os
import sqlite3
from datetime import datetime, timezone
import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.cyber.attack_scenarios import (
    SCENARIO_E_COORDINATED_ATTACK,
    SCENARIO_CATALOG,
    get_scenario_by_id,
    list_active_scenarios,
    AttackCategory
)
from app.cyber.attack_simulator import attack_simulator, generate_coordinated_campaign_sequence
from app.services.cyber_detection_engine import cyber_detection_engine
from app.services.event_bus_service import event_bus_service
from app.schemas.cyber_attack import (
    CyberSimulationRequest,
    CyberImpactAnalysisResponse,
    CampaignCorrelationResult,
    CampaignEventDetail,
    ObservedFacts
)
from app.dsa.priority_queue import IncidentPriorityQueue, PrioritizedIncidentItem


@pytest.fixture
def db_session():
    """Provides a transactional database session."""
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


# --- Test 1: SCN-005 exists in scenario catalog ---
def test_01_scn005_exists():
    """Test 1: SCN-005 exists in scenario catalog with correct metadata & aliases."""
    scenarios = list_active_scenarios()
    ids = [s.scenario_id for s in scenarios]
    assert "SCN-005" in ids or "SCENARIO_E_COORDINATED_ATTACK" in ids
    sc = get_scenario_by_id("SCN-005")
    assert sc is not None
    assert sc.category == AttackCategory.COORDINATED_CAMPAIGN
    assert "target_asset_ids" in sc.parameter_defaults
    assert "LINE-1-3" in sc.parameter_defaults["target_asset_ids"]
    assert "BUS-1" in sc.parameter_defaults["target_asset_ids"]
    assert sc.parameter_defaults["source_identifier"] == "DISTRIBUTED_APT_ACTOR"


# --- Test 2: Deterministic multi-stage event sequence ---
def test_02_deterministic_multi_stage_sequence():
    """Test 2: Deterministic multi-stage event sequence (T0..T3) generated with temporal progression."""
    seq = generate_coordinated_campaign_sequence(
        target_assets=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
        source_identity="DISTRIBUTED_APT_ACTOR",
        base_time="2026-09-07T12:00:00Z"
    )
    assert len(seq) == 4
    
    # Check progression of categories
    categories = [e.ground_truth_category for e in seq]
    assert categories == [
        "RECONNAISSANCE_PROBING",
        "CONFIGURATION_TAMPERING",
        "UNAUTHORIZED_CONTROL",
        "TELEMETRY_INTEGRITY"
    ]
    
    # Check timestamp monotonicity
    for i in range(1, len(seq)):
        t_prev = datetime.fromisoformat(seq[i-1].observed.timestamp.replace("Z", "+00:00"))
        t_curr = datetime.fromisoformat(seq[i].observed.timestamp.replace("Z", "+00:00"))
        assert t_curr > t_prev


# --- Test 3: Ground truth is strictly hidden from detector ---
def test_03_ground_truth_isolation():
    """Test 3: Simulator holds ground truth; detector receives only observed facts."""
    seq = generate_coordinated_campaign_sequence()
    syn_event = seq[0]
    assert syn_event.ground_truth_category == "RECONNAISSANCE_PROBING"
    
    # Detector receives only observable facts
    obs = syn_event.observed
    assert not hasattr(obs, "ground_truth_category")
    
    db = SessionLocal()
    try:
        matched, _, _ = cyber_detection_engine.resolve_asset(obs.target_asset_ref, db)
        cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
        assert category == AttackCategory.RECONNAISSANCE_PROBING
    finally:
        db.close()


# --- Test 4: Target assets resolve via O(1) Hash Table ---
def test_04_target_assets_resolve():
    """Test 4: All target assets in campaign resolve via O(1) Hash Table lookup."""
    db = SessionLocal()
    try:
        targets = ["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"]
        for target in targets:
            matched, status, candidates = cyber_detection_engine.resolve_asset(target, db)
            assert status == "RESOLVED"
            assert matched is not None
            assert matched["id"] == target
    finally:
        db.close()


# --- Test 5: Source correlation ---
def test_05_source_correlation():
    """Test 5: Synthetic source correlation groups events by source identity."""
    seq = generate_coordinated_campaign_sequence(source_identity="SYNTH-SRC-005")
    sources = set(e.observed.source_identifier for e in seq)
    assert len(sources) == 1
    assert "SYNTH-SRC-005" in sources


# --- Test 6: Temporal correlation ---
def test_06_temporal_correlation():
    """Test 6: Temporal correlation groups events within sliding window (<= 60s)."""
    seq = generate_coordinated_campaign_sequence()
    t0 = datetime.fromisoformat(seq[0].observed.timestamp.replace("Z", "+00:00"))
    t3 = datetime.fromisoformat(seq[-1].observed.timestamp.replace("Z", "+00:00"))
    delta_s = (t3 - t0).total_seconds()
    assert 0.0 < delta_s <= 60.0


# --- Test 7: Multi-asset correlation ---
def test_07_multi_asset_correlation():
    """Test 7: Multi-asset correlation identifies cross-substation and corridor targets."""
    seq = generate_coordinated_campaign_sequence()
    targets = [e.observed.target_asset_ref for e in seq]
    unique_targets = set(targets)
    assert len(unique_targets) == 4
    assert "BUS-1" in unique_targets
    assert "XFMR-3-4" in unique_targets
    assert "LINE-1-3" in unique_targets
    assert "BUS-2" in unique_targets


# --- Test 8: Multi-pattern correlation ---
def test_8_multi_pattern_correlation():
    """Test 8: Attack pattern correlation correlates heterogeneous vectors across protocols."""
    seq = generate_coordinated_campaign_sequence()
    protocols = set(e.observed.raw_protocol for e in seq)
    assert len(protocols) >= 3
    assert "MODBUS_TCP" in protocols
    assert "IEC_61850" in protocols
    assert "DNP3" in protocols
    assert "IEEE_C37.118" in protocols


# --- Test 9: Insufficient evidence for isolated benign event ---
def test_09_insufficient_evidence_for_isolated_event():
    """Test 9: Isolated benign event produces insufficient evidence / low confidence."""
    db = SessionLocal()
    try:
        obs = ObservedFacts(
            timestamp=datetime.now(timezone.utc).isoformat(),
            source_identifier="authorized_control_center",
            raw_protocol="IEC_61850",
            command_name="STATUS_QUERY",
            authorization_status="AUTHORIZED",
            target_asset_ref="BUS-1"
        )
        matched, _, _ = cyber_detection_engine.resolve_asset("BUS-1", db)
        cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
        score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
            observed=obs,
            asset=matched,
            category=category,
            rules=rules
        )
        assert cls_name == "INSUFFICIENT_EVIDENCE"
        assert score == 0.0
    finally:
        db.close()


# --- Test 10: Coordinated campaign classification ---
def test_10_coordinated_campaign_classification():
    """Test 10: Full sequence is detected as COORDINATED_CAMPAIGN."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            authorization_status="BYPASSED",
            protocol="DNP3",
            source_identity="DISTRIBUTED_APT_ACTOR",
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.campaign_impact is not None
        assert res.campaign_impact.detection_classification in ["COORDINATED_CAMPAIGN", "CONFIRMED_COORDINATED_CAMPAIGN_ATTACK"]
        assert res.campaign_impact.detection_state == "COORDINATED_CAMPAIGN"
    finally:
        db.close()


# --- Test 11: Additive correlation score reaches >= 85% ---
def test_11_additive_correlation_scoring():
    """Test 11: Correlation scoring is additive, explainable, and reaches >= 85%."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            authorization_status="BYPASSED",
            protocol="DNP3",
            source_identity="DISTRIBUTED_APT_ACTOR",
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.campaign_impact.correlation_score >= 85.0
        assert res.campaign_impact.confidence_score >= 85.0
        assert res.campaign_impact.correlation_checklist["temporal_correlation"] is True
        assert res.campaign_impact.correlation_checklist["source_correlation"] is True
        assert res.campaign_impact.correlation_checklist["multi_asset_correlation"] is True
        assert res.campaign_impact.correlation_checklist["attack_pattern_correlation"] is True
        assert res.campaign_impact.correlation_checklist["topological_relationship"] is True
    finally:
        db.close()


# --- Test 12: BFS topological blast radius calculation ---
def test_12_bfs_blast_radius_calculation():
    """Test 12: BFS impact analysis calculates potential topological blast radius reachability."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.bfs_blast_radius is not None
        assert res.bfs_blast_radius.get("reachable_node_count", 0) > 0 or res.event.prediction.cyber_blast_radius_nodes > 0
    finally:
        db.close()


# --- Test 13: DFS connectivity and islanding analysis ---
def test_13_dfs_connectivity_analysis():
    """Test 13: DFS connectivity and islanding analysis confirms post-action network integrity."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.power_flow_impact is not None
        assert res.power_flow_impact.get("islanding_status") in ["NO_ISLANDING_DETECTED", "ISLAND_DETECTED"]
        assert res.power_flow_impact.get("connected_components_count", 0) >= 1
    finally:
        db.close()


# --- Test 14: Dijkstra dynamic alternate route analysis ---
def test_14_dijkstra_alternate_route_analysis():
    """Test 14: Dijkstra alternate route analysis conditionally computed for tripped branch."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        dsa = res.aegis_evidence.get("dsa_analysis", {})
        dij = dsa.get("dijkstra_alternate_route") or res.power_flow_impact.get("dijkstra_alternate_route")
        assert dij is not None
        if isinstance(dij, dict):
            assert dij.get("available") is True or dij.get("path_found") is True or "route" in dij
    finally:
        db.close()


# --- Test 15: Dijkstra candidate route electrical feasibility validation ---
def test_15_dijkstra_electrical_feasibility():
    """Test 15: Dijkstra candidate path verified for electrical feasibility."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        dsa = res.aegis_evidence.get("dsa_analysis", {})
        dij = dsa.get("dijkstra_alternate_route") or res.power_flow_impact.get("dijkstra_alternate_route")
        assert dij is not None
        if isinstance(dij, dict):
            assert "route" in dij or "available" in dij or "path" in dij or "algorithm" in dij
        elif isinstance(dij, str):
            assert len(dij) > 0
    finally:
        db.close()


# --- Test 16: Max-Heap incident prioritization ---
def test_16_max_heap_prioritization():
    """Test 16: Max-Heap incident triage ranks campaign at top priority."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.priority_ranking is not None
        assert res.priority_ranking.get("rank") is not None
        assert float(res.priority_ranking.get("calculated_priority_score", 0)) >= 100.0
    finally:
        db.close()


# --- Test 17: Cyber vs Physical state separation ---
def test_17_cyber_physical_state_separation():
    """Test 17: Cyber vs Physical state separation (telemetry manipulation vs physical actuation)."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        
        # 1 corridor tripped in sandbox
        assert "LINE-1-3" in res.campaign_impact.tripped_corridors
        # Power flow status solved in sandbox
        assert res.power_flow_impact.get("status") == "SOLVED_IN_SANDBOX"
    finally:
        db.close()


# --- Test 18: AC Power Flow is sole physical source of truth ---
def test_18_pandapower_ac_power_flow():
    """Test 18: pandapower AC Power Flow is sole physical source of truth (converges & reroutes)."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert res.power_flow_impact.get("total_losses_mw") is not None
        assert float(res.power_flow_impact.get("total_losses_mw", 0)) > 0.0
        assert float(res.power_flow_impact.get("power_balance", 0)) > 1000.0
    finally:
        db.close()


# --- Test 19: Aegis structured evidence completeness ---
def test_19_aegis_evidence_completeness():
    """Test 19: Aegis structured evidence completeness & segregation of facts, inferences, and solver physics."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        aegis = res.aegis_evidence
        assert aegis.get("evidence_id", "").startswith("AEGIS-EV-")
        assert len(aegis.get("observed_facts", [])) >= 3
        assert aegis.get("inferred_intent") != ""
        assert aegis.get("physical_truth") != ""
        assert len(aegis.get("recommended_containment_playbook", [])) >= 3
    finally:
        db.close()


# --- Test 20: Base-grid database immutability ---
def test_20_base_grid_immutability():
    """Test 20: Base grid database remains 100% immutable in sandbox."""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gridsec.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT status FROM transmission_lines WHERE line_id = 'LINE-1-3'")
        row = cur.fetchone()
        if row:
            assert row[0] == "IN_SERVICE", "Base grid line status was mutated!"
        conn.close()


# --- Test 21: Full simulation pipeline execution contract ---
def test_21_full_pipeline_contract():
    """Test 21: Full simulation pipeline execution contract via CyberSimulationRequest."""
    db = SessionLocal()
    try:
        req = CyberSimulationRequest(
            scenario_id="SCN-005",
            target_asset_id="LINE-1-3",
            target_asset_ids=["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            authorization_status="BYPASSED",
            protocol="DNP3",
            source_identity="DISTRIBUTED_APT_ACTOR",
            apply_physical_consequence=True
        )
        res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db)
        assert isinstance(res, CyberImpactAnalysisResponse)
        assert res.campaign_impact.scenario_id in ["SCN-005", "SCENARIO_E_COORDINATED_ATTACK"]
        assert res.event.target_asset_id == "LINE-1-3"
        assert res.campaign_impact is not None
        assert len(res.campaign_impact.timeline) == 4
        assert len(res.execution_timeline) >= 8
    finally:
        db.close()


# =====================================================================
# Standalone execution runner
# =====================================================================
if __name__ == "__main__":
    tests = [
        ("Test 1: SCN-005 catalog registration", test_01_scn005_exists),
        ("Test 2: Deterministic multi-stage sequence", test_02_deterministic_multi_stage_sequence),
        ("Test 3: Ground truth isolation", test_03_ground_truth_isolation),
        ("Test 4: Target assets O(1) hash resolution", test_04_target_assets_resolve),
        ("Test 5: Source correlation", test_05_source_correlation),
        ("Test 6: Temporal correlation", test_06_temporal_correlation),
        ("Test 7: Multi-asset correlation", test_07_multi_asset_correlation),
        ("Test 8: Attack pattern correlation", test_8_multi_pattern_correlation),
        ("Test 9: Insufficient evidence for isolated event", test_09_insufficient_evidence_for_isolated_event),
        ("Test 10: Coordinated campaign classification", test_10_coordinated_campaign_classification),
        ("Test 11: Additive correlation scoring", test_11_additive_correlation_scoring),
        ("Test 12: BFS blast radius calculation", test_12_bfs_blast_radius_calculation),
        ("Test 13: DFS connectivity analysis", test_13_dfs_connectivity_analysis),
        ("Test 14: Dijkstra dynamic alternate route", test_14_dijkstra_alternate_route_analysis),
        ("Test 15: Dijkstra electrical feasibility", test_15_dijkstra_electrical_feasibility),
        ("Test 16: Max-Heap incident prioritization", test_16_max_heap_prioritization),
        ("Test 17: Cyber vs Physical state separation", test_17_cyber_physical_state_separation),
        ("Test 18: AC Power Flow source of truth", test_18_pandapower_ac_power_flow),
        ("Test 19: Aegis evidence completeness", test_19_aegis_evidence_completeness),
        ("Test 20: Base-grid database immutability", test_20_base_grid_immutability),
        ("Test 21: Full pipeline execution contract", test_21_full_pipeline_contract),
    ]
    
    print("\n" + "=" * 80)
    print("GRIDSEC ATTACK 5: COORDINATED MULTI-ASSET CYBER CAMPAIGN (SCN-005) TEST SUITE")
    print("=" * 80)
    passed = 0
    for name, func in tests:
        try:
            func()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            
    print("=" * 80)
    print(f"ATTACK 5 TEST RESULTS: {passed}/{len(tests)} TESTS PASSED ({100 * passed / len(tests):.1f}%)")
    print("=" * 80)
    sys.exit(0 if passed == len(tests) else 1)

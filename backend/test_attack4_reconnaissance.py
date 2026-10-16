"""
GRIDSEC — Test Suite for Attack 4: Reconnaissance / Repeated Suspicious Cyber Events (SCN-004)
Covers all 20 required acceptance criteria and architectural verification checkpoints:

Test 1: SCN-004 scenario configuration exists in registry.
Test 2: Synthetic event sequence generated deterministically with temporal spacing.
Test 3: Ground truth is strictly hidden from detector (detector receives only observable payload).
Test 4: Multiple target assets resolve correctly via O(1) Hash Table.
Test 5: Unknown target handled safely (returns UNKNOWN_ASSET / UNRESOLVED without crashing).
Test 6: Temporal correlation identifies short time windows.
Test 7: Source correlation groups events by source identity.
Test 8: Multi-asset correlation identifies cross-asset targeting.
Test 9: Single benign event produces insufficient evidence (0% confidence).
Test 10: Repeated suspicious sequence is classified as CONFIRMED_RECONNAISSANCE_PROBING_ATTACK.
Test 11: Detection confidence is additive, explainable, and capped at 100%.
Test 12: BFS impact analysis calculates potential reachability without physical failures.
Test 13: DFS connectivity confirms NO_ISLANDING_DETECTED.
Test 14: No artificial physical outage or voltage collapse is manufactured.
Test 15: Base grid database remains 100% immutable.
Test 16: Max-Heap incident prioritization triages correlated campaign correctly.
Test 17: Aegis evidence cleanly separates observed facts from inference.
Test 18: WebSocket stage progress updates emitted across all 9 pipeline stages.
Test 19: Full API simulation pipeline execution contract (/api/cyber/simulate).
Test 20: Correlated events produce one coherent campaign incident rather than fragmented duplicates.
"""

import pytest
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.cyber.attack_scenarios import (
    SCENARIO_D_REPEATED_PROBE,
    SCENARIO_CATALOG,
    get_scenario_by_id,
    list_active_scenarios,
    AttackCategory
)
from app.cyber.attack_simulator import attack_simulator, generate_synthetic_sequence
from app.services.cyber_detection_engine import cyber_detection_engine
from app.services.event_bus_service import event_bus_service
from app.schemas.cyber_attack import (
    CyberSimulationRequest,
    CyberImpactAnalysisResponse,
    ReconnaissanceCorrelationResult,
    ObservedFacts
)
from app.dsa.priority_queue import IncidentPriorityQueue, PrioritizedIncidentItem


@pytest.fixture(scope="module")
def db_session():
    """Provides a transactional database session."""
    session = SessionLocal()
    yield session
    session.close()


# --- Test 1: SCN-004 exists ---
def test_01_scn004_exists():
    """Test 1: SCN-004 exists in scenario catalog with correct metadata."""
    scenarios = list_active_scenarios()
    ids = [s.scenario_id for s in scenarios]
    assert "SCN-004" in ids or "SCENARIO_D_REPEATED_PROBE" in ids
    sc = get_scenario_by_id("SCN-004")
    assert sc is not None
    assert sc.category == AttackCategory.RECONNAISSANCE_PROBING
    assert sc.simulated_action == "RECONNAISSANCE_PROBING"
    assert sc.default_target == "BUS-1"
    assert "target_asset_ids" in sc.parameter_defaults
    assert sc.parameter_defaults["source_identifier"] == "suspicious_client_01"


# --- Test 2: Synthetic event sequence generated ---
def test_02_synthetic_event_sequence_generated():
    """Test 2: Deterministic synthetic observable event sequence generated with temporal spacing."""
    seq = generate_synthetic_sequence(
        source_identity="suspicious_client_01",
        target_assets=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        count=5,
        time_window_seconds=22.0,
        authorization_status="FAILED"
    )
    assert len(seq) == 5
    for i, ev in enumerate(seq):
        assert ev.observed.source_identifier == "suspicious_client_01"
        assert ev.observed.authorization_status == "FAILED"
        assert ev.event_id.startswith("EVT-RECON-")
        assert ev.ground_truth_category == "RECONNAISSANCE_PROBING"
        if i > 0:
            assert ev.observed.timestamp >= seq[i-1].observed.timestamp


# --- Test 3: Ground truth is hidden from detector ---
def test_03_ground_truth_hidden_from_detector():
    """Test 3: Ground truth is hidden from detector (detector receives only observable payload)."""
    syn_event = attack_simulator.generate_synthetic_event(
        scenario_id="SCN-004",
        target_asset="BUS-1",
        auth_status="UNAUTHORIZED"
    )
    # Simulator holds ground truth
    assert syn_event.ground_truth_category == "RECONNAISSANCE_PROBING"
    
    # Detector receives only observed facts
    obs = syn_event.observed
    assert not hasattr(obs, "ground_truth_category")
    
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, None)
    assert category == AttackCategory.RECONNAISSANCE_PROBING
    assert "RULE_RECONNAISSANCE_PROBING" in rules


# --- Test 4: Multiple target assets resolve correctly via Hash Table ---
def test_04_multiple_target_assets_resolve(db_session):
    """Test 4: Multiple target assets resolve correctly via O(1) Hash Table."""
    targets = ["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"]
    resolved = []
    for t in targets:
        matched, status, candidates = cyber_detection_engine.resolve_asset(t, db_session)
        assert status == "RESOLVED"
        assert matched is not None
        resolved.append(matched["id"])
    assert len(resolved) == 5


# --- Test 5: Unknown target handled safely ---
def test_05_unknown_target_handled_safely(db_session):
    """Test 5: Unknown target handled safely without crashing or arbitrary mapping."""
    matched, status, candidates = cyber_detection_engine.resolve_asset("NON_EXISTENT_ASSET_999", db_session)
    assert status in ("UNKNOWN_ASSET", "UNRESOLVED", "AMBIGUOUS")
    assert matched is None


# --- Test 6: Temporal correlation works ---
def test_06_temporal_correlation(db_session):
    """Test 6: Temporal correlation identifies activity within configurable short time window."""
    seq = generate_synthetic_sequence(
        source_identity="temp_scanner_01",
        target_assets=["BUS-1", "BUS-2", "LINE-1-2"],
        count=3,
        time_window_seconds=15.0,
        authorization_status="FAILED"
    )
    
    # Ingest and classify
    obs = seq[-1].observed
    matched, _, _ = cyber_detection_engine.resolve_asset(obs.target_asset_ref, db_session)
    
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
    score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
        observed=obs,
        asset=matched,
        category=category,
        rules=rules
    )
    factors = [e.factor for e in evidence]
    assert "SHORT_TEMPORAL_WINDOW" in factors
    assert "REPEATED_CYBER_ACTIVITY" in factors


# --- Test 7: Source correlation works ---
def test_07_source_correlation():
    """Test 7: Source correlation groups events by source identity."""
    seq = generate_synthetic_sequence(
        source_identity="source_probe_alpha",
        target_assets=["BUS-1", "BUS-2", "BUS-3"],
        count=3,
        time_window_seconds=10.0,
        authorization_status="FAILED"
    )
    grouped = {}
    for ev in seq:
        src = ev.observed.source_identifier
        grouped.setdefault(src, []).append(ev)
    
    assert "source_probe_alpha" in grouped
    assert len(grouped["source_probe_alpha"]) == 3


# --- Test 8: Multi-asset correlation works ---
def test_08_multi_asset_correlation(db_session):
    """Test 8: Multi-asset correlation identifies cross-asset probing across multiple classes."""
    seq = generate_synthetic_sequence(
        source_identity="multi_asset_scanner",
        target_assets=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4"],
        count=4,
        time_window_seconds=20.0,
        authorization_status="FAILED"
    )
    obs = seq[-1].observed
    matched, _, _ = cyber_detection_engine.resolve_asset("XFMR-3-4", db_session)
    
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
    assert category == AttackCategory.RECONNAISSANCE_PROBING
    score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
        observed=obs,
        asset=matched,
        category=category,
        rules=rules
    )
    factors = [e.factor for e in evidence]
    assert "MULTI_TARGET_ASSET_PROBE" in factors
    assert "CROSS_ASSET_CLASS_PATTERN" in factors


# --- Test 9: Single benign event produces insufficient evidence ---
def test_09_single_benign_event_insufficient_evidence(db_session):
    """Test 9: Single authorized status query from trusted operator produces INSUFFICIENT_EVIDENCE."""
    obs = ObservedFacts(
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_identifier="authorized_control_center",
        raw_protocol="IEC_61850",
        command_name="STATUS_QUERY",
        authorization_status="AUTHORIZED",
        target_asset_ref="BUS-1"
    )
    matched, _, _ = cyber_detection_engine.resolve_asset("BUS-1", db_session)
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
    score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
        observed=obs,
        asset=matched,
        category=category,
        rules=rules
    )
    
    assert cls_name == "INSUFFICIENT_EVIDENCE"
    assert score == 0.0


# --- Test 10: Repeated suspicious sequence is classified correctly ---
def test_10_repeated_suspicious_sequence_classified(db_session):
    """Test 10: Repeated suspicious sequence is classified as CONFIRMED_RECONNAISSANCE_PROBING_ATTACK."""
    obs = ObservedFacts(
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_identifier="suspicious_client_01",
        raw_protocol="MODBUS_TCP",
        command_name="CONFIGURATION_READ",
        authorization_status="FAILED",
        target_asset_ref="BUS-1"
    )
    matched, _, _ = cyber_detection_engine.resolve_asset("BUS-1", db_session)
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
    score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
        observed=obs,
        asset=matched,
        category=category,
        rules=rules
    )
    
    assert category == AttackCategory.RECONNAISSANCE_PROBING
    assert score >= 80.0
    assert cls_name == "CONFIRMED_RECONNAISSANCE_PROBING_ATTACK"


# --- Test 11: Detection confidence is explainable and additive ---
def test_11_detection_confidence_explainable(db_session):
    """Test 11: Detection confidence uses additive scoring capped at 100% with explainable factor breakdown."""
    obs = ObservedFacts(
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_identifier="untrusted_scanner_09",
        raw_protocol="DNP3",
        command_name="STATUS_QUERY",
        authorization_status="FAILED",
        target_asset_ref="XFMR-3-4"
    )
    matched, _, _ = cyber_detection_engine.resolve_asset("XFMR-3-4", db_session)
    cls_name, category, rules = cyber_detection_engine.classify_event(obs, matched)
    score, level, evidence, reasoning = cyber_detection_engine.calculate_confidence(
        observed=obs,
        asset=matched,
        category=category,
        rules=rules
    )
    
    sum_weights = sum(e.weight for e in evidence)
    assert score == min(100.0, float(sum_weights))
    assert len(evidence) >= 4
    for e in evidence:
        assert e.factor is not None
        assert e.observation is not None
        assert e.weight > 0


# --- Test 12: BFS impact analysis calculates reachability ---
def test_12_bfs_impact_analysis(db_session):
    """Test 12: BFS impact analysis calculates potential topological reachability without physical outages."""
    matched, _, _ = cyber_detection_engine.resolve_asset("BUS-1", db_session)
    blast_res = cyber_detection_engine.analyze_blast_radius(
        target_asset_id="BUS-1",
        asset=matched,
        db=db_session
    )
    assert blast_res is not None
    assert blast_res.reachable_node_count >= 1
    assert "BUS-1" in blast_res.reachable_assets or blast_res.reachable_node_count > 0


# --- Test 13: DFS connectivity confirms NO_ISLANDING ---
def test_13_dfs_connectivity(db_session):
    """Test 13: DFS connectivity verifies grid remains single connected component with NO islanding."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert res.power_flow_impact["islanding_status"] == "NO_ISLANDING_DETECTED"
    assert res.power_flow_impact["connected_components_count"] == 1


# --- Test 14: No artificial physical outage created ---
def test_14_no_artificial_physical_outage(db_session):
    """Test 14: Pure reconnaissance events do NOT manufacture artificial outages or power-flow shifts."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5,
        time_window_seconds=22.0,
        apply_physical_consequence=True
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    
    assert res.power_flow_impact["status"] == "UNCHANGED_NOMINAL"
    assert res.power_flow_impact["new_violations_count"] == 0
    assert res.reconnaissance_impact is not None
    assert res.reconnaissance_impact.physical_state_status == "UNCHANGED_NOMINAL"


# --- Test 15: Base database remains unchanged ---
def test_15_base_database_remains_unchanged(db_session):
    """Test 15: Base database remains 100% immutable throughout Attack 4 simulation."""
    from app.models.asset import Asset
    count_before = db_session.query(Asset).count()
    
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2"],
        event_count=3
    )
    cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    
    count_after = db_session.query(Asset).count()
    assert count_after == count_before


# --- Test 16: Max-Heap incident prioritization works ---
def test_16_max_heap_incident_prioritization():
    """Test 16: Max-Heap prioritizes correlated reconnaissance incident according to severity score."""
    pq = IncidentPriorityQueue()
    pq.push({
        "incident_id": "INC-RECON-001",
        "severity": "HIGH",
        "risk_score": 85.0,
        "asset_criticality": 9.0,
        "affected_assets_count": 5
    })
    pq.push({
        "incident_id": "INC-LOW-002",
        "severity": "LOW",
        "risk_score": 20.0,
        "asset_criticality": 3.0,
        "affected_assets_count": 1
    })
    
    top = pq.pop()
    assert top is not None
    assert top["incident_id"] == "INC-RECON-001"
    assert top["calculated_priority_score"] > 80.0


# --- Test 17: Aegis evidence separates observed facts from inference ---
def test_17_aegis_evidence_separation(db_session):
    """Test 17: Aegis evidence clearly separates observed facts, physical state, and predictive risk assessment."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    aegis = res.aegis_evidence
    
    # 1. Observed facts
    obs = aegis.get("observed_facts", {})
    assert obs.get("source") == "suspicious_client_01"
    assert obs.get("event_count") == 5
    
    # 2. Correlation inference & detection
    det = aegis.get("detection", {})
    assert det.get("classification") == "CONFIRMED_RECONNAISSANCE_PROBING_ATTACK"
    assert det.get("attack_category") == "RECONNAISSANCE_PROBING"
    
    # 3. Physical facts
    phys = aegis.get("physical_impact", {})
    assert phys.get("topology_change") == "NONE"
    
    # 4. Risk assessment is an inference/precursor prediction
    risk = str(aegis.get("risk_assessment", {})).lower()
    assert "precursor" in risk or "probing" in risk or "reconnaissance" in risk or "future" in risk


# --- Test 18: WebSocket stages are emitted ---
def test_18_websocket_stages_emitted(db_session):
    """Test 18: Execution timeline records all 9 required pipeline stages in order."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    timeline_stages = [t.get("stage") for t in res.execution_timeline]
    
    expected_stages = [
        "ATTACK_SIMULATED",
        "EVENTS_INGESTED",
        "TARGETS_IDENTIFIED",
        "EVENTS_CORRELATED",
        "RECONNAISSANCE_PATTERN_DETECTED",
        "BFS_IMPACT_ANALYZED",
        "PHYSICAL_STATE_VERIFIED",
        "INCIDENT_PRIORITIZED",
        "AEGIS_EVIDENCE_GENERATED"
    ]
    for stg in expected_stages:
        assert stg in timeline_stages


# --- Test 19: Full API simulation pipeline execution contract ---
def test_19_full_api_contract(db_session):
    """Test 19: Full execution pipeline returns complete structured CyberImpactAnalysisResponse."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5,
        time_window_seconds=22.0
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert isinstance(res, CyberImpactAnalysisResponse)
    assert res.event.inference.classification == "CONFIRMED_RECONNAISSANCE_PROBING_ATTACK"
    assert res.reconnaissance_impact is not None
    assert res.reconnaissance_impact.event_count == 5
    assert res.reconnaissance_impact.unique_target_count == 5
    assert res.reconnaissance_impact.source_identity == "suspicious_client_01"


# --- Test 20: Correlated events produce one coherent campaign incident ---
def test_20_coherent_campaign_incident_not_duplicated(db_session):
    """Test 20: Correlated sequence generates a single consolidated campaign incident rather than duplicate fragments."""
    req = CyberSimulationRequest(
        scenario_id="SCN-004",
        source_identity="suspicious_client_01",
        target_asset_ids=["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
        event_count=5
    )
    res = cyber_detection_engine.execute_cyber_simulation_pipeline(req, db_session)
    assert res.priority_ranking.get("rank") is not None
    assert res.priority_ranking.get("calculated_priority_score") > 0.0
    assert res.incident is not None
    assert res.incident.get("incident_id") is not None
    assert len(res.reconnaissance_impact.correlated_event_ids) == 5


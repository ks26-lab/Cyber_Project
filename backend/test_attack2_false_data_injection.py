"""
Test Suite for GRIDSEC Attack 2: False Data Injection Attack (FDIA) / Telemetry Integrity Attack.
Verifies:
1. Synthetic FDIA event generation with configurable manipulation factor
2. Ground-truth isolation from Detection Engine
3. Telemetry manipulated while AC solver physical state remains unchanged
4. Hash-based asset identification (O(1) lookup)
5. Cyber-Physics consistency calculation (reported vs solver expected)
6. Additive detection evidence scoring for physics mismatch
7. Normal / low-deviation telemetry handling (not flagged as false attack)
8. Safe handling of unknown / unmapped telemetry assets
9. Production database immutability
10. BFS potential topological reachability analysis
11. DFS connectivity verification (no false islanding reported)
12. Max-Heap incident prioritization
13. Aegis structured evidence segregation (Observed vs Solver-Derived vs Derived)
14. Real-time WebSocket pipeline update tracking
15. End-to-end simulation API payload execution
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.models.asset import Asset
from app.models.incident import Incident
from app.schemas.cyber_attack import (
    AttackCategory,
    CyberSimulationRequest,
    SyntheticCyberEvent,
    ObservedFacts
)
from app.cyber.attack_scenarios import PREDEFINED_SCENARIOS, ScenarioCatalog
from app.cyber.attack_simulator import attack_simulator
from app.services.cyber_detection_engine import cyber_detection_engine
from app.services.simulation_state_service import simulation_state_service


class TestAttack2FalseDataInjection(unittest.TestCase):
    """Formal test suite for Attack 2: False Data Injection / Telemetry Integrity Attack."""

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_synthetic_fdia_event_generation(self):
        """Test 1: Synthetic FDIA event is generated with specified or calculated manipulation."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=300.0,
            expected_baseline_value=500.0,
            manipulation_factor=0.60
        )
        event = attack_simulator.generate_synthetic_event(req)
        self.assertIsInstance(event, SyntheticCyberEvent)
        self.assertEqual(event.target_asset, "BUS-2")
        self.assertEqual(event.observed.reported_value, 300.0)
        self.assertEqual(event.observed.expected_baseline_value, 500.0)
        self.assertEqual(event.observed.discrepancy_magnitude, 200.0)
        self.assertEqual(event.observed.relative_error_pct, 40.0)
        print(f"\n[TEST 1] Synthetic FDIA Event Generated: Reported={event.observed.reported_value} MW, Baseline={event.observed.expected_baseline_value} MW, Dev={event.observed.relative_error_pct}%")

    def test_02_ground_truth_isolation(self):
        """Test 2: Ground truth attack label is hidden from the detection engine."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2"
        )
        synthetic = attack_simulator.generate_synthetic_event(req)
        self.assertEqual(synthetic.ground_truth_category, "TELEMETRY_INTEGRITY")
        
        # Detector ingests ONLY observable facts
        event_id, observed, sim_id = cyber_detection_engine.ingest_event(synthetic)
        self.assertNotIn("ground_truth_category", observed.model_dump())
        self.assertNotIn("attack_type", observed.model_dump())
        print("\n[TEST 2] Ground Truth Isolation Verified: Detector ingests purely empirical observations.")

    def test_03_telemetry_manipulated_while_solver_state_unchanged(self):
        """Test 3: Telemetry changes but underlying pandapower solver state remains unchanged."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=300.0,
            expected_baseline_value=500.0,
            apply_physical_consequence=False
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        pf = analysis.power_flow_impact
        self.assertIsNotNone(pf)
        self.assertEqual(pf["status"], "UNCHANGED_NOMINAL")
        self.assertEqual(pf["topology_change"], "NONE")
        self.assertEqual(pf["physical_asset_failure"], "NONE")
        self.assertEqual(pf["new_violations_count"], 0)
        self.assertEqual(pf["islanding_status"], "NO_ISLANDING_DETECTED")
        print(f"\n[TEST 3] Physical Truth Verified: Telemetry={pf['telemetry_status']} | Topology={pf['topology_change']} | Violations={pf['new_violations_count']}")

    def test_04_target_asset_resolved_via_hash_table(self):
        """Test 4: Correct target asset resolved via O(1) Hash Table."""
        matched, status, _ = cyber_detection_engine.resolve_asset("BUS-2", self.db)
        self.assertEqual(status, "RESOLVED")
        self.assertIsNotNone(matched)
        self.assertEqual(matched["id"], "BUS-2")
        print(f"\n[TEST 4] Asset Resolved: {matched['name']} (Type: {matched.get('type')}) via Hash Index.")

    def test_05_cyber_physics_consistency_calculation(self):
        """Test 5: Cyber-Physics consistency calculation computes exact absolute and relative errors."""
        obs = ObservedFacts(
            reported_value=300.0,
            expected_baseline_value=500.0,
            measurement_type="ACTIVE_POWER_MW"
        )
        consistency = cyber_detection_engine.check_cyber_physics_consistency("BUS-2", obs, threshold_pct=10.0)
        self.assertIsNotNone(consistency)
        self.assertEqual(consistency.absolute_error, 200.0)
        self.assertEqual(consistency.relative_error_percent, 40.0)
        self.assertFalse(consistency.is_consistent)
        self.assertEqual(consistency.violation_status, "INCONSISTENT")
        print(f"\n[TEST 5] Consistency Check: Reported={consistency.reported_telemetry_value} vs Solver={consistency.solver_expected_value} -> Dev={consistency.relative_error_percent}% [{consistency.violation_status}]")

    def test_06_large_deviation_produces_detection_evidence(self):
        """Test 6: Large telemetry deviation (>20%) produces high-confidence detection evidence."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=250.0,
            expected_baseline_value=500.0,
            authorization_status="UNVERIFIED"
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        inf = analysis.event.inference
        self.assertIn(inf.classification, ["CONFIRMED_TELEMETRY_INTEGRITY_ATTACK", "POSSIBLE_FALSE_DATA_INJECTION"])
        self.assertGreaterEqual(inf.detection_confidence, 60.0)
        
        evidence_factors = [e.factor for e in inf.evidence]
        self.assertIn("PHYSICS_TELEMETRY_RESIDUAL_HIGH", evidence_factors)
        print(f"\n[TEST 6] Large Deviation Detection: Classification={inf.classification} | Confidence={inf.detection_confidence}% | Evidence={evidence_factors}")

    def test_07_normal_telemetry_does_not_flag_attack(self):
        """Test 7: Normal / low-deviation telemetry (<5% error) with authorized source is not flagged as attack."""
        obs = ObservedFacts(
            reported_value=502.0,
            expected_baseline_value=500.0,
            authorization_status="AUTHORIZED",
            source_identifier="AUTHENTICATED_RTU_GATEWAY",
            command_name="PERIODIC_ANALOG_REPORT"
        )
        norm_obs = cyber_detection_engine.normalize_event(obs)
        matched, _, _ = cyber_detection_engine.resolve_asset("BUS-2", self.db)
        cls_name, cat, rules = cyber_detection_engine.classify_event(norm_obs, matched)
        conf, level, _, _ = cyber_detection_engine.calculate_confidence(norm_obs, matched, cat, rules)
        
        self.assertNotEqual(cls_name, "CONFIRMED_TELEMETRY_INTEGRITY_ATTACK")
        self.assertLess(conf, 30.0)
        self.assertEqual(level, "LOW")
        print(f"\n[TEST 7] Normal Telemetry Verified: Discrepancy=2.0 MW (0.4%) -> Class={cls_name}, Confidence={conf}% (LOW)")

    def test_08_unknown_asset_handling(self):
        """Test 8: Unknown target asset does not crash and returns UNKNOWN_ASSET safely."""
        matched, status, _ = cyber_detection_engine.resolve_asset("INVALID_SENSOR_CORRIDOR_XYZ", self.db)
        self.assertEqual(status, "UNKNOWN_ASSET")
        self.assertIsNone(matched)
        print("\n[TEST 8] Unknown Asset Handled: Gracefully resolved status UNKNOWN_ASSET.")

    def test_09_production_database_immutability(self):
        """Test 9: Production/reference database assets remain untouched during FDIA simulation."""
        initial_assets = self.db.query(Asset).all()
        initial_statuses = {a.asset_id: (a.status, a.security_status) for a in initial_assets}
        
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=100.0,
            expected_baseline_value=500.0
        )
        cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        
        post_assets = self.db.query(Asset).all()
        post_statuses = {a.asset_id: (a.status, a.security_status) for a in post_assets}
        self.assertEqual(initial_statuses, post_statuses)
        print("\n[TEST 9] Base Grid Database Immutability Confirmed: 0 production records altered.")

    def test_10_bfs_topological_blast_radius(self):
        """Test 10: BFS calculates potential topological reachability without assuming physical damage."""
        blast = cyber_detection_engine.analyze_blast_radius("BUS-2", None, self.db)
        self.assertGreater(blast.reachable_node_count, 0)
        self.assertGreater(blast.total_capacity_at_risk_mw, 0.0)
        self.assertIn("BFS", blast.algorithm)
        print(f"\n[TEST 10] BFS Topological Reachability: Reachable Nodes={blast.reachable_node_count}, Capacity At Risk={blast.total_capacity_at_risk_mw} MW")

    def test_11_dfs_no_false_islanding(self):
        """Test 11: DFS correctly verifies that pure telemetry injection causes NO network islanding."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2"
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        pf = analysis.power_flow_impact
        self.assertEqual(pf["islanding_status"], "NO_ISLANDING_DETECTED")
        self.assertEqual(pf["connected_components_count"], 1)
        print(f"\n[TEST 11] DFS Islanding Check: Islanding={pf['islanding_status']} | Components={pf['connected_components_count']}")

    def test_12_max_heap_incident_priority(self):
        """Test 12: Max-Heap incident prioritization scores and ranks telemetry attack."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=200.0,
            expected_baseline_value=500.0
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        inc = analysis.incident
        prio = analysis.priority_ranking
        self.assertIsNotNone(inc)
        self.assertIsNotNone(prio["rank"])
        self.assertGreater(prio["calculated_priority_score"], 0.0)
        print(f"\n[TEST 12] Max-Heap Priority: Rank #{prio['rank']} | Score={prio['calculated_priority_score']} | Severity={inc['severity']}")

    def test_13_aegis_evidence_segregation(self):
        """Test 13: Aegis evidence strictly separates Observed, Solver Truth, Consistency, and Predictions."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2",
            reported_value=300.0,
            expected_baseline_value=500.0
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        aegis = analysis.aegis_evidence
        
        self.assertIn("observed_facts", aegis)
        self.assertIn("solver_physical_truth", aegis)
        self.assertIn("cyber_physics_consistency", aegis)
        self.assertIn("detection", aegis)
        self.assertIn("physical_impact", aegis)
        
        obs = aegis["observed_facts"]
        solver = aegis["solver_physical_truth"]
        self.assertEqual(obs["reported_telemetry"], 300.0)
        self.assertEqual(solver["expected_value"], 500.0)
        self.assertEqual(solver["topology_state"], "INTACT")
        self.assertEqual(aegis["physical_impact"]["topology_change"], "NONE")
        print("\n[TEST 13] Aegis Evidence Segregation: Observed Facts vs Physical Truth strictly decoupled.")

    def test_14_websocket_stage_telemetry(self):
        """Test 14: Execution timeline records required Attack 2 pipeline stages."""
        req = CyberSimulationRequest(
            scenario_id="SCN-002",
            target_asset_id="BUS-2"
        )
        analysis = cyber_detection_engine.execute_cyber_simulation_pipeline(req, self.db)
        recorded_stages = [t["stage"] for t in analysis.execution_timeline]
        
        expected_stages = [
            "ATTACK_SIMULATED",
            "TELEMETRY_TARGET_IDENTIFIED",
            "FALSE_DATA_INJECTED",
            "PHYSICS_CONSISTENCY_CHECKED",
            "ANOMALY_CLASSIFIED",
            "CONFIDENCE_CALCULATED",
            "BFS_IMPACT_ANALYZED",
            "PHYSICAL_STATE_VERIFIED",
            "INCIDENT_PRIORITIZED",
            "AEGIS_EVIDENCE_GENERATED"
        ]
        for stage in expected_stages:
            self.assertIn(stage, recorded_stages, f"Missing pipeline stage: {stage}")
        print(f"\n[TEST 14] WebSocket Stage Progression: Verified {len(recorded_stages)} pipeline stages ({' -> '.join(recorded_stages[:5])}...)")

    def test_15_api_scenario_alias_resolution(self):
        """Test 15: SCN-002, SCENARIO_2, ATTACK_2, and SCENARIO_B_TELEMETRY_ANOMALY aliases all resolve properly."""
        for alias in ["SCN-002", "SCENARIO_2", "ATTACK_2", "SCENARIO_B_TELEMETRY_ANOMALY", "FDIA"]:
            scen = ScenarioCatalog.get_scenario(alias)
            self.assertIsNotNone(scen, f"Failed to resolve alias: {alias}")
            self.assertEqual(scen.category, AttackCategory.TELEMETRY_INTEGRITY)
        print("\n[TEST 15] Scenario Catalog Alias Resolution: SCN-002/ATTACK_2 aliases verified.")


if __name__ == "__main__":
    print("=" * 80)
    print("RUNNING GRIDSEC ATTACK 2: FALSE DATA INJECTION / TELEMETRY INTEGRITY TEST SUITE")
    print("=" * 80)
    unittest.main()

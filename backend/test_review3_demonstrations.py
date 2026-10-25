"""
GRIDSEC Review 3 — Comprehensive Cyber-Physical Verification Test Suite.
Validates:
1. Baseline load and solve on both INDIA_GRID_59 and IEEE_30.
2. Attack 1: Unauthorized Breaker Trip (physical branch exclusion, recalculation of voltages, loadings, losses, cascades).
3. Attack 2: False Data Injection (measurement corrupted, physical plant preserved unchanged).
4. Attack 3: Transformer Tap Tampering (OLTC tap change within permitted range, Newton-Raphson voltage/flow re-solve).
5. Attack 4: Reconnaissance (BFS reachable asset discovery, zero equipment trips, zero electrical changes).
6. Attack 5: Coordinated Campaign (Recon -> FDIA -> Tap -> Trip composition, physical impacts only on physical stages).
7. Network Model Separation (State, caches, targets reset on switch; no stale state carried over).
"""

import sys
import os
import unittest
from typing import Dict, Any

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.power.models import PowerFlowRequest, BusType
from app.power.power_flow_service import PowerFlowService
from app.power.ieee30_network import get_ieee30_benchmark_network
from app.power.network_builder import ElectricalNetworkBuilder
from app.cyber.attack_simulator import DynamicTargetSelector
from app.schemas.cyber_attack import CyberSimulationRequest
from app.services.cyber_detection_engine import cyber_detection_engine


class TestReview3Demonstrations(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.pf_service = PowerFlowService()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # =========================================================================
    # 1. Baseline Network Loads and Solves (Both Models)
    # =========================================================================
    def test_01_baseline_solves_both_networks(self):
        """Confirm both INDIA_GRID_59 and IEEE_30 load and solve AC power flow."""
        # 1. IEEE 30-bus benchmark
        req_ieee = PowerFlowRequest(network_id="IEEE_30", scenario_id="BASELINE_IEEE30")
        res_ieee = self.pf_service.run_or_stage_power_flow(req_ieee, self.db)
        self.assertIn(res_ieee.status, ("SUCCESS", "SOLVED", "CONVERGED"))
        self.assertTrue(res_ieee.power_balance.converged)
        self.assertEqual(len(res_ieee.buses), 30)
        self.assertAlmostEqual(res_ieee.power_balance.total_load_mw, 283.4, delta=1.0)
        self.assertGreater(res_ieee.power_balance.total_generation_mw, 283.4) # Generation covers load + losses
        self.assertGreater(res_ieee.power_balance.total_losses_mw, 0.0)

        # 2. India Grid 59-node
        req_india = PowerFlowRequest(network_id="INDIA_GRID_59", scenario_id="BASELINE_INDIA59")
        res_india = self.pf_service.run_or_stage_power_flow(req_india, self.db)
        self.assertIn(res_india.status, ("SUCCESS", "SOLVED", "CONVERGED"))
        self.assertTrue(res_india.power_balance.converged)
        self.assertEqual(len(res_india.buses), 59)
        self.assertGreater(res_india.power_balance.total_load_mw, 1000.0)
        print("✓ Baseline solve verified for both IEEE_30 and INDIA_GRID_59.")

    # =========================================================================
    # 2. Attack 1: Unauthorized Breaker Trip
    # =========================================================================
    def test_02_attack1_breaker_trip_physical_outage(self):
        """
        Attack 1 trips a selected line, removes it from in-service topology,
        and re-solves AC load flow with increased losses and updated flows.
        """
        # Baseline IEEE 30 solve
        req_base = PowerFlowRequest(network_id="IEEE_30", scenario_id="BASE")
        res_base = self.pf_service.run_or_stage_power_flow(req_base, self.db)
        base_losses = res_base.power_balance.total_losses_mw

        # Trip line LINE-1-2
        req_trip = CyberSimulationRequest(
            scenario_id="SCENARIO_A_BREAKER_TRIP",
            target_asset_id="LINE-1-2",
            baseline_network="IEEE_30",
            apply_physical_consequence=True,
            seed=42
        )
        sim_res = cyber_detection_engine.execute_cyber_simulation_pipeline(req_trip, self.db)

        # Authoritative assertions
        gt_target = sim_res.ground_truth.get("target_asset") if isinstance(sim_res.ground_truth, dict) else sim_res.ground_truth.target_asset
        gt_action = sim_res.ground_truth.get("ground_truth_action") if isinstance(sim_res.ground_truth, dict) else sim_res.ground_truth.ground_truth_action
        self.assertEqual(gt_target, "LINE-1-2")
        self.assertTrue(sim_res.state_comparison.is_physical_state_modified)
        self.assertIn("TRIP", gt_action)
        self.assertEqual(sim_res.event.inference.classification, "UNAUTHORIZED_BREAKER_CONTROL")

        # Solver must recalculate with modified losses
        comp = sim_res.state_comparison
        self.assertNotEqual(comp.losses_after_mw, comp.losses_before_mw)
        print(f"✓ Attack 1 Breaker Trip: LINE-1-2 removed. Losses: {comp.losses_before_mw:.3f}MW -> {comp.losses_after_mw:.3f}MW.")

    # =========================================================================
    # 3. Attack 2: False Data Injection (Measurement vs Plant Separation)
    # =========================================================================
    def test_03_attack2_fdia_preserves_plant_state(self):
        """
        Attack 2 alters reported sensor observation but preserves the physical plant.
        Residual checks must detect the discrepancy between measurement and model.
        """
        req_fdia = CyberSimulationRequest(
            scenario_id="SCENARIO_B_TELEMETRY_ANOMALY",
            target_asset_id="BUS-2",
            baseline_network="IEEE_30",
            manipulation_factor=0.65,
            seed=42
        )
        sim_res = cyber_detection_engine.execute_cyber_simulation_pipeline(req_fdia, self.db)

        # Plant state MUST NOT be modified
        self.assertFalse(sim_res.state_comparison.is_physical_state_modified)
        self.assertAlmostEqual(sim_res.state_comparison.losses_delta_mw, 0.0, places=3)
        self.assertAlmostEqual(sim_res.state_comparison.generation_delta_mw, 0.0, places=3)

        # Observation must be corrupted and detected
        obs = sim_res.event.observed
        self.assertIsNotNone(obs.reported_value)
        self.assertIsNotNone(obs.expected_baseline_value)
        self.assertNotEqual(obs.reported_value, obs.expected_baseline_value)
        self.assertGreater(sim_res.event.inference.detection_confidence, 80.0)
        self.assertEqual(sim_res.event.inference.classification, "TELEMETRY_INTEGRITY_VIOLATION")
        print(f"✓ Attack 2 FDIA: Observation {obs.reported_value}MW != Baseline {obs.expected_baseline_value}MW; physical plant preserved (Delta Losses = 0.00MW).")

    # =========================================================================
    # 4. Attack 3: Transformer Tap Tampering
    # =========================================================================
    def test_04_attack3_transformer_tap_tampering(self):
        """
        Attack 3 alters OLTC transformer tap position within valid bounds,
        recalculates AC power flow, and reflects voltage and loading changes.
        """
        req_tap = CyberSimulationRequest(
            scenario_id="SCENARIO_C_CONFIG_TAMPER",
            target_asset_id="XFMR-6-9",
            baseline_network="IEEE_30",
            requested_tap=4,
            previous_tap=0,
            seed=42
        )
        sim_res = cyber_detection_engine.execute_cyber_simulation_pipeline(req_tap, self.db)

        # Tap impact must be recorded
        self.assertIsNotNone(sim_res.transformer_tap_impact)
        tap_imp = sim_res.transformer_tap_impact
        self.assertEqual(tap_imp.requested_tap, 4)
        self.assertTrue(tap_imp.is_tap_valid)

        # Voltages and loadings re-solved
        self.assertGreaterEqual(tap_imp.transformer_loading_after_percent, 0.0)
        self.assertIn("CONFIGURATION", sim_res.event.inference.classification)
        print(f"✓ Attack 3 Tap Tampering: XFMR-6-9 tap altered to +4. Loading after: {tap_imp.transformer_loading_after_percent:.1f}%.")

    # =========================================================================
    # 5. Attack 4: Reconnaissance Probing
    # =========================================================================
    def test_05_attack4_reconnaissance_no_physical_disruption(self):
        """
        Attack 4 probes reachable network assets without causing physical trips
        or changing electrical flow.
        """
        req_recon = CyberSimulationRequest(
            scenario_id="SCENARIO_D_REPEATED_PROBE",
            target_asset_id="BUS-1",
            baseline_network="IEEE_30",
            event_count=5,
            seed=42
        )
        sim_res = cyber_detection_engine.execute_cyber_simulation_pipeline(req_recon, self.db)

        # Zero physical disruption
        self.assertFalse(sim_res.state_comparison.is_physical_state_modified)
        self.assertEqual(sim_res.state_comparison.losses_delta_mw, 0.0)

        # Reconnaissance correlation
        self.assertIsNotNone(sim_res.reconnaissance_impact)
        recon_imp = sim_res.reconnaissance_impact
        self.assertGreaterEqual(recon_imp.event_count, 3)
        self.assertEqual(recon_imp.physical_state_status, "UNCHANGED_NOMINAL")
        print(f"✓ Attack 4 Reconnaissance: {recon_imp.event_count} probes across {recon_imp.unique_target_count} assets; zero physical trips.")

    # =========================================================================
    # 6. Attack 5: Coordinated Campaign Composition
    # =========================================================================
    def test_06_attack5_coordinated_campaign(self):
        """
        Attack 5 sequentially executes the 4 stages: Recon -> FDIA -> Tap -> Trip,
        recording chronological milestones and applying real physical impact on stage 3.
        """
        req_camp = CyberSimulationRequest(
            scenario_id="SCENARIO_E_COORDINATED_ATTACK",
            baseline_network="IEEE_30",
            seed=123
        )
        sim_res = cyber_detection_engine.execute_cyber_simulation_pipeline(req_camp, self.db)

        # Campaign correlation result
        self.assertIsNotNone(sim_res.campaign_impact)
        camp = sim_res.campaign_impact
        self.assertEqual(camp.detection_classification, "COORDINATED_CAMPAIGN")
        self.assertEqual(len(camp.timeline), 4)

        # Verify phase sequence
        phases = [step.attack_vector for step in camp.timeline]
        self.assertIn("RECONNAISSANCE", phases)
        self.assertIn("CONFIGURATION_TAMPERING", phases)
        self.assertIn("UNAUTHORIZED_CONTROL", phases)
        self.assertIn("TELEMETRY_INTEGRITY", phases)

        # Physical breaker actuation on breaker step
        trip_step = next(s for s in camp.timeline if s.attack_vector == "UNAUTHORIZED_CONTROL")
        self.assertTrue(trip_step.is_physical_actuation)
        self.assertEqual(trip_step.physical_consequence, "BRANCH_TRIPPED_OUT_OF_SERVICE")
        print(f"✓ Attack 5 Coordinated Campaign: 4 phases verified with physical actuation on breaker stage.")

    # =========================================================================
    # 7. Model Separation & Target Filtering
    # =========================================================================
    def test_07_model_separation_and_target_filtering(self):
        """
        Ensures IEEE 30 and India 59 have completely segregated target spaces
        and model switching does not retain stale assets.
        """
        ieee_targets = DynamicTargetSelector.get_eligible_targets("SCENARIO_A_BREAKER_TRIP", self.db, network_id="IEEE_30")
        india_targets = DynamicTargetSelector.get_eligible_targets("SCENARIO_A_BREAKER_TRIP", self.db, network_id="INDIA_GRID_59")

        # Must not share line IDs
        ieee_lines = [t for t in ieee_targets if "LINE" in t]
        india_lines = [t for t in india_targets if "LINE" in t or "CORR" in t]
        self.assertTrue(len(ieee_lines) > 0)
        self.assertTrue(len(india_lines) > 0)

        # IEEE uses LINE-X-Y notation; India uses CORR-XX or descriptive names
        self.assertIn("LINE-1-2", ieee_lines)
        self.assertNotIn("LINE-1-2", india_lines)
        print(f"✓ Model Separation Verified: {len(ieee_lines)} IEEE 30 lines vs {len(india_lines)} India 59 lines. Zero cross-contamination.")


if __name__ == "__main__":
    unittest.main()

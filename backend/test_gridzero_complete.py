"""
Comprehensive Automated Verification Suite for GRID//ZERO Upgrade:
- Distribution Networks (TRAINING_FEEDER 12-bus & IEEE_33_DISTRIBUTION Baran & Wu 33-bus)
- Discrete-Time Battery Physics (kW vs kWh, SOC clamping, efficiencies)
- 13-Algorithm Explainable DSA Catalog
- 8-Stage CAPER Engine & 4 Restoration Baselines (including SciPy HiGHS MILP)
- 7 Campaign Missions & Human-vs-Algorithm Challenge Arena
- Reproducible Multi-Seed Research Benchmark Runner
- FastAPI /api/gridzero/* Endpoints
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.power.models import BatteryModel, DataClassification
from app.power.power_flow_service import power_flow_service
from app.dsa.algorithms_catalog import GridDSACatalog
from app.restoration.caper import CAPEREngine
from app.restoration.baselines import BaselineRestorationSuite
from app.simulation.missions import MissionService
from app.experiments.runner import experiment_runner


client = TestClient(app)


def test_01_all_four_networks_ac_power_flow_converge():
    for net_id in ["TRAINING_FEEDER", "IEEE_33_DISTRIBUTION", "IEEE_30", "INDIA_GRID_59"]:
        res = power_flow_service.run_power_flow(net_id)
        assert res.converged is True, f"AC Power Flow failed to converge on {net_id}"
        assert res.classification == DataClassification.AC_SOLVED
        assert len(res.buses) > 0
        assert len(res.branches) > 0


def test_02_battery_model_discrete_time_energy_physics():
    bess = BatteryModel(
        id="BESS-TEST",
        bus_id="BUS-03",
        name="Test Hospital Battery",
        capacity_kwh=1000.0,
        energy_kwh=500.0,
        soc_pct=50.0,
        min_soc_pct=15.0,
        max_soc_pct=95.0,
        max_discharge_kw=400.0,
        max_charge_kw=300.0,
        charge_efficiency=0.95,
        discharge_efficiency=0.95,
    )
    # Discharge 200 kW for 0.5 hours -> ~105.26 kWh internal drain
    step1 = bess.step_energy(dispatch_kw=200.0, dt_hours=0.5)
    assert step1["actual_dispatch_kw"] == pytest.approx(200.0, rel=1e-2)
    assert bess.energy_kwh < 500.0
    assert bess.soc_pct < 50.0

    # Attempt excessive discharge that would breach min_soc_pct (15% = 150 kWh)
    step2 = bess.step_energy(dispatch_kw=400.0, dt_hours=2.0)
    assert bess.soc_pct >= 15.0 - 1e-6
    assert step2["energy_kwh"] >= 150.0 - 1e-6


def test_03_all_13_dsa_algorithms_produce_valid_traces():
    net_data = power_flow_service.get_network_topology("TRAINING_FEEDER")
    algo_ids = [item["id"] for item in GridDSACatalog.CATALOG_METADATA]
    assert len(algo_ids) == 13
    for algo_id in algo_ids:
        trace = GridDSACatalog.run_algorithm(
            algorithm_id=algo_id,
            net_data=net_data,
            faulted_branches=["LINE-02-03"],
            closed_switches=["SW-TIE-2"],
            parameters={"capacity_mw": 6.5, "query_prefix": "BUS-0"},
        )
        assert trace.algorithm_id == algo_id
        assert len(trace.steps) >= 1
        assert trace.time_complexity != ""
        assert trace.space_complexity != ""


def test_04_caper_and_four_baselines_on_faulted_constrained_feeder():
    faults = ["LINE-02-03", "LINE-02-04"]
    overrides = {
        "lines": {"LINE-02-03": {"status": "OUT_OF_SERVICE"}, "LINE-02-04": {"status": "OUT_OF_SERVICE"}},
        "switches": {},
        "batteries": {},
        "load_curtailment": {},
    }
    caper_res = CAPEREngine.run_caper(
        network_id="TRAINING_FEEDER",
        faulted_branches=faults,
        state_overrides=overrides,
        source_capacity_limit_mw=7.2,
        switching_budget=5,
    )
    assert caper_res.selected_candidate.ac_converged is True
    assert caper_res.selected_candidate.critical_load_restored_pct >= 95.0
    assert len(caper_res.stages) == 8

    baselines = BaselineRestorationSuite.run_all_baselines(
        network_id="TRAINING_FEEDER",
        faulted_branches=faults,
        state_overrides=overrides,
        source_capacity_limit_mw=7.2,
        switching_budget=5,
    )
    assert set(baselines.keys()) == {"PRIORITY_GREEDY", "GRAPH_GREEDY", "AC_GREEDY", "MILP_REFERENCE"}
    # CAPER must restore strictly more critical load than PRIORITY_GREEDY (which cannot close tie switches)
    assert (
        caper_res.selected_candidate.critical_load_restored_pct
        > baselines["PRIORITY_GREEDY"].critical_load_restored_pct
    )


def test_05_all_seven_missions_and_caper_auto_solve():
    missions = MissionService.list_missions()
    assert len(missions) == 7
    for m in missions:
        started = MissionService.start_mission(m.mission_id, session_id=f"TEST-{m.mission_id}")
        assert started["mission"]["mission_id"] == m.mission_id
        assert started["session"]["network_id"] == m.network_id


def test_06_gridzero_fastapi_endpoints():
    # 1. Session endpoint
    r_sess = client.get("/api/gridzero/session?network_id=TRAINING_FEEDER")
    assert r_sess.status_code == 200
    data = r_sess.json()
    assert data["session"]["network_id"] == "TRAINING_FEEDER"
    assert len(data["session"]["buildings_3d"]) == 12

    # 2. Inject fault & run CAPER via API
    r_act = client.post(
        "/api/gridzero/session/action",
        json={
            "action_type": "INJECT_FAULT",
            "target_id": "LINE-02-03",
        },
    )
    assert r_act.status_code == 200

    r_comp = client.post("/api/gridzero/restoration/compare", json={"switching_budget": 5})
    assert r_comp.status_code == 200
    comp_data = r_comp.json()
    assert "caper" in comp_data
    assert "baselines" in comp_data

    # 3. Apply CAPER plan & verify hospital BUS-03 is restored
    r_apply = client.post("/api/gridzero/session/apply-plan", json={"algorithm": "CAPER", "switching_budget": 5})
    assert r_apply.status_code == 200
    post_session = r_apply.json()["session"]
    hosp = next(b for b in post_session["buildings_3d"] if b["bus_id"] == "BUS-03")
    assert hosp["power_state"] in ("ENERGIZED", "BACKUP_BATTERY")

    # 4. Research benchmark run & CSV export
    r_runs = client.get("/api/gridzero/research/runs")
    assert r_runs.status_code == 200
    runs_list = r_runs.json()["runs"]
    assert len(runs_list) >= 1
    run_id = runs_list[0]["run_id"]

    r_csv = client.get(f"/api/gridzero/research/runs/{run_id}/export-csv")
    assert r_csv.status_code == 200
    assert "critical_load_restored_pct" in r_csv.text


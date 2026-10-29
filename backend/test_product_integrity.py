"""Behavioral regressions for the integrated product, independent of UI implementation."""
from concurrent.futures import ThreadPoolExecutor
import pytest
from app.simulation.session_manager import SimulationSessionManager, SessionActionError
from app.simulation.missions import MissionService
from app.power.power_flow_service import power_flow_service
from app.dsa.algorithms_catalog import GridDSACatalog


def test_invalid_actions_never_commit_a_revision():
    manager = SimulationSessionManager()
    before = manager.reset_session()
    for action, target, value in [("INJECT_FAULT", "NONEXISTENT", None), ("CURTAIL_LOAD", "BUS-09", -1), ("SET_BATTERY", "BESS-CITY-1", 1e6), ("UNSUPPORTED", "BUS-01", None), ("ADVANCE_TIME", "CLOCK", -1)]:
        with pytest.raises(SessionActionError):
            manager.apply_action(action_type=action, target_id=target, value=value)
        assert manager.get_or_create_session().revision == before.revision


def test_faulted_branch_cannot_be_closed_before_repair():
    manager = SimulationSessionManager()
    manager.reset_session()
    failed = manager.apply_action(action_type="INJECT_FAULT", target_id="LINE-02-03")
    with pytest.raises(SessionActionError, match="Repair"):
        manager.apply_action(action_type="CLOSE_SWITCH", target_id="SW-02-03")
    assert manager.get_or_create_session().revision == failed.revision
    fixed = manager.apply_action(action_type="CLEAR_FAULT", target_id=failed.active_faults[0].fault_id)
    assert all(f.cleared for f in fixed.active_faults)
    assert next(l for l in fixed.power_flow.lines if l.line_id == "LINE-02-03").status == "IN_SERVICE"


def test_concurrent_actions_preserve_every_revision_and_undo():
    manager = SimulationSessionManager()
    first = manager.reset_session()
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(manager.apply_action, action_type="SET_SOURCE_LIMIT", target_id="BUS-01", value=limit) for limit in (8., 9., 10.)]
        states = [f.result() for f in futures]
    assert sorted(s.revision for s in states) == [2, 3, 4]
    assert manager.get_or_create_session().revision == first.revision + 3
    assert manager.undo().revision == 3


def test_battery_energy_matches_elapsed_time_on_every_turn():
    manager = SimulationSessionManager()
    original = manager.reset_session()
    battery = next(b for b in original.batteries if b.battery_id == "BESS-CITY-1")
    dispatched = manager.apply_action(action_type="SET_BATTERY", target_id=battery.battery_id, value=600)
    actual = next(b for b in dispatched.batteries if b.battery_id == battery.battery_id)
    assert dispatched.sim_time_minutes == 5
    assert actual.soc_kwh == pytest.approx(battery.soc_kwh - 600 / 12 / battery.discharge_efficiency, abs=.02)
    advanced = manager.apply_action(action_type="SET_SOURCE_LIMIT", target_id="BUS-01", value=10.)
    actual2 = next(b for b in advanced.batteries if b.battery_id == battery.battery_id)
    assert actual2.soc_kwh == pytest.approx(actual.soc_kwh - 600 / 12 / battery.discharge_efficiency, abs=.02)


def test_max_flow_respects_capacities_and_equals_min_cut():
    data = power_flow_service.get_network_topology("TRAINING_FEEDER")
    result = GridDSACatalog.run_algorithm("MIN_COST_MAX_FLOW", network_data=data, tripped_edges={"LINE-02-03"})
    out = result.final_output
    assert out["max_deliverable_mw"] == pytest.approx(out["min_cut_capacity_mw"], abs=.005)
    assert all(abs(edge["flow_mw"]) <= edge["capacity_mw"] + .001 for edge in out["edge_flows"])
    assert "LINE-02-03" not in {e["edge_id"] for e in out["edge_flows"]}


def test_matching_is_one_to_one_and_cannot_cross_a_disconnected_cut():
    data = power_flow_service.get_network_topology("TRAINING_FEEDER")
    blocked = {line.line_id for line in data["lines"]}
    result = GridDSACatalog.run_algorithm("BIPARTITE_MATCHING", network_data=data, tripped_edges=blocked)
    matches = result.final_output["assignments"]
    assert len({m["source_id"] for m in matches}) == len(matches)
    assert len({m["load_id"] for m in matches}) == len(matches)
    assert all(m["source_bus"] == m["load_bus"] for m in matches)
    assert result.steps[-1].operation == "MATCHING_COMPLETE"


def test_all_mission_faults_are_actual_network_branches():
    for mission in MissionService.list_missions():
        topology = power_flow_service.get_network_topology(mission.network_id)
        branches = {l.line_id for l in topology["lines"]} | {t.transformer_id for t in topology.get("transformers", [])}
        assert set(mission.initial_faulted_branches) <= branches, mission.mission_id

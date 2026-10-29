"""Engineering and gameplay regression checks for the integrated AC game."""
import copy
import pytest
from app.simulation.grid_command import GridCommandEngine, GameError, LEVELS


def command(engine, game, action, target="", value=None):
    return engine.action(game["game_id"], game["version"], action, target, value)


def restore_manually(engine, level):
    game = engine.start(level, 42)
    if level != 1:
        for action, target, value in [("SHED_LOAD", "LOAD-INDUSTRIAL", 3.2), ("SHED_LOAD", "LOAD-COMMERCIAL", 1.4), ("DISPATCH_BATTERY", "BESS-CITY-1", 1700), ("DISPATCH_BATTERY", "BESS-HOSP-1", 510)]:
            game = command(engine, game, action, target, value)
    for fault in list(game["session"]["active_faults"]):
        if not fault["cleared"]:
            game = command(engine, game, "REPAIR_LINE", fault["asset_id"])
    return game


@pytest.mark.parametrize("level", [1, 2, 3, 4, 5])
def test_all_five_levels_have_valid_manual_solutions(level):
    engine = GridCommandEngine()
    game = restore_manually(engine, level)
    assert game["can_complete"], game["constraints"]
    assert game["session"]["kpis"]["critical_load_restored_pct"] == 100
    assert game["constraints"] == []
    assert all(line["loading_percent"] <= 100 for line in game["session"]["power_flow"]["lines"])
    won = command(engine, game, "COMPLETE")
    assert won["status"] == "WON"
    assert 400 <= won["score"] <= 1000


def test_bad_targets_critical_shedding_and_generation_cheats_are_atomic():
    engine = GridCommandEngine()
    game = engine.start(2)
    for action, target, value in [("REPAIR_LINE", "NOT-A-LINE", None), ("CLOSE_SWITCH", "NOT-A-SWITCH", None), ("SHED_LOAD", "LOAD-HOSPITAL", 1.8), ("SET_SOURCE_LIMIT", "GEN-INTAKE-1", 100), ("DISPATCH_BATTERY", "BESS-HOSP-1", 6000), ("REDISPATCH_GENERATOR", "GEN-SOLAR-1", 900), ("BOGUS", "", None)]:
        with pytest.raises(GameError):
            command(engine, game, action, target, value)
        current = engine.state(game["game_id"])
        assert current["version"] == game["version"]
        assert current["turns"] == 0
        assert current["credits_remaining"] == game["credits_remaining"]
    assert game["score"] <= 399  # Source-overloaded state is never a passing result.
    with pytest.raises(GameError):
        command(engine, game, "COMPLETE")


def test_fault_isolation_revision_guard_and_undo_restore_full_state():
    engine = GridCommandEngine()
    before = engine.start(1)
    line = next(l for l in before["session"]["power_flow"]["lines"] if l["line_id"] == "LINE-02-03")
    assert line["status"] == "OUT_OF_SERVICE"
    assert line["p_from_mw"] == 0
    hospital = next(b for b in before["session"]["buildings_3d"] if b["bus_id"] == "BUS-03")
    assert hospital["served_mw"] == 0
    after = command(engine, before, "REPAIR_LINE", "LINE-02-03")
    with pytest.raises(GameError, match="changed"):
        command(engine, before, "WAIT")
    undone = engine.undo(after["game_id"], after["version"])
    assert undone["turns"] == before["turns"]
    assert undone["score"] == before["score"]
    assert undone["session"]["kpis"] == before["session"]["kpis"]
    assert undone["credits_remaining"] == before["credits_remaining"]
    assert undone["version"] > after["version"]


def test_turn_limit_causes_loss_and_restart_is_deterministic():
    engine = GridCommandEngine()
    game = engine.start(1, 73)
    initial = copy.deepcopy(game["session"]["kpis"])
    for _ in range(game["level"]["max_turns"]):
        game = command(engine, game, "WAIT")
    assert game["status"] == "LOST"
    assert not game["can_complete"]
    reset = engine.start(1, 73)
    assert reset["turns"] == 0
    assert reset["spent"] == 0
    assert reset["session"]["kpis"] == initial


def test_cascades_undo_and_replay_are_reproducible():
    engine = GridCommandEngine()
    game = engine.start(4, 42)
    game = command(engine, game, "WAIT")
    pre_wave = game
    game = command(engine, game, "WAIT")
    assert game["session"]["kpis"]["active_faults_count"] == 2
    game = engine.undo(game["game_id"], game["version"])
    assert game["session"]["kpis"] == pre_wave["session"]["kpis"]
    game = command(engine, game, "WAIT")
    replay = engine.replay(game["game_id"])
    assert replay["turns"] == game["turns"]
    assert replay["spent"] == game["spent"]
    assert replay["session"]["kpis"] == game["session"]["kpis"]
    assert replay["score"] == game["score"]


def test_algorithm_traces_are_computed_and_caper_comparison_keeps_initial_faults():
    engine = GridCommandEngine()
    game = engine.start(5)
    for algorithm in ("BFS", "DFS", "DIJKSTRA", "KNAPSACK_DP", "KRUSKAL_MST", "MIN_COST_MAX_FLOW", "BIPARTITE_MATCHING"):
        hint = engine.hint(game["game_id"], algorithm)
        assert hint["trace"]["steps"]
        assert hint["trace"]["execution_time_ms"] >= 0
        assert hint["trace"]["network_id"] == "TRAINING_FEEDER"
    game = command(engine, game, "REPAIR_LINE", "LINE-02-03")
    comparison = engine.compare(game["game_id"])["comparison"]
    assert comparison["initial_faults"] == ["LINE-02-03", "LINE-03-04"]
    assert comparison["initial_source_limit_mw"] == 7.2
    assert comparison["caper"]["runtime_ms"] > 0
    assert comparison["caper"]["actions"]


def test_concurrent_duplicate_turns_commit_once():
    from concurrent.futures import ThreadPoolExecutor
    engine = GridCommandEngine()
    game = engine.start(1)
    def attempt():
        try:
            return command(engine, game, "WAIT")
        except GameError:
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: attempt(), range(2)))
    assert sum(result is not None for result in results) == 1
    assert engine.state(game["game_id"])["turns"] == 1


def test_http_actions_return_meaningful_conflicts_and_real_state():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.routes.grid_command import router
    app = FastAPI()
    app.include_router(router, prefix="/api")
    with TestClient(app) as client:
        response = client.post("/api/grid-command/start", json={"level": 1, "seed": 42})
        assert response.status_code == 200
        game = response.json()
        invalid = client.post("/api/grid-command/action", json={"game_id": game["game_id"], "version": game["version"], "action": "REPAIR_LINE", "target": "MISSING"})
        assert invalid.status_code == 409
        assert "faulted line" in invalid.json()["detail"]
        repaired = client.post("/api/grid-command/action", json={"game_id": game["game_id"], "version": game["version"], "action": "REPAIR_LINE", "target": "LINE-02-03"})
        assert repaired.status_code == 200
        assert repaired.json()["can_complete"]


def test_switching_generation_budgeting_and_restoration_change_authoritative_state():
    engine = GridCommandEngine()
    game = engine.start(1)
    tie = next(sw for sw in game["session"]["switches"] if sw["normally_open"])
    game = command(engine, game, "CLOSE_SWITCH", tie["switch_id"])
    assert next(sw for sw in game["session"]["switches"] if sw["switch_id"] == tie["switch_id"])["closed"]
    game = command(engine, game, "OPEN_SWITCH", tie["switch_id"])
    assert not next(sw for sw in game["session"]["switches"] if sw["switch_id"] == tie["switch_id"])["closed"]
    game = command(engine, game, "REDISPATCH_GENERATOR", "GEN-SOLAR-1", 2.2)
    assert game["session"]["state_overrides"]["GEN-SOLAR-1"]["p_gen_mw"] == 2.2
    game = command(engine, game, "SET_SOURCE_LIMIT", value=7.2)
    assert game["session"]["source_capacity_limit_mw"] == 7.2
    game = command(engine, game, "SHED_LOAD", "LOAD-INDUSTRIAL", 3.2)
    assert game["session"]["state_overrides"]["LOAD-INDUSTRIAL"]["p_load_mw"] == 0
    game = command(engine, game, "RESTORE_LOAD", "LOAD-INDUSTRIAL")
    assert "LOAD-INDUSTRIAL" not in game["session"]["state_overrides"]


def test_live_reachability_hint_includes_newly_closed_ties():
    engine = GridCommandEngine()
    game = engine.start(1)
    before = engine.hint(game["game_id"], "BFS")["trace"]["final_output"]
    assert "BUS-03" not in before["energized_buses"]
    game = command(engine, game, "CLOSE_SWITCH", "SW-TIE-1")
    after = engine.hint(game["game_id"], "BFS")["trace"]["final_output"]
    assert "BUS-03" in after["energized_buses"]

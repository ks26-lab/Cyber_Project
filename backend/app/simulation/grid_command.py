"""GRID COMMAND: turn-based operations over the existing AC session engine.

Game credits and five-minute turns are educational costs, not utility tariffs.
Graph hints are proposals; only a solved AC state can satisfy mission objectives.
"""
from __future__ import annotations

import copy
import math
import threading
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from app.power.models import FaultModel, RestorationAction
from app.power.power_flow_service import power_flow_service
from app.simulation.session_manager import SimulationSessionManager, SimulationSessionState, SessionActionError
from app.dsa.algorithms_catalog import GridDSACatalog
from app.restoration.caper import CAPEREngine


@dataclass(frozen=True)
class Level:
    number: int
    title: str
    briefing: str
    lesson: str
    faults: tuple[str, ...]
    supply_mw: float
    credits: int
    max_turns: int
    target_critical_pct: float = 95.0
    target_total_pct: float = 55.0
    cascades: tuple[tuple[int, str], ...] = ()
    algorithms: tuple[str, ...] = ("BFS", "DIJKSTRA")


LEVELS = (
    Level(1, "Hospital Blackout", "A storm has opened the hospital feeder. Restore critical service. Repairing a line is reliable but costs more than switching; either strategy can work.", "Trace connectivity, then choose a repair or a safe alternative path.", ("LINE-02-03",), 16.0, 32, 12, algorithms=("BFS", "DFS", "DIJKSTRA")),
    Level(2, "Citywide Power Shortage", "The grid intake is limited to 7.2 MW. Preserve hospital, water and emergency command loads. Reduce flexible demand or dispatch finite battery backup.", "Allocate scarce supply with critical-load knapsack; energy and power are different limits.", (), 7.2, 36, 16, algorithms=("KNAPSACK_DP", "BIPARTITE_MATCHING", "CAPER")),
    Level(3, "Transmission Line Failure", "Two critical branches are damaged. Route electricity through available ties, or spend repair credits. Every action is solved again against AC limits.", "Shortest paths propose routes; capacity analysis identifies bottlenecks.", ("LINE-02-03", "LINE-03-04"), 11.5, 32, 18, algorithms=("DIJKSTRA", "MIN_COST_MAX_FLOW", "KRUSKAL_MST", "CAPER")),
    Level(4, "Cascading Outage", "Wind damage is spreading. Additional faults arrive after turns 2 and 4. Keep reserves and finish only after both waves have passed.", "Use island detection and topology reconfiguration as the network changes.", ("LINE-02-03",), 11.5, 52, 24, cascades=((2, "LINE-02-05"), (4, "LINE-04-06")), algorithms=("DFS", "BFS", "KRUSKAL_MST", "CAPER")),
    Level(5, "CAPER Challenge", "Recover the dual-fault feeder under a 7.2 MW intake limit. Compare your final result with CAPER computed on exactly the same initial conditions.", "Balance critical service, reliability, operating time, credits and physical constraints.", ("LINE-02-03", "LINE-03-04"), 7.2, 48, 24, algorithms=("CAPER", "KNAPSACK_DP", "MIN_COST_MAX_FLOW")),
)
HINTS = {"BFS", "DFS", "DIJKSTRA", "MIN_COST_MAX_FLOW", "KNAPSACK_DP", "KRUSKAL_MST", "BIPARTITE_MATCHING", "CAPER"}


@dataclass
class Game:
    game_id: str
    level: Level
    seed: int
    session_id: str
    initial: SimulationSessionState
    turns: int = 0
    spent: int = 0
    violations_seen: int = 0
    status: str = "ACTIVE"
    version: int = 1
    reliability_sum: float = 0.0
    completed_waves: list[int] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)
    history: list[dict] = field(default_factory=list)
    comparison: Optional[dict] = None
    actions: list[dict] = field(default_factory=list)


class GameError(ValueError):
    pass


class GridCommandEngine:
    """One serializable transaction per action with optimistic revision checks."""
    def __init__(self):
        self.manager = SimulationSessionManager()
        self.games: dict[str, Game] = {}
        self.lock = threading.RLock()

    def start(self, level: int = 1, seed: int = 42) -> dict:
        with self.lock:
            definition = next((l for l in LEVELS if l.number == level), None)
            if definition is None:
                raise GameError("Choose a level between 1 and 5.")
            if len(self.games) >= 256:
                # Bound in-memory educational sessions; never evict an active game.
                finished = next((k for k, g in self.games.items() if g.status != "ACTIVE"), None)
                if finished:
                    old = self.games.pop(finished)
                    self.manager._sessions.pop(old.session_id, None)
                    self.manager._history.pop(old.session_id, None)
                else:
                    raise GameError("The simulator is busy. Finish an existing game or restart the server.")
            game_id = uuid.uuid4().hex
            sid = "GRID-COMMAND-" + game_id
            faults = [FaultModel(fault_id=f"GC-{i}", asset_id=line, asset_type="LINE", fault_type="PHYSICAL_TRIP", isolated=True, description="Storm-damaged feeder; repair before reclosing.") for i, line in enumerate(definition.faults)]
            state = self.manager.reset_session(session_id=sid, network_id="TRAINING_FEEDER", seed=seed, initial_faults=faults, source_capacity_limit_mw=definition.supply_mw)
            game = Game(game_id, definition, seed, sid, copy.deepcopy(state))
            game.events.append({"turn": 0, "message": definition.briefing, "kind": "briefing"})
            self.games[game_id] = game
            return self.state(game_id)

    def _get(self, game_id: str) -> Game:
        if game_id not in self.games:
            raise GameError("This game session has expired. Start a new mission.")
        return self.games[game_id]

    @staticmethod
    def constraints(state: SimulationSessionState) -> list[str]:
        failures = []
        if state.solver_provenance != "AC_SOLVED" or not state.power_flow.converged:
            failures.append("AC power flow has not converged.")
        for v in state.power_flow.violations:
            # Elevated loading warnings at 85% are advisory; the hard limit is 100%.
            if str(v.violation_type).endswith("SOURCE_CAPACITY_EXCEEDED") or str(v.severity).upper() in ("HIGH", "CRITICAL"):
                failures.append(v.description)
        for bus in state.buildings_3d:
            if bus.voltage_pu > .1 and not (.92 - 1e-6 <= bus.voltage_pu <= 1.08 + 1e-6):
                failures.append(f"{bus.name}: voltage {bus.voltage_pu:.3f} pu is outside 0.92–1.08 pu.")
        for line in state.power_flow.lines:
            if line.loading_percent > 100.0:
                failures.append(f"{line.name}: thermal loading exceeds 100%.")
        for transformer in state.power_flow.transformers:
            if transformer.loading_percent > 100.0:
                failures.append(f"{transformer.name}: transformer loading exceeds 100%.")
        return list(dict.fromkeys(failures))

    def state(self, game_id: str) -> dict:
        with self.lock:
            g = self._get(game_id)
            s = self.manager.get_or_create_session(g.session_id)
            constraints = self.constraints(s)
            k = s.kpis
            waves_done = len(g.completed_waves) == len(g.level.cascades)
            objectives = [
                {"label": f"Supply at least {g.level.target_critical_pct:g}% of critical demand", "passed": k["critical_load_restored_pct"] >= g.level.target_critical_pct},
                {"label": f"Supply at least {g.level.target_total_pct:g}% of total demand", "passed": k["total_load_restored_pct"] >= g.level.target_total_pct},
                {"label": "Converged AC solution within voltage, thermal and generation limits", "passed": not constraints},
                {"label": "Withstand all scheduled fault waves", "passed": waves_done},
            ]
            reliable = g.reliability_sum / max(1, g.turns)
            score_parts = {"critical_service": round(k["critical_load_restored_pct"] * 5), "served_load": round(k["total_load_restored_pct"] * 2), "reliability": round(reliable * 1.5), "time_bonus": max(0, 100 - 4 * g.turns), "credit_bonus": max(0, 50 - g.spent), "constraint_penalty": min(300, 10 * g.violations_seen + 50 * len(constraints))}
            score = max(0, min(1000, sum(v if name != "constraint_penalty" else -v for name, v in score_parts.items())))
            # No infeasible state can receive a passing grade or verified service score.
            if constraints:
                score = min(score, 399)
            topology = power_flow_service.get_network_topology(s.network_id)
            topology_public = {name: [item.model_dump() for item in topology.get(name, [])] for name in ("buses", "lines", "transformers", "generators", "loads")}
            return {"game_id": game_id, "version": g.version, "level": asdict(g.level), "seed": g.seed, "session": s.model_dump(), "topology": topology_public, "turns": g.turns, "credits_remaining": g.level.credits - g.spent, "spent": g.spent, "status": g.status, "score": score, "score_breakdown": score_parts, "objectives": objectives, "can_complete": all(o["passed"] for o in objectives), "constraints": constraints, "advisories": [v.description for v in s.power_flow.violations if str(v.severity).upper() == "WARNING"], "events": g.events[-40:], "can_undo": bool(g.history), "comparison": g.comparison, "action_costs": {"REPAIR_LINE": 8, "CLOSE_SWITCH": 2, "OPEN_SWITCH": 2, "DISPATCH_BATTERY": 3, "REDISPATCH_GENERATOR": 2, "SHED_LOAD": 1, "RESTORE_LOAD": 1, "SET_SOURCE_LIMIT": 1, "WAIT": 0, "COMPLETE": 0}, "model_note": "Simulated 12-bus AC feeder. Graph algorithms propose routes and allocations; only the post-action AC solver verifies the operating state. Each operator move and automatic storm trip advances simulated time by five minutes. The turn counter counts operator decisions; batteries discharge over total elapsed time. Credits are educational operating costs. BESS provides finite battery backup, while local generation uses the modeled solar source."}

    def _snapshot(self, g: Game) -> dict:
        return {"state": copy.deepcopy(self.manager.get_or_create_session(g.session_id)), "turns": g.turns, "spent": g.spent, "violations_seen": g.violations_seen, "status": g.status, "reliability_sum": g.reliability_sum, "completed_waves": list(g.completed_waves), "events": copy.deepcopy(g.events), "actions": copy.deepcopy(g.actions), "comparison": copy.deepcopy(g.comparison)}

    def _restore(self, g: Game, snap: dict):
        self.manager._sessions[g.session_id] = copy.deepcopy(snap["state"])
        self.manager._history[g.session_id] = [copy.deepcopy(snap["state"])]
        for name in ("turns", "spent", "violations_seen", "status", "reliability_sum", "completed_waves", "events", "actions", "comparison"):
            setattr(g, name, copy.deepcopy(snap[name]))

    def action(self, game_id: str, version: int, action: str, target: str = "", value: Optional[float] = None) -> dict:
        with self.lock:
            g = self._get(game_id)
            if version != g.version:
                raise GameError("The game changed in another request. Refresh the current mission before acting.")
            if g.status != "ACTIVE":
                raise GameError("This mission has ended. Undo a turn or restart to play again.")
            s = self.manager.get_or_create_session(g.session_id)
            act = action.upper()
            if g.turns >= g.level.max_turns and act != "COMPLETE":
                raise GameError("Dispatch time is exhausted. Complete a valid mission, undo, or restart.")
            if value is not None and not math.isfinite(value):
                raise GameError("Enter a finite dispatch or power value.")
            allowed = self.state(game_id)["action_costs"]
            if act not in allowed:
                raise GameError("That action is not available in GRID COMMAND.")
            cost = allowed[act]
            if g.spent + cost > g.level.credits:
                raise GameError("Insufficient repair credits. Choose another action or undo a turn.")
            topology = power_flow_service.get_network_topology(s.network_id)
            faulted = {f.asset_id for f in s.active_faults if not f.cleared}
            backend_act, backend_target, backend_val = act, target, value
            if act == "REPAIR_LINE":
                if target not in faulted or not any(l.line_id == target for l in topology["lines"]):
                    raise GameError("Select an actively faulted line to repair.")
                backend_act = "CLEAR_FAULT"
            elif act in ("CLOSE_SWITCH", "OPEN_SWITCH"):
                sw = next((sw for sw in s.switches if sw.switch_id == target), None)
                if not sw or not sw.operable:
                    raise GameError("Select an operable switch.")
                if sw.line_id in faulted and act == "CLOSE_SWITCH":
                    raise GameError("Repair the faulted line before closing its switch.")
                if sw.closed == (act == "CLOSE_SWITCH"):
                    raise GameError("The switch is already in that position.")
            elif act in ("SHED_LOAD", "RESTORE_LOAD"):
                load = next((l for l in topology["loads"] if l.load_id == target), None)
                if not load:
                    raise GameError("Select a consumer load.")
                if act == "SHED_LOAD" and (value is None or value < 0 or value > min(load.curtailable_mw, max(0, load.P - load.critical_load_mw)) + 1e-9):
                    raise GameError("Curtail only the flexible demand; protect the facility's critical reserve.")
            elif act == "DISPATCH_BATTERY":
                batt = next((b for b in s.batteries if b.battery_id == target), None)
                if not batt or value is None or not (0 <= value <= batt.max_discharge_kw):
                    raise GameError("Select battery backup and dispatch within its kW rating.")
                if value > 0 and batt.soc_percent <= batt.soc_min_percent:
                    raise GameError("The battery has reached its energy reserve.")
            elif act == "REDISPATCH_GENERATOR":
                gen = next((generator for generator in topology["generators"] if generator.generator_id == target and generator.bus_id != "BUS-01"), None)
                if gen is None or value is None or not (0 <= value <= gen.Pmax):
                    raise GameError("Dispatch a local generator within its nameplate MW rating.")
            elif act == "SET_SOURCE_LIMIT":
                if value is None or not (2 <= value <= g.level.supply_mw):
                    raise GameError(f"The intake budget must be between 2 and {g.level.supply_mw:g} MW.")
                backend_target = "GEN-INTAKE-1"
            elif act == "WAIT":
                backend_act, backend_val = "ADVANCE_TIME", 1 / 12
            elif act == "COMPLETE":
                if not self.state(game_id)["can_complete"]:
                    raise GameError("Meet every objective before completing the mission. Graph connection alone is not enough.")
                g.history.append(self._snapshot(g))
                g.status = "WON"
                g.version += 1
                g.events.append({"turn": g.turns, "kind": "success", "message": "Mission complete: critical service and the AC operating limits are verified."})
                return self.state(game_id)
            snap = self._snapshot(g)
            try:
                s = self.manager.apply_action(session_id=g.session_id, action_type=backend_act, target_id=backend_target, value=backend_val)
                g.turns += 1
                g.spent += cost
                g.actions.append({"action": act, "target": target, "value": value})
                g.events.append({"turn": g.turns, "kind": "action", "message": f"{act.replace('_', ' ').capitalize()} · {target or 'system'}" + (f" · {value:g}" if value is not None else "") + f" · {cost} credits"})
                for turn, line in g.level.cascades:
                    if g.turns >= turn and turn not in g.completed_waves:
                        if line not in {f.asset_id for f in s.active_faults if not f.cleared}:
                            s = self.manager.apply_action(session_id=g.session_id, action_type="INJECT_FAULT", target_id=line)
                        g.completed_waves.append(turn)
                        g.events.append({"turn": g.turns, "kind": "fault", "message": f"Storm wave: protective equipment tripped {line}."})
                failures = self.constraints(s)
                g.violations_seen += len(failures)
                g.reliability_sum += s.kpis["total_load_restored_pct"] if not failures else 0
                if g.turns >= g.level.max_turns and not self.state(game_id)["can_complete"]:
                    g.status = "LOST"
                    g.events.append({"turn": g.turns, "kind": "failure", "message": "Dispatch time expired with objectives unmet. Review the trace, undo or replay."})
                g.history.append(snap)
                g.version += 1
            except SessionActionError as exc:
                self._restore(g, snap)
                raise GameError(str(exc)) from exc
            except Exception:
                self._restore(g, snap)
                raise
            return self.state(game_id)

    def undo(self, game_id: str, version: int) -> dict:
        with self.lock:
            g = self._get(game_id)
            if version != g.version:
                raise GameError("Refresh the mission; its revision changed.")
            if not g.history:
                raise GameError("No action to undo.")
            self._restore(g, g.history.pop())
            g.version += 1
            return self.state(game_id)

    def replay(self, game_id: str) -> dict:
        """Re-run the accepted operator moves from the same seed and initial conditions."""
        with self.lock:
            source = self._get(game_id)
            moves = copy.deepcopy(source.actions)
            result = self.start(source.level.number, source.seed)
            for move in moves:
                if result["status"] != "ACTIVE":
                    break
                result = self.action(result["game_id"], result["version"], **move)
            if source.status == "WON" and result["can_complete"]:
                result = self.action(result["game_id"], result["version"], "COMPLETE")
            result["replayed_moves"] = len(moves)
            return result

    def hint(self, game_id: str, algorithm: str = "CAPER") -> dict:
        with self.lock:
            g = self._get(game_id)
            aid = algorithm.upper()
            if aid not in HINTS:
                raise GameError("Choose a supported grid algorithm.")
            state = self.manager.get_or_create_session(g.session_id)
            network = copy.deepcopy(power_flow_service.get_network_topology(state.network_id))
            faulted = {f.asset_id for f in state.active_faults if not f.cleared}
            if aid == "CAPER":
                result = self.manager.run_caper(session_id=g.session_id)
                return {"trace": result["algorithm_trace"], "caper": result, "interpretation": "CAPER synthesizes candidate actions and checks each with nonlinear AC power flow. Apply individual actions to make your own operational decisions."}
            # Feed topology algorithms the current allocation and import budget,
            # rather than the untouched reference model's nominal source rating.
            for gen in network.get("generators", []):
                if gen.bus_id == "BUS-01" and state.source_capacity_limit_mw is not None:
                    gen.Pmax = min(gen.Pmax, state.source_capacity_limit_mw)
                override = state.state_overrides.get(gen.generator_id, {})
                if isinstance(override, dict) and "p_gen_mw" in override:
                    gen.current_P = float(override["p_gen_mw"])
            for load in network.get("loads", []):
                override = state.state_overrides.get(load.load_id, {})
                if isinstance(override, dict) and "p_load_mw" in override:
                    load.P = float(override["p_load_mw"])
                    bus = next(b for b in network["buses"] if b.bus_id == load.bus_id)
                    bus.load_P = load.P
            network["batteries"] = copy.deepcopy(state.batteries)
            for battery in network["batteries"]:
                reserve_kwh = battery.capacity_kwh * battery.soc_min_percent / 100
                battery.max_discharge_kw = min(battery.max_discharge_kw, max(0, battery.soc_kwh - reserve_kwh) * battery.discharge_efficiency * 12)
            available_supply = (state.source_capacity_limit_mw or g.level.supply_mw) + sum(gen.current_P for gen in network.get("generators", []) if gen.bus_id != "BUS-01") + sum(b.current_dispatch_kw for b in state.batteries) / 1000
            # Topology algorithms inspect the actual switch state. Routing/MST may
            # propose available open ties, explicitly requiring switching and AC checks.
            routing = aid in ("DIJKSTRA", "KRUSKAL_MST")
            unavailable = set(faulted)
            for switch in state.switches:
                if switch.line_id and not switch.closed and not routing:
                    unavailable.add(switch.line_id)
            for line in network["lines"]:
                if line.line_id in unavailable:
                    line.status = "OUT_OF_SERVICE"
                elif any(sw.line_id == line.line_id and (sw.closed or (routing and sw.operable)) for sw in state.switches):
                    line.status = "IN_SERVICE"
            trace = GridDSACatalog.run_algorithm(algorithm_id=aid, network_data=network, tripped_edges=unavailable, available_supply_mw=available_supply, parameters={"source_bus": "BUS-01", "target_bus": "BUS-03"})
            return {"trace": trace.model_dump(), "interpretation": "Candidate routing includes operable open ties. Close a proposed switch and verify the resulting AC state." if routing else "Computed from this turn's faulted network. Graph-flow and allocation outputs are educational approximations; they do not prove AC feasibility."}

    def compare(self, game_id: str) -> dict:
        with self.lock:
            g = self._get(game_id)
            initial = g.initial
            topology = power_flow_service.get_network_topology(initial.network_id)
            result = CAPEREngine.execute(network_data=topology, faulted_edges=[f.asset_id for f in initial.active_faults if not f.cleared], source_capacity_limit_mw=initial.source_capacity_limit_mw, base_overrides=initial.state_overrides)
            candidate = result.selected_candidate
            state = self.manager.get_or_create_session(g.session_id)
            g.comparison = {"initial_seed": g.seed, "initial_faults": [f.asset_id for f in initial.active_faults], "initial_source_limit_mw": initial.source_capacity_limit_mw, "player": {"critical_pct": state.kpis["critical_load_restored_pct"], "total_pct": state.kpis["total_load_restored_pct"], "feasible": not self.constraints(state), "score": self.state(game_id)["score"]}, "caper": {"critical_pct": candidate.critical_load_restored_pct, "total_pct": candidate.total_load_restored_pct, "feasible": candidate.feasible and candidate.ac_validated, "runtime_ms": result.execution_time_ms, "actions": [a.model_dump() for a in candidate.actions]}, "note": "Both start from the same initial seed, faults and intake limit. CAPER is a static restoration comparator; it does not predict later storm waves in level 4. Percentages are attempted supply unless the corresponding AC result is feasible."}
            return self.state(game_id)


grid_command_engine = GridCommandEngine()

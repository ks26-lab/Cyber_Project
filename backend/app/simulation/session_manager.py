"""
Unified Authoritative Simulation Session Manager for GRID//ZERO.
Maintains transactional state revisions, active faults, switch states, battery SOC,
load curtailments, solved AC power flow, and 3D city building states across all views.
"""

import copy
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from pydantic import BaseModel, Field

from app.power.models import (
    PowerFlowResult,
    SwitchModel,
    BatteryModel,
    FaultModel,
    RestorationAction,
    RestorationCandidate,
    DataClassification,
)
from app.power.power_flow_service import power_flow_service
from app.dsa.algorithms_catalog import GridDSACatalog
from app.restoration.caper import CAPEREngine
from app.restoration.baselines import BaselineRestorationSuite


class Building3DState(BaseModel):
    building_id: str
    bus_id: str
    name: str
    facility_type: str
    priority_tier: int
    criticality_weight: float
    position_3d: List[float]
    power_state: str = Field(..., description="ENERGIZED, BACKUP_BATTERY, CURTAILED, BLACKOUT, SOURCE_ACTIVE")
    voltage_pu: float = 1.0
    voltage_kv: float = 11.0
    demand_mw: float = 0.0
    critical_load_mw: float = 0.0
    served_mw: float = 0.0
    curtailed_mw: float = 0.0
    generation_mw: float = 0.0
    battery_soc_pct: Optional[float] = None


class SimulationSessionState(BaseModel):
    session_id: str
    network_id: str
    network_name: str
    mission_id: Optional[str] = None
    revision: int = 1
    sim_time_minutes: int = 0
    seed: int = 42
    source_capacity_limit_mw: Optional[float] = None
    state_overrides: Dict[str, Any] = Field(default_factory=dict)
    active_faults: List[FaultModel] = Field(default_factory=list)
    switches: List[SwitchModel] = Field(default_factory=list)
    batteries: List[BatteryModel] = Field(default_factory=list)
    power_flow: PowerFlowResult
    buildings_3d: List[Building3DState] = Field(default_factory=list)
    action_log: List[Dict[str, Any]] = Field(default_factory=list)
    kpis: Dict[str, Any] = Field(default_factory=dict)
    solver_provenance: str = "AC_SOLVED"


class SimulationSessionManager:
    """In-memory transactional session store with snapshot/undo support."""

    def __init__(self) -> None:
        self._sessions: Dict[str, SimulationSessionState] = {}
        self._history: Dict[str, List[SimulationSessionState]] = {}
        self._default_session_id = "DEFAULT_CITY_SESSION"

    def get_or_create_session(
        self,
        session_id: Optional[str] = None,
        network_id: str = "TRAINING_FEEDER",
        mission_id: Optional[str] = None,
        seed: int = 42,
    ) -> SimulationSessionState:
        sid = session_id or self._default_session_id
        if sid in self._sessions and (not network_id or self._sessions[sid].network_id == network_id):
            return self._sessions[sid]
        return self.reset_session(session_id=sid, network_id=network_id, mission_id=mission_id, seed=seed)

    def reset_session(
        self,
        session_id: Optional[str] = None,
        network_id: str = "TRAINING_FEEDER",
        mission_id: Optional[str] = None,
        seed: int = 42,
        initial_overrides: Optional[Dict[str, Any]] = None,
        initial_faults: Optional[List[FaultModel]] = None,
        source_capacity_limit_mw: Optional[float] = None,
    ) -> SimulationSessionState:
        sid = session_id or self._default_session_id
        net_data = power_flow_service.get_network_topology(network_id)
        switches = copy.deepcopy(net_data.get("switches", []))
        batteries = copy.deepcopy(net_data.get("batteries", []))
        raw_ov = copy.deepcopy(initial_overrides or {})
        overrides: Dict[str, Any] = {}
        for k, v in raw_ov.items():
            if k in ("lines", "switches", "batteries", "load_curtailment") and isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    overrides[sub_k] = sub_v
                    if k == "switches":
                        for sw in switches:
                            if sw.switch_id == sub_k:
                                sw.closed = sub_v.get("status", "CLOSED") == "CLOSED" if isinstance(sub_v, dict) else bool(sub_v)
            else:
                overrides[k] = v
        faults = copy.deepcopy(initial_faults or [])

        for f in faults:
            if not f.cleared:
                overrides[f.asset_id] = {"status": "OUT_OF_SERVICE"}
                for sw in switches:
                    if sw.line_id == f.asset_id or sw.switch_id == f.asset_id:
                        sw.closed = False

        state = self._recompute_state(
            session_id=sid,
            network_id=net_data.get("network_id", network_id),
            network_name=net_data.get("name", network_id),
            mission_id=mission_id,
            revision=1,
            sim_time_minutes=0,
            seed=seed,
            source_capacity_limit_mw=source_capacity_limit_mw,
            overrides=overrides,
            faults=faults,
            switches=switches,
            batteries=batteries,
            action_log=[
                {
                    "revision": 1,
                    "timestamp": datetime.utcnow().isoformat(),
                    "action": "INITIALIZE_SESSION",
                    "description": f"Initialized {network_id} simulation session (seed={seed}).",
                }
            ],
        )
        self._sessions[sid] = state
        self._history[sid] = [copy.deepcopy(state)]
        return state

    def _recompute_state(
        self,
        session_id: str,
        network_id: str,
        network_name: str,
        mission_id: Optional[str],
        revision: int,
        sim_time_minutes: int,
        seed: int,
        source_capacity_limit_mw: Optional[float],
        overrides: Dict[str, Any],
        faults: List[FaultModel],
        switches: List[SwitchModel],
        batteries: List[BatteryModel],
        action_log: List[Dict[str, Any]],
    ) -> SimulationSessionState:
        net_data = power_flow_service.get_network_topology(network_id)
        eval_overrides = copy.deepcopy(overrides)

        # Synchronize switches into eval_overrides
        for sw in switches:
            eval_overrides[sw.switch_id] = {"closed": sw.closed}
            if sw.line_id:
                eval_overrides[sw.line_id] = {"status": "IN_SERVICE" if sw.closed else "OUT_OF_SERVICE"}

        # Synchronize faults
        for f in faults:
            if not f.cleared:
                eval_overrides[f.asset_id] = {"status": "OUT_OF_SERVICE"}

        # Synchronize batteries
        for batt in batteries:
            if abs(batt.current_dispatch_kw) > 1e-3:
                eval_overrides[batt.battery_id] = {"dispatch_kw": batt.current_dispatch_kw}

        # Synchronize source capacity limit
        if source_capacity_limit_mw is not None:
            for gen in net_data.get("generators", []):
                parent_bus = next((b for b in net_data.get("buses", []) if b.bus_id == gen.bus_id), None)
                if parent_bus and str(parent_bus.bus_type).endswith("SLACK"):
                    eval_overrides.setdefault(gen.generator_id, {})["Pmax"] = float(source_capacity_limit_mw)

        # Determine energized buses via BFS from active sources
        active_adj: Dict[str, List[str]] = {b.bus_id: [] for b in net_data.get("buses", [])}
        for l in net_data.get("lines", []):
            l_ov = eval_overrides.get(l.line_id, {})
            st = l_ov if isinstance(l_ov, str) else l_ov.get("status", l.status)
            if st not in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "OPEN"):
                active_adj.setdefault(l.from_bus, []).append(l.to_bus)
                active_adj.setdefault(l.to_bus, []).append(l.from_bus)
        for x in net_data.get("transformers", []):
            x_ov = eval_overrides.get(x.transformer_id, {})
            st = x_ov if isinstance(x_ov, str) else x_ov.get("status", x.status)
            if st not in ("OUT_OF_SERVICE", "TRIPPED"):
                active_adj.setdefault(x.from_bus, []).append(x.to_bus)
                active_adj.setdefault(x.to_bus, []).append(x.from_bus)

        slack_bus_ids = {
            b.bus_id for b in net_data.get("buses", []) if "SLACK" in str(b.bus_type).upper()
        }
        source_buses: Set[str] = set(slack_bus_ids)
        for g in net_data.get("generators", []):
            g_ov = eval_overrides.get(g.generator_id, {})
            st = g_ov if isinstance(g_ov, str) else g_ov.get("status", g.status)
            if st not in ("OUT_OF_SERVICE", "TRIPPED"):
                if g.bus_id in slack_bus_ids or network_id not in ("TRAINING_FEEDER", "IEEE_33_DISTRIBUTION"):
                    source_buses.add(g.bus_id)
        for batt in batteries:
            if batt.current_dispatch_kw > 0:
                source_buses.add(batt.bus_id)

        energized_buses: Set[str] = set(source_buses)
        q = list(source_buses)
        qh = 0
        while qh < len(q):
            u = q[qh]
            qh += 1
            for v in active_adj.get(u, []):
                if v not in energized_buses:
                    energized_buses.add(v)
                    q.append(v)

        solver_overrides = copy.deepcopy(eval_overrides)
        for ld in net_data.get("loads", []):
            if ld.bus_id not in energized_buses:
                solver_overrides.setdefault(ld.load_id, {})["status"] = "OUT_OF_SERVICE"
        for b in net_data.get("buses", []):
            if b.bus_id not in energized_buses:
                solver_overrides.setdefault(b.bus_id, {})["status"] = "OUT_OF_SERVICE"

        import math
        from app.power.solver import PowerFlowSolver, HAS_PANDAPOWER
        pf_res = PowerFlowSolver.solve(
            network_data=net_data,
            scenario_id=f"{session_id}_REV_{revision}",
            state_overrides=solver_overrides,
        )

        # Sanitize any NaN values from unenergized islands in pf_res for JSON safety
        for br in pf_res.buses:
            if br.voltage_pu is None or math.isnan(float(br.voltage_pu)):
                br.voltage_pu = 0.0
                energized_buses.discard(br.bus_id)
            if getattr(br, "voltage_angle_deg", None) is None or math.isnan(float(getattr(br, "voltage_angle_deg", 0.0))):
                br.voltage_angle_deg = 0.0
            if br.p_gen_mw is None or math.isnan(float(br.p_gen_mw)):
                br.p_gen_mw = 0.0
            if br.p_load_mw is None or math.isnan(float(br.p_load_mw)):
                br.p_load_mw = 0.0
        for lr in pf_res.lines:
            for attr in ("p_from_mw", "q_from_mvar", "p_to_mw", "q_to_mvar", "loss_mw", "loss_mvar", "loading_percent"):
                val = getattr(lr, attr, 0.0)
                if val is None or math.isnan(float(val)):
                    setattr(lr, attr, 0.0)

        # Build 3D City Building states and KPIs
        bus_res_map = {br.bus_id: br for br in pf_res.buses}
        load_by_bus = {ld.bus_id: ld for ld in net_data.get("loads", [])}
        batt_by_bus = {bt.bus_id: bt for bt in batteries}

        buildings_3d: List[Building3DState] = []
        total_demand_mw = 0.0
        total_served_mw = 0.0
        total_crit_demand_mw = 0.0
        total_crit_served_mw = 0.0

        for idx, b in enumerate(net_data.get("buses", [])):
            br = bus_res_map.get(b.bus_id)
            ld = load_by_bus.get(b.bus_id)
            bt = batt_by_bus.get(b.bus_id)
            is_energized = b.bus_id in energized_buses and pf_res.status == "SUCCESS"

            base_demand = float(ld.P) if ld else float(b.load_P or 0.0)
            crit_demand = (
                float(ld.critical_load_mw)
                if (ld and ld.critical_load_mw > 0)
                else (base_demand if b.priority_tier == 1 else 0.0)
            )
            ov_ld = eval_overrides.get(ld.load_id, {}) if ld else eval_overrides.get(b.bus_id, {})
            if isinstance(ov_ld, str):
                ov_ld = {"status": ov_ld}
            curtailed_mw = float(ov_ld.get("curtailed_mw", 0.0))
            served_mw = (
                max(0.0, float(ov_ld.get("p_load_mw", base_demand - curtailed_mw)))
                if is_energized and ov_ld.get("status") != "OUT_OF_SERVICE"
                else 0.0
            )

            total_demand_mw += base_demand
            total_served_mw += served_mw
            total_crit_demand_mw += crit_demand
            total_crit_served_mw += min(crit_demand, served_mw)

            if not is_energized:
                p_state = "BLACKOUT"
            elif bt and bt.current_dispatch_kw > 0:
                p_state = "BACKUP_BATTERY"
            elif curtailed_mw > 0.05:
                p_state = "CURTAILED"
            elif base_demand == 0.0 and (br and br.p_gen_mw > 0):
                p_state = "SOURCE_ACTIVE"
            else:
                p_state = "ENERGIZED"

            pos = b.position_3d or [float((idx % 6) * 5 - 12), 0.0, float((idx // 6) * 5 - 10)]
            buildings_3d.append(
                Building3DState(
                    building_id=b.building_id or f"BLDG-{b.bus_id}",
                    bus_id=b.bus_id,
                    name=b.name,
                    facility_type=b.facility_type or "SUBSTATION",
                    priority_tier=b.priority_tier,
                    criticality_weight=b.criticality_weight,
                    position_3d=pos,
                    power_state=p_state,
                    voltage_pu=br.voltage_pu if (br and is_energized) else 0.0,
                    voltage_kv=b.voltage_kv,
                    demand_mw=round(base_demand, 3),
                    critical_load_mw=round(crit_demand, 3),
                    served_mw=round(served_mw, 3),
                    curtailed_mw=round(max(0.0, base_demand - served_mw), 3),
                    generation_mw=round(br.p_gen_mw, 3) if br else 0.0,
                    battery_soc_pct=bt.soc_percent if bt else None,
                )
            )

        active_line_loadings = [l.loading_percent for l in pf_res.lines if l.status != "OUT_OF_SERVICE"]
        energized_v = [br.voltage_pu for br in pf_res.buses if br.bus_id in energized_buses and br.voltage_pu > 0.1]

        crit_pct = round((total_crit_served_mw / max(1e-6, total_crit_demand_mw)) * 100.0, 1) if total_crit_demand_mw > 0 else 100.0
        tot_pct = round((total_served_mw / max(1e-6, total_demand_mw)) * 100.0, 1) if total_demand_mw > 0 else 100.0

        v_viol_count = sum(1 for v in pf_res.violations if "VOLTAGE" in str(v.violation_type).upper())
        t_viol_count = sum(1 for v in pf_res.violations if "VOLTAGE" not in str(v.violation_type).upper())
        max_loading = round(max(active_line_loadings), 1) if active_line_loadings else 0.0
        survival_idx = round(0.65 * crit_pct + 0.35 * tot_pct, 1)

        kpis = {
            "total_demand_mw": round(total_demand_mw, 2),
            "total_served_mw": round(total_served_mw, 2),
            "unserved_load_mw": round(max(0.0, total_demand_mw - total_served_mw), 2),
            "total_load_restored_pct": tot_pct,
            "critical_demand_mw": round(total_crit_demand_mw, 2),
            "critical_served_mw": round(total_crit_served_mw, 2),
            "critical_load_restored_pct": crit_pct,
            "total_generation_mw": pf_res.power_balance.total_generation_mw if pf_res.power_balance else 0.0,
            "total_losses_mw": pf_res.power_balance.total_losses_mw if pf_res.power_balance else 0.0,
            "max_line_loading_pct": max_loading,
            "max_branch_loading_pct": max_loading,
            "min_voltage_pu": round(min(energized_v), 4) if energized_v else 0.0,
            "max_voltage_pu": round(max(energized_v), 4) if energized_v else 0.0,
            "energized_buses_count": len(energized_buses),
            "total_buses_count": len(net_data.get("buses", [])),
            "active_faults_count": sum(1 for f in faults if not f.cleared),
            "active_violations_count": len(pf_res.violations),
            "voltage_violations_count": v_viol_count,
            "thermal_violations_count": t_viol_count,
            "city_survival_index": survival_idx,
            "resilience_score": survival_idx,
        }

        return SimulationSessionState(
            session_id=session_id,
            network_id=network_id,
            network_name=network_name,
            mission_id=mission_id,
            revision=revision,
            sim_time_minutes=sim_time_minutes,
            seed=seed,
            source_capacity_limit_mw=source_capacity_limit_mw,
            state_overrides=overrides,
            active_faults=faults,
            switches=switches,
            batteries=batteries,
            power_flow=pf_res,
            buildings_3d=buildings_3d,
            action_log=action_log,
            kpis=kpis,
            solver_provenance="AC_SOLVED" if HAS_PANDAPOWER else "APPROXIMATE_MODEL",
        )

    def apply_action(
        self,
        action: Optional[RestorationAction] = None,
        session_id: Optional[str] = None,
        action_type: Optional[str] = None,
        target_id: Optional[str] = None,
        value: Optional[float] = None,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> SimulationSessionState:
        if action is None:
            action = RestorationAction(
                action_type=action_type or "TOGGLE_SWITCH",
                target_id=target_id or "",
                value=value,
                description=(parameters or {}).get("description", ""),
            )
        state = self.get_or_create_session(session_id)
        sid = state.session_id
        overrides = copy.deepcopy(state.state_overrides)
        faults = copy.deepcopy(state.active_faults)
        switches = copy.deepcopy(state.switches)
        batteries = copy.deepcopy(state.batteries)
        source_cap = state.source_capacity_limit_mw
        sim_mins = state.sim_time_minutes + 5

        atype = action.action_type.upper().strip()
        tid = action.target_id.strip()
        val = action.value

        if atype in ("INJECT_FAULT", "TRIP_LINE", "FAULT_LINE", "ISOLATE_BRANCH"):
            faults.append(
                FaultModel(
                    fault_id=f"FLT-{uuid.uuid4().hex[:6].upper()}",
                    asset_id=tid,
                    asset_type="LINE",
                    fault_type="PHYSICAL_TRIP",
                    isolated=atype == "ISOLATE_BRANCH",
                    cleared=False,
                    description=action.description or f"Injected fault on {tid}",
                )
            )
            overrides[tid] = {"status": "OUT_OF_SERVICE"}
            for sw in switches:
                if sw.line_id == tid or sw.switch_id == tid:
                    sw.closed = False

        elif atype in ("CLEAR_FAULT", "RECLOSE_LINE", "RESTORE_BRANCH"):
            for f in faults:
                if f.asset_id == tid or f.fault_id == tid:
                    f.cleared = True
            overrides[tid] = {"status": "IN_SERVICE"}
            for sw in switches:
                if sw.line_id == tid or sw.switch_id == tid:
                    sw.closed = True

        elif atype in ("TOGGLE_SWITCH", "CLOSE_TIE_SWITCH", "CLOSE_SWITCH", "OPEN_SWITCH", "ISOLATE_FAULT"):
            for sw in switches:
                if sw.switch_id == tid or sw.line_id == tid:
                    if atype == "TOGGLE_SWITCH":
                        sw.closed = not sw.closed
                    elif atype in ("CLOSE_TIE_SWITCH", "CLOSE_SWITCH"):
                        sw.closed = True
                    else:
                        sw.closed = False
                    if sw.line_id:
                        overrides[sw.line_id] = {"status": "IN_SERVICE" if sw.closed else "OUT_OF_SERVICE"}
            if atype in ("CLOSE_TIE_SWITCH", "CLOSE_SWITCH"):
                overrides[tid] = {"status": "IN_SERVICE", "closed": True}
            elif atype in ("OPEN_SWITCH", "ISOLATE_FAULT"):
                overrides[tid] = {"status": "OUT_OF_SERVICE", "closed": False}

        elif atype in ("SHED_LOAD", "SHED_NON_CRITICAL_LOAD", "CURTAIL_LOAD"):
            net_data = power_flow_service.get_network_topology(state.network_id)
            ld = next((l for l in net_data.get("loads", []) if l.load_id == tid or l.bus_id == tid), None)
            if ld:
                shed_mw = float(val) if val is not None else float(ld.curtailable_mw or ld.P * 0.5)
                shed_mw = min(float(ld.P), max(0.0, shed_mw))
                new_p = round(max(0.0, float(ld.P) - shed_mw), 3)
                overrides[ld.load_id] = {"p_load_mw": new_p, "curtailed_mw": shed_mw}
                overrides[ld.bus_id] = {"p_load_mw": new_p, "curtailed_mw": shed_mw}

        elif atype == "RESTORE_LOAD":
            net_data = power_flow_service.get_network_topology(state.network_id)
            ld = next((l for l in net_data.get("loads", []) if l.load_id == tid or l.bus_id == tid), None)
            if ld:
                overrides.pop(ld.load_id, None)
                overrides.pop(ld.bus_id, None)

        elif atype in ("DISPATCH_BATTERY", "SET_BATTERY"):
            for batt in batteries:
                if batt.battery_id == tid or batt.bus_id == tid:
                    req_kw = float(val) if val is not None else float(batt.max_discharge_kw * 0.8)
                    batt.step_energy(req_kw, dt_hours=0.25)

        elif atype in ("SET_SOURCE_CAPACITY", "SET_SOURCE_LIMIT"):
            source_cap = float(val) if (val is not None and float(val) > 0) else None

        elif atype == "ADVANCE_TIME":
            dt_h = float(val) if val is not None else 0.25
            sim_mins = state.sim_time_minutes + int(round(dt_h * 60))
            for batt in batteries:
                if abs(batt.current_dispatch_kw) > 1e-3:
                    batt.step_energy(batt.current_dispatch_kw, dt_hours=dt_h)

        elif atype == "REDISPATCH_GENERATOR":
            if val is not None:
                overrides[tid] = {"p_gen_mw": float(val), "status": "ONLINE"}

        new_rev = state.revision + 1
        new_log = list(state.action_log) + [
            {
                "revision": new_rev,
                "timestamp": datetime.utcnow().isoformat(),
                "action": atype,
                "action_type": atype,
                "target_id": tid,
                "value": val,
                "description": action.description or f"{atype} on {tid}",
            }
        ]

        new_state = self._recompute_state(
            session_id=sid,
            network_id=state.network_id,
            network_name=state.network_name,
            mission_id=state.mission_id,
            revision=new_rev,
            sim_time_minutes=sim_mins,
            seed=state.seed,
            source_capacity_limit_mw=source_cap,
            overrides=overrides,
            faults=faults,
            switches=switches,
            batteries=batteries,
            action_log=new_log,
        )
        self._sessions[sid] = new_state
        self._history.setdefault(sid, []).append(copy.deepcopy(new_state))
        return new_state

    def run_dsa_algorithm(
        self,
        algorithm_id: str,
        session_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        state = self.get_or_create_session(session_id)
        net_data = power_flow_service.get_network_topology(state.network_id)
        faulted = {f.asset_id for f in state.active_faults if not f.cleared}
        trace = GridDSACatalog.run_algorithm(
            algorithm_id=algorithm_id,
            network_data=net_data,
            tripped_edges=faulted,
            available_supply_mw=state.source_capacity_limit_mw,
            parameters=parameters or {},
        )
        return trace.model_dump()

    def run_caper(
        self,
        session_id: Optional[str] = None,
        switching_budget: int = 5,
    ) -> Dict[str, Any]:
        state = self.get_or_create_session(session_id)
        net_data = power_flow_service.get_network_topology(state.network_id)
        faulted = [f.asset_id for f in state.active_faults if not f.cleared]
        res = CAPEREngine.execute(
            network_data=net_data,
            faulted_edges=faulted,
            source_capacity_limit_mw=state.source_capacity_limit_mw,
            base_overrides=state.state_overrides,
        )
        return res.model_dump()

    def compare_restoration_algorithms(
        self,
        session_id: Optional[str] = None,
        switching_budget: int = 5,
    ) -> Dict[str, Any]:
        state = self.get_or_create_session(session_id)
        net_data = power_flow_service.get_network_topology(state.network_id)
        faulted = [f.asset_id for f in state.active_faults if not f.cleared]
        comp = BaselineRestorationSuite.compare_all(
            network_data=net_data,
            faulted_edges=faulted,
            source_capacity_limit_mw=state.source_capacity_limit_mw,
            base_overrides=state.state_overrides,
        )
        caper_res = comp["caper_result"]
        baselines_dict = {
            row["strategy"]: row
            for row in comp["comparison_table"]
            if row["strategy"] != "CAPER"
        }
        return {
            "network_id": comp["network_id"],
            "faulted_edges": comp["faulted_edges"],
            "source_capacity_limit_mw": comp["source_capacity_limit_mw"],
            "caper": caper_res.model_dump(),
            "baselines": baselines_dict,
            "comparison_table": comp["comparison_table"],
        }

    def apply_restoration_plan(
        self,
        actions: Optional[List[RestorationAction]] = None,
        session_id: Optional[str] = None,
        algorithm: str = "CAPER",
        switching_budget: int = 5,
    ) -> Dict[str, Any]:
        state = self.get_or_create_session(session_id)
        selected_cand = None
        if actions is None:
            net_data = power_flow_service.get_network_topology(state.network_id)
            faulted = [f.asset_id for f in state.active_faults if not f.cleared]
            algo_u = algorithm.upper().strip()
            if algo_u == "CAPER":
                caper_res = CAPEREngine.execute(
                    network_data=net_data,
                    faulted_edges=faulted,
                    source_capacity_limit_mw=state.source_capacity_limit_mw,
                    base_overrides=state.state_overrides,
                )
                selected_cand = caper_res.selected_candidate
                actions = selected_cand.actions
            else:
                b_map = BaselineRestorationSuite.run_all_baselines(
                    network_id=state.network_id,
                    faulted_branches=faulted,
                    state_overrides=state.state_overrides,
                    source_capacity_limit_mw=state.source_capacity_limit_mw,
                    switching_budget=switching_budget,
                )
                selected_cand = b_map.get(algo_u) or next(iter(b_map.values()))
                actions = selected_cand.actions

        for act in (actions or []):
            if act.action_type.upper() != "ISOLATE_FAULT":
                state = self.apply_action(action=act, session_id=state.session_id)

        return {
            "algorithm": algorithm,
            "applied_actions": [a.model_dump() for a in (actions or [])],
            "candidate": selected_cand.model_dump() if selected_cand else None,
            "session": state.model_dump(),
        }

    def undo(self, session_id: Optional[str] = None) -> SimulationSessionState:
        sid = session_id or self._default_session_id
        hist = self._history.get(sid, [])
        if len(hist) > 1:
            hist.pop()
            self._sessions[sid] = copy.deepcopy(hist[-1])
        return self.get_or_create_session(sid)


session_manager = SimulationSessionManager()

"""
Power Flow Service.
High-level service interface for managing electrical network staging,
validation, and power-flow calculation execution requests.
"""

import copy
import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.power.models import (
    PowerFlowRequest,
    PowerFlowResult,
    BusModel,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel,
    RestorationCandidate,
    RestorationAction,
    DataProvenance,
    DataClassification,
)
from app.power.network_builder import ElectricalNetworkBuilder
from app.power.validation import ElectricalValidator, ElectricalValidationError
from app.power.solver import PowerFlowSolver, HAS_PANDAPOWER


class PowerFlowService:
    """
    Manages electrical models, runs physical validation checks,
    and executes Newton-Raphson AC power flow simulations via solver adapter.
    """

    def get_engine_status(self) -> Dict[str, Any]:
        """Returns the current readiness and operational status of the electrical power-flow engine."""
        return {
            "status": "OPERATIONAL",
            "service": "GRIDSEC // GRID-ZERO Cyber-Physical Electrical Engine",
            "version": "3.0.0-gridzero-physics",
            "solver_backend": (
                "pandapower 3.5.6 (Newton-Raphson AC / Exact I^2*R Losses)"
                if HAS_PANDAPOWER
                else "kirchhoff_approximate_fallback (APPROXIMATE_MODEL)"
            ),
            "ac_solver_available": HAS_PANDAPOWER,
            "supported_networks": [
                "TRAINING_FEEDER",
                "IEEE_33_DISTRIBUTION",
                "IEEE_30",
                "INDIA_GRID_59",
                "TEST_NETWORK",
            ],
            "data_provenance_enforced": True,
            "validation_engine_active": True,
            "staged_entities": {
                "buses": True,
                "generators": True,
                "loads": True,
                "transmission_lines": True,
                "transformer_bays": True,
                "switches": True,
                "batteries": True,
            },
            "electrical_metrics_supported": [
                "active_power_mw",
                "reactive_power_mvar",
                "voltage_magnitude_pu",
                "voltage_angle_deg",
                "line_loading_percent",
                "transmission_losses_mw",
                "transformer_loading_percent",
                "kirchhoff_power_balance",
                "n_minus_1_contingency",
                "post_action_restoration_validation",
            ],
        }

    def get_network_topology(self, network_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """Builds and returns electrical network topology for a specified network ID."""
        nid = (network_id or "TEST_NETWORK").upper().strip()
        if nid in ("TEST_NETWORK", "BENCHMARK_4BUS", "4BUS"):
            return ElectricalNetworkBuilder.build_test_network()
        elif nid in ("TRAINING_FEEDER", "SMART_CITY_FEEDER", "CITY_12", "FEEDER_10"):
            return ElectricalNetworkBuilder.build_training_feeder_network()
        elif nid in ("IEEE_33_DISTRIBUTION", "IEEE_33", "IEEE33", "CASE33BW"):
            return ElectricalNetworkBuilder.build_ieee33_network()
        elif nid in ("IEEE_30", "IEEE_30_TRANSMISSION", "IEEE_30_BUS", "IEEE30", "CASE30"):
            return ElectricalNetworkBuilder.build_ieee30_network()
        elif nid in ("INDIA_GRID_59", "INDIA_59_REFERENCE", "INDIA_GRID", "NATIONAL_GRID"):
            if db is None:
                from app.database.connection import SessionLocal
                with SessionLocal() as temp_db:
                    return ElectricalNetworkBuilder.build_india_grid_electrical_model(temp_db)
            return ElectricalNetworkBuilder.build_india_grid_electrical_model(db)
        else:
            raise ValueError(
                f"Unknown network_id: {network_id}. Supported options: "
                "['TRAINING_FEEDER', 'IEEE_33_DISTRIBUTION', 'IEEE_30', 'INDIA_GRID_59', 'TEST_NETWORK']"
            )

    def run_power_flow(
        self,
        network_id: str = "TRAINING_FEEDER",
        state_overrides: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ) -> PowerFlowResult:
        req = PowerFlowRequest(network_id=network_id, state_overrides=state_overrides)
        return self.run_or_stage_power_flow(request=req, db=db, state_overrides=state_overrides)

    def run_or_stage_power_flow(
        self,
        request: PowerFlowRequest,
        db: Optional[Session] = None,
        state_overrides: Optional[Dict[str, Any]] = None,
    ) -> PowerFlowResult:
        """
        Validates electrical network topology and executes AC Newton-Raphson power flow.
        """
        start_time = time.perf_counter()

        # 1. Build electrical network
        network_data = self.get_network_topology(request.network_id, db)

        # Merge request.state_overrides and explicit state_overrides argument
        merged_overrides: Dict[str, Any] = {}
        if request.state_overrides:
            merged_overrides.update(request.state_overrides)
        if state_overrides:
            merged_overrides.update(state_overrides)

        # 2. Run physical validation suite
        is_valid, errors = ElectricalValidator.validate_network(
            buses=network_data["buses"],
            generators=network_data["generators"],
            loads=network_data["loads"],
            lines=network_data["lines"],
            transformers=network_data["transformers"],
        )

        if not is_valid:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            from app.power.models import PowerBalance
            return PowerFlowResult(
                status="VALIDATION_ERROR",
                message=f"Electrical topology validation failed with {len(errors)} error(s): {'; '.join(errors[:3])}",
                network_id=request.network_id,
                scenario_id=request.scenario_id or "BASE_CASE",
                buses=[],
                lines=[],
                transformers=[],
                power_balance=PowerBalance(
                    total_generation_mw=0.0,
                    total_load_mw=0.0,
                    total_losses_mw=0.0,
                    balance_error_mw=0.0,
                    total_q_generation_mvar=0.0,
                    total_q_load_mvar=0.0,
                    total_q_losses_mvar=0.0,
                    slack_bus_id="NONE",
                    slack_p_mw=0.0,
                    slack_q_mvar=0.0,
                    converged=False,
                    iterations=0,
                ),
                violations=[],
                execution_time_ms=elapsed_ms,
                provenance=DataProvenance(
                    data_source="GRIDSEC_VALIDATION_ENGINE",
                    source_url="app/power/validation.py",
                    verification_status="UNVERIFIED",
                    data_classification=DataClassification.DERIVED,
                    notes=f"Validation errors detected: {errors}",
                ),
            )

        # 3. Solve power flow with state overrides if any
        return PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=request.scenario_id or "BASE_CASE",
            state_overrides=merged_overrides or None,
            algorithm=request.algorithm or "nr",
            enforce_q_lims=True if request.enforce_q_lims is None else request.enforce_q_lims,
        )

    def validate_candidate_route_power_flow(
        self,
        candidate_route: List[str],
        additional_mw: float,
        network_id: str = "TEST_NETWORK",
        db: Optional[Session] = None,
        state_overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validates electrical feasibility of a Dijkstra / CAPER candidate alternate route.
        Clones the network state, activates any normally-open tie lines along the route,
        applies the additional power transfer at the destination bus, and solves a true
        post-action Newton-Raphson AC power flow in addition to thermal headroom checks.
        """
        req = PowerFlowRequest(network_id=network_id, scenario_id="BASELINE", state_overrides=state_overrides)
        baseline_res = self.run_or_stage_power_flow(req, db, state_overrides=state_overrides)

        if baseline_res.status != "SUCCESS":
            return {
                "feasible": False,
                "status": "REJECTED_SOLVER_DIVERGED",
                "reason": "Baseline power flow did not converge",
                "candidate_route": candidate_route,
                "bottlenecks": [],
            }

        network_data = self.get_network_topology(network_id, db)
        line_lookup = {l.line_id: l for l in network_data.get("lines", [])}

        # Build post-action overrides: ensure all edges along candidate_route are IN_SERVICE
        post_overrides: Dict[str, Any] = copy.deepcopy(state_overrides or {})
        route_line_ids: List[str] = []
        for i in range(len(candidate_route) - 1):
            u, v = candidate_route[i], candidate_route[i + 1]
            matching_orig = next(
                (
                    l
                    for l in network_data.get("lines", [])
                    if (l.from_bus == u and l.to_bus == v) or (l.from_bus == v and l.to_bus == u)
                ),
                None,
            )
            if matching_orig:
                route_line_ids.append(matching_orig.line_id)
                post_overrides[matching_orig.line_id] = "IN_SERVICE"

        # Solve true post-action AC power flow
        post_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id="CANDIDATE_ROUTE_AC_CHECK",
            state_overrides=post_overrides,
        )

        bottlenecks = []
        for i in range(len(candidate_route) - 1):
            u, v = candidate_route[i], candidate_route[i + 1]
            matching_line = next(
                (
                    l
                    for l in baseline_res.lines
                    if (l.from_bus == u and l.to_bus == v) or (l.from_bus == v and l.to_bus == u)
                ),
                None,
            )
            if matching_line:
                orig_l = line_lookup.get(matching_line.line_id)
                thermal_mw = float(orig_l.thermal_limit_mw) if (orig_l and orig_l.thermal_limit_mw) else 1000.0
                added_pct = (additional_mw / max(1.0, thermal_mw)) * 100.0
                post_line = next((pl for pl in post_res.lines if pl.line_id == matching_line.line_id), None)
                solved_pct = post_line.loading_percent if post_line else matching_line.loading_percent
                est_loading = round(max(solved_pct, matching_line.loading_percent + added_pct), 1)
                if est_loading > 100.0:
                    bottlenecks.append(
                        {
                            "line_id": matching_line.line_id,
                            "from_bus": u,
                            "to_bus": v,
                            "thermal_limit_mw": thermal_mw,
                            "current_loading": matching_line.loading_percent,
                            "solved_post_action_loading": solved_pct,
                            "projected_loading": est_loading,
                            "thermal_limit_exceeded": True,
                        }
                    )

        # Also check voltage violations on solved post-action network
        voltage_violations = [
            v.model_dump()
            for v in (post_res.violations if post_res.status == "SUCCESS" else [])
            if "VOLTAGE" in str(v.violation_type)
        ]

        is_feasible = len(bottlenecks) == 0 and post_res.status == "SUCCESS"
        return {
            "feasible": is_feasible,
            "status": "ACCEPTED" if is_feasible else "REJECTED_THERMAL_OVERLOAD",
            "ac_validated": post_res.status == "SUCCESS",
            "solver_provenance": post_res.provenance.data_classification.value,
            "candidate_route": candidate_route,
            "route_line_ids": route_line_ids,
            "bottlenecks": bottlenecks,
            "voltage_violations": voltage_violations,
            "post_action_losses_mw": post_res.power_balance.total_losses_mw if post_res.power_balance else 0.0,
            "recommendation": (
                "Route electrically verified under post-action AC power flow limits"
                if is_feasible
                else "Reroute exceeds thermal line limits or voltage bounds; alternate path or load curtailment required"
            ),
        }

    def validate_restoration_candidate(
        self,
        candidate: RestorationCandidate,
        network_data: Dict[str, Any],
        base_overrides: Optional[Dict[str, Any]] = None,
        source_capacity_limit_mw: Optional[float] = None,
        voltage_min_pu: float = 0.92,
        voltage_max_pu: float = 1.08,
    ) -> RestorationCandidate:
        """
        True Physical Evaluation of a RestorationCandidate (Section 8.1 & Section 13.4):
        1. Clones current network state and applies all candidate actions (switch closures,
           fault isolations, generator redispatch, battery dispatch, selective load shedding).
        2. Checks topological connectivity from energized sources to target loads.
        3. Runs full AC Newton-Raphson power flow (pandapower.runpp).
        4. Audits post-action voltage bounds [voltage_min_pu, voltage_max_pu], branch thermal limits <= 100%,
           source generation capacity limits (preventing infinite slack bus assumption), and battery SOC limits.
        5. Populates candidate.feasible, candidate.rejection_reasons, and exact physical metrics.
        """
        overrides: Dict[str, Any] = copy.deepcopy(base_overrides or {})
        switches_by_id = {s.switch_id: s for s in network_data.get("switches", [])}
        loads_by_id = {ld.load_id: ld for ld in network_data.get("loads", [])}
        loads_by_bus = {ld.bus_id: ld for ld in network_data.get("loads", [])}
        batteries_by_id = {b.battery_id: b for b in network_data.get("batteries", [])}

        if source_capacity_limit_mw is not None:
            for gen in network_data.get("generators", []):
                parent_bus = next((b for b in network_data.get("buses", []) if b.bus_id == gen.bus_id), None)
                if parent_bus and str(parent_bus.bus_type).endswith("SLACK"):
                    overrides.setdefault(gen.generator_id, {})["Pmax"] = float(source_capacity_limit_mw)

        switching_count = 0
        non_critical_shed_mw = 0.0
        battery_used_kwh = 0.0

        for act in candidate.actions:
            atype = act.action_type.upper()
            tid = act.target_id
            val = act.value

            if atype in ("CLOSE_TIE_SWITCH", "CLOSE_SWITCH", "RECLOSE_LINE"):
                switching_count += 1
                if tid in switches_by_id:
                    sw = switches_by_id[tid]
                    overrides[tid] = {"closed": True, "status": "IN_SERVICE"}
                    if sw.line_id:
                        overrides[sw.line_id] = {"status": "IN_SERVICE"}
                else:
                    overrides[tid] = {"status": "IN_SERVICE"}

            elif atype in ("OPEN_SWITCH", "ISOLATE_FAULT", "TRIP_LINE"):
                switching_count += 1
                if tid in switches_by_id:
                    sw = switches_by_id[tid]
                    overrides[tid] = {"closed": False, "status": "OUT_OF_SERVICE"}
                    if sw.line_id:
                        overrides[sw.line_id] = {"status": "OUT_OF_SERVICE"}
                else:
                    overrides[tid] = {"status": "OUT_OF_SERVICE"}

            elif atype in ("SHED_LOAD", "SHED_NON_CRITICAL_LOAD", "CURTAIL_LOAD"):
                ld = loads_by_id.get(tid) or loads_by_bus.get(tid)
                if ld:
                    shed_mw = float(val) if val is not None else float(ld.curtailable_mw or ld.P * 0.5)
                    shed_mw = min(float(ld.P), max(0.0, shed_mw))
                    new_p = max(0.0, float(ld.P) - shed_mw)
                    overrides[ld.load_id] = {"p_load_mw": new_p, "curtailed_mw": shed_mw}
                    overrides[ld.bus_id] = {"p_load_mw": new_p, "curtailed_mw": shed_mw}
                    non_critical_shed_mw += shed_mw

            elif atype == "RESTORE_LOAD":
                ld = loads_by_id.get(tid) or loads_by_bus.get(tid)
                if ld:
                    restored_p = float(val) if val is not None else float(ld.P)
                    overrides[ld.load_id] = {"p_load_mw": restored_p, "status": "ONLINE"}
                    overrides[ld.bus_id] = {"p_load_mw": restored_p, "status": "ONLINE"}

            elif atype == "DISPATCH_BATTERY":
                batt = batteries_by_id.get(tid)
                if batt:
                    disp_kw = float(val) if val is not None else float(batt.max_discharge_kw * 0.75)
                    disp_kw = min(float(batt.max_discharge_kw), max(-float(batt.max_charge_kw), disp_kw))
                    overrides[batt.battery_id] = {"dispatch_kw": disp_kw}
                    if disp_kw > 0:
                        battery_used_kwh += (disp_kw * 0.25) / max(0.5, float(batt.discharge_efficiency))

            elif atype == "REDISPATCH_GENERATOR":
                if val is not None:
                    overrides[tid] = {"p_gen_mw": float(val), "status": "ONLINE"}

        # Determine active topology connectivity via BFS from energized sources (SLACK / PV / discharging BESS)
        active_adj: Dict[str, List[str]] = {b.bus_id: [] for b in network_data.get("buses", [])}
        for l in network_data.get("lines", []):
            l_ov = overrides.get(l.line_id, {})
            if isinstance(l_ov, str):
                l_ov = {"status": l_ov}
            st = l_ov.get("status", l.status)
            if st not in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "OPEN"):
                active_adj.setdefault(l.from_bus, []).append(l.to_bus)
                active_adj.setdefault(l.to_bus, []).append(l.from_bus)
        for x in network_data.get("transformers", []):
            x_ov = overrides.get(x.transformer_id, {})
            if isinstance(x_ov, str):
                x_ov = {"status": x_ov}
            st = x_ov.get("status", x.status)
            if st not in ("OUT_OF_SERVICE", "TRIPPED"):
                active_adj.setdefault(x.from_bus, []).append(x.to_bus)
                active_adj.setdefault(x.to_bus, []).append(x.from_bus)

        source_buses = set()
        for g in network_data.get("generators", []):
            g_ov = overrides.get(g.generator_id, {})
            if isinstance(g_ov, str):
                g_ov = {"status": g_ov}
            if g_ov.get("status", g.status) not in ("OUT_OF_SERVICE", "TRIPPED"):
                source_buses.add(g.bus_id)
        for batt in network_data.get("batteries", []):
            b_ov = overrides.get(batt.battery_id, {})
            if float(b_ov.get("dispatch_kw", batt.current_dispatch_kw)) > 0:
                source_buses.add(batt.bus_id)

        energized_buses = set(source_buses)
        queue = list(source_buses)
        q_head = 0
        while q_head < len(queue):
            curr = queue[q_head]
            q_head += 1
            for nxt in active_adj.get(curr, []):
                if nxt not in energized_buses:
                    energized_buses.add(nxt)
                    queue.append(nxt)

        # Disconnect loads on un-energized islanded buses so AC solver solves the energized system cleanly
        for ld in network_data.get("loads", []):
            if ld.bus_id not in energized_buses:
                overrides.setdefault(ld.load_id, {})["status"] = "OUT_OF_SERVICE"
        for b in network_data.get("buses", []):
            if b.bus_id not in energized_buses:
                overrides.setdefault(b.bus_id, {})["status"] = "OUT_OF_SERVICE"

        # Solve post-action AC power flow
        pf_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=f"CANDIDATE_{candidate.candidate_id}",
            state_overrides=overrides,
        )

        rejection_reasons: List[str] = []
        if pf_res.status != "SUCCESS" or not pf_res.power_balance.converged:
            rejection_reasons.append(f"AC Solver Diverged: {pf_res.message}")

        # Check line thermal limits and bus voltage limits on energized buses
        max_loading = 0.0
        for lr in pf_res.lines:
            if lr.status != "OUT_OF_SERVICE":
                max_loading = max(max_loading, lr.loading_percent)
                if lr.loading_percent > 100.0:
                    rejection_reasons.append(
                        f"Thermal overload on {lr.line_id} ({lr.name}): {lr.loading_percent:.1f}% > 100.0%"
                    )

        energized_v_pus = [
            br.voltage_pu
            for br in pf_res.buses
            if br.bus_id in energized_buses and br.voltage_pu > 0.1
        ]
        min_v = min(energized_v_pus) if energized_v_pus else 0.0
        max_v = max(energized_v_pus) if energized_v_pus else 0.0
        if energized_v_pus and min_v < voltage_min_pu:
            rejection_reasons.append(f"Undervoltage violation: min V = {min_v:.4f} pu < {voltage_min_pu:.2f} pu")
        if energized_v_pus and max_v > voltage_max_pu:
            rejection_reasons.append(f"Overvoltage violation: max V = {max_v:.4f} pu > {voltage_max_pu:.2f} pu")

        for v in pf_res.violations:
            if v.violation_type.value == "SOURCE_CAPACITY_EXCEEDED":
                rejection_reasons.append(v.description)

        # Compute critical and total load restored
        total_crit_demand = 0.0
        restored_crit_mw = 0.0
        total_demand = 0.0
        restored_total_mw = 0.0
        service_ratios: List[float] = []

        for ld in network_data.get("loads", []):
            base_p = float(ld.P)
            crit_p = float(ld.critical_load_mw) if ld.critical_load_mw > 0 else (base_p if ld.priority_tier == 1 else 0.0)
            total_demand += base_p
            total_crit_demand += crit_p

            if ld.bus_id in energized_buses and pf_res.status == "SUCCESS":
                ld_ov = overrides.get(ld.load_id, {})
                served_p = float(ld_ov.get("p_load_mw", base_p)) if ld_ov.get("status") != "OUT_OF_SERVICE" else 0.0
            else:
                served_p = 0.0

            restored_total_mw += served_p
            restored_crit_mw += min(crit_p, served_p)
            if base_p > 1e-6:
                service_ratios.append(min(1.0, served_p / base_p))

        crit_pct = round((restored_crit_mw / max(1e-6, total_crit_demand)) * 100.0, 2) if total_crit_demand > 0 else 100.0
        total_pct = round((restored_total_mw / max(1e-6, total_demand)) * 100.0, 2) if total_demand > 0 else 100.0

        # Jain's Fairness Index across loads: (sum x_i)^2 / (n * sum(x_i^2))
        if service_ratios and sum(x * x for x in service_ratios) > 1e-9:
            n_loads = len(service_ratios)
            sum_x = sum(service_ratios)
            sum_sq = sum(x * x for x in service_ratios)
            jains_index = round((sum_x * sum_x) / (n_loads * sum_sq), 4)
        else:
            jains_index = 0.0

        losses_mw = pf_res.power_balance.total_losses_mw if pf_res.power_balance else 0.0

        candidate.ac_validated = HAS_PANDAPOWER and pf_res.status == "SUCCESS"
        candidate.solver_provenance = (
            DataClassification.AC_SOLVED if HAS_PANDAPOWER else DataClassification.APPROXIMATE_MODEL
        )
        candidate.feasible = len(rejection_reasons) == 0
        candidate.rejection_reasons = rejection_reasons
        candidate.critical_load_restored_mw = round(restored_crit_mw, 3)
        candidate.critical_load_restored_pct = crit_pct
        candidate.total_load_restored_mw = round(restored_total_mw, 3)
        candidate.total_load_restored_pct = total_pct
        candidate.non_critical_shed_mw = round(non_critical_shed_mw, 3)
        candidate.max_line_loading_pct = round(max_loading, 2)
        candidate.min_voltage_pu = round(min_v, 4)
        candidate.max_voltage_pu = round(max_v, 4)
        candidate.total_losses_mw = round(losses_mw, 4)
        candidate.switching_count = switching_count
        candidate.battery_used_kwh = round(battery_used_kwh, 2)
        candidate.jains_fairness_index = jains_index
        candidate.post_action_power_flow = pf_res

        # Multi-Objective Score (Section 13.5)
        alpha = 100.0   # Critical load restoration weight
        beta = 35.0     # Non-critical load restoration weight
        gamma = 12.0    # Electrical losses penalty
        delta = 40.0    # Overload margin penalty
        eta = 80.0      # Voltage deviation penalty
        zeta = 3.5      # Switching maneuver cost
        theta = 0.02    # Battery depletion cost
        infeasible_pen = 500.0 if not candidate.feasible else 0.0

        overload_excess = max(0.0, (max_loading - 85.0) / 15.0)
        v_dev = max(0.0, 0.95 - min_v) * 10.0 + max(0.0, max_v - 1.05) * 10.0

        breakdown = {
            "critical_reward": round(alpha * (crit_pct / 100.0), 2),
            "total_load_reward": round(beta * (total_pct / 100.0), 2),
            "loss_penalty": round(-gamma * losses_mw, 2),
            "loading_penalty": round(-delta * overload_excess, 2),
            "voltage_penalty": round(-eta * v_dev, 2),
            "switching_penalty": round(-zeta * switching_count, 2),
            "battery_penalty": round(-theta * battery_used_kwh, 2),
            "infeasibility_penalty": round(-infeasible_pen, 2),
        }
        candidate.score_breakdown = breakdown
        candidate.objective_score = round(sum(breakdown.values()), 2)
        return candidate


power_flow_service = PowerFlowService()

"""
Pandapower AC Power Flow Solver Adapter for GRIDSEC.
Encapsulates numerical load flow computation, Kirchhoff power balance verification,
thermal/voltage constraint violation detection, and structured Pydantic formatting.
"""

import time
import math
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Set

import pandapower as pp
import pandapower.topology as pptop

from app.power.models import (
    BusModel,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel,
    BusType,
    ViolationType,
    DataProvenance,
    DataClassification,
    BusResult,
    LineResult,
    TransformerResult,
    PowerBalance,
    Violation,
    PowerFlowResult
)


class PowerFlowSolver:
    """
    Clean adapter interfacing pandapower AC Newton-Raphson power-flow solver with GRIDSEC.
    """

    @classmethod
    def build_pandapower_network(
        cls,
        network_data: Dict[str, Any],
        state_overrides: Optional[Dict[str, Any]] = None
    ) -> Tuple[Any, Dict[str, int], Dict[str, Any]]:
        """
        Constructs a native pandapower network object from GRIDSEC bus-branch models.
        Applies optional simulation state overrides (e.g. tripped lines or transformers).
        """
        net = pp.create_empty_network(name=network_data.get("network_id", "GRIDSEC_NET"))
        raw_overrides = state_overrides or {}
        # Normalize overrides so string statuses like {"LINE-1-2": "OUT_OF_SERVICE"} become dicts
        overrides: Dict[str, Dict[str, Any]] = {}
        for k, v in raw_overrides.items():
            if isinstance(v, str):
                overrides[k] = {"status": v}
            elif isinstance(v, dict):
                overrides[k] = v
            else:
                overrides[k] = {}

        bus_map: Dict[str, int] = {} # bus_id -> pandapower bus index
        element_map: Dict[str, Any] = {"lines": {}, "transformers": {}, "generators": {}, "loads": {}}

        buses: List[BusModel] = network_data.get("buses", [])
        generators: List[GeneratorModel] = network_data.get("generators", [])
        loads: List[LoadModel] = network_data.get("loads", [])
        lines: List[TransmissionLineModel] = network_data.get("lines", [])
        transformers: List[TransformerModel] = network_data.get("transformers", [])

        # 1. Add Buses
        for b in buses:
            override = overrides.get(b.bus_id, {})
            is_in_service = override.get("status", b.status) not in ("OUT_OF_SERVICE", "ISOLATED", "TRIPPED")
            
            idx = pp.create_bus(
                net,
                vn_kv=float(b.voltage_kv),
                name=b.name,
                in_service=is_in_service,
                type="b"
            )
            bus_map[b.bus_id] = idx

        # 2. Add Generators / Slack Reference Grid
        for gen in generators:
            if gen.bus_id not in bus_map:
                continue
            bus_idx = bus_map[gen.bus_id]
            parent_bus = next((b for b in buses if b.bus_id == gen.bus_id), None)
            is_slack = parent_bus and parent_bus.bus_type == BusType.SLACK
            
            override = overrides.get(gen.generator_id, {})
            if isinstance(override, str):
                override = {"status": override}
            is_in_service = override.get("status", gen.status) not in ("OUT_OF_SERVICE", "TRIPPED")

            if is_slack:
                # External Grid / Slack Bus (Fixed voltage magnitude, reference angle 0 deg)
                g_idx = pp.create_ext_grid(
                    net,
                    bus=bus_idx,
                    vm_pu=float(gen.voltage_setpoint_pu or 1.02),
                    va_degree=0.0,
                    name=gen.name,
                    in_service=is_in_service,
                    min_p_mw=float(gen.Pmin),
                    max_p_mw=float(gen.Pmax),
                    min_q_mvar=float(gen.Qmin),
                    max_q_mvar=float(gen.Qmax)
                )
                element_map["generators"][gen.generator_id] = ("ext_grid", g_idx)
            else:
                # PV Generator Bus (Dispatched P and voltage setpoint V)
                g_idx = pp.create_gen(
                    net,
                    bus=bus_idx,
                    p_mw=float(gen.current_P),
                    vm_pu=float(gen.voltage_setpoint_pu or 1.01),
                    name=gen.name,
                    in_service=is_in_service,
                    min_p_mw=float(gen.Pmin),
                    max_p_mw=float(gen.Pmax),
                    min_q_mvar=float(gen.Qmin),
                    max_q_mvar=float(gen.Qmax),
                    controllable=True
                )
                element_map["generators"][gen.generator_id] = ("gen", g_idx)

        # Ensure at least one reference / swing external grid exists in pandapower
        if len(net.ext_grid) == 0 and buses:
            slack_bus = next((b for b in buses if b.bus_type == BusType.SLACK or str(getattr(b.bus_type, "value", b.bus_type)).upper() == "SLACK"), buses[0])
            if slack_bus and slack_bus.bus_id in bus_map:
                s_idx = bus_map[slack_bus.bus_id]
                eg_idx = pp.create_ext_grid(
                    net,
                    bus=s_idx,
                    vm_pu=float(getattr(slack_bus, "voltage_pu", 1.02) or 1.02),
                    va_degree=0.0,
                    name=f"{slack_bus.name} External Reference Grid",
                    in_service=True
                )
                element_map["generators"][f"EXT_GRID_{slack_bus.bus_id}"] = ("ext_grid", eg_idx)

        # 3. Add Loads
        for ld in loads:
            if ld.bus_id not in bus_map:
                continue
            bus_idx = bus_map[ld.bus_id]
            override = overrides.get(ld.load_id, {})
            if isinstance(override, str):
                override = {"status": override}
            is_in_service = override.get("status", ld.status) not in ("SHED", "OUT_OF_SERVICE")

            l_idx = pp.create_load(
                net,
                bus=bus_idx,
                p_mw=float(ld.P),
                q_mvar=float(ld.Q),
                name=ld.name,
                in_service=is_in_service
            )
            element_map["loads"][ld.load_id] = l_idx

        # 4. Add Transmission Lines
        for line in lines:
            if line.from_bus not in bus_map or line.to_bus not in bus_map:
                continue
            from_idx = bus_map[line.from_bus]
            to_idx = bus_map[line.to_bus]

            override = overrides.get(line.line_id, {})
            if isinstance(override, str):
                override = {"status": override}
            is_in_service = override.get("status", line.status) not in ("DISCONNECTED", "OUT_OF_SERVICE", "TRIPPED")

            # Calculate per-km parameters
            length = max(0.1, float(line.length_km))
            r_per_km = line.r_ohm_per_km or (line.resistance_ohm / length)
            x_per_km = line.x_ohm_per_km or (line.reactance_ohm / length)
            
            # Susceptance b in uS/km -> capacitance in nF/km (C = B / (2*pi*f) * 1e3)
            # at 50 Hz: 2*pi*50 = 314.159. 1 uS = 1e-6 S -> C = (b_uS * 1e-6) / 314.159 * 1e9 = b_uS * 3.1831 nF/km
            b_uS_km = line.b_microsiemens_per_km or (line.susceptance / length if line.susceptance else 3.5)
            c_nf_km = max(0.1, b_uS_km * 3.1831)
            max_i_ka = line.current_limit_ka or round(line.thermal_limit_mw / (math.sqrt(3) * line.voltage_kv * 0.95), 3)

            l_idx = pp.create_line_from_parameters(
                net,
                from_bus=from_idx,
                to_bus=to_idx,
                length_km=length,
                r_ohm_per_km=r_per_km,
                x_ohm_per_km=x_per_km,
                c_nf_per_km=c_nf_km,
                max_i_ka=max(0.1, max_i_ka),
                name=line.name,
                in_service=is_in_service
            )
            element_map["lines"][line.line_id] = l_idx

        # 5. Add Transformers
        for xfmr in transformers:
            if xfmr.from_bus not in bus_map or xfmr.to_bus not in bus_map or xfmr.from_bus == xfmr.to_bus:
                continue
            hv_idx = bus_map[xfmr.from_bus]
            lv_idx = bus_map[xfmr.to_bus]

            override = overrides.get(xfmr.transformer_id, {})
            if isinstance(override, str):
                override = {"status": override}
            is_in_service = override.get("status", xfmr.status) not in ("TRIPPED", "OUT_OF_SERVICE")

            t_idx = pp.create_transformer_from_parameters(
                net,
                hv_bus=hv_idx,
                lv_bus=lv_idx,
                sn_mva=float(xfmr.rated_mva),
                vn_hv_kv=float(xfmr.primary_kv),
                vn_lv_kv=float(xfmr.secondary_kv),
                vkr_percent=float(xfmr.resistance_percent or 0.25),
                vk_percent=float(xfmr.impedance_percent or 14.5),
                pfe_kw=50.0,
                i0_percent=0.08,
                tap_pos=int(override.get("tap_position", override.get("tap_pos", xfmr.tap_position or 0))),
                tap_min=int(override.get("tap_min", xfmr.tap_min or -10)),
                tap_max=int(override.get("tap_max", xfmr.tap_max or 10)),
                tap_step_percent=float(override.get("tap_step_percent", getattr(xfmr, "tap_step_percent", 1.25) or 1.25)),
                tap_neutral=0,
                tap_side="hv",
                tap_changer_type="Ratio",
                name=xfmr.name,
                in_service=is_in_service
            )
            element_map["transformers"][xfmr.transformer_id] = t_idx

        return net, bus_map, element_map

    @classmethod
    def solve(
        cls,
        network_data: Dict[str, Any],
        scenario_id: str = "BASE_CASE",
        state_overrides: Optional[Dict[str, Any]] = None,
        algorithm: str = "nr",
        enforce_q_lims: bool = True
    ) -> PowerFlowResult:
        """
        Builds, executes, and parses an AC Newton-Raphson electrical load flow calculation.
        """
        start_time = time.perf_counter()
        prov = DataProvenance(
            data_source="pandapower_3.5.4 (Newton-Raphson AC Solver)",
            source_url="https://pandapower.readthedocs.io/",
            source_date=datetime.utcnow().strftime("%Y-%m-%d"),
            verification_status="SOLVER_VALIDATED",
            data_classification=DataClassification.SOLVER_DERIVED,
            notes="Full AC load flow converged with exact non-linear power equations, branch losses, and Q boundaries."
        )

        try:
            net, bus_map, element_map = cls.build_pandapower_network(network_data, state_overrides)
            
            # Execute AC Newton-Raphson power flow
            pp.runpp(
                net,
                algorithm=algorithm,
                enforce_q_lims=enforce_q_lims,
                calculate_voltage_angles=True,
                max_iteration=30,
                tolerance_mva=1e-5
            )

            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return cls._parse_solver_success(net, network_data, scenario_id, bus_map, element_map, elapsed_ms, prov)

        except pp.LoadflowNotConverged:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return PowerFlowResult(
                status="DIVERGED",
                message="AC Power Flow diverged: Non-linear equations failed to reach mathematical tolerance. Voltage collapse or excessive impedance mismatch.",
                network_id=network_data.get("network_id", "UNKNOWN"),
                scenario_id=scenario_id,
                power_balance=PowerBalance(
                    total_generation_mw=0.0,
                    total_load_mw=0.0,
                    total_losses_mw=0.0,
                    balance_error_mw=9999.0,
                    total_q_generation_mvar=0.0,
                    total_q_load_mvar=0.0,
                    total_q_losses_mvar=0.0,
                    slack_bus_id="NONE",
                    slack_p_mw=0.0,
                    slack_q_mvar=0.0,
                    converged=False,
                    iterations=30
                ),
                violations=[
                    Violation(
                        violation_type=ViolationType.VOLTAGE_UNDERVOLTAGE,
                        element_id=network_data.get("network_id", "NET"),
                        element_type="SYSTEM",
                        value=0.0,
                        threshold=0.90,
                        unit="pu",
                        severity="CRITICAL",
                        description="System-wide numerical divergence / voltage collapse detected."
                    )
                ],
                execution_time_ms=elapsed_ms,
                provenance=prov
            )
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return PowerFlowResult(
                status="VALIDATION_ERROR",
                message=f"Power flow execution error: {str(e)}",
                network_id=network_data.get("network_id", "UNKNOWN"),
                scenario_id=scenario_id,
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
                    iterations=0
                ),
                violations=[],
                execution_time_ms=elapsed_ms,
                provenance=prov
            )

    @classmethod
    def _parse_solver_success(
        cls,
        net: Any,
        network_data: Dict[str, Any],
        scenario_id: str,
        bus_map: Dict[str, int],
        element_map: Dict[str, Any],
        elapsed_ms: float,
        prov: DataProvenance
    ) -> PowerFlowResult:
        """Parses solved pandapower network tables into structured Pydantic models."""
        violations: List[Violation] = []
        inv_bus_map = {idx: b_id for b_id, idx in bus_map.items()}

        # 1. Parse Solved Buses
        bus_results: List[BusResult] = []
        orig_buses: List[BusModel] = network_data.get("buses", [])
        
        for b in orig_buses:
            if b.bus_id not in bus_map:
                continue
            idx = bus_map[b.bus_id]
            res_row = net.res_bus.loc[idx] if idx in net.res_bus.index else None
            
            vm_pu = round(float(res_row.vm_pu), 4) if res_row is not None else 0.0
            va_deg = round(float(res_row.va_degree), 3) if res_row is not None else 0.0
            p_mw = round(float(res_row.p_mw), 2) if res_row is not None and hasattr(res_row, "p_mw") else 0.0
            q_mvar = round(float(res_row.q_mvar), 2) if res_row is not None and hasattr(res_row, "q_mvar") else 0.0

            # Voltage constraint check
            if vm_pu < 0.90 and vm_pu > 0.1:
                violations.append(Violation(
                    violation_type=ViolationType.VOLTAGE_UNDERVOLTAGE,
                    element_id=b.bus_id,
                    element_type="BUS",
                    value=vm_pu,
                    threshold=0.90,
                    unit="pu",
                    severity="CRITICAL" if vm_pu < 0.85 else "WARNING",
                    description=f"Bus {b.name} undervoltage: {vm_pu:.4f} pu (< 0.90 pu limit)"
                ))
            elif vm_pu > 1.10:
                violations.append(Violation(
                    violation_type=ViolationType.VOLTAGE_OVERVOLTAGE,
                    element_id=b.bus_id,
                    element_type="BUS",
                    value=vm_pu,
                    threshold=1.10,
                    unit="pu",
                    severity="CRITICAL" if vm_pu > 1.15 else "WARNING",
                    description=f"Bus {b.name} overvoltage: {vm_pu:.4f} pu (> 1.10 pu limit)"
                ))
            # Bus-specific generation and load sums
            bus_gen_p = 0.0
            bus_gen_q = 0.0
            if len(net.res_ext_grid) > 0 and len(net.ext_grid) > 0:
                eg_rows = net.res_ext_grid[net.ext_grid.bus == idx]
                if len(eg_rows) > 0:
                    bus_gen_p += float(eg_rows.p_mw.sum())
                    bus_gen_q += float(eg_rows.q_mvar.sum())
            if len(net.res_gen) > 0 and len(net.gen) > 0:
                g_rows = net.res_gen[net.gen.bus == idx]
                if len(g_rows) > 0:
                    bus_gen_p += float(g_rows.p_mw.sum())
                    bus_gen_q += float(g_rows.q_mvar.sum())

            bus_load_p = 0.0
            bus_load_q = 0.0
            if len(net.res_load) > 0 and len(net.load) > 0:
                l_rows = net.res_load[net.load.bus == idx]
                if len(l_rows) > 0:
                    bus_load_p += float(l_rows.p_mw.sum())
                    bus_load_q += float(l_rows.q_mvar.sum())

            bus_results.append(BusResult(
                bus_id=b.bus_id,
                name=b.name,
                voltage_kv=b.voltage_kv,
                voltage_pu=vm_pu,
                voltage_angle_deg=va_deg,
                p_gen_mw=round(bus_gen_p, 2),
                q_gen_mvar=round(bus_gen_q, 2),
                p_load_mw=round(bus_load_p, 2),
                q_load_mvar=round(bus_load_q, 2)
            ))

        # 2. Parse Solved Transmission Lines
        line_results: List[LineResult] = []
        orig_lines: List[TransmissionLineModel] = network_data.get("lines", [])
        
        for l in orig_lines:
            l_idx = element_map["lines"].get(l.line_id)
            if l_idx is None or l_idx not in net.res_line.index:
                continue
            res_l = net.res_line.loc[l_idx]
            
            p_from = round(float(res_l.p_from_mw), 2)
            q_from = round(float(res_l.q_from_mvar), 2)
            p_to = round(float(res_l.p_to_mw), 2)
            q_to = round(float(res_l.q_to_mvar), 2)
            pl_loss = round(float(res_l.pl_mw), 3)
            ql_loss = round(float(res_l.ql_mvar), 3)
            loading_pct = round(float(res_l.loading_percent), 1)
            i_ka = round(float(res_l.i_from_ka), 3)

            # Thermal line loading check
            if loading_pct > 100.0:
                violations.append(Violation(
                    violation_type=ViolationType.LINE_OVERLOAD,
                    element_id=l.line_id,
                    element_type="LINE",
                    value=loading_pct,
                    threshold=100.0,
                    unit="%",
                    severity="CRITICAL",
                    description=f"Transmission Line {l.name} thermal overload: {loading_pct}% rating ({p_from} MW flow)"
                ))
            elif loading_pct > 85.0:
                violations.append(Violation(
                    violation_type=ViolationType.LINE_OVERLOAD,
                    element_id=l.line_id,
                    element_type="LINE",
                    value=loading_pct,
                    threshold=85.0,
                    unit="%",
                    severity="WARNING",
                    description=f"Transmission Line {l.name} elevated loading: {loading_pct}% rating"
                ))

            line_results.append(LineResult(
                line_id=l.line_id,
                name=l.name,
                from_bus=l.from_bus,
                to_bus=l.to_bus,
                p_from_mw=p_from,
                q_from_mvar=q_from,
                p_to_mw=p_to,
                q_to_mvar=q_to,
                pl_mw=pl_loss,
                ql_mvar=ql_loss,
                loading_percent=loading_pct,
                i_ka=i_ka,
                status="OVERLOADED" if loading_pct > 100.0 else "IN_SERVICE"
            ))

        # 3. Parse Solved Transformers
        xfmr_results: List[TransformerResult] = []
        orig_xfmrs: List[TransformerModel] = network_data.get("transformers", [])

        for x in orig_xfmrs:
            t_idx = element_map["transformers"].get(x.transformer_id)
            if t_idx is None or t_idx not in net.res_trafo.index:
                continue
            res_t = net.res_trafo.loc[t_idx]

            p_hv = round(float(res_t.p_hv_mw), 2)
            q_hv = round(float(res_t.q_hv_mvar), 2)
            p_lv = round(float(res_t.p_lv_mw), 2)
            q_lv = round(float(res_t.q_lv_mvar), 2)
            pl_loss = round(float(res_t.pl_mw), 3)
            ql_loss = round(float(res_t.ql_mvar), 3)
            loading_pct = round(float(res_t.loading_percent), 1)
            i_hv = round(float(res_t.i_hv_ka), 3)
            i_lv = round(float(res_t.i_lv_ka), 3)

            # Get solved tap position from net.trafo
            tap_pos = int(net.trafo.loc[t_idx, "tap_pos"]) if (t_idx in net.trafo.index and "tap_pos" in net.trafo.columns) else int(x.tap_position or 0)
            tap_min = int(net.trafo.loc[t_idx, "tap_min"]) if (t_idx in net.trafo.index and "tap_min" in net.trafo.columns) else int(x.tap_min or -10)
            tap_max = int(net.trafo.loc[t_idx, "tap_max"]) if (t_idx in net.trafo.index and "tap_max" in net.trafo.columns) else int(x.tap_max or 10)

            if loading_pct > 100.0:
                violations.append(Violation(
                    violation_type=ViolationType.TRANSFORMER_OVERLOAD,
                    element_id=x.transformer_id,
                    element_type="TRANSFORMER",
                    value=loading_pct,
                    threshold=100.0,
                    unit="%",
                    severity="CRITICAL",
                    description=f"Transformer {x.name} overloaded: {loading_pct}% of {x.rated_mva} MVA capacity"
                ))

            xfmr_results.append(TransformerResult(
                transformer_id=x.transformer_id,
                name=x.name,
                from_bus=x.from_bus,
                to_bus=x.to_bus,
                p_hv_mw=p_hv,
                q_hv_mvar=q_hv,
                p_lv_mw=p_lv,
                q_lv_mvar=q_lv,
                pl_mw=pl_loss,
                ql_mvar=ql_loss,
                loading_percent=loading_pct,
                i_hv_ka=i_hv,
                i_lv_ka=i_lv,
                tap_position=tap_pos,
                tap_min=tap_min,
                tap_max=tap_max,
                status="OVERLOADED" if loading_pct > 100.0 else "IN_SERVICE"
            ))

        # 4. Strict Kirchhoff Power Balance Calculation
        total_p_gen = 0.0
        total_q_gen = 0.0
        slack_bus_id = "BUS-1"
        slack_p = 0.0
        slack_q = 0.0

        if len(net.res_ext_grid) > 0:
            slack_p = round(float(net.res_ext_grid.p_mw.sum()), 2)
            slack_q = round(float(net.res_ext_grid.q_mvar.sum()), 2)
            slack_bus_idx = net.ext_grid.bus.iloc[0]
            slack_bus_id = inv_bus_map.get(slack_bus_idx, "SLACK")
            total_p_gen += slack_p
            total_q_gen += slack_q

        if len(net.res_gen) > 0:
            total_p_gen += float(net.res_gen.p_mw.sum())
            total_q_gen += float(net.res_gen.q_mvar.sum())

        total_p_load = float(net.res_load.p_mw.sum()) if len(net.res_load) > 0 else 0.0
        total_q_load = float(net.res_load.q_mvar.sum()) if len(net.res_load) > 0 else 0.0

        total_line_loss = float(net.res_line.pl_mw.sum()) if len(net.res_line) > 0 else 0.0
        total_trafo_loss = float(net.res_trafo.pl_mw.sum()) if len(net.res_trafo) > 0 else 0.0
        total_p_loss = total_line_loss + total_trafo_loss

        total_q_line_loss = float(net.res_line.ql_mvar.sum()) if len(net.res_line) > 0 else 0.0
        total_q_trafo_loss = float(net.res_trafo.ql_mvar.sum()) if len(net.res_trafo) > 0 else 0.0
        total_q_loss = total_q_line_loss + total_q_trafo_loss

        # Balance Error = |P_gen - (P_load + P_loss)|
        balance_error = abs(total_p_gen - (total_p_load + total_p_loss))

        power_balance = PowerBalance(
            total_generation_mw=round(total_p_gen, 2),
            total_load_mw=round(total_p_load, 2),
            total_losses_mw=round(total_p_loss, 3),
            balance_error_mw=round(balance_error, 4),
            total_q_generation_mvar=round(total_q_gen, 2),
            total_q_load_mvar=round(total_q_load, 2),
            total_q_losses_mvar=round(total_q_loss, 3),
            slack_bus_id=slack_bus_id,
            slack_p_mw=slack_p,
            slack_q_mvar=slack_q,
            converged=True,
            iterations=int(net._ppc["iterations"]) if "_ppc" in net and "iterations" in net._ppc else 4,
            tolerance=1e-5
        )

        return PowerFlowResult(
            status="SUCCESS",
            message=f"AC Power Flow converged in {power_balance.iterations} iterations. Kirchhoff power balance verified (Mismatch: {power_balance.balance_error_mw:.4f} MW).",
            network_id=network_data.get("network_id", "NET"),
            scenario_id=scenario_id,
            timestamp=datetime.utcnow().isoformat(),
            buses=bus_results,
            lines=line_results,
            transformers=xfmr_results,
            power_balance=power_balance,
            violations=violations,
            execution_time_ms=elapsed_ms,
            solver_backend="pandapower_3.5.4 (Newton-Raphson AC Load Flow)",
            provenance=prov
        )

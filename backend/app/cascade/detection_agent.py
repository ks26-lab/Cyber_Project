"""
Physical Cascade Detection Agent for GRIDSEC.
Examines the latest solver-derived physical AC load flow state and identifies
all physical operating constraint violations (transmission overloads, transformer
overloads, voltage limit breaches, generator limits, power imbalances, divergence).

Guarantees:
- Solver is the single source of physical truth.
- Does not modify grid state, trip assets, or mutate database.
- Does not choose the next cascade event (Detection != Propagation).
- Does not rank or prioritize candidates (Detection != Priority).
- Preserves explicit Data Provenance: SOLVER_DERIVED.
- Deterministic, O(1) hash indexing, explainable decision traces.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace,
    PhysicalViolationRecord
)
from app.cascade.context import CascadeContext
from app.power.models import ViolationType, Violation, PowerFlowResult
from app.dsa.hashing import AssetIndexTable
from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)


class DetectionAgent(CascadeAgent):
    """
    Detection Agent:
    Deterministic analytical component evaluating operating limit violations across
    transmission lines, transformers, buses, generators, and system power balance.
    """

    def __init__(self):
        super().__init__(agent_name="DetectionAgent")
        self.asset_index = AssetIndexTable()

    def _index_assets(self, network_data: Optional[Dict[str, Any]] = None):
        """Builds in-memory hash table for O(1) asset lookups across dimensions."""
        if not network_data:
            return
        self.asset_index.clear()
        for b in network_data.get("buses", []):
            self.asset_index.insert_asset({
                "id": b.bus_id,
                "name": b.name,
                "type": "BUS",
                "voltage_kv": str(b.voltage_kv),
                "state": getattr(b, "state", "NATIONAL"),
                "district": getattr(b, "district", "GRID")
            })
        for l in network_data.get("lines", []):
            self.asset_index.insert_asset({
                "id": l.line_id,
                "name": getattr(l, "name", l.line_id),
                "type": "LINE",
                "from_bus": l.from_bus,
                "to_bus": l.to_bus,
                "thermal_limit_mw": getattr(l, "thermal_limit_mw", 4000.0)
            })
        for t in network_data.get("transformers", []):
            self.asset_index.insert_asset({
                "id": t.transformer_id,
                "name": getattr(t, "name", t.transformer_id),
                "type": "TRANSFORMER",
                "from_bus": t.from_bus,
                "to_bus": t.to_bus,
                "rated_mva": getattr(t, "rated_mva", 1500.0)
            })

    def _publish_event(
        self,
        event_type: GridEventType,
        context: CascadeContext,
        cause: str,
        payload: Dict[str, Any],
        db: Optional[Session] = None,
        severity: str = "INFO"
    ):
        """Publishes lifecycle/detection events to EventBusService if db is available."""
        if not db:
            return
        evt_create = UnifiedGridEventCreate(
            event_type=event_type,
            event_category=EventCategory.SIMULATION_EVENT,
            source_asset=self.agent_name,
            affected_assets=context.tripped_assets,
            severity=severity,
            cause=cause,
            parent_event_id=context.current_event_id,
            simulation_id=context.simulation_id,
            data_source="CASCADE_DETECTION_AGENT",
            payload={
                "cascade_id": context.cascade_id,
                "depth": context.current_depth,
                "agent_name": self.agent_name,
                **payload
            }
        )
        try:
            event_bus_service.publish_event(evt_create, db)
        except Exception:
            pass

    def analyze(self, context: CascadeContext, db: Optional[Session] = None) -> CascadeAgentResult:
        """
        Examines AC power-flow solver state and identifies all operating violations.
        Read-only analysis: does NOT mutate database, grid models, or choose cascade steps.
        """
        self._publish_event(
            GridEventType.CASCADE_AGENT_STARTED,
            context,
            f"DetectionAgent starting physical violation analysis at depth {context.current_depth}",
            {"step": context.current_depth},
            db
        )

        pf_res: Optional[PowerFlowResult] = context.latest_solver_result
        violations: List[PhysicalViolationRecord] = []
        tripped_set: Set[str] = set(context.tripped_assets)

        # ---------------------------------------------------------------------
        # 1. SOLVER DIVERGENCE / FAILURE CHECK
        # ---------------------------------------------------------------------
        if pf_res is None or pf_res.status == "DIVERGED":
            div_msg = pf_res.message if pf_res else "No power flow solver result available."
            div_rec = PhysicalViolationRecord(
                violation_id=f"VIO-DIV-D{context.current_depth}",
                violation_type="SOLVER_DIVERGENCE",
                asset_id="GRID",
                asset_type="SYSTEM",
                observed_value=0.0,
                limit_value=0.0,
                excess=0.0,
                unit="pu",
                severity="CRITICAL",
                provenance="SOLVER_DERIVED",
                step=context.current_depth,
                simulation_id=context.simulation_id,
                cascade_id=context.cascade_id,
                description=f"AC Power Flow numerical divergence: {div_msg}"
            )
            violations.append(div_rec)

            decision = "SOLVER_DIVERGED_VOLTAGE_COLLAPSE"
            severity = "CRITICAL"
            recommended_action = "TERMINATE_CASCADE_DIVERGENCE"
            candidate_assets = ["GRID"]

            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary="AC load flow failed to reach numerical convergence (diverged)",
                decision=decision,
                reason="Non-linear AC Newton-Raphson equations diverged indicating mathematical voltage collapse or impedance separation.",
                confidence=1.0,
                severity=severity,
                evidence={
                    "solver_status": "DIVERGED",
                    "violation_count": 1,
                    "critical_violation_count": 1,
                    "violations": [div_rec.model_dump()]
                }
            )

            self._publish_event(
                GridEventType.CASCADE_AGENT_COMPLETED,
                context,
                f"DetectionAgent completed: {decision}",
                {"decision": decision, "violations_count": 1},
                db,
                severity="CRITICAL"
            )

            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=trace.evidence,
                candidate_assets=candidate_assets,
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="ImpactAgent"
            )

        # ---------------------------------------------------------------------
        # 2. CONFIGURED THRESHOLDS (from context metadata or engineering defaults)
        # ---------------------------------------------------------------------
        line_limit_pct = float(context.metadata.get("protection_threshold_line_loading_pct", 100.0))
        xfmr_limit_pct = float(context.metadata.get("protection_threshold_transformer_loading_pct", 100.0))
        vmin_pu = float(context.metadata.get("voltage_undervoltage_threshold_pu", 0.90))
        vmax_pu = float(context.metadata.get("voltage_overvoltage_threshold_pu", 1.10))
        balance_tol_mw = float(context.metadata.get("power_balance_tolerance_mw", 0.05))

        # ---------------------------------------------------------------------
        # 3. TRANSMISSION LINE THERMAL LOADING CHECK
        # ---------------------------------------------------------------------
        for l in pf_res.lines:
            if l.line_id in tripped_set:
                continue
            if l.loading_percent > line_limit_pct:
                excess_loading = round(l.loading_percent - line_limit_pct, 3)
                sev = "CRITICAL" if excess_loading > 20.0 else "WARNING"
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-LINE-{l.line_id}-D{context.current_depth}",
                    violation_type="LINE_OVERLOAD",
                    asset_id=l.line_id,
                    asset_type="LINE",
                    observed_value=l.loading_percent,
                    limit_value=line_limit_pct,
                    excess=excess_loading,
                    unit="%",
                    severity=sev,
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Transmission Line {l.name} thermal loading {l.loading_percent:.1f}% exceeds limit {line_limit_pct:.1f}% ({l.p_from_mw:.1f} MW flow)"
                ))

        # ---------------------------------------------------------------------
        # 4. POWER TRANSFORMER LOADING CHECK
        # ---------------------------------------------------------------------
        for t in pf_res.transformers:
            if t.transformer_id in tripped_set:
                continue
            if t.loading_percent > xfmr_limit_pct:
                excess_loading = round(t.loading_percent - xfmr_limit_pct, 3)
                sev = "CRITICAL" if excess_loading > 20.0 else "WARNING"
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-XFMR-{t.transformer_id}-D{context.current_depth}",
                    violation_type="TRANSFORMER_OVERLOAD",
                    asset_id=t.transformer_id,
                    asset_type="TRANSFORMER",
                    observed_value=t.loading_percent,
                    limit_value=xfmr_limit_pct,
                    excess=excess_loading,
                    unit="%",
                    severity=sev,
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Transformer {t.name} loading {t.loading_percent:.1f}% exceeds limit {xfmr_limit_pct:.1f}%"
                ))

        # ---------------------------------------------------------------------
        # 5. BUS VOLTAGE CONSTRAINT CHECKS (Vmin / Vmax)
        # ---------------------------------------------------------------------
        for b in pf_res.buses:
            if b.bus_id in tripped_set:
                continue
            # Undervoltage check (ignore de-energized islanded zero voltages)
            if b.voltage_pu < vmin_pu and b.voltage_pu > 0.1:
                excess_uv = round(vmin_pu - b.voltage_pu, 4)
                sev = "CRITICAL" if b.voltage_pu < 0.85 else "WARNING"
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-BUS-UV-{b.bus_id}-D{context.current_depth}",
                    violation_type="VOLTAGE_UNDERVOLTAGE",
                    asset_id=b.bus_id,
                    asset_type="BUS",
                    observed_value=b.voltage_pu,
                    limit_value=vmin_pu,
                    excess=excess_uv,
                    unit="pu",
                    severity=sev,
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Bus {b.name} undervoltage: {b.voltage_pu:.4f} pu (< {vmin_pu:.2f} pu limit)"
                ))
            # Overvoltage check
            elif b.voltage_pu > vmax_pu:
                excess_ov = round(b.voltage_pu - vmax_pu, 4)
                sev = "CRITICAL" if b.voltage_pu > 1.15 else "WARNING"
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-BUS-OV-{b.bus_id}-D{context.current_depth}",
                    violation_type="VOLTAGE_OVERVOLTAGE",
                    asset_id=b.bus_id,
                    asset_type="BUS",
                    observed_value=b.voltage_pu,
                    limit_value=vmax_pu,
                    excess=excess_ov,
                    unit="pu",
                    severity=sev,
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Bus {b.name} overvoltage: {b.voltage_pu:.4f} pu (> {vmax_pu:.2f} pu limit)"
                ))

        # ---------------------------------------------------------------------
        # 6. GENERATOR OPERATING LIMIT CHECKS
        # ---------------------------------------------------------------------
        for g in getattr(pf_res, "generators", []):
            gen_id = getattr(g, "generator_id", None) or getattr(g, "id", None)
            if not gen_id or gen_id in tripped_set:
                continue
            gen_name = getattr(g, "name", gen_id)
            p_val = getattr(g, "p_mw", None)
            if p_val is None:
                p_val = getattr(g, "current_P", 0.0)
            p_max = getattr(g, "p_max_mw", None)
            if p_max is None:
                p_max = getattr(g, "Pmax", None)
            
            q_val = getattr(g, "q_mvar", None)
            if q_val is None:
                q_val = getattr(g, "current_Q", 0.0)
            q_max = getattr(g, "q_max_mvar", None)
            if q_max is None:
                q_max = getattr(g, "Qmax", None)

            # Active power limits
            if p_max is not None and p_val > float(p_max):
                excess_p = round(p_val - float(p_max), 2)
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-GEN-PMAX-{gen_id}-D{context.current_depth}",
                    violation_type="GENERATOR_LIMIT",
                    asset_id=gen_id,
                    asset_type="GENERATOR",
                    observed_value=float(p_val),
                    limit_value=float(p_max),
                    excess=excess_p,
                    unit="MW",
                    severity="CRITICAL" if excess_p > 50.0 else "WARNING",
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Generator {gen_name} active power {p_val:.1f} MW exceeds Pmax {float(p_max):.1f} MW"
                ))
            # Reactive power limits
            if q_max is not None and q_val > float(q_max):
                excess_q = round(q_val - float(q_max), 2)
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-GEN-QMAX-{gen_id}-D{context.current_depth}",
                    violation_type="GENERATOR_Q_LIMIT",
                    asset_id=gen_id,
                    asset_type="GENERATOR",
                    observed_value=float(q_val),
                    limit_value=float(q_max),
                    excess=excess_q,
                    unit="MVAR",
                    severity="WARNING",
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Generator {gen_name} reactive power {q_val:.1f} MVAR exceeds Qmax {float(q_max):.1f} MVAR"
                ))

        # ---------------------------------------------------------------------
        # 7. POWER BALANCE (KIRCHHOFF KCL) CHECK
        # ---------------------------------------------------------------------
        if pf_res.power_balance:
            balance_err = abs(pf_res.power_balance.balance_error_mw)
            if balance_err > balance_tol_mw:
                excess_err = round(balance_err - balance_tol_mw, 4)
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-KCL-BALANCE-D{context.current_depth}",
                    violation_type="POWER_IMBALANCE",
                    asset_id=pf_res.power_balance.slack_bus_id or "GRID",
                    asset_type="SYSTEM",
                    observed_value=balance_err,
                    limit_value=balance_tol_mw,
                    excess=excess_err,
                    unit="MW",
                    severity="CRITICAL" if balance_err > 1.0 else "WARNING",
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=f"Kirchhoff Active Power balance error {balance_err:.4f} MW exceeds tolerance {balance_tol_mw:.4f} MW"
                ))

        # ---------------------------------------------------------------------
        # 8. INTEGRATE PRE-EXISTING SOLVER VIOLATIONS IF ANY
        # ---------------------------------------------------------------------
        existing_keys = {(v.violation_type, v.asset_id) for v in violations}
        for sv in pf_res.violations:
            sv_key = (sv.violation_type.value if hasattr(sv.violation_type, "value") else str(sv.violation_type), sv.element_id)
            if sv_key not in existing_keys and sv.element_id not in tripped_set:
                violations.append(PhysicalViolationRecord(
                    violation_id=f"VIO-SOLVER-{sv.element_id}-D{context.current_depth}",
                    violation_type=sv_key[0],
                    asset_id=sv.element_id,
                    asset_type=sv.element_type,
                    observed_value=sv.value,
                    limit_value=sv.threshold,
                    excess=round(abs(sv.value - sv.threshold), 3),
                    unit=sv.unit,
                    severity=sv.severity.upper() if sv.severity else "WARNING",
                    provenance="SOLVER_DERIVED",
                    step=context.current_depth,
                    simulation_id=context.simulation_id,
                    cascade_id=context.cascade_id,
                    description=sv.description
                ))
                existing_keys.add(sv_key)

        # ---------------------------------------------------------------------
        # 9. DETERMINISTIC SORTING
        # ---------------------------------------------------------------------
        severity_rank_map = {"CRITICAL": 0, "HIGH": 1, "WARNING": 2, "MEDIUM": 3, "LOW": 4, "INFO": 5}
        violations.sort(key=lambda v: (
            severity_rank_map.get(v.severity.upper(), 99),
            v.violation_type,
            v.asset_id
        ))

        # ---------------------------------------------------------------------
        # 10. COMPILE STRUCTURED RESULTS & DECISION TRACE
        # ---------------------------------------------------------------------
        critical_violations = [v for v in violations if v.severity.upper() in ("CRITICAL", "HIGH")]
        candidate_assets = [v.asset_id for v in violations if v.asset_id not in ("GRID", "SYSTEM")]

        if len(violations) > 0:
            decision = f"VIOLATIONS_DETECTED_{len(violations)}"
            severity = "CRITICAL" if len(critical_violations) > 0 else "WARNING"
            recommended_action = "EVALUATE_IMPACT_AND_PRIORITY"
        else:
            decision = "NOMINAL_NO_VIOLATIONS"
            severity = "INFO"
            recommended_action = "MAINTAIN_EQUILIBRIUM"

        trace = AgentDecisionTrace(
            agent_name=self.agent_name,
            step=context.current_depth,
            input_summary=f"AC Solver Status '{pf_res.status}', {len(violations)} physical operating violation(s)",
            decision=decision,
            reason=(
                f"DetectionAgent verified {len(violations)} physical limit breach(es) "
                f"(Critical: {len(critical_violations)}, Warning: {len(violations) - len(critical_violations)}) "
                f"from AC load flow solution."
            ),
            confidence=1.0,
            severity=severity,
            evidence={
                "solver_status": pf_res.status,
                "violation_count": len(violations),
                "critical_violation_count": len(critical_violations),
                "violations": [v.model_dump() for v in violations]
            }
        )

        self._publish_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            context,
            f"DetectionAgent completed analysis: {decision}",
            {
                "decision": decision,
                "violation_count": len(violations),
                "critical_count": len(critical_violations)
            },
            db,
            severity=severity
        )

        return CascadeAgentResult(
            agent_name=self.agent_name,
            status="SUCCESS",
            decision=decision,
            confidence=1.0,
            severity=severity,
            evidence=trace.evidence,
            candidate_assets=candidate_assets,
            recommended_action=recommended_action,
            decision_trace=trace,
            next_agent="ImpactAgent"
        )


detection_agent = DetectionAgent()

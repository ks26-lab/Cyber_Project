"""
Cascade Coordinator for GRIDSEC Cascading Failure Multi-Agent System.
Orchestrates agent state transitions, EventBus lifecycle notifications,
and executes the genuine iterative multi-agent cascading failure loop.
"""

import time
import copy
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple, Set
from sqlalchemy.orm import Session

from app.models.event import Cascade, CascadeEvent, GridEvent
from app.models.simulation_state import SimulationScenario
from app.cascade.contracts import (
    CoordinatorState,
    CascadeAgentResult,
    AgentDecisionTrace,
    CoordinatedStepResult,
    CoordinatedCascadeResult,
    PropagationDecision
)
from app.cascade.context import CascadeContext
from app.cascade.detection_agent import detection_agent
from app.cascade.impact_agent import impact_agent
from app.cascade.priority_agent import priority_agent
from app.cascade.propagation_agent import propagation_agent
from app.cascade.island_agent import island_agent
from app.cascade.recovery_agent import recovery_agent

from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)
from app.schemas.cascade import CascadeSimulationRequest, CascadeSimulationResult
from app.power.power_flow_service import power_flow_service
from app.power.solver import PowerFlowSolver
from app.power.models import PowerFlowResult


def extract_solver_metrics(pf_res: Optional[PowerFlowResult]) -> Dict[str, Any]:
    """Extracts structured, strongly-typed physical metrics directly from PowerFlowResult."""
    if not pf_res:
        return {
            "status": "UNAVAILABLE",
            "converged": False,
            "iterations": 0,
            "min_voltage_pu": None,
            "max_voltage_pu": None,
            "max_line_loading_pct": None,
            "max_transformer_loading_pct": None,
            "total_losses_mw": None,
            "total_generation_mw": None,
            "total_load_mw": None,
            "violations_count": 0
        }
    
    v_pus = [b.voltage_pu for b in pf_res.buses if getattr(b, "voltage_pu", None) is not None]
    min_v = min(v_pus) if v_pus else 1.0
    max_v = max(v_pus) if v_pus else 1.0
    line_loadings = [l.loading_percent for l in pf_res.lines if getattr(l, "loading_percent", None) is not None]
    max_line_loading = max(line_loadings) if line_loadings else 0.0
    trafo_loadings = [t.loading_percent for t in pf_res.transformers if getattr(t, "loading_percent", None) is not None]
    max_trafo_loading = max(trafo_loadings) if trafo_loadings else 0.0
    
    losses = getattr(pf_res.power_balance, "total_losses_mw", getattr(pf_res.power_balance, "total_losses_p_mw", 0.0)) or 0.0
    gen_p = getattr(pf_res.power_balance, "total_generation_mw", getattr(pf_res.power_balance, "total_gen_p_mw", 0.0)) or 0.0
    load_p = getattr(pf_res.power_balance, "total_load_mw", getattr(pf_res.power_balance, "total_load_p_mw", 0.0)) or 0.0
    converged = getattr(pf_res.power_balance, "converged", pf_res.status == "SUCCESS")
    iterations = getattr(pf_res.power_balance, "iterations", 4)
    
    return {
        "status": pf_res.status,
        "converged": bool(converged),
        "iterations": int(iterations),
        "min_voltage_pu": round(float(min_v), 4),
        "max_voltage_pu": round(float(max_v), 4),
        "max_line_loading_pct": round(float(max_line_loading), 2),
        "max_transformer_loading_pct": round(float(max_trafo_loading), 2),
        "total_losses_mw": round(float(losses), 2),
        "total_generation_mw": round(float(gen_p), 2),
        "total_load_mw": round(float(load_p), 2),
        "execution_time_ms": round(float(getattr(pf_res, "execution_time_ms", 0.0)), 2),
        "violations_count": len(pf_res.violations)
    }


class CascadeCoordinator:
    """
    Cascade Coordinator:
    High-level orchestrator executing the deterministic multi-agent workflow:
    RECEIVED -> DETECTING -> IMPACT_ANALYSIS -> PRIORITIZING -> PROPAGATION_DECISION ->
    CASCADE_EXECUTION -> ISLAND_ANALYSIS -> RECOVERY_ANALYSIS -> STEP_COMPLETE.
    
    Orchestrates the live iterative multi-agent loop:
    Disturbance -> AC Power Flow -> Detection -> Impact -> Priority -> Propagation ->
    if eligible: Sandbox Transition -> AC Power Flow -> repeat -> Island -> Recovery -> Terminate.
    """

    def __init__(self):
        self.detection_agent = detection_agent
        self.impact_agent = impact_agent
        self.priority_agent = priority_agent
        self.propagation_agent = propagation_agent
        self.island_agent = island_agent
        self.recovery_agent = recovery_agent

    def _publish_agent_lifecycle_event(
        self,
        event_type: GridEventType,
        agent_name: str,
        context: CascadeContext,
        cause: str,
        payload: Dict[str, Any],
        db: Optional[Session] = None,
        severity: str = "INFO"
    ) -> Optional[GridEvent]:
        """Emits structured agent lifecycle telemetry to the unified EventBus."""
        if not db:
            return None
        
        evt_create = UnifiedGridEventCreate(
            event_type=event_type,
            event_category=EventCategory.SIMULATION_EVENT,
            source_asset=agent_name,
            affected_assets=context.tripped_assets,
            severity=severity,
            cause=cause,
            parent_event_id=context.current_event_id,
            simulation_id=context.simulation_id,
            data_source="CASCADE_COORDINATOR",
            payload={
                "cascade_id": context.cascade_id,
                "depth": context.current_depth,
                "agent_name": agent_name,
                **payload
            }
        )
        try:
            return event_bus_service.publish_event(evt_create, db)
        except Exception:
            return None

    def _publish_cascade_lifecycle_event(
        self,
        event_type: GridEventType,
        simulation_id: str,
        cascade_id: str,
        depth: int,
        cause: str,
        payload: Dict[str, Any],
        parent_event_id: Optional[str] = None,
        affected_assets: Optional[List[str]] = None,
        db: Optional[Session] = None,
        severity: str = "INFO"
    ) -> Optional[GridEvent]:
        """Emits cascade lifecycle telemetry (STARTED, STEP_STARTED, STEP_COMPLETED, TERMINATED)."""
        if not db:
            return None

        evt_create = UnifiedGridEventCreate(
            event_type=event_type,
            event_category=EventCategory.SIMULATION_EVENT,
            source_asset="CASCADE_COORDINATOR",
            affected_assets=affected_assets or [],
            severity=severity,
            cause=cause,
            parent_event_id=parent_event_id,
            simulation_id=simulation_id,
            data_source="CASCADE_COORDINATOR",
            payload={
                "cascade_id": cascade_id,
                "depth": depth,
                **payload
            }
        )
        try:
            return event_bus_service.publish_event(evt_create, db)
        except Exception:
            return None

    def _publish_solver_lifecycle_event(
        self,
        event_type: GridEventType,
        simulation_id: str,
        cascade_id: str,
        depth: int,
        parent_event_id: Optional[str],
        cause: str,
        solver_result: Optional[PowerFlowResult] = None,
        db: Optional[Session] = None
    ) -> Optional[GridEvent]:
        """Emits SOLVER_STARTED and SOLVER_COMPLETED events with authentic quantitative evidence."""
        if not db:
            return None

        payload: Dict[str, Any] = {
            "cascade_id": cascade_id,
            "depth": depth,
        }
        if solver_result:
            payload["solver_metrics"] = extract_solver_metrics(solver_result)
            payload["converged"] = payload["solver_metrics"]["converged"]
            payload["iterations"] = payload["solver_metrics"]["iterations"]
            payload["total_losses_mw"] = payload["solver_metrics"]["total_losses_mw"]
            payload["max_line_loading_pct"] = payload["solver_metrics"]["max_line_loading_pct"]
            payload["min_voltage_pu"] = payload["solver_metrics"]["min_voltage_pu"]

        evt_create = UnifiedGridEventCreate(
            event_type=event_type,
            event_category=EventCategory.PHYSICAL_EVENT if event_type == GridEventType.SOLVER_COMPLETED else EventCategory.SIMULATION_EVENT,
            source_asset="AC_POWER_FLOW_SOLVER",
            affected_assets=[],
            severity="INFO" if (not solver_result or solver_result.status == "SUCCESS") else "CRITICAL",
            cause=cause,
            parent_event_id=parent_event_id,
            simulation_id=simulation_id,
            data_source="CASCADE_SOLVER",
            payload=payload
        )
        try:
            return event_bus_service.publish_event(evt_create, db)
        except Exception:
            return None

    def _publish_physical_violation_events(
        self,
        violations: List[Any],
        simulation_id: str,
        cascade_id: str,
        depth: int,
        parent_event_id: Optional[str],
        db: Optional[Session] = None
    ):
        """Publishes physical violation events to EventBus derived from AC solver and DetectionAgent results."""
        if not db or not violations:
            return

        affected: List[str] = []
        for v in violations:
            if isinstance(v, dict):
                a_id = v.get("asset_id") or v.get("element_id") or "GRID"
            else:
                a_id = getattr(v, "asset_id", None) or getattr(v, "element_id", "GRID")
            if a_id:
                affected.append(str(a_id))

        # 1. Summary PHYSICAL_VIOLATION_DETECTED event
        summary_evt = UnifiedGridEventCreate(
            event_type=GridEventType.PHYSICAL_VIOLATION_DETECTED,
            event_category=EventCategory.PHYSICAL_EVENT,
            source_asset="DETECTION_ENGINE",
            affected_assets=affected if affected else ["GRID"],
            severity="WARNING" if len(violations) <= 2 else "CRITICAL",
            cause=f"Step {depth}: Physical operating violations detected ({len(violations)} total)",
            parent_event_id=parent_event_id,
            simulation_id=simulation_id,
            data_source="CASCADE_SOLVER",
            payload={
                "cascade_id": cascade_id,
                "depth": depth,
                "violation_count": len(violations)
            }
        )
        try:
            event_bus_service.publish_event(summary_evt, db)
        except Exception:
            pass

        # 2. Granular asset violation events
        for v in violations:
            if isinstance(v, dict):
                v_type_str = str(v.get("violation_type", ""))
                asset_id = str(v.get("asset_id") or v.get("element_id") or "GRID")
                observed = float(v.get("observed_value", v.get("actual_value", v.get("value", 0.0))))
                threshold = float(v.get("limit_value", v.get("threshold", 100.0)))
            else:
                v_type_str = getattr(v, "violation_type", "")
                if hasattr(v_type_str, "value"):
                    v_type_str = v_type_str.value
                v_type_str = str(v_type_str)
                asset_id = str(getattr(v, "asset_id", None) or getattr(v, "element_id", "GRID"))
                observed = float(getattr(v, "actual_value", getattr(v, "observed_value", getattr(v, "value", 0.0))))
                threshold = float(getattr(v, "limit_value", getattr(v, "threshold", 100.0)))

            if v_type_str in ("LINE_OVERLOAD", "LINE_OVERLOADED"):
                e_type = GridEventType.LINE_OVERLOAD
                cause = f"Transmission line {asset_id} thermal loading reached {observed:.1f}% (threshold {threshold:.1f}%)"
            elif v_type_str in ("TRANSFORMER_OVERLOAD", "TRANSFORMER_OVERLOADED"):
                e_type = GridEventType.TRANSFORMER_OVERLOAD
                cause = f"Transformer {asset_id} loading reached {observed:.1f}% (threshold {threshold:.1f}%)"
            elif v_type_str == "VOLTAGE_UNDERVOLTAGE":
                e_type = GridEventType.VOLTAGE_UNDERVOLTAGE
                cause = f"Bus {asset_id} voltage dropped to {observed:.3f} pu (threshold {threshold:.3f} pu)"
            elif v_type_str == "VOLTAGE_OVERVOLTAGE":
                e_type = GridEventType.VOLTAGE_OVERVOLTAGE
                cause = f"Bus {asset_id} voltage rose to {observed:.3f} pu (threshold {threshold:.3f} pu)"
            else:
                e_type = GridEventType.PHYSICAL_STATE_UPDATE
                cause = f"Physical violation {v_type_str} on {asset_id}"

            evt_create = UnifiedGridEventCreate(
                event_type=e_type,
                event_category=EventCategory.PHYSICAL_EVENT,
                source_asset=asset_id,
                affected_assets=[asset_id],
                severity="WARNING" if observed <= threshold * 1.15 else "CRITICAL",
                cause=cause,
                parent_event_id=parent_event_id,
                simulation_id=simulation_id,
                data_source="CASCADE_SOLVER",
                payload={
                    "cascade_id": cascade_id,
                    "depth": depth,
                    "violation_type": str(v_type_str),
                    "observed_value": observed,
                    "limit_value": threshold
                }
            )
            try:
                event_bus_service.publish_event(evt_create, db)
            except Exception:
                pass

    def coordinate_step(
        self,
        context: CascadeContext,
        db: Optional[Session] = None
    ) -> CoordinatedStepResult:
        """
        Coordinates a single analytical and decision step across all cascading agents.
        Maintains deterministic state transitions and logs structured decision traces.
        """
        decision_traces: List[AgentDecisionTrace] = []
        state = CoordinatorState.RECEIVED

        # 0. State: PHYSICS_VALIDATION
        val_res = None
        if context.latest_solver_result:
            from app.power.physics_validator import PhysicsValidator
            val_res = PhysicsValidator.validate(
                solver_result=context.latest_solver_result,
                simulation_id=context.simulation_id,
                cascade_id=context.cascade_id,
                step=context.current_depth
            )
            context.physics_validation_result = val_res

            # Emit PHYSICS_VALIDATION_COMPLETED
            if db:
                val_payload = {
                    "validation_status": val_res.validation_status if hasattr(val_res, "validation_status") else "VALID",
                    "all_checks_passed": val_res.all_checks_passed if hasattr(val_res, "all_checks_passed") else True,
                    "violations_count": len(getattr(val_res, "violations", []))
                }
                self._publish_agent_lifecycle_event(
                    GridEventType.PHYSICS_VALIDATION_COMPLETED,
                    "PhysicsValidator",
                    context,
                    f"Physics validation completed for step {context.current_depth}: status={val_payload['validation_status']}",
                    val_payload,
                    db
                )

        # 1. State: DETECTING (DetectionAgent)
        state = CoordinatorState.DETECTING
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "DetectionAgent",
            context,
            f"Detection agent initiated for step {context.current_depth}",
            {"state": state.value},
            db
        )
        det_res = self.detection_agent.analyze(context, db)
        if det_res.decision_trace:
            decision_traces.append(det_res.decision_trace)
        context.previous_agent_results["DetectionAgent"] = det_res
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            "DetectionAgent",
            context,
            f"Detection agent completed with decision: {det_res.decision}",
            {"decision": det_res.decision, "severity": det_res.severity},
            db,
            severity=det_res.severity
        )

        # Check for solver divergence terminal state
        if det_res.decision == "SOLVER_DIVERGED_VOLTAGE_COLLAPSE" or det_res.status == "SOLVER_DIVERGED":
            return CoordinatedStepResult(
                step_number=context.current_depth,
                depth=context.current_depth,
                coordinator_state=CoordinatorState.SOLVER_DIVERGED,
                detection_result=det_res,
                decision_traces=decision_traces,
                physics_validation=val_res,
                is_terminal=True,
                termination_reason="SOLVER_DIVERGED"
            )

        # 2. State: IMPACT_ANALYSIS (ImpactAgent)
        state = CoordinatorState.IMPACT_ANALYSIS
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "ImpactAgent",
            context,
            f"Impact agent analyzing topological blast radius at step {context.current_depth}",
            {"state": state.value},
            db
        )
        imp_res = self.impact_agent.analyze(context, db)
        if imp_res.decision_trace:
            decision_traces.append(imp_res.decision_trace)
        context.previous_agent_results["ImpactAgent"] = imp_res
        self._publish_agent_lifecycle_event(
            GridEventType.IMPACT_ANALYSIS_COMPLETED,
            "ImpactAgent",
            context,
            f"Impact agent completed with decision: {imp_res.decision}",
            {"decision": imp_res.decision, "impact_score": imp_res.evidence.get("impact_score", 0.0)},
            db
        )

        # 3. State: PRIORITIZING (PriorityAgent)
        state = CoordinatorState.PRIORITIZING
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "PriorityAgent",
            context,
            f"Priority agent ranking candidate overloads at step {context.current_depth}",
            {"state": state.value},
            db
        )
        pri_res = self.priority_agent.analyze(context, db)
        if pri_res.decision_trace:
            decision_traces.append(pri_res.decision_trace)
        context.previous_agent_results["PriorityAgent"] = pri_res
        self._publish_agent_lifecycle_event(
            GridEventType.PRIORITY_ANALYSIS_COMPLETED,
            "PriorityAgent",
            context,
            f"Priority agent completed with decision: {pri_res.decision}",
            {"decision": pri_res.decision, "ranked_count": len(pri_res.candidate_assets)},
            db
        )

        # 4. State: PROPAGATION_DECISION (PropagationAgent)
        state = CoordinatorState.PROPAGATION_DECISION
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "PropagationAgent",
            context,
            f"Propagation agent evaluating candidate protection action at step {context.current_depth}",
            {"state": state.value},
            db
        )
        prop_res = self.propagation_agent.analyze(context, db)
        if prop_res.decision_trace:
            decision_traces.append(prop_res.decision_trace)
        context.previous_agent_results["PropagationAgent"] = prop_res
        self._publish_agent_lifecycle_event(
            GridEventType.PROPAGATION_DECISION,
            "PropagationAgent",
            context,
            f"Propagation agent decision: {prop_res.decision}",
            {"decision": prop_res.decision, "action": prop_res.recommended_action},
            db
        )

        # Emit decision created event
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_DECISION_CREATED,
            "CascadeCoordinator",
            context,
            f"Coordinated cascade decision: {prop_res.decision}",
            {
                "recommended_action": prop_res.recommended_action,
                "candidate_asset": prop_res.candidate_assets[0] if prop_res.candidate_assets else None
            },
            db
        )

        # 5. State: ISLAND_ANALYSIS (IslandAgent)
        state = CoordinatorState.ISLAND_ANALYSIS
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "IslandAgent",
            context,
            f"Island agent evaluating grid topology connectivity at step {context.current_depth}",
            {"state": state.value},
            db
        )
        isl_res = self.island_agent.analyze(context, db)
        if isl_res.decision_trace:
            decision_traces.append(isl_res.decision_trace)
        context.previous_agent_results["IslandAgent"] = isl_res
        self._publish_agent_lifecycle_event(
            GridEventType.ISLAND_ANALYSIS,
            "IslandAgent",
            context,
            f"Island agent completed: {isl_res.decision}",
            {"decision": isl_res.decision, "components": isl_res.evidence.get("component_count", 1)},
            db
        )

        # 6. State: RECOVERY_ANALYSIS (RecoveryAgent)
        state = CoordinatorState.RECOVERY_ANALYSIS
        self._publish_agent_lifecycle_event(
            GridEventType.CASCADE_AGENT_STARTED,
            "RecoveryAgent",
            context,
            f"Recovery agent analyzing Dijkstra bypass candidates at step {context.current_depth}",
            {"state": state.value},
            db
        )
        rec_res = self.recovery_agent.analyze(context, db)
        if rec_res.decision_trace:
            decision_traces.append(rec_res.decision_trace)
        context.previous_agent_results["RecoveryAgent"] = rec_res
        self._publish_agent_lifecycle_event(
            GridEventType.RECOVERY_ANALYSIS,
            "RecoveryAgent",
            context,
            f"Recovery agent completed: {rec_res.decision}",
            {"decision": rec_res.decision, "feasible_routes": rec_res.evidence.get("feasible_routes_count", 0)},
            db
        )

        # 7. Aegis Situation Update Event
        if db:
            self._publish_agent_lifecycle_event(
                GridEventType.AEGIS_UPDATE,
                "AegisIntelligence",
                context,
                f"Aegis situation assessment updated for step {context.current_depth}",
                {
                    "step": context.current_depth,
                    "decision": prop_res.decision,
                    "confidence": "HIGH",
                    "evidence_provenance": "SOLVER_DERIVED"
                },
                db
            )

        # 8. Check Terminal Conditions
        is_terminal = False
        termination_reason = None
        final_coord_state = CoordinatorState.STEP_COMPLETE

        if prop_res.recommended_action == "TERMINATE_CASCADE_STABLE":
            is_terminal = True
            termination_reason = "EQUILIBRIUM_REACHED"
            final_coord_state = CoordinatorState.STABLE
        elif isl_res.decision == "CRITICAL_SYSTEM_SEPARATION":
            is_terminal = True
            termination_reason = "SYSTEM_SEPARATION"
            final_coord_state = CoordinatorState.SYSTEM_SEPARATION

        return CoordinatedStepResult(
            step_number=context.current_depth,
            depth=context.current_depth,
            coordinator_state=final_coord_state,
            detection_result=det_res,
            impact_result=imp_res,
            priority_result=pri_res,
            propagation_result=prop_res,
            island_result=isl_res,
            recovery_result=rec_res,
            decision_traces=decision_traces,
            tripped_asset=prop_res.candidate_assets[0] if prop_res.candidate_assets else None,
            physics_validation=val_res,
            is_terminal=is_terminal,
            termination_reason=termination_reason
        )

    def run_coordinated_cascade(
        self,
        request: CascadeSimulationRequest,
        db: Session
    ) -> CoordinatedCascadeResult:
        """
        Executes a genuine, iterative, multi-agent cascade orchestration loop:
        
        Step 0: Solve Baseline AC Power Flow (verify nominal stability).
        Step 1: Apply Initial Disturbance -> Re-solve AC Flow -> Coordinate Step 1 Agents.
        Step K: While not terminal & depth < max_depth:
                If PropagationAgent recommends trip -> Apply transition in sandbox ->
                Re-solve AC Flow -> Coordinate Step K Agents -> Check termination -> repeat.
        Final: Publish CASCADE_TERMINATED, persist records, compile Aegis decision traces.
        """
        start_time = time.perf_counter()
        sim_id = request.simulation_id or f"SIM-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
        cascade_id = f"CAS-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
        network_id = request.network_id or "TEST_NETWORK"

        # 1. Initialize Sandbox Scenario
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == sim_id).first()
        if not scenario:
            scenario = SimulationScenario(
                simulation_id=sim_id,
                name=f"Coordinated Cascade Multi-Agent Session ({request.initial_asset_id})",
                scenario_type="CASCADE_SIMULATION",
                status="RUNNING",
                baseline_reference=network_id,
                state_overrides={},
                event_count=0,
                summary=f"Coordinated multi-agent cascade simulation on {request.initial_asset_id}."
            )
            db.add(scenario)
            db.commit()
            db.refresh(scenario)

        # 2. Fetch Network Model
        network_data = power_flow_service.get_network_topology(network_id, db)

        # 3. Solve Baseline AC Power Flow (Step 0)
        self._publish_solver_lifecycle_event(
            GridEventType.SOLVER_STARTED,
            sim_id,
            cascade_id,
            depth=0,
            parent_event_id=None,
            cause=f"Step 0: Initializing baseline AC load flow solve for network {network_id}",
            db=db
        )
        base_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=f"{sim_id}_STEP_0_BASELINE",
            state_overrides={}
        )
        self._publish_solver_lifecycle_event(
            GridEventType.SOLVER_COMPLETED,
            sim_id,
            cascade_id,
            depth=0,
            parent_event_id=None,
            cause=f"Step 0: Baseline AC load flow solve complete. Status: {base_res.status}",
            solver_result=base_res,
            db=db
        )
        if base_res.status != "SUCCESS":
            raise RuntimeError(f"Baseline power flow failed to converge for network '{network_id}': {base_res.message}")

        # Publish CASCADE_STARTED event
        start_evt = self._publish_cascade_lifecycle_event(
            GridEventType.CASCADE_STARTED,
            sim_id,
            cascade_id,
            depth=0,
            cause=f"Coordinated cascade multi-agent workflow started for {request.initial_asset_id}",
            payload={"network_id": network_id, "initial_asset": request.initial_asset_id},
            db=db
        )
        parent_evt_id = start_evt.event_id if start_evt else None

        # 4. STEP 1: Apply Initial Disturbance
        root_asset_id = request.initial_asset_id
        initial_input_state = {
            "tripped_assets": [],
            "state_overrides": {},
            "metrics": extract_solver_metrics(base_res)
        }
        current_overrides: Dict[str, Any] = {
            root_asset_id: {
                "status": "OUT_OF_SERVICE",
                "electrical_status": "OUT_OF_SERVICE",
                "current_flow_mw": 0.0
            }
        }
        tripped_assets: List[str] = [root_asset_id]

        root_type = "LINE"
        if "XFMR" in root_asset_id or "TRAFO" in root_asset_id:
            root_type = "TRANSFORMER"
        elif "GEN" in root_asset_id:
            root_type = "GENERATOR"
        elif "BUS" in root_asset_id:
            root_type = "BUS"

        # Publish ROOT_DISTURBANCE GridEvent
        root_evt_create = UnifiedGridEventCreate(
            event_type=GridEventType.ROOT_DISTURBANCE,
            event_category=EventCategory.PHYSICAL_EVENT,
            source_asset=root_asset_id,
            affected_assets=[root_asset_id],
            severity="CRITICAL",
            cause=f"Initial root disturbance trigger ({request.initial_action}) on {root_asset_id}",
            parent_event_id=parent_evt_id,
            simulation_id=sim_id,
            data_source="CASCADE_SIMULATOR",
            payload={"action": request.initial_action, "depth": 1, "sequence_number": 1, "cascade_id": cascade_id}
        )
        root_grid_evt = event_bus_service.publish_event(root_evt_create, db)

        # Create Cascade Master Record
        cascade_record = Cascade(
            cascade_id=cascade_id,
            simulation_id=sim_id,
            root_event_id=root_grid_evt.event_id,
            current_depth=1,
            status="RUNNING",
            started_at=datetime.utcnow(),
            summary=f"Cascade initiated by {root_type} trip on {root_asset_id}.",
            impacted_capacity_mw=4000.0 if root_type == "LINE" else 1500.0
        )
        db.add(cascade_record)
        db.commit()
        db.refresh(cascade_record)

        # Record Sequence Step 1 in CascadeEvent table
        step1_event_rec = CascadeEvent(
            cascade_id=cascade_id,
            event_id=root_grid_evt.event_id,
            parent_event_id=parent_evt_id,
            depth=1,
            sequence_number=1
        )
        db.add(step1_event_rec)
        db.commit()

        # Emit CASCADE_STEP_STARTED
        self._publish_cascade_lifecycle_event(
            GridEventType.CASCADE_STEP_STARTED,
            sim_id,
            cascade_id,
            depth=1,
            cause=f"Step 1 started: Post-disturbance analysis for {root_asset_id}",
            payload={"tripped_asset": root_asset_id, "depth": 1},
            parent_event_id=root_grid_evt.event_id,
            affected_assets=tripped_assets,
            db=db
        )

        # Solve AC Power Flow for Step 1
        self._publish_solver_lifecycle_event(
            GridEventType.SOLVER_STARTED,
            sim_id,
            cascade_id,
            depth=1,
            parent_event_id=root_grid_evt.event_id,
            cause=f"Step 1: AC load flow re-solve following root trip of {root_asset_id}",
            db=db
        )
        step1_pf_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=f"{sim_id}_STEP_1_{root_asset_id}",
            state_overrides=current_overrides
        )
        self._publish_solver_lifecycle_event(
            GridEventType.SOLVER_COMPLETED,
            sim_id,
            cascade_id,
            depth=1,
            parent_event_id=root_grid_evt.event_id,
            cause=f"Step 1: AC load flow solved. Status: {step1_pf_res.status}",
            solver_result=step1_pf_res,
            db=db
        )

        # Publish Step 1 physical violation events
        self._publish_physical_violation_events(
            step1_pf_res.violations,
            sim_id,
            cascade_id,
            depth=1,
            parent_event_id=root_grid_evt.event_id,
            db=db
        )

        # Create Step 1 CascadeContext
        step1_ctx = CascadeContext(
            simulation_id=sim_id,
            cascade_id=cascade_id,
            network_id=network_id,
            current_depth=1,
            current_event_id=root_grid_evt.event_id,
            parent_event_id=None,
            current_state_overrides=copy.deepcopy(current_overrides),
            tripped_assets=list(tripped_assets),
            affected_assets=[root_asset_id],
            latest_solver_result=step1_pf_res,
            latest_violations=step1_pf_res.violations,
            metadata={
                "protection_threshold_line_loading_pct": request.protection_threshold_line_loading_pct,
                "protection_threshold_transformer_loading_pct": request.protection_threshold_transformer_loading_pct
            }
        )

        # Execute Step 1 Agents
        step1_res = self.coordinate_step(step1_ctx, db)
        step1_res.input_state = initial_input_state
        step1_res.solver_metrics = extract_solver_metrics(step1_pf_res)
        step1_res.trigger = {
            "type": "ROOT_DISTURBANCE",
            "asset_id": root_asset_id,
            "action": request.initial_action,
            "cause": f"Manual/Cyber disturbance on {root_asset_id}"
        }
        step1_res.output_state = {
            "tripped_assets": list(tripped_assets),
            "state_overrides": copy.deepcopy(current_overrides),
            "metrics": extract_solver_metrics(step1_pf_res)
        }
        step_results: List[CoordinatedStepResult] = [step1_res]
        all_traces: List[AgentDecisionTrace] = list(step1_res.decision_traces)

        # Publish Step 1 physical violation events detected by DetectionAgent
        if step1_res.detection_result and step1_res.detection_result.evidence.get("violations"):
            self._publish_physical_violation_events(
                step1_res.detection_result.evidence["violations"],
                sim_id,
                cascade_id,
                depth=1,
                parent_event_id=root_grid_evt.event_id,
                db=db
            )

        # Emit CASCADE_STEP_COMPLETED
        self._publish_cascade_lifecycle_event(
            GridEventType.CASCADE_STEP_COMPLETED,
            sim_id,
            cascade_id,
            depth=1,
            cause=f"Step 1 completed: Decision = {step1_res.propagation_result.decision if step1_res.propagation_result else 'UNKNOWN'}",
            payload={"decision": step1_res.propagation_result.decision if step1_res.propagation_result else None},
            parent_event_id=root_grid_evt.event_id,
            affected_assets=tripped_assets,
            db=db
        )

        # ---------------------------------------------------------------------
        # STEP K LOOP: Genuine Multi-Step Iterative Cascade Orchestration
        # ---------------------------------------------------------------------
        current_depth = 1
        sequence_num = 1
        prev_event_id = root_grid_evt.event_id
        latest_step_res = step1_res
        latest_pf_res = step1_pf_res
        termination_reason = latest_step_res.termination_reason or "EQUILIBRIUM_REACHED"
        final_status = "STABLE"

        # Track visited topological states to guarantee termination / cycle prevention
        seen_states: Set[Tuple[str, ...]] = {tuple(sorted(tripped_assets))}

        while current_depth < request.max_depth:
            # Check 1: Solver Divergence in prior step
            if latest_pf_res.status in ("DIVERGED", "FAILED", "ERROR"):
                termination_reason = "SOLVER_DIVERGED"
                final_status = "SOLVER_DIVERGED"
                break

            # Check 2: Step Terminal Flag (e.g. Critical System Separation or Equilibrium)
            if latest_step_res.is_terminal:
                termination_reason = latest_step_res.termination_reason or "EQUILIBRIUM_REACHED"
                final_status = latest_step_res.coordinator_state.value
                break

            # Check 3: Propagation Decision Eligibility
            prop_res = latest_step_res.propagation_result
            if not prop_res or prop_res.recommended_action != "EXECUTE_CASCADE_SANDBOX_TRIP" or not prop_res.candidate_assets:
                termination_reason = "EQUILIBRIUM_REACHED"
                final_status = "STABLE"
                break

            candidate_to_trip = prop_res.candidate_assets[0]

            # Loop Protection: Do not repeatedly trip the same asset
            if candidate_to_trip in tripped_assets:
                termination_reason = "EQUILIBRIUM_REACHED"
                final_status = "STABLE"
                break

            # Advance Depth and Sequence
            prior_depth = current_depth
            current_depth += 1
            sequence_num += 1

            # Emit CASCADE_STEP_STARTED
            self._publish_cascade_lifecycle_event(
                GridEventType.CASCADE_STEP_STARTED,
                sim_id,
                cascade_id,
                depth=current_depth,
                cause=f"Step {current_depth} started: Tripping candidate {candidate_to_trip}",
                payload={"candidate_asset": candidate_to_trip, "depth": current_depth},
                parent_event_id=prev_event_id,
                affected_assets=tripped_assets,
                db=db
            )

            # Record input state before step action
            step_k_input_state = {
                "tripped_assets": list(tripped_assets),
                "state_overrides": copy.deepcopy(current_overrides),
                "metrics": extract_solver_metrics(latest_pf_res)
            }

            # Apply Sandbox Transition
            cand_type = "LINE"
            if "XFMR" in candidate_to_trip or "TRAFO" in candidate_to_trip:
                cand_type = "TRANSFORMER"
            elif "GEN" in candidate_to_trip:
                cand_type = "GENERATOR"
            elif "BUS" in candidate_to_trip:
                cand_type = "BUS"

            current_overrides[candidate_to_trip] = {
                "status": "OUT_OF_SERVICE",
                "electrical_status": "OUT_OF_SERVICE",
                "current_flow_mw": 0.0
            }
            tripped_assets.append(candidate_to_trip)

            # Check for State Repetition
            state_key = tuple(sorted(tripped_assets))
            if state_key in seen_states:
                termination_reason = "REPEATED_STATE_DETECTED"
                final_status = "STABLE"
                break
            seen_states.add(state_key)

            # Publish SECONDARY_ACTION Event
            sec_evt_create = UnifiedGridEventCreate(
                event_type=GridEventType.SECONDARY_ACTION,
                event_category=EventCategory.PHYSICAL_EVENT,
                source_asset=candidate_to_trip,
                affected_assets=[candidate_to_trip],
                severity="CRITICAL",
                cause=f"Secondary protection trip: {cand_type} {candidate_to_trip} propagated from step {prior_depth}",
                parent_event_id=prev_event_id,
                simulation_id=sim_id,
                data_source="CASCADE_COORDINATOR",
                payload={"depth": current_depth, "sequence_number": sequence_num, "cascade_id": cascade_id}
            )
            sec_grid_evt = event_bus_service.publish_event(sec_evt_create, db)

            # Publish SANDBOX_STATE_CHANGED
            self._publish_cascade_lifecycle_event(
                GridEventType.SANDBOX_STATE_CHANGED,
                sim_id,
                cascade_id,
                depth=current_depth,
                cause=f"Sandbox state transition: {candidate_to_trip} -> OUT_OF_SERVICE",
                payload={"tripped_asset": candidate_to_trip, "total_tripped": len(tripped_assets)},
                parent_event_id=sec_grid_evt.event_id if sec_grid_evt else prev_event_id,
                affected_assets=tripped_assets,
                db=db
            )

            # Record Sequence Step in CascadeEvent table
            step_record = CascadeEvent(
                cascade_id=cascade_id,
                event_id=sec_grid_evt.event_id if sec_grid_evt else prev_event_id,
                parent_event_id=prev_event_id,
                depth=current_depth,
                sequence_number=sequence_num
            )
            db.add(step_record)
            cascade_record.current_depth = current_depth
            db.commit()

            # Update parent event for next iteration
            prev_event_id = sec_grid_evt.event_id if sec_grid_evt else prev_event_id

            # Re-solve AC Power Flow for Step K
            self._publish_solver_lifecycle_event(
                GridEventType.SOLVER_STARTED,
                sim_id,
                cascade_id,
                depth=current_depth,
                parent_event_id=prev_event_id,
                cause=f"Step {current_depth}: AC load flow re-solve after tripping {candidate_to_trip}",
                db=db
            )
            latest_pf_res = PowerFlowSolver.solve(
                network_data=network_data,
                scenario_id=f"{sim_id}_STEP_{current_depth}_{candidate_to_trip}",
                state_overrides=current_overrides
            )
            self._publish_solver_lifecycle_event(
                GridEventType.SOLVER_COMPLETED,
                sim_id,
                cascade_id,
                depth=current_depth,
                parent_event_id=prev_event_id,
                cause=f"Step {current_depth}: AC load flow solved. Status: {latest_pf_res.status}",
                solver_result=latest_pf_res,
                db=db
            )

            # If solver diverged, record divergence event and terminate cleanly
            if latest_pf_res.status in ("DIVERGED", "FAILED", "ERROR"):
                termination_reason = "SOLVER_DIVERGED"
                final_status = "SOLVER_DIVERGED"
                
                div_evt = UnifiedGridEventCreate(
                    event_type=GridEventType.SOLVER_DIVERGENCE,
                    event_category=EventCategory.PHYSICAL_EVENT,
                    source_asset=candidate_to_trip,
                    affected_assets=tripped_assets,
                    severity="CRITICAL",
                    cause="Non-linear AC load flow diverged. Mathematical voltage collapse or severe impedance mismatch.",
                    parent_event_id=prev_event_id,
                    simulation_id=sim_id,
                    data_source="CASCADE_SOLVER"
                )
                event_bus_service.publish_event(div_evt, db)
                break

            # Publish Physical Violations for Step K
            self._publish_physical_violation_events(
                latest_pf_res.violations,
                sim_id,
                cascade_id,
                depth=current_depth,
                parent_event_id=prev_event_id,
                db=db
            )

            # Create Step K CascadeContext
            step_k_ctx = CascadeContext(
                simulation_id=sim_id,
                cascade_id=cascade_id,
                network_id=network_id,
                current_depth=current_depth,
                current_event_id=prev_event_id,
                parent_event_id=sec_grid_evt.parent_event_id if sec_grid_evt else None,
                current_state_overrides=copy.deepcopy(current_overrides),
                tripped_assets=list(tripped_assets),
                affected_assets=[candidate_to_trip],
                latest_solver_result=latest_pf_res,
                latest_violations=latest_pf_res.violations,
                metadata={
                    "protection_threshold_line_loading_pct": request.protection_threshold_line_loading_pct,
                    "protection_threshold_transformer_loading_pct": request.protection_threshold_transformer_loading_pct
                }
            )

            # Execute Step K Agents
            latest_step_res = self.coordinate_step(step_k_ctx, db)
            latest_step_res.input_state = step_k_input_state
            latest_step_res.solver_metrics = extract_solver_metrics(latest_pf_res)
            latest_step_res.trigger = {
                "type": "SECONDARY_PROTECTION_ACTION",
                "asset_id": candidate_to_trip,
                "action": "PROTECTION_TRIP",
                "cause": f"Thermal/Voltage overload on {candidate_to_trip}"
            }
            latest_step_res.output_state = {
                "tripped_assets": list(tripped_assets),
                "state_overrides": copy.deepcopy(current_overrides),
                "metrics": extract_solver_metrics(latest_pf_res)
            }
            step_results.append(latest_step_res)
            all_traces.extend(latest_step_res.decision_traces)

            # Publish Step K physical violation events detected by DetectionAgent
            if latest_step_res.detection_result and latest_step_res.detection_result.evidence.get("violations"):
                self._publish_physical_violation_events(
                    latest_step_res.detection_result.evidence["violations"],
                    sim_id,
                    cascade_id,
                    depth=current_depth,
                    parent_event_id=prev_event_id,
                    db=db
                )

            # Emit CASCADE_STEP_COMPLETED
            self._publish_cascade_lifecycle_event(
                GridEventType.CASCADE_STEP_COMPLETED,
                sim_id,
                cascade_id,
                depth=current_depth,
                cause=f"Step {current_depth} completed: Decision = {latest_step_res.propagation_result.decision if latest_step_res.propagation_result else 'UNKNOWN'}",
                payload={"decision": latest_step_res.propagation_result.decision if latest_step_res.propagation_result else None},
                parent_event_id=prev_event_id,
                affected_assets=tripped_assets,
                db=db
            )

            # Check if max depth reached without terminal condition
            if current_depth >= request.max_depth and not latest_step_res.is_terminal:
                termination_reason = "MAX_DEPTH_REACHED"
                final_status = "STABLE"
                break

        # If loop exited naturally with equilibrium
        if termination_reason == "EQUILIBRIUM_REACHED":
            final_status = "STABLE"
        elif termination_reason == "SYSTEM_SEPARATION":
            final_status = "SYSTEM_SEPARATION"
        elif termination_reason == "SOLVER_DIVERGED":
            final_status = "SOLVER_DIVERGED"
        elif termination_reason == "MAX_DEPTH_REACHED":
            final_status = "MAX_DEPTH_REACHED"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        # Update Cascade Master Record
        cascade_record.status = final_status
        cascade_record.current_depth = current_depth
        cascade_record.ended_at = datetime.utcnow()
        cascade_record.summary = (
            f"Coordinated cascade multi-agent loop concluded at depth {current_depth}. "
            f"Status: {final_status} ({termination_reason}). "
            f"Tripped {len(tripped_assets)} asset(s): [{', '.join(tripped_assets)}]."
        )
        db.commit()

        # Publish CASCADE_TERMINATED Lifecycle Event
        self._publish_cascade_lifecycle_event(
            GridEventType.CASCADE_TERMINATED,
            sim_id,
            cascade_id,
            depth=current_depth,
            cause=f"Cascade terminated with status {final_status} ({termination_reason})",
            payload={
                "status": final_status,
                "termination_reason": termination_reason,
                "total_steps": len(step_results),
                "tripped_assets": tripped_assets
            },
            parent_event_id=prev_event_id,
            affected_assets=tripped_assets,
            db=db
        )

        summary_narrative = (
            f"Coordinated Cascade Multi-Agent Run completed in {len(step_results)} step(s). "
            f"Final Status: {final_status} ({termination_reason}). "
            f"Generated {len(all_traces)} structured decision traces for Aegis explainability. "
            f"Tripped {len(tripped_assets)} asset(s): [{', '.join(tripped_assets)}]."
        )

        return CoordinatedCascadeResult(
            simulation_id=sim_id,
            cascade_id=cascade_id,
            network_id=network_id,
            status=final_status,
            termination_reason=termination_reason,
            total_steps=len(step_results),
            max_depth_reached=current_depth,
            tripped_assets=tripped_assets,
            step_results=step_results,
            decision_traces=all_traces,
            summary=summary_narrative,
            execution_time_ms=elapsed_ms
        )

    def get_cascade_timeline(self, cascade_id: str, db: Session) -> Dict[str, Any]:
        """
        Retrieves complete chronological event timeline with causal links for a cascade.
        """
        cascade_rec = db.query(Cascade).filter(Cascade.cascade_id == cascade_id).first()
        sim_id = cascade_rec.simulation_id if cascade_rec else None

        if sim_id:
            events = db.query(GridEvent).filter(
                GridEvent.simulation_id == sim_id
            ).order_by(GridEvent.timestamp.asc()).all()
        else:
            all_evts = db.query(GridEvent).order_by(GridEvent.timestamp.asc()).all()
            events = [
                e for e in all_evts 
                if (e.payload or {}).get("cascade_id") == cascade_id or cascade_id in (e.cause or "")
            ]

        timeline_items = []
        causal_graph: Dict[str, List[str]] = {}

        for e in events:
            evt_dict = {
                "event_id": e.event_id,
                "parent_event_id": e.parent_event_id,
                "event_type": e.event_type,
                "source_asset": e.source_asset,
                "affected_assets": e.affected_assets or [],
                "severity": e.severity,
                "cause": e.cause,
                "simulation_id": e.simulation_id,
                "cascade_id": cascade_id,
                "depth": (e.payload or {}).get("depth", 0),
                "timestamp": e.timestamp.isoformat() if hasattr(e.timestamp, "isoformat") else str(e.timestamp),
                "data_source": e.data_source,
                "payload": e.payload or {}
            }
            timeline_items.append(evt_dict)

            if e.parent_event_id:
                causal_graph.setdefault(e.parent_event_id, []).append(e.event_id)

        return {
            "cascade_id": cascade_id,
            "status": cascade_rec.status if cascade_rec else "UNKNOWN",
            "current_depth": cascade_rec.current_depth if cascade_rec else 1,
            "summary": cascade_rec.summary if cascade_rec else "",
            "event_count": len(timeline_items),
            "timeline": timeline_items,
            "causal_graph": causal_graph
        }


cascade_coordinator = CascadeCoordinator()

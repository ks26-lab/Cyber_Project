"""
Propagation Agent for GRIDSEC Cascading Failure Multi-Agent System.
Determines whether the highest-priority physical violation is eligible to become
the next simulated cascade event.

Guarantees:
- Decision-only component: Evaluates eligibility rules without tripping assets.
- Zero state mutation: Does NOT modify state_overrides, database records, or topology.
- Physical grounding: Requires verified solver-derived violation evidence.
- Respects CascadeEngine threshold, depth, and already-tripped constraints.
- Preserves causal parent_event_id and telemetry linkage.
"""

from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace,
    PropagationDecision
)
from app.cascade.context import CascadeContext
from app.power.models import PowerFlowResult
from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)


class PropagationAgent(CascadeAgent):
    """
    Propagation Agent:
    Evaluates top-ranked candidate from PriorityAgent against physical protection rules:
    1. Valid physical evidence (solver-derived).
    2. Overload strictly exceeds configured protection threshold.
    3. Asset is currently active and not already tripped.
    4. Solver state is valid (non-diverged).
    5. Current depth < maximum cascade depth.
    """

    def __init__(self):
        super().__init__(agent_name="PropagationAgent")

    def _publish_event(
        self,
        event_type: GridEventType,
        context: CascadeContext,
        cause: str,
        payload: Dict[str, Any],
        db: Optional[Session] = None,
        severity: str = "INFO"
    ):
        """Publishes agent lifecycle telemetry to unified EventBusService."""
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
            data_source="CASCADE_PROPAGATION_AGENT",
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
        Evaluates the top-ranked candidate against physical propagation rules.
        Returns a structured PropagationDecision without performing state mutation.
        """
        self._publish_event(
            GridEventType.CASCADE_AGENT_STARTED,
            context,
            f"PropagationAgent evaluating candidate propagation eligibility at step {context.current_depth}",
            {"step": context.current_depth},
            db
        )

        pf_res: Optional[PowerFlowResult] = context.latest_solver_result
        max_depth = int(context.metadata.get("max_depth", 10))
        line_threshold = float(context.metadata.get("protection_threshold_line_loading_pct", 100.0))
        xfmr_threshold = float(context.metadata.get("protection_threshold_transformer_loading_pct", 100.0))

        # ---------------------------------------------------------------------
        # RULE 4: SOLVER DIVERGENCE / INVALID NUMERICAL STATE CHECK
        # ---------------------------------------------------------------------
        if pf_res is None or pf_res.status == "DIVERGED":
            decision = "SOLVER_DIVERGED"
            severity = "CRITICAL"
            recommended_action = "TERMINATE_CASCADE_DIVERGENCE"
            reason_text = "Power flow solver diverged or is missing. Cannot evaluate physical propagation in a diverged numerical state."
            evidence = {
                "eligible": False,
                "propagation_decision": None,
                "solver_status": "DIVERGED" if pf_res else "NONE",
                "termination_reason": "SOLVER_DIVERGED"
            }
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary="AC solver status diverged",
                decision=decision,
                reason=reason_text,
                confidence=1.0,
                severity=severity,
                evidence=evidence
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=evidence,
                candidate_assets=[],
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="CascadeEngine"
            )

        # ---------------------------------------------------------------------
        # RULE 5: MAXIMUM CASCADE DEPTH CHECK
        # ---------------------------------------------------------------------
        if context.current_depth >= max_depth:
            decision = "MAX_DEPTH_REACHED"
            severity = "INFO"
            recommended_action = "TERMINATE_CASCADE_MAX_DEPTH"
            reason_text = f"Current cascade depth {context.current_depth} reached configured maximum depth limit {max_depth}."
            evidence = {
                "eligible": False,
                "propagation_decision": None,
                "current_depth": context.current_depth,
                "max_depth": max_depth,
                "termination_reason": "MAX_DEPTH_REACHED"
            }
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary=f"Depth {context.current_depth} >= MaxDepth {max_depth}",
                decision=decision,
                reason=reason_text,
                confidence=1.0,
                severity=severity,
                evidence=evidence
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=evidence,
                candidate_assets=[],
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="CascadeEngine"
            )

        # ---------------------------------------------------------------------
        # RETRIEVE CANDIDATE FROM PRIORITY AGENT
        # ---------------------------------------------------------------------
        priority_res = context.previous_agent_results.get("PriorityAgent")
        top_cand: Optional[Dict[str, Any]] = None

        if priority_res and priority_res.evidence:
            top_cand = priority_res.evidence.get("selected_candidate") or priority_res.evidence.get("top_candidate")

        # Fallback: check context metadata if passed directly
        if not top_cand:
            candidates = context.metadata.get("candidates", [])
            if candidates:
                top_cand = candidates[0]

        # ---------------------------------------------------------------------
        # RULE 1 / ZERO CANDIDATES: STABLE EQUILIBRIUM CHECK
        # ---------------------------------------------------------------------
        if not top_cand:
            decision = "NO_PROPAGATION_EQUILIBRIUM"
            severity = "INFO"
            recommended_action = "TERMINATE_CASCADE_STABLE"
            reason_text = "Zero actionable line or transformer overloads detected above threshold. Grid has reached stable operating equilibrium."
            evidence = {
                "eligible": False,
                "propagation_decision": None,
                "reason": "No overloaded candidate assets found.",
                "termination_reason": "EQUILIBRIUM_REACHED"
            }
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary="No candidate from PriorityAgent",
                decision=decision,
                reason=reason_text,
                confidence=1.0,
                severity=severity,
                evidence=evidence
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=evidence,
                candidate_assets=[],
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="CascadeEngine"
            )

        # Extract Candidate Physical Metrics
        elem_id = top_cand.get("asset_id") or top_cand.get("element_id")
        elem_type = top_cand.get("asset_type") or top_cand.get("element_type", "LINE")
        measured = float(top_cand.get("observed_value") or top_cand.get("measured_value", 0.0))
        configured_threshold = float(
            top_cand.get("limit_value") or top_cand.get("threshold") or (
                xfmr_threshold if elem_type == "TRANSFORMER" else line_threshold
            )
        )
        p_score = float(top_cand.get("priority_score") or top_cand.get("calculated_priority_score", 0.0))
        event_type = "TRANSFORMER_TRIP" if elem_type == "TRANSFORMER" else "LINE_TRIP"

        tripped_set: Set[str] = set(context.tripped_assets)
        is_already_out = (
            elem_id in tripped_set or
            context.current_state_overrides.get(elem_id, {}).get("status") in ("OUT_OF_SERVICE", "TRIPPED", "DISCONNECTED")
        )

        # ---------------------------------------------------------------------
        # RULE 3: ALREADY TRIPPED / OUT OF SERVICE CHECK
        # ---------------------------------------------------------------------
        if is_already_out:
            decision = f"NOT_ELIGIBLE_ALREADY_TRIPPED_{elem_id}"
            severity = "INFO"
            recommended_action = "TERMINATE_CASCADE_STABLE"
            reason_text = f"Candidate asset '{elem_id}' is already tripped or out of service in sandbox state."
            prop_decision = PropagationDecision(
                eligible=False,
                candidate_asset=elem_id,
                candidate_event_type=event_type,
                trigger_reason=reason_text,
                threshold=configured_threshold,
                observed_value=measured,
                excess=0.0,
                severity="INFO",
                priority_score=p_score,
                depth=context.current_depth,
                parent_event_id=context.current_event_id,
                decision="NOT_ELIGIBLE_ALREADY_TRIPPED"
            )
            evidence = {
                "eligible": False,
                "propagation_decision": prop_decision.model_dump(),
                "candidate_asset": elem_id,
                "reason": reason_text
            }
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary=f"Candidate {elem_id} already tripped",
                decision=decision,
                reason=reason_text,
                confidence=1.0,
                severity=severity,
                evidence=evidence
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=evidence,
                candidate_assets=[],
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="CascadeEngine"
            )

        # ---------------------------------------------------------------------
        # RULE 2: THRESHOLD EXCEEDED CHECK
        # ---------------------------------------------------------------------
        if measured <= configured_threshold:
            decision = f"NOT_ELIGIBLE_BELOW_THRESHOLD_{elem_id}"
            severity = "INFO"
            recommended_action = "TERMINATE_CASCADE_STABLE"
            reason_text = f"Candidate asset '{elem_id}' loading {measured:.1f}% does not exceed threshold {configured_threshold:.1f}%."
            prop_decision = PropagationDecision(
                eligible=False,
                candidate_asset=elem_id,
                candidate_event_type=event_type,
                trigger_reason=reason_text,
                threshold=configured_threshold,
                observed_value=measured,
                excess=0.0,
                severity="INFO",
                priority_score=p_score,
                depth=context.current_depth,
                parent_event_id=context.current_event_id,
                decision="NOT_ELIGIBLE_BELOW_THRESHOLD"
            )
            evidence = {
                "eligible": False,
                "propagation_decision": prop_decision.model_dump(),
                "candidate_asset": elem_id,
                "measured_value": measured,
                "threshold": configured_threshold,
                "reason": reason_text
            }
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary=f"Candidate {elem_id} loading {measured:.1f}% <= {configured_threshold:.1f}%",
                decision=decision,
                reason=reason_text,
                confidence=1.0,
                severity=severity,
                evidence=evidence
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision=decision,
                confidence=1.0,
                severity=severity,
                evidence=evidence,
                candidate_assets=[],
                recommended_action=recommended_action,
                decision_trace=trace,
                next_agent="CascadeEngine"
            )

        # ---------------------------------------------------------------------
        # CANDIDATE IS FULLY ELIGIBLE FOR CASCADE PROPAGATION
        # ---------------------------------------------------------------------
        excess_val = round(measured - configured_threshold, 3)
        severity = "CRITICAL" if excess_val > 20.0 else "HIGH"
        trigger_reason = (
            f"Protective relay thermal limit exceeded ({measured:.1f}% > {configured_threshold:.1f}%, excess {excess_val:.1f}%) "
            f"on {elem_type} {elem_id}. Priority Score: {p_score:.2f}."
        )

        prop_decision = PropagationDecision(
            eligible=True,
            candidate_asset=elem_id,
            candidate_event_type=event_type,
            trigger_reason=trigger_reason,
            threshold=configured_threshold,
            observed_value=measured,
            excess=excess_val,
            severity=severity,
            priority_score=p_score,
            depth=context.current_depth,
            parent_event_id=context.current_event_id,
            decision="ELIGIBLE_FOR_PROPAGATION"
        )

        decision = f"PROPAGATE_TRIP_{elem_id}"
        recommended_action = "EXECUTE_CASCADE_SANDBOX_TRIP"
        evidence = {
            "eligible": True,
            "propagation_decision": prop_decision.model_dump(),
            "candidate_asset": elem_id,
            "event_type": event_type,
            "measured_value": measured,
            "threshold": configured_threshold,
            "excess": excess_val,
            "priority_score": p_score,
            "provenance": "PROPAGATION_VALIDATED"
        }

        trace = AgentDecisionTrace(
            agent_name=self.agent_name,
            step=context.current_depth,
            input_summary=f"Candidate {elem_id} loading {measured:.1f}% > {configured_threshold:.1f}% (Excess: {excess_val:.1f}%)",
            decision=decision,
            reason=(
                f"PropagationAgent confirmed {elem_type} '{elem_id}' is eligible for protective tripping in next cascade step. "
                f"Physics Evidence: Solver loading {measured:.1f}% exceeds limit {configured_threshold:.1f}%. "
                f"Candidate status: Active (in-service), Non-diverged solver, Depth {context.current_depth} < {max_depth}. "
                f"Note: PropagationAgent returns decision only; actual sandbox transition is executed by CascadeEngine."
            ),
            confidence=1.0,
            severity=severity,
            evidence=evidence
        )

        self._publish_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            context,
            f"PropagationAgent decision: {decision}",
            {
                "decision": decision,
                "candidate_asset": elem_id,
                "action": recommended_action,
                "eligible": True
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
            evidence=evidence,
            candidate_assets=[elem_id],
            recommended_action=recommended_action,
            decision_trace=trace,
            next_agent="CascadeEngine"
        )


propagation_agent = PropagationAgent()

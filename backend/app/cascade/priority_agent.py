"""
Priority Agent for GRIDSEC Cascading Failure Multi-Agent System.
Ranks concurrent physical operating violations deterministically using DSA Max-Heap Priority Queue.
Determines the single highest-priority candidate for cascade propagation analysis.

Guarantees:
- Uses authentic Max-Heap Priority Queue:
    * Insert candidate: O(log N)
    * Extract maximum: O(log N)
    * Total ranking: O(N log N)
- Deterministic ranking and tie-breaking (priority_score DESC, asset_id ASC).
- Priority != Propagation: Identifies highest priority candidate without tripping assets.
- Priority != Physical Truth: Ranking is an analytical score and does not alter solver state.
- Strictly read-only: Zero database, sandbox state, or topology mutation.
- Does NOT run AC power flow, recovery routing, or LLM calls.
"""

import heapq
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace
)
from app.cascade.context import CascadeContext
from app.dsa.priority_queue import IncidentPriorityQueue
from app.power.models import PowerFlowResult
from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)


class MaxHeapCascadePriorityQueue:
    """
    Dedicated Max-Heap Priority Queue for cascading candidate prioritization.
    Enforces O(log N) push, O(log N) pop, and deterministic tie-breaking (score DESC, asset_id ASC).
    """

    def __init__(self):
        # Heap elements stored as (-priority_score, asset_id, candidate_dict)
        self._heap: List[Tuple[float, str, Dict[str, Any]]] = []

    def push(self, score: float, asset_id: str, candidate_data: Dict[str, Any]):
        """Pushes candidate into max-heap with O(log N) complexity."""
        heapq.heappush(self._heap, (-float(score), str(asset_id), candidate_data))

    def pop(self) -> Optional[Dict[str, Any]]:
        """Extracts candidate with highest priority score with O(log N) complexity."""
        if not self._heap:
            return None
        neg_score, aid, cand = heapq.heappop(self._heap)
        return cand

    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def get_all_ranked(self) -> List[Dict[str, Any]]:
        """
        Extracts all candidates in strict decreasing priority order.
        Complexity: O(N log N).
        """
        temp_heap = list(self._heap)
        ranked: List[Dict[str, Any]] = []
        rank = 1
        while temp_heap:
            neg_score, aid, cand = heapq.heappop(temp_heap)
            item = dict(cand)
            item["priority_rank"] = rank
            ranked.append(item)
            rank += 1
        return ranked


class PriorityAgent(CascadeAgent):
    """
    Priority Agent:
    Deterministic analytical ranking engine using DSA Max-Heap Priority Queue.
    """

    def __init__(self):
        super().__init__(agent_name="PriorityAgent")

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
            data_source="CASCADE_PRIORITY_AGENT",
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

    @staticmethod
    def calculate_candidate_score(
        loading_pct: float,
        limit_pct: float,
        power_flow_mw: float
    ) -> float:
        """
        Canonical deterministic priority formula:
        priority_score = (1.5 * loading_pct) + (2.5 * excess_pct) + (0.01 * abs(P_flow))
        """
        excess_pct = max(0.0, loading_pct - limit_pct)
        score = (1.5 * loading_pct) + (2.5 * excess_pct) + (0.01 * abs(power_flow_mw))
        return round(score, 2)

    def analyze(self, context: CascadeContext, db: Optional[Session] = None) -> CascadeAgentResult:
        """
        Identifies eligible physical propagation candidates, calculates priority scores,
        and extracts ranked candidates via DSA Max-Heap.
        """
        self._publish_event(
            GridEventType.CASCADE_AGENT_STARTED,
            context,
            f"PriorityAgent initiating candidate ranking at step {context.current_depth}",
            {"step": context.current_depth},
            db
        )

        pf_res: Optional[PowerFlowResult] = context.latest_solver_result
        line_threshold = float(context.metadata.get("protection_threshold_line_loading_pct", 100.0))
        xfmr_threshold = float(context.metadata.get("protection_threshold_transformer_loading_pct", 100.0))

        # Check solver divergence safety
        if pf_res and pf_res.status == "DIVERGED":
            trace = AgentDecisionTrace(
                agent_name=self.agent_name,
                step=context.current_depth,
                input_summary="AC load flow diverged; candidate ranking bypassed",
                decision="SOLVER_DIVERGED_NO_RANKING",
                reason="Power flow equations diverged. Non-linear mathematical collapse precludes normal branch overload ranking.",
                confidence=1.0,
                severity="CRITICAL",
                evidence={"solver_status": "DIVERGED", "candidate_count": 0, "ranked_candidates": []}
            )
            return CascadeAgentResult(
                agent_name=self.agent_name,
                status="SUCCESS",
                decision="SOLVER_DIVERGED_NO_RANKING",
                confidence=1.0,
                severity="CRITICAL",
                evidence=trace.evidence,
                candidate_assets=[],
                recommended_action="TERMINATE_CASCADE_DIVERGENCE",
                decision_trace=trace,
                next_agent="PropagationAgent"
            )

        tripped_set: Set[str] = set(context.tripped_assets)
        raw_candidates: List[Dict[str, Any]] = []

        # ---------------------------------------------------------------------
        # 1. EVALUATE ACTIONABLE PROPAGATION CANDIDATES (LINES & TRANSFORMERS)
        # ---------------------------------------------------------------------
        if pf_res:
            # Transmission Lines
            for l in pf_res.lines:
                if l.line_id not in tripped_set and l.loading_percent > line_threshold:
                    overload_excess = round(l.loading_percent - line_threshold, 3)
                    p_flow = abs(l.p_from_mw)
                    score = self.calculate_candidate_score(l.loading_percent, line_threshold, p_flow)
                    sev = "CRITICAL" if overload_excess > 20.0 else "HIGH"
                    raw_candidates.append({
                        "asset_id": l.line_id,
                        "element_id": l.line_id,
                        "asset_type": "LINE",
                        "element_type": "LINE",
                        "violation_type": "LINE_OVERLOAD",
                        "observed_value": round(l.loading_percent, 2),
                        "limit_value": line_threshold,
                        "excess": overload_excess,
                        "overload_percent": overload_excess,
                        "power_flow_mw": round(p_flow, 2),
                        "priority_score": score,
                        "calculated_priority_score": score,
                        "severity": sev,
                        "from_bus": l.from_bus,
                        "to_bus": l.to_bus,
                        "source_bus": l.from_bus,
                        "destination_bus": l.to_bus,
                        "capacity_mw": 4000.0,
                        "provenance": "SOLVER_DERIVED"
                    })

            # Transformers
            for t in pf_res.transformers:
                if t.transformer_id not in tripped_set and t.loading_percent > xfmr_threshold:
                    overload_excess = round(t.loading_percent - xfmr_threshold, 3)
                    p_flow = abs(t.p_hv_mw)
                    score = self.calculate_candidate_score(t.loading_percent, xfmr_threshold, p_flow)
                    sev = "CRITICAL" if overload_excess > 20.0 else "HIGH"
                    raw_candidates.append({
                        "asset_id": t.transformer_id,
                        "element_id": t.transformer_id,
                        "asset_type": "TRANSFORMER",
                        "element_type": "TRANSFORMER",
                        "violation_type": "TRANSFORMER_OVERLOAD",
                        "observed_value": round(t.loading_percent, 2),
                        "limit_value": xfmr_threshold,
                        "excess": overload_excess,
                        "overload_percent": overload_excess,
                        "power_flow_mw": round(p_flow, 2),
                        "priority_score": score,
                        "calculated_priority_score": score,
                        "severity": sev,
                        "from_bus": t.from_bus,
                        "to_bus": t.to_bus,
                        "source_bus": t.from_bus,
                        "destination_bus": t.to_bus,
                        "capacity_mw": 1500.0,
                        "provenance": "SOLVER_DERIVED"
                    })

        # ---------------------------------------------------------------------
        # 2. DSA MAX-HEAP INSERTION & EXTRACTION
        # ---------------------------------------------------------------------
        max_heap = MaxHeapCascadePriorityQueue()
        for cand in raw_candidates:
            max_heap.push(
                score=cand["priority_score"],
                asset_id=cand["asset_id"],
                candidate_data=cand
            )

        ranked_candidates = max_heap.get_all_ranked()
        selected_candidate = ranked_candidates[0] if ranked_candidates else None
        top_asset_id = selected_candidate["asset_id"] if selected_candidate else None
        top_score = selected_candidate["priority_score"] if selected_candidate else 0.0

        # Also push to standard IncidentPriorityQueue for dual-engine compatibility
        incident_pq = IncidentPriorityQueue()
        for cand in raw_candidates:
            incident_pq.push({
                "incident_id": cand["asset_id"],
                "element_id": cand["asset_id"],
                "element_type": cand["asset_type"],
                "severity": cand["severity"],
                "risk_score": min(100.0, cand["priority_score"]),
                "asset_criticality": 8.0 if cand["asset_type"] == "TRANSFORMER" else 6.0,
                "affected_assets_count": 2,
                "candidate_obj": cand
            })

        # ---------------------------------------------------------------------
        # 3. COMPILE STRUCTURED DECISION & TRACE
        # ---------------------------------------------------------------------
        if selected_candidate:
            decision = f"HIGHEST_PRIORITY_CANDIDATE_SELECTED_{top_asset_id}"
            severity = "CRITICAL" if selected_candidate.get("excess", 0.0) > 20.0 else "HIGH"
            recommended_action = "PASS_TO_PROPAGATION_AGENT"
            reason_text = (
                f"Max-Heap evaluated {len(ranked_candidates)} candidate(s). "
                f"Selected '{top_asset_id}' as highest-priority candidate with priority score {top_score:.2f} "
                f"(Loading: {selected_candidate['observed_value']}%, Limit: {selected_candidate['limit_value']}%, Excess: {selected_candidate['excess']}%, Flow: {selected_candidate['power_flow_mw']} MW). "
                f"Priority formula: (1.5 * loading) + (2.5 * excess) + (0.01 * |P_flow|). "
                f"Note: Prioritization is a ranking mechanism and does NOT trip the asset."
            )
        else:
            decision = "NO_PROPAGATION_CANDIDATES"
            severity = "INFO"
            recommended_action = "EQUILIBRIUM_STABLE"
            reason_text = (
                f"Zero actionable line or transformer overloads detected above threshold "
                f"(Line > {line_threshold}%, Transformer > {xfmr_threshold}%). Grid at stable operating equilibrium."
            )

        evidence = {
            "candidate_count": len(ranked_candidates),
            "ranking_method": "MAX_HEAP",
            "priority_formula": "1.5 * loading_pct + 2.5 * excess_pct + 0.01 * abs(P_flow)",
            "selected_candidate": selected_candidate,
            "top_candidate": selected_candidate,
            "selected_asset_id": top_asset_id,
            "top_priority_score": top_score,
            "ranked_candidates": ranked_candidates,
            "provenance": "MAX_HEAP_RANKED"
        }

        trace = AgentDecisionTrace(
            agent_name=self.agent_name,
            step=context.current_depth,
            input_summary=f"{len(raw_candidates)} candidate(s) above threshold",
            decision=decision,
            reason=reason_text,
            confidence=1.0,
            severity=severity,
            evidence=evidence
        )

        self._publish_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            context,
            f"PriorityAgent completed: {decision}",
            {
                "decision": decision,
                "candidate_count": len(ranked_candidates),
                "selected_candidate": top_asset_id,
                "priority_score": top_score
            },
            db,
            severity=severity
        )

        candidate_ids = [c["asset_id"] for c in ranked_candidates]

        return CascadeAgentResult(
            agent_name=self.agent_name,
            status="SUCCESS",
            decision=decision,
            confidence=1.0,
            severity=severity,
            evidence=evidence,
            candidate_assets=candidate_ids,
            recommended_action=recommended_action,
            decision_trace=trace,
            next_agent="PropagationAgent"
        )


priority_agent = PriorityAgent()

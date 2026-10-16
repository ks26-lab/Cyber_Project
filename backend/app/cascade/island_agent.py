"""
Island Agent for GRIDSEC Cascading Failure Multi-Agent System.
Detects synchronous grid separation and topological islanding using Depth-First Search (DFS).
Explicitly separates topological graph partitioning from AC electrical stability.

Algorithmic Complexity:
DFS Connected Component Analysis = O(V + E)
where:
  V = number of active grid buses (vertices)
  E = number of active transmission lines and transformer connections (edges)
"""

from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from sqlalchemy.orm import Session

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace,
    IslandAgentResult
)
from app.cascade.context import CascadeContext
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.dfs import DFSEngine
from app.power.power_flow_service import power_flow_service
from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)


class IslandAgent(CascadeAgent):
    """
    Island Agent:
    Evaluates synchronous grid connectivity using DFS to identify formation of isolated electrical islands.
    
    Core Architectural Boundary:
    1. Observe and partition topology using DFS: O(V + E)
    2. Assess electrical viability from solver evidence (without running or inventing fake solvers)
    3. Read-only: Zero state mutations, zero database mutations, zero direct grid tripping.
    """

    def __init__(self):
        super().__init__(agent_name="IslandAgent")

    def _publish_event(
        self,
        event_type: GridEventType,
        context: CascadeContext,
        cause: str,
        payload: Dict[str, Any],
        db: Optional[Session] = None,
        severity: str = "INFO"
    ):
        """Emits structured agent lifecycle telemetry to the unified EventBus."""
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
            data_source="ISLAND_AGENT",
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

    def _build_topology_graph(
        self,
        network_data: Dict[str, Any],
        state_overrides: Optional[Dict[str, Any]] = None,
        tripped_assets: Optional[List[str]] = None
    ) -> GridGraph:
        """
        Constructs an active GridGraph instance honoring sandbox state overrides and tripped assets.
        Tripped or out-of-service branches do not connect their endpoints.
        """
        graph = GridGraph()
        overrides = state_overrides or {}
        tripped_set = set(tripped_assets or [])

        # 1. Add Buses (Vertices)
        for b in network_data.get("buses", []):
            override = overrides.get(b.bus_id, {})
            status = override if isinstance(override, str) else override.get("status", getattr(b, "status", "IN_SERVICE"))
            is_active = (status not in ("OUT_OF_SERVICE", "ISOLATED", "TRIPPED")) and (b.bus_id not in tripped_set)
            node = GraphNode(
                node_id=b.bus_id,
                name=b.name,
                node_type="SUBSTATION",
                state=getattr(b, "state", "NATIONAL") or "NATIONAL",
                district=getattr(b, "district", "GRID") or "GRID",
                voltage_kv=str(b.voltage_kv),
                capacity_mw=float(getattr(b, "generation_P", 0.0) or 1000.0),
                current_mw=float(getattr(b, "load_P", 0.0) or 500.0),
                status="HEALTHY" if is_active else "ISOLATED",
                risk_score=10.0
            )
            graph.add_node(node)

        # 2. Add Transmission Lines (Edges)
        for l in network_data.get("lines", []):
            override = overrides.get(l.line_id, {})
            status = override if isinstance(override, str) else override.get("status", getattr(l, "status", "IN_SERVICE"))
            is_active = (
                status not in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "BLOCKED")
                and (l.line_id not in tripped_set)
                and (l.from_bus not in tripped_set)
                and (l.to_bus not in tripped_set)
            )
            edge = GraphEdge(
                line_id=l.line_id,
                source=l.from_bus,
                target=l.to_bus,
                line_type=getattr(l, "circuit_type", "765kV_AC"),
                distance_km=float(l.length_km),
                capacity_mw=float(getattr(l, "thermal_limit_mw", 4000.0) or 4000.0),
                current_flow_mw=float(getattr(l, "p_from_mw", 0.0) or 0.0),
                status="HEALTHY" if is_active else "DISCONNECTED",
                risk_factor=10.0
            )
            graph.add_edge(edge)

        # 3. Add Transformers (Edges)
        for t in network_data.get("transformers", []):
            override = overrides.get(t.transformer_id, {})
            status = override if isinstance(override, str) else override.get("status", getattr(t, "status", "IN_SERVICE"))
            is_active = (
                status not in ("OUT_OF_SERVICE", "TRIPPED", "DISCONNECTED")
                and (t.transformer_id not in tripped_set)
                and (t.from_bus not in tripped_set)
                and (t.to_bus not in tripped_set)
            )
            t_edge = GraphEdge(
                line_id=t.transformer_id,
                source=t.from_bus,
                target=t.to_bus,
                line_type="TRANSFORMER",
                distance_km=1.0,
                capacity_mw=float(t.rated_mva),
                current_flow_mw=0.0,
                status="HEALTHY" if is_active else "DISCONNECTED",
                risk_factor=5.0
            )
            graph.add_edge(t_edge)

        return graph

    def assess_electrical_viability(
        self,
        components: List[List[str]],
        solver_status: str,
        network_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Assesses electrical viability for each topological component using solver evidence.
        Distinguishes topological connectivity from electrical viability:
        - ELECTRICALLY_VIABLE: Component has converged power-flow and active generation balance.
        - ELECTRICALLY_NON_VIABLE: Component has diverged or has zero supply capability.
        - SOLVER_DIVERGED: Global non-linear solver divergence.
        - INSUFFICIENT_EVIDENCE: Isolated island without dedicated sub-solver result.
        """
        viability: Dict[str, str] = {}

        if solver_status in ("DIVERGED", "FAILED", "ERROR"):
            for idx, comp in enumerate(components):
                viability[f"island_{idx}"] = "SOLVER_DIVERGED"
            return viability

        # Map buses with generation
        gen_buses = set()
        for g in network_data.get("generators", []):
            gen_buses.add(g.bus_id)
        for b in network_data.get("buses", []):
            if float(getattr(b, "generation_P", 0.0) or 0.0) > 0.0:
                gen_buses.add(b.bus_id)

        is_converged = solver_status in ("CONVERGED", "SUCCESS")

        # If only 1 component and solver converged
        if len(components) <= 1:
            if components:
                viability["island_0"] = "ELECTRICALLY_VIABLE" if is_converged else "INSUFFICIENT_EVIDENCE"
            return viability

        # Multi-component islanding evaluation
        for idx, comp in enumerate(components):
            has_gen = any(bus in gen_buses for bus in comp)
            if idx == 0 and is_converged:
                # Primary / main grid with solver convergence
                viability[f"island_{idx}"] = "ELECTRICALLY_VIABLE"
            elif not has_gen:
                # Isolated load pocket with zero generation
                viability[f"island_{idx}"] = "ELECTRICALLY_NON_VIABLE"
            else:
                # Island has generation but separate AC sub-solution is not modeled
                viability[f"island_{idx}"] = "INSUFFICIENT_EVIDENCE"

        return viability

    def analyze(self, context: CascadeContext, db: Optional[Session] = None) -> CascadeAgentResult:
        """
        Executes deterministic DFS Island Detection analysis against the current cascade context.
        Returns strongly-typed CascadeAgentResult conforming to the Step-2 & Step-7 contract.
        """
        # Publish STARTED lifecycle event
        self._publish_event(
            GridEventType.CASCADE_AGENT_STARTED,
            context,
            f"Island detection initiated using DFS for depth {context.current_depth}",
            {"depth": context.current_depth, "tripped_count": len(context.tripped_assets)},
            db
        )

        net_id = context.network_id or "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(net_id, db)
        graph = self._build_topology_graph(
            network_data,
            context.current_state_overrides,
            context.tripped_assets
        )

        # Execute DFS connected components analysis: O(V + E)
        raw_components: List[List[str]] = DFSEngine.find_connected_components(graph)

        # Deterministically sort components: largest first, then lexicographically by first node ID
        components: List[List[str]] = sorted(
            [sorted(comp) for comp in raw_components],
            key=lambda c: (-len(c), c[0] if c else "")
        )

        component_count = len(components)
        island_detected = component_count > 1

        # Identify primary / main island and isolated islands
        main_island = components[0] if components else None
        isolated_islands = components[1:] if len(components) > 1 else []
        island_sizes = [len(c) for c in components]

        # Electrical solver status correlation
        pf_status = context.latest_solver_result.status if context.latest_solver_result else "UNKNOWN"
        electrical_viability = self.assess_electrical_viability(components, pf_status, network_data)

        # Evaluate decision state
        if pf_status in ("DIVERGED", "FAILED", "ERROR"):
            decision = "SOLVER_DIVERGED"
            severity = "CRITICAL"
            recommended_action = "TERMINATE_CASCADE_SOLVER_DIVERGED"
        elif component_count >= 3:
            decision = "CRITICAL_SYSTEM_SEPARATION"
            severity = "CRITICAL"
            recommended_action = "TRIGGER_ISLAND_STABILIZATION"
        elif island_detected:
            # Check if all islands or main islands are viable
            viable_count = sum(1 for v in electrical_viability.values() if v == "ELECTRICALLY_VIABLE")
            if viable_count == component_count:
                decision = "ISLANDS_ELECTRICALLY_VIABLE"
            elif viable_count > 0:
                decision = "ISLANDS_PARTIALLY_VIABLE"
            else:
                decision = "ISLANDS_NON_VIABLE"
            severity = "HIGH"
            recommended_action = "EVALUATE_ISLAND_POWER_BALANCES"
        else:
            decision = "NO_ISLANDING"
            severity = "INFO"
            recommended_action = "CONTINUE_NOMINAL_MONITORING"

        # Construct structured IslandAgentResult payload
        island_result_payload = IslandAgentResult(
            agent_name=self.agent_name,
            status="SUCCESS",
            decision=decision,
            islanding_detected=island_detected,
            component_count=component_count,
            islands=components,
            main_island=main_island,
            isolated_islands=isolated_islands,
            island_sizes=island_sizes,
            electrical_viability=electrical_viability,
            solver_status=pf_status,
            evidence={
                "algorithm": "DFS (Depth-First Search)",
                "complexity": "O(V + E)",
                "total_buses": len(graph.nodes),
                "active_buses": sum(1 for n in graph.nodes.values() if n.status == "HEALTHY"),
                "tripped_assets": list(context.tripped_assets),
                "islanding_detected": island_detected,
                "island_detected": island_detected,
                "component_count": component_count,
                "components": components,
                "islands": components,
                "main_island": main_island,
                "main_island_size": len(main_island) if main_island else 0,
                "isolated_islands": isolated_islands,
                "isolated_island_count": len(isolated_islands),
                "electrical_viability": electrical_viability,
                "solver_status": pf_status,
                "provenance": "SOLVER_DERIVED"
            },
            reason=(
                f"DFS partitioned grid into {component_count} topological component(s) [O(V+E)]. "
                f"Islanding: {'TRUE' if island_detected else 'FALSE'}. "
                f"Main island contains {len(main_island) if main_island else 0} bus(es). "
                f"Solver status: {pf_status}. Electrical viability: {decision}."
            )
        )

        trace = AgentDecisionTrace(
            agent_name=self.agent_name,
            step=context.current_depth,
            input_summary=f"DFS analyzed {len(graph.nodes)} buses across {len(context.tripped_assets)} tripped branch(es)",
            decision=decision,
            reason=island_result_payload.reason,
            confidence=1.0,
            severity=severity,
            evidence=island_result_payload.evidence,
            timestamp=datetime.utcnow().isoformat()
        )
        island_result_payload.decision_trace = trace

        # Publish COMPLETED lifecycle event
        self._publish_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            context,
            f"Island agent completed with decision: {decision}",
            {
                "decision": decision,
                "islanding_detected": island_detected,
                "component_count": component_count,
                "severity": severity
            },
            db,
            severity=severity
        )

        # Isolated bus assets nominated as candidate assets
        isolated_buses = [comp[0] for comp in isolated_islands if len(comp) == 1]

        return CascadeAgentResult(
            agent_name=self.agent_name,
            status="SUCCESS",
            decision=decision,
            confidence=1.0,
            severity=severity,
            evidence=island_result_payload.evidence,
            candidate_assets=isolated_buses,
            recommended_action=recommended_action,
            decision_trace=trace,
            next_agent="RecoveryAgent",
            timestamp=datetime.utcnow().isoformat()
        )


island_agent = IslandAgent()

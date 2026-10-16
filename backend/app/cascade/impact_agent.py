"""
Impact Agent for GRIDSEC Cascading Failure Multi-Agent System.
Quantifies topological blast radius via BFS and connectivity separation via DFS.
Strictly distinguishes topological reachability from electrical load flow failure.

Guarantees:
- Topological analysis only (BFS & DFS); does NOT run AC power flow.
- Does NOT trip assets or modify sandbox simulation state.
- Does NOT modify the base database.
- Does NOT perform priority ranking or choose the next cascade event.
- Does NOT declare electrical failure based solely on graph traversal.
- Uses O(1) multi-key hash indexing for asset resolution.
- Deterministic, explainable decision traces for Aegis AI.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.cascade.contracts import (
    CascadeAgent,
    CascadeAgentResult,
    AgentDecisionTrace
)
from app.cascade.context import CascadeContext
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.hashing import AssetIndexTable
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine
from app.power.power_flow_service import power_flow_service
from app.services.event_bus_service import event_bus_service
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory
)


class ImpactAgent(CascadeAgent):
    """
    Impact Agent:
    Deterministic analytical agent that evaluates topological reachability (BFS)
    and graph connectivity / island separation (DFS) given the current disturbance.
    """

    def __init__(self):
        super().__init__(agent_name="ImpactAgent")
        self.asset_index = AssetIndexTable()

    def _index_assets(self, network_data: Optional[Dict[str, Any]] = None):
        """Populates in-memory hash index for O(1) asset resolution across dimensions."""
        if not network_data:
            return
        self.asset_index.clear()
        for b in network_data.get("buses", []):
            self.asset_index.insert_asset({
                "id": b.bus_id,
                "name": b.name,
                "type": "BUS",
                "voltage_kv": str(b.voltage_kv),
                "state": getattr(b, "state", "NATIONAL") or "NATIONAL",
                "district": getattr(b, "district", "GRID") or "GRID",
                "capacity_mw": float(getattr(b, "generation_P", 0.0) or 1000.0),
                "load_mw": float(getattr(b, "load_P", 0.0) or 500.0)
            })
        for l in network_data.get("lines", []):
            self.asset_index.insert_asset({
                "id": l.line_id,
                "name": getattr(l, "name", l.line_id),
                "type": "LINE",
                "from_bus": l.from_bus,
                "to_bus": l.to_bus,
                "thermal_limit_mw": float(getattr(l, "thermal_limit_mw", 4000.0) or 4000.0),
                "length_km": float(getattr(l, "length_km", 100.0) or 100.0)
            })
        for t in network_data.get("transformers", []):
            self.asset_index.insert_asset({
                "id": t.transformer_id,
                "name": getattr(t, "name", t.transformer_id),
                "type": "TRANSFORMER",
                "from_bus": t.from_bus,
                "to_bus": t.to_bus,
                "rated_mva": float(getattr(t, "rated_mva", 1500.0) or 1500.0)
            })
        for g in network_data.get("generators", []):
            self.asset_index.insert_asset({
                "id": g.generator_id,
                "name": getattr(g, "name", g.generator_id),
                "type": "GENERATOR",
                "bus_id": g.bus_id,
                "p_max_mw": float(getattr(g, "Pmax", 500.0) or 500.0)
            })
        for ld in network_data.get("loads", []):
            self.asset_index.insert_asset({
                "id": ld.load_id,
                "name": getattr(ld, "name", ld.load_id),
                "type": "LOAD",
                "bus_id": ld.bus_id,
                "p_mw": float(getattr(ld, "P", 100.0) or 100.0)
            })

    def _build_topology_graph(
        self,
        network_data: Dict[str, Any],
        state_overrides: Optional[Dict[str, Any]] = None
    ) -> GridGraph:
        """Constructs active GridGraph topology honoring sandbox state overrides."""
        graph = GridGraph(is_directed=False)
        overrides = state_overrides or {}

        # 1. Add Buses
        for b in network_data.get("buses", []):
            override = overrides.get(b.bus_id, {})
            status = override.get("status", getattr(b, "status", "ONLINE"))
            is_active = status not in ("OUT_OF_SERVICE", "ISOLATED", "TRIPPED")
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

        # 2. Add Lines
        for l in network_data.get("lines", []):
            override = overrides.get(l.line_id, {})
            status = override.get("status", getattr(l, "status", "IN_SERVICE"))
            is_active = status not in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "BLOCKED")
            edge = GraphEdge(
                line_id=l.line_id,
                source=l.from_bus,
                target=l.to_bus,
                line_type=getattr(l, "circuit_type", "765kV_AC") or "765kV_AC",
                distance_km=float(getattr(l, "length_km", 100.0) or 100.0),
                capacity_mw=float(getattr(l, "thermal_limit_mw", 4000.0) or 4000.0),
                current_flow_mw=float(getattr(l, "current_flow_mw", 0.0) or getattr(l, "p_from_mw", 0.0) or 0.0),
                status="HEALTHY" if is_active else "DISCONNECTED",
                risk_factor=10.0
            )
            graph.add_edge(edge)

        # 3. Add Transformers
        for t in network_data.get("transformers", []):
            override = overrides.get(t.transformer_id, {})
            status = override.get("status", getattr(t, "status", "IN_SERVICE"))
            is_active = status not in ("OUT_OF_SERVICE", "TRIPPED", "DISCONNECTED")
            t_edge = GraphEdge(
                line_id=t.transformer_id,
                source=t.from_bus,
                target=t.to_bus,
                line_type="TRANSFORMER",
                distance_km=1.0,
                capacity_mw=float(getattr(t, "rated_mva", 1500.0) or 1500.0),
                current_flow_mw=0.0,
                status="HEALTHY" if is_active else "DISCONNECTED",
                risk_factor=5.0
            )
            graph.add_edge(t_edge)

        return graph

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
            data_source="CASCADE_IMPACT_AGENT",
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
        Executes deterministic topological impact analysis:
        1. Multi-key Hash indexing for O(1) asset resolution.
        2. BFS traversal from disturbance points for reachability & hop distance.
        3. DFS connected component discovery for synchronous graph partition checks.
        """
        self._publish_event(
            GridEventType.CASCADE_AGENT_STARTED,
            context,
            f"ImpactAgent starting topological blast radius & connectivity analysis at step {context.current_depth}",
            {"step": context.current_depth},
            db
        )

        net_id = context.network_id or "TEST_NETWORK"
        network_data = power_flow_service.get_network_topology(net_id, db)
        self._index_assets(network_data)
        graph = self._build_topology_graph(network_data, context.current_state_overrides)

        # ---------------------------------------------------------------------
        # 1. DFS CONNECTIVITY & ISLAND DISCOVERY
        # ---------------------------------------------------------------------
        raw_components = DFSEngine.find_connected_components(graph)
        
        # Sort nodes in each component alphabetically, and sort components by size descending
        connected_components: List[List[str]] = []
        for comp in raw_components:
            sorted_comp = sorted(comp)
            connected_components.append(sorted_comp)
        connected_components.sort(key=lambda c: (-len(c), c[0] if c else ""))

        component_count = len(connected_components)
        largest_component = connected_components[0] if connected_components else []
        isolated_nodes = sorted([c[0] for c in connected_components if len(c) == 1])
        topological_separation = component_count > 1
        connectivity_status = "FULLY_CONNECTED" if component_count == 1 else "TOPOLOGICALLY_SEPARATED"

        # ---------------------------------------------------------------------
        # 2. IDENTIFY TARGET DISTURBANCE ASSETS FOR BFS
        # ---------------------------------------------------------------------
        target_asset_ids: List[str] = []

        # Check DetectionAgent results from this step if available
        det_res = context.previous_agent_results.get("DetectionAgent")
        if det_res and det_res.evidence and "violations" in det_res.evidence:
            for v in det_res.evidence["violations"]:
                aid = v.get("asset_id")
                if aid and aid not in ("GRID", "SYSTEM") and aid not in target_asset_ids:
                    target_asset_ids.append(aid)

        # If no DetectionAgent evidence, check context latest_violations
        if not target_asset_ids and context.latest_violations:
            for lv in context.latest_violations:
                aid = getattr(lv, "element_id", None) or getattr(lv, "asset_id", None)
                if aid and aid not in ("GRID", "SYSTEM") and aid not in target_asset_ids:
                    target_asset_ids.append(aid)

        # Also check context affected_assets and tripped_assets
        for aff in context.affected_assets:
            if aff and aff not in ("NONE", "GRID", "SYSTEM") and aff not in target_asset_ids:
                target_asset_ids.append(aff)

        if not target_asset_ids and context.tripped_assets:
            for tr in context.tripped_assets:
                if tr and tr not in ("NONE", "GRID", "SYSTEM") and tr not in target_asset_ids:
                    target_asset_ids.append(tr)

        # ---------------------------------------------------------------------
        # 3. HASH RESOLUTION & SOURCE NODE EXTRACTION
        # ---------------------------------------------------------------------
        resolved_assets: List[Dict[str, Any]] = []
        unresolved_assets: List[Dict[str, Any]] = []
        source_buses: Set[str] = set()

        for aid in target_asset_ids:
            asset_info = self.asset_index.get_by_id(aid)
            if asset_info:
                resolved_assets.append(asset_info)
                atype = asset_info.get("type", "").upper()
                if atype in ("LINE", "TRANSFORMER"):
                    from_b = asset_info.get("from_bus")
                    to_b = asset_info.get("to_bus")
                    if from_b:
                        source_buses.add(from_b)
                    if to_b:
                        source_buses.add(to_b)
                elif atype in ("GENERATOR", "LOAD"):
                    bus_id = asset_info.get("bus_id")
                    if bus_id:
                        source_buses.add(bus_id)
                elif atype == "BUS":
                    source_buses.add(aid)
                else:
                    if aid in graph.nodes:
                        source_buses.add(aid)
            else:
                # Unresolved asset record
                unresolved_assets.append({
                    "asset_id": aid,
                    "status": "ASSET_NOT_FOUND",
                    "reason": f"Asset '{aid}' not registered in network asset index table."
                })
                # Check if it directly exists as a node in the graph
                if aid in graph.nodes:
                    source_buses.add(aid)

        # Sort resolved assets deterministically
        resolved_assets.sort(key=lambda a: a.get("id", ""))
        unresolved_assets.sort(key=lambda a: a.get("asset_id", ""))

        # ---------------------------------------------------------------------
        # 4. BFS REACHABILITY & BLAST RADIUS TRAVERSAL
        # ---------------------------------------------------------------------
        reached_node_map: Dict[str, Dict[str, Any]] = {}
        total_capacity_at_risk_mw = 0.0
        max_reached_hop = 0

        for s_bus in sorted(source_buses):
            if s_bus not in graph.nodes:
                continue
            bfs_out = BFSImpactEngine.calculate_impact(graph, s_bus, max_depth=5)
            for item in bfs_out.get("affected_assets", []):
                nid = item["asset_id"]
                hop = item["hop_distance"]
                if nid not in reached_node_map or hop < reached_node_map[nid]["hop_distance"]:
                    reached_node_map[nid] = item
                if hop > max_reached_hop:
                    max_reached_hop = hop

        # Sort reachable nodes deterministically by (hop_distance, asset_id)
        reachable_nodes = sorted(
            list(reached_node_map.values()),
            key=lambda n: (n.get("hop_distance", 99), n.get("asset_id", ""))
        )
        reachable_assets = [n["asset_id"] for n in reachable_nodes]
        hop_distances = {n["asset_id"]: n.get("hop_distance", 0) for n in reachable_nodes}
        total_capacity_at_risk_mw = round(sum(n.get("capacity_mw", 0.0) for n in reachable_nodes), 2)

        # Compute composite impact score (0 - 100)
        node_factor = min(40.0, len(reachable_nodes) * 5.0)
        capacity_factor = min(35.0, (total_capacity_at_risk_mw / 25000.0) * 35.0)
        separation_factor = 25.0 if topological_separation else 0.0
        impact_score = round(min(100.0, node_factor + capacity_factor + separation_factor), 1)

        # ---------------------------------------------------------------------
        # 5. COMPILE STRUCTURED EVIDENCE & DECISION TRACE
        # ---------------------------------------------------------------------
        has_targets = len(target_asset_ids) > 0
        has_reachable = len(reachable_nodes) > 0

        if topological_separation and len(isolated_nodes) > 0:
            severity = "CRITICAL"
            decision = f"TOPOLOGICAL_SEPARATION_ISOLATED_{len(isolated_nodes)}_COMPONENTS_{component_count}"
        elif topological_separation:
            severity = "HIGH"
            decision = f"TOPOLOGICAL_SEPARATION_COMPONENTS_{component_count}_REACHABLE_{len(reachable_nodes)}"
        elif has_reachable:
            severity = "HIGH" if impact_score > 50.0 else "MEDIUM"
            decision = f"IMPACT_EVALUATED_COMPONENTS_{component_count}_REACHABLE_{len(reachable_nodes)}"
        else:
            severity = "INFO"
            decision = "NOMINAL_NO_TOPOLOGICAL_IMPACT"

        evidence = {
            "target_asset_count": len(target_asset_ids),
            "target_assets": target_asset_ids,
            "resolved_asset_count": len(resolved_assets),
            "resolved_assets": resolved_assets,
            "unresolved_asset_count": len(unresolved_assets),
            "unresolved_assets": unresolved_assets,
            "source_buses": sorted(list(source_buses)),
            "reachable_nodes_count": len(reachable_nodes),
            "reachable_nodes": reachable_nodes,
            "reachable_assets": reachable_assets,
            "hop_distances": hop_distances,
            "max_propagation_depth": max_reached_hop,
            "impact_score": impact_score,
            "total_capacity_at_risk_mw": total_capacity_at_risk_mw,
            "connected_components": connected_components,
            "component_count": component_count,
            "largest_component": largest_component,
            "isolated_nodes": isolated_nodes,
            "topological_separation": topological_separation,
            "connectivity_status": connectivity_status,
            "provenance": "TOPOLOGY_DERIVED"
        }

        trace = AgentDecisionTrace(
            agent_name=self.agent_name,
            step=context.current_depth,
            input_summary=(
                f"Targets: {len(target_asset_ids)} asset(s), "
                f"Resolved: {len(resolved_assets)}, "
                f"Components: {component_count}"
            ),
            decision=decision,
            reason=(
                f"ImpactAgent resolved {len(resolved_assets)}/{len(target_asset_ids)} target asset(s) via O(1) hash index. "
                f"DFS revealed {component_count} connected component(s) ({connectivity_status}). "
                f"BFS traversal mapped {len(reachable_nodes)} reachable node(s) across active corridors with impact score {impact_score:.1f}. "
                f"CRITICAL SEMANTIC GUARANTEE: Topological reachability indicates potential disturbance exposure only and does NOT imply electrical failure. "
                f"Topological separation identifies graph partitioning without asserting electrical viability (which requires generation/load balance)."
            ),
            confidence=1.0,
            severity=severity,
            evidence=evidence
        )

        self._publish_event(
            GridEventType.CASCADE_AGENT_COMPLETED,
            context,
            f"ImpactAgent completed: {decision}",
            {
                "decision": decision,
                "reachable_count": len(reachable_nodes),
                "component_count": component_count,
                "impact_score": impact_score
            },
            db,
            severity=severity
        )

        candidate_assets = reachable_assets if reachable_assets else target_asset_ids

        return CascadeAgentResult(
            agent_name=self.agent_name,
            status="SUCCESS",
            decision=decision,
            confidence=1.0,
            severity=severity,
            evidence=evidence,
            candidate_assets=candidate_assets,
            recommended_action="PRIORITIZE_VIOLATIONS",
            decision_trace=trace,
            next_agent="PriorityAgent"
        )


impact_agent = ImpactAgent()

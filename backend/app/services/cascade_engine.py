"""
Deterministic Multi-Step Physical Cascade Simulation Engine for GRIDSEC.
Orchestrates sequential AC power-flow re-solving, deterministic protection candidate selection,
Max-Heap overload prioritization, DFS electrical islanding detection, and causal event chaining.
Ensures base database records remain 100% immutable while simulating sandbox multi-hop failure propagation.
"""

import uuid
import time
import copy
import asyncio
from datetime import datetime
from typing import Dict, List, Set, Tuple, Any, Optional
from sqlalchemy.orm import Session

from app.models.event import Cascade, CascadeEvent, GridEvent
from app.models.simulation_state import SimulationScenario
from app.models.asset import Asset, TransformerBay
from app.models.transmission import TransmissionLine
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory,
    CyberStatus,
    ElectricalStatus
)
from app.schemas.cascade import (
    CascadeSimulationRequest,
    CascadeSimulationResult,
    CascadeStepSnapshot,
    CascadeCandidateInfo
)
from app.power.models import (
    PowerFlowRequest,
    PowerFlowResult,
    Violation,
    ViolationType
)
from app.power.power_flow_service import power_flow_service
from app.power.network_builder import ElectricalNetworkBuilder
from app.power.solver import PowerFlowSolver
from app.services.event_bus_service import event_bus_service
from app.services.simulation_state_service import simulation_state_service
from app.services.telemetry_service import telemetry_service
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.bfs import BFSImpactEngine
from app.dsa.dfs import DFSEngine
from app.dsa.dijkstra import DijkstraReroutingEngine
from app.dsa.priority_queue import IncidentPriorityQueue, PrioritizedIncidentItem
from app.services.grid_service import grid_service
from app.websocket.manager import ws_manager


class CascadeEngine:
    """
    Core Deterministic Multi-Step Physical Cascade Engine.
    Executes iterative:
    Disturbance -> AC Power Flow -> Violations -> Max-Heap Prioritization -> Protection Action -> Repeat.
    """

    def _build_topology_graph(
        self,
        network_data: Dict[str, Any],
        state_overrides: Optional[Dict[str, Any]] = None
    ) -> GridGraph:
        """
        Constructs an active GridGraph instance from network data and state overrides
        for BFS, DFS, and Dijkstra calculations.
        """
        graph = GridGraph()
        overrides = state_overrides or {}

        # 1. Add Nodes (Buses)
        for b in network_data.get("buses", []):
            override = overrides.get(b.bus_id, {})
            status = override.get("status", b.status)
            is_active = status not in ("OUT_OF_SERVICE", "ISOLATED", "TRIPPED")
            
            node = GraphNode(
                node_id=b.bus_id,
                name=b.name,
                node_type="SUBSTATION",
                state=b.state if hasattr(b, "state") else "NATIONAL",
                district=b.district if hasattr(b, "district") else "GRID",
                voltage_kv=str(b.voltage_kv),
                capacity_mw=float(getattr(b, "generation_P", 0.0) or 1000.0),
                current_mw=float(getattr(b, "load_P", 0.0) or 500.0),
                status="HEALTHY" if is_active else "ISOLATED",
                risk_score=10.0
            )
            graph.add_node(node)

        # 2. Add Edges (Lines)
        for l in network_data.get("lines", []):
            override = overrides.get(l.line_id, {})
            status = override.get("status", l.status)
            is_active = status not in ("OUT_OF_SERVICE", "DISCONNECTED", "TRIPPED", "BLOCKED")
            edge_status = "HEALTHY" if is_active else "DISCONNECTED"

            edge = GraphEdge(
                line_id=l.line_id,
                source=l.from_bus,
                target=l.to_bus,
                line_type=getattr(l, "circuit_type", "765kV_AC"),
                distance_km=float(l.length_km),
                capacity_mw=float(getattr(l, "thermal_limit_mw", 4000.0) or 4000.0),
                current_flow_mw=float(getattr(l, "p_from_mw", 0.0) or 0.0),
                status=edge_status,
                risk_factor=10.0
            )
            graph.add_edge(edge)

        # 3. Add Edges (Transformers)
        for t in network_data.get("transformers", []):
            override = overrides.get(t.transformer_id, {})
            status = override.get("status", t.status)
            is_active = status not in ("OUT_OF_SERVICE", "TRIPPED", "DISCONNECTED")
            edge_status = "HEALTHY" if is_active else "DISCONNECTED"

            t_edge = GraphEdge(
                line_id=t.transformer_id,
                source=t.from_bus,
                target=t.to_bus,
                line_type="TRANSFORMER",
                distance_km=1.0,
                capacity_mw=float(t.rated_mva),
                current_flow_mw=0.0,
                status=edge_status,
                risk_factor=5.0
            )
            graph.add_edge(t_edge)

        return graph

    def run_cascade_simulation(
        self,
        request: CascadeSimulationRequest,
        db: Session
    ) -> CascadeSimulationResult:
        """
        Executes an end-to-end, multi-step deterministic physical cascade simulation.
        
        Step 0: Solve Baseline AC Power Flow.
        Step 1: Apply Initial Disturbance -> Re-solve -> Detect Initial Violations.
        Step K: Loop -> Rank Overloaded Elements -> Deterministic Protection Action -> Re-solve -> Island Check -> Repeat.
        Termination: STABLE, MAX_DEPTH_REACHED, SOLVER_DIVERGED, or SYSTEM_SEPARATION.
        """
        start_time = time.perf_counter()

        # 1. Initialize Sandbox Scenario
        sim_id = request.simulation_id or f"SIM-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
        network_id = request.network_id or "TEST_NETWORK"
        
        # Ensure scenario is registered in sandbox
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == sim_id).first()
        if not scenario:
            scenario = SimulationScenario(
                simulation_id=sim_id,
                name=f"Cascading Failure Drill ({request.initial_asset_id})",
                scenario_type="CASCADE_SIMULATION",
                status="RUNNING",
                baseline_reference=network_id,
                state_overrides={},
                event_count=0,
                summary=f"Initialized multi-step cascade drill on {request.initial_asset_id} against {network_id}."
            )
            db.add(scenario)
            db.commit()
            db.refresh(scenario)

        # 2. Fetch Network Model
        network_data = power_flow_service.get_network_topology(network_id, db)

        # ---------------------------------------------------------------------
        # STEP 0: BASELINE SOLVE
        # ---------------------------------------------------------------------
        base_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=f"{sim_id}_STEP_0_BASELINE",
            state_overrides={}
        )
        if base_res.status != "SUCCESS":
            raise RuntimeError(f"Baseline power flow failed to converge for network '{network_id}': {base_res.message}")

        base_gen = base_res.power_balance.total_generation_mw if base_res.power_balance else 0.0
        base_load = base_res.power_balance.total_load_mw if base_res.power_balance else 0.0
        base_losses = base_res.power_balance.total_losses_mw if base_res.power_balance else 0.0
        base_max_line = max([l.loading_percent for l in base_res.lines] or [0.0])
        base_max_xfmr = max([t.loading_percent for t in base_res.transformers] or [0.0])

        step_snapshots: List[CascadeStepSnapshot] = []
        tripped_assets: List[str] = []
        current_overrides: Dict[str, Any] = {}

        # Record Step 0 Snapshot
        step_snapshots.append(CascadeStepSnapshot(
            step_number=0,
            depth=0,
            action_type="BASELINE",
            tripped_asset="NONE",
            tripped_asset_type="SYSTEM",
            trigger_reason="Baseline nominal state prior to disturbance",
            power_flow_status=base_res.status,
            total_generation_mw=base_gen,
            total_load_mw=base_load,
            total_losses_mw=base_losses,
            max_line_loading_percent=base_max_line,
            max_transformer_loading_percent=base_max_xfmr,
            violations_count=len(base_res.violations),
            violations=[v.model_dump() for v in base_res.violations],
            state_overrides={},
            islands_detected=[[b.bus_id for b in network_data.get("buses", [])]],
            islands_count=1,
            timestamp=datetime.utcnow().isoformat()
        ))

        # ---------------------------------------------------------------------
        # STEP 1: APPLY ROOT DISTURBANCE
        # ---------------------------------------------------------------------
        root_asset_id = request.initial_asset_id
        current_overrides[root_asset_id] = {
            "status": "OUT_OF_SERVICE",
            "electrical_status": "OUT_OF_SERVICE",
            "current_flow_mw": 0.0
        }
        tripped_assets.append(root_asset_id)

        # Determine Root Asset Type
        root_type = "LINE"
        if "XFMR" in root_asset_id or "TRAFO" in root_asset_id:
            root_type = "TRANSFORMER"
        elif "GEN" in root_asset_id:
            root_type = "GENERATOR"
        elif "BUS" in root_asset_id:
            root_type = "BUS"

        # Publish Root Grid Event
        root_evt_create = UnifiedGridEventCreate(
            event_type=GridEventType.LINE_TRIP if root_type == "LINE" else (
                GridEventType.TRANSFORMER_TRIP if root_type == "TRANSFORMER" else GridEventType.PHYSICAL_STATE_UPDATE
            ),
            event_category=EventCategory.PHYSICAL_EVENT,
            source_asset=root_asset_id,
            affected_assets=[root_asset_id],
            severity="CRITICAL",
            cause=f"Initial root disturbance trigger ({request.initial_action}) on {root_asset_id}",
            simulation_id=sim_id,
            data_source="CASCADE_SIMULATOR",
            payload={"action": request.initial_action, "depth": 1, "sequence_number": 1}
        )
        root_grid_evt = event_bus_service.publish_event(root_evt_create, db)

        # Create Cascade Master Record
        cascade_id = f"CAS-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
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

        # Record Sequence Step 1
        step1_record = CascadeEvent(
            cascade_id=cascade_id,
            event_id=root_grid_evt.event_id,
            parent_event_id=None,
            depth=1,
            sequence_number=1
        )
        db.add(step1_record)
        db.commit()

        # Re-solve Power Flow after Root Trip
        step1_res = PowerFlowSolver.solve(
            network_data=network_data,
            scenario_id=f"{sim_id}_STEP_1_{root_asset_id}",
            state_overrides=current_overrides
        )

        # Build Graph for Topology Analysis
        graph_step1 = self._build_topology_graph(network_data, current_overrides)
        islands_step1 = DFSEngine.find_connected_components(graph_step1)
        
        # BFS reachability from root asset
        bfs_info = None
        if request.enable_bfs_blast_radius:
            bfs_res = BFSImpactEngine.calculate_impact(graph_step1, root_asset_id, max_depth=3)
            bfs_info = {
                "impact_score": bfs_res.get("impact_score", 0.0),
                "reachable_nodes_count": len(bfs_res.get("affected_assets", [])),
                "total_capacity_at_risk_mw": bfs_res.get("total_capacity_at_risk_mw", 0.0)
            }

        # Dijkstra candidate bypass route if line tripped
        dijkstra_info = None
        if request.enable_dijkstra_check and root_type == "LINE":
            # Extract line endpoints
            matching_l = next((l for l in network_data.get("lines", []) if l.line_id == root_asset_id), None)
            if matching_l:
                d_res = DijkstraReroutingEngine.find_alternate_route(
                    graph_step1,
                    source=matching_l.from_bus,
                    destination=matching_l.to_bus,
                    blocked_lines=tripped_assets
                )
                if d_res.get("available"):
                    val_res = power_flow_service.validate_candidate_route_power_flow(
                        candidate_route=d_res.get("route", []),
                        additional_mw=100.0,
                        network_id=network_id,
                        db=db
                    )
                    dijkstra_info = {
                        "route": d_res.get("route"),
                        "distance_km": d_res.get("distance_km"),
                        "hops": d_res.get("hops"),
                        "electrical_feasibility": val_res.get("feasible", False),
                        "status": val_res.get("status")
                    }

        s1_gen = step1_res.power_balance.total_generation_mw if step1_res.power_balance else 0.0
        s1_load = step1_res.power_balance.total_load_mw if step1_res.power_balance else 0.0
        s1_losses = step1_res.power_balance.total_losses_mw if step1_res.power_balance else 0.0
        s1_max_line = max([l.loading_percent for l in step1_res.lines] or [0.0])
        s1_max_xfmr = max([t.loading_percent for t in step1_res.transformers] or [0.0])

        step_snapshots.append(CascadeStepSnapshot(
            step_number=1,
            depth=1,
            action_type="INITIAL_DISTURBANCE",
            tripped_asset=root_asset_id,
            tripped_asset_type=root_type,
            trigger_reason=f"Primary disturbance trip ({request.initial_action})",
            event_id=root_grid_evt.event_id,
            parent_event_id=None,
            power_flow_status=step1_res.status,
            total_generation_mw=s1_gen,
            total_load_mw=s1_load,
            total_losses_mw=s1_losses,
            max_line_loading_percent=s1_max_line,
            max_transformer_loading_percent=s1_max_xfmr,
            violations_count=len(step1_res.violations),
            violations=[v.model_dump() for v in step1_res.violations],
            state_overrides=copy.deepcopy(current_overrides),
            islands_detected=islands_step1,
            islands_count=len(islands_step1),
            dijkstra_reroute=dijkstra_info,
            bfs_reachability=bfs_info,
            timestamp=datetime.utcnow().isoformat()
        ))

        # ---------------------------------------------------------------------
        # STEP K LOOP: ITERATIVE CASCADE PROPAGATION
        # ---------------------------------------------------------------------
        current_depth = 1
        sequence_num = 1
        prev_event_id = root_grid_evt.event_id
        latest_res = step1_res
        termination_reason = "EQUILIBRIUM_REACHED"
        final_status = "STABLE"

        line_threshold = float(request.protection_threshold_line_loading_pct)
        xfmr_threshold = float(request.protection_threshold_transformer_loading_pct)

        while current_depth < request.max_depth:
            # Check 1: Solver Divergence
            if latest_res.status == "DIVERGED":
                termination_reason = "SOLVER_DIVERGED"
                final_status = "SOLVER_DIVERGED"
                
                # Publish Divergence Event
                div_evt = UnifiedGridEventCreate(
                    event_type=GridEventType.SOLVER_DIVERGENCE,
                    event_category=EventCategory.PHYSICAL_EVENT,
                    source_asset=tripped_assets[-1] if tripped_assets else "GRID",
                    affected_assets=tripped_assets,
                    severity="CRITICAL",
                    cause="Non-linear AC load flow diverged. Mathematical voltage collapse or severe impedance mismatch.",
                    parent_event_id=prev_event_id,
                    simulation_id=sim_id,
                    data_source="CASCADE_SOLVER"
                )
                event_bus_service.publish_event(div_evt, db)
                break

            # Check 2: Islanding Analysis
            graph_curr = self._build_topology_graph(network_data, current_overrides)
            curr_islands = DFSEngine.find_connected_components(graph_curr)
            if len(curr_islands) > 1:
                # Islanding Detected
                isl_evt = UnifiedGridEventCreate(
                    event_type=GridEventType.ISLAND_DETECTED,
                    event_category=EventCategory.PHYSICAL_EVENT,
                    source_asset=tripped_assets[-1] if tripped_assets else "GRID",
                    affected_assets=[b for comp in curr_islands for b in comp],
                    severity="HIGH",
                    cause=f"Synchronous grid separation into {len(curr_islands)} isolated electrical islands.",
                    parent_event_id=prev_event_id,
                    simulation_id=sim_id,
                    data_source="DFS_ISLANDING_ENGINE",
                    payload={"islands_count": len(curr_islands), "islands": curr_islands}
                )
                event_bus_service.publish_event(isl_evt, db)

            # Check 3: Collect Overloaded Candidates for Protection Trip
            candidates: List[CascadeCandidateInfo] = []

            # Check Transmission Lines
            for l in latest_res.lines:
                if l.line_id not in tripped_assets and l.loading_percent > line_threshold:
                    overload_excess = l.loading_percent - line_threshold
                    p_score = (l.loading_percent * 1.5) + (overload_excess * 2.5) + (abs(l.p_from_mw) * 0.01)
                    candidates.append(CascadeCandidateInfo(
                        element_id=l.line_id,
                        element_type="LINE",
                        violation_type="LINE_OVERLOAD",
                        measured_value=l.loading_percent,
                        threshold=line_threshold,
                        unit="%",
                        overload_percent=overload_excess,
                        capacity_mw=4000.0,
                        calculated_priority_score=round(p_score, 2),
                        source_bus=l.from_bus,
                        destination_bus=l.to_bus
                    ))

            # Check Transformers
            for t in latest_res.transformers:
                if t.transformer_id not in tripped_assets and t.loading_percent > xfmr_threshold:
                    overload_excess = t.loading_percent - xfmr_threshold
                    p_score = (t.loading_percent * 1.5) + (overload_excess * 2.5) + (abs(t.p_hv_mw) * 0.01)
                    candidates.append(CascadeCandidateInfo(
                        element_id=t.transformer_id,
                        element_type="TRANSFORMER",
                        violation_type="TRANSFORMER_OVERLOAD",
                        measured_value=t.loading_percent,
                        threshold=xfmr_threshold,
                        unit="%",
                        overload_percent=overload_excess,
                        capacity_mw=1500.0,
                        calculated_priority_score=round(p_score, 2),
                        source_bus=t.from_bus,
                        destination_bus=t.to_bus
                    ))

            # If no overloaded candidates exist, cascade has reached stable equilibrium
            if not candidates:
                termination_reason = "EQUILIBRIUM_REACHED"
                final_status = "STABLE"
                break

            # 4. Deterministic Candidate Selection via Max-Heap Prioritization
            pq = IncidentPriorityQueue()
            for cand in candidates:
                pq.push({
                    "incident_id": cand.element_id,
                    "element_id": cand.element_id,
                    "element_type": cand.element_type,
                    "severity": "CRITICAL" if cand.overload_percent > 20.0 else "HIGH",
                    "risk_score": min(100.0, cand.calculated_priority_score),
                    "asset_criticality": 8.0 if cand.element_type == "TRANSFORMER" else 6.0,
                    "affected_assets_count": 2,
                    "candidate_obj": cand
                })

            top_item = pq.pop()
            if not top_item:
                termination_reason = "NO_ELIGIBLE_CANDIDATE"
                final_status = "TERMINATED"
                break

            selected_cand: CascadeCandidateInfo = top_item["candidate_obj"]
            trip_target = selected_cand.element_id
            trip_type = selected_cand.element_type

            # Advance Depth and Sequence
            current_depth += 1
            sequence_num += 1

            # Apply Protection Action in Sandbox Overrides
            current_overrides[trip_target] = {
                "status": "OUT_OF_SERVICE",
                "electrical_status": "OUT_OF_SERVICE",
                "current_flow_mw": 0.0
            }
            tripped_assets.append(trip_target)

            # Publish Protection Trip Event
            prot_evt_create = UnifiedGridEventCreate(
                event_type=GridEventType.LINE_TRIP if trip_type == "LINE" else GridEventType.TRANSFORMER_TRIP,
                event_category=EventCategory.PHYSICAL_EVENT,
                source_asset=trip_target,
                affected_assets=[trip_target],
                severity="CRITICAL",
                cause=f"Protective relay trip: {trip_type} {trip_target} thermal loading reached {selected_cand.measured_value:.1f}% (threshold {selected_cand.threshold:.1f}%)",
                parent_event_id=prev_event_id,
                simulation_id=sim_id,
                data_source="PROTECTION_RELAY_SIMULATOR",
                payload={
                    "depth": current_depth,
                    "sequence_number": sequence_num,
                    "loading_percent": selected_cand.measured_value,
                    "threshold": selected_cand.threshold,
                    "overload_excess": selected_cand.overload_percent,
                    "priority_score": selected_cand.calculated_priority_score
                }
            )
            prot_grid_evt = event_bus_service.publish_event(prot_evt_create, db)

            # Record Sequence Step in CascadeEvent table
            step_record = CascadeEvent(
                cascade_id=cascade_id,
                event_id=prot_grid_evt.event_id,
                parent_event_id=prev_event_id,
                depth=current_depth,
                sequence_number=sequence_num
            )
            db.add(step_record)
            cascade_record.current_depth = current_depth
            db.commit()

            # Re-solve Power Flow for Step K
            latest_res = PowerFlowSolver.solve(
                network_data=network_data,
                scenario_id=f"{sim_id}_STEP_{current_depth}_{trip_target}",
                state_overrides=current_overrides
            )

            # Analyze Updated Graph
            graph_step_k = self._build_topology_graph(network_data, current_overrides)
            islands_step_k = DFSEngine.find_connected_components(graph_step_k)

            # Dijkstra Reroute for Line Trips
            dijkstra_k = None
            if request.enable_dijkstra_check and trip_type == "LINE" and selected_cand.source_bus and selected_cand.destination_bus:
                d_res_k = DijkstraReroutingEngine.find_alternate_route(
                    graph_step_k,
                    source=selected_cand.source_bus,
                    destination=selected_cand.destination_bus,
                    blocked_lines=tripped_assets
                )
                if d_res_k.get("available"):
                    val_k = power_flow_service.validate_candidate_route_power_flow(
                        candidate_route=d_res_k.get("route", []),
                        additional_mw=50.0,
                        network_id=network_id,
                        db=db
                    )
                    dijkstra_k = {
                        "route": d_res_k.get("route"),
                        "distance_km": d_res_k.get("distance_km"),
                        "hops": d_res_k.get("hops"),
                        "electrical_feasibility": val_k.get("feasible", False),
                        "status": val_k.get("status")
                    }

            sk_gen = latest_res.power_balance.total_generation_mw if latest_res.power_balance else 0.0
            sk_load = latest_res.power_balance.total_load_mw if latest_res.power_balance else 0.0
            sk_losses = latest_res.power_balance.total_losses_mw if latest_res.power_balance else 0.0
            sk_max_line = max([l.loading_percent for l in latest_res.lines] or [0.0])
            sk_max_xfmr = max([t.loading_percent for t in latest_res.transformers] or [0.0])

            # Record Snapshot for Step K
            step_snapshots.append(CascadeStepSnapshot(
                step_number=current_depth,
                depth=current_depth,
                action_type="PROTECTION_TRIP",
                tripped_asset=trip_target,
                tripped_asset_type=trip_type,
                trigger_reason=f"Thermal overload trip ({selected_cand.measured_value:.1f}% > {selected_cand.threshold:.1f}%)",
                event_id=prot_grid_evt.event_id,
                parent_event_id=prev_event_id,
                power_flow_status=latest_res.status,
                total_generation_mw=sk_gen,
                total_load_mw=sk_load,
                total_losses_mw=sk_losses,
                max_line_loading_percent=sk_max_line,
                max_transformer_loading_percent=sk_max_xfmr,
                violations_count=len(latest_res.violations),
                violations=[v.model_dump() for v in latest_res.violations],
                state_overrides=copy.deepcopy(current_overrides),
                islands_detected=islands_step_k,
                islands_count=len(islands_step_k),
                dijkstra_reroute=dijkstra_k,
                timestamp=datetime.utcnow().isoformat()
            ))

            prev_event_id = prot_grid_evt.event_id

            if current_depth >= request.max_depth:
                termination_reason = "MAX_DEPTH_EXCEEDED"
                final_status = "MAX_DEPTH_REACHED"
                break

        # Check for system separation
        if len(step_snapshots[-1].islands_detected) > 2 and final_status == "STABLE":
            final_status = "SYSTEM_SEPARATION"
            termination_reason = "SYSTEM_SEPARATION"

        # ---------------------------------------------------------------------
        # FINAL STEP: CASCADE MASTER UPDATE & RESULT COMPILATION
        # ---------------------------------------------------------------------
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        final_gen = step_snapshots[-1].total_generation_mw
        final_losses = step_snapshots[-1].total_losses_mw
        delta_losses = round(final_losses - base_losses, 3)

        summary_narrative = (
            f"Cascade simulation completed in {len(step_snapshots)-1} propagation step(s) with status {final_status} "
            f"({termination_reason}). Tripped {len(tripped_assets)} asset(s): [{', '.join(tripped_assets)}]. "
            f"Final transmission losses: {final_losses:.3f} MW (delta: {delta_losses:+.3f} MW vs baseline {base_losses:.3f} MW). "
            f"Active synchronous islands: {len(step_snapshots[-1].islands_detected)}."
        )

        cascade_record.completed_at = datetime.utcnow()
        cascade_record.current_depth = current_depth
        cascade_record.status = final_status
        cascade_record.summary = summary_narrative
        cascade_record.impacted_capacity_mw = len(tripped_assets) * 4000.0
        db.commit()

        # Update scenario overrides in DB
        scenario.state_overrides = current_overrides
        scenario.event_count = (scenario.event_count or 0) + len(step_snapshots)
        scenario.status = "COMPLETED"
        scenario.summary = summary_narrative
        db.commit()

        # Publish CASCADE_TERMINATED Event
        term_evt = UnifiedGridEventCreate(
            event_type=GridEventType.CASCADE_TERMINATED,
            event_category=EventCategory.PHYSICAL_EVENT,
            source_asset=root_asset_id,
            affected_assets=tripped_assets,
            severity="INFO",
            cause=summary_narrative,
            parent_event_id=prev_event_id,
            simulation_id=sim_id,
            data_source="CASCADE_ENGINE",
            payload={
                "cascade_id": cascade_id,
                "status": final_status,
                "termination_reason": termination_reason,
                "total_steps": len(step_snapshots),
                "tripped_assets": tripped_assets
            }
        )
        event_bus_service.publish_event(term_evt, db)

        return CascadeSimulationResult(
            cascade_id=cascade_id,
            simulation_id=sim_id,
            network_id=network_id,
            root_asset_id=root_asset_id,
            root_event_id=root_grid_evt.event_id,
            status=final_status,
            termination_reason=termination_reason,
            total_steps=len(step_snapshots),
            max_depth_reached=current_depth,
            tripped_assets=tripped_assets,
            initial_capacity_at_risk_mw=cascade_record.impacted_capacity_mw,
            baseline_generation_mw=base_gen,
            baseline_losses_mw=base_losses,
            baseline_max_loading_percent=base_max_line,
            final_generation_mw=final_gen,
            final_losses_mw=final_losses,
            final_max_loading_percent=step_snapshots[-1].max_line_loading_percent,
            delta_losses_mw=delta_losses,
            step_snapshots=step_snapshots,
            islands_detected=step_snapshots[-1].islands_detected,
            summary=summary_narrative,
            execution_time_ms=elapsed_ms
        )


cascade_engine = CascadeEngine()

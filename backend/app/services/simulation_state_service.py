"""
Sandbox Simulation Scenario State Service for GRIDSEC.
Maintains isolated "what-if" cyber-physical simulation states,
ensuring the base Indian power grid dataset remains completely immutable.
Provides Cyber-to-Physics bridge, N-1 contingency analysis, electrical delta calculations,
physical event generation, and stateful branching.
"""

import uuid
import copy
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.simulation_state import SimulationScenario
from app.models.event import GridEvent
from app.schemas.sandbox_simulation import SimulationCreateRequest, SimulationStateResponse
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    GridEventType,
    EventCategory,
    CyberStatus,
    ElectricalStatus
)
from app.services.event_bus_service import event_bus_service
from app.power.models import (
    PowerFlowRequest,
    PowerFlowResult,
    ContingencyResult,
    PhysicalState,
    DataProvenance,
    DataClassification,
    Violation,
    ViolationType
)
from app.power.power_flow_service import power_flow_service
from app.services.telemetry_service import telemetry_service


class SimulationStateService:
    """
    Manages multi-tenant sandbox simulation state copies, stateful rollback/snapshots,
    N-1 physical contingency simulations, and the Cyber-to-Physics Event Bridge.
    Guarantees that the base database records are NEVER mutated by sandbox drills.
    """

    def __init__(self):
        # In-memory snapshots store: {simulation_id: {snapshot_name: state_overrides}}
        self._snapshots: Dict[str, Dict[str, Any]] = {}

    def create_scenario(self, request: SimulationCreateRequest, db: Session) -> SimulationScenario:
        """Creates a new isolated sandbox simulation."""
        sim_id = f"SIM-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
        base_ref = getattr(request, "baseline_reference", "TEST_NETWORK") or "TEST_NETWORK"
        scenario = SimulationScenario(
            simulation_id=sim_id,
            name=request.name,
            scenario_type=request.scenario_type,
            status="RUNNING",
            baseline_reference=base_ref,
            state_overrides={},
            event_count=0,
            summary=f"Initialized sandbox drill '{request.name}' with baseline reference {base_ref}."
        )
        db.add(scenario)
        db.commit()
        db.refresh(scenario)

        # Trigger initial event if provided
        if request.initial_event:
            evt_copy = request.initial_event.model_copy()
            evt_copy.simulation_id = sim_id
            self.apply_event_to_scenario(sim_id, evt_copy, db)

        return scenario

    def snapshot_scenario(self, simulation_id: str, snapshot_name: str, db: Session) -> Dict[str, Any]:
        """Creates an in-memory or database snapshot of the current scenario overrides."""
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == simulation_id).first()
        if not scenario:
            raise ValueError(f"Simulation scenario '{simulation_id}' not found.")

        if simulation_id not in self._snapshots:
            self._snapshots[simulation_id] = {}

        self._snapshots[simulation_id][snapshot_name] = copy.deepcopy(scenario.state_overrides or {})
        return {
            "simulation_id": simulation_id,
            "snapshot_name": snapshot_name,
            "saved_overrides": self._snapshots[simulation_id][snapshot_name],
            "timestamp": datetime.utcnow().isoformat()
        }

    def rollback_scenario(self, simulation_id: str, snapshot_name: str, db: Session) -> Dict[str, Any]:
        """Rolls back the scenario overrides to a previous snapshot."""
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == simulation_id).first()
        if not scenario:
            raise ValueError(f"Simulation scenario '{simulation_id}' not found.")

        if simulation_id not in self._snapshots or snapshot_name not in self._snapshots[simulation_id]:
            raise ValueError(f"Snapshot '{snapshot_name}' not found for simulation '{simulation_id}'.")

        restored_overrides = copy.deepcopy(self._snapshots[simulation_id][snapshot_name])
        scenario.state_overrides = restored_overrides
        scenario.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(scenario)

        return {
            "simulation_id": simulation_id,
            "restored_snapshot": snapshot_name,
            "state_overrides": scenario.state_overrides
        }

    def destroy_scenario(self, simulation_id: str, db: Session) -> Dict[str, Any]:
        """Terminates and purges an isolated sandbox simulation without touching production data."""
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == simulation_id).first()
        if not scenario:
            raise ValueError(f"Simulation scenario '{simulation_id}' not found.")

        if simulation_id in self._snapshots:
            del self._snapshots[simulation_id]

        db.delete(scenario)
        db.commit()
        return {"simulation_id": simulation_id, "status": "DESTROYED"}

    def apply_event_to_scenario(
        self,
        simulation_id: str,
        event_in: UnifiedGridEventCreate,
        db: Session
    ) -> Dict[str, Any]:
        """
        CYBER-TO-PHYSICS EVENT BRIDGE:
        1. Ingests cyber or physical event.
        2. Strictly separates CYBER STATUS from ELECTRICAL OPERATING STATUS.
        3. Updates sandbox state overrides (Base DB stays immutable).
        4. Re-solves AC power flow against sandbox state.
        5. Converts newly detected operating violations into structured PHYSICAL_EVENTs.
        6. Broadcasts PHYSICAL_STATE_UPDATE over WebSocket.
        """
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == simulation_id).first()
        if not scenario:
            raise ValueError(f"Simulation scenario '{simulation_id}' not found.")

        # Ensure event is tagged with this simulation_id
        event_in.simulation_id = simulation_id
        published_evt = event_bus_service.publish_event(event_in, db)

        # Update local mutable state overrides
        overrides = dict(scenario.state_overrides or {})
        etype = str(published_evt.event_type)
        src = published_evt.source_asset

        if src not in overrides:
            overrides[src] = {}

        # -------------------------------------------------------------
        # STRICT SEPARATION: CYBER STATUS vs ELECTRICAL OPERATING STATUS
        # -------------------------------------------------------------
        if etype in ("CYBER_ASSET_COMPROMISED", "ASSET_COMPROMISED", "SCADA_TAMPERING", "UNAUTHORIZED_ACCESS"):
            # Pure cyber compromise: device logic/SCADA compromised, but electrical branch remains IN_SERVICE
            overrides[src]["cyber_status"] = CyberStatus.COMPROMISED.value
            overrides[src]["security_status"] = "BREACH_DETECTED"
            overrides[src]["risk_score"] = 85.0
            # Electrical status preserved unless explicit breaker command
            if "status" not in overrides[src]:
                overrides[src]["status"] = ElectricalStatus.IN_SERVICE.value

        elif etype in ("UNAUTHORIZED_BREAKER_COMMAND", "LINE_TRIP", "LINE_FAILED"):
            # Authorized or malicious breaker opening command -> Trips physical branch
            overrides[src]["cyber_status"] = CyberStatus.COMPROMISED.value if "cyber_status" not in overrides[src] else overrides[src]["cyber_status"]
            overrides[src]["status"] = ElectricalStatus.OUT_OF_SERVICE.value
            overrides[src]["electrical_status"] = ElectricalStatus.OUT_OF_SERVICE.value
            overrides[src]["current_flow_mw"] = 0.0

        elif etype in ("LINE_OVERLOAD", "LINE_OVERLOADED"):
            overrides[src]["status"] = ElectricalStatus.OVERLOADED.value
            overrides[src]["electrical_status"] = ElectricalStatus.OVERLOADED.value

        # Check for transformer tap position adjustment in payload
        if event_in.payload and ("tap_position" in event_in.payload or "requested_tap" in event_in.payload):
            tap_val = event_in.payload.get("tap_position")
            if tap_val is None:
                tap_val = event_in.payload.get("requested_tap")
            if tap_val is not None:
                overrides[src]["tap_position"] = int(tap_val)
                overrides[src]["cyber_status"] = CyberStatus.COMPROMISED.value
                overrides[src]["security_status"] = "CONFIGURATION_TAMPERED"

        scenario.state_overrides = overrides
        scenario.event_count = (scenario.event_count or 0) + 1
        scenario.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(scenario)

        # -------------------------------------------------------------
        # RE-SOLVE AC POWER FLOW ON SANDBOX STATE
        # -------------------------------------------------------------
        network_id = scenario.baseline_reference or "TEST_NETWORK"
        req = PowerFlowRequest(network_id=network_id, scenario_id=simulation_id)
        pf_res = power_flow_service.run_or_stage_power_flow(req, db, state_overrides=overrides)
        canon_state = pf_res.to_canonical_physical_state()

        # Update telemetry physical state cache
        telemetry_service.set_physical_state(canon_state)

        # -------------------------------------------------------------
        # CONVERT SOLVER OPERATING VIOLATIONS INTO STRUCTURED PHYSICAL EVENTS
        # -------------------------------------------------------------
        generated_events: List[Dict[str, Any]] = []
        for viol in pf_res.violations:
            if viol.violation_type == ViolationType.LINE_OVERLOAD:
                evt_type = GridEventType.LINE_OVERLOAD
            elif viol.violation_type == ViolationType.TRANSFORMER_OVERLOAD:
                evt_type = GridEventType.TRANSFORMER_OVERLOAD
            elif viol.violation_type == ViolationType.VOLTAGE_UNDERVOLTAGE:
                evt_type = GridEventType.VOLTAGE_UNDERVOLTAGE
            elif viol.violation_type == ViolationType.VOLTAGE_OVERVOLTAGE:
                evt_type = GridEventType.VOLTAGE_OVERVOLTAGE
            else:
                evt_type = GridEventType.PHYSICAL_STATE_UPDATE

            phys_evt = UnifiedGridEventCreate(
                event_type=evt_type,
                event_category=EventCategory.PHYSICAL_EVENT,
                source_asset=viol.element_id,
                affected_assets=[viol.element_id],
                severity=viol.severity,
                cause=f"AC Solver detected {viol.description}",
                parent_event_id=published_evt.event_id,
                simulation_id=simulation_id,
                data_source="SOLVER_DERIVED",
                payload={
                    "element_id": viol.element_id,
                    "element_type": viol.element_type,
                    "value": viol.value,
                    "threshold": viol.threshold,
                    "unit": viol.unit,
                    "provenance": "SOLVER_DERIVED"
                }
            )
            saved_phys = event_bus_service.publish_event(phys_evt, db)
            generated_events.append({
                "event_id": saved_phys.event_id,
                "event_type": saved_phys.event_type,
                "source_asset": saved_phys.source_asset,
                "severity": saved_phys.severity,
                "description": viol.description
            })

        # -------------------------------------------------------------
        # BROADCAST PHYSICAL STATE UPDATE OVER WEBSOCKET
        # -------------------------------------------------------------
        try:
            loop = asyncio.get_running_loop()
            if loop and loop.is_running():
                asyncio.create_task(telemetry_service.broadcast_physical_state_update(
                    physical_state=canon_state,
                    cause=etype,
                    asset_id=src
                ))
        except RuntimeError:
            pass

        return {
            "simulation_id": simulation_id,
            "event_id": published_evt.event_id,
            "event_type": published_evt.event_type,
            "applied_to_asset": src,
            "cyber_status": overrides[src].get("cyber_status", "SECURE"),
            "electrical_status": overrides[src].get("status", "IN_SERVICE"),
            "total_scenario_events": scenario.event_count,
            "current_state_overrides": scenario.state_overrides,
            "solver_status": pf_res.status,
            "total_generation_mw": canon_state.total_generation_mw,
            "total_losses_mw": canon_state.total_losses_mw,
            "violations_detected": len(pf_res.violations),
            "generated_physical_events": generated_events,
            "physical_state": canon_state.model_dump()
        }

    def simulate_contingency(
        self,
        simulation_id: str,
        asset_id: str,
        network_id: str = "TEST_NETWORK",
        db: Optional[Session] = None
    ) -> ContingencyResult:
        """
        Runs an N-1 contingency evaluation on a sandbox state.
        1. Evaluates baseline AC power flow.
        2. Clones overrides and trips asset (LINE, TRANSFORMER, GENERATOR).
        3. Re-runs power flow on contingency state.
        4. Quantifies delta losses, delta loadings, and operating violations.
        5. Converts operating violations into structured physical events.
        6. Publishes PHYSICAL_STATE_UPDATE over WebSocket.
        7. Returns structured ContingencyResult (Base grid remains 100% immutable).
        """
        prov = DataProvenance(
            data_source="pandapower_3.5.4 (N-1 AC Contingency Engine)",
            source_url="app/services/simulation_state_service.py",
            source_date=datetime.utcnow().strftime("%Y-%m-%d"),
            verification_status="SOLVER_VALIDATED",
            data_classification=DataClassification.SOLVER_DERIVED,
            notes=f"N-1 contingency analysis on asset '{asset_id}' with isolated sandbox state override."
        )

        # 1. Baseline Power Flow
        base_req = PowerFlowRequest(network_id=network_id, scenario_id=f"{simulation_id}_BASELINE")
        base_res = power_flow_service.run_or_stage_power_flow(base_req, db)

        # 2. Build Contingency State Overrides
        contingency_overrides: Dict[str, Any] = {
            asset_id: {
                "status": "TRIPPED" if "XFMR" in asset_id or "GEN" in asset_id else "OUT_OF_SERVICE",
                "electrical_status": "TRIPPED" if "XFMR" in asset_id or "GEN" in asset_id else "OUT_OF_SERVICE"
            }
        }

        # 3. Solved Contingency Power Flow
        ctg_req = PowerFlowRequest(network_id=network_id, scenario_id=f"{simulation_id}_CONTINGENCY_{asset_id}")
        ctg_res = power_flow_service.run_or_stage_power_flow(ctg_req, db, state_overrides=contingency_overrides)
        canon_ctg_state = ctg_res.to_canonical_physical_state()

        # Update telemetry physical state
        telemetry_service.set_physical_state(canon_ctg_state)

        # 4. Summaries & Metric Deltas
        base_max_line = max([l.loading_percent for l in base_res.lines] or [0.0])
        ctg_max_line = max([l.loading_percent for l in ctg_res.lines] or [0.0])
        
        base_losses = base_res.power_balance.total_losses_mw if base_res.power_balance else 0.0
        ctg_losses = ctg_res.power_balance.total_losses_mw if ctg_res.power_balance else 0.0
        delta_losses = round(ctg_losses - base_losses, 3)
        delta_loading = round(ctg_max_line - base_max_line, 1)

        # 5. Extract New Violations
        base_viol_keys = {f"{v.violation_type}_{v.element_id}" for v in base_res.violations}
        new_violations = [v for v in ctg_res.violations if f"{v.violation_type}_{v.element_id}" not in base_viol_keys]

        # 6. Generate Structured Physical Events for New Violations
        generated_events: List[Dict[str, Any]] = []
        if db:
            for viol in new_violations:
                evt_type = GridEventType.LINE_OVERLOAD if viol.violation_type == ViolationType.LINE_OVERLOAD else (
                    GridEventType.TRANSFORMER_OVERLOAD if viol.violation_type == ViolationType.TRANSFORMER_OVERLOAD else GridEventType.VOLTAGE_VIOLATION
                )
                phys_evt = UnifiedGridEventCreate(
                    event_type=evt_type,
                    event_category=EventCategory.PHYSICAL_EVENT,
                    source_asset=viol.element_id,
                    affected_assets=[viol.element_id],
                    severity=viol.severity,
                    cause=f"Contingency trip on {asset_id} caused {viol.description}",
                    simulation_id=simulation_id,
                    data_source="SOLVER_DERIVED",
                    payload={
                        "element_id": viol.element_id,
                        "value": viol.value,
                        "threshold": viol.threshold,
                        "contingency_asset": asset_id
                    }
                )
                saved_evt = event_bus_service.publish_event(phys_evt, db)
                generated_events.append({
                    "event_id": saved_evt.event_id,
                    "event_type": saved_evt.event_type,
                    "source_asset": saved_evt.source_asset,
                    "severity": saved_evt.severity,
                    "description": viol.description
                })

        # 7. Electrical Differences
        elec_diffs = {
            "bus_voltages": {
                b.bus_id: {
                    "baseline_pu": next((x.voltage_pu for x in base_res.buses if x.bus_id == b.bus_id), 1.0),
                    "contingency_pu": b.voltage_pu,
                    "delta_pu": round(b.voltage_pu - next((x.voltage_pu for x in base_res.buses if x.bus_id == b.bus_id), 1.0), 4)
                } for b in ctg_res.buses
            },
            "line_loadings": {
                l.line_id: {
                    "baseline_loading": next((x.loading_percent for x in base_res.lines if x.line_id == l.line_id), 0.0),
                    "contingency_loading": l.loading_percent,
                    "flow_mw": l.p_from_mw
                } for l in ctg_res.lines
            },
            "transformer_loadings": {
                t.transformer_id: {
                    "baseline_loading": next((x.loading_percent for x in base_res.transformers if x.transformer_id == t.transformer_id), 0.0),
                    "contingency_loading": t.loading_percent,
                    "loss_mw": t.pl_mw
                } for t in ctg_res.transformers
            }
        }

        # Determine Asset Type
        asset_type = "LINE"
        if "XFMR" in asset_id or "TRAFO" in asset_id:
            asset_type = "TRANSFORMER"
        elif "GEN" in asset_id:
            asset_type = "GENERATOR"
        elif "BUS" in asset_id or "SUB" in asset_id:
            asset_type = "BUS"

        # 8. Broadcast over WebSocket
        try:
            loop = asyncio.get_running_loop()
            if loop and loop.is_running():
                asyncio.create_task(telemetry_service.broadcast_physical_state_update(
                    physical_state=canon_ctg_state,
                    cause=f"N-1 Contingency Trip: {asset_id}",
                    asset_id=asset_id
                ))
        except RuntimeError:
            pass

        return ContingencyResult(
            simulation_id=simulation_id,
            tripped_asset_id=asset_id,
            tripped_asset_type=asset_type,
            status=ctg_res.status,
            baseline_summary={
                "converged": base_res.status == "SUCCESS",
                "total_generation_mw": base_res.power_balance.total_generation_mw if base_res.power_balance else 0.0,
                "total_load_mw": base_res.power_balance.total_load_mw if base_res.power_balance else 0.0,
                "total_losses_mw": base_losses,
                "max_line_loading_percent": base_max_line,
                "violations_count": len(base_res.violations)
            },
            contingency_summary={
                "converged": ctg_res.status == "SUCCESS",
                "total_generation_mw": ctg_res.power_balance.total_generation_mw if ctg_res.power_balance else 0.0,
                "total_load_mw": ctg_res.power_balance.total_load_mw if ctg_res.power_balance else 0.0,
                "total_losses_mw": ctg_losses,
                "max_line_loading_percent": ctg_max_line,
                "violations_count": len(ctg_res.violations)
            },
            delta_losses_mw=delta_losses,
            delta_max_loading_percent=delta_loading,
            new_violations=new_violations,
            generated_events=generated_events,
            islands_detected=[],
            electrical_differences=elec_diffs,
            physical_state=canon_ctg_state,
            execution_time_ms=ctg_res.execution_time_ms,
            provenance=prov
        )

    def get_scenario_state(self, simulation_id: str, db: Session) -> SimulationStateResponse:
        """Retrieves current isolated state of a simulation."""
        scenario = db.query(SimulationScenario).filter(SimulationScenario.simulation_id == simulation_id).first()
        if not scenario:
            raise ValueError(f"Simulation scenario '{simulation_id}' not found.")

        return SimulationStateResponse(
            simulation_id=scenario.simulation_id,
            name=scenario.name,
            scenario_type=scenario.scenario_type,
            status=scenario.status,
            baseline_reference=scenario.baseline_reference,
            event_count=scenario.event_count or 0,
            created_at=scenario.created_at.isoformat(),
            updated_at=scenario.updated_at.isoformat(),
            state_overrides=scenario.state_overrides or {},
            summary=scenario.summary
        )


simulation_state_service = SimulationStateService()



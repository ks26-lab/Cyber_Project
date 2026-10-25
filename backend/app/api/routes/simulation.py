"""
Simulation Sandbox API Routes for GRIDSEC.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.simulation_service import simulation_service
from app.services.simulation_state_service import simulation_state_service
from app.schemas.sandbox_simulation import SimulationCreateRequest, SimulationStateResponse, SimulationEventRequest
from app.power.models import ContingencyResult

router = APIRouter(prefix="/simulation", tags=["Simulation Sandbox & What-If Drills"])


class CyberAttackSimulationRequest(BaseModel):
    target_asset_id: str = Field(..., description="Target substation or power plant ID, e.g. WR-RAIGARH")
    attack_type: str = Field("MALWARE_INJECTION", description="Attack type: MALWARE_INJECTION, SCADA_MITM, RANSOMWARE, REPLAY_ATTACK")
    propagate: bool = Field(True, description="Whether to simulate cascading propagation")


class ResilienceTestRequest(BaseModel):
    trip_node_ids: List[str] = Field(default_factory=list, description="Substations to artificially disconnect")
    trip_line_ids: List[str] = Field(default_factory=list, description="Transmission lines to trip")


class ContingencyRequest(BaseModel):
    asset_id: str = Field(..., description="Grid asset or branch identifier to trip e.g. LINE-1-2 or XFMR-3-4")
    network_id: str = Field("TEST_NETWORK", description="Underlying network to evaluate e.g. TEST_NETWORK or INDIA_GRID_59")


class SnapshotRequest(BaseModel):
    snapshot_name: str = Field(..., description="Unique name/label for the sandbox state snapshot")


@router.post("/create", response_model=SimulationStateResponse, summary="Create new isolated sandbox simulation")
def create_sandbox_simulation(req: SimulationCreateRequest, db: Session = Depends(get_db)) -> SimulationStateResponse:
    scenario = simulation_state_service.create_scenario(req, db)
    return simulation_state_service.get_scenario_state(scenario.simulation_id, db)


@router.get("/{simulation_id}", response_model=SimulationStateResponse, summary="Get current sandbox simulation state")
@router.get("/{simulation_id}/state", response_model=SimulationStateResponse, summary="Get sandbox simulation state")
def get_sandbox_state(simulation_id: str, db: Session = Depends(get_db)) -> SimulationStateResponse:
    try:
        return simulation_state_service.get_scenario_state(simulation_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{simulation_id}/event", summary="Apply Event to Sandbox Simulation")
def apply_simulation_event(
    simulation_id: str,
    request: SimulationEventRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        return simulation_state_service.apply_event_to_scenario(simulation_id, request.event, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying simulation event: {str(e)}")


@router.post("/{simulation_id}/contingency", response_model=ContingencyResult, summary="Run N-1 contingency power flow on sandbox state")
def run_sandbox_contingency(simulation_id: str, req: ContingencyRequest, db: Session = Depends(get_db)) -> ContingencyResult:
    """
    Executes an N-1 contingency evaluation on the specified sandbox scenario.
    Solves baseline power flow, trips the element in an isolated state copy,
    solves contingency power flow, and reports metric deltas and violations.
    Base production grid records remain completely unaffected.
    """
    try:
        return simulation_state_service.simulate_contingency(
            simulation_id=simulation_id,
            asset_id=req.asset_id,
            network_id=req.network_id,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contingency simulation error: {str(e)}")


@router.post("/{simulation_id}/snapshot", summary="Snapshot current sandbox state overrides")
def snapshot_sandbox(simulation_id: str, req: SnapshotRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        return simulation_state_service.snapshot_scenario(simulation_id, req.snapshot_name, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{simulation_id}/rollback", summary="Rollback sandbox state to previous snapshot")
def rollback_sandbox(simulation_id: str, req: SnapshotRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        return simulation_state_service.rollback_scenario(simulation_id, req.snapshot_name, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{simulation_id}", summary="Destroy sandbox simulation scenario")
def destroy_sandbox(simulation_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        return simulation_state_service.destroy_scenario(simulation_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cyber-event", summary="Simulate cyber attack on grid node with cascading propagation")
def simulate_cyber_event(req: CyberAttackSimulationRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return simulation_service.run_cyber_event_simulation(
        db=db,
        target_asset_id=req.target_asset_id,
        attack_type=req.attack_type,
        propagate=req.propagate
    )


@router.post("/resilience", summary="Run N-1 / N-2 contingency resilience simulation")
def simulate_resilience_contingency(req: ResilienceTestRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    return simulation_service.find_alternate_route(
        db=db,
        source_id="NR-DELHI",
        target_id="SR-PUGALUR",
        avoid_nodes=req.trip_node_ids,
        avoid_edges=req.trip_line_ids,
        objective="balanced"
    )


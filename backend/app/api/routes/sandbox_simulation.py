"""
Sandbox Simulation Scenario REST API Routes for Multi-Tenant What-If Testing
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.sandbox_simulation import (
    SimulationCreateRequest,
    SimulationEventRequest,
    SimulationStateResponse
)
from app.services.simulation_state_service import simulation_state_service

router = APIRouter(prefix="/simulation", tags=["Sandbox Simulation & Scenario Engine"])


@router.post("/create", response_model=SimulationStateResponse, summary="Create Isolated Sandbox Simulation")
def create_sandbox_simulation(
    request: SimulationCreateRequest,
    db: Session = Depends(get_db)
) -> SimulationStateResponse:
    """
    Creates an isolated simulation sandbox scenario, keeping base grid data immutable.
    """
    try:
        scenario = simulation_state_service.create_scenario(request, db)
        return simulation_state_service.get_scenario_state(scenario.simulation_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating simulation scenario: {str(e)}")


@router.post("/{simulation_id}/event", summary="Apply Event to Sandbox Simulation")
def apply_simulation_event(
    simulation_id: str,
    request: SimulationEventRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Injects a cyber/physical event into an isolated simulation and updates scenario state.
    """
    try:
        return simulation_state_service.apply_event_to_scenario(simulation_id, request.event, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying simulation event: {str(e)}")


@router.get("/{simulation_id}/state", response_model=SimulationStateResponse, summary="Get Sandbox Simulation State")
def get_simulation_state(
    simulation_id: str,
    db: Session = Depends(get_db)
) -> SimulationStateResponse:
    """
    Returns current isolated state overrides and event count of a simulation sandbox.
    """
    try:
        return simulation_state_service.get_scenario_state(simulation_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving simulation state: {str(e)}")

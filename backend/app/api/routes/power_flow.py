"""
Power Flow REST API Routes for GRIDSEC.
Provides endpoints for electrical model inspection, validation, solver execution, and route feasibility checks.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.power.models import (
    PowerFlowRequest,
    PowerFlowResult,
    BusModel,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel
)
from app.power.power_flow_service import power_flow_service

router = APIRouter(prefix="/power-flow", tags=["Electrical Power Flow & Cyber-Physical Simulation"])


class RouteValidationRequest(BaseModel):
    candidate_route: List[str] = Field(..., description="Ordered list of bus identifiers e.g. ['BUS-1', 'BUS-2', 'BUS-3']")
    additional_mw: float = Field(200.0, description="Additional power to reroute in MW")
    network_id: str = Field("TEST_NETWORK", description="Network topology identifier")


@router.get("/status", summary="Get Electrical Power Flow Engine Status")
def get_power_flow_status() -> Dict[str, Any]:
    """
    Returns readiness state of the electrical power-flow simulation subsystem,
    including solver targets, supported networks, and parameter provenance rules.
    """
    return power_flow_service.get_engine_status()


@router.get("/networks", summary="List Available Electrical Networks")
def list_available_networks() -> List[Dict[str, str]]:
    """
    Lists electrical network topologies available for simulation.
    Separates distribution feeders, transmission benchmarks, and national reference networks.
    """
    return [
        {
            "network_id": "TRAINING_FEEDER",
            "name": "12-Bus Smart City Distribution Feeder (33/11 kV)",
            "category": "DISTRIBUTION_BENCHMARK",
            "description": "12-bus urban distribution feeder with Hospital, Water Treatment, Control Center, University, Residential, Industrial, Solar PV, BESS & 4 NO Tie Switches"
        },
        {
            "network_id": "IEEE_33_DISTRIBUTION",
            "name": "IEEE 33-Bus Radial Distribution System (Baran & Wu 1989)",
            "category": "BENCHMARK_STANDARD",
            "description": "Standard 12.66 kV 33-bus radial distribution feeder with 32 sectionalizing branches, 5 NO tie switches, and critical facility extensions"
        },
        {
            "network_id": "IEEE_30",
            "name": "IEEE 30-Bus Transmission Benchmark System",
            "category": "BENCHMARK_STANDARD",
            "description": "Standard 30-bus MATPOWER/AEP benchmark system (6 generators, 21 loads, 37 lines, 4 OLTC transformers)"
        },
        {
            "network_id": "INDIA_GRID_59",
            "name": "59-Node Indian National Grid Reference Model",
            "category": "NATIONAL_REFERENCE",
            "description": "59 bulk substations/power plants with 54 high-voltage transmission corridors & 85 transformer bays"
        },
        {
            "network_id": "TEST_NETWORK",
            "name": "4-Bus Benchmark Test Network",
            "category": "SYNTHETIC_VALIDATION",
            "description": "Clean 4-bus validation test system (Slack Gen -> 765kV Lines -> Step-Down ICTs -> 400kV Load)"
        }
    ]


@router.get("/networks/{network_id}", summary="Get Electrical Bus-Branch Model")
def get_electrical_network(network_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns the complete bus-branch electrical model for a given network ID,
    attaching data provenance classifications to all parameters.
    """
    try:
        return power_flow_service.get_network_topology(network_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error building electrical network: {str(e)}")


@router.post("/run", response_model=PowerFlowResult, summary="Execute AC Newton-Raphson Power Flow")
def run_power_flow(request: PowerFlowRequest, db: Session = Depends(get_db)) -> PowerFlowResult:
    """
    Executes physical validation and runs the electrical AC Newton-Raphson power-flow simulation.
    Calculates exact bus voltage magnitudes, phase angles, line power flows, transformer loadings,
    system transmission losses, and checks Kirchhoff power balance.
    """
    try:
        return power_flow_service.run_or_stage_power_flow(request, db, state_overrides=request.state_overrides)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Power flow execution error: {str(e)}")


@router.post("/validate-route", summary="Validate Electrical Feasibility of DSA Candidate Route")
def validate_candidate_route(req: RouteValidationRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Validates whether a Dijkstra alternate candidate route is electrically feasible
    under AC power-flow constraints (thermal line capacity limits and voltage drop).
    """
    try:
        return power_flow_service.validate_candidate_route_power_flow(
            candidate_route=req.candidate_route,
            additional_mw=req.additional_mw,
            network_id=req.network_id,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route validation error: {str(e)}")

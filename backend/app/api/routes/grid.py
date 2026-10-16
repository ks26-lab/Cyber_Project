"""
Grid Topology and Network API Routes.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.grid_service import grid_service
from app.models.asset import Asset, EnergyFirm
from app.models.transmission import TransmissionLine

router = APIRouter(prefix="/grid", tags=["Grid Topology"])


@router.get("/network", summary="Get complete power grid network topology")
def get_network_topology(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns full Indian National Grid topology with all 59 monitored substations/power plants,
    54 transmission corridors, 11 energy firms, and transformer bay counts from the database.
    """
    return grid_service.get_full_network(db)


@router.get("/substations", summary="List all substations and power plants")
def get_substations(
    region: Optional[str] = Query(None, description="Region filter: NR, WR, SR, ER, NER"),
    status: Optional[str] = Query(None, description="Status filter: HEALTHY, COMPROMISED, AT_RISK"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(Asset)
    if region:
        query = query.filter(Asset.region == region.upper())
    if status:
        query = query.filter(Asset.status == status.upper())
    
    assets = query.all()
    return [
        {
            "id": a.asset_id,
            "name": a.name,
            "type": a.asset_type,
            "state": a.state,
            "district": a.district,
            "pincode": a.pincode,
            "region": a.region,
            "voltage": a.voltage_kv,
            "capacityMW": a.capacity_mw,
            "currentMW": a.current_mw,
            "status": a.status,
            "securityStatus": a.security_status,
            "riskScore": a.risk_score,
            "operator": a.operator,
            "operatorId": a.operator_id,
            "lat": a.latitude,
            "lon": a.longitude,
            "dataSource": a.data_source
        }
        for a in assets
    ]


@router.get("/transmission-lines", summary="List all transmission lines and corridors")
def get_transmission_lines(
    line_type: Optional[str] = Query(None, description="Filter: HVDC, 765kV_AC, 400kV_AC"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(TransmissionLine)
    if line_type:
        query = query.filter(TransmissionLine.line_type == line_type)
    
    lines = query.all()
    return [
        {
            "id": l.line_id,
            "name": l.name,
            "from": l.source_asset_id,
            "to": l.destination_asset_id,
            "type": l.line_type,
            "voltage": l.voltage_kv,
            "distanceKm": l.length_km,
            "capacityMW": l.capacity_mw,
            "currentFlowMW": l.current_flow_mw,
            "status": l.status,
            "direction": l.direction,
            "operator": l.operator,
            "operatorId": l.operator_id,
            "dataSource": l.data_source
        }
        for l in lines
    ]


@router.get("/operators", summary="List all Indian Energy Firms and operators")
def get_operators(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    firms = db.query(EnergyFirm).all()
    return [
        {
            "id": f.firm_id,
            "name": f.name,
            "shortName": f.short_name,
            "firmType": f.firm_type,
            "category": f.category,
            "hq": f.hq,
            "founded": f.founded_year,
            "description": f.description,
            "color": f.color,
            "badgeClass": f.badge_class,
            "circuitKm": f.circuit_km,
            "interstateCapacityMW": f.capacity_mw,
            "dataSource": f.data_source
        }
        for f in firms
    ]


@router.get("/pincode/{pincode}/power-flow", summary="Get complete power flow and transformer bays for a pincode")
def get_grid_pincode_power_flow(pincode: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    result = grid_service.get_pincode_power_flow(db, pincode)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=result.get("message", f"Pincode '{pincode}' not found."))
    return result


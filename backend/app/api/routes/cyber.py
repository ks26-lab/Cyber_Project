"""
Cyber Attack Simulation & Detection API Routes for GRIDSEC.
Exposes endpoints for the Cyber Defense Lab and real-time incident analysis.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.incident import Incident
from app.models.event import SecurityEvent, GridEvent
from app.schemas.cyber_attack import (
    SyntheticScenarioDefinition,
    CyberSimulationRequest,
    CyberImpactAnalysisResponse
)
from app.schemas.unified_event import UnifiedGridEventCreate, UnifiedGridEventResponse
from app.services.cyber_detection_engine import cyber_detection_engine
from app.services.event_bus_service import event_bus_service
from app.services.incident_service import incident_service

from app.cyber.attack_simulator import DynamicTargetSelector

router = APIRouter(prefix="/cyber", tags=["Cyber Defense Lab & Threat Detection"])


@router.get("/scenarios", response_model=List[SyntheticScenarioDefinition])
def get_attack_scenarios():
    """
    Returns the catalog of predefined synthetic attack scenarios (A through E).
    """
    return cyber_detection_engine.get_scenario_definitions()


@router.get("/eligible-targets", response_model=List[str])
def get_eligible_targets(
    scenario_id: Optional[str] = Query(None, description="Scenario ID e.g. SCN-001, SCN-002, SCN-003, SCN-004, SCN-005"),
    db: Session = Depends(get_db)
):
    """
    Returns dynamically queryable list of eligible grid targets for a specific attack scenario.
    """
    return DynamicTargetSelector.get_eligible_targets(scenario_id, db)


@router.get("/transformers", response_model=List[Dict[str, Any]])
def get_grid_transformers(db: Session = Depends(get_db)):
    """
    Returns dynamically queryable list of transformers with rating, tap limits, and connected buses.
    """
    results = [
        {
            "transformer_id": "XFMR-3-4",
            "name": "Western Interconnector ICT-1 (220/400kV)",
            "from_bus": "BUS-3",
            "to_bus": "BUS-4",
            "primary_kv": 220.0,
            "secondary_kv": 400.0,
            "rated_mva": 500.0,
            "current_tap": 0,
            "tap_min": -10,
            "tap_max": 10,
            "location": "WR-RAIGARH / Champa Intertie",
            "status": "IN_SERVICE"
        }
    ]
    from app.models.asset import TransformerBay, Asset
    try:
        bays = db.query(TransformerBay).all()
        for b in bays:
            if b.bay_id != "XFMR-3-4":
                asset = db.query(Asset).filter(Asset.asset_id == b.asset_id).first()
                loc = f"{asset.city}, {asset.state}" if asset else "Grid Substation"
                results.append({
                    "transformer_id": b.bay_id,
                    "name": b.name or f"Transformer {b.bay_id}",
                    "from_bus": getattr(b, "primary_bus", "BUS-HV"),
                    "to_bus": getattr(b, "secondary_bus", "BUS-LV"),
                    "primary_kv": float(b.primary_voltage_kv) if b.primary_voltage_kv else 400.0,
                    "secondary_kv": float(b.secondary_voltage_kv) if b.secondary_voltage_kv else 220.0,
                    "rated_mva": float(b.rating_mva) if b.rating_mva else 315.0,
                    "current_tap": 0,
                    "tap_min": -10,
                    "tap_max": 10,
                    "location": loc,
                    "status": b.status or "IN_SERVICE"
                })
    except Exception:
        pass
    return results


@router.post("/simulate", response_model=CyberImpactAnalysisResponse)
def simulate_cyber_attack(
    request: CyberSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests a synthetic cyber event and executes the 10-stage detection,
    classification, BFS blast radius, power-flow solver, and incident triage pipeline.
    """
    try:
        return cyber_detection_engine.execute_cyber_simulation_pipeline(request, db)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Cyber simulation failed: {str(e)}")


@router.post("/events", response_model=Dict[str, Any])
def log_cyber_event(
    event_in: UnifiedGridEventCreate,
    db: Session = Depends(get_db)
):
    """
    Logs a raw cyber security event to the event bus.
    """
    grid_evt = event_bus_service.publish_event(event_in, db)
    return {
        "event_id": grid_evt.event_id,
        "status": "PUBLISHED",
        "timestamp": grid_evt.timestamp.isoformat(),
        "source_asset": grid_evt.source_asset,
        "event_type": grid_evt.event_type
    }


@router.get("/events", response_model=List[Dict[str, Any]])
def get_cyber_events(
    limit: int = Query(50, ge=1, le=200),
    simulation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves recent cyber and grid events filtered by simulation ID.
    """
    return event_bus_service.get_recent_events(db, limit=limit, simulation_id=simulation_id)


@router.get("/incidents/{incident_id}", response_model=Dict[str, Any])
def get_cyber_incident(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves a specific cybersecurity incident with risk score and containment playbook.
    """
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    return {
        "incident_id": inc.incident_id,
        "title": inc.title,
        "severity": inc.severity,
        "status": inc.status,
        "source_asset_id": inc.source_asset_id,
        "risk_score": inc.risk_score,
        "asset_criticality": inc.asset_criticality,
        "affected_assets_count": inc.affected_assets_count,
        "detected_at": inc.detected_at.isoformat() if inc.detected_at else None,
        "description": inc.description,
        "recommended_action": inc.recommended_action,
        "containment_playbook": inc.containment_playbook
    }


@router.get("/incidents/{incident_id}/analysis", response_model=Dict[str, Any])
def get_cyber_incident_analysis(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns deep structural analysis of an incident including blast radius and physics impact.
    """
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    matched, _, _ = cyber_detection_engine.resolve_asset(inc.source_asset_id, db)
    blast = cyber_detection_engine.analyze_blast_radius(inc.source_asset_id, matched, db)

    return {
        "incident_id": inc.incident_id,
        "title": inc.title,
        "severity": inc.severity,
        "source_asset": inc.source_asset_id,
        "risk_score": inc.risk_score,
        "asset_criticality": inc.asset_criticality,
        "affected_assets_count": inc.affected_assets_count,
        "blast_radius": blast.model_dump(),
        "status": inc.status,
        "detected_at": inc.detected_at.isoformat() if inc.detected_at else None
    }


@router.post("/correlate", response_model=Dict[str, Any])
def correlate_cyber_event(
    event_in: UnifiedGridEventCreate,
    db: Session = Depends(get_db)
):
    """
    Evaluates correlation of a cyber event against active incidents and failure cascades.
    """
    corr = event_bus_service.correlate_event(event_in, db)
    return {
        "related": corr.related,
        "incident_id": corr.incident_id,
        "cascade_id": corr.cascade_id,
        "confidence": corr.confidence,
        "correlation_reason": corr.correlation_reason
    }


@router.get("/aegis-evidence/{incident_id}", response_model=Dict[str, Any])
def get_aegis_cyber_evidence(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns structured Aegis explainable evidence for an incident.
    """
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    return {
        "incident_id": inc.incident_id,
        "title": inc.title,
        "severity": inc.severity,
        "risk_score": inc.risk_score,
        "target_asset": inc.source_asset_id,
        "detected_at": inc.detected_at.isoformat() if inc.detected_at else None,
        "description": inc.description,
        "containment_playbook": inc.containment_playbook,
        "operator_brief": f"Incident {inc.incident_id} detected on {inc.source_asset_id} with severity {inc.severity}."
    }

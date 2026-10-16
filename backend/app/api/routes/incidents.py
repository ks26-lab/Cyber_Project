"""
Incident Management API Routes (DSA Max-Heap Priority Queue).
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.incident_service import incident_service
from app.models.incident import Incident

router = APIRouter(prefix="/incidents", tags=["Incidents"])


class CreateIncidentRequest(BaseModel):
    title: str
    severity: str
    source_asset_id: str
    description: str
    risk_score: float = 75.0
    asset_criticality: float = 8.0
    affected_assets_count: int = 1
    recommended_action: Optional[str] = None


@router.get("", summary="Get all grid incidents")
def get_incidents(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    incidents = db.query(Incident).all()
    return [
        {
            "id": i.incident_id,
            "title": i.title,
            "severity": i.severity,
            "sourceAssetId": i.source_asset_id,
            "status": i.status,
            "riskScore": i.risk_score,
            "assetCriticality": i.asset_criticality,
            "affectedAssetsCount": i.affected_assets_count,
            "detectedAt": i.detected_at.isoformat() if i.detected_at else None,
            "description": i.description,
            "recommendedAction": i.recommended_action,
            "containmentPlaybook": i.containment_playbook,
            "dataSource": i.data_source
        }
        for i in incidents
    ]


@router.get("/prioritized", summary="Get incidents ranked dynamically via DSA Max-Heap Priority Queue")
def get_prioritized_incidents(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Ranks active cyber incidents using an in-memory Binary Max-Heap priority queue.
    Calculates weighted score based on: Risk Score (40%), Criticality (35%), Cascading Blast Count (25%).
    """
    return incident_service.get_prioritized_incidents(db)


@router.post("", summary="Create a new incident and insert into triage pipeline")
def create_incident(req: CreateIncidentRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    inc = incident_service.create_incident(
        db=db,
        title=req.title,
        severity=req.severity,
        source_asset_id=req.source_asset_id,
        description=req.description,
        risk_score=req.risk_score,
        asset_criticality=req.asset_criticality,
        affected_assets_count=req.affected_assets_count,
        recommended_action=req.recommended_action
    )
    return {
        "status": "CREATED",
        "incident_id": inc.incident_id,
        "title": inc.title,
        "severity": inc.severity
    }

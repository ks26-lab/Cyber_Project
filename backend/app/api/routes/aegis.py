"""
Aegis AI Situation Awareness & Explainable Decision-Support REST API Routes
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.aegis import SituationSnapshot, AegisReportResponse, AegisCascadeReport
from app.services.aegis_service import aegis_service
from app.services.event_bus_service import event_bus_service

router = APIRouter(prefix="/aegis", tags=["Aegis AI Cyber-Physical Situation Awareness"])


@router.get("/situation", response_model=SituationSnapshot, summary="Get Real-Time Situation Snapshot")
def get_situation_snapshot(
    simulation_id: Optional[str] = Query(None, description="Optional sandbox simulation ID"),
    db: Session = Depends(get_db)
) -> SituationSnapshot:
    """
    Returns structured Situation Snapshot aggregating physical power state,
    cybersecurity threat landscape, and DSA resilience analytics.
    """
    return aegis_service.build_situation_snapshot(db, simulation_id)


@router.get("/events", summary="Get Aegis Event Feed")
def get_aegis_event_feed(
    limit: int = Query(50, ge=1, le=200),
    simulation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Returns recent unified grid events streamed to the Aegis analysis pipeline.
    """
    return event_bus_service.get_recent_events(db, limit, simulation_id)


@router.get("/reports", response_model=List[AegisReportResponse], summary="List Aegis AI Assessment Reports")
def list_aegis_reports(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
) -> List[AegisReportResponse]:
    """
    Returns historical and active Aegis AI decision-support reports.
    """
    reports = aegis_service.list_reports(db, limit)
    return [AegisReportResponse.model_validate(r) for r in reports]


@router.get("/reports/{report_id}", response_model=AegisReportResponse, summary="Get Aegis AI Assessment Report by ID")
def get_aegis_report_by_id(
    report_id: str,
    db: Session = Depends(get_db)
) -> AegisReportResponse:
    """
    Retrieves full details of an Aegis AI report, including structured evidence claims and DSA context.
    """
    report = aegis_service.get_report_by_id(report_id, db)
    if not report:
        raise HTTPException(status_code=404, detail=f"Aegis report '{report_id}' not found.")
    return AegisReportResponse.model_validate(report)


@router.post("/assess", response_model=AegisReportResponse, summary="Generate Fresh Aegis AI Assessment Report")
def generate_aegis_assessment(
    incident_id: Optional[str] = Query(None),
    simulation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> AegisReportResponse:
    """
    Synthesizes current grid state and DSA analytics to generate a new Explainable AI Report.
    """
    report = aegis_service.generate_assessment_report(db, incident_id, simulation_id)
    return AegisReportResponse.model_validate(report)


@router.post("/cascade/explain", response_model=AegisCascadeReport, summary="Generate Aegis Cascade Intelligence Report")
def explain_cascade_endpoint(
    cascade_id: str = Query(..., description="Cascade ID to explain"),
    db: Session = Depends(get_db)
) -> AegisCascadeReport:
    """
    Synthesizes structured evidence from a multi-agent cascade into an Aegis Cascade Intelligence & Explainability Report.
    """
    report = aegis_service.explain_cascade(cascade_id, db)
    if not report:
        raise HTTPException(status_code=404, detail=f"Cascade '{cascade_id}' not found in database.")
    return report


@router.get("/cascade/{cascade_id}", response_model=AegisCascadeReport, summary="Get Aegis Cascade Report by Cascade ID")
def get_cascade_explanation(
    cascade_id: str,
    db: Session = Depends(get_db)
) -> AegisCascadeReport:
    """
    Retrieves the Aegis cascade intelligence report for a specified cascade.
    """
    report = aegis_service.explain_cascade(cascade_id, db)
    if not report:
        raise HTTPException(status_code=404, detail=f"Cascade '{cascade_id}' not found in database.")
    return report


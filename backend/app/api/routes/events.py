"""
Security Events API Routes.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.cybersecurity_service import cybersecurity_service
from app.schemas.event import SecurityEventCreate

router = APIRouter(prefix="/events", tags=["Security Events"])


@router.get("", summary="Get recent security events and alerts")
def get_security_events(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    return cybersecurity_service.get_recent_events(db, limit=limit)


@router.post("", summary="Log a new cybersecurity event")
def log_security_event(
    event: SecurityEventCreate,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    evt = cybersecurity_service.log_security_event(
        db=db,
        source_asset_id=event.source_asset_id,
        event_type=event.event_type,
        severity=event.severity,
        description=event.description,
        destination_asset_id=event.destination_asset_id,
        protocol=event.protocol,
        payload_sample=event.payload_sample
    )
    return {
        "status": "LOGGED",
        "event_id": evt.event_id,
        "timestamp": evt.timestamp.isoformat(),
        "severity": evt.severity
    }

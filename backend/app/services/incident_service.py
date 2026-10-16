"""
Incident Management & DSA Priority Queue Service.
Uses DSA Max-Heap Priority Queue to dynamically prioritize incidents
based on Severity, Asset Capacity, and Cascading Blast Radius.
"""
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.asset import Asset
from app.dsa.priority_queue import IncidentPriorityQueue, PrioritizedIncidentItem


class IncidentService:
    def create_incident(
        self,
        db: Session,
        title: str,
        severity: str,
        source_asset_id: str,
        description: str,
        risk_score: float = 75.0,
        asset_criticality: float = 8.0,
        affected_assets_count: int = 1,
        recommended_action: Optional[str] = None
    ) -> Incident:
        inc_id = f"INC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"

        incident = Incident(
            incident_id=inc_id,
            title=title,
            severity=severity.upper(),
            source_asset_id=source_asset_id,
            status="DETECTED",
            risk_score=risk_score,
            asset_criticality=asset_criticality,
            affected_assets_count=affected_assets_count,
            detected_at=datetime.utcnow(),
            description=description,
            recommended_action=recommended_action or "Isolate substation SCADA gateway and reroute critical power flows.",
            containment_playbook=[
                "Verify IEC 61850 GOOSE authentication logs",
                "Execute selective substation breaker isolation",
                "Trigger Dijkstra dynamic power rerouting",
                "Notify CERT-In / NCIIPC"
            ],
            data_source="SIMULATED",
            source_url="incident_service:triage_engine"
        )
        db.add(incident)
        db.commit()

        return incident

    def get_prioritized_incidents(self, db: Session) -> List[Dict[str, Any]]:
        """
        Loads all active incidents from the database and runs the Max-Heap DSA Priority Queue
        to return items sorted by calculated priority score.
        """
        incidents = db.query(Incident).filter(Incident.status != "RESOLVED").all()
        
        # Build dictionary list for Max-Heap
        inc_dicts = [
            {
                "incident_id": inc.incident_id,
                "title": inc.title,
                "severity": inc.severity,
                "source_asset_id": inc.source_asset_id,
                "risk_score": inc.risk_score or 50.0,
                "asset_criticality": inc.asset_criticality or 5.0,
                "affected_assets_count": inc.affected_assets_count or 1,
                "status": inc.status,
                "description": inc.description,
                "detected_at": inc.detected_at.isoformat() if inc.detected_at else None,
                "recommended_action": inc.recommended_action,
                "containment_playbook": inc.containment_playbook
            }
            for inc in incidents
        ]

        return IncidentPriorityQueue.prioritize_incidents(inc_dicts)


incident_service = IncidentService()

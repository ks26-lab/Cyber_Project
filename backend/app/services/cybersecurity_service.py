"""
Cybersecurity Service.
Monitors SCADA / Synchrophasor telemetry, ingests cyber security events,
flags protocol anomalies (DNP3, Modbus, IEC 60870-5-104), and registers incidents.
"""
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models.event import SecurityEvent
from app.models.incident import Incident
from app.models.asset import Asset
from app.services.grid_service import grid_service
from app.dsa.bfs import BFSImpactEngine


class CybersecurityService:
    def log_security_event(
        self,
        db: Session,
        source_asset_id: str,
        event_type: str,
        severity: str,
        description: str,
        destination_asset_id: Optional[str] = None,
        protocol: str = "DNP3",
        payload_sample: Optional[str] = None
    ) -> SecurityEvent:
        event_id = f"EVT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        evt = SecurityEvent(
            event_id=event_id,
            timestamp=datetime.utcnow(),
            source_asset_id=source_asset_id,
            destination_asset_id=destination_asset_id,
            event_type=event_type,
            protocol=protocol,
            severity=severity.upper(),
            description=description,
            payload_sample=payload_sample,
            status="ACTIVE",
            data_source="SIMULATED",
            source_url="cybersecurity_service:ids_engine"
        )
        db.add(evt)

        # Update asset status if critical or high
        if severity.upper() in ("CRITICAL", "HIGH"):
            asset = db.query(Asset).filter(Asset.asset_id == source_asset_id).first()
            if asset:
                asset.status = "COMPROMISED"
                asset.security_status = "BREACH_DETECTED"
                asset.risk_score = min(98.0, (asset.risk_score or 10.0) + 40.0)
                db.flush()

        db.commit()
        return evt

    def get_recent_events(self, db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "sourceAssetId": e.source_asset_id,
                "destinationAssetId": e.destination_asset_id,
                "eventType": e.event_type,
                "protocol": e.protocol,
                "severity": e.severity,
                "description": e.description,
                "payloadSample": e.payload_sample,
                "status": e.status,
                "mitigationAction": e.mitigation_action,
                "dataSource": e.data_source
            }
            for e in events
        ]


cybersecurity_service = CybersecurityService()

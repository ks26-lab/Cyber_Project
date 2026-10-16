"""
Unified Event Bus Service for GRIDSEC.
Handles event publishing, persistence, causal graph linking,
and event correlation across cyber and physical domains.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.event import GridEvent, Cascade, CascadeEvent
from app.models.incident import Incident
from app.schemas.unified_event import (
    UnifiedGridEventCreate,
    UnifiedGridEventResponse,
    CausalNode,
    EventCorrelationResponse
)
from app.websocket.manager import ws_manager


class EventBusService:
    """
    Manages publishing and correlation of all cyber-physical events.
    """

    def publish_event(self, event_in: UnifiedGridEventCreate, db: Session) -> GridEvent:
        """
        Publishes a new grid event to the event bus, persists to database,
        and constructs causal links.
        """
        event_id = f"EVT-CP-{uuid.uuid4().hex[:8].upper()}"
        
        grid_evt = GridEvent(
            event_id=event_id,
            timestamp=datetime.utcnow(),
            event_type=event_in.event_type.value if hasattr(event_in.event_type, "value") else str(event_in.event_type),
            source_asset=event_in.source_asset,
            affected_assets=event_in.affected_assets or [],
            severity=event_in.severity.upper(),
            cause=event_in.cause,
            parent_event_id=event_in.parent_event_id,
            simulation_id=event_in.simulation_id,
            data_source=event_in.data_source or "GRIDSEC_EVENT_BUS",
            payload=event_in.payload or {}
        )
        
        db.add(grid_evt)
        db.commit()
        db.refresh(grid_evt)

        # Notify active WebSocket clients
        try:
            import asyncio
            payload = {
                "type": "GRID_EVENT_PUBLISHED",
                "event_id": grid_evt.event_id,
                "event_type": grid_evt.event_type,
                "source_asset": grid_evt.source_asset,
                "affected_assets": grid_evt.affected_assets or [],
                "severity": grid_evt.severity,
                "cause": grid_evt.cause,
                "parent_event_id": grid_evt.parent_event_id,
                "simulation_id": grid_evt.simulation_id,
                "cascade_id": (grid_evt.payload or {}).get("cascade_id"),
                "depth": (grid_evt.payload or {}).get("depth", 0),
                "data_source": grid_evt.data_source,
                "timestamp": grid_evt.timestamp.isoformat(),
                "payload": grid_evt.payload or {}
            }
            # Asynchronous safe dispatch if event loop is running
            try:
                loop = asyncio.get_running_loop()
                if loop and loop.is_running():
                    asyncio.create_task(ws_manager.broadcast_json(payload))
            except RuntimeError:
                pass
        except Exception:
            pass

        return grid_evt

    def get_recent_events(
        self,
        db: Session,
        limit: int = 50,
        simulation_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves recent unified grid events."""
        query = db.query(GridEvent)
        if simulation_id:
            query = query.filter(GridEvent.simulation_id == simulation_id)
        else:
            query = query.filter(GridEvent.simulation_id == None)  # Live events
            
        events = query.order_by(GridEvent.timestamp.desc()).limit(limit).all()
        return [
            {
                "event_id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type,
                "source_asset": e.source_asset,
                "affected_assets": e.affected_assets or [],
                "severity": e.severity,
                "cause": e.cause,
                "parent_event_id": e.parent_event_id,
                "simulation_id": e.simulation_id,
                "data_source": e.data_source,
                "payload": e.payload or {}
            }
            for e in events
        ]

    def get_event_by_id(self, event_id: str, db: Session) -> Optional[GridEvent]:
        """Looks up a specific event by ID."""
        return db.query(GridEvent).filter(GridEvent.event_id == event_id).first()

    def get_causal_tree(self, event_id: str, db: Session) -> Optional[CausalNode]:
        """
        Recursively builds the downstream causal consequence tree starting from a root event.
        """
        root = db.query(GridEvent).filter(GridEvent.event_id == event_id).first()
        if not root:
            return None

        def _build_tree(evt: GridEvent) -> CausalNode:
            children = db.query(GridEvent).filter(GridEvent.parent_event_id == evt.event_id).all()
            return CausalNode(
                event_id=evt.event_id,
                event_type=evt.event_type,
                source_asset=evt.source_asset,
                severity=evt.severity,
                timestamp=evt.timestamp.isoformat(),
                cause=evt.cause,
                children=[_build_tree(c) for c in children]
            )

        return _build_tree(root)

    def correlate_event(self, event_in: UnifiedGridEventCreate, db: Session) -> EventCorrelationResponse:
        """
        Event Correlation Service Interface.
        Determines whether a new event is causally or topologically related
        to an existing active incident or cascading failure chain.
        """
        src = event_in.source_asset
        affected = set(event_in.affected_assets or [])
        affected.add(src)

        # 1. Check for active incident with matching assets
        active_incident = db.query(Incident).filter(
            Incident.status.in_(["DETECTED", "INVESTIGATING", "CONTAINED"]),
            Incident.source_asset_id.in_(list(affected))
        ).first()

        # 2. Check for active cascade
        active_cascade = db.query(Cascade).filter(Cascade.status == "ACTIVE").first()

        if active_incident:
            return EventCorrelationResponse(
                related=True,
                incident_id=active_incident.incident_id,
                cascade_id=active_cascade.cascade_id if active_cascade else None,
                confidence=0.88,
                correlation_reason=f"Event directly impacts {src}, which matches active security incident {active_incident.incident_id}."
            )

        if active_cascade:
            return EventCorrelationResponse(
                related=True,
                incident_id=None,
                cascade_id=active_cascade.cascade_id,
                confidence=0.72,
                correlation_reason=f"Event coincides with active cascading failure chain {active_cascade.cascade_id}."
            )

        return EventCorrelationResponse(
            related=False,
            incident_id=None,
            cascade_id=None,
            confidence=0.15,
            correlation_reason="Isolated event; no correlating active incident or cascade detected."
        )


event_bus_service = EventBusService()

"""
Cascading Failure Tracking & Multi-Hop Chain Service for GRIDSEC
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.event import Cascade, CascadeEvent, GridEvent
from app.schemas.cascade import CascadeSummary, CascadeDetail, CascadeEventStep


class CascadeService:
    """
    Manages lifecycle, sequence steps, and propagation depth of cascading events.
    """

    def create_cascade(
        self,
        root_event_id: str,
        simulation_id: Optional[str],
        summary: str,
        impacted_capacity_mw: float,
        db: Session
    ) -> Cascade:
        """Initializes a new cascading failure tracking entity."""
        cascade_id = f"CAS-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
        cascade = Cascade(
            cascade_id=cascade_id,
            simulation_id=simulation_id,
            root_event_id=root_event_id,
            current_depth=1,
            status="ACTIVE",
            started_at=datetime.utcnow(),
            summary=summary,
            impacted_capacity_mw=impacted_capacity_mw
        )
        db.add(cascade)
        db.commit()
        db.refresh(cascade)

        # Record root event as sequence #1
        first_step = CascadeEvent(
            cascade_id=cascade_id,
            event_id=root_event_id,
            parent_event_id=None,
            depth=1,
            sequence_number=1
        )
        db.add(first_step)
        db.commit()

        return cascade

    def record_step(
        self,
        cascade_id: str,
        event_id: str,
        parent_event_id: Optional[str],
        depth: int,
        db: Session
    ) -> Optional[CascadeEvent]:
        """Adds a sequential multi-hop event to an active cascade."""
        cascade = db.query(Cascade).filter(Cascade.cascade_id == cascade_id).first()
        if not cascade:
            return None

        # Determine sequence number
        last_step = db.query(CascadeEvent).filter(
            CascadeEvent.cascade_id == cascade_id
        ).order_by(CascadeEvent.sequence_number.desc()).first()

        next_seq = (last_step.sequence_number + 1) if last_step else 1

        step = CascadeEvent(
            cascade_id=cascade_id,
            event_id=event_id,
            parent_event_id=parent_event_id,
            depth=depth,
            sequence_number=next_seq
        )
        db.add(step)

        if depth > cascade.current_depth:
            cascade.current_depth = depth

        db.commit()
        db.refresh(step)
        return step

    def list_cascades(
        self,
        db: Session,
        limit: int = 20,
        simulation_id: Optional[str] = None
    ) -> List[CascadeSummary]:
        """Lists active and historical cascading failure records."""
        query = db.query(Cascade)
        if simulation_id:
            query = query.filter(Cascade.simulation_id == simulation_id)
            
        cascades = query.order_by(Cascade.started_at.desc()).limit(limit).all()
        results = []
        for c in cascades:
            event_count = db.query(CascadeEvent).filter(CascadeEvent.cascade_id == c.cascade_id).count()
            results.append(CascadeSummary(
                cascade_id=c.cascade_id,
                simulation_id=c.simulation_id,
                root_event_id=c.root_event_id,
                current_depth=c.current_depth,
                status=c.status,
                started_at=c.started_at.isoformat(),
                completed_at=c.completed_at.isoformat() if c.completed_at else None,
                total_events=event_count,
                impacted_capacity_mw=c.impacted_capacity_mw or 0.0,
                summary=c.summary
            ))
        return results

    def get_cascade_detail(self, cascade_id: str, db: Session) -> Optional[CascadeDetail]:
        """Retrieves full cascade detail with step sequence."""
        cascade = db.query(Cascade).filter(Cascade.cascade_id == cascade_id).first()
        if not cascade:
            return None

        steps_db = db.query(CascadeEvent).filter(
            CascadeEvent.cascade_id == cascade_id
        ).order_by(CascadeEvent.sequence_number.asc()).all()

        steps: List[CascadeEventStep] = []
        for s in steps_db:
            evt = db.query(GridEvent).filter(GridEvent.event_id == s.event_id).first()
            steps.append(CascadeEventStep(
                event_id=s.event_id,
                parent_event_id=s.parent_event_id,
                event_type=evt.event_type if evt else "UNKNOWN",
                source_asset=evt.source_asset if evt else "UNKNOWN",
                severity=evt.severity if evt else "HIGH",
                depth=s.depth,
                sequence_number=s.sequence_number,
                timestamp=evt.timestamp.isoformat() if evt else datetime.utcnow().isoformat()
            ))

        return CascadeDetail(
            cascade_id=cascade.cascade_id,
            simulation_id=cascade.simulation_id,
            root_event_id=cascade.root_event_id,
            current_depth=cascade.current_depth,
            status=cascade.status,
            started_at=cascade.started_at.isoformat(),
            completed_at=cascade.completed_at.isoformat() if cascade.completed_at else None,
            total_events=len(steps),
            impacted_capacity_mw=cascade.impacted_capacity_mw or 0.0,
            summary=cascade.summary,
            events=steps
        )


cascade_service = CascadeService()

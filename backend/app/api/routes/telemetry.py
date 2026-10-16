"""
Telemetry API Routes.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.telemetry_service import telemetry_service

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/national", summary="Get real-time national power grid telemetry metrics")
def get_national_telemetry(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return telemetry_service.get_national_telemetry_snapshot(db)


@router.get("/{asset_id}", summary="Get real-time telemetry snapshot for a specific asset")
def get_asset_telemetry(asset_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    telemetry = telemetry_service.generate_asset_telemetry(db, asset_id)
    if not telemetry:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")
    return telemetry

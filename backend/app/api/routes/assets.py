"""
Asset Management, Pincode Geographic Inspection, and Multi-Key Search API Routes.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.grid_service import grid_service

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", summary="Get all grid assets")
def get_assets(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    return grid_service.search_assets(db)


@router.get("/search", summary="Search assets via Multi-Key Hash Table Index (O(1))")
def search_assets(
    q: Optional[str] = Query(None, description="General search query (Name, City, ID)"),
    pincode: Optional[str] = Query(None, description="Exact or prefix pincode"),
    state: Optional[str] = Query(None, description="State name"),
    district: Optional[str] = Query(None, description="District name"),
    operator: Optional[str] = Query(None, description="Operator ID / Name (e.g. PGCIL, NTPC, ADANI)"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Executes an instant indexed search across multiple dimensions (Pincode, District, State, Operator).
    """
    return grid_service.search_assets(
        db=db,
        query=q,
        pincode=pincode,
        state=state,
        district=district,
        operator=operator
    )


@router.get("/pincode/{pincode}/power-flow", summary="Inspect all transformers and complete power transfer within a geographic pincode")
def get_pincode_power_transfer(pincode: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Calculates geographic transformer bays, step-down voltage transformation stages,
    and bulk transmission inflows/outflows within the specified pincode.
    """
    result = grid_service.get_pincode_power_flow(db, pincode)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=result.get("message", f"Pincode '{pincode}' not found."))
    return result


@router.get("/{asset_id}", summary="Get asset detail with full transformer bays and telemetry")
def get_asset_detail(asset_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    asset = grid_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset with ID '{asset_id}' not found.")
    return asset

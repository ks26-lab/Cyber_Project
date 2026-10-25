"""
GRIDSEC — Daily Load Scheduling API Routes
Dedicated module for Review 1: Priority-Aware Power Deficit Scheduler Using DSA.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Query

from app.services.daily_scheduler import (
    load_file_records,
    validate_schedule_records,
    execute_daily_schedule,
    rank_focus_cities_for_hour,
    assess_transmission_outage,
    generate_schedule_csv,
    generate_sample_review1_records,
    CITY_TO_BUS_INDIA_59,
    CITY_TO_BUS_IEEE_30,
)

router = APIRouter(prefix="/scheduling", tags=["Daily Load Scheduling (Review 1)"])

# In-memory storage of the latest active schedule results for session export
_CURRENT_SCHEDULE_RESULT: Optional[Dict[str, Any]] = None


class OutageAnalysisRequest(BaseModel):
    focus_city: str = Field(..., description="Focus city to analyze")
    tripped_branch: str = Field(..., description="Transmission corridor identifier to trip")
    active_network: str = Field("INDIA_GRID_59", description="Active network model (INDIA_GRID_59 or IEEE_30)")


class DirectRecordsRequest(BaseModel):
    records: List[Dict[str, Any]] = Field(..., description="List of raw load records")


@router.post("/upload", summary="Upload and Schedule Daily Load Excel/CSV Workbook")
async def upload_schedule_workbook(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Accepts an uploaded .xlsx or .csv workbook, validates schema, ranges, priorities,
    and executes the Review 1 DSA Priority and Greedy Least-Served scheduling algorithm.
    """
    global _CURRENT_SCHEDULE_RESULT
    filename = file.filename or "uploaded_workbook.xlsx"

    if not (filename.lower().endswith(".xlsx") or filename.lower().endswith(".csv")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an Excel workbook (.xlsx) or CSV (.csv) file."
        )

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        raw_records = load_file_records(content, filename)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read file: {str(e)}"
        )

    validated_records, validation_errors = validate_schedule_records(raw_records)
    if validation_errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Dataset validation failed. Please correct the errors listed below.",
                "errors": validation_errors[:25]  # Limit to first 25 errors for clarity
            }
        )

    schedule_res = execute_daily_schedule(validated_records)
    schedule_res["source_filename"] = filename

    # Compute focus ranking for first reporting hour
    if schedule_res["reporting_hours"]:
        first_hour = schedule_res["reporting_hours"][0]
        schedule_res["initial_focus_ranking"] = rank_focus_cities_for_hour(
            schedule_res["hourly_results"][first_hour]
        )

    _CURRENT_SCHEDULE_RESULT = schedule_res
    return schedule_res


@router.get("/sample", summary="Load Bundled 24-Hour Review 1 Dataset")
def load_sample_dataset() -> Dict[str, Any]:
    """
    Loads the bundled 24-hour Review 1 test dataset based on `power_load_input(1).xlsx`.
    Allows immediate testing and verification without manual file upload.
    """
    global _CURRENT_SCHEDULE_RESULT
    records = generate_sample_review1_records()
    validated_records, errors = validate_schedule_records(records)
    if errors:
        raise HTTPException(status_code=500, detail=f"Sample dataset validation error: {errors}")

    schedule_res = execute_daily_schedule(validated_records)
    schedule_res["source_filename"] = "power_load_input(1).xlsx (Bundled Benchmark)"

    # Compute focus ranking for peak deficit hour (Hour 19) or first hour
    target_hour = 19 if 19 in schedule_res["reporting_hours"] else schedule_res["reporting_hours"][0]
    schedule_res["initial_focus_ranking"] = rank_focus_cities_for_hour(
        schedule_res["hourly_results"][target_hour]
    )
    schedule_res["recommended_initial_hour"] = target_hour

    _CURRENT_SCHEDULE_RESULT = schedule_res
    return schedule_res


@router.get("/rank-hour/{hour}", summary="Get Deterministic Focus-City Ranking for Selected Hour")
def get_focus_ranking_for_hour(hour: int) -> Dict[str, Any]:
    """
    Returns the deterministic focus-city ranking and plain-English reasons for a specific hour.
    Lexicographic order: (1) Unmet critical load, (2) Unmet demand, (3) Service %, (4) Priority.
    """
    global _CURRENT_SCHEDULE_RESULT
    if not _CURRENT_SCHEDULE_RESULT or "hourly_results" not in _CURRENT_SCHEDULE_RESULT:
        # Load sample dataset if none active
        load_sample_dataset()

    hourly_dict = _CURRENT_SCHEDULE_RESULT.get("hourly_results", {})
    if hour not in hourly_dict:
        raise HTTPException(status_code=404, detail=f"Hour {hour} not found in active schedule.")

    ranked_cities = rank_focus_cities_for_hour(hourly_dict[hour])
    return {
        "success": True,
        "hour": hour,
        "hour_summary": {
            "total_demand_kw": hourly_dict[hour]["total_demand_kw"],
            "available_supply_kw": hourly_dict[hour]["available_supply_kw"],
            "total_allocated_kw": hourly_dict[hour]["total_allocated_kw"],
            "total_unmet_kw": hourly_dict[hour]["total_unmet_kw"],
            "jains_fairness_index": hourly_dict[hour]["jains_fairness_index"],
            "deficit_cities_count": hourly_dict[hour]["deficit_cities_count"],
            "critical_shortfall_count": hourly_dict[hour]["critical_shortfall_count"]
        },
        "ranked_focus_cities": ranked_cities
    }


@router.post("/outage-impact", summary="Topological Transmission Branch Contingency Analysis")
def analyze_outage_impact(req: OutageAnalysisRequest) -> Dict[str, Any]:
    """
    Analyzes the reachability and candidate alternate routes for a focus city
    during a simulated transmission corridor outage.
    """
    return assess_transmission_outage(
        focus_city=req.focus_city,
        tripped_branch=req.tripped_branch,
        active_network=req.active_network
    )


@router.get("/export-csv", summary="Download Calculated Daily Load Schedule as CSV")
def export_schedule_csv() -> Response:
    """
    Generates and returns the calculated scheduling results as a downloadable CSV.
    """
    global _CURRENT_SCHEDULE_RESULT
    if not _CURRENT_SCHEDULE_RESULT or "schedule_table" not in _CURRENT_SCHEDULE_RESULT:
        load_sample_dataset()

    csv_content = generate_schedule_csv(_CURRENT_SCHEDULE_RESULT)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=\"daily_load_schedule.csv\""
        }
    )


@router.get("/mappings", summary="List Documented City-to-Bus Network Mappings")
def get_verified_mappings() -> Dict[str, Any]:
    """
    Returns the documented, verified city-to-bus mappings for India 59-Node Grid and IEEE 30-bus.
    """
    return {
        "success": True,
        "india_grid_59": CITY_TO_BUS_INDIA_59,
        "ieee_30": CITY_TO_BUS_IEEE_30
    }

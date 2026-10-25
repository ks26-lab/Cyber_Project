"""
Unified FastAPI Router for GRID//ZERO:
- Authoritative Simulation Session State & Transactional Actions
- 13-Algorithm Explainable DSA Catalog & Step-by-Step Traces
- 8-Stage CAPER Engine & 4 Restoration Baselines
- 7 Campaign Missions & Human-vs-Algorithm Challenge Arena
- Multi-Seed Scientific Research Benchmark Suite
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.power.power_flow_service import power_flow_service
from app.dsa.algorithms_catalog import GridDSACatalog
from app.simulation.session_manager import session_manager
from app.simulation.missions import MissionService
from app.experiments.runner import experiment_runner


router = APIRouter(prefix="/gridzero", tags=["GRID//ZERO Platform"])


class SessionResetRequest(BaseModel):
    session_id: Optional[str] = None
    network_id: str = "TRAINING_FEEDER"
    mission_id: Optional[str] = None
    seed: int = 42
    source_capacity_limit_mw: Optional[float] = None


class SessionActionRequest(BaseModel):
    session_id: Optional[str] = None
    action_type: str = Field(
        ...,
        description="CLOSE_SWITCH, OPEN_SWITCH, INJECT_FAULT, ISOLATE_BRANCH, RESTORE_BRANCH, SET_BATTERY, CURTAIL_LOAD, SET_SOURCE_LIMIT, ADVANCE_TIME",
    )
    target_id: str
    value: Optional[float] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)


class ApplyPlanRequest(BaseModel):
    session_id: Optional[str] = None
    algorithm: str = "CAPER"
    switching_budget: int = 5


class RunAlgorithmRequest(BaseModel):
    session_id: Optional[str] = None
    network_id: Optional[str] = None
    algorithm_id: str = "BFS"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class RunRestorationRequest(BaseModel):
    session_id: Optional[str] = None
    switching_budget: int = 5


class RunExperimentRequest(BaseModel):
    preset_id: str = "EXP_FAST_VERIFY"
    network_id: Optional[str] = None
    num_trials: Optional[int] = None
    base_seed: Optional[int] = None
    source_capacity_limit_mw: Optional[float] = None
    switching_budget: Optional[int] = None


@router.get("/networks")
def list_supported_networks() -> Dict[str, Any]:
    return {
        "networks": [
            {
                "id": "TRAINING_FEEDER",
                "name": "GRID//ZERO Urban 12-Bus Distribution Feeder (33/11 kV)",
                "bus_count": 12,
                "switch_count": 4,
                "battery_count": 2,
                "mode": "DISTRIBUTION_CITY_3D",
                "solver_provenance": "AC_SOLVED",
            },
            {
                "id": "IEEE_33_DISTRIBUTION",
                "name": "IEEE 33-Bus Baran & Wu Radial Distribution Benchmark (12.66 kV)",
                "bus_count": 33,
                "switch_count": 5,
                "battery_count": 2,
                "mode": "BENCHMARK_DISTRIBUTION_3D",
                "solver_provenance": "AC_SOLVED",
            },
            {
                "id": "IEEE_30",
                "name": "IEEE 30-Bus Transmission Benchmark (132/33 kV)",
                "bus_count": 30,
                "switch_count": 0,
                "battery_count": 0,
                "mode": "TRANSMISSION_BENCHMARK",
                "solver_provenance": "AC_SOLVED",
            },
            {
                "id": "INDIA_GRID_59",
                "name": "Indian National Grid 59-Substation Reference Model (765/400/220 kV)",
                "bus_count": 59,
                "switch_count": 0,
                "battery_count": 0,
                "mode": "NATIONAL_BULK_GRID",
                "solver_provenance": "AC_SOLVED",
            },
        ]
    }


@router.get("/session")
def get_session(
    session_id: Optional[str] = Query(None),
    network_id: str = Query("TRAINING_FEEDER"),
) -> Dict[str, Any]:
    state = session_manager.get_or_create_session(session_id=session_id, network_id=network_id)
    net_data = power_flow_service.get_network_topology(state.network_id)
    return {
        "session": state.model_dump(),
        "topology": {
            "buses": [b.model_dump() for b in net_data["buses"]],
            "lines": [l.model_dump() for l in net_data["lines"]],
            "generators": [g.model_dump() for g in net_data["generators"]],
            "loads": [ld.model_dump() for ld in net_data["loads"]],
            "transformers": [t.model_dump() for t in net_data.get("transformers", [])],
        },
    }


@router.post("/session/reset")
def reset_session(req: SessionResetRequest) -> Dict[str, Any]:
    if req.mission_id:
        started = MissionService.start_mission(
            mission_id=req.mission_id,
            session_id=req.session_id,
            seed=req.seed,
        )
        net_data = power_flow_service.get_network_topology(started["session"]["network_id"])
        return {
            **started,
            "topology": {
                "buses": [b.model_dump() for b in net_data["buses"]],
                "lines": [l.model_dump() for l in net_data["lines"]],
                "generators": [g.model_dump() for g in net_data["generators"]],
                "loads": [ld.model_dump() for ld in net_data["loads"]],
                "transformers": [t.model_dump() for t in net_data.get("transformers", [])],
            },
        }

    state = session_manager.reset_session(
        session_id=req.session_id,
        network_id=req.network_id,
        mission_id=req.mission_id,
        seed=req.seed,
        source_capacity_limit_mw=req.source_capacity_limit_mw,
    )
    net_data = power_flow_service.get_network_topology(state.network_id)
    return {
        "session": state.model_dump(),
        "topology": {
            "buses": [b.model_dump() for b in net_data["buses"]],
            "lines": [l.model_dump() for l in net_data["lines"]],
            "generators": [g.model_dump() for g in net_data["generators"]],
            "loads": [ld.model_dump() for ld in net_data["loads"]],
            "transformers": [t.model_dump() for t in net_data.get("transformers", [])],
        },
    }


@router.post("/session/action")
def apply_session_action(req: SessionActionRequest) -> Dict[str, Any]:
    state = session_manager.apply_action(
        session_id=req.session_id,
        action_type=req.action_type,
        target_id=req.target_id,
        value=req.value,
        parameters=req.parameters,
    )
    eval_result = None
    if state.mission_id:
        eval_result = MissionService.evaluate_session(state.mission_id, state)
    return {
        "session": state.model_dump(),
        "evaluation": eval_result,
    }


@router.post("/session/undo")
def undo_session_action(session_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    state = session_manager.undo(session_id=session_id)
    eval_result = None
    if state.mission_id:
        eval_result = MissionService.evaluate_session(state.mission_id, state)
    return {
        "session": state.model_dump(),
        "evaluation": eval_result,
    }


@router.post("/session/apply-plan")
def apply_restoration_plan(req: ApplyPlanRequest) -> Dict[str, Any]:
    result = session_manager.apply_restoration_plan(
        session_id=req.session_id,
        algorithm=req.algorithm,
        switching_budget=req.switching_budget,
    )
    session_obj = session_manager.get_or_create_session(session_id=req.session_id)
    if session_obj.mission_id:
        result["evaluation"] = MissionService.evaluate_session(session_obj.mission_id, session_obj)
    return result


@router.get("/algorithms")
def list_dsa_algorithms() -> Dict[str, Any]:
    return {
        "count": len(GridDSACatalog.CATALOG_METADATA),
        "algorithms": GridDSACatalog.CATALOG_METADATA,
    }


@router.post("/algorithms/run")
def run_dsa_algorithm(req: RunAlgorithmRequest) -> Dict[str, Any]:
    if req.network_id:
        state = session_manager.get_or_create_session(session_id=req.session_id, network_id=req.network_id)
    else:
        state = session_manager.get_or_create_session(session_id=req.session_id)
    trace = session_manager.run_dsa_algorithm(
        algorithm_id=req.algorithm_id,
        session_id=state.session_id,
        parameters=req.parameters,
    )
    return {
        "algorithm_id": req.algorithm_id.upper(),
        "network_id": state.network_id,
        "trace": trace,
    }


@router.post("/restoration/caper")
def run_caper_restoration(req: RunRestorationRequest) -> Dict[str, Any]:
    return session_manager.run_caper(
        session_id=req.session_id,
        switching_budget=req.switching_budget,
    )


@router.post("/restoration/compare")
def compare_restoration_algorithms(req: RunRestorationRequest) -> Dict[str, Any]:
    return session_manager.compare_restoration_algorithms(
        session_id=req.session_id,
        switching_budget=req.switching_budget,
    )


@router.get("/missions")
def list_missions() -> Dict[str, Any]:
    missions = [m.model_dump() for m in MissionService.list_missions()]
    return {"count": len(missions), "missions": missions}


@router.get("/missions/{mission_id}")
def get_mission_details(mission_id: str) -> Dict[str, Any]:
    mission = MissionService.get_mission(mission_id)
    return {"mission": mission.model_dump()}


@router.post("/missions/{mission_id}/start")
def start_mission(
    mission_id: str,
    session_id: Optional[str] = Query(None),
    seed: int = Query(42),
) -> Dict[str, Any]:
    started = MissionService.start_mission(mission_id=mission_id, session_id=session_id, seed=seed)
    net_data = power_flow_service.get_network_topology(started["session"]["network_id"])
    return {
        **started,
        "topology": {
            "buses": [b.model_dump() for b in net_data["buses"]],
            "lines": [l.model_dump() for l in net_data["lines"]],
            "generators": [g.model_dump() for g in net_data["generators"]],
            "loads": [ld.model_dump() for ld in net_data["loads"]],
            "transformers": [t.model_dump() for t in net_data.get("transformers", [])],
        },
    }


@router.post("/missions/{mission_id}/evaluate")
def evaluate_mission(
    mission_id: str,
    session_id: Optional[str] = Query(None),
) -> Dict[str, Any]:
    state = session_manager.get_or_create_session(session_id=session_id)
    evaluation = MissionService.evaluate_session(mission_id, state)
    return {"evaluation": evaluation, "session": state.model_dump()}


@router.post("/challenge/compare")
def compare_human_vs_algorithms(session_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    return MissionService.compare_human_vs_algorithms(session_id=session_id)


@router.get("/research/presets")
def get_research_presets() -> Dict[str, Any]:
    return {
        "presets": [p.model_dump() for p in experiment_runner.list_presets()],
        "runs": experiment_runner.list_runs(),
    }


@router.post("/research/run")
def run_research_benchmark(req: RunExperimentRequest) -> Dict[str, Any]:
    res = experiment_runner.run_experiment(
        preset_id=req.preset_id,
        network_id=req.network_id,
        num_trials=req.num_trials,
        base_seed=req.base_seed,
        source_capacity_limit_mw=req.source_capacity_limit_mw,
        switching_budget=req.switching_budget,
    )
    return {"run": res.model_dump()}


@router.get("/research/runs")
def list_research_runs() -> Dict[str, Any]:
    return {"runs": experiment_runner.list_runs()}


@router.get("/research/runs/{run_id}")
def get_research_run(run_id: str) -> Dict[str, Any]:
    run = experiment_runner.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Experiment run {run_id} not found")
    return {"run": run.model_dump()}


@router.get("/research/runs/{run_id}/export-csv")
def export_research_run_csv(run_id: str) -> PlainTextResponse:
    csv_text = experiment_runner.export_run_csv(run_id)
    if not csv_text:
        raise HTTPException(status_code=404, detail=f"Experiment run {run_id} not found")
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{run_id}.csv"'},
    )


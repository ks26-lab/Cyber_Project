"""HTTP facade for GRID COMMAND; all game mutations are server validated."""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.simulation.grid_command import grid_command_engine, GameError, LEVELS
from dataclasses import asdict

router = APIRouter(prefix="/grid-command", tags=["GRID COMMAND"])
class StartRequest(BaseModel):
    level: int = Field(1, ge=1, le=5)
    seed: int = Field(42, ge=0, le=2147483647)
class ActionRequest(BaseModel):
    game_id: str
    version: int
    action: str
    target: str = ""
    value: Optional[float] = None
class RevisionRequest(BaseModel):
    game_id: str
    version: int
class GameRequest(BaseModel):
    game_id: str
class HintRequest(GameRequest):
    algorithm: str = "CAPER"

def call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except GameError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

@router.get("/levels")
def levels():
    return {"levels": [asdict(level) for level in LEVELS]}
@router.post("/start")
def start(req: StartRequest):
    return call(grid_command_engine.start, req.level, req.seed)
@router.get("/state/{game_id}")
def state(game_id: str):
    return call(grid_command_engine.state, game_id)
@router.post("/action")
def action(req: ActionRequest):
    return call(grid_command_engine.action, **req.model_dump())
@router.post("/undo")
def undo(req: RevisionRequest):
    return call(grid_command_engine.undo, **req.model_dump())
@router.post("/hint")
def hint(req: HintRequest):
    return call(grid_command_engine.hint, req.game_id, req.algorithm)
@router.post("/compare")
def compare(req: GameRequest):
    return call(grid_command_engine.compare, req.game_id)
@router.post("/replay")
def replay(req: GameRequest):
    return call(grid_command_engine.replay, req.game_id)

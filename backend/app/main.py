"""
GRIDSEC — Power Grid Cybersecurity & Resilience Platform
FastAPI Backend Application Root
"""
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import engine, SessionLocal, db_mode
from app.models.base import Base
from app.models.asset import Asset
from app.ingestion.india_grid_importer import run_ingestion
from app.services.grid_service import grid_service
from app.services.telemetry_service import telemetry_service
from app.websocket.manager import ws_manager

# API Routers
from app.api.routes.grid import router as grid_router
from app.api.routes.assets import router as assets_router
from app.api.routes.telemetry import router as telemetry_router
from app.api.routes.events import router as events_router
from app.api.routes.incidents import router as incidents_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.simulation import router as simulation_router
from app.api.routes.power_flow import router as power_flow_router
from app.api.routes.aegis import router as aegis_router
from app.api.routes.cascades import router as cascades_router
from app.api.routes.cyber import router as cyber_router
from app.api.routes.scheduling import router as scheduling_router
from app.api.routes.gridzero import router as gridzero_router

logger = logging.getLogger("gridsec.main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


async def telemetry_broadcaster_task():
    """Background task to broadcast real-time physics-driven telemetry snapshots to WebSocket clients."""
    logger.info("Starting live grid telemetry WebSocket broadcast loop...")
    while True:
        try:
            await asyncio.sleep(2.0)
            if ws_manager.active_connections:
                db = SessionLocal()
                try:
                    national_data = telemetry_service.get_national_telemetry_snapshot(db)
                    await ws_manager.broadcast_json({
                        "type": "NATIONAL_TELEMETRY_TICK",
                        "event_type": "TELEMETRY_SAMPLE_TICK",
                        "data": national_data
                    })
                finally:
                    db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in telemetry broadcast task: {e}")
            await asyncio.sleep(5.0)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown logic."""
    logger.info("Initializing GRIDSEC Power Grid Resilience Engine...")
    Base.metadata.create_all(bind=engine)

    # Verify if database is populated, if not, run auto-ingestion
    db = SessionLocal()
    try:
        asset_count = db.query(Asset).count()
        if asset_count == 0:
            logger.info("Database is empty. Triggering initial India Grid data ingestion...")
            run_ingestion()
        else:
            logger.info(f"Database contains {asset_count} power grid assets. Ready.")
        
        # Pre-load topology into DSA graph and Hash Index
        grid_service.load_topology(db, force_reload=True)
        logger.info(f"Loaded {len(grid_service.graph.nodes)} nodes and {len(grid_service.graph.edges)} transmission lines into DSA Graph.")
    finally:
        db.close()

    # Start WebSocket background streaming
    broadcast_task = asyncio.create_task(telemetry_broadcaster_task())

    yield

    # Shutdown
    broadcast_task.cancel()
    logger.info("GRIDSEC platform shutdown complete.")


app = FastAPI(
    title="GRIDSEC — Power Grid Cybersecurity & Resilience API",
    description="Full Data Architecture & DSA Engine for Indian National Power Grid Security Monitoring, Cascading Blast Radius Analysis (BFS), and Dynamic Transmission Rerouting (Dijkstra).",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React and local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(grid_router, prefix="/api")
app.include_router(assets_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(power_flow_router, prefix="/api")
app.include_router(aegis_router, prefix="/api")
app.include_router(cascades_router, prefix="/api")
app.include_router(cyber_router, prefix="/api")
app.include_router(scheduling_router, prefix="/api")
app.include_router(gridzero_router, prefix="/api")


@app.get("/api/health", summary="Health Check and Database Status")
def health_check() -> Dict[str, Any]:
    return {
        "status": "HEALTHY",
        "service": "GRIDSEC Power Grid Resilience Backend",
        "version": "1.0.0",
        "database_mode": db_mode,
        "graph_nodes_loaded": len(grid_service.graph.nodes),
        "graph_edges_loaded": len(grid_service.graph.edges)
    }


# Character Asset Servicing (Grid Operator & Hacker)
from fastapi.responses import FileResponse, Response
import shutil
from pathlib import Path

OPERATOR_IMG_PATH = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png")
HACKER_IMG_PATH = Path(r"C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png")

def _sync_character_images():
    try:
        dest_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "images"
        dest_dir.mkdir(parents=True, exist_ok=True)
        if OPERATOR_IMG_PATH.exists() and not (dest_dir / "grid_operator.png").exists():
            shutil.copy(OPERATOR_IMG_PATH, dest_dir / "grid_operator.png")
        if HACKER_IMG_PATH.exists() and not (dest_dir / "hacker.png").exists():
            shutil.copy(HACKER_IMG_PATH, dest_dir / "hacker.png")
    except Exception as e:
        logger.warning(f"Could not auto-sync character assets to assets/images: {e}")

_sync_character_images()

@app.get("/api/character-image/{character_id}", summary="Serve Character Portrait Image")
def get_character_image(character_id: str):
    cid = character_id.lower()
    dest_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "images"
    
    if cid in ["operator", "grid_operator", "mentor"]:
        local_copy = dest_dir / "grid_operator.png"
        if local_copy.exists():
            return FileResponse(str(local_copy), media_type="image/png")
        if OPERATOR_IMG_PATH.exists():
            return FileResponse(str(OPERATOR_IMG_PATH), media_type="image/png")
    elif cid in ["hacker", "antagonist"]:
        local_copy = dest_dir / "hacker.png"
        if local_copy.exists():
            return FileResponse(str(local_copy), media_type="image/png")
        if HACKER_IMG_PATH.exists():
            return FileResponse(str(HACKER_IMG_PATH), media_type="image/png")
    return Response(status_code=404, content="Character image not found")


@app.websocket("/ws/grid")
async def websocket_grid_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time SCADA telemetry ticks, cyber incidents, and topological events.
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial connection handshake
        await ws_manager.send_personal_message(
            {
                "type": "CONNECTION_ESTABLISHED",
                "message": "Connected to GRIDSEC Real-Time Power Grid Security Stream",
                "frequencyStandard": "IEGC 50.00 Hz"
            },
            websocket
        )
        while True:
            # Keep connection open and receive optional client messages
            data = await websocket.receive_text()
            logger.debug(f"Received client message: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@app.websocket("/ws/aegis")
async def websocket_aegis_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time Aegis AI Situation Assessments,
    Cascading Failure propagation updates, and Operator Decision Support alerts.
    """
    await ws_manager.connect(websocket)
    try:
        await ws_manager.send_personal_message(
            {
                "type": "AEGIS_FEED_CONNECTED",
                "message": "Connected to Aegis AI Real-Time Cyber-Physical Situation Awareness Feed",
                "engineStatus": "ACTIVE_MONITORING"
            },
            websocket
        )
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received Aegis client message: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"Aegis WebSocket error: {e}")
        ws_manager.disconnect(websocket)


# Mount Static Files for direct frontend access
from fastapi.staticfiles import StaticFiles
from pathlib import Path

frontend_dir = Path(__file__).resolve().parent.parent.parent
if (frontend_dir / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


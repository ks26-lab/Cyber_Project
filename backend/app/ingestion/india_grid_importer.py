"""
India Power Grid Data Ingestion Module.
Parses js/data/indiaGridData.js (grounded in CEA, POWERGRID, Grid-India reference dataset),
creates database tables if they do not exist, and idempotently imports all assets,
transformer bays, transmission corridors, grid connections, and energy firms.
"""
import os
import json
import subprocess
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.database.connection import engine, SessionLocal
from app.models.base import Base
from app.models.asset import Asset, TransformerBay, EnergyFirm
from app.models.transmission import TransmissionLine, GridConnection

logger = logging.getLogger("gridsec.ingestion")
logging.basicConfig(level=logging.INFO)


def extract_grid_data_from_js(js_file_path: str) -> Dict[str, Any]:
    """
    Extracts the INDIA_GRID_DATA object from indiaGridData.js.
    Uses pure Python parsing first (zero external dependencies), falling back to Node.js if available.
    """
    if not os.path.exists(js_file_path):
        raise FileNotFoundError(f"Could not find source grid data at: {js_file_path}")

    # Primary: Pure Python parsing (No Node.js dependency required)
    try:
        with open(js_file_path, "r", encoding="utf-8") as f:
            content = f.read()

        start_marker = "const INDIA_GRID_DATA = "
        idx = content.find(start_marker)
        if idx != -1:
            json_candidate = content[idx + len(start_marker):].strip()
            # Find the closing object brace before export statements
            last_brace_idx = json_candidate.rfind("};")
            if last_brace_idx != -1:
                json_candidate = json_candidate[:last_brace_idx + 1]
            return json.loads(json_candidate)
    except Exception as py_err:
        logger.warning(f"Pure Python extraction failed ({py_err}). Trying Node.js fallback...")

    # Fallback: Node.js runtime if installed
    try:
        node_script = f"""
        global.window = {{}};
        const fs = require('fs');
        const content = fs.readFileSync({json.dumps(js_file_path)}, 'utf8');
        eval(content);
        const data = window.INDIA_GRID_DATA;
        process.stdout.write(JSON.stringify(data));
        """
        res = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, check=True)
        return json.loads(res.stdout)
    except Exception as node_err:
        logger.error(f"Failed to extract grid data via Node.js: {node_err}")
        raise RuntimeError(f"Could not extract INDIA_GRID_DATA from {js_file_path}: {node_err}")


def seed_database(data: Dict[str, Any], db: Session) -> Dict[str, int]:
    """
    Idempotently seeds SQLite / PostgreSQL with assets, firms, transformer bays, and corridors.
    """
    # 1. Operators / Energy Firms
    operators_data: List[Dict[str, Any]] = data.get("operators", [])
    firms_count = 0
    for op in operators_data:
        existing = db.query(EnergyFirm).filter(EnergyFirm.firm_id == op["id"]).first()
        if not existing:
            firm = EnergyFirm(
                firm_id=op["id"],
                name=op.get("name", ""),
                short_name=op.get("shortName", ""),
                firm_type=op.get("firmType", ""),
                category=op.get("category", "central_govt"),
                hq=op.get("hq", ""),
                founded_year=int(op["founded"]) if str(op.get("founded", "")).isdigit() else None,
                description=op.get("description", ""),
                circuit_km=str(op.get("circuitKm", "")),
                capacity_mw=float(op.get("interstateCapacityMW", 0.0) or 0.0),
                color=op.get("color", "#166534"),
                badge_class=op.get("badgeClass", "badge-forest"),
                data_source="CEA_PGCIL_REFERENCE",
                source_url="js/data/indiaGridData.js"
            )
            db.add(firm)
            firms_count += 1

    db.commit()

    # 2. Nodes / Assets & Transformers
    nodes_data: List[Dict[str, Any]] = data.get("nodes", [])
    assets_count = 0
    transformers_count = 0

    for n in nodes_data:
        aid = n["id"]
        existing_asset = db.query(Asset).filter(Asset.asset_id == aid).first()
        if not existing_asset:
            asset = Asset(
                asset_id=aid,
                name=n.get("name", ""),
                asset_type=n.get("type", "SUBSTATION").upper(),
                voltage_kv=n.get("voltage", ""),
                capacity_mw=float(n.get("capacityMW", 0.0) or 0.0),
                current_mw=float(n.get("currentMW", 0.0) or 0.0),
                region=n.get("region", "NR"),
                state=n.get("state", ""),
                district=n.get("district", ""),
                city=n.get("city", ""),
                pincode=str(n.get("pincode", "")),
                postal_office=n.get("postalOffice", ""),
                latitude=float(n.get("lat", 0.0) or 0.0),
                longitude=float(n.get("lon", 0.0) or 0.0),
                status=str(n.get("status", "HEALTHY")).upper(),
                security_status="SECURE",
                risk_score=15.0 if str(n.get("status", "")).lower() == "compromised" else 5.0,
                operator=n.get("operator", ""),
                operator_id=n.get("operatorId", "PGCIL"),
                operator_ids=n.get("operatorIds", []),
                ownership_type=n.get("ownershipType", "govt_central"),
                notes=n.get("notes", ""),
                data_source="CEA_PGCIL_REFERENCE",
                source_url="js/data/indiaGridData.js"
            )
            db.add(asset)
            assets_count += 1
            db.flush()

        # Add Transformer Bays
        for xfmr in n.get("transformers", []):
            xid = xfmr.get("id")
            if not xid:
                continue
            existing_xfmr = db.query(TransformerBay).filter(TransformerBay.transformer_id == xid).first()
            if not existing_xfmr:
                tb = TransformerBay(
                    transformer_id=xid,
                    asset_id=aid,
                    name=xfmr.get("name", ""),
                    transformer_type=xfmr.get("type", "ICT"),
                    rating_mva=float(xfmr.get("ratingMVA", 0.0) or 0.0),
                    primary_kv=float(xfmr.get("primaryKV", 0.0) or 0.0),
                    secondary_kv=float(xfmr.get("secondaryKV", 0.0) or 0.0),
                    cooling=xfmr.get("cooling", "ONAF"),
                    load_percent=float(xfmr.get("loadPercent", 0.0) or 0.0),
                    oil_temp_c=float(xfmr.get("oilTempC", 0.0) or 0.0),
                    winding_temp_c=float(xfmr.get("windingTempC", 0.0) or 0.0),
                    dga_status=xfmr.get("dgaStatus", "Normal"),
                    tap_position=int(xfmr.get("tapPosition", 9) or 9),
                    status=str(xfmr.get("status", "HEALTHY")).upper(),
                    data_source="CEA_PGCIL_REFERENCE"
                )
                db.add(tb)
                transformers_count += 1

    db.commit()

    # 3. Transmission Corridors & Grid Connections
    corridors_data: List[Dict[str, Any]] = data.get("corridors", [])
    corridors_count = 0
    connections_count = 0

    for c in corridors_data:
        cid = c["id"]
        from_id = c.get("from")
        to_id = c.get("to")
        if not from_id or not to_id:
            continue

        existing_line = db.query(TransmissionLine).filter(TransmissionLine.line_id == cid).first()
        if not existing_line:
            line = TransmissionLine(
                line_id=cid,
                name=c.get("name", f"Line {from_id} - {to_id}"),
                source_asset_id=from_id,
                destination_asset_id=to_id,
                voltage_kv=c.get("voltage", ""),
                line_type=c.get("type", "765kV_AC"),
                length_km=float(c.get("distanceKm", 100.0) or 100.0),
                capacity_mw=float(c.get("capacityMW", 1000.0) or 1000.0),
                current_flow_mw=float(c.get("currentFlowMW", 0.0) or 0.0),
                status=str(c.get("status", "HEALTHY")).upper(),
                direction=c.get("direction", "Bidirectional"),
                operator=c.get("operator", "POWERGRID"),
                operator_id=c.get("operatorId", "PGCIL"),
                operator_ids=c.get("operatorIds", []),
                ownership_type=c.get("ownershipType", "govt_central"),
                data_source="CEA_PGCIL_REFERENCE"
            )
            db.add(line)
            corridors_count += 1

        # Seed bidirectional graph connection
        conn_fwd = db.query(GridConnection).filter(
            GridConnection.source_asset_id == from_id,
            GridConnection.destination_asset_id == to_id
        ).first()
        if not conn_fwd:
            db.add(GridConnection(
                source_asset_id=from_id,
                destination_asset_id=to_id,
                connection_type=c.get("type", "765KV_AC"),
                weight_distance_km=float(c.get("distanceKm", 100.0) or 100.0),
                weight_impedance_ohms=max(0.1, round(float(c.get("distanceKm", 100.0) or 100.0) * 0.025, 2)),
                weight_capacity_headroom=max(50.0, float(c.get("capacityMW", 1000.0) or 1000.0) - float(c.get("currentFlowMW", 0.0) or 0.0)),
                weight_risk_factor=5.0 if str(c.get("status", "")).lower() == "compromised" else 1.0,
                status="ACTIVE" if str(c.get("status", "")).lower() != "disconnected" else "BLOCKED",
                data_source="CEA_PGCIL_REFERENCE"
            ))
            connections_count += 1

        conn_rev = db.query(GridConnection).filter(
            GridConnection.source_asset_id == to_id,
            GridConnection.destination_asset_id == from_id
        ).first()
        if not conn_rev:
            db.add(GridConnection(
                source_asset_id=to_id,
                destination_asset_id=from_id,
                connection_type=c.get("type", "765KV_AC"),
                weight_distance_km=float(c.get("distanceKm", 100.0) or 100.0),
                weight_impedance_ohms=max(0.1, round(float(c.get("distanceKm", 100.0) or 100.0) * 0.025, 2)),
                weight_capacity_headroom=max(50.0, float(c.get("capacityMW", 1000.0) or 1000.0) - float(c.get("currentFlowMW", 0.0) or 0.0)),
                weight_risk_factor=5.0 if str(c.get("status", "")).lower() == "compromised" else 1.0,
                status="ACTIVE" if str(c.get("status", "")).lower() != "disconnected" else "BLOCKED",
                data_source="CEA_PGCIL_REFERENCE"
            ))
            connections_count += 1

    db.commit()

    return {
        "firms": firms_count,
        "assets": assets_count,
        "transformers": transformers_count,
        "corridors": corridors_count,
        "connections": connections_count
    }


def run_ingestion():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    js_path = os.path.join(project_root, "js", "data", "indiaGridData.js")

    logger.info(f"Loading grid data from {js_path}...")
    data = extract_grid_data_from_js(js_path)

    db = SessionLocal()
    try:
        counts = seed_database(data, db)
        logger.info(f"Ingestion successful! Added: {counts}")
    finally:
        db.close()


if __name__ == "__main__":
    run_ingestion()

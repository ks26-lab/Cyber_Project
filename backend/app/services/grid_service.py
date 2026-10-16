"""
Grid Service.
Loads network topology from the database into the DSA GridGraph in-memory structure
and manages graph querying, filtering, and multi-key indexing.
"""
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from app.models.asset import Asset, TransformerBay, EnergyFirm
from app.models.transmission import TransmissionLine, GridConnection
from app.dsa.graph import GridGraph, GraphNode, GraphEdge
from app.dsa.hashing import AssetIndexTable


class GridService:
    def __init__(self):
        self.graph: GridGraph = GridGraph()
        self.index_table: AssetIndexTable = AssetIndexTable()
        self._is_loaded: bool = False

    def load_topology(self, db: Session, force_reload: bool = False):
        """
        Populates in-memory Graph and Hash Index Table from database models.
        """
        if self._is_loaded and not force_reload:
            return

        self.graph.clear()
        self.index_table.clear()

        # 1. Fetch Assets
        assets = db.query(Asset).all()
        for a in assets:
            # Add to graph
            node = GraphNode(
                id=a.asset_id,
                name=a.name,
                type=a.asset_type,
                capacity_mw=a.capacity_mw or 0.0,
                current_mw=a.current_mw or 0.0,
                voltage_kv=a.voltage_kv or "",
                latitude=a.latitude or 0.0,
                longitude=a.longitude or 0.0,
                state=a.state or "",
                district=a.district or "",
                pincode=a.pincode or "",
                operator=a.operator or a.operator_id or "PGCIL",
                status=a.status or "HEALTHY",
                cyber_risk_score=a.risk_score or 0.0,
                metadata={
                    "city": a.city,
                    "region": a.region,
                    "postal_office": a.postal_office,
                    "operator_ids": a.operator_ids,
                    "ownership_type": a.ownership_type,
                    "security_status": a.security_status
                }
            )
            self.graph.add_node(node)

            # Add to hash index table
            self.index_table.insert_asset({
                "id": a.asset_id,
                "name": a.name,
                "type": a.asset_type,
                "voltage": a.voltage_kv,
                "capacityMW": a.capacity_mw,
                "currentMW": a.current_mw,
                "state": a.state,
                "district": a.district,
                "city": a.city,
                "pincode": a.pincode,
                "postalOffice": a.postal_office,
                "region": a.region,
                "operator": a.operator or a.operator_id,
                "operatorId": a.operator_id,
                "operatorIds": a.operator_ids or [],
                "ownershipType": a.ownership_type,
                "status": a.status,
                "securityStatus": a.security_status,
                "lat": a.latitude,
                "lon": a.longitude,
                "cyberRiskScore": a.risk_score
            })

        # 2. Fetch Transmission Lines / Edges
        lines = db.query(TransmissionLine).all()
        for line in lines:
            edge = GraphEdge(
                id=line.line_id,
                source_id=line.source_asset_id,
                target_id=line.destination_asset_id,
                distance_km=line.length_km or 100.0,
                capacity_mw=line.capacity_mw or 1000.0,
                current_flow_mw=line.current_flow_mw or 0.0,
                voltage_kv=line.voltage_kv or "",
                status=line.status or "HEALTHY",
                direction=line.direction or "Bidirectional",
                operator=line.operator_id or "PGCIL"
            )
            self.graph.add_edge(edge)

        self._is_loaded = True

    def get_full_network(self, db: Session) -> Dict[str, Any]:
        self.load_topology(db)
        
        assets = db.query(Asset).all()
        lines = db.query(TransmissionLine).all()
        firms = db.query(EnergyFirm).all()

        return {
            "assets_count": len(assets),
            "lines_count": len(lines),
            "firms_count": len(firms),
            "assets": [
                {
                    "id": a.asset_id,
                    "name": a.name,
                    "type": a.asset_type,
                    "city": a.city,
                    "district": a.district,
                    "state": a.state,
                    "pincode": a.pincode,
                    "postalOffice": a.postal_office,
                    "region": a.region,
                    "lat": a.latitude,
                    "lon": a.longitude,
                    "voltage": a.voltage_kv,
                    "capacityMW": a.capacity_mw,
                    "currentMW": a.current_mw,
                    "status": a.status,
                    "securityStatus": a.security_status,
                    "riskScore": a.risk_score,
                    "operator": a.operator,
                    "operatorId": a.operator_id,
                    "operatorIds": a.operator_ids,
                    "ownershipType": a.ownership_type,
                    "notes": a.notes,
                    "transformersCount": len(a.transformers),
                    "dataSource": a.data_source,
                    "lastVerified": a.last_verified.isoformat() if a.last_verified else None
                }
                for a in assets
            ],
            "lines": [
                {
                    "id": l.line_id,
                    "name": l.name,
                    "from": l.source_asset_id,
                    "to": l.destination_asset_id,
                    "type": l.line_type,
                    "voltage": l.voltage_kv,
                    "distanceKm": l.length_km,
                    "capacityMW": l.capacity_mw,
                    "currentFlowMW": l.current_flow_mw,
                    "status": l.status,
                    "direction": l.direction,
                    "operator": l.operator,
                    "operatorId": l.operator_id,
                    "operatorIds": l.operator_ids,
                    "ownershipType": l.ownership_type,
                    "dataSource": l.data_source
                }
                for l in lines
            ],
            "firms": [
                {
                    "id": f.firm_id,
                    "name": f.name,
                    "shortName": f.short_name,
                    "firmType": f.firm_type,
                    "category": f.category,
                    "hq": f.hq,
                    "founded": f.founded_year,
                    "description": f.description,
                    "color": f.color,
                    "badgeClass": f.badge_class,
                    "circuitKm": f.circuit_km,
                    "interstateCapacityMW": f.capacity_mw,
                    "dataSource": f.data_source
                }
                for f in firms
            ]
        }

    def get_asset_by_id(self, db: Session, asset_id: str) -> Optional[Dict[str, Any]]:
        a = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not a:
            return None
        
        return {
            "id": a.asset_id,
            "name": a.name,
            "type": a.asset_type,
            "city": a.city,
            "district": a.district,
            "state": a.state,
            "pincode": a.pincode,
            "postalOffice": a.postal_office,
            "region": a.region,
            "lat": a.latitude,
            "lon": a.longitude,
            "voltage": a.voltage_kv,
            "capacityMW": a.capacity_mw,
            "currentMW": a.current_mw,
            "status": a.status,
            "securityStatus": a.security_status,
            "riskScore": a.risk_score,
            "operator": a.operator,
            "operatorId": a.operator_id,
            "operatorIds": a.operator_ids,
            "ownershipType": a.ownership_type,
            "notes": a.notes,
            "dataSource": a.data_source,
            "lastVerified": a.last_verified.isoformat() if a.last_verified else None,
            "transformers": [
                {
                    "id": t.transformer_id,
                    "name": t.name,
                    "type": t.transformer_type,
                    "ratingMVA": t.rating_mva,
                    "primaryKV": t.primary_kv,
                    "secondaryKV": t.secondary_kv,
                    "cooling": t.cooling,
                    "loadPercent": t.load_percent,
                    "oilTempC": t.oil_temp_c,
                    "windingTempC": t.winding_temp_c,
                    "tapPosition": t.tap_position,
                    "dgaStatus": t.dga_status,
                    "status": t.status,
                    "dataSource": t.data_source
                }
                for t in a.transformers
            ]
        }

    def search_assets(self, db: Session, query: Optional[str] = None, pincode: Optional[str] = None, state: Optional[str] = None, district: Optional[str] = None, operator: Optional[str] = None) -> List[Dict[str, Any]]:
        self.load_topology(db)

        if pincode:
            return self.index_table.search_by_pincode(pincode)
        if state:
            return self.index_table.search_by_state(state)
        if district:
            return self.index_table.search_by_district(district)
        if operator:
            return self.index_table.search_by_operator(operator)
        if query:
            return self.index_table.general_search(query)

        return list(self.index_table.by_id.values())

    def get_pincode_power_flow(self, db: Session, pincode: str) -> Dict[str, Any]:
        """
        Calculates complete power transformation and corridor power transfer for a geographic pincode.
        """
        clean_pin = str(pincode).strip()
        matched_assets = db.query(Asset).filter(Asset.pincode == clean_pin).all()
        if not matched_assets:
            # Fallback search if partial match
            matched_assets = db.query(Asset).filter(Asset.pincode.like(f"%{clean_pin}%")).all()

        if not matched_assets:
            return {
                "pincode": clean_pin,
                "found": False,
                "message": f"No power grid facilities found in pincode '{clean_pin}'",
                "assets": [],
                "transformers": [],
                "inflow_corridors": [],
                "outflow_corridors": [],
                "total_transformation_mva": 0.0,
                "total_inflow_mw": 0.0,
                "total_outflow_mw": 0.0
            }

        asset_ids = [a.asset_id for a in matched_assets]

        # 1. Collect all transformer bays in this pincode
        transformers_list = []
        total_mva = 0.0
        total_transformer_mw = 0.0

        for a in matched_assets:
            for t in a.transformers:
                load_pct = t.load_percent or 75.0
                rating_mva = t.rating_mva or 1000.0
                active_mva = round(rating_mva * (load_pct / 100.0), 1)
                active_mw = round(active_mva * 0.95, 1) # Standard power factor 0.95
                total_mva += rating_mva
                total_transformer_mw += active_mw

                transformers_list.append({
                    "id": t.transformer_id,
                    "name": t.name,
                    "type": t.transformer_type,
                    "substationId": a.asset_id,
                    "substationName": a.name,
                    "ratingMVA": rating_mva,
                    "primaryKV": t.primary_kv,
                    "secondaryKV": t.secondary_kv,
                    "stepDownRatio": f"{t.primary_kv:.0f}kV → {t.secondary_kv:.0f}kV",
                    "loadPercent": load_pct,
                    "activeThroughputMVA": active_mva,
                    "activeThroughputMW": active_mw,
                    "oilTempC": t.oil_temp_c or 52.0,
                    "windingTempC": t.winding_temp_c or 62.0,
                    "dgaStatus": t.dga_status or "Normal",
                    "tapPosition": t.tap_position or 9,
                    "cooling": t.cooling or "ONAF",
                    "status": t.status or "HEALTHY"
                })

        # 2. Inflow transmission corridors
        inflow_lines = db.query(TransmissionLine).filter(TransmissionLine.destination_asset_id.in_(asset_ids)).all()
        inflow_corridors = [
            {
                "id": l.line_id,
                "name": l.name,
                "sourceId": l.source_asset_id,
                "targetId": l.destination_asset_id,
                "type": l.line_type,
                "voltage": l.voltage_kv,
                "capacityMW": l.capacity_mw,
                "currentFlowMW": l.current_flow_mw,
                "status": l.status,
                "direction": l.direction
            }
            for l in inflow_lines
        ]
        total_inflow_mw = sum(l.current_flow_mw or 0.0 for l in inflow_lines)

        # 3. Outflow transmission corridors
        outflow_lines = db.query(TransmissionLine).filter(TransmissionLine.source_asset_id.in_(asset_ids)).all()
        outflow_corridors = [
            {
                "id": l.line_id,
                "name": l.name,
                "sourceId": l.source_asset_id,
                "targetId": l.destination_asset_id,
                "type": l.line_type,
                "voltage": l.voltage_kv,
                "capacityMW": l.capacity_mw,
                "currentFlowMW": l.current_flow_mw,
                "status": l.status,
                "direction": l.direction
            }
            for l in outflow_lines
        ]
        total_outflow_mw = sum(l.current_flow_mw or 0.0 for l in outflow_lines)

        primary_asset = matched_assets[0]

        # Step-down flow stages explanation
        voltages = set()
        for t in transformers_list:
            voltages.add(f"{t['primaryKV']:.0f}kV")
            voltages.add(f"{t['secondaryKV']:.0f}kV")
        sorted_voltages = sorted(list(voltages), key=lambda x: -float(x.replace("kV", "")))

        return {
            "pincode": clean_pin,
            "found": True,
            "postalOffice": primary_asset.postal_office,
            "district": primary_asset.district,
            "state": primary_asset.state,
            "region": primary_asset.region,
            "operator": primary_asset.operator,
            "operatorId": primary_asset.operator_id,
            "latitude": primary_asset.latitude,
            "longitude": primary_asset.longitude,
            "assetsCount": len(matched_assets),
            "assets": [
                {
                    "id": a.asset_id,
                    "name": a.name,
                    "type": a.asset_type,
                    "voltage": a.voltage_kv,
                    "capacityMW": a.capacity_mw,
                    "currentMW": a.current_mw,
                    "status": a.status,
                    "securityStatus": a.security_status,
                    "riskScore": a.risk_score
                }
                for a in matched_assets
            ],
            "transformersCount": len(transformers_list),
            "transformers": transformers_list,
            "totalTransformationMVA": total_mva,
            "totalTransformerActiveMW": total_transformer_mw,
            "totalInflowMW": total_inflow_mw,
            "totalOutflowMW": total_outflow_mw,
            "inflowCorridors": inflow_corridors,
            "outflowCorridors": outflow_corridors,
            "transformationStages": " → ".join(sorted_voltages) + " → Local Distribution Feeders",
            "nMinusOneReady": len(transformers_list) > 1,
            "efficiencyPercent": 99.1
        }


# Global singleton service
grid_service = GridService()


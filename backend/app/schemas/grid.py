"""
Pydantic Schemas for TransmissionLine, GridConnection, and Network Graph
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.schemas.asset import AssetResponseSchema, EnergyFirmSchema

class TransmissionLineSchema(BaseModel):
    id: Optional[int] = None
    line_id: str
    name: str
    source_asset_id: str
    destination_asset_id: str
    line_type: str
    voltage_kv: str
    capacity_mw: float
    current_flow_mw: float = 0.0
    length_km: float
    direction: Optional[str] = None
    status: str = "HEALTHY"
    operator: Optional[str] = None
    operator_id: Optional[str] = None
    operator_ids: List[str] = []
    ownership_type: str = "govt_central"
    data_source: str = "PROJECT_DATASET"

    class Config:
        from_attributes = True

class GridConnectionSchema(BaseModel):
    id: Optional[int] = None
    source_asset_id: str
    destination_asset_id: str
    connection_type: str
    weight_distance_km: float
    weight_impedance_ohms: float
    weight_capacity_headroom: float
    weight_risk_factor: float
    status: str = "ACTIVE"

    class Config:
        from_attributes = True

class NationalMetricsSchema(BaseModel):
    grid_frequency_hz: float = 50.002
    national_demand_mw: float = 242850.0
    total_generation_mw: float = 245400.0
    inter_regional_capacity_mw: float = 118250.0
    active_inter_regional_transfer_mw: float = 31450.0
    grid_standard: str = "IEGC 50.00 Hz (CERC / Grid-India)"
    active_alerts_count: int = 1
    hvdc_links_count: int = 10
    ac765_links_count: int = 22
    total_monitored_transformers: int = 240
    data_source: str = "PROJECT_DATASET"

class NetworkTopologyResponse(BaseModel):
    national_metrics: NationalMetricsSchema
    assets: List[AssetResponseSchema]
    transmission_lines: List[TransmissionLineSchema]
    operators: List[EnergyFirmSchema]
    total_nodes: int
    total_edges: int

"""
Pydantic Schemas for Asset, TransformerBay, and EnergyFirm
"""

from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class TransformerBaySchema(BaseModel):
    id: Optional[int] = None
    transformer_id: str
    asset_id: str
    name: str
    transformer_type: str
    rating_mva: float
    primary_kv: float
    secondary_kv: float
    cooling: Optional[str] = "ONAF"
    load_percent: float = 70.0
    oil_temp_c: float = 52.0
    winding_temp_c: float = 62.0
    tap_position: int = 9
    dga_status: str = "Normal"
    status: str = "HEALTHY"

    class Config:
        from_attributes = True

class AssetBaseSchema(BaseModel):
    asset_id: str
    name: str
    asset_type: str
    city: Optional[str] = None
    district: Optional[str] = None
    state: str
    pincode: Optional[str] = None
    postal_office: Optional[str] = None
    region: str
    latitude: float
    longitude: float
    capacity_mw: float = 0.0
    current_mw: float = 0.0
    voltage_kv: str
    status: str = "HEALTHY"
    security_status: str = "SECURE"
    risk_score: float = 0.0
    operator: Optional[str] = None
    operator_id: Optional[str] = None
    operator_ids: List[str] = []
    ownership_type: str = "govt_central"
    notes: Optional[str] = None
    data_source: str = "PROJECT_DATASET"

class AssetCreateSchema(AssetBaseSchema):
    pass

class AssetResponseSchema(AssetBaseSchema):
    id: int
    transformers: List[TransformerBaySchema] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EnergyFirmSchema(BaseModel):
    id: Optional[int] = None
    firm_id: str
    name: str
    short_name: str
    firm_type: str
    category: str
    hq: Optional[str] = None
    founded_year: Optional[int] = None
    description: Optional[str] = None
    color: str = "#166534"
    badge_class: str = "badge-forest"
    circuit_km: Optional[str] = None
    capacity_mw: float = 0.0

    class Config:
        from_attributes = True

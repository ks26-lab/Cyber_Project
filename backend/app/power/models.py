"""
GRIDSEC Electrical Power System Core Models, Results & Data Provenance Schemas.
Provides clean, strongly-typed bus-branch data entities, numerical physics parameters,
power balance tracking, and contingency analysis structures.
"""

from enum import Enum
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class DataClassification(str, Enum):
    """
    Standard Data Provenance Classification for electrical parameters.
    Guarantees transparent auditing between real publications, engineering defaults, and solver outputs.
    """
    REAL_REFERENCE = "REAL_REFERENCE"      # Grounded in official CEA, POWERGRID, POSOCO/Grid-India publications
    REPRESENTATIVE = "REPRESENTATIVE"      # Standard IEEE / CEA equipment benchmarks (e.g. ACSR conductor R/X)
    SIMULATED = "SIMULATED"                # Sensor telemetry emulation / measurement noise
    DERIVED = "DERIVED"                    # Direct algebraic calculation
    SOLVER_DERIVED = "SOLVER_DERIVED"      # Derived from numerical Newton-Raphson AC/DC power-flow solver
    MISSING = "MISSING"                    # Parameter unverified / absent from public registries


class BusType(str, Enum):
    """Standard Electrical Bus Classification for AC/DC Power Flow Solvers."""
    SLACK = "SLACK"  # Reference / Swing bus (V specified, Theta = 0 deg, balances P & Q mismatch)
    PV = "PV"        # Generator bus (Active power P & Voltage magnitude V specified)
    PQ = "PQ"        # Load / Substation bus (Active power P & Reactive power Q specified)


class ViolationType(str, Enum):
    """Physical Operating Constraint Violations."""
    VOLTAGE_UNDERVOLTAGE = "VOLTAGE_UNDERVOLTAGE"
    VOLTAGE_OVERVOLTAGE = "VOLTAGE_OVERVOLTAGE"
    LINE_OVERLOAD = "LINE_OVERLOAD"
    TRANSFORMER_OVERLOAD = "TRANSFORMER_OVERLOAD"
    GENERATOR_Q_LIMIT = "GENERATOR_Q_LIMIT"
    ISLAND_DETECTED = "ISLAND_DETECTED"


class DataProvenance(BaseModel):
    """Data provenance record attached to electrical entities and solver results."""
    data_source: str = Field(..., description="Source institution, database, or simulation engine")
    source_url: Optional[str] = Field(None, description="Reference publication or repository URL")
    source_date: Optional[str] = Field(None, description="Date of publication / execution")
    verification_status: str = Field("VERIFIED", description="VERIFIED, ESTIMATED, SOLVER_VALIDATED, or UNVERIFIED")
    data_classification: DataClassification = Field(..., description="Classification category")
    notes: Optional[str] = Field(None, description="Engineering commentary or benchmark assumption citations")


# -------------------------------------------------------------------------
# Electrical System Core Bus-Branch Entities
# -------------------------------------------------------------------------

class BusModel(BaseModel):
    """Electrical Node / Busbar entity with explicit numerical parameters."""
    bus_id: str = Field(..., description="Unique bus identifier e.g. BUS-1 or BUS-DEL-765")
    asset_id: Optional[str] = Field(None, description="Foreign key to physical Asset ID if applicable")
    name: str = Field(..., description="Descriptive bus name")
    voltage_kv: float = Field(..., gt=0.0, description="Base nominal voltage in kV (strictly > 0)")
    bus_type: BusType = Field(BusType.PQ, description="Bus type for solver formulation")
    
    # State quantities
    voltage_pu: float = Field(1.0, ge=0.5, le=1.5, description="Per-unit voltage magnitude |V|")
    voltage_angle: float = Field(0.0, description="Voltage phase angle in degrees (theta)")
    
    # Injections and withdrawals
    generation_P: float = Field(0.0, description="Scheduled / dispatched active generation (MW)")
    generation_Q: float = Field(0.0, description="Scheduled / dispatched reactive generation (MVAr)")
    load_P: float = Field(0.0, ge=0.0, description="Active load demand (MW)")
    load_Q: float = Field(0.0, description="Reactive load demand (MVAr)")
    
    status: str = Field("ONLINE", description="ONLINE, OUT_OF_SERVICE, ISOLATED")
    provenance: DataProvenance


class GeneratorModel(BaseModel):
    """Power Plant / Generator Unit Injection entity."""
    generator_id: str = Field(..., description="Unique generator identifier e.g. GEN-1")
    bus_id: str = Field(..., description="Busbar ID where generator injects power")
    asset_id: Optional[str] = Field(None, description="Parent power plant asset ID")
    name: str = Field(..., description="Generator unit description")
    fuel_type: str = Field("THERMAL", description="THERMAL, HYDRO, NUCLEAR, SOLAR, WIND, GAS")
    
    # Numerical operating limits
    Pmin: float = Field(0.0, ge=0.0, description="Minimum active power limit (MW)")
    Pmax: float = Field(..., gt=0.0, description="Maximum continuous active power limit (MW)")
    Qmin: float = Field(-200.0, description="Minimum reactive capability / under-excited limit (MVAr)")
    Qmax: float = Field(400.0, description="Maximum reactive capability / over-excited limit (MVAr)")
    
    current_P: float = Field(0.0, ge=0.0, description="Active power output (MW)")
    current_Q: float = Field(0.0, description="Reactive power output (MVAr)")
    voltage_setpoint_pu: float = Field(1.0, ge=0.8, le=1.2, description="Target terminal voltage magnitude (pu)")
    
    status: str = Field("ONLINE", description="ONLINE, TRIPPED, MAINTENANCE, MUST_RUN")
    provenance: DataProvenance


class LoadModel(BaseModel):
    """Electrical Demand / Load Withdrawal entity connected to an explicit Bus."""
    load_id: str = Field(..., description="Unique load identifier e.g. LOAD-1")
    bus_id: str = Field(..., description="Busbar ID where load is withdrawn")
    asset_id: Optional[str] = Field(None, description="Associated Substation / Load Center asset ID")
    name: str = Field(..., description="Load feeder description")
    
    P: float = Field(..., ge=0.0, description="Active power demand (MW)")
    Q: float = Field(0.0, description="Reactive power demand (MVAr)")
    load_type: str = Field("URBAN_DOMESTIC", description="URBAN_DOMESTIC, INDUSTRIAL, AGRICULTURAL, TRACTION")
    criticality: str = Field("MEDIUM", description="CRITICAL, HIGH, MEDIUM, LOW")
    
    status: str = Field("ONLINE", description="ONLINE, SHED, RESTRICTED")
    provenance: DataProvenance


class TransmissionLineModel(BaseModel):
    """AC Transmission Line Branch connecting two explicit Buses."""
    line_id: str = Field(..., description="Unique corridor identifier e.g. LINE-1-2")
    from_bus: str = Field(..., description="Source bus ID")
    to_bus: str = Field(..., description="Destination bus ID")
    name: str = Field(..., description="Transmission corridor name")
    
    voltage_kv: float = Field(..., gt=0.0, description="Operating voltage in kV")
    length_km: float = Field(..., ge=0.0, description="Physical transmission length in km")
    
    # Impedance parameters per km or total
    resistance_ohm: float = Field(..., ge=0.0, description="Total positive-sequence series resistance (Ohm)")
    reactance_ohm: float = Field(..., ge=0.0, description="Total positive-sequence series reactance (Ohm)")
    susceptance: float = Field(0.0, ge=0.0, description="Total positive-sequence shunt susceptance (uS)")
    r_ohm_per_km: Optional[float] = Field(None, description="Resistance per km (Ohm/km)")
    x_ohm_per_km: Optional[float] = Field(None, description="Reactance per km (Ohm/km)")
    b_microsiemens_per_km: Optional[float] = Field(None, description="Susceptance per km (uS/km)")
    
    thermal_limit_mw: float = Field(..., gt=0.0, description="Thermal / SIL transfer limit in MW")
    current_limit_ka: Optional[float] = Field(None, description="Maximum continuous current rating (kA)")
    
    # Solved electrical quantities
    current_flow_mw: float = Field(0.0, description="Solved active power flow (MW)")
    loading_percent: float = Field(0.0, ge=0.0, description="Calculated branch thermal loading %")
    losses_mw: Optional[float] = Field(None, description="Calculated I^2 * R active transmission loss in MW")
    
    status: str = Field("IN_SERVICE", description="IN_SERVICE, OUT_OF_SERVICE, OVERLOADED, DISCONNECTED")
    provenance: DataProvenance


class TransformerModel(BaseModel):
    """Two-Winding Step-Up / Step-Down / ICT Transformer connecting two explicit Buses."""
    transformer_id: str = Field(..., description="Unique transformer identifier e.g. XFMR-1-2")
    from_bus: str = Field(..., description="High-voltage primary bus ID")
    to_bus: str = Field(..., description="Low-voltage secondary bus ID")
    asset_id: Optional[str] = Field(None, description="Parent switchyard / substation asset ID")
    name: str = Field(..., description="Transformer bay name")
    
    rated_mva: float = Field(..., gt=0.0, description="Nameplate apparent power rating in MVA")
    primary_kv: float = Field(..., gt=0.0, description="Primary nominal voltage in kV")
    secondary_kv: float = Field(..., gt=0.0, description="Secondary nominal voltage in kV")
    
    impedance_percent: float = Field(14.0, gt=0.0, description="Short-circuit impedance percentage (vk%)")
    resistance_percent: float = Field(0.25, ge=0.0, description="Ohmic copper loss percentage (vkr%)")
    
    tap_position: int = Field(0, description="Current on-load tap changer (OLTC) position")
    tap_min: int = Field(-10, description="Minimum OLTC tap position")
    tap_max: int = Field(10, description="Maximum OLTC tap position")
    
    # Solved electrical quantities
    loading_percent: float = Field(0.0, ge=0.0, description="Transformer loading percentage (% MVA)")
    losses_mw: Optional[float] = Field(None, description="Core and winding copper loss in MW")
    
    status: str = Field("IN_SERVICE", description="IN_SERVICE, OUT_OF_SERVICE, OVERLOADED, TRIPPED")
    provenance: DataProvenance


# -------------------------------------------------------------------------
# Solved Output & Violation Schemas
# -------------------------------------------------------------------------

class BusResult(BaseModel):
    bus_id: str
    name: str
    voltage_kv: float
    voltage_pu: float
    voltage_angle_deg: float
    p_gen_mw: float = 0.0
    q_gen_mvar: float = 0.0
    p_load_mw: float = 0.0
    q_load_mvar: float = 0.0


class LineResult(BaseModel):
    line_id: str
    name: str
    from_bus: str
    to_bus: str
    p_from_mw: float
    q_from_mvar: float
    p_to_mw: float
    q_to_mvar: float
    pl_mw: float = Field(..., description="Active power I^2*R losses in MW")
    ql_mvar: float = Field(0.0, description="Reactive power losses in MVAr")
    loading_percent: float
    i_ka: float = 0.0
    status: str


class TransformerResult(BaseModel):
    transformer_id: str
    name: str
    from_bus: str
    to_bus: str
    p_hv_mw: float
    q_hv_mvar: float
    p_lv_mw: float
    q_lv_mvar: float
    pl_mw: float = Field(..., description="Transformer total loss (core + copper) in MW")
    ql_mvar: float = Field(0.0, description="Transformer reactive loss in MVAr")
    loading_percent: float
    i_hv_ka: float = 0.0
    i_lv_ka: float = 0.0
    tap_position: Optional[int] = 0
    tap_min: Optional[int] = -10
    tap_max: Optional[int] = 10
    status: str


# -------------------------------------------------------------------------
# Canonical Physical State Representation (Single Source of Truth)
# -------------------------------------------------------------------------

class BusPhysicalState(BaseModel):
    bus_id: str
    name: str
    voltage_kv: float
    voltage_pu: float
    voltage_angle_deg: float
    p_gen_mw: float = 0.0
    q_gen_mvar: float = 0.0
    p_load_mw: float = 0.0
    q_load_mvar: float = 0.0
    provenance: DataClassification = DataClassification.SOLVER_DERIVED


class LinePhysicalState(BaseModel):
    line_id: str
    name: str
    from_bus: str
    to_bus: str
    p_from_mw: float
    q_from_mvar: float
    p_to_mw: float
    q_to_mvar: float
    pl_mw: float
    ql_mvar: float
    loading_percent: float
    i_ka: float
    electrical_status: str = "IN_SERVICE"
    provenance: DataClassification = DataClassification.SOLVER_DERIVED


class TransformerPhysicalState(BaseModel):
    transformer_id: str
    name: str
    from_bus: str
    to_bus: str
    p_hv_mw: float
    q_hv_mvar: float
    p_lv_mw: float
    q_lv_mvar: float
    pl_mw: float
    ql_mvar: float
    loading_percent: float
    i_hv_ka: float
    i_lv_ka: float
    electrical_status: str = "IN_SERVICE"
    provenance: DataClassification = DataClassification.SOLVER_DERIVED


class PhysicalState(BaseModel):
    """Canonical simulation physical state object (Single Source of Truth)."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    simulation_id: str = "BASE_CASE"
    network_id: str = "TEST_NETWORK"
    status: str = "SOLVED" # SOLVED, DIVERGED, ISOLATED
    buses: Dict[str, BusPhysicalState] = {}
    lines: Dict[str, LinePhysicalState] = {}
    transformers: Dict[str, TransformerPhysicalState] = {}
    total_generation_mw: float = 0.0
    total_load_mw: float = 0.0
    total_line_losses_mw: float = 0.0
    total_transformer_losses_mw: float = 0.0
    total_losses_mw: float = 0.0
    power_balance_error_mw: float = 0.0
    active_violations: List["Violation"] = []
    islands: List[List[str]] = []
    provenance: DataProvenance


class PowerBalance(BaseModel):
    """Detailed energy conservation balance verified by solver."""
    total_generation_mw: float
    total_load_mw: float
    total_losses_mw: float
    balance_error_mw: float = Field(..., description="Calculated mismatch: |Gen - (Load + Losses)| in MW")
    total_q_generation_mvar: float
    total_q_load_mvar: float
    total_q_losses_mvar: float
    slack_bus_id: str
    slack_p_mw: float
    slack_q_mvar: float
    converged: bool
    iterations: int
    tolerance: float = 1e-5


class Violation(BaseModel):
    """Operating limit violation detected by physics engine."""
    violation_type: ViolationType
    element_id: str
    element_type: str # BUS, LINE, TRANSFORMER, GENERATOR
    value: float
    threshold: float
    unit: str
    severity: str # CRITICAL, WARNING
    description: str


class PowerFlowResult(BaseModel):
    """Complete, strongly-typed Newton-Raphson AC power flow solution."""
    status: str # SUCCESS, DIVERGED, VALIDATION_ERROR
    message: str
    network_id: str
    scenario_id: str = "BASE_CASE"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    buses: List[BusResult] = []
    lines: List[LineResult] = []
    transformers: List[TransformerResult] = []
    generators: List[GeneratorModel] = []
    power_balance: PowerBalance
    violations: List[Violation] = []
    execution_time_ms: float = 0.0
    solver_backend: str = "pandapower_3.5.4 (Newton-Raphson AC Load Flow)"
    provenance: DataProvenance

    def to_canonical_physical_state(self) -> PhysicalState:
        """Converts solver output into the canonical PhysicalState object."""
        bus_dict = {
            b.bus_id: BusPhysicalState(
                bus_id=b.bus_id,
                name=b.name,
                voltage_kv=b.voltage_kv,
                voltage_pu=b.voltage_pu,
                voltage_angle_deg=b.voltage_angle_deg,
                p_gen_mw=b.p_gen_mw,
                q_gen_mvar=b.q_gen_mvar,
                p_load_mw=b.p_load_mw,
                q_load_mvar=b.q_load_mvar,
                provenance=DataClassification.SOLVER_DERIVED
            )
            for b in self.buses
        }
        line_dict = {
            l.line_id: LinePhysicalState(
                line_id=l.line_id,
                name=l.name,
                from_bus=l.from_bus,
                to_bus=l.to_bus,
                p_from_mw=l.p_from_mw,
                q_from_mvar=l.q_from_mvar,
                p_to_mw=l.p_to_mw,
                q_to_mvar=l.q_to_mvar,
                pl_mw=l.pl_mw,
                ql_mvar=l.ql_mvar,
                loading_percent=l.loading_percent,
                i_ka=l.i_ka,
                electrical_status=l.status,
                provenance=DataClassification.SOLVER_DERIVED
            )
            for l in self.lines
        }
        xfmr_dict = {
            t.transformer_id: TransformerPhysicalState(
                transformer_id=t.transformer_id,
                name=t.name,
                from_bus=t.from_bus,
                to_bus=t.to_bus,
                p_hv_mw=t.p_hv_mw,
                q_hv_mvar=t.q_hv_mvar,
                p_lv_mw=t.p_lv_mw,
                q_lv_mvar=t.q_lv_mvar,
                pl_mw=t.pl_mw,
                ql_mvar=t.ql_mvar,
                loading_percent=t.loading_percent,
                i_hv_ka=t.i_hv_ka,
                i_lv_ka=t.i_lv_ka,
                electrical_status=t.status,
                provenance=DataClassification.SOLVER_DERIVED
            )
            for t in self.transformers
        }
        total_line_loss = round(sum(l.pl_mw for l in self.lines), 3)
        total_trafo_loss = round(sum(t.pl_mw for t in self.transformers), 3)

        return PhysicalState(
            timestamp=self.timestamp,
            simulation_id=self.scenario_id,
            network_id=self.network_id,
            status=self.status,
            buses=bus_dict,
            lines=line_dict,
            transformers=xfmr_dict,
            total_generation_mw=self.power_balance.total_generation_mw if self.power_balance else 0.0,
            total_load_mw=self.power_balance.total_load_mw if self.power_balance else 0.0,
            total_line_losses_mw=total_line_loss,
            total_transformer_losses_mw=total_trafo_loss,
            total_losses_mw=self.power_balance.total_losses_mw if self.power_balance else (total_line_loss + total_trafo_loss),
            power_balance_error_mw=self.power_balance.balance_error_mw if self.power_balance else 0.0,
            active_violations=self.violations,
            provenance=self.provenance
        )


class PowerFlowRequest(BaseModel):
    """Execution request for electrical AC power flow."""
    network_id: str = Field("TEST_NETWORK", description="Network identifier: TEST_NETWORK or INDIA_GRID_59")
    scenario_id: Optional[str] = Field("BASE_CASE", description="Scenario label or simulation ID")
    algorithm: Optional[str] = Field("nr", description="Solver algorithm: nr (Newton-Raphson), dc, fdbx")
    enforce_q_lims: Optional[bool] = Field(True, description="Enforce generator reactive power boundaries")


class PowerFlowResponse(PowerFlowResult):
    """Alias for PowerFlowResult for backwards API compatibility."""
    pass


class ContingencyResult(BaseModel):
    """N-1 Contingency simulation comparing baseline vs post-trip electrical state."""
    simulation_id: str
    tripped_asset_id: str
    tripped_asset_type: str # LINE, TRANSFORMER, GENERATOR, BUS
    status: str # SOLVED, DIVERGED_VOLTAGE_COLLAPSE, ISOLATED
    
    baseline_summary: Dict[str, Any]
    contingency_summary: Dict[str, Any]
    
    delta_losses_mw: float
    delta_max_loading_percent: float
    
    new_violations: List[Violation] = []
    generated_events: List[Dict[str, Any]] = []
    islands_detected: List[List[str]] = []
    electrical_differences: Dict[str, Any] = {}
    physical_state: Optional[PhysicalState] = None
    
    execution_time_ms: float = 0.0
    provenance: DataProvenance




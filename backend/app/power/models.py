"""
GRIDSEC Electrical Power System Core Models, Results & Data Provenance Schemas.
Provides clean, strongly-typed bus-branch data entities, numerical physics parameters,
power balance tracking, and contingency analysis structures.
"""

from enum import Enum
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


class DataClassification(str, Enum):
    """
    Standard Data Provenance Classification for electrical parameters.
    Guarantees transparent auditing between real publications, engineering defaults, and solver outputs.
    """
    REAL_REFERENCE = "REAL_REFERENCE"          # Grounded in official CEA, POWERGRID, POSOCO/Grid-India publications
    REPRESENTATIVE = "REPRESENTATIVE"          # Standard IEEE / CEA equipment benchmarks (e.g. ACSR conductor R/X)
    BENCHMARK_STANDARD = "BENCHMARK_STANDARD"  # Published IEEE / MATPOWER standard benchmark test cases
    SIMULATED = "SIMULATED"                    # Sensor telemetry emulation / measurement noise
    DERIVED = "DERIVED"                        # Direct algebraic calculation
    SOLVER_DERIVED = "SOLVER_DERIVED"          # Derived from numerical Newton-Raphson AC/DC power-flow solver
    MISSING = "MISSING"                        # Parameter unverified / absent from public registries
    # GRID//ZERO strict provenance classifications (Section 8.6)
    AC_SOLVED = "AC_SOLVED"
    APPROXIMATE_MODEL = "APPROXIMATE_MODEL"
    SYNTHETIC_TELEMETRY = "SYNTHETIC_TELEMETRY"
    REFERENCE_DATA = "REFERENCE_DATA"
    PRECOMPUTED_DEMO = "PRECOMPUTED_DEMO"
    SOLVER_UNAVAILABLE = "SOLVER_UNAVAILABLE"


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
    GENERATOR_P_LIMIT = "GENERATOR_P_LIMIT"
    SOURCE_CAPACITY_EXCEEDED = "SOURCE_CAPACITY_EXCEEDED"
    BATTERY_SOC_VIOLATION = "BATTERY_SOC_VIOLATION"
    RADIALITY_VIOLATION = "RADIALITY_VIOLATION"
    SOLVER_DIVERGED = "SOLVER_DIVERGED"
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
    facility_type: Optional[str] = Field(None, description="HOSPITAL, WATER_TREATMENT, CONTROL_CENTER, UNIVERSITY, RESIDENTIAL, INDUSTRIAL, SUBSTATION, SOLAR, BATTERY, GRID_INTAKE")
    priority_tier: int = Field(2, ge=1, le=3, description="1 = Critical Life-Safety, 2 = Essential Municipal/Residential, 3 = Curtailable Industrial/Flexible")
    criticality_weight: float = Field(2.5, ge=0.1, description="Criticality weight w_i for CAPER objective")
    critical_load_mw: float = Field(0.0, ge=0.0, description="Non-curtailable critical load portion (MW)")
    curtailable_mw: float = Field(0.0, ge=0.0, description="Curtailable flexible load portion (MW)")
    curtailed_mw: float = Field(0.0, ge=0.0, description="Currently shed/curtailed load (MW)")
    building_id: Optional[str] = Field(None, description="3D City building identifier mapped to this bus")
    position_3d: Optional[List[float]] = Field(None, description="[x, y, z] coordinates in 3D city scene")
    energized: bool = Field(True, description="Whether bus is electrically connected to an energized source")
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
    load_type: str = Field("URBAN_DOMESTIC", description="URBAN_DOMESTIC, INDUSTRIAL, AGRICULTURAL, TRACTION, HOSPITAL, WATER_TREATMENT, UNIVERSITY, CONTROL_CENTER")
    criticality: str = Field("MEDIUM", description="CRITICAL, HIGH, MEDIUM, LOW")
    priority_tier: int = Field(2, ge=1, le=3, description="Priority tier: 1 (Critical), 2 (Essential), 3 (Flexible)")
    criticality_weight: float = Field(2.5, ge=0.1, description="Weight w_i for CAPER restoration scoring")
    critical_load_mw: float = Field(0.0, ge=0.0, description="Minimum critical demand (MW)")
    curtailable_mw: float = Field(0.0, ge=0.0, description="Maximum sheddable non-critical demand (MW)")
    curtailed_mw: float = Field(0.0, ge=0.0, description="Active load shed amount (MW)")
    served_mw: Optional[float] = Field(None, description="Actual power served (MW)")
    status: str = Field("ONLINE", description="ONLINE, SHED, RESTRICTED,BACKUP_BATTERY")
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

    @property
    def id(self) -> str:
        return self.line_id



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

    @property
    def converged(self) -> bool:
        return self.status == "SUCCESS" and bool(self.power_balance and self.power_balance.converged)

    @property
    def classification(self) -> DataClassification:
        if self.provenance and self.provenance.data_classification in (
            DataClassification.SOLVER_DERIVED,
            DataClassification.AC_SOLVED,
        ):
            return DataClassification.AC_SOLVED
        return self.provenance.data_classification if self.provenance else DataClassification.AC_SOLVED

    @property
    def branches(self) -> List[LineResult]:
        return self.lines


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
    state_overrides: Optional[Dict[str, Any]] = Field(None, description="Optional overrides e.g. tripped lines or tap positions")


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


# -------------------------------------------------------------------------
# GRID//ZERO Canonical Entities: Switches, Batteries, Faults & Restoration
# -------------------------------------------------------------------------

class SwitchModel(BaseModel):
    """Sectionalizing breaker or normally-open tie switch for feeder reconfiguration."""
    switch_id: str = Field(..., description="Unique switch identifier e.g. SW-TIE-1")
    name: str = Field(..., description="Switch or breaker name")
    from_bus: str = Field(..., description="Terminal A bus ID")
    to_bus: str = Field(..., description="Terminal B bus ID")
    line_id: Optional[str] = Field(None, description="Associated branch/line ID controlled by this switch")
    switch_type: str = Field("SECTIONALIZER", description="BREAKER, TIE_SWITCH, SECTIONALIZER")
    normally_open: bool = Field(False, description="True if switch is normally open (NO) in baseline topology")
    closed: bool = Field(True, description="True if switch is currently closed (conducting)")
    operable: bool = Field(True, description="False if switch is locked out due to an uncleared fault")
    switching_cost: float = Field(1.0, ge=0.0, description="Operational cost weight for switching maneuver")


class BatteryModel(BaseModel):
    """
    Grid-scale or facility-level Battery Energy Storage System (BESS).
    Enforces strict separation between power (kW/MW) and energy (kWh/MWh) across discrete time steps.
    """
    battery_id: str = Field(..., description="Unique battery storage identifier e.g. BESS-1")
    name: str = Field(..., description="Battery facility name")
    bus_id: str = Field(..., description="Connected electrical bus ID")
    capacity_kwh: float = Field(..., gt=0.0, description="Total usable nameplate energy capacity (kWh)")
    soc_kwh: float = Field(..., ge=0.0, description="Current stored energy state-of-charge (kWh)")
    soc_percent: float = Field(..., ge=0.0, le=100.0, description="Current state-of-charge percentage (0-100%)")
    soc_min_percent: float = Field(10.0, ge=0.0, le=50.0, description="Minimum allowable SOC reserve (%)")
    soc_max_percent: float = Field(95.0, ge=50.0, le=100.0, description="Maximum allowable SOC charge limit (%)")
    max_discharge_kw: float = Field(..., gt=0.0, description="Maximum continuous discharge power rating (kW)")
    max_charge_kw: float = Field(..., gt=0.0, description="Maximum continuous charge power rating (kW)")
    current_dispatch_kw: float = Field(0.0, description="Active power dispatch (kW): >0 discharging to grid, <0 charging")
    charge_efficiency: float = Field(0.92, gt=0.0, le=1.0, description="Charging efficiency eta_c")
    discharge_efficiency: float = Field(0.92, gt=0.0, le=1.0, description="Discharging efficiency eta_d")
    status: str = Field("ONLINE", description="ONLINE, DISCHARGING, CHARGING, DEPLETED, OFFLINE")
    provenance: Optional[DataProvenance] = None

    @model_validator(mode="before")
    @classmethod
    def _normalize_battery_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
            if "battery_id" not in d and "id" in d:
                d["battery_id"] = d.pop("id")
            if "soc_kwh" not in d and "energy_kwh" in d:
                d["soc_kwh"] = d.pop("energy_kwh")
            if "soc_percent" not in d and "soc_pct" in d:
                d["soc_percent"] = d.pop("soc_pct")
            if "soc_min_percent" not in d and "min_soc_pct" in d:
                d["soc_min_percent"] = d.pop("min_soc_pct")
            if "soc_max_percent" not in d and "max_soc_pct" in d:
                d["soc_max_percent"] = d.pop("max_soc_pct")
            return d
        return data

    @property
    def id(self) -> str:
        return self.battery_id

    @property
    def energy_kwh(self) -> float:
        return self.soc_kwh

    @property
    def soc_pct(self) -> float:
        return self.soc_percent

    @property
    def capacity_mwh(self) -> float:
        return self.capacity_kwh / 1000.0

    @property
    def max_discharge_mw(self) -> float:
        return self.max_discharge_kw / 1000.0

    @property
    def current_dispatch_mw(self) -> float:
        return self.current_dispatch_kw / 1000.0

    def step_energy(self, dispatch_kw: float, dt_hours: float = 0.25) -> Dict[str, Any]:
        """
        Advances battery state-of-charge over discrete interval dt_hours (default 15 min = 0.25 h).
        Enforces power limits (kW) and energy reserve bounds (kWh).
        """
        clamped_kw = max(-self.max_charge_kw, min(self.max_discharge_kw, dispatch_kw))
        min_kwh = (self.soc_min_percent / 100.0) * self.capacity_kwh
        max_kwh = (self.soc_max_percent / 100.0) * self.capacity_kwh

        if clamped_kw > 0:
            # Discharging: energy withdrawn from storage is P_discharge * dt / eta_d
            available_kwh = max(0.0, self.soc_kwh - min_kwh)
            max_feasible_kw = (available_kwh * self.discharge_efficiency) / max(dt_hours, 1e-6)
            actual_kw = min(clamped_kw, max_feasible_kw)
            delta_kwh = -(actual_kw * dt_hours) / self.discharge_efficiency
        elif clamped_kw < 0:
            # Charging: energy added to storage is |P_charge| * dt * eta_c
            headroom_kwh = max(0.0, max_kwh - self.soc_kwh)
            max_feasible_charge_kw = headroom_kwh / max(dt_hours * self.charge_efficiency, 1e-6)
            actual_kw = -min(abs(clamped_kw), max_feasible_charge_kw)
            delta_kwh = abs(actual_kw) * dt_hours * self.charge_efficiency
        else:
            actual_kw = 0.0
            delta_kwh = 0.0

        self.soc_kwh = round(max(min_kwh, min(max_kwh, self.soc_kwh + delta_kwh)), 3)
        self.soc_percent = round((self.soc_kwh / self.capacity_kwh) * 100.0, 2)
        self.current_dispatch_kw = round(actual_kw, 2)
        if self.soc_percent <= self.soc_min_percent + 0.1 and actual_kw == 0.0 and dispatch_kw > 0:
            self.status = "DEPLETED"
        elif actual_kw > 0:
            self.status = "DISCHARGING"
        elif actual_kw < 0:
            self.status = "CHARGING"
        else:
            self.status = "ONLINE"

        return {
            "requested_kw": round(dispatch_kw, 2),
            "actual_kw": self.current_dispatch_kw,
            "actual_dispatch_kw": self.current_dispatch_kw,
            "delta_kwh": round(delta_kwh, 3),
            "soc_kwh": self.soc_kwh,
            "energy_kwh": self.soc_kwh,
            "soc_percent": self.soc_percent,
            "soc_pct": self.soc_percent,
            "status": self.status,
            "dt_hours": dt_hours,
        }


class FaultModel(BaseModel):
    """Active physical fault or cyber-induced disturbance on a grid asset."""
    fault_id: str = Field(..., description="Unique fault ID e.g. FLT-001")
    asset_id: str = Field(..., description="Faulted line, bus, transformer, or generator ID")
    asset_type: str = Field("LINE", description="LINE, BUS, TRANSFORMER, GENERATOR")
    fault_type: str = Field("PHYSICAL_TRIP", description="PHYSICAL_TRIP, SHORT_CIRCUIT, CYBER_BREAKER_TRIP, FDIA_TELEMETRY, OVERLOAD_TRIP")
    isolated: bool = Field(False, description="Whether fault has been isolated by opening adjacent switches")
    cleared: bool = Field(False, description="Whether fault is cleared and asset can be re-energized")
    severity: str = Field("CRITICAL", description="CRITICAL, HIGH, MEDIUM, LOW")
    description: str = Field("", description="Engineering description of the fault")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    @model_validator(mode="before")
    @classmethod
    def _normalize_fault_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
            if "asset_id" not in d and "target_id" in d:
                d["asset_id"] = d.pop("target_id")
            if "asset_type" not in d and "target_type" in d:
                d["asset_type"] = d.pop("target_type")
            if "cleared" not in d and "active" in d:
                d["cleared"] = not bool(d.pop("active"))
            return d
        return data

    @property
    def target_id(self) -> str:
        return self.asset_id

    @property
    def active(self) -> bool:
        return not self.cleared


class RestorationAction(BaseModel):
    """Single atomic control action within a restoration plan or candidate."""
    action_type: str = Field(
        ...,
        description="ISOLATE_FAULT, CLOSE_TIE_SWITCH, OPEN_SWITCH, REDISPATCH_GENERATOR, DISPATCH_BATTERY, SHED_LOAD, RESTORE_LOAD, RECLOSE_LINE, ADJUST_TAP"
    )
    target_id: str = Field(..., description="Asset ID (switch, line, bus, generator, battery)")
    value: Optional[float] = Field(None, description="Numeric parameter e.g. MW shed, kW battery dispatch, tap position")
    description: str = Field("", description="Plain-English explanation of the action")


class RestorationCandidate(BaseModel):
    """
    A candidate restoration maneuver evaluated by CAPER or baseline algorithms.
    Must undergo true post-action AC power-flow validation before acceptance.
    """
    candidate_id: str
    name: str
    strategy: str = Field("CAPER", description="Generating algorithm e.g. CAPER, PRIORITY_GREEDY, GRAPH_GREEDY, AC_GREEDY, MILP_REFERENCE")
    actions: List[RestorationAction] = []
    route_buses: List[str] = []
    route_lines: List[str] = []
    target_buses: List[str] = []
    ac_validated: bool = False
    feasible: bool = False
    solver_provenance: DataClassification = DataClassification.AC_SOLVED
    rejection_reasons: List[str] = []
    # Post-action physical metrics
    critical_load_restored_mw: float = 0.0
    critical_load_restored_pct: float = 0.0
    total_load_restored_mw: float = 0.0
    total_load_restored_pct: float = 0.0
    non_critical_shed_mw: float = 0.0
    max_line_loading_pct: float = 0.0
    min_voltage_pu: float = 1.0
    max_voltage_pu: float = 1.0
    total_losses_mw: float = 0.0
    switching_count: int = 0
    battery_used_kwh: float = 0.0
    jains_fairness_index: float = 1.0
    objective_score: float = 0.0
    score_breakdown: Dict[str, float] = {}
    post_action_power_flow: Optional[PowerFlowResult] = None

    @property
    def ac_converged(self) -> bool:
        return bool(self.ac_validated)

    @property
    def ac_feasible(self) -> bool:
        return bool(self.feasible)

    @property
    def max_branch_loading_pct(self) -> float:
        return float(self.max_line_loading_pct)

    @property
    def curtailed_load_mw(self) -> float:
        return float(self.non_critical_shed_mw)

    @property
    def runtime_ms(self) -> float:
        return float(self.score_breakdown.get("runtime_ms", 1.5))

    @property
    def rationale(self) -> str:
        return f"{self.name} ({len(self.actions)} actions)"

    @property
    def voltage_violations_count(self) -> int:
        if self.post_action_power_flow:
            return sum(1 for v in self.post_action_power_flow.violations if "VOLTAGE" in v.violation_type.upper())
        return 0 if self.min_voltage_pu >= 0.92 else 1

    @property
    def thermal_violations_count(self) -> int:
        if self.post_action_power_flow:
            return sum(1 for v in self.post_action_power_flow.violations if "VOLTAGE" not in v.violation_type.upper())
        return 0 if self.max_line_loading_pct <= 100.0 else 1






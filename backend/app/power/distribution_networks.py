"""
GRID//ZERO Distribution Feeder Benchmark Networks:
1. TRAINING_FEEDER: 12-Bus 33/11 kV Smart City Distribution Feeder with Critical Infrastructure,
   Normally-Open Tie Switches, Solar Microgrid, and Battery Energy Storage (BESS).
2. IEEE_33_DISTRIBUTION: Standard Baran & Wu (1989) 33-Bus 12.66 kV Radial Distribution System
   loaded from pandapower.networks.case33bw() with documented critical-load and DER extensions.
"""

from typing import Dict, Any, List
import math

try:
    import pandapower.networks as pn
    HAS_PP_NETWORKS = True
except Exception:
    HAS_PP_NETWORKS = False

from app.power.models import (
    BusModel,
    BusType,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel,
    SwitchModel,
    BatteryModel,
    DataProvenance,
    DataClassification,
)


def get_training_feeder_provenance() -> DataProvenance:
    return DataProvenance(
        data_source="GRIDZERO_SMART_CITY_DISTRIBUTION_BENCHMARK",
        source_url="https://github.com/ks26-lab/Cyber_Project",
        source_date="2026-10-25",
        verification_status="SOLVER_VALIDATED",
        data_classification=DataClassification.REPRESENTATIVE,
        notes=(
            "12-Bus 33/11 kV urban distribution feeder benchmark with Hospital, Water Treatment, "
            "Control Center, University, Residential, Industrial loads, 4 normally-open tie switches, "
            "Solar PV microgrid, and 2 Battery Energy Storage Systems (BESS)."
        ),
    )


def get_ieee33_provenance() -> DataProvenance:
    return DataProvenance(
        data_source="IEEE_33_BUS_BARAN_WU_1989_PANDAPOWER_CASE33BW",
        source_url="https://pandapower.readthedocs.io/en/latest/networks/power_system_test_cases.html#case33bw",
        source_date="1989-04-01",
        verification_status="SOLVER_VALIDATED",
        data_classification=DataClassification.BENCHMARK_STANDARD,
        notes=(
            "Standard Baran & Wu (1989) 33-bus, 12.66 kV radial distribution system with 32 closed "
            "sectionalizing branches and 5 normally-open tie switches (total load 3.715 MW, 2.300 MVAr). "
            "Extended with documented synthetic critical facility priority tiers and BESS units."
        ),
    )


def build_training_feeder_network() -> Dict[str, Any]:
    """
    Constructs the canonical TRAINING_FEEDER (12-bus 33/11 kV urban distribution network).
    Total nominal demand: 14.4 MW, 4.85 MVAr.
    Nominal supply: Grid Intake (up to 16.0 MW) + Solar Farm (1.8 MW) + BESS (2.6 MW discharge capability).
    """
    prov = get_training_feeder_provenance()

    buses: List[BusModel] = [
        BusModel(
            bus_id="BUS-01",
            asset_id="ASSET-GRID-INTAKE",
            name="33kV Bulk Grid Intake Substation",
            voltage_kv=33.0,
            bus_type=BusType.SLACK,
            voltage_pu=1.02,
            voltage_angle=0.0,
            generation_P=12.8,
            generation_Q=4.2,
            load_P=0.0,
            load_Q=0.0,
            facility_type="GRID_INTAKE",
            priority_tier=1,
            criticality_weight=10.0,
            building_id="BLDG-GRID-INTAKE",
            position_3d=[-18.0, 0.0, -14.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-02",
            asset_id="ASSET-MAIN-SUB",
            name="11kV Central Primary Distribution Bus",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=1.00,
            voltage_angle=-0.8,
            facility_type="SUBSTATION",
            priority_tier=1,
            criticality_weight=10.0,
            building_id="BLDG-MAIN-SUBSTATION",
            position_3d=[-10.0, 0.0, -8.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-03",
            asset_id="ASSET-HOSPITAL",
            name="Metro General Trauma Hospital",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.985,
            load_P=1.80,
            load_Q=0.60,
            facility_type="HOSPITAL",
            priority_tier=1,
            criticality_weight=10.0,
            critical_load_mw=1.60,
            curtailable_mw=0.20,
            building_id="BLDG-HOSPITAL",
            position_3d=[-2.0, 0.0, -10.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-04",
            asset_id="ASSET-WATER",
            name="Municipal Water Purification & Pumping Plant",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.978,
            load_P=1.40,
            load_Q=0.50,
            facility_type="WATER_TREATMENT",
            priority_tier=1,
            criticality_weight=9.5,
            critical_load_mw=1.20,
            curtailable_mw=0.20,
            building_id="BLDG-WATER",
            position_3d=[8.0, 0.0, -11.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-05",
            asset_id="ASSET-CONTROL",
            name="SCADA & Emergency Dispatch Command Center",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.991,
            load_P=0.80,
            load_Q=0.25,
            facility_type="CONTROL_CENTER",
            priority_tier=1,
            criticality_weight=10.0,
            critical_load_mw=0.80,
            curtailable_mw=0.0,
            building_id="BLDG-CONTROL",
            position_3d=[-4.0, 0.0, 0.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-06",
            asset_id="ASSET-UNIVERSITY",
            name="Institute of Technology & Supercomputing Lab",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.974,
            load_P=1.50,
            load_Q=0.50,
            facility_type="UNIVERSITY",
            priority_tier=2,
            criticality_weight=5.0,
            critical_load_mw=0.50,
            curtailable_mw=1.00,
            building_id="BLDG-UNIVERSITY",
            position_3d=[14.0, 0.0, -4.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-07",
            asset_id="ASSET-RES-NORTH",
            name="North Cyber-District Residential Towers",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.980,
            load_P=2.20,
            load_Q=0.70,
            facility_type="RESIDENTIAL",
            priority_tier=2,
            criticality_weight=4.5,
            critical_load_mw=0.60,
            curtailable_mw=1.60,
            building_id="BLDG-RES-NORTH",
            position_3d=[4.0, 0.0, 2.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-08",
            asset_id="ASSET-RES-SOUTH",
            name="South Harbor Residential & Transit Hub",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.982,
            load_P=1.90,
            load_Q=0.60,
            facility_type="RESIDENTIAL",
            priority_tier=2,
            criticality_weight=4.2,
            critical_load_mw=0.50,
            curtailable_mw=1.40,
            building_id="BLDG-RES-SOUTH",
            position_3d=[-8.0, 0.0, 9.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-09",
            asset_id="ASSET-INDUSTRIAL",
            name="East Heavy Semiconductor & Steel Foundry",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.968,
            load_P=3.20,
            load_Q=1.20,
            facility_type="INDUSTRIAL",
            priority_tier=3,
            criticality_weight=1.5,
            critical_load_mw=0.0,
            curtailable_mw=3.20,
            building_id="BLDG-INDUSTRIAL",
            position_3d=[15.0, 0.0, 9.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-10",
            asset_id="ASSET-COMMERCIAL",
            name="Downtown Commercial Plaza & EV Supercharger",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.975,
            load_P=1.60,
            load_Q=0.50,
            facility_type="COMMERCIAL",
            priority_tier=3,
            criticality_weight=2.0,
            critical_load_mw=0.20,
            curtailable_mw=1.40,
            building_id="BLDG-COMMERCIAL",
            position_3d=[2.0, 0.0, 12.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-11",
            asset_id="ASSET-SOLAR",
            name="East Ridge Utility Solar PV Array",
            voltage_kv=11.0,
            bus_type=BusType.PV,
            voltage_pu=1.005,
            generation_P=1.80,
            generation_Q=0.30,
            load_P=0.0,
            load_Q=0.0,
            facility_type="SOLAR",
            priority_tier=1,
            criticality_weight=8.0,
            building_id="BLDG-SOLAR",
            position_3d=[18.0, 0.0, -12.0],
            provenance=prov,
        ),
        BusModel(
            bus_id="BUS-12",
            asset_id="ASSET-BATTERY",
            name="Central Grid-Scale BESS Reserve Station",
            voltage_kv=11.0,
            bus_type=BusType.PQ,
            voltage_pu=0.992,
            generation_P=0.0,
            generation_Q=0.0,
            load_P=0.0,
            load_Q=0.0,
            facility_type="BATTERY",
            priority_tier=1,
            criticality_weight=9.0,
            building_id="BLDG-BATTERY",
            position_3d=[-12.0, 0.0, 2.0],
            provenance=prov,
        ),
    ]

    generators: List[GeneratorModel] = [
        GeneratorModel(
            generator_id="GEN-INTAKE-1",
            bus_id="BUS-01",
            asset_id="ASSET-GRID-INTAKE",
            name="33kV Bulk Grid Supply Feeder",
            fuel_type="THERMAL",
            Pmin=0.0,
            Pmax=16.0,
            Qmin=-8.0,
            Qmax=12.0,
            current_P=12.8,
            current_Q=4.2,
            voltage_setpoint_pu=1.02,
            status="ONLINE",
            provenance=prov,
        ),
        GeneratorModel(
            generator_id="GEN-SOLAR-1",
            bus_id="BUS-11",
            asset_id="ASSET-SOLAR",
            name="East Ridge 2.5MWp Solar Inverter Bank",
            fuel_type="SOLAR",
            Pmin=0.0,
            Pmax=2.5,
            Qmin=-0.8,
            Qmax=1.0,
            current_P=1.8,
            current_Q=0.3,
            voltage_setpoint_pu=1.005,
            status="ONLINE",
            provenance=prov,
        ),
    ]

    loads: List[LoadModel] = [
        LoadModel(
            load_id="LOAD-HOSPITAL",
            bus_id="BUS-03",
            asset_id="ASSET-HOSPITAL",
            name="Metro Trauma Hospital ICU & Surgical Life-Support",
            P=1.80,
            Q=0.60,
            load_type="HOSPITAL",
            criticality="CRITICAL",
            priority_tier=1,
            criticality_weight=10.0,
            critical_load_mw=1.60,
            curtailable_mw=0.20,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-WATER",
            bus_id="BUS-04",
            asset_id="ASSET-WATER",
            name="Municipal Water Purification & High-Lift Pumps",
            P=1.40,
            Q=0.50,
            load_type="WATER_TREATMENT",
            criticality="CRITICAL",
            priority_tier=1,
            criticality_weight=9.5,
            critical_load_mw=1.20,
            curtailable_mw=0.20,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-CONTROL",
            bus_id="BUS-05",
            asset_id="ASSET-CONTROL",
            name="SCADA Control Center & Emergency Comms",
            P=0.80,
            Q=0.25,
            load_type="CONTROL_CENTER",
            criticality="CRITICAL",
            priority_tier=1,
            criticality_weight=10.0,
            critical_load_mw=0.80,
            curtailable_mw=0.0,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-UNIVERSITY",
            bus_id="BUS-06",
            asset_id="ASSET-UNIVERSITY",
            name="University Research Campus & Cryo Lab",
            P=1.50,
            Q=0.50,
            load_type="UNIVERSITY",
            criticality="HIGH",
            priority_tier=2,
            criticality_weight=5.0,
            critical_load_mw=0.50,
            curtailable_mw=1.00,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-RES-NORTH",
            bus_id="BUS-07",
            asset_id="ASSET-RES-NORTH",
            name="North Residential District (18,000 Households)",
            P=2.20,
            Q=0.70,
            load_type="URBAN_DOMESTIC",
            criticality="HIGH",
            priority_tier=2,
            criticality_weight=4.5,
            critical_load_mw=0.60,
            curtailable_mw=1.60,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-RES-SOUTH",
            bus_id="BUS-08",
            asset_id="ASSET-RES-SOUTH",
            name="South Harbor Apartments & Metro Station",
            P=1.90,
            Q=0.60,
            load_type="URBAN_DOMESTIC",
            criticality="HIGH",
            priority_tier=2,
            criticality_weight=4.2,
            critical_load_mw=0.50,
            curtailable_mw=1.40,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-INDUSTRIAL",
            bus_id="BUS-09",
            asset_id="ASSET-INDUSTRIAL",
            name="East Heavy Semiconductor & Arc Furnace Plant",
            P=3.20,
            Q=1.20,
            load_type="INDUSTRIAL",
            criticality="LOW",
            priority_tier=3,
            criticality_weight=1.5,
            critical_load_mw=0.0,
            curtailable_mw=3.20,
            provenance=prov,
        ),
        LoadModel(
            load_id="LOAD-COMMERCIAL",
            bus_id="BUS-10",
            asset_id="ASSET-COMMERCIAL",
            name="Downtown Commercial Mall & Fleet Charging",
            P=1.60,
            Q=0.50,
            load_type="URBAN_DOMESTIC",
            criticality="LOW",
            priority_tier=3,
            criticality_weight=2.0,
            critical_load_mw=0.20,
            curtailable_mw=1.40,
            provenance=prov,
        ),
    ]

    transformers: List[TransformerModel] = [
        TransformerModel(
            transformer_id="XFMR-01-02",
            from_bus="BUS-01",
            to_bus="BUS-02",
            asset_id="ASSET-MAIN-SUB",
            name="33/11kV 20MVA Primary Substation Transformer T1",
            rated_mva=20.0,
            primary_kv=33.0,
            secondary_kv=11.0,
            impedance_percent=8.5,
            resistance_percent=0.45,
            tap_position=0,
            tap_min=-8,
            tap_max=8,
            status="IN_SERVICE",
            provenance=prov,
        )
    ]

    # Radial 11kV distribution lines + 4 Normally-Open (NO) Tie Lines
    lines: List[TransmissionLineModel] = [
        # Feeder A (North-Central Critical Medical & Water Trunk)
        TransmissionLineModel(
            line_id="LINE-02-03",
            from_bus="BUS-02",
            to_bus="BUS-03",
            name="11kV Primary Hospital Express Feeder F1",
            voltage_kv=11.0,
            length_km=2.2,
            resistance_ohm=0.33,
            reactance_ohm=0.55,
            r_ohm_per_km=0.15,
            x_ohm_per_km=0.25,
            thermal_limit_mw=6.0,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-03-04",
            from_bus="BUS-03",
            to_bus="BUS-04",
            name="11kV Hospital–Water Works Trunk F1B",
            voltage_kv=11.0,
            length_km=2.5,
            resistance_ohm=0.425,
            reactance_ohm=0.65,
            r_ohm_per_km=0.17,
            x_ohm_per_km=0.26,
            thermal_limit_mw=4.8,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-04-06",
            from_bus="BUS-04",
            to_bus="BUS-06",
            name="11kV Water–University Campus Feeder F1C",
            voltage_kv=11.0,
            length_km=2.8,
            resistance_ohm=0.504,
            reactance_ohm=0.728,
            r_ohm_per_km=0.18,
            x_ohm_per_km=0.26,
            thermal_limit_mw=4.2,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-06-11",
            from_bus="BUS-06",
            to_bus="BUS-11",
            name="11kV Solar Microgrid Intertie Line",
            voltage_kv=11.0,
            length_km=1.6,
            resistance_ohm=0.24,
            reactance_ohm=0.384,
            r_ohm_per_km=0.15,
            x_ohm_per_km=0.24,
            thermal_limit_mw=4.5,
            status="IN_SERVICE",
            provenance=prov,
        ),
        # Feeder B (Central Control, North Residential & East Industrial Trunk)
        TransmissionLineModel(
            line_id="LINE-02-05",
            from_bus="BUS-02",
            to_bus="BUS-05",
            name="11kV Primary Command & North Trunk F2",
            voltage_kv=11.0,
            length_km=1.8,
            resistance_ohm=0.252,
            reactance_ohm=0.432,
            r_ohm_per_km=0.14,
            x_ohm_per_km=0.24,
            thermal_limit_mw=8.5,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-05-12",
            from_bus="BUS-05",
            to_bus="BUS-12",
            name="11kV BESS Storage Station Interconnector",
            voltage_kv=11.0,
            length_km=1.2,
            resistance_ohm=0.168,
            reactance_ohm=0.288,
            r_ohm_per_km=0.14,
            x_ohm_per_km=0.24,
            thermal_limit_mw=5.0,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-05-07",
            from_bus="BUS-05",
            to_bus="BUS-07",
            name="11kV Control–North Residential Feeder F2B",
            voltage_kv=11.0,
            length_km=2.4,
            resistance_ohm=0.384,
            reactance_ohm=0.60,
            r_ohm_per_km=0.16,
            x_ohm_per_km=0.25,
            thermal_limit_mw=6.8,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-07-09",
            from_bus="BUS-07",
            to_bus="BUS-09",
            name="11kV North–Industrial Foundry Feeder F2C",
            voltage_kv=11.0,
            length_km=3.0,
            resistance_ohm=0.54,
            reactance_ohm=0.81,
            r_ohm_per_km=0.18,
            x_ohm_per_km=0.27,
            thermal_limit_mw=4.5,
            status="IN_SERVICE",
            provenance=prov,
        ),
        # Feeder C (South Residential & Commercial Trunk)
        TransmissionLineModel(
            line_id="LINE-02-08",
            from_bus="BUS-02",
            to_bus="BUS-08",
            name="11kV South Harbor Primary Feeder F3",
            voltage_kv=11.0,
            length_km=2.6,
            resistance_ohm=0.416,
            reactance_ohm=0.65,
            r_ohm_per_km=0.16,
            x_ohm_per_km=0.25,
            thermal_limit_mw=6.0,
            status="IN_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-08-10",
            from_bus="BUS-08",
            to_bus="BUS-10",
            name="11kV South–Commercial Plaza Feeder F3B",
            voltage_kv=11.0,
            length_km=2.3,
            resistance_ohm=0.391,
            reactance_ohm=0.598,
            r_ohm_per_km=0.17,
            x_ohm_per_km=0.26,
            thermal_limit_mw=4.2,
            status="IN_SERVICE",
            provenance=prov,
        ),
        # Normally-Open (NO) Tie Switch Corridors (status="OUT_OF_SERVICE" when open)
        TransmissionLineModel(
            line_id="LINE-TIE-05-03",
            from_bus="BUS-05",
            to_bus="BUS-03",
            name="11kV Emergency Tie Corridor T1 (Command ↔ Hospital)",
            voltage_kv=11.0,
            length_km=1.9,
            resistance_ohm=0.285,
            reactance_ohm=0.456,
            r_ohm_per_km=0.15,
            x_ohm_per_km=0.24,
            thermal_limit_mw=4.5,
            status="OUT_OF_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-TIE-07-04",
            from_bus="BUS-07",
            to_bus="BUS-04",
            name="11kV Cross-Town Tie Corridor T2 (North Res ↔ Water Plant)",
            voltage_kv=11.0,
            length_km=3.4,
            resistance_ohm=0.748,
            reactance_ohm=1.02,
            r_ohm_per_km=0.22,
            x_ohm_per_km=0.30,
            thermal_limit_mw=2.6,
            status="OUT_OF_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-TIE-07-06",
            from_bus="BUS-07",
            to_bus="BUS-06",
            name="11kV Campus Tie Corridor T3 (North Res ↔ University)",
            voltage_kv=11.0,
            length_km=2.5,
            resistance_ohm=0.45,
            reactance_ohm=0.675,
            r_ohm_per_km=0.18,
            x_ohm_per_km=0.27,
            thermal_limit_mw=3.8,
            status="OUT_OF_SERVICE",
            provenance=prov,
        ),
        TransmissionLineModel(
            line_id="LINE-TIE-10-09",
            from_bus="BUS-10",
            to_bus="BUS-09",
            name="11kV East Loop Tie Corridor T4 (Commercial ↔ Industrial)",
            voltage_kv=11.0,
            length_km=2.9,
            resistance_ohm=0.551,
            reactance_ohm=0.812,
            r_ohm_per_km=0.19,
            x_ohm_per_km=0.28,
            thermal_limit_mw=3.5,
            status="OUT_OF_SERVICE",
            provenance=prov,
        ),
    ]

    switches: List[SwitchModel] = [
        # Sectionalizing Breakers on Active Radial Branches
        SwitchModel(
            switch_id="SW-02-03",
            name="Hospital Feeder Breaker CB-02-03",
            from_bus="BUS-02",
            to_bus="BUS-03",
            line_id="LINE-02-03",
            switch_type="BREAKER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-03-04",
            name="Hospital–Water Sectionalizer S-03-04",
            from_bus="BUS-03",
            to_bus="BUS-04",
            line_id="LINE-03-04",
            switch_type="SECTIONALIZER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-04-06",
            name="Water–University Sectionalizer S-04-06",
            from_bus="BUS-04",
            to_bus="BUS-06",
            line_id="LINE-04-06",
            switch_type="SECTIONALIZER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-02-05",
            name="Command Trunk Breaker CB-02-05",
            from_bus="BUS-02",
            to_bus="BUS-05",
            line_id="LINE-02-05",
            switch_type="BREAKER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-05-07",
            name="Control–North Res Sectionalizer S-05-07",
            from_bus="BUS-05",
            to_bus="BUS-07",
            line_id="LINE-05-07",
            switch_type="SECTIONALIZER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-07-09",
            name="Industrial Foundry Feeder Breaker CB-07-09",
            from_bus="BUS-07",
            to_bus="BUS-09",
            line_id="LINE-07-09",
            switch_type="BREAKER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-02-08",
            name="South Harbor Feeder Breaker CB-02-08",
            from_bus="BUS-02",
            to_bus="BUS-08",
            line_id="LINE-02-08",
            switch_type="BREAKER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        SwitchModel(
            switch_id="SW-08-10",
            name="Commercial Plaza Sectionalizer S-08-10",
            from_bus="BUS-08",
            to_bus="BUS-10",
            line_id="LINE-08-10",
            switch_type="SECTIONALIZER",
            normally_open=False,
            closed=True,
            switching_cost=1.0,
        ),
        # Normally-Open Tie Switches
        SwitchModel(
            switch_id="SW-TIE-1",
            name="Normally-Open Tie Switch TS-1 (Command ↔ Hospital)",
            from_bus="BUS-05",
            to_bus="BUS-03",
            line_id="LINE-TIE-05-03",
            switch_type="TIE_SWITCH",
            normally_open=True,
            closed=False,
            switching_cost=1.5,
        ),
        SwitchModel(
            switch_id="SW-TIE-2",
            name="Normally-Open Tie Switch TS-2 (North Res ↔ Water Plant)",
            from_bus="BUS-07",
            to_bus="BUS-04",
            line_id="LINE-TIE-07-04",
            switch_type="TIE_SWITCH",
            normally_open=True,
            closed=False,
            switching_cost=1.5,
        ),
        SwitchModel(
            switch_id="SW-TIE-3",
            name="Normally-Open Tie Switch TS-3 (North Res ↔ University)",
            from_bus="BUS-07",
            to_bus="BUS-06",
            line_id="LINE-TIE-07-06",
            switch_type="TIE_SWITCH",
            normally_open=True,
            closed=False,
            switching_cost=1.5,
        ),
        SwitchModel(
            switch_id="SW-TIE-4",
            name="Normally-Open Tie Switch TS-4 (Commercial ↔ Industrial)",
            from_bus="BUS-10",
            to_bus="BUS-09",
            line_id="LINE-TIE-10-09",
            switch_type="TIE_SWITCH",
            normally_open=True,
            closed=False,
            switching_cost=1.5,
        ),
    ]

    batteries: List[BatteryModel] = [
        BatteryModel(
            battery_id="BESS-CITY-1",
            name="Central Grid-Scale BESS (4.0 MWh / 2.0 MW)",
            bus_id="BUS-12",
            capacity_kwh=4000.0,
            soc_kwh=3200.0,
            soc_percent=80.0,
            soc_min_percent=10.0,
            soc_max_percent=95.0,
            max_discharge_kw=2000.0,
            max_charge_kw=1500.0,
            current_dispatch_kw=0.0,
            charge_efficiency=0.92,
            discharge_efficiency=0.92,
            status="ONLINE",
            provenance=prov,
        ),
        BatteryModel(
            battery_id="BESS-HOSP-1",
            name="Hospital Emergency Microgrid Battery (1.0 MWh / 0.6 MW)",
            bus_id="BUS-03",
            capacity_kwh=1000.0,
            soc_kwh=850.0,
            soc_percent=85.0,
            soc_min_percent=10.0,
            soc_max_percent=95.0,
            max_discharge_kw=600.0,
            max_charge_kw=400.0,
            current_dispatch_kw=0.0,
            charge_efficiency=0.93,
            discharge_efficiency=0.93,
            status="ONLINE",
            provenance=prov,
        ),
    ]

    return {
        "network_id": "TRAINING_FEEDER",
        "name": "12-Bus Smart City Distribution Feeder (33/11 kV)",
        "buses": buses,
        "generators": generators,
        "loads": loads,
        "lines": lines,
        "transformers": transformers,
        "switches": switches,
        "batteries": batteries,
        "provenance": prov,
    }


def build_ieee33_distribution_network() -> Dict[str, Any]:
    """
    Constructs the standard IEEE 33-Bus (Baran & Wu 1989) 12.66 kV radial distribution system
    directly from pandapower.networks.case33bw() and attaches documented critical-infrastructure
    priority tiers, tie-switch metadata, and BESS units for restoration benchmarking.
    """
    prov = get_ieee33_provenance()

    # Critical facility overlay mapping on IEEE 33-bus
    facility_map: Dict[int, Dict[str, Any]] = {
        0: {"type": "GRID_INTAKE", "name": "Substation Slack Bus 1 (12.66kV)", "tier": 1, "weight": 10.0},
        1: {"type": "CONTROL_CENTER", "name": "Bus 2 — SCADA Dispatch Center", "tier": 1, "weight": 9.8},
        5: {"type": "HOSPITAL", "name": "Bus 6 — Regional Medical Center", "tier": 1, "weight": 10.0},
        17: {"type": "WATER_TREATMENT", "name": "Bus 18 — Municipal Water Pumping Station", "tier": 1, "weight": 9.5},
        23: {"type": "UNIVERSITY", "name": "Bus 24 — Engineering University Campus", "tier": 2, "weight": 5.5},
        24: {"type": "RESIDENTIAL", "name": "Bus 25 — North District High-Density Housing", "tier": 2, "weight": 4.8},
        29: {"type": "INDUSTRIAL", "name": "Bus 30 — Heavy Industrial Park", "tier": 3, "weight": 1.6},
        31: {"type": "HOSPITAL", "name": "Bus 32 — East Emergency Trauma Clinic", "tier": 1, "weight": 9.2},
    }

    buses: List[BusModel] = []
    generators: List[GeneratorModel] = []
    loads: List[LoadModel] = []
    lines: List[TransmissionLineModel] = []
    switches: List[SwitchModel] = []

    if HAS_PP_NETWORKS:
        net = pn.case33bw()
        # Extract 33 buses
        for idx, row in net.bus.iterrows():
            bus_num = int(idx) + 1
            bus_id = f"BUS-{bus_num}"
            is_slack = int(idx) in set(net.ext_grid.bus.values)
            f_info = facility_map.get(
                int(idx),
                {
                    "type": "RESIDENTIAL" if bus_num % 3 != 0 else "INDUSTRIAL",
                    "name": f"IEEE-33 Bus {bus_num} Feeder Node",
                    "tier": 2 if bus_num % 3 != 0 else 3,
                    "weight": 4.0 if bus_num % 3 != 0 else 1.8,
                },
            )
            # Compute deterministic 3D layout across radial branches
            angle = (int(idx) / 33.0) * 2.0 * math.pi
            radius = 5.0 + (int(idx) % 11) * 1.4
            pos_3d = [round(math.cos(angle) * radius, 2), 0.0, round(math.sin(angle) * radius, 2)]

            buses.append(
                BusModel(
                    bus_id=bus_id,
                    asset_id=f"IEEE33-{bus_id}",
                    name=f_info["name"],
                    voltage_kv=float(row["vn_kv"]),
                    bus_type=BusType.SLACK if is_slack else BusType.PQ,
                    voltage_pu=1.0,
                    voltage_angle=0.0,
                    facility_type=f_info["type"],
                    priority_tier=f_info["tier"],
                    criticality_weight=f_info["weight"],
                    building_id=f"BLDG-IEEE33-{bus_num}",
                    position_3d=pos_3d,
                    provenance=prov,
                )
            )

        # Slack generator at BUS-1
        generators.append(
            GeneratorModel(
                generator_id="GEN-IEEE33-SLACK",
                bus_id="BUS-1",
                asset_id="IEEE33-BUS-1",
                name="IEEE 33-Bus Substation Slack Feeder (12.66 kV)",
                fuel_type="THERMAL",
                Pmin=0.0,
                Pmax=6.0,
                Qmin=-4.0,
                Qmax=5.0,
                current_P=3.92,
                current_Q=2.44,
                voltage_setpoint_pu=1.0,
                status="ONLINE",
                provenance=prov,
            )
        )

        # Extract loads from net.load
        bus_map = {b.bus_id: b for b in buses}
        for idx, row in net.load.iterrows():
            b_idx = int(row["bus"])
            bus_num = b_idx + 1
            bus_id = f"BUS-{bus_num}"
            p_mw = round(float(row["p_mw"]), 4)
            q_mvar = round(float(row["q_mvar"]), 4)
            b_obj = bus_map[bus_id]
            b_obj.load_P = p_mw
            b_obj.load_Q = q_mvar
            if b_obj.priority_tier == 1:
                crit_mw = round(p_mw * 0.85, 4)
            elif b_obj.priority_tier == 2:
                crit_mw = round(p_mw * 0.35, 4)
            else:
                crit_mw = 0.0
            curt_mw = round(max(0.0, p_mw - crit_mw), 4)
            b_obj.critical_load_mw = crit_mw
            b_obj.curtailable_mw = curt_mw

            loads.append(
                LoadModel(
                    load_id=f"LOAD-{bus_num}",
                    bus_id=bus_id,
                    asset_id=f"IEEE33-{bus_id}",
                    name=f"{b_obj.name} Load",
                    P=p_mw,
                    Q=q_mvar,
                    load_type=b_obj.facility_type or "URBAN_DOMESTIC",
                    criticality="CRITICAL" if b_obj.priority_tier == 1 else ("HIGH" if b_obj.priority_tier == 2 else "LOW"),
                    priority_tier=b_obj.priority_tier,
                    criticality_weight=b_obj.criticality_weight,
                    critical_load_mw=crit_mw,
                    curtailable_mw=curt_mw,
                    provenance=prov,
                )
            )

        # Extract lines (32 sectionalizing closed lines + 5 normally-open tie lines)
        open_line_indices = set()
        if hasattr(net, "switch") and len(net.switch) > 0:
            for _, sw_row in net.switch.iterrows():
                if sw_row["et"] == "l" and not bool(sw_row["closed"]):
                    open_line_indices.add(int(sw_row["element"]))

        for idx, row in net.line.iterrows():
            l_num = int(idx) + 1
            fb = f"BUS-{int(row['from_bus']) + 1}"
            tb = f"BUS-{int(row['to_bus']) + 1}"
            is_tie = int(idx) in open_line_indices or not bool(row.get("in_service", True))
            line_id = f"LINE-TIE-{l_num}" if is_tie else f"LINE-{l_num}"
            length_km = max(0.1, float(row.get("length_km", 1.0)))
            r_ohm = float(row["r_ohm_per_km"]) * length_km
            x_ohm = float(row["x_ohm_per_km"]) * length_km
            max_i_ka = float(row.get("max_i_ka", 0.4))
            # Thermal limit in MW at 12.66 kV (sqrt(3) * V_kv * I_ka)
            thermal_mw = round(min(4.5, max(0.8, math.sqrt(3.0) * 12.66 * max_i_ka)), 3)

            lines.append(
                TransmissionLineModel(
                    line_id=line_id,
                    from_bus=fb,
                    to_bus=tb,
                    name=f"IEEE-33 {'Tie ' if is_tie else ''}Branch {l_num} ({fb}–{tb})",
                    voltage_kv=12.66,
                    length_km=length_km,
                    resistance_ohm=round(r_ohm, 5),
                    reactance_ohm=round(x_ohm, 5),
                    r_ohm_per_km=round(float(row["r_ohm_per_km"]), 5),
                    x_ohm_per_km=round(float(row["x_ohm_per_km"]), 5),
                    thermal_limit_mw=thermal_mw,
                    current_limit_ka=max_i_ka,
                    status="OUT_OF_SERVICE" if is_tie else "IN_SERVICE",
                    provenance=prov,
                )
            )

            switches.append(
                SwitchModel(
                    switch_id=f"SW-TIE-{l_num}" if is_tie else f"SW-SEC-{l_num}",
                    name=f"IEEE-33 {'Tie Switch' if is_tie else 'Sectionalizer'} {l_num} ({fb}–{tb})",
                    from_bus=fb,
                    to_bus=tb,
                    line_id=line_id,
                    switch_type="TIE_SWITCH" if is_tie else "SECTIONALIZER",
                    normally_open=is_tie,
                    closed=not is_tie,
                    switching_cost=1.5 if is_tie else 1.0,
                )
            )

    batteries: List[BatteryModel] = [
        BatteryModel(
            battery_id="BESS-IEEE33-1",
            name="Bus 6 Medical Center BESS (1.2 MWh / 0.5 MW)",
            bus_id="BUS-6",
            capacity_kwh=1200.0,
            soc_kwh=960.0,
            soc_percent=80.0,
            max_discharge_kw=500.0,
            max_charge_kw=400.0,
            provenance=prov,
        ),
        BatteryModel(
            battery_id="BESS-IEEE33-2",
            name="Bus 25 Community Storage BESS (1.5 MWh / 0.6 MW)",
            bus_id="BUS-25",
            capacity_kwh=1500.0,
            soc_kwh=1200.0,
            soc_percent=80.0,
            max_discharge_kw=600.0,
            max_charge_kw=450.0,
            provenance=prov,
        ),
    ]

    return {
        "network_id": "IEEE_33_DISTRIBUTION",
        "name": "IEEE 33-Bus Radial Distribution Benchmark (12.66 kV)",
        "buses": buses,
        "generators": generators,
        "loads": loads,
        "lines": lines,
        "transformers": [],
        "switches": switches,
        "batteries": batteries,
        "provenance": prov,
    }


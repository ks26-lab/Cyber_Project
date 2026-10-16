"""
Deterministic 4-Bus Benchmark Test Network for Electrical Power Flow Validation.
Defines a standard multi-voltage 765kV / 400kV bus-branch network with real conductor parameters.
"""

from typing import Dict, Any, List
from app.power.models import (
    BusModel,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel,
    BusType,
    DataProvenance,
    DataClassification
)


def get_deterministic_4bus_network() -> Dict[str, Any]:
    r"""
    Constructs the standard deterministic 4-bus power system:
    
            [ Gen 1: Slack (V=1.02 pu) ]       [ Gen 2: PV (600 MW, V=1.01 pu) ]
                       |                                       |
                [ Bus 1: 765 kV ] ───────────────────── [ Bus 2: 765 kV ]
                       \                                       /
               Line 1-3 \                                     / Line 2-3
                         \                                   /
                          \────── [ Bus 3: 765 kV ] ────────/
                                         |
                                [ Load 3: 500 MW ]
                                         |
                                [ XFMR 3-4: 765/400kV, 1500 MVA ]
                                         |
                                  [ Bus 4: 400 kV ]
                                         |
                                [ Load 4: 600 MW ]
    """
    prov = DataProvenance(
        data_source="GRIDSEC_BENCHMARK_SPECIFICATION",
        source_url="docs/electrical_model.md#test-network",
        source_date="2026-09-06",
        verification_status="SOLVER_VALIDATED",
        data_classification=DataClassification.REPRESENTATIVE,
        notes="Standard 4-Bus 765/400kV AC power flow benchmark system with ACSR Quad-Bersimis lines and 1500MVA ICT"
    )

    # 1. Four Buses
    buses = [
        BusModel(
            bus_id="BUS-1",
            name="Bus 1 (765kV Slack Generation Hub)",
            voltage_kv=765.0,
            bus_type=BusType.SLACK,
            voltage_pu=1.02,
            voltage_angle=0.0,
            generation_P=0.0,  # Will be computed by solver slack
            generation_Q=0.0,
            load_P=0.0,
            load_Q=0.0,
            status="ONLINE",
            provenance=prov
        ),
        BusModel(
            bus_id="BUS-2",
            name="Bus 2 (765kV PV Thermal Plant)",
            voltage_kv=765.0,
            bus_type=BusType.PV,
            voltage_pu=1.01,
            voltage_angle=0.0,
            generation_P=600.0,
            generation_Q=0.0,
            load_P=0.0,
            load_Q=0.0,
            status="ONLINE",
            provenance=prov
        ),
        BusModel(
            bus_id="BUS-3",
            name="Bus 3 (765kV High-Voltage Substation)",
            voltage_kv=765.0,
            bus_type=BusType.PQ,
            voltage_pu=1.00,
            voltage_angle=0.0,
            generation_P=0.0,
            generation_Q=0.0,
            load_P=500.0,
            load_Q=150.0,
            status="ONLINE",
            provenance=prov
        ),
        BusModel(
            bus_id="BUS-4",
            name="Bus 4 (400kV Regional Load Center)",
            voltage_kv=400.0,
            bus_type=BusType.PQ,
            voltage_pu=1.00,
            voltage_angle=0.0,
            generation_P=0.0,
            generation_Q=0.0,
            load_P=600.0,
            load_Q=180.0,
            status="ONLINE",
            provenance=prov
        )
    ]

    # 2. Generators (Slack at Bus 1, PV at Bus 2)
    generators = [
        GeneratorModel(
            generator_id="GEN-1",
            bus_id="BUS-1",
            name="Slack Generator Unit 1-4 (Bus 1)",
            fuel_type="THERMAL",
            Pmin=100.0,
            Pmax=2500.0,
            Qmin=-500.0,
            Qmax=1000.0,
            current_P=600.0,
            current_Q=0.0,
            voltage_setpoint_pu=1.02,
            status="ONLINE",
            provenance=prov
        ),
        GeneratorModel(
            generator_id="GEN-2",
            bus_id="BUS-2",
            name="Thermal Generator Unit 1-2 (Bus 2)",
            fuel_type="THERMAL",
            Pmin=100.0,
            Pmax=1500.0,
            Qmin=-300.0,
            Qmax=600.0,
            current_P=600.0,
            current_Q=120.0,
            voltage_setpoint_pu=1.01,
            status="ONLINE",
            provenance=prov
        )
    ]

    # 3. Loads (Bus 3 and Bus 4)
    loads = [
        LoadModel(
            load_id="LOAD-3",
            bus_id="BUS-3",
            name="Industrial Bulk Feeder (Bus 3)",
            P=500.0,
            Q=150.0,
            load_type="INDUSTRIAL",
            criticality="HIGH",
            status="ONLINE",
            provenance=prov
        ),
        LoadModel(
            load_id="LOAD-4",
            bus_id="BUS-4",
            name="Metro Urban Demand Center (Bus 4)",
            P=600.0,
            Q=180.0,
            load_type="URBAN_DOMESTIC",
            criticality="CRITICAL",
            status="ONLINE",
            provenance=prov
        )
    ]

    # 4. Transmission Lines (Standard ACSR Quad-Bersimis 765kV: r=0.0185, x=0.278 Ohm/km)
    lines = [
        TransmissionLineModel(
            line_id="LINE-1-2",
            from_bus="BUS-1",
            to_bus="BUS-2",
            name="765kV Transmission Line 1-2",
            voltage_kv=765.0,
            length_km=120.0,
            resistance_ohm=round(0.0185 * 120.0, 3), # 2.22 Ohm
            reactance_ohm=round(0.278 * 120.0, 3),   # 33.36 Ohm
            susceptance=round(4.35 * 120.0, 1),      # 522 uS
            r_ohm_per_km=0.0185,
            x_ohm_per_km=0.278,
            b_microsiemens_per_km=4.35,
            thermal_limit_mw=3000.0,
            current_limit_ka=2.26,
            current_flow_mw=0.0,
            loading_percent=0.0,
            losses_mw=None,
            status="IN_SERVICE",
            provenance=prov
        ),
        TransmissionLineModel(
            line_id="LINE-1-3",
            from_bus="BUS-1",
            to_bus="BUS-3",
            name="765kV Transmission Line 1-3",
            voltage_kv=765.0,
            length_km=150.0,
            resistance_ohm=round(0.0185 * 150.0, 3), # 2.775 Ohm
            reactance_ohm=round(0.278 * 150.0, 3),   # 41.70 Ohm
            susceptance=round(4.35 * 150.0, 1),      # 652.5 uS
            r_ohm_per_km=0.0185,
            x_ohm_per_km=0.278,
            b_microsiemens_per_km=4.35,
            thermal_limit_mw=3000.0,
            current_limit_ka=2.26,
            current_flow_mw=0.0,
            loading_percent=0.0,
            losses_mw=None,
            status="IN_SERVICE",
            provenance=prov
        ),
        TransmissionLineModel(
            line_id="LINE-2-3",
            from_bus="BUS-2",
            to_bus="BUS-3",
            name="765kV Transmission Line 2-3",
            voltage_kv=765.0,
            length_km=100.0,
            resistance_ohm=round(0.0185 * 100.0, 3), # 1.85 Ohm
            reactance_ohm=round(0.278 * 100.0, 3),   # 27.80 Ohm
            susceptance=round(4.35 * 100.0, 1),      # 435.0 uS
            r_ohm_per_km=0.0185,
            x_ohm_per_km=0.278,
            b_microsiemens_per_km=4.35,
            thermal_limit_mw=3000.0,
            current_limit_ka=2.26,
            current_flow_mw=0.0,
            loading_percent=0.0,
            losses_mw=None,
            status="IN_SERVICE",
            provenance=prov
        )
    ]

    # 5. Transformer (Step-Down 765/400kV 1500 MVA ICT between Bus 3 and Bus 4)
    transformers = [
        TransformerModel(
            transformer_id="XFMR-3-4",
            from_bus="BUS-3",
            to_bus="BUS-4",
            name="765/400kV 1500MVA Inter-Connecting Transformer (ICT)",
            rated_mva=1500.0,
            primary_kv=765.0,
            secondary_kv=400.0,
            impedance_percent=14.5,
            resistance_percent=0.25,
            tap_position=0,
            tap_min=-10,
            tap_max=10,
            loading_percent=0.0,
            losses_mw=None,
            status="IN_SERVICE",
            provenance=prov
        )
    ]

    return {
        "network_id": "TEST_NETWORK",
        "description": "Deterministic 4-Bus 765/400kV Power System (Slack Gen 1, PV Gen 2, PQ Load 3, PQ Load 4)",
        "buses": buses,
        "generators": generators,
        "loads": loads,
        "lines": lines,
        "transformers": transformers
    }


get_benchmark_4bus_test_network = get_deterministic_4bus_network


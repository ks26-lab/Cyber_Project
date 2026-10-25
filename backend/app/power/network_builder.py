"""
Electrical Network Topology Builder.
Extracts stored database entities (Assets, TransformerBays, TransmissionLines)
and constructs clean Bus-Branch electrical topologies for power flow solvers,
attaching rigorous data provenance and parameter classifications.
"""

from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from app.models.asset import Asset, TransformerBay
from app.models.transmission import TransmissionLine
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
from app.power.test_networks import get_benchmark_4bus_test_network
from app.power.ieee30_network import get_ieee30_benchmark_network
from app.power.distribution_networks import (
    build_training_feeder_network,
    build_ieee33_distribution_network,
)


# CEA Standard Conductor Benchmarks for Representative ACSR lines
CEA_CONDUCTOR_BENCHMARKS = {
    "765kV_AC": {
        "r_ohm_per_km": 0.0185,  # Quad Bersimis ACSR conductor
        "x_ohm_per_km": 0.2780,
        "b_microsiemens_per_km": 4.35
    },
    "400kV_AC": {
        "r_ohm_per_km": 0.0540,  # Twin Moose ACSR conductor
        "x_ohm_per_km": 0.3120,
        "b_microsiemens_per_km": 3.42
    },
    "220kV_AC": {
        "r_ohm_per_km": 0.1250,  # Single Zebra ACSR conductor
        "x_ohm_per_km": 0.4020,
        "b_microsiemens_per_km": 2.80
    },
    "HVDC": {
        "r_ohm_per_km": 0.0110,  # Dedicated bi-pole metallic conductor
        "x_ohm_per_km": 0.0050,  # Equivalent series commutation reactance in AC network representation
        "b_microsiemens_per_km": 0.0
    }
}


class ElectricalNetworkBuilder:
    """
    Builds structured electrical network topologies from database records or benchmark configurations.
    """

    @classmethod
    def build_test_network(cls) -> Dict[str, Any]:
        """Returns the isolated 4-bus validation benchmark network."""
        return get_benchmark_4bus_test_network()

    @classmethod
    def build_ieee30_network(cls) -> Dict[str, Any]:
        """Returns the authenticated IEEE 30-bus transmission benchmark network."""
        return get_ieee30_benchmark_network()

    @classmethod
    def build_training_feeder_network(cls) -> Dict[str, Any]:
        """Returns the 12-bus Smart City Distribution Feeder (33/11 kV) benchmark network."""
        return build_training_feeder_network()

    @classmethod
    def build_ieee33_network(cls) -> Dict[str, Any]:
        """Returns the IEEE 33-Bus (Baran & Wu 1989) 12.66 kV radial distribution system."""
        return build_ieee33_distribution_network()

    @classmethod
    def build_india_grid_electrical_model(cls, db: Session) -> Dict[str, Any]:
        """
        Builds an electrical bus-branch representation of the 59-node Indian Grid.
        Distinguishes between verified CEA/PGCIL reference data and representative engineering defaults.
        """
        assets: List[Asset] = db.query(Asset).all()
        xfmrs: List[TransformerBay] = db.query(TransformerBay).all()
        lines: List[TransmissionLine] = db.query(TransmissionLine).all()

        buses: List[BusModel] = []
        generators: List[GeneratorModel] = []
        loads: List[LoadModel] = []
        elec_lines: List[TransmissionLineModel] = []
        elec_xfmrs: List[TransformerModel] = []

        prov_real = DataProvenance(
            data_source="CEA_PGCIL_POSOCO_PUBLISHED",
            source_url="js/data/indiaGridData.js",
            source_date="2026",
            verification_status="VERIFIED",
            data_classification=DataClassification.REAL_REFERENCE,
            notes="Real Indian power grid asset reference catalog"
        )

        prov_representative = DataProvenance(
            data_source="CEA_PLANNING_CRITERIA_MANUAL_BENCHMARKS",
            source_url="https://cea.nic.in/manual-on-transmission-planning-criteria/",
            source_date="2023",
            verification_status="ESTIMATED",
            data_classification=DataClassification.REPRESENTATIVE,
            notes="Representative ACSR conductor electrical parameters derived from standard CEA transmission benchmarks"
        )

        # 1. Map Assets to Electrical Buses & Generators / Loads
        for asset in assets:
            # Extract primary voltage
            v_str = asset.voltage_kv or "400"
            v_val = 765.0 if "765" in v_str else (800.0 if "800" in v_str else (400.0 if "400" in v_str else 220.0))
            
            # Determine bus type
            atype = str(asset.asset_type).upper()
            is_generator = atype in ("POWER_PLANT", "HYDRO_PLANT", "THERMAL_PLANT", "SOLAR_PLANT", "NUCLEAR_PLANT")
            
            # Designate Raigarh as major Slack / Swing bus for WR-NR interconnections
            if asset.asset_id == "WR-RAIGARH":
                b_type = BusType.SLACK
            elif is_generator:
                b_type = BusType.PV
            else:
                b_type = BusType.PQ

            bus_id = f"BUS-{asset.asset_id}"
            
            cap_mw = float(asset.capacity_mw or 1000.0)
            cur_mw = float(asset.current_mw or (cap_mw * 0.70))
            
            buses.append(BusModel(
                bus_id=bus_id,
                asset_id=asset.asset_id,
                name=f"{asset.name} Busbar ({v_val:.0f} kV)",
                voltage_kv=v_val,
                bus_type=b_type,
                voltage_pu=1.00,
                voltage_angle=0.0,
                generation_P=cur_mw if is_generator else 0.0,
                generation_Q=round(cur_mw * 0.25, 1) if is_generator else 0.0,
                load_P=0.0 if is_generator else cur_mw,
                load_Q=0.0 if is_generator else round(cur_mw * 0.32, 1),
                status="ONLINE" if asset.status != "DISCONNECTED" else "OUT_OF_SERVICE",
                provenance=prov_real
            ))

            # If it's a generator asset, create generator injection model
            if is_generator:
                gen_name = f"{asset.name} Generation Units"
                fuel = "THERMAL"
                if "SOLAR" in atype or "SOLAR" in str(asset.name).upper():
                    fuel = "SOLAR"
                elif "HYDRO" in atype or "HYDRO" in str(asset.name).upper():
                    fuel = "HYDRO"
                elif "NUCLEAR" in atype or "NUCLEAR" in str(asset.name).upper():
                    fuel = "NUCLEAR"

                generators.append(GeneratorModel(
                    generator_id=f"GEN-{asset.asset_id}",
                    bus_id=bus_id,
                    asset_id=asset.asset_id,
                    name=gen_name,
                    fuel_type=fuel,
                    Pmin=cap_mw * 0.20,
                    Pmax=cap_mw,
                    Qmin=-cap_mw * 0.25,
                    Qmax=cap_mw * 0.40,
                    current_P=cur_mw,
                    current_Q=round(cur_mw * 0.25, 1),
                    voltage_setpoint_pu=1.01,
                    status="ONLINE" if asset.status != "DISCONNECTED" else "TRIPPED",
                    provenance=prov_real
                ))
            else:
                # Substation / Load Center -> Model load withdrawal
                loads.append(LoadModel(
                    load_id=f"LOAD-{asset.asset_id}",
                    bus_id=bus_id,
                    asset_id=asset.asset_id,
                    name=f"{asset.name} Regional Demand Feeder",
                    P=cur_mw,
                    Q=round(cur_mw * 0.32, 1),
                    load_type="INDUSTRIAL" if "HUB" in asset.name.upper() else "URBAN_DOMESTIC",
                    criticality="HIGH" if cur_mw > 1000 else "MEDIUM",
                    status="ONLINE",
                    provenance=DataProvenance(
                        data_source="POSOCO_SCADA_SNAPSHOT_REFERENCE",
                        source_url="js/data/indiaGridData.js",
                        source_date="2026",
                        verification_status="ESTIMATED",
                        data_classification=DataClassification.REPRESENTATIVE,
                        notes="Representative substation load demand derived from nominal SCADA telemetry snapshots"
                    )
                ))

        # 2. Map Transmission Lines
        for line in lines:
            src_bus = f"BUS-{line.source_asset_id}"
            dst_bus = f"BUS-{line.destination_asset_id}"
            ltype = line.line_type or "400kV_AC"
            benchmarks = CEA_CONDUCTOR_BENCHMARKS.get(ltype, CEA_CONDUCTOR_BENCHMARKS["400kV_AC"])
            
            v_val = 765.0 if "765" in ltype else (800.0 if "800" in ltype else (400.0 if "400" in ltype else 220.0))
            km = float(line.length_km or 100.0)
            r_ohm = round(benchmarks["r_ohm_per_km"] * km, 4)
            x_ohm = round(benchmarks["x_ohm_per_km"] * km, 4)
            b_us = round(benchmarks["b_microsiemens_per_km"] * km, 4)
            
            elec_lines.append(TransmissionLineModel(
                line_id=line.line_id,
                from_bus=src_bus,
                to_bus=dst_bus,
                name=line.name,
                voltage_kv=v_val,
                length_km=km,
                resistance_ohm=r_ohm,
                reactance_ohm=x_ohm,
                susceptance=b_us,
                r_ohm_per_km=benchmarks["r_ohm_per_km"],
                x_ohm_per_km=benchmarks["x_ohm_per_km"],
                b_microsiemens_per_km=benchmarks["b_microsiemens_per_km"],
                thermal_limit_mw=float(line.capacity_mw or 1000.0),
                current_flow_mw=float(line.current_flow_mw or 0.0),
                loading_percent=round((line.current_flow_mw / line.capacity_mw * 100.0), 1) if (line.capacity_mw and line.capacity_mw > 0) else 0.0,
                losses_mw=None,  # Explicitly None (derived by solver)
                status="IN_SERVICE" if line.status != "DISCONNECTED" else "OUT_OF_SERVICE",
                provenance=prov_representative
            ))

        # 3. Map Transformers
        for xfmr in xfmrs:
            parent_bus = f"BUS-{xfmr.asset_id}"
            # For 59-node representation where secondary bus isn't in node table, use primary bus
            elec_xfmrs.append(TransformerModel(
                transformer_id=xfmr.transformer_id,
                from_bus=parent_bus,
                to_bus=parent_bus,
                asset_id=xfmr.asset_id,
                name=xfmr.name,
                rated_mva=float(xfmr.rating_mva or 1000.0),
                primary_kv=float(xfmr.primary_kv or 765.0),
                secondary_kv=float(xfmr.secondary_kv or 400.0),
                impedance_percent=14.0 if xfmr.primary_kv >= 765 else 12.5,
                resistance_percent=0.28,
                tap_position=xfmr.tap_position or 0,
                tap_min=-10,
                tap_max=10,
                loading_percent=float(xfmr.load_percent or 0.0),
                losses_mw=None,
                status="IN_SERVICE" if xfmr.status != "TRIPPED" else "OUT_OF_SERVICE",
                provenance=prov_representative
            ))

        return {
            "network_id": "INDIA_GRID_59",
            "description": "59-Node Indian National Power Grid Electrical Model Staging (CEA / PGCIL Reference Topology)",
            "buses": buses,
            "generators": generators,
            "loads": loads,
            "lines": elec_lines,
            "transformers": elec_xfmrs
        }

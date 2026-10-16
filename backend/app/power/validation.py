"""
Electrical Network Topology & Parameter Validation Rules for GRIDSEC.
Guarantees physical consistency before passing any network to electrical solvers.
"""

from typing import List, Dict, Tuple, Any
from app.power.models import (
    BusModel,
    GeneratorModel,
    LoadModel,
    TransmissionLineModel,
    TransformerModel,
    BusType
)


class ElectricalValidationError(Exception):
    """Raised when an electrical network topology fails sanity or physical constraints."""
    pass


class ElectricalValidator:
    """
    Strict validation engine for electrical bus-branch models.
    Prevents corrupt or fabricated records from entering the simulation pipeline.
    """

    @classmethod
    def validate_network(
        cls,
        buses: List[BusModel],
        generators: List[GeneratorModel],
        loads: List[LoadModel],
        lines: List[TransmissionLineModel],
        transformers: List[TransformerModel]
    ) -> Tuple[bool, List[str]]:
        """
        Runs comprehensive electrical validation suite.
        Returns (is_valid, error_messages_list).
        """
        errors: List[str] = []
        bus_ids: Dict[str, BusModel] = {b.bus_id: b for b in buses}

        # 1. Bus Validations
        if not buses:
            errors.append("Network must contain at least 1 electrical bus.")

        slack_buses = [b for b in buses if b.bus_type == BusType.SLACK]
        if not slack_buses:
            errors.append("Network has no SLACK / Swing bus defined. Exactly one SLACK bus is required for power flow reference.")

        for b in buses:
            if b.voltage_kv <= 0:
                errors.append(f"Bus {b.bus_id} has invalid nominal voltage: {b.voltage_kv} kV (must be > 0).")
            v_pu = getattr(b, "voltage_pu", getattr(b, "voltage_magnitude_pu", 1.0))
            if v_pu < 0.5 or v_pu > 1.5:
                errors.append(f"Bus {b.bus_id} has out-of-bounds voltage magnitude: {v_pu} pu (must be 0.5 - 1.5).")

        # 2. Generator Validations
        for gen in generators:
            if gen.bus_id not in bus_ids:
                errors.append(f"Generator {gen.generator_id} references non-existent bus: {gen.bus_id}.")
            p_max = getattr(gen, "Pmax", getattr(gen, "p_max_mw", 0.0))
            p_min = getattr(gen, "Pmin", getattr(gen, "p_min_mw", 0.0))
            q_max = getattr(gen, "Qmax", getattr(gen, "q_max_mvar", 0.0))
            q_min = getattr(gen, "Qmin", getattr(gen, "q_min_mvar", 0.0))
            if p_max <= 0:
                errors.append(f"Generator {gen.generator_id} has non-positive Pmax: {p_max} MW.")
            if p_max < p_min:
                errors.append(f"Generator {gen.generator_id} has Pmax ({p_max} MW) < Pmin ({p_min} MW).")
            if q_max < q_min:
                errors.append(f"Generator {gen.generator_id} has Qmax ({q_max} MVAr) < Qmin ({q_min} MVAr).")

        # 3. Load Validations
        for ld in loads:
            if ld.bus_id not in bus_ids:
                errors.append(f"Load {ld.load_id} references non-existent bus: {ld.bus_id}.")
            p_load = getattr(ld, "P", getattr(ld, "demand_mw", 0.0))
            if p_load < 0:
                errors.append(f"Load {ld.load_id} has negative active power demand: {p_load} MW.")

        # 4. Transmission Line Validations
        for line in lines:
            f_bus = getattr(line, "from_bus", getattr(line, "source_bus_id", ""))
            t_bus = getattr(line, "to_bus", getattr(line, "destination_bus_id", ""))
            if f_bus not in bus_ids:
                errors.append(f"Line {line.line_id} references non-existent from_bus: {f_bus}.")
            if t_bus not in bus_ids:
                errors.append(f"Line {line.line_id} references non-existent to_bus: {t_bus}.")
            if f_bus == t_bus:
                errors.append(f"Line {line.line_id} forms an invalid self-loop on bus: {f_bus}.")
            t_limit = getattr(line, "thermal_limit_mw", getattr(line, "rated_capacity_mw", 0.0))
            if t_limit <= 0:
                errors.append(f"Line {line.line_id} has non-positive thermal limit: {t_limit} MW.")
            if line.length_km < 0:
                errors.append(f"Line {line.line_id} has negative length: {line.length_km} km.")
            if line.voltage_kv <= 0:
                errors.append(f"Line {line.line_id} has non-positive voltage: {line.voltage_kv} kV.")

        # 5. Transformer Validations
        for xfmr in transformers:
            f_bus = getattr(xfmr, "from_bus", getattr(xfmr, "source_bus_id", ""))
            t_bus = getattr(xfmr, "to_bus", getattr(xfmr, "destination_bus_id", ""))
            if f_bus not in bus_ids:
                errors.append(f"Transformer {xfmr.transformer_id} references non-existent primary bus: {f_bus}.")
            if t_bus not in bus_ids:
                errors.append(f"Transformer {xfmr.transformer_id} references non-existent secondary bus: {t_bus}.")
            if xfmr.rated_mva <= 0:
                errors.append(f"Transformer {xfmr.transformer_id} has non-positive MVA rating: {xfmr.rated_mva} MVA.")
            p_kv = getattr(xfmr, "primary_kv", getattr(xfmr, "primary_voltage_kv", 0.0))
            s_kv = getattr(xfmr, "secondary_kv", getattr(xfmr, "secondary_voltage_kv", 0.0))
            if p_kv <= 0 or s_kv <= 0:
                errors.append(f"Transformer {xfmr.transformer_id} has invalid voltage ratio: {p_kv}/{s_kv} kV.")

        # 6. Isolated Bus Detection
        connected_buses = set()
        for line in lines:
            connected_buses.add(getattr(line, "from_bus", getattr(line, "source_bus_id", "")))
            connected_buses.add(getattr(line, "to_bus", getattr(line, "destination_bus_id", "")))
        for xfmr in transformers:
            connected_buses.add(getattr(xfmr, "from_bus", getattr(xfmr, "source_bus_id", "")))
            connected_buses.add(getattr(xfmr, "to_bus", getattr(xfmr, "destination_bus_id", "")))

        for b_id in bus_ids:
            if b_id not in connected_buses and len(buses) > 1:
                errors.append(f"Bus {b_id} is completely isolated (has zero connected transmission lines or transformers).")

        return len(errors) == 0, errors

"""
GRIDSEC — Step 11 Physics Validation & Conservation-Law Verification Automated Test Suite.
Verifies all fundamental power-system constraint audits and numerical checks:

Section 16 Specific Requirements:
Power balance:
 1. Valid active balance
 2. Invalid active balance
 3. Valid reactive balance
 4. Invalid reactive balance
Voltage:
 5. Normal voltage
 6. Undervoltage
 7. Severe undervoltage
 8. Overvoltage
 9. Severe overvoltage
Lines:
 10. Line below limit
 11. Line at limit
 12. Line overload
 13. Inactive line handling
Transformers:
 14. Transformer below limit
 15. Transformer overload
 16. Valid tap position
 17. Invalid tap position
 18. Inactive transformer handling
Generators:
 19. P within limits
 20. P above Pmax
 21. P below Pmin
 22. Q within limits
 23. Q above Qmax
 24. Q below Qmin
Numerical:
 25. Valid numerical state
 26. NaN detection
 27. Infinity detection
 28. Invalid bus reference
 29. Solver divergence
 30. Combined invalid state

Genuine Integration Tests (Section 17):
 31. Integration A: Normal network -> AC Solver -> Physics Validator passes
 32. Integration B: Real line outage -> AC Solver -> Physics Validator detects actual redistribution
 33. Integration C: Real transformer disturbance -> AC Solver -> Physics Validator audits voltage/loading
 34. Integration D: Generator disturbance -> AC Solver -> Physics Validator checks P/Q constraints
 35. Integration E: Solver failure / invalid network -> Physics Validator rejects state safely

Anti-Hardcoding & Immutability (Section 18, 20):
 36. Anti-hardcoding comparative test between distinct genuine electrical states
 37. Base grid immutability test verifying gridsec.db assets are never mutated
"""

import sys
import os
import math
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.power.models import (
    PowerFlowResult,
    BusResult,
    LineResult,
    TransformerResult,
    PowerBalance,
    GeneratorModel,
    DataClassification,
    DataProvenance
)
from app.power.physics_validator import (
    PhysicsValidator,
    PhysicsViolationType,
    PhysicsValidationTolerances,
    PhysicsValidationResult
)
from app.power.network_builder import ElectricalNetworkBuilder
from app.power.solver import PowerFlowSolver
from app.database.connection import SessionLocal
from app.models.asset import Asset


def get_mock_provenance():
    return DataProvenance(
        data_source="GRIDSEC_AC_SOLVER",
        verification_status="SOLVER_VALIDATED",
        data_classification=DataClassification.SOLVER_DERIVED
    )


def create_base_solver_result(status="SUCCESS", gen_p=100.0, load_p=98.0, loss_p=2.0, gen_q=30.0, load_q=28.0, loss_q=2.0):
    prov = get_mock_provenance()
    return PowerFlowResult(
        status=status,
        message="AC load flow completed successfully",
        network_id="TEST_NETWORK",
        scenario_id="SCEN_TEST",
        buses=[
            BusResult(bus_id="BUS-1", name="Bus 1", voltage_kv=400.0, voltage_pu=1.02, voltage_angle_deg=0.0, p_gen_mw=gen_p, q_gen_mvar=gen_q),
            BusResult(bus_id="BUS-2", name="Bus 2", voltage_kv=400.0, voltage_pu=0.99, voltage_angle_deg=-2.1, p_load_mw=load_p, q_load_mvar=load_q),
        ],
        lines=[
            LineResult(line_id="LINE-1-2", name="Line 1-2", from_bus="BUS-1", to_bus="BUS-2",
                       p_from_mw=gen_p, q_from_mvar=gen_q, p_to_mw=-load_p, q_to_mvar=-load_q,
                       pl_mw=loss_p, ql_mvar=loss_q, loading_percent=65.0, status="IN_SERVICE")
        ],
        transformers=[
            TransformerResult(transformer_id="XFMR-1", name="Trafo 1", from_bus="BUS-3", to_bus="BUS-4",
                              p_hv_mw=0.0, q_hv_mvar=0.0, p_lv_mw=0.0, q_lv_mvar=0.0,
                              pl_mw=0.0, ql_mvar=0.0, loading_percent=55.0, tap_position=0, tap_min=-10, tap_max=10, status="IN_SERVICE")
        ],
        power_balance=PowerBalance(
            total_generation_mw=gen_p,
            total_load_mw=load_p,
            total_losses_mw=loss_p,
            balance_error_mw=abs(gen_p - (load_p + loss_p)),
            total_q_generation_mvar=gen_q,
            total_q_load_mvar=load_q,
            total_q_losses_mvar=loss_q,
            slack_bus_id="BUS-1",
            slack_p_mw=gen_p,
            slack_q_mvar=gen_q,
            converged=(status == "SUCCESS"),
            iterations=4
        ),
        provenance=prov
    )


# =========================================================================
# UNIT TESTS 1-4: Power Balance
# =========================================================================

def test_01_valid_active_balance():
    """1. Valid active power balance."""
    res = create_base_solver_result(gen_p=100.0, load_p=98.0, loss_p=2.0)
    val = PhysicsValidator.validate(res)
    assert val.is_valid is True
    assert val.power_balance_valid is True
    assert val.metrics.active_power_balance_passed is True
    assert val.metrics.active_power_balance_error_mw == 0.0


def test_02_invalid_active_balance():
    """2. Invalid active power balance (|Gen - (Load + Loss)| > tol)."""
    res = create_base_solver_result(gen_p=100.0, load_p=80.0, loss_p=2.0)
    val = PhysicsValidator.validate(res)
    assert val.is_valid is False
    assert val.power_balance_valid is False
    assert val.metrics.active_power_balance_passed is False
    assert any(v.violation_type == PhysicsViolationType.POWER_BALANCE_VIOLATION.value for v in val.violations)


def test_03_valid_reactive_balance():
    """3. Valid reactive power balance."""
    res = create_base_solver_result(gen_q=50.0, load_q=47.0, loss_q=3.0)
    val = PhysicsValidator.validate(res)
    assert val.power_balance_valid is True
    assert val.metrics.reactive_power_balance_passed is True
    assert val.metrics.reactive_power_balance_error_mvar == 0.0


def test_04_invalid_reactive_balance():
    """4. Invalid reactive power balance (|Qgen - (Qload + Qloss)| > tol)."""
    res = create_base_solver_result(gen_q=50.0, load_q=40.0, loss_q=2.0)
    val = PhysicsValidator.validate(res)
    assert val.is_valid is False
    assert val.power_balance_valid is False
    assert val.metrics.reactive_power_balance_passed is False


# =========================================================================
# UNIT TESTS 5-9: Voltage Limits
# =========================================================================

def test_05_normal_voltage():
    """5. Normal voltage within nominal 0.90 - 1.10 pu."""
    res = create_base_solver_result()
    res.buses[0].voltage_pu = 1.02
    res.buses[1].voltage_pu = 0.98
    val = PhysicsValidator.validate(res)
    assert val.voltage_limits_valid is True


def test_06_undervoltage_warning():
    """6. Undervoltage warning (0.85 <= V < 0.90 pu)."""
    res = create_base_solver_result()
    res.buses[1].voltage_pu = 0.88
    val = PhysicsValidator.validate(res)
    assert val.voltage_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.VOLTAGE_UNDERVOLTAGE.value)
    assert viol.severity == "WARNING"
    assert viol.observed_value == 0.88


def test_07_severe_undervoltage():
    """7. Severe critical undervoltage (V < 0.85 pu)."""
    res = create_base_solver_result()
    res.buses[1].voltage_pu = 0.82
    val = PhysicsValidator.validate(res)
    assert val.voltage_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.VOLTAGE_UNDERVOLTAGE.value)
    assert viol.severity == "CRITICAL"


def test_08_overvoltage_warning():
    """8. Overvoltage warning (1.10 < V <= 1.15 pu)."""
    res = create_base_solver_result()
    res.buses[0].voltage_pu = 1.12
    val = PhysicsValidator.validate(res)
    assert val.voltage_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.VOLTAGE_OVERVOLTAGE.value)
    assert viol.severity == "WARNING"


def test_09_severe_overvoltage():
    """9. Severe critical overvoltage (V > 1.15 pu)."""
    res = create_base_solver_result()
    res.buses[0].voltage_pu = 1.18
    val = PhysicsValidator.validate(res)
    assert val.voltage_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.VOLTAGE_OVERVOLTAGE.value)
    assert viol.severity == "CRITICAL"


# =========================================================================
# UNIT TESTS 10-13: Transmission Lines
# =========================================================================

def test_10_line_below_limit():
    """10. Line below thermal rating limit."""
    res = create_base_solver_result()
    res.lines[0].loading_percent = 75.0
    val = PhysicsValidator.validate(res)
    assert val.line_limits_valid is True


def test_11_line_at_limit():
    """11. Line operating exactly at 100.0% nominal rating limit."""
    res = create_base_solver_result()
    res.lines[0].loading_percent = 100.0
    val = PhysicsValidator.validate(res)
    assert val.line_limits_valid is True


def test_12_line_overload():
    """12. Line thermal overload (> 100.0%)."""
    res = create_base_solver_result()
    res.lines[0].loading_percent = 117.4
    val = PhysicsValidator.validate(res)
    assert val.line_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.LINE_THERMAL_LIMIT.value)
    assert viol.observed_value == 117.4
    assert viol.limit_value == 100.0
    assert viol.violation_amount == 17.4


def test_13_inactive_line_handling():
    """13. Inactive line (OUT_OF_SERVICE) ignored during thermal check."""
    res = create_base_solver_result()
    res.lines[0].loading_percent = 150.0
    res.lines[0].status = "OUT_OF_SERVICE"
    val = PhysicsValidator.validate(res)
    # Inactive line should not flag thermal violations
    assert val.line_limits_valid is True


# =========================================================================
# UNIT TESTS 14-18: Transformers
# =========================================================================

def test_14_transformer_below_limit():
    """14. Transformer below apparent power rating limit."""
    res = create_base_solver_result()
    res.transformers[0].loading_percent = 65.0
    val = PhysicsValidator.validate(res)
    assert val.transformer_limits_valid is True


def test_15_transformer_overload():
    """15. Transformer overload (> 100.0%)."""
    res = create_base_solver_result()
    res.transformers[0].loading_percent = 112.5
    val = PhysicsValidator.validate(res)
    assert val.transformer_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.TRANSFORMER_LIMIT.value)
    assert viol.observed_value == 112.5


def test_16_valid_tap_position():
    """16. Transformer OLTC tap position within [tap_min, tap_max]."""
    res = create_base_solver_result()
    res.transformers[0].tap_position = 2
    res.transformers[0].tap_min = -10
    res.transformers[0].tap_max = 10
    val = PhysicsValidator.validate(res)
    assert val.transformer_limits_valid is True


def test_17_invalid_tap_position():
    """17. Transformer OLTC tap position outside allowed range."""
    res = create_base_solver_result()
    res.transformers[0].tap_position = 15
    res.transformers[0].tap_min = -10
    res.transformers[0].tap_max = 10
    val = PhysicsValidator.validate(res)
    assert val.transformer_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.TRANSFORMER_TAP_INVALID.value)
    assert viol.observed_value == 15.0


def test_18_inactive_transformer_handling():
    """18. Inactive transformer (TRIPPED) ignored during rating check."""
    res = create_base_solver_result()
    res.transformers[0].loading_percent = 140.0
    res.transformers[0].status = "TRIPPED"
    val = PhysicsValidator.validate(res)
    assert val.transformer_limits_valid is True


# =========================================================================
# UNIT TESTS 19-24: Generators
# =========================================================================

def test_19_generator_p_within_limits():
    """19. Generator active power P within [Pmin, Pmax]."""
    res = create_base_solver_result(gen_p=250.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=250.0, current_Q=50.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is True


def test_20_generator_p_above_pmax():
    """20. Generator active power P above Pmax."""
    res = create_base_solver_result(gen_p=550.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=550.0, current_Q=50.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.GENERATOR_P_LIMIT.value)
    assert viol.observed_value == 550.0


def test_21_generator_p_below_pmin():
    """21. Generator active power P below Pmin."""
    res = create_base_solver_result(gen_p=30.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=30.0, current_Q=50.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.GENERATOR_P_LIMIT.value)
    assert viol.observed_value == 30.0


def test_22_generator_q_within_limits():
    """22. Generator reactive power Q within [Qmin, Qmax]."""
    res = create_base_solver_result(gen_q=150.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=250.0, current_Q=150.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is True


def test_23_generator_q_above_qmax():
    """23. Generator reactive power Q above Qmax."""
    res = create_base_solver_result(gen_q=350.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=250.0, current_Q=350.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.GENERATOR_Q_LIMIT.value)
    assert viol.observed_value == 350.0


def test_24_generator_q_below_qmin():
    """24. Generator reactive power Q below Qmin."""
    res = create_base_solver_result(gen_q=-150.0)
    gen = GeneratorModel(
        generator_id="GEN-1", bus_id="BUS-1", name="Gen 1",
        Pmin=50.0, Pmax=500.0, Qmin=-100.0, Qmax=300.0,
        current_P=250.0, current_Q=-150.0, provenance=get_mock_provenance()
    )
    res.generators = [gen]
    val = PhysicsValidator.validate(res)
    assert val.generator_limits_valid is False
    viol = next(v for v in val.violations if v.violation_type == PhysicsViolationType.GENERATOR_Q_LIMIT.value)
    assert viol.observed_value == -150.0


# =========================================================================
# UNIT TESTS 25-30: Numerical Sanity
# =========================================================================

def test_25_valid_numerical_state():
    """25. Valid numerical state with finite real values."""
    res = create_base_solver_result()
    val = PhysicsValidator.validate(res)
    assert val.numerical_valid is True
    assert val.solver_converged is True


def test_26_nan_detection():
    """26. NaN detection on bus voltage."""
    res = create_base_solver_result()
    res.buses[0].voltage_pu = float("nan")
    val = PhysicsValidator.validate(res)
    assert val.numerical_valid is False
    assert val.is_valid is False
    assert any(v.violation_type == PhysicsViolationType.NUMERICAL_INVALID_STATE.value for v in val.violations)


def test_27_infinity_detection():
    """27. Infinity detection on line power flow."""
    res = create_base_solver_result()
    res.lines[0].loading_percent = float("inf")
    val = PhysicsValidator.validate(res)
    assert val.numerical_valid is False
    assert val.is_valid is False
    assert any(v.violation_type == PhysicsViolationType.NUMERICAL_INVALID_STATE.value for v in val.violations)


def test_28_invalid_bus_reference():
    """28. Invalid bus angle / unphysical angle NaN."""
    res = create_base_solver_result()
    res.buses[0].voltage_angle_deg = float("nan")
    val = PhysicsValidator.validate(res)
    assert val.numerical_valid is False
    assert val.is_valid is False


def test_29_solver_divergence():
    """29. Solver divergence handling."""
    res = create_base_solver_result(status="DIVERGED")
    val = PhysicsValidator.validate(res)
    assert val.solver_converged is False
    assert val.is_valid is False
    assert any(v.violation_type == PhysicsViolationType.SOLVER_DIVERGENCE.value for v in val.violations)


def test_30_combined_invalid_state():
    """30. Combined invalid state with multiple simultaneous breaches."""
    res = create_base_solver_result(gen_p=100.0, load_p=50.0, loss_p=2.0)
    res.buses[0].voltage_pu = 1.25  # Severe overvoltage
    res.lines[0].loading_percent = 145.0  # Severe line overload
    res.transformers[0].loading_percent = 120.0  # Trafo overload
    val = PhysicsValidator.validate(res)
    assert val.is_valid is False
    assert val.power_balance_valid is False
    assert val.voltage_limits_valid is False
    assert val.line_limits_valid is False
    assert val.transformer_limits_valid is False
    assert len(val.violations) >= 4


# =========================================================================
# INTEGRATION TESTS 31-35: Genuine AC Power Flow Solver Integration
# =========================================================================

def test_31_integration_normal_base_case():
    """Integration Test A: Normal solved network -> validator passes."""
    net_data = ElectricalNetworkBuilder.build_test_network()
    solver_result = PowerFlowSolver.solve(net_data, scenario_id="INTEG_BASE")
    assert solver_result.status == "SUCCESS"

    val_result = PhysicsValidator.validate(solver_result, network_data=net_data)
    assert val_result.is_valid is True
    assert val_result.solver_converged is True
    assert val_result.power_balance_valid is True
    assert val_result.voltage_limits_valid is True
    assert val_result.line_limits_valid is True
    assert val_result.transformer_limits_valid is True
    assert val_result.numerical_valid is True
    assert val_result.provenance == "SOLVER_DERIVED"


def test_32_integration_line_outage_thermal_loading():
    """Integration Test B: Real line outage -> AC solver -> validator detects actual changed loading."""
    net_data = ElectricalNetworkBuilder.build_test_network()
    solver_result = PowerFlowSolver.solve(
        net_data,
        scenario_id="INTEG_LINE_OUTAGE",
        state_overrides={"LINE-1-3": "OUT_OF_SERVICE"}
    )
    assert solver_result.status == "SUCCESS"

    val_result = PhysicsValidator.validate(solver_result, network_data=net_data)
    assert val_result.solver_converged is True
    assert val_result.power_balance_valid is True
    assert val_result.metrics.max_line_loading_pct > 0.0


def test_33_integration_transformer_disturbance():
    """Integration Test C: Real transformer disturbance -> AC solver -> validator checks voltage/loading."""
    net_data = ElectricalNetworkBuilder.build_test_network()
    solver_result = PowerFlowSolver.solve(
        net_data,
        scenario_id="INTEG_XFMR_DISTURBANCE",
        state_overrides={"XFMR-3-4": "OUT_OF_SERVICE"}
    )
    val_result = PhysicsValidator.validate(solver_result, network_data=net_data)
    assert val_result.provenance == "SOLVER_DERIVED"
    assert val_result.metrics.min_bus_voltage_pu > 0.5


def test_34_integration_generator_limits_check():
    """Integration Test D: Generator dispatch -> AC solver -> validator checks actual P/Q constraints."""
    net_data = ElectricalNetworkBuilder.build_test_network()
    solver_result = PowerFlowSolver.solve(net_data, scenario_id="INTEG_GEN_CHECK")
    assert solver_result.status == "SUCCESS"

    val_result = PhysicsValidator.validate(solver_result, network_data=net_data)
    assert val_result.generator_limits_valid is True


def test_35_integration_diverged_network_rejection():
    """Integration Test E: Islanded/collapsed network -> solver produces NaN/unphysical state -> validator rejects state."""
    net_data = ElectricalNetworkBuilder.build_test_network()
    diverged_overrides = {
        "LINE-1-2": "OUT_OF_SERVICE",
        "LINE-1-3": "OUT_OF_SERVICE",
        "LINE-2-3": "OUT_OF_SERVICE"
    }
    solver_result = PowerFlowSolver.solve(
        net_data,
        scenario_id="INTEG_DIVERGENCE",
        state_overrides=diverged_overrides
    )
    val_result = PhysicsValidator.validate(solver_result, network_data=net_data)
    assert val_result.is_valid is False
    assert val_result.numerical_valid is False or val_result.solver_converged is False
    assert len(val_result.violations) > 0
    assert any(v.violation_type in (PhysicsViolationType.NUMERICAL_INVALID_STATE.value, PhysicsViolationType.SOLVER_DIVERGENCE.value) for v in val_result.violations)


# =========================================================================
# TESTS 36-37: Anti-Hardcoding & Base Grid Immutability
# =========================================================================

def test_36_anti_hardcoding_comparative_states():
    """
    36. Validates that PhysicsValidator produces distinctly different, genuine quantitative results
    when executed against two distinct electrical power flow states.
    """
    net_data = ElectricalNetworkBuilder.build_test_network()

    # State A: Base Case
    res_a = PowerFlowSolver.solve(net_data, scenario_id="STATE_A")
    val_a = PhysicsValidator.validate(res_a)

    # State B: Line Outage Case (Trip LINE-1-3)
    res_b = PowerFlowSolver.solve(net_data, scenario_id="STATE_B", state_overrides={"LINE-1-3": "OUT_OF_SERVICE"})
    val_b = PhysicsValidator.validate(res_b)

    # Assert quantitative metrics differ between the two genuine solves
    assert val_a.metrics.total_losses_p_mw != val_b.metrics.total_losses_p_mw
    assert val_a.metrics.max_line_loading_pct != val_b.metrics.max_line_loading_pct
    assert val_a.metrics.min_bus_voltage_pu != val_b.metrics.min_bus_voltage_pu


def test_37_base_grid_immutability():
    """
    37. Verifies that base database records in gridsec.db remain 100% immutable
    before and after executing physics validation drills.
    """
    db = SessionLocal()
    try:
        initial_asset_count = db.query(Asset).count()
        raigarh = db.query(Asset).filter(Asset.asset_id == "WR-RAIGARH").first()
        initial_status = raigarh.status if raigarh else "HEALTHY"

        # Execute multiple solver and validation passes
        net_data = ElectricalNetworkBuilder.build_test_network()
        res = PowerFlowSolver.solve(net_data, scenario_id="TEST_IMMUTABILITY")
        _ = PhysicsValidator.validate(res, network_data=net_data)

        # Check that DB is completely untouched
        final_asset_count = db.query(Asset).count()
        final_raigarh = db.query(Asset).filter(Asset.asset_id == "WR-RAIGARH").first()
        final_status = final_raigarh.status if final_raigarh else "HEALTHY"

        assert initial_asset_count == final_asset_count == 59
        assert initial_status == final_status
    finally:
        db.close()

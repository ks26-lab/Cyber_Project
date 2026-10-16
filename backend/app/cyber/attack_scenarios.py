"""
Catalog of Safe Predefined Synthetic Cyber Attack Scenarios for GRIDSEC.
All scenarios represent controlled mock events inside the sandbox simulation environment.
"""

from typing import Dict, List, Any, Optional
from app.schemas.cyber_attack import AttackCategory, SyntheticScenarioDefinition


PREDEFINED_SCENARIOS: Dict[str, SyntheticScenarioDefinition] = {
    "SCENARIO_A_BREAKER_TRIP": SyntheticScenarioDefinition(
        scenario_id="SCENARIO_A_BREAKER_TRIP",
        name="Scenario 1: Unauthorized DNP3 Breaker Open Command",
        category=AttackCategory.UNAUTHORIZED_CONTROL,
        description="Malicious unauthorized SCADA trip command sent to transmission corridor breaker causing unexpected line outage.",
        default_target="LINE-1-3",
        default_protocol="DNP3",
        default_severity="CRITICAL",
        simulated_action="OPEN_BREAKER",
        parameter_defaults={
            "command_name": "TRIP_BREAKER",
            "authorization_status": "FAILED",
            "source_identifier": "UNAUTHORIZED_REMOTE_IP:192.168.10.84",
            "protocol": "DNP3",
            "apply_physical_consequence": True
        }
    ),
    "SCENARIO_B_TELEMETRY_ANOMALY": SyntheticScenarioDefinition(
        scenario_id="SCENARIO_B_TELEMETRY_ANOMALY",
        name="Scenario 2: False Data Injection / Telemetry Integrity Anomaly (SCN-002)",
        category=AttackCategory.TELEMETRY_INTEGRITY,
        description="Synthetic false data injection modifying reported active power/voltage telemetry while sandbox AC power-flow remains physically untouched.",
        default_target="BUS-2",
        default_protocol="IEEE_C37.118",
        default_severity="HIGH",
        simulated_action="MANIPULATE_TELEMETRY",
        parameter_defaults={
            "command_name": "INJECT_FALSE_TELEMETRY",
            "authorization_status": "UNVERIFIED",
            "source_identifier": "COMPROMISED_PMU_GATEWAY",
            "measurement_type": "ACTIVE_POWER_MW",
            "reported_value": 520.0,
            "expected_baseline_value": 680.0,
            "manipulation_factor": 0.765,
            "protocol": "IEEE_C37.118",
            "apply_physical_consequence": False
        }
    ),
    "SCENARIO_C_CONFIG_TAMPER": SyntheticScenarioDefinition(
        scenario_id="SCENARIO_C_CONFIG_TAMPER",
        name="Scenario 3: Unauthorized Substation Transformer Tap Alteration (SCN-003)",
        category=AttackCategory.CONFIGURATION_TAMPERING,
        description="Unauthorized modification of transformer on-load tap changer (OLTC) stepping voltage beyond nominal thresholds.",
        default_target="XFMR-3-4",
        default_protocol="IEC_61850",
        default_severity="HIGH",
        simulated_action="MODIFY_TAP_CONFIGURATION",
        parameter_defaults={
            "command_name": "SET_TAP_POSITION_4",
            "configuration_parameter": "TAP_POSITION",
            "previous_value": 0,
            "requested_value": 4,
            "previous_tap": 0,
            "requested_tap": 4,
            "tap_min": -10,
            "tap_max": 10,
            "authorization_status": "FAILED",
            "source_identifier": "ROGUE_SUBSTATION_HMI:10.0.8.22",
            "protocol": "IEC_61850",
            "apply_physical_consequence": True
        }
    ),
    "SCENARIO_D_REPEATED_PROBE": SyntheticScenarioDefinition(
        scenario_id="SCENARIO_D_REPEATED_PROBE",
        name="Scenario 4: Repeated Suspicious SCADA Probing (SCN-004)",
        category=AttackCategory.RECONNAISSANCE_PROBING,
        description="Repeated unauthorized polling, configuration reads, and status queries across multiple grid assets within a short temporal window.",
        default_target="BUS-1",
        default_protocol="MODBUS_TCP",
        default_severity="HIGH",
        simulated_action="RECONNAISSANCE_PROBING",
        parameter_defaults={
            "command_name": "STATUS_QUERY_SCAN",
            "authorization_status": "FAILED",
            "source_identifier": "suspicious_client_01",
            "target_asset_ids": ["BUS-1", "BUS-2", "LINE-1-2", "XFMR-3-4", "BUS-3"],
            "event_count": 5,
            "time_window_seconds": 22.0,
            "protocol": "MODBUS_TCP",
            "apply_physical_consequence": False
        }
    ),
    "SCENARIO_E_COORDINATED_ATTACK": SyntheticScenarioDefinition(
        scenario_id="SCENARIO_E_COORDINATED_ATTACK",
        name="Scenario 5: Coordinated Multi-Asset Cyber Campaign (SCN-005)",
        category=AttackCategory.COORDINATED_CAMPAIGN,
        description="A sequence of suspicious cyber events targeting multiple related grid assets is correlated into a potential coordinated campaign.",
        default_target="LINE-1-3",
        default_protocol="IEC_60870_5_104",
        default_severity="CRITICAL",
        simulated_action="COORDINATED_CAMPAIGN_SEQUENCE",
        parameter_defaults={
            "command_name": "COORDINATED_CAMPAIGN_SEQUENCE",
            "authorization_status": "BYPASSED",
            "source_identifier": "DISTRIBUTED_APT_ACTOR",
            "target_asset_ids": ["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"],
            "time_window_seconds": 60.0,
            "event_count": 4,
            "protocol": "IEC_60870_5_104",
            "apply_physical_consequence": True
        }
    )
}


class ScenarioCatalog:
    """Helper service to retrieve scenario definitions."""

    @staticmethod
    def get_all_scenarios() -> List[SyntheticScenarioDefinition]:
        return list(PREDEFINED_SCENARIOS.values())

    @staticmethod
    def get_scenario(scenario_id: str) -> Optional[SyntheticScenarioDefinition]:
        if not scenario_id:
            return None
        sid = scenario_id.upper().strip()
        if sid in ("SCN-001", "SCENARIO_1", "ATTACK_1", "SCENARIO_A_BREAKER_TRIP"):
            return PREDEFINED_SCENARIOS.get("SCENARIO_A_BREAKER_TRIP")
        if sid in ("SCN-002", "SCENARIO_2", "ATTACK_2", "SCENARIO_B_TELEMETRY_ANOMALY", "FDIA"):
            return PREDEFINED_SCENARIOS.get("SCENARIO_B_TELEMETRY_ANOMALY")
        if sid in ("SCN-003", "SCENARIO_3", "ATTACK_3", "SCENARIO_C_CONFIG_TAMPER"):
            return PREDEFINED_SCENARIOS.get("SCENARIO_C_CONFIG_TAMPER")
        if sid in ("SCN-004", "SCENARIO_4", "ATTACK_4", "SCENARIO_D_REPEATED_PROBE"):
            return PREDEFINED_SCENARIOS.get("SCENARIO_D_REPEATED_PROBE")
        if sid in ("SCN-005", "SCENARIO_5", "ATTACK_5", "SCENARIO_E_COORDINATED_ATTACK", "COORDINATED_CAMPAIGN", "COORDINATED_ATTACK"):
            return PREDEFINED_SCENARIOS.get("SCENARIO_E_COORDINATED_ATTACK")
        return PREDEFINED_SCENARIOS.get(scenario_id)


SCENARIO_A_BREAKER_TRIP = PREDEFINED_SCENARIOS["SCENARIO_A_BREAKER_TRIP"]
SCENARIO_B_TELEMETRY_ANOMALY = PREDEFINED_SCENARIOS["SCENARIO_B_TELEMETRY_ANOMALY"]
SCENARIO_C_CONFIG_TAMPER = PREDEFINED_SCENARIOS["SCENARIO_C_CONFIG_TAMPER"]
SCENARIO_D_REPEATED_PROBE = PREDEFINED_SCENARIOS["SCENARIO_D_REPEATED_PROBE"]
SCENARIO_E_COORDINATED_ATTACK = PREDEFINED_SCENARIOS["SCENARIO_E_COORDINATED_ATTACK"]

SCENARIO_CATALOG = ScenarioCatalog
get_scenario_by_id = ScenarioCatalog.get_scenario
list_active_scenarios = ScenarioCatalog.get_all_scenarios
AttackType = AttackCategory

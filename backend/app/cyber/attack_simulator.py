"""
Synthetic Attack Simulator for GRIDSEC.
Generates controlled synthetic observable events inside the sandbox environment.
Maintains ground truth strictly for offline testing evaluation.
Supports dynamic target selection and deterministic pseudo-random seed reproducibility.
"""

import uuid
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Union

from app.schemas.cyber_attack import (
    SyntheticCyberEvent,
    ObservedFacts,
    CyberSimulationRequest,
    SyntheticScenarioDefinition
)
from app.cyber.attack_scenarios import PREDEFINED_SCENARIOS, ScenarioCatalog


class DynamicTargetSelector:
    """
    Dynamically identifies and selects eligible grid targets per attack scenario.
    Provides deterministic selection with pseudo-random seed support.
    """
    
    TEST_GRID_LINES = ["LINE-1-2", "LINE-1-3", "LINE-2-3"]
    TEST_GRID_XFMRS = ["XFMR-3-4"]
    TEST_GRID_BUSES = ["BUS-1", "BUS-2", "BUS-3", "BUS-4"]

    IEEE30_LINES = [
        "LINE-1-2", "LINE-1-3", "LINE-2-4", "LINE-3-4", "LINE-2-5", "LINE-2-6",
        "LINE-4-6", "LINE-5-7", "LINE-6-7", "LINE-6-8", "LINE-9-11", "LINE-9-10",
        "LINE-12-13", "LINE-12-14", "LINE-12-15", "LINE-12-16", "LINE-14-15",
        "LINE-16-17", "LINE-15-18", "LINE-18-19", "LINE-19-20", "LINE-10-20",
        "LINE-10-17", "LINE-10-21", "LINE-10-22", "LINE-21-22", "LINE-15-23",
        "LINE-22-24", "LINE-23-24", "LINE-24-25", "LINE-25-26", "LINE-25-27",
        "LINE-27-29", "LINE-27-30", "LINE-29-30", "LINE-8-28", "LINE-6-28"
    ]
    IEEE30_XFMRS = ["XFMR-6-9", "XFMR-6-10", "XFMR-4-12", "XFMR-28-27"]
    IEEE30_BUSES = [f"BUS-{i}" for i in range(1, 31)]
    
    @classmethod
    def get_eligible_targets(
        cls,
        scenario_id: Optional[str],
        db: Optional[Any] = None,
        network_id: Optional[str] = None
    ) -> List[str]:
        """
        Returns list of valid eligible asset IDs for the given scenario based on real network models.
        """
        sid = (scenario_id or "").upper().strip()
        nid = (network_id or "TEST_NETWORK").upper().strip()

        # Handle IEEE 30-bus benchmark specifically
        if nid in ("IEEE_30", "IEEE_30_BUS", "IEEE30", "CASE30"):
            if "BREAKER" in sid or "SCN-001" in sid or "UNAUTHORIZED_CONTROL" in sid or "SCENARIO_A" in sid or "ATTACK_1" in sid:
                return list(cls.IEEE30_LINES) + list(cls.IEEE30_XFMRS)
            elif "TELEMETRY" in sid or "SCN-002" in sid or "FDIA" in sid or "SCENARIO_B" in sid or "ATTACK_2" in sid:
                return list(cls.IEEE30_BUSES) + list(cls.IEEE30_LINES)
            elif "CONFIG" in sid or "SCN-003" in sid or "TAP" in sid or "SCENARIO_C" in sid or "ATTACK_3" in sid:
                return list(cls.IEEE30_XFMRS)
            elif "RECON" in sid or "SCN-004" in sid or "PROBE" in sid or "SCENARIO_D" in sid or "ATTACK_4" in sid:
                return list(cls.IEEE30_BUSES)
            elif "CAMPAIGN" in sid or "SCN-005" in sid or "COORDINATED" in sid or "SCENARIO_E" in sid or "ATTACK_5" in sid:
                return list(cls.IEEE30_BUSES) + list(cls.IEEE30_XFMRS) + list(cls.IEEE30_LINES)
            return list(cls.IEEE30_LINES)
        
        # 1. Unauthorized Control: Controllable switching corridors / breakers
        if "BREAKER" in sid or "SCN-001" in sid or "UNAUTHORIZED_CONTROL" in sid or "SCENARIO_A" in sid or "ATTACK_1" in sid or "SCENARIO_1" in sid:
            targets = list(cls.TEST_GRID_LINES) + list(cls.TEST_GRID_XFMRS)
            if db and nid in ("INDIA_GRID_59", "INDIA_GRID", "NATIONAL_GRID"):
                try:
                    from app.models.transmission import TransmissionLine
                    lines = db.query(TransmissionLine.line_id).filter(TransmissionLine.status == "IN_SERVICE").all()
                    if lines:
                        targets = [l[0] for l in lines]
                except Exception:
                    pass
            return targets

        # 2. Telemetry Integrity: Telemetry-capable buses & branches
        if "TELEMETRY" in sid or "SCN-002" in sid or "FDIA" in sid or "SCENARIO_B" in sid or "ATTACK_2" in sid or "SCENARIO_2" in sid:
            targets = list(cls.TEST_GRID_BUSES) + list(cls.TEST_GRID_LINES)
            if db and nid in ("INDIA_GRID_59", "INDIA_GRID", "NATIONAL_GRID"):
                try:
                    from app.models.asset import Asset
                    buses = db.query(Asset.asset_id).all()
                    if buses:
                        targets = [b[0] for b in buses]
                except Exception:
                    pass
            return targets

        # 3. Configuration Tampering: Transformer OLTC bays
        if "CONFIG" in sid or "SCN-003" in sid or "TAP" in sid or "SCENARIO_C" in sid or "ATTACK_3" in sid or "SCENARIO_3" in sid:
            targets = list(cls.TEST_GRID_XFMRS)
            if db and nid in ("INDIA_GRID_59", "INDIA_GRID", "NATIONAL_GRID"):
                try:
                    from app.models.asset import TransformerBay
                    xfmrs = db.query(TransformerBay.bay_id).all()
                    if xfmrs:
                        targets = [x[0] for x in xfmrs]
                except Exception:
                    pass
            return targets

        # 4. Reconnaissance / Probing: Topology reachable assets
        if "RECON" in sid or "SCN-004" in sid or "PROBE" in sid or "SCENARIO_D" in sid or "ATTACK_4" in sid or "SCENARIO_4" in sid:
            if db and nid in ("INDIA_GRID_59", "INDIA_GRID", "NATIONAL_GRID"):
                try:
                    from app.models.asset import Asset
                    buses = db.query(Asset.asset_id).all()
                    if buses:
                        return [b[0] for b in buses]
                except Exception:
                    pass
            return list(cls.TEST_GRID_BUSES) + list(cls.TEST_GRID_LINES) + list(cls.TEST_GRID_XFMRS)

        # 5. Coordinated Campaign: Diverse multi-asset classes
        if "CAMPAIGN" in sid or "SCN-005" in sid or "COORDINATED" in sid or "SCENARIO_E" in sid or "ATTACK_5" in sid or "SCENARIO_5" in sid:
            return list(cls.TEST_GRID_BUSES) + list(cls.TEST_GRID_XFMRS) + list(cls.TEST_GRID_LINES)

        return list(cls.TEST_GRID_LINES) + list(cls.TEST_GRID_BUSES)

    @classmethod
    def select_target(
        cls,
        scenario_id: Optional[str],
        seed: Optional[int] = None,
        db: Optional[Any] = None,
        network_id: Optional[str] = None
    ) -> str:
        """
        Deterministically selects a single eligible target based on optional seed.
        """
        eligible = cls.get_eligible_targets(scenario_id, db, network_id=network_id)
        if not eligible:
            return "LINE-1-3"
        rng = random.Random(seed) if seed is not None else random.Random()
        return rng.choice(eligible)

    @classmethod
    def select_multi_targets(
        cls,
        scenario_id: Optional[str],
        count: int = 4,
        seed: Optional[int] = None,
        db: Optional[Any] = None,
        network_id: Optional[str] = None
    ) -> List[str]:
        """
        Deterministically selects multiple eligible targets for reconnaissance or coordinated campaigns.
        """
        eligible = cls.get_eligible_targets(scenario_id, db, network_id=network_id)
        rng = random.Random(seed) if seed is not None else random.Random()
        if not eligible:
            nid = (network_id or "").upper()
            if nid in ("IEEE_30", "IEEE_30_BUS", "IEEE30"):
                return ["BUS-1", "XFMR-6-9", "LINE-1-2", "BUS-2"]
            return ["BUS-1", "XFMR-3-4", "LINE-1-3", "BUS-2"]

        sid = (scenario_id or "").upper().strip()
        if "CAMPAIGN" in sid or "SCN-005" in sid or "COORDINATED" in sid or "SCENARIO_E" in sid or "ATTACK_5" in sid or "SCENARIO_5" in sid:
            buses = [t for t in eligible if "BUS" in t or "SUB" in t] or (cls.IEEE30_BUSES if network_id in ("IEEE_30", "IEEE_30_BUS") else cls.TEST_GRID_BUSES)
            xfmrs = [t for t in eligible if "XFMR" in t or "TRAFO" in t] or (cls.IEEE30_XFMRS if network_id in ("IEEE_30", "IEEE_30_BUS") else cls.TEST_GRID_XFMRS)
            lines = [t for t in eligible if "LINE" in t] or (cls.IEEE30_LINES if network_id in ("IEEE_30", "IEEE_30_BUS") else cls.TEST_GRID_LINES)

            t0 = rng.choice(buses)
            t1 = rng.choice(xfmrs)
            t2 = rng.choice(lines)
            remaining_buses = [b for b in buses if b != t0] or buses
            t3 = rng.choice(remaining_buses)
            return [t0, t1, t2, t3]

        if len(eligible) >= count:
            return rng.sample(eligible, count)
        return [rng.choice(eligible) for _ in range(count)]


class AttackSimulator:
    """
    Generates synthetic observable events for cyber security drills and testing.
    Strictly isolated from detection / classification inferences.
    """

    def generate_synthetic_sequence(
        self,
        request: Optional[Union[CyberSimulationRequest, Dict[str, Any]]] = None,
        **kwargs
    ) -> List[SyntheticCyberEvent]:
        """
        Generates a deterministic synthetic sequence of observable cyber events
        representing repeated reconnaissance, probing, or multi-asset activity.
        """
        if request is None:
            scenario_id = kwargs.get("scenario_id") or "SCENARIO_D_REPEATED_PROBE"
            request = CyberSimulationRequest(
                scenario_id=scenario_id,
                **kwargs
            )
        elif isinstance(request, dict):
            request = CyberSimulationRequest(**request)

        seed = request.seed if request.seed is not None else kwargs.get("seed")
        rng = random.Random(seed) if seed is not None else random.Random()

        scenario_def = ScenarioCatalog.get_scenario(request.scenario_id or "SCENARIO_D_REPEATED_PROBE")
        
        source = request.source_identity or kwargs.get("source_identity") or kwargs.get("source") or (
            scenario_def.parameter_defaults.get("source_identifier", "suspicious_client_01") if scenario_def else "suspicious_client_01"
        )
        
        targets = request.target_asset_ids or kwargs.get("target_asset_ids") or kwargs.get("target_assets") or kwargs.get("targets")
        net_id = getattr(request, "baseline_network", None) or kwargs.get("baseline_network") or "TEST_NETWORK"
        if not targets or targets == ["AUTO"]:
            targets = DynamicTargetSelector.select_multi_targets(request.scenario_id, count=5, seed=seed, network_id=net_id)
        elif isinstance(targets, str):
            targets = [targets]

        event_count = request.event_count or kwargs.get("event_count") or kwargs.get("count") or (
            scenario_def.parameter_defaults.get("event_count", len(targets)) if scenario_def else len(targets)
        )
        event_count = max(1, int(event_count))
        
        time_window = request.time_window_seconds or kwargs.get("time_window_seconds") or kwargs.get("time_window") or (
            scenario_def.parameter_defaults.get("time_window_seconds", 22.0) if scenario_def else 22.0
        )
        time_window = float(time_window)
        
        protocol = request.protocol or kwargs.get("protocol") or (scenario_def.default_protocol if scenario_def else "MODBUS_TCP")
        auth_status = request.authorization_status or kwargs.get("auth_status") or kwargs.get("authorization_status") or (
            scenario_def.parameter_defaults.get("authorization_status", "FAILED") if scenario_def else "FAILED"
        )
        
        probe_actions = [
            "CONFIGURATION_READ",
            "STATUS_QUERY",
            "READ_HOLDING_REGISTERS",
            "DIAGNOSTIC_POLL",
            "TELEMETRY_POLL"
        ]
        
        base_time = datetime.now(timezone.utc) - timedelta(seconds=time_window)
        step_delta = time_window / max(1, event_count)
        
        events: List[SyntheticCyberEvent] = []
        for i in range(event_count):
            target = targets[i % len(targets)]
            action = probe_actions[i % len(probe_actions)]
            event_ts = (base_time + timedelta(seconds=round(i * step_delta, 2))).isoformat()
            
            raw_payload = f"[{protocol}] SRC={source} TGT={target} CMD={action} AUTH={auth_status}"
            observed = ObservedFacts(
                timestamp=event_ts,
                source_identifier=source,
                raw_protocol=protocol,
                command_name=action,
                authorization_status=auth_status,
                raw_payload_sample=raw_payload,
                target_asset_ref=target
            )
            
            if "XFMR" in target.upper() or "TRAFO" in target.upper():
                asset_type_str = "TRANSFORMER"
            elif "LINE" in target.upper():
                asset_type_str = "TRANSMISSION_LINE"
            else:
                asset_type_str = "SUBSTATION"
                
            event_id = f"EVT-RECON-{i+1:03d}-{uuid.uuid4().hex[:6].upper()}"
            events.append(SyntheticCyberEvent(
                event_id=event_id,
                scenario_id=request.scenario_id or "SCN-004",
                target_asset=target,
                target_asset_type=asset_type_str,
                observed=observed,
                ground_truth_category="RECONNAISSANCE_PROBING",
                ground_truth_action=action,
                simulation_id=request.simulation_id
            ))
            
        return events

    def generate_coordinated_campaign_sequence(
        self,
        request: Optional[Union[CyberSimulationRequest, Dict[str, Any]]] = None,
        **kwargs
    ) -> List[SyntheticCyberEvent]:
        """
        Generates a deterministic synthetic sequence of observable cyber events
        representing a coordinated multi-vector cyber campaign (Attack 5 / SCN-005):
        - T0: Reconnaissance probing on Asset A (e.g. BUS-1)
        - T1: Unauthorized configuration change on Asset B (e.g. XFMR-3-4)
        - T2: Unauthorized breaker control command on Asset C (e.g. LINE-1-3)
        - T3: Telemetry integrity manipulation anomaly on Asset D/A (e.g. BUS-2)
        """
        if request is None:
            scenario_id = kwargs.get("scenario_id") or "SCENARIO_E_COORDINATED_ATTACK"
            request = CyberSimulationRequest(
                scenario_id=scenario_id,
                **kwargs
            )
        elif isinstance(request, dict):
            request = CyberSimulationRequest(**request)

        seed = request.seed if request.seed is not None else kwargs.get("seed")
        rng = random.Random(seed) if seed is not None else random.Random()

        scenario_def = ScenarioCatalog.get_scenario(request.scenario_id or "SCENARIO_E_COORDINATED_ATTACK")
        source = request.source_identity or kwargs.get("source_identity") or kwargs.get("source") or (
            scenario_def.parameter_defaults.get("source_identifier", "DISTRIBUTED_APT_ACTOR") if scenario_def else "DISTRIBUTED_APT_ACTOR"
        )
        
        targets = request.target_asset_ids or kwargs.get("target_asset_ids") or kwargs.get("target_assets")
        net_id = getattr(request, "baseline_network", None) or kwargs.get("baseline_network") or "TEST_NETWORK"
        if not targets or targets == ["AUTO"]:
            targets = DynamicTargetSelector.select_multi_targets(request.scenario_id, count=4, seed=seed, network_id=net_id)
        elif isinstance(targets, str):
            targets = [targets]

        time_window = float(request.time_window_seconds or kwargs.get("time_window_seconds") or 60.0)
        base_time = datetime.now(timezone.utc) - timedelta(seconds=time_window)

        # 4 Multi-Vector Campaign Steps
        phases = [
            {
                "phase_name": "RECONNAISSANCE_PROBE",
                "default_target": targets[0] if len(targets) > 0 else "BUS-1",
                "target_type": "SUBSTATION",
                "protocol": "MODBUS_TCP",
                "cmd": "CONFIGURATION_READ",
                "auth": "FAILED",
                "category": "RECONNAISSANCE_PROBING",
                "extra": {}
            },
            {
                "phase_name": "CONFIGURATION_TAMPERING",
                "default_target": targets[1] if len(targets) > 1 else "XFMR-3-4",
                "target_type": "TRANSFORMER",
                "protocol": "IEC_61850",
                "cmd": "SET_TAP_POSITION_4",
                "auth": "FAILED",
                "category": "CONFIGURATION_TAMPERING",
                "extra": {
                    "configuration_parameter": "TAP_POSITION",
                    "previous_tap": 0,
                    "requested_tap": 4,
                    "tap_min": -10,
                    "tap_max": 10,
                    "tap_delta": 4
                }
            },
            {
                "phase_name": "UNAUTHORIZED_BREAKER_CONTROL",
                "default_target": targets[2] if len(targets) > 2 else "LINE-1-3",
                "target_type": "TRANSMISSION_LINE",
                "protocol": "DNP3",
                "cmd": "TRIP_BREAKER",
                "auth": "BYPASSED",
                "category": "UNAUTHORIZED_CONTROL",
                "extra": {}
            },
            {
                "phase_name": "TELEMETRY_MANIPULATION",
                "default_target": targets[3] if len(targets) > 3 else "BUS-2",
                "target_type": "SUBSTATION",
                "protocol": "IEEE_C37.118",
                "cmd": "INJECT_FALSE_TELEMETRY",
                "auth": "UNVERIFIED",
                "category": "TELEMETRY_INTEGRITY",
                "extra": {
                    "measurement_type": "ACTIVE_POWER_MW",
                    "reported_value": 520.0,
                    "expected_baseline_value": 680.0,
                    "discrepancy_magnitude": 160.0,
                    "relative_error_pct": 23.53,
                    "manipulation_factor": 0.765
                }
            }
        ]

        events: List[SyntheticCyberEvent] = []
        step_interval = time_window / max(1, len(phases))

        for idx, phase in enumerate(phases):
            tgt = targets[idx % len(targets)] if targets else phase["default_target"]
            tgt_type = "TRANSFORMER" if ("XFMR" in tgt.upper() or "TRAFO" in tgt.upper()) else ("TRANSMISSION_LINE" if "LINE" in tgt.upper() else "SUBSTATION")
            
            event_ts = (base_time + timedelta(seconds=round(idx * step_interval, 2))).isoformat()
            raw_payload = f"[{phase['protocol']}] SRC={source} TGT={tgt} CMD={phase['cmd']} AUTH={phase['auth']}"
            if "requested_tap" in phase["extra"]:
                raw_payload += f" TAP={phase['extra']['requested_tap']}"
            if "reported_value" in phase["extra"]:
                raw_payload += f" MW={phase['extra']['reported_value']} (REF={phase['extra']['expected_baseline_value']})"

            obs_kwargs = {
                "timestamp": event_ts,
                "source_identifier": source,
                "raw_protocol": phase["protocol"],
                "command_name": phase["cmd"],
                "authorization_status": phase["auth"],
                "raw_payload_sample": raw_payload,
                "target_asset_ref": tgt,
                **phase["extra"]
            }
            observed = ObservedFacts(**obs_kwargs)
            event_id = f"EVT-CAMPAIGN-{idx+1:02d}-{uuid.uuid4().hex[:6].upper()}"

            events.append(SyntheticCyberEvent(
                event_id=event_id,
                scenario_id=request.scenario_id or "SCN-005",
                target_asset=tgt,
                target_asset_type=tgt_type,
                observed=observed,
                ground_truth_category=phase["category"],
                ground_truth_action=phase["cmd"],
                simulation_id=request.simulation_id
            ))

        return events

    def generate_synthetic_event(
        self,
        request: Optional[Union[CyberSimulationRequest, Dict[str, Any]]] = None,
        **kwargs
    ) -> SyntheticCyberEvent:
        """
        Synthesizes an observable event from a scenario preset, request model, or kwargs.
        Applies dynamic target selection and parameter calculation when not explicitly provided.
        """
        if request is None:
            scenario_id = kwargs.get("scenario_id")
            target_asset = kwargs.get("target_asset") or kwargs.get("target_asset_id")
            auth_status = kwargs.get("auth_status") or kwargs.get("authorization_status")
            source_id = kwargs.get("source_identity") or kwargs.get("source")
            seed = kwargs.get("seed")
            request = CyberSimulationRequest(
                scenario_id=scenario_id,
                target_asset_id=target_asset,
                authorization_status=auth_status,
                source_identity=source_id,
                seed=seed,
                **{k: v for k, v in kwargs.items() if k not in ("scenario_id", "target_asset", "target_asset_id", "auth_status", "authorization_status", "source_identity", "source", "seed")}
            )
        elif isinstance(request, dict):
            request = CyberSimulationRequest(**request)

        seed = request.seed if request.seed is not None else kwargs.get("seed")
        rng = random.Random(seed) if seed is not None else random.Random()

        event_id = f"EVT-CYBER-{uuid.uuid4().hex[:8].upper()}"
        scenario_def: Optional[SyntheticScenarioDefinition] = None
        if request.scenario_id:
            scenario_def = ScenarioCatalog.get_scenario(request.scenario_id)

        # Dynamic target selection if not specified or specified as AUTO
        target_asset = request.target_asset_id
        if not target_asset or target_asset == "AUTO":
            target_asset = DynamicTargetSelector.select_target(request.scenario_id, seed=seed)
        elif scenario_def and not target_asset:
            target_asset = scenario_def.default_target

        protocol = request.protocol or (scenario_def.default_protocol if scenario_def else "DNP3")
        auth_status = request.authorization_status or (
            scenario_def.parameter_defaults.get("authorization_status", "FAILED") if scenario_def else "FAILED"
        )
        cmd_name = request.command_name or (
            scenario_def.parameter_defaults.get("command_name", "TRIP_BREAKER") if scenario_def else "TRIP_BREAKER"
        )
        source_id = request.source_identity or (
            scenario_def.parameter_defaults.get("source_identifier", "SIMULATED_SCADA_CLIENT") if scenario_def else "SIMULATED_SCADA_CLIENT"
        )
        meas_type = request.measurement_type or (
            scenario_def.parameter_defaults.get("measurement_type", "ACTIVE_POWER_MW") if scenario_def else "ACTIVE_POWER_MW"
        )

        expected_val = getattr(request, "expected_baseline_value", None)
        if expected_val is None and scenario_def:
            expected_val = scenario_def.parameter_defaults.get("expected_baseline_value")
        if expected_val is None and scenario_def and scenario_def.category.value == "TELEMETRY_INTEGRITY":
            expected_val = 500.0

        manip_factor = getattr(request, "manipulation_factor", None)
        if manip_factor is None and scenario_def:
            manip_factor = scenario_def.parameter_defaults.get("manipulation_factor")
        if manip_factor is None and scenario_def and scenario_def.category.value == "TELEMETRY_INTEGRITY":
            manip_factor = rng.choice([0.65, 0.70, 0.765, 0.80, 1.25, 1.35])

        reported_val = getattr(request, "reported_value", None)
        if reported_val is None:
            if manip_factor is not None and expected_val is not None:
                reported_val = round(expected_val * manip_factor, 2)
            elif scenario_def and "reported_value" in scenario_def.parameter_defaults:
                reported_val = scenario_def.parameter_defaults.get("reported_value")

        discrepancy = None
        rel_error = None
        if reported_val is not None and expected_val is not None:
            discrepancy = round(abs(reported_val - expected_val), 2)
            if abs(expected_val) > 1e-6:
                rel_error = round((discrepancy / abs(expected_val)) * 100.0, 2)
            else:
                rel_error = 0.0

        # Configuration parameters (Attack 3)
        is_config_type = (
            (scenario_def and getattr(scenario_def.category, "value", str(scenario_def.category)) == "CONFIGURATION_TAMPERING")
            or getattr(request, "configuration_parameter", None) is not None
            or getattr(request, "requested_tap", None) is not None
            or "CONFIG" in (request.scenario_id or "").upper()
            or "TAP" in (request.scenario_id or "").upper()
        )
        config_param = getattr(request, "configuration_parameter", None)
        if config_param is None and is_config_type and scenario_def:
            config_param = scenario_def.parameter_defaults.get("configuration_parameter", "TAP_POSITION")

        prev_tap = getattr(request, "previous_tap", None)
        if prev_tap is None and is_config_type:
            prev_tap = scenario_def.parameter_defaults.get("previous_tap", 0) if scenario_def else 0

        req_tap = getattr(request, "requested_tap", None)
        if req_tap is None and is_config_type:
            if scenario_def and "requested_tap" in scenario_def.parameter_defaults:
                req_tap = scenario_def.parameter_defaults.get("requested_tap")
            else:
                req_tap = rng.choice([-6, -4, -3, 3, 4, 5, 6])

        tap_min = getattr(request, "tap_min", None)
        if tap_min is None and is_config_type:
            tap_min = scenario_def.parameter_defaults.get("tap_min", -10) if scenario_def else -10

        tap_max = getattr(request, "tap_max", None)
        if tap_max is None and is_config_type:
            tap_max = scenario_def.parameter_defaults.get("tap_max", 10) if scenario_def else 10
        
        tap_delta = None
        if req_tap is not None and prev_tap is not None:
            tap_delta = req_tap - prev_tap
        
        prev_val = getattr(request, "previous_value", None)
        if prev_val is None and is_config_type:
            prev_val = scenario_def.parameter_defaults.get("previous_value") if scenario_def else (float(prev_tap) if prev_tap is not None else None)

        req_val = getattr(request, "requested_value", None)
        if req_val is None and is_config_type:
            req_val = scenario_def.parameter_defaults.get("requested_value") if scenario_def else (float(req_tap) if req_tap is not None else None)

        raw_payload = f"[{protocol}] CMD={cmd_name} AUTH={auth_status} TGT={target_asset}"
        if reported_val is not None:
            raw_payload += f" {meas_type}={reported_val}"
            if expected_val is not None:
                raw_payload += f" (REF={expected_val})"
        if req_tap is not None:
            raw_payload += f" CONFIG={config_param or 'TAP_POSITION'} PREV={prev_tap} REQ={req_tap} [DELTA={tap_delta}]"

        observed = ObservedFacts(
            timestamp=datetime.now(timezone.utc).isoformat(),
            source_identifier=source_id,
            raw_protocol=protocol,
            command_name=cmd_name,
            authorization_status=auth_status,
            measurement_type=meas_type,
            reported_value=reported_val,
            expected_baseline_value=expected_val,
            discrepancy_magnitude=discrepancy,
            relative_error_pct=rel_error,
            manipulation_factor=manip_factor,
            configuration_parameter=config_param,
            previous_value=prev_val,
            requested_value=req_val,
            previous_tap=prev_tap,
            requested_tap=req_tap,
            tap_min=tap_min,
            tap_max=tap_max,
            tap_delta=tap_delta,
            raw_payload_sample=raw_payload,
            target_asset_ref=target_asset
        )

        if "XFMR" in target_asset.upper() or "TRAFO" in target_asset.upper():
            asset_type_str = "TRANSFORMER"
        elif "LINE" in target_asset.upper():
            asset_type_str = "TRANSMISSION_LINE"
        else:
            asset_type_str = "SUBSTATION"

        return SyntheticCyberEvent(
            event_id=event_id,
            scenario_id=request.scenario_id,
            target_asset=target_asset,
            target_asset_type=asset_type_str,
            observed=observed,
            ground_truth_category=scenario_def.category.value if scenario_def else "CUSTOM_SYNTHETIC",
            ground_truth_action=scenario_def.simulated_action if scenario_def else cmd_name,
            simulation_id=request.simulation_id
        )


attack_simulator = AttackSimulator()
generate_synthetic_sequence = attack_simulator.generate_synthetic_sequence
generate_coordinated_campaign_sequence = attack_simulator.generate_coordinated_campaign_sequence
generate_synthetic_event = attack_simulator.generate_synthetic_event
simulate_cyber_event = attack_simulator.generate_synthetic_event
dynamic_target_selector = DynamicTargetSelector

"""
GRID//ZERO Campaign Missions & Human-vs-Algorithm Challenge Engine.

Implements the 7 playable missions required by the specification:
- MISSION_01 — FIRST LIGHT
- MISSION_02 — HOSPITAL ON THE BRINK
- MISSION_03 — THE TIE-SWITCH TRAP
- MISSION_04 — STARVED INTAKE
- MISSION_05 — BATTERY MIDNIGHT
- MISSION_06 — CASCADING CYBER STORM
- MISSION_07 — THE CITY MUST STAY ALIVE
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.power.models import FaultModel
from app.simulation.session_manager import (
    SimulationSessionState,
    session_manager,
)


class MissionObjective(BaseModel):
    objective_id: str
    description: str
    target_metric: str
    comparator: str = Field(..., description=">=, <=, ==")
    target_value: Any
    mandatory: bool = True


class MissionDefinition(BaseModel):
    mission_id: str
    number: int
    code_name: str
    title: str
    subtitle: str
    difficulty: str
    network_id: str = "TRAINING_FEEDER"
    briefing: str
    learning_focus: str
    recommended_dsa: List[str] = Field(default_factory=list)
    initial_faulted_branches: List[str] = Field(default_factory=list)
    initial_open_switches: List[str] = Field(default_factory=list)
    initial_closed_switches: List[str] = Field(default_factory=list)
    source_capacity_limit_mw: Optional[float] = None
    max_switching_budget: int = 6
    target_critical_pct: float = 100.0
    min_voltage_pu: float = 0.92
    objectives: List[MissionObjective] = Field(default_factory=list)
    hints: List[str] = Field(default_factory=list)


MISSIONS_CATALOG: List[MissionDefinition] = [
    MissionDefinition(
        mission_id="MISSION_01",
        number=1,
        code_name="MISSION 01",
        title="FIRST LIGHT",
        subtitle="Substation Trunk Fault & BFS Energization Trace",
        difficulty="ROOKIE",
        network_id="TRAINING_FEEDER",
        briefing=(
            "A primary 11 kV trunk cable (LINE-04-06) supplying City University has suffered a trench fault. "
            "Use Breadth-First Search (BFS) to inspect the de-energized island and close normally-open tie switch "
            "SW-TIE-2 (BUS-03 -> BUS-06) to restore power to the university campus without violating voltage limits."
        ),
        learning_focus="Graph Reachability (BFS) & Basic Radial Tie-Switch Restoration",
        recommended_dsa=["BFS", "DSU"],
        initial_faulted_branches=["LINE-04-06"],
        max_switching_budget=2,
        target_critical_pct=100.0,
        min_voltage_pu=0.93,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M1-1",
                description="Restore City University (BUS-06) and reach >= 99% critical load served",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=99.0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M1-2",
                description="Maintain minimum bus voltage >= 0.93 pu across all energized buses",
                target_metric="min_voltage_pu",
                comparator=">=",
                target_value=0.93,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M1-3",
                description="Complete restoration within 2 switching actions",
                target_metric="switching_actions_count",
                comparator="<=",
                target_value=2,
                mandatory=False,
            ),
        ],
        hints=[
            "Run BFS from BUS-01 to confirm that BUS-06 and BUS-10 are de-energized.",
            "Close tie switch SW-TIE-2 (connecting BUS-03 to BUS-06) to re-energize the southern branch.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_02",
        number=2,
        code_name="MISSION 02",
        title="HOSPITAL ON THE BRINK",
        subtitle="Tier-1 Medical Center Outage & Backup BESS Dispatch",
        difficulty="OPERATOR",
        network_id="TRAINING_FEEDER",
        briefing=(
            "The dedicated hospital trunk feeder (LINE-02-03) has tripped due to an underground insulation failure, "
            "plunging City Trauma Hospital (BUS-03) and North Residential (BUS-07) into blackout. "
            "Energize the hospital via an alternate tie corridor and dispatch the Hospital Backup BESS (BESS-HOSP-1) "
            "to stabilize local bus voltage."
        ),
        learning_focus="Dijkstra / A* Minimum-Impedance Routing & Battery Support",
        recommended_dsa=["DIJKSTRA", "ASTAR_ROUTING", "MAX_HEAP_TRIAGE"],
        initial_faulted_branches=["LINE-02-03"],
        max_switching_budget=3,
        target_critical_pct=100.0,
        min_voltage_pu=0.93,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M2-1",
                description="Restore 100% of Tier-1 Critical Load (Hospital, Water, Control Center)",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=99.5,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M2-2",
                description="Keep minimum system voltage >= 0.93 pu via tie routing + BESS support",
                target_metric="min_voltage_pu",
                comparator=">=",
                target_value=0.93,
                mandatory=True,
            ),
        ],
        hints=[
            "Close SW-TIE-2 (BUS-03 <-> BUS-06) or SW-TIE-1 (BUS-07 <-> BUS-08) to backfeed BUS-03.",
            "Dispatch BESS-HOSP-1 at 450 kW to support voltage on the backfed hospital branch.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_03",
        number=3,
        code_name="MISSION 03",
        title="THE TIE-SWITCH TRAP",
        subtitle="Why Naive Shortest-Hop Switching Fails AC Physics",
        difficulty="ENGINEER",
        network_id="TRAINING_FEEDER",
        briefing=(
            "Two simultaneous feeder faults (LINE-02-03 and LINE-03-04) have isolated both the Trauma Hospital (BUS-03) "
            "and Municipal Water Treatment (BUS-04). A naive graph-only restoration that closes long residential tie lines "
            "without reactive/active power support or load shedding will cause voltage drop violations. "
            "Find an AC-feasible switching + BESS + selective curtailment plan."
        ),
        learning_focus="Graph Feasibility vs. AC Newton-Raphson Voltage & Thermal Feasibility",
        recommended_dsa=["TARJAN_BRIDGES", "KRUSKAL_MST", "DIJKSTRA"],
        initial_faulted_branches=["LINE-02-03", "LINE-03-04"],
        max_switching_budget=4,
        target_critical_pct=98.0,
        min_voltage_pu=0.92,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M3-1",
                description="Restore >= 98% of critical infrastructure load",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=98.0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M3-2",
                description="Ensure AC Power Flow converges with zero voltage violations (< 0.92 pu)",
                target_metric="min_voltage_pu",
                comparator=">=",
                target_value=0.92,
                mandatory=True,
            ),
        ],
        hints=[
            "Close SW-TIE-2 (BUS-03 <-> BUS-06) and SW-TIE-3 (BUS-04 <-> BUS-09) to create parallel backfeed routes.",
            "Engage both BESS-HOSP-1 and BESS-CITY-1 to lift feeder voltages.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_04",
        number=4,
        code_name="MISSION 04",
        title="STARVED INTAKE",
        subtitle="Upstream 33 kV Substation Derating & 0/1 Knapsack Triage",
        difficulty="ENGINEER",
        network_id="TRAINING_FEEDER",
        briefing=(
            "An upstream transmission contingency has derated the 33 kV Grid Intake (BUS-01) to a strict 6.2 MW ceiling, "
            "while total feeder demand is 10.65 MW. Use 0/1 Knapsack Dynamic Programming and Max-Heap Criticality Triage "
            "to curtail low-priority Tier-3 residential/industrial loads while keeping 100% of Tier-1 and Tier-2 "
            "critical infrastructure online."
        ),
        learning_focus="0/1 Knapsack DP & Priority Queue Load Shedding under Hard Capacity Limits",
        recommended_dsa=["KNAPSACK_DP", "MAX_HEAP_TRIAGE"],
        initial_faulted_branches=[],
        source_capacity_limit_mw=6.2,
        max_switching_budget=5,
        target_critical_pct=95.0,
        min_voltage_pu=0.94,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M4-1",
                description="Eliminate all SOURCE_CAPACITY_EXCEEDED violations (zero thermal/source overloads)",
                target_metric="thermal_violations_count",
                comparator="==",
                target_value=0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M4-2",
                description="Preserve >= 95% of critical load while respecting the 6.2 MW source cap",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=95.0,
                mandatory=True,
            ),
        ],
        hints=[
            "Curtail Tier-3 loads (Industrial Park BUS-09, North/South Residential BUS-07/BUS-08) first.",
            "Dispatch BESS-CITY-1 (1200 kW) and BESS-HOSP-1 (450 kW) to offset grid intake draw.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_05",
        number=5,
        code_name="MISSION 05",
        title="BATTERY MIDNIGHT",
        subtitle="Multi-Feeder Outage & Energy Storage Horizon Management",
        difficulty="COMMANDER",
        network_id="TRAINING_FEEDER",
        briefing=(
            "At 00:00 hours (Solar PV output depleted), faults on LINE-02-03 and LINE-08-10 plus an upstream intake cap "
            "of 6.8 MW threaten city stability. Coordinate tie-switch reconfiguration with optimal BESS discharge "
            "without exhausting battery state-of-charge below minimum reserve limits."
        ),
        learning_focus="Discrete-Time Battery Dispatch (kW vs kWh) & Constrained Restoration",
        recommended_dsa=["MIN_COST_MAX_FLOW", "KNAPSACK_DP", "ASTAR_ROUTING"],
        initial_faulted_branches=["LINE-02-03", "LINE-08-10"],
        source_capacity_limit_mw=6.8,
        max_switching_budget=5,
        target_critical_pct=96.0,
        min_voltage_pu=0.93,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M5-1",
                description="Restore >= 96% of critical load",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=96.0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M5-2",
                description="Zero source capacity or branch thermal violations",
                target_metric="thermal_violations_count",
                comparator="==",
                target_value=0,
                mandatory=True,
            ),
        ],
        hints=[
            "Close SW-TIE-2 (BUS-03 <-> BUS-06) and SW-TIE-4 (BUS-10 <-> BUS-12) to re-energize both faulted zones.",
            "Dispatch BESS-CITY-1 and BESS-HOSP-1 and curtail Industrial Park (BUS-09) to stay below 6.8 MW.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_06",
        number=6,
        code_name="MISSION 06",
        title="CASCADING CYBER STORM",
        subtitle="Coordinated Cyber-Physical Breaker Trip on 3 Feeder Trunks",
        difficulty="COMMANDER",
        network_id="TRAINING_FEEDER",
        briefing=(
            "A spoofed IEC-61850 GOOSE intrusion has simultaneously tripped three major feeder trunks: "
            "LINE-02-03 (Hospital), LINE-03-04 (Water Treatment), and LINE-08-10 (Commercial District). "
            "Isolate the damage, close tie switches across the ring boundary, and execute CAPER to restore the city."
        ),
        learning_focus="Multi-Island Reconfiguration (DSU + Kruskal MST) & Cyber-Induced Blackout Recovery",
        recommended_dsa=["DSU", "KRUSKAL_MST", "TARJAN_BRIDGES", "MIN_COST_MAX_FLOW"],
        initial_faulted_branches=["LINE-02-03", "LINE-03-04", "LINE-08-10"],
        max_switching_budget=6,
        target_critical_pct=95.0,
        min_voltage_pu=0.92,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M6-1",
                description="Restore >= 95% of critical load across all three affected zones",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=95.0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M6-2",
                description="Maintain AC voltage stability (>= 0.92 pu) with zero thermal violations",
                target_metric="min_voltage_pu",
                comparator=">=",
                target_value=0.92,
                mandatory=True,
            ),
        ],
        hints=[
            "Close SW-TIE-2, SW-TIE-3, and SW-TIE-4 to bridge all three isolated islands back to the energized backbone.",
            "Use CAPER advisor to compute the exact BESS dispatch and minimal Tier-3 curtailment.",
        ],
    ),
    MissionDefinition(
        mission_id="MISSION_07",
        number=7,
        code_name="MISSION 07",
        title="THE CITY MUST STAY ALIVE",
        subtitle="IEEE 33-Bus Benchmark Extreme Multi-Fault & Supply Crisis",
        difficulty="CHIEF DISPATCHER",
        network_id="IEEE_33_DISTRIBUTION",
        briefing=(
            "The ultimate test on the standard IEEE 33-Bus radial distribution benchmark. "
            "Three main sectionalizing branches (LINE-2, LINE-6, LINE-12) have faulted while substation "
            "supply is constrained to 3.4 MW. Use the 5 normally-open IEEE 33-bus tie switches, both BESS units, "
            "and criticality-aware load triage to keep the city's hospitals, water infrastructure, and SCADA centers alive."
        ),
        learning_focus="Full 8-Stage CAPER Optimization on the IEEE 33-Bus Distribution Benchmark",
        recommended_dsa=[
            "BFS",
            "TARJAN_BRIDGES",
            "DSU",
            "KRUSKAL_MST",
            "KNAPSACK_DP",
            "MIN_COST_MAX_FLOW",
            "ASTAR_ROUTING",
        ],
        initial_faulted_branches=["LINE-2", "LINE-6", "LINE-12"],
        source_capacity_limit_mw=3.4,
        max_switching_budget=6,
        target_critical_pct=92.0,
        min_voltage_pu=0.91,
        objectives=[
            MissionObjective(
                objective_id="OBJ-M7-1",
                description="Restore >= 92% of critical load on the IEEE 33-Bus distribution feeder",
                target_metric="critical_load_restored_pct",
                comparator=">=",
                target_value=92.0,
                mandatory=True,
            ),
            MissionObjective(
                objective_id="OBJ-M7-2",
                description="Keep minimum bus voltage >= 0.91 pu and zero source/thermal overloads",
                target_metric="min_voltage_pu",
                comparator=">=",
                target_value=0.91,
                mandatory=True,
            ),
        ],
        hints=[
            "Close IEEE 33-bus tie switches SW-33-TIE-1 (BUS-8 <-> BUS-21), SW-33-TIE-2 (BUS-9 <-> BUS-15), and SW-33-TIE-3 (BUS-12 <-> BUS-22).",
            "Dispatch BESS-33-1 and BESS-33-2 and shed Tier-3 residential buses to respect the 3.4 MW substation limit.",
        ],
    ),
]


class MissionService:
    """Manages mission initialization, objective evaluation, and Human-vs-Algorithm scoring."""

    @staticmethod
    def list_missions() -> List[MissionDefinition]:
        return MISSIONS_CATALOG

    @staticmethod
    def get_mission(mission_id: str) -> MissionDefinition:
        for m in MISSIONS_CATALOG:
            if m.mission_id.upper() == mission_id.upper():
                return m
        return MISSIONS_CATALOG[0]

    @classmethod
    def start_mission(
        cls,
        mission_id: str,
        session_id: Optional[str] = None,
        seed: int = 42,
        source_capacity_limit_mw: Optional[float] = None,
    ) -> Dict[str, Any]:
        mission = cls.get_mission(mission_id)
        initial_overrides: Dict[str, Any] = {
            "lines": {},
            "switches": {},
            "batteries": {},
            "load_curtailment": {},
        }
        initial_faults: List[FaultModel] = []

        for idx, br_id in enumerate(mission.initial_faulted_branches):
            initial_overrides["lines"][br_id] = {"status": "OUT_OF_SERVICE"}
            initial_faults.append(
                FaultModel(
                    fault_id=f"FLT-{mission.mission_id}-{idx+1}",
                    target_id=br_id,
                    target_type="BRANCH",
                    fault_type="THREE_PHASE_FAULT",
                    isolated=True,
                    active=True,
                    timestamp_step=0,
                    description=f"Mission {mission.number} initial fault on {br_id}",
                )
            )

        for sw_id in mission.initial_open_switches:
            initial_overrides["switches"][sw_id] = {"status": "OPEN"}
        for sw_id in mission.initial_closed_switches:
            initial_overrides["switches"][sw_id] = {"status": "CLOSED"}

        session = session_manager.reset_session(
            session_id=session_id,
            network_id=mission.network_id,
            mission_id=mission.mission_id,
            seed=seed,
            initial_overrides=initial_overrides,
            initial_faults=initial_faults,
            source_capacity_limit_mw=source_capacity_limit_mw if source_capacity_limit_mw is not None else mission.source_capacity_limit_mw,
        )
        evaluation = cls.evaluate_session(mission.mission_id, session)
        return {
            "mission": mission.model_dump(),
            "session": session.model_dump(),
            "evaluation": evaluation,
        }

    @classmethod
    def evaluate_session(
        cls,
        mission_id: str,
        session: SimulationSessionState,
    ) -> Dict[str, Any]:
        mission = cls.get_mission(mission_id)
        kpis = session.kpis
        switching_count = sum(
            1 for a in session.action_log if a.get("action_type", a.get("action")) in ("CLOSE_SWITCH", "CLOSE_TIE_SWITCH", "TOGGLE_SWITCH", "OPEN_SWITCH", "ISOLATE_BRANCH", "RESTORE_BRANCH")
        )
        metrics_map = {
            "critical_load_restored_pct": float(kpis.get("critical_load_restored_pct", 0.0)),
            "total_load_restored_pct": float(kpis.get("total_load_restored_pct", 0.0)),
            "min_voltage_pu": float(kpis.get("min_voltage_pu", 0.0)),
            "max_branch_loading_pct": float(kpis.get("max_branch_loading_pct", 0.0)),
            "voltage_violations_count": int(kpis.get("voltage_violations_count", 0)),
            "thermal_violations_count": int(kpis.get("thermal_violations_count", 0)),
            "switching_actions_count": switching_count,
            "resilience_score": float(kpis.get("resilience_score", 0.0)),
        }

        obj_results = []
        mandatory_all_passed = True
        for obj in mission.objectives:
            actual = metrics_map.get(obj.target_metric, 0.0)
            if obj.comparator == ">=":
                passed = actual >= float(obj.target_value)
            elif obj.comparator == "<=":
                passed = actual <= float(obj.target_value)
            else:
                passed = actual == obj.target_value

            if obj.mandatory and not passed:
                mandatory_all_passed = False

            obj_results.append(
                {
                    "objective_id": obj.objective_id,
                    "description": obj.description,
                    "target_metric": obj.target_metric,
                    "comparator": obj.comparator,
                    "target_value": obj.target_value,
                    "actual_value": round(actual, 3) if isinstance(actual, float) else actual,
                    "mandatory": obj.mandatory,
                    "passed": passed,
                }
            )

        physically_feasible = session.power_flow.converged and not session.power_flow.violations and session.solver_provenance == "AC_SOLVED"
        mandatory_all_passed = mandatory_all_passed and physically_feasible and switching_count <= mission.max_switching_budget
        grade = "S" if mandatory_all_passed and metrics_map["resilience_score"] >= 90 else (
            "A" if mandatory_all_passed else (
                "B" if metrics_map["critical_load_restored_pct"] >= 80 else "C"
            )
        )

        return {
            "mission_id": mission.mission_id,
            "mission_Passed": mandatory_all_passed,
            "passed": mandatory_all_passed,
            "grade": grade,
            "score": round(metrics_map["resilience_score"], 2) if physically_feasible else 0.0,
            "ac_feasible": physically_feasible,
            "switching_actions_used": switching_count,
            "switching_budget": mission.max_switching_budget,
            "objectives": obj_results,
            "metrics": metrics_map,
        }

    @classmethod
    def compare_human_vs_algorithms(
        cls,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Compares the current human operator session state against CAPER and the 4 baseline
        restoration algorithms on the exact same initial fault/constraint scenario.
        """
        session = session_manager.get_or_create_session(session_id=session_id)
        initial = session_manager.initial_session(session.session_id)
        mission_id = session.mission_id or "MISSION_03"
        mission = cls.get_mission(mission_id)

        # Human operator metrics from current live session
        human_eval = cls.evaluate_session(mission_id, session)
        human_switching = human_eval["switching_actions_used"]
        human_entry = {
            "participant": "HUMAN_OPERATOR",
            "label": "Human Operator (Live Session)",
            "ac_converged": session.power_flow.converged,
            "ac_feasible": (
                session.power_flow.converged
                and session.solver_provenance == "AC_SOLVED"
                and not session.power_flow.violations
            ),
            "critical_load_restored_pct": session.kpis.get("critical_load_restored_pct", 0.0),
            "total_load_restored_pct": session.kpis.get("total_load_restored_pct", 0.0),
            "min_voltage_pu": session.kpis.get("min_voltage_pu", 0.0),
            "max_branch_loading_pct": session.kpis.get("max_branch_loading_pct", 0.0),
            "switching_count": human_switching,
            "curtailed_mw": session.kpis.get("unserved_load_mw", 0.0),
            "resilience_score": session.kpis.get("resilience_score", 0.0),
            "runtime_ms": 0.0,
        }

        # Reconstruct initial faulted baseline state for fair algorithm comparison
        faulted_branches = [f.asset_id for f in initial.active_faults if not f.cleared]
        base_overrides = initial.state_overrides
        limit_mw = initial.source_capacity_limit_mw

        from app.restoration.caper import CAPEREngine
        from app.restoration.baselines import BaselineRestorationSuite

        caper_res = CAPEREngine.run_caper(
            network_id=session.network_id,
            faulted_branches=faulted_branches,
            state_overrides=base_overrides,
            source_capacity_limit_mw=limit_mw,
            switching_budget=mission.max_switching_budget,
        )
        baselines = BaselineRestorationSuite.run_all_baselines(
            network_id=session.network_id,
            faulted_branches=faulted_branches,
            state_overrides=base_overrides,
            source_capacity_limit_mw=limit_mw,
            switching_budget=mission.max_switching_budget,
        )

        competitors = [human_entry]
        all_algos = {"CAPER": caper_res.selected_candidate, **baselines}
        for name, cand in all_algos.items():
            score = (
                0.55 * cand.critical_load_restored_pct
                + 0.25 * cand.total_load_restored_pct
                + 20.0 * (1.0 if cand.ac_feasible else 0.3)
                - 1.5 * cand.switching_count
            )
            competitors.append(
                {
                    "participant": name,
                    "label": name,
                    "ac_converged": cand.ac_converged,
                    "ac_feasible": cand.ac_feasible,
                    "critical_load_restored_pct": cand.critical_load_restored_pct,
                    "total_load_restored_pct": cand.total_load_restored_pct,
                    "min_voltage_pu": cand.min_voltage_pu,
                    "max_branch_loading_pct": cand.max_branch_loading_pct,
                    "switching_count": cand.switching_count,
                    "curtailed_mw": cand.curtailed_load_mw,
                    "resilience_score": round(max(0.0, min(100.0, score)), 2),
                    "runtime_ms": cand.runtime_ms,
                    "rationale": cand.rationale,
                }
            )

        competitors.sort(
            key=lambda x: (
                1 if x["ac_feasible"] else 0,
                x["critical_load_restored_pct"],
                x["resilience_score"],
            ),
            reverse=True,
        )
        for rank, comp in enumerate(competitors, start=1):
            comp["rank"] = rank

        return {
            "mission_id": mission.mission_id,
            "network_id": session.network_id,
            "faulted_branches": faulted_branches,
            "source_capacity_limit_mw": limit_mw,
            "human_evaluation": human_eval,
            "leaderboard": competitors,
            "caper_plan": caper_res.selected_candidate.model_dump(),
        }


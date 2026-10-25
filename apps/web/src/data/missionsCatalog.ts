export interface MissionObjectiveItem {
  objective_id: string;
  description: string;
  target_metric: string;
  comparator: string;
  target_value: number;
  mandatory: boolean;
}

export interface MissionDef {
  mission_id: string;
  number: number;
  code_name: string;
  title: string;
  subtitle: string;
  difficulty: string;
  network_id: string;
  briefing: string;
  learning_focus: string;
  recommended_dsa: string[];
  initial_faulted_branches: string[];
  source_capacity_limit_mw?: number | null;
  max_switching_budget: number;
  target_critical_pct: number;
  min_voltage_pu: number;
  objectives: MissionObjectiveItem[];
  hints: string[];
}

export const MISSIONS_LIST: MissionDef[] = [
  {
    mission_id: "MISSION_01",
    number: 1,
    code_name: "MISSION 01",
    title: "FIRST LIGHT",
    subtitle: "Substation Trunk Fault & BFS Energization Trace",
    difficulty: "ROOKIE",
    network_id: "TRAINING_FEEDER",
    briefing:
      "A primary 11 kV trunk cable (LINE-02-06) supplying City University has suffered a trench fault. Use Breadth-First Search (BFS) to inspect the de-energized island and close normally-open tie switch SW-TIE-2 (BUS-03 -> BUS-06) to restore power without violating voltage limits.",
    learning_focus: "Graph Reachability (BFS) & Basic Radial Tie-Switch Restoration",
    recommended_dsa: ["BFS", "DSU"],
    initial_faulted_branches: ["LINE-02-06"],
    source_capacity_limit_mw: null,
    max_switching_budget: 2,
    target_critical_pct: 100.0,
    min_voltage_pu: 0.93,
    objectives: [
      {
        objective_id: "OBJ-M1-1",
        description: "Restore City University (BUS-06) and reach >= 99% critical load served",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 99.0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M1-2",
        description: "Maintain minimum bus voltage >= 0.93 pu across all energized buses",
        target_metric: "min_voltage_pu",
        comparator: ">=",
        target_value: 0.93,
        mandatory: true,
      },
    ],
    hints: [
      "Run BFS from BUS-01 to confirm that BUS-06 and BUS-10 are de-energized.",
      "Close tie switch SW-TIE-2 (connecting BUS-03 to BUS-06) to re-energize the southern branch.",
    ],
  },
  {
    mission_id: "MISSION_02",
    number: 2,
    code_name: "MISSION 02",
    title: "HOSPITAL ON THE BRINK",
    subtitle: "Tier-1 Medical Center Outage & Backup BESS Dispatch",
    difficulty: "OPERATOR",
    network_id: "TRAINING_FEEDER",
    briefing:
      "The dedicated hospital trunk feeder (LINE-02-03) has tripped due to an underground insulation failure, plunging Metro Trauma Hospital (BUS-03) and North Residential (BUS-07) into blackout. Energize the hospital via an alternate tie corridor and dispatch BESS-HOSP-1.",
    learning_focus: "Dijkstra / A* Minimum-Impedance Routing & Battery Support",
    recommended_dsa: ["DIJKSTRA", "ASTAR_ROUTING", "MAX_HEAP_TRIAGE"],
    initial_faulted_branches: ["LINE-02-03"],
    source_capacity_limit_mw: null,
    max_switching_budget: 3,
    target_critical_pct: 100.0,
    min_voltage_pu: 0.93,
    objectives: [
      {
        objective_id: "OBJ-M2-1",
        description: "Restore 100% of Tier-1 Critical Load (Hospital, Water, Control Center)",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 99.5,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M2-2",
        description: "Keep minimum system voltage >= 0.93 pu via tie routing + BESS support",
        target_metric: "min_voltage_pu",
        comparator: ">=",
        target_value: 0.93,
        mandatory: true,
      },
    ],
    hints: [
      "Close SW-TIE-2 (BUS-03 <-> BUS-06) or SW-TIE-1 (BUS-07 <-> BUS-08) to backfeed BUS-03.",
      "Dispatch BESS-HOSP-1 at 450 kW to support voltage on the backfed hospital branch.",
    ],
  },
  {
    mission_id: "MISSION_03",
    number: 3,
    code_name: "MISSION 03",
    title: "THE TIE-SWITCH TRAP",
    subtitle: "Why Naive Shortest-Hop Switching Fails AC Physics",
    difficulty: "ENGINEER",
    network_id: "TRAINING_FEEDER",
    briefing:
      "Two simultaneous feeder faults (LINE-02-03 and LINE-02-04) have isolated both the Trauma Hospital (BUS-03) and Municipal Water Treatment (BUS-04). Find an AC-feasible switching + BESS + selective curtailment plan that avoids voltage collapse.",
    learning_focus: "Graph Feasibility vs. AC Newton-Raphson Voltage & Thermal Feasibility",
    recommended_dsa: ["TARJAN_BRIDGES", "KRUSKAL_MST", "DIJKSTRA"],
    initial_faulted_branches: ["LINE-02-03", "LINE-02-04"],
    source_capacity_limit_mw: null,
    max_switching_budget: 4,
    target_critical_pct: 98.0,
    min_voltage_pu: 0.92,
    objectives: [
      {
        objective_id: "OBJ-M3-1",
        description: "Restore >= 98% of critical infrastructure load",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 98.0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M3-2",
        description: "Ensure AC Power Flow converges with zero voltage violations (>= 0.92 pu)",
        target_metric: "min_voltage_pu",
        comparator: ">=",
        target_value: 0.92,
        mandatory: true,
      },
    ],
    hints: [
      "Close SW-TIE-2 (BUS-03 <-> BUS-06) and SW-TIE-3 (BUS-04 <-> BUS-09) to create parallel backfeed routes.",
      "Engage both BESS-HOSP-1 and BESS-CITY-1 to lift feeder voltages.",
    ],
  },
  {
    mission_id: "MISSION_04",
    number: 4,
    code_name: "MISSION 04",
    title: "STARVED INTAKE",
    subtitle: "Upstream 33 kV Substation Derating & 0/1 Knapsack Triage",
    difficulty: "ENGINEER",
    network_id: "TRAINING_FEEDER",
    briefing:
      "An upstream transmission contingency has derated the 33 kV Grid Intake (BUS-01) to a strict 6.2 MW ceiling, while total feeder demand is 10.65 MW. Use 0/1 Knapsack Dynamic Programming and Max-Heap Triage to curtail low-priority Tier-3 loads.",
    learning_focus: "0/1 Knapsack DP & Priority Queue Load Shedding under Hard Capacity Limits",
    recommended_dsa: ["KNAPSACK_DP", "MAX_HEAP_TRIAGE"],
    initial_faulted_branches: [],
    source_capacity_limit_mw: 6.2,
    max_switching_budget: 5,
    target_critical_pct: 95.0,
    min_voltage_pu: 0.94,
    objectives: [
      {
        objective_id: "OBJ-M4-1",
        description: "Eliminate all SOURCE_CAPACITY_EXCEEDED violations (zero thermal/source overloads)",
        target_metric: "thermal_violations_count",
        comparator: "==",
        target_value: 0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M4-2",
        description: "Preserve >= 95% of critical load while respecting the 6.2 MW source cap",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 95.0,
        mandatory: true,
      },
    ],
    hints: [
      "Curtail Tier-3 loads (Industrial Park BUS-09, Commercial Mall BUS-10) first.",
      "Dispatch BESS-CITY-1 (1200 kW) and BESS-HOSP-1 (450 kW) to offset grid intake draw.",
    ],
  },
  {
    mission_id: "MISSION_05",
    number: 5,
    code_name: "MISSION 05",
    title: "BATTERY MIDNIGHT",
    subtitle: "Multi-Feeder Outage & Energy Storage Horizon Management",
    difficulty: "COMMANDER",
    network_id: "TRAINING_FEEDER",
    briefing:
      "At 00:00 hours, faults on LINE-02-03 and LINE-06-10 plus an upstream intake cap of 6.8 MW threaten city stability. Coordinate tie-switch reconfiguration with optimal BESS discharge without exhausting battery state-of-charge.",
    learning_focus: "Discrete-Time Battery Dispatch (kW vs kWh) & Constrained Restoration",
    recommended_dsa: ["MIN_COST_MAX_FLOW", "KNAPSACK_DP", "ASTAR_ROUTING"],
    initial_faulted_branches: ["LINE-02-03", "LINE-06-10"],
    source_capacity_limit_mw: 6.8,
    max_switching_budget: 5,
    target_critical_pct: 96.0,
    min_voltage_pu: 0.93,
    objectives: [
      {
        objective_id: "OBJ-M5-1",
        description: "Restore >= 96% of critical load",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 96.0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M5-2",
        description: "Zero source capacity or branch thermal violations",
        target_metric: "thermal_violations_count",
        comparator: "==",
        target_value: 0,
        mandatory: true,
      },
    ],
    hints: [
      "Close SW-TIE-2 (BUS-03 <-> BUS-06) and SW-TIE-4 (BUS-10 <-> BUS-12) to re-energize both faulted zones.",
      "Dispatch BESS-CITY-1 and BESS-HOSP-1 and curtail Industrial Park (BUS-09).",
    ],
  },
  {
    mission_id: "MISSION_06",
    number: 6,
    code_name: "MISSION 06",
    title: "CASCADING CYBER STORM",
    subtitle: "Coordinated Cyber-Physical Breaker Trip on 3 Feeder Trunks",
    difficulty: "COMMANDER",
    network_id: "TRAINING_FEEDER",
    briefing:
      "A spoofed IEC-61850 GOOSE intrusion has simultaneously tripped three major feeder trunks: LINE-02-03 (Hospital), LINE-02-04 (Water Treatment), and LINE-06-10 (Commercial District). Isolate the damage, close tie switches across the ring boundary, and execute CAPER.",
    learning_focus: "Multi-Island Reconfiguration (DSU + Kruskal MST) & Cyber-Induced Blackout Recovery",
    recommended_dsa: ["DSU", "KRUSKAL_MST", "TARJAN_BRIDGES", "MIN_COST_MAX_FLOW"],
    initial_faulted_branches: ["LINE-02-03", "LINE-02-04", "LINE-06-10"],
    source_capacity_limit_mw: null,
    max_switching_budget: 6,
    target_critical_pct: 95.0,
    min_voltage_pu: 0.92,
    objectives: [
      {
        objective_id: "OBJ-M6-1",
        description: "Restore >= 95% of critical load across all three affected zones",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 95.0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M6-2",
        description: "Maintain AC voltage stability (>= 0.92 pu) with zero thermal violations",
        target_metric: "min_voltage_pu",
        comparator: ">=",
        target_value: 0.92,
        mandatory: true,
      },
    ],
    hints: [
      "Close SW-TIE-2, SW-TIE-3, and SW-TIE-4 to bridge all three isolated islands back to the energized backbone.",
      "Use CAPER advisor to compute the exact BESS dispatch and minimal Tier-3 curtailment.",
    ],
  },
  {
    mission_id: "MISSION_07",
    number: 7,
    code_name: "MISSION 07",
    title: "THE CITY MUST STAY ALIVE",
    subtitle: "IEEE 33-Bus Benchmark Extreme Multi-Fault & Supply Crisis",
    difficulty: "CHIEF DISPATCHER",
    network_id: "IEEE_33_DISTRIBUTION",
    briefing:
      "The ultimate test on the standard IEEE 33-Bus radial distribution benchmark. Three main sectionalizing branches (LINE-2-3, LINE-6-7, LINE-12-13) have faulted while substation supply is constrained to 3.4 MW. Use the 5 normally-open IEEE 33-bus tie switches, both BESS units, and criticality-aware load triage.",
    learning_focus: "Full 8-Stage CAPER Optimization on the IEEE 33-Bus Distribution Benchmark",
    recommended_dsa: [
      "BFS",
      "TARJAN_BRIDGES",
      "DSU",
      "KRUSKAL_MST",
      "KNAPSACK_DP",
      "MIN_COST_MAX_FLOW",
      "ASTAR_ROUTING",
    ],
    initial_faulted_branches: ["LINE-2-3", "LINE-6-7", "LINE-12-13"],
    source_capacity_limit_mw: 3.4,
    max_switching_budget: 6,
    target_critical_pct: 92.0,
    min_voltage_pu: 0.91,
    objectives: [
      {
        objective_id: "OBJ-M7-1",
        description: "Restore >= 92% of critical load on the IEEE 33-Bus distribution feeder",
        target_metric: "critical_load_restored_pct",
        comparator: ">=",
        target_value: 92.0,
        mandatory: true,
      },
      {
        objective_id: "OBJ-M7-2",
        description: "Keep minimum bus voltage >= 0.91 pu and zero source/thermal overloads",
        target_metric: "min_voltage_pu",
        comparator: ">=",
        target_value: 0.91,
        mandatory: true,
      },
    ],
    hints: [
      "Close IEEE 33-bus tie switches SW-33-TIE-1, SW-33-TIE-2, and SW-33-TIE-3.",
      "Dispatch BESS-33-1 and BESS-33-2 and shed Tier-3 residential buses to respect the 3.4 MW substation limit.",
    ],
  },
];


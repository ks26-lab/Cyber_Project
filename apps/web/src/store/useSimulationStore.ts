"use client";

import { create } from "zustand";

export interface Building3DState {
  building_id: string;
  bus_id: string;
  name: string;
  facility_type: string;
  priority_tier: number;
  criticality_weight: number;
  position_3d: [number, number, number];
  power_state:
    "ENERGIZED" | "BACKUP_BATTERY" | "CURTAILED" | "BLACKOUT" | "SOURCE_ACTIVE";
  voltage_pu: number;
  voltage_kv: number;
  demand_mw: number;
  critical_load_mw: number;
  served_mw: number;
  curtailed_mw: number;
  generation_mw: number;
  battery_soc_pct?: number | null;
}

export interface SwitchModel {
  switch_id: string;
  name: string;
  from_bus: string;
  to_bus: string;
  line_id?: string | null;
  switch_type: string;
  normally_open: boolean;
  closed: boolean;
  operable: boolean;
  switching_cost: number;
}

export interface BatteryModel {
  battery_id: string;
  name: string;
  bus_id: string;
  capacity_kwh: number;
  soc_kwh: number;
  soc_percent: number;
  soc_min_percent: number;
  soc_max_percent: number;
  max_discharge_kw: number;
  max_charge_kw: number;
  current_dispatch_kw: number;
  charge_efficiency: number;
  discharge_efficiency: number;
  status: string;
}

export interface FaultModel {
  fault_id: string;
  asset_id: string;
  asset_type: string;
  fault_type: string;
  isolated: boolean;
  cleared: boolean;
  severity: string;
  description: string;
  timestamp: string;
}

export interface LineResult {
  line_id: string;
  name: string;
  from_bus: string;
  to_bus: string;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  pl_mw: number;
  ql_mvar: number;
  loading_percent: number;
  i_ka: number;
  status: string;
}

export interface BusResult {
  bus_id: string;
  name: string;
  voltage_kv: number;
  voltage_pu: number;
  voltage_angle_deg: number;
  p_gen_mw: number;
  q_gen_mvar: number;
  p_load_mw: number;
  q_load_mvar: number;
}

export interface Violation {
  violation_type: string;
  element_id: string;
  element_type: string;
  value: number;
  threshold: number;
  unit: string;
  severity: string;
  description: string;
}

export interface PowerFlowResult {
  status: string;
  message: string;
  network_id: string;
  scenario_id: string;
  buses: BusResult[];
  lines: LineResult[];
  transformers?: Array<{
    transformer_id: string;
    name: string;
    from_bus: string;
    to_bus: string;
    status: string;
    loading_percent: number;
  }>;
  violations: Violation[];
  power_balance: {
    total_generation_mw: number;
    total_load_mw: number;
    total_losses_mw: number;
    balance_error_mw: number;
    converged: boolean;
    iterations: number;
  };
  execution_time_ms: number;
}

export interface SimulationSessionState {
  session_id: string;
  network_id: string;
  network_name: string;
  mission_id?: string | null;
  revision: number;
  sim_time_minutes: number;
  seed: number;
  source_capacity_limit_mw?: number | null;
  active_faults: FaultModel[];
  switches: SwitchModel[];
  batteries: BatteryModel[];
  power_flow: PowerFlowResult;
  buildings_3d: Building3DState[];
  action_log: Array<{
    revision: number;
    timestamp: string;
    action: string;
    target_id?: string;
    value?: number | null;
    description: string;
  }>;
  kpis: {
    total_demand_mw: number;
    total_served_mw: number;
    unserved_load_mw: number;
    total_load_restored_pct: number;
    critical_demand_mw: number;
    critical_served_mw: number;
    critical_load_restored_pct: number;
    total_generation_mw: number;
    total_losses_mw: number;
    max_line_loading_pct: number;
    min_voltage_pu: number;
    max_voltage_pu: number;
    energized_buses_count: number;
    total_buses_count: number;
    active_faults_count: number;
    active_violations_count: number;
    city_survival_index: number;
  };
  solver_provenance: string;
}

const INITIAL_BUILDINGS_3D: Building3DState[] = [
  {
    building_id: "BLDG-INTAKE-01",
    bus_id: "BUS-01",
    name: "33kV Bulk Grid Intake Substation",
    facility_type: "GRID_INTAKE",
    priority_tier: 1,
    criticality_weight: 5.0,
    position_3d: [-14, 0, -10],
    power_state: "SOURCE_ACTIVE",
    voltage_pu: 1.02,
    voltage_kv: 33.0,
    demand_mw: 0.0,
    critical_load_mw: 0.0,
    served_mw: 0.0,
    curtailed_mw: 0.0,
    generation_mw: 8.52,
  },
  {
    building_id: "BLDG-SUB-02",
    bus_id: "BUS-02",
    name: "11kV Central Primary Distribution Bus",
    facility_type: "SUBSTATION",
    priority_tier: 1,
    criticality_weight: 4.8,
    position_3d: [-7, 0, -4],
    power_state: "ENERGIZED",
    voltage_pu: 0.994,
    voltage_kv: 11.0,
    demand_mw: 0.0,
    critical_load_mw: 0.0,
    served_mw: 0.0,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-HOSPITAL-03",
    bus_id: "BUS-03",
    name: "Metro General Trauma Hospital",
    facility_type: "HOSPITAL",
    priority_tier: 1,
    criticality_weight: 5.0,
    position_3d: [-2, 0, -9],
    power_state: "ENERGIZED",
    voltage_pu: 0.981,
    voltage_kv: 11.0,
    demand_mw: 1.45,
    critical_load_mw: 1.45,
    served_mw: 1.45,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
    battery_soc_pct: 88.0,
  },
  {
    building_id: "BLDG-WATER-04",
    bus_id: "BUS-04",
    name: "Municipal Water Purification & Pumping Plant",
    facility_type: "WATER_TREATMENT",
    priority_tier: 1,
    criticality_weight: 4.7,
    position_3d: [5, 0, -8],
    power_state: "ENERGIZED",
    voltage_pu: 0.979,
    voltage_kv: 11.0,
    demand_mw: 1.2,
    critical_load_mw: 1.2,
    served_mw: 1.2,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-CONTROL-05",
    bus_id: "BUS-05",
    name: "GRID//ZERO Cyber-Defense & SCADA Command Center",
    facility_type: "CONTROL_CENTER",
    priority_tier: 1,
    criticality_weight: 4.9,
    position_3d: [0, 0, -1],
    power_state: "ENERGIZED",
    voltage_pu: 0.988,
    voltage_kv: 11.0,
    demand_mw: 0.85,
    critical_load_mw: 0.85,
    served_mw: 0.85,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-UNIV-06",
    bus_id: "BUS-06",
    name: "National Engineering University & Research Campus",
    facility_type: "UNIVERSITY",
    priority_tier: 2,
    criticality_weight: 3.2,
    position_3d: [-8, 0, 5],
    power_state: "ENERGIZED",
    voltage_pu: 0.976,
    voltage_kv: 11.0,
    demand_mw: 1.1,
    critical_load_mw: 0.55,
    served_mw: 1.1,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-RES-NORTH-07",
    bus_id: "BUS-07",
    name: "North High-Density Residential Towers",
    facility_type: "RESIDENTIAL",
    priority_tier: 2,
    criticality_weight: 2.5,
    position_3d: [7, 0, -2],
    power_state: "ENERGIZED",
    voltage_pu: 0.969,
    voltage_kv: 11.0,
    demand_mw: 1.5,
    critical_load_mw: 0.45,
    served_mw: 1.5,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-RES-SOUTH-08",
    bus_id: "BUS-08",
    name: "South Smart-Meter Residential District",
    facility_type: "RESIDENTIAL",
    priority_tier: 2,
    criticality_weight: 2.4,
    position_3d: [4, 0, 7],
    power_state: "ENERGIZED",
    voltage_pu: 0.965,
    voltage_kv: 11.0,
    demand_mw: 1.35,
    critical_load_mw: 0.4,
    served_mw: 1.35,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-IND-09",
    bus_id: "BUS-09",
    name: "East Heavy Semiconductor & Arc Furnace Plant",
    facility_type: "INDUSTRIAL",
    priority_tier: 3,
    criticality_weight: 1.2,
    position_3d: [13, 0, 3],
    power_state: "ENERGIZED",
    voltage_pu: 0.958,
    voltage_kv: 11.0,
    demand_mw: 1.9,
    critical_load_mw: 0.0,
    served_mw: 1.9,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-COMM-10",
    bus_id: "BUS-10",
    name: "Downtown Commercial Mall & Fleet Charging",
    facility_type: "COMMERCIAL",
    priority_tier: 3,
    criticality_weight: 1.4,
    position_3d: [-2, 0, 9],
    power_state: "ENERGIZED",
    voltage_pu: 0.964,
    voltage_kv: 11.0,
    demand_mw: 1.3,
    critical_load_mw: 0.2,
    served_mw: 1.3,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
  },
  {
    building_id: "BLDG-SOLAR-11",
    bus_id: "BUS-11",
    name: "West Urban Solar PV Microgrid Array (2.2 MW)",
    facility_type: "SOLAR",
    priority_tier: 2,
    criticality_weight: 3.5,
    position_3d: [-14, 0, 8],
    power_state: "SOURCE_ACTIVE",
    voltage_pu: 0.985,
    voltage_kv: 11.0,
    demand_mw: 0.0,
    critical_load_mw: 0.0,
    served_mw: 0.0,
    curtailed_mw: 0.0,
    generation_mw: 1.6,
  },
  {
    building_id: "BLDG-BESS-12",
    bus_id: "BUS-12",
    name: "Central Grid-Scale BESS Station (4.0 MWh / 1.5 MW)",
    facility_type: "BATTERY",
    priority_tier: 1,
    criticality_weight: 4.5,
    position_3d: [10, 0, 9],
    power_state: "ENERGIZED",
    voltage_pu: 0.974,
    voltage_kv: 11.0,
    demand_mw: 0.0,
    critical_load_mw: 0.0,
    served_mw: 0.0,
    curtailed_mw: 0.0,
    generation_mw: 0.0,
    battery_soc_pct: 82.0,
  },
];

const INITIAL_SESSION: SimulationSessionState = {
  session_id: "DEFAULT_CITY_SESSION",
  network_id: "TRAINING_FEEDER",
  network_name: "12-Bus Smart City Distribution Feeder (33/11 kV)",
  mission_id: null,
  revision: 1,
  sim_time_minutes: 0,
  seed: 42,
  source_capacity_limit_mw: null,
  active_faults: [],
  switches: [
    {
      switch_id: "SW-TIE-1",
      name: "North-South Residential Tie Switch (BUS-07 <-> BUS-08)",
      from_bus: "BUS-07",
      to_bus: "BUS-08",
      line_id: "LINE-TIE-07-08",
      switch_type: "TIE_SWITCH",
      normally_open: true,
      closed: false,
      operable: true,
      switching_cost: 1.0,
    },
    {
      switch_id: "SW-TIE-2",
      name: "Hospital-University Emergency Tie Switch (BUS-03 <-> BUS-06)",
      from_bus: "BUS-03",
      to_bus: "BUS-06",
      line_id: "LINE-TIE-03-06",
      switch_type: "TIE_SWITCH",
      normally_open: true,
      closed: false,
      operable: true,
      switching_cost: 1.0,
    },
    {
      switch_id: "SW-TIE-3",
      name: "Water-Industrial Ring Tie Switch (BUS-04 <-> BUS-09)",
      from_bus: "BUS-04",
      to_bus: "BUS-09",
      line_id: "LINE-TIE-04-09",
      switch_type: "TIE_SWITCH",
      normally_open: true,
      closed: false,
      operable: true,
      switching_cost: 1.0,
    },
    {
      switch_id: "SW-TIE-4",
      name: "Commercial-BESS Microgrid Tie Switch (BUS-10 <-> BUS-12)",
      from_bus: "BUS-10",
      to_bus: "BUS-12",
      line_id: "LINE-TIE-10-12",
      switch_type: "TIE_SWITCH",
      normally_open: true,
      closed: false,
      operable: true,
      switching_cost: 1.0,
    },
  ],
  batteries: [
    {
      battery_id: "BESS-CITY-1",
      name: "Central Grid BESS (BUS-12)",
      bus_id: "BUS-12",
      capacity_kwh: 4000,
      soc_kwh: 3280,
      soc_percent: 82.0,
      soc_min_percent: 15.0,
      soc_max_percent: 95.0,
      max_discharge_kw: 1500,
      max_charge_kw: 1200,
      current_dispatch_kw: 0,
      charge_efficiency: 0.94,
      discharge_efficiency: 0.94,
      status: "ONLINE",
    },
    {
      battery_id: "BESS-HOSP-1",
      name: "Hospital Trauma Emergency BESS (BUS-03)",
      bus_id: "BUS-03",
      capacity_kwh: 1500,
      soc_kwh: 1320,
      soc_percent: 88.0,
      soc_min_percent: 15.0,
      soc_max_percent: 95.0,
      max_discharge_kw: 600,
      max_charge_kw: 500,
      current_dispatch_kw: 0,
      charge_efficiency: 0.95,
      discharge_efficiency: 0.95,
      status: "ONLINE",
    },
  ],
  power_flow: {
    status: "SUCCESS",
    message:
      "AC Power Flow converged in 3 iterations. Kirchhoff power balance verified.",
    network_id: "TRAINING_FEEDER",
    scenario_id: "BASE_CASE",
    buses: INITIAL_BUILDINGS_3D.map((b) => ({
      bus_id: b.bus_id,
      name: b.name,
      voltage_kv: b.voltage_kv,
      voltage_pu: b.voltage_pu,
      voltage_angle_deg: -1.4,
      p_gen_mw: b.generation_mw,
      q_gen_mvar: 0.4,
      p_load_mw: b.served_mw,
      q_load_mvar: b.served_mw * 0.3,
    })),
    lines: [
      {
        line_id: "LINE-01-02",
        name: "33/11kV Primary Substation Trunk",
        from_bus: "BUS-01",
        to_bus: "BUS-02",
        p_from_mw: 9.21,
        q_from_mvar: 3.1,
        p_to_mw: -9.12,
        q_to_mvar: -2.9,
        pl_mw: 0.09,
        ql_mvar: 0.2,
        loading_percent: 61.4,
        i_ka: 0.48,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-02-03",
        name: "Dedicated Hospital Feeder A1",
        from_bus: "BUS-02",
        to_bus: "BUS-03",
        p_from_mw: 2.98,
        q_from_mvar: 0.95,
        p_to_mw: -2.95,
        q_to_mvar: -0.91,
        pl_mw: 0.03,
        ql_mvar: 0.04,
        loading_percent: 54.2,
        i_ka: 0.16,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-02-04",
        name: "Water Works Trunk Feeder A2",
        from_bus: "BUS-02",
        to_bus: "BUS-04",
        p_from_mw: 1.22,
        q_from_mvar: 0.41,
        p_to_mw: -1.2,
        q_to_mvar: -0.39,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 34.8,
        i_ka: 0.07,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-02-05",
        name: "SCADA Command Center Feeder",
        from_bus: "BUS-02",
        to_bus: "BUS-05",
        p_from_mw: 2.22,
        q_from_mvar: 0.72,
        p_to_mw: -2.2,
        q_to_mvar: -0.7,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 44.4,
        i_ka: 0.12,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-02-06",
        name: "University & South Trunk B1",
        from_bus: "BUS-02",
        to_bus: "BUS-06",
        p_from_mw: 2.7,
        q_from_mvar: 0.85,
        p_to_mw: -2.66,
        q_to_mvar: -0.81,
        pl_mw: 0.04,
        ql_mvar: 0.04,
        loading_percent: 49.1,
        i_ka: 0.14,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-03-07",
        name: "Hospital-North Residential Branch",
        from_bus: "BUS-03",
        to_bus: "BUS-07",
        p_from_mw: 1.5,
        q_from_mvar: 0.48,
        p_to_mw: -1.48,
        q_to_mvar: -0.46,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 37.5,
        i_ka: 0.08,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-05-08",
        name: "Control-South Residential Branch",
        from_bus: "BUS-05",
        to_bus: "BUS-08",
        p_from_mw: 1.35,
        q_from_mvar: 0.42,
        p_to_mw: -1.33,
        q_to_mvar: -0.4,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 33.8,
        i_ka: 0.07,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-07-09",
        name: "North-East Industrial Feeder",
        from_bus: "BUS-07",
        to_bus: "BUS-09",
        p_from_mw: 1.92,
        q_from_mvar: 0.65,
        p_to_mw: -1.9,
        q_to_mvar: -0.62,
        pl_mw: 0.02,
        ql_mvar: 0.03,
        loading_percent: 48.0,
        i_ka: 0.11,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-06-10",
        name: "University-Commercial Mall Feeder",
        from_bus: "BUS-06",
        to_bus: "BUS-10",
        p_from_mw: 1.32,
        q_from_mvar: 0.41,
        p_to_mw: -1.3,
        q_to_mvar: -0.39,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 33.0,
        i_ka: 0.07,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-06-11",
        name: "West Solar Microgrid Interconnect",
        from_bus: "BUS-06",
        to_bus: "BUS-11",
        p_from_mw: -1.58,
        q_from_mvar: -0.2,
        p_to_mw: 1.6,
        q_to_mvar: 0.22,
        pl_mw: 0.02,
        ql_mvar: 0.02,
        loading_percent: 36.4,
        i_ka: 0.08,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-08-12",
        name: "South-Central BESS Feeder",
        from_bus: "BUS-08",
        to_bus: "BUS-12",
        p_from_mw: 0.0,
        q_from_mvar: 0.0,
        p_to_mw: 0.0,
        q_to_mvar: 0.0,
        pl_mw: 0.0,
        ql_mvar: 0.0,
        loading_percent: 5.2,
        i_ka: 0.01,
        status: "IN_SERVICE",
      },
      {
        line_id: "LINE-TIE-07-08",
        name: "Tie Line SW-TIE-1 (BUS-07 <-> BUS-08)",
        from_bus: "BUS-07",
        to_bus: "BUS-08",
        p_from_mw: 0,
        q_from_mvar: 0,
        p_to_mw: 0,
        q_to_mvar: 0,
        pl_mw: 0,
        ql_mvar: 0,
        loading_percent: 0,
        i_ka: 0,
        status: "OUT_OF_SERVICE",
      },
      {
        line_id: "LINE-TIE-03-06",
        name: "Tie Line SW-TIE-2 (BUS-03 <-> BUS-06)",
        from_bus: "BUS-03",
        to_bus: "BUS-06",
        p_from_mw: 0,
        q_from_mvar: 0,
        p_to_mw: 0,
        q_to_mvar: 0,
        pl_mw: 0,
        ql_mvar: 0,
        loading_percent: 0,
        i_ka: 0,
        status: "OUT_OF_SERVICE",
      },
      {
        line_id: "LINE-TIE-04-09",
        name: "Tie Line SW-TIE-3 (BUS-04 <-> BUS-09)",
        from_bus: "BUS-04",
        to_bus: "BUS-09",
        p_from_mw: 0,
        q_from_mvar: 0,
        p_to_mw: 0,
        q_to_mvar: 0,
        pl_mw: 0,
        ql_mvar: 0,
        loading_percent: 0,
        i_ka: 0,
        status: "OUT_OF_SERVICE",
      },
      {
        line_id: "LINE-TIE-10-12",
        name: "Tie Line SW-TIE-4 (BUS-10 <-> BUS-12)",
        from_bus: "BUS-10",
        to_bus: "BUS-12",
        p_from_mw: 0,
        q_from_mvar: 0,
        p_to_mw: 0,
        q_to_mvar: 0,
        pl_mw: 0,
        ql_mvar: 0,
        loading_percent: 0,
        i_ka: 0,
        status: "OUT_OF_SERVICE",
      },
    ],
    violations: [],
    power_balance: {
      total_generation_mw: 10.95,
      total_load_mw: 10.65,
      total_losses_mw: 0.3,
      balance_error_mw: 0.0001,
      converged: true,
      iterations: 3,
    },
    execution_time_ms: 4.2,
  },
  buildings_3d: INITIAL_BUILDINGS_3D,
  action_log: [
    {
      revision: 1,
      timestamp: "2026-10-25T15:00:00Z",
      action: "INITIALIZE_SESSION",
      description:
        "Initialized TRAINING_FEEDER 12-bus urban distribution feeder (AC_SOLVED).",
    },
  ],
  kpis: {
    total_demand_mw: 10.65,
    total_served_mw: 10.65,
    unserved_load_mw: 0.0,
    total_load_restored_pct: 100.0,
    critical_demand_mw: 5.1,
    critical_served_mw: 5.1,
    critical_load_restored_pct: 100.0,
    total_generation_mw: 10.95,
    total_losses_mw: 0.3,
    max_line_loading_pct: 61.4,
    min_voltage_pu: 0.958,
    max_voltage_pu: 1.02,
    energized_buses_count: 12,
    total_buses_count: 12,
    active_faults_count: 0,
    active_violations_count: 0,
    city_survival_index: 100.0,
  },
  solver_provenance: "REFERENCE_PREVIEW",
};

interface SimulationStore {
  session: SimulationSessionState;
  selectedAssetId: string | null;
  cameraPreset:
    | "ISOMETRIC"
    | "TOP_DOWN"
    | "HOSPITAL"
    | "SUBSTATION"
    | "FAULT"
    | "RESTORATION"
    | "FREE";
  overlayMode:
    "ENERGIZATION" | "CRITICALITY" | "VOLTAGE" | "THERMAL" | "ALGORITHM_TRACE";
  activeTraceNodeIds: string[];
  activeTraceEdgeIds: string[];
  caperResult: any | null;
  comparisonResult: any | null;
  missionEvaluation: any | null;
  loading: boolean;
  error: string | null;

  setSelectedAssetId: (id: string | null) => void;
  setCameraPreset: (preset: SimulationStore["cameraPreset"]) => void;
  setOverlayMode: (mode: SimulationStore["overlayMode"]) => void;
  setTraceHighlight: (nodes: string[], edges: string[]) => void;

  fetchSession: (networkId?: string) => Promise<void>;
  resetSession: (
    networkId?: string,
    missionId?: string | null,
    sourceCapMw?: number | null,
  ) => Promise<void>;
  applyAction: (
    actionType: string,
    targetId: string,
    value?: number | null,
  ) => Promise<void>;
  undoAction: () => Promise<void>;
  runCaper: () => Promise<any>;
  compareRestorations: () => Promise<any>;
  applyRestorationPlan: (algorithm?: string) => Promise<void>;
}

async function requireOk(response: Response) {
  if (response.ok) return;
  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    message = typeof body.detail === "string" ? body.detail : message;
  } catch {}
  throw new Error(message);
}

const API_BASE =
  typeof window !== "undefined"
    ? "/api/gridzero"
    : "http://127.0.0.1:8000/api/gridzero";

function sanitizeSession(s: any): SimulationSessionState {
  if (!s) return INITIAL_SESSION;
  const num = (v: any, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    ...s,
    buildings_3d: (s.buildings_3d || []).map((b: any) => ({
      ...b,
      voltage_pu: num(b.voltage_pu, 0),
      voltage_kv: num(b.voltage_kv, 11),
      demand_mw: num(b.demand_mw, 0),
      critical_load_mw: num(b.critical_load_mw, 0),
      served_mw: num(b.served_mw, 0),
      curtailed_mw: num(b.curtailed_mw, 0),
      generation_mw: num(b.generation_mw, 0),
    })),
    power_flow: s.power_flow
      ? {
          ...s.power_flow,
          buses: (s.power_flow.buses || []).map((b: any) => ({
            ...b,
            voltage_pu: num(b.voltage_pu, 0),
            angle_deg: num(b.angle_deg, 0),
            p_gen_mw: num(b.p_gen_mw, 0),
            q_gen_mvar: num(b.q_gen_mvar, 0),
            p_load_mw: num(b.p_load_mw, 0),
            q_load_mvar: num(b.q_load_mvar, 0),
          })),
          lines: (s.power_flow.lines || []).map((l: any) => ({
            ...l,
            p_from_mw: num(l.p_from_mw, 0),
            q_from_mvar: num(l.q_from_mvar, 0),
            p_to_mw: num(l.p_to_mw, 0),
            q_to_mvar: num(l.q_to_mvar, 0),
            pl_mw: num(l.pl_mw ?? l.loss_mw, 0),
            ql_mvar: num(l.ql_mvar ?? l.loss_mvar, 0),
            loading_percent: num(l.loading_percent, 0),
            i_ka: num(l.i_ka, 0),
          })),
        }
      : INITIAL_SESSION.power_flow,
  };
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  session: INITIAL_SESSION,
  selectedAssetId: "BUS-03",
  cameraPreset: "ISOMETRIC",
  overlayMode: "ENERGIZATION",
  activeTraceNodeIds: [],
  activeTraceEdgeIds: [],
  caperResult: null,
  comparisonResult: null,
  missionEvaluation: null,
  loading: false,
  error: null,

  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setOverlayMode: (mode) => set({ overlayMode: mode }),
  setTraceHighlight: (nodes, edges) =>
    set({ activeTraceNodeIds: nodes, activeTraceEdgeIds: edges }),

  fetchSession: async (networkId) => {
    const net = networkId || get().session.network_id || "TRAINING_FEEDER";
    set({ loading: true, error: null });
    try {
      const res = await fetch(
        `${API_BASE}/session?network_id=${encodeURIComponent(net)}`,
      );
      await requireOk(res);
      const data = await res.json();
      if (data.session) {
        set({ session: sanitizeSession(data.session), loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({
        loading: false,
        error:
          err?.message ||
          "Backend unavailable; the reference preview is not a solved operating state",
      });
    }
  },

  resetSession: async (networkId, missionId, sourceCapMw) => {
    const net = networkId || get().session.network_id || "TRAINING_FEEDER";
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/session/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network_id: net,
          mission_id: missionId || null,
          source_capacity_limit_mw: sourceCapMw ?? null,
        }),
      });
      await requireOk(res);
      const data = await res.json();
      set({
        session: data.session ? sanitizeSession(data.session) : get().session,
        missionEvaluation: data.evaluation || null,
        caperResult: null,
        comparisonResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Reset error" });
    }
  },

  applyAction: async (actionType, targetId, value = null) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/session/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          target_id: targetId,
          value,
        }),
      });
      await requireOk(res);
      const data = await res.json();
      set({
        session: data.session ? sanitizeSession(data.session) : get().session,
        missionEvaluation: data.evaluation || get().missionEvaluation,
        caperResult: null,
        comparisonResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Action failed" });
    }
  },

  undoAction: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/session/undo`, { method: "POST" });
      await requireOk(res);
      const data = await res.json();
      set({
        session: data.session ? sanitizeSession(data.session) : get().session,
        missionEvaluation: data.evaluation || get().missionEvaluation,
        caperResult: null,
        comparisonResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Undo failed" });
    }
  },

  runCaper: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/restoration/caper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ switching_budget: 5 }),
      });
      await requireOk(res);
      const data = await res.json();
      set({ caperResult: data, loading: false });
      return data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "CAPER execution failed" });
      return null;
    }
  },

  compareRestorations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/restoration/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ switching_budget: 5 }),
      });
      await requireOk(res);
      const data = await res.json();
      set({
        comparisonResult: data,
        caperResult: data.caper || get().caperResult,
        loading: false,
      });
      return data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Comparison failed" });
      return null;
    }
  },

  applyRestorationPlan: async (algorithm = "CAPER") => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/session/apply-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algorithm, switching_budget: 5 }),
      });
      await requireOk(res);
      const data = await res.json();
      set({
        session: data.session ? sanitizeSession(data.session) : get().session,
        missionEvaluation: data.evaluation || get().missionEvaluation,
        caperResult: null,
        comparisonResult: null,
        loading: false,
      });
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Apply plan failed" });
    }
  },
}));

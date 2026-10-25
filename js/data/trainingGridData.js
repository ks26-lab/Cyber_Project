/**
 * GRIDSEC 15-Node Training Grid Dataset
 * Designed specifically for intuitive, visual DSA Strategy Gameplay:
 * - Exactly 15 unique nodes with stable IDs.
 * - 2 Power Plants: GEN-1 (Hydro/Slack), GEN-2 (Solar/Wind).
 * - 8 Transmission & Distribution Substations: SUB-1 through SUB-8.
 * - 4 Critical Consumers: HOSPITAL (Apex Trauma Center), DEFENSE (Cyber Command),
 *   CITY-CORE (Metropolitan Commercial), WATER-PLANT (Pumping Works).
 * - 1 Isolated Valley Substation (ISLAND-SUB) connected solely via topological bridge.
 * - Multiple redundant mesh cycles for BFS, DFS, and Dijkstra alternate paths.
 * - Documented reproducible edge weights (lineLossMW).
 * - Explicit branch availability and deterministic bridges for Tarjan's algorithm.
 */

const TRAINING_GRID_DATA = {
  networkId: 'TRAINING_15',
  name: 'GRIDSEC 15-Node Training Grid',
  description: 'Deterministic 15-node schematic grid engineered for DSA-first power defense training.',
  totalNodes: 15,
  totalEdges: 21,

  // 15 Unique Graph Nodes with 2D Schematic Coordinates
  nodes: [
    // Generation Sources (Left Column)
    {
      id: 'GEN-1',
      name: 'Grand Falls Hydro Station',
      type: 'generator',
      subtype: 'hydro',
      voltage: '400 kV',
      capacityMW: 600,
      currentMW: 450,
      genMW: 450,
      demandMW: 0,
      x: 100,
      y: 160,
      status: 'healthy',
      zone: 'North Valley'
    },
    {
      id: 'GEN-2',
      name: 'Surya Solar & Wind Complex',
      type: 'generator',
      subtype: 'solar',
      voltage: '400 kV',
      capacityMW: 400,
      currentMW: 280,
      genMW: 280,
      demandMW: 0,
      x: 100,
      y: 380,
      status: 'healthy',
      zone: 'South Plains'
    },

    // Primary Bulk Transmission Substations (Mid-Left Column)
    {
      id: 'SUB-1',
      name: 'North Transmission Hub',
      type: 'substation',
      voltage: '400/220 kV',
      capacityMW: 500,
      currentMW: 320,
      demandMW: 15,
      x: 270,
      y: 140,
      status: 'healthy',
      zone: 'North Corridor'
    },
    {
      id: 'SUB-2',
      name: 'Central Intertie Substation',
      type: 'substation',
      voltage: '400/220 kV',
      capacityMW: 700,
      currentMW: 480,
      demandMW: 25,
      x: 300,
      y: 260,
      status: 'healthy',
      zone: 'Central Grid'
    },
    {
      id: 'SUB-3',
      name: 'South Gateway Substation',
      type: 'substation',
      voltage: '400/220 kV',
      capacityMW: 500,
      currentMW: 290,
      demandMW: 20,
      x: 270,
      y: 400,
      status: 'healthy',
      zone: 'South Corridor'
    },

    // Intermediate Switching Hubs (Center Column)
    {
      id: 'SUB-4',
      name: 'East Switching Hub',
      type: 'substation',
      voltage: '220 kV',
      capacityMW: 450,
      currentMW: 310,
      demandMW: 30,
      x: 470,
      y: 140,
      status: 'healthy',
      zone: 'East Sector'
    },
    {
      id: 'SUB-5',
      name: 'Metro Ring Substation Alpha',
      type: 'substation',
      voltage: '220/66 kV',
      capacityMW: 400,
      currentMW: 260,
      demandMW: 35,
      x: 470,
      y: 260,
      status: 'healthy',
      zone: 'Metro Sector'
    },
    {
      id: 'SUB-6',
      name: 'Industrial Distribution Hub',
      type: 'substation',
      voltage: '220/66 kV',
      capacityMW: 420,
      currentMW: 300,
      demandMW: 40,
      x: 470,
      y: 380,
      status: 'healthy',
      zone: 'Industrial Zone'
    },

    // Distribution & Spur Substations (Mid-Right Column)
    {
      id: 'SUB-7',
      name: 'Civic Feeder Substation',
      type: 'substation',
      voltage: '66/11 kV',
      capacityMW: 350,
      currentMW: 240,
      demandMW: 20,
      x: 640,
      y: 190,
      status: 'healthy',
      zone: 'Civic District'
    },
    {
      id: 'SUB-8',
      name: 'Valley Spur Substation',
      type: 'substation',
      voltage: '220/66 kV',
      capacityMW: 250,
      currentMW: 120,
      demandMW: 15,
      x: 470,
      y: 490,
      status: 'healthy',
      zone: 'Spur Zone'
    },

    // Critical Loads & Consumers (Right Column)
    {
      id: 'HOSPITAL',
      name: 'Apex Trauma & Medical Center',
      type: 'critical',
      subtype: 'hospital',
      voltage: '11 kV',
      capacityMW: 60,
      currentMW: 42,
      demandMW: 42,
      x: 800,
      y: 140,
      status: 'healthy',
      zone: 'Medical District',
      criticalPriority: 100
    },
    {
      id: 'DEFENSE',
      name: 'Strategic Cyber Command Base',
      type: 'critical',
      subtype: 'defense',
      voltage: '11 kV',
      capacityMW: 70,
      currentMW: 48,
      demandMW: 48,
      x: 800,
      y: 240,
      status: 'healthy',
      zone: 'Defense Bay',
      criticalPriority: 95
    },
    {
      id: 'CITY-CORE',
      name: 'Metro Commercial District',
      type: 'consumer',
      subtype: 'city',
      voltage: '11 kV',
      capacityMW: 200,
      currentMW: 140,
      demandMW: 140,
      x: 640,
      y: 330,
      status: 'healthy',
      zone: 'Metro Central'
    },
    {
      id: 'WATER-PLANT',
      name: 'Metropolitan Water Pumping Works',
      type: 'critical',
      subtype: 'water',
      voltage: '11 kV',
      capacityMW: 45,
      currentMW: 32,
      demandMW: 32,
      x: 800,
      y: 380,
      status: 'healthy',
      zone: 'Utility Sector',
      criticalPriority: 85
    },
    {
      id: 'ISLAND-SUB',
      name: 'Isolated Mountain Valley Substation',
      type: 'substation',
      subtype: 'island',
      voltage: '66 kV',
      capacityMW: 80,
      currentMW: 50,
      demandMW: 50,
      x: 660,
      y: 490,
      status: 'healthy',
      zone: 'Valley Basin'
    }
  ],

  // 21 Deterministic Transmission Corridors (Edges)
  edges: [
    // Generation Feeders
    { id: 'LINE-GEN1-SUB1', from: 'GEN-1', to: 'SUB-1', lineLossMW: 4.0, maxLoadMW: 450, lengthKm: 28, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-GEN1-SUB2', from: 'GEN-1', to: 'SUB-2', lineLossMW: 5.0, maxLoadMW: 400, lengthKm: 35, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-GEN2-SUB2', from: 'GEN-2', to: 'SUB-2', lineLossMW: 4.5, maxLoadMW: 350, lengthKm: 30, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-GEN2-SUB3', from: 'GEN-2', to: 'SUB-3', lineLossMW: 3.5, maxLoadMW: 350, lengthKm: 25, status: 'IN_SERVICE', isBridge: false },

    // Primary Bulk Interties (Ring 1)
    { id: 'LINE-SUB1-SUB2', from: 'SUB-1', to: 'SUB-2', lineLossMW: 3.0, maxLoadMW: 500, lengthKm: 20, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB2-SUB3', from: 'SUB-2', to: 'SUB-3', lineLossMW: 3.0, maxLoadMW: 500, lengthKm: 20, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB1-SUB4', from: 'SUB-1', to: 'SUB-4', lineLossMW: 4.0, maxLoadMW: 400, lengthKm: 26, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB2-SUB5', from: 'SUB-2', to: 'SUB-5', lineLossMW: 3.5, maxLoadMW: 450, lengthKm: 22, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB3-SUB6', from: 'SUB-3', to: 'SUB-6', lineLossMW: 4.0, maxLoadMW: 400, lengthKm: 25, status: 'IN_SERVICE', isBridge: false },

    // Intermediate Cross-Ties (Ring 2 — Redundant Alternate Bypasses)
    { id: 'LINE-SUB4-SUB5', from: 'SUB-4', to: 'SUB-5', lineLossMW: 3.0, maxLoadMW: 380, lengthKm: 18, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB5-SUB6', from: 'SUB-5', to: 'SUB-6', lineLossMW: 3.0, maxLoadMW: 380, lengthKm: 18, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB4-SUB7', from: 'SUB-4', to: 'SUB-7', lineLossMW: 4.5, maxLoadMW: 320, lengthKm: 28, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB5-SUB7', from: 'SUB-5', to: 'SUB-7', lineLossMW: 3.0, maxLoadMW: 350, lengthKm: 20, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB6-CITY', from: 'SUB-6', to: 'CITY-CORE', lineLossMW: 2.5, maxLoadMW: 300, lengthKm: 15, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB5-CITY', from: 'SUB-5', to: 'CITY-CORE', lineLossMW: 2.5, maxLoadMW: 300, lengthKm: 15, status: 'IN_SERVICE', isBridge: false },

    // Critical Healthcare Consumer: Dual-Feed Redundancy
    { id: 'LINE-SUB7-HOSP', from: 'SUB-7', to: 'HOSPITAL', lineLossMW: 2.0, maxLoadMW: 120, lengthKm: 12, status: 'IN_SERVICE', isBridge: false },
    { id: 'LINE-SUB4-HOSP', from: 'SUB-4', to: 'HOSPITAL', lineLossMW: 3.5, maxLoadMW: 100, lengthKm: 22, status: 'IN_SERVICE', isBridge: false },

    // Topological Bridges (Tarjan Demonstrators)
    { id: 'LINE-SUB7-DEFENSE', from: 'SUB-7', to: 'DEFENSE', lineLossMW: 2.5, maxLoadMW: 120, lengthKm: 14, status: 'IN_SERVICE', isBridge: true },
    { id: 'LINE-SUB6-WATER', from: 'SUB-6', to: 'WATER-PLANT', lineLossMW: 2.0, maxLoadMW: 100, lengthKm: 12, status: 'IN_SERVICE', isBridge: true },
    { id: 'LINE-SUB3-SUB8', from: 'SUB-3', to: 'SUB-8', lineLossMW: 5.0, maxLoadMW: 200, lengthKm: 32, status: 'IN_SERVICE', isBridge: true },
    { id: 'LINE-SUB8-ISLAND', from: 'SUB-8', to: 'ISLAND-SUB', lineLossMW: 4.0, maxLoadMW: 150, lengthKm: 24, status: 'IN_SERVICE', isBridge: true }
  ]
};

// Also expose as corridors for compatibility with any code expecting corridors array
TRAINING_GRID_DATA.corridors = TRAINING_GRID_DATA.edges.map(e => ({
  ...e,
  name: `${e.from} ↔ ${e.to} Transmission Path`,
  type: '220kV_AC',
  voltage: '220kV',
  distanceKm: e.lengthKm,
  currentFlowMW: Math.round(e.maxLoadMW * 0.45)
}));

window.TRAINING_GRID_DATA = TRAINING_GRID_DATA;

/**
 * GRIDSEC Power Grid Dataset
 * Realistic topology representing Power Plants, Transmission Substations,
 * Distribution Nodes, SCADA RTUs, and Critical Loads.
 */

window.GRID_DATA = {
  nodes: [
    // Generation Power Plants
    { id: 'GEN-01', name: 'Grand Falls Hydro Plant', type: 'plant', voltage: '500 kV', capacityMW: 850, currentMW: 720, zone: 'North Sector', region: 'NR', status: 'healthy', riskScore: 5, x: 120, y: 140, lat: 31.25, lon: 77.15 },
    { id: 'GEN-02', name: 'Oak Point Nuclear Station', type: 'plant', voltage: '500 kV', capacityMW: 1200, currentMW: 1100, zone: 'East Sector', region: 'SR', status: 'healthy', riskScore: 12, x: 120, y: 480, lat: 12.56, lon: 79.83 },
    { id: 'GEN-03', name: 'Pine River Solar Farm', type: 'plant', voltage: '230 kV', capacityMW: 450, currentMW: 380, zone: 'West Sector', region: 'WR', status: 'healthy', riskScore: 8, x: 140, y: 310, lat: 27.54, lon: 71.91 },
    
    // Bulk Transmission Substations
    { id: 'SUB-01', name: 'North Ridge Bulk Substation', type: 'substation', voltage: '500/230 kV', capacityMW: 900, currentMW: 700, zone: 'North Sector', region: 'NR', status: 'healthy', riskScore: 14, x: 320, y: 150, lat: 30.37, lon: 76.78 },
    { id: 'SUB-05', name: 'Highland Gateway Substation', type: 'substation', voltage: '500/230 kV', capacityMW: 800, currentMW: 620, zone: 'Central Sector', region: 'WR', status: 'healthy', riskScore: 18, x: 320, y: 320, lat: 26.91, lon: 75.78 },
    { id: 'SUB-042', name: 'Valley Junction Substation', type: 'substation', voltage: '500/230 kV', capacityMW: 750, currentMW: 580, zone: 'South Sector', region: 'WR', status: 'compromised', riskScore: 92, x: 340, y: 490, lat: 21.80, lon: 82.80 },
    { id: 'SUB-09', name: 'Bay Shore Transmission Hub', type: 'substation', voltage: '230/115 kV', capacityMW: 600, currentMW: 490, zone: 'East Sector', region: 'ER', status: 'suspicious', riskScore: 68, x: 500, y: 560, lat: 20.29, lon: 85.82 },
    
    // Intermediate SCADA Distribution Nodes & Switches
    { id: 'NODE-018', name: 'Telemetry Route Switch 18', type: 'switch', voltage: '115 kV', capacityMW: 400, currentMW: 310, zone: 'Central Sector', region: 'WR', status: 'suspicious', riskScore: 74, x: 520, y: 340, lat: 23.25, lon: 77.41 },
    { id: 'NODE-021', name: 'Industrial Feeder Node 21', type: 'switch', voltage: '115 kV', capacityMW: 380, currentMW: 290, zone: 'South Sector', region: 'WR', status: 'suspicious', riskScore: 65, x: 520, y: 450, lat: 21.17, lon: 79.08 },
    { id: 'NODE-014', name: 'North Metro Interconnect', type: 'switch', voltage: '230/115 kV', capacityMW: 500, currentMW: 410, zone: 'North Sector', region: 'NR', status: 'healthy', riskScore: 15, x: 520, y: 180, lat: 28.61, lon: 77.20 },
    { id: 'NODE-033', name: 'West Valley Distribution Point', type: 'switch', voltage: '69 kV', capacityMW: 280, currentMW: 220, zone: 'West Sector', region: 'WR', status: 'healthy', riskScore: 22, x: 340, y: 240, lat: 22.30, lon: 73.18 },
    
    // Distribution Substations
    { id: 'SUB-051', name: 'Metro Core Substation 51', type: 'substation', voltage: '115/13.8 kV', capacityMW: 550, currentMW: 480, zone: 'Metro Central', region: 'NR', status: 'healthy', riskScore: 48, x: 740, y: 340, lat: 28.55, lon: 77.55 },
    { id: 'SUB-058', name: 'Aerospace Substation 58', type: 'substation', voltage: '115/13.8 kV', capacityMW: 420, currentMW: 340, zone: 'Defense Corridor', region: 'NR', status: 'healthy', riskScore: 28, x: 740, y: 180, lat: 28.70, lon: 77.10 },
    { id: 'SUB-064', name: 'Harbor Marina Substation 64', type: 'substation', voltage: '69/13.8 kV', capacityMW: 320, currentMW: 260, zone: 'East Sector', region: 'WR', status: 'healthy', riskScore: 19, x: 720, y: 520, lat: 18.96, lon: 72.82 },

    // Critical Loads (Defense, Healthcare, Water, Finance)
    { id: 'CRIT-01', name: 'St. Jude Trauma Hospital', type: 'critical', voltage: '13.8 kV', capacityMW: 45, currentMW: 38, zone: 'Metro Central', region: 'NR', status: 'healthy', riskScore: 35, x: 920, y: 340, lat: 28.63, lon: 77.22 },
    { id: 'CRIT-02', name: 'National Defense Cyber Command', type: 'critical', voltage: '13.8 kV', capacityMW: 60, currentMW: 52, zone: 'Defense Corridor', region: 'NR', status: 'healthy', riskScore: 40, x: 920, y: 180, lat: 28.60, lon: 77.14 },
    { id: 'CRIT-03', name: 'Metropolitan Water Purification', type: 'critical', voltage: '13.8 kV', capacityMW: 40, currentMW: 35, zone: 'East Sector', region: 'WR', status: 'healthy', riskScore: 22, x: 920, y: 520, lat: 18.98, lon: 72.84 },
    { id: 'CRIT-04', name: 'Federal Reserve Data Center', type: 'critical', voltage: '13.8 kV', capacityMW: 55, currentMW: 48, zone: 'Metro Central', region: 'WR', status: 'healthy', riskScore: 30, x: 920, y: 420, lat: 19.07, lon: 72.87 }
  ],

  // Grid Edges (Transmission & Communication Lines)
  edges: [
    { from: 'GEN-01', to: 'SUB-01', distanceKm: 42, lineLossMW: 8, maxLoadMW: 900, status: 'active', isBridge: false },
    { from: 'GEN-02', to: 'SUB-042', distanceKm: 58, lineLossMW: 12, maxLoadMW: 1000, status: 'compromised', isBridge: false },
    { from: 'GEN-03', to: 'SUB-05', distanceKm: 28, lineLossMW: 5, maxLoadMW: 500, status: 'active', isBridge: false },
    { from: 'GEN-03', to: 'NODE-033', distanceKm: 22, lineLossMW: 4, maxLoadMW: 350, status: 'active', isBridge: false },

    { from: 'SUB-01', to: 'SUB-05', distanceKm: 35, lineLossMW: 6, maxLoadMW: 700, status: 'active', isBridge: false },
    { from: 'SUB-01', to: 'NODE-014', distanceKm: 30, lineLossMW: 5, maxLoadMW: 600, status: 'active', isBridge: false },
    { from: 'SUB-05', to: 'SUB-042', distanceKm: 40, lineLossMW: 9, maxLoadMW: 650, status: 'compromised', isBridge: false },
    { from: 'SUB-05', to: 'NODE-018', distanceKm: 25, lineLossMW: 4, maxLoadMW: 500, status: 'active', isBridge: false },
    { from: 'SUB-042', to: 'NODE-018', distanceKm: 29, lineLossMW: 6, maxLoadMW: 450, status: 'compromised', isBridge: false },
    { from: 'SUB-042', to: 'NODE-021', distanceKm: 24, lineLossMW: 5, maxLoadMW: 400, status: 'compromised', isBridge: false },
    { from: 'SUB-042', to: 'SUB-09', distanceKm: 38, lineLossMW: 7, maxLoadMW: 500, status: 'active', isBridge: false },

    { from: 'NODE-014', to: 'SUB-058', distanceKm: 32, lineLossMW: 5, maxLoadMW: 450, status: 'active', isBridge: false },
    { from: 'NODE-014', to: 'NODE-018', distanceKm: 26, lineLossMW: 4, maxLoadMW: 400, status: 'active', isBridge: false },
    { from: 'NODE-018', to: 'NODE-021', distanceKm: 18, lineLossMW: 3, maxLoadMW: 350, status: 'compromised', isBridge: false },
    { from: 'NODE-018', to: 'SUB-051', distanceKm: 31, lineLossMW: 5, maxLoadMW: 500, status: 'active', isBridge: false },
    { from: 'NODE-021', to: 'SUB-051', distanceKm: 27, lineLossMW: 4, maxLoadMW: 420, status: 'compromised', isBridge: false },
    { from: 'NODE-021', to: 'SUB-064', distanceKm: 34, lineLossMW: 6, maxLoadMW: 380, status: 'active', isBridge: false },
    { from: 'SUB-09', to: 'SUB-064', distanceKm: 28, lineLossMW: 4, maxLoadMW: 400, status: 'active', isBridge: false },

    { from: 'SUB-058', to: 'CRIT-02', distanceKm: 12, lineLossMW: 1, maxLoadMW: 100, status: 'active', isBridge: true },
    { from: 'SUB-051', to: 'CRIT-01', distanceKm: 8, lineLossMW: 1, maxLoadMW: 80, status: 'active', isBridge: true },
    { from: 'SUB-051', to: 'CRIT-04', distanceKm: 10, lineLossMW: 1, maxLoadMW: 90, status: 'active', isBridge: true },
    { from: 'SUB-064', to: 'CRIT-03', distanceKm: 14, lineLossMW: 2, maxLoadMW: 70, status: 'active', isBridge: true },

    // Redundant Backup Link for Resilient Rerouting
    { from: 'SUB-058', to: 'SUB-051', distanceKm: 30, lineLossMW: 5, maxLoadMW: 400, status: 'backup', isBridge: false },
    { from: 'SUB-05', to: 'NODE-014', distanceKm: 28, lineLossMW: 4, maxLoadMW: 450, status: 'active', isBridge: false }
  ]
};

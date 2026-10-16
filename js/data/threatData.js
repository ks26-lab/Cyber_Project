/**
 * GRIDSEC Threat Data & SCADA Deep Packet Inspection Database
 * Realistic industrial control system telemetry, function codes, and PMU desync events.
 */

window.THREAT_DATA = [
  {
    id: 'THR-8902',
    severity: 'CRITICAL',
    timestamp: '08:42:31.104',
    source: 'SUB-042 (Valley Junction)',
    destination: 'NODE-018 (Transit Switch)',
    protocol: 'DNP3 Outstation (Port 20000)',
    functionCode: '0x05 (Direct-Operate No-Ack)',
    objectGroup: 'Group 12 (Control Relay Block)',
    hexPayload: '05 64 14 f3 01 00 2a 00 0c 01 01 00 05 01 00 00',
    eventType: 'Unauthorized Breaker Trip Command',
    description: 'Malicious direct-operate command injected targeting 500kV primary bus circuit breaker without SCADA master authorization token.',
    status: 'ACTIVE',
    riskDelta: '+45',
    storageEngine: 'OpenSearch (SIEM) + Kafka Topic: ics.dnp3.alerts'
  },
  {
    id: 'THR-8903',
    severity: 'CRITICAL',
    timestamp: '08:42:33.450',
    source: 'NODE-018 (Transit Switch)',
    destination: 'NODE-021 (Industrial Feeder)',
    protocol: 'Modbus TCP (Port 502)',
    functionCode: '0x03 / 0x10 (Read/Write Multiple)',
    objectGroup: 'Holding Registers 40001-40100',
    hexPayload: '00 01 00 00 00 06 01 10 00 01 00 02 04 00 00 00',
    eventType: 'Lateral Register Overwrite Scan',
    description: 'Rapid polling and unauthorized register overwrite attempt across intermediate feeder transformer protection relays.',
    status: 'ACTIVE',
    riskDelta: '+30',
    storageEngine: 'OpenSearch (SIEM) + Kafka Topic: ics.modbus.scan'
  },
  {
    id: 'THR-8904',
    severity: 'HIGH',
    timestamp: '08:42:36.812',
    source: 'SUB-042 (Valley Junction)',
    destination: 'GEN-02 (Oak Point Nuclear)',
    protocol: 'IEEE C37.118 (Synchrophasor)',
    functionCode: 'Data Frame 0x01 (Phasor Stream)',
    objectGroup: 'Voltage Phasor Phase-A (PMU-02)',
    hexPayload: 'aa 01 00 3c 00 02 60 ea 44 20 00 00 42 c8 00 00',
    eventType: 'False Data Injection (FDI Phase Spoof)',
    description: 'Phasor measurement unit timestamp desynchronization (+12.4° angle error) injected to trigger synthetic generator frequency trip.',
    status: 'ACTIVE',
    riskDelta: '+25',
    storageEngine: 'TimescaleDB (PMU Hypertable: pmu_telemetry_raw)'
  },
  {
    id: 'THR-8905',
    severity: 'MEDIUM',
    timestamp: '08:40:12.600',
    source: 'SUB-09 (Bay Shore Hub)',
    destination: 'SUB-064 (Harbor Marina)',
    protocol: 'IEC 60870-5-104 (Port 2404)',
    functionCode: 'Type 45 (Single Command C_SC_NA_1)',
    objectGroup: 'Information Object Address (IOA: 5001)',
    hexPayload: '68 0e 00 00 00 00 2d 01 06 00 01 00 89 13 00 01',
    eventType: 'Authentication Handshake Failure',
    description: '14 consecutive invalid TLS certificate handshakes on RTU gateway firmware management interface.',
    status: 'INVESTIGATING',
    riskDelta: '+15',
    storageEngine: 'PostgreSQL Audit Table: rtu_auth_failures'
  }
];

window.INCIDENTS_DATA = [
  {
    id: 'INC-1042',
    title: 'Substation SUB-042 DNP3 Command Injection & Lateral Movement',
    severity: 'CRITICAL',
    affectedNode: 'SUB-042',
    attackType: 'DNP3 Function 0x05 Injection / Lateral Relay Sweep',
    detectedAt: '08:42:31.104',
    status: 'Investigating',
    assignedAnalyst: 'Alex Morgan (Lead Grid Operator)',
    origin: 'SUB-042 (South Valley 500/230 kV)',
    hops: ['SUB-042', 'NODE-018', 'NODE-021', 'SUB-051'],
    criticalThreatened: ['CRIT-01 (General Trauma Hospital)', 'CRIT-04 (Federal Data Center)'],
    containmentPoint: 'NODE-018 / NODE-021 Boundary Isolation',
    details: 'Adversary breached South Valley perimeter gateway SUB-042. Graph traversal engine detected lateral propagation advancing toward Metro Substation 51 serving emergency hospital infrastructure.'
  }
];

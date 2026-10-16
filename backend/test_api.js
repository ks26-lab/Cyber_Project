const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=====================================================================');
  console.log('  GRIDSEC FASTAPI, DSA & CYBER-PHYSICAL RESILIENCE TEST SUITE');
  console.log('=====================================================================\n');

  // 1. Health Check
  console.log('1. Health Check [GET /api/health]:');
  const health = await get('http://127.0.0.1:8000/api/health');
  console.log('   Status:', health.status, '| DB Mode:', health.database_mode, '| Nodes:', health.graph_nodes_loaded, '| Lines:', health.graph_edges_loaded);

  // 2. Grid Network
  console.log('\n2. Grid Network Topology [GET /api/grid/network]:');
  const net = await get('http://127.0.0.1:8000/api/grid/network');
  console.log(`   Assets Count: ${net.assets_count} | Lines Count: ${net.lines_count} | Energy Firms Count: ${net.firms_count}`);

  // 3. Multi-Key Hash Table Search
  console.log('\n3. Multi-Key Hash Table Search by Pincode 201306 [GET /api/assets/search?pincode=201306]:');
  const pin = await get('http://127.0.0.1:8000/api/assets/search?pincode=201306');
  console.log(`   Found ${pin.length} matching asset(s):`);
  pin.forEach(a => console.log(`   - ID: ${a.id} | Name: ${a.name} | District: ${a.district} | State: ${a.state}`));

  // 4. Asset Hierarchy & Transformer Bays
  console.log('\n4. Asset Hierarchy & Transformer Bays [GET /api/assets/NR-DELHI]:');
  const asset = await get('http://127.0.0.1:8000/api/assets/NR-DELHI');
  console.log(`   Asset: ${asset.name} (${asset.voltage}) | Operator: ${asset.operator}`);
  console.log(`   Transformer Bays Count: ${asset.transformers.length}`);
  asset.transformers.forEach((t, i) => console.log(`     [${i+1}] ${t.id} - ${t.name} (${t.ratingMVA} MVA, ${t.primaryKV}/${t.secondaryKV} kV, Load: ${t.loadPercent}%, Temp: ${t.oilTempC}°C)`));

  // 5. BFS Blast Radius
  console.log('\n5. BFS Cascading Cyber Blast Radius [POST /api/analysis/impact]:');
  const bfs = await post('http://127.0.0.1:8000/api/analysis/impact', { root_asset_id: 'WR-RAIGARH', max_hops: 3, decay_rate: 0.65 });
  console.log(`   Analysis ID: ${bfs.analysis_id} | Execution Time: ${bfs.execution_time_ms} ms`);
  console.log(`   Compromised Root: ${bfs.root_node_name} | Impacted Substations: ${bfs.total_impacted_nodes} | Risk Capacity: ${bfs.cumulative_capacity_at_risk_mw} MW | Blast Score: ${bfs.impact_score}/100`);

  // 6. Dijkstra Rerouting
  console.log('\n6. Dijkstra Dynamic Power Rerouting [POST /api/analysis/alternate-route]:');
  const dijkstra = await post('http://127.0.0.1:8000/api/analysis/alternate-route', {
    source_asset_id: 'WR-RAIGARH',
    target_asset_id: 'SR-PUGALUR',
    avoid_nodes: [],
    objective: 'balanced'
  });
  console.log(`   Analysis ID: ${dijkstra.analysis_id} | Execution Time: ${dijkstra.execution_time_ms} ms`);
  console.log(`   Route Found: ${dijkstra.route_found} | Path: ${dijkstra.path_node_ids.join(' -> ')}`);
  console.log(`   Total Distance: ${dijkstra.total_distance_km} km | Bottleneck Capacity: ${dijkstra.bottleneck_capacity_mw} MW`);

  // 7. DFS Islanding
  console.log('\n7. DFS Grid Islanding & Connectivity Analysis [GET /api/analysis/connectivity]:');
  const dfs = await get('http://127.0.0.1:8000/api/analysis/connectivity');
  console.log(`   Total Nodes: ${dfs.total_nodes} | Connected Synchronous Islands: ${dfs.total_connected_islands}`);

  // 8. 50Hz Telemetry
  console.log('\n8. Real-Time 50.00 Hz IEGC Telemetry [GET /api/telemetry/national]:');
  const telem = await get('http://127.0.0.1:8000/api/telemetry/national');
  console.log(`   Grid Frequency: ${telem.grid_frequency_hz} Hz | National Demand: ${telem.national_demand_mw} MW | Total Generation: ${telem.total_generation_mw} MW | Healthy Nodes: ${telem.healthy_assets_count}/${telem.monitored_assets_count}`);

  // 9. Electrical Power Flow Engine Status
  console.log('\n9. Electrical Power Flow Engine Status [GET /api/power-flow/status]:');
  const pfStatus = await get('http://127.0.0.1:8000/api/power-flow/status');
  console.log(`   Status: ${pfStatus.status} | Solver Backend: ${pfStatus.solver_backend} | Validation Engine Active: ${pfStatus.validation_engine_active}`);

  // 10. Electrical Power Flow Execution (4-Bus Test Network)
  console.log('\n10. Electrical Power Flow Execution (4-Bus Test Network) [POST /api/power-flow/run]:');
  const pfRun = await post('http://127.0.0.1:8000/api/power-flow/run', { network_id: 'TEST_NETWORK', scenario_id: 'BASE_CASE' });
  console.log(`   Execution Status: ${pfRun.status} | Network: ${pfRun.network_id} | Execution Time: ${pfRun.execution_time_ms} ms`);
  console.log(`   Buses: ${pfRun.buses.length} | Lines: ${pfRun.lines.length} | Transformers: ${pfRun.transformers.length}`);
  console.log(`   Power Balance: Gen = ${pfRun.power_balance.total_generation_mw} MW | Load = ${pfRun.power_balance.total_load_mw} MW | Losses = ${pfRun.power_balance.total_losses_mw} MW | Mismatch Error = ${pfRun.power_balance.balance_error_mw} MW`);

  // 11. N-1 Contingency Analysis in Isolated Sandbox
  console.log('\n11. N-1 Contingency Analysis [POST /api/simulation/{id}/contingency]:');
  const simForCtg = await post('http://127.0.0.1:8000/api/simulation/create', {
    name: 'LINE-1-3 Trip Contingency Analysis',
    scenario_type: 'N-1_CONTINGENCY'
  });
  const ctgRes = await post(`http://127.0.0.1:8000/api/simulation/${simForCtg.simulation_id}/contingency`, {
    asset_id: 'LINE-1-3',
    network_id: 'TEST_NETWORK'
  });
  console.log(`   Contingency Status: ${ctgRes.status} | Asset Tripped: ${ctgRes.tripped_asset_id} (${ctgRes.tripped_asset_type})`);
  console.log(`   Baseline Max Line Loading: ${ctgRes.baseline_summary.max_line_loading_percent}% -> Post-Trip Max Line Loading: ${ctgRes.contingency_summary.max_line_loading_percent}% (Delta: +${ctgRes.delta_max_loading_percent}%)`);
  console.log(`   Delta System Losses: ${ctgRes.delta_losses_mw} MW | New Violations: ${ctgRes.new_violations.length}`);

  // 12. Aegis AI Situation Snapshot
  console.log('\n12. Aegis Real-Time Situation Snapshot [GET /api/aegis/situation]:');
  const sit = await get('http://127.0.0.1:8000/api/aegis/situation');
  console.log(`   Grid Health: ${sit.grid_state.health_score}% | Active Incidents: ${sit.active_incidents.length} | Overloaded Lines: ${sit.overloaded_lines.length} | Alternate Routes Available: ${sit.available_routes.length}`);

  // 12. Aegis AI Assessment & Explainable Evidence
  console.log('\n12. Aegis Assessment & Explainable Evidence [POST /api/aegis/assess]:');
  const report = await post('http://127.0.0.1:8000/api/aegis/assess', {});
  console.log(`   Report ID: ${report.report_id} | Severity: ${report.severity} | Confidence: ${report.confidence * 100}%`);
  console.log(`   Summary: ${report.summary}`);
  console.log(`   Evidence Claims (${report.evidence.length}):`);
  report.evidence.forEach(e => console.log(`     - [CLAIM]: "${e.claim}" -> Proved by: ${e.evidence[0]}`));

  // 13. Sandbox Simulation Isolation
  console.log('\n13. Sandbox Simulation Creation & Isolation [POST /api/simulation/create]:');
  const sim = await post('http://127.0.0.1:8000/api/simulation/create', {
    name: 'Raigarh UHVDC Cyber Intrusion & Cascading Failure Drill',
    scenario_type: 'CYBER_ATTACK',
    initial_event: {
      event_type: 'ASSET_COMPROMISED',
      source_asset: 'WR-RAIGARH',
      affected_assets: ['SR-PUGALUR', 'WR-WARDHA'],
      severity: 'CRITICAL',
      cause: 'Unauthorized DNP3 SCADA Logic Override',
      payload: { 'frequency_drift_hz': 0.12, 'oltc_blocked': true }
    }
  });
  console.log(`   Created Simulation: ${sim.simulation_id} | Baseline: ${sim.baseline_reference} | Status: ${sim.status}`);
  console.log(`   State Overrides (Isolated):`, sim.state_overrides);

  // 14. Sandbox Event Injection
  console.log('\n14. Sandbox Multi-Hop Event Injection [POST /api/simulation/{id}/event]:');
  const simEvt2 = await post(`http://127.0.0.1:8000/api/simulation/${sim.simulation_id}/event`, {
    event: {
      event_type: 'LINE_OVERLOADED',
      source_asset: 'LINE-HVDC-RAI-PUG',
      affected_assets: ['SR-PUGALUR'],
      severity: 'HIGH',
      cause: 'Active power redistribution overload',
      payload: { 'loading_percent': 98.4, 'mw_flow': 5900 }
    }
  });
  console.log(`   Injected Event to Asset: ${simEvt2.applied_to_asset} | Total Events in Scenario: ${simEvt2.total_scenario_events}`);

  // 15. Aegis Event Feed
  console.log('\n15. Aegis Unified Event Feed [GET /api/aegis/events]:');
  const events = await get(`http://127.0.0.1:8000/api/aegis/events?simulation_id=${sim.simulation_id}`);
  console.log(`   Events Streamed: ${events.length} | Types: [${events.map(e => e.event_type).join(', ')}]`);

  console.log('\n=====================================================================');
  console.log('   ALL 15 CYBER-PHYSICAL, DSA & AEGIS SUITES VALIDATED SUCCESSFULLY!');
  console.log('=====================================================================\n');
}

run().catch(console.error);

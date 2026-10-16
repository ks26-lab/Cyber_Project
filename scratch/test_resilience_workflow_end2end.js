const fs = require('fs');

// Global mock window object
global.window = global;
global.window.addEventListener = () => {};
const createMockEl = (tag = 'div') => ({
  tagName: tag.toUpperCase(),
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
  appendChild: () => {},
  prepend: () => {},
  setAttribute: () => {},
  getAttribute: () => null,
  children: [],
  innerHTML: '',
  textContent: '',
  value: ''
});

global.document = {
  createElement: (tag) => createMockEl(tag),
  getElementById: (id) => {
    const el = createMockEl('div');
    el.id = id;
    if (id === 'routeSourceSelect') el.value = 'GEN-01';
    if (id === 'routeDestSelect') el.value = 'SUB-051';
    return el;
  },
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {}
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.location = { hash: '' };

// Mock fetch for cyber simulate endpoint if called
global.fetch = async (url, opts) => {
  console.log(` -> mock fetch called: ${url}`);
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      attack_type: 'substation_breach',
      tripped_branches: 2,
      total_load_loss_mw: 45.5,
      isolation_time_ms: 120,
      impact: 'Critical grid disruption prevented by safety relays'
    })
  };
};

// Mock Leaflet L
global.L = {
  map: (id, opts) => {
    return {
      id,
      fitBounds: (b) => { console.log('   [MAP] fitBounds called with bounds len:', b ? b.length : 0); },
      invalidateSize: () => {},
      zoomIn: () => {},
      zoomOut: () => {}
    };
  },
  tileLayer: () => ({ addTo: () => {} }),
  layerGroup: () => {
    const items = [];
    return {
      addTo: () => {},
      addLayer: (l) => items.push(l),
      clearLayers: () => {}
    };
  },
  polyline: (pts, opts) => {
    return { addTo: () => {}, setStyle: () => {} };
  },
  circleMarker: (pts, opts) => {
    return { addTo: () => {}, bindPopup: () => {}, setStyle: () => {} };
  }
};

// Mock Views
global.DashboardView = { render: () => '<div>Dashboard</div>' };
global.MapView = { render: () => '<div>Map</div>', updateNodeTelemetry: () => {} };
global.SimulatorView = { render: () => '<div>Simulator</div>' };
global.CascadeView = { render: () => '<div>Cascade</div>' };
global.ThreatsView = { render: () => '<div>Threats</div>' };
global.AssetsView = { render: () => '<div>Assets</div>' };
global.InvestigateView = { render: () => '<div>Investigate</div>' };

// Load grid scripts & view
eval(fs.readFileSync('js/data/gridData.js', 'utf8'));
eval(fs.readFileSync('js/data/indiaGridData.js', 'utf8'));
eval(fs.readFileSync('js/engine/graph.js', 'utf8'));
eval(fs.readFileSync('js/engine/dsaEngine.js', 'utf8'));
eval(fs.readFileSync('js/visualizer/indiaMapVisualizer.js', 'utf8'));
eval(fs.readFileSync('js/views/networkAnalysisView.js', 'utf8'));

const appCode = fs.readFileSync('js/app.js', 'utf8');
eval(appCode + '\n global.GridSecApp = GridSecApp;');

console.log("=== END-TO-END RESILIENCE WORKFLOW AUTOMATED TEST ===");

const app = new GridSecApp();
global.window.app = app;

async function runTestCase(source, destination) {
  console.log(`\n==================================================`);
  console.log(`TEST CASE: ${source} ➔ ${destination}`);
  console.log(`==================================================`);

  // Step 1: Generate Route
  console.log(`\n[STEP 1] Generating Resilience Route...`);
  const genResult = app.generateResilienceRoute(source, destination);
  console.log(`   - Route Path: ${genResult.path.join(' ➔ ')}`);
  console.log(`   - Risk Weight: ${genResult.totalRiskWeight.toFixed(2)}, Hops: ${genResult.path.length - 1}`);
  console.log(`   - Estimated Power Loss: ${genResult.powerLoss.toFixed(2)} MW`);
  console.log(`   - Candidates evaluated: ${genResult.candidateCount}`);
  console.log(`   - App Workflow State: ${app.resilienceWorkflow.state}`);

  if (app.resilienceWorkflow.state !== 'ROUTE_GENERATED') {
    throw new Error(`Expected state ROUTE_GENERATED, got ${app.resilienceWorkflow.state}`);
  }

  // Pick an intermediate node on the active route to attack
  const activePath = app.resilienceWorkflow.activeRoute;
  const attackTarget = activePath.length > 2 ? activePath[1] : activePath[0];
  console.log(`\n[STEP 2] Selecting target node for attack: ${attackTarget}`);
  app.prepareRouteAttack(attackTarget);
  console.log(`   - App Workflow State: ${app.resilienceWorkflow.state}`);
  console.log(`   - Selected target: ${app.resilienceWorkflow.selectedAttackTarget}`);

  // Step 3: Execute Attack
  console.log(`\n[STEP 3] Injecting attack on ${attackTarget}...`);
  await app.executeRouteAttack(attackTarget);
  const wf = app.resilienceWorkflow;
  console.log(`   - App Workflow State: ${wf.state}`);
  console.log(`   - Compromised nodes:`, Array.from(wf.compromisedNodes));

  if (wf.state === 'REROUTED') {
    const origMw = wf.originalPowerLoss || 0;
    const newMw = wf.activePowerLoss || 0;
    const deltaMw = Math.max(0, newMw - origMw);
    console.log(`   - New Path: ${wf.activeRoute.join(' ➔ ')}`);
    console.log(`   - Power Loss Delta: +${deltaMw.toFixed(2)} MW`);
    console.log(`   - Old Loss: ${origMw.toFixed(2)} MW ➔ New Loss: ${newMw.toFixed(2)} MW`);
  } else {
    console.log(`   - Workflow resulted in state: ${wf.state}`);
  }

  // Render network analysis view HTML to check template rendering without error
  const html = app.networkView ? app.networkView.render() : NetworkAnalysisView.render();
  console.log(`   - Network view HTML rendered cleanly (${html.length} chars)`);

  // Step 4: Recover / Resolve Attacks
  console.log(`\n[STEP 4] Resolving all attacks...`);
  app.resolveResilienceAttacks();
  console.log(`   - App Workflow State: ${app.resilienceWorkflow.state}`);
  console.log(`   - Remaining compromised nodes count: ${app.resilienceWorkflow.compromisedNodes.size}`);

  console.log(`\n✔ TEST CASE PASSED FOR ${source} ➔ ${destination}`);
}

async function runAll() {
  try {
    await runTestCase('GEN-01', 'SUB-051');
    await runTestCase('GEN-02', 'CRIT-01');
    console.log('\n==================================================');
    console.log('ALL RESILIENCE WORKFLOW TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('\n✖ TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

runAll();

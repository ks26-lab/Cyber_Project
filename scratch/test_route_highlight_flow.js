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
    el.value = id === 'routeSourceSelect' ? 'GEN-01' : (id === 'routeDestSelect' ? 'SUB-01' : '');
    return el;
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.location = { hash: '' };

// Mock Leaflet L
global.L = {
  map: (id, opts) => {
    return {
      id,
      fitBounds: (b) => { console.log(' -> Leaflet map.fitBounds called with points count:', b.length); },
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
global.NetworkAnalysisView = { render: () => '<div>Network</div>' };
global.SimulatorView = { render: () => '<div>Simulator</div>' };
global.CascadeView = { render: () => '<div>Cascade</div>' };
global.ThreatsView = { render: () => '<div>Threats</div>' };
global.AssetsView = { render: () => '<div>Assets</div>' };
global.InvestigateView = { render: () => '<div>Investigate</div>' };

// Load grid scripts
eval(fs.readFileSync('js/data/gridData.js', 'utf8'));
eval(fs.readFileSync('js/data/indiaGridData.js', 'utf8'));
eval(fs.readFileSync('js/engine/graph.js', 'utf8'));
eval(fs.readFileSync('js/engine/dsaEngine.js', 'utf8'));
eval(fs.readFileSync('js/visualizer/indiaMapVisualizer.js', 'utf8'));

const appCode = fs.readFileSync('js/app.js', 'utf8');
eval(appCode + '\n global.GridSecApp = GridSecApp;');

console.log("=== TESTING NETWORK ANALYSIS -> MAP ROUTE HIGHLIGHT DATA FLOW ===");

const graph = new GridGraph();
graph.loadData(window.GRID_DATA);
const dsa = new DsaEngine(graph);

// 1. Calculate route GEN-01 -> SUB-01
const routeRes = dsa.findAlternateRoute('GEN-01', 'SUB-01');
console.log("1. DSA Route Calculation Result:", routeRes);

// 2. Instantiate GridSecApp
const app = new GridSecApp();
global.window.app = app;
app.navigate('network');

// 3. Trigger showMapWithHighlight
console.log("2. Triggering showMapWithHighlight(['GEN-01', 'SUB-01'], 'route')...");
app.showMapWithHighlight(['GEN-01', 'SUB-01'], 'route');

console.log("3. Master App pendingHighlight state:", app.pendingHighlight);
console.log("4. Current View:", app.currentView);

// Now trigger map initialization as happens when navigate('map') loads
app.initIndiaMapCanvas();
console.log("5. Visualizer instance attached:", !!app.indiaVisualizer);

if (app.indiaVisualizer) {
  const highlightSuccess = app.indiaVisualizer.highlightRoute(['GEN-01', 'SUB-01'], 'route');
  console.log("6. Direct highlightRoute execution success:", highlightSuccess);
}

console.log("=== TEST COMPLETE ===");

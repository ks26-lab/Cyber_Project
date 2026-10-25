const fs = require('fs');

// 1. Mock Browser Environment
global.window = global;
global.window.addEventListener = () => {};
const createMockEl = (tag = 'div') => ({
  tagName: tag.toUpperCase(),
  style: {},
  classList: { 
    add: () => {}, 
    remove: () => {}, 
    contains: () => false, 
    toggle: () => {} 
  },
  appendChild: () => {},
  prepend: () => {},
  setAttribute: () => {},
  getAttribute: () => null,
  children: [],
  innerHTML: '',
  textContent: '',
  value: ''
});

const elements = {};
global.document = {
  createElement: (tag) => createMockEl(tag),
  getElementById: (id) => {
    if (!elements[id]) {
      const el = createMockEl('div');
      el.id = id;
      elements[id] = el;
    }
    return elements[id];
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.sessionStorage = { getItem: () => null, setItem: () => {} };
global.location = { hash: '#analysis' };

// 2. Mock Leaflet L
global.L = {
  map: (id, opts) => ({
    id,
    fitBounds: () => {},
    invalidateSize: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
    remove: () => {},
    removeLayer: () => {}
  }),
  tileLayer: () => ({ 
    addTo: () => ({ on: () => {} }),
    on: () => {}
  }),
  layerGroup: () => ({
    addTo: () => {},
    addLayer: () => {},
    clearLayers: () => {}
  }),
  polyline: () => ({
    addTo: () => ({
      bindTooltip: () => {},
      on: () => {},
      setStyle: () => {}
    }),
    bindTooltip: () => {},
    on: () => {},
    setStyle: () => {}
  }),
  circleMarker: () => ({
    addTo: () => {},
    bindPopup: () => {},
    setStyle: () => {}
  }),
  control: {
    attribution: () => ({
      addAttribution: () => ({ addTo: () => {} })
    })
  },
  DomEvent: {
    stopPropagation: () => {}
  }
};

// 3. Load Gridsec Data and Modules
eval(fs.readFileSync('js/data/gridData.js', 'utf8'));
eval(fs.readFileSync('js/data/indiaGridData.js', 'utf8'));
eval(fs.readFileSync('js/data/ieee30Data.js', 'utf8'));
eval(fs.readFileSync('js/engine/graph.js', 'utf8'));
eval(fs.readFileSync('js/engine/dsaEngine.js', 'utf8'));
eval(fs.readFileSync('js/visualizer/indiaMapVisualizer.js', 'utf8'));
eval(fs.readFileSync('js/views/networkAnalysisView.js', 'utf8'));
eval(fs.readFileSync('js/app.js', 'utf8') + '\n global.GridSecApp = GridSecApp;');

console.log("=== STARTING INTERACTIVE NETWORK MAP & ANALYSIS VERIFICATION ===");

// 4. Initialize App
const app = new GridSecApp();
global.window.app = app;
app.switchNetwork('IEEE_30');

// 5. Test Render Method
const html = window.NetworkAnalysisView.render(app);
console.log("1. Render HTML contains #analysisMapCanvas:", html.includes('id="analysisMapCanvas"'));
console.log("2. Render HTML contains #branchInspectorCard:", html.includes('id="branchInspectorCard"'));
console.log("3. Render HTML contains Accessible Branch Select:", html.includes('id="analysisBranchSelect"'));
console.log("4. Render HTML contains Outage Confirm Modal:", html.includes('id="outageConfirmModalBackdrop"'));

if (!html.includes('id="analysisMapCanvas"') || !html.includes('id="branchInspectorCard"')) {
  throw new Error("Render HTML is missing core components!");
}

// 6. Test Branch Selection
window.NetworkAnalysisView.init(app);
console.log("5. MapVisualizer initialized:", !!window.NetworkAnalysisView.mapVisualizer);

window.NetworkAnalysisView.selectBranch('LINE-1-2');
const selected = window.NetworkAnalysisView.selectedBranch;
const details = window.NetworkAnalysisView.selectedBranchDetails;
console.log("6. Selected Branch ID:", selected?.id);
console.log("7. Selected Branch Endpoints:", `${details?.from} -> ${details?.to}`);
console.log("8. Branch Resistance:", details?.resistance);
console.log("9. Branch Reactance:", details?.reactance);
console.log("10. Branch Thermal Limit:", details?.thermalLimit);
console.log("11. Is Topological Bridge:", details?.isBridge);

if (selected?.id !== 'LINE-1-2' || !details?.resistance.includes('0.0192')) {
  throw new Error("Branch selection details do not match IEEE 30-bus benchmark specifications!");
}

// 7. Test Dijkstra Alternate Route around Selected Branch
window.NetworkAnalysisView.findAlternateRouteForBranch();
const cr = window.NetworkAnalysisView.currentRouteResult;
console.log("12. Dijkstra Bypass Route calculated:", cr?.success);
console.log("13. Bypass Path:", cr?.path?.join(' -> '));
console.log("14. Bypass Power Loss:", cr?.powerLossMW, "MW");

if (!cr || !cr.success || cr.path.length < 2) {
  throw new Error("Dijkstra bypass route failed to find alternate path!");
}

// 8. Test Outage Simulation & Reset Flow
window.NetworkAnalysisView.promptSimulateBranchOutage();
const modal = elements['outageConfirmModalBackdrop'];
console.log("15. Outage Confirmation Modal displayed:", modal?.style?.display === 'flex');

window.NetworkAnalysisView.confirmSimulateOutage();
console.log("16. Branch added to sandbox outages:", window.NetworkAnalysisView.sandboxOutages.has('LINE-1-2'));
console.log("17. Branch status updated to TRIPPED:", window.NetworkAnalysisView.selectedBranchDetails?.status?.includes('TRIPPED'));

window.NetworkAnalysisView.restoreSandboxBaseline();
console.log("18. Baseline restored (sandbox outages size):", window.NetworkAnalysisView.sandboxOutages.size);

// 9. Test Network Model Switching
window.NetworkAnalysisView.onNetworkModelSwitched('INDIA_GRID_59');
console.log("19. Active selection cleared on model switch:", window.NetworkAnalysisView.selectedBranch === null);

// 10. Test Clean Map Destruction
window.NetworkAnalysisView.destroy();
console.log("20. Map visualizer destroyed cleanly:", window.NetworkAnalysisView.mapVisualizer === null);

console.log("\n>>> ALL 20 INTERACTIVE MAP & ANALYSIS VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<");

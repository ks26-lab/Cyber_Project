/**
 * Headless Automated Verification Runner for test_defender_gameplay.html
 * Executes all 14 game-loop, story-narrative, DSA, and visualizer tests
 * using Node.js with a virtual DOM / browser mock.
 */

const fs = require('fs');
const path = require('path');

// 1. Virtual Browser Environment
global.window = global;
global.window.addEventListener = (event, fn) => {
  if (event === 'DOMContentLoaded') {
    // will trigger manually
  }
};

const elements = {};
const createMockEl = (tag = 'div') => {
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    children: [],
    appendChild: function(child) { this.children.push(child); return child; },
    prepend: function(child) { this.children.unshift(child); return child; },
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k] || null; },
    querySelectorAll: function(selector) {
      const results = [];
      function search(node) {
        if (!node || !node.children) return;
        node.children.forEach(c => {
          if (selector === 'svg' && c.tagName === 'SVG') results.push(c);
          else if (selector.includes('data-node-id') && c['data-node-id']) results.push(c);
          else if (selector.includes('data-edge-id') && c['data-edge-id']) results.push(c);
          search(c);
        });
      }
      search(this);
      return results;
    },
    querySelector: function(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    },
    innerHTML: '',
    textContent: '',
    value: ''
  };
  return el;
};

global.document = {
  createElement: (tag) => createMockEl(tag),
  createElementNS: (ns, tag) => {
    const el = createMockEl(tag);
    el.namespaceURI = ns;
    return el;
  },
  getElementById: (id) => {
    if (!elements[id]) {
      const el = createMockEl('div');
      el.id = id;
      elements[id] = el;
    }
    return elements[id];
  },
  querySelectorAll: (selector) => [],
  addEventListener: () => {}
};

global.sessionStorage = {
  store: {},
  getItem: function(k) { return this.store[k] || null; },
  setItem: function(k, v) { this.store[k] = String(v); }
};

global.localStorage = {
  store: {},
  getItem: function(k) { return this.store[k] || null; },
  setItem: function(k, v) { this.store[k] = String(v); }
};

// 2. Load Core Dependencies
const basePath = path.resolve(__dirname, '..');
eval(fs.readFileSync(path.join(basePath, 'js/data/gridData.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/data/indiaGridData.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/data/ieee30Data.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/data/trainingGridData.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/data/threatData.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/engine/graph.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/engine/dsaEngine.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/visualizer/trainingGraphVisualizer.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/engine/characterDialogue.js'), 'utf8'));
eval(fs.readFileSync(path.join(basePath, 'js/views/defenderView.js'), 'utf8'));

// Extract test logic from test_defender_gameplay.html
const htmlContent = fs.readFileSync(path.join(basePath, 'test_defender_gameplay.html'), 'utf8');
const scriptStart = htmlContent.indexOf('window.__TEST_RESULTS__ = {');
const scriptEnd = htmlContent.lastIndexOf('</script>');
const testScript = htmlContent.substring(scriptStart, scriptEnd);

eval(testScript);

// Run the verification
console.log("===============================================================================");
console.log("  GRIDSEC GRID DEFENDER: HEADLESS VERIFICATION SUITE");
console.log("===============================================================================");

runAllTests().then(() => {
  console.log("\n-------------------------------------------------------------------------------");
  console.log(`TOTAL TESTS: ${window.__TEST_RESULTS__.total}`);
  console.log(`PASSED:      ${window.__TEST_RESULTS__.passed}`);
  console.log(`FAILED:      ${window.__TEST_RESULTS__.failed}`);
  console.log("-------------------------------------------------------------------------------");
  
  window.__TEST_RESULTS__.details.forEach(d => {
    console.log(`[${d.success ? 'PASS' : 'FAIL'}] Test ${d.num}: ${d.name}`);
    if (!d.success) {
      console.log(`       Message: ${d.message}`);
      if (d.evidence) console.log(`       Evidence: ${d.evidence}`);
    }
  });

  if (window.__TEST_RESULTS__.failed > 0) {
    console.error("\nTEST SUITE FAILED");
    process.exit(1);
  } else {
    console.log("\nALL 14 TEST SUITE TESTS PASSED 100%!");
  }
}).catch(err => {
  console.error("Runner Exception:", err);
  process.exit(1);
});

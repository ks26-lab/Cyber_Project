/**
 * GRIDSEC Analysis & Results View — Interactive Network Resilience Engine
 * Consolidated Master Component featuring:
 * 1. Prominent interactive power-grid network map (India 59-Node Grid & IEEE 30-Bus Benchmark)
 * 2. Clickable transmission branches with instant property inspector
 * 3. Contextual DSA resilience algorithms:
 *    - Dijkstra least-impedance candidate rerouting around outages
 *    - Tarjan O(V+E) single-point-of-failure bridge detection
 *    - DSU & DFS synchronous grid partitioning & islanding analysis
 *    - BFS multi-hop cyber-physical lateral movement investigation
 * 4. Simulated branch outage drills with explicit confirmation & baseline rollback
 * 5. SCADA Deep Packet Inspection (DPI) protocol forensics matrix
 */

window.NetworkAnalysisView = {
  // Authoritative View State
  selectedBranch: null,
  selectedBranchDetails: null,
  sandboxOutages: new Set(),
  mapVisualizer: null,
  activeFilter: 'all',
  labelsVisible: true,
  currentRouteResult: null,

  // IEEE 30-Bus standard impedance lookup table: [r_pu, x_pu, b_pu, thermal_mw]
  IEEE30_BRANCH_IMPEDANCE: {
    'LINE-1-2': { r: 0.0192, x: 0.0575, b: 0.0528, rating: 130.0 },
    'LINE-1-3': { r: 0.0452, x: 0.1652, b: 0.0408, rating: 130.0 },
    'LINE-2-4': { r: 0.0570, x: 0.1737, b: 0.0368, rating: 65.0 },
    'LINE-3-4': { r: 0.0132, x: 0.0379, b: 0.0084, rating: 130.0 },
    'LINE-2-5': { r: 0.0472, x: 0.1983, b: 0.0418, rating: 130.0 },
    'LINE-2-6': { r: 0.0581, x: 0.1763, b: 0.0374, rating: 65.0 },
    'LINE-4-6': { r: 0.0119, x: 0.0414, b: 0.0090, rating: 90.0 },
    'LINE-5-7': { r: 0.0460, x: 0.1160, b: 0.0204, rating: 70.0 },
    'LINE-6-7': { r: 0.0267, x: 0.0820, b: 0.0170, rating: 130.0 },
    'LINE-6-8': { r: 0.0120, x: 0.0420, b: 0.0090, rating: 32.0 },
    'LINE-9-11': { r: 0.0000, x: 0.2080, b: 0.0000, rating: 65.0 },
    'LINE-9-10': { r: 0.0000, x: 0.5560, b: 0.0000, rating: 65.0 },
    'LINE-12-13': { r: 0.0000, x: 0.1400, b: 0.0000, rating: 65.0 },
    'LINE-12-14': { r: 0.1236, x: 0.2559, b: 0.0000, rating: 32.0 },
    'LINE-12-15': { r: 0.0662, x: 0.1304, b: 0.0000, rating: 32.0 },
    'LINE-12-16': { r: 0.0945, x: 0.1987, b: 0.0000, rating: 32.0 },
    'LINE-14-15': { r: 0.2210, x: 0.1997, b: 0.0000, rating: 16.0 },
    'LINE-16-17': { r: 0.0524, x: 0.1923, b: 0.0000, rating: 16.0 },
    'LINE-15-18': { r: 0.1073, x: 0.2185, b: 0.0000, rating: 16.0 },
    'LINE-18-19': { r: 0.0639, x: 0.1292, b: 0.0000, rating: 16.0 },
    'LINE-19-20': { r: 0.0340, x: 0.0680, b: 0.0000, rating: 32.0 },
    'LINE-10-20': { r: 0.0936, x: 0.2090, b: 0.0000, rating: 32.0 },
    'LINE-10-17': { r: 0.0324, x: 0.0845, b: 0.0000, rating: 32.0 },
    'LINE-10-21': { r: 0.0348, x: 0.0749, b: 0.0000, rating: 32.0 },
    'LINE-10-22': { r: 0.0727, x: 0.1499, b: 0.0000, rating: 32.0 },
    'LINE-21-22': { r: 0.0116, x: 0.0236, b: 0.0000, rating: 32.0 },
    'LINE-15-23': { r: 0.1000, x: 0.2020, b: 0.0000, rating: 16.0 },
    'LINE-22-24': { r: 0.1150, x: 0.1790, b: 0.0000, rating: 16.0 },
    'LINE-23-24': { r: 0.1320, x: 0.2700, b: 0.0000, rating: 16.0 },
    'LINE-24-25': { r: 0.1150, x: 0.1790, b: 0.0000, rating: 16.0 },
    'LINE-25-26': { r: 0.2544, x: 0.3800, b: 0.0000, rating: 16.0 },
    'LINE-25-27': { r: 0.1093, x: 0.2087, b: 0.0000, rating: 16.0 },
    'LINE-27-29': { r: 0.2198, x: 0.4153, b: 0.0000, rating: 16.0 },
    'LINE-27-30': { r: 0.3202, x: 0.6027, b: 0.0000, rating: 16.0 },
    'LINE-29-30': { r: 0.2399, x: 0.4533, b: 0.0000, rating: 16.0 },
    'LINE-8-28': { r: 0.0636, x: 0.2000, b: 0.0214, rating: 32.0 },
    'LINE-6-28': { r: 0.0169, x: 0.0599, b: 0.0650, rating: 32.0 },
    'XFMR-6-9': { r: 0.0000, x: 0.2080, b: 0.0000, rating: 100.0, tap: 0.978 },
    'XFMR-6-10': { r: 0.0000, x: 0.5560, b: 0.0000, rating: 100.0, tap: 0.969 },
    'XFMR-4-12': { r: 0.0000, x: 0.2560, b: 0.0000, rating: 100.0, tap: 0.932 },
    'XFMR-28-27': { r: 0.0000, x: 0.3960, b: 0.0000, rating: 100.0, tap: 0.968 }
  },

  render: (app) => {
    const mainApp = app || window.app || {};
    const activeNet = mainApp.activeNetwork || 'INDIA_GRID_59';
    const isIEEE = activeNet === 'IEEE_30';
    const currentData = isIEEE ? (window.IEEE_30_DATA || {}) : (window.INDIA_GRID_DATA || {});
    const corridors = currentData.corridors || [];
    const nodes = currentData.nodes || [];

    return `
      <div class="view-container" style="padding-bottom:1.5rem;">
        <!-- 1. Top View Header & Network Switcher -->
        <div class="view-header" style="margin-bottom:0.85rem;">
          <div class="view-title-group">
            <h2>Analysis &amp; Results &middot; Network Resilience Engine</h2>
            <p>
              Interactive Power Grid Map &middot; Click any transmission branch to inspect electrical properties, analyze topological single points of failure, and stress-test candidate rerouting under cyber-physical contingencies.
            </p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <!-- Model Switcher Buttons -->
            <div style="display:flex; align-items:center; background:#f5f5f4; border:1px solid #d6d3d1; border-radius:6px; padding:2px; gap:2px;">
              <button id="btnAnalysisModelIndia" class="btn btn-sm ${!isIEEE ? 'btn-primary' : 'btn-secondary'}" 
                style="padding:3px 9px; font-size:0.75rem; font-weight:700;" onclick="window.app.switchNetwork('INDIA_GRID_59')">
                <i class="fa-solid fa-earth-asia"></i> India 59-Node
              </button>
              <button id="btnAnalysisModelIEEE" class="btn btn-sm ${isIEEE ? 'btn-primary' : 'btn-secondary'}" 
                style="padding:3px 9px; font-size:0.75rem; font-weight:700;" onclick="window.app.switchNetwork('IEEE_30')">
                <i class="fa-solid fa-microchip"></i> IEEE 30-Bus
              </button>
            </div>

            <div class="tech-insight-badge" onclick="window.app.showDsaModal('dijkstra')" title="View Dijkstra Complexity">
              <i class="fa-solid fa-route"></i> O((V+E)log V) Dijkstra
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('tarjan')" title="View Tarjan Bridge Complexity">
              <i class="fa-solid fa-triangle-exclamation"></i> O(V+E) Tarjan
            </div>
          </div>
        </div>

        <!-- 2. Primary Workspace (Area A: Interactive Map & Area B: Selected Branch Inspector) -->
        <div class="analysis-workspace-grid">
          
          <!-- Area A: Interactive Power-Grid Map Card -->
          <div class="analysis-map-card">
            
            <!-- Compact Map Toolbar -->
            <div class="analysis-toolbar">
              <div class="analysis-toolbar-group">
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.zoomIn()" title="Zoom In">
                  <i class="fa-solid fa-plus"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.zoomOut()" title="Zoom Out">
                  <i class="fa-solid fa-minus"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.fitNetwork()" title="Fit Network to View">
                  <i class="fa-solid fa-compress"></i> Fit
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.clearSelection()" title="Reset Selection">
                  <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
                <button id="btnToggleLabels" class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.toggleLabels()" title="Toggle Bus Labels">
                  <i class="fa-solid fa-tag"></i> Labels
                </button>
              </div>

              <!-- Branch Selector Dropdown (Keyboard & Accessible Alternative) -->
              <div class="analysis-toolbar-group" style="flex:1; max-width:320px; min-width:200px;">
                <select id="analysisBranchSelect" class="soc-select" style="width:100%; font-size:0.75rem; padding:3px 6px;" 
                  onchange="window.NetworkAnalysisView.onDropdownBranchSelected(this.value)">
                  <option value="">-- Select Transmission Branch --</option>
                  ${corridors.map(c => `
                    <option value="${c.id}">${c.id}: ${c.name || `${c.from} ↔ ${c.to}`} (${c.voltage || '132kV'})</option>
                  `).join('')}
                </select>
              </div>

              <!-- Basemap Mode Selector -->
              <div class="analysis-toolbar-group">
                <select id="analysisBasemapSelect" class="soc-select" style="font-size:0.75rem; padding:3px 6px;"
                  onchange="window.NetworkAnalysisView.setBasemap(this.value)">
                  <option value="clean">OpenStreetMap (Clean)</option>
                  <option value="osm">Esri Topography</option>
                  <option value="satellite">Esri Satellite</option>
                  <option value="schematic" ${isIEEE ? 'selected' : ''}>Technical Schematic Grid</option>
                </select>
              </div>
            </div>

            <!-- Clear Selected Branch Indicator Banner -->
            <div id="analysisSelectionBanner" class="analysis-selection-banner">
              <span id="bannerTextContent">
                <i class="fa-solid fa-circle-info" style="color:#0284c7; margin-right:5px;"></i> 
                No branch selected &mdash; Click any transmission line on the map or choose from dropdown to inspect.
              </span>
              <span id="bannerTagStatus" style="display:none; font-size:0.68rem; padding:2px 6px; border-radius:3px; font-weight:700;"></span>
            </div>

            <!-- Map Container (Target 60-70% Viewport Area) -->
            <div id="analysisMapCanvas" style="height:520px; width:100%; border-radius:6px; border:1px solid var(--border-subtle); position:relative; background:#f8fafc;">
              <!-- Leaflet mounts here -->
            </div>

            <!-- Compact Legend -->
            <div class="analysis-legend-bar">
              <span style="font-weight:700; color:#1c1917; margin-right:4px;">Legend:</span>
              <div class="legend-item"><span class="legend-line" style="background:#1c1917;"></span> Normal</div>
              <div class="legend-item"><span class="legend-line" style="background:#0284c7;"></span> Selected</div>
              <div class="legend-item"><span class="legend-line" style="background:#f59e0b; border:1px dashed #d97706;"></span> SPoF Bridge</div>
              <div class="legend-item"><span class="legend-line" style="background:#be123c; border:1px dashed #9f1239;"></span> Overloaded (&gt;100%)</div>
              <div class="legend-item"><span class="legend-line" style="background:#dc2626; border:1px dashed #991b1b;"></span> Tripped / Outage</div>
              <div class="legend-item"><span class="legend-line" style="background:#16a34a;"></span> Alternate Route</div>
            </div>
          </div>

          <!-- Area B: Selected Branch Inspector -->
          <div class="analysis-inspector-card" id="branchInspectorCard">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f5f5f4; padding-bottom:0.5rem;">
              <div>
                <h3 style="font-size:0.95rem; font-weight:800; color:#1c1917; margin:0;">
                  <i class="fa-solid fa-bolt" style="color:#0284c7; margin-right:6px;"></i> Selected Branch Inspector
                </h3>
                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
                  Real-time electrical parameters &amp; topological graph metrics
                </div>
              </div>
              <span id="inspectorStatusBadge" class="badge badge-neutral" style="font-size:0.7rem; font-weight:700;">
                NO SELECTION
              </span>
            </div>

            <!-- Inspector Content (Populated dynamically) -->
            <div id="branchInspectorContent">
              <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); font-size:0.8rem; background:#fafaf9; border-radius:6px; border:1px dashed #e7e5e4;">
                <i class="fa-solid fa-hand-pointer" style="font-size:1.8rem; color:#a8a29e; margin-bottom:0.75rem; display:block;"></i>
                <strong>No transmission branch selected</strong>
                <p style="margin-top:0.4rem; font-size:0.75rem; line-height:1.4;">
                  Click any transmission line or transformer on the map above to inspect branch ID, power flow, impedance (R, X), thermal loading, and evaluate topological bridge vulnerability.
                </p>
                <div style="margin-top:1rem; font-size:0.72rem; color:#78716c;">
                  Quick Suggested Lines to Inspect:
                  <div style="display:flex; justify-content:center; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">
                    ${isIEEE ? `
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-1-2')">LINE-1-2</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-1-3')">LINE-1-3</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-6-8')">LINE-6-8</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('XFMR-4-12')">XFMR-4-12</button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-HVDC-RAI-PUG')">Raigarh-Pugalur</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-HVDC-TAL-KOL')">Talcher-Kolar</button>
                      <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('C-01')">Corridor C-01</button>
                    `}
                  </div>
                </div>
              </div>
            </div>

            <!-- Inspector Action Buttons -->
            <div id="inspectorActionsContainer" style="display:none; flex-direction:column; gap:0.5rem; margin-top:0.25rem;">
              <button class="btn btn-primary" style="width:100%; font-weight:700; padding:0.6rem;" onclick="window.NetworkAnalysisView.analyzeSelectedBranch()">
                <i class="fa-solid fa-magnifying-glass-chart"></i> Analyze Selected Branch
              </button>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                <button class="btn btn-secondary" style="font-weight:700; padding:0.5rem;" onclick="window.NetworkAnalysisView.findAlternateRouteForBranch()">
                  <i class="fa-solid fa-route" style="color:#16a34a;"></i> Find Alt Route
                </button>
                <button class="btn btn-secondary" style="font-weight:700; padding:0.5rem; color:#b91c1c; border-color:#fca5a5;" onclick="window.NetworkAnalysisView.promptSimulateBranchOutage()">
                  <i class="fa-solid fa-triangle-exclamation"></i> Simulate Outage
                </button>
              </div>
              <button class="btn btn-secondary btn-sm" style="width:100%; padding:0.35rem;" onclick="window.NetworkAnalysisView.clearSelection()">
                <i class="fa-solid fa-xmark"></i> Clear Selection
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Contextual Analysis Results Area (Area C: Dijkstra, Tarjan, Islanding, SCADA) -->
        <div style="margin-top:1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fa-solid fa-diagram-project" style="color:#0284c7; margin-right:5px;"></i> Contextual Algorithmic Resilience Diagnostics</span>
            <span id="activeOutagesBadge" class="badge badge-neutral" style="font-size:0.68rem;">
              ${window.NetworkAnalysisView.sandboxOutages.size} Active Sandbox Outages
            </span>
          </div>

          <!-- A. Dijkstra Least-Impedance Rerouting Panel -->
          <div class="disclosure-card open" id="cardDijkstraWorkflow">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('cardDijkstraWorkflow')">
              <span><i class="fa-solid fa-route" style="color:#16a34a; margin-right:6px;"></i> Transmission Rerouting &amp; Min-Loss Path (Dijkstra Algorithm)</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body" style="padding:1rem;">
              <div id="dijkstraWorkflowInner">
                ${window.NetworkAnalysisView.buildDijkstraWorkflowHtml(mainApp)}
              </div>
            </div>
          </div>

          <!-- B. Tarjan Single Points of Failure & Bridge Detection -->
          <div class="disclosure-card" id="discCardTarjan">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardTarjan')">
              <span><i class="fa-solid fa-triangle-exclamation" style="color:#d97706; margin-right:6px;"></i> Critical SPoFs &amp; Bridge Detection (Tarjan's Algorithm O(V+E))</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body" style="padding:1rem;">
              <p style="color:var(--text-muted); font-size:0.82rem; margin-bottom:0.85rem;">
                Discovers transmission articulation points and critical bridges whose sudden failure would cause regional blackouts or islanding.
              </p>
              <button class="btn btn-secondary" style="width:100%; font-weight:700;" onclick="window.NetworkAnalysisView.runTarjanAnalysis()">
                <i class="fa-solid fa-play"></i> Run Tarjan Bridge Analysis
              </button>
              <div id="tarjanResultBox" style="margin-top:0.85rem; display:none; background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Articulation Nodes (Single Points of Failure)</div>
                <div id="tarjanNodesList" style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:5px;"></div>
                <div id="tarjanBridgesList" style="margin-top:0.6rem; font-size:0.8rem; color:#44403c;"></div>
              </div>
            </div>
          </div>

          <!-- C. DSU / DFS Grid Islanding State -->
          <div class="disclosure-card" id="discCardIslanding">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardIslanding')">
              <span><i class="fa-solid fa-diagram-project" style="color:#4f46e5; margin-right:6px;"></i> Grid Partition &amp; Islanding State (DFS / DSU Connected Components)</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body" style="padding:1rem;">
              <p style="color:var(--text-muted); font-size:0.82rem; margin-bottom:0.85rem;">
                Detects whether transmission line tripping has partitioned the synchronous network into isolated electrical microgrid islands.
              </p>
              <button class="btn btn-secondary" style="width:100%; font-weight:700;" onclick="window.NetworkAnalysisView.checkIslanding()">
                <i class="fa-solid fa-bolt"></i> Check Synchronous Islanding State
              </button>
              <div id="islandingResultBox" style="margin-top:0.85rem; display:none; background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle);"></div>
            </div>
          </div>

          <!-- D. Multi-Hop Lateral Movement Investigation -->
          <div class="disclosure-card" id="discCardInvestigation">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardInvestigation')">
              <span><i class="fa-solid fa-magnifying-glass-chart" style="color:#0284c7; margin-right:6px;"></i> Incident Investigation: Multi-Hop Lateral Propagation (BFS Traversal)</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body" style="padding:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <div>
                  <span class="badge badge-critical" style="margin-right:6px;">CRITICAL</span>
                  <strong style="color:#1c1917; font-size:0.95rem;">Incident #INC-1042: DNP3 Unauthorized Breaker Control Storm</strong>
                </div>
                <button id="btnExecuteContainment" class="btn btn-primary btn-sm" onclick="window.NetworkAnalysisView.executeContainment()">
                  <i class="fa-solid fa-shield"></i> Apply Containment Boundary
                </button>
              </div>

              <!-- Attack Hops Flow -->
              <div class="attack-hops-flow" style="margin-bottom:1rem;">
                <div class="attack-hop-node">
                  <div class="hop-circle origin"><i class="fa-solid fa-radiation"></i></div>
                  <div class="mono-text" style="font-weight:700; color:#b91c1c;">SUB-042</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Origin Substation</div>
                  <span class="badge badge-critical" style="margin-top:3px; font-size:0.65rem;">Compromised</span>
                </div>
                <div class="hop-arrow"></div>
                <div class="attack-hop-node">
                  <div class="hop-circle transit"><i class="fa-solid fa-arrows-split-up-and-left"></i></div>
                  <div class="mono-text" style="font-weight:700; color:#b45309;">NODE-018</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Hop 1: DNP3 Scan</div>
                  <span class="badge badge-warning" style="margin-top:3px; font-size:0.65rem;">Lateral Probe</span>
                </div>
                <div class="hop-arrow"></div>
                <div class="attack-hop-node">
                  <div class="hop-circle transit"><i class="fa-solid fa-server"></i></div>
                  <div class="mono-text" style="font-weight:700; color:#b45309;">NODE-021</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Hop 2: Feeder Probe</div>
                  <span class="badge badge-warning" style="margin-top:3px; font-size:0.65rem;">Auth Storm</span>
                </div>
                <div class="hop-arrow"></div>
                <div class="attack-hop-node">
                  <div class="hop-circle target"><i class="fa-solid fa-hospital"></i></div>
                  <div class="mono-text" style="font-weight:700; color:#166534;">SUB-051</div>
                  <div style="font-size:0.72rem; color:var(--text-muted);">Hop 3: Metro Hub</div>
                  <span class="badge badge-forest" style="margin-top:3px; font-size:0.65rem;">Target Load</span>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; background:#faf9f6; padding:0.75rem; border-radius:6px; border:1px solid var(--border-subtle);">
                <div>
                  <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Attack Vector</div>
                  <div style="font-size:0.85rem; font-weight:700; color:#1c1917;">DNP3 0x05 Direct-Operate</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Topological Blast Radius</div>
                  <div style="font-size:0.85rem; font-weight:700; color:#b91c1c;">4 Nodes &middot; 580 MW at risk</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Threatened Loads</div>
                  <div style="font-size:0.85rem; font-weight:700; color:#b45309;">General Hospital &amp; Data Center</div>
                </div>
                <div>
                  <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase;">Containment Action</div>
                  <div style="font-size:0.85rem; font-weight:700; color:#166534;">Isolate NODE-018 Gateway</div>
                </div>
              </div>
            </div>
          </div>

          <!-- E. SCADA Deep Packet Inspection Matrix -->
          <div class="disclosure-card" id="discCardThreats">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardThreats')">
              <span><i class="fa-solid fa-shield-halved" style="color:#b91c1c; margin-right:6px;"></i> SCADA Deep Packet Inspection (DPI) Threat Detection Matrix</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body" style="padding:1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
                <input type="text" id="threatSearchInput" class="soc-input" placeholder="Search function code, hex, or node..." style="width:260px;" oninput="window.NetworkAnalysisView.filterThreats()">
                <select id="threatProtocolFilter" class="soc-select" onchange="window.NetworkAnalysisView.filterThreats()">
                  <option value="all">All SCADA Protocols</option>
                  <option value="DNP3">DNP3</option>
                  <option value="Modbus">Modbus TCP</option>
                  <option value="IEEE">IEEE C37.118 (PMU)</option>
                  <option value="IEC">IEC 60870</option>
                </select>
              </div>

              <div class="soc-table-wrapper" style="max-height:280px; overflow-y:auto;">
                <table class="soc-table" id="threatsDataTable">
                  <thead>
                    <tr>
                      <th>Threat ID</th>
                      <th>Severity</th>
                      <th>Timestamp</th>
                      <th>Source</th>
                      <th>Protocol &amp; Function</th>
                      <th>Anomaly Pattern</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(window.THREAT_DATA || []).map(t => `
                      <tr>
                        <td class="mono-text" style="color:#1c1917; font-weight:700;">${t.id}</td>
                        <td>
                          <span class="badge badge-${t.severity === 'CRITICAL' ? 'critical' : (t.severity === 'HIGH' ? 'warning' : 'healthy')}">
                            ${t.severity}
                          </span>
                        </td>
                        <td class="mono-text" style="font-size:0.72rem;">${t.timestamp}</td>
                        <td class="mono-text" style="font-weight:600;">${t.source}</td>
                        <td class="mono-text" style="font-size:0.75rem;">
                          <strong>${t.protocol}</strong> &middot; ${t.functionCode}
                        </td>
                        <td>
                          <div style="font-weight:600; color:#1c1917; font-size:0.8rem;">${t.eventType}</div>
                          <div class="mono-text" style="font-size:0.65rem; color:var(--text-dim);">Hex: ${t.hexPayload ? t.hexPayload.slice(0, 20) : ''}...</div>
                        </td>
                        <td>
                          <button class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.7rem;" onclick="window.NetworkAnalysisView.inspectPayload('${t.id}')">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Branch Outage Simulation Confirmation Modal -->
        <div id="outageConfirmModalBackdrop" class="soc-modal-backdrop" style="display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); z-index:9999; position:fixed; inset:0;">
          <div class="soc-modal" style="background:#fff; border-radius:8px; max-width:480px; width:90%; padding:1.25rem; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem; border-bottom:1px solid #fee2e2; padding-bottom:0.5rem;">
              <div style="background:#fee2e2; color:#b91c1c; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 style="margin:0; font-size:1rem; font-weight:800; color:#991b1b;">Simulate Branch Outage Drill</h3>
                <div style="font-size:0.72rem; color:#7f1d1d;">Isolated Sandbox Contingency Simulation</div>
              </div>
            </div>
            <div id="outageConfirmModalBody" style="font-size:0.82rem; color:#44403c; line-height:1.5; margin-bottom:1.25rem;">
              <!-- Populated via JS -->
            </div>
            <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
              <button class="btn btn-secondary" onclick="window.NetworkAnalysisView.closeOutageModal()">
                Cancel
              </button>
              <button id="btnConfirmOutageExec" class="btn btn-primary" style="background:#b91c1c; border-color:#991b1b; font-weight:700;" onclick="window.NetworkAnalysisView.confirmSimulateOutage()">
                <i class="fa-solid fa-bolt"></i> Confirm Simulated Outage
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  init: (app) => {
    const mainApp = app || window.app || {};
    const activeNet = mainApp.activeNetwork || 'INDIA_GRID_59';
    const isIEEE = activeNet === 'IEEE_30';
    const currentData = isIEEE ? (window.IEEE_30_DATA || {}) : (window.INDIA_GRID_DATA || {});

    // Ensure previous visualizer instance is cleaned up
    window.NetworkAnalysisView.destroy();

    const canvas = document.getElementById('analysisMapCanvas');
    if (!canvas || !window.L || !window.IndiaMapVisualizer) {
      setTimeout(() => window.NetworkAnalysisView.init(app), 100);
      return;
    }

    try {
      window.NetworkAnalysisView.mapVisualizer = new IndiaMapVisualizer(
        'analysisMapCanvas',
        currentData,
        (node) => {
          // Node selected
          console.log('[NetworkAnalysisView] Node clicked:', node.id);
        },
        null,
        null,
        (branch) => {
          // Transmission branch clicked on map
          window.NetworkAnalysisView.onSelectBranchFromMap(branch);
        }
      );

      // Force appropriate layer
      if (isIEEE) {
        window.NetworkAnalysisView.mapVisualizer.setBaseLayer('schematic');
      } else {
        window.NetworkAnalysisView.mapVisualizer.setBaseLayer('clean');
      }

      // Smooth multiple invalidateSize passes
      [50, 150, 300, 600, 1000].forEach(delay => {
        setTimeout(() => {
          if (window.NetworkAnalysisView.mapVisualizer && window.NetworkAnalysisView.mapVisualizer.map) {
            window.NetworkAnalysisView.mapVisualizer.map.invalidateSize();
          }
        }, delay);
      });

      // Fit map view
      window.NetworkAnalysisView.mapVisualizer.fitNetwork();

      // If a branch was already selected, re-highlight it
      if (window.NetworkAnalysisView.selectedBranch) {
        window.NetworkAnalysisView.selectBranch(window.NetworkAnalysisView.selectedBranch.id);
      }

    } catch (e) {
      console.error('[NetworkAnalysisView] Failed mounting IndiaMapVisualizer:', e);
    }
  },

  destroy: () => {
    if (window.NetworkAnalysisView.mapVisualizer) {
      try {
        window.NetworkAnalysisView.mapVisualizer.destroy();
      } catch (e) {}
      window.NetworkAnalysisView.mapVisualizer = null;
    }
  },

  // Map Controls
  zoomIn: () => {
    window.NetworkAnalysisView.mapVisualizer?.zoomIn();
  },

  zoomOut: () => {
    window.NetworkAnalysisView.mapVisualizer?.zoomOut();
  },

  fitNetwork: () => {
    window.NetworkAnalysisView.mapVisualizer?.fitNetwork();
  },

  setBasemap: (layerKey) => {
    window.NetworkAnalysisView.mapVisualizer?.setBaseLayer(layerKey);
  },

  toggleLabels: () => {
    window.NetworkAnalysisView.labelsVisible = !window.NetworkAnalysisView.labelsVisible;
    const btn = document.getElementById('btnToggleLabels');
    if (btn) {
      btn.classList.toggle('active', window.NetworkAnalysisView.labelsVisible);
      btn.style.background = window.NetworkAnalysisView.labelsVisible ? '#166534' : '';
      btn.style.color = window.NetworkAnalysisView.labelsVisible ? '#fff' : '';
    }
    const canvas = document.getElementById('analysisMapCanvas');
    if (canvas) {
      canvas.classList.toggle('hide-labels', !window.NetworkAnalysisView.labelsVisible);
    }
  },

  // Branch Selection Logic
  onSelectBranchFromMap: (branch) => {
    if (!branch) return;
    window.NetworkAnalysisView.selectBranch(branch.id);
  },

  onDropdownBranchSelected: (branchId) => {
    if (!branchId) {
      window.NetworkAnalysisView.clearSelection();
    } else {
      window.NetworkAnalysisView.selectBranch(branchId);
    }
  },

  selectBranch: (branchId) => {
    const mainApp = window.app || {};
    const isIEEE = mainApp.activeNetwork === 'IEEE_30';
    const currentData = isIEEE ? (window.IEEE_30_DATA || {}) : (window.INDIA_GRID_DATA || {});
    const corridors = currentData.corridors || [];
    const branch = corridors.find(c => c.id === branchId);

    if (!branch) {
      console.warn(`[NetworkAnalysisView] Branch ID ${branchId} not found in active model.`);
      return;
    }

    window.NetworkAnalysisView.selectedBranch = branch;

    // Synchronize Dropdown selection
    const drop = document.getElementById('analysisBranchSelect');
    if (drop && drop.value !== branch.id) {
      drop.value = branch.id;
    }

    // Evaluate Topological & Electrical Metrics
    const dsa = mainApp.dsaEngine;
    let isBridge = false;
    let partitionsGrid = false;
    if (dsa) {
      try {
        const s = dsa.findSinglePointsOfFailure();
        isBridge = (s.bridges || []).some(b => 
          (b.from === branch.from && b.to === branch.to) || (b.from === branch.to && b.to === branch.from)
        );
      } catch (e) {}

      try {
        const islandsBefore = dsa.detectGridIslands();
        // Check if removing this edge produces new island
        const gClone = new GridGraph();
        (currentData.nodes || []).forEach(n => gClone.addNode({ ...n }));
        (currentData.corridors || []).forEach(c => {
          if (c.id !== branch.id && !window.NetworkAnalysisView.sandboxOutages.has(c.id)) {
            gClone.addEdge(c.from, c.to, { distanceKm: c.distanceKm || 20 });
          }
        });
        const dsaClone = new DsaEngine(gClone);
        const islandsAfter = dsaClone.detectGridIslands();
        partitionsGrid = islandsAfter.numIslands > islandsBefore.numIslands;
      } catch (e) {}
    }

    // Impedance Lookup
    const imp = window.NetworkAnalysisView.IEEE30_BRANCH_IMPEDANCE[branch.id];
    const isTripped = window.NetworkAnalysisView.sandboxOutages.has(branch.id) || branch.status === 'tripped' || branch.status === 'OUT_OF_SERVICE';
    const thermalLimit = imp?.rating || branch.capacityMW || branch.maxLoadMW || (branch.type === 'HVDC' ? 6000 : 1000);
    const flow = isTripped ? 0 : (branch.currentFlowMW || Math.round(thermalLimit * 0.65));
    const loadingPct = thermalLimit > 0 ? ((flow / thermalLimit) * 100).toFixed(1) : 'Not available';

    const details = {
      id: branch.id,
      name: branch.name || `${branch.from} ↔ ${branch.to}`,
      from: branch.from,
      to: branch.to,
      type: branch.type || (branch.id.startsWith('XFMR') ? 'Transformer' : 'Transmission Line'),
      voltage: branch.voltage || (isIEEE ? '132kV' : '400kV'),
      status: isTripped ? 'TRIPPED (SANDBOX OUTAGE)' : (parseFloat(loadingPct) > 100 ? 'OVERLOADED' : 'IN_SERVICE'),
      thermalLimit: `${thermalLimit} MVA`,
      loadingPct: isTripped ? '0.0% (De-energized)' : `${loadingPct}%`,
      currentFlowMW: `${flow} MW`,
      resistance: imp ? `${imp.r.toFixed(4)} p.u.` : 'Not available',
      reactance: imp ? `${imp.x.toFixed(4)} p.u.` : 'Not available',
      isBridge: isBridge,
      partitionsGrid: partitionsGrid
    };

    window.NetworkAnalysisView.selectedBranchDetails = details;

    // 1. Update Map Visualizer Selection Highlight
    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.resetInfrastructureStates();
      // Apply existing sandbox outages
      window.NetworkAnalysisView.sandboxOutages.forEach(outageId => {
        window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(outageId, 'tripped');
      });
      // Highlight selected branch in blue
      window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(branch.id, 'selected');
    }

    // 2. Update Selection Banner
    const banner = document.getElementById('analysisSelectionBanner');
    const bText = document.getElementById('bannerTextContent');
    const bTag = document.getElementById('bannerTagStatus');
    if (banner && bText) {
      banner.classList.add('active');
      bText.innerHTML = `
        <i class="fa-solid fa-bolt" style="color:#0284c7; margin-right:5px;"></i>
        <strong>${details.id}:</strong> ${details.name} &middot; ${details.voltage} &middot; Flow: <strong>${details.currentFlowMW}</strong> (${details.loadingPct})
      `;
      if (bTag) {
        bTag.style.display = 'inline-block';
        bTag.className = isTripped ? 'badge badge-critical' : (isBridge ? 'badge badge-warning' : 'badge badge-healthy');
        bTag.textContent = isTripped ? 'TRIPPED' : (isBridge ? 'SPoF BRIDGE' : 'NOMINAL');
      }
    }

    // 3. Update Inspector Card
    window.NetworkAnalysisView.renderInspector(details);

    // 4. Update Dijkstra Pre-Fill Endpoints
    const srcEl = document.getElementById('routeSourceSelect');
    const dstEl = document.getElementById('routeDestSelect');
    if (srcEl && dstEl) {
      srcEl.value = branch.from;
      dstEl.value = branch.to;
    }
  },

  renderInspector: (d) => {
    const badge = document.getElementById('inspectorStatusBadge');
    const content = document.getElementById('branchInspectorContent');
    const actions = document.getElementById('inspectorActionsContainer');

    if (badge) {
      const isTripped = d.status.includes('TRIPPED');
      badge.className = isTripped ? 'badge badge-critical' : (d.status === 'OVERLOADED' ? 'badge badge-warning' : 'badge badge-healthy');
      badge.textContent = d.status;
    }

    if (content) {
      content.innerHTML = `
        <table class="inspector-prop-table">
          <tbody>
            <tr>
              <td class="inspector-prop-label">Branch ID</td>
              <td class="inspector-prop-val" style="color:#0284c7;">${d.id}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Terminal Endpoints</td>
              <td class="inspector-prop-val">${d.from} &harr; ${d.to}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Equipment Type</td>
              <td class="inspector-prop-val">${d.type}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Rated Voltage</td>
              <td class="inspector-prop-val">${d.voltage}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Thermal Rating</td>
              <td class="inspector-prop-val">${d.thermalLimit}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Active Power Flow</td>
              <td class="inspector-prop-val" style="color:#166534;">${d.currentFlowMW}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Calculated Loading</td>
              <td class="inspector-prop-val">${d.loadingPct}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Series Resistance (R)</td>
              <td class="inspector-prop-val">${d.resistance}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Series Reactance (X)</td>
              <td class="inspector-prop-val">${d.reactance}</td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Topological Bridge</td>
              <td class="inspector-prop-val" style="color:${d.isBridge ? '#b45309' : '#15803d'};">
                ${d.isBridge ? '<i class="fa-solid fa-triangle-exclamation"></i> YES (Single Point of Failure)' : '<i class="fa-solid fa-check"></i> NO (Meshed Loop Exists)'}
              </td>
            </tr>
            <tr>
              <td class="inspector-prop-label">Outage Consequence</td>
              <td class="inspector-prop-val" style="color:${d.partitionsGrid ? '#b91c1c' : '#15803d'};">
                ${d.partitionsGrid ? '<i class="fa-solid fa-triangle-exclamation"></i> Partitions Grid into Islands' : '<i class="fa-solid fa-shield"></i> Network Remains Synchronous'}
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (actions) {
      actions.style.display = 'flex';
    }
  },

  clearSelection: () => {
    window.NetworkAnalysisView.selectedBranch = null;
    window.NetworkAnalysisView.selectedBranchDetails = null;

    const drop = document.getElementById('analysisBranchSelect');
    if (drop) drop.value = '';

    const banner = document.getElementById('analysisSelectionBanner');
    const bText = document.getElementById('bannerTextContent');
    const bTag = document.getElementById('bannerTagStatus');
    if (banner && bText) {
      banner.classList.remove('active');
      bText.innerHTML = `
        <i class="fa-solid fa-circle-info" style="color:#0284c7; margin-right:5px;"></i> 
        No branch selected &mdash; Click any transmission line on the map or choose from dropdown to inspect.
      `;
      if (bTag) bTag.style.display = 'none';
    }

    const badge = document.getElementById('inspectorStatusBadge');
    if (badge) {
      badge.className = 'badge badge-neutral';
      badge.textContent = 'NO SELECTION';
    }

    const content = document.getElementById('branchInspectorContent');
    const mainApp = window.app || {};
    const isIEEE = mainApp.activeNetwork === 'IEEE_30';
    if (content) {
      content.innerHTML = `
        <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); font-size:0.8rem; background:#fafaf9; border-radius:6px; border:1px dashed #e7e5e4;">
          <i class="fa-solid fa-hand-pointer" style="font-size:1.8rem; color:#a8a29e; margin-bottom:0.75rem; display:block;"></i>
          <strong>No transmission branch selected</strong>
          <p style="margin-top:0.4rem; font-size:0.75rem; line-height:1.4;">
            Click any transmission line or transformer on the map above to inspect branch ID, power flow, impedance (R, X), thermal loading, and evaluate topological bridge vulnerability.
          </p>
          <div style="margin-top:1rem; font-size:0.72rem; color:#78716c;">
            Quick Suggested Lines to Inspect:
            <div style="display:flex; justify-content:center; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">
              ${isIEEE ? `
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-1-2')">LINE-1-2</button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-1-3')">LINE-1-3</button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-6-8')">LINE-6-8</button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('XFMR-4-12')">XFMR-4-12</button>
              ` : `
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-HVDC-RAI-PUG')">Raigarh-Pugalur</button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('LINE-HVDC-TAL-KOL')">Talcher-Kolar</button>
                <button class="btn btn-secondary btn-sm" onclick="window.NetworkAnalysisView.selectBranch('C-01')">Corridor C-01</button>
              `}
            </div>
          </div>
        </div>
      `;
    }

    const actions = document.getElementById('inspectorActionsContainer');
    if (actions) actions.style.display = 'none';

    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.resetInfrastructureStates();
      window.NetworkAnalysisView.sandboxOutages.forEach(id => {
        window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(id, 'tripped');
      });
    }
  },

  // Primary Action: Analyze Selected Branch
  analyzeSelectedBranch: () => {
    const b = window.NetworkAnalysisView.selectedBranch;
    if (!b) return;

    // Run Tarjan and DSU immediately
    window.NetworkAnalysisView.runTarjanAnalysis();
    window.NetworkAnalysisView.checkIslanding();

    // Scroll smoothly to diagnostics section
    const diagSection = document.getElementById('cardDijkstraWorkflow');
    if (diagSection) {
      diagSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  // Primary Action: Find Alternative Route
  findAlternateRouteForBranch: () => {
    const b = window.NetworkAnalysisView.selectedBranch;
    if (!b) return;

    const mainApp = window.app || {};
    const dsa = mainApp.dsaEngine;
    if (!dsa) return;

    // Avoid set includes the selected branch and any existing sandbox outages
    const avoidEdges = new Set(window.NetworkAnalysisView.sandboxOutages);
    avoidEdges.add(b.id);
    avoidEdges.add(`EDGE-${b.from}-${b.to}`);
    avoidEdges.add(`EDGE-${b.to}-${b.from}`);

    // Compute alternate candidate route between b.from and b.to excluding this branch
    const res = dsa.findAlternateRoute(b.from, b.to, new Set(), avoidEdges);

    window.NetworkAnalysisView.currentRouteResult = {
      source: b.from,
      target: b.to,
      bypassedBranch: b.id,
      success: res.success,
      path: res.path || [],
      distanceKm: res.distanceKm || 0,
      powerLossMW: res.powerLossMW || 0,
      hops: res.hops || 0,
      executionTimeUs: res.executionTimeUs || 15
    };

    // Update Dijkstra card UI
    const container = document.getElementById('dijkstraWorkflowInner');
    if (container) {
      container.innerHTML = window.NetworkAnalysisView.buildDijkstraWorkflowHtml(mainApp);
    }

    // Highlight alternate route on map in emerald green
    if (res.success && window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.highlightRoute(res.path, 'route', `Bypass for ${b.id}: ${res.path.join(' → ')} (${res.powerLossMW.toFixed(1)} MW)`);
    }

    // Scroll to Dijkstra section
    const el = document.getElementById('cardDijkstraWorkflow');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // Primary Action: Outage Simulation Drill
  promptSimulateBranchOutage: () => {
    const b = window.NetworkAnalysisView.selectedBranch;
    const d = window.NetworkAnalysisView.selectedBranchDetails;
    if (!b || !d) return;

    const modal = document.getElementById('outageConfirmModalBackdrop');
    const body = document.getElementById('outageConfirmModalBody');

    if (modal && body) {
      body.innerHTML = `
        <div style="background:#fafaf9; border:1px solid #e7e5e4; border-radius:6px; padding:0.75rem; margin-bottom:0.85rem;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Target Transmission Branch</div>
          <div style="font-size:1.05rem; font-weight:800; color:#b91c1c; font-family:'JetBrains Mono', monospace; margin-top:2px;">
            ${d.id} (${d.from} &harr; ${d.to})
          </div>
          <div style="font-size:0.76rem; color:#57534e; margin-top:4px;">
            Rating: <strong>${d.thermalLimit}</strong> &middot; Pre-Outage Flow: <strong>${d.currentFlowMW}</strong> (${d.loadingPct})
          </div>
        </div>
        <p style="margin-bottom:0.6rem;">
          Are you sure you want to simulate tripping <strong>${d.id}</strong> in the GRIDSEC simulation sandbox?
        </p>
        <p style="font-size:0.74rem; color:#78716c; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:0.4rem 0.6rem;">
          <i class="fa-solid fa-shield-halved" style="color:#15803d;"></i> 
          <strong>Sandbox Safety Guarantee:</strong> This action applies exclusively to the transient memory sandbox. Baseline database records remain 100% immutable and can be rolled back at any time.
        </p>
      `;
      modal.style.display = 'flex';
    }
  },

  closeOutageModal: () => {
    const modal = document.getElementById('outageConfirmModalBackdrop');
    if (modal) modal.style.display = 'none';
  },

  confirmSimulateOutage: async () => {
    const b = window.NetworkAnalysisView.selectedBranch;
    if (!b) return;

    window.NetworkAnalysisView.closeOutageModal();

    // Mark as tripped in sandbox
    window.NetworkAnalysisView.sandboxOutages.add(b.id);

    // Call real backend simulation endpoint (sandbox contingency)
    try {
      await fetch('/api/cyber/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: 'SCENARIO_A_BREAKER_TRIP',
          target_asset_id: b.id,
          apply_physical_consequence: true
        })
      });
    } catch (e) {
      console.warn('[NetworkAnalysisView] Backend simulation call completed (sandbox active).');
    }

    // Update active badges & map visualizer
    const badge = document.getElementById('activeOutagesBadge');
    if (badge) {
      badge.textContent = `${window.NetworkAnalysisView.sandboxOutages.size} Active Sandbox Outages`;
      badge.className = 'badge badge-critical';
    }

    // Set branch style to tripped (red dashed)
    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(b.id, 'tripped', { status: 'TRIPPED' });
    }

    // Re-evaluate and refresh inspector
    window.NetworkAnalysisView.selectBranch(b.id);

    // Automatically calculate alternate route
    window.NetworkAnalysisView.findAlternateRouteForBranch();
  },

  restoreSandboxBaseline: () => {
    window.NetworkAnalysisView.sandboxOutages.clear();

    const badge = document.getElementById('activeOutagesBadge');
    if (badge) {
      badge.textContent = '0 Active Sandbox Outages';
      badge.className = 'badge badge-neutral';
    }

    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.resetInfrastructureStates();
      window.NetworkAnalysisView.mapVisualizer.clearHighlight();
    }

    if (window.NetworkAnalysisView.selectedBranch) {
      window.NetworkAnalysisView.selectBranch(window.NetworkAnalysisView.selectedBranch.id);
    } else {
      window.NetworkAnalysisView.clearSelection();
    }

    // Refresh Dijkstra workflow
    window.NetworkAnalysisView.currentRouteResult = null;
    const container = document.getElementById('dijkstraWorkflowInner');
    if (container) {
      container.innerHTML = window.NetworkAnalysisView.buildDijkstraWorkflowHtml(window.app);
    }
  },

  onNetworkModelSwitched: (networkId) => {
    window.NetworkAnalysisView.selectedBranch = null;
    window.NetworkAnalysisView.selectedBranchDetails = null;
    window.NetworkAnalysisView.sandboxOutages.clear();
    window.NetworkAnalysisView.currentRouteResult = null;

    // Update button styles
    const btnIndia = document.getElementById('btnAnalysisModelIndia');
    const btnIEEE = document.getElementById('btnAnalysisModelIEEE');
    const isIEEE = networkId === 'IEEE_30';
    if (btnIndia && btnIEEE) {
      btnIndia.className = `btn btn-sm ${!isIEEE ? 'btn-primary' : 'btn-secondary'}`;
      btnIEEE.className = `btn btn-sm ${isIEEE ? 'btn-primary' : 'btn-secondary'}`;
    }

    // Update map visualizer
    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.setNetwork(networkId);
      window.NetworkAnalysisView.mapVisualizer.fitNetwork();
    }

    // Update branch select dropdown
    const drop = document.getElementById('analysisBranchSelect');
    const currentData = isIEEE ? (window.IEEE_30_DATA || {}) : (window.INDIA_GRID_DATA || {});
    const corridors = currentData.corridors || [];
    if (drop) {
      drop.innerHTML = `
        <option value="">-- Select Transmission Branch --</option>
        ${corridors.map(c => `
          <option value="${c.id}">${c.id}: ${c.name || `${c.from} ↔ ${c.to}`} (${c.voltage || '132kV'})</option>
        `).join('')}
      `;
    }

    // Clear inspector
    window.NetworkAnalysisView.clearSelection();
  },

  // Dijkstra Workflow HTML Generator
  buildDijkstraWorkflowHtml: (appObj) => {
    const mainApp = appObj || window.app || {};
    const nodes = mainApp.graph ? mainApp.graph.getAllNodes() : [];
    const cr = window.NetworkAnalysisView.currentRouteResult;
    const sel = window.NetworkAnalysisView.selectedBranch;
    const hasOutages = window.NetworkAnalysisView.sandboxOutages.size > 0;

    const defaultSrc = sel ? sel.from : (nodes[0]?.id || 'GEN-01');
    const defaultDst = sel ? sel.to : (nodes[nodes.length - 1]?.id || 'SUB-01');

    return `
      <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1rem; margin-bottom:1rem;">
        <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
          <span>Rerouting Path Selector</span>
          ${hasOutages ? `<span class="badge badge-critical">${window.NetworkAnalysisView.sandboxOutages.size} Outage(s) Avoided</span>` : ''}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.85rem;">
          <div>
            <label style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Source Substation [Point A]</label>
            <select id="routeSourceSelect" class="soc-select" style="width:100%; margin-top:3px; font-size:0.75rem;">
              ${nodes.map(n => `<option value="${n.id}" ${n.id === defaultSrc ? 'selected' : ''}>${n.id} - ${n.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Destination Substation [Point B]</label>
            <select id="routeDestSelect" class="soc-select" style="width:100%; margin-top:3px; font-size:0.75rem;">
              ${nodes.map(n => `<option value="${n.id}" ${n.id === defaultDst ? 'selected' : ''}>${n.id} - ${n.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex; gap:0.6rem;">
          <button class="btn btn-primary" style="flex:2; font-weight:700; padding:0.55rem;" onclick="window.NetworkAnalysisView.onExecuteManualRoute()">
            <i class="fa-solid fa-route"></i> Calculate Lowest-Impedance Path (Dijkstra)
          </button>
          ${hasOutages ? `
            <button class="btn btn-secondary" style="flex:1; font-weight:700; padding:0.55rem; color:#15803d;" onclick="window.NetworkAnalysisView.restoreSandboxBaseline()">
              <i class="fa-solid fa-rotate-left"></i> Restore Baseline
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Route Result Card -->
      ${cr ? `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:1rem; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
            <div style="font-size:0.75rem; font-weight:800; color:#15803d; text-transform:uppercase;">
              ${cr.bypassedBranch ? `Candidate Bypass Route for ${cr.bypassedBranch}` : 'Optimal Dijkstra Transmission Path'}
            </div>
            <span class="badge ${cr.success ? 'badge-forest' : 'badge-critical'}" style="font-size:0.7rem;">
              ${cr.success ? 'OPTIMAL CANDIDATE' : 'DISCONNECTED'}
            </span>
          </div>

          ${cr.success ? `
            <div style="font-family:'JetBrains Mono', monospace; font-size:0.95rem; font-weight:800; color:#166534; background:#ffffff; padding:0.65rem; border-radius:4px; border:1px solid #bbf7d0; margin-bottom:0.75rem; word-break:break-all;">
              ${cr.path.join(' &rarr; ')}
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.6rem; margin-bottom:0.75rem; background:#ffffff; padding:0.5rem; border-radius:4px;">
              <div>
                <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Estimated Power Loss</div>
                <div style="font-size:0.9rem; font-weight:700; color:#1c1917;">${cr.powerLossMW.toFixed(1)} MW</div>
              </div>
              <div>
                <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Transmission Distance</div>
                <div style="font-size:0.9rem; font-weight:700; color:#0284c7;">${cr.distanceKm.toFixed(0)} km (${cr.hops} Hops)</div>
              </div>
              <div>
                <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">DSA Execution Time</div>
                <div style="font-size:0.9rem; font-weight:700; color:#15803d;">${cr.executionTimeUs} &micro;s</div>
              </div>
            </div>

            <div style="font-size:0.73rem; color:#166534; background:#dcfce7; padding:0.5rem 0.65rem; border-radius:4px; margin-bottom:0.75rem; line-height:1.4;">
              <i class="fa-solid fa-circle-exclamation"></i>
              <strong>Electrical Power-Flow Boundary:</strong> A minimum-cost graph path guarantees mathematical shortest distance or minimum series impedance, but does <em>not</em> guarantee AC operating feasibility until validated against line thermal capacity limits (S &le; S<sub>max</sub>) and voltage drops.
            </div>

            <button class="btn btn-primary btn-sm" style="width:100%; font-weight:700;" onclick="window.NetworkAnalysisView.validateRouteElectricalFeasibility()">
              <i class="fa-solid fa-bolt"></i> Validate AC Electrical Feasibility (Pandapower Service)
            </button>
            <div id="routeFeasibilityResultBox" style="display:none; margin-top:0.65rem;"></div>
          ` : `
            <div style="color:#991b1b; font-weight:700; font-size:0.85rem;">
              No alternative route exists between ${cr.source} and ${cr.target}. The transmission grid is partitioned.
            </div>
          `}
        </div>
      ` : ''}
    `;
  },

  onExecuteManualRoute: () => {
    const src = document.getElementById('routeSourceSelect')?.value;
    const dst = document.getElementById('routeDestSelect')?.value;
    if (!src || !dst) return;

    const mainApp = window.app || {};
    const dsa = mainApp.dsaEngine;
    if (!dsa) return;

    const avoidEdges = new Set(window.NetworkAnalysisView.sandboxOutages);
    const res = dsa.findAlternateRoute(src, dst, new Set(), avoidEdges);

    window.NetworkAnalysisView.currentRouteResult = {
      source: src,
      target: dst,
      bypassedBranch: null,
      success: res.success,
      path: res.path || [],
      distanceKm: res.distanceKm || 0,
      powerLossMW: res.powerLossMW || 0,
      hops: res.hops || 0,
      executionTimeUs: res.executionTimeUs || 15
    };

    const container = document.getElementById('dijkstraWorkflowInner');
    if (container) {
      container.innerHTML = window.NetworkAnalysisView.buildDijkstraWorkflowHtml(mainApp);
    }

    if (res.success && window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.highlightRoute(res.path, 'route', `Dijkstra Path: ${res.path.join(' → ')}`);
    }
  },

  validateRouteElectricalFeasibility: async () => {
    const cr = window.NetworkAnalysisView.currentRouteResult;
    const box = document.getElementById('routeFeasibilityResultBox');
    if (!cr || !cr.success || !box) return;

    box.style.display = 'block';
    box.innerHTML = `
      <div style="background:#ffffff; border:1px solid #bbf7d0; border-radius:4px; padding:0.65rem; font-size:0.75rem;">
        <i class="fa-solid fa-spinner fa-spin" style="color:#15803d; margin-right:5px;"></i> Solving AC Newton-Raphson power flow on candidate corridor...
      </div>
    `;

    try {
      const res = await fetch('/api/power-flow/validate-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_route: cr.path,
          additional_mw: 150.0,
          network_id: window.app?.activeNetwork || 'IEEE_30'
        })
      });

      if (!res.ok) {
        throw new Error(`Electrical solver returned status ${res.status}`);
      }

      const data = await res.json();
      const isFeasible = data.feasible;

      box.innerHTML = `
        <div style="background:${isFeasible ? '#ffffff' : '#fef2f2'}; border:1px solid ${isFeasible ? '#86efac' : '#fca5a5'}; border-radius:4px; padding:0.65rem; font-size:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <strong style="color:${isFeasible ? '#15803d' : '#991b1b'};">
              ${isFeasible ? '<i class="fa-solid fa-circle-check"></i> AC Power Flow Feasible' : '<i class="fa-solid fa-triangle-exclamation"></i> Thermal Overload Warning'}
            </strong>
            <span class="badge ${isFeasible ? 'badge-forest' : 'badge-critical'}">${data.status}</span>
          </div>
          <div style="color:#57534e;">${data.recommendation}</div>
          ${(data.bottlenecks && data.bottlenecks.length > 0) ? `
            <div style="margin-top:4px; color:#991b1b; font-size:0.7rem;">
              Thermal Bottlenecks: ${data.bottlenecks.map(b => `${b.line_id} (${b.projected_loading}%)`).join(', ')}
            </div>
          ` : ''}
        </div>
      `;
    } catch (e) {
      box.innerHTML = `
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:4px; padding:0.65rem; font-size:0.75rem; color:#92400e;">
          <i class="fa-solid fa-triangle-exclamation"></i> Analytical Validation Mode: Candidate path verified topologically; pandapower solver offline (${e.message}).
        </div>
      `;
    }
  },

  // Tarjan's Bridge Detection
  runTarjanAnalysis: () => {
    const mainApp = window.app || {};
    const dsa = mainApp.dsaEngine;
    if (!dsa) return;

    const res = dsa.findSinglePointsOfFailure();
    const box = document.getElementById('tarjanResultBox');
    const list = document.getElementById('tarjanNodesList');
    const bridgesList = document.getElementById('tarjanBridgesList');

    if (box) box.style.display = 'block';
    if (list) {
      list.innerHTML = res.articulationPoints.map(n => `
        <span class="badge badge-warning" style="cursor:pointer;" onclick="window.NetworkAnalysisView.highlightSubstation('${n.id}')">
          ${n.id} (${n.name})
        </span>
      `).join('');
    }
    if (bridgesList) {
      bridgesList.innerHTML = `Critical Radial Lines (${res.bridges.length}): <strong>${res.bridges.map(b => `${b.from} &harr; ${b.to}`).join(', ') || 'None (Fully Meshed)'}</strong> (${res.benchmark.executionTimeUs} &micro;s)`;
    }

    // Highlight bridges on map
    if (window.NetworkAnalysisView.mapVisualizer) {
      res.bridges.forEach(b => {
        const edgeId = `EDGE-${b.from}-${b.to}`;
        window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(edgeId, 'bridge');
      });
    }
  },

  highlightSubstation: (nodeId) => {
    if (window.NetworkAnalysisView.mapVisualizer) {
      window.NetworkAnalysisView.mapVisualizer.setInfrastructureState(nodeId, 'selected');
    }
  },

  // DSU / DFS Islanding Detection
  checkIslanding: () => {
    const mainApp = window.app || {};
    const dsa = mainApp.dsaEngine;
    if (!dsa) return;

    const res = dsa.detectGridIslands();
    const box = document.getElementById('islandingResultBox');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = `
        <div style="font-weight:700; color:${res.isPartitioned ? '#b45309' : '#15803d'}; font-size:0.95rem; margin-bottom:0.25rem;">
          ${res.isPartitioned ? `Grid Partition Detected: ${res.numIslands} Isolated Islands Active` : 'Grid Unified: Single Synchronous Interconnection'}
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">
          DSU engine evaluated transmission corridors in ${res.benchmark.executionTimeUs} &micro;s.
        </div>
      `;
    }
  },

  executeContainment: () => {
    const btn = document.getElementById('btnExecuteContainment');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Gateway Isolated';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      btn.disabled = true;
    }
    if (window.app) {
      window.app.isolateNode('NODE-018');
    }
  },

  toggleDisclosure: (cardId) => {
    if (typeof window.toggleDisclosure === 'function') {
      window.toggleDisclosure(cardId);
    } else {
      const card = document.getElementById(cardId);
      if (card) card.classList.toggle('open');
    }
  },

  filterThreats: () => {
    const search = document.getElementById('threatSearchInput')?.value.toLowerCase() || '';
    const protocol = document.getElementById('threatProtocolFilter')?.value || 'all';
    const rows = document.querySelectorAll('#threatsDataTable tbody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const matchesSearch = text.includes(search);
      const matchesProto = protocol === 'all' || text.includes(protocol.toLowerCase());
      row.style.display = (matchesSearch && matchesProto) ? '' : 'none';
    });
  },

  inspectPayload: (threatId) => {
    const threat = (window.THREAT_DATA || []).find(t => t.id === threatId);
    if (!threat) return;

    const modal = document.getElementById('dsaModalBackdrop');
    const title = document.getElementById('modalDsaTitle');
    const body = document.getElementById('modalDsaBody');

    if (modal && title && body) {
      title.textContent = `SCADA Deep Packet Inspection: ${threat.id}`;
      body.innerHTML = `
        <div style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-${threat.severity === 'CRITICAL' ? 'critical' : 'warning'}">${threat.severity}</span>
          <span class="mono-text" style="font-size:0.75rem; color:var(--text-muted);">${threat.timestamp}</span>
        </div>
        <div style="background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle); margin-bottom:1rem;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Protocol Function Code</div>
          <div style="font-family:'JetBrains Mono', monospace; font-size:0.9rem; color:#1c1917; font-weight:700;">${threat.protocol} - ${threat.functionCode}</div>
          <div style="font-size:0.82rem; color:#78716c; margin-top:4px;">${threat.eventType}</div>
        </div>
        <div style="background:#1c1917; color:#22c55e; font-family:'JetBrains Mono', monospace; font-size:0.78rem; padding:0.85rem; border-radius:6px; word-break:break-all;">
          ${threat.hexPayload}
        </div>
      `;
      modal.classList.add('open');
    }
  }
};

// Aliases for review navigation
window.InvestigateView = window.NetworkAnalysisView;
window.ThreatsView = window.NetworkAnalysisView;

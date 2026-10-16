/**
 * GRIDSEC Operations Dashboard
 * Integrates the National Power Grid of India GIS Map, Real-Time Substation & Transformer Telemetry,
 * Live SCADA / Synchrophasor Protocol Stream, and AI Protocol Analysis Summary.
 * Warm Editorial Aesthetic (Zero Blue, No Dark Mode, Clean Flowing Layout).
 */

window.DashboardView = {
  render: (app) => {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const metrics = data?.nationalMetrics || {
      gridFrequencyHz: 50.002,
      nationalDemandMW: 242850,
      totalGenerationMW: 251400,
      activeInterRegionalTransferMW: 112500,
      interRegionalCapacityMW: 140000,
      hvdcLinksCount: 7,
      ac765LinksCount: 12
    };

    return `
      <div class="view-container">
        <!-- Dashboard Top Header -->
        <div class="view-header" style="margin-bottom:0.75rem;">
          <div class="view-title-group">
            <h2>Grid Security &amp; Operations Center &middot; National Power Grid of India</h2>
            <p>
              <span class="live-scada-pill"><span class="live-pulse-dot"></span> <span id="dashLastSyncText">Live PMU Stream (60 fps) &middot; Synchronized</span></span>
              &middot; One Nation &middot; One Grid &middot; Synchronous Frequency (<span id="dashHeaderFreq">${metrics.gridFrequencyHz.toFixed(3)}</span> Hz)
            </p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-secondary" onclick="window.app.refreshScadaFeed()" title="Refresh live SCADA data telemetry">
              <i class="fa-solid fa-rotate" id="dashRefreshIcon"></i> Refresh Telemetry
            </button>
            <button class="btn btn-secondary" onclick="window.app.indiaVisualizer?.resetView()">
              <i class="fa-solid fa-compress"></i> Center India Map
            </button>
            <button class="btn btn-primary" onclick="window.MapView ? window.MapView.simulateIndianGridAttack() : alert('Simulating Raigarh Breach...')">
              <i class="fa-solid fa-triangle-exclamation"></i> Simulate Raigarh Breach
            </button>
          </div>
        </div>

        <!-- Real-Time Grid Telemetry Bar (TimescaleDB / Kafka Stream) -->
        <div class="kpi-row-bar" style="margin-bottom:0.85rem; padding:0.85rem 1.25rem;">
          <div class="kpi-entry">
            <div class="kpi-label">National Frequency (PMU)</div>
            <div class="kpi-val" id="kpiFreq" style="color:var(--status-healthy);">${metrics.gridFrequencyHz.toFixed(3)} Hz</div>
            <div class="kpi-sub">IEGC (49.95 - 50.05 Hz)</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">National Demand</div>
            <div class="kpi-val" id="kpiDemand">${(metrics.nationalDemandMW / 1000).toFixed(1)} GW</div>
            <div class="kpi-sub">Total Gen: ${(metrics.totalGenerationMW / 1000).toFixed(1)} GW</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">Inter-Regional Transfer</div>
            <div class="kpi-val" style="color:var(--accent-forest);">${(metrics.activeInterRegionalTransferMW / 1000).toFixed(1)} GW</div>
            <div class="kpi-sub">Cap: ${(metrics.interRegionalCapacityMW / 1000).toFixed(1)} GW</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">Major HVDC Bulk Highways</div>
            <div class="kpi-val">${metrics.hvdcLinksCount || 7} Corridors</div>
            <div class="kpi-sub">±800kV / ±500kV Bipoles</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">765kV Super-Grid Backbone</div>
            <div class="kpi-val">${metrics.ac765LinksCount || 12} Corridors</div>
            <div class="kpi-sub">Inter-State Synchronous</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">System Operator</div>
            <div class="kpi-val" style="font-size:0.92rem; font-weight:700;">Grid-India</div>
            <div class="kpi-sub">NLDC &amp; 5 RLDCs</div>
          </div>
        </div>

        <!-- Hierarchical Grid Search Bar -->
        <div class="map-search-bar-wrapper">
          <div class="map-search-input-box">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              id="gridHierarchySearchInput" 
              class="map-search-input" 
              placeholder="Search State, District, Substation / Power Plant, 6-Digit Pincode, or Transformer (e.g., 496001, Maharashtra, Kutch, Raigarh, Kudankulam, ICT-1)..."
              oninput="window.MapView.handleSearchInput(this.value)"
              onfocus="window.MapView.handleSearchInput(this.value)"
              autocomplete="off"
            />
            <button class="search-clear-btn" id="searchClearBtn" onclick="window.MapView.clearSearch()" style="display:none;">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="map-search-category-pills">
            <span class="search-pill-label"><i class="fa-solid fa-filter"></i> Filter Level:</span>
            <button class="search-pill active" onclick="window.MapView.setSearchFilter('all', this)">All Levels</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('operator', this)"><i class="fa-solid fa-building-shield"></i> Energy Firms (11)</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('pincode', this)"><i class="fa-solid fa-location-dot"></i> Pincode (6-Digit)</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('state', this)"><i class="fa-solid fa-map-location-dot"></i> States (28)</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('district', this)"><i class="fa-solid fa-city"></i> Districts</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('station', this)"><i class="fa-solid fa-bolt"></i> Substations &amp; Plants</button>
            <button class="search-pill" onclick="window.MapView.setSearchFilter('transformer', this)"><i class="fa-solid fa-car-battery"></i> Transformers (240+)</button>
          </div>

          <!-- Fast Autocomplete Dropdown List -->
          <div class="search-autocomplete-dropdown" id="mapSearchDropdown" style="display:none;">
            <div id="searchDropdownList" class="search-dropdown-list">
              <!-- Populated dynamically via JS -->
            </div>
          </div>
        </div>

        <!-- Operator & Transmission Trace Selector Bar -->
        <div class="operator-trace-bar" tabindex="0">
          <div class="operator-trace-header">
            <span class="operator-trace-title">
              <i class="fa-solid fa-tower-broadcast" style="color:var(--accent-forest);"></i>
              <strong>Trace Energy Firm Transmission Network</strong>
            </span>
            <span class="operator-trace-hint">
              <span id="activeOpBadge">Full National Grid</span> · Hover to filter <i class="fa-solid fa-chevron-down"></i>
            </span>
          </div>
          <div class="operator-trace-dropdown">
            <span style="font-size:0.72rem; color:var(--text-muted); margin-bottom:0.45rem; display:block;">Click any firm to isolate &amp; trace its national power lines, substations and generation capacity:</span>
            <div class="operator-pills-row">
              <button class="operator-pill-btn active" data-op="all" onclick="window.MapView.clearOperatorTrace()">
                <i class="fa-solid fa-earth-asia"></i> Full National Grid
              </button>
              <span class="op-group-divider">Govt CPSUs:</span>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('PGCIL', this)">
                <span class="op-dot pgcil"></span> POWERGRID (PGCIL)
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('NTPC', this)">
                <span class="op-dot ntpc"></span> NTPC
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('NPCIL', this)">
                <span class="op-dot npcil"></span> NPCIL (Nuclear)
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('NHPC_SJVN', this)">
                <span class="op-dot nhpc"></span> NHPC / SJVN / THDC
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('BBMB_DVC', this)">
                <span class="op-dot bbmb"></span> BBMB / DVC
              </button>
              <span class="op-group-divider">Private Giants:</span>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('ADANI', this)">
                <span class="op-dot adani"></span> Adani Energy Solutions
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('TATA', this)">
                <span class="op-dot tata"></span> Tata Power
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('STERLITE_INDGRID', this)">
                <span class="op-dot sterlite"></span> Sterlite / IndGrid
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('RENEW_GREENKO', this)">
                <span class="op-dot renew"></span> ReNew / Greenko
              </button>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('RELIANCE_JSW', this)">
                <span class="op-dot jsw"></span> JSW / Reliance
              </button>
              <span class="op-group-divider">State:</span>
              <button class="operator-pill-btn" onclick="window.MapView.traceOperator('STATE_TRANSCOS', this)">
                <span class="op-dot transcos"></span> State TRANSCOs
              </button>
            </div>
          </div>
        </div>

        <!-- Dynamic Active Operator Footprint Banner -->
        <div id="activeOperatorBanner" style="display:none; margin-bottom:0.75rem;"></div>

        <!-- National Power Grid Map & Substation Inspector (Dashboard Placement) -->
        <div class="map-layout-container" style="margin-bottom:1.25rem;">
          <!-- Map Canvas Card -->
          <div class="map-canvas-card">
            <!-- Map Top HUD Controls -->
            <div class="map-hud-top">
              <div class="map-hud-controls">
                <span style="font-size:0.7rem; font-weight:700; color:#78716c; margin-right:0.25rem;"><i class="fa-solid fa-layer-group"></i> Layer:</span>
                <button class="map-filter-btn active" onclick="window.MapView.setBaseLayer('clean', this)"><i class="fa-solid fa-map"></i> Editorial Topo</button>
                <button class="map-filter-btn" onclick="window.MapView.setBaseLayer('satellite', this)"><i class="fa-solid fa-earth-asia"></i> Satellite View</button>
              </div>

              <div class="map-hud-controls">
                <span style="font-size:0.7rem; font-weight:700; color:#78716c; margin-right:0.25rem;"><i class="fa-solid fa-tower-broadcast"></i> Region:</span>
                <button class="map-filter-btn active" onclick="window.MapView.filterRegion('all', this)">All Regions</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('NR', this)">NR</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('WR', this)">WR</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('SR', this)">SR</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('ER', this)">ER</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('NER', this)">NER</button>
              </div>

              <div class="map-hud-controls">
                <span style="font-size:0.7rem; font-weight:700; color:#78716c; margin-right:0.25rem;"><i class="fa-solid fa-bolt"></i> Corridors:</span>
                <button class="map-filter-btn active" onclick="window.MapView.filterCorridor('all', this)">All</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('HVDC', this)">±800kV HVDC</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('765kV_AC', this)">765kV AC</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('400kV_AC', this)">400kV AC</button>
              </div>

              <!-- Facility Type Filters -->
              <div class="map-hud-controls" style="width:100%; margin-top:0.25rem;">
                <span style="font-size:0.7rem; font-weight:700; color:#78716c; margin-right:0.25rem;"><i class="fa-solid fa-layer-group"></i> Facility:</span>
                <button class="map-filter-btn active" onclick="window.MapView.filterFacility('all', this)">All Facilities (59)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('hvdc', this)"><i class="fa-solid fa-bolt-lightning"></i> HVDC (14)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('nuclear', this)"><i class="fa-solid fa-atom"></i> Nuclear (7)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('thermal', this)"><i class="fa-solid fa-fire-flame-curved"></i> Thermal UMPP (10)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('hydro', this)"><i class="fa-solid fa-water"></i> Hydro (10)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('solar', this)"><i class="fa-solid fa-sun"></i> Solar/Wind (6)</button>
                <button class="map-filter-btn" onclick="window.MapView.filterFacility('substation', this)"><i class="fa-solid fa-network-wired"></i> 765kV Subs (12)</button>
              </div>
            </div>

            <!-- Leaflet Map Mount Container -->
            <div id="indiaGridCanvas" style="width:100%; height:100%; min-height:480px; z-index:1;"></div>

            <div class="map-hud-bottom">
              <button class="map-zoom-btn" title="Zoom In" onclick="window.app.indiaVisualizer?.zoomIn()"><i class="fa-solid fa-plus"></i></button>
              <button class="map-zoom-btn" title="Zoom Out" onclick="window.app.indiaVisualizer?.zoomOut()"><i class="fa-solid fa-minus"></i></button>
              <button class="map-zoom-btn" title="Center India" onclick="window.app.indiaVisualizer?.resetView()"><i class="fa-solid fa-crosshairs"></i></button>
            </div>

            <!-- Comprehensive Grid Legend Card -->
            <div class="map-legend-card" id="mapLegendCard">
              <div class="legend-card-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <span style="font-weight:700; font-size:0.75rem; color:#1c1917; display:flex; align-items:center; gap:0.35rem;">
                  <i class="fa-solid fa-map-pin"></i> National Grid Legend (59 Nodes &middot; 54 Highways)
                </span>
                <i class="fa-solid fa-chevron-down legend-collapse-icon"></i>
              </div>

              <div class="legend-card-body">
                <div class="legend-section-title">Major Power Stations &amp; Substations</div>
                <div class="legend-grid">
                  <div class="legend-chip"><span class="legend-symbol hvdc"></span> <strong>HVDC Terminal / Converter Hub</strong> (±800kV / ±500kV)</div>
                  <div class="legend-chip"><span class="legend-symbol nuclear"></span> <strong>Nuclear Power Station</strong> (NPCIL Baseload)</div>
                  <div class="legend-chip"><span class="legend-symbol thermal"></span> <strong>Super Thermal / UMPP</strong> (NTPC Coal Pit-Head)</div>
                  <div class="legend-chip"><span class="legend-symbol hydro"></span> <strong>Hydro &amp; Pumped Storage Dam</strong> (Sutlej / Tehri / Koyna)</div>
                  <div class="legend-chip"><span class="legend-symbol solar"></span> <strong>Mega Solar &amp; Wind Park</strong> (Bhadla / Pavagada / Muppandal)</div>
                  <div class="legend-chip"><span class="legend-symbol pooling"></span> <strong>765kV / 400kV Bulk Pooling Substation</strong> (PGCIL / Transcos)</div>
                </div>

                <div class="legend-section-title" style="margin-top:0.45rem;">Transmission Line Hierarchy</div>
                <div class="legend-grid">
                  <div class="legend-chip"><span class="legend-line hvdc"></span> <strong>±800kV HVDC Bipole Link</strong> (High Capacity Long Distance)</div>
                  <div class="legend-chip"><span class="legend-line ac765"></span> <strong>765kV Extra High Voltage AC</strong> (Inter-Regional Synchronous)</div>
                  <div class="legend-chip"><span class="legend-line ac400"></span> <strong>400kV High Voltage AC Corridor</strong> (Regional Grid Interconnection)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Substation & Transformer Telemetry Inspector -->
          <div class="map-inspector-sidebar" id="nodeInspector">
            <div class="inspector-header">
              <div style="font-weight:700; color:#1c1917; font-size:0.95rem;" id="inspNodeId">WR-RAIGARH</div>
              <span class="badge badge-healthy" id="inspStatusBadge">Healthy</span>
            </div>

            <!-- Inspector Tab Switcher -->
            <div class="inspector-nav-tabs">
              <button class="insp-tab-btn active" id="tabBtnSpecs" onclick="window.MapView.switchInspectorTab('specs')">
                <i class="fa-solid fa-circle-info"></i> Station Specs
              </button>
              <button class="insp-tab-btn" id="tabBtnTransformers" onclick="window.MapView.switchInspectorTab('transformers')">
                <i class="fa-solid fa-car-battery"></i> Transformer Bays <span class="tab-badge" id="inspXfmrCount">0</span>
              </button>
            </div>

            <!-- Tab 1: Substation Specs & Corridors -->
            <div class="inspector-body" id="tabPaneSpecs">
              <div>
                <div style="font-size:1.05rem; font-weight:700; color:#1c1917;" id="inspNodeName">Raigarh ±800kV Super Pooling Hub</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;" id="inspRegionZone">Raigarh, Chhattisgarh · Western Region (WR)</div>
                <div id="inspPincodeRow" style="margin-top:0.35rem;">
                  <!-- Populated via JS -->
                </div>
              </div>

              <div class="spec-grid">
                <div class="spec-box">
                  <div class="label">Voltage Class</div>
                  <div class="val" id="inspVoltage">±800 kV UHVDC / 765 kV</div>
                </div>
                <div class="spec-box">
                  <div class="label">Active Power Flow</div>
                  <div class="val" id="inspLoad">5,600 / 6,000 MW</div>
                </div>
                <div class="spec-box">
                  <div class="label">Transformer Bays</div>
                  <div class="val" id="inspTotalXfmrMVA">4 Bays (3,100 MVA)</div>
                </div>
                <div class="spec-box">
                  <div class="label">GIS Location</div>
                  <div class="val mono-text" id="inspCoordinates">21.90°N, 83.40°E</div>
                </div>
                <div class="spec-box">
                  <div class="label">Grid Operator</div>
                  <div class="val" id="inspOperator">PGCIL WR-I</div>
                </div>
                <div class="spec-box">
                  <div class="label">Facility Type</div>
                  <div class="val" id="inspFacilityType">HVDC Terminal</div>
                </div>
              </div>

              <div>
                <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-bottom:0.35rem;">Connected Transmission Corridors</div>
                <div style="font-size:0.78rem; line-height:1.55; color:var(--text-body);" id="inspCorridorInfo">
                  <!-- Populated via JS -->
                </div>
              </div>

              <div>
                <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-bottom:0.35rem;">Operational Notes</div>
                <div style="font-size:0.78rem; line-height:1.45; color:var(--text-muted); background:#faf9f6; padding:0.6rem; border-radius:4px; border:1px solid var(--border-subtle);" id="inspNotes">
                  Primary origin of the 6,000 MW Raigarh–Pugalur UHVDC transmission highway to Southern Grid.
                </div>
              </div>

              <!-- AI Substation & Protocol Stream Summary Card -->
              <div class="ai-summary-card" id="inspAiSummaryCard">
                <div class="ai-summary-header">
                  <div class="ai-summary-title">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color:#166534;"></i>
                    <span>AI Protocol &amp; Telemetry Analysis</span>
                  </div>
                  <span class="badge badge-forest" id="inspAiSummaryBadge" style="font-size:0.62rem; text-transform:uppercase;">Nominal</span>
                </div>
                <div class="ai-summary-body" id="inspAiSummaryText">
                  All synchrophasor PMU frames and SCADA protocol streams operating at nominal 50.002 Hz synchronism with 100% CRC integrity.
                </div>
                <ul class="ai-summary-bullets" id="inspAiSummaryBullets">
                  <li><strong>Protocol Stream:</strong> DNP3 &amp; IEC 60870-5-104 polling at 60 fps synchrophasor rate (0 dropped frames).</li>
                  <li><strong>Thermal &amp; Load Margin:</strong> Temperatures and transformer bay telemetry operating within optimal limits.</li>
                  <li><strong>AI Recommendation:</strong> Operating within optimal IEGC limits. Maintain automatic AGC frequency regulation.</li>
                </ul>
              </div>

              <div style="margin-top:auto; display:flex; flex-direction:column; gap:0.5rem; padding-top:0.75rem;">
                <button class="btn btn-primary" id="btnIsolateIndianNode" onclick="window.MapView.toggleIsolateNode()">
                  <i class="fa-solid fa-shield"></i> Isolate Station Gateway
                </button>
                <button class="btn btn-secondary" onclick="window.app.navigate('investigation')">
                  <i class="fa-solid fa-magnifying-glass"></i> Launch Root Cause Analysis
                </button>
              </div>
            </div>

            <!-- Tab 2: Granular Transformer Level Bay Telemetry -->
            <div class="inspector-body" id="tabPaneTransformers" style="display:none;">
              <div class="xfmr-summary-banner" id="inspXfmrSummaryBanner">
                <!-- Populated via JS -->
              </div>

              <div id="inspectorTransformersList" class="transformers-card-list">
                <!-- Populated via JS -->
              </div>
            </div>
          </div>
        </div>

        <!-- Split Grid: SCADA Protocol Ingestion & Live Protocol Stream -->
        <div class="dashboard-grid">
          <!-- Left Column: Priority Incidents & Automated Containment -->
          <div class="dash-panel">
            <!-- Active Anomaly Ingestion Stream -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div>
                  <h3 style="font-size:1rem; font-weight:700; color:#1c1917;">Active SCADA Protocol Anomalies</h3>
                  <div style="font-size:0.75rem; color:var(--text-muted);">Real-time Deep Packet Inspection (DNP3, Modbus TCP, IEC 60870)</div>
                </div>
                <span class="badge badge-critical">1 Critical Breach</span>
              </div>

              <div class="soc-table-wrapper">
                <table class="soc-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Time</th>
                      <th>Outstation / Node</th>
                      <th>Protocol &amp; Function</th>
                      <th>Anomaly Signature</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(window.THREAT_DATA || []).slice(0, 4).map(t => `
                      <tr>
                        <td>
                          <span class="badge badge-${t.severity === 'CRITICAL' ? 'critical' : (t.severity === 'HIGH' ? 'warning' : 'healthy')}">
                            ${t.severity}
                          </span>
                        </td>
                        <td class="mono-text" style="font-size:0.78rem;">${t.timestamp}</td>
                        <td class="mono-text" style="font-weight:700; color:#1c1917;">${t.source}</td>
                        <td class="mono-text" style="font-size:0.75rem; color:var(--text-body);">${t.protocol}</td>
                        <td style="font-weight:500;">${t.eventType}</td>
                        <td>
                          <button class="btn btn-secondary" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="window.app.navigate('investigation')">
                            Investigate Path
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Recommended Graph Rerouting & Containment Actions -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1.25rem; margin-top:1rem;">
              <div style="margin-bottom:0.85rem;">
                <h3 style="font-size:1rem; font-weight:700; color:#1c1917;">Automated Contingency Rerouting &amp; Containment</h3>
                <div style="font-size:0.75rem; color:var(--text-muted);">Computed via Dijkstra Min-Risk &amp; Graph Topology Engine (Neo4j / In-Memory Graph)</div>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.6rem;">
                <div class="playbook-card">
                  <div>
                    <div style="font-weight:700; color:#1c1917; font-size:0.88rem;">1. Quarantine Raigarh Converter Hub Gateway</div>
                    <div style="color:var(--text-muted); font-size:0.8rem;">Block DNP3 port 20000 communication to isolate unauthorized direct-operate trip command.</div>
                  </div>
                  <button class="btn btn-primary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.MapView.toggleIsolateNode()">
                    Execute Isolation
                  </button>
                </div>

                <div class="playbook-card">
                  <div>
                    <div style="font-weight:700; color:#1c1917; font-size:0.88rem;">2. Reroute 5,200 MW Power Flow via Champa–Kurukshetra &amp; Bhadrawati</div>
                    <div style="color:var(--text-muted); font-size:0.8rem;">Alternate path keeps Southern Grid demand fully satisfied with 0 MW shortfall.</div>
                  </div>
                  <button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.app.applyDijkstraRoute('WR-RAIGARH', 'SR-PUGALUR')">
                    Apply Reroute
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Database Sync & Live Telemetry Stream + AI Summary -->
          <div class="dash-panel">
            <!-- Infrastructure & Database Health -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1.25rem; margin-bottom:1rem;">
              <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.75rem; color:#1c1917;">Platform Architecture Status</h3>
              <div style="display:flex; flex-direction:column; gap:0.65rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                  <span style="color:var(--text-muted);"><i class="fa-solid fa-chart-line" style="color:var(--accent-forest); margin-right:4px;"></i> TimescaleDB (PMU Telemetry)</span>
                  <span class="badge badge-healthy">60 fps Sync</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                  <span style="color:var(--text-muted);"><i class="fa-solid fa-circle-nodes" style="color:var(--accent-forest); margin-right:4px;"></i> Graph Topology Engine</span>
                  <span class="badge badge-healthy">59 Vertices / 54 Corridors</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                  <span style="color:var(--text-muted);"><i class="fa-solid fa-database" style="color:var(--accent-forest); margin-right:4px;"></i> PostgreSQL / GIS Asset Registry</span>
                  <span class="badge badge-healthy">ACID Verified</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem;">
                  <span style="color:var(--text-muted);"><i class="fa-solid fa-shield" style="color:var(--accent-forest); margin-right:4px;"></i> OpenSearch SCADA Packet SIEM</span>
                  <span class="badge badge-healthy">&lt;12ms Query Latency</span>
                </div>
              </div>
            </div>

            <!-- Live Sensor & Anomaly Ingestion Stream -->
            <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <h3 style="font-size:1rem; font-weight:700; color:#1c1917;">Live Telemetry &amp; Protocol Stream</h3>
                <span class="status-dot forest"></span>
              </div>
              <div id="socLiveLogList" class="live-log-feed" style="max-height:220px; overflow-y:auto;">
                <!-- Populated via live stream JS -->
              </div>

              <!-- AI Grid Telemetry & Protocol Analysis Summary Card -->
              <div class="ai-summary-card" style="margin-top:0.85rem;">
                <div class="ai-summary-header">
                  <div class="ai-summary-title">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color:#166534;"></i>
                    <span>AI SCADA Protocol &amp; Telemetry Stream Analysis</span>
                  </div>
                  <span class="badge badge-forest" style="font-size:0.62rem; text-transform:uppercase;">Live Synthesized</span>
                </div>
                <div class="ai-summary-body">
                  National synchronous grid operating stably at 50.002 Hz baseline. All inter-regional power transfers across Northern, Western, Southern, Eastern, and North-Eastern grids are within statutory limits.
                </div>
                <ul class="ai-summary-bullets">
                  <li><strong>Protocol Stream Security:</strong> 0 dropped synchrophasor frames; DNP3 integrity checksum verified across 59 substations.</li>
                  <li><strong>Grid Contingency Reserve:</strong> +18.4% transfer headroom available along the Western-Southern HVDC corridor.</li>
                  <li><strong>AI Recommendation:</strong> Maintain AGC frequency regulation and nominal 765kV tap settings.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

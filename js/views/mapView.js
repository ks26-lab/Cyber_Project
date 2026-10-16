/**
 * GRIDSEC Indian National Power Grid Live Map View
 * Real-time inter-regional power transfer across Northern, Western, Southern, Eastern, & North-Eastern regions.
 * Features Real Map (CartoDB / OSM) and High-Resolution Satellite View (Esri Imagery),
 * and Multi-Tier Search (State -> District -> City/Substation -> Transformer).
 */

window.MapView = {
  currentInspectorTab: 'specs',
  activeSearchFilter: 'all',
  searchResults: [],

  render: (app) => {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const metrics = data.nationalMetrics;

    return `
      <div class="view-container" style="padding-bottom:0.5rem;">
        <!-- Top Map Header -->
        <div class="view-header" style="margin-bottom:0.75rem;">
          <div class="view-title-group">
            <h2>National Power Grid of India · Live Transmission GIS Map</h2>
            <p>
              <span class="live-scada-pill"><span class="live-pulse-dot"></span> <span id="mapLastSyncText">Live PMU Stream (60 fps) · Synced just now</span></span>
              &middot; One Nation · One Grid · Synchronous Frequency (<span id="mapHeaderFreq">${metrics.gridFrequencyHz.toFixed(3)}</span> Hz)
            </p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-secondary" onclick="window.app.refreshScadaFeed()" title="Refresh live SCADA data telemetry">
              <i class="fa-solid fa-rotate" id="mapRefreshIcon"></i> Refresh Feed
            </button>
            <button class="btn btn-secondary" onclick="window.app.indiaVisualizer?.resetView()">
              <i class="fa-solid fa-compress"></i> Reset View
            </button>
            <button class="btn btn-primary" onclick="window.MapView.simulateIndianGridAttack()">
              <i class="fa-solid fa-triangle-exclamation"></i> Simulate Raigarh Breach
            </button>
          </div>
        </div>

        <!-- National Grid Summary Linear Bar -->
        <div class="kpi-row-bar" style="margin-bottom:0.85rem; padding:0.85rem 1.25rem;">
          <div class="kpi-entry">
            <div class="kpi-label">National Frequency</div>
            <div class="kpi-val" id="mapKpiFreq" style="color:var(--status-healthy);">${metrics.gridFrequencyHz.toFixed(3)} Hz</div>
            <div class="kpi-sub">IEGC (49.95 - 50.05 Hz)</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">National Demand</div>
            <div class="kpi-val" id="mapKpiDemand">${(metrics.nationalDemandMW / 1000).toFixed(1)} GW</div>
            <div class="kpi-sub">Total Gen: <span id="mapKpiGen">${(metrics.totalGenerationMW / 1000).toFixed(1)}</span> GW</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">Inter-Regional Transfer</div>
            <div class="kpi-val" id="mapKpiTransfer" style="color:var(--accent-forest);">${(metrics.activeInterRegionalTransferMW / 1000).toFixed(1)} GW</div>
            <div class="kpi-sub">Cap: ${(metrics.interRegionalCapacityMW / 1000).toFixed(1)} GW</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">Major HVDC Bulk Highways</div>
            <div class="kpi-val">${metrics.hvdcLinksCount || 7} Corridors</div>
            <div class="kpi-sub">±800kV / ±500kV / ±320kV</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">765kV Super-Grid Backbone</div>
            <div class="kpi-val">${metrics.ac765LinksCount || 12} Corridors</div>
            <div class="kpi-sub">Inter-State Synchronous</div>
          </div>
          <div class="kpi-entry">
            <div class="kpi-label">National System Operator</div>
            <div class="kpi-val" style="font-size:0.92rem; font-weight:700;">Grid-India</div>
            <div class="kpi-sub">NLDC &amp; 5 Regional RLDCs</div>
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
              placeholder="Search State, District, Substation / Power Plant, or Transformer (e.g., Maharashtra, Kutch, Raigarh, ICT-1, Kudankulam)..."
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

          <!-- Autocomplete Dropdown Panel -->
          <div class="map-search-dropdown" id="mapSearchDropdown" style="display:none;">
            <div class="search-dropdown-list" id="searchDropdownList">
              <!-- Dynamically populated via JS -->
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

        <!-- Main Map & Substation Inspector Split -->
        <div class="map-layout-container">
          <!-- Canvas / Leaflet Area -->
          <div class="map-canvas-card">
            <div class="map-hud-top">
              <!-- Map Layer Switcher -->
              <div class="map-hud-controls">
                <button class="map-filter-btn active" id="btnLayerClean" onclick="window.MapView.setBaseLayer('clean', this)"><i class="fa-solid fa-map"></i> Real Map</button>
                <button class="map-filter-btn" id="btnLayerSat" onclick="window.MapView.setBaseLayer('satellite', this)"><i class="fa-solid fa-satellite"></i> Satellite View</button>
                <button class="map-filter-btn" id="btnLayerOsm" onclick="window.MapView.setBaseLayer('osm', this)"><i class="fa-solid fa-earth-asia"></i> OpenStreetMap</button>
              <!-- Region & Corridor Filter Controls (Toggleable) -->
              <button class="map-filter-btn" id="btnToggleMapFilters" onclick="const container = document.getElementById('mapFiltersCollapse'); container.style.display = container.style.display === 'none' ? 'flex' : 'none'; this.classList.toggle('active');">
                <i class="fa-solid fa-sliders"></i> Filter Options ▾
              </button>
            </div>

            <div id="mapFiltersCollapse" class="map-hud-top" style="display:none; flex-wrap:wrap; margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(0,0,0,0.08);">
              <!-- Region Filter Controls -->
              <div class="map-hud-controls">
                <button class="map-filter-btn active" onclick="window.MapView.filterRegion('all', this)">All India</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('NR', this)">Northern</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('WR', this)">Western</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('SR', this)">Southern</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('ER', this)">Eastern</button>
                <button class="map-filter-btn" onclick="window.MapView.filterRegion('NER', this)">North-East</button>
              </div>

              <!-- Corridor Filter Controls -->
              <div class="map-hud-controls" style="margin-left:auto;">
                <button class="map-filter-btn active" onclick="window.MapView.filterCorridor('all', this)">All Lines</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('HVDC', this)">±800kV HVDC</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('765kV_AC', this)">765 kV AC</button>
                <button class="map-filter-btn" onclick="window.MapView.filterCorridor('400kV_AC', this)">400 kV AC</button>
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
            <div id="indiaGridCanvas" style="width:100%; height:100%; min-height:450px; z-index:1;"></div>

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
                <!-- Section 1: Power Stations & Substations -->
                <div class="legend-section-title">Major Power Stations &amp; Substations</div>
                <div class="legend-grid">
                  <div class="legend-chip"><span class="legend-symbol hvdc"></span> <strong>HVDC Terminal / Converter Hub</strong> (±800kV / ±500kV)</div>
                  <div class="legend-chip"><span class="legend-symbol nuclear"></span> <strong>Nuclear Power Station</strong> (NPCIL Baseload)</div>
                  <div class="legend-chip"><span class="legend-symbol thermal"></span> <strong>Super Thermal / UMPP</strong> (NTPC Coal Pit-Head)</div>
                  <div class="legend-chip"><span class="legend-symbol hydro"></span> <strong>Hydro &amp; Pumped Storage Dam</strong> (Sutlej / Tehri / Koyna)</div>
                  <div class="legend-chip"><span class="legend-symbol solar"></span> <strong>Mega Solar &amp; Wind Park</strong> (Bhadla / Pavagada / Muppandal)</div>
                  <div class="legend-chip"><span class="legend-symbol substation"></span> <strong>765kV / 400kV Super Pooling Hub</strong> (PGCIL)</div>
                </div>

                <!-- Section 2: Transmission Lines -->
                <div class="legend-section-title" style="margin-top:0.45rem;">Bulk Transmission Highways</div>
                <div class="legend-grid">
                  <div class="legend-chip"><span style="display:inline-block; width:18px; height:3.5px; background:#1c1917; border-radius:2px;"></span> ±800kV / ±500kV HVDC Bulk Corridors</div>
                  <div class="legend-chip"><span style="display:inline-block; width:18px; height:2.5px; background:#78716c; border-radius:2px;"></span> 765 kV AC Super-Grid Backbone</div>
                  <div class="legend-chip"><span style="display:inline-block; width:18px; height:1.5px; border-top:2px dashed #a8a29e;"></span> 400 kV AC Regional Interconnection</div>
                </div>

                <!-- Section 3: Telemetry Status -->
                <div class="legend-section-title" style="margin-top:0.45rem;">SCADA Operational Status</div>
                <div class="legend-grid" style="grid-template-columns: repeat(3, 1fr);">
                  <div class="legend-chip"><span class="status-dot healthy"></span> Nominal Synchronized</div>
                  <div class="legend-chip"><span class="status-dot warning"></span> Elevated Load / Watch</div>
                  <div class="legend-chip"><span class="status-dot critical"></span> Compromised / Threat</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Substation & Transformer Telemetry Inspector -->
          <div class="map-inspector-sidebar" id="nodeInspector">
            <div class="inspector-header">
              <div style="font-weight:700; color:#1c1917; font-size:0.95rem;" id="inspNodeId">WR-RAIGARH</div>
              <span class="badge badge-critical" id="inspStatusBadge">Compromised</span>
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
                  <!-- Populated via JS -->
                </div>
                <ul class="ai-summary-bullets" id="inspAiSummaryBullets">
                  <!-- Populated via JS -->
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
      </div>
    `;
  },

  handleSearchInput: (query) => {
    const dropdown = document.getElementById('mapSearchDropdown');
    const list = document.getElementById('searchDropdownList');
    const clearBtn = document.getElementById('searchClearBtn');

    if (!dropdown || !list) return;

    if (query && query.trim().length > 0) {
      if (clearBtn) clearBtn.style.display = 'flex';
      
      const visualizer = window.app.indiaVisualizer;
      if (!visualizer) return;

      const results = visualizer.search(query, window.MapView.activeSearchFilter);
      window.MapView.searchResults = results;

      if (results.length === 0) {
        list.innerHTML = `
          <div class="search-empty-state">
            <i class="fa-solid fa-circle-question" style="font-size:1.5rem; color:#a8a29e; margin-bottom:0.35rem;"></i>
            <div>No matching states, districts, substations, or transformers found for "<strong>${query}</strong>"</div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Try searching "Maharashtra", "Kutch", "Agra", "Kudankulam", or "ICT"</div>
          </div>
        `;
      } else {
        list.innerHTML = results.map((item, idx) => {
          let badgeClass = 'badge-state';
          let icon = 'fa-map-location-dot';

          if (item.category === 'operator') {
            badgeClass = 'badge-operator';
            icon = 'fa-building-shield';
          } else if (item.category === 'pincode') {
            badgeClass = 'badge-pincode';
            icon = 'fa-location-dot';
          } else if (item.category === 'district') {
            badgeClass = 'badge-district';
            icon = 'fa-city';
          } else if (item.category === 'station') {
            badgeClass = 'badge-station';
            icon = 'fa-bolt';
          } else if (item.category === 'transformer') {
            badgeClass = 'badge-transformer';
            icon = 'fa-car-battery';
          }

          let subtext = '';
          if (item.category === 'operator') {
            subtext = `${item.firmType} · HQ: ${item.hq} · Click to trace full transmission network`;
          } else if (item.category === 'pincode') {
            subtext = `PIN ${item.pincode} · ${item.postalOffice || item.city || ''} · ${item.state} (${item.region} Grid)`;
          } else if (item.category === 'state') {
            subtext = `${item.region} Power Region · Synchronous Grid`;
          } else if (item.category === 'district') {
            subtext = `${item.state} · ${item.region} Region · PIN ${item.pincode || 'N/A'}`;
          } else if (item.category === 'station') {
            subtext = `${item.city || item.name}, ${item.state} · PIN ${item.pincode || 'N/A'} · ${item.voltage} · ${item.capacityMW ? item.capacityMW.toLocaleString() + ' MW' : ''}`;
          } else if (item.category === 'transformer') {
            subtext = `@ ${item.substationName} (${item.state}) · PIN ${item.pincode || 'N/A'} · ${item.ratingMVA} MVA · ${item.primaryKV}/${item.secondaryKV} kV`;
          }

          const isPincodeItem = item.category === 'pincode' || !!item.pincode;
          const pinVal = item.pincode || (item.category === 'pincode' ? item.pincode : '');

          const pincodeActionBtn = isPincodeItem && pinVal ? `
            <button class="pincode-quick-btn" title="Highlight all transformers and complete power transfer within PIN ${pinVal}" onclick="event.stopPropagation(); window.MapView.highlightPincodeDirectly('${pinVal}')">
              <i class="fa-solid fa-bolt" style="color:#d97706;"></i> Flow &amp; Transformers
            </button>
          ` : '';

          return `
            <div class="search-result-row" onclick="window.MapView.selectSearchResult(${idx})">
              <div class="result-icon-col">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="result-info-col">
                <div class="result-title-row">
                  <span class="result-name">${item.displayName || item.name}</span>
                  <span class="result-badge ${badgeClass}">${item.categoryLabel || item.category.toUpperCase()}</span>
                </div>
                <div class="result-subtext">${subtext}</div>
              </div>
              <div class="result-action-col">
                ${pincodeActionBtn}
                <i class="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          `;
        }).join('');
      }

      dropdown.style.display = 'block';
    } else {
      if (clearBtn) clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
      window.MapView.searchResults = [];
    }
  },

  highlightPincodeDirectly: (pincode) => {
    const dropdown = document.getElementById('mapSearchDropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.highlightPincodeTransformers(pincode);
    }
  },

  highlightTransformerFromMap: (xfmrId, nodeId) => {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) {
      window.MapView.updateNodeTelemetry(node);
      window.MapView.switchInspectorTab('transformers');

      setTimeout(() => {
        const card = document.getElementById(`xfmr-card-${xfmrId}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('highlight-pulse');
          setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
        }
      }, 150);
    }
  },


  selectSearchResult: (index) => {
    const item = window.MapView.searchResults[index];
    if (!item) return;

    const input = document.getElementById('gridHierarchySearchInput');
    if (input) input.value = item.name;

    const dropdown = document.getElementById('mapSearchDropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.selectSearchResult(item);
    }
  },

  clearSearch: () => {
    const input = document.getElementById('gridHierarchySearchInput');
    const dropdown = document.getElementById('mapSearchDropdown');
    const clearBtn = document.getElementById('searchClearBtn');

    if (input) input.value = '';
    if (dropdown) dropdown.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
  },

  setSearchFilter: (filterCategory, btn) => {
    window.MapView.activeSearchFilter = filterCategory;
    document.querySelectorAll('.map-search-category-pills .search-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const input = document.getElementById('gridHierarchySearchInput');
    if (input && input.value) {
      window.MapView.handleSearchInput(input.value);
    }
  },

  switchInspectorTab: (tabName) => {
    window.MapView.currentInspectorTab = tabName;

    const btnSpecs = document.getElementById('tabBtnSpecs');
    const btnXfmr = document.getElementById('tabBtnTransformers');
    const paneSpecs = document.getElementById('tabPaneSpecs');
    const paneXfmr = document.getElementById('tabPaneTransformers');

    if (tabName === 'specs') {
      btnSpecs?.classList.add('active');
      btnXfmr?.classList.remove('active');
      if (paneSpecs) paneSpecs.style.display = 'flex';
      if (paneXfmr) paneXfmr.style.display = 'none';
    } else {
      btnSpecs?.classList.remove('active');
      btnXfmr?.classList.add('active');
      if (paneSpecs) paneSpecs.style.display = 'none';
      if (paneXfmr) paneXfmr.style.display = 'flex';
    }
  },

  highlightTransformer: (transformer, parentNode) => {
    window.MapView.updateNodeTelemetry(parentNode);
    window.MapView.switchInspectorTab('transformers');

    setTimeout(() => {
      const card = document.getElementById(`xfmr-card-${transformer.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-pulse');
        setTimeout(() => card.classList.remove('highlight-pulse'), 3000);
      }
    }, 150);
  },

  setBaseLayer: (layerType, btn) => {
    document.querySelectorAll('.map-hud-controls:first-child .map-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.setBaseLayer(layerType);
    }
  },

  filterRegion: (regionId, btn) => {
    document.querySelectorAll('.map-hud-controls:nth-child(2) .map-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.filterByRegion(regionId);
    }
  },

  filterCorridor: (type, btn) => {
    document.querySelectorAll('.map-hud-controls:nth-child(3) .map-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.filterByCorridor(type);
    }
  },

  filterFacility: (facilityType, btn) => {
    document.querySelectorAll('.map-hud-controls:last-child .map-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.filterByFacility(facilityType);
    }
  },

  traceOperator: (operatorId, btn) => {
    if (btn) {
      document.querySelectorAll('.operator-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const badge = document.getElementById('activeOpBadge');
      if (badge) badge.textContent = btn.innerText.trim();
    }
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.traceOperatorTransmission(operatorId);
    }
  },

  clearOperatorTrace: () => {
    document.querySelectorAll('.operator-pill-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.operator-pill-btn[data-op="all"]');
    if (allBtn) allBtn.classList.add('active');
    const badge = document.getElementById('activeOpBadge');
    if (badge) badge.textContent = 'Full National Grid';

    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.clearOperatorTrace();
    }
  },

  updateOperatorProfile: (operator, matchedNodes, matchedCorridors) => {
    const banner = document.getElementById('activeOperatorBanner');
    if (!banner) return;

    if (!operator) {
      banner.style.display = 'none';
      return;
    }

    const totalCapMW = matchedNodes.reduce((acc, n) => acc + (n.capacityMW || 0), 0);
    const totalFlowMW = matchedCorridors.reduce((acc, c) => acc + (c.currentFlowMW || 0), 0);
    const totalDistanceKm = matchedCorridors.reduce((acc, c) => acc + (c.distanceKm || 0), 0);

    const statesSet = new Set(matchedNodes.map(n => n.state));

    banner.style.display = 'block';
    banner.innerHTML = `
      <div class="active-operator-card" style="border-left: 4px solid ${operator.color};">
        <div class="operator-card-header">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <i class="fa-solid fa-tower-broadcast" style="color:${operator.color}; font-size:1.1rem;"></i>
            <span style="font-weight:700; font-size:0.95rem; color:#1c1917;">${operator.name}</span>
            <span class="badge ${operator.badgeClass}">${operator.firmType}</span>
          </div>
          <button class="btn btn-secondary" style="font-size:0.72rem; padding:0.2rem 0.55rem;" onclick="window.MapView.clearOperatorTrace()">
            <i class="fa-solid fa-xmark"></i> Clear Trace (Show National Grid)
          </button>
        </div>

        <div class="operator-card-body">
          <p style="font-size:0.78rem; color:var(--text-body); margin-bottom:0.65rem;">${operator.description}</p>
          <div class="operator-stats-grid">
            <div class="op-stat-box">
              <span class="op-stat-label">Total Grid Capacity</span>
              <span class="op-stat-val" style="color:${operator.color};">${(totalCapMW / 1000).toFixed(1)} GW</span>
            </div>
            <div class="op-stat-box">
              <span class="op-stat-label">Traced Stations</span>
              <span class="op-stat-val">${matchedNodes.length} Hubs</span>
            </div>
            <div class="op-stat-box">
              <span class="op-stat-label">Transmission Lines</span>
              <span class="op-stat-val">${matchedCorridors.length} Corridors (${totalDistanceKm.toLocaleString()} km)</span>
            </div>
            <div class="op-stat-box">
              <span class="op-stat-label">Active Power Flow</span>
              <span class="op-stat-val">${(totalFlowMW / 1000).toFixed(1)} GW</span>
            </div>
            <div class="op-stat-box">
              <span class="op-stat-label">States / UTs Covered</span>
              <span class="op-stat-val">${statesSet.size} States</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  simulateIndianGridAttack: () => {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const node = data.nodes.find(n => n.id === 'WR-RAIGARH');
    const corridor = data.corridors.find(c => c.from === 'WR-RAIGARH' && c.to === 'SR-PUGALUR');

    if (node) node.status = 'compromised';
    if (corridor) corridor.status = 'compromised';

    alert('Cyber Incident Injected: DNP3 Protocol Tampering detected on Raigarh ±800kV HVDC Converter Station (Western Region). Inter-regional power transfer to Southern Region (5,200 MW) flagged at risk.');
    
    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.selectedNodeId = 'WR-RAIGARH';
      window.app.indiaVisualizer.renderCorridors();
      window.app.indiaVisualizer.renderNodes();
    }
    if (node) window.MapView.updateNodeTelemetry(node);
  },

  toggleIsolateNode: () => {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const selectedId = window.app.indiaVisualizer?.selectedNodeId || 'WR-RAIGARH';
    const node = data.nodes.find(n => n.id === selectedId);
    if (!node) return;

    if (node.status === 'compromised' || node.status === 'healthy') {
      node.status = 'isolated';
      alert(`Station ${node.name} (${node.id}) isolated from automatic telemetry dispatch. Automated alternate routing active.`);
    } else {
      node.status = 'healthy';
      alert(`Station ${node.name} restored to nominal synchronized state.`);
    }

    if (window.app.indiaVisualizer) {
      window.app.indiaVisualizer.renderNodes();
    }
    window.MapView.updateNodeTelemetry(node);
  },

  updateNodeTelemetry: (node) => {
    const inspNodeId = document.getElementById('inspNodeId');
    const inspNodeName = document.getElementById('inspNodeName');
    const inspRegionZone = document.getElementById('inspRegionZone');
    const inspVoltage = document.getElementById('inspVoltage');
    const inspLoad = document.getElementById('inspLoad');
    const inspCoordinates = document.getElementById('inspCoordinates');
    const inspOperator = document.getElementById('inspOperator');
    const inspCorridorInfo = document.getElementById('inspCorridorInfo');
    const inspNotes = document.getElementById('inspNotes');
    const inspStatusBadge = document.getElementById('inspStatusBadge');
    const btnIsolate = document.getElementById('btnIsolateIndianNode');
    const xfmrCountBadge = document.getElementById('inspXfmrCount');
    const xfmrListEl = document.getElementById('inspectorTransformersList');

    const inspPincodeRow = document.getElementById('inspPincodeRow');
    const inspTotalXfmrMVA = document.getElementById('inspTotalXfmrMVA');
    const inspFacilityType = document.getElementById('inspFacilityType');
    const xfmrSummaryBanner = document.getElementById('inspXfmrSummaryBanner');

    if (!inspNodeId) return;

    const xfmrs = node.transformers || [];
    const totalXfmrMVA = xfmrs.reduce((acc, t) => acc + (t.ratingMVA || 0), 0);

    inspNodeId.textContent = node.id;
    inspNodeName.textContent = node.name;
    inspRegionZone.textContent = `${node.city || node.name}, ${node.district ? node.district + ', ' : ''}${node.state} · ${node.region} Grid`;
    
    if (inspPincodeRow) {
      inspPincodeRow.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
          <span class="badge badge-pincode"><i class="fa-solid fa-location-dot"></i> PIN: ${node.pincode || 'N/A'}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${node.postalOffice || node.city || ''}</span>
        </div>
      `;
    }

    inspVoltage.textContent = node.voltage;
    inspLoad.textContent = `${node.currentMW.toLocaleString()} / ${node.capacityMW.toLocaleString()} MW`;
    if (inspTotalXfmrMVA) inspTotalXfmrMVA.textContent = `${xfmrs.length} Bays (${totalXfmrMVA.toLocaleString()} MVA)`;
    inspCoordinates.textContent = `${node.lat.toFixed(2)}°N, ${node.lon.toFixed(2)}°E`;
    if (inspOperator) {
      inspOperator.innerHTML = `
        <div style="font-weight:700; color:#1c1917; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">
          <span>${node.operator || 'POWERGRID (PGCIL)'}</span>
          <button class="btn btn-secondary" style="font-size:0.68rem; padding:0.15rem 0.45rem; display:inline-flex; align-items:center; gap:3px;" onclick="window.MapView.traceOperator('${node.operatorId || 'PGCIL'}')" title="Trace ${node.operator || 'Firm'} power transmission grid">
            <i class="fa-solid fa-tower-broadcast" style="color:#166534;"></i> Trace Grid ↗
          </button>
        </div>
      `;
    }
    if (inspFacilityType) inspFacilityType.textContent = (node.type || 'substation').toUpperCase().replace('_', ' ');
    if (inspNotes) inspNotes.textContent = node.notes || 'Operating within standard CERC grid limits.';

    if (xfmrSummaryBanner) {
      xfmrSummaryBanner.innerHTML = `
        <div style="font-weight:700; color:#1c1917; font-size:0.85rem; display:flex; align-items:center; gap:0.4rem;">
          <i class="fa-solid fa-bolt" style="color:#166534;"></i> ${xfmrs.length} Transformer Bays Installed (${totalXfmrMVA.toLocaleString()} MVA Total Capacity)
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
          Live DGA gas chromatography &amp; thermal telemetry polling at 60 fps synchrophasor rate.
        </div>
      `;
    }

    // Populate Corridors
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const connectedCorridors = data.corridors.filter(c => c.from === node.id || c.to === node.id);
    if (inspCorridorInfo) {
      if (connectedCorridors.length === 0) {
        inspCorridorInfo.innerHTML = '<span style="color:var(--text-muted);">Intra-state distribution integration link.</span>';
      } else {
        inspCorridorInfo.innerHTML = connectedCorridors.map(c => `
          <div style="margin-bottom:0.35rem; padding-bottom:0.35rem; border-bottom:1px solid #f0eee9;">
            <div style="font-weight:600; color:#1c1917;">${c.name}</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">${c.type} · ${c.voltage} · <span style="color:var(--accent-forest); font-weight:600;">${c.currentFlowMW} MW</span> (${c.distanceKm} km)</div>
          </div>
        `).join('');
      }
    }

    // Populate Transformers
    if (xfmrCountBadge) xfmrCountBadge.textContent = xfmrs.length;

    if (xfmrListEl) {
      if (xfmrs.length === 0) {
        xfmrListEl.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); padding:1rem; text-align:center;">No direct SCADA transformer units mapped to this terminal.</div>';
      } else {
        xfmrListEl.innerHTML = xfmrs.map(t => {
          const loadColor = t.loadPercent > 85 ? 'var(--status-critical)' : (t.loadPercent > 75 ? 'var(--accent-terracotta)' : 'var(--status-healthy)');
          return `
            <div class="xfmr-telemetry-card" id="xfmr-card-${t.id}">
              <div class="xfmr-card-header">
                <div>
                  <div class="xfmr-name">${t.name}</div>
                  <div class="xfmr-id">${t.id} · <span class="badge badge-forest" style="font-size:0.65rem;">${t.type}</span></div>
                </div>
                <div class="xfmr-rating">${t.ratingMVA} MVA</div>
              </div>

              <!-- Primary / Secondary Voltage -->
              <div class="xfmr-ratio-row">
                <span><strong>Voltage:</strong> ${t.primaryKV} kV / ${t.secondaryKV} kV</span>
                <span><strong>Cooling:</strong> ${t.cooling || 'ONAF'}</span>
              </div>

              <!-- Loading Progress Bar -->
              <div class="xfmr-load-meter">
                <div class="load-label-row">
                  <span>Active Load</span>
                  <span style="font-weight:700; color:${loadColor};">${t.loadPercent}%</span>
                </div>
                <div class="load-bar-track">
                  <div class="load-bar-fill" style="width:${t.loadPercent}%; background:${loadColor};"></div>
                </div>
              </div>

              <!-- Diagnostics Grid (Oil Temp, Winding Temp, Tap Pos, DGA) -->
              <div class="xfmr-diag-grid">
                <div class="diag-box">
                  <span class="d-label">Oil Temp</span>
                  <span class="d-val">${t.oilTempC || 52}°C</span>
                </div>
                <div class="diag-box">
                  <span class="d-label">Winding Temp</span>
                  <span class="d-val">${t.windingTempC || 62}°C</span>
                </div>
                <div class="diag-box">
                  <span class="d-label">OLTC Tap</span>
                  <span class="d-val">Pos ${t.tapPosition || 9}</span>
                </div>
                <div class="diag-box">
                  <span class="d-label">DGA Gas</span>
                  <span class="d-val" style="color:var(--status-healthy); font-size:0.75rem;">${t.dgaStatus ? t.dgaStatus.split(' ')[0] : 'Normal'}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    if (inspStatusBadge) {
      inspStatusBadge.textContent = node.status.toUpperCase();
      inspStatusBadge.className = `badge badge-${node.status === 'compromised' ? 'critical' : (node.status === 'isolated' ? 'warning' : 'healthy')}`;
    }

    if (btnIsolate) {
      btnIsolate.innerHTML = node.status === 'isolated' ? '<i class="fa-solid fa-rotate-left"></i> Restore Station' : '<i class="fa-solid fa-shield"></i> Isolate Station Gateway';
    }

    // Populate AI Protocol & Telemetry Summary Card
    const aiSummaryCard = document.getElementById('inspAiSummaryCard');
    const aiSummaryBadge = document.getElementById('inspAiSummaryBadge');
    const aiSummaryText = document.getElementById('inspAiSummaryText');
    const aiSummaryBullets = document.getElementById('inspAiSummaryBullets');

    if (aiSummaryCard && aiSummaryText && aiSummaryBullets) {
      const loadRatio = node.capacityMW > 0 ? (node.currentMW / node.capacityMW) * 100 : 75;
      const xfmrTotalMVA = (node.transformers || []).reduce((acc, t) => acc + (t.ratingMVA || 0), 0);

      if (node.status === 'compromised') {
        aiSummaryCard.className = 'ai-summary-card alert-crit';
        if (aiSummaryBadge) {
          aiSummaryBadge.className = 'badge badge-critical';
          aiSummaryBadge.textContent = 'Threat Detected';
        }
        aiSummaryText.textContent = `CRITICAL: DNP3 / Modbus TCP packet tampering detected on ${node.name} gateway. Disrupted telemetry frames flagged by Deep Packet Inspection.`;
        aiSummaryBullets.innerHTML = `
          <li><strong>Protocol Threat:</strong> Outstation checksum mismatch on unsolicited SCADA responses.</li>
          <li><strong>Contingency Impact:</strong> ${node.currentMW.toLocaleString()} MW power transfer flagged at risk of inadvertent breaker trip.</li>
          <li><strong>AI Recommendation:</strong> Isolate station gateway immediately. Dijkstra engine has computed alternate parallel corridor.</li>
        `;
      } else if (node.status === 'isolated') {
        aiSummaryCard.className = 'ai-summary-card alert-warn';
        if (aiSummaryBadge) {
          aiSummaryBadge.className = 'badge badge-warning';
          aiSummaryBadge.textContent = 'Isolated';
        }
        aiSummaryText.textContent = `Station ${node.name} is currently isolated from direct telemetry dispatch. Automated islanding defense active.`;
        aiSummaryBullets.innerHTML = `
          <li><strong>Protocol Status:</strong> Station gateway communication link placed in quarantine mode.</li>
          <li><strong>Load Redistribution:</strong> ${node.currentMW.toLocaleString()} MW rerouted through adjacent 765kV synchronous paths.</li>
          <li><strong>AI Recommendation:</strong> Execute firmware integrity attestation before restoring nominal grid synchronization.</li>
        `;
      } else {
        aiSummaryCard.className = 'ai-summary-card';
        if (aiSummaryBadge) {
          aiSummaryBadge.className = 'badge badge-forest';
          aiSummaryBadge.textContent = 'Nominal';
        }
        aiSummaryText.textContent = `All synchrophasor PMU frames and SCADA protocol streams operating at nominal 50.002 Hz synchronism with 100% CRC integrity.`;
        aiSummaryBullets.innerHTML = `
          <li><strong>Protocol Stream:</strong> DNP3 &amp; IEC 60870-5-104 polling at 60 fps synchrophasor rate (0 dropped frames).</li>
          <li><strong>Thermal &amp; Load Margin:</strong> Active load at ${loadRatio.toFixed(1)}% of rating (${xfmrTotalMVA.toLocaleString()} MVA total capacity). Temperatures nominal.</li>
          <li><strong>AI Recommendation:</strong> Operating within optimal IEGC limits. Maintain automatic AGC frequency regulation.</li>
        `;
      }
    }
  },

  showPincodePowerTransferModal: (pincode, primaryNode) => {
    let modalEl = document.getElementById('pincodePowerTransferModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'pincodePowerTransferModal';
      modalEl.className = 'pincode-modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    const matchedNodes = (data.nodes || []).filter(n => n.pincode && n.pincode.toString() === pincode.toString().trim());
    const node = primaryNode || matchedNodes[0] || {};
    const xfmrs = node.transformers || [];
    const totalXfmrMVA = xfmrs.reduce((acc, t) => acc + (t.ratingMVA || 0), 0);
    const activeThroughputMW = Math.round(xfmrs.reduce((acc, t) => acc + ((t.ratingMVA || 1000) * ((t.loadPercent || 75) / 100) * 0.95), 0));

    // Calculate Inflow & Outflow Corridors
    const connectedNodeIds = new Set(matchedNodes.map(n => n.id));
    const inflowCorridors = (data.corridors || []).filter(c => connectedNodeIds.has(c.to));
    const outflowCorridors = (data.corridors || []).filter(c => connectedNodeIds.has(c.from));

    const totalInflowMW = inflowCorridors.reduce((acc, c) => acc + (c.currentFlowMW || 0), 0);
    const totalOutflowMW = outflowCorridors.reduce((acc, c) => acc + (c.currentFlowMW || 0), 0);

    // Step-down stages
    const primaryVolts = xfmrs.map(t => `${t.primaryKV}kV`).filter((v, i, a) => a.indexOf(v) === i);
    const secondaryVolts = xfmrs.map(t => `${t.secondaryKV}kV`).filter((v, i, a) => a.indexOf(v) === i);

    modalEl.style.display = 'flex';
    modalEl.innerHTML = `
      <div class="pincode-modal-card">
        <!-- Modal Header -->
        <div class="pincode-modal-header">
          <div class="pincode-modal-title-group">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span class="badge badge-pincode" style="font-size:0.82rem; padding:0.25rem 0.6rem;">
                <i class="fa-solid fa-location-dot"></i> PINCODE ${pincode}
              </span>
              <span class="badge badge-forest" style="font-size:0.75rem;">
                <i class="fa-solid fa-bolt"></i> Complete Power Transfer &amp; Transformation Flow
              </span>
              <span class="badge badge-blue" style="font-size:0.75rem;">
                ${node.region || 'NR'} Regional Grid
              </span>
            </div>
            <h3 style="margin:0.35rem 0 0.15rem 0; font-size:1.25rem; font-weight:800; color:#1c1917;">
              ${node.name || 'Substation Geographic Area'}
            </h3>
            <div style="font-size:0.8rem; color:#78716c;">
              <i class="fa-solid fa-map-pin"></i> ${node.postalOffice || node.city || ''}, ${node.district ? node.district + ', ' : ''}${node.state} &middot; Operator: <strong>${node.operator || 'POWERGRID (PGCIL)'}</strong>
            </div>
          </div>
          <button class="pincode-modal-close-btn" onclick="window.MapView.closePincodePowerTransferModal()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Power Transformation Summary Flow Strip -->
        <div class="pincode-flow-summary-strip">
          <div class="pincode-flow-stage">
            <div class="stage-tag">Bulk Inflow Feed</div>
            <div class="stage-val" style="color:#d97706;">${totalInflowMW.toLocaleString()} MW</div>
            <div class="stage-sub">${inflowCorridors.length} Incoming Corridors (${primaryVolts.join(', ')})</div>
          </div>

          <div class="flow-arrow-stage">
            <i class="fa-solid fa-chevron-right"></i>
            <div style="font-size:0.65rem; color:#78716c; font-weight:700;">STEP-DOWN</div>
          </div>

          <div class="pincode-flow-stage active">
            <div class="stage-tag">Transformation Bay Capacity</div>
            <div class="stage-val" style="color:#166534;">${totalXfmrMVA.toLocaleString()} MVA</div>
            <div class="stage-sub">${xfmrs.length} Transformer Bays (${activeThroughputMW.toLocaleString()} MW Active)</div>
          </div>

          <div class="flow-arrow-stage">
            <i class="fa-solid fa-chevron-right"></i>
            <div style="font-size:0.65rem; color:#78716c; font-weight:700;">DISTRIBUTE</div>
          </div>

          <div class="pincode-flow-stage">
            <div class="stage-tag">Outflow Transmission &amp; Load</div>
            <div class="stage-val" style="color:#0284c7;">${totalOutflowMW.toLocaleString()} MW</div>
            <div class="stage-sub">${outflowCorridors.length} Outgoing Highways (${secondaryVolts.join(', ')})</div>
          </div>
        </div>

        <!-- Power Balance & N-1 Readiness KPI Bar -->
        <div class="pincode-kpi-bar">
          <div class="pincode-kpi-item">
            <span class="pk-label">N-1 Contingency Readiness</span>
            <span class="pk-val" style="color:#166534;"><i class="fa-solid fa-circle-check"></i> Redundant &amp; Compliant</span>
          </div>
          <div class="pincode-kpi-item">
            <span class="pk-label">Transformation Efficiency</span>
            <span class="pk-val">99.1% (Loss &lt; 0.9%)</span>
          </div>
          <div class="pincode-kpi-item">
            <span class="pk-label">Substation Voltage Levels</span>
            <span class="pk-val">${node.voltage || '765kV / 400kV'}</span>
          </div>
          <div class="pincode-kpi-item">
            <span class="pk-label">GPS Coordinates</span>
            <span class="pk-val">${node.lat ? node.lat.toFixed(4) + '°N, ' + node.lon.toFixed(4) + '°E' : 'N/A'}</span>
          </div>
        </div>

        <!-- Transformer Bays Grid for this Geographic Pincode -->
        <div class="pincode-section-header">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <i class="fa-solid fa-car-battery" style="color:#166534;"></i>
            <h4 style="margin:0; font-size:0.95rem; font-weight:700; color:#1c1917;">
              Monitored Transformer Bays within PIN ${pincode} (${xfmrs.length} Units)
            </h4>
          </div>
          <span style="font-size:0.72rem; color:#78716c;">Click 'Simulate Bay Trip' to stress-test N-1 power transfer</span>
        </div>

        <div class="pincode-xfmr-grid">
          ${xfmrs.map((t, idx) => {
            const loadColor = t.loadPercent > 85 ? '#b91c1c' : (t.loadPercent > 70 ? '#d97706' : '#166534');
            const activeMVA = Math.round((t.ratingMVA || 1000) * ((t.loadPercent || 75) / 100));
            const activeMW = Math.round(activeMVA * 0.95);

            return `
              <div class="pincode-xfmr-card" id="pincode-xfmr-${t.id}">
                <div class="pincode-xfmr-card-top">
                  <div>
                    <div style="font-weight:800; font-size:0.95rem; color:#1c1917;">${t.name}</div>
                    <div style="font-size:0.72rem; color:#78716c; font-family:monospace;">
                      ${t.id} &middot; <span class="badge badge-forest" style="font-size:0.65rem;">${t.type}</span>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:1.05rem; font-weight:800; color:#166534;">${t.ratingMVA} MVA</div>
                    <div style="font-size:0.68rem; color:#78716c;">Rated Capacity</div>
                  </div>
                </div>

                <!-- Voltage Transformation Step-Down -->
                <div class="pincode-xfmr-voltage-box">
                  <div class="v-step">
                    <span class="v-label">Primary Incomer</span>
                    <span class="v-val">${t.primaryKV} kV</span>
                  </div>
                  <div class="v-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                  <div class="v-step">
                    <span class="v-label">Secondary Outflow</span>
                    <span class="v-val">${t.secondaryKV} kV</span>
                  </div>
                  <div class="v-step" style="margin-left:auto; text-align:right;">
                    <span class="v-label">Active Flow</span>
                    <span class="v-val" style="color:${loadColor};">${activeMW} MW</span>
                  </div>
                </div>

                <!-- Load Meter -->
                <div style="margin-top:0.65rem;">
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-bottom:3px;">
                    <span>Current Loading</span>
                    <span style="color:${loadColor};">${t.loadPercent}% (${activeMVA} MVA)</span>
                  </div>
                  <div style="height:7px; background:#e7e5e4; border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${t.loadPercent}%; background:${loadColor}; border-radius:4px; transition:width 0.4s ease;"></div>
                  </div>
                </div>

                <!-- Diagnostics 4-Block -->
                <div class="pincode-xfmr-diag-grid">
                  <div class="diag-tile">
                    <span class="dt-label">Oil Temp</span>
                    <span class="dt-val">${t.oilTempC || 54}°C</span>
                  </div>
                  <div class="diag-tile">
                    <span class="dt-label">Winding Temp</span>
                    <span class="dt-val">${t.windingTempC || 64}°C</span>
                  </div>
                  <div class="diag-tile">
                    <span class="dt-label">DGA Chroma</span>
                    <span class="dt-val" style="color:#166534; font-size:0.72rem;">${t.dgaStatus ? t.dgaStatus.split(' ')[0] : 'Normal'}</span>
                  </div>
                  <div class="diag-tile">
                    <span class="dt-label">Tap Position</span>
                    <span class="dt-val">Pos ${t.tapPosition || 9}</span>
                  </div>
                </div>

                <!-- Bay Action Row -->
                <div style="margin-top:0.75rem; display:flex; gap:0.4rem; justify-content:flex-end;">
                  <button class="btn btn-secondary" style="font-size:0.68rem; padding:0.25rem 0.55rem;" onclick="window.MapView.simulatePincodeTransformerTrip('${t.id}', '${pincode}')">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#d97706;"></i> Simulate N-1 Trip
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Inflow & Outflow Corridors Section -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.85rem; margin-top:1rem;">
          <!-- Inflow Corridors -->
          <div class="pincode-corridor-box">
            <div class="pincode-corridor-title" style="color:#d97706;">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Inflow Transmission Corridors (${inflowCorridors.length})
            </div>
            <div class="pincode-corridor-list">
              ${inflowCorridors.length === 0 ? '<div style="font-size:0.75rem; color:#78716c; padding:0.4rem;">Direct generation or intra-state intake.</div>' : inflowCorridors.map(c => `
                <div class="pincode-corridor-row">
                  <div>
                    <div style="font-weight:700; font-size:0.82rem; color:#1c1917;">${c.name}</div>
                    <div style="font-size:0.7rem; color:#78716c;">From: <strong>${c.from}</strong> &middot; ${c.voltage}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700; font-size:0.85rem; color:#d97706;">${c.currentFlowMW} MW</div>
                    <div style="font-size:0.68rem; color:#78716c;">${c.capacityMW} MW Cap</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Outflow Corridors -->
          <div class="pincode-corridor-box">
            <div class="pincode-corridor-title" style="color:#166534;">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Outflow &amp; Distribution Feeds (${outflowCorridors.length})
            </div>
            <div class="pincode-corridor-list">
              ${outflowCorridors.length === 0 ? '<div style="font-size:0.75rem; color:#78716c; padding:0.4rem;">Feeds local municipal and regional industrial clusters.</div>' : outflowCorridors.map(c => `
                <div class="pincode-corridor-row">
                  <div>
                    <div style="font-weight:700; font-size:0.82rem; color:#1c1917;">${c.name}</div>
                    <div style="font-size:0.7rem; color:#78716c;">To: <strong>${c.to}</strong> &middot; ${c.voltage}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700; font-size:0.85rem; color:#166534;">${c.currentFlowMW} MW</div>
                    <div style="font-size:0.68rem; color:#78716c;">${c.capacityMW} MW Cap</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div style="margin-top:1.25rem; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e7e5e4; padding-top:0.75rem;">
          <div style="font-size:0.75rem; color:#78716c;">
            <i class="fa-solid fa-circle-info"></i> Power grid data synchronized via National RLDC SCADA / CEA 50.00 Hz Standard.
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary" onclick="window.MapView.closePincodePowerTransferModal()">
              Close
            </button>
            <button class="btn btn-primary" onclick="window.MapView.closePincodePowerTransferModal(); window.MapView.switchInspectorTab('transformers');">
              <i class="fa-solid fa-microchip"></i> View in Side Inspector
            </button>
          </div>
        </div>
      </div>
    `;
  },

  closePincodePowerTransferModal: () => {
    const modalEl = document.getElementById('pincodePowerTransferModal');
    if (modalEl) {
      modalEl.style.display = 'none';
    }
  },

  simulatePincodeTransformerTrip: (xfmrId, pincode) => {
    const card = document.getElementById(`pincode-xfmr-${xfmrId}`);
    if (card) {
      card.style.background = '#fee2e2';
      card.style.borderColor = '#b91c1c';
      alert(`[N-1 Contingency Simulation] Transformer Bay ${xfmrId} simulated trip. Load automatically redistributed across remaining parallel ICT bays in PIN ${pincode} without power outage.`);
    }
  }
};


// Close search dropdown if user clicks outside
document.addEventListener('click', (e) => {
  const wrapper = document.querySelector('.map-search-bar-wrapper');
  const dropdown = document.getElementById('mapSearchDropdown');
  if (dropdown && wrapper && !wrapper.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// Handle keyboard Escape to dismiss search dropdown
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dropdown = document.getElementById('mapSearchDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }
});


/**
 * GRIDSEC Indian National Power Grid Leaflet Engine
 * Real Map & High-Resolution Satellite View with PINPOINTED Indian states, power plants, substations,
 * and bulk HVDC / 765kV / 400kV transmission corridors.
 * 
 * Features Multi-Tier Hierarchical Search:
 * - State Level (28 States / UTs)
 * - District Level (35+ Industrial / Power Districts)
 * - Substation & Power Plant Level (UHVDC, 765kV Super Pooling, Nuclear, Hydro, Solar, Thermal)
 * - Transformer Level (ICTs, Converter XFMRs, Generator Transformers GT, Distribution XFMRs)
 */

class IndiaMapVisualizer {
  constructor(containerId, gridData, onSelectNodeCallback, onSelectTransformerCallback, onTraceOperatorCallback, onSelectBranchCallback) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.data = gridData;

    // Merge GRID_DATA nodes and edges if available so all routing engine nodes exist on map
    if (window.GRID_DATA && window.GRID_DATA.nodes) {
      if (!this.data.nodes) this.data.nodes = [];
      const existingNodeIds = new Set(this.data.nodes.map(n => n.id));
      window.GRID_DATA.nodes.forEach(gn => {
        if (!existingNodeIds.has(gn.id)) {
          this.data.nodes.push({ ...gn });
          existingNodeIds.add(gn.id);
        }
      });
    }
    if (window.GRID_DATA && window.GRID_DATA.edges) {
      if (!this.data.corridors) this.data.corridors = [];
      const existingCorridorKeys = new Set(this.data.corridors.map(c => `${c.from}-${c.to}`));
      window.GRID_DATA.edges.forEach(ge => {
        const key1 = `${ge.from}-${ge.to}`;
        const key2 = `${ge.to}-${ge.from}`;
        if (!existingCorridorKeys.has(key1) && !existingCorridorKeys.has(key2)) {
          this.data.corridors.push({
            id: `EDGE-${ge.from}-${ge.to}`,
            from: ge.from,
            to: ge.to,
            name: `${ge.from} ↔ ${ge.to} Transmission Path`,
            type: '400kV_AC',
            voltage: '400kV',
            distanceKm: ge.distanceKm || 30,
            currentFlowMW: ge.maxLoadMW ? Math.round(ge.maxLoadMW * 0.7) : 400,
            status: ge.status || 'active'
          });
          existingCorridorKeys.add(key1);
        }
      });
    }

    this.onSelectNode = onSelectNodeCallback || (() => {});
    this.onSelectTransformer = onSelectTransformerCallback || (() => {});
    this.onTraceOperator = onTraceOperatorCallback || (() => {});
    this.onSelectBranch = onSelectBranchCallback || (() => {});

    this.map = null;
    this.baseLayers = {};
    this.activeBaseLayer = null;
    this.currentBaseLayerType = 'clean'; // 'clean' | 'satellite' | 'osm' | 'schematic'
    this.selectedBranchId = null;

    this.nodeMarkers = [];
    this.corridorLines = [];
    this.highlightRing = null;
    this.highlightLayerGroup = null;
    this.selectedNodeId = 'WR-RAIGARH';
    this.selectedTransformerId = null;
    this.activeTracedOperatorId = null; // null | 'PGCIL' | 'ADANI' | ...
    this.filterRegion = 'all';
    this.filterCorridor = 'all';
    this.filterFacility = 'all';

    // Build Fast Search Index
    this.searchIndex = [];
    this.buildSearchIndex();

    this.initLeafletMap();
  }

  buildSearchIndex() {
    this.searchIndex = [];
    if (!this.data) return;

    // 1. Index Energy Firms / Operators (Central CPSUs, Private Giants, State Transcos)
    if (this.data.operators) {
      this.data.operators.forEach(op => {
        this.searchIndex.push({
          id: `OP-${op.id}`,
          operatorId: op.id,
          name: `${op.name} (${op.shortName})`,
          displayName: `${op.shortName} · ${op.firmType}`,
          category: 'operator',
          categoryLabel: 'Energy Firm',
          firmType: op.firmType,
          hq: op.hq,
          color: op.color,
          badgeClass: op.badgeClass,
          raw: op
        });
      });
    }

    // 2. Index States & State Pincodes
    if (this.data.states) {
      this.data.states.forEach(st => {
        this.searchIndex.push({
          id: st.id || st.name,
          name: st.name,
          displayName: st.name,
          category: 'state',
          categoryLabel: 'State',
          state: st.state || st.name,
          region: st.region,
          lat: st.lat,
          lon: st.lon,
          zoom: 7,
          raw: st
        });

        // Index State Pincodes
        if (st.pincodes) {
          st.pincodes.forEach(pin => {
            this.searchIndex.push({
              id: `PIN-${pin}`,
              name: `PIN ${pin} (${st.state})`,
              displayName: `PIN ${pin} · ${st.state}`,
              category: 'pincode',
              categoryLabel: `PIN ${pin}`,
              pincode: pin,
              state: st.state,
              region: st.region,
              lat: st.lat,
              lon: st.lon,
              zoom: 8,
              raw: st
            });
          });
        }
      });
    }

    // 3. Index Nodes (Substations, Power Plants, Terminals), Pincodes & Districts
    if (this.data.nodes) {
      const districtsSeen = new Set();

      this.data.nodes.forEach(n => {
        // Index Specific Station Pincode
        if (n.pincode) {
          this.searchIndex.push({
            id: `PIN-${n.pincode}`,
            name: `PIN ${n.pincode} (${n.city || n.name})`,
            displayName: `PIN ${n.pincode} · ${n.postalOffice || n.city} (${n.state})`,
            category: 'pincode',
            categoryLabel: `PIN ${n.pincode}`,
            pincode: n.pincode,
            postalOffice: n.postalOffice,
            city: n.city,
            district: n.district,
            state: n.state,
            region: n.region,
            substationId: n.id,
            substationName: n.name,
            lat: n.lat,
            lon: n.lon,
            zoom: 11,
            parentNodeId: n.id,
            raw: n
          });
        }

        // Index District if not already indexed
        if (n.district && !districtsSeen.has(n.district)) {
          districtsSeen.add(n.district);
          this.searchIndex.push({
            id: `DIST-${n.district}`,
            name: `${n.district} District`,
            displayName: `${n.district} (${n.state})`,
            category: 'district',
            categoryLabel: 'District',
            district: n.district,
            state: n.state,
            region: n.region,
            pincode: n.pincode,
            lat: n.lat,
            lon: n.lon,
            zoom: 9,
            parentNodeId: n.id,
            raw: n
          });
        }

        // Index Substation / Plant
        const xfmrCount = n.transformers ? n.transformers.length : 0;
        this.searchIndex.push({
          id: n.id,
          name: n.name,
          displayName: `${n.name} [${n.voltage}] · PIN ${n.pincode || 'N/A'}`,
          category: 'station',
          categoryLabel: n.type.toUpperCase().replace('_', ' '),
          city: n.city,
          district: n.district,
          state: n.state,
          pincode: n.pincode,
          postalOffice: n.postalOffice,
          region: n.region,
          operator: n.operator,
          operatorId: n.operatorId,
          voltage: n.voltage,
          capacityMW: n.capacityMW,
          transformerCount: xfmrCount,
          lat: n.lat,
          lon: n.lon,
          zoom: 11,
          raw: n
        });

        // 4. Index Transformer Level
        if (n.transformers) {
          n.transformers.forEach(t => {
            this.searchIndex.push({
              id: t.id,
              name: t.name,
              displayName: `${t.name} @ ${n.city || n.name} (PIN ${n.pincode || 'N/A'})`,
              category: 'transformer',
              categoryLabel: `Transformer (${t.type})`,
              substationId: n.id,
              substationName: n.name,
              city: n.city,
              district: n.district,
              state: n.state,
              pincode: n.pincode,
              region: n.region,
              ratingMVA: t.ratingMVA,
              primaryKV: t.primaryKV,
              secondaryKV: t.secondaryKV,
              lat: n.lat,
              lon: n.lon,
              zoom: 12,
              parentNode: n,
              raw: t
            });
          });
        }
      });
    }
  }

  search(query, categoryFilter = 'all') {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase().trim();

    return this.searchIndex.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      const matchName = item.name.toLowerCase().includes(q);
      const matchDisplay = item.displayName.toLowerCase().includes(q);
      const matchState = item.state && item.state.toLowerCase().includes(q);
      const matchDistrict = item.district && item.district.toLowerCase().includes(q);
      const matchCity = item.city && item.city.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchPincode = item.pincode && item.pincode.toString().includes(q);
      const matchPostal = item.postalOffice && item.postalOffice.toLowerCase().includes(q);
      const matchOperator = (item.operator && item.operator.toLowerCase().includes(q)) || (item.operatorId && item.operatorId.toLowerCase().includes(q)) || (item.firmType && item.firmType.toLowerCase().includes(q));
      return matchName || matchDisplay || matchState || matchDistrict || matchCity || matchId || matchPincode || matchPostal || matchOperator;
    }).slice(0, 14);
  }

  selectSearchResult(item) {
    if (!item || !this.map) return;

    // Handle Energy Firm / Operator selection
    if (item.category === 'operator') {
      this.traceOperatorTransmission(item.operatorId || item.raw?.id);
      return;
    }

    // Smooth flyTo target location with custom zoom
    this.map.flyTo([item.lat, item.lon], item.zoom || 10, {
      duration: 1.2,
      easeLinearity: 0.25
    });

    // Handle Substation / Pincode / Transformer selection
    if (item.category === 'pincode') {
      this.highlightPincodeTransformers(item.pincode);
    } else if (item.category === 'station' || item.category === 'district') {
      const node = item.raw && item.raw.transformers ? item.raw : (this.data.nodes.find(n => n.id === item.id || n.id === item.parentNodeId || n.id === item.substationId));
      if (node) {
        this.selectedNodeId = node.id;
        this.selectedTransformerId = null;
        this.renderNodes();
        this.onSelectNode(node);
        this.drawFocusRing(node.lat, node.lon);
      } else {
        this.drawFocusRing(item.lat, item.lon);
      }
    } else if (item.category === 'transformer') {
      const parentNode = item.parentNode || this.data.nodes.find(n => n.id === item.substationId);
      if (parentNode) {
        this.selectedNodeId = parentNode.id;
        this.selectedTransformerId = item.id;
        this.renderNodes();
        this.onSelectNode(parentNode);
        this.onSelectTransformer(item.raw, parentNode);
        this.drawFocusRing(parentNode.lat, parentNode.lon);
      }
    } else if (item.category === 'state') {
      // Zoom to state and filter region
      this.filterByRegion(item.region);
      this.drawFocusRing(item.lat, item.lon);
    }
  }

  highlightPincodeTransformers(pincode) {
    if (!pincode || !this.map) return;
    const pinStr = pincode.toString().trim();

    // Clear any previous pincode highlight layers
    this.clearPincodeHighlight();

    // 1. Locate all matching substations/nodes in this pincode
    const matchedNodes = (this.data.nodes || []).filter(n => n.pincode && n.pincode.toString() === pinStr);
    if (matchedNodes.length === 0) return;

    const primaryNode = matchedNodes[0];
    this.selectedNodeId = primaryNode.id;
    this.activePincodeHighlight = pinStr;

    // Smoothly zoom in to the substation transformer yard
    this.map.flyTo([primaryNode.lat, primaryNode.lon], 12, {
      duration: 1.4,
      easeLinearity: 0.25
    });

    // Create Leaflet layer group for pincode visual overlays
    this.pincodeLayerGroup = L.layerGroup().addTo(this.map);

    // A. Draw Outer Geographic Pulsing Radar Circle
    const radarCircle = L.circle([primaryNode.lat, primaryNode.lon], {
      radius: 4200,
      color: '#d97706',
      weight: 2,
      fillColor: '#fef3c7',
      fillOpacity: 0.22,
      dashArray: '6, 6',
      className: 'pincode-radar-pulse'
    }).addTo(this.pincodeLayerGroup);

    // B. Draw Substation Geographic Boundary Ring
    const innerRing = L.circle([primaryNode.lat, primaryNode.lon], {
      radius: 1200,
      color: '#166534',
      weight: 3,
      fillColor: '#dcfce7',
      fillOpacity: 0.35
    }).addTo(this.pincodeLayerGroup);

    // C. Render Individual Transformer Bay Marker Tags around the Substation Yard
    const xfmrs = primaryNode.transformers || [];
    const totalXfmrs = xfmrs.length;
    const yardRadiusDeg = 0.012; // Spread around center

    xfmrs.forEach((xfmr, idx) => {
      const angle = (idx / (totalXfmrs || 1)) * 2 * Math.PI - Math.PI / 2;
      const xfmrLat = primaryNode.lat + yardRadiusDeg * Math.sin(angle);
      const xfmrLon = primaryNode.lon + yardRadiusDeg * Math.cos(angle);

      const loadPct = xfmr.loadPercent || 75;
      const loadColor = loadPct > 85 ? '#b91c1c' : (loadPct > 70 ? '#d97706' : '#166534');

      const xfmrIcon = L.divIcon({
        className: 'pincode-xfmr-marker-icon',
        html: `
          <div class="xfmr-map-bubble" style="border-color:${loadColor};" onclick="window.MapView.highlightTransformerFromMap('${xfmr.id}', '${primaryNode.id}')">
            <div class="xfmr-map-bubble-header">
              <i class="fa-solid fa-car-battery" style="color:${loadColor};"></i>
              <span>${xfmr.name.split(' ')[0]}</span>
            </div>
            <div class="xfmr-map-bubble-body">
              <strong>${xfmr.ratingMVA} MVA</strong> · ${xfmr.primaryKV}/${xfmr.secondaryKV}kV
              <div class="xfmr-map-load-bar">
                <div class="xfmr-map-load-fill" style="width:${loadPct}%; background:${loadColor};"></div>
              </div>
            </div>
          </div>
        `,
        iconSize: [110, 48],
        iconAnchor: [55, 24]
      });

      const xfmrMarker = L.marker([xfmrLat, xfmrLon], { icon: xfmrIcon }).addTo(this.pincodeLayerGroup);

      // Connecting line from center station to transformer bay
      L.polyline([[primaryNode.lat, primaryNode.lon], [xfmrLat, xfmrLon]], {
        color: loadColor,
        weight: 1.5,
        dashArray: '3, 3'
      }).addTo(this.pincodeLayerGroup);
    });

    // D. Highlight Inflow & Outflow Transmission Corridors
    const connectedNodeIds = new Set(matchedNodes.map(n => n.id));
    this.corridorLines.forEach(({ line, corridor }) => {
      const isInflow = connectedNodeIds.has(corridor.to);
      const isOutflow = connectedNodeIds.has(corridor.from);

      if (isInflow) {
        line.setStyle({
          color: '#d97706', // Golden Amber for Inflow
          weight: 4.5,
          opacity: 1,
          dashArray: '8, 8'
        });
        line.bringToFront();
      } else if (isOutflow) {
        line.setStyle({
          color: '#166534', // Forest Green for Outflow
          weight: 4.5,
          opacity: 1,
          dashArray: '8, 8'
        });
        line.bringToFront();
      } else {
        line.setStyle({
          opacity: 0.15,
          weight: 1.5
        });
      }
    });

    this.renderNodes();
    this.onSelectNode(primaryNode);

    // Trigger Pincode Power Transfer Inspector UI
    if (window.MapView && window.MapView.showPincodePowerTransferModal) {
      window.MapView.showPincodePowerTransferModal(pinStr, primaryNode);
    }
  }

  clearPincodeHighlight() {
    this.activePincodeHighlight = null;
    if (this.pincodeLayerGroup) {
      this.map.removeLayer(this.pincodeLayerGroup);
      this.pincodeLayerGroup = null;
    }
    this.renderCorridors();
    this.renderNodes();
  }


  traceOperatorTransmission(operatorId) {
    if (!operatorId || operatorId === 'all') {
      this.clearOperatorTrace();
      return;
    }

    this.activeTracedOperatorId = operatorId;
    const op = this.data.operators ? this.data.operators.find(o => o.id === operatorId) : null;

    // Filter matching nodes
    const matchedNodes = (this.data.nodes || []).filter(n => 
      n.operatorId === operatorId || (n.operatorIds && n.operatorIds.includes(operatorId))
    );

    // Filter matching corridors
    const matchedNodeIds = new Set(matchedNodes.map(n => n.id));
    const matchedCorridors = (this.data.corridors || []).filter(c => 
      c.operatorId === operatorId || (c.operatorIds && c.operatorIds.includes(operatorId)) ||
      (matchedNodeIds.has(c.from) && matchedNodeIds.has(c.to)) ||
      (matchedNodeIds.has(c.from) || matchedNodeIds.has(c.to))
    );

    // Auto-fit bounds to operator network footprint
    if (matchedNodes.length > 0 && this.map) {
      const latLngs = matchedNodes.map(n => [n.lat, n.lon]);
      const bounds = L.latLngBounds(latLngs);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }

    this.renderCorridors();
    this.renderNodes();

    if (this.onTraceOperator && op) {
      this.onTraceOperator(op, matchedNodes, matchedCorridors);
    }
  }

  clearOperatorTrace() {
    this.activeTracedOperatorId = null;
    this.renderCorridors();
    this.renderNodes();
    if (this.onTraceOperator) {
      this.onTraceOperator(null, [], []);
    }
  }

  drawFocusRing(lat, lon) {
    if (this.highlightRing && this.map) {
      this.map.removeLayer(this.highlightRing);
    }

    this.highlightRing = L.circle([lat, lon], {
      radius: 45000,
      color: '#166534',
      weight: 2,
      opacity: 0.85,
      fillColor: '#bbf7d0',
      fillOpacity: 0.18,
      dashArray: '6, 6'
    }).addTo(this.map);

    setTimeout(() => {
      if (this.highlightRing && this.map) {
        this.map.removeLayer(this.highlightRing);
        this.highlightRing = null;
      }
    }, 6000);
  }

  initLeafletMap() {
    if (!this.container || !window.L) return;

    // Clean any prior Leaflet instance
    if (this.container._leaflet_id) {
      this.container._leaflet_id = null;
    }
    this.container.innerHTML = '';

    // Create Leaflet map centered on geographic center of India
    this.map = L.map(this.containerId, {
      center: [22.8, 82.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    // Fit India geographic bounds smoothly to screen size
    this.map.fitBounds([
      [7.5, 68.0],
      [36.5, 97.5]
    ], { padding: [20, 20], maxZoom: 6 });

    const transparentTile = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // 1. Clean OpenStreetMap Standard (Zero watermark, fully open, reliable)
    this.baseLayers.clean = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      errorTileUrl: transparentTile,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // 2. Real Photographic High-Resolution Satellite View Layer (Esri World Imagery)
    this.baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      errorTileUrl: transparentTile,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    });

    // 3. Clean Esri Topography Layer
    this.baseLayers.osm = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      errorTileUrl: transparentTile,
      attribution: '&copy; Esri, HERE, Garmin, USGS'
    });

    // 4. Clean Local Offline Schematic Technical Grid (Zero external HTTP dependencies)
    this.baseLayers.schematic = L.tileLayer('', {
      maxZoom: 18,
      errorTileUrl: transparentTile,
      attribution: 'GRIDSEC Local Schematic Vector Grid'
    });

    // Graceful error handler to switch to local schematic pattern if tiles fail
    const handleTileError = () => {
      if (this.container) {
        this.container.classList.add('schematic-fallback-active');
      }
    };
    this.baseLayers.clean.on('tileerror', handleTileError);
    this.baseLayers.satellite.on('tileerror', handleTileError);
    this.baseLayers.osm.on('tileerror', handleTileError);

    // Infrastructure state registry for consistent visual conventions
    this.infrastructureStates = {};

    // Add default layer
    this.setBaseLayer('clean');

    // Add Attribution in small clean footer
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; Grid-India / CEA &middot; OpenStreetMap &middot; Esri')
      .addTo(this.map);

    // Initial network fitting
    this.fitNetwork();

    // Render Data Layers
    this.renderCorridors();
    this.renderNodes();
    this.startFlowAnimation();

    // Invalidate size once mounted in DOM
    [50, 150, 350, 700, 1200].forEach(delay => {
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, delay);
    });

    window.addEventListener('resize', () => {
      if (this.map) this.map.invalidateSize();
    });
  }

  fitNetwork() {
    if (!this.map || !this.data || !this.data.nodes || this.data.nodes.length === 0) return;
    const lats = this.data.nodes.map(n => Number(n.lat)).filter(l => !isNaN(l) && l !== 0);
    const lons = this.data.nodes.map(n => Number(n.lon)).filter(l => !isNaN(l) && l !== 0);
    if (lats.length === 0 || lons.length === 0) return;
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const padLat = Math.max(0.4, (maxLat - minLat) * 0.08);
    const padLon = Math.max(0.4, (maxLon - minLon) * 0.08);
    this.map.fitBounds([
      [minLat - padLat, minLon - padLon],
      [maxLat + padLat, maxLon + padLon]
    ], { padding: [25, 25], maxZoom: 10 });
  }

  resetView() {
    this.fitNetwork();
  }

  zoomIn() {
    if (this.map) this.map.zoomIn();
  }

  zoomOut() {
    if (this.map) this.map.zoomOut();
  }

  setNetwork(networkId) {
    const isIEEE = networkId === 'IEEE_30';
    this.data = isIEEE ? (window.IEEE_30_DATA || this.data) : (window.INDIA_GRID_DATA || this.data);
    this.selectedNodeId = isIEEE ? 'BUS-1' : 'WR-RAIGARH';
    this.selectedTransformerId = null;
    this.infrastructureStates = {};
    
    this.buildSearchIndex();
    this.renderCorridors();
    this.renderNodes();
    this.fitNetwork();
  }

  setInfrastructureState(targetId, state, metadata = {}) {
    if (!this.infrastructureStates) this.infrastructureStates = {};
    if (state === 'normal') {
      delete this.infrastructureStates[targetId];
    } else {
      this.infrastructureStates[targetId] = { state, ...metadata };
    }
    this.applyInfrastructureStyles();
  }

  resetInfrastructureStates() {
    this.infrastructureStates = {};
    this.applyInfrastructureStyles();
  }

  applyInfrastructureStyles() {
    if (!this.map) return;
    const states = this.infrastructureStates || {};

    // 1. Corridors
    this.corridorLines.forEach(({ line, corridor }) => {
      const c = corridor;
      const targetKeys = [c.id, `EDGE-${c.from}-${c.to}`, `EDGE-${c.to}-${c.from}`, `${c.from}-${c.to}`, `${c.to}-${c.from}`];
      let stateEntry = null;
      for (const k of targetKeys) {
        if (states[k]) {
          stateEntry = states[k];
          break;
        }
      }

      if (stateEntry) {
        const s = stateEntry.state;
        if (s === 'tripped') {
          line.setStyle({ color: '#dc2626', weight: 4.5, opacity: 0.95, dashArray: '8, 6' });
        } else if (s === 'overloaded') {
          line.setStyle({ color: '#be123c', weight: 5, opacity: 1.0, dashArray: '4, 4' });
        } else if (s === 'attacked') {
          line.setStyle({ color: '#ea580c', weight: 4, opacity: 1.0, dashArray: null });
        } else if (s === 'selected') {
          line.setStyle({ color: '#0284c7', weight: 4.5, opacity: 1.0, dashArray: null });
        } else if (s === 'restored') {
          line.setStyle({ color: '#16a34a', weight: 4.5, opacity: 1.0, dashArray: null });
        } else if (s === 'bridge') {
          line.setStyle({ color: '#f59e0b', weight: 5.0, opacity: 1.0, dashArray: '6, 6' });
        } else if (s === 'highlighted_path') {
          line.setStyle({ color: '#06b6d4', weight: 5.5, opacity: 1.0, dashArray: null });
        } else if (s === 'bfs_frontier' || s === 'dfs_visited') {
          line.setStyle({ color: '#9333ea', weight: 4.5, opacity: 0.9, dashArray: null });
        }
      } else if (line._defaultStyle) {
        line.setStyle(line._defaultStyle);
      }
    });

    // 2. Nodes
    this.nodeMarkers.forEach(({ marker, node }) => {
      const n = node;
      const stateEntry = states[n.id];
      if (stateEntry) {
        const s = stateEntry.state;
        if (s === 'attacked') {
          marker.setStyle({ fillColor: '#ffedd5', color: '#ea580c', weight: 3.5, radius: 11, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'tripped') {
          marker.setStyle({ fillColor: '#fee2e2', color: '#dc2626', weight: 3.5, radius: 10, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'overloaded') {
          marker.setStyle({ fillColor: '#ffe4e6', color: '#be123c', weight: 4.0, radius: 12, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'selected') {
          marker.setStyle({ fillColor: '#e0f2fe', color: '#0284c7', weight: 3.5, radius: 11, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'restored') {
          marker.setStyle({ fillColor: '#dcfce7', color: '#16a34a', weight: 3.5, radius: 11, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'bridge' || s === 'articulation_point') {
          marker.setStyle({ fillColor: '#fef3c7', color: '#d97706', weight: 4.0, radius: 12, fillOpacity: 1.0, opacity: 1.0 });
        } else if (s === 'bfs_visited' || s === 'dfs_visited') {
          marker.setStyle({ fillColor: '#f3e8ff', color: '#9333ea', weight: 3.5, radius: 11, fillOpacity: 1.0, opacity: 1.0 });
        }
      } else if (marker._defaultStyle) {
        marker.setStyle(marker._defaultStyle);
      }
    });
  }

  setBaseLayer(type) {
    if (!this.map) return;

    if (this.activeBaseLayer) {
      this.map.removeLayer(this.activeBaseLayer);
      this.activeBaseLayer = null;
    }

    if (type === 'schematic') {
      this.currentBaseLayerType = 'schematic';
      if (this.container) this.container.classList.add('schematic-mode-active');
    } else if (this.baseLayers[type]) {
      if (this.container) this.container.classList.remove('schematic-mode-active');
      this.activeBaseLayer = this.baseLayers[type];
      this.activeBaseLayer.addTo(this.map);
      this.currentBaseLayerType = type;
    }

    // Adjust corridor styling based on satellite vs light map
    this.updateLayerStyles();
  }

  updateLayerStyles() {
    this.applyInfrastructureStyles();
  }

  renderCorridors() {
    // Clear old lines and invisible hit areas
    this.corridorLines.forEach(({ line, hitLine }) => {
      if (line && this.map) this.map.removeLayer(line);
      if (hitLine && this.map) this.map.removeLayer(hitLine);
    });
    this.corridorLines = [];

    if (!this.data || !this.data.corridors) return;

    const isOperatorTraced = !!this.activeTracedOperatorId;
    const activeOp = isOperatorTraced && this.data.operators ? this.data.operators.find(o => o.id === this.activeTracedOperatorId) : null;
    const opColor = activeOp ? activeOp.color : '#166534';

    this.data.corridors.forEach(c => {
      if (this.filterCorridor !== 'all' && c.type !== this.filterCorridor) return;

      const fromNode = this.data.nodes.find(n => n.id === c.from);
      const toNode = this.data.nodes.find(n => n.id === c.to);
      if (!fromNode || !toNode) return;

      if (!isOperatorTraced && this.filterRegion !== 'all' && fromNode.region !== this.filterRegion && toNode.region !== this.filterRegion) {
        return;
      }

      // Check if corridor belongs to active traced operator
      const isCorridorTraced = isOperatorTraced && (
        c.operatorId === this.activeTracedOperatorId ||
        (c.operatorIds && c.operatorIds.includes(this.activeTracedOperatorId)) ||
        (fromNode.operatorId === this.activeTracedOperatorId || (fromNode.operatorIds && fromNode.operatorIds.includes(this.activeTracedOperatorId))) ||
        (toNode.operatorId === this.activeTracedOperatorId || (toNode.operatorIds && toNode.operatorIds.includes(this.activeTracedOperatorId)))
      );

      const isCompromised = c.status === 'compromised' || c.status === 'tripped' || c.status === 'OUT_OF_SERVICE';
      const isHVDC = c.type === 'HVDC';
      const is765 = c.type === '765kV_AC';
      const isSat = this.currentBaseLayerType === 'satellite';

      let strokeColor = '#1c1917';
      let strokeWidth = 3;
      let opacity = 0.88;
      let dashArray = null;

      if (isOperatorTraced) {
        if (isCorridorTraced) {
          strokeColor = opColor;
          strokeWidth = 4.5;
          opacity = 1.0;
          dashArray = '8, 8';
        } else {
          // Dim non-traced lines
          strokeColor = isSat ? '#52525b' : '#d6d3d1';
          strokeWidth = 1.2;
          opacity = 0.18;
          dashArray = '4, 4';
        }
      } else {
        if (isCompromised) {
          strokeColor = '#ef4444';
          strokeWidth = 3.5;
          dashArray = '8, 6';
        } else if (isHVDC) {
          strokeColor = isSat ? '#22c55e' : '#1c1917';
          strokeWidth = isSat ? 4.5 : 3.5;
        } else if (is765) {
          strokeColor = isSat ? '#38bdf8' : '#78716c';
          strokeWidth = 2.5;
        } else {
          strokeColor = isSat ? '#fcd34d' : '#a8a29e';
          strokeWidth = 1.8;
          dashArray = '6, 6';
        }
      }

      const polyline = L.polyline([[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]], {
        color: strokeColor,
        weight: strokeWidth,
        opacity: opacity,
        dashArray: dashArray,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'grid-corridor-path'
      }).addTo(this.map);
      polyline._defaultStyle = { color: strokeColor, weight: strokeWidth, opacity: opacity, dashArray: dashArray };

      // Wide invisible hit area (18px) for effortless clicking on thin branches
      const hitLine = L.polyline([[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]], {
        color: '#0284c7',
        weight: 18,
        opacity: 0,
        interactive: true,
        className: 'grid-corridor-hitarea'
      }).addTo(this.map);

      // Tooltip on corridor line
      const opBadge = isCorridorTraced && activeOp ? `<span style="background:${activeOp.color}; color:#fff; padding:1px 5px; border-radius:3px; font-size:9px; font-weight:700;">${activeOp.shortName}</span>` : '';
      const tooltipHtml = `
        <div style="font-family:Inter,sans-serif; padding:4px; max-width:260px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:2px;">
            <strong style="color:#0284c7; font-size:11.5px;"><i class="fa-solid fa-bolt"></i> ${c.id}</strong>
            <span style="font-size:9px; background:#f0fdf4; color:#166534; padding:1px 4px; border-radius:3px; font-weight:700;">${c.type || 'Line'}</span>
            ${opBadge}
          </div>
          <div style="font-weight:700; color:#1c1917; font-size:11px;">${c.name || `${c.from} ↔ ${c.to}`}</div>
          <div style="font-size:10px; color:#57534e; margin-top:2px;">
            ${c.voltage || '400kV'} &middot; Flow: <strong style="color:#166534;">${c.currentFlowMW || 0} MW</strong> (${c.distanceKm || 0} km)
          </div>
          <div style="font-size:9.5px; color:#0284c7; font-weight:600; margin-top:3px; display:flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-arrow-pointer"></i> Click to inspect &amp; analyze branch
          </div>
        </div>
      `;
      polyline.bindTooltip(tooltipHtml, { sticky: true, className: 'grid-corridor-tooltip' });
      hitLine.bindTooltip(tooltipHtml, { sticky: true, className: 'grid-corridor-tooltip' });

      // Interactive Click & Hover Handlers
      const selectBranchHandler = (e) => {
        if (e && e.originalEvent) {
          L.DomEvent.stopPropagation(e);
        }
        this.selectedBranchId = c.id;
        this.resetInfrastructureStates();
        this.setInfrastructureState(c.id, 'selected');

        if (this.onSelectBranch) {
          this.onSelectBranch(c);
        }
        if (window.NetworkAnalysisView && typeof window.NetworkAnalysisView.onSelectBranchFromMap === 'function') {
          window.NetworkAnalysisView.onSelectBranchFromMap(c);
        }
        if (window.SimulatorView && typeof window.SimulatorView.selectTargetFromMap === 'function') {
          window.SimulatorView.selectTargetFromMap(c.id);
        }
      };

      polyline.on('click', selectBranchHandler);
      hitLine.on('click', selectBranchHandler);

      // Subtle hover feedback
      hitLine.on('mouseover', () => {
        if (!this.infrastructureStates || !this.infrastructureStates[c.id]) {
          polyline.setStyle({ weight: strokeWidth + 2.5, opacity: 1.0 });
        }
      });
      hitLine.on('mouseout', () => {
        if (!this.infrastructureStates || !this.infrastructureStates[c.id]) {
          polyline.setStyle(polyline._defaultStyle);
        }
      });

      this.corridorLines.push({ line: polyline, hitLine, corridor: c, fromNode, toNode, isCorridorTraced });
    });
    this.applyInfrastructureStyles();
  }

  renderNodes() {
    // Clear old node markers
    this.nodeMarkers.forEach(({ marker }) => this.map.removeLayer(marker));
    this.nodeMarkers = [];

    if (!this.data || !this.data.nodes) return;

    const isOperatorTraced = !!this.activeTracedOperatorId;
    const activeOp = isOperatorTraced && this.data.operators ? this.data.operators.find(o => o.id === this.activeTracedOperatorId) : null;
    const opColor = activeOp ? activeOp.color : '#166534';

    this.data.nodes.forEach(n => {
      if (!isOperatorTraced && this.filterRegion !== 'all' && n.region !== this.filterRegion) return;
      if (!isOperatorTraced && this.filterFacility && this.filterFacility !== 'all') {
        if (!n.type.includes(this.filterFacility)) return;
      }

      const isNodeTraced = isOperatorTraced && (
        n.operatorId === this.activeTracedOperatorId ||
        (n.operatorIds && n.operatorIds.includes(this.activeTracedOperatorId))
      );

      const isSelected = n.id === this.selectedNodeId;
      const isCompromised = n.status === 'compromised';
      const isSuspicious = n.status === 'suspicious';
      const isHVDC = n.type.includes('hvdc');
      const isNuclear = n.type.includes('nuclear');
      const isThermal = n.type.includes('thermal');
      const isSolar = n.type.includes('solar');
      const isHydro = n.type.includes('hydro');

      let fillColor = '#ffffff';
      let strokeColor = '#1c1917';
      let radius = 7.5;
      let opacity = 1;
      let fillOpacity = 0.95;
      let facilityIcon = 'fa-bolt';

      if (isOperatorTraced) {
        if (isNodeTraced) {
          fillColor = activeOp?.bgLight || '#f0fdf4';
          strokeColor = opColor;
          radius = 10.5;
          opacity = 1;
          fillOpacity = 1;
        } else {
          // Dim non-traced nodes
          fillColor = '#e7e5e4';
          strokeColor = '#a8a29e';
          radius = 5.5;
          opacity = 0.25;
          fillOpacity = 0.18;
        }
      } else {
        if (isCompromised) {
          fillColor = '#fee2e2';
          strokeColor = '#b91c1c';
          radius = 10;
          facilityIcon = 'fa-triangle-exclamation';
        } else if (isSuspicious) {
          fillColor = '#fef3c7';
          strokeColor = '#b45309';
          radius = 9;
          facilityIcon = 'fa-shield-halved';
        } else if (isHVDC) {
          fillColor = '#1c1917';
          strokeColor = '#1c1917';
          radius = 10;
          facilityIcon = 'fa-bolt-lightning';
        } else if (isNuclear) {
          fillColor = '#dcfce7';
          strokeColor = '#15803d';
          radius = 9.5;
          facilityIcon = 'fa-atom';
        } else if (isThermal) {
          fillColor = '#ffedd5';
          strokeColor = '#c2410c';
          radius = 9.5;
          facilityIcon = 'fa-fire-flame-curved';
        } else if (isSolar) {
          fillColor = '#fef3c7';
          strokeColor = '#d97706';
          radius = 9;
          facilityIcon = 'fa-sun';
        } else if (isHydro) {
          fillColor = '#ccfbf1';
          strokeColor = '#0d9488';
          radius = 9;
          facilityIcon = 'fa-water';
        } else {
          fillColor = '#f5f5f4';
          strokeColor = '#44403c';
          radius = 8.5;
          facilityIcon = 'fa-network-wired';
        }
      }

      // Leaflet Circle Marker with clear visual styling
      const circleMarker = L.circleMarker([n.lat, n.lon], {
        radius: isSelected ? radius + 4 : radius,
        fillColor: fillColor,
        color: isSelected ? '#166534' : strokeColor,
        weight: isSelected ? 3.5 : (isNodeTraced ? 3 : 2),
        opacity: opacity,
        fillOpacity: fillOpacity
      }).addTo(this.map);
      circleMarker._defaultStyle = {
        radius: isSelected ? radius + 4 : radius,
        fillColor: fillColor,
        color: isSelected ? '#166534' : strokeColor,
        weight: isSelected ? 3.5 : (isNodeTraced ? 3 : 2),
        opacity: opacity,
        fillOpacity: fillOpacity
      };

      // Label Tooltip underneath the node pin
      const labelText = n.city ? n.city.split('/')[0].trim() : n.name.split(' ')[0];
      const opSnippet = isNodeTraced ? `<div style="color:${opColor}; font-weight:700; font-size:9.5px;">${activeOp?.shortName}</div>` : '';
      circleMarker.bindTooltip(`
        <div style="font-family:Inter,sans-serif; text-align:center;">
          <div style="font-weight:700; font-size:11px; color:#1c1917;"><i class="fa-solid ${facilityIcon}"></i> ${labelText}</div>
          ${opSnippet}
          <div style="font-size:9.5px; color:#78716c;">${n.district ? n.district.split('(')[0].trim() + ', ' : ''}${n.state} &middot; ${n.voltage}</div>
        </div>
      `, { permanent: isSelected || isNodeTraced, direction: 'top', offset: [0, -8], className: 'grid-node-label' });

      // Click Event
      circleMarker.on('click', () => {
        this.selectedNodeId = n.id;
        this.selectedTransformerId = null;
        this.resetInfrastructureStates();
        this.setInfrastructureState(n.id, 'selected');
        this.renderNodes();
        this.onSelectNode(n);
        if (window.SimulatorView && typeof window.SimulatorView.selectTargetFromMap === 'function') {
          window.SimulatorView.selectTargetFromMap(n.id);
        }
      });

      this.nodeMarkers.push({ marker: circleMarker, node: n, isNodeTraced });
    });
    this.applyInfrastructureStyles();
  }

  filterByFacility(facilityType) {
    this.filterFacility = facilityType;
    this.renderNodes();
  }

  startFlowAnimation() {
    let offset = 0;
    setInterval(() => {
      offset = (offset + 1) % 100;
      this.corridorLines.forEach(({ line, corridor, isCorridorTraced }) => {
        if (isCorridorTraced || corridor.type === 'HVDC' || corridor.type === '765kV_AC') {
          line.setStyle({ dashArray: `8, 8`, dashOffset: `${-offset * 2}` });
        }
      });
    }, 80);
  }

  filterByRegion(regionId) {
    this.filterRegion = regionId;
    this.renderCorridors();
    this.renderNodes();
  }

  filterByCorridor(corridorType) {
    this.filterCorridor = corridorType;
    this.renderCorridors();
  }

  zoomIn() {
    this.map?.zoomIn();
  }

  zoomOut() {
    this.map?.zoomOut();
  }

  highlightRoute(nodeIds, mode = 'route') {
    console.log('[GRIDSEC Map] Route highlight request received:', nodeIds, 'mode:', mode);

    if (!this.map || !nodeIds || nodeIds.length === 0) return false;

    // Remove previous highlight layer if active
    this.clearHighlight();

    // Map requested node IDs to node objects
    const pathNodes = nodeIds.map(id => this.data.nodes.find(n => n.id === id)).filter(Boolean);

    if (pathNodes.length === 0) {
      console.warn('[GRIDSEC Map] None of the requested route nodes could be located on map:', nodeIds);
      this.showHighlightBanner(`Route calculated successfully, but corresponding map infrastructure (${nodeIds.join(' → ')}) could not be located.`, 'warning');
      return false;
    }

    if (pathNodes.length < nodeIds.length) {
      console.warn(`[GRIDSEC Map] Partial node match: found ${pathNodes.length}/${nodeIds.length} nodes for route`);
    }

    // Create LayerGroup for highlight elements
    this.highlightLayerGroup = L.layerGroup().addTo(this.map);

    const boundsPoints = [];
    const isAttack = mode === 'attack' || mode === 'bridge';
    const primaryColor = isAttack ? '#dc2626' : '#166534';
    const accentColor = isAttack ? '#ef4444' : '#22c55e';

    // Dim standard corridors & nodes while route is highlighted
    this.corridorLines.forEach(({ line }) => line.setStyle({ opacity: 0.15, weight: 1.5 }));
    this.nodeMarkers.forEach(({ marker }) => marker.setStyle({ opacity: 0.3, fillOpacity: 0.2 }));

    // 1. Draw highlighted corridor segments between consecutive path nodes
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const u = pathNodes[i];
      const v = pathNodes[i + 1];
      boundsPoints.push([u.lat, u.lon], [v.lat, v.lon]);

      // Outer glow line
      L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
        color: accentColor,
        weight: 9,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.highlightLayerGroup);

      // Core prominent line
      const routeLine = L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
        color: primaryColor,
        weight: 5,
        opacity: 1.0,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.highlightLayerGroup);

      // Flow animation
      let offset = 0;
      const animTimer = setInterval(() => {
        offset = (offset + 1) % 100;
        if (routeLine && this.highlightLayerGroup) {
          routeLine.setStyle({ dashOffset: `${-offset * 2}` });
        } else {
          clearInterval(animTimer);
        }
      }, 60);
    }

    if (pathNodes.length === 1) {
      boundsPoints.push([pathNodes[0].lat, pathNodes[0].lon]);
    }

    // 2. Render prominent node pins for route nodes
    pathNodes.forEach((n, index) => {
      const isSource = index === 0;
      const isDest = index === pathNodes.length - 1;
      const nodeColor = isSource ? '#2563eb' : (isDest ? '#15803d' : primaryColor);
      const nodeFill = isSource ? '#dbeafe' : (isDest ? '#dcfce7' : '#ffffff');
      const badgeText = isSource ? 'SOURCE' : (isDest ? 'DESTINATION' : `HOP ${index}`);

      // Outer ripple ring
      L.circleMarker([n.lat, n.lon], {
        radius: 18,
        color: nodeColor,
        weight: 2,
        opacity: 0.6,
        fillColor: nodeColor,
        fillOpacity: 0.15
      }).addTo(this.highlightLayerGroup);

      // Core marker pin
      const marker = L.circleMarker([n.lat, n.lon], {
        radius: isSource || isDest ? 12 : 9,
        color: nodeColor,
        weight: 3.5,
        opacity: 1.0,
        fillColor: nodeFill,
        fillOpacity: 1.0
      }).addTo(this.highlightLayerGroup);

      marker.bindTooltip(`
        <div style="font-family:Inter,sans-serif; text-align:center; padding:2px 4px;">
          <div style="font-size:9px; font-weight:800; color:${nodeColor}; letter-spacing:0.05em; text-transform:uppercase;">${badgeText}</div>
          <div style="font-weight:700; font-size:12px; color:#1c1917;">${n.id}</div>
          <div style="font-size:10px; color:#57534e;">${n.name}</div>
        </div>
      `, { permanent: true, direction: 'top', offset: [0, -10], className: 'grid-highlight-tooltip' });
    });

    // 3. Pan and fit bounds smoothly to route
    if (boundsPoints.length > 0) {
      if (boundsPoints.length === 1) {
        this.map.setView(boundsPoints[0], 9, { animate: true });
      } else {
        const bounds = L.latLngBounds(boundsPoints);
        this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
      }
    }

    const routeLabel = pathNodes.map(n => `${n.id} (${n.name.split(' ')[0]})`).join(' → ');
    this.showHighlightBanner(`Highlighted Computed Safe Route: <strong>${routeLabel}</strong>`, 'success');

    return true;
  }

  clearHighlight() {
    if (this.highlightLayerGroup) {
      this.map.removeLayer(this.highlightLayerGroup);
      this.highlightLayerGroup = null;
    }
    this.renderCorridors();
    this.renderNodes();

    const banner = document.getElementById('mapHighlightBanner');
    if (banner) banner.style.display = 'none';
  }

  showHighlightBanner(messageHtml, type = 'info') {
    let banner = document.getElementById('mapHighlightBanner');
    if (!banner) {
      const card = document.querySelector('.map-canvas-card');
      if (!card) return;
      banner = document.createElement('div');
      banner.id = 'mapHighlightBanner';
      banner.className = 'map-highlight-banner';
      card.prepend(banner);
    }

    const isWarn = type === 'warning';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.justifyContent = 'space-between';
    banner.style.background = isWarn ? '#fffbeb' : '#f0fdf4';
    banner.style.color = isWarn ? '#92400e' : '#166534';
    banner.style.borderBottom = `1px solid ${isWarn ? '#fde68a' : '#bbf7d0'}`;
    banner.style.padding = '0.5rem 1rem';
    banner.style.fontSize = '0.82rem';
    banner.style.position = 'absolute';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.zIndex = '500';

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <i class="fa-solid ${isWarn ? 'fa-triangle-exclamation' : 'fa-route'}"></i>
        <span>${messageHtml}</span>
      </div>
      <button onclick="window.app.indiaVisualizer?.clearHighlight()" style="background:none; border:none; cursor:pointer; color:inherit; font-size:0.9rem; padding:0 4px;">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
  }

  highlightResilienceWorkflow(opts = {}) {
    const { activeRoute = [], originalRoute = [], compromisedNodes = [], status = 'REROUTED', bannerText = '' } = opts;
    if (!this.map) return false;

    this.clearHighlight();
    this.highlightLayerGroup = L.layerGroup().addTo(this.map);
    const boundsPoints = [];

    // Dim standard background map
    this.corridorLines.forEach(({ line }) => line.setStyle({ opacity: 0.15, weight: 1.5 }));
    this.nodeMarkers.forEach(({ marker }) => marker.setStyle({ opacity: 0.25, fillOpacity: 0.2 }));

    // 1. Draw Original Disrupted Route in dashed red (if distinct from active route)
    if (originalRoute.length > 1 && originalRoute.join('->') !== activeRoute.join('->')) {
      const origNodes = originalRoute.map(id => this.data.nodes.find(n => n.id === id)).filter(Boolean);
      for (let i = 0; i < origNodes.length - 1; i++) {
        const u = origNodes[i];
        const v = origNodes[i + 1];
        boundsPoints.push([u.lat, u.lon], [v.lat, v.lon]);

        L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
          color: '#b91c1c',
          weight: 3,
          opacity: 0.45,
          dashArray: '4, 6',
          lineCap: 'round'
        }).addTo(this.highlightLayerGroup);
      }
    }

    // 2. Highlight Compromised Nodes with warning ripple & icon badge
    const compList = Array.isArray(compromisedNodes) ? compromisedNodes : Array.from(compromisedNodes || []);
    compList.forEach(cId => {
      const nodeObj = this.data.nodes.find(n => n.id === cId);
      if (nodeObj) {
        boundsPoints.push([nodeObj.lat, nodeObj.lon]);

        L.circleMarker([nodeObj.lat, nodeObj.lon], {
          radius: 22,
          color: '#dc2626',
          weight: 3,
          opacity: 0.9,
          fillColor: '#fef2f2',
          fillOpacity: 0.85
        }).addTo(this.highlightLayerGroup);

        L.circleMarker([nodeObj.lat, nodeObj.lon], {
          radius: 10,
          color: '#b91c1c',
          weight: 4,
          fillColor: '#991b1b',
          fillOpacity: 1.0
        }).addTo(this.highlightLayerGroup);
      }
    });

    // 3. Highlight Active Route in Glowing Green Polyline & Pins
    if (activeRoute.length > 1) {
      const actNodes = activeRoute.map(id => this.data.nodes.find(n => n.id === id)).filter(Boolean);
      for (let i = 0; i < actNodes.length - 1; i++) {
        const u = actNodes[i];
        const v = actNodes[i + 1];
        boundsPoints.push([u.lat, u.lon], [v.lat, v.lon]);

        L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
          color: '#22c55e',
          weight: 8,
          opacity: 0.45,
          lineCap: 'round'
        }).addTo(this.highlightLayerGroup);

        const routeLine = L.polyline([[u.lat, u.lon], [v.lat, v.lon]], {
          color: '#166534',
          weight: 5,
          opacity: 1.0,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(this.highlightLayerGroup);

        let offset = 0;
        const anim = setInterval(() => {
          offset = (offset + 1) % 100;
          if (routeLine && this.highlightLayerGroup) {
            routeLine.setStyle({ dashOffset: String(-offset * 2) });
          } else {
            clearInterval(anim);
          }
        }, 60);
      }

      actNodes.forEach((n, idx) => {
        const isSrc = idx === 0;
        const isDst = idx === actNodes.length - 1;
        const col = isSrc ? '#2563eb' : (isDst ? '#15803d' : '#166534');
        L.circleMarker([n.lat, n.lon], {
          radius: isSrc || isDst ? 12 : 9,
          color: col,
          weight: 3.5,
          fillColor: isSrc ? '#dbeafe' : (isDst ? '#dcfce7' : '#ffffff'),
          fillOpacity: 1.0
        }).addTo(this.highlightLayerGroup);
      });
    }

    if (boundsPoints.length > 0) {
      setTimeout(() => {
        try {
          this.map.fitBounds(boundsPoints, { padding: [40, 40], maxZoom: 9 });
        } catch (e) {}
      }, 80);
    }

    let bText = bannerText;
    if (!bText) {
      if (status === 'REROUTED') {
        bText = '<strong>REROUTED:</strong> New active route bypassing compromised infrastructure.';
      } else if (status === 'NO_ROUTE') {
        bText = '<strong>NO ALTERNATIVE ROUTE:</strong> Source & Destination disconnected.';
      } else {
        const routeStr = Array.isArray(activeRoute) ? activeRoute.join(' → ') : '';
        bText = '<strong>ACTIVE ROUTE:</strong> ' + routeStr;
      }
    }

    this.showHighlightBanner(bText, status === 'NO_ROUTE' ? 'warning' : 'info');
    return true;
  }

  resetView() {
    this.clearHighlight();
    this.filterRegion = 'all';
    this.filterFacility = 'all';
    this.activeTracedOperatorId = null;
    if (this.map) {
      this.map.fitBounds([
        [7.5, 68.0],
        [36.5, 97.5]
      ], { padding: [20, 20], maxZoom: 6 });
    }
    this.renderCorridors();
    this.renderNodes();
    if (this.onTraceOperator) {
      this.onTraceOperator(null, [], []);
    }
  }

  destroy() {
    if (this.flowAnimInterval) {
      clearInterval(this.flowAnimInterval);
      this.flowAnimInterval = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

window.IndiaMapVisualizer = IndiaMapVisualizer;


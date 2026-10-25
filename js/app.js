/**
 * GRIDSEC Master Application Orchestrator
 * Integrates Indian National Grid (Grid-India / POSOCO), Real-Time Power Transfer Visualizer,
 * and Computational DSA Resilience Engine.
 */

class GridSecApp {
  constructor() {
    this.currentView = 'dashboard';
    this.graph = new GridGraph();
    if (window.GRID_DATA) {
      this.graph.loadData(window.GRID_DATA);
    }
    if (window.INDIA_GRID_DATA && window.INDIA_GRID_DATA.nodes) {
      window.INDIA_GRID_DATA.nodes.forEach(n => {
        if (!this.graph.getNode(n.id)) {
          this.graph.addNode({ ...n, riskScore: n.status === 'compromised' ? 90 : (n.status === 'suspicious' ? 60 : 10) });
        }
      });
      if (window.INDIA_GRID_DATA.corridors) {
        window.INDIA_GRID_DATA.corridors.forEach(c => {
          this.graph.addEdge(c.from, c.to, {
            distanceKm: c.distanceKm || 50,
            lineLossMW: 10,
            maxLoadMW: 1000,
            status: c.status || 'active'
          });
        });
      }
    }
    this.dsaEngine = new DsaEngine(this.graph);
    this.indiaVisualizer = null;
    this.pendingHighlight = null;
    this.eventsProcessed = 48920;
    this.nationalFreq = 50.002;

    this.activeNetwork = 'INDIA_GRID_59';
    this.initResilienceWorkflow();
    this.init();
  }

  switchNetwork(networkId) {
    if (this.activeNetwork === networkId) return;
    this.activeNetwork = networkId;

    // 1. Update UI button styles
    const btnIndia = document.getElementById('btnModelIndia');
    const btnIEEE = document.getElementById('btnModelIEEE30');
    if (btnIndia && btnIEEE) {
      if (networkId === 'IEEE_30') {
        btnIndia.classList.remove('active');
        btnIndia.style.background = 'transparent';
        btnIndia.style.color = '#57534e';
        btnIEEE.classList.add('active');
        btnIEEE.style.background = '#166534';
        btnIEEE.style.color = '#fff';
      } else {
        btnIEEE.classList.remove('active');
        btnIEEE.style.background = 'transparent';
        btnIEEE.style.color = '#57534e';
        btnIndia.classList.add('active');
        btnIndia.style.background = '#166534';
        btnIndia.style.color = '#fff';
      }
    }

    // 2. Rebuild clean Graph Engine without carrying over state
    this.graph = new GridGraph();
    if (networkId === 'IEEE_30' && window.IEEE_30_DATA) {
      (window.IEEE_30_DATA.nodes || []).forEach(n => {
        this.graph.addNode({ ...n, riskScore: 10 });
      });
      (window.IEEE_30_DATA.corridors || []).forEach(c => {
        this.graph.addEdge(c.from, c.to, {
          distanceKm: c.distanceKm || 20,
          lineLossMW: 2.0,
          maxLoadMW: c.maxLoadMW || 100,
          status: 'active'
        });
      });
    } else {
      if (window.GRID_DATA) this.graph.loadData(window.GRID_DATA);
      if (window.INDIA_GRID_DATA && window.INDIA_GRID_DATA.nodes) {
        window.INDIA_GRID_DATA.nodes.forEach(n => {
          if (!this.graph.getNode(n.id)) {
            this.graph.addNode({ ...n, riskScore: 10 });
          }
        });
        if (window.INDIA_GRID_DATA.corridors) {
          window.INDIA_GRID_DATA.corridors.forEach(c => {
            this.graph.addEdge(c.from, c.to, {
              distanceKm: c.distanceKm || 50,
              lineLossMW: 10,
              maxLoadMW: 1000,
              status: c.status || 'active'
            });
          });
        }
      }
    }
    this.dsaEngine = new DsaEngine(this.graph);

    // 3. Reset visualizer & infrastructure states cleanly
    if (this.indiaVisualizer) {
      this.indiaVisualizer.setNetwork(networkId);
      this.indiaVisualizer.resetInfrastructureStates();
      this.indiaVisualizer.fitNetwork();
    }

    // 4. Reset Simulator View & Dynamic Targets
    if (window.SimulatorView && typeof window.SimulatorView.onNetworkSwitched === 'function') {
      window.SimulatorView.onNetworkSwitched(networkId);
    }

    // 5. Update Network Analysis View if active
    if (window.NetworkAnalysisView && typeof window.NetworkAnalysisView.onNetworkModelSwitched === 'function') {
      window.NetworkAnalysisView.onNetworkModelSwitched(networkId);
    }

    // 6. If currently on a view that needs re-rendering
    if (this.currentView === 'simulation') {
      this.navigate('simulation');
    } else if (this.currentView === 'dashboard') {
      this.navigate('dashboard');
    } else if (this.currentView === 'analysis') {
      this.navigate('analysis');
    }

    console.log(`[GRIDSEC] Active model cleanly switched to ${networkId}. Topology & caches reset.`);
  }

  init() {
    // Restore sidebar collapsed preference
    if (localStorage.getItem('gridsec_sidebar_collapsed') === 'true') {
      const sidebar = document.querySelector('.soc-sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }

    this.initNavigation();
    this.initLiveClock();
    this.initLiveTelemetryTicker();
    
    // Check URL hash (#dashboard, #simulation, #analysis) or default to 'dashboard'
    const hash = (window.location.hash || '').replace('#', '');
    const initialView = this.resolveViewName(hash);
    this.navigate(initialView);

    window.addEventListener('hashchange', () => {
      const newHash = (window.location.hash || '').replace('#', '');
      const targetView = this.resolveViewName(newHash);
      if (targetView !== this.currentView) {
        this.navigate(targetView);
      }
    });
  }

  resolveViewName(rawName) {
    if (!rawName) return 'dashboard';
    const lower = rawName.toLowerCase();
    if (lower === 'defender-intro' || lower === 'story' || lower === 'intro') {
      return 'defender-intro';
    }
    const viewMap = {
      'dashboard': 'dashboard',
      'map': 'dashboard',
      'assets': 'dashboard',
      'simulation': 'simulation',
      'simulator': 'simulation',
      'cascade': 'simulation',
      'defender': 'defender',
      'grid-defender': 'defender',
      'game': 'defender',
      'analysis': 'analysis',
      'network': 'analysis',
      'investigation': 'analysis',
      'threats': 'analysis',
      'scheduling': 'scheduling',
      'daily-scheduling': 'scheduling',
      'load-scheduling': 'scheduling'
    };
    return viewMap[lower] || 'dashboard';
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.soc-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('gridsec_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    
    // Smoothly invalidate and resize map if active
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      if (window.MapView && window.MapView.mapInstance) {
        window.MapView.mapInstance.invalidateSize();
      }
    }, 200);
  }

  initLiveClock() {
    const updateClock = () => {
      const now = new Date();
      // Format IST Time (HH:mm:ss IST)
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${mins}:${secs} IST`;

      // Format Date (DD-Mon-YYYY)
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[now.getMonth()];
      const year = now.getFullYear();
      const dateStr = `${day}-${monthStr}-${year}`;

      const timeEl = document.getElementById('clockTimeVal');
      const dateEl = document.getElementById('clockDateVal');
      if (timeEl) timeEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr;
    };

    updateClock();
    setInterval(updateClock, 1000);
  }

  refreshScadaFeed() {
    // 1. Trigger visual refresh animation on buttons
    const headerIcon = document.getElementById('headerRefreshIcon');
    const mapIcon = document.getElementById('mapRefreshIcon');
    if (headerIcon) headerIcon.classList.add('fa-spin');
    if (mapIcon) mapIcon.classList.add('fa-spin');

    // 2. Perform micro-telemetry recalculations
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    if (data && data.nationalMetrics) {
      // Micro oscillation around 50.000 Hz
      this.nationalFreq = 50.000 + (Math.random() * 0.016 - 0.008);
      data.nationalMetrics.gridFrequencyHz = this.nationalFreq;

      // Realistic drift in demand / generation (+-0.3 GW)
      const deltaDemand = (Math.random() * 600 - 300);
      data.nationalMetrics.nationalDemandMW = Math.round(data.nationalMetrics.nationalDemandMW + deltaDemand);
      data.nationalMetrics.totalGenerationMW = Math.round(data.nationalMetrics.nationalDemandMW + 8500 + (Math.random() * 200 - 100));
      
      const deltaTransfer = (Math.random() * 200 - 100);
      data.nationalMetrics.activeInterRegionalTransferMW = Math.round(data.nationalMetrics.activeInterRegionalTransferMW + deltaTransfer);
    }

    // 3. Drift visible node/transformer telemetry slightly
    if (data && data.nodes) {
      data.nodes.forEach(n => {
        if (n.transformers) {
          n.transformers.forEach(t => {
            // Micro drift in load % and temperature
            const loadDrift = (Math.random() * 1.2 - 0.6);
            t.loadPercent = Math.min(96, Math.max(45, +(t.loadPercent + loadDrift).toFixed(1)));
            const tempDrift = (Math.random() * 0.4 - 0.2);
            t.oilTempC = +(t.oilTempC + tempDrift).toFixed(1);
            t.windingTempC = +(t.windingTempC + tempDrift).toFixed(1);
          });
        }
      });
    }

    // 4. Update UI labels
    this.updateLiveUiDisplays();

    // 5. Update timestamp badge
    const lastSyncEl = document.getElementById('mapLastSyncText');
    if (lastSyncEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      lastSyncEl.textContent = `Live PMU Stream (60 fps) · Synced at ${timeStr}`;
    }

    // 6. Stop spinning after short feedback delay
    setTimeout(() => {
      if (headerIcon) headerIcon.classList.remove('fa-spin');
      if (mapIcon) mapIcon.classList.remove('fa-spin');
    }, 600);
  }

  updateLiveUiDisplays() {
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    if (!data || !data.nationalMetrics) return;

    const m = data.nationalMetrics;

    // Header badge
    const headerBadge = document.getElementById('headerSyncStatus');
    if (headerBadge) {
      headerBadge.textContent = `Live SCADA (${m.gridFrequencyHz.toFixed(3)} Hz)`;
    }

    // Map View KPIs
    const mapHeaderFreq = document.getElementById('mapHeaderFreq');
    if (mapHeaderFreq) mapHeaderFreq.textContent = m.gridFrequencyHz.toFixed(3);

    const mapKpiFreq = document.getElementById('mapKpiFreq');
    if (mapKpiFreq) mapKpiFreq.textContent = `${m.gridFrequencyHz.toFixed(3)} Hz`;

    const mapKpiDemand = document.getElementById('mapKpiDemand');
    if (mapKpiDemand) mapKpiDemand.textContent = `${(m.nationalDemandMW / 1000).toFixed(1)} GW`;

    const mapKpiGen = document.getElementById('mapKpiGen');
    if (mapKpiGen) mapKpiGen.textContent = (m.totalGenerationMW / 1000).toFixed(1);

    const mapKpiTransfer = document.getElementById('mapKpiTransfer');
    if (mapKpiTransfer) mapKpiTransfer.textContent = `${(m.activeInterRegionalTransferMW / 1000).toFixed(1)} GW`;

    // Dashboard View KPIs
    const dashFreq = document.getElementById('kpiFreq');
    if (dashFreq) dashFreq.textContent = `${m.gridFrequencyHz.toFixed(3)} Hz`;

    const dashDemand = document.getElementById('kpiDemand');
    if (dashDemand) dashDemand.textContent = `${(m.nationalDemandMW / 1000).toFixed(1)} GW`;

    // Update currently inspected node if Map View is open
    if (this.currentView === 'map' && this.indiaVisualizer && this.indiaVisualizer.selectedNodeId) {
      const selectedNode = data.nodes.find(n => n.id === this.indiaVisualizer.selectedNodeId);
      if (selectedNode) {
        window.MapView.updateNodeTelemetry(selectedNode);
      }
    }
  }

  initNavigation() {
    document.querySelectorAll('.soc-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) this.navigate(view);
      });
    });
  }

  navigate(viewName) {
    const target = this.resolveViewName(viewName);
    this.currentView = target;

    document.querySelectorAll('.soc-nav-item').forEach(item => {
      const itemView = this.resolveViewName(item.getAttribute('data-view'));
      if (itemView === target || (target === 'defender-intro' && itemView === 'defender')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Clean up previous view resources if needed
    if (this.currentView === 'analysis' && target !== 'analysis') {
      if (window.NetworkAnalysisView && typeof window.NetworkAnalysisView.destroy === 'function') {
        window.NetworkAnalysisView.destroy();
      }
    }

    const viewport = document.getElementById('socMainViewport');
    if (!viewport) return;

    switch (target) {
      case 'dashboard':
        viewport.innerHTML = window.DashboardView ? window.DashboardView.render(this) : (window.MapView ? window.MapView.render(this) : '');
        setTimeout(() => this.initIndiaMapCanvas(), 50);
        break;
      case 'simulation':
        viewport.innerHTML = window.SimulatorView ? window.SimulatorView.render(this) : '';
        break;
      case 'defender-intro':
        viewport.innerHTML = window.DefenderIntroView ? window.DefenderIntroView.render(this) : '';
        setTimeout(() => window.DefenderIntroView?.init(), 50);
        break;
      case 'defender': {
        const introSeen = sessionStorage.getItem('gridsec_defender_intro_seen') === 'true';
        if (!introSeen && window.DefenderIntroView) {
          viewport.innerHTML = window.DefenderIntroView.render(this);
          setTimeout(() => window.DefenderIntroView.init(), 50);
        } else {
          viewport.innerHTML = window.DefenderView ? window.DefenderView.render(this) : '';
          setTimeout(() => window.DefenderView?.init(), 50);
        }
        break;
      }
      case 'analysis':
        viewport.innerHTML = window.NetworkAnalysisView ? window.NetworkAnalysisView.render(this) : '';
        setTimeout(() => {
          if (window.NetworkAnalysisView && typeof window.NetworkAnalysisView.init === 'function') {
            window.NetworkAnalysisView.init(this);
          }
        }, 50);
        break;
      case 'scheduling':
        viewport.innerHTML = window.DailySchedulerView ? window.DailySchedulerView.render(this) : '';
        setTimeout(() => {
          if (window.DailySchedulerView && typeof window.DailySchedulerView.init === 'function') {
            window.DailySchedulerView.init(this);
          }
        }, 50);
        break;
      default:
        viewport.innerHTML = window.DashboardView ? window.DashboardView.render(this) : '';
        setTimeout(() => this.initIndiaMapCanvas(), 50);
    }
  }

  initIndiaMapCanvas() {
    const canvas = document.getElementById('indiaGridCanvas');
    const data = window.INDIA_GRID_DATA || window.INDIA_MAP_DATA;
    if (!canvas || !data) return;

    if (!window.L || !window.IndiaMapVisualizer) {
      setTimeout(() => this.initIndiaMapCanvas(), 100);
      return;
    }

    try {
      this.indiaVisualizer = new IndiaMapVisualizer(
        'indiaGridCanvas', 
        data, 
        (node) => {
          window.MapView.updateNodeTelemetry(node);
        },
        (transformer, parentNode) => {
          window.MapView.highlightTransformer(transformer, parentNode);
        },
        (operator, matchedNodes, matchedCorridors) => {
          window.MapView.updateOperatorProfile(operator, matchedNodes, matchedCorridors);
        }
      );
      const defaultNode = data.nodes.find(n => n.id === 'WR-RAIGARH') || data.nodes[0];
      if (defaultNode) window.MapView.updateNodeTelemetry(defaultNode);

      // Apply queued pending highlight from Network Analysis / Simulator / Investigation
      this.applyPendingMapHighlight();

      // Multiple invalidateSize passes to guarantee full render across browsers and layout passes
      [50, 150, 300, 600, 1000].forEach(delay => {
        setTimeout(() => {
          if (this.indiaVisualizer && this.indiaVisualizer.map) {
            this.indiaVisualizer.map.invalidateSize();
          }
        }, delay);
      });
    } catch (err) {
      console.error('Error mounting IndiaMapVisualizer:', err);
    }
  }

  showMapWithHighlight(nodeIds, mode = 'route') {
    console.log('[GRIDSEC Orchestrator] showMapWithHighlight requested with nodeIds:', nodeIds, 'mode:', mode);

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) return;

    // 1. Store pending highlight request in master app state
    this.pendingHighlight = { nodeIds, mode };

    // 2. Navigate to Dashboard view if not currently active
    if (this.currentView !== 'dashboard') {
      window.location.hash = 'dashboard';
      this.navigate('dashboard');
    }

    // 3. Apply highlight to map visualizer
    this.applyPendingMapHighlight();
  }

  applyPendingMapHighlight() {
    if (!this.pendingHighlight) return;

    if (this.indiaVisualizer && this.indiaVisualizer.map) {
      if (this.pendingHighlight.isResilienceWorkflow) {
        this.indiaVisualizer.highlightResilienceWorkflow(this.pendingHighlight);
      } else {
        const { nodeIds, mode } = this.pendingHighlight;
        this.indiaVisualizer.highlightRoute(nodeIds, mode);
      }
    } else {
      // Map visualizer still initializing; retry after short delay
      setTimeout(() => this.applyPendingMapHighlight(), 150);
    }
  }

  // UNIFIED RESILIENCE WORKFLOW STATE MANAGEMENT
  initResilienceWorkflow() {
    this.resilienceWorkflow = {
      state: 'IDLE', // IDLE | ROUTE_GENERATED | ATTACK_READY | ATTACK_INJECTED | ROUTE_DISRUPTED | REROUTING | REROUTED | RECOVERED | NO_ROUTE
      sourceId: 'GEN-01',
      targetId: 'CRIT-01',
      originalRoute: [],
      originalPowerLoss: 0,
      activeRoute: [],
      activePowerLoss: 0,
      attackedTarget: null,
      compromisedNodes: new Set(),
      compromisedLines: new Set(),
      candidateRoutes: [],
      eventLog: []
    };
  }

  generateResilienceRoute(sourceId, targetId) {
    if (!this.resilienceWorkflow) this.initResilienceWorkflow();
    const wf = this.resilienceWorkflow;

    wf.sourceId = sourceId || wf.sourceId || 'GEN-01';
    wf.targetId = targetId || wf.targetId || 'CRIT-01';

    const res = this.dsaEngine.findCandidateRoutes(wf.sourceId, wf.targetId, wf.compromisedNodes, { randomize: true });

    if (res.success) {
      wf.activeRoute = res.path;
      wf.activePowerLoss = res.powerLoss;
      wf.candidateRoutes = res.candidateRoutes;

      if (!wf.originalRoute || wf.originalRoute.length === 0 || wf.state === 'RECOVERED' || wf.state === 'IDLE') {
        wf.originalRoute = [...res.path];
        wf.originalPowerLoss = res.powerLoss;
      }

      wf.state = 'ROUTE_GENERATED';
      this.logResilienceEvent(`✓ Route generated: ${res.path.join(' → ')} (${res.candidateCount} candidate paths evaluated, Power Loss: ${res.powerLoss} MW)`);
    } else {
      wf.state = 'NO_ROUTE';
      wf.activeRoute = [];
      this.logResilienceEvent(`✖ No valid transmission route found between ${wf.sourceId} and ${wf.targetId}`);
    }

    if (this.currentView === 'network') {
      window.NetworkAnalysisView.renderWorkflowUI();
    }
    return res;
  }

  prepareRouteAttack(targetAssetId) {
    if (!this.resilienceWorkflow) return;
    if (targetAssetId) this.resilienceWorkflow.selectedAttackTarget = targetAssetId;
    this.resilienceWorkflow.state = 'ATTACK_READY';
    if (this.currentView === 'network') {
      window.NetworkAnalysisView.renderWorkflowUI();
    }
  }

  async executeRouteAttack(targetAssetId) {
    if (!this.resilienceWorkflow) return;
    const wf = this.resilienceWorkflow;

    wf.state = 'ATTACK_INJECTED';
    wf.attackedTarget = targetAssetId;
    wf.compromisedNodes.add(targetAssetId);

    const nodeObj = this.graph.getNode(targetAssetId);
    if (nodeObj) nodeObj.status = 'compromised';

    this.logResilienceEvent(`✓ Attack injected — ${targetAssetId}`);
    this.logResilienceEvent(`✓ Route disruption detected on component ${targetAssetId}`);

    wf.state = 'REROUTING';
    this.logResilienceEvent(`✓ Recalculating alternate routes excluding compromised infrastructure...`);

    // Call real backend API to execute cyber simulation
    try {
      await fetch('/api/cyber/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: 'SCENARIO_A_BREAKER_TRIP',
          target_asset_id: targetAssetId,
          apply_physical_consequence: true
        })
      });
    } catch (e) {}

    // Auto-calculate new route excluding compromised nodes
    const newRes = this.dsaEngine.findCandidateRoutes(wf.sourceId, wf.targetId, wf.compromisedNodes, { randomize: true });

    if (newRes.success) {
      wf.state = 'REROUTED';
      wf.activeRoute = newRes.path;
      wf.activePowerLoss = newRes.powerLoss;
      wf.candidateRoutes = newRes.candidateRoutes;

      this.logResilienceEvent(`✓ ${newRes.candidateCount} candidate paths evaluated`);
      this.logResilienceEvent(`✓ Lowest-loss route selected (${newRes.powerLoss} MW)`);
      this.logResilienceEvent(`✓ New route activated: ${newRes.path.join(' → ')}`);
    } else {
      wf.state = 'NO_ROUTE';
      wf.activeRoute = [];
      this.logResilienceEvent(`✖ Alternative routes evaluated — No valid path found (Source and Destination disconnected)`);
    }

    if (this.currentView === 'network') {
      window.NetworkAnalysisView.renderWorkflowUI();
    }

    // Auto update map
    this.updateResilienceMapHighlight();
  }

  resolveResilienceAttacks() {
    if (!this.resilienceWorkflow) return;
    const wf = this.resilienceWorkflow;

    wf.compromisedNodes.forEach(id => {
      const nodeObj = this.graph.getNode(id);
      if (nodeObj) nodeObj.status = 'healthy';
    });

    wf.compromisedNodes.clear();
    wf.compromisedLines.clear();
    wf.attackedTarget = null;

    const res = this.dsaEngine.findCandidateRoutes(wf.sourceId, wf.targetId, wf.compromisedNodes, { randomize: false });
    if (res.success) {
      wf.activeRoute = res.path;
      wf.activePowerLoss = res.powerLoss;
      wf.originalRoute = [...res.path];
      wf.originalPowerLoss = res.powerLoss;
      wf.state = 'RECOVERED';
      this.logResilienceEvent(`● ATTACK RESOLVED — Grid connectivity restored. Optimal route reactivated: ${res.path.join(' → ')}`);
    }

    if (this.currentView === 'network') {
      window.NetworkAnalysisView.renderWorkflowUI();
    }
    this.updateResilienceMapHighlight();
  }

  logResilienceEvent(msg) {
    if (!this.resilienceWorkflow) this.initResilienceWorkflow();
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    this.resilienceWorkflow.eventLog.unshift({ time: timeStr, msg });
  }

  updateResilienceMapHighlight() {
    if (!this.resilienceWorkflow) return;
    const wf = this.resilienceWorkflow;

    this.pendingHighlight = {
      isResilienceWorkflow: true,
      activeRoute: wf.activeRoute,
      originalRoute: wf.originalRoute,
      compromisedNodes: Array.from(wf.compromisedNodes),
      status: wf.state
    };

    if (this.currentView !== 'dashboard') {
      window.location.hash = 'dashboard';
      this.navigate('dashboard');
    } else {
      this.applyPendingMapHighlight();
    }
  }

  isolateNode(id) {
    this.graph.isolateNode(id);
    alert(`Node ${id} isolated from active dispatch.`);
  }

  applyDijkstraRoute(src, dst) {
    const res = this.dsaEngine.findAlternateRoute(src, dst);
    if (res.success) {
      alert(`Safe Route Computed via Dijkstra Engine: ${res.path.join(' → ')} (Latency: ${res.benchmark.executionTimeUs} µs)`);
    }
  }

  initLiveTelemetryTicker() {
    const logList = [
      { text: 'Raigarh–Pugalur ±800kV HVDC telemetry synchronized (5,200 MW transfer WR → SR)', type: 'heal' },
      { text: 'Champa–Kurukshetra ±800kV link operating at nominal 2,600 MW (WR → NR)', type: 'heal' },
      { text: 'DNP3 outstation checksum verified across Northern Region 765kV grid', type: 'heal' },
      { text: 'Phasor Measurement Unit PMU sampling rate: 60 fps (National Freq 50.002 Hz)', type: 'heal' },
      { text: 'Talcher–Kolar ±500kV HVDC power flow nominal: 2,150 MW (ER → SR)', type: 'heal' },
      { text: 'Modbus TCP rate-limiting active on Wardha Substation gateway', type: 'warn' }
    ];

    const initialFeed = document.getElementById('socLiveLogList');
    if (initialFeed && initialFeed.children.length === 0) {
      for (let i = 0; i < 5; i++) {
        const item = logList[i % logList.length];
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${item.type}`;
        entry.innerHTML = `<span style="color:#78716c; font-size:0.7rem;">[${time}]</span> ${item.text}`;
        initialFeed.prepend(entry);
      }
      while (initialFeed.children.length > 5) initialFeed.removeChild(initialFeed.lastChild);
    }

    setInterval(() => {
      this.eventsProcessed += Math.floor(Math.random() * 8) + 2;
      const counterEl = document.getElementById('kpiEventsCounter');
      if (counterEl) {
        counterEl.textContent = this.eventsProcessed.toLocaleString();
      }

      // Micro oscillation around 50.00 Hz
      this.nationalFreq = 50.000 + (Math.random() * 0.008 - 0.004);
      const freqEl = document.getElementById('kpiFreq');
      if (freqEl) {
        freqEl.textContent = `${this.nationalFreq.toFixed(3)} Hz`;
      }

      const feed = document.getElementById('socLiveLogList');
      if (feed) {
        const item = logList[Math.floor(Math.random() * logList.length)];
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${item.type}`;
        entry.innerHTML = `<span style="color:#78716c; font-size:0.7rem;">[${time}]</span> ${item.text}`;
        feed.prepend(entry);
        while (feed.children.length > 5) feed.removeChild(feed.lastChild);
      }
    }, 3000);
  }

  showDsaModal(type) {
    const modal = document.getElementById('dsaModalBackdrop');
    const title = document.getElementById('modalDsaTitle');
    const body = document.getElementById('modalDsaBody');

    const meta = {
      'bfs': {
        title: 'Attack Path Traversal (Breadth-First Search)',
        algo: 'BFS Graph Traversal',
        ds: 'Adjacency Matrix + FIFO Queue',
        time: 'O(V + E)',
        space: 'O(V)',
        desc: 'Explores transmission corridors level-by-level across Northern, Western, and Southern regions to calculate blast radius.'
      },
      'dijkstra': {
        title: "Min-Risk Rerouting (Dijkstra's Algorithm)",
        algo: 'Dijkstra with Priority Queue',
        ds: 'Weighted Graph + Binary Min-Heap',
        time: 'O((V + E) log V)',
        space: 'O(V)',
        desc: 'Calculates the lowest-impedance and minimum-cyber-risk bypass path to deliver power around quarantined HVDC converter stations.'
      }
    }[type] || meta['bfs'];

    if (title && body && modal) {
      title.textContent = meta.title;
      body.innerHTML = `
        <div style="margin-bottom:0.75rem;">
          <span class="badge badge-forest">${meta.algo}</span>
        </div>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:1.25rem;">${meta.desc}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle);">
          <div>
            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Data Structure</div>
            <div style="font-size:0.85rem; font-family:var(--font-mono); color:#1c1917; font-weight:600;">${meta.ds}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Complexity</div>
            <div style="font-size:0.85rem; font-family:var(--font-mono); color:var(--status-healthy); font-weight:600;">Time: ${meta.time} | Space: ${meta.space}</div>
          </div>
        </div>
      `;
      modal.classList.add('open');
    }
  }

  closeDsaModal() {
    const modal = document.getElementById('dsaModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  toggleDisclosure(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.toggle('open');
    }
  }
}

window.toggleDisclosure = function(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('open');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.app = new GridSecApp();
});


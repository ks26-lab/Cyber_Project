/**
 * GRIDSEC Warm Editorial Views: Network Analysis & Simulator
 */

window.NetworkAnalysisView = {
  render: (app) => {
    return `
      <div class="view-container">
        <!-- View Header -->
        <div class="view-header" style="margin-bottom:1rem;">
          <div class="view-title-group">
            <h2>Network Resilience &amp; Attack Simulation Workflow</h2>
            <p>Interactive transmission resilience experiment: Select Source/Destination &rarr; Generate Route &rarr; Inject Cyber Attack &rarr; Auto-Reroute &rarr; Compare Power Loss &rarr; Recover.</p>
          </div>
          <div class="tech-insight-badge" onclick="window.app.showDsaModal('dijkstra')">
            <i class="fa-solid fa-code"></i> Dijkstra + Controlled Randomization
          </div>
        </div>

        <!-- Dynamic Workflow Render Container -->
        <div id="resilienceWorkflowContainer">
          ${window.NetworkAnalysisView.buildWorkflowHtml(app)}
        </div>

        <!-- Advanced Diagnostics (Collapsible Accordions) -->
        <div style="margin-top:1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.6rem;">
            Advanced Structural Graph Analysis (Optional)
          </div>

          <!-- Tarjan SPoFs -->
          <div class="disclosure-card" id="discCardTarjan">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardTarjan')">
              <span><i class="fa-solid fa-triangle-exclamation" style="color:#d97706; margin-right:6px;"></i> Critical SPoFs &amp; Bridge Detection (Tarjan O(V+E))</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body">
              <p style="color:var(--text-muted); font-size:0.82rem; margin-bottom:0.85rem;">
                Identifies critical transmission substations and radial links whose sudden outage splits the network.
              </p>
              <button class="btn btn-secondary" style="width:100%;" onclick="window.NetworkAnalysisView.runTarjanAnalysis()">
                Run Tarjan Bridge Analysis
              </button>
              <div id="tarjanResultBox" style="margin-top:0.85rem; display:none; background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Articulation Nodes</div>
                <div id="tarjanNodesList" style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-top:5px;"></div>
                <div id="tarjanBridgesList" style="margin-top:0.5rem; font-size:0.78rem; color:var(--text-muted);"></div>
              </div>
            </div>
          </div>

          <!-- DSU Islanding -->
          <div class="disclosure-card" id="discCardIslanding">
            <div class="disclosure-header" onclick="window.NetworkAnalysisView.toggleDisclosure('discCardIslanding')">
              <span><i class="fa-solid fa-diagram-project" style="color:#4f46e5; margin-right:6px;"></i> Grid Partition &amp; Islanding State (DSU)</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body">
              <p style="color:var(--text-muted); font-size:0.82rem; margin-bottom:0.85rem;">
                Tracks whether line tripping has partitioned the national network into isolated microgrid islands.
              </p>
              <button class="btn btn-secondary" style="width:100%;" onclick="window.NetworkAnalysisView.checkIslanding()">
                Check Islanding State (DSU)
              </button>
              <div id="islandingResultBox" style="margin-top:0.85rem; display:none; background:#faf9f6; padding:0.85rem; border-radius:6px; border:1px solid var(--border-subtle);"></div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  buildWorkflowHtml: (appObj) => {
    const mainApp = appObj || window.app || {};
    const nodes = mainApp.graph ? mainApp.graph.getAllNodes() : [];
    const wf = mainApp.resilienceWorkflow || { state: 'IDLE', sourceId: 'GEN-01', targetId: 'CRIT-01', activeRoute: [], eventLog: [] };
    const hasRoute = wf.activeRoute && wf.activeRoute.length > 0;
    const isAttacked = wf.state === 'REROUTED' || wf.state === 'ATTACK_INJECTED' || wf.state === 'NO_ROUTE';

    return `
      <!-- 1. Source & Destination Selection Card -->
      <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:8px; padding:1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem;">
          Network Resilience Calculator &bull; Select Endpoints
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
          <div>
            <label style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Source Substation [Select A]</label>
            <select id="routeSourceSelect" class="soc-select" style="width:100%; margin-top:3px;">
              ${nodes.map(n => `<option value="${n.id}" ${n.id === wf.sourceId ? 'selected' : ''}>${n.id} - ${n.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Destination Substation [Select B]</label>
            <select id="routeDestSelect" class="soc-select" style="width:100%; margin-top:3px;">
              ${nodes.map(n => `<option value="${n.id}" ${n.id === wf.targetId ? 'selected' : ''}>${n.id} - ${n.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%; padding:0.65rem 1.25rem; font-weight:700;" onclick="window.NetworkAnalysisView.onGenerateRoute()">
          <i class="fa-solid fa-route"></i> Generate Route
        </button>
      </div>

      <!-- 2. Active Route Display Card -->
      ${hasRoute ? `
        <div style="background:#ffffff; border:1px solid ${isAttacked ? '#bbf7d0' : 'var(--border-subtle)'}; border-radius:8px; padding:1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <div style="font-size:0.75rem; font-weight:800; color:${isAttacked ? '#15803d' : '#1c1917'}; text-transform:uppercase;">
              ${isAttacked ? 'Active Alternate Route' : 'Active Transmission Route'}
            </div>
            <span class="badge ${isAttacked ? 'badge-forest' : 'badge-healthy'}" style="font-size:0.7rem; font-weight:700;">
              ${isAttacked ? 'REROUTED & OPERATIONAL' : 'OPTIMAL BASELINE'}
            </span>
          </div>

          <div style="font-family:'JetBrains Mono', monospace; font-size:1.05rem; font-weight:800; color:#166534; background:#f0fdf4; padding:0.75rem; border-radius:6px; border:1px solid #bbf7d0; margin-bottom:0.85rem; word-break:break-all;">
            ${wf.activeRoute.join(' &rarr; ')}
          </div>

          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.75rem; margin-bottom:1rem; background:#faf9f6; padding:0.65rem; border-radius:6px;">
            <div>
              <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Power Loss</div>
              <div style="font-size:0.95rem; font-weight:700; color:#1c1917;">${wf.activePowerLoss.toFixed(1)} MW</div>
            </div>
            <div>
              <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Path Length</div>
              <div style="font-size:0.95rem; font-weight:700; color:#0284c7;">${wf.activeRoute.length - 1} Transmission Hops</div>
            </div>
            <div>
              <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Status</div>
              <div style="font-size:0.95rem; font-weight:700; color:#16a34a;">${wf.state}</div>
            </div>
          </div>

          <div style="display:flex; gap:0.6rem;">
            <button class="btn btn-secondary" style="flex:1;" onclick="window.app.updateResilienceMapHighlight()">
              <i class="fa-solid fa-map-location-dot"></i> View On Map
            </button>
            <button class="btn btn-primary" style="flex:1; background:#b91c1c; border-color:#991b1b;" onclick="window.app.prepareRouteAttack()">
              <i class="fa-solid fa-crosshairs"></i> Attack Route
            </button>
          </div>
        </div>
      ` : ''}

      <!-- 3. Attack Target Selection Panel (Route Scoped) -->
      ${wf.state === 'ATTACK_READY' && hasRoute ? `
        <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:8px; padding:1.25rem; margin-bottom:1.25rem;">
          <div style="font-size:0.85rem; font-weight:800; color:#991b1b; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.4rem;">
            <i class="fa-solid fa-crosshairs"></i> Select Target Component From Current Route
          </div>
          <p style="font-size:0.78rem; color:#7f1d1d; margin-bottom:0.85rem;">
            Choose a substation on the active path to inject an unauthorized SCADA breaker trip or cyber payload:
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
            ${wf.activeRoute.slice(1, -1).concat(wf.activeRoute).filter((id, idx, self) => self.indexOf(id) === idx).map(nodeId => `
              <button class="btn ${wf.attackedTarget === nodeId ? 'btn-primary' : 'btn-secondary'}" 
                style="padding:0.45rem 0.85rem; font-size:0.8rem; font-weight:700; ${wf.attackedTarget === nodeId ? 'background:#b91c1c; border-color:#991b1b;' : ''}"
                onclick="window.NetworkAnalysisView.selectAttackTarget('${nodeId}')">
                <i class="fa-solid fa-building-shield"></i> ${nodeId}
              </button>
            `).join('')}
          </div>

          ${wf.attackedTarget ? `
            <button class="btn btn-primary" style="width:100%; background:#b91c1c; border-color:#991b1b; padding:0.6rem; font-weight:700;" onclick="window.NetworkAnalysisView.onInjectAttack()">
              <i class="fa-solid fa-bolt"></i> Inject Attack on ${wf.attackedTarget}
            </button>
          ` : `
            <div style="font-size:0.75rem; color:#991b1b; font-style:italic;">Click any substation above to select it as the attack target.</div>
          `}
        </div>
      ` : ''}

      <!-- 4. System Response & Route Comparison Panel -->
      ${isAttacked ? `
        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:8px; padding:1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <div style="font-size:0.85rem; font-weight:800; color:#1c1917; display:flex; align-items:center; gap:0.4rem;">
              <i class="fa-solid fa-scale-balanced" style="color:#0284c7;"></i> Route Comparison &amp; Resilience Evaluation
            </div>
            <span class="badge ${wf.state === 'NO_ROUTE' ? 'badge-critical' : 'badge-forest'}" style="font-weight:700;">
              ${wf.state === 'NO_ROUTE' ? 'NO ALTERNATIVE ROUTE' : 'REROUTED'}
            </span>
          </div>

          ${wf.state === 'NO_ROUTE' ? `
            <div style="background:#fef2f2; color:#991b1b; padding:1rem; border-radius:6px; font-weight:700; margin-bottom:1rem; border:1px solid #fca5a5;">
              &bull; NO ALTERNATIVE ROUTE AVAILABLE: All connecting transmission paths between ${wf.sourceId} and ${wf.targetId} are currently compromised or isolated.
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; margin-bottom:1rem;">
              <!-- Original Route Card -->
              <div style="background:#faf9f6; border:1px solid #e7e5e4; padding:0.75rem; border-radius:6px;">
                <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:4px;">Original Path (Before Disruption)</div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:0.82rem; font-weight:700; color:#78716c; margin-bottom:6px;">
                  ${(wf.originalRoute || []).join(' &rarr; ')}
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted);">
                  Power Loss: <strong>${(wf.originalPowerLoss || 0).toFixed(1)} MW</strong>
                </div>
              </div>

              <!-- New Alternate Route Card -->
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:0.75rem; border-radius:6px;">
                <div style="font-size:0.68rem; color:#15803d; text-transform:uppercase; font-weight:700; margin-bottom:4px;">New Alternate Path (Active)</div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:0.82rem; font-weight:700; color:#166534; margin-bottom:6px;">
                  ${wf.activeRoute.join(' &rarr; ')}
                </div>
                <div style="font-size:0.78rem; color:#166534;">
                  Power Loss: <strong>${wf.activePowerLoss.toFixed(1)} MW</strong> 
                  <span style="color:${(wf.activePowerLoss - wf.originalPowerLoss) > 0 ? '#b91c1c' : '#15803d'}; font-weight:700; margin-left:4px;">
                    (${(wf.activePowerLoss - wf.originalPowerLoss) >= 0 ? '+' : ''}${(wf.activePowerLoss - wf.originalPowerLoss).toFixed(1)} MW)
                  </span>
                </div>
              </div>
            </div>
          `}

          <div style="display:flex; gap:0.6rem;">
            <button class="btn btn-secondary" style="flex:1;" onclick="window.app.prepareRouteAttack()">
              <i class="fa-solid fa-plus"></i> Attack Another Component
            </button>
            <button class="btn btn-primary" style="flex:1; background:#166534; border-color:#15803d;" onclick="window.app.resolveResilienceAttacks()">
              <i class="fa-solid fa-rotate-left"></i> Resolve Attack
            </button>
          </div>
        </div>
      ` : ''}

      <!-- 5. Compact Event Timeline -->
      ${(wf.eventLog && wf.eventLog.length > 0) ? `
        <div class="disclosure-card open" id="cardResilienceTimeline">
          <div class="disclosure-header" onclick="window.toggleDisclosure('cardResilienceTimeline')">
            <div class="disclosure-title">
              <i class="fa-solid fa-clock-rotate-left" style="color:#0284c7;"></i> Operational Resilience Timeline
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:0.72rem; color:var(--text-muted);">${wf.eventLog.length} Events</span>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
          </div>
          <div class="disclosure-body" style="padding:0.5rem 0.75rem;">
            <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:180px; overflow-y:auto;">
              ${wf.eventLog.map(ev => `
                <div style="display:flex; gap:0.5rem; font-size:0.75rem; background:#ffffff; padding:0.35rem 0.5rem; border-radius:4px; border-left:3px solid #0284c7; border:1px solid #e2e8f0; border-left-width:3px;">
                  <span style="color:#64748b; font-family:'JetBrains Mono', monospace; font-size:0.68rem;">${ev.time}</span>
                  <span style="color:#1e293b; font-weight:600;">${ev.msg}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    `;
  },

  renderWorkflowUI: () => {
    const container = document.getElementById('resilienceWorkflowContainer');
    if (container && window.app) {
      container.innerHTML = window.NetworkAnalysisView.buildWorkflowHtml(window.app);
    }
  },

  onGenerateRoute: () => {
    const src = document.getElementById('routeSourceSelect').value;
    const dst = document.getElementById('routeDestSelect').value;
    window.app.generateResilienceRoute(src, dst);
  },

  selectAttackTarget: (nodeId) => {
    if (window.app && window.app.resilienceWorkflow) {
      window.app.resilienceWorkflow.attackedTarget = nodeId;
      window.NetworkAnalysisView.renderWorkflowUI();
    }
  },

  onInjectAttack: () => {
    if (window.app && window.app.resilienceWorkflow && window.app.resilienceWorkflow.attackedTarget) {
      window.app.executeRouteAttack(window.app.resilienceWorkflow.attackedTarget);
    }
  },

  toggleDisclosure: (cardId) => {
    window.toggleDisclosure(cardId);
  },
  runTarjanAnalysis: () => {
    const res = window.app.dsaEngine.findSinglePointsOfFailure();
    const box = document.getElementById('tarjanResultBox');
    const list = document.getElementById('tarjanNodesList');
    const bridgesList = document.getElementById('tarjanBridgesList');

    box.style.display = 'block';
    list.innerHTML = res.articulationPoints.map(n => `
      <span class="badge badge-warning" style="cursor:pointer;" onclick="window.app.showMapWithHighlight(['${n.id}'], 'bridge')">
        ${n.id} (${n.name})
      </span>
    `).join('');

    bridgesList.innerHTML = `Critical Radial Lines: <strong>${res.bridges.map(b => `${b.from} ↔ ${b.to}`).join(', ')}</strong> (${res.benchmark.executionTimeUs} µs)`;
  },
  checkIslanding: () => {
    const res = window.app.dsaEngine.detectGridIslands();
    const box = document.getElementById('islandingResultBox');
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-weight:700; color:${res.isPartitioned ? '#b45309' : '#15803d'}; font-size:0.95rem; margin-bottom:0.25rem;">
        ${res.isPartitioned ? `Grid Partition Detected: ${res.numIslands} Isolated Islands Active` : 'Grid Unified: Single Synchronous Interconnection'}
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted);">
        DSU engine evaluated ${window.app.graph.edges.length} transmission lines in ${res.benchmark.executionTimeUs} µs.
      </div>
    `;
  }
};

window.SimulatorView = {
  render: (app) => {
    return `
      <div class="view-container">
        <div class="view-header">
          <div class="view-title-group">
            <h2>Grid Resilience Simulator</h2>
            <p>Inject cyber incidents and evaluate automated rerouting playbooks.</p>
          </div>
          <div class="tech-insight-badge" onclick="window.app.showDsaModal('bfs')">
            <i class="fa-solid fa-code"></i> Cascade Engine O(V+E)
          </div>
        </div>

        <!-- Simulator Stages -->
        <div class="simulator-stage-bar">
          <div id="simStep1" class="sim-stage-step active">
            <div class="sim-step-num">Stage 1</div>
            <div class="sim-step-title">1. Baseline State</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">Nominal power flow</div>
          </div>
          <div id="simStep2" class="sim-stage-step">
            <div class="sim-step-num">Stage 2</div>
            <div class="sim-step-title">2. Incident Injected</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">Target compromised</div>
          </div>
          <div id="simStep3" class="sim-stage-step">
            <div class="sim-step-num">Stage 3</div>
            <div class="sim-step-title">3. Blast Radius</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">Downstream impact</div>
          </div>
          <div id="simStep4" class="sim-stage-step">
            <div class="sim-step-num">Stage 4</div>
            <div class="sim-step-title">4. Resilient Reroute</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">Automated healing</div>
          </div>
        </div>

        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:6px; padding:1.25rem; margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
            <div>
              <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Threat Scenario</label>
              <select id="simScenarioSelect" class="soc-select" style="margin-left:6px; min-width:260px;">
                <option value="dnp3">Scenario A: DNP3 Breaker Trip at SUB-042</option>
                <option value="mitm">Scenario B: Synchrophasor PMU Manipulation at GEN-02</option>
              </select>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-primary" onclick="window.SimulatorView.runAttackSimulation()">
                Run Simulation
              </button>
              <button class="btn btn-secondary" onclick="window.SimulatorView.resetSimulation()">
                Reset
              </button>
            </div>
          </div>

          <div id="simResultsArea" style="margin-top:1.25rem; display:none;">
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.75rem; margin-bottom:1rem;">
              <div style="background:#faf9f6; padding:0.85rem; border-radius:4px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Affected Substation</div>
                <div style="font-size:1rem; font-weight:700; color:#b91c1c; margin-top:2px;">SUB-042 (Valley)</div>
              </div>
              <div style="background:#faf9f6; padding:0.85rem; border-radius:4px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Blast Radius</div>
                <div style="font-size:1rem; font-weight:700; color:#b45309; margin-top:2px;">4 Nodes (580 MW)</div>
              </div>
              <div style="background:#faf9f6; padding:0.85rem; border-radius:4px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Optimal Bypass</div>
                <div style="font-size:0.88rem; font-weight:700; color:#166534; margin-top:2px;">GEN-01 → SUB-01 → SUB-51</div>
              </div>
              <div style="background:#faf9f6; padding:0.85rem; border-radius:4px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Hospital Load Protected</div>
                <div style="font-size:1rem; font-weight:700; color:#15803d; margin-top:2px;">100% (0 MW Lost)</div>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
              <button class="btn btn-secondary" onclick="window.app.showMapWithHighlight(['SUB-042', 'NODE-018', 'NODE-021', 'SUB-051'], 'attack')">
                View On Map
              </button>
              <button class="btn btn-primary" onclick="window.app.applyDijkstraRoute('GEN-01', 'SUB-051')">
                Apply Bypass Route
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  runAttackSimulation: () => {
    document.getElementById('simStep1').classList.remove('active');
    document.getElementById('simStep2').classList.add('danger-active');
    document.getElementById('simStep3').classList.add('danger-active');
    document.getElementById('simStep4').classList.add('active');
    document.getElementById('simResultsArea').style.display = 'block';
  },
  resetSimulation: () => {
    document.querySelectorAll('.sim-stage-step').forEach(s => {
      s.classList.remove('active', 'danger-active');
    });
    document.getElementById('simStep1').classList.add('active');
    document.getElementById('simResultsArea').style.display = 'none';
  }
};

/**
 * GRIDSEC Warm Editorial Views: Investigation & Simulator
 */

window.InvestigateView = {
  render: (app) => {
    const incident = window.INCIDENTS_DATA[0];
    return `
      <div class="view-container">
        <div class="view-header">
          <div class="view-title-group">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-critical">${incident.severity}</span>
              <h2>Incident #${incident.id}: ${incident.title}</h2>
            </div>
            <p>Lead Analyst: <strong>${incident.assignedAnalyst}</strong> · Detected: <strong>${incident.detectedAt}</strong></p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary" onclick="window.app.showMapWithHighlight(['SUB-042', 'NODE-018', 'NODE-021', 'SUB-051'], 'attack')">
              <i class="fa-solid fa-map-location-dot"></i> View on Map
            </button>
            <button id="btnExecuteContainment" class="btn btn-primary" onclick="window.InvestigateView.executeContainment()">
              <i class="fa-solid fa-shield"></i> Apply Containment Boundary
            </button>
          </div>
        </div>

        <!-- Attack Propagation Pipeline -->
        <div class="attack-path-container">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="section-tag" style="margin-bottom:0.2rem;">Automated Traversal</span>
              <h3 style="font-size:1.15rem; color:#1c1917;">Multi-Hop Attack Propagation Path</h3>
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('bfs')">
              <i class="fa-solid fa-code"></i> BFS Traversal Engine O(V+E)
            </div>
          </div>

          <div class="attack-hops-flow">
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

          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; padding-top:1rem; border-top:1px solid var(--border-subtle);">
            <div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Vector</div>
              <div style="font-size:0.88rem; font-weight:700; color:#1c1917; margin-top:1px;">DNP3 0x05 Direct-Operate</div>
            </div>
            <div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Blast Radius</div>
              <div style="font-size:0.88rem; font-weight:700; color:#b91c1c; margin-top:1px;">4 Nodes (580 MW at risk)</div>
            </div>
            <div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Threatened Loads</div>
              <div style="font-size:0.88rem; font-weight:700; color:#b45309; margin-top:1px;">General Hospital & Data Center</div>
            </div>
            <div>
              <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Containment</div>
              <div style="font-size:0.88rem; font-weight:700; color:#166534; margin-top:1px;">Isolate NODE-018 Switch</div>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:1.25rem;">
          <div class="disclosure-card open" id="cardForensicTimeline">
            <div class="disclosure-header" onclick="window.toggleDisclosure('cardForensicTimeline')">
              <div class="disclosure-title">
                <i class="fa-solid fa-clock-rotate-left" style="color:#0284c7;"></i> Forensic Timeline
              </div>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body">
              <div style="display:flex; flex-direction:column; gap:0.65rem;">
                <div class="log-entry crit">
                  <strong>08:42:31</strong> &bull; [SUB-042] Unauthorized breaker trip command transmitted.
                </div>
                <div class="log-entry warn">
                  <strong>08:42:33</strong> &bull; [NODE-018] Rogue Modbus register sweep across 40001-40100.
                </div>
                <div class="log-entry warn">
                  <strong>08:42:36</strong> &bull; [NODE-021] Rate exceeded 4,000 packets/sec (DNP3 storm).
                </div>
                <div class="log-entry heal">
                  <strong>08:42:40</strong> &bull; [SOC] Incident #INC-1042 automatically created.
                </div>
              </div>
            </div>
          </div>

          <div class="disclosure-card open" id="cardContainmentPlan">
            <div class="disclosure-header" onclick="window.toggleDisclosure('cardContainmentPlan')">
              <div class="disclosure-title">
                <i class="fa-solid fa-shield-halved" style="color:#16588b;"></i> Containment Plan
              </div>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
            <div class="disclosure-body">
              <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-body); cursor:pointer;">
                  <input type="checkbox" checked disabled> Quarantined DNP3 Outstation IP on SUB-042
                </label>
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-body); cursor:pointer;">
                  <input type="checkbox" id="chkIsolateNode18"> Block forwarding at NODE-018
                </label>
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:var(--text-body); cursor:pointer;">
                  <input type="checkbox" id="chkRerouteDijkstra"> Activate Dijkstra bypass route
                </label>
              </div>
              <button class="btn btn-secondary" style="width:100%; margin-top:1rem;" onclick="window.InvestigateView.applyPlaybook()">
                Execute Containment Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  executeContainment: () => {
    window.app.isolateNode('SUB-042');
    const btn = document.getElementById('btnExecuteContainment');
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#15803d;"></i> Substation Contained`;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
    alert('Containment executed: Substation SUB-042 isolated.');
  },
  applyPlaybook: () => {
    alert('Containment plan applied successfully.');
  }
};


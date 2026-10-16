/**
 * GRIDSEC Threat Detection Matrix & SCADA DPI View
 */

window.ThreatsView = {
  render: () => {
    return `
      <div class="view-container">
        <div class="view-header">
          <div class="view-title-group">
            <h2>SCADA Protocol Threat Detection Matrix</h2>
            <p>Deep Packet Inspection (DPI) across DNP3, Modbus TCP, IEEE C37.118 (PMU), and IEC 60870 streams.</p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" id="threatSearchInput" class="soc-input" placeholder="Search function code, hex, or node..." style="width:260px;" oninput="window.ThreatsView.filterThreats()">
            <select id="threatProtocolFilter" class="soc-select" onchange="window.ThreatsView.filterThreats()">
              <option value="all">All SCADA Protocols</option>
              <option value="DNP3">DNP3</option>
              <option value="Modbus">Modbus TCP</option>
              <option value="IEEE">IEEE C37.118 (PMU)</option>
              <option value="IEC">IEC 60870</option>
            </select>
          </div>
        </div>

        <div class="soc-table-wrapper">
          <table class="soc-table" id="threatsDataTable">
            <thead>
              <tr>
                <th>Threat ID</th>
                <th>Severity</th>
                <th>Timestamp (UTC)</th>
                <th>Source Outstation</th>
                <th>Destination</th>
                <th>Protocol &amp; Function</th>
                <th>Anomaly Pattern</th>
                <th>Database Index</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${window.THREAT_DATA.map(t => `
                <tr>
                  <td class="mono-text" style="color:#1c1917; font-weight:700;">${t.id}</td>
                  <td>
                    <span class="badge badge-${t.severity === 'CRITICAL' ? 'critical' : (t.severity === 'HIGH' ? 'warning' : 'healthy')}">
                      ${t.severity}
                    </span>
                  </td>
                  <td class="mono-text" style="font-size:0.75rem;">${t.timestamp}</td>
                  <td class="mono-text" style="font-weight:600; color:#1c1917;">${t.source}</td>
                  <td class="mono-text" style="color:var(--text-muted);">${t.destination}</td>
                  <td class="mono-text" style="font-size:0.75rem;">
                    <strong>${t.protocol}</strong><br>
                    <span style="color:var(--text-muted); font-size:0.7rem;">${t.functionCode}</span>
                  </td>
                  <td>
                    <div style="font-weight:600; color:#1c1917;">${t.eventType}</div>
                    <div class="mono-text" style="font-size:0.68rem; color:var(--text-dim); margin-top:2px;">Hex: ${t.hexPayload.slice(0, 24)}...</div>
                  </td>
                  <td style="font-size:0.72rem; color:var(--text-muted);">${t.storageEngine.split('+')[0]}</td>
                  <td>
                    <button class="btn btn-secondary" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="window.ThreatsView.inspectPayload('${t.id}')">
                      Inspect Packet
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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
    const threat = window.THREAT_DATA.find(t => t.id === threatId);
    if (!threat) return;

    const modal = document.getElementById('dsaModalBackdrop');
    const title = document.getElementById('modalDsaTitle');
    const body = document.getElementById('modalDsaBody');

    if (modal && title && body) {
      title.textContent = `Deep Packet Inspection: ${threat.id}`;
      body.innerHTML = `
        <div style="margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-${threat.severity === 'CRITICAL' ? 'critical' : 'warning'}">${threat.severity}</span>
          <span class="mono-text" style="font-size:0.75rem; color:var(--text-muted);">${threat.timestamp}</span>
        </div>
        <div style="font-weight:700; color:#1c1917; font-size:1.05rem; margin-bottom:0.35rem;">${threat.eventType}</div>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${threat.description}</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.65rem; background:#faf9f6; padding:0.85rem; border-radius:4px; border:1px solid var(--border-subtle); margin-bottom:1rem;">
          <div>
            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Protocol &amp; Function</div>
            <div style="font-size:0.82rem; font-family:var(--font-mono); font-weight:700; color:#1c1917; margin-top:2px;">${threat.functionCode}</div>
          </div>
          <div>
            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Object Group / Point</div>
            <div style="font-size:0.82rem; font-family:var(--font-mono); font-weight:700; color:#1c1917; margin-top:2px;">${threat.objectGroup}</div>
          </div>
        </div>

        <div style="margin-bottom:0.5rem;">
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-bottom:0.25rem;">Decoded Hex Payload (DPI Frame)</div>
          <pre style="background:#f5f5f4; border:1px solid var(--border-subtle); border-radius:4px; padding:0.75rem; font-family:var(--font-mono); font-size:0.8rem; color:#1c1917; overflow-x:auto;"><code>${threat.hexPayload}</code></pre>
        </div>

        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.75rem;">
          Stored in: <strong>${threat.storageEngine}</strong>
        </div>
      `;
      modal.classList.add('open');
    }
  }
};

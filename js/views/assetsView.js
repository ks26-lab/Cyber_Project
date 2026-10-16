/**
 * GRIDSEC PostgreSQL / GIS Asset Registry View
 * Displays physical specifications, GIS coordinates, and NERC CIP impact tiers.
 */

window.AssetsView = {
  render: (app) => {
    const nodes = app.graph.getAllNodes();
    return `
      <div class="view-container">
        <div class="view-header">
          <div class="view-title-group">
            <h2>Grid Asset &amp; Substation Registry</h2>
            <p>PostgreSQL / PostGIS physical asset catalogue with NERC CIP Cyber Asset classifications.</p>
          </div>
          <div style="width:280px;">
            <input type="text" id="assetSearchInput" class="soc-input" placeholder="Search asset ID, GIS zone, or voltage..." style="width:100%;" oninput="window.AssetsView.search(this.value)">
          </div>
        </div>

        <div class="soc-table-wrapper">
          <table class="soc-table" id="assetTable">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name &amp; Description</th>
                <th>Grid Level</th>
                <th>Voltage Class</th>
                <th>Capacity</th>
                <th>GIS Sector</th>
                <th>NERC CIP Impact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${nodes.map(n => `
                <tr>
                  <td class="mono-text" style="color:#1c1917; font-weight:700;">${n.id}</td>
                  <td style="font-weight:600; color:#1c1917;">${n.name}</td>
                  <td style="text-transform:capitalize; color:var(--text-muted);">${n.type}</td>
                  <td class="mono-text" style="font-size:0.78rem;">${n.voltage}</td>
                  <td class="mono-text" style="font-size:0.78rem;">${n.capacityMW} MW</td>
                  <td>${n.zone}</td>
                  <td>
                    <span class="badge ${n.capacityMW > 600 ? 'badge-critical' : (n.capacityMW > 300 ? 'badge-warning' : 'badge-neutral')}" style="font-size:0.68rem;">
                      ${n.capacityMW > 600 ? 'High Impact' : (n.capacityMW > 300 ? 'Medium Impact' : 'Low Impact')}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-${n.status === 'compromised' ? 'critical' : (n.status === 'suspicious' ? 'warning' : 'healthy')}">
                      ${n.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  search: (query) => {
    const rows = document.querySelectorAll('#assetTable tbody tr');
    const q = query.toLowerCase();
    rows.forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
};

/**
 * GRIDSEC Interactive 15-Node Training Graph Visualizer
 * High-performance SVG schematic engine with game-level aesthetics:
 * - Stable 2D schematic coordinate projection (no geographic projection clutter).
 * - Interactive node & edge selection with instant asset inspection.
 * - Live algorithm overlays: BFS level rings, DFS traversal paths,
 *   Dijkstra shortest bypasses, Tarjan bridges, and tripped outages.
 * - Zoom, pan, fit network, and reset selection controls.
 * - Compatible with IndiaMapVisualizer API interface.
 */

class TrainingGraphVisualizer {
  constructor(containerId, gridData, onSelectNodeCallback, onSelectTransformerCallback, onTraceOperatorCallback, onSelectBranchCallback) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.data = gridData || window.TRAINING_GRID_DATA;

    this.onSelectNode = onSelectNodeCallback || (() => {});
    this.onSelectTransformer = onSelectTransformerCallback || (() => {});
    this.onTraceOperator = onTraceOperatorCallback || (() => {});
    this.onSelectBranch = onSelectBranchCallback || (() => {});

    this.nodeStates = new Map(); // id -> { state, meta }
    this.edgeStates = new Map(); // id or "u-v" -> { state, meta }
    this.selectedNodeId = null;
    this.selectedEdgeId = null;

    // ViewBox pan/zoom state
    this.baseViewBox = { x: 0, y: 0, width: 920, height: 560 };
    this.currentViewBox = { ...this.baseViewBox };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.backgroundColor = '#0b1120';
    this.container.style.overflow = 'hidden';
    this.container.style.userSelect = 'none';

    // SVG Canvas
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`);
    this.svg.style.display = 'block';

    // Defs for gradients, glowing filters, and markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <!-- Glow Filters -->
      <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <!-- Background Grid Pattern -->
      <pattern id="schematic-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.6" />
      </pattern>

      <!-- Pulse Animation for Outages & Bridges -->
      <style>
        @keyframes pulse-stroke {
          0% { stroke-opacity: 0.4; stroke-width: 3; }
          50% { stroke-opacity: 1; stroke-width: 5; }
          100% { stroke-opacity: 0.4; stroke-width: 3; }
        }
        @keyframes flow-dash {
          to { stroke-dashoffset: -32; }
        }
        .anim-flow {
          stroke-dasharray: 8 6;
          animation: flow-dash 1.2s linear infinite;
        }
        .anim-pulse {
          animation: pulse-stroke 1.5s ease-in-out infinite;
        }
        .node-hover:hover {
          filter: brightness(1.25);
          cursor: pointer;
        }
        .edge-hover:hover {
          stroke-width: 5px !important;
          cursor: pointer;
        }
      </style>
    `;
    this.svg.appendChild(defs);

    // Background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'url(#schematic-grid)');
    this.svg.appendChild(bgRect);

    // Edge layer
    this.edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.edgesGroup.setAttribute('id', 'schematic-edges');
    this.svg.appendChild(this.edgesGroup);

    // Node layer
    this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodesGroup.setAttribute('id', 'schematic-nodes');
    this.svg.appendChild(this.nodesGroup);

    this.container.appendChild(this.svg);

    // Interactive Floating Tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'schematic-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #38bdf8;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      color: #f8fafc;
      font-size: 0.72rem;
      padding: 6px 10px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 50;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    `;
    this.container.appendChild(this.tooltip);

    this.renderGraph();
    this.attachPanZoomEvents();
  }

  renderGraph() {
    if (!this.edgesGroup || !this.nodesGroup) return;
    this.edgesGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';

    const nodesMap = new Map((this.data.nodes || []).map(n => [n.id, n]));

    // 1. Render Transmission Corridors (Edges)
    (this.data.edges || []).forEach(edge => {
      const u = nodesMap.get(edge.from);
      const v = nodesMap.get(edge.to);
      if (!u || !v) return;

      const edgeKey = `${edge.from}-${edge.to}`;
      const revKey = `${edge.to}-${edge.from}`;
      const stateObj = this.edgeStates.get(edge.id) || this.edgeStates.get(edgeKey) || this.edgeStates.get(revKey) || {};
      const isSelected = this.selectedEdgeId === edge.id || this.selectedEdgeId === edgeKey || this.selectedEdgeId === revKey;

      const lineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      lineGroup.setAttribute('class', 'edge-hover');
      lineGroup.setAttribute('data-edge-id', edge.id);

      // Hit-box line for easy clicking
      const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      hitLine.setAttribute('x1', u.x);
      hitLine.setAttribute('y1', u.y);
      hitLine.setAttribute('x2', v.x);
      hitLine.setAttribute('y2', v.y);
      hitLine.setAttribute('stroke', 'transparent');
      hitLine.setAttribute('stroke-width', '16');
      lineGroup.appendChild(hitLine);

      // Visual line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', u.x);
      line.setAttribute('y1', u.y);
      line.setAttribute('x2', v.x);
      line.setAttribute('y2', v.y);

      // Edge Styling based on active gameplay state
      let strokeColor = '#334155';
      let strokeWidth = '2.5';
      let strokeDash = '';
      let filter = '';
      let cssClass = '';

      if (stateObj.state === 'tripped' || edge.status === 'TRIPPED' || edge.status === 'OUT_OF_SERVICE') {
        strokeColor = '#ef4444';
        strokeWidth = '3';
        strokeDash = '6 4';
        filter = 'url(#glow-red)';
      } else if (stateObj.state === 'highlighted_path' || stateObj.state === 'dijkstra_path') {
        strokeColor = '#38bdf8';
        strokeWidth = '4.5';
        filter = 'url(#glow-cyan)';
        cssClass = 'anim-flow';
      } else if (stateObj.state === 'bridge') {
        strokeColor = '#f59e0b';
        strokeWidth = '4';
        filter = 'url(#glow-gold)';
        cssClass = 'anim-pulse';
      } else if (stateObj.state === 'bfs_frontier') {
        strokeColor = '#fbbf24';
        strokeWidth = '3.5';
        strokeDash = '4 4';
      } else if (stateObj.state === 'bfs_visited' || stateObj.state === 'dfs_visited') {
        strokeColor = stateObj.state === 'bfs_visited' ? '#06b6d4' : '#a855f7';
        strokeWidth = '3.5';
      } else if (stateObj.state === 'overloaded') {
        strokeColor = '#f97316';
        strokeWidth = '4';
        cssClass = 'anim-pulse';
      } else if (stateObj.state === 'restored') {
        strokeColor = '#10b981';
        strokeWidth = '3.5';
        filter = 'url(#glow-cyan)';
      } else {
        // Default In-Service
        strokeColor = '#475569';
        strokeWidth = '2.5';
      }

      if (isSelected) {
        strokeColor = '#60a5fa';
        strokeWidth = '5';
      }

      line.setAttribute('stroke', strokeColor);
      line.setAttribute('stroke-width', strokeWidth);
      if (strokeDash) line.setAttribute('stroke-dasharray', strokeDash);
      if (filter) line.setAttribute('filter', filter);
      if (cssClass) line.setAttribute('class', cssClass);

      lineGroup.appendChild(line);

      // Mid-point loss/weight badge
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;
      const weightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      weightText.setAttribute('x', midX);
      weightText.setAttribute('y', midY - 3);
      weightText.setAttribute('text-anchor', 'middle');
      weightText.setAttribute('fill', strokeColor === '#475569' ? '#94a3b8' : strokeColor);
      weightText.setAttribute('font-size', '8px');
      weightText.setAttribute('font-family', 'ui-monospace, monospace');
      weightText.setAttribute('font-weight', '700');
      weightText.textContent = `${edge.lineLossMW || 4} MW`;
      lineGroup.appendChild(weightText);

      // Edge Event Handlers
      lineGroup.onmouseenter = (e) => this.showEdgeTooltip(e, edge);
      lineGroup.onmousemove = (e) => this.moveTooltip(e);
      lineGroup.onmouseleave = () => this.hideTooltip();
      lineGroup.onclick = (e) => {
        e.stopPropagation();
        this.selectedEdgeId = edge.id;
        this.renderGraph();
        this.onSelectBranch(edge);
      };

      this.edgesGroup.appendChild(lineGroup);
    });

    // 2. Render Graph Nodes
    (this.data.nodes || []).forEach(node => {
      const stateObj = this.nodeStates.get(node.id) || {};
      const isSelected = this.selectedNodeId === node.id;

      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      nodeGroup.setAttribute('class', 'node-hover');
      nodeGroup.setAttribute('data-node-id', node.id);
      nodeGroup.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      // Selection Halo
      if (isSelected) {
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('r', '24');
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', '#38bdf8');
        halo.setAttribute('stroke-width', '3');
        halo.setAttribute('stroke-dasharray', '4 2');
        halo.setAttribute('filter', 'url(#glow-cyan)');
        halo.setAttribute('class', 'anim-flow');
        nodeGroup.appendChild(halo);
      }

      // Base Badge Colors & Icons by Node Role
      let fill = '#1e293b';
      let stroke = '#475569';
      let iconColor = '#94a3b8';
      let labelBg = '#0f172a';
      let roleLabel = 'SUB';

      if (node.type === 'generator') {
        fill = '#854d0e';
        stroke = '#eab308';
        iconColor = '#fef08a';
        roleLabel = 'GEN';
      } else if (node.type === 'critical') {
        if (node.subtype === 'hospital') {
          fill = '#831843';
          stroke = '#f43f5e';
          iconColor = '#fecdd3';
          roleLabel = 'HOSP';
        } else if (node.subtype === 'defense') {
          fill = '#4c1d95';
          stroke = '#8b5cf6';
          iconColor = '#ddd6fe';
          roleLabel = 'DEF';
        } else {
          fill = '#164e63';
          stroke = '#06b6d4';
          iconColor = '#cffafe';
          roleLabel = 'UTIL';
        }
      } else if (node.type === 'consumer') {
        fill = '#14532d';
        stroke = '#22c55e';
        iconColor = '#bbf7d0';
        roleLabel = 'CITY';
      }

      // Override based on DSA algorithm state
      if (stateObj.state === 'bfs_visited') {
        stroke = '#06b6d4';
        fill = '#083344';
      } else if (stateObj.state === 'dfs_visited') {
        stroke = '#a855f7';
        fill = '#3b0764';
      } else if (stateObj.state === 'selected' || stateObj.state === 'START' || stateObj.state === 'GOAL') {
        stroke = '#38bdf8';
        fill = '#0369a1';
      } else if (stateObj.state === 'articulation_point') {
        stroke = '#f59e0b';
        fill = '#78350f';
      }

      // Main Node Shape
      if (node.type === 'generator') {
        // Hexagon for power plants
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '-16,0 -8,-14 8,-14 16,0 8,14 -8,14');
        poly.setAttribute('fill', fill);
        poly.setAttribute('stroke', stroke);
        poly.setAttribute('stroke-width', '2.5');
        nodeGroup.appendChild(poly);
      } else if (node.type === 'critical' && node.subtype === 'hospital') {
        // Octagon / Cross for Hospital
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '17');
        circle.setAttribute('fill', fill);
        circle.setAttribute('stroke', stroke);
        circle.setAttribute('stroke-width', '2.5');
        circle.setAttribute('filter', 'url(#glow-red)');
        nodeGroup.appendChild(circle);

        // Hospital Plus Cross
        const hCross = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hCross.setAttribute('d', 'M -4,-8 H 4 V -3 H 9 V 3 H 4 V 8 H -4 V 3 H -9 V -3 H -4 Z');
        hCross.setAttribute('fill', '#ffffff');
        nodeGroup.appendChild(hCross);
      } else {
        // Rounded Square for Substations & Consumers
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-14');
        rect.setAttribute('y', '-14');
        rect.setAttribute('width', '28');
        rect.setAttribute('height', '28');
        rect.setAttribute('rx', '6');
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', '2.5');
        nodeGroup.appendChild(rect);
      }

      // Role Icon / Symbol
      if (!(node.type === 'critical' && node.subtype === 'hospital')) {
        const textIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textIcon.setAttribute('text-anchor', 'middle');
        textIcon.setAttribute('dominant-baseline', 'central');
        textIcon.setAttribute('fill', iconColor);
        textIcon.setAttribute('font-size', '10px');
        textIcon.setAttribute('font-weight', '800');
        textIcon.setAttribute('font-family', 'system-ui, sans-serif');
        textIcon.textContent = roleLabel;
        nodeGroup.appendChild(textIcon);
      }

      // Node ID Label Box below
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('x', '0');
      labelText.setAttribute('y', '26');
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('fill', '#f1f5f9');
      labelText.setAttribute('font-size', '9.5px');
      labelText.setAttribute('font-weight', '700');
      labelText.setAttribute('font-family', 'ui-monospace, monospace');
      labelText.textContent = node.id;
      nodeGroup.appendChild(labelText);

      // Node Event Handlers
      nodeGroup.onmouseenter = (e) => this.showNodeTooltip(e, node);
      nodeGroup.onmousemove = (e) => this.moveTooltip(e);
      nodeGroup.onmouseleave = () => this.hideTooltip();
      nodeGroup.onclick = (e) => {
        e.stopPropagation();
        this.selectedNodeId = node.id;
        this.renderGraph();
        this.onSelectNode(node);
      };

      this.nodesGroup.appendChild(nodeGroup);
    });
  }

  // Tooltip Functions
  showNodeTooltip(e, node) {
    if (!this.tooltip) return;
    const typeLabel = node.type === 'generator' ? 'Power Plant' : (node.type === 'critical' ? 'Critical Facility' : (node.type === 'consumer' ? 'Demand Center' : 'Substation'));
    this.tooltip.innerHTML = `
      <div style="font-weight:800; font-size:0.78rem; color:#38bdf8; margin-bottom:2px;">
        <i class="fa-solid fa-bolt"></i> ${node.name} (${node.id})
      </div>
      <div style="color:#94a3b8; font-size:0.68rem; margin-bottom:4px;">${typeLabel} &middot; Zone: ${node.zone || 'Central'}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.68rem; border-top:1px solid #334155; padding-top:4px;">
        <div>Voltage: <strong style="color:#f1f5f9;">${node.voltage}</strong></div>
        <div>Capacity: <strong style="color:#f1f5f9;">${node.capacityMW} MW</strong></div>
        ${node.genMW ? `<div>Gen: <strong style="color:#22c55e;">${node.genMW} MW</strong></div>` : ''}
        ${node.demandMW ? `<div>Demand: <strong style="color:#f59e0b;">${node.demandMW} MW</strong></div>` : ''}
      </div>
      <div style="font-size:0.65rem; color:#38bdf8; margin-top:3px;">Click to select &amp; inspect</div>
    `;
    this.tooltip.style.display = 'block';
    this.moveTooltip(e);
  }

  showEdgeTooltip(e, edge) {
    if (!this.tooltip) return;
    const isTripped = edge.status === 'TRIPPED' || edge.status === 'OUT_OF_SERVICE';
    this.tooltip.innerHTML = `
      <div style="font-weight:800; font-size:0.75rem; color:#f1f5f9; margin-bottom:2px;">
        <i class="fa-solid fa-network-wired" style="color:#0284c7;"></i> ${edge.id || `${edge.from} ↔ ${edge.to}`}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.68rem; border-top:1px solid #334155; padding-top:4px;">
        <div>Loss Weight: <strong style="color:#38bdf8;">${edge.lineLossMW} MW</strong></div>
        <div>Length: <strong style="color:#f1f5f9;">${edge.lengthKm || 20} km</strong></div>
        <div>Capacity: <strong style="color:#f1f5f9;">${edge.maxLoadMW || 400} MW</strong></div>
        <div>Status: <strong style="color:${isTripped ? '#ef4444' : '#10b981'};">${isTripped ? 'TRIPPED (0 MW)' : 'IN SERVICE'}</strong></div>
      </div>
      ${edge.isBridge ? `<div style="color:#f59e0b; font-size:0.66rem; margin-top:3px;"><i class="fa-solid fa-bridge"></i> <strong>Topological Bridge</strong> (low[v] > tin[u])</div>` : ''}
      <div style="font-size:0.65rem; color:#38bdf8; margin-top:3px;">Click to inspect corridor</div>
    `;
    this.tooltip.style.display = 'block';
    this.moveTooltip(e);
  }

  moveTooltip(e) {
    if (!this.tooltip || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left + 14;
    const y = e.clientY - rect.top + 14;
    this.tooltip.style.left = `${Math.min(x, rect.width - 230)}px`;
    this.tooltip.style.top = `${Math.min(y, rect.height - 90)}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  // Pan & Zoom Controls
  attachPanZoomEvents() {
    if (!this.svg) return;

    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg || e.target.tagName === 'rect') {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.svg.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = (e.clientX - this.panStart.x) * (this.currentViewBox.width / this.container.clientWidth);
      const dy = (e.clientY - this.panStart.y) * (this.currentViewBox.height / this.container.clientHeight);
      this.currentViewBox.x -= dx;
      this.currentViewBox.y -= dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.updateViewBox();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.svg) this.svg.style.cursor = 'default';
      }
    });

    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      const newWidth = this.currentViewBox.width * zoomFactor;
      const newHeight = this.currentViewBox.height * zoomFactor;

      if (newWidth > 300 && newWidth < 1800) {
        this.currentViewBox.x += (this.currentViewBox.width - newWidth) / 2;
        this.currentViewBox.y += (this.currentViewBox.height - newHeight) / 2;
        this.currentViewBox.width = newWidth;
        this.currentViewBox.height = newHeight;
        this.updateViewBox();
      }
    }, { passive: false });
  }

  updateViewBox() {
    if (this.svg) {
      this.svg.setAttribute('viewBox', `${this.currentViewBox.x} ${this.currentViewBox.y} ${this.currentViewBox.width} ${this.currentViewBox.height}`);
    }
  }

  fitNetwork() {
    this.currentViewBox = { ...this.baseViewBox };
    this.updateViewBox();
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.renderGraph();
  }

  // IndiaMapVisualizer compatible API methods
  setInfrastructureState(id, state, meta = {}) {
    if (!id) return;
    const isNode = this.data.nodes?.some(n => n.id === id);
    if (isNode) {
      this.nodeStates.set(id, { state, meta });
    } else {
      this.edgeStates.set(id, { state, meta });
      // If id is in form LINE-A-B or A-B, map both
      if (id.includes('-')) {
        const parts = id.replace(/^LINE-|^EDGE-/, '').split('-');
        if (parts.length === 2) {
          this.edgeStates.set(`${parts[0]}-${parts[1]}`, { state, meta });
          this.edgeStates.set(`${parts[1]}-${parts[0]}`, { state, meta });
        }
      }
    }
    this.renderGraph();
  }

  resetInfrastructureStates() {
    this.nodeStates.clear();
    this.edgeStates.clear();
    this.renderGraph();
  }

  selectAsset(id, type) {
    if (type === 'BUS' || type === 'NODE') {
      this.selectedNodeId = id;
    } else {
      this.selectedEdgeId = id;
    }
    this.renderGraph();
  }
}

window.TrainingGraphVisualizer = TrainingGraphVisualizer;

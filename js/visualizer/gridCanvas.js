/**
 * GRIDSEC Warm Editorial Canvas Visualizer (No Blue, Warm Stone & Forest Palette)
 */

class GridVisualizer {
  constructor(canvasId, graph, onNodeSelectCallback) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.graph = graph;
    this.onNodeSelect = onNodeSelectCallback || (() => {});

    // Camera transform
    this.scale = 1;
    this.offsetX = 30;
    this.offsetY = 30;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Highlights & Filters
    this.selectedNodeId = null;
    this.highlightedPath = [];
    this.highlightedEdges = [];
    this.highlightMode = 'normal';
    this.filterType = 'all';
    this.filterStatus = 'all';

    // Particle flow
    this.particles = [];
    this.initParticles();

    this.initEvents();
    this.resize();
    this.startRenderLoop();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 25; i++) {
      this.particles.push({
        edgeIndex: Math.floor(Math.random() * this.graph.edges.length),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.004
      });
    }
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.offsetX = e.clientX - this.dragStartX;
      this.offsetY = e.clientY - this.dragStartY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;

      this.offsetX = mouseX - (mouseX - this.offsetX) * zoomFactor;
      this.offsetY = mouseY - (mouseY - this.offsetY) * zoomFactor;
      this.scale *= zoomFactor;
      this.scale = Math.min(Math.max(0.4, this.scale), 3.0);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - this.offsetX) / this.scale;
      const clickY = (e.clientY - rect.top - this.offsetY) / this.scale;

      const clickedNode = this.getNodeAt(clickX, clickY);
      if (clickedNode) {
        this.selectedNodeId = clickedNode.id;
        this.onNodeSelect(clickedNode);
      }
    });
  }

  getNodeAt(x, y) {
    const nodes = this.graph.getAllNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const radius = 20;
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= radius) return node;
    }
    return null;
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 3.0);
  }

  zoomOut() {
    this.scale = Math.max(this.scale * 0.8, 0.4);
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 30;
    this.offsetY = 30;
  }

  setHighlightPath(path, mode = 'route') {
    this.highlightedPath = path;
    this.highlightMode = mode;
  }

  clearHighlights() {
    this.highlightedPath = [];
    this.highlightedEdges = [];
    this.highlightMode = 'normal';
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 1. Draw Transmission Lines
    this.drawEdges();

    // 2. Draw Energy Flow Particles
    this.drawParticles();

    // 3. Draw Nodes & Substations
    this.drawNodes();

    ctx.restore();
  }

  drawEdges() {
    const { ctx } = this;
    const edges = this.graph.edges;

    edges.forEach(edge => {
      const u = this.graph.getNode(edge.from);
      const v = this.graph.getNode(edge.to);
      if (!u || !v) return;

      const isPathEdge = this.isEdgeInHighlightedPath(edge.from, edge.to);

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);

      if (isPathEdge) {
        if (this.highlightMode === 'attack') {
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = '#166534'; // Forest Green for safe route
          ctx.lineWidth = 3;
        }
      } else if (u.status === 'isolated' || v.status === 'isolated') {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
      } else if (edge.data.status === 'compromised' || u.status === 'compromised' || v.status === 'compromised') {
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 2;
      } else if (edge.data.status === 'backup') {
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
      } else {
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1.5;
      }

      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  drawParticles() {
    const { ctx } = this;
    const edges = this.graph.edges;

    this.particles.forEach(p => {
      if (p.edgeIndex >= edges.length) return;
      const edge = edges[p.edgeIndex];
      const u = this.graph.getNode(edge.from);
      const v = this.graph.getNode(edge.to);
      if (!u || !v) return;

      if (u.status !== 'isolated' && v.status !== 'isolated' && edge.data.status !== 'tripped') {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const px = u.x + (v.x - u.x) * p.progress;
        const py = u.y + (v.y - u.y) * p.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = this.isEdgeInHighlightedPath(edge.from, edge.to) ? '#166534' : '#44403c';
        ctx.fill();
      }
    });
  }

  drawNodes() {
    const { ctx } = this;
    const nodes = this.graph.getAllNodes();

    nodes.forEach(node => {
      if (this.filterType !== 'all' && node.type !== this.filterType) return;
      if (this.filterStatus !== 'all' && node.status !== this.filterStatus) return;

      const isSelected = node.id === this.selectedNodeId;
      const inHighlightPath = this.highlightedPath.includes(node.id);
      let radius = node.type === 'plant' ? 13 : (node.type === 'critical' ? 12 : 10);

      // Outer Selection Ring
      if (isSelected || inHighlightPath) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = inHighlightPath && this.highlightMode === 'attack' ? '#b91c1c' : '#166534';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

      if (node.status === 'compromised') {
        ctx.fillStyle = '#fef2f2';
        ctx.strokeStyle = '#b91c1c';
      } else if (node.status === 'suspicious') {
        ctx.fillStyle = '#fffbeb';
        ctx.strokeStyle = '#b45309';
      } else if (node.status === 'isolated') {
        ctx.fillStyle = '#fdf4ff';
        ctx.strokeStyle = '#78350f';
      } else if (node.type === 'critical') {
        ctx.fillStyle = '#f0fdf4';
        ctx.strokeStyle = '#15803d';
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1c1917';
      }

      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Node ID Label
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = node.status === 'compromised' ? '#b91c1c' : '#1c1917';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, node.x, node.y + radius + 14);

      // MW Subtitle
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillStyle = '#78716c';
      ctx.fillText(`${node.currentMW} MW`, node.x, node.y + radius + 25);
    });
  }

  isEdgeInHighlightedPath(from, to) {
    if (this.highlightedPath.length < 2) return false;
    for (let i = 0; i < this.highlightedPath.length - 1; i++) {
      const u = this.highlightedPath[i];
      const v = this.highlightedPath[i + 1];
      if ((u === from && v === to) || (u === to && v === from)) return true;
    }
    return false;
  }
}

window.GridVisualizer = GridVisualizer;

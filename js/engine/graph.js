/**
 * GRIDSEC Graph Model
 * Manages vertices, edges, weights, risk scores, and dynamic isolation states.
 */

class GridGraph {
  constructor() {
    this.nodes = new Map(); // id -> Node
    this.adjacency = new Map(); // id -> Array<{ target, weight, edgeRef }>
    this.edges = [];
  }

  loadData(gridData) {
    this.nodes.clear();
    this.adjacency.clear();
    this.edges = [];

    gridData.nodes.forEach(n => {
      this.addNode({ ...n });
    });

    gridData.edges.forEach(e => {
      this.addEdge(e.from, e.to, e);
    });
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(from, to, data) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return;

    const weight = (data.lineLossMW || 5) + ((this.nodes.get(to)?.riskScore || 0) * 0.1);
    
    this.adjacency.get(from).push({ target: to, weight, data });
    this.adjacency.get(to).push({ target: from, weight, data }); // Undirected power line
    this.edges.push({ from, to, data, weight });
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getNeighbors(id) {
    return this.adjacency.get(id) || [];
  }

  isolateNode(id) {
    const node = this.nodes.get(id);
    if (node) {
      node.status = 'isolated';
    }
  }

  restoreNode(id) {
    const node = this.nodes.get(id);
    if (node) {
      node.status = 'healthy';
      node.riskScore = 10;
    }
  }
}

window.GridGraph = GridGraph;

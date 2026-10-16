/**
 * GRIDSEC Computational DSA Engine
 * Algorithms:
 * 1. Breadth-First Search (BFS) - Attack Path Traversal & Blast Radius
 * 2. Dijkstra with Min-Heap - Min-Risk Power Flow & Telemetry Rerouting
 * 3. Tarjan's Bridge & Articulation Point - Critical Single Point of Failure (SPoF)
 * 4. Disjoint Set Union (DSU) - Grid Partition Islanding Detection
 * 5. Binary Max-Heap - Threat & Incident Dynamic Prioritization
 * 6. Prefix Trie - Real-Time Asset Fast Lookup
 * 7. Circular Buffer - High-Throughput SCADA Telemetry Stream
 */

// Min-Heap Priority Queue for Dijkstra
class MinPriorityQueue {
  constructor() {
    this.heap = [];
  }
  insert(node, priority) {
    this.heap.push({ node, priority });
    this._bubbleUp(this.heap.length - 1);
  }
  extractMin() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }
  isEmpty() {
    return this.heap.length === 0;
  }
  _bubbleUp(idx) {
    const element = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (element.priority >= parent.priority) break;
      this.heap[idx] = parent;
      this.heap[parentIdx] = element;
      idx = parentIdx;
    }
  }
  _sinkDown(idx) {
    const length = this.heap.length;
    const element = this.heap[idx];
    while (true) {
      let leftChildIdx = 2 * idx + 1;
      let rightChildIdx = 2 * idx + 2;
      let swap = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < element.priority) {
          swap = leftChildIdx;
        }
      }
      if (rightChildIdx < length) {
        if (
          (swap === null && this.heap[rightChildIdx].priority < element.priority) ||
          (swap !== null && this.heap[rightChildIdx].priority < this.heap[leftChildIdx].priority)
        ) {
          swap = rightChildIdx;
        }
      }
      if (swap === null) break;
      this.heap[idx] = this.heap[swap];
      this.heap[swap] = element;
      idx = swap;
    }
  }
}

// Disjoint Set Union (DSU) with Path Compression & Union by Rank
class DisjointSetUnion {
  constructor(elements) {
    this.parent = new Map();
    this.rank = new Map();
    elements.forEach(el => {
      this.parent.set(el, el);
      this.rank.set(el, 0);
    });
    this.numSets = elements.length;
  }

  find(i) {
    if (this.parent.get(i) === i) return i;
    const root = this.find(this.parent.get(i));
    this.parent.set(i, root); // Path compression
    return root;
  }

  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      const rankI = this.rank.get(rootI);
      const rankJ = this.rank.get(rootJ);
      if (rankI < rankJ) {
        this.parent.set(rootI, rootJ);
      } else if (rankI > rankJ) {
        this.parent.set(rootJ, rootI);
      } else {
        this.parent.set(rootJ, rootI);
        this.rank.set(rootI, rankI + 1);
      }
      this.numSets--;
      return true;
    }
    return false;
  }
}

// Prefix Trie for SCADA Asset fast search
class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.assetData = null;
  }
}

class AssetTrie {
  constructor() {
    this.root = new TrieNode();
  }
  insert(word, asset) {
    let current = this.root;
    const cleanWord = word.toLowerCase();
    for (const char of cleanWord) {
      if (!current.children[char]) {
        current.children[char] = new TrieNode();
      }
      current = current.children[char];
    }
    current.isEndOfWord = true;
    current.assetData = asset;
  }
  searchPrefix(prefix) {
    let current = this.root;
    const cleanPrefix = prefix.toLowerCase();
    for (const char of cleanPrefix) {
      if (!current.children[char]) return [];
      current = current.children[char];
    }
    const results = [];
    this._collectAll(current, results);
    return results;
  }
  _collectAll(node, results) {
    if (node.isEndOfWord && node.assetData) {
      results.push(node.assetData);
    }
    for (const char in node.children) {
      this._collectAll(node.children[char], results);
    }
  }
}

// Circular Buffer for Live SCADA Telemetry Logs
class SCADACircularBuffer {
  constructor(capacity = 50) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
  push(item) {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity; // Overwrite oldest
    }
  }
  getAll() {
    const items = [];
    for (let i = 0; i < this.size; i++) {
      const idx = (this.tail - 1 - i + this.capacity) % this.capacity;
      items.push(this.buffer[idx]);
    }
    return items;
  }
}

// Core DSA Engine Interface
class DsaEngine {
  constructor(graph) {
    this.graph = graph;
    this.assetTrie = new AssetTrie();
    this.logBuffer = new SCADACircularBuffer(100);
    this.lastBenchmark = null;
    this.initTrie();
  }

  initTrie() {
    this.graph.getAllNodes().forEach(node => {
      this.assetTrie.insert(node.id, node);
      this.assetTrie.insert(node.name, node);
    });
  }

  // 1. BFS: Trace Attack Path Propagation & Blast Radius
  traceAttackPath(sourceId, maxHops = 4) {
    const startTime = performance.now();
    let opCount = 0;

    const visited = new Set([sourceId]);
    const queue = [{ id: sourceId, hop: 0, path: [sourceId] }];
    const propagationTree = [];
    const criticalAffected = [];

    while (queue.length > 0) {
      opCount++;
      const { id, hop, path } = queue.shift();
      if (hop >= maxHops) continue;

      const neighbors = this.graph.getNeighbors(id);
      for (const edge of neighbors) {
        opCount++;
        const targetNode = this.graph.getNode(edge.target);
        if (!targetNode || targetNode.status === 'isolated') continue;

        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          const nextPath = [...path, edge.target];

          if (targetNode.type === 'critical') {
            criticalAffected.push(targetNode);
          }

          propagationTree.push({
            from: id,
            to: edge.target,
            hop: hop + 1,
            path: nextPath,
            targetNode
          });

          queue.push({ id: edge.target, hop: hop + 1, path: nextPath });
        }
      }
    }

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Attack Path Propagation Analysis',
      algorithm: 'Breadth-First Search (BFS)',
      dataStructure: 'Graph Adjacency List + FIFO Queue',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

    return {
      sourceId,
      visitedNodes: Array.from(visited),
      propagationTree,
      criticalAffected,
      blastRadiusHops: maxHops,
      benchmark: this.lastBenchmark
    };
  }

  // 2. Dijkstra: Resilient Alternate Route Calculation
  findAlternateRoute(sourceId, targetId, excludedNodes = new Set()) {
    const startTime = performance.now();
    let opCount = 0;

    const minHeap = new MinPriorityQueue();
    const distances = new Map();
    const previous = new Map();
    const allNodes = this.graph.getAllNodes();

    allNodes.forEach(n => distances.set(n.id, Infinity));
    distances.set(sourceId, 0);
    minHeap.insert(sourceId, 0);

    while (!minHeap.isEmpty()) {
      opCount++;
      const { node: u, priority: currentRisk } = minHeap.extractMin();
      if (u === targetId) break;

      const neighbors = this.graph.getNeighbors(u);
      for (const edge of neighbors) {
        opCount++;
        const v = edge.target;
        const targetObj = this.graph.getNode(v);

        // Skip excluded (compromised or isolated) nodes
        if (excludedNodes.has(v) || targetObj?.status === 'isolated' || targetObj?.status === 'compromised') {
          continue;
        }

        const cost = (edge.data.lineLossMW || 5) + ((targetObj?.riskScore || 0) * 0.2);
        const alt = currentRisk + cost;

        if (alt < distances.get(v)) {
          distances.set(v, alt);
          previous.set(v, u);
          minHeap.insert(v, alt);
        }
      }
    }

    // Reconstruct path
    const path = [];
    let curr = targetId;
    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr);
      if (curr === sourceId) {
        path.unshift(sourceId);
        break;
      }
    }

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Min-Risk Power/Telemetry Alternate Rerouting',
      algorithm: "Dijkstra's Shortest Safe Path",
      dataStructure: 'Weighted Graph + Binary Min-Heap Priority Queue',
      timeComplexity: 'O((V + E) log V)',
      spaceComplexity: 'O(V)',
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

      const isFound = path.length > 1 && path[0] === sourceId;
    const powerLoss = isFound ? this.evaluatePathPowerLoss(path) : 0;
    return {
      success: isFound,
      sourceId,
      targetId,
      path: isFound ? path : [],
      powerLoss,
      totalRiskWeight: distances.get(targetId) || 0,
      benchmark: this.lastBenchmark
    };
  }

  // Calculate cumulative power loss (I²R MW) along a node path
  evaluatePathPowerLoss(path) {
    if (!path || path.length < 2) return 0;
    let totalLoss = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const neighbors = this.graph.getNeighbors(u);
      const edge = neighbors.find(e => e.target === v);
      if (edge && edge.data) {
        totalLoss += parseFloat(edge.data.lineLossMW || 5.0);
      } else {
        totalLoss += 6.5; // Default line loss per hop if unspecified
      }
    }
    return Math.round(totalLoss * 10) / 10;
  }

  // Candidate Route Generator with Controlled Randomization
  findCandidateRoutes(sourceId, targetId, excludedNodes = new Set(), options = {}) {
    const startTime = performance.now();
    const candidateMap = new Map();

    // 1. Primary Base Route
    const baseRes = this.findAlternateRoute(sourceId, targetId, excludedNodes);
    if (baseRes.success) {
      const key = baseRes.path.join('->');
      candidateMap.set(key, {
        path: baseRes.path,
        powerLoss: baseRes.powerLoss,
        riskWeight: baseRes.totalRiskWeight,
        rank: 1
      });

      // 2. Perturbation & Penalty Iterations to find distinct alternate candidate paths
      if (baseRes.path.length > 2) {
        const intermediateNodes = baseRes.path.slice(1, -1);
        intermediateNodes.forEach(nodeToPenalize => {
          const tempExcluded = new Set(excludedNodes);
          tempExcluded.add(nodeToPenalize);
          const altRes = this.findAlternateRoute(sourceId, targetId, tempExcluded);
          if (altRes.success) {
            const altKey = altRes.path.join('->');
            if (!candidateMap.has(altKey)) {
              candidateMap.set(altKey, {
                path: altRes.path,
                powerLoss: altRes.powerLoss,
                riskWeight: altRes.totalRiskWeight,
                rank: candidateMap.size + 1
              });
            }
          }
        });
      }
    }

    const candidates = Array.from(candidateMap.values()).sort((a, b) => a.powerLoss - b.powerLoss);

    if (candidates.length === 0) {
      return {
        success: false,
        sourceId,
        targetId,
        path: [],
        candidateRoutes: [],
        powerLoss: 0,
        totalRiskWeight: 0,
        benchmark: this.lastBenchmark
      };
    }

    // Controlled selection: pick top candidate (or randomized among top 2-3 if options.randomize is true)
    let selectedCandidate = candidates[0];
    if (options.randomize && candidates.length > 1) {
      const pickIndex = Math.floor(Math.random() * Math.min(candidates.length, 3));
      selectedCandidate = candidates[pickIndex];
    }

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    return {
      success: true,
      sourceId,
      targetId,
      path: selectedCandidate.path,
      powerLoss: selectedCandidate.powerLoss,
      totalRiskWeight: selectedCandidate.riskWeight,
      candidateRoutes: candidates,
      candidateCount: candidates.length,
      benchmark: {
        action: 'Controlled Multi-Candidate Path Routing',
        algorithm: "Dijkstra with Edge Penalty Iteration",
        dataStructure: 'Binary Min-Heap Queue',
        timeComplexity: 'O(K * (V + E) log V)',
        spaceComplexity: 'O(V)',
        executionTimeUs: durationUs
      }
    };
  }

  // 3. Tarjan's Algorithm: Identify Critical Bridges & Articulation Points
  findSinglePointsOfFailure() {
    const startTime = performance.now();
    let opCount = 0;

    const nodes = this.graph.getAllNodes();
    const discovery = new Map();
    const low = new Map();
    const visited = new Set();
    const articulationPoints = new Set();
    const bridges = [];
    let timer = 0;

    const dfs = (u, parent = null) => {
      opCount++;
      visited.add(u);
      discovery.set(u, ++timer);
      low.set(u, timer);
      let children = 0;

      const neighbors = this.graph.getNeighbors(u);
      for (const edge of neighbors) {
        opCount++;
        const v = edge.target;
        if (v === parent) continue;

        if (visited.has(v)) {
          low.set(u, Math.min(low.get(u), discovery.get(v)));
        } else {
          children++;
          dfs(v, u);
          low.set(u, Math.min(low.get(u), low.get(v)));

          // Check Articulation Point
          if (parent !== null && low.get(v) >= discovery.get(u)) {
            articulationPoints.add(u);
          }

          // Check Bridge
          if (low.get(v) > discovery.get(u)) {
            bridges.push({ from: u, to: v });
          }
        }
      }

      if (parent === null && children > 1) {
        articulationPoints.add(u);
      }
    };

    nodes.forEach(n => {
      if (!visited.has(n.id)) {
        dfs(n.id);
      }
    });

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Grid Single Point of Failure (SPoF) & Bridge Detection',
      algorithm: "Tarjan's Articulation Points & Bridges (DFS)",
      dataStructure: 'DFS Tree + Low-Link Lookup Map',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

    return {
      articulationPoints: Array.from(articulationPoints).map(id => this.graph.getNode(id)),
      bridges,
      benchmark: this.lastBenchmark
    };
  }

  // 4. DSU: Grid Partition & Islanding Detection
  detectGridIslands() {
    const startTime = performance.now();
    let opCount = 0;

    const allNodes = this.graph.getAllNodes();
    const nodeIds = allNodes.map(n => n.id);
    const dsu = new DisjointSetUnion(nodeIds);

    this.graph.edges.forEach(edge => {
      opCount++;
      const nodeFrom = this.graph.getNode(edge.from);
      const nodeTo = this.graph.getNode(edge.to);

      // Only unite non-isolated and active links
      if (nodeFrom?.status !== 'isolated' && nodeTo?.status !== 'isolated' && edge.data.status !== 'tripped') {
        dsu.union(edge.from, edge.to);
      }
    });

    // Group nodes into island clusters
    const islands = new Map();
    nodeIds.forEach(id => {
      opCount++;
      const root = dsu.find(id);
      if (!islands.has(root)) {
        islands.set(root, []);
      }
      islands.get(root).push(this.graph.getNode(id));
    });

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Grid Islanding & Partition Detection',
      algorithm: 'Disjoint Set Union (DSU) with Path Compression',
      dataStructure: 'Union-Find Forest + Rank Arrays',
      timeComplexity: 'O(E · α(V)) ≈ O(E)',
      spaceComplexity: 'O(V)',
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

    return {
      numIslands: islands.size,
      islandClusters: Array.from(islands.values()),
      isPartitioned: islands.size > 1,
      benchmark: this.lastBenchmark
    };
  }
}

window.DsaEngine = DsaEngine;
window.SCADACircularBuffer = SCADACircularBuffer;

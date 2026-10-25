/**
 * GRIDSEC Computational DSA Engine
 * Authentic implementations of Core Data Structures & Algorithms for Power Grid Operations:
 * 1. Breadth-First Search (BFS) - Level-by-level network reachability & exploration frontier
 * 2. Depth-First Search (DFS) - Deep structural traversal & cycle detection
 * 3. Dijkstra's Shortest Path with Binary Min-Heap - Minimum-cost corridor rerouting
 * 4. Tarjan's Bridge & Articulation Point Algorithm - Critical Single Points of Failure (SPoFs)
 * 5. Disjoint Set Union (DSU) - Grid partition & islanding detection with generation-load balancing
 * 6. Binary Max-Heap Priority Queue - Multi-incident dynamic risk prioritization
 * 7. Prefix Trie - Real-Time Substation & Asset fast lookup
 * 8. Circular Buffer - High-Throughput SCADA Telemetry Stream
 */

// ============================================================================
// 1. DATA STRUCTURE: Binary Min-Heap Priority Queue (Used by Dijkstra)
// ============================================================================
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

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  getHeapArray() {
    return this.heap.map(item => ({ node: item.node, priority: item.priority }));
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

// ============================================================================
// 2. DATA STRUCTURE: Binary Max-Heap Priority Queue (Used for Incident Prioritization)
// ============================================================================
class MaxPriorityQueue {
  constructor() {
    this.heap = [];
    this._seq = 0;
  }

  insert(item, priority) {
    this.heap.push({ item, priority, seq: this._seq++ });
    this._bubbleUp(this.heap.length - 1);
  }

  extractMax() {
    if (this.isEmpty()) return null;
    const max = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return max;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  getHeapArray() {
    return this.heap.map(h => ({ item: h.item, priority: h.priority }));
  }

  _isHigher(a, b) {
    if (a.priority !== b.priority) {
      return a.priority > b.priority;
    }
    // Deterministic tie-breaker:
    const idA = a.item?.id || a.item?.assetId || '';
    const idB = b.item?.id || b.item?.assetId || '';
    if (idA && idB && idA !== idB) {
      return idA.localeCompare(idB) < 0;
    }
    return (a.seq || 0) < (b.seq || 0);
  }

  _bubbleUp(idx) {
    const element = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (!this._isHigher(element, parent)) break;
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
        if (this._isHigher(this.heap[leftChildIdx], element)) {
          swap = leftChildIdx;
        }
      }
      if (rightChildIdx < length) {
        if (
          (swap === null && this._isHigher(this.heap[rightChildIdx], element)) ||
          (swap !== null && this._isHigher(this.heap[rightChildIdx], this.heap[leftChildIdx]))
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

// ============================================================================
// 3. DATA STRUCTURE: Disjoint Set Union (DSU) with Path Compression & Union by Rank
// ============================================================================
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
      const rankI = this.rank.get(rootI) || 0;
      const rankJ = this.rank.get(rootJ) || 0;
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

// ============================================================================
// 4. DATA STRUCTURE: Prefix Trie for Substation & Asset Fast Search
// ============================================================================
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
    if (!word) return;
    let current = this.root;
    const cleanWord = String(word).toLowerCase();
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
    if (!prefix) return [];
    let current = this.root;
    const cleanPrefix = String(prefix).toLowerCase();
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

// ============================================================================
// 5. DATA STRUCTURE: Circular Buffer for High-Throughput SCADA Telemetry Stream
// ============================================================================
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

// ============================================================================
// CORE DSA ENGINE CLASS: Graph Traversals & Optimization Algorithms
// ============================================================================
class DsaEngine {
  constructor(graph) {
    this.graph = graph;
    this.assetTrie = new AssetTrie();
    this.logBuffer = new SCADACircularBuffer(100);
    this.lastBenchmark = null;
    this.initTrie();
  }

  initTrie() {
    if (!this.graph || !this.graph.getAllNodes) return;
    this.graph.getAllNodes().forEach(node => {
      this.assetTrie.insert(node.id, node);
      this.assetTrie.insert(node.name, node);
    });
  }

  /**
   * Helper: Check if an edge is excluded (tripped, out of service, or explicitly filtered)
   */
  isEdgeExcluded(edge, excludedEdges) {
    if (!excludedEdges || excludedEdges.size === 0) return false;
    const edgeId = edge.data?.id;
    const key1 = `${edge.from}-${edge.to}`;
    const key2 = `${edge.to}-${edge.from}`;
    const edgeKey1 = `EDGE-${edge.from}-${edge.to}`;
    const edgeKey2 = `EDGE-${edge.to}-${edge.from}`;

    return (
      (edgeId && excludedEdges.has(edgeId)) ||
      excludedEdges.has(key1) ||
      excludedEdges.has(key2) ||
      excludedEdges.has(edgeKey1) ||
      excludedEdges.has(edgeKey2)
    );
  }

  // --------------------------------------------------------------------------
  // ALGORITHM A: Breadth-First Search (BFS) — "Trace Connected Network"
  // --------------------------------------------------------------------------
  runBFS(sourceId, excludedEdges = new Set(), maxHops = Infinity) {
    const startTime = performance.now();
    let opCount = 0;
    let examinedEdgesCount = 0;

    const allNodes = this.graph.getAllNodes();
    const sourceNode = this.graph.getNode(sourceId);
    if (!sourceNode) {
      return {
        success: false,
        error: `Source node ${sourceId} not found in graph model.`,
        visitedOrder: [],
        visitedSet: [],
        unreachableNodes: allNodes.map(n => n.id)
      };
    }

    const visited = new Set([sourceId]);
    const queue = [{ id: sourceId, hop: 0 }];
    let queueHead = 0; // O(1) pointer-based FIFO dequeue
    const visitedOrder = [sourceId];
    const levels = { [sourceId]: 0 };
    const queueSnapshots = [];
    const treeEdges = [];

    // Capture initial queue state
    queueSnapshots.push({
      step: 0,
      activeNode: sourceId,
      queue: queue.slice(queueHead).map(q => q.id),
      visitedCount: visited.size
    });

    let step = 0;
    while (queueHead < queue.length) {
      opCount++;
      const current = queue[queueHead++];
      const u = current.id;
      const hop = current.hop;

      if (hop >= maxHops) continue;

      // Deterministic neighbor exploration: sorted alphabetically by target ID
      const neighbors = (this.graph.getNeighbors(u) || [])
        .slice()
        .sort((a, b) => a.target.localeCompare(b.target));

      for (const edge of neighbors) {
        examinedEdgesCount++;
        opCount++;
        const v = edge.target;
        const targetNode = this.graph.getNode(v);

        // Check node isolation or edge exclusion
        if (!targetNode || targetNode.status === 'isolated') continue;
        if (this.isEdgeExcluded({ from: u, to: v, data: edge.data }, excludedEdges)) continue;

        if (!visited.has(v)) {
          visited.add(v);
          visitedOrder.push(v);
          levels[v] = hop + 1;
          treeEdges.push({ from: u, to: v, level: hop + 1 });
          queue.push({ id: v, hop: hop + 1 });

          step++;
          if (queueSnapshots.length < 25) {
            queueSnapshots.push({
              step,
              activeNode: v,
              queue: queue.slice(queueHead).map(q => q.id),
              visitedCount: visited.size
            });
          }
        }
      }
    }

    const unreachableNodes = allNodes
      .map(n => n.id)
      .filter(id => !visited.has(id));

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Trace Connected Network Reachability',
      algorithm: 'Breadth-First Search (BFS)',
      dataStructure: 'FIFO Queue + Adjacency List',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      visitedNodes: visited.size,
      examinedEdges: examinedEdgesCount,
      executionTimeUs: durationUs
    };

    return {
      success: true,
      sourceId,
      visitedOrder,
      visitedSet: Array.from(visited),
      levels,
      unreachableNodes,
      queueSnapshots,
      treeEdges,
      examinedEdgesCount,
      visitedCount: visited.size,
      totalGraphNodes: allNodes.length,
      totalGraphEdges: this.graph.edges.length,
      benchmark: this.lastBenchmark
    };
  }

  // Backwards-compatible alias for existing simulator callers
  traceAttackPath(sourceId, maxHops = 4) {
    return this.runBFS(sourceId, new Set(), maxHops);
  }

  // --------------------------------------------------------------------------
  // ALGORITHM B: Depth-First Search (DFS) — "Deep Network Inspection"
  // --------------------------------------------------------------------------
  runDFS(sourceId, excludedEdges = new Set(), maxDepth = Infinity) {
    const startTime = performance.now();
    let opCount = 0;
    let examinedEdgesCount = 0;

    const allNodes = this.graph.getAllNodes();
    const sourceNode = this.graph.getNode(sourceId);
    if (!sourceNode) {
      return {
        success: false,
        error: `Source node ${sourceId} not found in graph model.`,
        traversalOrder: [],
        visitedSet: [],
        unreachableNodes: allNodes.map(n => n.id)
      };
    }

    const visited = new Set();
    const traversalOrder = [];
    const treeEdges = [];
    const backEdges = [];
    const stackSnapshots = [];
    const currentStack = [];

    const dfsVisit = (u, parent = null, depth = 0) => {
      opCount++;
      visited.add(u);
      traversalOrder.push(u);
      currentStack.push(u);

      if (stackSnapshots.length < 25) {
        stackSnapshots.push({
          step: traversalOrder.length,
          activeNode: u,
          stack: [...currentStack],
          depth
        });
      }

      if (depth >= maxDepth) {
        currentStack.pop();
        return;
      }

      // Deterministic traversal: sorted alphabetically by target ID
      const neighbors = (this.graph.getNeighbors(u) || [])
        .slice()
        .sort((a, b) => a.target.localeCompare(b.target));

      for (const edge of neighbors) {
        examinedEdgesCount++;
        opCount++;
        const v = edge.target;
        const targetNode = this.graph.getNode(v);

        if (!targetNode || targetNode.status === 'isolated') continue;
        if (this.isEdgeExcluded({ from: u, to: v, data: edge.data }, excludedEdges)) continue;

        if (!visited.has(v)) {
          treeEdges.push({ from: u, to: v, depth: depth + 1 });
          dfsVisit(v, u, depth + 1);
        } else if (v !== parent) {
          // Visited neighbor that is not immediate parent indicates a cycle (back edge)
          backEdges.push({ from: u, to: v });
        }
      }

      currentStack.pop();
    };

    dfsVisit(sourceId, null, 0);

    const unreachableNodes = allNodes
      .map(n => n.id)
      .filter(id => !visited.has(id));

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Deep Network Inspection & Cycle Detection',
      algorithm: 'Depth-First Search (DFS)',
      dataStructure: 'LIFO Call Stack + Adjacency List',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      visitedNodes: visited.size,
      examinedEdges: examinedEdgesCount,
      executionTimeUs: durationUs
    };

    return {
      success: true,
      sourceId,
      traversalOrder,
      visitedSet: Array.from(visited),
      unreachableNodes,
      stackSnapshots,
      treeEdges,
      backEdges,
      cyclesDetected: backEdges.length > 0,
      cycleCount: backEdges.length,
      examinedEdgesCount,
      visitedCount: visited.size,
      totalGraphNodes: allNodes.length,
      totalGraphEdges: this.graph.edges.length,
      benchmark: this.lastBenchmark
    };
  }

  // --------------------------------------------------------------------------
  // ALGORITHM C: Dijkstra's Shortest Path — "Find Alternative Route"
  // --------------------------------------------------------------------------
  findAlternateRoute(sourceId, targetId, excludedEdges = new Set(), options = {}) {
    const startTime = performance.now();
    let opCount = 0;
    let examinedEdgesCount = 0;

    const minHeap = new MinPriorityQueue();
    const distances = new Map();
    const previous = new Map();
    const exploredNodes = [];
    const relaxedEdges = [];
    const heapSnapshots = [];
    const allNodes = this.graph.getAllNodes();

    allNodes.forEach(n => distances.set(n.id, Infinity));
    distances.set(sourceId, 0);
    minHeap.insert(sourceId, 0);

    const weightStrategy = options.weightStrategy || 'loss'; // 'loss' | 'distance' | 'hop'

    while (!minHeap.isEmpty()) {
      opCount++;
      const minItem = minHeap.extractMin();
      const u = minItem.node;
      const currentDist = minItem.priority;

      // Skip stale heap entry if a shorter path was already processed
      if (currentDist > distances.get(u)) {
        continue;
      }

      exploredNodes.push({ node: u, distance: Math.round(currentDist * 100) / 100 });

      if (heapSnapshots.length < 20) {
        heapSnapshots.push({
          extracted: u,
          extractedDist: currentDist,
          heap: minHeap.getHeapArray()
        });
      }

      if (u === targetId) break;

      const neighbors = this.graph.getNeighbors(u) || [];
      for (const edge of neighbors) {
        examinedEdgesCount++;
        opCount++;
        const v = edge.target;
        const targetObj = this.graph.getNode(v);

        if (!targetObj || targetObj.status === 'isolated' || targetObj.status === 'compromised') {
          continue;
        }

        // Check edge exclusion
        if (this.isEdgeExcluded({ from: u, to: v, data: edge.data }, excludedEdges)) {
          continue;
        }

        // Non-negative edge weight calculation
        let weight = 5.0;
        if (weightStrategy === 'distance') {
          weight = Math.max(1.0, parseFloat(edge.data?.distanceKm || 20.0));
        } else if (weightStrategy === 'hop') {
          weight = 1.0;
        } else {
          // 'loss'
          weight = Math.max(0.5, parseFloat(edge.data?.lineLossMW || 5.0) + ((targetObj?.riskScore || 0) * 0.1));
        }

        const alt = currentDist + weight;
        if (alt < distances.get(v)) {
          const oldDist = distances.get(v);
          distances.set(v, alt);
          previous.set(v, u);
          minHeap.insert(v, alt);

          relaxedEdges.push({
            from: u,
            to: v,
            oldDistance: oldDist === Infinity ? '∞' : Math.round(oldDist * 10) / 10,
            newDistance: Math.round(alt * 10) / 10,
            edgeWeight: Math.round(weight * 10) / 10
          });
        }
      }
    }

    // Path reconstruction
    const path = [];
    let curr = targetId;
    while (curr) {
      path.unshift(curr);
      if (curr === sourceId) break;
      curr = previous.get(curr);
    }

    const isFound = path.length > 1 && path[0] === sourceId;
    const pathEdges = [];
    if (isFound) {
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const neighbors = this.graph.getNeighbors(u) || [];
        const match = neighbors.find(e => e.target === v);
        pathEdges.push(match?.data?.id || `LINE-${u}-${v}`);
      }
    }

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Find Alternative Route / Min-Cost Corridor',
      algorithm: "Dijkstra's Shortest Path",
      dataStructure: 'Binary Min-Heap Priority Queue + Adjacency List',
      timeComplexity: 'O((V + E) log V)',
      spaceComplexity: 'O(V)',
      exploredNodesCount: exploredNodes.length,
      examinedEdges: examinedEdgesCount,
      relaxedEdgesCount: relaxedEdges.length,
      executionTimeUs: durationUs
    };

    const powerLoss = isFound ? this.evaluatePathPowerLoss(path) : 0;
    return {
      success: isFound,
      sourceId,
      targetId,
      path: isFound ? path : [],
      pathEdges: isFound ? pathEdges : [],
      powerLoss,
      totalCost: isFound ? Math.round((distances.get(targetId) || 0) * 100) / 100 : Infinity,
      totalRiskWeight: distances.get(targetId) || 0,
      exploredNodes,
      relaxedEdges,
      heapSnapshots,
      examinedEdgesCount,
      weightStrategy,
      benchmark: this.lastBenchmark
    };
  }

  evaluatePathPowerLoss(path) {
    if (!path || path.length < 2) return 0;
    let totalLoss = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const neighbors = this.graph.getNeighbors(u) || [];
      const edge = neighbors.find(e => e.target === v);
      if (edge && edge.data) {
        totalLoss += parseFloat(edge.data.lineLossMW || 5.0);
      } else {
        totalLoss += 6.5;
      }
    }
    return Math.round(totalLoss * 10) / 10;
  }

  findCandidateRoutes(sourceId, targetId, excludedNodes = new Set(), options = {}) {
    const excludedEdges = new Set();
    const baseRes = this.findAlternateRoute(sourceId, targetId, excludedEdges, options);
    if (!baseRes.success) {
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

    const candidates = [{
      path: baseRes.path,
      powerLoss: baseRes.powerLoss,
      riskWeight: baseRes.totalRiskWeight,
      rank: 1
    }];

    return {
      success: true,
      sourceId,
      targetId,
      path: baseRes.path,
      powerLoss: baseRes.powerLoss,
      totalRiskWeight: baseRes.totalRiskWeight,
      candidateRoutes: candidates,
      candidateCount: candidates.length,
      benchmark: baseRes.benchmark
    };
  }

  // --------------------------------------------------------------------------
  // ALGORITHM D: Binary Max-Heap Priority Queue — "Prioritize Critical Incidents"
  // --------------------------------------------------------------------------
  prioritizeIncidentsHeap(incidentList = []) {
    const startTime = performance.now();
    let opCount = 0;

    const maxHeap = new MaxPriorityQueue();
    const heapSnapshots = [];
    const extractionSteps = [];

    // Step 1: Insert all incidents into the Binary Max-Heap
    incidentList.forEach((incident, index) => {
      opCount++;
      const priority = typeof incident.severityScore === 'number'
        ? incident.severityScore
        : (incident.priority || 50);

      maxHeap.insert({
        ...incident,
        insertOrder: index + 1
      }, priority);

      if (heapSnapshots.length < 15) {
        heapSnapshots.push({
          step: index + 1,
          action: 'INSERT',
          insertedId: incident.id || incident.assetId,
          priority,
          heapArray: maxHeap.getHeapArray().map(h => ({
            id: h.item.id || h.item.assetId,
            priority: h.priority
          }))
        });
      }
    });

    // Step 2: Extract in descending priority order
    const prioritizedIncidents = [];
    let rank = 1;
    while (!maxHeap.isEmpty()) {
      opCount++;
      const maxItem = maxHeap.extractMax();
      prioritizedIncidents.push({
        rank,
        incident: maxItem.item,
        severityScore: maxItem.priority,
        reason: maxItem.item.reason || `Priority score: ${maxItem.priority}`
      });

      if (extractionSteps.length < 15) {
        extractionSteps.push({
          rank,
          extractedId: maxItem.item.id || maxItem.item.assetId,
          priority: maxItem.priority,
          remainingInHeap: maxHeap.size()
        });
      }
      rank++;
    }

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Prioritize Critical Grid Incidents',
      algorithm: 'Binary Max-Heap Priority Queue',
      dataStructure: 'Binary Max-Heap Array',
      timeComplexity: 'O(N log N) for N insertions & extractions',
      spaceComplexity: 'O(N)',
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

    return {
      success: true,
      prioritizedIncidents,
      heapSnapshots,
      extractionSteps,
      totalIncidents: incidentList.length,
      benchmark: this.lastBenchmark
    };
  }

  // --------------------------------------------------------------------------
  // ALGORITHM E: Tarjan's Bridge-Finding Algorithm — "Find Critical Transmission Links"
  // --------------------------------------------------------------------------
  findSinglePointsOfFailure(excludedEdges = new Set()) {
    const startTime = performance.now();
    let opCount = 0;
    let examinedEdgesCount = 0;

    const allNodes = this.graph.getAllNodes();
    const discovery = new Map();
    const low = new Map();
    const visited = new Set();
    const articulationPoints = new Set();
    const bridges = [];
    const dfsTreeEdges = [];
    const backEdges = [];
    let timer = 0;
    let numComponents = 0;

    const dfs = (u, parent = null, parentEdgeId = null) => {
      opCount++;
      visited.add(u);
      discovery.set(u, ++timer);
      low.set(u, timer);
      let children = 0;

      const neighbors = (this.graph.getNeighbors(u) || [])
        .slice()
        .sort((a, b) => a.target.localeCompare(b.target));

      for (const edge of neighbors) {
        examinedEdgesCount++;
        opCount++;
        const v = edge.target;
        const edgeId = edge.data?.id || (u < v ? `${u}-${v}` : `${v}-${u}`);
        if (parentEdgeId && edgeId === parentEdgeId) continue;
        if (!parentEdgeId && v === parent) continue;

        // Check node isolation or edge exclusion
        const targetNode = this.graph.getNode(v);
        if (!targetNode || targetNode.status === 'isolated') continue;
        if (this.isEdgeExcluded({ from: u, to: v, data: edge.data }, excludedEdges)) continue;

        if (visited.has(v)) {
          // Back-edge (cycle or parallel edge to parent)
          low.set(u, Math.min(low.get(u), discovery.get(v)));
          backEdges.push({ from: u, to: v });
        } else {
          // Tree-edge
          children++;
          dfsTreeEdges.push({ from: u, to: v });
          dfs(v, u, edgeId);
          low.set(u, Math.min(low.get(u), low.get(v)));

          // Articulation Point Condition (non-root)
          if (parent !== null && low.get(v) >= discovery.get(u)) {
            articulationPoints.add(u);
          }

          // Tarjan's Bridge Condition: low[v] > tin[u]
          if (low.get(v) > discovery.get(u)) {
            const lineId = edge.data?.id || `LINE-${u}-${v}`;
            bridges.push({
              from: u,
              to: v,
              lineId,
              tin_u: discovery.get(u),
              low_v: low.get(v),
              condition: `low[${v}] (${low.get(v)}) > tin[${u}] (${discovery.get(u)})`
            });
          }
        }
      }

      // Root articulation point condition
      if (parent === null && children > 1) {
        articulationPoints.add(u);
      }
    };

    // Handle all connected components if graph is disconnected
    allNodes.forEach(n => {
      if (!visited.has(n.id) && n.status !== 'isolated') {
        numComponents++;
        dfs(n.id, null);
      }
    });

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Find Critical Transmission Links & SPoFs',
      algorithm: "Tarjan's Bridge & Articulation Point Search",
      dataStructure: 'DFS Tree + Low-Link Lookup Map',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V)',
      operationsCount: opCount,
      examinedEdges: examinedEdgesCount,
      executionTimeUs: durationUs
    };

    return {
      success: true,
      bridges,
      articulationPoints: Array.from(articulationPoints).map(id => this.graph.getNode(id)),
      discoveryTimes: Object.fromEntries(discovery),
      lowLinkValues: Object.fromEntries(low),
      dfsTreeEdges,
      backEdges,
      numComponents,
      totalBridges: bridges.length,
      totalArticulationPoints: articulationPoints.size,
      benchmark: this.lastBenchmark
    };
  }

  // --------------------------------------------------------------------------
  // ALGORITHM F: Disjoint Set Union (DSU) — "Detect Grid Islands"
  // --------------------------------------------------------------------------
  detectGridIslands(excludedEdges = new Set()) {
    const startTime = performance.now();
    let opCount = 0;

    const allNodes = this.graph.getAllNodes();
    const nodeIds = allNodes.map(n => n.id);
    const dsu = new DisjointSetUnion(nodeIds);
    let unionOpsCount = 0;

    this.graph.edges.forEach(edge => {
      opCount++;
      const nodeFrom = this.graph.getNode(edge.from);
      const nodeTo = this.graph.getNode(edge.to);

      // Skip isolated nodes, tripped edges, or explicitly excluded edges
      if (nodeFrom?.status === 'isolated' || nodeTo?.status === 'isolated') return;
      if (edge.data?.status === 'tripped') return;
      if (this.isEdgeExcluded(edge, excludedEdges)) return;

      dsu.union(edge.from, edge.to);
      unionOpsCount++;
    });

    // Group nodes into island clusters
    const islandMap = new Map();
    nodeIds.forEach(id => {
      opCount++;
      const root = dsu.find(id);
      if (!islandMap.has(root)) {
        islandMap.set(root, []);
      }
      islandMap.get(root).push(this.graph.getNode(id));
    });

    // Compute generation, demand, and critical load metrics for each island
    const islands = Array.from(islandMap.entries()).map(([root, nodes], idx) => {
      let totalGenMW = 0;
      let totalLoadMW = 0;
      let hasCriticalLoads = false;
      let hasGenerators = false;

      nodes.forEach(n => {
        if (!n) return;
        if (n.type === 'generator') {
          hasGenerators = true;
          totalGenMW += (n.capacityMW || n.currentMW || 0);
        }
        if (n.type === 'substation' || n.type === 'critical') {
          totalLoadMW += (n.currentMW || 10);
        }
        if (n.type === 'critical' || (n.name && n.name.toLowerCase().includes('critical'))) {
          hasCriticalLoads = true;
        }
      });

      totalGenMW = Math.round(totalGenMW * 10) / 10;
      totalLoadMW = Math.round(totalLoadMW * 10) / 10;

      return {
        islandId: `Island ${idx + 1} (Root: ${root})`,
        root,
        nodes,
        nodeIds: nodes.map(n => n.id),
        totalGenMW,
        totalLoadMW,
        balanceMW: Math.round((totalGenMW - totalLoadMW) * 10) / 10,
        isDeficit: totalGenMW < totalLoadMW,
        hasGenerators,
        hasCriticalLoads,
        status: totalGenMW >= totalLoadMW ? 'SELF_SUFFICIENT' : 'DEFICIT_AT_RISK'
      };
    });

    const durationUs = Math.round((performance.now() - startTime) * 1000);
    this.lastBenchmark = {
      action: 'Detect Grid Islands & Partitioning',
      algorithm: 'Disjoint Set Union (DSU) with Path Compression',
      dataStructure: 'Union-Find Forest + Rank Arrays',
      timeComplexity: 'O(E · α(V)) ≈ O(E)',
      spaceComplexity: 'O(V)',
      unionOperationsCount: unionOpsCount,
      operationsCount: opCount,
      executionTimeUs: durationUs
    };

    return {
      success: true,
      numIslands: islands.length,
      islands,
      islandClusters: Array.from(islandMap.values()),
      isPartitioned: islands.length > 1,
      benchmark: this.lastBenchmark
    };
  }
}

// Global Exports
window.MinPriorityQueue = MinPriorityQueue;
window.MaxPriorityQueue = MaxPriorityQueue;
window.DisjointSetUnion = DisjointSetUnion;
window.AssetTrie = AssetTrie;
window.SCADACircularBuffer = SCADACircularBuffer;
window.DsaEngine = DsaEngine;

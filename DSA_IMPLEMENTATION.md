# GRIDSEC // ZERO — Data Structures & Algorithms Implementation Reference

All 13 algorithms are implemented in [`backend/app/dsa/algorithms_catalog.py`](file:///Users/umikasood/Cyber_Project/backend/app/dsa/algorithms_catalog.py) alongside [`backend/app/dsa/trace.py`](file:///Users/umikasood/Cyber_Project/backend/app/dsa/trace.py), [`backend/app/dsa/priority_queue.py`](file:///Users/umikasood/Cyber_Project/backend/app/dsa/priority_queue.py), and [`backend/app/dsa/hashing.py`](file:///Users/umikasood/Cyber_Project/backend/app/dsa/hashing.py). Every execution produces an `AlgorithmTrace` containing synchronized pseudocode line pointers, step-by-step operations (`AlgorithmTraceStep`), internal data-structure snapshots (`frontier_state`), theoretical asymptotic complexity, empirical operation counts, and execution runtime in milliseconds.

---

## Complete 13-Algorithm Catalog

| # | Algorithm ID | Data Structure / Paradigm | Time Complexity | Space Complexity | Power Grid Engineering Role |
|---|---|---|---|---|---|
| 1 | `BFS` | `collections.deque` $O(1)$ FIFO Queue | $O(V + E)$ | $O(V)$ | Energized bus reachability from slack/BESS sources & hop-distance blast radius |
| 2 | `DFS` | Explicit LIFO Stack + Parent Tracking | $O(V + E)$ | $O(V)$ | Connected island enumeration & closed-loop cycle detection |
| 3 | `DIJKSTRA` | Binary `MinHeap` Priority Queue | $O((V + E) \log V)$ | $O(V)$ | Minimum-impedance ($\lvert Z \rvert = \sqrt{R^2 + X^2}$) backfeed tie-switch pathfinding |
| 4 | `TARJAN_BRIDGES` | Depth-First `tin[]` & `low[]` Discovery Arrays | $O(V + E)$ | $O(V)$ | Single-point-of-failure (SPoF) bridge branches & articulation substations |
| 5 | `DSU` | `DisjointSetUnion` (Path Compression + Union by Rank) | $O(E \cdot \alpha(V))$ | $O(V)$ | Dynamic island tracking & cycle-free radial reconfiguration check |
| 6 | `KRUSKAL_MST` | Sorted Branch Array + `DisjointSetUnion` | $O(E \log E)$ | $O(V + E)$ | Minimum-ohmic-loss radial spanning forest across tie switches |
| 7 | `KNAPSACK_DP` | 2D Dynamic Programming Table `dp[i][w]` | $O(N \cdot W)$ | $O(N \cdot W)$ | Optimal critical-load preservation & Tier-3 load shedding under supply deficit |
| 8 | `MIN_COST_MAX_FLOW` | Residual Network + Successive Shortest-Path | $O(F \cdot E \log V)$ | $O(V + E)$ | Multi-source (Substation + BESS + Solar) capacity-constrained power routing |
| 9 | `ASTAR_ROUTING` | Binary `MinHeap` + 3D Euclidean Impedance Heuristic | $O((V + E) \log V)$ | $O(V)$ | Spatial-electrical emergency tie-switch routing toward de-energized critical loads |
| 10 | `MAX_HEAP_TRIAGE` | Binary `MaxHeap` ($O(\log N)$ sift-up / sift-down) | $O(N \log N)$ | $O(N)$ | Emergency restoration prioritization for Tier-1 Hospital, Water & SCADA loads |
| 11 | `HASH_INDEX` | Multi-Key Inverted Hash Table (`AssetIndexTable`) | $O(1)$ average lookup | $O(N)$ | Constant-time resolution of substation IDs, priority tiers, and pincodes |
| 12 | `PREFIX_TRIE` | Character Tree (`PincodeTrie`) | $O(L)$ prefix search | $O(N \cdot L)$ | Instant prefix autocomplete across bus codes and regional pincodes |
| 13 | `CIRCULAR_BUFFER` | Fixed-Capacity Ring Array (`CircularTelemetryBuffer`) | $O(1)$ write/read | $O(K)$ | Bounded-memory sliding window for 50 Hz PMU synchrophasor telemetry |

---

## Pre-Existing Defect Fixes Verified

1. **Legacy Frontend BFS Queue (`js/engine/dsaEngine.js`)**: Replaced $O(V)$ `queue.shift()` array shifting with an $O(1)$ head-pointer (`qHead++`) FIFO queue so frontend BFS achieves true $O(V + E)$ time complexity.
2. **Backend BFS Queue (`backend/app/dsa/bfs.py` & `algorithms_catalog.py`)**: Uses `collections.deque.popleft()` ($O(1)$) and emits per-step FIFO queue snapshots.
3. **True Post-Action AC Candidate Validation (`backend/app/power/power_flow_service.py`)**: Upgraded candidate route validation from reading pre-existing static topology flows to cloning the network, applying candidate switch/BESS/curtailment actions, and solving a true post-action Newton-Raphson AC load flow.


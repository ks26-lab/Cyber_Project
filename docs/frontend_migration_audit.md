# GRIDSEC Frontend-to-Physics Migration Audit

This document cataloges all existing frontend functions, mock generators, and local UI simulations that will be migrated to the backend physics-driven simulation core in subsequent phases.

---

## 1. Identified Frontend Mock / Local Heuristics

### A. Simulator & Contingency View (`js/views/simulatorView.js`)
| Current UI Behavior | Current Source / Mechanism | Target Backend API (Phase 3+) |
| :--- | :--- | :--- |
| **N-1 Line Tripping Simulation** | Locally sets node/line CSS styles and updates text strings | `POST /api/simulation/{id}/contingency` |
| **Simulated Cascade Steps** | Simple JS timer loop with synthetic step increments | `POST /api/cascades/trigger` & `/ws/grid` |
| **Line Load Overload Colors** | Hardcoded CSS class toggling based on static percentage | `LinePhysicalState.loading_percent` from Solver |
| **Restoration / Alternate Route** | Local text notification | `POST /api/power-flow/validate-route` |

### B. Network Analysis & DSA View (`js/views/networkAnalysisView.js`, `js/engine/dsaEngine.js`)
| Current UI Behavior | Current Source / Mechanism | Target Backend API (Phase 3+) |
| :--- | :--- | :--- |
| **Dijkstra Alternate Route Finding** | Client-side Dijkstra calculation using static weights | `POST /api/analysis/alternate-route` with `validate-route` AC check |
| **BFS Cyber Blast Radius** | Client-side BFS traversal on `indiaGridData.js` graph | `POST /api/analysis/impact` |
| **DFS Islanding Breakdown** | Client-side connected component traversal | `GET /api/analysis/connectivity` |
| **Priority Queue Incident Ordering** | Client-side min/max heap ranking | `GET /api/incidents` |

### C. Live Dashboard & Telemetry (`js/views/dashboardView.js`, `js/views/mapView.js`)
| Current UI Behavior | Current Source / Mechanism | Target Backend API (Phase 3+) |
| :--- | :--- | :--- |
| **50.00 Hz Frequency Jitter** | Local `Math.random()` timer tick | `/ws/grid` `NATIONAL_TELEMETRY_TICK` |
| **Substation MW Loading Gauge** | Static capacity calculation | `BusPhysicalState` & `GeneratorPhysicalState` |
| **Transformer Temperature / DGA** | Simulated formula in `telemetry_service` | `/api/assets/{id}` telemetry history |
| **Line Flow Thickness / Animations** | Static capacity mapping | `LinePhysicalState.p_from_mw` from Newton-Raphson |

---

## 2. Migration Policy & Rules
1. **Zero UI Disruption**: No frontend function is deprecated until its backend endpoint is fully verified with integration tests.
2. **Provenance Labels**: All displayed metrics in the UI must indicate provenance (`SOLVER_DERIVED`, `REAL_REFERENCE`, `SIMULATED`).
3. **Immutability Guarantee**: When the user launches a "What-If" drill in the UI, it must target a sandbox `simulation_id` without mutating the base 59-node Indian grid.

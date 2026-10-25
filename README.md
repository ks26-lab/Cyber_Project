# GRIDSEC // ZERO — THE CITY MUST STAY ALIVE

**Cyber-Physical Grid Resilience, Intelligent Critical-Load Restoration & Explainable Graph Optimization**

[![Solver Provenance](https://img.shields.io/badge/Physics_Solver-pandapower_3.5.6_AC_Newton--Raphson-10B981)](file:///Users/umikasood/Cyber_Project/POWER_MODEL.md)
[![DSA Catalog](https://img.shields.io/badge/DSA_Catalog-13_Explainable_Algorithms-8B5CF6)](file:///Users/umikasood/Cyber_Project/DSA_IMPLEMENTATION.md)
[![Restoration Engine](https://img.shields.io/badge/Proposed_Algorithm-8--Stage_CAPER-22D3EE)](file:///Users/umikasood/Cyber_Project/CAPER_METHOD.md)
[![Backend Pytest](https://img.shields.io/badge/Backend_Pytest-328%2F328_Passing-10B981)](file:///Users/umikasood/Cyber_Project/IMPLEMENTATION_STATUS.md)

---

## Overview

**GRIDSEC // ZERO** transforms the **GRIDSEC** power-grid cybersecurity and resilience platform into a unified 3-experience cyber-physical application:

1. **Experience A — The 3D City Strategy Game (`/simulation`, `/missions`, `/challenge`)**:
   - Interactive Three.js / React Three Fiber 3D city where operators defend and restore critical urban infrastructure (**Trauma Hospital**, **Municipal Water Treatment**, **SCADA Command Center**, **Engineering University**, **Residential Districts**, **Solar PV**, and **Grid BESS**) across **7 playable campaign missions**.
2. **Experience B — The AC Power-Flow Engineering Simulator (`/dashboard`, `/national-grid`, `/sandbox`)**:
   - Authentic nonlinear Newton-Raphson AC load-flow calculations (`pandapower 3.5.6`) across 4 networks:
     - `TRAINING_FEEDER`: 12-Bus 33/11 kV Urban Distribution Feeder (4 tie switches, 2 BESS units)
     - `IEEE_33_DISTRIBUTION`: Standard Baran & Wu (1989) 33-Bus 12.66 kV Radial Distribution Benchmark (`pandapower.networks.case33bw()`, 5 tie switches, 2 BESS units)
     - `IEEE_30`: IEEE 30-Bus 132/33 kV Transmission Benchmark
     - `INDIA_GRID_59`: 59-Substation Indian National Power Grid Reference across 5 RLDC regions
   - Discrete-time Battery Energy Storage System (`BatteryModel`) enforcing power ($\text{kW}$) vs. energy ($\text{kWh}$) state-of-charge physics.
3. **Experience C — The Explainable DSA & CAPER Research Laboratory (`/algorithms`, `/algorithms/caper`, `/research`)**:
   - **13-Algorithm DSA Catalog** with step-by-step trace replay and live data-structure frontier inspection (`BFS`, `DFS`, `DIJKSTRA`, `TARJAN_BRIDGES`, `DSU`, `KRUSKAL_MST`, `KNAPSACK_DP`, `MIN_COST_MAX_FLOW`, `ASTAR_ROUTING`, `MAX_HEAP_TRIAGE`, `HASH_INDEX`, `PREFIX_TRIE`, `CIRCULAR_BUFFER`).
   - **Proposed 8-Stage CAPER Engine** (*Criticality-Aware Power Emergency Restoration*) benchmarked against 4 baselines (`PRIORITY_GREEDY`, `GRAPH_GREEDY`, `AC_GREEDY`, and `MILP_REFERENCE` via SciPy HiGHS) with full multi-seed statistical distributions (`Mean ± SD`, `Median / IQR`, `95% CI`, `AC Feasibility Rate %`) and CSV export.

---

## Quick Start

### 1. Start the FastAPI + `pandapower` Backend (`Port 8000`)

```bash
# From the repository root:
/Users/umikasood/Cyber_Project/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

- **Backend API Root**: `http://127.0.0.1:8000/api/gridzero/session`
- **Swagger OpenAPI Docs**: `http://127.0.0.1:8000/docs`
- **Legacy GRIDSEC HTML Application**: `http://127.0.0.1:8000/index.html`, `/app.html`, `/game.html`

### 2. Start the Next.js 14 + React Three Fiber Frontend (`Port 3000`)

```bash
cd apps/web
npm run dev
```

- **GRID//ZERO Web Application**: `http://localhost:3000`

### 3. Run Automated Verification Suites

```bash
# Run all 328 backend pytest tests:
/Users/umikasood/Cyber_Project/.venv/bin/pytest backend/ --ignore=backend/test_backend.py --ignore=backend/app/power/test_networks.py -q

# Run frontend TypeScript & production build checks:
npm run typecheck --prefix apps/web
npm run build --prefix apps/web
```

---

## Documentation Index

- **[ARCHITECTURE.md](file:///Users/umikasood/Cyber_Project/ARCHITECTURE.md)** — Hybrid monorepo architecture, route map, and unified session state design.
- **[DSA_IMPLEMENTATION.md](file:///Users/umikasood/Cyber_Project/DSA_IMPLEMENTATION.md)** — All 13 Data Structures & Algorithms, complexity analysis, and step-trace contracts.
- **[POWER_MODEL.md](file:///Users/umikasood/Cyber_Project/POWER_MODEL.md)** — Nonlinear AC Newton-Raphson equations, 4 network models, and discrete-time BESS physics.
- **[CAPER_METHOD.md](file:///Users/umikasood/Cyber_Project/CAPER_METHOD.md)** — Mathematical formulation and 8-stage pipeline of the proposed CAPER restoration algorithm.
- **[RESEARCH.md](file:///Users/umikasood/Cyber_Project/RESEARCH.md)** — Reproducible multi-seed benchmark protocol, statistical tables, and empirical findings.
- **[DEMO_GUIDE.md](file:///Users/umikasood/Cyber_Project/DEMO_GUIDE.md)** — 5-minute live faculty review and technical interview script.
- **[IMPLEMENTATION_STATUS.md](file:///Users/umikasood/Cyber_Project/IMPLEMENTATION_STATUS.md)** — Complete implementation and verification ledger.
- **[docs/upgrade/BASELINE_AUDIT.md](file:///Users/umikasood/Cyber_Project/docs/upgrade/BASELINE_AUDIT.md)** — Pre-upgrade baseline audit and legacy compatibility checklist.

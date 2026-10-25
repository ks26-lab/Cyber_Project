# GRIDSEC // ZERO — System Architecture & Engineering Specification

**Parent Platform:** GRIDSEC — Power Grid Cybersecurity & Resilience Platform  
**Flagship Module:** **GRID//ZERO — THE CITY MUST STAY ALIVE**  
**Subtitle:** *Cyber-Physical Grid Resilience, Intelligent Critical-Load Restoration & Explainable Graph Optimization*

---

## 1. High-Level Hybrid Monorepo Architecture

The repository implements a unified hybrid monorepo combining the modern **GRID//ZERO** Next.js 14 + TypeScript + React Three Fiber 3D application (`apps/web/`) with the expanded Python 3.13 + FastAPI + `pandapower` AC physics + SQLite backend (`backend/`), while preserving 100% of legacy GRIDSEC HTML/JS views (`index.html`, `app.html`, `game.html`).

```mermaid
flowchart TD
    subgraph Frontend ["apps/web — Next.js 14 + TypeScript + R3F 3D Frontend (Port 3000)"]
        UI_HOME["/ — Cinematic Homepage & Live 3D City Preview"]
        UI_SIM["/simulation — 3D City Command & Engineering Simulator"]
        UI_MISS["/missions & /missions/[id] — 7 Tactical Campaign Missions"]
        UI_DSA["/algorithms — 13-Algorithm Interactive DSA Trace Lab"]
        UI_CAPER["/algorithms/caper — 8-Stage CAPER Inspector"]
        UI_DASH["/dashboard — AC Voltage, Thermal & BESS Dashboard"]
        UI_RES["/research & /runs/[id] — Multi-Seed Scientific Benchmarks"]
        UI_CHAL["/challenge — Human vs. CAPER & 4 Baselines Arena"]
        UI_STORE["Zustand Authoritative Store (useSimulationStore.ts)"]
        R3F["React Three Fiber / Three.js 3D City Canvas (CityCanvas3D.tsx)"]
    end

    subgraph Backend ["backend/ — FastAPI + pandapower 3.5.6 + SciPy 1.18.1 (Port 8000)"]
        API_GZ["/api/gridzero/* — Unified GRID//ZERO Router"]
        API_PF["/api/power-flow/* — AC Load Flow & Contingency Router"]
        API_CYB["/api/cyber/*, /api/cascades/*, /api/aegis/* — Legacy + Upgraded Routers"]
        SESS["SimulationSessionManager (Transactional Revisions & Undo)"]
        DSA_CAT["GridDSACatalog (13 Algorithms + Step-by-Step AlgorithmTrace)"]
        CAPER_ENG["CAPEREngine (8-Stage Hybrid Graph + DP + AC Verification)"]
        BASELINES["BaselineRestorationSuite (Priority, Graph, AC-Greedy, SciPy MILP)"]
        EXP_RUN["ExperimentRunner (Multi-Seed Statistical Benchmark Engine)"]
        PP_SOLVER["PowerFlowSolver (pandapower Newton-Raphson AC Solver)"]
    end

    UI_HOME & UI_SIM & UI_MISS & UI_DSA & UI_CAPER & UI_DASH & UI_RES & UI_CHAL --> UI_STORE
    UI_STORE --> R3F
    UI_STORE <-->|REST JSON / Next.js Rewrite| API_GZ
    API_GZ --> SESS & DSA_CAT & CAPER_ENG & BASELINES & EXP_RUN
    SESS & CAPER_ENG & BASELINES & EXP_RUN --> PP_SOLVER
```

---

## 2. Directory Structure

```text
Cyber_Project/
├── apps/
│   └── web/                                  # Next.js App Router + TypeScript + Tailwind + R3F
│       ├── src/
│       │   ├── app/                          # 15 Application Routes
│       │   │   ├── page.tsx                  # / (Homepage & Live 3D City Preview)
│       │   │   ├── simulation/page.tsx       # /simulation (3D City Command Center)
│       │   │   ├── missions/page.tsx         # /missions (7 Campaign Missions Catalog)
│       │   │   ├── missions/[id]/page.tsx    # /missions/[id] (Playable Mission Cockpit)
│       │   │   ├── algorithms/page.tsx       # /algorithms (13-Algorithm DSA Trace Lab)
│       │   │   ├── algorithms/caper/page.tsx # /algorithms/caper (8-Stage CAPER Inspector)
│       │   │   ├── dashboard/page.tsx        # /dashboard (Power Engineering Dashboard)
│       │   │   ├── research/page.tsx         # /research (Multi-Seed Benchmark Suite)
│       │   │   ├── runs/[id]/page.tsx        # /runs/[id] (Individual Run Trial Ledger)
│       │   │   ├── challenge/page.tsx        # /challenge (Human vs. AI Arena)
│       │   │   ├── national-grid/page.tsx    # /national-grid (India 59-Bus & IEEE 30-Bus)
│       │   │   ├── cyber-lab/page.tsx        # /cyber-lab (GOOSE / FDIA / Aegis Defense)
│       │   │   ├── sandbox/page.tsx          # /sandbox (Open-Ended Topology Sandbox)
│       │   │   ├── docs/page.tsx             # /docs (Interactive System Documentation)
│       │   │   └── demo/page.tsx             # /demo (5-Minute Faculty Walkthrough)
│       │   ├── components/
│       │   │   ├── city3d/CityCanvas3D.tsx   # Procedural 3D City, Feeders, Switches & HUD
│       │   │   ├── layout/TopNavBar.tsx      # Global SCADA Header & Telemetry Strip
│       │   │   └── simulation/EngineeringInspector.tsx
│       │   ├── data/missionsCatalog.ts       # Authoritative 7 Missions Specification
│       │   └── store/useSimulationStore.ts   # Zustand Transactional Client Store
├── backend/
│   ├── app/
│   │   ├── api/routes/gridzero.py            # Unified GRID//ZERO REST API
│   │   ├── dsa/
│   │   │   ├── trace.py                      # AlgorithmTrace & AlgorithmTraceStep Schemas
│   │   │   ├── algorithms_catalog.py         # All 13 DSA Implementations & Trace Generators
│   │   │   ├── graph.py, bfs.py, dfs.py, dijkstra.py, hashing.py, priority_queue.py
│   │   ├── power/
│   │   │   ├── models.py                     # Bus, Line, Switch, Battery, Fault & Provenance Models
│   │   │   ├── distribution_networks.py      # TRAINING_FEEDER (12-Bus) & IEEE_33_DISTRIBUTION
│   │   │   ├── ieee30_network.py             # IEEE 30-Bus Transmission Benchmark
│   │   │   ├── solver.py                     # pandapower Newton-Raphson AC Power-Flow Engine
│   │   │   └── power_flow_service.py         # Candidate AC Cloning & Validation Service
│   │   ├── restoration/
│   │   │   ├── caper.py                      # 8-Stage CAPER Algorithm Engine
│   │   │   └── baselines.py                  # Priority, Graph, AC-Greedy & SciPy HiGHS MILP
│   │   ├── simulation/
│   │   │   ├── session_manager.py            # Authoritative Session & 3D Building State Manager
│   │   │   └── missions.py                   # 7 Playable Missions & Human-vs-AI Evaluator
│   │   └── experiments/
│   │       └── runner.py                     # Reproducible Multi-Seed Benchmark Suite & CSV Export
│   └── test_gridzero_complete.py             # End-to-End Backend Pytest Verification Suite
└── docs/
    ├── upgrade/BASELINE_AUDIT.md             # Pre-Upgrade Repository & Test Audit
    └── screenshots/                          # 16 Verified Playwright Application Screenshots
```

---

## 3. Single Authoritative Simulation State

All three experiences (**The 3D Game**, **The Engineering Simulator**, and **The Research Laboratory**) operate on the same `SimulationSessionState` managed by `SimulationSessionManager`:
- Every switch toggle, fault injection, BESS dispatch (`kW`), load curtailment (`MW`), or upstream capacity limit (`MW`) increments an atomic `revision` counter, pushes a snapshot onto the undo stack, solves a full `pandapower` Newton-Raphson AC load flow, and updates the 3D city building states (`ENERGIZED`, `BACKUP_BATTERY`, `CURTAILED`, `BLACKOUT`, `SOURCE_ACTIVE`).


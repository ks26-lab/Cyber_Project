# GRIDSEC // ZERO — 5-Minute Live Faculty Demonstration & Viva Guide

## Quick Launch Commands

### 1. Start the FastAPI + `pandapower` Backend (`Port 8000`)
```bash
cd /Users/umikasood/Cyber_Project/backend
/Users/umikasood/Cyber_Project/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Start the Next.js 14 + React Three Fiber Frontend (`Port 3000`)
```bash
cd /Users/umikasood/Cyber_Project/apps/web
npm run dev
```

Open **`http://localhost:3000`** for the **GRID//ZERO** 3D application (or `http://localhost:8000` for the preserved legacy GRIDSEC interface and `/docs` for Swagger OpenAPI).

---

## 5-Minute Live Demonstration Script

### Minute 0:00 – 1:00 — 3D City Command & Hospital Outage (`/simulation`)
1. Open `http://localhost:3000/simulation`.
2. Show the 12-bus 33/11 kV Smart City in isometric 3D (`CityCanvas3D`), pointing out the Trauma Hospital (`BUS-03`), Water Treatment (`BUS-04`), SCADA Command Center (`BUS-05`), University (`BUS-06`), Solar PV (`BUS-11`), and Grid BESS (`BUS-12`).
3. Click **`LINE-02-03 (TRIP)`** in the right-hand Disturbance Controls panel. Observe `BUS-03` (Hospital) and `BUS-07` (North Residential) immediately transition to `BLACKOUT` in the 3D scene and in the AC power-flow telemetry table.

### Minute 1:00 – 2:15 — 13-Algorithm Explainable DSA Lab (`/algorithms`)
1. Navigate to `/algorithms`.
2. Click **`BFS`**, **`TARJAN_BRIDGES`**, **`DIJKSTRA`**, **`DSU`**, **`KRUSKAL_MST`**, and **`KNAPSACK_DP`**.
3. Use the **`Prev / Next`** stepper to walk line-by-line through the synchronized pseudocode and inspect the live internal data-structure frontier (`FIFO deque`, `Min-Heap`, `Tarjan tin/low`, `DSU parent/rank`, `2D DP table`) while the 3D City highlights the active nodes and edges.

### Minute 2:15 – 3:30 — 8-Stage CAPER Inspector (`/algorithms/caper`)
1. Navigate to `/algorithms/caper`.
2. Walk through Stages 1–8 of **CAPER** (*Criticality-Aware Power Emergency Restoration*).
3. Point to the **Stage 5 & 6 Candidate Portfolio Table**, showing how each candidate maneuver is cloned into `pandapower` and verified under nonlinear Newton-Raphson AC power flow before acceptance.
4. Click **`Commit Selected Plan to City`** to close tie switch `SW-TIE-2`, dispatch BESS support, and restore 100% of critical hospital load.

### Minute 3:30 – 4:30 — 7 Tactical Campaign Missions & Human-vs-AI Arena (`/missions` & `/challenge`)
1. Open `/missions` to showcase all 7 missions (`Mission 01 — First Light` through `Mission 07 — The City Must Stay Alive` on the IEEE 33-Bus benchmark).
2. Open `/challenge` to demonstrate the 6-participant live leaderboard comparing `HUMAN_OPERATOR` against `CAPER`, `MILP_REFERENCE`, `AC_GREEDY`, `GRAPH_GREEDY`, and `PRIORITY_GREEDY`.

### Minute 4:30 – 5:00 — Reproducible Research Benchmarks (`/research`)
1. Open `/research` to display the multi-seed statistical evaluation (`Mean ± SD`, `Median / IQR`, `95% CI`, `AC Feasibility Rate %`).
2. Click **`Export CSV`** to download the trial-by-trial experimental dataset.


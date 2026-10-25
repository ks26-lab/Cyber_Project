# GRIDSEC // ZERO — Baseline Repository & Technical Audit

**Audit Date:** 2026-10-25  
**Target Branch:** `feature/gridzero-research-upgrade`  
**Base Commit:** `a2c432a` ("major changes in terms of ui and added game")  
**Environment:** macOS (Darwin arm64), Python 3.13.7 (`.venv`), Node.js / npm

---

## 1. Repository & Git Working-Tree Inspection

- **Branch:** `feature/gridzero-research-upgrade`
- **Working Tree Status at Audit Start:** Clean (`nothing to commit, working tree clean`).
- **Repository Hygiene Issues Identified:**
  1. `backend/.env` and `backend/gridsec.db` were tracked in Git.
  2. `backend/__pycache__/` and subpackage `__pycache__/` directories were tracked in Git.
  3. No root `.gitignore` or `backend/.env.example` existed.
  4. `backend/app/main.py` lines 145–146 contained hardcoded Windows developer paths (`C:\Users\karti\.gemini\antigravity\brain\...`) for character images, with a working fallback to `/assets/images`.
  5. `backend/requirements.txt` omitted `python-multipart` (required by `FastAPI` `UploadFile` in `app/api/routes/scheduling.py`) and `openpyxl` (required by Excel workbook upload).

---

## 2. Existing Architecture & Module Inventory

### 2.1 Python FastAPI Backend (`backend/app/`)
- **Entrypoint:** `backend/app/main.py` mounting 13 REST routers under `/api` plus WebSocket `/ws/events` and static frontend mounts (`/css`, `/js`, `/assets`, `/index.html`, `/app.html`, `/game.html`).
- **Database Layer:** `backend/app/database/connection.py` — PostgreSQL primary attempt with automatic fallback to local SQLite (`backend/gridsec.db`).
- **Electrical Power System (`backend/app/power/`):**
  - `models.py`: Pydantic models for `BusModel`, `GeneratorModel`, `LoadModel`, `TransmissionLineModel`, `TransformerModel`, `PowerFlowRequest`, `PowerFlowResult`, `ContingencyResult`, `DataProvenance`, and `DataClassification`.
  - `solver.py`: `PowerFlowSolver` wrapping `pandapower.runpp()` (Newton-Raphson AC power flow) with a synthetic fallback (`_solve_kirchhoff_fallback`).
  - `network_builder.py`: Builds `TEST_NETWORK` (4-bus), `INDIA_GRID_59` (59-bus reference model), and delegates `IEEE_30` to `ieee30_network.py`.
  - `ieee30_network.py`: Standard IEEE 30-Bus transmission benchmark (30 buses, 6 generators, 21 loads, 37 lines, 4 OLTC transformers).
  - `power_flow_service.py`: High-level service for solving networks, running N-1 contingencies, and validating candidate routes.
  - `physics_validator.py`: Conservation-law and operational limit auditor (`PhysicsValidator`).
- **Data Structures & Algorithms (`backend/app/dsa/`):**
  - `graph.py`: Adjacency list `GridGraph`, `GridNode`, `TransmissionEdge`.
  - `bfs.py`: `BFSEngine` for multi-hop cascading blast radius.
  - `dfs.py`: `DFSEngine` for connected components (islanding) and cycle detection.
  - `dijkstra.py`: `DijkstraEngine` using custom `MinHeap` for shortest/least-impedance routing.
  - `priority_queue.py`: Custom `MinHeap` and `MaxHeap` for Dijkstra and incident triage.
  - `hashing.py`: `AssetIndexTable` (O(1) multi-key hash table), `PincodeTrie` (prefix tree), and `CircularTelemetryBuffer` (ring buffer).
- **Cyber-Physical & Cascade Engines (`backend/app/services/`, `backend/app/cascade/`, `backend/app/cyber/`):**
  - `cyber_detection_engine.py`: 10-stage pipeline for synthetic cyber scenarios A–E (Breaker Trip, FDIA, OLTC Tap Tampering, Reconnaissance, Coordinated Campaign).
  - `cascade_engine.py` & `app/cascade/coordinator.py`: Multi-step overload cascade simulation and multi-agent coordination (`DetectionAgent`, `IslandAgent`, `PropagationAgent`, `ImpactAgent`, `PriorityAgent`, `RecoveryAgent`).
  - `daily_scheduler.py`: Review 1 Priority-Aware Power Deficit Scheduler (Hash Map hourly grouping, Priority sorting, Critical load allocation, Greedy Max-Min leveling, Jain's Fairness Index).

### 2.2 Existing Frontend (`index.html`, `app.html`, `game.html`, `js/`)
- Vanilla HTML/CSS/JS multi-page/SPA hybrid:
  - `index.html`: Landing page.
  - `app.html`: Main platform shell with views for Attack Simulator (`simulatorView.js`), Grid Defender (`defenderIntroView.js`, `defenderView.js`), Network Analysis (`networkAnalysisView.js`), and Daily Load Scheduler (`dailySchedulerView.js`).
  - `game.html`: Standalone DSA Grid Defender training game using `trainingGridData.js` (15-node SVG schematic), `dsaEngine.js`, and `gameShell.js`.

---

## 3. Baseline Automated Test Suite Results

Running the existing backend test suite via `pytest` (excluding `test_backend.py` and `test_api_physics.py`, which are standalone live-server scripts that invoke `urllib.request.urlopen("http://127.0.0.1:8000/...")` at import/main time):

- **Total Collected Tests:** 322
- **Passed:** 302 (93.8%)
- **Failed (Pre-existing Defects):** 20 (6.2%)

### Breakdown of Pre-Existing Test Failures
1. **Missing Enum Member `DataClassification.BENCHMARK_STANDARD` & Undefined `logger` (17 failures):**
   - `backend/app/power/ieee30_network.py:34` references `DataClassification.BENCHMARK_STANDARD`, which was never added to `class DataClassification(str, Enum)` in `backend/app/power/models.py`.
   - Furthermore, `backend/app/services/cyber_detection_engine.py:231` catches the resulting exception and calls `logger.warning(...)`, raising `NameError: name 'logger' is not defined`.
   - Affected tests:
     - `test_attack2_false_data_injection.py::TestAttack2FalseDataInjection::test_03_telemetry_manipulated_while_solver_state_unchanged`
     - `test_grid_defender.py` (10 tests: `test_01` through `test_09`, `test_11`)
     - `test_review3_demonstrations.py` (6 tests: `test_01` through `test_06`)
2. **Target Leakage in `DynamicTargetSelector` (`test_review3_demonstrations.py::test_07_model_separation_and_target_filtering`):**
   - When querying `INDIA_GRID_59` targets in an unseeded/test DB state, `DynamicTargetSelector` fell back to `TEST_NETWORK` line IDs (`LINE-1-2`, `LINE-1-3`), causing `self.assertNotIn("LINE-1-2", india_lines)` to fail.
3. **Hardcoded Target Assertion in `test_attack5_coordinated_campaign.py::test_07_multi_asset_correlation`:**
   - `generate_coordinated_campaign_sequence()` targets `{'BUS-2', 'BUS-4', 'LINE-1-2', 'XFMR-3-4'}`, while `test_07` asserted `'BUS-1' in unique_targets`.
4. **Python `unittest` Short-Circuit Bug in `test_defender_intro.py::test_04_five_narrative_scenes_structure`:**
   - Line 80 wrote `self.assertIn("Northern, Western, Southern, Eastern and North-Eastern", content) or self.assertIn("NR", content)`. Because `self.assertIn` raises `AssertionError` on failure instead of returning `False`, the `or` fallback never executed.

---

## 4. Technical & Scientific Defects Identified for Phase 2 & 3 Remediation

### 4.1 Power-Flow & Physics Engine Defects
1. **Linear Heuristic Disguised as Candidate Route AC Validation (`power_flow_service.py:141–197`):**
   - `validate_candidate_route_power_flow()` only solved baseline power flow and added a linear estimate `added_pct = (additional_mw / thermal_mw) * 100.0` to lines along `candidate_route` instead of cloning the network, applying the topological switching/dispatch modification, and solving a true post-action Newton-Raphson AC power flow.
2. **Misleading Fallback Provenance (`solver.py:635–800`):**
   - `_solve_kirchhoff_fallback()` generated heuristic flow estimates (`base_pct = 0.38 * shift_factor`) when `pandapower` was absent, yet labeled the result `status="SUCCESS"` and `verification_status="SOLVER_VALIDATED"` (`DataClassification.SOLVER_DERIVED`).
   - **Remediation:** Strictly distinguish `AC_SOLVED` from `APPROXIMATE_MODEL` and `SOLVER_UNAVAILABLE`. Scientific benchmark experiments must require `AC_SOLVED`.
3. **Unconstrained Slack Bus in Restoration Scenarios (`solver.py:114`):**
   - `pp.create_ext_grid` acts as an infinite slack source unless source generation capacity (`max_p_mw`) and available supply constraints are explicitly enforced before/after AC solve.
4. **Missing Distribution Benchmarks & Battery Storage Physics:**
   - No `TRAINING_FEEDER` (10-bus distribution feeder with critical facilities, solar, battery, tie switch) or `IEEE_33_DISTRIBUTION` (`pandapower.networks.case33bw()`) existed.
   - No discrete-time `BatteryModel` tracking power (`kW`/`MW`) vs. energy (`kWh`/`MWh`), SOC bounds, and charge/discharge efficiencies existed.
5. **Attribute Mismatch in `cascade/coordinator.py:69–71`:**
   - `extract_solver_metrics()` accessed `total_losses_p_mw` instead of `total_losses_mw`.

### 4.2 DSA Engine & Restoration Algorithm Gaps
1. **$O(V)$ Dequeue in Legacy Frontend BFS (`js/engine/dsaEngine.js:395`):**
   - `runBFS()` used `queue.shift()`, which is $O(V)$ per dequeue in JavaScript arrays instead of an $O(1)$ head-pointer FIFO queue.
2. **Missing Backend Algorithms & Unified Step Trace Contract:**
   - Backend `app/dsa/` lacked Tarjan's Bridge & Articulation Point algorithm, Disjoint Set Union (DSU), Kruskal's Minimum Spanning Tree (MST), Dynamic Programming (0/1 & Fractional Knapsack for critical load allocation), Min-Cost Max-Flow, and A* Spatial Routing.
   - No unified `AlgorithmTrace` schema existed across all algorithms for step-by-step frontend replay and inspection.
3. **Missing CAPER & Baseline Restoration Suite:**
   - No Criticality-Aware Power Emergency Restoration (**CAPER**) engine or standardized reproducible benchmark baselines existed.

---

## 5. Legacy Compatibility Checklist

| Legacy Component / Route | Path / Endpoint | Preservation Strategy |
| :--- | :--- | :--- |
| Legacy Landing Page | `/index.html`, `/legacy` | Preserved on FastAPI static mount and linked from Next.js navigation |
| Legacy Platform SPA | `/app.html` | Preserved on FastAPI static mount |
| Legacy 15-Node DSA Game | `/game.html` | Preserved on FastAPI static mount (`js/engine/dsaEngine.js` upgraded to $O(1)$ queue) |
| Grid Topology API | `/api/grid/*` | Preserved with backward-compatible response schemas |
| Asset Search & Pincode API | `/api/assets/*` | Preserved (`AssetIndexTable` & `PincodeTrie`) |
| DSA Analysis API | `/api/analysis/*` | Preserved (`impact`, `alternate-route`, `connectivity`) |
| Power Flow API | `/api/power-flow/*` | Preserved and expanded with `TRAINING_FEEDER` & `IEEE_33_DISTRIBUTION` |
| Sandbox Simulation API | `/api/simulation/*` | Preserved |
| Cyber Defense Lab API | `/api/cyber/*` | Preserved (with `DataClassification.BENCHMARK_STANDARD` & `logger` fixes) |
| Cascade Engine API | `/api/cascades/*` | Preserved |
| Daily Scheduler API | `/api/scheduling/*` | Preserved |
| Aegis AI Situation API | `/api/aegis/*` | Preserved |


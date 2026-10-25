# GRIDSEC — Power Grid Cybersecurity & Resilience Platform

> **Indian National Power Grid Security Monitoring, Cascading Failure Mitigation & Dynamic Transmission Rerouting**  
> *Developed as an engineering project for Academic Review 3.*

---

## 1. Project Overview

**GRIDSEC** is a cyber-physical resilience platform built to safeguard electric transmission and distribution infrastructure against sophisticated cyber attacks and physical cascading blackouts. Grounded in reference data from the Central Electricity Authority (CEA) and Power Grid Corporation of India Limited (POWERGRID), the system couples real-time operational technology (OT) monitoring with discrete network graph algorithms (DSA) and authentic AC Newton-Raphson power-flow physics.

The platform provides operators with situational awareness across 59 high-voltage substations, bulk power plants, and 54 interstate transmission corridors spanning India's Northern, Western, Southern, Eastern, and North-Eastern synchronous grids.

---

## 2. Core Modules & User Interface

The platform is organized into **three consolidated primary navigation sections**:

```
+-----------------------------------------------------------------------------------+
|                                  GRIDSEC PLATFORM                                 |
+--------------------------+--------------------------------+-----------------------+
|   A. Grid Dashboard      |   B. Simulation & Response     |  C. Analysis & Results|
|  • Interactive GIS Map   |  • 5 Cyber Attack Scenarios    | • Dijkstra Rerouting  |
|  • 59 Nodes & 54 Lines   |  • Dynamic Target Selection    | • Power Loss Delta    |
|  • Substation Inspector  |  • Real-Time Detection & Score | • DFS Grid Islanding  |
|  • Transformer Telemetry |  • AC Power Flow (Before/After)| • Tarjan SPoFs/Bridges|
|  • Full Asset Directory  |  • Cascading Failure Chain     | • SCADA DPI Threat Mat|
|  • Real/Satellite Views  |  • Feasible Recovery Rerouting | • Resilience Timeline |
+--------------------------+--------------------------------+-----------------------+
|   D. Grid Defender Strategy Game (`game.html`)                                    |
|  • 5-Level Cyber-Physical Campaign (15-Node Dedicated TRAINING_15 Grid)           |
|  • Authentic DSA Decision Loop (BFS, DFS, Dijkstra, Tarjan, Max-Heap, DSU)        |
|  • Real-Time 4-Stage Attack Escalation Engine & Synthesized Web Audio Cues        |
|  • Offline Capable (Zero Backend / Zero Setup / Zero Dependency Requirement)      |
+-----------------------------------------------------------------------------------+
```

### D. Grid Defender Strategy Game (`game.html`)
* **Standalone Zero-Setup Game**: Browser-based cyber-physical simulation that opens directly from `game.html` with no backend server, database, or accounts required.
* **15-Node Training Grid**: Custom cyber-physical topology modeling power plants, transmission substations, and critical consumers (Hospital dual-feed, Cyber Command, Water Treatment).
* **6-Phase Decision Loop**: Observe &rarr; Investigate &rarr; Decide &rarr; Act &rarr; Evaluate &rarr; Continue.
* **Authentic DSA Algorithms (0 DP Cost)**: Real implementations of BFS (reachability), DFS (structural cycles), Dijkstra with Min-Heap (bypass routing), Tarjan's Bridge-Finding (single points of failure), Binary Max-Heap (incident prioritization), and DSU (grid island detection).
* **Deterministic 1,000-Point Scoring**: Service Maintained (400 pts), Feasible Operation (250 pts), Cascade Prevention (150 pts), Resource Efficiency (100 pts), and Diagnosis Accuracy (100 pts).
* **Real-Time 4-Stage Cyber Attacks**: Scripted attack progression (Reconnaissance &rarr; Access &rarr; Execution &rarr; Impact) with visible countdowns and early mitigation incentives.
* **Character Dialogue & Storytelling**: Senior Operator Mentor Asha Rao and cyber adversary NullCurrent with dynamic scenario-driven guidance.
* **Accessibility & Audio**: Built-in Synthesized Web Audio engine, text size adjustments, reduced motion, and Deuteranopia/Protanopia color-blind palettes.

### A. Grid Dashboard (`app.html#dashboard`)
* **Interactive National GIS Map**: Leaflet-powered GIS map featuring 59 major substations and power plants, 54 high-voltage transmission lines (±800kV HVDC, 765kV AC, 400kV AC), and layer toggles (Real Map, Satellite Imagery, OSM).
* **Grid Status Linear Bar**: Live synchrophasor PMU frequency (50.00 Hz nominal), national demand (~242 GW), and inter-regional transmission transfers (~112 GW).
* **Hierarchical Search**: Real-time multi-tier search across State, District, Substation Name, 6-Digit Postal Pincode, and Transformer Bay ID.
* **Substation & Asset Inspector**: Deep inspection of substation ratings, transformer bays (temperature, MVA load, cooling), operator footprint, and an expandable 59-node asset directory.

### B. Simulation & Response (`app.html#simulation`)
* **Attack Scenario Catalog**: 5 synthetic attack scenarios covering:
  1. `SCENARIO_A_BREAKER_TRIP`: Unauthorized SCADA breaker trip command on transmission corridors.
  2. `SCENARIO_B_TELEMETRY_ANOMALY`: False Data Injection Attack (FDIA) on voltage/power measurements.
  3. `SCENARIO_C_CONFIG_TAMPER`: Unauthorized transformer On-Load Tap Changer (OLTC) manipulation.
  4. `SCENARIO_D_REPEATED_PROBE`: Multi-asset distributed SCADA reconnaissance probing.
  5. `SCENARIO_E_COORDINATED_ATTACK`: Coordinated 4-stage APT campaign across network topology.
* **Cascading Failure Drill**: Simulate direct physical branch tripping and multi-step cascade propagation across downstream lines.
* **Real-Time Cyber Detection**: Signature and physics-based residual detection with confidence scoring and execution latency in milliseconds.
* **Electrical Impact & Physics Verification**: Before vs After AC power-flow comparison (voltage collapse, line loading %, system loss MW) verified by an independent Kirchhoff physics validator.
* **Feasible Recovery & Causal Timeline**: Step-by-step causal event timeline (`event_id` &rarr; `parent_event_id`) with automated recovery route recommendations.

### C. Analysis & Results (`app.html#analysis`)
* **Dijkstra Rerouting Engine**: Select Source and Destination substations to calculate the lowest-impedance, minimum-cyber-risk transmission route with candidate path alternatives.
* **Map Highlighting**: One-click route projection onto the interactive national GIS map.
* **Resilience Disturbance & Recovery**: Inject outages along active routes and automatically compute alternate bypass paths with power loss delta comparisons.
* **Topological Islanding (DFS / DSU)**: Detects whether line tripping has partitioned the synchronous network into isolated electrical microgrids or transmission loops.
* **Single Points of Failure (Tarjan's Algorithm)**: Discovers articulation nodes and critical bridges whose outage would isolate regional load centers.
* **SCADA DPI Matrix**: Inspect intercepted DNP3, Modbus TCP, IEEE C37.118 PMU, and IEC 60870 hex payloads.

---

## 3. Technology Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.10+), Uvicorn, Pydantic v2 |
| **Database & ORM** | SQLite3 (`gridsec.db`) / PostgreSQL (auto-fallback), SQLAlchemy 2.0 |
| **Power Flow Physics** | pandapower 3.5.4 (AC Newton-Raphson load flow solver, exact $I^2R$ losses) |
| **Graph & DSA Engine** | Custom Python & JavaScript implementations: BFS, DFS, Dijkstra with Binary Min-Heap, Inverted Hash Index, Tarjan Articulation Points |
| **Frontend UI** | HTML5, Vanilla ES6 JavaScript, Vanilla CSS (Warm Editorial Design System, zero external CSS bloat) |
| **GIS Mapping** | Leaflet.js, CartoDB Positron tiles, Esri High-Resolution Satellite imagery |
| **Streaming** | Native WebSockets (`/ws/grid` for SCADA ticks, `/ws/aegis` for event streaming) |

---

## 4. Quickstart & Installation

### Prerequisites
* Python 3.10 or higher
* Modern web browser (Chrome, Edge, Firefox, Safari)

### Step 1: Clone and Set Up Virtual Environment
```bash
git clone https://github.com/ks26-lab/Cyber_Project.git
cd Cyber_Project

# Create and activate Python virtual environment
python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r backend/requirements.txt
```
### Quick Start: Grid Defender (Zero Install / Standalone)
1. Double click and open **`game.html`** or **`index.html`** directly in any modern browser.
   - **No installation, no account, no backend server required.** The game runs 100% offline using in-browser graph algorithms and electrical solvers.
2. Alternatively, from a static local server:
   ```bash
   python -m http.server 8080
   ```
   Then open `http://localhost:8080/game.html`.

### How to Play in 5 Minutes
1. **The 6-Phase Decision Loop**: In every incident, follow:
   - **Observe**: Inspect substation voltages, breaker positions, and line loading percentages.
   - **Investigate**: Run real graph algorithms (BFS, DFS, Dijkstra, Tarjan, Max-Heap, DSU) at **0 DP cost**.
   - **Decide**: Formulate an evidence-based plan before taking irreversible physical actions.
   - **Act**: Execute physical interventions (Isolating bad sensor data, shedding load, or reclosing breakers).
   - **Evaluate**: Check AC power flow feasibility (Kirchhoff's laws, thermal limits $< 100\%$, voltage $0.95 - 1.05\text{ p.u.}$).
   - **Continue**: Progress to the next turn or review mission performance.
2. **Defence Points (DP)**: All graph inspections cost 0 DP. Physical actuations cost DP (e.g. 10 DP for reclosure, 15 DP for telemetry isolation).
3. **Beware of FDIA**: Corrupted sensor data differs from physical reality. Tripping healthy lines on bad data fails the level immediately!

### Mapping of Algorithms to Grid Gameplay
- **BFS (Breadth-First Search)**: Explores reachable substations and energization zones from generators.
- **DFS (Depth-First Search)**: Detects transmission mesh loops, cycles, and back edges.
- **Dijkstra's Algorithm (Min-Heap)**: Discovers lowest-loss/lowest-impedance alternate bypass routes around tripped corridors.
- **Tarjan's Bridge-Finding**: Discovers critical single-point-of-failure corridors that partition the grid into disconnected islands.
- **Binary Max-Heap**: Prioritizes urgent transmission line overloads and incident alarms.
- **Disjoint Set Union (DSU)**: Tracks connected electrical sub-grid components and island frequency balancing.

### Mission Campaign (Levels 1 - 5)
- **Level 1 — Prologue: Quiet Night** (Starting DP: 60): Explore 15-node baseline topology; run BFS/DFS and balance a demand surge.
- **Level 2 — Chapter 1: Line Down** (Starting DP: 80): Corridor `LINE-SUB1-SUB4` trips; run Dijkstra bypass, audit AC feasibility, and reclose safely.
- **Level 3 — Chapter 2: The Weak Point** (Starting DP: 100): Identify 4 Tarjan bridges, prioritize risks with Max-Heap, shed non-critical load, and prevent cascading blackout.
- **Level 4A — Chapter 3: Unauthorized Trip** (Starting DP: 90): Investigate unlogged breaker actuation, audit physical relays, harden gateway, and reclose feeder safely.
- **Level 4B — Chapter 4: Lying Numbers** (Starting DP: 90): SCADA reports fake overload at `SUB-2`; run Chi-Square residual test, isolate bad sensor, and leave healthy lines in service.
- **Level 5 — Chapter 5: National Resilience** (Starting DP: 140): Simultaneous multi-threat crisis; coordinate full DSA toolkit to defend all critical assets.

### Full Platform / Backend Server (Optional For Research Dashboard)
```bash
python backend/run_server.py
```
* Open `http://127.0.0.1:8000` to access the full 59-node National Grid Operations Dashboard.

---

## 5. API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health check and loaded topology count |
| `/api/grid/network` | `GET` | Full Indian National Grid topology (59 nodes, 54 corridors) |
| `/api/grid/substations` | `GET` | Query substations by region and status |
| `/api/grid/transmission-lines` | `GET` | Query corridors by voltage class and type |
| `/api/cyber/scenarios` | `GET` | Catalog of 5 synthetic cyberattack scenarios |
| `/api/cyber/eligible-targets` | `GET` | Query dynamic eligible targets for a scenario |
| `/api/cyber/simulate` | `POST` | Execute end-to-end cyber detection and physics simulation |
| `/api/cascades/simulate` | `POST` | Multi-step physical line overload cascade simulation |
| `/api/cascades/eligible-disturbances`| `GET` | List eligible disturbance lines and transformers |
| `/api/analysis/impact` | `POST` | BFS cascading cyber blast radius analysis |
| `/api/analysis/alternate-route` | `POST` | Dijkstra min-risk bypass rerouting with priority queue |
| `/api/analysis/connectivity` | `GET` | DFS connected components (islanding) and cycle detection |
| `/api/power-flow/run` | `POST` | AC Newton-Raphson power flow calculation |
| `/api/power-flow/validate-route` | `POST` | Validate electrical feasibility of candidate reroutes |
| `/ws/grid` | `WebSocket` | Real-time SCADA telemetry and frequency ticks |

---

## 6. Running Tests

Execute the comprehensive automated test suite covering algorithms, physics, and integration:

```bash
# Run full integration and system hardening test suites
pytest backend/test_full_integration.py backend/test_system_hardening.py -v
```

---

## 7. Project Structure

```
Project/
├── game.html                 # Standalone Grid Defender Interactive Strategy Game
├── app.html                  # Master web application (3 primary sections)
├── index.html                # Editorial landing page
├── test_defender_gameplay.html # Browser test suite (18 automated tests)
├── README.md                 # Project documentation and run guide
├── REPORT.md                 # Technical engineering report for Review 3
├── css/
│   ├── game.css              # Cyber-physical control room game theme
│   ├── components.css        # UI components and modals
│   ├── landing.css           # Landing page typography and styling
│   ├── main.css              # Core design tokens and reset
│   ├── map.css               # Leaflet map HUD, legend, and search styles
│   └── views.css             # View layout and card styling
├── js/
│   ├── app.js                # Master application router and state orchestrator
│   ├── data/                 # Grid datasets (trainingGridData.js, indiaGridData.js, threatData.js)
│   ├── engine/               # Graph models, DSA, sound, storage, attack escalation, story
│   │   ├── graph.js          # Core Graph adjacency list model
│   │   ├── dsaEngine.js      # BFS, DFS, Dijkstra, Tarjan, Heap, DSU
│   │   ├── soundEngine.js    # Synthesized Web Audio cues (zero external files)
│   │   ├── gameStorage.js    # LocalStorage saves, unlocks, stars, settings
│   │   ├── attackEscalation.js # 4-stage real-time cyberattack engine
│   │   ├── storyEngine.js    # Full narrative dialogue and character sheets
│   │   └── characterDialogue.js # Dialogue renderer and badge styles
│   ├── views/
│   │   ├── gameShell.js      # Standalone game screen state machine
│   │   ├── defenderView.js   # Grid Defender interactive game controller
│   │   ├── defenderIntroView.js # Cinematic animated introduction
│   │   ├── dashboardView.js  # Section A: Master Grid Dashboard
│   │   ├── simulatorView.js  # Section B: Simulation & Response Lab
│   │   ├── networkAnalysisView.js # Section C: Analysis & Results Engine
│   │   ├── mapView.js        # Re-export alias to DashboardView
│   │   ├── cascadeView.js    # Re-export alias to SimulatorView
│   │   ├── investigateView.js# Re-export alias to NetworkAnalysisView
│   │   ├── threatsView.js    # Re-export alias to NetworkAnalysisView
│   │   └── assetsView.js     # Re-export alias to DashboardView
│   └── visualizer/           # Leaflet interactive map visualizer
└── backend/
    ├── run_server.py         # Entry point to run FastAPI + static server
    ├── requirements.txt      # Python dependencies
    ├── pytest.ini            # Pytest configuration
    ├── gridsec.db            # SQLite reference database (59 assets)
    ├── test_full_integration.py # End-to-end integration test suite
    ├── test_system_hardening.py # Physics and validation test suite
    └── app/
        ├── api/routes/       # REST API endpoints (grid, cyber, cascades, power_flow, etc.)
        ├── cascade/          # Cascading failure coordination and state machine
        ├── cyber/            # Cyber attack simulation and target selector
        ├── database/         # Database engine and connection
        ├── dsa/              # Graph algorithms (BFS, DFS, Dijkstra, Heap, Hashing)
        ├── ingestion/        # CEA/PGCIL grid data importer
        ├── models/           # SQLAlchemy ORM models
        ├── power/            # Pandapower AC solver, network builder, physics validator
        ├── schemas/          # Pydantic schemas
        ├── services/         # Business logic and coordination services
        └── websocket/        # Real-time WebSocket connection manager
```

---

## 8. Academic Review 3 Verification Checklist

- [x] **Grid Modeling**: Authentic 59-node Indian power network topology with 54 corridors and transformer bays.
- [x] **Graph Algorithms (DSA)**: BFS blast radius, DFS connected components/islands, Dijkstra min-risk rerouting with binary min-heap, and $O(1)$ inverted hash indexing.
- [x] **Electrical Analysis**: Pandapower AC Newton-Raphson power-flow calculations with Kirchhoff current law nodal verification.
- [x] **Cybersecurity**: 5 realistic synthetic attack scenarios with automated detection and confidence scoring.
- [x] **Cascading Failure**: Physical line overload tripping with causal DAG event tracing.
- [x] **Resilience & Recovery**: Automated alternate route computation with power loss comparison and electrical validation.
- [x] **Visualisation**: Interactive Leaflet GIS map with route highlighting, satellite imagery, and search.
- [x] **Repository Simplification**: Consolidated from 8 fragmented views into 3 clean, responsive primary modules.

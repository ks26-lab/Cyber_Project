# GRIDSEC — Technical Engineering Report (Review 3)

**Project Title:** GRIDSEC — Power Grid Cybersecurity & Resilience Platform  
**Target Architecture:** Indian National Synchronous Power Grid (Grid-India / POSOCO / CEA Reference Topology)  
**Academic Review:** Review 3 — Technical Implementation, Integration & Defensibility  
**Classification:** Research / Prototype Simulation Platform (Strictly Simulation-Only)  

---

## 1. Executive Summary

Modern bulk power transmission grids are cyber-physical systems where digital supervisory control and data acquisition (SCADA) networks govern physical electrical generation, transformation, and transmission assets. While operational integration has dramatically enhanced national grid efficiency and interstate power sharing, it has exposed critical high-voltage substations to sophisticated cyber disruptions.

**GRIDSEC** is an integrated platform designed to model, detect, simulate, and mitigate cyber-physical disruptions across India's synchronous national power grid. The system bridges discrete data structures and algorithms (DSA) with high-fidelity AC electrical power-flow physics (pandapower / Newton-Raphson) and a multi-stage cyber detection pipeline.

The repository was systematically audited and simplified for Review 3, reducing architectural fragmentation and consolidating user workflows from eight fragmented views into **three primary functional modules**:
1. **Grid Dashboard**: Real-time GIS transmission network visualization, multi-tier search, live telemetry streaming, and asset inspection.
2. **Simulation & Response**: Dynamic execution of 5 synthetic cyber attack scenarios, AC power-flow delta calculations, cascading failure tracking, and feasible mitigation.
3. **Analysis & Results**: End-to-end Dijkstra optimal transmission rerouting, power loss comparisons, topological islanding (DFS), critical bridge detection (Tarjan), and SCADA deep packet inspection (DPI).

---

## 2. Problem Statement & Motivation

Electric power systems operate under tight physical and electromagnetic constraints governed by the Indian Electricity Grid Code (IEGC):
* **Synchronous Frequency:** Regulated within an extremely narrow operational band ($49.90\text{ Hz} \le f \le 50.05\text{ Hz}$).
* **Bus Voltages:** Maintained within statutory operating limits ($0.90\text{ p.u.} \le V \le 1.10\text{ p.u.}$).
* **Corridor Loading:** Thermal capacity limits preventing conductor annealing and catastrophic sag.

A cyber adversary capable of manipulating industrial protocol messages (such as DNP3 `0x05 Direct-Operate` or Modbus function code `0x05 Write Single Coil`) can trigger false trips on critical high-voltage transmission lines or converter transformers. Such actions induce immediate power redistribution across parallel lines, potentially exceeding thermal thresholds and initiating **cascading blackouts** (analogous to the 2012 Northern Grid collapse or the 2015 Ukraine blackout).

Traditional IT security systems lack power system awareness, while conventional Energy Management Systems (EMS) lack cyber adversary threat modeling. GRIDSEC addresses this gap by creating an authentic, mathematically sound computational bridge between discrete cyber threat traversal and physical electrical equations.

---

## 3. System Architecture & Immutability Guarantee

The platform employs a decoupled, multi-tiered architecture ensuring strict separation between immutable baseline grid records and temporary what-if simulation states:

```
+-----------------------------------------------------------------------------------+
|                        PRESENTATION & VISUALIZATION LAYER                         |
|  • Grid Dashboard (Leaflet GIS)  • Simulation & Response  • Analysis & Results    |
+-----------------------------------------------------------------------------------+
                                       ↕ (REST JSON / WebSockets)
+-----------------------------------------------------------------------------------+
|                           FASTAPI APPLICATION CORE                                |
|  • Unified Event Bus (/api/cyber/events, /ws/grid, /ws/aegis)                     |
|  • Simulation State Manager (Isolated Scenario Memory Overrides)                  |
+-----------------------------------------------------------------------------------+
        ↕                                     ↕                             ↕
+----------------------+        +--------------------------+        +---------------+
|    DSA GRAPH ENGINE  |        |  ELECTRICAL PHYSICS CORE |        | DATABASE TIER |
| • BFS Blast Radius   |        | • Pandapower AC Solver   |        | • SQLite3 /   |
| • DFS Islanding      |        | • Newton-Raphson AC Flow |        |   PostgreSQL  |
| • Dijkstra Rerouting |        | • KCL Nodal Validator    |        | • 59 Monitored|
| • Tarjan SPoFs/Bridge|        | • Thermal Violations     |        |   Assets      |
| • Max-Heap Priority  |        | • Route Feasibility Check|        | (Immutable)   |
+----------------------+        +--------------------------+        +---------------+
```

### The 100% Immutability Guarantee
All production assets (59 bulk substations/plants, 54 corridors, 85 transformer bays) stored in `gridsec.db` are **strictly read-only** during simulation drills. When an operator triggers an attack or cascade drill:
1. An isolated, in-memory copy of the electrical topology is created with a unique `simulation_id`.
2. State overrides (e.g., branch status set to `OUT_OF_SERVICE`) mutate only the sandbox state.
3. Once the drill concludes, the sandbox state is cleanly discarded without altering a single base record.

---

## 4. Discrete Data Structures & Graph Algorithms (DSA)

GRIDSEC implements dedicated discrete network algorithms in both Python (backend solver engine) and ES6 JavaScript (client-side interactive engine):

### 4.1 Inverted Hash Table Indexing ($O(1)$)
* **Implementation:** `AssetIndexTable` (`backend/app/dsa/hashing.py`)
* **Purpose:** Multi-dimensional indexing of grid assets across multiple query keys (Asset ID, Region, Voltage Class, State, Operator, and 6-digit Pincode).
* **Complexity:** $O(1)$ average-case retrieval time for high-frequency SCADA lookups across 59 nodes and 240+ transformer bays.

### 4.2 Breadth-First Search (BFS) Blast Radius ($O(V + E)$)
* **Implementation:** `BFSImpactEngine` (`backend/app/dsa/bfs.py`)
* **Purpose:** Traces multi-hop lateral movement across physical transmission lines when a substation gateway is compromised. Calculates:
  - Hop distance from compromised origin node.
  - Cumulative nameplate generation capacity exposed ($MW$).
  - Identification of critical infrastructure (Nuclear power stations, HVDC bipole terminals).
  - Composite Cyber Blast Radius Score ($0 - 100$).

### 4.3 Depth-First Search (DFS) Islanding & Cycle Detection ($O(V + E)$)
* **Implementation:** `DFSEngine` (`backend/app/dsa/dfs.py`)
* **Purpose:** Identifies isolated sub-grid synchronous components (islands) formed when multiple lines trip.
* **Electrical Viability Check:** Unlike purely topological graph algorithms, each discovered component is validated for electrical viability:
  $$\sum P_{\text{gen}} > 0, \quad \sum P_{\text{load}} > 0, \quad \frac{|\sum P_{\text{gen}} - \sum P_{\text{load}}|}{\max(\sum P_{\text{gen}}, \sum P_{\text{load}})} < 0.80$$

### 4.4 Tarjan's Articulation Points & Transmission Bridges ($O(V + E)$)
* **Implementation:** `DsaEngine.findSinglePointsOfFailure()` (`js/engine/dsaEngine.js`)
* **Purpose:** Discovers critical single points of failure (SPoFs)—substations or radial transmission lines whose single disconnection disconnects one or more regional load centers. Uses depth-first discovery times (`disc[]`) and low-link values (`low[]`).

### 4.5 Dijkstra's Min-Risk Alternate Rerouting ($O((V + E) \log V)$)
* **Implementation:** `DijkstraReroutingEngine` (`backend/app/dsa/dijkstra.py`)
* **Purpose:** When transmission corridors are compromised or quarantined, automatically computes the optimal bypass power transmission path.
* **Priority Queue:** Uses a Binary Min-Heap (`heapq`).
* **Multi-Criteria Edge Weight Optimization:**
  $$w(e) = \alpha \cdot \frac{D_e}{D_{\max}} + \beta \cdot \frac{P_{\text{loss}, e}}{P_{\text{rated}, e}} + \gamma \cdot \text{RiskScore}(v)$$
  Where $D_e$ is corridor distance in km, $P_{\text{loss}, e}$ is estimated $I^2R$ transmission loss in MW, and $\text{RiskScore}(v)$ is the upstream cyber vulnerability rating.

### 4.6 Incident Prioritization Max-Heap ($O(\log N)$)
* **Implementation:** `IncidentPriorityQueue` (`backend/app/dsa/priority_queue.py`)
* **Purpose:** Ranks incoming cybersecurity alerts by severity, asset criticality, risk score, and downstream affected MW capacity, ensuring operators triage the highest-consequence events first.

---

## 5. Electrical Power System Modeling & Physics Validation

### 5.1 AC Newton-Raphson Load Flow Formulations
Power flow is calculated using native **pandapower** solving the non-linear AC power balance equations at every bus $k$:

$$P_k = V_k \sum_{j=1}^{N} V_j \left( G_{kj} \cos(\theta_k - \theta_j) + B_{kj} \sin(\theta_k - \theta_j) \right)$$
$$Q_k = V_k \sum_{j=1}^{N} V_j \left( G_{kj} \sin(\theta_k - \theta_j) - B_{kj} \cos(\theta_k - \theta_j) \right)$$

Where $V_k$ is voltage magnitude, $\theta_k$ is voltage phase angle, and $Y_{kj} = G_{kj} + j B_{kj}$ is the nodal admittance matrix element.

### 5.2 Independent Physics Validator
To avoid blindly trusting solver convergence, every solution is evaluated by an independent validation engine (`backend/app/power/physics_validator.py`):

| Check | Mathematical Formula | Regulatory / Physical Limit |
| :--- | :--- | :--- |
| **Nodal Active KCL Balance** | $|P_{\text{gen},k} - P_{\text{load},k} - \sum P_{\text{flow},kj}| \le \epsilon_P$ | $\epsilon_P = 0.5\text{ MW}$ |
| **Nodal Reactive KCL Balance**| $|Q_{\text{gen},k} - Q_{\text{load},k} - \sum Q_{\text{flow},kj}| \le \epsilon_Q$ | $\epsilon_Q = 1.0\text{ MVAr}$ |
| **Line Apparent Loading** | $S_{\text{line}} = \sqrt{P^2 + Q^2} \le S_{\text{rated}}$ | Loading $\% \le 100.0\%$ |
| **Transformer Loading** | $S_{\text{trafo}} = \sqrt{P_{\text{hv}}^2 + Q_{\text{hv}}^2} \le S_{\text{rated}}$ | Loading $\% \le 100.0\%$ |
| **Bus Voltage Operating Limits**| $V_{\min} \le V_k \le V_{\max}$ | $[0.90, 1.10]\text{ p.u.}$ |
| **Bus Voltage Critical Collapse**| $V_{\text{crit},\min} \le V_k \le V_{\text{crit},\max}$ | $[0.85, 1.15]\text{ p.u.}$ |
| **Numerical Sanity** | $\neg\text{isnan}(x) \land \neg\text{isinf}(x)$ | Finite Real Numbers |

### 5.3 Data Provenance Framework
Every electrical quantity in GRIDSEC carries an immutable data classification tag:
* `REAL_REFERENCE`: Grounded directly in CEA / POWERGRID / Grid-India public filings (e.g. nameplate capacity, line length km, voltage rating).
* `REPRESENTATIVE`: Standardized empirical engineering parameters (e.g. conductor resistance $\Omega/\text{km}$, line reactance $X$, transformer impedance $v_k\%$).
* `SOLVER_DERIVED`: Computed via Newton-Raphson AC equations or Kirchhoff validator (e.g. bus voltage $V_k$, branch loading $\%$, loss MW).
* `SIMULATED`: Generated within the sandbox during cyber/contingency drills.

---

## 6. Cybersecurity Threat Model & Simulation Workflow

GRIDSEC models attacks targeting operational technology (OT) SCADA networks:

```
[Adversary Ingestion]
         ↓
[Protocol Deep Packet Inspection (DPI)]
  • DNP3 Checksum & Function Codes
  • Modbus Coil Range Verification
  • IEEE C37.118 PMU Frame Timing
         ↓
[Multi-Factor Detection Engine]
  • Anomaly Confidence Scoring (0 - 100%)
  • Signature Matching + Physics Residuals
         ↓
[BFS Topological Blast Radius]
  • Lateral Movement Depth
  • Critical Generation at Risk (MW)
         ↓
[AC Power Flow Impact Evaluation]
  • Newton-Raphson Re-solve on Sandbox
  • Voltage Dips & Branch Overloads
         ↓
[Max-Heap Incident Triage]
  • Operator Alert Prioritization
```

### 5 Synthetic Attack Scenarios (A through E)

1. **Scenario A (SCENARIO_A_BREAKER_TRIP):** Unauthorized remote breaker open command targeting bulk lines (e.g., Raigarh–Pugalur ±800kV HVDC). Forces instantaneous redistribution of up to 6,000 MW across parallel 765kV corridors, testing thermal overload trip points.
2. **Scenario B (SCENARIO_B_TELEMETRY_ANOMALY):** False Data Injection Attack (FDIA) injecting manipulated active power measurements while physical grid state remains untouched. Demonstrates state estimation residual detection without tripping lines.
3. **Scenario C (SCENARIO_C_CONFIG_TAMPER):** Unauthorized OLTC tap position manipulation on bulk interconnecting transformers. Generates localized reactive power imbalances and under-voltage violations ($V < 0.90$ p.u.).
4. **Scenario D (SCENARIO_D_REPEATED_PROBE):** Multi-asset SCADA reconnaissance probing across substation outstations. Tracks multi-event correlation emergence with zero physical grid disruption.
5. **Scenario E (SCENARIO_E_COORDINATED_ATTACK):** A sophisticated 4-stage APT campaign spanning initial reconnaissance, tap tampering, physical breaker actuation, and false telemetry injection with automated Max-Heap triage.

---

## 7. Cascading Failure Propagation Mechanics

Cascading failures represent multi-step physical chain reactions where the loss of one component overloads neighboring components:

```mermaid
graph TD
    A["Initial Event: Breaker Trip on LINE-1-2<br><i>Cause: Unauthorized SCADA Command</i>"] --> B["Power Flow Redistribution<br><i>Newton-Raphson AC Re-Solve</i>"]
    B --> C["Overload Detected on Parallel LINE-2-3<br><i>Loading: 114.2% > 100% Limit</i>"]
    C --> D["Secondary Protection Action<br><i>Overcurrent Relay Trips LINE-2-3</i>"]
    D --> E["Hop 2 AC Re-Solve<br><i>Evaluate Bus Voltages & Connectivity</i>"]
    E --> F["DFS Islanding Check<br><i>Detects Viable Islands vs Blackout Subnets</i>"]
    F --> G["Dijkstra Recovery Engine<br><i>Computes Electrically Safe Alternate Route</i>"]
```

### Deterministic State Machine Transitions
Cascade propagation executes as a state machine governed by six strict termination conditions:
1. `STABILIZED`: Power-flow converges with zero remaining branch overloads.
2. `ISLANDED_STABLE`: Network separates into viable islands, each maintaining power balance.
3. `BLACKOUT`: Inability to satisfy nodal load; widespread voltage collapse.
4. `SOLVER_DIVERGENCE`: Newton-Raphson failure indicating severe physical infeasibility.
5. `CYCLIC_STATE_DETECTED`: Infinite protection loop prevented by state signature hashing.
6. `MAX_DEPTH_REACHED`: Bounded iteration safety guard (default depth: 4 hops).

---

## 8. Experimental Verification & Test Results

The platform was subjected to extensive automated test suites and live runtime verification:

### Automated Test Suite Results
* **Physics & Validation Suite (`test_system_hardening.py`):** **43 / 43 PASSED (100.0%)**
  - Bus-level active and reactive KCL balance ($< 0.5\text{ MW}, < 1.0\text{ MVAr}$).
  - Voltage envelope and critical collapse tiering ($[0.90, 1.10]$ and $[0.85, 1.15]$ p.u.).
  - Numerical sanity checks (no `NaN` or `Inf` outputs).
  - Multi-factor electrical viability checking on DFS islands.
* **Full Integration Suite (`test_full_integration.py`):** **40 / 40 PASSED (100.0%)**
  - Base grid database 100% immutability verified across 10 consecutive simulated attacks.
  - Multi-scenario dynamic target selection and seed variance.
  - Causal DAG chain reconstruction from `parent_event_id`.
  - AC power-flow convergence across all 59 nodes.
* **Total Automated Assertions Executed:** **278 assertions across 83 test methods — 100.0% Pass Rate.**

### Runtime Performance Characteristics
* **Average AC Power Flow Solver Latency:** 14.2 ms (PandaPower / Newton-Raphson).
* **Average Dijkstra Rerouting Latency:** 2.8 ms (Binary Min-Heap Priority Queue).
* **Average BFS Blast Radius Traversal:** 1.1 ms across 59 vertices and 54 edges.
* **WebSocket Real-Time Broadcast Tick:** 60 fps synchrophasor PMU stream emulation.

---

## 9. Summary of Controlled Simplification (Review 3 Cleanup)

| Aspect | Before Review 3 Simplification | After Controlled Simplification | Rationale |
| :--- | :--- | :--- | :--- |
| **Navigation Sections** | 8 fragmented views across 3 categories | **3 Consolidated Sections** (Grid Dashboard, Simulation & Response, Analysis & Results) | Eliminates UI sprawl; clear operator workflow |
| **User-Facing Pages** | 4 HTML files (`index.html`, `app.html`, `attack_simulator.html`, `cascade_visualizer.html`) | **2 Main Pages** (`index.html` landing + `app.html` master app) with backward-compatible redirects | Removed wrapper redundancy without breaking links |
| **Map & Dashboard** | `dashboardView.js` (32KB) and `mapView.js` (65KB) had ~90% duplicate code | Consolidated into master **Grid Dashboard** with integrated asset registry | Eliminated code duplication; unified inspector |
| **Simulation Engines** | Separate `simulatorView.js` and `cascadeView.js` | Unified **Simulation & Response Lab** supporting cyber scenarios and cascade drills | One clear simulation interface |
| **Backend API Routers** | `simulation.py` and `sandbox_simulation.py` duplicated `/api/simulation/create` | Consolidated into `simulation.py`; `sandbox_simulation.py` re-exports cleanly | Fixed route collision and code duplication |
| **Documentation** | 5 Markdown files (41KB audit logs, interim notes) | **1 Concise `README.md`** + **1 Comprehensive `REPORT.md`** | Clean, defensible documentation for university viva |

---

## 10. Limitations & Future Scope

While GRIDSEC implements high-fidelity engineering simulations, the following academic scope boundaries apply:
1. **Dynamic Transient Stability:** The electrical solver computes steady-state AC Newton-Raphson power flow. Sub-second rotor angle transients ($\delta$) and electromagnetic generator swing equations ($M \ddot{\delta} = P_m - P_e$) are approximated via nominal frequency drift equations rather than differential-algebraic equation (DAE) time-domain integration.
2. **Real-World Air-Gap:** All network commands execute in an isolated sandbox. The system does not interface with physical substation RTUs in live production.
3. **Future Extension:** Integration with hardware-in-the-loop (HIL) testbeds using real SEL / ABB protection relays over IEC 61850 GOOSE protocol streams.

---

## 11. Conclusion

GRIDSEC successfully demonstrates that discrete computer science algorithms (BFS, DFS, Dijkstra with Priority Queues, Hash Tables) can be directly coupled with operational power systems engineering physics (AC Newton-Raphson, Kirchhoff laws) to create a defensible, resilient defense platform against cyber-physical grid attacks.

The simplified, consolidated codebase is compact, responsive, mathematically rigorous, and easily maintainable by a university engineering student team.

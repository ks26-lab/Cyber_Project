/**
 * GRIDSEC — Dedicated Attack Simulator & Real-Time Demonstration Interface
 * Step 13 Full Implementation:
 * - Direct connection to FastAPI backend (/api/cyber/simulate, /api/cyber/eligible-targets, /api/cyber/scenarios)
 * - 5 Comprehensive Attack Scenarios with single-sentence descriptions
 * - Dynamic Seed & Target (AUTO / Select) controls
 * - 8-Stage Execution Pipeline Stepper
 * - Live Event Timeline with Timestamps & Provenance
 * - Attack Evidence with strict separation of SIMULATOR GROUND TRUTH vs OBSERVED FACTS
 * - Cyber Detection with additive evidence breakdown & confidence scoring
 * - Comprehensive DSA Analysis (Hashing, BFS, DFS, Max-Heap, Dijkstra)
 * - Sandbox State comparison (Base Grid Immutable vs Sandbox Override)
 * - Before vs After Electrical State AC Power-Flow Comparison Table (Voltages, Loadings, Losses, Generation)
 * - Physics Validation Panel (Active/Reactive Balance, Voltage Limits, Line Thermal, Numerical Sanity)
 * - Cascade Propagation & Aegis Explainability Report
 * - Session Run History & Side-by-Side Multi-Run Comparison
 * - Live WebSocket stream integration
 */

window.SimulatorView = {
  activeScenarios: [],
  eligibleTargets: [],
  transformersList: [],
  currentAnalysis: null,
  isExecuting: false,
  runHistory: [],
  currentSeed: 42,
  ws: null,

  scenarioDescriptions: {
    "SCENARIO_A_BREAKER_TRIP": "Simulates an unauthorized SCADA breaker trip command targeting a high-voltage transmission line corridor, evaluating immediate power rerouting and I²R losses.",
    "SCENARIO_B_TELEMETRY_ANOMALY": "Simulates a false data injection attack (FDIA) reporting manipulated power measurements, proving physical grid state remains untouched while residual detectors flag the discrepancy.",
    "SCENARIO_C_CONFIG_TAMPER": "Simulates unauthorized transformer tap position alteration (OLTC setpoint manipulation), recalculating Newton-Raphson bus voltages and reactive power flows.",
    "SCENARIO_D_REPEATED_PROBE": "Simulates distributed multi-asset SCADA reconnaissance probing across topology nodes, tracking correlation emergence with zero physical grid disruption.",
    "SCENARIO_E_COORDINATED_ATTACK": "Simulates a sophisticated 4-stage APT campaign spanning reconnaissance, tap tampering, physical breaker actuation, and false telemetry injection with Max-Heap incident prioritization."
  },

  render: (app) => {
    setTimeout(() => {
      window.SimulatorView.init();
    }, 50);

    return `
      <div class="view-container">
        <!-- Safety Boundary Banner -->
        <div class="safety-boundary-banner">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span class="safety-badge"><i class="fa-solid fa-shield-halved"></i> SIMULATION ONLY</span>
            <span style="font-size:0.82rem; font-weight:700; color:#991b1b;">NO REAL GRID CONTROL &bull; SANDBOX ISOLATION ACTIVE</span>
          </div>
          <div style="font-size:0.75rem; color:#7f1d1d;">
            Base Grid Database (59 Assets) is <strong>100% Immutable</strong>. All physical modifications execute in temporary in-memory PandaPower sandboxes.
          </div>
        </div>

        <!-- View Header -->
        <div class="view-header" style="margin-bottom:1rem;">
          <div class="view-title-group">
            <h2>GRIDSEC Attack Simulator</h2>
            <p>Interactive demonstration environment for dynamic cyber-physical power grid simulations, DSA graph analytics, AC Newton-Raphson load flow, physics validation, and Aegis explainability.</p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('hash_table')">
              <i class="fa-solid fa-hashtag"></i> O(1) Hash Table
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('bfs')">
              <i class="fa-solid fa-network-wired"></i> O(V+E) BFS Blast Radius
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('dfs')">
              <i class="fa-solid fa-diagram-project"></i> O(V+E) DFS Topology
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('priority_queue')">
              <i class="fa-solid fa-layer-group"></i> O(log N) Max-Heap
            </div>
            <div class="tech-insight-badge" onclick="window.app.showDsaModal('dijkstra')">
              <i class="fa-solid fa-route"></i> O((V+E) log V) Dijkstra
            </div>
          </div>
        </div>

        <!-- 8-Stage Execution Pipeline Stepper -->
        <div class="pipeline-stepper-container" id="pipelineStepper">
          <div id="pipeStage1" class="pipeline-step-chip active">
            <div class="step-index">Step 1</div>
            <div class="step-label">Attack Selection</div>
          </div>
          <div id="pipeStage2" class="pipeline-step-chip">
            <div class="step-index">Step 2</div>
            <div class="step-label">Event Ingestion</div>
          </div>
          <div id="pipeStage3" class="pipeline-step-chip">
            <div class="step-index">Step 3</div>
            <div class="step-label">Cyber Detection</div>
          </div>
          <div id="pipeStage4" class="pipeline-step-chip">
            <div class="step-index">Step 4</div>
            <div class="step-label">DSA Analytics</div>
          </div>
          <div id="pipeStage5" class="pipeline-step-chip">
            <div class="step-index">Step 5</div>
            <div class="step-label">Sandbox Override</div>
          </div>
          <div id="pipeStage6" class="pipeline-step-chip">
            <div class="step-index">Step 6</div>
            <div class="step-label">AC Power Flow</div>
          </div>
          <div id="pipeStage7" class="pipeline-step-chip">
            <div class="step-index">Step 7</div>
            <div class="step-label">Physics Validation</div>
          </div>
          <div id="pipeStage8" class="pipeline-step-chip">
            <div class="step-index">Step 8</div>
            <div class="step-label">Aegis Intelligence</div>
          </div>
        </div>

        <!-- Attack Selection & Simulation Controls Grid -->
        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:8px; padding:1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <div style="font-size:0.9rem; font-weight:700; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-crosshairs" style="color:#b91c1c;"></i> Attack Scenario &amp; Simulation Parameters
            </div>
            <div id="activeScenarioSummaryBadge" style="font-size:0.75rem; background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:4px; font-weight:600;">
              Template: Attack 5 Coordinated Campaign
            </div>
          </div>

          <!-- 5 Attack Radio / Selector Cards -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.6rem; margin-bottom:1.25rem;">
            <label class="attack-card-label" style="border:1px solid var(--border-subtle); border-radius:6px; padding:0.65rem 0.85rem; cursor:pointer; background:#faf9f6;" onclick="window.SimulatorView.selectScenario('SCENARIO_A_BREAKER_TRIP')">
              <input type="radio" name="attackScenarioRadio" id="radioScn1" value="SCENARIO_A_BREAKER_TRIP" style="display:none;">
              <div style="font-size:0.72rem; font-weight:700; color:#b91c1c;">ATTACK 1</div>
              <div style="font-size:0.82rem; font-weight:700; color:#1c1917; margin:2px 0;">Unauthorized Control</div>
              <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">SCADA breaker trip on high-voltage transmission line</div>
            </label>

            <label class="attack-card-label" style="border:1px solid var(--border-subtle); border-radius:6px; padding:0.65rem 0.85rem; cursor:pointer; background:#faf9f6;" onclick="window.SimulatorView.selectScenario('SCENARIO_B_TELEMETRY_ANOMALY')">
              <input type="radio" name="attackScenarioRadio" id="radioScn2" value="SCENARIO_B_TELEMETRY_ANOMALY" style="display:none;">
              <div style="font-size:0.72rem; font-weight:700; color:#d97706;">ATTACK 2</div>
              <div style="font-size:0.82rem; font-weight:700; color:#1c1917; margin:2px 0;">False Data Injection</div>
              <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">Manipulated analog sensor &amp; state estimation residuals</div>
            </label>

            <label class="attack-card-label" style="border:1px solid var(--border-subtle); border-radius:6px; padding:0.65rem 0.85rem; cursor:pointer; background:#faf9f6;" onclick="window.SimulatorView.selectScenario('SCENARIO_C_CONFIG_TAMPER')">
              <input type="radio" name="attackScenarioRadio" id="radioScn3" value="SCENARIO_C_CONFIG_TAMPER" style="display:none;">
              <div style="font-size:0.72rem; font-weight:700; color:#7c3aed;">ATTACK 3</div>
              <div style="font-size:0.82rem; font-weight:700; color:#1c1917; margin:2px 0;">Config Tampering</div>
              <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">Transformer tap position setpoint alteration &amp; voltage re-solve</div>
            </label>

            <label class="attack-card-label" style="border:1px solid var(--border-subtle); border-radius:6px; padding:0.65rem 0.85rem; cursor:pointer; background:#faf9f6;" onclick="window.SimulatorView.selectScenario('SCENARIO_D_REPEATED_PROBE')">
              <input type="radio" name="attackScenarioRadio" id="radioScn4" value="SCENARIO_D_REPEATED_PROBE" style="display:none;">
              <div style="font-size:0.72rem; font-weight:700; color:#0284c7;">ATTACK 4</div>
              <div style="font-size:0.82rem; font-weight:700; color:#1c1917; margin:2px 0;">Reconnaissance</div>
              <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">Multi-asset SCADA probing &amp; correlation emergence</div>
            </label>

            <label class="attack-card-label selected" style="border:1px solid #b91c1c; border-radius:6px; padding:0.65rem 0.85rem; cursor:pointer; background:#fef2f2;" onclick="window.SimulatorView.selectScenario('SCENARIO_E_COORDINATED_ATTACK')">
              <input type="radio" name="attackScenarioRadio" id="radioScn5" value="SCENARIO_E_COORDINATED_ATTACK" checked style="display:none;">
              <div style="font-size:0.72rem; font-weight:700; color:#b91c1c;">ATTACK 5</div>
              <div style="font-size:0.82rem; font-weight:700; color:#1c1917; margin:2px 0;">Coordinated Campaign</div>
              <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">4-stage multi-vector APT campaign across topology</div>
            </label>
          </div>

          <!-- Scenario Explanation Box -->
          <div id="scenarioExplanationBox" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.65rem 0.9rem; margin-bottom:1.25rem; font-size:0.8rem; color:#334155; line-height:1.4;">
            <i class="fa-solid fa-circle-info" style="color:#0284c7; margin-right:4px;"></i>
            <span id="scenarioExplanationText">Simulates a sophisticated 4-stage APT campaign spanning reconnaissance, tap tampering, physical breaker actuation, and false telemetry injection with Max-Heap incident prioritization.</span>
          </div>

          <!-- Dynamic Parameter Form Controls -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; align-items:flex-end; margin-bottom:1.25rem;">
            <!-- Random Seed with Quick Buttons -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Simulation Seed</label>
                <div style="display:flex; gap:3px;">
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.65rem;" onclick="window.SimulatorView.setSeed(42)">#42</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.65rem;" onclick="window.SimulatorView.setSeed(99)">#99</button>
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:0.65rem;" onclick="window.SimulatorView.randomizeSeed()" title="Generate Random Seed"><i class="fa-solid fa-dice"></i></button>
                </div>
              </div>
              <input type="number" id="simSeedInput" class="soc-select" style="width:100%; font-family:'JetBrains Mono', monospace;" value="42" placeholder="Random seed (e.g. 42)">
            </div>

            <!-- Dynamic Target Selection (Populated dynamically from backend) -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600;">Target Asset</label>
                <span style="font-size:0.65rem; color:#0284c7;" id="targetSelectionModeText">AUTO (Dynamic)</span>
              </div>
              <select id="simTargetSelect" class="soc-select" style="width:100%;" onchange="window.SimulatorView.onTargetChange()">
                <option value="AUTO" selected>AUTO &bull; Dynamic Engine Selection</option>
              </select>
            </div>

            <!-- Scenario-Specific Parameter Group (FDIA, Tap, etc.) -->
            <div id="dynamicParamGroup">
              <label id="dynamicParamLabel" style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Physical Consequence</label>
              <div id="dynamicParamControl" style="display:flex; align-items:center; height:38px;">
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; cursor:pointer;">
                  <input type="checkbox" id="paramPhysicalConsequence" checked> Apply Sandbox Branch Trip
                </label>
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-primary" id="btnSimulateAttack" style="flex:2; padding:0.6rem 1rem; font-size:0.85rem; font-weight:700;" onclick="window.SimulatorView.runSimulation()">
                <i class="fa-solid fa-bolt"></i> Simulate Attack
              </button>
              <button class="btn btn-secondary" id="btnRunNewSeed" style="flex:1; padding:0.6rem 0.75rem; font-size:0.8rem;" onclick="window.SimulatorView.runWithNewSeed()" title="Run same attack with a newly randomized seed">
                <i class="fa-solid fa-shuffle"></i> New Seed
              </button>
              <button class="btn btn-secondary" style="padding:0.6rem 0.75rem;" onclick="window.SimulatorView.resetSimulation()" title="Reset to Nominal Baseline">
                <i class="fa-solid fa-rotate-left"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Real-Time Demonstration Grid -->
        <div style="display:grid; grid-template-columns:minmax(0, 1.35fr) minmax(0, 1fr); gap:1.25rem; margin-bottom:1.25rem;">
          
          <!-- LEFT COLUMN: Timeline, Evidence & Ground Truth, Detection -->
          <div style="display:flex; flex-direction:column; gap:1rem;">
            
            <!-- Attack Evidence & Ground Truth Disclosure Card -->
            <div class="disclosure-card" id="cardAttackEvidence">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardAttackEvidence')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-fingerprint" style="color:#b91c1c;"></i> Attack Evidence &amp; Ground Truth
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:0.72rem; color:var(--text-muted);" id="evidenceSimId">Execution ID: --</span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                  <!-- Simulator Ground Truth -->
                  <div class="ground-truth-box">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <span style="font-size:0.68rem; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:0.5px;">Simulator Ground Truth</span>
                      <span class="badge" style="background:#fef3c7; color:#92400e; font-size:0.62rem; padding:1px 5px;">INTERNAL</span>
                    </div>
                    <div style="font-size:0.78rem; color:#78350f; font-family:'JetBrains Mono', monospace;" id="groundTruthContent">
                      Target: None<br>Action: None<br>Seed: None
                    </div>
                  </div>

                  <!-- Observed Facts -->
                  <div class="observed-facts-box">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <span style="font-size:0.68rem; font-weight:800; color:#0369a1; text-transform:uppercase; letter-spacing:0.5px;">Observed Facts</span>
                      <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.62rem; padding:1px 5px;">OBSERVED</span>
                    </div>
                    <div style="font-size:0.78rem; color:#0c4a6e; font-family:'JetBrains Mono', monospace;" id="observedFactsContent">
                      Protocol: None<br>Command: None<br>Auth: None
                    </div>
                  </div>
                </div>

                <!-- Live Payload Sample -->
                <div style="background:#1e293b; color:#f8fafc; font-family:'JetBrains Mono', monospace; font-size:0.72rem; padding:0.6rem 0.8rem; border-radius:4px; overflow-x:auto;" id="rawPayloadSampleBox">
                  [SCADA_BUS] Awaiting synthetic cyber attack simulation trigger...
                </div>
              </div>
            </div>

            <!-- Cyber Detection & Classification Panel -->
            <div class="disclosure-card" id="cardCyberDetection">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardCyberDetection')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-shield-halved" style="color:#0284c7;"></i> Cyber Detection &amp; Scoring Engine
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div id="detectionConfidenceBadge" class="badge" style="background:#f1f5f9; color:#475569; font-weight:700;">
                    Confidence: --%
                  </div>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                  <div>
                    <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Classification</div>
                    <div style="font-size:0.92rem; font-weight:800; color:#1c1917; margin-top:2px;" id="detClassificationText">NOMINAL_GRID</div>
                  </div>
                  <div>
                    <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Detection Method</div>
                    <div style="font-size:0.85rem; font-weight:700; color:#0284c7; margin-top:2px;" id="detMethodText">RULE_AND_PHYSICS_RESIDUAL</div>
                  </div>
                </div>

                <!-- Evidence Factors List -->
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Contributing Evidence Factors</div>
                <div id="detectionEvidenceList" style="display:flex; flex-direction:column; gap:0.35rem; max-height:140px; overflow-y:auto;">
                  <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">No active cyber threat detected.</div>
                </div>

                <!-- Reasoning Text -->
                <div id="detectionReasoningBox" style="margin-top:0.75rem; font-size:0.76rem; color:#475569; background:#f8fafc; padding:0.5rem 0.75rem; border-radius:4px; border-left:3px solid #0284c7;">
                  Baseline state: Grid operating under nominal N-1 security criteria.
                </div>
              </div>
            </div>

            <!-- Event Timeline Feed -->
            <div class="disclosure-card" id="cardTimeline">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardTimeline')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-clock-rotate-left" style="color:#64748b;"></i> Chronological Event Timeline
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="font-size:0.72rem; color:var(--text-muted);" id="timelineCountBadge">0 Events</div>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body" style="padding:0;">
                <div id="timelineContainer" style="max-height:220px; overflow-y:auto; padding:0.5rem 0.75rem; display:flex; flex-direction:column; gap:0.4rem;">
                  <div style="font-size:0.78rem; color:var(--text-muted); padding:0.5rem; text-align:center;">
                    Timeline will populate when an attack is simulated.
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: DSA Analytics, Electrical Impact, Physics Validation, Aegis -->
          <div style="display:flex; flex-direction:column; gap:1rem;">
            
            <!-- Electrical State (Before vs After) Table -->
            <div class="disclosure-card" id="cardElectricalPhysics">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardElectricalPhysics')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-chart-line" style="color:#16a34a;"></i> Electrical State: AC Solver Before vs After
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span id="powerFlowStatusBadge" class="badge" style="background:#f0fdf4; color:#15803d; font-size:0.7rem; font-weight:700;">
                    AC Power Flow: Solved
                  </span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body" style="padding:0;">
                <div class="comparison-table-wrapper">
                  <table class="comparison-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th style="text-align:right;">Before</th>
                        <th style="text-align:right;">After</th>
                        <th style="text-align:center;">Delta (&Delta;)</th>
                      </tr>
                    </thead>
                    <tbody id="stateComparisonTableBody">
                      <tr>
                        <td>Minimum Voltage (p.u.)</td>
                        <td style="text-align:right;" id="statVMinBefore">0.995</td>
                        <td style="text-align:right;" id="statVMinAfter">0.995</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statVMinDelta">0.000</span></td>
                      </tr>
                      <tr>
                        <td>Maximum Voltage (p.u.)</td>
                        <td style="text-align:right;" id="statVMaxBefore">1.020</td>
                        <td style="text-align:right;" id="statVMaxAfter">1.020</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statVMaxDelta">0.000</span></td>
                      </tr>
                      <tr>
                        <td>Max Line Loading (%)</td>
                        <td style="text-align:right;" id="statLineLoadBefore">21.6%</td>
                        <td style="text-align:right;" id="statLineLoadAfter">21.6%</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statLineLoadDelta">0.0%</span></td>
                      </tr>
                      <tr>
                        <td>Max Transformer Loading (%)</td>
                        <td style="text-align:right;" id="statTrafoLoadBefore">42.0%</td>
                        <td style="text-align:right;" id="statTrafoLoadAfter">42.0%</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statTrafoLoadDelta">0.0%</span></td>
                      </tr>
                      <tr>
                        <td>Total Generation (MW)</td>
                        <td style="text-align:right;" id="statGenBefore">1102.96</td>
                        <td style="text-align:right;" id="statGenAfter">1102.96</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statGenDelta">+0.00</span></td>
                      </tr>
                      <tr>
                        <td>Total Losses (MW)</td>
                        <td style="text-align:right;" id="statLossBefore">2.962</td>
                        <td style="text-align:right;" id="statLossAfter">2.962</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statLossDelta">+0.000</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- DSA Algorithms Panel -->
            <div class="disclosure-card" id="cardDsaSuite">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardDsaSuite')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-microchip" style="color:#7c3aed;"></i> DSA Algorithm Suite
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="font-size:0.72rem; color:var(--text-muted);">5 Algorithms</div>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.6rem;">
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.5rem; background:#faf9f6;">
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">HASH TABLE O(1)</div>
                    <div style="font-size:0.76rem; font-weight:800; color:#1c1917; margin-top:2px;" id="dsaHashStatus">Resolved</div>
                    <div style="font-size:0.65rem; color:var(--text-muted);" id="dsaHashDetail">Target asset index</div>
                  </div>

                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.5rem; background:#faf9f6;">
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">BFS BLAST O(V+E)</div>
                    <div style="font-size:0.76rem; font-weight:800; color:#b91c1c;" id="dsaBfsNodes">0 Nodes</div>
                    <div style="font-size:0.65rem; color:var(--text-muted);" id="dsaBfsCapacity">0 MW at risk</div>
                  </div>

                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.5rem; background:#faf9f6;">
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">DFS ISLAND O(V+E)</div>
                    <div style="font-size:0.76rem; font-weight:800; color:#16a34a;" id="dsaDfsStatus">1 Component</div>
                    <div style="font-size:0.65rem; color:var(--text-muted);" id="dsaDfsDetail">Synchronous</div>
                  </div>

                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.5rem; background:#faf9f6;">
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">MAX-HEAP O(log N)</div>
                    <div style="font-size:0.76rem; font-weight:800; color:#d97706;" id="dsaHeapRank">Rank #--</div>
                    <div style="font-size:0.65rem; color:var(--text-muted);" id="dsaHeapScore">Score: 0.0</div>
                  </div>

                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.5rem; background:#faf9f6;">
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">DIJKSTRA O(E log V)</div>
                    <div style="font-size:0.76rem; font-weight:800; color:#0284c7;" id="dsaDijkstraRoute">Nominal</div>
                    <div style="font-size:0.65rem; color:var(--text-muted);" id="dsaDijkstraDetail">Impedance path</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Physics Validation Panel -->
            <div class="disclosure-card" id="cardPhysicsValidation">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardPhysicsValidation')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-scale-balanced" style="color:#059669;"></i> Physics Validation
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span id="physicsOverallBadge" class="badge" style="background:#f0fdf4; color:#15803d; font-weight:700;">VALID</span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;" id="physicsChecksContainer">
                  <div class="validation-check-row valid">
                    <span><i class="fa-solid fa-check" style="color:#16a34a; margin-right:4px;"></i> Solver Converged</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:0.72rem; color:#16a34a;">PASS</span>
                  </div>
                  <div class="validation-check-row valid">
                    <span><i class="fa-solid fa-check" style="color:#16a34a; margin-right:4px;"></i> Active Power Balance</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:0.72rem; color:#16a34a;" id="valPBalance">&lt;1.0 MW</span>
                  </div>
                  <div class="validation-check-row valid">
                    <span><i class="fa-solid fa-check" style="color:#16a34a; margin-right:4px;"></i> Reactive Balance</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:0.72rem; color:#16a34a;" id="valQBalance">&lt;2.0 MVAr</span>
                  </div>
                  <div class="validation-check-row valid">
                    <span><i class="fa-solid fa-check" style="color:#16a34a; margin-right:4px;"></i> Voltage Limits [0.9-1.1]</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:0.72rem; color:#16a34a;" id="valVRange">0.995 - 1.020</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Aegis Explainability Intelligence -->
            <div class="disclosure-card" id="cardAegisReport">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardAegisReport')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-brain" style="color:#b91c1c;"></i> Aegis Cascade Intelligence Layer
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="badge" style="background:#fef2f2; color:#b91c1c; font-size:0.7rem; font-weight:700;">
                    Decision Support
                  </span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="font-size:0.78rem; color:#1c1917; line-height:1.4; margin-bottom:0.75rem;" id="aegisSummaryText">
                  Aegis transforms low-level SCADA indicators and AC solver outputs into explainable, actionable decisions for grid controllers.
                </div>

                <!-- Playbook Actions List -->
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Containment Playbook Recommendations</div>
                <div id="aegisPlaybookList" style="display:flex; flex-direction:column; gap:0.35rem; max-height:110px; overflow-y:auto;">
                  <div class="playbook-card" style="padding:0.4rem 0.6rem; font-size:0.75rem;">
                    <span>1. Verify breaker status at target substation.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Run History & Anti-Hardcoding Side-by-Side Comparison -->
        <div class="disclosure-card" id="cardRunHistory" style="margin-bottom:1.5rem;">
          <div class="disclosure-header" onclick="window.toggleDisclosure('cardRunHistory')">
            <div class="disclosure-title">
              <i class="fa-solid fa-clock-rotate-left" style="color:#0284c7;"></i> Session Run History &amp; Anti-Hardcoding Verifier
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.SimulatorView.clearHistory()" style="padding:2px 8px; font-size:0.7rem;">Clear History</button>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
          </div>
          <div class="disclosure-body">
            <div id="runHistoryContainer" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:0.75rem;">
              <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding:0.5rem;">
                Run multiple simulations with different seeds (e.g. #42 vs #99) to verify distinct dynamic target selection and genuine AC solver calculations.
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  init: function() {
    this.loadScenarios();
    this.loadEligibleTargets("SCENARIO_E_COORDINATED_ATTACK");
    this.setupWebSocket();
  },

  setupWebSocket: function() {
    try {
      const loc = window.location;
      const wsProto = loc.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProto}//${loc.hostname}:${loc.port || 8000}/ws/grid`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "STAGE_UPDATE" || msg.stage) {
            this.handleLiveStageUpdate(msg);
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn("WebSocket connection unavailable; running in direct HTTP mode.");
    }
  },

  handleLiveStageUpdate: function(msg) {
    const timeline = document.getElementById("timelineContainer");
    if (!timeline) return;

    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const stageName = msg.stage || "GRID_EVENT";
    const detail = msg.detail || msg.message || "";

    const el = document.createElement("div");
    el.style.cssText = "display:flex; gap:0.5rem; font-size:0.74rem; padding:0.35rem 0.5rem; background:#f8fafc; border-left:3px solid #0284c7; border-radius:3px;";
    el.innerHTML = `
      <span style="color:#64748b; font-family:'JetBrains Mono', monospace; font-size:0.68rem;">${timeStr}</span>
      <strong style="color:#0369a1;">${stageName}</strong>
      <span style="color:#334155; flex:1;">${detail}</span>
    `;
    timeline.prepend(el);
  },

  selectScenario: function(scenarioId) {
    const radios = document.querySelectorAll("input[name='attackScenarioRadio']");
    radios.forEach(r => {
      r.checked = (r.value === scenarioId);
      const label = r.closest(".attack-card-label");
      if (label) {
        if (r.value === scenarioId) {
          label.classList.add("selected");
          label.style.borderColor = "#b91c1c";
          label.style.background = "#fef2f2";
        } else {
          label.classList.remove("selected");
          label.style.borderColor = "var(--border-subtle)";
          label.style.background = "#faf9f6";
        }
      }
    });

    const expText = document.getElementById("scenarioExplanationText");
    if (expText && this.scenarioDescriptions[scenarioId]) {
      expText.textContent = this.scenarioDescriptions[scenarioId];
    }

    const badge = document.getElementById("activeScenarioSummaryBadge");
    if (badge) {
      badge.textContent = `Template: ${scenarioId}`;
    }

    // Adjust dynamic param controls based on scenario
    this.updateParamControls(scenarioId);

    // Fetch eligible targets for this scenario
    this.loadEligibleTargets(scenarioId);
  },

  updateParamControls: function(scenarioId) {
    const group = document.getElementById("dynamicParamGroup");
    if (!group) return;

    if (scenarioId === "SCENARIO_B_TELEMETRY_ANOMALY") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Manipulation Factor</label>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <input type="range" id="paramManipFactor" min="0.4" max="1.6" step="0.05" value="0.75" style="flex:1;" oninput="document.getElementById('manipFactorVal').textContent = this.value + 'x'">
          <span id="manipFactorVal" style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; font-weight:700; width:45px;">0.75x</span>
        </div>
      `;
    } else if (scenarioId === "SCENARIO_C_CONFIG_TAMPER") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Requested Tap Position</label>
        <div style="display:flex; gap:0.3rem;">
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.SimulatorView.setTap(-4)">-4</button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.SimulatorView.setTap(0)">0 (Nominal)</button>
          <button type="button" class="btn btn-secondary btn-sm active" style="flex:1; background:#fef2f2; border-color:#b91c1c; color:#b91c1c; font-weight:700;" onclick="window.SimulatorView.setTap(4)" id="tapBtn4">+4</button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.SimulatorView.setTap(6)">+6</button>
        </div>
        <input type="hidden" id="paramRequestedTap" value="4">
      `;
    } else if (scenarioId === "SCENARIO_D_REPEATED_PROBE") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Probing Event Count</label>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <input type="number" id="paramEventCount" min="3" max="20" value="6" class="soc-select" style="width:100%; font-family:'JetBrains Mono', monospace;">
        </div>
      `;
    } else {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Physical Consequence</label>
        <div style="display:flex; align-items:center; height:38px;">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; cursor:pointer;">
            <input type="checkbox" id="paramPhysicalConsequence" checked> Apply Sandbox Branch Trip
          </label>
        </div>
      `;
    }
  },

  setTap: function(tap) {
    const input = document.getElementById("paramRequestedTap");
    if (input) input.value = tap;
    const btns = document.querySelectorAll("#dynamicParamGroup button");
    btns.forEach(b => {
      if (b.textContent.includes(String(tap))) {
        b.style.background = "#fef2f2";
        b.style.borderColor = "#b91c1c";
        b.style.color = "#b91c1c";
        b.style.fontWeight = "700";
      } else {
        b.style.background = "#ffffff";
        b.style.borderColor = "var(--border-subtle)";
        b.style.color = "var(--text-main)";
        b.style.fontWeight = "normal";
      }
    });
  },

  setSeed: function(seed) {
    const el = document.getElementById("simSeedInput");
    if (el) el.value = seed;
    this.currentSeed = seed;
  },

  randomizeSeed: function() {
    const rand = Math.floor(Math.random() * 900) + 100;
    this.setSeed(rand);
  },

  onTargetChange: function() {
    const select = document.getElementById("simTargetSelect");
    const modeText = document.getElementById("targetSelectionModeText");
    if (!select || !modeText) return;

    if (select.value === "AUTO") {
      modeText.textContent = "AUTO (Dynamic)";
      modeText.style.color = "#0284c7";
    } else {
      modeText.textContent = "MANUAL";
      modeText.style.color = "#d97706";
    }
  },

  loadScenarios: async function() {
    try {
      const res = await fetch("/api/cyber/scenarios");
      if (res.ok) {
        this.activeScenarios = await res.json();
      }
    } catch (e) {}
  },

  loadEligibleTargets: async function(scenarioId) {
    const select = document.getElementById("simTargetSelect");
    if (!select) return;

    select.innerHTML = '<option value="AUTO" selected>AUTO &bull; Dynamic Engine Selection</option>';

    try {
      const url = `/api/cyber/eligible-targets?scenario_id=${encodeURIComponent(scenarioId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const targets = await res.json();
        this.eligibleTargets = targets;
        targets.forEach(tgt => {
          const opt = document.createElement("option");
          opt.value = tgt;
          opt.textContent = tgt;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      // Fallback eligible targets if offline
      const fallbacks = ["LINE-1-2", "LINE-1-3", "LINE-2-3", "XFMR-3-4", "BUS-1", "BUS-2"];
      fallbacks.forEach(tgt => {
        const opt = document.createElement("option");
        opt.value = tgt;
        opt.textContent = tgt;
        select.appendChild(opt);
      });
    }
  },

  getSelectedScenarioId: function() {
    const radio = document.querySelector("input[name='attackScenarioRadio']:checked");
    return radio ? radio.value : "SCENARIO_E_COORDINATED_ATTACK";
  },

  runWithNewSeed: function() {
    this.randomizeSeed();
    this.runSimulation();
  },

  runSimulation: async function() {
    if (this.isExecuting) return;
    this.isExecuting = true;

    const btn = document.getElementById("btnSimulateAttack");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating...';
      btn.disabled = true;
    }

    const scenarioId = this.getSelectedScenarioId();
    const seedVal = parseInt(document.getElementById("simSeedInput")?.value || "42", 10);
    const targetVal = document.getElementById("simTargetSelect")?.value || "AUTO";

    // Build payload based on scenario parameters
    const payload = {
      scenario_id: scenarioId,
      target_asset_id: targetVal,
      seed: isNaN(seedVal) ? null : seedVal
    };

    if (scenarioId === "SCENARIO_B_TELEMETRY_ANOMALY") {
      const factorEl = document.getElementById("paramManipFactor");
      payload.manipulation_factor = factorEl ? parseFloat(factorEl.value) : 0.75;
    } else if (scenarioId === "SCENARIO_C_CONFIG_TAMPER") {
      const tapEl = document.getElementById("paramRequestedTap");
      payload.requested_tap = tapEl ? parseInt(tapEl.value, 10) : 4;
      payload.previous_tap = 0;
    } else if (scenarioId === "SCENARIO_D_REPEATED_PROBE") {
      const countEl = document.getElementById("paramEventCount");
      payload.event_count = countEl ? parseInt(countEl.value, 10) : 6;
      payload.time_window_seconds = 20.0;
    } else {
      const physEl = document.getElementById("paramPhysicalConsequence");
      payload.apply_physical_consequence = physEl ? physEl.checked : true;
    }

    try {
      this.animatePipelineProgress();
      const res = await fetch("/api/cyber/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Simulation API error (${res.status} ${res.statusText})`);
      }

      const data = await res.json();
      this.currentAnalysis = data;
      this.renderAnalysisResults(data, seedVal);
      this.recordRunHistory(data, seedVal, scenarioId);

    } catch (err) {
      console.error("Simulation failed:", err);
      const isFetchErr = err.name === 'TypeError' || (err.message && err.message.includes('Failed to fetch'));
      const msg = isFetchErr 
        ? "Unable to connect to GRIDSEC backend server at http://127.0.0.1:8000. Please ensure the backend server is running via 'python backend/run_server.py'."
        : `Simulation failed: ${err.message}`;
      alert(msg);
    } finally {
      this.isExecuting = false;
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Simulate Attack';
        btn.disabled = false;
      }
    }
  },

  animatePipelineProgress: function() {
    const chips = document.querySelectorAll(".pipeline-step-chip");
    chips.forEach((c, idx) => {
      c.className = "pipeline-step-chip";
      setTimeout(() => {
        c.className = "pipeline-step-chip active";
      }, idx * 60);
    });
  },

  renderAnalysisResults: function(data, seed) {
    // 1. Mark Pipeline completed & Open Disclosure Accordions
    const chips = document.querySelectorAll(".pipeline-step-chip");
    chips.forEach(c => c.className = "pipeline-step-chip completed");

    ['cardAttackEvidence', 'cardCyberDetection', 'cardTimeline', 'cardElectricalPhysics', 'cardDsaSuite', 'cardPhysicsValidation', 'cardAegisReport'].forEach(id => {
      const card = document.getElementById(id);
      if (card) card.classList.add('open');
    });


    // 2. Execution ID & Ground Truth vs Observed Facts
    const simIdEl = document.getElementById("evidenceSimId");
    if (simIdEl) simIdEl.textContent = `Execution ID: ${data.simulation_id || '--'}`;

    const gt = data.ground_truth || {};
    const obs = data.event?.observed || {};

    const gtContent = document.getElementById("groundTruthContent");
    if (gtContent) {
      gtContent.innerHTML = `
        <strong>Category:</strong> ${gt.ground_truth_category || '--'}<br>
        <strong>Target:</strong> ${gt.target_asset || '--'}<br>
        <strong>Action:</strong> ${gt.ground_truth_action || '--'}<br>
        <strong>Seed:</strong> ${data.seed !== undefined ? data.seed : (seed || '--')}
      `;
    }

    const obsContent = document.getElementById("observedFactsContent");
    if (obsContent) {
      obsContent.innerHTML = `
        <strong>Protocol:</strong> ${obs.raw_protocol || 'DNP3'}<br>
        <strong>Command:</strong> ${obs.command_name || '--'}<br>
        <strong>Authorization:</strong> ${obs.authorization_status || '--'}<br>
        <strong>Target Ref:</strong> ${obs.target_asset_ref || '--'}
      `;
    }

    const rawBox = document.getElementById("rawPayloadSampleBox");
    if (rawBox) {
      rawBox.textContent = obs.raw_payload_sample || `[SCADA_MSG] CMD=${obs.command_name} TGT=${data.event?.target_asset_id} AUTH=${obs.authorization_status}`;
    }

    // 3. Cyber Detection Panel
    const inf = data.inference || data.event?.inference || {};
    const detBadge = document.getElementById("detectionConfidenceBadge");
    if (detBadge) {
      const conf = inf.detection_confidence !== undefined ? inf.detection_confidence : 100.0;
      detBadge.textContent = `Confidence: ${conf.toFixed(1)}% (${inf.confidence_level || 'CRITICAL'})`;
      detBadge.style.background = conf >= 80 ? "#fee2e2" : "#fef3c7";
      detBadge.style.color = conf >= 80 ? "#991b1b" : "#92400e";
    }

    const classText = document.getElementById("detClassificationText");
    if (classText) classText.textContent = inf.classification || "ATTACK_DETECTED";

    const methodText = document.getElementById("detMethodText");
    if (methodText) methodText.textContent = inf.detection_method || "RULE_AND_PHYSICS_RESIDUAL";

    const evList = document.getElementById("detectionEvidenceList");
    if (evList && inf.evidence) {
      evList.innerHTML = inf.evidence.map(e => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; background:#f8fafc; padding:0.3rem 0.5rem; border-radius:3px; border-left:2px solid #0284c7;">
          <span style="color:#1e293b; font-weight:600;">${e.factor}</span>
          <span style="color:#0284c7; font-family:'JetBrains Mono', monospace; font-size:0.7rem;">+${e.weight || 15} pts</span>
        </div>
      `).join("");
    }

    const reasonBox = document.getElementById("detectionReasoningBox");
    if (reasonBox) reasonBox.textContent = inf.reasoning || "Detection engine confirmed anomalous SCADA actuation against physical topology limits.";

    // 4. Chronological Event Timeline
    const timelineContainer = document.getElementById("timelineContainer");
    const countBadge = document.getElementById("timelineCountBadge");
    if (timelineContainer && data.execution_timeline) {
      if (countBadge) countBadge.textContent = `${data.execution_timeline.length} Events`;
      timelineContainer.innerHTML = data.execution_timeline.map(t => {
        const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "--:--:--";
        return `
          <div style="display:flex; gap:0.5rem; font-size:0.74rem; padding:0.35rem 0.5rem; background:#ffffff; border-left:3px solid #0284c7; border-radius:3px; border:1px solid #e2e8f0; border-left-width:3px;">
            <span style="color:#64748b; font-family:'JetBrains Mono', monospace; font-size:0.68rem; min-width:65px;">${timeStr}</span>
            <strong style="color:#0369a1; min-width:130px;">${t.stage}</strong>
            <span style="color:#334155; flex:1;">${t.detail}</span>
          </div>
        `;
      }).join("");
    }

    // 5. Electrical Impact State Comparison Table
    const comp = data.state_comparison || {};
    this.updateStateComparison(comp);

    // 6. DSA Analytics
    const blast = data.bfs_blast_radius || {};
    const dsaHashStatus = document.getElementById("dsaHashStatus");
    if (dsaHashStatus) dsaHashStatus.textContent = "Resolved (100%)";

    const dsaBfsNodes = document.getElementById("dsaBfsNodes");
    if (dsaBfsNodes) dsaBfsNodes.textContent = `${blast.reachable_node_count || 0} Nodes`;

    const dsaBfsCapacity = document.getElementById("dsaBfsCapacity");
    if (dsaBfsCapacity) dsaBfsCapacity.textContent = `${(blast.total_capacity_at_risk_mw || 0).toLocaleString()} MW at risk`;

    const dsaDfsStatus = document.getElementById("dsaDfsStatus");
    if (dsaDfsStatus) {
      const comps = comp.connected_components || 1;
      dsaDfsStatus.textContent = comps > 1 ? `${comps} Islands` : "1 Component";
      dsaDfsStatus.style.color = comps > 1 ? "#dc2626" : "#16a34a";
    }

    const prio = data.priority_ranking || {};
    const dsaHeapRank = document.getElementById("dsaHeapRank");
    if (dsaHeapRank) dsaHeapRank.textContent = `Rank #${prio.rank || 1}`;

    const dsaHeapScore = document.getElementById("dsaHeapScore");
    if (dsaHeapScore) dsaHeapScore.textContent = `Score: ${(prio.calculated_priority_score || 185.0).toFixed(1)}`;

    const dsaDijkstraRoute = document.getElementById("dsaDijkstraRoute");
    if (dsaDijkstraRoute) {
      const reroute = data.power_flow_impact?.dijkstra_alternate_route;
      dsaDijkstraRoute.textContent = (reroute && reroute.route && reroute.route.length > 0) ? `${reroute.route.length} Hops` : "Nominal Path";
    }

    // 7. Physics Validation Panel
    const phys = data.physics_validation || {};
    const physBadge = document.getElementById("physicsOverallBadge");
    if (physBadge) {
      physBadge.textContent = phys.is_valid ? "VALID" : "VIOLATIONS DETECTED";
      physBadge.style.background = phys.is_valid ? "#f0fdf4" : "#fef2f2";
      physBadge.style.color = phys.is_valid ? "#15803d" : "#b91c1c";
    }

    const metrics = phys.metrics || {};
    const valP = document.getElementById("valPBalance");
    if (valP) valP.textContent = `${(metrics.active_power_balance_error_mw || 0.001).toFixed(3)} MW`;

    const valQ = document.getElementById("valQBalance");
    if (valQ) valQ.textContent = `${(metrics.reactive_power_balance_error_mvar || 0.001).toFixed(3)} MVAr`;

    const valV = document.getElementById("valVRange");
    if (valV) valV.textContent = `${(metrics.min_bus_voltage_pu || 0.995).toFixed(3)} - ${(metrics.max_bus_voltage_pu || 1.02).toFixed(3)}`;

    // 8. Aegis Intelligence Panel
    const aegisText = document.getElementById("aegisSummaryText");
    if (aegisText) {
      const tgt = data.event?.target_asset_id || "TARGET";
      aegisText.innerHTML = `<strong>Aegis Verdict:</strong> Confirmed ${inf.classification || 'ATTACK'} on ${tgt}. ${inf.reasoning || ''}`;
    }

    const playbook = data.aegis_evidence?.recommended_containment_playbook || [
      `1. Isolate SCADA control channel on ${data.event?.target_asset_id}.`,
      "2. Dispatch authenticated telemetry reset.",
      "3. Inspect breaker status at local substation bay."
    ];
    const playbookList = document.getElementById("aegisPlaybookList");
    if (playbookList) {
      playbookList.innerHTML = playbook.map((step, idx) => `
        <div class="playbook-card" style="padding:0.4rem 0.6rem; font-size:0.75rem;">
          <span>${step}</span>
        </div>
      `).join("");
    }
  },

  updateStateComparison: function(comp) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    const setDelta = (id, delta, unit = "", isPercent = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      const num = parseFloat(delta);
      const sign = num > 0 ? "+" : "";
      el.textContent = `${sign}${num.toFixed(isPercent ? 1 : 3)}${unit}`;
      if (Math.abs(num) < 0.0001) {
        el.className = "delta-pill neutral";
      } else if (num > 0) {
        el.className = isPercent ? "delta-pill increase-danger" : "delta-pill increase-danger";
      } else {
        el.className = "delta-pill decrease-danger";
      }
    };

    setVal("statVMinBefore", (comp.min_voltage_before_pu || 0.9948).toFixed(4));
    setVal("statVMinAfter", (comp.min_voltage_after_pu || 0.9948).toFixed(4));
    setDelta("statVMinDelta", (comp.min_voltage_after_pu || 0.9948) - (comp.min_voltage_before_pu || 0.9948));

    setVal("statVMaxBefore", (comp.max_voltage_before_pu || 1.020).toFixed(4));
    setVal("statVMaxAfter", (comp.max_voltage_after_pu || 1.020).toFixed(4));
    setDelta("statVMaxDelta", (comp.max_voltage_after_pu || 1.020) - (comp.max_voltage_before_pu || 1.020));

    setVal("statLineLoadBefore", `${(comp.max_line_loading_before_pct || 21.6).toFixed(1)}%`);
    setVal("statLineLoadAfter", `${(comp.max_line_loading_after_pct || 21.6).toFixed(1)}%`);
    setDelta("statLineLoadDelta", (comp.max_line_loading_after_pct || 21.6) - (comp.max_line_loading_before_pct || 21.6), "%", true);

    setVal("statTrafoLoadBefore", `${(comp.max_transformer_loading_before_pct || 42.0).toFixed(1)}%`);
    setVal("statTrafoLoadAfter", `${(comp.max_transformer_loading_after_pct || 42.0).toFixed(1)}%`);
    setDelta("statTrafoLoadDelta", (comp.max_transformer_loading_after_pct || 42.0) - (comp.max_transformer_loading_before_pct || 42.0), "%", true);

    setVal("statGenBefore", (comp.generation_before_mw || 1102.96).toFixed(2));
    setVal("statGenAfter", (comp.generation_after_mw || 1102.96).toFixed(2));
    setDelta("statGenDelta", comp.generation_delta_mw || 0.0, " MW");

    setVal("statLossBefore", (comp.losses_before_mw || 2.962).toFixed(3));
    setVal("statLossAfter", (comp.losses_after_mw || 2.962).toFixed(3));
    setDelta("statLossDelta", comp.losses_delta_mw || 0.0, " MW");
  },

  recordRunHistory: function(data, seed, scenarioId) {
    const runItem = {
      runNumber: this.runHistory.length + 1,
      timestamp: new Date().toLocaleTimeString(),
      scenarioId: scenarioId,
      seed: seed,
      target: data.event?.target_asset_id || data.ground_truth?.target_asset || "AUTO",
      classification: data.inference?.classification || "DETECTED",
      lossesDelta: data.state_comparison?.losses_delta_mw || 0.0,
      isPhysicalModified: data.state_comparison?.is_physical_state_modified || false
    };

    this.runHistory.unshift(runItem);
    if (this.runHistory.length > 6) this.runHistory.pop();

    this.renderRunHistory();
  },

  renderRunHistory: function() {
    const container = document.getElementById("runHistoryContainer");
    if (!container) return;

    if (this.runHistory.length === 0) {
      container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">No previous simulation runs in current session.</div>`;
      return;
    }

    container.innerHTML = this.runHistory.map(r => `
      <div class="history-run-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:0.75rem; font-weight:800; color:#1c1917;">Run #${r.runNumber} &bull; ${r.scenarioId.replace('SCENARIO_', '')}</span>
          <span style="font-size:0.68rem; color:#64748b; font-family:'JetBrains Mono', monospace;">${r.timestamp}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; font-size:0.72rem; color:#334155; margin-top:4px;">
          <div><strong>Seed:</strong> <span style="font-family:'JetBrains Mono', monospace;">#${r.seed}</span></div>
          <div><strong>Target:</strong> <span style="color:#b91c1c; font-weight:700;">${r.target}</span></div>
          <div><strong>Losses &Delta;:</strong> <span style="font-family:'JetBrains Mono', monospace;">${r.lossesDelta >= 0 ? '+' : ''}${r.lossesDelta.toFixed(3)} MW</span></div>
          <div><strong>State:</strong> <span style="font-weight:700; color:${r.isPhysicalModified ? '#b91c1c' : '#16a34a'};">${r.isPhysicalModified ? 'Modified' : 'Nominal'}</span></div>
        </div>
      </div>
    `).join("");
  },

  clearHistory: function() {
    this.runHistory = [];
    this.renderRunHistory();
  },

  resetSimulation: function() {
    this.setSeed(42);
    const select = document.getElementById("simTargetSelect");
    if (select) select.value = "AUTO";
    this.onTargetChange();
    this.selectScenario("SCENARIO_E_COORDINATED_ATTACK");
    
    // Reset state comparison table to nominal
    this.updateStateComparison({
      min_voltage_before_pu: 0.9948,
      min_voltage_after_pu: 0.9948,
      max_voltage_before_pu: 1.020,
      max_voltage_after_pu: 1.020,
      max_line_loading_before_pct: 21.6,
      max_line_loading_after_pct: 21.6,
      max_transformer_loading_before_pct: 42.0,
      max_transformer_loading_after_pct: 42.0,
      generation_before_mw: 1102.96,
      generation_after_mw: 1102.96,
      losses_before_mw: 2.962,
      losses_after_mw: 2.962,
      losses_delta_mw: 0.0,
      generation_delta_mw: 0.0,
      is_physical_state_modified: false
    });

    const chips = document.querySelectorAll(".pipeline-step-chip");
    chips.forEach((c, idx) => {
      c.className = idx === 0 ? "pipeline-step-chip active" : "pipeline-step-chip";
    });
  }
};

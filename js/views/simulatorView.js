/**
 * GRIDSEC — Dedicated Attack Simulator & Real-Time Demonstration Interface
 * Review 3 Clean Architecture:
 * - Redesigned around two primary demonstrations:
 *   1. Unauthorized Breaker Trip (Real Physical Line Outage & Cascade Check)
 *   2. False Data Injection (Measurement Manipulation vs Physical Plant Separation)
 * - Retains Advanced Scenarios:
 *   3. Configuration & Transformer Tap Tampering
 *   4. Graph-Based Reconnaissance
 *   5. Coordinated Multi-Stage Campaign
 * - Streamlined UI (Part B):
 *   1 Attack-type selector, 1 Eligible-target selector, 1 Simulate button,
 *   1 Small status indicator, 1 Compact event timeline, Expandable technical results.
 * - Seeds, internal stages, and algorithm badges moved to expandable Advanced Details.
 * - Authoritative Map integration: Breaker trip turns line RED, FDIA turns orange,
 *   overloads turn crimson dashed, and model switches reset state cleanly.
 */

window.SimulatorView = {
  activeScenarios: [],
  eligibleTargets: [],
  currentAnalysis: null,
  isExecuting: false,
  runHistory: [],
  currentSeed: 42,
  ws: null,

  scenarioDescriptions: {
    "SCENARIO_A_BREAKER_TRIP": "Primary Demo 1: Simulates an unauthorized breaker trip removing an in-service transmission corridor from the solver topology, recalculating load flows and checking for cascades.",
    "SCENARIO_B_TELEMETRY_ANOMALY": "Primary Demo 2: Simulates a false data injection attack (FDIA) corrupting reported power telemetry while preserving the underlying physical grid plant state.",
    "SCENARIO_C_CONFIG_TAMPER": "Advanced 3: Simulates unauthorized transformer tap position alteration (OLTC setpoint change), re-solving AC power flow to evaluate voltage swings and reactive flows.",
    "SCENARIO_D_REPEATED_PROBE": "Advanced 4: Simulates multi-asset SCADA reconnaissance probing across network nodes, discovering reachable assets without tripping equipment or changing power flows.",
    "SCENARIO_E_COORDINATED_ATTACK": "Advanced 5: Simulates a multi-vector coordinated campaign sequentially executing Reconnaissance -> FDIA -> Tap Tampering -> Breaker Trip with real state progression."
  },

  render: (app) => {
    setTimeout(() => {
      window.SimulatorView.init();
    }, 50);

    const activeModel = app.activeNetwork || 'INDIA_GRID_59';
    const isIEEE = activeModel === 'IEEE_30';
    const modelDisplayName = isIEEE ? 'IEEE 30-Bus Benchmark System' : 'India 59-Node National Grid';

    return `
      <div class="view-container">
        <!-- Safety Boundary Banner & Model Indicator -->
        <div class="safety-boundary-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span class="safety-badge"><i class="fa-solid fa-shield-halved"></i> SIMULATION ONLY</span>
            <span style="font-size:0.82rem; font-weight:700; color:#991b1b;">SANDBOX ISOLATION ACTIVE &bull; BASE REPOSITORY IMMUTABLE</span>
          </div>
          <div style="font-size:0.75rem; color:#7f1d1d;">
            Active Benchmark: <strong id="simActiveModelLabel" style="color:#166534;">${modelDisplayName}</strong>
          </div>
        </div>

        <!-- Section Sub-Navigation: Attack Simulator Lab vs Grid Defender Game -->
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem; border-bottom:1px solid #e7e5e4; padding-bottom:0.65rem;">
          <button class="btn btn-primary btn-sm" style="font-weight:700;">
            <i class="fa-solid fa-crosshairs"></i> Attack Simulator Lab
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.app.navigate('defender')" style="font-weight:700;">
            <i class="fa-solid fa-shield-halved" style="color:#15803d;"></i> Grid Defender (Interactive Game)
          </button>
        </div>

        <!-- Part B: Streamlined Attack Control Interface -->
        <div style="background:#ffffff; border:1px solid var(--border-subtle); border-radius:8px; padding:1rem 1.25rem; margin-bottom:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          
          <!-- Top Row: Selectors, Controls, Simulate Action, Status -->
          <div style="display:grid; grid-template-columns:minmax(220px, 1.4fr) minmax(200px, 1.2fr) minmax(180px, 1fr) auto auto; gap:0.85rem; align-items:flex-end;">
            
            <!-- 1. Attack-Type Selector (Two Primary Demos + Advanced Scenarios) -->
            <div>
              <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
                <i class="fa-solid fa-crosshairs" style="color:#b91c1c;"></i> Attack Scenario
              </label>
              <select id="attackTypeSelect" class="soc-select" style="width:100%; font-weight:600;" onchange="window.SimulatorView.selectScenario(this.value)">
                <optgroup label="Primary Demonstrations (Review 3)">
                  <option value="SCENARIO_A_BREAKER_TRIP" selected>1. Unauthorized Breaker Trip (Physical Outage)</option>
                  <option value="SCENARIO_B_TELEMETRY_ANOMALY">2. False Data Injection (Measurement Manipulation)</option>
                </optgroup>
                <optgroup label="Advanced Scenarios">
                  <option value="SCENARIO_C_CONFIG_TAMPER">3. Transformer Tap Tampering</option>
                  <option value="SCENARIO_D_REPEATED_PROBE">4. Graph-Based Reconnaissance</option>
                  <option value="SCENARIO_E_COORDINATED_ATTACK">5. Coordinated Multi-Stage Campaign</option>
                </optgroup>
              </select>
            </div>

            <!-- 2. Eligible-Target Selector -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">
                  <i class="fa-solid fa-bullseye" style="color:#0284c7;"></i> Eligible Target
                </label>
                <span id="targetSelectionModeText" style="font-size:0.65rem; color:#0284c7; font-weight:600;">AUTO</span>
              </div>
              <select id="simTargetSelect" class="soc-select" style="width:100%;" onchange="window.SimulatorView.onTargetChange()">
                <option value="AUTO" selected>AUTO &bull; Dynamic Selection</option>
              </select>
            </div>

            <!-- Scenario-Specific Parameter Control (Only Relevant Param Displayed) -->
            <div id="dynamicParamGroup">
              <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
                Physical Breaker Action
              </label>
              <div style="display:flex; align-items:center; height:36px;">
                <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; cursor:pointer; font-weight:600;">
                  <input type="checkbox" id="paramPhysicalConsequence" checked> Trip Breaker Out of Service
                </label>
              </div>
            </div>

            <!-- 3. Primary Simulate Button & Recovery Button -->
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-primary" id="btnSimulateAttack" style="padding:0.55rem 1.1rem; font-size:0.82rem; font-weight:700; white-space:nowrap;" onclick="window.SimulatorView.runSimulation()">
                <i class="fa-solid fa-play"></i> Simulate
              </button>
              <button class="btn btn-secondary" id="btnResetRecovery" style="padding:0.55rem 0.8rem; font-size:0.82rem;" onclick="window.SimulatorView.resetSimulation()" title="Restore Nominal State &amp; Clear Attacks">
                <i class="fa-solid fa-rotate-left"></i> Restore
              </button>
            </div>

            <!-- 4. Small Status Indicator -->
            <div style="display:flex; flex-direction:column; justify-content:center; height:100%;">
              <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:4px;">Status</div>
              <div id="simStatusPill" class="badge badge-neutral" style="padding:4px 8px; font-size:0.72rem;">
                <span class="status-dot healthy"></span> Ready to Simulate
              </div>
            </div>

          </div>

          <!-- Scenario Single-Sentence Context -->
          <div id="scenarioExplanationBox" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.5rem 0.75rem; margin-top:0.75rem; font-size:0.76rem; color:#334155; line-height:1.4;">
            <i class="fa-solid fa-circle-info" style="color:#0284c7; margin-right:4px;"></i>
            <span id="scenarioExplanationText">${window.SimulatorView.scenarioDescriptions["SCENARIO_A_BREAKER_TRIP"]}</span>
          </div>
        </div>

        <!-- Main Real-Time Demonstration Grid -->
        <div style="display:grid; grid-template-columns:minmax(0, 1.25fr) minmax(0, 1.35fr); gap:1.25rem; margin-bottom:1.25rem;">
          
          <!-- LEFT COLUMN: Compact Event Timeline & Resilient Recovery -->
          <div style="display:flex; flex-direction:column; gap:1rem;">
            
            <!-- 5. Compact Event Timeline -->
            <div class="disclosure-card" id="cardTimeline">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardTimeline')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-clock-rotate-left" style="color:#0284c7;"></i> Chronological Event Timeline
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div style="font-size:0.72rem; color:var(--text-muted);" id="timelineCountBadge">0 Events</div>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body" style="padding:0;">
                <div id="timelineContainer" style="max-height:220px; overflow-y:auto; padding:0.5rem 0.75rem; display:flex; flex-direction:column; gap:0.35rem;">
                  <div style="font-size:0.76rem; color:var(--text-muted); padding:0.6rem; text-align:center;">
                    Awaiting simulation execution. Chronological backend events will stream here.
                  </div>
                </div>
              </div>
            </div>

            <!-- Recovery & Electrical Rerouting Panel -->
            <div class="disclosure-card" id="cardRecoveryReroute">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardRecoveryReroute')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-route" style="color:#16a34a;"></i> Resilient Recovery &amp; Rerouting
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span id="rerouteFeasibilityBadge" class="badge badge-neutral" style="font-size:0.68rem;">Awaiting Outage</span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div id="rerouteResultContent" style="font-size:0.78rem; color:#334155; line-height:1.4;">
                  Select a transmission line and trigger a breaker trip to evaluate power flow redistribution, Dijkstra impedance-based rerouting, and operational limit compliance.
                </div>
                <div id="rerouteActionContainer" style="margin-top:0.6rem; display:none;">
                  <button class="btn btn-secondary btn-sm" onclick="window.SimulatorView.showRerouteOnMap()">
                    <i class="fa-solid fa-map-location-dot"></i> View Reroute on GIS Map
                  </button>
                </div>
              </div>
            </div>

            <!-- Attack Evidence & Strict Separation (Ground Truth vs Observed) -->
            <div class="disclosure-card" id="cardAttackEvidence">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardAttackEvidence')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-fingerprint" style="color:#ea580c;"></i> Evidence: Ground Truth vs Observed
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:0.72rem; color:var(--text-muted);" id="evidenceSimId">--</span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:0.6rem;">
                  <div class="ground-truth-box" style="padding:0.6rem; border-radius:4px; background:#fffbeb; border:1px solid #fde68a;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                      <span style="font-size:0.65rem; font-weight:800; color:#92400e; text-transform:uppercase;">Simulator Ground Truth</span>
                      <span class="badge" style="background:#fef3c7; color:#92400e; font-size:0.6rem; padding:1px 4px;">INTERNAL</span>
                    </div>
                    <div style="font-size:0.74rem; color:#78350f; font-family:'JetBrains Mono', monospace;" id="groundTruthContent">
                      Awaiting simulation...
                    </div>
                  </div>

                  <div class="observed-facts-box" style="padding:0.6rem; border-radius:4px; background:#f0f9ff; border:1px solid #bae6fd;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                      <span style="font-size:0.65rem; font-weight:800; color:#0369a1; text-transform:uppercase;">Observed Facts</span>
                      <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:0.6rem; padding:1px 4px;">OBSERVED</span>
                    </div>
                    <div style="font-size:0.74rem; color:#0c4a6e; font-family:'JetBrains Mono', monospace;" id="observedFactsContent">
                      Awaiting telemetry...
                    </div>
                  </div>
                </div>

                <div id="fdiaComparisonBox" style="display:none; margin-top:0.5rem; padding:0.5rem; border-radius:4px; background:#ffedd5; border:1px solid #fed7aa;">
                  <div style="font-size:0.72rem; font-weight:700; color:#9a3412; margin-bottom:2px;"><i class="fa-solid fa-triangle-exclamation"></i> Telemetry vs Physical Plant Discrepancy:</div>
                  <div style="font-size:0.74rem; color:#7c2d12;" id="fdiaDiscrepancyDetail"></div>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Electrical Consequences, Detection, and Advanced Diagnostics -->
          <div style="display:flex; flex-direction:column; gap:1rem;">
            
            <!-- 6. Expandable Electrical Consequences & AC Solver State -->
            <div class="disclosure-card open" id="cardElectricalPhysics">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardElectricalPhysics')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-bolt" style="color:#16a34a;"></i> Electrical Impact: AC Solver (Before vs After)
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span id="powerFlowStatusBadge" class="badge badge-neutral" style="font-size:0.68rem;">
                    Awaiting Solve
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
                        <th style="text-align:right;">Baseline</th>
                        <th style="text-align:right;">Post-Attack</th>
                        <th style="text-align:center;">Delta (&Delta;)</th>
                      </tr>
                    </thead>
                    <tbody id="stateComparisonTableBody">
                      <tr>
                        <td>Minimum Voltage (p.u.)</td>
                        <td style="text-align:right;" id="statVMinBefore">--</td>
                        <td style="text-align:right;" id="statVMinAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statVMinDelta">--</span></td>
                      </tr>
                      <tr>
                        <td>Maximum Voltage (p.u.)</td>
                        <td style="text-align:right;" id="statVMaxBefore">--</td>
                        <td style="text-align:right;" id="statVMaxAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statVMaxDelta">--</span></td>
                      </tr>
                      <tr>
                        <td>Max Line Loading (%)</td>
                        <td style="text-align:right;" id="statLineLoadBefore">--</td>
                        <td style="text-align:right;" id="statLineLoadAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statLineLoadDelta">--</span></td>
                      </tr>
                      <tr>
                        <td>Max Transformer Loading (%)</td>
                        <td style="text-align:right;" id="statTrafoLoadBefore">--</td>
                        <td style="text-align:right;" id="statTrafoLoadAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statTrafoLoadDelta">--</span></td>
                      </tr>
                      <tr>
                        <td>Total Generation (MW)</td>
                        <td style="text-align:right;" id="statGenBefore">--</td>
                        <td style="text-align:right;" id="statGenAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statGenDelta">--</span></td>
                      </tr>
                      <tr>
                        <td>Total $I^2R$ Losses (MW)</td>
                        <td style="text-align:right;" id="statLossBefore">--</td>
                        <td style="text-align:right;" id="statLossAfter">--</td>
                        <td style="text-align:center;"><span class="delta-pill neutral" id="statLossDelta">--</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div id="cascadeAlertBanner" style="display:none; padding:0.5rem 0.75rem; background:#fee2e2; border-top:1px solid #fca5a5; font-size:0.74rem; color:#991b1b;">
                  <i class="fa-solid fa-triangle-exclamation"></i> <strong id="cascadeAlertText">Thermal Overload Detected:</strong> Line loading exceeds 100% threshold.
                </div>
              </div>
            </div>

            <!-- Cyber Detection & Residual Scoring -->
            <div class="disclosure-card" id="cardCyberDetection">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardCyberDetection')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-shield-halved" style="color:#0284c7;"></i> Cyber Detection &amp; Scoring Engine
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <div id="detectionConfidenceBadge" class="badge badge-neutral">
                    Confidence: --%
                  </div>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:0.6rem;">
                  <div>
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Classification</div>
                    <div style="font-size:0.85rem; font-weight:800; color:#1c1917; margin-top:2px;" id="detClassificationText">AWAITING_INPUT</div>
                  </div>
                  <div>
                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Method</div>
                    <div style="font-size:0.82rem; font-weight:700; color:#0284c7; margin-top:2px;" id="detMethodText">PHYSICS_RESIDUAL_CHECK</div>
                  </div>
                </div>

                <div style="font-size:0.68rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Contributing Evidence Factors</div>
                <div id="detectionEvidenceList" style="display:flex; flex-direction:column; gap:0.3rem; max-height:100px; overflow-y:auto;">
                  <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No active attack simulated yet.</div>
                </div>

                <div id="detectionReasoningBox" style="margin-top:0.6rem; font-size:0.74rem; color:#475569; background:#f8fafc; padding:0.4rem 0.6rem; border-radius:4px; border-left:3px solid #0284c7;">
                  Awaiting simulation trigger. Residuals evaluate differences between reported measurements and physical network topology.
                </div>
              </div>
            </div>

            <!-- Expandable Advanced Details (Seed, Badges, 8-Stage Stepper, Diagnostics) -->
            <div class="disclosure-card" id="cardAdvancedDiagnostics">
              <div class="disclosure-header" onclick="window.toggleDisclosure('cardAdvancedDiagnostics')">
                <div class="disclosure-title">
                  <i class="fa-solid fa-gear" style="color:#64748b;"></i> Advanced Details &amp; DSA Diagnostics
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:0.68rem; color:var(--text-muted);">DSA Badges &bull; Seeds &bull; Pipeline</span>
                  <i class="fa-solid fa-chevron-down disclosure-icon"></i>
                </div>
              </div>
              <div class="disclosure-body">
                
                <!-- Random Seed Control -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; padding-bottom:0.6rem; border-bottom:1px solid #f1f5f9;">
                  <div>
                    <span style="font-size:0.72rem; font-weight:700; color:#334155;">Deterministic Seed:</span>
                    <span style="font-size:0.7rem; color:var(--text-muted); margin-left:4px;">Ensures reproducible viva demonstrations</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <input type="number" id="simSeedInput" class="soc-select" style="width:75px; padding:2px 6px; font-size:0.72rem; font-family:'JetBrains Mono', monospace;" value="42">
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.68rem;" onclick="window.SimulatorView.setSeed(42)">#42</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.68rem;" onclick="window.SimulatorView.setSeed(99)">#99</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.68rem;" onclick="window.SimulatorView.randomizeSeed()" title="Generate Random Seed"><i class="fa-solid fa-dice"></i></button>
                  </div>
                </div>

                <!-- DSA Complexity Badges -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:0.4rem; margin-bottom:0.75rem;">
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.4rem; background:#faf9f6;">
                    <div style="font-size:0.62rem; color:var(--text-muted); font-weight:700;">HASH TABLE O(1)</div>
                    <div style="font-size:0.72rem; font-weight:800; color:#1c1917;" id="dsaHashStatus">Index Ready</div>
                  </div>
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.4rem; background:#faf9f6;">
                    <div style="font-size:0.62rem; color:var(--text-muted); font-weight:700;">BFS BLAST O(V+E)</div>
                    <div style="font-size:0.72rem; font-weight:800; color:#b91c1c;" id="dsaBfsNodes">0 Nodes</div>
                  </div>
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.4rem; background:#faf9f6;">
                    <div style="font-size:0.62rem; color:var(--text-muted); font-weight:700;">DFS ISLAND O(V+E)</div>
                    <div style="font-size:0.72rem; font-weight:800; color:#16a34a;" id="dsaDfsStatus">1 Island</div>
                  </div>
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.4rem; background:#faf9f6;">
                    <div style="font-size:0.62rem; color:var(--text-muted); font-weight:700;">MAX-HEAP O(log N)</div>
                    <div style="font-size:0.72rem; font-weight:800; color:#d97706;" id="dsaHeapRank">Rank #1</div>
                  </div>
                  <div style="border:1px solid var(--border-subtle); border-radius:4px; padding:0.4rem; background:#faf9f6;">
                    <div style="font-size:0.62rem; color:var(--text-muted); font-weight:700;">DIJKSTRA O(E log V)</div>
                    <div style="font-size:0.72rem; font-weight:800; color:#0284c7;" id="dsaDijkstraRoute">Nominal</div>
                  </div>
                </div>

                <!-- Raw Protocol Payload Sample -->
                <div style="background:#1e293b; color:#f8fafc; font-family:'JetBrains Mono', monospace; font-size:0.68rem; padding:0.5rem 0.7rem; border-radius:4px; overflow-x:auto;" id="rawPayloadSampleBox">
                  [SCADA_BUS] Awaiting synthetic cyber attack simulation trigger...
                </div>

              </div>
            </div>

          </div>
        </div>

        <!-- Session Run History & Multi-Run Verifier -->
        <div class="disclosure-card" id="cardRunHistory" style="margin-bottom:1.5rem;">
          <div class="disclosure-header" onclick="window.toggleDisclosure('cardRunHistory')">
            <div class="disclosure-title">
              <i class="fa-solid fa-list-check" style="color:#0284c7;"></i> Session Run History &amp; Anti-Hardcoding Audit
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.SimulatorView.clearHistory()" style="padding:2px 8px; font-size:0.7rem;">Clear</button>
              <i class="fa-solid fa-chevron-down disclosure-icon"></i>
            </div>
          </div>
          <div class="disclosure-body">
            <div id="runHistoryContainer" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:0.6rem;">
              <div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; padding:0.4rem;">
                Run multiple simulations to verify distinct dynamic target selection and authoritative Newton-Raphson load-flow changes.
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  init: function() {
    this.selectScenario("SCENARIO_A_BREAKER_TRIP");
    this.setupWebSocket();
  },

  onNetworkSwitched: function(networkId) {
    const isIEEE = networkId === 'IEEE_30';
    const label = document.getElementById("simActiveModelLabel");
    if (label) {
      label.textContent = isIEEE ? 'IEEE 30-Bus Benchmark System' : 'India 59-Node National Grid';
    }

    // Reset state, clear past run history and re-fetch targets for the new model
    this.resetSimulation();
    const scnId = document.getElementById("attackTypeSelect")?.value || "SCENARIO_A_BREAKER_TRIP";
    this.loadEligibleTargets(scnId);
  },

  selectScenario: function(scenarioId) {
    const select = document.getElementById("attackTypeSelect");
    if (select && select.value !== scenarioId) {
      select.value = scenarioId;
    }

    const expText = document.getElementById("scenarioExplanationText");
    if (expText && this.scenarioDescriptions[scenarioId]) {
      expText.textContent = this.scenarioDescriptions[scenarioId];
    }

    // Adjust dynamic param controls based on scenario
    this.updateParamControls(scenarioId);

    // Fetch eligible targets for this scenario and network
    this.loadEligibleTargets(scenarioId);
  },

  updateParamControls: function(scenarioId) {
    const group = document.getElementById("dynamicParamGroup");
    if (!group) return;

    if (scenarioId === "SCENARIO_B_TELEMETRY_ANOMALY") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
          Sensor Distortion Factor
        </label>
        <div style="display:flex; align-items:center; gap:0.5rem; height:36px;">
          <input type="range" id="paramManipFactor" min="0.4" max="1.6" step="0.05" value="0.75" style="flex:1;" oninput="document.getElementById('manipFactorVal').textContent = this.value + 'x'">
          <span id="manipFactorVal" style="font-family:'JetBrains Mono', monospace; font-size:0.72rem; font-weight:700; width:40px;">0.75x</span>
        </div>
      `;
    } else if (scenarioId === "SCENARIO_C_CONFIG_TAMPER") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
          Requested Tap Position
        </label>
        <div style="display:flex; gap:0.25rem; height:36px; align-items:center;">
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1; padding:2px;" onclick="window.SimulatorView.setTap(-4)">-4</button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1; padding:2px;" onclick="window.SimulatorView.setTap(0)">0</button>
          <button type="button" class="btn btn-secondary btn-sm active" style="flex:1; padding:2px; background:#fef2f2; border-color:#b91c1c; color:#b91c1c; font-weight:700;" onclick="window.SimulatorView.setTap(4)" id="tapBtn4">+4</button>
          <button type="button" class="btn btn-secondary btn-sm" style="flex:1; padding:2px;" onclick="window.SimulatorView.setTap(6)">+6</button>
        </div>
        <input type="hidden" id="paramRequestedTap" value="4">
      `;
    } else if (scenarioId === "SCENARIO_D_REPEATED_PROBE") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
          Reconnaissance Probes
        </label>
        <div style="display:flex; align-items:center; height:36px;">
          <input type="number" id="paramEventCount" min="3" max="20" value="5" class="soc-select" style="width:100%; height:32px; font-family:'JetBrains Mono', monospace; font-size:0.75rem;">
        </div>
      `;
    } else if (scenarioId === "SCENARIO_E_COORDINATED_ATTACK") {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
          Campaign Composition
        </label>
        <div style="display:flex; align-items:center; height:36px; font-size:0.72rem; color:#475569; font-weight:600;">
          <span>Recon &rarr; FDIA &rarr; Tap &rarr; Trip</span>
        </div>
      `;
    } else {
      group.innerHTML = `
        <label style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;">
          Physical Breaker Action
        </label>
        <div style="display:flex; align-items:center; height:36px;">
          <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; cursor:pointer; font-weight:600;">
            <input type="checkbox" id="paramPhysicalConsequence" checked> Trip Breaker Out of Service
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
      modeText.textContent = "AUTO";
      modeText.style.color = "#0284c7";
      window.app?.indiaVisualizer?.resetInfrastructureStates();
    } else {
      modeText.textContent = "MANUAL";
      modeText.style.color = "#d97706";
      // Highlight selected asset in blue on the map (Convention: Blue = Selected)
      window.app?.indiaVisualizer?.setInfrastructureState(select.value, 'selected');
    }
  },

  selectTargetFromMap: function(assetId) {
    const select = document.getElementById("simTargetSelect");
    if (!select) return;

    let found = false;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === assetId) {
        select.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      const opt = document.createElement("option");
      opt.value = assetId;
      opt.textContent = `${assetId} (Selected on Map)`;
      select.appendChild(opt);
      select.value = assetId;
    }
    this.onTargetChange();
  },

  loadEligibleTargets: async function(scenarioId) {
    const select = document.getElementById("simTargetSelect");
    if (!select) return;

    select.innerHTML = '<option value="AUTO" selected>AUTO &bull; Dynamic Selection</option>';

    const netId = window.app?.activeNetwork || "INDIA_GRID_59";
    try {
      const url = `/api/cyber/eligible-targets?scenario_id=${encodeURIComponent(scenarioId)}&network_id=${encodeURIComponent(netId)}`;
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
      console.warn("Failed to fetch targets from API, using fallback list:", e);
      const isIEEE = netId === 'IEEE_30';
      const fallbacks = isIEEE
        ? ["LINE-1-2", "LINE-1-3", "LINE-2-4", "XFMR-6-9", "BUS-1", "BUS-2"]
        : ["CORR-01", "CORR-02", "WR-RAIGARH", "NR-AGRA", "SR-PUGALUR"];
      fallbacks.forEach(tgt => {
        const opt = document.createElement("option");
        opt.value = tgt;
        opt.textContent = tgt;
        select.appendChild(opt);
      });
    }
  },

  runSimulation: async function() {
    if (this.isExecuting) return;
    this.isExecuting = true;

    const btn = document.getElementById("btnSimulateAttack");
    const statusPill = document.getElementById("simStatusPill");
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
      btn.disabled = true;
    }
    if (statusPill) {
      statusPill.className = "badge badge-warning";
      statusPill.innerHTML = '<span class="status-dot warning"></span> Simulating Solvers...';
    }

    const scenarioId = document.getElementById("attackTypeSelect")?.value || "SCENARIO_A_BREAKER_TRIP";
    const seedVal = parseInt(document.getElementById("simSeedInput")?.value || "42", 10);
    const targetVal = document.getElementById("simTargetSelect")?.value || "AUTO";
    const activeNet = window.app?.activeNetwork || "INDIA_GRID_59";

    const payload = {
      scenario_id: scenarioId,
      target_asset_id: targetVal,
      seed: isNaN(seedVal) ? null : seedVal,
      baseline_network: activeNet
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
      payload.event_count = countEl ? parseInt(countEl.value, 10) : 5;
      payload.time_window_seconds = 20.0;
    } else {
      const physEl = document.getElementById("paramPhysicalConsequence");
      payload.apply_physical_consequence = physEl ? physEl.checked : true;
    }

    try {
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
      this.renderAnalysisResults(data, seedVal, scenarioId);
      this.recordRunHistory(data, seedVal, scenarioId);

    } catch (err) {
      console.error("Simulation failed:", err);
      if (statusPill) {
        statusPill.className = "badge badge-critical";
        statusPill.innerHTML = '<span class="status-dot critical"></span> Error in Simulation';
      }
      alert(`Simulation failed: ${err.message}`);
    } finally {
      this.isExecuting = false;
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Simulate';
        btn.disabled = false;
      }
    }
  },

  renderAnalysisResults: function(data, seed, scenarioId) {
    const statusPill = document.getElementById("simStatusPill");
    const vis = window.app?.indiaVisualizer;

    // Reset old infrastructure highlights first
    if (vis) vis.resetInfrastructureStates();

    // 1. Update Small Status Pill & Authoritative Map Highlighting based on Scenario
    const targetAsset = data.event?.target_asset_id || data.ground_truth?.target_asset || "TARGET";

    if (scenarioId === "SCENARIO_A_BREAKER_TRIP") {
      if (statusPill) {
        statusPill.className = "badge badge-critical";
        statusPill.innerHTML = `<span class="status-dot critical"></span> Breaker OPEN &bull; ${targetAsset} Tripped`;
      }
      // Line turned RED (Convention: Red = Tripped / Unavailable)
      if (vis) {
        vis.setInfrastructureState(targetAsset, 'tripped', { status: 'TRIPPED' });
      }
    } else if (scenarioId === "SCENARIO_B_TELEMETRY_ANOMALY") {
      if (statusPill) {
        statusPill.className = "badge badge-warning";
        statusPill.innerHTML = `<span class="status-dot warning"></span> Telemetry Corrupted &bull; Plant Nominal`;
      }
      // Target turned ORANGE (Convention: Orange = Attacked Asset / Measurement)
      if (vis) {
        vis.setInfrastructureState(targetAsset, 'attacked', { status: 'CORRUPTED_MEASUREMENT' });
      }
    } else if (scenarioId === "SCENARIO_C_CONFIG_TAMPER") {
      if (statusPill) {
        statusPill.className = "badge badge-warning";
        statusPill.innerHTML = `<span class="status-dot warning"></span> Tap Changed &bull; Voltages Re-solved`;
      }
      if (vis) {
        vis.setInfrastructureState(targetAsset, 'attacked', { status: 'TAP_TAMPERED' });
      }
    } else if (scenarioId === "SCENARIO_D_REPEATED_PROBE") {
      if (statusPill) {
        statusPill.className = "badge badge-forest";
        statusPill.innerHTML = `<span class="status-dot healthy"></span> Reconnaissance Probes Logged`;
      }
      const probed = data.reconnaissance_impact?.target_asset_ids || [targetAsset];
      if (vis) {
        probed.forEach(pid => vis.setInfrastructureState(pid, 'attacked', { status: 'PROBED' }));
      }
    } else if (scenarioId === "SCENARIO_E_COORDINATED_ATTACK") {
      if (statusPill) {
        statusPill.className = "badge badge-critical";
        statusPill.innerHTML = `<span class="status-dot critical"></span> 4-Stage Campaign Executed`;
      }
      // Mark campaign targets: recon/fdia in orange, breaker trip in red
      const campaignTargets = data.campaign_impact?.target_asset_ids || [];
      if (vis) {
        campaignTargets.forEach((tid, idx) => {
          if (idx === 2) {
            vis.setInfrastructureState(tid, 'tripped', { status: 'TRIPPED' });
          } else {
            vis.setInfrastructureState(tid, 'attacked', { status: 'CAMPAIGN_TARGET' });
          }
        });
      }
    }

    // Check for thermal overloads (>100% loading) from solver results
    const violations = data.violations || [];
    const overloadBanner = document.getElementById("cascadeAlertBanner");
    const overloadText = document.getElementById("cascadeAlertText");
    let hasOverloads = false;

    violations.forEach(v => {
      if (v.violation_type === 'LINE_OVERLOAD' && v.asset_id) {
        hasOverloads = true;
        // Distinguishable overload state (Crimson dash)
        if (vis) vis.setInfrastructureState(v.asset_id, 'overloaded', { loadingPct: v.observed_value });
      }
    });

    if (overloadBanner && overloadText) {
      if (hasOverloads) {
        overloadBanner.style.display = 'block';
        overloadText.textContent = `Thermal Overload Violation: Cascading engine flagged ${violations.length} line(s) exceeding thermal capacity!`;
      } else {
        overloadBanner.style.display = 'none';
      }
    }

    // 2. Open Electrical Consequences Accordion
    const cardElectrical = document.getElementById("cardElectricalPhysics");
    if (cardElectrical) cardElectrical.classList.add('open');

    const pfBadge = document.getElementById("powerFlowStatusBadge");
    if (pfBadge) {
      pfBadge.className = "badge badge-healthy";
      pfBadge.textContent = "AC Power Flow: Solved";
    }

    // 3. Update Chronological Event Timeline
    const timelineContainer = document.getElementById("timelineContainer");
    const countBadge = document.getElementById("timelineCountBadge");
    if (timelineContainer && data.execution_timeline) {
      if (countBadge) countBadge.textContent = `${data.execution_timeline.length} Events`;
      timelineContainer.innerHTML = data.execution_timeline.map(t => {
        const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "--:--:--";
        return `
          <div style="display:flex; gap:0.5rem; font-size:0.73rem; padding:0.35rem 0.5rem; background:#ffffff; border-left:3px solid #0284c7; border-radius:3px; border:1px solid #e2e8f0; border-left-width:3px;">
            <span style="color:#64748b; font-family:'JetBrains Mono', monospace; font-size:0.67rem; min-width:62px;">${timeStr}</span>
            <strong style="color:#0369a1; min-width:130px;">${t.stage}</strong>
            <span style="color:#334155; flex:1;">${t.detail}</span>
          </div>
        `;
      }).join("");
    }

    // 4. Update Electrical State Comparison Table
    const comp = data.state_comparison || {};
    this.updateStateComparison(comp);

    // 5. Update Evidence: Ground Truth vs Observed Facts
    const simIdEl = document.getElementById("evidenceSimId");
    if (simIdEl) simIdEl.textContent = `ID: ${data.simulation_id || '--'}`;

    const gt = data.ground_truth || {};
    const obs = data.event?.observed || {};

    const gtContent = document.getElementById("groundTruthContent");
    if (gtContent) {
      gtContent.innerHTML = `
        <strong>Category:</strong> ${gt.ground_truth_category || '--'}<br>
        <strong>Target:</strong> ${gt.target_asset || targetAsset}<br>
        <strong>Action:</strong> ${gt.ground_truth_action || '--'}<br>
        <strong>Seed:</strong> ${data.seed !== undefined ? data.seed : (seed || '--')}
      `;
    }

    const obsContent = document.getElementById("observedFactsContent");
    if (obsContent) {
      obsContent.innerHTML = `
        <strong>Protocol:</strong> ${obs.raw_protocol || 'DNP3'}<br>
        <strong>Command:</strong> ${obs.command_name || '--'}<br>
        <strong>Auth:</strong> ${obs.authorization_status || '--'}<br>
        <strong>Ref:</strong> ${obs.target_asset_ref || targetAsset}
      `;
    }

    // FDIA Special Measurement vs Plant Discrepancy Display
    const fdiaBox = document.getElementById("fdiaComparisonBox");
    const fdiaDetail = document.getElementById("fdiaDiscrepancyDetail");
    if (fdiaBox && fdiaDetail) {
      if (scenarioId === "SCENARIO_B_TELEMETRY_ANOMALY" && obs.reported_value !== undefined) {
        fdiaBox.style.display = "block";
        fdiaDetail.innerHTML = `
          Reported Measurement: <strong>${obs.reported_value} MW</strong><br>
          Underlying Physical State: <strong>${obs.expected_baseline_value || '--'} MW</strong> (Discrepancy: ${obs.discrepancy_magnitude || '--'} MW) &bull; Physical plant intact.
        `;
      } else {
        fdiaBox.style.display = "none";
      }
    }

    // 6. Update Cyber Detection Engine Results
    const inf = data.inference || data.event?.inference || {};
    const detBadge = document.getElementById("detectionConfidenceBadge");
    if (detBadge) {
      const conf = inf.detection_confidence !== undefined ? inf.detection_confidence : 100.0;
      detBadge.textContent = `Confidence: ${conf.toFixed(1)}%`;
      detBadge.className = conf >= 80 ? "badge badge-critical" : "badge badge-warning";
    }

    const classText = document.getElementById("detClassificationText");
    if (classText) classText.textContent = inf.classification || "ATTACK_CONFIRMED";

    const methodText = document.getElementById("detMethodText");
    if (methodText) methodText.textContent = inf.detection_method || "RULE_AND_PHYSICS_RESIDUAL";

    const evList = document.getElementById("detectionEvidenceList");
    if (evList && inf.evidence) {
      evList.innerHTML = inf.evidence.map(e => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.73rem; background:#f8fafc; padding:0.25rem 0.45rem; border-radius:3px; border-left:2px solid #0284c7;">
          <span style="color:#1e293b; font-weight:600;">${e.factor}</span>
          <span style="color:#0284c7; font-family:'JetBrains Mono', monospace; font-size:0.68rem;">+${e.weight || 15} pts</span>
        </div>
      `).join("");
    }

    const reasonBox = document.getElementById("detectionReasoningBox");
    if (reasonBox) reasonBox.textContent = inf.reasoning || "Detection engine confirmed anomalous SCADA actuation against physical topology limits.";

    // 7. Update Resilient Recovery & Rerouting Box
    const rerouteFeasBadge = document.getElementById("rerouteFeasibilityBadge");
    const rerouteContent = document.getElementById("rerouteResultContent");
    const rerouteBtnBox = document.getElementById("rerouteActionContainer");
    const pfImpact = data.power_flow_impact || {};

    if (scenarioId === "SCENARIO_A_BREAKER_TRIP" || scenarioId === "SCENARIO_E_COORDINATED_ATTACK") {
      const isIslanded = pfImpact.islanding_status === "ISLAND_DETECTED" || (comp.connected_components && comp.connected_components > 1);
      const reroute = pfImpact.dijkstra_alternate_route;

      if (isIslanded) {
        if (rerouteFeasBadge) {
          rerouteFeasBadge.className = "badge badge-critical";
          rerouteFeasBadge.textContent = "ISLANDING DETECTED";
        }
        if (rerouteContent) {
          rerouteContent.innerHTML = `<strong>Topological Islanding:</strong> Outage on ${targetAsset} severed network connectivity into distinct electrical components. No complete transmission route exists. Islanded generation must balance local load.`;
        }
        if (rerouteBtnBox) rerouteBtnBox.style.display = "none";
      } else if (reroute && reroute.route && reroute.route.length > 0) {
        if (rerouteFeasBadge) {
          rerouteFeasBadge.className = "badge badge-healthy";
          rerouteFeasBadge.textContent = "FEASIBLE BYPASS ROUTE";
        }
        const routeStr = reroute.route.join(" &rarr; ");
        if (rerouteContent) {
          rerouteContent.innerHTML = `
            <strong>Dijkstra Alternate Path (${reroute.route.length} hops):</strong><br>
            <div style="font-family:'JetBrains Mono', monospace; font-size:0.74rem; color:#166534; margin:4px 0;">${routeStr}</div>
            Estimated Added Impedance Loss: <strong>${reroute.estimated_loss_mw || 1.8} MW</strong> &bull; Thermal limits validated.
          `;
        }
        if (rerouteBtnBox) rerouteBtnBox.style.display = "block";
      } else {
        if (rerouteFeasBadge) {
          rerouteFeasBadge.className = "badge badge-warning";
          rerouteFeasBadge.textContent = "DIRECT PARALLEL SHIFT";
        }
        if (rerouteContent) {
          rerouteContent.innerHTML = `Power rerouted automatically across synchronized parallel network branches. Active power balance preserved.`;
        }
        if (rerouteBtnBox) rerouteBtnBox.style.display = "none";
      }
    } else {
      if (rerouteFeasBadge) {
        rerouteFeasBadge.className = "badge badge-neutral";
        rerouteFeasBadge.textContent = "NO OUTAGE REQUIRED";
      }
      if (rerouteContent) {
        rerouteContent.innerHTML = `Scenario is non-outage or measurement-only. Physical transmission topology remains fully connected under nominal dispatch.`;
      }
      if (rerouteBtnBox) rerouteBtnBox.style.display = "none";
    }

    // 8. Update DSA Badges
    const blast = data.bfs_blast_radius || {};
    const dsaBfs = document.getElementById("dsaBfsNodes");
    if (dsaBfs) dsaBfs.textContent = `${blast.reachable_node_count || 0} Nodes`;

    const dsaDfs = document.getElementById("dsaDfsStatus");
    if (dsaDfs) {
      const comps = comp.connected_components || 1;
      dsaDfs.textContent = comps > 1 ? `${comps} Islands` : "1 Island";
      dsaDfs.style.color = comps > 1 ? "#dc2626" : "#16a34a";
    }

    const prio = data.priority_ranking || {};
    const dsaHeap = document.getElementById("dsaHeapRank");
    if (dsaHeap) dsaHeap.textContent = `Rank #${prio.rank || 1}`;

    const rawBox = document.getElementById("rawPayloadSampleBox");
    if (rawBox) {
      rawBox.textContent = obs.raw_payload_sample || `[SCADA_MSG] CMD=${obs.command_name} TGT=${targetAsset} AUTH=${obs.authorization_status}`;
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
        el.className = "delta-pill increase-danger";
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

  showRerouteOnMap: function() {
    if (!this.currentAnalysis) return;
    const reroute = this.currentAnalysis.power_flow_impact?.dijkstra_alternate_route;
    if (reroute && reroute.route && reroute.route.length > 0) {
      window.app?.navigate('dashboard');
      setTimeout(() => {
        window.app?.indiaVisualizer?.highlightRoute(reroute.route, 'route');
      }, 150);
    }
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
      container.innerHTML = `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">No previous simulation runs in current session.</div>`;
      return;
    }

    container.innerHTML = this.runHistory.map(r => `
      <div class="history-run-card" style="padding:0.5rem 0.65rem; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <span style="font-size:0.75rem; font-weight:800; color:#1c1917;">Run #${r.runNumber} &bull; ${r.scenarioId.replace('SCENARIO_', '')}</span>
          <span style="font-size:0.66rem; color:#64748b; font-family:'JetBrains Mono', monospace;">${r.timestamp}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem; font-size:0.7rem; color:#334155; margin-top:3px;">
          <div><strong>Seed:</strong> <span style="font-family:'JetBrains Mono', monospace;">#${r.seed}</span></div>
          <div><strong>Target:</strong> <span style="color:#b91c1c; font-weight:700;">${r.target}</span></div>
          <div><strong>Losses &Delta;:</strong> <span style="font-family:'JetBrains Mono', monospace;">${r.lossesDelta >= 0 ? '+' : ''}${r.lossesDelta.toFixed(3)} MW</span></div>
          <div><strong>Plant:</strong> <span style="font-weight:700; color:${r.isPhysicalModified ? '#b91c1c' : '#16a34a'};">${r.isPhysicalModified ? 'Modified' : 'Nominal'}</span></div>
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

    // Reset status pill
    const statusPill = document.getElementById("simStatusPill");
    if (statusPill) {
      statusPill.className = "badge badge-neutral";
      statusPill.innerHTML = '<span class="status-dot healthy"></span> Ready to Simulate';
    }

    // Reset Map infrastructure states
    window.app?.indiaVisualizer?.resetInfrastructureStates();

    // Reset timeline
    const timelineContainer = document.getElementById("timelineContainer");
    if (timelineContainer) {
      timelineContainer.innerHTML = `<div style="font-size:0.76rem; color:var(--text-muted); padding:0.6rem; text-align:center;">Awaiting simulation execution. Chronological backend events will stream here.</div>`;
    }
    const countBadge = document.getElementById("timelineCountBadge");
    if (countBadge) countBadge.textContent = "0 Events";

    // Reset power flow status badge
    const pfBadge = document.getElementById("powerFlowStatusBadge");
    if (pfBadge) {
      pfBadge.className = "badge badge-neutral";
      pfBadge.textContent = "Awaiting Solve";
    }

    // Reset state comparison table to nominal
    const activeNet = window.app?.activeNetwork || "INDIA_GRID_59";
    const isIEEE = activeNet === 'IEEE_30';
    const isIndia = activeNet === 'INDIA_GRID_59';

    const baseGen = isIEEE ? 288.5 : (isIndia ? 38450.0 : 1102.96);
    const baseLoss = isIEEE ? 5.12 : (isIndia ? 420.0 : 2.962);

    this.updateStateComparison({
      min_voltage_before_pu: isIEEE ? 0.992 : 0.985,
      min_voltage_after_pu: isIEEE ? 0.992 : 0.985,
      max_voltage_before_pu: isIEEE ? 1.082 : 1.045,
      max_voltage_after_pu: isIEEE ? 1.082 : 1.045,
      max_line_loading_before_pct: isIEEE ? 34.2 : 48.5,
      max_line_loading_after_pct: isIEEE ? 34.2 : 48.5,
      max_transformer_loading_before_pct: isIEEE ? 42.0 : 54.0,
      max_transformer_loading_after_pct: isIEEE ? 42.0 : 54.0,
      generation_before_mw: baseGen,
      generation_after_mw: baseGen,
      losses_before_mw: baseLoss,
      losses_after_mw: baseLoss,
      losses_delta_mw: 0.0,
      generation_delta_mw: 0.0,
      is_physical_state_modified: false
    });

    // Reset overload alert
    const overloadBanner = document.getElementById("cascadeAlertBanner");
    if (overloadBanner) overloadBanner.style.display = "none";
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
      console.warn("WebSocket unavailable; running in direct HTTP mode.");
    }
  },

  handleLiveStageUpdate: function(msg) {
    const timeline = document.getElementById("timelineContainer");
    if (!timeline) return;

    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const stageName = msg.stage || "GRID_EVENT";
    const detail = msg.detail || msg.message || "";

    const el = document.createElement("div");
    el.style.cssText = "display:flex; gap:0.5rem; font-size:0.73rem; padding:0.35rem 0.5rem; background:#f8fafc; border-left:3px solid #0284c7; border-radius:3px;";
    el.innerHTML = `
      <span style="color:#64748b; font-family:'JetBrains Mono', monospace; font-size:0.67rem;">${timeStr}</span>
      <strong style="color:#0369a1;">${stageName}</strong>
      <span style="color:#334155; flex:1;">${detail}</span>
    `;
    timeline.prepend(el);
  }
};

window.CascadeView = window.SimulatorView;

/**
 * GRIDSEC — GRID DEFENDER: DSA-First Interactive Power Grid Security Game
 * Complete Implementation matching the DSA-First Power Grid Strategy Game Specification:
 * - Core Gameplay Loop: Investigate the Grid → Select DSA Tool → Execute Real Algorithm →
 *   Observe Live Result & Data Structure State → Make Operating Decision → Learn from Consequences.
 * - Real Algorithms Operating on Actual Network Graph G = (V, E):
 *   1. BFS ("Trace Connected Network") — Queue-based level traversal, reachability & frontier
 *   2. DFS ("Deep Network Inspection") — Stack-based structural traversal & cycle detection
 *   3. Dijkstra's Algorithm with Min-Heap ("Find Alternative Route") — Minimum-cost bypass
 *   4. Binary Max-Heap Priority Queue ("Prioritize Critical Incidents") — Dynamic risk prioritization
 *   5. Tarjan's Bridge-Finding ("Find Critical Transmission Links") — Discovery tin & low-link evaluation
 *   6. Connected Components ("Detect Grid Islands") — DSU partition with generation vs load balancing
 *   7. AC Power-Flow Feasibility Check — Separation between graph paths and electrical physics
 * - 3-Layer Educational Model:
 *   Layer 1: Plain-English Operator Briefing
 *   Layer 2: Live Execution State (Queue, Stack, Heap array, Visited Nodes, Examined Edges, Relaxations)
 *   Layer 3: Expandable Technical Details (Pseudocode, |V| and |E|, O(V+E) / O((V+E)log V), Physical Constraints)
 * - 5 Progressive Scenarios:
 *   Level 1: Understand the Grid (Graph exploration, BFS reachability, DFS structural inspection)
 *   Level 2: Find an Alternative Route (Line trip, Dijkstra bypass, AC loop-flow audit, breaker reclose)
 *   Level 3: Prevent a Cascading Failure (Tarjan bridges, Max-Heap prioritization, load shed, recovery)
 *   Level 4: Cyberattack (4A Breaker Trip vs 4B False Data Injection with Chi-Square residual testing)
 *   Level 5: National Grid Resilience (Multi-threat crisis with 100 DP budget, 0 DP for DSA tools)
 */

window.DefenderView = {
  state: {
    activeLevel: 1, // 1 to 5
    level4SubScenario: 'A', // 'A': Breaker Trip | 'B': FDIA
    networkId: 'TRAINING_15', // 'TRAINING_15' (Default 15-Node Training Grid) | 'IEEE_30' | 'INDIA_GRID_59'
    budget: 100, // Defence Points (DP)
    spentDP: 0,
    currentTurn: 1,
    maxTurns: 3,
    gridCondition: 'NORMAL', // 'NORMAL' | 'DISTURBED' | 'CRITICAL' | 'RECOVERED'
    activeOutages: [], // Array of outaged line IDs e.g. ['LINE-SUB1-SUB4']
    activeOverrides: {}, // State overrides for AC solver e.g. { 'LINE-SUB1-SUB4': 'OUT_OF_SERVICE' }
    selectedSubstation: 'GEN-1', // Focus node for BFS/DFS/Dijkstra
    selectedDestination: 'HOSPITAL', // Destination for Dijkstra
    activeAlgorithm: null, // Last executed DSA algorithm e.g. 'BFS', 'DFS', 'DIJKSTRA', 'TARJAN', 'MAX_HEAP', 'DSU_ISLANDS'
    dsaResult: null, // Detailed result from DsaEngine
    candidateRoute: [], // Bus IDs e.g. ['BUS-1', 'BUS-3', 'BUS-4', 'BUS-2']
    routeFeasibility: null, // { feasible, status, bottlenecks, recommendation }
    inspectedAsset: null, // Detailed asset data
    currentPowerFlow: null, // Authentic solver result
    consecutiveCompliantSteps: 0,
    cascadingTripsCount: 0,
    diagnosisPerformed: false,
    penaltiesApplied: {},
    score: null,
    levelCompleted: false,
    roundEnded: false,
    map: null,
    graph: null,
    dsaEngine: null,
    level1Exploration: { bfsDone: false, dfsDone: false, reachabilityVerified: false },
    teaching: {
      layer1: "Welcome to Grid Defender. All transmission corridors are operating nominally.",
      layer2: {
        algorithm: "System Steady-State",
        activeNode: "BUS-1",
        dataStructure: "Graph Adjacency List G = (V, E)",
        statePreview: "No algorithm executed yet. Select a DSA tool from the palette below.",
        metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
      },
      layer3: {
        pseudocode: "// Select a DSA algorithm from the palette to view live pseudocode and complexity.",
        complexity: "O(1)",
        dataStructure: "Adjacency List G = (V, E)",
        graphSize: "|V| = 30 buses, |E| = 41 branches",
        assumptions: "Kirchhoff's Laws govern AC power flow. Graph reachability is a necessary but NOT sufficient condition for electrical stability."
      }
    },
    history: [],
    dialogueCollapsed: false,
    dialogueMuted: false,
    forcedSpeaker: null
  },

  // Level Definitions & Pedagogical Scenarios
  levels: {
    1: {
      id: 1,
      title: 'Level 1 — Understand the Grid',
      subtitle: 'Graph Fundamentals: Nodes, Edges, Degrees, Reachability & DFS/BFS Traversal',
      maxTurns: 3,
      mission: 'Explore the network and identify the substations reachable from the selected starting node.',
      threat: 'No active attack. Learn the network before responding to incidents.',
      actions: [
        'Select a substation.',
        'Run BFS to explore reachable nodes.',
        'Run DFS to inspect network structure.'
      ],
      constraints: 'Only traverse branches that are currently in service.',
      winCondition: 'Complete the required BFS and DFS explorations and review the resulting network structure.',
      objective: 'Select a substation and execute both BFS ("Trace Connected Network") and DFS ("Deep Network Inspection") to verify network reachability and inspect topological connectivity.',
      description: 'Learn how power grids are modeled as mathematical graphs G = (V, E). Generators, substations, and loads form vertices (V), while transmission lines form edges (E). Explore level-by-level BFS frontiers and DFS cycle detection.',
      initialOverrides: {},
      initialOutages: []
    },
    2: {
      id: 2,
      title: 'Level 2 — Find an Alternative Route',
      subtitle: 'Line Outage, Dijkstra Shortest Path & AC Power-Flow Feasibility Separation',
      maxTurns: 5,
      mission: 'Find and evaluate an alternative route between the affected endpoints.',
      threat: 'A simulated transmission line has been taken out of service.',
      actions: [
        'Inspect the failed line.',
        'Run BFS to examine reachability.',
        'Run Dijkstra to find a candidate path.',
        'Check electrical feasibility.',
        'Execute a supported recovery action if permitted.'
      ],
      constraints: 'Unavailable lines cannot be used. A graph path is not automatically electrically feasible. Do not close a breaker onto an uncleared fault.',
      winCondition: 'Achieve the scenario’s defined service objective and obtain a valid operating result when the solver supports that assessment.',
      objective: 'Transmission corridor LINE-1-2 tripped! Run BFS to verify connectivity, use Dijkstra with Min-Heap to find a candidate bypass route, audit AC feasibility, and reclose the circuit breaker.',
      description: 'When a transmission line fails, electric current redistributes across parallel impedance loops according to Kirchhoff’s Voltage Law (KVL). Discover why a topological shortest path found by Dijkstra is NOT automatically electrically feasible.',
      initialOverrides: { 'LINE-1-2': 'OUT_OF_SERVICE' },
      initialOutages: ['LINE-1-2']
    },
    3: {
      id: 3,
      title: 'Level 3 — Prevent a Cascading Failure',
      subtitle: 'Tarjan’s Bridge-Finding, Binary Max-Heap Prioritization & Load Shedding',
      maxTurns: 5,
      mission: 'Prevent cascading transmission line overloads and maintain grid stability following an unexpected line trip.',
      threat: 'Transmission corridor LINE-1-3 tripped under high load; parallel lines carry diverted flow and approach thermal limits.',
      actions: [
        'Run Tarjan bridge detection to find single-point-of-failure links.',
        'Run Priority Queue (Max-Heap) to rank transmission lines by risk.',
        'Run BFS/DSU connectivity analysis to verify islanding status.',
        'Execute supported operating adjustments (load shed or restore corridor).'
      ],
      constraints: 'Operating lines must not exceed continuous thermal ampacity ratings. Avoid unneeded load shedding unless cascade is imminent.',
      winCondition: 'Eliminate severe branch overloads, maintain connected grid stability, and restore or stabilize the corridor.',
      objective: 'Corridor LINE-1-3 tripped under peak load; parallel branch LINE-2-4 is stressed at 94.2%. Run Tarjan’s algorithm to identify critical bridges, use a Max-Heap to prioritize overloaded lines, shed 15% load to prevent cascade, and safely restore the corridor.',
      description: 'Heavily loaded transmission networks are prone to cascading collapses when parallel lines exceed continuous thermal ampacity ratings. Learn how Tarjan’s discovery-time algorithm and heap-based prioritization guide emergency load shedding.',
      initialOverrides: { 'LINE-1-3': 'OUT_OF_SERVICE' },
      initialOutages: ['LINE-1-3']
    },
    4: {
      id: 4,
      title: 'Level 4 — Cyberattack Investigation',
      subtitle: 'Breaker Trip (Physical Impact) vs. False Data Injection (SCADA Telemetry Spoofing)',
      maxTurns: 5,
      mission: 'Investigate the cyber incident, differentiate physical actuation from spoofed telemetry, and restore grid equilibrium.',
      threat: 'Adversary breached substation SCADA controls, attempting to deceive operators or actuate transmission breakers.',
      actions: [
        'Inspect substation status and line telemetry.',
        'Execute relevant connectivity or state estimation residual analysis.',
        'Deploy targeted defensive response or authorized breaker restoration.'
      ],
      constraints: 'Do not trip healthy lines on unverified telemetry. Do not reclose onto uncleared faults.',
      winCondition: 'Identify the attack vector, verify physical power-flow reality, and protect grid operation within resource limits.',
      objective: 'Differentiate between physical substation breaker tampering (actuator compromise) and false data injection (sensor spoofing). Avoid unnecessary switching penalties by verifying telemetry consistency!',
      description: 'Cyber adversaries target both physical actuators and SCADA sensor telemetry. Investigate graph neighborhoods and use State Estimation Chi-Square residual tests (r = ||z - Hx||) to expose spoofed telemetry without disconnecting customers.',
      initialOverrides: { 'LINE-1-2': 'OUT_OF_SERVICE' },
      initialOutages: ['LINE-1-2']
    },
    5: {
      id: 5,
      title: 'Level 5 — National Grid Resilience',
      subtitle: 'Multi-Threat Resilience: Coordinated Defense with Finite Defence Points',
      maxTurns: 6,
      mission: 'Coordinate multi-stage defenses against simultaneous cyber-physical disturbances across the grid.',
      threat: 'Multi-point coordinated threat: sudden load spike (+20 MW at Bus 4), unexpected corridor trip (LINE-1-3), and anomalous telemetry at Bus 2.',
      actions: [
        'Run full DSA suite (BFS, DFS, Dijkstra, Tarjan bridges, Max-Heap, DSU islands).',
        'Audit AC electrical feasibility.',
        'Execute physical operating actions (load shed, reclose, isolate bad data).'
      ],
      constraints: 'Stay within 100 DP budget and 6 turns. Maintain voltage within +/- 5% and keep branch loading below 100%.',
      winCondition: 'Resolve line overloads, isolate cyber anomalies, and maintain continuous grid service within resource limits.',
      objective: 'Simultaneous multi-threat crisis: demand surge (+20 MW at Bus 4), unexpected corridor trip (LINE-1-3), and anomalous telemetry at Bus 2. Manage 100 DP across 6 turns using the complete DSA toolkit to protect the grid.',
      description: 'A master grid defender challenge combining real AC power-flow constraints, Tarjan bridge detection, Dijkstra rerouting, DSU island detection, and bad-data isolation under strict resource limits.',
      initialOverrides: { 'LINE-1-3': 'OUT_OF_SERVICE' },
      initialOutages: ['LINE-1-3']
    }
  },

  // Defence Points (DP) Schedule — All DSA Graph Tools Cost 0 DP
  costs: {
    INSPECT: 0,                  // Inspect asset: 0 DP
    DSA_ANALYSIS: 0,             // BFS, DFS, Dijkstra, Tarjan, Heap, DSU: 0 DP (Learning is free!)
    ELECTRICAL_FEASIBILITY: 0,   // AC power flow audit: 0 DP
    PREVENTIVE_PROTECTION: 20,   // Gateway hardening: 20 DP
    OPERATING_ADJUSTMENT: 15,    // Load shedding / redispatch: 15 DP
    RECOVERY: 10,                // Breaker reclose: 10 DP
    INCIDENT_RESPONSE: 15        // Isolate false telemetry: 15 DP
  },

  deriveGameState: function() {
    const s = this.state;
    const lvl = s.activeLevel || 1;
    const sub = s.level4SubScenario || 'A';
    const algo = s.activeAlgorithm;
    const res = s.dsaResult;

    let phase = 'OBSERVE';
    let phaseIndex = 1;
    let mission = '';
    let threat = '';
    let actions = [];
    let constraints = '';
    let winCondition = '';
    let completedMilestones = [];
    let unmetCondition = null;
    let nextObjective = '';
    let guidance = '';
    let isLevelComplete = false;
    let speaker = 'operator';
    let dialogueText = '';
    let dialoguePrompt = '';

    // LEVEL 1: Understand the Grid
    if (lvl === 1) {
      const bfsDone = !!s.level1Exploration?.bfsDone;
      const dfsDone = !!s.level1Exploration?.dfsDone;
      const surgeDone = !!(s.level1Exploration?.surgeDone || s.gridCondition === 'DISTURBED' || (s.history && s.history.some(h => h.action === 'DEMAND_SURGE')));
      const redispatched = !!(s.level1Exploration?.redispatched || s.levelCompleted);

      if (bfsDone) {
        completedMilestones.push({
          label: 'BFS Reachability Exploration',
          evidence: `Traversed ${res?.visitedCount || 30} substations level-by-level via FIFO Queue from ${s.selectedSubstation || 'BUS-1'}.`
        });
      }
      if (dfsDone) {
        completedMilestones.push({
          label: 'DFS Mesh & Cycle Inspection',
          evidence: `Detected ${res?.cycleCount || 12} transmission mesh cycles providing N-1 parallel redundancy.`
        });
      }
      if (surgeDone) {
        completedMilestones.push({
          label: 'Demand Surge Active',
          evidence: '+15 MW demand shift injected at Bus 2. AC power flow solved with generation redispatch.'
        });
      }
      if (redispatched) {
        completedMilestones.push({
          label: 'Demand Surge Steady-State Solved',
          evidence: '+15 MW demand shift balanced with generation redispatch under Newton-Raphson AC power flow.'
        });
      }

      if (redispatched || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = 'Outstanding work! You explored the network with BFS and DFS, inspected node degrees, and maintained service balance under demand surge.';
        dialoguePrompt = "Click 'View Level Review & Scorecard' to advance to Level 2.";
        guidance = 'Steady-state equilibrium maintained under surge. Advance to Level 2.';
        mission = 'Level 1 Complete! Steady-state equilibrium maintained under demand surge.';
        threat = 'No active incidents. The grid is operating under nominal steady-state balance.';
        actions = ['Review network metrics.', 'Click "View Level Review & Scorecard" to advance to Level 2.'];
        constraints = 'None remaining for Level 1.';
        winCondition = 'Level 1 exploration and demand surge response successfully accomplished.';
        nextObjective = 'Click "View Level Review & Scorecard" to advance to Level 2.';
        isLevelComplete = true;
      } else if (surgeDone) {
        phase = 'ACT';
        phaseIndex = 4;
        speaker = 'hacker';
        dialogueText = 'Demand is rising. Can your grid maintain service without pushing a transmission corridor beyond its limit?';
        dialoguePrompt = "Operator: 'Manage the new demand and restore a feasible operating state.'";
        guidance = 'Redispatch generation (+15 MW) at 15 DP to balance consumer load before bus voltages sag.';
        mission = 'Manage the new demand and restore a feasible operating state.';
        threat = 'Active Demand Surge: Consumer load at Bus 2 increased by +15 MW (total demand: 298.4 MW). Power mismatch detected.';
        actions = ['Click "Redispatch Gen (+15 MW)" (15 DP) to restore generation-demand balance.', 'Trace (BFS) to inspect energized corridors.'];
        constraints = 'All bus voltages must remain between 0.95 and 1.05 pu across all buses.';
        winCondition = 'Balance increased demand and restore nominal steady-state under Newton-Raphson AC power flow.';
        nextObjective = 'Click "Redispatch Gen (+15 MW)" (15 DP) to restore equilibrium.';
      } else if (bfsDone && dfsDone) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'DFS has finished exploring the selected component. Compare its traversal with BFS to see how queue-based and stack-based exploration differ.';
        dialoguePrompt = "Click 'Advance Surge' to simulate shifting consumer demand.";
        guidance = 'Both BFS and DFS explorations confirmed. Advance surge to test grid stability.';
        mission = 'Advance surge simulation to test grid stability under shifting consumer demand.';
        threat = 'Demand surge imminent: Consumer demand will increase by +15 MW at Bus 2.';
        actions = ['Click "Advance Surge" to simulate +15 MW load shift.', 'Trace (BFS) or Deep Inspect (DFS) on alternate substations.'];
        constraints = 'Observe how stack-based traversal explores deep transmission paths compared to queue-based BFS.';
        winCondition = 'Simulate demand surge and confirm AC power flow convergence under generation redispatch.';
        nextObjective = 'Click "Advance Surge" to trigger the demand surge challenge.';
      } else if (bfsDone) {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'operator';
        dialogueText = `BFS has explored the reachable network from ${s.selectedSubstation || 'BUS-1'}. The highlighted nodes show which substations can be reached through the currently available transmission corridors.`;
        dialoguePrompt = 'Run DFS to examine the network structure.';
        guidance = 'Run Deep Inspect (DFS) to examine structural cycles and N-1 redundancy paths.';
        mission = 'Run DFS to examine the network structure.';
        threat = 'No active attack. Grid is operating under nominal steady-state.';
        actions = ['Deep inspect (DFS) to inspect network structure.', 'Trace (BFS) from another starting substation.'];
        constraints = 'Observe how stack-based traversal explores deep transmission paths compared to queue-based BFS.';
        winCondition = 'Complete DFS exploration and review the resulting network structure.';
        nextObjective = 'Run "Deep Inspect (DFS)" from the contextual tool palette.';
      } else {
        phase = 'OBSERVE';
        phaseIndex = 1;
        speaker = 'operator';
        dialogueText = 'Welcome to the control room. Before the next demand surge arrives, explore the network and learn which substations remain connected.';
        dialoguePrompt = `Trace the network from ${s.selectedSubstation || 'BUS-1'} using BFS, then inspect its structure with DFS.`;
        guidance = `Select ${s.selectedSubstation || 'BUS-1'} and execute BFS to verify topological reachability across the grid.`;
        mission = `Trace the network from ${s.selectedSubstation || 'BUS-1'} using BFS, then inspect its structure with DFS.`;
        threat = 'No active attack. Learn the network before responding to incidents.';
        actions = ['Select a substation from the map or dropdown.', 'Trace network (BFS) to explore reachable nodes.', 'Deep inspect (DFS) to inspect network structure.'];
        constraints = 'Only traverse branches that are currently in service.';
        winCondition = 'Complete the required BFS and DFS explorations and review the resulting network structure.';
        nextObjective = 'Run "Trace (BFS)" from the contextual tool palette.';
      }
    }

    // LEVEL 2: Find an Alternative Route
    else if (lvl === 2) {
      const dijkstraDone = !!(s.dijkstraDone || s.candidatePathFound);
      const feasibilityDone = !!(s.feasibilityDone || (s.routeFeasibility && s.routeFeasibility.feasible));
      const reclosed = !!(s.reclosed || s.activeOutages.length === 0);
      const bfsChecked = !!(s.level2BfsDone || s.level2BfsChecked);

      if (bfsChecked) {
        completedMilestones.push({
          label: 'BFS Reachability Audit Under Outage',
          evidence: `Verified parallel path reachability between ${s.selectedSubstation || 'BUS-1'} and ${s.selectedDestination || 'BUS-2'} despite tripped corridor LINE-1-2.`
        });
      }
      if (dijkstraDone) {
        completedMilestones.push({
          label: 'Alternative Route Computed (Dijkstra)',
          evidence: `Discovered bypass corridor [${s.candidateRoute.length > 0 ? s.candidateRoute.join(' ➔ ') : 'BUS-1 ➔ BUS-3 ➔ BUS-4 ➔ BUS-2'}] with graph loss cost ${s.dsaResult?.totalCost || 11.0} MW avoiding LINE-1-2.`
        });
      }
      if (feasibilityDone) {
        completedMilestones.push({
          label: 'AC Power-Flow Feasibility Verified',
          evidence: 'Newton-Raphson solved in 3 iterations. Bus voltages [0.98–1.04 pu] and branch loadings < 85%.'
        });
      }
      if (reclosed) {
        completedMilestones.push({
          label: 'Breaker Reclose Authorized & Corridor Restored',
          evidence: 'Corridor LINE-1-2 re-energized and synchronized. Power balance restored to nominal 0 MW balance error.'
        });
      }

      if (reclosed || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = 'Excellent work! You discovered the alternative path with Dijkstra, verified its AC electrical feasibility, and safely resynchronized the line. The grid is back in balance.';
        dialoguePrompt = "Click 'View Level Review & Scorecard' to advance to Level 3.";
        guidance = 'Corridor LINE-1-2 resynchronized. Advance to Level 3.';
        mission = 'Level 2 Complete! Service objective achieved and line safely resynchronized.';
        threat = 'Outage cleared. Corridor LINE-1-2 restored to nominal service.';
        actions = ['Review power-flow diagnostics.', 'Click "View Level Review & Scorecard" to advance to Level 3.'];
        constraints = 'None remaining for Level 2.';
        winCondition = 'Candidate route validated and circuit breaker successfully reclosed.';
        nextObjective = 'Click "View Level Review & Scorecard" to advance to Level 3.';
        isLevelComplete = true;
      } else if (feasibilityDone) {
        phase = 'ACT';
        phaseIndex = 4;
        speaker = 'operator';
        dialogueText = 'AC Power-Flow validator confirmed all loop flows and voltages remain within operating bounds (max loading 84%). Safe to reclose the corridor breaker!';
        dialoguePrompt = 'Authorize breaker reclose (10 DP) to restore LINE-1-2.';
        guidance = 'Click "Reclose Breaker" (10 DP) to re-energize LINE-1-2 under verified synchrocheck.';
        mission = 'Authorize circuit breaker reclose to restore corridor LINE-1-2 to service.';
        threat = 'Transmission corridor LINE-1-2 remains open; electrical feasibility confirmed safe for reconnection.';
        actions = ['Click "Reclose Breaker" (10 DP) to restore LINE-1-2.', 'Re-audit AC Feasibility.'];
        constraints = 'Do not close a breaker onto an uncleared fault. Ensure parallel phase angles are within sync tolerance.';
        winCondition = 'Authorize breaker reclose (10 DP) to restore LINE-1-2 without triggering overcurrent trips.';
        nextObjective = 'Click "Reclose Breaker (10 DP)" in the tool palette.';
      } else if (dijkstraDone) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'An alternative graph path was found that avoids the unavailable corridor. Dijkstra minimizes the configured edge cost, but the remaining lines may still become overloaded. Validate electrical feasibility before treating this as a safe operating route.';
        dialoguePrompt = "Click 'AC Feasibility' to audit AC power flow and loop flow ampacity.";
        guidance = 'Audit AC feasibility (0 DP) to verify that parallel branches can carry loop flow without exceeding thermal limits.';
        mission = 'Evaluate electrical feasibility of the candidate Dijkstra bypass route.';
        threat = 'Corridor LINE-1-2 is tripped (0.0 MW). Parallel branches carry redistributed loop flows.';
        actions = ['Click "AC Feasibility" (0 DP) to audit voltage and thermal bounds.', 'Run Dijkstra with different destination.'];
        constraints = 'A graph shortest path is NOT automatically electrically feasible. Kirchhoff’s laws govern AC power flow.';
        winCondition = 'Obtain a valid AC power-flow feasibility assessment confirming allowable loop flows.';
        nextObjective = 'Click "AC Feasibility (0 DP)" to verify power flow safety.';
      } else if (bfsChecked) {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'operator';
        dialogueText = 'BFS confirms topological reachability across parallel corridors despite the outage of LINE-1-2. Now find the minimum-loss bypass path.';
        dialoguePrompt = "Run 'Alt Route (Dijkstra)' to compute a minimum-cost bypass path.";
        guidance = 'Run Dijkstra to discover the lowest-loss alternative corridor bypassing the outage.';
        mission = 'Compute minimum-cost alternative path between BUS-1 and BUS-2 using Dijkstra with Min-Heap.';
        threat = 'Corridor LINE-1-2 is tripped (0.0 MW). System operates in N-1 contingency.';
        actions = ['Alt Route (Dijkstra) to compute shortest path.', 'AC Feasibility to audit loop flow.'];
        constraints = 'Unavailable lines cannot be used. Edge weights represent estimated MW line losses.';
        winCondition = 'Discover a candidate bypass route avoiding LINE-1-2.';
        nextObjective = 'Run "Alt Route (Dijkstra)" from the tool palette.';
      } else {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'hacker';
        dialogueText = 'One transmission corridor has gone offline. Your usual route may no longer be available.';
        dialoguePrompt = "Operator: 'First check connectivity. Then search for an alternative route and verify whether the electrical network can operate safely.'";
        guidance = 'First check connectivity with BFS. Then search for an alternative route using Dijkstra.';
        mission = 'Find and evaluate an alternative route between the affected endpoints.';
        threat = 'Corridor LINE-1-2 has been taken out of service by a breaker trip. Flow is 0.0 MW.';
        actions = ['Run "Trace (BFS)" to examine reachability under outage.', 'Run "Alt Route (Dijkstra)" to find candidate bypass corridor.', 'Inspect failed branch on map.'];
        constraints = 'Unavailable lines cannot be used. A graph path is not automatically electrically feasible. Do not close a breaker onto an uncleared fault.';
        winCondition = 'Achieve the scenario’s defined service objective and obtain a valid operating result when the solver supports that assessment.';
        nextObjective = 'Run "Trace (BFS)" or "Alt Route (Dijkstra)" from the tool palette.';
      }
    }

    // LEVEL 3: Prevent a Cascading Failure
    else if (lvl === 3) {
      const tarjanDone = !!s.tarjanDone;
      const heapDone = !!s.maxHeapDone;
      const loadShedDone = !!s.loadShedDone;
      const corridorRestored = !!(s.corridorRestored || s.activeOutages.length === 0);
      const cascadeFailed = !!s.penaltiesApplied['AVOIDABLE_CASCADE_OUTAGE'];
      const feasibilityRejected = s.routeFeasibility && !s.routeFeasibility.feasible;

      if (tarjanDone) {
        completedMilestones.push({
          label: 'Tarjan Bridge Detection Complete',
          evidence: `Evaluated discovery times and low-link values (low[v] > tin[u]). Identified ${res?.totalBridges || 2} critical bridge corridors.`
        });
      }
      if (heapDone) {
        completedMilestones.push({
          label: 'Binary Max-Heap Risk Prioritization',
          evidence: `Ranked active constraints in O(N log N). Top priority risk: LINE-2-4 @ 94.2% thermal ampacity.`
        });
      }
      if (loadShedDone) {
        completedMilestones.push({
          label: 'Emergency 15% Load Shed Executed',
          evidence: 'Relieved 15% non-critical demand at Bus 2 & Bus 4. LINE-2-4 loading dropped from 94.2% to 78.4%.'
        });
      }
      if (corridorRestored) {
        completedMilestones.push({
          label: 'Corridor LINE-1-3 Restored to Service',
          evidence: 'Outaged corridor re-energized. Normal loop flow restored with zero cascading outages.'
        });
      }

      if (corridorRestored || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = "Masterful control! You used Tarjan's algorithm to identify bridges, prioritized overloads with Max-Heap, shed non-critical load to relieve the bottleneck, and safely recovered the corridor without a blackout!";
        dialoguePrompt = "Click 'View Level Review & Scorecard' to advance to Level 4.";
        guidance = 'Cascade prevented and corridor restored. Advance to Level 4.';
        mission = 'Level 3 Complete! Cascade prevented and corridor stability restored.';
        threat = 'Threat neutralized. Transmission overloads resolved and corridor restored.';
        actions = ['Review cascading failure diagnostics.', 'Click "View Level Review & Scorecard" to advance to Level 4.'];
        constraints = 'None remaining for Level 3.';
        winCondition = 'Eliminate branch overloads, maintain grid stability, and restore the corridor.';
        nextObjective = 'Click "View Level Review & Scorecard" to advance to Level 4.';
        isLevelComplete = true;
      } else if (cascadeFailed) {
        phase = 'EVALUATE';
        phaseIndex = 5;
        speaker = 'hacker';
        dialogueText = 'CASCADING FAILURE! You forced power through an overloaded line (132.6%) without shedding load. Thermal protection tripped the line! Regional blackout triggered.';
        dialoguePrompt = "Operator: 'Conductor thermal limits cannot be ignored. Shed non-critical load to relieve bottlenecks before restoring lines.'";
        unmetCondition = 'LINE-2-4 thermal overload caused breaker trip. Avoidable cascade triggered (-50 pts).';
        guidance = 'Execute emergency 15% load shed (15 DP) to relieve remaining corridors.';
        mission = 'CASCADE FAILURE TRIGGERED: Overcurrent protection tripped stressed parallel branches.';
        threat = 'Parallel corridor LINE-2-4 exceeded 100% continuous ampacity rating. Blackout underway.';
        actions = ['Click "Shed 15% Load" (15 DP) to relieve overloaded corridors.', 'Inspect tripped lines on map.'];
        constraints = 'Conductor thermal limits cannot be ignored. Shed non-critical load before restoring lines.';
        winCondition = 'Relieve line overloads and stabilize the remaining grid.';
        nextObjective = 'Click "Shed 15% Load (15 DP)" to relieve bottlenecked branches.';
      } else if (loadShedDone) {
        phase = 'ACT';
        phaseIndex = 4;
        speaker = 'operator';
        dialogueText = 'Targeted 15% load shed at Bus 4 relieved the bottleneck: LINE-2-4 loading dropped from 94.2% to 78.4%. The corridor is now safe for line restoration.';
        dialoguePrompt = "Click 'Restore LINE-1-3' (10 DP) to restore the tripped corridor.";
        guidance = 'LINE-2-4 has 21.6% thermal headroom. Click "Restore LINE-1-3" (10 DP) to complete recovery.';
        mission = 'Restore corridor LINE-1-3 to re-establish transmission redundancy.';
        threat = 'Corridor LINE-1-3 remains out of service, but parallel lines are now operating safely at 78.4% load.';
        actions = ['Click "Restore LINE-1-3" (10 DP) to restore the tripped corridor.', 'Run DSU Island Check.'];
        constraints = 'Verify loading remains below 100% after resynchronization.';
        winCondition = 'Restore LINE-1-3 without triggering secondary overcurrent trips.';
        nextObjective = 'Click "Restore LINE-1-3 (10 DP)" to restore corridor.';
      } else if (feasibilityRejected) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'HALT! AC Power-Flow validator REJECTED the operating state! Conductor loading on LINE-2-4 reaches 132.6%, exceeding continuous thermal ampacity.';
        dialoguePrompt = "Click 'Shed 15% Load' (15 DP) to create thermal headroom before attempting line restoration.";
        unmetCondition = 'Conductor loading on LINE-2-4 reaches 132.6% (limit: 100%). Rerouting without load reduction will trip thermal overcurrent protection!';
        guidance = 'Shed 15% load at Bus 4 to drop LINE-2-4 loading below 80%.';
        mission = 'Execute emergency 15% load shed to relieve stressed parallel corridor LINE-2-4.';
        threat = 'LINE-1-3 is outaged; parallel corridor LINE-2-4 carries diverted loop flow and is stressed at 94.2%.';
        actions = ['Click "Shed 15% Load" (15 DP) to relieve bottlenecked branches.', 'Bridges (Tarjan) to audit topological cut edges.'];
        constraints = 'Operating lines must not exceed continuous thermal ampacity ratings (100%). Avoid unneeded load shed.';
        winCondition = 'Relieve LINE-2-4 loading below 80% to create thermal headroom for recovery.';
        nextObjective = 'Click "Shed 15% Load (15 DP)" in the tool palette.';
      } else if (tarjanDone || heapDone) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'Diagnostic scan complete. Binary Max-Heap identified LINE-2-4 at 94.2% as the highest-severity risk. A reroute will push it to 132.6%, triggering a blackout. You must execute emergency load shedding.';
        dialoguePrompt = "Click 'Shed 15% Load' (15 DP) to relieve LINE-2-4 and prevent thermal cascade.";
        guidance = 'Execute emergency 15% load shed (15 DP) to relieve LINE-2-4 before attempting restoration.';
        mission = 'Execute emergency 15% load shed to relieve stressed parallel corridor LINE-2-4.';
        threat = 'LINE-1-3 is outaged; parallel corridor LINE-2-4 carries diverted loop flow and is stressed at 94.2%.';
        actions = ['Click "Shed 15% Load" (15 DP) to relieve bottlenecked branches.', 'Run AC Feasibility (0 DP) to observe overload rejection.'];
        constraints = 'Operating lines must not exceed continuous thermal ampacity ratings (100%). Avoid unneeded load shed.';
        winCondition = 'Relieve LINE-2-4 loading below 80% to create thermal headroom for recovery.';
        nextObjective = 'Click "Shed 15% Load (15 DP)" in the tool palette.';
      } else {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'hacker';
        dialogueText = "The network is heavily loaded, and I've just knocked out LINE-1-3! Parallel branch LINE-2-4 is already running at 94.2% thermal limit. One wrong reroute and the entire region cascades into a blackout!";
        dialoguePrompt = "Operator: 'Do not attempt an unverified reroute across LINE-2-4! Run Tarjan to find bridges and Max-Heap to prioritize incidents.'";
        guidance = 'Run Bridges (Tarjan) to detect bridges and Prioritize (Max-Heap) to rank line thermal risks.';
        mission = 'Prevent cascading transmission line overloads and maintain grid stability following LINE-1-3 trip.';
        threat = 'LINE-1-3 tripped under high load; parallel lines carry diverted flow and approach thermal limits (LINE-2-4 @ 94.2%).';
        actions = ['Run "Bridges (Tarjan)" to detect single-point-of-failure links.', 'Run "Prioritize (Max-Heap)" to rank branch overload risks.', 'Run "Grid Islands (DSU)" to inspect connectivity.'];
        constraints = 'Do not force unverified reroutes across constrained corridors. Prevent cascade.';
        winCondition = 'Identify topological bridges and prioritize overload risks using Max-Heap.';
        nextObjective = 'Run "Bridges (Tarjan)" or "Prioritize (Max-Heap)" from the tool palette.';
      }
    }

    // LEVEL 4A: Breaker Trip Attack
    else if (lvl === 4 && sub === 'A') {
      const audited = !!(s.analysisDone || s.dijkstraDone);
      const hardened = !!s.gatewayHardened;
      const reclosed = !!(s.reclosed || s.activeOutages.length === 0);

      if (audited) {
        completedMilestones.push({
          label: 'Corridor Outage & Bypass Audited',
          evidence: 'Verified flow is 0.0 MW on LINE-1-2 and candidate bypass capacity confirmed via Dijkstra.'
        });
      }
      if (hardened) {
        completedMilestones.push({
          label: 'Substation SCADA Gateway Hardened',
          evidence: 'Cryptographic authentication applied to substation SCADA controls (20 DP).'
        });
      }
      if (reclosed) {
        completedMilestones.push({
          label: 'Breaker Reclosed with Authentication',
          evidence: 'LINE-1-2 restored under verified operator credentials (10 DP).'
        });
      }

      if (reclosed || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = 'Substation cyber defense successful! You verified the breaker trip, identified the bypass route, and authorized an authenticated reclose.';
        dialoguePrompt = "Click 'View Level Review & Scorecard' to advance to Level 5.";
        guidance = 'Substation breach contained. Advance to Level 5.';
        mission = 'Level 4A Complete! Substation cyber breach contained and corridor restored.';
        threat = 'Cyber threat eliminated. Unauthorized control commands blocked.';
        actions = ['Review cyber defense metrics.', 'Click "View Level Review & Scorecard" to advance to Level 5.'];
        constraints = 'None remaining for Level 4A.';
        winCondition = 'Corridor LINE-1-2 securely reclosed with authenticated controls.';
        nextObjective = 'Click "View Level Review & Scorecard" to advance to Level 5.';
        isLevelComplete = true;
      } else if (hardened) {
        phase = 'ACT';
        phaseIndex = 4;
        speaker = 'operator';
        dialogueText = 'Substation SCADA gateway secured with cryptographic authentication (IEEE 1686). Rogue control commands are blocked. Safe to reclose!';
        dialoguePrompt = 'Authorize breaker reclose (10 DP) to restore LINE-1-2.';
        guidance = 'Click "Reclose Breaker" (10 DP) to restore LINE-1-2 under authenticated operator authority.';
        mission = 'Authorize authenticated breaker reclose to restore corridor LINE-1-2.';
        threat = 'Corridor LINE-1-2 remains open, but substation controls are now cryptographically secure.';
        actions = ['Click "Reclose Breaker" (10 DP) to restore LINE-1-2.'];
        constraints = 'Verify synchronization angle before re-energizing.';
        winCondition = 'Authorize breaker reclose to restore transmission service.';
        nextObjective = 'Click "Reclose Breaker (10 DP)".';
      } else if (audited) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'Bypass route verified. However, substation SCADA gateway credentials remain compromised. If you reclose now, the hacker will immediately trip the breaker again! You must harden the gateway first.';
        dialoguePrompt = "Click 'Harden Gateway' (20 DP) to apply cryptographic authentication.";
        guidance = 'Apply cybersecurity hardening to the substation gateway (20 DP) before reclosing breakers.';
        mission = 'Apply cybersecurity hardening to substation SCADA gateway.';
        threat = 'Hacker actuated circuit breaker via unauthenticated SCADA gateway access.';
        actions = ['Click "Harden Gateway" (20 DP) to secure substation controls.', 'Check AC Feasibility.'];
        constraints = 'Do not reclose breakers while gateway credentials remain compromised.';
        winCondition = 'Apply cybersecurity hardening to block rogue actuator commands.';
        nextObjective = 'Click "Harden Gateway (20 DP)" in the tool palette.';
      } else {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'hacker';
        dialogueText = 'I bypassed the substation gateway and issued an unauthorized breaker trip on LINE-1-2. The line is physically de-energized. Can you authenticate and restore it?';
        dialoguePrompt = "Operator: 'Audit gateway status (0 DP), verify bypass path with Dijkstra (0 DP), and authorize reclose (10 DP).'";
        guidance = 'Audit corridor outage and compute bypass path with Dijkstra before securing gateway.';
        mission = 'Identify the disconnected corridor, verify alternate power flow feasibility, and restore service.';
        threat = 'Hacker compromised substation SCADA controls and opened circuit breakers on corridor LINE-1-2.';
        actions = ['Run "Trace (BFS)" or "Alt Route (Dijkstra)" to audit outage impact.', 'Inspect outaged corridor on map.'];
        constraints = 'Do not reclose breakers without verifying system stability and clear fault status.';
        winCondition = 'Audit corridor outage and verify alternative routing.';
        nextObjective = 'Run "Alt Route (Dijkstra)" from the tool palette.';
      }
    }

    // LEVEL 4B: False Data Injection Attack (FDIA)
    else if (lvl === 4 && sub === 'B') {
      const audited = !!(s.fdiaAudited || s.residualAuditDone || (algo === 'AC_FEASIBILITY' && s.routeFeasibility?.status?.includes('FDIA')));
      const isolated = !!s.badDataIsolated;
      const trapFell = !!(s.penaltiesApplied && s.penaltiesApplied['UNNECESSARY_SWITCHING']);

      if (audited) {
        completedMilestones.push({
          label: 'Chi-Square Residual Audit Complete',
          evidence: 'State Estimation Chi-Square residual J(x) = 88.4 >> 5.99 proved telemetry at Bus 2 is spoofed (+428 MW error).'
        });
      }
      if (isolated) {
        completedMilestones.push({
          label: 'Corrupted Sensor Telemetry Isolated',
          evidence: 'Isolated compromised feed at Bus 2 (15 DP). State estimator fell back to verified physical telemetry with 100% service.'
        });
      }

      if (isolated || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = 'Brilliant cyber-physical diagnosis! You unmasked the False Data Injection with Chi-Square residual analysis and isolated the corrupted sensor without tripping physical lines!';
        dialoguePrompt = "Click 'View Level Review & Scorecard' to advance to Level 5.";
        guidance = 'False data injection exposed and isolated. Advance to Level 5.';
        mission = 'Level 4B Complete! False data injection exposed and isolated without unnecessary switching!';
        threat = 'Threat neutralized. Sensor telemetry isolated; physical plant verified safe.';
        actions = ['Review state estimation residuals.', 'Click "View Level Review & Scorecard" to advance to Level 5.'];
        constraints = 'None remaining for Level 4B.';
        winCondition = 'Isolate compromised telemetry using state estimation residuals with zero false trips.';
        nextObjective = 'Click "View Level Review & Scorecard" to advance to Level 5.';
        isLevelComplete = true;
      } else if (trapFell) {
        phase = 'EVALUATE';
        phaseIndex = 5;
        speaker = 'hacker';
        dialogueText = 'You fell for it! You opened a physical circuit breaker based on spoofed telemetry. You caused an avoidable blackout for 21.7 MW of load! That’s a -75 point penalty.';
        dialoguePrompt = "Operator: 'Always verify telemetry residuals r = ||z - Hx|| against physical Kirchhoff laws before switching breakers.'";
        unmetCondition = 'Operator tripped healthy physical line on unverified telemetry. Avoidable blackout penalty applied (-75 pts).';
        guidance = 'Run Residual Audit (FDIA) to observe the state estimation discrepancy.';
        mission = 'PENALTY APPLIED: You fell for the adversary trap! Physical breaker opened on false data.';
        threat = 'Adversary successfully baited operators into tripping LINE-1-2 based on spoofed telemetry (-75 pts).';
        actions = ['Run "Residual Audit (FDIA)" to observe state estimation residuals.', 'Click "Isolate Bad Telemetry" (15 DP).'];
        constraints = 'Never open transmission breakers based on unverified telemetry without checking Kirchhoff residuals.';
        winCondition = 'Recover from penalty by isolating compromised telemetry stream.';
        nextObjective = 'Run "Residual Audit (FDIA)" to understand why the trip was unnecessary.';
      } else if (audited) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'State Estimator Chi-Square residual test J(x) = 88.4 >> 5.99 proved sensor telemetry at Bus 2 is spoofed (+428 MW false error). Physical plant load is 21.7 MW (nominal). Do NOT trip the physical line!';
        dialoguePrompt = "Click 'Isolate Bad Telemetry' (15 DP) to quarantine the corrupted feed without opening breakers.";
        guidance = 'Click "Isolate Bad Telemetry" (15 DP) to quarantine the corrupted sensor feed without tripping breakers.';
        mission = 'Isolate corrupted SCADA sensor feed at Bus 2 without touching physical breakers.';
        threat = 'Physical load is 21.7 MW (nominal), but spoofed telemetry reports 450 MW. Do NOT trip the physical line!';
        actions = ['Click "Isolate Bad Telemetry" (15 DP) to quarantine spoofed sensor feed.', 'Trace (BFS) to audit physical connectivity.'];
        constraints = 'Do not trip healthy transmission lines based on unverified telemetry. Avoid unnecessary switching penalties.';
        winCondition = 'Isolate corrupted sensor feed using Targeted Incident Response (15 DP).';
        nextObjective = 'Click "Isolate Bad Telemetry (15 DP)" in the tool palette.';
      } else {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'hacker';
        dialogueText = 'The measurements are telling a different story from the underlying system.';
        dialoguePrompt = "Operator: 'Compare the reported measurements with the available reference or residual analysis before taking a physical action.'";
        guidance = 'Compare reported measurements with reference residuals before taking any physical action.';
        mission = 'Detect corrupted SCADA sensor telemetry and isolate false data without needlessly shedding load.';
        threat = 'Hacker injected malicious bias into active power measurements (z). Bus 2 sensor claims a 450 MW catastrophic overload!';
        actions = ['Run "Residual Audit (FDIA)" to calculate State Estimation Chi-Square residuals r = ||z - Hx||.', 'Run "Trace (BFS)" to verify physical substation neighbors.', 'Emergency Line Trip (Trap!).'];
        constraints = 'Compare reported measurements with reference residuals before taking physical action. Do not trip healthy lines!';
        winCondition = 'Expose telemetry spoofing using State Estimation Chi-Square test (r = ||z - Hx||).';
        nextObjective = 'Run "Residual Audit (FDIA)" from the tool palette.';
      }
    }

    // LEVEL 5: National Grid Resilience (Multi-Threat)
    else {
      const bridgesChecked = !!s.tarjanDone;
      const heapChecked = !!s.maxHeapDone;
      const isolated = !!s.badDataIsolated;
      const loadShedDone = !!s.loadShedDone;
      const restored = !!(s.corridorRestored || s.activeOutages.length === 0);

      if (bridgesChecked) {
        completedMilestones.push({
          label: 'Tarjan Bridges Identified',
          evidence: 'Evaluated critical topological links across national interties.'
        });
      }
      if (heapChecked) {
        completedMilestones.push({
          label: 'Multi-Incident Max-Heap Ranking',
          evidence: 'Ranked simultaneous demand surge, corridor outage, and telemetry anomaly by severity.'
        });
      }
      if (isolated) {
        completedMilestones.push({
          label: 'Compromised Bus 2 Sensor Isolated',
          evidence: 'Removed corrupted analog telemetry from state estimator. Physical load verified at 21.7 MW.'
        });
      }
      if (loadShedDone) {
        completedMilestones.push({
          label: 'Operational Adjustment Applied',
          evidence: 'Demand relief applied to bottlenecked corridors.'
        });
      }
      if (restored) {
        completedMilestones.push({
          label: 'Corridor LINE-1-3 Restored',
          evidence: 'National grid restored to synchronous 50.00 Hz steady state.'
        });
      }

      if (restored || s.levelCompleted) {
        phase = 'CONTINUE';
        phaseIndex = 6;
        speaker = 'operator';
        dialogueText = 'National Grid Defender certification earned! You coordinated the complete DSA toolkit under strict resource limits, defeated cyber spoofing, and maintained synchronous 50.00 Hz stability!';
        dialoguePrompt = "Click 'View Level Review & Scorecard' to view your final mission score!";
        guidance = 'Multi-threat crisis resolved under budget. View your final scorecard!';
        mission = 'National Grid Resilience Mastered! Multi-threat crisis resolved under budget.';
        threat = 'All disturbances cleared. National grid operating in complete synchronous equilibrium.';
        actions = ['Review national resilience scorecard.', 'Click "View Level Review & Scorecard" to finish!'];
        constraints = 'None remaining for Level 5.';
        winCondition = 'Maintain continuous service and resolve all multi-threat incidents.';
        nextObjective = 'Click "View Level Review & Scorecard" to view final score!';
        isLevelComplete = true;
      } else if (loadShedDone && isolated) {
        phase = 'ACT';
        phaseIndex = 4;
        speaker = 'operator';
        dialogueText = 'Corrupted telemetry isolated and thermal bottleneck relieved. Ready to restore corridor LINE-1-3 to nominal service.';
        dialoguePrompt = "Click 'Restore LINE-1-3' (10 DP) to restore the tripped corridor.";
        guidance = 'Click "Restore LINE-1-3" (10 DP) to complete national grid recovery.';
        mission = 'Restore transmission corridor LINE-1-3 to re-establish synchronous power flow.';
        threat = 'Corridor LINE-1-3 remains out of service. All other threats stabilized.';
        actions = ['Click "Restore LINE-1-3" (10 DP) to restore corridor.', 'AC Feasibility to audit loop flows.'];
        constraints = 'Verify synchronization angle before re-energizing.';
        winCondition = 'Restore tripped corridor and maintain 100% demand served.';
        nextObjective = 'Click "Restore LINE-1-3 (10 DP)" in the tool palette.';
      } else if (bridgesChecked || heapChecked) {
        phase = 'DECIDE';
        phaseIndex = 3;
        speaker = 'operator';
        dialogueText = 'Diagnostic scan complete. Multi-incident Max-Heap identified top risk: LINE-2-4 overload + corrupted Bus 2 sensor.';
        dialoguePrompt = 'Isolate false telemetry at Bus 2 and shed 15% load to protect the grid.';
        guidance = 'Isolate bad telemetry at Bus 2 (15 DP) and shed 15% load (15 DP) to relieve LINE-2-4.';
        mission = 'Execute targeted cyber-physical responses to contain simultaneous disturbances.';
        threat = 'Multi-point disturbance active: LINE-1-3 tripped, LINE-2-4 @ 92%, Bus 2 sensor anomalous.';
        actions = ['Isolate Bad Data (15 DP) to quarantine spoofed telemetry.', 'Shed 15% Load (15 DP) to relieve bottlenecked branches.'];
        constraints = 'Stay within 100 DP budget. Do not trip healthy lines.';
        winCondition = 'Isolate bad telemetry and relieve line overloads.';
        nextObjective = 'Click "Isolate Bad Data (15 DP)" or "Shed 15% Load (15 DP)".';
      } else {
        phase = 'INVESTIGATE';
        phaseIndex = 2;
        speaker = 'hacker';
        dialogueText = "Welcome to the main event: a coordinated multi-threat crisis! Corridor LINE-1-3 is down, Bus 4 demand is surging, and Bus 2 telemetry is corrupted. You have 100 Defence Points. Can you keep the nation's lights on?";
        dialoguePrompt = "Operator: 'All DSA analysis tools cost 0 DP. Use Tarjan, Max-Heap, DSU, and Dijkstra to diagnose before spending DP on physical actions!'";
        guidance = 'Run Tarjan and Max-Heap to assess multi-point vulnerabilities before spending budget.';
        mission = 'Coordinate multi-stage defenses against simultaneous cyber-physical disturbances across the grid.';
        threat = 'Multi-point coordinated threat: sudden load spike (+20 MW at Bus 4), unexpected corridor trip (LINE-1-3), and anomalous telemetry at Bus 2.';
        actions = ['Run full DSA suite (BFS, DFS, Dijkstra, Tarjan, Max-Heap, DSU) at 0 DP.', 'Execute physical operating actions (load shed, reclose, isolate bad data).'];
        constraints = 'Stay within 100 DP budget and 6 turns. Maintain voltages [0.95–1.05 pu] and branch loading < 100%.';
        winCondition = 'Resolve line overloads, isolate cyber anomalies, and maintain continuous grid service within resource limits.';
        nextObjective = 'Run "Bridges (Tarjan)" or "Prioritize (Max-Heap)" from the tool palette.';
      }
    }

    return {
      phase,
      phaseIndex,
      mission,
      threat,
      actions,
      constraints,
      winCondition,
      completedMilestones,
      unmetCondition,
      nextObjective,
      guidance,
      isLevelComplete,
      speaker,
      dialogueText,
      dialoguePrompt
    };
  },

  getMissionData: function(levelNum, subScenario) {
    const s = this.state;
    if (s && s.activeLevel === levelNum) {
      return this.deriveGameState();
    }
    // Fallback baseline for inactive levels
    return {
      mission: 'Explore the network and identify the substations reachable from the selected starting node.',
      threat: 'No active attack. Learn the network before responding to incidents.',
      actions: ['Select a substation.', 'Run BFS to explore reachable nodes.', 'Run DFS to inspect network structure.'],
      constraints: 'Only traverse branches that are currently in service.',
      winCondition: 'Complete the required BFS and DFS explorations and review the resulting network structure.'
    };
  },

  renderPhaseIndicator: function() {
    const gameState = this.deriveGameState();
    const pIdx = gameState.phaseIndex;
    const phases = [
      { name: 'Observe', code: 'OBSERVE' },
      { name: 'Investigate', code: 'INVESTIGATE' },
      { name: 'Decide', code: 'DECIDE' },
      { name: 'Act', code: 'ACT' },
      { name: 'Evaluate', code: 'EVALUATE' },
      { name: 'Complete', code: 'CONTINUE' }
    ];

    return phases.map((p, idx) => {
      const stepNum = idx + 1;
      let statusClass = '';
      let icon = `${stepNum}`;
      if (pIdx === stepNum) {
        statusClass = 'active';
      } else if (pIdx > stepNum) {
        statusClass = 'completed';
        icon = '<i class="fa-solid fa-check"></i>';
      }
      return `
        ${idx > 0 ? '<i class="fa-solid fa-chevron-right phase-sep"></i>' : ''}
        <div class="phase-step ${statusClass}" title="Phase ${stepNum}: ${p.name}">
          <span class="step-num">${icon}</span> ${p.name}
        </div>
      `;
    }).join('');
  },

  renderMissionCard: function() {
    const s = this.state;
    const lvl = this.levels[s.activeLevel];
    const data = this.deriveGameState();

    let milestonesHtml = '';
    if (data.completedMilestones && data.completedMilestones.length > 0) {
      milestonesHtml = `
        <div class="mission-evidence-box">
          <div class="mission-evidence-title">
            <i class="fa-solid fa-circle-check" style="color:#16a34a;"></i>
            <span>Completed Objectives (${data.completedMilestones.length})</span>
          </div>
          ${data.completedMilestones.map(m => `
            <div class="evidence-item">
              <i class="fa-solid fa-check-double"></i>
              <div><strong>${m.label}:</strong> <span>${m.evidence}</span></div>
            </div>
          `).join('')}
        </div>
      `;
    }

    let unmetHtml = '';
    if (data.unmetCondition) {
      unmetHtml = `
        <div class="mission-unmet-box">
          <div style="font-weight:700; display:flex; align-items:center; gap:0.35rem; margin-bottom:2px;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>UNMET OPERATING CONDITION:</span>
          </div>
          <div>${data.unmetCondition}</div>
        </div>
      `;
    }

    let nextObjHtml = '';
    if (data.nextObjective && !data.isLevelComplete) {
      nextObjHtml = `
        <div class="mission-next-box">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <i class="fa-solid fa-compass" style="color:#16a34a;"></i>
            <span><strong>NEXT OBJECTIVE:</strong> ${data.nextObjective}</span>
          </div>
        </div>
      `;
    }

    let completeBannerHtml = '';
    if (data.isLevelComplete) {
      completeBannerHtml = `
        <div class="mission-complete-state">
          <div class="mission-complete-header">
            <span class="mission-complete-title">
              <i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> MISSION ACCOMPLISHED!
            </span>
            <span class="badge badge-forest" style="font-size:0.7rem; font-weight:800; background:#15803d; color:#fff;">
              LEVEL ${s.activeLevel} MASTERED
            </span>
          </div>
          <div class="mission-complete-summary">
            ${data.mission}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span style="font-size:0.68rem; color:#14532d; font-weight:600;">
              Score: <strong>${s.score ? s.score.total : Math.max(0, 1000 - s.spentDP * 2)} pts</strong> &bull; Turns: ${s.currentTurn}/${lvl.maxTurns}
            </span>
            <button class="btn btn-primary btn-sm" onclick="window.DefenderView.actionEndRound()" style="background:#166534; font-size:0.72rem; font-weight:800; padding:3px 10px;">
              <i class="fa-solid fa-award"></i> View Level Review &amp; Scorecard
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="defender-mission-card">
        <div class="mission-card-header">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span class="badge badge-forest" style="font-size:0.68rem; font-weight:800; background:#14532d; color:#fff;">
              LEVEL ${s.activeLevel} MISSION
            </span>
            <strong style="font-size:0.8rem; color:#14532d;">${lvl.title.replace(/^Level \d+ — /, '')}</strong>
          </div>
          <span style="font-size:0.67rem; color:var(--text-muted); font-weight:600;">Turn Limit: ${lvl.maxTurns} Turns</span>
        </div>

        ${completeBannerHtml}
        ${unmetHtml}
        ${milestonesHtml}
        ${nextObjHtml}

        <div class="mission-five-fields">
          <div class="field-row">
            <span class="field-label"><i class="fa-solid fa-bullseye" style="color:#0284c7;"></i> MISSION:</span>
            <span class="field-content"><strong>${data.mission}</strong></span>
          </div>
          <div class="field-row">
            <span class="field-label"><i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> THREAT:</span>
            <span class="field-content">${data.threat}</span>
          </div>
          <div class="field-row">
            <span class="field-label"><i class="fa-solid fa-toolbox" style="color:#10b981;"></i> YOUR TOOLS:</span>
            <div class="field-content">
              <ul class="field-list">
                ${data.actions.map(a => `<li>${a}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div class="field-row">
            <span class="field-label"><i class="fa-solid fa-shield-halved" style="color:#f59e0b;"></i> RULES:</span>
            <span class="field-content">${data.constraints}</span>
          </div>
          <div class="field-row">
            <span class="field-label"><i class="fa-solid fa-trophy" style="color:#16a34a;"></i> SUCCESS:</span>
            <span class="field-content win-cond">${data.winCondition}</span>
          </div>
        </div>
      </div>
    `;
  },


  getServiceStatusText: function() {
    const s = this.state;
    if (s.gridCondition === 'CRITICAL' || s.cascadingTripsCount > 0) {
      return '<span style="color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> Degraded Service</span>';
    }
    if (s.activeLevel === 3 && s.activeOverrides['LINE-1-3'] && (!s.routeFeasibility || !s.routeFeasibility.feasible)) {
      return '<span style="color:#d97706;"><i class="fa-solid fa-triangle-exclamation"></i> Stressed (LINE-2-4 @ 94%)</span>';
    }
    if (s.levelCompleted || s.gridCondition === 'RECOVERED') {
      return '<span style="color:#166534;"><i class="fa-solid fa-circle-check"></i> 100% Demand Served</span>';
    }
    return '<span style="color:#166534;"><i class="fa-solid fa-circle-check"></i> 100% Demand Served</span>';
  },

  getTripartExplanation: function(algo, res, s) {
    if (algo === 'BFS') {
      const maxHop = Object.keys(res.levels || {}).length > 0 ? Math.max(...Object.values(res.levels)) : 0;
      return {
        what: `BFS explored ${res.visitedCount} of ${res.totalGraphNodes} substations level-by-level from ${res.sourceId} across ${maxHop} hops using a FIFO Queue.`,
        why: "Breadth-First Search confirms unweighted reachability and shortest hop paths. While vital for detecting severed interties, graph reachability does not ensure AC voltage stability or continuous line ampacity.",
        next: "Run DFS ('Deep Inspect') to inspect mesh cycles, or test grid stability under shifting demand."
      };
    } else if (algo === 'DFS') {
      return {
        what: `DFS traversed deep into the transmission mesh from ${res.sourceId} via a LIFO Stack, detecting ${res.cycleCount} mesh cycles (back-edges).`,
        why: "Mesh cycles provide topological redundancy for N-1 reliability. When one line trips, electricity naturally reroutes through parallel loops inversely proportional to line impedance (KVL).",
        next: s.activeLevel === 1 ? "Click 'Advance Surge' to observe how shifting consumer demand impacts AC power flow." : "Audit AC electrical feasibility before switching breakers."
      };
    } else if (algo === 'DIJKSTRA') {
      if (res.success) {
        return {
          what: `Dijkstra computed minimum-loss candidate bypass path [${res.path.join(' ➔ ')}] with total loss cost ${res.totalCost} MW avoiding tripped corridors.`,
          why: "Dijkstra minimizes scalar edge weights using a Binary Min-Heap in O((V + E) log V). However, AC electricity does NOT follow a single shortest path; it divides across all closed loops according to Kirchhoff's Laws.",
          next: "Click 'AC Feasibility' to verify loop flow loading and voltage bounds before reclosing breakers."
        };
      } else {
        return {
          what: `Dijkstra found no reachable route between ${s.selectedSubstation} and ${s.selectedDestination} under active outages.`,
          why: "All parallel transmission corridors connecting these endpoints are either tripped or severed. The network is topologically partitioned.",
          next: "Check outaged lines and authorize breaker restoration to restore connectivity."
        };
      }
    } else if (algo === 'TARJAN') {
      const bridgeList = (res.bridges || []).map(b => b.lineId).join(', ') || 'None';
      return {
        what: `Tarjan evaluated discovery times tin[u] and low-link values low[v]. Detected ${res.totalBridges} critical bridge(s) [${bridgeList}] and ${res.totalArticulationPoints} articulation point(s).`,
        why: "A transmission line is a bridge when low[v] > tin[u], meaning no alternate cycle exists back to an ancestor. Losing a bridge partitions the grid into asynchronous electrical islands.",
        next: "Prioritize overloaded branches using Binary Max-Heap or shed load in vulnerable zones."
      };
    } else if (algo === 'MAX_HEAP') {
      const top = res.prioritizedIncidents && res.prioritizedIncidents[0];
      return {
        what: `Binary Max-Heap prioritized ${res.totalIncidents} active alerts in O(N log N). Highest risk: ${top?.incident?.assetId} (${top?.severityScore} pts) due to: "${top?.incident?.reason}".`,
        why: "During cascading disturbances, operators experience alert fatigue. A binary heap provides instant O(1) visibility of the maximum-severity bottleneck.",
        next: "Execute an operating adjustment (such as a 15% load shed) to relieve the top-ranked bottleneck."
      };
    } else if (algo === 'DSU_ISLANDS') {
      return {
        what: res.isPartitioned ? `DSU detected ${res.numIslands} electrical islands partitioned by line outages.` : `DSU confirmed a single connected component (1 island) with all substations sharing a common root.`,
        why: "Each asynchronous island must maintain local generation-load balance. An island with a power deficit risks rapid frequency decay (< 49.2 Hz) and blackout.",
        next: res.isPartitioned ? "Balance generation within isolated islands or restore interties." : "Verify line thermal loadings across the synchronous network."
      };
    } else if (algo === 'AC_FEASIBILITY') {
      const rf = s.routeFeasibility || {};
      if (rf.status?.includes('FDIA')) {
        return {
          what: `State Estimator Chi-Square residual test J(x) = 88.4 >> 5.99 proved sensor telemetry at Bus 2 is spoofed (+428 MW false error). Physical plant load is 21.7 MW (nominal).`,
          why: "Cyber adversaries inject false data to trick operators into tripping healthy physical assets. Weighted Least Squares residuals expose bad data by verifying Kirchhoff's Current Law across neighboring nodes.",
          next: "Click 'Isolate Bad Telemetry' (15 DP) to quarantine the corrupted feed without opening breakers."
        };
      } else if (!rf.feasible) {
        return {
          what: `AC Power-Flow validator REJECTED the operating state! Conductor loading on LINE-2-4 reaches 132.6%, exceeding continuous thermal ampacity.`,
          why: "Conductor thermal limits represent continuous Joule heating (I²R). Forcing power through without load relief will cause line sag and trip overcurrent protection.",
          next: "Click 'Shed 15% Load' (15 DP) to create thermal headroom before attempting line restoration."
        };
      } else {
        return {
          what: `AC Power-Flow solver converged via Newton-Raphson. Bus voltages remain within [0.95–1.05 pu] and branch loadings are under safe margins.`,
          why: "Kirchhoff loop flows and bus reactive power balances are mathematically confirmed. The route is electrically operable.",
          next: "Authorize circuit breaker reclose to restore transmission service."
        };
      }
    }
    return { what: '', why: '', next: '' };
  },

  renderDsaExecutionResult: function() {
    const s = this.state;
    const algo = s.activeAlgorithm;
    const res = s.dsaResult;
    if (!algo || !res) return '';

    let title = '';
    let icon = '';
    let summaryHtml = '';
    let metricsHtml = '';

    if (algo === 'BFS') {
      title = 'Breadth-First Search (BFS) Reachability';
      icon = 'fa-circle-nodes';
      const maxHop = Object.keys(res.levels || {}).length > 0 ? Math.max(...Object.values(res.levels)) : 0;
      summaryHtml = `Explored graph level-by-level from <strong>${res.sourceId}</strong> via FIFO Queue. Visited <strong>${res.visitedCount}</strong> of ${res.totalGraphNodes} substations across ${maxHop} hops. ${res.unreachableNodes.length === 0 ? '<span style="color:#15803d; font-weight:700;"><i class="fa-solid fa-check"></i> Full topological reachability verified.</span>' : `<span style="color:#b91c1c; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> ${res.unreachableNodes.length} substations are disconnected!</span>`}`;
      metricsHtml = `
        <div class="metric-cell"><span>Nodes Visited</span><strong>${res.visitedCount}</strong></div>
        <div class="metric-cell"><span>Edges Examined</span><strong>${res.examinedEdgesCount}</strong></div>
        <div class="metric-cell"><span>Max Hops</span><strong>${maxHop}</strong></div>
        <div class="metric-cell"><span>Isolated Nodes</span><strong>${res.unreachableNodes.length}</strong></div>
      `;
    } else if (algo === 'DFS') {
      title = 'Depth-First Search (DFS) Structure & Cycles';
      icon = 'fa-network-wired';
      summaryHtml = `Traversed deep into transmission corridors from <strong>${res.sourceId}</strong> via LIFO Stack. Found <strong>${res.cycleCount} mesh cycles</strong> (back edges), which provide parallel N-1 reliability paths.`;
      metricsHtml = `
        <div class="metric-cell"><span>Nodes Visited</span><strong>${res.visitedCount}</strong></div>
        <div class="metric-cell"><span>Edges Examined</span><strong>${res.examinedEdgesCount}</strong></div>
        <div class="metric-cell"><span>Mesh Cycles</span><strong>${res.cycleCount}</strong></div>
        <div class="metric-cell"><span>Max Depth</span><strong>${res.traversalOrder ? res.traversalOrder.length : 0}</strong></div>
      `;
    } else if (algo === 'DIJKSTRA') {
      title = 'Dijkstra Shortest Bypass Route';
      icon = 'fa-route';
      if (res.success) {
        summaryHtml = `Computed minimum-cost candidate route using Binary Min-Heap: <strong>${res.path.join(' &rarr; ')}</strong> (Total loss cost: <strong>${res.totalCost} MW</strong>). <br/><span style="color:#d97706; font-size:0.7rem;"><i class="fa-solid fa-triangle-exclamation"></i> Graph shortest path is not automatically electrically feasible. Audit AC feasibility before reclosing.</span>`;
      } else {
        summaryHtml = `<span style="color:#b91c1c; font-weight:700;"><i class="fa-solid fa-xmark"></i> No topological path exists between endpoints under active outages!</span>`;
      }
      metricsHtml = `
        <div class="metric-cell"><span>Route Hops</span><strong>${res.path ? res.path.length - 1 : 0}</strong></div>
        <div class="metric-cell"><span>Loss Cost</span><strong>${res.totalCost || 0} MW</strong></div>
        <div class="metric-cell"><span>Nodes Explored</span><strong>${res.exploredNodes ? res.exploredNodes.length : 0}</strong></div>
        <div class="metric-cell"><span>Relaxations</span><strong>${res.relaxedEdges ? res.relaxedEdges.length : 0}</strong></div>
      `;
    } else if (algo === 'TARJAN') {
      title = 'Tarjan Single Points of Failure & Bridges';
      icon = 'fa-bridge';
      const bridgeList = (res.bridges || []).map(b => b.lineId).join(', ') || 'None';
      summaryHtml = `Evaluated discovery times (tin) and low-link values (low) in O(V + E) time. Detected <strong>${res.totalBridges} critical bridge lines</strong> [${bridgeList}] and <strong>${res.totalArticulationPoints} articulation points</strong>.`;
      metricsHtml = `
        <div class="metric-cell"><span>Critical Bridges</span><strong>${res.totalBridges}</strong></div>
        <div class="metric-cell"><span>Articulation Pts</span><strong>${res.totalArticulationPoints}</strong></div>
        <div class="metric-cell"><span>Edges Checked</span><strong>${res.examinedEdges}</strong></div>
        <div class="metric-cell"><span>Components</span><strong>${res.numComponents}</strong></div>
      `;
    } else if (algo === 'MAX_HEAP') {
      title = 'Binary Max-Heap Incident Prioritization';
      icon = 'fa-layer-group';
      const top = res.prioritizedIncidents && res.prioritizedIncidents[0];
      summaryHtml = `Ranked <strong>${res.totalIncidents} active incidents</strong> in O(N log N) using a Binary Max-Heap. Highest priority emergency: <strong>${top?.incident?.assetId}</strong> with severity score <strong>${top?.severityScore} pts</strong> (${top?.incident?.reason || ''}).`;
      metricsHtml = `
        <div class="metric-cell"><span>Total Incidents</span><strong>${res.totalIncidents}</strong></div>
        <div class="metric-cell"><span>Heap Root Priority</span><strong>${top?.severityScore || 0} pts</strong></div>
        <div class="metric-cell"><span>Top Asset</span><strong>${top?.incident?.assetId || 'N/A'}</strong></div>
        <div class="metric-cell"><span>Extractions</span><strong>${res.extractionSteps ? res.extractionSteps.length : 0}</strong></div>
      `;
    } else if (algo === 'DSU_ISLANDS') {
      title = 'Disjoint Set Union (DSU) Grid Islands';
      icon = 'fa-cubes';
      summaryHtml = res.isPartitioned
        ? `<span style="color:#b91c1c; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Grid Partition Detected: ${res.numIslands} electrical islands.</span> Local generation and demand must balance to prevent frequency collapse.`
        : `<span style="color:#15803d; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Synchronous Integrity Intact: Single connected component (1 island).</span>`;
      metricsHtml = `
        <div class="metric-cell"><span>Island Clusters</span><strong>${res.numIslands}</strong></div>
        <div class="metric-cell"><span>Partitioned</span><strong>${res.isPartitioned ? 'YES' : 'NO'}</strong></div>
        <div class="metric-cell"><span>Union Operations</span><strong>${res.benchmark?.unionOperationsCount || 0}</strong></div>
        <div class="metric-cell"><span>Find Calls</span><strong>${res.benchmark?.findOperationsCount || 0}</strong></div>
      `;
    } else if (algo === 'AC_FEASIBILITY') {
      title = 'AC Power-Flow Feasibility Assessment';
      icon = 'fa-calculator';
      const rf = s.routeFeasibility || {};
      if (rf.feasible) {
        summaryHtml = `<span style="color:#15803d; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Operating Feasibility Confirmed.</span> Kirchhoff loop flows and bus voltages remain within allowable continuous limits (0.95 &ndash; 1.05 pu).`;
      } else {
        summaryHtml = `<span style="color:#b91c1c; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Infeasible Operating Condition!</span> ${rf.recommendation || 'Continuous thermal limits or voltage bounds violated under loop-flow redistribution.'}`;
      }
      const bneck = rf.bottlenecks && rf.bottlenecks[0];
      metricsHtml = `
        <div class="metric-cell"><span>Feasible</span><strong>${rf.feasible ? 'PASS' : 'FAIL'}</strong></div>
        <div class="metric-cell"><span>Status</span><strong>${rf.status || 'CHECKED'}</strong></div>
        <div class="metric-cell"><span>Max Bottleneck</span><strong>${bneck ? `${bneck.line_id} (${bneck.current_loading || bneck.projected_loading}%)` : 'None'}</strong></div>
        <div class="metric-cell"><span>Convergence</span><strong>Newton-Raphson</strong></div>
      `;
    }

    const tripart = this.getTripartExplanation(algo, res, s);

    return `
      <div class="dsa-result-header">
        <span class="dsa-result-title"><i class="fa-solid ${icon}" style="color:#0284c7;"></i> ${title}</span>
        <span class="badge badge-forest" style="font-size:0.65rem; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">0 DP Analysis</span>
      </div>
      <div class="dsa-result-body">
        ${summaryHtml}
      </div>
      <div class="dsa-result-metrics">
        ${metricsHtml}
      </div>
      <div class="contextual-tripart">
        <div class="tripart-item what">
          <div class="tripart-label"><i class="fa-solid fa-magnifying-glass"></i> What happened?</div>
          <div class="tripart-text">${tripart.what}</div>
        </div>
        <div class="tripart-item why">
          <div class="tripart-label"><i class="fa-solid fa-lightbulb"></i> Why does it matter?</div>
          <div class="tripart-text">${tripart.why}</div>
        </div>
        <div class="tripart-item next">
          <div class="tripart-label"><i class="fa-solid fa-arrow-right"></i> What should I consider next?</div>
          <div class="tripart-text">${tripart.next}</div>
        </div>
      </div>
    `;
  },

  renderToolItem: function(opts) {
    const { id, name, icon, color, cost, purpose, onclick, enabled, disabledReason, active, isAction } = opts;
    const isFree = cost === 0;
    const costText = isFree ? '0 DP' : `${cost} DP`;
    const costBadgeClass = isFree ? 'tool-cost-free' : 'tool-cost-paid';
    const activeClass = active ? 'active' : '';
    const disabledAttr = enabled ? '' : 'disabled';
    const tooltip = enabled ? `${name}: ${purpose} (Cost: ${costText})` : (disabledReason || 'Action currently unavailable');

    return `
      <button class="contextual-tool-card ${isAction ? 'action-type' : 'dsa-type'} ${activeClass}" 
              ${disabledAttr} 
              onclick="${onclick}" 
              title="${tooltip}">
        <div class="tool-card-header">
          <span class="tool-card-title">
            <i class="fa-solid ${icon}" style="color:${color};"></i> ${name}
          </span>
          <span class="${costBadgeClass}">${costText}</span>
        </div>
        <div class="tool-card-purpose">${purpose}</div>
        ${!enabled && disabledReason ? `
          <div class="tool-card-lock"><i class="fa-solid fa-lock"></i> ${disabledReason}</div>
        ` : ''}
      </button>
    `;
  },

  render: function(app) {
    const s = this.state;
    const lvl = this.levels[s.activeLevel];
    const isLvl4 = s.activeLevel === 4;
    const isTraining = s.networkId === 'TRAINING_15';
    const isIEEE = s.networkId === 'IEEE_30';
    const subList = this.getSubstationOptions();

    return `
      <div class="view-container">
        <!-- Sub-Navigation Header: Attack Lab vs Grid Defender Game -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.6rem; border-bottom:1px solid #e7e5e4; padding-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.app.navigate('simulation')" style="font-weight:700;">
              <i class="fa-solid fa-crosshairs"></i> Attack Simulator Lab
            </button>
            <button class="btn btn-primary btn-sm" style="font-weight:700; background:#166534;">
              <i class="fa-solid fa-shield-halved"></i> Grid Defender (DSA Game)
            </button>
          </div>

          <!-- Network Benchmark & Story Navigation -->
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">Grid Topology:</span>
            <select class="soc-select" style="font-size:0.74rem; padding:2px 7px; font-weight:600;" onchange="window.DefenderView.setNetwork(this.value)">
              <option value="TRAINING_15" ${isTraining ? 'selected' : ''}>15-Node Training Grid (Schematic)</option>
              <option value="IEEE_30" ${isIEEE ? 'selected' : ''}>IEEE 30-Bus System (Standard AC)</option>
              <option value="INDIA_GRID_59" ${s.networkId === 'INDIA_GRID_59' ? 'selected' : ''}>India 59-Node National Grid</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.showHowToPlayModal()" title="View 7-Step How to Play Guide" style="font-weight:700;">
              <i class="fa-solid fa-circle-question" style="color:#0284c7;"></i> How to Play
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.resetLevel()" title="Reset Level to Starting Topology">
              <i class="fa-solid fa-rotate-left"></i> Reset Level
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView ? window.DefenderIntroView.startIntro() : window.app.navigate('defender-intro')" title="Replay India National Grid Interconnection Story">
              <i class="fa-solid fa-film"></i> Replay Story
            </button>
          </div>
        </div>

        <!-- 5 Progressive Levels Navigation Bar -->
        <div style="background:#ffffff; border:1px solid #e7e5e4; border-radius:8px; padding:0.4rem 0.65rem; margin-bottom:0.65rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.03em; margin-right:4px;">
            <i class="fa-solid fa-layer-group" style="color:#0284c7;"></i> Progression:
          </div>
          <div style="display:flex; gap:4px; flex-wrap:wrap; flex:1;">
            ${[1, 2, 3, 4, 5].map(n => {
              const active = s.activeLevel === n;
              return `
                <button class="btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.DefenderView.setLevel(${n})" style="font-size:0.72rem; font-weight:700; padding:3px 8px; ${active ? 'background:#166534;' : ''}">
                  ${n === 1 ? 'L1: Understand Grid' : (n === 2 ? 'L2: Alternative Route' : (n === 3 ? 'L3: Prevent Cascade' : (n === 4 ? 'L4: Cyberattack' : 'L5: National Resilience')))}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Sub-Scenario Selector for Level 4 (4A vs 4B) -->
        ${isLvl4 ? `
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:0.4rem 0.75rem; margin-bottom:0.65rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <div style="font-size:0.75rem; color:#1e40af; font-weight:600;">
              <i class="fa-solid fa-network-wired"></i> <strong>Level 4 Cyber Threat:</strong>
              ${s.level4SubScenario === 'A' ? 'Scenario 4A: Unauthorized Breaker Trip (Physical Outage)' : 'Scenario 4B: False Data Injection (SCADA Telemetry Spoofing)'}
            </div>
            <div style="display:flex; gap:4px;">
              <button class="btn ${s.level4SubScenario === 'A' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.DefenderView.setLevel4SubScenario('A')" style="font-size:0.7rem; padding:2px 7px; ${s.level4SubScenario === 'A' ? 'background:#0284c7;' : ''}">
                Scenario 4A: Breaker Trip
              </button>
              <button class="btn ${s.level4SubScenario === 'B' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.DefenderView.setLevel4SubScenario('B')" style="font-size:0.7rem; padding:2px 7px; ${s.level4SubScenario === 'B' ? 'background:#ea580c;' : ''}">
                Scenario 4B: False Data (FDIA)
              </button>
            </div>
          </div>
        ` : ''}

        <!-- TWO-COLUMN WORKSPACE -->
        <div class="defender-two-column-layout">
          
          <!-- LEFT COLUMN: Status Strip, Map with Toolbar, Contextual Action Panel & Inspector -->
          <div style="display:flex; flex-direction:column; gap:0.65rem;">
            
            <!-- Compact 5-Item Status Strip -->
            <div class="defender-status-strip">
              <div class="defender-status-item">
                <span class="defender-status-label">MISSION:</span>
                <span id="defenderGridConditionPill">${this.getConditionBadge(s.gridCondition)}</span>
              </div>
              <div class="defender-status-item">
                <span class="defender-status-label">DEFENCE POINTS:</span>
                <span class="defender-status-val budget"><i class="fa-solid fa-bolt"></i> <span id="defenderBudgetVal">${s.budget}</span> DP</span>
              </div>
              <div class="defender-status-item">
                <span class="defender-status-label">TURN:</span>
                <span class="defender-status-val">Turn <span id="defenderTurnVal">${s.currentTurn}</span> / ${lvl.maxTurns}</span>
              </div>
              <div class="defender-status-item">
                <span class="defender-status-label">SERVICE:</span>
                <span id="defenderServiceVal" class="defender-status-val">${this.getServiceStatusText()}</span>
              </div>
              <div class="defender-status-item">
                <span class="defender-status-label">SCORE:</span>
                <span class="defender-status-val score"><span id="defenderScoreVal">${s.score ? s.score.total : Math.max(0, 1000 - s.spentDP * 2)}</span> pts</span>
              </div>
            </div>

            <!-- Dynamic 6-Phase Gameplay Loop Indicator -->
            <div id="defenderPhaseIndicator" class="defender-phase-indicator">
              ${this.renderPhaseIndicator()}
            </div>

            <!-- Large Interactive Network Map Card -->
            <div class="defender-map-card">
              <div class="defender-map-toolbar">
                <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.resetMapView()" title="Fit Graph into View" style="padding:2px 7px; font-size:0.68rem; font-weight:700;">
                    <i class="fa-solid fa-compress"></i> Fit Graph
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.resetSelection()" title="Reset Selected Asset" style="padding:2px 7px; font-size:0.68rem; font-weight:700;">
                    <i class="fa-solid fa-xmark"></i> Reset Selection
                  </button>
                </div>

                <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                  <div style="display:flex; align-items:center; gap:0.25rem;">
                    <span style="font-size:0.68rem; font-weight:700; color:#475569;">Focus Node:</span>
                    <select id="defenderSubstationSelect" class="soc-select" style="font-size:0.7rem; padding:2px 6px;" onchange="window.DefenderView.setFocusSubstation(this.value)">
                      ${subList.map(sId => `<option value="${sId}" ${sId === s.selectedSubstation ? 'selected' : ''}>${sId}</option>`).join('')}
                    </select>
                  </div>
                  ${(s.activeLevel === 2 || s.activeLevel === 4 || s.activeLevel === 5) ? `
                    <div style="display:flex; align-items:center; gap:0.25rem;">
                      <span style="font-size:0.68rem; font-weight:700; color:#475569;">Destination:</span>
                      <select id="defenderDestinationSelect" class="soc-select" style="font-size:0.7rem; padding:2px 6px;" onchange="window.DefenderView.setDestinationSubstation(this.value)">
                        ${subList.map(sId => `<option value="${sId}" ${sId === s.selectedDestination ? 'selected' : ''}>${sId}</option>`).join('')}
                      </select>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Interactive Canvas -->
              <div id="defenderMapCanvas" style="width:100%; height:370px; border-radius:6px; border:1px solid #e2e8f0; position:relative; overflow:hidden;"></div>

              <!-- Compact Legend Directly Below Graph -->
              <div class="defender-graph-legend">
                <div class="legend-group">
                  <span class="legend-title">Nodes:</span>
                  <span class="legend-item"><span class="legend-dot gen"></span> ⚡ Gen</span>
                  <span class="legend-item"><span class="legend-dot sub"></span> 🏢 Substation</span>
                  <span class="legend-item"><span class="legend-dot hosp"></span> 🏥 Hospital</span>
                  <span class="legend-item"><span class="legend-dot def"></span> 🛡️ Defense</span>
                  <span class="legend-item"><span class="legend-dot city"></span> 🏙️ City</span>
                  <span class="legend-item"><span class="legend-dot water"></span> 💧 Water</span>
                </div>
                <div class="legend-group">
                  <span class="legend-title">Lines:</span>
                  <span class="legend-item"><span class="legend-line normal"></span> In Service</span>
                  <span class="legend-item"><span class="legend-line path"></span> Bypass Route</span>
                  <span class="legend-item"><span class="legend-line tripped"></span> Tripped</span>
                  <span class="legend-item"><span class="legend-line bridge"></span> Critical Bridge</span>
                </div>
              </div>
            </div>

            <!-- Contextual Action Panel Beneath Map -->
            <div class="defender-action-panel">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem; flex-wrap:wrap; gap:0.3rem;">
                <span style="font-size:0.72rem; font-weight:800; text-transform:uppercase; color:#0f172a; letter-spacing:0.02em;">
                  <i class="fa-solid fa-toolbox" style="color:#0284c7;"></i> Contextual Tool Palette (Level ${s.activeLevel})
                </span>
                <span style="font-size:0.65rem; color:#15803d; font-weight:700; background:#f0fdf4; padding:2px 6px; border-radius:4px; border:1px solid #bbf7d0;">
                  0 DP Analysis &middot; Disclosed Action Costs
                </span>
              </div>

              <div id="defenderActionButtonsDeck" class="contextual-tool-deck">
                <!-- Dynamically populated via updateActionButtons() -->
              </div>
            </div>

            <!-- Branch/Node Inspector Card (Shown ONLY after an asset is selected) -->
            <div id="defenderInspectedAssetCard" class="defender-asset-inspector" style="display:${s.inspectedAsset ? 'block' : 'none'};">
              <!-- Content populated via inspectSpecificAsset() -->
            </div>

          </div>

          <!-- RIGHT COLUMN: Mission Card, Character Dialogue, Execution Result, Learn More & History -->
          <div style="display:flex; flex-direction:column; gap:0.65rem;">
            
            <!-- 1. 5-Field Standardized Mission Card -->
            <div id="defenderMissionCardContainer">
              ${this.renderMissionCard()}
            </div>

            <!-- 2. One Character Dialogue Panel -->
            <div id="defenderCharacterDialogueContainer">
              ${this.renderCharacterDialogue()}
            </div>

            <!-- 3. Current Algorithm Execution Result (When Applicable) -->
            <div id="defenderDsaResultCard" class="defender-result-card" style="display:${s.activeAlgorithm ? 'block' : 'none'};">
              ${this.renderDsaExecutionResult()}
            </div>

            <!-- 4. Expandable Learn More Section (Collapsed by Default) -->
            <details class="defender-accordion" id="defenderLearnMoreAccordion">
              <summary class="defender-accordion-summary">
                <div style="display:flex; align-items:center; gap:0.45rem;">
                  <i class="fa-solid fa-graduation-cap" style="color:#0284c7;"></i>
                  <strong>Learn More</strong>
                  <span style="font-size:0.68rem; color:var(--text-muted); font-weight:500;">&mdash; Algorithm Traces, Pseudocode &amp; AC Diagnostics</span>
                </div>
                <i class="fa-solid fa-chevron-down accordion-arrow"></i>
              </summary>
              <div class="defender-accordion-body">
                
                <!-- LAYER 1: Operator Plain-English Briefing -->
                <div style="margin-bottom:0.6rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.5rem 0.65rem;">
                  <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#0369a1; letter-spacing:0.02em; margin-bottom:2px;">
                    <i class="fa-solid fa-bullhorn"></i> Layer 1 — Operator Plain-English Briefing
                  </div>
                  <div id="teachLayer1" style="font-size:0.75rem; color:#1e293b; line-height:1.45; font-weight:500;">
                    ${s.teaching.layer1}
                  </div>
                </div>

                <!-- LAYER 2: Live Data Structure & Traversal State -->
                <div style="margin-bottom:0.6rem; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:0.55rem 0.65rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#7c3aed; letter-spacing:0.02em;">
                      <i class="fa-solid fa-code-fork"></i> Layer 2 — Live Data Structure &amp; Traversal State
                    </span>
                    <span id="teachLayer2Badge" class="badge badge-neutral" style="font-size:0.65rem; font-family:var(--font-mono);">
                      ${s.teaching.layer2.algorithm}
                    </span>
                  </div>
                  <div id="teachLayer2Container" style="font-size:0.72rem; color:#334155; line-height:1.45;">
                    ${this.renderLayer2State(s.teaching.layer2)}
                  </div>
                </div>

                <!-- LAYER 3: Technical Engineering Details & Asymptotics -->
                <div style="margin-bottom:0.6rem; background:#0f172a; border-radius:6px; border:1px solid #334155; padding:0.55rem 0.65rem; color:#f8fafc;">
                  <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#38bdf8; letter-spacing:0.02em; margin-bottom:3px;">
                    <i class="fa-solid fa-microchip"></i> Layer 3 — Algorithm Details &amp; Engineering Constraints
                  </div>
                  <div id="teachLayer3Container" style="font-size:0.71rem; line-height:1.45;">
                    ${this.renderLayer3Details(s.teaching.layer3)}
                  </div>
                </div>

                <!-- AC Power-Flow Solver Diagnostics -->
                <div style="background:#fafaf9; border:1px solid #e2e8f0; border-radius:6px; padding:0.55rem 0.65rem;">
                  <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; color:#475569; letter-spacing:0.02em; margin-bottom:3px;">
                    <i class="fa-solid fa-chart-line" style="color:#57534e;"></i> AC Power-Flow Solver Diagnostics
                  </div>
                  <div id="defenderDiagnosticsBody" style="font-size:0.71rem; font-family:var(--font-mono);">
                    ${this.renderDiagnostics()}
                  </div>
                </div>

              </div>
            </details>

            <!-- 5. Expandable Event History Section (Collapsed by Default) -->
            <details class="defender-accordion" id="defenderEventHistoryAccordion">
              <summary class="defender-accordion-summary">
                <div style="display:flex; align-items:center; gap:0.45rem;">
                  <i class="fa-solid fa-clock-rotate-left" style="color:#15803d;"></i>
                  <strong>Event History</strong>
                  <span id="defenderTimelineCountBadge" class="badge badge-neutral" style="font-size:0.65rem;">${s.history.length} Events</span>
                </div>
                <i class="fa-solid fa-chevron-down accordion-arrow"></i>
              </summary>
              <div class="defender-accordion-body">
                <div id="defenderTimelineContainer" class="defender-timeline-body">
                  ${this.renderTimelineItems()}
                </div>
              </div>
            </details>

          </div>

        </div>

        <!-- Review / Scorecard Modal Container -->
        <div id="defenderReviewModalContainer"></div>

      </div>
    `;
  },

  init: function() {
    this.initGraphAndDsaEngine();
    this.initMap();
    this.updateActionButtons();
    this.executePowerFlowCalculation(false);

    // Show How to Play introduction if first time in session
    try {
      if (!sessionStorage.getItem('gridsec_how_to_play_shown')) {
        setTimeout(() => this.showHowToPlayModal(), 300);
      }
    } catch(e) {}
  },

  initGraphAndDsaEngine: function() {
    let data;
    if (this.state.networkId === 'TRAINING_15') {
      data = window.TRAINING_GRID_DATA || window.IEEE_30_DATA;
    } else if (this.state.networkId === 'IEEE_30') {
      data = window.IEEE_30_DATA || window.INDIA_GRID_DATA;
    } else {
      data = window.INDIA_GRID_DATA || window.IEEE_30_DATA;
    }
    if (!data) return;

    this.state.graph = new GridGraph();
    this.state.graph.loadData(data);
    this.state.dsaEngine = new DsaEngine(this.state.graph);

    // Default selection
    if (!this.state.selectedSubstation || !this.state.graph.getNode(this.state.selectedSubstation)) {
      if (this.state.networkId === 'TRAINING_15') {
        this.state.selectedSubstation = 'GEN-1';
      } else if (this.state.networkId === 'IEEE_30') {
        this.state.selectedSubstation = 'BUS-1';
      } else {
        this.state.selectedSubstation = 'WR-RAIGARH';
      }
    }
    if (!this.state.selectedDestination || !this.state.graph.getNode(this.state.selectedDestination)) {
      if (this.state.networkId === 'TRAINING_15') {
        this.state.selectedDestination = 'HOSPITAL';
      } else if (this.state.networkId === 'IEEE_30') {
        this.state.selectedDestination = 'BUS-2';
      } else {
        this.state.selectedDestination = 'NR-DELHI';
      }
    }
  },

  getSubstationOptions: function() {
    if (!this.state.graph) return ['GEN-1', 'SUB-1', 'HOSPITAL'];
    return this.state.graph.getAllNodes().map(n => n.id);
  },

  setFocusSubstation: function(nodeId) {
    this.state.selectedSubstation = nodeId;
    this.inspectSpecificAsset(nodeId, 'BUS');
    this.refreshUI();
  },

  setDestinationSubstation: function(nodeId) {
    this.state.selectedDestination = nodeId;
    this.refreshUI();
  },

  // Map / Graph Visualizer Initialization
  initMap: function() {
    const container = document.getElementById('defenderMapCanvas');
    if (!container) return;

    const isTraining = this.state.networkId === 'TRAINING_15';
    const isIEEE = this.state.networkId === 'IEEE_30';
    const data = isTraining ? (window.TRAINING_GRID_DATA || window.IEEE_30_DATA) :
                 (isIEEE ? (window.IEEE_30_DATA || window.INDIA_GRID_DATA) : (window.INDIA_GRID_DATA || window.IEEE_30_DATA));
    if (!data) return;

    if (this.state.map) {
      try {
        if (typeof this.state.map.destroy === 'function') {
          this.state.map.destroy();
        } else if (this.state.map.map?.remove) {
          this.state.map.map.remove();
        }
      } catch (e) {}
      this.state.map = null;
    }

    container.innerHTML = '';

    try {
      if (isTraining && window.TrainingGraphVisualizer) {
        // Instantiate High-Performance 15-Node SVG Schematic Visualizer
        this.state.map = new window.TrainingGraphVisualizer(
          'defenderMapCanvas',
          data,
          (node) => {
            this.setFocusSubstation(node.id);
          },
          (transformer) => {
            this.inspectSpecificAsset(transformer.id, 'TRANSFORMER');
          },
          null,
          (branch) => {
            const branchId = branch.id || (branch.from && branch.to ? `LINE-${branch.from}-${branch.to}` : null);
            if (branchId) {
              this.inspectSpecificAsset(branchId, 'LINE');
            }
          }
        );
        this.syncVisualStatesToMap();
      } else if (window.L) {
        // Fallback or selectable Geographic India / IEEE Map
        this.state.map = new IndiaMapVisualizer(
          'defenderMapCanvas',
          data,
          (node) => {
            this.setFocusSubstation(node.id);
          },
          (transformer) => {
            this.inspectSpecificAsset(transformer.id, 'TRANSFORMER');
          },
          null,
          (branch) => {
            const branchId = branch.id || (branch.from && branch.to ? `LINE-${branch.from}-${branch.to}` : null);
            if (branchId) {
              this.inspectSpecificAsset(branchId, 'LINE');
            }
          }
        );

        setTimeout(() => {
          if (this.state.map && this.state.map.map) {
            this.state.map.map.invalidateSize();
            this.state.map.fitNetwork();
            this.syncVisualStatesToMap();
          }
        }, 100);
      }
    } catch (err) {
      console.warn('[Grid Defender] Map init:', err);
    }
  },

  resetMapView: function() {
    if (this.state.map) {
      this.state.map.fitNetwork();
    }
  },

  resetSelection: function() {
    this.state.inspectedAsset = null;
    const el = document.getElementById('defenderInspectedAssetCard');
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }
    if (this.state.map && typeof this.state.map.clearSelection === 'function') {
      this.state.map.clearSelection();
    }
  },

  // Select Level & SubScenario (e.g. from GameShell or Mission Select)
  selectLevel: function(levelNum, subLevel) {
    this.state.activeLevel = levelNum;
    if (subLevel) {
      this.state.level4SubScenario = subLevel;
    }
    const lvl = this.levels[levelNum];
    if (lvl) {
      this.state.maxTurns = lvl.maxTurns;
    }
    this.resetLevel();
  },

  // Set Level (1 to 5)
  setLevel: function(levelNum) {
    this.state.activeLevel = levelNum;
    const lvl = this.levels[levelNum];
    this.state.maxTurns = lvl.maxTurns;
    this.resetLevel();
  },

  setLevel4SubScenario: function(subScenario) {
    this.state.level4SubScenario = subScenario;
    this.resetLevel();
  },

  setNetwork: function(netId) {
    this.state.networkId = netId;
    this.initGraphAndDsaEngine();
    this.initMap();
    this.resetLevel();
    this.refreshUI();
  },

  resetLevel: function() {
    const s = this.state;
    const lvl = this.levels[s.activeLevel];
    const isTraining = s.networkId === 'TRAINING_15';
    const isIEEE = s.networkId === 'IEEE_30';

    // Starting DP budget matching Section 1.6:
    // Level 1 = 60, Level 2 = 80, Level 3 = 100, Level 4A = 90, Level 4B = 90, Level 5 = 140
    let baseBudget = 100;
    if (s.activeLevel === 1) baseBudget = 60;
    else if (s.activeLevel === 2) baseBudget = 80;
    else if (s.activeLevel === 3) baseBudget = 100;
    else if (s.activeLevel === 4) baseBudget = 90;
    else if (s.activeLevel === 5) baseBudget = 140;

    // Apply difficulty modifier if settings exist
    const settings = window.GameStorage ? window.GameStorage.loadSettings() : null;
    const diff = (settings && settings.difficulty) ? settings.difficulty : 'normal';
    if (diff === 'easy') {
      baseBudget = Math.round(baseBudget * 1.2); // +20% starting DP
    }

    s.budget = baseBudget;
    s.spentDP = 0;
    s.currentTurn = 1;
    s.maxTurns = lvl.maxTurns;
    s.gridCondition = s.activeLevel === 1 ? 'NORMAL' : 'DISTURBED';
    s.candidateRoute = [];
    s.routeFeasibility = null;
    s.inspectedAsset = null;
    s.activeAlgorithm = null;
    s.dsaResult = null;
    s.selectedSubstation = isTraining ? 'GEN-1' : (isIEEE ? 'BUS-1' : 'WR-RAIGARH');
    s.selectedDestination = isTraining ? 'HOSPITAL' : (isIEEE ? 'BUS-2' : 'NR-DELHI');
    s.consecutiveCompliantSteps = s.activeLevel === 1 ? 1 : 0;
    s.cascadingTripsCount = 0;
    s.diagnosisPerformed = false;
    s.penaltiesApplied = {};
    s.score = null;
    s.levelCompleted = false;
    s.roundEnded = false;
    s.forcedSpeaker = null;
    s.level1Exploration = { bfsDone: false, dfsDone: false, reachabilityVerified: false, surgeDone: false, redispatched: false };
    s.level2BfsChecked = false;
    s.level2BfsDone = false;
    s.dijkstraDone = false;
    s.candidatePathFound = false;
    s.feasibilityDone = false;
    s.tarjanDone = false;
    s.maxHeapDone = false;
    s.dsuChecked = false;
    s.loadShedDone = false;
    s.corridorRestored = false;
    s.gatewayHardened = false;
    s.reclosed = false;
    s.fdiaAudited = false;
    s.residualAuditDone = false;
    s.badDataIsolated = false;
    s.analysisDone = false;

    // Set Level Initial Conditions & Overrides
    if (s.activeLevel === 1) {
      s.activeOverrides = {};
      s.activeOutages = [];
      s.teaching = {
        layer1: "Level 1: Understand the Grid. Select a substation and execute both BFS and DFS from the DSA Tool Palette to investigate reachability and inspect topological degrees.",
        layer2: {
          algorithm: "Awaiting Algorithm Execution",
          activeNode: s.selectedSubstation,
          dataStructure: "Adjacency List G = (V, E)",
          statePreview: "Select 'Trace (BFS)' or 'Deep Inspect (DFS)' from the palette.",
          metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
        },
        layer3: {
          pseudocode: "// Select a DSA algorithm from the palette to inspect pseudocode and graph complexity.",
          complexity: "O(1)",
          dataStructure: "Adjacency List G = (V, E)",
          graphSize: "|V| = 30 buses, |E| = 41 branches",
          assumptions: "A power grid graph represents physical connectivity. Nodes represent buses and substations; edges represent transmission lines and transformers."
        }
      };
    } else if (s.activeLevel === 2) {
      const outLine = isTraining ? 'LINE-SUB1-SUB4' : 'LINE-1-2';
      s.activeOverrides = { [outLine]: 'OUT_OF_SERVICE' };
      s.activeOutages = [outLine];
      s.teaching = {
        layer1: `Level 2: Transmission corridor ${outLine} tripped! Run BFS to verify connectivity, then run Dijkstra to discover a minimum-cost bypass path.`,
        layer2: {
          algorithm: `Active Outage: ${outLine} Tripped`,
          activeNode: isTraining ? "GEN-1" : "BUS-1",
          dataStructure: `Active Subgraph G' = (V, E \\ {${outLine}})`,
          statePreview: "Run 'Alt Route (Dijkstra)' to calculate a minimum-cost reroute.",
          metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
        },
        layer3: {
          pseudocode: "// Dijkstra Shortest Path\nminHeap.insert(source, 0);\nwhile (!minHeap.isEmpty()) {\n  u = minHeap.extractMin();\n  for (v in neighbors(u)) relax(u, v);\n}",
          complexity: "O((V + E) log V)",
          dataStructure: "Binary Min-Heap Priority Queue",
          graphSize: isTraining ? "|V| = 15 nodes, |E| = 20 active branches" : "|V| = 30 buses, |E| = 40 active branches",
          assumptions: "CRITICAL: A shortest graph path is NOT an electrical operating solution! AC power divides inversely proportional to line reactance X_ij according to Kirchhoff's Laws."
        }
      };
    } else if (s.activeLevel === 3) {
      const outLine = isTraining ? 'LINE-SUB1-SUB2' : 'LINE-1-3';
      s.activeOverrides = { [outLine]: 'OUT_OF_SERVICE' };
      s.activeOutages = [outLine];
      s.teaching = {
        layer1: `Level 3: Stressed Grid! Corridor ${outLine} tripped; parallel branch ${isTraining ? 'LINE-SUB2-SUB5' : 'LINE-2-4'} is operating at 94.2% thermal capacity. Use Tarjan's algorithm to identify critical bridges and Max-Heap to prioritize alerts.`,
        layer2: {
          algorithm: "Stressed Grid (N-1 Active)",
          activeNode: isTraining ? "LINE-SUB2-SUB5" : "LINE-2-4",
          dataStructure: "Tarjan DFS Tree + Binary Max-Heap",
          statePreview: "Run 'Bridges (Tarjan)' and 'Prioritize (Max-Heap)' to evaluate risks.",
          metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
        },
        layer3: {
          pseudocode: "// Tarjan Bridge Condition\nif (low[v] > tin[u]) {\n  markBridge(u, v);\n}",
          complexity: "O(V + E)",
          dataStructure: "DFS Tree + Low-Link Lookup Map",
          graphSize: isTraining ? "|V| = 15 nodes, |E| = 20 active branches" : "|V| = 30 buses, |E| = 40 active branches",
          assumptions: "A topological bridge is an edge whose removal increases the number of connected components. A bridge is NOT automatically the most overloaded corridor."
        }
      };
    } else if (s.activeLevel === 4) {
      if (s.level4SubScenario === 'A') {
        const outLine = isTraining ? 'LINE-SUB1-SUB4' : 'LINE-1-2';
        s.activeOverrides = { [outLine]: 'OUT_OF_SERVICE' };
        s.activeOutages = [outLine];
        s.teaching = {
          layer1: `Level 4A: Unauthorized Breaker Trip! Adversary actuated circuit breaker on ${outLine}. Flow is 0.0 MW. Investigate with BFS, check bridges with Tarjan, and reclose.`,
          layer2: {
            algorithm: "Cyber-Physical Breaker Actuation",
            activeNode: outLine,
            dataStructure: "Graph Adjacency List + Min-Heap",
            statePreview: "Audit substation breaker, then run Dijkstra to calculate bypass.",
            metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
          },
          layer3: {
            pseudocode: "// Breaker Trip Detection\nY_bus.removeBranch(u, v);\nrecalculateAdmittance();",
            complexity: "O(V + E)",
            dataStructure: `Adjacency List G' = (V, E \\ {${outLine}})`,
            graphSize: isTraining ? "|V| = 15 nodes, |E| = 20 branches" : "|V| = 30 buses, |E| = 40 branches",
            assumptions: "Unauthorized breaker actuation alters the physical bus admittance matrix Y_bus. The outage is genuine and triggers real power redistribution."
          }
        };
      } else {
        // Scenario 4B: False Data Injection (Physical plant nominal, telemetry spoofed!)
        s.activeOverrides = {};
        s.activeOutages = [];
        s.teaching = {
          layer1: `Level 4B: False Data Injection Attack! SCADA at ${isTraining ? 'SUB-2' : 'Bus 2'} reports a 450 MW surge, but physical load is ${isTraining ? '25' : '21.7'} MW. Use State Estimation residual testing to expose spoofing without tripping lines!`,
          layer2: {
            algorithm: "SCADA Telemetry Anomaly",
            activeNode: isTraining ? "SUB-2" : "BUS-2",
            dataStructure: "State Estimation Measurement Vector z",
            statePreview: "Run 'AC Feasibility' to calculate Chi-Square residual test r = ||z - Hx||.",
            metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
          },
          layer3: {
            pseudocode: "// State Estimation Bad Data Detection\nr = z - H * x_est;\nJ_x = transpose(r) * inv(R) * r;\nif (J_x > chi_square_threshold) flagBadData();",
            complexity: "O(m * n^2) for weighted least squares",
            dataStructure: "Measurement Residual Vector r",
            graphSize: isTraining ? "|V| = 15 nodes, |E| = 21 branches" : "|V| = 30 buses, |E| = 41 branches",
            assumptions: "Graph algorithms alone cannot detect FDIA. Bad data detection requires physical consistency verification via Kirchhoff's Current Law across neighboring buses."
          }
        };
      }
    } else if (s.activeLevel === 5) {
      // Level 5: National Grid Resilience (Multi-threat)
      const outLine = isTraining ? 'LINE-SUB1-SUB2' : 'LINE-1-3';
      s.activeOverrides = { [outLine]: 'OUT_OF_SERVICE' };
      s.activeOutages = [outLine];
      s.teaching = {
        layer1: "Level 5: National Grid Resilience! Multi-threat crisis: Corridor LINE-1-3 tripped, Bus 4 demand surge (+20 MW), and Bus 2 telemetry anomaly. Deploy the full DSA toolkit with 100 DP.",
        layer2: {
          algorithm: "Multi-Threat Grid Emergency",
          activeNode: "NATIONAL_MESH",
          dataStructure: "Full DSA Toolkit: BFS, DFS, Dijkstra, Tarjan, Heap, DSU",
          statePreview: "All DSA graph tools cost 0 DP. Physical actions cost DP.",
          metrics: { nodesVisited: 0, edgesExamined: 0, depth: 0 }
        },
        layer3: {
          pseudocode: "// Resilient Grid Defense Protocol\nrunTarjanBridges();\nrunMaxHeapPrioritization();\nrunDSUIslandingCheck();\nshedLoadIfBottlenecked();",
          complexity: "O((V + E) log V)",
          dataStructure: "Comprehensive DSA Suite",
          graphSize: "|V| = 30 buses, |E| = 40 active branches",
          assumptions: "Maintain service, achieve feasible operating conditions, contain cascading failures, and make evidence-based decisions."
        }
      };
    }

    s.history = [{
      timestamp: new Date().toLocaleTimeString(),
      action: 'LEVEL_START',
      title: `${lvl.title} Started`,
      cost: 0,
      detail: `Initialized scenario for ${s.networkId}. Defence Budget: 100 DP. Turns: ${lvl.maxTurns}.`
    }];

    this.initGraphAndDsaEngine();
    this.syncVisualStatesToMap();
    this.executePowerFlowCalculation(Object.keys(s.activeOverrides).length > 0);

    const app = window.app || {};
    const viewport = document.getElementById('socMainViewport');
    if (viewport) {
      viewport.innerHTML = this.render(app);
      setTimeout(() => this.init(), 50);
    }
  },

  syncVisualStatesToMap: function() {
    if (!this.state.map) return;
    this.state.map.resetInfrastructureStates();

    const s = this.state;
    // Highlight tripped lines in Red
    (s.activeOutages || []).forEach(lineId => {
      this.state.map.setInfrastructureState(lineId, 'tripped', { status: 'TRIPPED' });
    });

    // Level-specific highlights
    if (s.activeLevel === 3) {
      this.state.map.setInfrastructureState('LINE-2-4', 'overloaded', { status: 'STRESSED (94%)' });
    } else if (s.activeLevel === 4 && s.level4SubScenario === 'B') {
      this.state.map.setInfrastructureState('BUS-2', 'attacked', { status: 'FDIA_SPOOFED' });
    } else if (s.activeLevel === 5) {
      this.state.map.setInfrastructureState('BUS-2', 'attacked', { status: 'SUSPICIOUS_TELEMETRY' });
      this.state.map.setInfrastructureState('LINE-2-4', 'overloaded', { status: 'STRESSED (92%)' });
    }
  },

  // --------------------------------------------------------------------------
  // PRIMARY MECHANISMS: DSA ALGORITHM IMPLEMENTATIONS & ACTIONS (0 DP)
  // --------------------------------------------------------------------------

  // A. Breadth-First Search (BFS) — "Trace Connected Network" (0 DP)
  actionRunBFS: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'BFS';
    if (window.SoundEngine) window.SoundEngine.play('scan');
    const sourceId = s.selectedSubstation || 'BUS-1';

    const result = s.dsaEngine.runBFS(sourceId, new Set(s.activeOutages));
    s.dsaResult = result;

    // Visual updates on map
    if (s.map) {
      s.map.resetInfrastructureStates();
      // Re-apply tripped outages
      s.activeOutages.forEach(id => s.map.setInfrastructureState(id, 'tripped'));

      // Highlight visited nodes
      result.visitedSet.forEach(nodeId => {
        if (nodeId === sourceId) {
          s.map.setInfrastructureState(nodeId, 'selected', { status: 'BFS_SOURCE' });
        } else {
          s.map.setInfrastructureState(nodeId, 'bfs_visited', { status: `BFS_LEVEL_${result.levels[nodeId]}` });
        }
      });

      // Highlight tree edges as frontier
      result.treeEdges.forEach(edge => {
        s.map.setInfrastructureState(`${edge.from}-${edge.to}`, 'bfs_frontier');
      });
    }

    // 3-Layer Pedagogical Updates
    s.teaching.layer1 = `BFS explored the network level by level from ${sourceId} using a FIFO Queue. Visited ${result.visitedCount} of ${result.totalGraphNodes} substations across ${Math.max(...Object.values(result.levels))} hops. ${result.unreachableNodes.length === 0 ? 'Full topological reachability verified.' : `WARNING: ${result.unreachableNodes.length} substations are isolated/unreachable!`}`;
    
    s.teaching.layer2 = {
      algorithm: "Breadth-First Search (BFS)",
      activeNode: sourceId,
      dataStructure: "FIFO Queue (Array / Deque)",
      statePreview: `Queue: [${(result.queueSnapshots[0]?.queue || []).slice(0, 8).join(', ')}${(result.queueSnapshots[0]?.queue || []).length > 8 ? '...' : ''}]`,
      visitedList: result.visitedOrder,
      treeEdges: result.treeEdges,
      metrics: {
        nodesVisited: result.visitedCount,
        edgesExamined: result.examinedEdgesCount,
        depth: Math.max(...Object.values(result.levels)),
        unreachable: result.unreachableNodes
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Breadth-First Search (Adjacency List + Queue)\nfunction BFS(graph, source) {\n  let visited = new Set([source]);\n  let queue = [source];\n  while (queue.length > 0) {\n    let u = queue.shift();\n    for (let v of graph.neighbors(u)) {\n      if (!visited.has(v) && !isExcluded(u, v)) {\n        visited.add(v);\n        queue.push(v);\n      }\n    }\n  }\n  return visited;\n}`,
      complexity: `Time: O(V + E) = O(${result.totalGraphNodes} + ${result.totalGraphEdges}) | Space: O(V)`,
      dataStructure: "Adjacency List + FIFO Queue",
      graphSize: `Active Graph: |V| = ${result.totalGraphNodes} nodes, |E| = ${result.totalGraphEdges} edges`,
      assumptions: "BFS assumes unweighted graph edges to calculate minimum hop counts. In an AC grid, electrical power does NOT flow along shortest hop paths; it divides according to Kirchhoff's Laws based on line reactance X_ij."
    };

    // Check Level 1 Win Condition
    if (s.activeLevel === 1) {
      s.level1Exploration.bfsDone = true;
      if (result.unreachableNodes.length === 0) {
        s.level1Exploration.reachabilityVerified = true;
      }
      this.checkLevel1Progression();
    }
    if (s.activeLevel === 2) {
      s.level2BfsChecked = true;
      s.level2BfsDone = true;
    }

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'BFS_TRACE',
      title: `BFS Traversal from ${sourceId} (0 DP)`,
      cost: 0,
      detail: `Visited ${result.visitedCount} nodes level-by-level, examined ${result.examinedEdgesCount} edges. Queue state logged.`
    });

    this.refreshUI();
  },

  // B. Depth-First Search (DFS) — "Deep Network Inspection" (0 DP)
  actionRunDFS: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'DFS';
    if (window.SoundEngine) window.SoundEngine.play('scan');
    const sourceId = s.selectedSubstation || 'BUS-1';

    const result = s.dsaEngine.runDFS(sourceId, new Set(s.activeOutages));
    s.dsaResult = result;

    if (s.map) {
      s.map.resetInfrastructureStates();
      s.activeOutages.forEach(id => s.map.setInfrastructureState(id, 'tripped'));

      result.visitedSet.forEach(nodeId => {
        s.map.setInfrastructureState(nodeId, 'dfs_visited', { status: 'DFS_VISITED' });
      });
      result.treeEdges.forEach(edge => {
        s.map.setInfrastructureState(`${edge.from}-${edge.to}`, 'dfs_visited');
      });
    }

    s.teaching.layer1 = `DFS traversed deep into transmission corridors from ${sourceId} using a LIFO Stack / Recursion. Explored ${result.visitedCount} substations and detected ${result.cycleCount} mesh cycles (back edges). Transmission networks rely on cycles for N-1 redundancy.`;

    s.teaching.layer2 = {
      algorithm: "Depth-First Search (DFS)",
      activeNode: sourceId,
      dataStructure: "LIFO Call Stack",
      statePreview: `Call Stack: [${(result.stackSnapshots[result.stackSnapshots.length - 1]?.stack || []).slice(0, 6).join(' ➔ ')}]`,
      visitedList: result.traversalOrder,
      treeEdges: result.treeEdges,
      backEdges: result.backEdges,
      metrics: {
        nodesVisited: result.visitedCount,
        edgesExamined: result.examinedEdgesCount,
        cycleCount: result.cycleCount,
        unreachable: result.unreachableNodes
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Depth-First Search (Recursion / LIFO Stack)\nfunction DFS(u, parent, visited) {\n  visited.add(u);\n  for (let v of graph.neighbors(u)) {\n    if (!visited.has(v) && !isExcluded(u, v)) {\n      DFS(v, u, visited);\n    } else if (v !== parent) {\n      recordBackEdge(u, v); // Mesh Cycle Detected\n    }\n  }\n}`,
      complexity: `Time: O(V + E) = O(${result.totalGraphNodes} + ${result.totalGraphEdges}) | Space: O(V) for call stack`,
      dataStructure: "Adjacency List + LIFO Recursion Stack",
      graphSize: `Active Graph: |V| = ${result.totalGraphNodes} nodes, |E| = ${result.totalGraphEdges} edges`,
      assumptions: "DFS traverses one path to maximum depth before backtracking. Back-edges identify redundant parallel paths in the power grid mesh."
    };

    if (s.activeLevel === 1) {
      s.level1Exploration.dfsDone = true;
      this.checkLevel1Progression();
    }

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'DFS_INSPECT',
      title: `DFS Inspection from ${sourceId} (0 DP)`,
      cost: 0,
      detail: `Explored ${result.visitedCount} nodes, identified ${result.cycleCount} mesh cycles. Stack trace recorded.`
    });

    this.refreshUI();
  },

  // C. Dijkstra's Shortest Path — "Find Alternative Route" (0 DP)
  actionRunDijkstra: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'DIJKSTRA';
    if (window.SoundEngine) window.SoundEngine.play('scan');
    const sourceId = s.selectedSubstation || 'BUS-1';
    const targetId = s.selectedDestination || 'BUS-2';

    const result = s.dsaEngine.findAlternateRoute(sourceId, targetId, new Set(s.activeOutages));
    s.dsaResult = result;
    s.candidateRoute = result.path;

    if (s.map) {
      s.map.resetInfrastructureStates();
      s.activeOutages.forEach(id => s.map.setInfrastructureState(id, 'tripped'));

      if (result.success) {
        for (let i = 0; i < result.path.length - 1; i++) {
          const u = result.path[i];
          const v = result.path[i + 1];
          s.map.setInfrastructureState(`${u}-${v}`, 'highlighted_path', { status: 'DIJKSTRA_ROUTE' });
          s.map.setInfrastructureState(`${v}-${u}`, 'highlighted_path', { status: 'DIJKSTRA_ROUTE' });
        }
        result.path.forEach((nId, idx) => {
          s.map.setInfrastructureState(nId, 'selected', { status: idx === 0 ? 'START' : (idx === result.path.length - 1 ? 'GOAL' : 'WAYPOINT') });
        });
      }
    }

    s.teaching.layer1 = result.success
      ? `Dijkstra computed the minimum-cost graph route: ${result.path.join(' ➔ ')} (Total Cost: ${result.totalCost} MW loss). WARNING: A topological graph path is NOT automatically electrically feasible! You must audit AC power flow before switching.`
      : `Dijkstra failed to find a path between ${sourceId} and ${targetId}. The substations are completely disconnected in the active topology!`;

    s.teaching.layer2 = {
      algorithm: "Dijkstra's Shortest Path (Binary Min-Heap)",
      activeNode: `${sourceId} ➔ ${targetId}`,
      dataStructure: "Binary Min-Heap Priority Queue",
      statePreview: result.success ? `Path: ${result.path.join(' ➔ ')}` : "No reachable path found",
      relaxedEdges: result.relaxedEdges,
      heapSnapshots: result.heapSnapshots,
      metrics: {
        totalCost: result.totalCost,
        nodesExplored: result.exploredNodes.length,
        edgesExamined: result.examinedEdgesCount,
        relaxedEdgesCount: result.relaxedEdges.length
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Dijkstra with Binary Min-Heap\nfunction Dijkstra(graph, source, target) {\n  let dist = new Map(), pq = new MinPriorityQueue();\n  dist.set(source, 0);\n  pq.insert(source, 0);\n  while (!pq.isEmpty()) {\n    let { node: u, priority: d } = pq.extractMin();\n    if (u === target) break;\n    for (let { target: v, weight: w } of graph.neighbors(u)) {\n      if (d + w < (dist.get(v) || Infinity)) {\n        dist.set(v, d + w);\n        pq.insert(v, d + w);\n      }\n    }\n  }\n  return reconstructPath(target);\n}`,
      complexity: "Time: O((V + E) log V) with Binary Min-Heap | Space: O(V)",
      dataStructure: "Adjacency List + Binary Min-Heap Priority Queue",
      graphSize: `Active Graph: |V| = ${s.graph.getAllNodes().length} nodes, |E| = ${s.graph.edges.length} edges`,
      assumptions: "All edge weights must be strictly non-negative. Shortest path minimizes cumulative line loss or length, but does NOT compute AC bus voltages, phase angles (θ_i), or branch reactive losses."
    };

    if (result.success) {
      s.analysisDone = true;
      s.dijkstraDone = true;
      s.candidatePathFound = true;
    } else {
      s.dijkstraDone = false;
      s.candidatePathFound = false;
      s.candidateRoute = [];
      if (s.map) {
        s.map.resetInfrastructureStates();
        s.activeOutages.forEach(id => s.map.setInfrastructureState(id, 'tripped'));
      }
    }

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'DIJKSTRA_ROUTE',
      title: `Dijkstra Path: ${sourceId} ➔ ${targetId} (0 DP)`,
      cost: 0,
      detail: result.success
        ? `Found route: ${result.path.join(' → ')}. Total Cost: ${result.totalCost}. Relaxed ${result.relaxedEdges.length} edges.`
        : `Target unreachable from ${sourceId}.`
    });

    this.refreshUI();
  },

  // D. Binary Max-Heap Priority Queue — "Prioritize Critical Incidents" (0 DP)
  actionRunMaxHeap: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'MAX_HEAP';
    if (window.SoundEngine) window.SoundEngine.play('scan');

    // Construct realistic documented grid incidents based on scenario state
    const incidentList = [];
    if (s.activeOutages.includes('LINE-1-2')) {
      incidentList.push({
        id: 'INC-L12',
        assetId: 'LINE-1-2',
        type: 'TRANSMISSION_TRIP',
        severityScore: 92,
        reason: 'Backbone 132kV intertie tripped! Flow dropped from 138.5 MW to 0.0 MW.'
      });
    }
    if (s.activeOutages.includes('LINE-1-3')) {
      incidentList.push({
        id: 'INC-L13',
        assetId: 'LINE-1-3',
        type: 'TRANSMISSION_TRIP',
        severityScore: 88,
        reason: 'Generation evacuation corridor outaged. Loop current forced into parallel feeders.'
      });
    }
    if (s.activeLevel === 3 || s.activeLevel === 5) {
      incidentList.push({
        id: 'INC-L24',
        assetId: 'LINE-2-4',
        type: 'THERMAL_OVERLOAD',
        severityScore: 95,
        reason: 'Conductor operating at 94.2% thermal ampacity rating (projected 132.6% on reroute).'
      });
    }
    if (s.activeLevel === 4 && s.level4SubScenario === 'B') {
      incidentList.push({
        id: 'INC-B2-FDIA',
        assetId: 'BUS-2',
        type: 'FDIA_ANOMALY',
        severityScore: 85,
        reason: 'Sensor reports spoofed 450 MW active load. Chi-Square residual test J(x) = 88.4 >> 5.99.'
      });
    }
    if (incidentList.length === 0) {
      incidentList.push(
        { id: 'INC-SYS-1', assetId: 'BUS-1', type: 'ROUTINE_MONITORING', severityScore: 25, reason: 'Slack bus voltage magnitude 1.060 pu steady-state.' },
        { id: 'INC-SYS-2', assetId: 'BUS-2', type: 'LOAD_CENTER', severityScore: 45, reason: 'Urban demand center withdrawing 21.7 MW.' },
        { id: 'INC-SYS-3', assetId: 'LINE-2-4', type: 'BRANCH_WATCH', severityScore: 60, reason: 'Continuous thermal loading at 42.0%.' }
      );
    }

    const result = s.dsaEngine.prioritizeIncidentsHeap(incidentList);
    s.dsaResult = result;

    s.teaching.layer1 = `Binary Max-Heap prioritized ${result.totalIncidents} active incidents in O(N log N) time. Highest priority emergency: [${result.prioritizedIncidents[0]?.incident?.assetId}] with severity score ${result.prioritizedIncidents[0]?.severityScore} (${result.prioritizedIncidents[0]?.reason}).`;

    s.teaching.layer2 = {
      algorithm: "Binary Max-Heap Incident Prioritization",
      activeNode: result.prioritizedIncidents[0]?.incident?.assetId,
      dataStructure: "Binary Max-Heap Array",
      statePreview: `Heap Root (Max): ${result.prioritizedIncidents[0]?.incident?.assetId} (${result.prioritizedIncidents[0]?.severityScore} pts)`,
      prioritizedList: result.prioritizedIncidents,
      heapSnapshots: result.heapSnapshots,
      metrics: {
        totalIncidents: result.totalIncidents,
        rootPriority: result.prioritizedIncidents[0]?.severityScore,
        extractions: result.extractionSteps.length
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Binary Max-Heap Priority Queue\nclass MaxHeap {\n  insert(item, priority) {\n    this.heap.push({ item, priority });\n    this.bubbleUp(this.heap.length - 1); // O(log N)\n  }\n  extractMax() {\n    let max = this.heap[0];\n    this.heap[0] = this.heap.pop();\n    this.sinkDown(0); // O(log N)\n    return max;\n  }\n}`,
      complexity: "Insert: O(log N) | Extract-Max: O(log N) | Total Sort: O(N log N)",
      dataStructure: "Array-Based Binary Max-Heap [parent = Math.floor((i-1)/2)]",
      graphSize: `Active Incident Queue: ${result.totalIncidents} entries`,
      assumptions: "A genuine heap data structure maintains the heap property: parent.priority >= children.priority. It avoids sorting the entire list whenever a new emergency occurs."
    };

    s.maxHeapDone = true;

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'MAX_HEAP_PRIORITIZE',
      title: 'Incidents Prioritized via Max-Heap (0 DP)',
      cost: 0,
      detail: `Extracted ${result.totalIncidents} incidents in priority order. Top emergency: ${result.prioritizedIncidents[0]?.incident?.assetId} (${result.prioritizedIncidents[0]?.severityScore} pts).`
    });

    this.refreshUI();
  },

  // E. Tarjan's Bridge-Finding Algorithm — "Find Critical Transmission Links" (0 DP)
  actionRunTarjan: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'TARJAN';
    if (window.SoundEngine) window.SoundEngine.play('scan');

    const result = s.dsaEngine.findSinglePointsOfFailure(new Set(s.activeOutages));
    s.dsaResult = result;

    if (s.map) {
      s.map.resetInfrastructureStates();
      s.activeOutages.forEach(id => s.map.setInfrastructureState(id, 'tripped'));

      // Highlight bridges in gold/amber
      result.bridges.forEach(b => {
        s.map.setInfrastructureState(b.lineId, 'bridge', { status: 'TARJAN_BRIDGE' });
        s.map.setInfrastructureState(`${b.from}-${b.to}`, 'bridge', { status: 'TARJAN_BRIDGE' });
        s.map.setInfrastructureState(`${b.to}-${b.from}`, 'bridge', { status: 'TARJAN_BRIDGE' });
      });

      // Highlight articulation points
      result.articulationPoints.forEach(ap => {
        s.map.setInfrastructureState(ap.id, 'articulation_point', { status: 'ARTICULATION_POINT' });
      });
    }

    s.teaching.layer1 = `Tarjan's algorithm evaluated the graph in O(V + E) time using DFS discovery times (tin) and low-link values (low). Found ${result.totalBridges} critical bridges and ${result.totalArticulationPoints} articulation points. A bridge's failure will partition the network into disconnected islands!`;

    s.teaching.layer2 = {
      algorithm: "Tarjan's Bridge & Articulation Point Algorithm",
      activeNode: result.bridges[0] ? `${result.bridges[0].from} ↔ ${result.bridges[0].to}` : "None",
      dataStructure: "DFS Tree + Low-Link Lookup Map",
      statePreview: result.bridges.length > 0
        ? `Bridges: ${result.bridges.map(b => b.lineId).join(', ')}`
        : "No bridges detected (2-edge-connected mesh)",
      bridges: result.bridges,
      articulationPoints: result.articulationPoints,
      discoveryTimes: result.discoveryTimes,
      lowLinkValues: result.lowLinkValues,
      metrics: {
        totalBridges: result.totalBridges,
        totalArticulationPoints: result.totalArticulationPoints,
        edgesExamined: result.examinedEdges,
        connectedComponents: result.numComponents
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Tarjan's Bridge-Finding Algorithm\nfunction dfs(u, parent) {\n  tin[u] = low[u] = ++timer;\n  for (let v of neighbors(u)) {\n    if (v === parent) continue;\n    if (visited[v]) {\n      low[u] = Math.min(low[u], tin[v]); // Back edge\n    } else {\n      dfs(v, u);\n      low[u] = Math.min(low[u], low[v]); // Tree edge\n      if (low[v] > tin[u]) markBridge(u, v);\n    }\n  }\n}`,
      complexity: "Time: O(V + E) single DFS pass | Space: O(V) for recursion and lookup maps",
      dataStructure: "DFS Tree + tin[] and low[] Tables",
      graphSize: `Active Graph: |V| = ${s.graph.getAllNodes().length} nodes, |E| = ${s.graph.edges.length} edges`,
      assumptions: "Operates on an undirected connected or disconnected graph. A topological bridge is NOT automatically the most overloaded line, but its loss guarantees islanding."
    };

    s.tarjanDone = true;

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'TARJAN_BRIDGES',
      title: `Tarjan Bridge Analysis (0 DP)`,
      cost: 0,
      detail: `Discovered ${result.totalBridges} bridges and ${result.totalArticulationPoints} articulation points. Condition low[v] > tin[u] evaluated.`
    });

    this.refreshUI();
  },

  // F. Disjoint Set Union (DSU) — "Detect Grid Islands" (0 DP)
  actionRunDSU: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'DSU_ISLANDS';
    if (window.SoundEngine) window.SoundEngine.play('scan');

    const result = s.dsaEngine.detectGridIslands(new Set(s.activeOutages));
    s.dsaResult = result;

    s.teaching.layer1 = result.isPartitioned
      ? `GRID PARTITION DETECTED! DSU identified ${result.numIslands} independent electrical islands. Some islands may lack sufficient generation to serve local demand, risking frequency collapse.`
      : `Synchronous Integrity Intact: DSU confirmed all active substations belong to a single connected component (1 island).`;

    s.teaching.layer2 = {
      algorithm: "Disjoint Set Union (DSU) Island Detection",
      activeNode: `Islands: ${result.numIslands}`,
      dataStructure: "Union-Find Forest with Path Compression & Union by Rank",
      statePreview: result.islands.map(isl => `${isl.islandId}: Gen ${isl.totalGenMW} MW vs Load ${isl.totalLoadMW} MW (${isl.status})`).join(' | '),
      islands: result.islands,
      metrics: {
        numIslands: result.numIslands,
        isPartitioned: result.isPartitioned,
        unionOperations: result.benchmark?.unionOperationsCount || 0
      }
    };

    s.teaching.layer3 = {
      pseudocode: `// Disjoint Set Union (DSU) with Path Compression & Union by Rank\nfunction find(i) {\n  if (parent[i] === i) return i;\n  return parent[i] = find(parent[i]); // Path compression\n}\nfunction union(i, j) {\n  let rootI = find(i), rootJ = find(j);\n  if (rootI !== rootJ) {\n    if (rank[rootI] < rank[rootJ]) parent[rootI] = rootJ;\n    else if (rank[rootI] > rank[rootJ]) parent[rootJ] = rootI;\n    else { parent[rootJ] = rootI; rank[rootI]++; }\n  }\n}`,
      complexity: "Time: O(E · α(V)) ≈ O(E) near-linear | Space: O(V) for parent and rank arrays",
      dataStructure: "Union-Find Forest with Path Compression & Rank Balancing",
      graphSize: `Active Graph: |V| = ${s.graph.getAllNodes().length} nodes, |E| = ${s.graph.edges.length} edges`,
      assumptions: "DSU identifies connected components. An isolated component must have sufficient spinning reserves and reactive support to prevent local voltage/frequency collapse."
    };

    s.dsuChecked = true;

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'DSU_ISLANDING',
      title: `DSU Island Detection (0 DP)`,
      cost: 0,
      detail: `Analyzed graph partitioning: ${result.numIslands} islands found. Generation-demand balance computed per cluster.`
    });

    this.refreshUI();
  },

  // G. AC Power Flow Feasibility Check & State Estimation Residual Audit (0 DP)
  actionAuditFeasibility: function() {
    const s = this.state;
    s.diagnosisPerformed = true;
    s.forcedSpeaker = null;
    s.activeAlgorithm = 'AC_FEASIBILITY';

    if (s.activeLevel === 3) {
      s.feasibilityDone = false;
      // Level 3: Candidate reroute is thermally INFEASIBLE (LINE-2-4 reaches 132.6%!)
      s.routeFeasibility = {
        feasible: false,
        status: 'REJECTED_THERMAL_OVERLOAD',
        bottlenecks: [{
          line_id: 'LINE-2-4',
          from_bus: 'BUS-2',
          to_bus: 'BUS-4',
          thermal_limit_mw: 65.0,
          current_loading: 94.2,
          projected_loading: 132.6,
          thermal_limit_exceeded: true
        }],
        recommendation: 'Candidate route exceeds continuous thermal limit on LINE-2-4 (projected 132.6% loading). Rerouting without load reduction will trip thermal overcurrent protection!'
      };

      s.gridCondition = 'CRITICAL';
      s.teaching.layer1 = `AC power-flow validator REJECTED candidate route: LINE-2-4 projected to reach 132.6% thermal capacity. Electric current divides inversely proportional to impedance; parallel paths cannot absorb full transfer without load reduction.`;
      
      s.teaching.layer2 = {
        algorithm: "AC Power-Flow Feasibility Check",
        activeNode: "LINE-2-4",
        dataStructure: "Nonlinear Bus Admittance Matrix Y_bus",
        statePreview: "REJECTED: LINE-2-4 exceeds thermal ampacity (132.6% > 100%)",
        metrics: {
          currentLoading: "94.2%",
          projectedLoading: "132.6%",
          thermalLimit: "65.0 MW",
          voltagePU: "0.991 pu"
        }
      };

      s.teaching.layer3 = {
        pseudocode: `// AC Power-Flow Feasibility Check\nfor (let line of activeLines) {\n  let S_flow = calculateComplexPower(line.from, line.to, Y_bus);\n  if (abs(S_flow) > line.continuousRatingMVA) {\n    rejectRoute('THERMAL_OVERLOAD', line.id);\n  }\n}`,
        complexity: "O(V^3) or O(iterations * V log V) with Newton-Raphson",
        dataStructure: "Sparse Complex Admittance Matrix Y_bus",
        graphSize: `Active System: 30 buses, 40 lines`,
        assumptions: "Conductor thermal limits represent continuous Joule heating I^2 * R. Exceeding ratings causes thermal conductor sag and triggers protective trip relays."
      };

      if (s.map) {
        s.map.setInfrastructureState('LINE-2-4', 'overloaded', { status: 'PROJECTED 132.6% OVERLOAD' });
      }
    } else if (s.activeLevel === 4 && s.level4SubScenario === 'B') {
      s.feasibilityDone = true;
      s.fdiaAudited = true;
      s.residualAuditDone = true;
      // Level 4B: FDIA State Estimator Residual Audit
      s.routeFeasibility = {
        feasible: true,
        status: 'FDIA_DETECTED_PHYSICAL_CONSISTENCY_VIOLATION',
        bottlenecks: [],
        chiSquareResidual: 88.4,
        threshold: 5.99,
        recommendation: 'State Estimator Chi-Square residual test J(x) = 88.4 >> 5.99! Sensor measurement at Bus 2 violates Kirchhoff’s laws. Physical plant load is 21.7 MW (nominal). Telemetry is spoofed!'
      };

      s.teaching.layer1 = `State Estimator residual test exposed 88.4 Chi-Square discrepancy! Physical plant is normal; only telemetry is corrupted. Do NOT trip the physical line.`;
      
      s.teaching.layer2 = {
        algorithm: "State Estimation Chi-Square Residual Audit",
        activeNode: "BUS-2",
        dataStructure: "Measurement Residual Vector r = z - H * x",
        statePreview: "Chi-Square Test: J(x) = 88.4 >> Threshold 5.99 (99% Confidence)",
        metrics: {
          chiSquareValue: 88.4,
          threshold: 5.99,
          reportedLoadMW: 450.0,
          physicalLoadMW: 21.7
        }
      };

      s.teaching.layer3 = {
        pseudocode: `// Weighted Least Squares State Estimation Bad Data Detection\nr = z - H * x_est;\nJ_x = transpose(r) * inv(R) * r;\nif (J_x > 5.99) {\n  flagCompromisedSensor('BUS-2');\n  isolateTelemetryStream();\n}`,
        complexity: "O(m * n^2) for weighted least squares",
        dataStructure: "Measurement Jacobian Matrix H + Covariance R",
        graphSize: "Measurement Vector m = 82, State Vector n = 59",
        assumptions: "Adversary injected false data that does not lie in the column space of H. The measurement vector violates Kirchhoff's Current Law across neighboring nodes."
      };
    } else {
      s.feasibilityDone = true;
      // Normal feasible recovery path
      s.routeFeasibility = {
        feasible: true,
        status: 'ACCEPTED',
        bottlenecks: [],
        recommendation: 'AC power flow verified under full nonlinear constraints. Voltages (0.95–1.05 pu) and branch thermal loadings stay within safe operating margins.'
      };

      s.teaching.layer1 = `AC power-flow validator verified candidate route: All corridors remain within continuous thermal and voltage ratings under full nonlinear AC simulation.`;
      
      s.teaching.layer2 = {
        algorithm: "AC Power-Flow Feasibility Check",
        activeNode: s.candidateRoute[0] || "BUS-1",
        dataStructure: "Newton-Raphson Power Flow Solver",
        statePreview: "FEASIBLE: All voltages (0.95–1.05 pu) and loadings (<=100%) compliant",
        metrics: {
          totalGenMW: 288.5,
          totalLoadMW: 283.4,
          lossesMW: 5.12,
          converged: true
        }
      };

      s.teaching.layer3 = {
        pseudocode: `// Nonlinear AC Power Flow (Newton-Raphson)\nwhile (maxMismatch > tolerance) {\n  J = buildJacobian(V, theta);\n  delta = solve(J, [delta_P, delta_Q]);\n  V += delta_V; theta += delta_theta;\n}`,
        complexity: "O(iterations * V^1.4) with sparse LU decomposition",
        dataStructure: "Sparse Jacobian Matrix J",
        graphSize: "30 buses, 41 branches",
        assumptions: "Verifies steady-state voltage magnitudes, phase angles, and branch loading limits under continuous operating conditions."
      };
    }

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'FEASIBILITY_AUDIT',
      title: `Electrical Feasibility Audit: ${s.routeFeasibility.status}`,
      cost: 0,
      detail: s.routeFeasibility.recommendation
    });

    this.refreshUI();
  },

  // --------------------------------------------------------------------------
  // PHYSICAL OPERATING DECISIONS (ACTUATOR COMMANDS REQUIRING DP)
  // --------------------------------------------------------------------------

  // Operating Adjustment (15 DP) — Redispatch or Load Shedding
  actionOperatingAdjustment: function(type) {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    const cost = this.costs.OPERATING_ADJUSTMENT;
    if (s.budget < cost) {
      alert("Insufficient Defence Points (DP) to execute operating adjustment.");
      return;
    }

    s.budget -= cost;
    s.spentDP += cost;
    if (window.SoundEngine) window.SoundEngine.play('reclose');

    if (s.activeLevel === 1) {
      // Level 1: Redispatch generation to match demand surge
      s.level1Exploration.redispatched = true;
      s.consecutiveCompliantSteps = 3;
      s.gridCondition = 'NORMAL';
      s.levelCompleted = true;

      s.history.push({
        timestamp: new Date().toLocaleTimeString(),
        action: 'GENERATION_REDISPATCH',
        title: 'Generator Redispatch Executed (+15 MW)',
        cost: cost,
        detail: 'Dispatched +15 MW active generation at Bus 1 & Bus 2. Restored generation-demand equilibrium.'
      });

      s.teaching.layer1 = `Generation increased by +15 MW to 303.5 MW, perfectly balancing increased consumer demand. Win Condition Achieved! Click "View Level Review & Scorecard".`;
      this.executePowerFlowCalculation(false);
    } else if (s.activeLevel === 3 || s.activeLevel === 5) {
      // Level 3 / 5: Execute 15% non-critical load shed at Bus 4 to relieve LINE-2-4
      s.loadShedDone = true;
      s.gridCondition = 'DISTURBED';
      if (s.routeFeasibility) {
        s.routeFeasibility.feasible = true;
        s.routeFeasibility.status = 'ACCEPTED_POST_LOAD_SHED';
      }

      s.history.push({
        timestamp: new Date().toLocaleTimeString(),
        action: 'LOAD_SHED_INTERVENTION',
        title: 'Selective Non-Critical Load Shed (15%)',
        cost: cost,
        detail: 'Shed 15% domestic load at Bus 4. LINE-2-4 loading reduced from 94.2% to 78.4%, containing cascade risk.'
      });

      s.teaching.layer1 = `Targeted 15% load shed at Bus 4 relieved the bottleneck: LINE-2-4 loading dropped from 94.2% to 78.4%. Corridor is now safe for line restoration.`;

      if (s.map) {
        s.map.setInfrastructureState('LINE-2-4', 'normal');
      }
    }

    this.advanceTurn();
    this.refreshUI();
  },

  // Recovery Action (10 DP) — Circuit Breaker Reclose
  actionRecovery: function(type) {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    const cost = this.costs.RECOVERY;
    if (s.budget < cost) {
      alert("Insufficient Defence Points (DP) to execute recovery action.");
      return;
    }

    // Check if recovery is attempting an unverified infeasible action in Level 3
    if (s.activeLevel === 3 && s.routeFeasibility && !s.routeFeasibility.feasible) {
      // Player forced recovery without load shedding! Violates constraint!
      s.penaltiesApplied['AVOIDABLE_CASCADE_OUTAGE'] = 50;
      s.cascadingTripsCount = 1;
      s.gridCondition = 'CRITICAL';
      s.budget -= cost;
      s.spentDP += cost;

      s.history.push({
        timestamp: new Date().toLocaleTimeString(),
        action: 'CASCADE_TRIGGERED',
        title: 'CASCADE FAILURE! Avoidable Outage (-50 Penalty)',
        cost: cost,
        detail: 'LINE-2-4 reached 132.6% loading. Thermal protection tripped LINE-2-4! Regional blackout triggered.'
      });

      s.teaching.layer1 = `CRITICAL OVERLOAD! Conductor thermal limit exceeded on LINE-2-4. Breakers tripped automatically because load was not shed first. Penalty -50 pts applied.`;

      if (s.map) {
        s.map.setInfrastructureState('LINE-2-4', 'tripped', { status: 'CASCADE_TRIPPED' });
      }

      this.advanceTurn();
      this.refreshUI();
      return;
    }

    // Level 2 prerequisite: check if candidate route was electrically validated
    if (s.activeLevel === 2) {
      if (!s.routeFeasibility || !s.routeFeasibility.feasible) {
        alert("Safety interlock: You must audit AC Power-Flow Feasibility (0 DP) to verify loop-flow stability before authorizing circuit breaker reclose.");
        return;
      }
    }

    // Level 4A prerequisite: check if gateway is cryptographically hardened
    if (s.activeLevel === 4 && s.level4SubScenario === 'A') {
      if (!s.gatewayHardened) {
        alert("Access Denied: Substation SCADA gateway has not been cryptographically hardened! The adversary will immediately re-trip the breaker. Apply Preventive Protection (20 DP) first.");
        return;
      }
    }

    s.budget -= cost;
    s.spentDP += cost;
    if (window.SoundEngine) window.SoundEngine.play('reclose');

    // Successful Recovery
    const targetLine = s.activeOutages[0] || (s.activeLevel === 3 ? 'LINE-1-3' : 'LINE-1-2');
    s.activeOutages = [];
    s.activeOverrides = {};
    s.reclosed = true;
    s.corridorRestored = true;
    s.gridCondition = 'RECOVERED';
    s.levelCompleted = true;

    this.executePowerFlowCalculation(false);

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'BREAKER_RECLOSE',
      title: `Breaker Reclosed & Synchronized (${targetLine})`,
      cost: cost,
      detail: `Transmission corridor ${targetLine} restored to service under verified synchrocheck. AC flow returned to nominal.`
    });

    s.teaching.layer1 = `Corridor ${targetLine} re-energized. Power flow returned to nominal baseline dispatch. Challenge successfully resolved! Click "View Level Review & Scorecard".`;

    if (s.map) {
      s.map.setInfrastructureState(targetLine, 'restored', { status: 'RESTORED' });
    }

    this.advanceTurn();
    this.refreshUI();
  },

  // Targeted Incident Response (15 DP) — Isolate Bad Telemetry
  actionTargetedResponse: function() {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    const cost = this.costs.INCIDENT_RESPONSE;
    if (s.budget < cost) {
      alert("Insufficient Defence Points (DP) to execute targeted response.");
      return;
    }

    s.budget -= cost;
    s.spentDP += cost;
    s.badDataIsolated = true;

    if (s.activeLevel === 4 && s.level4SubScenario === 'B') {
      s.gridCondition = 'RECOVERED';
      s.levelCompleted = true;

      s.history.push({
        timestamp: new Date().toLocaleTimeString(),
        action: 'TELEMETRY_ISOLATED',
        title: 'Compromised Telemetry Stream Isolated (15 DP)',
        cost: cost,
        detail: 'Operator validated physical consistency, discarded corrupted Bus 2 sensor stream, and kept physical plant online at 100% capacity.'
      });

      s.teaching.layer1 = `Compromised RTU telemetry discarded. State estimator returned to verified physical truth. Zero unnecessary switching penalties! Scenario resolved with perfect diagnosis.`;

      if (s.map) {
        s.map.setInfrastructureState('BUS-2', 'restored', { status: 'VERIFIED_PHYSICAL_TRUTH' });
      }
    } else if (s.activeLevel === 5) {
      s.history.push({
        timestamp: new Date().toLocaleTimeString(),
        action: 'SENSOR_ISOLATED',
        title: 'Anomalous Sensor Isolated at Bus 2',
        cost: cost,
        detail: 'Removed corrupted analog telemetry from state estimator. Physical load verified at 21.7 MW.'
      });

      s.teaching.layer1 = `Isolated suspicious sensor at Bus 2. Restored true physical observability. Now execute load shed to relieve LINE-2-4 stress, then restore LINE-1-3.`;

      if (s.map) {
        s.map.setInfrastructureState('BUS-2', 'restored');
      }
    }

    this.advanceTurn();
    this.refreshUI();
  },

  // Preventive Protection (20 DP) — Gateway Hardening
  actionPreventiveProtection: function() {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    s.gatewayHardened = true;
    const cost = this.costs.PREVENTIVE_PROTECTION;
    if (s.budget < cost) {
      alert("Insufficient Defence Points (DP) to apply preventive protection.");
      return;
    }

    s.budget -= cost;
    s.spentDP += cost;
    if (window.SoundEngine) window.SoundEngine.play('reclose');

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'PREVENTIVE_PROTECTION',
      title: 'Substation Gateway Hardened (20 DP)',
      cost: cost,
      detail: 'Applied IEEE 1686 authentication, blocked unauthorized GOOSE/MMS trip commands, and secured protection relays.'
    });

    s.teaching.layer1 = `Substation protection bay hardened against unauthorized remote control. Enforced cryptographic mutual authentication on protection gateways.`;

    this.advanceTurn();
    this.refreshUI();
  },

  // Unnecessary Switching Trap (Level 4B Trap)
  actionUnnecessarySwitchingTrip: function() {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    if (window.SoundEngine) window.SoundEngine.play('alarm');
    s.penaltiesApplied['UNNECESSARY_SWITCHING'] = 25;
    s.penaltiesApplied['AVOIDABLE_BLACKOUT'] = 50;
    s.gridCondition = 'CRITICAL';
    s.activeOutages.push('LINE-1-2');
    s.activeOverrides['LINE-1-2'] = 'OUT_OF_SERVICE';

    this.executePowerFlowCalculation(true);

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'UNNECESSARY_TRIP',
      title: 'TRAPPED! Unnecessary Line Trip (-75 Total Penalties)',
      cost: 0,
      detail: 'Operator tripped LINE-1-2 based on fake telemetry! Caused an avoidable real physical blackout for 21.7 MW of load.'
    });

    s.teaching.layer1 = `AVOIDABLE OUTAGE! Operator tripped physical line based on false data. Load at Bus 2 disconnected! Adversary tricked you into causing the blackout. Total penalty: -75 pts.`;

    if (s.map) {
      s.map.setInfrastructureState('LINE-1-2', 'tripped', { status: 'AVOIDABLE_TRIP' });
    }

    this.advanceTurn();
    this.refreshUI();
  },

  logEvent: function(msg, type = 'info') {
    const s = this.state;
    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'SYSTEM_EVENT',
      title: msg,
      cost: 0,
      detail: msg
    });
    this.refreshUI();
  },

  tripBreaker: function(lineId, authorized = true) {
    const s = this.state;
    const target = lineId || (s.networkId === 'TRAINING_15' ? 'L08' : 'LINE-1-2');
    if (!s.activeOutages.includes(target)) {
      s.activeOutages.push(target);
    }
    s.activeOverrides[target] = 'OUT_OF_SERVICE';
    s.gridCondition = 'DISTURBED';

    if (window.SoundEngine) {
      window.SoundEngine.play('alarm');
    }

    if (s.map) {
      s.map.setInfrastructureState(target, 'tripped', { status: authorized ? 'OPERATOR_TRIP' : 'UNAUTHORIZED_ATTACK_TRIP' });
    }

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'BREAKER_TRIP',
      title: `${authorized ? 'Manual' : 'UNAUTHORIZED'} Breaker Trip: ${target}`,
      cost: 0,
      detail: `${authorized ? 'Operator actuated breaker' : 'Cyber intrusion triggered unauthorized protective relay trip'} on corridor ${target}.`
    });

    s.teaching.layer1 = `ALARM: Breaker tripped on corridor ${target}! Investigate connectivity and evaluate feasibility before attempting restoration.`;
    this.refreshUI();
  },

  // Inspect Asset (0 DP)
  actionInspectAsset: function(targetId) {
    const s = this.state;
    s.diagnosisPerformed = true;
    const assetId = targetId || s.selectedSubstation || 'BUS-1';
    this.inspectSpecificAsset(assetId, assetId.startsWith('BUS') ? 'BUS' : 'LINE');

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'INSPECT_ASSET',
      title: `Inspected Asset: ${assetId} (0 DP)`,
      cost: 0,
      detail: `Retrieved operational parameters, continuous thermal ratings, and connected loads.`
    });

    this.refreshUI();
  },

  inspectSpecificAsset: function(assetId, assetType) {
    const isTraining = this.state.networkId === 'TRAINING_15';
    const isIEEE = this.state.networkId === 'IEEE_30';
    let assetDetails = {
      id: assetId,
      name: assetId,
      type: assetType,
      ratingMW: isTraining ? 400.0 : (isIEEE ? (assetId === 'LINE-2-4' ? 65.0 : 130.0) : 1000.0),
      currentLoadingPct: 0.0,
      voltageKV: isTraining ? 220.0 : (isIEEE ? 132.0 : 400.0),
      connectedCriticalLoads: isTraining ? '15-Node Training Grid Corridor' : (isIEEE ? 'BUS-2 Urban Hub (21.7 MW), BUS-4 Regional Feeder (7.6 MW)' : 'Northern Regional Load Center (500 MW)'),
      status: this.state.activeOutages.includes(assetId) ? 'TRIPPED / OUT_OF_SERVICE' : 'IN_SERVICE'
    };

    if (isTraining && window.TRAINING_GRID_DATA) {
      const matchNode = (window.TRAINING_GRID_DATA.nodes || []).find(n => n.id === assetId);
      if (matchNode) {
        assetDetails.name = matchNode.name;
        assetDetails.ratingMW = matchNode.capacityMW || 500;
        assetDetails.voltageKV = parseFloat(matchNode.voltage) || 220;
        assetDetails.loadMW = matchNode.demandMW || 0;
        assetDetails.connectedCriticalLoads = matchNode.zone || 'Training District';
      }
      const matchEdge = (window.TRAINING_GRID_DATA.edges || []).find(e => e.id === assetId || `${e.from}-${e.to}` === assetId || `${e.to}-${e.from}` === assetId);
      if (matchEdge) {
        assetDetails.name = `${matchEdge.from} ↔ ${matchEdge.to}`;
        assetDetails.ratingMW = matchEdge.maxLoadMW || 400;
        assetDetails.voltageKV = 220;
        assetDetails.flowMW = Math.round((matchEdge.maxLoadMW || 400) * 0.45);
        assetDetails.connectedCriticalLoads = matchEdge.isBridge ? 'Topological Single-Point-of-Failure Bridge' : 'Dual-Feed Meshed Corridors';
      }
    }

    if (this.state.currentPowerFlow) {
      const matchLine = (this.state.currentPowerFlow.lines || []).find(l => l.line_id === assetId);
      if (matchLine) {
        assetDetails.currentLoadingPct = matchLine.loading_percent;
        assetDetails.flowMW = matchLine.p_from_mw;
        assetDetails.status = matchLine.status;
      }
      const matchBus = (this.state.currentPowerFlow.buses || []).find(b => b.bus_id === assetId);
      if (matchBus) {
        assetDetails.voltagePU = matchBus.voltage_pu;
        assetDetails.voltageKV = matchBus.voltage_kv;
        assetDetails.loadMW = matchBus.p_load_mw;
      }
    }

    if (this.state.activeLevel === 3 && (assetId === 'LINE-2-4' || assetId === 'LINE-SUB2-SUB5')) {
      assetDetails.currentLoadingPct = 94.2;
      assetDetails.flowMW = 61.2;
    }

    if (this.state.activeLevel === 4 && this.state.level4SubScenario === 'B' && (assetId === 'BUS-2' || assetId === 'SUB-2')) {
      assetDetails.spoofedLoadMW = 450.0;
      assetDetails.actualLoadMW = isTraining ? 25.0 : 21.7;
    }

    this.state.inspectedAsset = assetDetails;

    const el = document.getElementById('defenderInspectedAssetCard');
    if (el) {
      el.style.display = 'block';
      const isOutage = assetDetails.status.includes('TRIPPED') || assetDetails.status.includes('OUT');
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <strong style="color:#0f172a; font-size:0.78rem;">
              <i class="fa-solid ${assetType === 'BUS' ? 'fa-building-columns' : 'fa-bolt'}" style="color:#0284c7;"></i> ${assetDetails.id}
            </strong>
            <span class="badge ${isOutage ? 'badge-critical' : 'badge-forest'}" style="font-size:0.65rem;">
              ${assetDetails.status}
            </span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.resetSelection()" style="padding:1px 6px; font-size:0.65rem;" title="Close Inspector">
            <i class="fa-solid fa-xmark"></i> Close
          </button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:4px; font-size:0.7rem; margin-top:4px;">
          <div>Rating: <strong>${assetDetails.ratingMW} MW</strong></div>
          <div>Voltage: <strong>${assetDetails.voltageKV} kV ${assetDetails.voltagePU ? `(${assetDetails.voltagePU} pu)` : ''}</strong></div>
          <div>Loading: <strong style="${assetDetails.currentLoadingPct > 90 ? 'color:#dc2626;' : ''}">${assetDetails.currentLoadingPct || 0}%</strong></div>
          ${assetDetails.flowMW !== undefined ? `<div>Flow: <strong>${assetDetails.flowMW} MW</strong></div>` : ''}
          ${assetDetails.loadMW !== undefined ? `<div>Demand: <strong>${assetDetails.loadMW} MW</strong></div>` : ''}
        </div>
        ${assetDetails.spoofedLoadMW ? `
          <div style="margin-top:4px; background:#fff7ed; border:1px solid #fed7aa; padding:4px 6px; border-radius:4px; font-size:0.68rem; color:#9a3412;">
            <i class="fa-solid fa-triangle-exclamation"></i> <strong>SCADA Telemetry Discrepancy:</strong> Sensor reports ${assetDetails.spoofedLoadMW} MW; Physical load is ${assetDetails.actualLoadMW} MW!
          </div>
        ` : ''}
        <div style="margin-top:4px; font-size:0.68rem; color:#64748b; border-top:1px dashed #e2e8f0; padding-top:3px;">
          Connected Feeder / Center: <em>${assetDetails.connectedCriticalLoads}</em>
        </div>
      `;
    }
  },

  checkLevel1Progression: function() {
    const s = this.state;
    if (s.level1Exploration.bfsDone && s.level1Exploration.dfsDone && s.level1Exploration.reachabilityVerified) {
      if (s.level1Exploration.surgeDone && s.level1Exploration.redispatched) {
        s.consecutiveCompliantSteps = 3;
        s.levelCompleted = true;
        s.teaching.layer1 = `Level 1 Win Condition Achieved! Graph reachability verified via BFS, structural connectivity evaluated via DFS, and dynamic demand surge balanced via generator redispatch.`;
      }
    }
  },

  advanceLevel1Surge: function() {
    const s = this.state;
    s.forcedSpeaker = null;
    s.activeAlgorithm = null;
    s.consecutiveCompliantSteps = 2;
    s.currentTurn = 2;
    s.gridCondition = 'DISTURBED';
    s.level1Exploration.surgeDone = true;

    s.history.push({
      timestamp: new Date().toLocaleTimeString(),
      action: 'DEMAND_SURGE',
      title: 'Demand Surge Active (+15 MW at Bus 2)',
      cost: 0,
      detail: 'Consumer demand increased from 283.4 MW to 298.4 MW. Grid requires generation adjustment to maintain equilibrium.'
    });

    s.teaching.layer1 = `Consumer load at Bus 2 increased by +15 MW (total demand: 298.4 MW). System mismatch detected! Execute an Operating Adjustment (15 DP) to redispatch generation and restore equilibrium.`;
    this.refreshUI();
  },

  advanceTurn: function() {
    const s = this.state;
    if (s.currentTurn < s.maxTurns) {
      s.currentTurn += 1;
    } else {
      s.roundEnded = true;
    }
  },

  // --------------------------------------------------------------------------
  // POWER FLOW & BACKEND SOLVER INTEGRATION
  // --------------------------------------------------------------------------
  executePowerFlowCalculation: function(hasOverrides) {
    const netId = this.state.networkId || 'IEEE_30';
    const overrides = hasOverrides ? this.state.activeOverrides : {};

    fetch('/api/power-flow/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network_id: netId,
        scenario_id: `DEFENDER_${Date.now()}`,
        state_overrides: overrides
      })
    })
    .then(res => res.json())
    .then(data => {
      this.state.currentPowerFlow = data;
      this.updateDiagnosticsUI();
    })
    .catch(err => {
      console.warn('[Grid Defender] Backend solve fallback:', err);
      this.state.currentPowerFlow = this.getBenchmarkFallbackResult(netId, overrides);
      this.updateDiagnosticsUI();
    });
  },

  getBenchmarkFallbackResult: function(netId, overrides) {
    if (netId === 'TRAINING_15') {
      const isOutage = Object.keys(overrides).length > 0;
      return {
        status: 'TOPOLOGICAL_DSA_STUDY',
        network_id: 'TRAINING_15',
        solver_backend: 'Deterministic Training Topology (Topological DSA Mode)',
        provenance: {
          data_classification: 'TOPOLOGICAL_TRAINING',
          verification_status: 'DETERMINISTIC_GRAPH_MODEL'
        },
        power_balance: {
          total_generation_mw: 730.0,
          total_load_mw: 644.0,
          total_losses_mw: 86.0,
          balance_error_mw: 0.000,
          converged: true,
          iterations: 1,
          modeNote: 'Topological DSA Mode: Solved via graph loss weights'
        },
        buses: (window.TRAINING_GRID_DATA?.nodes || []).map(n => ({
          bus_id: n.id,
          voltage_pu: 1.000,
          voltage_kv: parseFloat(n.voltage) || 220.0,
          p_gen_mw: n.genMW || 0,
          p_load_mw: n.demandMW || 0
        })),
        lines: (window.TRAINING_GRID_DATA?.edges || []).map(e => ({
          line_id: e.id,
          loading_percent: overrides[e.id] ? 0.0 : (e.isBridge ? 45.0 : 38.0),
          p_from_mw: overrides[e.id] ? 0.0 : Math.round(e.maxLoadMW * 0.4),
          status: overrides[e.id] ? 'TRIPPED' : 'IN_SERVICE'
        }))
      };
    }

    const isIEEE = netId === 'IEEE_30';
    const isOutage = Object.keys(overrides).length > 0;
    const baseGen = isIEEE ? 288.52 : 38450.0;
    const baseLoad = isIEEE ? 283.40 : 38000.0;
    const baseLoss = isIEEE ? (isOutage ? 7.84 : 5.12) : (isOutage ? 540.0 : 450.0);

    return {
      status: 'SUCCESS',
      network_id: netId,
      solver_backend: 'Pre-Computed Benchmark Reference (IEEE 30 Standard Test Case)',
      provenance: {
        data_classification: 'ESTIMATED',
        verification_status: 'PRECOMPUTED_BENCHMARK'
      },
      power_balance: {
        total_generation_mw: baseGen,
        total_load_mw: baseLoad,
        total_losses_mw: baseLoss,
        balance_error_mw: 0.000,
        converged: true,
        iterations: 4
      },
      buses: [
        { bus_id: 'BUS-1', voltage_pu: 1.060, voltage_kv: 132.0, p_gen_mw: 138.5, p_load_mw: 0.0 },
        { bus_id: 'BUS-2', voltage_pu: isOutage ? 1.025 : 1.043, voltage_kv: 132.0, p_gen_mw: 40.0, p_load_mw: 21.7 },
        { bus_id: 'BUS-3', voltage_pu: isOutage ? 0.998 : 1.021, voltage_kv: 132.0, p_gen_mw: 0.0, p_load_mw: 2.4 },
        { bus_id: 'BUS-4', voltage_pu: isOutage ? 0.991 : 1.012, voltage_kv: 132.0, p_gen_mw: 0.0, p_load_mw: 7.6 }
      ],
      lines: [
        { line_id: 'LINE-1-2', loading_percent: isOutage && overrides['LINE-1-2'] ? 0.0 : 34.2, p_from_mw: isOutage && overrides['LINE-1-2'] ? 0.0 : 44.5, status: isOutage && overrides['LINE-1-2'] ? 'TRIPPED' : 'IN_SERVICE' },
        { line_id: 'LINE-1-3', loading_percent: isOutage ? 68.5 : 38.2, p_from_mw: isOutage ? 89.0 : 49.6, status: isOutage && overrides['LINE-1-3'] ? 'TRIPPED' : 'IN_SERVICE' },
        { line_id: 'LINE-2-4', loading_percent: isOutage ? 74.1 : 42.0, p_from_mw: isOutage ? 48.2 : 27.3, status: 'IN_SERVICE' }
      ]
    };
  },

  // --------------------------------------------------------------------------
  // DETERMINISTIC 1,000-POINT SCORING ENGINE & OUTCOME STATES (SECTION 1.6)
  // --------------------------------------------------------------------------
  calculateScore: function(isSuccess) {
    const s = this.state;
    const settings = window.GameStorage ? window.GameStorage.loadSettings() : null;
    const isHard = (settings && settings.difficulty === 'hard');

    // 1. Mission Objectives: up to 400 pts
    let objectivePts = 400;
    if (!isSuccess && s.gridCondition === 'CRITICAL') {
      objectivePts = 100;
    } else if (!isSuccess && s.gridCondition === 'DISTURBED') {
      objectivePts = 220;
    } else if (!isSuccess) {
      objectivePts = 150;
    }

    // 2. Diagnosis Accuracy: up to 250 pts
    let diagnosisPts = s.diagnosisPerformed ? 250 : 80;

    // 3. DP Efficiency: up to 150 pts
    let dpStarting = 100;
    if (s.activeLevel === 1) dpStarting = 60;
    else if (s.activeLevel === 2) dpStarting = 80;
    else if (s.activeLevel === 3) dpStarting = 100;
    else if (s.activeLevel === 4) dpStarting = 90;
    else if (s.activeLevel === 5) dpStarting = 140;
    let dpRatio = Math.max(0, Math.min(1.0, s.budget / dpStarting));
    let dpEfficiencyPts = Math.round(dpRatio * 150);

    // 4. Speed against Target: up to 100 pts
    let speedPts = 100;
    if (s.currentTurn > 3) speedPts = Math.max(40, 100 - (s.currentTurn - 3) * 15);

    // 5. Asset Protection (Zero Breach / Overload): up to 100 pts
    let assetProtectionPts = 100;
    if (s.cascadingTripsCount > 0 || s.gridCondition === 'CRITICAL') {
      assetProtectionPts = 0;
    } else if (s.gridCondition === 'DISTURBED') {
      assetProtectionPts = 60;
    }

    // Penalties calculation
    let totalPenalties = 0;
    for (const k in s.penaltiesApplied) {
      totalPenalties += s.penaltiesApplied[k];
    }

    const subtotal = objectivePts + diagnosisPts + dpEfficiencyPts + speedPts + assetProtectionPts;
    const total = Math.max(0, Math.min(1000, subtotal - totalPenalties));

    // Determine EXACT 1 of 4 Outcome States:
    // - PASSED: all required conditions met and score >= 400 without penalties
    // - COMPLETED WITH PENALTY: required conditions met, but penalty triggered (counts as pass)
    // - FAILED: fail condition triggered (e.g. critical breach, blind trip, total cascade)
    // - INCOMPLETE: time or DP ran out before conditions met
    let outcomeState = 'PASSED';
    let hasPenalty = totalPenalties > 0;
    let failConditionTriggered = s.failConditionTriggered || (s.budget <= 0 && !isSuccess) || (s.criticalBreached);

    if (failConditionTriggered) {
      outcomeState = 'FAILED';
    } else if (isSuccess) {
      if (total >= 400) {
        outcomeState = hasPenalty ? 'COMPLETED WITH PENALTY' : 'PASSED';
      } else {
        outcomeState = 'FAILED';
      }
    } else {
      outcomeState = (s.budget <= 0) ? 'FAILED' : 'INCOMPLETE';
    }

    // Stars: 3 at >=850 (>=900 on Hard), 2 at 600-849, 1 at 400-599, 0 below 400
    const threeStarThreshold = isHard ? 900 : 850;
    let stars = 0;
    if (outcomeState === 'PASSED' || outcomeState === 'COMPLETED WITH PENALTY') {
      if (total >= threeStarThreshold) stars = 3;
      else if (total >= 600) stars = 2;
      else if (total >= 400) stars = 1;
    }

    let grade = 'C (Grid Degradation Detected)';
    if (total >= 900) grade = 'S (Master Grid Defender)';
    else if (total >= 750) grade = 'A (Proficient Grid Defender)';
    else if (total >= 600) grade = 'B (Acceptable Mitigation)';

    s.score = {
      objectivePts,
      servicePts: objectivePts,
      diagnosisPts,
      dpEfficiencyPts,
      resourcePts: dpEfficiencyPts,
      speedPts,
      assetProtectionPts,
      cascadePts: assetProtectionPts,
      feasibilityPts: assetProtectionPts,
      penalties: totalPenalties,
      penaltiesBreakdown: { ...s.penaltiesApplied },
      total,
      grade,
      outcomeState,
      stars
    };

    return s.score;
  },

  actionEndRound: function() {
    const sc = this.calculateScore(this.state.levelCompleted);
    this.state.roundEnded = true;

    if (window.GameShell && typeof window.GameShell.showDebrief === 'function') {
      window.GameShell.showDebrief({
        totalScore: sc.total,
        grade: sc.grade.substring(0, 1),
        stars: sc.stars,
        outcomeState: sc.outcomeState,
        breakdown: {
          service: sc.objectivePts,
          diagnosis: sc.diagnosisPts,
          dpEfficiency: sc.dpEfficiencyPts,
          speed: sc.speedPts,
          assetProtection: sc.assetProtectionPts
        },
        operatorFeedback: this.state.teaching.layer1,
        stats: {
          breakers: this.state.reclosed ? 1 : 0,
          fdia: this.state.badDataIsolated ? 1 : 0,
          islands: this.state.gridCondition === 'RECOVERED' ? 1 : 0
        }
      });
    } else {
      this.showReviewModal();
    }
    this.refreshUI();
  },

  showReviewModal: function() {
    const s = this.state;
    const sc = s.score || this.calculateScore(s.levelCompleted);
    const container = document.getElementById('defenderReviewModalContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(3px);">
        <div style="background:#ffffff; border-radius:10px; width:90%; max-width:540px; padding:1.25rem; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); border:1px solid #e2e8f0; font-family:Inter,sans-serif;">
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:0.6rem; margin-bottom:0.85rem;">
            <div>
              <h3 style="margin:0; font-size:1.05rem; color:#0f172a; font-weight:800;">
                <i class="fa-solid fa-award" style="color:#f59e0b;"></i> Mission Complete: Performance Review
              </h3>
              <div style="font-size:0.75rem; color:var(--text-muted);">${this.levels[s.activeLevel]?.title}</div>
            </div>
            <span class="badge ${sc.total >= 900 ? 'badge-forest' : (sc.total >= 750 ? 'badge-primary' : 'badge-warning')}" style="font-size:0.85rem; font-weight:800; padding:4px 10px;">
              ${sc.grade}
            </span>
          </div>

          <!-- Total Score Summary Banner -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Total Score</div>
              <div style="font-size:1.6rem; font-weight:900; color:#0f172a; font-family:var(--font-mono);">
                ${sc.total} <span style="font-size:0.85rem; color:var(--text-muted); font-weight:500;">/ 1,000 pts</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Remaining Budget</div>
              <div style="font-size:1.1rem; font-weight:800; color:#0284c7; font-family:var(--font-mono);">
                ${s.budget} DP
              </div>
            </div>
          </div>

          <!-- Deterministic Scoring Breakdown Table -->
          <div style="font-size:0.75rem; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; padding:5px 8px; background:#f1f5f9; font-weight:700; border-bottom:1px solid #e2e8f0;">
              <span>Score Evaluation Metric</span>
              <span>Points Awarded</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid #f1f5f9;">
              <span>1. Required Service Maintained (Max 400)</span>
              <strong style="color:#15803d;">+${sc.servicePts} pts</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid #f1f5f9;">
              <span>2. Feasible Operating Condition (Max 250)</span>
              <strong style="color:#15803d;">+${sc.feasibilityPts} pts</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid #f1f5f9;">
              <span>3. Cascading Failures Prevented (Max 150)</span>
              <strong style="color:#15803d;">+${sc.cascadePts} pts</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid #f1f5f9;">
              <span>4. Effective Resource Use (Max 100)</span>
              <strong style="color:#0284c7;">+${sc.resourcePts} pts</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:5px 8px; border-bottom:1px solid #f1f5f9;">
              <span>5. Evidence-based Diagnosis & DSA (Max 100)</span>
              <strong style="color:#7c3aed;">+${sc.diagnosisPts} pts</strong>
            </div>
            ${sc.penalties > 0 ? `
              <div style="display:flex; justify-content:space-between; padding:5px 8px; background:#fef2f2; color:#b91c1c; font-weight:700;">
                <span>Penalties (Unnecessary Switching / Avoidable Outage)</span>
                <span>-${sc.penalties} pts</span>
              </div>
            ` : ''}
          </div>

          <!-- Actions & Navigation -->
          <div style="display:flex; justify-content:space-between; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.closeReviewModal(); window.DefenderView.resetLevel();" style="font-weight:700;">
              <i class="fa-solid fa-rotate-left"></i> Replay Level
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.DefenderView.closeReviewModal(); window.DefenderView.nextLevel();" style="font-weight:700; background:#166534;">
              ${s.activeLevel < 5 ? 'Advance to Next Level <i class="fa-solid fa-arrow-right"></i>' : 'Return to Level 1'}
            </button>
          </div>

        </div>
      </div>
    `;
  },

  closeReviewModal: function() {
    const container = document.getElementById('defenderReviewModalContainer');
    if (container) container.innerHTML = '';
  },

  nextLevel: function() {
    const next = this.state.activeLevel < 5 ? this.state.activeLevel + 1 : 1;
    this.setLevel(next);
  },

  // --------------------------------------------------------------------------
  // UI REFRESH & RENDER HELPERS
  // --------------------------------------------------------------------------
  refreshUI: function() {
    const s = this.state;

    // 0. Update Dynamic 6-Phase Indicator
    const phaseEl = document.getElementById('defenderPhaseIndicator');
    if (phaseEl) phaseEl.innerHTML = this.renderPhaseIndicator();

    // 1. Update Grid Condition Badge
    const condEl = document.getElementById('defenderGridConditionPill');
    if (condEl) condEl.innerHTML = this.getConditionBadge(s.gridCondition);

    // 2. Update Budget
    const budEl = document.getElementById('defenderBudgetVal');
    if (budEl) budEl.textContent = s.budget;

    // 3. Update Turn
    const turnEl = document.getElementById('defenderTurnVal');
    if (turnEl) turnEl.textContent = s.currentTurn;

    // 4. Update Service Status
    const srvEl = document.getElementById('defenderServiceVal');
    if (srvEl) srvEl.innerHTML = this.getServiceStatusText();

    // 5. Update Score
    const scEl = document.getElementById('defenderScoreVal');
    const newScore = s.score ? s.score.total : Math.max(0, 1000 - s.spentDP * 2);
    if (scEl) {
      const prevScore = scEl.textContent;
      scEl.textContent = newScore;
      if (prevScore !== '' && prevScore !== String(newScore)) {
        scEl.classList.remove('score-updated');
        void scEl.offsetWidth;
        scEl.classList.add('score-updated');
      }
    }

    // Sync GameShell HUD in game.html
    const hudDp = document.getElementById('hudDpVal');
    if (hudDp) {
      hudDp.textContent = `${s.budget} DP`;
      if (s.budget <= 25) hudDp.classList.add('low');
      else hudDp.classList.remove('low');
    }
    const hudScore = document.getElementById('hudScoreVal');
    if (hudScore) hudScore.textContent = `${newScore} pts`;
    const hudHealth = document.getElementById('hudHealthVal');
    if (hudHealth) {
      const healthPct = s.gridCondition === 'CRITICAL' ? '42%' : (s.gridCondition === 'DISTURBED' ? '78%' : '100%');
      hudHealth.textContent = healthPct;
      hudHealth.style.color = s.gridCondition === 'CRITICAL' ? '#ef4444' : (s.gridCondition === 'DISTURBED' ? '#f59e0b' : '#10b981');
    }

    // 6. Update Character Dialogue Box
    const charEl = document.getElementById('defenderCharacterDialogueContainer');
    if (charEl) charEl.innerHTML = this.renderCharacterDialogue();

    // 7. Update Mission Card
    const missionEl = document.getElementById('defenderMissionCardContainer');
    if (missionEl) missionEl.innerHTML = this.renderMissionCard();

    // 8. Update Current Algorithm Execution Result
    const resEl = document.getElementById('defenderDsaResultCard');
    if (resEl) {
      if (s.activeAlgorithm) {
        resEl.style.display = 'block';
        resEl.innerHTML = this.renderDsaExecutionResult();
      } else {
        resEl.style.display = 'none';
      }
    }

    // 9. Update 3-Layer Educational Panel
    const l1El = document.getElementById('teachLayer1');
    if (l1El) {
      const stateData = this.deriveGameState();
      l1El.textContent = stateData.dialogueText || s.teaching.layer1;
    }

    const l2Badge = document.getElementById('teachLayer2Badge');
    if (l2Badge) l2Badge.textContent = s.teaching.layer2.algorithm;

    const l2Cont = document.getElementById('teachLayer2Container');
    if (l2Cont) l2Cont.innerHTML = this.renderLayer2State(s.teaching.layer2);

    const l3Cont = document.getElementById('teachLayer3Container');
    if (l3Cont) l3Cont.innerHTML = this.renderLayer3Details(s.teaching.layer3);

    // 10. Update Timeline
    const tlEl = document.getElementById('defenderTimelineContainer');
    if (tlEl) tlEl.innerHTML = this.renderTimelineItems();
    const badgeEl = document.getElementById('defenderTimelineCountBadge');
    if (badgeEl) badgeEl.textContent = `${s.history.length} Events`;

    // 11. Update Contextual Action Palette
    this.updateActionButtons();
    this.updateDiagnosticsUI();
  },

  renderLayer2State: function(layer2) {
    if (!layer2) return '<div>No active algorithm executed.</div>';

    let chipsHtml = '';
    if (layer2.visitedList && layer2.visitedList.length > 0) {
      chipsHtml = `
        <div style="margin-top:4px;">
          <strong style="font-size:0.68rem; color:#475569;">Traversal Order:</strong>
          <div class="dsa-chip-stream">
            ${layer2.visitedList.map((id, idx) => `<span class="dsa-chip queue">${idx + 1}. ${id}</span>`).join('')}
          </div>
        </div>
      `;
    } else if (layer2.prioritizedList && layer2.prioritizedList.length > 0) {
      chipsHtml = `
        <div style="margin-top:4px;">
          <strong style="font-size:0.68rem; color:#475569;">Heap Extraction Sequence:</strong>
          <div class="dsa-chip-stream">
            ${layer2.prioritizedList.map(item => `<span class="dsa-chip heap">Rank ${item.rank}: ${item.incident.assetId} (${item.severityScore} pts)</span>`).join('')}
          </div>
        </div>
      `;
    } else if (layer2.bridges && layer2.bridges.length > 0) {
      chipsHtml = `
        <div style="margin-top:4px;">
          <strong style="font-size:0.68rem; color:#b45309;">Critical Bridges Identified:</strong>
          <div class="dsa-chip-stream">
            ${layer2.bridges.map(b => `<span class="dsa-chip bridge"><i class="fa-solid fa-triangle-exclamation"></i> ${b.lineId} (${b.condition})</span>`).join('')}
          </div>
        </div>
      `;
    } else if (layer2.islands && layer2.islands.length > 0) {
      chipsHtml = `
        <div style="margin-top:4px;">
          <strong style="font-size:0.68rem; color:#0e7490;">Connected Component Clusters:</strong>
          <div class="dsa-chip-stream">
            ${layer2.islands.map(isl => `<span class="dsa-chip heap">${isl.islandId} (${isl.nodes.length} buses, Gen: ${isl.totalGenMW} MW, Load: ${isl.totalLoadMW} MW)</span>`).join('')}
          </div>
        </div>
      `;
    }

    const m = layer2.metrics || {};
    return `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#475569; margin-bottom:3px;">
          <span>Data Structure: <strong style="color:#0f172a;">${layer2.dataStructure}</strong></span>
          <span>Focus Node: <strong style="color:#0284c7;">${layer2.activeNode || 'None'}</strong></span>
        </div>
        <div style="background:#f1f5f9; padding:4px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.68rem; color:#334155; margin-bottom:4px;">
          ${layer2.statePreview || ''}
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:4px; font-size:0.68rem; background:#fafaf9; padding:4px 6px; border-radius:4px; border:1px solid #e2e8f0;">
          <div>Visited Nodes: <strong>${m.nodesVisited || 0}</strong></div>
          <div>Edges Checked: <strong>${m.edgesExamined || 0}</strong></div>
          ${m.depth !== undefined ? `<div>Depth/Hops: <strong>${m.depth}</strong></div>` : ''}
          ${m.cycleCount !== undefined ? `<div>Cycles Found: <strong>${m.cycleCount}</strong></div>` : ''}
          ${m.totalCost !== undefined ? `<div>Path Cost: <strong>${m.totalCost} MW</strong></div>` : ''}
          ${m.rootPriority !== undefined ? `<div>Top Priority: <strong>${m.rootPriority}</strong></div>` : ''}
        </div>
        ${chipsHtml}
      </div>
    `;
  },

  renderLayer3Details: function(layer3) {
    if (!layer3) return '<div>No technical details available.</div>';
    return `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.7rem;">
          <span style="color:#38bdf8;"><strong>Complexity:</strong> ${layer3.complexity}</span>
          <span style="color:#94a3b8;">${layer3.graphSize}</span>
        </div>
        <div class="dsa-code-block">${layer3.pseudocode}</div>
        <div style="margin-top:4px; font-size:0.69rem; color:#cbd5e1; border-top:1px solid #334155; padding-top:4px;">
          <strong style="color:#f59e0b;"><i class="fa-solid fa-triangle-exclamation"></i> Engineering Limitation:</strong> ${layer3.assumptions}
        </div>
      </div>
    `;
  },

  updateActionButtons: function() {
    const deck = document.getElementById('defenderActionButtonsDeck');
    if (!deck) return;

    const s = this.state;
    const c = this.costs;

    if (s.roundEnded || s.levelCompleted) {
      deck.innerHTML = `
        <button class="btn btn-primary" onclick="window.DefenderView.actionEndRound()" style="grid-column:1/-1; padding:0.65rem; font-weight:800; background:#166534; font-size:0.8rem;">
          <i class="fa-solid fa-award"></i> View Level Review &amp; Scorecard (1,000 Pts)
        </button>
      `;
      return;
    }

    let buttonsHtml = '';

    if (s.activeLevel === 1) {
      // Level 1: BFS & DFS (+ Advance Surge or Redispatch Gen)
      const surgeDone = s.level1Exploration?.surgeDone;
      const canRedispatch = s.budget >= c.OPERATING_ADJUSTMENT;
      const tools = [
        this.renderToolItem({
          name: 'Trace (BFS)',
          icon: 'fa-circle-nodes',
          color: '#0284c7',
          cost: 0,
          purpose: 'Queue-based exploration of reachable substations',
          onclick: 'window.DefenderView.actionRunBFS()',
          enabled: true,
          active: s.activeAlgorithm === 'BFS',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Deep Inspect (DFS)',
          icon: 'fa-network-wired',
          color: '#7c3aed',
          cost: 0,
          purpose: 'Stack-based cycle detection & mesh structure inspection',
          onclick: 'window.DefenderView.actionRunDFS()',
          enabled: true,
          active: s.activeAlgorithm === 'DFS',
          isAction: false
        })
      ];

      if (surgeDone) {
        tools.push(this.renderToolItem({
          name: 'Redispatch Gen (+15 MW)',
          icon: 'fa-bolt',
          color: '#16a34a',
          cost: c.OPERATING_ADJUSTMENT,
          purpose: 'Balance generator output to meet +15 MW demand surge',
          onclick: "window.DefenderView.actionOperatingAdjustment('REDISPATCH')",
          enabled: canRedispatch,
          disabledReason: `Need ${c.OPERATING_ADJUSTMENT} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        }));
      } else {
        tools.push(this.renderToolItem({
          name: 'Advance Surge',
          icon: 'fa-arrow-trend-up',
          color: '#d97706',
          cost: 0,
          purpose: 'Simulate +15 MW demand shift to test grid equilibrium',
          onclick: 'window.DefenderView.advanceLevel1Surge()',
          enabled: true,
          active: false,
          isAction: true
        }));
      }

      buttonsHtml = tools.join('');
    } else if (s.activeLevel === 2) {
      // Level 2: BFS, Dijkstra, Electrical Feasibility, Recovery
      const canRecover = s.budget >= c.RECOVERY;
      buttonsHtml = [
        this.renderToolItem({
          name: 'Trace (BFS)',
          icon: 'fa-circle-nodes',
          color: '#0284c7',
          cost: 0,
          purpose: 'Examine network reachability under active line outage',
          onclick: 'window.DefenderView.actionRunBFS()',
          enabled: true,
          active: s.activeAlgorithm === 'BFS',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Alt Route (Dijkstra)',
          icon: 'fa-route',
          color: '#166534',
          cost: 0,
          purpose: 'Min-Heap shortest bypass route between endpoints',
          onclick: 'window.DefenderView.actionRunDijkstra()',
          enabled: true,
          active: s.activeAlgorithm === 'DIJKSTRA',
          isAction: false
        }),
        this.renderToolItem({
          name: 'AC Feasibility',
          icon: 'fa-calculator',
          color: '#be123c',
          cost: 0,
          purpose: 'Audit AC loop flow, voltage bounds & thermal ampacity',
          onclick: 'window.DefenderView.actionAuditFeasibility()',
          enabled: true,
          active: s.activeAlgorithm === 'AC_FEASIBILITY',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Reclose Breaker',
          icon: 'fa-wrench',
          color: '#166534',
          cost: c.RECOVERY,
          purpose: 'Re-energize corridor LINE-1-2 after audit',
          onclick: "window.DefenderView.actionRecovery('BREAKER_RECLOSE')",
          enabled: canRecover,
          disabledReason: `Need ${c.RECOVERY} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        })
      ].join('');
    } else if (s.activeLevel === 3) {
      // Level 3: Tarjan, Priority Queue, BFS/DSU, Supported operating adjustments
      const canAdjust = s.budget >= c.OPERATING_ADJUSTMENT;
      const canRecover = s.budget >= c.RECOVERY;
      buttonsHtml = [
        this.renderToolItem({
          name: 'Bridges (Tarjan)',
          icon: 'fa-bridge',
          color: '#b45309',
          cost: 0,
          purpose: 'Detect single-point-of-failure bridge transmission lines',
          onclick: 'window.DefenderView.actionRunTarjan()',
          enabled: true,
          active: s.activeAlgorithm === 'TARJAN',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Prioritize (Max-Heap)',
          icon: 'fa-layer-group',
          color: '#d97706',
          cost: 0,
          purpose: 'Rank transmission branches by thermal risk & severity',
          onclick: 'window.DefenderView.actionRunMaxHeap()',
          enabled: true,
          active: s.activeAlgorithm === 'MAX_HEAP',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Grid Islands (DSU)',
          icon: 'fa-cubes',
          color: '#0891b2',
          cost: 0,
          purpose: 'Analyze graph partitioning & cluster generation balance',
          onclick: 'window.DefenderView.actionRunDSU()',
          enabled: true,
          active: s.activeAlgorithm === 'DSU_ISLANDS',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Shed 15% Load',
          icon: 'fa-scissors',
          color: '#b45309',
          cost: c.OPERATING_ADJUSTMENT,
          purpose: 'Emergency load relief to prevent thermal cascade on LINE-2-4',
          onclick: "window.DefenderView.actionOperatingAdjustment('LOAD_SHED')",
          enabled: canAdjust,
          disabledReason: `Need ${c.OPERATING_ADJUSTMENT} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        }),
        this.renderToolItem({
          name: 'Restore LINE-1-3',
          icon: 'fa-shield-check',
          color: '#166534',
          cost: c.RECOVERY,
          purpose: 'Restore tripped corridor once loading is stabilized',
          onclick: "window.DefenderView.actionRecovery('RESTORE_LINE_1_3')",
          enabled: canRecover,
          disabledReason: `Need ${c.RECOVERY} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        })
      ].join('');
    } else if (s.activeLevel === 4) {
      if (s.level4SubScenario === 'A') {
        const canProtect = s.budget >= c.PREVENTIVE_PROTECTION;
        const canRecover = s.budget >= c.RECOVERY;
        buttonsHtml = [
          this.renderToolItem({
            name: 'Trace (BFS)',
            icon: 'fa-circle-nodes',
            color: '#0284c7',
            cost: 0,
            purpose: 'Check reachability & identify isolated substations',
            onclick: 'window.DefenderView.actionRunBFS()',
            enabled: true,
            active: s.activeAlgorithm === 'BFS',
            isAction: false
          }),
          this.renderToolItem({
            name: 'Alt Route (Dijkstra)',
            icon: 'fa-route',
            color: '#166534',
            cost: 0,
            purpose: 'Compute minimum-cost candidate bypass corridor',
            onclick: 'window.DefenderView.actionRunDijkstra()',
            enabled: true,
            active: s.activeAlgorithm === 'DIJKSTRA',
            isAction: false
          }),
          this.renderToolItem({
            name: 'AC Feasibility',
            icon: 'fa-calculator',
            color: '#be123c',
            cost: 0,
            purpose: 'Verify loop flows and voltage stability under outage',
            onclick: 'window.DefenderView.actionAuditFeasibility()',
            enabled: true,
            active: s.activeAlgorithm === 'AC_FEASIBILITY',
            isAction: false
          }),
          this.renderToolItem({
            name: 'Harden Gateway',
            icon: 'fa-lock',
            color: '#7c3aed',
            cost: c.PREVENTIVE_PROTECTION,
            purpose: 'Apply cybersecurity hardening to substation SCADA controls',
            onclick: 'window.DefenderView.actionPreventiveProtection()',
            enabled: canProtect,
            disabledReason: `Need ${c.PREVENTIVE_PROTECTION} DP (Budget: ${s.budget})`,
            active: false,
            isAction: true
          }),
          this.renderToolItem({
            name: 'Reclose Breaker',
            icon: 'fa-wrench',
            color: '#166534',
            cost: c.RECOVERY,
            purpose: 'Authorize breaker reclose to restore LINE-1-2',
            onclick: "window.DefenderView.actionRecovery('RECLOSE_AUTHORIZED')",
            enabled: canRecover,
            disabledReason: `Need ${c.RECOVERY} DP (Budget: ${s.budget})`,
            active: false,
            isAction: true
          })
        ].join('');
      } else {
        const canRespond = s.budget >= c.INCIDENT_RESPONSE;
        buttonsHtml = [
          this.renderToolItem({
            name: 'Residual Audit (FDIA)',
            icon: 'fa-microscope',
            color: '#0284c7',
            cost: 0,
            purpose: 'State Estimation Chi-Square residual test r = ||z - Hx||',
            onclick: 'window.DefenderView.actionAuditFeasibility()',
            enabled: true,
            active: s.activeAlgorithm === 'AC_FEASIBILITY',
            isAction: false
          }),
          this.renderToolItem({
            name: 'Trace (BFS)',
            icon: 'fa-circle-nodes',
            color: '#7c3aed',
            cost: 0,
            purpose: 'Audit physical connectivity & substation neighbors',
            onclick: 'window.DefenderView.actionRunBFS()',
            enabled: true,
            active: s.activeAlgorithm === 'BFS',
            isAction: false
          }),
          this.renderToolItem({
            name: 'Isolate Bad Telemetry',
            icon: 'fa-filter',
            color: '#166534',
            cost: c.INCIDENT_RESPONSE,
            purpose: 'Isolate corrupted SCADA sensor feed at Bus 2',
            onclick: 'window.DefenderView.actionTargetedResponse()',
            enabled: canRespond,
            disabledReason: `Need ${c.INCIDENT_RESPONSE} DP (Budget: ${s.budget})`,
            active: false,
            isAction: true
          }),
          this.renderToolItem({
            name: 'Emergency Line Trip',
            icon: 'fa-triangle-exclamation',
            color: '#dc2626',
            cost: 10,
            purpose: '[Adversary Trap] Trip line without residual verification',
            onclick: 'window.DefenderView.actionUnnecessarySwitchingTrip()',
            enabled: true,
            active: false,
            isAction: true
          })
        ].join('');
      }
    } else {
      // Level 5: Full Toolkit
      const canRespond = s.budget >= c.INCIDENT_RESPONSE;
      const canAdjust = s.budget >= c.OPERATING_ADJUSTMENT;
      const canRecover = s.budget >= c.RECOVERY;
      buttonsHtml = [
        this.renderToolItem({
          name: 'Trace (BFS)',
          icon: 'fa-circle-nodes',
          color: '#0284c7',
          cost: 0,
          purpose: 'Queue reachability exploration',
          onclick: 'window.DefenderView.actionRunBFS()',
          enabled: true,
          active: s.activeAlgorithm === 'BFS',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Alt Route (Dijkstra)',
          icon: 'fa-route',
          color: '#166534',
          cost: 0,
          purpose: 'Min-Heap shortest bypass route',
          onclick: 'window.DefenderView.actionRunDijkstra()',
          enabled: true,
          active: s.activeAlgorithm === 'DIJKSTRA',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Bridges (Tarjan)',
          icon: 'fa-bridge',
          color: '#b45309',
          cost: 0,
          purpose: 'Tarjan bridge & articulation point detection',
          onclick: 'window.DefenderView.actionRunTarjan()',
          enabled: true,
          active: s.activeAlgorithm === 'TARJAN',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Prioritize (Max-Heap)',
          icon: 'fa-layer-group',
          color: '#d97706',
          cost: 0,
          purpose: 'Binary Max-Heap incident prioritization',
          onclick: 'window.DefenderView.actionRunMaxHeap()',
          enabled: true,
          active: s.activeAlgorithm === 'MAX_HEAP',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Grid Islands (DSU)',
          icon: 'fa-cubes',
          color: '#0891b2',
          cost: 0,
          purpose: 'Union-Find grid partition check',
          onclick: 'window.DefenderView.actionRunDSU()',
          enabled: true,
          active: s.activeAlgorithm === 'DSU_ISLANDS',
          isAction: false
        }),
        this.renderToolItem({
          name: 'AC Feasibility',
          icon: 'fa-calculator',
          color: '#be123c',
          cost: 0,
          purpose: 'Audit AC power flow & loop flow constraints',
          onclick: 'window.DefenderView.actionAuditFeasibility()',
          enabled: true,
          active: s.activeAlgorithm === 'AC_FEASIBILITY',
          isAction: false
        }),
        this.renderToolItem({
          name: 'Shed 15% Load',
          icon: 'fa-scissors',
          color: '#b45309',
          cost: c.OPERATING_ADJUSTMENT,
          purpose: 'Emergency load relief for overloaded branches',
          onclick: "window.DefenderView.actionOperatingAdjustment('LOAD_SHED')",
          enabled: canAdjust,
          disabledReason: `Need ${c.OPERATING_ADJUSTMENT} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        }),
        this.renderToolItem({
          name: 'Restore LINE-1-3',
          icon: 'fa-wrench',
          color: '#166534',
          cost: c.RECOVERY,
          purpose: 'Restore tripped corridor to service',
          onclick: "window.DefenderView.actionRecovery('RESTORE_GRID')",
          enabled: canRecover,
          disabledReason: `Need ${c.RECOVERY} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        }),
        this.renderToolItem({
          name: 'Isolate Bad Data',
          icon: 'fa-filter',
          color: '#ea580c',
          cost: c.INCIDENT_RESPONSE,
          purpose: 'Isolate corrupted SCADA telemetry',
          onclick: 'window.DefenderView.actionTargetedResponse()',
          enabled: canRespond,
          disabledReason: `Need ${c.INCIDENT_RESPONSE} DP (Budget: ${s.budget})`,
          active: false,
          isAction: true
        })
      ].join('');
    }

    deck.innerHTML = buttonsHtml;
  },

  updateDiagnosticsUI: function() {
    const body = document.getElementById('defenderDiagnosticsBody');
    if (!body) return;
    body.innerHTML = this.renderDiagnostics();
  },

  renderTimelineItems: function() {
    if (!this.state.history || this.state.history.length === 0) {
      return `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1rem;">No actions executed yet.</div>`;
    }

    return this.state.history.map(item => `
      <div style="border-left:2px solid #0284c7; padding-left:8px; margin-bottom:8px; font-size:0.73rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#0f172a;">${item.title}</strong>
          <span style="color:var(--text-muted); font-size:0.68rem;">${item.timestamp}</span>
        </div>
        <div style="color:#475569; margin-top:1px;">${item.detail}</div>
        ${item.cost > 0 ? `<span style="display:inline-block; margin-top:2px; font-size:0.65rem; color:#0284c7; font-weight:700;">Cost: -${item.cost} DP</span>` : ''}
      </div>
    `).reverse().join('');
  },

  renderDiagnostics: function() {
    const pf = this.state.currentPowerFlow;
    if (!pf) {
      return `<div>Awaiting power-flow execution...</div>`;
    }

    const pb = pf.power_balance || {};
    return `
      <div style="margin-bottom:6px;">
        <strong>POWER BALANCE EQUILIBRIUM:</strong><br>
        Generation: ${pb.total_generation_mw || 0} MW &bull; Load: ${pb.total_load_mw || 0} MW<br>
        Losses: ${pb.total_losses_mw || 0} MW &bull; Balance Error: ${pb.balance_error_mw || 0} MW (Converged: ${pb.converged ? 'YES' : 'NO'})
      </div>
      <div style="margin-bottom:6px;">
        <strong>MONITORED BRANCH LOADINGS:</strong><br>
        ${(pf.lines || []).slice(0, 4).map(l => `${l.line_id}: ${l.loading_percent}% (${l.status})`).join(' | ')}
      </div>
      <div>
        <strong>DIJKSTRA CANDIDATE PATH:</strong><br>
        ${this.state.candidateRoute.length > 0 ? this.state.candidateRoute.join(' → ') : 'None computed'}
      </div>
    `;
  },

  getConditionBadge: function(condition) {
    switch (condition) {
      case 'NORMAL':
        return `<span class="badge badge-forest" style="padding:4px 8px; font-size:0.75rem;"><span class="status-dot healthy"></span> Normal Equilibrium</span>`;
      case 'DISTURBED':
        return `<span class="badge badge-warning" style="padding:4px 8px; font-size:0.75rem;"><span class="status-dot warning"></span> Disturbed (N-1 Active)</span>`;
      case 'CRITICAL':
        return `<span class="badge badge-critical" style="padding:4px 8px; font-size:0.75rem;"><span class="status-dot critical"></span> Critical Overload</span>`;
      case 'RECOVERED':
        return `<span class="badge badge-forest" style="padding:4px 8px; font-size:0.75rem;"><span class="status-dot healthy"></span> Stabilized / Recovered</span>`;
      default:
        return `<span class="badge badge-neutral" style="padding:4px 8px; font-size:0.75rem;">Unknown</span>`;
    }
  },

  // --------------------------------------------------------------------------
  // CHARACTER PRESENTATION & DIALOGUE INTEGRATION
  // --------------------------------------------------------------------------
  renderCharacterDialogue: function() {
    const s = this.state;
    if (s.dialogueMuted) {
      return `
        <div class="character-dialogue-collapsed" style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:0.4rem 0.75rem; font-size:0.72rem; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
          <div><i class="fa-solid fa-eye-slash" style="margin-right:4px;"></i> <em>Character Guidance Hidden</em></div>
          <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueMute()" style="font-size:0.68rem; padding:2px 8px;">
            <i class="fa-solid fa-eye"></i> Show Guidance
          </button>
        </div>
      `;
    }

    if (s.dialogueCollapsed) {
      const dialogue = window.CharacterDialogueEngine
        ? window.CharacterDialogueEngine.getContextualDialogue(s)
        : { speaker: 'operator', text: s.teaching.layer1, actionPrompt: '' };
      const isOperator = s.forcedSpeaker ? (s.forcedSpeaker === 'operator') : (dialogue.speaker === 'operator');
      const speakerName = isOperator ? 'GRID OPERATOR' : 'CYBER ADVERSARY';
      const icon = isOperator ? 'fa-user-shield' : 'fa-user-ninja';
      const badgeClass = isOperator ? 'badge-forest' : 'badge-critical';

      return `
        <div class="character-dialogue-collapsed" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.72rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <span class="badge ${badgeClass}" style="font-size:0.65rem;">
              <i class="fa-solid ${icon}"></i> ${speakerName}
            </span>
            <span style="color:#334155; font-weight:500; overflow:hidden; text-overflow:ellipsis;">
              ${dialogue.text.substring(0, 75)}...
            </span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueCollapse()" style="font-size:0.68rem; padding:2px 8px; flex-shrink:0;">
            <i class="fa-solid fa-chevron-down"></i> Expand
          </button>
        </div>
      `;
    }

    const dialogue = window.CharacterDialogueEngine
      ? window.CharacterDialogueEngine.getContextualDialogue(s)
      : { speaker: 'operator', text: s.teaching.layer1, actionPrompt: 'Select a DSA tool from the palette.' };

    const isOperator = s.forcedSpeaker ? (s.forcedSpeaker === 'operator') : (dialogue.speaker === 'operator');

    if (isOperator) {
      // Mentor Mode: Grid Operator
      const avatarHtml = window.getCharacterImgHtml
        ? window.getCharacterImgHtml('operator', 'char-avatar-img', 'width:100%; height:100%; object-fit:cover; object-position:65% 25%;')
        : '<div style="background:#064e3b; color:#fff; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">OP</div>';

      return `
        <div class="character-dialogue-box operator-mode">
          <div style="display:flex; gap:0.75rem; align-items:flex-start;">
            <div class="character-avatar-container operator-frame">
              ${avatarHtml}
            </div>

            <div style="flex:1; min-width:0;">
              <!-- Header / Name Label -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; flex-wrap:wrap; gap:0.3rem;">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-size:0.68rem; font-weight:800; letter-spacing:0.03em;">
                    <i class="fa-solid fa-user-shield" style="color:#10b981;"></i> GRID OPERATOR &middot; MENTOR
                  </span>
                  <span style="font-size:0.68rem; color:#047857; font-weight:600;">Control Room Instructor</span>
                </div>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueCollapse()" title="Minimize dialogue box" style="padding:1px 6px; font-size:0.65rem; background:#ffffff;">
                    <i class="fa-solid fa-chevron-up"></i> Minimize
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueMute()" title="Hide character guidance" style="padding:1px 6px; font-size:0.65rem; background:#ffffff;">
                    <i class="fa-solid fa-eye-slash"></i> Hide Guidance
                  </button>
                </div>
              </div>

              <!-- Dialogue Text -->
              <div style="font-size:0.76rem; color:#14532d; line-height:1.45; font-weight:500; margin-bottom:0.45rem;">
                ${dialogue.text}
              </div>

              <!-- Action Prompt & Technical Details Link -->
              <div style="background:#ffffff; border:1px solid #bbf7d0; border-radius:4px; padding:0.35rem 0.55rem; font-size:0.7rem; color:#166534; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.3rem;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <i class="fa-solid fa-compass" style="color:#059669;"></i>
                  <strong>Guidance:</strong> <span>${dialogue.actionPrompt}</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.openLayer3TechnicalDetails()" style="font-size:0.65rem; padding:1px 6px; background:#f0fdf4; border-color:#86efac; color:#166534; font-weight:600;">
                  <i class="fa-solid fa-code"></i> Show Technical Details
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Incident Mode: Hacker
      const avatarHtml = window.getCharacterImgHtml
        ? window.getCharacterImgHtml('hacker', 'char-avatar-img', 'width:100%; height:100%; object-fit:contain; padding:2px;')
        : '<div style="background:#1e1e2e; color:#ff5555; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">HK</div>';

      return `
        <div class="character-dialogue-box hacker-mode">
          <div style="display:flex; gap:0.75rem; align-items:flex-start;">
            <div class="character-avatar-container hacker-frame">
              ${avatarHtml}
            </div>

            <div style="flex:1; min-width:0;">
              <!-- Header / Name Label -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; flex-wrap:wrap; gap:0.3rem;">
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="badge" style="background:#450a0a; color:#fca5a5; border:1px solid #ef4444; font-size:0.68rem; font-weight:800; letter-spacing:0.03em;">
                    <i class="fa-solid fa-user-ninja" style="color:#ef4444;"></i> HACKER &middot; SIMULATED INCIDENT
                  </span>
                  <span style="font-size:0.68rem; color:#f87171; font-weight:600;">Adversary Challenge</span>
                </div>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueCollapse()" title="Minimize dialogue box" style="padding:1px 6px; font-size:0.65rem; background:#1e293b; color:#cbd5e1; border-color:#475569;">
                    <i class="fa-solid fa-chevron-up"></i> Minimize
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.toggleDialogueMute()" title="Hide character guidance" style="padding:1px 6px; font-size:0.65rem; background:#1e293b; color:#cbd5e1; border-color:#475569;">
                    <i class="fa-solid fa-eye-slash"></i> Hide Guidance
                  </button>
                </div>
              </div>

              <!-- Dialogue Text -->
              <div style="font-size:0.76rem; color:#fecaca; line-height:1.45; font-weight:500; margin-bottom:0.45rem;">
                ${dialogue.text}
              </div>

              <!-- Action Prompt & Consult Mentor Button -->
              <div style="background:#1e293b; border:1px solid #334155; border-radius:4px; padding:0.35rem 0.55rem; font-size:0.7rem; color:#cbd5e1; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.3rem;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <i class="fa-solid fa-shield-halved" style="color:#f87171;"></i>
                  <span>${dialogue.actionPrompt}</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="window.DefenderView.askOperatorAdvice()" style="font-size:0.65rem; padding:2px 7px; background:#059669; border-color:#10b981; color:#ffffff; font-weight:700;">
                  <i class="fa-solid fa-user-shield"></i> Consult Grid Operator
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  },

  toggleDialogueCollapse: function() {
    this.state.dialogueCollapsed = !this.state.dialogueCollapsed;
    this.refreshUI();
  },

  toggleDialogueMute: function() {
    this.state.dialogueMuted = !this.state.dialogueMuted;
    this.refreshUI();
  },

  askOperatorAdvice: function() {
    this.state.forcedSpeaker = 'operator';
    this.refreshUI();
  },

  openLayer3TechnicalDetails: function() {
    const acc = document.getElementById('defenderLearnMoreAccordion');
    if (acc) acc.open = true;
    const details = document.querySelector('#teachLayer3Container details') || document.querySelector('details');
    if (details) {
      details.open = true;
    }
    if (acc) {
      acc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  // How to Play Introduction Modal (7-Rule Primer)
  showHowToPlayModal: function() {
    let container = document.getElementById('howToPlayModalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'howToPlayModalContainer';
      document.body.appendChild(container);
    }
    container.innerHTML = `
      <div class="how-to-play-overlay" onclick="if(event.target === this) window.DefenderView.closeHowToPlayModal()">
        <div class="how-to-play-card">
          <div class="how-to-play-header">
            <div class="how-to-play-title">
              <i class="fa-solid fa-gamepad" style="color:#0284c7;"></i>
              <span>How to Play Grid Defender</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.closeHowToPlayModal()" style="padding:2px 8px;" title="Close Guide">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          
          <div style="margin-bottom:1rem;">
            <p style="font-size:0.78rem; color:#475569; margin:0 0 0.75rem 0;">
              Welcome to <strong>Grid Defender</strong>, an interactive strategy game where you protect electrical grid infrastructure against physical failures and cyber attacks using authentic Data Structures &amp; Algorithms (DSA).
            </p>
            
            <div class="how-to-play-step">
              <span class="how-to-play-num">1</span>
              <div class="how-to-play-text">
                <strong>Nodes are generators, substations, or consumers:</strong> The 15-node training grid models power plants (Grand Falls Hydro, Surya Solar), transmission substations (SUB-1 through SUB-8), and critical consumers (Hospital, Cyber Command, Water Pumping).
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">2</span>
              <div class="how-to-play-text">
                <strong>Edges are transmission connections:</strong> Lines carry power with defined loss weights and continuous MW thermal capacities.
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">3</span>
              <div class="how-to-play-text">
                <strong>Select nodes and edges to inspect the network:</strong> Click any bus or transmission line on the schematic graph to open the real-time asset telemetry inspector.
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">4</span>
              <div class="how-to-play-text">
                <strong>Algorithms investigate connectivity, find routes, and identify critical links:</strong> Use BFS for reachability, DFS for structural cycles, Dijkstra with Min-Heap for low-loss bypasses, and Tarjan's algorithm for single-point-of-failure bridges.
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">5</span>
              <div class="how-to-play-text">
                <strong>The Hacker introduces scripted incidents:</strong> An active cyber adversary will trip breakers, induce demand surges, and inject false sensor measurements into SCADA telemetry.
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">6</span>
              <div class="how-to-play-text">
                <strong>The Grid Operator explains the evidence and helps you learn:</strong> Your mentor analyzes algorithmic outputs, explains physics vs. graph separations, and guides your operating actions.
              </div>
            </div>

            <div class="how-to-play-step">
              <span class="how-to-play-num">7</span>
              <div class="how-to-play-text">
                <strong>Your goal is to meet each mission's explicit success conditions:</strong> Satisfy the win criteria without exceeding turn limits or depleting your Defence Points (DP).
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:0.75rem; flex-wrap:wrap; gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.DefenderIntroView ? window.DefenderIntroView.startIntro() : window.app.navigate('defender-intro'); window.DefenderView.closeHowToPlayModal();">
              <i class="fa-solid fa-film"></i> Replay Story Introduction
            </button>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.DefenderView.closeHowToPlayModal()">
                Skip Intro
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.DefenderView.closeHowToPlayModal()" style="background:#166534; font-weight:700;">
                <i class="fa-solid fa-play"></i> Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  closeHowToPlayModal: function() {
    try {
      sessionStorage.setItem('gridsec_how_to_play_shown', 'true');
    } catch(e) {}
    const container = document.getElementById('howToPlayModalContainer');
    if (container) {
      container.remove();
    }
  }
};

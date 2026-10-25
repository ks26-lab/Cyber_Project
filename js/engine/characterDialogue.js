/**
 * GRIDSEC — Character Dialogue & Narrative Engine
 * Manages the visual presentation, dialogue logic, and contextual reactions of:
 * 1. Grid Operator (Mentor / Defender)
 * 2. Hacker (Adversary / Antagonist)
 * 
 * Rules:
 * - DSA algorithms remain the core gameplay mechanism.
 * - Dialogue is dynamic and reflects actual simulation states and algorithm outcomes.
 * - No premature revelation of hidden adversary information.
 * - Multi-stage fallback for original user-uploaded character images.
 */

window.CHARACTER_ASSETS = {
  OPERATOR: {
    key: 'operator',
    name: 'GRID OPERATOR',
    role: 'Grid Control Mentor & Trainee Instructor',
    primarySrc: 'assets/images/grid_operator.png',
    fallbackApi: '/api/character-image/operator',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
    themeBorder: '#10b981',
    themeBg: '#f0fdf4',
    titleColor: '#065f46'
  },
  HACKER: {
    key: 'hacker',
    name: 'CYBER ADVERSARY',
    role: 'Simulated Adversary / Security Challenger',
    primarySrc: 'assets/images/hacker.png',
    fallbackApi: '/api/character-image/hacker',
    badgeColor: '#dc2626',
    badgeBg: '#fef2f2',
    themeBorder: '#ef4444',
    themeBg: '#0f172a',
    titleColor: '#f87171'
  }
};

/**
 * Robust HTML generator for character images with clean HTTP fallback
 */
window.getCharacterImgHtml = function(characterKey, imgClass = 'char-portrait-img', customStyle = '') {
  const isOp = characterKey === 'operator' || characterKey === 'mentor';
  const c = isOp ? window.CHARACTER_ASSETS.OPERATOR : window.CHARACTER_ASSETS.HACKER;
  const alt = isOp ? 'Grid Operator' : 'Hacker';

  return `
    <img src="${c.primarySrc}" 
         alt="${alt}" 
         class="${imgClass}" 
         style="${customStyle}" 
         onerror="if(this.dataset.triedApi !== 'true' && window.location.protocol.indexOf('http') !== -1){ this.dataset.triedApi = 'true'; this.src='${c.fallbackApi}'; } else { this.onerror=null; this.style.display='none'; if(this.parentElement){ this.parentElement.innerHTML='<div style=\\\'width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:${c.badgeColor}; font-size:1.4rem;\\\'><i class=\\\'fa-solid ${isOp ? 'fa-user-shield' : 'fa-user-ninja'}\\\'></i></div>'; } }" />
  `;
};

window.CharacterDialogueEngine = {
  state: {
    dialogueEnabled: true,
    lastSpeaker: 'operator' // 'operator' | 'hacker'
  },

  /**
   * Generates context-sensitive dialogue based on authentic game and algorithm state
   */
  getContextualDialogue: function(state) {
    const s = state || {};
    const lvl = s.activeLevel || 1;
    const algo = s.activeAlgorithm;
    const res = s.dsaResult;
    const cond = s.gridCondition || 'NORMAL';
    const subLvl4 = s.level4SubScenario || 'A';

    // 1. Level Completion (Highest Priority)
    if (s.levelCompleted) {
      if (lvl === 1) {
        return {
          speaker: 'operator',
          mood: 'celebratory',
          text: 'Outstanding work! You explored the network with BFS and DFS, inspected node degrees, and maintained service balance under demand surge.',
          actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 2."
        };
      } else if (lvl === 2) {
        return {
          speaker: 'operator',
          mood: 'celebratory',
          text: 'Excellent work! You discovered the alternative path with Dijkstra, verified its AC electrical feasibility, and safely resynchronized the line. The grid is back in balance.',
          actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 3."
        };
      } else if (lvl === 3) {
        return {
          speaker: 'operator',
          mood: 'celebratory',
          text: "Masterful control! You used Tarjan's algorithm to identify bridges, prioritized overloads with Max-Heap, shed non-critical load to relieve the bottleneck, and safely recovered the corridor without a blackout!",
          actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 4."
        };
      } else if (lvl === 4) {
        return {
          speaker: 'operator',
          mood: 'celebratory',
          text: subLvl4 === 'A'
            ? 'Substation cyber defense successful! You verified the breaker trip, identified the bypass route, and authorized an authenticated reclose.'
            : 'Brilliant cyber-physical diagnosis! You unmasked the False Data Injection with Chi-Square residual analysis and isolated the corrupted sensor without tripping physical lines!',
          actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 5."
        };
      } else {
        return {
          speaker: 'operator',
          mood: 'celebratory',
          text: 'National Grid Defender certification earned! You coordinated the complete DSA toolkit under strict resource limits, defeated cyber spoofing, and maintained synchronous 50.00 Hz stability!',
          actionPrompt: "Click 'View Level Review & Scorecard' to view your final mission score!"
        };
      }
    }

    // 2. Incident & Penalty State Reactions (Adversary Gloats)
    if (s.penaltiesApplied && s.penaltiesApplied['UNNECESSARY_SWITCHING']) {
      return {
        speaker: 'hacker',
        mood: 'gloating',
        text: "You fell for it! You opened a physical circuit breaker based on spoofed telemetry. You caused an avoidable blackout for 21.7 MW of load! That's a -75 point penalty.",
        actionPrompt: "Operator: 'Always verify telemetry residuals r = ||z - Hx|| against physical Kirchhoff laws before switching breakers.'"
      };
    }

    if (s.penaltiesApplied && s.penaltiesApplied['AVOIDABLE_CASCADE_OUTAGE']) {
      return {
        speaker: 'hacker',
        mood: 'gloating',
        text: 'CASCADING FAILURE! You forced power through an overloaded line (132.6%) without shedding load. Thermal protection tripped the line! Regional blackout triggered.',
        actionPrompt: "Operator: 'Conductor thermal limits cannot be ignored. Shed non-critical load to relieve bottlenecks before restoring lines.'"
      };
    }

    // 3. Physical Actions Confirmed (Operator Guidance)
    if (lvl === 1 && s.level1Exploration?.redispatched) {
      return {
        speaker: 'operator',
        mood: 'celebratory',
        text: 'Generation increased by +15 MW, balancing consumer demand. The grid operates in complete steady-state equilibrium.',
        actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 2."
      };
    }

    if (lvl === 2 && (s.reclosed || s.activeOutages?.length === 0)) {
      return {
        speaker: 'operator',
        mood: 'celebratory',
        text: 'Corridor LINE-1-2 safely resynchronized! AC power flow balance restored to nominal 0 MW balance error.',
        actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 3."
      };
    }

    if (lvl === 3 && s.loadShedDone && s.activeOutages?.length > 0) {
      return {
        speaker: 'operator',
        mood: 'supportive',
        text: 'Targeted 15% load shed at Bus 4 relieved the bottleneck: LINE-2-4 loading dropped from 94.2% to 78.4%. The corridor is now safe for line restoration.',
        actionPrompt: "Click 'Restore LINE-1-3' (10 DP) to restore the tripped corridor."
      };
    }

    if (lvl === 4 && subLvl4 === 'A' && s.gatewayHardened && s.activeOutages?.length > 0) {
      return {
        speaker: 'operator',
        mood: 'supportive',
        text: 'Substation SCADA gateway secured with cryptographic authentication (IEEE 1686). Rogue control commands are blocked. Safe to reclose!',
        actionPrompt: 'Authorize breaker reclose (10 DP) to restore LINE-1-2.'
      };
    }

    if (lvl === 4 && subLvl4 === 'B' && s.badDataIsolated) {
      return {
        speaker: 'operator',
        mood: 'celebratory',
        text: 'Compromised RTU telemetry discarded. State estimator returned to verified physical truth. Zero unnecessary switching penalties!',
        actionPrompt: "Click 'View Level Review & Scorecard' to advance to Level 5."
      };
    }

    // 4. Active Incidents Triggered (Hacker Narrative Challenge)
    if (lvl === 1 && (s.gridCondition === 'DISTURBED' || s.level1Exploration?.surgeDone)) {
      return {
        speaker: 'hacker',
        mood: 'challenging',
        text: 'Demand is rising. Can your grid maintain service without pushing a transmission corridor beyond its limit?',
        actionPrompt: "Operator: 'Manage the new demand and restore a feasible operating state.'"
      };
    }

    // 5. Specific Post-Algorithm Reactions
    if (algo === 'BFS' && res) {
      if (res.unreachableNodes && res.unreachableNodes.length > 0) {
        return {
          speaker: 'hacker',
          mood: 'challenging',
          text: `Notice that? Your BFS traversal stopped cold. ${res.unreachableNodes.join(', ')} are completely cut off from ${res.sourceId}. Can your algorithms find a way around?`,
          actionPrompt: "Operator: 'BFS proved disconnection using a FIFO queue. Let us investigate alternative paths using Dijkstra.'"
        };
      } else if (lvl === 1) {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: `BFS has explored the reachable network from ${res.sourceId || s.selectedSubstation || 'BUS-1'}. The highlighted nodes show which substations can be reached through the currently available transmission corridors.`,
          actionPrompt: 'Run DFS to examine the network structure.'
        };
      } else {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: `Good investigation. Breadth-First Search explored level-by-level using the FIFO queue and confirmed all ${res.visitedCount} nodes remain reachable from ${res.sourceId}. Remember: reachability does not automatically guarantee voltage or thermal stability.`,
          actionPrompt: 'Inspect line loading and voltage magnitudes before declaring the network secure.'
        };
      }
    }

    if (algo === 'DFS' && res) {
      if (lvl === 1) {
        return {
          speaker: 'operator',
          mood: 'analytical',
          text: 'DFS has finished exploring the selected component. Compare its traversal with BFS to see how queue-based and stack-based exploration differ.',
          actionPrompt: "Click 'Advance Surge' to simulate shifting consumer demand."
        };
      }
      return {
        speaker: 'operator',
        mood: 'analytical',
        text: `DFS explored deep into the transmission mesh, logging ${res.cycleCount} back-edges (mesh cycles). In power systems, cycles provide redundant paths so power can reroute if an intertie trips.`,
        actionPrompt: 'Cycles enable N-1 reliability, but also cause parallel loop flows.'
      };
    }

    if (algo === 'DIJKSTRA' && res) {
      if (res.success) {
        return {
          speaker: 'operator',
          mood: 'analytical',
          text: 'An alternative graph path was found that avoids the unavailable corridor. Dijkstra minimizes the configured edge cost, but the remaining lines may still become overloaded. Validate electrical feasibility before treating this as a safe operating route.',
          actionPrompt: "The adversary is watching. Kirchhoff's Laws govern AC power flow, not Dijkstra hop costs. Audit AC feasibility now."
        };
      } else {
        return {
          speaker: 'hacker',
          mood: 'mocking',
          text: "Dijkstra couldn't find a single valid route. Every parallel corridor is either tripped or out of service. What is your next move, defender?",
          actionPrompt: "Operator: 'Topological disconnection confirmed. We must restore an outaged intertie to re-establish connectivity.'"
        };
      }
    }

    if (algo === 'TARJAN' && res) {
      if (res.bridges && res.bridges.length > 0) {
        const bNames = res.bridges.map(b => b.lineId).join(', ');
        return {
          speaker: 'operator',
          mood: 'warning',
          text: `Tarjan's algorithm identified ${res.totalBridges} critical bridge(s): ${bNames} where low[v] > tin[u]. If any of these lines trip, the grid will partition into islands!`,
          actionPrompt: 'Bridges are single points of failure. Protect them or prepare load shedding in vulnerable zones.'
        };
      } else {
        return {
          speaker: 'operator',
          mood: 'informative',
          text: "Tarjan's algorithm found zero bridges. The network is 2-edge-connected—no single line outage will partition the grid into isolated islands.",
          actionPrompt: '2-edge connectivity provides topological redundancy.'
        };
      }
    }

    if (algo === 'MAX_HEAP' && res) {
      const topInc = res.prioritizedIncidents && res.prioritizedIncidents[0];
      return {
        speaker: 'operator',
        mood: 'instructive',
        text: `The Binary Max-Heap prioritized all active alerts in O(N log N) time. The highest-severity incident is ${topInc?.incident?.assetId} (Severity: ${topInc?.severityScore} pts) due to: "${topInc?.reason}". Address this first!`,
        actionPrompt: 'Prioritize interventions by maximum operational impact.'
      };
    }

    if (algo === 'DSU_ISLANDS' && res) {
      if (res.isPartitioned) {
        return {
          speaker: 'hacker',
          mood: 'challenging',
          text: `Look at your DSU partition: ${res.numIslands} separate islands! Do your isolated generation hubs have enough capacity to keep the lights on?`,
          actionPrompt: "Operator: 'Check generation vs demand in each island. Deficit islands risk frequency collapse!'"
        };
      } else {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: 'Disjoint Set Union confirmed all substations share a common root. The entire synchronous grid remains interconnected as a single component.',
          actionPrompt: 'One synchronous island maintains uniform 50.00 Hz frequency.'
        };
      }
    }

    if (algo === 'AC_FEASIBILITY' && s.routeFeasibility) {
      if (!s.routeFeasibility.feasible) {
        return {
          speaker: 'operator',
          mood: 'urgent',
          text: 'HALT! AC Power-Flow validator REJECTED the route! LINE-2-4 is projected to reach 132.6% thermal capacity. If you force power through without load shedding, thermal overcurrent relays will trip!',
          actionPrompt: 'Execute a 15% non-critical load shed (Operating Adjustment) to relieve LINE-2-4 before reclosing.'
        };
      } else if (s.routeFeasibility.status?.includes('FDIA')) {
        return {
          speaker: 'operator',
          mood: 'detective',
          text: 'EUREKA! The State Estimator Chi-Square residual test J(x) = 88.4 >> 5.99 exposed the false data injection! Physical load at Bus 2 is 21.7 MW (nominal), but the sensor is spoofed to report 450 MW. Do NOT trip the physical line!',
          actionPrompt: 'Apply Targeted Incident Response to isolate the compromised telemetry stream.'
        };
      } else {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: 'AC Power-Flow validator confirmed all loop flows and voltages remain within operating bounds (max loading 84%). Safe to reclose the corridor breaker!',
          actionPrompt: 'Authorize circuit breaker reclose to restore line to service.'
        };
      }
    }

    // 6. Level State Progression & Initial Scenarios
    if (lvl === 1) {
      if (s.level1Exploration?.bfsDone && !s.level1Exploration?.dfsDone) {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: `BFS has explored the reachable network from ${s.selectedSubstation || 'BUS-1'}. The highlighted nodes show which substations can be reached through the currently available transmission corridors.`,
          actionPrompt: 'Run DFS to examine the network structure.'
        };
      }
      if (s.level1Exploration?.dfsDone) {
        return {
          speaker: 'operator',
          mood: 'analytical',
          text: 'DFS has finished exploring the selected component. Compare its traversal with BFS to see how queue-based and stack-based exploration differ.',
          actionPrompt: "Click 'Advance Surge' to test grid equilibrium under consumer demand surge."
        };
      }
      return {
        speaker: 'operator',
        mood: 'welcome',
        text: 'Welcome to the control room. Before the next demand surge arrives, explore the network and learn which substations remain connected.',
        actionPrompt: 'Trace the network from BUS-1 using BFS, then inspect its structure with DFS.'
      };
    }

    if (lvl === 2) {
      if (s.routeFeasibility && s.routeFeasibility.feasible) {
        return {
          speaker: 'operator',
          mood: 'supportive',
          text: 'AC feasibility confirmed: parallel corridors remain within safe voltage and thermal limits. You may now authorize the breaker reclose.',
          actionPrompt: 'Authorize breaker reclose (10 DP) to restore LINE-1-2.'
        };
      }
      if (s.dsaResult && s.dsaResult.path) {
        return {
          speaker: 'operator',
          mood: 'analytical',
          text: 'An alternative graph path was found that avoids the unavailable corridor. Dijkstra minimizes the configured edge cost, but the remaining lines may still become overloaded. Validate electrical feasibility before treating this as a safe operating route.',
          actionPrompt: "Click 'AC Feasibility' to audit AC power flow and loop flow ampacity."
        };
      }
      return {
        speaker: 'hacker',
        mood: 'challenging',
        text: 'One transmission corridor has gone offline. Your usual route may no longer be available.',
        actionPrompt: "Operator: 'First check connectivity. Then search for an alternative route and verify whether the electrical network can operate safely.'"
      };
    }

    if (lvl === 3) {
      return {
        speaker: 'hacker',
        mood: 'challenging',
        text: "The network is heavily loaded, and I've just knocked out LINE-1-3! Parallel branch LINE-2-4 is already running at 94.2% thermal limit. One wrong reroute and the entire region cascades into a blackout!",
        actionPrompt: "Operator: 'Do not attempt an unverified reroute across LINE-2-4! Run Tarjan to find bridges and Max-Heap to prioritize incidents.'"
      };
    }

    if (lvl === 4) {
      if (subLvl4 === 'A') {
        return {
          speaker: 'hacker',
          mood: 'challenging',
          text: 'I bypassed the substation gateway and issued an unauthorized breaker trip on LINE-1-2. The line is physically de-energized. Can you authenticate and restore it?',
          actionPrompt: "Operator: 'Audit gateway status (0 DP), verify bypass path with Dijkstra (0 DP), and authorize reclose (10 DP).'"
        };
      } else {
        return {
          speaker: 'hacker',
          mood: 'mischievous',
          text: 'The measurements are telling a different story from the underlying system.',
          actionPrompt: "Operator: 'Compare the reported measurements with the available reference or residual analysis before taking a physical action.'"
        };
      }
    }

    if (lvl === 5) {
      return {
        speaker: 'hacker',
        mood: 'challenging',
        text: "Welcome to the main event: a coordinated multi-threat crisis! Corridor LINE-1-3 is down, Bus 4 demand is surging, and Bus 2 telemetry is corrupted. You have 100 Defence Points. Can you keep the nation's lights on?",
        actionPrompt: "Operator: 'All DSA analysis tools cost 0 DP. Use Tarjan, Max-Heap, DSU, and Dijkstra to diagnose before spending DP on physical actions!'"
      };
    }

    // Default neutral fallback
    return {
      speaker: 'operator',
      mood: 'steady',
      text: 'The transmission network connects generators, substations, and loads across synchronous corridors. Select a DSA tool from the palette to investigate grid state.',
      actionPrompt: 'Investigate before taking irreversible operating actions.'
    };
  }
};


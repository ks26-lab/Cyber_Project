/**
 * GRIDSEC Grid Defender — Story Engine
 * Complete narrative system: characters, chapters, scripted dialogue, and endings.
 *
 * Characters:
 *   Asha Rao (Operator / Mentor) — Senior grid ops engineer, 20 years in the control room.
 *   NullCurrent (Hacker / Adversary) — Unseen actor, communicates through operator screens.
 *   Shift Supervisor — Time pressure and field reports.
 *   Hospital / Water Plant duty officers — Appear in debriefs.
 *
 * Chapters (mapped 1-to-1 to DefenderView levels):
 *   Prologue  "Quiet Night"          → Level 1  (BFS, DFS)
 *   Chapter 1 "Line Down"            → Level 2  (Dijkstra, Feasibility)
 *   Chapter 2 "The Weak Point"       → Level 3  (Tarjan, Max-Heap, DSU)
 *   Chapter 3 "Unauthorized Trip"    → Level 4A (Investigation, Restoration)
 *   Chapter 4 "Lying Numbers"        → Level 4B (FDIA Detection)
 *   Chapter 5 "National Resilience"  → Level 5  (Multi-threat)
 *   Epilogue  "Debrief"              → Post-game review
 *
 * Dialogue rules:
 *   - Hacker speaks only after a scripted game event is confirmed.
 *   - Operator explains the confirmed result, offers one hint if stuck.
 *   - No line reveals the solution before the player tries.
 *   - Each turn ≤ 5-second read time.
 *   - Skip always works; full text stays in the event log.
 */

window.StoryEngine = {

  // ──────────────────────────────────────────────────────────────────────────
  // CHARACTER SHEETS
  // ──────────────────────────────────────────────────────────────────────────
  characters: {
    operator: {
      name: 'Asha Rao',
      alias: 'GRID OPERATOR',
      role: 'Senior Grid Operations Engineer — Control Room Instructor',
      years: 20,
      belief: 'The graph can tell you where the path is. Only the physics can tell you whether it is safe.',
      tone: 'Calm, precise, instructive. Praises good reasoning, corrects mistakes without blame.',
      portrait: 'operator',
      accentColor: '#2dd4bf',
      badgeClass: 'story-badge-operator'
    },
    hacker: {
      name: 'Unknown',
      alias: 'NullCurrent',
      role: 'Unseen Adversary — Communicates through operator screens',
      motive: 'Partly unclear. Tests whether the team will act on bad information.',
      tone: 'Confident, taunting, never graphic. Never gives real attack instructions.',
      portrait: 'hacker',
      accentColor: '#f87171',
      badgeClass: 'story-badge-hacker'
    },
    supervisor: {
      name: 'Shift Supervisor',
      alias: 'SUPERVISOR',
      role: 'Field reports and time pressure',
      portrait: 'supervisor',
      accentColor: '#fbbf24',
      badgeClass: 'story-badge-supervisor'
    },
    hospital: {
      name: 'Hospital Duty Officer',
      alias: 'HOSPITAL',
      role: 'Debrief — human cost of success or failure',
      portrait: 'hospital',
      accentColor: '#f472b6',
      badgeClass: 'story-badge-hospital'
    },
    water: {
      name: 'Water Plant Officer',
      alias: 'WATER PLANT',
      role: 'Debrief — human cost of success or failure',
      portrait: 'water',
      accentColor: '#38bdf8',
      badgeClass: 'story-badge-water'
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CHAPTERS
  // ──────────────────────────────────────────────────────────────────────────
  chapters: {
    1: {
      id: 'prologue',
      title: 'Quiet Night',
      subtitle: 'Prologue',
      level: 1,
      hook: 'The numbers look normal, which is what worries me.',
      setting: 'The control room at night. The operator notices a demand surge that the forecast did not predict.',
      learningFocus: 'BFS and DFS — graph traversal and structural exploration.',
      playerGoal: 'Learn the grid and understand how everything connects.'
    },
    2: {
      id: 'chapter1',
      title: 'Line Down',
      subtitle: 'Chapter 1',
      level: 2,
      hook: 'One line down. Let\'s see how fast you find another way.',
      setting: 'A transmission corridor fails. The shift supervisor reports a physical outage, but the cause is not yet clear.',
      learningFocus: 'Dijkstra shortest path and AC feasibility checks.',
      playerGoal: 'Find an alternate route that keeps power flowing.'
    },
    3: {
      id: 'chapter2',
      title: 'The Weak Point',
      subtitle: 'Chapter 2',
      level: 3,
      hook: 'You have one bridge you can\'t afford to lose. Find it before I do.',
      setting: 'The operator notices that one corridor, if it fails, would isolate a critical area. The hacker reveals they know this too.',
      learningFocus: 'Tarjan\'s bridge algorithm and priority-based decisions.',
      playerGoal: 'Identify single points of failure and prevent a cascade.'
    },
    4: {
      id: 'chapter3',
      title: 'Unauthorized Trip',
      subtitle: 'Chapter 3',
      level: 4,
      subScenario: 'A',
      hook: 'I didn\'t need your permission to open that breaker. Can you prove why it opened?',
      setting: 'A breaker trips on its own, with no record of a control command from the team. The hacker claims responsibility.',
      learningFocus: 'Investigation and safe restoration under cyber intrusion.',
      playerGoal: 'Investigate the physical outage, then restore service safely.'
    },
    5: {
      id: 'chapter4',
      title: 'Lying Numbers',
      subtitle: 'Chapter 4',
      level: 4,
      subScenario: 'B',
      hook: 'Everything on your screen is telling you the truth. Or is it?',
      setting: 'Sensor readings show a healthy line as overloaded. Tripping it would cut the hospital\'s secondary feed. The hacker is quiet.',
      learningFocus: 'False data injection detection via residual analysis.',
      playerGoal: 'Find which telemetry is false before taking any action.'
    },
    6: {
      id: 'chapter5',
      title: 'National Resilience',
      subtitle: 'Chapter 5',
      level: 5,
      hook: 'You\'ve learned to see the grid. Now let\'s see whether you can hold it.',
      setting: 'Multiple threats arrive at once. The team must protect the hospital, defence facility, city centre, and water plant under time pressure.',
      learningFocus: 'Multi-threat response combining every algorithm.',
      playerGoal: 'Combine every skill learned so far under pressure.'
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SCRIPTED DIALOGUE — Keyed by [chapterId][trigger]
  // Each trigger maps to an array of lines. The engine picks the first
  // unshown line, so repeated triggers cycle through the array.
  //
  // Triggers:
  //   LEVEL_START, BFS_DONE, DFS_DONE, DIJKSTRA_DONE, DIJKSTRA_FAIL,
  //   TARJAN_DONE, MAX_HEAP_DONE, DSU_DONE, FEASIBILITY_PASS, FEASIBILITY_FAIL,
  //   FDIA_DETECTED, DEMAND_SURGE, LOAD_SHED, REDISPATCH, GATEWAY_HARDENED,
  //   BREAKER_RECLOSE, TELEMETRY_ISOLATED, UNNECESSARY_TRIP,
  //   LEVEL_COMPLETE, LEVEL_FAIL
  // ──────────────────────────────────────────────────────────────────────────
  dialogue: {

    // ═══════════════════════════════════════════════════════════════════════
    // PROLOGUE — "Quiet Night" (Level 1: BFS & DFS)
    // ═══════════════════════════════════════════════════════════════════════
    prologue: {
      LEVEL_START: [
        {
          speaker: 'operator',
          text: 'Welcome to the night shift. I\'m Asha Rao — twenty years in this control room. Before anything else, learn this grid. Know every path, every connection.',
          actionPrompt: 'Trace the network from BUS-1 using BFS.',
          mood: 'calm'
        },
        {
          speaker: 'operator',
          text: 'The numbers look normal, which is what worries me. A quiet board is not always a safe board. Let\'s confirm connectivity.',
          actionPrompt: 'Run BFS to explore reachable substations.',
          mood: 'watchful'
        }
      ],

      BFS_DONE: [
        {
          speaker: 'operator',
          text: 'Good. BFS explored the network level by level — each ring outward is one hop through the transmission mesh. Every substation is reachable from the source.',
          actionPrompt: 'Now run DFS to inspect the structural depth of the network.',
          mood: 'supportive'
        }
      ],

      DFS_DONE: [
        {
          speaker: 'operator',
          text: 'DFS went deep before backtracking. Compare: BFS used a queue and found breadth. DFS used a stack and found depth. Both confirmed connectivity, but they revealed different things.',
          actionPrompt: 'Click "Advance Surge" to simulate rising demand.',
          mood: 'instructive'
        }
      ],

      DEMAND_SURGE: [
        {
          speaker: 'supervisor',
          text: 'Control room, we have an unforecasted demand surge — plus fifteen megawatts at Bus 2. That wasn\'t in the load prediction.',
          actionPrompt: 'Operator: "Manage the imbalance. Redispatch generation to match demand."',
          mood: 'urgent'
        }
      ],

      REDISPATCH: [
        {
          speaker: 'operator',
          text: 'Generation redispatched. Supply meets demand, losses accounted for. The grid is back in equilibrium. Well done — that was your first real operating decision.',
          actionPrompt: 'Click "View Level Review" to advance.',
          mood: 'satisfied'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'You explored with BFS, inspected with DFS, and balanced supply under a demand surge. The basics are solid. But tonight isn\'t over.',
          actionPrompt: 'Advance to Chapter 1.',
          mood: 'calm'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'The demand surge overwhelmed the grid because generation wasn\'t adjusted in time. Review BFS to understand connectivity, then act on what you find.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CHAPTER 1 — "Line Down" (Level 2: Dijkstra & Feasibility)
    // ═══════════════════════════════════════════════════════════════════════
    chapter1: {
      LEVEL_START: [
        {
          speaker: 'supervisor',
          text: 'We\'ve lost LINE-1-2. Physical relay trip confirmed. Field crew dispatched, but it\'s going to be hours before they reach the tower.',
          actionPrompt: 'Operator: "Check connectivity first. Then find an alternate route."',
          mood: 'urgent'
        },
        {
          speaker: 'hacker',
          text: 'One line down. Let\'s see how fast you find another way.',
          actionPrompt: 'Operator: "Ignore the taunt. Focus on the evidence. Run BFS."',
          mood: 'taunting'
        }
      ],

      BFS_DONE: [
        {
          speaker: 'operator',
          text: 'BFS confirms all buses remain reachable despite the outage. The mesh provides redundant paths. But reachability is not the same as safety — we need to check the route.',
          actionPrompt: 'Run Dijkstra to find the lowest-cost bypass.',
          mood: 'analytical'
        }
      ],

      DIJKSTRA_DONE: [
        {
          speaker: 'operator',
          text: 'Dijkstra found an alternative path using the Min-Heap to extract the lowest-cost corridor at each step. But the graph cost is not the same as electrical feasibility.',
          actionPrompt: 'Run AC Feasibility to check whether the bypass can handle the load.',
          mood: 'cautious'
        }
      ],

      DIJKSTRA_FAIL: [
        {
          speaker: 'hacker',
          text: 'No route found. Every corridor from your source is either tripped or overloaded. Your algorithms can\'t help you now.',
          actionPrompt: 'Operator: "Topological disconnection confirmed. We must restore the original line."',
          mood: 'mocking'
        }
      ],

      FEASIBILITY_PASS: [
        {
          speaker: 'operator',
          text: 'AC feasibility confirmed — voltage magnitudes within bounds, line loadings below thermal limits. The bypass is electrically safe. You can reclose.',
          actionPrompt: 'Authorize breaker reclose to restore LINE-1-2.',
          mood: 'confident'
        }
      ],

      FEASIBILITY_FAIL: [
        {
          speaker: 'operator',
          text: 'Stop. The AC validator rejected this route — LINE-2-4 would reach 132% thermal capacity. Forcing power through will trigger a protection relay trip.',
          actionPrompt: 'Shed load first, then recheck feasibility.',
          mood: 'urgent'
        }
      ],

      BREAKER_RECLOSE: [
        {
          speaker: 'operator',
          text: 'Breaker reclosed and synchronized. The corridor is back in service. Power flow is nominal. The hacker tested our response time. We passed.',
          actionPrompt: 'View the scorecard.',
          mood: 'relieved'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'Dijkstra found the path. The physics confirmed it was safe. That distinction matters — the graph tells you where, the physics tells you whether. Remember that.',
          actionPrompt: 'Advance to Chapter 2.',
          mood: 'instructive'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'The corridor was not restored in time. Review the Dijkstra result — a shorter path existed but wasn\'t verified for electrical feasibility. Both steps are needed.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CHAPTER 2 — "The Weak Point" (Level 3: Tarjan, Max-Heap, DSU)
    // ═══════════════════════════════════════════════════════════════════════
    chapter2: {
      LEVEL_START: [
        {
          speaker: 'operator',
          text: 'LINE-1-3 just tripped. And LINE-2-4 is already running at 94% of its thermal rating. One more wrong move and the entire downstream region cascades.',
          actionPrompt: 'Do not reroute blindly. Identify bridges first.',
          mood: 'tense'
        },
        {
          speaker: 'hacker',
          text: 'You have one bridge you can\'t afford to lose. Find it before I do.',
          actionPrompt: 'Operator: "Run Tarjan\'s algorithm. Find every single point of failure."',
          mood: 'threatening'
        }
      ],

      TARJAN_DONE: [
        {
          speaker: 'operator',
          text: 'Tarjan\'s algorithm identified the critical bridges — lines where low[v] > tin[u]. Losing any one of these partitions the grid into islands. Protect them.',
          actionPrompt: 'Run Max-Heap to rank the most severe threats.',
          mood: 'analytical'
        }
      ],

      MAX_HEAP_DONE: [
        {
          speaker: 'operator',
          text: 'The Max-Heap ranked all active incidents by severity. The highest-priority threat is the thermal overload on LINE-2-4. Address it first — everything else follows.',
          actionPrompt: 'Execute load shedding to relieve the bottleneck.',
          mood: 'decisive'
        }
      ],

      DSU_DONE: [
        {
          speaker: 'operator',
          text: 'DSU confirmed the grid\'s connectivity. All substations share one root — no islands yet. But if LINE-2-4 trips, that changes instantly.',
          actionPrompt: 'Shed load to prevent the cascade.',
          mood: 'warning'
        }
      ],

      LOAD_SHED: [
        {
          speaker: 'operator',
          text: 'Load shed executed — 15% at Bus 4. LINE-2-4 loading dropped from 94% to 78%. The bottleneck is relieved. Now it\'s safe to restore the tripped corridor.',
          actionPrompt: 'Restore LINE-1-3.',
          mood: 'relieved'
        }
      ],

      BREAKER_RECLOSE: [
        {
          speaker: 'operator',
          text: 'LINE-1-3 restored. Power flow is redistributed and the cascade was prevented. Good discipline — you diagnosed before you acted.',
          actionPrompt: 'View the scorecard.',
          mood: 'satisfied'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'Tarjan found the vulnerability. The Max-Heap told you what to fix first. And you didn\'t force power through an overloaded line. That saved the region.',
          actionPrompt: 'Advance to Chapter 3.',
          mood: 'proud'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'The cascade was not prevented. LINE-2-4 exceeded its thermal limit and protection relays disconnected it. Review Tarjan to find bridges, then shed load before restoring.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CHAPTER 3 — "Unauthorized Trip" (Level 4A: Cyber Investigation)
    // ═══════════════════════════════════════════════════════════════════════
    chapter3: {
      LEVEL_START: [
        {
          speaker: 'supervisor',
          text: 'Control room — LINE-1-2 breaker just opened. No one here issued a trip command. I\'m checking the relay log now.',
          actionPrompt: 'Operator: "This was not a scheduled operation. Investigate."',
          mood: 'alarmed'
        },
        {
          speaker: 'hacker',
          text: 'I didn\'t need your permission to open that breaker. Can you prove why it opened?',
          actionPrompt: 'Operator: "The message confirms unauthorized access. Audit the gateway before reclosing."',
          mood: 'confident'
        }
      ],

      BFS_DONE: [
        {
          speaker: 'operator',
          text: 'BFS shows the network topology under the forced outage. Substations downstream of LINE-1-2 are still reachable through the mesh, but the path is longer.',
          actionPrompt: 'Run Dijkstra to find the lowest-cost bypass.',
          mood: 'steady'
        }
      ],

      DIJKSTRA_DONE: [
        {
          speaker: 'operator',
          text: 'Dijkstra found a bypass, but do not reclose yet. The adversary opened that breaker remotely. If the gateway isn\'t secured, they will trip it again the moment you restore it.',
          actionPrompt: 'Harden the SCADA gateway first.',
          mood: 'cautious'
        }
      ],

      FEASIBILITY_PASS: [
        {
          speaker: 'operator',
          text: 'AC feasibility confirms the bypass is electrically safe. But the security question remains — harden the gateway before you authorize the reclose.',
          actionPrompt: 'Apply preventive protection to the gateway.',
          mood: 'firm'
        }
      ],

      GATEWAY_HARDENED: [
        {
          speaker: 'operator',
          text: 'Gateway hardened — cryptographic authentication applied. Unauthorized GOOSE and MMS commands are now blocked. The adversary has lost remote control of this breaker.',
          actionPrompt: 'It is now safe to authorize the reclose.',
          mood: 'satisfied'
        }
      ],

      BREAKER_RECLOSE: [
        {
          speaker: 'operator',
          text: 'Breaker reclosed under authenticated control. The corridor is restored and the gateway is secured. The adversary cannot repeat this attack on this breaker.',
          actionPrompt: 'View the scorecard.',
          mood: 'relieved'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'You investigated before restoring, and you secured the gateway before reclosing. That is the discipline this work demands. The adversary learned something too — we don\'t act on blind faith.',
          actionPrompt: 'Advance to Chapter 4.',
          mood: 'proud'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'The breaker was reclosed without hardening the gateway. The adversary tripped it again immediately. Security must be established before restoration.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CHAPTER 4 — "Lying Numbers" (Level 4B: FDIA Detection)
    // ═══════════════════════════════════════════════════════════════════════
    chapter4: {
      LEVEL_START: [
        {
          speaker: 'operator',
          text: 'Something is off. Bus 2 telemetry reports 450 MW of demand, but the physical load has never exceeded 25 MW. The screen says overload. The field says normal.',
          actionPrompt: 'Do not touch any breaker until you know which reading is real.',
          mood: 'tense'
        },
        {
          speaker: 'operator',
          text: 'The hacker is quiet this time. That worries me more than their taunts. When they want you to act, they stay silent and let bad data do their work.',
          actionPrompt: 'Run the residual audit to check the state estimator.',
          mood: 'watchful'
        }
      ],

      BFS_DONE: [
        {
          speaker: 'operator',
          text: 'BFS confirms the physical topology is intact — no line is actually tripped. The connectivity is fine. So why does the sensor say 450 MW?',
          actionPrompt: 'Run the FDIA residual test.',
          mood: 'suspicious'
        }
      ],

      FDIA_DETECTED: [
        {
          speaker: 'operator',
          text: 'There it is. Chi-Square residual J(x) = 88.4, far above the 5.99 threshold. The sensor at Bus 2 is lying. Physical load is 21.7 MW. The 450 MW reading is injected.',
          actionPrompt: 'Isolate the corrupted telemetry. Do NOT trip any physical line.',
          mood: 'decisive'
        }
      ],

      TELEMETRY_ISOLATED: [
        {
          speaker: 'operator',
          text: 'Compromised sensor stream isolated. The state estimator is back to physical truth. Zero unnecessary outages. That is how you beat a false data injection — with evidence, not speed.',
          actionPrompt: 'View the scorecard.',
          mood: 'satisfied'
        }
      ],

      UNNECESSARY_TRIP: [
        {
          speaker: 'hacker',
          text: 'And there it is. You tripped a perfectly healthy line because a number on a screen told you to. I didn\'t need to touch a single breaker. You did my work for me.',
          actionPrompt: 'Operator: "This is the lesson. Never switch on telemetry alone. Always verify the residual."',
          mood: 'gloating'
        },
        {
          speaker: 'operator',
          text: 'That was an avoidable outage. The hospital\'s secondary feed is offline because we acted on false data. The lesson is clear: evidence first, action second. Always.',
          actionPrompt: 'Review the penalty and retry.',
          mood: 'grave'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'You saw through the lie. The numbers said overload. The physics said normal. You trusted the physics. That is the hardest skill in this room.',
          actionPrompt: 'Advance to the final chapter.',
          mood: 'proud'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'A healthy line was tripped on false data. The adversary succeeded without touching any equipment. Review the Chi-Square residual test — it exposes injected measurements.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CHAPTER 5 — "National Resilience" (Level 5: Multi-Threat)
    // ═══════════════════════════════════════════════════════════════════════
    chapter5: {
      LEVEL_START: [
        {
          speaker: 'hacker',
          text: 'You\'ve learned to see the grid. Now let\'s see whether you can hold it. LINE-1-3 is down. Bus 4 demand is surging. And your Bus 2 telemetry? I wouldn\'t trust it.',
          actionPrompt: 'Operator: "Multiple threats. Diagnose with algorithms first — they cost zero DP."',
          mood: 'aggressive'
        },
        {
          speaker: 'operator',
          text: 'This is the real test. Three simultaneous threats. Use every tool you\'ve learned. Tarjan for bridges. Max-Heap for priorities. Dijkstra for routes. Residual analysis for bad data. Diagnose before you spend.',
          actionPrompt: 'Start with Tarjan to find your vulnerabilities.',
          mood: 'steady'
        }
      ],

      TARJAN_DONE: [
        {
          speaker: 'operator',
          text: 'Bridges identified. You now know which lines, if lost, will split the grid. Protect them — and avoid tripping any of them on false data.',
          actionPrompt: 'Run Max-Heap to prioritize the incidents.',
          mood: 'analytical'
        }
      ],

      MAX_HEAP_DONE: [
        {
          speaker: 'operator',
          text: 'Incidents ranked. The highest-severity threat goes first. Work down the list systematically — panic causes cascades, discipline prevents them.',
          actionPrompt: 'Address the top-priority incident.',
          mood: 'instructive'
        }
      ],

      DSU_DONE: [
        {
          speaker: 'operator',
          text: 'DSU confirmed current connectivity status. Monitor this — if another line trips, the grid may partition into islands with unbalanced generation.',
          actionPrompt: 'Check for false data before taking physical action.',
          mood: 'watchful'
        }
      ],

      BFS_DONE: [
        {
          speaker: 'operator',
          text: 'Reachability confirmed under current topology. Keep this baseline in mind as you work through the incidents.',
          actionPrompt: 'Continue diagnosing with available algorithms.',
          mood: 'steady'
        }
      ],

      DIJKSTRA_DONE: [
        {
          speaker: 'operator',
          text: 'Alternative route found. But remember the lesson from Chapter 1 — graph cost is not electrical safety. Verify feasibility before committing.',
          actionPrompt: 'Check AC feasibility on the proposed route.',
          mood: 'cautious'
        }
      ],

      FDIA_DETECTED: [
        {
          speaker: 'operator',
          text: 'Residual test exposed corrupted telemetry at Bus 2 again. The adversary recycled their false data attack. Isolate the bad sensor — do not trip any line.',
          actionPrompt: 'Isolate bad data, then address the physical outage.',
          mood: 'decisive'
        }
      ],

      TELEMETRY_ISOLATED: [
        {
          speaker: 'operator',
          text: 'Corrupted sensor isolated. True physical state restored. One threat neutralized. Now address the line outage and the demand surge.',
          actionPrompt: 'Shed load if needed, then restore the tripped corridor.',
          mood: 'focused'
        }
      ],

      LOAD_SHED: [
        {
          speaker: 'operator',
          text: 'Load shed relieved the thermal stress. The overloaded corridor is back within safe limits. You can now restore the tripped line safely.',
          actionPrompt: 'Restore the tripped corridor.',
          mood: 'relieved'
        }
      ],

      BREAKER_RECLOSE: [
        {
          speaker: 'operator',
          text: 'Corridor restored. Power flow is nominal. The grid held. Every hospital bed, every water pump, every defence system — still powered.',
          actionPrompt: 'View the final scorecard.',
          mood: 'proud'
        }
      ],

      UNNECESSARY_TRIP: [
        {
          speaker: 'hacker',
          text: 'Even in the final test, you tripped a healthy line. I expected better after everything you\'ve learned.',
          actionPrompt: 'Operator: "The residual test was available. Use it."',
          mood: 'disappointed'
        }
      ],

      LEVEL_COMPLETE: [
        {
          speaker: 'operator',
          text: 'Multiple threats. Limited resources. Time pressure. And you held the grid together through all of it. This is what resilience looks like.',
          actionPrompt: 'Proceed to the debrief.',
          mood: 'proud'
        }
      ],

      LEVEL_FAIL: [
        {
          speaker: 'operator',
          text: 'The grid was not held. Review which threat you addressed first — the Max-Heap priority ordering matters. And always verify data before switching.',
          actionPrompt: 'Retry this level.',
          mood: 'firm'
        }
      ]
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ENDINGS
  // ──────────────────────────────────────────────────────────────────────────
  endings: {
    CLEAN_WIN: {
      title: 'Clean Win',
      grade: 'S',
      hackerMessage: {
        speaker: 'hacker',
        text: 'I tested every vector I had. You verified before you acted, every single time. I have nothing left to teach you. But I\'ll be watching.',
        mood: 'respectful'
      },
      operatorMessage: {
        speaker: 'operator',
        text: 'No unnecessary outages. No cascades. Every algorithm used for its purpose. The hospital stayed powered. The water plant kept running. This is the standard.',
        mood: 'proud'
      },
      hospitalMessage: {
        speaker: 'hospital',
        text: 'ICU power was maintained throughout the night. No backup generator activations. On behalf of the patients and staff — thank you.',
        mood: 'grateful'
      },
      waterMessage: {
        speaker: 'water',
        text: 'Water treatment and pumping stations operated continuously. Supply to the city was uninterrupted.',
        mood: 'grateful'
      }
    },

    HARD_WON: {
      title: 'Hard-Won Win',
      grade: 'A',
      hackerMessage: {
        speaker: 'hacker',
        text: 'You stumbled, but you recovered. Not perfect, but persistent. That counts for something.',
        mood: 'grudging'
      },
      operatorMessage: {
        speaker: 'operator',
        text: 'There were outages, and some DP was spent that didn\'t need to be. But the grid held. Persistence matters. Review the scorecard and note where the efficiency was lost.',
        mood: 'supportive'
      },
      hospitalMessage: {
        speaker: 'hospital',
        text: 'We had a brief power dip on the secondary feed. Backup generators engaged. No patient impact, but we\'d like a clean run next time.',
        mood: 'concerned'
      }
    },

    INCOMPLETE: {
      title: 'Mission Incomplete',
      grade: 'C',
      hackerMessage: {
        speaker: 'hacker',
        text: 'You acted before you understood. That\'s not defence — that\'s panic. I barely had to try.',
        mood: 'taunting'
      },
      operatorMessage: {
        speaker: 'operator',
        text: 'The mission was not completed. But every mistake is a lesson if you study it. Review which algorithm could have given you the answer, and try again.',
        mood: 'firm'
      },
      hospitalMessage: {
        speaker: 'hospital',
        text: 'We lost power to two wards for thirty-seven minutes. Emergency diesel held, but this cannot happen again.',
        mood: 'serious'
      }
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CHAPTER INTRO SEQUENCES (for the story transition screens)
  // ──────────────────────────────────────────────────────────────────────────
  chapterIntros: {
    1: [
      { speaker: 'operator', text: 'The shift starts quiet. Generators running. Loads balanced. The board is green.', delay: 0 },
      { speaker: 'operator', text: 'But the forecast said demand would be flat tonight, and I see a number that disagrees.', delay: 3000 },
      { speaker: 'operator', text: 'Your job: learn this grid. Trace every connection. Understand where the power flows.', delay: 6000 }
    ],
    2: [
      { speaker: 'supervisor', text: 'Control room — we just lost LINE-1-2. Relay trip confirmed. Field crew en route.', delay: 0 },
      { speaker: 'hacker', text: 'One line down. Let\'s see how fast you find another way.', delay: 3000 },
      { speaker: 'operator', text: 'Ignore the provocation. Check connectivity, find an alternate route, verify it\'s safe.', delay: 6000 }
    ],
    3: [
      { speaker: 'operator', text: 'LINE-1-3 is down and LINE-2-4 is running hot. This is a cascade in slow motion.', delay: 0 },
      { speaker: 'hacker', text: 'You have one bridge you can\'t afford to lose. Find it before I do.', delay: 3000 },
      { speaker: 'operator', text: 'Find the bridges. Prioritize the threats. And do not force power through an overloaded line.', delay: 6000 }
    ],
    4: [
      { speaker: 'supervisor', text: 'Breaker on LINE-1-2 opened. No trip command in the control log.', delay: 0 },
      { speaker: 'hacker', text: 'I didn\'t need your permission to open that breaker. Can you prove why it opened?', delay: 3000 },
      { speaker: 'operator', text: 'Unauthorized access confirmed. Investigate the cause and secure the gateway before restoring.', delay: 6000 }
    ],
    5: [
      { speaker: 'operator', text: 'Sensor readings at Bus 2 don\'t agree with what the grid is physically doing.', delay: 0 },
      { speaker: 'operator', text: 'The hacker is quiet. When they want you to act on bad information, they stay silent.', delay: 3000 },
      { speaker: 'operator', text: 'Find which telemetry is false. The hospital\'s secondary feed depends on your decision.', delay: 6000 }
    ],
    6: [
      { speaker: 'hacker', text: 'You\'ve learned to see the grid. Now let\'s see whether you can hold it.', delay: 0 },
      { speaker: 'supervisor', text: 'Multiple alerts. LINE-1-3 down. Demand surge on Bus 4. Anomalous readings on Bus 2.', delay: 3000 },
      { speaker: 'operator', text: 'Everything you\'ve learned, right now. Diagnose, prioritize, act. Protect every critical load.', delay: 6000 }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // RUNTIME STATE
  // ──────────────────────────────────────────────────────────────────────────
  _shownDialogue: {},   // track which lines have been shown per chapter/trigger
  _eventLog: [],        // full dialogue log for review

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get the chapter ID string for the current game level
   */
  getChapterIdForLevel: function(level, subScenario) {
    if (level === 1) return 'prologue';
    if (level === 2) return 'chapter1';
    if (level === 3) return 'chapter2';
    if (level === 4 && subScenario === 'B') return 'chapter4';
    if (level === 4) return 'chapter3';
    if (level === 5) return 'chapter5';
    return 'prologue';
  },

  /**
   * Get the chapter metadata for a given level
   */
  getChapter: function(level) {
    for (const key in this.chapters) {
      if (this.chapters[key].level === level) return this.chapters[key];
    }
    return this.chapters[1];
  },

  /**
   * Get the chapter number (1-6) for a given level and sub-scenario
   */
  getChapterNumber: function(level, subScenario) {
    if (level === 1) return 1;
    if (level === 2) return 2;
    if (level === 3) return 3;
    if (level === 4 && subScenario === 'A') return 4;
    if (level === 4 && subScenario === 'B') return 5;
    if (level === 5) return 6;
    return 1;
  },

  /**
   * Resolve dialogue by trigger or context.
   */
  resolveDialogue: function(trigger, gameState) {
    if (trigger) {
      return this.getDialogue(trigger, gameState);
    }
    return this.getContextualDialogue(gameState);
  },

  /**
   * Get scripted dialogue for a trigger event.
   * Returns { speaker, text, actionPrompt, mood } or null.
   */
  getDialogue: function(trigger, gameState) {
    const s = gameState || {};
    const chapterId = this.getChapterIdForLevel(s.activeLevel || 1, s.level4SubScenario || 'A');
    const chapterDialogue = this.dialogue[chapterId];
    if (!chapterDialogue || !chapterDialogue[trigger]) return null;

    const lines = chapterDialogue[trigger];
    const key = chapterId + ':' + trigger;
    if (!this._shownDialogue[key]) this._shownDialogue[key] = 0;

    const idx = Math.min(this._shownDialogue[key], lines.length - 1);
    this._shownDialogue[key]++;

    const line = lines[idx];
    this._eventLog.push({
      timestamp: new Date().toLocaleTimeString(),
      chapter: chapterId,
      trigger: trigger,
      speaker: line.speaker,
      text: line.text,
      mood: line.mood
    });

    return line;
  },

  /**
   * Map a game algorithm result to a trigger name.
   */
  algoToTrigger: function(algoName) {
    const map = {
      'BFS': 'BFS_DONE',
      'DFS': 'DFS_DONE',
      'DIJKSTRA': 'DIJKSTRA_DONE',
      'TARJAN': 'TARJAN_DONE',
      'MAX_HEAP': 'MAX_HEAP_DONE',
      'DSU_ISLANDS': 'DSU_DONE',
      'AC_FEASIBILITY': 'FEASIBILITY_PASS'
    };
    return map[algoName] || null;
  },

  /**
   * Determine the ending based on final game state.
   */
  getEnding: function(gameState) {
    const s = gameState || {};
    const sc = s.score || {};
    if (sc.total >= 900 && sc.penalties === 0) return this.endings.CLEAN_WIN;
    if (sc.total >= 600) return this.endings.HARD_WON;
    return this.endings.INCOMPLETE;
  },

  /**
   * Get the chapter intro sequence for a level.
   */
  getChapterIntro: function(level, subScenario) {
    const num = this.getChapterNumber(level, subScenario);
    return this.chapterIntros[num] || this.chapterIntros[1];
  },

  /**
   * Get the full event log.
   */
  getEventLog: function() {
    return this._eventLog;
  },

  /**
   * Reset dialogue tracking (e.g., when replaying a level).
   */
  resetForLevel: function(level, subScenario) {
    const chapterId = this.getChapterIdForLevel(level, subScenario);
    const keysToRemove = [];
    for (const key in this._shownDialogue) {
      if (key.startsWith(chapterId + ':')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => delete this._shownDialogue[k]);
  },

  /**
   * Reset all state.
   */
  resetAll: function() {
    this._shownDialogue = {};
    this._eventLog = [];
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ENHANCED CONTEXT DIALOGUE — replaces CharacterDialogueEngine
  // ──────────────────────────────────────────────────────────────────────────
  /**
   * Drop-in replacement for CharacterDialogueEngine.getContextualDialogue.
   * Examines the full game state and returns the most appropriate line.
   */
  getContextualDialogue: function(state) {
    const s = state || {};
    const lvl = s.activeLevel || 1;
    const algo = s.activeAlgorithm;
    const sub = s.level4SubScenario || 'A';

    // 1. Penalties (highest priority — hacker gloats)
    if (s.penaltiesApplied && s.penaltiesApplied['UNNECESSARY_SWITCHING']) {
      const d = this.getDialogue('UNNECESSARY_TRIP', s);
      if (d) return d;
    }

    // 2. Level completed
    if (s.levelCompleted) {
      const d = this.getDialogue('LEVEL_COMPLETE', s);
      if (d) return d;
    }

    // 3. Post-action state reactions
    if (lvl === 1 && s.level1Exploration?.redispatched) {
      const d = this.getDialogue('REDISPATCH', s);
      if (d) return d;
    }

    if (s.reclosed || s.corridorRestored) {
      const d = this.getDialogue('BREAKER_RECLOSE', s);
      if (d) return d;
    }

    if (s.badDataIsolated && (lvl === 4 && sub === 'B' || lvl === 5)) {
      const d = this.getDialogue('TELEMETRY_ISOLATED', s);
      if (d) return d;
    }

    if (s.gatewayHardened && lvl === 4 && sub === 'A' && s.activeOutages?.length > 0) {
      const d = this.getDialogue('GATEWAY_HARDENED', s);
      if (d) return d;
    }

    if (s.loadShedDone) {
      const d = this.getDialogue('LOAD_SHED', s);
      if (d) return d;
    }

    // 4. Algorithm results
    if (algo && s.dsaResult) {
      // FDIA detection
      if (algo === 'AC_FEASIBILITY' && s.routeFeasibility?.status?.includes('FDIA')) {
        const d = this.getDialogue('FDIA_DETECTED', s);
        if (d) return d;
      }
      // Feasibility fail
      if (algo === 'AC_FEASIBILITY' && s.routeFeasibility && !s.routeFeasibility.feasible) {
        const d = this.getDialogue('FEASIBILITY_FAIL', s);
        if (d) return d;
      }
      // Feasibility pass
      if (algo === 'AC_FEASIBILITY' && s.routeFeasibility?.feasible) {
        const d = this.getDialogue('FEASIBILITY_PASS', s);
        if (d) return d;
      }
      // Dijkstra fail
      if (algo === 'DIJKSTRA' && s.dsaResult && !s.dsaResult.success) {
        const d = this.getDialogue('DIJKSTRA_FAIL', s);
        if (d) return d;
      }
      // General algorithm trigger
      const trigger = this.algoToTrigger(algo);
      if (trigger) {
        const d = this.getDialogue(trigger, s);
        if (d) return d;
      }
    }

    // 5. Demand surge (Level 1)
    if (lvl === 1 && s.level1Exploration?.surgeDone && !s.level1Exploration?.redispatched) {
      const d = this.getDialogue('DEMAND_SURGE', s);
      if (d) return d;
    }

    // 6. Level start (default)
    const d = this.getDialogue('LEVEL_START', s);
    if (d) return d;

    // 7. Absolute fallback
    return {
      speaker: 'operator',
      text: 'Investigate before taking irreversible operating actions. The graph reveals topology; physics reveals safety.',
      actionPrompt: 'Select a DSA tool from the palette.',
      mood: 'steady'
    };
  }
};

# GRID COMMAND

The game lives in the existing Next.js application at `/grid-command`. It uses the existing training feeder, pandapower AC solver, physical battery model, DSA catalog and CAPER engine. It does not maintain an alternate graph-only electrical model.

## Play

Choose a level, start the mission and read the objectives. Select a facility or branch in the network to prepare a contextual operation, or choose an operation in the action form. Repair faulted feeders, open or close real switches, allocate finite BESS backup, redispatch the modeled solar source, curtail flexible consumer demand, restore demand, or lower the available intake budget. The server validates every target and numeric limit.

Repairs cost 8 credits, switching 2, BESS dispatch 3, local solar dispatch 2, and curtailment/restoration/intake-budget changes 1. Waiting costs no credits but consumes a turn. Repairs are more expensive than switching to make alternative restoration routes meaningful. Credits are educational operating costs, not actual utility tariffs.

Every accepted move changes the authoritative simulation and triggers another AC solve. A graph-connected state can still be infeasible. The UI marks critical supply unverified when hard electrical limits fail. Complete Mission becomes available only when critical service, minimum total service, AC constraints and scheduled storm waves all pass. Running out of dispatch turns with unmet objectives loses the mission. Undo restores the physical snapshot, battery state, credits, reliability score and storm-wave progress together; its optimistic version still advances so stale requests cannot replay accidentally.

The five levels are Hospital Blackout, Citywide Power Shortage, Transmission Line Failure, Cascading Outage and CAPER Challenge. Levels may be selected directly for review and replay. They are progressively harder, but do not require an account or lock the reviewer behind prior level completion.

## Reproducible operator walkthrough

Use seed 42 (the frontend default).

- Level 1: repair LINE-02-03; complete the mission. The hospital returns to full service.
- Levels 2–5: curtail LOAD-INDUSTRIAL by 3.2 MW; curtail LOAD-COMMERCIAL by 1.4 MW; dispatch BESS-CITY-1 at 1700 kW; dispatch BESS-HOSP-1 at 510 kW. Repair every remaining active fault, then complete the mission. Level 2 has no initial physical faults, Level 3 and Level 5 have two, and Level 4 has additional storm faults by turn four. These are actual manual choices, not a pre-scripted victory animation. Alternative strategies can produce different time, reliability and credit scores.
- At Level 5, compute Compare same initial scenario. CAPER is evaluated on the mission's original faults, seed and intake budget, even if the player already repaired a line. The comparison is labeled infeasible when the corresponding AC result fails.

## Explainable algorithms

Explain Decision runs the selected algorithm against the current mission. Its actual inputs, output, time complexity and trace are returned by the backend. Previous/Next/Play controls step through the trace and highlight its active buses and branches in the same network diagram.

| Algorithm | Game use | Interpretation |
| --- | --- | --- |
| BFS | Reachability from the intake | Current open switches and faults are unavailable. |
| DFS | Islands and topology | Connected components do not prove electrical feasibility. |
| Dijkstra | Candidate restoration paths | Includes available open ties as proposals; switching and AC validation are still required. |
| Max-flow / min-cut | Capacity and bottlenecks | Simplified MW graph capacities, not nonlinear AC power flow. |
| Knapsack | Scarce-supply allocation | Prioritizes critical demand under a finite supply ceiling. |
| Kruskal | Low-cost candidate topology | A graph plan requiring switching and subsequent physical checks. |
| Bipartite matching | Backup source to critical-load assignment | Discrete allocation compatibility; not continuous power dispatch or a proof of AC feasibility. |
| CAPER | Candidate synthesis and AC checks | Returns real selected actions and rejection evidence. The player applies individual choices through the validated game controls. |

The hints clone the current reference topology, current load allocations and source-capacity limit. Battery capacity used in graph hints is bounded by the remaining usable energy. The full existing algorithm explorer remains accessible from Technical Lab.

## Scoring and engineering limits

The score is capped at 1000: critical service contributes up to 500, total load up to 200, reliability averaged over accepted turns up to 150, time bonus up to 100 and credit efficiency up to 50. Unresolved constraints and previously observed constraint failures reduce the score. An electrically infeasible state is capped below 400 and cannot win.

A winning state requires an AC-solved, converged feeder with energized bus voltages in 0.92–1.08 pu, line and transformer loadings at or below 100%, and no exceeded generator/intake bounds. Elevated-loading advisories at 85% are shown separately from the 100% hard thermal limit. Critical load reserves cannot be shed using the game interface.

The game inherits the repository's modeled 12-bus city. The educational campus is a university load, and emergency operations are represented by the control-center load; it does not claim to model a particular real school or emergency station. Backup is finite battery storage, while the local generation dispatch control uses the existing modeled solar generator. No diesel generator or real-world national telemetry is invented.

Each operator action normally advances the physical session by five minutes. Automatic storm-trip events also advance that backend clock, so elapsed simulation time can exceed five minutes times the operator turn count. Batteries integrate physical elapsed time. The turn budget is an operator decision limit rather than an exact wall-clock timer. Storm arrivals are deterministic events at turns two and four, not a weather or protection-system model. The Level 4 CAPER comparator evaluates the initial state and explicitly does not predict those later events.

## Integration and verification

`backend/app/simulation/grid_command.py` owns five scenario definitions, game transactions, scoring, validated actions, undo, replay and algorithm integration. `backend/app/api/routes/grid_command.py` exposes `/api/grid-command/*` endpoints. `apps/web/src/app/grid-command/page.tsx` renders the game and uses the shared SVG FeederDiagram with its authoritative session; it remains functional without WebGL. State is server-owned and in memory, with browser session storage retaining only the current game ID. Restarting the backend expires games. Up to 256 in-memory game sessions are retained; finished sessions may be evicted at that limit.

Mutations use an engine lock and an expected version. Duplicate concurrent actions cannot commit twice. Failed mutations roll back both the physical snapshot and game bookkeeping. This local-process educational store is not a distributed multiplayer persistence service.

Run backend tests with `.venv/bin/python -m pytest backend/test_grid_command.py -q`. Run `node scripts/verify_grid_command.mjs` from `apps/web` with frontend :3000 and backend :8000 available. The browser script disables WebGL and plays all five levels through the real UI, checking undo/reset/replay, computed matching hints, initial-state CAPER comparison, persistence, and responsive screenshots. No mocked backend responses are used.

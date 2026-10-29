# GRIDSEC // ZERO case study

The public journey is Explore (`/`) → Restore (`/restore`) → Results (`/results`). All original module routes remain available from Technical Lab, including the original national-grid operations screen. `/demo` remains directly accessible. Guided Demo provides optional instructions across the three public destinations.

## Scenario and interpretation

Restore resets the real TRAINING_FEEDER with seed 42 and a 7.2 MW source limit, then trips actual branches LINE-02-03 and LINE-03-04. The 2D diagram uses backend building positions and solved line **and transformer** endpoints. CAPER and all baselines run on the same faulted state before application. Apply uses the existing backend plan endpoint and captures its newly solved state. Prerequisite controls and stale-session checks protect the action sequence.

Observed final scenario: 2.10 MW attempted critical supply before restoration (38.9%; the state has electrical constraints and is explicitly unverified), 5.40 MW verified critical supply after (100%), zero final AC violations, and two faults still isolated. Priority Greedy supplies 57.4% on the same scenario. CAPER runtime is measured per run (approximately one second on the verification host), not hard-coded. Infeasible baseline attempts are excluded from the verified-supply chart. The research dashboard's aggregated load percentages are labeled attempted supply because they include infeasible trials.

Study snapshots, planning evidence, and comparison results survive navigation and reload in browser session storage. The optional map contingency model has its own named backend session, separate from the shared local simulator. A backend regression was corrected: internal session lookup without a requested network previously reset named national sessions to TRAINING_FEEDER. It now preserves the existing network, while new sessions still default to the training feeder.

## Verification

- Production build: `npm run build` in apps/web — passed.
- TypeScript: `npm run typecheck` in apps/web — passed.
- Backend: `.venv/bin/python -m pytest backend/test_gridzero_complete.py backend/test_system_hardening.py -q` — 50 passed; one dependency deprecation warning.
- Browser: `node scripts/verify_case_study.mjs` in apps/web, with frontend :3000 and backend :8000 running. Uses installed Google Chrome; override its executable path in the script if needed on another host.
- Browser checks: map search/selection/zoom, national model solve and actual corridor trip, guarded restoration sequence, actual out-of-service faulted branches, CAPER plus baseline execution, explanation traces, AC-validated application, 3D canvas, comparison selection including rejected Graph Greedy, reload persistence, Technical Lab links, and mobile overflow checks.
- Screenshots: `docs/screenshots/case-study/`, desktop 1440×1000 and mobile 390×844. Reviewed primary-screen captures and corrected excess spacing, missing transformer edges, and a mobile comparison-selector overflow.

No push, merge, or deployment was performed. National geography remains a representative reference model, not live telemetry; census-derived state geometry provenance is disclosed in Explore. The separate local feeder is never presented as a physical extension of a selected national asset.

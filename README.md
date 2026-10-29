# GRIDSEC // ZERO

An electricity-grid intelligence and restoration platform: explore a representative India network, restore critical local service, study the computed evidence, or operate the feeder yourself in **GRID COMMAND**.

The existing Next.js application and FastAPI backend share real network models, graph algorithms, CAPER candidate generation, pandapower AC calculations and finite battery storage. SVG views keep the product usable when WebGL is unavailable. This is a reproducible engineering simulator, not a live utility control system.

## Run locally

From the repository root, install backend dependencies if needed:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd apps/web
npm ci
npm run dev
```

Open <http://localhost:3000>. Requests to `/api/*` are proxied to the local backend on port 8000. The frontend uses the patched Next.js 15.5 maintenance line with React 19 and React Three Fiber 9; keep the lockfile when installing. For a production build, run `npm run build` and `npm run start` in `apps/web`.

## Product paths

- **Explore** (`/`): SVG India geography, selectable states and modeled substations, regional metrics, independent national contingencies, and selected-area dashboard drill-down.
- **Restore → Results** (`/restore`, `/results`): reproducible local faults, computed CAPER and baseline comparison, actual backend application, AC validation and qualified before/after supply.
- **GRID COMMAND** (`/grid-command`): five playable levels with repairs, switching, generation and storage dispatch, load allocation, credits, turn limits, scoring, storm waves, undo, replay and explainable algorithm hints.
- **Technical Lab**: all existing algorithm, CAPER, engineering, mission, challenge, cyber, sandbox, research and documentation routes remain accessible. Legacy HTML applications remain served by the backend.

The national model is a representative 59-node, 54-corridor dataset. Census-derived state boundaries and model provenance are disclosed in the map. The local training feeder is a separate model; selecting a national asset does not create a physical national-to-local connection.

## Verify

```bash
.venv/bin/python -m pytest backend/ -q --ignore=backend/test_backend.py --ignore=backend/app/power/test_networks.py
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
node --test apps/web/scripts/webgl_capability.test.mjs
node apps/web/scripts/verify_grid_metrics.mjs
```

With both servers running, from `apps/web` run browser suites **sequentially** because some lab views intentionally use the shared local operator session:

```bash
node scripts/verify_webgl_fallback.mjs
node scripts/verify_map_dashboard.mjs
node scripts/verify_grid_command.mjs
node scripts/verify_case_study.mjs
```

The scripts use installed Google Chrome (or `CHROME_PATH` where supported) and real backend responses. They save desktop/mobile screenshots in `docs/screenshots/`. No mocked result API is used. Runtime context-loss verification is reported as skipped only when the host cannot create a real graphics context; disabled-WebGL checks always run.

## Engineering interpretation and limits

AC convergence, voltage/loading limits and source ceilings determine electrical feasibility. Graph connectivity, max-flow, matching and knapsack produce reachability or planning results; they do not establish a physically valid AC operating point. Attempted supply from infeasible states is explicitly qualified and is excluded from verified-supply charts. CAPER evaluates a finite candidate portfolio, so it is a heuristic rather than a global optimality guarantee.

Simulation, research and game state is in process memory. Operator updates are locked; game actions additionally require an expected version and roll back on failure. Backend restart expires game sessions. Authentication, persistent/distributed game storage and real utility telemetry/control are outside this local simulator. A multi-worker deployment would require shared session persistence and concurrency control. See the final verification report for measured checks and remaining limits.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [GRID COMMAND rules, scoring and all-level walkthrough](docs/GRID_COMMAND.md)
- [Algorithm implementations and interpretations](DSA_IMPLEMENTATION.md)
- [Power and battery model](POWER_MODEL.md)
- [CAPER methodology](CAPER_METHOD.md)
- [Faculty demo](DEMO_GUIDE.md)
- [Product verification report](docs/PRODUCT_VERIFICATION.md)

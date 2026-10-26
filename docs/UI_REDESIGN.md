# GRIDSEC // ZERO interface redesign

The frontend now defaults to light neutral surfaces, charcoal text, deep blue actions, muted teal status, and restrained amber/red exceptions. Typography uses the system sans-serif stack; code and serialized traces retain monospace. The shared shell provides seven primary destinations; the More menu preserves access to missions, CAPER, power flow, the arena, sandbox and documentation.

## Page changes

- Overview: focused narrative, two primary calls to action, geographic preview, three core modules and concise supporting sections.
- Simulation: network and mission entry points, four key metrics, a larger city view, Summary/Electrical/Restoration/Notes inspector tabs, and expandable diagnostics. Faults, batteries, supply constraints, CAPER, undo and reset remain accessible.
- Algorithms: one selector replaces thirteen competing cards. Graph/city visualization takes more space; pseudocode, data structure state and computed results expand on demand.
- Research: two comparison charts, calmer palette, expandable statistical tables and findings. Illustrative fallback results are explicitly labeled.
- India Grid: geographic SVG map, state selection, substation tooltips and selection, regional filters, connectivity/voltage/incident overlays, zoom and fit, and model corridor trip/reclose controls.
- Cyber Lab: expandable event scenarios, synthetic event timeline and central impact visualization.
- Demo: curated presentation script with expandable talking points. The remaining routes share the new palette and typography.

## Presentation

Use **Present** in the header to hide navigation, controls and engineering details and expand the primary visualization. **Exit presentation** or Escape restores the workspace. This is a clean viewport mode, not browser fullscreen.

## Geography and data

`src/data/indiaBoundaries.json` contains projected district polygons grouped by state from [india-maps-data](https://github.com/udit-001/india-maps-data), downloaded 2026-10-26. The source provides 36 state/UT groups; feature metadata includes 2011 census district identifiers. This is a reference visualization, not an authoritative administrative or boundary determination. The source curator does not state a license and notes that geometries were collected from public sources for personal usage; verify upstream rights before redistributing this data commercially.

The bundled map runs without a map service, access token or runtime geography fetch. Coordinates are projected consistently for boundaries and grid markers. Recreate the derived files with `python3 apps/web/scripts/prepare_india_map.py /path/to/india.geojson`.

Substations and corridor metadata come from the existing `js/data/indiaGridData.js`. Electrical overlays use the current India simulation session, matched by bus and line IDs. Unavailable results are labeled; reference capacities are not represented as live measurements. The existing electrical model may return zero voltages or fail to converge; the UI reports convergence status rather than assuming a successful solve.

## Verification and screenshots

Run the backend on port 8000, build and start the frontend on port 3000, then execute `node apps/web/verify_redesign.mjs`. The script checks seven main routes, fault injection, algorithm selection, geographic controls, presentation entry/exit and mobile overflow. It saves desktop, presentation and mobile screenshots under `docs/screenshots/redesign/`. Chrome is the default executable; set `CHROME_PATH` to use another Chrome installation.

Final verification completed 2026-10-27: production build and TypeScript validation passed; all seven primary desktop routes returned 200; fault injection returned a successful backend response; algorithm selection, regional filtering, map zoom/fit, and presentation entry/Escape exit passed. All seven primary routes passed the 390px mobile overflow check. The browser recorded zero uncaught page errors. Fifteen final screenshots were captured, and overview, simulation, algorithms, research, cyber analysis, India Grid, mobile algorithms and presentation views were visually inspected.

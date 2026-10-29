"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IndiaMap, indiaNodes, indiaStates } from "@/components/maps/IndiaMap";
import {
  indiaRegions,
  nationalMetrics,
  useIndiaGridStore,
} from "@/store/useIndiaGridStore";
export default function NationalGrid() {
  const grid = useIndiaGridStore(),
    [layer, setLayer] = useState("Grid health"),
    [search, setSearch] = useState("");
  const { ensure } = grid;
  useEffect(() => {
    void ensure();
  }, [ensure]);
  const stats = nationalMetrics(grid.session, {
    state: grid.selectedState,
    region: grid.region,
    node: grid.selectedNode,
  });
  const selected = indiaNodes.find((n) => n.id === grid.selectedNode);
  const title =
    selected?.name ||
    grid.selectedState ||
    indiaRegions.find((r) => r.id === grid.region)?.name ||
    "All India";
  return (
    <div className="intel-shell">
      <div className="intel-heading">
        <div>
          <span className="eyebrow">
            Geographic intelligence / Simulated reference
          </span>
          <h1>India grid intelligence</h1>
          <p>
            Inspect modeled regions, compare demand and supply, and evaluate a
            corridor outage using the national AC reference model.
          </p>
        </div>
        <div className="intel-actions">
          <button
            className="secondary-button"
            disabled={grid.loading}
            onClick={() => grid.reset()}
          >
            Reset national model
          </button>
          <Link className="primary-button" href="/dashboard?scope=india">
            Open dashboard ↗
          </Link>
        </div>
      </div>
      {grid.error && (
        <div className="intel-status intel-error" role="alert">
          {grid.error}{" "}
          <button className="intel-small-button" onClick={() => grid.ensure()}>
            Retry
          </button>
        </div>
      )}
      <div className="intel-controls">
        <label className="intel-note">
          Region{" "}
          <select
            className="intel-select"
            aria-label="Model region"
            value={grid.region}
            onChange={(e) => grid.setRegion(e.target.value)}
          >
            {indiaRegions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="intel-note">
          Map layer{" "}
          <select
            className="intel-select"
            aria-label="National map layer"
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
          >
            {[
              "Connectivity",
              "Grid health",
              "Regions",
              "Voltage",
              "Incidents",
            ].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Find state or asset</span>
          <input
            className="intel-select"
            placeholder="Find state or asset…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {search && (
        <div className="search-results">
          {indiaStates
            .filter((s) => s.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 4)
            .map((s) => (
              <button
                className="quiet-button"
                key={s}
                onClick={() => {
                  grid.selectState(s);
                  setSearch("");
                }}
              >
                {s}
              </button>
            ))}
          {indiaNodes
            .filter((n) =>
              (n.name + " " + n.state)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .slice(0, 5)
            .map((n) => (
              <button
                className="quiet-button"
                key={n.id}
                onClick={() => {
                  grid.selectNode(n.id);
                  setSearch("");
                }}
              >
                {n.name}
              </button>
            ))}
        </div>
      )}
      <div className="intel-stats">
        {[
          ["Selected area", title, stats.nodes.length + " modeled assets"],
          [
            "Simulated demand",
            grid.session ? stats.demand.toFixed(1) + " MW" : "—",
            "Model input demand",
          ],
          [
            "Simulated supply",
            grid.session ? stats.served.toFixed(1) + " MW" : "—",
            grid.session
              ? Math.max(0, stats.demand - stats.served).toFixed(1) +
                " MW unserved"
              : "Awaiting model",
          ],
          [
            "Area grid health",
            grid.session ? stats.violations + " constraints" : "—",
            stats.faults + " active faults",
          ],
        ].map(([label, value, note]) => (
          <div key={label} className="intel-stat">
            <span>{label}</span>
            <strong
              style={label === "Selected area" ? { fontSize: 17 } : undefined}
            >
              {value}
            </strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <IndiaMap
        modelSession={grid.session || undefined}
        region={grid.region}
        overlay={layer}
        selected={grid.selectedNode}
        selectedState={grid.selectedState}
        onSelect={grid.selectNode}
        onStateSelect={grid.selectState}
      />
      <div className="intel-map-caption mt-3">
        <span>
          Drag or use arrow keys to pan. Select a state to zoom and update
          dashboard metrics.
        </span>
        <span>
          {grid.loading
            ? "Solving model…"
            : grid.session?.power_flow.power_balance.converged
              ? "AC model converged"
              : "AC solution unavailable"}
        </span>
      </div>
      <div className="intel-secondary">
        <section className="intel-card">
          <h2>Selected-area corridors</h2>
          <p className="intel-note mb-3">
            Trip a line to evaluate its electrical consequences. Repair
            explicitly clears its simulated fault.
          </p>
          <div className="intel-scroll">
            <table className="intel-table">
              <thead>
                <tr>
                  <th>Modeled corridor</th>
                  <th>Loading</th>
                  <th>Operation</th>
                </tr>
              </thead>
              <tbody>
                {stats.lines.map((l) => (
                  <tr key={l.line_id}>
                    <td>{l.name}</td>
                    <td>
                      {l.status === "OUT_OF_SERVICE"
                        ? "Out of service"
                        : l.loading_percent.toFixed(1) + "%"}
                    </td>
                    <td>
                      <button
                        className="quiet-button"
                        disabled={grid.loading}
                        onClick={() =>
                          grid.action(
                            l.status === "OUT_OF_SERVICE"
                              ? "CLEAR_FAULT"
                              : "INJECT_FAULT",
                            l.line_id,
                          )
                        }
                      >
                        {l.status === "OUT_OF_SERVICE" ? "Repair" : "Trip"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!stats.lines.length && (
              <p className="intel-empty">
                No corridors modeled in this selection.
              </p>
            )}
          </div>
        </section>
        <section className="intel-card">
          <h2>Explore a local distribution model</h2>
          <p className="intel-note">
            The national reference model illustrates transmission connectivity.
            The local 12-bus feeder separately models critical facilities,
            batteries, switches and household demand; it is not attached to the
            selected national asset.
          </p>
          <div className="intel-actions mt-5">
            <Link className="primary-button" href="/restore">
              Hospital restoration →
            </Link>
            <Link className="secondary-button" href="/grid-command">
              GRID COMMAND →
            </Link>
          </div>
          <h3 className="mt-7">Data provenance</h3>
          <p className="intel-note mt-2">
            Boundary paths are projected from bundled india-maps-data census
            district geometry, grouped by state. Reference assets and capacities
            come from this repository’s indiaGridData.js; they are
            representative simulation inputs, not independently verified
            national-grid telemetry. Unmodeled states display no inferred
            electricity statistics. Critical facilities are identified only
            where the backend assigns an explicit facility type.
          </p>
          <a
            href="https://github.com/udit-001/india-maps-data"
            className="intel-small-button"
          >
            Boundary data source ↗
          </a>
        </section>
      </div>
    </div>
  );
}

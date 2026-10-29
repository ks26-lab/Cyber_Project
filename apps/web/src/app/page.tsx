"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IndiaMap, indiaNodes, indiaStates } from "@/components/maps/IndiaMap";
import { nationalMetrics, useIndiaGridStore } from "@/store/useIndiaGridStore";
export default function Explore() {
  const model = useIndiaGridStore(),
    [query, setQuery] = useState(""),
    [layer, setLayer] = useState("Connectivity");
  const { ensure } = model;
  useEffect(() => {
    void ensure();
  }, [ensure]);
  const node = indiaNodes.find((n) => n.id === model.selectedNode),
    scope = nationalMetrics(model.session, {
      node: model.selectedNode,
      state: model.selectedNode ? "" : model.selectedState,
    });
  const stateMatches = indiaStates.filter((s) =>
    s.toLowerCase().includes(query.toLowerCase()),
  );
  const title = node?.name || model.selectedState;
  return (
    <div className="journey">
      <div className="journey-heading">
        <span className="eyebrow">01 / Explore</span>
        <h1>How connected is our power grid?</h1>
      </div>
      <div className="map-tools">
        <label>
          <span className="sr-only">Search substations</span>
          <input
            placeholder="Search a substation or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Map layer</span>
          <select value={layer} onChange={(e) => setLayer(e.target.value)}>
            {[
              "Connectivity",
              "Regions",
              "Voltage",
              "Grid health",
              "Incidents",
            ].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      {query && (
        <div className="search-results" aria-label="Search results">
          {indiaNodes
            .filter((n) =>
              (n.name + " " + n.state + " " + n.region)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .slice(0, 5)
            .map((n) => (
              <button
                className="quiet-button"
                key={n.id}
                onClick={() => {
                  model.selectNode(n.id);
                  setQuery("");
                }}
              >
                {n.name} · {n.state}
              </button>
            ))}
          {stateMatches.slice(0, 4).map((s) => (
            <button
              className="quiet-button"
              key={s}
              onClick={() => {
                model.selectState(s);
                setQuery("");
              }}
            >
              {s} · State
            </button>
          ))}
          {!stateMatches.length &&
            !indiaNodes.some((n) =>
              (n.name + " " + n.state)
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <p className="intel-note">
                No matching modeled assets or states.
              </p>
            )}
        </div>
      )}
      <IndiaMap
        modelSession={model.session || undefined}
        selected={model.selectedNode}
        selectedState={model.selectedState}
        onSelect={model.selectNode}
        onStateSelect={model.selectState}
        overlay={layer}
      />
      {model.loading && (
        <p className="intel-note" role="status">
          Solving the national reference model…
        </p>
      )}
      {model.error && (
        <div className="intel-status intel-error" role="alert">
          {model.error}{" "}
          <button className="intel-small-button" onClick={() => model.ensure()}>
            Retry model
          </button>
        </div>
      )}
      {title && (
        <section className="intel-selection">
          <div className="intel-selection-top">
            <div>
              <span className="intel-overline">
                Selected {node ? "modeled asset" : "state"}
              </span>
              <h2>{title}</h2>
              <p className="intel-note">
                {node
                  ? `${node.state} · ${node.voltage}`
                  : `${scope.nodes.length} representative assets in this state`}
              </p>
            </div>
            <Link className="secondary-button" href="/dashboard?scope=india">
              Open selected grid dashboard ↗
            </Link>
          </div>
          <div className="intel-inline-stats">
            <span>
              Simulated demand
              <strong>
                {model.session
                  ? scope.demand.toFixed(1) + " MW"
                  : "Awaiting solver"}
              </strong>
            </span>
            <span>
              Simulated generation
              <strong>
                {model.session
                  ? scope.generation.toFixed(1) + " MW"
                  : "Awaiting solver"}
              </strong>
            </span>
            <span>
              {model.session?.solver_provenance === "AC_SOLVED" &&
              model.session.power_flow.power_balance.converged &&
              !model.session.power_flow.violations.length
                ? "Verified load supplied"
                : "Attempted load allocation"}
              <strong>
                {model.session
                  ? scope.served.toFixed(1) + " MW"
                  : "Awaiting solver"}
              </strong>
            </span>
          </div>
          {!scope.nodes.length && (
            <p className="intel-note">
              This reference network has no modeled assets here; no regional
              demand or generation estimate is inferred.
            </p>
          )}
          <details className="contingency mt-5">
            <summary>Inspect simulated contingencies</summary>
            <p className="intel-note">
              The national AC model is separate from the local restoration
              feeder. These actions change only this model.
            </p>
            <button
              className="quiet-button"
              disabled={model.loading}
              onClick={() => model.reset()}
            >
              {model.session ? "Reset national model" : "Solve national model"}
            </button>
            {scope.lines.slice(0, 10).map((l) => (
              <div key={l.line_id}>
                <span>
                  {l.name} · {l.loading_percent.toFixed(1)}% loading{" "}
                </span>
                <button
                  className="quiet-button"
                  disabled={model.loading}
                  onClick={() =>
                    model.action(
                      l.status === "OUT_OF_SERVICE"
                        ? "CLEAR_FAULT"
                        : "INJECT_FAULT",
                      l.line_id,
                    )
                  }
                >
                  {l.status === "OUT_OF_SERVICE"
                    ? "Repair and reclose"
                    : "Simulate corridor trip"}
                </button>
              </div>
            ))}
            {model.session && (
              <p>
                {model.session.power_flow.power_balance.converged
                  ? "AC converged"
                  : "AC not converged"}{" "}
                · {scope.violations} selected-area constraint violations ·{" "}
                {scope.faults} simulated faults
              </p>
            )}
          </details>
        </section>
      )}
      <div className="journey-next">
        <p>
          Representative national network, not live telemetry. Continue with a
          separate local distribution model.
        </p>
        <Link href="/restore" className="primary-button">
          Explore a local outage →
        </Link>
      </div>
      <p className="provenance">
        State geometries: india-maps-data, grouped census district geometry;
        administrative boundaries may differ today. Asset positions, routes and
        capacities are representative modeling inputs, not verified operational
        infrastructure.{" "}
        <Link href="/national-grid">National model operations ↗</Link>
      </p>
    </div>
  );
}

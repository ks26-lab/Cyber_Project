"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { EngineeringInspector } from "@/components/simulation/EngineeringInspector";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  History,
  Layers,
  Zap,
  BatteryCharging,
} from "lucide-react";

export default function SimulationCommandPage() {
  const {
    session,
    resetSession,
    undoAction,
    loading,
    error,
    fetchSession,
    selectedAssetId,
    setSelectedAssetId,
    applyAction,
    compareRestorations,
    comparisonResult,
  } = useSimulationStore();

  const [bottomTab, setBottomTab] = useState<
    "BUILDINGS" | "CORRIDORS" | "COMPARE" | "LOG"
  >("BUILDINGS");

  const kpis = session.kpis;
  const feasible =
    session.solver_provenance === "AC_SOLVED" &&
    session.power_flow.power_balance.converged &&
    session.power_flow.violations.length === 0;
  const unavailable =
    loading || session.solver_provenance === "REFERENCE_PREVIEW";

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-4">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Operations workspace</div>
          <h1>Grid Simulation</h1>
          <p>
            Explore a disturbance, inspect its impact and restore critical
            services.
          </p>
        </div>
      </div>
      <div className="scada-panel rounded-xl p-4 flex flex-wrap gap-4 items-center presentation-hide">
        <label className="text-sm">
          Network{" "}
          <select
            aria-label="Simulation network"
            className="ml-3 rounded border border-slate-200 p-2"
            value={session.network_id}
            disabled={loading}
            onChange={(e) => resetSession(e.target.value, null, null)}
          >
            {[
              "TRAINING_FEEDER",
              "IEEE_33_DISTRIBUTION",
              "IEEE_30",
              "INDIA_GRID_59",
            ].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Link href="/missions" className="quiet-button">
          Select mission ↗
        </Link>
        <button
          className="quiet-button"
          disabled={unavailable || session.revision <= 1}
          onClick={() => undoAction()}
        >
          Undo
        </button>
        <button
          className="quiet-button"
          disabled={loading}
          onClick={() => resetSession(session.network_id, null, null)}
        >
          Reset
        </button>
      </div>
      <div className="metric-strip">
        {[
          [
            feasible ? "Verified demand supplied" : "Attempted demand supply",
            `${kpis.total_load_restored_pct.toFixed(1)}%`,
          ],
          [
            feasible ? "Verified critical supply" : "Attempted critical supply",
            `${kpis.critical_load_restored_pct.toFixed(1)}%`,
          ],
          ["Active faults", String(kpis.active_faults_count)],
          [
            "Battery state",
            session.batteries.length
              ? `${(session.batteries.reduce((a, b) => a + b.soc_percent, 0) / session.batteries.length).toFixed(0)}%`
              : "No storage",
          ],
        ].map(([l, v]) => (
          <div key={l}>
            <small>{l}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      {error && (
        <p role="status" className="text-amber-700 text-sm">
          {error}
        </p>
      )}

      {/* Main Split Workspace: Left 3D City + Bottom Telemetry Tables | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 min-w-0 space-y-4 presentation-expand">
          <CityCanvas3D heightClass="h-[540px]" />

          {/* Bottom Interactive Telemetry & Multi-Algorithm Comparison Drawer */}
          <details className="scada-panel rounded-xl p-4 presentation-hide">
            <summary>
              Engineering diagnostics · facilities, corridors, comparisons &
              action log
            </summary>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    [
                      "BUILDINGS",
                      `City Facilities (${session.buildings_3d.length})`,
                    ],
                    [
                      "CORRIDORS",
                      `Feeder Corridors (${session.power_flow.lines.length})`,
                    ],
                    ["COMPARE", "CAPER vs. 4 Baselines"],
                    [
                      "LOG",
                      `Operator Action Log (${session.action_log.length})`,
                    ],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setBottomTab(id);
                      if (id === "COMPARE" && !comparisonResult) {
                        compareRestorations();
                      }
                    }}
                    className={`rounded-md px-3 py-1.5 font-sans text-xs transition ${
                      bottomTab === id
                        ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                disabled={unavailable}
                onClick={() => {
                  setBottomTab("COMPARE");
                  compareRestorations();
                }}
                className="rounded bg-blue-50 hover:bg-blue-50 border border-blue-200 px-3 py-1 font-sans text-xs text-blue-700 transition"
              >
                Run 5-Algorithm Live Comparison
              </button>
            </div>

            {bottomTab === "BUILDINGS" && (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">Bus</th>
                      <th className="py-2 px-2">Facility</th>
                      <th className="py-2 px-2">Tier</th>
                      <th className="py-2 px-2">State</th>
                      <th className="py-2 px-2">Voltage (pu)</th>
                      <th className="py-2 px-2">Served / Demand (MW)</th>
                      <th className="py-2 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {session.buildings_3d.map((b) => (
                      <tr
                        key={b.building_id}
                        onClick={() => setSelectedAssetId(b.bus_id)}
                        className={`cursor-pointer hover:bg-slate-100 ${
                          selectedAssetId === b.bus_id ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="py-2 px-2 font-bold text-blue-700">
                          <button
                            className="text-left underline-offset-2 hover:underline"
                            onClick={() => setSelectedAssetId(b.bus_id)}
                            aria-label={`Inspect ${b.name} in the telemetry table`}
                          >
                            {b.bus_id}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-slate-700">{b.name}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              b.priority_tier === 1
                                ? "bg-teal-50 text-teal-700"
                                : b.priority_tier === 2
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            T{b.priority_tier} (w={b.criticality_weight})
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-bold ${
                              b.power_state === "BLACKOUT"
                                ? "text-red-700"
                                : b.power_state === "CURTAILED"
                                  ? "text-amber-700"
                                  : "text-teal-700"
                            }`}
                          >
                            {b.power_state}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {(b.voltage_pu ?? 0).toFixed(4)} pu
                        </td>
                        <td className="py-2 px-2">
                          {(b.served_mw ?? 0).toFixed(2)} /{" "}
                          {(b.demand_mw ?? 0).toFixed(2)} MW
                        </td>
                        <td className="py-2 px-2">
                          {b.demand_mw > 0 && (
                            <button
                              disabled={
                                unavailable ||
                                (b.curtailed_mw <= 0 &&
                                  b.demand_mw - b.critical_load_mw <= 0)
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                applyAction(
                                  b.curtailed_mw > 0
                                    ? "RESTORE_LOAD"
                                    : "CURTAIL_LOAD",
                                  b.bus_id,
                                  Math.max(
                                    0,
                                    +(b.demand_mw - b.critical_load_mw).toFixed(
                                      2,
                                    ),
                                  ),
                                );
                              }}
                              className="rounded bg-slate-100 hover:bg-slate-100 px-2 py-0.5 text-xs text-amber-700 border border-slate-200"
                            >
                              {b.curtailed_mw > 0 ? "Restore" : "Curtail"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bottomTab === "CORRIDORS" && (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2">Corridor ID</th>
                      <th className="py-2 px-2">From → To</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2">P Flow (MW)</th>
                      <th className="py-2 px-2">Loading (%)</th>
                      <th className="py-2 px-2">Loss (MW)</th>
                      <th className="py-2 px-2">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {session.power_flow.lines.map((ln) => (
                      <tr
                        key={ln.line_id}
                        onClick={() => setSelectedAssetId(ln.line_id)}
                        className="cursor-pointer hover:bg-slate-100"
                      >
                        <td className="py-2 px-2 font-bold text-blue-700">
                          <button
                            className="text-left underline-offset-2 hover:underline"
                            onClick={() => setSelectedAssetId(ln.line_id)}
                            aria-label={`Inspect ${ln.name} in the telemetry table`}
                          >
                            {ln.line_id}
                          </button>
                        </td>
                        <td className="py-2 px-2 text-slate-600">
                          {ln.from_bus} → {ln.to_bus}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={
                              ln.status === "OUT_OF_SERVICE"
                                ? "text-red-700 font-bold"
                                : "text-teal-700"
                            }
                          >
                            {ln.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {ln.p_from_mw.toFixed(2)} MW
                        </td>
                        <td className="py-2 px-2">
                          {ln.loading_percent.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2">{ln.pl_mw.toFixed(4)} MW</td>
                        <td className="py-2 px-2">
                          <button
                            disabled={unavailable}
                            onClick={(e) => {
                              e.stopPropagation();
                              applyAction(
                                ln.status === "OUT_OF_SERVICE"
                                  ? "CLEAR_FAULT"
                                  : "INJECT_FAULT",
                                ln.line_id,
                              );
                            }}
                            className="rounded bg-slate-100 hover:bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200"
                          >
                            {ln.status === "OUT_OF_SERVICE"
                              ? "Reclose"
                              : "Trip"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bottomTab === "COMPARE" && (
              <div className="overflow-x-auto">
                <p className="text-xs text-slate-500 mb-3">
                  Load percentages include attempted supply. Only rows marked
                  feasible pass AC checks; graph connectivity alone does not
                  verify supply.
                </p>
                {comparisonResult?.comparison_table ? (
                  <table className="w-full text-left font-sans text-xs">
                    <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2">Algorithm</th>
                        <th className="py-2 px-2">AC Feasible</th>
                        <th className="py-2 px-2">Attempted Critical (%)</th>
                        <th className="py-2 px-2">Attempted Total (%)</th>
                        <th className="py-2 px-2">Min V (pu)</th>
                        <th className="py-2 px-2">Max Load (%)</th>
                        <th className="py-2 px-2">Switches</th>
                        <th className="py-2 px-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {comparisonResult.comparison_table.map((row: any) => (
                        <tr key={row.strategy} className="hover:bg-slate-100">
                          <td className="py-2 px-2 font-bold text-blue-700">
                            {row.strategy}
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                                row.feasible && row.ac_validated
                                  ? "bg-teal-50 text-teal-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {row.feasible && row.ac_validated
                                ? "FEASIBLE"
                                : "UNVERIFIED"}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold text-teal-700">
                            {row.critical_load_restored_pct?.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2">
                            {row.total_load_restored_pct?.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2">
                            {row.min_voltage_pu?.toFixed(4)} pu
                          </td>
                          <td className="py-2 px-2">
                            {row.max_line_loading_pct?.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2">{row.switching_count}</td>
                          <td className="py-2 px-2 font-bold text-blue-700">
                            {row.objective_score?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-500 py-4">
                    Click &ldquo;Run 5-Algorithm Live Comparison&rdquo; to
                    evaluate CAPER, Priority-Greedy, Graph-Greedy, AC-Greedy,
                    and MILP-Reference on the current fault state.
                  </p>
                )}
              </div>
            )}

            {bottomTab === "LOG" && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto font-sans text-xs">
                {session.action_log
                  .slice()
                  .reverse()
                  .map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 border border-slate-200"
                    >
                      <span className="text-blue-700 font-semibold">
                        [Rev #{entry.revision}] {entry.action}
                      </span>
                      <span className="text-slate-600">
                        {entry.description}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </details>
        </div>

        {/* Right Column: Live Engineering Inspector & CAPER Controls */}
        <div className="lg:col-span-4 min-w-0 presentation-hide">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}

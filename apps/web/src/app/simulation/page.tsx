"use client";

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
    fetchSession,
    selectedAssetId,
    setSelectedAssetId,
    applyAction,
    compareRestorations,
    comparisonResult,
  } = useSimulationStore();

  const [bottomTab, setBottomTab] = useState<"BUILDINGS" | "CORRIDORS" | "COMPARE" | "LOG">(
    "BUILDINGS"
  );

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const kpis = session.kpis;
  const pb = session.power_flow?.power_balance;

  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-4">
      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5 font-mono">
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">SURVIVAL INDEX</div>
          <div className="text-lg font-extrabold text-cyan-300">
            {kpis.city_survival_index.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400">Weighted City Health</div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">CRITICAL SERVED</div>
          <div className="text-lg font-extrabold text-emerald-400">
            {kpis.critical_load_restored_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400">
            {kpis.critical_served_mw.toFixed(2)} / {kpis.critical_demand_mw.toFixed(2)} MW
          </div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">TOTAL LOAD SERVED</div>
          <div className="text-lg font-extrabold text-white">
            {kpis.total_load_restored_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400">
            {kpis.total_served_mw.toFixed(2)} / {kpis.total_demand_mw.toFixed(2)} MW
          </div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">GENERATION / LOSS</div>
          <div className="text-lg font-extrabold text-cyan-300">
            {kpis.total_generation_mw.toFixed(2)} MW
          </div>
          <div className="text-[10px] text-slate-400">
            I²R Loss: {kpis.total_losses_mw.toFixed(3)} MW
          </div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">MIN BUS VOLTAGE</div>
          <div
            className={`text-lg font-extrabold ${
              kpis.min_voltage_pu >= 0.94
                ? "text-emerald-400"
                : kpis.min_voltage_pu >= 0.91
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {kpis.min_voltage_pu.toFixed(4)} pu
          </div>
          <div className="text-[10px] text-slate-400">
            Max: {kpis.max_voltage_pu.toFixed(4)} pu
          </div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">PEAK LINE LOADING</div>
          <div
            className={`text-lg font-extrabold ${
              kpis.max_line_loading_pct <= 85
                ? "text-emerald-400"
                : kpis.max_line_loading_pct <= 100
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {kpis.max_line_loading_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400">Thermal Ceiling: 100%</div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">ENERGIZED BUSES</div>
          <div className="text-lg font-extrabold text-sky-300">
            {kpis.energized_buses_count} / {kpis.total_buses_count}
          </div>
          <div className="text-[10px] text-slate-400">
            Faults: {kpis.active_faults_count}
          </div>
        </div>
        <div className="scada-panel rounded-lg p-3">
          <div className="text-[10px] text-slate-400">AC NR SOLVER</div>
          <div className="text-lg font-extrabold text-emerald-400">
            {pb?.converged ? "CONVERGED" : "DIVERGED"}
          </div>
          <div className="text-[10px] text-slate-400">
            {pb?.iterations || 3} iter • ΔP={pb?.balance_error_mw?.toFixed(4) || "0.0001"} MW
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Left 3D City + Bottom Telemetry Tables | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-4">
          <CityCanvas3D heightClass="h-[540px]" />

          {/* Bottom Interactive Telemetry & Multi-Algorithm Comparison Drawer */}
          <div className="scada-panel rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ["BUILDINGS", `City Facilities (${session.buildings_3d.length})`],
                    ["CORRIDORS", `Feeder Corridors (${session.power_flow.lines.length})`],
                    ["COMPARE", "CAPER vs. 4 Baselines"],
                    ["LOG", `Operator Action Log (${session.action_log.length})`],
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
                    className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                      bottomTab === id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setBottomTab("COMPARE");
                  compareRestorations();
                }}
                className="rounded bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 px-3 py-1 font-mono text-xs text-violet-200 transition"
              >
                Run 5-Algorithm Live Comparison
              </button>
            </div>

            {bottomTab === "BUILDINGS" && (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {session.buildings_3d.map((b) => (
                      <tr
                        key={b.building_id}
                        onClick={() => setSelectedAssetId(b.bus_id)}
                        className={`cursor-pointer hover:bg-slate-800/40 ${
                          selectedAssetId === b.bus_id ? "bg-cyan-950/30" : ""
                        }`}
                      >
                        <td className="py-2 px-2 font-bold text-cyan-300">{b.bus_id}</td>
                        <td className="py-2 px-2 text-slate-200">{b.name}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] ${
                              b.priority_tier === 1
                                ? "bg-emerald-500/20 text-emerald-300"
                                : b.priority_tier === 2
                                ? "bg-sky-500/20 text-sky-300"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            T{b.priority_tier} (w={b.criticality_weight})
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-bold ${
                              b.power_state === "BLACKOUT"
                                ? "text-red-400"
                                : b.power_state === "CURTAILED"
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {b.power_state}
                          </span>
                        </td>
                        <td className="py-2 px-2">{(b.voltage_pu ?? 0).toFixed(4)} pu</td>
                        <td className="py-2 px-2">
                          {(b.served_mw ?? 0).toFixed(2)} / {(b.demand_mw ?? 0).toFixed(2)} MW
                        </td>
                        <td className="py-2 px-2">
                          {b.demand_mw > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                applyAction(
                                  b.curtailed_mw > 0 ? "RESTORE_LOAD" : "CURTAIL_LOAD",
                                  b.bus_id,
                                  Math.max(0.2, +(b.demand_mw - b.critical_load_mw).toFixed(2))
                                );
                              }}
                              className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-amber-300 border border-slate-700"
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
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {session.power_flow.lines.map((ln) => (
                      <tr
                        key={ln.line_id}
                        onClick={() => setSelectedAssetId(ln.line_id)}
                        className="cursor-pointer hover:bg-slate-800/40"
                      >
                        <td className="py-2 px-2 font-bold text-cyan-300">{ln.line_id}</td>
                        <td className="py-2 px-2 text-slate-300">
                          {ln.from_bus} → {ln.to_bus}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={
                              ln.status === "OUT_OF_SERVICE" ? "text-red-400 font-bold" : "text-emerald-400"
                            }
                          >
                            {ln.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">{ln.p_from_mw.toFixed(2)} MW</td>
                        <td className="py-2 px-2">{ln.loading_percent.toFixed(1)}%</td>
                        <td className="py-2 px-2">{ln.pl_mw.toFixed(4)} MW</td>
                        <td className="py-2 px-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              applyAction(
                                ln.status === "OUT_OF_SERVICE" ? "CLEAR_FAULT" : "INJECT_FAULT",
                                ln.line_id
                              );
                            }}
                            className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200 border border-slate-700"
                          >
                            {ln.status === "OUT_OF_SERVICE" ? "Reclose" : "Trip"}
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
                {comparisonResult?.comparison_table ? (
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-2">Algorithm</th>
                        <th className="py-2 px-2">AC Feasible</th>
                        <th className="py-2 px-2">Crit Restored (%)</th>
                        <th className="py-2 px-2">Total Restored (%)</th>
                        <th className="py-2 px-2">Min V (pu)</th>
                        <th className="py-2 px-2">Max Load (%)</th>
                        <th className="py-2 px-2">Switches</th>
                        <th className="py-2 px-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {comparisonResult.comparison_table.map((row: any) => (
                        <tr key={row.strategy} className="hover:bg-slate-800/40">
                          <td className="py-2 px-2 font-bold text-violet-300">{row.strategy}</td>
                          <td className="py-2 px-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                row.feasible
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              }`}
                            >
                              {row.feasible ? "FEASIBLE" : "VIOLATION"}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold text-emerald-300">
                            {row.critical_load_restored_pct?.toFixed(1)}%
                          </td>
                          <td className="py-2 px-2">{row.total_load_restored_pct?.toFixed(1)}%</td>
                          <td className="py-2 px-2">{row.min_voltage_pu?.toFixed(4)} pu</td>
                          <td className="py-2 px-2">{row.max_line_loading_pct?.toFixed(1)}%</td>
                          <td className="py-2 px-2">{row.switching_count}</td>
                          <td className="py-2 px-2 font-bold text-cyan-300">
                            {row.objective_score?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-400 py-4">
                    Click &ldquo;Run 5-Algorithm Live Comparison&rdquo; to evaluate CAPER, Priority-Greedy, Graph-Greedy, AC-Greedy, and MILP-Reference on the current fault state.
                  </p>
                )}
              </div>
            )}

            {bottomTab === "LOG" && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-xs">
                {session.action_log
                  .slice()
                  .reverse()
                  .map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded bg-[#06090F] px-3 py-1.5 border border-slate-800/80"
                    >
                      <span className="text-cyan-300 font-semibold">
                        [Rev #{entry.revision}] {entry.action}
                      </span>
                      <span className="text-slate-300">{entry.description}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Engineering Inspector & CAPER Controls */}
        <div className="lg:col-span-4">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}


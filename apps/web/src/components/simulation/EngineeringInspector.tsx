"use client";

import React, { useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  Zap,
  ShieldAlert,
  BatteryCharging,
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wrench,
  Clock,
} from "lucide-react";

export function EngineeringInspector() {
  const {
    session,
    selectedAssetId,
    setSelectedAssetId,
    applyAction,
    runCaper,
    applyRestorationPlan,
    caperResult,
    loading,
  } = useSimulationStore();

  const [customCapMw, setCustomCapMw] = useState<string>(
    session.source_capacity_limit_mw ? String(session.source_capacity_limit_mw) : "7.2"
  );

  const selectedBuilding = session.buildings_3d.find(
    (b) => b.bus_id === selectedAssetId || b.building_id === selectedAssetId
  );
  const selectedLine = session.power_flow?.lines.find((l) => l.line_id === selectedAssetId);
  const selectedBus = session.power_flow?.buses.find((b) => b.bus_id === selectedAssetId);

  return (
    <div className="flex flex-col gap-3">
      {/* Selected Asset Inspector Card */}
      <div className="scada-panel rounded-xl p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Asset Telemetry Inspector
            </h3>
          </div>
          <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/30">
            {selectedAssetId || "BUS-03"}
          </span>
        </div>

        {selectedBuilding ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-white">{selectedBuilding.name}</h4>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                    selectedBuilding.power_state === "BLACKOUT"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : selectedBuilding.power_state === "BACKUP_BATTERY"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : selectedBuilding.power_state === "CURTAILED"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {selectedBuilding.power_state}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                Facility: {selectedBuilding.facility_type} • Tier-{selectedBuilding.priority_tier} (Weight{" "}
                {selectedBuilding.criticality_weight.toFixed(1)})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">BUS VOLTAGE</div>
                <div className="text-sm font-bold text-cyan-300">
                  {selectedBuilding.voltage_pu.toFixed(4)} pu{" "}
                  <span className="text-[10px] text-slate-400">
                    ({(selectedBuilding.voltage_pu * selectedBuilding.voltage_kv).toFixed(2)} kV)
                  </span>
                </div>
              </div>
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">LOAD SERVED / DEMAND</div>
                <div className="text-sm font-bold text-emerald-300">
                  {selectedBuilding.served_mw.toFixed(2)} / {selectedBuilding.demand_mw.toFixed(2)} MW
                </div>
              </div>
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">CRITICAL FLOOR</div>
                <div className="text-sm font-bold text-amber-300">
                  {selectedBuilding.critical_load_mw.toFixed(2)} MW
                </div>
              </div>
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">PHASE ANGLE / GEN</div>
                <div className="text-sm font-bold text-slate-200">
                  {selectedBus ? `${selectedBus.voltage_angle_deg.toFixed(2)}°` : "0.00°"} /{" "}
                  {selectedBuilding.generation_mw.toFixed(2)} MW
                </div>
              </div>
            </div>

            {/* Direct Load Curtailment / Restoration Controls */}
            {selectedBuilding.demand_mw > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() =>
                    applyAction(
                      "CURTAIL_LOAD",
                      selectedBuilding.bus_id,
                      Math.max(0.2, +(selectedBuilding.demand_mw - selectedBuilding.critical_load_mw).toFixed(2))
                    )
                  }
                  disabled={loading}
                  className="flex-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1.5 font-mono text-xs text-amber-200 transition"
                >
                  Shed Non-Critical Load
                </button>
                <button
                  onClick={() => applyAction("RESTORE_LOAD", selectedBuilding.bus_id)}
                  disabled={loading}
                  className="flex-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-2.5 py-1.5 font-mono text-xs text-emerald-200 transition"
                >
                  Restore 100% Load
                </button>
              </div>
            )}
          </div>
        ) : selectedLine ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-white">{selectedLine.name}</h4>
                <p className="font-mono text-[11px] text-slate-400">
                  Corridor: {selectedLine.from_bus} → {selectedLine.to_bus}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                  selectedLine.status === "OUT_OF_SERVICE"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                }`}
              >
                {selectedLine.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">ACTIVE / REACTIVE FLOW</div>
                <div className="text-sm font-bold text-cyan-300">
                  {selectedLine.p_from_mw.toFixed(2)} MW / {selectedLine.q_from_mvar.toFixed(2)} MVAr
                </div>
              </div>
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">THERMAL LOADING</div>
                <div className="text-sm font-bold text-amber-300">
                  {selectedLine.loading_percent.toFixed(1)}% ({selectedLine.i_ka.toFixed(3)} kA)
                </div>
              </div>
              <div className="rounded bg-[#06090F] p-2 border border-slate-800/80 col-span-2">
                <div className="text-[10px] text-slate-400">OHMIC LOSSES (I²R)</div>
                <div className="text-sm font-bold text-slate-200">
                  {selectedLine.pl_mw.toFixed(4)} MW / {selectedLine.ql_mvar.toFixed(4)} MVAr
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {selectedLine.status === "OUT_OF_SERVICE" ? (
                <button
                  onClick={() => applyAction("CLEAR_FAULT", selectedLine.line_id)}
                  disabled={loading}
                  className="w-full rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-3 py-1.5 font-mono text-xs text-emerald-200 transition"
                >
                  Clear Fault / Reclose Corridor {selectedLine.line_id}
                </button>
              ) : (
                <button
                  onClick={() => applyAction("INJECT_FAULT", selectedLine.line_id)}
                  disabled={loading}
                  className="w-full rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-3 py-1.5 font-mono text-xs text-red-200 transition"
                >
                  Inject Physical Fault on {selectedLine.line_id}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Click any 3D building, substation, or feeder corridor in the city viewport to inspect live AC power-flow telemetry.
          </p>
        )}
      </div>

      {/* Fault Injection & Upstream Supply Constraint Controls */}
      <div className="scada-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Disturbance & Constraint Controls
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Rev #{session.revision} • T+{session.sim_time_minutes}m
          </span>
        </div>

        {/* Quick Fault Injection Buttons */}
        <div>
          <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1.5">
            Inject / Clear Feeder Trunk Faults:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {session.power_flow.lines
              .filter((l) => !l.line_id.includes("TIE"))
              .slice(0, 6)
              .map((ln) => {
                const isOut = ln.status === "OUT_OF_SERVICE";
                return (
                  <button
                    key={ln.line_id}
                    onClick={() =>
                      applyAction(isOut ? "CLEAR_FAULT" : "INJECT_FAULT", ln.line_id)
                    }
                    className={`flex items-center justify-between rounded px-2.5 py-1.5 font-mono text-[11px] border transition ${
                      isOut
                        ? "bg-red-500/25 border-red-500/60 text-red-200"
                        : "bg-[#06090F] border-slate-800 text-slate-300 hover:border-red-500/40"
                    }`}
                  >
                    <span>{ln.line_id}</span>
                    <span className="text-[9px] font-bold">
                      {isOut ? "FAULTED (CLEAR)" : "TRIP"}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Battery Energy Storage Dispatch Controls */}
        {session.batteries.length > 0 && (
          <div>
            <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1.5">
              Battery Energy Storage Systems (Discrete kW / kWh):
            </label>
            <div className="space-y-2">
              {session.batteries.map((bess) => (
                <div
                  key={bess.battery_id}
                  className="rounded-lg bg-[#06090F] p-2.5 border border-slate-800/90 space-y-1.5"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-1">
                      <BatteryCharging className="h-3.5 w-3.5" /> {bess.battery_id} ({bess.bus_id})
                    </span>
                    <span className="text-emerald-300">
                      SOC: {bess.soc_percent.toFixed(1)}% ({bess.soc_kwh.toFixed(0)}/
                      {bess.capacity_kwh.toFixed(0)} kWh)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, Math.round(bess.max_discharge_kw * 0.5), Math.round(bess.max_discharge_kw)].map(
                      (kw) => (
                        <button
                          key={kw}
                          onClick={() => applyAction("DISPATCH_BATTERY", bess.battery_id, kw)}
                          className={`flex-1 rounded py-1 font-mono text-[10px] border transition ${
                            Math.abs(bess.current_dispatch_kw - kw) < 25
                              ? "bg-sky-500/25 border-sky-400 text-sky-200 font-bold"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {kw === 0 ? "Idle (0 kW)" : `Discharge ${kw} kW`}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upstream Substation Capacity Limit */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1">
            <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">
              Substation Supply Ceiling (MW):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.2"
                value={customCapMw}
                onChange={(e) => setCustomCapMw(e.target.value)}
                className="w-24 rounded bg-[#06090F] px-2.5 py-1 font-mono text-xs text-cyan-300 border border-slate-800"
              />
              <button
                onClick={() =>
                  applyAction("SET_SOURCE_CAPACITY", "BUS-01", parseFloat(customCapMw) || 7.2)
                }
                className="rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 font-mono text-[11px] text-amber-200 transition"
              >
                Enforce Limit
              </button>
              <button
                onClick={() => applyAction("SET_SOURCE_CAPACITY", "BUS-01", 0)}
                className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 font-mono text-[11px] text-slate-300 transition"
              >
                Uncap
              </button>
            </div>
          </div>
          <button
            onClick={() => applyAction("ADVANCE_TIME", "CLOCK", 0.25)}
            title="Advance Simulation Clock by +15 Minutes (updates BESS kWh)"
            className="mt-4 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 font-mono text-[11px] text-slate-200 transition"
          >
            <Clock className="h-3.5 w-3.5 text-cyan-400" /> +15m
          </button>
        </div>
      </div>

      {/* CAPER Autonomous Restoration Co-Pilot Card */}
      <div className="scada-panel rounded-xl p-4 border-violet-500/40 bg-gradient-to-br from-[#0B111C] to-[#131129]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-violet-200">
              CAPER 8-Stage Restoration Co-Pilot
            </h3>
          </div>
          <span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[10px] text-violet-300 border border-violet-500/40">
            Graph + DP + AC NR
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-3">
          Synthesizes tie-switch paths (Dijkstra/Kruskal), critical load triage (Knapsack DP), and BESS dispatch, verified under full Newton-Raphson AC power flow.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runCaper()}
            disabled={loading}
            className="flex-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/45 border border-violet-400/50 py-2 font-mono text-xs font-bold text-violet-100 transition"
          >
            Analyze with CAPER
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/45 border border-emerald-400/50 py-2 font-mono text-xs font-bold text-emerald-100 transition"
          >
            Execute CAPER Plan
          </button>
        </div>

        {caperResult?.selected_candidate && (
          <div className="mt-3 rounded-lg bg-[#06090F]/90 p-3 border border-violet-500/30 space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-violet-300">
                Selected: {caperResult.selected_candidate.candidate_id}
              </span>
              <span className="text-emerald-400 font-bold">
                Score {caperResult.selected_candidate.objective_score?.toFixed(1)}
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Critical Restored:{" "}
              <strong className="text-emerald-300">
                {caperResult.selected_candidate.critical_load_restored_pct?.toFixed(1)}%
              </strong>{" "}
              • Min V:{" "}
              <strong className="text-cyan-300">
                {caperResult.selected_candidate.min_voltage_pu?.toFixed(3)} pu
              </strong>
            </div>
            <div className="space-y-1 pt-1 border-t border-slate-800">
              {(caperResult.selected_candidate.actions || []).map((a: any, i: number) => (
                <div key={i} className="text-[10px] text-slate-300 flex items-center gap-1.5">
                  <span className="text-violet-400">→</span>
                  <span>{a.description || `${a.action_type} ${a.target_id}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


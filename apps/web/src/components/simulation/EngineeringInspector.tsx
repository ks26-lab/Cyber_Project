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

  const [tab, setTab] = useState("Summary");
  const [customCapMw, setCustomCapMw] = useState<string>(
    session.source_capacity_limit_mw
      ? String(session.source_capacity_limit_mw)
      : "7.2",
  );

  const selectedBuilding = session.buildings_3d.find(
    (b) => b.bus_id === selectedAssetId || b.building_id === selectedAssetId,
  );
  const selectedLine = session.power_flow?.lines.find(
    (l) => l.line_id === selectedAssetId,
  );
  const selectedBus = session.power_flow?.buses.find(
    (b) => b.bus_id === selectedAssetId,
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Inspector"
        className="flex gap-2 flex-wrap"
      >
        {["Summary", "Electrical", "Restoration", "Notes"].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            className="quiet-button"
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Notes" && (
        <div className="scada-panel rounded-xl p-5">
          <h3>Operator notes</h3>
          <p className="text-sm text-slate-500 mt-3">
            Select a facility or corridor in the city. Electrical controls
            change the current model; restoration plans are checked against AC
            power-flow constraints.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Revision {session.revision} · T+{session.sim_time_minutes} minutes
          </p>
        </div>
      )}
      {/* Selected Asset Inspector Card */}
      <div hidden={tab !== "Summary"} className="scada-panel rounded-xl p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-700" />
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-700">
              Asset Telemetry Inspector
            </h3>
          </div>
          <span className="rounded bg-blue-50 px-2 py-0.5 font-sans text-xs text-blue-700 border border-blue-200">
            {selectedAssetId || "BUS-03"}
          </span>
        </div>

        {selectedBuilding ? (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-slate-900">
                  {selectedBuilding.name}
                </h4>
                <span
                  className={`rounded px-2 py-0.5 font-sans text-xs font-bold ${
                    selectedBuilding.power_state === "BLACKOUT"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : selectedBuilding.power_state === "BACKUP_BATTERY"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : selectedBuilding.power_state === "CURTAILED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-teal-50 text-teal-700 border border-teal-200"
                  }`}
                >
                  {selectedBuilding.power_state}
                </span>
              </div>
              <p className="font-sans text-xs text-slate-500 mt-0.5">
                Facility: {selectedBuilding.facility_type} • Tier-
                {selectedBuilding.priority_tier} (Weight{" "}
                {selectedBuilding.criticality_weight.toFixed(1)})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans text-xs">
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">BUS VOLTAGE</div>
                <div className="text-sm font-bold text-blue-700">
                  {selectedBuilding.voltage_pu.toFixed(4)} pu{" "}
                  <span className="text-xs text-slate-500">
                    (
                    {(
                      selectedBuilding.voltage_pu * selectedBuilding.voltage_kv
                    ).toFixed(2)}{" "}
                    kV)
                  </span>
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">
                  LOAD SERVED / DEMAND
                </div>
                <div className="text-sm font-bold text-teal-700">
                  {selectedBuilding.served_mw.toFixed(2)} /{" "}
                  {selectedBuilding.demand_mw.toFixed(2)} MW
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">CRITICAL FLOOR</div>
                <div className="text-sm font-bold text-amber-700">
                  {selectedBuilding.critical_load_mw.toFixed(2)} MW
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">PHASE ANGLE / GEN</div>
                <div className="text-sm font-bold text-slate-700">
                  {selectedBus
                    ? `${selectedBus.voltage_angle_deg.toFixed(2)}°`
                    : "0.00°"}{" "}
                  / {selectedBuilding.generation_mw.toFixed(2)} MW
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
                      Math.max(
                        0.2,
                        +(
                          selectedBuilding.demand_mw -
                          selectedBuilding.critical_load_mw
                        ).toFixed(2),
                      ),
                    )
                  }
                  disabled={loading}
                  className="flex-1 rounded bg-amber-50 hover:bg-amber-50 border border-amber-200 px-2.5 py-1.5 font-sans text-xs text-amber-700 transition"
                >
                  Shed Non-Critical Load
                </button>
                <button
                  onClick={() =>
                    applyAction("RESTORE_LOAD", selectedBuilding.bus_id)
                  }
                  disabled={loading}
                  className="flex-1 rounded bg-teal-50 hover:bg-teal-50 border border-teal-200 px-2.5 py-1.5 font-sans text-xs text-teal-700 transition"
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
                <h4 className="font-semibold text-sm text-slate-900">
                  {selectedLine.name}
                </h4>
                <p className="font-sans text-xs text-slate-500">
                  Corridor: {selectedLine.from_bus} → {selectedLine.to_bus}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-sans text-xs font-bold ${
                  selectedLine.status === "OUT_OF_SERVICE"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {selectedLine.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-sans text-xs">
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">
                  ACTIVE / REACTIVE FLOW
                </div>
                <div className="text-sm font-bold text-blue-700">
                  {selectedLine.p_from_mw.toFixed(2)} MW /{" "}
                  {selectedLine.q_from_mvar.toFixed(2)} MVAr
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <div className="text-xs text-slate-500">THERMAL LOADING</div>
                <div className="text-sm font-bold text-amber-700">
                  {selectedLine.loading_percent.toFixed(1)}% (
                  {selectedLine.i_ka.toFixed(3)} kA)
                </div>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200 col-span-2">
                <div className="text-xs text-slate-500">OHMIC LOSSES (I²R)</div>
                <div className="text-sm font-bold text-slate-700">
                  {selectedLine.pl_mw.toFixed(4)} MW /{" "}
                  {selectedLine.ql_mvar.toFixed(4)} MVAr
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {selectedLine.status === "OUT_OF_SERVICE" ? (
                <button
                  onClick={() =>
                    applyAction("CLEAR_FAULT", selectedLine.line_id)
                  }
                  disabled={loading}
                  className="w-full rounded bg-teal-50 hover:bg-teal-50 border border-teal-200 px-3 py-1.5 font-sans text-xs text-teal-700 transition"
                >
                  Clear Fault / Reclose Corridor {selectedLine.line_id}
                </button>
              ) : (
                <button
                  onClick={() =>
                    applyAction("INJECT_FAULT", selectedLine.line_id)
                  }
                  disabled={loading}
                  className="w-full rounded bg-red-50 hover:bg-red-50 border border-red-200 px-3 py-1.5 font-sans text-xs text-red-700 transition"
                >
                  Inject Physical Fault on {selectedLine.line_id}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Click any 3D building, substation, or feeder corridor in the city
            viewport to inspect live AC power-flow telemetry.
          </p>
        )}
      </div>

      {/* Fault Injection & Upstream Supply Constraint Controls */}
      <div
        hidden={tab !== "Electrical"}
        className="scada-panel rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-700" />
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-700">
              Disturbance & Constraint Controls
            </h3>
          </div>
          <span className="font-sans text-xs text-slate-500">
            Rev #{session.revision} • T+{session.sim_time_minutes}m
          </span>
        </div>

        {/* Quick Fault Injection Buttons */}
        <div>
          <label className="block font-sans text-xs uppercase text-slate-500 mb-1.5">
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
                      applyAction(
                        isOut ? "CLEAR_FAULT" : "INJECT_FAULT",
                        ln.line_id,
                      )
                    }
                    className={`flex items-center justify-between rounded px-2.5 py-1.5 font-sans text-xs border transition ${
                      isOut
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-red-200"
                    }`}
                  >
                    <span>{ln.line_id}</span>
                    <span className="text-xs font-bold">
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
            <label className="block font-sans text-xs uppercase text-slate-500 mb-1.5">
              Battery Energy Storage Systems (Discrete kW / kWh):
            </label>
            <div className="space-y-2">
              {session.batteries.map((bess) => (
                <div
                  key={bess.battery_id}
                  className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between font-sans text-xs">
                    <span className="font-bold text-blue-700 flex items-center gap-1">
                      <BatteryCharging className="h-3.5 w-3.5" />{" "}
                      {bess.battery_id} ({bess.bus_id})
                    </span>
                    <span className="text-teal-700">
                      SOC: {bess.soc_percent.toFixed(1)}% (
                      {bess.soc_kwh.toFixed(0)}/{bess.capacity_kwh.toFixed(0)}{" "}
                      kWh)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      0,
                      Math.round(bess.max_discharge_kw * 0.5),
                      Math.round(bess.max_discharge_kw),
                    ].map((kw) => (
                      <button
                        key={kw}
                        onClick={() =>
                          applyAction("DISPATCH_BATTERY", bess.battery_id, kw)
                        }
                        className={`flex-1 rounded py-1 font-sans text-xs border transition ${
                          Math.abs(bess.current_dispatch_kw - kw) < 25
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                            : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {kw === 0 ? "Idle (0 kW)" : `Discharge ${kw} kW`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upstream Substation Capacity Limit */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1">
            <label className="block font-sans text-xs uppercase text-slate-500 mb-1">
              Substation Supply Ceiling (MW):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.2"
                value={customCapMw}
                onChange={(e) => setCustomCapMw(e.target.value)}
                className="w-24 rounded bg-slate-50 px-2.5 py-1 font-sans text-xs text-blue-700 border border-slate-200"
              />
              <button
                onClick={() =>
                  applyAction(
                    "SET_SOURCE_CAPACITY",
                    "BUS-01",
                    parseFloat(customCapMw) || 7.2,
                  )
                }
                className="rounded bg-amber-50 hover:bg-amber-50 border border-amber-200 px-2.5 py-1 font-sans text-xs text-amber-700 transition"
              >
                Enforce Limit
              </button>
              <button
                onClick={() => applyAction("SET_SOURCE_CAPACITY", "BUS-01", 0)}
                className="rounded bg-slate-100 hover:bg-slate-100 px-2 py-1 font-sans text-xs text-slate-600 transition"
              >
                Uncap
              </button>
            </div>
          </div>
          <button
            onClick={() => applyAction("ADVANCE_TIME", "CLOCK", 0.25)}
            title="Advance Simulation Clock by +15 Minutes (updates BESS kWh)"
            className="mt-4 flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 font-sans text-xs text-slate-700 transition"
          >
            <Clock className="h-3.5 w-3.5 text-blue-700" /> +15m
          </button>
        </div>
      </div>

      {/* CAPER Autonomous Restoration Co-Pilot Card */}
      <div
        hidden={tab !== "Restoration"}
        className="scada-panel rounded-xl p-4 border-blue-200 bg-gradient-to-br from-[#0B111C] to-[#131129]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-700" />
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-blue-700">
              CAPER 8-Stage Restoration Co-Pilot
            </h3>
          </div>
          <span className="rounded bg-blue-50 px-2 py-0.5 font-sans text-xs text-blue-700 border border-blue-200">
            Graph + DP + AC NR
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          Synthesizes tie-switch paths (Dijkstra/Kruskal), critical load triage
          (Knapsack DP), and BESS dispatch, verified under full Newton-Raphson
          AC power flow.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runCaper()}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-50 hover:bg-blue-50 border border-blue-200 py-2 font-sans text-xs font-bold text-blue-700 transition"
          >
            Analyze with CAPER
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            disabled={loading}
            className="flex-1 rounded-lg bg-teal-50 hover:bg-teal-50 border border-teal-200 py-2 font-sans text-xs font-bold text-teal-700 transition"
          >
            Execute CAPER Plan
          </button>
        </div>

        {caperResult?.selected_candidate && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-blue-200 space-y-1.5 font-sans text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-700">
                Selected: {caperResult.selected_candidate.candidate_id}
              </span>
              <span className="text-teal-700 font-bold">
                Score{" "}
                {caperResult.selected_candidate.objective_score?.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-slate-600">
              Critical Restored:{" "}
              <strong className="text-teal-700">
                {caperResult.selected_candidate.critical_load_restored_pct?.toFixed(
                  1,
                )}
                %
              </strong>{" "}
              • Min V:{" "}
              <strong className="text-blue-700">
                {caperResult.selected_candidate.min_voltage_pu?.toFixed(3)} pu
              </strong>
            </div>
            <div className="space-y-1 pt-1 border-t border-slate-200">
              {(caperResult.selected_candidate.actions || []).map(
                (a: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs text-slate-600 flex items-center gap-1.5"
                  >
                    <span className="text-blue-700">→</span>
                    <span>
                      {a.description || `${a.action_type} ${a.target_id}`}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

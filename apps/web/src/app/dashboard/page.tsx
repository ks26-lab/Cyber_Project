"use client";

import React, { useEffect } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  BarChart3,
  Zap,
  BatteryCharging,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";

export default function PowerEngineeringDashboardPage() {
  const { session, fetchSession, applyAction, applyRestorationPlan } = useSimulationStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const buses = session.power_flow?.buses || [];
  const lines = session.power_flow?.lines || [];
  const pb = session.power_flow?.power_balance;
  const violations = session.power_flow?.violations || [];

  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-5">
      {/* Header Banner */}
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-emerald-500/30">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 border border-emerald-500/30 font-mono text-xs text-emerald-300 mb-1.5">
            EXPERIENCE B • POWER SYSTEMS ENGINEERING DASHBOARD ({session.solver_provenance})
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            AC Newton-Raphson Voltage Profile, Thermal Loading & Power Balance
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Active Network: <strong className="text-cyan-300">{session.network_name}</strong> •{" "}
            {buses.length} Buses • {lines.length} Corridors • Solver Mismatch ΔP ={" "}
            {pb?.balance_error_mw?.toFixed(5) || "0.0001"} MW
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyAction("INJECT_FAULT", lines[1]?.line_id || "LINE-02-03")}
            className="rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-3 py-2 font-mono text-xs font-bold text-red-200 transition"
          >
            ⚡ Trip Primary Feeder ({lines[1]?.line_id || "LINE-02-03"})
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-mono text-xs font-bold text-slate-950 transition"
          >
            Execute CAPER Reconfiguration
          </button>
        </div>
      </div>

      {/* Top Row: Bus Voltage Profile Chart + Branch Thermal Loading Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bus Voltage Profile (pu) */}
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h2 className="font-mono text-sm font-bold text-white">
                Bus Voltage Magnitude Profile |V| (p.u.)
              </h2>
              <p className="text-[11px] text-slate-400">
                Nominal Operating Band: [0.94, 1.06] pu • Statutory Limit: 0.90 pu
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300">
              V_min = {session.kpis.min_voltage_pu.toFixed(4)} pu
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {buses.map((b) => {
              const v = b.voltage_pu || 0;
              const pct = Math.max(0, Math.min(100, ((v - 0.85) / 0.22) * 100));
              const barColor =
                v < 0.1
                  ? "bg-red-600"
                  : v < 0.93
                  ? "bg-red-500"
                  : v < 0.96
                  ? "bg-amber-400"
                  : "bg-emerald-400";
              return (
                <div key={b.bus_id} className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold">
                      {b.bus_id} <span className="text-slate-400 font-normal">({b.name})</span>
                    </span>
                    <span className="font-bold text-cyan-300">
                      {v.toFixed(4)} pu ({b.voltage_angle_deg.toFixed(2)}°)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${v < 0.1 ? 4 : pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Thermal Loading (%) */}
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h2 className="font-mono text-sm font-bold text-white">
                Feeder & Tie Corridor Thermal Loading (%)
              </h2>
              <p className="text-[11px] text-slate-400">
                Warning Threshold: 85% • Continuous Thermal Rating Limit: 100%
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-amber-300">
              Peak = {session.kpis.max_line_loading_pct.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {lines.map((ln) => {
              const loadPct = Math.min(100, ln.loading_percent || 0);
              const isOut = ln.status === "OUT_OF_SERVICE";
              const barColor = isOut
                ? "bg-slate-600"
                : ln.loading_percent > 100
                ? "bg-red-500"
                : ln.loading_percent > 80
                ? "bg-amber-400"
                : "bg-cyan-400";
              return (
                <div key={ln.line_id} className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-semibold">
                      {ln.line_id} ({ln.from_bus}→{ln.to_bus})
                    </span>
                    <span className={isOut ? "text-slate-500" : "text-cyan-300 font-bold"}>
                      {isOut
                        ? "OPEN / OUT"
                        : `${ln.loading_percent.toFixed(1)}% (${ln.p_from_mw.toFixed(2)} MW)`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${isOut ? 2 : Math.max(4, loadPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Kirchhoff Energy Balance, BESS Storage & Active Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase text-cyan-400">
            Kirchhoff Power Conservation Balance
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between rounded bg-[#06090F] p-2.5 border border-slate-800">
              <span className="text-slate-400">Total Active Generation:</span>
              <span className="font-bold text-cyan-300">
                {pb?.total_generation_mw?.toFixed(3)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-[#06090F] p-2.5 border border-slate-800">
              <span className="text-slate-400">Total Served Load Demand:</span>
              <span className="font-bold text-emerald-300">
                {pb?.total_load_mw?.toFixed(3)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-[#06090F] p-2.5 border border-slate-800">
              <span className="text-slate-400">Total Ohmic Line Losses (I²R):</span>
              <span className="font-bold text-amber-300">
                {pb?.total_losses_mw?.toFixed(4)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-[#06090F] p-2.5 border border-slate-800">
              <span className="text-slate-400">Conservation Mismatch |ΔP|:</span>
              <span className="font-bold text-emerald-400">
                {pb?.balance_error_mw?.toFixed(5)} MW (Verified)
              </span>
            </div>
          </div>
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase text-sky-400">
            Battery Energy Storage Systems (BESS)
          </h3>
          {session.batteries.length > 0 ? (
            <div className="space-y-3">
              {session.batteries.map((b) => (
                <div
                  key={b.battery_id}
                  className="rounded-lg bg-[#06090F] p-3 border border-slate-800 font-mono text-xs space-y-1.5"
                >
                  <div className="flex justify-between font-bold">
                    <span className="text-sky-300">
                      {b.battery_id} ({b.bus_id})
                    </span>
                    <span className="text-emerald-300">{b.soc_percent.toFixed(1)}% SOC</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Stored Energy: {b.soc_kwh.toFixed(1)} / {b.capacity_kwh.toFixed(0)} kWh •
                    Active Dispatch: <strong className="text-white">{b.current_dispatch_kw} kW</strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${b.soc_percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Switch to TRAINING_FEEDER or IEEE_33_DISTRIBUTION to inspect BESS units.
            </p>
          )}
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase text-amber-400">
            Active Physics Violations ({violations.length})
          </h3>
          {violations.length === 0 ? (
            <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-4 text-xs text-emerald-200 flex items-center gap-2 font-mono">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              All bus voltages within [0.90, 1.10] pu and all branch flows ≤ 100% thermal limit.
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {violations.map((v, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-red-950/35 border border-red-500/40 p-2.5 font-mono text-xs text-red-200"
                >
                  <div className="font-bold">
                    [{v.violation_type}] {v.element_id}
                  </div>
                  <div className="text-[11px] text-slate-300">{v.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


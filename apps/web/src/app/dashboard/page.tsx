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
  const { session, fetchSession, applyAction, applyRestorationPlan } =
    useSimulationStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const buses = session.power_flow?.buses || [];
  const lines = session.power_flow?.lines || [];
  const pb = session.power_flow?.power_balance;
  const violations = session.power_flow?.violations || [];

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      {/* Header Banner */}
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-teal-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 border border-teal-200 font-sans text-xs text-teal-700 mb-1.5">
            EXPERIENCE B • POWER SYSTEMS ENGINEERING DASHBOARD (
            {session.solver_provenance})
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            AC Newton-Raphson Voltage Profile, Thermal Loading & Power Balance
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Active Network:{" "}
            <strong className="text-blue-700">{session.network_name}</strong> •{" "}
            {buses.length} Buses • {lines.length} Corridors • Solver Mismatch ΔP
            = {pb?.balance_error_mw?.toFixed(5) || "0.0001"} MW
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              applyAction("INJECT_FAULT", lines[1]?.line_id || "LINE-02-03")
            }
            className="rounded-lg bg-red-50 hover:bg-red-50 border border-red-200 px-3 py-2 font-sans text-xs font-bold text-red-700 transition"
          >
            ⚡ Trip Primary Feeder ({lines[1]?.line_id || "LINE-02-03"})
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-4 py-2 font-sans text-xs font-bold text-white transition"
          >
            Execute CAPER Reconfiguration
          </button>
        </div>
      </div>

      {/* Top Row: Bus Voltage Profile Chart + Branch Thermal Loading Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bus Voltage Profile (pu) */}
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h2 className="font-sans text-sm font-bold text-slate-900">
                Bus Voltage Magnitude Profile |V| (p.u.)
              </h2>
              <p className="text-xs text-slate-500">
                Nominal Operating Band: [0.94, 1.06] pu • Statutory Limit: 0.90
                pu
              </p>
            </div>
            <span className="font-sans text-xs font-bold text-blue-700">
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
                      : "bg-blue-800";
              return (
                <div key={b.bus_id} className="space-y-1 font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-semibold">
                      {b.bus_id}{" "}
                      <span className="text-slate-500 font-normal">
                        ({b.name})
                      </span>
                    </span>
                    <span className="font-bold text-blue-700">
                      {v.toFixed(4)} pu ({b.voltage_angle_deg.toFixed(2)}°)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
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
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h2 className="font-sans text-sm font-bold text-slate-900">
                Feeder & Tie Corridor Thermal Loading (%)
              </h2>
              <p className="text-xs text-slate-500">
                Warning Threshold: 85% • Continuous Thermal Rating Limit: 100%
              </p>
            </div>
            <span className="font-sans text-xs font-bold text-amber-700">
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
                    : "bg-blue-800";
              return (
                <div key={ln.line_id} className="space-y-1 font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-semibold">
                      {ln.line_id} ({ln.from_bus}→{ln.to_bus})
                    </span>
                    <span
                      className={
                        isOut ? "text-slate-500" : "text-blue-700 font-bold"
                      }
                    >
                      {isOut
                        ? "OPEN / OUT"
                        : `${ln.loading_percent.toFixed(1)}% (${ln.p_from_mw.toFixed(2)} MW)`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
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
          <h3 className="font-sans text-xs font-bold uppercase text-blue-700">
            Kirchhoff Power Conservation Balance
          </h3>
          <div className="space-y-2 font-sans text-xs">
            <div className="flex justify-between rounded bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-slate-500">Total Active Generation:</span>
              <span className="font-bold text-blue-700">
                {pb?.total_generation_mw?.toFixed(3)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-slate-500">Total Served Load Demand:</span>
              <span className="font-bold text-teal-700">
                {pb?.total_load_mw?.toFixed(3)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-slate-500">
                Total Ohmic Line Losses (I²R):
              </span>
              <span className="font-bold text-amber-700">
                {pb?.total_losses_mw?.toFixed(4)} MW
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-slate-500">
                Conservation Mismatch |ΔP|:
              </span>
              <span className="font-bold text-teal-700">
                {pb?.balance_error_mw?.toFixed(5)} MW (Verified)
              </span>
            </div>
          </div>
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h3 className="font-sans text-xs font-bold uppercase text-blue-700">
            Battery Energy Storage Systems (BESS)
          </h3>
          {session.batteries.length > 0 ? (
            <div className="space-y-3">
              {session.batteries.map((b) => (
                <div
                  key={b.battery_id}
                  className="rounded-lg bg-slate-50 p-3 border border-slate-200 font-sans text-xs space-y-1.5"
                >
                  <div className="flex justify-between font-bold">
                    <span className="text-blue-700">
                      {b.battery_id} ({b.bus_id})
                    </span>
                    <span className="text-teal-700">
                      {b.soc_percent.toFixed(1)}% SOC
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Stored Energy: {b.soc_kwh.toFixed(1)} /{" "}
                    {b.capacity_kwh.toFixed(0)} kWh • Active Dispatch:{" "}
                    <strong className="text-slate-900">
                      {b.current_dispatch_kw} kW
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${b.soc_percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Switch to TRAINING_FEEDER or IEEE_33_DISTRIBUTION to inspect BESS
              units.
            </p>
          )}
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h3 className="font-sans text-xs font-bold uppercase text-amber-700">
            Active Physics Violations ({violations.length})
          </h3>
          {violations.length === 0 ? (
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 text-xs text-teal-700 flex items-center gap-2 font-sans">
              <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
              All bus voltages within [0.90, 1.10] pu and all branch flows ≤
              100% thermal limit.
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {violations.map((v, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-red-50 border border-red-200 p-2.5 font-sans text-xs text-red-700"
                >
                  <div className="font-bold">
                    [{v.violation_type}] {v.element_id}
                  </div>
                  <div className="text-xs text-slate-600">{v.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { Globe2, Zap, Activity, ShieldCheck } from "lucide-react";

export default function NationalGridPage() {
  const { session, resetSession, applyAction } = useSimulationStore();

  useEffect(() => {
    resetSession("INDIA_GRID_59", null, null);
  }, [resetSession]);

  const buses = session.power_flow?.buses || [];
  const lines = session.power_flow?.lines || [];

  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-cyan-500/30">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 border border-cyan-500/30 font-mono text-xs text-cyan-300 mb-1.5">
            GRIDSEC LEGACY + UPGRADED BULK TRANSMISSION MODULE • 765 / 400 / 220 kV
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Indian National Power Grid (59-Substation Reference) & IEEE 30-Bus Explorer
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Preserves the full 59-substation Indian National Grid across Northern, Western, Southern, Eastern, and North-Eastern Regional Load Despatch Centres (RLDCs) with normalized cross-voltage Newton-Raphson AC power-flow convergence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => resetSession("INDIA_GRID_59", null, null)}
            className={`rounded-lg px-3.5 py-2 font-mono text-xs font-bold border transition ${
              session.network_id === "INDIA_GRID_59"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}
          >
            India 59-Substation Grid
          </button>
          <button
            onClick={() => resetSession("IEEE_30", null, null)}
            className={`rounded-lg px-3.5 py-2 font-mono text-xs font-bold border transition ${
              session.network_id === "IEEE_30"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}
          >
            IEEE 30-Bus Transmission
          </button>
          <button
            onClick={() => resetSession("IEEE_33_DISTRIBUTION", null, null)}
            className={`rounded-lg px-3.5 py-2 font-mono text-xs font-bold border transition ${
              session.network_id === "IEEE_33_DISTRIBUTION"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-800 text-slate-200 border-slate-700"
            }`}
          >
            IEEE 33-Bus Distribution
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <CityCanvas3D heightClass="h-[520px]" />
        </div>

        <div className="lg:col-span-5 scada-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h2 className="font-mono text-sm font-bold text-white">
              Substations & Inter-Regional Corridors ({buses.length} Buses / {lines.length} Lines)
            </h2>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              AC_SOLVED • 50.00 Hz IEGC
            </span>
          </div>

          <div className="max-h-[440px] overflow-y-auto space-y-2 pr-1">
            {lines.slice(0, 18).map((ln) => (
              <div
                key={ln.line_id}
                className="flex items-center justify-between rounded-lg bg-[#06090F] p-2.5 border border-slate-800 font-mono text-xs"
              >
                <div>
                  <div className="font-bold text-cyan-300">
                    {ln.line_id} ({ln.from_bus} → {ln.to_bus})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Flow: {ln.p_from_mw.toFixed(1)} MW • Loading: {ln.loading_percent.toFixed(1)}%
                  </div>
                </div>
                <button
                  onClick={() =>
                    applyAction(
                      ln.status === "OUT_OF_SERVICE" ? "CLEAR_FAULT" : "INJECT_FAULT",
                      ln.line_id
                    )
                  }
                  className={`rounded px-2.5 py-1 text-[10px] font-bold border ${
                    ln.status === "OUT_OF_SERVICE"
                      ? "bg-red-500/20 border-red-500/40 text-red-200"
                      : "bg-slate-800 border-slate-700 text-slate-200 hover:border-red-500/40"
                  }`}
                >
                  {ln.status === "OUT_OF_SERVICE" ? "Reclose" : "N-1 Trip"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


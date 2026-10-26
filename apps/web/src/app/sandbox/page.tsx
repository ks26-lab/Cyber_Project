"use client";

import React from "react";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { EngineeringInspector } from "@/components/simulation/EngineeringInspector";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Wrench, Sparkles, RotateCcw } from "lucide-react";

export default function SandboxPage() {
  const { session, resetSession, applyAction, applyRestorationPlan } =
    useSimulationStore();

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-blue-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 font-sans text-xs text-blue-700 mb-1.5">
            OPEN-ENDED ENGINEERING & TOPOLOGY SANDBOX
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Custom Contingency, BESS Horizon & Radial Reconfiguration Sandbox
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Compose arbitrary N-k fault combinations, test tie-switch closures,
            adjust upstream substation limits, and step discrete-time battery
            discharge across all 4 supported networks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => resetSession("TRAINING_FEEDER", null, null)}
            className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 font-sans text-xs text-blue-700"
          >
            12-Bus Urban Feeder
          </button>
          <button
            onClick={() => resetSession("IEEE_33_DISTRIBUTION", null, null)}
            className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 font-sans text-xs text-blue-700"
          >
            IEEE 33-Bus Benchmark
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            className="rounded-lg bg-blue-800 px-3.5 py-2 font-sans text-xs font-bold text-white"
          >
            Run CAPER Solver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8">
          <CityCanvas3D heightClass="h-[540px]" />
        </div>
        <div className="lg:col-span-4">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}

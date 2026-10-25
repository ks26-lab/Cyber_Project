"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  Zap,
  Play,
  Cpu,
  FlaskConical,
  BarChart3,
  ShieldAlert,
  Swords,
  Globe2,
  Layers,
  CheckCircle2,
  ArrowRight,
  BatteryCharging,
  BookOpen,
} from "lucide-react";

export default function HomePage() {
  const { session, fetchSession, resetSession, applyAction, applyRestorationPlan } =
    useSimulationStore();

  useEffect(() => {
    fetchSession("TRAINING_FEEDER");
  }, [fetchSession]);

  return (
    <div className="flex-1 scada-grid-bg px-4 py-6 lg:px-8 space-y-8">
      {/* Hero Section: Left Narrative & Quick Launch + Right Live 3D City Preview */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 scada-panel rounded-2xl p-6 flex flex-col justify-between border-cyan-500/30">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 border border-cyan-400/30 font-mono text-xs text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              FLAGSHIP CYBER-PHYSICAL RESILIENCE PLATFORM
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                GRID<span className="text-cyan-400">//</span>ZERO
              </h1>
              <p className="font-mono text-sm font-bold tracking-widest uppercase text-emerald-400 mt-1">
                THE CITY MUST STAY ALIVE
              </p>
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                A unified <strong>3D Cyber-Physical City Strategy Game</strong>,{" "}
                <strong>pandapower AC Newton-Raphson Electrical Simulator</strong>, and{" "}
                <strong>13-Algorithm Explainable Graph & CAPER Optimization Research Laboratory</strong>.
              </p>
            </div>

            {/* Key Capability Badges */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono text-xs">
              <div className="rounded-lg bg-[#06090F]/90 p-3 border border-slate-800">
                <div className="text-cyan-400 font-bold">4 REAL NETWORKS</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  12-Bus Urban, IEEE 33-Bus, IEEE 30-Bus & India 59-Bus
                </div>
              </div>
              <div className="rounded-lg bg-[#06090F]/90 p-3 border border-slate-800">
                <div className="text-violet-400 font-bold">13 DSA ALGORITHMS</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  BFS, Dijkstra, Tarjan, DSU, Kruskal, DP Knapsack, Max-Flow, A*
                </div>
              </div>
              <div className="rounded-lg bg-[#06090F]/90 p-3 border border-slate-800">
                <div className="text-emerald-400 font-bold">8-STAGE CAPER</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Criticality-Aware Power Emergency Restoration + AC NR Check
                </div>
              </div>
              <div className="rounded-lg bg-[#06090F]/90 p-3 border border-slate-800">
                <div className="text-amber-400 font-bold">7 CAMPAIGN MISSIONS</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Hospital Triage, Tie-Switch Traps, Starved Intake & Cyber Storms
                </div>
              </div>
            </div>
          </div>

          {/* Primary Launch CTA Buttons */}
          <div className="space-y-3 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/simulation"
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-3 font-mono text-xs font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.35)] transition"
              >
                <Zap className="h-4 w-4" />
                Launch 3D City Command
              </Link>
              <Link
                href="/missions"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 px-4 py-3 font-mono text-xs font-bold text-emerald-200 transition"
              >
                <Play className="h-4 w-4" />
                Play 7 Campaign Missions
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/algorithms"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#06090F] hover:bg-slate-800 border border-slate-700/80 px-3 py-2 font-mono text-[11px] text-violet-300 transition"
              >
                <Cpu className="h-3.5 w-3.5" /> 13-DSA Lab
              </Link>
              <Link
                href="/research"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#06090F] hover:bg-slate-800 border border-slate-700/80 px-3 py-2 font-mono text-[11px] text-cyan-300 transition"
              >
                <FlaskConical className="h-3.5 w-3.5" /> Benchmarks
              </Link>
              <Link
                href="/challenge"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#06090F] hover:bg-slate-800 border border-slate-700/80 px-3 py-2 font-mono text-[11px] text-amber-300 transition"
              >
                <Swords className="h-3.5 w-3.5" /> Human vs AI
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive 3D City Viewport */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <CityCanvas3D heightClass="h-[510px]" />
          {/* Live Interactive Demo Strip beneath 3D Viewport */}
          <div className="scada-panel rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>Interactive Live Preview ({session.network_id}):</span>
              <span className="text-emerald-400 font-bold">
                Survival Index {session.kpis.city_survival_index.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => applyAction("INJECT_FAULT", "LINE-02-03")}
                className="rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-2.5 py-1 font-mono text-[11px] text-red-200 transition"
              >
                ⚡ Trip Hospital Feeder (LINE-02-03)
              </button>
              <button
                onClick={() => applyRestorationPlan("CAPER")}
                className="rounded bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/50 px-2.5 py-1 font-mono text-[11px] text-violet-200 font-semibold transition"
              >
                ✨ Auto-Restore with CAPER
              </button>
              <button
                onClick={() => resetSession("TRAINING_FEEDER", null, null)}
                className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 transition"
              >
                Reset Nominal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Three Unified Experiences Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="scada-panel rounded-xl p-5 border-t-2 border-t-cyan-400 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-cyan-400">
                EXPERIENCE A • THE GAME
              </span>
              <Play className="h-4 w-4 text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              3D City Critical-Infrastructure Defense
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Command an interactive 3D smart city across 7 escalating crisis missions. Protect Trauma Hospitals, Municipal Water Treatment, and SCADA Command Centers against physical feeder faults, upstream supply caps, and IEC-61850 cyber storms.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/missions"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Explore 7 Campaign Missions <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/challenge"
              className="font-mono text-[11px] text-amber-300 hover:underline"
            >
              Human vs AI Arena
            </Link>
          </div>
        </div>

        <div className="scada-panel rounded-xl p-5 border-t-2 border-t-emerald-400 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-emerald-400">
                EXPERIENCE B • ENGINEERING SIMULATOR
              </span>
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Nonlinear AC Power-Flow & BESS Physics
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Backed by <code>pandapower</code> Newton-Raphson AC load flow. Inspect per-unit bus voltages, phase angles, I²R branch losses, thermal loading limits, tie-switch reconfiguration, and discrete-time Battery Energy Storage (kW vs kWh SOC).
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Open Power Systems Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/national-grid"
              className="font-mono text-[11px] text-cyan-300 hover:underline"
            >
              India 59-Bus Grid
            </Link>
          </div>
        </div>

        <div className="scada-panel rounded-xl p-5 border-t-2 border-t-violet-400 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-violet-400">
                EXPERIENCE C • RESEARCH LABORATORY
              </span>
              <FlaskConical className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              CAPER Algorithm, 13 DSA Traces & Benchmarks
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Step through 13 authentic Data Structures & Algorithms with live frontier inspection, and benchmark the proposed 8-stage <strong>CAPER</strong> engine against Priority-Greedy, Graph-Greedy, AC-Greedy, and SciPy HiGHS MILP-Reference.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/algorithms/caper"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-violet-300 hover:text-violet-200"
            >
              Inspect 8-Stage CAPER <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/research"
              className="font-mono text-[11px] text-emerald-300 hover:underline"
            >
              Reproducible Benchmarks
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


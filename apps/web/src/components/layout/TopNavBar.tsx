"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  Activity,
  Cpu,
  ShieldAlert,
  Zap,
  Compass,
  FlaskConical,
  Swords,
  Globe2,
  BookOpen,
  Play,
  BarChart3,
  Layers,
  RotateCcw,
  Undo2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/simulation", label: "3D City Command", icon: Zap },
  { href: "/missions", label: "Missions", icon: Play },
  { href: "/algorithms", label: "DSA Lab (13)", icon: Cpu },
  { href: "/algorithms/caper", label: "CAPER Engine", icon: Layers },
  { href: "/dashboard", label: "Power Engineering", icon: BarChart3 },
  { href: "/research", label: "Research Suite", icon: FlaskConical },
  { href: "/challenge", label: "Human vs AI", icon: Swords },
  { href: "/national-grid", label: "National Grid", icon: Globe2 },
  { href: "/cyber-lab", label: "Cyber Lab", icon: ShieldAlert },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function TopNavBar() {
  const pathname = usePathname();
  const { session, resetSession, undoAction, loading } = useSimulationStore();
  const kpis = session.kpis;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#06090F]/95 backdrop-blur-md">
      {/* Top Row: Brand + Network Switcher + Live Physics Telemetry Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider text-white">
                  GRIDSEC <span className="text-cyan-400">// ZERO</span>
                </span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  {session.solver_provenance || "AC_SOLVED"}
                </span>
              </div>
              <p className="text-[10px] tracking-widest uppercase text-slate-400">
                The City Must Stay Alive • Cyber-Physical Resilience & CAPER Optimization
              </p>
            </div>
          </Link>
        </div>

        {/* Network Mode Selector & Session Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md bg-[#0B111C] px-2.5 py-1 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400">Network:</span>
            <select
              aria-label="Select Power Network Model"
              value={session.network_id}
              onChange={(e) => resetSession(e.target.value, null, null)}
              className="bg-transparent font-mono text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="TRAINING_FEEDER" className="bg-[#0B111C] text-slate-100">
                TRAINING_FEEDER (12-Bus 33/11kV Urban City)
              </option>
              <option value="IEEE_33_DISTRIBUTION" className="bg-[#0B111C] text-slate-100">
                IEEE_33_DISTRIBUTION (33-Bus Baran & Wu 12.66kV)
              </option>
              <option value="IEEE_30" className="bg-[#0B111C] text-slate-100">
                IEEE_30 (30-Bus Transmission Benchmark)
              </option>
              <option value="INDIA_GRID_59" className="bg-[#0B111C] text-slate-100">
                INDIA_GRID_59 (59-Substation National Grid)
              </option>
            </select>
          </div>

          {/* Live Telemetry Pill Strip */}
          <div className="hidden xl:flex items-center gap-2 font-mono text-xs">
            <div className="rounded bg-[#0B111C] px-2.5 py-1 border border-slate-800/90">
              <span className="text-slate-400 mr-1.5">CRIT LOAD:</span>
              <span
                className={
                  kpis.critical_load_restored_pct >= 98
                    ? "text-emerald-400 font-bold"
                    : kpis.critical_load_restored_pct >= 85
                    ? "text-amber-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                {kpis.critical_load_restored_pct.toFixed(1)}%
              </span>
            </div>
            <div className="rounded bg-[#0B111C] px-2.5 py-1 border border-slate-800/90">
              <span className="text-slate-400 mr-1.5">TOTAL SERVED:</span>
              <span className="text-cyan-300 font-bold">
                {kpis.total_served_mw.toFixed(2)} / {kpis.total_demand_mw.toFixed(2)} MW
              </span>
            </div>
            <div className="rounded bg-[#0B111C] px-2.5 py-1 border border-slate-800/90">
              <span className="text-slate-400 mr-1.5">V_MIN:</span>
              <span
                className={
                  kpis.min_voltage_pu >= 0.94
                    ? "text-emerald-400 font-bold"
                    : kpis.min_voltage_pu >= 0.91
                    ? "text-amber-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                {kpis.min_voltage_pu.toFixed(3)} pu
              </span>
            </div>
            <div className="rounded bg-[#0B111C] px-2.5 py-1 border border-slate-800/90">
              <span className="text-slate-400 mr-1.5">MAX LOAD:</span>
              <span
                className={
                  kpis.max_line_loading_pct <= 85
                    ? "text-emerald-400 font-bold"
                    : kpis.max_line_loading_pct <= 100
                    ? "text-amber-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                {kpis.max_line_loading_pct.toFixed(1)}%
              </span>
            </div>
            <div className="rounded bg-[#0B111C] px-2.5 py-1 border border-slate-800/90">
              <span className="text-slate-400 mr-1.5">FAULTS:</span>
              <span className={kpis.active_faults_count > 0 ? "text-red-400 font-bold" : "text-slate-300"}>
                {kpis.active_faults_count}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => undoAction()}
              disabled={loading}
              title="Undo Last Action"
              className="flex items-center gap-1 rounded bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-xs font-mono text-slate-200 border border-slate-700 transition"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              onClick={() => resetSession(session.network_id, null, null)}
              disabled={loading}
              title="Reset Simulation Session"
              className="flex items-center gap-1 rounded bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-xs font-mono text-slate-200 border border-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Primary Navigation Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 bg-[#080D16]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || (item.href !== "/algorithms" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <Link
            href="/sandbox"
            className={`whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-mono transition ${
              pathname === "/sandbox"
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sandbox
          </Link>
          <Link
            href="/demo"
            className={`whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-mono transition ${
              pathname === "/demo"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            Faculty Demo Guide
          </Link>
        </div>
      </nav>
    </header>
  );
}


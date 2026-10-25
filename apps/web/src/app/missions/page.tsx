"use client";

import React from "react";
import Link from "next/link";
import { MISSIONS_LIST } from "@/data/missionsCatalog";
import { Play, ShieldAlert, Cpu, Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function MissionsCatalogPage() {
  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-8 space-y-6">
      <div className="scada-panel rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 border-emerald-500/30">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 border border-emerald-500/30 font-mono text-xs text-emerald-300 mb-2">
            EXPERIENCE A • CAMPAIGN OPERATIONS (MISSIONS 01 — 07)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            GRID//ZERO Tactical Restoration Campaign
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            Every campaign mission initializes an authentic physical disturbance on the 12-Bus Urban Feeder or IEEE 33-Bus Benchmark. Solve each crisis manually using tie switches, BESS dispatch, and load triage—or compare your solution against the 8-stage CAPER algorithm.
          </p>
        </div>
        <Link
          href="/missions/MISSION_01"
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 font-mono text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition"
        >
          <Play className="h-4 w-4" /> Start Mission 01: First Light
        </Link>
      </div>

      {/* 7 Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MISSIONS_LIST.map((m) => (
          <div
            key={m.mission_id}
            className="scada-panel rounded-xl p-5 flex flex-col justify-between hover:border-cyan-500/50 transition"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="rounded bg-cyan-500/15 px-2.5 py-0.5 font-bold text-cyan-300 border border-cyan-500/30">
                  {m.code_name}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    m.difficulty === "ROOKIE"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : m.difficulty === "OPERATOR" || m.difficulty === "ENGINEER"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {m.difficulty}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-white">{m.title}</h2>
                <p className="font-mono text-xs text-cyan-300/90 mt-0.5">{m.subtitle}</p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{m.briefing}</p>

              <div className="rounded-lg bg-[#06090F] p-3 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Network:</span>
                  <span className="text-slate-200 font-bold">{m.network_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Initial Faults:</span>
                  <span className="text-red-300 font-bold">
                    {m.initial_faulted_branches.length > 0
                      ? m.initial_faulted_branches.join(", ")
                      : "Upstream Supply Cap"}
                  </span>
                </div>
                {m.source_capacity_limit_mw && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Substation Cap:</span>
                    <span className="text-amber-300 font-bold">
                      {m.source_capacity_limit_mw} MW
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">DSA Focus:</span>
                  <span className="text-violet-300">{m.recommended_dsa.join(", ")}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-400">
                Target Crit &ge; {m.target_critical_pct}% • V &ge; {m.min_voltage_pu} pu
              </span>
              <Link
                href={`/missions/${m.mission_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 px-3 py-1.5 font-mono text-xs font-bold text-cyan-200 transition"
              >
                Deploy <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


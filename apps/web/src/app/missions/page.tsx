"use client";

import React from "react";
import Link from "next/link";
import { MISSIONS_LIST } from "@/data/missionsCatalog";
import {
  Play,
  ShieldAlert,
  Cpu,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function MissionsCatalogPage() {
  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-8 space-y-6">
      <div className="scada-panel rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 border-teal-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 border border-teal-200 font-sans text-xs text-teal-700 mb-2">
            EXPERIENCE A • CAMPAIGN OPERATIONS (MISSIONS 01 — 07)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            GRID//ZERO Tactical Restoration Campaign
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Every campaign mission initializes an authentic physical disturbance
            on the 12-Bus Urban Feeder or IEEE 33-Bus Benchmark. Solve each
            crisis manually using tie switches, BESS dispatch, and load
            triage—or compare your solution against the 8-stage CAPER algorithm.
          </p>
        </div>
        <Link
          href="/missions/MISSION_01"
          className="flex items-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-800 px-5 py-3 font-sans text-xs font-bold text-white shadow-sm transition"
        >
          <Play className="h-4 w-4" /> Start Mission 01: First Light
        </Link>
      </div>

      {/* 7 Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {MISSIONS_LIST.map((m) => (
          <div
            key={m.mission_id}
            className="scada-panel rounded-xl p-5 flex flex-col justify-between hover:border-blue-200 transition"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between font-sans text-xs">
                <span className="rounded bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 border border-blue-200">
                  {m.code_name}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    m.difficulty === "ROOKIE"
                      ? "bg-teal-50 text-teal-700"
                      : m.difficulty === "OPERATOR" ||
                          m.difficulty === "ENGINEER"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {m.difficulty}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {m.title}
                </h2>
                <p className="font-sans text-xs text-blue-700/90 mt-0.5">
                  {m.subtitle}
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {m.briefing}
              </p>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1.5 font-sans text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Network:</span>
                  <span className="text-slate-700 font-bold">
                    {m.network_id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Initial Faults:</span>
                  <span className="text-red-700 font-bold">
                    {m.initial_faulted_branches.length > 0
                      ? m.initial_faulted_branches.join(", ")
                      : "Upstream Supply Cap"}
                  </span>
                </div>
                {m.source_capacity_limit_mw && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Substation Cap:</span>
                    <span className="text-amber-700 font-bold">
                      {m.source_capacity_limit_mw} MW
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">DSA Focus:</span>
                  <span className="text-blue-700">
                    {m.recommended_dsa.join(", ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="font-sans text-xs text-slate-500">
                Target Crit &ge; {m.target_critical_pct}% • V &ge;{" "}
                {m.min_voltage_pu} pu
              </span>
              <Link
                href={`/missions/${m.mission_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 font-sans text-xs font-bold text-blue-700 transition"
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

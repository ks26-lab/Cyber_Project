"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MISSIONS_LIST } from "@/data/missionsCatalog";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { EngineeringInspector } from "@/components/simulation/EngineeringInspector";
import { useSimulationStore } from "@/store/useSimulationStore";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Lightbulb,
  Trophy,
  ArrowLeft,
} from "lucide-react";

export default function MissionPlayablePage() {
  const params = useParams();
  const missionId = String(params?.id || "MISSION_01").toUpperCase();
  const mission =
    MISSIONS_LIST.find((m) => m.mission_id.toUpperCase() === missionId) || MISSIONS_LIST[0];

  const {
    session,
    resetSession,
    applyRestorationPlan,
    missionEvaluation,
    loading,
  } = useSimulationStore();

  useEffect(() => {
    resetSession(mission.network_id, mission.mission_id, mission.source_capacity_limit_mw ?? null);
  }, [mission.mission_id, mission.network_id, mission.source_capacity_limit_mw, resetSession]);

  const kpis = session.kpis;
  const objList = missionEvaluation?.objectives || mission.objectives.map((o) => {
    const actual =
      o.target_metric === "critical_load_restored_pct"
        ? kpis.critical_load_restored_pct
        : o.target_metric === "min_voltage_pu"
        ? kpis.min_voltage_pu
        : kpis.active_violations_count;
    const passed =
      o.comparator === ">="
        ? actual >= o.target_value
        : o.comparator === "<="
        ? actual <= o.target_value
        : actual === o.target_value;
    return { ...o, actual_value: actual, passed };
  });

  const allMandatoryPassed = objList
    .filter((o: any) => o.mandatory)
    .every((o: any) => o.passed);

  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-4">
      {/* Top Mission Briefing & Objective Status Banner */}
      <div className="scada-panel rounded-xl p-4 border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/missions"
              className="rounded bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-cyan-400 font-bold">{mission.code_name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-semibold">{mission.difficulty}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{mission.network_id}</span>
              </div>
              <h1 className="text-xl font-extrabold text-white">
                {mission.title} — <span className="text-slate-300 font-medium">{mission.subtitle}</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mission Status Pill */}
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-bold border ${
                allMandatoryPassed
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                  : "bg-amber-500/20 border-amber-400/50 text-amber-200"
              }`}
            >
              <Trophy className="h-4 w-4" />
              {allMandatoryPassed ? "MISSION ACCOMPLISHED (GRADE S)" : "IN PROGRESS — RESTORE CITY"}
            </div>

            <button
              onClick={() => applyRestorationPlan("CAPER")}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/45 border border-violet-400/50 px-3 py-1.5 font-mono text-xs font-bold text-violet-100 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-Solve with CAPER
            </button>

            <button
              onClick={() =>
                resetSession(mission.network_id, mission.mission_id, mission.source_capacity_limit_mw ?? null)
              }
              disabled={loading}
              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 font-mono text-xs text-slate-200 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart Mission
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-6 space-y-2">
            <p className="text-xs text-slate-200 leading-relaxed">{mission.briefing}</p>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Recommended DSA:</span>
              {mission.recommended_dsa.map((d) => (
                <Link
                  key={d}
                  href={`/algorithms?algo=${d}`}
                  className="rounded bg-violet-500/15 px-2 py-0.5 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
                >
                  {d}
                </Link>
              ))}
            </div>
          </div>

          {/* Live Objectives Checklist */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {objList.map((obj: any) => (
              <div
                key={obj.objective_id}
                className={`rounded-lg p-2.5 border font-mono text-xs flex items-start gap-2 ${
                  obj.passed
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : "bg-[#06090F] border-slate-800 text-slate-300"
                }`}
              >
                {obj.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-[11px] font-semibold leading-snug">{obj.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Current: <strong className="text-white">{obj.actual_value}</strong> (Target{" "}
                    {obj.comparator} {obj.target_value})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Mission Cockpit: Left 3D City + Tactical Hints | Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-4">
          <CityCanvas3D heightClass="h-[520px]" />

          {/* Tactical Dispatcher Hints & Campaign Switcher */}
          <div className="scada-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300">
                <Lightbulb className="h-4 w-4" /> Chief Dispatcher Tactical Hints:
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                {mission.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {MISSIONS_LIST.map((m) => (
                <Link
                  key={m.mission_id}
                  href={`/missions/${m.mission_id}`}
                  className={`rounded px-2.5 py-1 font-mono text-xs border transition ${
                    m.mission_id === mission.mission_id
                      ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold"
                      : "bg-[#06090F] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  M0{m.number}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}


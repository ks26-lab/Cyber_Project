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
    MISSIONS_LIST.find((m) => m.mission_id.toUpperCase() === missionId) ||
    MISSIONS_LIST[0];

  const {
    session,
    resetSession,
    applyRestorationPlan,
    missionEvaluation,
    loading,
  } = useSimulationStore();

  useEffect(() => {
    resetSession(
      mission.network_id,
      mission.mission_id,
      mission.source_capacity_limit_mw ?? null,
    );
  }, [
    mission.mission_id,
    mission.network_id,
    mission.source_capacity_limit_mw,
    resetSession,
  ]);

  const kpis = session.kpis;
  const ready =
    !loading &&
    session.mission_id === mission.mission_id &&
    session.solver_provenance === "AC_SOLVED";
  const objList =
    ready && missionEvaluation?.mission_id === mission.mission_id
      ? missionEvaluation.objectives
      : [];
  const allMandatoryPassed =
    ready && objList.length > 0 && missionEvaluation?.passed === true;

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-4">
      {!ready && (
        <p role="status">Loading this mission’s authoritative state…</p>
      )}
      {/* Top Mission Briefing & Objective Status Banner */}
      <div className="scada-panel rounded-xl p-4 border-blue-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/missions"
              className="rounded bg-slate-100 hover:bg-slate-100 p-1.5 text-slate-600 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 font-sans text-xs">
                <span className="text-blue-700 font-bold">
                  {mission.code_name}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-700 font-semibold">
                  {mission.difficulty}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{mission.network_id}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {mission.title} —{" "}
                <span className="text-slate-600 font-medium">
                  {mission.subtitle}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mission Status Pill */}
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-sans text-xs font-bold border ${
                allMandatoryPassed
                  ? "bg-teal-50 border-teal-200 text-teal-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              <Trophy className="h-4 w-4" />
              {allMandatoryPassed
                ? `MISSION ACCOMPLISHED (GRADE ${missionEvaluation?.grade || "A"})`
                : "IN PROGRESS — RESTORE CITY"}
            </div>

            <button
              onClick={() => applyRestorationPlan("CAPER")}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 font-sans text-xs font-bold text-blue-700 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-Solve with CAPER
            </button>

            <button
              onClick={() =>
                resetSession(
                  mission.network_id,
                  mission.mission_id,
                  mission.source_capacity_limit_mw ?? null,
                )
              }
              disabled={loading}
              className="flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-100 px-3 py-1.5 font-sans text-xs text-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart Mission
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-6 space-y-2">
            <p className="text-xs text-slate-700 leading-relaxed">
              {mission.briefing}
            </p>
            <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
              <span className="text-slate-500">Recommended DSA:</span>
              {mission.recommended_dsa.map((d) => (
                <Link
                  key={d}
                  href={`/algorithms?algo=${d}`}
                  className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-200 hover:bg-blue-50"
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
                className={`rounded-lg p-2.5 border font-sans text-xs flex items-start gap-2 ${
                  obj.passed
                    ? "bg-teal-50 border-teal-200 text-teal-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {obj.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-semibold leading-snug">
                    {obj.description}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Current:{" "}
                    <strong className="text-slate-900">
                      {obj.actual_value}
                    </strong>{" "}
                    (Target {obj.comparator} {obj.target_value})
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
              <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-amber-700">
                <Lightbulb className="h-4 w-4" /> Chief Dispatcher Tactical
                Hints:
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
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
                  className={`rounded px-2.5 py-1 font-sans text-xs border transition ${
                    m.mission_id === mission.mission_id
                      ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
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

"use client";

import React, { useEffect, useState } from "react";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { EngineeringInspector } from "@/components/simulation/EngineeringInspector";
import { useSimulationStore } from "@/store/useSimulationStore";
import { Swords, Trophy, Sparkles, RotateCcw } from "lucide-react";

export default function HumanVsAlgorithmChallengePage() {
  const { session, resetSession, applyRestorationPlan } = useSimulationStore();
  const [challengeData, setChallengeData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const evaluateHeadToHead = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gridzero/challenge/compare", {
        method: "POST",
      });
      if (!res.ok) throw Error("Comparison failed (" + res.status + ")");
      if (res.ok) {
        const data = await res.json();
        setChallengeData(data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const leaderboard = challengeData?.leaderboard || [];

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-amber-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-200 font-sans text-xs text-amber-700 mb-1.5">
            HUMAN-VS-ALGORITHM CHALLENGE ARENA
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Head-to-Head Dispatcher Challenge: Human Operator vs. CAPER & 4
            Baselines
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Operate the 3D city switches, batteries, and load curtailment
            manually, then compare your live physical outcome against CAPER,
            MILP-Reference, AC-Greedy, Graph-Greedy, and Priority-Greedy on the
            exact same contingency!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => resetSession("TRAINING_FEEDER", "MISSION_03", 7.2)}
            className="rounded-lg bg-amber-50 hover:bg-amber-50 border border-amber-200 px-3.5 py-2 font-sans text-xs font-bold text-amber-700 transition"
          >
            Load Crisis Scenario (Mission 03 + 7.2 MW Cap)
          </button>
          <button
            onClick={evaluateHeadToHead}
            disabled={loading}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-4 py-2 font-sans text-xs font-bold text-white transition"
          >
            Score My Solution vs. AI
          </button>
          <button
            onClick={() => applyRestorationPlan("CAPER")}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-3.5 py-2 font-sans text-xs font-bold text-white transition"
          >
            Apply CAPER Restoration Plan
          </button>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      {!leaderboard.length && (
        <p role="status" className="text-slate-500">
          Load the crisis scenario, make your decisions, then score your
          solution to calculate a fair comparison.
        </p>
      )}
      {/* Head-to-Head Leaderboard Table */}
      <div className="scada-panel rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
          <h2 className="font-sans text-sm font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-700" /> Live 6-Way
            Head-to-Head Leaderboard
          </h2>
          <span className="font-sans text-xs text-slate-500">
            Ranked by AC Feasibility → Critical Load Restored (%) → Resilience
            Score
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 px-2">Rank</th>
                <th className="py-2 px-2">Participant</th>
                <th className="py-2 px-2">AC Physics</th>
                <th className="py-2 px-2">Attempted Critical (%)</th>
                <th className="py-2 px-2">Attempted Total (%)</th>
                <th className="py-2 px-2">Min V (pu)</th>
                <th className="py-2 px-2">Peak Load (%)</th>
                <th className="py-2 px-2">Switches</th>
                <th className="py-2 px-2">Resilience Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leaderboard.map((row: any) => {
                const isHuman = row.participant === "HUMAN_OPERATOR";
                const isCaper = row.participant === "CAPER";
                return (
                  <tr
                    key={row.participant}
                    className={
                      isHuman
                        ? "bg-blue-50 border-l-2 border-blue-200"
                        : isCaper
                          ? "bg-blue-50"
                          : "hover:bg-slate-100"
                    }
                  >
                    <td className="py-2.5 px-2 font-bold text-amber-700">
                      #{row.rank}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-slate-900">
                      {row.label || row.participant}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                          row.ac_feasible
                            ? "bg-teal-50 text-teal-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {row.ac_feasible ? "FEASIBLE" : "VIOLATION"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-bold text-teal-700">
                      {row.critical_load_restored_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2">
                      {row.total_load_restored_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2">
                      {row.min_voltage_pu?.toFixed(4)} pu
                    </td>
                    <td className="py-2.5 px-2">
                      {row.max_branch_loading_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2">{row.switching_count}</td>
                    <td className="py-2.5 px-2 font-extrabold text-blue-700">
                      {row.resilience_score?.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive 3D City & Inspector for Human Operator Moves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8">
          <CityCanvas3D heightClass="h-[500px]" />
        </div>
        <div className="lg:col-span-4">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}

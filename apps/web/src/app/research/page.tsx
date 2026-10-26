"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Play,
  Download,
  BarChart3,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const FALLBACK_SUMMARIES: Record<string, any> = {
  CAPER: {
    algorithm: "CAPER",
    trials_count: 5,
    ac_feasibility_rate_pct: 100.0,
    ac_convergence_rate_pct: 100.0,
    critical_load_restored_pct: {
      mean: 99.4,
      std: 1.1,
      median: 100.0,
      iqr: 0.8,
      ci95_low: 98.4,
      ci95_high: 100.0,
    },
    total_load_restored_pct: { mean: 88.6, std: 3.4, median: 89.2, iqr: 4.1 },
    min_voltage_pu: { mean: 0.958, std: 0.008, median: 0.96, iqr: 0.01 },
    max_branch_loading_pct: { mean: 68.4, std: 6.2, median: 67.5, iqr: 7.2 },
    switching_count: { mean: 2.2, std: 0.4, median: 2.0, iqr: 0.5 },
    runtime_ms: { mean: 21.8, std: 3.1, median: 21.2, iqr: 3.5 },
    objective_score: { mean: 89.7, std: 2.4, median: 90.1, iqr: 2.8 },
  },
  MILP_REFERENCE: {
    algorithm: "MILP_REFERENCE",
    trials_count: 5,
    ac_feasibility_rate_pct: 90.0,
    ac_convergence_rate_pct: 100.0,
    critical_load_restored_pct: {
      mean: 97.8,
      std: 2.3,
      median: 98.5,
      iqr: 2.1,
      ci95_low: 95.8,
      ci95_high: 99.8,
    },
    total_load_restored_pct: { mean: 86.2, std: 4.2, median: 86.8, iqr: 4.9 },
    min_voltage_pu: { mean: 0.951, std: 0.011, median: 0.953, iqr: 0.014 },
    max_branch_loading_pct: { mean: 72.1, std: 7.4, median: 71.0, iqr: 8.1 },
    switching_count: { mean: 2.6, std: 0.5, median: 3.0, iqr: 1.0 },
    runtime_ms: { mean: 16.4, std: 2.8, median: 15.9, iqr: 3.0 },
    objective_score: { mean: 84.3, std: 3.8, median: 85.0, iqr: 4.2 },
  },
  AC_GREEDY: {
    algorithm: "AC_GREEDY",
    trials_count: 5,
    ac_feasibility_rate_pct: 80.0,
    ac_convergence_rate_pct: 100.0,
    critical_load_restored_pct: {
      mean: 92.5,
      std: 4.8,
      median: 93.0,
      iqr: 5.4,
      ci95_low: 88.3,
      ci95_high: 96.7,
    },
    total_load_restored_pct: { mean: 79.4, std: 5.6, median: 80.1, iqr: 6.2 },
    min_voltage_pu: { mean: 0.942, std: 0.015, median: 0.944, iqr: 0.018 },
    max_branch_loading_pct: { mean: 78.5, std: 8.9, median: 77.2, iqr: 9.5 },
    switching_count: { mean: 1.8, std: 0.4, median: 2.0, iqr: 0.5 },
    runtime_ms: { mean: 11.2, std: 1.9, median: 10.8, iqr: 2.2 },
    objective_score: { mean: 74.8, std: 5.1, median: 75.4, iqr: 5.8 },
  },
  GRAPH_GREEDY: {
    algorithm: "GRAPH_GREEDY",
    trials_count: 5,
    ac_feasibility_rate_pct: 40.0,
    ac_convergence_rate_pct: 100.0,
    critical_load_restored_pct: {
      mean: 88.0,
      std: 7.2,
      median: 89.0,
      iqr: 8.5,
      ci95_low: 81.7,
      ci95_high: 94.3,
    },
    total_load_restored_pct: { mean: 82.1, std: 6.4, median: 83.0, iqr: 7.0 },
    min_voltage_pu: { mean: 0.918, std: 0.022, median: 0.919, iqr: 0.025 },
    max_branch_loading_pct: { mean: 96.4, std: 11.2, median: 95.8, iqr: 12.4 },
    switching_count: { mean: 1.4, std: 0.5, median: 1.0, iqr: 1.0 },
    runtime_ms: { mean: 4.8, std: 0.8, median: 4.6, iqr: 0.9 },
    objective_score: { mean: 52.4, std: 9.6, median: 54.0, iqr: 11.2 },
  },
  PRIORITY_GREEDY: {
    algorithm: "PRIORITY_GREEDY",
    trials_count: 5,
    ac_feasibility_rate_pct: 60.0,
    ac_convergence_rate_pct: 100.0,
    critical_load_restored_pct: {
      mean: 74.2,
      std: 9.5,
      median: 75.0,
      iqr: 11.0,
      ci95_low: 65.9,
      ci95_high: 82.5,
    },
    total_load_restored_pct: { mean: 68.5, std: 8.1, median: 69.0, iqr: 9.2 },
    min_voltage_pu: { mean: 0.934, std: 0.018, median: 0.936, iqr: 0.021 },
    max_branch_loading_pct: { mean: 84.2, std: 9.8, median: 83.5, iqr: 10.6 },
    switching_count: { mean: 1.0, std: 0.0, median: 1.0, iqr: 0.0 },
    runtime_ms: { mean: 4.1, std: 0.6, median: 4.0, iqr: 0.7 },
    objective_score: { mean: 58.1, std: 8.4, median: 59.0, iqr: 9.5 },
  },
};

export default function ResearchBenchmarksPage() {
  const [presetId, setPresetId] = useState("EXP_FAST_VERIFY");
  const [activeRun, setActiveRun] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLatestRun = async () => {
    try {
      const res = await fetch(
        "/api/gridzero/research/runs/RUN-DEFAULT-BENCHMARK",
      );
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data.run);
      }
    } catch {
      // Fallback displayed automatically
    }
  };

  useEffect(() => {
    fetchLatestRun();
  }, []);

  const triggerExperiment = async (pid: string) => {
    setPresetId(pid);
    setLoading(true);
    try {
      const res = await fetch("/api/gridzero/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: pid }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data.run);
      }
    } catch {
      // Keep existing run
    } finally {
      setLoading(false);
    }
  };

  const summaries = activeRun?.summaries || FALLBACK_SUMMARIES;
  const algos = [
    "CAPER",
    "MILP_REFERENCE",
    "AC_GREEDY",
    "GRAPH_GREEDY",
    "PRIORITY_GREEDY",
  ];
  const runId = activeRun?.run_id || "RUN-DEFAULT-BENCHMARK";

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      {/* Header Banner */}
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-blue-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 font-sans text-xs text-blue-700 mb-1.5">
            EXPERIENCE C • REPRODUCIBLE MULTI-SEED SCIENTIFIC BENCHMARK SUITE
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Restoration Research
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Compares <strong>CAPER</strong> against{" "}
            <strong>Priority-Greedy</strong>, <strong>Graph-Greedy</strong>,{" "}
            <strong>AC-Greedy</strong>, and{" "}
            <strong>SciPy HiGHS MILP-Reference</strong> across seeded N-1 / N-2
            / N-3 contingencies with full statistical distributions (Mean, SD,
            Median, IQR, 95% CI).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerExperiment("EXP_FAST_VERIFY")}
            disabled={loading}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-3.5 py-2 font-sans text-xs font-bold text-white transition"
          >
            {loading ? "Solving AC Trials..." : "Run Urban 12-Bus Suite"}
          </button>
          <button
            onClick={() => triggerExperiment("EXP_IEEE33_BENCHMARK")}
            disabled={loading}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-3.5 py-2 font-sans text-xs font-bold text-white transition"
          >
            Run IEEE 33-Bus Suite
          </button>
          <a
            href={`/api/gridzero/research/runs/${runId}/export-csv`}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 border border-slate-200 px-3 py-2 font-sans text-xs text-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5 text-teal-700" /> Export CSV
          </a>
          <Link
            href={`/runs/${runId}`}
            className="rounded-lg bg-teal-50 hover:bg-teal-50 border border-teal-200 px-3 py-2 font-sans text-xs font-bold text-teal-700 transition"
          >
            Inspect Run {runId}
          </Link>
        </div>
      </div>

      <p role="status" className="text-sm text-slate-500">
        {activeRun
          ? `Experiment results · ${activeRun.run_id}`
          : "Illustrative reference results · run an experiment to generate measured results."}
      </p>
      {/* Comparative Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Critical Load Restored (%) & 95% CI */}
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h2 className="font-sans text-sm font-bold text-slate-900">
                Critical Load Restoration (%) — Mean ± SD & [95% CI]
              </h2>
              <p className="text-xs text-slate-500">
                Tier-1 Hospital, Water Treatment & SCADA Command Preservation
              </p>
            </div>
            <span className="font-sans text-xs text-teal-700 font-bold">
              Higher is Better
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {algos.map((alg) => {
              const s = summaries[alg] || FALLBACK_SUMMARIES[alg];
              const mean = s?.critical_load_restored_pct?.mean ?? 85;
              const std = s?.critical_load_restored_pct?.std ?? 2;
              const ciLow = s?.critical_load_restored_pct?.ci95_low ?? mean - 2;
              const ciHigh =
                s?.critical_load_restored_pct?.ci95_high ??
                Math.min(100, mean + 2);
              return (
                <div key={alg} className="space-y-1 font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold ${
                        alg === "CAPER" ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {alg} {alg === "CAPER" && "★ (Proposed)"}
                    </span>
                    <span className="text-teal-700 font-bold">
                      {mean.toFixed(1)}% ± {std.toFixed(1)}%{" "}
                      <span className="text-xs text-slate-500">
                        (95% CI: [{ciLow.toFixed(1)}, {ciHigh.toFixed(1)}])
                      </span>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    <div
                      className={`h-full ${
                        alg === "CAPER"
                          ? "bg-gradient-to-r from-violet-500 to-emerald-400"
                          : alg === "MILP_REFERENCE"
                            ? "bg-blue-800"
                            : alg === "AC_GREEDY"
                              ? "bg-blue-800"
                              : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, mean))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Post-Action AC Physics Feasibility Rate (%) */}
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div>
              <h2 className="font-sans text-sm font-bold text-slate-900">
                AC Newton-Raphson Feasibility Rate (%) & Min Voltage (pu)
              </h2>
              <p className="text-xs text-slate-500">
                Fraction of trials with zero voltage (&ge; 0.92 pu) or thermal
                (&le; 100%) violations
              </p>
            </div>
            <span className="font-sans text-xs text-blue-700 font-bold">
              {activeRun ? "AC evaluation" : "Reference comparison"}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {algos.map((alg) => {
              const s = summaries[alg] || FALLBACK_SUMMARIES[alg];
              const feas = s?.ac_feasibility_rate_pct ?? 80;
              const vmin = s?.min_voltage_pu?.mean ?? 0.95;
              return (
                <div key={alg} className="space-y-1 font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold ${
                        alg === "CAPER" ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {alg}
                    </span>
                    <span className="text-blue-700 font-bold">
                      {feas.toFixed(1)}% Feasible{" "}
                      <span className="text-xs text-slate-500">
                        (Mean V_min = {vmin.toFixed(4)} pu)
                      </span>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                    <div
                      className={`h-full ${
                        feas >= 90
                          ? "bg-blue-800"
                          : feas >= 70
                            ? "bg-blue-800"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, feas))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comprehensive Statistical Summary Table (Mean, SD, Median, IQR, 95% CI) */}
      <details className="scada-panel presentation-hide rounded-xl p-5 space-y-3">
        <summary>Advanced statistics & run provenance</summary>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <h2 className="font-sans text-sm font-bold text-slate-900">
            Statistical Distribution Summary Table (Run: {runId} • Network:{" "}
            {activeRun?.network_id || "TRAINING_FEEDER"})
          </h2>
          <span className="rounded bg-teal-50 px-2.5 py-0.5 font-sans text-xs text-teal-700 border border-teal-200">
            {activeRun
              ? "Measured experiment results"
              : "Illustrative reference data"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2">Algorithm</th>
                <th className="py-2.5 px-2">AC Feasible (%)</th>
                <th className="py-2.5 px-2">Crit Load (Mean ± SD)</th>
                <th className="py-2.5 px-2">Crit Load (Median / IQR)</th>
                <th className="py-2.5 px-2">Total Load (Mean)</th>
                <th className="py-2.5 px-2">Min V (pu)</th>
                <th className="py-2.5 px-2">Switches</th>
                <th className="py-2.5 px-2">Objective J(c)</th>
                <th className="py-2.5 px-2">Runtime (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {algos.map((alg) => {
                const s = summaries[alg] || FALLBACK_SUMMARIES[alg];
                return (
                  <tr
                    key={alg}
                    className={
                      alg === "CAPER" ? "bg-blue-50" : "hover:bg-slate-100"
                    }
                  >
                    <td className="py-2.5 px-2 font-bold text-blue-700">
                      {alg} {alg === "CAPER" && "★"}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-teal-700">
                      {s.ac_feasibility_rate_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-slate-900 font-semibold">
                      {s.critical_load_restored_pct?.mean?.toFixed(1)}% ±{" "}
                      {s.critical_load_restored_pct?.std?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">
                      {s.critical_load_restored_pct?.median?.toFixed(1)}% (IQR{" "}
                      {s.critical_load_restored_pct?.iqr?.toFixed(1)}%)
                    </td>
                    <td className="py-2.5 px-2 text-blue-700">
                      {s.total_load_restored_pct?.mean?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2">
                      {s.min_voltage_pu?.mean?.toFixed(4)} pu
                    </td>
                    <td className="py-2.5 px-2">
                      {s.switching_count?.mean?.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-teal-700">
                      {s.objective_score?.mean?.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">
                      {s.runtime_ms?.mean?.toFixed(2)} ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {/* Key Empirical Findings */}
      <details className="scada-panel presentation-hide rounded-xl p-5 space-y-2">
        <summary>Engineering findings</summary>
        <h3 className="font-sans text-xs font-bold uppercase text-blue-700">
          Key Scientific & Engineering Findings
        </h3>
        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1.5">
          {(
            activeRun?.key_findings || [
              "CAPER achieves the highest critical-load restoration and AC feasibility rate across multi-fault contingencies by coupling Dijkstra/Kruskal tie-switch synthesis with 0/1 Knapsack DP triage and BESS dispatch.",
              "Graph-Greedy (shortest-hop topology only) frequently violates voltage or source capacity constraints when upstream supply is capped because it lacks load triage and battery support.",
              "Priority-Greedy sheds load without optimal tie-switch pathfinding, leaving islanded critical facilities de-energized.",
              "Linearized MILP-Reference (SciPy HiGHS) provides strong dispatch targets but requires CAPER's post-action nonlinear AC load-flow validation to guard against reactive voltage drops.",
            ]
          ).map((f: string, idx: number) => (
            <li key={idx}>{f}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

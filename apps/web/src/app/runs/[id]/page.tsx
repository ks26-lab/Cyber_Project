"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FlaskConical } from "lucide-react";

export default function RunDetailsPage() {
  const params = useParams();
  const runId = String(params?.id || "RUN-DEFAULT-BENCHMARK");
  const [runData, setRunData] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/gridzero/research/runs/${encodeURIComponent(runId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.run) setRunData(d.run);
      })
      .catch(() => {});
  }, [runId]);

  const trials = runData?.trials || [];

  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/research"
            className="rounded bg-slate-800 hover:bg-slate-700 p-2 text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="font-mono text-xs text-cyan-400 font-bold">
              REPRODUCIBLE RUN ARTIFACT • {runData?.run_id || runId}
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {runData?.title || "Seeded Multi-Contingency Benchmark Run"}
            </h1>
            <p className="font-mono text-xs text-slate-400">
              Network: {runData?.network_id || "TRAINING_FEEDER"} • Base Seed:{" "}
              {runData?.base_seed || 42} • Provenance: {runData?.solver_provenance || "AC_SOLVED"}
            </p>
          </div>
        </div>

        <a
          href={`/api/gridzero/research/runs/${runId}/export-csv`}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-mono text-xs font-bold text-slate-950 transition"
        >
          <Download className="h-4 w-4" /> Download Full CSV Artifact
        </a>
      </div>

      {/* Trial-by-Trial Ledger */}
      <div className="scada-panel rounded-xl p-5">
        <h2 className="font-mono text-sm font-bold text-white mb-3">
          Trial-by-Trial AC Power-Flow Evaluation Ledger ({trials.length} Evaluations)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">Trial / Seed</th>
                <th className="py-2 px-2">Faulted Corridors</th>
                <th className="py-2 px-2">Algorithm</th>
                <th className="py-2 px-2">AC Feasible</th>
                <th className="py-2 px-2">Crit Restored (%)</th>
                <th className="py-2 px-2">Total Restored (%)</th>
                <th className="py-2 px-2">Min V (pu)</th>
                <th className="py-2 px-2">Max Load (%)</th>
                <th className="py-2 px-2">Switches</th>
                <th className="py-2 px-2">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trials.map((t: any, i: number) => (
                <tr
                  key={i}
                  className={t.algorithm === "CAPER" ? "bg-violet-950/25" : "hover:bg-slate-800/40"}
                >
                  <td className="py-2 px-2 text-slate-300">
                    #{t.trial_id} (s={t.seed})
                  </td>
                  <td className="py-2 px-2 text-red-300">
                    {(t.faulted_branches || []).join(", ")}
                  </td>
                  <td className="py-2 px-2 font-bold text-violet-300">{t.algorithm}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        t.ac_feasible
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {t.ac_feasible ? "FEASIBLE" : "VIOLATION"}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-bold text-emerald-300">
                    {t.critical_load_restored_pct?.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2">{t.total_load_restored_pct?.toFixed(1)}%</td>
                  <td className="py-2 px-2">{t.min_voltage_pu?.toFixed(4)} pu</td>
                  <td className="py-2 px-2">{t.max_branch_loading_pct?.toFixed(1)}%</td>
                  <td className="py-2 px-2">{t.switching_count}</td>
                  <td className="py-2 px-2 font-bold text-cyan-300">
                    {t.objective_score?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


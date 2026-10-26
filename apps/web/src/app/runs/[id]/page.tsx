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
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/research"
            className="rounded bg-slate-100 hover:bg-slate-100 p-2 text-slate-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="font-sans text-xs text-blue-700 font-bold">
              REPRODUCIBLE RUN ARTIFACT • {runData?.run_id || runId}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {runData?.title || "Seeded Multi-Contingency Benchmark Run"}
            </h1>
            <p className="font-sans text-xs text-slate-500">
              Network: {runData?.network_id || "TRAINING_FEEDER"} • Base Seed:{" "}
              {runData?.base_seed || 42} • Provenance:{" "}
              {runData?.solver_provenance || "AC_SOLVED"}
            </p>
          </div>
        </div>

        <a
          href={`/api/gridzero/research/runs/${runId}/export-csv`}
          className="flex items-center gap-1.5 rounded-lg bg-blue-800 hover:bg-blue-800 px-4 py-2 font-sans text-xs font-bold text-white transition"
        >
          <Download className="h-4 w-4" /> Download Full CSV Artifact
        </a>
      </div>

      {/* Trial-by-Trial Ledger */}
      <div className="scada-panel rounded-xl p-5">
        <h2 className="font-sans text-sm font-bold text-slate-900 mb-3">
          Trial-by-Trial AC Power-Flow Evaluation Ledger ({trials.length}{" "}
          Evaluations)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-200">
              {trials.map((t: any, i: number) => (
                <tr
                  key={i}
                  className={
                    t.algorithm === "CAPER"
                      ? "bg-blue-50"
                      : "hover:bg-slate-100"
                  }
                >
                  <td className="py-2 px-2 text-slate-600">
                    #{t.trial_id} (s={t.seed})
                  </td>
                  <td className="py-2 px-2 text-red-700">
                    {(t.faulted_branches || []).join(", ")}
                  </td>
                  <td className="py-2 px-2 font-bold text-blue-700">
                    {t.algorithm}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        t.ac_feasible
                          ? "bg-teal-50 text-teal-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {t.ac_feasible ? "FEASIBLE" : "VIOLATION"}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-bold text-teal-700">
                    {t.critical_load_restored_pct?.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2">
                    {t.total_load_restored_pct?.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2">
                    {t.min_voltage_pu?.toFixed(4)} pu
                  </td>
                  <td className="py-2 px-2">
                    {t.max_branch_loading_pct?.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2">{t.switching_count}</td>
                  <td className="py-2 px-2 font-bold text-blue-700">
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

"use client";

import React, { useEffect, useState } from "react";
import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { useSimulationStore } from "@/store/useSimulationStore";
import { ShieldAlert, Sparkles, Terminal, Activity, Lock } from "lucide-react";

const CYBER_VECTORS = [
  {
    id: "IEC61850_GOOSE_TRIP",
    name: "IEC-61850 GOOSE Spoofed Breaker Trip",
    target: "LINE-02-03",
    severity: "CRITICAL",
    description:
      "Models the physical consequence of a forged GOOSE trip by opening the primary hospital feeder breaker without physical overcurrent.",
  },
  {
    id: "FDIA_STATE_ESTIMATION",
    name: "False Data Injection Attack (FDIA) on SCADA Voltage",
    target: "LINE-03-04",
    severity: "HIGH",
    description:
      "Trips the water-feeder branch in this local exercise. Use the detector sandbox below for actual false-data analysis.",
  },
  {
    id: "COORDINATED_CASCADE",
    name: "Coordinated Multi-Substation Cyber Storm",
    target: "MULTI",
    severity: "CRITICAL",
    description:
      "Simultaneously trips LINE-02-03, LINE-03-04, and LINE-08-10 while derating upstream substation capacity to 6.8 MW.",
  },
];

export default function CyberLabPage() {
  const {
    session,
    applyAction,
    applyRestorationPlan,
    resetSession,
    loading,
    error,
  } = useSimulationStore();
  useEffect(() => {
    if (session.network_id !== "TRAINING_FEEDER")
      resetSession("TRAINING_FEEDER", null, null);
  }, [session.network_id, resetSession]);
  const [idsAlertLog, setIdsAlertLog] = useState<string[]>([
    "Training feeder exercise ready. No detector has run yet.",
  ]);
  const [analysis, setAnalysis] = useState<any>(null),
    [analysisBusy, setAnalysisBusy] = useState(false),
    [analysisError, setAnalysisError] = useState("");
  const [scenario, setScenario] = useState("SCN-001");
  async function analyze() {
    setAnalysisBusy(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/cyber/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenario,
          baseline_network: "IEEE_30",
          seed: 42,
          apply_physical_consequence: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.detail || "Detection pipeline failed");
      setAnalysis(data);
    } catch (e) {
      setAnalysisError(String(e));
    } finally {
      setAnalysisBusy(false);
    }
  }

  const launchVector = async (vec: (typeof CYBER_VECTORS)[0]) => {
    if (vec.target === "MULTI") {
      await applyAction("INJECT_FAULT", "LINE-02-03");
      await applyAction("INJECT_FAULT", "LINE-03-04");
      await applyAction("INJECT_FAULT", "LINE-08-10");
      await applyAction("SET_SOURCE_CAPACITY", "BUS-01", 6.8);
    } else {
      await applyAction("INJECT_FAULT", vec.target);
    }
    const result = useSimulationStore.getState();
    setIdsAlertLog((prev) => [
      result.error
        ? `Action failed: ${result.error}`
        : `Synthetic ${vec.id}: ${result.session.kpis.active_faults_count} faults; ${result.session.power_flow.violations.length} AC constraint violations.`,
      ...prev,
    ]);
  };

  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-red-200">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 border border-red-200 font-sans text-xs text-red-700 mb-1.5">
            GRIDSEC // ZERO CYBER-PHYSICAL SECURITY & AEGIS DEFENSE LAB
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Cyber Event Analysis
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Compare simulated breaker outages with the backend cyber-detection
            pipeline. All scenarios are synthetic; electrical consequences are
            computed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={loading}
            onClick={async () => {
              await applyRestorationPlan("CAPER");
              const result = useSimulationStore.getState();
              setIdsAlertLog((prev) => [
                result.error
                  ? `Restoration failed: ${result.error}`
                  : `CAPER applied: ${result.session.kpis.critical_load_restored_pct}% attempted critical supply; ${result.session.power_flow.violations.length} constraint violations.`,
                ...prev,
              ]);
            }}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-4 py-2 font-sans text-xs font-bold text-white transition"
          >
            Apply CAPER to the training feeder
          </button>
          <button
            disabled={loading}
            onClick={() => resetSession("TRAINING_FEEDER", null, null)}
            className="rounded-lg bg-slate-100 hover:bg-slate-100 px-3.5 py-2 font-sans text-xs text-slate-700 transition"
          >
            Reset Grid
          </button>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 space-y-4 presentation-hide">
          {/* Attack Vectors */}
          <div className="scada-panel rounded-xl p-4 space-y-3">
            <h2 className="font-sans text-xs font-bold uppercase text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Event scenarios
            </h2>
            {CYBER_VECTORS.map((v) => (
              <details
                key={v.id}
                className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-2"
              >
                <summary className="flex items-center justify-between font-sans text-xs">
                  <span className="font-bold text-slate-900">{v.name}</span>
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                    {v.severity}
                  </span>
                </summary>
                <p className="text-xs text-slate-500">{v.description}</p>
                <button
                  disabled={loading}
                  onClick={() => launchVector(v)}
                  className="w-full rounded bg-red-50 hover:bg-red-50 border border-red-200 py-1.5 font-sans text-xs font-bold text-red-700 transition"
                >
                  Inject {v.id}
                </button>
              </details>
            ))}
          </div>

          {/* Physics-Informed IDS Console */}
          <div className="scada-panel rounded-xl p-4 space-y-2">
            <h3 className="font-sans text-xs font-bold uppercase text-blue-700 flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Training feeder action timeline
            </h3>
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 font-sans text-xs space-y-1.5 max-h-52 overflow-y-auto">
              {idsAlertLog.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes("ALERT")
                      ? "text-red-700"
                      : line.includes("AEGIS + CAPER")
                        ? "text-teal-700"
                        : "text-blue-700"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 presentation-expand">
          <CityCanvas3D heightClass="h-[520px]" />
        </div>
      </div>
      <section className="scada-panel rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">
          Cyber detection and electrical evidence
        </h2>
        <p className="text-sm text-slate-600">
          Runs the existing detection service on a separate IEEE 30-bus sandbox:
          synthetic event generation, classification, BFS impact, AC analysis
          and incident correlation. This sandbox does not replace the
          training-feeder state above.
        </p>
        <div className="flex flex-wrap gap-3">
          <label>
            Scenario{" "}
            <select
              aria-label="Detection scenario"
              className="quiet-button"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {[
                ["SCN-001", "Unauthorized breaker command"],
                ["SCN-002", "False telemetry"],
                ["SCN-003", "Configuration tampering"],
                ["SCN-004", "Reconnaissance"],
                ["SCN-005", "Coordinated campaign"],
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            disabled={analysisBusy}
            onClick={analyze}
          >
            {analysisBusy ? "Analyzing…" : "Run detection pipeline"}
          </button>
        </div>
        {analysisError && <p role="alert">{analysisError}</p>}
        {analysis && (
          <div>
            <p className="text-sm">
              Computed sandbox result · {analysis.simulation_id} · seed{" "}
              {analysis.seed}
            </p>
            <details>
              <summary>
                Inspect classification, physical impact and incident evidence
              </summary>
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(
                  {
                    event: analysis.event,
                    asset: analysis.matched_asset,
                    physical: analysis.state_comparison,
                    consistency: analysis.cyber_physics_consistency,
                    priority: analysis.priority_ranking,
                    timeline: analysis.execution_timeline,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </div>
        )}
      </section>
    </div>
  );
}

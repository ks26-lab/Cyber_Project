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
      "Injects a forged multicast GOOSE frame to open the primary hospital feeder breaker without physical overcurrent.",
  },
  {
    id: "FDIA_STATE_ESTIMATION",
    name: "False Data Injection Attack (FDIA) on SCADA Voltage",
    target: "LINE-02-04",
    severity: "HIGH",
    description:
      "Corrupts RTU voltage & reactive power telemetry along the Water Treatment corridor while tripping the underlying line.",
  },
  {
    id: "COORDINATED_CASCADE",
    name: "Coordinated Multi-Substation Cyber Storm",
    target: "MULTI",
    severity: "CRITICAL",
    description:
      "Simultaneously trips LINE-02-03, LINE-02-04, and LINE-06-10 while derating upstream substation capacity to 6.8 MW.",
  },
];

export default function CyberLabPage() {
  const { session, applyAction, applyRestorationPlan, resetSession } =
    useSimulationStore();
  useEffect(() => {
    if (session.network_id !== "TRAINING_FEEDER")
      resetSession("TRAINING_FEEDER", null, null);
  }, [session.network_id, resetSession]);
  const [idsAlertLog, setIdsAlertLog] = useState<string[]>([
    "[IDS-NOMINAL] Chi-Square state estimation residual ||z - h(x)||_2 within 99% confidence bound.",
    "[AEGIS-AGENT] Standing by for cyber-physical anomaly detection and autonomous CAPER isolation.",
  ]);

  const launchVector = async (vec: (typeof CYBER_VECTORS)[0]) => {
    if (vec.target === "MULTI") {
      await applyAction("INJECT_FAULT", "LINE-02-03");
      await applyAction("INJECT_FAULT", "LINE-02-04");
      await applyAction("INJECT_FAULT", "LINE-06-10");
      await applyAction("SET_SOURCE_CAPACITY", "BUS-01", 6.8);
    } else {
      await applyAction("INJECT_FAULT", vec.target);
    }
    setIdsAlertLog((prev) => [
      `[ALERT • ${vec.id}] Detected uncommanded topology/telemetry residual spike on ${vec.target}!`,
      `[RESIDUAL CHECK] Kirchhoff nodal mismatch + GOOSE sequence number anomaly flagged as CYBER_SABOTAGE.`,
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
            Simulate adversarial cyber-physical attacks on substation breakers
            and SCADA telemetry, inspect physics-informed residual detection,
            and trigger autonomous CAPER self-healing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await applyRestorationPlan("CAPER");
              setIdsAlertLog((prev) => [
                "[AEGIS + CAPER] Isolated compromised breakers, closed tie-switches, and restored 100% critical load.",
                ...prev,
              ]);
            }}
            className="rounded-lg bg-blue-800 hover:bg-blue-800 px-4 py-2 font-sans text-xs font-bold text-white transition"
          >
            Execute Autonomous Aegis + CAPER Defense
          </button>
          <button
            onClick={() => resetSession("TRAINING_FEEDER", null, null)}
            className="rounded-lg bg-slate-100 hover:bg-slate-100 px-3.5 py-2 font-sans text-xs text-slate-700 transition"
          >
            Reset Grid
          </button>
        </div>
      </div>

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
              <Terminal className="h-4 w-4" /> Event timeline · synthetic
              detections
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
    </div>
  );
}

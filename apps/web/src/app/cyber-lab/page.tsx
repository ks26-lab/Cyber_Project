"use client";

import React, { useState } from "react";
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
  const { session, applyAction, applyRestorationPlan, resetSession } = useSimulationStore();
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
    <div className="flex-1 scada-grid-bg p-4 lg:p-6 space-y-5">
      <div className="scada-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-red-500/30">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 border border-red-500/30 font-mono text-xs text-red-300 mb-1.5">
            GRIDSEC // ZERO CYBER-PHYSICAL SECURITY & AEGIS DEFENSE LAB
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            IEC-61850 GOOSE Intrusion, FDIA Residual Detection & Autonomous Recovery
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Simulate adversarial cyber-physical attacks on substation breakers and SCADA telemetry, inspect physics-informed residual detection, and trigger autonomous CAPER self-healing.
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
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 font-mono text-xs font-bold text-slate-950 transition"
          >
            Execute Autonomous Aegis + CAPER Defense
          </button>
          <button
            onClick={() => resetSession("TRAINING_FEEDER", null, null)}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 font-mono text-xs text-slate-200 transition"
          >
            Reset Grid
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 space-y-4">
          {/* Attack Vectors */}
          <div className="scada-panel rounded-xl p-4 space-y-3">
            <h2 className="font-mono text-xs font-bold uppercase text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Adversarial Threat Injection Vectors
            </h2>
            {CYBER_VECTORS.map((v) => (
              <div
                key={v.id}
                className="rounded-lg bg-[#06090F] p-3 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-white">{v.name}</span>
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    {v.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{v.description}</p>
                <button
                  onClick={() => launchVector(v)}
                  className="w-full rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 py-1.5 font-mono text-xs font-bold text-red-200 transition"
                >
                  Inject {v.id}
                </button>
              </div>
            ))}
          </div>

          {/* Physics-Informed IDS Console */}
          <div className="scada-panel rounded-xl p-4 space-y-2">
            <h3 className="font-mono text-xs font-bold uppercase text-cyan-400 flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Physics-Informed IDS & Residual Log
            </h3>
            <div className="rounded-lg bg-[#06090F] p-3 border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-52 overflow-y-auto">
              {idsAlertLog.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes("ALERT")
                      ? "text-red-300"
                      : line.includes("AEGIS + CAPER")
                      ? "text-emerald-300"
                      : "text-cyan-300"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <CityCanvas3D heightClass="h-[520px]" />
        </div>
      </div>
    </div>
  );
}


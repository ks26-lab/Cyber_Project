"use client";

import React from "react";
import Link from "next/link";
import { Play, Zap, Cpu, FlaskConical, Swords, CheckCircle2, ArrowRight } from "lucide-react";

const DEMO_STEPS = [
  {
    minute: "Minute 0:00 – 1:00",
    title: "1. 3D City Command & Hospital Feeder Fault Injection",
    route: "/simulation",
    talking_points: [
      "Show the 12-Bus 33/11 kV Smart City in isometric 3D with animated power flow particles and solved Newton-Raphson AC telemetry.",
      "Click 'Trip Hospital Feeder (LINE-02-03)' in the Disturbance Controls panel to plunge Metro Trauma Hospital (BUS-03) and North Residential (BUS-07) into blackout.",
      "Switch the 3D camera preset to 'Hospital' to inspect the de-energized Tier-1 facility.",
    ],
  },
  {
    minute: "Minute 1:00 – 2:15",
    title: "2. Step-by-Step DSA Trace Replay (BFS, Tarjan, Dijkstra, Knapsack DP)",
    route: "/algorithms",
    talking_points: [
      "Open the 13-Algorithm DSA Lab and run BFS (O(1) deque FIFO) to visualize the de-energized island.",
      "Switch to Tarjan's Bridge Detection to highlight single-point-of-failure corridors in O(V + E).",
      "Run Dijkstra (Binary Min-Heap) and 0/1 Knapsack DP, stepping through the pseudocode and live internal frontier state.",
    ],
  },
  {
    minute: "Minute 2:15 – 3:30",
    title: "3. 8-Stage CAPER Restoration & True Post-Action AC Verification",
    route: "/algorithms/caper",
    talking_points: [
      "Open the CAPER Inspector and show the 8-stage pipeline from Graph + DP candidate synthesis to pandapower AC Newton-Raphson validation.",
      "Highlight how CAPER rejects candidates that violate bus voltage (< 0.92 pu) or branch thermal limits (> 100%) and selects the highest-scoring AC-feasible plan.",
      "Click 'Commit Selected Plan to City' to close tie switch SW-TIE-2, dispatch BESS, and restore 100% of critical hospital load.",
    ],
  },
  {
    minute: "Minute 3:30 – 4:30",
    title: "4. Campaign Missions (01–07) & Human-vs-AI Dispatcher Arena",
    route: "/challenge",
    talking_points: [
      "Open the Human-vs-AI Arena (or Mission 07 on the IEEE 33-Bus benchmark) and compare human switching decisions against CAPER, MILP-Reference, AC-Greedy, Graph-Greedy, and Priority-Greedy.",
    ],
  },
  {
    minute: "Minute 4:30 – 5:00",
    title: "5. Reproducible Multi-Seed Research Benchmarks & CSV Export",
    route: "/research",
    talking_points: [
      "Show the statistical summary table (Mean ± SD, Median, IQR, 95% CI, AC Feasibility Rate %) across seeded contingencies on both the 12-Bus Urban Feeder and IEEE 33-Bus Baran & Wu Benchmark.",
      "Download the CSV artifact to demonstrate complete scientific reproducibility.",
    ],
  },
];

export default function FacultyDemoGuidePage() {
  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-8 space-y-6">
      <div className="scada-panel rounded-2xl p-6 border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 border border-emerald-500/30 font-mono text-xs text-emerald-300 mb-2">
            5-MINUTE LIVE FACULTY REVIEW & INTERVIEW WALKTHROUGH
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            GRIDSEC // ZERO — Interactive Presentation Script
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            Follow this structured 5-step sequence to demonstrate the 3D City game, the 13 DSA algorithms, the 8-stage CAPER restoration engine, pandapower AC physics, and reproducible scientific benchmarks.
          </p>
        </div>
        <Link
          href="/simulation"
          className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-3 font-mono text-xs font-bold text-slate-950 transition"
        >
          <Play className="h-4 w-4" /> Start Step 1 in 3D City Command
        </Link>
      </div>

      <div className="space-y-4">
        {DEMO_STEPS.map((step, i) => (
          <div
            key={i}
            className="scada-panel rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 max-w-4xl">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="rounded bg-cyan-500/20 px-2.5 py-0.5 font-bold text-cyan-300 border border-cyan-500/30">
                  {step.minute}
                </span>
                <span className="font-bold text-white text-sm">{step.title}</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                {step.talking_points.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>

            <Link
              href={step.route}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 font-mono text-xs font-bold text-cyan-300 transition"
            >
              Open {step.route} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}


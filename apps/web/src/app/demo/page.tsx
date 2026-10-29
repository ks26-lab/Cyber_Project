"use client";

import React from "react";
import Link from "next/link";
import {
  Play,
  Zap,
  Cpu,
  FlaskConical,
  Swords,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const DEMO_STEPS = [
  {
    minute: "Minute 0:00 – 1:00",
    title: "1. Restore: Hospital Feeder Fault Injection",
    route: "/restore",
    talking_points: [
      "Select the 12-bus training feeder and show the city overview. Use the 2D view; optionally switch to 3D when the browser supports graphics.",
      "Open the Electrical inspector tab and trip LINE-02-03. Inspect the hospital and the change in critical load served.",
      "Switch the 3D camera preset to 'Hospital' to inspect the de-energized Tier-1 facility.",
    ],
  },
  {
    minute: "Minute 1:00 – 2:15",
    title:
      "2. Step-by-Step DSA Trace Replay (BFS, Tarjan, Dijkstra, Knapsack DP)",
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
    title: "4. GRID COMMAND: Play, repair and compare",
    route: "/grid-command",
    talking_points: [
      "Open Grid Command, start Hospital Blackout, select the faulted feeder and repair it. Finish the level, then compare the outcome against CAPER from the same initial conditions.",
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
      <div className="scada-panel rounded-2xl p-6 border-teal-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 border border-teal-200 font-sans text-xs text-teal-700 mb-2">
            5-MINUTE LIVE FACULTY REVIEW & INTERVIEW WALKTHROUGH
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            GRIDSEC // ZERO — Interactive Presentation Script
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Follow this structured 5-step sequence to demonstrate the city
            simulation, the 13 DSA algorithms, the 8-stage CAPER restoration
            engine, pandapower AC physics, and reproducible scientific
            benchmarks.
          </p>
        </div>
        <Link
          href="/restore"
          className="flex items-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-800 px-5 py-3 font-sans text-xs font-bold text-white transition"
        >
          <Play className="h-4 w-4" /> Start the restoration scenario
        </Link>
      </div>

      <div className="space-y-4">
        {DEMO_STEPS.map((step, i) => (
          <div
            key={i}
            className="scada-panel rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 max-w-4xl">
              <div className="flex items-center gap-2 font-sans text-xs">
                <span className="rounded bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 border border-blue-200">
                  {step.minute}
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {step.title}
                </span>
              </div>
              <details>
                <summary>Scene narrative & talking points</summary>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {step.talking_points.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </details>
            </div>

            <Link
              href={step.route}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-100 border border-slate-200 px-4 py-2 font-sans text-xs font-bold text-blue-700 transition"
            >
              Open {step.route} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Cpu, Zap, FlaskConical, ShieldCheck, ExternalLink } from "lucide-react";

export default function DocumentationHubPage() {
  return (
    <div className="flex-1 scada-grid-bg p-4 lg:p-8 space-y-6">
      <div className="scada-panel rounded-2xl p-6 border-cyan-500/30">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 border border-cyan-500/30 font-mono text-xs text-cyan-300 mb-2">
          TECHNICAL ARCHITECTURE, DSA SPECIFICATION & POWER SYSTEM MODELING
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          GRIDSEC // ZERO — System Architecture & Academic Documentation
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-4xl">
          Complete engineering reference covering the hybrid Next.js + FastAPI + pandapower architecture, the 13 Data Structures & Algorithms, the 8-stage CAPER restoration formulation, and reproducible benchmark methodology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h2 className="font-mono text-sm font-bold text-cyan-400 flex items-center gap-2">
            <Cpu className="h-4 w-4" /> 1. 13-Algorithm DSA Catalog & Complexity
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every algorithm in <code>backend/app/dsa/algorithms_catalog.py</code> operates on the authoritative electrical graph and returns a step-by-step <code>AlgorithmTrace</code> with internal frontier snapshots:
          </p>
          <ul className="list-disc list-inside font-mono text-xs text-slate-300 space-y-1">
            <li>BFS (O(1) deque FIFO): O(V + E) time, O(V) space — Energized reachability</li>
            <li>DFS (Explicit LIFO Stack): O(V + E) time, O(V) space — Island & loop discovery</li>
            <li>Dijkstra (Binary Min-Heap): O((V + E) log V) — Minimum-impedance routing</li>
            <li>Tarjan Bridges & Articulation Points: O(V + E) — Single-point-of-failure detection</li>
            <li>Disjoint Set Union (Path Compression + Rank): O(E α(V)) — Radiality & islands</li>
            <li>Kruskal MST: O(E log E) — Minimum-loss radial feeder spanning forest</li>
            <li>0/1 & Continuous Knapsack DP: O(N · W) — Critical load triage under deficit</li>
            <li>Successive Shortest-Path Min-Cost Max-Flow: O(F · E log V) — Multi-source routing</li>
            <li>A* Spatial-Electrical Routing: O((V + E) log V) — 3D heuristic pathfinding</li>
            <li>Binary Max-Heap, Multi-Key O(1) Hash Table, Prefix Trie & O(1) Ring Buffer</li>
          </ul>
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h2 className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-2">
            <Zap className="h-4 w-4" /> 2. Electrical Physics & pandapower AC Solver
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            All steady-state and post-restoration states are solved via nonlinear Newton-Raphson AC power flow (<code>pandapower 3.5.6</code>) with strict data provenance (<code>AC_SOLVED</code> vs <code>APPROXIMATE_MODEL</code>):
          </p>
          <ul className="list-disc list-inside font-mono text-xs text-slate-300 space-y-1">
            <li>
              <strong>TRAINING_FEEDER</strong>: 12-Bus 33/11 kV Smart City Feeder (4 Tie Switches, 2 BESS)
            </li>
            <li>
              <strong>IEEE_33_DISTRIBUTION</strong>: Authentic Baran & Wu (1989) 12.66 kV 33-Bus radial feeder + 5 tie switches
            </li>
            <li>
              <strong>IEEE_30</strong>: Standard 30-Bus 132/33 kV transmission benchmark
            </li>
            <li>
              <strong>INDIA_GRID_59</strong>: 59-Substation Indian National Grid across 5 RLDC regions
            </li>
            <li>
              <strong>Discrete-Time BESS</strong>: Enforces power (kW) vs energy (kWh), η_c / η_d efficiencies, and SOC reserve bounds
            </li>
          </ul>
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h2 className="font-mono text-sm font-bold text-violet-400 flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> 3. Proposed 8-Stage CAPER Methodology
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>CAPER</strong> (<em>Criticality-Aware Power Emergency Restoration</em>) synthesizes topological graph discovery (BFS, DSU, Tarjan), shortest-impedance tie-switch routing (Dijkstra, Kruskal MST), and 0/1 Knapsack DP load shedding with BESS dispatch, then clones the network to validate every candidate under full Newton-Raphson AC power flow.
          </p>
          <div className="pt-2">
            <Link
              href="/algorithms/caper"
              className="inline-flex items-center gap-1.5 rounded bg-violet-500/20 border border-violet-400/50 px-3 py-1.5 font-mono text-xs font-bold text-violet-200"
            >
              Open Interactive CAPER Inspector
            </Link>
          </div>
        </div>

        <div className="scada-panel rounded-xl p-5 space-y-3">
          <h2 className="font-mono text-sm font-bold text-amber-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> 4. Legacy GRIDSEC Compatibility & Preservation
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            All legacy GRIDSEC routes, backend services, daily fairness scheduler, cyber detection engine, and standalone HTML/JS interfaces (<code>index.html</code>, <code>app.html</code>, <code>game.html</code> served on port 8000) remain 100% preserved and verified by 328 passing pytest unit and integration tests.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-slate-800 border border-slate-700 px-3 py-1.5 font-mono text-xs text-cyan-300"
            >
              FastAPI OpenAPI Swagger <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-400/50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-200"
            >
              Open 5-Minute Faculty Demo Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


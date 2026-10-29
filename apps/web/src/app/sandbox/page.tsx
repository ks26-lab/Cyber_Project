"use client";

import { CityCanvas3D } from "@/components/city3d/CityCanvas3D";
import { EngineeringInspector } from "@/components/simulation/EngineeringInspector";
import { useSimulationStore } from "@/store/useSimulationStore";

export default function SandboxPage() {
  const {
    session,
    resetSession,
    undoAction,
    runCaper,
    applyRestorationPlan,
    caperResult,
    loading,
    error,
  } = useSimulationStore();
  const unavailable =
    loading || session.solver_provenance === "REFERENCE_PREVIEW";
  const candidate = caperResult?.selected_candidate;
  return (
    <div className="flex-1 scada-grid-bg p-5 lg:p-10 space-y-5">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Technical Lab / Sandbox</div>
          <h1>Engineering sandbox</h1>
          <p>
            Test faults, routing, source limits and battery energy on the shared
            electrical model.
          </p>
        </div>
      </div>
      <div className="scada-panel rounded-xl p-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Network{" "}
          <select
            aria-label="Sandbox network"
            className="ml-2 rounded border border-slate-200 bg-white p-2"
            disabled={loading}
            value={session.network_id}
            onChange={(event) => resetSession(event.target.value, null, null)}
          >
            {[
              "TRAINING_FEEDER",
              "IEEE_33_DISTRIBUTION",
              "IEEE_30",
              "INDIA_GRID_59",
            ].map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <button
          className="quiet-button"
          disabled={unavailable || session.revision <= 1}
          onClick={() => undoAction()}
        >
          Undo action
        </button>
        <button
          className="quiet-button"
          disabled={loading}
          onClick={() => resetSession(session.network_id, null, null)}
        >
          Reset network
        </button>
        <button
          className="quiet-button"
          disabled={unavailable}
          onClick={() => runCaper()}
        >
          Analyze with CAPER
        </button>
        <button
          className="quiet-button"
          disabled={
            unavailable || !candidate?.feasible || !candidate?.ac_validated
          }
          onClick={() => applyRestorationPlan("CAPER")}
        >
          Apply feasible plan
        </button>
      </div>
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Solving the electrical state…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 min-w-0">
          <CityCanvas3D heightClass="h-[540px]" />
        </div>
        <div className="lg:col-span-4 min-w-0">
          <EngineeringInspector />
        </div>
      </div>
    </div>
  );
}

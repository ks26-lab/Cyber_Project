"use client";
import { useEffect } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
export function SimulationConnection() {
  const { session, error, loading, fetchSession } = useSimulationStore();
  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);
  if (!error && session.solver_provenance !== "REFERENCE_PREVIEW") return null;
  return (
    <div className="connection-state" role={error ? "alert" : "status"}>
      {error
        ? `Simulation service: ${error}`
        : "Connecting to the simulation engine… Reference preview; electrical results are not verified."}
      {error && (
        <button
          disabled={loading}
          className="quiet-button"
          onClick={() => fetchSession()}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

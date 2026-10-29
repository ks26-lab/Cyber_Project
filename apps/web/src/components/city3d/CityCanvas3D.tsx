"use client";

import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { FeederDiagram } from "@/components/simulation/FeederDiagram";
import {
  useSimulationStore,
  type SimulationSessionState,
} from "@/store/useSimulationStore";
import {
  detectGraphicsCapability,
  getGraphicsCapability,
  getGraphicsFailureReason,
  markGraphicsUnavailable,
  retryGraphics,
  subscribeGraphicsCapability,
} from "./webglCapability";

// No Three.js or React Three Fiber code is evaluated until the capability probe passes.
const CityRenderer3D = lazy(() => import("./CityRenderer3D"));

/** Lets a page (e.g. the game) own selection and highlights instead of the shared store. */
export type ViewOverrides = {
  selectedAssetId?: string | null;
  onSelectAsset?: (id: string) => void;
  traceNodeIds?: string[];
  traceEdgeIds?: string[];
};

class GraphicsBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    markGraphicsUnavailable(
      "The 3D view stopped unexpectedly. The 2D network shows the same simulation.",
      "lost",
    );
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function NetworkFallback({
  checking = false,
  sessionOverride,
  interactive = true,
  overrides = {},
}: {
  checking?: boolean;
  sessionOverride?: SimulationSessionState;
  interactive?: boolean;
  overrides?: ViewOverrides;
}) {
  const {
    session: liveSession,
    selectedAssetId,
    setSelectedAssetId,
    activeTraceNodeIds,
    activeTraceEdgeIds,
    overlayMode,
    setOverlayMode,
    applyAction,
    loading,
  } = useSimulationStore();
  const session = sessionOverride ?? liveSession;
  return (
    <div data-testid="grid-2d-fallback" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white text-xs text-slate-600">
        <p role="status">
          {checking
            ? "Preparing the grid view…"
            : "Interactive 2D network · all simulation controls remain available."}
        </p>
        <label>
          Layer{" "}
          <select
            aria-label="2D network layer"
            className="ml-2 rounded border border-slate-200 p-1"
            value={overlayMode}
            onChange={(event) =>
              setOverlayMode(event.target.value as typeof overlayMode)
            }
          >
            <option value="ENERGIZATION">Power supply</option>
            <option value="CRITICALITY">Criticality</option>
            <option value="VOLTAGE">Voltage</option>
            <option value="THERMAL">Line loading</option>
            <option value="ALGORITHM_TRACE">Algorithm trace</option>
          </select>
        </label>
      </div>
      <FeederDiagram
        session={session}
        selectedAssetId={
          overrides.selectedAssetId !== undefined
            ? overrides.selectedAssetId
            : selectedAssetId
        }
        onSelect={overrides.onSelectAsset ?? setSelectedAssetId}
        traceNodeIds={overrides.traceNodeIds ?? activeTraceNodeIds}
        traceEdgeIds={overrides.traceEdgeIds ?? activeTraceEdgeIds}
        overlayMode={overlayMode}
      />
      {interactive && !sessionOverride && (
      <details className="p-4 text-xs border-t border-slate-200 bg-white">
        <summary className="cursor-pointer">Operate tie switches</summary>
        <div className="flex flex-wrap gap-2 mt-3">
          {session.switches.map((sw) => (
            <button
              key={sw.switch_id}
              className="quiet-button"
              disabled={loading || !sw.operable}
              onClick={() =>
                applyAction(
                  sw.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH",
                  sw.switch_id,
                )
              }
            >
              {sw.switch_id} · {sw.closed ? "Open" : "Close"}
            </button>
          ))}
        </div>
      </details>
      )}
    </div>
  );
}

export function CityCanvas3D({
  heightClass = "h-[560px]",
  showViewControls = true,
  session,
  interactive = true,
  overrides,
}: {
  heightClass?: string;
  showViewControls?: boolean;
  /** A recorded state to display (replay); defaults to the live session. */
  session?: SimulationSessionState;
  interactive?: boolean;
  overrides?: ViewOverrides;
}) {
  const capability = useSyncExternalStore(
    subscribeGraphicsCapability,
    getGraphicsCapability,
    () => "unknown",
  );
  const [mode, setMode] = useState<"2D" | "3D">("3D");
  // Remounts the error boundary after an explicit retry.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    detectGraphicsCapability();
  }, []);
  const show3D = mode === "3D" && capability === "available";
  const fallback = (
    <NetworkFallback
      checking={capability === "unknown"}
      sessionOverride={session}
      interactive={interactive}
      overrides={overrides}
    />
  );
  const retry = () => {
    setMode("3D");
    setAttempt((n) => n + 1);
    retryGraphics();
  };
  return (
    <section
      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden"
      aria-label="Interactive electricity network"
      data-graphics-status={capability}
      data-graphics-failure={
        capability === "unavailable" ? getGraphicsFailureReason() : undefined
      }
    >
      <div className="flex flex-wrap gap-3 justify-between items-center px-4 py-3 border-b border-slate-200">
        <strong className="text-sm font-medium">
          {show3D ? "3D city" : "Electrical network"}
        </strong>
        {showViewControls && (
          <div
            className="flex gap-2"
            role="group"
            aria-label="Network view mode"
          >
            <button
              className="quiet-button"
              aria-pressed={!show3D}
              onClick={() => setMode("2D")}
            >
              2D Network
            </button>
            <button
              className="quiet-button"
              aria-pressed={show3D}
              disabled={capability !== "available"}
              onClick={() => setMode("3D")}
            >
              3D City
            </button>
          </div>
        )}
      </div>
      {capability === "unavailable" && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 px-4 py-3 border-b border-slate-200 bg-slate-50"
          role="status"
        >
          <span>
            {getGraphicsFailureReason() ||
              "3D graphics are unavailable in this browser."}{" "}
            The 2D network below is fully interactive.
          </span>
          <button type="button" className="quiet-button" onClick={retry}>
            Try 3D Again
          </button>
        </div>
      )}
      {show3D ? (
        <GraphicsBoundary key={attempt} fallback={fallback}>
          <Suspense
            fallback={
              <div
                className={`${heightClass} grid place-items-center text-sm text-slate-500`}
                role="status"
              >
                Loading the 3D city…
              </div>
            }
          >
            <CityRenderer3D
              heightClass={heightClass}
              session={session}
              interactive={interactive}
              overrides={overrides}
            />
          </Suspense>
        </GraphicsBoundary>
      ) : (
        fallback
      )}
    </section>
  );
}

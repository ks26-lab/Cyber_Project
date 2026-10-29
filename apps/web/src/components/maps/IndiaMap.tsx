"use client";
import { useEffect, useRef, useState } from "react";
import boundaries from "@/data/indiaBoundaries.json";
import network from "@/data/indiaNetwork.json";
import {
  type SimulationSessionState,
  useSimulationStore,
} from "@/store/useSimulationStore";
import {
  nationalMetrics,
  nodesForState,
  useIndiaGridStore,
} from "@/store/useIndiaGridStore";
import "./grid-intelligence.css";
export const indiaNodes = network.nodes;
export const indiaStates = boundaries.map((s) => s.name).sort();
const xy = (n: { lon: number; lat: number }) => [
  (n.lon - 67) * 18,
  (38 - n.lat) * 20,
];
const base = { x: 0, y: 0, w: 600, h: 650 };
export function IndiaMap({
  region = "ALL",
  overlay = "Connectivity",
  selected: controlledSelected,
  onSelect,
  preview = false,
  modelSession,
  selectedState: controlledState,
  onStateSelect,
}: {
  region?: string;
  overlay?: string;
  selected?: string;
  onSelect?: (id: string) => void;
  preview?: boolean;
  modelSession?: SimulationSessionState;
  selectedState?: string;
  onStateSelect?: (name: string) => void;
}) {
  const shared = useSimulationStore((s) => s.session),
    national = useIndiaGridStore();
  const selected = controlledSelected ?? national.selectedNode,
    state = controlledState ?? national.selectedState;
  const session = modelSession || national.session || shared,
    live = session.network_id === "INDIA_GRID_59";
  const [camera, setCamera] = useState(base),
    [hover, setHover] = useState<{ title: string; detail: string } | null>(
      null,
    );
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      clientX: number;
      clientY: number;
      camera: typeof base;
      moved: boolean;
    } | null>(null),
    moved = useRef(false);
  const nodes = network.nodes.filter(
      (n) => region === "ALL" || n.region === region,
    ),
    selectedNodes = new Set(nodesForState(state).map((n) => n.id));
  useEffect(() => {
    if (!state || preview) return;
    const path = Array.from(
      svg.current?.querySelectorAll<SVGPathElement>("path[data-state]") || [],
    ).find((p) => p.dataset.state === state);
    if (!path) return;
    const b = path.getBBox(),
      w = Math.max(90, b.width * 1.5),
      h = Math.max(100, b.height * 1.5),
      scale = Math.min(600 / w, 650 / h, 4);
    setCamera({
      x: b.x + b.width / 2 - 300 / scale,
      y: b.y + b.height / 2 - 325 / scale,
      w: 600 / scale,
      h: 650 / scale,
    });
  }, [state, preview]);
  useEffect(() => {
    if (!selected || preview) return;
    const n = network.nodes.find((n) => n.id === selected);
    if (!n) return;
    const [x, y] = xy(n);
    setCamera({ x: x - 150, y: y - 162.5, w: 300, h: 325 });
  }, [selected, preview]);
  const selectState = (name: string) => {
    if (moved.current) return;
    national.selectState(name);
    onStateSelect?.(name);
  };
  const selectNode = (id: string) => {
    national.selectNode(id);
    onSelect?.(id);
  };
  const zoom = (factor: number) =>
    setCamera((c) => {
      const w = Math.max(120, Math.min(600, c.w * factor)),
        h = (w * 650) / 600;
      return { x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h };
    });
  return (
    <div className={`map-surface ${preview ? "pointer-events-none" : ""}`}>
      <div className="visual-title">
        <span className="india-map-title">
          {preview
            ? "INDIA / REFERENCE NETWORK"
            : state || "India · Simulated reference grid"}
        </span>
        {!preview && (
          <span className="india-map-tools">
            <button
              aria-label="Zoom out"
              className="quiet-button"
              onClick={() => zoom(1.4)}
            >
              −
            </button>
            <button
              aria-label="Zoom in"
              className="quiet-button"
              onClick={() => zoom(1 / 1.4)}
            >
              +
            </button>
            <button
              className="quiet-button"
              onClick={() => {
                setCamera(base);
                national.selectState("");
                onStateSelect?.("");
              }}
            >
              Fit
            </button>
          </span>
        )}
      </div>
      <svg
        ref={svg}
        viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
        tabIndex={preview ? undefined : 0}
        role="group"
        aria-label="Geographic India map with state boundaries and modeled transmission substations"
        aria-describedby={preview ? undefined : "india-map-keyboard"}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const keys: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          if (keys[e.key]) {
            e.preventDefault();
            const [x, y] = keys[e.key];
            setCamera((c) => ({
              ...c,
              x: c.x + x * c.w * 0.08,
              y: c.y + y * c.h * 0.08,
            }));
          }
          if (e.key === "+" || e.key === "=") zoom(1 / 1.4);
          if (e.key === "-") zoom(1.4);
        }}
        onPointerDown={(e) => {
          if (preview || (e.target as Element).tagName === "circle") return;
          moved.current = false;
          drag.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            camera,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.clientX,
            dy = e.clientY - d.clientY;
          if (Math.abs(dx) + Math.abs(dy) > 4) {
            d.moved = true;
            moved.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.getBoundingClientRect(),
              scale = Math.max(
                d.camera.w / rect.width,
                d.camera.h / rect.height,
              );
            setCamera({
              ...d.camera,
              x: d.camera.x - dx * scale,
              y: d.camera.y - dy * scale,
            });
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => setHover(null)}
      >
        <text x="35" y="445" fill="#8d9eae" fontSize="10" letterSpacing="3">
          ARABIAN SEA
        </text>
        <text x="385" y="475" fill="#8d9eae" fontSize="10" letterSpacing="3">
          BAY OF BENGAL
        </text>
        {boundaries.map((s) => {
          const stats = nationalMetrics(live ? session : null, {
            state: s.name,
          });
          const health =
            stats.violations || stats.faults
              ? "#fbcfc9"
              : stats.demand > 0
                ? "#cce9df"
                : "#dce5eb";
          return (
            <path
              key={s.name}
              data-state={s.name}
              d={s.path}
              className={`state-shape ${state === s.name ? "selected" : ""}`}
              style={overlay === "Grid health" ? { fill: health } : undefined}
              onClick={() => selectState(s.name)}
              tabIndex={preview ? undefined : 0}
              role={preview ? undefined : "button"}
              aria-label={`Select ${s.name}`}
              aria-pressed={state === s.name}
              onMouseEnter={() =>
                setHover({
                  title: s.name,
                  detail:
                    live && stats.nodes.length
                      ? `${stats.nodes.length} modeled assets · ${stats.served.toFixed(1)} MW supplied · ${stats.faults} faults`
                      : stats.nodes.length
                        ? `${stats.nodes.length} representative assets · solve model for metrics`
                        : "No representative assets in this model",
                })
              }
              onFocus={() =>
                setHover({
                  title: s.name,
                  detail: `${stats.nodes.length} modeled assets`,
                })
              }
              onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  moved.current = false;
                  selectState(s.name);
                }
              }}
            >
              <title>{`${s.name} · ${stats.nodes.length} modeled assets`}</title>
            </path>
          );
        })}
        {overlay !== "Regions" &&
          network.corridors.map((l) => {
            const a = nodes.find((n) => n.id === l.from),
              b = nodes.find((n) => n.id === l.to);
            if (!a || !b) return null;
            const result = live
                ? session.power_flow.lines.find((r) => r.line_id === l.id)
                : undefined,
              fault = result?.status === "OUT_OF_SERVICE",
              active = selected === l.from || selected === l.to;
            if (overlay === "Incidents" && !fault) return null;
            // Slow dashes show the direction of the solved branch flow.
            const flowing =
              !fault &&
              result &&
              Math.abs(result.p_from_mw) > 1 &&
              (overlay === "Connectivity" || overlay === "Grid health");
            return (
              <g key={l.id}>
              <line
                x1={xy(a)[0]}
                y1={xy(a)[1]}
                x2={xy(b)[0]}
                y2={xy(b)[1]}
                stroke={
                  fault
                    ? "#dc2626"
                    : result && result.loading_percent > 100
                      ? "#f59e0b"
                      : "#547b9b"
                }
                strokeOpacity={fault || active ? 1 : 0.28}
                strokeWidth={fault || active ? 2.5 : 1}
                strokeDasharray={fault ? "4 3" : undefined}
              >
                <title>{`${l.name}${result ? ` · ${result.loading_percent.toFixed(1)}% modeled loading` : " · Representative route, not live telemetry"}`}</title>
              </line>
              {flowing && (
                <line
                  className={`india-flow${result.p_from_mw < 0 ? " reverse" : ""}`}
                  x1={xy(a)[0]}
                  y1={xy(a)[1]}
                  x2={xy(b)[0]}
                  y2={xy(b)[1]}
                  aria-hidden="true"
                />
              )}
              </g>
            );
          })}
        {nodes.map((n) => {
          const bus = live
            ? session.power_flow.buses.find((b) => b.bus_id === `BUS-${n.id}`)
            : undefined;
          const asset = live
            ? session.buildings_3d.find((b) => b.bus_id === `BUS-${n.id}`)
            : undefined;
          const bad = bus && (bus.voltage_pu < 0.94 || bus.voltage_pu > 1.06);
          const color =
            (overlay === "Voltage" || overlay === "Grid health") && bus
              ? bad
                ? "#dc2626"
                : "#0d9488"
              : "#244f8f";
          const dim = state && !selectedNodes.has(n.id);
          return (
            <g key={n.id} opacity={dim ? 0.3 : 1}>
              <circle
                cx={xy(n)[0]}
                cy={xy(n)[1]}
                r={selected === n.id ? 6 : preview ? 2.5 : 3.5}
                fill={color}
                className="node-dot"
                role={preview ? undefined : "button"}
                aria-label={`Inspect ${n.name}`}
                aria-pressed={selected === n.id}
                tabIndex={preview ? undefined : 0}
                onClick={() => selectNode(n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectNode(n.id);
                  }
                }}
                onMouseEnter={() =>
                  setHover({
                    title: n.name,
                    detail: bus
                      ? `${bus.voltage_pu.toFixed(3)} pu · ${asset?.served_mw.toFixed(1) || "0"} MW modeled supply`
                      : "Representative asset · simulated capacities",
                  })
                }
              >
                <title>{`${n.name} · ${n.region}${bus ? ` · ${bus.voltage_pu.toFixed(3)} pu` : ""}`}</title>
              </circle>
              {selected === n.id && (
                <text
                  x={xy(n)[0] + 9}
                  y={xy(n)[1] - 9}
                  fontSize={11}
                  fill="#14263d"
                  paintOrder="stroke"
                  stroke="white"
                  strokeWidth="3"
                >
                  {n.name.split("/")[0]}
                </text>
              )}
            </g>
          );
        })}
        <text x="530" y="44" fontSize="12" fill="#66788b">
          N ↑
        </text>
      </svg>
      {hover && !preview && (
        <div className="india-tooltip">
          <strong>{hover.title}</strong>
          <small>{hover.detail}</small>
        </div>
      )}
      <div className="map-footer">
        <span>
          ● Modeled asset　 ─ Representative corridor
          {live ? "　 ⋯ Solved flow direction" : ""}
        </span>
        <span>
          {preview
            ? "59-node reference model"
            : `${nodes.length} nodes · ${overlay}`}
        </span>
      </div>
      {!preview && (
        <span id="india-map-keyboard" className="sr-only">
          Select a state to zoom. Drag to pan, or focus the map and use arrow
          keys. Plus and minus zoom.
        </span>
      )}
    </div>
  );
}

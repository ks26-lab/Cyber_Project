"use client";
import { useState } from "react";
import boundaries from "@/data/indiaBoundaries.json";
import network from "@/data/indiaNetwork.json";
import { useSimulationStore } from "@/store/useSimulationStore";
export const indiaNodes = network.nodes;
const xy = (n: { lon: number; lat: number }) => [
  (n.lon - 67) * 18,
  (38 - n.lat) * 20,
];
export function IndiaMap({
  region = "ALL",
  overlay = "Connectivity",
  selected = "",
  onSelect = () => {},
  preview = false,
}: {
  region?: string;
  overlay?: string;
  selected?: string;
  onSelect?: (id: string) => void;
  preview?: boolean;
}) {
  const session = useSimulationStore((s) => s.session);
  const [state, setState] = useState("");
  const [zoom, setZoom] = useState(1);
  const nodes = network.nodes.filter(
    (n) => region === "ALL" || n.region === region,
  );
  const live = session.network_id === "INDIA_GRID_59";
  return (
    <div className={`map-surface ${preview ? "pointer-events-none" : ""}`}>
      <div className="visual-title">
        <span>
          {preview
            ? "INDIA / REFERENCE NETWORK"
            : state || "India · National transmission network"}
        </span>
        <span>
          {!preview && (
            <>
              <button
                aria-label="Zoom out"
                className="quiet-button"
                onClick={() => setZoom(Math.max(1, zoom - 0.5))}
              >
                −
              </button>{" "}
              <button
                aria-label="Zoom in"
                className="quiet-button"
                onClick={() => setZoom(Math.min(2.5, zoom + 0.5))}
              >
                +
              </button>{" "}
              <button className="quiet-button" onClick={() => setZoom(1)}>
                Fit
              </button>
            </>
          )}
        </span>
      </div>
      <svg
        viewBox={`${300 - 300 / zoom} ${320 - 320 / zoom} ${600 / zoom} ${650 / zoom}`}
        aria-hidden={preview || undefined}
        role="img"
        aria-label="Geographic India map with state boundaries and transmission substations"
      >
        <text x="35" y="445" fill="#8d9eae" fontSize="10" letterSpacing="3">
          ARABIAN SEA
        </text>
        <text x="385" y="475" fill="#8d9eae" fontSize="10" letterSpacing="3">
          BAY OF BENGAL
        </text>
        {boundaries.map((s) => (
          <path
            key={s.name}
            d={s.path}
            className={`state-shape ${state === s.name ? "selected" : ""}`}
            onClick={() => setState(s.name)}
            tabIndex={preview ? undefined : 0}
            role={preview ? undefined : "button"}
            aria-label={`Select ${s.name}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setState(s.name);
            }}
          >
            <title>{s.name}</title>
          </path>
        ))}
        {overlay !== "Regions" &&
          network.corridors.map((l) => {
            const a = nodes.find((n) => n.id === l.from),
              b = nodes.find((n) => n.id === l.to);
            if (!a || !b) return null;
            const result = live
              ? session.power_flow.lines.find((r) => r.line_id === l.id)
              : undefined;
            const fault = result?.status === "OUT_OF_SERVICE";
            if (overlay === "Incidents" && !fault) return null;
            return (
              <line
                key={l.id}
                x1={xy(a)[0]}
                y1={xy(a)[1]}
                x2={xy(b)[0]}
                y2={xy(b)[1]}
                stroke={fault ? "#b65a58" : "#547b9b"}
                strokeOpacity={fault ? 1 : 0.35}
                strokeWidth={fault ? 2 : 1}
                strokeDasharray={fault ? "4 3" : undefined}
              >
                <title>{`${l.name}${result ? ` · ${result.loading_percent.toFixed(1)}% loading` : " · Reference corridor"}`}</title>
              </line>
            );
          })}
        {nodes.map((n) => {
          const bus = live
            ? session.power_flow.buses.find((b) => b.bus_id === `BUS-${n.id}`)
            : undefined;
          const color =
            overlay === "Voltage" && bus
              ? bus.voltage_pu < 0.94
                ? "#b65a58"
                : "#377f80"
              : "#244f8f";
          return (
            <g key={n.id}>
              <circle
                cx={xy(n)[0]}
                cy={xy(n)[1]}
                r={selected === n.id ? 6 : preview ? 2.5 : 3.5}
                fill={color}
                className="node-dot"
                role={preview ? undefined : "button"}
                aria-label={`Inspect ${n.name}`}
                tabIndex={preview ? undefined : 0}
                onClick={() => onSelect(n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(n.id);
                }}
              >
                <title>{`${n.name} · ${n.region}${bus ? ` · ${bus.voltage_pu.toFixed(3)} pu` : ""}`}</title>
              </circle>
              {selected === n.id && (
                <text
                  x={xy(n)[0] + 9}
                  y={xy(n)[1] - 9}
                  fontSize="11"
                  fill="#172b40"
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
      <div className="map-footer">
        <span>● Substation　 ─ Transmission corridor</span>
        <span>
          {preview
            ? "59-node reference model"
            : `${nodes.length} nodes · ${overlay}`}
        </span>
      </div>
    </div>
  );
}

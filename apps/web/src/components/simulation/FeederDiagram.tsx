"use client";

import { useMemo, useRef, useState } from "react";
import type { SimulationSessionState } from "@/store/useSimulationStore";

const names: Record<string, string> = {
  GRID_INTAKE: "Grid intake",
  SUBSTATION: "Substation",
  HOSPITAL: "Hospital",
  WATER_TREATMENT: "Water works",
  CONTROL_CENTER: "Control center",
  UNIVERSITY: "University",
  SCHOOL: "School",
  EMERGENCY_SERVICES: "Emergency services",
  RESIDENTIAL: "Homes",
  INDUSTRIAL: "Industry",
  COMMERCIAL: "Commerce",
  SOLAR: "Solar",
  BATTERY: "Battery",
};
export interface FeederDiagramProps {
  session: SimulationSessionState;
  selectedAssetId?: string | null;
  onSelect?: (id: string) => void;
  traceNodeIds?: string[];
  traceEdgeIds?: string[];
  overlayMode?: string;
}

/**
 * SVG and 3D both consume the same solved state; this renderer performs no grid calculation.
 * Motion is CSS-only (state transitions, flow direction, trace frontier) and is disabled by
 * the global prefers-reduced-motion rule.
 */
export function FeederDiagram({
  session: s,
  selectedAssetId,
  onSelect,
  traceNodeIds = [],
  traceEdgeIds = [],
  overlayMode = "ENERGIZATION",
}: FeederDiagramProps) {
  const [localSelection, setLocalSelection] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const selected =
    selectedAssetId === undefined ? localSelection : selectedAssetId;
  const select = (id: string) => {
    setLocalSelection(id);
    onSelect?.(id);
  };
  const positions = useMemo(() => {
    const buildings = s.buildings_3d;
    const xs = buildings.map((b) => b.position_3d[0]),
      ys = buildings.map((b) => b.position_3d[2]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const map = new Map<string, [number, number]>();
    buildings.forEach((b, i) => {
      const x =
        maxX > minX
          ? 60 + ((b.position_3d[0] - minX) / (maxX - minX)) * 700
          : 410 + 300 * Math.cos((i / buildings.length) * Math.PI * 2);
      const y =
        maxY > minY
          ? 50 + ((b.position_3d[2] - minY) / (maxY - minY)) * 340
          : 225 + 170 * Math.sin((i / buildings.length) * Math.PI * 2);
      map.set(b.bus_id, [x, y]);
    });
    return map;
  }, [s.buildings_3d]);
  const branches = useMemo(
    () => [
      ...s.power_flow.lines.map((l) => ({
        ...l,
        id: l.line_id,
        kind: "Feeder",
        flow: l.p_from_mw,
      })),
      ...(s.power_flow.transformers || []).map((t) => ({
        ...t,
        id: t.transformer_id,
        kind: "Transformer",
        flow: null,
      })),
    ],
    [s.power_flow],
  );
  const switchByLine = useMemo(() => {
    const map = new Map<string, { id: string; closed: boolean }>();
    (s.switches || []).forEach((sw) => {
      if (sw.line_id) map.set(sw.line_id, { id: sw.switch_id, closed: sw.closed });
    });
    return map;
  }, [s.switches]);
  const verified =
    s.solver_provenance === "AC_SOLVED" &&
    s.power_flow.power_balance.converged &&
    s.power_flow.violations.length === 0;
  const asset = s.buildings_3d.find((b) => b.bus_id === selected);
  const branch = branches.find((b) => b.id === selected);
  const large = s.buildings_3d.length > 35;
  if (!s.buildings_3d.length)
    return (
      <div className="empty-network" role="status">
        No solved network available. Select a network or start a scenario.
      </div>
    );
  return (
    <div className="feeder-surface" data-testid="feeder-diagram">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-600 border-b border-slate-200 bg-white">
        <span>
          {s.power_flow.buses.length} modeled buses ·{" "}
          {s.network_id.replaceAll("_", " ")}
        </span>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Electrical network zoom"
        >
          <button
            className="quiet-button"
            aria-label="Zoom network out"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            −
          </button>
          <button
            className="quiet-button"
            aria-label="Zoom network in"
            disabled={zoom >= 4}
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          >
            +
          </button>
          <button
            className="quiet-button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Fit network
          </button>
        </div>
      </div>
      <svg
        className="feeder-svg"
        viewBox={`${410 - 410 / zoom + pan.x} ${245 - 245 / zoom + pan.y} ${820 / zoom} ${490 / zoom}`}
        role="group"
        aria-label="Electrical network with selectable facilities, feeders and transformers"
        style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "default" }}
        onPointerDown={(event) => {
          if (!(event.target as Element).closest('[role="button"]')) {
            drag.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={(event) => {
          if (drag.current && zoom > 1) {
            const scale =
              820 / event.currentTarget.getBoundingClientRect().width / zoom;
            setPan((p) => ({
              x: p.x - (event.clientX - drag.current!.x) * scale,
              y: p.y - (event.clientY - drag.current!.y) * scale,
            }));
            drag.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {branches.map((l) => {
          const a = positions.get(l.from_bus),
            b = positions.get(l.to_bus);
          if (!a || !b) return null;
          const fault = s.active_faults.some(
              (f) => !f.cleared && f.asset_id === l.id,
            ),
            open = l.status === "OUT_OF_SERVICE";
          const inTrace = traceEdgeIds.includes(l.id),
            isSelected = selected === l.id;
          const overloaded = overlayMode === "THERMAL" && l.loading_percent > 100;
          const state = fault
            ? "faulted"
            : open
              ? "open"
              : overloaded
                ? "overloaded"
                : "energized";
          const flow = l.flow ?? (l.loading_percent > 1 ? 1 : 0);
          const sw = switchByLine.get(l.id);
          const sx = a[0] + (b[0] - a[0]) * 0.28,
            sy = a[1] + (b[1] - a[1]) * 0.28;
          const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
          return (
            <g
              key={l.id}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${l.name}`}
              className={`fd-branch ${state}${inTrace ? " trace" : ""}${isSelected ? " selected" : ""}${l.kind === "Transformer" ? " transformer" : ""}`}
              onClick={() => select(l.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(l.id);
                }
              }}
            >
              <line
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke="transparent"
                strokeWidth={18}
              />
              <line
                className="fd-wire"
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
              />
              {state === "energized" && Math.abs(flow) > 0.01 && !large && (
                <line
                  className={`fd-flow${flow < 0 ? " reverse" : ""}`}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                />
              )}
              {fault && (
                <circle
                  className="fd-trip"
                  cx={(a[0] + b[0]) / 2}
                  cy={(a[1] + b[1]) / 2}
                  r={9}
                />
              )}
              {sw && (
                <g
                  className={`fd-switch ${sw.closed ? "closed" : "open"}`}
                  transform={`translate(${sx.toFixed(2)} ${sy.toFixed(2)}) rotate(${angle.toFixed(2)})`}
                >
                  <rect x={-5} y={-5} width={10} height={10} rx={2} />
                  <line className="fd-blade" x1={-5} y1={0} x2={9} y2={0} />
                </g>
              )}
              <title>{`${l.name} · ${fault ? "Faulted, isolated" : open ? "Open" : "Energized"}${sw ? ` · switch ${sw.id} ${sw.closed ? "closed" : "open"}` : ""} · ${l.loading_percent.toFixed(1)}% loading${l.flow !== null ? ` · ${l.flow.toFixed(2)} MW` : ""}`}</title>
              {isSelected && (
                <text
                  x={(a[0] + b[0]) / 2}
                  y={(a[1] + b[1]) / 2 - 9}
                  fontSize={12}
                  fill="#14263d"
                  paintOrder="stroke"
                  stroke="#f7f9fc"
                  strokeWidth={4}
                >
                  {l.loading_percent.toFixed(1)}% loading
                </text>
              )}
            </g>
          );
        })}
        {s.buildings_3d.map((b) => {
          const [x, y] = positions.get(b.bus_id)!;
          const off =
            b.power_state === "BLACKOUT" ||
            (b.demand_mw > 0 && b.served_mw < b.demand_mw * 0.95);
          const inTrace = traceNodeIds.includes(b.bus_id),
            isSelected = selected === b.bus_id;
          let color = off ? "#4b5563" : "#244f8f";
          if (b.power_state === "BACKUP_BATTERY") color = "#0f766e";
          if (overlayMode === "CRITICALITY")
            color =
              b.priority_tier === 1
                ? "#0d9488"
                : b.priority_tier === 2
                  ? "#2563eb"
                  : "#64748b";
          if (overlayMode === "VOLTAGE")
            color =
              b.voltage_pu < 0.92 || b.voltage_pu > 1.08
                ? "#dc2626"
                : "#0d9488";
          if (inTrace) color = "#7c3aed";
          const criticalOut = off && b.priority_tier === 1 && b.demand_mw > 0;
          const radius =
            b.facility_type === "HOSPITAL" ? 18 : large ? 8 : 12;
          const label =
            s.buildings_3d.length <= 16
              ? names[b.facility_type] ||
                b.name.split(" ").slice(0, 2).join(" ")
              : b.bus_id;
          return (
            <g
              key={b.bus_id}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${b.name}`}
              className={`fd-node${off ? " unsupplied" : ""}${inTrace ? " trace" : ""}`}
              onClick={() => select(b.bus_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(b.bus_id);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {criticalOut && (
                <circle className="fd-alarm" cx={x} cy={y} r={radius + 8} />
              )}
              {inTrace && (
                <circle className="fd-frontier" cx={x} cy={y} r={radius + 5} />
              )}
              {isSelected && (
                <circle
                  className="fd-selected"
                  cx={x}
                  cy={y}
                  r={radius + 12}
                />
              )}
              <circle
                className="fd-body"
                cx={x}
                cy={y}
                r={radius}
                fill={color}
                stroke="white"
                strokeWidth={4}
                strokeDasharray={off ? "4 3" : undefined}
              />
              {(s.buildings_3d.length <= 16 || isSelected || inTrace) && (
                <text
                  x={x}
                  y={y + 34}
                  textAnchor="middle"
                  fontSize={14}
                  fill="#263d53"
                  paintOrder="stroke"
                  stroke="#f0f4f7"
                  strokeWidth={3}
                >
                  {label}
                </text>
              )}
              {b.facility_type === "HOSPITAL" && (
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize={18}
                >
                  +
                </text>
              )}
              <title>{`${b.name} · ${b.power_state === "BLACKOUT" ? "no modeled supply" : off ? "partly curtailed" : "supplied"} · priority ${b.priority_tier} · ${b.served_mw.toFixed(2)} / ${b.demand_mw.toFixed(2)} MW · ${b.voltage_pu.toFixed(3)} pu`}</title>
            </g>
          );
        })}
      </svg>
      <div className="map-footer">
        <span>
          {overlayMode === "CRITICALITY"
            ? "Teal: critical · Blue: priority 2 · Gray: flexible"
            : overlayMode === "VOLTAGE"
              ? "Teal: 0.92–1.08 pu · Red: outside display band"
              : overlayMode === "THERMAL"
                ? "Orange: loading above 100% · Red dashed: faulted section"
              : overlayMode === "ALGORITHM_TRACE"
                ? "Purple: active algorithm step"
                : "Blue: supplied · Dark dashed: interrupted or curtailed · Red line: faulted section · Dashed line: open circuit"}
        </span>
        <span>{zoom > 1 ? "Drag to pan" : "Select an asset to inspect"}</span>
      </div>
      {asset && (
        <div className="context-strip px-4">
          <strong>{asset.name}</strong>
          <span className="text-xs text-slate-600">
            {asset.served_mw.toFixed(2)} / {asset.demand_mw.toFixed(2)} MW
            {verified ? " AC-verified supply" : " attempted supply"} ·{" "}
            {asset.voltage_pu.toFixed(3)} pu · priority {asset.priority_tier}
          </span>
        </div>
      )}
      {branch && (
        <div className="context-strip px-4">
          <strong>{branch.name}</strong>
          <span className="text-xs text-slate-600">
            {branch.status.replaceAll("_", " ")} ·{" "}
            {branch.loading_percent.toFixed(1)}% loading
            {branch.flow !== null ? ` · ${branch.flow.toFixed(2)} MW` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

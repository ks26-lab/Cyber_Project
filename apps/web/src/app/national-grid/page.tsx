"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IndiaMap, indiaNodes } from "@/components/maps/IndiaMap";
import { useSimulationStore } from "@/store/useSimulationStore";
export default function NationalGridPage() {
  const { session, resetSession, applyAction, loading, error } =
    useSimulationStore();
  const [region, setRegion] = useState("ALL");
  const [overlay, setOverlay] = useState("Connectivity");
  const [selected, setSelected] = useState("NR-DELHI");
  useEffect(() => {
    resetSession("INDIA_GRID_59", null, null);
  }, [resetSession]);
  const n = indiaNodes.find((n) => n.id === selected)!;
  const live = session.network_id === "INDIA_GRID_59";
  const bus = live
    ? session.power_flow.buses.find((b) => b.bus_id === `BUS-${selected}`)
    : undefined;
  const lines = live
    ? session.power_flow.lines.filter(
        (l) =>
          l.from_bus === `BUS-${selected}` || l.to_bus === `BUS-${selected}`,
      )
    : [];
  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            Geographic intelligence / 59-node reference
          </div>
          <h1>India Grid</h1>
          <p>
            Explore regional connectivity and the electrical consequences of a
            corridor outage.
          </p>
        </div>
        <span className="text-xs text-slate-500">
          {loading
            ? "Solving network…"
            : bus
              ? session.power_flow.power_balance?.converged
                ? "AC model converged"
                : "AC model · convergence not confirmed"
              : "Reference geography · electrical data unavailable"}
        </span>
      </div>
      {error && (
        <p role="status" className="text-amber-700 text-sm">
          {error}
        </p>
      )}
      <div className="workspace">
        <aside className="presentation-hide">
          <div className="eyebrow">Map controls</div>
          <label htmlFor="region">Region</label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {[
              ["ALL", "All India"],
              ["NR", "Northern"],
              ["WR", "Western"],
              ["SR", "Southern"],
              ["ER", "Eastern"],
              ["NER", "North Eastern"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label htmlFor="overlay">Overlay</label>
          <select
            id="overlay"
            value={overlay}
            onChange={(e) => setOverlay(e.target.value)}
          >
            {["Connectivity", "Regions", "Voltage", "Incidents"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <label htmlFor="station">Find substation</label>
          <select
            id="station"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setRegion("ALL");
            }}
          >
            {indiaNodes.map((n) => (
              <option value={n.id} key={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-8">
            Select a state to highlight its geography. Select a node to inspect
            its connected corridors.
          </p>
          <Link href="/dashboard" className="block text-blue-700 text-sm mt-8">
            Power-flow dashboard ↗
          </Link>
        </aside>
        <div className="presentation-expand">
          <IndiaMap
            region={region}
            overlay={overlay}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <aside className="presentation-hide">
          <div className="eyebrow">Selected substation</div>
          <h2 className="text-xl font-semibold mt-4 mb-2">{n.name}</h2>
          <p className="text-sm text-slate-500 mb-5">
            {n.state} · {n.region}
          </p>
          <div className="detail-stat">
            <span>Reference capacity</span>
            <strong>{n.capacityMW.toLocaleString()} MW</strong>
          </div>
          <div className="detail-stat">
            <span>Bus voltage</span>
            <strong>
              {bus ? `${bus.voltage_pu.toFixed(3)} pu` : "Unavailable"}
            </strong>
          </div>
          <div className="detail-stat">
            <span>Connected corridors</span>
            <strong>{bus ? lines.length : "—"}</strong>
          </div>
          <p className="text-xs text-slate-500 mt-4">{n.voltage}</p>
          <details className="mt-5">
            <summary>Corridor operations</summary>
            {lines.length ? (
              lines.map((l) => (
                <div key={l.line_id} className="py-3 border-t border-slate-200">
                  <p className="text-xs mb-2">
                    {l.name} · {l.loading_percent.toFixed(1)}%
                  </p>
                  <button
                    disabled={loading}
                    className="quiet-button"
                    onClick={() =>
                      applyAction(
                        l.status === "OUT_OF_SERVICE"
                          ? "CLEAR_FAULT"
                          : "INJECT_FAULT",
                        l.line_id,
                      )
                    }
                  >
                    {l.status === "OUT_OF_SERVICE" ? "Reclose" : "N-1 trip"}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">
                No solved corridors available.
              </p>
            )}
          </details>
        </aside>
      </div>
      <details className="scada-panel rounded-xl p-5 presentation-hide">
        <summary>Network statistics & geographic provenance</summary>
        <p className="text-sm text-slate-500">
          Reference topology from the repository’s India grid dataset; not live
          operational telemetry. Geographic boundaries from india-maps-data
          (2011 census district geometries, grouped by state; administrative
          boundaries may differ from current boundaries). Geometry is bundled
          locally; no map service or token required.
        </p>
        <a
          className="text-blue-700 text-sm"
          href="https://github.com/udit-001/india-maps-data"
        >
          Boundary source ↗
        </a>
        <p className="mt-3 text-sm">
          {live ? session.power_flow.buses.length : 0} solved buses ·{" "}
          {live ? session.power_flow.lines.length : 0} solved corridors ·{" "}
          {live ? session.kpis.active_faults_count : 0} active model faults
        </p>
      </details>
    </div>
  );
}

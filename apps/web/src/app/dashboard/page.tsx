"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useSimulationStore,
  type SimulationSessionState,
} from "@/store/useSimulationStore";
import {
  useIndiaGridStore,
  nationalMetrics,
  indiaRegions,
} from "@/store/useIndiaGridStore";
import { calculateGridMetrics, allocatedSupply } from "@/store/gridMetrics";
import { IndiaMap } from "@/components/maps/IndiaMap";
import { FeederDiagram } from "@/components/simulation/FeederDiagram";
import "@/components/maps/grid-intelligence.css";
const mw = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "—");
const feasible = (s: SimulationSessionState) =>
  s.solver_provenance === "AC_SOLVED" &&
  s.power_flow.power_balance.converged &&
  s.power_flow.violations.length === 0;
export default function Dashboard() {
  const sim = useSimulationStore(),
    india = useIndiaGridStore();
  const { fetchSession, session: localSession } = sim;
  const { ensure: ensureIndia } = india;
  const [source, setSource] = useState("LOCAL"),
    [ready, setReady] = useState(false),
    [comparison, setComparison] = useState<any>(null),
    [comparisonRevision, setComparisonRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [history, setHistory] = useState<
    Array<{
      revision: number;
      served: number;
      faults: number;
      description: string;
    }>
  >([]);
  useEffect(() => {
    const national =
      new URLSearchParams(window.location.search).get("scope") === "india";
    if (national) {
      setSource("INDIA");
      void ensureIndia();
    } else {
      void fetchSession().then(() => setReady(true));
    }
  }, [fetchSession, ensureIndia]);
  useEffect(() => {
    if (!ready || localSession.solver_provenance === "REFERENCE_PREVIEW")
      return;
    const s = localSession;
    setHistory((h) =>
      [
        ...(s.revision < (h.at(-1)?.revision || 0)
          ? []
          : h.filter((x) => x.revision !== s.revision)),
        {
          revision: s.revision,
          served: s.kpis.total_served_mw,
          faults: s.kpis.active_faults_count,
          description: s.action_log.at(-1)?.description || "Session loaded",
        },
      ].slice(-12),
    );
    setComparison(null);
  }, [localSession, ready]);
  const national = source === "INDIA",
    session = national
      ? india.session
      : ready && sim.session.solver_provenance !== "REFERENCE_PREVIEW"
        ? sim.session
        : null;
  const loading = national ? india.loading : sim.loading || !ready,
    error = national ? india.error : sim.error;
  const scope = nationalMetrics(india.session, {
    state: india.selectedState,
    region: india.region,
    node: india.selectedNode,
  });
  const assets = national ? scope.assets : session?.buildings_3d || [],
    lines = national ? scope.lines : session?.power_flow.lines || [];
  const { demand, served, generation, critical, criticalServed, utilization } =
    calculateGridMetrics(assets, lines);
  const outages = national
    ? scope.faults
    : session?.kpis.active_faults_count || 0;
  const checked = session ? feasible(session) : false;
  const historyRows = national
    ? india.history.map((h) => ({
        revision: h.revision,
        served: h.served,
        faults: h.faults,
        description: h.action,
      }))
    : history;
  const scopeLabel = national
    ? india.selectedNode
      ? scope.nodes[0]?.name
      : india.selectedState ||
        indiaRegions.find((r) => r.id === india.region)?.name ||
        "All India"
    : session?.network_name || "Local simulation";
  async function compare() {
    if (!session || national) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await sim.compareRestorations();
      if (!result)
        throw Error(
          useSimulationStore.getState().error || "No comparison returned",
        );
      setComparison(result);
      setComparisonRevision(session.revision);
    } catch (e) {
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    setNotice("");
    try {
      await sim.applyRestorationPlan("CAPER");
      const e = useSimulationStore.getState().error;
      if (e) throw Error(e);
      setNotice(
        "CAPER actions applied; dashboard updated from the newly solved state.",
      );
    } catch (e) {
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="intel-shell">
      <div className="intel-heading">
        <div>
          <span className="eyebrow">
            Electricity intelligence / Computed simulation state
          </span>
          <h1>Grid control dashboard</h1>
          <p>
            {scopeLabel}. Monitor allocation, constraints and recovery from the
            authoritative simulation engine.
          </p>
        </div>
        <div className="intel-actions">
          <label className="sr-only" htmlFor="dashboard-source">
            Dashboard model
          </label>
          <select
            className="intel-select"
            id="dashboard-source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              if (e.target.value === "INDIA") void india.ensure();
              else void sim.fetchSession().then(() => setReady(true));
            }}
          >
            <option value="LOCAL">Local simulation</option>
            <option value="INDIA">India reference model</option>
          </select>
          <button
            className="secondary-button"
            disabled={loading || busy}
            onClick={() => (national ? india.reset() : sim.fetchSession())}
          >
            Refresh model
          </button>
        </div>
      </div>
      {loading && (
        <div className="intel-status" role="status">
          Solving electrical state…
        </div>
      )}
      {error && (
        <div className="intel-status intel-error" role="alert">
          {error}. Displayed data is the last available state.{" "}
          <button
            className="intel-small-button"
            onClick={() =>
              national
                ? india.ensure()
                : sim.fetchSession().then(() => setReady(true))
            }
          >
            Retry
          </button>
        </div>
      )}
      {notice && (
        <div className="intel-status" role="status">
          {notice}
        </div>
      )}
      {!session ? (
        <div className="intel-empty">
          {loading
            ? "Waiting for the simulation backend."
            : "No solved state available. Start the backend and refresh the model."}
        </div>
      ) : (
        <>
          <div className="intel-controls">
            <span className={`intel-pill ${checked ? "" : "alert"}`}>
              {checked ? "AC feasible" : "Allocation not AC verified"}
            </span>
            <span className="intel-note">
              Revision {session.revision} · {session.sim_time_minutes} simulated
              minutes · {session.power_flow.execution_time_ms.toFixed(1)} ms AC
              solve
            </span>
            {national && (
              <Link className="intel-small-button" href="/national-grid">
                Change geographic selection ↗
              </Link>
            )}
          </div>
          <div className="intel-stats">
            {[
              [
                "Simulated generation",
                mw(generation) + " MW",
                "Active bus generation",
              ],
              ["Demand", mw(demand) + " MW", "Original modeled demand"],
              [
                checked ? "Verified served load" : "Attempted served load",
                mw(served) + " MW",
                checked
                  ? "AC constraints satisfied"
                  : "Allocation requires electrical validation",
              ],
              [
                "Unserved load",
                mw(Math.max(0, demand - served)) + " MW",
                "Disconnected or curtailed demand",
              ],
              [
                "Peak feeder utilization",
                utilization.toFixed(1) + "%",
                "Maximum selected branch loading",
              ],
              ["Active outages", String(outages), "Uncleared simulated faults"],
              [
                checked
                  ? "Verified critical supply"
                  : "Attempted critical supply",
                critical > 0
                  ? ((100 * criticalServed) / critical).toFixed(1) + "%"
                  : "No critical load",
                mw(criticalServed) + " / " + mw(critical) + " MW",
              ],
              [
                "Load continuity",
                demand > 0
                  ? ((100 * served) / demand).toFixed(1) + "%"
                  : "No demand",
                checked
                  ? "Verified current-state continuity"
                  : "Attempted allocation; not a reliability forecast",
              ],
            ].map(([label, value, note]) => (
              <div key={label} className="intel-stat">
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="intel-columns">
            <section className="intel-card">
              <div className="intel-controls">
                <h2>
                  {national
                    ? "Regional electricity distribution"
                    : "Local distribution network"}
                </h2>
                <span className="intel-note">
                  {assets.length} selected assets
                </span>
              </div>
              {national ? (
                <IndiaMap
                  modelSession={session}
                  region={india.region}
                  selected={india.selectedNode}
                  selectedState={india.selectedState}
                  onSelect={india.selectNode}
                  onStateSelect={india.selectState}
                  overlay="Grid health"
                />
              ) : (
                <FeederDiagram session={session} />
              )}
              <p className="intel-note mt-3">
                {national
                  ? "Reference geography with simulated generation, demand and electrical loading. Selection updates the metrics above."
                  : "The local training feeder is a separate model from the national reference grid. Red assets include disconnected or curtailed demand."}
              </p>
            </section>
            <section className="intel-card">
              <h2>Load-priority allocation</h2>
              {[1, 2, 3].map((tier) => {
                const rows = assets.filter((a) => a.priority_tier === tier),
                  d = rows.reduce((v, a) => v + a.demand_mw, 0),
                  s = rows.reduce((v, a) => v + allocatedSupply(a), 0);
                return (
                  <div className="py-4 border-b border-slate-100" key={tier}>
                    <div className="intel-split">
                      <strong>
                        {
                          [
                            "Life safety",
                            "Essential services",
                            "Flexible demand",
                          ][tier - 1]
                        }
                      </strong>
                      <span>
                        {d > 0 ? ((100 * s) / d).toFixed(0) + "%" : "—"}
                      </span>
                    </div>
                    <div className="intel-meter">
                      <div
                        style={{
                          width: `${d ? (100 * s) / d : 0}%`,
                          background:
                            tier === 1
                              ? "#0d9488"
                              : tier === 2
                                ? "#2563eb"
                                : "#f59e0b",
                        }}
                      />
                    </div>
                    <p className="intel-note">
                      {mw(s)} / {mw(d)} MW · {rows.length} assets
                    </p>
                  </div>
                );
              })}
              <h3 className="mt-6">Electrical constraints</h3>
              <p className="intel-note mt-2">
                {session.power_flow.power_balance.converged
                  ? "Newton–Raphson converged."
                  : "AC solution did not converge."}{" "}
                {session.power_flow.violations.length} active violations in the
                full modeled network.
              </p>
              <div className="intel-list intel-scroll">
                {session.power_flow.violations.slice(0, 15).map((v, i) => (
                  <div key={i}>
                    <strong>
                      {v.element_id} · {v.violation_type}
                    </strong>
                    <p>{v.description}</p>
                  </div>
                ))}
                {!session.power_flow.violations.length && (
                  <p className="intel-note mt-4">
                    No constraints reported by this solve. Voltage, branch
                    loading and generation limits are evaluated by the backend.
                  </p>
                )}
              </div>
            </section>
          </div>
          <div className="intel-secondary">
            <section className="intel-card">
              <div className="intel-controls">
                <h2>Algorithm performance comparison</h2>
                {!national && (
                  <button
                    className="secondary-button"
                    disabled={busy || loading}
                    onClick={compare}
                  >
                    {busy ? "Computing…" : "Compare restoration plans"}
                  </button>
                )}
              </div>
              {national ? (
                <p className="intel-note">
                  Restoration strategies use the local feeder’s switch, storage
                  and critical-load model.{" "}
                  <Link className="intel-small-button" href="/restore">
                    Compare the hospital scenario ↗
                  </Link>
                </p>
              ) : comparison ? (
                <>
                  <div className="table-scroll">
                    <table className="intel-table">
                      <thead>
                        <tr>
                          <th>Algorithm</th>
                          <th>AC check</th>
                          <th>Attempted critical supply</th>
                          <th>Execution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.comparison_table.map((r: any) => (
                          <tr key={r.strategy}>
                            <td>{r.strategy}</td>
                            <td>
                              <span
                                className={`intel-pill ${r.feasible && r.ac_validated ? "" : "alert"}`}
                              >
                                {r.feasible && r.ac_validated
                                  ? "Feasible"
                                  : "Not verified"}
                              </span>
                            </td>
                            <td>{r.critical_load_restored_pct.toFixed(1)}%</td>
                            <td>{r.runtime_ms.toFixed(1)} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="intel-note mt-3">
                    All candidates use the same current state. Attempted load
                    restoration includes infeasible allocations; AC feasibility
                    is reported separately.
                  </p>
                  <button
                    className="primary-button mt-4"
                    disabled={
                      busy ||
                      loading ||
                      comparisonRevision !== session.revision ||
                      !comparison.caper.selected_candidate.feasible ||
                      !comparison.caper.selected_candidate.ac_validated
                    }
                    onClick={apply}
                  >
                    Apply feasible CAPER plan
                  </button>
                </>
              ) : (
                <p className="intel-empty">
                  Run a comparison to evaluate CAPER and the four baselines on
                  this session. No illustrative benchmark data is shown.
                </p>
              )}
              <Link className="intel-small-button block mt-4" href="/research">
                Full multi-seed research and CSV exports ↗
              </Link>
            </section>
            <section className="intel-card">
              <h2>Fault and action timeline</h2>
              <ol className="intel-timeline">
                {session.action_log
                  .slice(-8)
                  .reverse()
                  .map((a, i) => (
                    <li key={i}>
                      <strong>{a.description || a.action}</strong>
                      <p>
                        Revision {a.revision} · {a.target_id || "Network"}
                      </p>
                    </li>
                  ))}
              </ol>
              {!session.action_log.length && (
                <p className="intel-empty">No actions recorded yet.</p>
              )}
            </section>
          </div>
          <div className="intel-secondary">
            <section className="intel-card">
              <h2>Recent simulation history</h2>
              <table className="intel-table">
                <thead>
                  <tr>
                    <th>Revision</th>
                    <th>Attempted supply</th>
                    <th>Faults</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows
                    .slice(-8)
                    .reverse()
                    .map((h) => (
                      <tr key={h.revision}>
                        <td>{h.revision}</td>
                        <td>{mw(h.served)} MW</td>
                        <td>{h.faults}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="intel-note mt-3">
                History records states observed in this browser session. Reset
                starts a new scenario.
              </p>
            </section>
            <section className="intel-card">
              <h2>Storage and power balance</h2>
              <div className="intel-list">
                {session.batteries.map((b) => (
                  <div key={b.battery_id}>
                    <strong>{b.name}</strong>
                    <p>
                      {b.soc_percent.toFixed(1)}% SOC ·{" "}
                      {b.current_dispatch_kw.toFixed(0)} kW dispatch ·{" "}
                      {b.soc_kwh.toFixed(0)} kWh stored
                    </p>
                    <div className="intel-meter">
                      <div
                        style={{
                          width: b.soc_percent + "%",
                          background: "#0d9488",
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!session.batteries.length && (
                  <p className="intel-note">
                    No storage units are modeled in this reference network.
                  </p>
                )}
              </div>
              <p className="intel-note mt-4">
                Whole-model generation:{" "}
                {mw(session.power_flow.power_balance.total_generation_mw)} MW ·
                served load:{" "}
                {mw(session.power_flow.power_balance.total_load_mw)} MW ·
                losses: {mw(session.power_flow.power_balance.total_losses_mw)}{" "}
                MW · balance error:{" "}
                {session.power_flow.power_balance.balance_error_mw.toFixed(6)}{" "}
                MW.
              </p>
            </section>
          </div>
          <details className="intel-card mt-6">
            <summary>Detailed bus and corridor telemetry</summary>
            <div className="intel-secondary">
              <div className="intel-network-table">
                <table className="intel-table">
                  <thead>
                    <tr>
                      <th>Bus</th>
                      <th>Voltage</th>
                      <th>Generation</th>
                      <th>Served</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => (
                      <tr key={a.bus_id}>
                        <td>{a.name}</td>
                        <td>{a.voltage_pu.toFixed(3)} pu</td>
                        <td>{mw(a.generation_mw)} MW</td>
                        <td>{mw(allocatedSupply(a))} MW</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="intel-network-table">
                <table className="intel-table">
                  <thead>
                    <tr>
                      <th>Corridor</th>
                      <th>Loading</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.line_id}>
                        <td>{l.name}</td>
                        <td>{l.loading_percent.toFixed(1)}%</td>
                        <td>{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

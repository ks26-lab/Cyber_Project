"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useCaseStudyStore,
  electricallyFeasible,
} from "@/store/useCaseStudyStore";
const labels: Record<string, string> = {
  PRIORITY_GREEDY: "Priority greedy",
  GRAPH_GREEDY: "Graph greedy",
  AC_GREEDY: "AC-validated greedy",
  MILP_REFERENCE: "MILP reference",
  CAPER: "CAPER",
};
export default function Results() {
  const { before, after, comparison, plan } = useCaseStudyStore();
  const [baseline, setBaseline] = useState("PRIORITY_GREEDY");
  const rows = comparison?.comparison_table || [];
  const selected = rows.filter(
    (r: any) => r.strategy === "CAPER" || r.strategy === baseline,
  );
  return (
    <div className="journey">
      <div className="journey-heading">
        <span className="eyebrow">03 / Results</span>
        <h1>Was the restoration effective?</h1>
      </div>
      {!after || !before ? (
        <div className="empty-network">
          <h2>No applied restoration yet.</h2>
          <p>Complete the local outage scenario to compare measured results.</p>
          <Link href="/restore" className="primary-button">
            Restore critical electricity →
          </Link>
        </div>
      ) : (
        <>
          <div className="metric-row">
            <div>
              <span>Critical load served · before → after</span>
              <strong>
                {electricallyFeasible(before)
                  ? before.kpis.critical_load_restored_pct.toFixed(1) + "%"
                  : "Unverified"}{" "}
                →{" "}
                {electricallyFeasible(after)
                  ? after.kpis.critical_load_restored_pct.toFixed(1) + "%"
                  : "Unverified"}
              </strong>
              <small>
                {before.kpis.critical_served_mw.toFixed(2)} MW attempted (
                {before.kpis.critical_load_restored_pct.toFixed(1)}%) →{" "}
                {after.kpis.critical_served_mw.toFixed(2)} MW{" "}
                {electricallyFeasible(after) ? "verified" : "attempted"}
              </small>
            </div>
            <div>
              <span>Electrical feasibility</span>
              <strong>
                {electricallyFeasible(after) ? "AC feasible" : "Not feasible"}
              </strong>
              <small>
                {after.power_flow.violations.length} constraint violations ·{" "}
                {after.power_flow.power_balance.converged
                  ? "Converged"
                  : "Not converged"}
              </small>
            </div>
            <div>
              <span>Algorithm execution time</span>
              <strong>{plan.execution_time_ms.toFixed(1)} ms</strong>
              <small>CAPER planning, including AC candidate checks</small>
            </div>
          </div>
          <section className="comparison">
            <div className="context-strip">
              <h2>Same outage. Two approaches.</h2>
              <label>
                Compare with{" "}
                <select
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                >
                  {rows
                    .filter((r: any) => r.strategy !== "CAPER")
                    .map((r: any) => (
                      <option key={r.strategy} value={r.strategy}>
                        {labels[r.strategy] || r.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p>AC-verified critical demand supplied (%)</p>
            {selected.map((r: any) => {
              const valid = r.feasible && r.ac_validated;
              return (
                <div className="comparison-row" key={r.strategy}>
                  <strong>{labels[r.strategy] || r.name}</strong>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${valid ? r.critical_load_restored_pct : 0}%`,
                      }}
                    />
                  </div>
                  <span>
                    {valid
                      ? r.critical_load_restored_pct.toFixed(1) + "%"
                      : "Not feasible"}
                  </span>
                  <small>
                    {!valid &&
                      `${r.critical_load_restored_pct.toFixed(1)}% attempted; not verified supply. `}
                    {r.rejection_reasons?.join("; ")}
                  </small>
                </div>
              );
            })}
            <p className="provenance">
              Both plans were computed on the same faulted feeder before
              application. Infeasible attempts are excluded from verified
              supply. Graph connectivity alone does not establish physical
              feasibility.
            </p>
          </section>
          <p className="journey-status">
            {electricallyFeasible(after)
              ? "The applied state passes AC validation."
              : "The applied state has unresolved electrical constraints; restoration is not verified."}{" "}
            {after.kpis.active_faults_count} faults remain isolated.
          </p>
        </>
      )}
      <div className="journey-next">
        <Link href="/restore">Return to the scenario</Link>
        <Link href="/research" className="secondary-button">
          View full research ↗
        </Link>
      </div>
    </div>
  );
}

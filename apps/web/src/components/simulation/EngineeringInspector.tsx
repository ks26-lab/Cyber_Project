"use client";

import { useEffect, useId, useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";

const TABS = ["Summary", "Electrical", "Restoration", "Notes"] as const;

export function EngineeringInspector() {
  const {
    session,
    selectedAssetId,
    setSelectedAssetId,
    applyAction,
    runCaper,
    applyRestorationPlan,
    caperResult,
    loading,
  } = useSimulationStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Summary");
  const [customCapMw, setCustomCapMw] = useState("");
  const [faultTarget, setFaultTarget] = useState("");
  const uid = useId();
  useEffect(() => {
    setCustomCapMw(
      session.source_capacity_limit_mw == null
        ? ""
        : String(session.source_capacity_limit_mw),
    );
  }, [session.source_capacity_limit_mw, session.network_id]);
  useEffect(() => {
    setFaultTarget((current) => {
      const stillExists =
        session.power_flow.lines.some((line) => line.line_id === current) ||
        session.power_flow.transformers?.some(
          (transformer) => transformer.transformer_id === current,
        );
      return stillExists
        ? current
        : session.power_flow.lines.find((line) => !line.line_id.includes("TIE"))
            ?.line_id || "";
    });
  }, [
    session.network_id,
    session.power_flow.lines,
    session.power_flow.transformers,
  ]);
  const unavailable =
    loading || session.solver_provenance === "REFERENCE_PREVIEW";
  const selectedBuilding = session.buildings_3d.find(
    (b) => b.bus_id === selectedAssetId || b.building_id === selectedAssetId,
  );
  const selectedBus = session.power_flow.buses.find(
    (b) => b.bus_id === selectedAssetId,
  );
  const branches = [
    ...session.power_flow.lines.map((l) => ({ ...l, id: l.line_id })),
    ...(session.power_flow.transformers || []).map((t) => ({
      ...t,
      id: t.transformer_id,
    })),
  ];
  const branch = branches.find((b) => b.id === selectedAssetId);
  const branchFault =
    branch &&
    session.active_faults.some((f) => !f.cleared && f.asset_id === branch.id);
  const branchSwitch =
    branch && session.switches.find((sw) => sw.line_id === branch.id);
  const faultBranch = branches.find((b) => b.id === faultTarget);
  const targetHasFault = session.active_faults.some(
    (f) => !f.cleared && f.asset_id === faultTarget,
  );
  const cap = Number(customCapMw),
    validCap = customCapMw.trim() !== "" && Number.isFinite(cap) && cap > 0;
  const plan = caperResult?.selected_candidate;
  const feasible =
    session.solver_provenance === "AC_SOLVED" &&
    session.power_flow.power_balance.converged &&
    session.power_flow.violations.length === 0;
  const actionClass = "quiet-button";

  function operateBranch() {
    if (!branch) return;
    if (branchFault) void applyAction("CLEAR_FAULT", branch.id);
    else if (branchSwitch)
      void applyAction(
        branchSwitch.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH",
        branchSwitch.switch_id,
      );
    else
      void applyAction(
        branch.status === "OUT_OF_SERVICE" ? "RESTORE_BRANCH" : "INJECT_FAULT",
        branch.id,
      );
  }
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div
        role="tablist"
        aria-label="Inspector"
        className="flex gap-2 flex-wrap"
      >
        {TABS.map((name, index) => (
          <button
            key={name}
            id={`${uid}-${name}-tab`}
            role="tab"
            tabIndex={tab === name ? 0 : -1}
            aria-selected={tab === name}
            aria-controls={`${uid}-${name}-panel`}
            className="quiet-button"
            onClick={() => setTab(name)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next =
                  TABS[
                    (index +
                      (event.key === "ArrowRight" ? 1 : TABS.length - 1)) %
                      TABS.length
                  ];
                setTab(next);
                document.getElementById(`${uid}-${next}-tab`)?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`${uid}-Summary-panel`}
        aria-labelledby={`${uid}-Summary-tab`}
        hidden={tab !== "Summary"}
        className="scada-panel rounded-xl p-4 space-y-4"
      >
        <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="font-medium text-sm">Asset Telemetry Inspector</h3>
          <span className="text-xs text-slate-500">
            {selectedAssetId || "Select an asset"}
          </span>
        </div>
        {selectedBuilding ? (
          <>
            <h4 className="text-base font-semibold">{selectedBuilding.name}</h4>
            <p className="text-xs text-slate-500">
              {selectedBuilding.facility_type.replaceAll("_", " ")} · Priority{" "}
              {selectedBuilding.priority_tier} ·{" "}
              {selectedBuilding.power_state.replaceAll("_", " ")}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Bus voltage</dt>
                <dd className="mt-1 font-medium">
                  {selectedBuilding.voltage_pu.toFixed(4)} pu ·{" "}
                  {(
                    selectedBuilding.voltage_pu * selectedBuilding.voltage_kv
                  ).toFixed(2)}{" "}
                  kV
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {feasible ? "Verified supply" : "Attempted supply"} / demand
                </dt>
                <dd className="mt-1 font-medium">
                  {selectedBuilding.served_mw.toFixed(2)} /{" "}
                  {selectedBuilding.demand_mw.toFixed(2)} MW
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Critical demand</dt>
                <dd className="mt-1 font-medium">
                  {selectedBuilding.critical_load_mw.toFixed(2)} MW
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phase angle / generation</dt>
                <dd className="mt-1 font-medium">
                  {selectedBus?.voltage_angle_deg?.toFixed(2) ?? "Unavailable"}°
                  / {selectedBuilding.generation_mw.toFixed(2)} MW
                </dd>
              </div>
            </dl>
            {selectedBuilding.demand_mw > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  className={actionClass}
                  disabled={
                    unavailable ||
                    selectedBuilding.demand_mw -
                      selectedBuilding.critical_load_mw <=
                      0.0001
                  }
                  onClick={() =>
                    applyAction(
                      "CURTAIL_LOAD",
                      selectedBuilding.bus_id,
                      Math.max(
                        0,
                        +(
                          selectedBuilding.demand_mw -
                          selectedBuilding.critical_load_mw
                        ).toFixed(3),
                      ),
                    )
                  }
                >
                  Shed Non-Critical Load
                </button>
                <button
                  className={actionClass}
                  disabled={unavailable}
                  onClick={() =>
                    applyAction("RESTORE_LOAD", selectedBuilding.bus_id)
                  }
                >
                  Restore requested load
                </button>
              </div>
            )}
          </>
        ) : branch ? (
          <>
            <h4 className="text-base font-semibold">{branch.name}</h4>
            <p className="text-xs text-slate-500">
              {branch.from_bus} → {branch.to_bus}
            </p>
            <p className="text-sm">
              {branchFault
                ? "Fault isolated"
                : branch.status.replaceAll("_", " ")}{" "}
              · {branch.loading_percent.toFixed(1)}% loading
            </p>
            {"p_from_mw" in branch && (
              <p className="text-xs text-slate-600">
                {branch.p_from_mw.toFixed(2)} MW ·{" "}
                {branch.q_from_mvar.toFixed(2)} MVAr · {branch.pl_mw.toFixed(4)}{" "}
                MW losses
              </p>
            )}
            <button
              className={actionClass}
              disabled={
                unavailable || (!!branchSwitch && !branchSwitch.operable)
              }
              onClick={operateBranch}
            >
              {branchFault
                ? "Repair and reclose"
                : branchSwitch
                  ? branchSwitch.closed
                    ? "Open tie switch"
                    : "Close tie switch"
                  : branch.status === "OUT_OF_SERVICE"
                    ? "Restore branch"
                    : "Inject physical fault"}
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Select a facility, substation, feeder or transformer in either
            network view to inspect the current simulated state.
          </p>
        )}
      </section>

      <section
        role="tabpanel"
        id={`${uid}-Electrical-panel`}
        aria-labelledby={`${uid}-Electrical-tab`}
        hidden={tab !== "Electrical"}
        className="scada-panel rounded-xl p-4 space-y-5"
      >
        <div>
          <h3 className="text-sm font-medium">
            Disturbance & Constraint Controls
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Revision {session.revision} · T+{session.sim_time_minutes} min.
            Actions advance simulation time and battery energy.
          </p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${uid}-branch`}
            className="block text-xs text-slate-600"
          >
            Feeder or transformer
          </label>
          <select
            id={`${uid}-branch`}
            value={faultTarget}
            disabled={unavailable}
            onChange={(event) => {
              setFaultTarget(event.target.value);
              setSelectedAssetId(event.target.value);
            }}
            className="w-full max-w-full rounded border border-slate-200 bg-white p-2 text-xs"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.id}
              </option>
            ))}
          </select>
          <button
            className={actionClass}
            disabled={unavailable || !faultBranch}
            onClick={() =>
              applyAction(
                targetHasFault ? "CLEAR_FAULT" : "INJECT_FAULT",
                faultTarget,
              )
            }
          >
            {targetHasFault ? "Repair selected fault" : "Trip selected branch"}
          </button>
        </div>
        {session.batteries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Battery dispatch</h4>
            {session.batteries.map((bess) => (
              <div
                key={bess.battery_id}
                className="rounded-lg border border-slate-200 p-3 space-y-2"
              >
                <p className="text-xs font-medium">{bess.name}</p>
                <p className="text-xs text-slate-500">
                  SOC {bess.soc_percent.toFixed(1)}% · {bess.soc_kwh.toFixed(0)}{" "}
                  / {bess.capacity_kwh.toFixed(0)} kWh · reserve{" "}
                  {bess.soc_min_percent}%
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set([
                      0,
                      Math.round(bess.max_discharge_kw * 0.5),
                      Math.round(bess.max_discharge_kw),
                    ]),
                  ).map((kw) => (
                    <button
                      key={kw}
                      className={actionClass}
                      disabled={
                        unavailable ||
                        (kw > 0 && bess.soc_percent <= bess.soc_min_percent)
                      }
                      aria-pressed={Math.abs(bess.current_dispatch_kw - kw) < 1}
                      onClick={() =>
                        applyAction("DISPATCH_BATTERY", bess.battery_id, kw)
                      }
                    >
                      {kw === 0 ? "Idle" : `Discharge ${kw} kW`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <label
            htmlFor={`${uid}-source-cap`}
            className="block text-xs text-slate-600"
          >
            Substation supply ceiling (MW)
          </label>
          <input
            id={`${uid}-source-cap`}
            type="number"
            min="0.1"
            step="0.1"
            placeholder="No experimental limit"
            value={customCapMw}
            onChange={(event) => setCustomCapMw(event.target.value)}
            disabled={unavailable}
            className="w-full rounded border border-slate-200 p-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              className={actionClass}
              disabled={unavailable || !validCap}
              onClick={() =>
                applyAction(
                  "SET_SOURCE_CAPACITY",
                  session.power_flow.buses[0]?.bus_id || "SOURCE",
                  cap,
                )
              }
            >
              Enforce Limit
            </button>
            <button
              className={actionClass}
              disabled={unavailable || session.source_capacity_limit_mw == null}
              onClick={() =>
                applyAction(
                  "SET_SOURCE_CAPACITY",
                  session.power_flow.buses[0]?.bus_id || "SOURCE",
                  null,
                )
              }
            >
              Uncap
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Removing the experimental ceiling preserves the model’s generator
            ratings.
          </p>
        </div>
        <button
          className={actionClass}
          disabled={unavailable}
          onClick={() => applyAction("ADVANCE_TIME", "CLOCK", 0.25)}
        >
          Advance 15 minutes
        </button>
      </section>

      <section
        role="tabpanel"
        id={`${uid}-Restoration-panel`}
        aria-labelledby={`${uid}-Restoration-tab`}
        hidden={tab !== "Restoration"}
        className="scada-panel rounded-xl p-4 space-y-4"
      >
        <h3 className="text-sm font-medium">CAPER restoration advisor</h3>
        <p className="text-xs text-slate-500">
          Graph and allocation algorithms propose alternatives. AC power flow
          checks the resulting electrical constraints.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            className={actionClass}
            disabled={unavailable}
            onClick={() => runCaper()}
          >
            Analyze with CAPER
          </button>
          <button
            className={actionClass}
            disabled={unavailable || !plan?.feasible || !plan?.ac_validated}
            onClick={() => applyRestorationPlan("CAPER")}
          >
            Execute CAPER Plan
          </button>
        </div>
        {plan ? (
          <div className="space-y-2 text-xs">
            <h4 className="font-medium">{plan.name}</h4>
            <p
              className={
                plan.feasible && plan.ac_validated
                  ? "text-teal-700"
                  : "text-red-700"
              }
            >
              {plan.feasible && plan.ac_validated
                ? "AC feasible"
                : "Rejected / not verified"}{" "}
              · {plan.critical_load_restored_pct?.toFixed(1)}% attempted
              critical supply · minimum {plan.min_voltage_pu?.toFixed(3)} pu
            </p>
            {plan.rejection_reasons?.map((reason: string) => (
              <p key={reason}>{reason}</p>
            ))}
            <ol className="list-decimal pl-4 space-y-2">
              {plan.actions?.map((action: any, index: number) => (
                <li key={index}>
                  {action.description ||
                    `${action.action_type} ${action.target_id}`}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Analyze the current state before executing a plan. Any subsequent
            grid action invalidates this advice.
          </p>
        )}
      </section>

      <section
        role="tabpanel"
        id={`${uid}-Notes-panel`}
        aria-labelledby={`${uid}-Notes-tab`}
        hidden={tab !== "Notes"}
        className="scada-panel rounded-xl p-4 space-y-3"
      >
        <h3 className="text-sm font-medium">Operator notes</h3>
        <p className="text-xs text-slate-500">
          All controls update the shared backend simulation, followed by an AC
          solve. A converged model can still have source, voltage or thermal
          violations. Requested restoration is not a guarantee of physically
          feasible supply.
        </p>
        <p className="text-xs text-slate-500">
          Switching changes topology; repair returns a faulted branch to
          service. Battery power (kW) and stored energy (kWh) are separate
          limits.
        </p>
      </section>
    </div>
  );
}

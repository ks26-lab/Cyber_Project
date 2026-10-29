"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useSimulationStore,
  type SimulationSessionState,
} from "@/store/useSimulationStore";
import {
  useCaseStudyStore,
  electricallyFeasible,
  emptyCaseStudy,
} from "@/store/useCaseStudyStore";
import { useViewPrefs, prefersReducedMotion } from "@/store/useViewPrefs";
import { playCue, SoundToggle } from "@/components/layout/sound";

const City = dynamic(
  () => import("@/components/city3d/CityCanvas3D").then((m) => m.CityCanvas3D),
  {
    ssr: false,
    loading: () => (
      <div className="restore-loading" role="status">
        Preparing the city…
      </div>
    ),
  },
);

const PHASES = [
  ["NORMAL", "Normal"],
  ["EMERGENCY", "Emergency"],
  ["INVESTIGATING", "Investigate"],
  ["PLAN_READY", "Plan"],
  ["RESTORING", "Restore"],
  ["RESTORED", "Restored"],
  ["DEBRIEF", "Debrief"],
] as const;
type Phase = (typeof PHASES)[number][0];
type Work = null | "starting" | "investigating" | "searching" | "restoring";
type Notice = { kind: "info" | "alert" | "success" | "error"; text: string };

/** The reproducible scenario: both hospital feeders trip under a 7.2 MW intake limit. */
const SCENARIO_FAULTS = ["LINE-02-03", "LINE-03-04"];
const SCENARIO_LIMIT_MW = 7.2;

class Cancelled extends Error {}

function snapshot(): SimulationSessionState {
  return structuredClone(useSimulationStore.getState().session);
}
function check() {
  const error = useSimulationStore.getState().error;
  if (error) throw Error(error);
}
async function runTrace(algorithm: string, parameters: Record<string, unknown> = {}) {
  const res = await fetch("/api/gridzero/algorithms/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm_id: algorithm,
      session_id: useSimulationStore.getState().session.session_id,
      parameters,
    }),
  });
  if (!res.ok) throw Error(`${algorithm} trace failed (${res.status})`);
  return (await res.json()).trace;
}
const hospitalOf = (s: SimulationSessionState) =>
  s.buildings_3d.find((b) => b.facility_type === "HOSPITAL");
function list(items: string[]) {
  return items.length <= 1
    ? items.join("")
    : items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

export default function Restore() {
  const sim = useSimulationStore();
  const study = useCaseStudyStore();
  const { reducedEffects } = useViewPrefs();
  const [work, setWork] = useState<Work>(null);
  const [debrief, setDebrief] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [traceNote, setTraceNote] = useState("");
  const [revealed, setRevealed] = useState(Infinity);
  const [guided, setGuided] = useState(true);
  const [inspect, setInspect] = useState(false);
  const [replay, setReplay] = useState<null | { frame: number; playing: boolean }>(null);
  const [slow, setSlow] = useState(false);
  const run = useRef(0);
  const inspector = useRef<HTMLDetailsElement>(null);

  const latest = study.after ?? study.before;
  const inSync =
    !!latest &&
    sim.session.session_id === latest.session_id &&
    sim.session.revision === latest.revision;
  const stale = !!latest && !inSync && !work;
  const phase: Phase =
    work === "restoring"
      ? "RESTORING"
      : work === "investigating" || work === "searching"
        ? "INVESTIGATING"
        : work === "starting"
          ? study.before
            ? "EMERGENCY"
            : "NORMAL"
          : study.after
            ? debrief
              ? "DEBRIEF"
              : "RESTORED"
            : study.plan
              ? "PLAN_READY"
              : study.bfs
                ? "INVESTIGATING"
                : study.before
                  ? "EMERGENCY"
                  : "NORMAL";
  const phaseIndex = PHASES.findIndex(([id]) => id === phase);

  const frames = [
    study.normal && { label: "Normal operation", session: study.normal, preset: "ISOMETRIC" as const },
    study.before && { label: "Feeder trip", session: study.before, preset: "FAULT" as const },
    study.after && { label: "Restored", session: study.after, preset: "RESTORATION" as const },
  ].filter(Boolean) as { label: string; session: SimulationSessionState; preset: "ISOMETRIC" | "FAULT" | "RESTORATION" }[];
  const frame = replay ? frames[Math.min(replay.frame, frames.length - 1)] : null;
  const viewSession = frame?.session ?? (stale ? latest! : undefined);
  const shown = viewSession ?? (latest || work ? sim.session : null);
  const routeEdges: string[] = study.route?.path_edges ?? [];
  const routeNodes: string[] = study.route?.path_buses ?? [];
  const plan = study.plan;
  const candidate = plan?.selected_candidate;
  const motionless = () => reducedEffects || prefersReducedMotion();

  // Leaving the page cancels any running sequence and clears shared highlights.
  useEffect(() => {
    const store = useSimulationStore.getState();
    const sequences = run;
    return () => {
      sequences.current++;
      store.setTraceHighlight([], []);
      store.setOverlayMode("ENERGIZATION");
    };
  }, []);

  // Replay drives the camera and route highlight from recorded states only.
  useEffect(() => {
    if (!frame) return;
    const store = useSimulationStore.getState();
    store.setOverlayMode("ENERGIZATION");
    store.setTraceHighlight(
      frame.label === "Restored" ? routeNodes : [],
      frame.label === "Restored" ? routeEdges : [],
    );
    if (guided) store.setCameraPreset(frame.preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame?.label, guided]);
  useEffect(() => {
    if (!replay?.playing) return;
    const timer = setTimeout(
      () =>
        setReplay((r) =>
          !r
            ? r
            : r.frame >= frames.length - 1
              ? { ...r, playing: false }
              : { ...r, frame: r.frame + 1 },
        ),
      slow ? 5200 : 2800,
    );
    return () => clearTimeout(timer);
  }, [replay, slow, frames.length]);

  function pause(ms: number, id: number) {
    return new Promise<void>((resolve, reject) =>
      setTimeout(() => (id === run.current ? resolve() : reject(new Cancelled())), motionless() ? 0 : ms),
    );
  }
  function ensureInSync() {
    const s = useSimulationStore.getState().session;
    const ref = useCaseStudyStore.getState();
    const last = ref.after ?? ref.before;
    if (!last || s.session_id !== last.session_id || s.revision !== last.revision)
      throw Error("The demo session changed since this step. Restart the scenario to continue.");
  }
  async function sequence(kind: Exclude<Work, null>, body: (id: number) => Promise<void>) {
    const id = ++run.current;
    setWork(kind);
    setReplay(null);
    try {
      await body(id);
    } catch (e) {
      if (!(e instanceof Cancelled)) {
        playCue("warning");
        setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      }
    } finally {
      if (id === run.current) setWork(null);
      setTraceNote("");
    }
  }

  const startEmergency = () =>
    sequence("starting", async (id) => {
      setDebrief(false);
      setInspect(false);
      setRevealed(Infinity);
      study.set({ ...emptyCaseStudy });
      sim.setTraceHighlight([], []);
      sim.setOverlayMode("ENERGIZATION");
      sim.setSelectedAssetId(null);
      await sim.resetSession("TRAINING_FEEDER", null, SCENARIO_LIMIT_MW);
      check();
      if (guided) sim.setCameraPreset("ISOMETRIC");
      study.set({ normal: snapshot() });
      setNotice({ kind: "info", text: "Normal operation. Every facility is supplied." });
      await pause(2200, id);
      for (const line of SCENARIO_FAULTS) {
        await sim.applyAction("INJECT_FAULT", line);
        check();
      }
      const before = snapshot();
      study.set({ before });
      if (guided) sim.setCameraPreset("FAULT");
      const lost = before.buildings_3d.filter((b) => b.power_state === "BLACKOUT" && b.demand_mw > 0);
      playCue("incident");
      setNotice({
        kind: "alert",
        text: `${lost.some((b) => b.facility_type === "HOSPITAL") ? "Hospital supply interrupted. " : ""}Feeders ${list(SCENARIO_FAULTS)} tripped; ${lost.length} facilities have no modeled supply.`,
      });
    });

  const investigate = () =>
    sequence("investigating", async (id) => {
      ensureInSync();
      const before = useCaseStudyStore.getState().before!;
      const trace = await runTrace("BFS");
      if (guided) sim.setCameraPreset("ISOMETRIC");
      sim.setOverlayMode("ALGORITHM_TRACE");
      const edges = new Set<string>();
      for (const step of trace.steps) {
        [...(step.active_edges || []), ...(step.selected_edges || [])].forEach((e: string) => edges.add(e));
        sim.setTraceHighlight(step.visited_nodes || step.active_nodes || [], [...edges]);
        setTraceNote(`BFS · ${step.description}`);
        await pause(700, id);
      }
      const final = trace.final_output || {};
      sim.setTraceHighlight(final.energized_buses || [], [...edges]);
      study.set({
        bfs: {
          algorithm_name: trace.algorithm_name,
          complexity: trace.theoretical_time_complexity,
          steps: trace.steps.length,
          final_output: final,
        },
      });
      const hospital = hospitalOf(before);
      const cut = before.active_faults
        .filter((f) => !f.cleared)
        .map((f) => f.asset_id)
        .filter((line) => {
          const l = before.power_flow.lines.find((x) => x.line_id === line);
          return l && hospital && (l.from_bus === hospital.bus_id || l.to_bus === hospital.bus_id);
        });
      setNotice({
        kind: "info",
        text: `BFS from the substation reaches ${(final.energized_buses || []).length} of ${before.buildings_3d.length} buses. ${
          hospital && (final.unenergized_buses || []).includes(hospital.bus_id)
            ? `${hospital.name} is cut off: its feeder${cut.length > 1 ? "s" : ""} ${list(cut)} ${cut.length > 1 ? "are" : "is"} faulted, so no energized path remains.`
            : ""
        }`,
      });
    });

  const findPlan = () =>
    sequence("searching", async (id) => {
      ensureInSync();
      const before = useCaseStudyStore.getState().before!;
      const hospital = hospitalOf(before);
      if (hospital) {
        const search = await runTrace("DIJKSTRA", { target_bus: hospital.bus_id });
        sim.setOverlayMode("ALGORITHM_TRACE");
        const explored = new Set<string>();
        for (const step of search.steps) {
          (step.active_edges || []).forEach((e: string) => explored.add(e));
          sim.setTraceHighlight(step.visited_nodes || [], [...explored]);
          setTraceNote(`Dijkstra · ${step.description}`);
          await pause(600, id);
        }
        const f = search.final_output || {};
        if (f.route_found) sim.setTraceHighlight(f.path_buses || [], f.path_edges || []);
        study.set({ search: { steps: search.steps.length, final_output: f } });
        setTraceNote(
          f.route_found
            ? `Shortest electrical route to the hospital: ${list(f.path_edges || [])} (${Number(f.total_impedance_cost).toFixed(3)} Ω).`
            : "No graph route to the hospital exists.",
        );
      }
      await pause(900, id);
      setTraceNote("Checking each candidate switching plan with AC power flow…");
      const comparison = await sim.compareRestorations();
      check();
      if (!comparison) throw Error("No restoration comparison was returned.");
      study.set({ comparison, plan: comparison.caper });
      const count = comparison.caper.candidates.length;
      setRevealed(0);
      for (let i = 1; i <= count; i++) {
        await pause(550, id);
        setRevealed(i);
      }
      const chosen = comparison.caper.selected_candidate;
      const ok = chosen.feasible && chosen.ac_validated;
      playCue(ok ? "switch" : "warning");
      setNotice({
        kind: ok ? "success" : "alert",
        text: ok
          ? `${comparison.caper.candidates.filter((c: any) => c.feasible && c.ac_validated).length} of ${count} candidate plans pass AC validation. CAPER selected ${chosen.name}.`
          : "No candidate plan passes AC validation. Inspect the constraints below.",
      });
    });

  const applyPlan = () =>
    sequence("restoring", async (id) => {
      ensureInSync();
      const before = useCaseStudyStore.getState().before!;
      sim.setOverlayMode("ENERGIZATION");
      sim.setTraceHighlight([], []);
      if (guided) sim.setCameraPreset("HOSPITAL");
      await pause(900, id);
      await sim.applyRestorationPlan("CAPER");
      check();
      playCue("switch");
      const after = snapshot();
      // Route on the restored topology, accepted only if every branch is in service.
      const hospital = hospitalOf(after);
      let route: any = null;
      if (hospital) {
        const trace = await runTrace("DIJKSTRA", { target_bus: hospital.bus_id }).catch(() => null);
        const f = trace?.final_output;
        const live = new Set([
          ...after.power_flow.lines.filter((l) => l.status === "IN_SERVICE").map((l) => l.line_id),
          ...(after.power_flow.transformers || []).map((t) => t.transformer_id),
        ]);
        if (f?.route_found && (f.path_edges || []).every((e: string) => live.has(e))) route = f;
      }
      if (!route) {
        const closed = after.switches
          .filter((sw) => sw.closed && !before.switches.find((b) => b.switch_id === sw.switch_id)?.closed)
          .map((sw) => sw.line_id)
          .filter(Boolean);
        route = { path_edges: closed, path_buses: [] };
      }
      study.set({ after, route });
      await pause(700, id);
      sim.setTraceHighlight(route.path_buses || [], route.path_edges || []);
      if (guided) sim.setCameraPreset("RESTORATION");
      const regained = after.buildings_3d
        .filter((b) => b.power_state !== "BLACKOUT" && before.buildings_3d.find((x) => x.bus_id === b.bus_id)?.power_state === "BLACKOUT" && b.demand_mw > 0)
        .map((b) => b.name);
      playCue("restored");
      setNotice({
        kind: electricallyFeasible(after) ? "success" : "alert",
        text: regained.length
          ? `${list(regained)} regained supply. The faulted feeders stay isolated; power now arrives through an alternative route.`
          : "The plan was applied, but no interrupted facility regained supply.",
      });
    });

  function openInspector() {
    setInspect(true);
    requestAnimationFrame(() =>
      inspector.current?.scrollIntoView({ behavior: motionless() ? "auto" : "smooth", block: "start" }),
    );
  }

  const switchChanges = study.before && study.after
    ? study.after.switches.filter((sw) => sw.closed !== study.before!.switches.find((b) => b.switch_id === sw.switch_id)?.closed)
    : [];
  const dispatching = (study.after?.batteries || []).filter((b) => b.current_dispatch_kw > 0);
  const idle = !work;
  const nextAction: { label: string; run: () => void; disabled?: boolean } | null = stale
    ? { label: "Restart Scenario", run: startEmergency }
    : phase === "NORMAL"
      ? { label: "Start Emergency", run: startEmergency, disabled: !!work }
      : phase === "EMERGENCY"
        ? { label: "Investigate Outage", run: investigate, disabled: !!work }
        : phase === "INVESTIGATING"
          ? { label: "Find Restoration Plan", run: findPlan, disabled: !!work || !study.bfs }
          : phase === "PLAN_READY"
            ? { label: "Apply Plan", run: applyPlan, disabled: !!work || !candidate?.feasible || !candidate?.ac_validated }
            : phase === "RESTORED"
              ? { label: "Continue to Debrief", run: () => setDebrief(true) }
              : null;
  const status = work
    ? traceNote ||
      {
        starting: "Running the city under normal conditions…",
        investigating: "Tracing reachability from the substation…",
        searching: "Searching restoration routes…",
        restoring: "Applying the switching plan and solving AC power flow…",
      }[work]
    : stale
      ? "The demo session was changed elsewhere, so this saved scenario is shown from its recorded states."
      : phase === "NORMAL"
        ? "Start the emergency to trip the hospital feeders under a 7.2 MW supply limit."
        : phase === "EMERGENCY"
          ? "Next: investigate which facilities are still connected to a source."
          : phase === "INVESTIGATING"
            ? "Next: search for an alternative supply route and validate it."
            : phase === "PLAN_READY"
              ? candidate?.feasible
                ? "Next: apply the AC-validated plan."
                : "No feasible plan. Inspect the constraints."
              : "Scenario complete.";

  return (
    <div className="journey">
      <div className="journey-heading restore-heading">
        <div>
          <span className="eyebrow">02 / Restore · Separate local distribution model</span>
          <h1>A hospital has lost power. What should we do?</h1>
        </div>
        <div className="restore-tools">
          <label className="restore-check">
            <input type="checkbox" checked={guided} onChange={(e) => setGuided(e.target.checked)} />
            Guided camera
          </label>
          <SoundToggle />
        </div>
      </div>

      <ol className="restore-stepper" aria-label="Scenario progress">
        {PHASES.map(([id, label], i) => (
          <li
            key={id}
            className={i < phaseIndex ? "done" : i === phaseIndex ? "current" : ""}
            aria-current={i === phaseIndex ? "step" : undefined}
          >
            {label}
          </li>
        ))}
      </ol>

      <div className="metric-row">
        <div>
          <span>Critical service supplied</span>
          <strong>
            {shown && latest
              ? electricallyFeasible(shown)
                ? shown.kpis.critical_load_restored_pct.toFixed(1) + "%"
                : "Not AC verified"
              : "—"}
          </strong>
        </div>
        <div>
          <span>Active faults</span>
          <strong>{shown && latest ? shown.kpis.active_faults_count : "—"}</strong>
        </div>
        <div>
          <span>Electrical feasibility</span>
          <strong>
            {shown && latest
              ? electricallyFeasible(shown)
                ? "AC feasible"
                : "Constraints / unsolved"
              : "Awaiting emergency"}
          </strong>
        </div>
      </div>

      {notice && (
        <p className={`restore-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

      {shown && (latest || work) ? (
        <div className="restore-stage">
          <City heightClass="h-[520px]" session={viewSession} interactive={false} />
          {frame && (
            <div className="replay-bar" role="group" aria-label="Restoration replay">
              <strong>
                Replay {replay!.frame + 1} / {frames.length} · {frame.label}
              </strong>
              <button className="quiet-button" disabled={replay!.frame === 0} onClick={() => setReplay({ frame: replay!.frame - 1, playing: false })}>
                Previous
              </button>
              <button className="quiet-button" onClick={() => setReplay({ ...replay!, playing: !replay!.playing })}>
                {replay!.playing ? "Pause" : "Play"}
              </button>
              <button className="quiet-button" disabled={replay!.frame >= frames.length - 1} onClick={() => setReplay({ frame: replay!.frame + 1, playing: false })}>
                Next
              </button>
              <label className="restore-check">
                <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
                Slow
              </label>
              <button
                className="quiet-button"
                onClick={() => {
                  setReplay(null);
                  sim.setTraceHighlight(routeNodes, routeEdges);
                }}
              >
                Exit replay
              </button>
            </div>
          )}
          {(phase === "RESTORED" || phase === "DEBRIEF" || frame?.label === "Restored") && routeEdges.length > 0 && (
            <p className="restore-legend">
              Red dashed sections stay isolated. The violet route ({list(routeEdges)}) is the energized path now supplying the hospital.
            </p>
          )}
        </div>
      ) : (
        <div className="empty-network restore-intro">
          <h2>A calm city, one feeder away from an emergency.</h2>
          <p>
            Start the emergency to trip both hospital feeders under a {SCENARIO_LIMIT_MW} MW supply limit. You will
            investigate the outage, search for an alternative route, and watch the city recover.
          </p>
        </div>
      )}

      <div className="step-actions">
        {nextAction && (
          <button className="primary-button" disabled={nextAction.disabled} onClick={nextAction.run}>
            {work ? "Working…" : nextAction.label}
          </button>
        )}
        {(phase === "RESTORED" || phase === "DEBRIEF" || stale) && frames.length > 1 && (
          <button className={phase === "RESTORED" || stale ? "secondary-button" : "primary-button"} disabled={!idle} onClick={() => setReplay({ frame: 0, playing: true })}>
            {study.after ? "Replay Restoration" : "Replay the Emergency"}
          </button>
        )}
        {plan && (
          <button className="secondary-button" onClick={openInspector}>
            Inspect Selected Plan
          </button>
        )}
        {latest && !stale && (
          <button className="quiet-button" disabled={!idle} onClick={startEmergency}>
            Restart Scenario
          </button>
        )}
      </div>
      <p role="status" className="journey-status">
        {status}
      </p>

      {plan && revealed > 0 && (
        <div className="candidate-list" aria-label="Restoration candidates">
          <strong>Candidate plans · AC validation</strong>
          <ol>
            {plan.candidates.slice(0, revealed).map((c: any) => {
              const ok = c.feasible && c.ac_validated;
              const selected = c.candidate_id === candidate?.candidate_id;
              return (
                <li key={c.candidate_id} className={(ok ? "pass" : "fail") + (selected ? " selected" : "")}>
                  <span>{ok ? "Passes AC" : "Rejected"}</span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.critical_load_restored_pct.toFixed(1)}% critical
                    {!ok && c.rejection_reasons.length ? " · " + c.rejection_reasons[0] : ""}
                    {selected ? " · Selected by CAPER" : ""}
                  </small>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {candidate && revealed >= (plan?.candidates.length ?? 0) && (
        <div className="plan-summary">
          <strong>Selected plan · {candidate.candidate_id}</strong>
          <p>
            {Object.entries(
              candidate.actions
                .filter((a: any) => a.action_type !== "ISOLATE_FAULT")
                .reduce((counts: Record<string, number>, a: any) => {
                  const name = a.action_type.replaceAll("_", " ").toLowerCase();
                  counts[name] = (counts[name] || 0) + 1;
                  return counts;
                }, {}),
            )
              .map(([name, count]) => `${count} × ${name}`)
              .join(" · ")}
          </p>
        </div>
      )}

      {phase === "DEBRIEF" && study.before && study.after && (
        <section className="debrief" aria-label="Debrief">
          <h2>Why the restoration worked</h2>
          <ul>
            <li>
              Faults on {list(SCENARIO_FAULTS)} remain isolated. Restoration reroutes supply; it does not repair lines.
            </li>
            {switchChanges.length > 0 && (
              <li>
                The plan {list(switchChanges.map((sw) => `${sw.closed ? "closed" : "opened"} ${sw.switch_id}`))}
                {routeEdges.length > 0 ? `, energizing the route ${list(routeEdges)}` : ""}.
              </li>
            )}
            {dispatching.length > 0 && (
              <li>
                {list(dispatching.map((b) => `${b.name} discharges ${b.current_dispatch_kw.toFixed(0)} kW`))}.
              </li>
            )}
            <li>
              AC power flow {study.after.power_flow.power_balance.converged ? "converged" : "did not converge"} with{" "}
              {study.after.power_flow.violations.length} limit violation{study.after.power_flow.violations.length === 1 ? "" : "s"}; critical supply is{" "}
              {study.after.kpis.critical_load_restored_pct.toFixed(1)}% (was {study.before.kpis.critical_load_restored_pct.toFixed(1)}%).
            </li>
            {plan && (
              <li>
                CAPER evaluated {plan.candidates.length} candidate plans;{" "}
                {plan.candidates.filter((c: any) => !(c.feasible && c.ac_validated)).length} were rejected by AC validation.
              </li>
            )}
          </ul>
          <div className="step-actions">
            <Link href="/results" className="primary-button">
              Evaluate the result →
            </Link>
            <Link href="/grid-command" className="secondary-button">
              Try it yourself in Grid Command
            </Link>
          </div>
        </section>
      )}

      {study.after && phase !== "DEBRIEF" && (
        <div className="journey-next">
          <p>Faults remain isolated. Recovery reroutes electricity; it does not repair damaged lines.</p>
          <Link href="/results" className="primary-button">
            Evaluate the result →
          </Link>
        </div>
      )}

      <details
        ref={inspector}
        className="reasoning"
        open={inspect}
        onToggle={(e) => setInspect((e.target as HTMLDetailsElement).open)}
      >
        <summary>Why did the system choose this?</summary>
        {plan ? (
          <>
            <p>
              Graph search proposes routes; AC analysis checks voltage, loading and supply constraints before a plan
              is accepted.
            </p>
            {study.bfs && (
              <article>
                <h3>Investigation · {study.bfs.algorithm_name}</h3>
                <p>
                  {study.bfs.steps} computed steps · reachable{" "}
                  {(study.bfs.final_output.energized_buses || []).join(", ")} · disconnected{" "}
                  {(study.bfs.final_output.unenergized_buses || []).join(", ") || "none"}
                </p>
              </article>
            )}
            {plan.stages.map((s: any) => (
              <article key={s.stage_number}>
                <h3>{s.stage_name}</h3>
                <p>{s.summary}</p>
                {s.details?.top_priority_facilities?.map((f: any, i: number) => (
                  <p key={i}>
                    {i + 1}. {f.name || f.facility_name || f.load_id} · score {f.score ?? f.priority_score}
                  </p>
                ))}
              </article>
            ))}
            <article>
              <h3>Selected switching and dispatch actions</h3>
              {candidate.actions.map((a: any, i: number) => (
                <p key={i}>{a.description}</p>
              ))}
            </article>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>AC result</th>
                    <th>Attempted critical supply</th>
                    <th>Safety constraints</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.candidates.map((c: any) => (
                    <tr key={c.candidate_id}>
                      <td>{c.name}</td>
                      <td>{c.feasible && c.ac_validated ? "Feasible" : "Rejected"}</td>
                      <td>{c.critical_load_restored_pct.toFixed(1)}%</td>
                      <td>{c.rejection_reasons.join("; ") || "No violations"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Object.entries(plan.dsa_subtraces || {})
              .filter(([k]) => ["BFS", "DIJKSTRA", "KNAPSACK_DP"].includes(k))
              .map(([k, t]: [string, any]) => (
                <article key={k}>
                  <h3>{k} · Computed trace</h3>
                  {t.steps?.map((s: any, i: number) => (
                    <p key={i}>{s.description || s.explanation || JSON.stringify(s)}</p>
                  ))}
                </article>
              ))}
          </>
        ) : (
          <p>Investigate the outage and find a plan to see the computed evidence.</p>
        )}
      </details>
    </div>
  );
}

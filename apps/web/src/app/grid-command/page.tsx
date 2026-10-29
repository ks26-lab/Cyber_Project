"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { create } from "zustand";
import {
  useSimulationStore,
  type SimulationSessionState,
} from "@/store/useSimulationStore";
import { playCue, SoundToggle } from "@/components/layout/sound";
import "./grid-command.css";

const City = dynamic(
  () => import("@/components/city3d/CityCanvas3D").then((m) => m.CityCanvas3D),
  {
    ssr: false,
    loading: () => (
      <div className="gc-city-loading" role="status">
        Preparing the feeder…
      </div>
    ),
  },
);

type TraceStep = {
  description: string;
  operation: string;
  active_nodes: string[];
  active_edges: string[];
  selected_edges: string[];
  visited_nodes: string[];
};
type Hint = {
  trace: {
    algorithm_name: string;
    theoretical_time_complexity: string;
    input_summary: Record<string, unknown>;
    final_output: Record<string, unknown>;
    grid_engineering_meaning: string;
    steps: TraceStep[];
  };
  interpretation: string;
  caper?: any;
};
type Level = {
  number: number;
  title: string;
  briefing: string;
  lesson: string;
  max_turns: number;
  supply_mw: number;
  algorithms: string[];
};
type Game = {
  game_id: string;
  version: number;
  level: Level;
  seed: number;
  turns: number;
  credits_remaining: number;
  spent: number;
  status: string;
  score: number;
  score_breakdown: Record<string, number>;
  session: SimulationSessionState;
  topology: { loads: any[]; generators: any[]; lines: any[] };
  can_complete: boolean;
  objectives: { label: string; passed: boolean }[];
  constraints: string[];
  advisories: string[];
  events: { turn: number; message: string; kind: string }[];
  can_undo: boolean;
  comparison: any;
  model_note: string;
  action_costs: Record<string, number>;
};
type Feedback = {
  kind: "success" | "warning" | "rejected" | "info";
  title: string;
  lines: string[];
};
type Preset = "HOSPITAL" | "SUBSTATION" | "FAULT" | "RESTORATION" | "ISOMETRIC";

const useGameStore = create<{ game: Game | null; setGame: (g: Game) => void }>(
  (set) => ({ game: null, setGame: (game) => set({ game }) }),
);
const algorithmLabels: Record<string, string> = {
  BFS: "BFS · Reachability",
  DFS: "DFS · Islands",
  DIJKSTRA: "Dijkstra · Restoration path",
  MIN_COST_MAX_FLOW: "Max-flow / min-cut · Capacity",
  KNAPSACK_DP: "Knapsack · Supply allocation",
  KRUSKAL_MST: "Kruskal · Connection cost",
  BIPARTITE_MATCHING: "Matching · Backup assignment",
  CAPER: "CAPER · AC-validated plan",
};
const actionLabels: Record<string, string> = {
  REPAIR_LINE: "Repair a faulted feeder",
  CLOSE_SWITCH: "Close a switch",
  OPEN_SWITCH: "Open a switch",
  DISPATCH_BATTERY: "Allocate battery backup",
  REDISPATCH_GENERATOR: "Dispatch local generation",
  SHED_LOAD: "Curtail flexible demand",
  RESTORE_LOAD: "Restore consumer demand",
  SET_SOURCE_LIMIT: "Set grid intake budget",
  WAIT: "Wait for the next dispatch turn",
};
/** Presentation only: each level's mechanics, limits and scoring come from the backend. */
const identity: Record<
  number,
  { skill: string; objective: string; focus: Preset; accent: string }
> = {
  1: {
    skill: "Learn the grid",
    objective:
      "Get power back to the hospital. Select the damaged feeder to repair it, or close a tie switch to reroute.",
    focus: "HOSPITAL",
    accent: "#2563eb",
  },
  2: {
    skill: "A critical shortage",
    objective:
      "Keep the hospital, water works and command center supplied within the intake limit. Curtail flexible demand or dispatch batteries.",
    focus: "SUBSTATION",
    accent: "#b7791f",
  },
  3: {
    skill: "Limited resources",
    objective:
      "Two critical branches are down. Route around them through tie switches, or spend scarce repair credits, without overloading a feeder.",
    focus: "FAULT",
    accent: "#7c3aed",
  },
  4: {
    skill: "Storm waves",
    objective:
      "More faults arrive after turns 2 and 4. Stabilise after each wave and keep reserves for the next one.",
    focus: "FAULT",
    accent: "#c2413b",
  },
  5: {
    skill: "The city must stay alive",
    objective:
      "Combine isolation, rerouting and supply allocation under a tight limit, then compare your result with CAPER.",
    focus: "RESTORATION",
    accent: "#0f766e",
  },
};
async function request(path: string, body?: unknown) {
  const response = await fetch(
    "/api/grid-command/" + path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json();
  if (!response.ok)
    throw Error(
      data.detail || "The grid simulator could not complete this request.",
    );
  return data;
}

/** Explains a turn purely from the difference between two backend states. */
function describeTurn(prev: Game | null, next: Game, label: string): Feedback {
  const lines: string[] = [];
  let good = 0,
    bad = 0;
  if (prev && prev.game_id === next.game_id) {
    const before = new Map(prev.session.buildings_3d.map((b) => [b.bus_id, b]));
    for (const b of next.session.buildings_3d) {
      const was = before.get(b.bus_id);
      if (!was || b.demand_mw <= 0) continue;
      if (was.power_state === "BLACKOUT" && b.power_state !== "BLACKOUT") {
        lines.push(`${b.name} is supplied again.`);
        good++;
      } else if (was.power_state !== "BLACKOUT" && b.power_state === "BLACKOUT") {
        lines.push(`${b.name} lost supply.`);
        bad++;
      }
    }
    next.objectives.forEach((o) => {
      const was = prev.objectives.find((p) => p.label === o.label);
      if (o.passed && !was?.passed) {
        lines.push(`Objective met: ${o.label}.`);
        good++;
      } else if (!o.passed && was?.passed) {
        lines.push(`Objective no longer met: ${o.label}.`);
        bad++;
      }
    });
    next.constraints
      .filter((c) => !prev.constraints.includes(c))
      .forEach((c) => {
        lines.push(`New limit violation: ${c}`);
        bad++;
      });
    if (prev.constraints.length && !next.constraints.length) {
      lines.push("All electrical limits are satisfied.");
      good++;
    }
    const delta = next.score - prev.score;
    if (delta) lines.push(`Score ${delta > 0 ? "+" : ""}${delta}.`);
  }
  const wave = next.events.filter((e) => e.turn === next.turns && e.kind === "cascade");
  wave.forEach((e) => {
    lines.unshift(e.message);
    bad++;
  });
  const unsafe = next.constraints.some((c) => !prev?.constraints.includes(c));
  return {
    kind: bad && (unsafe || bad >= good) ? "warning" : good ? "success" : "info",
    title: good && bad ? `Trade-off · ${label}` : label,
    lines,
  };
}

export default function GridCommand() {
  const { game, setGame } = useGameStore();
  const setCameraPreset = useSimulationStore((s) => s.setCameraPreset);
  const [levels, setLevels] = useState<Level[]>([]),
    [level, setLevel] = useState(game?.level.number || 1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tutorial, setTutorial] = useState(true),
    [briefing, setBriefing] = useState(false),
    [feedback, setFeedback] = useState<Feedback | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [action, setAction] = useState("REPAIR_LINE"),
    [target, setTarget] = useState(""),
    [value, setValue] = useState("0"),
    [algorithm, setAlgorithm] = useState("BFS"),
    [hint, setHint] = useState<Hint | null>(null),
    [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  const comparisonRef = useRef<HTMLElement>(null);
  useEffect(() => {
    request("levels")
      .then((data) => setLevels(data.levels))
      .catch((e) => setError(e.message));
    const id = sessionStorage.getItem("grid-command-id");
    if (id && !useGameStore.getState().game)
      request("state/" + id)
        .then((next) => {
          setGame(next);
          setLevel(next.level.number);
        })
        .catch(() => sessionStorage.removeItem("grid-command-id"));
  }, [setGame]);
  useEffect(() => {
    if (!playing || !hint) return;
    const timer = setInterval(
      () =>
        setStep((i) => {
          if (i >= hint.trace.steps.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      900,
    );
    return () => clearInterval(timer);
  }, [playing, hint]);
  async function perform(path: string, body?: unknown, label = "") {
    const prev = useGameStore.getState().game;
    setBusy(true);
    setError("");
    try {
      const next: Game = await request(path, body);
      setGame(next);
      sessionStorage.setItem("grid-command-id", next.game_id);
      setHint(null);
      setPlaying(false);
      if (label) {
        const result = describeTurn(prev, next, label);
        // The outcome panel replaces turn feedback once the mission is won.
        setFeedback(next.status === "WON" ? null : result);
        playCue(
          next.status === "WON"
            ? "complete"
            : result.kind === "success"
              ? "restored"
              : result.kind === "warning"
                ? "warning"
                : "switch",
        );
      }
      if (next.status === "WON") setCameraPreset("ISOMETRIC");
      return next;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (label) {
        setFeedback({ kind: "rejected", title: `Rejected · ${label}`, lines: [message, "The grid is unchanged. Try another action."] });
        playCue("warning");
      }
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function start(number: number) {
    const next = await perform("start", { level: number, seed: 42 });
    if (next) {
      setLevel(number);
      setSelected(null);
      setAction("REPAIR_LINE");
      setTarget("");
      setValue("0");
      setAlgorithm(next.level.algorithms[0]);
      setFeedback(null);
      setBriefing(true);
      setCameraPreset("ISOMETRIC");
      playCue("incident");
    }
  }
  function begin() {
    setBriefing(false);
    if (game) setCameraPreset(identity[game.level.number]?.focus ?? "ISOMETRIC");
  }
  function chooseAsset(id: string) {
    setSelected(id);
    if (!game) return;
    const load = game.topology.loads.find((l) => l.bus_id === id);
    const batt = game.session.batteries.find((b) => b.bus_id === id);
    const sw = game.session.switches.find(
      (s) => s.line_id === id || s.switch_id === id,
    );
    if (
      game.session.active_faults.some((f) => !f.cleared && f.asset_id === id)
    ) {
      setAction("REPAIR_LINE");
      setTarget(id);
    } else if (sw) {
      setAction(sw.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH");
      setTarget(sw.switch_id);
    } else if (batt) {
      setAction("DISPATCH_BATTERY");
      setTarget(batt.battery_id);
      setValue(String(Math.round(batt.max_discharge_kw * 0.6)));
    } else if (load) {
      setAction("SHED_LOAD");
      setTarget(load.load_id);
      setValue(String(load.curtailable_mw));
    } else if (
      game.topology.generators.some((g) => g.bus_id === id && id !== "BUS-01")
    ) {
      const gen = game.topology.generators.find((g) => g.bus_id === id);
      setAction("REDISPATCH_GENERATOR");
      setTarget(gen.generator_id);
      setValue(String(gen.current_P));
    } else if (id === "BUS-01") {
      setAction("SET_SOURCE_LIMIT");
      setTarget("GEN-INTAKE-1");
      setValue(String(game.level.supply_mw));
    }
  }
  async function explain(name = algorithm) {
    if (!game) return;
    setBusy(true);
    setError("");
    try {
      setHint(await request("hint", { game_id: game.game_id, algorithm: name }));
      setStep(0);
      setPlaying(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function compare() {
    if (!game) return;
    await perform("compare", { game_id: game.game_id });
    comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const s = game?.session,
    traceStep = hint?.trace.steps[step];
  const targets = game
    ? action === "REPAIR_LINE"
      ? game.session.active_faults
          .filter((f) => !f.cleared)
          .map((f) => ({
            id: f.asset_id,
            name:
              game.topology.lines.find((l) => l.line_id === f.asset_id)?.name ||
              f.asset_id,
          }))
      : action.includes("SWITCH")
        ? game.session.switches.map((sw) => ({
            id: sw.switch_id,
            name: sw.name + (sw.closed ? " · Closed" : " · Open"),
          }))
        : action === "DISPATCH_BATTERY"
          ? game.session.batteries.map((b) => ({
              id: b.battery_id,
              name: b.name,
            }))
          : action === "REDISPATCH_GENERATOR"
            ? game.topology.generators
                .filter((g) => g.bus_id !== "BUS-01")
                .map((g) => ({ id: g.generator_id, name: g.name }))
            : action.includes("LOAD")
              ? game.topology.loads.map((l) => ({
                  id: l.load_id,
                  name: l.name,
                }))
              : []
    : [];
  const effectiveTarget = targets.some((t) => t.id === target)
    ? target
    : targets[0]?.id || "";
  const numerical = [
    "DISPATCH_BATTERY",
    "SHED_LOAD",
    "SET_SOURCE_LIMIT",
    "REDISPATCH_GENERATOR",
  ].includes(action);
  const selectedLoad = game?.topology.loads.find(
      (l) => l.load_id === effectiveTarget,
    ),
    selectedBattery = s?.batteries.find(
      (b) => b.battery_id === effectiveTarget,
    );
  const selectedGenerator = game?.topology.generators.find(
    (g) => g.generator_id === effectiveTarget,
  );
  const maximum =
    action === "REDISPATCH_GENERATOR"
      ? selectedGenerator?.Pmax
      : action === "DISPATCH_BATTERY"
        ? selectedBattery?.max_discharge_kw
        : action === "SHED_LOAD"
          ? selectedLoad?.curtailable_mw
          : game?.level.supply_mw;
  const previewLevel = levels.find((l) => l.number === level);
  const look = identity[game?.level.number ?? level] ?? identity[1];
  const passed = game?.objectives.filter((o) => o.passed).length ?? 0;
  const describeTarget = () =>
    (targets.find((t) => t.id === effectiveTarget)?.name ?? effectiveTarget).replace(
      / · (Open|Closed)$/,
      "",
    );
  return (
    <div className="gc-page" style={{ ["--gc-accent" as string]: look.accent }}>
      <div className="gc-heading">
        <div>
          <span className="eyebrow">
            Operations training / Simulated distribution grid
          </span>
          <h1>GRID COMMAND</h1>
          <p>
            Keep essential services connected. Every dispatch has a consequence.
          </p>
        </div>
        <div className="gc-heading-tools">
          <SoundToggle />
          <Link href="/restore" className="secondary-button">
            Explore the case study
          </Link>
        </div>
      </div>
      <div className="gc-levels" aria-label="Training levels">
        {levels.map((l) => (
          <button
            key={l.number}
            className={level === l.number ? "selected" : ""}
            onClick={() => setLevel(l.number)}
            aria-pressed={level === l.number}
            style={{ ["--gc-accent" as string]: identity[l.number]?.accent }}
          >
            <span>
              0{l.number} · {identity[l.number]?.skill}
            </span>
            {l.title}
          </button>
        ))}
      </div>
      {(!game || game.level.number !== level) && (
        <section className="gc-start">
          <span className="gc-skill">{identity[level]?.skill}</span>
          <h2>{previewLevel?.title || "Choose your dispatch mission"}</h2>
          <p>
            {previewLevel?.briefing ||
              "Five increasingly difficult operations challenges use the existing AC simulation engine."}
          </p>
          {previewLevel && (
            <p className="gc-limits">
              Intake limit {previewLevel.supply_mw} MW · {previewLevel.max_turns} dispatch turns
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy || !levels.length}
            onClick={() => start(level)}
          >
            {busy ? "Preparing feeder…" : "Start mission"}
          </button>
          {game && (
            <button
              className="quiet-button"
              onClick={() => setLevel(game.level.number)}
            >
              Return to active mission
            </button>
          )}
        </section>
      )}
      {tutorial && (
        <details className="gc-tutorial" open>
          <summary>Operator tutorial</summary>
          <ol>
            <li>
              Select a building, line or switch in the city, or choose an action
              below it.
            </li>
            <li>
              Reroute supply, repair damage, dispatch finite battery backup, or
              curtail flexible demand. Critical reserves cannot be shed.
            </li>
            <li>
              Watch the AC checks. A connected graph can still violate voltage,
              capacity or generation limits.
            </li>
            <li>
              Meet all mission objectives before time expires, then complete the
              mission. Use Explain Decision for computed algorithm traces.
            </li>
          </ol>
          <button className="quiet-button" onClick={() => setTutorial(false)}>
            Got it
          </button>
        </details>
      )}
      {error && !feedback && (
        <p className="gc-error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="gc-pending" role="status">
          Computing the grid state…
        </p>
      )}
      {game && s && game.level.number === level && (
        <>
          <div className="gc-brief">
            <div>
              <span className="gc-skill">{look.skill}</span>
              <h2>
                Level {game.level.number} · {game.level.title}
              </h2>
              <p>{look.objective}</p>
            </div>
            <span className={"gc-status " + game.status.toLowerCase()}>
              {game.status === "WON"
                ? "Mission complete"
                : game.status === "LOST"
                  ? "Dispatch time expired"
                  : "Dispatch in progress"}
            </span>
          </div>
          <div className="gc-stats">
            <div>
              <span>Critical supply restored</span>
              <strong>
                {game.constraints.length
                  ? "Unverified"
                  : s.kpis.critical_load_restored_pct.toFixed(1) + "%"}
              </strong>
              <small>
                {s.kpis.critical_served_mw.toFixed(2)} /{" "}
                {s.kpis.critical_demand_mw.toFixed(2)} MW{" "}
                {game.constraints.length ? "attempted" : "AC verified"}
              </small>
            </div>
            <div>
              <span>Emergency resources</span>
              <strong>
                {game.level.max_turns - game.turns} turns ·{" "}
                {game.credits_remaining} credits
              </strong>
              <small>
                {s.batteries.length
                  ? s.batteries
                      .map((b) => `${b.name.split(" (")[0]} ${b.soc_percent.toFixed(0)}%`)
                      .join(" · ")
                  : "No battery storage"}
              </small>
            </div>
            <div className={game.constraints.length ? "gc-unsafe" : "gc-safe-tile"}>
              <span>Electrical safety</span>
              <strong>
                {game.constraints.length
                  ? `${game.constraints.length} limit violation${game.constraints.length > 1 ? "s" : ""}`
                  : "Within limits"}
              </strong>
              <small>
                {s.kpis.active_faults_count} active fault
                {s.kpis.active_faults_count === 1 ? "" : "s"} ·{" "}
                {game.advisories.length} caution
                {game.advisories.length === 1 ? "" : "s"}
              </small>
            </div>
          </div>
          <div
            className="gc-progress"
            role="progressbar"
            aria-label="Mission objectives met"
            aria-valuemin={0}
            aria-valuemax={game.objectives.length}
            aria-valuenow={passed}
          >
            <span style={{ width: `${(passed / Math.max(1, game.objectives.length)) * 100}%` }} />
            <small>
              {passed} / {game.objectives.length} objectives met
            </small>
          </div>
          <div className="gc-workspace">
            <section className="gc-network">
              <div className="gc-city">
                <City
                  heightClass="h-[480px]"
                  session={s}
                  interactive={false}
                  overrides={{
                    selectedAssetId: selected,
                    onSelectAsset: chooseAsset,
                    traceNodeIds: traceStep?.active_nodes || [],
                    traceEdgeIds: [
                      ...(traceStep?.active_edges || []),
                      ...(traceStep?.selected_edges || []),
                    ],
                  }}
                />
                {briefing && game.turns === 0 && game.status === "ACTIVE" && (
                  <div className="gc-briefing" role="dialog" aria-label="Mission briefing">
                    <span className="gc-skill">
                      Level {game.level.number} · {look.skill}
                    </span>
                    <h3>{game.level.title}</h3>
                    <p>{game.level.briefing}</p>
                    <p className="gc-limits">
                      Intake limit {game.level.supply_mw} MW · {game.level.max_turns} turns ·{" "}
                      {game.credits_remaining} credits
                    </p>
                    <button className="primary-button" onClick={begin}>
                      Begin mission
                    </button>
                  </div>
                )}
              </div>
              {feedback && (
                <div className={`gc-feedback ${feedback.kind}`} role="status" aria-live="polite">
                  <strong>{feedback.title}</strong>
                  {feedback.lines.length > 0 ? (
                    <ul>
                      {feedback.lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Applied. No facility changed supply state.</p>
                  )}
                </div>
              )}
              <p className="gc-caption">
                Select any facility, feeder or switch to inspect it. Lit
                windows: supplied · dark: interrupted · red dashed: faulted
                section.
              </p>
              <form
                className="gc-actions"
                onSubmit={(e) => {
                  e.preventDefault();
                  setBriefing(false);
                  perform(
                    "action",
                    {
                      game_id: game.game_id,
                      version: game.version,
                      action,
                      target: effectiveTarget,
                      value: numerical ? Number(value) : null,
                    },
                    `${actionLabels[action]}${effectiveTarget ? " · " + describeTarget() : ""}`,
                  );
                }}
              >
                <label>
                  Available action
                  <select
                    aria-label="Available action"
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value);
                      setTarget("");
                      setValue(
                        e.target.value === "SET_SOURCE_LIMIT"
                          ? String(game.level.supply_mw)
                          : "0",
                      );
                    }}
                  >
                    {Object.entries(actionLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {targets.length > 0 && (
                  <label>
                    Asset
                    <select
                      aria-label="Asset"
                      value={effectiveTarget}
                      onChange={(e) => {
                        setTarget(e.target.value);
                      }}
                    >
                      {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {numerical && (
                  <label>
                    {action === "DISPATCH_BATTERY"
                      ? "Battery dispatch (kW)"
                      : action === "SET_SOURCE_LIMIT"
                        ? "Intake limit (MW)"
                        : action === "REDISPATCH_GENERATOR"
                          ? "Local generation (MW)"
                          : "Flexible load curtailed (MW)"}
                    <input
                      type="number"
                      step={action === "DISPATCH_BATTERY" ? "10" : ".1"}
                      min={action === "SET_SOURCE_LIMIT" ? 2 : 0}
                      max={maximum}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required
                    />
                    <small>
                      Maximum{" "}
                      {maximum?.toFixed(action === "DISPATCH_BATTERY" ? 0 : 2)}{" "}
                      {action === "DISPATCH_BATTERY" ? "kW" : "MW"}
                      {selectedBattery
                        ? " · " +
                          selectedBattery.soc_percent.toFixed(0) +
                          "% charge"
                        : ""}
                    </small>
                  </label>
                )}
                <button
                  className="primary-button"
                  disabled={
                    busy ||
                    game.status !== "ACTIVE" ||
                    (!targets.length &&
                      !["SET_SOURCE_LIMIT", "WAIT"].includes(action))
                  }
                >
                  Dispatch · {game.action_costs[action]} credits
                </button>
              </form>
              <div className="gc-secondary-actions">
                <button
                  className="quiet-button"
                  disabled={busy || !game.can_undo}
                  onClick={() =>
                    perform(
                      "undo",
                      {
                        game_id: game.game_id,
                        version: game.version,
                      },
                      "Undo",
                    )
                  }
                >
                  Undo turn
                </button>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => start(level)}
                >
                  Restart
                </button>
                <button
                  className="quiet-button"
                  disabled={busy || game.turns === 0}
                  onClick={() => perform("replay", { game_id: game.game_id })}
                >
                  Replay my moves
                </button>
                <button
                  className="secondary-button"
                  disabled={
                    busy || !game.can_complete || game.status !== "ACTIVE"
                  }
                  onClick={() =>
                    perform(
                      "action",
                      {
                        game_id: game.game_id,
                        version: game.version,
                        action: "COMPLETE",
                      },
                      "Complete mission",
                    )
                  }
                >
                  Complete mission
                </button>
              </div>
              {game.status === "WON" && (
                <div className="gc-win" role="status">
                  <div className="gc-win-mark" aria-hidden="true">
                    ✓
                  </div>
                  <div>
                    <h3>Critical service protected. AC limits verified.</h3>
                    <p className="gc-win-score">
                      {game.score} <small>/ 1,000</small>
                    </p>
                    <ul>
                      <li>
                        Critical supply {s.kpis.critical_load_restored_pct.toFixed(1)}% · total{" "}
                        {s.kpis.total_load_restored_pct.toFixed(1)}%.
                      </li>
                      <li>
                        {game.turns} turn{game.turns === 1 ? "" : "s"} used of {game.level.max_turns};{" "}
                        {game.spent} credits spent.
                      </li>
                      <li>
                        Converged AC solution with no voltage, thermal or generation violations.
                      </li>
                    </ul>
                    <div className="gc-win-actions">
                      {level < 5 && (
                        <button
                          className="primary-button"
                          onClick={() => {
                            setLevel(level + 1);
                            start(level + 1);
                          }}
                          disabled={busy}
                        >
                          Next level →
                        </button>
                      )}
                      <button className="secondary-button" disabled={busy} onClick={() => perform("replay", { game_id: game.game_id })}>
                        Replay mission
                      </button>
                      <button className="secondary-button" disabled={busy} onClick={compare}>
                        Compare with CAPER
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {game.status === "LOST" && (
                <div className="gc-lost" role="status">
                  <h3>Dispatch time expired before every objective held.</h3>
                  <ul>
                    {game.objectives
                      .filter((o) => !o.passed)
                      .map((o) => (
                        <li key={o.label}>Not met: {o.label}</li>
                      ))}
                    {game.constraints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <div className="gc-win-actions">
                    <button
                      className="secondary-button"
                      disabled={busy || !game.can_undo}
                      onClick={() =>
                        perform("undo", { game_id: game.game_id, version: game.version }, "Undo")
                      }
                    >
                      Undo last turn
                    </button>
                    <button className="primary-button" disabled={busy} onClick={() => start(level)}>
                      Retry level
                    </button>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setAlgorithm(game.level.algorithms[0]);
                        explain(game.level.algorithms[0]);
                      }}
                    >
                      Get a hint
                    </button>
                  </div>
                </div>
              )}
            </section>
            <aside className="gc-objectives">
              <h3>Mission objectives</h3>
              <ul>
                {game.objectives.map((o) => (
                  <li key={o.label} className={o.passed ? "passed" : ""}>
                    <span aria-label={o.passed ? "Passed" : "Not yet passed"}>
                      {o.passed ? "✓" : "○"}
                    </span>
                    {o.label}
                  </li>
                ))}
              </ul>
              <h3>Electrical checks</h3>
              {game.constraints.length ? (
                <ul className="gc-constraints">
                  {game.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : (
                <p className="gc-safe">AC converged within mission limits.</p>
              )}
              {game.advisories.length > 0 && (
                <details>
                  <summary>
                    {game.advisories.length} operating caution(s)
                  </summary>
                  {game.advisories.map((a) => (
                    <p key={a}>{a}</p>
                  ))}
                </details>
              )}
              <details className="gc-score">
                <summary>Score so far: {game.score} · how is it calculated?</summary>
                {Object.entries(game.score_breakdown).map(([key, n]) => (
                  <div key={key}>
                    <span>{key.replaceAll("_", " ")}</span>
                    <strong>
                      {key === "constraint_penalty" ? "−" : ""}
                      {n}
                    </strong>
                  </div>
                ))}
                <p>
                  Infeasible states are capped below 400. Reliability is
                  averaged over accepted turns. Undo restores the entire prior
                  score and grid state.
                </p>
              </details>
            </aside>
          </div>
          <section className="gc-explain">
            <div className="gc-explain-heading">
              <div>
                <span className="eyebrow">Algorithm advisor</span>
                <h2>Explain Decision</h2>
                <p>{game.level.lesson}</p>
              </div>
              <div className="gc-hint-controls">
                <label className="sr-only" htmlFor="gc-algorithm">
                  Algorithm
                </label>
                <select
                  id="gc-algorithm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                >
                  {Object.entries(algorithmLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => explain()}
                >
                  Explain Decision
                </button>
              </div>
            </div>
            {hint && (
              <div className="gc-trace">
                <h3>{hint.trace.algorithm_name}</h3>
                <p>{hint.interpretation}</p>
                <p>{hint.trace.grid_engineering_meaning}</p>
                <p>
                  <strong>Time complexity:</strong>{" "}
                  {hint.trace.theoretical_time_complexity}
                </p>
                <details>
                  <summary>Computed inputs and outputs</summary>
                  <div className="gc-io">
                    <div>
                      <h4>Inputs</h4>
                      <pre>
                        {JSON.stringify(hint.trace.input_summary, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4>Outputs</h4>
                      <pre>
                        {JSON.stringify(hint.trace.final_output, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
                <div className="gc-trace-player">
                  <button
                    className="quiet-button"
                    disabled={!step}
                    onClick={() => setStep(Math.max(0, step - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() => {
                      if (step === hint.trace.steps.length - 1) setStep(0);
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? "Pause" : "Play trace"}
                  </button>
                  <input
                    aria-label="Algorithm trace step"
                    type="range"
                    min={0}
                    max={Math.max(0, hint.trace.steps.length - 1)}
                    value={step}
                    onChange={(e) => {
                      setStep(Number(e.target.value));
                      setPlaying(false);
                    }}
                  />
                  <button
                    className="quiet-button"
                    disabled={step >= hint.trace.steps.length - 1}
                    onClick={() => setStep(step + 1)}
                  >
                    Next step
                  </button>
                </div>
                <p className="gc-trace-description" role="status">
                  <strong>
                    Step {step + 1} / {hint.trace.steps.length} ·{" "}
                    {traceStep?.operation}
                  </strong>
                  <br />
                  {traceStep?.description}
                </p>
                {hint.caper && (
                  <div>
                    <h4>
                      {hint.caper.selected_candidate.feasible
                        ? "AC-validated candidate"
                        : "No feasible candidate yet"}
                    </h4>
                    <ol>
                      {hint.caper.selected_candidate.actions.map(
                        (a: any, i: number) => (
                          <li key={i}>{a.description}</li>
                        ),
                      )}
                    </ol>
                    <p>
                      These are recommendations. Apply individual controls
                      above; the game validates each decision and charges its
                      operating cost.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
          <div className="gc-bottom">
            <section className="gc-events">
              <h3>Dispatch event log</h3>
              <ol>
                {[...game.events].reverse().map((e, i) => (
                  <li key={i} className={e.kind}>
                    <span>Turn {e.turn}</span>
                    {e.message}
                  </li>
                ))}
              </ol>
            </section>
            <section className="gc-comparison" ref={comparisonRef}>
              <h3>Your operation vs CAPER</h3>
              <p>
                Compute CAPER from this mission’s original faults, seed and
                supply budget.
              </p>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => perform("compare", { game_id: game.game_id })}
              >
                Compare same initial scenario
              </button>
              {game.comparison && (
                <>
                  <div className="gc-comparison-values">
                    {[
                      ["You", game.comparison.player],
                      ["CAPER", game.comparison.caper],
                    ].map(([label, data]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>
                          {data.feasible
                            ? data.critical_pct.toFixed(1) + "%"
                            : "Unverified"}
                        </strong>
                        <small>
                          {data.feasible
                            ? "AC feasible critical supply"
                            : data.critical_pct.toFixed(1) +
                              "% attempted supply"}
                        </small>
                      </div>
                    ))}
                  </div>
                  <p>{game.comparison.note}</p>
                </>
              )}
            </section>
          </div>
          <p className="gc-model-note">{game.model_note}</p>
        </>
      )}
    </div>
  );
}

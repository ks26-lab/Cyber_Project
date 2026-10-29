import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const out = new URL("../../../docs/screenshots/laboratories/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--disable-webgl", "--disable-webgl2", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) =>
  errors.push({ route: page.url(), error: e.message }),
);
async function postFromUI(path, click) {
  const pending = page.waitForResponse(
    (r) => r.url().endsWith(path) && r.request().method() === "POST",
    { timeout: 120000 },
  );
  await click();
  const response = await pending;
  const data = await response.json();
  if (!response.ok()) throw Error(path + ": " + JSON.stringify(data));
  return data;
}
async function shot(name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL(name + ".png", out).pathname,
    fullPage: true,
  });
}
try {
  await page.request.post(base + "/api/gridzero/session/reset", {
    data: { network_id: "TRAINING_FEEDER", seed: 42 },
  });
  const matchWait = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/gridzero/algorithms/run") &&
      r.request().method() === "POST",
  );
  await page.goto(base + "/algorithms?algo=BIPARTITE_MATCHING");
  const matching = await (await matchWait).json();
  expect(matching.trace.algorithm_id).toBe("BIPARTITE_MATCHING");
  expect(matching.trace.final_output.matching_size).toBeGreaterThan(0);
  await expect(page.locator("#algorithm")).toHaveValue("BIPARTITE_MATCHING");
  const flow = await postFromUI("/api/gridzero/algorithms/run", () =>
    page.locator("#algorithm").selectOption("MIN_COST_MAX_FLOW"),
  );
  expect(flow.trace.final_output.min_cut_capacity_mw).toBeCloseTo(
    flow.trace.final_output.max_deliverable_mw,
    2,
  );
  await page.getByRole("button", { name: "Next", exact: false }).last().click();
  await shot("algorithms-desktop");
  await page.goto(base + "/cyber-lab");
  const cyber = await postFromUI("/api/cyber/simulate", () =>
    page
      .getByRole("button", { name: "Run detection pipeline", exact: true })
      .click(),
  );
  expect(cyber.execution_timeline.length).toBeGreaterThan(0);
  expect(cyber.event).toBeTruthy();
  expect(cyber.simulation_id).toBeTruthy();
  await shot("cyber-desktop");
  await page.goto(base + "/research");
  await expect(page.getByText(/Experiment results · RUN-/)).toBeVisible({
    timeout: 120000,
  });
  const runResponse = await page.request.get(
    base + "/api/gridzero/research/runs/RUN-DEFAULT-BENCHMARK",
  );
  expect(runResponse.ok()).toBe(true);
  const run = (await runResponse.json()).run;
  expect(run.trials.length).toBeGreaterThan(0);
  const csv = await page.request.get(
    base + "/api/gridzero/research/runs/" + run.run_id + "/export-csv",
  );
  expect(csv.ok()).toBe(true);
  expect(await csv.text()).toContain("ac_feasible");
  await shot("research-desktop");
  await page.goto(base + "/runs/" + run.run_id);
  await expect(
    page.getByText("Trial-by-Trial AC Power-Flow Evaluation Ledger", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(run.trials.length);
  expect(
    (
      await page.request.get(base + "/api/gridzero/research/runs/NO-SUCH-RUN")
    ).status(),
  ).toBe(404);
  const missionWait = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/gridzero/session/reset") &&
      r.request().method() === "POST",
  );
  await page.goto(base + "/missions/MISSION_07");
  const mission = (await (await missionWait).json()).session;
  expect(mission.network_id).toBe("IEEE_33_DISTRIBUTION");
  for (const f of mission.active_faults)
    expect(
      mission.power_flow.lines.some(
        (l) => l.line_id === f.asset_id && l.status === "OUT_OF_SERVICE",
      ),
    ).toBe(true);
  await page.goto(base + "/challenge");
  const crisis = await postFromUI("/api/gridzero/session/reset", () =>
    page.getByRole("button", { name: /Load Crisis Scenario/ }).click(),
  );
  expect(crisis.session.source_capacity_limit_mw).toBe(7.2);
  const comparison = await postFromUI("/api/gridzero/challenge/compare", () =>
    page
      .getByRole("button", { name: "Score My Solution vs. AI", exact: true })
      .click(),
  );
  expect(comparison.leaderboard.length).toBe(6);
  expect(comparison.faulted_branches.sort()).toEqual([
    "LINE-02-03",
    "LINE-03-04",
  ]);
  await shot("challenge-desktop");
  for (const route of [
    "/algorithms",
    "/cyber-lab",
    "/research",
    "/missions/MISSION_07",
    "/challenge",
    "/demo",
    "/docs",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + route);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route + " mobile overflow",
    ).toBe(true);
    await shot(route.split("/")[1] + "-mobile");
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: real matching/flow traces, cyber detection evidence, measured benchmark/CSV/run identity, real IEEE mission faults, fair challenge, mobile layouts; no WebGL or uncaught errors.",
  );
} finally {
  await browser.close();
}

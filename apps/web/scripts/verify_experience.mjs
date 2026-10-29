/**
 * End-to-end acceptance for the restoration experience and Grid Command, on real
 * GPU-backed WebGL and again with WebGL disabled. Every figure checked here is read
 * back from the backend API; nothing is intercepted or fabricated.
 */
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const out = new URL("../../../docs/screenshots/experience/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const shot = (page, name, locator) =>
  (locator ?? page).screenshot({ path: new URL(name + ".png", out).pathname });
const errorsOf = (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${page.url()} ${e.message}`));
  page.on("console", (m) => {
    // HTTP 409 responses are expected when the backend rejects a game action.
    if (m.type() === "error" && !/status of 409/.test(m.text()))
      errors.push(`${page.url()} ${m.text()}`);
  });
  return errors;
};
const button = (page, name) => page.getByRole("button", { name, exact: true });
const api = async (page, path) => (await page.request.get(base + path)).json();

async function restoreJourney(page, { threeD }) {
  const step = (name) => button(page, name);
  await page.goto(base + "/restore");
  await expect(step("Start Emergency").or(step("Restart Scenario")).first()).toBeEnabled();
  await (await step("Start Emergency").count() ? step("Start Emergency") : step("Restart Scenario")).click();
  if (threeD) {
    await page.locator("canvas").waitFor({ timeout: 60000 });
    await expect(page.locator('[data-graphics-status="available"]')).toBeVisible();
    await page.waitForTimeout(1500);
    await shot(page, "01-active-3d-city", page.locator(".restore-stage"));
  } else {
    await page.getByTestId("grid-2d-fallback").waitFor({ timeout: 60000 });
  }
  await expect(step("Investigate Outage")).toBeEnabled({ timeout: 120000 });
  await expect(page.locator(".restore-notice")).toContainText("Hospital supply interrupted");
  const outage = (await api(page, "/api/gridzero/session")).session;
  const dark = outage.buildings_3d.filter((b) => b.power_state === "BLACKOUT" && b.demand_mw > 0);
  if (!dark.some((b) => b.facility_type === "HOSPITAL"))
    throw Error("Backend does not report the hospital without supply");
  await expect(page.locator(".restore-notice")).toContainText(`${dark.length} facilities`);
  await page.waitForTimeout(1600);
  if (threeD) await shot(page, "02-feeder-outage", page.locator(".restore-stage"));

  await step("Investigate Outage").click();
  await expect(page.locator(".journey-status")).toContainText("BFS ·", { timeout: 30000 });
  await page.waitForTimeout(1500);
  if (threeD) await shot(page, "03-algorithm-bfs-frontier", page.locator(".restore-stage"));
  await expect(step("Find Restoration Plan")).toBeEnabled({ timeout: 120000 });
  await expect(page.locator(".restore-notice")).toContainText("BFS from the substation reaches");

  await step("Find Restoration Plan").click();
  await expect(page.locator(".journey-status")).toContainText("Dijkstra ·", { timeout: 30000 });
  await page.waitForTimeout(1200);
  if (threeD) await shot(page, "04-algorithm-dijkstra-route", page.locator(".restore-stage"));
  await expect(step("Apply Plan")).toBeEnabled({ timeout: 180000 });
  const rows = page.locator(".candidate-list li");
  const shown = await rows.count();
  if (!shown) throw Error("No candidate validation shown");
  if (!(await page.locator(".candidate-list li.selected").count()))
    throw Error("Selected candidate not marked");
  await page.locator(".candidate-list").scrollIntoViewIfNeeded();
  if (threeD) await shot(page, "05-candidate-validation");

  await step("Apply Plan").click();
  await page.getByRole("link", { name: "Evaluate the result →" }).first().waitFor({ timeout: 180000 });
  await page.waitForTimeout(2500);
  const after = (await api(page, "/api/gridzero/session")).session;
  const metric = await page.locator(".metric-row > div").first().locator("strong").innerText();
  if (metric !== after.kpis.critical_load_restored_pct.toFixed(1) + "%")
    throw Error(`Displayed critical supply ${metric} differs from backend ${after.kpis.critical_load_restored_pct}`);
  const hospital = after.buildings_3d.find((b) => b.facility_type === "HOSPITAL");
  if (hospital.power_state === "BLACKOUT") throw Error("Hospital not restored in backend");
  if (!after.active_faults.some((f) => !f.cleared))
    throw Error("Restoration must not repair the faulted lines");
  if (threeD) {
    await page.locator(".restore-stage").scrollIntoViewIfNeeded();
    await shot(page, "06-restored-city", page.locator(".restore-stage"));
  }

  await step("Replay Restoration").click();
  await expect(page.locator(".replay-bar")).toContainText("Replay 1 / 3");
  await step("Next").click();
  await expect(page.locator(".replay-bar")).toContainText("Feeder trip");
  await step("Next").click();
  await expect(page.locator(".replay-bar")).toContainText("Restored");
  await step("Exit replay").click();
  await step("Continue to Debrief").click();
  await expect(page.locator(".debrief")).toContainText("remain isolated");
  return { critical: after.kpis.critical_load_restored_pct };
}

async function playAllLevels(page, { screenshots }) {
  let game;
  const respond = async (action, path = "action") => {
    const waiting = page.waitForResponse(
      (r) => r.url().endsWith("/api/grid-command/" + path) && r.request().method() === "POST",
    );
    await action();
    const res = await waiting;
    game = await res.json();
    await expect(page.locator(".gc-pending")).toHaveCount(0);
    return res.ok();
  };
  const dispatch = async (action, target, value) => {
    await page.locator(".gc-actions label").filter({ hasText: "Available action" }).locator("select").selectOption(action);
    if (target) await page.locator(".gc-actions label").filter({ hasText: /^Asset/ }).locator("select").selectOption(target);
    if (value !== undefined) await page.getByRole("spinbutton").fill(String(value));
    await respond(() => page.locator(".gc-actions").getByRole("button", { name: /Dispatch ·/ }).click());
    await expect(page.locator(".gc-feedback")).toBeVisible();
  };
  await page.goto(base + "/grid-command");
  const results = [];
  for (const [number, title] of [
    [1, "Hospital Blackout"],
    [2, "Citywide Power Shortage"],
    [3, "Transmission Line Failure"],
    [4, "Cascading Outage"],
    [5, "CAPER Challenge"],
  ]) {
    await page.getByRole("button", { name: new RegExp("0" + number + ".*" + title) }).click();
    await respond(() => button(page, "Start mission").click(), "start");
    if (await button(page, "Got it").count()) await button(page, "Got it").click();
    await expect(page.getByRole("dialog", { name: "Mission briefing" })).toBeVisible();
    await button(page, "Begin mission").click();
    if (number === 1) {
      // A rejected action is explained by the backend and leaves the grid unchanged.
      await dispatch("CLOSE_SWITCH", "SW-02-03");
      await expect(page.locator(".gc-feedback.rejected")).toContainText("Repair the faulted line");
      await dispatch("REPAIR_LINE", "LINE-02-03");
      await expect(page.locator(".gc-feedback")).toContainText("supplied again");
      if (screenshots) {
        await page.waitForTimeout(1500);
        await page.locator(".gc-network").scrollIntoViewIfNeeded();
        await shot(page, "07-game-level-in-progress");
      }
    } else {
      await dispatch("SHED_LOAD", "LOAD-INDUSTRIAL", 3.2);
      await dispatch("SHED_LOAD", "LOAD-COMMERCIAL", 1.4);
      await dispatch("DISPATCH_BATTERY", "BESS-CITY-1", 1700);
      await dispatch("DISPATCH_BATTERY", "BESS-HOSP-1", 510);
      for (const fault of [...game.session.active_faults])
        if (!fault.cleared) await dispatch("REPAIR_LINE", fault.asset_id);
    }
    await expect(button(page, "Complete mission")).toBeEnabled();
    await respond(() => button(page, "Complete mission").click());
    if (game.status !== "WON") throw Error(`Level ${number} not won`);
    const state = await (await page.request.get(base + "/api/grid-command/state/" + game.game_id)).json();
    await expect(page.locator(".gc-win-score")).toContainText(String(state.score));
    results.push({ level: number, score: state.score, critical: state.session.kpis.critical_load_restored_pct });
    if (screenshots && number === 1) {
      await page.waitForTimeout(1200);
      await page.locator(".gc-win").scrollIntoViewIfNeeded();
      await shot(page, "08-game-victory");
    }
  }
  await respond(() => button(page, "Compare with CAPER").click(), "compare");
  if (!game.comparison?.caper?.feasible) throw Error("CAPER comparison not AC feasible");
  return results;
}

const summary = {};
// 1. Capable browser: real GPU-backed WebGL2.
{
  const browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
  // Video needs Playwright's ffmpeg (`npx playwright install ffmpeg`); opt in with RECORD_VIDEO=1.
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    ...(process.env.RECORD_VIDEO
      ? { recordVideo: { dir: new URL("video/", out).pathname, size: { width: 1400, height: 1000 } } }
      : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = errorsOf(page);
  try {
    await page.goto(base);
    summary.renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : String(!!gl);
    });
    await page.getByRole("heading", { name: "How connected is our power grid?" }).waitFor();
    await page.locator(".india-flow").first().waitFor({ timeout: 60000 });
    await page.getByPlaceholder("Search a substation or state…").fill("Delhi");
    await page.locator(".search-results button").first().click();
    await page.waitForTimeout(800);
    await shot(page, "00-india-map");
    await page.getByRole("link", { name: "Explore a local outage →" }).click();
    summary.restore3d = await restoreJourney(page, { threeD: true });
    // Repeated 3D <-> 2D switching with labels on screen.
    for (let i = 0; i < 6; i++) {
      await button(page, "2D Network").click();
      await expect(page.locator("canvas")).toHaveCount(0);
      await button(page, "3D City").click();
      await page.locator("canvas").waitFor();
      await page.waitForTimeout(i % 2 ? 80 : 500);
    }
    await button(page, "2D Network").click();
    await page.waitForTimeout(800);
    if (await page.locator(".city-label").count()) throw Error("Floating labels survived renderer unmount");
    summary.levels3d = await playAllLevels(page, { screenshots: true });
  } finally {
    await context.close();
    await browser.close();
  }
  if (errors.length) throw Error("Client errors (3D):\n" + errors.join("\n"));
}
// 2. WebGL disabled: same journey in the 2D network.
{
  const browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ["--disable-webgl", "--disable-webgl2", "--disable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.setDefaultTimeout(60000);
  const errors = errorsOf(page);
  try {
    summary.restore2d = await restoreJourney(page, { threeD: false });
    await expect(button(page, "Try 3D Again")).toBeVisible();
    await page.locator(".restore-stage").scrollIntoViewIfNeeded();
    await shot(page, "09-2d-fallback-restored", page.locator(".restore-stage"));
    summary.levels2d = await playAllLevels(page, { screenshots: false });
  } finally {
    await browser.close();
  }
  if (errors.length) throw Error("Client errors (2D):\n" + errors.join("\n"));
}
await fs.writeFile(new URL("verification.json", out), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
console.log(
  "PASS: real-GPU 3D and WebGL-disabled 2D restoration journeys, replay, repeated 3D/2D switching, five manual Grid Command wins in each mode, backend-matching figures, no client errors.",
);

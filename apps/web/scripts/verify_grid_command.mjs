/** Real UI gameplay smoke test. No WebGL; no intercepted or fabricated responses. */
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const out = new URL("../../../docs/screenshots/grid-command/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: [
    "--disable-webgl",
    "--disable-webgl2",
    "--disable-gpu",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let game;
async function response(action, path = "action") {
  const waiting = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/grid-command/" + path) &&
      r.request().method() === "POST",
  );
  await action();
  const res = await waiting;
  const data = await res.json();
  if (!res.ok()) throw Error(JSON.stringify(data));
  game = data;
  await page
    .getByRole("button", { name: "Complete mission", exact: true })
    .waitFor();
  await expect(page.locator(".gc-pending")).toHaveCount(0);
  return data;
}
async function shot(name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  await page.screenshot({
    path: new URL(name + ".png", out).pathname,
    fullPage: true,
  });
}
async function chooseLevel(level, title) {
  await page
    .getByRole("button", { name: new RegExp("0" + level + ".*" + title) })
    .click();
  await response(
    () =>
      page.getByRole("button", { name: "Start mission", exact: true }).click(),
    "start",
  );
}
async function dispatch(action, target, value) {
  await page
    .locator(".gc-actions label")
    .filter({ hasText: "Available action" })
    .locator("select")
    .selectOption(action);
  if (target)
    await page
      .locator(".gc-actions label")
      .filter({ hasText: /^Asset/ })
      .locator("select")
      .selectOption(target);
  if (value !== undefined)
    await page.getByRole("spinbutton").fill(String(value));
  await response(() =>
    page
      .locator(".gc-actions")
      .getByRole("button", { name: /Dispatch ·/ })
      .click(),
  );
}
async function complete() {
  await expect(
    page.getByRole("button", { name: "Complete mission", exact: true }),
  ).toBeEnabled();
  await response(() =>
    page.getByRole("button", { name: "Complete mission", exact: true }).click(),
  );
  if (game.status !== "WON") throw Error("Mission did not win");
}
try {
  await page.goto(base + "/grid-command");
  await page
    .getByRole("heading", { name: "GRID COMMAND", exact: true })
    .waitFor();
  await chooseLevel(1, "Hospital Blackout");
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Complete mission", exact: true }),
  ).toBeDisabled();
  await shot("desktop-hospital-outage");
  await dispatch("REPAIR_LINE", "LINE-02-03");
  await complete();
  await response(
    () => page.getByRole("button", { name: "Undo turn", exact: true }).click(),
    "undo",
  );
  await response(
    () => page.getByRole("button", { name: "Undo turn", exact: true }).click(),
    "undo",
  );
  if (game.turns !== 0) throw Error("Undo did not restore pre-action state");
  await page
    .getByLabel("Algorithm", { exact: true })
    .selectOption("BIPARTITE_MATCHING");
  const hintResponse = page.waitForResponse((r) =>
    r.url().endsWith("/api/grid-command/hint"),
  );
  await page
    .getByRole("button", { name: "Explain Decision", exact: true })
    .click();
  const hint = await (await hintResponse).json();
  if (!hint.trace?.steps?.length)
    throw Error("Missing computed matching trace");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await shot("desktop-algorithm-trace");
  await dispatch("REPAIR_LINE", "LINE-02-03");
  await complete();
  const saved = game;
  await response(
    () =>
      page
        .getByRole("button", { name: "Replay my moves", exact: true })
        .click(),
    "replay",
  );
  if (game.status !== "WON" || game.score !== saved.score)
    throw Error("Replay changed deterministic score");
  await response(
    () => page.getByRole("button", { name: "Restart", exact: true }).click(),
    "start",
  );
  if (game.turns !== 0) throw Error("Restart did not reset");
  for (const [number, title] of [
    [2, "Citywide Power Shortage"],
    [3, "Transmission Line Failure"],
    [4, "Cascading Outage"],
    [5, "CAPER Challenge"],
  ]) {
    await chooseLevel(number, title);
    await dispatch("SHED_LOAD", "LOAD-INDUSTRIAL", 3.2);
    await dispatch("SHED_LOAD", "LOAD-COMMERCIAL", 1.4);
    await dispatch("DISPATCH_BATTERY", "BESS-CITY-1", 1700);
    await dispatch("DISPATCH_BATTERY", "BESS-HOSP-1", 510);
    for (const fault of [...game.session.active_faults])
      if (!fault.cleared) await dispatch("REPAIR_LINE", fault.asset_id);
    await complete();
    console.log(
      "Won level",
      number,
      "score",
      game.score,
      "critical",
      game.session.kpis.critical_load_restored_pct,
    );
  }
  await response(
    () =>
      page
        .getByRole("button", {
          name: "Compare same initial scenario",
          exact: true,
        })
        .click(),
    "compare",
  );
  if (!game.comparison?.caper?.feasible)
    throw Error("CAPER comparator not AC feasible");
  if (game.comparison.initial_faults.length !== 2)
    throw Error("Comparison lost initial faults");
  await shot("desktop-caper-challenge-complete");
  await page.reload();
  await page
    .getByRole("heading", { name: "Level 5 · CAPER Challenge", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile-caper-challenge");
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Game overflows mobile viewport");
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    new URL("verification.json", out),
    JSON.stringify(
      {
        passed: true,
        webgl: false,
        completedLevels: 5,
        finalScore: game.score,
        comparison: game.comparison,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: five manual UI wins, no WebGL, undo/reset/replay, matching trace, fair CAPER comparison and mobile layout",
  );
} catch (error) {
  console.log("GAME FAILURE", String(error), JSON.stringify(errors));
  console.log((await page.locator(".gc-page").innerText()).slice(0, 4000));
  await shot("failure");
  throw error;
} finally {
  await browser.close();
}

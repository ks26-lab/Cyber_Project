import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const out = new URL("../../../docs/screenshots/intelligence/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--disable-webgl", "--disable-webgl2"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL(name + ".png", out).pathname,
    fullPage: true,
  });
};
try {
  const loaded = page.waitForResponse(
    (r) =>
      r.url().includes("/api/gridzero/session?network_id=INDIA_GRID_59") &&
      r.request().method() === "GET",
  );
  await page.goto(base);
  const data = await (await loaded).json();
  expect(data.session.network_id).toBe("INDIA_GRID_59");
  const map = page.getByRole("group", {
    name: "Geographic India map with state boundaries and modeled transmission substations",
  });
  const initial = await map.getAttribute("viewBox");
  await page
    .getByRole("button", { name: "Select Delhi", exact: true })
    .press("Enter");
  await expect(map).not.toHaveAttribute("viewBox", initial);
  await expect(
    page.getByRole("heading", { name: "Delhi", exact: true }),
  ).toBeVisible();
  const regionalAssets = data.session.buildings_3d.filter(
    (b) => b.bus_id === "BUS-NR-DELHI",
  );
  const expectedDemand =
    regionalAssets.reduce((v, b) => v + b.demand_mw, 0).toFixed(1) + " MW";
  await expect(
    page
      .locator(".intel-inline-stats > span")
      .filter({ hasText: "Simulated demand" })
      .locator("strong"),
  ).toHaveText(expectedDemand);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await map.focus();
  const beforePan = await map.getAttribute("viewBox");
  await map.press("ArrowRight");
  await expect(map).not.toHaveAttribute("viewBox", beforePan);
  await shot("desktop-selected-state");
  await page
    .getByRole("link", { name: "Open selected grid dashboard ↗", exact: true })
    .click();
  await expect(page.locator("#dashboard-source")).toHaveValue("INDIA");
  await expect(
    page.getByRole("heading", { name: "Grid control dashboard", exact: true }),
  ).toBeVisible();
  expect(await page.locator(".intel-stat").count()).toBe(8);
  const demandCard = page
    .locator(".intel-stat")
    .filter({ has: page.getByText("Demand", { exact: true }) });
  await expect(demandCard.locator("strong")).toHaveText(
    regionalAssets.reduce((v, b) => v + b.demand_mw, 0).toFixed(2) + " MW",
  );
  await shot("desktop-dashboard");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile-dashboard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Change geographic selection ↗", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "India grid intelligence", exact: true }),
  ).toBeVisible();
  await page.getByPlaceholder("Find state or asset…").fill("Delhi");
  await page
    .getByRole("button", { name: "Delhi Dadri / NCR Super Hub", exact: true })
    .click();
  const trip = page.locator("button").filter({ hasText: /^Trip$/ });
  expect(await trip.count()).toBeGreaterThan(0);
  const action = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/gridzero/session/action") &&
      r.request().method() === "POST",
  );
  await trip.first().click();
  const changed = await (await action).json();
  expect(changed.session.network_id).toBe("INDIA_GRID_59");
  expect(changed.session.kpis.active_faults_count).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Repair", exact: true }).first(),
  ).toBeVisible();
  await shot("mobile-national-contingency");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "PASS: geographic state zoom, keyboard pan, independent national action, dashboard selection and exact metrics, mobile layout, WebGL disabled.",
  );
} finally {
  await browser.close();
}

import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const dir = "../../docs/screenshots/case-study";
fs.mkdirSync(dir, { recursive: true });
const shot = async (name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
};
try {
  await page.goto(base);
  await page
    .getByRole("heading", { name: "How connected is our power grid?" })
    .waitFor();
  await page.getByRole("button", { name: "Guided Demo", exact: true }).click();
  await page.getByPlaceholder("Search a substation or state…").fill("Delhi");
  await page.locator(".search-results button").first().click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await page.getByPlaceholder("Search a substation or state…").fill("Delhi");
  await page.locator(".search-results button").first().click();
  await shot("desktop-explore");
  await page
    .getByText("Inspect simulated contingencies", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset national model", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate corridor trip", exact: true })
    .first()
    .waitFor({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Simulate corridor trip", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Repair and reclose", exact: true })
    .first()
    .waitFor({ timeout: 60000 });
  await page.getByLabel("Map layer").selectOption("Incidents");
  await shot("desktop-contingency");

  await page.getByRole("link", { name: "Explore a local outage →" }).click();
  const step = (name) => page.getByRole("button", { name, exact: true });
  if (await step("Find Restoration Plan").count())
    throw Error("Plan offered before the emergency");
  await step("Start Emergency").click();
  await expect(step("Investigate Outage")).toBeEnabled({ timeout: 120000 });
  const faultState = await (
    await page.request.get(base + "/api/gridzero/session")
  ).json();
  for (const id of ["LINE-02-03", "LINE-03-04"]) {
    if (
      !faultState.session.power_flow.lines.some(
        (l) => l.line_id === id && l.status === "OUT_OF_SERVICE",
      )
    )
      throw Error("Fault missing from physical model: " + id);
  }
  await shot("desktop-outage");
  await step("Investigate Outage").click();
  await expect(step("Find Restoration Plan")).toBeEnabled({ timeout: 120000 });
  await step("Find Restoration Plan").click();
  await expect(step("Apply Plan")).toBeEnabled({ timeout: 120000 });
  await page
    .getByText("Why did the system choose this?", { exact: true })
    .click();
  await page.getByRole("heading", { name: "BFS · Computed trace" }).waitFor();
  await page
    .getByText("Why did the system choose this?", { exact: true })
    .click();
  await shot("desktop-plan");
  await step("Apply Plan").click();
  await page
    .getByRole("link", { name: "Evaluate the result →" })
    .first()
    .waitFor({ timeout: 120000 });
  await shot("desktop-restored");
  await step("2D Network").click();
  await page.getByTestId("grid-2d-fallback").waitFor();
  if (await step("3D City").isEnabled()) await step("3D City").click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas") ||
      document.querySelector('[data-testid="grid-2d-fallback"]'),
    null,
    { timeout: 30000 },
  );
  await shot("desktop-city");
  await page.getByRole("link", { name: "Evaluate the result →" }).first().click();
  await page.getByText("AC feasible", { exact: true }).waitFor();
  await shot("desktop-results");
  await page.getByRole("combobox").selectOption("GRAPH_GREEDY");
  await page.getByText("Not feasible", { exact: true }).waitFor();
  await page.getByRole("combobox").selectOption("PRIORITY_GREEDY");
  await page.reload();
  await page.getByText("AC feasible", { exact: true }).waitFor();

  console.log("RESULTS", await page.locator(".journey").innerText());
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mobile-results");
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Results mobile overflow");
  await page.getByRole("link", { name: "Restore", exact: true }).click();
  await shot("mobile-restore");
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Restore mobile overflow");
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await shot("mobile-explore");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw Error("Mobile overflow");
  await page.getByText("Technical Lab", { exact: true }).click();
  await page
    .getByRole("link", { name: "CAPER inspector", exact: true })
    .waitFor();
  for (const link of await page.locator(".more-nav a").all()) {
    const href = await link.getAttribute("href");
    const response = await page.request.get(base + href);
    if (!response.ok()) throw Error("Technical Lab route failed: " + href);
  }
  console.log(
    "PASS journey, guarded actions, real CAPER/AC application, comparison, map search, lab access, mobile layout",
    JSON.stringify(errors),
  );
  if (errors.length) throw Error(errors.join("; "));
} finally {
  await browser.close();
}

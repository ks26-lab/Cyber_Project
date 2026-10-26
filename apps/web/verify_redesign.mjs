import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const out = new URL("../../docs/screenshots/redesign/", import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: [
    "--use-gl=angle",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1512, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => { errors.push(e.message); console.log("BROWSER ERROR", page.url(), e.message); });
try {
  for (const [route, name] of [
    ["/", "overview"],
    ["/simulation", "simulation"],
    ["/algorithms", "algorithms"],
    ["/research", "research"],
    ["/national-grid", "india-grid"],
    ["/cyber-lab", "cyber-lab"],
    ["/demo", "demo"],
  ]) {
    const res = await page.goto("http://127.0.0.1:3000" + route);
    expect(res.status()).toBe(200);
    await page.waitForTimeout(1800);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "/simulation") {
      await page.getByRole("tab", { name: "Electrical", exact: true }).click();
      await expect(
        page.getByText("Disturbance & Constraint Controls"),
      ).toBeVisible();
      const response = page.waitForResponse(
        (r) =>
          r.url().includes("/api/gridzero/session/action") &&
          r.request().method() === "POST",
      );
      const fault = page
        .getByRole("button")
        .filter({ hasText: "LINE-02-03" })
        .first();
      await fault.click();
      const r = await response;
      expect(r.ok()).toBeTruthy();
      await page.getByRole("tab", { name: "Summary", exact: true }).click();
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await page.waitForTimeout(1000);
    }
    if (route === "/algorithms") {
      await page
        .getByLabel("Algorithm", { exact: true })
        .selectOption("DIJKSTRA");
      await page.waitForTimeout(800);
      await expect(page.getByText("Pseudocode", { exact: true })).toBeVisible();
    }
    if (route === "/national-grid") {
      await expect(
        page.getByRole("button", {
          name: "Inspect Delhi Dadri / NCR Super Hub",
          exact: true,
        }),
      ).toBeVisible();
      await page.getByLabel("Region", { exact: true }).selectOption("SR");
      expect(await page.locator("circle.node-dot").count()).toBeGreaterThan(0);
      expect(await page.locator("circle.node-dot").count()).toBeLessThan(59);
      await page.getByLabel("Region", { exact: true }).selectOption("ALL");
      await page
        .getByRole("button", {
          name: "Inspect Delhi Dadri / NCR Super Hub",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await page.getByRole("button", { name: "Fit", exact: true }).click();
    }
    await page.screenshot({
      path: new URL(name + ".png", out).pathname,
      fullPage: true,
    });
    console.log("PASS", route);
  }
  await page.goto("http://127.0.0.1:3000/national-grid");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeHidden();
  await page.screenshot({ path: new URL("presentation.png", out).pathname });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/simulation",
    "/national-grid",
    "/research",
    "/algorithms",
    "/cyber-lab",
    "/demo",
  ]) {
    await page.goto("http://127.0.0.1:3000" + route);
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow, route + " horizontal overflow").toBeFalsy();
    await page.screenshot({
      path: new URL("mobile-" + (route.slice(1) || "overview") + ".png", out)
        .pathname,
    });
  }
  expect(errors).toEqual([]);
  console.log("PASS presentation, mobile layouts, no browser errors");
} finally {
  await browser.close();
}

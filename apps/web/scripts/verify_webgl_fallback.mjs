import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.GRIDSEC_URL || "http://127.0.0.1:3000";
const out = new URL(
  "../../../docs/screenshots/webgl-fallback/",
  import.meta.url,
);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--disable-webgl", "--disable-webgl2", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) =>
  errors.push({ route: page.url(), error: error.message }),
);
await page.addInitScript(() => {
  window.__graphicsContextAttempts = 0;
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (String(type).includes("webgl")) window.__graphicsContextAttempts++;
    return original.call(this, type, ...args);
  };
});
try {
  await page.goto(`${base}/simulation`);
  await expect(page.getByTestId("grid-2d-fallback")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "3D City", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.locator('[data-graphics-status="unavailable"]'),
  ).toBeVisible();
  const probes = await page.evaluate(() => window.__graphicsContextAttempts);
  expect(probes).toBe(1);
  // An explicit retry probes once more and stays in 2D without looping.
  await page.getByRole("button", { name: "Try 3D Again", exact: true }).click();
  await expect(page.getByTestId("grid-2d-fallback")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__graphicsContextAttempts)).toBe(2);
  const diagram = page.getByTestId("feeder-diagram");
  await diagram
    .getByRole("button", { name: /Inspect .*Hospital/i })
    .first()
    .click();
  await expect(
    page.getByText("Asset Telemetry Inspector", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="feeder-diagram"] .context-strip'),
  ).toContainText(/Hospital/i);
  await page
    .getByRole("button", { name: "Zoom network in", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Zoom network out", exact: true })
    .click();
  await page.getByRole("tab", { name: "Electrical", exact: true }).click();
  await page
    .getByLabel("Substation supply ceiling (MW)", { exact: true })
    .fill("8");
  await page
    .getByRole("button", { name: "Enforce Limit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Uncap", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Uncap", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Uncap", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Summary", exact: true }).click();
  await page.screenshot({
    path: new URL("simulation-desktop.png", out).pathname,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL("simulation-mobile.png", out).pathname,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const routes = [
    "/",
    "/algorithms",
    "/algorithms/caper",
    "/sandbox",
    "/cyber-lab",
    "/challenge",
    "/missions",
    "/missions/MISSION_01",
    "/dashboard",
    "/national-grid",
    "/demo",
    "/docs",
    "/restore",
    "/results",
  ];
  for (const route of routes) {
    const response = await page.goto(base + route);
    expect(response.status(), route).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 30000 });
    if (
      [
        "/algorithms",
        "/algorithms/caper",
        "/sandbox",
        "/cyber-lab",
        "/challenge",
        "/missions/MISSION_01",
      ].includes(route)
    ) {
      await expect(page.getByTestId("grid-2d-fallback")).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(0);
      // The failed device is remembered in sessionStorage, even on document navigation.
      expect(
        await page.evaluate(() => window.__graphicsContextAttempts),
        route,
      ).toBe(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} mobile overflow`,
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  expect(errors, "Uncaught client errors with WebGL disabled").toEqual([]);
  console.log(
    "PASS: WebGL disabled — interactive 2D selection/zoom, no renderer initialization, cached failure, all major routes, responsive layouts.",
  );
} finally {
  await browser.close();
}

// Exercise loss after a renderer exists, separately from the disabled-device case.
const graphicsBrowser = await chromium.launch({
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
const graphicsPage = await graphicsBrowser.newPage({
  viewport: { width: 1280, height: 900 },
});
const graphicsErrors = [];
graphicsPage.on("pageerror", (error) =>
  graphicsErrors.push(error.stack || error.message),
);
try {
  await graphicsPage.goto(`${base}/simulation`);
  await graphicsPage.waitForFunction(
    () =>
      document.querySelector("canvas") ||
      Array.from(document.querySelectorAll('[role="status"]')).some((el) =>
        el.textContent?.includes("3D graphics are unavailable"),
      ),
  );
  if (await graphicsPage.locator("canvas").count()) {
    await graphicsPage.waitForTimeout(1000);
    await graphicsPage
      .getByRole("button", { name: "2D Network", exact: true })
      .click();
    await expect(graphicsPage.locator("canvas")).toHaveCount(0);
    await graphicsPage.waitForTimeout(1000);
    expect(
      graphicsErrors,
      "3D labels/canvas unmount without DOM cleanup errors",
    ).toEqual([]);
    await graphicsPage
      .getByRole("button", { name: "3D City", exact: true })
      .click();
    await expect(graphicsPage.locator("canvas")).toBeVisible();
    await graphicsPage.waitForTimeout(1000);
    const loseContext = () =>
      graphicsPage.locator("canvas").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2");
        const extension = gl?.getExtension("WEBGL_lose_context");
        if (extension) {
          extension.loseContext();
          return "device context loss";
        }
        canvas.dispatchEvent(
          new Event("webglcontextlost", { cancelable: true }),
        );
        return "context-loss event";
      });
    const loss = await loseContext();
    await expect(graphicsPage.getByTestId("grid-2d-fallback")).toBeVisible();
    await expect(graphicsPage.locator("canvas")).toHaveCount(0);
    await expect(
      graphicsPage.getByRole("button", { name: "Try 3D Again", exact: true }),
    ).toBeVisible();
    // A single loss is treated as transient: the next document tries 3D again.
    await graphicsPage.reload();
    await expect(graphicsPage.locator("canvas")).toBeVisible();
    await graphicsPage.waitForTimeout(800);
    await loseContext();
    await expect(graphicsPage.getByTestId("grid-2d-fallback")).toBeVisible();
    // A repeated loss is remembered across reloads.
    await graphicsPage.reload();
    await expect(graphicsPage.getByTestId("grid-2d-fallback")).toBeVisible();
    await expect(
      graphicsPage.getByRole("button", { name: "3D City", exact: true }),
    ).toBeDisabled();
    await expect(graphicsPage.locator("canvas")).toHaveCount(0);
    // The user can explicitly try again.
    await graphicsPage
      .getByRole("button", { name: "Try 3D Again", exact: true })
      .click();
    await expect(graphicsPage.locator("canvas")).toBeVisible();
    await graphicsPage.waitForTimeout(800);
    expect(
      await graphicsPage.locator(".city-label").count(),
      "No floating labels outside the renderer overlay",
    ).toBe(
      await graphicsPage
        .locator('[data-testid="city-label-overlay"] .city-label')
        .count(),
    );
    console.log(
      `PASS: runtime ${loss} switches to 2D; one loss retries on reload, a repeated loss is remembered, and Try 3D Again recovers.`,
    );
  } else {
    const failureReason = await graphicsPage
      .locator('[data-graphics-status="unavailable"]')
      .getAttribute("data-graphics-failure");
    expect(
      failureReason,
      "A renderer failure after successful preflight must not be mistaken for unavailable hardware",
    ).toMatch(/could not create a WebGL2 context|Creating a WebGL2 context failed/);
    console.log(
      "SKIP runtime context-loss exercise: this host cannot create WebGL2. Disabled-WebGL acceptance still passed.",
    );
  }
  await graphicsPage.waitForTimeout(1000);
  expect(
    graphicsErrors,
    "Supported 3D rendering, unmount, remount and context recovery must not produce client errors",
  ).toEqual([]);
} finally {
  await graphicsBrowser.close();
}

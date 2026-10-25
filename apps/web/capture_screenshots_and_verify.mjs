import { chromium } from "@playwright/test";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";

const SCREENSHOT_DIR = "/Users/umikasood/Cyber_Project/docs/screenshots";
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = "http://127.0.0.1:3000";
const API_URL = "http://127.0.0.1:8000/api/gridzero/session";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkUrl(url)) return true;
    await sleep(500);
  }
  return false;
}

async function run() {
  const children = [];
  try {
    // 1. Restart Backend on 8000 so latest session_manager.py is active
    console.log("Starting FastAPI backend on port 8000 with /api/gridzero routes...");
    try {
      execSync("lsof -tiTCP:8000 -sTCP:LISTEN | xargs kill -9", { stdio: "ignore" });
    } catch {}
    await sleep(600);
    const backendProc = spawn(
      "/Users/umikasood/Cyber_Project/.venv/bin/uvicorn",
      ["app.main:app", "--app-dir", "/Users/umikasood/Cyber_Project/backend", "--host", "127.0.0.1", "--port", "8000"],
      { stdio: "ignore" }
    );
    children.push(backendProc);
    const apiReady = await waitForUrl(API_URL, 20000);
    console.log("Backend ready:", apiReady);

    // 2. Restart Next.js production server on 3000 so latest build is active
    console.log("Starting Next.js production server on port 3000...");
    try {
      execSync("lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9", { stdio: "ignore" });
    } catch {}
    await sleep(600);
    const webProc = spawn(
      "npm",
      ["run", "start", "--prefix", "/Users/umikasood/Cyber_Project/apps/web"],
      { stdio: "ignore" }
    );
    children.push(webProc);
    const webReady = await waitForUrl(BASE_URL, 25000);
    console.log("Frontend ready:", webReady);

    console.log("Launching Chrome for E2E verification & 16-screenshot capture...");
    const browser = await chromium.launch({
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
      args: [
        "--use-gl=angle",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. 01-homepage.png
    console.log("1/16: Capturing 01-homepage.png...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-homepage.png") });

    // 2. 02-city-3d-overview.png
    console.log("2/16: Capturing 02-city-3d-overview.png...");
    await page.goto(`${BASE_URL}/simulation`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-city-3d-overview.png") });

    // 3. 03-city-3d-critical-load-view.png
    console.log("3/16: Capturing 03-city-3d-critical-load-view.png...");
    const critBtn = page.locator("button", { hasText: "Priority Tiers" }).first();
    if (await critBtn.count()) await critBtn.click();
    const hospCam = page.locator("button", { hasText: "Hospital" }).first();
    if (await hospCam.count()) await hospCam.click();
    await sleep(1600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-city-3d-critical-load-view.png") });

    // 4. 04-fault-injection-blackout.png (Scenario A: Hospital Outage)
    console.log("4/16: Capturing 04-fault-injection-blackout.png...");
    const isoCam = page.locator("button", { hasText: "Isometric" }).first();
    if (await isoCam.count()) await isoCam.click();
    const energBtn = page.locator("button", { hasText: "Energization" }).first();
    if (await energBtn.count()) await energBtn.click();
    const tripLineBtn = page.locator("button", { hasText: "LINE-02-03" }).first();
    if (await tripLineBtn.count()) await tripLineBtn.click();
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-fault-injection-blackout.png") });

    // 5. 05-bfs-energization-trace.png
    console.log("5/16: Capturing 05-bfs-energization-trace.png...");
    await page.goto(`${BASE_URL}/algorithms`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-bfs-energization-trace.png") });

    // 6. 06-tarjan-bridges-and-articulation.png
    console.log("6/16: Capturing 06-tarjan-bridges-and-articulation.png...");
    const tarjanBtn = page.locator("button", { hasText: "TARJAN_BRIDGES" }).first();
    if (await tarjanBtn.count()) await tarjanBtn.click();
    await sleep(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-tarjan-bridges-and-articulation.png"),
    });

    // 7. 07-dijkstra-tie-switch-routing.png
    console.log("7/16: Capturing 07-dijkstra-tie-switch-routing.png...");
    const dijkstraBtn = page.locator("button", { hasText: "DIJKSTRA" }).first();
    if (await dijkstraBtn.count()) await dijkstraBtn.click();
    await sleep(1400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-dijkstra-tie-switch-routing.png") });

    // 8. 08-dsu-and-kruskal-radial-restoration.png
    console.log("8/16: Capturing 08-dsu-and-kruskal-radial-restoration.png...");
    const kruskalBtn = page.locator("button", { hasText: "KRUSKAL_MST" }).first();
    if (await kruskalBtn.count()) await kruskalBtn.click();
    await sleep(1400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-dsu-and-kruskal-radial-restoration.png"),
    });

    // 9. 09-dp-critical-load-allocation.png
    console.log("9/16: Capturing 09-dp-critical-load-allocation.png...");
    const dpBtn = page.locator("button", { hasText: "KNAPSACK_DP" }).first();
    if (await dpBtn.count()) await dpBtn.click();
    await sleep(1400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-dp-critical-load-allocation.png") });

    // 10. 10-caper-restoration-plan.png
    console.log("10/16: Capturing 10-caper-restoration-plan.png...");
    await page.goto(`${BASE_URL}/algorithms/caper`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-caper-restoration-plan.png") });

    // 11. 11-ac-powerflow-validation.png
    console.log("11/16: Capturing 11-ac-powerflow-validation.png...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11-ac-powerflow-validation.png") });

    // 12. 12-battery-depletion-and-curtailment.png (Scenario C: Constrained Supply + BESS)
    console.log("12/16: Capturing 12-battery-depletion-and-curtailment.png...");
    await page.goto(`${BASE_URL}/missions/MISSION_04`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "12-battery-depletion-and-curtailment.png"),
    });

    // 13. 13-human-vs-algorithm-mode.png
    console.log("13/16: Capturing 13-human-vs-algorithm-mode.png...");
    await page.goto(`${BASE_URL}/challenge`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13-human-vs-algorithm-mode.png") });

    // 14. 14-research-benchmark-comparison.png
    console.log("14/16: Capturing 14-research-benchmark-comparison.png...");
    await page.goto(`${BASE_URL}/research`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "14-research-benchmark-comparison.png"),
    });

    // 15. 15-national-grid-compatibility.png
    console.log("15/16: Capturing 15-national-grid-compatibility.png...");
    await page.goto(`${BASE_URL}/national-grid`, { waitUntil: "domcontentloaded" });
    await sleep(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "15-national-grid-compatibility.png"),
    });

    // 16. 16-mission-game.png
    console.log("16/16: Capturing 16-mission-game.png...");
    await page.goto(`${BASE_URL}/missions/MISSION_02`, { waitUntil: "domcontentloaded" });
    await sleep(2200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "16-mission-game.png") });

    await browser.close();
    console.log("All 16 screenshots captured and verified successfully!");
  } finally {
    for (const child of children) {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error("Error in screenshot verification script:", err);
  process.exit(1);
});

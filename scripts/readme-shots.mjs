// Captures the README screenshots into docs/screens.
// node scripts/readme-shots.mjs [baseUrl]   (default: the deployed demo)
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "https://chairfill-app.vercel.app";
const out = "docs/screens";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(`${base}/schedule`, { waitUntil: "networkidle" });
await desk.evaluate(() => localStorage.clear());
await desk.reload({ waitUntil: "networkidle" });
await desk.waitForTimeout(800);
await desk.screenshot({ path: `${out}/schedule.png` });

await desk.click("aside >> text=Fill this slot");
await desk.waitForTimeout(900);
await desk.screenshot({ path: `${out}/fill-ranked.png` });
await desk.click('[data-testid="send-offers"]');
await desk.waitForTimeout(7600);
await desk.screenshot({ path: `${out}/fill-live.png` });
await desk.waitForSelector('[data-testid="stage-slot"][data-state="booked"]', { timeout: 40000 });
await desk.waitForTimeout(1500);
await desk.screenshot({ path: `${out}/fill-done.png` });
await desk.click("text=Done");
await desk.goto(`${base}/reports`, { waitUntil: "networkidle" });
await desk.waitForTimeout(800);
await desk.screenshot({ path: `${out}/reports.png` });
await desk.goto(`${base}/waitlist`, { waitUntil: "networkidle" });
await desk.waitForTimeout(800);
await desk.screenshot({ path: `${out}/waitlist.png` });

const phoneCtx = await browser.newContext({ ...devices["iPhone 13"] });
const phone = await phoneCtx.newPage();
await phone.goto(`${base}/patient`, { waitUntil: "networkidle" });
await phone.waitForURL(/\/o\//);
await phone.waitForTimeout(900);
await phone.screenshot({ path: `${out}/patient-offer.png` });
await phone.click('[data-testid="patient-yes"]');
await phone.waitForSelector('[data-testid="patient-confirmed"]', { timeout: 30000 });
await phone.waitForTimeout(5000);
await phone.screenshot({ path: `${out}/patient-booked.png` });

await browser.close();
console.log("saved to", out);

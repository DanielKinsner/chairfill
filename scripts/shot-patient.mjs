// Dev helper: the patient flow at phone size, fresh demo data.
import { chromium, devices } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/patient", { waitUntil: "networkidle" });
await page.waitForURL(/\/o\//);
await page.waitForTimeout(1200);
console.log("url", page.url());
await page.screenshot({ path: `${out}/p1-offer.png`, fullPage: true });
await page.click('[data-testid="patient-yes"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/p2-sending.png`, fullPage: true });
await page.waitForSelector('[data-testid="patient-confirmed"]', { timeout: 20000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}/p3-confirmed.png`, fullPage: true });
await browser.close();

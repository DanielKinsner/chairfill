// Dev helper: the fill screen at 390px, before and during a run.
import { chromium, devices } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${base}/schedule`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/schedule?fill=a-c1`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/mf-pre.png` });
await page.click('[data-testid="send-offers"]');
await page.waitForTimeout(14000);
await page.screenshot({ path: `${out}/mf-run.png` });
await browser.close();

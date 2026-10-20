// Dev helper: desk screens at 390px, checking for sideways scroll.
import { chromium, devices } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "https://chairfill-app.vercel.app";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
for (const path of ["schedule", "waitlist", "reports", "settings", "setup"]) {
  await page.goto(`${base}/${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(path, "horizontal overflow px:", overflow);
  await page.screenshot({ path: `${out}/m-${path}.png` });
}
await page.goto(`${base}/schedule?fill=a-c1`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/m-fill.png` });
await browser.close();

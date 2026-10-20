// Dev helper: walk the setup wizard and run the test fill.
import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/s1.png` });
for (let i = 2; i <= 7; i++) {
  console.log("step", i, await page.locator("h1").first().textContent());
  await page.click('[data-testid="wizard-next"]');
  await page.waitForTimeout(400);
  if (i === 5) await page.screenshot({ path: `${out}/s5.png` });
}
await page.click('[data-testid="start-test-fill"]');
await page.waitForSelector('[data-testid="test-done"]', { timeout: 20000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/s7-done.png` });
await page.click('[data-testid="finish-setup"]');
await page.waitForURL(/schedule/);
console.log("finished at", page.url());
await browser.close();

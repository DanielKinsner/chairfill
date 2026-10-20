// Dev helper: screenshots of a full fill run at several moments.
import { chromium } from "@playwright/test";
const out = process.argv[2];
const strategy = process.argv[3] ?? "batch";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/schedule", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.click("aside >> text=Fill this slot");
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/f0-pre.png` });
if (strategy === "one") await page.click("text=One at a time");
await page.click('[data-testid="send-offers"]');
const marks = [1500, 5000, 9000, 12000, 16000];
let last = 0;
for (const [i, m] of marks.entries()) {
  await page.waitForTimeout(m - last);
  last = m;
  await page.screenshot({ path: `${out}/f${i + 1}-${m}.png` });
}
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}/f9-end.png` });
await page.click("text=Done").catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/f10-schedule.png` });
await browser.close();

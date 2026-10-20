// Dev helper: full-resolution screenshots of the running app.
// node scripts/shot.mjs <path> <outfile> [width] [height] [clickSelector...]
import { chromium } from "@playwright/test";

const [, , path = "/schedule", out = "shot.png", w = "1440", h = "900", ...clicks] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
// Git Bash rewrites a leading "/" into a Windows path, so accept "schedule" as well as "/schedule".
await page.goto(`http://localhost:3000/${path.replace(/^.*?\/(?=[a-z])/i, "").replace(/^\//, "")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
for (const c of clicks) {
  if (c.startsWith("wait:")) await page.waitForTimeout(Number(c.slice(5)));
  else await page.click(c);
  await page.waitForTimeout(400);
}
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("saved", out);

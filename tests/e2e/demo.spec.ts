import { devices, expect, test } from "@playwright/test";

// The 90-second demo script from DEMO.md, end to end, on fresh demo data.

test("the 90-second demo", async ({ page, browser }) => {
  await page.goto("/schedule");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 1. The schedule: four open chairs this week, the Tuesday cleaning at the top.
  const rail = page.getByRole("complementary", { name: "Open chairs and providers" });
  await expect(rail.getByText("Tue 2:00 PM")).toBeVisible();
  await expect(page.getByText("4 chairs, $1,860")).toBeVisible();

  // 2. Fill it. The ranked list explains itself.
  await rail.getByRole("button", { name: "Fill this slot" }).first().click();
  const dialog = page.getByRole("dialog", { name: /Fill Tuesday, October 20 at 2:00 PM/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("rule-summary")).toContainText("move-ups, procedure match, urgency, preferred times, longest wait");
  const names = dialog.getByTestId("candidate").locator("p.truncate");
  await expect(names.nth(0)).toContainText("Gail Hendricks");
  await expect(names.nth(1)).toContainText("Rosa Delgado");
  await expect(names.nth(2)).toContainText("Kevin Nakamura");

  // 3. Send. Offers fly out, Rosa's YES lands, the slot turns teal, the others hear it's taken.
  await dialog.getByTestId("send-offers").click();
  await expect(dialog.getByTestId("stage-slot")).toHaveAttribute("data-state", "running");
  await expect(dialog.getByTestId("stage-slot")).toHaveAttribute("data-state", "booked", { timeout: 45_000 });
  await expect(dialog.getByTestId("stage-slot")).toContainText("Rosa Delgado");
  await expect(dialog.getByTestId("fill-summary")).toContainText("$180");
  await expect(dialog.getByText(`"It's taken" texted to Gail and Kevin`)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  // 4. Back on the schedule: one fewer open chair, ChairFill's total went up.
  await expect(page.getByText("3 chairs, $1,680")).toBeVisible();

  // 5. Reports moved: 15 chairs, $4,100.
  await page.getByRole("link", { name: "Reports" }).first().click();
  await expect(page.getByTestId("kpi-filled")).toHaveText("15");
  await expect(page.getByTestId("kpi-recovered")).toHaveText("$4,100");
  await expect(page.getByTestId("fill-log-row").first()).toContainText("Rosa Delgado");

  // 6. The explainer is one click away.
  await page.getByRole("button", { name: /How ChairFill works/ }).click();
  await expect(page.locator('video[src="/explainer.mp4"]')).toBeVisible();
  await page.keyboard.press("Escape");

  // 7. The patient's side, on a phone, fresh browser: tap YES, get the confirmation.
  const phone = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  const p = await phone.newPage();
  await p.goto("/patient");
  await p.waitForURL(/\/o\/[A-Z0-9]{4}/);
  await expect(p.getByRole("heading", { level: 1 })).toContainText("Hi Rosa, a cleaning just opened up today.");
  await p.getByTestId("patient-yes").click();
  await expect(p.getByTestId("patient-confirmed")).toContainText("You're booked, Rosa.", { timeout: 30_000 });
  await expect(p.getByRole("button", { name: "Add to calendar" })).toBeVisible();
  await phone.close();

  // 8. The setup wizard finishes with a test fill.
  await page.goto("/setup");
  for (let i = 0; i < 6; i++) await page.getByTestId("wizard-next").click();
  await page.getByTestId("start-test-fill").click();
  await expect(page.getByTestId("test-done")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("finish-setup").click();
  await expect(page).toHaveURL(/\/schedule/);
});

test("a move-up fills the crown slot and opens their old time for the next fill", async ({ page }) => {
  await page.goto("/schedule");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/schedule?fill=a-c2");
  const dialog = page.getByRole("dialog", { name: /Fill Wednesday, October 21 at 10:00 AM/ });
  await expect(dialog.getByTestId("candidate").first()).toContainText("Move-up from Wed, Oct 28 8:00 AM");
  await dialog.getByTestId("send-offers").click();
  await expect(dialog.getByTestId("stage-slot")).toHaveAttribute("data-state", "booked", { timeout: 45_000 });
  await expect(dialog.getByTestId("stage-slot")).toContainText("Luis Paredes");
  // Dennis said yes after Luis did: logged, not double-booked.
  await expect(dialog.getByText("Dennis said yes after it was filled")).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole("button", { name: "Done" }).click();
  // Luis's old Wednesday 8:00 AM is open now, and the desk is offered the next fill.
  await page.getByRole("link", { name: "Fill it" }).click();
  await expect(page.getByRole("dialog", { name: /Fill Wednesday, October 28 at 8:00 AM/ })).toBeVisible();
  await expect(page.getByText("Luis Paredes moved up")).toBeVisible();
});

test("share image and 404 are in place", async ({ request, page }) => {
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  await page.goto("/not-a-real-page");
  await expect(page.getByRole("heading", { name: "This page isn't on the schedule." })).toBeVisible();
});

import { describe, expect, it } from "vitest";
import history from "@/data/history.json";
import { monthReport, weekdaysElapsed, weekdaysInMonth } from "@/lib/reports";
import type { FillRecord } from "@/lib/types";

const fills = history.fills as FillRecord[];
const now = "2026-10-20T09:41:00-07:00";

describe("October report from the seed", () => {
  const r = monthReport(fills, "2026-10", now);
  it("matches the explainer video: 14 chairs, $3,920", () => {
    expect(r.filled).toHaveLength(14);
    expect(r.recovered).toBe(3920);
  });
  it("revenue is slot value times fills, by visit type", () => {
    const sum = r.byType.reduce((s, t) => s + t.value, 0);
    expect(sum).toBe(3920);
    expect(r.byType[0]).toMatchObject({ typeId: "crown", fills: 1, value: 1200 });
    expect(r.byType.find((t) => t.typeId === "cleaning")).toMatchObject({ fills: 6, value: 1080 });
  });
  it("fill rate counts the openings nobody took", () => {
    expect(r.unfilled).toHaveLength(5);
    expect(r.fillRate).toBeCloseTo(14 / 19);
  });
  it("averages minutes to fill and offers per fill", () => {
    expect(r.avgMinutes).toBeCloseTo((6 + 14 + 9 + 12 + 4 + 31 + 7 + 22 + 8 + 11 + 3 + 10 + 11 + 12) / 14);
    expect(r.offersPerFill).toBeCloseTo(43 / 14);
  });
  it("buckets every week of the month, including empty ones", () => {
    expect(r.byWeek.map((w) => w.week)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(r.byWeek.at(-1)?.fills).toBe(0);
  });
  it("projects the month from weekdays elapsed", () => {
    expect(weekdaysInMonth("2026-10")).toBe(22);
    expect(weekdaysElapsed("2026-10", now)).toBe(14);
    expect(r.pace).toBe(Math.round((3920 / 14) * 22));
  });
});

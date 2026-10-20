import { describe, expect, it } from "vitest";
import { windowMatch } from "@/lib/ranking";
import { rank } from "./fixtures";

const names = (r: ReturnType<typeof rank>) => r.ranked.map((c) => c.name);

describe("rankCandidates on the seeded cancellations", () => {
  it("Tue 2:00 PM cleaning: the move-up goes first, then Rosa (soon), then Kevin (longest full-match wait)", () => {
    expect(names(rank("a-c1")).slice(0, 3)).toEqual(["Gail Hendricks", "Rosa Delgado", "Kevin Nakamura"]);
  });

  it("every one of the six cancellations has at least three textable candidates", () => {
    for (const id of ["a-c1", "a-c2", "a-c3", "a-c4", "a-c5", "a-c6"]) {
      expect(rank(id).ranked.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("procedure match beats everything: exact matches come before visits that merely fit", () => {
    const r = rank("a-c1");
    const firstFit = r.ranked.findIndex((c) => c.procedureMatch === "fits");
    const lastExact = r.ranked.map((c) => c.procedureMatch).lastIndexOf("exact");
    expect(firstFit).toBeGreaterThan(lastExact);
  });

  it("crown slot: Luis (move-up), Patricia (urgent), Dennis (soon, longer wait than Joanne)", () => {
    expect(names(rank("a-c2")).slice(0, 4)).toEqual(["Luis Paredes", "Patricia Oyelaran", "Dennis Hruby", "Joanne Pak"]);
  });

  it("root canal slot: two urgent patients first, longest wait breaks the tie", () => {
    expect(names(rank("a-c5")).slice(0, 2)).toEqual(["Ray Gutierrez", "Brianna Castillo"]);
  });

  it("24-hour cooldown keeps yesterday's offers out, with a reason the desk can read", () => {
    const r = rank("a-c4");
    const cooling = r.excluded.filter((e) => e.reason === "cooldown").map((e) => e.candidate.name);
    expect(cooling).toEqual(expect.arrayContaining(["Mei-Ling Cho", "Brandon Tull"]));
    expect(names(r)).not.toContain("Mei-Ling Cho");
  });

  it("cooldown is configurable: at 0 hours yesterday's people are back in", () => {
    expect(names(rank("a-c4", { cooldownHours: 0 }))).toContain("Mei-Ling Cho");
  });

  it("landline-only patients are listed as not textable instead of silently dropped", () => {
    const r = rank("a-c4");
    expect(r.excluded.find((e) => e.candidate.name === "Tyler Ambrose")?.reason).toBe("no-mobile");
  });

  it("two waitlist records with the same mobile only get one text", () => {
    const r = rank("a-c1");
    const brandts = r.ranked.filter((c) => c.phone === "(805) 555-0128");
    expect(brandts).toHaveLength(1);
    expect(r.excluded.some((e) => e.reason === "duplicate")).toBe(true);
  });

  it("rule order is configurable: waiting-first puts the longest wait on top of the waitlist", () => {
    const r = rank("a-c1", { ruleOrder: ["waiting", "procedure", "urgency", "window"], moveUpsFirst: false });
    expect(r.ranked[0].name).toBe("Haley Brooks"); // on the list since July
  });

  it("turning off move-ups-first ranks booked patients like everyone else", () => {
    const r = rank("a-c1", { moveUpsFirst: false });
    expect(r.ranked[0].name).not.toBe("Gail Hendricks");
  });
});

describe("windowMatch", () => {
  const slot = "2026-10-20T14:00:00-07:00"; // Tuesday 2 PM
  it("full when day and time both match", () => {
    expect(windowMatch({ preferredDays: ["tue"], windows: ["afternoon"] }, slot)).toBe("full");
  });
  it("partial when only one matches", () => {
    expect(windowMatch({ preferredDays: ["tue"], windows: ["morning"] }, slot)).toBe("partial");
    expect(windowMatch({ preferredDays: ["mon"], windows: ["afternoon"] }, slot)).toBe("partial");
  });
  it("none when neither matches", () => {
    expect(windowMatch({ preferredDays: ["fri"], windows: ["morning"] }, slot)).toBe("none");
  });
  it("'any' and empty preferences match everything", () => {
    expect(windowMatch({ preferredDays: [], windows: ["any"] }, slot)).toBe("full");
  });
});

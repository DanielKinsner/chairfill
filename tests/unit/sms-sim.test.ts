import { describe, expect, it } from "vitest";
import { createRun, injectReply, realDelayFor, runToEnd, FF_REAL_MS, FF_THRESHOLD_MS } from "@/lib/sms-sim";
import { offerCode } from "@/lib/offer-code";
import type { Candidate, SimScript } from "@/lib/types";
import { rank, script, templates } from "./fixtures";

function start(slotId: string, strategy: "batch" | "one", candidates?: Candidate[], scr: SimScript = script) {
  const cands = candidates ?? rank(slotId).ranked;
  const run = createRun({
    id: "r1",
    slotId,
    startedAt: "2026-10-20T09:41:00-07:00",
    candidates: cands,
    settings: { strategy, batchSize: 3, offerWindowMin: 10 },
    templates,
    slotLabel: { day: "today", time: "2:00 PM", procedure: "cleaning", provider: "Marisol" },
    practiceName: "Maple Family Dental",
    linkBase: "chairfill.test/o/",
    value: 180,
    codeFor: (k) => offerCode(slotId, k),
  });
  return { run, script: scr };
}

describe("three at once", () => {
  it("Tue 2:00 PM: Rosa's YES at 0:20 wins, the other two hear it's taken, the chair is booked", () => {
    const { run, script: s } = start("a-c1", "batch");
    expect(run.offers.map((o) => o.name)).toEqual(["Gail Hendricks", "Rosa Delgado", "Kevin Nakamura"]);
    const { run: done, effects } = runToEnd(run, s);
    expect(done.status).toBe("filled");
    expect(done.winner).toBe("w01");
    // Rosa's offer went out 350 ms after Gail's; she answers 20 s after it arrived.
    expect(done.filledAtT).toBe(20_350);
    const byName = Object.fromEntries(done.offers.map((o) => [o.firstName, o]));
    expect(byName.Kevin.status).toBe("taken");
    expect(byName.Kevin.messages.at(-1)?.kind).toBe("taken");
    // Gail said no at 0:45, after the chair was gone. Logged, nothing else happens.
    expect(byName.Gail.status).toBe("late-no");
    expect(byName.Rosa.messages.map((m) => m.kind)).toEqual(["offer", "reply", "confirm"]);
    expect(effects.filter((e) => e.type === "book")).toHaveLength(1);
    expect(effects.filter((e) => e.type === "offered")).toHaveLength(3);
  });

  it("merge fields are filled in the offer text", () => {
    const { run } = start("a-c1", "batch");
    const { run: done } = runToEnd(run, script);
    const offer = done.offers[1].messages[0].body;
    expect(offer).toContain("a cleaning opened up today at 2:00 PM with Marisol");
    expect(offer).toContain(`chairfill.test/o/${offerCode("a-c1", "w01")}`);
  });

  it("crown slot: Luis says yes first; Dennis's later YES is logged as too late", () => {
    const { run } = start("a-c2", "batch");
    const { run: done } = runToEnd(run, script);
    expect(done.winner).toBe("p-lparedes");
    expect(done.offers.find((o) => o.firstName === "Dennis")?.status).toBe("late-yes");
  });
});

describe("one at a time", () => {
  it("Gail declines at 0:45, Rosa is texted right after and says yes 20 s later", () => {
    const { run } = start("a-c1", "one");
    expect(run.offers).toHaveLength(1);
    const { run: done } = runToEnd(run, script);
    const rosa = done.offers.find((o) => o.key === "w01")!;
    expect(rosa.sentAt).toBe(45_000 + 1_200);
    expect(done.filledAtT).toBe(46_200 + 20_000);
    expect(done.offers.find((o) => o.key === "p-ghendricks")?.messages.map((m) => m.kind)).toEqual(["offer", "reply", "declined"]);
  });

  it("no reply means the 10-minute window runs out before the next person is texted", () => {
    const r = rank("a-c1").ranked;
    const kevin = r.find((c) => c.key === "w02")!;
    const rosa = r.find((c) => c.key === "w01")!;
    const { run } = start("a-c1", "one", [kevin, rosa]);
    const { run: done } = runToEnd(run, script);
    expect(done.offers[0].status).toBe("expired");
    expect(done.offers[1].sentAt).toBe(600_000 + 500);
    expect(done.filledAtT).toBe(600_500 + 20_000);
  });
});

describe("edge cases", () => {
  it("nobody says yes: the run ends unfilled and the desk is told", () => {
    const allNo: SimScript = { default: { reply: "no", afterSec: 5 }, patients: {} };
    const { run } = start("a-c1", "batch", rank("a-c1").ranked.slice(0, 4), allNo);
    const { run: done, effects } = runToEnd(run, allNo);
    expect(done.status).toBe("unfilled");
    expect(done.offers).toHaveLength(4); // batch of 3, then the last one
    expect(effects.some((e) => e.type === "unfilled")).toBe(true);
  });

  it("a live YES from the patient page beats the script", () => {
    const { run } = start("a-c1", "batch");
    const live = injectReply(run, "w02", "yes", 5_000, "YES");
    const { run: done } = runToEnd(live, script);
    expect(done.winner).toBe("w02");
    expect(done.filledAtT).toBe(5_000);
  });

  it("a YES after the chair is filled never double-books", () => {
    const { run } = start("a-c1", "batch");
    const { run: filled } = runToEnd(run, script);
    const late = injectReply(filled, "w02", "yes", filled.simT + 1_000);
    const { run: done, effects } = runToEnd(late, script);
    expect(done.winner).toBe("w01");
    expect(effects.filter((e) => e.type === "book")).toHaveLength(0);
    expect(done.offers.find((o) => o.key === "w02")?.status).toBe("late-yes");
  });
});

describe("demo playback pacing", () => {
  it("short gaps play at demo pace", () => {
    expect(realDelayFor(10_000, 2)).toEqual({ ms: 5_000, fastForward: false });
  });
  it("long quiet stretches (like a 10-minute offer window) fast-forward", () => {
    expect(realDelayFor(FF_THRESHOLD_MS + 1, 2)).toEqual({ ms: FF_REAL_MS, fastForward: true });
  });
});

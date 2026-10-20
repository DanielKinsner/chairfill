import { describe, expect, it } from "vitest";
import { renderTemplate, smsSegments, unknownFields } from "@/lib/templates";
import { daysBetween, fmtRange, fmtTime, isQuietHours, nextSendTime, smsDay, stamp } from "@/lib/time";
import { offerCode } from "@/lib/offer-code";

describe("templates", () => {
  it("fills known merge fields and leaves typos visible", () => {
    expect(renderTemplate("Hi {first_name}, {procdure}", { first_name: "Rosa" })).toBe("Hi Rosa, {procdure}");
    expect(unknownFields("Hi {first_name}, {procdure}")).toEqual(["procdure"]);
  });
});

describe("smsSegments", () => {
  it("160 plain characters is one text, 161 is two", () => {
    expect(smsSegments("a".repeat(160))).toMatchObject({ encoding: "GSM-7", segments: 1 });
    expect(smsSegments("a".repeat(161))).toMatchObject({ encoding: "GSM-7", segments: 2 });
    expect(smsSegments("a".repeat(306))).toMatchObject({ segments: 2 });
    expect(smsSegments("a".repeat(307))).toMatchObject({ segments: 3 });
  });
  it("extension characters like { or € cost two", () => {
    expect(smsSegments("€".repeat(80)).units).toBe(160);
  });
  it("one curly apostrophe switches to UCS-2 at 70 per text", () => {
    expect(smsSegments("You’re booked " + "a".repeat(56))).toMatchObject({ encoding: "UCS-2", segments: 1 });
    expect(smsSegments("You’re booked " + "a".repeat(57))).toMatchObject({ encoding: "UCS-2", segments: 2 });
  });
});

describe("time", () => {
  const now = "2026-10-20T09:41:00-07:00";
  it("formats in Pacific time", () => {
    expect(fmtTime("2026-10-20T21:00:00Z")).toBe("2:00 PM");
    expect(fmtRange("2026-10-20T14:00:00-07:00", 60)).toBe("2:00–3:00 PM");
    expect(fmtRange("2026-10-20T11:30:00-07:00", 90)).toBe("11:30 AM–1:00 PM");
  });
  it("says today / tomorrow / the date in texts", () => {
    expect(smsDay("2026-10-20T14:00:00-07:00", now)).toBe("today");
    expect(smsDay("2026-10-21T10:00:00-07:00", now)).toBe("tomorrow");
    expect(smsDay("2026-10-22T08:00:00-07:00", now)).toBe("Thu, Oct 22");
  });
  it("counts whole days on the list", () => {
    expect(daysBetween("2026-09-09", now)).toBe(41);
  });
  it("timeline stamps read like timecode", () => {
    expect(stamp(20_350)).toBe("0:20");
    expect(stamp(620_500)).toBe("10:20");
    expect(stamp(3_725_000)).toBe("1:02:05");
  });
});

describe("quiet hours", () => {
  const quiet = { enabled: true, start: "20:00", end: "08:00" };
  it("wraps past midnight", () => {
    expect(isQuietHours("2026-10-20T21:30:00-07:00", quiet)).toBe(true);
    expect(isQuietHours("2026-10-20T06:00:00-07:00", quiet)).toBe(true);
    expect(isQuietHours("2026-10-20T09:41:00-07:00", quiet)).toBe(false);
  });
  it("holds offers until quiet hours end", () => {
    expect(nextSendTime("2026-10-18T21:14:00-07:00", quiet)).toBe("2026-10-19T08:00:00-07:00");
    expect(nextSendTime("2026-10-20T06:30:00-07:00", quiet)).toBe("2026-10-20T08:00:00-07:00");
    expect(nextSendTime("2026-10-20T09:41:00-07:00", quiet)).toBe("2026-10-20T09:41:00-07:00");
  });
  it("can be switched off", () => {
    expect(isQuietHours("2026-10-20T23:00:00-07:00", { ...quiet, enabled: false })).toBe(false);
  });
});

describe("offer codes", () => {
  it("are short, stable, and avoid look-alike characters", () => {
    const c = offerCode("a-c1", "w01");
    expect(c).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
    expect(offerCode("a-c1", "w01")).toBe(c);
    expect(offerCode("a-c1", "w02")).not.toBe(c);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapWaitlistCsv, normalizePhone, parseCsv, parseDays, parseTimes } from "@/lib/csv";
import { types, waitlist } from "./fixtures";

describe("parseCsv", () => {
  it("handles quotes, commas inside quotes, doubled quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ]);
  });
});

describe("field parsing", () => {
  it("normalizes phone numbers in any common format", () => {
    for (const p of ["805-555-0102", "(805) 555-0102", "8055550102", "805.555.0102", "+1 805 555 0102"]) expect(normalizePhone(p)).toBe("(805) 555-0102");
    expect(normalizePhone("555-0102")).toBeNull();
  });
  it("reads days and times the way people type them", () => {
    expect(parseDays("Tue;Thu")).toEqual(["tue", "thu"]);
    expect(parseDays("any")).toEqual([]);
    expect(parseDays("Someday")).toBeNull();
    expect(parseTimes("morning;afternoon")).toEqual(["morning", "afternoon"]);
    expect(parseTimes("")).toEqual(["any"]);
  });
});

describe("the sample file", () => {
  const text = readFileSync("public/samples/waitlist-sample.csv", "utf8");
  const { rows, missingColumns } = mapWaitlistCsv(text, types, "2026-10-20T09:41:00-07:00", waitlist);
  it("has every required column", () => expect(missingColumns).toEqual([]));
  it("imports 8 of 10 rows and explains the 2 it can't", () => {
    expect(rows).toHaveLength(10);
    expect(rows.filter((r) => r.entry)).toHaveLength(8);
    expect(rows.find((r) => r.name === "Russ Novak")?.errors[0]).toMatch(/No mobile/);
    expect(rows.find((r) => r.name === "Paula Serrano")?.errors[0]).toMatch(/Whitening/);
  });
  it("maps shorthand like RCT to a root canal", () => {
    expect(rows.find((r) => r.name === "Gabe Orozco")?.entry?.procedureId).toBe("rootcanal");
  });
  it("flags a number that's already on the waitlist", () => {
    expect(rows.find((r) => r.name === "Rosa Delgado-Ruiz")?.warnings[0]).toMatch(/Rosa Delgado/);
  });
});

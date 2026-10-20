// Waitlist CSV import. Accepts the kind of export a practice actually has:
// phone numbers in any format, visit names or shorthand, days like "Tue;Thu".

import { ptParts } from "./time";
import type { AppointmentType, Insurance, TimeWindow, Urgency, WaitlistEntry, Weekday } from "./types";

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const DAY_WORDS: Record<string, Weekday> = {
  mon: "mon", monday: "mon", m: "mon",
  tue: "tue", tues: "tue", tuesday: "tue", tu: "tue",
  wed: "wed", wednesday: "wed", w: "wed",
  thu: "thu", thur: "thu", thurs: "thu", thursday: "thu", th: "thu",
  fri: "fri", friday: "fri", f: "fri",
};

export function parseDays(raw: string): Weekday[] | null {
  const t = raw.trim().toLowerCase();
  if (!t || t === "any" || t === "any day" || t === "all") return [];
  const out: Weekday[] = [];
  for (const tok of t.split(/[;,/\s]+/).filter(Boolean)) {
    const d = DAY_WORDS[tok.replace(/\.$/, "")];
    if (!d) return null;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

const TIME_WORDS: Record<string, TimeWindow> = {
  morning: "morning", mornings: "morning", am: "morning",
  midday: "midday", lunch: "midday", noon: "midday",
  afternoon: "afternoon", afternoons: "afternoon", pm: "afternoon",
  any: "any", anytime: "any",
};

export function parseTimes(raw: string): TimeWindow[] | null {
  const t = raw.trim().toLowerCase().replace("any time", "any");
  if (!t) return ["any"];
  const out: TimeWindow[] = [];
  for (const tok of t.split(/[;,/\s]+/).filter(Boolean)) {
    const w = TIME_WORDS[tok];
    if (!w) return null;
    if (!out.includes(w)) out.push(w);
  }
  return out.includes("any") ? ["any"] : out;
}

const VISIT_ALIASES: Record<string, string> = {
  prophy: "cleaning", hygiene: "cleaning", cleaning: "cleaning", recall: "cleaning",
  perio: "perio", "perio maint": "perio", "perio maintenance": "perio",
  np: "newpt", "new patient": "newpt", "new patient exam": "newpt",
  comp: "filling", composite: "filling", filling: "filling",
  crown: "crown", "crown prep": "crown",
  rct: "rootcanal", "root canal": "rootcanal", endo: "rootcanal",
  exam: "exam", "limited exam": "exam", emergency: "exam", "emergency exam": "exam",
};

export function parseVisit(raw: string, types: AppointmentType[]): string | null {
  const t = raw.trim().toLowerCase();
  const byName = types.find((x) => x.waitlist && (x.id === t || x.name.toLowerCase() === t));
  if (byName) return byName.id;
  const alias = VISIT_ALIASES[t];
  return alias && types.some((x) => x.id === alias && x.waitlist) ? alias : null;
}

function parseUrgency(raw: string): Urgency | null {
  const t = raw.trim().toLowerCase();
  if (!t || t === "routine" || t === "normal") return "routine";
  if (t === "soon" || t === "medium") return "soon";
  if (t === "urgent" || t === "asap" || t === "high") return "urgent";
  return null;
}

function parseInsurance(raw: string): Insurance {
  const t = raw.trim();
  if (!t) return { status: "check", note: "No insurance on the import. Ask at check-in." };
  if (/^(self[- ]?pay|cash|none)$/i.test(t)) return { status: "self-pay" };
  const m = t.match(/^check:\s*(.+)$/i);
  if (m) return { status: "check", carrier: m[1], note: "Verify eligibility." };
  return { status: "verified", carrier: t };
}

export interface ImportRow {
  line: number;
  name: string;
  entry?: Omit<WaitlistEntry, "id">;
  errors: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<string, string> = {
  first_name: "first", first: "first", "first name": "first",
  last_name: "last", last: "last", "last name": "last",
  mobile: "mobile", phone: "mobile", cell: "mobile",
  visit: "visit", procedure: "visit", "visit type": "visit",
  urgency: "urgency", priority: "urgency",
  days: "days", preferred_days: "days", "preferred days": "days",
  times: "times", preferred_times: "times", "preferred times": "times",
  added: "added", added_on: "added", "date added": "added",
  insurance: "insurance", carrier: "insurance",
  notes: "notes", note: "notes",
};

export function mapWaitlistCsv(text: string, types: AppointmentType[], now: string, existing: { phone: string; firstName: string; lastName: string }[] = []): { rows: ImportRow[]; missingColumns: string[] } {
  const grid = parseCsv(text);
  if (grid.length === 0) return { rows: [], missingColumns: ["first_name", "mobile", "visit"] };
  const header = grid[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase());
  const missingColumns = ["first", "mobile", "visit"].filter((c) => !header.includes(c)).map((c) => ({ first: "first_name", mobile: "mobile", visit: "visit" })[c]!);
  if (missingColumns.length) return { rows: [], missingColumns };
  const today = ptParts(now).date;
  const seenPhones = new Map<string, string>();
  const rows = grid.slice(1).map((cells, i): ImportRow => {
    const get = (k: string) => (cells[header.indexOf(k)] ?? "").trim();
    const first = get("first");
    const last = get("last");
    const name = `${first} ${last}`.trim() || `Row ${i + 2}`;
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!first) errors.push("Missing first name.");
    const phone = normalizePhone(get("mobile"));
    if (!get("mobile")) errors.push("No mobile number, so we can't text them.");
    else if (!phone) errors.push(`"${get("mobile")}" isn't a 10-digit number.`);
    const visit = parseVisit(get("visit"), types);
    if (!visit) errors.push(get("visit") ? `"${get("visit")}" isn't a visit type ChairFill fills.` : "Missing visit type.");
    const urgency = parseUrgency(get("urgency"));
    if (!urgency) errors.push(`Urgency "${get("urgency")}" should be urgent, soon or routine.`);
    const days = parseDays(get("days"));
    if (!days) errors.push(`Couldn't read days "${get("days")}". Try Mon;Thu.`);
    const times = parseTimes(get("times"));
    if (!times) errors.push(`Couldn't read times "${get("times")}". Try morning;afternoon.`);
    const added = /^\d{4}-\d{2}-\d{2}$/.test(get("added")) ? get("added") : today;
    if (phone) {
      const dupe = existing.find((e) => e.phone === phone);
      if (dupe) warnings.push(`Same mobile as ${dupe.firstName} ${dupe.lastName}, already on the list.`);
      if (seenPhones.has(phone)) warnings.push(`Same mobile as ${seenPhones.get(phone)} in this file.`);
      seenPhones.set(phone, name);
    }
    const insurance = parseInsurance(get("insurance"));
    if (insurance.status === "check" && !get("insurance")) warnings.push("No insurance listed.");
    if (errors.length) return { line: i + 2, name, errors, warnings };
    return {
      line: i + 2,
      name,
      errors,
      warnings,
      entry: {
        firstName: first,
        lastName: last,
        phone: phone!,
        procedureId: visit!,
        urgency: urgency!,
        preferredDays: days!,
        windows: times!,
        addedOn: added,
        insurance,
        smsOk: true,
        notes: get("notes") || undefined,
      },
    };
  });
  return { rows, missingColumns };
}

import { daysBetween, fmtDay, fmtTime, minutesBetween, ptParts, sameDay } from "./time";
import type {
  Appointment,
  AppointmentType,
  Candidate,
  Exclusion,
  RuleId,
  Settings,
  TimeWindow,
  WaitlistEntry,
  Weekday,
} from "./types";

export const URGENCY_ORDER = { urgent: 0, soon: 1, routine: 2 } as const;

/** Minutes of the day each preferred window covers. Midday overlaps on purpose. */
export const WINDOW_RANGES: Record<Exclude<TimeWindow, "any">, [number, number]> = {
  morning: [8 * 60, 12 * 60],
  midday: [11 * 60, 14 * 60],
  afternoon: [13 * 60, 17 * 60],
};

export const RULE_COPY: Record<RuleId, { name: string; detail: string }> = {
  procedure: {
    name: "Procedure match",
    detail: "A cleaning slot goes to people waiting for a cleaning. Other visits that fit the time come after.",
  },
  urgency: { name: "Urgency", detail: "Urgent before soon, soon before routine." },
  window: { name: "Preferred times", detail: "People who asked for this day and time of day come first." },
  waiting: { name: "Longest wait", detail: "Ties go to whoever has been on the list longest." },
};

export function windowMatch(entry: { preferredDays: Weekday[]; windows: TimeWindow[] }, slotStart: string) {
  const p = ptParts(slotStart);
  const m = p.minutesOfDay;
  const dayOk = entry.preferredDays.length === 0 || entry.preferredDays.includes(p.weekday as Weekday);
  const timeOk =
    entry.windows.length === 0 ||
    entry.windows.includes("any") ||
    entry.windows.some((w) => w !== "any" && m >= WINDOW_RANGES[w][0] && m < WINDOW_RANGES[w][1]);
  return dayOk && timeOk ? "full" : dayOk || timeOk ? "partial" : "none";
}

export interface OfferLogEntry {
  key: string;
  at: string;
}

export interface RankInput {
  slot: Appointment;
  types: AppointmentType[];
  waitlist: WaitlistEntry[];
  appointments: Appointment[];
  settings: Settings;
  now: string;
  offerLog: OfferLogEntry[];
}

export interface RankedCandidate extends Candidate {
  rank: number;
}

export interface RankResult {
  ranked: RankedCandidate[];
  excluded: Exclusion[];
}

const fullName = (w: WaitlistEntry) => `${w.firstName} ${w.lastName}`;

export function rankCandidates(input: RankInput): RankResult {
  const { slot, types, waitlist, appointments, settings, now, offerLog } = input;
  const typeOf = (id: string) => types.find((t) => t.id === id);
  const slotType = typeOf(slot.typeId);
  if (!slotType) return { ranked: [], excluded: [] };

  const pool: Candidate[] = [];

  // Patients already booked later who said earlier is fine. They're the easiest yes.
  for (const a of appointments) {
    if (!a.earlierOk || a.status !== "booked" || a.id === slot.id) continue;
    if (a.typeId !== slot.typeId || a.providerId !== slot.providerId) continue;
    const ahead = minutesBetween(slot.start, a.start);
    if (ahead <= 0 || ahead > 14 * 24 * 60) continue;
    if (!a.patient.phone) continue;
    const [first] = a.patient.name.split(" ");
    pool.push({
      key: a.patient.id,
      kind: "moveup",
      name: a.patient.name,
      firstName: first,
      phone: a.patient.phone,
      procedureId: a.typeId,
      urgency: "routine",
      waitingDays: 0,
      windowMatch: "full",
      procedureMatch: "exact",
      bookedAppointmentId: a.id,
      bookedStart: a.start,
    });
  }

  for (const w of waitlist) {
    const wType = typeOf(w.procedureId);
    if (!wType) continue;
    let procedureMatch: Candidate["procedureMatch"];
    if (w.procedureId === slot.typeId) procedureMatch = "exact";
    else if (settings.allowFits && wType.role === slotType.role && wType.durationMin <= slot.durationMin) procedureMatch = "fits";
    else continue;
    pool.push({
      key: w.id,
      kind: "waitlist",
      name: fullName(w),
      firstName: w.firstName,
      phone: w.phone,
      procedureId: w.procedureId,
      urgency: w.urgency,
      waitingDays: daysBetween(w.addedOn, now),
      windowMatch: windowMatch(w, slot.start),
      procedureMatch,
      insurance: w.insurance,
      notes: w.notes,
      waitlistId: w.id,
      lastOffer: w.lastOffer,
    });
  }

  const excluded: Exclusion[] = [];
  const eligible: Candidate[] = [];
  for (const c of pool) {
    const entry = c.waitlistId ? waitlist.find((w) => w.id === c.waitlistId) : undefined;
    if (entry && !entry.smsOk) {
      excluded.push({ candidate: c, reason: "no-mobile", detail: "No mobile number on file. Call instead." });
      continue;
    }
    if (entry?.providerPref && entry.providerPref !== slot.providerId) {
      excluded.push({ candidate: c, reason: "provider", detail: entry.notes ?? "Prefers a different provider." });
      continue;
    }
    const mine = offerLog.filter((o) => o.key === c.key);
    const last = mine.reduce<string | undefined>((acc, o) => (!acc || o.at > acc ? o.at : acc), undefined);
    if (last && settings.cooldownHours > 0) {
      const hoursSince = minutesBetween(last, now) / 60;
      if (hoursSince < settings.cooldownHours) {
        excluded.push({
          candidate: c,
          reason: "cooldown",
          detail: `Texted ${sameDay(last, now) ? "today" : fmtDay(last)} at ${fmtTime(last)}. Free again in ${formatHours(settings.cooldownHours - hoursSince)}.`,
        });
        continue;
      }
    }
    const today = mine.filter((o) => sameDay(o.at, now)).length;
    if (settings.dailyCap > 0 && today >= settings.dailyCap) {
      excluded.push({ candidate: c, reason: "daily-cap", detail: `Already got ${today} offers today (limit ${settings.dailyCap}).` });
      continue;
    }
    eligible.push(c);
  }

  const cmp = comparator(settings);
  eligible.sort(cmp);

  // Two records sharing one mobile only get one text.
  const seenPhones = new Set<string>();
  const ranked: RankedCandidate[] = [];
  for (const c of eligible) {
    if (seenPhones.has(c.phone)) {
      const first = ranked.find((r) => r.phone === c.phone);
      excluded.push({ candidate: c, reason: "duplicate", detail: `Same mobile as ${first?.name ?? "another patient"}. Texting once.` });
      continue;
    }
    seenPhones.add(c.phone);
    ranked.push({ ...c, rank: ranked.length + 1 });
  }
  return { ranked, excluded };
}

function formatHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${Math.round(h)} hr`;
}

const RULE_CMP: Record<RuleId, (a: Candidate, b: Candidate) => number> = {
  procedure: (a, b) => (a.procedureMatch === b.procedureMatch ? 0 : a.procedureMatch === "exact" ? -1 : 1),
  urgency: (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
  window: (a, b) => WINDOW_ORDER[a.windowMatch] - WINDOW_ORDER[b.windowMatch],
  waiting: (a, b) => b.waitingDays - a.waitingDays,
};
const WINDOW_ORDER = { full: 0, partial: 1, none: 2 } as const;

export function comparator(settings: Pick<Settings, "ruleOrder" | "moveUpsFirst">) {
  return (a: Candidate, b: Candidate) => {
    if (settings.moveUpsFirst && a.kind !== b.kind) return a.kind === "moveup" ? -1 : 1;
    if (a.kind === "moveup" && b.kind === "moveup") return (a.bookedStart ?? "").localeCompare(b.bookedStart ?? "");
    for (const rule of settings.ruleOrder) {
      const d = RULE_CMP[rule](a, b);
      if (d !== 0) return d;
    }
    return a.name.localeCompare(b.name);
  };
}

export type ChipTone = "good" | "neutral" | "warn" | "urgent";
export interface ReasonChip {
  label: string;
  tone: ChipTone;
  title?: string;
}

const DAY_LABEL: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri" };

const WINDOW_LABEL: Record<Exclude<TimeWindow, "any">, string> = { morning: "mornings", midday: "midday", afternoon: "afternoons" };

/** "Tue, Thu afternoons" / "afternoons" / "Fri, any time" / "any time" */
export function describePreference(days: Weekday[], windows: TimeWindow[]) {
  const anyDay = days.length === 0 || days.length === 5;
  const anyTime = windows.length === 0 || windows.includes("any");
  const d = days.map((x) => DAY_LABEL[x]).join(", ");
  const w = windows
    .filter((x): x is Exclude<TimeWindow, "any"> => x !== "any")
    .map((x) => WINDOW_LABEL[x])
    .join(" or ");
  if (anyDay && anyTime) return "any time";
  if (anyDay) return w;
  if (anyTime) return `${d}, any time`;
  return `${d} ${w}`;
}

/** The chips that explain, in plain words, why someone is where they are in the list. */
export function reasonChips(c: Candidate, types: AppointmentType[], entry?: WaitlistEntry): ReasonChip[] {
  const chips: ReasonChip[] = [];
  const typeName = types.find((t) => t.id === c.procedureId)?.name ?? c.procedureId;
  if (c.kind === "moveup" && c.bookedStart) {
    chips.push({ label: `Move-up from ${fmtDay(c.bookedStart)} ${fmtTime(c.bookedStart)}`, tone: "good", title: "Already booked later and said earlier is fine." });
  } else if (c.procedureMatch === "exact") {
    chips.push({ label: `Waiting for ${typeName.toLowerCase()}`, tone: "good" });
  } else {
    chips.push({ label: `${typeName} fits`, tone: "neutral", title: "A different visit that fits in this slot." });
  }
  if (c.kind === "waitlist") {
    if (c.urgency === "urgent") chips.push({ label: "Urgent", tone: "urgent" });
    else if (c.urgency === "soon") chips.push({ label: "Soon", tone: "neutral" });
    if (entry) {
      const pref = describePreference(entry.preferredDays, entry.windows);
      chips.push(
        c.windowMatch === "full"
          ? { label: `Wants ${pref}`, tone: "good" }
          : { label: `Prefers ${pref}`, tone: "neutral", title: c.windowMatch === "partial" ? "Matches the day or the time, not both." : "Outside what they asked for." },
      );
    }
    chips.push({ label: `Waiting ${c.waitingDays} ${c.waitingDays === 1 ? "day" : "days"}`, tone: "neutral" });
  }
  if (c.insurance?.status === "check") chips.push({ label: "Check insurance", tone: "warn", title: c.insurance.note });
  if (c.insurance?.status === "expired") chips.push({ label: "Insurance expired", tone: "warn", title: c.insurance.note });
  if (c.insurance?.status === "self-pay") chips.push({ label: "Self-pay", tone: "neutral" });
  return chips;
}

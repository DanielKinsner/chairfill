import { ptParts } from "./time";
import type { FillRecord } from "./types";

/** The front desk's estimate of how long it takes to work the list by phone for one opening. */
export const PHONE_MINUTES_PER_FILL = 20;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function mondayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dow);
  return t.toISOString().slice(0, 10);
}

export function weekdaysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  let n = 0;
  for (let d = 1; d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow > 0 && dow < 6) n++;
  }
  return n;
}

export function weekdaysElapsed(month: string, now: string) {
  const today = ptParts(now).date;
  const [y, m] = month.split("-").map(Number);
  let n = 0;
  for (let d = 1; d <= 31; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    if (iso > today) break;
    const t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCMonth() !== m - 1) break;
    const dow = t.getUTCDay();
    if (dow > 0 && dow < 6) n++;
  }
  return n;
}

export interface MonthReport {
  filled: FillRecord[];
  unfilled: FillRecord[];
  recovered: number;
  avgMinutes: number;
  medianMinutes: number;
  offersPerFill: number;
  fillRate: number;
  phoneHoursSaved: number;
  pace: number;
  byWeek: { week: string; fills: number; value: number }[];
  byHour: { hour: number; fills: number; avgMinutes: number }[];
  byType: { typeId: string; fills: number; value: number }[];
}

export function monthReport(history: FillRecord[], month: string, now: string): MonthReport {
  const inMonth = history.filter((h) => h.slotStart.startsWith(month));
  const filled = inMonth.filter((h) => h.status === "filled");
  const unfilled = inMonth.filter((h) => h.status === "unfilled");
  const recovered = filled.reduce((s, h) => s + h.value, 0);
  const minutes = filled.map((h) => h.minutesToFill ?? 0);

  const weeks = new Map<string, { fills: number; value: number }>();
  for (const h of filled) {
    const w = mondayOf(h.slotStart.slice(0, 10));
    const cur = weeks.get(w) ?? { fills: 0, value: 0 };
    weeks.set(w, { fills: cur.fills + 1, value: cur.value + h.value });
  }
  // Every week of the month shows up, even an empty one.
  const firstMonday = mondayOf(`${month}-01`);
  const byWeek: MonthReport["byWeek"] = [];
  for (let i = 0; i < 6; i++) {
    const [y, m, d] = firstMonday.split("-").map(Number);
    const wk = new Date(Date.UTC(y, m - 1, d + i * 7)).toISOString().slice(0, 10);
    if (wk.slice(0, 7) > month) break;
    byWeek.push({ week: wk, ...(weeks.get(wk) ?? { fills: 0, value: 0 }) });
  }

  const byHour = Array.from({ length: 9 }, (_, i) => 8 + i).map((hour) => {
    const hs = filled.filter((h) => ptParts(h.slotStart).hour === hour);
    return { hour, fills: hs.length, avgMinutes: mean(hs.map((h) => h.minutesToFill ?? 0)) };
  });

  const types = new Map<string, { fills: number; value: number }>();
  for (const h of filled) {
    const cur = types.get(h.typeId) ?? { fills: 0, value: 0 };
    types.set(h.typeId, { fills: cur.fills + 1, value: cur.value + h.value });
  }
  const byType = [...types.entries()].map(([typeId, v]) => ({ typeId, ...v })).sort((a, b) => b.value - a.value);

  const elapsed = Math.max(1, weekdaysElapsed(month, now));
  return {
    filled,
    unfilled,
    recovered,
    avgMinutes: mean(minutes),
    medianMinutes: median(minutes),
    offersPerFill: mean(filled.map((h) => h.offers.length)),
    fillRate: filled.length + unfilled.length ? filled.length / (filled.length + unfilled.length) : 0,
    phoneHoursSaved: (filled.length * PHONE_MINUTES_PER_FILL) / 60,
    pace: Math.round((recovered / elapsed) * weekdaysInMonth(month)),
    byWeek,
    byHour,
    byType,
  };
}

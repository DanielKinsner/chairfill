import type { Weekday } from "./types";

/** Every time in the app is shown in the practice's zone, wherever the viewer is. */
export const TZ = "America/Los_Angeles";

/** The demo opens on a Tuesday morning, a few minutes after the front desk got in. */
export const DEMO_START = "2026-10-20T09:41:00-07:00";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts });
const timeFmt = fmt({ hour: "numeric", minute: "2-digit" });
const timeSecFmt = fmt({ hour: "numeric", minute: "2-digit", second: "2-digit" });
const dayFmt = fmt({ weekday: "short", month: "short", day: "numeric" });
const dayLongFmt = fmt({ weekday: "long", month: "long", day: "numeric" });
const monthDayFmt = fmt({ month: "short", day: "numeric" });
const partsFmt = fmt({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
const offsetFmt = fmt({ timeZoneName: "longOffset" });

const ms = (t: string | number | Date) => (typeof t === "number" ? t : new Date(t).getTime());

export function ptParts(t: string | number | Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms(t))).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: p.weekday.toLowerCase().slice(0, 3) as Weekday | "sat" | "sun",
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    minutesOfDay: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** ISO string in Pacific time with the right offset, e.g. 2026-10-20T14:00:00-07:00. */
export function toPT(t: string | number | Date): string {
  const d = new Date(ms(t));
  const p = ptParts(d);
  const off = offsetFmt.formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "GMT-07:00";
  const offset = off === "GMT" ? "+00:00" : off.replace("GMT", "");
  return `${p.date}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}${offset}`;
}

export const addMinutes = (t: string, m: number) => toPT(ms(t) + m * 60_000);
export const addSeconds = (t: string, s: number) => toPT(ms(t) + s * 1000);
export const minutesBetween = (a: string, b: string) => (ms(b) - ms(a)) / 60_000;

// Newer ICU puts a narrow no-break space before AM/PM; normalize so strings compare and wrap predictably.
const NNBSP = new RegExp(String.fromCharCode(0x202f), "g");
export const fmtTime = (t: string | number) => timeFmt.format(new Date(ms(t))).replace(NNBSP, " ");
export const fmtTimeSec = (t: string | number) => timeSecFmt.format(new Date(ms(t))).replace(NNBSP, " ");
/** "2:00" without AM/PM, for tight schedule cells. */
export const fmtClock = (t: string | number) => fmtTime(t).replace(/\s?[AP]M$/, "");
export const fmtDay = (t: string | number) => dayFmt.format(new Date(ms(t)));
export const fmtDayLong = (t: string | number) => dayLongFmt.format(new Date(ms(t)));
export const fmtMonthDay = (t: string | number) => monthDayFmt.format(new Date(ms(t)));
export function fmtRange(start: string, durationMin: number): string {
  const a = fmtTime(start);
  const b = fmtTime(addMinutes(start, durationMin));
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

export const sameDay = (a: string | number, b: string | number) => ptParts(a).date === ptParts(b).date;

/** How a slot's day reads inside a text message: "today", "tomorrow", or "Thu, Oct 22". */
export function smsDay(slot: string, now: string): string {
  const s = ptParts(slot).date;
  const n = ptParts(now).date;
  if (s === n) return "today";
  const tomorrow = ptParts(ms(now) + 86_400_000).date;
  if (s === tomorrow) return "tomorrow";
  return fmtDay(slot);
}

export function relativeAgo(then: string, now: string): string {
  const mins = Math.round(minutesBetween(then, now));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (sameDay(then, now)) return `today ${fmtTime(then)}`;
  if (ptParts(ms(now) - 86_400_000).date === ptParts(then).date) return `yesterday ${fmtTime(then)}`;
  return fmtMonthDay(then);
}

export function daysBetween(fromDate: string, now: string): number {
  const [y, m, d] = fromDate.slice(0, 10).split("-").map(Number);
  const [ny, nm, nd] = ptParts(now).date.split("-").map(Number);
  return Math.round((Date.UTC(ny, nm - 1, nd) - Date.UTC(y, m - 1, d)) / 86_400_000);
}

/** Sim timecode for the fill timeline: 0:20, 10:04, 1:02:03. */
export function stamp(simMs: number): string {
  const total = Math.max(0, Math.floor(simMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "Filled in 24 sec" / "Filled in 11 min". */
export function durationWords(simMs: number): string {
  const sec = Math.round(simMs / 1000);
  if (sec < 60) return `${sec} sec`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} hr ${min % 60} min`;
}

const hhmmToMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Quiet hours wrap past midnight (8:00 PM to 8:00 AM by default). */
export function isQuietHours(t: string, quiet: { enabled: boolean; start: string; end: string }): boolean {
  if (!quiet.enabled) return false;
  const m = ptParts(t).minutesOfDay;
  const s = hhmmToMin(quiet.start);
  const e = hhmmToMin(quiet.end);
  return s > e ? m >= s || m < e : m >= s && m < e;
}

/** The next moment offers may go out, given quiet hours. Returns t itself if it's already allowed. */
export function nextSendTime(t: string, quiet: { enabled: boolean; start: string; end: string }): string {
  if (!isQuietHours(t, quiet)) return t;
  const m = ptParts(t).minutesOfDay;
  const e = hhmmToMin(quiet.end);
  const wait = m < e ? e - m : 24 * 60 - m + e;
  const p = ptParts(t);
  return addMinutes(t, wait - p.second / 60);
}

export const fmtHHMM = (hhmm: string) => {
  const m = hhmmToMin(hhmm);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const toMs = ms;

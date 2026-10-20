import { minutesBetween, toMs } from "@/lib/time";
import type { Appointment, FillRun } from "@/lib/types";

export type SlotState = "booked" | "done" | "in-chair" | "no-show" | "open" | "filling" | "chairfill" | "cancelled-past";

export function slotState(a: Appointment, runs: FillRun[], now: string): SlotState {
  const startMs = toMs(a.start);
  const endMs = startMs + a.durationMin * 60_000;
  const nowMs = toMs(now);
  if (a.status === "no-show") return "no-show";
  if (a.status === "cancelled") {
    if (startMs <= nowMs) return "cancelled-past";
    return runs.some((r) => r.slotId === a.id && r.status === "running") ? "filling" : "open";
  }
  if (a.source === "chairfill") return "chairfill";
  if (endMs <= nowMs) return "done";
  if (startMs <= nowMs) return "in-chair";
  return "booked";
}

export const isFillable = (s: SlotState) => s === "open" || s === "filling";

export function minutesUntil(a: Appointment, now: string) {
  return minutesBetween(now, a.start);
}

/** Short visit labels for the week view, where lanes are only ~40px wide. */
export const TYPE_ABBR: Record<string, string> = {
  cleaning: "Clean",
  perio: "Perio",
  newpt: "NewPt",
  filling: "Comp",
  crown: "Crown",
  rootcanal: "RCT",
  exam: "Exam",
  seat: "Seat",
  consult: "Cons",
};

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export const weekDates = (weekStart: string) => [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));

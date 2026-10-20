"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bolt } from "@/components/brand";
import { useReducedMotionPref } from "@/lib/hooks";
import { addSeconds, fmtTimeSec, stamp } from "@/lib/time";
import type { FillRun, TimelineEntry } from "@/lib/types";

function names(run: FillRun, keys: string[]) {
  const list = keys.map((k) => run.offers.find((o) => o.key === k)?.firstName ?? run.roster.find((o) => o.key === k)?.firstName ?? "someone");
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

type Tone = "plain" | "good" | "win" | "muted" | "warn";

export function describe(run: FillRun, e: TimelineEntry): { text: string; detail?: string; tone: Tone } {
  const who = names(run, e.keys);
  const winner = run.offers.find((o) => o.key === run.winner);
  switch (e.kind) {
    case "start":
      return {
        text: run.manual ? "Started by the front desk" : "Fill started",
        detail: run.manual
          ? `${run.roster[0]?.name ?? ""} picked by hand.`
          : `${run.roster.length} ${run.roster.length === 1 ? "person" : "people"} in line, ${run.strategy === "batch" ? `${run.batchSize} at a time` : `one at a time, ${run.offerWindowSec / 60} min each`}.`,
        tone: "plain",
      };
    case "sent":
      return { text: `Offer texted to ${who}`, tone: "plain" };
    case "delivered":
      return { text: `Delivered to ${who}`, tone: "muted" };
    case "read":
      return { text: `${who} read it`, tone: "muted" };
    case "typing":
      return { text: `${who} is typing`, tone: "muted" };
    case "yes":
      return { text: `${who} said yes`, detail: e.text ? `“${e.text}”` : undefined, tone: "good" };
    case "no":
      return { text: `${who} said no`, detail: e.text ? `“${e.text}”` : undefined, tone: "plain" };
    case "expired":
      return { text: `No reply from ${who}`, detail: `The ${run.offerWindowSec / 60}-minute window ran out.`, tone: "muted" };
    case "confirmed":
      return { text: `Chair confirmed for ${winner?.name ?? who}`, detail: "First yes wins.", tone: "win" };
    case "notified-winner":
      return { text: `"You're booked" texted to ${who}`, tone: "plain" };
    case "notified-taken":
      return { text: `"It's taken" texted to ${who}`, detail: "They stay on the list.", tone: "plain" };
    case "notified-declined":
      return { text: `Thank-you texted to ${who}`, tone: "muted" };
    case "booked":
      return { text: "Written to the schedule", detail: "Practice software updated (simulated).", tone: "win" };
    case "late-yes":
      return { text: `${who} said yes after it was filled`, detail: "Already told it's taken. Still on the list.", tone: "muted" };
    case "late-no":
      return { text: `${who} replied after it was filled`, detail: e.text ? `“${e.text}”` : undefined, tone: "muted" };
    case "exhausted":
      return { text: "Nobody took it this round", detail: "The slot is still open.", tone: "warn" };
    case "skipped":
      return { text: e.text ?? "Stopped", tone: "warn" };
  }
}

const DOT: Record<Tone, string> = {
  plain: "bg-ink-2",
  good: "bg-green",
  win: "bg-teal",
  muted: "bg-line-strong",
  warn: "bg-amber",
};
const TEXT: Record<Tone, string> = {
  plain: "text-ink",
  good: "text-green-ink font-semibold",
  win: "text-teal-deep font-semibold",
  muted: "text-slate-ink",
  warn: "text-amber-ink font-semibold",
};

/** The fill timeline: timecode on the left, one step per line, each fading in as it happens. */
export function FillTimeline({ run, absolute = false, dense = false }: { run: FillRun; absolute?: boolean; dense?: boolean }) {
  const reduced = useReducedMotionPref();
  // Typing lines are noise once the reply lands.
  const entries = run.timeline.filter((e, i, all) => e.kind !== "typing" || i === all.length - 1);
  return (
    <ol className="relative" aria-label="Fill timeline">
      <span aria-hidden className="tick-rail absolute bottom-2 top-2 left-[51px] w-px" />
      <AnimatePresence initial={false}>
        {entries.map((e) => {
          const d = describe(run, e);
          return (
            <motion.li
              key={e.id}
              layout={!reduced}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`relative grid grid-cols-[44px_14px_1fr] items-start gap-x-1.5 ${dense ? "py-1" : "py-1.5"}`}
            >
              <span className="num pt-[1px] text-right text-[11.5px] text-slate-ink">
                {absolute ? fmtTimeSec(addSeconds(run.startedAt, e.t / 1000)).replace(/:\d\d (?=[AP]M)/, " ") : stamp(e.t)}
              </span>
              <span className="flex justify-center pt-[5px]">
                {e.kind === "booked" ? (
                  <span className="flex size-[13px] -translate-y-[2px] items-center justify-center rounded-[4px] bg-teal text-white">
                    <Bolt className="size-2" />
                  </span>
                ) : (
                  <span className={`size-[7px] rounded-full ring-2 ring-white ${DOT[d.tone]}`} />
                )}
              </span>
              <span className="min-w-0">
                <span className={`block text-[13px] leading-snug ${TEXT[d.tone]}`}>{d.text}</span>
                {d.detail ? <span className="block text-[12px] leading-snug text-slate-ink">{d.detail}</span> : null}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

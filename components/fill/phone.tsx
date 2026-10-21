"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Bolt } from "@/components/brand";
import { Chip, SimTag, type Tone } from "@/components/ui";
import { useReducedMotionPref } from "@/lib/hooks";
import { stamp } from "@/lib/time";
import type { OfferStatus, RunOffer } from "@/lib/types";

export const OFFER_STATUS: Record<OfferStatus, { label: string; tone: Tone }> = {
  queued: { label: "In line", tone: "neutral" },
  sent: { label: "Offered", tone: "amber" },
  delivered: { label: "Delivered", tone: "amber" },
  read: { label: "Read", tone: "amber" },
  typing: { label: "Typing", tone: "amber" },
  yes: { label: "Said yes", tone: "green" },
  no: { label: "Said no", tone: "neutral" },
  expired: { label: "No reply", tone: "neutral" },
  taken: { label: "Taken", tone: "outline" },
  "late-yes": { label: "Too late", tone: "outline" },
  "late-no": { label: "Said no", tone: "neutral" },
};

/** Turns the bare link in a text into a real link to the patient page. */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(\S+\/o\/[A-Z0-9]{4})/);
  return (
    <>
      {parts.map((p, i) =>
        /\/o\/[A-Z0-9]{4}$/.test(p) ? (
          <a
            key={i}
            href={`/o/${p.slice(-4)}`}
            target="_blank"
            rel="noreferrer"
            className="break-all font-medium text-teal-ink underline decoration-teal/40 underline-offset-2 hover:decoration-teal"
            title="Opens the patient's view in a new tab. Tap YES there and watch this fill react."
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function PhoneThread({
  offer,
  simT,
  windowSec,
  showWindow,
  isWinner,
  dimmed = false,
  practiceName,
  flyFrom = -140,
}: {
  offer: RunOffer;
  simT: number;
  windowSec: number;
  showWindow: boolean;
  isWinner: boolean;
  dimmed?: boolean;
  practiceName: string;
  flyFrom?: number;
}) {
  const reduced = useReducedMotionPref();
  const scroller = useRef<HTMLDivElement>(null);
  const status = OFFER_STATUS[offer.status];
  const active = ["sent", "delivered", "read", "typing"].includes(offer.status);
  const remaining = offer.sentAt !== undefined ? Math.max(0, windowSec * 1000 - (simT - offer.sentAt)) : 0;
  const lastOut = [...offer.messages].reverse().find((m) => m.dir === "out");

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [offer.messages.length, offer.status, reduced]);

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[18px] border bg-white transition-all duration-500 ${
        isWinner ? "winner-glow -translate-y-1 border-teal" : dimmed ? "border-line opacity-55 saturate-50" : "border-line-strong"
      }`}
    >
      <div className="border-b border-line px-3 pb-2 pt-2.5">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
        <p className="truncate text-[13px] font-semibold text-ink" title={offer.name}>
          {offer.name}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="num truncate whitespace-nowrap text-[11.5px] text-slate-ink">
            {offer.kind === "moveup" ? <span className="mr-1 font-sans font-medium text-teal-deep">Move-up</span> : offer.phone}
          </p>
          <Chip tone={status.tone} dot={active} className="shrink-0">
            {status.label}
          </Chip>
        </div>
        {showWindow && active ? (
          <div className="mt-2" aria-label={`Offer expires in ${stamp(remaining)}`}>
            <div className="h-1 overflow-hidden rounded-full bg-amber-soft">
              <div className="h-full rounded-full bg-amber transition-[width] duration-200 ease-linear" style={{ width: `${(remaining / (windowSec * 1000)) * 100}%` }} />
            </div>
            <p className="num mt-1 text-[10.5px] text-amber-ink">{stamp(remaining)} left to answer</p>
          </div>
        ) : null}
      </div>

      <div ref={scroller} className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface/60 px-2.5 py-3" aria-live="polite">
        <p className="text-center text-[10.5px] text-slate-ink">{practiceName}</p>
        <AnimatePresence initial={false}>
          {offer.messages.map((m, i) => (
            <motion.div
              key={`${m.kind}-${i}`}
              initial={reduced ? { opacity: 0 } : m.dir === "out" && m.kind === "offer" ? { opacity: 0, y: flyFrom, scale: 0.55 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={m.kind === "offer" && !reduced ? { type: "spring", stiffness: 140, damping: 20, mass: 0.9 } : { duration: 0.3, ease: "easeOut" }}
              className={`flex ${m.dir === "out" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[88%] rounded-[12px] px-2.5 py-1.5 text-[12px] leading-snug ${
                  m.dir === "out"
                    ? m.kind === "confirm"
                      ? "rounded-bl-[4px] border border-teal/40 bg-teal-soft text-ink"
                      : "rounded-bl-[4px] border border-line bg-white text-ink"
                    : m.kind === "reply" && /^\s*(yes|sí|si|ok yes)/i.test(m.body)
                      ? "rounded-br-[4px] bg-teal-ink text-white"
                      : "rounded-br-[4px] bg-ink-2 text-white"
                }`}
              >
                {m.kind === "confirm" ? (
                  <span className="mb-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-teal-deep">
                    <Bolt className="size-2.5" /> Booked
                  </span>
                ) : null}
                <Linkify text={m.body} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {lastOut && offer.messages[offer.messages.length - 1] === lastOut && offer.status !== "queued" ? (
          <p className="num pl-1 text-[10px] text-slate-ink">
            {offer.status === "sent"
              ? `Sending… ${stamp(lastOut.t)}`
              : offer.status === "delivered"
                ? "Delivered"
                : offer.status === "read" || offer.status === "typing"
                  ? "Read"
                  : ""}
          </p>
        ) : null}
        {offer.status === "typing" ? (
          <div className="flex justify-end" aria-label={`${offer.firstName} is typing`}>
            <div className="flex gap-1 rounded-[12px] rounded-br-[4px] bg-line px-3 py-2.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-typing rounded-full bg-slate" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-1.5">
        <SimTag />
        <span className="text-[10.5px] text-slate-ink">{offer.messages.filter((m) => m.dir === "out").length} sent</span>
      </div>
    </div>
  );
}

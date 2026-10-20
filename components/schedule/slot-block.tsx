"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Bolt } from "@/components/brand";
import { Button, Chip, Money } from "@/components/ui";
import { useReducedMotionPref } from "@/lib/hooks";
import { slotRun, useDemo, useRuntime } from "@/lib/store";
import { fmtDay, fmtRange, fmtTime, relativeAgo } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { isFillable, TYPE_ABBR, type SlotState } from "./slot-state";

const STATE_CLS: Record<SlotState, string> = {
  booked: "border border-line bg-surface text-ink hover:border-line-strong",
  done: "border border-line bg-white text-slate-ink",
  "in-chair": "border border-slate/60 bg-surface text-ink",
  "no-show": "border border-dashed border-line-strong bg-white text-slate-ink",
  open: "open-outline text-ink",
  filling: "open-outline-amber text-ink",
  chairfill: "border border-teal/50 bg-teal-soft text-teal-deep",
  "cancelled-past": "hatch border border-line text-slate-ink",
};

export function SlotBlock({
  appt,
  state,
  top,
  height,
  now,
  onFill,
  roomy,
  popSide,
}: {
  appt: Appointment;
  state: SlotState;
  top: number;
  height: number;
  now: string;
  onFill: (id: string) => void;
  roomy: boolean;
  popSide: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPref();
  const runs = useDemo((s) => s.runs);
  const run = slotRun(runs, appt.id);
  const types = useDemo((s) => s.practice.appointmentTypes);
  const type = types.find((t) => t.id === appt.typeId);
  const offersOut = run?.status === "running" ? run.offers.filter((o) => ["sent", "delivered", "read", "typing"].includes(o.status)).length : 0;

  // The one moment of motion on the schedule: a slot ChairFill just filled.
  const flashAt = useRuntime((s) => s.flashes[appt.id]);
  const justFilled = state === "chairfill" && !!flashAt && Date.now() - flashAt < 4000;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const fillable = isFillable(state);
  const label = `${fmtDay(appt.start)} ${fmtTime(appt.start)}, ${type?.name ?? ""}, ${
    state === "open" ? "open" : state === "filling" ? "offers out" : appt.patient.name
  }`;

  return (
    <div ref={ref} className="absolute inset-x-[3px]" style={{ top, height }}>
      <motion.div
        key={justFilled ? `flash-${flashAt}` : "still"}
        className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[6px] text-left ${STATE_CLS[state]} ${justFilled ? "animate-fill-pulse" : ""}`}
        initial={justFilled && !reduced ? { backgroundColor: "#0F8B8D", color: "#ffffff" } : false}
        animate={justFilled && !reduced ? { backgroundColor: "#DFF3F3", color: "#0A6869" } : undefined}
        transition={{ duration: 1.1, delay: 0.9, ease: "easeOut" }}
      >
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`flex min-h-0 w-full flex-1 flex-col items-start overflow-hidden text-left ${roomy ? "px-2 py-1" : "px-[3px] py-0.5"}`}
        >
          {roomy ? (
            <>
              <span className="flex w-full items-center gap-1">
                <span className={`num shrink-0 text-[11px] leading-tight ${state === "chairfill" ? "" : "text-slate-ink"}`}>{fmtRange(appt.start, appt.durationMin)}</span>
                {state === "chairfill" ? <Bolt className="ml-auto size-3 shrink-0" title="Filled by ChairFill" /> : null}
              </span>
              {height >= 34 ? (
                <span className="block w-full truncate text-[12.5px] font-medium leading-tight">
                  {state === "open" ? `Open, $${type?.value.toLocaleString()}` : state === "filling" ? `${offersOut || "Offers"} out` : appt.patient.name}
                </span>
              ) : null}
              {height >= 62 ? <span className="block w-full truncate text-[11.5px] leading-tight text-slate-ink">{type?.name}</span> : null}
            </>
          ) : (
            <span className="flex w-full items-center gap-0.5">
              {state === "chairfill" ? <Bolt className="size-2.5 shrink-0" title="Filled by ChairFill" /> : null}
              <span className={`block min-w-0 truncate text-[10px] leading-tight ${state === "open" || state === "filling" ? "font-semibold" : ""} ${state === "done" || state === "cancelled-past" ? "text-slate" : ""}`}>
                {state === "open" ? "Open" : state === "filling" ? `${offersOut || ""} out` : state === "no-show" ? "No-show" : state === "cancelled-past" ? "Cxl" : TYPE_ABBR[appt.typeId]}
              </span>
            </span>
          )}
        </button>
        {fillable ? (
          <div className={height >= 40 ? "px-1 pb-1" : "absolute inset-0 p-[2px]"}>
            <button
              type="button"
              onClick={() => onFill(appt.id)}
              aria-label={`Fill this slot: ${fmtDay(appt.start)} ${fmtTime(appt.start)} ${type?.name ?? ""}`}
              className={`flex w-full items-center justify-center gap-1 rounded-[4px] text-[11px] font-semibold transition-colors ${height >= 40 ? "h-[20px]" : "h-full"} ${
                state === "filling" ? "bg-white/80 text-amber-ink ring-1 ring-amber/60 hover:bg-white" : "bg-teal-ink text-white hover:bg-teal-deep"
              }`}
            >
              {state === "filling" ? "Watch" : roomy ? "Fill this slot" : "Fill"}
            </button>
          </div>
        ) : null}
      </motion.div>

      {open ? (
        <div
          role="dialog"
          aria-label="Appointment details"
          className={`absolute top-0 z-40 w-[280px] animate-fade-in rounded-card border border-line bg-white p-3.5 shadow-pop ${popSide === "right" ? "left-full ml-2" : "right-full mr-2"}`}
        >
          <Details appt={appt} state={state} now={now} onFill={onFill} close={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

export function Details({
  appt,
  state,
  now,
  onFill,
  close,
}: {
  appt: Appointment;
  state: SlotState;
  now: string;
  onFill: (id: string) => void;
  close?: () => void;
}) {
  const types = useDemo((s) => s.practice.appointmentTypes);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const type = types.find((t) => t.id === appt.typeId);
  const provider = providers.find((p) => p.id === appt.providerId);
  const chair = chairs.find((c) => c.id === appt.chairId);
  const fillable = isFillable(state);
  return (
    <div className="space-y-2.5 text-[13px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{fmtDay(appt.start)}</p>
          <p className="num text-slate-ink">{fmtRange(appt.start, appt.durationMin)}</p>
        </div>
        <StateChip state={state} />
      </div>
      <dl className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1">
        <dt className="text-slate-ink">Visit</dt>
        <dd className="text-ink">
          {type?.name} {type && type.value > 0 ? <Money value={type.value} className="text-slate-ink" /> : null}
        </dd>
        <dt className="text-slate-ink">With</dt>
        <dd className="text-ink">
          {provider?.name}, {chair?.name}
        </dd>
        {state === "open" || state === "filling" || state === "cancelled-past" ? (
          <>
            <dt className="text-slate-ink">Was</dt>
            <dd className="text-ink">{appt.openedBy ? `${appt.openedBy.patientName} (moved up)` : appt.cancel?.patient ?? appt.patient.name}</dd>
          </>
        ) : (
          <>
            <dt className="text-slate-ink">Patient</dt>
            <dd className="text-ink">
              {appt.patient.name}
              {appt.patient.phone ? <span className="num block text-[12px] text-slate-ink">{appt.patient.phone}</span> : null}
            </dd>
          </>
        )}
      </dl>
      {appt.cancel ? (
        <p className="rounded-[6px] bg-surface px-2.5 py-2 text-[12.5px] text-ink-2">
          Cancelled {relativeAgo(appt.cancel.at, now)} by {appt.cancel.via.toLowerCase()}
          {appt.cancel.reason ? <span className="block text-slate-ink">&ldquo;{appt.cancel.reason}&rdquo;</span> : null}
        </p>
      ) : null}
      {appt.note ? <p className="text-[12.5px] text-amber-ink">{appt.note}</p> : null}
      {appt.earlierOk && state === "booked" ? <p className="text-[12.5px] text-teal-deep">Said earlier is fine. ChairFill offers them openings first.</p> : null}
      {appt.source === "chairfill" ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-teal-deep">
          <Bolt className="size-3" /> Filled by ChairFill. No phone calls.
        </p>
      ) : null}
      {fillable ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => {
            close?.();
            onFill(appt.id);
          }}
        >
          {state === "filling" ? "Watch the fill" : "Fill this slot"}
        </Button>
      ) : null}
    </div>
  );
}

export function StateChip({ state }: { state: SlotState }) {
  switch (state) {
    case "open":
      return <Chip tone="outline">Open</Chip>;
    case "filling":
      return (
        <Chip tone="amber" dot>
          Offers out
        </Chip>
      );
    case "chairfill":
      return (
        <Chip tone="teal">
          <Bolt className="size-3" /> Filled
        </Chip>
      );
    case "in-chair":
      return <Chip tone="neutral">In the chair</Chip>;
    case "done":
      return <Chip tone="neutral">Done</Chip>;
    case "no-show":
      return <Chip tone="danger">No-show</Chip>;
    case "cancelled-past":
      return <Chip tone="neutral">Cancelled</Chip>;
    default:
      return <Chip tone="neutral">Booked</Chip>;
  }
}

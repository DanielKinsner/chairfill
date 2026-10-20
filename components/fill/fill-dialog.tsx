"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Ellipsis, FastForward, Info, PhoneCall, Send, Square, X } from "lucide-react";
import { Bolt } from "@/components/brand";
import { Button, Chip, IconButton, Money, Segmented, SimTag, type Tone } from "@/components/ui";
import { useDemoNow, useReducedMotionPref, useSimT } from "@/lib/hooks";
import { reasonChips, RULE_COPY, type RankedCandidate } from "@/lib/ranking";
import { slotRun, useDemo, useRuntime } from "@/lib/store";
import { renderTemplate, smsSegments } from "@/lib/templates";
import { offerCode } from "@/lib/offer-code";
import { durationWords, fmtDay, fmtDayLong, fmtHHMM, fmtRange, fmtTime, isQuietHours, minutesBetween, relativeAgo, smsDay, stamp } from "@/lib/time";
import type { Appointment, Exclusion, FillRun, Settings, WaitlistEntry } from "@/lib/types";
import { OFFER_STATUS, PhoneThread } from "./phone";
import { FillTimeline } from "./timeline";

export function FillDialog({ slot, onClose }: { slot: Appointment; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    useRuntime.setState({ openFill: slot.id });
    return () => useRuntime.setState({ openFill: null });
  }, [slot.id]);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", cancel);
    return () => d?.removeEventListener("cancel", cancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="fill-title"
      className="m-auto h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-white p-0 shadow-pop open:animate-fade-in md:h-[min(880px,calc(100dvh-2rem))] md:w-[min(1280px,calc(100vw-2rem))] md:rounded-card md:border md:border-line"
    >
      <FillBody slot={slot} onClose={onClose} />
    </dialog>
  );
}

function FillBody({ slot, onClose }: { slot: Appointment; onClose: () => void }) {
  const now = useDemoNow(5000);
  const runs = useDemo((s) => s.runs);
  const settings = useDemo((s) => s.settings);
  const practice = useDemo((s) => s.practice);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const templates = useDemo((s) => s.templates);
  const rank = useDemo((s) => s.rank);
  const startFill = useDemo((s) => s.startFill);
  const stopFill = useDemo((s) => s.stopFill);
  const bookDirect = useDemo((s) => s.bookDirect);
  const appointments = useDemo((s) => s.appointments);
  const live = appointments.find((a) => a.id === slot.id) ?? slot;

  const run = slotRun(runs, slot.id);
  const type = practice.appointmentTypes.find((t) => t.id === live.typeId)!;
  const provider = providers.find((p) => p.id === live.providerId)!;
  const chair = chairs.find((c) => c.id === live.chairId)!;

  const [strategy, setStrategy] = useState<Settings["strategy"]>(settings.strategy);
  const [skipped, setSkipped] = useState<string[]>([]);
  // Ranking is frozen while this dialog is open so rows don't jump around mid-decision.
  const [ranking] = useState(() => rank(slot.id));
  // Same for the waitlist: the winner leaves it when booked, but their row should keep its reasons.
  const [entries] = useState(() => useDemo.getState().waitlist);
  const chosen = (ranking?.ranked ?? []).filter((c) => !skipped.includes(c.key));
  const preStart = !run;
  const showRun = run;

  const minutesAway = minutesBetween(now, live.start);
  const quiet = isQuietHours(now, settings.quietHours);
  const pastSlot = minutesAway <= 0;

  const send = () => {
    startFill(slot.id, { strategy, candidateKeys: skipped.length ? chosen.map((c) => c.key) : undefined });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-start gap-4 border-b border-line px-4 py-3 md:px-6 md:py-4">
        <div className="min-w-0 flex-1">
          <h2 id="fill-title" className="text-[18px] font-semibold tracking-[-0.01em] md:text-[20px]">
            Fill {fmtDayLong(live.start)} at <span className="num">{fmtTime(live.start)}</span>
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-ink">
            {type.name}, {type.durationMin} min with {provider.name}, {chair.name}.{" "}
            {live.cancel ? (
              <>
                {live.openedBy ? `${live.openedBy.patientName} moved up` : `${live.cancel.patient ?? live.patient.name} cancelled`} {relativeAgo(live.cancel.at, now)}
                {live.openedBy ? "" : ` by ${live.cancel.via.toLowerCase()}`}.
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11.5px] text-slate-ink">Chair value</p>
          <Money value={type.value} className="text-[18px] font-semibold text-ink" />
        </div>
        <IconButton label="Close" onClick={onClose} className="-mr-2">
          <X className="size-5" />
        </IconButton>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[360px_1fr] md:overflow-hidden lg:grid-cols-[400px_1fr]">
        {/* Left: who gets texted */}
        <section className="order-2 flex min-h-0 flex-col border-line md:order-1 md:border-r" aria-label="Who gets texted">
          <div className="border-b border-line px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold">Who gets texted</h3>
              {preStart ? (
                <Segmented
                  label="Offer strategy"
                  size="sm"
                  value={strategy}
                  onChange={setStrategy}
                  options={[
                    { value: "batch", label: `${settings.batchSize} at once`, hint: "Text the top three together. First yes wins." },
                    { value: "one", label: "One at a time", hint: `Text one person, wait up to ${settings.offerWindowMin} minutes, then the next.` },
                  ]}
                />
              ) : (
                <span className="text-[12.5px] text-slate-ink">
                  {showRun?.strategy === "batch" ? `${showRun.batchSize} at a time` : `One at a time, ${settings.offerWindowMin} min each`}
                </span>
              )}
            </div>
            <RulesExplainer settings={settings} />
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {ranking && ranking.ranked.length === 0 ? (
              <div className="open-outline m-4 rounded-card p-4 text-[13px] text-ink-2">
                <p className="font-semibold text-ink">Nobody on the waitlist fits this slot.</p>
                <p className="mt-1 text-slate-ink">Add someone waiting for a {type.name.toLowerCase()}, or call your short-notice regulars.</p>
                <Link href="/waitlist" className="mt-2 inline-block font-semibold text-teal-ink hover:underline">
                  Open the waitlist
                </Link>
              </div>
            ) : null}
            <ol className="divide-y divide-line">
              {(showRun ? showRun.roster.map((r) => ranking?.ranked.find((c) => c.key === r.key) ?? toCandidate(r)) : ranking?.ranked ?? []).map((c, i) => (
                <CandidateRow
                  key={c.key}
                  index={i + 1}
                  c={c}
                  run={showRun}
                  preStart={preStart}
                  skipped={skipped.includes(c.key)}
                  inFirstBatch={preStart && chosen.indexOf(c) > -1 && chosen.indexOf(c) < (strategy === "batch" ? settings.batchSize : 1)}
                  onToggle={() => setSkipped((s) => (s.includes(c.key) ? s.filter((k) => k !== c.key) : [...s, c.key]))}
                  onOnly={() => startFill(slot.id, { candidateKeys: [c.key], manual: true, strategy: "one" })}
                  onBook={() => bookDirect(slot.id, c.key)}
                  entry={entries.find((w) => w.id === c.key)}
                />
              ))}
            </ol>
            {ranking && ranking.excluded.length > 0 && preStart ? <Excluded list={ranking.excluded} /> : null}
          </div>
        </section>

        {/* Right: the stage */}
        <section className="order-1 flex min-h-0 flex-col bg-white md:order-2" aria-label="Fill progress">
          <Stage slot={live} run={showRun} preStart={preStart} type={type} provider={provider} chairName={chair.name}>
            {preStart ? (
              <Preview
                first={chosen[0]}
                templates={templates.offer}
                vars={{
                  first_name: chosen[0]?.firstName ?? "",
                  procedure: type.name.toLowerCase(),
                  day: smsDay(live.start, now),
                  time: fmtTime(live.start),
                  provider: provider.smsName,
                  practice: practice.name,
                  link: `${typeof window !== "undefined" ? window.location.host : "chairfill.app"}/o/${chosen[0] ? offerCode(slot.id, chosen[0].key) : "K7QX"}`,
                }}
              />
            ) : null}
          </Stage>

          {/* Footer action bar */}
          <footer className="border-t border-line bg-white px-4 py-3 md:px-6">
            {preStart ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 text-[12.5px] text-slate-ink">
                  {pastSlot ? (
                    <span className="text-amber-ink">This time has already passed.</span>
                  ) : quiet ? (
                    <span className="text-amber-ink">
                      It&apos;s quiet hours. Offers wait until {fmtHHMM(settings.quietHours.end)}.
                    </span>
                  ) : minutesAway < settings.minLeadMinutes ? (
                    <span className="text-amber-ink">Starts in {Math.round(minutesAway)} min. Only people close by will make it.</span>
                  ) : (
                    <>
                      {strategy === "batch"
                        ? `Texts the top ${Math.min(settings.batchSize, chosen.length)} now. First yes gets the chair; everyone else hears it's taken.`
                        : `Texts one person at a time and waits up to ${settings.offerWindowMin} minutes for each.`}{" "}
                      <span className="whitespace-nowrap">
                        <SimTag className="ml-1 align-middle" />
                      </span>
                    </>
                  )}
                </div>
                <Button variant="secondary" onClick={onClose}>
                  Not now
                </Button>
                <Button variant="primary" size="lg" disabled={chosen.length === 0 || pastSlot || quiet} onClick={send} data-testid="send-offers">
                  <Send className="size-4" strokeWidth={2} />
                  {strategy === "batch" ? `Text ${firstNames(chosen.slice(0, settings.batchSize))}` : `Text ${chosen[0]?.firstName ?? "the first person"}`}
                </Button>
              </div>
            ) : showRun ? (
              <RunFooter run={showRun} onClose={onClose} onStop={() => stopFill(showRun.id)} onRetry={() => startFill(slot.id, { strategy })} />
            ) : null}
          </footer>
        </section>
      </div>
    </div>
  );
}

function firstNames(list: { firstName: string }[]) {
  const n = list.map((c) => c.firstName);
  if (n.length <= 1) return n[0] ?? "";
  return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

function toCandidate(r: FillRun["roster"][number]): RankedCandidate {
  return {
    key: r.key,
    kind: r.kind,
    name: r.name,
    firstName: r.firstName,
    phone: r.phone,
    procedureId: "",
    urgency: "routine",
    waitingDays: 0,
    windowMatch: "full",
    procedureMatch: "exact",
    rank: 0,
  };
}

// ---------------------------------------------------------------- left column pieces

function RulesExplainer({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);
  const order = [settings.moveUpsFirst ? "move-ups" : null, ...settings.ruleOrder.map((r) => RULE_COPY[r].name.toLowerCase())].filter(Boolean);
  return (
    <div className="mt-2">
      <p className="text-[12.5px] text-slate-ink" data-testid="rule-summary">
        In order: {order.join(", ")}. Nobody is texted twice in {settings.cooldownHours} hours.
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex items-center gap-1 text-[12.5px] font-medium text-teal-ink hover:underline"
      >
        <Info className="size-3.5" strokeWidth={2} />
        Why this order
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-2 animate-fade-in rounded-card bg-surface p-3 text-[12.5px]">
          <ol className="space-y-1.5">
            {settings.moveUpsFirst ? (
              <li className="flex gap-2">
                <span className="num w-4 shrink-0 text-slate-ink">0</span>
                <span>
                  <span className="font-medium text-ink">Move-ups first.</span> <span className="text-slate-ink">Patients already booked later who said earlier is fine. Easiest yes there is.</span>
                </span>
              </li>
            ) : null}
            {settings.ruleOrder.map((r, i) => (
              <li key={r} className="flex gap-2">
                <span className="num w-4 shrink-0 text-slate-ink">{i + 1}</span>
                <span>
                  <span className="font-medium text-ink">{RULE_COPY[r].name}.</span> <span className="text-slate-ink">{RULE_COPY[r].detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 border-t border-line pt-2 text-slate-ink">
            Nobody gets more than one offer every {settings.cooldownHours} hours or {settings.dailyCap} a day, and texts never go out between {fmtHHMM(settings.quietHours.start)} and{" "}
            {fmtHHMM(settings.quietHours.end)}.{" "}
            <Link href="/settings#rules" className="font-medium text-teal-ink hover:underline">
              Change the rules
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

const CHIP_TONE: Record<string, Tone> = { good: "teal", neutral: "neutral", warn: "amber", urgent: "urgent" };

function CandidateRow({
  index,
  c,
  run,
  preStart,
  skipped,
  inFirstBatch,
  onToggle,
  onOnly,
  onBook,
  entry,
}: {
  entry?: WaitlistEntry;
  index: number;
  c: RankedCandidate;
  run?: FillRun;
  preStart: boolean;
  skipped: boolean;
  inFirstBatch: boolean;
  onToggle: () => void;
  onOnly: () => void;
  onBook: () => void;
}) {
  const types = useDemo((s) => s.practice.appointmentTypes);
  const chips = c.procedureId ? reasonChips(c, types, entry) : [];
  const offer = run?.offers.find((o) => o.key === c.key);
  const status = offer ? OFFER_STATUS[offer.status] : run ? { label: run.status === "running" ? "In line" : "Not texted", tone: "neutral" as Tone } : undefined;
  const [menu, setMenu] = useState(false);
  const isWinner = run?.winner === c.key;

  return (
    <li
      className={`relative px-4 py-3 transition-colors md:px-5 ${skipped ? "opacity-50" : ""} ${isWinner ? "bg-teal-wash" : inFirstBatch ? "bg-amber-soft/40" : ""}`}
      data-testid="candidate"
    >
      <div className="flex items-start gap-3">
        {preStart ? (
          <input
            type="checkbox"
            checked={!skipped}
            onChange={onToggle}
            aria-label={`Include ${c.name}`}
            className="mt-[3px] size-4 shrink-0 accent-[#0C7C7E]"
          />
        ) : (
          <span className="num mt-[1px] w-4 shrink-0 text-right text-[12px] text-slate-ink">{index}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {preStart ? <span className="num text-[12px] text-slate-ink">{index}</span> : null}
            <p className="truncate text-[14px] font-semibold text-ink">
              {c.name}
              {isWinner ? <Bolt className="ml-1.5 inline size-3.5 -translate-y-px text-teal" title="Got the chair" /> : null}
            </p>
            <span className="num ml-auto shrink-0 text-[11.5px] text-slate-ink">{c.phone}</span>
          </div>
          {chips.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {chips.map((ch) => (
                <Chip key={ch.label} tone={CHIP_TONE[ch.tone]} title={ch.title}>
                  {ch.label}
                </Chip>
              ))}
            </div>
          ) : null}
          {entry?.notes && preStart ? <p className="mt-1.5 line-clamp-2 text-[12px] text-slate-ink">{entry.notes}</p> : null}
        </div>
        {status ? (
          <Chip tone={status.tone} dot={offer ? ["sent", "delivered", "read", "typing"].includes(offer.status) : false} className="shrink-0">
            {status.label}
          </Chip>
        ) : null}
        {preStart ? (
          <div className="relative shrink-0">
            <IconButton label={`More for ${c.firstName}`} onClick={() => setMenu((v) => !v)} aria-expanded={menu} className="-mr-2 -mt-1 size-7">
              <Ellipsis className="size-4" />
            </IconButton>
            {menu ? (
              <div role="menu" className="absolute right-0 top-8 z-20 w-56 animate-fade-in rounded-card border border-line bg-white p-1 shadow-pop" onMouseLeave={() => setMenu(false)}>
                <button role="menuitem" onClick={onOnly} className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[13px] hover:bg-surface">
                  <Send className="size-3.5 text-slate-ink" /> Text only {c.firstName}
                </button>
                <button role="menuitem" onClick={onBook} className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[13px] hover:bg-surface">
                  <PhoneCall className="size-3.5 text-slate-ink" /> {c.firstName} said yes on the phone
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

const EXCLUSION_LABEL: Record<Exclusion["reason"], string> = {
  cooldown: "Texted recently",
  "daily-cap": "Daily limit",
  "no-mobile": "Can't text",
  provider: "Wants another provider",
  duplicate: "Duplicate number",
};

function Excluded({ list }: { list: Exclusion[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line px-4 py-3 md:px-5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-1.5 text-[13px] font-medium text-slate-ink hover:text-ink">
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        Not texted this time ({list.length})
      </button>
      {open ? (
        <ul className="mt-2 space-y-2">
          {list.map((e) => (
            <li key={e.candidate.key + e.reason} className="rounded-[6px] bg-surface px-3 py-2 text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink">{e.candidate.name}</span>
                <Chip tone="outline">{EXCLUSION_LABEL[e.reason]}</Chip>
              </div>
              <p className="mt-0.5 text-slate-ink">{e.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- the stage

function Stage({
  slot,
  run,
  preStart,
  type,
  provider,
  chairName,
  children,
}: {
  slot: Appointment;
  run?: FillRun;
  preStart: boolean;
  type: { name: string; value: number };
  provider: { name: string; credentials: string };
  chairName: string;
  children?: React.ReactNode;
}) {
  const { t, ff } = useSimT(run);
  const reduced = useReducedMotionPref();
  const filled = run?.status === "filled";
  const booked = !!run?.timeline.some((e) => e.kind === "booked");
  const winner = run?.offers.find((o) => o.key === run.winner);
  const practiceName = useDemo((s) => s.practice.name);

  // Which phones are on stage: the current batch, or the last three people texted.
  const phones = run ? run.offers.slice(-Math.max(run.batchSize, 3)) : [];

  return (
    <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-6 md:py-5">
      {/* The slot itself */}
      <div className="flex items-center gap-3">
        <motion.div
          key={booked ? "booked" : filled ? "filled" : run ? "offering" : "open"}
          initial={booked && !reduced ? { scale: 0.98 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`relative flex min-h-[72px] flex-1 items-center gap-4 rounded-card px-4 py-3 transition-colors duration-500 ${
            booked
              ? "animate-fill-pulse border border-teal bg-teal text-white"
              : filled
                ? "border border-teal bg-teal-soft text-teal-deep"
                : run?.status === "running"
                  ? "open-outline-amber"
                  : "open-outline"
          }`}
          data-testid="stage-slot"
          data-state={booked ? "booked" : filled ? "filled" : run?.status ?? "open"}
        >
          <div className="min-w-0">
            <p className={`num text-[15px] font-semibold ${booked ? "text-white" : "text-ink"}`}>{fmtRange(slot.start, slot.durationMin)}</p>
            <p className={`text-[12.5px] ${booked ? "text-white/85" : "text-slate-ink"}`}>
              {fmtDay(slot.start)}, {chairName}, {provider.name}
            </p>
          </div>
          <div className="ml-auto min-w-0 text-right">
            {booked && winner ? (
              <p className="flex items-center justify-end gap-1.5 text-[15px] font-semibold text-white">
                <Bolt className="size-4" /> {winner.name}
              </p>
            ) : filled && winner ? (
              <p className="text-[14px] font-semibold">Confirming {winner.firstName}…</p>
            ) : run?.status === "running" ? (
              <p className="text-[14px] font-semibold text-amber-ink">Waiting for the first yes</p>
            ) : run?.status === "unfilled" ? (
              <p className="text-[14px] font-semibold text-ink">Still open</p>
            ) : (
              <p className="text-[14px] font-semibold text-ink">Open</p>
            )}
            <p className={`text-[12.5px] ${booked ? "text-white/85" : "text-slate-ink"}`}>
              {type.name}, ${type.value.toLocaleString()}
            </p>
          </div>
        </motion.div>
        {run ? (
          <div className="hidden w-[92px] shrink-0 text-right sm:block" aria-live="off">
            <p className="text-[11px] text-slate-ink">{run.status === "running" ? "Elapsed" : filled ? "Filled in" : "Ran for"}</p>
            <p className="num text-[22px] font-medium leading-tight text-ink" data-testid="fill-clock">
              {stamp(run.status === "running" ? t : filled ? (run.filledAtT ?? t) : run.simT)}
            </p>
            {ff ? (
              <p className="flex items-center justify-end gap-1 text-[11px] font-medium text-amber-ink">
                <FastForward className="size-3" /> skipping quiet
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {preStart ? (
        children
      ) : run ? (
        <div className="mt-5 grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_270px]">
          <div className={`grid min-h-[340px] gap-3 ${phones.length >= 3 ? "sm:grid-cols-3" : phones.length === 2 ? "sm:grid-cols-2" : "sm:max-w-[300px]"}`}>
            {phones.map((o, i) => (
              <div key={o.key} className="min-h-[320px] lg:min-h-0">
                <PhoneThread
                  offer={o}
                  simT={t}
                  windowSec={run.offerWindowSec}
                  showWindow={run.status === "running"}
                  isWinner={run.winner === o.key}
                  practiceName={practiceName}
                  flyFrom={-150 - i * 10}
                />
              </div>
            ))}
          </div>
          <div className="min-h-0 rounded-card border border-line bg-white p-3 lg:overflow-y-auto scroll-thin">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Timeline</h3>
              <SimTag />
            </div>
            <FillTimeline run={run} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Preview({ first, templates, vars }: { first?: RankedCandidate; templates: string; vars: Record<string, string> }) {
  const body = renderTemplate(templates, vars);
  const seg = smsSegments(body);
  if (!first) return null;
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
      <div className="rounded-[18px] border border-line-strong bg-white">
        <div className="border-b border-line px-3 py-2.5">
          <p className="text-[13px] font-semibold">{first.name}</p>
          <p className="num text-[11.5px] text-slate-ink">{first.phone}</p>
        </div>
        <div className="space-y-2 bg-surface/60 px-2.5 py-3">
          <div className="max-w-[92%] rounded-[12px] rounded-bl-[4px] border border-line bg-white px-2.5 py-1.5 text-[12px] leading-snug">{body}</div>
          <p className="num pl-1 text-[10px] text-slate-ink">
            {seg.units} characters, {seg.segments} {seg.segments === 1 ? "text" : "texts"}
          </p>
        </div>
      </div>
      <div className="open-outline flex flex-col justify-center rounded-card p-5 text-[13px] text-ink-2">
        <p className="text-[15px] font-semibold text-ink">Here&apos;s what happens when you hit send</p>
        <ol className="mt-3 space-y-2.5">
          {[
            "The offer goes out by text, in the order on the left.",
            "The first person to reply YES (or tap the link) gets the chair.",
            "Everyone else gets a polite “it's taken” and stays on the list.",
            "The appointment is written to the schedule. No phone calls.",
          ].map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="num flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-[11px] text-slate-ink">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[12px] text-slate-ink">
          Demo replies are scripted in <span className="num">data/sim-replies.json</span>. Tap the link in any text to answer as that patient yourself.
        </p>
      </div>
    </div>
  );
}

function RunFooter({ run, onClose, onStop, onRetry }: { run: FillRun; onClose: () => void; onStop: () => void; onRetry: () => void }) {
  const { t } = useSimT(run);
  const sent = run.offers.filter((o) => o.sentAt !== undefined).length;
  const winner = run.offers.find((o) => o.key === run.winner);
  const booked = run.timeline.some((e) => e.kind === "booked");
  if (run.status === "running") {
    const out = run.offers.filter((o) => ["sent", "delivered", "read", "typing"].includes(o.status)).length;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">{out} {out === 1 ? "offer" : "offers"} out.</span> First yes gets the chair. You can close this; it keeps going.
        </p>
        <Button variant="danger" onClick={onStop}>
          <Square className="size-3.5" /> Stop texting
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Back to the schedule
        </Button>
      </div>
    );
  }
  if (run.status === "filled") {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1" data-testid="fill-summary">
          <div>
            <dt className="text-[11.5px] text-slate-ink">Filled in</dt>
            <dd className="num text-[16px] font-semibold text-ink">{durationWords(run.filledAtT ?? t)}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-slate-ink">Texts sent</dt>
            <dd className="num text-[16px] font-semibold text-ink">{sent}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-slate-ink">Recovered</dt>
            <dd className="num text-[16px] font-semibold text-teal-deep">${run.value.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-slate-ink">Phone calls</dt>
            <dd className="num text-[16px] font-semibold text-ink">0</dd>
          </div>
        </dl>
        <div className="ml-auto flex gap-2">
          {winner ? (
            <Link
              href={`/o/${winner.code}`}
              target="_blank"
              className="inline-flex h-9 items-center rounded-card border border-line-strong px-3.5 text-[14px] font-medium text-ink hover:bg-surface"
            >
              See what {winner.firstName} sees
            </Link>
          ) : null}
          <Button variant="primary" onClick={onClose} disabled={!booked}>
            {booked ? "Done" : "Booking…"}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 text-[13px] text-ink-2">
        {run.status === "cancelled" ? "Stopped. Nobody else will be texted." : "Nobody said yes this round."} The slot is still open.
      </p>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      <Button variant="primary" onClick={onRetry}>
        Text the next people
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, Check, MapPin, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Bolt, Mark } from "@/components/brand";
import { Button, SimTag, Skeleton } from "@/components/ui";
import { RoleSwitcher } from "@/components/shell";
import { SimDriver } from "@/components/sim-driver";
import { useMounted, useReducedMotionPref } from "@/lib/hooks";
import { buildIcs, downloadIcs } from "@/lib/adapters/calendar";
import { maps } from "@/lib/adapters/maps";
import { offerCode } from "@/lib/offer-code";
import { demoNow, findOfferByCode, postReply, useDemo } from "@/lib/store";
import { injectReply } from "@/lib/sms-sim";
import { fmtDayLong, fmtRange, minutesBetween, smsDay } from "@/lib/time";
import type { Appointment, Candidate } from "@/lib/types";

type View = "open" | "sending" | "confirming" | "won" | "taken" | "declined" | "expired" | "closed";

interface Resolved {
  slot: Appointment;
  key: string;
  firstName: string;
  name: string;
  runId?: string;
  view: View;
}

/** Find who this link was sent to and where their offer stands. */
function useResolvedOffer(code: string): Resolved | null | undefined {
  const runs = useDemo((s) => s.runs);
  const appointments = useDemo((s) => s.appointments);
  const patientReplies = useDemo((s) => s.patientReplies);
  const rank = useDemo((s) => s.rank);
  return useMemo(() => {
    const state = useDemo.getState();
    const found = findOfferByCode(state, code);
    if (found?.slot) {
      const { run, offer, slot } = found;
      const booked = run.timeline.some((t) => t.kind === "booked");
      let view: View = "open";
      if (run.winner === offer.key) view = booked ? "won" : "confirming";
      else if (offer.status === "taken" || offer.status === "late-yes" || run.status === "filled") view = "taken";
      else if (offer.status === "no" || offer.status === "late-no") view = "declined";
      else if (offer.status === "expired") view = "expired";
      else if (run.status !== "running") view = "closed";
      return { slot, key: offer.key, firstName: offer.firstName, name: offer.name, runId: run.id, view };
    }
    // Not texted yet in this browser (e.g. a phone that scanned the QR code): work it out from the schedule.
    const now = demoNow();
    for (const slot of appointments) {
      if (slot.status !== "cancelled" || minutesBetween(now, slot.start) <= 0) continue;
      const r = rank(slot.id);
      const all: Candidate[] = r ? [...r.ranked, ...r.excluded.map((e) => e.candidate)] : [];
      const c = all.find((x) => offerCode(slot.id, x.key) === code);
      if (c) return { slot, key: c.key, firstName: c.firstName, name: c.name, view: patientReplies[code] === "no" ? "declined" : "open" };
    }
    // The slot may have been filled since: look through booked ChairFill appointments.
    for (const slot of appointments) {
      if (slot.source !== "chairfill" || !slot.fillId) continue;
      if (offerCode(slot.id, slot.patient.id) === code)
        return { slot, key: slot.patient.id, firstName: slot.patient.name.split(" ")[0], name: slot.patient.name, view: "won" };
    }
    return null;
    // `runs` isn't read directly (findOfferByCode reads the store), but a run changing must re-resolve the offer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, runs, appointments, patientReplies, rank]);
}

export function OfferPage({ code }: { code: string }) {
  const mounted = useMounted();
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <PatientBar code={code} />
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-6 sm:py-10">
        {mounted ? <OfferBody code={code} /> : <CardSkeleton />}
      </main>
      <SimDriver />
    </div>
  );
}

function PatientBar({ code }: { code: string }) {
  const mounted = useMounted();
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex h-11 max-w-5xl items-center gap-3 px-4 text-[12.5px]">
        <Link href="/schedule" className="flex items-center gap-1.5 font-semibold text-ink" aria-label="ChairFill, back to the front desk">
          <Mark className="size-5" />
          <span className="hidden sm:inline">ChairFill</span>
        </Link>
        <span className="hidden items-center rounded-[6px] border border-dashed border-line-strong px-2 py-0.5 font-medium text-slate-ink sm:inline-flex">
          Demo: what the patient sees after tapping the link
        </span>
        <span className="ml-auto">{mounted ? <OfferPicker code={code} /> : null}</span>
        <RoleSwitcher value="patient" />
      </div>
    </div>
  );
}

/** Lets the demo jump between patients who've been texted. */
function OfferPicker({ code }: { code: string }) {
  const router = useRouter();
  const runs = useDemo((s) => s.runs);
  const options = runs
    .slice()
    .reverse()
    .flatMap((r) => r.offers.map((o) => ({ code: o.code, label: `${o.firstName} ${o.name.split(" ").slice(-1)[0][0]}.` })))
    .filter((o, i, a) => a.findIndex((x) => x.code === o.code) === i)
    .slice(0, 12);
  if (options.length < 2) return null;
  return (
    <label className="flex items-center gap-1.5 text-slate-ink">
      <span className="hidden md:inline">Viewing as</span>
      <select
        value={options.some((o) => o.code === code) ? code : ""}
        onChange={(e) => e.target.value && router.push(`/o/${e.target.value}`)}
        className="h-7 rounded-[6px] border border-line-strong bg-white px-1.5 text-[12.5px] text-ink"
        aria-label="Viewing as patient"
      >
        {options.some((o) => o.code === code) ? null : <option value="">Pick a patient</option>}
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OfferBody({ code }: { code: string }) {
  const resolved = useResolvedOffer(code);
  const practice = useDemo((s) => s.practice);
  const providers = useDemo((s) => s.providers);
  const startFill = useDemo((s) => s.startFill);
  const recordPatientNo = useDemo((s) => s.recordPatientNo);
  const [sending, setSending] = useState<null | "yes" | "no">(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // Clear the spinner once the answer lands.
  const view = resolved?.view;
  useEffect(() => {
    if (sending && view && view !== "open") setSending(null);
  }, [view, sending]);

  if (resolved === undefined) return <CardSkeleton />;
  if (resolved === null) return <NotFoundCard />;

  const { slot } = resolved;
  const type = practice.appointmentTypes.find((t) => t.id === slot.typeId)!;
  const provider = providers.find((p) => p.id === slot.providerId)!;
  const shownView: View = sending && view === "open" ? "sending" : view!;

  const answer = (reply: "yes" | "no") => {
    setSending(reply);
    if (resolved.runId) {
      postReply({ runId: resolved.runId, key: resolved.key, reply });
      return;
    }
    if (reply === "no") {
      recordPatientNo(code, resolved.key);
      return;
    }
    // No fill running for this link yet (opened on another device): this tap starts and answers one.
    const id = startFill(slot.id, { candidateKeys: [resolved.key], manual: true, strategy: "one" });
    if (!id) return;
    const s = useDemo.getState();
    const run = s.runs.find((r) => r.id === id)!;
    useDemo.setState({ runs: s.runs.map((r) => (r.id === id ? injectReply(run, resolved.key, "yes", 1500, "YES (tapped the link)") : r)) });
  };

  return (
    <div className="grid w-full max-w-[880px] items-start gap-8 md:grid-cols-[1fr_220px]">
      <article className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[12px] border border-line bg-white shadow-lift" aria-live="polite">
        <header className="border-b border-line px-6 pb-4 pt-5">
          <p className="text-[15px] font-semibold text-ink">{practice.name}</p>
          <p className="text-[12.5px] text-slate-ink">
            {practice.address.line1}, {practice.address.city}
          </p>
        </header>

        {shownView === "won" || shownView === "confirming" ? (
          <Confirmation resolved={resolved} confirming={shownView === "confirming"} />
        ) : (
          <div className="px-6 pb-6 pt-5">
            <Headline view={shownView} firstName={resolved.firstName} procedure={type.name.toLowerCase()} slotStart={slot.start} />
            <SlotDetails slot={slot} typeName={type.name} durationMin={type.durationMin} provider={`${provider.name}, ${provider.credentials}`} practice={practice} muted={shownView !== "open" && shownView !== "sending"} />

            {shownView === "open" || shownView === "sending" ? (
              <>
                <p className="mt-4 text-[13px] text-slate-ink">We texted a few people on our waitlist. Whoever says yes first gets it.</p>
                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    disabled={!!sending}
                    onClick={() => answer("yes")}
                    data-testid="patient-yes"
                    className="flex h-16 items-center justify-center gap-2 rounded-card bg-teal-ink text-[19px] font-semibold text-white transition-colors hover:bg-teal-deep disabled:opacity-70"
                  >
                    {sending === "yes" ? "Saving your spot…" : "Yes, I'll take it"}
                  </button>
                  <button
                    type="button"
                    disabled={!!sending}
                    onClick={() => answer("no")}
                    data-testid="patient-no"
                    className="flex h-16 items-center justify-center rounded-card border border-line-strong bg-white text-[19px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-70"
                  >
                    {sending === "no" ? "Sending…" : "No, thanks"}
                  </button>
                </div>
                <p className="mt-4 text-center text-[12.5px] text-slate-ink">
                  Questions? Call us at <a href={`tel:${practice.phone}`} className="num font-medium text-ink underline decoration-line-strong underline-offset-2">{practice.phone}</a>
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-card bg-surface px-4 py-3 text-[13px] text-ink-2">
                Questions? Call us at <span className="num font-medium text-ink">{practice.phone}</span>.
              </div>
            )}
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-line px-6 py-2.5 text-[11.5px] text-slate-ink">
          <span className="flex items-center gap-1">
            <Bolt className="size-3 text-teal" /> Sent with ChairFill
          </span>
          <SimTag />
        </footer>
      </article>

      <aside className="hidden text-center md:block">
        <div className="rounded-card border border-line bg-white p-4">
          {origin ? <QRCodeSVG value={`${origin}/o/${code}`} size={156} fgColor="#17202A" bgColor="#ffffff" level="M" className="mx-auto" /> : <Skeleton className="mx-auto size-[156px]" />}
          <p className="mt-3 text-[13px] font-medium text-ink">Try it on your phone</p>
          <p className="mt-1 text-[12px] text-slate-ink">Scan to open this offer the way {resolved.firstName} would. Your phone keeps its own demo copy.</p>
        </div>
        <p className="mt-3 text-[12px] text-slate-ink">
          Tap yes here while the fill is running and watch the front desk timeline react.
        </p>
      </aside>
    </div>
  );
}

function Headline({ view, firstName, procedure, slotStart }: { view: View; firstName: string; procedure: string; slotStart: string }) {
  const day = smsDay(slotStart, demoNow());
  const copy: Record<View, { title: string; body?: string }> = {
    open: { title: `Hi ${firstName}, a ${procedure} just opened up ${day === "today" ? "today" : day === "tomorrow" ? "tomorrow" : "earlier"}.`, body: "Want it?" },
    sending: { title: `Hi ${firstName}, a ${procedure} just opened up.`, body: "Saving your answer…" },
    confirming: { title: "You got it.", body: "Writing it into the schedule now." },
    won: { title: "You're booked." },
    taken: {
      title: "So close. Someone grabbed this one first.",
      body: "You're still on our list, and we'll text you the next time something opens up.",
    },
    declined: { title: `Thanks for letting us know, ${firstName}.`, body: "You're still on our list. We'll text you about the next opening." },
    expired: { title: "This offer timed out.", body: "We moved on to the next person, but you're still on our list." },
    closed: { title: "This opening isn't available anymore.", body: "You're still on our list. We'll text you about the next one." },
  };
  const c = copy[view];
  return (
    <div>
      <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink">{c.title}</h1>
      {c.body ? <p className="mt-1 text-[15px] text-ink-2">{c.body}</p> : null}
    </div>
  );
}

function SlotDetails({
  slot,
  typeName,
  durationMin,
  provider,
  practice,
  muted,
}: {
  slot: Appointment;
  typeName: string;
  durationMin: number;
  provider: string;
  practice: { address: { line1: string; city: string } };
  muted?: boolean;
}) {
  return (
    <dl className={`mt-4 divide-y divide-line rounded-card border border-line ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <dt className="text-[13px] text-slate-ink">When</dt>
        <dd className="text-right">
          <span className="block text-[15px] font-semibold text-ink">{fmtDayLong(slot.start)}</span>
          <span className="num block text-[15px] text-ink">{fmtRange(slot.start, slot.durationMin)}</span>
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <dt className="text-[13px] text-slate-ink">Visit</dt>
        <dd className="text-right text-[14px] text-ink">
          {typeName}, about {durationMin} min
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <dt className="text-[13px] text-slate-ink">With</dt>
        <dd className="text-right text-[14px] text-ink">{provider}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <dt className="text-[13px] text-slate-ink">Where</dt>
        <dd className="text-right text-[14px] text-ink">
          {practice.address.line1}, {practice.address.city}
        </dd>
      </div>
    </dl>
  );
}

function Confirmation({ resolved, confirming }: { resolved: Resolved; confirming: boolean }) {
  const practice = useDemo((s) => s.practice);
  const providers = useDemo((s) => s.providers);
  const reduced = useReducedMotionPref();
  const [mapNote, setMapNote] = useState(false);
  const { slot } = resolved;
  const type = practice.appointmentTypes.find((t) => t.id === slot.typeId)!;
  const provider = providers.find((p) => p.id === slot.providerId)!;
  const address = `${practice.address.line1}, ${practice.address.city}, ${practice.address.state} ${practice.address.zip}`;
  return (
    <div className="px-6 pb-6 pt-5" data-testid="patient-confirmed">
      <div className="flex items-start gap-3">
        <motion.span
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-card ${confirming ? "open-outline-amber" : "bg-teal text-white animate-fill-pulse"}`}
        >
          {confirming ? <span className="size-2 animate-typing rounded-full bg-amber" /> : <Check className="size-5" strokeWidth={2.5} />}
        </motion.span>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink">{confirming ? "You got it." : `You're booked, ${resolved.firstName}.`}</h1>
          <p className="mt-0.5 text-[15px] text-ink-2">{confirming ? "Writing it into the schedule now." : "We just sent you a confirmation text."}</p>
        </div>
      </div>

      <SlotDetails slot={slot} typeName={type.name} durationMin={type.durationMin} provider={`${provider.name}, ${provider.credentials}`} practice={practice} />

      {!confirming ? (
        <>
          <section className="mt-5">
            <h2 className="text-[14px] font-semibold text-ink">Getting here</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">{practice.directions}</p>
            <button
              type="button"
              onClick={() => setMapNote(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-teal-ink hover:underline"
            >
              <MapPin className="size-4" /> Open in Maps
            </button>
            {mapNote ? (
              <p className="mt-1.5 flex items-start gap-2 text-[12px] text-slate-ink">
                <SimTag className="shrink-0" /> {maps.directionsLabel(address).replace("Simulated: ", "")}
              </p>
            ) : null}
          </section>
          <section className="mt-5">
            <h2 className="text-[14px] font-semibold text-ink">Before you come in</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">{type.prep}</p>
          </section>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                downloadIcs(
                  `maple-family-dental-${slot.start.slice(0, 10)}.ics`,
                  buildIcs({
                    uid: `${slot.id}-${resolved.key}`,
                    title: `${type.name} at ${practice.name}`,
                    start: slot.start,
                    durationMin: slot.durationMin,
                    location: address,
                    description: `With ${provider.name}. ${type.prep} Need to change it? Call ${practice.phone}.`,
                  }),
                )
              }
            >
              <CalendarPlus className="size-4" /> Add to calendar
            </Button>
            <a
              href={`tel:${practice.phone}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-card border border-line-strong px-5 text-[15px] font-medium text-ink hover:bg-surface"
            >
              <Phone className="size-4" /> Call to change it
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="w-full max-w-[440px] rounded-[12px] border border-line bg-white p-6" aria-busy="true" aria-label="Loading your offer">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-6 w-64" />
      <Skeleton className="mt-2 h-4 w-24" />
      <Skeleton className="mt-5 h-40 w-full" />
      <Skeleton className="mt-5 h-16 w-full" />
      <Skeleton className="mt-3 h-16 w-full" />
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="w-full max-w-[440px] rounded-[12px] border border-line bg-white p-6">
      <div className="open-outline flex h-16 items-center justify-center rounded-card text-[13px] text-slate-ink">No opening found</div>
      <h1 className="mt-5 text-[20px] font-semibold text-ink">We couldn&apos;t find that offer.</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        The link may have been mistyped, or the opening was already filled. You&apos;re still on our list, and we&apos;ll text you about the next one.
      </p>
      <p className="mt-4 text-[13px] text-slate-ink">
        Questions? Call Maple Family Dental at <span className="num text-ink">(805) 555-0100</span>.
      </p>
    </div>
  );
}

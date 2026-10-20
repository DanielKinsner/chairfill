// The simulated SMS conversation engine.
//
// A fill run is a small state machine driven by timed events in "sim time"
// (milliseconds since the run started). Patients' replies come from
// /data/sim-replies.json, so a demo fill plays out the same way every time:
// offers go out, phones show delivered/read/typing, the first YES wins, the
// winner gets a confirmation, everyone else hears it's taken, and the
// appointment is written to the schedule.
//
// Everything here is pure. The store feeds events in; the driver
// (components/SimDriver) decides how fast sim time passes on screen.
//
// TODO(production): replace scripted replies with inbound Twilio webhooks
// (see lib/adapters/sms.ts). The state machine stays the same.

import { hash32 } from "./offer-code";
import { renderTemplate } from "./templates";
import type {
  Candidate,
  FillRun,
  OfferOutcome,
  OfferStatus,
  RunOffer,
  Settings,
  SimEvent,
  SimScript,
  Templates,
  TimelineEntry,
} from "./types";

/** Gaps of quiet longer than this get fast-forwarded during demo playback. */
export const FF_THRESHOLD_MS = 12_000;
/** How long a fast-forward takes on screen. */
export const FF_REAL_MS = 1_800;
/** After the chair is filled, replies that land within this window still show up. */
export const LATE_REPLY_WINDOW_MS = 60_000;

const ACTIVE: OfferStatus[] = ["queued", "sent", "delivered", "read", "typing"];
const GROUPABLE: TimelineEntry["kind"][] = ["sent", "delivered", "notified-taken", "expired"];

export type Effect =
  | { type: "offered"; key: string; t: number }
  | { type: "outcome"; key: string; outcome: OfferOutcome }
  | { type: "book"; key: string; t: number }
  | { type: "unfilled"; t: number };

export interface CreateRunInput {
  id: string;
  slotId: string;
  startedAt: string;
  candidates: Pick<Candidate, "key" | "name" | "firstName" | "phone" | "kind" | "bookedAppointmentId">[];
  settings: Pick<Settings, "strategy" | "batchSize" | "offerWindowMin">;
  templates: Templates;
  slotLabel: FillRun["slotLabel"];
  practiceName: string;
  linkBase: string;
  value: number;
  manual?: boolean;
  codeFor: (key: string) => string;
}

export function createRun(input: CreateRunInput): FillRun {
  const run: FillRun = {
    id: input.id,
    slotId: input.slotId,
    startedAt: input.startedAt,
    strategy: input.settings.strategy,
    batchSize: input.settings.strategy === "batch" ? Math.max(1, input.settings.batchSize) : 1,
    offerWindowSec: input.settings.offerWindowMin * 60,
    manual: !!input.manual,
    status: "running",
    queue: input.candidates.map((c) => c.key),
    offers: [],
    pending: [],
    timeline: [{ id: "t0", t: 0, kind: "start", keys: [] }],
    simT: 0,
    value: input.value,
    seq: 1,
    slotLabel: input.slotLabel,
    templates: input.templates,
    practiceName: input.practiceName,
    linkBase: input.linkBase,
    roster: input.candidates.map((c) => ({
      key: c.key,
      name: c.name,
      firstName: c.firstName,
      phone: c.phone,
      kind: c.kind,
      code: input.codeFor(c.key),
      bookedAppointmentId: c.bookedAppointmentId,
    })),
  };
  dispatch(run, 0);
  return run;
}

function nextId(run: FillRun, prefix: string) {
  run.seq += 1;
  return `${prefix}${run.seq}`;
}

function push(run: FillRun, ev: Omit<SimEvent, "id">) {
  run.pending.push({ ...ev, id: nextId(run, "e") });
}

function log(run: FillRun, entry: Omit<TimelineEntry, "id">) {
  const last = run.timeline[run.timeline.length - 1];
  if (last && last.kind === entry.kind && GROUPABLE.includes(entry.kind) && entry.t - last.t < 2_500) {
    for (const k of entry.keys) if (!last.keys.includes(k)) last.keys.push(k);
    return;
  }
  run.timeline.push({ ...entry, id: nextId(run, "t") });
}

function vars(run: FillRun, offer: RunOffer) {
  return {
    first_name: offer.firstName,
    procedure: run.slotLabel.procedure,
    day: run.slotLabel.day,
    time: run.slotLabel.time,
    provider: run.slotLabel.provider,
    practice: run.practiceName,
    link: `${run.linkBase}${offer.code}`,
  };
}

/** Send the next offer(s) if nobody is still deciding. */
function dispatch(run: FillRun, t: number) {
  if (run.status !== "running") return;
  if (run.offers.some((o) => ACTIVE.includes(o.status))) return;
  if (run.queue.length === 0) {
    push(run, { t, kind: "exhausted" });
    return;
  }
  const take = run.queue.splice(0, run.batchSize);
  take.forEach((key, i) => {
    const base = run.roster.find((o) => o.key === key);
    if (!base) return;
    run.offers.push({ ...base, status: "queued", messages: [] });
    push(run, { t: t + i * 350, kind: "send", key });
  });
}

function planReplies(run: FillRun, offer: RunOffer, t: number, script: SimScript) {
  const s = script.patients[offer.key] ?? script.default;
  const h = hash32(offer.key + run.slotId);
  const delivered = t + 1_100 + (h % 1_600);
  push(run, { t: delivered, kind: "delivered", key: offer.key });
  if (s.reply !== "none") {
    const after = Math.max(2_000, s.afterSec * 1000);
    if (after >= 6_000) push(run, { t: Math.max(delivered + 800, t + after * 0.45), kind: "read", key: offer.key });
    if (after >= 8_000) push(run, { t: t + after - Math.min(4_500, after * 0.22), kind: "typing", key: offer.key });
    push(run, {
      t: t + after,
      kind: "reply",
      key: offer.key,
      reply: s.reply,
      text: s.text ?? (s.reply === "yes" ? "YES" : "NO"),
    });
  } else if (h % 3 === 0) {
    // Some people read it and never answer. Real life.
    push(run, { t: delivered + 7_000 + (h % 15_000), kind: "read", key: offer.key });
  }
  push(run, { t: t + run.offerWindowSec * 1000, kind: "expire", key: offer.key });
}

const sortPending = (run: FillRun) =>
  run.pending.sort((a, b) => a.t - b.t || Number(a.id.slice(1)) - Number(b.id.slice(1)));

export function nextEventT(run: FillRun): number | undefined {
  if (run.pending.length === 0) return undefined;
  return Math.min(...run.pending.map((e) => e.t));
}

/** Process every pending event up to and including sim time `until`. */
export function advance(input: FillRun, until: number, script: SimScript): { run: FillRun; effects: Effect[] } {
  const run: FillRun = structuredClone(input);
  const effects: Effect[] = [];
  for (;;) {
    sortPending(run);
    const ev = run.pending[0];
    if (!ev || ev.t > until) break;
    run.pending.shift();
    run.simT = Math.max(run.simT, ev.t);
    apply(run, ev, script, effects);
  }
  run.simT = Math.max(run.simT, Math.min(until, nextEventT(run) ?? until));
  return { run, effects };
}

/** Advance until nothing is left. Handy for tests and for "skip to the end". */
export function runToEnd(input: FillRun, script: SimScript, limit = 24 * 3600_000) {
  let run = input;
  const effects: Effect[] = [];
  for (let i = 0; i < 500; i++) {
    const n = nextEventT(run);
    if (n === undefined || n > limit) break;
    const r = advance(run, n, script);
    run = r.run;
    effects.push(...r.effects);
  }
  return { run, effects };
}

/** A patient tapped YES or NO on the patient page (or the desk logged a reply by hand). */
export function injectReply(input: FillRun, key: string, reply: "yes" | "no", t: number, text?: string): FillRun {
  const run: FillRun = structuredClone(input);
  run.pending = run.pending.filter((e) => !(e.key === key && (e.kind === "read" || e.kind === "typing" || e.kind === "reply")));
  push(run, { t: Math.max(t, run.simT), kind: "reply", key, reply, text: text ?? (reply === "yes" ? "YES" : "NO"), live: true });
  return run;
}

/** The desk pulled the plug. Nobody else gets texted. */
export function cancelRun(input: FillRun, t: number): FillRun {
  const run: FillRun = structuredClone(input);
  run.status = "cancelled";
  run.pending = [];
  log(run, { t, kind: "skipped", keys: [], text: "Stopped by the front desk. No more offers will go out." });
  return run;
}

function apply(run: FillRun, ev: SimEvent, script: SimScript, effects: Effect[]) {
  const offer = ev.key ? run.offers.find((o) => o.key === ev.key) : undefined;
  const active = offer ? ACTIVE.includes(offer.status) : false;

  switch (ev.kind) {
    case "send": {
      if (!offer || offer.status !== "queued" || run.status !== "running") return;
      offer.status = "sent";
      offer.sentAt = ev.t;
      offer.messages.push({ dir: "out", body: renderTemplate(run.templates.offer, vars(run, offer)), t: ev.t, kind: "offer" });
      log(run, { t: ev.t, kind: "sent", keys: [offer.key] });
      effects.push({ type: "offered", key: offer.key, t: ev.t });
      planReplies(run, offer, ev.t, script);
      return;
    }
    case "delivered": {
      if (!offer || offer.status !== "sent") return;
      offer.status = "delivered";
      log(run, { t: ev.t, kind: "delivered", keys: [offer.key] });
      return;
    }
    case "read": {
      if (!offer || !["sent", "delivered"].includes(offer.status) || run.status !== "running") return;
      offer.status = "read";
      log(run, { t: ev.t, kind: "read", keys: [offer.key] });
      return;
    }
    case "typing": {
      if (!offer || !active || run.status !== "running") return;
      offer.status = "typing";
      log(run, { t: ev.t, kind: "typing", keys: [offer.key] });
      return;
    }
    case "reply": {
      if (!offer) return;
      offer.messages.push({ dir: "in", body: ev.text ?? (ev.reply === "yes" ? "YES" : "NO"), t: ev.t, kind: "reply" });
      offer.repliedAt = ev.t;
      offer.replyText = ev.text;
      if (run.status === "running" && active) {
        if (ev.reply === "yes") return win(run, offer, ev.t, effects, ev.text);
        offer.status = "no";
        log(run, { t: ev.t, kind: "no", keys: [offer.key], text: ev.text });
        run.pending = run.pending.filter((e) => !(e.key === offer.key && e.kind === "expire"));
        push(run, { t: ev.t + 700, kind: "notify-declined", key: offer.key });
        effects.push({ type: "outcome", key: offer.key, outcome: "declined" });
        dispatch(run, ev.t + 1_200);
        return;
      }
      // The chair is already spoken for.
      offer.status = ev.reply === "yes" ? "late-yes" : "late-no";
      log(run, { t: ev.t, kind: ev.reply === "yes" ? "late-yes" : "late-no", keys: [offer.key], text: ev.text });
      if (ev.reply === "yes") effects.push({ type: "outcome", key: offer.key, outcome: "late-yes" });
      return;
    }
    case "expire": {
      if (!offer || !active || run.status !== "running") return;
      offer.status = "expired";
      log(run, { t: ev.t, kind: "expired", keys: [offer.key] });
      effects.push({ type: "outcome", key: offer.key, outcome: "no-reply" });
      dispatch(run, ev.t + 500);
      return;
    }
    case "confirm":
      log(run, { t: ev.t, kind: "confirmed", keys: run.winner ? [run.winner] : [] });
      return;
    case "notify-winner": {
      if (!offer) return;
      offer.messages.push({ dir: "out", body: renderTemplate(run.templates.confirm, vars(run, offer)), t: ev.t, kind: "confirm" });
      log(run, { t: ev.t, kind: "notified-winner", keys: [offer.key] });
      return;
    }
    case "notify-taken": {
      if (!offer) return;
      if (ACTIVE.includes(offer.status)) offer.status = "taken";
      offer.messages.push({ dir: "out", body: renderTemplate(run.templates.taken, vars(run, offer)), t: ev.t, kind: "taken" });
      log(run, { t: ev.t, kind: "notified-taken", keys: [offer.key] });
      effects.push({ type: "outcome", key: offer.key, outcome: "taken" });
      return;
    }
    case "notify-declined": {
      if (!offer) return;
      offer.messages.push({ dir: "out", body: renderTemplate(run.templates.declined, vars(run, offer)), t: ev.t, kind: "declined" });
      log(run, { t: ev.t, kind: "notified-declined", keys: [offer.key] });
      return;
    }
    case "book":
      log(run, { t: ev.t, kind: "booked", keys: run.winner ? [run.winner] : [] });
      if (run.winner) effects.push({ type: "book", key: run.winner, t: ev.t });
      return;
    case "exhausted":
      if (run.status !== "running") return;
      run.status = "unfilled";
      log(run, { t: ev.t, kind: "exhausted", keys: [] });
      effects.push({ type: "unfilled", t: ev.t });
      return;
  }
}

function win(run: FillRun, offer: RunOffer, t: number, effects: Effect[], text?: string) {
  offer.status = "yes";
  run.status = "filled";
  run.winner = offer.key;
  run.filledAtT = t;
  log(run, { t, kind: "yes", keys: [offer.key], text });
  effects.push({ type: "outcome", key: offer.key, outcome: "won" });

  // Unsent offers never go out; timers and typing bubbles stop.
  const unsent = new Set(run.offers.filter((o) => o.status === "queued").map((o) => o.key));
  run.offers = run.offers.filter((o) => !unsent.has(o.key));
  run.pending = run.pending.filter((e) => {
    if (e.key && unsent.has(e.key)) return false;
    if (e.kind === "expire" || e.kind === "send" || e.kind === "typing" || e.kind === "read") return false;
    if (e.kind === "reply") return e.t <= t + LATE_REPLY_WINDOW_MS;
    return true;
  });

  push(run, { t: t + 800, kind: "confirm" });
  push(run, { t: t + 1_500, kind: "notify-winner", key: offer.key });
  run.offers
    .filter((o) => o.key !== offer.key && ACTIVE.includes(o.status))
    .forEach((o, i) => push(run, { t: t + 2_200 + i * 300, kind: "notify-taken", key: o.key }));
  push(run, { t: t + 3_400, kind: "book" });
}

/** Real milliseconds to wait before the next sim event, given the demo pace. */
export function realDelayFor(gapSimMs: number, pace: number): { ms: number; fastForward: boolean } {
  if (gapSimMs > FF_THRESHOLD_MS) return { ms: FF_REAL_MS, fastForward: true };
  return { ms: Math.max(0, gapSimMs / Math.max(0.25, pace)), fastForward: false };
}

export const isActiveStatus = (s: OfferStatus) => ACTIVE.includes(s);

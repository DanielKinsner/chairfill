"use client";

// The demo's whole world lives here: in memory, mirrored to localStorage,
// seeded from /data. "Reset demo data" puts the seed back.
//
// AUTH: in production every action below runs on the server behind a staff
// session (front desk / office manager roles). The demo has no login; the
// role switcher in the header stands in for it.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { offerCode } from "./offer-code";
import { rankCandidates, type RankResult } from "./ranking";
import { seedData, SEED_VERSION, SIM_SCRIPT, type AuditEntry, type DemoData } from "./seed";
import { advance, cancelRun, createRun, injectReply, type Effect } from "./sms-sim";
import { addSeconds, DEMO_START, fmtDay, fmtTime, smsDay, toMs, toPT } from "./time";
import type { Appointment, Candidate, FillRecord, FillRun, Settings, Templates, WaitlistEntry } from "./types";
import { sms } from "./adapters/sms";
import { pms } from "./adapters/pms";

export interface Toast {
  id: string;
  tone: "filled" | "info" | "warn";
  title: string;
  body?: string;
  action?: { label: string; href: string };
}

// ---------------------------------------------------------------- runtime (not persisted)

interface Runtime {
  /** Demo clock: demo ms = anchorDemo + (Date.now() - anchorReal). */
  anchorDemo: number;
  anchorReal: number;
  /** Live sim time per run, for smooth timers on screen. */
  sim: Record<string, { t: number; ff: boolean }>;
  toasts: Toast[];
  isLeader: boolean;
  /** Slots ChairFill just filled (slot id -> real ms), for the one soft pulse on the schedule. */
  flashes: Record<string, number>;
  /** The slot whose fill screen is open, if any. */
  openFill: string | null;
}

export const useRuntime = create<Runtime>(() => ({
  anchorDemo: toMs(DEMO_START),
  anchorReal: Date.now(),
  sim: {},
  toasts: [],
  isLeader: true,
  flashes: {},
  openFill: null,
}));

export function demoNowMs(): number {
  const r = useRuntime.getState();
  return r.anchorDemo + (Date.now() - r.anchorReal);
}
export const demoNow = () => toPT(demoNowMs());

/** Move the clock forward (never back), e.g. after a run fast-forwards through a 10-minute wait. */
export function bumpClock(toIso: string) {
  const target = toMs(toIso);
  if (target > demoNowMs()) useRuntime.setState({ anchorDemo: target, anchorReal: Date.now() });
}

export function pushToast(t: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  useRuntime.setState((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
  setTimeout(() => dismissToast(id), t.action ? 9000 : 5500);
}
export function dismissToast(id: string) {
  useRuntime.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
}

// ---------------------------------------------------------------- persisted store

export interface StartFillOptions {
  strategy?: Settings["strategy"];
  candidateKeys?: string[];
  manual?: boolean;
}

interface Actions {
  reset: () => void;
  rank: (slotId: string) => RankResult | null;
  startFill: (slotId: string, opts?: StartFillOptions) => string | null;
  stopFill: (runId: string) => void;
  commitRun: (run: FillRun, effects: Effect[]) => void;
  replyToRun: (runId: string, key: string, reply: "yes" | "no", t: number) => void;
  bookDirect: (slotId: string, key: string) => void;
  recordPatientNo: (code: string, key: string) => void;
  addWaitlist: (entry: Omit<WaitlistEntry, "id">) => void;
  updateWaitlist: (id: string, patch: Partial<WaitlistEntry>) => void;
  removeWaitlist: (id: string) => void;
  importWaitlist: (entries: Omit<WaitlistEntry, "id">[], source: string) => number;
  updateSettings: (patch: Partial<Settings>) => void;
  updateTemplates: (patch: Partial<Templates>) => void;
  updatePractice: (patch: Partial<DemoData["practice"]>) => void;
  updateProviders: (providers: DemoData["providers"], chairs: DemoData["chairs"]) => void;
  completeSetup: () => void;
  logAudit: (action: string, detail?: string, actor?: string) => void;
}

export type DemoStore = DemoData & Actions;

const nid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useDemo = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seedData(),

      reset: () => {
        set({ ...seedData() });
        useRuntime.setState({ anchorDemo: toMs(DEMO_START), anchorReal: Date.now(), sim: {} });
        try {
          localStorage.removeItem(INBOX_KEY);
        } catch {}
      },

      rank: (slotId) => {
        const s = get();
        const slot = s.appointments.find((a) => a.id === slotId);
        if (!slot) return null;
        return rankCandidates({
          slot,
          types: s.practice.appointmentTypes,
          waitlist: s.waitlist,
          appointments: s.appointments,
          settings: s.settings,
          now: demoNow(),
          offerLog: s.offerLog,
        });
      },

      startFill: (slotId, opts = {}) => {
        const s = get();
        const slot = s.appointments.find((a) => a.id === slotId);
        const ranked = s.rank(slotId);
        if (!slot || !ranked) return null;
        const existing = s.runs.find((r) => r.slotId === slotId && r.status === "running");
        if (existing) return existing.id;

        const everyone: Candidate[] = [...ranked.ranked, ...ranked.excluded.map((e) => e.candidate)];
        const candidates = opts.candidateKeys
          ? (opts.candidateKeys.map((k) => everyone.find((c) => c.key === k)).filter(Boolean) as Candidate[])
          : ranked.ranked;
        if (candidates.length === 0) return null;

        const type = s.practice.appointmentTypes.find((t) => t.id === slot.typeId)!;
        const provider = s.providers.find((p) => p.id === slot.providerId)!;
        const now = demoNow();
        const id = nid("run-");
        const run = createRun({
          id,
          slotId,
          startedAt: now,
          candidates,
          settings: { ...s.settings, strategy: opts.strategy ?? s.settings.strategy },
          templates: s.templates,
          slotLabel: {
            day: smsDay(slot.start, now),
            time: fmtTime(slot.start),
            procedure: type.name.toLowerCase(),
            provider: provider.smsName,
          },
          practiceName: s.practice.name,
          linkBase: typeof window === "undefined" ? "chairfill.app/o/" : `${window.location.host}/o/`,
          value: type.value,
          manual: opts.manual,
          codeFor: (k) => offerCode(slotId, k),
        });
        set({ runs: [...s.runs.filter((r) => !(r.slotId === slotId && r.status !== "filled")), run] });
        get().logAudit(
          opts.manual ? `Texted ${candidates[0].name} directly` : `Started filling ${fmtDay(slot.start)} ${fmtTime(slot.start)}`,
          `${type.name} with ${provider.name}. ${candidates.length} people in line, ${run.strategy === "batch" ? `${run.batchSize} at a time` : "one at a time"}.`,
        );
        return id;
      },

      stopFill: (runId) => {
        const s = get();
        const run = s.runs.find((r) => r.id === runId);
        if (!run || run.status !== "running") return;
        const t = useRuntime.getState().sim[runId]?.t ?? run.simT;
        set({ runs: s.runs.map((r) => (r.id === runId ? cancelRun(r, t) : r)) });
        get().logAudit("Stopped a fill", "No more offers will go out for this slot.");
      },

      replyToRun: (runId, key, reply, t) => {
        const s = get();
        set({ runs: s.runs.map((r) => (r.id === runId ? injectReply(r, key, reply, t) : r)) });
      },

      commitRun: (run, effects) => {
        set((s) => ({ runs: s.runs.map((r) => (r.id === run.id ? run : r)) }));
        for (const e of effects) applyEffect(run, e);
        bumpClock(addSeconds(run.startedAt, run.simT / 1000));
        set({ clockFloor: demoNow() });
      },

      bookDirect: (slotId, key) => {
        const s = get();
        const slot = s.appointments.find((a) => a.id === slotId);
        const ranked = s.rank(slotId);
        if (!slot || !ranked) return;
        const c = [...ranked.ranked, ...ranked.excluded.map((e) => e.candidate)].find((x) => x.key === key);
        if (!c) return;
        const id = s.startFill(slotId, { candidateKeys: [key], manual: true, strategy: "one" });
        if (!id) return;
        // They said yes on the phone. Skip the offer text, confirm and book.
        const run = get().runs.find((r) => r.id === id)!;
        const live = injectReply(run, key, "yes", 0, "Said yes on the phone with the front desk");
        const { run: done, effects } = advance(live, 0, SIM_SCRIPT);
        get().commitRun(done, effects);
      },

      recordPatientNo: (code, key) => {
        set((s) => ({
          patientReplies: { ...s.patientReplies, [code]: "no" },
          waitlist: s.waitlist.map((w) => (w.id === key ? { ...w, lastOffer: { at: demoNow(), outcome: "declined" } } : w)),
        }));
      },

      addWaitlist: (entry) => {
        const w = { ...entry, id: nid("w-") };
        set((s) => ({ waitlist: [w, ...s.waitlist] }));
        get().logAudit(`Added ${w.firstName} ${w.lastName} to the waitlist`);
      },
      updateWaitlist: (id, patch) => {
        set((s) => ({ waitlist: s.waitlist.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
      },
      removeWaitlist: (id) => {
        const w = get().waitlist.find((x) => x.id === id);
        set((s) => ({ waitlist: s.waitlist.filter((x) => x.id !== id) }));
        if (w) get().logAudit(`Took ${w.firstName} ${w.lastName} off the waitlist`);
      },
      importWaitlist: (entries, source) => {
        const withIds = entries.map((e) => ({ ...e, id: nid("w-") }));
        set((s) => ({ waitlist: [...withIds, ...s.waitlist] }));
        get().logAudit(`Imported ${withIds.length} patients to the waitlist`, `From ${source}.`);
        void pms.recordImport(source, withIds.length);
        return withIds.length;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      updateTemplates: (patch) => set((s) => ({ templates: { ...s.templates, ...patch } })),
      updatePractice: (patch) => set((s) => ({ practice: { ...s.practice, ...patch } })),
      updateProviders: (providers, chairs) => set({ providers, chairs }),
      completeSetup: () => {
        set({ setupComplete: true });
        get().logAudit("Finished setup", undefined, get().practice.officeManager);
      },
      logAudit: (action, detail, actor = "Kim Albers") => {
        const entry: AuditEntry = { id: nid("a-"), at: demoNow(), actor, action, detail };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 200) }));
      },
    }),
    {
      name: "chairfill-demo",
      version: SEED_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: () => seedData() as unknown as DemoStore,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Resume the demo clock where the last session left off (or at 9:41 AM on a fresh start).
        const floor = Math.max(toMs(DEMO_START), toMs(state.clockFloor ?? DEMO_START));
        useRuntime.setState({ anchorDemo: floor, anchorReal: Date.now() });
      },
    },
  ),
);

// ---------------------------------------------------------------- effects

function applyEffect(run: FillRun, e: Effect) {
  const s = useDemo.getState();
  const at = addSeconds(run.startedAt, ("t" in e ? e.t : run.simT) / 1000);
  switch (e.type) {
    case "offered": {
      useDemo.setState({ offerLog: [...s.offerLog, { key: e.key, at }] });
      const offer = run.offers.find((o) => o.key === e.key);
      if (offer) void sms.send(offer.phone, offer.messages[0]?.body ?? "");
      updateLastOffer(e.key, { at, outcome: "no-reply" });
      return;
    }
    case "outcome":
      updateLastOffer(e.key, { outcome: e.outcome });
      return;
    case "book": {
      const slot = s.appointments.find((a) => a.id === run.slotId);
      const offer = run.offers.find((o) => o.key === e.key);
      if (!slot || !offer) return;
      const moveUp = offer.kind === "moveup";
      const freed = moveUp ? s.appointments.find((a) => a.id === offer.bookedAppointmentId) : undefined;
      const appointments = s.appointments.map((a): Appointment => {
        if (a.id === slot.id)
          return {
            ...a,
            status: "booked",
            source: "chairfill",
            fillId: run.id,
            patient: { id: offer.key, name: offer.name, phone: offer.phone },
            earlierOk: false,
            cancel: a.cancel ? { ...a.cancel, patient: a.cancel.patient ?? a.patient.name } : a.cancel,
            note: moveUp && freed ? `Moved up from ${fmtDay(freed.start)} ${fmtTime(freed.start)}` : undefined,
          };
        if (freed && a.id === freed.id)
          return {
            ...a,
            status: "cancelled",
            earlierOk: false,
            cancel: { at, via: "ChairFill", reason: `Moved up to ${fmtDay(slot.start)} ${fmtTime(slot.start)}.` },
            openedBy: { fillId: run.id, patientName: offer.name },
          };
        return a;
      });
      const record: FillRecord = {
        id: run.id,
        status: "filled",
        slotStart: slot.start,
        chairId: slot.chairId,
        providerId: slot.providerId,
        typeId: slot.typeId,
        value: run.value,
        winner: offer.name,
        offers: run.offers.filter((o) => o.sentAt !== undefined || o.key === e.key).map((o) => o.name),
        minutesToFill: Math.max(0.1, Math.round(((run.filledAtT ?? e.t) / 60000) * 10) / 10),
        cancelledAt: slot.cancel?.at,
        strategy: run.strategy,
        runId: run.id,
        moveUp,
      };
      useDemo.setState({
        appointments,
        waitlist: offer.kind === "waitlist" ? s.waitlist.filter((w) => w.id !== offer.key) : s.waitlist,
        history: [...s.history.filter((h) => h.id !== run.id), record],
      });
      void pms.writeAppointment(slot.id, offer.name);
      useRuntime.setState((r) => ({ flashes: { ...r.flashes, [slot.id]: Date.now() } }));
      // The fill screen already says so; only toast when the desk is looking elsewhere.
      if (useRuntime.getState().openFill !== slot.id) {
        pushToast({
          tone: "filled",
          title: `Chair filled: ${offer.name}`,
          body: `${fmtDay(slot.start)} at ${fmtTime(slot.start)}. $${run.value.toLocaleString()} back on the books.`,
        });
      }
      if (freed) {
        setTimeout(
          () =>
            pushToast({
              tone: "info",
              title: `${offer.firstName}'s old time is open now`,
              body: `${fmtDay(freed.start)} at ${fmtTime(freed.start)}. Fill it from the waitlist?`,
              action: { label: "Fill it", href: `/schedule?fill=${freed.id}` },
            }),
          1200,
        );
      }
      return;
    }
    case "unfilled": {
      const slot = s.appointments.find((a) => a.id === run.slotId);
      if (!slot) return;
      const record: FillRecord = {
        id: run.id,
        status: "unfilled",
        slotStart: slot.start,
        chairId: slot.chairId,
        providerId: slot.providerId,
        typeId: slot.typeId,
        value: run.value,
        offers: run.offers.map((o) => o.name),
        cancelledAt: slot.cancel?.at,
        strategy: run.strategy,
        reason: "Everyone in line said no or didn't answer in time.",
        runId: run.id,
      };
      useDemo.setState({ history: [...s.history.filter((h) => h.id !== run.id), record] });
      pushToast({ tone: "warn", title: "Nobody took it this round", body: "The slot is still open. You can text the next people in line." });
      return;
    }
  }
}

function updateLastOffer(key: string, patch: Partial<NonNullable<WaitlistEntry["lastOffer"]>>) {
  const s = useDemo.getState();
  if (!s.waitlist.some((w) => w.id === key)) return;
  useDemo.setState({
    waitlist: s.waitlist.map((w) =>
      w.id === key ? { ...w, lastOffer: { at: patch.at ?? w.lastOffer?.at ?? demoNow(), outcome: patch.outcome ?? w.lastOffer?.outcome ?? "no-reply" } } : w,
    ),
  });
}

// ---------------------------------------------------------------- patient replies across tabs

/** Patient pages drop replies here; whichever tab runs the simulation picks them up. */
export const INBOX_KEY = "chairfill-inbox";

export interface InboxReply {
  runId: string;
  key: string;
  reply: "yes" | "no";
  at: number;
}

export function postReply(r: Omit<InboxReply, "at">) {
  try {
    const list: InboxReply[] = JSON.parse(localStorage.getItem(INBOX_KEY) ?? "[]");
    list.push({ ...r, at: Date.now() });
    localStorage.setItem(INBOX_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked (private mode): fall back to replying in this tab.
    const t = useRuntime.getState().sim[r.runId]?.t ?? 0;
    useDemo.getState().replyToRun(r.runId, r.key, r.reply, t);
  }
}

export function drainInbox(): InboxReply[] {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw || raw === "[]") return [];
    localStorage.setItem(INBOX_KEY, "[]");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- selectors

export function slotRun(runs: FillRun[], slotId: string): FillRun | undefined {
  const mine = runs.filter((r) => r.slotId === slotId);
  return mine.find((r) => r.status === "running") ?? mine[mine.length - 1];
}

export function findOfferByCode(state: DemoData, code: string) {
  for (let i = state.runs.length - 1; i >= 0; i--) {
    const run = state.runs[i];
    const offer = run.offers.find((o) => o.code === code);
    if (offer) return { run, offer, slot: state.appointments.find((a) => a.id === run.slotId) };
  }
  return undefined;
}

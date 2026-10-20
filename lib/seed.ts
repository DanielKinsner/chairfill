import practiceJson from "@/data/practice.json";
import providersJson from "@/data/providers.json";
import scheduleJson from "@/data/schedule.json";
import waitlistJson from "@/data/waitlist.json";
import templatesJson from "@/data/templates.json";
import simJson from "@/data/sim-replies.json";
import historyJson from "@/data/history.json";
import { DEFAULT_SETTINGS } from "./defaults";
import { DEMO_START } from "./time";
import type {
  Appointment,
  Chair,
  FillRecord,
  FillRun,
  Practice,
  Provider,
  Settings,
  SimScript,
  Templates,
  WaitlistEntry,
} from "./types";
import type { OfferLogEntry } from "./ranking";

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface DemoData {
  version: number;
  practice: Practice;
  providers: Provider[];
  chairs: Chair[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  templates: Templates;
  settings: Settings;
  history: FillRecord[];
  runs: FillRun[];
  offerLog: OfferLogEntry[];
  audit: AuditEntry[];
  setupComplete: boolean;
  clockFloor: string;
  /** Replies from the patient page when no fill is running (e.g. a phone that scanned the QR). */
  patientReplies: Record<string, "no">;
}

export const SEED_VERSION = 3;
export const SIM_SCRIPT = simJson as SimScript;

export function seedData(): DemoData {
  const waitlist = structuredClone(waitlistJson) as WaitlistEntry[];
  const history = structuredClone(historyJson.fills) as FillRecord[];
  // Who was texted recently, so the 24-hour cooldown has something to work with on day one.
  const offerLog: OfferLogEntry[] = waitlist.filter((w) => w.lastOffer).map((w) => ({ key: w.id, at: w.lastOffer!.at }));
  return {
    version: SEED_VERSION,
    practice: structuredClone(practiceJson) as Practice,
    providers: structuredClone(providersJson.providers) as Provider[],
    chairs: structuredClone(providersJson.chairs) as Chair[],
    appointments: structuredClone(scheduleJson.appointments) as Appointment[],
    waitlist,
    templates: structuredClone(templatesJson) as Templates,
    settings: structuredClone(DEFAULT_SETTINGS),
    history,
    runs: [],
    offerLog,
    audit: [
      {
        id: "seed-1",
        at: "2026-10-20T07:52:00-07:00",
        actor: "Practice software sync",
        action: "Hannah Ruiz cancelled Tue 2:00 PM cleaning",
        detail: "By text: \"Kiddo woke up with a fever, so sorry!\"",
      },
      {
        id: "seed-2",
        at: "2026-10-20T08:31:00-07:00",
        actor: "Kim Albers",
        action: "Elaine Marsh cancelled Thu 8:00 AM perio maintenance",
        detail: "Voicemail: car's in the shop until Friday.",
      },
    ],
    setupComplete: true,
    clockFloor: DEMO_START,
    patientReplies: {},
  };
}

export const WEEK_STARTS = scheduleJson.weekStarts as string[];

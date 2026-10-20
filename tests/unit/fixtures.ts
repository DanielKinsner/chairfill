import practice from "@/data/practice.json";
import schedule from "@/data/schedule.json";
import waitlistJson from "@/data/waitlist.json";
import templatesJson from "@/data/templates.json";
import simJson from "@/data/sim-replies.json";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { rankCandidates } from "@/lib/ranking";
import { DEMO_START } from "@/lib/time";
import type { Appointment, AppointmentType, SimScript, Templates, WaitlistEntry } from "@/lib/types";

export const types = practice.appointmentTypes as AppointmentType[];
export const appointments = schedule.appointments as Appointment[];
export const waitlist = waitlistJson as WaitlistEntry[];
export const templates = templatesJson as Templates;
export const script = simJson as SimScript;
export const offerLog = waitlist.filter((w) => w.lastOffer).map((w) => ({ key: w.id, at: w.lastOffer!.at }));

export const slot = (id: string) => appointments.find((a) => a.id === id)!;

export function rank(slotId: string, overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
  return rankCandidates({
    slot: slot(slotId),
    types,
    waitlist,
    appointments,
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    now: DEMO_START,
    offerLog,
  });
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";
export type TimeWindow = "morning" | "midday" | "afternoon" | "any";
export type Urgency = "urgent" | "soon" | "routine";
export type ProviderRole = "dentist" | "hygienist";

export interface Practice {
  name: string;
  address: { line1: string; city: string; state: string; zip: string };
  phone: string;
  timezone: string;
  hours: Record<Weekday, [string, string]>;
  lunch: [string, string];
  directions: string;
  frontDesk: string[];
  officeManager: string;
  appointmentTypes: AppointmentType[];
}

export interface AppointmentType {
  id: string;
  name: string;
  durationMin: number;
  value: number;
  role: ProviderRole;
  waitlist: boolean;
  prep: string;
}

export interface Provider {
  id: string;
  name: string;
  credentials: string;
  smsName: string;
  role: ProviderRole;
  chairIds: string[];
}

export interface Chair {
  id: string;
  name: string;
  providerId: string;
}

export interface PatientRef {
  id: string;
  name: string;
  phone?: string;
}

export interface Appointment {
  id: string;
  chairId: string;
  providerId: string;
  start: string; // ISO with offset
  durationMin: number;
  typeId: string;
  patient: PatientRef;
  status: "booked" | "cancelled" | "no-show";
  source?: "chairfill";
  fillId?: string;
  earlierOk?: boolean;
  note?: string;
  cancel?: { at: string; via: string; reason: string; patient?: string };
  /** Set when a move-up freed this slot. */
  openedBy?: { fillId: string; patientName: string };
}

export interface Insurance {
  status: "verified" | "check" | "self-pay" | "expired";
  carrier?: string;
  note?: string;
}

export interface WaitlistEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  procedureId: string;
  urgency: Urgency;
  preferredDays: Weekday[];
  windows: TimeWindow[];
  addedOn: string; // YYYY-MM-DD
  insurance: Insurance;
  smsOk: boolean;
  providerPref?: string;
  notes?: string;
  lastOffer?: { at: string; outcome: OfferOutcome };
}

export type OfferOutcome = "won" | "declined" | "no-reply" | "taken" | "late-yes";

export interface Templates {
  offer: string;
  confirm: string;
  taken: string;
  declined: string;
}

export interface SimReply {
  reply: "yes" | "no" | "none";
  afterSec: number;
  text?: string;
}

export interface SimScript {
  default: SimReply;
  patients: Record<string, SimReply>;
}

export type RuleId = "procedure" | "urgency" | "window" | "waiting";

export interface Settings {
  strategy: "batch" | "one";
  batchSize: number;
  offerWindowMin: number;
  ruleOrder: RuleId[];
  moveUpsFirst: boolean;
  allowFits: boolean;
  cooldownHours: number;
  dailyCap: number;
  quietHours: { enabled: boolean; start: string; end: string };
  minLeadMinutes: number;
  demoPace: number;
}

/** A person ChairFill could text for a given open slot. */
export interface Candidate {
  key: string; // patient id (waitlist id or scheduled patient id)
  kind: "waitlist" | "moveup";
  name: string;
  firstName: string;
  phone: string;
  procedureId: string;
  urgency: Urgency;
  waitingDays: number;
  windowMatch: "full" | "partial" | "none";
  procedureMatch: "exact" | "fits";
  insurance?: Insurance;
  notes?: string;
  bookedAppointmentId?: string;
  bookedStart?: string;
  waitlistId?: string;
  lastOffer?: { at: string; outcome: OfferOutcome };
}

export interface Exclusion {
  candidate: Candidate;
  reason: "cooldown" | "daily-cap" | "no-mobile" | "provider" | "duplicate";
  detail: string;
}

// ---------------------------------------------------------------- fill runs

export type OfferStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "typing"
  | "yes"
  | "no"
  | "expired"
  | "taken"
  | "late-yes"
  | "late-no";

export interface RunOffer {
  key: string;
  name: string;
  firstName: string;
  phone: string;
  kind: Candidate["kind"];
  code: string;
  status: OfferStatus;
  sentAt?: number; // sim ms since run start
  repliedAt?: number;
  replyText?: string;
  messages: SmsMessage[];
  bookedAppointmentId?: string;
}

export interface SmsMessage {
  dir: "out" | "in";
  body: string;
  t: number;
  kind: "offer" | "confirm" | "taken" | "declined" | "reply";
}

export type SimEventKind =
  | "send"
  | "delivered"
  | "read"
  | "typing"
  | "reply"
  | "expire"
  | "confirm"
  | "notify-winner"
  | "notify-taken"
  | "notify-declined"
  | "book"
  | "exhausted";

export interface SimEvent {
  id: string;
  t: number;
  kind: SimEventKind;
  key?: string; // patient key
  reply?: "yes" | "no";
  text?: string;
  /** Replies the patient typed themselves on the patient page. */
  live?: boolean;
}

export interface TimelineEntry {
  id: string;
  t: number;
  kind:
    | "start"
    | "sent"
    | "delivered"
    | "read"
    | "typing"
    | "yes"
    | "no"
    | "expired"
    | "confirmed"
    | "notified-winner"
    | "notified-taken"
    | "notified-declined"
    | "booked"
    | "late-yes"
    | "late-no"
    | "exhausted"
    | "skipped";
  keys: string[];
  text?: string;
}

export interface FillRun {
  id: string;
  slotId: string;
  startedAt: string; // demo ISO time
  strategy: Settings["strategy"];
  batchSize: number;
  offerWindowSec: number;
  manual: boolean;
  status: "running" | "filled" | "unfilled" | "cancelled";
  queue: string[]; // candidate keys not yet offered, in rank order
  offers: RunOffer[];
  pending: SimEvent[];
  timeline: TimelineEntry[];
  simT: number; // last processed sim ms
  winner?: string;
  filledAtT?: number;
  value: number;
  seq: number;
  /** Text bodies resolved when the run started, so template edits don't rewrite history. */
  slotLabel: { day: string; time: string; procedure: string; provider: string };
  templates: Templates;
  practiceName: string;
  linkBase: string;
  /** Everyone who could be offered this chair, in rank order. */
  roster: Omit<RunOffer, "status" | "messages" | "sentAt" | "repliedAt" | "replyText">[];
}

export interface FillRecord {
  id: string;
  status: "filled" | "unfilled";
  slotStart: string;
  chairId: string;
  providerId: string;
  typeId: string;
  value: number;
  winner?: string;
  offers: string[];
  minutesToFill?: number;
  cancelledAt?: string;
  strategy: Settings["strategy"];
  reason?: string;
  notes?: string;
  runId?: string;
  moveUp?: boolean;
}

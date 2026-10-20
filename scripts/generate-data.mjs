// Generates the seed JSON in /data. Deterministic: same output every run.
// Run with: node scripts/generate-data.mjs
//
// Hand-placed records (cancellations, move-up candidates, ChairFill history,
// the whole waitlist) are written out explicitly below. The rest of the
// two-week schedule is filled in around them with a seeded PRNG so the week
// view looks like a real, busy practice.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (name, data) => {
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data", name), JSON.stringify(data, null, 2) + "\n");
  console.log("wrote data/" + name);
};

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(5052026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// October 2026 is all Pacific Daylight Time (DST ends Nov 1).
const iso = (date, hhmm) => `${date}T${hhmm}:00-07:00`;
const hm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// ---------------------------------------------------------------- practice

const practice = {
  name: "Maple Family Dental",
  address: { line1: "1142 Spring Street, Suite 2B", city: "Paso Robles", state: "CA", zip: "93446" },
  phone: "(805) 555-0100",
  timezone: "America/Los_Angeles",
  hours: {
    mon: ["08:00", "17:00"],
    tue: ["08:00", "17:00"],
    wed: ["08:00", "17:00"],
    thu: ["08:00", "17:00"],
    fri: ["08:00", "13:00"],
  },
  lunch: ["12:00", "13:00"],
  directions:
    "Park in the lot behind the building; the entrance is on 12th Street. We're upstairs in Suite 2B, and the elevator is just left of the lobby doors.",
  frontDesk: ["Kim Albers", "Tasha Reyes"],
  officeManager: "Denise Farrow",
  appointmentTypes: [
    {
      id: "cleaning",
      name: "Cleaning",
      durationMin: 60,
      value: 180,
      role: "hygienist",
      waitlist: true,
      prep: "Brush and floss like you normally would. If your doctor has you pre-medicate before dental work, take it an hour before.",
    },
    {
      id: "perio",
      name: "Perio maintenance",
      durationMin: 60,
      value: 220,
      role: "hygienist",
      waitlist: true,
      prep: "Your gums may be a little tender afterward, so plan on soft food tonight. If you pre-medicate, take it an hour before.",
    },
    {
      id: "newpt",
      name: "New patient exam",
      durationMin: 60,
      value: 240,
      role: "hygienist",
      waitlist: true,
      prep: "Bring your insurance card and a list of your medications. Come 10 minutes early for paperwork, or fill it out from the link we text you.",
    },
    {
      id: "filling",
      name: "Filling",
      durationMin: 60,
      value: 260,
      role: "dentist",
      waitlist: true,
      prep: "Eat before you come in. You'll likely be numb for a couple of hours afterward.",
    },
    {
      id: "crown",
      name: "Crown prep",
      durationMin: 90,
      value: 1200,
      role: "dentist",
      waitlist: true,
      prep: "Plan on about 90 minutes. You'll leave with a temporary crown, so skip sticky foods until the permanent one goes in.",
    },
    {
      id: "rootcanal",
      name: "Root canal",
      durationMin: 90,
      value: 980,
      role: "dentist",
      waitlist: true,
      prep: "If you can, take ibuprofen an hour before and have a light meal. You'll be numb for a few hours.",
    },
    {
      id: "exam",
      name: "Limited exam",
      durationMin: 30,
      value: 95,
      role: "dentist",
      waitlist: true,
      prep: "Tell us exactly where it hurts and since when. It helps us get you sorted fast.",
    },
    {
      id: "seat",
      name: "Crown seat",
      durationMin: 30,
      value: 0,
      role: "dentist",
      waitlist: false,
      prep: "Quick visit to put your permanent crown in.",
    },
    {
      id: "consult",
      name: "Implant consult",
      durationMin: 30,
      value: 120,
      role: "dentist",
      waitlist: false,
      prep: "Bring any recent x-rays from other offices.",
    },
  ],
};
out("practice.json", practice);

// ---------------------------------------------------------------- providers

const providers = {
  providers: [
    { id: "calloway", name: "Dr. Ruth Calloway", credentials: "DDS", smsName: "Dr. Calloway", role: "dentist", chairIds: ["ch1", "ch2"] },
    { id: "okafor", name: "Dr. Ben Okafor", credentials: "DMD", smsName: "Dr. Okafor", role: "dentist", chairIds: ["ch3", "ch4"] },
    { id: "vega", name: "Marisol Vega", credentials: "RDH", smsName: "Marisol", role: "hygienist", chairIds: ["ch5"] },
  ],
  chairs: [
    { id: "ch1", name: "Chair 1", providerId: "calloway" },
    { id: "ch2", name: "Chair 2", providerId: "calloway" },
    { id: "ch3", name: "Chair 3", providerId: "okafor" },
    { id: "ch4", name: "Chair 4", providerId: "okafor" },
    { id: "ch5", name: "Chair 5", providerId: "vega" },
  ],
};
out("providers.json", providers);
const chairProvider = Object.fromEntries(providers.chairs.map((c) => [c.id, c.providerId]));
const typeById = Object.fromEntries(practice.appointmentTypes.map((t) => [t.id, t]));

// ---------------------------------------------------------------- schedule

const days = [
  ["2026-10-19", "mon"], ["2026-10-20", "tue"], ["2026-10-21", "wed"], ["2026-10-22", "thu"], ["2026-10-23", "fri"],
  ["2026-10-26", "mon"], ["2026-10-27", "tue"], ["2026-10-28", "wed"], ["2026-10-29", "thu"], ["2026-10-30", "fri"],
];

// Hand-placed appointments. Everything else is generated around these.
const fixed = [
  // The six cancellations ChairFill can fill.
  { id: "a-c1", chairId: "ch5", date: "2026-10-20", time: "14:00", typeId: "cleaning", patient: { id: "p-hruiz", name: "Hannah Ruiz" },
    status: "cancelled", cancel: { at: iso("2026-10-20", "07:52"), via: "Text", reason: "Kiddo woke up with a fever, so sorry!" } },
  { id: "a-c2", chairId: "ch3", date: "2026-10-21", time: "10:00", typeId: "crown", patient: { id: "p-gpike", name: "Gordon Pike" },
    status: "cancelled", cancel: { at: iso("2026-10-19", "16:15"), via: "Phone", reason: "Work trip to Fresno got moved up." } },
  { id: "a-c3", chairId: "ch5", date: "2026-10-22", time: "08:00", typeId: "perio", patient: { id: "p-emarsh", name: "Elaine Marsh" },
    status: "cancelled", cancel: { at: iso("2026-10-20", "08:31"), via: "Voicemail", reason: "Car's in the shop until Friday." } },
  { id: "a-c4", chairId: "ch1", date: "2026-10-23", time: "11:00", typeId: "filling", patient: { id: "p-jtran", name: "Jasmine Tran" },
    status: "cancelled", cancel: { at: iso("2026-10-20", "09:05"), via: "Online", reason: "Schedule conflict." } },
  { id: "a-c5", chairId: "ch2", date: "2026-10-27", time: "10:00", typeId: "rootcanal", patient: { id: "p-sbell", name: "Stuart Bell" },
    status: "cancelled", cancel: { at: iso("2026-10-19", "11:20"), via: "Phone", reason: "Got in with the endodontist in SLO sooner." } },
  { id: "a-c6", chairId: "ch5", date: "2026-10-29", time: "13:00", typeId: "cleaning", patient: { id: "p-nquill", name: "Nora Quill" },
    status: "cancelled", cancel: { at: iso("2026-10-20", "08:47"), via: "Text", reason: "We're moving to Fresno at the end of the month." } },

  // Booked patients who told the desk "earlier is fine" — move-up candidates.
  { id: "a-mu-gail", chairId: "ch5", date: "2026-10-22", time: "15:00", typeId: "cleaning", earlierOk: true,
    patient: { id: "p-ghendricks", name: "Gail Hendricks", phone: "(805) 555-0142" } },
  { id: "a-mu-luis", chairId: "ch4", date: "2026-10-28", time: "08:00", typeId: "crown", earlierOk: true,
    patient: { id: "p-lparedes", name: "Luis Paredes", phone: "(805) 555-0108" } },
  { id: "a-mu-deb", chairId: "ch5", date: "2026-10-28", time: "09:00", typeId: "perio", earlierOk: true,
    patient: { id: "p-dkowalski", name: "Deb Kowalski", phone: "(805) 555-0153" } },
  { id: "a-mu-walt", chairId: "ch1", date: "2026-10-29", time: "09:00", typeId: "filling", earlierOk: true,
    patient: { id: "p-wsimmons", name: "Walt Simmons", phone: "(805) 555-0176" } },

  // Already filled by ChairFill earlier this week (they get the bolt).
  { id: "a-h13", chairId: "ch5", date: "2026-10-19", time: "09:00", typeId: "cleaning", source: "chairfill", fillId: "h13",
    patient: { id: "p-rlund", name: "Rebecca Lund", phone: "(805) 555-0103" } },
  { id: "a-h14", chairId: "ch4", date: "2026-10-20", time: "08:00", typeId: "filling", source: "chairfill", fillId: "h14",
    patient: { id: "p-vamaya", name: "Victor Amaya", phone: "(805) 555-0111" } },

  // Real life: a same-day cancellation nobody took, and a no-show.
  { id: "a-u1", chairId: "ch5", date: "2026-10-19", time: "16:00", typeId: "cleaning", patient: { id: "p-pferreira", name: "Paul Ferreira" },
    status: "cancelled", fillId: "u5", cancel: { at: iso("2026-10-19", "14:50"), via: "Phone", reason: "Stuck at work in Atascadero." } },
  { id: "a-ns1", chairId: "ch1", date: "2026-10-19", time: "13:00", typeId: "filling", status: "no-show",
    patient: { id: "p-bkimball", name: "Brett Kimball" } },
];

const firstNames = [
  "Alma", "Andre", "Angela", "Armando", "Audrey", "Beatriz", "Bonnie", "Bradley", "Brenda", "Bryce", "Camila", "Carl", "Celeste",
  "Chris", "Cindy", "Clint", "Connie", "Craig", "Cristina", "Dale", "Darlene", "Dave", "Diego", "Donna", "Doug", "Eduardo", "Elena",
  "Eric", "Esther", "Felipe", "Fiona", "Gabe", "Gary", "Gina", "Greg", "Gwen", "Heidi", "Ian", "Irene", "Isaac", "Ivy", "Jackie",
  "Jaime", "Janet", "Javier", "Jeff", "Jenna", "Jill", "Joel", "Josefina", "Julie", "Karen", "Keith", "Kristin", "Lance", "Laura",
  "Leo", "Linda", "Logan", "Lorena", "Lucas", "Maddie", "Mario", "Martha", "Matt", "Megan", "Miguel", "Molly", "Nate", "Nicole",
  "Noah", "Olivia", "Omar", "Pam", "Paula", "Phil", "Quinn", "Rachel", "Raul", "Renee", "Rick", "Rita", "Rob", "Rocio", "Ron",
  "Ruby", "Russ", "Sandra", "Sara", "Scott", "Shannon", "Sharon", "Shawn", "Silvia", "Stella", "Steve", "Sue", "Ted", "Teresa",
  "Tina", "Todd", "Tracy", "Trevor", "Valerie", "Vanessa", "Vern", "Vicky", "Wade", "Wes", "Yolanda", "Zach",
];
const lastNames = [
  "Abernathy", "Acosta", "Ahn", "Alvarado", "Baird", "Barrios", "Becker", "Benson", "Bishop", "Bowen", "Cabrera", "Campos", "Carver",
  "Chavez", "Cobb", "Contreras", "Crane", "Dahl", "Dawson", "Diaz", "Dorsey", "Duarte", "Ellison", "Espinoza", "Estrada", "Fischer",
  "Flores", "Foley", "Gallegos", "Garza", "Gibbs", "Godfrey", "Gomez", "Hale", "Hanley", "Harper", "Hayes", "Holt", "Huerta",
  "Ingram", "Jansen", "Jimenez", "Kerr", "Klein", "Lam", "Larsen", "Lozano", "Maddox", "Magana", "Mathis", "McBride", "Medina",
  "Mendez", "Mercado", "Moss", "Navarro", "Nguyen", "Novak", "Orozco", "Pacheco", "Padilla", "Palmer", "Pena", "Perkins", "Quintero",
  "Rasmussen", "Rios", "Rocha", "Rowe", "Salas", "Sandoval", "Schaefer", "Serrano", "Shaw", "Solis", "Sorensen", "Stokes", "Tafoya",
  "Tanaka", "Torres", "Underwood", "Valdez", "Vance", "Velasquez", "Wagner", "Walsh", "Whitley", "Yates", "Zamora", "Zimmerman",
];
const usedNames = new Set(fixed.map((a) => a.patient.name));
let patientSeq = 1;
function newPatient() {
  for (;;) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return { id: `p${String(patientSeq++).padStart(3, "0")}`, name };
    }
  }
}

const hygieneMix = [["cleaning", 74], ["perio", 16], ["newpt", 10]];
const dentistMix = [["filling", 40], ["exam", 12], ["crown", 16], ["rootcanal", 9], ["seat", 13], ["consult", 10]];
function weighted(mix) {
  const total = mix.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [id, w] of mix) if ((r -= w) < 0) return id;
  return mix[0][0];
}
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

const appointments = [];
let apptSeq = 1;
for (const [date, dow] of days) {
  const [open, close] = practice.hours[dow].map(toMin);
  const blocks = dow === "fri" ? [[open, close]] : [[open, toMin(practice.lunch[0])], [toMin(practice.lunch[1]), close]];
  for (const chair of providers.chairs) {
    const isHygiene = chair.id === "ch5";
    const fixedHere = fixed.filter((f) => f.chairId === chair.id && f.date === date);
    for (const [bStart, bEnd] of blocks) {
      let t = bStart;
      while (t < bEnd) {
        const f = fixedHere.find((x) => toMin(x.time) === t);
        if (f) {
          t += typeById[f.typeId].durationMin;
          continue;
        }
        const nextFixed = fixedHere.map((x) => toMin(x.time)).filter((m) => m > t).sort((a, b) => a - b)[0] ?? Infinity;
        const room = Math.min(bEnd, nextFixed) - t;
        // A little unbooked white space, like any real schedule.
        if (rand() < (isHygiene ? 0.04 : 0.07)) {
          t += 30;
          continue;
        }
        let typeId = weighted(isHygiene ? hygieneMix : dentistMix);
        let tries = 0;
        while (typeById[typeId].durationMin > room && tries++ < 12) typeId = weighted(isHygiene ? hygieneMix : dentistMix);
        if (typeById[typeId].durationMin > room) {
          if (!isHygiene && room >= 30) typeId = rand() < 0.5 ? "exam" : "seat";
          else {
            t += 30;
            continue;
          }
        }
        appointments.push({
          id: `a${String(apptSeq++).padStart(3, "0")}`,
          chairId: chair.id,
          providerId: chair.providerId,
          start: iso(date, hm(t)),
          durationMin: typeById[typeId].durationMin,
          typeId,
          patient: newPatient(),
          status: "booked",
        });
        t += typeById[typeId].durationMin;
      }
    }
  }
}
for (const f of fixed) {
  const { date, time, ...rest } = f;
  appointments.push({
    status: "booked",
    ...rest,
    providerId: chairProvider[f.chairId],
    start: iso(date, time),
    durationMin: typeById[f.typeId].durationMin,
  });
}
// A few real-world rough edges in the PMS export.
const typo = appointments.find((a) => a.id === "a017");
if (typo) {
  const [first, last] = typo.patient.name.split(" ");
  typo.patient.name = `${first} ${last.slice(0, 2)}${last[3]}${last[2]}${last.slice(4)}`;
}
const noteA = appointments.find((a) => a.id === "a042");
if (noteA) noteA.note = "Pre-med (amoxicillin) — hip replacement 2024";
const noteB = appointments.find((a) => a.id === "a088");
if (noteB) noteB.note = "Balance due $64 from 8/12 visit";
const noteC = appointments.find((a) => a.id === "a131");
if (noteC) noteC.note = "Prefers Spanish — Tasha can help";

appointments.sort((a, b) => a.start.localeCompare(b.start) || a.chairId.localeCompare(b.chairId));
out("schedule.json", { weekStarts: ["2026-10-19", "2026-10-26"], appointments });

// ---------------------------------------------------------------- waitlist

const W = (id, first, last, phone, procedureId, urgency, days, windows, addedOn, insurance, extra = {}) => ({
  id, firstName: first, lastName: last, phone, procedureId, urgency, preferredDays: days, windows, addedOn, insurance,
  smsOk: true, ...extra,
});
const WEEK = ["mon", "tue", "wed", "thu", "fri"];
const ok = (carrier) => ({ status: "verified", carrier });
const check = (carrier, note) => ({ status: "check", carrier, note });

const waitlist = [
  // Cleanings
  W("w01", "Rosa", "Delgado", "(805) 555-0117", "cleaning", "soon", ["tue", "thu"], ["afternoon"], "2026-09-09", ok("Delta Dental PPO"),
    { notes: "Teaches at Georgia Brown Elementary. Free after 1:30 most days.", lastOffer: { at: "2026-10-13T10:05:00-07:00", outcome: "taken" } }),
  W("w02", "Kevin", "Nakamura", "(805) 555-0163", "cleaning", "routine", WEEK, ["afternoon"], "2026-08-23", ok("Cigna Dental"),
    { lastOffer: { at: "2026-10-06T08:12:00-07:00", outcome: "no-reply" } }),
  W("w03", "Tom", "Brandt", "(805) 555-0128", "cleaning", "routine", ["wed", "fri"], ["morning"], "2026-08-02", ok("MetLife"),
    { notes: "Possible duplicate of Thomas Brandt (same mobile)." }),
  W("w04", "Thomas", "Brandt", "(805) 555-0128", "cleaning", "routine", ["wed"], ["morning"], "2026-10-02", ok("MetLife"),
    { notes: "Added by phone. Possible duplicate of Tom Brandt." }),
  W("w05", "Priya", "Natarajan", "(805) 555-0134", "cleaning", "routine", ["mon", "thu"], ["morning", "midday"], "2026-09-28", ok("Delta Dental PPO")),
  W("w06", "Haley", "Brooks", "(805) 555-0151", "cleaning", "routine", ["tue", "thu"], ["morning"], "2026-07-15",
    check("Guardian", "Plan changed in September. Get the new card."), { notes: "Recall overdue 7 months." }),
  W("w07", "Marcus", "Webb", "(805) 555-0144", "cleaning", "routine", WEEK, ["any"], "2026-10-12", { status: "self-pay" },
    { notes: "Prefers Marisol." , providerPref: "vega" }),
  W("w08", "Lupe", "Ramírez", "(805) 555-0109", "cleaning", "routine", ["tue", "wed", "thu"], ["afternoon"], "2026-09-30",
    check("Denti-Cal", "Check frequency limit. Last cleaning 5/12."), { notes: "Prefers Spanish. Tasha can help." }),
  W("w09", "Ethan", "Cole", "(805) 555-0172", "cleaning", "routine", ["fri"], ["morning"], "2026-10-14", ok("Delta Dental PPO")),
  W("w10", "June", "Whitaker", "(805) 555-0186", "cleaning", "routine", ["mon", "wed"], ["midday"], "2026-08-30", ok("Humana Medicare Advantage"),
    { notes: "Uses a walker. Give her the chair closest to the door." }),
  W("w11", "Sam", "Whitfield", "(805) 555-0139", "cleaning", "routine", ["thu"], ["afternoon"], "2026-09-18", ok("Aetna DMO")),
  W("w12", "Carmen", "Ochoa", "(805) 555-0122", "cleaning", "routine", WEEK, ["morning"], "2026-10-05", ok("Delta Dental PPO"),
    { notes: "Would like her two kids seen the same morning if possible." }),
  W("w13", "Derek", "Lindqvist", "(805) 555-0157", "cleaning", "routine", ["tue"], ["midday", "afternoon"], "2026-10-16", ok("United Concordia"),
    { lastOffer: { at: "2026-10-19T15:05:00-07:00", outcome: "no-reply" } }),
  W("w14", "Alyssa", "Fenwick", "(805) 555-0193", "cleaning", "routine", WEEK, ["any"], "2026-09-02", ok("Delta Dental PPO")),

  // Perio maintenance
  W("w15", "Arturo", "Salinas", "(805) 555-0112", "perio", "soon", ["tue", "thu"], ["morning"], "2026-09-21", ok("Delta Dental PPO")),
  W("w16", "Nancy", "Feldkamp", "(805) 555-0147", "perio", "routine", ["thu", "fri"], ["morning"], "2026-08-11",
    { status: "expired", carrier: "Blue Shield", note: "Coverage ended 9/30. Ask for her new card." }),
  W("w17", "Glen", "Ishikawa", "(805) 555-0165", "perio", "routine", ["mon", "tue", "wed", "thu"], ["any"], "2026-09-07", { status: "self-pay" },
    { notes: "Pays at time of service." }),
  W("w18", "Bev", "Thornton", "(805) 555-0178", "perio", "soon", ["thu"], ["morning"], "2026-10-08", ok("MetLife")),
  W("w19", "Ricardo", "Fuentes", "(805) 555-0119", "perio", "routine", ["wed", "thu"], ["morning"], "2026-10-13",
    check("Delta Dental PPO", "New employer plan. Verify before booking.")),

  // Crown prep
  W("w20", "Patricia", "Oyelaran", "(805) 555-0141", "crown", "urgent", WEEK, ["any"], "2026-10-06", ok("Delta Dental PPO"),
    { notes: "Cracked lower molar, temporary filling placed 10/6." }),
  W("w21", "Dennis", "Hruby", "(805) 555-0126", "crown", "soon", ["wed", "fri"], ["morning"], "2026-09-15", ok("Cigna Dental")),
  W("w22", "Kayla", "Montoya", "(805) 555-0158", "crown", "routine", ["wed"], ["morning"], "2026-08-28",
    check("Guardian", "Annual max may already be met.")),
  W("w23", "Frank", "DeLuca", "(805) 555-0183", "crown", "routine", ["tue", "wed"], ["morning", "midday"], "2026-09-25", { status: "self-pay" },
    { notes: "Wants a written estimate before booking." }),
  W("w24", "Joanne", "Pak", "(805) 555-0131", "crown", "soon", ["mon", "wed"], ["any"], "2026-10-01", ok("Delta Dental PPO"),
    { providerPref: "okafor", notes: "Only wants Dr. Okafor." }),

  // Fillings
  W("w25", "Jonh", "Pruitt", "(805) 555-0114", "filling", "soon", ["fri"], ["morning", "midday"], "2026-09-29", ok("Aetna DMO"),
    { notes: "Name is misspelled in the PMS (John). Fix at next visit." }),
  W("w26", "Mei-Ling", "Cho", "(805) 555-0168", "filling", "routine", ["thu", "fri"], ["midday"], "2026-09-10", ok("Delta Dental PPO"),
    { lastOffer: { at: "2026-10-19T15:00:00-07:00", outcome: "taken" } }),
  W("w27", "Brandon", "Tull", "(805) 555-0175", "filling", "routine", ["fri"], ["any"], "2026-10-09", { status: "self-pay" },
    { lastOffer: { at: "2026-10-19T15:00:00-07:00", outcome: "declined" } }),
  W("w28", "MARGARET", "O'NEIL", "(805) 555-0191", "filling", "routine", ["mon", "fri"], ["morning"], "2026-08-19",
    check("Humana Medicare Advantage", "Confirm the dental rider is active."), { notes: "Hard of hearing. Text, don't call." }),
  W("w29", "Tyler", "Ambrose", "(805) 555-0199", "filling", "urgent", WEEK, ["any"], "2026-10-18", ok("Delta Dental PPO"),
    { smsOk: false, notes: "Lost a filling, sensitive to cold. Number on file is a landline; call him." }),
  W("w30", "Sofia", "Herrera", "(805) 555-0105", "filling", "soon", ["tue", "wed", "thu", "fri"], ["morning"], "2026-10-03", ok("Denti-Cal")),

  // Root canals
  W("w31", "Brianna", "Castillo", "(805) 555-0137", "rootcanal", "urgent", WEEK, ["any"], "2026-10-17", ok("Cigna Dental"),
    { notes: "Throbbing, lower left. On ibuprofen." }),
  W("w32", "Ray", "Gutierrez", "(805) 555-0154", "rootcanal", "urgent", ["tue", "wed"], ["morning"], "2026-10-14", ok("Delta Dental PPO")),
  W("w33", "Hollis", "Grant", "(805) 555-0161", "rootcanal", "soon", ["mon", "tue"], ["morning"], "2026-10-02", { status: "self-pay" }),
  W("w34", "Wendy", "Szabo", "(805) 555-0188", "rootcanal", "soon", ["tue", "thu"], ["any"], "2026-09-24",
    check("Blue Shield", "Needs pre-authorization.")),

  // New patients
  W("w35", "Caleb", "Moreno", "(805) 555-0124", "newpt", "routine", WEEK, ["afternoon"], "2026-10-11",
    check("Delta Dental PPO", "New patient. Verify eligibility.")),
  W("w36", "Anika", "Rao", "(805) 555-0149", "newpt", "routine", ["tue", "thu"], ["morning"], "2026-10-15",
    check("Aetna DMO", "New patient. Verify eligibility.")),
  W("w37", "Owen", "Pierce", "(805) 555-0170", "newpt", "soon", ["mon", "wed", "fri"], ["any"], "2026-09-27", { status: "self-pay" },
    { notes: "Moved from Bakersfield. Records request sent 9/28." }),

  // Limited exams
  W("w38", "Grace", "Liu", "(805) 555-0115", "exam", "urgent", WEEK, ["any"], "2026-10-19", ok("Delta Dental PPO"),
    { notes: "Chipped front tooth at soccer practice." }),
  W("w39", "Hector", "Villanueva", "(805) 555-0181", "exam", "soon", ["mon", "tue", "wed"], ["morning"], "2026-10-10", ok("Denti-Cal")),
  W("w40", "Dana", "Kessler", "(805) 555-0129", "exam", "routine", ["thu", "fri"], ["afternoon"], "2026-10-07", ok("Cigna Dental")),
];
out("waitlist.json", waitlist);

// ---------------------------------------------------------------- templates

out("templates.json", {
  offer: "Maple Family Dental: a {procedure} opened up {day} at {time} with {provider}. Want it? Reply YES or NO, or tap {link}",
  confirm: "You're booked, {first_name}: {procedure} {day} at {time} with {provider}. 1142 Spring St, Suite 2B. Need to change it? Call (805) 555-0100.",
  taken: "Thanks, {first_name}. That {time} spot just got taken. You're still on our list, and we'll text you next time.",
  declined: "No problem, {first_name}. You're still on our list.",
});

// ---------------------------------------------------------------- sim replies

// How each patient "answers" in demo mode. afterSec is measured from when the
// offer is sent. "none" means they never reply and the offer times out.
const S = (reply, afterSec, text) => ({ reply, afterSec, ...(text ? { text } : {}) });
out("sim-replies.json", {
  note: "Scripted demo replies, keyed by patient id. reply: yes | no | none. afterSec: seconds after the offer is sent.",
  default: S("none", 0),
  patients: {
    "p-ghendricks": S("no", 45, "Can't do today, thank you though!"),
    "p-lparedes": S("yes", 25, "Yes. Sooner the better"),
    "p-dkowalski": S("none", 0),
    "p-wsimmons": S("no", 30, "No thanks, Thursday still works"),
    w01: S("yes", 20, "YES! Perfect timing"),
    w02: S("none", 0),
    w03: S("no", 30, "Can't, sorry"),
    w04: S("no", 30, "Can't, sorry"),
    w05: S("yes", 25, "Yes please"),
    w06: S("yes", 35, "yes!!"),
    w07: S("none", 0),
    w08: S("yes", 40, "Sí, yes"),
    w09: S("no", 20, "No"),
    w10: S("yes", 50, "Yes I'll be there"),
    w11: S("yes", 18, "YES"),
    w12: S("no", 25, "Can't today, mornings only"),
    w13: S("none", 0),
    w14: S("no", 22, "Not that day, sorry"),
    w15: S("yes", 15, "Yes!"),
    w16: S("none", 0),
    w17: S("no", 30, "No"),
    w18: S("yes", 40, "Yes, see you then"),
    w19: S("none", 0),
    w20: S("none", 0),
    w21: S("yes", 40, "YES"),
    w22: S("no", 25, "No thank you"),
    w23: S("yes", 60, "ok yes"),
    w24: S("no", 35, "Can't get off work"),
    w25: S("yes", 22, "Yes"),
    w26: S("none", 0),
    w27: S("no", 20, "No"),
    w28: S("yes", 45, "YES THANK YOU"),
    w30: S("none", 0),
    w31: S("yes", 12, "Yes please!! I'll take it"),
    w32: S("none", 0),
    w33: S("no", 28, "No"),
    w34: S("yes", 30, "Yes"),
    w35: S("yes", 26, "Yes"),
    w36: S("none", 0),
    w37: S("no", 33, "Not this time"),
    w38: S("yes", 16, "YES omw"),
    w39: S("none", 0),
    w40: S("no", 24, "No"),
  },
});

// ---------------------------------------------------------------- history

// October so far: 14 chairs filled for $3,920, plus the ones nobody took.
const H = (id, date, time, chairId, typeId, winner, offers, minutesToFill, cancelledAt, extra = {}) => ({
  id, status: "filled", slotStart: iso(date, time), chairId, providerId: chairProvider[chairId], typeId,
  value: typeById[typeId].value, winner, offers, minutesToFill, cancelledAt, strategy: offers.length > 1 && extra.strategy !== "one" ? "batch" : "one",
  ...extra,
});
const history = [
  H("h01", "2026-10-01", "14:00", "ch5", "cleaning", "Tamsin Ford", ["Tamsin Ford", "Bill Greer", "Stacy Varga"], 6, iso("2026-10-01", "09:12")),
  H("h02", "2026-10-02", "09:00", "ch5", "perio", "Jorge Ibarra", ["Jorge Ibarra", "Hana Sato"], 14, iso("2026-10-01", "16:40"), { strategy: "one" }),
  H("h03", "2026-10-05", "15:00", "ch5", "cleaning", "Colleen Pratt", ["Colleen Pratt", "Rudy Alcantar", "Imelda Cruz"], 9, iso("2026-10-05", "08:20")),
  H("h04", "2026-10-06", "10:00", "ch2", "filling", "Neil Okonkwo", ["Neil Okonkwo", "Pete Lindgren", "Courtney Ames"], 12, iso("2026-10-05", "17:55")),
  H("h05", "2026-10-07", "08:00", "ch5", "perio", "Stacy Varga", ["Stacy Varga", "Yusuf Haddad", "Bill Greer"], 4, iso("2026-10-06", "15:31")),
  H("h06", "2026-10-08", "13:00", "ch3", "crown", "Rudy Alcantar", ["Rudy Alcantar", "Pete Lindgren", "Jorge Ibarra", "Neil Okonkwo", "Hana Sato", "Imelda Cruz"], 31, iso("2026-10-08", "08:05")),
  H("h07", "2026-10-09", "10:00", "ch5", "cleaning", "Hana Sato", ["Hana Sato", "Courtney Ames", "Tamsin Ford"], 7, iso("2026-10-09", "07:48")),
  H("h08", "2026-10-12", "16:00", "ch5", "newpt", "Bill Greer", ["Bill Greer", "Yusuf Haddad", "Colleen Pratt"], 22, iso("2026-10-12", "11:15")),
  H("h09", "2026-10-13", "14:00", "ch5", "perio", "Imelda Cruz", ["Imelda Cruz", "Rosa Delgado", "Stacy Varga"], 8, iso("2026-10-13", "10:01")),
  H("h10", "2026-10-14", "09:00", "ch5", "cleaning", "Pete Lindgren", ["Pete Lindgren", "Rudy Alcantar", "Neil Okonkwo"], 11, iso("2026-10-13", "16:22")),
  H("h11", "2026-10-15", "08:00", "ch5", "perio", "Courtney Ames", ["Courtney Ames", "Tamsin Ford"], 3, iso("2026-10-15", "07:10"), { strategy: "one" }),
  H("h12", "2026-10-16", "11:00", "ch5", "cleaning", "Yusuf Haddad", ["Yusuf Haddad", "Bill Greer", "Hana Sato"], 10, iso("2026-10-16", "08:44")),
  H("h13", "2026-10-19", "09:00", "ch5", "cleaning", "Rebecca Lund", ["Rebecca Lund", "Carmen Ochoa", "Kevin Nakamura"], 11, iso("2026-10-18", "21:14"),
    { notes: "Cancelled Sunday night online. Offers waited for quiet hours to end at 8:00 AM." }),
  H("h14", "2026-10-20", "08:00", "ch4", "filling", "Victor Amaya", ["Victor Amaya", "Mei-Ling Cho", "Brandon Tull"], 12, iso("2026-10-19", "14:58")),
];
const U = (id, date, time, chairId, typeId, offers, cancelledAt, reason) => ({
  id, status: "unfilled", slotStart: iso(date, time), chairId, providerId: chairProvider[chairId], typeId,
  value: typeById[typeId].value, offers, cancelledAt, reason, strategy: "batch",
});
history.push(
  U("u1", "2026-10-02", "11:00", "ch3", "rootcanal", ["Jorge Ibarra"], iso("2026-10-02", "10:20"), "Under an hour's notice. Only one patient fit."),
  U("u2", "2026-10-07", "16:00", "ch1", "exam", [], iso("2026-10-07", "15:40"), "Cancelled 20 minutes before. Not worth texting."),
  U("u3", "2026-10-09", "12:00", "ch5", "cleaning", ["Colleen Pratt", "Hana Sato", "Yusuf Haddad"], iso("2026-10-09", "09:30"), "Friday lunch hour. Nobody bit."),
  U("u4", "2026-10-14", "15:00", "ch2", "filling", ["Neil Okonkwo", "Courtney Ames", "Pete Lindgren"], iso("2026-10-14", "13:05"), "Three offers, no replies within the window."),
  U("u5", "2026-10-19", "16:00", "ch5", "cleaning", ["Derek Lindqvist"], iso("2026-10-19", "14:50"), "Offered once at 3:05 PM. No reply before the slot."),
);
out("history.json", { month: "2026-10", fills: history });

console.log(`${appointments.length} appointments, ${waitlist.length} waitlist patients, ${history.length} history records`);

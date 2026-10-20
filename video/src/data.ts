// Mock data for Maple Family Dental, Paso Robles, CA. Week of Oct 19–23, 2026.

export type Appointment = { time: string; name: string; procedure: string };

export const DAYS = [
  { day: "Mon", date: "Oct 19", today: false },
  { day: "Tue", date: "Oct 20", today: true },
  { day: "Wed", date: "Oct 21", today: false },
  { day: "Thu", date: "Oct 22", today: false },
  { day: "Fri", date: "Oct 23", today: false },
];

export type ChairRow = {
  chair: string;
  provider: string;
  // null marks the slot that cancels (Tue, Chair 5).
  appointments: (Appointment | null)[];
};

export const CHAIRS: ChairRow[] = [
  {
    chair: "Chair 3",
    provider: "Dr. Okafor",
    appointments: [
      { time: "9:00 AM", name: "Gabriel", procedure: "Crown prep" },
      { time: "10:30 AM", name: "Priya", procedure: "Filling" },
      { time: "8:00 AM", name: "Tom", procedure: "Root canal" },
      { time: "1:00 PM", name: "Lena", procedure: "Exam" },
      { time: "9:30 AM", name: "Marcus", procedure: "Filling" },
    ],
  },
  {
    chair: "Chair 4",
    provider: "Dr. Okafor",
    appointments: [
      { time: "11:00 AM", name: "Hannah", procedure: "Exam" },
      { time: "3:30 PM", name: "Diego", procedure: "Crown seat" },
      { time: "2:00 PM", name: "Ava", procedure: "Filling" },
      { time: "10:00 AM", name: "Sam", procedure: "Extraction" },
      { time: "1:30 PM", name: "June", procedure: "Exam" },
    ],
  },
  {
    chair: "Chair 5",
    provider: "Marisol Vega, RDH",
    appointments: [
      { time: "8:30 AM", name: "Ellen", procedure: "Cleaning" },
      null,
      { time: "9:00 AM", name: "Owen", procedure: "Cleaning" },
      { time: "3:00 PM", name: "Grace", procedure: "Deep cleaning" },
      { time: "10:00 AM", name: "Luis", procedure: "Cleaning" },
    ],
  },
];

export const CANCELLED = { time: "2:00 PM", name: "Nora", procedure: "Cleaning" };

export const OFFER_TEXT =
  "Maple Family Dental: a cleaning opened up today, Tue 2:00 PM with Marisol. Want it? Reply YES or NO, or tap: ";
export const OFFER_LINK = "chairfill.app/o/7Q2K";
export const TAKEN_TEXT =
  "That 2:00 PM just got taken. You're still on our list, and we'll text you next time.";
export const BOOKED_TEXT = "You're booked: today at 2:00 PM with Marisol. See you soon.";

export const PATIENTS = [
  { name: "Gail H.", phone: "(805) 555-0142" },
  { name: "Rosa D.", phone: "(805) 555-0117" },
  { name: "Kevin N.", phone: "(805) 555-0163" },
];

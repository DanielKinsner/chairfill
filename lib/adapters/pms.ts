// Practice management system adapter (Dentrix, Eaglesoft, Open Dental...).
// Demo mode: the schedule is seeded from /data/schedule.json and the waitlist
// can be imported from a CSV export. Writes are recorded, not sent anywhere.
// TODO(production): Open Dental API / Dentrix G-Series sync for appointments and the ASAP list.

export interface PmsAdapter {
  readonly mode: "csv" | "api";
  readonly name: string;
  writeAppointment(slotId: string, patientName: string): Promise<{ ok: true; ref: string }>;
  recordImport(source: string, count: number): Promise<void>;
}

export const pms: PmsAdapter = {
  mode: "csv",
  name: "Practice software (CSV import)",
  async writeAppointment(slotId) {
    return { ok: true, ref: `PMS-${slotId.toUpperCase()}` };
  },
  async recordImport() {},
};

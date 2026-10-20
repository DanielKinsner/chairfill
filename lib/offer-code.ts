// Short codes for the yes/no link in each text: /o/K7QX.
// Deterministic per (slot, patient), so the same offer always has the same
// link, even on a phone that has never seen this browser's demo data.

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O, 1/I

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function offerCode(slotId: string, patientKey: string): string {
  let h = hash32(`${slotId}:${patientKey}`);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[h % 32];
    h = Math.floor(h / 32);
  }
  return code;
}

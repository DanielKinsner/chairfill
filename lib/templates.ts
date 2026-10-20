import type { Templates } from "./types";

export const MERGE_FIELDS = [
  { key: "first_name", label: "Patient's first name", example: "Rosa" },
  { key: "procedure", label: "Visit type", example: "cleaning" },
  { key: "day", label: "Day (today, tomorrow, or date)", example: "today" },
  { key: "time", label: "Start time", example: "2:00 PM" },
  { key: "provider", label: "Provider", example: "Marisol" },
  { key: "practice", label: "Practice name", example: "Maple Family Dental" },
  { key: "link", label: "Yes/no link", example: "chairfill.vercel.app/o/K7QX" },
] as const;

export type MergeKey = (typeof MERGE_FIELDS)[number]["key"];
export type MergeVars = Partial<Record<MergeKey, string>>;

export const TEMPLATE_INFO: Record<keyof Templates, { name: string; when: string }> = {
  offer: { name: "Offer", when: "Sent when a chair opens up." },
  confirm: { name: "You're booked", when: "Sent to the first patient who says yes." },
  taken: { name: "It's taken", when: "Sent to everyone else who got the offer." },
  declined: { name: "Thanks for letting us know", when: "Sent when someone replies no." },
};

/** Fills {merge_fields}. Unknown fields are left as-is so the desk can spot typos. */
export function renderTemplate(tpl: string, vars: MergeVars): string {
  return tpl.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = vars[key as MergeKey];
    return v === undefined ? whole : v;
  });
}

export function unknownFields(tpl: string): string[] {
  const known = new Set<string>(MERGE_FIELDS.map((f) => f.key));
  return [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !known.has(k));
}

// GSM 03.38 basic character set plus the extension table (which costs two characters each).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

export interface SegmentInfo {
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segments: number;
  perSegment: number;
}

/**
 * How many texts a message costs. Plain messages fit 160 characters in one
 * text (153 each once split); a single curly quote or emoji switches the whole
 * message to UCS-2 at 70 (67 when split).
 */
export function smsSegments(text: string): SegmentInfo {
  let units = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (!gsm) {
    // UCS-2 counts UTF-16 code units; emoji take two.
    const u = text.length;
    return { encoding: "UCS-2", units: u, segments: u <= 70 ? 1 : Math.ceil(u / 67), perSegment: u <= 70 ? 70 : 67 };
  }
  return { encoding: "GSM-7", units, segments: units <= 160 ? 1 : Math.ceil(units / 153), perSegment: units <= 160 ? 160 : 153 };
}

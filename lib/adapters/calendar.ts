// Calendar invites. The .ics file is generated in the browser, so this one
// actually works in the demo; no outside service involved.
// TODO(production): attach the .ics to the confirmation email via Postmark/SendGrid.

const pad = (n: number) => String(n).padStart(2, "0");
const utc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const esc = (s: string) => s.replace(/[\,;]/g, (m) => `\${m}`).replace(/\n/g, "\n");

export function buildIcs(e: { uid: string; title: string; start: string; durationMin: number; location: string; description: string }) {
  const start = new Date(e.start).getTime();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChairFill//Demo//EN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@chairfill.demo`,
    `DTSTAMP:${utc(start)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(start + e.durationMin * 60_000)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

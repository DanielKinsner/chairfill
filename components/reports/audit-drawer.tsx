"use client";

import { Bolt } from "@/components/brand";
import { Dialog, Money, SimTag } from "@/components/ui";
import { FillTimeline } from "@/components/fill/timeline";
import { useDemo } from "@/lib/store";
import { addMinutes, fmtDay, fmtTime, nextSendTime } from "@/lib/time";
import type { FillRecord } from "@/lib/types";

interface Line {
  at: string;
  actor: string;
  text: string;
  tone?: "win" | "muted";
}

/** Seeded history has no recorded run, so rebuild its log from the summary the practice software kept. */
function reconstruct(r: FillRecord, quiet: { enabled: boolean; start: string; end: string }, offerWindowMin: number): Line[] {
  const lines: Line[] = [];
  const cancelled = r.cancelledAt ?? addMinutes(r.slotStart, -120);
  lines.push({ at: cancelled, actor: "Practice software sync", text: "Appointment cancelled. Slot opened." });
  const start = nextSendTime(addMinutes(cancelled, 2), quiet);
  if (start !== addMinutes(cancelled, 2)) lines.push({ at: addMinutes(cancelled, 2), actor: "ChairFill", text: "Quiet hours. Offers held until morning.", tone: "muted" });
  if (r.offers.length === 0) {
    lines.push({ at: addMinutes(cancelled, 1), actor: "Kim Albers", text: r.reason ?? "Not filled." });
    return lines;
  }
  const batch = r.strategy === "batch" ? 3 : 1;
  r.offers.forEach((name, i) => {
    const round = Math.floor(i / batch);
    lines.push({ at: addMinutes(start, round * offerWindowMin), actor: "ChairFill", text: `Offer texted to ${name}` });
  });
  if (r.status === "filled" && r.winner) {
    const won = addMinutes(start, r.minutesToFill ?? 5);
    lines.push({ at: won, actor: r.winner, text: "Replied YES" });
    lines.push({ at: addMinutes(won, 0.1), actor: "ChairFill", text: `Chair confirmed for ${r.winner}. "You're booked" texted.`, tone: "win" });
    const others = r.offers.filter((n) => n !== r.winner);
    if (others.length) lines.push({ at: addMinutes(won, 0.2), actor: "ChairFill", text: `"It's taken" texted to ${others.join(", ")}` });
    lines.push({ at: addMinutes(won, 0.3), actor: "ChairFill", text: "Written to the schedule and the practice software.", tone: "win" });
  } else {
    lines.push({ at: addMinutes(start, offerWindowMin * Math.ceil(r.offers.length / batch)), actor: "ChairFill", text: r.reason ?? "Nobody took it.", tone: "muted" });
  }
  return lines.sort((a, b) => a.at.localeCompare(b.at));
}

export function AuditDrawer({ record, onClose }: { record: FillRecord; onClose: () => void }) {
  const run = useDemo((s) => s.runs.find((r) => r.id === (record.runId ?? record.id)));
  const settings = useDemo((s) => s.settings);
  const types = useDemo((s) => s.practice.appointmentTypes);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const type = types.find((t) => t.id === record.typeId);
  const provider = providers.find((p) => p.id === record.providerId);
  const chair = chairs.find((c) => c.id === record.chairId);

  return (
    <Dialog open onClose={onClose} title="Audit log" side>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className={`rounded-card p-3.5 ${record.status === "filled" ? "border border-teal/50 bg-teal-soft" : "open-outline"}`}>
          <p className="font-semibold text-ink">
            {fmtDay(record.slotStart)} at <span className="num">{fmtTime(record.slotStart)}</span>
          </p>
          <p className="text-[13px] text-ink-2">
            {type?.name}, {provider?.name}, {chair?.name}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-teal-deep">
            {record.status === "filled" ? (
              <>
                <Bolt className="size-3.5" /> {record.winner}, <Money value={record.value} />
              </>
            ) : (
              <span className="text-ink-2">Not filled. {record.reason}</span>
            )}
          </p>
        </div>
        <p className="mt-3 text-[12.5px] text-slate-ink">
          Every text, reply and schedule change for this opening, for the office manager. Times are Pacific.
        </p>

        {run ? (
          <>
            <div className="mt-4">
              <FillTimeline run={run} absolute dense />
            </div>
            <h3 className="mt-5 text-[13px] font-semibold">Messages</h3>
            <ul className="mt-2 space-y-3">
              {run.offers.map((o) => (
                <li key={o.key} className="rounded-card border border-line p-3">
                  <p className="text-[13px] font-semibold">
                    {o.name} <span className="num font-normal text-slate-ink">{o.phone}</span>
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {o.messages.map((m, i) => (
                      <li key={i} className="grid grid-cols-[52px_1fr] gap-2 text-[12.5px]">
                        <span className="num text-slate-ink">{fmtTime(addMinutes(run.startedAt, m.t / 60000)).replace(/ [AP]M$/, "")}</span>
                        <span className={m.dir === "in" ? "font-medium text-ink" : "text-ink-2"}>
                          {m.dir === "in" ? `${o.firstName}: ` : "Sent: "}
                          {m.body}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-[12px] text-slate-ink">
              <SimTag /> Demo texts. In production each line carries the Twilio message ID.
            </p>
          </>
        ) : (
          <ol className="relative mt-4">
            <span aria-hidden className="tick-rail absolute bottom-2 left-[61px] top-2 w-px" />
            {reconstruct(record, settings.quietHours, settings.offerWindowMin).map((l, i) => (
              <li key={i} className="relative grid grid-cols-[56px_14px_1fr] gap-x-1.5 py-1.5">
                <span className="num pt-[1px] text-right text-[11.5px] text-slate-ink">{fmtTime(l.at).replace(/ ([AP]M)$/, "$1").toLowerCase()}</span>
                <span className="flex justify-center pt-[5px]">
                  <span className={`size-[7px] rounded-full ring-2 ring-white ${l.tone === "win" ? "bg-teal" : l.tone === "muted" ? "bg-line-strong" : "bg-ink-2"}`} />
                </span>
                <span className="text-[13px] leading-snug">
                  <span className={l.tone === "win" ? "font-semibold text-teal-deep" : "text-ink"}>{l.text}</span>
                  <span className="block text-[11.5px] text-slate-ink">
                    {l.actor}, {fmtDay(l.at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Dialog>
  );
}

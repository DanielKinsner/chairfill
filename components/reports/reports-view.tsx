"use client";

import { useMemo, useState } from "react";
import { Bolt } from "@/components/brand";
import { Button, Chip, Money, Skeleton } from "@/components/ui";
import { useDemoNow, useMounted } from "@/lib/hooks";
import { monthReport, PHONE_MINUTES_PER_FILL } from "@/lib/reports";
import { useDemo } from "@/lib/store";
import { durationWords, fmtDay, fmtMonthDay, fmtTime } from "@/lib/time";
import type { FillRecord } from "@/lib/types";
import { AuditDrawer } from "./audit-drawer";
import { ColumnChart } from "./bar-chart";

const MONTH = "2026-10";
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;
const hourWords = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;

export function ReportsView() {
  const mounted = useMounted();
  if (!mounted) return <ReportsSkeleton />;
  return <ReportsInner />;
}

function ReportsInner() {
  const history = useDemo((s) => s.history);
  const types = useDemo((s) => s.practice.appointmentTypes);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const now = useDemoNow(30_000);
  const r = useMemo(() => monthReport(history, MONTH, now), [history, now]);
  const [audit, setAudit] = useState<FillRecord | null>(null);
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

  const log = [...r.filled, ...r.unfilled].sort((a, b) => b.slotStart.localeCompare(a.slotStart));
  const bestHour = [...r.byHour].filter((h) => h.fills > 0).sort((a, b) => b.fills - a.fills || a.avgMinutes - b.avgMinutes)[0];
  const fastestHour = [...r.byHour].filter((h) => h.fills > 0).sort((a, b) => a.avgMinutes - b.avgMinutes)[0];
  const maxType = Math.max(1, ...r.byType.map((t) => t.value));

  return (
    <div className="flex-1">
      <div className="border-b border-line px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Reports</h1>
          <p className="text-[13px] text-slate-ink">October 2026, month to date. Revenue counts each filled slot at its visit value.</p>
        </div>
      </div>

      {/* The ledger: one row, read left to right, the headline number first */}
      <section aria-label="This month" className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="stagelight border-b border-line px-4 py-6 sm:border-r lg:border-b-0 lg:px-6">
          <p className="text-[13px] text-slate-ink">Recovered this month</p>
          <p className="num mt-1 text-[64px] font-medium leading-none tracking-[-0.04em] text-teal-deep md:text-[88px]" data-testid="kpi-recovered">
            ${r.recovered.toLocaleString()}
          </p>
          <p className="display mt-3 text-[19px] leading-snug text-ink-2">
            Money the practice already paid staff to be there for.
          </p>
          <p className="mt-2 text-[12.5px] text-slate-ink">
            On pace for <Money value={r.pace} className="text-ink" /> by Oct 31.
          </p>
        </div>
        <Kpi label="Chairs filled" value={String(r.filled.length)} note={`of ${r.filled.length + r.unfilled.length} cancellations (${Math.round(r.fillRate * 100)}%)`} testid="kpi-filled" />
        <Kpi label="Average time to fill" value={durationWords(r.avgMinutes * 60_000)} note={`Median ${durationWords(r.medianMinutes * 60_000)}`} />
        <Kpi label="Texts per fill" value={r.offersPerFill.toFixed(1)} note="Offers sent before someone said yes" />
        <Kpi label="Phone time saved" value={`${r.phoneHoursSaved.toFixed(1)} hr`} note={`About ${PHONE_MINUTES_PER_FILL} min of calls per opening`} last />
      </section>

      <div className="grid gap-px bg-line lg:grid-cols-[1fr_1fr_0.9fr]">
        <section className="bg-white px-4 py-5 lg:px-6" aria-labelledby="by-week">
          <h2 id="by-week" className="text-[14px] font-semibold">Recovered by week</h2>
          <p className="mb-4 text-[12.5px] text-slate-ink">Week of the filled appointment.</p>
          <ColumnChart
            label="Revenue recovered by week"
            format={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${v}`)}
            bars={r.byWeek.map((w) => ({
              key: w.week,
              label: fmtMonthDay(`${w.week < `${MONTH}-01` ? `${MONTH}-01` : w.week}T12:00:00-07:00`),
              value: w.value,
              tip: `${w.fills} ${w.fills === 1 ? "chair" : "chairs"} filled, $${w.value.toLocaleString()}`,
              muted: w.week > now.slice(0, 10),
            }))}
          />
        </section>
        <section className="bg-white px-4 py-5 lg:px-6" aria-labelledby="best-hours">
          <h2 id="best-hours" className="text-[14px] font-semibold">Best hours</h2>
          <p className="mb-4 text-[12.5px] text-slate-ink">
            {bestHour ? (
              <>
                {hourWords(bestHour.hour)} openings fill most often
                {fastestHour && fastestHour.hour !== bestHour.hour ? `, ${hourWords(fastestHour.hour)} ones fastest` : " and fastest"}.
              </>
            ) : (
              "Fills by appointment start time."
            )}
          </p>
          <ColumnChart
            label="Chairs filled by appointment hour"
            format={(v) => String(v)}
            bars={r.byHour.map((h) => ({
              key: String(h.hour),
              label: hourLabel(h.hour),
              value: h.fills,
              tip: h.fills ? `${h.fills} filled, ${durationWords(h.avgMinutes * 60_000)} on average` : "None yet",
            }))}
          />
        </section>
        <section className="bg-white px-4 py-5 lg:px-6" aria-labelledby="by-type">
          <h2 id="by-type" className="text-[14px] font-semibold">By visit type</h2>
          <p className="mb-4 text-[12.5px] text-slate-ink">One crown covers a lot of cleanings.</p>
          <ul className="space-y-3">
            {r.byType.map((t) => (
              <li key={t.typeId}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="text-ink">
                    {typeName(t.typeId)} <span className="num text-slate-ink">×{t.fills}</span>
                  </span>
                  <Money value={t.value} className="text-ink" />
                </div>
                <div className="mt-1 h-2 rounded-[3px] bg-surface">
                  <div className="h-full rounded-[3px] bg-teal" style={{ width: `${(t.value / maxType) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="border-t border-line" aria-labelledby="fill-log">
        <div className="flex items-baseline justify-between px-4 py-4 lg:px-6">
          <div>
            <h2 id="fill-log" className="text-[14px] font-semibold">Every opening this month</h2>
            <p className="text-[12.5px] text-slate-ink">Open the audit log to see each text and reply.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead className="border-y border-line bg-surface text-left text-[12px] text-slate-ink">
              <tr>
                <th scope="col" className="py-2 pl-6 pr-3 font-medium">Opening</th>
                <th scope="col" className="px-3 py-2 font-medium">Visit</th>
                <th scope="col" className="px-3 py-2 font-medium">With</th>
                <th scope="col" className="px-3 py-2 font-medium">Outcome</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Texts</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Time to fill</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Value</th>
                <th scope="col" className="py-2 pl-3 pr-6">
                  <span className="sr-only">Audit log</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {log.map((h) => {
                const provider = providers.find((p) => p.id === h.providerId);
                const chair = chairs.find((c) => c.id === h.chairId);
                return (
                  <tr key={h.id} className="border-b border-line" data-testid="fill-log-row">
                    <td className="py-2.5 pl-6 pr-3">
                      <span className="font-medium text-ink">{fmtDay(h.slotStart)}</span> <span className="num text-slate-ink">{fmtTime(h.slotStart)}</span>
                    </td>
                    <td className="px-3 py-2.5">{typeName(h.typeId)}</td>
                    <td className="px-3 py-2.5 text-ink-2">
                      {provider?.name.replace(/^Dr\. \w+ /, "Dr. ")}, {chair?.name}
                    </td>
                    <td className="px-3 py-2.5">
                      {h.status === "filled" ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-teal-deep">
                          <Bolt className="size-3" /> {h.winner}
                          {h.moveUp ? <Chip tone="teal">move-up</Chip> : null}
                        </span>
                      ) : (
                        <span className="text-slate-ink">Not filled. {h.reason}</span>
                      )}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{h.offers.length}</td>
                    <td className="num px-3 py-2.5 text-right">{h.status === "filled" ? durationWords((h.minutesToFill ?? 0) * 60_000) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">{h.status === "filled" ? <Money value={h.value} /> : <span className="num text-slate">$0</span>}</td>
                    <td className="py-2.5 pl-3 pr-6 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setAudit(h)}>
                        Audit log
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {audit ? <AuditDrawer record={audit} onClose={() => setAudit(null)} /> : null}
    </div>
  );
}

function Kpi({ label, value, note, last, testid }: { label: string; value: string; note: string; last?: boolean; testid?: string }) {
  return (
    <div className={`border-b border-line px-4 py-5 lg:border-b-0 lg:px-6 ${last ? "" : "sm:border-r"}`}>
      <p className="text-[13px] text-slate-ink">{label}</p>
      <p className="num mt-1 text-[28px] font-medium leading-none tracking-[-0.02em] text-ink" data-testid={testid}>
        {value}
      </p>
      <p className="mt-2 text-[12.5px] text-slate-ink">{note}</p>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading reports">
      <div className="border-b border-line px-6 py-4">
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="grid grid-cols-5 border-b border-line">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 border-r border-line px-6 py-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 px-6 py-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

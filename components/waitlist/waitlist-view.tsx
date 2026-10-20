"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Upload } from "lucide-react";
import { Button, Chip, Money, Skeleton, inputCls, type Tone } from "@/components/ui";
import { ExplainerVideo } from "@/components/explainer";
import { useDemoNow, useMounted } from "@/lib/hooks";
import { describePreference, URGENCY_ORDER } from "@/lib/ranking";
import { useDemo } from "@/lib/store";
import { daysBetween, relativeAgo } from "@/lib/time";
import type { WaitlistEntry } from "@/lib/types";
import { EntryDrawer } from "./entry-drawer";
import { ImportDialog } from "./import-dialog";

type SortKey = "waiting" | "urgency" | "name" | "visit";

const URGENCY_CHIP: Record<WaitlistEntry["urgency"], { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "urgent" },
  soon: { label: "Soon", tone: "neutral" },
  routine: { label: "Routine", tone: "outline" },
};

const OUTCOME: Record<string, string> = {
  won: "got the chair",
  declined: "said no",
  "no-reply": "no reply",
  taken: "too slow, it was taken",
  "late-yes": "said yes too late",
};

export function WaitlistView() {
  const mounted = useMounted();
  if (!mounted) return <WaitlistSkeleton />;
  return <WaitlistInner />;
}

function WaitlistInner() {
  const waitlist = useDemo((s) => s.waitlist);
  const types = useDemo((s) => s.practice.appointmentTypes);
  const providers = useDemo((s) => s.providers);
  const now = useDemoNow(30_000);
  const [q, setQ] = useState("");
  const [visit, setVisit] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "urgency", dir: 1 });
  const [editing, setEditing] = useState<WaitlistEntry | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  const phoneCount = useMemo(() => {
    const m = new Map<string, number>();
    waitlist.forEach((w) => m.set(w.phone, (m.get(w.phone) ?? 0) + 1));
    return m;
  }, [waitlist]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = waitlist.filter(
      (w) =>
        (visit === "all" || w.procedureId === visit) &&
        (!term || `${w.firstName} ${w.lastName} ${w.phone} ${w.notes ?? ""}`.toLowerCase().includes(term) || w.phone.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "~")),
    );
    const cmp: Record<SortKey, (a: WaitlistEntry, b: WaitlistEntry) => number> = {
      waiting: (a, b) => a.addedOn.localeCompare(b.addedOn),
      urgency: (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.addedOn.localeCompare(b.addedOn),
      name: (a, b) => a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" }),
      visit: (a, b) => a.procedureId.localeCompare(b.procedureId) || URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
    };
    return [...list].sort((a, b) => cmp[sort.key](a, b) * sort.dir);
  }, [waitlist, q, visit, sort]);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;
  const valueWaiting = waitlist.reduce((s, w) => s + (types.find((t) => t.id === w.procedureId)?.value ?? 0), 0);
  const counts = types.filter((t) => t.waitlist).map((t) => ({ ...t, n: waitlist.filter((w) => w.procedureId === t.id).length }));

  const Th = ({ k, children, className = "" }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th scope="col" className={`whitespace-nowrap px-3 py-2 text-left text-[12px] font-medium text-slate-ink ${className}`} aria-sort={k && sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      {k ? (
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : 1 }))}
          className="inline-flex items-center gap-1 hover:text-ink"
        >
          {children}
          {sort.key === k ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
        </button>
      ) : (
        children
      )}
    </th>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Waitlist</h1>
            <p className="text-[13px] text-slate-ink">
              <span className="num text-ink">{waitlist.length}</span> people want in sooner. ChairFill texts them, in order, when a chair opens.{" "}
              <Money value={valueWaiting} className="text-ink" /> in visits waiting.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={() => setImporting(true)}>
              <Upload className="size-4" /> Import CSV
            </Button>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add a patient
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search the waitlist</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or note" className={`${inputCls} pl-8`} />
          </label>
          <div className="scroll-thin flex max-w-full gap-1 overflow-x-auto" role="tablist" aria-label="Filter by visit">
            {[{ id: "all", name: "Everyone", n: waitlist.length }, ...counts].map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={visit === t.id}
                onClick={() => setVisit(t.id)}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium ${visit === t.id ? "bg-ink text-white" : "text-slate-ink hover:bg-surface hover:text-ink"}`}
              >
                {t.name}
                <span className={`num text-[11.5px] ${visit === t.id ? "text-white/75" : "text-slate"}`}>{t.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {waitlist.length === 0 ? (
        <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-10 md:grid-cols-2">
          <div className="open-outline rounded-card p-6">
            <h2 className="text-[17px] font-semibold">Nobody&apos;s waiting yet</h2>
            <p className="mt-2 text-ink-2">
              Add the people who&apos;ve asked to come in sooner, or import the ASAP list from your practice software. When a chair opens, ChairFill texts them in order.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={() => setEditing("new")}>
                Add a patient
              </Button>
              <Button onClick={() => setImporting(true)}>Import CSV</Button>
            </div>
          </div>
          <ExplainerVideo />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-slate-ink">Nobody matches &ldquo;{q}&rdquo;. Try a last name or the last four digits of their phone.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <Th k="name" className="pl-6">Patient</Th>
                  <Th k="visit">Visit</Th>
                  <Th k="urgency">Urgency</Th>
                  <Th>Prefers</Th>
                  <Th k="waiting">Waiting</Th>
                  <Th>Last offer</Th>
                  <Th>Insurance</Th>
                  <Th className="pr-6"><span className="sr-only">Edit</span></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const waited = daysBetween(w.addedOn, now);
                  const dup = (phoneCount.get(w.phone) ?? 0) > 1;
                  const pref = w.providerPref ? providers.find((p) => p.id === w.providerPref) : undefined;
                  return (
                    <tr key={w.id} className="group border-b border-line align-top hover:bg-teal-wash/60" data-testid="waitlist-row">
                      <td className="py-2.5 pl-6 pr-3">
                        <button type="button" onClick={() => setEditing(w)} className="text-left">
                          <span className="block text-[14px] font-medium text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-2">
                            {w.firstName} {w.lastName}
                          </span>
                          <span className="num block text-[12px] text-slate-ink">{w.phone}</span>
                        </button>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {!w.smsOk ? <Chip tone="danger">Can&apos;t text</Chip> : null}
                          {dup ? <Chip tone="amber">Possible duplicate</Chip> : null}
                        </div>
                        {w.notes ? <p className="mt-1 max-w-[280px] text-[12px] leading-snug text-slate-ink">{w.notes}</p> : null}
                      </td>
                      <td className="px-3 py-2.5 text-[13.5px]">
                        {typeName(w.procedureId)}
                        {pref ? <span className="block text-[12px] text-slate-ink">Only {pref.name}</span> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <Chip tone={URGENCY_CHIP[w.urgency].tone}>{URGENCY_CHIP[w.urgency].label}</Chip>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-ink-2">{describePreference(w.preferredDays, w.windows).replace(/^./, (c) => c.toUpperCase())}</td>
                      <td className="px-3 py-2.5">
                        <span className={`num text-[13px] ${waited > 60 ? "font-semibold text-amber-ink" : "text-ink"}`}>{waited} {waited === 1 ? "day" : "days"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px]">
                        {w.lastOffer ? (
                          <>
                            <span className="block text-ink">{relativeAgo(w.lastOffer.at, now)}</span>
                            <span className="block text-slate-ink">{OUTCOME[w.lastOffer.outcome]}</span>
                          </>
                        ) : (
                          <span className="text-slate">Not yet</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <InsuranceCell w={w} />
                      </td>
                      <td className="py-2.5 pr-6 text-right">
                        <Button size="sm" variant="quiet" onClick={() => setEditing(w)} aria-label={`Edit ${w.firstName} ${w.lastName}`}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone list */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => setEditing(w)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">
                      {w.firstName} {w.lastName}
                    </span>
                    <span className="block text-[12.5px] text-slate-ink">
                      {typeName(w.procedureId)}, {describePreference(w.preferredDays, w.windows)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Chip tone={URGENCY_CHIP[w.urgency].tone}>{URGENCY_CHIP[w.urgency].label}</Chip>
                    <span className="num text-[12px] text-slate-ink">{daysBetween(w.addedOn, now)}d</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? <EntryDrawer entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {importing ? <ImportDialog onClose={() => setImporting(false)} /> : null}
    </div>
  );
}

function InsuranceCell({ w }: { w: WaitlistEntry }) {
  const i = w.insurance;
  if (i.status === "verified")
    return (
      <span className="text-[12.5px] text-ink-2">
        {i.carrier}
        <span className="block text-[11.5px] text-green-ink">Verified</span>
      </span>
    );
  if (i.status === "self-pay") return <Chip tone="neutral">Self-pay</Chip>;
  return (
    <span className="block max-w-[200px]">
      <Chip tone={i.status === "expired" ? "danger" : "amber"}>{i.status === "expired" ? "Expired" : "Check eligibility"}</Chip>
      <span className="mt-1 block text-[11.5px] leading-snug text-slate-ink">
        {i.carrier ? `${i.carrier}. ` : ""}
        {i.note}
      </span>
    </span>
  );
}

export function WaitlistSkeleton() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading the waitlist">
      <div className="space-y-2 border-b border-line px-6 py-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-px px-6 py-3">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-line py-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

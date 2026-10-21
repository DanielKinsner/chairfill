"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bolt } from "@/components/brand";
import { Button, Chip, IconButton, Money, Segmented, Skeleton } from "@/components/ui";
import { FillDialog } from "@/components/fill/fill-dialog";
import { useDemoNow, useMounted } from "@/lib/hooks";
import { WEEK_STARTS } from "@/lib/seed";
import { slotRun, useDemo } from "@/lib/store";
import { fmtDay, fmtMonthDay, fmtTime, ptParts } from "@/lib/time";
import type { Appointment } from "@/lib/types";
import { Details, StateChip } from "./slot-block";
import { isFillable, slotState, weekDates } from "./slot-state";
import { TimeGrid } from "./time-grid";

export function ScheduleView() {
  const mounted = useMounted();
  if (!mounted) return <ScheduleSkeleton />;
  return <ScheduleInner />;
}

function ScheduleInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fillId = params.get("fill");
  const now = useDemoNow(20_000);
  const today = ptParts(now).date;

  const appointments = useDemo((s) => s.appointments);
  const runs = useDemo((s) => s.runs);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const practice = useDemo((s) => s.practice);
  const types = practice.appointmentTypes;

  // `?fill=first` (the landing page's button) opens the first fillable chair. Resolved once, so the dialog
  // doesn't jump to the next open chair the moment this one fills.
  const [firstOpenId] = useState(() =>
    fillId === "first"
      ? [...appointments].sort((a, b) => a.start.localeCompare(b.start)).find((a) => isFillable(slotState(a, runs, now)))?.id
      : undefined,
  );
  const fillSlot = fillId ? appointments.find((a) => a.id === (fillId === "first" ? firstOpenId : fillId)) : undefined;
  const initialWeek = Math.max(0, WEEK_STARTS.findIndex((w) => weekDates(w).includes(fillSlot?.start.slice(0, 10) ?? today)));
  const [week, setWeek] = useState(initialWeek);
  const [view, setView] = useState<"week" | "day">("week");
  const dates = weekDates(WEEK_STARTS[week]);
  const [day, setDay] = useState(dates.includes(today) ? today : dates[0]);
  const [hidden, setHidden] = useState<string[]>([]);

  const shownProviders = providers.filter((p) => !hidden.includes(p.id));
  const shownChairs = chairs.filter((c) => !hidden.includes(c.providerId));
  const weekAppts = useMemo(() => appointments.filter((a) => dates.includes(a.start.slice(0, 10))), [appointments, dates]);
  const visibleAppts = weekAppts.filter((a) => !hidden.includes(a.providerId));

  const openSlots = weekAppts
    .filter((a) => isFillable(slotState(a, runs, now)))
    .sort((a, b) => a.start.localeCompare(b.start));
  const filledThisWeek = weekAppts.filter((a) => a.source === "chairfill");
  const valueOf = (a: Appointment) => types.find((t) => t.id === a.typeId)?.value ?? 0;
  const openValue = openSlots.reduce((s, a) => s + valueOf(a), 0);
  const filledValue = filledThisWeek.reduce((s, a) => s + valueOf(a), 0);

  const openFill = (id: string) => router.push(`/schedule?fill=${id}`, { scroll: false });
  const closeFill = () => router.replace("/schedule", { scroll: false });

  const goWeek = (i: number) => {
    setWeek(i);
    const d = weekDates(WEEK_STARTS[i]);
    setDay(d.includes(today) ? today : d[0]);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left rail: what's open, then who's working */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex" aria-label="Open chairs and providers">
        <div className="sticky top-[52px] flex max-h-[calc(100dvh-52px)] flex-col overflow-y-auto scroll-thin">
          <section className="stagelight px-4 pb-4 pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold text-ink">Open chairs</h2>
              <span className="text-[12px] text-slate-ink">{week === 0 ? "This week" : "Next week"}</span>
            </div>
            {openSlots.length > 0 ? (
              <p className="display mt-1.5 text-[19px] leading-tight text-ink-2">
                {openSlots.length === 1 ? "One chair is waiting for someone." : `${openSlots.length} chairs are waiting for someone.`}
              </p>
            ) : null}
            {openSlots.length === 0 ? (
              <div className="open-outline mt-3 rounded-card px-3 py-4 text-center text-[13px] text-slate-ink">
                Every chair is spoken for {week === 0 ? "this week" : "next week"}.
              </div>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {openSlots.map((a) => {
                  const state = slotState(a, runs, now);
                  const type = types.find((t) => t.id === a.typeId);
                  const chair = chairs.find((c) => c.id === a.chairId);
                  const run = slotRun(runs, a.id);
                  return (
                    <li key={a.id} className={`rounded-card p-2.5 ${state === "filling" ? "open-outline-amber" : "open-outline"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink">
                            {fmtDay(a.start).replace(/,.*/, "")} <span className="num font-medium">{fmtTime(a.start)}</span>
                          </p>
                          <p className="truncate text-[12px] text-slate-ink">
                            {type?.name}, {chair?.name}
                          </p>
                        </div>
                        <Money value={type?.value ?? 0} className="text-[12.5px] font-medium text-ink" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {state === "filling" ? (
                          <>
                            <Chip tone="amber" dot>
                              {run?.offers.filter((o) => ["sent", "delivered", "read", "typing"].includes(o.status)).length ?? 0} offers out
                            </Chip>
                            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => openFill(a.id)}>
                              Watch
                            </Button>
                          </>
                        ) : (
                          <>
                            {a.openedBy ? <span className="text-[11.5px] text-slate-ink">Opened by a move-up</span> : null}
                            <Button size="sm" variant="primary" className="ml-auto" onClick={() => openFill(a.id)}>
                              Fill this slot
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="border-t border-line px-4 py-4">
            <h2 className="text-[13px] font-semibold text-ink">Providers</h2>
            <ul className="mt-2 space-y-1">
              {providers.map((p) => {
                const on = !hidden.includes(p.id);
                const pChairs = chairs.filter((c) => c.providerId === p.id);
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-[6px] px-1.5 py-1.5 hover:bg-white">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setHidden((h) => (on ? (h.length < providers.length - 1 ? [...h, p.id] : h) : h.filter((x) => x !== p.id)))}
                        className="mt-0.5 size-4 accent-[#0C7C7E]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-ink">
                          {p.name}, {p.credentials}
                        </span>
                        <span className="block text-[12px] text-slate-ink">
                          {pChairs.map((c) => c.name).join(" and ")}, {p.role === "hygienist" ? "hygiene" : "restorative"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="border-t border-line px-4 py-4">
            <h2 className="text-[13px] font-semibold text-ink">Filled by ChairFill</h2>
            <p className="mt-1 text-[12.5px] text-slate-ink">
              <span className="num text-ink">{filledThisWeek.length}</span> {filledThisWeek.length === 1 ? "chair" : "chairs"} this week,{" "}
              <Money value={filledValue} className="text-ink" /> that would have sat empty.
            </p>
            <Legend />
          </section>
        </div>
      </aside>

      {/* Main schedule */}
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Schedule">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 lg:px-5">
          <div className="flex items-center gap-1">
            <IconButton label="Previous week" disabled={week === 0} onClick={() => goWeek(week - 1)} className="disabled:opacity-40">
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton label="Next week" disabled={week === WEEK_STARTS.length - 1} onClick={() => goWeek(week + 1)} className="disabled:opacity-40">
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
          <h1 className="text-[17px] font-semibold tracking-[-0.01em]">
            {fmtMonthDay(`${dates[0]}T12:00:00-07:00`)} to {fmtMonthDay(`${dates[4]}T12:00:00-07:00`).replace(/^\w+ /, "")}
            <span className="ml-2 text-[13px] font-normal text-slate-ink">{week === 0 ? "This week" : "Next week"}</span>
          </h1>
          <div className="hidden md:block">
            <Segmented
              label="Schedule view"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "week", label: "Week" },
                { value: "day", label: "Day" },
              ]}
            />
          </div>
          {view === "day" ? (
            <div className="hidden gap-1 md:flex" role="tablist" aria-label="Day">
              {dates.map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={d === day}
                  onClick={() => setDay(d)}
                  className={`h-7 rounded-[6px] px-2 text-[12.5px] font-medium ${d === day ? "bg-ink text-white" : "text-slate-ink hover:bg-surface hover:text-ink"}`}
                >
                  {fmtDay(`${d}T12:00:00-07:00`).replace(/^(\w+), \w+ /, "$1 ")}
                </button>
              ))}
            </div>
          ) : null}
          <dl className="ml-auto hidden items-center gap-5 sm:flex">
            <div className="text-right">
              <dt className="text-[11.5px] text-slate-ink">Open {week === 0 ? "this week" : "next week"}</dt>
              <dd className="text-[13px] font-semibold text-ink">
                <span className="num">{openSlots.length}</span> {openSlots.length === 1 ? "chair" : "chairs"}, <Money value={openValue} />
              </dd>
            </div>
            <div className="text-right">
              <dt className="flex items-center justify-end gap-1 text-[11.5px] text-slate-ink">
                <Bolt className="size-3 text-teal" /> Filled by ChairFill
              </dt>
              <dd className="text-[13px] font-semibold text-teal-deep">
                <span className="num">{filledThisWeek.length}</span>, <Money value={filledValue} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Open slots strip for tablets, where the rail is hidden */}
        {openSlots.length > 0 ? (
          <div className="scroll-thin flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2 lg:hidden">
            {openSlots.map((a) => {
              const state = slotState(a, runs, now);
              const type = types.find((t) => t.id === a.typeId);
              return (
                <button
                  key={a.id}
                  onClick={() => openFill(a.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-card px-2.5 py-1.5 text-left text-[12.5px] ${state === "filling" ? "open-outline-amber" : "open-outline"}`}
                >
                  <span className="font-semibold">{fmtDay(a.start).replace(/,.*/, "")}</span>
                  <span className="num">{fmtTime(a.start)}</span>
                  <span className="text-slate-ink">{type?.name}</span>
                  <span className="font-semibold text-teal-ink">{state === "filling" ? "Watch" : "Fill"}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="hidden md:block">
          {view === "week" ? (
            <TimeGrid
              dates={dates}
              chairs={shownChairs}
              providers={shownProviders}
              practice={practice}
              appointments={visibleAppts}
              runs={runs}
              now={now}
              onFill={openFill}
              onPickDay={(d) => {
                setDay(d);
                setView("day");
              }}
              pxPerHour={56}
            />
          ) : (
            <TimeGrid
              dates={[day]}
              chairs={shownChairs}
              providers={shownProviders}
              practice={practice}
              appointments={visibleAppts}
              runs={runs}
              now={now}
              onFill={openFill}
              pxPerHour={76}
            />
          )}
        </div>

        <Agenda dates={dates} today={today} appointments={visibleAppts} now={now} onFill={openFill} />
      </section>

      {fillSlot ? <FillDialog slot={fillSlot} onClose={closeFill} /> : null}
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 space-y-1.5 text-[12px] text-slate-ink">
      <li className="flex items-center gap-2">
        <span className="h-3.5 w-5 rounded-[3px] border border-line bg-surface" /> Booked
      </li>
      <li className="flex items-center gap-2">
        <span className="open-outline h-3.5 w-5 rounded-[3px]" /> Open, ready to fill
      </li>
      <li className="flex items-center gap-2">
        <span className="open-outline-amber h-3.5 w-5 rounded-[3px]" /> Offers out
      </li>
      <li className="flex items-center gap-2">
        <span className="flex h-3.5 w-5 items-center justify-center rounded-[3px] border border-teal/50 bg-teal-soft text-teal-deep">
          <Bolt className="size-2.5" />
        </span>
        Filled by ChairFill
      </li>
      <li className="flex items-center gap-2">
        <span className="hatch h-3.5 w-5 rounded-[3px] border border-line" /> Cancelled, time passed
      </li>
    </ul>
  );
}

/** Phones and narrow screens: one day at a time, grouped by chair. */
function Agenda({
  dates,
  today,
  appointments,
  now,
  onFill,
}: {
  dates: string[];
  today: string;
  appointments: Appointment[];
  now: string;
  onFill: (id: string) => void;
}) {
  const [day, setDay] = useState(dates.includes(today) ? today : dates[0]);
  const runs = useDemo((s) => s.runs);
  const chairs = useDemo((s) => s.chairs);
  const providers = useDemo((s) => s.providers);
  const types = useDemo((s) => s.practice.appointmentTypes);
  const dayList = appointments.filter((a) => a.start.startsWith(day));
  const activeDay = dates.includes(day) ? day : dates[0];
  return (
    <div className="md:hidden">
      <div className="sticky top-[95px] z-10 flex gap-1 border-b border-line bg-white px-3 py-2" role="tablist" aria-label="Day">
        {dates.map((d) => {
          const open = appointments.filter((a) => a.start.startsWith(d) && isFillable(slotState(a, runs, now))).length;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={d === activeDay}
              onClick={() => setDay(d)}
              className={`relative flex flex-1 flex-col items-center rounded-[6px] py-1.5 text-[12px] ${d === activeDay ? "bg-ink text-white" : "text-slate-ink"}`}
            >
              <span className="font-medium">{fmtDay(`${d}T12:00:00-07:00`).slice(0, 3)}</span>
              <span className="num text-[13px] font-semibold">{d.slice(8)}</span>
              {open ? <span className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${d === activeDay ? "bg-white" : "bg-teal"}`} aria-label={`${open} open`} /> : null}
            </button>
          );
        })}
      </div>
      <div className="space-y-4 px-3 py-3">
        {/* Phones open on the moment, not the list: every open chair today, as a card you can fill with a thumb. */}
        {(() => {
          const open = dayList.filter((a) => isFillable(slotState(a, runs, now))).sort((a, b) => a.start.localeCompare(b.start));
          if (open.length === 0) return null;
          return (
            <section aria-label="Open chairs today" className="stagelight -mx-3 border-b border-line px-3 pb-4">
              <p className="display text-[24px] leading-tight text-ink">
                {open.length === 1 ? "One chair is waiting for someone." : `${open.length} chairs are waiting for someone.`}
              </p>
              <ul className="mt-3 space-y-2">
                {open.map((a) => {
                  const state = slotState(a, runs, now);
                  const type = types.find((t) => t.id === a.typeId);
                  const c = chairs.find((x) => x.id === a.chairId);
                  return (
                    <li key={a.id} className={`flex items-center gap-3 rounded-card px-3 py-3 ${state === "filling" ? "open-outline-amber" : "open-outline"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="num block text-[18px] font-medium text-ink">{fmtTime(a.start)}</span>
                        <span className="block truncate text-[12.5px] text-slate-ink">
                          {type?.name}, {c?.name}
                          {type ? `, $${type.value.toLocaleString()}` : ""}
                        </span>
                      </span>
                      <Button size="lg" variant={state === "filling" ? "secondary" : "primary"} onClick={() => onFill(a.id)}>
                        {state === "filling" ? "Watch" : "Fill this slot"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })()}
        {chairs.map((c) => {
          const list = dayList.filter((a) => a.chairId === c.id).sort((a, b) => a.start.localeCompare(b.start));
          if (list.length === 0) return null;
          const p = providers.find((x) => x.id === c.providerId);
          return (
            <section key={c.id}>
              <h2 className="mb-1.5 text-[12.5px] font-semibold text-slate-ink">
                {c.name}, {p?.name}
              </h2>
              <ul className="overflow-hidden rounded-card border border-line">
                {list.map((a) => {
                  const state = slotState(a, runs, now);
                  const type = types.find((t) => t.id === a.typeId);
                  const fillable = isFillable(state);
                  return (
                    <li key={a.id} className={`flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${fillable ? "bg-white" : ""}`}>
                      <span className="num w-[62px] shrink-0 text-[12.5px] text-slate-ink">{fmtTime(a.start)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{fillable ? "Open" : a.patient.name}</span>
                        <span className="block truncate text-[12px] text-slate-ink">
                          {type?.name}
                          {fillable && type ? `, $${type.value.toLocaleString()}` : ""}
                        </span>
                      </span>
                      {fillable ? (
                        <Button size="sm" variant={state === "filling" ? "secondary" : "primary"} onClick={() => onFill(a.id)}>
                          {state === "filling" ? "Watch" : "Fill"}
                        </Button>
                      ) : state === "chairfill" ? (
                        <Bolt className="size-3.5 text-teal" title="Filled by ChairFill" />
                      ) : state === "no-show" || state === "cancelled-past" || state === "in-chair" ? (
                        <StateChip state={state} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="flex flex-1" aria-busy="true" aria-label="Loading the schedule">
      <div className="hidden w-[248px] shrink-0 space-y-3 border-r border-line bg-surface p-4 lg:block">
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="open-outline space-y-2 rounded-card p-2.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-[52px_repeat(5,1fr)] gap-px p-px">
          <div />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5 p-2">
              <Skeleton className="h-3.5 w-20" />
              {Array.from({ length: 7 }, (_, j) => (
                <Skeleton key={j} className="h-11 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Details };

"use client";

import { useMemo } from "react";
import { fmtDay, ptParts, toMs } from "@/lib/time";
import type { Appointment, Chair, FillRun, Practice, Provider } from "@/lib/types";
import { SlotBlock } from "./slot-block";
import { isFillable, slotState } from "./slot-state";

const DAY_START = 8 * 60;
const DAY_END = 17 * 60;
const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i);

const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`;
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export function TimeGrid({
  dates,
  chairs,
  providers,
  practice,
  appointments,
  runs,
  now,
  onFill,
  onPickDay,
  pxPerHour,
}: {
  dates: string[];
  chairs: Chair[];
  providers: Provider[];
  practice: Practice;
  appointments: Appointment[];
  runs: FillRun[];
  now: string;
  onFill: (id: string) => void;
  onPickDay?: (date: string) => void;
  pxPerHour: number;
}) {
  const px = pxPerHour / 60;
  const height = (DAY_END - DAY_START) * px;
  const roomy = dates.length === 1 || chairs.length <= 2;
  const today = ptParts(now).date;
  const nowMin = ptParts(now).minutesOfDay;

  const byDayChair = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const k = `${a.start.slice(0, 10)}|${a.chairId}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [appointments]);

  const groups = providers
    .map((p) => ({ provider: p, chairs: chairs.filter((c) => c.providerId === p.id) }))
    .filter((g) => g.chairs.length > 0);

  return (
    <div className="min-w-[720px]">
      {/* Header: day, then provider, then chair */}
      <div className="sticky top-[52px] z-20 grid border-b border-line bg-white max-lg:top-[95px]" style={{ gridTemplateColumns: `52px repeat(${dates.length}, minmax(0, 1fr))` }}>
        <div className="border-r border-line" />
        {dates.map((d) => {
          const isToday = d === today;
          const dayAppts = appointments.filter((a) => a.start.startsWith(d));
          const open = dayAppts.filter((a) => isFillable(slotState(a, runs, now))).length;
          const dow = ptParts(`${d}T12:00:00-07:00`).weekday;
          const closesAt = practice.hours[dow as keyof Practice["hours"]]?.[1];
          return (
            <div key={d} className={`border-r border-line last:border-r-0 ${isToday ? "bg-teal-wash" : ""}`}>
              <button
                type="button"
                disabled={!onPickDay}
                onClick={() => onPickDay?.(d)}
                className="flex w-full items-center gap-2 px-2.5 pb-1 pt-2 text-left enabled:hover:bg-surface"
                aria-label={onPickDay ? `Open ${fmtDay(`${d}T12:00:00-07:00`)} in day view` : undefined}
              >
                <span className={`text-[13px] font-semibold ${isToday ? "text-teal-deep" : "text-ink"}`}>{fmtDay(`${d}T12:00:00-07:00`)}</span>
                {isToday ? <span className="text-[11px] font-semibold text-teal-deep">Today</span> : null}
                {closesAt && toMin(closesAt) < DAY_END ? <span className="text-[11px] text-slate-ink">Closes 1 PM</span> : null}
                {open > 0 ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-[4px] border border-dashed border-line-strong bg-white px-1.5 text-[11px] font-medium text-ink-2">
                    {open} open
                  </span>
                ) : null}
              </button>
              <div className="flex px-[2px]">
                {groups.map((g) => (
                  <div key={g.provider.id} className="min-w-0 border-l border-line first:border-l-0" style={{ flex: g.chairs.length }}>
                    <div className="truncate px-1 text-[10.5px] font-medium text-slate-ink" title={`${g.provider.name}, ${g.provider.credentials}`}>
                      {roomy ? `${g.provider.name}, ${g.provider.credentials}` : g.provider.name.split(" ").at(-1)}
                    </div>
                    <div className="flex">
                      {g.chairs.map((c) => (
                        <div key={c.id} className="num min-w-0 flex-1 truncate px-1 pb-1 text-[10.5px] text-slate-ink">
                          {roomy ? c.name : c.name.replace("Chair ", "Ch ")}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="grid" style={{ gridTemplateColumns: `52px repeat(${dates.length}, minmax(0, 1fr))` }}>
        <div className="relative border-r border-line" style={{ height }}>
          {HOURS.map((h) => (
            <span key={h} className="num absolute right-2 -translate-y-1/2 text-[10.5px] text-slate-ink first:translate-y-0" style={{ top: (h * 60 - DAY_START) * px + (h === 8 ? 4 : 0) }}>
              {hourLabel(h)}
            </span>
          ))}
        </div>
        {dates.map((d, di) => {
          const dow = ptParts(`${d}T12:00:00-07:00`).weekday as keyof Practice["hours"];
          const hours = practice.hours[dow];
          const close = hours ? toMin(hours[1]) : DAY_END;
          const isToday = d === today;
          return (
            <div
              key={d}
              className="relative border-r border-line last:border-r-0"
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0 1px, transparent 1px ${pxPerHour}px), repeating-linear-gradient(to bottom, transparent 0 ${pxPerHour / 2}px, #eef2f4 ${pxPerHour / 2}px ${pxPerHour / 2 + 1}px, transparent ${pxPerHour / 2 + 1}px ${pxPerHour}px)`,
              }}
            >
              {/* Lunch and closed hours */}
              {close >= toMin(practice.lunch[1]) ? (
                <div
                  className="hatch absolute inset-x-0 flex items-center justify-center border-y border-line text-[10.5px] text-slate-ink"
                  style={{ top: (toMin(practice.lunch[0]) - DAY_START) * px, height: (toMin(practice.lunch[1]) - toMin(practice.lunch[0])) * px }}
                >
                  Lunch
                </div>
              ) : null}
              {close < DAY_END ? (
                <div className="hatch absolute inset-x-0 bottom-0 flex items-start justify-center border-t border-line pt-3 text-[11px] text-slate-ink" style={{ top: (close - DAY_START) * px }}>
                  Closed Friday afternoons
                </div>
              ) : null}

              <div className="absolute inset-0 flex px-[2px]">
                {groups.map((g) => (
                  <div key={g.provider.id} className="flex min-w-0 border-l border-line/70 first:border-l-0" style={{ flex: g.chairs.length }}>
                    {g.chairs.map((c, ci) => {
                      const list = byDayChair.get(`${d}|${c.id}`) ?? [];
                      const laneIndex = chairs.findIndex((x) => x.id === c.id);
                      return (
                        <div key={c.id} className={`relative min-w-0 flex-1 ${ci > 0 ? "border-l border-dashed border-line/60" : ""}`}>
                          {list.map((a) => {
                            const m = ptParts(a.start).minutesOfDay;
                            const state = slotState(a, runs, now);
                            const popRight = dates.length === 1 ? laneIndex < chairs.length - 2 : di < dates.length - 2;
                            return (
                              <SlotBlock
                                key={a.id}
                                appt={a}
                                state={state}
                                top={(m - DAY_START) * px + 1}
                                height={a.durationMin * px - 2}
                                now={now}
                                onFill={onFill}
                                roomy={roomy}
                                popSide={popRight ? "right" : "left"}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {isToday && nowMin > DAY_START && nowMin < DAY_END ? (
                <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMin - DAY_START) * px }} aria-hidden>
                  <div className="relative h-px bg-teal">
                    <span className="absolute -left-1 -top-[3px] size-[7px] rounded-full bg-teal" />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const isPast = (a: Appointment, now: string) => toMs(a.start) < toMs(now);

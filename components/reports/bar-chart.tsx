"use client";

import { useState } from "react";

export interface Bar {
  key: string;
  label: string;
  value: number;
  tip: string;
  muted?: boolean;
}

/**
 * Single-series column chart. Thin teal columns with 4px rounded tops sitting
 * on the baseline, 2px gaps, recessive gridlines, and a tooltip on hover/focus
 * with a hit area the full height of the plot.
 */
export function ColumnChart({ bars, format, height = 160, label }: { bars: Bar[]; format: (v: number) => string; height?: number; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  return (
    <figure aria-label={label} className="w-full">
      <div className="relative grid grid-cols-[44px_1fr]">
        {/* y axis */}
        <div className="relative" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="num absolute right-2 -translate-y-1/2 text-[10.5px] text-slate-ink" style={{ top: height - (t / top) * height }}>
              {format(t)}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} aria-hidden className={`absolute inset-x-0 h-px ${t === 0 ? "bg-line-strong" : "bg-line/70"}`} style={{ top: height - (t / top) * height }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px] px-1">
            {bars.map((b) => {
              const h = Math.max(b.value > 0 ? 2 : 0, (b.value / top) * height);
              const on = hover === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  aria-label={`${b.label}: ${b.tip}`}
                  onMouseEnter={() => setHover(b.key)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(b.key)}
                  onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-offset-0"
                >
                  <span
                    className={`block w-full max-w-[44px] rounded-t-[4px] transition-colors ${b.muted ? "bg-teal/35" : on ? "bg-teal-deep" : "bg-teal"}`}
                    style={{ height: h }}
                  />
                  {on ? (
                    <span role="tooltip" className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-[220px] rounded-[6px] border border-line bg-white px-2.5 py-1.5 text-left text-[12px] shadow-lift" style={{ bottom: h + 6 }}>
                      <span className="block font-semibold text-ink">{b.label}</span>
                      <span className="block text-ink-2">{b.tip}</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[44px_1fr]" aria-hidden>
        <span />
        <div className="flex gap-[2px] px-1 pt-1.5">
          {bars.map((b) => (
            <span key={b.key} className="num flex-1 truncate text-center text-[10.5px] text-slate-ink">
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

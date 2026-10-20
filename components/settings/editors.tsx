"use client";

// Editors shared by Settings and the setup wizard. Each one writes straight to
// the demo store, so the wizard and the settings page can never disagree.

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react";
import { Chip, Field, IconButton, Switch, inputCls } from "@/components/ui";
import templatesJson from "@/data/templates.json";
import { RULE_COPY } from "@/lib/ranking";
import { useDemo } from "@/lib/store";
import { MERGE_FIELDS, renderTemplate, smsSegments, TEMPLATE_INFO, unknownFields, type MergeKey } from "@/lib/templates";
import { fmtHHMM } from "@/lib/time";
import type { Chair, Provider, Templates } from "@/lib/types";

// ---------------------------------------------------------------- ranking rules

export function RulesEditor() {
  const settings = useDemo((s) => s.settings);
  const update = useDemo((s) => s.updateSettings);
  const order = settings.ruleOrder;
  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    update({ ruleOrder: next });
  };
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-card border border-line p-3.5">
        <div>
          <p className="font-medium text-ink">Offer move-ups first</p>
          <p className="text-[13px] text-slate-ink">Patients already booked later who said earlier is fine get the first text. They&apos;re the easiest yes.</p>
        </div>
        <Switch label="Offer move-ups first" checked={settings.moveUpsFirst} onChange={(v) => update({ moveUpsFirst: v })} />
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink">Then rank the waitlist by</p>
        <ol className="overflow-hidden rounded-card border border-line">
          {order.map((r, i) => (
            <li key={r} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-b-0">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[12px] text-slate-ink">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{RULE_COPY[r].name}</p>
                <p className="text-[12.5px] text-slate-ink">{RULE_COPY[r].detail}</p>
              </div>
              <IconButton label={`Move ${RULE_COPY[r].name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30">
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton label={`Move ${RULE_COPY[r].name} down`} disabled={i === order.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30">
                <ArrowDown className="size-4" />
              </IconButton>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-card border border-line p-3.5">
        <div>
          <p className="font-medium text-ink">Offer other visits that fit</p>
          <p className="text-[13px] text-slate-ink">After everyone waiting for the exact visit, offer the slot to people whose visit fits the time and the provider. A perio patient can take a cleaning slot.</p>
        </div>
        <Switch label="Offer other visits that fit" checked={settings.allowFits} onChange={(v) => update({ allowFits: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stepper
          label="Rest between offers"
          hint="Don't text the same person again for this many hours."
          value={settings.cooldownHours}
          unit="hours"
          min={0}
          max={72}
          step={4}
          onChange={(v) => update({ cooldownHours: v })}
        />
        <Stepper
          label="Daily limit per patient"
          hint="Most offers one person can get in a day."
          value={settings.dailyCap}
          unit={settings.dailyCap === 1 ? "offer" : "offers"}
          min={1}
          max={5}
          step={1}
          onChange={(v) => update({ dailyCap: v })}
        />
      </div>
    </div>
  );
}

function Stepper({ label, hint, value, unit, min, max, step, onChange }: { label: string; hint: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-card border border-line p-3.5">
      <p className="font-medium text-ink">{label}</p>
      <p className="text-[12.5px] text-slate-ink">{hint}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <IconButton label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - step))} className="border border-line-strong">
          <Minus className="size-4" />
        </IconButton>
        <span className="num min-w-[86px] text-center text-[15px] text-ink" aria-live="polite">
          {value} {unit}
        </span>
        <IconButton label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + step))} className="border border-line-strong">
          <Plus className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- offer strategy

export function StrategyEditor() {
  const settings = useDemo((s) => s.settings);
  const update = useDemo((s) => s.updateSettings);
  const card = (on: boolean) => `flex w-full flex-col rounded-card border p-4 text-left transition-colors ${on ? "border-teal-ink bg-teal-wash shadow-[0_0_0_1px_var(--color-teal-ink)]" : "border-line-strong hover:border-slate"}`;
  return (
    <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="How offers go out">
      <button type="button" role="radio" aria-checked={settings.strategy === "batch"} onClick={() => update({ strategy: "batch" })} className={card(settings.strategy === "batch")}>
        <span className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-ink">A few at once</span>
          {settings.strategy === "batch" ? <Chip tone="teal">Selected</Chip> : null}
        </span>
        <span className="mt-1 text-[13px] text-ink-2">Text the top {settings.batchSize} together. First yes wins, the others hear it&apos;s taken. Fastest; best for same-day openings.</span>
      </button>
      <button type="button" role="radio" aria-checked={settings.strategy === "one"} onClick={() => update({ strategy: "one" })} className={card(settings.strategy === "one")}>
        <span className="flex items-center justify-between">
          <span className="text-[15px] font-semibold text-ink">One at a time</span>
          {settings.strategy === "one" ? <Chip tone="teal">Selected</Chip> : null}
        </span>
        <span className="mt-1 text-[13px] text-ink-2">
          Text one person and wait up to {settings.offerWindowMin} minutes before moving on. Nobody hears &ldquo;sorry, it&apos;s taken.&rdquo; Best when the opening is days away.
        </span>
      </button>
      <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
        <Field label="How many at once" htmlFor="st-batch" hint="Used when sending a few at once.">
          <select id="st-batch" className={inputCls} value={settings.batchSize} onChange={(e) => update({ batchSize: Number(e.target.value) })}>
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} people
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time to answer" htmlFor="st-window" hint="After this, ChairFill moves to the next person.">
          <select id="st-window" className={inputCls} value={settings.offerWindowMin} onChange={(e) => update({ offerWindowMin: Number(e.target.value) })}>
            {[5, 10, 15, 30].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- templates

const SAMPLE: Record<MergeKey, string> = {
  first_name: "Rosa",
  procedure: "cleaning",
  day: "today",
  time: "2:00 PM",
  provider: "Marisol",
  practice: "Maple Family Dental",
  link: "chairfill.vercel.app/o/K7QX",
};

export function TemplatesEditor({ only }: { only?: (keyof Templates)[] }) {
  const templates = useDemo((s) => s.templates);
  const practiceName = useDemo((s) => s.practice.name);
  const update = useDemo((s) => s.updateTemplates);
  const keys = (only ?? (Object.keys(TEMPLATE_INFO) as (keyof Templates)[])).filter((k) => k in templates);
  return (
    <div className="space-y-5">
      {keys.map((k) => (
        <TemplateField
          key={k}
          id={k}
          value={templates[k]}
          onChange={(v) => update({ [k]: v })}
          onReset={() => update({ [k]: (templatesJson as Templates)[k] })}
          sample={{ ...SAMPLE, practice: practiceName }}
        />
      ))}
    </div>
  );
}

function TemplateField({ id, value, onChange, onReset, sample }: { id: keyof Templates; value: string; onChange: (v: string) => void; onReset: () => void; sample: Record<MergeKey, string> }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const preview = renderTemplate(value, sample);
  const seg = smsSegments(preview);
  const unknown = unknownFields(value);
  const insert = (key: string) => {
    const el = ref.current;
    const token = `{${key}}`;
    if (!el) return onChange(value + token);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <div className="grid gap-4 rounded-card border border-line p-4 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`tpl-${id}`} className="font-semibold text-ink">
            {TEMPLATE_INFO[id].name}
          </label>
          {value !== (templatesJson as Templates)[id] ? (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-teal-ink hover:underline">
              <RotateCcw className="size-3" /> Use the original
            </button>
          ) : null}
        </div>
        <p className="text-[12.5px] text-slate-ink">{TEMPLATE_INFO[id].when}</p>
        <textarea
          ref={ref}
          id={`tpl-${id}`}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-2 h-auto py-2 leading-snug`}
          aria-describedby={`tpl-${id}-help`}
        />
        <div id={`tpl-${id}-help`} className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-slate-ink">Insert:</span>
          {MERGE_FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              title={f.label}
              onClick={() => insert(f.key)}
              className="num h-6 rounded-[4px] border border-line-strong bg-surface px-1.5 text-[11.5px] text-ink-2 hover:border-teal hover:text-teal-deep"
            >
              {`{${f.key}}`}
            </button>
          ))}
        </div>
        {unknown.length ? (
          <p className="mt-2 text-[12.5px] text-danger" role="alert">
            {unknown.map((u) => `{${u}}`).join(", ")} isn&apos;t a merge field, so patients would see it as typed.
          </p>
        ) : null}
        {id === "offer" && !value.includes("{link}") ? <p className="mt-2 text-[12.5px] text-amber-ink">Without {"{link}"}, patients can only answer by replying YES or NO.</p> : null}
      </div>
      <div>
        <p className="mb-1.5 text-[12px] text-slate-ink">What Rosa sees</p>
        <div className="rounded-[14px] border border-line-strong bg-surface/60 p-2.5">
          <div className="max-w-[94%] rounded-[12px] rounded-bl-[4px] border border-line bg-white px-2.5 py-1.5 text-[12px] leading-snug text-ink">{preview}</div>
        </div>
        <p className={`num mt-1.5 text-[11.5px] ${seg.segments > 1 ? "text-amber-ink" : "text-slate-ink"}`}>
          {seg.units} characters, {seg.segments} {seg.segments === 1 ? "text" : "texts"}
          {seg.encoding === "UCS-2" ? " (a special character shortens each text to 70)" : ""}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- quiet hours

export function QuietHoursEditor() {
  const settings = useDemo((s) => s.settings);
  const update = useDemo((s) => s.updateSettings);
  const q = settings.quietHours;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-card border border-line p-3.5">
        <div>
          <p className="font-medium text-ink">Hold texts overnight</p>
          <p className="text-[13px] text-slate-ink">
            {q.enabled
              ? `Nothing goes out between ${fmtHHMM(q.start)} and ${fmtHHMM(q.end)}. Openings found overnight are offered at ${fmtHHMM(q.end)}.`
              : "Offers go out the moment a chair opens, day or night."}
          </p>
        </div>
        <Switch label="Hold texts overnight" checked={q.enabled} onChange={(v) => update({ quietHours: { ...q, enabled: v } })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quiet from" htmlFor="qh-start">
          <input id="qh-start" type="time" className={`${inputCls} num`} value={q.start} disabled={!q.enabled} onChange={(e) => update({ quietHours: { ...q, start: e.target.value } })} />
        </Field>
        <Field label="Until" htmlFor="qh-end">
          <input id="qh-end" type="time" className={`${inputCls} num`} value={q.end} disabled={!q.enabled} onChange={(e) => update({ quietHours: { ...q, end: e.target.value } })} />
        </Field>
        <Field label="Shortest notice" htmlFor="qh-lead" hint="Warn before offering a slot that starts sooner than this.">
          <select id="qh-lead" className={inputCls} value={settings.minLeadMinutes} onChange={(e) => update({ minLeadMinutes: Number(e.target.value) })}>
            {[30, 45, 60, 90, 120].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- visit types and values

export function TypesEditor() {
  const practice = useDemo((s) => s.practice);
  const updatePractice = useDemo((s) => s.updatePractice);
  const types = practice.appointmentTypes;
  const set = (id: string, patch: Partial<(typeof types)[number]>) =>
    updatePractice({ appointmentTypes: types.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[560px] text-[13.5px]">
        <thead className="bg-surface text-left text-[12px] text-slate-ink">
          <tr>
            <th scope="col" className="px-3.5 py-2 font-medium">Visit</th>
            <th scope="col" className="px-3 py-2 font-medium">Who</th>
            <th scope="col" className="px-3 py-2 font-medium">Length</th>
            <th scope="col" className="px-3 py-2 font-medium">Value per slot</th>
            <th scope="col" className="px-3.5 py-2 font-medium">ChairFill fills it</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id} className="border-t border-line">
              <td className="px-3.5 py-2 font-medium text-ink">{t.name}</td>
              <td className="px-3 py-2 text-slate-ink">{t.role === "hygienist" ? "Hygiene" : "Doctor"}</td>
              <td className="px-3 py-2">
                <label className="sr-only" htmlFor={`ty-d-${t.id}`}>
                  {t.name} length
                </label>
                <select id={`ty-d-${t.id}`} className={`${inputCls} h-8 w-[104px]`} value={t.durationMin} onChange={(e) => set(t.id, { durationMin: Number(e.target.value) })}>
                  {[30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <label className="sr-only" htmlFor={`ty-v-${t.id}`}>
                  {t.name} value
                </label>
                <div className="relative w-[112px]">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate">$</span>
                  <input
                    id={`ty-v-${t.id}`}
                    inputMode="numeric"
                    className={`${inputCls} num h-8 pl-6`}
                    value={t.value}
                    onChange={(e) => set(t.id, { value: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                  />
                </div>
              </td>
              <td className="px-3.5 py-2">
                <Switch label={`ChairFill fills ${t.name}`} checked={t.waitlist} onChange={(v) => set(t.id, { waitlist: v })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- practice, providers, chairs

export function PracticeEditor() {
  const practice = useDemo((s) => s.practice);
  const providers = useDemo((s) => s.providers);
  const chairs = useDemo((s) => s.chairs);
  const updatePractice = useDemo((s) => s.updatePractice);
  const updateProviders = useDemo((s) => s.updateProviders);
  const [address, setAddress] = useState(practice.address.line1);

  const setProvider = (id: string, patch: Partial<Provider>) => updateProviders(providers.map((p) => (p.id === id ? { ...p, ...patch } : p)), chairs);
  const setChairCount = (p: Provider, n: number) => {
    const mine = chairs.filter((c) => c.providerId === p.id);
    let next: Chair[] = chairs;
    if (n > mine.length) {
      const nextNum = Math.max(...chairs.map((c) => Number(c.name.replace(/\D/g, "")) || 0)) + 1;
      next = [...chairs, { id: `ch${Date.now().toString(36)}`, name: `Chair ${nextNum}`, providerId: p.id }];
    } else if (n < mine.length && mine.length > 1) {
      const drop = mine[mine.length - 1].id;
      next = chairs.filter((c) => c.id !== drop);
    }
    updateProviders(
      providers.map((x) => (x.id === p.id ? { ...x, chairIds: next.filter((c) => c.providerId === p.id).map((c) => c.id) } : x)),
      next,
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Practice name" htmlFor="pr-name" hint="Patients see this at the start of every text.">
          <input id="pr-name" className={inputCls} value={practice.name} onChange={(e) => updatePractice({ name: e.target.value })} />
        </Field>
        <Field label="Main phone" htmlFor="pr-phone">
          <input id="pr-phone" className={`${inputCls} num`} value={practice.phone} onChange={(e) => updatePractice({ phone: e.target.value })} />
        </Field>
        <Field label="Street address" htmlFor="pr-addr">
          <input
            id="pr-addr"
            className={inputCls}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => updatePractice({ address: { ...practice.address, line1: address } })}
          />
        </Field>
        <Field label="City" htmlFor="pr-city">
          <input id="pr-city" className={inputCls} value={practice.address.city} onChange={(e) => updatePractice({ address: { ...practice.address, city: e.target.value } })} />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium text-ink">Providers and chairs</p>
        <ul className="overflow-hidden rounded-card border border-line">
          {providers.map((p) => {
            const n = chairs.filter((c) => c.providerId === p.id).length;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3.5 py-3 last:border-b-0">
                <label className="sr-only" htmlFor={`pv-${p.id}`}>
                  Provider name
                </label>
                <input id={`pv-${p.id}`} className={`${inputCls} min-w-[180px] flex-1`} value={p.name} onChange={(e) => setProvider(p.id, { name: e.target.value })} />
                <label className="sr-only" htmlFor={`pvc-${p.id}`}>
                  Credentials
                </label>
                <input id={`pvc-${p.id}`} className={`${inputCls} w-[76px]`} value={p.credentials} onChange={(e) => setProvider(p.id, { credentials: e.target.value })} />
                <span className="w-[72px] text-[13px] text-slate-ink">{p.role === "hygienist" ? "Hygienist" : "Dentist"}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <IconButton label={`One fewer chair for ${p.name}`} onClick={() => setChairCount(p, n - 1)} disabled={n <= 1} className="border border-line-strong disabled:opacity-40">
                    <Minus className="size-3.5" />
                  </IconButton>
                  <span className="num w-[64px] text-center text-[13px]">
                    {n} {n === 1 ? "chair" : "chairs"}
                  </span>
                  <IconButton label={`Another chair for ${p.name}`} onClick={() => setChairCount(p, n + 1)} disabled={n >= 3} className="border border-line-strong disabled:opacity-40">
                    <Plus className="size-3.5" />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12.5px] text-slate-ink">
          {providers.length} providers, {chairs.length} chairs. In production these come from the practice software.
        </p>
      </div>
    </div>
  );
}

export function SaveNote() {
  return <p className="text-[12.5px] text-slate-ink">Changes save as you go.</p>;
}

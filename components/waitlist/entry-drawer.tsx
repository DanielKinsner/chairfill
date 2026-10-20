"use client";

import { useState } from "react";
import { Button, Dialog, Field, Segmented, Switch, inputCls } from "@/components/ui";
import { normalizePhone } from "@/lib/csv";
import { demoNow, useDemo } from "@/lib/store";
import { ptParts } from "@/lib/time";
import type { Insurance, TimeWindow, Urgency, WaitlistEntry, Weekday } from "@/lib/types";

const DAYS: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
];
const TIMES: { id: TimeWindow; label: string }[] = [
  { id: "morning", label: "Mornings" },
  { id: "midday", label: "Midday" },
  { id: "afternoon", label: "Afternoons" },
  { id: "any", label: "Any time" },
];

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-8 rounded-[6px] border px-3 text-[13px] font-medium transition-colors ${on ? "border-teal-ink bg-teal-soft text-teal-deep" : "border-line-strong bg-white text-slate-ink hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export function EntryDrawer({ entry, onClose }: { entry: WaitlistEntry | null; onClose: () => void }) {
  const allTypes = useDemo((s) => s.practice.appointmentTypes);
  const types = allTypes.filter((t) => t.waitlist);
  const providers = useDemo((s) => s.providers);
  const add = useDemo((s) => s.addWaitlist);
  const update = useDemo((s) => s.updateWaitlist);
  const remove = useDemo((s) => s.removeWaitlist);

  const [f, setF] = useState(() => ({
    firstName: entry?.firstName ?? "",
    lastName: entry?.lastName ?? "",
    phone: entry?.phone ?? "",
    procedureId: entry?.procedureId ?? "cleaning",
    urgency: (entry?.urgency ?? "routine") as Urgency,
    preferredDays: entry?.preferredDays ?? ([] as Weekday[]),
    windows: entry?.windows ?? (["any"] as TimeWindow[]),
    providerPref: entry?.providerPref ?? "",
    insurance: entry?.insurance ?? ({ status: "verified", carrier: "" } as Insurance),
    notes: entry?.notes ?? "",
    smsOk: entry?.smsOk ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.firstName.trim()) e.firstName = "Add a first name.";
    if (!f.lastName.trim()) e.lastName = "Add a last name.";
    const phone = normalizePhone(f.phone);
    if (!phone) e.phone = "Use a 10-digit mobile number, like (805) 555-0123.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      phone: phone!,
      procedureId: f.procedureId,
      urgency: f.urgency,
      preferredDays: f.preferredDays,
      windows: f.windows.length ? f.windows : (["any"] as TimeWindow[]),
      providerPref: f.providerPref || undefined,
      insurance: f.insurance,
      notes: f.notes.trim() || undefined,
      smsOk: f.smsOk,
    };
    if (entry) update(entry.id, data);
    else add({ ...data, addedOn: ptParts(demoNow()).date });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={entry ? `${entry.firstName} ${entry.lastName}` : "Add to the waitlist"} side>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="wf-first" error={errors.firstName}>
              <input id="wf-first" className={inputCls} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} aria-invalid={!!errors.firstName} autoComplete="off" />
            </Field>
            <Field label="Last name" htmlFor="wf-last" error={errors.lastName}>
              <input id="wf-last" className={inputCls} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} aria-invalid={!!errors.lastName} autoComplete="off" />
            </Field>
          </div>
          <Field label="Mobile number" htmlFor="wf-phone" error={errors.phone} hint="Offers go here by text.">
            <input id="wf-phone" inputMode="tel" className={`${inputCls} num`} value={f.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => set("phone", normalizePhone(f.phone) ?? f.phone)} aria-invalid={!!errors.phone} placeholder="(805) 555-0123" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-card bg-surface px-3 py-2.5">
            <label htmlFor="wf-sms" className="text-[13px]">
              <span className="font-medium text-ink">OK to text</span>
              <span className="block text-[12px] text-slate-ink">Turn off for landlines or anyone who asked us not to.</span>
            </label>
            <Switch id="wf-sms" label="OK to text" checked={f.smsOk} onChange={(v) => set("smsOk", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Waiting for" htmlFor="wf-visit">
              <select id="wf-visit" className={inputCls} value={f.procedureId} onChange={(e) => set("procedureId", e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider" htmlFor="wf-provider">
              <select id="wf-provider" className={inputCls} value={f.providerPref} onChange={(e) => set("providerPref", e.target.value)}>
                <option value="">No preference</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    Only {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">How soon</legend>
            <Segmented
              label="How soon"
              value={f.urgency}
              onChange={(v) => set("urgency", v)}
              options={[
                { value: "urgent", label: "Urgent", hint: "In pain or something broke" },
                { value: "soon", label: "Soon" },
                { value: "routine", label: "Routine" },
              ]}
            />
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">Days that work</legend>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Toggle
                  key={d.id}
                  on={f.preferredDays.includes(d.id)}
                  onClick={() => set("preferredDays", f.preferredDays.includes(d.id) ? f.preferredDays.filter((x) => x !== d.id) : [...f.preferredDays, d.id])}
                >
                  {d.label}
                </Toggle>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-slate-ink">{f.preferredDays.length === 0 ? "None picked means any day." : ""}</p>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">Times that work</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <Toggle
                  key={t.id}
                  on={f.windows.includes(t.id)}
                  onClick={() =>
                    set(
                      "windows",
                      t.id === "any" ? ["any"] : f.windows.includes(t.id) ? f.windows.filter((x) => x !== t.id) : [...f.windows.filter((x) => x !== "any"), t.id],
                    )
                  }
                >
                  {t.label}
                </Toggle>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Insurance" htmlFor="wf-ins">
              <select
                id="wf-ins"
                className={inputCls}
                value={f.insurance.status}
                onChange={(e) => set("insurance", { ...f.insurance, status: e.target.value as Insurance["status"] })}
              >
                <option value="verified">Verified</option>
                <option value="check">Needs a check</option>
                <option value="expired">Expired</option>
                <option value="self-pay">Self-pay</option>
              </select>
            </Field>
            <Field label="Carrier" htmlFor="wf-carrier">
              <input id="wf-carrier" className={inputCls} value={f.insurance.carrier ?? ""} onChange={(e) => set("insurance", { ...f.insurance, carrier: e.target.value })} disabled={f.insurance.status === "self-pay"} />
            </Field>
          </div>
          <Field label="Notes for the desk" htmlFor="wf-notes">
            <textarea id="wf-notes" rows={3} className={`${inputCls} h-auto py-2`} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Free after 1:30. Prefers Marisol." />
          </Field>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          {entry ? (
            confirmRemove ? (
              <Button
                variant="danger"
                onClick={() => {
                  remove(entry.id);
                  onClose();
                }}
              >
                Yes, take them off
              </Button>
            ) : (
              <Button variant="quiet" onClick={() => setConfirmRemove(true)}>
                Take off the list
              </Button>
            )
          ) : null}
          <Button className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {entry ? "Save changes" : "Add to waitlist"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

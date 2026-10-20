"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, MessageSquare, RefreshCw, UserRound } from "lucide-react";
import { Button, Chip, Dialog, Segmented, SimTag, Skeleton } from "@/components/ui";
import { ExplainerVideo } from "@/components/explainer";
import { useMounted } from "@/lib/hooks";
import { useDemo } from "@/lib/store";
import { PracticeEditor, QuietHoursEditor, RulesEditor, StrategyEditor, TemplatesEditor, TypesEditor } from "./editors";

const SECTIONS = [
  { id: "rules", title: "Who gets texted first" },
  { id: "strategy", title: "How offers go out" },
  { id: "templates", title: "Text messages" },
  { id: "quiet", title: "Quiet hours" },
  { id: "types", title: "Visits and values" },
  { id: "practice", title: "Practice and providers" },
  { id: "integrations", title: "Connections" },
  { id: "team", title: "Team and sign-in" },
  { id: "demo", title: "Demo" },
];

export function SettingsView() {
  const mounted = useMounted();
  if (!mounted)
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-6" aria-busy="true">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  return <SettingsInner />;
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-[72px] border-b border-line py-8 last:border-b-0">
      <h2 id={`${id}-h`} className="text-[17px] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      {intro ? <p className="mt-1 max-w-[68ch] text-[13.5px] text-slate-ink">{intro}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingsInner() {
  const settings = useDemo((s) => s.settings);
  const update = useDemo((s) => s.updateSettings);
  const reset = useDemo((s) => s.reset);
  const practice = useDemo((s) => s.practice);
  const [confirmReset, setConfirmReset] = useState(false);

  // Sections render after hydration, so the browser's own jump-to-#anchor misses. Do it here.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 lg:px-6">
      <nav aria-label="Settings sections" className="sticky top-[52px] hidden h-[calc(100dvh-52px)] w-52 shrink-0 overflow-y-auto py-8 lg:block">
        <h1 className="mb-3 text-[20px] font-semibold tracking-[-0.01em]">Settings</h1>
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-[6px] px-2.5 py-1.5 text-[13.5px] text-slate-ink hover:bg-surface hover:text-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 px-2.5 text-[12px] text-slate-ink">Changes save as you go.</p>
      </nav>

      <div className="min-w-0 flex-1 pb-16">
        <h1 className="pt-6 text-[20px] font-semibold lg:hidden">Settings</h1>
        <Section
          id="rules"
          title="Who gets texted first"
          intro="When a chair opens, ChairFill ranks everyone who could take it. These rules decide the order. The fill screen shows each patient's reasons next to their name."
        >
          <RulesEditor />
        </Section>
        <Section id="strategy" title="How offers go out" intro="Pick what you'd do if you had time to work the phones yourself.">
          <StrategyEditor />
        </Section>
        <Section
          id="templates"
          title="Text messages"
          intro={
            <>
              Write these the way your front desk talks. Merge fields like <span className="num">{"{first_name}"}</span> fill in for each patient.
            </>
          }
        >
          <TemplatesEditor />
        </Section>
        <Section id="quiet" title="Quiet hours" intro="Nobody wants a dentist's text at 10 at night.">
          <QuietHoursEditor />
        </Section>
        <Section id="types" title="Visits and values" intro="What a filled slot is worth. Reports multiply these by the chairs ChairFill fills.">
          <TypesEditor />
        </Section>
        <Section id="practice" title="Practice and providers">
          <PracticeEditor />
        </Section>

        <Section id="integrations" title="Connections" intro="Every outside service sits behind an adapter in lib/adapters. In this demo each one is simulated, and nothing leaves the browser.">
          <ul className="grid gap-3 md:grid-cols-2">
            {[
              { icon: MessageSquare, name: "Text messages", vendor: "Twilio", status: "Simulated", body: "Offers, confirmations and replies. Production uses a Twilio Messaging Service with an inbound webhook for YES and NO." },
              { icon: RefreshCw, name: "Practice software", vendor: "Dentrix, Eaglesoft, Open Dental", status: "CSV import", body: "The demo schedule is seeded and the waitlist imports from CSV. Production syncs the schedule and ASAP list both ways." },
              { icon: MapPin, name: "Directions", vendor: "Google Maps", status: "Simulated", body: "The confirmation page shows written directions; the Maps button is simulated." },
              { icon: CalendarDays, name: "Calendar invites", vendor: ".ics file", status: "Working", body: "Patients can add their new appointment to any calendar. The file is built in the browser." },
            ].map((c) => (
              <li key={c.name} className="rounded-card border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-surface text-slate-ink">
                    <c.icon className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{c.name}</p>
                      {c.status === "Working" ? <Chip tone="green">Working</Chip> : c.status === "Simulated" ? <SimTag /> : <Chip tone="outline">{c.status}</Chip>}
                    </div>
                    <p className="text-[12.5px] text-slate-ink">{c.vendor}</p>
                    <p className="mt-1.5 text-[13px] text-ink-2">{c.body}</p>
                    {c.status !== "Working" ? (
                      <Button size="sm" className="mt-3" disabled title="Available when this goes live for the practice">
                        Connect
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="team" title="Team and sign-in" intro="The demo has no login; the Front desk / Patient switch in the header stands in for it. In production, staff sign in and see only their practice.">
          <ul className="overflow-hidden rounded-card border border-line">
            {[
              [practice.frontDesk[0], "Front desk", "Fills slots, manages the waitlist"],
              [practice.frontDesk[1], "Front desk", "Fills slots, manages the waitlist"],
              [practice.officeManager, "Office manager", "Everything above, plus settings, reports and audit logs"],
            ].map(([name, role, can]) => (
              <li key={name} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <UserRound className="size-4 text-slate" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{name}</span>
                  <span className="block text-[12.5px] text-slate-ink">{can}</span>
                </span>
                <Chip tone="outline">{role}</Chip>
              </li>
            ))}
          </ul>
          <Button className="mt-3" disabled title="Available when this goes live for the practice">
            Invite someone
          </Button>
        </Section>

        <Section id="demo" title="Demo" intro="Controls for showing ChairFill to someone.">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3.5">
                <div>
                  <p className="font-medium text-ink">Reply speed</p>
                  <p className="text-[13px] text-slate-ink">How fast simulated patients answer. Long waits, like a 10-minute timer, always fast-forward.</p>
                </div>
                <Segmented
                  label="Reply speed"
                  value={String(settings.demoPace)}
                  onChange={(v) => update({ demoPace: Number(v) })}
                  options={[
                    { value: "1", label: "Real time" },
                    { value: "2", label: "2×" },
                    { value: "4", label: "4×" },
                  ]}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3.5">
                <div>
                  <p className="font-medium text-ink">Run setup again</p>
                  <p className="text-[13px] text-slate-ink">Walk through the seven setup steps a new practice sees, ending with a test fill.</p>
                </div>
                <Link href="/setup" className="inline-flex h-9 items-center rounded-card border border-line-strong px-3.5 text-[14px] font-medium hover:bg-surface">
                  Open setup
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3.5">
                <div>
                  <p className="font-medium text-ink">Reset demo data</p>
                  <p className="text-[13px] text-slate-ink">Back to Tuesday, 9:41 AM, with six open chairs and 40 people waiting.</p>
                </div>
                <Button variant="danger" onClick={() => setConfirmReset(true)}>
                  Reset demo data
                </Button>
              </div>
            </div>
            <ExplainerVideo />
          </div>
        </Section>
      </div>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the demo?" className="max-w-[420px]">
        <div className="space-y-4 px-5 py-4">
          <p className="text-ink-2">Fills, waitlist edits, templates and settings go back to how they started. Nothing outside this browser is affected.</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmReset(false)}>Keep my changes</Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                window.location.assign("/schedule");
              }}
            >
              Reset demo data
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

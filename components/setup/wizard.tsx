"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Bolt, Wordmark } from "@/components/brand";
import { Button, SimTag, Skeleton } from "@/components/ui";
import { ExplainerVideo } from "@/components/explainer";
import { PhoneThread } from "@/components/fill/phone";
import { FillTimeline } from "@/components/fill/timeline";
import { PracticeEditor, QuietHoursEditor, StrategyEditor, TemplatesEditor, TypesEditor } from "@/components/settings/editors";
import { ImportDialog } from "@/components/waitlist/import-dialog";
import { useMounted } from "@/lib/hooks";
import { advance, createRun, nextEventT } from "@/lib/sms-sim";
import { useDemo } from "@/lib/store";
import { durationWords, stamp } from "@/lib/time";
import type { FillRun, SimScript } from "@/lib/types";

const STEPS = [
  { title: "Practice and providers", short: "Practice", intro: "Who works here and how many chairs each person runs. In production this comes from your practice software." },
  { title: "Visits and what they're worth", short: "Visits", intro: "How long each visit takes and what a filled slot is worth, so reports can speak in dollars." },
  { title: "Bring in your waitlist", short: "Waitlist", intro: "Everyone who's asked to come in sooner. Import a CSV from your practice software, or add people by hand later." },
  { title: "How offers go out", short: "Offers", intro: "When a chair opens, should ChairFill text a few people at once, or one at a time?" },
  { title: "Your text messages", short: "Messages", intro: "The three texts patients get. Write them the way your front desk talks." },
  { title: "Quiet hours", short: "Quiet hours", intro: "When ChairFill should hold texts until morning." },
  { title: "Test it", short: "Test fill", intro: "Run a pretend fill on a sample slot. It texts three test phones, not patients, and doesn't touch the real schedule." },
];

export function SetupWizard() {
  const mounted = useMounted();
  const [step, setStep] = useState(0);
  const router = useRouter();
  const completeSetup = useDemo((s) => s.completeSetup);
  const practiceName = useDemo((s) => s.practice.name);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => {
    completeSetup();
    router.push("/schedule");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-3 px-4 lg:px-6">
          <Link href="/schedule" aria-label="ChairFill, back to the schedule">
            <Wordmark />
          </Link>
          <span className="hidden text-[13px] text-slate-ink sm:inline">Setting up {mounted ? practiceName : "your practice"}</span>
          <Link href="/schedule" className="ml-auto text-[13px] font-medium text-slate-ink hover:text-ink">
            Exit setup
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-6 lg:px-6 lg:py-10">
        {/* Steps: open ones are dashed, finished ones fill in teal, same as a chair on the schedule */}
        <nav aria-label="Setup steps" className="hidden w-56 shrink-0 md:block">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={current ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-card px-2 py-2 text-left text-[13.5px] ${current ? "bg-surface font-semibold text-ink" : "text-slate-ink hover:text-ink"}`}
                  >
                    <span
                      className={`num flex size-6 shrink-0 items-center justify-center rounded-[6px] text-[12px] ${
                        done ? "bg-teal text-white" : current ? "border-[1.5px] border-ink text-ink" : "open-outline text-slate-ink"
                      }`}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    {s.short}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main id="main" className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-slate-ink">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 ref={heading} tabIndex={-1} className="mt-1 text-[24px] font-semibold tracking-[-0.015em] outline-none">
            {STEPS[step].title}
          </h1>
          <p className="mt-1 max-w-[64ch] text-[14px] text-ink-2">{STEPS[step].intro}</p>

          <div className="mt-6">
            {!mounted ? (
              <Skeleton className="h-64 w-full" />
            ) : step === 0 ? (
              <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
                <PracticeEditor />
                <aside>
                  <p className="mb-2 text-[13px] font-semibold text-ink">New here? Here&apos;s the whole idea in 25 seconds.</p>
                  <ExplainerVideo />
                </aside>
              </div>
            ) : step === 1 ? (
              <TypesEditor />
            ) : step === 2 ? (
              <WaitlistStep />
            ) : step === 3 ? (
              <StrategyEditor />
            ) : step === 4 ? (
              <TemplatesEditor only={["offer", "confirm", "taken"]} />
            ) : step === 5 ? (
              <QuietHoursEditor />
            ) : (
              <TestFill onFinish={finish} />
            )}
          </div>

          {step < STEPS.length - 1 ? (
            <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
              {step > 0 ? <Button onClick={back}>Back</Button> : null}
              <p className="text-[12.5px] text-slate-ink">Changes save as you go.</p>
              <Button variant="primary" className="ml-auto" onClick={next} data-testid="wizard-next">
                {step === STEPS.length - 2 ? "Save and run a test" : "Save and continue"}
              </Button>
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
              <Button onClick={back}>Back</Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WaitlistStep() {
  const waitlist = useDemo((s) => s.waitlist);
  const allTypes = useDemo((s) => s.practice.appointmentTypes);
  const types = allTypes.filter((t) => t.waitlist);
  const [importing, setImporting] = useState(false);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="rounded-card border border-line p-5">
        <p className="text-[15px] font-semibold">
          <span className="num">{waitlist.length}</span> {waitlist.length === 1 ? "person is" : "people are"} on the waitlist
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[13.5px] sm:grid-cols-2">
          {types.map((t) => (
            <li key={t.id} className="flex justify-between border-b border-dashed border-line py-1">
              <span className="text-ink-2">{t.name}</span>
              <span className="num text-ink">{waitlist.filter((w) => w.procedureId === t.id).length}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setImporting(true)}>
            <Upload className="size-4" /> Import a CSV
          </Button>
          <Link href="/samples/waitlist-sample.csv" download className="inline-flex h-9 items-center rounded-card px-3 text-[14px] font-medium text-teal-ink hover:bg-teal-wash">
            Download the sample file
          </Link>
        </div>
      </div>
      <div className="open-outline rounded-card p-4 text-[13px] text-ink-2">
        <p className="font-semibold text-ink">What ChairFill needs for each person</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>A mobile number it can text</li>
          <li>The visit they&apos;re waiting for</li>
          <li>How urgent it is</li>
          <li>Days and times that work, if they told you</li>
        </ul>
        <p className="mt-2 text-slate-ink">Insurance and notes are optional. Rows with problems are flagged, not silently dropped.</p>
      </div>
      {importing ? <ImportDialog onClose={() => setImporting(false)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------- the test fill (sandboxed: lives in this component only)

const TEST_SCRIPT: SimScript = {
  default: { reply: "none", afterSec: 0 },
  patients: {
    "t-tasha": { reply: "yes", afterSec: 9, text: "YES (test)" },
    "t-denise": { reply: "no", afterSec: 5, text: "no, just testing" },
  },
};

function TestFill({ onFinish }: { onFinish: () => void }) {
  const templates = useDemo((s) => s.templates);
  const practice = useDemo((s) => s.practice);
  const settings = useDemo((s) => s.settings);
  const [run, setRun] = useState<FillRun | null>(null);
  const [simT, setSimT] = useState(0);
  const anchor = useRef<{ real: number; sim: number }>({ real: 0, sim: 0 });

  const start = () => {
    const r = createRun({
      id: "test-run",
      slotId: "test-slot",
      startedAt: "2026-10-20T09:45:00-07:00",
      candidates: [
        { key: "t-kim", name: `${practice.frontDesk[0]} (test phone)`, firstName: practice.frontDesk[0].split(" ")[0], phone: "(805) 555-0190", kind: "waitlist" },
        { key: "t-tasha", name: `${practice.frontDesk[1]} (test phone)`, firstName: practice.frontDesk[1].split(" ")[0], phone: "(805) 555-0191", kind: "waitlist" },
        { key: "t-denise", name: `${practice.officeManager} (test phone)`, firstName: practice.officeManager.split(" ")[0], phone: "(805) 555-0192", kind: "waitlist" },
      ],
      settings: { strategy: "batch", batchSize: 3, offerWindowMin: settings.offerWindowMin },
      templates,
      slotLabel: { day: "Fri, Oct 30", time: "12:00 PM", procedure: "cleaning", provider: "Marisol" },
      practiceName: practice.name,
      linkBase: `${window.location.host}/o/`,
      value: 180,
      codeFor: () => "TEST",
    });
    anchor.current = { real: performance.now(), sim: 0 };
    setSimT(0);
    setRun(r);
  };

  useEffect(() => {
    if (!run || nextEventT(run) === undefined) return;
    const id = setInterval(() => {
      const t = anchor.current.sim + (performance.now() - anchor.current.real) * 2;
      setSimT(t);
      const n = nextEventT(run);
      if (n !== undefined && t >= n) {
        const { run: nextRun } = advance(run, t, TEST_SCRIPT);
        anchor.current = { real: performance.now(), sim: nextRun.simT };
        setRun(nextRun);
      }
    }, 50);
    return () => clearInterval(id);
  }, [run]);

  const done = run?.timeline.some((e) => e.kind === "booked");

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-4 rounded-card px-4 py-3 transition-colors duration-500 ${done ? "animate-fill-pulse bg-teal text-white" : run ? "open-outline-amber" : "open-outline"}`} data-testid="test-slot">
        <div>
          <p className="num font-semibold">Fri, Oct 30, 12:00 PM</p>
          <p className={`text-[13px] ${done ? "text-white/85" : "text-slate-ink"}`}>Sample slot: cleaning with Marisol. Not on the real schedule.</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {run ? (
            <span className="num text-[20px]">{stamp(run.status === "filled" ? (run.filledAtT ?? simT) : simT)}</span>
          ) : (
            <Button variant="primary" size="lg" onClick={start} data-testid="start-test-fill">
              Run the test fill
            </Button>
          )}
        </div>
      </div>

      {run ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_270px]">
          <div className="grid min-h-[300px] gap-3 sm:grid-cols-3">
            {run.offers.map((o) => (
              <PhoneThread key={o.key} offer={o} simT={simT} windowSec={run.offerWindowSec} showWindow={run.status === "running"} isWinner={run.winner === o.key} practiceName={practice.name} />
            ))}
          </div>
          <div className="rounded-card border border-line p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Timeline</p>
              <SimTag />
            </div>
            <FillTimeline run={run} />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-slate-ink">
          Three test phones get your offer text. One says no, one doesn&apos;t answer, one says yes. You&apos;ll see each text exactly as you wrote it.
        </p>
      )}

      {done ? (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-card border border-teal/50 bg-teal-soft px-5 py-4" data-testid="test-done">
          <span className="flex size-9 items-center justify-center rounded-card bg-teal text-white">
            <Bolt className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-teal-deep">It works. The test slot filled in {durationWords(run!.filledAtT ?? 0)}.</p>
            <p className="text-[13px] text-ink-2">ChairFill is set up. Next real cancellation, it&apos;s one click.</p>
          </div>
          <Button variant="primary" size="lg" onClick={onFinish} data-testid="finish-setup">
            Go to the schedule
          </Button>
        </div>
      ) : null}
    </div>
  );
}

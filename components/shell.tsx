"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CircleHelp, RotateCcw, X } from "lucide-react";
import { Wordmark } from "./brand";
import { Button, Dialog, IconButton, Segmented } from "./ui";
import { SimDriver } from "./sim-driver";
import { ExplainerVideo } from "./explainer";
import { dismissToast, useDemo, useRuntime } from "@/lib/store";
import { useDemoNow, useMounted } from "@/lib/hooks";
import { fmtDay, fmtTime } from "@/lib/time";
import { Bolt } from "./brand";

const NAV = [
  { href: "/schedule", label: "Schedule" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function DemoClock({ compact = false }: { compact?: boolean }) {
  const now = useDemoNow(1000);
  const mounted = useMounted();
  if (!mounted) return <span className="inline-block h-4 w-28" />;
  return (
    <span className="whitespace-nowrap text-[13px] text-slate-ink" title="Demo clock. Pacific time.">
      {compact ? null : <span className="mr-1.5">{fmtDay(now)}</span>}
      <span className="num text-ink">{fmtTime(now)}</span>
    </span>
  );
}

export function RoleSwitcher({ value }: { value: "desk" | "patient" }) {
  const router = useRouter();
  return (
    <Segmented
      label="Viewing as"
      size="sm"
      value={value}
      onChange={(v) => router.push(v === "desk" ? "/schedule" : "/patient")}
      options={[
        { value: "desk", label: "Front desk", hint: "What Kim and Tasha see at the desk" },
        { value: "patient", label: "Patient", hint: "What a patient sees when they tap the link in the text" },
      ]}
    />
  );
}

function ResetDemo() {
  const [open, setOpen] = useState(false);
  const reset = useDemo((s) => s.reset);
  return (
    <>
      <IconButton label="Reset demo data" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" strokeWidth={1.75} />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} title="Reset the demo?" className="max-w-[420px]">
        <div className="space-y-4 px-5 py-4">
          <p className="text-ink-2">
            This puts the schedule, waitlist, settings and reports back to Tuesday at 9:41 AM, before any of today&apos;s fills. Nothing outside this browser is affected.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Keep my changes</Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                setOpen(false);
                window.location.assign("/schedule");
              }}
            >
              Reset demo data
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function HelpVideo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton label="How ChairFill works (25-second video)" onClick={() => setOpen(true)}>
        <CircleHelp className="size-[18px]" strokeWidth={1.75} />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} title="How ChairFill works" className="max-w-[860px]">
        <div className="p-5">
          <ExplainerVideo autoPlay />
          <p className="mt-3 text-[13px] text-slate-ink">
            25 seconds. A patient cancels, ChairFill texts the waitlist in order, and the first yes gets the chair.
          </p>
        </div>
      </Dialog>
    </>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const waitCount = useDemo((s) => s.waitlist.length);
  const practice = useDemo((s) => s.practice.name);
  const mounted = useMounted();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-[52px] items-center gap-3 px-4 lg:px-5">
        <Link href="/schedule" className="shrink-0 rounded-card" aria-label="ChairFill home">
          <Wordmark />
        </Link>
        <span className="hidden h-5 w-px bg-line md:block" aria-hidden />
        <span className="hidden truncate text-[13px] font-medium text-slate-ink md:block">{mounted ? practice : "Maple Family Dental"}</span>
        <nav aria-label="Main" className="ml-4 hidden items-stretch self-stretch lg:flex">
          {NAV.map((n) => {
            const on = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-3 text-[14px] font-medium transition-colors ${on ? "text-ink" : "text-slate-ink hover:text-ink"}`}
              >
                {n.label}
                {n.href === "/waitlist" && mounted ? <span className="num rounded-[4px] bg-surface px-1 text-[11px] text-slate-ink">{waitCount}</span> : null}
                {on ? <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-teal" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden xl:block">
            <DemoClock />
          </span>
          <span className="hidden sm:inline xl:hidden">
            <DemoClock compact />
          </span>
          <span
            className="hidden items-center gap-1.5 rounded-[6px] border border-dashed border-line-strong px-2 py-0.5 text-[12px] font-medium text-slate-ink md:inline-flex"
            title="Demo mode: texts, practice software sync and maps are simulated. Nothing leaves this browser."
          >
            Demo mode
          </span>
          <RoleSwitcher value="desk" />
          <HelpVideo />
          <ResetDemo />
        </div>
      </div>
      <nav aria-label="Main" className="scroll-thin flex gap-1 overflow-x-auto border-t border-line px-2 lg:hidden">
        {NAV.map((n) => {
          const on = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`relative px-3 py-2.5 text-[14px] font-medium ${on ? "text-ink" : "text-slate-ink"}`}
            >
              {n.label}
              {on ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-teal" /> : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function Toaster() {
  const toasts = useRuntime((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto animate-fade-in rounded-card border bg-white p-3.5 shadow-pop ${t.tone === "filled" ? "border-teal" : t.tone === "warn" ? "border-amber" : "border-line"}`}
        >
          <div className="flex items-start gap-3">
            {t.tone === "filled" ? (
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-teal text-white">
                <Bolt className="size-3.5" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{t.title}</p>
              {t.body ? <p className="mt-0.5 text-[13px] text-slate-ink">{t.body}</p> : null}
              {t.action ? (
                <Link href={t.action.href} onClick={() => dismissToast(t.id)} className="mt-2 inline-block text-[13px] font-semibold text-teal-ink hover:underline">
                  {t.action.label}
                </Link>
              ) : null}
            </div>
            <IconButton label="Dismiss" className="-mr-1 -mt-1 size-7" onClick={() => dismissToast(t.id)}>
              <X className="size-3.5" />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeskShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <a href="#main" className="sr-only z-50 rounded-card bg-white px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <TopBar />
      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>
      <SimDriver />
      <Toaster />
    </div>
  );
}

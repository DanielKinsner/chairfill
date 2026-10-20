import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Not on the schedule" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center px-4">
          <Link href="/schedule" aria-label="ChairFill home">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-16">
        <div className="w-full max-w-[460px]">
          <div className="open-outline flex h-20 items-center justify-between rounded-card px-5">
            <span className="num text-[15px] text-slate-ink">404</span>
            <span className="text-[14px] font-medium text-slate-ink">Nothing booked here</span>
          </div>
          <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.015em]">This page isn&apos;t on the schedule.</h1>
          <p className="mt-2 text-[15px] text-ink-2">The link may be old, or the page moved. Everything the front desk needs starts from the schedule.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/schedule" className="inline-flex h-11 items-center rounded-card bg-teal-ink px-5 text-[15px] font-medium text-white hover:bg-teal-deep">
              Back to the schedule
            </Link>
            <Link href="/waitlist" className="inline-flex h-11 items-center rounded-card border border-line-strong bg-white px-5 text-[15px] font-medium hover:bg-surface">
              Open the waitlist
            </Link>
          </div>
          <p className="mt-8 text-[13px] text-slate-ink">
            Got here from a text about an opening? Call Maple Family Dental at <span className="num text-ink">(805) 555-0100</span> and we&apos;ll sort it out.
          </p>
        </div>
      </main>
    </div>
  );
}

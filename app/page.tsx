import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bolt, Wordmark } from "@/components/brand";

// The front door. One sentence, the fill playing on a loop, one button.
export default function Home() {
  return (
    <main className="stagelight relative flex min-h-dvh flex-col bg-stage text-ink">
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <Wordmark />
        <Link
          href="/schedule"
          className="hidden h-9 items-center gap-2 rounded-card border border-line-strong px-3.5 text-[13.5px] font-medium text-ink transition-colors hover:border-teal hover:text-teal-deep sm:inline-flex"
        >
          Open the demo <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-5 pb-16 pt-10 text-center md:pt-16">
        <p className="animate-rise flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-teal-deep">
          <Bolt className="size-3" /> For dental and medical front desks
        </p>
        <h1 className="display mt-5 max-w-[14ch] text-[56px] leading-[1.02] text-ink animate-rise [animation-delay:80ms] sm:text-[80px] md:text-[104px]">
          An empty chair fills itself.
        </h1>
        <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-ink-2 animate-rise [animation-delay:160ms] md:text-[18px]">
          A patient cancels. ChairFill texts the waitlist in the right order, the first yes gets the chair, everyone else hears it&apos;s taken, and the schedule writes itself. Nobody at the desk picks up a phone.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-rise [animation-delay:240ms]">
          <Link
            href="/schedule?fill=first"
            className="inline-flex h-12 items-center gap-2 rounded-card bg-teal px-6 text-[15px] font-semibold text-stage shadow-[0_0_40px_rgb(25_211_197/0.35)] transition-transform hover:-translate-y-px"
          >
            Watch a chair fill <ArrowRight className="size-4" />
          </Link>
          <Link href="/schedule" className="inline-flex h-12 items-center rounded-card border border-line-strong px-5 text-[15px] font-medium text-ink transition-colors hover:border-teal hover:text-teal-deep">
            Open the schedule
          </Link>
        </div>

        <figure className="mt-14 w-full max-w-[960px] animate-rise [animation-delay:320ms]">
          <div className="winner-glow overflow-hidden rounded-[14px] border border-line-strong bg-white">
            <video className="block aspect-video w-full" src="/explainer.mp4" poster="/explainer-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-describedby="loop-desc" />
          </div>
          <figcaption id="loop-desc" className="mt-3 text-[12.5px] text-slate-ink">
            Twenty-five seconds: a cancellation, three texts, one yes, a filled chair. Everything in the demo runs in your browser and nothing is really sent.
          </figcaption>
        </figure>

        <dl className="mt-14 grid w-full max-w-[880px] grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          {[
            ["20 sec", "from cancellation to a confirmed chair, in the demo"],
            ["0 calls", "the front desk makes to fill it"],
            ["$3,920", "recovered this month at Maple Family Dental"],
          ].map(([n, l]) => (
            <div key={n} className="bg-white px-5 py-5 text-left">
              <dt className="num text-[30px] font-medium leading-none text-teal-deep">{n}</dt>
              <dd className="mt-2 text-[13px] text-slate-ink">{l}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-[12.5px] text-slate-ink md:px-8">
        <span>A demo build with seeded data. Maple Family Dental is fictional.</span>
        <span className="num">chairfill-app.vercel.app</span>
      </footer>
    </main>
  );
}

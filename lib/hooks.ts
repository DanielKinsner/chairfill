"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { demoNow, useRuntime } from "./store";
import type { FillRun } from "./types";

const noop = () => () => {};
/** False during SSR and the first client render, so localStorage-backed UI never mismatches. */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** The demo clock, re-rendering every `everyMs`. */
export function useDemoNow(everyMs = 1000) {
  const [now, setNow] = useState(() => demoNow());
  const anchor = useRuntime((s) => s.anchorDemo);
  useEffect(() => {
    setNow(demoNow());
    const id = setInterval(() => setNow(demoNow()), everyMs);
    return () => clearInterval(id);
  }, [everyMs, anchor]);
  return now;
}

/** Live sim time for a run (smooth while it's playing, frozen once it's done). */
export function useSimT(run: FillRun | undefined) {
  const live = useRuntime((s) => (run ? s.sim[run.id] : undefined));
  return { t: live?.t ?? run?.simT ?? 0, ff: live?.ff ?? false };
}

export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

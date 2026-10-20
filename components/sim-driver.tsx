"use client";

// Plays fill runs in real time. Sim events are scheduled in "sim seconds";
// this loop turns them into on-screen time at the demo pace, and fast-forwards
// long quiet stretches (a 10-minute offer window) so a demo never stalls.
//
// Only one tab drives the simulation (Web Locks), so a patient page open in a
// second tab doesn't double-play events. Other tabs follow along through
// localStorage.

import { useEffect } from "react";
import { advance, FF_REAL_MS, FF_THRESHOLD_MS, nextEventT } from "@/lib/sms-sim";
import { drainInbox, useDemo, useRuntime } from "@/lib/store";
import { SIM_SCRIPT } from "@/lib/seed";

interface Playback {
  simAnchor: number;
  realAnchor: number;
  ff?: { from: number; to: number; realStart: number };
}

export function SimDriver() {
  useEffect(() => {
    let stopped = false;
    let releaseLock: (() => void) | undefined;
    const playback = new Map<string, Playback>();

    const becomeLeader = (leader: boolean) => useRuntime.setState({ isLeader: leader });

    // Leader election. Browsers without Web Locks just drive.
    if (typeof navigator !== "undefined" && "locks" in navigator) {
      becomeLeader(false);
      navigator.locks
        .request("chairfill-sim", () => {
          if (stopped) return;
          becomeLeader(true);
          return new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
        })
        .catch(() => becomeLeader(true));
    } else becomeLeader(true);

    // Followers pick up the leader's writes.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chairfill-demo" && !useRuntime.getState().isLeader) void useDemo.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);

    let lastInbox = 0;
    const tick = () => {
      if (stopped || !useRuntime.getState().isLeader) return;
      const now = performance.now();
      const state = useDemo.getState();

      if (now - lastInbox > 250) {
        lastInbox = now;
        for (const r of drainInbox()) {
          const run = useDemo.getState().runs.find((x) => x.id === r.runId);
          if (!run) continue;
          const t = useRuntime.getState().sim[run.id]?.t ?? run.simT;
          useDemo.getState().replyToRun(run.id, r.key, r.reply, Math.ceil(t));
          playback.delete(run.id);
        }
      }

      const pace = state.settings.demoPace;
      const live: Record<string, { t: number; ff: boolean }> = {};
      for (const run of useDemo.getState().runs) {
        const nextT = nextEventT(run);
        if (nextT === undefined) {
          playback.delete(run.id);
          continue;
        }
        let pb = playback.get(run.id);
        if (!pb) {
          pb = { simAnchor: run.simT, realAnchor: now };
          playback.set(run.id, pb);
        }
        let simNow: number;
        if (pb.ff) {
          const p = Math.min(1, (now - pb.ff.realStart) / FF_REAL_MS);
          const eased = 1 - Math.pow(1 - p, 3);
          simNow = pb.ff.from + (pb.ff.to - pb.ff.from) * eased;
        } else {
          simNow = pb.simAnchor + (now - pb.realAnchor) * pace;
          if (nextT - simNow > FF_THRESHOLD_MS) {
            pb.ff = { from: simNow, to: nextT, realStart: now };
          }
        }
        live[run.id] = { t: simNow, ff: !!pb.ff };
        if (simNow >= nextT) {
          const { run: next, effects } = advance(run, simNow, SIM_SCRIPT);
          useDemo.getState().commitRun(next, effects);
          pb.simAnchor = next.simT;
          pb.realAnchor = now;
          pb.ff = undefined;
        }
      }
      const prev = useRuntime.getState().sim;
      if (Object.keys(live).length || Object.keys(prev).length) useRuntime.setState({ sim: live });
    };

    const id = window.setInterval(tick, 50);
    return () => {
      stopped = true;
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
      releaseLock?.();
    };
  }, []);
  return null;
}

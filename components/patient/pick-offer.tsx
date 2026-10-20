"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui";
import { offerCode } from "@/lib/offer-code";
import { useDemo } from "@/lib/store";

/** The Patient role opens the most interesting offer: one that's out right now, else the latest winner, else Rosa's. */
export function PickOffer() {
  const router = useRouter();
  useEffect(() => {
    const s = useDemo.getState();
    const runs = [...s.runs].reverse();
    const active = runs.flatMap((r) => r.offers).find((o) => ["sent", "delivered", "read", "typing"].includes(o.status));
    const winner = runs.map((r) => r.offers.find((o) => o.key === r.winner)).find(Boolean);
    let code = active?.code ?? winner?.code;
    if (!code) {
      const firstOpen = s.appointments.find((a) => a.id === "a-c1" && a.status === "cancelled") ?? s.appointments.find((a) => a.status === "cancelled" && a.start > "2026-10-20T10");
      const top = firstOpen ? s.rank(firstOpen.id)?.ranked[1] ?? s.rank(firstOpen.id)?.ranked[0] : undefined;
      if (firstOpen && top) code = offerCode(firstOpen.id, top.key);
    }
    router.replace(code ? `/o/${code}` : "/o/NONE");
  }, [router]);
  return (
    <div className="flex min-h-dvh items-start justify-center bg-surface px-4 py-16" aria-busy="true" aria-label="Opening the patient view">
      <div className="w-full max-w-[440px] rounded-[12px] border border-line bg-white p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-6 w-64" />
        <Skeleton className="mt-5 h-40 w-full" />
        <Skeleton className="mt-5 h-16 w-full" />
      </div>
    </div>
  );
}

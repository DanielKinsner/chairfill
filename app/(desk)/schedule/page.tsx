import type { Metadata } from "next";
import { Suspense } from "react";
import { ScheduleSkeleton, ScheduleView } from "@/components/schedule/schedule-view";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleView />
    </Suspense>
  );
}

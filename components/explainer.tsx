"use client";

import { useId, useState } from "react";

/** The 25-second Remotion explainer (source in /video), shown wherever a new person might wonder what this is. */
export function ExplainerVideo({ autoPlay = false, className = "" }: { autoPlay?: boolean; className?: string }) {
  const id = useId();
  const [failed, setFailed] = useState(false);
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {failed ? (
          <div className="flex aspect-video items-center justify-center p-6 text-center text-slate-ink">
            The explainer video didn&apos;t load. In short: a patient cancels, ChairFill texts the waitlist in order, and the first yes gets the chair.
          </div>
        ) : (
          <video
            className="block aspect-video w-full"
            src="/explainer.mp4"
            poster="/explainer-poster.jpg"
            controls
            playsInline
            autoPlay={autoPlay}
            preload="metadata"
            aria-describedby={id}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption id={id} className="sr-only">
        A schedule slot is cancelled and turns into a dashed outline. ChairFill texts three patients at once. Rosa replies yes, the slot turns teal, and
        the other two are told it&apos;s taken. The report shows 14 chairs filled this month and $3,920 recovered. An empty chair fills itself.
      </figcaption>
    </figure>
  );
}

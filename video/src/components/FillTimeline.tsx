import React from "react";
import { interpolate } from "remotion";
import { colors, fonts, clamp, RADIUS } from "../theme";
import { PANEL } from "../layout";
import { T } from "../timing";
import { fadeIn, fadeOut, rise } from "../anim";
import { StatusChip } from "./Chip";

type Step = {
  at: number;
  until?: number;
  time: string;
  label: string;
  detail: string;
  dot: string;
  labelColor?: string;
};

const ROW_H = 70;
const TIME_W = 58;
const RAIL_W = 30;
const DOT = 12;
const DOT_Y = 13; // centers the dot on the label line

/** The vertical fill timeline: steps reveal one by one with 300 ms fades. */
export const FillTimeline: React.FC<{ frame: number }> = ({ frame }) => {
  // While we wait for a reply, the elapsed clock keeps ticking from 0:09 to 0:21.
  const elapsed = Math.floor(interpolate(frame, [T.waiting, T.confirmed], [9, 21], clamp));
  const waitingDots = ".".repeat(1 + (Math.floor(frame / 10) % 3));

  const steps: Step[] = [
    {
      at: T.offerSent,
      time: "0:00",
      label: "Offer sent ×3",
      detail: "Gail, Rosa, Kevin, in waitlist order",
      dot: colors.amber,
    },
    { at: T.delivered, time: "0:02", label: "Delivered", detail: "3 of 3 phones", dot: colors.slate },
    { at: T.read, time: "0:09", label: "Read", detail: "Gail and Rosa", dot: colors.slate },
    {
      at: T.confirmed,
      time: "0:21",
      label: "Confirmed",
      detail: "Rosa replied YES",
      dot: colors.green,
      labelColor: colors.greenText,
    },
    {
      at: T.scheduleUpdated,
      time: "0:21",
      label: "Schedule updated",
      detail: "Rosa Delgado · Chair 5",
      dot: colors.teal,
    },
    {
      at: T.othersTold,
      time: "0:22",
      label: "Others told it's taken",
      detail: "Gail and Kevin stay on the list",
      dot: colors.slate,
    },
  ];
  const pending: Step = {
    at: T.waiting,
    until: T.confirmed - 4,
    time: `0:${String(elapsed).padStart(2, "0")}`,
    label: `Waiting for a reply${waitingDots}`,
    detail: "First YES gets the chair",
    dot: colors.white,
  };

  const panelIn = fadeIn(frame, T.panelIn, 12);

  // Slot 3 holds "waiting" first, then "Confirmed" takes its place.
  const rows: { step: Step; index: number }[] = [
    ...steps.slice(0, 3).map((step, index) => ({ step, index })),
    { step: pending, index: 3 },
    ...steps.slice(3).map((step, i) => ({ step, index: i + 3 })),
  ];

  // Rail segment i connects dot i-1 to dot i; it draws in as row i appears.
  const segmentStart = (i: number) => (i === 3 ? T.waiting : steps[i]?.at ?? 9999);

  return (
    <div
      style={{
        position: "absolute",
        left: PANEL.x,
        top: PANEL.y + rise(frame, T.panelIn, 14),
        width: PANEL.w,
        height: PANEL.h,
        opacity: panelIn,
        backgroundColor: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: RADIUS,
        padding: 28,
        fontFamily: fonts.sans,
        color: colors.ink,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, whiteSpace: "nowrap" }}>
            Tue <span style={{ fontFamily: fonts.mono, fontWeight: 500 }}>2:00 PM</span> · Cleaning
          </div>
          <div style={{ fontSize: 16, color: colors.slate, marginTop: 6 }}>
            Chair 5 · Marisol Vega, RDH
          </div>
        </div>
        <StatusChip
          frame={frame}
          states={[
            { at: T.panelIn, tone: "slate", label: "Open" },
            { at: T.offerSent, tone: "amber", label: "Offering" },
            { at: T.confirmed, tone: "green", label: "Filled" },
          ]}
        />
      </div>

      <div style={{ height: 1, backgroundColor: colors.border, margin: "22px 0 18px" }} />
      <div style={{ fontSize: 15, fontWeight: 500, color: colors.slate, marginBottom: 18 }}>
        Fill timeline
      </div>

      <div style={{ position: "relative" }}>
        {/* Rail */}
        {[1, 2, 3, 4, 5].map((i) => {
          const grow = fadeIn(frame, segmentStart(i) - 2, 10);
          return (
            <div
              key={`seg${i}`}
              style={{
                position: "absolute",
                left: TIME_W + RAIL_W / 2 - 1,
                top: (i - 1) * ROW_H + DOT_Y + DOT / 2,
                width: 2,
                height: ROW_H * grow,
                backgroundColor: colors.border,
              }}
            />
          );
        })}

        {rows.map(({ step, index }) => {
          const opacity =
            fadeIn(frame, step.at) * (step.until !== undefined ? fadeOut(frame, step.until, 6) : 1);
          if (opacity <= 0) return null;
          const isPending = step === pending;
          return (
            <div
              key={step.label.replace(/\.+$/, "") + index}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: index * ROW_H + rise(frame, step.at, 8),
                height: ROW_H,
                display: "flex",
                opacity,
              }}
            >
              <div
                style={{
                  width: TIME_W,
                  fontFamily: fonts.mono,
                  fontSize: 17,
                  lineHeight: "26px",
                  color: colors.slate,
                }}
              >
                {step.time}
              </div>
              <div style={{ width: RAIL_W, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: RAIL_W / 2 - DOT / 2,
                    top: DOT_Y - DOT / 2 + 1,
                    width: DOT,
                    height: DOT,
                    borderRadius: DOT / 2,
                    backgroundColor: step.dot,
                    border: isPending ? `2px dashed ${colors.dashed}` : "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ paddingLeft: 10 }}>
                <div
                  style={{
                    fontSize: 20,
                    lineHeight: "26px",
                    fontWeight: 600,
                    color: isPending ? colors.slate : step.labelColor ?? colors.ink,
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 16, color: colors.slate, marginTop: 3, whiteSpace: "nowrap" }}>
                  {step.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts, clamp, RADIUS } from "../theme";
import { DAY_COL_W, SCHEDULE } from "../layout";
import { T } from "../timing";
import { fadeIn, fadeOut, rise } from "../anim";
import { CHAIRS, DAYS } from "../data";
import { AppointmentBlock, SlotBlock } from "../components/ScheduleBlocks";

/**
 * 0–3 s: the week schedule; Tue 2:00 PM in Chair 5 cancels and goes dashed.
 * 3 s: Chairs 3 and 4 fold away and the schedule slides up under the wordmark.
 * 11 s: the slot fills (state lives in SlotBlock). Sequence starts at frame 0.
 */
export const ScheduleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = fadeIn(frame, T.scheduleIn, 16);
  const focus = spring({
    frame: frame - T.focus,
    fps,
    config: { damping: 200 },
    durationInFrames: 32,
  });
  const top = interpolate(focus, [0, 1], [SCHEDULE.topA, SCHEDULE.topB]);
  const headingOpacity = fadeIn(frame, 14, 12) * fadeOut(frame, T.focus - 6, 10);
  // While the slot sits empty, the rest of the week steps back a little.
  const dim = interpolate(
    frame,
    [T.cancel + 12, T.cancel + 26, T.focus, T.focus + 16],
    [1, 0.45, 0.45, 1],
    clamp,
  );
  const storyOut = fadeOut(frame, T.storyOut, 14);

  return (
    <AbsoluteFill style={{ opacity: storyOut }}>
      {/* Context line above the schedule, only while it is centered */}
      <div
        style={{
          position: "absolute",
          left: SCHEDULE.x,
          width: SCHEDULE.w,
          top: SCHEDULE.topA - 58 + rise(frame, 14, 10),
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          opacity: headingOpacity,
          fontFamily: fonts.sans,
          fontSize: 24,
        }}
      >
        <div style={{ color: colors.ink, fontWeight: 600 }}>
          Maple Family Dental{" "}
          <span style={{ color: colors.slate, fontWeight: 400 }}>· Week of Oct 19</span>
        </div>
        <div style={{ color: colors.slate }}>
          Tue, Oct 20 ·{" "}
          <span style={{ fontFamily: fonts.mono, color: colors.ink, fontSize: 22 }}>9:41 AM</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: SCHEDULE.x,
          top: top + rise(frame, T.scheduleIn, 16, 16),
          width: SCHEDULE.w,
          opacity: enter,
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: RADIUS,
          overflow: "hidden",
          fontFamily: fonts.sans,
        }}
      >
        {/* Day header */}
        <div style={{ display: "flex", height: SCHEDULE.headerH }}>
          <div
            style={{
              width: SCHEDULE.rowHeaderW,
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              fontSize: 16,
              color: colors.slate,
            }}
          >
            Oct 19–23
          </div>
          {DAYS.map((d) => (
            <div
              key={d.day}
              style={{
                width: DAY_COL_W,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 18px",
                borderLeft: `1px solid ${colors.border}`,
                backgroundColor: d.today ? colors.tealSoft : colors.white,
                color: d.today ? colors.tealText : colors.ink,
              }}
            >
              <span style={{ fontSize: 19, fontWeight: 600 }}>{d.day}</span>
              <span style={{ fontSize: 17, color: d.today ? colors.tealText : colors.slate }}>
                {d.date}
              </span>
              {d.today ? (
                <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 500 }}>Today</span>
              ) : null}
            </div>
          ))}
        </div>

        {CHAIRS.map((row, r) => {
          const folds = r < 2; // Chairs 3 and 4 fold away at 3 s
          const rowEnter = fadeIn(frame, T.scheduleIn + 6 + r * 4, 12);
          const height = folds ? SCHEDULE.rowH * (1 - focus) : SCHEDULE.rowH;
          const rowOpacity = folds ? interpolate(focus, [0, 0.6], [1, 0], clamp) : 1;
          return (
            <div
              key={row.chair}
              style={{
                position: "relative",
                display: "flex",
                height,
                overflow: "hidden",
                opacity: rowEnter,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 1,
                  backgroundColor: colors.border,
                }}
              />
              <div
                style={{
                  width: SCHEDULE.rowHeaderW,
                  flexShrink: 0,
                  padding: "0 22px",
                  paddingTop: 36, // top-aligned so folding rows close like a drawer
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  opacity: (r === 2 ? 1 : dim) * rowOpacity,
                }}
              >
                <div style={{ fontSize: 21, fontWeight: 600, color: colors.ink }}>{row.chair}</div>
                <div style={{ fontSize: 16, color: colors.slate }}>{row.provider}</div>
              </div>
              {row.appointments.map((appt, d) => (
                <div
                  key={d}
                  style={{
                    width: DAY_COL_W,
                    height: SCHEDULE.rowH,
                    flexShrink: 0,
                    padding: SCHEDULE.inset,
                    borderLeft: `1px solid ${colors.border}`,
                    backgroundColor: DAYS[d].today ? "rgba(223,243,243,0.28)" : "transparent",
                  }}
                >
                  {appt ? (
                    <AppointmentBlock appt={appt} opacity={dim * rowOpacity} />
                  ) : (
                    <SlotBlock frame={frame} />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

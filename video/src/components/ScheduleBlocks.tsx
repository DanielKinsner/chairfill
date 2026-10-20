import React from "react";
import { interpolate } from "remotion";
import { colors, fonts, clamp, easeOut, RADIUS } from "../theme";
import { BLOCK_H, BLOCK_W } from "../layout";
import { T } from "../timing";
import { fadeIn } from "../anim";
import { CANCELLED, type Appointment } from "../data";
import { DashedOutline } from "./DashedOutline";
import { Bolt } from "./Bolt";
import { Chip } from "./Chip";

const timeStyle: React.CSSProperties = {
  fontFamily: fonts.mono,
  fontSize: 17,
  fontWeight: 500,
  lineHeight: "22px",
  letterSpacing: "-0.01em",
};

const lineStyle: React.CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 19,
  fontWeight: 500,
  lineHeight: "25px",
  whiteSpace: "nowrap",
};

const blockBox: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: RADIUS,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

/** A regular booked appointment: surface fill, 1px border. */
export const AppointmentBlock: React.FC<{ appt: Appointment; opacity?: number }> = ({
  appt,
  opacity = 1,
}) => (
  <div style={{ position: "relative", width: BLOCK_W, height: BLOCK_H, opacity }}>
    <div
      style={{
        ...blockBox,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ ...timeStyle, color: colors.slate }}>{appt.time}</div>
      <div style={{ ...lineStyle, color: colors.ink }}>
        {appt.name} <span style={{ color: colors.slate, fontWeight: 400 }}>· {appt.procedure}</span>
      </div>
    </div>
  </div>
);

/**
 * Tue 2:00 PM, Chair 5. Four looks over the video:
 * booked (Nora) → cancelled (dashed grey) → offered (amber chip) → filled (solid teal + bolt + one pulse).
 */
export const SlotBlock: React.FC<{ frame: number }> = ({ frame }) => {
  const cancelP = fadeIn(frame, T.cancel, 14);
  const offerP = fadeIn(frame, T.offerSent);
  const fillP = fadeIn(frame, T.fill, 8);

  // One soft pulse when it fills: the block breathes once and a teal ring drifts outward.
  const breathe = interpolate(frame, [T.fill, T.fill + 7, T.fill + 26], [1, 1.035, 1], {
    ...clamp,
    easing: easeOut,
  });
  const ring = interpolate(frame, [T.fill, T.fill + 40], [0, 1], { ...clamp, easing: easeOut });
  const ringVisible = frame >= T.fill;
  const boltP = fadeIn(frame, T.fill + 4, 10);

  return (
    <div style={{ position: "relative", width: BLOCK_W, height: BLOCK_H }}>
      {ringVisible ? (
        <div
          style={{
            position: "absolute",
            inset: -16 * ring,
            borderRadius: RADIUS + 16 * ring,
            border: `2px solid ${colors.teal}`,
            opacity: 0.5 * (1 - ring),
          }}
        />
      ) : null}

      <div style={{ position: "absolute", inset: 0, scale: String(breathe) }}>
        {/* Booked (before the cancellation) */}
        <div
          style={{
            ...blockBox,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            opacity: 1 - cancelP,
          }}
        >
          <div style={{ ...timeStyle, color: colors.slate }}>{CANCELLED.time}</div>
          <div style={{ ...lineStyle, color: colors.ink }}>
            {CANCELLED.name}{" "}
            <span style={{ color: colors.slate, fontWeight: 400 }}>· {CANCELLED.procedure}</span>
          </div>
        </div>

        {/* Open: dashed grey outline */}
        <div
          style={{
            ...blockBox,
            padding: 0,
            backgroundColor: colors.white,
            opacity: cancelP * (1 - fillP),
          }}
        >
          <DashedOutline width={BLOCK_W} height={BLOCK_H} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ ...timeStyle, color: colors.slate }}>{CANCELLED.time}</div>
            <div style={{ ...lineStyle, color: colors.slate, fontWeight: 400 }}>Cleaning · open</div>
            <div style={{ display: "grid", alignItems: "center", height: 24 }}>
              <div
                style={{
                  gridArea: "1 / 1",
                  opacity: 1 - offerP,
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: colors.slate,
                  whiteSpace: "nowrap",
                }}
              >
                Cancelled{" "}
                <span style={{ fontFamily: fonts.mono, fontSize: 14 }}>7:52 AM</span>
              </div>
              <div style={{ gridArea: "1 / 1", opacity: offerP }}>
                <Chip tone="amber" label="Offered to 3" size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Filled: solid teal */}
        <div
          style={{
            ...blockBox,
            backgroundColor: colors.teal,
            border: `1px solid ${colors.teal}`,
            opacity: fillP,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ ...timeStyle, color: "rgba(255,255,255,0.82)" }}>{CANCELLED.time}</div>
            <Bolt
              size={20}
              color={colors.white}
              style={{ opacity: boltP, scale: String(0.6 + 0.4 * boltP) }}
            />
          </div>
          <div style={{ ...lineStyle, color: colors.white, fontWeight: 600 }}>
            Rosa Delgado · Cleaning
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              lineHeight: "24px",
              color: "rgba(255,255,255,0.82)",
              whiteSpace: "nowrap",
            }}
          >
            Filled by text
          </div>
        </div>
      </div>
    </div>
  );
};

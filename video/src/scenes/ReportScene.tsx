import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, clamp, RADIUS } from "../theme";
import { T } from "../timing";
import { fadeIn, fadeOut, rise } from "../anim";
import { DashedOutline } from "../components/DashedOutline";

const FILLED = 14;
const RECOVERED = 3920;
const CARD_W = 1240;
const SQUARE = 24;

const labelStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 500,
  color: colors.slate,
  lineHeight: "34px",
};

const numberStyle: React.CSSProperties = {
  fontFamily: fonts.mono,
  fontWeight: 600,
  fontSize: 128,
  lineHeight: 1,
  letterSpacing: "-0.03em",
  fontVariantNumeric: "tabular-nums",
  color: colors.ink,
  marginTop: 18,
};

/** Tabular mono digits, with the comma pulled in so "$3,920" doesn't read as "$3 , 920". */
const MonoAmount: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split("").map((ch, i) =>
      ch === "," ? (
        <span key={i} style={{ display: "inline-block", margin: "0 -0.1em" }}>
          ,
        </span>
      ) : (
        <span key={i}>{ch}</span>
      ),
    )}
  </>
);

/** 17–22 s: this month's numbers count up. Lives in <Sequence from={T.reportFrom}>. */
export const ReportScene: React.FC = () => {
  const frame = useCurrentFrame() + T.reportFrom;

  const enter = fadeIn(frame, T.reportFrom + 4, 14);
  const exit = fadeOut(frame, T.wordmarkOut, 12);
  const p = interpolate(frame, [T.reportFrom + 14, T.reportFrom + 86], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });
  const filled = Math.round(FILLED * p);
  const dollars = Math.round((RECOVERED * p) / 10) * 10;

  return (
    <AbsoluteFill
      style={{
        fontFamily: fonts.sans,
        alignItems: "center",
        justifyContent: "center",
        opacity: exit,
      }}
    >
      <div
        style={{
          width: CARD_W,
          display: "flex",
          backgroundColor: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: RADIUS,
          padding: "52px 0",
          opacity: enter,
          translate: `0px ${rise(frame, T.reportFrom + 4, 18, 16)}px`,
        }}
      >
        <div style={{ flex: 1, padding: "0 64px" }}>
          <div style={labelStyle}>Chairs filled this month</div>
          <div style={numberStyle}>{filled}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 30 }}>
            {Array.from({ length: FILLED }).map((_, i) => {
              const on = interpolate(FILLED * p - i, [0, 1], [0, 1], clamp);
              return (
                <div key={i} style={{ position: "relative", width: SQUARE, height: SQUARE }}>
                  <div style={{ opacity: 1 - on }}>
                    <DashedOutline width={SQUARE} height={SQUARE} radius={5} strokeWidth={1.5} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 5,
                      backgroundColor: colors.teal,
                      opacity: on,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ width: 1, backgroundColor: colors.border }} />
        <div style={{ flex: 1, padding: "0 64px" }}>
          <div style={labelStyle}>Recovered</div>
          <div style={numberStyle}>
            <MonoAmount text={`$${dollars.toLocaleString("en-US")}`} />
          </div>
          <div style={{ fontSize: 20, color: colors.slate, marginTop: 30, lineHeight: "24px" }}>
            Slot value × chairs filled
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 36,
          fontSize: 24,
          color: colors.slate,
          opacity: fadeIn(frame, T.reportFrom + 18, 12),
        }}
      >
        October 2026 · Maple Family Dental
      </div>
    </AbsoluteFill>
  );
};

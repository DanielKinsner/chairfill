import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, clamp, easeOut } from "../theme";
import { T } from "../timing";
import { fadeIn, rise } from "../anim";
import { Bolt } from "../components/Bolt";
import { DashedOutline } from "../components/DashedOutline";

const MARK = 88;
const MARK_R = (8 / 44) * MARK;

/**
 * 22–25 s: the mark plays the motif once more (dashed outline → solid teal with one
 * soft pulse), the wordmark settles beside it, then the line. Holds to the end.
 * Lives in <Sequence from={T.endFrom}>.
 */
export const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame() + T.endFrom;
  const f0 = T.endFrom;

  const outlineIn = fadeIn(frame, f0 + 2, 8);
  const fill = fadeIn(frame, f0 + 10, 8);
  const ring = interpolate(frame, [f0 + 10, f0 + 46], [0, 1], { ...clamp, easing: easeOut });
  const boltIn = fadeIn(frame, f0 + 14, 10);
  const wordIn = fadeIn(frame, f0 + 10, 12);
  const lineIn = fadeIn(frame, f0 + 22, 14);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.sans,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: -40 }}>
        <div style={{ position: "relative", width: MARK, height: MARK }}>
          {frame >= f0 + 10 ? (
            <div
              style={{
                position: "absolute",
                inset: -18 * ring,
                borderRadius: MARK_R + 18 * ring,
                border: `2px solid ${colors.teal}`,
                opacity: 0.45 * (1 - ring),
              }}
            />
          ) : null}
          <div style={{ position: "absolute", inset: 0, opacity: outlineIn * (1 - fill) }}>
            <DashedOutline width={MARK} height={MARK} radius={MARK_R} strokeWidth={2} />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: MARK_R,
              backgroundColor: colors.teal,
              opacity: fill,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bolt
              size={MARK * 0.62}
              color={colors.white}
              style={{ opacity: boltIn, scale: String(0.7 + 0.3 * boltIn) }}
            />
          </div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 80,
            lineHeight: 1,
            letterSpacing: "-0.015em",
            color: colors.ink,
            opacity: wordIn,
            translate: `${(1 - wordIn) * -10}px 0px`,
          }}
        >
          ChairFill
        </div>
      </div>

      <div
        style={{
          marginTop: 64,
          fontSize: 84,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: colors.ink,
          opacity: lineIn,
          translate: `0px ${rise(frame, f0 + 22, 14, 16)}px`,
        }}
      >
        An empty chair fills itself.
      </div>
    </AbsoluteFill>
  );
};

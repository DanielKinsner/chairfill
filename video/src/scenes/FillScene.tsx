import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, clamp, easeInOut } from "../theme";
import { offerTarget, ROSA_YES, SLOT_B_CENTER } from "../layout";
import { T, landingFrame } from "../timing";
import { fadeOut } from "../anim";
import { BOOKED_TEXT, OFFER_LINK, OFFER_TEXT, PATIENTS, TAKEN_TEXT } from "../data";
import { FillTimeline } from "../components/FillTimeline";
import { Phone, type Message } from "../components/Phone";
import type { ChipState } from "../components/Chip";

const offer = (
  <>
    {OFFER_TEXT}
    <span style={{ color: colors.teal, textDecoration: "underline", textUnderlineOffset: 3 }}>
      {OFFER_LINK}
    </span>
  </>
);

/** Quadratic Bézier between two points, bending through `c`. */
const bezier = (
  t: number,
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
) => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

/** A small soft-teal SMS bubble icon travelling from the slot to a phone. */
const OfferFlight: React.FC<{ frame: number; i: number }> = ({ frame, i }) => {
  const start = T.flightStart + i * T.flightStagger;
  const end = start + T.flightDuration;
  if (frame < start || frame > end) return null;
  const t = interpolate(frame, [start, end], [0, 1], { ...clamp, easing: easeInOut });
  const a = SLOT_B_CENTER;
  const b = offerTarget(i);
  const p = bezier(t, a, { x: b.x, y: a.y + 30 }, b);
  const opacity =
    interpolate(frame, [start, start + 4], [0, 1], clamp) *
    interpolate(frame, [end - 5, end], [1, 0], clamp);
  const s = interpolate(t, [0, 0.5, 1], [0.7, 1, 0.85]);
  return (
    <svg
      width={60}
      height={46}
      viewBox="0 0 60 46"
      style={{
        position: "absolute",
        left: p.x - 30,
        top: p.y - 23,
        opacity,
        scale: String(s),
      }}
    >
      <path
        d="M10 1.5 H50 A8.5 8.5 0 0 1 58.5 10 V28 A8.5 8.5 0 0 1 50 36.5 H20 L10 44 V36.5 A8.5 8.5 0 0 1 1.5 28 V10 A8.5 8.5 0 0 1 10 1.5 Z"
        fill={colors.tealSoft}
        stroke={colors.teal}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <rect x={12} y={12} width={34} height={4} rx={2} fill={colors.teal} />
      <rect x={12} y={21} width={22} height={4} rx={2} fill={colors.teal} opacity={0.55} />
    </svg>
  );
};

/** Rosa's YES travels back up to the schedule and lands as the slot turns teal. */
const YesFlight: React.FC<{ frame: number }> = ({ frame }) => {
  const start = T.flybackStart;
  const end = T.fill;
  if (frame < start || frame > end) return null;
  const t = interpolate(frame, [start, end], [0, 1], { ...clamp, easing: easeInOut });
  const a = ROSA_YES;
  const b = SLOT_B_CENTER;
  const p = bezier(t, a, { x: a.x, y: b.y + 40 }, b);
  const opacity =
    interpolate(frame, [start, start + 3], [0, 1], clamp) *
    interpolate(frame, [end - 4, end], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: p.x - 34,
        top: p.y - 18,
        width: 68,
        height: 36,
        borderRadius: 8,
        backgroundColor: colors.teal,
        color: colors.white,
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: 17,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        scale: String(interpolate(t, [0, 1], [1, 0.75])),
      }}
    >
      YES
    </div>
  );
};

/**
 * 3–17 s: the fill timeline on the left, three patients' phones on the right.
 * Offers fly out from the slot; Rosa replies YES; Gail and Kevin hear it's taken.
 * Lives in <Sequence from={T.fillSceneFrom}>; works in composition frames.
 */
export const FillScene: React.FC = () => {
  const frame = useCurrentFrame() + T.fillSceneFrom;
  const storyOut = fadeOut(frame, T.storyOut, 14);

  const offered = (i: number): ChipState => ({
    at: landingFrame(i),
    tone: "amber",
    label: "Offered",
  });
  const offerMsg = (i: number): Message => ({ at: landingFrame(i), side: "in", content: offer });

  return (
    <AbsoluteFill style={{ opacity: storyOut }}>
      <FillTimeline frame={frame} />

      <Phone
        frame={frame}
        index={0}
        appearAt={T.phonesIn}
        name={PATIENTS[0].name}
        number={PATIENTS[0].phone}
        chip={[offered(0), { at: T.takenGail, tone: "slate", label: "Still on list" }]}
        messages={[offerMsg(0), { at: T.takenGail, side: "in", content: TAKEN_TEXT }]}
      />
      <Phone
        frame={frame}
        index={1}
        appearAt={T.phonesIn + 4}
        name={PATIENTS[1].name}
        number={PATIENTS[1].phone}
        chip={[offered(1), { at: T.confirmed, tone: "green", label: "Confirmed" }]}
        messages={[
          offerMsg(1),
          { at: T.yesBubble, side: "out", content: "YES" },
          { at: T.rosaConfirmation, side: "in", content: BOOKED_TEXT },
        ]}
        typing={{ start: T.typeStart, text: "YES", tap: T.tap, sent: T.yesBubble }}
      />
      <Phone
        frame={frame}
        index={2}
        appearAt={T.phonesIn + 8}
        name={PATIENTS[2].name}
        number={PATIENTS[2].phone}
        chip={[offered(2), { at: T.takenKevin, tone: "slate", label: "Still on list" }]}
        messages={[offerMsg(2), { at: T.takenKevin, side: "in", content: TAKEN_TEXT }]}
      />

      {[0, 1, 2].map((i) => (
        <OfferFlight key={i} frame={frame} i={i} />
      ))}
      <YesFlight frame={frame} />

    </AbsoluteFill>
  );
};

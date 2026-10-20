import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { colors, fonts } from "./theme";
import { SIDE } from "./layout";
import { T } from "./timing";
import { fadeIn, fadeOut, rise } from "./anim";
import { Wordmark } from "./components/Wordmark";
import { ScheduleScene } from "./scenes/ScheduleScene";
import { FillScene } from "./scenes/FillScene";
import { ReportScene } from "./scenes/ReportScene";
import { EndCardScene } from "./scenes/EndCardScene";

const CornerWordmark: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        top: 56 + rise(frame, T.wordmarkIn, 8),
        opacity: fadeIn(frame, T.wordmarkIn, 14) * fadeOut(frame, T.wordmarkOut, 12),
      }}
    >
      <Wordmark markSize={44} textSize={30} gap={14} />
    </div>
  );
};

/**
 * ChairFill explainer, 25 s at 30 fps.
 *   0–3 s   schedule, one slot goes dashed
 *   3–10 s  fill timeline, three offers fly out to phones
 *   10–17 s Rosa replies YES, slot turns teal (chime), others told it's taken
 *   17–22 s report counters
 *   22–25 s end card
 */
export const ChairFillExplainer: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.white, fontFamily: fonts.sans, color: colors.ink }}>
    <Sequence name="Schedule (0–17s)" durationInFrames={T.storyEnd}>
      <ScheduleScene />
    </Sequence>
    <Sequence
      name="Fill timeline and phones (3–17s)"
      from={T.fillSceneFrom}
      durationInFrames={T.storyEnd - T.fillSceneFrom}
    >
      <FillScene />
    </Sequence>
    <Sequence name="Report (17–22s)" from={T.reportFrom} durationInFrames={T.reportDuration}>
      <ReportScene />
    </Sequence>
    <Sequence name="End card (22–25s)" from={T.endFrom} durationInFrames={T.endDuration}>
      <EndCardScene />
    </Sequence>
    <Sequence name="Wordmark" durationInFrames={T.wordmarkOut + 14}>
      <CornerWordmark />
    </Sequence>
    <Sequence name="Chime" from={T.fill} durationInFrames={54}>
      <Html5Audio src={staticFile("chime.wav")} />
    </Sequence>
  </AbsoluteFill>
);

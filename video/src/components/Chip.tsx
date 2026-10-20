import React from "react";
import { colors, fonts } from "../theme";
import { fadeIn } from "../anim";

export type Tone = "amber" | "green" | "slate" | "teal";

const TONES: Record<Tone, { bg: string; fg: string; dot: string }> = {
  amber: { bg: colors.amberSoft, fg: colors.amberText, dot: colors.amber },
  green: { bg: colors.greenSoft, fg: colors.greenText, dot: colors.green },
  slate: { bg: colors.slateSoft, fg: colors.slate, dot: colors.slate },
  teal: { bg: colors.tealSoft, fg: colors.tealText, dot: colors.teal },
};

export const Chip: React.FC<{
  tone: Tone;
  label: string;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}> = ({ tone, label, size = "md", style }) => {
  const t = TONES[tone];
  const md = size === "md";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: md ? 8 : 6,
        height: md ? 30 : 24,
        padding: md ? "0 12px" : "0 9px",
        borderRadius: 8,
        backgroundColor: t.bg,
        color: t.fg,
        fontFamily: fonts.sans,
        fontWeight: 500,
        fontSize: md ? 16 : 14,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <div
        style={{
          width: md ? 8 : 7,
          height: md ? 8 : 7,
          borderRadius: 4,
          backgroundColor: t.dot,
        }}
      />
      {label}
    </div>
  );
};

export type ChipState = { at: number; tone: Tone; label: string };

/**
 * A chip that changes state over time with 300 ms crossfades.
 * All states share one grid cell, so the box never jumps in size.
 */
export const StatusChip: React.FC<{
  frame: number;
  states: ChipState[];
  align?: "start" | "end";
  size?: "sm" | "md";
}> = ({ frame, states, align = "end", size = "md" }) => (
  <div style={{ display: "grid", justifyItems: align }}>
    {states.map((s, i) => {
      const next = states[i + 1];
      const opacity = fadeIn(frame, s.at) * (next ? 1 - fadeIn(frame, next.at) : 1);
      return (
        <div key={s.label + s.at} style={{ gridArea: "1 / 1", opacity }}>
          <Chip tone={s.tone} label={s.label} size={size} />
        </div>
      );
    })}
  </div>
);

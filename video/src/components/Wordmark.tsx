import React from "react";
import { colors, fonts } from "../theme";
import { Bolt } from "./Bolt";

/** Teal rounded square with the white bolt. Corner radius is 8px at 44px and scales with size. */
export const Mark: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: (8 / 44) * size,
      backgroundColor: colors.teal,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <Bolt size={size * 0.62} color={colors.white} />
  </div>
);

export const Wordmark: React.FC<{ markSize: number; textSize: number; gap?: number }> = ({
  markSize,
  textSize,
  gap,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: gap ?? markSize * 0.32 }}>
    <Mark size={markSize} />
    <div
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        fontSize: textSize,
        color: colors.ink,
        letterSpacing: "-0.01em",
        lineHeight: 1,
      }}
    >
      ChairFill
    </div>
  </div>
);

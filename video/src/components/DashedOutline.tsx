import React from "react";
import { colors } from "../theme";

/** The empty-slot motif: a dashed grey 8px-rounded outline with even dashes. */
export const DashedOutline: React.FC<{
  width: number;
  height: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ width, height, radius = 8, strokeWidth = 1.5, color = colors.dashed }) => (
  <svg
    width={width}
    height={height}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
  >
    <rect
      x={strokeWidth / 2}
      y={strokeWidth / 2}
      width={width - strokeWidth}
      height={height - strokeWidth}
      rx={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray="7 5"
    />
  </svg>
);

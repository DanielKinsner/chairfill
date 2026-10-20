import React from "react";

/** The ChairFill lightning bolt, drawn as a path (no emoji). */
export const Bolt: React.FC<{ size: number; color: string; style?: React.CSSProperties }> = ({
  size,
  color,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", ...style }}>
    <path
      d="M13.6 2.2 L5.2 13.4 H11.3 L10.2 21.8 L18.8 10.4 H12.6 Z"
      fill={color}
      stroke={color}
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
  </svg>
);

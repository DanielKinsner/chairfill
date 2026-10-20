import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { Easing } from "remotion";

const sans = loadSans("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const fonts = {
  sans: sans.fontFamily,
  mono: mono.fontFamily,
};

// "Calm clinical" palette. Tints marked "derived" are lighter/darker steps of the
// brand colors, used only where a chip needs readable text on a soft background.
export const colors = {
  white: "#FFFFFF",
  surface: "#F7F9FA",
  ink: "#17202A",
  teal: "#0F8B8D",
  tealSoft: "#DFF3F3",
  tealText: "#0B6E70", // derived
  amber: "#E7A33E",
  amberSoft: "#FCF0DC", // derived
  amberText: "#8A5A12", // derived
  green: "#2E9E5B",
  greenSoft: "#E2F3E9", // derived
  greenText: "#1E7543", // derived
  slate: "#6B7A8C",
  slateSoft: "#EEF1F4", // derived
  border: "#E2E8EC",
  dashed: "#A7B2BD", // derived: the empty-slot outline grey
  bubble: "#EEF2F4", // derived: incoming SMS bubble
};

export const RADIUS = 8;

// Ease-out used for nearly every fade/slide: quick start, soft landing.
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
// Ease-in-out for things that travel (SMS bubbles in flight).
export const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);

// Common interpolate options.
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

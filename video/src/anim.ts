import { interpolate } from "remotion";
import { clamp, easeOut } from "./theme";

/** 0 → 1 over `duration` frames starting at `start` (ease-out). 9 frames ≈ 300 ms. */
export const fadeIn = (frame: number, start: number, duration = 9) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: easeOut,
  });

/** 1 → 0 over `duration` frames starting at `start`. */
export const fadeOut = (frame: number, start: number, duration = 9) =>
  1 - fadeIn(frame, start, duration);

/** Vertical offset in px that settles from `distance` to 0 (pairs with fadeIn). */
export const rise = (frame: number, start: number, distance = 10, duration = 12) =>
  (1 - fadeIn(frame, start, duration)) * distance;

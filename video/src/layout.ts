// Fixed geometry for the 1920x1080 frame. Flights (SMS bubbles travelling
// between the schedule slot and the phones) use these numbers, so the
// schedule, phones and flights always agree on where things are.

export const SIDE = 96;

export const SCHEDULE = {
  x: SIDE,
  w: 1920 - SIDE * 2, // 1728
  rowHeaderW: 250,
  headerH: 64,
  rowH: 124,
  topA: 330, // 0–3 s: centered, all three chairs
  topB: 132, // 3–17 s: only Chair 5, pinned under the wordmark
  inset: 10, // gap between a cell edge and its appointment block
};

export const DAY_COL_W = (SCHEDULE.w - SCHEDULE.rowHeaderW) / 5;
export const BLOCK_W = DAY_COL_W - SCHEDULE.inset * 2;
export const BLOCK_H = SCHEDULE.rowH - SCHEDULE.inset * 2;

/** The Tue 2:00 PM Chair 5 slot once the schedule has moved to the top. */
export const SLOT_B = {
  x: SCHEDULE.x + SCHEDULE.rowHeaderW + DAY_COL_W + SCHEDULE.inset,
  y: SCHEDULE.topB + SCHEDULE.headerH + SCHEDULE.inset,
  w: BLOCK_W,
  h: BLOCK_H,
};
export const SLOT_B_CENTER = {
  x: SLOT_B.x + SLOT_B.w / 2,
  y: SLOT_B.y + SLOT_B.h / 2,
};

export const PANEL = { x: SIDE, y: 372, w: 448, h: 636 };

export const PHONE = {
  labelY: 372,
  y: 436,
  w: 340,
  h: 572,
  bezel: 10,
  xs: [600, 1042, 1484],
};

/** Where an offer bubble lands inside phone #i (center of the first message). */
export const offerTarget = (i: number) => ({
  x: PHONE.xs[i] + 150,
  y: PHONE.y + 190,
});

/** Center of Rosa's outgoing YES bubble (phone #1). */
export const ROSA_YES = { x: PHONE.xs[1] + 288, y: PHONE.y + 295 };

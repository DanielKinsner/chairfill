// Every beat of the video, in composition frames (30 fps, 750 frames = 25 s).
// Scenes that live inside a <Sequence from={n}> convert back to these global
// frames, so the whole choreography can be read (and retimed) in one place.

export const FPS = 30;
export const DURATION = 750;

export const T = {
  // 0–3 s: schedule, one slot cancels
  wordmarkIn: 0,
  scheduleIn: 8,
  cancel: 34,

  // 3–10 s: fill timeline, offers fly out
  focus: 86, // other chairs fold away, schedule moves to the top
  fillSceneFrom: 86,
  panelIn: 100,
  phonesIn: 106,
  offerSent: 130,
  flightStart: 132,
  flightStagger: 6,
  flightDuration: 26,
  delivered: 186,
  read: 226,
  waiting: 244,

  // 10–17 s: Rosa says YES, slot turns teal
  typeStart: 274,
  tap: 296,
  yesBubble: 300,
  flybackStart: 306,
  fill: 330, // slot turns solid teal + chime
  confirmed: 332,
  scheduleUpdated: 348,
  rosaConfirmation: 360,
  takenGail: 368,
  takenKevin: 376,
  othersTold: 384,
  storyOut: 498,
  storyEnd: 515,

  // 17–22 s: report
  reportFrom: 510,
  reportDuration: 155,

  // 22–25 s: end card
  endFrom: 660,
  endDuration: 90,
  wordmarkOut: 648,
} as const;

/** Frame at which offer bubble #i (0 = Gail, 1 = Rosa, 2 = Kevin) lands on its phone. */
export const landingFrame = (i: number) =>
  T.flightStart + i * T.flightStagger + T.flightDuration;

# ChairFill explainer video

A 25-second Remotion video (1920x1080, 30 fps, 750 frames) showing one cancelled cleaning getting filled by text. It renders to `../public/explainer.mp4` and `../public/explainer-poster.jpg`.

This folder is its own project with its own `node_modules`. Run every command below from inside `video/`.

## Preview

```bash
npm install
npm run studio
```

The Studio opens in your browser. Pick **ChairFillExplainer** and scrub the timeline.

## Render

```bash
npm run chime    # rebuilds public/chime.wav (only needed if you change the chime)
npm run render   # writes ../public/explainer.mp4 (h264, crf 20, about 2.3 MB)
npm run poster   # writes ../public/explainer-poster.jpg (frame 400)
```

The first render downloads a headless Chrome build once. Review stills can go in `out/`, which git ignores:

```bash
npx remotion still src/index.ts ChairFillExplainer out/review-200.png --frame 200
```

## Storyboard

| Time | Frames | What happens |
| --- | --- | --- |
| 0–3 s | 0–89 | Week schedule for Chairs 3–5. Tue 2:00 PM in Chair 5 cancels and turns into a dashed grey outline ("Cancelled 7:52 AM"). |
| 3–10 s | 90–299 | Chairs 3 and 4 fold away. The fill timeline and three phones appear. Three offers fly from the slot to Gail, Rosa and Kevin (amber "Offered" chips). Delivered at 0:02, read at 0:09. |
| 10–17 s | 300–509 | Rosa taps YES. It flies back and the slot turns solid teal with a bolt and one soft pulse at frame 330 (the chime plays here). Gail and Kevin are told it's taken (slate chips). |
| 17–22 s | 510–659 | Report card counts up to 14 chairs filled and $3,920 recovered. |
| 22–25 s | 660–749 | End card: the mark, the wordmark and "An empty chair fills itself." |

All beat timings are in `src/timing.ts`, and the shared geometry is in `src/layout.ts`. Mock data and message copy are in `src/data.ts`.

## Files

- `src/scenes/`: `ScheduleScene`, `FillScene`, `ReportScene`, `EndCardScene`
- `src/components/`: phone, fill timeline, chips, schedule blocks, bolt and wordmark
- `scripts/make-chime.mjs`: synthesizes the chime (880 Hz + 1320 Hz sine partials, fast attack, exponential decay, peak -14 dBFS)

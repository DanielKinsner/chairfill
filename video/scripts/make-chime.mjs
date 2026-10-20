// Synthesizes the one soft chime used when the slot turns teal.
// Output: video/public/chime.wav (16-bit PCM, mono, 44.1 kHz, ~1.6 s, peak about -14 dBFS).
// Run: npm run chime

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "public", "chime.wav");

const SAMPLE_RATE = 44100;
const DURATION_S = 1.6;
const PEAK_DBFS = -14;
const ATTACK_S = 0.006; // fast, but not a click

// Two sine partials a fifth apart, plus a faint octave for a little air.
// Each partial decays exponentially; higher partials die away sooner.
const partials = [
  { freq: 880, amp: 1.0, decay: 0.42 },
  { freq: 1320, amp: 0.55, decay: 0.3 },
  { freq: 1760, amp: 0.12, decay: 0.18 },
];

const totalSamples = Math.round(SAMPLE_RATE * DURATION_S);
const raw = new Float64Array(totalSamples);

for (let i = 0; i < totalSamples; i++) {
  const t = i / SAMPLE_RATE;
  const attack = Math.min(1, t / ATTACK_S);
  // Short raised-cosine fade over the last 80 ms so the file ends at true silence.
  const tailStart = DURATION_S - 0.08;
  const tail = t < tailStart ? 1 : 0.5 * (1 + Math.cos((Math.PI * (t - tailStart)) / 0.08));
  let s = 0;
  for (const p of partials) {
    s += p.amp * Math.exp(-t / p.decay) * Math.sin(2 * Math.PI * p.freq * t);
  }
  raw[i] = s * attack * tail;
}

// Normalize so the loudest sample sits at PEAK_DBFS.
let maxAbs = 0;
for (const v of raw) maxAbs = Math.max(maxAbs, Math.abs(v));
const targetPeak = Math.pow(10, PEAK_DBFS / 20);
const gain = targetPeak / maxAbs;

const dataBytes = totalSamples * 2;
const buf = Buffer.alloc(44 + dataBytes);
buf.write("RIFF", 0, "ascii");
buf.writeUInt32LE(36 + dataBytes, 4);
buf.write("WAVE", 8, "ascii");
buf.write("fmt ", 12, "ascii");
buf.writeUInt32LE(16, 16); // fmt chunk size
buf.writeUInt16LE(1, 20); // PCM
buf.writeUInt16LE(1, 22); // mono
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
buf.writeUInt16LE(2, 32); // block align
buf.writeUInt16LE(16, 34); // bits per sample
buf.write("data", 36, "ascii");
buf.writeUInt32LE(dataBytes, 40);

let peakOut = 0;
for (let i = 0; i < totalSamples; i++) {
  const v = Math.max(-1, Math.min(1, raw[i] * gain));
  const int = Math.round(v * 32767);
  peakOut = Math.max(peakOut, Math.abs(int));
  buf.writeInt16LE(int, 44 + i * 2);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);

const peakDb = 20 * Math.log10(peakOut / 32767);
console.log(
  `Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB, ${DURATION_S}s, peak ${peakDb.toFixed(1)} dBFS)`,
);

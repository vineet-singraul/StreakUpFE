// Offline "your voice + your phrase" matcher. Runs fully in the browser, no server, no internet.
//
// How it works:
//   audio (16 kHz) -> MFCC frames (what the sound "looks like" every 10 ms)
//   enrollment: the user says their phrase 3 times -> 3 MFCC templates
//   listening:  each spoken segment -> MFCC -> DTW distance to every template
//   DTW lines up two recordings even if one was said faster/slower; a small distance = same phrase.
// Templates come from the user's own voice, so other voices/phrases score worse. It is NOT
// security-grade speaker verification, just a good-enough "is this my call-out?" detector.

export const SAMPLE_RATE = 16000;
const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms
const NFFT = 512;
const NMEL = 26;
const NCEP = 13; // c0 (loudness) is dropped below -> 12 coefficients per frame

// ---------- precomputed tables ----------
const hamming = Float32Array.from({ length: FRAME }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FRAME - 1)));

const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1);

const melFilters = (() => {
  const lo = hzToMel(60);
  const hi = hzToMel(SAMPLE_RATE / 2);
  const pts = Array.from({ length: NMEL + 2 }, (_, i) => melToHz(lo + ((hi - lo) * i) / (NMEL + 1)));
  const bins = pts.map((hz) => Math.floor(((NFFT + 1) * hz) / SAMPLE_RATE));
  return Array.from({ length: NMEL }, (_, m) => {
    const f = new Float32Array(NFFT / 2 + 1);
    const [a, b, c] = [bins[m], bins[m + 1], bins[m + 2]];
    for (let k = a; k < b; k++) f[k] = (k - a) / Math.max(1, b - a);
    for (let k = b; k < c; k++) f[k] = (c - k) / Math.max(1, c - b);
    return f;
  });
})();

const dct = Array.from({ length: NCEP }, (_, i) =>
  Float32Array.from({ length: NMEL }, (_, j) => Math.cos((Math.PI * i * (j + 0.5)) / NMEL)),
);

// In-place radix-2 FFT
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Float32Array at any rate -> Float32Array at 16 kHz (box-averaged, good enough for speech) */
export function resample(input, fromRate) {
  if (fromRate === SAMPLE_RATE) return Float32Array.from(input);
  const ratio = fromRate / SAMPLE_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = start; j < end && j < input.length; j++) s += input[j];
    out[i] = s / (end - start);
  }
  return out;
}

/** 16 kHz samples -> array of 12-dim MFCC frames, mean-normalised (removes mic/room/distance colouring) */
export function mfcc(samples) {
  const mels = [];
  const re = new Float32Array(NFFT);
  const im = new Float32Array(NFFT);
  let top = -Infinity;
  for (let start = 0; start + FRAME <= samples.length; start += HOP) {
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < FRAME; i++) {
      const prev = start + i > 0 ? samples[start + i - 1] : 0;
      re[i] = (samples[start + i] - 0.97 * prev) * hamming[i];
    }
    fft(re, im);
    const logMel = new Float32Array(NMEL);
    for (let m = 0; m < NMEL; m++) {
      const f = melFilters[m];
      let e = 0;
      for (let k = 0; k <= NFFT / 2; k++) if (f[k]) e += f[k] * (re[k] * re[k] + im[k] * im[k]);
      logMel[m] = Math.log(e + 1e-10);
      if (logMel[m] > top) top = logMel[m];
    }
    mels.push(logMel);
  }
  // Floor everything ~22 dB below the loudest band: background hiss in quiet bands then looks
  // the same whether the user was close (clean) or far away (noisy)
  const floor = top - 5;
  const frames = [];
  for (const logMel of mels) {
    for (let m = 0; m < NMEL; m++) if (logMel[m] < floor) logMel[m] = floor;
    const c = new Float32Array(NCEP - 1);
    for (let i = 1; i < NCEP; i++) {
      let s = 0;
      for (let j = 0; j < NMEL; j++) s += dct[i][j] * logMel[j];
      c[i - 1] = s;
    }
    frames.push(c);
  }
  if (!frames.length) return frames;
  const dim = NCEP - 1;
  const mean = new Float32Array(dim);
  for (const f of frames) for (let i = 0; i < dim; i++) mean[i] += f[i] / frames.length;
  for (const f of frames) for (let i = 0; i < dim; i++) f[i] -= mean[i];
  return frames;
}

/** Length-normalised DTW distance between two MFCC sequences (lower = more similar) */
export function dtw(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;
  const band = Math.max(Math.abs(n - m), Math.ceil(Math.max(n, m) * 0.35));
  let prev = new Float64Array(m + 1).fill(Infinity);
  let cur = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    cur.fill(Infinity);
    const jc = Math.round((i * m) / n);
    const lo = Math.max(1, jc - band);
    const hi = Math.min(m, jc + band);
    const ai = a[i - 1];
    for (let j = lo; j <= hi; j++) {
      const bj = b[j - 1];
      let d = 0;
      for (let k = 0; k < ai.length; k++) {
        const x = ai[k] - bj[k];
        d += x * x;
      }
      cur[j] = Math.sqrt(d) + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[m] / (n + m);
}

/**
 * templates: 3 MFCC sequences of the user's phrase.
 * baseline = how far apart the user's own 3 samples are (same phrase, same voice).
 * impostor = how far a template is from another one played BACKWARDS: same voice and sounds,
 *            different "word" — a stand-in for "user said something else".
 * The match threshold sits between the two, so it adapts to each voice and mic.
 */
export function buildProfile(templates) {
  const d = [];
  const imp = [];
  for (let i = 0; i < templates.length; i++) {
    for (let j = 0; j < templates.length; j++) {
      if (i === j) continue;
      if (j > i) d.push(dtw(templates[i], templates[j]));
      imp.push(dtw(templates[i], [...templates[j]].reverse()));
    }
  }
  const baseline = Math.max(...d);
  const impostor = Math.min(...imp);
  return { baseline, impostor, quality: impostor / Math.max(baseline, 1e-6) };
}

/**
 * ONE recording -> 3 templates: the original plus a slower and a faster copy (as if the user said it
 * calmly or in a hurry). Lets the user record just once and still match natural variation.
 */
export function augment(frames) {
  // Stretch in time only (MFCC frames), so the voice's pitch/tone stays the same
  const stretch = (factor) =>
    Array.from({ length: Math.max(1, Math.round(frames.length / factor)) }, (_, i) => frames[Math.min(frames.length - 1, Math.round(i * factor))]);
  return [frames, stretch(0.85), stretch(1.15)];
}

export const DEFAULT_SENSITIVITY = 8;

/** Sensitivity 1 (strict) .. 10 (easy) -> how far from "own voice" towards "something else" we accept */
export function thresholdFor(profile, sensitivity = profile.sensitivity ?? DEFAULT_SENSITIVITY) {
  const k = 0.2 + (Math.min(10, Math.max(1, sensitivity)) - 1) * 0.07; // 0.2 .. 0.83
  const gap = Math.max(0, profile.impostor - profile.baseline);
  return profile.baseline * 1.1 + gap * k;
}

/** Does this MFCC segment match the profile? Lenient: the closest template decides. */
export function matchSegment(profile, seg) {
  const lens = profile.templates.map((t) => t.length);
  const avgLen = lens.reduce((s, x) => s + x, 0) / lens.length;
  // Only a wildly different length is rejected outright
  if (seg.length < avgLen * 0.4 || seg.length > avgLen * 2.5) return { match: false, score: Infinity, reason: 'length' };
  const score = Math.min(...profile.templates.map((t) => dtw(t, seg)));
  const threshold = thresholdFor(profile);
  return { match: score <= threshold, score, threshold };
}

/** Pack templates small for localStorage (3 decimals) */
export const packTemplates = (templates) => templates.map((t) => t.map((f) => Array.from(f, (x) => Math.round(x * 1000) / 1000)));
export const unpackTemplates = (packed) => packed.map((t) => t.map((f) => Float32Array.from(f)));

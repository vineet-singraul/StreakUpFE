// "Find my phone" guard: listens on the mic for the user's own call-out phrase and rings a loud alarm.
// One instance per tab (module singleton) so it keeps listening while the user switches app tabs.
import { SAMPLE_RATE, mfcc, resample, matchSegment, thresholdFor } from './matcher';
import { isNativeApp, nativeAlarm } from './native';

// ---------------- profile storage (per user, on this device only) ----------------
const KEY = (userId) => `ht_findphone_${userId || 'me'}`;
export const PROFILE_VERSION = 2;

export function loadProfile(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    const p = raw ? JSON.parse(raw) : null;
    // Older recordings used a different sound format: ask for a fresh recording instead of mis-matching
    return p && p.v === PROFILE_VERSION ? p : null;
  } catch {
    return null;
  }
}
export function saveProfile(userId, profile) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
export function deleteProfile(userId) {
  try {
    localStorage.removeItem(KEY(userId));
  } catch {
    /* ignore */
  }
}

// ---------------- observable state ----------------
const state = {
  status: 'off', // off | listening | alarm
  alarmReason: null, // voice | remote | test
  level: 0, // live mic level 0..1 (for the meter)
  last: null, // { score, threshold, match, at }
  error: null,
  wakeLock: false,
};
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn({ ...state }));
const set = (patch) => {
  Object.assign(state, patch);
  emit();
};
export const getState = () => ({ ...state });
export function subscribe(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

// ---------------- audio plumbing ----------------
let ctx = null;
let mic = null; // { stream, source, proc, sink }
let segmentHandler = null; // receives each spoken segment (Float32Array @16 kHz)

/** Must be called from a click/tap the first time (browsers only allow sound after a user gesture) */
export async function ensureAudio() {
  // iPhone: "playback" audio is NOT muted by the side silent switch (Safari 16.4+)
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {
    /* not supported */
  }
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume();
  unlockSirenElement();
  return ctx;
}

// ---------------- siren as a real media file ----------------
// An <audio> element plays as "media playback": on iPhone it ignores the silent switch, and on
// Android ringer-silent / vibrate mode doesn't mute it (only the MEDIA volume matters).
let sirenEl = null;

function sirenWavUrl() {
  const rate = 22050;
  const secs = 2;
  const n = rate * secs;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // Wail 900 -> 1800 -> 900 Hz every second; square-ish tone cuts through noise
    const f = 900 + 900 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t));
    phase += (2 * Math.PI * f) / rate;
    const s = Math.max(-1, Math.min(1, 2.2 * Math.sin(phase))) * 0.95;
    v.setInt16(44 + i * 2, s * 32767, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// Browsers only let audio play later if it was started once from a tap: play it muted now.
function unlockSirenElement() {
  try {
    if (!sirenEl) {
      sirenEl = new Audio(sirenWavUrl());
      sirenEl.loop = true;
      sirenEl.preload = 'auto';
      sirenEl.setAttribute('playsinline', '');
    }
    if (sirenEl.dataset.unlocked) return;
    sirenEl.muted = true;
    sirenEl
      .play()
      .then(() => {
        sirenEl.pause();
        sirenEl.currentTime = 0;
        sirenEl.muted = false;
        sirenEl.dataset.unlocked = '1';
      })
      .catch(() => {
        sirenEl.muted = false;
      });
  } catch {
    /* ignore */
  }
}

async function playSirenElement() {
  if (!sirenEl) unlockSirenElement();
  sirenEl.muted = false;
  sirenEl.volume = 1;
  sirenEl.currentTime = 0;
  await sirenEl.play();
  return () => {
    sirenEl.pause();
    sirenEl.currentTime = 0;
  };
}

export const micSupported = () => Boolean(navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext));

// Voice-activity segmenter: cuts the mic stream into "someone said something" chunks
function makeSegmenter(onSegment) {
  const FR = SAMPLE_RATE / 100; // 10 ms frames
  const PRE = 20; // keep 200 ms before speech starts
  const END_SILENCE = 40; // 400 ms of quiet ends the phrase (short gaps between words are fine)
  const MAX_FRAMES = 400; // 4 s max
  const MIN_SPEECH = 20; // 200 ms min
  let noise = 0.004;
  let carry = new Float32Array(0);
  const pre = [];
  let speech = null; // array of frames while talking
  let loud = 0;
  let quiet = 0;
  let voiced = 0;

  return (chunk16k) => {
    const buf = new Float32Array(carry.length + chunk16k.length);
    buf.set(carry);
    buf.set(chunk16k, carry.length);
    let off = 0;
    let peak = 0;
    for (; off + FR <= buf.length; off += FR) {
      const frame = buf.slice(off, off + FR);
      let s = 0;
      for (let i = 0; i < FR; i++) s += frame[i] * frame[i];
      const rms = Math.sqrt(s / FR);
      if (rms > peak) peak = rms;
      const startT = Math.max(noise * 2.5, 0.004);
      const stayT = Math.max(noise * 1.6, 0.003);

      if (!speech) {
        pre.push(frame);
        if (pre.length > PRE) pre.shift();
        if (rms > startT) {
          loud += 1;
          if (loud >= 3) {
            speech = [...pre];
            quiet = 0;
            voiced = loud;
          }
        } else {
          loud = 0;
          // Track the background level only while nobody is talking
          noise = noise * 0.97 + Math.min(rms, noise * 3) * 0.03;
        }
      } else {
        speech.push(frame);
        if (rms > stayT) {
          quiet = 0;
          voiced += 1;
        } else quiet += 1;
        if (quiet >= END_SILENCE || speech.length >= MAX_FRAMES) {
          const keep = speech.length - Math.max(0, quiet - 10); // trim trailing silence to 100 ms
          const frames = speech.slice(0, keep);
          speech = null;
          loud = 0;
          pre.length = 0;
          if (voiced >= MIN_SPEECH && quiet >= END_SILENCE) {
            const out = new Float32Array(frames.length * FR);
            frames.forEach((f, i) => out.set(f, i * FR));
            onSegment(out);
          }
        }
      }
    }
    carry = buf.slice(off);
    return Math.min(1, peak * 8);
  };
}

async function openMic() {
  if (mic) return;
  await ensureAudio();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
  });
  const source = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const sink = ctx.createGain();
  sink.gain.value = 0; // processor must reach the speakers to run, but silently
  const segment = makeSegmenter((seg) => segmentHandler?.(seg));
  let lastLevelAt = 0;
  proc.onaudioprocess = (e) => {
    const level = segment(resample(e.inputBuffer.getChannelData(0), ctx.sampleRate));
    const now = performance.now();
    if (now - lastLevelAt > 120) {
      lastLevelAt = now;
      set({ level });
    }
  };
  source.connect(proc);
  proc.connect(sink);
  sink.connect(ctx.destination);
  // If the OS takes the mic away (call, other app), drop back to "off" with a reason
  stream.getAudioTracks()[0].addEventListener('ended', () => {
    closeMic();
    if (state.status === 'listening') set({ status: 'off', error: 'Mic band ho gaya (call ya doosri app). Guard dobara ON karo.' });
  });
  mic = { stream, source, proc, sink };
}

function closeMic() {
  if (!mic) return;
  mic.proc.onaudioprocess = null;
  try {
    mic.source.disconnect();
    mic.proc.disconnect();
    mic.sink.disconnect();
  } catch {
    /* ignore */
  }
  mic.stream.getTracks().forEach((t) => t.stop());
  mic = null;
  set({ level: 0 });
}

const micError = (err) =>
  err?.name === 'NotAllowedError'
    ? 'Mic ki permission nahi mili. Browser/site settings me Microphone "Allow" karo.'
    : err?.name === 'NotFoundError'
      ? 'Is device me mic nahi mila.'
      : err?.message || 'Mic start nahi hua';

// ---------------- enrollment ----------------
/** Records ONE spoken phrase. Resolves with 16 kHz samples once the user stops talking. */
export async function recordSample(timeoutMs = 8000) {
  if (state.status !== 'off') throw new Error('Pehle Guard mode band karo');
  try {
    await openMic();
  } catch (err) {
    throw new Error(micError(err));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      segmentHandler = null;
      closeMic();
      reject(new Error('Kuch suna nahi. Thoda zor se aur saaf bolo.'));
    }, timeoutMs);
    segmentHandler = (seg) => {
      clearTimeout(timer);
      segmentHandler = null;
      closeMic();
      resolve(seg);
    };
  });
}
export function cancelRecording() {
  segmentHandler = null;
  if (state.status === 'off') closeMic();
}

// ---------------- guard (listening) ----------------
let profile = null;
let wakeLock = null;

async function keepScreenOn() {
  try {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    wakeLock = await navigator.wakeLock.request('screen');
    set({ wakeLock: true });
    wakeLock.addEventListener('release', () => set({ wakeLock: false }));
  } catch {
    set({ wakeLock: false });
  }
}
document.addEventListener('visibilitychange', () => {
  // The browser drops the wake lock when the app is hidden; take it back when it returns
  if (document.visibilityState === 'visible' && state.status !== 'off' && (!wakeLock || wakeLock.released)) keepScreenOn();
});

function onHeard(seg) {
  if (!profile || state.status !== 'listening') return;
  const r = matchSegment(profile, mfcc(seg));
  set({ last: { ...r, at: Date.now() } });
  if (r.match) startAlarm('voice');
}

export async function startGuard(p) {
  profile = p;
  set({ error: null });
  try {
    await openMic();
  } catch (err) {
    set({ status: 'off', error: micError(err) });
    return false;
  }
  segmentHandler = onHeard;
  window.__htNoReload = true; // don't let the auto-updater reload the app mid-guard
  set({ status: 'listening', last: null });
  keepScreenOn();
  nativeAlarm.keepAwake(true);
  return true;
}

export function updateSensitivity(sensitivity) {
  if (profile) profile = { ...profile, sensitivity };
  if (state.last && profile && Number.isFinite(state.last.score)) {
    const threshold = thresholdFor(profile);
    set({ last: { ...state.last, threshold, match: state.last.score <= threshold } });
  }
}

export function stopGuard() {
  stopAlarm(false);
  segmentHandler = null;
  closeMic();
  profile = null;
  window.__htNoReload = false;
  wakeLock?.release().catch(() => {});
  nativeAlarm.keepAwake(false);
  wakeLock = null;
  set({ status: 'off', level: 0, wakeLock: false });
}

// ---------------- alarm ----------------
let siren = null;
let vibrateTimer = null;
let autoStop = null;
const ALARM_MAX_MS = 3 * 60 * 1000;

function startSiren() {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  // Two-tone wailing siren: a square + saw sweeping 900–1700 Hz, plus an on/off pulse
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1.6;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain);
  const oscs = [
    ['square', 1300],
    ['sawtooth', 1310],
  ].map(([type, f]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    lfoGain.connect(o.frequency);
    o.connect(master);
    o.start();
    return o;
  });
  const pulse = ctx.createOscillator();
  pulse.type = 'square';
  pulse.frequency.value = 3;
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.25;
  pulse.connect(pulseGain);
  pulseGain.connect(master.gain);
  lfo.start();
  pulse.start();
  return () => {
    [...oscs, lfo, pulse].forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    master.disconnect();
  };
}

/** reason: 'voice' | 'remote' | 'test' */
export async function startAlarm(reason = 'test') {
  if (state.status === 'alarm') return;
  const resumeTo = mic ? 'listening' : 'off';
  segmentHandler = null; // the mic would hear the siren itself
  set({ status: 'alarm', alarmReason: reason, resumeTo });
  if (isNativeApp) {
    // Android app: native side pushes the volume to MAX and rings on the ALARM channel (works in silent mode)
    nativeAlarm.start().then(() => {
      if (state.status !== 'alarm') nativeAlarm.stop(); // STOP was tapped before it started
    });
  }
  try {
    await ensureAudio();
  } catch {
    /* no tap yet */
  }
  try {
    siren = await playSirenElement(); // media playback: survives silent/vibrate mode
  } catch {
    try {
      siren = startSiren(); // fallback: Web Audio siren
    } catch {
      siren = null; // sound blocked; vibration + flashing screen still work
    }
  }
  if (navigator.vibrate) {
    navigator.vibrate([800, 300, 800, 300, 800]);
    vibrateTimer = setInterval(() => navigator.vibrate([800, 300, 800, 300, 800]), 3300);
  }
  autoStop = setTimeout(() => stopAlarm(), ALARM_MAX_MS);
}

export function stopAlarm(resume = true) {
  clearTimeout(autoStop);
  clearInterval(vibrateTimer);
  navigator.vibrate?.(0);
  siren?.();
  if (isNativeApp) nativeAlarm.stop(); // also restores the user's volume
  siren = null;
  if (state.status !== 'alarm') return;
  if (resume && state.resumeTo === 'listening' && mic) {
    // Short pause so the siren's echo isn't treated as speech
    setTimeout(() => {
      if (state.status === 'listening') segmentHandler = onHeard;
    }, 1500);
    set({ status: 'listening', alarmReason: null, last: null });
  } else {
    set({ status: 'off', alarmReason: null });
  }
}

// "Ring my phone" pushed from another device: the service worker forwards it here
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'find-phone-ring') startAlarm('remote');
});

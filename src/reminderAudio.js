// Everything a reminder needs to make noise, all free browser APIs:
//  - built-in tones: generated with the Web Audio API (no sound files to download)
//  - custom song / voice recording: kept on this device in IndexedDB (never uploaded)
//  - read-aloud: the Web Speech API (speechSynthesis)

/* ---------------- IndexedDB: one audio blob per reminder id ---------------- */

const DB_NAME = 'streakup-reminders';
const STORE = 'audio';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req?.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export const saveAudio = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const deleteAudio = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});
export const getAudio = (id) => tx('readonly', (s) => s.get(id)).catch(() => null);

/* ---------------- Built-in tones (Web Audio) ---------------- */

export const BUILTIN_TONES = ['chime', 'bell', 'digital', 'soft'];

// [frequency Hz, start s, length s] per note, wave type, and how often the pattern repeats
const PATTERNS = {
  chime: { wave: 'sine', every: 1.8, notes: [[880, 0, 0.35], [1108.7, 0.18, 0.35], [1318.5, 0.36, 0.6]] },
  bell: { wave: 'triangle', every: 1.6, notes: [[659.3, 0, 1.2], [1318.5, 0, 0.6]] },
  digital: { wave: 'square', every: 1.2, notes: [[1000, 0, 0.09], [1000, 0.15, 0.09], [1000, 0.3, 0.09], [1000, 0.45, 0.09]] },
  soft: { wave: 'sine', every: 2.2, notes: [[523.3, 0, 0.7], [659.3, 0.45, 0.9]] },
};

let ctx;
function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function playPatternOnce(name) {
  const p = PATTERNS[name] || PATTERNS.chime;
  const c = audioCtx();
  const t0 = c.currentTime + 0.02;
  for (const [freq, start, len] of p.notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = p.wave;
    osc.frequency.value = freq;
    const vol = p.wave === 'square' ? 0.08 : 0.25;
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + len + 0.05);
  }
  return p.every * 1000;
}

/** Plays a built-in tone; loops until the returned stop() is called. */
export function playTone(name, { loop = true } = {}) {
  const every = playPatternOnce(name);
  if (!loop) return () => {};
  const id = setInterval(() => playPatternOnce(name), every);
  return () => clearInterval(id);
}

/** True when the browser will refuse to start sound until the user taps something */
export const audioLocked = () => Boolean(ctx && ctx.state === 'suspended');

/* ---------------- Song / voice blob playback ---------------- */

/** Plays a blob; resolves to stop(). Rejects if autoplay is blocked. */
export async function playBlob(blob, { loop = true } = {}) {
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  el.loop = loop;
  try {
    await el.play();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return () => { el.pause(); URL.revokeObjectURL(url); };
}

/* ---------------- Text-to-speech ---------------- */

export const ttsSupported = () => 'speechSynthesis' in window;

const LANG_TAG = { en: 'en-IN', hi: 'hi-IN', hinglish: 'hi-IN' };

/** Speaks text; resolves when done (or right away if TTS is missing). */
export function speak(text, lang = 'hinglish') {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_TAG[lang] || 'hi-IN';
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === u.lang);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = resolve;
    u.onerror = resolve;
    window.speechSynthesis.speak(u);
    setTimeout(resolve, 15000); // some browsers never fire onend
  });
}

export const stopSpeaking = () => ttsSupported() && window.speechSynthesis.cancel();

/* ---------------- Whole alarm: speak, then sound ---------------- */

/**
 * Rings a reminder: reads the title aloud (if on), then loops its sound.
 * Song / voice fall back to the chime when the file isn't on this device.
 * Returns stop(). Throws if the browser blocks sound (needs a tap first).
 */
export async function ringReminder(reminder, lang) {
  let stopped = false;
  let stopSound = () => {};
  const stop = () => { stopped = true; stopSound(); stopSpeaking(); };

  const blob = ['song', 'voice'].includes(reminder.tone) ? await getAudio(reminder._id) : null;
  if (blob) {
    if (reminder.speak) await speak(`Reminder. ${reminder.title}`, lang);
    if (!stopped) stopSound = await playBlob(blob, { loop: true }); // throws if autoplay is blocked
    return stop;
  }

  const c = audioCtx();
  if (c.state === 'suspended') {
    await c.resume().catch(() => {});
    if (c.state === 'suspended') throw new Error('locked');
  }
  if (reminder.speak) await speak(`Reminder. ${reminder.title}`, lang);
  if (!stopped) stopSound = playTone(BUILTIN_TONES.includes(reminder.tone) ? reminder.tone : 'chime');
  return stop;
}

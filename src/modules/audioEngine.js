/**
 * audioEngine.js
 *
 * Pure Web Audio API piano-like synthesiser.
 * No external dependencies, no CDN loading — works immediately in all browsers
 * including Safari.
 *
 * Usage:
 *   touchAudio()   — call SYNCHRONOUSLY inside a click/keydown handler
 *   playNote('C4') — call any time after touchAudio()
 *   playError()    — buzz for a wrong answer
 */

// ── Note frequency table ────────────────────────────────────────────────
// MIDI number: C4 = 60, A4 = 69 (= 440 Hz)
// Semitone offsets from C within an octave
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToFreq(noteId) {
  // noteId format: 'C4', 'G3', 'A5', etc.
  const letter = noteId[0];
  const octave = parseInt(noteId.slice(-1), 10);
  const midi = (octave + 1) * 12 + (SEMITONES[letter] ?? 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ── AudioContext singleton ───────────────────────────────────────────────
let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

/**
 * Run `schedule(ctx)` against a context whose clock is actually running.
 *
 * `resume()` is ASYNCHRONOUS. A sound requested in the same tick as the
 * unlocking gesture (e.g. the wrong-answer buzz, fired straight from the
 * click/keydown handler) would otherwise be scheduled against a frozen clock
 * and never heard. Sounds fired from a later timer don't hit this because
 * resume() has long since settled — which is why note playback worked while
 * the error buzz was silent.
 *
 * Dropping the sound when suspended is the wrong trade: resume first, then
 * schedule when the promise settles.
 */
function whenRunning(schedule) {
  try {
    const c = getCtx();
    if (c.state === 'running') {
      schedule(c);
      return;
    }
    const resumed = c.resume();
    if (resumed && typeof resumed.then === 'function') {
      resumed.then(() => schedule(c)).catch(() => { /* still locked */ });
    } else {
      schedule(c); // older WebKit: resume() returns undefined
    }
  } catch (err) {
    console.warn('audio unavailable:', err);
  }
}

/**
 * Call this SYNCHRONOUSLY inside every click/keydown handler.
 * Resumes the AudioContext within the user gesture so Safari unlocks audio.
 * Safe to call repeatedly.
 */
export function touchAudio() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') {
      c.resume(); // synchronous call within gesture — Safari requirement
    }
  } catch (e) {
    // AudioContext not available (e.g. server-side render)
  }
}

/**
 * Play a piano-like tone for the given note.
 * Uses two detuned oscillators + sharp attack/exponential decay envelope.
 *
 * @param {string} noteId  e.g. 'C4', 'G3'
 */
export function playNote(noteId) {
  whenRunning((c) => {
    const freq = noteToFreq(noteId);
    const now  = c.currentTime;

    // Master gain for this note
    const masterGain = c.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.45, now + 0.008);  // fast attack
    masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.15); // decay
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // release
    masterGain.connect(c.destination);

    // Lowpass filter to soften the tone
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    filter.connect(masterGain);

    // Oscillator 1: fundamental (triangle — softer, piano-like)
    const osc1 = c.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.connect(filter);
    osc1.start(now);
    osc1.stop(now + 1.9);

    // Oscillator 2: 2nd harmonic, quieter (adds presence)
    const g2 = c.createGain();
    g2.gain.setValueAtTime(0.15, now);
    g2.connect(filter);
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    osc2.connect(g2);
    osc2.start(now);
    osc2.stop(now + 1.0);
  });
}

/**
 * Dull descending buzz for a wrong answer — same sound as sibling project
 * jread (`audio.js` → `playIncorrect`): sawtooth dropping 180 → 90 Hz over
 * 300 ms. Deliberately unmusical so it can never be mistaken for a note, and
 * short enough (360 ms) to finish well before the next note's audio preview
 * fires at FEEDBACK_MS − AUDIO_LEAD (530 ms).
 */
export function playError() {
  whenRunning((c) => {
    const now = c.currentTime;

    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.30);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.33);

    osc.start(now);
    osc.stop(now + 0.36);
  });
}

export function isAudioReady() {
  return ctx !== null && ctx.state === 'running';
}

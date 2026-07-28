/**
 * audioEngine.js
 *
 * Wraps Tone.js Sampler with Salamander Grand Piano samples.
 * Lazy-initialises on first user gesture (Web Audio policy requirement).
 *
 * Usage:
 *   import { initAudio, playNote } from './audioEngine.js';
 *   await initAudio();   // call once after a user gesture
 *   playNote('C4');      // play anytime after init
 */

import * as Tone from 'tone';

// Salamander Grand Piano samples hosted by Tone.js team
const BASE_URL = 'https://tonejs.github.io/audio/salamander/';

// We load only the notes we need (every major 3rd across the piano range)
// to keep the load time manageable. Tone.Sampler interpolates between them.
const SAMPLE_URLS = {
  A0:  'A0.[mp3|ogg]',
  C1:  'C1.[mp3|ogg]',
  'D#1': 'Ds1.[mp3|ogg]',
  'F#1': 'Fs1.[mp3|ogg]',
  A1:  'A1.[mp3|ogg]',
  C2:  'C2.[mp3|ogg]',
  'D#2': 'Ds2.[mp3|ogg]',
  'F#2': 'Fs2.[mp3|ogg]',
  A2:  'A2.[mp3|ogg]',
  C3:  'C3.[mp3|ogg]',
  'D#3': 'Ds3.[mp3|ogg]',
  'F#3': 'Fs3.[mp3|ogg]',
  A3:  'A3.[mp3|ogg]',
  C4:  'C4.[mp3|ogg]',
  'D#4': 'Ds4.[mp3|ogg]',
  'F#4': 'Fs4.[mp3|ogg]',
  A4:  'A4.[mp3|ogg]',
  C5:  'C5.[mp3|ogg]',
  'D#5': 'Ds5.[mp3|ogg]',
  'F#5': 'Fs5.[mp3|ogg]',
  A5:  'A5.[mp3|ogg]',
  C6:  'C6.[mp3|ogg]',
};

let sampler = null;
let samplerReady = false;
let samplerLoading = false;

/**
 * Call this SYNCHRONOUSLY inside every user-gesture handler (click/keydown).
 * It calls AudioContext.resume() within the gesture so Safari unlocks audio.
 * Also kicks off the sampler CDN download if not already started.
 * Safe to call repeatedly — idempotent after first call.
 */
export function touchAudio() {
  // Resume the AudioContext synchronously within the gesture (Safari requirement)
  Tone.start().catch(() => {}); // fire-and-forget; do NOT await

  // Kick off sampler loading if not already started
  if (!samplerReady && !samplerLoading) {
    _loadSampler();
  }
}

async function _loadSampler() {
  samplerLoading = true;
  try {
    // Wait for context to be running before creating the sampler
    await Tone.start();
    sampler = new Tone.Sampler({
      urls:    SAMPLE_URLS,
      release: 1.2,
      baseUrl: BASE_URL,
      onload:  () => { samplerReady = true; samplerLoading = false; },
    }).toDestination();
  } catch (err) {
    console.warn('Audio sampler load failed:', err);
    samplerLoading = false;
  }
}

/** @deprecated use touchAudio() instead */
export async function initAudio() {
  touchAudio();
}

/**
 * Play a note (e.g. "C4", "G#3").
 * No-ops if audio is not yet initialised.
 *
 * @param {string} toneNote  Tone.js note string
 * @param {string} duration  Tone.js duration string (default '2n')
 */
export function playNote(toneNote, duration = '2n') {
  if (!sampler || !samplerReady) return;
  try {
    sampler.triggerAttackRelease(toneNote, duration);
  } catch (err) {
    console.warn('playNote error:', err);
  }
}

export function isAudioReady() {
  return samplerReady;
}

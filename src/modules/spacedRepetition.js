/**
 * spacedRepetition.js
 *
 * Score-based spaced repetition engine for note drilling.
 *
 * Per-note score: 0–5
 *   0 = unseen / very weak
 *   4 = comfortable (counts toward level advancement)
 *   5 = mastered
 *
 * Correct answer: score + 1 (cap 5)
 * Wrong answer:   score - 1 (floor 0)
 *
 * Level advances when every note in the active pool reaches score ≥ 4.
 * Persists state to localStorage under key "jnote_state".
 */

import { getNotesForLevel, MAX_LEVEL } from './noteData.js';

const STORAGE_KEY = 'jnote_state';
const MASTERY_THRESHOLD = 4;   // score needed to count a note as "comfortable"
const MAX_SCORE = 5;

// ─── Internal state ────────────────────────────────────────────────────────

function defaultState() {
  return {
    currentLevel: 1,
    noteStates: {},   // noteId → { score, attempts }
    completedAt: null // ISO string when all levels done
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw);
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — continue in-memory
  }
}

let _state = loadState();

// Ensure any missing note states are initialised (e.g. after a new level unlocks)
function ensureNoteStates(state) {
  const pool = getNotesForLevel(state.currentLevel);
  for (const note of pool) {
    if (!state.noteStates[note.id]) {
      state.noteStates[note.id] = { score: 0, attempts: 0 };
    }
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Return the next note to quiz from the active pool.
 * Selection is weighted toward lower-scoring notes, with randomness so the
 * same note is not always picked when multiple notes share the minimum score.
 *
 * @returns {import('./noteData.js').Note}
 */
export function getNextNote(previousNoteId = null) {
  ensureNoteStates(_state);
  const pool = getNotesForLevel(_state.currentLevel);

  // Weight: (MAX_SCORE + 1 - score)^2, minimum 1
  const weights = pool.map(note => {
    const s = (_state.noteStates[note.id]?.score ?? 0);
    return Math.max(1, (MAX_SCORE + 1 - s) ** 2);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  // Avoid immediately repeating the previous note if pool size > 1
  for (let attempt = 0; attempt < 2; attempt++) {
    rand = Math.random() * totalWeight;
    let accumulated = 0;
    for (let i = 0; i < pool.length; i++) {
      accumulated += weights[i];
      if (rand <= accumulated) {
        if (pool[i].id !== previousNoteId || pool.length === 1) {
          return pool[i];
        }
        break; // picked previous note — retry once
      }
    }
  }

  // Fallback: pick first non-previous note
  return pool.find(n => n.id !== previousNoteId) ?? pool[0];
}

/**
 * Record whether the user answered correctly for a note.
 * Automatically advances the level if all notes are comfortable.
 *
 * @param {string} noteId
 * @param {boolean} correct
 * @returns {{ leveledUp: boolean, newLevel: number }}
 */
export function recordAnswer(noteId, correct) {
  ensureNoteStates(_state);
  const ns = _state.noteStates[noteId] ?? { score: 0, attempts: 0 };
  ns.attempts += 1;

  if (correct) {
    ns.score = Math.min(MAX_SCORE, ns.score + 1);
  } else {
    ns.score = Math.max(0, ns.score - 1);
  }
  _state.noteStates[noteId] = ns;

  // Check for level advancement
  let leveledUp = false;
  if (_state.currentLevel < MAX_LEVEL) {
    const pool = getNotesForLevel(_state.currentLevel);
    const allComfortable = pool.every(
      n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD
    );
    if (allComfortable) {
      _state.currentLevel += 1;
      leveledUp = true;
      // Initialise states for newly unlocked notes
      ensureNoteStates(_state);
    }
  }

  saveState(_state);
  return { leveledUp, newLevel: _state.currentLevel };
}

/**
 * Returns a snapshot of current progress.
 *
 * @returns {{
 *   currentLevel: number,
 *   noteStates: Record<string, {score: number, attempts: number}>,
 *   poolSize: number,
 *   comfortableCount: number,
 *   isComplete: boolean
 * }}
 */
export function getProgress() {
  ensureNoteStates(_state);
  const pool = getNotesForLevel(_state.currentLevel);
  const comfortableCount = pool.filter(
    n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD
  ).length;
  return {
    currentLevel: _state.currentLevel,
    noteStates: { ..._state.noteStates },
    poolSize: pool.length,
    comfortableCount,
    isComplete: _state.currentLevel >= MAX_LEVEL &&
      pool.every(n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD),
  };
}

/**
 * Reset all progress and return to level 1.
 */
export function reset() {
  _state = defaultState();
  saveState(_state);
}

/**
 * Returns the score (0–5) for a note.
 */
export function getNoteScore(noteId) {
  return _state.noteStates[noteId]?.score ?? 0;
}

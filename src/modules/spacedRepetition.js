/**
 * spacedRepetition.js
 *
 * Score-based spaced repetition engine for note drilling.
 *
 * Per-note score: 0–5
 *   0 = unseen / very weak
 *   4 = fluent (counts toward level advancement)
 *   5 = mastered
 *
 * Recognition must be both CORRECT and FAST. An answer only earns credit when
 * it arrives within FLUENT_MS of the note appearing:
 *
 *   Correct within FLUENT_MS: score + 1 (cap 5)
 *   Correct but too slow:     no change  — no credit, no penalty
 *   Wrong:                    score - 1 (floor 0)
 *
 * A slow-but-correct answer stalls progress rather than punishing it: the user
 * knows the note, they just don't know it automatically yet.
 *
 * Level advances when every note in the active pool reaches score ≥ 4, i.e.
 * 4 net fast identifications of every note in the pool.
 * Persists state to localStorage under key "jnote_state".
 */

import { getNotesForLevel, MAX_LEVEL } from './noteData.js';

const STORAGE_KEY = 'jnote_state';
const STATE_VERSION = 2;       // bump to invalidate saved state after a rule change
const MASTERY_THRESHOLD = 4;   // score needed to count a note as "fluent"
const MAX_SCORE = 5;

/**
 * Reaction-time budget for a correct answer to earn score credit, in ms.
 * Measured from the note appearing to the answer being submitted, so it has to
 * cover read + decide + press. 3 s is a generous reaction window while still
 * being short enough that it can only be met by near-automatic recall —
 * counting on fingers up the ledger lines does not fit inside it.
 */
export const FLUENT_MS = 3000;

// ─── Internal state ────────────────────────────────────────────────────────

function defaultState() {
  return {
    version:      STATE_VERSION,
    currentLevel: 1,
    noteStates:   {},   // noteId → { score, attempts, fluent }
    rtLog:        [],   // { noteId, ms, correct, ts }[] — capped at 500
    completedAt:  null
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Scores saved before the fluency rule were earned without any time
    // pressure, so they say nothing about recognition speed. Discard them
    // rather than grant credit the user never demonstrated.
    if (parsed?.version !== STATE_VERSION) return defaultState();
    return parsed;
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
      state.noteStates[note.id] = { score: 0, attempts: 0, fluent: 0 };
    }
  }
}

/**
 * Was this answer fast enough to earn credit?
 * A missing reaction time (timer never started) is treated as fluent — the
 * failure mode of a broken clock should not be an unprogressable level.
 *
 * @param {number|null|undefined} reactionMs
 */
export function isFluent(reactionMs) {
  return reactionMs == null || reactionMs <= FLUENT_MS;
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
 * Record whether the user answered correctly for a note, and how fast.
 * Only a correct answer inside FLUENT_MS raises the score.
 * Automatically advances the level if every note in the pool is fluent.
 *
 * @param {string} noteId
 * @param {boolean} correct
 * @param {number|null} [reactionMs]  ms from note display to answer
 * @returns {{ leveledUp: boolean, newLevel: number, fluent: boolean, scoreChange: number }}
 */
export function recordAnswer(noteId, correct, reactionMs = null) {
  ensureNoteStates(_state);
  const ns = _state.noteStates[noteId] ?? { score: 0, attempts: 0, fluent: 0 };
  ns.attempts += 1;

  const fluent = correct && isFluent(reactionMs);
  const previousScore = ns.score;

  if (fluent) {
    ns.fluent = (ns.fluent ?? 0) + 1;
    ns.score = Math.min(MAX_SCORE, ns.score + 1);
  } else if (!correct) {
    ns.score = Math.max(0, ns.score - 1);
  }
  // Correct but slow: score untouched — the note stays in heavy rotation.
  _state.noteStates[noteId] = ns;

  // Check for level advancement
  let leveledUp = false;
  if (_state.currentLevel < MAX_LEVEL) {
    const pool = getNotesForLevel(_state.currentLevel);
    const allFluent = pool.every(
      n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD
    );
    if (allFluent) {
      _state.currentLevel += 1;
      leveledUp = true;
      // Initialise states for newly unlocked notes
      ensureNoteStates(_state);
    }
  }

  saveState(_state);
  return {
    leveledUp,
    newLevel:    _state.currentLevel,
    fluent,
    scoreChange: ns.score - previousScore,
  };
}

/**
 * Returns a snapshot of current progress.
 *
 * @returns {{
 *   currentLevel: number,
 *   noteStates: Record<string, {score: number, attempts: number}>,
 *   poolSize: number,
 *   fluentCount: number,
 *   isComplete: boolean
 * }}
 */
export function getProgress() {
  ensureNoteStates(_state);
  const pool = getNotesForLevel(_state.currentLevel);
  const fluentCount = pool.filter(
    n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD
  ).length;
  return {
    currentLevel: _state.currentLevel,
    noteStates: { ..._state.noteStates },
    poolSize: pool.length,
    fluentCount,
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

/**
 * Record a reaction time entry.
 * @param {string}  noteId
 * @param {number}  ms       milliseconds from note display to answer
 * @param {boolean} correct
 */
export function recordRT(noteId, ms, correct) {
  if (!ms || ms <= 0 || ms > 30000) return; // ignore implausible values
  if (!_state.rtLog) _state.rtLog = [];
  _state.rtLog.push({ noteId, ms, correct, ts: new Date().toISOString() });
  if (_state.rtLog.length > 500) _state.rtLog = _state.rtLog.slice(-500);
  saveState(_state);
}

/**
 * Return reaction-time statistics.
 * Only counts correct answers under 15 s (excludes distraction pauses).
 *
 * @returns {{
 *   count:         number,   total correct answers recorded
 *   avgMs:         number,   rolling avg of last 10
 *   improvementMs: number|null  positive = faster than prior 10
 * } | null}  null if fewer than 3 correct answers recorded
 */
export function getStats() {
  const log = (_state.rtLog ?? []).filter(r => r.correct && r.ms < 15000);
  if (log.length < 3) return null;

  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const recent  = log.slice(-10).map(r => r.ms);
  const prior   = log.slice(-20, -10).map(r => r.ms);

  return {
    count:         log.length,
    avgMs:         avg(recent),
    improvementMs: prior.length >= 5 ? avg(prior) - avg(recent) : null,
  };
}

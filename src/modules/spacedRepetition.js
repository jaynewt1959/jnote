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
 * Recognition must be both CORRECT and FAST, but "fast" tightens as the note
 * is learned — see BUDGET_BY_SCORE:
 *
 *   Correct within the note's current budget: score + 1 (cap 5)
 *   Correct but too slow:                     no change — no credit, no penalty
 *   Wrong:                                    score - 1 (floor 0)
 *
 * Level advances when every note introduced at the current level is fluent and
 * most of the wider pool still is — see canAdvance().
 * Persists state to localStorage under key "jnote_state".
 */

import { getNotesForLevel, getNewNotesForLevel, MAX_LEVEL } from './noteData.js';

const STORAGE_KEY = 'jnote_state';
const STATE_VERSION = 3;       // bump to invalidate saved state after a rule change
const MASTERY_THRESHOLD = 4;   // score needed to count a note as "fluent"
const MAX_SCORE = 5;

/**
 * The final reaction-time target, in ms — the budget a note must be answered
 * inside once it is already well known. Exported for display.
 */
export const FLUENT_MS = 3000;

/**
 * Reaction-time budget per current score, in ms. Measured from the note
 * appearing to the answer being submitted, so it covers read + decide + press.
 *
 * A single flat budget cannot teach a note that has to be worked out. With one
 * 3 s gate the only two options for an unfamiliar note are to work it out and
 * be too slow (score unchanged, drift 0) or to guess in time (drift
 * 1/7 - 6/7 = -0.71) — so a note you can derive but not yet recognise is
 * frozen at its current score forever, and one frozen note used to freeze the
 * whole level with it.
 *
 * Banding the budget by the note's own score fixes that. Early on there is
 * room to reason the note out; each credit earned tightens the next
 * requirement, so the note ratchets from deliberate derivation toward
 * recognition instead of stalling. Reaching MASTERY_THRESHOLD demonstrates
 * ≤4.5 s and the final 3 s is what earns the top score — a deliberate
 * softening of the gate in exchange for it being reachable at all.
 */
const BUDGET_BY_SCORE = [6000, 6000, 4500, 4500, FLUENT_MS, FLUENT_MS];

/** The reaction-time budget for a note currently at `score`. */
export function budgetFor(score) {
  const s = Math.max(0, Math.min(MAX_SCORE, score ?? 0));
  return BUDGET_BY_SCORE[s];
}

/**
 * Fraction of the pool that must be fluent to advance, alongside every one of
 * the current level's new notes.
 *
 * Requiring literally all of a 40+ item cumulative pool means any single
 * sticky note blocks the level indefinitely, however well the rest is known.
 * Holding back 10% keeps the gate meaningful without letting one item veto it.
 */
const ADVANCE_RATIO = 0.9;

/**
 * How many further notes to wait before showing a missed note again. Two
 * entries give a short and a slightly longer gap. Random weighting alone can
 * leave a fresh mistake unseen for dozens of items, by which point the
 * correction has been forgotten; a fixed lapse gap makes the retry prompt
 * enough to still be a correction. Both values are ≥ 2, so a lapse can never
 * become an immediate repeat.
 */
const LAPSE_GAPS = [2, 5];

// ─── Internal state ────────────────────────────────────────────────────────

function defaultState() {
  return {
    version:      STATE_VERSION,
    currentLevel: 1,
    noteStates:   {},   // noteId → { score, attempts, fluent }
    rtLog:        [],   // { noteId, ms, correct, answer, ts }[] — capped at 500
    completedAt:  null
  };
}

/**
 * Retries owed after mistakes: a flat list of { noteId, remaining } entries,
 * where `remaining` counts down one per note shown. A note appears once per
 * entry in LAPSE_GAPS, giving it both a near and a later retry.
 *
 * Deliberately not persisted — a lapse is about the last few seconds of
 * attention, so it should not survive a reload and resurface out of context.
 */
let _lapses = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Scores are only meaningful under the rules that produced them, and the
    // curriculum itself is renumbered from time to time — a saved level can
    // point at content that no longer exists. Discard rather than reinterpret.
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
 * Was this answer fast enough to earn credit, given the note's current score?
 * A missing reaction time (timer never started) is treated as fluent — the
 * failure mode of a broken clock should not be an unprogressable level.
 *
 * @param {number|null|undefined} reactionMs
 * @param {number} [score]  the note's score BEFORE this answer
 */
export function isFluent(reactionMs, score = MAX_SCORE) {
  return reactionMs == null || reactionMs <= budgetFor(score);
}

/** The reaction-time budget a given note must currently be answered inside. */
export function getBudgetFor(noteId) {
  return budgetFor(_state.noteStates[noteId]?.score ?? 0);
}

/**
 * Can the current level be left behind?
 *
 * Two conditions, because they express different things: the notes this level
 * actually introduced must be fluent without exception (that is the level's
 * own content), while the accumulated pool only has to be mostly fluent (that
 * is retention, and it must not be able to veto progress on a single item).
 */
function canAdvance(state) {
  const level = state.currentLevel;
  const isOk  = n => (state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD;

  const newNotes = getNewNotesForLevel(level);
  if (!newNotes.every(isOk)) return false;

  const pool = getNotesForLevel(level);
  return pool.filter(isOk).length / pool.length >= ADVANCE_RATIO;
}

/**
 * Selection weight for a note at `score`.
 *
 * Below threshold the weight grows steeply as the score falls, so weak notes
 * dominate. At and above threshold it drops to a small constant: mastered
 * notes are worth revisiting for retention, but at a late level there are
 * dozens of them and a weight of 1 each let them crowd out the handful of
 * notes actually being learned.
 */
function weightFor(score) {
  if (score >= MAX_SCORE)         return 0.5;
  if (score >= MASTERY_THRESHOLD) return 1;
  return (MAX_SCORE + 1 - score) ** 2;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Return the next note to quiz from the active pool.
 *
 * A note owed a retry after a mistake takes priority once its gap has
 * elapsed; otherwise selection is weighted toward lower-scoring notes, with
 * randomness so the same note is not always picked when several share the
 * minimum score.
 *
 * @returns {import('./noteData.js').Note}
 */
export function getNextNote(previousNoteId = null) {
  ensureNoteStates(_state);
  const pool = getNotesForLevel(_state.currentLevel);

  const due = takeDueLapse(pool, previousNoteId);
  if (due) return due;

  const weights     = pool.map(n => weightFor(_state.noteStates[n.id]?.score ?? 0));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Avoid immediately repeating the previous note if pool size > 1
  for (let attempt = 0; attempt < 2; attempt++) {
    const rand = Math.random() * totalWeight;
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

  // Fallback: any note but the previous one. Picking deterministically here
  // would always land on the same low-level note, so it is randomised.
  const others = pool.filter(n => n.id !== previousNoteId);
  return others.length
    ? others[Math.floor(Math.random() * others.length)]
    : pool[0];
}

/**
 * Count every outstanding retry down by one and return a note whose gap has
 * closed, if any. Called exactly once per selection, so one call means one
 * note has elapsed.
 */
function takeDueLapse(pool, previousNoteId) {
  if (!_lapses.length) return null;
  for (const entry of _lapses) entry.remaining -= 1;

  const idx = _lapses.findIndex(e => e.remaining <= 0 && e.noteId !== previousNoteId);
  if (idx === -1) {
    // Anything that came due for the note just shown is dropped: showing it
    // again immediately is the one thing the gap exists to prevent.
    _lapses = _lapses.filter(e => e.remaining > 0);
    return null;
  }

  const [{ noteId }] = _lapses.splice(idx, 1);
  // A retry for a note that has since left the pool is meaningless.
  return pool.find(n => n.id === noteId) ?? null;
}

/**
 * Schedule a missed note to come back around soon, at each gap in LAPSE_GAPS.
 * Any retries already outstanding for the note are replaced, so the newest
 * mistake decides when it reappears instead of queueing behind older ones.
 */
function scheduleLapse(noteId) {
  _lapses = _lapses.filter(e => e.noteId !== noteId);
  for (const gap of LAPSE_GAPS) _lapses.push({ noteId, remaining: gap });
}

/**
 * Record whether the user answered correctly for a note, and how fast.
 * Only a correct answer inside the note's current budget raises the score.
 * Automatically advances the level when canAdvance() is satisfied.
 *
 * @param {string} noteId
 * @param {boolean} correct
 * @param {number|null} [reactionMs]  ms from note display to answer
 * @returns {{ leveledUp: boolean, newLevel: number, fluent: boolean, budgetMs: number, scoreChange: number }}
 */
export function recordAnswer(noteId, correct, reactionMs = null) {
  ensureNoteStates(_state);
  const ns = _state.noteStates[noteId] ?? { score: 0, attempts: 0, fluent: 0 };
  ns.attempts += 1;

  // The budget is read from the score BEFORE this answer, so it matches the
  // countdown the user was actually racing.
  const previousScore = ns.score;
  const budgetMs      = budgetFor(previousScore);
  const fluent        = correct && isFluent(reactionMs, previousScore);

  if (fluent) {
    ns.fluent = (ns.fluent ?? 0) + 1;
    ns.score = Math.min(MAX_SCORE, ns.score + 1);
  } else if (!correct) {
    ns.score = Math.max(0, ns.score - 1);
    scheduleLapse(noteId);
  }
  // Correct but slow: score untouched — the note stays in heavy rotation.
  _state.noteStates[noteId] = ns;

  // Check for level advancement
  let leveledUp = false;
  if (_state.currentLevel < MAX_LEVEL && canAdvance(_state)) {
    _state.currentLevel += 1;
    leveledUp = true;
    // Initialise states for newly unlocked notes
    ensureNoteStates(_state);
  }

  saveState(_state);
  return {
    leveledUp,
    newLevel:    _state.currentLevel,
    fluent,
    budgetMs,
    scoreChange: ns.score - previousScore,
  };
}

/**
 * Returns a snapshot of current progress.
 *
 * Both halves of the advancement rule are reported, because they answer
 * different questions: `newFluentCount` is "have I learned this level yet",
 * `fluentCount` is "is the rest still holding up".
 *
 * @returns {{
 *   currentLevel: number,
 *   noteStates: Record<string, {score: number, attempts: number}>,
 *   poolSize: number,
 *   fluentCount: number,
 *   newPoolSize: number,
 *   newFluentCount: number,
 *   poolTarget: number,
 *   isComplete: boolean
 * }}
 */
export function getProgress() {
  ensureNoteStates(_state);
  const isOk = n => (_state.noteStates[n.id]?.score ?? 0) >= MASTERY_THRESHOLD;

  const pool     = getNotesForLevel(_state.currentLevel);
  const newNotes = getNewNotesForLevel(_state.currentLevel);

  return {
    currentLevel:   _state.currentLevel,
    noteStates:     { ..._state.noteStates },
    poolSize:       pool.length,
    fluentCount:    pool.filter(isOk).length,
    newPoolSize:    newNotes.length,
    newFluentCount: newNotes.filter(isOk).length,
    poolTarget:     Math.ceil(pool.length * ADVANCE_RATIO),
    isComplete:     _state.currentLevel >= MAX_LEVEL && pool.every(isOk),
  };
}

/**
 * Reset all progress and return to level 1.
 */
export function reset() {
  _state = defaultState();
  _lapses = [];
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
 *
 * `answer` is the letter actually given. Storing it is what makes a wrong
 * answer diagnosable later: an off-by-one-ledger misread and a
 * wrong-staff misread are different problems with different fixes, and
 * `correct: false` alone cannot tell them apart.
 *
 * @param {string}  noteId
 * @param {number}  ms       milliseconds from note display to answer
 * @param {boolean} correct
 * @param {string}  [answer] the letter the user pressed
 */
export function recordRT(noteId, ms, correct, answer = null) {
  if (!ms || ms <= 0 || ms > 30000) return; // ignore implausible values
  if (!_state.rtLog) _state.rtLog = [];
  _state.rtLog.push({ noteId, ms, correct, answer, ts: new Date().toISOString() });
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

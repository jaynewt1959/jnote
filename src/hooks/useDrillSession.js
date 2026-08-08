/**
 * useDrillSession.js
 *
 * Central hook that manages the drill loop:
 *   1. Pick the next note from the SR engine
 *   2. Display it (via state)
 *   3. Accept an answer from the user
 *   4. Show feedback (correct/wrong) for FEEDBACK_MS
 *   5. Record the answer in the SR engine
 *   6. If level advanced, show a brief "Level up!" message
 *   7. Go to step 1
 *
 * Returns:
 *   {
 *     currentNote,       // Note object currently on display
 *     noteSerial,        // increments on every note shown (restarts the countdown)
 *     feedback,          // { correct, fluent, noteLetter, noteId } | null
 *     progress,          // { currentLevel, poolSize, fluentCount, isComplete }
 *     levelUpMsg,        // string | null  ("Level 3 unlocked!")
 *     budgetMs,          // THIS note's reaction-time budget for score credit
 *     fluentMs,          // the final budget every note is working toward
 *     awaitingDismissal, // true once a wrong answer is waiting on advance()
 *     submitAnswer(letter | noteId),  // call with user's answer
 *     advance(),         // call to move on from an explanation (manual dismiss)
 *     resetSession,
 *   }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNextNote, recordAnswer, getProgress, reset, recordRT,
  getBudgetFor, FLUENT_MS,
} from '../modules/spacedRepetition.js';

const FEEDBACK_MS       = 730;   // how long to show a correct answer before advancing
/**
 * A wrong answer holds longer than a correct one. The banner reveals the note
 * that was actually on screen, and that correction is the most useful moment
 * in the whole loop — at 730 ms it is gone before it has been read.
 */
const FEEDBACK_WRONG_MS = 1600;
const LEVELUP_MS        = 1800;  // how long to show "Level X unlocked!" toast
const WANDER_MS         = 8000;  // RTs beyond this are attention-wandered; skip RT recording

export function useDrillSession({ onNoteShown, onWrongAnswer, onAnswer, explanationsEnabled = true } = {}) {
  const [currentNote, setCurrentNote]   = useState(null);
  const [feedback,    setFeedback]      = useState(null);  // {correct, fluent, noteLetter, noteId}
  const [progress,    setProgress]      = useState(() => getProgress());
  const [levelUpMsg,  setLevelUpMsg]    = useState(null);
  // Bumped every time a note is displayed, so the countdown restarts even if
  // the same note id were ever shown twice in a row.
  const [noteSerial,  setNoteSerial]    = useState(0);
  // This note's reaction-time budget for score credit. Tightens as the note
  // is learned, so it belongs to the note on screen rather than a constant.
  const [budgetMs, setBudgetMs] = useState(FLUENT_MS);
  // True once a wrong answer is waiting on advance() (see submitAnswer) —
  // the drill loop pauses here instead of auto-advancing so the mistake
  // explanation can be read and manually dismissed.
  const [awaitingDismissal, setAwaitingDismissal] = useState(false);

  // Track the last shown noteId to avoid immediate repeats
  const lastNoteId    = useRef(null);
  // Pre-picked next note so audio and visual use the same note
  const pendingNote   = useRef(null);
  // Guard: don't accept new answers while showing feedback
  const locked        = useRef(false);
  // Timestamp when current note was displayed (for reaction-time measurement)
  const noteStartTime = useRef(null);

  // Show the next note (uses pre-picked note if available).
  // The note sounds at the moment it is drawn: onNoteShown fires here and
  // nowhere else, so the pitch the user hears always belongs to the note in
  // front of them rather than trailing their last keypress.
  const showNextNote = useCallback((prePickedNote = null) => {
    const note = prePickedNote ?? getNextNote(lastNoteId.current);
    lastNoteId.current = note.id;
    pendingNote.current = null;

    // Read the budget before the answer, so the countdown the user races is
    // the same one their answer is judged against.
    const noteBudget = getBudgetFor(note.id);
    setBudgetMs(noteBudget);

    setCurrentNote(note);
    setFeedback(null);
    setAwaitingDismissal(false);
    setNoteSerial(n => n + 1);
    locked.current = false;
    noteStartTime.current = Date.now(); // start reaction-time clock

    if (onNoteShown) onNoteShown(note);
  }, [onNoteShown]);

  // Start on mount
  useEffect(() => {
    showNextNote();
    setProgress(getProgress());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Accept a user answer.
   * @param {string} answer  Either a note letter ('C'–'G') or a full noteId ('C4').
   */
  const submitAnswer = useCallback((answer) => {
    if (locked.current || !currentNote) return;
    locked.current = true;

    // Normalise the answer to a letter
    const answerLetter = answer.length === 1
      ? answer.toUpperCase()
      : answer.replace(/[^A-G]/g, '')[0]?.toUpperCase() ?? '';

    const correct = answerLetter === currentNote.name;
    // Fire the error buzz synchronously inside the answer gesture — Safari
    // will not start audio from a later timer if the context is still locked.
    if (!correct && onWrongAnswer) onWrongAnswer();
    // Post-answer reinforcement. Sounding the note here rather than on
    // appearance is what keeps the drill honest: only the letter is ever
    // asked, so a pitch played before the answer simply gives it away.
    if (onAnswer) onAnswer(currentNote, correct);

    const reactionMs = noteStartTime.current ? Date.now() - noteStartTime.current : null;
    // If the user's attention wandered (RT too long), discard the RT so it
    // doesn't pollute stats. SR score still records — the answer still counts.
    const isWander = reactionMs !== null && reactionMs > WANDER_MS;

    // Record in SR engine (always); only record RT when attention was present
    if (reactionMs && !isWander) {
      recordRT(currentNote.id, reactionMs, correct, answerLetter);
    }
    // Score credit requires the answer to be correct and inside this note's
    // own budget, which recordAnswer reports back for the feedback banner.
    const { leveledUp, newLevel, fluent, budgetMs: judgedMs } =
      recordAnswer(currentNote.id, correct, reactionMs);
    setProgress(getProgress());

    setFeedback({
      correct, fluent, noteLetter: answerLetter, noteId: answer,
      reactionMs, isWander, budgetMs: judgedMs,
    });

    // Show level-up toast
    if (leveledUp) {
      setLevelUpMsg(`Level ${newLevel} unlocked!`);
      setTimeout(() => setLevelUpMsg(null), LEVELUP_MS);
    }

    // Pre-pick the next note now so both audio and visual use the same note
    const next = getNextNote(currentNote.id);
    pendingNote.current = next;

    if (correct) {
      // Reveal the next note once the feedback has had time to land.
      setTimeout(() => showNextNote(next), FEEDBACK_MS);
    } else if (explanationsEnabled) {
      // Pause here instead of auto-advancing: the mistake explanation needs
      // to be read, and advance() is the only thing that moves on from it.
      setAwaitingDismissal(true);
    } else {
      // No explanation to read — fall back to the old fixed delay.
      setTimeout(() => showNextNote(next), FEEDBACK_WRONG_MS);
    }
  }, [currentNote, showNextNote, onWrongAnswer, onAnswer, explanationsEnabled]);

  /** Move on from a mistake explanation to the pre-picked next note. */
  const advance = useCallback(() => {
    setAwaitingDismissal(false);
    showNextNote(pendingNote.current);
  }, [showNextNote]);

  // Safety net: if explanations get turned off while one is on screen
  // awaiting dismissal, don't leave the drill stuck — advance immediately.
  useEffect(() => {
    if (awaitingDismissal && !explanationsEnabled) advance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explanationsEnabled]);

  const resetSession = useCallback(() => {
    reset();
    lastNoteId.current = null;
    locked.current = false;
    setFeedback(null);
    setLevelUpMsg(null);
    setAwaitingDismissal(false);
    setProgress(getProgress());
    setTimeout(showNextNote, 50); // brief delay for state to settle
  }, [showNextNote]);

  return {
    currentNote,
    noteSerial,
    feedback,
    progress,
    levelUpMsg,
    budgetMs,
    fluentMs: FLUENT_MS,
    awaitingDismissal,
    submitAnswer,
    advance,
    resetSession,
  };
}

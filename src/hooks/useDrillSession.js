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
 *     fluentMs,          // reaction-time budget for score credit
 *     submitAnswer(letter | noteId),  // call with user's answer
 *     resetSession,
 *   }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNextNote, recordAnswer, getProgress, reset, recordRT, FLUENT_MS,
} from '../modules/spacedRepetition.js';

const FEEDBACK_MS  = 730;   // how long to show correct/wrong before advancing
const AUDIO_LEAD   = 200;   // play next note audio this many ms before the visual
const LEVELUP_MS   = 1800;  // how long to show "Level X unlocked!" toast
const WANDER_MS    = 8000;  // RTs beyond this are attention-wandered; skip RT recording

export function useDrillSession({ onNoteShown, onWrongAnswer } = {}) {
  const [currentNote, setCurrentNote]   = useState(null);
  const [feedback,    setFeedback]      = useState(null);  // {correct, fluent, noteLetter, noteId}
  const [progress,    setProgress]      = useState(() => getProgress());
  const [levelUpMsg,  setLevelUpMsg]    = useState(null);
  // Bumped every time a note is displayed, so the countdown restarts even if
  // the same note id were ever shown twice in a row.
  const [noteSerial,  setNoteSerial]    = useState(0);

  // Track the last shown noteId to avoid immediate repeats
  const lastNoteId    = useRef(null);
  // Pre-picked next note so audio and visual use the same note
  const pendingNote   = useRef(null);
  // Guard: don't accept new answers while showing feedback
  const locked        = useRef(false);
  // Timestamp when current note was displayed (for reaction-time measurement)
  const noteStartTime = useRef(null);

  // Show the next note (uses pre-picked note if available).
  // audioAlreadyPlayed: true when submitAnswer already fired onNoteShown via the lead timer.
  const showNextNote = useCallback((prePickedNote = null, audioAlreadyPlayed = false) => {
    const note = prePickedNote ?? getNextNote(lastNoteId.current);
    lastNoteId.current = note.id;
    pendingNote.current = null;
    setCurrentNote(note);
    setFeedback(null);
    setNoteSerial(n => n + 1);
    locked.current = false;
    noteStartTime.current = Date.now(); // start reaction-time clock
    if (!audioAlreadyPlayed && onNoteShown) onNoteShown(note);
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

    const reactionMs = noteStartTime.current ? Date.now() - noteStartTime.current : null;
    // If the user's attention wandered (RT too long), discard the RT so it
    // doesn't pollute stats. SR score still records — the answer still counts.
    const isWander = reactionMs !== null && reactionMs > WANDER_MS;

    // Record in SR engine (always); only record RT when attention was present
    if (reactionMs && !isWander) recordRT(currentNote.id, reactionMs, correct);
    // Score credit requires the answer to be both correct and inside FLUENT_MS
    const { leveledUp, newLevel, fluent } = recordAnswer(currentNote.id, correct, reactionMs);
    setProgress(getProgress());

    setFeedback({ correct, fluent, noteLetter: answerLetter, noteId: answer, reactionMs, isWander });

    // Show level-up toast
    if (leveledUp) {
      setLevelUpMsg(`Level ${newLevel} unlocked!`);
      setTimeout(() => setLevelUpMsg(null), LEVELUP_MS);
    }

    // Pre-pick the next note now so both audio and visual use the same note
    const next = getNextNote(currentNote.id);
    pendingNote.current = next;

    // Play next note audio AUDIO_LEAD ms before the visual transition
    setTimeout(() => {
      if (onNoteShown) onNoteShown(next);
    }, FEEDBACK_MS - AUDIO_LEAD);

    // Show next note visually at FEEDBACK_MS (audio already played via lead timer)
    setTimeout(() => showNextNote(next, true), FEEDBACK_MS);
  }, [currentNote, showNextNote, onNoteShown, onWrongAnswer]);

  const resetSession = useCallback(() => {
    reset();
    lastNoteId.current = null;
    locked.current = false;
    setFeedback(null);
    setLevelUpMsg(null);
    setProgress(getProgress());
    setTimeout(showNextNote, 50); // brief delay for state to settle
  }, [showNextNote]);

  return {
    currentNote,
    noteSerial,
    feedback,
    progress,
    levelUpMsg,
    fluentMs: FLUENT_MS,
    submitAnswer,
    resetSession,
  };
}

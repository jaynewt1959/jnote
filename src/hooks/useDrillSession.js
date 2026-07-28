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
 *     feedback,          // { correct, noteLetter, noteId } | null
 *     progress,          // { currentLevel, poolSize, comfortableCount, isComplete }
 *     levelUpMsg,        // string | null  ("Level 3 unlocked!")
 *     submitAnswer(letter | noteId),  // call with user's answer
 *     resetSession,
 *   }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getNextNote, recordAnswer, getProgress, reset, recordRT } from '../modules/spacedRepetition.js';

const FEEDBACK_MS  = 730;   // how long to show correct/wrong before advancing
const AUDIO_LEAD   = 200;   // play next note audio this many ms before the visual
const LEVELUP_MS   = 1800;  // how long to show "Level X unlocked!" toast

export function useDrillSession({ onNoteShown } = {}) {
  const [currentNote, setCurrentNote]   = useState(null);
  const [feedback,    setFeedback]      = useState(null);  // {correct, noteLetter, noteId}
  const [progress,    setProgress]      = useState(() => getProgress());
  const [levelUpMsg,  setLevelUpMsg]    = useState(null);

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
    const reactionMs = noteStartTime.current ? Date.now() - noteStartTime.current : null;

    setFeedback({ correct, noteLetter: answerLetter, noteId: answer, reactionMs });

    // Record in SR engine
    if (reactionMs) recordRT(currentNote.id, reactionMs, correct);
    const { leveledUp, newLevel } = recordAnswer(currentNote.id, correct);
    setProgress(getProgress());

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
  }, [currentNote, showNextNote, onNoteShown]);

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
    feedback,
    progress,
    levelUpMsg,
    submitAnswer,
    resetSession,
  };
}

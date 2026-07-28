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
import { getNextNote, recordAnswer, getProgress, reset } from '../modules/spacedRepetition.js';

const FEEDBACK_MS  = 1400;  // how long to show correct/wrong before advancing
const LEVELUP_MS   = 1800;  // how long to show "Level X unlocked!" toast

export function useDrillSession({ onNoteShown } = {}) {
  const [currentNote, setCurrentNote]   = useState(null);
  const [feedback,    setFeedback]      = useState(null);  // {correct, noteLetter, noteId}
  const [progress,    setProgress]      = useState(() => getProgress());
  const [levelUpMsg,  setLevelUpMsg]    = useState(null);

  // Track the last shown noteId to avoid immediate repeats
  const lastNoteId = useRef(null);
  // Guard: don't accept new answers while showing feedback
  const locked = useRef(false);

  // Show the next note (called after feedback clears)
  const showNextNote = useCallback(() => {
    const note = getNextNote(lastNoteId.current);
    lastNoteId.current = note.id;
    setCurrentNote(note);
    setFeedback(null);
    locked.current = false;
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
      ? answer.toUpperCase()                     // already a letter
      : answer.replace(/[^A-G]/g, '')[0]?.toUpperCase() ?? ''; // extract from noteId

    const correct = answerLetter === currentNote.name;

    setFeedback({ correct, noteLetter: answerLetter, noteId: answer });

    // Record in SR engine
    const { leveledUp, newLevel } = recordAnswer(currentNote.id, correct);
    setProgress(getProgress());

    // Show level-up toast
    if (leveledUp) {
      setLevelUpMsg(`Level ${newLevel} unlocked!`);
      setTimeout(() => setLevelUpMsg(null), LEVELUP_MS);
    }

    // Advance to next note after feedback delay
    setTimeout(showNextNote, FEEDBACK_MS);
  }, [currentNote, showNextNote]);

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

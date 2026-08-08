/**
 * useAudio.js
 *
 * Thin wrapper around the Web Audio API engine.
 * All calls are synchronous — no async/await.
 *
 * Whether sound is on lives with the caller, not here: there is more than one
 * way to have it on (a note can sound as it appears or only after the answer),
 * and that choice changes what the drill is testing rather than just its
 * volume. This hook only needs to know enabled or not.
 *
 * @param {boolean} enabled
 */

import { useCallback, useEffect, useRef } from 'react';
import { touchAudio, playNote, playError } from '../modules/audioEngine.js';

export function useAudio(enabled = true) {
  // Held in a ref so the returned callbacks stay referentially stable. They
  // feed useDrillSession's own callbacks, and changing identity there would
  // rebuild the drill loop's handlers on every toggle.
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  /**
   * Call SYNCHRONOUSLY inside any click/keydown handler.
   * Resumes AudioContext within the user gesture (Safari requirement).
   */
  const initFromGesture = useCallback(() => {
    if (enabledRef.current) touchAudio();
  }, []);

  /**
   * Play a note. Safe to call from setTimeout once context is running.
   */
  const play = useCallback((noteId) => {
    if (!enabledRef.current || !noteId) return;
    playNote(noteId);
  }, []);

  /**
   * Buzz for a wrong answer. Called from within the answer gesture, so the
   * context is already unlocked by initFromGesture().
   */
  const playWrong = useCallback(() => {
    if (!enabledRef.current) return;
    playError();
  }, []);

  return { play, playWrong, initFromGesture };
}

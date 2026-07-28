/**
 * useAudio.js
 *
 * Thin wrapper around the Web Audio API engine.
 * All calls are synchronous — no async/await.
 */

import { useState, useCallback } from 'react';
import { touchAudio, playNote } from '../modules/audioEngine.js';

export function useAudio() {
  const [audioEnabled, setAudioEnabled] = useState(true);

  /**
   * Call SYNCHRONOUSLY inside any click/keydown handler.
   * Resumes AudioContext within the user gesture (Safari requirement).
   */
  const initFromGesture = useCallback(() => {
    if (audioEnabled) touchAudio();
  }, [audioEnabled]);

  /**
   * Play a note. Safe to call from setTimeout once context is running.
   */
  const play = useCallback((noteId) => {
    if (!audioEnabled || !noteId) return;
    playNote(noteId);
  }, [audioEnabled]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);

  return { audioEnabled, toggleAudio, play, initFromGesture };
}

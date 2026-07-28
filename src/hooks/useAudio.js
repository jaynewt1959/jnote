/**
 * useAudio.js
 *
 * Hook that wraps the audio engine, managing enabled state and lazy init.
 * The first call to play() after the user enables audio triggers loading.
 *
 * Returns:
 *   { audioEnabled, toggleAudio, play(toneNote) }
 */

import { useState, useCallback } from 'react';
import { touchAudio, playNote } from '../modules/audioEngine.js';

export function useAudio() {
  const [audioEnabled, setAudioEnabled] = useState(true);

  /**
   * Call from any user-gesture handler to unlock Safari audio.
   * Must be called synchronously (no await) inside onClick/onMouseDown.
   */
  const initFromGesture = useCallback(() => {
    if (audioEnabled) touchAudio();
  }, [audioEnabled]);

  /**
   * Play a note. Call this after (or alongside) initFromGesture.
   * Works from setTimeout once context is unlocked.
   */
  const play = useCallback((toneNote) => {
    if (!audioEnabled || !toneNote) return;
    playNote(toneNote);
  }, [audioEnabled]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);

  return { audioEnabled, toggleAudio, play, initFromGesture };
}

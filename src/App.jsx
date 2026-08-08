/**
 * App.jsx - jnote Grand Staff Note Trainer
 */

import { useState, useCallback, useEffect, useRef } from "react";
import GrandStaffDisplay from "./components/GrandStaffDisplay.jsx";
import PianoKeyboard     from "./components/PianoKeyboard.jsx";
import NoteButtons       from "./components/NoteButtons.jsx";
import FeedbackBanner    from "./components/FeedbackBanner.jsx";
import LevelProgress     from "./components/LevelProgress.jsx";
import CountdownBar      from "./components/CountdownBar.jsx";
import { useDrillSession } from "./hooks/useDrillSession.js";
import { useAudio }        from "./hooks/useAudio.js";
import HintLabel           from "./components/HintLabel.jsx";
import StatsBar            from "./components/StatsBar.jsx";
import { getStats }        from "./modules/spacedRepetition.js";
import { isAudioReady }    from "./modules/audioEngine.js";

// How long the first-gesture unlock waits before sounding the note already on
// screen. Only a gesture that turns out not to be an answer gets the replay.
const UNLOCK_REPLAY_MS = 300;

/**
 * How long after a wrong answer the correct pitch sounds. The error buzz runs
 * 360 ms, so this clears it, and the next note is not revealed for far longer
 * — the two never overlap.
 */
const WRONG_PITCH_MS = 400;

/**
 * When notes sound.
 *
 *   answer — after the answer, as reinforcement (default)
 *   note   — as the note appears, for ear-plus-eye association
 *   off    — silent
 *
 * `answer` is the default because the drill only ever asks for the letter, so
 * a pitch played before the answer hands it over: anyone with even rough pitch
 * recognition can score without reading the staff at all, and the reading
 * skill silently stops being trained. Sounding it afterwards keeps the
 * association without letting it stand in for the answer. `note` is kept for
 * deliberate ear training.
 */
const SOUND_MODES = ['answer', 'note', 'off'];
const SOUND_LABELS = {
  answer: 'Sound: on answer',
  note:   'Sound: on note',
  off:    'Sound: off',
};

export default function App() {
  const [showHint,  setShowHint]  = useState(true);
  const [soundMode, setSoundMode] = useState('answer');
  const { play, playWrong, initFromGesture } = useAudio(soundMode !== 'off');

  // onNoteShown is called from setTimeout — audio works here once context is unlocked
  const handleNoteShown = useCallback((note) => {
    if (soundMode === 'note') play(note.toneNote);
  }, [soundMode, play]);

  // Error buzz on a wrong answer (fires inside the answer gesture)
  const handleWrongAnswer = useCallback(() => {
    playWrong();
  }, [playWrong]);

  // The note sounds after the answer in `answer` mode. On a wrong answer it
  // follows the buzz, which makes it a correction: this is what the note you
  // just misread sounds like.
  const handleAnswerSound = useCallback((note, correct) => {
    if (soundMode !== 'answer') return;
    if (correct) play(note.toneNote);
    else setTimeout(() => play(note.toneNote), WRONG_PITCH_MS);
  }, [soundMode, play]);

  const {
    currentNote,
    noteSerial,
    feedback,
    progress,
    levelUpMsg,
    budgetMs,
    budgetExpired,
    submitAnswer,
    resetSession,
  } = useDrillSession({
    onNoteShown:   handleNoteShown,
    onWrongAnswer: handleWrongAnswer,
    onAnswer:      handleAnswerSound,
  });

  // Hints are earned by the clock, not chosen. They stay hidden until the
  // note's budget lapses, so every note is attempted cold, but a note that
  // did not come automatically is scaffolded rather than left to a guess.
  const hintVisible = showHint && budgetExpired && !feedback;

  // Wrap submitAnswer: call initFromGesture SYNCHRONOUSLY first (Safari audio unlock)
  const handleAnswer = useCallback((answer) => {
    initFromGesture(); // synchronous — must be before any async/await
    submitAnswer(answer);
  }, [initFromGesture, submitAnswer]);

  // ── First-gesture audio unlock ────────────────────────────────────
  // Every browser keeps the AudioContext locked until the user interacts, and
  // the first note is drawn on page load — before any interaction exists. Its
  // audio is therefore always lost. Unlock on the first gesture anywhere and
  // sound whatever note is on screen, so the drill never opens in silence.
  //
  // Only relevant in `note` mode. In `answer` mode nothing is supposed to
  // sound before an answer, and replaying the on-screen note here would hand
  // over the very first answer; the answer gesture unlocks the context itself.
  const liveNote = useRef(null);
  const liveFeedback = useRef(null);
  const liveSerial = useRef(0);
  useEffect(() => { liveNote.current = currentNote; }, [currentNote]);
  useEffect(() => { liveFeedback.current = feedback; }, [feedback]);
  useEffect(() => { liveSerial.current = noteSerial; }, [noteSerial]);

  useEffect(() => {
    if (soundMode !== 'note' || isAudioReady()) return;

    let replayTimer = null;

    function unlock() {
      initFromGesture(); // synchronous — must happen inside the gesture
      teardown();

      // The unlocking gesture is often an answer, which brings its own note
      // FEEDBACK_MS later — replaying on top of that is the double note. The
      // decision has to be deferred, because a pointerdown fires well before
      // the click it belongs to is dispatched as an answer. UNLOCK_REPLAY_MS
      // is long enough for that dispatch and React's commit to land.
      const serialAtUnlock = liveSerial.current;
      replayTimer = setTimeout(() => {
        const answered = liveFeedback.current !== null ||
                         liveSerial.current !== serialAtUnlock;
        if (!answered && liveNote.current) play(liveNote.current.toneNote);
      }, UNLOCK_REPLAY_MS);
    }
    function teardown() {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }

    // Capture phase: unlock before React's own handlers run.
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      teardown();
      if (replayTimer) clearTimeout(replayTimer);
    };
  }, [initFromGesture, play, soundMode]);

  // Keyboard shortcuts: A–G submit that letter as the answer
  useEffect(() => {
    const NOTE_KEYS = new Set(['a','b','c','d','e','f','g']);
    function onKeyDown(e) {
      // Ignore if focus is on an interactive element (input, button, etc.)
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const key = e.key.toLowerCase();
      if (NOTE_KEYS.has(key)) {
        e.preventDefault();
        handleAnswer(key.toUpperCase());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAnswer]);

  // Re-read stats after every answer (progress triggers re-render on each answer)
  const stats = getStats();

  // Always highlight the correct note's key (works for letter-button and keyboard answers).
  // Keyed on `pitch`, not `id`: cross-staff items have ids like "C4@bass",
  // which match no piano key.
  const kbFeedback  = feedback ? { noteId: currentNote?.pitch, correct: feedback.correct } : null;
  const btnFeedback = feedback ? { noteLetter: feedback.noteLetter, correct: feedback.correct } : null;

  function handleReset() {
    if (window.confirm("Reset all progress and start from Level 1?")) {
      resetSession();
    }
  }

  function cycleSound() {
    // Unlock inside the gesture, so the mode just chosen can sound immediately.
    initFromGesture();
    setSoundMode(m => SOUND_MODES[(SOUND_MODES.indexOf(m) + 1) % SOUND_MODES.length]);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>jnote</h1>
        <p>Grand Staff Note Trainer</p>
      </header>

      <section className="staff-section">
        <GrandStaffDisplay noteId={currentNote?.id} showLedgerCue={hintVisible} />
      </section>

      <CountdownBar
        noteId={currentNote?.id}
        serial={noteSerial}
        durationMs={budgetMs}
        active={!feedback && !!currentNote}
      />

      <HintLabel note={currentNote} showHint={hintVisible} />

      <section className="feedback-section">
        <FeedbackBanner feedback={feedback} correctNote={currentNote} />
      </section>

      <section className="progress-section">
        <LevelProgress progress={progress} />
        <StatsBar stats={stats} />
      </section>

      <section className="keyboard-section">
        <PianoKeyboard
          onNoteClick={handleAnswer}
          feedback={kbFeedback}
          activePitch={currentNote?.pitch}
        />
      </section>

      <section className="buttons-section">
        <NoteButtons onNoteClick={handleAnswer} feedback={btnFeedback} />
        <p className="kbd-hint">or press A – G on your keyboard</p>
      </section>

      <section className="controls-section">
        <button
          className={"ctrl-btn " + (soundMode !== 'off' ? "active" : "")}
          onClick={cycleSound}
        >
          {SOUND_LABELS[soundMode]}
        </button>
        <button className={"ctrl-btn " + (showHint ? "active" : "")} onClick={() => setShowHint(h => !h)}>
          {showHint ? "Hints on" : "Hints off"}
        </button>
        <button className="ctrl-btn danger" onClick={handleReset}>Reset</button>
      </section>

      {levelUpMsg && <div className="levelup-toast">{levelUpMsg}</div>}
    </div>
  );
}

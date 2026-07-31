/**
 * App.jsx - jnote Grand Staff Note Trainer
 */

import { useState, useCallback, useEffect } from "react";
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

export default function App() {
  const [showHint, setShowHint] = useState(true);
  const { audioEnabled, toggleAudio, play, playWrong, initFromGesture } = useAudio();

  // onNoteShown is called from setTimeout — audio works here once context is unlocked
  const handleNoteShown = useCallback((note) => {
    play(note.toneNote);
  }, [play]);

  // Error buzz on a wrong answer (fires inside the answer gesture)
  const handleWrongAnswer = useCallback(() => {
    playWrong();
  }, [playWrong]);

  const {
    currentNote,
    noteSerial,
    feedback,
    progress,
    levelUpMsg,
    fluentMs,
    submitAnswer,
    resetSession,
  } = useDrillSession({
    onNoteShown:   handleNoteShown,
    onWrongAnswer: handleWrongAnswer,
  });

  // Wrap submitAnswer: call initFromGesture SYNCHRONOUSLY first (Safari audio unlock)
  const handleAnswer = useCallback((answer) => {
    initFromGesture(); // synchronous — must be before any async/await
    submitAnswer(answer);
  }, [initFromGesture, submitAnswer]);

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>jnote</h1>
        <p>Grand Staff Note Trainer</p>
      </header>

      <section className="staff-section">
        <GrandStaffDisplay noteId={currentNote?.id} showLedgerCue={showHint} />
      </section>

      <CountdownBar
        noteId={currentNote?.id}
        serial={noteSerial}
        durationMs={fluentMs}
        active={!feedback && !!currentNote}
      />

      <HintLabel note={currentNote} showHint={showHint} />

      <section className="feedback-section">
        <FeedbackBanner feedback={feedback} correctNote={currentNote} />
      </section>

      <section className="progress-section">
        <LevelProgress progress={progress} fluentMs={fluentMs} />
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
        <button className={"ctrl-btn " + (audioEnabled ? "active" : "")} onClick={toggleAudio}>
          {audioEnabled ? "Audio on" : "Audio off"}
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

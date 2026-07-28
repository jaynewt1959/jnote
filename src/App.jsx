/**
 * App.jsx - jnote Grand Staff Note Trainer
 */

import { useState, useCallback } from "react";
import GrandStaffDisplay from "./components/GrandStaffDisplay.jsx";
import PianoKeyboard     from "./components/PianoKeyboard.jsx";
import NoteButtons       from "./components/NoteButtons.jsx";
import FeedbackBanner    from "./components/FeedbackBanner.jsx";
import LevelProgress     from "./components/LevelProgress.jsx";
import { useDrillSession } from "./hooks/useDrillSession.js";
import { useAudio }        from "./hooks/useAudio.js";

export default function App() {
  const [showHint, setShowHint] = useState(false);
  const { audioEnabled, toggleAudio, play, initFromGesture } = useAudio();

  // onNoteShown is called from setTimeout — audio works here once context is unlocked
  const handleNoteShown = useCallback((note) => {
    play(note.toneNote);
  }, [play]);

  const {
    currentNote,
    feedback,
    progress,
    levelUpMsg,
    submitAnswer,
    resetSession,
  } = useDrillSession({ onNoteShown: handleNoteShown });

  // Wrap submitAnswer: call initFromGesture SYNCHRONOUSLY first (Safari audio unlock)
  const handleAnswer = useCallback((answer) => {
    initFromGesture(); // synchronous — must be before any async/await
    submitAnswer(answer);
  }, [initFromGesture, submitAnswer]);

  const kbFeedback  = feedback ? { noteId: feedback.noteId, correct: feedback.correct } : null;
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
        <GrandStaffDisplay noteId={currentNote?.id} showHint={showHint} />
      </section>

      <section className="feedback-section">
        <FeedbackBanner feedback={feedback} correctNote={currentNote} />
      </section>

      <section className="progress-section">
        <LevelProgress progress={progress} />
      </section>

      <section className="keyboard-section">
        <PianoKeyboard
          onNoteClick={handleAnswer}
          feedback={kbFeedback}
          activeNoteId={currentNote?.id}
        />
      </section>

      <section className="buttons-section">
        <NoteButtons onNoteClick={handleAnswer} feedback={btnFeedback} />
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

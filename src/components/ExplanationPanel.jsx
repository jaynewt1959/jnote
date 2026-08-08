/**
 * ExplanationPanel.jsx
 *
 * Replaces HintLabel. Shown only after a wrong answer (never pre-emptively),
 * and only while `visible` — see App.jsx / useDrillSession's
 * `awaitingDismissal`. Advancing to the next note is manual: the drill loop
 * does not auto-advance while this panel is up, so `onDismiss` must be
 * called (Continue button, click, or Enter/Space) to move on.
 */

import { useEffect } from 'react';
import { explanationText } from '../modules/explanation.js';
import ExplanationDiagram from './ExplanationDiagram.jsx';

export default function ExplanationPanel({ explanation, visible, onDismiss, onPlayNote }) {
  // Enter/Space dismiss from anywhere while the panel is up — the Continue
  // button need not be focused. preventDefault also suppresses the browser's
  // native activation of whatever element happens to hold focus (including
  // the Continue button), so the panel is never dismissed twice by one press.
  useEffect(() => {
    if (!visible) return undefined;
    function onKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onDismiss();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, onDismiss]);

  if (!visible || !explanation) return null;

  return (
    <div
      className="explanation-panel"
      role="button"
      tabIndex={0}
      onClick={onDismiss}
    >
      <p className="explanation-panel__text">{explanationText(explanation)}</p>
      <ExplanationDiagram explanation={explanation} onPlayNote={onPlayNote} />
      <button
        type="button"
        className="ctrl-btn explanation-panel__continue"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      >
        Continue →
      </button>
    </div>
  );
}

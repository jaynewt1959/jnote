/**
 * ExplanationPanel.jsx
 *
 * Replaces HintLabel. Shown only after a wrong answer (never pre-emptively),
 * and only while `visible` — see App.jsx / useDrillSession's
 * `awaitingDismissal`. Advancing to the next note is manual: the drill loop
 * does not auto-advance while this panel is up, so `onDismiss` must be
 * called (Continue button, click, or Enter/Space) to move on.
 */

import { explanationText } from '../modules/explanation.js';
import ExplanationDiagram from './ExplanationDiagram.jsx';

export default function ExplanationPanel({ explanation, visible, onDismiss, onPlayNote }) {
  if (!visible || !explanation) return null;

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDismiss();
    }
  }

  return (
    <div
      className="explanation-panel"
      role="button"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
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

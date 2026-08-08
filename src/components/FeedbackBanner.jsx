/**
 * FeedbackBanner.jsx
 *
 * Three states:
 *   green  ✓ C                   — correct inside the note's budget (scored)
 *   amber  ✓ C · 3.9s · over 3.0s — correct but over the budget (no credit)
 *   red    ✗ — that was G
 * When feedback is null, renders a fixed-height placeholder so layout doesn't jump.
 */

export default function FeedbackBanner({ feedback, correctNote }) {
  if (!feedback) {
    return <div style={{ height: 44 }} />;
  }

  const { correct, fluent, noteLetter, reactionMs, isWander, budgetMs } = feedback;
  const rtLabel = isWander ? '—' : reactionMs ? `${(reactionMs / 1000).toFixed(1)}s` : '';

  // Correct but over the budget: distinct amber so a stalled score is never
  // mistaken for progress.
  const slow = correct && !fluent;
  const palette = slow
    ? { background: '#fef3c7', color: '#b45309' }
    : correct
      ? { background: '#dcfce7', color: '#15803d' }
      : { background: '#fee2e2', color: '#b91c1c' };

  // Name the budget that was actually missed. It varies per note now, so
  // "too slow" on its own leaves the target invisible.
  const slowLabel = slow
    ? budgetMs ? `over ${(budgetMs / 1000).toFixed(1)}s — no credit` : 'too slow — no credit'
    : '';

  const detail = [rtLabel, slowLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      style={{
        height:        44,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        gap:           6,
        borderRadius:  8,
        ...palette,
        padding:       '0 20px',
        transition:    'all 0.15s',
        userSelect:    'none',
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700 }}>
        {correct ? `✓ ${noteLetter}` : `✗ — that was ${correctNote?.name ?? ''}`}
      </span>
      <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.75 }}>
        {detail && `· ${detail}`}
      </span>
    </div>
  );
}

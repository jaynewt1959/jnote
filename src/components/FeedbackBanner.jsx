/**
 * FeedbackBanner.jsx
 *
 * Shows "✓ C" in green or "✗ — that was G" in red.
 * When feedback is null, renders a fixed-height placeholder so layout doesn't jump.
 */

export default function FeedbackBanner({ feedback, correctNote }) {
  if (!feedback) {
    return <div style={{ height: 44 }} />;
  }

  const { correct, noteLetter, reactionMs, isWander } = feedback;
  const rtLabel = isWander ? ' · —' : reactionMs ? ` · ${(reactionMs / 1000).toFixed(1)}s` : '';

  return (
    <div
      style={{
        height:        44,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        gap:           6,
        borderRadius:  8,
        background:    correct ? '#dcfce7' : '#fee2e2',
        color:         correct ? '#15803d' : '#b91c1c',
        padding:       '0 20px',
        transition:    'all 0.15s',
        userSelect:    'none',
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700 }}>
        {correct ? `✓ ${noteLetter}` : `✗ — that was ${correctNote?.name ?? ''}`}
      </span>
      <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.75 }}>
        {rtLabel}
      </span>
    </div>
  );
}

/**
 * LevelProgress.jsx
 *
 * Shows: "Level 3 · 7 / 9 fluent (≤3.0s)" with a filled progress bar.
 * "Fluent" means the note has been identified correctly and inside the time
 * limit enough times to count toward unlocking the next level.
 */

import { MAX_LEVEL } from '../modules/noteData.js';

export default function LevelProgress({ progress, fluentMs }) {
  if (!progress) return null;
  const { currentLevel, poolSize, fluentCount, isComplete } = progress;
  const pct = poolSize > 0 ? (fluentCount / poolSize) * 100 : 0;
  const limitLabel = fluentMs ? ` (≤${(fluentMs / 1000).toFixed(1)}s)` : '';

  return (
    <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   6,
        fontSize:       13,
        color:          '#475569',
        fontWeight:     500,
      }}>
        <span>
          {isComplete
            ? '🎉 All levels complete!'
            : `Level ${currentLevel} of ${MAX_LEVEL}`}
        </span>
        <span>{fluentCount} / {poolSize} fluent{limitLabel}</span>
      </div>

      {/* Progress bar */}
      <div style={{
        height:        8,
        background:    '#e2e8f0',
        borderRadius:  4,
        overflow:      'hidden',
      }}>
        <div style={{
          height:        '100%',
          width:         `${pct}%`,
          background:    isComplete ? '#22c55e' : '#2563eb',
          borderRadius:  4,
          transition:    'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

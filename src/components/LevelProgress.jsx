/**
 * LevelProgress.jsx
 *
 * Shows: "Level 13 · new 2 / 4 · pool 38 / 39" with a filled progress bar.
 * "Fluent" means the note has been identified correctly and inside its budget
 * enough times to count toward unlocking the next level.
 *
 * Both halves of the advancement rule are shown, because a single "27 / 43"
 * hides which one is actually holding the level: the level's own new notes
 * must all be fluent, while the accumulated pool only has to be mostly
 * fluent. The bar tracks the new notes — that is the part being worked on and
 * the part that moves.
 */

import { MAX_LEVEL } from '../modules/noteData.js';

export default function LevelProgress({ progress }) {
  if (!progress) return null;
  const {
    currentLevel, fluentCount,
    newPoolSize, newFluentCount, poolTarget, isComplete,
  } = progress;

  const pct = newPoolSize > 0 ? (newFluentCount / newPoolSize) * 100 : 100;
  const poolMet = fluentCount >= poolTarget;

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
        {!isComplete && (
          <span>
            new {newFluentCount}/{newPoolSize}
            {' · '}
            <span style={{ color: poolMet ? '#15803d' : '#475569' }}>
              pool {fluentCount}/{poolTarget}
            </span>
          </span>
        )}
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

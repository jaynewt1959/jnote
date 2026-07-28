/**
 * StatsBar.jsx
 *
 * Shows reaction-time statistics once enough data has been collected.
 * Hidden until 5 correct answers are recorded; updates after every answer.
 *
 * Layout: "Avg 2.1s · ↓ 0.3s faster" (or "↑ slower" or "→ same")
 *
 * Props:
 *   stats — return value of getStats() from spacedRepetition.js, or null
 */

export default function StatsBar({ stats }) {
  if (!stats || stats.count < 5) {
    // Reserve space so layout doesn't jump when stats appear
    return <div style={{ height: 22 }} />;
  }

  const avgSec = (stats.avgMs / 1000).toFixed(1);

  let trendEl = null;
  if (stats.improvementMs !== null) {
    const absSec  = Math.abs(stats.improvementMs / 1000).toFixed(1);
    const faster  = stats.improvementMs > 50;   // >50 ms = meaningfully faster
    const slower  = stats.improvementMs < -50;
    if (faster) {
      trendEl = <span style={{ color: '#15803d' }}>↓ {absSec}s faster</span>;
    } else if (slower) {
      trendEl = <span style={{ color: '#b91c1c' }}>↑ {absSec}s slower</span>;
    } else {
      trendEl = <span style={{ color: '#64748b' }}>→ same pace</span>;
    }
  }

  return (
    <div style={{
      height:         22,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            10,
      fontSize:       12,
      color:          '#64748b',
    }}>
      <span>⏱ Avg {avgSec}s</span>
      {trendEl && <>·</>}
      {trendEl}
      <span style={{ opacity: 0.5 }}>({stats.count} correct)</span>
    </div>
  );
}

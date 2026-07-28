/**
 * NoteButtons.jsx
 *
 * Seven letter buttons (A–G) as a fast-tap alternative to the keyboard.
 * Flash green/red when feedback is received.
 *
 * Props:
 *   onNoteClick(letter)  — called with 'A'–'G'
 *   feedback             — { noteLetter, correct } | null
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export default function NoteButtons({ onNoteClick, feedback }) {
  function getBg(letter) {
    if (!feedback) return '#f1f5f9';
    if (feedback.noteLetter === letter) {
      return feedback.correct ? '#22c55e' : '#ef4444';
    }
    return '#f1f5f9';
  }

  function getColor(letter) {
    if (!feedback) return '#1e293b';
    if (feedback.noteLetter === letter) return '#fff';
    return '#1e293b';
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {LETTERS.map(letter => (
        <button
          key={letter}
          onClick={() => onNoteClick(letter)}
          style={{
            width:        52,
            height:       52,
            fontSize:     22,
            fontWeight:   700,
            fontFamily:   'system-ui, sans-serif',
            background:   getBg(letter),
            color:        getColor(letter),
            border:       '2px solid #cbd5e1',
            borderRadius: 8,
            cursor:       'pointer',
            transition:   'background 0.15s, color 0.15s',
            userSelect:   'none',
          }}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}

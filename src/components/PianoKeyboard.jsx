/**
 * PianoKeyboard.jsx
 *
 * Interactive virtual piano keyboard.
 * Renders white and black keys from C2 to C6 (4 octaves + 1 note).
 * Clicking a key calls onNoteClick(noteId) with e.g. "C4", "G4".
 *
 * Props:
 *   onNoteClick(noteId)  — called with the selected note id (e.g. "C4")
 *   feedback             — { noteId, correct } | null  (flashes key on answer)
 *   activeNoteId         — the current quiz note (highlights its octave band)
 *   lowestOctave         — first octave to show (default 3, expands to 2 for bass)
 */

// White keys that have a black key after them (all except E and B)
const HAS_SHARP = new Set(['C', 'D', 'F', 'G', 'A']);

// Key dimensions: 35 white keys (A1–G6) × 22px = 770px → fits in 820px shell.
const WHITE_W = 22;
const WHITE_H = 90;
const BLACK_W = 13;
const BLACK_H = 57;

// Build the full ordered list of white keys from A1 to G6
function buildWhiteKeyList() {
  const keys = [];
  // Partial octave 1: A1, B1
  for (const name of ['A', 'B']) keys.push({ name, octave: 1 });
  // Full octaves 2–5
  for (const octave of [2, 3, 4, 5])
    for (const name of ['C','D','E','F','G','A','B'])
      keys.push({ name, octave });
  // Partial octave 6: C6–G6
  for (const name of ['C','D','E','F','G']) keys.push({ name, octave: 6 });
  return keys;
}

export default function PianoKeyboard({ onNoteClick, feedback, activeNoteId }) {
  const keyList    = buildWhiteKeyList();           // 35 white keys
  const totalWidth = keyList.length * WHITE_W;

  const whiteKeys = keyList.map((k, i) => ({
    ...k,
    noteId: `${k.name}${k.octave}`,
    x: i * WHITE_W,
  }));

  const blackKeys = [];
  whiteKeys.forEach((wk, i) => {
    if (!HAS_SHARP.has(wk.name)) return;
    blackKeys.push({
      noteId: `${wk.name}#${wk.octave}`,
      name:   `${wk.name}#`,
      octave: wk.octave,
      x:      i * WHITE_W + WHITE_W - BLACK_W / 2,
    });
  });

  // Determine which octave the active note is in (for subtle highlight)
  const activeOctave = activeNoteId ? parseInt(activeNoteId.replace(/[^0-9]/g, '')) : null;

  function keyColor(noteId, isBlack) {
    if (!feedback) return null; // no override

    if (feedback.noteId === noteId) {
      return feedback.correct ? '#22c55e' : '#ef4444'; // green : red
    }
    return null;
  }

  function whiteKeyStyle(wk) {
    const override = keyColor(wk.noteId, false);
    const isActiveOct = wk.octave === activeOctave;
    return {
      position: 'absolute',
      left:     wk.x,
      top:      0,
      width:    WHITE_W - 1,
      height:   WHITE_H,
      background: override ?? (isActiveOct ? '#f0f4ff' : '#fff'),
      border:   '1px solid #bbb',
      borderTop: '1px solid #bbb',
      borderRadius: '0 0 4px 4px',
      cursor:   'pointer',
      boxSizing: 'border-box',
      display:  'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: 4,
      fontSize: 10,
      color: '#888',
      userSelect: 'none',
      transition: 'background 0.15s',
      zIndex: 1,
    };
  }

  function blackKeyStyle(bk) {
    const override = keyColor(bk.noteId, true);
    return {
      position: 'absolute',
      left:     bk.x,
      top:      0,
      width:    BLACK_W,
      height:   BLACK_H,
      background: override ?? '#222',
      border:   '1px solid #111',
      borderRadius: '0 0 3px 3px',
      cursor:   'pointer',
      boxSizing: 'border-box',
      userSelect: 'none',
      transition: 'background 0.15s',
      zIndex: 2,
    };
  }

  // Label C notes with octave number
  function whiteLabel(wk) {
    if (wk.name === 'C') return `C${wk.octave}`;
    return '';
  }

  return (
    <div style={{ width: '100%', paddingBottom: 4 }}>
      <div
        style={{
          position: 'relative',
          width:    totalWidth,
          height:   WHITE_H,
          margin:   '0 auto',
        }}
      >
        {/* White keys */}
        {whiteKeys.map(wk => (
          <div
            key={wk.noteId}
            data-note={wk.noteId}
            style={whiteKeyStyle(wk)}
            onMouseDown={() => onNoteClick(wk.noteId)}
          >
            <span>{whiteLabel(wk)}</span>
          </div>
        ))}

        {/* Black keys — rendered on top */}
        {blackKeys.map(bk => (
          <div
            key={bk.noteId}
            data-note={bk.noteId}
            style={blackKeyStyle(bk)}
            onMouseDown={e => { e.stopPropagation(); onNoteClick(bk.noteId); }}
          />
        ))}
      </div>
    </div>
  );
}

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

import { useEffect, useRef } from 'react';

// Piano layout within one octave (12 semitones)
//   C  C# D  D# E  F  F# G  G# A  A# B
const NOTE_NAMES  = ['C','D','E','F','G','A','B'];

// White key dimensions
const WHITE_W = 36;
const WHITE_H = 120;
const BLACK_W = 22;
const BLACK_H = 76;

// Positions of black keys relative to their octave's left edge (white key widths)
// Within one octave: C=0, D=1, E=2, F=3, G=4, A=5, B=6 (white index)
// Black key between C-D is at white_index 0 + offset
const BLACK_OFFSETS = {
  'C#': 0,   // after C
  'D#': 1,   // after D
  'F#': 3,   // after F
  'G#': 4,   // after G
  'A#': 5,   // after A
};

// Which octaves to show for white keys
const OCTAVE_RANGE = [2, 3, 4, 5]; // C2 through B5, plus C6

export default function PianoKeyboard({ onNoteClick, feedback, activeNoteId }) {
  // Total white keys: 7 per octave × 4 octaves + 1 (final C6)
  const totalWhiteKeys = 7 * 4 + 1;
  const totalWidth = totalWhiteKeys * WHITE_W;

  // Build key layout data
  const whiteKeys = [];
  const blackKeys = [];

  let whiteIndex = 0;
  for (const octave of OCTAVE_RANGE) {
    for (const name of NOTE_NAMES) {
      const noteId = `${name}${octave}`;
      whiteKeys.push({ noteId, name, octave, x: whiteIndex * WHITE_W });
      // Check if there's a black key after this white key
      const blackName = Object.keys(BLACK_OFFSETS).find(bn =>
        bn[0] === name && BLACK_OFFSETS[bn] === NOTE_NAMES.indexOf(name)
      );
      if (blackName) {
        // Black key x: right of this white key minus half of black key width
        const bx = whiteIndex * WHITE_W + WHITE_W - BLACK_W / 2;
        const bNoteId = `${blackName[0]}#${octave}`;
        blackKeys.push({ noteId: bNoteId, name: blackName, octave, x: bx });
      }
      whiteIndex++;
    }
  }
  // Add final C6
  const c6Id = 'C6';
  whiteKeys.push({ noteId: c6Id, name: 'C', octave: 6, x: whiteIndex * WHITE_W });

  // Determine which octave the active note is in (for subtle highlight)
  const activeOctave = activeNoteId ? parseInt(activeNoteId.slice(-1)) : null;

  // Scroll the container to keep active note visible
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!activeNoteId || !scrollRef.current) return;
    const activeKey = scrollRef.current.querySelector(`[data-note="${activeNoteId}"]`);
    if (activeKey) {
      activeKey.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [activeNoteId]);

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
    <div style={{ overflowX: 'auto', width: '100%', paddingBottom: 8 }}>
      <div
        ref={scrollRef}
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

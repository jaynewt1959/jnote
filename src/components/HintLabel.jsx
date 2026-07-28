/**
 * HintLabel.jsx
 *
 * Shows a text explanation of the quiz note's position relative to the
 * nearest landmark note — e.g. "2 steps above G4 (treble line 2, clef curl)"
 *
 * The landmark is NOT shown on the staff (that caused confusion). Instead this
 * label tells you: find the landmark you know, then count up/down to the blue note.
 */

import { NOTES } from '../modules/noteData.js';

// Diatonic (letter-name) position, used to count steps on the staff
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
function diatonicPos(note) {
  return note.octave * 7 + LETTER_INDEX[note.name];
}

// Short descriptions of each landmark note for the hint text
const LANDMARK_DESC = {
  C4: 'Middle C · ledger line between staves',
  G4: 'G · treble line 2 (where the clef curls)',
  B4: 'B · treble middle line',
  C5: 'C · treble space 3 (high C)',
  F3: 'F · bass line 4 (where the two dots sit)',
};

function findNearestLandmark(note) {
  const landmarks = NOTES.filter(n => n.isLandmark && n.id !== note.id);
  if (!landmarks.length) return null;
  const pos = diatonicPos(note);
  return landmarks.reduce((best, lm) =>
    Math.abs(diatonicPos(lm) - pos) < Math.abs(diatonicPos(best) - pos) ? lm : best
  );
}

export default function HintLabel({ note, showHint }) {
  if (!showHint || !note) return <div style={{ height: 28 }} />;

  const lm = findNearestLandmark(note);
  if (!lm) return <div style={{ height: 28 }} />;

  const diff  = diatonicPos(note) - diatonicPos(lm);
  const steps = Math.abs(diff);
  const dir   = diff > 0 ? 'above' : diff < 0 ? 'below' : null;
  const desc  = LANDMARK_DESC[lm.id] ?? lm.id;

  let text;
  if (diff === 0) {
    text = `This note IS a landmark — ${desc}`;
  } else {
    const stepWord = steps === 1 ? '1 step' : `${steps} steps`;
    text = `${stepWord} ${dir} landmark ${lm.id} · ${desc}`;
  }

  return (
    <div style={{
      height:        28,
      display:       'flex',
      alignItems:    'center',
      justifyContent:'center',
      fontSize:      12,
      color:         '#64748b',
      fontStyle:     'italic',
    }}>
      💡 {text}
    </div>
  );
}

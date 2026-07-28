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

// Concise landmark descriptions — short enough to stay on one line
const LANDMARK_DESC = {
  C4: 'Middle C',
  G4: 'treble line 2',
  B4: 'treble middle line',
  C5: 'treble space 3',
  F5: 'treble top line',
  C6: '2nd ledger above treble',
  A3: 'bass top line',
  F3: 'bass line 4',
  G2: 'bass bottom line',
  C2: '2nd ledger below bass',
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
  // Always render a fixed-height container so nothing above/below shifts
  const inner = buildHintText(note, showHint);
  return <div className="hint-label">{inner}</div>;
}

function buildHintText(note, showHint) {
  if (!showHint || !note) return null;

  if (note.isLandmark) {
    const desc = LANDMARK_DESC[note.id] ?? note.id;
    return <>💡 Landmark {note.id} ({desc})</>;
  }

  const lm = findNearestLandmark(note);
  if (!lm) return null;

  const diff     = diatonicPos(note) - diatonicPos(lm);
  const steps    = Math.abs(diff);
  const dir      = diff > 0 ? 'above' : 'below';
  const desc     = LANDMARK_DESC[lm.id] ?? lm.id;
  const stepWord = steps === 1 ? '1 step' : `${steps} steps`;
  return <>💡 {stepWord} {dir} {lm.id} ({desc})</>;
}

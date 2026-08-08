/**
 * HintLabel.jsx
 *
 * Shows a text explanation of the quiz note's position — e.g.
 *   "2 steps above G4 (treble line 2)"
 *   "Bass ledger lines: C-E-G-B — this is the 3rd"
 *
 * The reference note is NOT drawn on the staff (that caused confusion). This
 * label is the whole hint.
 *
 * Two hint styles, because the two skills are different:
 *
 *   Normal notes      — located from the nearest landmark in the same clef.
 *   Cross-staff notes — named by their reading pattern and position in it.
 *     The hint used to say "count up from A3", which was an instruction to do
 *     the one thing that cannot earn credit: counting six staff positions
 *     outward takes longer than any budget allows, so the hint could only ever
 *     produce a late answer. Naming the sequence and the position within it is
 *     something the eye can do at a glance instead.
 *
 * Visibility is driven by the budget expiring, not by a manual toggle — see
 * App.jsx. Every note is attempted cold, and the hint arrives only once the
 * attempt has demonstrably not come automatically.
 */

import { NOTES, diatonicPos, CHUNKS, chunkIndex } from '../modules/noteData.js';

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

const ORDINALS = ['0th', '1st', '2nd', '3rd', '4th', '5th', '6th'];

/**
 * Nearest landmark on the SAME staff. Filtering by clef matters now that a
 * pitch can appear on either staff: a treble-clef A3 must not be described
 * relative to the bass-clef A3 landmark, which is a completely different
 * place on the page.
 */
function findNearestLandmark(note) {
  const landmarks = NOTES.filter(
    n => n.isLandmark && n.clef === note.clef && n.id !== note.id
  );
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

  if (note.crossStaff) return crossStaffHint(note);

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

function crossStaffHint(note) {
  const chunk = CHUNKS[note.chunk];
  const index = chunkIndex(note);
  if (!chunk || !index) return null;

  const ord = ORDINALS[index] ?? `${index}th`;
  return <>💡 {chunk.label}: {chunk.letters.join('-')} — this is the {ord}</>;
}

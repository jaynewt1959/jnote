/**
 * HintLabel.jsx
 *
 * Shows a text explanation of the quiz note's position — e.g.
 *   "2 steps above G4 (treble line 2)"
 *   "Bass staff — on 2nd ledger above (count up from A3)"
 *
 * The landmark is NOT shown on the staff (that caused confusion). Instead this
 * label tells you: find the anchor you know, then count to the coloured note.
 *
 * Two hint styles, because the two skills are different:
 *
 *   Normal notes      — counted from the nearest landmark in the same clef.
 *   Cross-staff notes — counted outwards from the owning staff's edge line.
 *     For a note stranded in the gap between the staves, "which staff owns
 *     this?" is the actual question, so the hint leads with the staff name
 *     and the ledger count rather than a landmark that may be far away.
 */

import { NOTES, diatonicPos, ledgerPosition } from '../modules/noteData.js';

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

/**
 * Where cross-staff counting starts: the staff line the ledger lines grow
 * out from. Bass notes climb from the bass top line, treble notes fall from
 * the treble bottom line.
 */
const STAFF_EDGE = {
  bass:   { label: 'Bass',   anchor: 'A3', verb: 'up'   },
  treble: { label: 'Treble', anchor: 'E4', verb: 'down' },
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
  const edge = STAFF_EDGE[note.clef];
  const { direction, count, onLine } = ledgerPosition(note);
  if (!edge || !direction) return null;

  const ord = ORDINALS[count] ?? `${count}th`;
  // "on the 2nd ledger" vs "above/below the 2nd ledger" — the space beyond
  // the last ledger line is a distinct position and reads very differently.
  const place = onLine
    ? `on ${ord} ledger ${direction}`
    : `${direction} ${ord} ledger`;

  return <>💡 {edge.label} staff — {place} (count {edge.verb} from {edge.anchor})</>;
}

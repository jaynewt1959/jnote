/**
 * explanation.js
 *
 * Builds the mistake explanation shown after a wrong answer, replacing the
 * old timeout-triggered HintLabel. One strategy for every note:
 *
 *   Landmark note missed  — name the landmark and its precise line/space.
 *   Any other note missed — name the nearest reference note, its precise
 *                            line/space, and the direction + step count
 *                            from it to the missed note.
 *
 * "Nearest reference note" is a genuine landmark (`isLandmark: true`) for
 * ordinary notes, same as before. Cross-staff notes (levels 13–16) get a
 * wider pool that also includes other cross-staff notes on the same clef
 * introduced at an equal or earlier level — they're taught in tight
 * (2-diatonic-step) groups, so chaining off an already-learned sibling keeps
 * every cross-staff count to 1–2 steps instead of the 8–9 steps a genuine
 * landmark alone would require. Ordinary notes never reference cross-staff
 * notes, preserving the existing clef-filtered landmark lookup.
 */

import { NOTES, diatonicPos, staffLine, ledgerPosition, noteAtDiatonicPos } from './noteData.js';

/** Standard English ordinal suffix, e.g. 1 -> "1st", 12 -> "12th". */
function ordinal(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/**
 * Precise description of where a note sits on its own staff, using the same
 * geometry `noteData.js` already computes for other purposes:
 *
 *   "treble line 2"                        — on a staff line
 *   "bass space 3"                         — in a staff space (space N is
 *                                             between line N and line N+1)
 *   "1st ledger line above the treble staff"
 *   "2nd ledger space below the bass staff"
 */
export function describeLine(note) {
  const line = staffLine(note);
  const clefLabel = note.clef;

  if (line >= 1 && line <= 5) {
    return Number.isInteger(line)
      ? `${clefLabel} line ${line}`
      : `${clefLabel} space ${Math.floor(line)}`;
  }

  const { direction, count, onLine } = ledgerPosition(note);
  const ord = ordinal(count);
  return onLine
    ? `${ord} ledger line ${direction} the ${clefLabel} staff`
    : `${ord} ledger space ${direction} the ${clefLabel} staff`;
}

/**
 * The note this `note` should be explained relative to: the nearest
 * candidate on the same clef, tie-broken toward whichever candidate sits
 * closer to the staff (smaller ledger count) since that's the more stable,
 * easier-to-spot reference point.
 */
function findReferenceNote(note) {
  const pool = note.crossStaff
    ? NOTES.filter(n =>
        n.clef === note.clef &&
        n.id !== note.id &&
        n.level <= note.level &&
        (n.isLandmark || n.crossStaff)
      )
    : NOTES.filter(n => n.isLandmark && n.clef === note.clef && n.id !== note.id);

  if (!pool.length) return null;

  const targetPos = diatonicPos(note);
  const distanceOf = n => Math.abs(diatonicPos(n) - targetPos);
  const nearnessOf = n => ledgerPosition(n).count;

  return pool.reduce((best, candidate) => {
    const d = distanceOf(candidate);
    const bd = distanceOf(best);
    if (d < bd) return candidate;
    if (d === bd && nearnessOf(candidate) < nearnessOf(best)) return candidate;
    return best;
  });
}

/**
 * Build the structured explanation for a missed note. Returns:
 *
 *   { kind: 'isLandmark', note, lineDesc }
 *   { kind: 'counted', note, landmark, landmarkLineDesc, direction, steps, path }
 *
 * `path` is the ordered list of `{ name, octave, vexKey }` diatonic steps
 * from the reference note (exclusive) to the missed note (inclusive), for
 * the animated diagram to reveal one at a time.
 *
 * Returns null only if no reference note exists at all (should not happen
 * for any real drill item — every level has at least one landmark by then).
 */
export function buildExplanation(note) {
  if (!note) return null;

  if (note.isLandmark) {
    return { kind: 'isLandmark', note, lineDesc: describeLine(note) };
  }

  const landmark = findReferenceNote(note);
  if (!landmark) return null;

  const landmarkPos = diatonicPos(landmark);
  const diff = diatonicPos(note) - landmarkPos;
  const direction = diff > 0 ? 'up' : 'down';
  const steps = Math.abs(diff);
  const sign = diff > 0 ? 1 : -1;

  const path = [];
  for (let i = 1; i <= steps; i++) {
    const { name, octave } = noteAtDiatonicPos(landmarkPos + i * sign);
    path.push({ name, octave, vexKey: `${name.toLowerCase()}/${octave}` });
  }

  return {
    kind: 'counted',
    note,
    landmark,
    landmarkLineDesc: describeLine(landmark),
    direction,
    steps,
    path,
  };
}

/** The sentence shown in the explanation panel for a built explanation. */
export function explanationText(explanation) {
  if (!explanation) return '';

  if (explanation.kind === 'isLandmark') {
    return `This is landmark note ${explanation.note.id} — ${explanation.lineDesc}.`;
  }

  const noun = explanation.steps === 1 ? 'note' : 'notes';
  return `Starting with landmark note ${explanation.landmark.id} on ${explanation.landmarkLineDesc}, ` +
    `count ${explanation.direction} ${explanation.steps} ${noun}.`;
}

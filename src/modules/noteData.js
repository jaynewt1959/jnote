/**
 * noteData.js
 *
 * All natural notes used in the drill curriculum, with their VexFlow key
 * strings, clef assignments, level introduction, and landmark status.
 *
 * VexFlow key format: "letter/octave"  e.g. "c/4" for Middle C
 * Tone.js note format: "C4", "G4", etc.
 *
 * ── id vs pitch ──────────────────────────────────────────────────────────
 * `id` identifies a *reading skill*, not a pitch. From level 13 the same
 * pitch appears twice, written on either staff — e.g. "C4" (middle C as the
 * ledger line under the treble staff) and "C4@bass" (the same pitch written
 * as the first ledger line above the bass staff). They look completely
 * different on the page and are scored independently.
 *
 * `pitch` is the sounding note ("C4") and is what the piano keyboard and the
 * audio engine care about. Always use `id` for scoring and `pitch` for sound
 * and keyboard highlighting.
 */

const RAW_NOTES = [
  // ── Level 1: Landmark anchors + first treble line ──────────────────────
  { id: 'C4', name: 'C', octave: 4, clef: 'treble', level: 1, vexKey: 'c/4', toneNote: 'C4', isLandmark: true },
  { id: 'G4', name: 'G', octave: 4, clef: 'treble', level: 1, vexKey: 'g/4', toneNote: 'G4', isLandmark: true },
  { id: 'E4', name: 'E', octave: 4, clef: 'treble', level: 1, vexKey: 'e/4', toneNote: 'E4', isLandmark: false },

  // ── Level 2: Filling gap C4–G4 ─────────────────────────────────────────
  { id: 'D4', name: 'D', octave: 4, clef: 'treble', level: 2, vexKey: 'd/4', toneNote: 'D4', isLandmark: false },
  { id: 'F4', name: 'F', octave: 4, clef: 'treble', level: 2, vexKey: 'f/4', toneNote: 'F4', isLandmark: false },

  // ── Level 3: Above G4 landmark ─────────────────────────────────────────
  { id: 'A4', name: 'A', octave: 4, clef: 'treble', level: 3, vexKey: 'a/4', toneNote: 'A4', isLandmark: false },
  { id: 'B4', name: 'B', octave: 4, clef: 'treble', level: 3, vexKey: 'b/4', toneNote: 'B4', isLandmark: true },

  // ── Level 4: From high-C landmark ──────────────────────────────────────
  { id: 'C5', name: 'C', octave: 5, clef: 'treble', level: 4, vexKey: 'c/5', toneNote: 'C5', isLandmark: true },
  { id: 'D5', name: 'D', octave: 5, clef: 'treble', level: 4, vexKey: 'd/5', toneNote: 'D5', isLandmark: false },

  // ── Level 5: Upper treble + first ledger line above ─────────────────────
  { id: 'E5', name: 'E', octave: 5, clef: 'treble', level: 5, vexKey: 'e/5', toneNote: 'E5', isLandmark: false },
  { id: 'F5', name: 'F', octave: 5, clef: 'treble', level: 5, vexKey: 'f/5', toneNote: 'F5', isLandmark: true },
  { id: 'G5', name: 'G', octave: 5, clef: 'treble', level: 5, vexKey: 'g/5', toneNote: 'G5', isLandmark: false },

  // ── Level 6: Ledger lines above treble ──────────────────────────────────
  { id: 'A5', name: 'A', octave: 5, clef: 'treble', level: 6, vexKey: 'a/5', toneNote: 'A5', isLandmark: false },
  { id: 'B5', name: 'B', octave: 5, clef: 'treble', level: 6, vexKey: 'b/5', toneNote: 'B5', isLandmark: false },
  { id: 'C6', name: 'C', octave: 6, clef: 'treble', level: 6, vexKey: 'c/6', toneNote: 'C6', isLandmark: true },

  // ── Level 7: Staff bridge + first bass note ─────────────────────────────
  // B3 sits just below the treble staff (no ledger line needed)
  // A3 is the top line of the bass staff
  { id: 'B3', name: 'B', octave: 3, clef: 'bass', level: 7, vexKey: 'b/3', toneNote: 'B3', isLandmark: false },
  { id: 'A3', name: 'A', octave: 3, clef: 'bass', level: 7, vexKey: 'a/3', toneNote: 'A3', isLandmark: true },

  // ── Level 8: Bass F landmark region ─────────────────────────────────────
  { id: 'G3', name: 'G', octave: 3, clef: 'bass', level: 8, vexKey: 'g/3', toneNote: 'G3', isLandmark: false },
  { id: 'F3', name: 'F', octave: 3, clef: 'bass', level: 8, vexKey: 'f/3', toneNote: 'F3', isLandmark: true },

  // ── Level 9: Lower bass staff ────────────────────────────────────────────
  { id: 'E3', name: 'E', octave: 3, clef: 'bass', level: 9, vexKey: 'e/3', toneNote: 'E3', isLandmark: false },
  { id: 'D3', name: 'D', octave: 3, clef: 'bass', level: 9, vexKey: 'd/3', toneNote: 'D3', isLandmark: false },
  { id: 'C3', name: 'C', octave: 3, clef: 'bass', level: 9, vexKey: 'c/3', toneNote: 'C3', isLandmark: false },
  { id: 'B2', name: 'B', octave: 2, clef: 'bass', level: 9, vexKey: 'b/2', toneNote: 'B2', isLandmark: false },

  // ── Level 10: Bass bottom + ledger lines below ───────────────────────────
  { id: 'A2', name: 'A', octave: 2, clef: 'bass', level: 10, vexKey: 'a/2', toneNote: 'A2', isLandmark: false },
  { id: 'G2', name: 'G', octave: 2, clef: 'bass', level: 10, vexKey: 'g/2', toneNote: 'G2', isLandmark: true },
  { id: 'F2', name: 'F', octave: 2, clef: 'bass', level: 10, vexKey: 'f/2', toneNote: 'F2', isLandmark: false },
  { id: 'E2', name: 'E', octave: 2, clef: 'bass', level: 10, vexKey: 'e/2', toneNote: 'E2', isLandmark: false },
  { id: 'D2', name: 'D', octave: 2, clef: 'bass', level: 10, vexKey: 'd/2', toneNote: 'D2', isLandmark: false },
  { id: 'C2', name: 'C', octave: 2, clef: 'bass', level: 10, vexKey: 'c/2', toneNote: 'C2', isLandmark: true },

  // ── Level 11: 3rd ledger lines above treble + below bass ────────────────
  { id: 'D6', name: 'D', octave: 6, clef: 'treble', level: 11, vexKey: 'd/6', toneNote: 'D6', isLandmark: false },
  { id: 'E6', name: 'E', octave: 6, clef: 'treble', level: 11, vexKey: 'e/6', toneNote: 'E6', isLandmark: false },
  { id: 'B1', name: 'B', octave: 1, clef: 'bass',   level: 11, vexKey: 'b/1', toneNote: 'B1', isLandmark: false },
  { id: 'A1', name: 'A', octave: 1, clef: 'bass',   level: 11, vexKey: 'a/1', toneNote: 'A1', isLandmark: false },

  // ── Level 12: 4th ledger lines above treble + below bass ────────────────
  { id: 'F6', name: 'F', octave: 6, clef: 'treble', level: 12, vexKey: 'f/6', toneNote: 'F6', isLandmark: false },
  { id: 'G6', name: 'G', octave: 6, clef: 'treble', level: 12, vexKey: 'g/6', toneNote: 'G6', isLandmark: false },
  { id: 'G1', name: 'G', octave: 1, clef: 'bass',   level: 12, vexKey: 'g/1', toneNote: 'G1', isLandmark: false },
  { id: 'F1', name: 'F', octave: 1, clef: 'bass',   level: 12, vexKey: 'f/1', toneNote: 'F1', isLandmark: false },

  // ══ Phase 1b: cross-staff ledger lines ═════════════════════════════════
  // Real piano notation keeps a hand's part on its own staff even when the
  // pitch belongs to the other staff's register, using extended ledger lines
  // rather than a clef change. A left-hand line rising to C5 stays on the
  // bass staff; a right-hand line falling to C3 stays on the treble staff.
  //
  // These are hard precisely because position memory misfires: bass-clef E4
  // (2nd ledger above) sits where the eye expects treble-register notes.
  // Capped at 4 ledger lines, which covers the common cases without becoming
  // visually hostile.

  // ── Levels 13–16: left hand climbing above the bass staff ───────────────
  { id: 'C4@bass', name: 'C', octave: 4, clef: 'bass', level: 13, vexKey: 'c/4', toneNote: 'C4', isLandmark: false, crossStaff: true },
  { id: 'D4@bass', name: 'D', octave: 4, clef: 'bass', level: 13, vexKey: 'd/4', toneNote: 'D4', isLandmark: false, crossStaff: true },

  { id: 'E4@bass', name: 'E', octave: 4, clef: 'bass', level: 14, vexKey: 'e/4', toneNote: 'E4', isLandmark: false, crossStaff: true },
  { id: 'F4@bass', name: 'F', octave: 4, clef: 'bass', level: 14, vexKey: 'f/4', toneNote: 'F4', isLandmark: false, crossStaff: true },

  { id: 'G4@bass', name: 'G', octave: 4, clef: 'bass', level: 15, vexKey: 'g/4', toneNote: 'G4', isLandmark: false, crossStaff: true },
  { id: 'A4@bass', name: 'A', octave: 4, clef: 'bass', level: 15, vexKey: 'a/4', toneNote: 'A4', isLandmark: false, crossStaff: true },

  { id: 'B4@bass', name: 'B', octave: 4, clef: 'bass', level: 16, vexKey: 'b/4', toneNote: 'B4', isLandmark: false, crossStaff: true },
  { id: 'C5@bass', name: 'C', octave: 5, clef: 'bass', level: 16, vexKey: 'c/5', toneNote: 'C5', isLandmark: false, crossStaff: true },

  // ── Levels 17–19: right hand descending below the treble staff ──────────
  // Note there is no "C4@treble": middle C on the treble staff is already the
  // first ledger line below it, taught as C4 back in level 1. The treble side
  // of the overlap therefore starts one step lower, at B3.
  { id: 'B3@treble', name: 'B', octave: 3, clef: 'treble', level: 17, vexKey: 'b/3', toneNote: 'B3', isLandmark: false, crossStaff: true },
  { id: 'A3@treble', name: 'A', octave: 3, clef: 'treble', level: 17, vexKey: 'a/3', toneNote: 'A3', isLandmark: false, crossStaff: true },

  { id: 'G3@treble', name: 'G', octave: 3, clef: 'treble', level: 18, vexKey: 'g/3', toneNote: 'G3', isLandmark: false, crossStaff: true },
  { id: 'F3@treble', name: 'F', octave: 3, clef: 'treble', level: 18, vexKey: 'f/3', toneNote: 'F3', isLandmark: false, crossStaff: true },

  { id: 'E3@treble', name: 'E', octave: 3, clef: 'treble', level: 19, vexKey: 'e/3', toneNote: 'E3', isLandmark: false, crossStaff: true },
  { id: 'D3@treble', name: 'D', octave: 3, clef: 'treble', level: 19, vexKey: 'd/3', toneNote: 'D3', isLandmark: false, crossStaff: true },
  { id: 'C3@treble', name: 'C', octave: 3, clef: 'treble', level: 19, vexKey: 'c/3', toneNote: 'C3', isLandmark: false, crossStaff: true },
];

/**
 * The drill catalogue. `pitch` and `crossStaff` are derived so the literals
 * above stay readable and the two can never drift out of sync.
 */
export const NOTES = RAW_NOTES.map(n => ({
  ...n,
  pitch:      `${n.name}${n.octave}`,
  crossStaff: n.crossStaff ?? false,
}));

/** Lookup map: noteId → note object */
export const NOTE_BY_ID = Object.fromEntries(NOTES.map(n => [n.id, n]));

/** Notes active in the pool for a given level (levels 1..level inclusive) */
export function getNotesForLevel(level) {
  return NOTES.filter(n => n.level <= level);
}

/**
 * The maximum level defined in the curriculum.
 * After completion, the phase-2 (accidentals) flag is set.
 */
export const MAX_LEVEL = 19;

// ─── Staff geometry ────────────────────────────────────────────────────────

// Letter position within an octave, counting staff steps (accidentals ignored)
const LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Diatonic position — one unit per staff step, so C4=28, D4=29, E4=30… */
export function diatonicPos(note) {
  return note.octave * 7 + LETTER_INDEX[note.name];
}

// Diatonic position of each clef's bottom staff line: treble E4, bass G2.
const BOTTOM_LINE_POS = {
  treble: diatonicPos({ octave: 4, name: 'E' }),
  bass:   diatonicPos({ octave: 2, name: 'G' }),
};

/**
 * The note's staff line *in its own clef*, using VexFlow's numbering:
 * 1 = bottom line, 5 = top line, halves sit in a space. Values above 5 are
 * off the top of the staff, below 1 off the bottom.
 */
export function staffLine(note) {
  return 1 + (diatonicPos(note) - BOTTOM_LINE_POS[note.clef]) / 2;
}

/**
 * Where the note sits relative to its own staff's ledger lines.
 *
 * `count` is how many ledger lines the note needs; `onLine` distinguishes a
 * note sitting *on* the Nth ledger from one floating in the space beyond it.
 * A note still touching the staff (or in the space just outside it) has
 * count 0 and direction null.
 *
 * @returns {{ direction: 'above'|'below'|null, count: number, onLine: boolean }}
 */
export function ledgerPosition(note) {
  const line   = staffLine(note);
  const onLine = Number.isInteger(line);
  if (line > 5) return { direction: 'above', count: Math.floor(line - 5), onLine };
  if (line < 1) return { direction: 'below', count: Math.floor(1 - line), onLine };
  return { direction: null, count: 0, onLine };
}

/**
 * noteData.js
 *
 * All natural notes used in the drill curriculum, with their VexFlow key
 * strings, clef assignments, level introduction, and landmark status.
 *
 * VexFlow key format: "letter/octave"  e.g. "c/4" for Middle C
 * Tone.js note format: "C4", "G4", etc.
 */

export const NOTES = [
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
  { id: 'F5', name: 'F', octave: 5, clef: 'treble', level: 5, vexKey: 'f/5', toneNote: 'F5', isLandmark: false },
  { id: 'G5', name: 'G', octave: 5, clef: 'treble', level: 5, vexKey: 'g/5', toneNote: 'G5', isLandmark: false },

  // ── Level 6: Ledger lines above treble ──────────────────────────────────
  { id: 'A5', name: 'A', octave: 5, clef: 'treble', level: 6, vexKey: 'a/5', toneNote: 'A5', isLandmark: false },
  { id: 'B5', name: 'B', octave: 5, clef: 'treble', level: 6, vexKey: 'b/5', toneNote: 'B5', isLandmark: false },
  { id: 'C6', name: 'C', octave: 6, clef: 'treble', level: 6, vexKey: 'c/6', toneNote: 'C6', isLandmark: false },

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
  { id: 'C2', name: 'C', octave: 2, clef: 'bass', level: 10, vexKey: 'c/2', toneNote: 'C2', isLandmark: false },
];

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
export const MAX_LEVEL = 10;

/**
 * Returns the nearest landmark note to the given note (by staff position),
 * for the hint system. Returns null if the note itself is a landmark.
 */
export function getNearestLandmark(noteId) {
  const note = NOTE_BY_ID[noteId];
  if (!note || note.isLandmark) return null;

  const landmarks = NOTES.filter(n => n.isLandmark && n.clef === note.clef);
  if (landmarks.length === 0) return null;

  // Chromatic semitone value for rough distance
  const noteValue = semitonesFromC0(note);
  let nearest = null;
  let minDist = Infinity;
  for (const lm of landmarks) {
    const d = Math.abs(semitonesFromC0(lm) - noteValue);
    if (d < minDist) { minDist = d; nearest = lm; }
  }
  return nearest;
}

// Map note name to semitone offset within an octave (C=0)
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function semitonesFromC0(note) {
  return note.octave * 12 + SEMITONES[note.name];
}

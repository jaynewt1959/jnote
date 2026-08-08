/**
 * check-curriculum.mjs
 *
 * Asserts the curriculum invariants that are otherwise only eyeballed.
 *
 *   node scripts/check-curriculum.mjs
 *
 * There is no test framework in this project, and these are exactly the facts
 * that are easy to break by editing a data table: a mnemonic that no longer
 * matches the staff geometry, a note that needs a 5th ledger line, a pitch that
 * does not exist on the keyboard. Each one would be invisible until it appeared
 * mid-drill as an unreadable note or a hint that lies.
 *
 * Exits non-zero on the first failure with the offending item named.
 */

import {
  NOTES, CHUNKS, MAX_LEVEL, NOTE_BY_ID,
  getNotesForLevel, getNewNotesForLevel,
  staffLine, ledgerPosition, chunkIndex,
} from '../src/modules/noteData.js';
import { budgetFor, FLUENT_MS } from '../src/modules/spacedRepetition.js';

const failures = [];
const check = (label, ok, detail = '') => {
  if (!ok) failures.push(`${label}${detail ? ` \u2014 ${detail}` : ''}`);
};

// ── Ledger cap ────────────────────────────────────────────────────────────
// Beyond 4 ledger lines the notehead drifts past the midpoint of the gap and
// stops reading as belonging to its own staff.
const LEDGER_CAP = 4;
for (const note of NOTES) {
  const { count } = ledgerPosition(note);
  check(
    `ledger cap: ${note.id}`,
    count <= LEDGER_CAP,
    `needs ${count} ledger lines (cap ${LEDGER_CAP}), staff line ${staffLine(note)}`,
  );
}

// ── Chunk mnemonics match the staff geometry ──────────────────────────────
// The hint text is generated from CHUNKS.letters, so a letter out of place
// there is a hint that confidently states the wrong note.
for (const note of NOTES.filter(n => n.chunk)) {
  const chunk = CHUNKS[note.chunk];
  check(`chunk exists: ${note.id}`, Boolean(chunk), `unknown chunk "${note.chunk}"`);
  if (!chunk) continue;

  const index = chunkIndex(note);
  check(`chunk index: ${note.id}`, index >= 1 && index <= chunk.letters.length,
    `index ${index} outside 1..${chunk.letters.length}`);

  if (index >= 1 && index <= chunk.letters.length) {
    check(`chunk letter: ${note.id}`, chunk.letters[index - 1] === note.name,
      `pattern says ${chunk.letters[index - 1]} at position ${index}, item is ${note.name}`);
  }

  check(`chunk clef: ${note.id}`, chunk.clef === note.clef,
    `chunk is ${chunk.clef}, item is ${note.clef}`);

  const { onLine } = ledgerPosition(note);
  check(`chunk on-line: ${note.id}`, chunk.onLine === onLine,
    `chunk expects onLine=${chunk.onLine}, geometry says ${onLine}`);

  check(`cross-staff flag: ${note.id}`, note.crossStaff === true);
}

// Every chunk letter must be reachable: either drilled, or explicitly a
// member of the pattern that is drilled elsewhere under another id.
for (const [key, chunk] of Object.entries(CHUNKS)) {
  const members = NOTES.filter(n => n.chunk === key);
  check(`chunk non-empty: ${key}`, members.length > 0);
  check(
    `chunk size: ${key}`,
    members.length <= chunk.letters.length,
    `${members.length} items for ${chunk.letters.length} pattern positions`,
  );
  // All members of one chunk belong to one level, which is what makes the
  // level teachable as a single pattern.
  const levels = new Set(members.map(n => n.level));
  check(`chunk single level: ${key}`, levels.size === 1,
    `spans levels ${[...levels].join(', ')}`);
}

// ── Ids and pitches ───────────────────────────────────────────────────────
const seen = new Set();
for (const note of NOTES) {
  check(`unique id: ${note.id}`, !seen.has(note.id), 'duplicate id');
  seen.add(note.id);

  check(`id lookup: ${note.id}`, NOTE_BY_ID[note.id] === note);

  // The piano keyboard and audio engine are keyed on `pitch`, never `id`.
  // "C4@bass" matches no key, so a pitch built from the id would fail silently.
  check(`pitch format: ${note.id}`, /^[A-G][1-6]$/.test(note.pitch),
    `pitch "${note.pitch}" is not a bare letter+octave`);
  check(`pitch is not id: ${note.id}`, !note.pitch.includes('@'));

  // vexKey must agree with name/octave, or the note drawn is not the note scored.
  check(`vexKey: ${note.id}`,
    note.vexKey === `${note.name.toLowerCase()}/${note.octave}`,
    `vexKey "${note.vexKey}" disagrees with ${note.name}${note.octave}`);
  check(`toneNote: ${note.id}`, note.toneNote === note.pitch,
    `toneNote "${note.toneNote}" disagrees with pitch "${note.pitch}"`);
}

// ── Levels ────────────────────────────────────────────────────────────────
for (let level = 1; level <= MAX_LEVEL; level++) {
  check(`level ${level} introduces items`, getNewNotesForLevel(level).length > 0);
}
check('no items beyond MAX_LEVEL',
  NOTES.every(n => n.level >= 1 && n.level <= MAX_LEVEL));
check('full pool at MAX_LEVEL',
  getNotesForLevel(MAX_LEVEL).length === NOTES.length);

// ── Budget table ──────────────────────────────────────────────────────────
// Monotonically tightening, ending exactly at the final target. A budget that
// loosened as a note was learned would let a note ratchet backwards.
const budgets = [0, 1, 2, 3, 4, 5].map(budgetFor);
for (let s = 1; s < budgets.length; s++) {
  check(`budget monotonic at score ${s}`, budgets[s] <= budgets[s - 1],
    `${budgets[s - 1]}ms \u2192 ${budgets[s]}ms`);
}
check('budget ends at FLUENT_MS', budgets.at(-1) === FLUENT_MS,
  `final budget ${budgets.at(-1)}ms, FLUENT_MS ${FLUENT_MS}ms`);
check('acquisition budget is looser than the target', budgets[0] > FLUENT_MS,
  `score-0 budget ${budgets[0]}ms is not above ${FLUENT_MS}ms, so a note that ` +
  'has to be worked out can never earn its first credit');

// ── Report ────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\u2717 ${failures.length} curriculum check(s) failed:\n`);
  for (const f of failures) console.error(`  \u2022 ${f}`);
  process.exit(1);
}

console.log(
  `\u2713 curriculum OK \u2014 ${NOTES.length} items, ${MAX_LEVEL} levels, ` +
  `${Object.keys(CHUNKS).length} reading patterns, ` +
  `budgets ${budgets[0]}\u2192${budgets.at(-1)}ms`,
);

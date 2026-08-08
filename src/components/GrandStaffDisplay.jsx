/**
 * GrandStaffDisplay.jsx
 *
 * Renders a single note on a grand staff (treble + bass) using VexFlow 5.
 * The target note is displayed as a whole note in its correct clef.
 * The other clef shows a whole rest.
 *
 * VexFlow is rendered imperatively into a ref'd div; on each prop change
 * the div is cleared and redrawn.
 */

import { useEffect, useRef } from 'react';
import * as VexFlow from 'vexflow';
import { NOTE_BY_ID } from '../modules/noteData.js';

// ── Layout constants ─────────────────────────────────────────────────────
const WIDTH        = 460;
const HEIGHT       = 400;  // extra height for many ledger lines above/below
const STAFF_Y      = 70;   // top margin so high ledger-line notes aren't clipped
const START_X      = 40;   // left margin (brace needs ~40px)
/**
 * Every quiz note is drawn in the same blue.
 *
 * Landmarks used to be drawn green, to mark the anchors the hints told you to
 * count from. Nothing counts from an anchor any more — cross-staff hints name
 * a letter pattern instead — so a second colour only competed for attention
 * with the note actually being read, and gave away a fact about the note
 * before it had been identified.
 */
const NOTE_COLOR   = '#2563eb';
const REST_PITCH   = 'B4';       // nominal pitch VexFlow uses for rests (ignored)
const REST_PITCH_B = 'B2';       // for bass rest

/**
 * Vertical gap between the staves, in staff-line spaces (VexFlow multiplies
 * by 10px). VexFlow's default of 12 leaves only 80px between the treble
 * bottom line and the bass top line, which puts a 4-ledger cross-staff note
 * almost exactly on the midline — the eye can no longer tell which staff owns
 * it. 16 gives 120px, so a bass-clef C5 and a treble-clef C3 both stay
 * clearly on their own side of the gap.
 *
 * This is deliberately constant for every note. Sizing the gap to the note
 * being drawn would both shift the layout mid-drill and leak the answer:
 * a suddenly wider staff would announce "this is a cross-staff note".
 */
const SPACE_BETWEEN_STAVES = 16;

/**
 * @param {string}  noteId          drill item id (e.g. "C4" or "C4@bass")
 * @param {boolean} showLedgerCue   colour the ledger lines to match the note,
 *                                  making staff ownership unambiguous. Tied
 *                                  to the hint toggle so it can be switched
 *                                  off once the reading is secure.
 */
export default function GrandStaffDisplay({ noteId, showLedgerCue = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!noteId || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ''; // clear previous render

    const note = NOTE_BY_ID[noteId];
    if (!note) return;

    try {
      const factory = new VexFlow.Factory({
        renderer: { elementId: container, width: WIDTH, height: HEIGHT },
      });

      const score = factory.EasyScore();

      const staveWidth = WIDTH - START_X - 20;

      // ── Build the system ─────────────────────────────────────────────
      const sys = factory.System({
        x: START_X,
        y: STAFF_Y,
        width: staveWidth,
        spaceBetweenStaves: SPACE_BETWEEN_STAVES,
      });

      // ── Treble voice ─────────────────────────────────────────────────
      let trebleStr, bassStr;
      if (note.clef === 'treble') {
        const vexNote = note.vexKey.toUpperCase().replace('/', '');  // e.g. "C4"
        trebleStr = `${vexNote}/w`;
        bassStr   = `${REST_PITCH_B}/w/r`;
      } else {
        trebleStr = `${REST_PITCH}/w/r`;
        const vexNote = note.vexKey.toUpperCase().replace('/', '');
        bassStr   = `${vexNote}/w`;
      }

      // Create treble notes array so we can colour the target
      const trebleNotes = score.notes(trebleStr, { stem: 'up' });
      const bassNotes   = score.notes(bassStr,   { clef: 'bass', stem: 'down' });

      // Colour the target note
      const target = note.clef === 'treble' ? trebleNotes[0] : bassNotes[0];
      target?.setStyle({ fillStyle: NOTE_COLOR, strokeStyle: NOTE_COLOR });

      // Ledger lines default to grey and are drawn from the owning stave
      // outwards. Tinting them to match the notehead spells out which staff
      // the note belongs to — the whole difficulty of a cross-staff note.
      if (showLedgerCue) {
        target?.setLedgerLineStyle({ strokeStyle: NOTE_COLOR, lineWidth: 2 });
      }

      const trebleVoices = [score.voice(trebleNotes, { time: '4/4' })];
      const bassVoices   = [score.voice(bassNotes,   { time: '4/4' })];

      const trebleStave = sys.addStave({ voices: trebleVoices });
      const bassStave   = sys.addStave({ voices: bassVoices });

      trebleStave.addClef('treble');
      bassStave.addClef('bass');

      // Final barline
      trebleStave.setEndBarType(VexFlow.Barline.type.END);
      bassStave.setEndBarType(VexFlow.Barline.type.END);

      sys.addConnector('brace');
      sys.addConnector('singleLeft');
      sys.addConnector('boldDoubleRight');

      factory.draw();
    } catch (err) {
      console.error('VexFlow render error:', err);
      container.innerHTML = `<div style="color:red;font-size:12px;padding:8px">
        Render error: ${err.message}
      </div>`;
    }
  }, [noteId, showLedgerCue]);

  return (
    <div
      ref={containerRef}
      style={{ width: WIDTH, height: HEIGHT, margin: '0 auto', overflow: 'visible' }}
    />
  );
}


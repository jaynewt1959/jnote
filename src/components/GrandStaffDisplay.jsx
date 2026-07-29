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
const HEIGHT       = 380;  // extra height for many ledger lines above/below
const STAFF_Y      = 80;   // top margin so high ledger-line notes aren't clipped
const START_X      = 40;   // left margin (brace needs ~40px)
const NOTE_COLOR          = '#2563eb';  // blue for regular notes
const LANDMARK_NOTE_COLOR = '#16a34a';  // green for landmark notes
const REST_PITCH   = 'B4';       // nominal pitch VexFlow uses for rests (ignored)
const REST_PITCH_B = 'B2';       // for bass rest

export default function GrandStaffDisplay({ noteId }) {
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
      const sys = factory.System({ x: START_X, y: STAFF_Y, width: staveWidth });

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

      // Apply colour to the target note (green for landmarks, blue otherwise)
      const noteColor = note.isLandmark ? LANDMARK_NOTE_COLOR : NOTE_COLOR;
      if (note.clef === 'treble') {
        trebleNotes[0]?.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
      } else {
        bassNotes[0]?.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
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
  }, [noteId]);

  return (
    <div
      ref={containerRef}
      style={{ width: WIDTH, height: HEIGHT, margin: '0 auto', overflow: 'visible' }}
    />
  );
}


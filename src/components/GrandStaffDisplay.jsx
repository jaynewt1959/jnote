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
import { NOTE_BY_ID, NOTES } from '../modules/noteData.js';

// ── Layout constants ─────────────────────────────────────────────────────
const WIDTH        = 460;
const HEIGHT       = 230;
const START_X      = 40;   // left margin (brace needs ~40px)
const NOTE_COLOR   = '#2563eb';  // blue for target note
const HINT_COLOR   = '#94a3b8';  // slate-400 for landmark hint
const REST_PITCH   = 'B4';       // nominal pitch VexFlow uses for rests (ignored)
const REST_PITCH_B = 'B2';       // for bass rest

export default function GrandStaffDisplay({ noteId, showHint = false }) {
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
      const sys = factory.System({ x: START_X, y: 0, width: staveWidth });

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

      // Apply colour to the target note
      if (note.clef === 'treble') {
        trebleNotes[0]?.setStyle({ fillStyle: NOTE_COLOR, strokeStyle: NOTE_COLOR });
      } else {
        bassNotes[0]?.setStyle({ fillStyle: NOTE_COLOR, strokeStyle: NOTE_COLOR });
      }

      // Hint: draw the nearest landmark note (dim gray) on the same stave
      // We use a second voice so the hint note doesn't clash with the target
      let trebleVoices = [score.voice(trebleNotes, { time: '4/4' })];
      let bassVoices   = [score.voice(bassNotes,   { time: '4/4' })];

      if (showHint) {
        const hintNote = findNearestLandmark(note, noteId);
        if (hintNote) {
          const hintVexNote = hintNote.vexKey.toUpperCase().replace('/', '');
          const hintStr = `${hintVexNote}/w`;
          if (hintNote.clef === 'treble') {
            const hn = score.notes(hintStr, { stem: 'up' });
            hn[0]?.setStyle({ fillStyle: HINT_COLOR, strokeStyle: HINT_COLOR });
            trebleVoices.push(score.voice(hn, { time: '4/4' }));
          } else {
            const hn = score.notes(hintStr, { clef: 'bass', stem: 'down' });
            hn[0]?.setStyle({ fillStyle: HINT_COLOR, strokeStyle: HINT_COLOR });
            bassVoices.push(score.voice(hn, { time: '4/4' }));
          }
        }
      }

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
  }, [noteId, showHint]);

  return (
    <div
      ref={containerRef}
      style={{ width: WIDTH, height: HEIGHT, margin: '0 auto' }}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function semiVal(n) { return n.octave * 12 + SEMITONES[n.name]; }

function findNearestLandmark(note, noteId) {
  const landmarks = NOTES.filter(n => n.isLandmark && n.clef === note.clef && n.id !== noteId);
  if (!landmarks.length) return null;
  const sv = semiVal(note);
  return landmarks.reduce((best, lm) =>
    Math.abs(semiVal(lm) - sv) < Math.abs(semiVal(best) - sv) ? lm : best
  );
}

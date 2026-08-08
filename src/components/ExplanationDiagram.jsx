/**
 * ExplanationDiagram.jsx
 *
 * Small, self-contained VexFlow render that visually walks the count from a
 * reference note to the missed note, one "ghost" note at a time — a real
 * StaveNote per step (so ledger lines draw themselves correctly), not a
 * custom marker.
 *
 * Rather than animating SVG opacity in place, this redraws the whole (tiny)
 * diagram on every tick with one more note revealed, the same imperative
 * pattern GrandStaffDisplay already uses for the main staff.
 *
 * Colouring:
 *   - The reference note is always shown, in a fixed distinct colour.
 *   - Each newly revealed step briefly highlights, then settles into a
 *     translucent "ghost" tint as the next step appears.
 *   - The final step — the actual missed note — locks in as the same blue
 *     used for the quiz note on the main staff, once fully counted.
 */

import { useEffect, useRef, useState } from 'react';
import * as VexFlow from 'vexflow';

const BASE_WIDTH     = 90;
const WIDTH_PER_NOTE = 55;
// HEIGHT/STAVE_Y give equal room above and below the stave (100px each side)
// so ledger lines have enough clearance whichever direction they run — a
// bass-clef explanation counting further below the staff needs just as much
// room below as a treble one counting above needs room up top.
const HEIGHT   = 240;
const STAVE_Y  = 100;
const STEP_MS  = 550;

const REFERENCE_COLOR = '#0d9488';               // teal — the fixed starting note
const ACTIVE_COLOR    = '#f59e0b';                // amber — the step just counted
const GHOST_COLOR     = 'rgba(37, 99, 235, 0.32)'; // faded blue — settled steps
const TARGET_COLOR    = '#2563eb';                 // solid blue — matches the main staff

export default function ExplanationDiagram({ explanation, onPlayNote }) {
  const containerRef = useRef(null);
  const [revealCount, setRevealCount] = useState(0);

  const isCounted = explanation?.kind === 'counted';
  const steps = isCounted ? explanation.steps : 0;
  const path = isCounted ? explanation.path : [];
  const restartKey = explanation
    ? (isCounted ? `${explanation.note.id}:${explanation.landmark.id}` : explanation.note.id)
    : null;

  // Animate the reveal count from 0 up to `steps`, restarting on a new
  // mistake, sounding each note's pitch as it's revealed — starting with the
  // reference note itself, so the count has an audible anchor to start from.
  useEffect(() => {
    setRevealCount(0);
    if (!explanation) return undefined;

    const reference = isCounted ? explanation.landmark : explanation.note;
    onPlayNote?.(reference.toneNote ?? `${reference.name}${reference.octave}`);

    if (!steps) return undefined;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealCount(i);
      const step = path[i - 1];
      onPlayNote?.(`${step.name}${step.octave}`);
      if (i >= steps) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  useEffect(() => {
    if (!explanation || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const reference = isCounted ? explanation.landmark : explanation.note;
    const stepPath = isCounted ? explanation.path : [];
    const clef = reference.clef;
    const shownSteps = stepPath.slice(0, revealCount);
    const count = 1 + shownSteps.length;
    const width = BASE_WIDTH + count * WIDTH_PER_NOTE;

    try {
      const renderer = new VexFlow.Renderer(container, VexFlow.Renderer.Backends.SVG);
      renderer.resize(width, HEIGHT);
      const context = renderer.getContext();

      const stave = new VexFlow.Stave(10, STAVE_Y, width - 20);
      stave.addClef(clef);
      stave.setContext(context).draw();

      const keys = [reference.vexKey ?? `${reference.name.toLowerCase()}/${reference.octave}`,
        ...shownSteps.map(n => n.vexKey)];
      const notes = keys.map(k => new VexFlow.StaveNote({ keys: [k], duration: 'q', clef }));

      const lastIndex = notes.length - 1;
      notes.forEach((n, i) => {
        let color;
        if (i === 0) {
          color = isCounted ? REFERENCE_COLOR : TARGET_COLOR;
        } else if (i === lastIndex && revealCount === steps) {
          color = TARGET_COLOR;
        } else if (i === lastIndex) {
          color = ACTIVE_COLOR;
        } else {
          color = GHOST_COLOR;
        }
        n.setStyle({ fillStyle: color, strokeStyle: color });
      });

      const voice = new VexFlow.Voice({ numBeats: notes.length, beatValue: 4 });
      voice.setMode(VexFlow.Voice.Mode.SOFT);
      voice.addTickables(notes);
      new VexFlow.Formatter().joinVoices([voice]).format([voice], width - 60);
      voice.draw(context, stave);
    } catch (err) {
      console.error('ExplanationDiagram render error:', err);
    }
  }, [explanation, isCounted, revealCount, steps]);

  if (!explanation) return null;
  return <div className="explanation-diagram" ref={containerRef} />;
}

/**
 * CountdownBar.jsx
 *
 * Thin depleting bar under the staff showing how much of the fluency budget
 * (FLUENT_MS) is left. Answering after it empties still records the answer,
 * but earns no score credit.
 *
 * Purely CSS-animated — no JS timers, no per-frame re-renders. The animation
 * restarts because `key` changes on every new note.
 *
 * Props:
 *   noteId     — current note id (part of the restart key)
 *   serial     — increments on every note shown (part of the restart key)
 *   durationMs — fluency budget in ms
 *   active     — false while feedback is showing; bar sits empty and idle
 */

export default function CountdownBar({ noteId, serial, durationMs, active }) {
  return (
    <div className="countdown-wrap" aria-hidden="true">
      <div
        key={`${noteId ?? 'none'}-${serial}`}
        className={`countdown-track${active ? ' running' : ''}`}
        style={{ animationDuration: `${durationMs}ms` }}
      >
        <div
          className="countdown-fill"
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}

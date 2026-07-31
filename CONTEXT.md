# jnote — Context for AI Agents

## What it is

A web app that teaches beginners to identify notes on the piano grand staff (treble + bass clefs) through progressive drilling with spaced repetition and audio reinforcement. Built for a single adult learner who wants to achieve rapid, automatic note recognition including extreme ledger lines.

**Live:** https://jnote-ten.vercel.app  
**Repo:** https://github.com/jaynewt1959/jnote  
**Stack:** React 18 + Vite, VexFlow 5 (npm), native Web Audio API, localStorage, Vercel

---

## Architecture

```
src/
  components/
    GrandStaffDisplay.jsx   VexFlow grand staff — renders one blue whole note + rest
    PianoKeyboard.jsx       Interactive keyboard A1–G6 (35 white keys)
    NoteButtons.jsx         A–G letter buttons (fast alternative to keyboard)
    FeedbackBanner.jsx      ✓/✗/too-slow result + reaction time per answer
    CountdownBar.jsx        CSS-animated bar depleting over the 3s fluency budget
    HintLabel.jsx           Fixed-height text hint below staff (never causes layout shift)
    LevelProgress.jsx       Level N of 12 + fluent count + progress bar
    StatsBar.jsx            Rolling avg reaction time + trend (↓ faster / ↑ slower)
  modules/
    noteData.js             All 45 notes, 12 levels, isLandmark flags
    spacedRepetition.js     Score engine + rtLog — persists to localStorage 'jnote_state'
    audioEngine.js          Native Web Audio API piano synth (no CDN, Safari-safe)
  hooks/
    useDrillSession.js      Core drill loop: note → answer → feedback → next note
    useAudio.js             Wraps audioEngine, exposes play() + initFromGesture()
```

---

## Curriculum — 12 levels, 45 natural notes

Each level adds notes cumulatively. A level advances when all notes in the pool reach score ≥ 4 — 4 net identifications that are both correct **and** within the 3 s fluency budget. Phase 2 (accidentals) is not yet implemented.

| Level | Notes added | Clef | Position |
|-------|-------------|------|----------|
| 1 | C4, G4, E4 | treble | landmarks + line 1 |
| 2 | D4, F4 | treble | gap C4–G4 |
| 3 | A4, B4 | treble | above G4 |
| 4 | C5, D5 | treble | from high-C landmark |
| 5 | E5, F5, G5 | treble | upper treble + 1st ledger above |
| 6 | A5, B5, C6 | treble | 2nd ledger above treble |
| 7 | B3, A3 | bass | staff bridge / bass top line |
| 8 | G3, F3 | bass | bass F landmark region |
| 9 | E3, D3, C3, B2 | bass | lower bass staff |
| 10 | A2, G2, F2, E2, D2, C2 | bass | bass bottom + 2nd ledger below |
| 11 | D6, E6, B1, A1 | treble/bass | 3rd ledger lines |
| 12 | F6, G6, G1, F1 | treble/bass | 4th ledger lines |

---

## Landmark notes

Used by HintLabel to describe each note's position. Landmarks are in `noteData.js` as `isLandmark: true`. The hint text format is always single-line and nowrap.

| ID | Description |
|----|-------------|
| C4 | Middle C — ledger line between staves |
| G4 | Treble line 2 (clef curls here) |
| B4 | Treble middle line |
| C5 | Treble space 3 |
| F5 | Treble top line |
| C6 | 2nd ledger above treble |
| A3 | Bass top line |
| F3 | Bass line 4 (two dots) |
| G2 | Bass bottom line |
| C2 | 2nd ledger below bass |

---

## Key design decisions

### Spaced repetition
Scores 0–5 per note. Weighted random selection: `weight = (6 − score)²`. Level advances when the entire pool reaches score ≥ 4. Full state in `localStorage` key `jnote_state`.

### Fluency gate (why levelling up isn't just accuracy)
Recognition only counts when it is automatic, so score credit is gated on reaction time:

| Answer | Score |
|--------|-------|
| Correct within `FLUENT_MS` (3000 ms) | +1 (cap 5) |
| Correct but slower | no change — no credit, no penalty |
| Wrong | −1 (floor 0) |

A slow-but-correct answer stalls rather than punishes: the user knows the note, just not automatically. Because the note keeps its low score, the weighted selector keeps it in heavy rotation until it is answered fast. 3 s covers read + decide + press generously, but is too short to count up ledger lines from a landmark.

`isFluent(null)` returns `true` — a missing reaction time (timer never started) grants credit, because the failure mode of a broken clock must not be an unprogressable level.

**State versioning:** `STATE_VERSION` (currently 2) is stored in `jnote_state`. On load, a mismatch discards saved state entirely rather than honouring scores earned under older, more lenient rules. Bump it whenever the scoring rules change.

### Audio (Safari-critical)
Safari requires `AudioContext.resume()` to be called **synchronously within a user gesture**. The `touchAudio()` function in `audioEngine.js` does this — it must be called synchronously in click/keydown handlers before any async. `initFromGesture()` in `useAudio.js` wraps this. Tone.js was removed; synthesis is native Web Audio API (triangle + sine oscillators, lowpass filter, ADSR envelope).

### Error sound
`playError()` is the same buzz as sibling project jread (`jread/audio.js` → `playIncorrect`): sawtooth dropping 180 → 90 Hz over 300 ms, 360 ms total. It fires **synchronously inside the answer gesture** via the `onWrongAnswer` callback of `useDrillSession`. It finishes before the next note's audio preview at 530 ms, so the two never overlap. Muted by the same "Audio off" toggle as note playback.

**Trap — `resume()` is async.** Every sound goes through `whenRunning(schedule)` in `audioEngine.js`, which resumes the context and defers scheduling until the promise settles. Do NOT write `if (ctx.state === 'suspended') return;` and schedule in the same tick: a sound requested straight from the unlocking gesture is scheduled against a still-frozen clock and is silently lost. This bit the error buzz — it was inaudible while note playback worked, purely because notes are scheduled from a 530 ms timer by which point `resume()` has settled.

### Pre-picked next note for timing
`useDrillSession` pre-picks the next note immediately on answer submission. Audio fires at `FEEDBACK_MS − AUDIO_LEAD` (currently 730 − 200 = 530ms after answer). The visual transition fires at 730ms. This gives a short audio preview of the next note before it appears.

### VexFlow rendering
`GrandStaffDisplay` is a fully imperative component — VexFlow draws into a `ref` div. On each `noteId` change, the container is cleared (`innerHTML = ''`) and redrawn. Always shows full grand staff; the non-quiz clef gets a whole rest. The quiz note is colored blue (`#2563eb`).

### Layout stability
`HintLabel` renders a fixed `height: 22px` div with `white-space: nowrap` and `overflow: hidden`. It is a sibling of `.staff-section` (not inside it), so its content never affects the staff position.

### Reaction time tracking
Timer starts in `showNextNote` (`noteStartTime = Date.now()`). RT is computed in `submitAnswer`, passed to `recordAnswer()` for the fluency gate, and stored in `_state.rtLog[]` (capped at 500). Answers slower than `WANDER_MS` (8 s) are treated as attention-wandered and excluded from `rtLog` so they don't pollute stats — they still count as answers for scoring. Only correct answers under 15s count toward stats. `getStats()` returns `{ avgMs, improvementMs }` comparing last 10 vs prior 10 correct answers.

### Countdown bar
`CountdownBar` is pure CSS — no JS timers and no per-frame re-renders. The animation restarts because its `key` combines `noteId` with `noteSerial` (a counter bumped in `showNextNote`). It sits idle and empty while feedback is showing, and the track flips amber the instant the budget expires.

---

## Running locally

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # output to dist/
```

## Deploy

Push to `main` → Vercel auto-deploys (connected to GitHub repo).

```bash
git push origin main
```

---

## What's next / known gaps

- **Accidentals (Phase 2):** sharps/flats not yet implemented. The plan was to unlock after Level 12.
- **MIDI input:** Tone.js was removed; MIDI would need a separate WebMIDI API integration.
- **Mobile:** Layout is desktop-first. The keyboard may be cramped on small screens.
- **Reset also clears rtLog:** The reset button wipes all progress including reaction time history.
- **No user accounts:** All state is localStorage only — per-device, not synced.

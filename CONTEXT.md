# jnote — Context for AI Agents

## What it is

A web app that teaches beginners to identify notes on the piano grand staff (treble + bass clefs) through progressive drilling with spaced repetition and audio reinforcement. Built for a single adult learner who wants to achieve rapid, automatic note recognition including extreme ledger lines and cross-staff ledger lines.

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
    LevelProgress.jsx       Level N of MAX_LEVEL + fluent count + progress bar
    StatsBar.jsx            Rolling avg reaction time + trend (↓ faster / ↑ slower)
  modules/
    noteData.js             All 52 drill items, 19 levels, isLandmark/crossStaff flags,
                            staffLine() + ledgerPosition() staff geometry helpers
    spacedRepetition.js     Score engine + rtLog — persists to localStorage 'jnote_state'
    audioEngine.js          Native Web Audio API piano synth (no CDN, Safari-safe)
  hooks/
    useDrillSession.js      Core drill loop: note → answer → feedback → next note
    useAudio.js             Wraps audioEngine, exposes play() + initFromGesture()
```

---

## Curriculum — 19 levels, 52 drill items

Each level adds items cumulatively. A level advances when all items in the pool reach score ≥ 4 — 4 net identifications that are both correct **and** within the 3 s fluency budget. Phase 2 (accidentals) is not yet implemented.

### Phase 1 — absolute register (levels 1–12, 37 items)

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

### Phase 1b — cross-staff ledger lines (levels 13–19, 15 items)

Piano notation keeps a hand's part on its own staff even when the pitch belongs to the other staff's register, using extended ledger lines rather than a clef change. These items drill the *inward* ledger region: the left hand climbing above the bass staff and the right hand descending below the treble staff.

| Level | Items added | Clef | Position |
|-------|-------------|------|----------|
| 13 | C4@bass, D4@bass | bass | 1st ledger above bass |
| 14 | E4@bass, F4@bass | bass | 2nd ledger above bass |
| 15 | G4@bass, A4@bass | bass | 3rd ledger above bass |
| 16 | B4@bass, C5@bass | bass | 4th ledger above bass |
| 17 | B3@treble, A3@treble | treble | 1st–2nd ledger below treble |
| 18 | G3@treble, F3@treble | treble | 2nd–3rd ledger below treble |
| 19 | E3@treble, D3@treble, C3@treble | treble | 3rd–4th ledger below treble |

Capped at **4 ledger lines** in each direction. Beyond that the notehead drifts past the midpoint of the gap and stops reading as belonging to its own staff.

There is deliberately no `C4@treble`: middle C on the treble staff is already the first ledger line below it, taught as `C4` in level 1. The treble side of the overlap therefore starts one step lower, at B3.

---

## Landmark notes

Used by HintLabel to describe each note's position. Landmarks are in `noteData.js` as `isLandmark: true`. The hint text format is always single-line and nowrap.

Landmark lookup is **clef-filtered**. Now that a pitch can appear on either staff, a treble-clef A3 must not be described relative to the bass-clef A3 landmark — that is a completely different place on the page.

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

### Drill item identity: `id` vs `pitch`
A drill item is a **reading skill**, not a pitch. From level 13 the same pitch appears twice under different ids — `C4` (middle C as the ledger line below the treble staff) and `C4@bass` (the same pitch as the first ledger line above the bass staff). They look nothing alike on the page and are scored independently.

- `id` — spaced-repetition key, `rtLog` key, `NOTE_BY_ID` key. May contain `@`.
- `pitch` — the sounding note (`"C4"`). Used for audio and for piano-key highlighting.

`pitch` and `crossStaff` are **derived** in `noteData.js` from the literal rows, so they cannot drift out of sync with `name`/`octave`.

Anything that maps a note onto the piano keyboard must use `pitch`. Using `id` there silently breaks: `"C4@bass"` matches no key.

### Staff geometry (`staffLine` / `ledgerPosition`)
`noteData.js` exports helpers that compute a note's position **in its own clef**, using VexFlow's line numbering (1 = bottom line, 5 = top line, halves sit in a space):

- `staffLine(note)` — e.g. bass-clef C5 is line 9.5, treble-clef C3 is line −3.5.
- `ledgerPosition(note)` — `{ direction, count, onLine }`, where `onLine` separates "on the 3rd ledger" from "in the space beyond it".

These drive the cross-staff hint text and make the 4-ledger cap checkable rather than eyeballed.

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

`touchAudio()` is the **only** thing that creates the AudioContext. `whenRunning()` returns early when there is no context yet rather than building one, because a context created before a gesture is born blocked: its pending `resume()` can fire a long-stale note minutes later, and it wastes the one chance a browser gives to create an already-running context inside a gesture.

### First-gesture unlock
The first note is drawn on page load, before any interaction exists, so its audio can never play — no browser will sound it. `App.jsx` therefore attaches capture-phase `pointerdown`/`keydown` listeners on `window` that unlock audio on the **first gesture anywhere** (not just an answer) and then sound the note already on screen. Listeners detach once `isAudioReady()` is true.

The replay is **deferred by `UNLOCK_REPLAY_MS` (300 ms)** and skipped if feedback appeared or `noteSerial` moved in the meantime — i.e. if the unlocking gesture turned out to be an answer, which brings its own note `FEEDBACK_MS` later. Deciding immediately produces two notes back to back: `pointerdown` fires long before the `click` it belongs to is dispatched as an answer, so the replay would fire first and the answer's note would follow it.

### Error sound
`playError()` is the same buzz as sibling project jread (`jread/audio.js` → `playIncorrect`): sawtooth dropping 180 → 90 Hz over 300 ms, 360 ms total. It fires **synchronously inside the answer gesture** via the `onWrongAnswer` callback of `useDrillSession`. It finishes long before the next note sounds at `FEEDBACK_MS` (730 ms), so the two never overlap. Muted by the same "Audio off" toggle as note playback.

**Trap — `resume()` is async.** Every sound goes through `whenRunning(schedule)` in `audioEngine.js`, which resumes the context and defers scheduling until the promise settles. Do NOT write `if (ctx.state === 'suspended') return;` and schedule in the same tick: a sound requested straight from the unlocking gesture is scheduled against a still-frozen clock and is silently lost. This bit the error buzz — it was inaudible while note playback worked, purely because notes are scheduled from a later timer by which point `resume()` has settled.

### Note audio fires on appearance
`onNoteShown` is called from exactly one place — `showNextNote()` — so a note sounds at the instant it is drawn. There is no audio lead. An earlier `AUDIO_LEAD` of 200 ms previewed the next note before the visual, but at 530 ms after the keypress the sound read as belonging to the button press rather than to the note, which is the wrong association for ear-plus-eye reinforcement.

`useDrillSession` still pre-picks the next note on answer submission so the reveal at `FEEDBACK_MS` (730 ms) has its note ready.

### VexFlow rendering
`GrandStaffDisplay` is a fully imperative component — VexFlow draws into a `ref` div. On each `noteId` change, the container is cleared (`innerHTML = ''`) and redrawn. Always shows full grand staff; the non-quiz clef gets a whole rest. The quiz note is colored blue (`#2563eb`), or green for landmarks.

VexFlow imposes **no cap on ledger lines** — `StaveNote.drawLedgerLines()` simply walks outward from the staff — so cross-staff notes needed no rendering workarounds. Because every drill note is a whole note, there are no stems, and therefore none of the usual stem/flag collision problems either.

### Grand staff spacing (`SPACE_BETWEEN_STAVES = 16`)
VexFlow's default `spaceBetweenStaves` of 12 leaves 80 px between the treble bottom line and the bass top line. At that gap a 4-ledger cross-staff note lands almost exactly on the midline and the eye can no longer tell which staff owns it. 16 gives 120 px (midpoint y = 210), which keeps every cross-staff item clearly on its own side:

| Item | Ledgers | Head y | Side |
|------|---------|--------|------|
| C5@bass | 4 above | 225 | below midpoint — bass |
| C4@bass | 1 above | 260 | below midpoint — bass |
| B3@treble | 1 below | 165 | above midpoint — treble |
| C3@treble | 4 below | 195 | above midpoint — treble |

With `STAFF_Y = 70` and `HEIGHT = 400`, the vertical extremes still fit: G6 sits at y = 70, F1 at y = 350.

**The gap is deliberately constant for every note.** Sizing it to the note being drawn would shift the layout mid-drill *and* leak the answer — a suddenly wider staff would announce "this is a cross-staff note".

### Ledger line colour cue
Ledger lines default to grey (`#444`) and are drawn outward from the owning stave. When hints are on, `showLedgerCue` tints the target note's ledger lines to match its notehead via `setLedgerLineStyle()`, which spells out staff ownership — the entire difficulty of a cross-staff note. Turning hints off restores normal notation, so the final drilling is honest.

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

- **Accidentals (Phase 2):** sharps/flats not yet implemented. The plan was to unlock after the final level.
- **Late-level grind:** by level 19 the pool is 52 items and advancement still requires *every* item to reach score ≥ 4. If this becomes tedious, switch advanced levels to a focused subset or a rolling review pool rather than full re-mastery.
- **Outward cross-staff notes not covered:** only the *inward* overlap is drilled. Left-hand notes written above the treble staff, or right-hand notes below the bass staff, are rare in real music and are not in the curriculum.
- **MIDI input:** Tone.js was removed; MIDI would need a separate WebMIDI API integration.
- **Mobile:** Layout is desktop-first. The keyboard may be cramped on small screens.
- **Reset also clears rtLog:** The reset button wipes all progress including reaction time history.
- **No user accounts:** All state is localStorage only — per-device, not synced.

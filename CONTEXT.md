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
    CountdownBar.jsx        CSS-animated bar depleting over this note's budget
    ExplanationPanel.jsx    Mistake explanation (sentence + diagram); manual dismiss only
    ExplanationDiagram.jsx  Small VexFlow "ghost note" animation walking the count
    LevelProgress.jsx       Level N of MAX_LEVEL + new/pool fluent counts + progress bar
    StatsBar.jsx            Rolling avg reaction time + trend (↓ faster / ↑ slower)
  modules/
    noteData.js             All 52 drill items, 16 levels, CHUNKS reading patterns,
                            staffLine() + ledgerPosition() + noteAtDiatonicPos() geometry helpers
    explanation.js          Mistake-explanation text + step path — describeLine(),
                            buildExplanation(), explanationText()
    spacedRepetition.js     Score engine + graduated budgets + lapse queue + rtLog
                            — persists to localStorage 'jnote_state'
    audioEngine.js          Native Web Audio API piano synth (no CDN, Safari-safe)
  hooks/
    useDrillSession.js      Core drill loop: note → answer → feedback → next note
                            (wrong answers pause on awaitingDismissal until advance())
    useAudio.js             Wraps audioEngine, exposes play() + initFromGesture()
scripts/
  check-curriculum.mjs      `npm run check` — curriculum + budget invariants
```

---

## Curriculum — 16 levels, 52 drill items

Each level adds items cumulatively. Advancement needs every item **introduced at the current level** to reach score ≥ 4, plus 90% of the whole pool — see "Advancement rule" below. Phase 2 (accidentals) is not yet implemented.

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

### Phase 1b — cross-staff ledger lines (levels 13–16, 15 items)

Piano notation keeps a hand's part on its own staff even when the pitch belongs to the other staff's register, using extended ledger lines rather than a clef change. These items drill the *inward* ledger region: the left hand climbing above the bass staff and the right hand descending below the treble staff.

**Grouped by pattern, not by ledger count.** Each level is one alphabetic sequence that can be memorised whole, defined in `CHUNKS` in `noteData.js`:

| Level | Chunk | Items added | Pattern |
|-------|-------|-------------|---------|
| 13 | linesAboveBass | C4@bass, E4@bass, G4@bass, B4@bass | C‑E‑G‑B |
| 14 | spacesAboveBass | D4@bass, F4@bass, A4@bass, C5@bass | D‑F‑A‑C |
| 15 | linesBelowTreble | A3@treble, F3@treble, D3@treble | C‑A‑F‑D |
| 16 | spacesBelowTreble | B3@treble, G3@treble, E3@treble, C3@treble | B‑G‑E‑C |

The patterns are just each staff's own line letters carried onward: bass lines G‑B‑D‑F‑A continue to C‑E‑G‑B; treble lines E‑G‑B‑D‑F continue downward to C‑A‑F‑D.

This replaced an earlier 13–19 layout that paired one ledger-*line* note with one ledger-*space* note per level (L15 was G4 line + A4 space). Neither sequence was ever met intact, so every item had to be counted out individually — and counting six staff positions outward fits no workable time budget. That is what made 15+ feel impassable.

`chunkIndex()` derives a note's position in its chunk from the staff geometry, and `npm run check` asserts that `CHUNKS.letters` agrees with it, so a mnemonic cannot silently drift from what is drawn.

Capped at **4 ledger lines** in each direction. Beyond that the notehead drifts past the midpoint of the gap and stops reading as belonging to its own staff.

Two pattern members are drilled under other ids rather than repeated: `C4@treble` (middle C is already the first ledger below the treble staff, taught as `C4` at level 1) and `B3` in the space above the bass top line (no ledger needed, taught at level 7). Both still appear in their chunk's `letters` so positions stay honest — "the 3rd" always means the 3rd thing on the page.

---

## Landmark notes

Used by `explanation.js` to describe the position of notes relative to a fixed reference point. Landmarks are in `noteData.js` as `isLandmark: true`.

Landmark lookup is **clef-filtered**. Now that a pitch can appear on either staff, a treble-clef A3 must not be described relative to the bass-clef A3 landmark — that is a completely different place on the page.

Landmarks do not affect note colour (see "Note colour"). Cross-staff items are deliberately never `isLandmark` — marking `C4@bass` as one would make it the nearest landmark offered for ordinary bass notes like `B3`, describing them against an `@bass` id. Cross-staff notes instead get a wider reference pool of their own — see "Mistake explanations" below.

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

`pitch` and `crossStaff` are **derived** in `noteData.js` from the literal rows, so they cannot drift out of sync with `name`/`octave`. `crossStaff` follows from `chunk` membership — belonging to a reading pattern is what makes an item cross-staff — so the flag cannot be forgotten on a new row.

Anything that maps a note onto the piano keyboard must use `pitch`. Using `id` there silently breaks: `"C4@bass"` matches no key.

### Staff geometry (`staffLine` / `ledgerPosition`)
`noteData.js` exports helpers that compute a note's position **in its own clef**, using VexFlow's line numbering (1 = bottom line, 5 = top line, halves sit in a space):

- `staffLine(note)` — e.g. bass-clef C5 is line 9.5, treble-clef C3 is line −3.5.
- `ledgerPosition(note)` — `{ direction, count, onLine }`, where `onLine` separates "on the 3rd ledger" from "in the space beyond it".
- `chunkIndex(note)` — the note's 1-based position within its reading pattern, which is just its ledger count.

These drive the cross-staff hint text and make both the 4-ledger cap and the `CHUNKS` mnemonics checkable rather than eyeballed — see `npm run check`.

### Spaced repetition
Scores 0–5 per note. Weighted random selection via `weightFor()`: `(6 − score)²` below threshold, but only `1` at score 4 and `0.5` at score 5. Mastered notes are worth revisiting, but by level 16 there are dozens of them and a weight of 1 each let them crowd out the handful actually being learned. Full state in `localStorage` key `jnote_state`.

### Fluency gate — a graduated budget, not a fixed one
Score credit is gated on reaction time, but the budget **tightens as the note is learned** (`BUDGET_BY_SCORE`):

| Note's current score | Budget |
|----------------------|--------|
| 0–1 | 6000 ms |
| 2–3 | 4500 ms |
| 4–5 | 3000 ms (`FLUENT_MS`) |

| Answer | Score |
|--------|-------|
| Correct within the note's current budget | +1 (cap 5) |
| Correct but slower | no change — no credit, no penalty |
| Wrong | −1 (floor 0), and a lapse retry is scheduled |

**Why banded and not flat.** Per-note drift is `P(fast & correct) − P(wrong)`. Under a single 3 s gate, a note you can derive but not yet recognise has only two options: work it out and be too slow (drift **0**, frozen) or guess in time (drift `1/7 − 6/7 = −0.71`, falling). Neither converts deliberate derivation into recognition, so the note parks forever — and under the old conjunctive rule one parked note froze the whole level. Banding by the note's own score gives room to reason it out early, then tightens with each credit earned, so the note ratchets toward automaticity.

The trade: reaching score 4 now demonstrates ≤4.5 s, and 3 s is what earns score 5. The gate is deliberately softer in exchange for being reachable.

The budget is always read from the score **before** the answer, so the countdown the user raced is the one they are judged against; `recordAnswer` returns it as `budgetMs` for the banner.

`isFluent(null, score)` returns `true` — a missing reaction time (timer never started) grants credit, because the failure mode of a broken clock must not be an unprogressable level.

### Advancement rule
`canAdvance()` requires **both**:
1. every note introduced at the current level is at score ≥ 4 — that is the level's own content, no exceptions
2. ≥ `ADVANCE_RATIO` (90%) of the whole cumulative pool is at score ≥ 4 — that is retention

Split in two because they answer different questions, and because requiring literally all of a 40+ item pool let any single sticky note veto the level however well everything else was known. `LevelProgress` shows both counts for that reason.

### Lapse queue
A wrong answer schedules the note to reappear after 2 and again after 5 further notes (`LAPSE_GAPS`), ahead of the weighted draw. Random weighting alone can leave a fresh mistake unseen for dozens of items, by which point the correction has been forgotten. Both gaps are ≥ 2 so a lapse never becomes an immediate repeat; anything falling due for the note just shown is dropped. Deliberately **not persisted** — a lapse is about the last few seconds of attention and should not resurface after a reload.

**State versioning:** `STATE_VERSION` (currently 3) is stored in `jnote_state`. On load, a mismatch discards saved state entirely rather than reinterpreting scores earned under different rules — and since the curriculum gets renumbered, a saved level can point at content that no longer exists. Bump it whenever the scoring rules or level numbering change.

### Audio (Safari-critical)
Safari requires `AudioContext.resume()` to be called **synchronously within a user gesture**. The `touchAudio()` function in `audioEngine.js` does this — it must be called synchronously in click/keydown handlers before any async. `initFromGesture()` in `useAudio.js` wraps this. Tone.js was removed; synthesis is native Web Audio API (triangle + sine oscillators, lowpass filter, ADSR envelope).

`touchAudio()` is the **only** thing that creates the AudioContext. `whenRunning()` returns early when there is no context yet rather than building one, because a context created before a gesture is born blocked: its pending `resume()` can fire a long-stale note minutes later, and it wastes the one chance a browser gives to create an already-running context inside a gesture.

### First-gesture unlock (`note` mode only)
The first note is drawn on page load, before any interaction exists, so its audio can never play — no browser will sound it. `App.jsx` therefore attaches capture-phase `pointerdown`/`keydown` listeners on `window` that unlock audio on the **first gesture anywhere** (not just an answer) and then sound the note already on screen. Listeners detach once `isAudioReady()` is true. This only applies in `note` mode — see "Sound timing" below.

The replay is **deferred by `UNLOCK_REPLAY_MS` (300 ms)** and skipped if feedback appeared or `noteSerial` moved in the meantime — i.e. if the unlocking gesture turned out to be an answer, which brings its own note `FEEDBACK_MS` later. Deciding immediately produces two notes back to back: `pointerdown` fires long before the `click` it belongs to is dispatched as an answer, so the replay would fire first and the answer's note would follow it.

### Error sound
`playError()` is the same buzz as sibling project jread (`jread/audio.js` → `playIncorrect`): sawtooth dropping 180 → 90 Hz over 300 ms, 360 ms total. It fires **synchronously inside the answer gesture** via the `onWrongAnswer` callback of `useDrillSession`. Silenced only in `off` mode — it plays in both `answer` and `note` modes.

**Trap — `resume()` is async.** Every sound goes through `whenRunning(schedule)` in `audioEngine.js`, which resumes the context and defers scheduling until the promise settles. Do NOT write `if (ctx.state === 'suspended') return;` and schedule in the same tick: a sound requested straight from the unlocking gesture is scheduled against a still-frozen clock and is silently lost. This bit the error buzz — it was inaudible while note playback worked, purely because notes are scheduled from a later timer by which point `resume()` has settled.

### Sound timing — after the answer by default
Three modes, cycled by one control in `App.jsx` (`SOUND_MODES`):

| Mode | Behaviour |
|------|-----------|
| `answer` (default) | the pitch sounds **after** the answer, via `onAnswer` |
| `note` | the pitch sounds as the note is drawn, via `onNoteShown` |
| `off` | silent |

**Why `answer` is the default.** The drill only ever asks for the **letter** — `submitAnswer` compares against `currentNote.name` and ignores octave and staff. A pitch played before the answer therefore hands the answer over: anyone with even rough pitch recognition can score without reading the staff at all, and the reading skill silently stops being trained while the levels still tick past. Sounding it afterwards keeps the ear‑eye association but cannot substitute for reading. `note` mode is retained for deliberate ear training.

On a wrong answer the correct pitch follows the error buzz by `WRONG_PITCH_MS` (400 ms), clearing the buzz's 360 ms, and the next note is not revealed for `FEEDBACK_WRONG_MS` (1600 ms) — so the three never overlap. That makes the sound a correction: this is what the note you just misread sounds like.

**The first-gesture unlock only runs in `note` mode.** Replaying the on-screen note after unlocking would hand over the very first answer in `answer` mode; there, the answer gesture unlocks the context itself, and `whenRunning()` defers the post-answer pitch until `resume()` settles.

`useDrillSession` still pre-picks the next note on answer submission so the reveal has its note ready.

### Feedback timing
A correct answer holds for `FEEDBACK_MS` (730 ms); a wrong one for `FEEDBACK_WRONG_MS` (1600 ms). The banner reveals the note that was actually on screen, and that correction is the most useful moment in the loop — at 730 ms it was gone before it could be read.

### VexFlow rendering
`GrandStaffDisplay` is a fully imperative component — VexFlow draws into a `ref` div. On each `noteId` change (and when `showLedgerCue` flips), the container is cleared (`innerHTML = ''`) and redrawn. Always shows full grand staff; the non-quiz clef gets a whole rest. The quiz note is coloured blue (`#2563eb`).

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

### Note colour — one blue, no landmark green
Every quiz note is drawn in the same blue (`NOTE_COLOR`) on the main staff. `isLandmark` stays in the data and drives `explanation.js`'s mistake explanations, but it no longer affects main-staff rendering — only `ExplanationDiagram`'s small companion render uses a distinct colour for the reference note.

### Mistake explanations (not timeout hints)
There is no pre-answer scaffolding any more — every note is attempted cold, full stop. `ExplanationPanel` appears only after a **wrong** answer (`useDrillSession`'s `awaitingDismissal`, gated by the "Explanations on/off" control), and only disappears when manually dismissed via `advance()` (Continue button, click, or Enter/Space) — there is no auto-timeout while it's on screen.

`explanation.js` builds one of two sentence forms for the missed note:
- If the note itself is a landmark: "This is landmark note X — (precise line description)".
- Otherwise: "Starting with landmark note X on (line), count up/down N notes", where the reference note is the nearest genuine landmark for ordinary notes, or the nearest already-introduced note (landmark **or** cross-staff sibling, same clef, level ≤ this note's level) for cross-staff notes. Chaining cross-staff notes off each other — they're taught in tight, 2-diatonic-step groups — keeps every cross-staff count to 1–2 steps instead of the 8–9 steps a genuine landmark alone would require.

`describeLine()` replaces the old hand-written `LANDMARK_DESC` map with one numeric vocabulary derived straight from `staffLine()`/`ledgerPosition()`: `"treble line 2"`, `"bass space 3"`, `"1st ledger line above the treble staff"`, `"2nd ledger space below the bass staff"` — no more named shortcuts like "Middle C" or "bass top line".

`ExplanationDiagram` renders the reference note plus each step out to the missed note as real VexFlow `StaveNote`s (so ledger lines draw themselves), revealing one per tick (~550ms) rather than animating in place — the same redraw-on-change pattern `GrandStaffDisplay` already uses.

### Ledger line colour cue
Ledger lines default to grey (`#444`) and are drawn outward from the owning stave. While a mistake explanation is on screen, `showLedgerCue` tints the missed note's ledger lines to match its notehead via `setLedgerLineStyle()`, which spells out staff ownership — the entire difficulty of a cross-staff note.

### Layout stability
Unlike the old fixed-`22px` `HintLabel`, `ExplanationPanel` has variable height — a full sentence plus diagram and button doesn't fit on one line — so the layout can shift slightly when a mistake explanation appears. This is a deliberate trade-off: richer content needed more room than a single nowrap line could give.

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
- **No per-item diagnostics UI:** `rtLog` now records the letter actually answered (`answer`), so off-by-one-ledger misreads can be distinguished from wrong-staff misreads — but nothing surfaces it yet. A per-item table (score, attempts, accuracy, median RT, top confusion) is the natural next step, and the data is accruing in the meantime.
- **No acquisition step:** a brand-new item is still tested cold on its first sighting, just with a 6 s budget. An untimed "look, name, confirm" first exposure would be gentler.
- **Outward cross-staff notes not covered:** only the *inward* overlap is drilled. Left-hand notes written above the treble staff, or right-hand notes below the bass staff, are rare in real music and are not in the curriculum.
- **MIDI input:** Tone.js was removed; MIDI would need a separate WebMIDI API integration.
- **Mobile:** Layout is desktop-first. The keyboard may be cramped on small screens.
- **Reset also clears rtLog:** The reset button wipes all progress including reaction time history.
- **No user accounts:** All state is localStorage only — per-device, not synced.

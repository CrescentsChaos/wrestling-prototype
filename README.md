# WrestleForge — Pro Wrestling Simulator (2K Overhaul)

A dependency-free browser wrestling game rebuilt to feel like a broadcast-quality
sports sim: cinematic entrances, a finisher-meter match engine, live commentary,
an attribute radar chart, and a "Tale of the Tape" match-setup screen — all on
top of the original 12-wrestler roster, two championships, and persistent
career history.

## Run

Because the game loads `wrestlers.json` with `fetch()`, run it through a local
static server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `index.html` — UI: Home (Superstar Spotlight), Roster, Titles, Match, History
  screens + wrestler profile modal + entrance cinematic overlay
- `css/style.css` — broadcast-style dark arena UI: diagonal chrome, glowing
  finisher meters, spotlight hero, toast callouts
- `js/app.js` — game state, roster filtering, match engine, synthesized SFX,
  career/title persistence
- `wrestlers.json` — editable wrestler + championship database
- `assets/wrestlers/` — wrestler portrait assets (original placeholder art —
  swap in your own licensed images)

## What's new in this pass

- **Superstar Spotlight** — a rotating hero banner on Home featuring the
  roster's top-rated stars, with quick links into Exhibition, Roster and Gold.
- **Cinematic entrances** — booking a match now opens a full-screen entrance
  sequence: each wrestler's name and intro line animate in over a sweeping
  spotlight, then a "VS" clash and bell before the bell-to-bell action starts.
- **Finisher meter system** — offense charges a glowing meter per wrestler;
  finishers only fire once it's full ("FINISHER READY" pulses on the HUD and
  pops a toast), giving matches a real build-to-the-big-moment rhythm instead
  of random finisher spam.
- **Two-man commentary** — play-by-play lines are now followed by color
  commentary flavor text on reversals, signatures, finishers, kick-outs and
  weapon spots, tagged in the live log like a broadcast feed.
- **Live toast callouts** — REVERSAL!, FINISHER READY, KICK OUT! and TAP OUT!
  flash on screen as they happen.
- **Tale of the Tape** — the Match screen now shows big fighter-select tiles
  with portrait, name and OVR badge, plus a head-to-head stat comparison
  (mirrored bars, one color per side) across all eight attributes before you
  book the match. Match type is now a chip selector instead of a dropdown.
- **Attribute radar chart** — every wrestler's profile modal includes an
  SVG "attribute wheel" (strength, striking, grappling, submission, speed,
  stamina, durability, charisma) alongside their bio, moveset and record.
- **Synthesized sound** — a bell, crowd pop, impact thud, submission tap and
  finisher stinger are generated live via the Web Audio API (no audio files
  to ship), with a mute toggle in the top bar that persists across sessions.
- **Redesigned live HUD** — diagonal name plates, segmented HP bars that shift
  color when a wrestler is in danger, stamina/momentum mini-bars, and a
  center "momentum tug" bar showing who currently has the advantage.
- **Match of the Year badge** — 5-star matches now get a MOTY ribbon on the
  result card in addition to the star rating.
- **Everything from the prior pass carries over**: weapon spots in Extreme
  Rules / Falls Count Anywhere, Submission-only finishes, Iron Man falls with
  HP/meter resets between falls, crowd heat feeding into star ratings, two
  defended championships, and full match history / coin / record persistence
  in `localStorage`.

## Expand the engine further

Add tag matches, battle royals, Royal Rumble elimination logic, managers,
referee bump/DQ logic, rivalries, promos, a full booking/season mode, AI
difficulty, injuries, and a proper move database with per-move flavor text
and unique finisher animations per archetype.

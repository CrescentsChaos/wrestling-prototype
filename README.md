# WrestleForge — Pro Wrestling Simulator (2K Overhaul)

A dependency-free browser wrestling game rebuilt to feel like a broadcast-quality
sports sim: cinematic entrances, a control/stamina-driven match engine with real
pinfall and submission mechanics, live commentary, an attribute radar chart, and
a "Tale of the Tape" match-setup screen — all on top of a 13-wrestler roster,
two championships, and persistent career history.

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
  finish meters, spotlight hero, toast callouts
- `js/app.js` — game state, roster filtering, match engine, synthesized SFX,
  career/title persistence
- `wrestlers.json` — editable wrestler + championship database
- `assets/wrestlers/` — 200×200 wrestler portrait assets (original placeholder
  art — swap in your own licensed images, same filenames)

## Wrestler data model

Each wrestler in `wrestlers.json` now has:

- `nicknames` — an array (2+) instead of a single string
- `signatures` — an array of build-up moves that boost momentum and can score
  the occasional near-fall, but never end the match on their own
- `super_finisher` — the big impact/aerial/power finishing move, used for
  pinfall attempts
- `submission_finisher` — a separate finishing submission hold, used for
  tap-out attempts
- `moveset` — regular offense only; signatures and finishers are never
  duplicated in this list

## Match engine — no hit points, real finishes

The old build tracked a numeric HP pool per wrestler and ended matches by
draining it to zero. That's gone. The new engine tracks **stamina**,
**momentum** and a **finish meter** only — no damage numbers appear anywhere
in the log.

- Regular moves, signatures and the super finisher all build momentum and a
  finish meter while draining stamina; bigger moves cost more stamina and
  build the meter faster.
- Once a wrestler's finish meter is full, they go for the finish: high
  submission-stat wrestlers lean toward locking in their **submission
  finisher** (a real tap-out attempt, resolved on submission skill vs.
  opponent durability/stamina/grappling), others go for their **super
  finisher** and a **pinfall cover**.
- **Kick-out and tap-out odds** come from stamina, durability, momentum and
  match length — not a health bar. A gassed opponent is easier to pin or
  make tap; a fresh one kicks out or fights to the ropes.
- Regular moves and signatures can also score **surprise near-falls** (a
  roll-up, a school-boy) at low odds — real "OMG, nearly!" drama, exactly as
  real wrestling produces upsets off unlikely moves.
- **Comeback bursts**: a gassed wrestler who's well behind on momentum has a
  chance to dig in for a sudden second wind and swing things back.
- **Double-down spots**: in a close, extended match, both competitors can go
  down together for a beat of drama before the referee's count restarts the
  action.
- **Submission** matches disable pinfall entirely — the only way to win is a
  tap-out.
- **Falls Count Anywhere / Extreme Rules** add weapon spots (steel chairs,
  kendo sticks, the announce table) that boost momentum and the finish meter
  without introducing damage numbers.
- **Iron Man** matches play to multiple falls, resetting stamina/momentum/meter
  (not health) between falls, and decide ties on the falls count.
- If neither wrestler finishes the other before the time limit, the match
  goes to a **decision** based on who controlled more of the match (offense
  landed, weighted by move tier) — a real wrestling judging concept, not a
  leftover health total. Dead-even control ends in a draw.

## What's new in this pass

- **Split finishers** — every wrestler has a super finisher (pinfall) and a
  submission finisher (tap-out), so matches end in genuinely different ways
  depending on who's in the ring and how the finish meter gets spent.
- **Multiple nicknames** per wrestler, shown throughout the UI and listed in
  full on the profile modal.
- **Square 200×200 portraits** for every wrestler, including a brand-new
  13th roster member (Atlas King) built from a previously unused art asset.
- **Superstar Spotlight** — a rotating hero banner on Home featuring the
  roster's top-rated stars, with quick links into Exhibition, Roster and Gold.
- **Cinematic entrances** — booking a match now opens a full-screen entrance
  sequence: each wrestler's name and intro line animate in over a sweeping
  spotlight, then a "VS" clash and bell before the bell-to-bell action starts.
- **Two-man commentary** — play-by-play lines are followed by color
  commentary flavor text on reversals, signatures, finishers, submissions,
  kick-outs, comebacks and weapon spots.
- **Live toast callouts** — REVERSAL!, FINISH READY, KICK OUT!, TAP OUT! and
  COMEBACK! flash on screen as they happen.
- **Tale of the Tape** — the Match screen shows big fighter-select tiles with
  portrait, name and OVR badge, plus a head-to-head stat comparison across
  all eight attributes before you book the match.
- **Attribute radar chart** — every wrestler's profile modal includes an
  SVG "attribute wheel" alongside bio, signatures, both finishers, moveset
  and career record.
- **Synthesized sound** — a bell, crowd pop, impact thud, submission tap and
  finisher stinger are generated live via the Web Audio API, with a mute
  toggle that persists across sessions.
- **Redesigned live HUD** — diagonal name plates, stamina/momentum mini-bars,
  a glowing finish meter, and a center "momentum tug" bar — no health bar.
- **Match of the Year badge** — 5-star matches get a MOTY ribbon on the
  result card in addition to the star rating.
- Weapon spots in Extreme Rules / Falls Count Anywhere, Submission-only
  finishes, Iron Man falls, crowd heat feeding into star ratings, two
  defended championships, and full match history / coin / record
  persistence in `localStorage` all carry over.

## Expand the engine further

Add tag matches, battle royals, Royal Rumble elimination logic, managers,
referee bump/DQ logic, rivalries, promos, a full booking/season mode, AI
difficulty, injuries, and a proper move database with per-move flavor text
and unique finisher animations per archetype.


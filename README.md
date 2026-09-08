# WrestleForge — Pro Wrestling Simulator

A dependency-free browser wrestling game with a dark premium arena UI, a 12-wrestler roster database, full wrestler profiles, two defended championships, a match simulation engine (momentum, stamina, damage, reversals, weapons, signatures, finishers, kick-outs, submissions, Iron Man falls), career records, and persistent match history.

## Run

Because the game loads `wrestlers.json` with `fetch()`, run it through a local static server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `index.html` — UI: Home, Roster, Titles, Match, History screens + wrestler profile modal
- `css/style.css` — responsive dark arena styling
- `js/app.js` — game state, roster filtering, match engine, career/title persistence
- `wrestlers.json` — editable wrestler + championship database
- `assets/wrestlers/` — wrestler portrait assets (original placeholder art — swap in your own licensed images)

## What's new in this pass

- **Deep wrestler profiles** — every wrestler now carries hometown, height, weight, debut year, a bio, a six-move moveset, traits and career win/loss/draw record. Click any roster card (or a champion card) to open the full profile modal.
- **Roster filtering** — search, Face/Heel toggle, weight-class dropdown and sort by rating / name / wins.
- **Two championships** — the Forge World Championship (open weight) and the Ignite Championship (cruiser/light-heavyweight). Book a title match from the Match screen; the Titles screen tracks the current champion and defense count for each belt.
- **Richer match engine** — Extreme Rules and Falls Count Anywhere matches can turn into weapon spots (chair, kendo stick, table, steps). Submission matches only end by tap-out, weighted by the Submission stat. Iron Man matches run to a target number of falls (or a draw on a tie) instead of a single fall.
- **Crowd heat meter** — face offense builds heat, heel offense cools it, tracked live during the match and folded into the post-match star rating.
- **Entrance intro** — each match opens with both wrestlers' entrance text before the bell rings.
- **Star ratings & finish types** — every match now resolves with a finish type (Pinfall, Submission, Referee Stoppage, Decision, Time Limit Draw) and a 1–5 star quality rating, both shown in the result panel and match history.
- **Career persistence** — win/loss/draw records, championship reigns, coin earnings and match history all persist in `localStorage`.

## Expand the engine further

Add tag matches, battle royals, Royal Rumble elimination logic, managers, referee bump/DQ logic, rivalries, promos, booking mode, AI difficulty, injuries, a full season calendar, animated match presentation, and a proper move database with per-move flavor text.

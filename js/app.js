/* ============================================================
   WRESTLEFORGE — game state
   ============================================================ */
let DB = null;
let records = JSON.parse(localStorage.getItem('wf_records') || '{}');   // {id:{wins,losses,draws}}
let titleState = JSON.parse(localStorage.getItem('wf_titles') || '{}'); // {titleId: championWrestlerId}
let history = JSON.parse(localStorage.getItem('wf_history') || '[]');
let coins = parseInt(localStorage.getItem('wf_coins') || '1000', 10);

const $ = s => document.querySelector(s);
const byId = id => DB.wrestlers.find(w => w.id === id);
const titleById = id => DB.titles.find(t => t.id === id);

function saveRecords() { localStorage.setItem('wf_records', JSON.stringify(records)); }
function saveTitles() { localStorage.setItem('wf_titles', JSON.stringify(titleState)); }
function saveCoins() { localStorage.setItem('wf_coins', String(coins)); }
function recordOf(id) { return records[id] || (records[id] = { wins: 0, losses: 0, draws: 0 }); }

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  DB = await fetch('wrestlers.json').then(r => r.json());
  // seed title holders on first run only
  DB.titles.forEach(t => { if (!(t.id in titleState)) titleState[t.id] = t.champion; });
  saveTitles();
  $('#coins').textContent = coins;
  fillClassFilter();
  renderRoster();
  fillSelects();
  fillTitleSelect();
  renderChampions();
  renderTitlesScreen();
  renderHistory();
}

function nav(id) {
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  $('#' + id).classList.add('active');
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x.dataset.screen === id));
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => nav(b.dataset.screen));
$('#quickMatch').onclick = () => { nav('match'); $('#startMatch').click(); };

/* ============================================================
   ROSTER
   ============================================================ */
let activeAlign = '';
function fillClassFilter() {
  const classes = [...new Set(DB.wrestlers.map(w => w.weight_class))].sort();
  $('#classFilter').innerHTML = '<option value="">All Weight Classes</option>' +
    classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

function currentChampionTitles(id) {
  return DB.titles.filter(t => titleState[t.id] === id);
}

function renderRoster() {
  const search = $('#rosterSearch').value.toLowerCase();
  const cls = $('#classFilter').value;
  const sort = $('#sortRoster').value;
  let list = DB.wrestlers.filter(w =>
    w.name.toLowerCase().includes(search) &&
    (!activeAlign || w.alignment === activeAlign) &&
    (!cls || w.weight_class === cls)
  );
  if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'wins') list = [...list].sort((a, b) => recordOf(b.id).wins - recordOf(a.id).wins);
  else list = [...list].sort((a, b) => b.rating - a.rating);

  $('#rosterGrid').innerHTML = list.map(w => {
    const r = recordOf(w.id);
    const belts = currentChampionTitles(w.id);
    return `<article class="w-card" data-id="${w.id}">
      <div class="w-img">
        <span class="align-tag ${w.alignment}">${w.alignment}</span>
        ${belts.length ? `<span class="title-badge" title="${belts.map(b => b.name).join(', ')}">🏆</span>` : ''}
        <img src="${w.image}" alt="${w.name}">
      </div>
      <div class="w-body">
        <span class="rating">${w.rating}</span>
        <div class="w-name">${w.name}</div>
        <div class="w-meta">${w.nickname} • ${w.weight_class}</div>
        <div class="record-line"><b>${r.wins}-${r.losses}${r.draws ? '-' + r.draws : ''}</b> career record</div>
        ${['strength', 'striking', 'grappling', 'speed', 'stamina'].map(k =>
          `<div class="stat"><div class="stat-line"><span>${k}</span><span>${w.stats[k]}</span></div><div class="bar"><i style="width:${w.stats[k]}%"></i></div></div>`
        ).join('')}
      </div>
    </article>`;
  }).join('');

  document.querySelectorAll('.w-card').forEach(card => card.onclick = () => openWrestlerModal(card.dataset.id));
}
$('#rosterSearch').oninput = renderRoster;
$('#classFilter').onchange = renderRoster;
$('#sortRoster').onchange = renderRoster;
document.querySelectorAll('#alignFilter .chip').forEach(chip => chip.onclick = () => {
  document.querySelectorAll('#alignFilter .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeAlign = chip.dataset.align;
  renderRoster();
});

/* ============================================================
   WRESTLER PROFILE MODAL
   ============================================================ */
function openWrestlerModal(id) {
  const w = byId(id);
  const r = recordOf(id);
  const belts = currentChampionTitles(id);
  $('#modalCard').innerHTML = `
    <div class="modal-close"><button id="closeModal">✕</button></div>
    <div class="modal-body">
      <div>
        <img src="${w.image}" alt="${w.name}">
        <div class="modal-tags">${w.traits.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <div>
        <h3 class="modal-name">${w.name}</h3>
        <div class="modal-nick">"${w.nickname}" — ${w.archetype} • ${w.alignment}${belts.length ? ' • 🏆 ' + belts.map(b => b.name).join(', ') : ''}</div>
        <div class="modal-facts">
          <div>Hometown: <b>${w.hometown}</b></div>
          <div>Height: <b>${w.height}</b></div>
          <div>Weight: <b>${w.weight_lbs} lbs</b></div>
          <div>Weight class: <b>${w.weight_class}</b></div>
          <div>Debut: <b>${w.debut_year}</b></div>
          <div>Overall: <b>${w.rating} OVR</b></div>
          <div>Career record: <b>${r.wins}-${r.losses}${r.draws ? '-' + r.draws : ''}</b></div>
          <div>Signature / Finisher: <b>${w.signature} / ${w.finisher}</b></div>
        </div>
        <p class="modal-bio">${w.bio}</p>
        <div class="modal-stats">
          ${Object.entries(w.stats).map(([k, v]) =>
            `<div class="stat"><div class="stat-line"><span>${k}</span><span>${v}</span></div><div class="bar"><i style="width:${v}%"></i></div></div>`
          ).join('')}
        </div>
        <p class="eyebrow" style="margin-top:16px">MOVESET</p>
        <div class="moveset">${w.moveset.map(m => `<span>${m}</span>`).join('')}</div>
      </div>
    </div>`;
  $('#wrestlerModal').classList.remove('hidden');
  $('#closeModal').onclick = () => $('#wrestlerModal').classList.add('hidden');
}
$('#wrestlerModal').onclick = e => { if (e.target.id === 'wrestlerModal') e.currentTarget.classList.add('hidden'); };

/* ============================================================
   CHAMPIONSHIPS
   ============================================================ */
function renderChampions() {
  $('#champGrid').innerHTML = DB.titles.map(t => {
    const c = byId(titleState[t.id]);
    return `<div class="champ-card" data-id="${c.id}">
      <img src="${c.image}" alt="${c.name}">
      <div>
        <div class="champ-title">${t.name}</div>
        <div class="champ-name">${c.name}</div>
        <div class="champ-meta">${t.tier}</div>
      </div>
    </div>`;
  }).join('');
  document.querySelectorAll('#champGrid .champ-card').forEach(el => el.onclick = () => openWrestlerModal(el.dataset.id));
}

function renderTitlesScreen() {
  $('#titlesList').innerHTML = DB.titles.map(t => {
    const c = byId(titleState[t.id]);
    const defenses = history.filter(h => h.titleId === t.id && h.titleResult === 'defense').length;
    return `<div class="title-row" data-id="${c.id}">
      <img src="${c.image}" alt="${c.name}">
      <div>
        <div class="name">${t.name}</div>
        <div class="tier">${t.tier} • Champion: ${c.name} "${c.nickname}"</div>
      </div>
      <div class="defenses"><b>${defenses}</b>successful defenses</div>
    </div>`;
  }).join('');
  document.querySelectorAll('#titlesList .title-row').forEach(el => el.onclick = () => openWrestlerModal(el.dataset.id));
}

function fillTitleSelect() {
  $('#titleMatch').innerHTML = '<option value="">None</option>' +
    DB.titles.map(t => `<option value="${t.id}">${t.name} (${byId(titleState[t.id]).name})</option>`).join('');
}

/* ============================================================
   MATCH SETUP
   ============================================================ */
function fillSelects() {
  ['p1', 'p2'].forEach(id => $('#' + id).innerHTML = DB.wrestlers.map(w =>
    `<option value="${w.id}">${w.name} — ${w.rating} OVR</option>`).join(''));
  $('#p2').selectedIndex = 1;
}

const WEAPONS = ['a steel chair', 'the ring steps', 'a kendo stick', 'the announce table', 'a trash can'];

/* ============================================================
   MATCH ENGINE
   ============================================================ */
function freshState(w) { return { ...w, hp: 100, stamina: 100, momentum: 50, falls: 0 }; }

function sim(aBase, bBase, type, titleId) {
  const A = freshState(aBase), B = freshState(bBase);
  const events = [];
  let crowd = 50;
  let winner = null, loser = null, finish = 'Pinfall', round = 0, draw = false;
  const ironMan = type === 'Iron Man';
  const maxRounds = ironMan ? 140 : 80;
  const targetFalls = ironMan ? 3 : 1;

  const bumpCrowd = (attacker, delta) => {
    crowd += attacker.alignment === 'Face' ? delta : -delta * 0.7;
    crowd = Math.max(0, Math.min(100, crowd));
  };

  const hit = (x, y, kind) => {
    const base = x.stats.striking * .35 + x.stats.grappling * .3 + x.stats.strength * .15 + x.stats.speed * .2;
    const defense = y.stats.durability * .35 + y.stats.speed * .15 + y.stats.grappling * .2 + y.stats.stamina * .3;
    let dmg = Math.max(3, Math.round((base - defense * .42) * (.65 + Math.random() * .8)));
    if (kind === 'signature') dmg += 12;
    if (kind === 'finisher') dmg += 28;
    y.hp = Math.max(0, y.hp - dmg);
    x.momentum = Math.min(100, x.momentum + 8);
    y.momentum = Math.max(0, y.momentum - 7);
    x.stamina = Math.max(5, x.stamina - (5 + Math.random() * 8));
    const move = kind === 'signature' ? x.signature : kind === 'finisher' ? x.finisher : x.moveset[Math.floor(Math.random() * x.moveset.length)];
    events.push({ text: `${x.name} hits ${y.name} with${kind === 'strike' ? ' a' : ''} ${move} — ${dmg} damage.`, big: kind !== 'strike' });
    bumpCrowd(x, kind === 'finisher' ? 6 : kind === 'signature' ? 4 : 2);
    return dmg;
  };

  const weaponSpot = (x, y) => {
    const w = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
    const dmg = 14 + Math.floor(Math.random() * 14);
    y.hp = Math.max(0, y.hp - dmg);
    x.momentum = Math.min(100, x.momentum + 10);
    events.push({ text: `${x.name} introduces ${w} into the match, cracking it across ${y.name} — ${dmg} damage!`, big: true });
    bumpCrowd(x, 8);
  };

  while (!winner && round < maxRounds) {
    round++;
    const totalMom = A.momentum + B.momentum || 1;
    let x = Math.random() < A.momentum / totalMom ? A : B;
    let y = x === A ? B : A;
    const r = Math.random();

    if (r < .07) {
      events.push({ text: `${y.name} reverses the attack out of nowhere!`, big: true });
      y.momentum = Math.min(100, y.momentum + 12);
      bumpCrowd(y, 5);
    } else if ((type === 'Extreme Rules' || type === 'Falls Count Anywhere') && Math.random() < .08) {
      weaponSpot(x, y);
    } else if (r < .13) {
      hit(x, y, 'finisher');
      if (type === 'Submission' || (type !== 'Submission' && x.stats.submission > 80 && Math.random() < .4)) {
        events.push({ text: `${x.name} locks in ${x.finisher} — ${y.name} is fighting for the ropes!`, big: true });
        const tapChance = (x.stats.submission - y.stats.durability * .5 + (100 - y.hp) * .4) / 140;
        if (Math.random() < Math.max(.12, tapChance)) {
          winner = x; loser = y; finish = 'Submission';
          events.push({ text: `${y.name} has no choice — TAP OUT! ${x.name} wins by submission!`, big: true });
        } else {
          events.push({ text: `${y.name} refuses to give up and battles to the ropes!`, big: false });
        }
      } else if (type !== 'Submission') {
        events.push({ text: `${x.name} goes for the cover!`, big: true });
        const kickOutChance = y.hp < 30 ? .28 : .78;
        if (Math.random() > kickOutChance) {
          winner = x; loser = y; finish = 'Pinfall';
          events.push({ text: `1...2...3! ${x.name} wins it!`, big: true });
        } else {
          events.push({ text: `${y.name} kicks out!`, big: false });
        }
      }
    } else if (r < .23) {
      hit(x, y, 'signature');
    } else {
      hit(x, y, 'strike');
    }

    if (!winner && (y.hp <= 8 || x.stamina < 8) && Math.random() < .18 && type !== 'Submission') {
      winner = x; loser = y; finish = y.hp <= 8 ? 'Referee Stoppage' : 'Pinfall';
      events.push({ text: `The referee waves it off — ${x.name} has done enough!`, big: true });
    }

    if (round % 8 === 0) { A.stamina = Math.max(0, A.stamina - 3); B.stamina = Math.max(0, B.stamina - 3); }

    if (winner && ironMan) {
      winner.falls++;
      events.push({ text: `FALL ${winner === A ? A.falls : B.falls} goes to ${winner.name}! ${A.falls}-${B.falls} on falls.`, big: true });
      if (winner.falls < targetFalls && round < maxRounds - 5) {
        A.hp = Math.min(100, A.hp + 35); B.hp = Math.min(100, B.hp + 35);
        A.momentum = 50; B.momentum = 50;
        winner = null; loser = null;
      }
    }
  }

  if (!winner) {
    if (ironMan) {
      if (A.falls === B.falls) { draw = true; finish = 'Time Limit Draw'; events.push({ text: `Time expires with the score tied at ${A.falls}-${B.falls}! It's a draw!`, big: true }); }
      else { winner = A.falls > B.falls ? A : B; loser = winner === A ? B : A; finish = 'Decision on Falls'; }
    } else {
      winner = A.hp > B.hp ? A : B; loser = winner === A ? B : A; finish = 'Decision';
    }
  }

  // star rating: closeness, drama length, average quality, crowd heat, small randomness
  const closeness = draw ? 5 : Math.max(0, 100 - Math.abs((winner ? winner.hp : 50) - (loser ? loser.hp : 50)));
  const quality = (aBase.rating + bBase.rating) / 2;
  const raw = closeness * .25 + quality * .4 + crowd * .2 + Math.min(round, 60) * .2 / 3 + Math.random() * 8;
  const stars = Math.max(1, Math.min(5, Math.round(raw / 20)));

  let titleResult = null;
  if (titleId) {
    const champId = titleState[titleId];
    if (draw) { titleResult = 'retained-draw'; }
    else if (winner.id === champId) titleResult = 'defense';
    else titleResult = 'change';
  }

  return { A, B, winner, loser, draw, finish, events, rounds: round, crowd, stars, titleResult };
}

/* ============================================================
   RUN MATCH
   ============================================================ */
$('#startMatch').onclick = () => {
  const a = byId($('#p1').value), b = byId($('#p2').value);
  if (a.id === b.id) return alert('Choose two different wrestlers.');
  const type = $('#matchType').value;
  const titleId = $('#titleMatch').value || null;

  const ep = $('#entrancePanel');
  ep.classList.remove('hidden');
  ep.innerHTML = `<p><b>${a.name}</b> — ${a.entrance}</p><p><b>${b.name}</b> — ${b.entrance}</p><p class="eyebrow">Ringing the bell…</p>`;
  $('#matchPanel').classList.add('hidden');

  setTimeout(() => {
    const r = sim(a, b, type, titleId);
    renderMatch(r, type, titleId, a, b);
  }, 700);
};

function starString(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function renderMatch(r, type, titleId, aBase, bBase) {
  const p = $('#matchPanel');
  p.classList.remove('hidden');
  const log = r.events.slice(-26).reverse().map(e => `<div class="event${e.big ? ' big' : ''}">${e.text}</div>`).join('');

  let resultLine;
  if (r.draw) resultLine = `<h2>DRAW</h2><p>${r.finish} • ${r.rounds} exchanges</p>`;
  else resultLine = `<h2>${r.winner.name}</h2><p>${r.rounds} exchanges • Finish: ${r.finish}</p>`;

  let titleBanner = '';
  if (titleId) {
    const t = titleById(titleId);
    if (r.titleResult === 'change') titleBanner = `<div class="title-change">NEW CHAMPION — ${r.winner.name} wins the ${t.name}!</div>`;
    else if (r.titleResult === 'defense') titleBanner = `<div class="title-change" style="color:var(--accent)">TITLE RETAINED — ${r.winner.name} successfully defends the ${t.name}.</div>`;
    else if (r.titleResult === 'retained-draw') titleBanner = `<div class="title-change" style="color:var(--muted)">Champion retains the ${t.name} — the title cannot change hands on a draw.</div>`;
  }

  p.innerHTML = `
    <div class="scoreboard">
      <div class="fighter">
        <h3>${r.A.name}</h3>
        <div class="hp"><i style="width:${r.A.hp}%"></i></div>
        <div class="sub-bars">
          <div><div class="mini-label">Stamina</div><div class="mini-bar stamina"><i style="width:${r.A.stamina}%"></i></div></div>
          <div><div class="mini-label">Momentum</div><div class="mini-bar momentum"><i style="width:${r.A.momentum}%"></i></div></div>
        </div>
        ${type === 'Iron Man' ? `<div class="mini-label">Falls: ${r.A.falls}</div>` : ''}
      </div>
      <div><div class="score">VS</div><small>${type.toUpperCase()}</small></div>
      <div class="fighter">
        <h3>${r.B.name}</h3>
        <div class="hp"><i style="width:${r.B.hp}%"></i></div>
        <div class="sub-bars">
          <div><div class="mini-label">Stamina</div><div class="mini-bar stamina"><i style="width:${r.B.stamina}%"></i></div></div>
          <div><div class="mini-label">Momentum</div><div class="mini-bar momentum"><i style="width:${r.B.momentum}%"></i></div></div>
        </div>
        ${type === 'Iron Man' ? `<div class="mini-label">Falls: ${r.B.falls}</div>` : ''}
      </div>
    </div>
    <div class="crowd-meter"><div class="mini-label">CROWD HEAT</div><div class="bar"><i style="width:${r.crowd}%;background:var(--red)"></i></div></div>
    <div class="moment"><b>FINAL MOMENT</b><p>${r.events[r.events.length - 1].text}</p></div>
    <div class="log">${log}</div>
    <div class="result">
      <div class="eyebrow">${r.draw ? 'RESULT' : 'WINNER'}</div>
      ${resultLine}
      <div class="stars">${starString(r.stars)}</div>
      ${titleBanner}
    </div>`;

  // career records + coins
  if (r.draw) {
    recordOf(r.A.id).draws++; recordOf(r.B.id).draws++;
    coins += 60;
  } else {
    recordOf(r.winner.id).wins++; recordOf(r.loser.id).losses++;
    coins += 100 + (titleId ? 50 : 0);
  }
  saveRecords(); saveCoins();
  $('#coins').textContent = coins;

  // title state
  if (titleId && !r.draw && r.titleResult === 'change') {
    titleState[titleId] = r.winner.id;
    saveTitles();
  }

  history.unshift({
    a: aBase.name, b: bBase.name,
    w: r.draw ? 'Draw' : r.winner.name,
    type, duration: r.rounds, date: new Date().toLocaleString(),
    finish: r.draw ? r.finish : r.finish, stars: r.stars,
    titleId, titleResult: r.titleResult
  });
  history = history.slice(0, 40);
  localStorage.setItem('wf_history', JSON.stringify(history));
  renderHistory();
  renderRoster();
  renderChampions();
  renderTitlesScreen();
  fillTitleSelect();
}

/* ============================================================
   HISTORY
   ============================================================ */
function renderHistory() {
  const el = $('#historyList');
  el.innerHTML = history.length ? history.map(h => `
    <div class="history-item">
      <div>
        <b>${h.a} vs ${h.b}</b><br>
        <span>${h.type} • ${h.duration} exchanges • ${h.finish} • ${h.date}${h.titleId ? ' • 🏆 ' + titleById(h.titleId).name : ''}</span>
      </div>
      <div style="text-align:right">
        <strong>${h.w === 'Draw' ? 'DRAW' : 'WIN: ' + h.w}</strong>
        <div class="stars">${starString(h.stars)}</div>
      </div>
    </div>`).join('') : '<div class="history-item">No matches yet.</div>';
}
$('#clearHistory').onclick = () => { history = []; localStorage.removeItem('wf_history'); renderHistory(); };

init();

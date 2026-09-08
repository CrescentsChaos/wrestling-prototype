/* ============================================================
   WRESTLEFORGE 2K — game state
   ============================================================ */
let DB = null;
let records = JSON.parse(localStorage.getItem('wf_records') || '{}');   // {id:{wins,losses,draws}}
let titleState = JSON.parse(localStorage.getItem('wf_titles') || '{}'); // {titleId: championWrestlerId}
let history = JSON.parse(localStorage.getItem('wf_history') || '[]');
let coins = parseInt(localStorage.getItem('wf_coins') || '1000', 10);
let soundOn = localStorage.getItem('wf_sound') !== '0';

const $ = s => document.querySelector(s);
const byId = id => DB.wrestlers.find(w => w.id === id);
const titleById = id => DB.titles.find(t => t.id === id);

function saveRecords() { localStorage.setItem('wf_records', JSON.stringify(records)); }
function saveTitles() { localStorage.setItem('wf_titles', JSON.stringify(titleState)); }
function saveCoins() { localStorage.setItem('wf_coins', String(coins)); }
function recordOf(id) { return records[id] || (records[id] = { wins: 0, losses: 0, draws: 0 }); }

/* ============================================================
   AUDIO — lightweight synthesized SFX, no external files
   ============================================================ */
let actx = null;
function ac() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }
function beep(freq, dur, type, gain, delay) {
  if (!soundOn) return;
  try {
    const c = ac();
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type || 'sine'; osc.frequency.value = freq;
    const t0 = c.currentTime + (delay || 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (e) { /* audio unsupported — fail silently */ }
}
function noiseBurst(dur, gain, delay) {
  if (!soundOn) return;
  try {
    const c = ac();
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource(); src.buffer = buffer;
    const g = c.createGain();
    const t0 = c.currentTime + (delay || 0);
    g.gain.setValueAtTime(gain || 0.15, t0);
    src.connect(g); g.connect(c.destination);
    src.start(t0);
  } catch (e) { /* ignore */ }
}
function playBell() { beep(1500, .35, 'square', .12, 0); beep(1500, .35, 'square', .1, .45); beep(1500, .45, 'square', .1, .9); }
function playPop() { noiseBurst(.6, .1, 0); beep(300, .5, 'sawtooth', .05, 0); }
function playImpact() { beep(110, .18, 'sine', .22, 0); noiseBurst(.12, .08, 0); }
function playFinisher() { beep(80, .5, 'sawtooth', .25, 0); beep(220, .35, 'square', .12, .08); noiseBurst(.3, .12, .05); }
function playTap() { beep(700, .08, 'square', .1, 0); beep(700, .08, 'square', .1, .12); beep(700, .12, 'square', .12, .24); }

function updateSoundIcon() { $('#soundToggle').textContent = soundOn ? '🔊' : '🔇'; }
$('#soundToggle').onclick = () => { soundOn = !soundOn; localStorage.setItem('wf_sound', soundOn ? '1' : '0'); updateSoundIcon(); if (soundOn) beep(660, .08, 'sine', .1, 0); };
updateSoundIcon();

/* ============================================================
   RADAR CHART (attribute wheel)
   ============================================================ */
const RADAR_KEYS = ['strength', 'striking', 'grappling', 'submission', 'speed', 'stamina', 'durability', 'charisma'];
function radarSVG(stats) {
  const n = RADAR_KEYS.length, size = 260, cx = size / 2, cy = size / 2, R = 92;
  const pt = (i, val) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI / n);
    const r = R * (val / 100);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const ring = (frac) => RADAR_KEYS.map((_, i) => pt(i, 100 * frac).join(',')).join(' ');
  const dataPts = RADAR_KEYS.map((k, i) => pt(i, stats[k]).join(',')).join(' ');
  const labels = RADAR_KEYS.map((k, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI / n);
    const lx = cx + (R + 22) * Math.cos(ang), ly = cy + (R + 22) * Math.sin(ang);
    return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#9298a5" font-size="9" font-family="Inter" letter-spacing="1">${k.slice(0, 4).toUpperCase()}</text>`;
  }).join('');
  const spokes = RADAR_KEYS.map((_, i) => {
    const [x, y] = pt(i, 100);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#292d36" stroke-width="1"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${ring(1)}" fill="none" stroke="#292d36" stroke-width="1"/>
    <polygon points="${ring(.66)}" fill="none" stroke="#292d36" stroke-width="1"/>
    <polygon points="${ring(.33)}" fill="none" stroke="#292d36" stroke-width="1"/>
    ${spokes}
    <polygon points="${dataPts}" fill="#f0b42933" stroke="#f0b429" stroke-width="2"/>
    ${labels}
  </svg>`;
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  DB = await fetch('wrestlers.json').then(r => r.json());
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
  renderSpotlight();
}

function nav(id) {
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  $('#' + id).classList.add('active');
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x.dataset.screen === id));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
document.querySelectorAll('nav button, .qa[data-screen]').forEach(b => b.onclick = () => nav(b.dataset.screen));
$('#quickMatch').onclick = () => { nav('match'); $('#startMatch').click(); };

/* ============================================================
   HOME — SPOTLIGHT
   ============================================================ */
let spotlightIdx = 0, spotlightTimer = null;
function renderSpotlight() {
  const top = [...DB.wrestlers].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const draw = () => {
    const w = top[spotlightIdx % top.length];
    const belts = currentChampionTitles(w.id);
    $('#spotlight').innerHTML = `
      <img class="spotlight-img" src="${w.image}" alt="${w.name}">
      <div class="spotlight-body">
        <span class="spotlight-tag">${belts.length ? 'CHAMPION' : 'SUPERSTAR SPOTLIGHT'}</span>
        <h1>${w.name.split(' ')[0].toUpperCase()}<br><em>${w.name.split(' ').slice(1).join(' ').toUpperCase()}</em></h1>
        <p>"${w.nickname}" &mdash; ${w.archetype} out of ${w.hometown}. ${w.bio}</p>
        <div class="spotlight-stats">
          <div><b>${w.rating}</b><span>Overall</span></div>
          <div><b>${w.weight_class.split(' ')[0]}</b><span>${w.weight_class.includes(' ') ? w.weight_class.split(' ').slice(1).join(' ') : 'Class'}</span></div>
          <div><b>${belts.length || '—'}</b><span>Title${belts.length === 1 ? '' : 's'}</span></div>
        </div>
        <button class="primary" onclick="openWrestlerModal('${w.id}')">VIEW PROFILE →</button>
        <div class="spotlight-dots" id="spotDots"></div>
      </div>`;
    $('#spotDots').innerHTML = top.map((_, i) => `<span class="${i === spotlightIdx % top.length ? 'active' : ''}" data-i="${i}"></span>`).join('');
    document.querySelectorAll('#spotDots span').forEach(d => d.onclick = () => { spotlightIdx = +d.dataset.i; draw(); resetSpotTimer(); });
  };
  function resetSpotTimer() { clearInterval(spotlightTimer); spotlightTimer = setInterval(() => { spotlightIdx++; draw(); }, 6500); }
  draw(); resetSpotTimer();
}

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
        <p class="eyebrow">ATTRIBUTE WHEEL</p>
        <div class="modal-radar">${radarSVG(w.stats)}</div>
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
   MATCH SETUP — tale of the tape
   ============================================================ */
let activeMatchType = 'Singles';
function fillSelects() {
  ['p1', 'p2'].forEach(id => $('#' + id).innerHTML = DB.wrestlers.map(w =>
    `<option value="${w.id}">${w.name} — ${w.rating} OVR</option>`).join(''));
  $('#p2').selectedIndex = 1;
  updatePickTile(1); updatePickTile(2);
  renderTapeCompare();
  $('#p1').onchange = () => { updatePickTile(1); renderTapeCompare(); };
  $('#p2').onchange = () => { updatePickTile(2); renderTapeCompare(); };
}

function updatePickTile(side) {
  const w = byId($('#p' + side).value);
  $('#p' + side + 'Img').src = w.image; $('#p' + side + 'Img').alt = w.name;
  $('#p' + side + 'Name').textContent = w.name;
  $('#p' + side + 'Ovr').textContent = w.rating;
}

function renderTapeCompare() {
  const a = byId($('#p1').value), b = byId($('#p2').value);
  if (!a || !b) return;
  const rows = RADAR_KEYS.map(k => `
    <div class="tape-row">
      <span class="tv h">${a.stats[k]}</span>
      <div class="tape-bar left"><i style="width:${a.stats[k]}%"></i></div>
      <span class="tlabel">${k}</span>
      <div class="tape-bar right"><i style="width:${b.stats[k]}%"></i></div>
      <span class="tv">${b.stats[k]}</span>
    </div>`).join('');
  $('#tapeCompare').innerHTML = `
    <div class="tape-head"><span>${a.name}</span><span>${b.name}</span></div>
    ${rows}`;
}

document.querySelectorAll('#matchTypeChips .chip').forEach(chip => chip.onclick = () => {
  document.querySelectorAll('#matchTypeChips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeMatchType = chip.dataset.type;
});

const WEAPONS = ['a steel chair', 'the ring steps', 'a kendo stick', 'the announce table', 'a trash can'];

/* ============================================================
   TOASTS
   ============================================================ */
function addToast(text, kind) {
  const layer = $('#toastLayer');
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'red' ? ' red' : '');
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1750);
}

const COLOR_LINES = {
  reversal: ["What a counter — the crowd can't believe it!", "Reversed! That changes everything.", "Incredible awareness right there."],
  signature: ["That's a signature we've seen end matches before!", "Big move — the momentum has shifted!", "The crowd is coming alive!"],
  finisher: ["THIS COULD BE IT!", "That's the finishing move — get the referee in position!", "It's over if this connects clean!"],
  kickout: ["I don't believe it — a kick out!", "How did they survive that?!", "This crowd is on its feet!"],
  tapout: ["It's academic now — nowhere to go.", "Total agony — this could be it.", ""],
  weapon: ["This match has gone off the rails!", "No disqualifications — anything goes here!", "That's going to leave a mark."]
};
function colorLine(kind) {
  const pool = COLOR_LINES[kind]; if (!pool || !pool.length) return null;
  const line = pool[Math.floor(Math.random() * pool.length)];
  return line || null;
}

/* ============================================================
   MATCH ENGINE
   ============================================================ */
function freshState(w) { return { ...w, hp: 100, stamina: 100, momentum: 50, falls: 0, finisherMeter: 0, finisherReady: false }; }

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

  const chargeMeter = (x, amount) => {
    x.finisherMeter = Math.min(100, x.finisherMeter + amount);
    if (x.finisherMeter >= 100 && !x.finisherReady) {
      x.finisherReady = true;
      events.push({ text: `${x.name}'s finishing move is fired up and ready to go!`, big: true, who: 'PBP', toast: { text: `${x.name.toUpperCase()} — FINISHER READY`, kind: 'gold' } });
    }
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
    events.push({ text: `${x.name} hits ${y.name} with${kind === 'strike' ? ' a' : ''} ${move} — ${dmg} damage.`, big: kind !== 'strike', who: 'PBP' });
    bumpCrowd(x, kind === 'finisher' ? 6 : kind === 'signature' ? 4 : 2);
    if (kind === 'finisher') { x.finisherMeter = 0; x.finisherReady = false; }
    else chargeMeter(x, kind === 'signature' ? 16 : 7);
    if (Math.random() < .3) {
      const line = colorLine(kind === 'strike' ? null : kind);
      if (line) events.push({ text: line, big: false, who: 'Color' });
    }
    return dmg;
  };

  const weaponSpot = (x, y) => {
    const w = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
    const dmg = 14 + Math.floor(Math.random() * 14);
    y.hp = Math.max(0, y.hp - dmg);
    x.momentum = Math.min(100, x.momentum + 10);
    chargeMeter(x, 10);
    events.push({ text: `${x.name} introduces ${w} into the match, cracking it across ${y.name} — ${dmg} damage!`, big: true, who: 'PBP', toast: { text: 'NO HOLDS BARRED', kind: 'red' } });
    if (Math.random() < .4) { const l = colorLine('weapon'); if (l) events.push({ text: l, big: false, who: 'Color' }); }
    bumpCrowd(x, 8);
  };

  const coverAttempt = (x, y) => {
    events.push({ text: `${x.name} goes for the cover!`, big: true, who: 'PBP' });
    const kickOutChance = y.hp < 30 ? .28 : .78;
    if (Math.random() > kickOutChance) {
      winner = x; loser = y; finish = 'Pinfall';
      events.push({ text: `1...2...3! ${x.name} wins it!`, big: true, who: 'PBP' });
      return true;
    } else {
      events.push({ text: `${y.name} kicks out!`, big: false, who: 'PBP', toast: { text: `${y.name.toUpperCase()} KICKS OUT!`, kind: 'gold' } });
      const l = colorLine('kickout'); if (l) events.push({ text: l, big: false, who: 'Color' });
      return false;
    }
  };

  while (!winner && round < maxRounds) {
    round++;
    const totalMom = A.momentum + B.momentum || 1;
    let x = Math.random() < A.momentum / totalMom ? A : B;
    let y = x === A ? B : A;
    const r = Math.random();

    if (r < .07) {
      events.push({ text: `${y.name} reverses the attack out of nowhere!`, big: true, who: 'PBP', toast: { text: 'REVERSAL!', kind: 'gold' } });
      y.momentum = Math.min(100, y.momentum + 12);
      chargeMeter(y, 9);
      bumpCrowd(y, 5);
      const l = colorLine('reversal'); if (l) events.push({ text: l, big: false, who: 'Color' });
    } else if ((type === 'Extreme Rules' || type === 'Falls Count Anywhere') && Math.random() < .08) {
      weaponSpot(x, y);
    } else if (x.finisherReady && r < .5) {
      hit(x, y, 'finisher');
      if (type === 'Submission' || (type !== 'Submission' && x.stats.submission > 80 && Math.random() < .4)) {
        events.push({ text: `${x.name} locks in ${x.finisher} — ${y.name} is fighting for the ropes!`, big: true, who: 'PBP' });
        const tapChance = (x.stats.submission - y.stats.durability * .5 + (100 - y.hp) * .4) / 140;
        if (Math.random() < Math.max(.12, tapChance)) {
          winner = x; loser = y; finish = 'Submission';
          events.push({ text: `${y.name} has no choice — TAP OUT! ${x.name} wins by submission!`, big: true, who: 'PBP', toast: { text: 'TAP OUT!', kind: 'red' } });
          playTap();
        } else {
          events.push({ text: `${y.name} refuses to give up and battles to the ropes!`, big: false, who: 'PBP' });
          const l = colorLine('tapout'); if (l) events.push({ text: l, big: false, who: 'Color' });
        }
      } else if (type !== 'Submission') {
        const l = colorLine('finisher'); if (l) events.push({ text: l, big: false, who: 'Color' });
        coverAttempt(x, y);
      }
    } else if (r < .27) {
      hit(x, y, 'signature');
      if (type !== 'Submission' && Math.random() < .15) coverAttempt(x, y);
    } else {
      hit(x, y, 'strike');
    }

    if (!winner && (y.hp <= 8 || x.stamina < 8) && Math.random() < .18 && type !== 'Submission') {
      winner = x; loser = y; finish = y.hp <= 8 ? 'Referee Stoppage' : 'Pinfall';
      events.push({ text: `The referee waves it off — ${x.name} has done enough!`, big: true, who: 'PBP' });
    }

    if (round % 8 === 0) { A.stamina = Math.max(0, A.stamina - 3); B.stamina = Math.max(0, B.stamina - 3); }

    if (winner && ironMan) {
      winner.falls++;
      events.push({ text: `FALL ${winner === A ? A.falls : B.falls} goes to ${winner.name}! ${A.falls}-${B.falls} on falls.`, big: true, who: 'PBP' });
      if (winner.falls < targetFalls && round < maxRounds - 5) {
        A.hp = Math.min(100, A.hp + 35); B.hp = Math.min(100, B.hp + 35);
        A.momentum = 50; B.momentum = 50;
        A.finisherMeter = 0; B.finisherMeter = 0; A.finisherReady = false; B.finisherReady = false;
        winner = null; loser = null;
      }
    }
  }

  if (!winner) {
    if (ironMan) {
      if (A.falls === B.falls) { draw = true; finish = 'Time Limit Draw'; events.push({ text: `Time expires with the score tied at ${A.falls}-${B.falls}! It's a draw!`, big: true, who: 'PBP' }); }
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
   ENTRANCE CINEMATIC + RUN MATCH
   ============================================================ */
$('#startMatch').onclick = () => {
  const a = byId($('#p1').value), b = byId($('#p2').value);
  if (a.id === b.id) return alert('Choose two different wrestlers.');
  const type = activeMatchType;
  const titleId = $('#titleMatch').value || null;

  const overlay = $('#entranceOverlay'), content = $('#entranceContent');
  $('#matchPanel').classList.add('hidden');
  overlay.classList.remove('hidden');

  const showFighter = (w) => {
    content.innerHTML = `
      <div class="ename ${w.alignment === 'Face' ? 'face' : 'heel'}">${w.name}</div>
      <div class="enick">"${w.nickname}"</div>
      <div class="eintro">${w.entrance}</div>`;
  };

  playPop();
  showFighter(a);
  setTimeout(() => { playPop(); showFighter(b); }, 1000);
  setTimeout(() => { content.innerHTML = `<div class="entrance-vs">VS</div>`; playBell(); }, 2000);
  setTimeout(() => {
    overlay.classList.add('hidden');
    const r = sim(a, b, type, titleId);
    renderMatch(r, type, titleId, a, b);
  }, 2650);
};

function starString(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function renderMatch(r, type, titleId, aBase, bBase) {
  const p = $('#matchPanel');
  p.classList.remove('hidden');
  const log = r.events.slice(-30).reverse().map(e =>
    `<div class="event${e.big ? ' big' : ''}">${e.who ? `<span class="who">${e.who}</span>` : ''}${e.text}</div>`).join('');

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

  const plate = (f, side) => `
    <div class="plate${side === 'right' ? ' right' : ''}">
      <div class="plate-top"><h3>${f.name}</h3>${type === 'Iron Man' ? `<span class="falls">Falls: ${f.falls}</span>` : ''}</div>
      <div class="hp-shell${f.hp < 30 ? ' low' : ''}"><i style="width:${f.hp}%"></i></div>
      <div class="sub-bars">
        <div><div class="mini-label">Stamina</div><div class="mini-bar stamina"><i style="width:${f.stamina}%"></i></div></div>
        <div><div class="mini-label">Momentum</div><div class="mini-bar momentum"><i style="width:${f.momentum}%"></i></div></div>
      </div>
      <div class="finisher-shell${f.finisherMeter >= 100 ? ' ready' : ''}"><i style="width:${f.finisherMeter}%"></i></div>
      <div class="finisher-label${f.finisherMeter >= 100 ? ' ready' : ''}">${f.finisherMeter >= 100 ? 'FINISHER READY' : 'Finisher Meter'}</div>
    </div>`;

  const tugA = Math.round((r.A.momentum / Math.max(1, r.A.momentum + r.B.momentum)) * 100);

  p.innerHTML = `
    <div class="hud">
      ${plate(r.A, 'left')}
      <div class="tug-wrap">
        <div class="match-type-tag">${type}</div>
        <div class="tug-bar"><i style="width:${tugA}%"></i></div>
        <div class="tug-label">VS</div>
      </div>
      ${plate(r.B, 'right')}
    </div>
    <div class="crowd-meter"><div class="mini-label">CROWD HEAT</div><div class="bar"><i style="width:${r.crowd}%;background:var(--red)"></i></div></div>
    <div class="replay"><span class="replay-tag">FINAL MOMENT</span><p>${r.events[r.events.length - 1].text}</p></div>
    <div class="log">${log}</div>
    <div class="result">
      <div class="eyebrow">${r.draw ? 'RESULT' : 'WINNER'}</div>
      ${resultLine}
      <div class="stars">${starString(r.stars)}</div>
      ${r.stars === 5 ? '<div class="moty">MATCH OF THE YEAR CANDIDATE</div>' : ''}
      ${titleBanner}
    </div>`;

  // fire off a few toasts pulled from the sim's flagged events, spaced out
  const toastEvents = r.events.filter(e => e.toast);
  toastEvents.slice(-4).forEach((e, i) => setTimeout(() => addToast(e.toast.text, e.toast.kind === 'red' ? 'red' : null), i * 450));
  if (!r.draw) setTimeout(() => playImpact(), 200);
  if (r.finish === 'Submission') { /* tap sound already played in sim trigger point */ }
  if (r.stars === 5) setTimeout(() => playFinisher(), 500);

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
  renderSpotlight();
}

/* ============================================================
   HISTORY
   ============================================================ */
function renderHistory() {
  const el = $('#historyList');
  el.innerHTML = history.length ? history.map(h => `
    <div class="history-item${h.titleId ? ' title-match' : ''}">
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

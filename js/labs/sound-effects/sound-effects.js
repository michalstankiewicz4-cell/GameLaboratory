// Laboratorium efektów i otoczenia (labs/sound-effects.html): SfxKit (js/audio/sfx/sfxkit.js) przez mikser silnika
// (js/audio/mixer.js). Okna: Dźwięk (lista, parametry, głośność, zagraj / start, zapis — zasób „sound”), Tło miejsca
// (gotowe i zapisane, warstwy z poziomami, zapis — zasób „ambience”), W przestrzeni (źródło wokół słuchacza), Mikser,
// Opis (JSON). Obraz dźwięku w środku. Dla AI: SfxApi.
import { mixer } from '../../audio/mixer.js';
import { SOUNDS, SOUND_IDS, CATS, defaults, normalizeSound, play, start, stopAll, AMBIENCES, ambience, normalizeAmbience } from '../../audio/sfx/sfxkit.js';
import { mixerWindow } from '../shared/mixer-window.js';
import { soundView } from '../shared/sound-view.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const pl = () => window.LabMenu && window.LabMenu.LANG === 'pl';
const KEY = 'gameLab.soundFx.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { def: { sound: 'explosion' }, amb: 'forest', spatial: false, pos: [6, 0, -8], ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };
let def = normalizeSound(L.def), loopH = null, amb = null, ambDef = normalizeAmbience(AMBIENCES[L.amb] || AMBIENCES.forest), repeatT = 0;

mixerWindow($('mixerBox'));
soundView($('view'), { hint: 'PRESS PLAY|sound made live, here, from code' });

/* ---------------- Dźwięk ---------------- */
function fillList() {
  const box = $('list'); box.replaceChildren();
  for (const [cat, [en, plN]] of Object.entries(CATS)) {
    const ids = SOUND_IDS.filter((id) => SOUNDS[id].cat === cat); if (!ids.length) continue;
    box.append(el('div', { className: 'sndCat', textContent: pl() ? plN : en }));
    const grid = el('div', { className: 'sndList' });
    for (const id of ids) {
      const s = SOUNDS[id], b = el('button', { type: 'button', className: 'btn', textContent: (pl() ? s.labelPl : s.label) + (s.loop ? ' ∿' : '') });
      b.dataset.id = id; b.title = s.loop ? 'A steady sound: Start / Stop' : 'A one-shot sound: Play';
      b.onclick = () => { choose({ sound: id }); if (!s.loop) fire(); };
      grid.append(b);
    }
    box.append(grid);
  }
}
function choose(d) {
  if (loopH) { loopH.stop(); loopH = null; }
  def = normalizeSound(d); L.def = def; save(); show();
}
function show() {
  const s = SOUNDS[def.sound];
  for (const b of $('list').querySelectorAll('button')) b.classList.toggle('on', b.dataset.id === def.sound);
  $('pTitle').textContent = (pl() ? s.labelPl : s.label) + ' — ' + (pl() ? 'parametry' : 'parameters');
  $('params').replaceChildren(...Object.entries(s.params).map(([k, [label, lo, hi, step]]) => {
    const inp = el('input', { type: 'range', min: lo, max: hi, step, value: def.params[k] }), out = el('output', { textContent: fmt(def.params[k], step) });
    inp.oninput = () => { def.params[k] = +inp.value; out.textContent = fmt(inp.value, step); if (loopH) loopH.set({ [k]: +inp.value }); L.def = def; save(); json(); };
    return el('div', { className: 'row' }, el('span', { textContent: label }), inp, out);
  }));
  $('gain').value = def.gain; $('gainV').textContent = Math.round(def.gain * 100) + ' %';
  $('play2').hidden = !!s.loop; $('loopBtn').hidden = !s.loop; $('repeat').closest('label').hidden = !!s.loop;
  $('loopBtn').textContent = loopH ? '■ Stop' : '▶ Start';
  json();
}
const fmt = (v, step) => (+step < 1 ? (+v).toFixed(2) : String(Math.round(v)));
const atPos = () => (L.spatial ? L.pos : null);
function fire() {
  const s = SOUNDS[def.sound];
  if (s.loop) { toggleLoop(); return; }
  const r = play(def, { at: atPos() }); status(`${s.label} · ${(r.end - mixer().ctx.currentTime).toFixed(1)} s`);
}
function toggleLoop() {
  if (loopH) { loopH.stop(); loopH = null; status('stopped'); }
  else { loopH = start(def, { at: atPos(), bus: 'ambience' }); status(`${SOUNDS[def.sound].label} · playing`); }
  $('loopBtn').textContent = loopH ? '■ Stop' : '▶ Start';
}
$('play').onclick = fire; $('play2').onclick = fire; $('loopBtn').onclick = toggleLoop;
$('stopAll').onclick = () => { stopAll(); loopH = null; amb = null; clearInterval(repeatT); $('repeat').checked = false; show(); showAmb(); status('silence'); };
$('gain').oninput = () => { def.gain = +$('gain').value; $('gainV').textContent = Math.round(def.gain * 100) + ' %'; if (loopH) loopH.volume(def.gain); L.def = def; save(); json(); };
$('repeat').onchange = () => { clearInterval(repeatT); if ($('repeat').checked) { fire(); repeatT = setInterval(fire, 2000); } };
addEventListener('keydown', (e) => { if (e.code !== 'Space' || (e.target.closest && e.target.closest('input, select, textarea, button'))) return; e.preventDefault(); fire(); });

// zapis: zasób „sound”
function fillSaved() {
  const s = $('savedSel'); s.replaceChildren(new Option(pl() ? '— wybierz —' : '— choose —', ''), ...listAssets('sound').map((n) => new Option(n, n)));
  const a = $('ambSel'); a.replaceChildren();
  const g1 = el('optgroup', { label: 'Ready' }); Object.entries(AMBIENCES).forEach(([id, x]) => g1.append(new Option(pl() ? x.labelPl : x.label, id))); a.append(g1);
  const names = listAssets('ambience'); if (names.length) { const g2 = el('optgroup', { label: 'Saved' }); names.forEach((n) => g2.append(new Option(n, 'asset:' + n))); a.append(g2); }
  a.value = L.amb; if (a.value !== L.amb) a.value = 'forest';
}
$('savedSel').onchange = () => { const n = $('savedSel').value; if (!n) return; const a = getAsset('sound', n); if (a) { choose(a); $('name').value = n; } };
$('save').onclick = () => { const n = $('name').value.trim(); if (!n) { status('Give the sound a name first.'); return; } saveAsset('sound', n, { ...def, label: n }); fillSaved(); $('savedSel').value = n; status(`Saved: ${n} (asset "sound").`); };
$('del').onclick = () => { const n = $('savedSel').value; if (!n) { status('Choose a saved sound.'); return; } removeAsset('sound', n); fillSaved(); };

/* ---------------- Tło miejsca ---------------- */
function showAmb() {
  $('ambLayers').replaceChildren(...ambDef.layers.map((l, i) => {
    const s = SOUNDS[l.sound], inp = el('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: l.level }), out = el('output', { textContent: Math.round(l.level * 100) + ' %' });
    inp.oninput = () => { l.level = +inp.value; out.textContent = Math.round(l.level * 100) + ' %'; if (amb) amb.set(i, l.level); json(); };
    const name = (pl() ? s.labelPl : s.label) + (l.every ? ` (${pl() ? 'co' : 'every'} ${l.every[0]}–${l.every[1]} s)` : '');
    const x = el('button', { type: 'button', className: 'btn lyrX', textContent: '✕', title: 'Remove the layer' }); x.onclick = () => { ambDef.layers.splice(i, 1); restartAmb(); showAmb(); };
    return el('div', { className: 'row' }, el('span', { title: JSON.stringify(l.params) }, x, document.createTextNode(name)), inp, out);
  }));
  $('ambPlay').textContent = amb ? '↻ Restart' : '▶ Start';
  json();
}
function restartAmb() { if (amb) { amb.stop(0.3); amb = ambience(ambDef, { at: atPos() }); } }
$('ambSel').onchange = () => {
  const v = $('ambSel').value; L.amb = v; save();
  ambDef = normalizeAmbience(v.startsWith('asset:') ? getAsset('ambience', v.slice(6)) : AMBIENCES[v]); $('ambName').value = v.startsWith('asset:') ? v.slice(6) : '';
  restartAmb(); showAmb();
};
$('ambPlay').onclick = () => { if (amb) amb.stop(0.3); amb = ambience(ambDef, { at: atPos() }); status('ambience playing'); showAmb(); };
$('ambStop').onclick = () => { if (amb) amb.stop(); amb = null; status('ambience stopped'); showAmb(); };
$('ambAdd').onclick = () => {
  const s = SOUNDS[def.sound]; ambDef.layers.push({ sound: def.sound, params: { ...def.params }, level: 0.8, ...(s.loop ? {} : { every: [4, 12], spread: 0.7 }) });
  ambDef = normalizeAmbience(ambDef); restartAmb(); showAmb();
};
$('ambSave').onclick = () => { const n = $('ambName').value.trim(); if (!n) { status('Give the ambience a name first.'); return; } saveAsset('ambience', n, { ...ambDef, label: n }); L.amb = 'asset:' + n; save(); fillSaved(); status(`Saved: ${n} (asset "ambience").`); };
$('ambDel').onclick = () => { if (!L.amb.startsWith('asset:')) { status('A ready ambience cannot be deleted.'); return; } removeAsset('ambience', L.amb.slice(6)); L.amb = 'forest'; save(); fillSaved(); $('ambSel').onchange(); };
onAssetsChange(fillSaved);

/* ---------------- W przestrzeni ---------------- */
const R = 30;   // promień podkładki w metrach
function showPad() {
  const [x, , z] = L.pos, d = $('dot');
  d.style.left = (50 + x / R * 50) + '%'; d.style.top = (50 + z / R * 50) + '%';
  $('distV').textContent = Math.hypot(x, z).toFixed(1) + ' m'; $('spatial').checked = L.spatial;
  $('pad').style.opacity = L.spatial ? 1 : 0.45;
}
let padDrag = false;
const padAt = (e) => { const r = $('pad').getBoundingClientRect(), x = ((e.clientX - r.left) / r.width * 2 - 1) * R, z = ((e.clientY - r.top) / r.height * 2 - 1) * R; L.pos = [Math.round(x * 10) / 10, 0, Math.round(z * 10) / 10]; save(); showPad(); };
$('pad').addEventListener('pointerdown', (e) => { padDrag = true; $('pad').setPointerCapture(e.pointerId); padAt(e); });
$('pad').addEventListener('pointermove', (e) => { if (padDrag) padAt(e); });
$('pad').addEventListener('pointerup', () => { padDrag = false; if (loopH) { loopH.stop(0.2); loopH = start(def, { at: atPos(), bus: 'ambience' }); } restartAmb(); });
$('spatial').onchange = () => { L.spatial = $('spatial').checked; save(); showPad(); if (loopH) { loopH.stop(0.2); loopH = start(def, { at: atPos(), bus: 'ambience' }); } restartAmb(); };
// słuchacz w środku, patrzy na −z (w górę podkładki) — tak stoi domyślnie słuchacz Web Audio

/* ---------------- Opis (JSON) ---------------- */
function json() { $('jsonText').value = JSON.stringify({ sound: def, ambience: ambDef }, null, 1); }
$('jsonApply').onclick = () => {
  try { const j = JSON.parse($('jsonText').value); if (j.sound) choose(j.sound); if (j.ambience) { ambDef = normalizeAmbience(j.ambience); restartAmb(); showAmb(); } $('jsonMsg').textContent = 'Applied.'; }
  catch (e) { $('jsonMsg').textContent = 'Not applied: ' + e.message; }
};
$('jsonCopy').onclick = async () => { try { await navigator.clipboard.writeText($('jsonText').value); $('jsonMsg').textContent = 'Copied.'; } catch { $('jsonMsg').textContent = 'Copy it from the box.'; } };

/* ---------------- dla AI ---------------- */
// SfxApi: play(opis | id, { at }) — zagraj; start(opis) → uchwyt dźwięku ciągłego; ambience(opis | id) → uchwyt tła;
// sounds — rodzaje z parametrami; ambiences — gotowe tła; stop() — cisza; save(nazwa, opis) — zasób „sound”
window.SfxApi = {
  play: (d, o) => { const r = play(d, o); return { seconds: +(r.end - mixer().ctx.currentTime).toFixed(2) }; },
  start: (d, o) => start(d, o), ambience: (a) => { if (amb) amb.stop(0.3); amb = ambience(a); return amb; },
  sounds: Object.fromEntries(SOUND_IDS.map((id) => [id, { label: SOUNDS[id].label, loop: !!SOUNDS[id].loop, params: defaults(id) }])),
  ambiences: Object.fromEntries(Object.entries(AMBIENCES).map(([k, a]) => [k, a.label])),
  stop: () => $('stopAll').onclick(),
  save: (n, d) => { saveAsset('sound', String(n), { ...normalizeSound(d || def), label: String(n) }); fillSaved(); return true; },
};
function apiTab() {
  if (!window.LabConsole) return;
  const box = el('div', { className: 'sndApi' }), ta = el('textarea', { className: 'mono', rows: 4, spellcheck: false });
  ta.value = JSON.stringify({ sound: 'explosion', params: { size: 0.9, distance: 0.3, debris: 0.8 } });
  const out = el('p', { className: 'note', textContent: 'A sound as JSON. Kinds: ' + SOUND_IDS.join(', ') + '.' }), go = el('button', { type: 'button', textContent: 'Play (SfxApi.play)' });
  go.onclick = () => { try { out.textContent = 'Playing: ' + JSON.stringify(window.SfxApi.play(JSON.parse(ta.value))); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  box.append(ta, go, out); window.LabConsole.addTab({ id: 'sfxapi', title: 'API', titlePl: 'API', el: box });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

fillList(); fillSaved(); show(); showAmb(); showPad();
window.__sfx = { get def() { return def; }, get amb() { return amb; }, mixer: mixer() };

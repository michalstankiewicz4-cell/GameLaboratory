// Laboratorium UI gry (labs/gameui.html): UI gry z danych (js/gameui/gameui.js) nad sceną bazową — morze i niebo
// (js/labs/shared/stage.js), kamera krąży powoli. Okna: Interfejs (nazwa, ekrany, HUD, okna; zapis jako zasób „ui”),
// Skórka (tokeny; zasób „uiskin”), Stan gry (suwaki, symulacja, zdarzenia), Dialog, Definicja (JSON). Dla AI: GameUIApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { createGameUI, normalizeUI, emptyUI } from '../../gameui/gameui.js';
import { SKINS, TOKENS, FONTS, resolveSkin } from '../../gameui/skins.js';
import { HUD_TYPES, ANCHORS } from '../../gameui/hud.js';
import { SAMPLES, sampleState } from './samples.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.gameui.v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { src: 'sample:command', ...(saved || {}) };   // src: 'sample:<id>' | 'asset:<nazwa>'
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };

/* ---------------- scena za UI ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 9000);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene);
stage.setSurface('sea'); stage.setLight('afternoon');

/* ---------------- UI gry ---------------- */
let state = sampleState();
const startDef = () => {
  if (L.src.startsWith('asset:')) { const a = getAsset('ui', L.src.slice(6)); if (a) try { return normalizeUI(a); } catch { /* zły zasób */ } }
  return clone((SAMPLES[L.src.slice(7)] || SAMPLES.command).def);
};
const ui = createGameUI($('view'), startDef(), { state });
ui.on((a, arg) => {
  if (a === 'event' || a === 'quit') { ui.log(a === 'quit' ? 'Quit pressed (the game decides what it means)' : `Event: ${arg}`, 'info'); status(`action: ${a}${arg ? ' ' + arg : ''}`); }
  if (a === 'choice') $('dRes').textContent = arg >= 0 ? `Chosen: ${arg + 1}` : 'Line read.';
  if (a === 'screen' || a === 'resume') fillScreens();
  if (window.LabLog && a !== 'screen') window.LabLog.add('info', `Game UI: ${a}${arg != null ? ' ' + arg : ''}`);
});

/* ---------------- Interfejs ---------------- */
function fillDefSel() {
  const s = $('defSel'); s.replaceChildren();
  const g1 = document.createElement('optgroup'); g1.label = 'Samples';
  for (const [id, x] of Object.entries(SAMPLES)) g1.append(new Option(x.label, 'sample:' + id));
  s.append(g1);
  const names = listAssets('ui');
  if (names.length) { const g2 = document.createElement('optgroup'); g2.label = 'Saved'; names.forEach((n) => g2.append(new Option(n, 'asset:' + n))); s.append(g2); }
  s.value = L.src; if (s.value !== L.src) s.selectedIndex = 0;
}
function fillSkinSel() {
  const s = $('skinSel'); s.replaceChildren();
  for (const [id, x] of Object.entries(SKINS)) s.append(new Option(x.label, id));
  for (const n of listAssets('uiskin')) s.append(new Option('Saved: ' + n, 'asset:' + n));
  const cur = ui.def.skin; s.value = typeof cur === 'string' ? cur : (cur && cur.name ? 'asset:' + cur.name : '');
}
function fillScreens() {
  const ids = Object.keys(ui.def.screens);
  for (const [sel, field] of [['startSel', 'start'], ['pauseSel', 'pause']]) {
    const s = $(sel); s.replaceChildren(new Option(field === 'start' ? '— the game at once —' : '— none —', ''));
    ids.forEach((id) => s.append(new Option(ui.def.screens[id].title || id, id))); s.value = ui.def[field];
  }
  $('screenBtns').replaceChildren(...ids.map((id) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = ui.def.screens[id].title || id; b.classList.toggle('on', ui.screen === id); b.onclick = () => ui.show(id); return b; }));
  $('winBtns').replaceChildren(...ui.def.windows.map((w) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${w.title || w.id}${w.key ? ' (' + w.key + ')' : ''}`; b.onclick = () => ui.toggle(w.id); return b; }));
  const box = $('hudList'); box.replaceChildren();
  ui.def.hud.forEach((d, i) => {
    const row = document.createElement('div'); row.className = 'hudRow';
    const t = document.createElement('span'); t.textContent = `${d.type} · ${d.at || 'tl'}${d.label ? ' · ' + d.label : ''}${d.bind ? ' ← ' + d.bind : ''}`;
    const del = document.createElement('button'); del.type = 'button'; del.textContent = '✕'; del.title = 'Remove from the HUD';
    del.onclick = () => { const d2 = clone(ui.def); d2.hud.splice(i, 1); apply(d2); };
    row.append(t, del); box.append(row);
  });
  $('defName').value = ui.def.name;
  $('jsonText').value = JSON.stringify(ui.def, null, 1);
}
function apply(def, msg) {
  const keepScreen = ui.screen;
  ui.load(def); if (keepScreen && ui.def.screens[keepScreen]) ui.show(keepScreen); else if (!keepScreen) ui.hide();
  ui.set(state); fillScreens(); fillSkinSel(); showTokens(); if (msg) status(msg);
}
$('defSel').onchange = () => { L.src = $('defSel').value; save(); state = sampleState(); syncSliders(); ui.load(startDef()); ui.set(state); fillScreens(); fillSkinSel(); showTokens(); };
$('startSel').onchange = () => { const d = clone(ui.def); d.start = $('startSel').value; apply(d); };
$('pauseSel').onchange = () => { const d = clone(ui.def); d.pause = $('pauseSel').value; apply(d); };
$('defSave').onclick = () => {
  const n = $('defName').value.trim(); if (!n) { status('Give the UI a name first.'); return; }
  const d = clone(ui.def); d.name = n; saveAsset('ui', n, d); L.src = 'asset:' + n; save(); fillDefSel(); status(`Saved: ${n} (asset "ui").`);
};
$('defDel').onclick = () => { if (!L.src.startsWith('asset:')) { status('A sample cannot be deleted.'); return; } removeAsset('ui', L.src.slice(6)); L.src = 'sample:command'; save(); fillDefSel(); $('defSel').onchange(); };
HUD_TYPES.forEach((t) => $('hudType').append(new Option(t, t)));
ANCHORS.forEach((a) => $('hudAt').append(new Option({ tl: 'Top left', t: 'Top', tr: 'Top right', l: 'Left', c: 'Centre', r: 'Right', bl: 'Bottom left', b: 'Bottom', br: 'Bottom right' }[a], a)));
$('hudAdd').onclick = () => {
  const d = clone(ui.def), type = $('hudType').value;
  const it = { id: type + (d.hud.length + 1), type, at: $('hudAt').value };
  if ($('hudLabel').value) it.label = $('hudLabel').value;
  if ($('hudBind').value) it.bind = $('hudBind').value;
  if (type === 'steps') it.steps = ['0', '1', '2', '3', '4'];
  d.hud.push(it); apply(d, `Added: ${type}`);
};
$('menuBtn').onclick = () => { const id = ui.def.start || ui.def.pause || Object.keys(ui.def.screens)[0]; if (id) ui.show(id); else status('This UI has no screens.'); };
$('playBtn').onclick = () => ui.hide();

/* ---------------- Skórka ---------------- */
Object.entries(SKINS).forEach(([id, s]) => $('skinBase').append(new Option(s.label, id)));
function curSkin() { const s = ui.def.skin; return typeof s === 'string' ? { base: s, tokens: {} } : { base: s.base, tokens: { ...(s.tokens || {}) }, ...(s.name ? { name: s.name } : {}) }; }
function showTokens() {
  const s = curSkin(), full = resolveSkin(s).tokens, box = $('tokens'); box.replaceChildren();
  $('skinBase').value = s.base;
  for (const [k, label] of Object.entries(TOKENS)) {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('span'); l.textContent = label;
    let inp;
    if (k === 'font' || k === 'fontHead') { inp = document.createElement('select'); FONTS.forEach((f) => inp.append(new Option(f.split(',')[0].replace(/"/g, ''), f))); if (!FONTS.includes(full[k])) inp.append(new Option(full[k], full[k])); }
    else { inp = document.createElement('input'); inp.type = 'text'; inp.spellcheck = false; }
    inp.value = full[k];
    const out = document.createElement('output');
    if (/^#[0-9a-f]{6}$/i.test(full[k])) { const c = document.createElement('input'); c.type = 'color'; c.value = full[k]; c.oninput = () => { inp.value = c.value; setToken(k, c.value); }; out.append(c); }
    inp.onchange = () => setToken(k, inp.value);
    row.append(l, inp, out); box.append(row);
  }
}
function setToken(k, v) { const s = curSkin(); s.tokens[k] = v; ui.skin(s); $('jsonText').value = JSON.stringify(ui.def, null, 1); }
$('skinBase').onchange = () => { ui.skin({ base: $('skinBase').value, tokens: {} }); showTokens(); fillSkinSel(); $('jsonText').value = JSON.stringify(ui.def, null, 1); };
$('skinReset').onclick = () => { ui.skin(curSkin().base); showTokens(); fillSkinSel(); };
$('skinSel').onchange = () => {
  const v = $('skinSel').value;
  if (v.startsWith('asset:')) { const a = getAsset('uiskin', v.slice(6)); if (a) ui.skin({ base: a.base, tokens: a.tokens || {}, name: v.slice(6) }); }
  else ui.skin(v);
  showTokens(); $('jsonText').value = JSON.stringify(ui.def, null, 1);
};
$('skinSave').onclick = () => {
  const n = $('skinName').value.trim(); if (!n) { status('Give the skin a name first.'); return; }
  const s = curSkin(); saveAsset('uiskin', n, { base: s.base, tokens: resolveSkin(s).tokens }); ui.skin({ base: s.base, tokens: resolveSkin(s).tokens, name: n });
  fillSkinSel(); status(`Skin saved: ${n} (asset "uiskin").`);
};

/* ---------------- Stan gry ---------------- */
const SL = { sHull: ['ship.hull', 0], sEnergy: ['ship.energy', 0], sSpeed: ['ship.speed', 1], sThrottle: ['ship.throttle', 0], sRudder: ['ship.rudder', 2], sCredits: ['credits', 0] };
const getP = (p) => p.split('.').reduce((o, k) => o[k], state);
const setP = (p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], state)[last] = v; };
function syncSliders() { for (const [id, [p, d]] of Object.entries(SL)) { $(id).value = getP(p); $(id + 'V').textContent = (+getP(p)).toFixed(d); } }
for (const [id, [p, d]] of Object.entries(SL)) $(id).oninput = () => { setP(p, +$(id).value); $(id + 'V').textContent = (+$(id).value).toFixed(d); ui.set(state); };
const MSG = { info: 'Scout drone back at the station.', gain: '+40 iron ore from the asteroid.', alert: 'Hull breach on deck 2!' };
document.querySelectorAll('[data-log]').forEach((b) => { b.onclick = () => ui.log(MSG[b.dataset.log], b.dataset.log); });
$('bannerBtn').onclick = () => ui.banner('WAVE 4', 'Five enemies incoming');

/* ---------------- Dialog ---------------- */
$('dSay').onclick = async () => {
  const choices = $('dChoices').value.split('\n').map((s) => s.trim()).filter(Boolean);
  $('dRes').textContent = '…';
  await ui.say({ who: $('dWho').value, text: $('dText').value, choices, side: $('dSide').value });
};
$('dNarr').onclick = () => ui.say({ who: '', text: 'Night fell over the station. Somewhere in the outer ring, something woke up.', side: $('dSide').value });

/* ---------------- Definicja (JSON) ---------------- */
$('jsonApply').onclick = () => { try { apply(JSON.parse($('jsonText').value), 'Definition applied.'); $('jsonMsg').textContent = 'Applied.'; } catch (e) { $('jsonMsg').textContent = 'Not applied: ' + e.message; } };
$('jsonCopy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(ui.def, null, 1)); $('jsonMsg').textContent = 'Copied.'; } catch { $('jsonMsg').textContent = 'Copy it from the box.'; } };
onAssetsChange(() => { fillDefSel(); fillSkinSel(); });

/* ---------------- dla AI ---------------- */
// GameUIApi: load(def) — definicja 'gamelab-ui'; set(stan) — stan gry (łączony); show(ekran) / hide(); open(okno);
// say({ who, text, choices }) → Promise<wybór>; log(tekst, rodzaj); banner(tekst, podpis); def — obecna definicja
window.GameUIApi = {
  load: (d) => { apply(d); return ui.def; }, set: (s) => { state = { ...state, ...s }; ui.set(state); syncSliders(); return state; },
  show: (id) => ui.show(id), hide: () => ui.hide(), open: (id) => ui.open(id), close: (id) => ui.close(id),
  say: (o) => ui.say(o), log: (m, k) => ui.log(m, k), banner: (t, s) => ui.banner(t, s),
  get def() { return clone(ui.def); }, get state() { return clone(state); }, samples: Object.keys(SAMPLES), skins: Object.keys(SKINS), empty: () => emptyUI(),
};
function apiTab() {
  if (!window.LabConsole) return;
  const el = document.createElement('div'); el.className = 'guiApi';
  const ta = document.createElement('textarea'); ta.className = 'mono'; ta.rows = 5; ta.spellcheck = false;
  ta.value = '{"method": "say", "arg": {"who": "Station AI", "text": "Docking clamps released.", "choices": ["Undock", "Wait"]}}';
  const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Run';
  const out = document.createElement('p'); out.className = 'note';
  out.textContent = 'JSON: { "method": "load" | "set" | "show" | "hide" | "open" | "close" | "say" | "log" | "banner", "arg": … } (log and banner: "arg": [text, kind]). The same in code: GameUIApi.<method>(arg).';
  go.onclick = async () => {
    try {
      const c = JSON.parse(ta.value), f = window.GameUIApi[c.method];
      if (typeof f !== 'function') throw new Error('method: load, set, show, hide, open, close, say, log, banner');
      const r = await (Array.isArray(c.arg) ? f(...c.arg) : f(c.arg)); out.textContent = 'Result: ' + (JSON.stringify(r) || 'done').slice(0, 300);
    } catch (e) { out.textContent = 'Error: ' + e.message; }
  };
  el.append(ta, go, out);
  window.LabConsole.addTab({ id: 'gameuiapi', title: 'API', titlePl: 'API', el });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- pętla ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now(), yaw = 0.6, simT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  yaw += dt * 0.03;
  camera.position.set(Math.sin(yaw) * 160, 26, Math.cos(yaw) * 160); camera.lookAt(0, 6, 0);
  stage.update(dt, camera);
  if ($('sim').checked && !ui.menuOpen) {
    simT += dt;
    state.radar = state.radar.map((p, i) => (p.kind === 'me' ? p : { ...p, x: p.x + Math.sin(simT * 0.3 + i) * 6, y: p.y + Math.cos(simT * 0.25 + i * 2) * 6 }));
    state.ship.energy = Math.max(0, state.ship.energy - dt * 0.6); if (state.ship.energy <= 0) state.ship.energy = 100;
    if ((simT % 1) < dt) { ui.set(state); $('sEnergy').value = state.ship.energy; $('sEnergyV').textContent = state.ship.energy.toFixed(0); }
  }
  ui.tick(dt);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}
fillDefSel(); syncSliders(); ui.set(state); fillScreens(); fillSkinSel(); showTokens();
resize();
window.__gameui = { ui, stage, state: () => state };
requestAnimationFrame(frame);

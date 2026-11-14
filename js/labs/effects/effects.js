// Laboratorium efektów (labs/effects.html): efekty z Hive Hunger (EffectKit, js/render/effects/effects.js) w kosmosie
// sceny bazowej (js/labs/shared/stage.js: niebo kosmosu, słońce). Dwa znaczniki — skąd (A) i dokąd (B); w tle bryła
// z bloków, żeby było widać, jak czarna dziura i kula cieczy zaginają obraz. Efekty liczą się stałym krokiem 1/60 s.
// Okna: Efekt (skala, liczby efektu, zapis pod nazwą — zasób „effect”), Opis, Wydajność. Dla AI: EffectsApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { OrbitControls } from '../../../vendor/three/addons/controls/OrbitControls.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { loadSpace } from '../../scene/space.js';
import { createEffects, FX_DEFAULTS, FX_KINDS, FX_BADGES, STEP } from '../../render/effects/effects.js';
import { buildBody } from '../../models/blocks/blockkit.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.effects.v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { kind: 'orb', scale: 1, values: clone(FX_DEFAULTS), auto: false, savedAs: '', ...(saved || {}) };
for (const k of Object.keys(FX_DEFAULTS)) L.values[k] = { ...FX_DEFAULTS[k], ...(L.values[k] || {}) };
if (!FX_KINDS[L.kind]) L.kind = 'orb';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };

/* ---------------- scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
camera.position.set(0, 5, 20);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene);
stage.setSurface('space'); stage.setSkyMode('space'); stage.setLight({ weather: 'fair', sunEl: 30, sunAz: 40 });
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 2; controls.maxDistance = 200;
loadSpace().then(() => {
  const BK = window.BodyKit, SK = window.SystemKit;
  stage.setSpaceEnvironment(window.ShipKit.makeEnvironment(renderer));
  const ref = BK.GAME_KINDS.sky, deep = SK.SKIES.find((x) => x.id === 'deep');
  const sky = BK.buildBody(ref.groupId, ref.bodyId, { detail: 1, values: (deep && deep.values) || {} }); sky.setRadius(9000); scene.add(sky.group);
}).catch((e) => window.LabLog && window.LabLog.add('warn', 'Space sky: ' + e.message));
// znaczniki: A — skąd, B — dokąd; w tle bryła z bloków (tło dla soczewek)
const A = new THREE.Vector3(-6, 0, 0), B = new THREE.Vector3(6, 0, 0);
const mark = (p, c) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 })); m.position.copy(p); scene.add(m); return m; };
mark(A, 0x6fd0ff); mark(B, 0xffb35a);
const backdrop = buildBody({ shape: 'sphere', radius: 3, voxel: 0.5 }); backdrop.group.position.set(0, 0, -12); scene.add(backdrop.group);

/* ---------------- efekty ---------------- */
let fx = createEffects(scene, { scale: L.scale, settings: L.values });
function remake() { fx.dispose(); fx = createEffects(scene, { scale: L.scale, settings: L.values }); }
// gdzie efekt gra w laboratorium: między A i B (strzał, kula, bąbel, błyskawica), łuk przez kilka punktów (piorun
// łańcuchowy), przy B (odłamki — wyrzucone w górę i na boki), pośrodku (czarna dziura, przed bryłą w tle)
function demo(kind) {
  const arc = [0, 1, 2, 3, 4].map((i) => { const t = i / 4; return [A.x + (B.x - A.x) * t, Math.sin(t * Math.PI) * 3, (i % 2 ? 1.5 : -1.5)]; });
  const at = { shot: { from: A, to: B }, orb: { from: A, to: B }, bubble: { from: A, to: B }, bolt: { path: [A.toArray(), [0, 1.5, 0], B.toArray()] },
    zap: { path: arc }, debris: { at: B, dir: new THREE.Vector3(0, 1, 0.3) }, hole: { at: new THREE.Vector3(0, 0, -4) },
    laser: { from: A, to: B }, piercer: { from: A, to: B }, storm: { from: A, to: B }, tow: { from: A, to: B }, cutter: { from: A, to: B },
    field: { at: A }, marker: { at: B }, portal: { at: new THREE.Vector3(0, 0, -4) }, scan: { at: new THREE.Vector3(0, 0, 0) },
    warp: { from: A, dir: new THREE.Vector3(1, 0.15, 0) },
    smoke: { at: B, dir: new THREE.Vector3(0, 1, 0) }, sparks: { at: B, dir: new THREE.Vector3(-1, 0.4, 0) }, explosion: { at: new THREE.Vector3(0, 0, 0), radius: 2.5 },
    scorch: { at: new THREE.Vector3(0, 0, -8.9), dir: new THREE.Vector3(0, 0, 1), size: 1.5 }, ember: { at: new THREE.Vector3(0, 0, -8.9), dir: new THREE.Vector3(0, 0, 1) } }[kind];
  return fx.play(kind, at);
}

/* ---------------- okno Efekt: liczby wybranego efektu ---------------- */
Object.entries(FX_KINDS).forEach(([id, k]) => $('kind').append(new Option(k.label, id)));
const isColor = (key) => /color|Color|ringColor/.test(key) || key === 'shotColor' || key === 'shockCore';
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
const stepOf = (v) => { const a = Math.abs(v) || 1; const p = Math.pow(10, Math.floor(Math.log10(a)) - 1); return p >= 1 ? 1 : +p.toPrecision(1); };
const fmt = (v) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(v) : (+v).toPrecision(3));
function showFields() {
  const box = $('fields'); box.replaceChildren();
  const vals = L.values[L.kind], def = FX_DEFAULTS[L.kind];
  for (const key of Object.keys(def)) {
    const row = document.createElement('div'); row.className = 'fxRow';
    const name = document.createElement('span'); name.textContent = key; name.title = key;
    const out = document.createElement('output');
    let ctl;
    if (Array.isArray(def[key]) && typeof def[key][0] !== 'number') continue;   // barwy CSS pasa (przebijacz) — bez suwaka
    if (Array.isArray(def[key])) {   // kilka liczb (rozmiar smugi) albo kilka barw (pole siłowe)
      ctl = document.createElement('div'); ctl.className = 'trio';
      def[key].forEach((d, i) => { const n = document.createElement('input');
        if (isColor(key)) { n.type = 'color'; n.value = hex(vals[key][i]); n.oninput = () => { vals[key][i] = parseInt(n.value.slice(1), 16); changed(); }; }
        else { n.type = 'number'; n.step = String(stepOf(d)); n.value = vals[key][i]; n.oninput = () => { const v = parseFloat(n.value); if (Number.isFinite(v)) { vals[key][i] = v; changed(); } }; }
        ctl.append(n); });
    } else if (isColor(key)) {
      ctl = document.createElement('input'); ctl.type = 'color'; ctl.value = hex(vals[key]); out.textContent = '';
      ctl.oninput = () => { vals[key] = parseInt(ctl.value.slice(1), 16); changed(); };
    } else {
      const d = def[key], hi = d > 0 ? d * 4 : 1, st = stepOf(d) / (Number.isInteger(d) ? 1 : 2);
      ctl = document.createElement('input'); ctl.type = 'range'; ctl.min = '0'; ctl.max = String(Number.isInteger(d) ? Math.max(1, Math.round(hi)) : hi); ctl.step = String(Number.isInteger(d) ? 1 : st);
      ctl.value = vals[key]; out.textContent = fmt(vals[key]);
      ctl.oninput = () => { vals[key] = +ctl.value; out.textContent = fmt(vals[key]); changed(); };
    }
    row.append(name, ctl, out); box.append(row);
  }
}
let soonT = 0;
function changed() { save(); clearTimeout(soonT); soonT = setTimeout(() => { remake(); if (!L.auto) demo(L.kind); }, 150); }
function showAll() {
  $('kind').value = L.kind; $('auto').checked = L.auto; $('scale').value = L.scale; $('scaleV').textContent = L.scale + ' m';
  showFields(); fillSaved(); showList();
}
$('kind').onchange = () => { L.kind = $('kind').value; save(); showFields(); showList(); demo(L.kind); };
/* ---------------- okno Efekty: lista z odznakami, filtr po odznakach (wszystkie wybrane naraz) ---------------- */
const badge = (b, tag = 'span') => { const e = document.createElement(tag); e.className = 'badge'; e.dataset.b = b; e.textContent = FX_BADGES[b].label; e.title = FX_BADGES[b].title; return e; };
function showList() {
  const f = $('badgeFilter'); if (!f.childElementCount) for (const b of Object.keys(FX_BADGES)) {
    const btn = badge(b, 'button'); btn.type = 'button';
    btn.onclick = () => { const s = new Set(L.badges || []); s.has(b) ? s.delete(b) : s.add(b); L.badges = [...s]; save(); showList(); };
    f.append(btn);
  }
  const want = L.badges || [];
  [...f.children].forEach((btn) => btn.classList.toggle('on', want.includes(btn.dataset.b)));
  const box = $('fxList'); box.replaceChildren();
  for (const [id, k] of Object.entries(FX_KINDS)) {
    if (!want.every((b) => (k.badges || []).includes(b))) continue;
    const it = document.createElement('div'); it.className = 'fxItem' + (id === L.kind ? ' on' : '');
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = k.label;
    const bs = document.createElement('span'); bs.className = 'bs'; (k.badges || []).forEach((b) => bs.append(badge(b)));
    it.append(nm, bs); it.onclick = () => { $('kind').value = id; $('kind').onchange(); };
    box.append(it);
  }
  if (!box.childElementCount) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'No effect has all these badges.'; box.append(p); }
}
$('scale').oninput = () => { L.scale = +$('scale').value; $('scaleV').textContent = L.scale + ' m'; changed(); };
$('auto').onchange = () => { L.auto = $('auto').checked; save(); };
$('fire').onclick = () => demo(L.kind);
$('clearFx').onclick = () => fx.clear();
$('resetFx').onclick = () => { L.values[L.kind] = clone(FX_DEFAULTS[L.kind]); save(); showFields(); remake(); demo(L.kind); };
addEventListener('keydown', (e) => { if (e.code === 'Space' && !(e.target.closest && e.target.closest('input, select, textarea, button'))) { e.preventDefault(); demo(L.kind); } });

/* ---------------- zapis pod nazwą: zasób „effect” (js/scene/assets.js) ---------------- */
function fillSaved() {
  const names = listAssets('effect'), s = $('savedSel');
  s.replaceChildren(new Option(names.length ? '—' : 'none yet', ''), ...names.map((n) => new Option(n, n)));
  s.value = names.includes(L.savedAs || '') ? L.savedAs : '';
}
function saveFx(n) {
  n = String(n || '').trim(); if (!n) throw new Error('give the effect a name');
  saveAsset('effect', n, { kind: L.kind, scale: L.scale, values: clone(L.values[L.kind]) }); L.savedAs = n; save(); fillSaved(); return n;
}
function loadFx(n) {
  const a = getAsset('effect', n); if (!a || !FX_KINDS[a.kind]) throw new Error(`no saved effect "${n}"`);
  L.kind = a.kind; L.scale = +a.scale || 1; L.values[a.kind] = { ...FX_DEFAULTS[a.kind], ...(a.values || {}) }; L.savedAs = n; $('saveName').value = n;
  save(); showAll(); remake(); demo(L.kind); return a;
}
$('saveFx').onclick = () => { try { status(`Saved: ${saveFx($('saveName').value)} (asset "effect").`); } catch { status('Give the effect a name first.'); } };
$('delFx').onclick = () => { const n = $('savedSel').value; if (!n) { status('Pick a saved effect first.'); return; } removeAsset('effect', n); if (L.savedAs === n) L.savedAs = ''; save(); fillSaved(); status(`Deleted: ${n}.`); };
$('savedSel').onchange = () => { const n = $('savedSel').value; if (n) { loadFx(n); status(`Loaded: ${n}.`); } };
onAssetsChange(fillSaved);

/* ---------------- dla AI ---------------- */
// EffectsApi: play(kind, { from, to | at, dir | path }) — punkty [x, y, z]; set(kind, liczby); save(nazwa) — zasób „effect”
window.EffectsApi = {
  kinds: Object.fromEntries(Object.entries(FX_KINDS).map(([k, x]) => [k, { needs: x.needs, badges: x.badges }])), badges: Object.keys(FX_BADGES),
  find: (...badges) => Object.keys(FX_KINDS).filter((k) => badges.every((b) => FX_KINDS[k].badges.includes(b))),   // efekty z tymi odznakami
  play: (kind, opts) => (opts ? fx.play(kind, opts) : demo(kind)),
  get: (kind = L.kind) => clone(L.values[kind]),
  set: (kind, values) => { if (!FX_KINDS[kind]) throw new Error(`unknown effect "${kind}"`); Object.assign(L.values[kind], values); L.kind = kind; save(); showAll(); remake(); return clone(L.values[kind]); },
  scale: (s) => { if (s != null) { L.scale = Math.max(0.05, +s || 1); save(); showAll(); remake(); } return L.scale; },
  save: (name) => ({ saved: saveFx(name) }), load: (name) => loadFx(name), saved: () => listAssets('effect'),
  counts: () => fx.counts(), clear: () => fx.clear(),
};
function apiTab() {
  if (!window.LabConsole) return;
  const el = document.createElement('div'); el.className = 'fxApi';
  const ta = document.createElement('textarea'); ta.className = 'mono'; ta.rows = 4; ta.spellcheck = false;
  ta.value = JSON.stringify({ kind: 'orb', from: [-6, 0, 0], to: [6, 2, 0] });
  const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Play (EffectsApi.play)';
  const out = document.createElement('p'); out.className = 'note';
  out.textContent = `{ kind, … } — ${Object.entries(FX_KINDS).map(([k, x]) => k + ': ' + x.needs).join('; ')}. Numbers: EffectsApi.set(kind, { … }); save for the scene: EffectsApi.save(name).`;
  go.onclick = () => { try { const { kind, ...o } = JSON.parse(ta.value); out.textContent = 'Played: ' + window.EffectsApi.play(kind, o); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  el.append(ta, go, out);
  window.LabConsole.addTab({ id: 'effectsapi', title: 'API', titlePl: 'API', el });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- pętla: efekty stałym krokiem 1/60 s ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now(), acc = 0, t = 0, autoT = 0, cntT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  acc += dt; let n = 0;
  while (acc >= STEP && n < 6) { fx.step(camera); acc -= STEP; n++; }
  if (n === 6) acc = 0;
  if (L.auto && (autoT += dt) > 1.6) { autoT = 0; demo(L.kind); }
  if ((cntT += dt) > 0.5) { cntT = 0; const c = fx.counts(); status(Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · ') || 'Space or Play: the effect'); }
  backdrop.update(t);
  controls.update();
  stage.update(dt, camera);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer);
  fx.render(renderer, scene, camera, (target) => look.render(scene, camera, target));   // soczewki: czarna dziura, kula cieczy
  window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}
showAll(); resize();
if (window.LabLoad) window.LabLoad.step('Effects', 1);
demo(L.kind);
requestAnimationFrame(frame);
window.__effects = { get fx() { return fx; }, camera, controls };

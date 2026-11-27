// Laboratorium mechaniki — kategoria 1: transmisja ruchu. Tryb „Przedmioty”: każdy przedmiot osobno na stole, z ustawieniami
// (katalog js/labs/mechanics/items.js) — dane, porty i podgląd ruchu. Tryb „Maszyna”: jedna maszyna na żeliwnym łożu z elementów MechKit
// (js/models/mech/mechkit.js) połączonych portami w napędzie (js/behaviors/mech/drive.js):
//   silnik → sprzęgło kłowe → wał → para zębatek 20 : 40 → przekładnia dwustopniowa (16 : 48, 24 : 40) w obudowie z akrylu
//   → łańcuch 18 : 27 → pas klinowy Ø 160 : Ø 80 → sprzęgło kołnierzowe → wał przegubowy (dwa przeguby Cardana, 25°)
//   → przekładnia planetarna (24 / 24 / 72, korona stała) → tarcza hamulca i tarcza z podziałką.
// Kliknięcie elementu — jego właściwości, porty i to, co przez nie płynie. Dla AI: MechanicsApi. Z Tornado.io; części:
// machine.js (maszyna), physics-mode.js (tryb Fizyka), items-mode.js (tryb Przedmioty), items.js (katalog przedmiotów).
import * as THREE from '../../../vendor/three/three.module.js';
import { createStage, WEATHER } from '../shared/sky-stage.js';
import * as MK from '../../models/mech/mechkit.js';
import { KIND_NAME } from '../../behaviors/land/mech/drive.js';
import { ITEMS } from './items.js';
import { loadState } from '../shared/saved.js';
import { buildMachine } from './machine.js';
import { createPhysicsMode } from './physics-mode.js';
import { createItemsMode } from './items-mode.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.mechanics.v1';
const S = loadState(KEY, { mode: 'items', item: 'gear', items: {}, spin: 20, rpm: 600, brake: 20, alpha: 0.25, hit: false, weather: 'fair', sunEl: 40, sunAz: 205 },
  { mode: ['items', 'machine', 'physics'], item: ITEMS.map((i) => i.id), items: (v) => !Array.isArray(v), spin: (v) => v >= 0 && v <= 120, rpm: (v) => v >= 0 && v <= 1500, brake: (v) => v >= 0 && v <= 300, alpha: (v) => v >= 0 && v <= 1, weather: Object.keys(WEATHER) });
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* prywatny tryb */ } };
const TAU = Math.PI * 2, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

const stage = createStage($('view'), { shadow: 4096 });
const { scene, camera, renderer } = stage;
const M = MK.materials();
const root = new THREE.Group(); scene.add(root);


/* ---------------- maszyna (machine.js) ---------------- */
const mc = buildMachine({ scene, root, M });
const { drive, parts, panes, applyAngles, solved, CH, eDisc, cross1, cross2 } = mc;

/* ---------------- pętla ---------------- */
let last = performance.now(), statT = 0, sel = null;
const selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xf2c14e); selBox.visible = false; scene.add(selBox);
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.mode === 'machine') { drive.step(dt, { rpm: S.rpm, brake: S.brake }); applyAngles(); }
  else if (S.mode === 'physics') { ELEC.tick(dt); reg.api.tick(dt); const on = reg.api.powered && (reg.api.run || Math.abs(reg.api.f) > 0.05); phys.step(dt, { w0: reg.api.f * 4 * Math.PI / 4, brake: S.brake, on }); ELEC.power(phys.state.Tm, phys.state.omega, on); applyAngles(); }   // silnik 4-biegunowy: ω_syn = 4π f / p
  else items.frame(dt);
  moveKeys(dt);
  if ((statT += dt) > 0.2) { statT = 0; stats(); }
  if (sel) selBox.update();
  if (S.hit && hitG.visible) syncHit();
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target);
  stage.follow(orbit.target, 7);
  stage.render();
  requestAnimationFrame(loop);
}
const rpmOf = (w) => w * 60 / TAU, fmt = (v, d = 0) => v.toLocaleString('pl', { minimumFractionDigits: d, maximumFractionDigits: d });
const dirOf = (w) => (Math.abs(w) < 1e-3 ? '—' : w > 0 ? '↺' : '↻');   // patrząc od +x wzdłuż osi
function stats() {
  if (S.mode === 'items') { items.itemStats(); return; }
  if (S.mode === 'physics') { physStats(); return; }
  const st = drive.state;
  const rows = [['Silnik', `${fmt(rpmOf(st.omega))} obr/min`], ['Moment silnika', `${fmt(st.Tm, 1)} N·m`], ['Moc silnika', `${fmt(st.P)} W`], ['Moc na hamulcu', `${fmt(st.Pout || 0)} W`],
    ['Sprawność całkowita', `${fmt(eDisc.eta * 100, 1)} %`], ['Przełożenie całkowite', `${fmt(Math.abs(1 / (eDisc.r || 1e-9)), 2)} : 1`], ['Bezwładność zredukowana', `${fmt(st.Jeff * 1e4, 1)} kg·cm²`], ['Wyjście', `${fmt(rpmOf(eDisc.omega), 1)} obr/min, ${fmt(eDisc.T, 1)} N·m`]];
  $('bDrive').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: b })]));
  $('bList').replaceChildren(...parts.flatMap((e) => { const s = el('span', { textContent: e.name }); s.onclick = () => select(e); return [s, el('b', { textContent: `${dirOf(e.omega)} ${fmt(Math.abs(rpmOf(e.omega)), 1)} obr/min · ${fmt(e.T, 1)} N·m` })]; }));
  if (sel) showSel();
  if (window.LabPerf) window.LabPerf.modelRows([['Elementy', String(parts.length)], ['Połączenia', String(drive.edges.length)], ['Ogniwa łańcucha', String(CH.N)]]);
}

/* ---------------- wybór elementu ---------------- */
function select(e) { sel = e; selBox.setFromObject(e.group); selBox.visible = !!e; showSel(); }
function showSel() {
  const e = sel; if (!e) return;
  $('selName').textContent = e.name;
  const rows = [...e.props, ['Prędkość', `${dirOf(e.omega)} ${fmt(Math.abs(rpmOf(e.omega)), 1)} obr/min`], ['Moment przenoszony', `${fmt(e.T, 2)} N·m`], ['Moc', `${fmt(Math.abs(e.T * e.omega))} W`], ['Sprawność od silnika', `${fmt(e.eta * 100, 1)} %`]];
  $('selProps').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  // porty: z czym są połączone i co przez nie płynie
  $('selPorts').replaceChildren(...(e.ports || []).map((p) => {
    const ed = drive.edges.find((x) => (x.a === e && x.pa === p.id) || (x.b === e && x.pb === p.id));
    const other = ed ? (ed.a === e ? ed.b : ed.a) : null, io = ed ? (ed.b === e ? 'wejście' : 'wyjście') : (p.kind === 'obrót' ? 'wolny' : p.kind);
    const li = el('li', {}, el('b', { textContent: p.name }), el('span', { textContent: ` · ${p.kind} · ${io}` }));
    if (other) { const a = el('a', { href: '#', textContent: ` → ${other.name} (${KIND_NAME[ed.type]})` }); a.onclick = (ev) => { ev.preventDefault(); select(other); }; li.append(a); }
    return li;
  }));
}
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(parts.map((p) => p.group), true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.el) o = o.parent; if (o) { select(o.userData.el); return; } }
  sel = null; selBox.visible = false; $('selName').textContent = 'Kliknij element maszyny'; $('selProps').replaceChildren(); $('selPorts').replaceChildren();
}

/* ---------------- kamera ---------------- */
const orbit = { target: new THREE.Vector3(-1.4, 0.9, 0.2), dist: 9, yaw: 0.25, pitch: 0.38 };
const CAMS = { 'Cała maszyna': { t: [-1.4, 0.9, 0.2], dist: 9.5, yaw: 0.25, pitch: 0.4 }, 'Zębatki': { t: [-5.3, 0.9, 0.06], dist: 1.5, yaw: 0.7, pitch: 0.35 }, 'Przekładnia': { t: [-4.1, 0.95, 0.12], dist: 1.3, yaw: 0.35, pitch: 0.3 },
  'Łańcuch': { t: [-2.6, 1.07, 0.12], dist: 1.2, yaw: -1.15, pitch: 0.15 }, 'Pas': { t: [-0.95, 1.07, 0.12], dist: 1.2, yaw: -1.15, pitch: 0.15 }, 'Sprzęgła i przeguby': { t: [0.9, 0.9, 0.25], dist: 1.9, yaw: 0.2, pitch: 0.45 }, 'Planetarna': { t: [2.36, 0.87, 0.37], dist: 0.55, yaw: -1.0, pitch: 0.25 }, 'Hamulec': { t: [3.1, 0.9, 0.37], dist: 1.1, yaw: 0.8, pitch: 0.3 } };
const setCam = (v) => { Object.assign(orbit, { yaw: v.yaw, pitch: v.pitch, dist: v.dist }); orbit.target.set(...v.t); };
function cams() {
  const C = S.mode === 'machine' ? CAMS : S.mode === 'physics' ? { ...CAMS, 'Regulator': { t: [-6.1, 0.9, 0.3], dist: 0.9, yaw: 0.35, pitch: 0.3 } } : { 'Przedmiot': null, 'Z przodu': { yaw: Math.PI / 2, pitch: 0.05 }, 'Z boku': { yaw: 0, pitch: 0.1 }, 'Z góry': { yaw: 0.3, pitch: 1.4 } };
  $('cams').replaceChildren(...Object.entries(C).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => (S.mode === 'items' ? items.frameItem(v) : setCam(v)); return b; }));
}
const cv = renderer.domElement; let drag = null;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
// sterowanie na modelu (tryb Przedmioty): część z userData.control — klik / przytrzymanie / przeciąganie zamiast obrotu kamery
let ctl = null;
// obiekt z obsługą w bieżącym trybie: przedmiot ze sterowaniem (Przedmioty) albo regulator przy silniku (Fizyka)
const ctlTarget = () => (S.mode === 'items' ? (items.item && items.item.controls ? [{ group: items.item.group, api: items.item.api }] : null) : S.mode === 'physics' ? ELEC.devices : null);
function controlAt(e) {
  const tgs = ctlTarget(); if (!tgs) return null;
  const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(tgs.map((t) => t.group), true)[0]; let o = h && h.object; while (o && !o.userData.control) o = o.parent;
  if (!o) return null;
  const tg = tgs.find((t) => { for (let p = o; p; p = p.parent) if (p === t.group) return true; return false; });
  return tg ? { name: o.userData.control, api: tg.api } : null;
}
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const c = e.button === 0 ? controlAt(e) : null;
  if (c) { ctl = { name: c.name, api: c.api, y: e.clientY }; c.api.press(c.name); stats(); return; }
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
});
cv.addEventListener('pointermove', (e) => {
  if (ctl) { ctl.api.drag(ctl.name, e.clientY - ctl.y); ctl.y = e.clientY; return; }
  if (!drag) { cv.classList.toggle('grab', !!controlAt(e)); return; } const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true; if (drag.moved) { orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(0.02, Math.min(1.52, orbit.pitch + dy * 0.004)); } });
// przerwany gest (pointercancel — np. dotyk, utrata przechwycenia, okno w tle): sterowanie zawsze puszczone
function endPointer() { if (ctl) { ctl.api.release(ctl.name); ctl = null; stats(); } drag = null; }
cv.addEventListener('pointercancel', endPointer); cv.addEventListener('lostpointercapture', () => { if (ctl) endPointer(); }); addEventListener('blur', endPointer);
cv.addEventListener('pointerup', (e) => { if (ctl) { ctl.api.release(ctl.name); ctl = null; stats(); return; } const click = drag && !drag.moved; drag = null; if (click && e.button === 0 && S.mode !== 'items') pick(e); });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(30, Math.max(0.3, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });
const held = new Set();
addEventListener('keyup', (e) => held.delete(e.code)); addEventListener('blur', () => held.clear());
function moveKeys(dt) {
  const f = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0), s = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
  if (!f && !s) return;
  const fx = -Math.sin(orbit.yaw), fz = -Math.cos(orbit.yaw), v = Math.max(0.6, orbit.dist) * 0.8 * dt;
  orbit.target.x += (fx * f - fz * s) * v; orbit.target.z += (fz * f + fx * s) * v;
}


/* ---------------- tryb Fizyka (physics-mode.js) i tryb Przedmioty (items-mode.js) ---------------- */
const { reg, ELEC, phys, physStats, hitG, elecG, setHit, syncHit } = createPhysicsMode({ scene, root, M, S, save, $, el, mc, ui: { fmt, rpmOf, dirOf, select, showSel, get sel() { return sel; } } });
const items = createItemsMode({ scene, M, S, save, $, el, orbit });

function setMode(m) {
  const was = S.mode;
  S.mode = ['machine', 'physics'].includes(m) ? m : 'items'; save();
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === S.mode);
  const mach = S.mode !== 'items', phy = S.mode === 'physics';
  root.visible = mach; for (const c of [cross1, cross2]) c.visible = mach; items.itemRoot.visible = !mach; selBox.visible = mach && !!sel;
  reg.group.visible = phy; elecG.visible = phy; $('rpmCtl').hidden = phy; hitG.visible = mach && S.hit;
  if (phy && was !== 'physics') phys.sync();   // fizyka startuje z bieżącego położenia części
  $('mBar').hidden = !mach;
  $('info').textContent = phy ? $('info').dataset.physics : mach ? $('info').dataset.machine : $('info').dataset.items;
  if (mach) { sel = null; $('selName').textContent = 'Kliknij element maszyny'; $('selProps').replaceChildren(); $('selPorts').replaceChildren(); if (was === 'items' || !was) setCam(CAMS['Cała maszyna']); }
  else { items.buildItem(); items.frameItem(); }
  cams(); stats();
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.mode);

/* ---------------- UI ---------------- */
const bind = (id, key, fmtV, after) => { $(id).value = S[key]; $(id + 'V').textContent = fmtV(S[key]); $(id).oninput = () => { S[key] = +$(id).value; $(id + 'V').textContent = fmtV(S[key]); if (after) after(); save(); }; };
bind('rpm', 'rpm', (v) => (v ? `${v} obr/min` : 'stop'));
bind('brake', 'brake', (v) => `${v} N·m`);
bind('alpha', 'alpha', (v) => `${Math.round(v * 100)} %`, applyAlpha);
function applyAlpha() { M.acrylic.opacity = S.alpha; for (const p of panes) p.visible = S.alpha > 0.01; }
$('weather').replaceChildren(...Object.entries(WEATHER).map(([k, w]) => el('option', { value: k, textContent: w.label || k })));
$('weather').value = S.weather; $('weather').onchange = () => { S.weather = $('weather').value; sky(); save(); };
for (const k of ['sunEl', 'sunAz']) { $(k).value = S[k]; $(k + 'V').textContent = S[k] + '°'; $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = S[k] + '°'; sky(); save(); }; }
function sky() { stage.setSky({ weather: S.weather, sunEl: S.sunEl, sunAz: S.sunAz }); }
addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea')) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) held.add(e.code);
  if (e.code === 'KeyH') document.querySelectorAll('[data-window]').forEach((p) => p.classList.toggle('hidden-panel'));
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), RUN_MAX = 120;
// MechanicsApi.mode('items' | 'machine'), item(id, ustawienia), items(), rpm(v), brake(Nm), alpha(0–1), state(), elements(), select(id), view(…), run(sekundy)
window.MechanicsApi = {
  mode(m) { setMode(m); return S.mode; },
  // regulator(nazwa) — obsługa regulatora przy silniku w trybie Fizyka: 'run' | 'stop' | 'dir' | liczba (przeciągnięcie pokrętła, px)
  // circuit(nazwa) — obsługa instalacji w trybie Fizyka: circuit('dir', 'I' | '0' | 'II') — przełącznik S3, 'power' (X0), 'main' (Q1), 'start' / 'stop' (chwilowe), 'estop' (zatrzask / odblokowanie), 'test' (K1 ręcznie); circuit('pot', 0–1)
  circuit(c, v) {
    const E = ELEC; if (c === 'dir') { E.S3.api.pos = v; return E.S3.api.pos; }
    const map = { power: [E.X0, 'power'], main: [E.Q1, 'toggle'], start: [E.S2, 'button'], stop: [E.S1, 'button'], estop: [E.S0, 'estop'], test: [E.K1, 'test'] };
    if (c === 'pot') { E.R1.api.pos = Number(v) || 0; } else if (map[c]) { const [d, n] = map[c]; d.api.press(n); if (c === 'start' || c === 'stop') setTimeout(() => d.api.release(n), 150); }
    const es = E.st; return { power: E.X0.api.on, main: E.Q1.api.on, k1: E.K1.api.on, estop: E.S0.api.latched, vfd: reg.api.powered, Ucoil: es.uK, Uvfd: es.uV, shorts: es.r ? es.r.shorts : [] };
  },
  regulator(c) { if (typeof c === 'number') reg.api.drag('knob', c); else reg.api.press(c); return { run: reg.api.run, dir: reg.api.dir, f: reg.api.f, set: reg.api.set }; },
  // ratios() — przełożenia ω_element / ω_silnika w fizyce i w kinematyce (sprawdzenie zgodności)
  ratios() { return parts.filter((e) => phys.nodes.includes(e)).slice(-4).map((e) => [e.name, +(phys.state.omega ? e.omega / phys.state.omega : 0).toFixed(4)]); },
  item(id, params = {}) { S.item = id; S.items[id] = { ...(S.items[id] || {}), ...params }; items.itemList(); items.itemSettings(); items.buildItem(); items.frameItem(); const item = items.item; return { name: items.itemDef.name, info: item.info, warn: item.warn || [], ports: item.ports.map((p) => p.name) }; },
  items: () => ITEMS.map((i) => ({ id: i.id, name: i.name, group: i.group, params: i.params.map((q) => q.key) })),
  // control(nazwa, 'press' | 'release' | dy) — obsługa części sterującej przedmiotu (jak myszą); zwraca stan na żywo
  control(name, act = 'press') { const item = items.item; if (!item || !item.api) return null; if (act === 'press') item.api.press(name); else if (act === 'release') item.api.release(name); else item.api.drag(name, act); return item.live ? Object.fromEntries(item.live()) : null; },
  // liczby spoza zakresu przycinane do zakresu suwaka; nie-liczby pomijane (zostaje obecna wartość)
  rpm(v) { if (Number.isFinite(v)) { S.rpm = clamp(v, 0, 1500); $('rpm').value = S.rpm; $('rpmV').textContent = S.rpm ? `${S.rpm} obr/min` : 'stop'; save(); } return S.rpm; },
  brake(v) { if (Number.isFinite(v)) { S.brake = clamp(v, 0, 300); $('brake').value = S.brake; $('brakeV').textContent = `${S.brake} N·m`; save(); } return S.brake; },
  alpha(a) { if (Number.isFinite(a)) { S.alpha = clamp(a, 0, 1); $('alpha').value = S.alpha; $('alphaV').textContent = `${Math.round(S.alpha * 100)} %`; applyAlpha(); save(); } return S.alpha; },
  state: () => ({ ...drive.state, ok: solved.ok }),
  elements: () => parts.map((e) => ({ id: e.id, name: e.name, rpm: +rpmOf(e.omega).toFixed(2), T: +e.T.toFixed(3), eta: +e.eta.toFixed(4), theta: +e.theta.toFixed(4) })),
  select(id) { const e = parts.find((p) => p.id === id); if (e) select(e); return !!e; },
  view(t = [-1.4, 0.9, 0.2], dist = 9, yaw = 0.25, pitch = 0.38) { orbit.target.set(...t); Object.assign(orbit, { dist, yaw, pitch }); },
  // run: najwyżej RUN_MAX sekund na wywołanie (Infinity / NaN nie zawieszą strony)
  run(sec = 1) { const n = Math.round(clamp(Number.isFinite(sec) ? sec : 0, 0, RUN_MAX) * 60); for (let i = 0; i < n; i++) drive.step(1 / 60, { rpm: S.rpm, brake: S.brake }); applyAngles(); stats(); return this.state(); },
  drive,
};

sky(); applyAlpha(); applyAngles(); items.itemList(); items.itemSettings(); setMode(S.mode); if (S.hit) setHit(true);
if (window.LabLoad) window.LabLoad.step('The machine is assembled', 1);
requestAnimationFrame(loop);

// Items Lab: JunkKit's items (js/models/junkyard/, from the junkyard game, with history) one at a time on a patch of
// ground under the SkyKit sky — the near model (LOD 0) and the far one (LOD 1) side by side, variants, wireframe, the
// collision shape as convex parts (shapes.js — what a physics engine gets) and the item's data: size, mass, material,
// crush resistance along each axis, the smallest it can be crushed to. Mode Deformation (deform/deform.js, from
// Tornado.io): steel drums as sheet-metal shells (js/behaviors/land/deform/) crushed under presses. For an AI: window.ItemsApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { ConvexGeometry } from '../../../vendor/three/addons/geometries/ConvexGeometry.js';
import { WEATHER } from '../../envs/sky/skykit.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';
import { MODELS, junkEntry } from '../../models/junkyard/registry.js';
import { applyTextures, setAnisotropy } from '../../models/junkyard/textures.js';
import { shapeParts } from '../../models/junkyard/shapes.js';
import { attachWeatherCycle } from '../shared/weather-cycle-ui.js';
import { createDeformMode } from './deform/deform.js';
import { createOrbit } from '../shared/orbit.js';
import { viewSize as VS, fitTo } from '../shared/view.js';   // widok w wolnym środku (js/labs/shared/view.js)
// the 3D view's box (ui/shell/windows.js, LabView): the free middle between the panels, or the whole window

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.items.v1';
const ITEMS = MODELS.filter((m) => m.group === 'items');
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { mode: 'item', id: 'tire-car', variant: 0, lod1: false, wire: false, coll: false, pair: true, weather: 'fair', sunEl: 34, sunAz: 210,
  dScene: 'board', dSpeed: 0, dAlpha: 0.35, dDebug: false, ...(saved || {}) };
if (S.mode !== 'deform') S.mode = 'item';
{ const q = new URLSearchParams(location.search).get('item'); if (q) { S.id = q; S.variant = 0; S.mode = 'item'; } }   // „Open in the lab” from the scene editor
if (!ITEMS.some((m) => m.id === S.id)) S.id = ITEMS[0].id;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };
const status = (t) => { $('status').textContent = t || ''; };
// the game's data is in Polish; the lab shows it in English
const EN = { guma: 'rubber', stal: 'steel', 'stal nierdzewna': 'stainless steel', papier: 'paper', tektura: 'cardboard', aluminium: 'aluminium', 'metal (wg wariantu)': 'metal (by variant)',
  mieszanka: 'mixed metal', 'piwo jasne': 'lager', 'napój cola': 'cola', 'woda gazowana': 'sparkling water', niebieska: 'blue', czerwona: 'red', oliwkowa: 'olive' };
const en = (s) => EN[s] || s;

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 8000);
const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
// wspólna scena bazowa laboratoriów (js/labs/shared/stage.js): niebo SkyKit, światło z pogodą, mgła, płaski grunt
const stage = createStage(renderer, scene, { skyRadius: 4000 });
stage.setSurface('land', 0);
const sun = stage.sun;
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01;
let wxNow = null;   // liczby zmiennej pogody (js/labs/shared/weather-cycle-ui.js); null — pogoda z listy
function updateSky() {
  const w = wxNow || WEATHER[S.weather] || WEATHER.fair;
  const L = stage.setLight({ ...w, weather: S.weather, sunEl: S.sunEl, sunAz: S.sunAz, moon: 0.8 });
  sun.userData.dir = L.sunDir.clone();
  look.sunVisible = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - L.day)) });
}

/* ---------------- the item ---------------- */
const holder = new THREE.Group(); scene.add(holder);
let mod = null, size = new THREE.Vector3(1, 1, 1), built = {};
function onGround(obj) { const b = new THREE.Box3().setFromObject(obj); obj.position.y -= b.min.y; return b; }
function colliderOf(info) {
  const g = new THREE.Group();
  for (const p of shapeParts(info.collider)) {
    let geo;
    if (p.kind === 'box') geo = new THREE.BoxGeometry(p.half[0] * 2, p.half[1] * 2, p.half[2] * 2).translate(...p.at);
    else { const pts = []; for (let i = 0; i < p.points.length; i += 3) pts.push(new THREE.Vector3(p.points[i], p.points[i + 1], p.points[i + 2])); geo = new ConvexGeometry(pts); }
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: 0x4fe3c6 })));
  }
  return g;
}
function count(o) { let t = 0, n = 0; o.traverse((m) => { if (m.isMesh) { n++; t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; } }); return { tris: Math.round(t), meshes: n }; }
async function load(id) {
  const e = junkEntry(id); if (!e) throw new Error(`no item "${id}"`);
  S.id = id; mod = await e.load();
  const n = mod.info.variants || 1; S.variant = Math.min(S.variant, n - 1);
  const vs = $('variant'); vs.replaceChildren(...Array.from({ length: n }, (_, i) => el('option', { value: String(i), textContent: mod.VARIANTS && mod.VARIANTS[i] ? en(mod.VARIANTS[i].name) : `variant ${i + 1}` })));
  vs.value = String(S.variant); vs.hidden = n < 2; $('item').value = id;
  rebuild(true);
}
function rebuild(reframe) {
  holder.clear();
  const t0 = performance.now();
  // the main model (LOD as chosen) and, beside it, the other LOD — what the game draws near and far
  const main = mod.build(S.lod1 ? 1 : 0, S.variant), ms = performance.now() - t0;
  const other = S.pair ? mod.build(S.lod1 ? 0 : 1, S.variant) : null;
  applyTextures();
  const b = onGround(main); size = b.getSize(new THREE.Vector3());
  main.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.wireframe = S.wire; } });
  holder.add(main);
  if (S.coll && mod.info.collider) { const c = colliderOf(mod.info); c.position.copy(main.position); holder.add(c); }
  if (other) {
    onGround(other); other.position.x = Math.max(size.x, size.z) * 1.4 + 0.05;
    other.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.material.wireframe = S.wire; } });
    holder.add(other);
  }
  built = { main: count(main), other: other ? count(other) : null, ms };
  window.LabPerf.model(holder, ms);
  info();
  if (reframe) frameCam();
  save();
}
function info() {
  const I = mod.info, e = junkEntry(S.id), mm = (v) => `${Math.round(v * 1000)} mm`, kg = (v) => (v < 1 ? `${+(v * 1000).toFixed(1)} g` : `${+v.toFixed(2)} kg`);
  const mass = I.id === 'ingot' && mod.VARIANTS ? mod.VARIANTS[S.variant].density * (I.mass / 2700) : I.mass;
  $('itName').textContent = e.name;
  const rows = [['Model', I.name], ['Size', `${mm(size.x)} × ${mm(size.y)} × ${mm(size.z)}`], ['Mass', mass != null ? kg(mass) : '—'], ['Material', en(I.material || '—')]];
  if (I.crush) rows.push(['Crush X · Y · Z', `${I.crush.x} · ${I.crush.y} · ${I.crush.z} kN`]);
  if (I.minScale) rows.push(['Smallest X · Y · Z', `${Math.round(I.minScale.x * 100)} · ${Math.round(I.minScale.y * 100)} · ${Math.round(I.minScale.z * 100)} %`]);
  if (I.collider) rows.push(['Collision', `${I.collider.type} (${shapeParts(I.collider).length} parts)`]);
  rows.push([`LOD ${S.lod1 ? 1 : 0}`, `${built.main.tris.toLocaleString('en')} triangles, ${built.main.meshes} parts`]);
  if (built.other) rows.push([`LOD ${S.lod1 ? 0 : 1} (right)`, `${built.other.tris.toLocaleString('en')} triangles`]);
  rows.push(['Version', I.version]);
  $('itStats').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
}

/* ---------------- camera: orbit ---------------- */
const orbit = createOrbit({ target: new THREE.Vector3(0, 0.2, 0), dist: 1.5, yaw: 0.75, pitch: 0.35 , pitchMin: -0.05, pitchMax: 1.5, distMin: 0.05, distMax: 60, rot: 0.005, tilt: 0.004, zoom: 0.0011 });
function frameCam() {
  const r = Math.max(size.x, size.y, size.z), w = S.pair ? Math.max(size.x, size.z) * 1.4 : 0;
  orbit.target.set(w / 2, size.y * 0.45, 0); orbit.dist = Math.max(0.25, (r + w) * 1.6);
  camera.near = Math.max(0.002, r / 300); camera.updateProjectionMatrix();
  const s = Math.max(1, (r + w) * 1.5);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: s * 12 }); sun.shadow.camera.updateProjectionMatrix();
}
const CAMS = { Orbit: { yaw: 0.75, pitch: 0.35 }, Front: { yaw: 0, pitch: 0.12 }, Side: { yaw: Math.PI / 2, pitch: 0.12 }, 'From above': { yaw: 0.3, pitch: 1.35 } };
const itemCams = () => $('cams').replaceChildren(...Object.entries(CAMS).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => Object.assign(orbit, v); return b; }));
const cv = renderer.domElement; let drag = null;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => {
  if (S.mode === 'deform') deform.move(e);   // a grabbed barrel follows the pointer
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
  if (drag.moved) { orbit.rotate(dx, dy); } });
cv.addEventListener('pointerup', (e) => { const click = drag && !drag.moved; drag = null; if (click && e.button === 0 && S.mode === 'deform') deform.click(e); });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.zoomBy(e.deltaY); }, { passive: false });

/* ---------------- panels ---------------- */
$('item').replaceChildren(...ITEMS.map((m) => el('option', { value: m.id, textContent: m.name })));
$('item').onchange = () => { S.variant = 0; load($('item').value); };
$('variant').onchange = () => { S.variant = +$('variant').value; rebuild(false); };
for (const k of ['lod1', 'wire', 'coll', 'pair']) { $(k).checked = S[k]; $(k).onchange = () => { S[k] = $(k).checked; rebuild(k === 'pair'); }; }
$('weather').replaceChildren(...Object.entries(WEATHER).map(([k, w]) => el('option', { value: k, textContent: w.label || k })));
$('weather').value = S.weather; $('weather').onchange = () => { wxNow = null; S.weather = $('weather').value; updateSky(); save(); };
attachWeatherCycle({ select: $('weather'), apply: (p) => { wxNow = p; updateSky(); }, every: 0.5 });
for (const [k, u] of [['sunEl', '°'], ['sunAz', '°']]) {
  $(k).value = S[k]; $(k + 'V').textContent = S[k] + u;
  $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = S[k] + u; updateSky(); save(); };
}

/* ---------------- loop ---------------- */
function resize() { fitTo(renderer, camera, look); }
addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, ((now || performance.now()) - last) / 1000); last = now || performance.now();
  if (S.mode === 'deform') { deform.frame(dt); orbit.moveKeys(dt, 1); }
  const c = Math.cos(orbit.pitch);
  orbit.position(camera);
  camera.position.y = Math.max(0.01, camera.position.y); camera.lookAt(orbit.target);
  const d = sun.userData.dir || new THREE.Vector3(0.4, 0.8, 0.3), r = Math.max(2, orbit.dist * 3);
  sun.position.copy(orbit.target).addScaledVector(d, r * 2); sun.target.position.copy(orbit.target);
  stage.update(dt, camera);   // niebo za kamerą, mgła, mapa otoczenia z nieba
  window.LabPerf.begin(renderer);
  look.render(scene, camera);
  window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}

/* ---------------- for an AI ---------------- */
// ItemsApi.list() — the items; show(id, { variant, lod1, wire, coll, pair }) → the item's data; info() — the shown one
// mode('item' | 'deform'); deform — the deformation mode: speed(cm/s), lift(), scene('board' | 'container'), alpha(0–1),
//   reset(), state(), run(seconds) → Promise
window.ItemsApi = {
  async mode(m) { await setMode(m); return S.mode; },
  get deform() { return deform.api; },
  list: () => ITEMS.map((m) => ({ id: m.id, name: m.name, namePl: m.namePl })),
  async show(id, o = {}) { Object.assign(S, o); if (o.variant == null) S.variant = 0; await load(id); return window.ItemsApi.info(); },
  info: () => ({ id: S.id, variant: S.variant, size: size.toArray().map((v) => +v.toFixed(4)), ...JSON.parse(JSON.stringify({ ...mod.info, collider: undefined })), lod: built }),
};

/* ---------------- modes: Item | Deformation ---------------- */
const deform = createDeformMode({ scene, camera, canvas: cv, orbit, ui: { S, $, el, status, save } });
const MODES = { item: 'Item', deform: 'Deformation' }, NOTE = $('itNote').textContent;
$('modes').replaceChildren(...Object.entries(MODES).map(([k, v]) => { const b = el('button', { type: 'button', textContent: v, title: k === 'deform' ? 'Steel drums crushed under presses (sheet metal that stays bent)' : 'One item: near and far model, collision shape, data' }); b.dataset.m = k; b.onclick = () => setMode(k); return b; }));
async function setMode(m) {
  S.mode = MODES[m] ? m : 'item'; save();
  [...$('modes').children].forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode));
  const d = S.mode === 'deform';
  $('item').hidden = d; $('variant').hidden = d || $('variant').options.length < 2; $('dScene').hidden = !d;
  $('itemPanel').hidden = d; $('deformPanel').hidden = !d;
  holder.visible = !d;
  if (d) {
    $('itName').textContent = 'Barrels under a press';
    camera.near = 0.01; camera.updateProjectionMatrix();
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.1, far: 120 }); sun.shadow.camera.updateProjectionMatrix();
    await deform.enter();
  } else {
    deform.leave(); $('itNote').textContent = NOTE; itemCams();
    if (mod) { info(); frameCam(); }
  }
}
// W A S D move the camera (deformation mode: the board is 13 m wide)
orbit.watchKeys();   // W A S D (js/labs/shared/orbit.js)

updateSky(); resize(); itemCams();
load(S.id).then(() => { status(''); if (S.mode === 'deform') setMode('deform'); }, (e) => status(e.message));
requestAnimationFrame(frame);

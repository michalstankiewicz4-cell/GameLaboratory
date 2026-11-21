// Items Lab: JunkKit's items (js/models/junkyard/, from the junkyard game, with history) one at a time on a patch of
// ground under the SkyKit sky — the near model (LOD 0) and the far one (LOD 1) side by side, variants, wireframe, the
// collision shape as convex parts (shapes.js — what a physics engine gets) and the item's data: size, mass, material,
// crush resistance along each axis, the smallest it can be crushed to. For an AI: window.ItemsApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { ConvexGeometry } from '../../../vendor/three/addons/geometries/ConvexGeometry.js';
import { WEATHER, skyUniforms, skyDome, applySky, skyEnvironment } from '../../envs/sky/skykit.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';
import { MODELS, junkEntry } from '../../models/junkyard/registry.js';
import { applyTextures, setAnisotropy } from '../../models/junkyard/textures.js';
import { shapeParts } from '../../models/junkyard/shapes.js';
import { attachWeatherCycle } from '../shared/weather-cycle-ui.js';
// the 3D view's box (ui/shell/windows.js, LabView): the free middle between the panels, or the whole window
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.items.v1';
const ITEMS = MODELS.filter((m) => m.group === 'items');
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { id: 'tire-car', variant: 0, lod1: false, wire: false, coll: false, pair: true, weather: 'fair', sunEl: 34, sunAz: 210, ...(saved || {}) };
{ const q = new URLSearchParams(location.search).get('item'); if (q) { S.id = q; S.variant = 0; } }   // „Open in the lab” from the scene editor
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
const skyU = skyUniforms(), sky = skyDome(skyU, 4000); sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01;
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5b554b, roughness: 0.97 }));
ground.receiveShadow = true; scene.add(ground);
let envRT = null, envDirty = true;
let wxNow = null;   // liczby zmiennej pogody (js/labs/shared/weather-cycle-ui.js); null — pogoda z listy
function updateSky() {
  const w = wxNow || WEATHER[S.weather] || WEATHER.fair;
  const L = applySky(skyU, { ...w, sunEl: S.sunEl, sunAz: S.sunAz, moon: 0.8 });
  sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity; hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
  sun.userData.dir = L.sunDir.clone();
  scene.environmentIntensity = (0.85 - w.coverage * w.density * 0.45) * (0.1 + 0.9 * L.day);
  look.sunVisible = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - L.day)) });
  envDirty = true;
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
const orbit = { target: new THREE.Vector3(0, 0.2, 0), dist: 1.5, yaw: 0.75, pitch: 0.35 };
function frameCam() {
  const r = Math.max(size.x, size.y, size.z), w = S.pair ? Math.max(size.x, size.z) * 1.4 : 0;
  orbit.target.set(w / 2, size.y * 0.45, 0); orbit.dist = Math.max(0.25, (r + w) * 1.6);
  camera.near = Math.max(0.002, r / 300); camera.updateProjectionMatrix();
  const s = Math.max(1, (r + w) * 1.5);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: s * 12 }); sun.shadow.camera.updateProjectionMatrix();
}
const CAMS = { Orbit: { yaw: 0.75, pitch: 0.35 }, Front: { yaw: 0, pitch: 0.12 }, Side: { yaw: Math.PI / 2, pitch: 0.12 }, 'From above': { yaw: 0.3, pitch: 1.35 } };
$('cams').replaceChildren(...Object.entries(CAMS).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => Object.assign(orbit, v); return b; }));
const cv = renderer.domElement; let drag = null;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
  orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-0.05, Math.min(1.5, orbit.pitch + dy * 0.004)); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(60, Math.max(0.05, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

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
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
function frame() {
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.position.y = Math.max(0.01, camera.position.y); camera.lookAt(orbit.target);
  const d = sun.userData.dir || new THREE.Vector3(0.4, 0.8, 0.3), r = Math.max(2, orbit.dist * 3);
  sun.position.copy(orbit.target).addScaledVector(d, r * 2); sun.target.position.copy(orbit.target);
  if (envDirty) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; }
  window.LabPerf.begin(renderer);
  look.render(scene, camera);
  window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}

/* ---------------- for an AI ---------------- */
// ItemsApi.list() — the items; show(id, { variant, lod1, wire, coll, pair }) → the item's data; info() — the shown one
window.ItemsApi = {
  list: () => ITEMS.map((m) => ({ id: m.id, name: m.name, namePl: m.namePl })),
  async show(id, o = {}) { Object.assign(S, o); if (o.variant == null) S.variant = 0; await load(id); return window.ItemsApi.info(); },
  info: () => ({ id: S.id, variant: S.variant, size: size.toArray().map((v) => +v.toFixed(4)), ...JSON.parse(JSON.stringify({ ...mod.info, collider: undefined })), lod: built }),
};

updateSky(); resize();
load(S.id).then(() => status(''), (e) => status(e.message));
requestAnimationFrame(frame);

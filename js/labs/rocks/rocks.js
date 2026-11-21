// Rocks Lab: RockKit's rocks (js/models/rocks/rockkit.js) on a patch of ground under the SkyKit sky — one rock
// (kind, shape, seed, size, detail, moss, lichen; its size, volume and mass) or a boulder field with scree (many small
// stones, few large ones). A rock saved under a name is the "rock" asset for the scene editor. For an AI: RocksApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, skyDome, applySky, skyEnvironment } from '../../envs/sky/skykit.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';
import { ROCK_KINDS, ROCK_SHAPES, ROCK_DEFAULTS, rockGeometry, rockMaterial, rockInfo } from '../../models/rocks/rockkit.js';
import { listAssets, getAsset, saveAsset, removeAsset } from '../../scene/assets.js';
import { attachWeatherCycle } from '../shared/weather-cycle-ui.js';
// the 3D view's box (ui/shell/windows.js, LabView): the free middle between the panels, or the whole window
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.rocks.v1';
const ROCK_KEYS = Object.keys(ROCK_DEFAULTS);
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { mode: 'specimen', ...ROCK_DEFAULTS, wire: false, fDensity: 1, fMax: 3, fScree: 1, fSeed: 5, weather: 'fair', sunEl: 32, sunAz: 210, ...(saved || {}) };
if (!ROCK_KINDS[S.kind]) S.kind = ROCK_DEFAULTS.kind;
if (!ROCK_SHAPES[S.shape]) S.shape = ROCK_DEFAULTS.shape;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };
const status = (t) => { $('status').textContent = t || ''; };
const spec = () => Object.fromEntries(ROCK_KEYS.map((k) => [k, S[k]]));

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 8000);
const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
const skyU = skyUniforms(), sky = skyDome(skyU, 4000); sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.006;
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5b5a49, roughness: 0.97 }));
ground.receiveShadow = true; scene.add(ground);
let envRT = null, envDirty = true, wxNow = null;
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

/* ---------------- one rock, or a field ---------------- */
const holder = new THREE.Group(); scene.add(holder);
let shown = { tris: 0, size: [1, 1, 1], info: null, ms: 0, count: 0 };
function clearHolder() { holder.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); holder.clear(); }
function wire(m) { m.wireframe = S.wire; return m; }
function buildSpecimen() {
  const t0 = performance.now(), g = rockGeometry(spec()), mesh = new THREE.Mesh(g, wire(rockMaterial(S.kind)));
  mesh.castShadow = mesh.receiveShadow = true; holder.add(mesh);
  shown = { tris: g.index.count / 3, size: g.userData.size, info: rockInfo(spec(), g), ms: performance.now() - t0, count: 1 };
}
// a boulder field: sizes from a power law (many small, few large), scree in drifts around the boulders; 8 variants of
// each shape drawn instanced, and no two stones alike: each is stretched along its own axes, leans a little and gets
// its own shade (instance colour)
function buildField() {
  const t0 = performance.now();
  let s = (S.fSeed | 0) * 7 + 1; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const R = 40, shapes = ['boulder', 'block', 'slab'], V = 8;
  const variants = shapes.flatMap((shape) => Array.from({ length: V }, (_, i) => ({ shape, g: rockGeometry({ ...spec(), shape, size: 1, seed: S.seed * 31 + i * 7 + shape.length }) })));
  const pebbles = Array.from({ length: V }, (_, i) => rockGeometry({ ...spec(), shape: i % 3 ? 'pebble' : 'block', size: 1, detail: 0.75, seed: S.seed * 17 + i }));
  const place = []; // [geometry index, x, z, size, yaw]
  const nBig = Math.round(70 * S.fDensity);
  for (let i = 0; i < nBig; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * R, sz = Math.max(0.25, S.fMax * Math.pow(r(), 2.6));   // power law: few large
    place.push([Math.floor(r() * variants.length), Math.cos(a) * d, Math.sin(a) * d, sz, r() * 6.283, false]);
  }
  const nScree = Math.round(900 * S.fScree);
  for (let i = 0; i < nScree; i++) {
    const host = place[Math.floor(r() * Math.max(1, nBig))];   // scree gathers around and below the boulders
    const a = r() * 6.283, d = (host ? host[3] * (0.6 + r() * 1.8) : Math.sqrt(r()) * R) ;
    const x = (host ? host[1] : 0) + Math.cos(a) * d, z = (host ? host[2] : 0) + Math.sin(a) * d;
    place.push([Math.floor(r() * pebbles.length), x, z, 0.05 + 0.3 * Math.pow(r(), 2), r() * 6.283, true]);
  }
  const groups = new Map(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qt = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), C = new THREE.Color();
  for (const p of place) { const key = (p[5] ? 'p' : 'v') + p[0]; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); }
  let tris = 0;
  for (const [key, list] of groups) {
    const g = key[0] === 'p' ? pebbles[+key.slice(1)] : variants[+key.slice(1)].g;
    const im = new THREE.InstancedMesh(g, wire(rockMaterial(S.kind)), list.length);
    list.forEach((p, i) => {
      // its own proportions (±25 %), a lean (up to ~10°, pebbles more), its own shade (±12 %, slightly warmer or cooler)
      const lean = (p[5] ? 0.5 : 0.18) * r();
      Q.setFromAxisAngle(Y, p[4]); Qt.setFromAxisAngle(A.set(Math.cos(p[4] * 3.1), 0, Math.sin(p[4] * 3.1)), lean); Q.premultiply(Qt);
      Sc.set(p[3] * (0.78 + r() * 0.44), p[3] * (0.72 + r() * 0.5), p[3] * (0.78 + r() * 0.44));
      M.compose(P.set(p[1], -lean * p[3] * 0.15, p[2]), Q, Sc); im.setMatrixAt(i, M);
      const v = 0.88 + r() * 0.24, w = (r() - 0.5) * 0.08; im.setColorAt(i, C.setRGB(v * (1 + w), v, v * (1 - w)));
    });
    im.castShadow = im.receiveShadow = true; holder.add(im);
    tris += g.index.count / 3 * list.length;
  }
  shown = { tris, size: [2 * R, S.fMax, 2 * R], info: null, ms: performance.now() - t0, count: place.length };
}
function rebuild(reframe) {
  clearHolder();
  try { if (S.mode === 'field') buildField(); else buildSpecimen(); status(''); } catch (e) { status(e.message); console.error(e); }
  window.LabPerf.model(holder, shown.ms);
  info();
  if (reframe) frameCam();
  save();
}
function info() {
  const K = ROCK_KINDS[S.kind], SH = ROCK_SHAPES[S.shape];
  $('rkName').textContent = S.mode === 'field' ? `${K.name} boulder field` : `${K.name} · ${SH.name.toLowerCase()}`;
  $('rkNote').textContent = K.note;
  const m = (v) => (v < 1 ? `${Math.round(v * 100)} cm` : `${v.toFixed(2)} m`), kg = (v) => (v < 1000 ? `${Math.round(v)} kg` : `${(v / 1000).toFixed(1)} t`);
  const rows = S.mode === 'field'
    ? [['Stones', shown.count.toLocaleString('en')], ['Triangles', Math.round(shown.tris).toLocaleString('en')], ['Built in', `${Math.round(shown.ms)} ms`]]
    : [['Size', shown.size.map(m).join(' × ')], ['Volume', `${shown.info.volume.toFixed(shown.info.volume < 1 ? 3 : 2)} m³`], ['Mass', kg(shown.info.mass)],
      ['Density', `${shown.info.density} kg/m³`], ['Buried', m(shown.info.buried)], ['Triangles', shown.tris.toLocaleString('en')], ['Built in', `${Math.round(shown.ms)} ms`]];
  $('rkStats').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
}

/* ---------------- camera: orbit ---------------- */
const orbit = { target: new THREE.Vector3(0, 0.5, 0), dist: 5, yaw: 0.75, pitch: 0.3 };
function frameCam() {
  const r = S.mode === 'field' ? 30 : Math.max(...shown.size);
  orbit.target.set(0, S.mode === 'field' ? 0.5 : shown.size[1] * 0.4, 0); orbit.dist = S.mode === 'field' ? 55 : Math.max(0.4, r * 2.4);
  camera.near = Math.max(0.005, r / 400); camera.updateProjectionMatrix();
  const s = Math.max(2, r * 1.6);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: s * 12 }); sun.shadow.camera.updateProjectionMatrix();
}
const CAMS = { Orbit: { yaw: 0.75, pitch: 0.3 }, Low: { yaw: 0.4, pitch: 0.06 }, Side: { yaw: Math.PI / 2, pitch: 0.12 }, 'From above': { yaw: 0.3, pitch: 1.35 } };
$('cams').replaceChildren(...Object.entries(CAMS).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => Object.assign(orbit, v); return b; }));
const cv = renderer.domElement; let drag = null;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
  orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-0.02, Math.min(1.5, orbit.pitch + dy * 0.004)); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(300, Math.max(0.15, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

/* ---------------- panels ---------------- */
const MODES = { specimen: 'Specimen', field: 'Field' };
function setMode(m) {
  S.mode = MODES[m] ? m : 'specimen';
  [...$('modes').children].forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode));
  $('shape').disabled = S.mode === 'field';
  rebuild(true);
}
$('modes').replaceChildren(...Object.entries(MODES).map(([k, v]) => { const b = el('button', { type: 'button', textContent: v }); b.dataset.m = k; b.onclick = () => setMode(k); return b; }));
$('kind').replaceChildren(...Object.entries(ROCK_KINDS).map(([k, v]) => el('option', { value: k, textContent: v.name })));
$('shape').replaceChildren(...Object.entries(ROCK_SHAPES).map(([k, v]) => el('option', { value: k, textContent: v.name })));
$('kind').value = S.kind; $('shape').value = S.shape;
$('kind').onchange = () => { S.kind = $('kind').value; rebuild(false); };
$('shape').onchange = () => { S.shape = $('shape').value; rebuild(true); };
$('seed').value = S.seed; $('seed').onchange = () => { S.seed = Math.max(1, Math.round(+$('seed').value || 1)); $('seed').value = S.seed; rebuild(false); };
$('another').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99998); $('seed').value = S.seed; rebuild(false); };
const fmt = { size: (v) => (v < 1 ? `${Math.round(v * 100)} cm` : `${(+v).toFixed(2)} m`), detail: (v) => `× ${(+v).toFixed(2)}`, moss: (v) => `${Math.round(v * 100)} %`, lichen: (v) => `${Math.round(v * 100)} %`,
  fDensity: (v) => `${Math.round(v * 100)} %`, fMax: (v) => `${(+v).toFixed(2)} m`, fScree: (v) => `${Math.round(v * 100)} %` };
for (const [k, f] of Object.entries(fmt)) {
  $(k).value = S[k]; $(k + 'V').textContent = f(S[k]);
  $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = f(S[k]); };
  $(k).onchange = () => rebuild(k === 'size' || k === 'fMax');
}
$('fSeed').value = S.fSeed; $('fSeed').onchange = () => { S.fSeed = Math.max(1, Math.round(+$('fSeed').value || 1)); $('fSeed').value = S.fSeed; rebuild(false); };
$('wire').checked = S.wire; $('wire').onchange = () => { S.wire = $('wire').checked; rebuild(false); };
$('weather').replaceChildren(...Object.entries(WEATHER).map(([k, w]) => el('option', { value: k, textContent: w.label || k })));
$('weather').value = S.weather; $('weather').onchange = () => { wxNow = null; S.weather = $('weather').value; updateSky(); save(); };
attachWeatherCycle({ select: $('weather'), apply: (p) => { wxNow = p; updateSky(); }, every: 0.5 });
for (const [k, u] of [['sunEl', '°'], ['sunAz', '°']]) {
  $(k).value = S[k]; $(k + 'V').textContent = S[k] + u;
  $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = S[k] + u; updateSky(); save(); };
}

/* ---------------- saved rocks: the "rock" asset ---------------- */
function fillSaved() {
  const names = listAssets('rock');
  $('savedSel').replaceChildren(el('option', { value: '', textContent: names.length ? '—' : 'none yet' }), ...names.map((n) => el('option', { value: n, textContent: n })));
}
function saveRock(n) { n = String(n || '').trim(); if (!n) throw new Error('give the rock a name'); if (!saveAsset('rock', n, spec())) throw new Error('the browser did not let me save'); fillSaved(); $('savedSel').value = n; return n; }
function loadRock(n) {
  const a = getAsset('rock', n); if (!a) throw new Error(`no saved rock "${n}"`);
  for (const k of ROCK_KEYS) if (a[k] != null) S[k] = a[k];
  if (!ROCK_KINDS[S.kind]) S.kind = ROCK_DEFAULTS.kind; if (!ROCK_SHAPES[S.shape]) S.shape = ROCK_DEFAULTS.shape;
  $('kind').value = S.kind; $('shape').value = S.shape; $('seed').value = S.seed;
  for (const [k, f] of Object.entries(fmt)) { $(k).value = S[k]; $(k + 'V').textContent = f(S[k]); }
  if (S.mode !== 'specimen') setMode('specimen'); else rebuild(true);
  return spec();
}
$('saveRock').onclick = () => { try { status(`Saved "${saveRock($('saveName').value)}".`); } catch (e) { status(e.message); } };
$('delRock').onclick = () => { const n = $('savedSel').value; if (!n) return; removeAsset('rock', n); fillSaved(); status(`Deleted "${n}".`); };
$('savedSel').onchange = () => { const n = $('savedSel').value; if (n) { $('saveName').value = n; loadRock(n); } };
fillSaved();

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
function frame() {
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.position.y = Math.max(0.03, camera.position.y); camera.lookAt(orbit.target);
  const d = sun.userData.dir || new THREE.Vector3(0.4, 0.8, 0.3), r = Math.max(4, orbit.dist * 2);
  sun.position.copy(orbit.target).addScaledVector(d, r * 2); sun.target.position.copy(orbit.target);
  if (envDirty) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; }
  window.LabPerf.begin(renderer);
  look.render(scene, camera);
  window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}

/* ---------------- for an AI ---------------- */
// RocksApi.make(spec) → the rock's data (size, volume, mass…); field({ density, max, scree, seed }); kinds, shapes;
// save(name) → the "rock" asset, load(name), saved(), get()
window.RocksApi = {
  kinds: Object.fromEntries(Object.entries(ROCK_KINDS).map(([k, v]) => [k, v.name])),
  shapes: Object.fromEntries(Object.entries(ROCK_SHAPES).map(([k, v]) => [k, v.name])),
  make(o = {}) { for (const k of ROCK_KEYS) if (o[k] != null) S[k] = o[k]; $('kind').value = S.kind; $('shape').value = S.shape; $('seed').value = S.seed; for (const [k, f] of Object.entries(fmt)) { $(k).value = S[k]; $(k + 'V').textContent = f(S[k]); } if (S.mode !== 'specimen') setMode('specimen'); else rebuild(true); return window.RocksApi.info(); },
  field(o = {}) { const map = { density: 'fDensity', max: 'fMax', scree: 'fScree', seed: 'fSeed' }; for (const [a, b] of Object.entries(map)) if (o[a] != null) S[b] = +o[a]; setMode('field'); return window.RocksApi.info(); },
  info: () => ({ mode: S.mode, spec: spec(), tris: Math.round(shown.tris), stones: shown.count, ...(shown.info ? { size: shown.info.size, volume: +shown.info.volume.toFixed(4), mass: Math.round(shown.info.mass) } : {}) }),
  get: spec,
  save: (n) => ({ saved: saveRock(n) }), load: (n) => loadRock(n), saved: () => listAssets('rock'),
};

updateSky(); resize();
setMode(S.mode);
requestAnimationFrame(frame);

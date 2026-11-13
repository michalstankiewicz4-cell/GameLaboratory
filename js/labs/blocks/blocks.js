// Laboratorium bloków (labs/blocks.html): bryła z bloków (BlockKit, js/models/blocks/blockkit.js) w kosmosie sceny
// bazowej (js/labs/shared/stage.js: niebo kosmosu, słońce, odbicia), ugryzienia kliknięciem, krople cieczy i chmury
// gazu jako zachowania w kosmosie (js/behaviors/space/liquids.js, gases.js — z Hive Hunger, stały krok 1/60 s).
// Okna: Bryła (kształt, rozmiar, blok, ziarno, warstwy), Rodzaje bloków (materiał z laboratorium materiałów),
// Ugryzienie i luźne (promień, liczniki, liczby cieczy i gazu), Opis, Wydajność. Dla AI: BlocksApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { OrbitControls } from '../../../vendor/three/addons/controls/OrbitControls.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { loadSpace } from '../../scene/space.js';
import { KINDS, WHERE, SHAPES, LIQUIDS, GAS, BODY_DEFAULTS, normalizeBody, buildBody } from '../../models/blocks/blockkit.js';
import { Liquids, STEP } from '../../behaviors/space/liquids.js';
import { Gases } from '../../behaviors/space/gases.js';
import { PRESETS } from '../../render/materials/matkit.js';
import { listAssets, getAsset } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.blocks.v1';
const clone = (o) => JSON.parse(JSON.stringify(o));
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { body: clone(BODY_DEFAULTS), biteR: 2, mats: {}, liquids: clone(LIQUIDS), gas: clone(GAS), ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };
// materiał rodzaju: zapisany w laboratorium materiałów (zasób „material”), gotowy MatKit albo domyślny rodzaju
const matOf = (k) => { const v = L.mats[k]; if (!v) return null; if (v.startsWith('asset:')) return getAsset('material', v.slice(6)); return PRESETS[v.slice(7)] || null; };
function applyMats() { for (const k of Object.keys(KINDS)) if (KINDS[k].state === 'solid') { const m = matOf(k); if (m) KINDS[k].mat = { ...m }; } }

/* ---------------- scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20000);
camera.position.set(14, 9, 22);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene);
stage.setSurface('space'); stage.setSkyMode('space'); stage.setLight({ weather: 'fair', sunEl: 30, sunAz: 40 });   // słońce od strony kamery
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 2; controls.maxDistance = 120;
// lewy przycisk: ugryzienie (gdy włączone), obrót kamery — prawy albo z Shift
const setButtons = () => { controls.mouseButtons = $('biteOn').checked ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; };
// niebo kosmosu i odbicia jak w laboratorium pojazdów — kosmos (kity ze Space, w tle)
loadSpace().then(() => {
  const BK = window.BodyKit, SK = window.SystemKit;
  stage.setSpaceEnvironment(window.ShipKit.makeEnvironment(renderer));
  const ref = BK.GAME_KINDS.sky, deep = SK.SKIES.find((x) => x.id === 'deep');
  const sky = BK.buildBody(ref.groupId, ref.bodyId, { detail: 1, values: (deep && deep.values) || {} }); sky.setRadius(9000); scene.add(sky.group);
}).catch((e) => window.LabLog && window.LabLog.add('warn', 'Space sky: ' + e.message));

/* ---------------- bryła, krople, gaz ---------------- */
let body = null, liquids = null, gases = null;
function makeFx() {
  if (liquids) { liquids.meshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
  if (gases) { scene.remove(gases.points); gases.points.geometry.dispose(); gases.points.material.dispose(); }
  liquids = new Liquids(scene, L.liquids, 6000);
  gases = new Gases(scene, L.gas, 4000); gases.setView(VS().h, camera.fov);
}
async function rebuild() {
  applyMats();
  const t0 = performance.now(), work = async () => buildBody(L.body);
  const b = window.LabLoad ? await window.LabLoad.run('Building the body…', work) : await work();
  if (body) { scene.remove(body.group); body.dispose(); }
  body = b; scene.add(body.group);
  stage.fitShadow(new THREE.Vector3(), body.bound);
  const k = stage.sun; k.position.copy(stage.sunDir).multiplyScalar(body.bound * 3); k.target.position.set(0, 0, 0);
  Object.assign(k.shadow.camera, { left: -body.bound, right: body.bound, top: body.bound, bottom: -body.bound, near: 0.5, far: body.bound * 6 }); k.shadow.camera.updateProjectionMatrix();
  liquids.clear(); gases.clear();
  status(`${Object.values(body.counts()).reduce((a, b2) => a + b2, 0)} blocks · ${body.drawn()} drawn · ${Math.round(performance.now() - t0)} ms`);
  showCounts();
}

/* ---------------- ugryzienie ---------------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (e.button === 0 && !e.shiftKey && $('biteOn').checked) down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return; const click = Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5; down = null; if (!click || !body) return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = body.raycast(ray.ray.origin, ray.ray.direction, camera.position.length() + body.bound * 2);
  if (hit) bite(hit, L.biteR);
});
addEventListener('keydown', (e) => { if (e.key === 'Shift') controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; });
addEventListener('keyup', (e) => { if (e.key === 'Shift') setButtons(); });
const tmp = new THREE.Vector3();
function bite(at, r) {
  const out = body.bite(at, r), got = {};
  for (const v of out) {
    got[v.kind] = (got[v.kind] || 0) + 1;
    tmp.set(v.x, v.y, v.z);
    const dir = tmp.clone().sub(at); if (dir.lengthSq() < 1e-6) dir.copy(tmp).normalize();   // na zewnątrz od środka ugryzienia
    if (KINDS[v.kind].state === 'liquid') liquids.spill(v.kind, tmp, dir);
    else if (KINDS[v.kind].state === 'gas') gases.spill(tmp, dir);
  }
  status('Bitten: ' + (Object.entries(got).map(([k, n]) => `${n} ${KINDS[k].name.toLowerCase()}`).join(', ') || 'nothing'));
  showCounts();
  return got;
}

/* ---------------- okna ---------------- */
Object.entries(SHAPES).forEach(([id, n]) => $('shape').append(new Option(n, id)));
function showBody() {
  const b = L.body; $('shape').value = b.shape; $('radius').value = b.radius; $('radiusV').textContent = b.radius + ' m';
  $('voxel').value = String(b.voxel); $('seed').value = b.seed; $('text').value = b.text; $('textRow').hidden = b.shape !== 'text';
  const box = $('layers'); box.replaceChildren();
  b.layers.forEach((ly, i) => {
    const row = document.createElement('div'); row.className = 'layer';
    const kind = document.createElement('select'); Object.entries(KINDS).forEach(([k, x]) => kind.append(new Option(x.name, k))); kind.value = ly.kind;
    const where = document.createElement('select'); Object.entries(WHERE).forEach(([k, x]) => where.append(new Option(x, k))); where.value = ly.where;
    const amt = document.createElement('input'); Object.assign(amt, { type: 'number', min: 0, max: 100, step: 1, value: ly.amount }); amt.title = 'Amount, %';
    const del = document.createElement('button'); del.type = 'button'; del.textContent = '✕'; del.title = 'Remove the layer';
    const sw = document.createElement('i'); sw.className = 'sw'; sw.style.background = KINDS[ly.kind].color;
    kind.onchange = () => { ly.kind = kind.value; sw.style.background = KINDS[ly.kind].color; soon(); };
    where.onchange = () => { ly.where = where.value; soon(); };
    amt.onchange = () => { ly.amount = +amt.value; soon(); };
    del.onclick = () => { b.layers.splice(i, 1); showBody(); soon(); };
    row.append(sw, kind, where, amt, del); box.append(row);
  });
}
function showKinds() {
  const box = $('kinds'); box.replaceChildren();
  const saved = listAssets('material');
  for (const [k, K] of Object.entries(KINDS)) {
    const row = document.createElement('div'); row.className = 'kRow';
    const l = document.createElement('span'); const sw = document.createElement('i'); sw.className = 'sw'; sw.style.background = K.color; l.append(sw, ' ' + K.name);
    let ctl;
    if (K.state === 'solid') {
      ctl = document.createElement('select'); ctl.append(new Option('Default (' + (K.mat.label || K.mat.kind) + ')', ''));
      const g1 = document.createElement('optgroup'); g1.label = 'Ready'; Object.entries(PRESETS).forEach(([id, p]) => g1.append(new Option(p.label, 'preset:' + id))); ctl.append(g1);
      if (saved.length) { const g2 = document.createElement('optgroup'); g2.label = 'Saved'; saved.forEach((n) => g2.append(new Option(n, 'asset:' + n))); ctl.append(g2); }
      ctl.value = L.mats[k] || '';
      ctl.onchange = () => { if (ctl.value) L.mats[k] = ctl.value; else delete L.mats[k]; soon(0); };
    } else { ctl = document.createElement('span'); ctl.className = 'dimtxt'; ctl.textContent = K.state === 'gas' ? 'comes loose as a cloud' : 'comes loose as droplets'; }
    const out = document.createElement('output'); out.id = 'cnt-' + k;
    row.append(l, ctl, out); box.append(row);
  }
}
function showCounts() {
  if (!body) return; const c = body.counts();
  for (const k of Object.keys(KINDS)) { const o = $('cnt-' + k); if (o) o.textContent = c[k] || 0; }
  $('counts').textContent = `Loose: ${liquids ? liquids.count : 0} droplets, ${gases ? gases.count : 0} puffs of gas`;
}
const FIELD_LABELS = { speed: 'Speed when loose', damping: 'Damping', cohesion: 'Cohesion', reach: 'Reach (m)', rest: 'Rest distance (m)', push: 'Push apart', size: 'Drop size (m)', stir: 'Stir', maxSpeed: 'Top speed', maxSize: 'Puff size, most (m)', grow: 'Growth', opacity: 'Opacity' };
function numFields(boxId, obj, keys, onChange) {
  const box = $(boxId); box.replaceChildren();
  for (const k of keys) {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('span'); l.textContent = FIELD_LABELS[k] || k;
    const inp = document.createElement('input'); Object.assign(inp, { type: 'number', step: 'any', value: obj[k] });
    inp.onchange = () => { obj[k] = +inp.value; save(); onChange(); };
    row.append(l, inp, document.createElement('output')); box.append(row);
  }
}
function showFx() {
  const lq = L.liquids[$('lqSel').value];
  numFields('lqFields', lq, ['speed', 'damping', 'cohesion', 'reach', 'rest', 'push', 'size'], () => { makeFx(); showCounts(); });
  numFields('gasFields', L.gas, ['speed', 'damping', 'stir', 'reach', 'push', 'maxSpeed', 'maxSize', 'opacity'], () => { makeFx(); showCounts(); });
}
$('lqSel').onchange = showFx;
let timer = 0;
function soon(ms = 300) { save(); clearTimeout(timer); timer = setTimeout(rebuild, ms); }
$('shape').onchange = () => { L.body.shape = $('shape').value; showBody(); soon(0); };
$('radius').oninput = () => { L.body.radius = +$('radius').value; $('radiusV').textContent = L.body.radius + ' m'; soon(500); };
$('voxel').onchange = () => { L.body.voxel = +$('voxel').value; soon(0); };
$('seed').onchange = () => { L.body.seed = +$('seed').value; soon(0); };
$('text').onchange = () => { L.body.text = $('text').value || 'GL'; soon(0); };
$('addLayer').onclick = () => { L.body.layers.push({ kind: 'iron', where: 'veins', amount: 10 }); showBody(); soon(); };
$('resetLayers').onclick = () => { L.body.layers = clone(BODY_DEFAULTS.layers); showBody(); soon(0); };
$('biteR').oninput = () => { L.biteR = +$('biteR').value; $('biteRV').textContent = L.biteR + ' m'; save(); };
$('biteOn').onchange = setButtons;
$('rebuild').onclick = () => rebuild();
$('clearFx').onclick = () => { liquids.clear(); gases.clear(); showCounts(); };

/* ---------------- dla AI ---------------- */
// BlocksApi: build(bryła) — kształt, rozmiar, blok, ziarno, warstwy; bite([x, y, z], r) → co wypadło; counts(); loose()
window.BlocksApi = {
  build: async (b) => { L.body = normalizeBody({ ...L.body, ...b }); showBody(); await rebuild(); return { ...L.body, counts: body.counts() }; },
  bite: (p, r = 2) => bite(new THREE.Vector3(...p), r),
  counts: () => body.counts(), loose: () => ({ droplets: liquids.count, gas: gases.count }),
  kinds: Object.fromEntries(Object.entries(KINDS).map(([k, x]) => [k, x.state])), where: Object.keys(WHERE), shapes: Object.keys(SHAPES),
  get body() { return clone(L.body); },
};
function apiTab() {
  if (!window.LabConsole) return;
  const el = document.createElement('div'); el.className = 'blkApi';
  const ta = document.createElement('textarea'); ta.className = 'mono'; ta.rows = 5; ta.spellcheck = false;
  ta.value = JSON.stringify({ shape: 'sphere', radius: 6, layers: [{ kind: 'rock', where: 'everywhere', amount: 100 }, { kind: 'water', where: 'pools', amount: 30 }] });
  const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Build (BlocksApi.build)';
  const out = document.createElement('p'); out.className = 'note';
  out.textContent = `A body as JSON. Shapes: ${Object.keys(SHAPES).join(', ')}; kinds: ${Object.keys(KINDS).join(', ')}; where: ${Object.keys(WHERE).join(', ')}. Bite: BlocksApi.bite([x, y, z], r).`;
  go.onclick = async () => { try { const r = await window.BlocksApi.build(JSON.parse(ta.value)); out.textContent = 'Built: ' + JSON.stringify(r.counts); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  el.append(ta, go, out);
  window.LabConsole.addTab({ id: 'blocksapi', title: 'API', titlePl: 'API', el });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- pętla: zachowania stałym krokiem 1/60 s ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); if (gases) gases.setView(VS().h, camera.fov); }
addEventListener('resize', resize);
let last = performance.now(), acc = 0, t = 0, cntT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt;
  acc += dt; let n = 0;
  while (acc >= STEP && n < 6) { liquids.step(body); gases.step(body); acc -= STEP; n++; }
  if (n === 6) acc = 0;
  if (body) body.update(t);
  if ((cntT += dt) > 0.5) { cntT = 0; showCounts(); }
  controls.update();
  stage.update(dt, camera);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}
L.body = normalizeBody(L.body);
$('biteR').value = L.biteR; $('biteRV').textContent = L.biteR + ' m';
setButtons(); showBody(); showKinds(); showFx(); resize(); makeFx();
rebuild().then(() => requestAnimationFrame(frame));
window.__blocks = { get body() { return body; }, get liquids() { return liquids; }, get gases() { return gases; }, camera, controls };

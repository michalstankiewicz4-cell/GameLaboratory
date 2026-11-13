// Laboratorium materiałów (labs/materials.html): MatKit (js/render/materials/matkit.js) na bryłach podglądu w scenie
// bazowej (js/labs/shared/stage.js: niebo, grunt, słońce z cieniem, odbicia z nieba). Okna: Materiał (rodzaj, barwy,
// ziarno, pola rodzaju, zapis — zasób „material”), Powierzchnia i starzenie, Mapy (podglądy, PNG, kafelki 3 × 3),
// Opis (JSON), Światło (słońce), Wydajność. Dla AI: MaterialApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { createStage, LIGHTS } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { KINDS, FIELDS, PRESETS, normalize, makeMaterial, canvases } from '../../render/materials/matkit.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.materials.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { src: 'preset:plate', def: null, shape: 'sphere', light: 'afternoon', res: 512, sunEl: 35, sunAz: 140, spin: true, ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };
let def = normalize(L.def || PRESETS.plate);

/* ---------------- scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 9000);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene);
stage.setSurface('land', 0);

// bryły podglądu (UV w metrach: powtórzenia z wielkości kafelka materiału)
const GEOS = {
  sphere: () => new THREE.SphereGeometry(1, 128, 64),
  box: () => new THREE.BoxGeometry(1.6, 1.6, 1.6, 1, 1, 1),
  plate: () => new THREE.BoxGeometry(2.4, 0.08, 2.4),
  cylinder: () => new THREE.CylinderGeometry(0.8, 0.8, 2, 96, 1),
  knot: () => new THREE.TorusKnotGeometry(0.75, 0.26, 256, 48),
};
const SIZE = { sphere: 2 * Math.PI, box: 1.6, plate: 2.4, cylinder: 2 * Math.PI * 0.8, knot: 4 };   // metry na całe UV
const holder = new THREE.Group(); scene.add(holder);
let mat = null, meshes = [];
function buildShapes() {
  meshes.forEach((m) => { holder.remove(m); m.geometry.dispose(); }); meshes = [];
  const list = L.shape === 'all' ? Object.keys(GEOS) : [L.shape];
  list.forEach((k, i) => {
    const m = new THREE.Mesh(GEOS[k](), mat ? mat.material : undefined);
    m.castShadow = m.receiveShadow = true; m.userData.kind = k;
    m.position.set(list.length > 1 ? (i - (list.length - 1) / 2) * 2.6 : 0, k === 'plate' ? 0.6 : 1.3, 0);
    if (k === 'plate') m.rotation.x = -0.5;
    holder.add(m); meshes.push(m);
  });
  orbit.dist = list.length > 1 ? 11 : 5.2; stage.fitShadow(new THREE.Vector3(0, 1, 0), list.length > 1 ? 9 : 3);
  applyRepeat();
}
// powtórzenia tekstur na bryle: tyle kafelków, ile razy kafelek mieści się w obwodzie bryły
function applyRepeat() {
  if (!mat) return;
  const k = meshes.length > 1 ? 'box' : L.shape, rep = (SIZE[k] || 2) / def.tile;
  for (const t of Object.values(mat.textures)) t.repeat.set(rep, k === 'sphere' || k === 'cylinder' ? rep / 2 : rep);
}

/* ---------------- materiał ---------------- */
let busy = false, again = false;
async function rebuild() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const t0 = performance.now(), res = +L.res;
    const work = async () => makeMaterial(def, { res });
    const m = res >= 1024 && window.LabLoad ? await window.LabLoad.run('Generating the material…', work) : await work();
    if (mat) mat.dispose();
    mat = m; meshes.forEach((x) => { x.material = mat.material; });
    applyRepeat(); drawMaps();
    status(`${KINDS[def.kind].label.split(' (')[0]} · ${res} px · ${Math.round(performance.now() - t0)} ms`);
    $('jsonText').value = JSON.stringify(def, null, 1);
    L.def = def; save();
  } catch (e) { status('Error: ' + e.message); if (window.LabLog) window.LabLog.add('error', e.stack || e.message); }
  busy = false; if (again) { again = false; rebuild(); }
}
let timer = 0; const soon = (ms = 200) => { clearTimeout(timer); timer = setTimeout(rebuild, ms); };

/* ---------------- okna ---------------- */
function fillPresets() {
  const s = $('preset'); s.replaceChildren();
  const g1 = document.createElement('optgroup'); g1.label = 'Ready';
  for (const [id, p] of Object.entries(PRESETS)) g1.append(new Option(p.label, 'preset:' + id));
  s.append(g1);
  const names = listAssets('material');
  if (names.length) { const g2 = document.createElement('optgroup'); g2.label = 'Saved'; names.forEach((n) => g2.append(new Option(n, 'asset:' + n))); s.append(g2); }
  s.value = L.src; if (s.value !== L.src) s.value = '';
}
Object.entries(KINDS).forEach(([id, k]) => $('kind').append(new Option(k.label, id)));
Object.entries(LIGHTS).forEach(([id, l]) => $('light').append(new Option(l.label, id)));
const NUM = ['tile', 'roughness', 'metalness', 'bump', 'wear', 'dirt', 'rust'];
function show() {
  $('kind').value = def.kind; $('color').value = def.color; $('color2').value = def.color2; $('seed').value = def.seed;
  $('colorV').textContent = def.color; $('color2V').textContent = def.color2;
  for (const f of NUM) { $(f).value = def[f]; $(f + 'V').textContent = f === 'tile' ? def.tile.toFixed(1) + ' m' : (+def[f]).toFixed(2); }
  const box = $('kindFields'); box.replaceChildren();
  for (const f of KINDS[def.kind].fields) {
    const [label, lo, hi, step] = FIELDS[f], row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('span'); l.textContent = label;
    const inp = document.createElement('input'); Object.assign(inp, { type: 'range', min: lo, max: hi, step, value: def[f] });
    const out = document.createElement('output'); out.textContent = def[f];
    inp.oninput = () => { def[f] = +inp.value; out.textContent = inp.value; soon(); };
    row.append(l, inp, out); box.append(row);
  }
  $('name').value = L.src.startsWith('asset:') ? L.src.slice(6) : '';
}
$('preset').onchange = () => {
  const v = $('preset').value; L.src = v;
  def = normalize(v.startsWith('asset:') ? getAsset('material', v.slice(6)) || PRESETS.plate : PRESETS[v.slice(7)]);
  show(); rebuild();
};
const custom = () => { if (L.src) { L.src = ''; $('preset').value = ''; } };
$('kind').onchange = () => { def = normalize({ ...def, kind: $('kind').value }); custom(); show(); rebuild(); };
for (const f of ['color', 'color2']) $(f).oninput = () => { def[f] = $(f).value; $(f + 'V').textContent = def[f]; custom(); soon(); };
$('seed').onchange = () => { def.seed = +$('seed').value; custom(); rebuild(); };
for (const f of NUM) $(f).oninput = () => {
  def[f] = +$(f).value; $(f + 'V').textContent = f === 'tile' ? def.tile.toFixed(1) + ' m' : def[f].toFixed(2); custom();
  if (f === 'tile') { applyRepeat(); L.def = def; save(); $('jsonText').value = JSON.stringify(def, null, 1); } else soon();
};
$('save').onclick = () => {
  const n = $('name').value.trim(); if (!n) { status('Give the material a name first.'); return; }
  saveAsset('material', n, { ...def, label: n }); L.src = 'asset:' + n; save(); fillPresets(); status(`Saved: ${n} (asset "material").`);
};
$('del').onclick = () => { if (!L.src.startsWith('asset:')) { status('A ready material cannot be deleted.'); return; } removeAsset('material', L.src.slice(6)); L.src = 'preset:plate'; fillPresets(); $('preset').onchange(); };
$('shape').onchange = () => { L.shape = $('shape').value; save(); buildShapes(); };
$('light').onchange = () => { L.light = $('light').value; save(); stage.setLight(L.light); aim(); };
$('spin').onchange = () => { L.spin = $('spin').checked; save(); };
$('res').onchange = () => { L.res = +$('res').value; save(); rebuild(); };
for (const f of ['sunEl', 'sunAz']) $(f).oninput = () => { L[f] = +$(f).value; $(f + 'V').textContent = L[f] + '°'; save(); aim(); };
function aim() {
  const e = L.sunEl * Math.PI / 180, a = L.sunAz * Math.PI / 180;
  stage.aimSun(new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)));
}

// mapy: miniatury (klik — PNG), kafelki 3 × 3
const MAP_NAMES = { albedo: 'Colour', normal: 'Normal', rough: 'Roughness', metal: 'Metalness', ao: 'Occlusion', height: 'Height' };
let lastCanvases = null;
function drawMaps() {
  lastCanvases = canvases(mat.maps);
  $('maps').replaceChildren(...Object.entries(lastCanvases).map(([k, c]) => {
    const fig = document.createElement('figure'); fig.className = 'mapTile'; fig.title = 'Save as PNG';
    const cap = document.createElement('figcaption'); cap.textContent = MAP_NAMES[k];
    c.className = 'mapImg'; fig.append(c, cap);
    fig.onclick = () => c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `material-${def.kind}-${k}-${def.seed}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
    return fig;
  }));
}
$('tiled').onclick = () => {
  if (!lastCanvases) return;
  const src = lastCanvases.albedo, r = src.width, c = document.createElement('canvas'); c.width = c.height = r * 3; const g = c.getContext('2d');
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.drawImage(src, i * r, j * r);
  c.className = 'mapTiled'; c.title = 'Click to close';
  const old = document.querySelector('.mapTiled'); if (old) old.remove();
  c.onclick = () => c.remove(); $('maps').prepend(c);
};

// opis (JSON)
$('jsonApply').onclick = () => { try { def = normalize(JSON.parse($('jsonText').value)); custom(); show(); rebuild(); $('jsonMsg').textContent = 'Applied.'; } catch (e) { $('jsonMsg').textContent = 'Not applied: ' + e.message; } };
$('jsonCopy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(def, null, 1)); $('jsonMsg').textContent = 'Copied.'; } catch { $('jsonMsg').textContent = 'Copy it from the box.'; } };
onAssetsChange(fillPresets);

/* ---------------- kamera: orbita ---------------- */
const orbit = { yaw: 0.7, pitch: 0.22, dist: 5.2, target: new THREE.Vector3(0, 1.1, 0) };
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY]; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', (e) => { if (!drag) return; orbit.yaw -= (e.clientX - drag[0]) * 0.006; orbit.pitch = Math.max(-0.1, Math.min(1.4, orbit.pitch + (e.clientY - drag[1]) * 0.005)); drag = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', () => { drag = null; });
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.max(1.4, Math.min(30, orbit.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });

/* ---------------- dla AI ---------------- */
// MaterialApi: make(opis) — zastosuj (zwraca opis po sprawdzeniu); presets — gotowe; kinds — rodzaje i pola;
// def — obecny opis; maps() — mapy jako PNG (data URL); save(nazwa) — zasób „material”
window.MaterialApi = {
  make: async (d) => { def = normalize(d); custom(); show(); await rebuild(); return { ...def }; },
  get def() { return { ...def }; },
  presets: Object.fromEntries(Object.entries(PRESETS).map(([k, p]) => [k, p.label])),
  kinds: Object.fromEntries(Object.entries(KINDS).map(([k, x]) => [k, { label: x.label, fields: x.fields }])),
  maps: () => Object.fromEntries(Object.entries(lastCanvases || {}).map(([k, c]) => [k, c.toDataURL('image/png')])),
  save: (n) => { saveAsset('material', String(n), { ...def, label: String(n) }); fillPresets(); return true; },
};
function apiTab() {
  if (!window.LabConsole) return;
  const el = document.createElement('div'); el.className = 'matApi';
  const ta = document.createElement('textarea'); ta.className = 'mono'; ta.rows = 5; ta.spellcheck = false;
  ta.value = JSON.stringify({ kind: 'plate', color: '#6d6a66', color2: '#3a2f28', tile: 2, wear: 0.4, dirt: 0.4, rust: 0.6, panels: 3 });
  const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Make (MaterialApi.make)';
  const out = document.createElement('p'); out.className = 'note';
  out.textContent = 'A description as JSON; missing fields take the defaults. Kinds: ' + Object.keys(KINDS).join(', ') + '.';
  go.onclick = async () => { try { const r = await window.MaterialApi.make(JSON.parse(ta.value)); out.textContent = 'Made: ' + JSON.stringify(r).slice(0, 200); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  el.append(ta, go, out);
  window.LabConsole.addTab({ id: 'matapi', title: 'API', titlePl: 'API', el });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- pętla ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (L.spin) holder.rotation.y += dt * 0.25;
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target);
  stage.update(dt, camera);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}
fillPresets(); show();
$('shape').value = L.shape; $('light').value = L.light; $('spin').checked = L.spin; $('res').value = String(L.res);
for (const f of ['sunEl', 'sunAz']) { $(f).value = L[f]; $(f + 'V').textContent = L[f] + '°'; }
stage.setLight(L.light); aim();
resize(); buildShapes(); rebuild();
window.__materials = { stage, scene, camera, orbit, get def() { return def; }, get mat() { return mat; } };
requestAnimationFrame(frame);

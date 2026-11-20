// Laboratorium miasta (labs/city.html): kreator budynków CityKit (js/models/city/) w scenie bazowej
// (js/labs/shared/stage.js: niebo, grunt, słońce z cieniem, pora dnia). Okna: Budynek (obrys, kondygnacje, front,
// ziarno, zapis — zasób „building”), Fasada (mur z MatKit, przęsła, okna, balkony), Parter i gzymsy, Dach, Wypalona
// fasada (rozdzielczość, paralaksa, odległość przełączania, podgląd map), Opis (JSON), Kamera, Światło, Wydajność.
// Wersja: blisko (siatka), daleko (płaskie ściany z wypalonymi teksturami i paralaksą) albo z odległości jak w grze.
// Obrys: gotowy kształt albo narysowany na gruncie (Draw outline). Dla AI: CityApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { WEATHER } from '../../envs/sky/skykit.js';
import { PRESETS as MAT_PRESETS, normalize as matNormalize } from '../../render/materials/matkit.js';
import { TYPES, TYPE_IDS, WINDOW_STYLES, GROUND_KINDS, ROOF_TYPES, FOOTPRINTS, normalizeSpec, buildBuilding, setNight, setPom, clearBakes, facadeKey } from '../../models/city/citykit.js';
import { cleanPolygon } from '../../models/city/footprint.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.city.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const L = { src: 'type:tenement', spec: null, mode: 'auto', ppm: 64, pom: true, lodAt: 0, weather: 'fair', time: 15.5, ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch { /* prywatny tryb */ } };
const status = (s) => { $('status').textContent = s || ''; };
let spec = normalizeSpec(L.spec || { type: 'tenement' });
{ const q = new URLSearchParams(location.search).get('type'); if (q && TYPES[q]) { spec = normalizeSpec({ type: q }); L.src = 'type:' + q; L.lodAt = 0; } }   // „Otwórz w laboratorium” z edytora sceny

/* ---------------- scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 12000);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene, { skyRadius: 6000 });
stage.setSurface('land', 0);

/* ---------------- budynek ---------------- */
let near = null, far = null, shown = null, lastFacade = '', radius = 20, center = new THREE.Vector3();
let busy = false, again = false;
function dropBuilds() {
  for (const b of [near, far]) if (b) { scene.remove(b.group); b.dispose(); }
  near = far = shown = null;
}
async function rebuild() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const fk = facadeKey(spec) + '|' + L.ppm;
    const work = async () => {
      dropBuilds();
      if (fk !== lastFacade) { clearBakes(); lastFacade = fk; }
      if (L.mode !== 'far') near = buildBuilding(spec, { detail: 1 });
      if (L.mode !== 'near') far = buildBuilding(spec, { detail: 0.5, ppm: L.ppm });
    };
    const heavy = spec.floors * spec.footprint.w > 1500;
    if (heavy && window.LabLoad) await window.LabLoad.run('Building…', work); else await work();
    for (const b of [near, far]) if (b) scene.add(b.group);
    const b = near || far, bb = new THREE.Box3().setFromObject(b.group);
    bb.getCenter(center); radius = bb.getSize(new THREE.Vector3()).length() / 2;
    stage.fitShadow(new THREE.Vector3(center.x, 0, center.z), Math.max(20, radius * 1.1));
    if (!L.lodAt) L.lodAt = Math.round(Math.max(40, radius * 4) / 5) * 5;
    $('lodAt').value = L.lodAt; $('lodAtV').textContent = L.lodAt + ' m';
    showStats(); drawMaps(); pickShown(true);
    $('jsonText').value = JSON.stringify(spec, null, 1);
    L.spec = spec; save();
  } catch (e) { status('Error: ' + e.message); if (window.LabLog) window.LabLog.add('error', e.stack || e.message); }
  busy = false; if (again) { again = false; rebuild(); }
}
let timer = 0; const soon = (ms = 220) => { clearTimeout(timer); timer = setTimeout(rebuild, ms); };

// która wersja widoczna: z trybu albo z odległości (±10 %, żeby nie migało na granicy)
function pickShown(force) {
  let want = L.mode === 'near' ? near : L.mode === 'far' ? far : null;
  if (!want) {
    const d = camera.position.distanceTo(center), was = shown === far;
    want = d > L.lodAt * (was ? 0.9 : 1.1) ? far : near;
  }
  if (want === shown && !force) return;
  shown = want;
  for (const b of [near, far]) if (b) b.group.visible = b === shown;
  if (shown) window.LabPerf.model(shown.group, shown.stats.buildMs);
  status(`${TYPES[spec.type].label} · ${shown === far ? 'far: baked facade' : 'near: mesh'} · ${shown.stats.triangles.toLocaleString('en')} triangles · ${shown.stats.drawCalls} draw calls`);
}

const fm = (x, d = 1) => (+x).toFixed(d);
function showStats() {
  const b = near || far, I = b.info, rows = [
    ['Kind', TYPES[spec.type].label],
    ['Size', `${fm(I.size[0])} × ${fm(I.size[2])} m, ${fm(I.roofTop)} m high`],
    ['Storeys', `${I.floors} (walls ${fm(I.height)} m)`],
    ['Footprint', `${Math.round(I.area).toLocaleString('en')} m², ${I.walls} walls`],
    ['Windows', I.windows.toLocaleString('en')],
  ];
  if (near) rows.push(['Near (mesh)', `${near.stats.triangles.toLocaleString('en')} tri · ${near.stats.drawCalls} calls`]);
  if (far) rows.push(['Far (baked)', `${far.stats.triangles.toLocaleString('en')} tri · ${far.stats.drawCalls} calls`]);
  $('specs').replaceChildren(...rows.map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: v }))));
  const br = far ? [
    ['Tiles', Object.keys(far.tiles).length],
    ['Bake time', far.stats.bakeMs ? far.stats.bakeMs + ' ms' : 'from memory'],
    ['Texture memory', (far.stats.textureBytes / 1048576).toFixed(1) + ' MB (+ mipmaps)'],
  ] : [['Far version', 'off (Near only)']];
  $('bakeStats').replaceChildren(...br.map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: String(v) }))));
}

/* ---------------- mapy kafelków ---------------- */
const TILE_NAMES = { upper: 'Storey module', plain: 'Plain wall', 'g:shop': 'Ground: shop window', 'g:window': 'Ground: windows', 'g:glass': 'Ground: glass wall', 'g:door': 'Ground: entrance', 'g:wall': 'Ground: plain wall' };
function tileCanvases(t) {
  const mk = (fill) => {
    const c = document.createElement('canvas'); c.width = t.w; c.height = t.h;
    const g = c.getContext('2d'), img = g.createImageData(t.w, t.h);
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) fill(img.data, ((t.h - 1 - y) * t.w + x) * 4, (y * t.w + x) * 4);   // wiersz 0 tekstury — dół
    g.putImageData(img, 0, 0); return c;
  };
  return {
    Colour: mk((d, o, i) => { d[o] = t.albedo[i]; d[o + 1] = t.albedo[i + 1]; d[o + 2] = t.albedo[i + 2]; d[o + 3] = 255; }),
    Normals: mk((d, o, i) => { d[o] = t.nh[i]; d[o + 1] = t.nh[i + 1]; d[o + 2] = t.nh[i + 2]; d[o + 3] = 255; }),
    Height: mk((d, o, i) => { d[o] = d[o + 1] = d[o + 2] = t.nh[i + 3]; d[o + 3] = 255; }),
    'AO · rough · metal': mk((d, o, i) => { d[o] = t.orm[i]; d[o + 1] = t.orm[i + 1]; d[o + 2] = t.orm[i + 2]; d[o + 3] = 255; }),
    Windows: mk((d, o, i) => { const w = t.orm[i + 3] / 16; d[o] = w ? 255 : 20; d[o + 1] = w ? 140 + w * 7 : 20; d[o + 2] = w ? 40 : 24; d[o + 3] = 255; }),
  };
}
function drawMaps() {
  const box = $('maps'), sel = $('tileSel'), tiles = far && far.tiles;
  if (!tiles) { box.replaceChildren(); sel.replaceChildren(); return; }
  const keep = sel.value; sel.replaceChildren(...Object.keys(tiles).map((k) => new Option(TILE_NAMES[k] || k, k)));
  sel.value = tiles[keep] ? keep : Object.keys(tiles)[0];
  const t = tiles[sel.value];
  box.replaceChildren(...Object.entries(tileCanvases(t)).map(([name, c]) => {
    const fig = el('figure', { className: 'mapTile', title: `${name} · ${t.w} × ${t.h} px (${fm(t.wm, 2)} × ${fm(t.hm, 2)} m) — save as PNG` });
    c.className = 'mapImg'; fig.append(c, el('figcaption', { textContent: name }));
    fig.onclick = () => c.toBlob((bl) => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `city-${spec.type}-${sel.value.replace(':', '-')}-${name.split(' ')[0].toLowerCase()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
    return fig;
  }));
}
$('tileSel').onchange = drawMaps;

/* ---------------- okna: pola opisu ---------------- */
// [id, ścieżka w opisie, jednostka, cyfry]
const RANGES = [
  ['fw', 'footprint.w', ' m', 1], ['fd', 'footprint.d', ' m', 1], ['farm', 'footprint.arm', ' m', 1], ['fcut', 'footprint.cut', ' m', 1],
  ['floors', 'floors', '', 0], ['floorH', 'floorH', ' m', 2], ['groundH', 'groundH', ' m', 2], ['front', 'front', '', 0],
  ['bay', 'bay', ' m', 1], ['wW', 'window.w', ' m', 2], ['wH', 'window.h', ' m', 2], ['wSill', 'window.sill', ' m', 2],
  ['wMull', 'window.mullions', '', 0], ['wDepth', 'window.depth', ' m', 2], ['bDepth', 'balcony.depth', ' m', 2],
  ['gEnt', 'ground.entrances', '', 0], ['plinth', 'bands.plinth', ' m', 2],
  ['rPitch', 'roof.pitch', '°', 0], ['rOver', 'roof.overhang', ' m', 2], ['rPar', 'roof.parapet', ' m', 2],
];
const COLORS = [['wallColor', 'wall.color'], ['wFrame', 'window.frame'], ['wGlass', 'window.glass'], ['bRail', 'balcony.railing'], ['gDoor', 'ground.door'], ['rColor', 'roof.color']];
const CHECKS = [['wTransom', 'window.transom'], ['cornice', 'bands.cornice'], ['fBands', 'bands.floors'], ['topCornice', 'bands.top']];
const SELECTS = [['wStyle', 'window.style', WINDOW_STYLES], ['gFront', 'ground.front', GROUND_KINDS], ['gSides', 'ground.sides', GROUND_KINDS], ['rType', 'roof.type', ROOF_TYPES]];
const MODULES = { window: 'Window', 'window,balcony': 'Window + balcony', balcony: 'Balcony', 'window,window,pier': 'Two windows + pier', 'window,pier': 'Window + pier', 'pier,window,window,pier': 'Pier, two windows, pier' };
const get = (p) => p.split('.').reduce((o, k) => o && o[k], spec);
const set = (p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k] || (o[k] = {}), spec)[last] = v; };

function fill() {
  const t = $('type'); t.replaceChildren();
  const g1 = el('optgroup', { label: 'Ready' }); TYPE_IDS.forEach((id) => g1.append(new Option(TYPES[id].label, 'type:' + id))); t.append(g1);
  const names = listAssets('building');
  if (names.length) { const g2 = el('optgroup', { label: 'Saved' }); names.forEach((n) => g2.append(new Option(n, 'asset:' + n))); t.append(g2); }
  t.value = L.src; if (t.value !== L.src) t.value = '';
  const wm = $('wallMat'); wm.replaceChildren();
  const m1 = el('optgroup', { label: 'Ready' }); Object.entries(MAT_PRESETS).forEach(([id, p]) => m1.append(new Option(p.label, 'preset:' + id))); wm.append(m1);
  const mats = listAssets('material');
  if (mats.length) { const m2 = el('optgroup', { label: 'Saved (materials lab)' }); mats.forEach((n) => m2.append(new Option(n, 'asset:' + n))); wm.append(m2); }
}
Object.entries(FOOTPRINTS).forEach(([id, f]) => $('shape').append(new Option(f.label, id)));
for (const [id, , list] of SELECTS) Object.entries(list).forEach(([k, v]) => $(id).append(new Option(v, k)));
Object.entries(WEATHER).forEach(([id, w]) => $('weather').append(new Option(w.label, id)));
function show() {
  for (const [id, p, unit, dig] of RANGES) { const v = get(p); $(id).value = v; $(id + 'V').textContent = (+v).toFixed(dig) + unit; }
  for (const [id, p] of COLORS) { $(id).value = get(p); $(id + 'V').textContent = get(p); }
  for (const [id, p] of CHECKS) $(id).checked = !!get(p);
  for (const [id, p] of SELECTS) $(id).value = get(p);
  const mk = spec.module.join(',');
  if (!MODULES[mk]) MODULES[mk] = spec.module.join(' + ');
  $('module').replaceChildren(...Object.entries(MODULES).map(([k, v]) => new Option(v, k))); $('module').value = mk;
  $('shape').value = spec.footprint.shape;
  $('armRow').hidden = !['L', 'U'].includes(spec.footprint.shape); $('cutRow').hidden = spec.footprint.shape !== 'corner';
  for (const id of ['fw', 'fd']) $(id).closest('.row').hidden = spec.footprint.shape === 'custom';
  $('front').max = String(Math.max(3, (spec.footprint.shape === 'custom' && spec.footprint.points ? spec.footprint.points.length : 8) - 1));
  $('seed').value = spec.seed; $('lit').value = spec.lit; $('litV').textContent = Math.round(spec.lit * 100) + ' %';
  const ws = Object.entries(MAT_PRESETS).find(([, p]) => p.kind === spec.wall.kind && p.label === spec.wall.label);
  $('wallMat').value = spec.wall.asset ? 'asset:' + spec.wall.asset : ws ? 'preset:' + ws[0] : '';
  $('name').value = L.src.startsWith('asset:') ? L.src.slice(6) : '';
  $('jsonText').value = JSON.stringify(spec, null, 1);
}
const changed = (ms) => { spec = normalizeSpec(spec); soon(ms); };
for (const [id, p, unit, dig] of RANGES) $(id).oninput = () => { set(p, +$(id).value); $(id + 'V').textContent = (+$(id).value).toFixed(dig) + unit; changed(); };
for (const [id, p] of COLORS) $(id).oninput = () => { set(p, $(id).value); $(id + 'V').textContent = $(id).value; changed(300); };
for (const [id, p] of CHECKS) $(id).onchange = () => { set(p, $(id).checked); changed(0); };
for (const [id, p] of SELECTS) $(id).onchange = () => { set(p, $(id).value); spec = normalizeSpec(spec); show(); soon(0); };
$('module').onchange = () => { spec.module = $('module').value.split(','); changed(0); };
$('seed').onchange = () => { spec.seed = +$('seed').value; changed(0); };
$('lit').oninput = () => {
  spec.lit = +$('lit').value; $('litV').textContent = Math.round(spec.lit * 100) + ' %';
  if (far) far.setLit(spec.lit);
  clearTimeout(timer); timer = setTimeout(() => { if (near || L.mode === 'near') rebuild(); else { L.spec = spec; save(); } }, 350);
};
$('shape').onchange = () => {
  spec.footprint.shape = $('shape').value; if ($('shape').value === 'custom' && !spec.footprint.points) startDraw();
  spec = normalizeSpec(spec); show(); soon(0);
};
$('type').onchange = () => {
  const v = $('type').value; L.src = v;
  spec = normalizeSpec(v.startsWith('asset:') ? getAsset('building', v.slice(6)) || { type: 'tenement' } : { type: v.slice(5) });
  L.lodAt = 0; show(); rebuild().then(() => aimCam('corner'));
};
$('wallMat').onchange = () => {
  const v = $('wallMat').value, c = spec.wall.color;
  const def = v.startsWith('asset:') ? { ...(getAsset('material', v.slice(6)) || {}), asset: v.slice(6) } : { ...MAT_PRESETS[v.slice(7)] };
  spec.wall = matNormalize(def); spec.wall.label = def.label; if (def.asset) spec.wall.asset = def.asset;
  if (!def.asset) spec.wall.color = MAT_PRESETS[v.slice(7)].color || c;
  show(); changed(0);
};
$('mode').onchange = () => { L.mode = $('mode').value; save(); rebuild(); };
$('ppm').onchange = () => { L.ppm = +$('ppm').value; save(); rebuild(); };
$('pom').onchange = () => { L.pom = $('pom').checked; setPom(L.pom); save(); };
$('lodAt').oninput = () => { L.lodAt = +$('lodAt').value; $('lodAtV').textContent = L.lodAt + ' m'; save(); pickShown(); };
$('save').onclick = () => {
  const n = $('name').value.trim(); if (!n) { status('Give the building a name first.'); return; }
  saveAsset('building', n, { ...spec, label: n }); L.src = 'asset:' + n; save(); fill(); $('type').value = L.src; status(`Saved: ${n} (asset "building").`);
};
$('del').onclick = () => { if (!L.src.startsWith('asset:')) { status('A ready building cannot be deleted.'); return; } removeAsset('building', L.src.slice(6)); L.src = 'type:' + spec.type; fill(); $('type').value = L.src; };
$('jsonApply').onclick = () => { try { spec = normalizeSpec(JSON.parse($('jsonText').value)); show(); rebuild(); $('jsonMsg').textContent = 'Applied.'; } catch (e) { $('jsonMsg').textContent = 'Not applied: ' + e.message; } };
$('jsonCopy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(spec, null, 1)); $('jsonMsg').textContent = 'Copied.'; } catch { $('jsonMsg').textContent = 'Copy it from the box.'; } };
onAssetsChange(() => { const v = $('type').value; fill(); $('type').value = v; show(); });

/* ---------------- światło: pogoda i pora dnia (noc — okna świecą) ---------------- */
function light() {
  const Lt = stage.setLight({ weather: L.weather, time: L.time });
  setNight(Math.min(1, Math.max(0, (1 - Lt.day) * 1.25)));
  const h = Math.floor(L.time), m = Math.round((L.time - h) * 60);
  $('timeV').textContent = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
$('weather').onchange = () => { L.weather = $('weather').value; save(); light(); };
$('time').oninput = () => { L.time = +$('time').value; save(); light(); };

/* ---------------- kamera: orbita, przesuwanie, ujęcia ---------------- */
const orbit = { yaw: Math.PI + 0.6, pitch: 0.25, dist: 60, target: new THREE.Vector3(0, 8, 0) };
const CAMS = { front: ['Front', 0, 0.12, 1.5], corner: ['Corner', 0.6, 0.25, 2.5], side: ['Side', -Math.PI / 2, 0.15, 1.7], top: ['From above', 0.4, 1.3, 2.4], far: ['Far (baked)', 0.7, 0.2, 0] };
function aimCam(id) {
  const [, yaw, pitch, k] = CAMS[id], b = near || far;
  const e = b && b.layout.edges[b.layout.front], base = e ? Math.atan2(e.nrm[0], e.nrm[1]) : Math.PI;   // od frontu
  orbit.yaw = base + yaw; orbit.pitch = pitch;
  orbit.dist = k ? Math.max(12, radius * k) : Math.max(L.lodAt * 1.35, radius * 3);
  orbit.target.set(center.x, Math.max(1.5, center.y * 0.7), center.z);
}
$('cams').replaceChildren(...Object.entries(CAMS).map(([id, [label]]) => el('button', { type: 'button', textContent: label, onclick: () => aimCam(id) })));
let drag = null;
const cv = renderer.domElement;
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button, x0: e.clientX, y0: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => {
  if (drawing) hoverDraw(e);
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b === 2 || e.shiftKey) {   // przesuwanie celu w płaszczyźnie gruntu
    const k = orbit.dist * 0.0016, s = Math.sin(orbit.yaw), c = Math.cos(orbit.yaw);
    orbit.target.x += (-dx * c - dy * s) * k; orbit.target.z += (dx * s - dy * c) * k;
  } else { orbit.yaw -= dx * 0.006; orbit.pitch = Math.max(-0.05, Math.min(1.5, orbit.pitch + dy * 0.005)); }
});
cv.addEventListener('pointerup', (e) => {
  const click = drag && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5 && drag.b === 0;
  drag = null;
  if (click && drawing) addPoint(e);
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.max(4, Math.min(4000, orbit.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });

/* ---------------- rysowanie obrysu na gruncie ---------------- */
let drawing = false, pts = [], hover = null;
const drawLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf2b84b, depthTest: false }));
drawLine.renderOrder = 10; drawLine.visible = false; scene.add(drawLine);
const grid = new THREE.GridHelper(200, 100, 0x8a7a50, 0x55503c); grid.position.y = 0.03; grid.visible = false; scene.add(grid);
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundPoint(e) {
  const r = cv.getBoundingClientRect(), p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(p, camera); const q = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, q)) return null;
  return [Math.round(q.x * 2) / 2, Math.round(q.z * 2) / 2];   // co 0,5 m
}
function drawShape() {
  const list = hover ? [...pts, hover] : pts, v = list.map(([x, z]) => new THREE.Vector3(x, 0.08, z));
  if (list.length > 2) v.push(v[0].clone());
  drawLine.geometry.dispose(); drawLine.geometry = new THREE.BufferGeometry().setFromPoints(v);   // liczba punktów rośnie — nowa geometria
}
function startDraw() {
  drawing = true; pts = []; hover = null; drawLine.visible = grid.visible = true; $('draw').textContent = 'Finish outline';
  for (const b of [near, far]) if (b) b.group.visible = false;
  orbit.yaw = Math.PI; orbit.pitch = 1.45; orbit.dist = Math.max(60, radius * 3); orbit.target.set(0, 0, 0);
  status('Click the corners on the ground; Enter, a click on the first point or Finish closes the outline, Esc cancels.');
}
function endDraw(ok) {
  drawing = false; drawLine.visible = grid.visible = false; $('draw').textContent = 'Draw outline';
  const poly = ok ? cleanPolygon(pts) : null;
  if (poly) {
    spec.footprint.shape = 'custom'; spec.footprint.points = poly;
    const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
    spec.footprint.w = Math.max(...xs) - Math.min(...xs); spec.footprint.d = Math.max(...zs) - Math.min(...zs);
    spec.front = 0; spec = normalizeSpec(spec); L.lodAt = 0; show(); rebuild().then(() => aimCam('corner'));
  } else { if (ok) status('An outline needs at least 3 corners and some area.'); pickShown(true); show(); }
}
function addPoint(e) {
  const p = groundPoint(e); if (!p) return;
  if (pts.length > 2 && Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) < 1.5) { endDraw(true); return; }
  pts.push(p); drawShape();
}
function hoverDraw(e) { hover = groundPoint(e); drawShape(); }
$('draw').onclick = () => { if (drawing) endDraw(true); else startDraw(); };
addEventListener('keydown', (e) => {
  if (!drawing || (e.target.closest && e.target.closest('input, select, textarea'))) return;
  if (e.key === 'Enter') endDraw(true); else if (e.key === 'Escape') endDraw(false);
  else if (e.key === 'Backspace') { pts.pop(); drawShape(); }
});

/* ---------------- dla AI ---------------- */
// CityApi: make(opis) — zbuduj (zwraca opis po sprawdzeniu); spec — obecny opis; types — rodzaje; footprints — obrysy;
// info — liczby budynku; save(nazwa) — zasób „building”; night(0…1) — pora: noc, okna świecą
window.CityApi = {
  make: async (d) => { spec = normalizeSpec(d); L.src = 'type:' + spec.type; $('type').value = L.src; L.lodAt = 0; show(); await rebuild(); aimCam('corner'); return JSON.parse(JSON.stringify(spec)); },
  get spec() { return JSON.parse(JSON.stringify(spec)); },
  types: Object.fromEntries(TYPE_IDS.map((k) => [k, TYPES[k].label])),
  footprints: Object.fromEntries(Object.entries(FOOTPRINTS).map(([k, f]) => [k, f.label])),
  get info() { const b = near || far; return b ? { ...b.info, near: near && near.stats, far: far && far.stats } : null; },
  save: (n) => { saveAsset('building', String(n), { ...spec, label: String(n) }); fill(); return true; },
  night: (k) => { L.time = k > 0.5 ? 22 : 13; light(); return k; },
};
function apiTab() {
  if (!window.LabConsole) return;
  const box = el('div', { className: 'cityApi' });
  const ta = el('textarea', { className: 'mono', rows: 5, spellcheck: false });
  ta.value = JSON.stringify({ type: 'block', floors: 12, footprint: { shape: 'L', w: 48, d: 36, arm: 12 }, roof: { type: 'flat', parapet: 0.8 } });
  const out = el('p', { className: 'note', textContent: 'A description as JSON; missing fields come from the type. Types: ' + TYPE_IDS.join(', ') + '.' });
  const go = el('button', { type: 'button', textContent: 'Build (CityApi.make)' });
  go.onclick = async () => { try { const r = await window.CityApi.make(JSON.parse(ta.value)); out.textContent = 'Built: ' + JSON.stringify(r).slice(0, 200); } catch (e) { out.textContent = 'Error: ' + e.message; } };
  box.append(ta, go, out);
  window.LabConsole.addTab({ id: 'cityapi', title: 'API', titlePl: 'API', el: box });
}
if (window.LabConsole) apiTab(); else addEventListener('load', apiTab);

/* ---------------- pętla ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target);
  if (!drawing && L.mode === 'auto') pickShown();
  stage.update(dt, camera);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);
  requestAnimationFrame(frame);
}
fill(); show();
$('mode').value = L.mode; $('ppm').value = String(L.ppm); $('pom').checked = L.pom; setPom(L.pom);
$('weather').value = L.weather; $('time').value = L.time;
light(); resize();
rebuild().then(() => aimCam('corner'));
window.__city = { stage, scene, camera, orbit, get spec() { return spec; }, get near() { return near; }, get far() { return far; }, get shown() { return shown; } };
requestAnimationFrame(frame);

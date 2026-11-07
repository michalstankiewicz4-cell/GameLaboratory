// Land Lab: procedural land and sea (LandKit) under the SkyKit sky, the WaterKit sea with shallows and surf, and the
// transformer's ORP Błyskawica to sail through it. The map is a torus (sail out of one side, in at the other: the
// heightmap and the waves both repeat across it) or bounded by a barrier (buoy line, mountain range, invisible wall).
// Water bodies are mixed by region (RegionKit): one body everywhere, hand-shaped layouts (river mouth, lake and canal,
// fjord over its sill, harbour bay, ice edge) or mixed from the seed; the sea blends their looks, waves and currents.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER } from '../../envs/sky/skykit.js';
import { heightAt, LOOKS } from '../../envs/water/waterkit.js';
import { sampleHeight, SHAPES, TERRAIN_DEFAULTS } from '../../envs/land/landkit.js';
import { generateWorld, regionAt, LAYOUTS, WORLD_DEFAULTS, BODY_ORDER, CHART, BIOMES, BIOME_ORDER, BIOME_CHART, biomeTexture, biomeAt } from '../../envs/land/regionkit.js';
import { WATER_BODIES } from '../../envs/water/waterkit.js';
import { transformShip } from '../../models/ships-sea/transform.js';
import { listAssets, getAsset, saveAsset, removeAsset, onAssetsChange } from '../../scene/assets.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';
import { createStage } from '../shared/stage.js';
import { worldFor, PLANETS } from '../../envs/land/planet.js';
import { loadSpace, spaceReady } from '../../scene/space.js';
// the 3D view's box (ui/shell/windows.js, LabView): the free middle between the panels, or the whole window
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.land.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { map: { ...TERRAIN_DEFAULTS }, water: { ...WORLD_DEFAULTS }, sky: { weather: 'fair', sunEl: 24, sunAz: 210 }, sail: true, cam: 'Chase', ...(saved || {}) };
S.map = { ...TERRAIN_DEFAULTS, ...S.map }; S.water = { ...WORLD_DEFAULTS, ...(S.water || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 40000);
const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
// the shared base stage (js/labs/shared/stage.js): the same sky, light, fog, sea and terrain as the scene editor —
// here a far horizon (sky 20 km, sea 16 km), the waves standing (no drift), the haze thinning with the camera's height
const stage = createStage(renderer, scene, { envEvery: 0.4, skyRadius: 20000, seaRadius: 16000, clouds: [0.008, 0], shiftSpeed: 0, fogHeight: true });
const { skyU, WU, sun } = stage;
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 2400 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.4;

/* ---------------- terrain ---------------- */
let T = generateWorld(S.map, S.water);
stage.setWorld(T); stage.setSurface('land');   // terrain, water regions, biomes and the boundary buoys

/* ---------------- sea (knows the terrain: shallows, surf, waves dying on the shore) ---------------- */
WU.uWetOn.value = 0;
const waves = () => stage.waves;
function seaFor(wind) {   // the sea from the wind; the stage makes the waves repeat across the map
  const U = Math.max(2, wind), Hs = Math.min(5, 0.0246 * U * U), Lp = Math.min(160, Math.max(12, 0.83 * U * U)), lk = LOOKS.atlantic;
  stage.setSea({ Hs, Lp, chop: 0.45, spread: 35, n: 12, dir: 50, ...lk, crest: Math.min(1, lk.crest + U * 0.012) });
}

/* ---------------- ship (game-ready, from the transformer) ---------------- */
const TS = transformShip('blyskawica');
const ship = { obj: TS.lod, x: 0, z: 0, hd: 0, v: 0, thr: 0, rud: 0, on: false, msg: '', msgT: 0, h: 0, p: 0, r: 0, vh: 0, vp: 0, vr: 0 };
ship.obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
scene.add(ship.obj);
const DRAUGHT = 3.5, HALF_L = 52;
const wrapC = (v) => ((v % T.size) + T.size) % T.size;
function depthAt(x, z) { return -sampleHeight(T, x, z); }
function spawn() {
  // deepest open water nearest the middle of the map (spiral search)
  const c = T.size / 2, step = T.cell * 4;
  for (let r = 0; r < T.size * 0.7; r += step) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / (step * 2)));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, x = c + Math.cos(a) * r, z = c + Math.sin(a) * r;
      if (!T.wrap && (x < 300 || z < 300 || x > T.size - 300 || z > T.size - 300)) continue;
      if (clearAt(x, z, a + Math.PI / 2, 12)) { ship.x = x; ship.z = z; ship.hd = a + Math.PI / 2; ship.v = 0; ship.thr = 0; ship.on = true; return true; }
    }
  }
  ship.on = false; return false;
}
function clearAt(x, z, hd, minDepth = DRAUGHT + 0.5) {
  const fx = Math.sin(hd), fz = Math.cos(hd);
  for (const s of [-1, -0.5, 0, 0.5, 1]) if (depthAt(x + fx * s * HALF_L, z + fz * s * HALF_L) < minDepth) return false;
  return true;
}

/* ---------------- map (re)generation ---------------- */
// the world in three stages, so the loading card can show each (generateShown); generate() runs them at once
let genT0 = 0;
const GEN_STAGES = [
  ['Heightmap, rivers and water regions', 0.05, () => { genT0 = performance.now(); T = worldFor(renderer, S.map, S.water); }],   // generator albo grunt planety
  ['Terrain, regions and biomes', 0.7, genTextures],
  ['Chart, sea and the ship', 0.85, genRest],
];
function generate() { for (const [, , f] of GEN_STAGES) f(); }
const generateShown = () => window.LabLoad.run('Generating the world…', async (step) => {
  if (S.map.planet && !spaceReady()) { await step('The planet kits (BodyKit)', 0.01); await loadSpace(); }   // grunt planety: najpierw BodyKit
  for (const [n, p, f] of GEN_STAGES) { await step(n, p); f(); }
});
function genTextures() {
  stage.setWorld(T);   // height, region and biome textures; ice, oil, buoys
}
function genRest() {
  const t0 = genT0;
  $('biomeBlend').disabled = S.water.biome !== 'zones';
  $('biomeShare').replaceChildren(...BIOME_ORDER.filter((b) => T.biomes.share[b] > 0.005).flatMap((b) => [el('span', { textContent: BIOMES[b].label.replace(/ \(.*/, '') }), el('b', { textContent: `${(T.biomes.share[b] * 100).toFixed(0)} %` })]));
  const sh = T.regions.share;
  for (const k of ['shape', 'land', 'wrap']) $(k).disabled = !['single', 'mixed'].includes(S.water.layout);
  $('body').disabled = S.water.layout !== 'single'; $('rivers').disabled = $('ice').disabled = S.water.layout !== 'mixed';
  // grunt planety: ustawienia generatora nie działają (wysokości, wody i biom daje planeta)
  const pl = !!S.map.planet; $('planetNote').hidden = !pl;
  if (pl) for (const k of ['seed', 'random', 'shape', 'land', 'relief', 'depth', 'rough', 'erosion', 'biome', 'biomeBlend', 'layout', 'body', 'blend', 'rivers', 'ice', 'wrap']) $(k).disabled = true;
  else for (const k of ['seed', 'random', 'relief', 'depth', 'rough', 'erosion', 'biome', 'layout', 'blend']) $(k).disabled = false;
  $('bodyShare').replaceChildren(...BODY_ORDER.filter((b) => sh[b] > 0.005).flatMap((b) => [el('span', { textContent: WATER_BODIES[b].label.replace(/ \(.*/, '') }), el('b', { textContent: `${(sh[b] * 100).toFixed(0)} %` })]));
  seaFor(WEATHER[S.sky.weather]?.wind ?? 6);
  drawChartBase();
  const found = spawn();
  $('sail').disabled = !found;
  if (!found && camMode !== 'Free flight') setCam('Overview');
  if (found && camMode === 'Free flight' && S.sail) setCam('Chase');
  ship.obj.visible = ship.on && S.sail;
  $('genStats').replaceChildren(...[['Generated', `${T.ms} ms`], ['Land', `${(T.landShare * 100).toFixed(1)} %`], ['Highest', `${Math.round(T.maxH)} m`], ['Deepest', `${Math.round(-T.minH)} m`],
    ['Grid', `${T.res}² · ${T.cell.toFixed(1)} m`], ['Ship', ship.on ? 'afloat' : 'no water deep enough']].flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: b })]));
  $('edgeNote').textContent = T.wrap ? 'Wrap-around: sail out of one edge and you come in at the opposite one — land, sea and waves continue without a seam.' : ({ buoys: 'Bounded by a line of buoys 60 m inside the edge; the ship stops at it.', mountains: 'Bounded by a mountain range along the edge.', wall: 'Bounded by an invisible wall 60 m inside the edge.' })[T.barrier];
  $('barrier').disabled = T.wrap;
  const lay = S.water.layout, what = lay === 'single' ? `${(SHAPES[T.shape] || { label: T.shape }).label}, ${WATER_BODIES[S.water.body].label.replace(/ \(.*/, '').toLowerCase()}` : lay === 'mixed' ? `Mixed (${(SHAPES[T.shape] || { label: T.shape }).label})` : LAYOUTS[lay].label.replace(/:.*/, '');
  const planet = T.planet && PLANETS.find((p) => p.ref === T.planet);
  $('status').textContent = $('landSub').textContent = planet ? `Planet ${planet.label} · ${(T.landShare * 100).toFixed(0)} % land · ${T.size / 1000} km cut at the equator`
    : `${what} · ${(T.landShare * 100).toFixed(0)} % land · ${T.size / 1000} km ${T.wrap ? 'wrap-around' : 'bounded'} map · seed ${T.seed}`;
  window.__landGenMs = performance.now() - t0;
}

/* ---------------- chart (minimap) ---------------- */
const mini = $('mini'), mg = mini.getContext('2d');
let chartBase = null;
function drawChartBase() {
  const W = mini.width, img = mg.createImageData(W, W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const h = sampleHeight(T, (i + 0.5) / W * T.size, (j + 0.5) / W * T.size), k = (j * W + i) * 4;
    let c;
    if (h < 0) {
      const d = Math.min(1, -h / Math.max(T.depth, 1)), r = regionAt(T, (i + 0.5) / W * T.size, (j + 0.5) / W * T.size); c = [0, 0, 0];
      for (const b of BODY_ORDER) for (let q = 0; q < 3; q++) c[q] += CHART[b][q] * r.w[b];
      c = c.map((x) => x * (1.15 - 0.45 * d)); if (-h < 3) c = c.map((x) => x * 0.6 + 70);
    }
    else {
      const r = h / Math.max(1, T.relief), bm = biomeAt(T, (i + 0.5) / W * T.size, (j + 0.5) / W * T.size);
      const ct = r < 0.012 ? [205, 190, 140] : r < 0.45 ? [80 + 60 * r, 110 - 20 * r, 55] : r < 0.75 ? [125, 112, 96] : [235, 238, 242];
      const cd = h < 2 ? [205, 190, 140] : r > 0.3 ? [150, 108, 80] : BIOME_CHART.desert, cp = h < 2 ? [205, 190, 140] : BIOME_CHART.plains;
      c = [0, 1, 2].map((q) => ct[q] * bm.temperate + cp[q] * bm.plains + cd[q] * bm.desert);
    }
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  chartBase = img;
}
function drawChart() {
  if (!chartBase) return;
  const W = mini.width; mg.putImageData(chartBase, 0, 0);
  const px = (x) => (wrapC(x) / T.size) * W;
  const cx = px(camera.position.x), cz = px(camera.position.z);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  mg.strokeStyle = 'rgba(255,255,255,.7)'; mg.lineWidth = 1; mg.beginPath();
  const a = Math.atan2(dir.x, dir.z), f = 0.45;
  mg.moveTo(cx, cz); mg.lineTo(cx + Math.sin(a - f) * 18, cz + Math.cos(a - f) * 18); mg.moveTo(cx, cz); mg.lineTo(cx + Math.sin(a + f) * 18, cz + Math.cos(a + f) * 18); mg.stroke();
  if (ship.on && S.sail) {
    const sx = px(ship.x), sz = px(ship.z), fx = Math.sin(ship.hd), fz = Math.cos(ship.hd);
    mg.fillStyle = '#f2b84b'; mg.beginPath(); mg.moveTo(sx + fx * 7, sz + fz * 7); mg.lineTo(sx - fx * 4 + fz * 3, sz - fz * 4 - fx * 3); mg.lineTo(sx - fx * 4 - fz * 3, sz - fz * 4 + fx * 3); mg.closePath(); mg.fill();
  }
  if (!T.wrap) { mg.strokeStyle = 'rgba(220,60,50,.8)'; const m = 60 / T.size * W; mg.strokeRect(m, m, W - 2 * m, W - 2 * m); }
  if ($('labels').checked) {
    mg.font = '600 10px system-ui, sans-serif'; mg.textAlign = 'center';
    for (const [t, x, z] of T.regions.labels) { const lx = x / T.size * W, lz = z / T.size * W; mg.fillStyle = 'rgba(0,0,0,.55)'; mg.fillText(t, lx + 1, lz + 1); mg.fillStyle = '#fff'; mg.fillText(t, lx, lz); }
  }
}
mini.addEventListener('click', (e) => {
  const r = mini.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * T.size, z = (e.clientY - r.top) / r.height * T.size;
  if (ship.on && S.sail && clearAt(x, z, ship.hd)) { ship.x = x; ship.z = z; ship.v = 0; ship.thr = 0; return; }
  free.pos.set(x, Math.max(120, sampleHeight(T, x, z) + 150), z); setCam('Free flight');
});

/* ---------------- light and weather ---------------- */
function updateSky() {
  const w = WEATHER[S.sky.weather] || WEATHER.fair;
  const L = stage.setLight({ weather: S.sky.weather, sunEl: S.sky.sunEl, sunAz: S.sky.sunAz, moon: 0.8 });   // sky, sun, fog, sea light, sky environment
  scene.environmentIntensity = (0.85 - w.coverage * w.density * 0.45) * (0.1 + 0.9 * L.day);   // and darker at night
  look.sunVisible = stage.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - L.day)) });
  seaFor(w.wind);
}

/* ---------------- UI ---------------- */
for (const [k, s] of Object.entries(SHAPES)) $('shape').append(el('option', { value: k, textContent: s.label }));
for (const [k, w] of Object.entries(WEATHER)) $('weather').append(el('option', { value: k, textContent: w.label }));
for (const [k, l] of Object.entries(LAYOUTS)) $('layout').append(el('option', { value: k, textContent: l.label }));
for (const b of BODY_ORDER) $('body').append(el('option', { value: b, textContent: WATER_BODIES[b].label }));
const NOTES = {
  single: 'The whole map is one water body: the terrain comes from the generator above.',
  estuary: 'A river winds down to the coast, widens into an estuary and pushes a brown, brackish plume out to sea. The current is strongest upstream and fans out at the mouth.',
  lake: 'An inland lake, dark and peaty, reaches the sea down a dredged canal (7.5 m); the canal water turns from lake to sea along its length.',
  fjord: 'Open sea, skerries, then a sill at the fjord mouth (about 38 m) and the deep, still basin between high walls.',
  harbour: 'A bay sheltered by a low sandy spit, dredged to 11 m, calm and murky with oil; the entrance is the gap at the west end of the spit.',
  iceEdge: 'Open sea to the south; loose floes thicken into pack ice to the north, with open leads (polynyas).',
  mixed: 'The generator\u2019s terrain classified: open sea, enclosed lakes, narrow inlets between high ground become fjords; rivers are carved from the hills to the sea; an ice edge from the north.',
};
const showNote = () => { $('layoutNote').textContent = NOTES[S.water.layout] || ''; };
let genTimer = 0;
const regen = () => { clearTimeout(genTimer); genTimer = setTimeout(() => { generateShown(); save(); }, 250); };
const fmts = { land: (v) => Math.round(v * 100) + ' %', relief: (v) => v + ' m', depth: (v) => v + ' m', rough: (v) => v.toFixed(2), erosion: (v) => v.toFixed(2) };
for (const [k, f] of Object.entries(fmts)) {
  const r = $(k), o = $(k + 'V'); r.value = S.map[k]; o.textContent = f(+r.value);
  r.addEventListener('input', () => { S.map[k] = +r.value; o.textContent = f(+r.value); regen(); });
}
$('layout').value = S.water.layout; $('layout').onchange = () => { S.water.layout = $('layout').value; showNote(); regen(); };
$('body').value = S.water.body; $('body').onchange = () => { S.water.body = $('body').value; regen(); };
const wfmt = { blend: (v) => v + ' m', rivers: (v) => String(v), ice: (v) => Math.round(v * 100) + ' %', biomeBlend: (v) => (v / 1000).toFixed(1) + ' km' };
for (const [k, f] of Object.entries(wfmt)) { const r = $(k), o = $(k + 'V'); r.value = S.water[k]; o.textContent = f(+r.value); r.addEventListener('input', () => { S.water[k] = +r.value; o.textContent = f(+r.value); regen(); }); }
$('labels').onchange = () => drawChart();
for (const [k, b] of Object.entries(BIOMES)) $('biome').append(el('option', { value: k, textContent: b.label }));
$('biome').value = S.water.biome; $('biome').onchange = () => { S.water.biome = $('biome').value; regen(); };
showNote();
$('seed').value = S.map.seed; $('seed').addEventListener('change', () => { S.map.seed = Math.max(0, Math.min(999999, +$('seed').value | 0)); regen(); });
$('random').onclick = () => { S.map.seed = Math.floor(Math.random() * 1e6); $('seed').value = S.map.seed; generateShown(); save(); };
$('gen').onclick = () => { generateShown(); save(); };
for (const k of ['shape', 'size', 'res', 'barrier']) { $(k).value = String(S.map[k]); $(k).onchange = () => { S.map[k] = k === 'size' || k === 'res' ? +$(k).value : $(k).value; regen(); }; }
$('wrap').value = S.map.wrap ? '1' : '0'; $('wrap').onchange = () => { S.map.wrap = $('wrap').value === '1'; regen(); };
$('sail').checked = S.sail; $('sail').onchange = () => { S.sail = $('sail').checked; ship.obj.visible = ship.on && S.sail; if (!S.sail && camMode !== 'Overview') setCam('Free flight'); else if (S.sail) setCam('Chase'); save(); };
$('weather').value = S.sky.weather; $('weather').onchange = () => { S.sky.weather = $('weather').value; updateSky(); save(); };
for (const k of ['sunEl', 'sunAz']) { $(k).value = S.sky[k]; $(k + 'V').textContent = S.sky[k] + '°'; $(k).addEventListener('input', () => { S.sky[k] = +$(k).value; $(k + 'V').textContent = S.sky[k] + '°'; updateSky(); save(); }); }
// ląd jako zasób dla edytora sceny (js/scene/assets.js, rodzaj „land”): ustawienia mapy i wód
function fillLand(sel) {
  const names = listAssets('land');
  $('landList').replaceChildren(...(names.length ? names.map((n) => el('option', { value: n, textContent: n })) : [el('option', { value: '', textContent: '(none yet)' })]));
  if (sel && names.includes(sel)) $('landList').value = sel;
  $('landLoad').disabled = $('landDel').disabled = !names.length;
}
$('landSave').onclick = () => {
  const n = $('landName').value.trim(); if (!n) { $('landNote').textContent = 'Give the land a name first.'; return; }
  const ok = saveAsset('land', n, { map: { ...S.map }, water: { ...S.water } });
  $('landNote').textContent = ok ? `Saved "${n}". The scene editor offers it for the surface Land.` : 'The browser did not let me save.';
  fillLand(n);
};
$('landLoad').onclick = () => {
  const n = $('landList').value, a = n && getAsset('land', n); if (!a) return;
  S.map = { ...TERRAIN_DEFAULTS, ...a.map }; S.water = { ...WORLD_DEFAULTS, ...a.water };
  for (const [k, f] of Object.entries(fmts)) { $(k).value = S.map[k]; $(k + 'V').textContent = f(S.map[k]); }
  for (const [k, f] of Object.entries(wfmt)) { $(k).value = S.water[k]; $(k + 'V').textContent = f(S.water[k]); }
  for (const k of ['shape', 'size', 'res', 'barrier']) $(k).value = String(S.map[k]);
  $('wrap').value = S.map.wrap ? '1' : '0'; $('seed').value = S.map.seed; $('planet').value = S.map.planet || '';
  $('layout').value = S.water.layout; $('body').value = S.water.body; $('biome').value = S.water.biome; showNote();
  $('landName').value = n; generateShown(); save();
  $('landNote').textContent = `Loaded "${n}".`;
};
$('landDel').onclick = () => { const n = $('landList').value; if (!n) return; removeAsset('land', n); fillLand(); $('landNote').textContent = `Deleted "${n}".`; };
fillLand(); onAssetsChange(() => fillLand($('landList').value));
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S.map, null, 1)); $('copied').textContent = 'Copied. Paste it into the chat to keep this map.'; } catch { $('copied').textContent = 'Clipboard blocked by the browser.'; } };

/* ---------------- cameras ---------------- */
const orbit = { yaw: 2.6, pitch: 0.16, dist: 190 };
const free = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.25 };
let camMode = 'Chase';
const CAMS = { Chase: { yaw: 2.6, pitch: 0.16, dist: 190 }, Bridge: { yaw: 0, pitch: 0, dist: 0 }, Overview: { yaw: 2.2, pitch: 0.75, dist: 2600 }, 'Free flight': null };
function setCam(name) {
  camMode = name; S.cam = name;
  if (CAMS[name]) Object.assign(orbit, CAMS[name]);
  if (name === 'Free flight' && free.pos.lengthSq() === 0) free.pos.set(camera.position.x, Math.max(camera.position.y, 60), camera.position.z);
  [...$('cams').children].forEach((b) => b.classList.toggle('on', b.textContent === name));
}
for (const name of Object.keys(CAMS)) $('cams').append(el('button', { type: 'button', textContent: name, onclick: () => { if (name === 'Free flight') free.pos.copy(camera.position); setCam(name); } }));
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,select')) return;
  keys.add(e.code);
  if (e.code === 'KeyH') document.querySelectorAll('[data-window]').forEach((p) => p.classList.toggle('hidden-panel'));
  if (camMode !== 'Free flight' && ship.on && S.sail) {
    if (e.code === 'KeyW') ship.thr = Math.min(4, ship.thr + 1);
    if (e.code === 'KeyS') ship.thr = Math.max(-1, ship.thr - 1);
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
let drag = null; const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (camMode === 'Free flight') { free.yaw -= dx * 0.004; free.pitch = Math.max(-1.45, Math.min(1.2, free.pitch - dy * 0.004)); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-0.05, Math.min(1.45, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(9000, Math.max(30, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now(), simT = 0, frames = 0, fpsT = last;
const tmpV = new THREE.Vector3();
function say(m) { if (ship.msg !== m) { ship.msg = m; $('shipStatus').textContent = m; } ship.msgT = 2.5; }
function sailStep(dt) {
  if (!ship.on || !S.sail) return;
  ship.rud = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  const want = [-4, 0, 6, 11, 15.5, 20][ship.thr + 1];                         // m/s per engine order (full ahead ≈ 39 kn)
  ship.v += Math.max(-dt * 0.9, Math.min(dt * 0.6, want - ship.v));
  ship.hd += ship.rud * dt * Math.min(1, Math.abs(ship.v) / 6) * 0.045 * Math.sign(ship.v || 1);
  let nx = ship.x + Math.sin(ship.hd) * ship.v * dt, nz = ship.z + Math.cos(ship.hd) * ship.v * dt;
  if (!T.wrap) {
    const m = (T.barrier === 'mountains' ? 0.04 * T.size : 60) + HALF_L;
    if (nx < m || nz < m || nx > T.size - m || nz > T.size - m) { nx = Math.min(T.size - m, Math.max(m, nx)); nz = Math.min(T.size - m, Math.max(m, nz)); ship.v *= 0.3; ship.thr = 0; say(T.barrier === 'buoys' ? 'Stopped at the buoy line (barrier)' : 'At the edge of the map (barrier)'); }
  }
  if (!clearAt(nx, nz, ship.hd)) { ship.v = 0; ship.thr = 0; say('Aground! Reverse (S) or turn away'); nx = ship.x - Math.sin(ship.hd) * 0.6; nz = ship.z - Math.cos(ship.hd) * 0.6; }
  if (T.wrap) {
    const out = nx < 0 || nz < 0 || nx >= T.size || nz >= T.size, wx = out ? wrapC(nx) : nx, wz = out ? wrapC(nz) : nz;
    if (out) { say('Wrapped round to the opposite edge'); if (camMode === 'Free flight') free.pos.x += wx - nx; }
    nx = wx; nz = wz;
  }
  ship.x = nx; ship.z = nz;
  // the water it is in: the current carries it, sheltered water has smaller waves
  const rg = regionAt(T, ship.x, ship.z); ship.rg = rg;
  if (clearAt(ship.x + rg.flow[0] * dt, ship.z + rg.flow[1] * dt, ship.hd)) { ship.x += rg.flow[0] * dt; ship.z += rg.flow[1] * dt; }
  const fx = Math.sin(ship.hd), fz = Math.cos(ship.hd);
  const hb = heightAt(waves(), ship.x + fx * 40, ship.z + fz * 40, simT) * rg.waves, hs = heightAt(waves(), ship.x - fx * 40, ship.z - fz * 40, simT) * rg.waves;
  const sp = (x, v, tg, Tn, z) => { const w = 2 * Math.PI / Tn, a = w * w * (tg - x) - 2 * z * w * v; return [x + (v + a * dt) * dt, v + a * dt]; };
  [ship.h, ship.vh] = sp(ship.h, ship.vh, (hb + hs) / 2 - 0.05, 5.5, 0.55);
  [ship.p, ship.vp] = sp(ship.p, ship.vp, Math.atan((hb - hs) / 80), 4.8, 0.5);
  [ship.r, ship.vr] = sp(ship.r, ship.vr, -ship.rud * Math.min(1, ship.v / 20) * 0.05, 6, 0.4);
  ship.obj.position.set(ship.x, ship.h, ship.z); ship.obj.rotation.set(-ship.p, ship.hd, ship.r, 'YXZ');
  const cur = Math.hypot(rg.flow[0], rg.flow[1]), inW = BODY_ORDER.filter((b) => rg.w[b] > 0.08).sort((a, b) => rg.w[b] - rg.w[a]).map((b) => `${WATER_BODIES[b].label.replace(/ \(.*/, '')} ${Math.round(rg.w[b] * 100)} %`).join(', ');
  const line = `${(ship.v * 1.944).toFixed(0)} kn · engines ${['astern', 'stop', 'slow', 'half', 'full', 'flank'][ship.thr + 1]} · ${inW}${cur > 0.05 ? ` · current ${cur.toFixed(1)} m/s` : ''}`;
  ship.msgT -= dt; if (ship.msgT <= 0 && ship.msg) { ship.msg = ''; $('shipStatus').textContent = line; }
  else if (!ship.msg) $('shipStatus').textContent = line;
}
function placeCamera(dt) {
  const on = ship.on && S.sail;
  if (camMode === 'Free flight' || !on) {
    if (camMode !== 'Free flight' && !on) {               // overview without a ship: orbit the map centre
      const c = T.size / 2, cp = Math.cos(orbit.pitch);
      camera.position.set(c + Math.sin(orbit.yaw) * cp * orbit.dist, Math.sin(orbit.pitch) * orbit.dist + Math.max(0, T.maxH * 0.5), c + Math.cos(orbit.yaw) * cp * orbit.dist);
      camera.lookAt(c, 0, c);
    } else {
      const f = new THREE.Vector3(Math.sin(free.yaw) * Math.cos(free.pitch), Math.sin(free.pitch), Math.cos(free.yaw) * Math.cos(free.pitch));
      const r = new THREE.Vector3(-Math.cos(free.yaw), 0, Math.sin(free.yaw));
      const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 900 : 160) * dt;
      if (keys.has('KeyW')) free.pos.addScaledVector(f, sp); if (keys.has('KeyS')) free.pos.addScaledVector(f, -sp);
      if (keys.has('KeyA')) free.pos.addScaledVector(r, -sp); if (keys.has('KeyD')) free.pos.addScaledVector(r, sp);
      if (keys.has('KeyE')) free.pos.y += sp; if (keys.has('KeyQ')) free.pos.y -= sp;
      free.pos.y = Math.max(free.pos.y, Math.max(0, sampleHeight(T, free.pos.x, free.pos.z)) + 3);
      camera.position.copy(free.pos); camera.lookAt(tmpV.copy(free.pos).add(f));
    }
    return;
  }
  if (camMode === 'Bridge') {
    const fx = Math.sin(ship.hd), fz = Math.cos(ship.hd);
    camera.position.set(ship.x + fx * 26, ship.h + 13.2, ship.z + fz * 26);
    camera.lookAt(ship.x + fx * 400, ship.h + 6, ship.z + fz * 400);
    return;
  }
  const yaw = ship.hd + orbit.yaw, cp = Math.cos(orbit.pitch);
  camera.position.set(ship.x + Math.sin(yaw) * cp * orbit.dist, ship.h + 8 + Math.sin(orbit.pitch) * orbit.dist, ship.z + Math.cos(yaw) * cp * orbit.dist);
  const ground = Math.max(sampleHeight(T, camera.position.x, camera.position.z), heightAt(waves(), camera.position.x, camera.position.z, simT)) + 2;
  if (camera.position.y < ground) camera.position.y = ground;
  camera.lookAt(ship.x, ship.h + 8, ship.z);
}
function frame(now) {
  const dtMs = now - last, dt = Math.min(0.05, dtMs / 1000); last = now; simT += dt;
  stage.tick(dt);
  sailStep(dt); placeCamera(dt);
  stage.follow(camera);   // sky and sea with the camera, the terrain grids, the haze thinning with height, the sky environment
  // the shadow box follows what the camera looks at
  const tgt = ship.on && S.sail && camMode !== 'Free flight' ? tmpV.set(ship.x, 0, ship.z) : tmpV.copy(camera.position).setY(0);
  const sd = stage.sunDir;
  sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sd, 1200);
  look.sun(camera, skyU.uSkySun.value);
  window.LabPerf.begin(renderer);
  look.render(scene, camera);
  window.LabPerf.end(renderer);   // the Performance window and the bottom bar (ui/shell/labwin.js)
  frames++;
  if (now - fpsT > 500) {
    frames = 0; fpsT = now;
    $('stats').replaceChildren(...[['Terrain grid', stage.terrain.triangles.toLocaleString('en')], ['Camera', `${Math.round(camera.position.y)} m up`]]
      .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
    drawChart();
  }
  requestAnimationFrame(frame);
}

// grunt: generator albo planeta (js/envs/land/planet.js)
$('planet').append(el('option', { value: '', textContent: 'Generator (the settings below)' }), ...PLANETS.map((p) => el('option', { value: p.ref, textContent: 'Planet: ' + p.label })));
$('planet').value = S.map.planet || '';
$('planet').onchange = () => { S.map.planet = $('planet').value || undefined; generateShown(); save(); };
if (S.map.planet && !spaceReady()) { const p = S.map.planet; S.map.planet = undefined; generate(); S.map.planet = p; generateShown(); } else generate();
updateSky(); setCam(ship.on && S.sail ? (S.cam === 'Free flight' ? 'Chase' : S.cam || 'Chase') : 'Overview'); resize();
window.__land = { S, get T() { return T; }, regionAt: (x, z) => regionAt(T, x, z), ship, camera, orbit, free, generate, setCam, sampleHeight: (x, z) => sampleHeight(T, x, z), clearAt, wrapC, sailStep };
requestAnimationFrame(frame);

// Plants Lab: PlantKit species one at a time (Specimen: orbit a single plant, compare it with its impostor, change
// the season and the wind) and ForestKit at landscape scale (Landscape: a RegionKit/LandKit world of one biome or zones,
// forests, copses, oases and scrub placed by biome, height, slope and water, full models near the camera and
// impostors beyond, grass blades around the camera, all moving in the same wind).
import * as THREE from '../../vendor/three.module.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment } from '../env/skykit.js';
import { waveSet, waterUniforms, setWaves, polarGrid, waterMaterial, LOOKS } from '../env/waterkit.js';
import { heightTexture, terrainMeshes, sampleHeight, GLSL_LAND, fbm } from '../env/landkit.js';
import { generateWorld, biomeTexture, biomeAt, BIOMES } from '../env/regionkit.js';
import { SPECIES, SPECIES_IDS, growPlant, plantMaterials, windUniforms } from '../env/plantkit.js';
import { Forest, bakeImpostors, impostorMaterial, grassField, plantLight } from '../env/forestkit.js';
import { LookPipeline, LOOK_PRESETS } from '../render/look.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'steelSalvo.plantsLab.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { mode: 'specimen', species: 'oak', seed: 1, size: 1, detail: 1, compare: true, season: 0, biome: 'temperate', mapSeed: 7, density: 1, grass: 0.8, grassR: 45, lod: 110, impostors: true,
  wind: 0.5, windDir: 225, weather: 'fair', sunEl: 32, sunAz: 200, ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 30000);
const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
const skyU = skyUniforms(), sky = skyDome(skyU, 15000); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0003);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 900 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
scene.add(hemi, sun, sun.target);
const wind = windUniforms(), light = plantLight();

/* ---------------- specimen: one plant on a patch of ground, and its impostor beside it ---------------- */
const spec = new THREE.Group(); scene.add(spec);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 1 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64).rotateX(-Math.PI / 2), groundMat); ground.receiveShadow = true; spec.add(ground);
let plant = null, plantMeshes = [], impMesh = null, imp = null, specInfo = {};
function buildSpecimen() {
  for (const m of plantMeshes) { spec.remove(m); m.geometry.dispose(); }
  plantMeshes = [];
  if (impMesh) { spec.remove(impMesh); impMesh.material.dispose(); impMesh = null; }
  if (imp) { imp.targets.forEach((t) => t.dispose()); imp = null; }
  const t0 = performance.now();
  plant = growPlant(S.species, { seed: S.seed, size: S.size, detail: S.detail });
  const mats = plantMaterials(S.species, wind);
  for (const [g, m, dm] of [[plant.bark, mats.bark, mats.barkDepth], [plant.leaf, mats.leaf, mats.leafDepth]]) {
    if (!g) continue;
    const mesh = new THREE.Mesh(g, m); mesh.customDepthMaterial = dm; mesh.castShadow = mesh.receiveShadow = true; spec.add(mesh); plantMeshes.push(mesh);
  }
  const ms = performance.now() - t0;
  // the impostor of the same plant (seed → variant 0 of a one-variant bake), stood to the right
  if (S.compare) {
    imp = bakeImpostors(renderer, S.species, { variants: 1, seed0: S.seed, cell: 512 });
    const q = new THREE.PlaneGeometry(1, 1), im = new THREE.InstancedMesh(q, impostorMaterial(imp, light), 1);
    q.setAttribute('aImp', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, S.size]), 3));
    im.setMatrixAt(0, new THREE.Matrix4().makeTranslation(Math.max(8, plant.radius * 2.6), 0, 0)); im.frustumCulled = false;
    spec.add(im); impMesh = im;
  }
  let tris = 0; for (const m of plantMeshes) tris += m.geometry.index.count / 3;
  specInfo = { tris, ms, H: plant.height, R: plant.radius };
  const sp = SPECIES[S.species];
  $('spName').textContent = `${sp.name} (${sp.latin})`;
  $('spNote').textContent = sp.note;
  $('spStats').replaceChildren(...[['Height', `${plant.height.toFixed(1)} m`], ['Crown radius', `${plant.radius.toFixed(1)} m`], ['Triangles', Math.round(tris).toLocaleString('en')], ['Grown in', `${ms.toFixed(0)} ms`], ['Biomes', sp.biomes.map((b) => BIOMES[b].label.replace(/ \(.*/, '')).join(', ')]]
    .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  orbit.target.set(plant.radius * (S.compare ? 1.3 : 0), plant.height * 0.45, 0); orbit.dist = Math.max(10, plant.height * (S.compare ? 2.6 : 2.0));
}

/* ---------------- landscape: terrain, water, forest, grass ---------------- */
const land = new THREE.Group(); scene.add(land);
let T = null, tex = null, btex = null, terrain = null, water = null, WU = null, forest = null, grass = null, placed = [];
function world() {
  return generateWorld({ seed: S.mapSeed, res: 384, size: 2400, land: 0.86, shape: 'islands', relief: 220, depth: 25, rough: 0.5, erosion: 0.4, wrap: false, barrier: 'wall' },
    { layout: 'single', body: 'lake', biome: S.biome, biomeBlend: 900, blend: 300 });
}
function buildLand() { $('landStats').textContent = 'Growing the landscape…'; setTimeout(buildLandNow, 30); }
function buildLandNow() {
  const t0 = performance.now();
  T = world();
  if (tex) tex.dispose(); tex = heightTexture(T); if (btex) btex.dispose(); btex = biomeTexture(T);
  if (!terrain) {
    terrain = terrainMeshes(T, tex, { biome: btex, n: 256, nFar: 128 }); land.add(terrain.group);
    WU = Object.assign(waterUniforms(), skyU, terrain.uniforms);
    water = new THREE.Mesh(polarGrid(160, 140, 0.4, 12000), waterMaterial(WU, { sky: '#define SKY_NO_STARS\n' + GLSL_SKY, land: GLSL_LAND }));
    water.frustumCulled = false; water.renderOrder = 1; land.add(water);
    WU.uShipFx.value.set(0, 0, 0, 0); WU.uWetOn.value = 0;
    const lk = LOOKS.lake; WU.uDeep.value.set(lk.deep); WU.uScatter.value.set(lk.scatter); WU.uShine.value = lk.shine; WU.uRipples.value = lk.ripples; WU.uCrest.value = 0.05;
    forest = new Forest(renderer, land, { wind, light });
  } else { terrain.set(T, tex); terrain.setBiome(btex); }
  waves();
  placed = scatter(T);
  forest.nearDist = S.lod; forest.impostors = S.impostors;
  forest.set(placed); forest.update(camera);
  if (grass) { land.remove(grass); grass.geometry.dispose(); grass.material.dispose(); }
  grass = grassField(terrain.uniforms, btex, wind, light, { R: S.grassR, spacing: 0.6 / Math.sqrt(Math.max(0.05, S.grass)), relief: T.relief }); land.add(grass);
  grass.visible = S.grass > 0.01;
  const by = {}; for (const p of placed) by[p.id] = (by[p.id] || 0) + 1;
  $('landStats').replaceChildren(...[['Built in', `${Math.round(performance.now() - t0)} ms`], ['Plants', placed.length.toLocaleString('en')], ...Object.entries(by).map(([k, n]) => [SPECIES[k].name, n.toLocaleString('en')]), ['Grass tufts', grass.userData.tufts.toLocaleString('en')]]
    .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  window.__plantsBuilt = (window.__plantsBuilt || 0) + 1;
}
let wv = [];
function waves() {
  wv = waveSet({ Hs: 0.06 + 0.25 * S.wind, Lp: 4 + 8 * S.wind, chop: 0.4, spread: 50, n: 8 }, S.windDir, 3);
  setWaves(WU, wv);
}
// Where each plant stands: a jittered grid; the biome picks the species mix, the ground decides (water, height, slope)
function scatter(T) {
  const out = [], seed = S.mapSeed * 31 + 5, size = T.size, rel = (h) => h / Math.max(1, T.relief);
  let s = seed >>> 0; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  // distance to water (for oases and lake shores): a coarse grid
  const G = 96, cellG = size / G, wd = new Float32Array(G * G).fill(1e9), q = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) if (sampleHeight(T, (i + 0.5) * cellG, (j + 0.5) * cellG) < 0) { wd[j * G + i] = 0; q.push(j * G + i); }
  for (let qi = 0; qi < q.length; qi++) { const p = q[qi], pi = p % G, pj = (p / G) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = pi + a, z = pj + b; if (x < 0 || z < 0 || x >= G || z >= G) continue; const k = z * G + x; if (wd[k] > wd[p] + cellG) { wd[k] = wd[p] + cellG; q.push(k); } } }
  const water = (x, z) => wd[Math.min(G - 1, Math.max(0, Math.floor(z / cellG))) * G + Math.min(G - 1, Math.max(0, Math.floor(x / cellG)))];
  const step = 7 / Math.sqrt(Math.max(0.05, S.density));
  const pick = (tab) => { let t = r() * tab.reduce((a, b) => a + b[1], 0); for (const [id, w] of tab) { t -= w; if (t <= 0) return id; } return tab[0][0]; };
  for (let z = 80; z < size - 80; z += step) for (let x = 80; x < size - 80; x += step) {
    const px = x + (r() - 0.5) * step * 0.9, pz = z + (r() - 0.5) * step * 0.9, h = sampleHeight(T, px, pz);
    if (h < 0.6) continue;
    const e = 3, sl = Math.hypot(sampleHeight(T, px + e, pz) - h, sampleHeight(T, px, pz + e) - h) / e;
    if (sl > 0.7) continue;
    const b = biomeAt(T, px, pz), u = px / size, v = pz / size, dw = water(px, pz);
    const forestN = fbm(u, v, 6, 4, 0.5, seed) + 0.3 * fbm(u, v, 18, 3, 0.5, seed + 1);
    let id = null;
    const roll = r();
    if (roll < b.temperate) {                                            // northern: spruce and pine forests, birch at the edges, juniper on the heath
      if (rel(h) > 0.55 || sl > 0.55) continue;
      if (forestN > 0.0) id = pick([['spruce', 0.55 - rel(h) * 0.4], ['pine', 0.3 + rel(h) * 0.4 + (sl > 0.3 ? 0.3 : 0)], ['birch', forestN < 0.12 ? 0.35 : 0.1]]);
      else if (r() < 0.12) id = pick([['birch', 0.5], ['juniper', 0.8], ['pine', 0.2]]);
    } else if (roll < b.temperate + b.plains) {                         // plains: copses of oak and birch, lone oaks in the fields, birches by the water
      if (forestN > 0.18) id = pick([['oak', 0.5], ['birch', 0.3], ['pine', 0.2]]);
      else if (dw < 60 && r() < 0.3) id = 'birch';
      else if (r() < 0.02) id = 'oak';
      else if (r() < 0.02) id = 'juniper';
    } else {                                                            // desert: palm oases by the water, acacias here and there, saltbush scrub
      if (dw < 110 && h < 8) { if (r() < 0.3) id = 'palm'; }
      else if (r() < 0.03 && sl < 0.3) id = 'acacia';
      else if (r() < 0.12 && sl < 0.4) id = 'saltbush';
    }
    if (!id) continue;
    out.push({ id, x: px, y: h - 0.05, z: pz, yaw: r() * 6.283, s: 0.75 + r() * 0.45, v: Math.floor(r() * 3) });
  }
  return out;
}

/* ---------------- light and weather ---------------- */
let envRT = null, envDirty = true, envT = 0, fogBase = 0.0003;
function updateSky() {
  const w = WEATHER[S.weather] || WEATHER.fair;
  const L = applySky(skyU, { ...w, sunEl: S.sunEl, sunAz: S.sunAz, moon: 0.8 });
  sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity; hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
  sun.userData.dir = L.sunDir.clone();
  scene.fog.color.copy(L.fog); fogBase = L.fogDensity;
  const env = (0.85 - w.coverage * w.density * 0.45) * (0.1 + 0.9 * L.day);
  scene.environmentIntensity = env;
  // the impostors and the grass light themselves: the same sun, sky and ground, scaled like three's lights (÷ π)
  light.uSunDir.value.copy(L.sunDir); light.uSunCol.value.copy(L.sunColor).multiplyScalar(L.sunIntensity / Math.PI);
  light.uSkyCol.value.copy(L.sky).multiplyScalar(L.ambient / Math.PI + env * 0.9); light.uGroundCol.value.copy(L.ground).multiplyScalar(L.ambient / Math.PI + env * 0.45);
  light.uFogCol.value.copy(L.fog);
  if (WU) {
    WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar; WU.uSun.value.copy(L.sunDir);
    WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen); WU.uLight.value = 0.03 + 0.97 * L.day;
  }
  look.sunVisible = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - L.day)) });
  envDirty = true;
}
function setWind() {
  wind.uWind.value = S.wind; const a = S.windDir * Math.PI / 180; wind.uWindDir.value.set(Math.sin(a), Math.cos(a));
  if (WU) waves();
}

/* ---------------- cameras ---------------- */
const orbit = { target: new THREE.Vector3(0, 8, 0), dist: 40, yaw: 0.7, pitch: 0.12 };
const free = { pos: new THREE.Vector3(1200, 60, 1200), yaw: 0.6, pitch: -0.1, walk: false };
let cam = 'Orbit';
const CAMS = { specimen: ['Orbit', 'Under the crown', 'From above'], landscape: ['Walk', 'Treetops', 'Low flight', 'Overview'] };
function setCam(name) {
  cam = name;
  if (S.mode === 'landscape') {
    const c = T ? T.size / 2 : 1200;
    if (name === 'Walk') { free.walk = true; free.pitch = -0.05; }
    else { free.walk = false; const hgt = { Treetops: 45, 'Low flight': 160, Overview: 900 }[name] || 60; if (name === 'Overview') { free.pos.set(c * 0.5, hgt, c * 0.5); free.yaw = 0.78; free.pitch = -0.45; } else { free.pos.y = Math.max(free.pos.y, sampleHeight(T, free.pos.x, free.pos.z) + hgt); free.pos.y = sampleHeight(T, free.pos.x, free.pos.z) + hgt; free.pitch = -0.15; } }
  } else if (plant) {
    if (name === 'Orbit') Object.assign(orbit, { yaw: 0.7, pitch: 0.12 });
    if (name === 'Under the crown') { Object.assign(orbit, { yaw: 1.2, pitch: 0.55, dist: plant.height * 0.5 }); orbit.target.set(0, plant.height * 0.55, 0); }
    if (name === 'From above') Object.assign(orbit, { yaw: 0.3, pitch: 1.3 });
  }
  [...$('cams').children].forEach((b) => b.classList.toggle('on', b.textContent === name));
}
function camButtons() { $('cams').replaceChildren(...CAMS[S.mode].map((n) => el('button', { type: 'button', textContent: n, onclick: () => setCam(n) }))); }
const keys = new Set();
addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('input,select')) return; keys.add(e.code); if (e.code === 'KeyH') [$('leftPanel'), $('rightPanel')].forEach((p) => p.classList.toggle('hidden-panel')); });
addEventListener('keyup', (e) => keys.delete(e.code));
let drag = null; const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (S.mode === 'landscape') { free.yaw -= dx * 0.004; free.pitch = Math.max(-1.45, Math.min(1.2, free.pitch - dy * 0.004)); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-0.05, Math.min(1.5, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(400, Math.max(2, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });
function placeCamera(dt) {
  if (S.mode === 'specimen') {
    const c = Math.cos(orbit.pitch);
    camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
    camera.position.y = Math.max(0.4, camera.position.y); camera.lookAt(orbit.target);
    return;
  }
  const f = new THREE.Vector3(Math.sin(free.yaw) * Math.cos(free.pitch), Math.sin(free.pitch), Math.cos(free.yaw) * Math.cos(free.pitch));
  const fl = new THREE.Vector3(Math.sin(free.yaw), 0, Math.cos(free.yaw)), rt = new THREE.Vector3(-Math.cos(free.yaw), 0, Math.sin(free.yaw));
  const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6 : 1) * (free.walk ? 3 : 40) * dt, mv = free.walk ? fl : f;
  if (keys.has('KeyW')) free.pos.addScaledVector(mv, sp); if (keys.has('KeyS')) free.pos.addScaledVector(mv, -sp);
  if (keys.has('KeyA')) free.pos.addScaledVector(rt, -sp); if (keys.has('KeyD')) free.pos.addScaledVector(rt, sp);
  if (!free.walk) { if (keys.has('KeyE')) free.pos.y += sp; if (keys.has('KeyQ')) free.pos.y -= sp; }
  const g = Math.max(0, sampleHeight(T, free.pos.x, free.pos.z));
  if (free.walk) free.pos.y = g + 1.7; else free.pos.y = Math.max(free.pos.y, g + 2);
  camera.position.copy(free.pos); camera.lookAt(free.pos.clone().add(f));
}

/* ---------------- UI ---------------- */
for (const id of SPECIES_IDS) $('species').append(el('option', { value: id, textContent: `${SPECIES[id].name} — ${SPECIES[id].latin}` }));
for (const [k, b] of Object.entries(BIOMES)) $('biome').append(el('option', { value: k, textContent: b.label }));
for (const [k, w] of Object.entries(WEATHER)) $('weather').append(el('option', { value: k, textContent: w.label }));
let tm = 0; const later = (fn) => { clearTimeout(tm); tm = setTimeout(() => { fn(); save(); }, 250); };
const RANGES = {
  size: [(v) => `${Math.round(v * 100)} %`, () => later(buildSpecimen)], detail: [(v) => v.toFixed(2), () => later(buildSpecimen)],
  season: [(v) => (v < 0.15 ? 'summer' : v < 0.6 ? 'early autumn' : 'autumn'), (v) => { wind.uSeason.value = v; save(); }],
  density: [(v) => `${Math.round(v * 100)} %`, () => later(buildLand)], grass: [(v) => `${Math.round(v * 100)} %`, () => later(buildLand)], grassR: [(v) => `${v} m`, () => later(buildLand)],
  lod: [(v) => `${v} m`, (v) => { if (forest) { forest.nearDist = v; forest.update(camera); } save(); }],
  wind: [(v) => (v < 0.05 ? 'calm' : v < 0.4 ? 'light breeze' : v < 0.9 ? 'fresh breeze' : 'strong wind'), () => { setWind(); save(); }],
  windDir: [(v) => `from ${Math.round((v + 180) % 360)}°`, () => { setWind(); save(); }],
  sunEl: [(v) => `${v}°`, () => { updateSky(); save(); }], sunAz: [(v) => `${v}°`, () => { updateSky(); save(); }],
};
for (const [k, [fmt, fn]] of Object.entries(RANGES)) {
  const r = $(k), o = $(k + 'V'); r.value = S[k]; o.textContent = fmt(+r.value);
  r.addEventListener('input', () => { S[k] = +r.value; o.textContent = fmt(+r.value); fn(+r.value); });
}
$('species').value = S.species; $('species').onchange = () => { S.species = $('species').value; buildSpecimen(); save(); };
$('seed').value = S.seed; $('seed').onchange = () => { S.seed = Math.max(1, +$('seed').value | 0); buildSpecimen(); save(); };
$('another').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 9999); $('seed').value = S.seed; buildSpecimen(); save(); };
$('compare').checked = S.compare; $('compare').onchange = () => { S.compare = $('compare').checked; buildSpecimen(); save(); };
$('biome').value = S.biome; $('biome').onchange = () => { S.biome = $('biome').value; buildLand(); save(); };
$('mapSeed').value = S.mapSeed; $('mapSeed').onchange = () => { S.mapSeed = Math.max(0, +$('mapSeed').value | 0); buildLand(); save(); };
$('newMap').onclick = () => { S.mapSeed = Math.floor(Math.random() * 1e5); $('mapSeed').value = S.mapSeed; buildLand(); save(); };
$('impostors').checked = S.impostors; $('impostors').onchange = () => { S.impostors = $('impostors').checked; if (forest) { forest.impostors = S.impostors; forest.update(camera); } save(); };
$('weather').value = S.weather; $('weather').onchange = () => { S.weather = $('weather').value; updateSky(); save(); };
function setMode(m) {
  S.mode = m; save();
  [...$('modes').children].forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  $('specPanel').hidden = m !== 'specimen'; $('landPanel').hidden = m !== 'landscape';
  spec.visible = m === 'specimen'; land.visible = m === 'landscape';
  if (m === 'specimen' && !plant) buildSpecimen();
  if (m === 'landscape' && !T) { buildLandNow(); free.pos.set(T.size * 0.45, 0, T.size * 0.45); setCam('Treetops'); }
  sun.shadow.camera.far = 900; camButtons(); setCam(CAMS[m][0] === 'Walk' ? 'Treetops' : CAMS[m][0]);
  scene.fog.density = m === 'specimen' ? 0.0004 : fogBase;
}
$('modes').replaceChildren(...[['specimen', 'Specimen'], ['landscape', 'Landscape']].map(([m, t]) => { const b = el('button', { type: 'button', textContent: t, onclick: () => setMode(m) }); b.dataset.m = m; return b; }));

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), simT = 0, frames = 0, fpsT = last, lodT = 0;
const tmpV = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; simT += dt;
  wind.uTime.value = simT; skyU.uCloudOff.value.x += dt * 0.008;
  placeCamera(dt);
  sky.position.copy(camera.position);
  if (S.mode === 'landscape' && T) {
    terrain.update(camera);
    const fk = fogBase / (1 + Math.max(0, camera.position.y - 40) / 300); scene.fog.density = fk; WU.uFogDen.value = fk; light.uFogDen.value = fk; WU.uTime.value = simT;
    water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
    lodT += dt; if (lodT > 0.25) { forest.update(camera); lodT = 0; }
  } else light.uFogDen.value = scene.fog.density;
  const tgt = S.mode === 'specimen' ? tmpV.set(0, 0, 0) : tmpV.copy(camera.position).setY(Math.max(0, sampleHeight(T, camera.position.x, camera.position.z)));
  const sd = sun.userData.dir || new THREE.Vector3(0, 1, 0);
  sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sd, 400);
  envT += dt; if (envDirty && envT > 0.4) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
  look.sun(camera, skyU.uSkySun.value);
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const rows = [['Draw calls', renderer.info.render.calls], ['Triangles', renderer.info.render.triangles.toLocaleString('en')]];
    if (S.mode === 'landscape' && forest) rows.push(['Full models', forest.counts.near.toLocaleString('en')], ['Impostors', forest.counts.far.toLocaleString('en')]);
    $('stats').replaceChildren(...rows.flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  }
  requestAnimationFrame(frame);
}

updateSky(); setWind(); wind.uSeason.value = S.season; resize();
setMode(S.mode);
window.__plants = { S, get T() { return T; }, get forest() { return forest; }, get grass() { return grass; }, get plant() { return plant; }, get specInfo() { return specInfo; }, setMode, setCam, buildSpecimen, buildLand: buildLandNow, orbit, free, camera, wind };
requestAnimationFrame(frame);

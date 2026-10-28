// Waterside Structures Lab: StructKit structures at real scale on the WaterKit sea under the SkyKit sky — the Super 300
// jack-up (jack the legs down and the hull up, or float it for tow; skid the cantilever; work the cranes), quays in
// three constructions (with ORP Błyskawica moored alongside if wanted) and breakwaters in three types. Each structure's
// own settings come from its PARAMS; its height function is baked into a texture so the sea shows shallows and surf
// along slopes and walls. Info panel with specifications, sources and parts.
import * as THREE from '../../vendor/three/three.module.js';
import { STRUCTURE_IDS, buildStructure, structureInfo, structureParams } from '../models/structures/index.js';
import { heightTexture, landUniforms, setLand, GLSL_LAND } from '../envs/land/landkit.js';
import { transformShip } from '../models/ships-sea/transform.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment } from '../envs/land/skykit.js';
import { waveSet, heightAt, waterUniforms, setWaves, polarGrid, waterMaterial, LOOKS } from '../envs/water/waterkit.js';
import { LookPipeline, LOOK_PRESETS } from '../render/sea/look.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'steelSalvo.structuresLab.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { id: STRUCTURE_IDS[0], depth: 60, air: 18, jspeed: 400, canti: 0, cranes: false, weather: 'fair', time: 'Day', params: {}, moor: true, ...(saved || {}) };
S.params = S.params || {};
S.depths = { super300: 60, quay: 11, breakwater: 11, ...(S.depths || {}) };     // each structure keeps its own water depth
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- renderer, sky, sea, seabed ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 30000);
const look = new LookPipeline(renderer); look.set(LOOK_PRESETS.clean);
const skyU = skyUniforms(), sky = skyDome(skyU, 12000); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0003);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 900 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
scene.add(hemi, sun, sun.target);
// the sea reads the structure's heights (baked per structure) for shallows, surf and calmer water in its lee
const OPEN = { size: 1000, res: 1, wrap: true, depth: 1000, relief: 0, barrier: 'none', h: new Float32Array([-1000]) }, openTex = heightTexture(OPEN);
const WU = Object.assign(waterUniforms(), skyU, landUniforms(OPEN, openTex));
const water = new THREE.Mesh(polarGrid(192, 160, 0.6, 16000), waterMaterial(WU, { sky: '#define SKY_NO_STARS\n' + GLSL_SKY, land: GLSL_LAND }));
water.material.side = THREE.DoubleSide; water.frustumCulled = false; water.renderOrder = 1; scene.add(water);
WU.uShipFx.value.set(0, 0, 0, 0); WU.uWetOn.value = 0; WU.uAlpha.value = 0.9;
const seabed = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a7d62, roughness: 1 }));
seabed.receiveShadow = true; scene.add(seabed);
let waves = [];
function seaFor(wind) {
  const U = Math.max(2, wind), Hs = Math.min(5, 0.0246 * U * U), Lp = Math.min(160, Math.max(12, 0.83 * U * U));
  waves = waveSet({ Hs, Lp, chop: 0.5, spread: 35, n: 12 }, 210, 7); setWaves(WU, waves);
  const lk = LOOKS.atlantic; WU.uDeep.value.set(lk.deep); WU.uScatter.value.set(lk.scatter); WU.uShine.value = lk.shine * 1.8; WU.uRipples.value = lk.ripples; WU.uCrest.value = Math.min(1, lk.crest + U * 0.012);
}

/* ---------------- light ---------------- */
const TIMES = { Day: 32, 'Low sun': 8, Dusk: -3, Night: -16 };
let envRT = null, envDirty = true, envT = 0, fogBase = 0.0003, dayNow = 1;
function updateSky() {
  const w = WEATHER[S.weather] || WEATHER.fair;
  const L = applySky(skyU, { ...w, sunEl: TIMES[S.time] ?? 32, sunAz: 225, moon: 0.7 });
  sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity; sun.userData.dir = L.sunDir.clone();
  hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
  scene.fog.color.copy(L.fog); fogBase = L.fogDensity; WU.uFogCol.value.copy(L.fog);
  WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen);
  WU.uLight.value = 0.03 + 0.97 * L.day; dayNow = L.day;
  scene.environmentIntensity = (0.85 - w.coverage * w.density * 0.45) * (0.1 + 0.9 * L.day);
  look.sunVisible = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.6 * (1 - L.day)) });
  envDirty = true; seaFor(w.wind);
}

/* ---------------- structure ---------------- */
let st = null, buildMs = 0;
const jack = { legs: 1, air: S.air, target: 'up', phase: '' };
function rebuild() {
  if (st) { scene.remove(st.group); st.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
  const t0 = performance.now();
  S.depth = S.depths[S.id] ?? S.depth; $('depth').value = S.depth; $('depthV').textContent = S.depth + ' m';
  const P = structureParams(S.id), own = S.params[S.id] || (S.params[S.id] = Object.fromEntries(P.map((q) => [q.key, q.def])));
  st = buildStructure(S.id, { detail: 1, depth: S.depth, ...own });
  buildMs = Math.round(performance.now() - t0);
  scene.add(st.group);
  st.group.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  const inf = structureInfo(S.id);
  $('sName').textContent = inf.name; $('sSub').textContent = `${inf.type} · ${inf.year}`;
  $('sNote').textContent = inf.note || '';
  $('specs').replaceChildren(...inf.specs.map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: v }))));
  $('sources').replaceChildren(...inf.sources.map(([t, u]) => el('li', {}, el('a', { href: u, textContent: t, target: '_blank', rel: 'noopener' }))));
  $('parts').replaceChildren(...Object.entries(st.parts).map(([k, o]) => {
    const c = el('input', { type: 'checkbox', checked: true }); c.onchange = () => { o.visible = c.checked; };
    return el('label', { className: 'chk' }, c, k);
  }));
  const rig = !!st.pose;
  $('rigPanel').hidden = !rig; $('paramPanel').hidden = !P.length; $('moorRow').hidden = S.id !== 'quay';
  $('depth').max = rig ? Math.floor(st.dim.maxDepth) : 30;
  if (+S.depth > +$('depth').max) { S.depth = +$('depth').max; $('depth').value = S.depth; $('depthV').textContent = S.depth + ' m'; }
  fillParams(P, own);
  bakeShore(); placeShip(); setCams();
  applyPose();
}
function applyPose() {
  if (!st) return;
  seabed.position.y = -S.depth;
  if (!st.pose) return;
  st.pose({ depth: S.depth, air: jack.air, legsDown: jack.legs });
  st.cantilever.position.z = -S.canti;
}
// the structure's heights → a texture the sea reads (outside it: open water at the lab's depth)
let shoreTex = null;
function bakeShore() {
  if (shoreTex) { shoreTex.dispose(); shoreTex = null; }
  if (!st.heightAt) { setLand(WU, OPEN, openTex); WU.uLandOff.value.set(0, 0); return; }
  const b = st.bounds, size = Math.max(b.x1 - b.x0, b.z1 - b.z0) + 80, N = 384, h = new Float32Array(N * N);
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) h[j * N + i] = st.heightAt(cx - size / 2 + (i + 0.5) * size / N, cz - size / 2 + (j + 0.5) * size / N);
  const T = { size, res: N, wrap: false, depth: S.depth, relief: 10, barrier: 'none', h };
  shoreTex = heightTexture(T); setLand(WU, T, shoreTex); WU.uLandOff.value.set(size / 2 - cx, size / 2 - cz);
}
// ORP Błyskawica moored alongside the quay (starboard side to, on fenders), with bow, stern and spring lines
let moored = null, lines = null;
function placeShip() {
  if (lines) { scene.remove(lines); lines.geometry.dispose(); lines = null; }
  const want = S.id === 'quay' && S.moor;
  if (!want) { if (moored) moored.visible = false; return; }
  if (!moored) { moored = transformShip('blyskawica').lod; moored.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(moored); }
  moored.visible = true;
  const x = 1.4 + 11.26 / 2 + 0.1;                                   // fender diameter + half the beam
  moored.position.set(x, 0, 0); moored.rotation.set(0, 0, 0);
  const b = st.anchors.bollards, near = (z) => b.reduce((best, p) => (Math.abs(p[2] - z) < Math.abs(best[2] - z) ? p : best), b[0]);
  const pts = [];
  for (const [sz, bz, sy] of [[50, 72, 5.5], [40, 15, 5.5], [-40, -15, 3.8], [-52, -72, 3.8]]) {   // bow line, forward spring, after spring, stern line
    const q = near(bz); pts.push(x - 4.5, sy, sz, q[0], q[1], q[2]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a2a28 })); scene.add(lines);
}
// the structure's own settings (PARAMS): selects and sliders, rebuilt after a short pause
let paramTimer = 0;
function fillParams(P, own) {
  $('params').replaceChildren(...P.map((q) => {
    let input, out = el('output', {});
    if (q.options) { input = el('select', {}); q.options.forEach(([v, t]) => input.append(el('option', { value: v, textContent: t }))); input.value = own[q.key]; }
    else { input = el('input', { type: 'range', min: q.min, max: q.max, step: q.step }); input.value = own[q.key]; out.textContent = q.fmt(+own[q.key]); }
    input.addEventListener(q.options ? 'change' : 'input', () => {
      own[q.key] = q.options ? input.value : +input.value; if (!q.options) out.textContent = q.fmt(own[q.key]);
      clearTimeout(paramTimer); paramTimer = setTimeout(() => { rebuild(); save(); }, q.options ? 0 : 250);
    });
    return el('div', { className: 'row' }, el('span', { textContent: q.label }), input, out);
  }));
}

/* ---------------- UI ---------------- */
for (const id of STRUCTURE_IDS) $('structure').append(el('option', { value: id, textContent: structureInfo(id).name }));
for (const t of ['Piers and jetties (soon)', 'Harbours (soon)', 'Lighthouses (soon)']) $('structure').append(el('option', { textContent: t, disabled: true }));
$('structure').value = S.id; $('structure').onchange = () => { S.id = $('structure').value; rebuild(); save(); };
for (const [k, w] of Object.entries(WEATHER)) $('weather').append(el('option', { value: k, textContent: w.label }));
$('weather').value = S.weather; $('weather').onchange = () => { S.weather = $('weather').value; updateSky(); save(); };
for (const t of Object.keys(TIMES)) $('times').append(el('button', { type: 'button', textContent: t, onclick: () => { S.time = t; markTimes(); updateSky(); save(); } }));
const markTimes = () => [...$('times').children].forEach((b) => b.classList.toggle('on', b.textContent === S.time));
const bind = (id, fmt, fn) => { const r = $(id), o = $(id + 'V'); r.value = S[id]; o.textContent = fmt(+r.value); r.addEventListener('input', () => { S[id] = +r.value; o.textContent = fmt(S[id]); if (fn) fn(); save(); }); };
let depthTimer = 0;
bind('depth', (v) => v + ' m', () => { S.depths[S.id] = S.depth; applyPose(); if (st && !st.pose) { clearTimeout(depthTimer); depthTimer = setTimeout(rebuild, 250); } });
$('moor').checked = S.moor; $('moor').onchange = () => { S.moor = $('moor').checked; placeShip(); save(); };
bind('air', (v) => v + ' m', () => { if (jack.target === 'up' && !jack.phase) jack.air = S.air; applyPose(); });
bind('jspeed', (v) => '×' + v);
bind('canti', (v) => v.toFixed(1) + ' m', applyPose);
$('cranesWork').checked = S.cranes; $('cranesWork').onchange = () => { S.cranes = $('cranesWork').checked; save(); };
// jacking: going up = legs down to the seabed, then the hull climbs out of the water; going down = the reverse
$('jackup').onclick = () => { jack.target = 'up'; jack.phase = 'legs down'; };
$('afloat').onclick = () => { jack.target = 'float'; jack.phase = 'hull down'; };
const REAL = 90 * 0.3048 / 3600;          // LeTourneau electric rack and pinion: about 90 ft per hour (≈ 0.0076 m/s)
function stepJack(dt) {
  if (!jack.phase || !st) return;
  const rate = REAL * S.jspeed * dt, towAir = -st.dim.draught, travel = Math.max(5, S.depth - towAir);   // metres this frame; leg travel to the seabed
  if (jack.target === 'up') {
    if (jack.phase === 'legs down') { jack.legs = Math.min(1, jack.legs + rate / travel); if (jack.legs >= 1) jack.phase = 'hull up'; }
    else if (jack.phase === 'hull up') { jack.air = Math.min(S.air, jack.air + rate); if (jack.air >= S.air) jack.phase = ''; }
  } else {
    if (jack.phase === 'hull down') { jack.air = Math.max(towAir, jack.air - rate); if (jack.air <= towAir) jack.phase = 'legs up'; }
    else if (jack.phase === 'legs up') { jack.legs = Math.max(0, jack.legs - rate / travel); if (jack.legs <= 0) jack.phase = ''; }
  }
  applyPose();
}

/* ---------------- camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 20, 0), dist: 210, yaw: 2.4, pitch: 0.18, want: null };
// camera presets per structure: [label, target, distance, yaw, pitch] (yaw: 0 looks from +z, π/2 from the sea side +x)
function camsFor() {
  const own = S.params[S.id] || {}, L = own.length || 200, z1 = L / 2, cope = own.cope || 2.6, crest = own.crest || 4.5;
  if (S.id === 'quay') return [['Overview', [-12, 2, 0], Math.max(160, L * 0.8), 1.1, 0.35], ['From the sea', [0, 3, 0], 95, 1.45, 0.05], ['Along the quay', [0, 4, 0], L * 0.62, 2.9, 0.07],
    ['Bollard and fender', [0, cope, -L / 2 + 15], 10, 1.0, 0.25], ['Underwater', [8, -6, 0], 45, 1.3, -0.1], ['High', [-20, 0, 0], Math.max(380, L * 1.4), 1.2, 0.9]];
  if (S.id === 'breakwater') return [['Overview', [0, 0, 0], Math.max(200, L * 1.05), 0.9, 0.35], ['Seaward slope', [10, 1, 0], 45, 1.35, 0.15], ['Head and light', [0, 6, z1], 55, 0.5, 0.18],
    ['On the crest', [-2, crest + 3, -L / 2 + 15], 30, 3.0, 0.08], ['Underwater', [22, -6, 0], 55, 1.4, -0.1], ['High', [0, 0, 0], Math.max(380, L * 1.6), 1.2, 0.9]];
  return [['Overview', [0, 20, 0], 210, 2.4, 0.18], ['Helideck', [-22, 34, 17], 45, -0.9, 0.35], ['Drill floor', [0, 42, -41], 55, 2.9, 0.12],
    ['Leg and jack house', [25.6, 30, -16], 32, 1.9, 0.1], ['From the sea', [0, 12, 0], 150, 3.4, 0.02], ['Underwater', [0, -25, 0], 70, 2.2, -0.15], ['High', [0, 0, 0], 420, 1.0, 0.75]];
}
function setCams() {
  const cams = camsFor();
  $('cams').replaceChildren(...cams.map(([label, t, d, yaw, pitch]) => el('button', { type: 'button', textContent: label, onclick: () => { orbit.want = { target: new THREE.Vector3(...t), dist: d, yaw, pitch }; } })));
  const [, t, d, yaw, pitch] = cams[0]; orbit.want = { target: new THREE.Vector3(...t), dist: d, yaw, pitch };
}
let drag = null; const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); orbit.want = null; });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b) { const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1); orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-1.2, Math.min(1.45, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(3000, Math.max(5, orbit.dist * Math.exp(e.deltaY * 0.0011))); orbit.want = null; }, { passive: false });
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.target.closest('input,select')) [$('leftPanel'), $('rightPanel')].forEach((p) => p.classList.toggle('hidden-panel')); });

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), simT = 0, frames = 0, fpsT = last;
const tmp = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; simT += dt;
  WU.uTime.value = simT; skyU.uCloudOff.value.x += dt * 0.006;
  stepJack(dt);
  // afloat: the hull rides the waves (heave only, the legs ride with it)
  if (st && st.pose && jack.air < 0 && !jack.phase) { st.hull.position.y = jack.air + heightAt(waves, 0, 0, simT) * 0.8; }
  if (st && st.cranes && S.cranes) st.cranes.forEach((c, i) => { c.slew.rotation.y = c.yaw0 + Math.sin(simT * 0.08 + i * 2) * 0.9; c.boom.rotation.x = -0.32 - 0.25 * (0.5 + 0.5 * Math.sin(simT * 0.11 + i)); });
  if (orbit.want) {
    const k = 1 - Math.exp(-dt * 4), w = orbit.want;
    orbit.target.lerp(w.target, k); orbit.dist += (w.dist - orbit.dist) * k;
    orbit.yaw += Math.atan2(Math.sin(w.yaw - orbit.yaw), Math.cos(w.yaw - orbit.yaw)) * k; orbit.pitch += (w.pitch - orbit.pitch) * k;
    if (orbit.target.distanceTo(w.target) < 0.05 && Math.abs(w.dist - orbit.dist) < 0.05) orbit.want = null;
  }
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.position.y = Math.max(camera.position.y, -S.depth + 2);
  camera.lookAt(orbit.target);
  // under the surface: blue-green murk instead of the sky's haze
  const under = camera.position.y < heightAt(waves, camera.position.x, camera.position.z, simT) - 0.2;
  sky.visible = !under;
  if (under) { scene.fog.color.setRGB(0.04 * (0.2 + dayNow), 0.16 * (0.2 + dayNow), 0.2 * (0.2 + dayNow)); scene.fog.density = 0.02; scene.background = scene.fog.color; }
  else { scene.background = null; const fk = fogBase / (1 + Math.max(0, camera.position.y - 40) / 300); scene.fog.density = fk; WU.uFogDen.value = fk; if (envDirty === false) scene.fog.color.copy(WU.uFogCol.value); }
  sky.position.copy(camera.position);
  water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
  const sd = sun.userData.dir || tmp.set(0, 1, 0);
  sun.target.position.set(orbit.target.x, 0, orbit.target.z); sun.position.copy(sun.target.position).addScaledVector(sd, 500);
  envT += dt; if (envDirty && envT > 0.4) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
  look.sun(camera, skyU.uSkySun.value);
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const legTop = st && st.legs ? st.legs[0].group.position.y + st.legs[0].len : 0;
    if (st && st.pose) $('jackStatus').textContent = jack.phase ? `Jacking: ${jack.phase}…` : jack.air < 0 ? `Afloat, draught ${(-jack.air).toFixed(1)} m — legs raised for tow` : `Elevated: air gap ${jack.air.toFixed(1)} m, legs ${Math.max(0, legTop - jack.air - st.dim.D).toFixed(0)} m above the deck`;
    $('stats').replaceChildren(...[['Build', buildMs + ' ms'], ['Draw calls', renderer.info.render.calls], ['Triangles', renderer.info.render.triangles.toLocaleString('en')], ['Camera', `${Math.round(camera.position.y)} m`]]
      .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  }
  requestAnimationFrame(frame);
}

jack.air = S.air; markTimes(); updateSky(); rebuild(); resize();
$('status').textContent = 'built from code at real scale';
window.__structures = { S, jack, camera, orbit, get st() { return st; }, rebuild, applyPose };
requestAnimationFrame(frame);

// Look Lab: ORP Błyskawica on the WaterKit sea under the SkyKit sky, with ShipKit's procedural ageing and the
// LookPipeline camera look. Every effect has a switch or slider, the clean look can be compared on the left, and
// "Measure the cost" switches the effects off one by one while timing the frame.
import * as THREE from '../../vendor/three.module.js';
import { buildShip, SHIPS } from '../shipkit/index.js';
import { bakeWear, ageMaterials, ageUniforms } from '../shipkit/ageing.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment, sunAt } from './skykit.js';
import { rainUniforms, rainMesh } from './rainkit.js';
import { waveSet, heightAt, waterUniforms, setWaves, polarGrid, waterMaterial, hullTexture, LOOKS } from './waterkit.js';
import { LookPipeline, AutoResolution, LOOK_PRESETS, LOOK_DEFAULTS } from '../render/look.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'steelSalvo.lookLab.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = {
  sky: { weather: 'broken', ...pick(WEATHER.broken), sunEl: 12, sunAz: 235, windSea: true, squalls: true, rainLens: true, time: 15.2, moon: 0.8 },
  age: Object.fromEntries(Object.entries(ageUniforms()).map(([k, v]) => [k, v.value])),
  look: { ...LOOK_PRESETS.cinematic }, preset: 'cinematic',
  cam: { fov: 40, shake: 0 }, perf: { scale: 1, autoRes: false, aa: true, shadows: true },
  ...(saved || {}),
};
if (saved && saved.sky) S.sky = { ...pick(WEATHER.broken), squalls: true, rainLens: true, time: 15.2, moon: 0.8, ...saved.sky };
S.look = { ...LOOK_DEFAULTS, ...S.look };     // settings saved before rain and fog existed
function pick(o) { const r = { ...o }; delete r.label; return r; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(S.cam.fov, 1, 0.3, 9000);
const look = new LookPipeline(renderer);
const skyU = skyUniforms();
const sky = skyDome(skyU); scene.add(sky);
scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0005);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8);
const sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 35, bottom: -35, near: 1, far: 420 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
scene.add(hemi, sun, sun.target);

/* ---------------- ship with ageing ---------------- */
const model = buildShip('blyskawica', { detail: 1 });
const shipRoot = new THREE.Group(); shipRoot.add(model.group); scene.add(shipRoot);
const lamps = [], lampOff = new THREE.MeshStandardMaterial({ color: 0xbfc4c0, roughness: 0.12, metalness: 0.6 });
model.group.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial && o.material.color.r > 1) { lamps.push([o, o.material]); o.material = lampOff; } });   // searchlights: off by day, on at night
const bake = bakeWear(model.group);
const AU = ageUniforms(); for (const k of Object.keys(AU)) AU[k].value = S.age[k] ?? AU[k].value;
ageMaterials(model.materials, AU);
$('bake').textContent = `Baked occlusion and edges for ${bake.vertices.toLocaleString('en')} vertices in ${bake.ms} ms (voxel grid ${(bake.voxels / 1e6).toFixed(1)} M cells).`;

/* ---------------- sea ---------------- */
const WU = Object.assign(waterUniforms(), skyU);
const hullTex = hullTexture(SHIPS.blyskawica.lines);
WU.uHull.value = hullTex.tex; WU.uHullZ.value.set(hullTex.z0, hullTex.z1, hullTex.max, 0);
WU.uShip.value.set(4, SHIPS.blyskawica.lines.zBow, SHIPS.blyskawica.lines.zStern, model.beam / 2);
const water = new THREE.Mesh(polarGrid(192, 160), waterMaterial(WU, { sky: '#define SKY_NO_STARS\n' + GLSL_SKY })); water.frustumCulled = false; water.renderOrder = 1; scene.add(water);   // no stars in the sea: broken by the waves they only sparkle as noise
let waves = [];
function seaFromWind() {
  const U = Math.max(1.5, S.sky.wind), Hs = Math.min(6.5, 0.0246 * U * U), Lp = Math.min(200, Math.max(10, 0.83 * U * U));
  const look = S.sky.coverage > 0.93 ? LOOKS.storm : S.sky.coverage > 0.75 ? LOOKS.baltic : LOOKS.atlantic;
  waves = waveSet({ Hs: S.sky.windSea ? Hs : 1.2, Lp: S.sky.windSea ? Lp : 34, chop: Math.min(0.9, 0.35 + U * 0.025), spread: 35, n: 12 }, 210, 7);
  setWaves(WU, waves);
  WU.uDeep.value.set(look.deep); WU.uScatter.value.set(look.scatter); WU.uShine.value = look.shine * 1.8; WU.uRipples.value = look.ripples; WU.uCrest.value = Math.min(1, look.crest + U * 0.015);
  WU.uShipFx.value.set(1, 1, 1, 0);
}

/* ---------------- rain ---------------- */
const RU = rainUniforms(), rain = rainMesh(RU); scene.add(rain);
let rainNow = 0;                                                      // current rain amount (squalls make it come and go)

/* ---------------- weather → light ---------------- */
let envRT = null, envDirty = true, envT = 0;
function updateSky() {
  const L = applySky(skyU, S.sky);
  sun.position.copy(L.sunDir).multiplyScalar(220); sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity;
  hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
  scene.fog.color.copy(L.fog); scene.fog.density = L.fogDensity; WU.uFogDen.value = L.fogDensity;
  RU.uRainCol.value.copy(L.fog).lerp(new THREE.Color(1, 1, 1), 0.25);
  visKm = L.visKm; dayNow = L.day;
  WU.uLight.value = 0.03 + 0.97 * L.day + 0.04 * S.sky.moon * L.night;
  for (const [o, m] of lamps) o.material = L.night > 0.5 ? m : lampOff;
  applyLook();
  WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - S.sky.coverage * S.sky.density * 0.8) * L.sunSeen * L.sunSeen);   // glitter needs the sharp sun: fog and rain take it away faster than the light
  WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar;
  look.sunVisible = Math.max(0, 1 - S.sky.coverage * (0.4 + S.sky.density * 0.6)) * L.sunSeen;
  scene.environmentIntensity = 0.85 - S.sky.coverage * S.sky.density * 0.45;           // less sky light under heavy cloud
  envDirty = true; seaFromWind();
  WU.uShine.value *= 1 - S.sky.rain * 0.6;                                    // rain roughens the surface: a duller, wider glitter
}
let visKm = 10, dayNow = 1;
function rainFrame(t) {
  const r = S.sky.rain;
  rainNow = r <= 0 ? 0 : S.sky.squalls ? r * Math.min(1, 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.11) * 0.7 + Math.sin(t * 0.047 + 1.3) * 0.5 + 0.35)) : r;
  rain.setRain(rainNow); RU.uRain.value = rainNow; WU.uRain.value = rainNow;
  AU.uRainWet.value = r > 0 ? Math.min(1, 0.45 + r * 0.7) : 0; AU.uRainT.value = t;
  RU.uTimeR.value = t; const w = S.sky.wind * 0.55; RU.uWindR.value.set(w * 0.894, w * 0.447);
  const wetLens = S.sky.rainLens && rainNow > 0;
  if (wetLens) look.set({ droplets: Math.max(S.look.droplets, rainNow * 0.5) }); else if (lensWas) look.set({ droplets: S.look.droplets });
  lensWas = wetLens;
}
let lensWas = false;

/* ---------------- UI ---------------- */
const bindRange = (id, obj, key, fmt, after) => {
  const r = $(id), o = $(id + 'V'); r.value = obj[key];
  const f = () => { obj[key] = +r.value; if (o) o.textContent = fmt(+r.value); if (after) after(); save(); };
  r.addEventListener('input', f); if (o) o.textContent = fmt(+r.value);
  return r;
};
for (const [k, w] of Object.entries(WEATHER)) $('weather').append(el('option', { value: k, textContent: w.label }));
$('weather').append(el('option', { value: 'custom', textContent: 'Custom' }));
$('weather').value = S.sky.weather;
$('weather').onchange = () => { const w = WEATHER[$('weather').value]; if (!w) return; Object.assign(S.sky, pick(w), { weather: $('weather').value }); ['coverage', 'density', 'wind', 'haze', 'rain', 'vis'].forEach((k) => { $(k).value = S.sky[k]; $(k + 'V').textContent = fmtSky[k](S.sky[k]); }); updateSky(); save(); };
const fmtSky = { coverage: (v) => Math.round(v * 100) + '%', density: (v) => Math.round(v * 100) + '%', wind: (v) => v + ' m/s', haze: (v) => Math.round(v * 100) + '%',
  rain: (v) => (v ? Math.round(v * 100) + '%' : 'none'), moon: (v) => (v ? Math.round(v * 100) + '%' : 'new moon'), vis: (v) => (v < 1 ? Math.round(v * 1000) + ' m' : v.toFixed(1) + ' km'), sunEl: (v) => v + '°', sunAz: (v) => v + '°' };
for (const k of Object.keys(fmtSky)) bindRange(k, S.sky, k, fmtSky[k], () => { if (['coverage', 'density', 'wind', 'haze', 'rain', 'vis'].includes(k)) { S.sky.weather = 'custom'; $('weather').value = 'custom'; } updateSky(); });
// time of day (local solar time, 55° N in late October — the North Atlantic convoy season) sets the sun's height and bearing
const fmtTime = (v) => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60) % 60).padStart(2, '0')}`;
function setTime(v) {
  S.sky.time = v; Object.assign(S.sky, sunAt(v)); S.sky.sunEl = Math.round(S.sky.sunEl * 10) / 10; S.sky.sunAz = Math.round(S.sky.sunAz);
  $('time').value = v; $('timeV').textContent = fmtTime(v);
  for (const k of ['sunEl', 'sunAz']) { $(k).value = S.sky[k]; $(k + 'V').textContent = fmtSky[k](S.sky[k]); }
  updateSky(); save();
}
$('time').value = S.sky.time; $('timeV').textContent = fmtTime(S.sky.time);
$('time').addEventListener('input', () => setTime(+$('time').value));
for (const [label, v] of [['Dawn', 6.75], ['Morning', 9], ['Noon', 12], ['Afternoon', 15.2], ['Dusk', 17.25], ['Night', 21.5]]) $('times').append(el('button', { type: 'button', textContent: label, onclick: () => setTime(v) }));
for (const k of ['squalls', 'rainLens']) { $(k).checked = !!S.sky[k]; $(k).onchange = () => { S.sky[k] = $(k).checked; applyLook(); save(); }; }
$('windSea').checked = S.sky.windSea; $('windSea').onchange = () => { S.sky.windSea = $('windSea').checked; seaFromWind(); save(); };
for (const k of Object.keys(AU)) if ($(k)) bindRange(k, S.age, k, (v) => v.toFixed(2), () => { AU[k].value = S.age[k]; });

const LOOK_SLIDERS = [['exposure', 'Exposure', 0.3, 2.5, 0.05], ['autoTarget', 'Auto exposure target', 0.08, 0.5, 0.01], ['contrast', 'Contrast', 0.7, 1.5, 0.01], ['saturation', 'Saturation', 0, 1.6, 0.01], ['vibrance', 'Vibrance', -1, 1, 0.01],
  ['temperature', 'Temperature', -0.5, 0.5, 0.01], ['tint', 'Tint', -0.3, 0.3, 0.01], ['bloom', 'Glow', 0, 2, 0.05], ['vignette', 'Vignette', 0, 1, 0.01], ['grain', 'Grain', 0, 1, 0.01],
  ['ca', 'Chromatic aberration', 0, 1, 0.01], ['distortion', 'Lens distortion', 0, 1, 0.01], ['droplets', 'Water on the lens', 0, 1, 0.01], ['dirt', 'Lens dirt', 0, 1, 0.01], ['glare', 'Sun glare', 0, 1.5, 0.01], ['sharpen', 'Sharpen', 0, 1, 0.01]];
for (const [k, label, mn, mx, st] of LOOK_SLIDERS) {
  const r = el('input', { type: 'range', id: 'L_' + k, min: mn, max: mx, step: st }), o = el('output', { id: 'L_' + k + 'V' });
  $('sliders').append(el('div', { className: 'row' }, el('span', { textContent: label }), r, o));
  r.addEventListener('input', () => { S.look[k] = +r.value; o.textContent = (+r.value).toFixed(2); S.preset = 'custom'; markPreset(); applyLook(); save(); });
}
function fillLook() {
  for (const [k] of LOOK_SLIDERS) { $('L_' + k).value = S.look[k]; $('L_' + k + 'V').textContent = (+S.look[k]).toFixed(2); }
  $('tone').value = String(S.look.tone); $('autoExposure').checked = !!S.look.autoExposure;
}
$('tone').onchange = () => { S.look.tone = +$('tone').value; S.preset = 'custom'; markPreset(); applyLook(); save(); };
$('autoExposure').onchange = () => { S.look.autoExposure = $('autoExposure').checked ? 1 : 0; S.preset = 'custom'; markPreset(); applyLook(); save(); };
for (const [k, p] of Object.entries(LOOK_PRESETS)) $('presets').append(el('button', { type: 'button', textContent: p.label, onclick: () => { S.look = pick(p); S.preset = k; fillLook(); markPreset(); applyLook(); save(); } }));
function markPreset() { [...$('presets').children].forEach((b, i) => b.classList.toggle('on', Object.keys(LOOK_PRESETS)[i] === S.preset)); }
// eye adaptation: with manual exposure, dusk and night are brightened as the eye would (auto exposure does it by itself)
function applyLook() {
  const adapt = S.look.autoExposure ? 1 : 1 + 2.6 * (1 - dayNow);
  look.set({ ...S.look, exposure: S.look.exposure * adapt }, 'A'); look.set({ ...LOOK_DEFAULTS, exposure: S.look.exposure * adapt }, 'B');
}
const splitR = $('splitX');
$('splitOn').onchange = () => { $('split').hidden = !$('splitOn').checked; };
splitR.addEventListener('input', () => { $('splitXV').textContent = Math.round(+splitR.value * 100) + '%'; }); $('splitXV').textContent = '50%';

bindRange('fov', S.cam, 'fov', (v) => v + '°', () => { camera.fov = S.cam.fov; camera.updateProjectionMatrix(); });
bindRange('shake', S.cam, 'shake', (v) => v.toFixed(2));
bindRange('scale', S.perf, 'scale', (v) => Math.round(v * 100) + '%', () => look.setScale(S.perf.scale));
$('autoRes').checked = S.perf.autoRes; $('autoRes').onchange = () => { S.perf.autoRes = $('autoRes').checked; save(); };
$('aa').checked = S.perf.aa; $('aa').onchange = () => { S.perf.aa = $('aa').checked; look.setAA(S.perf.aa); save(); };
$('shadows').checked = S.perf.shadows; $('shadows').onchange = () => { S.perf.shadows = $('shadows').checked; sun.castShadow = S.perf.shadows; save(); };
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(S, null, 1)); $('copied').textContent = 'Copied. Paste it into the chat to keep this look.'; } catch { $('copied').textContent = 'Clipboard blocked by the browser.'; } };
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.target.closest('input,select')) [$('leftPanel'), $('rightPanel')].forEach((p) => p.classList.toggle('hidden-panel')); });

/* ---------------- camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 5, 4), dist: 135, yaw: 0.72, pitch: 0.05, want: null };
const CAMS = [['From the escort', [0, 5, 4], 135, 0.72, 0.04, 40], ['Bow wave', [5, 2, 42], 32, 1.15, 0.08, 45], ['Rusty side', [0, 3, -10], 34, 1.45, 0.1, 42],
  ['Deck aft', [0, 6, -40], 22, 2.7, 0.35, 55], ['High', [0, 3, 0], 210, 0.9, 0.5, 38], ['Bodycam', [0, 4, 8], 95, 0.6, 0.02, 78]];
for (const [label, t, d, yaw, pitch, fov] of CAMS) $('cams').append(el('button', { type: 'button', textContent: label, onclick: () => {
  orbit.want = { target: new THREE.Vector3(...t), dist: d, yaw, pitch }; S.cam.fov = fov; $('fov').value = fov; $('fovV').textContent = fov + '°'; camera.fov = fov; camera.updateProjectionMatrix();
  if (label === 'Bodycam') { S.look = pick(LOOK_PRESETS.bodycam); S.preset = 'bodycam'; S.cam.shake = 0.5; $('shake').value = 0.5; $('shakeV').textContent = '0.50'; fillLook(); markPreset(); applyLook(); }
} }));
let drag = null;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); orbit.want = null; });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b) { const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1); orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.45, Math.max(-0.05, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(2500, Math.max(4, orbit.dist * Math.exp(e.deltaY * 0.0011))); orbit.want = null; }, { passive: false });

/* ---------------- measuring ---------------- */
const frameLog = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function measure(ms = 2200) { await sleep(600); frameLog.length = 0; await sleep(ms); return frameLog.reduce((s, x) => s + x, 0) / Math.max(1, frameLog.length); }
$('measure').onclick = async () => {
  const btn = $('measure'); btn.disabled = true;
  const keep = JSON.parse(JSON.stringify(S));
  const restore = () => { Object.assign(S.look, keep.look); for (const k of Object.keys(AU)) AU[k].value = keep.age[k]; Object.assign(S.sky, keep.sky); updateSky(); applyLook(); sun.castShadow = keep.perf.shadows; look.setAA(keep.perf.aa); };
  const tests = [
    ['Ageing', () => { AU.uAge.value = 0; AU.uAO.value = 0; }], ['Clouds', () => { S.sky.coverage = 0; updateSky(); }], ['Rain', () => { S.sky.rain = 0; updateSky(); }],
    ['Glow + lens dirt', () => { look.set({ bloom: 0, dirt: 0 }); }], ['Water on the lens', () => { look.set({ droplets: 0 }); }],
    ['Distortion + aberration', () => { look.set({ distortion: 0, ca: 0 }); }], ['Sun glare', () => { look.set({ glare: 0 }); }], ['Sharpen', () => { look.set({ sharpen: 0 }); }],
    ['Automatic exposure', () => { look.set({ autoExposure: 0 }); }], ['Shadows', () => { sun.castShadow = false; }], ['Anti-aliasing', () => { look.setAA(false); }],
  ];
  $('costs').replaceChildren(el('tr', {}, el('td', { textContent: 'measuring…' }), el('td', {})));
  const base = await measure();
  const rows = [el('tr', {}, el('td', { textContent: 'Everything on' }), el('td', { textContent: `${base.toFixed(1)} ms · ${(1000 / base).toFixed(0)} fps` }))];
  for (const [name, off] of tests) { off(); const t = await measure(); restore(); rows.push(el('tr', {}, el('td', { textContent: name + ' off' }), el('td', { textContent: `${t.toFixed(1)} ms · saves ${(base - t).toFixed(1)} ms` }))); $('costs').replaceChildren(...rows); }
  window.__lookCosts = rows.map((r) => [...r.children].map((c) => c.textContent));
  btn.disabled = false;
};

/* ---------------- loop ---------------- */
const autoRes = new AutoResolution();
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), simT = 0, shift = 0, frames = 0, fpsT = last;
const motion = { h: 0, p: 0, r: 0, vh: 0, vp: 0, vr: 0 };
function frame(now) {
  const dtMs = now - last, dt = Math.min(0.05, dtMs / 1000); last = now; frameLog.push(dtMs); if (frameLog.length > 2000) frameLog.splice(0, 1000);
  simT += dt; shift += 4 * dt;
  rainFrame(simT);
  WU.uTime.value = simT; WU.uShift.value = shift; skyU.uCloudOff.value.x += dt * S.sky.wind * 0.0012; skyU.uCloudOff.value.y += dt * S.sky.wind * 0.0006;
  // ship on the waves (heave, pitch, roll as damped springs)
  const hb = heightAt(waves, 0, 40, simT, shift), hs = heightAt(waves, 0, -40, simT, shift), hp = heightAt(waves, -4.5, 0, simT, shift), hst = heightAt(waves, 4.5, 0, simT, shift);
  const sp = (x, v, tg, T, z) => { const w = 2 * Math.PI / T, a = w * w * (tg - x) - 2 * z * w * v; return [x + (v + a * dt) * dt, v + a * dt]; };
  [motion.h, motion.vh] = sp(motion.h, motion.vh, (hb + hs + hp + hst) / 4 - 0.05, 5.5, 0.55);
  [motion.p, motion.vp] = sp(motion.p, motion.vp, Math.atan((hb - hs) / 80), 4.8, 0.5);
  [motion.r, motion.vr] = sp(motion.r, motion.vr, Math.atan((hst - hp) / 9) * 1.3, 8.5, 0.12);
  shipRoot.position.y = motion.h; shipRoot.rotation.set(-motion.p, 0, motion.r);
  if (orbit.want) {
    const k = 1 - Math.exp(-dt * 4), w = orbit.want;
    orbit.target.lerp(w.target, k); orbit.dist += (w.dist - orbit.dist) * k;
    orbit.yaw += Math.atan2(Math.sin(w.yaw - orbit.yaw), Math.cos(w.yaw - orbit.yaw)) * k; orbit.pitch += (w.pitch - orbit.pitch) * k;
    if (orbit.target.distanceTo(w.target) < 0.05 && Math.abs(w.dist - orbit.dist) < 0.05) orbit.want = null;
  }
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  const minY = heightAt(waves, camera.position.x, camera.position.z, simT, shift) + 1.2; if (camera.position.y < minY) camera.position.y = minY;
  camera.lookAt(orbit.target);
  if (S.cam.shake > 0) {                                     // hand-held: slow sway plus a little jitter, as with a camera held on a rolling deck
    const s = S.cam.shake, t = simT;
    camera.rotateX((Math.sin(t * 0.9) * 0.6 + Math.sin(t * 2.3 + 1.3) * 0.3 + Math.sin(t * 13.0) * 0.04) * 0.012 * s);
    camera.rotateY((Math.sin(t * 0.7 + 0.5) * 0.6 + Math.sin(t * 1.9) * 0.3 + Math.sin(t * 11.0 + 2.0) * 0.04) * 0.012 * s);
    camera.rotateZ(Math.sin(t * 0.5) * 0.02 * s);
  }
  sky.position.copy(camera.position);
  water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
  envT += dt; if (envDirty && envT > 0.4) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
  if (S.perf.autoRes) { const s = autoRes.update(dtMs); if (s !== look.scale) { look.setScale(s); $('scale').value = s; $('scaleV').textContent = Math.round(s * 100) + '%'; } }
  look.split = $('splitOn').checked ? +splitR.value : 0;
  if (look.split) $('split').style.left = (look.split * 100) + '%';
  look.sun(camera, skyU.uSkySun.value);
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const ms = frameLog.slice(-30), avg = ms.reduce((s, x) => s + x, 0) / Math.max(1, ms.length);
    $('stats').replaceChildren(el('span', { textContent: 'Frame' }), el('b', { textContent: avg.toFixed(1) + ' ms' }), el('span', { textContent: 'Draw calls' }), el('b', { textContent: renderer.info.render.calls }),
      el('span', { textContent: 'Render scale' }), el('b', { textContent: Math.round(look.scale * 100) + '%' }), el('span', { textContent: 'Visibility' }), el('b', { textContent: visKm < 1 ? Math.round(visKm * 1000) + ' m' : visKm.toFixed(1) + ' km' }), el('span', { textContent: 'Wave height' }), el('b', { textContent: (S.sky.windSea ? Math.min(6.5, 0.0246 * S.sky.wind ** 2) : 1.2).toFixed(1) + ' m' }));
  }
  requestAnimationFrame(frame);
}

fillLook(); markPreset(); applyLook(); updateSky(); look.setScale(S.perf.scale); look.setAA(S.perf.aa); sun.castShadow = S.perf.shadows; camera.fov = S.cam.fov; resize();
$('status').textContent = 'ORP Błyskawica · procedural ageing · sky, rain and fog · camera look';
window.__look = { S, AU, RU, WU, rain, look, orbit, camera, scene, updateSky, applyLook, fillLook };
requestAnimationFrame(frame);

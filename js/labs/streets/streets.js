// Streets Lab (from Tornado.io): StreetKit's samples (js/models/streets/) on the lab stage's ground under the SkyKit sky
// (js/labs/shared/stage.js) — a straight street, a curve, crossings (4 and 3 arms), an avenue, a country road, a path,
// a cycle path, traffic lights, viaducts, tunnels, an underpass, a subway, footbridges, lamps and signs, bollards and
// railings, parking spaces. The cross-section and the surfaces on sliders (Section window), the furniture in Street
// furniture, the lights' cycle in Traffic lights. Samples: scenes.js; building one: build.js; ground: ground.js.
// For an AI: StreetsApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { createStage } from '../shared/stage.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../render/sea/look.js';
import { WEATHER } from '../../envs/sky/skykit.js';
import { attachWeatherCycle } from '../shared/weather-cycle-ui.js';
import { loadState, pick } from '../shared/saved.js';
import { PROFILES, SURFACES, signalAt, SIGNAL_STATES, SIGNAL_TIMES, LAMPS, BOLLARDS, RAILS, NOISE, PARKING } from '../../models/streets/streetkit.js';
import { SCENES } from './scenes.js';
import { buildSample } from './build.js';
import { createGround } from './ground.js';
import { en } from './en.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const KEY = 'gameLab.streets.v1';
const DEFAULTS = { bollards: false, bollardType: 'steel', rails: false, railType: 'u12a', noise: false, noiseType: 'metal', noiseH: 4, mileposts: false, parking: 'none', parkDisabled: true, lamps: true, lampType: 'modern', lampEvery: 30, signs: true, lampsOn: 'auto', signal: 'cycle', scene: 'straight', profile: 'city', lanes: 2, laneW: 3.25, road: 'asphalt', marks: true, walkW: 2.5, curbH: 0.14, walk: 'slabs', corner: 6, weather: 'fair', sunEl: 32, sunAz: 215 };
// allowed values (saved settings and StreetsApi.set — a value removed from the program does not break the page)
const CHOICES = { scene: Object.keys(SCENES), profile: Object.keys(PROFILES), road: Object.keys(SURFACES), walk: Object.keys(SURFACES), lampType: Object.keys(LAMPS), lampsOn: ['auto', 'on', 'off'],
  parking: ['none', ...Object.keys(PARKING)], bollardType: Object.keys(BOLLARDS), railType: Object.keys(RAILS), noiseType: Object.keys(NOISE), signal: ['cycle', ...Object.keys(SIGNAL_STATES)], weather: Object.keys(WEATHER),
  lanes: (v) => v >= 1 && v <= 6, laneW: (v) => v >= 2 && v <= 5, walkW: (v) => v >= 0 && v <= 10, curbH: (v) => v >= 0 && v <= 0.4, corner: (v) => v >= 0 && v <= 30, noiseH: (v) => v >= 1 && v <= 10, lampEvery: (v) => v >= 5 && v <= 100 };
const S = loadState(KEY, DEFAULTS, CHOICES);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- scene: the lab stage ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 9000);
const look = new LookPipeline(renderer); look.set({ ...LOOK_DEFAULTS }, 'A');
const stage = createStage(renderer, scene, { skyRadius: 6000 });
stage.setSurface('land', 0);
const ground = createGround(scene, stage.ground);
const holder = new THREE.Group(); scene.add(holder);

// the cross-section from the sliders (on the chosen profile): road, kerb, pavement of the set width and surface
function profile() {
  const P = JSON.parse(JSON.stringify(PROFILES[S.profile]));
  P.lanes = S.lanes; P.laneW = S.laneW; P.road = S.road; if (!S.marks) P.marks = null;
  for (const st of P.strips) {
    if (st.k === 'curb' || st.k === 'sidewalk' || st.k === 'cycle' || st.k === 'verge' || st.k === 'edge') st.h = st.k === 'verge' && st.h < 0 ? st.h : Math.max(0, S.curbH) || 0.001;
    if (st.k === 'sidewalk') { st.w = S.walkW; st.s = S.walk; }
  }
  P.strips = P.strips.filter((st) => st.w > 0.01);
  const sc = SCENES[S.scene], pk = parkType();
  if (pk && sc.line && P.lanes > 1 && !P.median) P.strips.unshift({ k: 'parking', w: PARKING[pk].depth, h: 0, s: S.road });
  return P;
}
// the kind of spaces: from Street furniture; the Parking spaces sample without one chosen — perpendicular
const parkType = () => (S.parking !== 'none' ? S.parking : SCENES[S.scene].parking ? 'perpendicular' : null);
let lights = [], lamps = [];
function rebuild() {
  holder.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); holder.clear();
  const t0 = performance.now(), sc = SCENES[S.scene], P = profile();
  const out = buildSample({ S, sc, P, holder, ground, parkType }), r = out.r;
  lights = out.lights; lamps = out.lamps; lampsLit = null;
  let tris = 0, meshes = 0; holder.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
  const ms = performance.now() - t0;
  $('sName').textContent = sc.label; $('sNote').textContent = sc.note;
  $('sStats').replaceChildren(...[['Section', en(PROFILES[S.profile].label)], ['Road', `${P.lanes} × ${P.laneW.toFixed(2)} m = ${(P.lanes * P.laneW).toFixed(2)} m`], ...(r.width ? [['Whole width', `${r.width.toFixed(1)} m`]] : []), ...(r.length ? [['Length', `${r.length.toFixed(0)} m`]] : []), ['Triangles', Math.round(tris).toLocaleString('en')]]
    .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  window.LabPerf.modelRows([['Meshes', meshes], ['Triangles', Math.round(tris).toLocaleString('en')], ['Built in', Math.round(ms) + ' ms']]);
  stage.fitShadow(new THREE.Vector3(0, 0, 0), sc.viaduct ? 110 : sc.tunnel || sc.underpass ? 100 : 60);
  save();
}

/* ---------------- windows ---------------- */
const opt = ([k, v]) => el('option', { value: k, textContent: en(v.label) });
$('scene').replaceChildren(...Object.entries(SCENES).map(([k, v]) => el('option', { value: k, textContent: v.label })));
$('profile').replaceChildren(...Object.entries(PROFILES).map(opt));
$('road').replaceChildren(...Object.entries(SURFACES).filter(([, v]) => !v.slab).map(opt));
// the pavement: the paving slabs as their own group, then other surfaces
{ const og = (label, list) => { const g = document.createElement('optgroup'); g.label = label; g.append(...list.map(opt)); return g; };
  const all = Object.entries(SURFACES); $('walk').replaceChildren(og('Paving slabs', all.filter(([, v]) => v.slab)), og('Other', all.filter(([, v]) => !v.slab))); }
function fromProfile() {
  const P = PROFILES[S.profile], sw = P.strips.find((x) => x.k === 'sidewalk'), curb = P.strips.find((x) => x.k === 'curb' || x.k === 'sidewalk' || x.k === 'edge');
  Object.assign(S, { lanes: P.lanes, laneW: P.laneW, road: P.road, marks: !!P.marks, walkW: sw ? sw.w : 0, walk: sw ? sw.s : 'slabs', curbH: curb ? Math.max(0, curb.h) : 0 });
}
const fmt = { lanes: (v) => String(v), laneW: (v) => `${(+v).toFixed(2)} m`, walkW: (v) => `${(+v).toFixed(1)} m`, curbH: (v) => `${Math.round(v * 100)} cm`, corner: (v) => `${(+v).toFixed(1)} m` };
function show() {
  $('scene').value = S.scene; $('profile').value = S.profile; $('road').value = S.road; $('walk').value = S.walk; $('marks').checked = S.marks;
  for (const [k, f] of Object.entries(fmt)) { $(k).value = S[k]; $(k + 'V').textContent = f(S[k]); }
}
$('scene').onchange = () => { S.scene = $('scene').value; S.profile = SCENES[S.scene].profile; fromProfile(); show(); rebuild(); frame0(); };
$('profile').onchange = () => { S.profile = $('profile').value; fromProfile(); show(); rebuild(); };
$('road').onchange = () => { S.road = $('road').value; rebuild(); };
$('walk').onchange = () => { S.walk = $('walk').value; rebuild(); };
$('marks').onchange = () => { S.marks = $('marks').checked; rebuild(); };
for (const [k, f] of Object.entries(fmt)) { $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = f(S[k]); }; $(k).onchange = () => rebuild(); }
$('lampType').replaceChildren(...Object.entries(LAMPS).map(opt));
$('lampType').value = S.lampType; $('lampType').onchange = () => { S.lampType = $('lampType').value; rebuild(); };
$('lampsOn').value = S.lampsOn; $('lampsOn').onchange = () => { S.lampsOn = $('lampsOn').value; save(); };
for (const k of ['lamps', 'signs']) { $(k).checked = S[k]; $(k).onchange = () => { S[k] = $(k).checked; rebuild(); }; }
$('lampEvery').value = S.lampEvery; $('lampEveryV').textContent = S.lampEvery + ' m';
$('lampEvery').oninput = () => { S.lampEvery = +$('lampEvery').value; $('lampEveryV').textContent = S.lampEvery + ' m'; }; $('lampEvery').onchange = () => rebuild();
$('bollardType').replaceChildren(...Object.entries(BOLLARDS).map(opt));
$('railType').replaceChildren(...Object.entries(RAILS).map(opt));
$('noiseType').replaceChildren(...Object.entries(NOISE).map(opt));
for (const k of ['bollardType', 'railType', 'noiseType']) { $(k).value = S[k]; $(k).onchange = () => { S[k] = $(k).value; rebuild(); }; }
$('parking').replaceChildren(el('option', { value: 'none', textContent: 'None' }), ...Object.entries(PARKING).map(opt));
$('parking').value = S.parking; $('parking').onchange = () => { S.parking = $('parking').value; rebuild(); };
for (const k of ['bollards', 'rails', 'noise', 'mileposts', 'parkDisabled']) { $(k).checked = S[k]; $(k).onchange = () => { S[k] = $(k).checked; rebuild(); }; }
$('noiseH').value = S.noiseH; $('noiseHV').textContent = S.noiseH.toFixed(1) + ' m';
$('noiseH').oninput = () => { S.noiseH = +$('noiseH').value; $('noiseHV').textContent = S.noiseH.toFixed(1) + ' m'; }; $('noiseH').onchange = () => rebuild();
$('signal').replaceChildren(el('option', { value: 'cycle', textContent: 'Cycle (two phases)' }), ...Object.entries(SIGNAL_STATES).map(([k, v]) => el('option', { value: k, textContent: en(v) })));
$('signal').value = S.signal; $('signal').onchange = () => { S.signal = $('signal').value; save(); };

/* ---------------- light: weather and the sun ---------------- */
let wxNow = null;   // the variable weather's numbers (js/labs/shared/weather-cycle-ui.js); null — the weather from the list
function sky() { stage.setLight({ ...(wxNow || {}), weather: S.weather, sunEl: S.sunEl, sunAz: S.sunAz, moon: 0.8 }); }
$('weather').replaceChildren(...Object.entries(WEATHER).map(([k, w]) => el('option', { value: k, textContent: w.label || k })));
$('weather').value = S.weather; $('weather').onchange = () => { wxNow = null; S.weather = $('weather').value; sky(); save(); };
attachWeatherCycle({ select: $('weather'), apply: (p) => { wxNow = p; sky(); }, every: 0.5 });
for (const k of ['sunEl', 'sunAz']) { $(k).value = S[k]; $(k + 'V').textContent = S[k] + '°'; $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = S[k] + '°'; sky(); save(); }; }
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.target.closest('input,select,textarea')) document.querySelectorAll('[data-window]').forEach((p) => p.classList.toggle('hidden-panel')); });

/* ---------------- camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 0, 0), dist: 45, yaw: 0.7, pitch: 0.45 };
const CAMS = { Orbit: { yaw: 0.7, pitch: 0.45, dist: 45 }, Pedestrian: { yaw: 0.25, pitch: 0.03, dist: 9 }, 'From above': { yaw: 0, pitch: 1.45, dist: 70 }, Driver: { yaw: Math.PI / 2, pitch: 0.06, dist: 16 } };
$('cams').replaceChildren(...Object.entries(CAMS).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => Object.assign(orbit, v); return b; }));
function frame0() {
  const sc = SCENES[S.scene], set = (dist, yaw, pitch, t) => { Object.assign(orbit, { dist, yaw, pitch }); orbit.target.set(...t); };
  if (sc.viaduct) return set(120, 0.65, 0.3, [0, 3, 5]);
  if (sc.footbridge) return set(34, 0.75, 0.22, [2, 3, 0]);
  if (sc.subway) return set(30, 0.7, 0.5, [0, -1, 0]);
  if (sc.underpass) return set(75, 0.9, 0.35, [45, -2, 0]);
  if (sc.tunnel) return set(70, 1.05, 0.28, [30, 6, 0]);
  if (sc.parking) return set(30, 0.45, 0.42, [-24, 0.5, 0]);
  if (sc.barriers) return set(34, 0.35, 0.16, [0, 1.5, 0]);
  if (sc.furniture) return set(26, 0.25, 0.12, [-12, 2.5, 3]);
  if (sc.signals) return set(13, -1.25, 0.12, [0, 2.2, 0]);
  orbit.dist = sc.crossing ? 60 : 50; orbit.target.set(0, 0, 0);
}
const cv = renderer.domElement; let drag = null;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(0.01, Math.min(1.52, orbit.pitch + dy * 0.004)); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(300, Math.max(2, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(VS().w, VS().h, false); camera.aspect = VS().w / VS().h; camera.updateProjectionMatrix(); look.resize(VS().w, VS().h); }
addEventListener('resize', resize);
let last = performance.now(), lampsLit = null;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  for (const { tl, phase } of lights) tl.set(S.signal === 'cycle' ? signalAt(t, SIGNAL_TIMES, phase) : S.signal, t);
  const night = S.lampsOn === 'on' || (S.lampsOn === 'auto' && S.sunEl < 4);
  if (night !== lampsLit) { for (const L of lamps) L.on(night); lampsLit = night; }
  if (lights.length) $('sigNow').textContent = lights.map((x) => en(SIGNAL_STATES[x.tl.state])).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + 1.6 + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target.x, orbit.target.y + 1, orbit.target.z);
  stage.update(dt, camera);
  look.sun(camera, stage.sunDir);
  window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);
  requestAnimationFrame(loop);
}

/* ---------------- for an AI ---------------- */
// StreetsApi.scene(id), set({ profile, lanes, laneW, road, marks, walkW, curbH, walk, corner, … }) → settings with the
// rejected fields, camera(name), view([x, y, z], dist, yaw, pitch), signal('cycle' | state) → states; scenes, profiles, surfaces
window.StreetsApi = {
  scenes: Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.label])), profiles: Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, en(v.label)])), surfaces: Object.keys(SURFACES),
  scene(id) { if (!SCENES[id]) return { ...S, rejected: ['scene'] }; $('scene').value = id; $('scene').onchange(); return { ...S }; },
  // only known fields with valid values; the rejected ones — in `rejected`
  set(o = {}) { const { profile: pr, ...rest } = o, bad = []; if (pr !== undefined) { if (CHOICES.profile.includes(pr)) { S.profile = pr; fromProfile(); } else bad.push('profile'); } bad.push(...pick(S, DEFAULTS, rest, CHOICES)); show(); rebuild(); return { ...S, rejected: bad }; },
  camera(name) { if (CAMS[name]) Object.assign(orbit, CAMS[name]); },
  view(target = [0, 0, 0], dist = 20, yaw = 0.5, pitch = 0.2) { orbit.target.set(...target); Object.assign(orbit, { dist, yaw, pitch }); },
  signal(mode) { if (CHOICES.signal.includes(mode)) { S.signal = mode; $('signal').value = mode; } return lights.map((x) => x.tl.state); },
};

sky(); resize(); show(); rebuild(); frame0();
requestAnimationFrame(loop);

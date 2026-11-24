// Laboratorium efektów · ląd: realistyczny ogień FireKit (js/render/effects/fire/firekit.js) pod niebem SkyKit, na
// kawałku ziemi. Sceny: ognisko, płonąca ściana z desek, opony, pożar trawy, papier i kartony, duży pożar — każda
// z rekwizytami z kitów (kora z PlantKit, deski z MatKit, opony i gazety z JunkKit, kamienie z RockKit). Paliwo, moc,
// wysokość, szerokość, wiatr, dym, iskry i jasność na suwakach; pora dnia w oknie Światło (nocą widać światło ognia).
// Dla AI: FireApi.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, skyDome, applySky, skyEnvironment } from '../../envs/sky/skykit.js';
import { LookPipeline, LOOK_PRESETS } from '../../render/sea/look.js';
import { createFire, FUELS } from '../../render/effects/fire/firekit.js';
import { makeMaterial, PRESETS } from '../../render/materials/matkit.js';
import { barkTexture } from '../../models/plants/plantkit.js';
import { rockGeometry, rockMaterial } from '../../models/rocks/rockkit.js';
import * as tireCar from '../../models/junkyard/items/tire-car.js';
import * as newspapers from '../../models/junkyard/items/newspapers.js';
import * as box from '../../models/junkyard/items/box.js';
import { applyTextures } from '../../models/junkyard/textures.js';
import { attachWeatherCycle } from '../shared/weather-cycle-ui.js';

const VS = () => (window.LabView && window.LabView.size ? window.LabView.size() : { w: innerWidth, h: innerHeight, x: 0, y: 0 });
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KEY = 'gameLab.effectsLand.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }

// sceny: paliwo, wysokość płomieni, źródła (położenie i rozmiar obszaru ognia w metrach), rekwizyty
export const SCENES = {
  campfire: { label: 'Campfire', fuel: 'wood', height: 1.5, power: 0.9, note: 'Logs in a ring of stones: a steady wood fire with grey smoke and sparks.', src: [[0, 0.25, 0, 1.0, 1.0]] },
  wall: { label: 'Burning plank wall', fuel: 'wood', height: 3.4, power: 1, note: 'A wall of planks 4 × 3 m burning along its face — the way a barn or a shed burns.', src: [[-1.5, 0.1, 0.25, 1.1, 0.5], [-0.5, 0.1, 0.25, 1.1, 0.5], [0.5, 0.1, 0.25, 1.1, 0.5], [1.5, 0.1, 0.25, 1.1, 0.5]] },
  tyres: { label: 'Tyres', fuel: 'rubber', height: 2.8, power: 1, note: 'A stack of car tyres: sooty orange flames and thick black smoke that rises high.', src: [[0, 0.6, 0, 0.9, 0.9]] },
  grass: { label: 'Grass fire', fuel: 'grass', height: 0.9, power: 0.85, note: 'A burning edge across dry grass: low, fast flames, light smoke, many sparks; scorched ground behind.', src: Array.from({ length: 8 }, (_, i) => [-8.75 + i * 2.5, 0.05, Math.sin(i * 1.7) * 0.6, 2.4, 0.9]) },
  paper: { label: 'Paper and boxes', fuel: 'paper', height: 1.4, power: 0.9, note: 'Bundles of newspapers and cardboard boxes: bright, quick flames, little smoke, floating sparks.', src: [[0, 0.2, 0, 1.0, 0.8]] },
  blaze: { label: 'Big blaze', fuel: 'wood', height: 9, power: 1, note: 'A large wood fire, about the size of a burning barn: tall flames, a column of smoke, strong light.', src: [[-2.5, 0.1, 0, 3, 3], [2.5, 0.1, 0.5, 3, 3], [0, 0.1, -2.5, 3, 3]] },
};
const S = { scene: 'campfire', fuel: 'wood', power: 0.9, height: 1.5, width: 1, wind: 3, windDir: 250, smoke: 1, sparks: 1, glow: 1, weather: 'fair', sunEl: 12, sunAz: 230, lit: true, ...(saved || {}) };
if (!SCENES[S.scene]) S.scene = 'campfire'; if (!FUELS[S.fuel]) S.fuel = 'wood';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* prywatny tryb */ } };

/* ---------------- scena ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc9d7e2, 0.004);
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 6000);
const look = new LookPipeline(renderer); look.set({ ...LOOK_PRESETS.clean, bloom: 0.75 });
const skyU = skyUniforms(), sky = skyDome(skyU, 4000); sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8), sun = new THREE.DirectionalLight(0xfff0d8, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 200 });
scene.add(hemi, sun, sun.target);
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 96).rotateX(-Math.PI / 2),
  makeMaterial({ kind: 'rock', color: '#5d5443', color2: '#3d372c', tile: 4, roughness: 0.95, metalness: 0, cracks: 0.08, grains: 0.9, dirt: 0.4, label: 'Soil' }, { res: 512 }).material);
{ const uv = ground.geometry.attributes.uv, p = ground.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); }
ground.receiveShadow = true; scene.add(ground);
let envRT = null, envDirty = true, wxNow = null, L = null;
function updateSky() {
  const w = wxNow || WEATHER[S.weather] || WEATHER.fair;
  L = applySky(skyU, { ...w, sunEl: S.sunEl, sunAz: S.sunAz, moon: 0.6 });
  sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity; hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
  sun.userData.dir = L.sunDir.clone();
  scene.fog.color.copy(L.fog);
  scene.environmentIntensity = (0.85 - w.coverage * w.density * 0.45) * (0.1 + 0.9 * L.day);
  look.sunVisible = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
  look.set({ exposure: LOOK_PRESETS.clean.exposure * (1 + 2.2 * (1 - L.day)) });
  envDirty = true;
}

/* ---------------- ogień ---------------- */
const fire = createFire(scene, { smokeScale: S.smoke, emberScale: S.sparks, glow: S.glow });
let sources = [];
function light() {
  for (const s of sources) s.remove();
  const sc = SCENES[S.scene];
  sources = S.lit ? sc.src.map(([x, y, z, w, d]) => fire.add({ at: [x, y, z], size: [w * S.width, d * S.width], height: S.height, power: S.power, fuel: S.fuel })) : [];
}
function retune() { for (const s of sources) { const i = sources.indexOf(s), q = SCENES[S.scene].src[i]; s.set({ size: [q[3] * S.width, q[4] * S.width], height: S.height, power: S.power, fuel: S.fuel }); } }

/* ---------------- rekwizyty ---------------- */
const props = new THREE.Group(); scene.add(props);
const mats = {};
const mat = (k, f) => mats[k] || (mats[k] = f());
const charred = (m, k) => { const c = m.clone(); c.color = new THREE.Color(k, k * 0.95, k * 0.9); return c; };
function buildProps() {
  props.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.shared) o.geometry.dispose(); });
  props.clear();
  const add = (m) => { m.castShadow = m.receiveShadow = true; props.add(m); return m; };
  if (S.scene === 'campfire') {
    const bark = mat('bark', () => new THREE.MeshStandardMaterial({ map: barkTexture('oak'), roughness: 0.95 }));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, log = add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 10), charred(bark, 0.55)));
      log.position.set(Math.cos(a) * 0.18, 0.32, Math.sin(a) * 0.18); log.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, g = rockGeometry({ kind: 'granite', shape: 'pebble', size: 0.28, seed: 3 + i, detail: 0.75 });
      const r = add(new THREE.Mesh(g, rockMaterial('granite'))); r.position.set(Math.cos(a) * 0.85, 0.05, Math.sin(a) * 0.85); }
  } else if (S.scene === 'wall') {
    const pl = mat('planks', () => makeMaterial({ ...PRESETS.planks, color: '#6e5136', color2: '#3a2818', planks: 6 }, { res: 512 }).material);
    const g = new THREE.BoxGeometry(4, 3, 0.05); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1.5);
    const w = add(new THREE.Mesh(g, charred(pl, 0.7))); w.position.set(0, 1.5, 0);
  } else if (S.scene === 'tyres') {
    for (let i = 0; i < 3; i++) { const t = tireCar.build(1, 0); t.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.shared = true; } }); t.rotation.x = Math.PI / 2; t.position.set((i % 2) * 0.05, 0.11 + i * 0.21, 0); props.add(t); }
    applyTextures();
  } else if (S.scene === 'paper') {
    const items = [[newspapers, -0.3, 0.2], [newspapers, 0.25, -0.2], [box, 0.1, 0.35], [box, -0.2, -0.35]];
    for (const [mod, x, z] of items) { const g = mod.build(1, 0); g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.shared = true; } }); const bb = new THREE.Box3().setFromObject(g); g.position.set(x, -bb.min.y, z); g.rotation.y = x * 3; props.add(g); }
    applyTextures();
  } else if (S.scene === 'grass') {
    // wypalony pas za frontem ognia
    const burnt = add(new THREE.Mesh(new THREE.PlaneGeometry(22, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1b1714, roughness: 1 })));
    burnt.position.set(0, 0.01, 4.5); burnt.receiveShadow = true; burnt.castShadow = false;
    const dry = add(new THREE.Mesh(new THREE.PlaneGeometry(22, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a7a45, roughness: 1 })));
    dry.position.set(0, 0.008, -7); dry.castShadow = false;
  }
}

/* ---------------- kamera ---------------- */
const orbit = { target: new THREE.Vector3(0, 1, 0), dist: 9, yaw: 0.6, pitch: 0.22 };
function frameCam() { const h = Math.max(S.height, 1), wide = S.scene === 'grass' ? 18 : S.scene === 'blaze' ? 14 : 0; orbit.dist = Math.max(4, h * 3 + wide); orbit.target.set(0, h * 0.5, 0); }
const CAMS = { Orbit: { yaw: 0.6, pitch: 0.22 }, Low: { yaw: 0.4, pitch: 0.05 }, Side: { yaw: Math.PI / 2, pitch: 0.12 }, 'From above': { yaw: 0.3, pitch: 1.2 } };
$('cams').replaceChildren(...Object.entries(CAMS).map(([k, v]) => { const b = el('button', { type: 'button', textContent: k }); b.onclick = () => Object.assign(orbit, v); return b; }));
const cv = renderer.domElement; let drag = null;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
  orbit.yaw -= dx * 0.005; orbit.pitch = Math.max(-0.02, Math.min(1.5, orbit.pitch + dy * 0.004)); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(200, Math.max(1, orbit.dist * Math.exp(e.deltaY * 0.0011))); }, { passive: false });

/* ---------------- panele ---------------- */
$('scene').replaceChildren(...Object.entries(SCENES).map(([k, v]) => el('option', { value: k, textContent: v.label })));
$('fuel').replaceChildren(...Object.entries(FUELS).map(([k, v]) => el('option', { value: k, textContent: v.label })));
const fmt = { power: (v) => `${Math.round(v * 100)} %`, height: (v) => `${(+v).toFixed(1)} m`, width: (v) => `× ${(+v).toFixed(2)}`, wind: (v) => `${(+v).toFixed(1)} m/s`, windDir: (v) => `${v}°`,
  smoke: (v) => `× ${(+v).toFixed(2)}`, sparks: (v) => `× ${(+v).toFixed(2)}`, glow: (v) => `× ${(+v).toFixed(2)}` };
function showAll() {
  $('scene').value = S.scene; $('fuel').value = S.fuel;
  for (const [k, f] of Object.entries(fmt)) { $(k).value = S[k]; $(k + 'V').textContent = f(S[k]); }
  const sc = SCENES[S.scene];
  $('fName').textContent = sc.label; $('fNote').textContent = sc.note;
}
function setScene(k) {
  S.scene = SCENES[k] ? k : 'campfire'; const sc = SCENES[S.scene];
  Object.assign(S, { fuel: sc.fuel, height: sc.height, power: sc.power, width: 1, lit: true });
  showAll(); buildProps(); light(); frameCam(); save();
}
$('scene').onchange = () => setScene($('scene').value);
$('fuel').onchange = () => { S.fuel = $('fuel').value; retune(); save(); };
for (const [k, f] of Object.entries(fmt)) $(k).oninput = () => {
  S[k] = +$(k).value; $(k + 'V').textContent = f(S[k]);
  if (k === 'smoke' || k === 'sparks' || k === 'glow') fire.set({ smokeScale: S.smoke, emberScale: S.sparks, glow: S.glow }); else retune();
  save();
};
$('ignite').onclick = () => { S.lit = true; light(); save(); };
$('douse').onclick = () => { S.lit = false; light(); save(); };
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.target.closest('input,select,textarea')) { e.preventDefault(); $('ignite').onclick(); } });
$('weather').replaceChildren(...Object.entries(WEATHER).map(([k, w]) => el('option', { value: k, textContent: w.label || k })));
$('weather').value = S.weather; $('weather').onchange = () => { wxNow = null; S.weather = $('weather').value; updateSky(); save(); };
attachWeatherCycle({ select: $('weather'), apply: (p) => { wxNow = p; updateSky(); }, every: 0.5 });
for (const k of ['sunEl', 'sunAz']) { $(k).value = S[k]; $(k + 'V').textContent = S[k] + '°'; $(k).oninput = () => { S[k] = +$(k).value; $(k + 'V').textContent = S[k] + '°'; updateSky(); save(); }; }

/* ---------------- pętla ---------------- */
function resize() { const v = VS(); renderer.setSize(v.w, v.h, false); camera.aspect = v.w / v.h; camera.updateProjectionMatrix(); look.resize(v.w, v.h); }
addEventListener('resize', resize);
let last = performance.now(), statT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.position.y = Math.max(0.1, camera.position.y); camera.lookAt(orbit.target);
  const a = S.windDir * Math.PI / 180;   // wiatr „z” kierunku: wieje w przeciwną stronę
  fire.update(dt, camera, { wind: [-Math.sin(a) * S.wind, 0, -Math.cos(a) * S.wind], light: L ? 0.15 + 0.85 * L.day : 1, sky: L ? L.sky : null });
  const d = sun.userData.dir || new THREE.Vector3(0.4, 0.8, 0.3);
  sun.position.copy(orbit.target).addScaledVector(d, 60); sun.target.position.copy(orbit.target);
  if (envDirty) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; }
  look.sun(camera, d);
  window.LabPerf.begin(renderer);
  look.render(scene, camera);
  window.LabPerf.end(renderer);
  if ((statT += dt) > 0.4) { statT = 0; stats(); }
  requestAnimationFrame(frame);
}
function stats() {
  const n = fire.counts();
  $('fStats').replaceChildren(...[['Fuel', FUELS[S.fuel].label], ['Fire sources', n.sources], ['Flames', n.flames], ['Smoke puffs', n.smoke], ['Sparks', n.embers]]
    .flatMap(([k, v]) => [el('span', { textContent: k }), el('b', { textContent: String(v) })]));
}

/* ---------------- dla AI ---------------- */
// FireApi.scene(id), set({ fuel, power, height, width, wind, windDir, smoke, sparks, glow }), light(), douse(), add(source), counts()
window.FireApi = {
  scenes: Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.label])), fuels: Object.fromEntries(Object.entries(FUELS).map(([k, v]) => [k, v.label])),
  scene(id) { setScene(id); return { ...S }; },
  set(o = {}) { for (const k of Object.keys(o)) if (k in S) S[k] = o[k]; showAll(); retune(); fire.set({ smokeScale: S.smoke, emberScale: S.sparks, glow: S.glow }); save(); return { ...S }; },
  light() { $('ignite').onclick(); }, douse() { $('douse').onclick(); },
  add(src) { const s = fire.add(src); sources.push(s); return true; },
  counts: () => fire.counts(), fire,
};

updateSky(); resize(); showAll(); buildProps(); light(); frameCam();
requestAnimationFrame(frame);

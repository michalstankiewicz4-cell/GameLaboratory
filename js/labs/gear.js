// Hero's Gear Lab: the hero's items that give light (GearKit, js/models/gear/gearkit.js) held in first person in a
// dark cave (CaveKit), and the ways of seeing (js/render/vision.js): the bare eye, night vision, binoculars.
// The picture: the scene → the camera look (js/render/sea/look.js) → the vision pass → the screen. Night vision's
// gain is the look's exposure (the light amplified before it reaches the phosphor); its infrared illuminator is a
// light switched on only while looking through the device (the eye does not see infrared).
import * as THREE from '../../vendor/three/three.module.js';
import { buildCave, setRock, ROCKS } from '../models/caves/cavekit.js';
import { ITEMS, makeItem } from '../models/gear/gearkit.js';
import { VisionPass } from '../render/vision.js';
import { FreeCam } from '../labkit/freecam.js';
import { LookPipeline, LOOK_PRESETS } from '../render/sea/look.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
const KEY = 'gameLab.gear.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { item: 'flashlight', mode: 'eye', show: true, drain: false, tune: {}, gain: 18, grain: 0.35, phosphor: 'green', ir: true, zoom: 7, reticle: true,
  seed: 11, rock: 'limestone', ambient: 0.02, ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };
const FOV = 70, EXPOSURE = 1.15;

/* ---------------- renderer, camera, place ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010102);
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 2000); scene.add(camera);
const look = new LookPipeline(renderer); look.set({ ...LOOK_PRESETS.clean, vignette: 0.3, grain: 0.15 });
const vision = new VisionPass(renderer);
const free = new FreeCam(camera, renderer.domElement, { speed: 3 });
const ambient = new THREE.HemisphereLight(0xb8c4d8, 0x2a2420, 0.05); scene.add(ambient);
// infrared illuminator: a wide beam from the device, for night vision only
const ir = new THREE.SpotLight(0xffffff, 60 * Math.PI, 40, 0.75, 0.6, 2); ir.position.set(0, 0.05, 0); ir.target.position.set(0, 0, -5); camera.add(ir, ir.target);

let cave = null;
function buildPlace() {
  if (cave) { scene.remove(cave.group); cave.dispose(); }
  cave = buildCave({ seed: S.seed, rock: S.rock, length: 60, chambers: 3, branches: 2, cell: 0.5 });
  scene.add(cave.group);
  free.place(cave.spawn, 0, 0); free.lookAt(cave.nodes[Math.min(2, cave.nodes.length - 1)]);
}

/* ---------------- the item ---------------- */
let item = null;
function tuneOf(id) { const d = ITEMS[id]; return { power: d.power, angle: d.angle || 30, kelvin: d.kelvin || 4000, charge: 1, ...(S.tune[id] || {}) }; }
function equip(id) {
  if (item) { camera.remove(item.group); item.dispose(); }
  S.item = id; item = makeItem(id, tuneOf(id)); item.drain = S.drain; item.timeScale = 60; camera.add(item.group);
  [...$('items').children].forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  const d = ITEMS[id], t = item.state;
  $('itemNote').textContent = d.note;
  $('angleRow').hidden = d.kind !== 'spot'; $('kelvinRow').hidden = d.color != null;
  for (const k of ['power', 'angle', 'kelvin', 'charge']) { $(k).value = t[k]; $(k + 'V').textContent = FMT[k](t[k]); }
  applyShow(); save();
}
const FMT = { power: (v) => (+v).toFixed(2), angle: (v) => `${Math.round(v)}°`, kelvin: (v) => `${Math.round(v)} K`, charge: (v) => `${Math.round(v * 100)}%` };
for (const k of Object.keys(FMT)) {
  $(k).addEventListener('input', () => {
    const v = +$(k).value; $(k + 'V').textContent = FMT[k](v);
    item.set({ [k]: v }); (S.tune[S.item] = S.tune[S.item] || {})[k] = v; save();
  });
}
function applyShow() { item.group.children[0].visible = S.show && S.mode !== 'binoculars'; }
$('items').replaceChildren(...Object.entries(ITEMS).map(([id, d]) => { const b = el('button', { type: 'button', textContent: d.name }); b.dataset.id = id; b.onclick = () => equip(id); return b; }));
$('show').checked = S.show; $('show').onchange = () => { S.show = $('show').checked; applyShow(); save(); };
$('drain').checked = S.drain; $('drain').onchange = () => { S.drain = $('drain').checked; item.drain = S.drain; save(); };

/* ---------------- vision ---------------- */
function applyMode() {
  [...$('modes').children].forEach((b) => b.classList.toggle('on', b.dataset.m === S.mode));
  const night = S.mode === 'night', bino = S.mode === 'binoculars';
  look.set({ exposure: EXPOSURE * (night ? S.gain : 1), grain: night ? 0 : 0.15, vignette: night || bino ? 0 : 0.3, bloom: night ? 0.2 : 0.5 });
  ir.visible = night && S.ir;
  camera.fov = bino ? FOV / S.zoom : FOV; camera.updateProjectionMatrix();
  free.speed = bino ? 3 / S.zoom : 3;
  applyShow(); save();
}
$('modes').replaceChildren(...[['eye', 'Eye'], ['night', 'Night vision'], ['binoculars', 'Binoculars']].map(([m, t]) => { const b = el('button', { type: 'button', textContent: t }); b.dataset.m = m; b.onclick = () => { S.mode = m; applyMode(); }; return b; }));
const VR = { gain: [(v) => `×${v}`], grain: [(v) => (+v).toFixed(2)], zoom: [(v) => `×${v}`], ambient: [(v) => (+v).toFixed(2)] };
for (const [k, [fmt]] of Object.entries(VR)) {
  const r = $(k), o = $(k + 'V'); r.value = S[k]; o.textContent = fmt(r.value);
  r.addEventListener('input', () => { S[k] = +r.value; o.textContent = fmt(r.value); ambient.intensity = S.ambient * Math.PI; applyMode(); });
}
$('phosphor').value = S.phosphor; $('phosphor').onchange = () => { S.phosphor = $('phosphor').value; save(); };
for (const k of ['ir', 'reticle']) { $(k).checked = S[k]; $(k).onchange = () => { S[k] = $(k).checked; applyMode(); }; }
$('rock').replaceChildren(...Object.entries(ROCKS).map(([id, r]) => el('option', { value: id, textContent: r.name })));
$('rock').value = S.rock; $('rock').onchange = () => { S.rock = $('rock').value; if (cave) setRock(cave, S.rock); save(); };
const rebuild = () => { $('status').textContent = 'generating…'; setTimeout(() => { buildPlace(); $('status').textContent = ''; }, 30); };
$('seed').value = S.seed; $('seed').onchange = () => { S.seed = Math.max(1, +$('seed').value | 0); save(); rebuild(); };
$('another').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99998); $('seed').value = S.seed; save(); rebuild(); };

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); vision.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, fpsT = last;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  free.update(dt); item.update(dt);
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera, vision.input);
  vision.render({ mode: S.mode, grain: S.grain, phosphor: S.phosphor, reticle: S.reticle });
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const t = item.state;
    if (S.drain) { $('charge').value = t.charge; $('chargeV').textContent = FMT.charge(t.charge); }
    $('itemStats').replaceChildren(...[['Light', ITEMS[S.item].kind === 'spot' ? 'a beam' : 'all around'], ['Range', `${ITEMS[S.item].range} m`], ['Lasts', `${Math.round(ITEMS[S.item].drainMin / 60 * 10) / 10} h`]]
      .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
    $('stats').replaceChildren(...[['Draw calls', renderer.info.render.calls], ['Triangles drawn', renderer.info.render.triangles.toLocaleString('en')]]
      .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  }
  requestAnimationFrame(frame);
}
ambient.intensity = S.ambient * Math.PI;
resize();
requestAnimationFrame(() => setTimeout(() => {   // let the loading card paint first: the cave takes a moment
  buildPlace(); equip(S.item); applyMode();
  const ld = $('loading'); ld.style.opacity = '0'; setTimeout(() => ld.remove(), 700);
  window.__gear = { S, get item() { return item; }, get cave() { return cave; }, equip, free, camera, scene };
  requestAnimationFrame(frame);
}, 30));

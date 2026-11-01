// Cave Lab: CaveKit's caves (js/models/caves/cavekit.js) from a seed — the shape (passages, chambers, drip stones,
// rubble, lakes) on the left, the rock (limestone, granite, sandstone, basalt; wet or dry; relief) and the light on the right:
// a flashlight in the hand and a lantern, so you can see how each rock answers a narrow beam and a warm glow.
// Inside: a free camera (js/labkit/freecam.js); Overview: the whole cave from outside, turned on an orbit.
import * as THREE from '../../vendor/three/three.module.js';
import { OrbitControls } from '../../vendor/three/addons/controls/OrbitControls.js';
import { buildCave, setRock, ROCKS, CAVE_DEFAULTS } from '../models/caves/cavekit.js';
import { FreeCam } from '../labkit/freecam.js';
import { LookPipeline, LOOK_PRESETS } from '../render/sea/look.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}) => Object.assign(document.createElement(tag), props);
const KEY = 'gameLab.caves.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const S = { ...CAVE_DEFAULTS, view: 'inside', torch: true, torchPow: 1.4, torchAng: 26, lamp: false, lampPow: 1, ambient: 0.06, exposure: 1.2, ...(saved || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };

/* ---------------- renderer, camera, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020203);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2000); scene.add(camera);
const look = new LookPipeline(renderer); look.set({ ...LOOK_PRESETS.clean, vignette: 0.35, grain: 0.2 });
const free = new FreeCam(camera, renderer.domElement, { speed: 4 });
const orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = true; orbit.enabled = false;

// the flashlight: held a little right of and below the eye, so its shadows show; its beam follows the view
const torch = new THREE.SpotLight(0xfff1dc, 1, 60, 0.4, 0.45, 2); torch.castShadow = true;
torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -0.0005; torch.shadow.camera.near = 0.1;
torch.position.set(0.25, -0.22, 0); camera.add(torch); torch.target.position.set(0, 0, -5); camera.add(torch.target);
// the lantern: warm, all around, hanging a little ahead of the eye
const lamp = new THREE.PointLight(0xffb066, 1, 25, 2); lamp.position.set(-0.3, -0.35, -0.6); camera.add(lamp);
const ambient = new THREE.HemisphereLight(0xb8c4d8, 0x2a2420, 0.1); scene.add(ambient);
const sunOver = new THREE.DirectionalLight(0xffffff, 1.1); sunOver.position.set(60, 120, 40); scene.add(sunOver);   // overview only

let cave = null;
function build() {
  if (cave) { scene.remove(cave.group); cave.dispose(); }
  cave = buildCave(S);
  scene.add(cave.group);
  const st = cave.stats;
  $('caveStats').replaceChildren(...[['Triangles', st.triangles.toLocaleString('en')], ['Drip stones and rocks', st.formations], ['Lakes', st.lakes], ['Grid', `${st.grid} · ${st.cell.toFixed(2)} m`], ['Built in', `${st.ms.toFixed(0)} ms`]]
    .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  applyView(true);
}
const rebuild = (() => { let t = 0; return () => { clearTimeout(t); $('status').textContent = 'generating…'; t = setTimeout(() => { build(); $('status').textContent = ''; }, 250); }; })();

function applyLight() {
  const inside = S.view === 'inside';
  torch.visible = inside && S.torch; torch.intensity = S.torchPow * 40 * Math.PI; torch.angle = S.torchAng * Math.PI / 180;
  lamp.visible = inside && S.lamp; lamp.intensity = S.lampPow * 6 * Math.PI;
  ambient.intensity = (inside ? S.ambient : 0.25) * Math.PI;
  sunOver.visible = !inside;
  look.set({ exposure: S.exposure });
}
function applyView(fresh) {
  const inside = S.view === 'inside';
  [...$('views').children].forEach((b) => b.classList.toggle('on', b.dataset.v === S.view));
  if (cave) for (const m of [cave.wall, cave.extra]) if (m) { m.material.side = inside ? THREE.FrontSide : THREE.DoubleSide; m.material.needsUpdate = true; }
  free.enabled = inside; orbit.enabled = !inside;
  if (inside && cave && (fresh || !free.placed)) {
    free.place(cave.spawn, 0, 0); free.lookAt(cave.nodes[Math.min(2, cave.nodes.length - 1)]); free.placed = true;
  }
  if (!inside && cave) {
    const c = cave.bounds.getCenter(new THREE.Vector3()), r = cave.bounds.getSize(new THREE.Vector3()).length();
    orbit.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(0.6, 0.7, 0.8).multiplyScalar(r * 0.8)); camera.rotation.set(0, 0, 0); orbit.update();
  }
  applyLight();
}
$('views').replaceChildren(...[['inside', 'Inside'], ['overview', 'Overview']].map(([v, t]) => { const b = el('button', { type: 'button', textContent: t }); b.dataset.v = v; b.onclick = () => { S.view = v; save(); applyView(false); }; return b; }));

/* ---------------- the controls ---------------- */
const fix = (d) => (v) => (+v).toFixed(d);
const SHAPE = { length: [(v) => `${v} m`], branches: [fix(0)], width: [(v) => `${v} m`], winding: [fix(2)], chambers: [fix(0)], rough: [fix(2)],
  cell: [(v) => `${(+v).toFixed(2)} m`], drips: [fix(1)], rubble: [fix(1)], lakes: [fix(2)] };
for (const [k, [fmt]] of Object.entries(SHAPE)) {
  const r = $(k), o = $(k + 'V'); r.value = S[k]; o.textContent = fmt(r.value);
  r.addEventListener('input', () => { S[k] = +r.value; o.textContent = fmt(r.value); save(); rebuild(); });
}
const LIGHT = { wet: [fix(2), true], relief: [fix(1), true], torchPow: [fix(2)], torchAng: [(v) => `${v}°`], lampPow: [fix(2)], ambient: [fix(2)], exposure: [fix(2)] };
for (const [k, [fmt, rock]] of Object.entries(LIGHT)) {
  const r = $(k), o = $(k + 'V'); r.value = S[k]; o.textContent = fmt(r.value);
  r.addEventListener('input', () => { S[k] = +r.value; o.textContent = fmt(r.value); save(); if (rock) repaint(); else applyLight(); });
}
const repaint = (() => { let t = 0; return () => { clearTimeout(t); t = setTimeout(() => { if (cave) { setRock(cave, S.rock, S); applyView(false); } }, 120); }; })();
$('rock').replaceChildren(...Object.entries(ROCKS).map(([id, r]) => el('option', { value: id, textContent: r.name })));
$('rock').value = S.rock; $('rockNote').textContent = ROCKS[S.rock].note;
$('rock').onchange = () => { S.rock = $('rock').value; $('rockNote').textContent = ROCKS[S.rock].note; save(); repaint(); };
for (const k of ['torch', 'lamp']) { $(k).checked = S[k]; $(k).onchange = () => { S[k] = $(k).checked; save(); applyLight(); }; }
$('seed').value = S.seed; $('seed').onchange = () => { S.seed = Math.max(1, +$('seed').value | 0); save(); rebuild(); };
$('another').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99998); $('seed').value = S.seed; save(); rebuild(); };

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, fpsT = last;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.view === 'inside') free.update(dt); else orbit.update();
  renderer.info.autoReset = false; renderer.info.reset();
  look.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    $('stats').replaceChildren(...[['Draw calls', renderer.info.render.calls], ['Triangles drawn', renderer.info.render.triangles.toLocaleString('en')]]
      .flatMap(([a, b]) => [el('span', { textContent: a }), el('b', { textContent: String(b) })]));
  }
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(() => setTimeout(() => {   // let the loading card paint first: the cave takes a moment
  build();
  const ld = $('loading'); ld.style.opacity = '0'; setTimeout(() => ld.remove(), 700);
  window.__caves = { S, get cave() { return cave; }, build, free, camera, scene };
  requestAnimationFrame(frame);
}, 30));

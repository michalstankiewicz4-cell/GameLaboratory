// Vehicle lab, water (warship.html): builds a ShipKit warship at real scale and shows it with studio-quality lighting
// (sky dome, image-based reflections, sun with soft shadows, the game's post-process), an optional sea,
// dimension labels, part toggles, turret training/elevation and statistics. Uses only ShipKit's public API.
// The robot vessels (MarineKit: skimmer, barge, diver; moved here from the sea lab) are on the same list: they drive
// (auto or W/A/S/D, the diver dives with Q/E), with lamps, a wake and their work; the camera rides along.
// The amphibian is on the land page (vehicles.html).
import * as THREE from '../../../vendor/three/three.module.js';
import { PostPipeline } from '../../render/sea/post.js';
import { SHIP_IDS, buildShip, shipInfo, shipView } from '../../models/ships-sea/index.js';
import { signalLamp } from '../../models/ships-sea/lights.js';
import { SEAS, LOOKS, waveSet, heightAt as waveHeight, waterUniforms, setWaves, polarGrid, waterMaterial } from '../../envs/water/waterkit.js';
import { heightTexture, landUniforms, GLSL_LAND } from '../../envs/land/landkit.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };

/* ---------------- renderer, scene ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.2, 4000);
const post = new PostPipeline(renderer);

// sky dome (gradient + sun glow) — also the source of the reflection environment
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uH: { value: new THREE.Color(0xcad9e4) }, uZ: { value: new THREE.Color(0x3f6f9e) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSea: { value: new THREE.Color(0x24465e) } },
  vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform vec3 uH,uZ,uSun,uSea;varying vec3 vD;void main(){
    float h=vD.y;vec3 c=h>0.?mix(uH,uZ,pow(h,.5)):mix(uH,uSea,clamp(-h*6.,0.,1.));
    float s=max(dot(vD,uSun),0.);c+=vec3(1.,.92,.75)*(pow(s,900.)*6.+pow(s,10.)*.25);gl_FragColor=vec4(c,1.);}`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat);
scene.add(sky);
scene.fog = new THREE.Fog(0xcad9e4, 600, 1500);
const hemi = new THREE.HemisphereLight(0xcfe0ee, 0x3a4a56, 0.9);
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 40, bottom: -40, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
function updateEnvironment() {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  const rt = pmrem.fromScene(envScene, 0.02);
  if (scene.environment) scene.environment.dispose();
  scene.environment = rt.texture;
}

// sea: glossy water with a scrolling normal map (fine ripples) — slightly translucent near the hull
function rippleTexture() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  const h = new Float32Array(N * N);
  for (let k = 0; k < 40; k++) {
    const fx = (1 + Math.floor(Math.random() * 6)) * (Math.random() < 0.5 ? 1 : -1), fy = 1 + Math.floor(Math.random() * 6), ph = Math.random() * 6.28, a = 1 / (Math.abs(fx) + fy);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += a * Math.sin(((fx * x + fy * y) / N) * 6.2832 + ph);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const i = (y * N + x) * 4;
    img.data[i] = 128 + dx * 160; img.data[i + 1] = 128 + dy * 160; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60);
  return t;
}
const seaNormal = rippleTexture();
const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({
  color: 0x0e3a52, roughness: 0.12, metalness: 0.05, normalMap: seaNormal, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.93,
}));
sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true;
scene.add(sea);
// the water: plain (the glossy sheet above), or the water lab's (WaterKit, its variant A as saved in this browser:
// waves, look, current, oil, lava, ice; open water, no shore). Robot vessels ride its waves.
const OPEN = { size: 1000, res: 1, wrap: true, depth: 1000, relief: 0, barrier: 'none', h: new Float32Array([-1000]) };
const pick = (o) => { const r = { ...o }; delete r.label; return r; };
let labSea = null, waterSrc = 'plain';
function waterLabSettings() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('gameLab.water.v1') || 'null'); } catch { saved = null; }
  return { sea: 'moderate', ...pick(SEAS.moderate), dir: 30, look: 'atlantic', ...pick(LOOKS.atlantic), reflect: 1, clear: false,
    current: 0, oil: 0, lava: 0, iceCover: 0, floe: 18, freeboard: 0.35, ...(saved && saved.A) };
}
function buildLabSea() {
  const p = waterLabSettings(), u = Object.assign(waterUniforms(), landUniforms(OPEN, heightTexture(OPEN)));
  const waves = waveSet({ Hs: p.Hs, Lp: p.Lp, chop: p.chop, spread: p.spread, n: p.n }, p.dir + 180, 7);
  setWaves(u, waves); u.uShipFx.value.set(0, 0, 0, 0);
  u.uDeep.value.set(p.deep); u.uScatter.value.set(p.scatter); u.uShine.value = p.shine; u.uRipples.value = p.ripples; u.uCrest.value = p.crest;
  u.uReflect.value = p.reflect; u.uPlanar.value = 0; u.uAlpha.value = p.clear ? 0.78 : 1; u.uPixelN.value = 1;
  u.uCurrent.value = p.current || 0; u.uOil.value = p.oil || 0; u.uLava.value = p.lava || 0; u.uIce.value.set(p.iceCover || 0, p.floe || 18, p.freeboard ?? 0.35, 1);
  const mesh = new THREE.Mesh(polarGrid(192, 160), waterMaterial(u, { land: GLSL_LAND })); mesh.frustumCulled = false; mesh.renderOrder = 1;
  return { mesh, u, waves };
}
function setWater(src) {
  waterSrc = src;
  if (src === 'lab') {   // read again each time: the water lab may have changed it
    if (labSea) { scene.remove(labSea.mesh); labSea.mesh.geometry.dispose(); labSea.mesh.material.dispose(); }
    labSea = buildLabSea(); scene.add(labSea.mesh); labSky();
  }
  applySea();
}
function applySea() {
  const on = $('sea').checked;
  sea.visible = on && waterSrc === 'plain'; if (labSea) labSea.mesh.visible = on && waterSrc === 'lab';
  dock.visible = blocks.visible = !on;
}
function labSky() {
  if (!labSea) return;
  const u = labSea.u; u.uSun.value.copy(sunDir); u.uSunCol.value.copy(sun.color).multiplyScalar(1.1);
  u.uSkyH.value.copy(skyMat.uniforms.uH.value); u.uSkyZ.value.copy(skyMat.uniforms.uZ.value); u.uSkySea.value.copy(skyMat.uniforms.uSea.value);
  u.uFogCol.value.copy(skyMat.uniforms.uH.value); u.uFogFar.value = 1500;
}
// the water's height where a robot floats (world x, z)
const waterAt = (x, z, t) => (labSea && labSea.mesh.visible ? waveHeight(labSea.waves, x, z, t) : 0);
// dry dock floor (when the sea is off)
const dock = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6f7377, roughness: 0.95 }));
dock.rotation.x = -Math.PI / 2; dock.position.y = -6.5; dock.receiveShadow = true; dock.visible = false;
scene.add(dock);
const blocks = new THREE.Group();
for (let z = -40; z <= 40; z += 8) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 })); b.position.set(0, -4.95, z); b.castShadow = b.receiveShadow = true; blocks.add(b); }
blocks.visible = false; scene.add(blocks);
const grid = new THREE.GridHelper(300, 30, 0xf2b84b, 0x6a7a88); grid.position.y = 0.03; grid.visible = false;
grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);

/* ---------------- orbit camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 4, 0), dist: 125, yaw: 0.85, pitch: 0.22, want: null };
function applyCamera() {
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target);
}
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }; renderer.domElement.setPointerCapture(e.pointerId); orbit.want = null; idle(); });
renderer.domElement.addEventListener('pointerup', () => { drag = null; });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b === 2 || drag.b === 1 || drag.shift) {
    const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k);
  } else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.5, Math.max(-0.6, orbit.pitch + dy * 0.004)); }
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(900, Math.max(3, orbit.dist * Math.exp(e.deltaY * 0.0011))); orbit.want = null; }, { passive: false });
renderer.domElement.addEventListener('dblclick', (e) => {
  const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hit = cur() && r.intersectObject(cur(), true)[0];
  if (hit) orbit.want = { target: hit.point.clone(), dist: Math.max(6, orbit.dist * 0.5) };
});
// camera presets per ship (the ship module's view.cams): [label, target, dist, yaw, pitch]
function setCams() {
  $('cams').replaceChildren(...(shipView(shipId).cams || []).map(([label, t, dist, yaw, pitch]) =>
    el('button', { type: 'button', textContent: label, onclick: () => { orbit.want = { target: new THREE.Vector3(...t), dist, yaw, pitch }; } })));
}

/* ---------------- ship ---------------- */
const MK = window.MarineKit, VK = window.VehicleKit;
const ROBOTS = MK.VESSELS.filter((v) => v.id !== 'amphibian');            // the amphibian drives on the land page
const asked = new URLSearchParams(location.search).get('ship');            // ?ship=orzel (or ?ship=skimmer) opens that one
let model = null, shipId = SHIP_IDS.includes(asked) ? asked : SHIP_IDS[0], buildMs = 0, signal = null;
let robot = null, robotId = ROBOTS.some((v) => v.id === asked) ? asked : null;
const cur = () => (robot ? robot.group : model && model.group);           // what is on show
const partChecks = {};
const optGroup = (label, items) => el('optgroup', { label }, ...items.map(([v, t]) => el('option', { value: v, textContent: t })));
$('ship').append(optGroup('Warships', SHIP_IDS.map((id) => [id, shipInfo(id).name + ' (' + shipInfo(id).year + ')'])),
  optGroup('Robot vessels', ROBOTS.map((v) => ['robot:' + v.id, v.name])));
$('ship').value = robotId ? 'robot:' + robotId : shipId;
$('ship').onchange = () => {
  const v = $('ship').value;
  if (v.startsWith('robot:')) { setRobot(v.slice(6)); return; }
  setRobot(null);
  shipId = v; dive.keel = dive.want = null; rebuild(); fillInfo(); setCams(); buildDimLines(); setSun();
  const c = shipView(shipId).cams; if (c) orbit.want = { target: new THREE.Vector3(...c[0][1]), dist: c[0][2], yaw: c[0][3], pitch: c[0][4] };
};

function fillInfo() {
  const inf = shipInfo(shipId);
  $('shipName').textContent = inf.name; $('shipSub').textContent = `${inf.type} · ${inf.year} · ${inf.builder}`;
  $('specs').replaceChildren(...inf.specs.map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: v }))));
  $('sources').replaceChildren(...inf.sources.map(([t, u]) => el('li', {}, el('a', { href: u, textContent: t, target: '_blank', rel: 'noopener' }))));
  document.title = `Vehicle lab · water — ${inf.name} 1:1 3D model | GameLaboratory`;
}

function rebuild() {
  if (robot) return;
  if (model) { scene.remove(model.group); model.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); }
  const t0 = performance.now();
  model = buildShip(shipId, { detail: +$('detail').value, interior: true });
  buildMs = performance.now() - t0;
  scene.add(model.group);
  SHIP_DIMS[shipId] = { L: model.length, B: model.beam };
  const was = signal && signal.sending ? signal.text : null;
  signal = signalLamp(model); if (was) signal.send(was);
  $('parts').replaceChildren(...Object.keys(model.parts).map((k) => {
    const c = el('input', { type: 'checkbox', checked: partChecks[k] ?? true });
    c.onchange = () => { partChecks[k] = c.checked; model.parts[k].visible = c.checked; };
    model.parts[k].visible = c.checked;
    return el('label', { className: 'chk' }, c, (shipView(shipId).partNames || {})[k] || k);
  }));
  $('signalPanel').hidden = !(model.anchors && model.anchors.signal);
  $('subPanel').hidden = !model.pose;
  if (model.pose) { if (dive.keel === null) setDive(0, true); else model.pose(dive.pose); }
  applyWire(); applyGuns(); stats();
}

/* ---------------- controls ---------------- */
const bindRange = (id, fmt, fn) => { const i = $(id), o = $(id + 'V'); const up = () => { if (o) o.textContent = fmt(+i.value); fn(+i.value); }; i.oninput = up; up(); };
const sunDir = new THREE.Vector3(0, 1, 0);
function setSun() {
  const el_ = +$('sun').value * Math.PI / 180, az = +$('sunAz').value * Math.PI / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el_), Math.sin(el_), Math.cos(az) * Math.cos(el_));
  sunDir.copy(dir); sun.position.copy(dir).multiplyScalar(200); sun.target.position.set(0, 0, 0);
  skyMat.uniforms.uSun.value.copy(dir);
  const low = 1 - Math.min(1, el_ / 0.5);                      // warmer and dimmer near the horizon
  const night = robot && rs.night ? 1 : 0;                      // a robot's NIGHT: the sun and the sky nearly out, its lamps on
  sun.color.setRGB(1, 0.94 - low * 0.25, 0.85 - low * 0.45); sun.intensity = (1.4 + 2.0 * Math.min(1, el_ / 0.45)) * (night ? 0.03 : 1);
  hemi.intensity = night ? 0.06 : 0.9;
  skyMat.uniforms.uH.value.setRGB(0.79 + low * 0.12, 0.85 - low * 0.08, 0.89 - low * 0.25).multiplyScalar(night ? 0.03 : 1);
  skyMat.uniforms.uZ.value.set(0x3f6f9e).multiplyScalar(night ? 0.03 : 1);
  scene.fog.color.copy(skyMat.uniforms.uH.value);
  labSky();
  updateEnvironment();
}
bindRange('sun', (v) => v + '°', setSun);
bindRange('sunAz', (v) => v + '°', setSun);
bindRange('exp', (v) => v.toFixed(2), (v) => post.setParams({ bright: v }));
bindRange('detail', (v) => v.toFixed(2), () => { if (robot) setRobot(robotId); else if (model) rebuild(); });
let train = 0, elev = 0, action = false;
bindRange('train', (v) => v + '°', (v) => { train = v; applyGuns(); });
bindRange('elev', (v) => v + '°', (v) => { elev = v; applyGuns(); });
$('action').onclick = () => { action = !action; $('action').classList.toggle('on', action); };
// signal lamp: the searchlight's shutters key a message in Morse (SOS by default), click again to stop
$('signal').onclick = () => {
  if (!signal) return;
  if (signal.sending) { signal.stop(); $('signal').classList.remove('on'); return; }
  signal.send(($('signalText').value || 'SOS').slice(0, 40)); $('signal').classList.add('on');
  const sc = shipView(shipId).signalCam;                                // from ahead, over the bridge
  if (sc) orbit.want = { target: new THREE.Vector3(...sc.target), dist: sc.dist, yaw: sc.yaw, pitch: sc.pitch };
};
$('stow').onclick = () => { action = false; $('action').classList.remove('on'); $('train').value = 0; $('elev').value = 0; $('train').oninput(); $('elev').oninput(); };
function applyGuns(t = 0) {
  if (!model) return;
  for (const m of model.mounts) {
    const tr = action ? Math.sin(t * 0.35 + m.yaw0) * (m.arc || 60) * 0.5 : train;
    const lim = m.torp ? 60 : m.arc || 150;
    m.train.rotation.y = THREE.MathUtils.degToRad(Math.max(-lim, Math.min(lim, m.torp ? tr * 0.5 : tr)));
    const e = action ? 12 + Math.sin(t * 0.5) * 10 : elev;
    for (const g of m.guns) g.rotation.x = -THREE.MathUtils.degToRad(m.aa ? Math.max(e, 0) * 2.5 : e);
  }
}
// submarine: diving (keel depth) with the matching pose — periscopes, radio mast, 40 mm in or out of its well, bow
// hydroplanes folded or rigged out. The boat sinks at about 0.3 m/s (an emergency dive took about 50 s).
// [label, keel depth below the surface (from the boat's draught and casing height), pose]
const DIVES = [
  ['Surfaced', (s) => s.draught, { periscopes: 0, search: 0, mast: 0, aa: 1, planes: 0, flag: 1 }],
  ['Decks awash', (s) => s.draught + s.deck, { periscopes: 0, search: 0, mast: 0, aa: 0, planes: 1, flag: 0 }],
  ['Periscope depth', () => 12, { periscopes: 1, search: 1, mast: 0, aa: 0, planes: 1, flag: 0 }],
  ['Deep (40 m)', () => 40, { periscopes: 0, search: 0, mast: 0, aa: 0, planes: 1, flag: 0 }],
];
const dive = { keel: null, want: null, pose: {}, target: {} };
function setDive(i, now = false) {
  if (!model || !model.pose) return;
  const [, keel, p] = DIVES[i];
  dive.want = keel(model.sub);
  dive.target = { ...p };
  if (now || dive.keel === null) { dive.keel = dive.want; dive.pose = { ...p }; model.pose(dive.pose); }
  [...$('dives').children].forEach((b, j) => b.classList.toggle('on', j === i));
}
$('dives').replaceChildren(...DIVES.map(([label], i) => el('button', { type: 'button', textContent: label, onclick: () => setDive(i) })));
$('peri').onchange = () => { dive.target.periscopes = dive.target.search = $('peri').checked ? 1 : 0; };
$('aaUp').onchange = () => { dive.target.aa = $('aaUp').checked ? 1 : 0; };
$('planes').onchange = () => { dive.target.planes = $('planes').checked ? 1 : 0; };
function updateDive(dt) {
  if (!model || !model.pose || dive.keel === null) return;
  const dk = dive.want - dive.keel; dive.keel += Math.sign(dk) * Math.min(Math.abs(dk), 0.3 * dt * ($('fastDive').checked ? 8 : 1));
  let moved = Math.abs(dk) > 1e-4;
  for (const [k, v] of Object.entries(dive.target)) {
    const c = dive.pose[k] ?? v, nv = c + Math.sign(v - c) * Math.min(Math.abs(v - c), dt * 0.35 * ($('fastDive').checked ? 6 : 1));
    if (nv !== c) moved = true; dive.pose[k] = nv;
  }
  if (moved) model.pose(dive.pose);
  model.group.position.y = -(dive.keel - model.sub.draught);
  $('peri').checked = (dive.target.periscopes ?? 0) > 0.5; $('aaUp').checked = (dive.target.aa ?? 0) > 0.5; $('planes').checked = (dive.target.planes ?? 0) > 0.5;
  const head = model.sub.periscopeTop - model.sub.raise * (1 - (dive.pose.search ?? 0)) - (dive.keel - model.sub.draught);
  $('diveStatus').textContent = `Keel ${dive.keel.toFixed(1)} m below the surface · ` + (dive.keel - model.sub.draught < 0.05 ? 'surfaced' : head > 0 ? `periscope head ${head.toFixed(1)} m above the sea` : `periscope head ${(-head).toFixed(1)} m under`);
}

$('sea').onchange = applySea;
$('waterSrc').onchange = () => setWater($('waterSrc').value);
$('grid').onchange = () => { grid.visible = $('grid').checked; };
$('spin').onchange = () => {};
function applyWire() { if (cur()) cur().traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { m.wireframe = $('wire').checked; }); }); }
$('wire').onchange = applyWire;

// panels fade after a few idle seconds (not while the pointer rests on them); H hides them
let idleT = 0;
const panels = [...document.querySelectorAll('[data-window]')];   // every window of the page
function idle() { idleT = 0; panels.forEach((p) => p.classList.remove('idle')); }
addEventListener('pointermove', idle);
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if (e.code === 'KeyH') panels.forEach((p) => { p.hidden = !p.hidden; });
  if (e.code === 'KeyF') orbit.want = robot ? { target: orbit.target.clone(), dist: robot.def.length * 2.4 + 6 } : { target: new THREE.Vector3(0, 4, 0), dist: 150 * (model ? model.length / 114 : 1) };
});

/* ---------------- robot vessels (MarineKit) ---------------- */
// the sea lab's drive, moved here: AUTO wanders and turns back toward the middle; W/A/S/D steer; Q/E dive (the diver)
const rs = { auto: true, speed: 0.6, dive: 0, night: false, wake: true, work: false, keys: {} };
const drv = { x: 0, z: 0, yaw: 0, speed: 0 };
const wake = MK.makeWake(); scene.add(wake.points);
const anchor = new THREE.Vector3(), lastAnchor = new THREE.Vector3();
let wander = 0;
function setRobot(id) {
  if (robot) { MK.disposeVessel(robot); robot = null; }
  robotId = id;
  const on = !!id;
  $('robotInfo').hidden = $('robotCtl').hidden = !on;
  $('shipInfo').hidden = $('shipCam').hidden = $('shipCtl').hidden = on;
  if (!on) return;
  if (model) { scene.remove(model.group); model.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); model = null; }
  if (signal && signal.sending) signal.stop();
  signal = null; $('signal').classList.remove('on');
  const t0 = performance.now();
  robot = MK.buildVessel(id, { detail: +$('detail').value });
  buildMs = performance.now() - t0;
  scene.add(robot.group);
  Object.assign(drv, { x: 0, z: 0, yaw: 0, speed: 0 });
  const d = robot.def, st = MK.modelStats(robot.group);
  $('robotName').textContent = d.name; $('robotRole').textContent = d.role;
  $('rWork').textContent = d.work; $('rDive').disabled = !d.maxDepth;
  $('robotRows').replaceChildren(...[['Length × width × height', `${d.length} × ${d.width} × ${d.height} m`], ['Top speed', Math.round(d.maxSpeed * 1.944) + ' knots'],
    ['Turns', `in ${d.turnRadius} m`], ['Cargo', d.cargo + ' t'], ['Dives to', d.maxDepth ? d.maxDepth + ' m' : '—'], ['Triangles', st.triangles.toLocaleString('en')]]
    .map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: v }))));
  document.title = `Vehicle lab · water — ${d.name} | GameLaboratory`;
  orbit.want = null; orbit.target.set(0, 1, 0); orbit.dist = d.length * 2.4 + 6; orbit.yaw = 2.4; orbit.pitch = 0.3;
  robot.body.getWorldPosition(lastAnchor);
  applyWire(); stats(); setSun();
}
function robotNow() {
  const d = robot.def;
  $('robotNow').replaceChildren(...[['Speed', Math.round(Math.abs(drv.speed) * 1.944) + ' knots'], ['Depth', d.maxDepth ? robot.depth.toFixed(1) + ' m' : 'afloat']]
    .map(([k, v]) => el('tr', {}, el('td', { textContent: k }), el('td', { textContent: v }))));
}
function updateRobot(dt, t) {
  const def = robot.def;
  let input;
  if (rs.auto) {
    wander += dt;
    let steer = Math.sin(wander * 0.21) * 0.6 + Math.sin(wander * 0.53) * 0.25;
    if (Math.hypot(drv.x, drv.z) > 140) { const h = Math.atan2(-drv.x, -drv.z), d = Math.atan2(Math.sin(h - drv.yaw), Math.cos(h - drv.yaw)); steer = Math.max(-1, Math.min(1, d * 2)); }
    input = { throttle: rs.speed, steer };
  } else {
    const k = rs.keys;
    input = { throttle: (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), steer: (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0) };
    if (def.maxDepth && (k.KeyQ || k.KeyE)) { rs.dive = Math.max(0, Math.min(45, rs.dive + ((k.KeyQ ? 1 : 0) - (k.KeyE ? 1 : 0)) * 4 * dt)); $('rDive').value = rs.dive; $('rDive').oninput(); }
  }
  VK.drive(drv, input, def, dt);
  robot.group.position.set(drv.x, 0, drv.z); robot.group.rotation.y = drv.yaw;
  const cy = Math.cos(drv.yaw), sy = Math.sin(drv.yaw);
  robot.update(t, dt, {
    speed: drv.speed, steer: input.steer, dive: rs.dive, surface: (x, z) => waterAt(drv.x + x * cy + z * sy, drv.z - x * sy + z * cy, t),
    lights: rs.night ? 1 : (robot.depth > 6 ? 1 : 0), work: rs.work ? 1 : 0, wake: rs.wake && $('sea').checked ? wake : null,
  });
  wake.update(dt, (x, z) => waterAt(x, z, t));
  wake.material.uniforms.uLight.value = rs.night ? 0.15 : 1;
  // the camera rides along (the diver too, down); the sun's shadows follow
  robot.body.getWorldPosition(anchor);
  orbit.target.add(lastAnchor.sub(anchor).negate()); lastAnchor.copy(anchor);
  sun.position.copy(anchor).addScaledVector(sunDir, 200); sun.target.position.copy(anchor);
}
$('dAuto').onclick = () => { rs.auto = true; $('dAuto').classList.add('on'); $('dKeys').classList.remove('on'); };
$('dKeys').onclick = () => { rs.auto = false; $('dKeys').classList.add('on'); $('dAuto').classList.remove('on'); };
bindRange('rSpeed', (v) => Math.round(v * 100) + '%', (v) => { rs.speed = v; });
bindRange('rDive', (v) => v.toFixed(0) + ' m', (v) => { rs.dive = v; });
for (const [id, key, after] of [['rNight', 'night', setSun], ['rWake', 'wake'], ['rWork', 'work']])
  $(id).onclick = () => { rs[key] = !rs[key]; $(id).classList.toggle('on', rs[key]); if (after) after(); };
addEventListener('keydown', (e) => {
  if (!robot || (e.target.closest && e.target.closest('input,select,textarea'))) return;
  rs.keys[e.code] = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(e.code) && rs.auto) $('dKeys').onclick();
});
addEventListener('keyup', (e) => { rs.keys[e.code] = false; });

/* ---------------- dimension labels ---------------- */
const dimEls = [];
function dimLabels() {
  const v = shipView(shipId).dims;
  return model && v ? v.labels : [];
}
const V = new THREE.Vector3();
const dimLines = new THREE.Group(); scene.add(dimLines);
function buildDimLines() {
  dimLines.clear();
  const mat = new THREE.LineBasicMaterial({ color: 0xf2b84b, depthTest: false, transparent: true, opacity: 0.85 });
  const seg = (a, b) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]); const l = new THREE.Line(g, mat); l.renderOrder = 10; dimLines.add(l); };
  const v = shipView(shipId).dims, inf = SHIP_DIMS[shipId];
  if (!v || !inf) return;
  const h = inf.L / 2, y = v.loa, [by, bz] = v.beamAt;
  seg([0, y, -h], [0, y, h]); seg([0, y - 0.5, -h], [0, y + 0.5, -h]); seg([0, y - 0.5, h], [0, y + 0.5, h]);
  seg([-inf.B / 2, by, bz], [inf.B / 2, by, bz]);
}
// overall length and beam per ship (for the dimension lines), from a quick build of each
const SHIP_DIMS = {};
function updateDims() {
  const on = $('dimsChk').checked && model;
  dimLines.visible = !!on;
  const list = on ? dimLabels() : [];
  while (dimEls.length < list.length) { const d = el('div', { className: 'dim' }); $('dims').append(d); dimEls.push(d); }
  dimEls.forEach((d, i) => {
    if (i >= list.length) { d.hidden = true; return; }
    V.set(...list[i][1]); V.y += dimLines.position.y; V.project(camera);
    d.hidden = V.z > 1;
    d.textContent = list[i][0];
    d.style.transform = `translate(${(V.x + 1) / 2 * innerWidth}px,${(1 - V.y) / 2 * innerHeight}px) translate(-50%,-50%)`;
  });
}

/* ---------------- statistics, scale bar ---------------- */
function stats() {
  window.LabPerf.model(cur(), buildMs);   // the Performance window's Model (ui/shell/labwin.js)
}
function scaleBar() {
  // world metres per pixel at the orbit target
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(orbit.target);
  const mpp = h / innerHeight, steps = [1, 2, 5, 10, 20, 50, 100, 200];
  const m = steps.find((s) => s / mpp > 60) || 200;
  $('scaleBar').style.width = `${Math.round(m / mpp)}px`;
  $('scaleTxt').textContent = `${m} m`;
}

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, fpsT = last;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  idleT += dt; if (idleT > 5 && !panels.some((p) => p.matches(':hover'))) panels.forEach((p) => p.classList.add('idle'));
  if ($('spin').checked && !drag) orbit.yaw += dt * 0.12;
  if (orbit.want) {
    const k = 1 - Math.exp(-dt * 4), w = orbit.want;
    orbit.target.lerp(w.target, k); orbit.dist += (w.dist - orbit.dist) * k;
    if (w.yaw !== undefined) { orbit.yaw += Math.atan2(Math.sin(w.yaw - orbit.yaw), Math.cos(w.yaw - orbit.yaw)) * k; orbit.pitch += (w.pitch - orbit.pitch) * k; }
    if (orbit.target.distanceTo(w.target) < 0.05 && Math.abs(w.dist - orbit.dist) < 0.05) orbit.want = null;
  }
  applyCamera();
  sky.position.copy(camera.position);
  seaNormal.offset.x = (now / 1000) * 0.004; seaNormal.offset.y = (now / 1000) * 0.0025;
  if (labSea && labSea.mesh.visible) { labSea.u.uTime.value = now / 1000; labSea.mesh.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2); }
  if (action) applyGuns(now / 1000);
  if (robot) updateRobot(dt, now / 1000);
  if (signal) signal.update(dt, camera, 0.1);
  updateDive(dt);
  dimLines.position.y = model ? model.group.position.y : 0;
  updateDims(); scaleBar();
  window.LabPerf.begin(renderer);
  post.render(scene, camera);
  window.LabPerf.end(renderer);   // the Performance window and the bottom bar
  frames++;
  if (now - fpsT > 500) {
    frames = 0; fpsT = now;
    if (robot) robotNow();
  }
  requestAnimationFrame(frame);
}

fillInfo(); setCams(); rebuild(); SHIP_DIMS[shipId] = { L: model.length, B: model.beam }; buildDimLines(); setSun(); resize();
if (robotId) setRobot(robotId);
if (shipId !== SHIP_IDS[0]) { const c = shipView(shipId).cams; if (c) { orbit.target.set(...c[0][1]); orbit.dist = c[0][2]; orbit.yaw = c[0][3]; orbit.pitch = c[0][4]; } }
window.__lab = { scene, camera, orbit, get model() { return model; }, get robot() { return robot; }, get signal() { return signal; }, rebuild, setDive, dive, setRobot, rs, drv };
requestAnimationFrame(frame);

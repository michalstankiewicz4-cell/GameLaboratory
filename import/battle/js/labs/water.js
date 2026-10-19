// Water lab: ORP Błyskawica (ShipKit, 1:1) on a Gerstner sea from WaterKit. Two variants (A/B) of sea state, look
// and ship-water interaction can be compared side by side; every effect can be switched off and its cost measured.
// The ship stays at the origin heading +z; the sea streams past it at the ship's speed.
import * as THREE from '../../vendor/three.module.js';
import { PostPipeline } from '../render/post.js';
import { buildShip, SHIPS } from '../shipkit/index.js';
import { SEAS, LOOKS, waveSet, heightAt, waterUniforms, setWaves, polarGrid, waterMaterial, addWetHull, hullTexture } from './waterkit.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const KN = 0.5144;

/* ---------------- renderer, sky, light ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 9000);
const post = new PostPipeline(renderer);
const SKY = { h: new THREE.Color(0xc9d7e2), z: new THREE.Color(0x3d6c9a), sea: new THREE.Color(0x1d3a4c) };
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uH: { value: SKY.h }, uZ: { value: SKY.z }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSea: { value: SKY.sea } },
  vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform vec3 uH,uZ,uSun,uSea;varying vec3 vD;void main(){
    float h=vD.y;vec3 c=h>0.?mix(uH,uZ,pow(h,.5)):mix(uH,uSea,clamp(-h*6.,0.,1.));
    float s=max(dot(vD,uSun),0.);c+=vec3(1.,.92,.75)*(pow(s,900.)*6.+pow(s,10.)*.25);gl_FragColor=vec4(c,1.);}`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMat);
scene.add(sky);
scene.fog = new THREE.Fog(SKY.h, 900, 3200);
const hemi = new THREE.HemisphereLight(0xcfe0ee, 0x2a3e4c, 0.85);
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 40, bottom: -40, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
function updateEnvironment() {
  const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  const rt = pmrem.fromScene(s, 0.02);
  if (scene.environment) scene.environment.dispose();
  scene.environment = rt.texture;
}

/* ---------------- ship ---------------- */
const S = SHIPS.blyskawica;
const shipRoot = new THREE.Group(); scene.add(shipRoot);
const model = buildShip('blyskawica', { detail: 1 });
shipRoot.add(model.group);
// searchlights are off by day (the lab's HDR lens would bloom over the sea)
model.group.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial && o.material.color.r > 1) o.material = new THREE.MeshStandardMaterial({ color: 0xbfc4c0, roughness: 0.1, metalness: 0.6 }); });
let hullMesh = null; model.group.traverse((o) => { if (o.isMesh && o.name === 'hull') hullMesh = o; });
const hullTex = hullTexture(S.lines);
const yBridge = S.lines.deck(20) + 8.6;

/* ---------------- variants ---------------- */
const DEFAULTS = {
  A: { sea: 'moderate', ...pick(SEAS.moderate), dir: 30, look: 'atlantic', ...pick(LOOKS.atlantic), reflect: 1, planar: false, clear: false, kn: 18, motion: true, bowWave: true, wake: true, hullFoam: true, wet: true, spray: true },
  B: { sea: 'rough', ...pick(SEAS.rough), dir: 30, look: 'baltic', ...pick(LOOKS.baltic), reflect: 1, planar: true, clear: false, kn: 18, motion: true, bowWave: true, wake: true, hullFoam: true, wet: true, spray: true },
};
function pick(o) { const r = { ...o }; delete r.label; return r; }
const KEY = 'steelSalvo.waterLab.v1';
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
const V = { A: { ...DEFAULTS.A, ...(saved && saved.A) }, B: { ...DEFAULTS.B, ...(saved && saved.B) } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(V)); } catch { /* private mode */ } };

const geo = { current: null };
function makeVariant(id) {
  const u = waterUniforms();
  u.uHull.value = hullTex.tex; u.uHullZ.value.set(hullTex.z0, hullTex.z1, hullTex.max, 0);
  u.uShip.value.set(0, S.lines.zBow, S.lines.zStern, model.beam / 2);
  const mesh = new THREE.Mesh(geo.current, waterMaterial(u)); mesh.frustumCulled = false; mesh.renderOrder = 1;
  scene.add(mesh);
  const spray = makeSpray(); scene.add(spray.points);
  return { id, u, mesh, waves: [], spray, m: { heave: 0, pitch: 0, roll: 0, vh: 0, vp: 0, vr: 0 }, shift: 0 };
}
function setGrid(spec) {
  const [s, r] = spec.split(',').map(Number);
  const g = polarGrid(s, r);
  if (geo.current) geo.current.dispose();
  geo.current = g;
  for (const v of Object.values(vars)) v.mesh.geometry = g;
}
const vars = {};
setGrid($('grid').value);
vars.A = makeVariant('A'); vars.B = makeVariant('B');
// the hull's wet band reads its own uniform block; it is filled from the variant being drawn
const hullU = waterUniforms(); hullU.uHull.value = hullTex.tex; hullU.uHullZ.value.copy(vars.A.u.uHullZ.value);
addWetHull(hullMesh.material, hullU);
function hullFrom(v) {
  const a = v.u, b = hullU;
  b.uWN.value = a.uWN.value; a.uWA.value.forEach((x, i) => b.uWA.value[i].copy(x)); a.uWB.value.forEach((x, i) => b.uWB.value[i].copy(x));
  b.uTime.value = a.uTime.value; b.uShift.value = a.uShift.value; b.uShip.value.copy(a.uShip.value); b.uShipFx.value.copy(a.uShipFx.value);
  b.uWetOn.value = V[v.id].wet ? 1 : 0;
}

function applyVariant(id) {
  const p = V[id], v = vars[id], u = v.u;
  v.waves = waveSet({ Hs: p.Hs, Lp: p.Lp, chop: p.chop, spread: p.spread, n: p.n }, p.dir + 180, id === 'A' ? 7 : 7);
  setWaves(u, v.waves);
  u.uDeep.value.set(p.deep); u.uScatter.value.set(p.scatter);
  u.uShine.value = p.shine; u.uRipples.value = p.ripples; u.uCrest.value = p.crest; u.uReflect.value = p.reflect;
  u.uPlanar.value = p.planar ? 1 : 0; u.uAlpha.value = p.clear ? 0.78 : 1;
  u.uShipFx.value.set(p.bowWave ? 1 : 0, p.wake ? 1 : 0, p.hullFoam ? 1 : 0, 0);
  u.uPixelN.value = $('pixN').checked ? 1 : 0;
}

/* ---------------- spray ---------------- */
function makeSpray(N = 1400) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), life = new Float32Array(N), size = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aLife', new THREE.BufferAttribute(life, 1)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 600 }, uLight: { value: 1 } },
    vertexShader: 'attribute float aLife,aSize;uniform float uScale;varying float vL;void main(){vL=aLife;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aLife>0.?aSize*uScale/-mv.z:0.;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform float uLight;varying float vL;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c)*4.;if(d>1.)discard;float a=(1.-d)*(1.-d)*smoothstep(0.,.35,vL)*min(vL*1.6,1.)*.32;gl_FragColor=vec4(vec3(.93,.96,.98)*uLight,a);}',
  });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.renderOrder = 3;
  return { points, pos, life, size, vel: new Float32Array(N * 3), N, next: 0, acc: 0 };
}
function emitSpray(sp, x, y, z, vx, vy, vz, s, l) {
  const i = sp.next; sp.next = (sp.next + 1) % sp.N;
  sp.pos.set([x, y, z], i * 3); sp.vel.set([vx, vy, vz], i * 3); sp.life[i] = l; sp.size[i] = s;
}
function stepSpray(v, dt, t) {
  const p = V[v.id], sp = v.spray, vs = p.kn * KN, vk = vs / 20;
  sp.points.visible = p.spray;
  if (p.spray && vs > 1) {
    // continuous sheet from the stem, bursts when the bow slams into a crest
    const slam = Math.min(3, Math.max(0, -(v.bowRel || 0) - 1.2));
    sp.acc += dt * (110 * vk * vk + slam * 420);
    while (sp.acc > 1) {
      sp.acc -= 1;
      const side = Math.random() < 0.5 ? -1 : 1, z = S.lines.zBow - 2 - Math.random() * 10, hw = Math.max(0.4, S.lines.hw(z));
      const wy = heightAt(v.waves, side * hw, z, t, v.shift) + 0.2;
      emitSpray(sp, side * (hw + 0.3), wy, z, side * (2 + Math.random() * 4 + 5 * vk), 2 + Math.random() * 3 + 5 * vk * vk + slam * 2.5, 1 - Math.random() * 3,
        0.45 + Math.random() * 0.9 + slam * 0.4, 0.8 + Math.random() * 1.2);
    }
  }
  for (let i = 0; i < sp.N; i++) {
    if (sp.life[i] <= 0) continue;
    sp.life[i] -= dt;
    const k = i * 3, drag = Math.exp(-dt * 1.2);
    sp.vel[k + 1] -= 9.81 * dt;
    sp.vel[k] *= drag; sp.vel[k + 2] = -vs * 0.8 + (sp.vel[k + 2] + vs * 0.8) * drag;   // air streams aft past the ship
    sp.pos[k] += sp.vel[k] * dt; sp.pos[k + 1] += sp.vel[k + 1] * dt; sp.pos[k + 2] += sp.vel[k + 2] * dt;
    sp.size[i] += dt * 0.9;
    if (sp.pos[k + 1] < -0.5) sp.life[i] = 0;
  }
  const g = sp.points.geometry;
  g.attributes.position.needsUpdate = g.attributes.aLife.needsUpdate = g.attributes.aSize.needsUpdate = true;
}

/* ---------------- ship motion ---------------- */
const ZS = [-48, -32, -16, 0, 16, 32, 46];
function stepMotion(v, dt, t) {
  const p = V[v.id], m = v.m, vs = p.kn * KN, vk = vs / 20;
  let sum = 0, sz = 0, szz = 0, szh = 0;
  const hs = ZS.map((z) => heightAt(v.waves, 0, z, t, v.shift));
  ZS.forEach((z, i) => { sum += hs[i]; sz += z; szz += z * z; szh += z * hs[i]; });
  const n = ZS.length, heaveT = sum / n, slope = (n * szh - sz * sum) / (n * szz - sz * sz);
  let rollT = 0;
  for (const z of [-20, 0, 20]) rollT += heightAt(v.waves, 4.6, z, t, v.shift) - heightAt(v.waves, -4.6, z, t, v.shift);
  rollT = Math.atan(rollT / 3 / 9.2) * 1.4;
  const tgt = { heave: heaveT - 0.25 * vk * vk, pitch: Math.atan(slope) + 0.006 * vk * vk, roll: rollT };
  const spring = (x, vv, target, T, zeta) => { const w = 2 * Math.PI / T, a = w * w * (target - x) - 2 * zeta * w * vv; return [x + (vv + a * dt) * dt, vv + a * dt]; };
  if (p.motion) {
    [m.heave, m.vh] = spring(m.heave, m.vh, tgt.heave, 5.5, 0.55);
    [m.pitch, m.vp] = spring(m.pitch, m.vp, tgt.pitch, 4.8, 0.5);
    [m.roll, m.vr] = spring(m.roll, m.vr, tgt.roll, 8.5, 0.12);
  } else { m.heave = 0; m.pitch = 0; m.roll = 0; m.vh = m.vp = m.vr = 0; }
  // bow vertical speed relative to the water under it (for spray bursts)
  const bowY = m.heave + Math.sin(m.pitch) * 50, bowW = heightAt(v.waves, 0, 50, t, v.shift);
  if (dt > 0.004) {                                                   // smoothed, so a short frame cannot spike it
    const r = ((bowY - bowW) - (v.lastBowRel ?? (bowY - bowW))) / dt;
    v.bowRel = (v.bowRel || 0) + (Math.max(-8, Math.min(8, r)) - (v.bowRel || 0)) * Math.min(1, dt * 6);
    v.lastBowRel = bowY - bowW;
  }
}
function poseShip(v) {
  const m = v.m;
  shipRoot.position.y = m.heave; shipRoot.rotation.set(-m.pitch, 0, m.roll);
  shipRoot.updateMatrixWorld(true);
}

/* ---------------- planar reflection ---------------- */
let reflRT = null;
function reflTarget() {
  const w = Math.max(2, Math.round(innerWidth * 0.5)), h = Math.max(2, Math.round(innerHeight * 0.5));
  if (!reflRT || reflRT.width !== w || reflRT.height !== h) { if (reflRT) reflRT.dispose(); reflRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }); }
  return reflRT;
}
const mirror = new THREE.Group(); scene.add(mirror);
const clipBelow = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.0)];
function renderReflection(v) {
  const rt = reflTarget();
  // draw the ship mirrored in the waterline (only what is above the water), on a transparent background
  scene.remove(shipRoot); mirror.add(shipRoot); mirror.scale.y = -1; mirror.updateMatrixWorld(true);
  const vis = []; scene.children.forEach((o) => { if (o !== mirror && o !== hemi && o !== sun && o !== sun.target) { vis.push([o, o.visible]); o.visible = false; } });
  const bg = scene.background, fog = scene.fog; scene.fog = null;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.clippingPlanes = clipBelow; renderer.shadowMap.autoUpdate = false;
  renderer.render(scene, camera);
  renderer.clippingPlanes = []; renderer.shadowMap.autoUpdate = true;
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
  vis.forEach(([o, s]) => { o.visible = s; }); scene.fog = fog; scene.background = bg;
  mirror.remove(shipRoot); mirror.scale.y = 1; scene.add(shipRoot);
  v.u.uReflTex.value = rt.texture; v.u.uRes.value.set(post.rt.width, post.rt.height);
}

/* ---------------- camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 3, 26), dist: 80, yaw: 0.75, pitch: 0.13, want: null, bridge: false };
const CAMS = [
  ['Bow ¾', [0, 3, 26], 80, 0.75, 0.13], ['Bow wave', [6, 1.5, 42], 26, 1.25, 0.1], ['Side, waterline', [0, 1.2, 0], 85, Math.PI / 2, 0.015],
  ['Stern ¾', [0, 3, -35], 75, 2.35, 0.15], ['Wake', [0, 0, -110], 190, 2.85, 0.42], ['Far', [0, 3, 0], 420, 0.9, 0.1], ['Bridge', null],
];
for (const [label, t, dist, yaw, pitch] of CAMS) {
  $('cams').append(el('button', { type: 'button', textContent: label, onclick: () => {
    orbit.bridge = !t;
    if (t) orbit.want = { target: new THREE.Vector3(...t), dist, yaw, pitch };
  } }));
}
let drag = null;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); orbit.want = null; });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (orbit.bridge) { orbit.byaw = (orbit.byaw || 0) - dx * 0.004; orbit.bpitch = Math.max(-0.5, Math.min(0.5, (orbit.bpitch || 0) + dy * 0.003)); return; }
  if (drag.b) {
    const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k);
  } else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.45, Math.max(-0.05, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(2500, Math.max(4, orbit.dist * Math.exp(e.deltaY * 0.0011))); orbit.want = null; }, { passive: false });
function placeCamera(dt, v) {
  if (orbit.want) {
    const k = 1 - Math.exp(-dt * 4), w = orbit.want;
    orbit.target.lerp(w.target, k); orbit.dist += (w.dist - orbit.dist) * k;
    orbit.yaw += Math.atan2(Math.sin(w.yaw - orbit.yaw), Math.cos(w.yaw - orbit.yaw)) * k; orbit.pitch += (w.pitch - orbit.pitch) * k;
    if (orbit.target.distanceTo(w.target) < 0.05 && Math.abs(w.dist - orbit.dist) < 0.05) orbit.want = null;
  }
  if (orbit.bridge) {
    const eye = new THREE.Vector3(1.5, yBridge, 25.5).applyMatrix4(shipRoot.matrixWorld);
    const look = new THREE.Vector3(1.5 + Math.sin(orbit.byaw || 0) * 100, yBridge - 7 + (orbit.bpitch || 0) * 100, 25.5 + Math.cos(orbit.byaw || 0) * 100).applyMatrix4(shipRoot.matrixWorld);
    camera.position.copy(eye); camera.up.set(0, 1, 0).applyQuaternion(shipRoot.quaternion); camera.lookAt(look);
    return;
  }
  camera.up.set(0, 1, 0);
  const tgt = orbit.target.clone(); if ($('follow').checked) tgt.y += v.m.heave;
  const c = Math.cos(orbit.pitch);
  camera.position.set(tgt.x + Math.sin(orbit.yaw) * c * orbit.dist, tgt.y + Math.sin(orbit.pitch) * orbit.dist, tgt.z + Math.cos(orbit.yaw) * c * orbit.dist);
  const minY = heightAt(v.waves, camera.position.x, camera.position.z, clock.t, v.shift) + 0.6;   // keep the lens above the water
  if (camera.position.y < minY) camera.position.y = minY;
  camera.lookAt(tgt);
}

/* ---------------- UI ---------------- */
let edit = 'A';
for (const [k, s] of Object.entries(SEAS)) $('seaPreset').append(el('option', { value: k, textContent: s.label }));
$('seaPreset').append(el('option', { value: 'custom', textContent: 'Custom' }));
for (const [k, s] of Object.entries(LOOKS)) $('lookPreset').append(el('option', { value: k, textContent: s.label }));
$('lookPreset').append(el('option', { value: 'custom', textContent: 'Custom' }));
const FMT = { Hs: (x) => x.toFixed(1) + ' m', Lp: (x) => x + ' m', chop: (x) => x.toFixed(2), spread: (x) => x + '°', dir: (x) => (x === 0 ? 'ahead' : Math.abs(x) === 180 ? 'astern' : (x > 0 ? 'stbd ' : 'port ') + Math.abs(x) + '°'), n: (x) => x,
  shine: (x) => x, ripples: (x) => x.toFixed(2), crest: (x) => x.toFixed(2), reflect: (x) => x.toFixed(2), kn: (x) => x + ' kn' };
const SEA_KEYS = ['Hs', 'Lp', 'chop', 'spread', 'n'], LOOK_KEYS = ['deep', 'scatter', 'shine', 'ripples', 'crest'];
const CHECKS = ['planar', 'clear', 'motion', 'bowWave', 'wake', 'hullFoam', 'wet', 'spray'];
function fillUI() {
  const p = V[edit];
  $('seaPreset').value = p.sea; $('lookPreset').value = p.look;
  for (const k of Object.keys(FMT)) { $(k).value = p[k]; $(k + 'V').textContent = FMT[k](+p[k]); }
  $('deep').value = p.deep; $('scatter').value = p.scatter;
  for (const k of CHECKS) $(k).checked = !!p[k];
  [...$('edit').querySelectorAll('[data-v]')].forEach((b) => b.classList.toggle('on', b.dataset.v === edit));
  seaText();
}
function seaText() {
  const s = (id) => `${id}: ${SEAS[V[id].sea] ? SEAS[V[id].sea].label.replace(/ \(.*/, '') : 'custom'} ${V[id].Hs.toFixed(1)} m, ${V[id].kn} kn`;
  $('seaTxt').textContent = $('splitOn').checked ? `${s('A')}  |  ${s('B')}` : `${s(edit)} · ${LOOKS[V[edit].look] ? LOOKS[V[edit].look].label : 'custom look'}`;
}
function changed(id = edit) { applyVariant(id); save(); seaText(); }
for (const k of Object.keys(FMT)) $(k).addEventListener('input', () => {
  const p = V[edit]; p[k] = +$(k).value; $(k + 'V').textContent = FMT[k](p[k]);
  if (SEA_KEYS.includes(k)) { p.sea = 'custom'; $('seaPreset').value = 'custom'; }
  if (LOOK_KEYS.includes(k)) { p.look = 'custom'; $('lookPreset').value = 'custom'; }
  changed();
});
for (const k of ['deep', 'scatter']) $(k).addEventListener('input', () => { V[edit][k] = $(k).value; V[edit].look = 'custom'; $('lookPreset').value = 'custom'; changed(); });
for (const k of CHECKS) $(k).addEventListener('change', () => { V[edit][k] = $(k).checked; changed(); });
$('seaPreset').onchange = () => { const s = SEAS[$('seaPreset').value]; if (!s) return; Object.assign(V[edit], pick(s), { sea: $('seaPreset').value }); fillUI(); changed(); };
$('lookPreset').onchange = () => { const s = LOOKS[$('lookPreset').value]; if (!s) return; Object.assign(V[edit], pick(s), { look: $('lookPreset').value }); fillUI(); changed(); };
$('edit').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { edit = b.dataset.v; fillUI(); } });
$('copyAB').onclick = () => { V.B = { ...V.A }; changed('B'); fillUI(); };
$('swapAB').onclick = () => { [V.A, V.B] = [V.B, V.A]; changed('A'); changed('B'); fillUI(); };
$('reset').onclick = () => { V[edit] = { ...DEFAULTS[edit] }; fillUI(); changed(); };
$('copyJson').onclick = async () => {
  const txt = JSON.stringify({ A: V.A, B: V.B, sun: +$('sun').value, sunBearing: +$('sunAz').value, exposure: +$('exp').value, waterMesh: $('grid').value, pixelNormals: $('pixN').checked }, null, 1);
  try { await navigator.clipboard.writeText(txt); $('copied').textContent = 'Copied. Paste it into the chat to keep a variant.'; } catch { $('copied').textContent = 'Clipboard blocked by the browser.'; }
};
const bindRange = (id, fmt, fn) => { const r = $(id), o = $(id + 'V'); const f = () => { o.textContent = fmt(+r.value); if (fn) fn(+r.value); }; r.addEventListener('input', f); f(); };
bindRange('splitX', (x) => Math.round(x * 100) + '%');
bindRange('sun', (x) => x + '°', () => setSun()); bindRange('sunAz', (x) => x + '°', () => setSun());
bindRange('exp', (x) => x.toFixed(2), (x) => post.setParams({ bright: x }));
bindRange('tscale', (x) => '×' + x.toFixed(2));
bindRange('scale', (x) => Math.round(x * 100) + '%', (x) => post.setParams({ scale: x }));
$('aa').onchange = () => post.setParams({ aa: $('aa').checked });
$('bloom').onchange = () => post.setParams({ bloom: $('bloom').checked });
$('shadows').onchange = () => { sun.castShadow = $('shadows').checked; };
$('grid').onchange = () => setGrid($('grid').value);
$('pixN').onchange = () => { applyVariant('A'); applyVariant('B'); };
$('splitOn').onchange = () => { $('split').hidden = !$('splitOn').checked; seaText(); };
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.target.closest('input,select')) [$('leftPanel'), $('rightPanel')].forEach((p) => p.classList.toggle('hidden-panel')); });

function setSun() {
  const el_ = THREE.MathUtils.degToRad(+$('sun').value), az = THREE.MathUtils.degToRad(+$('sunAz').value);
  const d = new THREE.Vector3(Math.cos(el_) * Math.sin(az), Math.sin(el_), Math.cos(el_) * Math.cos(az));
  sun.position.copy(d).multiplyScalar(200); sun.target.position.set(0, 0, 0);
  const low = 1 - Math.min(1, el_ / 0.5);
  sun.color.setRGB(1, 0.93 - low * 0.25, 0.84 - low * 0.45); sun.intensity = 3.2 * (0.35 + 0.65 * Math.min(1, el_ / 0.35));
  skyMat.uniforms.uSun.value.copy(d);
  for (const v of Object.values(vars)) {
    const u = v.u; u.uSun.value.copy(d); u.uSunCol.value.copy(sun.color).multiplyScalar(1.1);
    u.uSkyH.value.copy(SKY.h); u.uSkyZ.value.copy(SKY.z); u.uSkySea.value.copy(SKY.sea); u.uFogCol.value.copy(SKY.h); u.uFogFar.value = 3000;
  }
  updateEnvironment();
}

/* ---------------- measuring ---------------- */
const fpsLog = [];
async function measureFps(ms = 2200) { await new Promise((r) => setTimeout(r, 600)); fpsLog.length = 0; await new Promise((r) => setTimeout(r, ms)); const a = fpsLog.slice(); return a.length / (a.reduce((s, x) => s + x, 0) || 1); }
$('measure').onclick = async () => {
  const btn = $('measure'); btn.disabled = true;
  const p = V[edit], tests = [
    ['Planar reflection', () => { const o = p.planar; p.planar = false; changed(); return () => { p.planar = o; changed(); }; }],
    ['Per-pixel normals', () => { const o = $('pixN').checked; $('pixN').checked = false; $('pixN').onchange(); return () => { $('pixN').checked = o; $('pixN').onchange(); }; }],
    ['Water mesh → Light', () => { const o = $('grid').value; $('grid').value = '96,90'; setGrid('96,90'); return () => { $('grid').value = o; setGrid(o); }; }],
    ['Wake + hull foam + bow wave', () => { const o = [p.wake, p.hullFoam, p.bowWave]; p.wake = p.hullFoam = p.bowWave = false; changed(); return () => { [p.wake, p.hullFoam, p.bowWave] = o; changed(); }; }],
    ['Spray', () => { const o = p.spray; p.spray = false; changed(); return () => { p.spray = o; changed(); }; }],
    ['Wet hull', () => { const o = p.wet; p.wet = false; changed(); return () => { p.wet = o; changed(); }; }],
    ['Ship shadows', () => { const o = sun.castShadow; sun.castShadow = false; return () => { sun.castShadow = o; }; }],
    ['Glow', () => { const o = $('bloom').checked; post.setParams({ bloom: false }); return () => post.setParams({ bloom: o }); }],
    ['Anti-aliasing', () => { const o = $('aa').checked; post.setParams({ aa: false }); return () => post.setParams({ aa: o }); }],
  ];
  $('costs').replaceChildren(el('tr', {}, el('td', { textContent: 'measuring…' }), el('td', {})));
  const base = await measureFps();
  const rows = [el('tr', {}, el('td', { textContent: 'All on (variant ' + edit + ')' }), el('td', { textContent: `${base.toFixed(1)} fps · ${(1000 / base).toFixed(1)} ms` }))];
  $('costs').replaceChildren(...rows);
  for (const [name, off] of tests) {
    const undo = off(); const f = await measureFps(); undo();
    const saved = 1000 / base - 1000 / f;
    rows.push(el('tr', {}, el('td', { textContent: name + ' off' }), el('td', { textContent: `${f.toFixed(1)} fps · ${saved >= 0 ? '−' : '+'}${Math.abs(saved).toFixed(1)} ms` })));
    $('costs').replaceChildren(...rows);
  }
  window.__waterCosts = rows.map((r) => [...r.children].map((c) => c.textContent));
  btn.disabled = false;
};

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.resize(innerWidth, innerHeight); }
addEventListener('resize', resize);
const clock = { t: 0, last: performance.now() };
let frames = 0, fpsT = performance.now();
function prepare(v, dt) {
  const p = V[v.id];
  v.shift += p.kn * KN * dt;
  const u = v.u; u.uTime.value = clock.t; u.uShift.value = v.shift; u.uShip.value.x = p.kn * KN;
  stepMotion(v, dt, clock.t); stepSpray(v, dt, clock.t);
}
let sceneCalls = 0;
function drawPass(v, x0, w, H, others) {
  poseShip(v); hullFrom(v);
  v.mesh.visible = true; v.spray.points.visible = V[v.id].spray; for (const o of others) { o.mesh.visible = false; o.spray.points.visible = false; }
  const s = Math.max(4, camera.position.y);
  v.spray.points.material.uniforms.uScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.6;
  v.mesh.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
  v.mesh.scale.setScalar(1 + s * 0.0);
  if (V[v.id].planar) renderReflection(v);
  renderer.setScissorTest(x0 > 0 || w < 1);
  const rt = post.rt;
  rt.scissor.set(Math.round(x0 * rt.width), 0, Math.round(w * rt.width), rt.height); rt.scissorTest = renderer.getScissorTest();
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  sceneCalls += renderer.info.render.calls;
}
function frame(now) {
  const dtR = Math.min(0.05, (now - clock.last) / 1000); clock.last = now;
  const dt = dtR * +$('tscale').value; clock.t += dt;
  fpsLog.push(dtR);
  const split = $('splitOn').checked, cur = split ? vars.A : vars[edit];
  for (const v of Object.values(vars)) if (split || v === cur) prepare(v, dt);
  poseShip(cur); placeCamera(dtR, cur);
  sky.position.copy(camera.position);
  // scene passes into the post target, then the post pass to the screen
  const u = post.mat.uniforms, pp = post.params;
  u.bright.value = pp.bright / 1.2; u.bloom.value = pp.bloom ? 1 : 0; u.time.value = now / 1000;
  renderer.setRenderTarget(post.rt); renderer.setScissorTest(false); post.rt.scissorTest = false; renderer.clear();
  renderer.autoClear = false; sceneCalls = 0;
  if (split) {
    const x = +$('splitX').value;
    drawPass(vars.A, 0, x, 1, [vars.B]); drawPass(vars.B, x, 1 - x, 1, [vars.A]);
    $('split').style.left = (x * 100) + '%';
  } else drawPass(cur, 0, 1, 1, Object.values(vars).filter((v) => v !== cur));
  renderer.autoClear = true; post.rt.scissorTest = false; renderer.setScissorTest(false);
  renderer.setRenderTarget(null);
  renderer.render(post.postScene, post.postCam);
  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now;
    const m = cur.m, info = renderer.info.render;
    $('motionTxt').textContent = `heave ${m.heave.toFixed(2)} m · pitch ${(m.pitch * 57.3).toFixed(1)}° · roll ${(m.roll * 57.3).toFixed(1)}°`;
    $('stats').replaceChildren(el('span', { textContent: 'Water triangles' }), el('b', { textContent: (geo.current.index.count / 3).toLocaleString('en') }),
      el('span', { textContent: 'Waves' }), el('b', { textContent: cur.waves.length }),
      el('span', { textContent: 'Draw calls' }), el('b', { textContent: sceneCalls }),
      el('span', { textContent: 'Frame' }), el('b', { textContent: (fpsLog.slice(-30).reduce((s, x) => s + x, 0) / Math.min(30, fpsLog.length) * 1000).toFixed(1) + ' ms' }));
  }
  if (fpsLog.length > 2000) fpsLog.splice(0, 1000);
  requestAnimationFrame(frame);
}

applyVariant('A'); applyVariant('B'); fillUI(); setSun(); resize();
window.__water = { scene, camera, orbit, vars, V, model, shipRoot, applyVariant, fillUI, get edit() { return edit; }, set edit(x) { edit = x; fillUI(); } };
requestAnimationFrame(frame);

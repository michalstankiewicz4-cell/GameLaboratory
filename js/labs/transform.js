// Transformer lab: shows what js/models/ships-sea/transform.js makes of a lab ship — the three levels of detail with their
// cost, the hitboxes for procedural destruction (click to damage, damage drawn by the shader), the mounts driven on
// every level at once, and a fleet test that spreads up to 24 ships over 2 km to compare against the lab models.
import * as THREE from '../../vendor/three/three.module.js';
import { PostPipeline } from '../render/sea/post.js';
import { transformShip, KINDS } from '../models/ships-sea/transform.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };

/* ---------------- scene ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
$('view').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 9000);
const post = new PostPipeline(renderer);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uH: { value: new THREE.Color(0xcad9e4) }, uZ: { value: new THREE.Color(0x3f6f9e) }, uSun: { value: new THREE.Vector3(0.5, 0.6, -0.6).normalize() }, uSea: { value: new THREE.Color(0x24465e) } },
  vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform vec3 uH,uZ,uSun,uSea;varying vec3 vD;void main(){
    float h=vD.y;vec3 c=h>0.?mix(uH,uZ,pow(h,.5)):mix(uH,uSea,clamp(-h*6.,0.,1.));
    float s=max(dot(vD,uSun),0.);c+=vec3(1.,.92,.75)*(pow(s,900.)*6.+pow(s,10.)*.25);gl_FragColor=vec4(c,1.);}`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMat); scene.add(sky);
scene.fog = new THREE.Fog(0xcad9e4, 1200, 3800);
scene.add(new THREE.HemisphereLight(0xcfe0ee, 0x3a4a56, 0.9));
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
sun.position.copy(skyMat.uniforms.uSun.value).multiplyScalar(200);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 40, bottom: -40, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
{ const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat)); scene.environment = pm.fromScene(s, 0.02).texture; }
const sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ color: 0x103a52, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.92 }));
sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; scene.add(sea);

/* ---------------- transform ---------------- */
const T = transformShip('blyskawica');
const ship = T.lod; scene.add(ship);
const DAMAGE = T.damage;
const fleet = new THREE.Group(); scene.add(fleet);
const fleetLods = () => fleet.children.filter((c) => c.isLOD);

/* ---------------- level table and view mode ---------------- */
function fillLevels() {
  const rows = [['', 'Triangles', 'Draw calls', 'Materials', 'Build'], ['Lab model', T.original.triangles.toLocaleString('en'), T.original.drawCalls, '14', '—'],
    ...T.levels.map((l) => [l.name, l.triangles.toLocaleString('en'), l.drawCalls, l.materials, l.ms + ' ms'])];
  $('levels').replaceChildren(...rows.map((r, i) => el('tr', {}, ...r.map((c) => el(i ? 'td' : 'th', { textContent: c })))));
}
fillLevels();
let mode = 'auto';
const original = T.original.group; original.visible = false; scene.add(original);
for (const m of ['auto', 'LOD0', 'LOD1', 'LOD2', 'lab']) {
  $('show').append(el('button', { type: 'button', textContent: m === 'auto' ? 'Auto (by distance)' : m === 'lab' ? 'Lab model' : m, className: m === mode ? 'on' : '', onclick: (e) => {
    mode = m; [...$('show').children].forEach((b) => b.classList.toggle('on', b === e.target));
    ship.autoUpdate = m === 'auto'; ship.visible = m !== 'lab'; original.visible = m === 'lab';
    if (m.startsWith('LOD')) T.levels.forEach((l) => { l.group.visible = l.name === m; });
  } }));
}
const bindRange = (id, fmt, fn) => { const r = $(id), o = $(id + 'V'); const f = () => { o.textContent = fmt(+r.value); if (fn) fn(+r.value); }; r.addEventListener('input', f); f(); };
const setDist = () => { ship.levels[1].distance = +$('d1').value; ship.levels[2].distance = Math.max(+$('d2').value, +$('d1').value + 10); fleetLods().forEach((l) => { l.levels[1].distance = ship.levels[1].distance; l.levels[2].distance = ship.levels[2].distance; }); };
bindRange('d1', (v) => v + ' m', setDist); bindRange('d2', (v) => v + ' m', setDist);

/* ---------------- hitboxes overlay ---------------- */
const KIND_COL = { hull: 0x4fa3d8, superstructure: 0xf2b84b, funnel: 0xb0b8c0, mast: 0x5fd0a0, platform: 0xd88a4f, fitting: 0xa07ad8, mount: 0xe04b50, gun: 0xff8a8a };
const counts = {}; KINDS.forEach((k) => { counts[k] = 0; }); T.hitboxes.forEach((h) => counts[h.kind]++);
const visKinds = new Set(KINDS);
const edges = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
function boxLines(list) {
  const pos = [], col = [], c = new THREE.Color(), dmgC = new THREE.Color(0xff2a10);
  for (const h of list) {
    if (!visKinds.has(h.kind)) continue;
    const b = h.box, p = [];
    for (let i = 0; i < 8; i++) p.push([i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z]);
    c.set(KIND_COL[h.kind]).lerp(dmgC, DAMAGE.level[h.id]);
    for (const [a, z] of edges) { pos.push(...p[a], ...p[z]); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthTest: true }));
  l.renderOrder = 5; return l;
}
const overlays = [];
function drawBoxes() {
  overlays.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); }); overlays.length = 0;
  if (!$('boxes').checked) return;
  const shipBoxes = T.hitboxes.filter((h) => h.node === 'ship'), o = boxLines(shipBoxes); ship.add(o); overlays.push(o);
  for (const h of T.hitboxes.filter((x) => x.kind === 'gun')) T.mounts[h.mount].guns.forEach((lv) => { const g = lv[h.gun]; if (g) { const l = boxLines([h]); g.add(l); overlays.push(l); } });
}
for (const k of KINDS) {
  const cb = el('input', { type: 'checkbox', checked: true }); cb.onchange = () => { if (cb.checked) visKinds.add(k); else visKinds.delete(k); drawBoxes(); };
  const sw = el('i', { className: 'sw' }); sw.style.background = '#' + new THREE.Color(KIND_COL[k]).getHexString();
  $('kinds').append(el('label', { className: 'chk' }, cb, sw, `${k} — ${counts[k]}`));
}
$('boxes').onchange = drawBoxes;
drawBoxes();
function hbStats() {
  const hit = T.hitboxes.filter((h) => DAMAGE.level[h.id] > 0).length, gone = T.hitboxes.filter((h) => DAMAGE.level[h.id] >= 1).length;
  $('hbStats').replaceChildren(el('span', { textContent: 'Hitboxes' }), el('b', { textContent: T.hitboxes.length }),
    el('span', { textContent: 'Damaged' }), el('b', { textContent: hit }), el('span', { textContent: 'Destroyed' }), el('b', { textContent: gone }),
    el('span', { textContent: 'Transform' }), el('b', { textContent: T.ms + ' ms' }));
}
hbStats();

/* ---------------- damage ---------------- */
function hit(h, power) {
  DAMAGE.add(h.id, power);
  for (const n of h.neighbours) DAMAGE.add(n, power * 0.3);
  drawBoxes(); hbStats();
}
const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayAt(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(ndc, camera); return rc.ray; }
bindRange('power', (v) => v.toFixed(2));
$('salvo').onclick = () => {
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 9, (Math.random() - 0.5) * 100);
    const from = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 200, 60 + Math.random() * 80, (Math.random() - 0.5) * 200));
    const r = T.raycast(new THREE.Ray(from, p.clone().sub(from).normalize()));
    if (r) hit(r.box, +$('power').value);
  }
};
$('repair').onclick = () => { DAMAGE.reset(); drawBoxes(); hbStats(); };
bindRange('train', (v) => v + '°', () => aimAll()); bindRange('elev', (v) => v + '°', () => aimAll());
function aimAll() {
  T.mounts.forEach((m, i) => { const lim = m.torp ? 60 : m.arc || 150, tr = Math.max(-lim, Math.min(lim, +$('train').value)); T.aim(i, THREE.MathUtils.degToRad(m.torp ? tr * 0.5 : tr), THREE.MathUtils.degToRad(m.aa ? +$('elev').value * 2.5 : +$('elev').value)); });
}

/* ---------------- fleet test ---------------- */
function buildFleet() {
  fleet.children.slice().forEach((c) => fleet.remove(c));
  const n = +$('fleet').value - 1, useLod = $('useLod').checked;
  for (let i = 0; i < n; i++) {
    const c = useLod ? ship.clone() : original.clone();
    if (useLod) { c.autoUpdate = true; const ls = []; c.traverse((o) => { if (o.isLineSegments) ls.push(o); }); ls.forEach((o) => o.parent.remove(o)); }
    c.visible = true;
    const a = (i * 2.399) % (Math.PI * 2), r = 100 + (i / Math.max(1, n)) * 1900;
    c.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); c.rotation.y = a * 1.7;
    fleet.add(c);
  }
  setDist();
}
bindRange('fleet', (v) => v, buildFleet);
$('useLod').onchange = buildFleet;

/* ---------------- camera ---------------- */
const orbit = { target: new THREE.Vector3(0, 4, 0), dist: 120, yaw: 0.85, pitch: 0.2, want: null };
const CAMS = [['Close', [0, 4, 10], 70, 0.85], ['LOD1 range', [0, 4, 0], 320, 0.9], ['LOD2 range', [0, 4, 0], 900, 0.9], ['Stern', [0, 3, -50], 40, 2.6], ['Bridge', [0, 9, 22], 30, 1.0], ['Fleet', [0, 0, 0], 2200, 0.6]];
for (const [label, t, dist, yaw] of CAMS) $('cams').append(el('button', { type: 'button', textContent: label, onclick: () => { orbit.want = { target: new THREE.Vector3(...t), dist, yaw, pitch: label === 'Fleet' ? 0.55 : 0.2 }; } }));
let drag = null, moved = 0;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; moved = 0; cv.setPointerCapture(e.pointerId); orbit.want = null; });
cv.addEventListener('pointerup', (e) => {
  if (drag && moved < 4 && drag.b === 0) { const r = T.raycast(rayAt(e.clientX, e.clientY)); if (r && ship.visible) hit(r.box, +$('power').value); }
  drag = null;
});
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) {
    const r = ship.visible ? T.raycast(rayAt(e.clientX, e.clientY)) : null;
    $('hover').textContent = r ? `#${r.box.id} ${r.box.kind}${r.box.layer ? ' (' + r.box.layer + (r.box.side > 0 ? ', starboard' : ', port') + ')' : ''}${r.box.name ? ' — ' + r.box.name : ''} · ${r.box.hp} HP · ${r.box.volume.toFixed(1)} m³ · damage ${(DAMAGE.level[r.box.id] * 100).toFixed(0)} % · ${r.box.neighbours.length} neighbours` : 'Click the ship to hit it: the box under the cursor takes damage, its neighbours a little.';
    return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
  if (drag.b) { const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1); orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); }
  else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.5, Math.max(-0.1, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist = Math.min(4000, Math.max(5, orbit.dist * Math.exp(e.deltaY * 0.0011))); orbit.want = null; }, { passive: false });
addEventListener('keydown', (e) => { if (e.code === 'KeyH' && !e.target.closest('input,select')) [$('leftPanel'), $('rightPanel')].forEach((p) => p.classList.toggle('hidden-panel')); });

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.resize(innerWidth, innerHeight); }
addEventListener('resize', resize); resize();
let last = performance.now(), frames = 0, fpsT = last, frameMs = [];
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); frameMs.push(now - last); last = now;
  if (orbit.want) {
    const k = 1 - Math.exp(-dt * 4), w = orbit.want;
    orbit.target.lerp(w.target, k); orbit.dist += (w.dist - orbit.dist) * k;
    orbit.yaw += Math.atan2(Math.sin(w.yaw - orbit.yaw), Math.cos(w.yaw - orbit.yaw)) * k; orbit.pitch += (w.pitch - orbit.pitch) * k;
    if (orbit.target.distanceTo(w.target) < 0.05 && Math.abs(w.dist - orbit.dist) < 0.05) orbit.want = null;
  }
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target); camera.far = Math.max(9000, orbit.dist * 4); camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
  DAMAGE.uniforms.uDamageT.value = now / 1000;
  renderer.info.autoReset = false; renderer.info.reset();
  post.render(scene, camera);
  frames++;
  if (now - fpsT > 500) {
    const fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now;
    $('fps').textContent = `${fps} fps`;
    const lv = ship.getCurrentLevel(), d = camera.position.distanceTo(ship.position);
    $('lodNow').textContent = mode === 'auto' ? `Camera ${Math.round(d)} m from the ship → ${T.levels[lv].name}` : `Showing ${mode}`;
    const ms = frameMs.slice(-30), avg = ms.reduce((s, x) => s + x, 0) / Math.max(1, ms.length);
    $('perf').replaceChildren(el('span', { textContent: 'Ships' }), el('b', { textContent: fleet.children.length + 1 }),
      el('span', { textContent: 'Draw calls' }), el('b', { textContent: renderer.info.render.calls }),
      el('span', { textContent: 'Triangles drawn' }), el('b', { textContent: renderer.info.render.triangles.toLocaleString('en') }),
      el('span', { textContent: 'Frame' }), el('b', { textContent: avg.toFixed(1) + ' ms' }));
    if (frameMs.length > 600) frameMs = frameMs.slice(-60);
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * orbit.dist, mpp = h / innerHeight, steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    const sm = steps.find((s) => s / mpp > 60) || 500; $('scaleBar').style.width = `${Math.round(sm / mpp)}px`; $('scaleTxt').textContent = `${sm} m`;
  }
  requestAnimationFrame(frame);
}
$('status').textContent = `${T.levels.length} levels · ${T.hitboxes.length} hitboxes · built in ${T.ms} ms`;
window.__tf = { T, scene, camera, orbit, hit, buildFleet, get mode() { return mode; } };
requestAnimationFrame(frame);

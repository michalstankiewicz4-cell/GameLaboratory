// Model Doctor page: builds every ship model unmerged (lab models from ShipKit, the game's class models from
// js/world/models.js), examines each with modeldoctor.js and shows the findings; a finding lights its pieces up
// (the rest fades) and, for gun arcs, trains the mount to the blocked bearing and draws the line of fire.
// window.doctorReport holds every result as plain data (tools/doctor.py reads it).
import * as THREE from '../../vendor/three/three.module.js';
import { examine, explodeBoxes, CHECKS, SEVERITY, ABOUT } from '../../tools/modeldoctor-sea.js';
import { KIT } from '../models/ships-sea/geom.js';
import { SHIPS } from '../models/ships-sea/index.js';
import { transformShip } from '../models/ships-sea/transform.js';
import { sideAt } from '../models/ships-sea/hull.js';
import { buildShip as buildGameShip } from '../models/ships-sea/world/models.js';
import { CLASSES } from '../models/ships-sea/world/constants.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); kids.forEach((k) => e.append(k)); return e; };
const params = new URLSearchParams(location.search);

/* ---------------- the models ---------------- */
const GAME_NAMES = { dd: 'Destroyer', ca: 'Cruiser', bb: 'Battleship', ss: 'Submarine' };
const MODELS = [
  ...Object.keys(SHIPS).map((id) => ({ id: 'lab/' + id, label: SHIPS[id].info.name, sub: 'Ship Lab · 1:1', kind: 'lab', ship: id })),
  ...Object.keys(CLASSES).map((k) => ({ id: 'game/' + k, label: GAME_NAMES[k] || k, sub: 'game model', kind: 'game', cls: k })),
  ...Object.keys(SHIPS).flatMap((id) => [0, 1, 2].map((L) => ({ id: `lod/${id}/${L}`, label: `${SHIPS[id].info.name} LOD${L}`, sub: 'transformer', kind: 'lod', ship: id, level: L }))),
  { id: 'test/bench', label: 'Test bench', sub: 'one mistake per check', kind: 'test' },
];

// A deliberately broken model with one mistake for every check: proves each check still finds what it should.
function testBench() {
  const root = new THREE.Group(), M = (c) => new THREE.MeshStandardMaterial({ color: c });
  const grey = M(0x8a949c), red = M(0xb04030), blue = M(0x3060a0);
  const put = (name, geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); parent.add(m); return m; };
  const hull = new THREE.Group(); hull.name = 'hull'; hull.userData.part = true; root.add(hull);
  put('hull box', new THREE.BoxGeometry(4, 2, 20), grey, 0, 1, 0, hull);
  const bad = new THREE.BoxGeometry(1, 1, 1); bad.attributes.position.setX(0, NaN);
  bad.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)); bad.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.87);   // so three.js itself does not complain
  put('nan box', bad, grey, 0, 2.5, 8);
  const inv = new THREE.BoxGeometry(1, 1, 1); inv.scale(-1, 1, 1);
  put('inside-out box', inv, grey, 0, 2.5, 6);
  put('zfight A', new THREE.BoxGeometry(1, 1, 1), red, 0, 2.5, 4); put('zfight B', new THREE.BoxGeometry(0.6, 1, 0.6), blue, 0.6, 2.5, 4);
  const tube = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, true);
  const ti = tube.index.array; for (let i = 0; i < ti.length; i += 3) { const k = ti[i]; ti[i] = ti[i + 1]; ti[i + 1] = k; }
  put('inward tube', tube, grey, -1.2, 2.6, 7);
  const cup = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), cp = cup.attributes.position.array.slice(18);   // a box missing its +x side
  const cupG = new THREE.BufferGeometry(); cupG.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cupG.computeVertexNormals();
  put('box with a missing side', cupG, grey, 1.4, 2.5, 7);
  put('floating box', new THREE.BoxGeometry(1, 1, 1), grey, 0, 7, 2);
  put('crate under water', new THREE.BoxGeometry(1, 1, 1), grey, 0, -0.5, 0);
  put('fender through the side', new THREE.BoxGeometry(0.5, 0.5, 0.5), grey, 2.1, 1, -2);
  put('hidden box', new THREE.BoxGeometry(0.5, 0.5, 0.5), red, -1, 1, -4);
  put('speck', new THREE.BoxGeometry(0.02, 0.02, 0.02), grey, -1, 2.01, -6);
  const nv = [], N = 12;
  for (let i = 0; i < N; i++) nv.push(-1.5, 2.01, -7 + i * 0.1, 1.5, 2.01, -7 + i * 0.1 + 0.002, 1.5, 2.015, -7 + i * 0.1);
  const sl = new THREE.BufferGeometry(); sl.setAttribute('position', new THREE.Float32BufferAttribute(nv, 3)); sl.computeVertexNormals();
  put('needles', sl, new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide }), 0, 0, 0);
  const mount = new THREE.Group(); mount.name = 'gun mount'; mount.userData.part = true; mount.position.set(0, 2, -9); root.add(mount);
  put('mount base', new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), grey, 0, 0.2, 0, mount);
  const gun = new THREE.Group(); gun.position.set(0, 0.6, 0); mount.add(gun);
  put('barrel', new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8).rotateX(Math.PI / 2).translate(0, 0, 1.25), grey, 0, 0, 0, gun);
  put('wall in the line of fire', new THREE.BoxGeometry(1.2, 1.4, 0.2), grey, 0, 2.7, -7.6);
  return {
    root, measured: { triangles: 999999, drawCalls: 999, materials: 4 },
    opts: { mounts: [{ name: 'test gun', group: mount, train: mount, guns: [gun], arc: 90 }], waterline: true, below: (n) => n.startsWith('hull'),
      hullSide: (z) => (Math.abs(z) < 10 ? 2 : -1), deck: () => 2, budget: { triangles: 1000, drawCalls: 10, measured: { triangles: 999999, drawCalls: 999 } } },
  };
}

function countDraw(root) {
  let tris = 0, calls = 0; const mats = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const ms = [].concat(o.material); ms.forEach((m) => mats.add(m)); calls += Array.isArray(o.material) ? Math.max(1, g.groups.length) : 1;
  });
  return { triangles: Math.round(tris), drawCalls: calls, materials: mats.size };
}

// per-level budgets the transformer aims at (LOD0 is only drawn close up)
const LOD_BUDGET = [{ triangles: 40000, drawCalls: 70 }, { triangles: 15000, drawCalls: 35 }, { triangles: 3000, drawCalls: 10 }];
const transformed = {};
function buildModel(m) {
  if (m.kind === 'test') return testBench();
  if (m.kind === 'lod') {
    const T = transformed[m.ship] || (transformed[m.ship] = transformShip(m.ship));
    const lv = T.levels[m.level], root = new THREE.Group(); root.name = lv.name;
    lv.group.visible = true; root.add(lv.group);                       // out of the THREE.LOD, which hides the other levels
    const mounts = T.mounts.map((mt) => {
      const train = mt.trains[m.level]; if (!train || !mt.arc) return null;
      return { name: mt.name, group: train, train, guns: mt.guns[m.level] || [], arc: mt.arc, base: train.rotation.y, aa: mt.aa };
    }).filter((x) => x && x.guns.length);
    return { root, measured: { triangles: lv.triangles, drawCalls: lv.drawCalls, materials: lv.materials }, opts: {
      // merged levels: geometry checks only (arcs, slivers and the like were checked on the unmerged pieces); a coarser
      // see-through grid, since every ray now tests whole merged meshes
      checks: ['nan', 'inverted', 'facing', 'seethrough', 'zfight', 'floating', 'hidden', 'speck', 'budget'], seeGrid: 40,
      mounts, planeEps: 0.02, budget: { ...LOD_BUDGET[m.level], measured: { triangles: lv.triangles, drawCalls: lv.drawCalls } } } };
  }
  if (m.kind === 'lab') {
    const S = SHIPS[m.ship];
    const merged = S.build({ detail: 1 });
    const measured = countDraw(merged.group);
    KIT.unmerged = true;
    let b; try { b = S.build({ detail: 1 }); } finally { KIT.unmerged = false; }
    const underwater = (name) => name.startsWith('hull');
    return {
      root: b.group, measured,
      opts: {
        mounts: b.mounts, waterline: true, planeEps: 0.02, below: underwater, outboard: underwater,
        hullSide: (z, y) => (z > S.lines.zStern && z < S.lines.zBow + 3 ? sideAt(S.lines, z, y) : -1), deck: (z) => S.lines.deck(z),
      },
    };
  }
  // game model: merged box lists are split into single boxes; turrets get a line of fire per barrel
  const cls = CLASSES[m.cls];
  const g = buildGameShip(cls, 'player');
  const measured = countDraw(g.group);
  g.body.children[0].name = 'hull'; g.body.children[0].userData.doctorOk = 'sliver';   // flat extruded cap: its fan triangles are harmless g.body.children[1].name = 'boot-top stripe';
  g.group.updateMatrixWorld(true);
  explodeBoxes(g.group);
  const mounts = g.turrets.map((pivot, i) => {
    const spec = cls.turrets[i], s = spec.size, gap = s * 0.32;
    pivot.name = `turret ${i + 1} (z ${spec.z}${spec.y ? ', raised' : ''})`; pivot.userData.part = true;
    const guns = [];
    for (let b = 0; b < spec.barrels; b++) {
      const o = new THREE.Object3D(); o.position.set((b - (spec.barrels - 1) / 2) * gap, s * 0.45, s * 0.3); o.userData.len = s * 1.6; pivot.add(o); guns.push(o);
    }
    return { name: pivot.name, group: pivot, train: pivot, guns, base: pivot.rotation.y, arc: Math.round(spec.arc.w * 180 / Math.PI) };
  });
  return { root: g.group, measured, opts: { mounts, waterline: !cls.sub, below: (n) => n.startsWith('hull') || n.startsWith('boot-top') } };
}

/* ---------------- examining ---------------- */
const report = { done: false, models: {} };
window.doctorReport = report;
const built = {};
const budget = () => ({ triangles: +$('bTri').value, drawCalls: +$('bCalls').value });

function examineModel(m) {
  const t0 = performance.now();
  const b = buildModel(m);
  const opts = { ...b.opts, tolerance: +$('tol').value, ignoreAllow: $('showOk').checked };
  if (m.kind === 'lab') opts.budget = { ...budget(), measured: b.measured };
  if (m.kind === 'lod') opts.budget = b.opts.budget;
  const r = examine(b.root, opts);
  const counts = {}; CHECKS.forEach((c) => { counts[c] = 0; });
  r.findings.forEach((f) => counts[f.check]++);
  const sizeBox = new THREE.Box3().setFromObject(b.root).getSize(new THREE.Vector3());
  built[m.id] = { ...b, result: r };
  report.models[m.id] = {
    label: m.label, kind: m.kind, ms: Math.round(performance.now() - t0), stats: r.stats,
    fingerprint: { ...b.measured, size: sizeBox.toArray().map((v) => +v.toFixed(2)) },
    counts, findings: r.findings.map((f) => ({ check: f.check, severity: f.severity, parts: f.parts, detail: f.detail, src: f.src })),
  };
  return report.models[m.id];
}

/* ---------------- viewer ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
$('view').append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x10151c);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
scene.add(new THREE.HemisphereLight(0xdde8f0, 0x2a3440, 1.6));
const sunL = new THREE.DirectionalLight(0xffffff, 2.2); sunL.position.set(0.6, 1, 0.4); scene.add(sunL);
const fireLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff3040, depthTest: false }));
fireLine.renderOrder = 10; fireLine.visible = false; scene.add(fireLine);
const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x2b6f9a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
waterPlane.rotation.x = -Math.PI / 2; scene.add(waterPlane);

const orbit = { target: new THREE.Vector3(), dist: 100, yaw: 0.9, pitch: 0.35 };
let drag = null;
const cv = renderer.domElement;
cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, b: e.button }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointerup', () => { drag = null; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (drag.b) {
    const k = orbit.dist * 0.0012, r = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
    orbit.target.addScaledVector(r, -dx * k).addScaledVector(u, dy * k);
  } else { orbit.yaw -= dx * 0.005; orbit.pitch = Math.min(1.5, Math.max(-1.2, orbit.pitch + dy * 0.004)); }
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); orbit.dist *= Math.exp(e.deltaY * 0.0011); }, { passive: false });

let current = null, shown = null, selected = null;
const FADE = new THREE.MeshStandardMaterial({ color: 0x8a96a2, transparent: true, opacity: 0.12, depthWrite: false });
const RED = new THREE.MeshStandardMaterial({ color: 0xff2a3a, emissive: 0x8a0010, roughness: 0.5 });
const RED2 = new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0x6a3000, roughness: 0.5 });

function show(id) {
  const m = MODELS.find((x) => x.id === id); if (!m) return;
  current = m; selected = null;
  if (shown) scene.remove(shown);
  shown = built[id].root; scene.add(shown);
  const box = new THREE.Box3().setFromObject(shown), size = box.getSize(new THREE.Vector3());
  orbit.target.copy(box.getCenter(new THREE.Vector3())); orbit.dist = size.length() * 1.15;
  waterPlane.scale.set(size.x * 1.6 + 1, size.z * 1.3 + 1, 1);
  camera.near = size.length() / 2000; camera.far = size.length() * 20; camera.updateProjectionMatrix();
  [...$('models').children].forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  if (params.get('model') !== id) history.replaceState(null, '', '?model=' + encodeURIComponent(id));
  highlight(null); listFindings();
}

function restoreMaterials() {
  if (!shown) return;
  shown.traverse((o) => { if (o.isMesh && o.userData.docMat) { o.material = o.userData.docMat; delete o.userData.docMat; } });
  fireLine.visible = false;
  const b = built[current.id];
  (b.opts.mounts || []).forEach((mt) => { if (mt.__rot !== undefined) { mt.train.rotation.y = mt.__rot; delete mt.__rot; } });
}
function highlight(f) {
  restoreMaterials();
  if (!f) return;
  const set = new Set(f.meshes);
  shown.traverse((o) => {
    if (!o.isMesh) return;
    const hit = set.has(o);
    if (hit || $('fade').checked) { o.userData.docMat = o.material; o.material = hit ? (f.meshes[0] === o || f.check !== 'arc' ? RED : RED2) : FADE; }
  });
  if (f.check === 'arc' && f.extra) {
    const mt = built[current.id].opts.mounts.find((x) => x.name === f.extra.mount);
    if (mt) {
      mt.__rot = mt.train.rotation.y; mt.train.rotation.y = (mt.base || 0) + f.extra.deg * Math.PI / 180; shown.updateMatrixWorld(true);
      const g = mt.guns[0], o = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld), q = new THREE.Quaternion(); g.getWorldQuaternion(q);
      const end = o.clone().addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q), g.userData.len || 5);
      fireLine.geometry.setFromPoints([o, end]); fireLine.visible = true;
    }
  }
  const box = new THREE.Box3(); f.meshes.forEach((o) => box.expandByObject(o));
  if (!box.isEmpty()) { orbit.target.copy(box.getCenter(new THREE.Vector3())); orbit.dist = Math.max(box.getSize(new THREE.Vector3()).length() * 3, current.kind === 'lab' ? 8 : 0.8); }
}

/* ---------------- UI ---------------- */
const enabled = new Set(CHECKS);
for (const c of CHECKS) {
  const cb = el('input', { type: 'checkbox', checked: true, id: 'ck-' + c });
  cb.onchange = () => { if (cb.checked) enabled.add(c); else enabled.delete(c); listModels(); listFindings(); };
  $('checks').append(el('label', { className: 'chk', title: ABOUT[c] }, cb, el('span', { className: 'cnt ' + SEVERITY[c], textContent: SEVERITY[c][0].toUpperCase() }), ' ' + c + ' — ' + ABOUT[c]));
}
const setChecks = (pred) => { CHECKS.forEach((c) => { const on = pred(c); $('ck-' + c).checked = on; if (on) enabled.add(c); else enabled.delete(c); }); listModels(); listFindings(); };
$('allOn').onclick = () => setChecks(() => true);
$('errOnly').onclick = () => setChecks((c) => SEVERITY[c] !== 'info');
const bindRange = (id, fmt) => { const r = $(id), o = $(id + 'V'); const f = () => { o.textContent = fmt(+r.value); }; r.addEventListener('input', f); f(); };
bindRange('tol', (v) => (v * 100).toFixed(1) + '%'); bindRange('bTri', (v) => (v / 1000) + 'k'); bindRange('bCalls', (v) => v);
$('rerun').onclick = () => runAll(current && current.id);
$('copy').onclick = async () => {
  const txt = JSON.stringify(report, null, 1);
  try { await navigator.clipboard.writeText(txt); $('copied').textContent = 'Report copied (' + Math.round(txt.length / 1024) + ' kB).'; } catch { $('copied').textContent = 'Clipboard blocked: the report is in window.doctorReport.'; }
};
$('fade').onchange = () => { if (selected) highlight(selected); };

function countsOf(id) {
  const r = report.models[id]; if (!r) return null;
  const c = { error: 0, warning: 0, info: 0 };
  r.findings.forEach((f) => { if (enabled.has(f.check)) c[f.severity]++; });
  return c;
}
function listModels() {
  $('models').replaceChildren(...MODELS.map((m) => {
    const c = countsOf(m.id);
    const tags = c ? (c.error + c.warning + c.info ? ['error', 'warning', 'info'].filter((s) => c[s]).map((s) => el('span', { className: 'cnt ' + s, textContent: c[s] })) : [el('span', { className: 'cnt ok', textContent: '✓' })]) : [el('span', { className: 'cnt', textContent: '…' })];
    const b = el('button', { type: 'button', onclick: () => show(m.id) }, el('span', {}, m.label, el('small', { className: 'dimtxt', textContent: ' ' + m.sub })), ...tags);
    b.dataset.id = m.id; if (current && current.id === m.id) b.classList.add('on');
    return b;
  }));
}
function listFindings() {
  if (!current || !built[current.id]) return;
  const r = built[current.id].result, rep = report.models[current.id];
  $('mTitle').textContent = current.label + ' — findings';
  const fp = rep.fingerprint;
  $('mStats').replaceChildren(
    el('span', { textContent: 'Pieces examined' }), el('b', { textContent: r.stats.meshes.toLocaleString('en') }),
    el('span', { textContent: 'Triangles' }), el('b', { textContent: fp.triangles.toLocaleString('en') }),
    el('span', { textContent: 'Draw calls (merged)' }), el('b', { textContent: fp.drawCalls }),
    el('span', { textContent: 'Materials' }), el('b', { textContent: fp.materials }),
    el('span', { textContent: 'Examined in' }), el('b', { textContent: r.stats.ms + ' ms' }),
  );
  const list = r.findings.filter((f) => enabled.has(f.check));
  const kids = [];
  if (!list.length) kids.push(el('p', { className: 'clean', textContent: 'No findings for the selected checks.' }));
  let grp = '';
  for (const f of list) {
    if (f.check !== grp) { grp = f.check; kids.push(el('div', { className: 'grp', textContent: `${f.check} · ${list.filter((x) => x.check === grp).length} · ${ABOUT[f.check]}` })); }
    const b = el('button', { type: 'button', className: 'find ' + f.severity },
      el('b', { textContent: f.detail }), el('span', { textContent: f.parts.slice(0, 3).join('  ·  ') + (f.parts.length > 3 ? `  · +${f.parts.length - 3}` : '') }),
      ...(f.src.length ? [el('i', { textContent: f.src.slice(0, 3).join('  |  ') })] : []));
    b.onclick = () => {
      selected = selected === f ? null : f; highlight(selected);
      [...$('findings').querySelectorAll('.find')].forEach((x) => x.classList.toggle('on', x === b && !!selected));
    };
    kids.push(b);
  }
  $('findings').replaceChildren(...kids);
}

async function runAll(keep) {
  report.done = false; restoreMaterials(); selected = null;
  for (const m of MODELS) {
    $('status').textContent = `examining ${m.label}…`; listModels();
    await new Promise((r) => setTimeout(r, 30));
    try { examineModel(m); } catch (e) { console.error(e); report.models[m.id] = { label: m.label, error: String(e && e.stack || e), counts: {}, findings: [] }; }
  }
  const tot = { error: 0, warning: 0, info: 0 };
  Object.entries(report.models).forEach(([id, r]) => { if (!id.startsWith('test/')) r.findings.forEach((f) => tot[f.severity]++); });
  $('status').textContent = `${MODELS.length - 1} models · ${tot.error} errors · ${tot.warning} warnings · ${tot.info} info (test bench not counted)`;
  report.done = true;
  listModels();
  const want = keep || params.get('model');
  show(MODELS.some((m) => m.id === want) ? want : MODELS[0].id);
}

/* ---------------- loop ---------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
function frame() {
  const c = Math.cos(orbit.pitch);
  camera.position.set(orbit.target.x + Math.sin(orbit.yaw) * c * orbit.dist, orbit.target.y + Math.sin(orbit.pitch) * orbit.dist, orbit.target.z + Math.cos(orbit.yaw) * c * orbit.dist);
  camera.lookAt(orbit.target);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
window.__doctor = { report, built, show, highlight, get selected() { return selected; } };
requestAnimationFrame(frame);
runAll();

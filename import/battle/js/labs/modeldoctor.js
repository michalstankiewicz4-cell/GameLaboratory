// MODEL DOCTOR — finds the repeating mistakes in procedural models (ported from the owner's Space repo,
// tools/modeldoctor.js, and extended for a naval game: gun arcs, waterline, hull side, game budget).
// Examine a model built UNMERGED (ShipKit: KIT.unmerged = true) so a finding names one piece and its source line.
//
// Only solid meshes count: visible, opaque standard / physical / lambert / phong / basic materials. Glows,
// sprites, particles, lines, instanced copies and decals with polygonOffset are left out where they would mislead.
//
// Checks (finding: { check, severity, parts, detail, meshes, src, extra }):
//   nan        positions that aren't numbers — broken maths                                   error
//   inverted   a closed shape built inside-out (one-sided material: the outside is culled)    error
//   facing     an open surface (hull shell, custom mesh) whose faces point inward — seen from outside it is   error
//              see-through and you look at its inside (what `inverted` cannot see: it needs a closed shape)
//   arc        a gun's line of fire hits its own ship inside the mount's training arc         warning (AA: info)
//   zfight     two pieces' faces in one plane, overlapping — they flicker                     warning
//   floating   a piece that touches nothing of the rest of the model                          warning
//   waterline  a piece above the hull reaching below the waterline (y < 0)                    warning
//   poke       a fitting sticking out through the hull side below the deck edge               warning
//   budget     the merged model is over the game's per-ship budget (triangles, draw calls)    warning
//   hidden     a piece entirely inside another one — drawn for nothing                        info
//   speck      a piece too small to ever be seen — a draw call (or triangles) for nothing     info
//   sliver     long, thin triangles that shade badly (needles)                                info
//
// Allow-list what is meant: userData.doctorOk = 'floating' (or an array of check ids) on the piece or any
// ancestor. Part names: every ancestor with userData.part joined by " › ", then the mesh name.
//
// API: examine(root, opts) → { findings, stats }
//   opts.tolerance   fraction of the model's size for "touching" (default 0.004)
//   opts.planeEps    distance that counts as "the same plane" for zfight (default 0.06 % of the model)
//   opts.ignoreAllow true: report allow-listed pieces too
//   opts.checks      subset of CHECKS to run (default all)
//   opts.mounts      [{ name, group, train, guns: [Object3D], arc (deg, half-width), base (train zero, rad), aa }] for "arc";
//                    a gun fires along its local +z from its origin, range = its meshes' extent (or userData.len)
//   opts.waterline   true: run "waterline"; opts.below(name) → true for pieces allowed under water (hull, screws…)
//   opts.hullSide    (z, y) → half-breadth of the hull for "poke"; opts.outboard(name) → true when allowed
//   opts.budget      { triangles, drawCalls, measured: { triangles, drawCalls } } for "budget"
import * as THREE from '../../vendor/three.module.js';

export const CHECKS = ['nan', 'inverted', 'facing', 'arc', 'zfight', 'floating', 'waterline', 'poke', 'budget', 'hidden', 'speck', 'sliver'];
export const SEVERITY = { nan: 'error', inverted: 'error', facing: 'error', arc: 'warning', zfight: 'warning', floating: 'warning', waterline: 'warning', poke: 'warning', budget: 'warning', hidden: 'info', speck: 'info', sliver: 'info' };
export const ABOUT = {
  nan: 'positions that are not numbers (broken maths)',
  inverted: 'closed shape built inside-out: its outside is culled',
  facing: 'open surface whose faces point inward: from outside you see through it',
  arc: 'gun line of fire hits the own ship inside the training arc',
  zfight: 'faces of two pieces in one plane overlap and flicker',
  floating: 'piece touches nothing of the main body',
  waterline: 'piece above the hull reaches below the waterline',
  poke: 'fitting sticks out through the hull side',
  budget: 'over the per-ship budget of the game',
  hidden: 'piece entirely inside another, drawn for nothing',
  speck: 'piece too small to ever be seen',
  sliver: 'needle triangles that shade badly',
};
const CLOSED = new Set(['BoxGeometry', 'SphereGeometry', 'IcosahedronGeometry', 'OctahedronGeometry', 'DodecahedronGeometry',
  'TetrahedronGeometry', 'TorusGeometry', 'TorusKnotGeometry', 'ExtrudeGeometry', 'CapsuleGeometry']);
const SOLID_MATS = ['isMeshStandardMaterial', 'isMeshPhysicalMaterial', 'isMeshLambertMaterial', 'isMeshPhongMaterial', 'isMeshBasicMaterial'];

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
const matsOf = (o) => (Array.isArray(o.material) ? o.material : [o.material]);

function visibleInTree(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function isSolid(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !visibleInTree(o)) return false;
  return matsOf(o).every((m) => m && m.visible !== false && SOLID_MATS.some((k) => m[k]) && !(m.transparent && m.opacity < 0.95)
    && m.blending !== THREE.AdditiveBlending);
}
export function partName(o, i = 0) {
  const path = [];
  for (let p = o.parent; p; p = p.parent) if (p.userData && p.userData.part && p.name) path.unshift(p.name);
  let own = o.name;
  if (!own) { const m = matsOf(o)[0]; own = (o.geometry && o.geometry.type || 'mesh').replace('Geometry', '').toLowerCase() + ' #' + i + (m && m.color ? ' #' + m.color.getHexString() : ''); }
  return [...path, own].join(' › ');
}
function allowed(o, check) {
  for (let p = o; p; p = p.parent) {
    const ok = p.userData && p.userData.doctorOk;
    if (ok && (ok === check || ok === '*' || (Array.isArray(ok) && ok.includes(check)))) return true;
  }
  return false;
}
function closedShape(g) {
  if (g.userData && g.userData.closed) return true;
  if (!CLOSED.has(g.type)) return g.type === 'CylinderGeometry' && g.parameters && !g.parameters.openEnded && (g.parameters.thetaLength == null || g.parameters.thetaLength >= Math.PI * 2 - 1e-6);
  const p = g.parameters || {};
  if (g.type === 'SphereGeometry') return (p.phiLength == null || p.phiLength >= Math.PI * 2 - 1e-6) && (p.thetaLength == null || p.thetaLength >= Math.PI - 1e-6);
  if (g.type === 'TorusGeometry') return p.arc == null || p.arc >= Math.PI * 2 - 1e-6;
  return true;
}
// thin pieces (rails, wires, ladders) do not stop a shell and are skipped as obstacles in "arc"
function thin(m, L) {
  const p = m.g.parameters;
  if (m.g.type === 'CylinderGeometry' && p && Math.max(p.radiusTop, p.radiusBottom) < 0.0012 * L) return true;
  const s = m.box.getSize(new THREE.Vector3()).toArray().sort((a, b) => a - b); return s[1] < 0.0025 * L;
}
// a rod (cylinder much longer than thick): its long side triangles are needles by nature and harmless
function rod(g) { const p = g.parameters; return g.type === 'CylinderGeometry' && p && p.height > 30 * Math.max(p.radiusTop, p.radiusBottom); }

// world-space triangles of one mesh (relative to the examined root), and its box
function collect(o, i, toRoot) {
  const g = o.geometry, pos = g.attributes.position;
  if (!pos) return null;
  const idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
  const W = new Float32Array(pos.count * 3), box = new THREE.Box3(), mw = new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld);
  let nan = false;
  for (let k = 0; k < pos.count; k++) {
    v0.fromBufferAttribute(pos, k).applyMatrix4(mw);
    if (!isFinite(v0.x) || !isFinite(v0.y) || !isFinite(v0.z)) { nan = true; continue; }
    W[k * 3] = v0.x; W[k * 3 + 1] = v0.y; W[k * 3 + 2] = v0.z; box.expandByPoint(v0);
  }
  return { o, g, W, idx, tris: Math.floor(count / 3), box, nan, name: partName(o, i), src: o.userData.src || g.userData?.src || '' };
}
function triVerts(m, t, a, b, c) {
  const i0 = m.idx ? m.idx[t * 3] : t * 3, i1 = m.idx ? m.idx[t * 3 + 1] : t * 3 + 1, i2 = m.idx ? m.idx[t * 3 + 2] : t * 3 + 2;
  a.fromArray(m.W, i0 * 3); b.fromArray(m.W, i1 * 3); c.fromArray(m.W, i2 * 3);
}
// signed volume in the geometry's own space (three.js corrects mirrored objects itself, not mirrored geometry)
function signedVolume(g) {
  const pos = g.attributes.position, idx = g.index ? g.index.array : null, count = idx ? idx.length : pos.count;
  let vol = 0;
  for (let k = 0; k < count; k += 3) {
    v0.fromBufferAttribute(pos, idx ? idx[k] : k); v1.fromBufferAttribute(pos, idx ? idx[k + 1] : k + 1); v2.fromBufferAttribute(pos, idx ? idx[k + 2] : k + 2);
    vol += v0.dot(e1.crossVectors(v1, v2)) / 6;
  }
  return vol;
}
// 2D triangles overlap (separating axes), each shrunk a little so faces sharing only an edge don't count
function overlap2D(A, B) {
  const shrink = (T) => { const cx = (T[0] + T[2] + T[4]) / 3, cy = (T[1] + T[3] + T[5]) / 3; return T.map((v, i) => (i % 2 ? cy : cx) + (v - (i % 2 ? cy : cx)) * 0.9); };
  const a = shrink(A), b = shrink(B);
  for (const T of [a, b]) for (let i = 0; i < 3; i++) {
    const x1 = T[i * 2], y1 = T[i * 2 + 1], x2 = T[((i + 1) % 3) * 2], y2 = T[((i + 1) % 3) * 2 + 1];
    const nx = y1 - y2, ny = x2 - x1;
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (let k = 0; k < 3; k++) {
      const pa = a[k * 2] * nx + a[k * 2 + 1] * ny; aMin = Math.min(aMin, pa); aMax = Math.max(aMax, pa);
      const pb = b[k * 2] * nx + b[k * 2 + 1] * ny; bMin = Math.min(bMin, pb); bMax = Math.max(bMax, pb);
    }
    if (aMax <= bMin || bMax <= aMin) return false;
  }
  return true;
}
const inTree = (o, root) => { for (; o; o = o.parent) if (o === root) return true; return false; };

export function examine(root, opts = {}) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const run = new Set(opts.checks || CHECKS);
  const meshes = [];
  root.traverse((o) => { if (isSolid(o)) { const m = collect(o, meshes.length, toRoot); if (m && m.tris) meshes.push(m); } });
  const findings = [];
  const add = (check, list, detail, extra) => {
    if (!opts.ignoreAllow && list.length && list.every((m) => allowed(m.o, check))) return;
    findings.push({ check, severity: check === 'arc' && extra && extra.aa ? 'info' : SEVERITY[check], parts: [...new Set(list.map((m) => m.name))], detail,
      meshes: list.map((m) => m.o), src: [...new Set(list.map((m) => m.src).filter(Boolean))], extra });
  };
  const all = new THREE.Box3(); meshes.forEach((m) => all.union(m.box));
  const L = all.isEmpty() ? 1 : all.getSize(v0).length();
  const tol = (opts.tolerance || 0.004) * L;
  const t0 = performance.now(), time = {};
  const lap = (k, t) => { time[k] = Math.round(performance.now() - t); };

  if (run.has('nan')) meshes.filter((m) => m.nan).forEach((m) => add('nan', [m], 'positions that are not numbers'));

  let t = performance.now();
  if (run.has('inverted')) meshes.forEach((m) => {
    if (!closedShape(m.g) || matsOf(m.o).some((x) => x.side === THREE.DoubleSide)) return;
    const vol = signedVolume(m.g);
    if (vol < 0) add('inverted', [m], m.g.type === 'ExtrudeGeometry' ? 'extrusion wound the wrong way (the outline goes clockwise, or it was mirrored)' : 'built inside-out (volume ' + vol.toExponential(1) + '; a mirrored scale or rotation baked into the geometry?)');
  });
  lap('inverted', t);

  // facing: for open one-sided surfaces, cast a ray from each sampled face along its normal and one against it;
  // a face whose front is boxed in by the model while its back looks out to open space points inward
  t = performance.now();
  if (run.has('facing')) {
    const solidAll = meshes.filter((m) => !m.nan);
    const cand = solidAll.filter((m) => !closedShape(m.g) && m.tris >= 20 && matsOf(m.o).every((x) => x.side === THREE.FrontSide));
    if (cand.length) {
      const objs = solidAll.map((m) => m.o), saved = new Map();
      objs.forEach((o) => matsOf(o).forEach((x) => { if (!saved.has(x)) saved.set(x, x.side); x.side = THREE.DoubleSide; }));
      const ray = new THREE.Raycaster(), c = new THREE.Vector3(), nn = new THREE.Vector3(), o = new THREE.Vector3();
      const hits = (from, dir) => { ray.set(from, dir); ray.far = L * 2; return ray.intersectObjects(objs, false).length; };
      for (const m of cand) {
        const step = Math.max(1, Math.floor(m.tris / 48));
        let inward = 0, outward = 0;
        for (let k = 0; k < m.tris; k += step) {
          triVerts(m, k, v0, v1, v2);
          nn.crossVectors(e1.subVectors(v1, v0), e2.subVectors(v2, v0)); if (nn.lengthSq() < 1e-12 * L * L) continue;
          nn.normalize(); c.copy(v0).add(v1).add(v2).divideScalar(3).applyMatrix4(root.matrixWorld);
          const front = hits(o.copy(c).addScaledVector(nn, 0.002 * L), nn), back = hits(o.copy(c).addScaledVector(nn, -0.002 * L), nn.clone().negate());
          if (front > 0 && back === 0) inward++; else if (front === 0 && back > 0) outward++;
        }
        if (inward >= 5 && inward > outward * 2) add('facing', [m], `${inward} of ${inward + outward} sampled faces point inward (reverse the triangle winding)`);
      }
      saved.forEach((side, x) => { x.side = side; });
    }
  }
  lap('facing', t);

  // arc: train every gun mount through its arc (5° steps, guns level) and cast its line of fire
  t = performance.now();
  if (run.has('arc') && opts.mounts) {
    const solid = meshes.filter((m) => !thin(m, L) && !m.nan).map((m) => m.o);
    const ray = new THREE.Raycaster(), o = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), bb = new THREE.Box3();
    for (const mt of opts.mounts) {
      if (!mt.guns || !mt.guns.length || !mt.arc) continue;
      const own = mt.group || mt.train, tr0 = mt.train.rotation.y, el0 = mt.guns.map((g) => g.rotation.x);
      mt.guns.forEach((g) => { g.rotation.x = 0; });
      const targets = solid.filter((x) => !inTree(x, own));
      const bad = [];            // [deg, piece]
      const hitMeshes = new Map();
      for (let a = -mt.arc; a <= mt.arc + 1e-6; a += 5) {
        mt.train.rotation.y = (mt.base || 0) + a * Math.PI / 180;
        own.updateMatrixWorld(true);
        for (const g of mt.guns) {
          let len = g.userData.len;
          if (!len) { bb.makeEmpty(); g.traverse((c) => { if (c.isMesh) { c.geometry.computeBoundingBox(); const b = c.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(g.matrixWorld.clone().invert(), c.matrixWorld)); bb.union(b); } }); len = Math.max(0.5, bb.max.z); g.userData.len = len; }
          o.setFromMatrixPosition(g.matrixWorld); g.getWorldQuaternion(q); dir.set(0, 0, 1).applyQuaternion(q).normalize();
          ray.set(o, dir); ray.far = len * 1.02;
          const h = ray.intersectObjects(targets, false)[0];
          if (h) { bad.push([a, h.object]); hitMeshes.set(h.object, (hitMeshes.get(h.object) || 0) + 1); break; }
        }
      }
      mt.train.rotation.y = tr0; mt.guns.forEach((g, i) => { g.rotation.x = el0[i]; }); own.updateMatrixWorld(true);
      if (bad.length) {
        // contiguous angle ranges (relative to the mount's own bow-wise zero)
        const short = (o) => { const m = meshes.find((mm) => mm.o === o); return m ? m.name.split(' › ').slice(-2).join(' › ') + (m.src ? ' [' + m.src.split(' ← ').pop() + ']' : '') : '?'; };
        const ranges = []; let cur = null;
        for (const [a, o] of bad) {
          if (cur && a - cur.b <= 5.01) { cur.b = a; cur.hits.add(short(o)); } else ranges.push(cur = { a, b: a, hits: new Set([short(o)]) });
        }
        const hitList = [...hitMeshes.keys()].map((x) => meshes.find((m) => m.o === x)).filter(Boolean);
        const gunMesh = []; own.traverse((c) => { const m = meshes.find((mm) => mm.o === c); if (m) gunMesh.push(m); });
        add('arc', [...gunMesh.slice(0, 1), ...hitList], `${mt.name}: fire blocked (arc ±${mt.arc}°) at ` + ranges.map((r) => (r.a === r.b ? r.a + '°' : r.a + '…' + r.b + '°') + ' by ' + [...r.hits].slice(0, 2).join(', ')).join('; '),
          { aa: !!mt.aa, mount: mt.name, angles: bad.map((b) => b[0]), deg: bad[Math.floor(bad.length / 2)][0] });
      }
    }
  }
  lap('arc', t);

  // zfight: faces of different pieces in the same plane, overlapping
  t = performance.now();
  if (run.has('zfight')) {
    const eps = opts.planeEps || 0.0006 * L, buckets = new Map(), qn = 120;
    const keyOf = (nx, ny, nz, d) => Math.round(nx * qn) + ',' + Math.round(ny * qn) + ',' + Math.round(nz * qn) + ',' + Math.round(d / eps);
    meshes.forEach((m, mi) => {
      if (matsOf(m.o).some((x) => x.polygonOffset)) return;
      for (let k = 0; k < m.tris; k++) {
        triVerts(m, k, v0, v1, v2);
        n.crossVectors(e1.subVectors(v1, v0), e2.subVectors(v2, v0));
        const area2 = n.length(); if (area2 < 1e-12 * L * L) continue;
        n.divideScalar(area2);
        const d = n.dot(v0), key = keyOf(n.x, n.y, n.z, d);
        let b = buckets.get(key); if (!b) buckets.set(key, b = []);
        if (b.length < 600) b.push({ mi, t: k, nx: n.x, ny: n.y, nz: n.z });
      }
    });
    const pairs = new Map(), planes = new Map(), A = [0, 0, 0, 0, 0, 0], B = [0, 0, 0, 0, 0, 0], ax = new THREE.Vector3(), ay = new THREE.Vector3(), nn = new THREE.Vector3();
    const flat = (m, k, out) => { triVerts(m, k, v0, v1, v2); [v0, v1, v2].forEach((p, i) => { out[i * 2] = p.dot(ax); out[i * 2 + 1] = p.dot(ay); }); };
    buckets.forEach((b) => {
      if (b.length < 2) return;
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
        const p = b[i], qq = b[j];
        if (p.mi === qq.mi) continue;
        const ma = meshes[p.mi].o.material, mb = meshes[qq.mi].o.material;
        if (ma === mb && !ma.map) continue;              // same untextured material: identical pixels, the fight is invisible
        const key = Math.min(p.mi, qq.mi) + ':' + Math.max(p.mi, qq.mi);
        if ((pairs.get(key) || 0) > 50) continue;
        nn.set(p.nx, p.ny, p.nz);
        ax.set(1, 0, 0); if (Math.abs(nn.x) > 0.9) ax.set(0, 1, 0);
        ax.sub(e1.copy(nn).multiplyScalar(ax.dot(nn))).normalize(); ay.crossVectors(nn, ax);
        flat(meshes[p.mi], p.t, A); flat(meshes[qq.mi], qq.t, B);
        if (overlap2D(A, B)) { pairs.set(key, (pairs.get(key) || 0) + 1); if (!planes.has(key)) planes.set(key, [p.nx, p.ny, p.nz, meshes[p.mi].W, p, meshes[p.mi]]); }
      }
    });
    pairs.forEach((count, key) => {
      const [a, b] = key.split(':').map(Number);
      const [nx, ny, nz, , pp, mm] = planes.get(key); triVerts(mm, pp.t, v0, v1, v2);
      const c = v0.clone().add(v1).add(v2).divideScalar(3), f = (x) => (Math.abs(x) < 0.005 ? '0' : x.toFixed(2));
      add('zfight', [meshes[a], meshes[b]], count + (count > 50 ? '+' : '') + ` overlapping faces in one plane (normal ${f(nx)}, ${f(ny)}, ${f(nz)} near ${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`);
    });
  }
  lap('zfight', t);

  // floating: pieces whose boxes (grown by the tolerance) reach nothing of the main body
  t = performance.now();
  if (run.has('floating')) {
    const grown = meshes.map((m) => m.box.clone().expandByScalar(tol));
    const comp = meshes.map((_, i) => i), find = (i) => (comp[i] === i ? i : (comp[i] = find(comp[i])));
    const order = meshes.map((_, i) => i).sort((a, b) => meshes[a].box.min.x - meshes[b].box.min.x);   // sweep along x
    for (let ii = 0; ii < order.length; ii++) {
      const i = order[ii];
      for (let jj = ii + 1; jj < order.length; jj++) {
        const j = order[jj];
        if (grown[j].min.x > grown[i].max.x) break;
        if (grown[i].intersectsBox(grown[j])) comp[find(i)] = find(j);
      }
    }
    const groups = new Map();
    meshes.forEach((m, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(m); });
    const sorted = [...groups.values()].sort((x, y) => y.reduce((s, m) => s + m.tris, 0) - x.reduce((s, m) => s + m.tris, 0));
    sorted.slice(1).forEach((g) => {
      let gap = Infinity;
      const gb = new THREE.Box3(); g.forEach((m) => gb.union(m.box));
      sorted[0].forEach((m) => { gap = Math.min(gap, gb.distanceToPoint(m.box.clampPoint(gb.getCenter(v0), v1))); });
      add('floating', g, 'touches nothing of the main body (gap ≈ ' + (gap < 1 ? (gap * 100).toFixed(0) + ' cm' : gap.toFixed(2) + ' m') + ', ' + (gap / L * 100).toFixed(2) + ' % of the model)');
    });
  }
  lap('floating', t);

  // waterline: pieces that are not part of the underwater body but reach below y = 0
  if (run.has('waterline') && opts.waterline) meshes.forEach((m) => {
    if (opts.below && opts.below(m.name)) return;
    if (m.box.min.y < -tol) add('waterline', [m], `reaches ${(-m.box.min.y).toFixed(2)} below the waterline`);
  });

  // poke: fittings outside the hull side between the waterline and the deck edge
  t = performance.now();
  if (run.has('poke') && opts.hullSide) meshes.forEach((m) => {
    if (opts.outboard && opts.outboard(m.name)) return;
    let worst = 0;
    for (let k = 0; k < m.W.length; k += 3) {
      const x = Math.abs(m.W[k]), y = m.W[k + 1], z = m.W[k + 2];
      if (y < 0.2 || (opts.deck && y > opts.deck(z) - 0.15)) continue;
      const side = opts.hullSide(z, y);
      if (side > 0 && x - side > worst) worst = x - side;
    }
    if (worst > Math.max(tol * 0.5, 0.05)) add('poke', [m], `sticks out ${(worst * 100).toFixed(0)} cm through the hull side`);
  });
  lap('poke', t);

  // budget: the model as the game would draw it
  if (run.has('budget') && opts.budget && opts.budget.measured) {
    const { triangles, drawCalls, measured } = opts.budget, over = [];
    if (measured.triangles > triangles) over.push(`${measured.triangles.toLocaleString('en')} triangles > ${triangles.toLocaleString('en')}`);
    if (measured.drawCalls > drawCalls) over.push(`${measured.drawCalls} draw calls > ${drawCalls}`);
    if (over.length) add('budget', [], `over the in-game ship budget: ${over.join(', ')} (needs a lower level of detail for the game)`);
  }

  // hidden: every sampled vertex inside another closed piece
  t = performance.now();
  if (run.has('hidden')) {
    const ray = new THREE.Raycaster(), dir = new THREE.Vector3(0.3113, 0.8271, 0.4679).normalize(), p = new THREE.Vector3();   // an odd direction: rays through a shared edge are rare
    const closed = meshes.filter((m) => closedShape(m.g) && !m.nan);
    const inside = (pt, other) => {
      const mats = matsOf(other.o), sides = mats.map((x) => x.side);
      mats.forEach((x) => { x.side = THREE.DoubleSide; });
      ray.set(pt.clone().applyMatrix4(root.matrixWorld), dir);
      let hits = 0, last = -1;
      for (const h of ray.intersectObject(other.o, false)) { if (h.distance - last > 1e-5) hits++; last = h.distance; }   // a hit on a shared edge counts once
      mats.forEach((x, i) => { x.side = sides[i]; });
      return hits % 2 === 1;
    };
    meshes.forEach((m) => {
      for (const other of closed) {
        if (other === m || !other.box.containsBox(m.box)) continue;
        const nv = m.W.length / 3, step = Math.max(1, Math.floor(nv / 16));
        let every = true;
        for (let i = 0; i < nv && every; i += step) { p.fromArray(m.W, i * 3); if (!inside(p, other)) every = false; }
        if (every) { add('hidden', [m, other], 'entirely inside ' + other.name); break; }
      }
    });
  }
  lap('hidden', t);

  if (run.has('speck')) meshes.forEach((m) => { const s = m.box.getSize(v0).length(); if (s < 0.003 * L) add('speck', [m], 'size ' + (s < 1 ? (s * 100).toFixed(1) + ' cm' : s.toFixed(2)) + ' (' + (s / L * 100).toFixed(2) + ' % of the model)'); });

  if (run.has('sliver')) meshes.forEach((m) => {
    if (rod(m.g) || thin(m, L) || (closedShape(m.g) && m.tris <= 12)) return;   // a box's needles only come from it being a wire
    let bad = 0;
    for (let k = 0; k < m.tris; k++) {
      triVerts(m, k, v0, v1, v2);
      const area = n.crossVectors(e1.subVectors(v1, v0), e2.subVectors(v2, v0)).length() / 2;
      const longest = Math.max(v0.distanceToSquared(v1), v1.distanceToSquared(v2), v2.distanceToSquared(v0));
      if (area > 1e-10 * L * L && area / longest < 0.002) bad++;
    }
    if (bad > Math.max(4, m.tris * 0.05)) add('sliver', [m], bad + ' of ' + m.tris + ' triangles are needles');
  });

  // the same mistake repeated (one finding per copy of a part): one finding with "×n"
  const groups = new Map();
  for (const f of findings) {
    const key = f.check + '|' + f.parts.join(';') + '|' + f.src.join(';') + '|' + (f.check === 'zfight' || f.check === 'sliver' || f.check === 'speck' ? '' : f.detail);
    const g = groups.get(key);
    if (g) { g.n++; g.meshes.push(...f.meshes); } else groups.set(key, Object.assign(f, { n: 1 }));
  }
  findings.length = 0;
  groups.forEach((f) => { if (f.n > 1) f.detail += ` (×${f.n})`; findings.push(f); });
  const order = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || CHECKS.indexOf(a.check) - CHECKS.indexOf(b.check));
  return { findings, stats: { meshes: meshes.length, triangles: meshes.reduce((s, m) => s + m.tris, 0), size: L, ms: Math.round(performance.now() - t0), time } };
}

// Splits meshes whose geometry is a merge of boxes (the game's mergeBoxes: 36 non-indexed vertices per box)
// into one mesh per box, flagged closed, so the doctor can name and test each box.
export function explodeBoxes(root) {
  const list = [];
  root.traverse((o) => { if (o.isMesh && o.geometry.type === 'BufferGeometry' && !o.geometry.index && o.geometry.attributes.position.count % 36 === 0 && o.geometry.attributes.position.count > 36) list.push(o); });
  for (const o of list) {
    const g = o.geometry, k = g.attributes.position.count / 36, grp = new THREE.Group();
    grp.name = o.name || 'boxes #' + matsOf(o)[0].color.getHexString(); grp.userData.part = true;
    grp.position.copy(o.position); grp.quaternion.copy(o.quaternion); grp.scale.copy(o.scale);
    for (let i = 0; i < k; i++) {
      const b = new THREE.BufferGeometry();
      for (const a of ['position', 'normal', 'uv']) {
        const at = g.attributes[a]; if (!at) continue;
        b.setAttribute(a, new THREE.BufferAttribute(at.array.slice(i * 36 * at.itemSize, (i + 1) * 36 * at.itemSize), at.itemSize));
      }
      b.userData.closed = true;
      b.computeBoundingBox();
      const c = b.boundingBox.getCenter(new THREE.Vector3());
      const m = new THREE.Mesh(b, o.material); m.name = `box ${i} @ ${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}`;
      grp.add(m);
    }
    o.parent.add(grp); o.parent.remove(o);
  }
  return list.length;
}

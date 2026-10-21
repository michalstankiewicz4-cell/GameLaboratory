// StructKit coastal works: building blocks for quays and breakwaters, and the random placement of armour units
// (rock, tetrapods) as instanced meshes — thousands of units in one draw call per kind. Metres, y up, y = 0 sea level.
import * as THREE from '../../vendor/three.module.js';
import { mergeList } from '../shipkit/geom.js';

export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------------- armour units ---------------- */
// Tetrapod (Danel & Anglès d'Auriac, 1950): four tapered legs from one centre along the tetrahedron's axes. h = overall
// height of a unit standing on three legs. Proportions from a 7.8 t unit (≈ 2.35 m across, 2.08 m high, 3.4 m³).
export function tetrapodGeometry(h = 2.08, seg = 7) {
  const L = h * 0.62, r0 = h * 0.22, r1 = h * 0.13;                 // leg length from the centre, root and tip radii
  const dirs = [[0, 1, 0], [0.9428, -0.3333, 0], [-0.4714, -0.3333, 0.8165], [-0.4714, -0.3333, -0.8165]];
  const list = [], up = new THREE.Vector3(0, 1, 0);
  for (const d of dirs) {
    const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, false); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...d)));
    list.push(g);
  }
  const core = new THREE.IcosahedronGeometry(r0 * 1.05, 0); list.push(core);
  const out = mergeList(list); out.translate(0, h * 0.25, 0);      // origin at the base plane (three feet down)
  out.computeVertexNormals(); out.userData.height = h; out.userData.volume = 0.33 * h * h * h;
  return out;
}
// Quarry rock: an icosahedron pushed about at random (each variant a different stone), size ≈ nominal diameter d.
export function rockGeometry(d = 2, seed = 1, detail = 1) {
  const g = new THREE.IcosahedronGeometry(d * 0.62, detail), p = g.attributes.position, r = rng(seed);
  const sx = 0.8 + r() * 0.5, sy = 0.6 + r() * 0.35, sz = 0.85 + r() * 0.45;
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.82 + r() * 0.3);
    const k = seen.get(key); p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz);
  }
  g.computeVertexNormals();
  return g;
}

// Lays units on a surface given by a parametric function surf(u, v) → { p: Vector3, n: Vector3 } over u ∈ [0, uLen] and
// v ∈ [0, vLen] (metres along the surface), in `layers` layers, spacing ≈ unit size × spacing; random yaw and tilt;
// below `singleBelow` (m) only the first layer is laid (seen from above the sea, the second would not show).
// Returns an array of Matrix4 (the caller makes InstancedMeshes from them).
export function layUnits(surf, uLen, vLen, size, { layers = 2, spacing = 0.95, seed = 7, tilt = 0.6, jitter = 0.35, scaleVar = 0.12, singleBelow = -Infinity } = {}) {
  const r = rng(seed), out = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const step = size * spacing, nu = Math.max(1, Math.round(uLen / step)), nv = Math.max(1, Math.round(vLen / step));
  for (let l = 0; l < layers; l++) for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = (i + 0.5 + (l ? 0.5 : 0) + (r() - 0.5) * jitter) * (uLen / nu), v = (j + 0.5 + (l ? 0.5 : 0) + (r() - 0.5) * jitter) * (vLen / nv);
    if (u > uLen || v > vLen) continue;
    const s = surf(u, v); if (!s || (l > 0 && s.p.y < singleBelow)) continue;   // deep down one layer is enough to look right
    const pos = s.p.clone().addScaledVector(s.n, size * (0.15 + l * 0.55));
    const e = new THREE.Euler((r() - 0.5) * tilt * 2, r() * Math.PI * 2, (r() - 0.5) * tilt * 2);
    q.setFromUnitVectors(up, s.n).multiply(new THREE.Quaternion().setFromEuler(e));
    const k = 1 + (r() - 0.5) * 2 * scaleVar;
    m.compose(pos, q, new THREE.Vector3(k, k, k)); out.push(m.clone());
  }
  return out;
}
export function instanced(geo, mat, matrices, name) {
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  mesh.computeBoundingSphere();
  return mesh;
}

/* ---------------- quay furniture ---------------- */
// Tee-head mooring bollard (cast steel), base plate on the capping beam at y.
export function bollard(p, x, y, z, s = 1) {
  p.box('dark', 0.9 * s, 0.08 * s, 0.9 * s, [x, y + 0.04 * s, z]);
  p.cyl('dark', 0.24 * s, 0.3 * s, 0.75 * s, 12, [x, y + 0.45 * s, z]);
  p.box('dark', 0.85 * s, 0.16 * s, 0.32 * s, [x, y + 0.86 * s, z]);
  p.cyl('dark', 0.32 * s, 0.32 * s, 0.1 * s, 12, [x, y + 0.98 * s, z]);
}
// Cylindrical rubber fender hung on chains along a vertical quay face (face at x = fx, facing +x), centre at y, z.
export function cylinderFender(p, fx, y, z, D = 1.4, L = 2.2) {
  p.add('rubber', new THREE.CylinderGeometry(D / 2, D / 2, L, 16, 1, false).rotateX(Math.PI / 2), [fx + D / 2, y, z]);
  for (const s of [-1, 1]) p.rod('metal', [fx + D / 2, y, z + s * L / 2], [fx, y + 1.6, z + s * L * 0.6], 0.03, 4);
}
// Recessed steel ladder down the quay face (x = fx) from y0 to y1 at z.
export function quayLadder(p, fx, y0, y1, z) {
  for (const s of [-0.22, 0.22]) p.rod('metal', [fx + 0.05, y0, z + s], [fx + 0.05, y1, z + s], 0.03, 4);
  for (let y = y0 + 0.15; y < y1; y += 0.3) p.rod('metal', [fx + 0.05, y, z - 0.22], [fx + 0.05, y, z + 0.22], 0.02, 4);
}
// Quay-edge lighting mast with a twin floodlight head.
export function lightMast(p, x, y, z, h = 16) {
  p.cyl('metal', 0.12, 0.2, h, 8, [x, y + h / 2, z]);
  p.box('metal', 1.4, 0.2, 0.3, [x, y + h, z]);
  for (const s of [-1, 1]) { p.box('dark', 0.5, 0.35, 0.45, [x + s * 0.55, y + h - 0.2, z]); p.add('lamp', new THREE.CircleGeometry(0.18, 10).rotateX(Math.PI / 2), [x + s * 0.55, y + h - 0.39, z]); }
}

// Merged parametric section swept along z: profile = [[x, y], …] closed polygon in the x-y plane, from z0 to z1.
export function sweepZ(profile, z0, z1) {
  const sh = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
  g.translate(0, 0, z0);
  return g;
}

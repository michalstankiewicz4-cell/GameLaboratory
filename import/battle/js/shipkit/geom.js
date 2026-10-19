// ShipKit geometry helpers: a part builder that collects small pieces per material and merges them into one
// mesh per (part, material), plus primitive helpers in metres. Merging keeps a detailed ship at a few dozen
// draw calls instead of thousands.
import * as THREE from '../../vendor/three.module.js';

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();

// Merges non-indexed copies of geometries (position, normal, uv) into one BufferGeometry.
export function mergeList(list) {
  let n = 0;
  const parts = list.map((g) => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

// A Part is a named group (toggleable in the lab, rotatable for mounts) whose pieces are merged per material.
export class Part {
  constructor(name, materials) {
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = name;
    this.mats = materials;          // { key: THREE.Material }
    this.bins = new Map();          // material key -> [geometry]
  }
  // Adds geometry g (consumed) with transform: position [x,y,z], rotation [rx,ry,rz] (radians, XYZ), scale.
  add(key, g, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
    E.set(r[0], r[1], r[2]); Q.setFromEuler(E);
    M.compose(V.set(p[0], p[1], p[2]), Q, Array.isArray(s) ? S.set(s[0], s[1], s[2]) : S.set(s, s, s));
    g.applyMatrix4(M);
    if (!this.bins.has(key)) this.bins.set(key, []);
    this.bins.get(key).push(g);
    return this;
  }
  box(key, w, h, d, p, r) { return this.add(key, new THREE.BoxGeometry(w, h, d), p, r); }
  cyl(key, rt, rb, h, seg, p, r) { return this.add(key, new THREE.CylinderGeometry(rt, rb, h, seg, 1), p, r); }
  // Horizontal tube along +z centred at p.
  tubeZ(key, r0, r1, len, seg, p, r = [0, 0, 0]) {
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
    g.rotateX(Math.PI / 2);
    return this.add(key, g, p, r);
  }
  // Thin line-like rod between two points (rigging, rails), radius rad.
  rod(key, a, b, rad = 0.02, seg = 4) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return this;
    const g = new THREE.CylinderGeometry(rad, rad, len, seg, 1);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    M.compose(V.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, S.set(1, 1, 1));
    g.applyMatrix4(M);
    if (!this.bins.has(key)) this.bins.set(key, []);
    this.bins.get(key).push(g);
    return this;
  }
  // Builds the meshes (one per material). Returns the group.
  finish() {
    for (const [key, list] of this.bins) {
      const mesh = new THREE.Mesh(mergeList(list), this.mats[key]);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.name = `${this.name}:${key}`;
      this.group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.bins.clear();
    return this.group;
  }
}

// Extruded profile (in the x-y plane given as [x,y] pairs) of depth d along z, centred on z.
export function prism(points, d) {
  const sh = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

// Plan-view extrusion: a deckhouse outline given as [x, z] points, extruded upward by h.
export function plan(points, h) {
  const sh = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  return g;
}

// Rounded-rectangle outline in plan (half width hw, from z0 (aft) to z1 (fore), corner radius r), as [x,z] points.
export function roundRect(hw, z0, z1, r, seg = 4) {
  const pts = [];
  const corner = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  corner(hw - r, z1 - r, 0); corner(-hw + r, z1 - r, Math.PI / 2); corner(-hw + r, z0 + r, Math.PI); corner(hw - r, z0 + r, Math.PI * 1.5);
  return pts;
}

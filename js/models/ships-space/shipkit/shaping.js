// ShipKit · shaping — kształtowanie: zaokrąglone krawędzie i uszczelnione złącza dla dowolnego modelu (opcje round i seal buildShipModel).
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { shadowed } from './shared.js';

// ---------------------------------------------------------------------
// SHAPING — rounded edges and sealed joints, for any model (buildShipModel
// options `round` and `seal`, 0..1; 0 = the model exactly as defined).
//
// Rounded edges: while a model builds with round > 0, THREE.BoxGeometry
// and THREE.CylinderGeometry make rounded versions (withRounding): a box's
// edges and corners, a cylinder's two rims. The radius follows the part —
// round × 60 % of its smallest half-size — so a thin plate gets a soft
// edge and a block a full one. Partial or open cylinders stay as they are.
// The swap is scoped to the build (restored in `finally`); cones and every
// other geometry are untouched.
//
// Sealed joints (sealJoints): where two solid parts cut into each other,
// the line where they meet gets, in the bigger part's material, either
//   "fillet" (default): a concave strip curving from one surface into the
//            other — the joint's edge rounded, as if cast in one piece;
//   "bead":   a round tube lying on the joint, like a line of sealant. The line is found from the parts' own shapes: each mesh's
// edges are tested against the other's solid (box, cylinder, cone, sphere
// and dome, torus, lathe, extrude — from the geometry's parameters, in its
// local frame); an edge with one end inside and one outside gives a point
// on the meeting line; the points are chained into curves, and a tube
// follows each one. Moving parts are sealed only to parts that move with
// them (the same userData.dynamic unit).
// ---------------------------------------------------------------------
const _Box = THREE.BoxGeometry, _Cyl = THREE.CylinderGeometry;
function roundedBoxGeometry(w, h, d, r, k) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  r = Math.min(r, hx, hy, hz);
  // k segments over each rounded band, one across the flat middle
  const n = 2 * k + 1;
  const g = new _Box(w, h, d, n, n, n);
  const p = g.attributes.position, nr = g.attributes.normal;
  const remap = (x, half) => {
    const i = Math.round((x / half + 1) / 2 * n);               // which grid line
    if (i <= k) return -half + r * (1 - Math.cos(i / k * Math.PI / 2)) * (k ? 1 : 0);
    if (i >= n - k) return half - r * (1 - Math.cos((n - i) / k * Math.PI / 2));
    return 0;
  };
  const q = new THREE.Vector3(), v = new THREE.Vector3(), o = new THREE.Vector3();
  const uv = g.attributes.uv, size = [w, h, d], half = [hx, hy, hz];
  // a face's texture axes, as BoxGeometry lays them: [u axis, v axis] by the face's normal axis
  const AX = [[2, 1], [0, 2], [0, 1]];
  for (let i = 0; i < p.count; i++) {
    const old = [p.getX(i), p.getY(i), p.getZ(i)];
    v.set(remap(old[0], hx), remap(old[1], hy), remap(old[2], hz));
    // the texture follows the moved vertices (else it bunches up in bands near the edges):
    // the same mapping BoxGeometry used, on the new flat position
    const nAxis = Math.abs(nr.getX(i)) > 0.5 ? 0 : Math.abs(nr.getY(i)) > 0.5 ? 1 : 2, [ua, va] = AX[nAxis], flat = [v.x, v.y, v.z];
    const su = Math.abs((old[ua] + half[ua]) / size[ua] - uv.getX(i)) < 1e-4 ? 1 : -1;
    const sv = Math.abs(1 - (old[va] + half[va]) / size[va] - uv.getY(i)) < 1e-4 ? 1 : -1;
    uv.setXY(i, (flat[ua] * su + half[ua]) / size[ua], 1 - (flat[va] * sv + half[va]) / size[va]);
    q.set(Math.max(-hx + r, Math.min(hx - r, v.x)), Math.max(-hy + r, Math.min(hy - r, v.y)), Math.max(-hz + r, Math.min(hz - r, v.z)));
    o.subVectors(v, q);
    if (o.lengthSq() > 1e-12) { o.normalize(); v.copy(q).addScaledVector(o, r); nr.setXYZ(i, o.x, o.y, o.z); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.userData.shape = { kind: "box", w, h, d };
  return g;
}
function roundedCylinderGeometry(rt, rb, h, radial, r, k) {
  const hy = h / 2, pts = [];
  // the profile, axis to axis: bottom disc, its rounded rim, the side, the top rim, the top disc
  pts.push(new THREE.Vector2(0, -hy));
  for (let i = 0; i <= k; i++) { const a = -Math.PI / 2 + i / k * Math.PI / 2; pts.push(new THREE.Vector2(rb - r + Math.cos(a) * r, -hy + r + Math.sin(a) * r)); }
  for (let i = 0; i <= k; i++) { const a = i / k * Math.PI / 2; pts.push(new THREE.Vector2(rt - r + Math.cos(a) * r, hy - r + Math.sin(a) * r)); }
  pts.push(new THREE.Vector2(0, hy));
  const g = new THREE.LatheGeometry(pts, radial);
  g.computeVertexNormals();
  // the texture as on a CylinderGeometry's side: v by height (a lathe spreads it
  // over the whole profile, caps included — painted bands squeezed and merged)
  const pa = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pa.count; i++) uv.setY(i, (pa.getY(i) + hy) / h);
  g.userData.shape = { kind: "cylinder", rt, rb, h };
  return g;
}
// Build `fn` with rounded boxes and cylinders (round 0..1, k: arc segments).
function withRounding(round, k, fn) {
  if (!(round > 0)) return fn();
  THREE.BoxGeometry = function (w = 1, h = 1, d = 1, ...rest) {
    const r = round * 0.6 * Math.min(w, h, d) / 2;
    return r > 1e-4 ? roundedBoxGeometry(w, h, d, r, k) : new _Box(w, h, d, ...rest);
  };
  THREE.CylinderGeometry = function (rt = 1, rb = 1, h = 1, radial = 8, hs = 1, open = false, t0 = 0, tl = Math.PI * 2) {
    const r = round * 0.6 * Math.min(rt, rb, h / 2);
    if (open || tl < Math.PI * 2 - 1e-6 || Math.min(rt, rb) < h * 0.01 || r < 1e-4) return new _Cyl(rt, rb, h, radial, hs, open, t0, tl);
    return roundedCylinderGeometry(rt, rb, h, radial, r, k);
  };
  try { return fn(); } finally { THREE.BoxGeometry = _Box; THREE.CylinderGeometry = _Cyl; }
}

// An ExtrudeGeometry as a solid, bevel included. Three.js bevels by growing
// the outline: by bevelSize all along the depth, easing back to the plain
// outline at the caps (a quarter ellipse, bevelThickness deep). Ignoring
// that put a fin's root 4 cm inside the fin seen on screen (its joint only
// showed past ~70 %).
function extrudeSolid(P) {
  const sh = Array.isArray(P.shapes) ? P.shapes : [P.shapes], o = P.options || {};
  const depth = o.depth !== undefined ? o.depth : o.amount !== undefined ? o.amount : 1;
  const bev = o.bevelEnabled !== false;
  const bt = bev ? (o.bevelThickness !== undefined ? o.bevelThickness : 0.2) : 0;
  const bs = bev ? (o.bevelSize !== undefined ? o.bevelSize : bt - 0.1) : 0, bo = bev ? (o.bevelOffset || 0) : 0;
  const polys = sh.map((x) => { const e = x.extractPoints(12); return { outer: e.shape, holes: e.holes }; });
  const loops = []; for (const q of polys) loops.push(q.outer, ...q.holes);
  const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
  const out2 = { d: 0, ux: 0, uy: 0 };
  // signed distance to the plain outline (− inside) and the outward direction there
  const outline = (p) => {
    let bd = Infinity, qx = 0, qy = 0, ex = 1, ey = 0;
    for (const L of loops) for (let i = 0, j = L.length - 1; i < L.length; j = i++) {
      const a = L[j], b = L[i], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1e-12;
      const k = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
      const cx = a.x + vx * k - p.x, cy = a.y + vy * k - p.y, d = cx * cx + cy * cy;
      if (d < bd) { bd = d; qx = cx; qy = cy; ex = vx; ey = vy; }
    }
    const inside = polys.some((q) => inPoly(p, q.outer) && !q.holes.some((h) => inPoly(p, h)));
    let ux = inside ? qx : -qx, uy = inside ? qy : -qy, l = Math.hypot(ux, uy);
    if (l < 1e-9) { const m = Math.hypot(ex, ey) || 1; ux = ey / m; uy = -ex / m; l = 1;   // on the line: its perpendicular, pointing out
      if (polys.some((q) => inPoly({ x: p.x + ux * 1e-4, y: p.y + uy * 1e-4 }, q.outer))) { ux = -ux; uy = -uy; } }
    out2.d = (inside ? -1 : 1) * Math.sqrt(bd); out2.ux = ux / l; out2.uy = uy / l;
    return out2;
  };
  const beyond = (z) => (z < 0 ? -z : z > depth ? z - depth : 0);   // how far into a cap's bevel
  const grow = (ez) => (bt > 0 ? bs * Math.sqrt(Math.max(0, 1 - (ez / bt) * (ez / bt))) : 0) + bo;
  return {
    inside: (p) => { const ez = beyond(p.z); if (ez >= bt && bt > 0 || (bt === 0 && ez > 0)) return false; return outline(p).d < grow(ez); },
    normal: (p, out) => {
      const o2 = outline(p), ez = beyond(p.z), zs = p.z > depth / 2 ? 1 : -1;
      if (ez > 0 && bt > 0) {
        // on the bevel: the ellipse's normal; within the plain outline: the cap
        if (o2.d <= bo) return out.set(0, 0, zs);
        const d = o2.d - bo;
        return out.set(o2.ux * d / (bs * bs || 1e-9), o2.uy * d / (bs * bs || 1e-9), zs * ez / (bt * bt)).normalize();
      }
      const dSide = Math.abs(bs + bo - o2.d), dCap = bt + Math.min(Math.abs(p.z), Math.abs(depth - p.z));
      if (dCap < dSide) return out.set(0, 0, zs);
      return out.set(o2.ux, o2.uy, 0);
    },
  };
}

// Is a point (in the mesh's local frame) inside the mesh's solid? null: not
// a solid we can tell. The test carries .thick: the part's smallest
// half-size (a torus' tube, a box's thinnest side…), which sizes the bead.
function solidTest(geo) {
  const f = solidTestOf(geo);
  if (f) { f.thick = thicknessOf(geo); f.normal = solidNormalOf(geo); }
  return f;
}
// The outward normal of a solid's surface nearest a local point, from the
// shape itself (a mesh's vertex normals are ambiguous where faces meet).
function solidNormalOf(geo) {
  const s = geo.userData && geo.userData.shape, P = geo.parameters || {}, t = geo.type;
  const box = (w, h, d) => (p, out) => {
    const dx = w / 2 - Math.abs(p.x), dy = h / 2 - Math.abs(p.y), dz = d / 2 - Math.abs(p.z);
    if (dx <= dy && dx <= dz) return out.set(Math.sign(p.x) || 1, 0, 0);
    if (dy <= dz) return out.set(0, Math.sign(p.y) || 1, 0);
    return out.set(0, 0, Math.sign(p.z) || 1);
  };
  const cyl = (rt, rb, h) => (p, out) => {
    const r = Math.hypot(p.x, p.z), rr = rb + (rt - rb) * (p.y + h / 2) / h;
    const dSide = Math.abs(rr - r), dTop = Math.abs(h / 2 - p.y), dBot = Math.abs(p.y + h / 2);
    if (dTop < dSide && dTop <= dBot) return out.set(0, 1, 0);
    if (dBot < dSide) return out.set(0, -1, 0);
    return r > 1e-9 ? out.set(p.x / r, (rb - rt) / h, p.z / r).normalize() : out.set(1, 0, 0);
  };
  if (s && s.kind === "box") return box(s.w, s.h, s.d);
  if (s && s.kind === "cylinder") return cyl(s.rt, s.rb, s.h);
  if (t === "BoxGeometry") return box(P.width, P.height, P.depth);
  if (t === "CylinderGeometry") return cyl(P.radiusTop, P.radiusBottom, P.height);
  if (t === "ConeGeometry") return cyl(0, P.radius, P.height);
  if (t === "SphereGeometry") return (p, out) => out.copy(p).normalize();
  if (t === "TorusGeometry") return (p, out) => { const l = Math.hypot(p.x, p.y) || 1; return out.set(p.x - p.x / l * P.radius, p.y - p.y / l * P.radius, p.z).normalize(); };
  if (t === "LatheGeometry") {
    const pts = P.points;
    return (p, out) => {
      const r = Math.hypot(p.x, p.z) || 1e-9;
      let best = -1, slope = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if ((p.y - a.y) * (p.y - b.y) > 0 || a.y === b.y) continue;
        const x = a.x + (b.x - a.x) * (p.y - a.y) / (b.y - a.y);
        if (x > best) { best = x; slope = (b.x - a.x) / (b.y - a.y); }
      }
      return out.set(p.x / r, -slope, p.z / r).normalize();      // the gradient of r − f(y)
    };
  }
  if (t === "ExtrudeGeometry" && P.shapes) { const E = extrudeSolid(P); return E.normal; }
  return null;
}
function thicknessOf(geo) {
  const s = geo.userData && geo.userData.shape, P = geo.parameters || {}, t = geo.type;
  if (s && s.kind === "box") return Math.min(s.w, s.h, s.d) / 2;
  if (s && s.kind === "cylinder") return Math.min(Math.max(s.rt, s.rb), s.h / 2);
  if (t === "BoxGeometry") return Math.min(P.width, P.height, P.depth) / 2;
  if (t === "CylinderGeometry") return Math.min(Math.max(P.radiusTop, P.radiusBottom), P.height / 2);
  if (t === "ConeGeometry") return Math.min(P.radius, P.height / 2);
  if (t === "SphereGeometry") return P.radius;
  if (t === "TorusGeometry") return P.tube;
  if (t === "LatheGeometry" && P.points) {
    const ys = P.points.map((q) => q.y);
    return Math.min(Math.max(...P.points.map((q) => q.x)), (Math.max(...ys) - Math.min(...ys)) / 2);
  }
  geo.computeBoundingBox();
  const sz = geo.boundingBox.getSize(new THREE.Vector3());
  return Math.min(sz.x, sz.y, sz.z) / 2;
}
function solidTestOf(geo) {
  const s = geo.userData && geo.userData.shape, P = geo.parameters || {}, t = geo.type;
  const full = (a) => a === undefined || a >= Math.PI * 2 - 1e-6;
  const cyl = (rt, rb, h) => (p) => { const hy = h / 2; if (p.y < -hy || p.y > hy) return false; const r = rb + (rt - rb) * (p.y + hy) / h; return p.x * p.x + p.z * p.z < r * r; };
  if (s && s.kind === "box") return (p) => Math.abs(p.x) < s.w / 2 && Math.abs(p.y) < s.h / 2 && Math.abs(p.z) < s.d / 2;
  if (s && s.kind === "cylinder") return cyl(s.rt, s.rb, s.h);
  if (t === "BoxGeometry") return (p) => Math.abs(p.x) < P.width / 2 && Math.abs(p.y) < P.height / 2 && Math.abs(p.z) < P.depth / 2;
  if (t === "CylinderGeometry" && !P.openEnded && full(P.thetaLength)) return cyl(P.radiusTop, P.radiusBottom, P.height);
  if (t === "ConeGeometry" && !P.openEnded && full(P.thetaLength)) return cyl(0, P.radius, P.height);
  if (t === "SphereGeometry") {
    const r2 = P.radius * P.radius, t0 = P.thetaStart || 0, t1 = t0 + (P.thetaLength === undefined ? Math.PI : P.thetaLength);
    const p0 = P.phiStart || 0, pl = P.phiLength === undefined ? Math.PI * 2 : P.phiLength;
    return (p) => {
      const l2 = p.lengthSq(); if (l2 >= r2) return false;
      const th = Math.acos(Math.max(-1, Math.min(1, p.y / Math.sqrt(l2 || 1e-12))));
      if (th < t0 || th > t1) return false;
      if (pl >= Math.PI * 2 - 1e-6) return true;
      const ph = ((Math.atan2(p.z, -p.x) - p0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return ph <= pl;
    };
  }
  if (t === "TorusGeometry" && full(P.arc)) return (p) => { const q = Math.hypot(p.x, p.y) - P.radius; return q * q + p.z * p.z < P.tube * P.tube; };
  // a lathe is a solid only if it closes on its axis at one end at least (a
  // hull with a nose); an open bell or tube is a thin shell, not a solid
  const latheSolid = t === "LatheGeometry" && full(P.phiLength) && P.points && P.points.length > 1 &&
    Math.min(P.points[0].x, P.points[P.points.length - 1].x) < 0.05 * Math.max(...P.points.map((q) => q.x));
  if (latheSolid) {
    const pts = P.points;
    return (p) => {
      const rr = Math.hypot(p.x, p.z);
      let best = -1;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if ((p.y - a.y) * (p.y - b.y) > 0 || a.y === b.y) continue;
        best = Math.max(best, a.x + (b.x - a.x) * (p.y - a.y) / (b.y - a.y));
      }
      return rr < best;
    };
  }
  if (t === "ExtrudeGeometry" && P.shapes) return extrudeSolid(P).inside;
  return null;
}

function sealJoints(root, seal, detail, style = "fillet") {
  root.updateMatrixWorld(true);
  const unitOf = (o) => { let u = o; while (u && u !== root && !u.userData.dynamic) u = u.parent; return u || root; };
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.blending === THREE.AdditiveBlending || m.transparent || !o.visible) return;
    const inside = solidTest(o.geometry);
    if (!inside) return;
    const box = new THREE.Box3().setFromObject(o);
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    // the mesh's edges (each once), in world space
    const world = new Float32Array(pos.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); world[i * 3] = v.x; world[i * 3 + 1] = v.y; world[i * 3 + 2] = v.z; }
    const edges = [], seen = new Set(), tri = idx ? idx.array : null, nTri = (idx ? idx.count : pos.count) / 3;
    for (let f = 0; f < nTri; f++) for (let e = 0; e < 3; e++) {
      const a = tri ? tri[f * 3 + e] : f * 3 + e, b = tri ? tri[f * 3 + (e + 1) % 3] : f * 3 + (e + 1) % 3;
      const key = a < b ? a * 1e7 + b : b * 1e7 + a;
      if (seen.has(key)) continue; seen.add(key); edges.push(a, b);
    }
    parts.push({ o, mat: m, inside, box, world, edges, unit: unitOf(o), radius: box.getSize(v).length() / 2,
      nMat: new THREE.Matrix3().getNormalMatrix(o.matrixWorld),
      thick: inside.thick * o.matrixWorld.getMaxScaleOnAxis(),
      inv: new THREE.Matrix4().copy(o.matrixWorld).invert() });
  });
  const modelR = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).length() / 2;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), m = new THREE.Vector3(), l = new THREE.Vector3();
  const e0 = new THREE.Vector3(), e1 = new THREE.Vector3(), seg3 = new THREE.Line3(), cp = new THREE.Vector3();
  const step = modelR / 60;                                   // the longest piece of an edge tested at once
  // does the edge pass through the overlap box (not just have an end in it)?
  const ovLine = (box, p0, p1) => box.containsPoint(p0) || box.containsPoint(p1) ||
    box.containsPoint(seg3.set(p0, p1).closestPointToPoint(box.getCenter(cp), true, cp)) || box.distanceToPoint(cp) < 1e-6;
  const isIn = (P, w) => P.inside(l.copy(w).applyMatrix4(P.inv));
  // a part's outward surface normal at a world point (the shape's own, see solidNormalOf)
  const surfaceNormal = (P, w, out) => P.inside.normal(l.copy(w).applyMatrix4(P.inv), out).applyMatrix3(P.nMat).normalize();
  // the strips are seen from both sides (a twist at a corner must not vanish):
  // one double-sided copy per material, shared, so merging still groups them
  const twoSided = new Map();
  const sideOf = (mat) => { if (!twoSided.has(mat)) { const c = mat.clone(); c.side = THREE.DoubleSide; twoSided.set(mat, c); } return twoSided.get(mat); };
  let beads = 0;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const A = parts[i], B = parts[j];
    if (A.unit !== B.unit || !A.box.intersectsBox(B.box)) continue;
    // the meeting line: A's edges through B's solid, and B's through A's
    const pts = [];
    for (const [S, T] of [[A, B], [B, A]]) {
      const ov = S.box.clone().intersect(T.box).expandByScalar(1e-3);
      for (let e = 0; e < S.edges.length; e += 2) {
        e0.fromArray(S.world, S.edges[e] * 3); e1.fromArray(S.world, S.edges[e + 1] * 3);
        if (!ovLine(ov, e0, e1)) continue;
        // a long edge can cross the other surface in its middle with both ends
        // on the same side (a fin's root along a hull): test it in short pieces
        const pieces = Math.max(1, Math.min(64, Math.ceil(e0.distanceTo(e1) / step)));
        let ia = isIn(T, e0);
        for (let q = 0; q < pieces; q++) {
        a.lerpVectors(e0, e1, q / pieces); b.lerpVectors(e0, e1, (q + 1) / pieces);
        const ib = isIn(T, b);
        if (ia === ib) continue;
        const iaWas = ia; ia = ib;
        let lo = 0, hi = 1;                                   // the crossing, by halving
        for (let s = 0; s < 10; s++) { const mid = (lo + hi) / 2; m.lerpVectors(a, b, mid); if (isIn(T, m) === iaWas) lo = mid; else hi = mid; }
        const hit = new THREE.Vector3().lerpVectors(a, b, (lo + hi) / 2);
        // only where the two surfaces meet at an angle: parts that run on
        // into each other (a ring's overlapping segments) need no sealing
        // both surfaces' directions here, from the shapes (the fillet curves from one to the other)
        const na = surfaceNormal(A, hit, new THREE.Vector3()), nb = surfaceNormal(B, hit, new THREE.Vector3());
        if (Math.abs(na.dot(nb)) > 0.82) continue;
        pts.push({ p: hit, na, nb });
        }
      }
    }
    if (pts.length < 3) continue;
    const big = A.radius >= B.radius ? A : B;
    // the bead: a third of the thinner part's thickness (a fine trim gets a
    // fine bead), never more than ~1 % of the model; finer than ~0.03 % of it: none
    const rad = Math.min(seal * 0.35 * Math.min(A.thick, B.thick), seal * 0.012 * modelR);
    if (rad < modelR * 0.0003) continue;
    // merge points closer than a bead's width, chain the rest into curves
    const merged = [];
    for (const p of pts) if (!merged.some((q) => q.p.distanceToSquared(p.p) < rad * rad * 0.25)) merged.push(p);
    if (merged.length < 3) continue;
    const near = merged.map((p) => { let d = Infinity; for (const q of merged) if (q !== p) d = Math.min(d, p.p.distanceTo(q.p)); return d; }).sort((x, y) => x - y);
    const gap = Math.max(near[Math.floor(near.length / 2)] * 3.5, rad * 3);
    const left = merged.slice();
    while (left.length >= 3) {
      const chain = [left.pop()];
      for (const back of [false, true]) for (;;) {             // grow from both ends
        const end = back ? chain[0].p : chain[chain.length - 1].p;
        let bi = -1, bd = gap;
        const ec = back ? chain[0] : chain[chain.length - 1];
        for (let k = 0; k < left.length; k++) {
          if (left[k].na.dot(ec.na) < 0.5 || left[k].nb.dot(ec.nb) < 0.5) continue;
          const d = left[k].p.distanceTo(end); if (d < bd) { bd = d; bi = k; }
        }
        if (bi < 0) break;
        const p = left.splice(bi, 1)[0];
        if (back) chain.unshift(p); else chain.push(p);
      }
      if (chain.length < 3) continue;
      const closed = chain[0].p.distanceTo(chain[chain.length - 1].p) < gap;
      const inv = new THREE.Matrix4().copy(A.unit.matrixWorld).invert();
      const sc = A.unit.matrixWorld.getMaxScaleOnAxis() || 1;
      let geo;
      if (style === "bead") {
        const curve = new THREE.CatmullRomCurve3(chain.map((c) => c.p.clone().applyMatrix4(inv)), closed, "centripetal");
        geo = new THREE.TubeGeometry(curve, Math.min(400, Math.max(8, chain.length * 3)), rad / sc, Math.max(4, Math.round(6 * detail)), closed);
      } else {
        geo = filletGeometry(chain, closed, Math.min(rad * 2.2, 0.5 * Math.min(A.thick, B.thick)), Math.max(2, Math.round(4 * detail)), inv);
        if (!geo) continue;
      }
      const bead = shadowed(new THREE.Mesh(geo, style === "bead" ? big.mat : sideOf(big.mat)));
      bead.userData.seal = true;
      A.unit.add(bead);
      beads++;
    }
  }
  return beads;
}

// A fillet along a chain of meeting points { p, na, nb } (world space; na,
// nb: the two surfaces' outward normals there): at each point a curve from
// w along surface A to w along surface B, bending through the corner (a
// quadratic Bézier with its control point in the corner) — concave, and
// tangent to both surfaces at its edges, so they flow into each other.
// Built in the frame `inv` takes world points to. null if it degenerates.
function filletGeometry(chain, closed, w, steps, inv) {
  const n = chain.length;
  // smooth the line and the normals a little (the points come from mesh edges)
  const sm = chain.map((c, i) => {
    const a = chain[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = chain[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return { p: c.p.clone().multiplyScalar(2).add(a.p).add(b.p).multiplyScalar(0.25),
      na: c.na.clone().multiplyScalar(2).add(a.na).add(b.na).normalize(), nb: c.nb.clone().multiplyScalar(2).add(a.nb).add(b.nb).normalize() };
  });
  const rows = steps + 1, pos = [], nor = [], uv = [], idx = [];
  const dA = new THREE.Vector3(), dB = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), lift = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(inv);
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const { p, na, nb } = sm[i];
    // along A, away from B (B's outward normal, flattened onto A) — and the other way round
    dA.copy(nb).addScaledVector(na, -nb.dot(na)); dB.copy(na).addScaledVector(nb, -na.dot(nb));
    if (dA.lengthSq() < 1e-8 || dB.lengthSq() < 1e-8) { dA.set(0, 0, 0); dB.set(0, 0, 0); } else { dA.normalize(); dB.normalize(); ok++; }
    lift.copy(na).add(nb).normalize().multiplyScalar(w * 0.015);   // a hair off the surfaces: no z-fighting at its edges
    for (let j = 0; j < rows; j++) {
      const s = j / steps, k0 = (1 - s) * (1 - s), k2 = s * s;
      q.copy(p).addScaledVector(dA, w * k0).addScaledVector(dB, w * k2).add(lift).applyMatrix4(inv);
      nn.copy(na).multiplyScalar(1 - s).addScaledVector(nb, s).normalize().applyMatrix3(nm).normalize();
      pos.push(q.x, q.y, q.z); nor.push(nn.x, nn.y, nn.z); uv.push(i / (n - 1), s);
    }
  }
  if (ok < 3) return null;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a0 = i * rows, b0 = ((i + 1) % n) * rows;
    for (let j = 0; j < steps; j++) idx.push(a0 + j, b0 + j, a0 + j + 1, b0 + j, b0 + j + 1, a0 + j + 1);
  }
  // face the strip the way its normals point: a vote of all its triangles
  // (one could be degenerate)
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
  let vote = 0;
  for (let t = 0; t < idx.length; t += 3) {
    v0.fromArray(pos, idx[t] * 3); v1.fromArray(pos, idx[t + 1] * 3).sub(v0); v2.fromArray(pos, idx[t + 2] * 3).sub(v0);
    vote += fn.crossVectors(v1, v2).dot(vn.fromArray(nor, idx[t] * 3));
  }
  if (vote < 0) for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export { _Box, _Cyl, roundedBoxGeometry, roundedCylinderGeometry, withRounding, extrudeSolid, solidTest, solidNormalOf, thicknessOf, solidTestOf, sealJoints, filletGeometry };

// Lofted hull: cross-sections along the length, each a superellipse below the waterline (fine V forward,
// full round-bilge midships) continued by a flared side up to the deck edge, with a raked stem, sheer and an
// optional forecastle break. Units are metres; z = 0 at midships, +z = bow; y = 0 is the waterline; x across.
// The ship file supplies the lines as functions of z, so the same loft serves any hull.
import * as THREE from '../../vendor/three.module.js';

/*
 lines = {
   zStern, zBow,              // overall ends (deck level)
   hw(z),  hd(z),             // half-breadth at the waterline / at the deck edge
   T(z),                      // keel depth below the waterline (0 where the keel has risen to the waterline)
   n(z),                      // section fullness exponent (≈1.6 sharp V … 4 boxy)
   deck(z),                   // deck-edge height above the waterline (steps at a forecastle break)
   rake(y),                   // extra forward shift of the stem at height y (clipper bow), applied near the bow
   sternRake(y),              // aft shift at height y near the stern (overhang)
 }
*/
export function loftHull(lines, opt = {}) {
  const det = opt.detail ?? 1;
  const nSide = Math.max(8, Math.round(14 * det));          // points per half-section below the deck edge
  const zs = stations(lines, det);
  const pos = [], uv = [], idx = [];
  const ring = [];                                            // per station: array of [x,y,z] from port deck edge → keel → starboard deck edge
  for (const z of zs) ring.push(section(lines, z, nSide));
  const per = ring[0].length;
  for (let s = 0; s < zs.length; s++) {
    for (let i = 0; i < per; i++) {
      const p = ring[s][i];
      pos.push(p[0], p[1], p[2]);
      uv.push(p[2] / 8, p[1] / 4 + (p[0] < 0 ? 0 : 0.5));
    }
  }
  for (let s = 0; s < zs.length - 1; s++) {
    for (let i = 0; i < per - 1; i++) {
      const a = s * per + i, b = a + 1, c = a + per, d = c + 1;
      idx.push(a, b, c, b, d, c);                            // counter-clockwise seen from outside: normals point out
    }
  }
  // transom: close the aft-most ring with a fan
  const t0 = pos.length / 3;
  const st = ring[0];
  let cx = 0, cy = 0, cz = 0;
  st.forEach((p) => { cx += p[0]; cy += p[1]; cz += p[2]; });
  pos.push(cx / per, cy / per, cz / per); uv.push(0, 0);
  for (let i = 0; i < per - 1; i++) idx.push(t0, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geometry: g, rings: ring, zs };
}

// Station positions: denser near the ends (shape changes fast there) and on both sides of a deck step.
function stations(L, det) {
  const out = [];
  const n = Math.round(110 * det);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const w = u < 0.5 ? 0.5 * Math.pow(2 * u, 1.25) : 1 - 0.5 * Math.pow(2 * (1 - u), 1.25);
    out.push(L.zStern + (L.zBow - L.zStern) * w);
  }
  for (const zb of L.breaks || []) out.push(zb - 0.03, zb + 0.03);
  return [...new Set(out.map((z) => +z.toFixed(4)))].sort((a, b) => a - b);
}

// One cross-section from the port deck edge down to the keel and up to the starboard deck edge.
function section(L, z, nSide) {
  const hw = Math.max(0, L.hw(z)), hd = Math.max(0.001, L.hd(z)), T = Math.max(0, L.T(z)), n = L.n(z), yd = L.deck(z);
  const half = [];
  // below water: superellipse from the keel (phi = 0) to the waterline (phi = 90°)
  const nb = Math.ceil(nSide * 0.6);
  for (let i = 0; i <= nb; i++) {
    const ph = (i / nb) * Math.PI / 2;
    const s = Math.sin(ph), c = Math.cos(ph);
    const x = Math.max(hw, 0.02) * Math.pow(s, 2 / n) * (T > 0 ? 1 : 0.0) + (T > 0 ? 0 : Math.max(hw, 0.02) * s);
    const y = -T * Math.pow(c, 2 / n);
    half.push([x, y]);
  }
  // above water: flare from (hw, 0) to (hd, yd), slightly concave forward (flared bow), straight amidships
  const na = Math.ceil(nSide * 0.4);
  const flare = L.flare ? L.flare(z) : 0;
  for (let i = 1; i <= na; i++) {
    const u = i / na;
    const x = hw + (hd - hw) * (u + flare * u * (1 - u));
    half.push([x, yd * u]);
  }
  const pts = [];
  // port side: deck edge → keel (x negative), then starboard keel → deck edge
  for (let i = half.length - 1; i >= 0; i--) pts.push(point(L, -half[i][0], half[i][1], z, yd));
  for (let i = 1; i < half.length; i++) pts.push(point(L, half[i][0], half[i][1], z, yd));
  return pts;
}

// Rake of the stem / stern overhang: points shift along z with height near the ends.
function point(L, x, y, z, yd) {
  let zz = z;
  const span = L.zBow - L.zStern;
  const fwd = smooth((z - (L.zBow - span * 0.08)) / (span * 0.08));
  const aft = smooth(((L.zStern + span * 0.04) - z) / (span * 0.04));
  if (L.rake) zz += L.rake(y) * fwd;
  if (L.sternRake) zz -= L.sternRake(y) * aft;
  return [x, y, zz];
}
const smooth = (u) => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };

// Deck surfaces between the deck-edge points of consecutive stations (camber: centre raised by `camber`).
// regions: [[z0, z1], ...] in station z; returns one geometry.
export function deckSurface(hull, lines, regions, camber = 0.12) {
  const pos = [], uv = [], idx = [];
  const { rings, zs } = hull;
  for (const [z0, z1] of regions) {
    const sel = [];
    for (let s = 0; s < zs.length; s++) if (zs[s] >= z0 - 1e-3 && zs[s] <= z1 + 1e-3) sel.push(s);
    const base = pos.length / 3;
    const across = 6;
    for (const s of sel) {
      const r = rings[s], pL = r[0], pR = r[r.length - 1];
      for (let k = 0; k <= across; k++) {
        const u = k / across;
        const x = pL[0] + (pR[0] - pL[0]) * u, zz = pL[2] + (pR[2] - pL[2]) * u;
        const y = pL[1] + camber * Math.sin(u * Math.PI) * Math.min(1, Math.abs(pR[0] - pL[0]) / 6);
        pos.push(x, y + 0.005, zz); uv.push(x / 2, zz / 2);
      }
    }
    for (let a = 0; a < sel.length - 1; a++) for (let k = 0; k < across; k++) {
      const i0 = base + a * (across + 1) + k, i1 = i0 + 1, j0 = i0 + across + 1, j1 = j0 + 1;
      idx.push(i0, j0, i1, i1, j0, j1);                      // normals up
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Half-breadth of the hull side at station z and height y (for placing portholes, rails, fittings).
export function sideAt(lines, z, y) {
  const hw = lines.hw(z), hd = lines.hd(z), yd = lines.deck(z);
  if (y <= 0) return hw;
  const u = Math.min(1, y / yd), f = lines.flare ? lines.flare(z) : 0;
  return hw + (hd - hw) * (u + f * u * (1 - u));
}

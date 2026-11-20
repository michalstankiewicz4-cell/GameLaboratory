// CityKit — obrys budynku: dowolny wielokąt w płaszczyźnie (x, z), metry, przeciwnie do ruchu wskazówek zegara
// (pole ze znakiem > 0 we wzorze Σ x_i·z_{i+1} − x_{i+1}·z_i). Normalna ściany na zewnątrz krawędzi (dx, dz) — (dz, −dx).
// Gotowe kształty (prostokąt, L, U, narożnik ze ściętym rogiem) i własny (punkty narysowane w laboratorium albo
// z mapy, np. obrys OSM). Pomocnicze: pole, orientacja, środek, odsunięcie do środka (dachy kopertowe), podział
// na trójkąty (dach płaski, strop).
import * as THREE from '../../../vendor/three/three.module.js';

export const FOOTPRINTS = {
  rect: { label: 'Rectangle', labelPl: 'Prostokąt' },
  L: { label: 'L shape', labelPl: 'Kształt L' },
  U: { label: 'U shape', labelPl: 'Kształt U' },
  corner: { label: 'Street corner (cut corner)', labelPl: 'Narożnik (ścięty róg)' },
  custom: { label: 'Own outline (drawn)', labelPl: 'Własny obrys (rysowany)' },
};

export function signedArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
const eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3;

/** Obrys poprawiony: bez powtórzonych punktów i krawędzi zerowych, przeciwnie do wskazówek, wyśrodkowany (środek
 *  prostokąta otaczającego w 0, 0). Za mało punktów — null. */
export function cleanPolygon(pts0, { center = true, minArea = 1 } = {}) {
  let p = (pts0 || []).map((q) => [+q[0], +q[1]]).filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]));
  p = p.filter((q, i) => !eq(q, p[(i + 1) % p.length]));
  // punkty na jednej prostej z sąsiadami — zbędne (krawędź byłaby podzielona)
  p = p.filter((q, i) => {
    const a = p[(i - 1 + p.length) % p.length], b = p[(i + 1) % p.length];
    return Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) > 1e-4;
  });
  if (p.length < 3 || Math.abs(signedArea(p)) < minArea) return null;
  if (signedArea(p) < 0) p.reverse();
  if (center) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    p = p.map(([x, z]) => [x - cx, z - cz]);
  }
  return p;
}

/** Punkty obrysu z opisu { shape, w, d, arm, cut, points } (krawędź 0 — od (0, 0) wzdłuż +x, ściana na −z). */
export function footprintPoints(f = {}) {
  const w = Math.max(4, +f.w || 12), d = Math.max(4, +f.d || 10);
  const arm = Math.min(Math.max(3, +f.arm || Math.min(w, d) * 0.4), Math.min(w, d) - 1), cut = Math.min(Math.max(1, +f.cut || 4), Math.min(w, d) - 2);
  let p;
  switch (f.shape) {
    case 'L': p = [[0, 0], [w, 0], [w, arm], [arm, arm], [arm, d], [0, d]]; break;
    case 'U': p = [[0, 0], [w, 0], [w, d], [w - arm, d], [w - arm, arm], [arm, arm], [arm, d], [0, d]]; break;
    case 'corner': p = [[0, 0], [w, 0], [w, d - cut], [w - cut, d], [0, d]]; break;
    case 'custom':
      if (f.fixed && f.points && f.points.length >= 3) { const q = cleanPolygon(f.points, { center: false, minArea: 0.05 }); if (q) return q; }   // obrys w swoim miejscu
      p = f.points && f.points.length >= 3 ? f.points : [[0, 0], [w, 0], [w, d], [0, d]]; break;
    default: p = [[0, 0], [w, 0], [w, d], [0, d]];
  }
  // osie: z w obrysie rośnie „w głąb” budynku od frontu; w świecie front (krawędź 0) patrzy na −z
  return cleanPolygon(p) || cleanPolygon([[0, 0], [w, 0], [w, d], [0, d]]);
}

/** Dziedzińce obrysu (fixed): pierścienie zgodnie z ruchem wskazówek zegara — normalne ich ścian patrzą w dziedziniec. */
export function holesOf(f = {}) {
  if (!f.fixed || !Array.isArray(f.holes)) return [];
  return f.holes.map((h) => cleanPolygon(h, { center: false, minArea: 0.05 })).filter(Boolean).map((h) => h.slice().reverse());
}
/** Środek ciężkości wielokąta (dachy spiczaste). */
export function centroidOf(p) {
  let A = 0, x = 0, z = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], k = a[0] * b[1] - b[0] * a[1]; A += k; x += (a[0] + b[0]) * k; z += (a[1] + b[1]) * k; }
  return Math.abs(A) < 1e-9 ? p[0] : [x / (3 * A), z / (3 * A)];
}
/** Krawędzie obrysu: a, b, długość, kierunek, normalna na zewnątrz. */
export function edgesOf(p) {
  return p.map((a, i) => {
    const b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    return { i, a, b, len, dir: [dx / len, dz / len], nrm: [dz / len, -dx / len] };
  });
}

/** Obrys odsunięty do środka o r (każda krawędź równolegle; wierzchołki — przecięcia sąsiednich prostych).
 *  null, gdy odsunięcie odwraca którąś krawędź (za duże). */
export function insetPolygon(p, r) {
  const E = edgesOf(p), n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    const e0 = E[(i - 1 + n) % n], e1 = E[i];
    // prosta e: punkt a − nrm·r, kierunek dir
    const p0 = [e0.a[0] - e0.nrm[0] * r, e0.a[1] - e0.nrm[1] * r], p1 = [e1.a[0] - e1.nrm[0] * r, e1.a[1] - e1.nrm[1] * r];
    const den = e0.dir[0] * e1.dir[1] - e0.dir[1] * e1.dir[0];
    if (Math.abs(den) < 1e-6) { out.push(p1); continue; }
    const t = ((p1[0] - p0[0]) * e1.dir[1] - (p1[1] - p0[1]) * e1.dir[0]) / den;
    out.push([p0[0] + e0.dir[0] * t, p0[1] + e0.dir[1] * t]);
  }
  for (let i = 0; i < n; i++) {
    const a = out[i], b = out[(i + 1) % n], e = E[i];
    if ((b[0] - a[0]) * e.dir[0] + (b[1] - a[1]) * e.dir[1] < -1e-4) return null;
  }
  return signedArea(out) > -1e-6 ? out : null;
}
/** Największe odsunięcie do środka, które nie odwraca krawędzi (do limit). */
export function maxInset(p, limit = 1e3) {
  let lo = 0, hi = limit;
  if (insetPolygon(p, hi)) return hi;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (insetPolygon(p, m)) lo = m; else hi = m; }
  return lo;
}
/** Trójkąty wielokąta (indeksy w [...p, ...dziedzińce]). */
export function triangulate(p, holes = []) {
  const v = (r) => r.map(([x, z]) => new THREE.Vector2(x, z));
  return THREE.ShapeUtils.triangulateShape(v(p), holes.map(v)).flat();
}
/** Czy obrys to prostokąt (4 wierzchołki, kąty proste) — dach dwuspadowy. */
export function isRect(p) {
  if (p.length !== 4) return false;
  const E = edgesOf(p);
  return E.every((e, i) => Math.abs(e.dir[0] * E[(i + 1) % 4].dir[0] + e.dir[1] * E[(i + 1) % 4].dir[1]) < 0.02);
}

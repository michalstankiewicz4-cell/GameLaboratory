// Promienie światła (dziedzina „światło”): odbicie od powierzchni sferycznej albo płaskiej (OptiKit, js/models/mech/optics.js).
// Prawo odbicia w wektorach: d' = d − 2 (d·n) n; punkt trafienia — przecięcie promienia z czaszą (|p − C| = |R|, C na osi
// lustra w odległości R od wierzchołka) ograniczoną średnicą D. Natężenie po odbiciu × współczynnik odbicia powłoki R(λ).
// Bez założeń przyosiowych: aberracja sferyczna i astygmatyzm wychodzą same z geometrii.
import * as THREE from '../../../../vendor/three/three.module.js';

const _m = new THREE.Matrix4(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
// promień { o, d (jednostkowy), I } w układzie odniesienia (np. grupy przedmiotu); frame — macierz układu lustra w tym samym
// układzie (wierzchołek w 0, oś +z); zwraca { p, n, d, I } w układzie odniesienia albo null (chybia lustro / od tyłu)
export function reflect(ray, optics, frame, nm = 633) {
  _m.copy(frame).invert();
  const o = _o.copy(ray.o).applyMatrix4(_m), d = _d.copy(ray.d).transformDirection(_m);
  const R = optics.R, r = optics.D / 2;
  let p, n;
  if (!Number.isFinite(R)) {
    if (d.z >= 0) return null; const t = -o.z / d.z; if (t <= 0) return null;
    p = o.clone().addScaledVector(d, t); n = new THREE.Vector3(0, 0, 1);
  } else {
    const C = new THREE.Vector3(0, 0, R), oc = o.clone().sub(C), b = oc.dot(d), c = oc.lengthSq() - R * R, disc = b * b - c;
    if (disc < 0) return null;
    const ts = [-b - Math.sqrt(disc), -b + Math.sqrt(disc)].filter((t) => t > 1e-9);
    const hits = ts.map((t) => o.clone().addScaledVector(d, t)).filter((q) => Math.abs(q.z) < Math.abs(R) * 0.5);   // czasza przy wierzchołku, nie druga strona sfery
    if (!hits.length) return null;
    p = hits[0]; n = C.clone().sub(p).multiplyScalar(Math.sign(R) / Math.abs(R));   // normalna w stronę +z (przód lustra)
  }
  if (Math.hypot(p.x, p.y) > r || d.dot(n) >= 0) return null;
  const d2 = d.clone().addScaledVector(n, -2 * d.dot(n));
  return { p: p.applyMatrix4(frame), n: n.transformDirection(frame), d: d2.transformDirection(frame).normalize(), I: (ray.I ?? 1) * optics.refl(nm) };
}
// punkt najbliższego zbliżenia dwóch prostych o1 + s·d1, o2 + t·d2 → { s, t, gap } (gap — odległość prostych)
export function closest(o1, d1, o2, d2) {
  const w = o1.clone().sub(o2), a = d1.dot(d1), b = d1.dot(d2), c = d2.dot(d2), d = d1.dot(w), e = d2.dot(w), den = a * c - b * b;
  if (Math.abs(den) < 1e-12) return null;
  const s = (b * e - c * d) / den, t = (a * e - b * d) / den;
  return { s, t, gap: o1.clone().addScaledVector(d1, s).distanceTo(o2.clone().addScaledVector(d2, t)) };
}
// długość fali → kolor wiązki (przybliżenie widma, sRGB)
export function waveColor(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else { r = 1; }
  return new THREE.Color(r, g, b);
}

// Śledzenie promieni (dziedzina „światło”, etap 5): optyka geometryczna bez przybliżeń przyosiowych.
//   szkła: GLASS — wzór Sellmeiera n(λ) (N-BK7, F2, N-SF11, krzemionka topiona, PMMA) — rozszczepienie wychodzi samo
//   powierzchnie (w układzie świata): sfera (czasza z aperturą) albo płaszczyzna (wielokąt / koło), z rodzajem oddziaływania:
//     'refract' — granica powietrze / szkło: prawo Snella w wektorach, Fresnel (średnia s i p) dzieli energię na odbitą
//                 i przechodzącą (śledzimy silniejszą, słabszą — jeśli > próg), całkowite wewnętrzne odbicie
//     'mirror' — odbicie z R(λ), 'absorb' — pochłania (oprawy), 'detect' — pochłania i zapisuje trafienie (fotodioda, ekran)
//   trace(scene, ray) → { path: [[p0, p1, I, nm], …], hits: [{ det, p, I, nm }] }
// Normalna powierzchni 'refract' wskazuje na zewnątrz szkła (do powietrza).
import * as THREE from '../../../../vendor/three/three.module.js';
export const ENV = ['land', 'water', 'space'];

// współczynniki Sellmeiera (λ w µm): n² − 1 = Σ Bᵢ λ² / (λ² − Cᵢ)
export const GLASS = {
  bk7: { name: 'N-BK7 (koronowe)', B: [1.03961212, 0.231792344, 1.01046945], C: [0.00600069867, 0.0200179144, 103.560653], rho: 2510 },
  f2: { name: 'F2 (flint)', B: [1.34533359, 0.209073176, 0.937357162], C: [0.00997743871, 0.0470450767, 111.886764], rho: 3600 },
  sf11: { name: 'N-SF11 (ciężki flint)', B: [1.73759695, 0.313747346, 1.89878101], C: [0.013188707, 0.0623068142, 155.23629], rho: 4740 },
  fs: { name: 'krzemionka topiona (UVFS)', B: [0.6961663, 0.4079426, 0.8974794], C: [0.0046791, 0.0135121, 97.934], rho: 2200 },
  pmma: { name: 'PMMA (akryl)', B: [1.1819, 0, 0], C: [0.011313, 0, 0], rho: 1190 },
};
export function nGlass(g, nm) { const G = typeof g === 'string' ? GLASS[g] : g, l2 = (nm / 1000) ** 2; let s = 1; for (let i = 0; i < 3; i++) s += G.B[i] * l2 / (l2 - G.C[i]); return Math.sqrt(s); }
export const abbe = (g) => (nGlass(g, 587.6) - 1) / (nGlass(g, 486.1) - nGlass(g, 656.3));   // liczba Abbego (dyspersja)
// odbicie Fresnela (światło niespolaryzowane) przy przejściu n1 → n2, cos kąta padania ci
export function fresnel(n1, n2, ci) {
  const s2 = (n1 / n2) ** 2 * (1 - ci * ci); if (s2 >= 1) return 1;
  const ct = Math.sqrt(1 - s2), rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2, rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
  return (rs + rp) / 2;
}

/* ---------------- powierzchnie ---------------- */
// sfera: wierzchołek V, oś a (jednostkowa, od wierzchołka do środka krzywizny dla R > 0), promień R, apertura r
export function sphereSurf({ V, a, R, r, kind = 'refract', glass, outward = 1, refl, det, name }) {
  const C = V.clone().addScaledVector(a, R);
  return { kind, glass, refl, det, name, isect(o, d) {
    if (!Number.isFinite(R)) return planeIsect(o, d, V, a, (p) => p.clone().sub(V).addScaledVector(a, -p.clone().sub(V).dot(a)).length() <= r, outward);
    const oc = o.clone().sub(C), b = oc.dot(d), c = oc.lengthSq() - R * R, disc = b * b - c; if (disc < 0) return null;
    let best = null;
    for (const t of [-b - Math.sqrt(disc), -b + Math.sqrt(disc)]) {
      if (t <= 1e-7) continue; const p = o.clone().addScaledVector(d, t), q = p.clone().sub(V);
      if (q.dot(a) * Math.sign(R) > Math.abs(R) * 0.5) continue;               // tylko czasza przy wierzchołku
      if (q.addScaledVector(a, -q.dot(a)).length() > r) continue;
      best = { t, p, n: p.clone().sub(C).multiplyScalar(outward / R) }; break;   // normalna na zewnątrz (do powietrza): (p − C) / R
    }
    return best;
  } };
}
function planeIsect(o, d, P0, nrm, inside, outward = 1) {
  const n = nrm.clone().multiplyScalar(-outward), den = d.dot(n); if (Math.abs(den) < 1e-12) return null;
  const t = P0.clone().sub(o).dot(n) / den; if (t <= 1e-7) return null;
  const p = o.clone().addScaledVector(d, t); if (!inside(p)) return null;
  return { t, p, n };
}
// płaszczyzna wielokąta (wierzchołki w świecie, płaskie), normalna n (na zewnątrz)
export function polySurf({ pts, n, kind = 'refract', glass, refl, det, name }) {
  const P0 = pts[0], u = pts[1].clone().sub(P0).normalize(), v = n.clone().cross(u).normalize(), poly = pts.map((p) => [p.clone().sub(P0).dot(u), p.clone().sub(P0).dot(v)]);
  const inPoly = (p) => { const x = p.clone().sub(P0).dot(u), y = p.clone().sub(P0).dot(v); let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  return { kind, glass, refl, det, name, isect: (o, d) => planeIsect(o, d, P0, n.clone().negate(), inPoly) };
}
// koło (fotodioda, ekran, przesłona): środek c, normalna n (w stronę światła), promień r
export function discSurf({ c, n, r, kind = 'detect', det, name, square = false }) {
  return { kind, det, name, isect: (o, d) => planeIsect(o, d, c, n.clone().negate(), (p) => { const q = p.clone().sub(c); if (!square) return q.length() <= r; const ax = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), u = ax.clone().cross(n).normalize(), v = n.clone().cross(u); return Math.abs(q.dot(u)) <= r && Math.abs(q.dot(v)) <= r; }) };
}

/* ---------------- śledzenie ---------------- */
export function trace(surfs, { o, d, I = 1, nm = 633 }, { maxBounce = 14, minI = 0.02, maxLen = 0.6 } = {}) {
  const path = [], hits = [], stack = [{ o: o.clone(), d: d.clone().normalize(), I, n: 1, depth: 0 }];
  while (stack.length) {
    const r = stack.pop(); if (r.I < minI || r.depth > maxBounce) continue;
    let best = null, bs = null;
    for (const s of surfs) { const h = s.isect(r.o, r.d); if (h && (!best || h.t < best.t)) { best = h; bs = s; } }
    if (!best) { path.push([r.o, r.o.clone().addScaledVector(r.d, maxLen), r.I, nm]); continue; }
    path.push([r.o, best.p, r.I, nm]);
    const p = best.p, nOut = best.n.clone().normalize();
    if (bs.kind === 'absorb') continue;
    if (bs.kind === 'detect') { hits.push({ det: bs.det, p, I: r.I, nm, d: r.d.clone() }); continue; }
    if (bs.kind === 'mirror') { const nn = r.d.dot(nOut) < 0 ? nOut : nOut.negate(); stack.push({ o: p, d: r.d.clone().addScaledVector(nn, -2 * r.d.dot(nn)), I: r.I * (bs.refl ? bs.refl(nm) : 0.95), n: r.n, depth: r.depth + 1 }); continue; }
    // załamanie: wchodzimy do szkła, gdy promień idzie przeciw normalnej zewnętrznej
    const entering = r.d.dot(nOut) < 0, ng = nGlass(bs.glass || 'bk7', nm), n1 = entering ? 1 : ng, n2 = entering ? ng : 1, N = entering ? nOut : nOut.clone().negate();
    const ci = -r.d.dot(N), eta = n1 / n2, k = 1 - eta * eta * (1 - ci * ci), Rf = fresnel(n1, n2, ci);
    const refl = r.d.clone().addScaledVector(N, 2 * ci);
    if (k < 0) { stack.push({ o: p, d: refl, I: r.I, n: n1, depth: r.depth + 1 }); continue; }   // całkowite wewnętrzne odbicie
    const tr = r.d.clone().multiplyScalar(eta).addScaledVector(N, eta * ci - Math.sqrt(k)).normalize();
    stack.push({ o: p, d: tr, I: r.I * (1 - Rf), n: n2, depth: r.depth + 1 });
    if (r.I * Rf >= minI) stack.push({ o: p, d: refl, I: r.I * Rf, n: n1, depth: r.depth + 1 });
  }
  return { path, hits };
}
// czułość widmowa krzemowej fotodiody [A/W] (typowa: szczyt ok. 0,62 A/W przy 940 nm)
const SI_R = [[320, 0], [350, 0.1], [400, 0.2], [450, 0.27], [500, 0.31], [550, 0.35], [600, 0.39], [650, 0.43], [700, 0.47], [800, 0.55], [900, 0.6], [960, 0.62], [1000, 0.56], [1050, 0.36], [1100, 0.1], [1150, 0]];
export function siResponsivity(nm) { if (nm <= SI_R[0][0] || nm >= SI_R[SI_R.length - 1][0]) return 0; for (let i = 1; i < SI_R.length; i++) if (nm <= SI_R[i][0]) { const [a, ra] = SI_R[i - 1], [b, rb] = SI_R[i]; return ra + (rb - ra) * (nm - a) / (b - a); } return 0; }
// długości fal „białego” LED (luminofor + niebieski chip) z wagami mocy
export const WHITE_LED = [[450, 0.9], [470, 0.45], [500, 0.35], [530, 0.6], [560, 0.85], [590, 0.8], [620, 0.6], [650, 0.35], [680, 0.15]];

/* ---------------- scena z modeli OptiKit ---------------- */
// opis powierzchni (z userData.optics.describe() albo detektora) → powierzchnia do trace
export function fromDesc(d) {
  if (d.type === 'sphere') return sphereSurf(d);
  if (d.type === 'poly') return polySurf(d);
  return discSurf(d);
}
// powierzchnie wszystkich elementów: soczewki i pryzmaty (describe), lustra (powierzchnia OptiKit), odbiorniki (detector)
export function sceneOf(objs) {
  const out = [];
  for (const o of objs) {
    const u = o.userData; o.updateMatrixWorld(true);
    if (u.optics && u.optics.describe) out.push(...u.optics.describe().map(fromDesc));
    else if (u.optics && u.optics.kind === 'mirror') { const s = u.optics.surface, V = new THREE.Vector3().setFromMatrixPosition(s.matrixWorld), a = new THREE.Vector3(0, 0, 1).transformDirection(s.matrixWorld); out.push(sphereSurf({ V, a, R: u.optics.R, r: u.optics.D / 2, kind: 'mirror', refl: u.optics.refl })); }
    if (u.detector) { const D = u.detector; out.push(discSurf({ c: D.center(), n: D.normal(), r: D.half, square: D.square, kind: 'detect', det: o })); }
  }
  return out;
}
// wiązka źródła jako zbiór promieni z wagami mocy: laser — przekrój gaussowski (pierścienie), LED — wstęga szczeliny × widmo
export function raysOf(em, { rings = 2, perRing = 6 } = {}) {
  const o = em.origin(), d = em.dir(), up = em.up ? em.up() : new THREE.Vector3(0, 1, 0), side = d.clone().cross(up).normalize(), u2 = side.clone().cross(d).normalize(), rays = [];
  if (em.kind === 'laser') {
    const pts = [[0, 0, 1]]; for (let k = 1; k <= rings; k++) for (let i = 0; i < perRing * k; i++) { const r = em.w0 * k / rings, a = i / (perRing * k) * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r, Math.exp(-2 * (k / rings) ** 2)]); }
    const sw = pts.reduce((s, p) => s + p[2], 0);
    for (const [x, y, w] of pts) rays.push({ o: o.clone().addScaledVector(side, x).addScaledVector(u2, y), d: d.clone().addScaledVector(side, x / em.w0 * em.div).addScaledVector(u2, y / em.w0 * em.div).normalize(), I: w / sw, P: em.P * w / sw, nm: em.nm });
  } else {
    const spec = em.white ? WHITE_LED : [[em.nm, 1]], sw = spec.reduce((s, q) => s + q[1], 0) * 3;
    for (const [nm, w] of spec) for (const y of [-0.0025, 0, 0.0025]) rays.push({ o: o.clone().addScaledVector(u2, y), d: d.clone(), I: w / sw * 4, P: em.P * w / sw, nm });   // I — udział w jasności rysowanej wiązki
  }
  return rays;
}
// pełne śledzenie: promienie wszystkich źródeł → odcinki (do rysowania) i moc na każdym detektorze
export function simulate(surfs, emitters) {
  const segs = [], power = new Map(), spots = [];
  for (const em of emitters) for (const r of raysOf(em)) {
    const res = trace(surfs, { ...r, I: 1 }, { minI: 0.03 });   // natężenie względne (1 → straty Fresnela); moc promienia r.P
    for (const s of res.path) segs.push({ a: s[0], b: s[1], I: s[2] * r.I, nm: s[3] });   // wiązka z wielu promieni — jasności się sumują (mieszanie addytywne)
    for (const h of res.hits) { const D = h.det.userData.detector, ci = D ? Math.abs(h.d.dot(D.normal())) : 1, win = D && D.kind === 'photodiode' ? 1 - fresnel(1, 1.5, ci) : 1;   // okienko fotodiody odbija ok. 4 %
      power.set(h.det, (power.get(h.det) || 0) + r.P * h.I * win); spots.push({ det: h.det, p: h.p, I: h.I * r.I, nm: h.nm, d: h.d }); }
  }
  return { segs, power, spots };
}

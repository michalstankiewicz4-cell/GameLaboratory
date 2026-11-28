// MechKit — zarysy i bryły zderzeń zębów: involuteOutline, toothHulls, convexParts (części wypukłe), ringHulls
// (uzębienie wewnętrzne), sprocketOutline / sprocketHulls (koło łańcuchowe wg ISO 606).
import * as THREE from '../../../vendor/three/three.module.js';
import { ALPHA, TAU } from './base.js';

/* ---------------- zarys ewolwentowy ---------------- */
// punkty zarysu koła o z zębach, moduł m (wysokość głowy add·m, stopy ded·m); ząb 0 na kącie 0
export function involuteOutline(z, m, { add = 1, ded = 1.25, steps = 7, backlash = 0.04, alpha = ALPHA } = {}) {
  const ALPHA_ = alpha, rp = m * z / 2, rb = rp * Math.cos(ALPHA_), ra = rp + add * m, rf = rp - ded * m;
  const inv = Math.tan(ALPHA_) - ALPHA_, half = Math.PI / (2 * z) - backlash / z + inv;   // połowa grubości zęba na kole zasadniczym (kąt)
  const tMax = Math.sqrt(Math.max(0, (ra / rb) ** 2 - 1)), tMin = rf > rb ? Math.sqrt((rf / rb) ** 2 - 1) : 0;
  const th = (t) => t - Math.atan(t), pts = [], P = (r, a) => pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
  for (let i = 0; i < z; i++) {
    const c = i * TAU / z;
    P(rf, c - Math.PI / z);                                 // środek wrębu
    if (rf < rb) P(rf, c - half);                           // stopa — promieniście do koła zasadniczego
    for (let k = 0; k <= steps; k++) { const t = tMin + (tMax - tMin) * k / steps; P(rb * Math.sqrt(1 + t * t), c - half + th(t)); }
    const tipA = half - th(tMax);
    if (tipA > 0) P(ra, c);
    for (let k = steps; k >= 0; k--) { const t = tMin + (tMax - tMin) * k / steps; P(rb * Math.sqrt(1 + t * t), c + half - th(t)); }
    if (rf < rb) P(rf, c + half);
  }
  return { pts, rp, ra, rf, rb };
}

// bryły zderzeń zębów: każdy ząb to wielokąt wypukły — zarys od stopy do głowy, zamknięty cięciwą na kole stóp
// (ten sam zarys co model, więc bryła = ząb); punkty [x, y] w płaszczyźnie koła (lokalne y, z części wirującej)
export function toothHulls(z, m, { alpha = ALPHA, backlash = 0.04 } = {}) {
  const o = involuteOutline(z, m, { alpha, backlash }), n = o.pts.length / z, out = [];
  for (let i = 0; i < z; i++) out.push(o.pts.slice(i * n + 1, (i + 1) * n).map((p) => [p.x, p.y]));
  return out;
}

// podział wielokąta prostego na wypukłe (strzyżenie uszu + scalanie Hertela–Mehlhorna) — bryły zderzeń zębów,
// których zarys nie jest wypukły (koło łańcuchowe, zęby wewnętrzne koła koronowego); punkty [x, y]
export function convexParts(poly) {
  let P = poly.slice(); const area = P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (area < 0) P.reverse();
  const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  const inTri = (p, a, b, c) => cr(a, b, p) > 0 && cr(b, c, p) > 0 && cr(c, a, p) > 0;
  const idx = P.map((_, i) => i), tris = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      if (cr(P[i0], P[i1], P[i2]) <= 1e-18) continue;
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inTri(P[j], P[i0], P[i1], P[i2]))) continue;
      tris.push([i0, i1, i2]); idx.splice(k, 1); cut = true; break;
    }
    if (!cut) { const k = idx.findIndex((_, k) => cr(P[idx[(k + idx.length - 1) % idx.length]], P[idx[k]], P[idx[(k + 1) % idx.length]]) <= 1e-18); idx.splice(k < 0 ? 0 : k, 1); }   // punkt współliniowy
  }
  if (idx.length === 3) tris.push(idx.slice());
  const parts = tris.slice(), convex = (q) => q.every((_, i) => cr(P[q[i]], P[q[(i + 1) % q.length]], P[q[(i + 2) % q.length]]) >= -1e-15);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) {
      const A = parts[a], B = parts[b];
      for (let i = 0; i < A.length; i++) {
        const u = A[i], v = A[(i + 1) % A.length], j = B.indexOf(v);
        if (j < 0 || B[(j + 1) % B.length] !== u) continue;   // wspólna przekątna u–v (w B przeciwnie)
        const q = [...A.slice(0, i + 1)];
        for (let k = (j + 2) % B.length; k !== j; k = (k + 1) % B.length) q.push(B[k]);
        q.push(...A.slice(i + 1));
        if (!convex(q)) continue;
        parts[a] = q; parts.splice(b, 1); merged = true; break outer;
      }
    }
  }
  return parts.map((q) => q.map((i) => P[i]));
}
// koło łańcuchowe: ząb między gniazdami rolek k i k + 1 (zamknięty cięciwą przez dna gniazd), części wypukłe
export function sprocketHulls(z, p, d1) {
  const o = sprocketOutline(z, p, d1), n = SPROCKET_SAMPLES, out = [];
  for (let k = 0; k < z; k++) {
    const poly = []; for (let i = 0; i <= n; i++) { const q = o.pts[(k * n + i) % o.pts.length]; poly.push([q.x, q.y]); }
    out.push({ parts: convexParts(poly), ang: (k + 0.5) * TAU / z });
  }
  return out;
}
// koło koronowe: ząb wewnętrzny = wrąb zarysu otworu między jego „zębami” i oraz i + 1, domknięty na zewnątrz
// (promień głowy wrębu + 0,5·m — dalej jest wieniec); części wypukłe
export function ringHulls(z, m) {
  const o = involuteOutline(z, m, { add: 1.25, ded: 1, backlash: -0.04 }), n = o.pts.length, pz = TAU / z, Ro = o.ra + 0.5 * m, out = [];
  const wrap = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
  for (let i = 0; i < z; i++) {
    const c = i * pz, poly = [];
    for (let j = 0; j < 2 * n / z + 2; j++) { const q = o.pts[(i * n / z + j) % n], d = wrap(Math.atan2(q.y, q.x) - c + 1e-9) - 1e-9; if (d >= -1e-9 && d <= pz + 1e-9 && !(j > n / z && d < pz / 2)) poly.push([q.x, q.y]); }
    const a0 = Math.atan2(poly[0][1], poly[0][0]), a1 = Math.atan2(poly[poly.length - 1][1], poly[poly.length - 1][0]);
    poly.push([Ro * Math.cos(a1), Ro * Math.sin(a1)], [Ro * Math.cos(a0), Ro * Math.sin(a0)]);
    out.push({ parts: convexParts(poly), ang: c + pz / 2 });
  }
  return out;
}

// zarys z gniazdami rolek: promień gniazda 0,505·d₁ + 0,069 mm, głowa zęba do ok. D/2 + 0,3·d₁ (ISO 606)
// zarys wg ISO 606 (z łuków, na każdą podziałkę): gniazdo rolki — łuk r_i = 0,505·d₁ + 0,069 mm wokół punktu
// podziałowego, kąt osadzenia α = 140° − 90°/z (ISO: min.); bok zęba — łuk r_e = 0,008·d₁·(z² + 180) styczny do
// gniazda (środek na prostej przez koniec gniazda i punkt podziałowy — bok się „otwiera”, rolka schodzi z koła);
// głowa po kole d_a (środek tolerancji ISO). Punkty równo po łukach — cięciwy wchodzą w gniazdo o setne części mm.
export const SPROCKET_SEAT = 6, SPROCKET_FLANK = 6, SPROCKET_TIP = 3, SPROCKET_SAMPLES = 2 * SPROCKET_SEAT + 2 * SPROCKET_FLANK + SPROCKET_TIP + 1;
export function sprocketOutline(z, p, d1) {
  const R = p / (2 * Math.sin(Math.PI / z)), rs = 0.505 * d1 + 0.000069, re = 0.008 * d1 * (z * z + 180);   // wzór ISO liniowy w d₁ — jednostki dowolne
  const da = 2 * R + 0.5 * ((1.25 * p - d1) + (p * (1 - 1.6 / z) - d1)), ra = da / 2, pz = TAU / z, alpha = (140 - 90 / z) * Math.PI / 180;
  // połowa zęba k od strony gniazda k (kąt rośnie): gniazdo od dna, bok do koła głów (albo do osi zęba)
  const ux = 1, uy = 0, C = [R, 0], seat = (b) => [C[0] - rs * Math.cos(b), C[1] + rs * Math.sin(b)];
  const E = seat(alpha / 2), F = [E[0] + (C[0] - E[0]) * re / rs, E[1] + (C[1] - E[1]) * re / rs];
  const rot = (g) => { const c = Math.cos(g), s_ = Math.sin(g), x = E[0] - F[0], y = E[1] - F[1]; return [F[0] + x * c - y * s_, F[1] + x * s_ + y * c]; };
  const sg = Math.hypot(...rot(1e-4).map((v, i) => v - seat(alpha / 2 + 1e-4 * re / rs)[i])) < Math.hypot(...rot(-1e-4).map((v, i) => v - seat(alpha / 2 + 1e-4 * re / rs)[i])) ? 1 : -1;
  const ok = (g) => { const q = rot(sg * g); return Math.hypot(q[0], q[1]) < ra && Math.atan2(q[1], q[0]) < pz / 2; };
  let lo = 0, hi = 1; while (ok(hi)) hi *= 2;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
  const half = [];
  for (let i = 0; i <= SPROCKET_SEAT; i++) half.push(seat(alpha / 2 * i / SPROCKET_SEAT));
  for (let i = 1; i <= SPROCKET_FLANK; i++) half.push(rot(sg * lo * i / SPROCKET_FLANK));
  const aT = Math.atan2(half[half.length - 1][1], half[half.length - 1][0]), rT = Math.hypot(...half[half.length - 1]);
  const tip = []; for (let i = 1; i <= SPROCKET_TIP; i++) { const a = aT + (pz - 2 * aT) * i / (SPROCKET_TIP + 1); tip.push([rT * Math.cos(a), rT * Math.sin(a)]); }
  const mirror = ([x, y]) => { const c = Math.cos(pz), s_ = Math.sin(pz); return [x * c + y * s_, x * s_ - y * c]; };   // odbicie względem osi zęba (kąt pz/2)
  const block = [...half, ...tip, ...half.slice(1).reverse().map(mirror)], pts = [];
  for (let k = 0; k < z; k++) { const c = Math.cos(k * pz), s_ = Math.sin(k * pz); for (const [x, y] of block) pts.push(new THREE.Vector2(x * c - y * s_, x * s_ + y * c)); }
  return { pts, R, rs, ra: rT, re, alpha };
}
/* ---------------- zamiana ruchu: listwa zębata, suwak w prowadnicy, korbowód, śruba pociągowa z nakrętką ---------------- */
// listwa zębata (moduł m, n zębów): zarys w płaszczyźnie (y, z) — linia podziałowa z = 0 wzdłuż y (0 … n·p), zęby w +z,
// szerokość wzdłuż x. Zęby wypukłe (trapezy zarysu odniesienia, kąt 20°), ząb cieńszy o backlash·m jak w kołach.
export function rackHulls(m, n, { backlash = 0.04 } = {}) {
  const p = Math.PI * m, s2 = p / 4 - backlash * m / 2, t = Math.tan(ALPHA), hr = s2 + 1.25 * m * t, ht = s2 - m * t, out = [];
  for (let i = 0; i < n; i++) { const c = (i + 0.5) * p; out.push([[c - hr, -1.25 * m], [c + hr, -1.25 * m], [c + ht, m], [c - ht, m]]); }
  return out;
}

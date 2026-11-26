// Wzory pękania — zniszczenie wynikające z budowy modelu: każda część pęka tak, jak jest zbudowana.
//   masonry  mur z cegły / pustaków: kawałki wzdłuż warstw (spoiny poziome, przesunięte pionowe), przy uderzeniu
//            pojedyncze cegły, dalej bryły z kilku cegieł
//   concrete beton, płyty: komórki Woronoja — przy uderzeniu drobne, dalej duże płaty
//   planks   drewno z desek: deski wzdłuż słojów, łamane w poprzek ukośnie (drzazgi), krótsze przy uderzeniu
//   glass    szyba: promienie z punktu uderzenia i pierścienie — klinowate odłamki
//   tiles    dachówki: rzędy dachówek; dalej od uderzenia całe połacie z kilku rzędów
//   sheet    blacha: całe arkusze (blacha falista, drzwi garażu), rozrywane na 1–3 części
//   beam     belka, rama okna, słup: kawałki wzdłuż długości
// fracture(part, hit [x, y] w układzie części, power 0…1) → komórki (wielokąty wypukłe), każda z odległością od uderzenia
import { clipConvex, voronoi, rect, bounds, area, centroid, rng, distTo } from './geom2d.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// rozmiar kawałka w odległości d od uderzenia: mały przy uderzeniu, duży daleko (promień wpływu R)
const sizeAt = (d, R, s0, s1) => lerp(s0, s1, clamp(d / R, 0, 1) ** 0.8);

function masonry(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), course = o.course || 0.075, brick = o.brick || 0.25, R = 0.6 + 2.2 * power;
  const out = [];
  let y = y0, row = 0;
  while (y < y1 - 1e-4) {
    const dRow = Math.abs(clamp(hit[1], y, y + course * 4) - hit[1]);
    const nRows = Math.max(1, Math.round(sizeAt(dRow, R, 1, o.rowsFar || 5)));   // warstwy w jednym kawałku
    const yt = Math.min(y1, y + course * nRows);
    let x = x0 - ((row * 7) % 4) * brick * 0.25 - r() * brick * 0.5;
    while (x < x1 - 1e-4) {
      const d = Math.hypot(clamp(hit[0], x, x + brick) - hit[0], clamp(hit[1], y, yt) - hit[1]);
      const w = brick * Math.max(1, Math.round(sizeAt(d, R, 1, o.bricksFar || 4) * (0.7 + 0.6 * r())));
      const xr = Math.min(x1, x + w), c = clipConvex(rect(Math.max(x, x0), y, xr, yt), poly);
      if (c.length >= 3 && area(c) > 1e-5) out.push(c);
      x = xr;
    }
    y = yt; row++;
  }
  return out;
}

function concrete(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), A = Math.abs(area(poly)), R = 0.8 + 3 * power;
  const far = o.far || 1.4, near = o.near || 0.18, seeds = [];
  // gęsto przy uderzeniu (rozkład ku środkowi), rzadko daleko
  const nNear = Math.round(clamp(6 + 26 * power, 4, 40));
  for (let i = 0; i < nNear; i++) {
    const a = r() * 6.283, d = R * 0.7 * r() ** 1.6;
    seeds.push([hit[0] + Math.cos(a) * d, hit[1] + Math.sin(a) * d]);
  }
  const nFar = Math.round(clamp(A / (far * far), 2, 40));
  for (let i = 0; i < nFar; i++) seeds.push([lerp(x0, x1, r()), lerp(y0, y1, r())]);
  const inPoly = seeds.filter((s) => distTo(poly, s[0], s[1]) < near);
  return voronoi(poly, inPoly.length >= 2 ? inPoly : [[x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.5], [x0 + (x1 - x0) * 0.7, y0 + (y1 - y0) * 0.5]]);
}

function planks(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), vertical = o.grain === 'y', bw = o.board || 0.16, R = 0.5 + 2.5 * power;
  const out = [], [u0, u1, v0, v1] = vertical ? [x0, x1, y0, y1] : [y0, y1, x0, x1];
  for (let u = u0; u < u1 - 1e-4; u += bw) {
    const ua = u, ub = Math.min(u1, u + bw);
    let v = v0;
    while (v < v1 - 1e-4) {
      const d = Math.hypot((vertical ? clamp(hit[0], ua, ub) - hit[0] : clamp(hit[1], ua, ub) - hit[1]), clamp(vertical ? hit[1] : hit[0], v, v + 0.5) - (vertical ? hit[1] : hit[0]));
      const len = sizeAt(d, R, 0.25, o.far || 3) * (0.6 + 0.8 * r());
      const vb = v + len >= v1 - 0.15 ? v1 : v + len;
      // pęknięcie w poprzek deski ukośne (drzazga): koniec skośny o ±1/2 szerokości deski
      const k1 = vb >= v1 ? 0 : (r() - 0.5) * bw * 1.6, k0 = v <= v0 ? 0 : out.lastSkew || 0;
      const q = vertical
        ? [[ua, v + k0 * 0.5], [ub, v - k0 * 0.5], [ub, vb - k1 * 0.5], [ua, vb + k1 * 0.5]]
        : [[v - k0 * 0.5, ua], [vb - k1 * 0.5, ua], [vb + k1 * 0.5, ub], [v + k0 * 0.5, ub]];
      out.lastSkew = k1;
      const c = clipConvex(q, poly);
      if (c.length >= 3 && area(c) > 1e-5) out.push(c);
      v = vb;
    }
    out.lastSkew = 0;
  }
  delete out.lastSkew;
  return out;
}

function glass(poly, hit, power, r) {
  const [x0, y0, x1, y1] = bounds(poly), Rm = Math.hypot(x1 - x0, y1 - y0) * 1.2;
  const rays = Math.round(9 + 9 * power + r() * 4), angs = [];
  let a = r() * 6.283;
  for (let i = 0; i < rays; i++) { angs.push(a); a += (6.283 / rays) * (0.55 + 0.9 * r()); }
  // ostatni klin zamyka koło — gdyby wyszedł za szeroki, dokładamy promienie
  while (angs[0] + 6.283 - angs[angs.length - 1] > 1.2) angs.push(angs[angs.length - 1] + 0.9);
  while (angs[angs.length - 1] > angs[0] + 6.283 - 0.05) angs.pop();
  const rings = [0]; let rr = 0.03 + 0.03 * r();
  while (rr < Rm) { rings.push(rr); rr *= 1.7 + r() * 0.9; }
  rings.push(Rm);
  // wspólna siatka promieni i pierścieni: wierzchołek (promień i, pierścień j) z własnym drżeniem — sąsiednie odłamki
  // dzielą wierzchołki, więc nie zachodzą na siebie
  const P = angs.map((a) => rings.map((rr, j) => { const d = j === 0 || j === rings.length - 1 ? rr : rr * (0.85 + 0.3 * r()); return [hit[0] + Math.cos(a) * d, hit[1] + Math.sin(a) * d]; }));
  const out = [];
  for (let i = 0; i < angs.length; i++) {
    const i1 = (i + 1) % angs.length, wide = ((i + 1 < angs.length ? angs[i + 1] : angs[0] + 6.283) - angs[i]) > 2.8;
    for (let j = 0; j + 1 < rings.length; j++) {
      const q = j === 0 ? [[hit[0], hit[1]], P[i][1], P[i1][1]] : [P[i][j], P[i][j + 1], P[i1][j + 1], P[i1][j]];
      if (wide) continue;
      const c = clipConvex(q, poly); if (c.length >= 3 && area(c) > 2e-5) out.push(c);
    }
  }
  return out;
}
function tiles(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), row = o.row || 0.34, col = o.col || 0.25, R = 0.8 + 3 * power;
  const out = [];
  for (let y = y0; y < y1 - 1e-4;) {
    const dRow = Math.abs(clamp(hit[1], y, y + row) - hit[1]);
    const nr = Math.max(1, Math.round(sizeAt(dRow, R, 1, o.rowsFar || 4)));
    const yt = Math.min(y1, y + row * nr);
    for (let x = x0; x < x1 - 1e-4;) {
      const d = Math.hypot(clamp(hit[0], x, x + col) - hit[0], clamp(hit[1], y, yt) - hit[1]);
      const nc = Math.max(1, Math.round(sizeAt(d, R, 1, o.colsFar || 8) * (0.7 + 0.6 * r())));
      const xr = Math.min(x1, x + col * nc), c = clipConvex(rect(x, y, xr, yt), poly);
      if (c.length >= 3 && area(c) > 1e-5) out.push(c);
      x = xr;
    }
    y = yt;
  }
  return out;
}

function sheet(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), w = o.sheetW || 1.1, out = [];
  for (let x = x0; x < x1 - 1e-4; x += w) {
    const xr = Math.min(x1, x + w), near = Math.abs(clamp(hit[0], x, xr) - hit[0]) < 1.5 * (0.5 + power);
    const cuts = near ? 1 + Math.floor(r() * 2) : 0, ys = [y0];
    for (let i = 0; i < cuts; i++) ys.push(lerp(y0, y1, clamp((i + 1) / (cuts + 1) + (r() - 0.5) * 0.25, 0.1, 0.9)));
    ys.push(y1); ys.sort((a, b) => a - b);
    for (let i = 0; i + 1 < ys.length; i++) {
      if (ys[i + 1] - ys[i] < 0.05) continue;
      const c = clipConvex(rect(x, ys[i], xr, ys[i + 1]), poly);
      if (c.length >= 3 && area(c) > 1e-5) out.push(c);
    }
  }
  return out;
}

function beam(poly, hit, power, r, o) {
  const [x0, y0, x1, y1] = bounds(poly), alongX = x1 - x0 >= y1 - y0, L = alongX ? x1 - x0 : y1 - y0, out = [];
  const n = Math.max(1, Math.min(6, Math.round(L / (o.piece || 0.8) * (0.6 + power))));
  let s = 0;
  for (let i = 0; i < n; i++) {
    const e = i + 1 === n ? L : s + (L / n) * (0.6 + 0.8 * r());
    const q = alongX ? rect(x0 + s, y0, x0 + Math.min(L, e), y1) : rect(x0, y0 + s, x1, y0 + Math.min(L, e));
    const c = clipConvex(q, poly); if (c.length >= 3 && area(c) > 1e-5) out.push(c);
    s = Math.min(L, e); if (s >= L) break;
  }
  return out;
}

export const PATTERNS = { masonry, concrete, planks, glass, tiles, sheet, beam };

// part: { poly, pattern, pat: opcje wzoru, seed }; hit: [x, y]; power 0…1 → [{ poly, c: środek, d: odległość od uderzenia }]
export function fracture(part, hit, power = 0.5, seed = 1) {
  const r = rng((part.seed || 1) * 9301 + seed * 49297);
  const f = PATTERNS[part.pattern] || concrete;
  const cells = f(part.poly, hit, clamp(power, 0, 1), r, part.pat || {});
  return cells.map((poly) => { const c = centroid(poly); return { poly, c, d: Math.hypot(c[0] - hit[0], c[1] - hit[1]), a: Math.abs(area(poly)) }; });
}

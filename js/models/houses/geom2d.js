// Geometria 2D rozpadu: wielokąty wypukłe [[x, y], …] przeciwnie do wskazówek zegara, w układzie części (x wzdłuż,
// y w górę ściany albo w głąb płyty). Wszystko, co pękanie potrzebuje: przycinanie półpłaszczyzną i wielokątem,
// komórki Woronoja w wielokącie, pole, środek, punkt w wielokącie, wspólne krawędzie (sąsiedztwo kawałków).
export const EPS = 1e-6;

export function area(p) {
  let s = 0;
  for (let i = 0, n = p.length; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
export function centroid(p) {
  let cx = 0, cy = 0, s = 0;
  for (let i = 0, n = p.length; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], k = a[0] * b[1] - b[0] * a[1];
    s += k; cx += (a[0] + b[0]) * k; cy += (a[1] + b[1]) * k;
  }
  if (Math.abs(s) < 1e-12) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
  return [cx / (3 * s), cy / (3 * s)];
}
export function bounds(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  return [x0, y0, x1, y1];
}
// zostaje część z nx·x + ny·y ≤ d
export function clipHalf(p, nx, ny, d) {
  const out = [], n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], da = nx * a[0] + ny * a[1] - d, db = nx * b[0] + ny * b[1] - d;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return dedupe(out);
}
function dedupe(p) {
  const out = [];
  for (const q of p) { const l = out[out.length - 1]; if (!l || Math.abs(l[0] - q[0]) > 1e-7 || Math.abs(l[1] - q[1]) > 1e-7) out.push(q); }
  if (out.length > 1) { const a = out[0], b = out[out.length - 1]; if (Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7) out.pop(); }
  return out;
}
// wielokąt p przycięty wypukłym wielokątem c (Sutherland–Hodgman)
export function clipConvex(p, c) {
  let out = p;
  for (let i = 0, n = c.length; i < n && out.length >= 3; i++) {
    const a = c[i], b = c[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1];
    // wnętrze po lewej stronie krawędzi (CCW): normalna na zewnątrz (ey, −ex)
    out = clipHalf(out, ey, -ex, ey * a[0] - ex * a[1]);
  }
  return out.length >= 3 ? out : [];
}
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// komórki Woronoja ziaren w wielokącie wypukłym — każda wypukła
export function voronoi(poly, seeds) {
  const cells = [];
  for (let i = 0; i < seeds.length; i++) {
    let c = poly; const s = seeds[i];
    for (let j = 0; j < seeds.length && c.length >= 3; j++) {
      if (j === i) continue;
      const t = seeds[j], nx = t[0] - s[0], ny = t[1] - s[1];
      if (nx * nx + ny * ny < 1e-10) continue;
      c = clipHalf(c, nx, ny, (nx * (s[0] + t[0]) + ny * (s[1] + t[1])) / 2);
    }
    if (c.length >= 3 && Math.abs(area(c)) > 1e-5) cells.push(c);
  }
  return cells;
}

export function inside(p, x, y, pad = 0) {
  for (let i = 0, n = p.length; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey) || 1;
    if ((ex * (y - a[1]) - ey * (x - a[0])) / L < -pad) return false;
  }
  return true;
}
// odległość punktu od wielokąta (0 w środku)
export function distTo(p, x, y) {
  if (inside(p, x, y)) return 0;
  let d = Infinity;
  for (let i = 0, n = p.length; i < n; i++) d = Math.min(d, segDist(p[i], p[(i + 1) % n], x, y));
  return d;
}
export function segDist(a, b, x, y) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L2 = ex * ex + ey * ey || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / L2));
  return Math.hypot(a[0] + ex * t - x, a[1] + ey * t - y);
}
// czy odcinek (a, b) leży na prostej krawędzi wielokąta p (krawędź pierwotna, nie pęknięcie)
export function onBoundary(p, a, b, tol = 2e-4) {
  for (let i = 0, n = p.length; i < n; i++) {
    const c = p[i], d = p[(i + 1) % n];
    if (lineDist(c, d, a) < tol && lineDist(c, d, b) < tol) return i;
  }
  return -1;
}
function lineDist(c, d, q) {
  const ex = d[0] - c[0], ey = d[1] - c[1], L = Math.hypot(ex, ey) || 1;
  return Math.abs(ex * (q[1] - c[1]) - ey * (q[0] - c[0])) / L;
}
// czy dwie komórki stykają się krawędzią (odcinki na jednej prostej, zachodzące na siebie co najmniej o `min`)
export function touching(p, q, min = 0.01, tol = 2e-3) {
  for (let i = 0, n = p.length; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    if (L < min) continue;
    const ux = ex / L, uy = ey / L;
    for (let j = 0, m = q.length; j < m; j++) {
      const c = q[j], d = q[(j + 1) % m];
      if (Math.abs(ux * (c[1] - a[1]) - uy * (c[0] - a[0])) > tol || Math.abs(ux * (d[1] - a[1]) - uy * (d[0] - a[0])) > tol) continue;
      const t0 = ux * (c[0] - a[0]) + uy * (c[1] - a[1]), t1 = ux * (d[0] - a[0]) + uy * (d[1] - a[1]);
      if (Math.min(L, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)) > min) return true;
    }
  }
  return false;
}
import { lcg as rng } from '../../core/rng.js';   // generator z ziarnem (js/core/rng.js)
export { rng };

// Bryła z wielokąta: wielokąt wypukły (układ części) wyciągnięty na grubość t wzdłuż z (od −t/2 do +t/2), siatka
// wyśrodkowana na środku wielokąta — tak obraca się kawałek. Lica (z = ±t/2) i boki leżące na brzegu części mają
// teksturę części w jej miejscu (kawałek ma ten sam wzór, co ściana, z której wypadł) i kolor 1; boki pęknięć —
// kolor przełomu (np. cegła pod tynkiem, jaśniejszy beton, jasne drewno).
// extrude(poly, { t, orig, tile, uv, frac, inset }) → BufferGeometry (position, normal, uv, color, index);
//   userData: { c: [x, y] środek w układzie części, pts: Float32Array narożników względem środka (zderzenia), r, a }
import * as THREE from '../../../../vendor/three/three.module.js';
import { centroid, onBoundary, area } from './geom2d.js';

export function extrude(poly, { t = 0.2, orig = null, tile = 1, uv = [0, 0], frac = [0.8, 0.78, 0.74], z0 = 0 } = {}) {
  const c = centroid(poly), n = poly.length, h = t / 2;
  const P = [], N = [], U = [], C = [], I = [];
  const push = (x, y, z, nx, ny, nz, u, v, col) => { P.push(x - c[0], y - c[1], z + z0); N.push(nx, ny, nz); U.push(u, v); C.push(col[0], col[1], col[2]); return P.length / 3 - 1; };
  const W = [1, 1, 1];
  // lica
  const f0 = P.length / 3;
  for (const q of poly) push(q[0], q[1], h, 0, 0, 1, (q[0] + uv[0]) / tile, (q[1] + uv[1]) / tile, W);
  for (let i = 1; i + 1 < n; i++) I.push(f0, f0 + i, f0 + i + 1);
  const b0 = P.length / 3;
  for (const q of poly) push(q[0], q[1], -h, 0, 0, -1, (q[0] + uv[0]) / tile, (q[1] + uv[1]) / tile, W);
  for (let i = 1; i + 1 < n; i++) I.push(b0, b0 + i + 1, b0 + i);
  // boki
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
    if (L < 1e-6) continue;
    const nx = ey / L, ny = -ex / L, edge = orig ? onBoundary(orig, a, b) >= 0 : true, col = edge ? W : frac;
    const ua = (a[0] * ex + a[1] * ey) / L / tile, ub = ua + L / tile;
    const k = P.length / 3;
    push(a[0], a[1], h, nx, ny, 0, ua, h / tile, col); push(b[0], b[1], h, nx, ny, 0, ub, h / tile, col);
    push(b[0], b[1], -h, nx, ny, 0, ub, -h / tile, col); push(a[0], a[1], -h, nx, ny, 0, ua, -h / tile, col);
    I.push(k, k + 2, k + 1, k, k + 3, k + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I);
  const pts = new Float32Array(n * 6); let r = 0;
  poly.forEach((q, i) => {
    const x = q[0] - c[0], y = q[1] - c[1];
    pts.set([x, y, h + z0, x, y, -h + z0], i * 6); r = Math.max(r, Math.hypot(x, y, h + Math.abs(z0)));
  });
  g.userData = { c, pts, r, a: Math.abs(area(poly)) };
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

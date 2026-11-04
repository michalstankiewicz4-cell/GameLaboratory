// RoadKit — gąsienice: koła jezdne, koło napędowe, koło napinające, rolki podtrzymujące i ogniwa gąsienicy
// (jedna siatka instancji na rodzaj części ogniwa). Pas gąsienicy biegnie po obwiedni kół (otoczka wypukła okręgów
// w płaszczyźnie bocznej) i przesuwa się z prędkością gąsienicy; koła jezdne podążają za podłożem (drążki skrętne),
// więc dolny pas układa się na nierównościach.
import * as THREE from '../../../vendor/three/three.module.js';

// otoczka wypukła punktów [z, y] (Andrew), przeciwnie do ruchu wskazówek zegara
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}

// side: { x, wheels: [{ z, y, R, kind: 'road'|'idler'|'sprocket'|'roller', spin: Object3D }], links: { meshes: [InstancedMesh...] , count, pitch, t } }
export function makeTrack({ x, circles, count, pitch, thick, meshes }) {
  const st = { s: 0 };
  const M4 = new THREE.Matrix4(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(), Z = new THREE.Vector3(), P = new THREE.Vector3();
  function layout() {
    // punkty na okręgach powiększonych o połowę grubości pasa
    const pts = [];
    for (const c of circles) { const r = c.R + thick / 2; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; pts.push([c.z + Math.cos(a) * r, c.y + Math.sin(a) * r]); } }
    const h = hull(pts), L = [0];
    for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = L[h.length], step = total / count;
    let seg = 0;
    const cy = circles.reduce((s, c) => s + c.y, 0) / circles.length, cz = circles.reduce((s, c) => s + c.z, 0) / circles.length;
    for (let k = 0; k < count; k++) {
      let d = ((k * step + st.s) % total + total) % total;
      seg = 0; while (seg < h.length - 1 && L[seg + 1] < d) seg++;
      const a = h[seg], b = h[(seg + 1) % h.length], len = L[seg + 1] - L[seg] || 1, f = (d - L[seg]) / len;
      const z = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      const tz = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      // normalna na zewnątrz pasa (od środka obwiedni)
      let nz = ty, ny = -tz; if (nz * (z - cz) + ny * (y - cy) < 0) { nz = -nz; ny = -ny; }
      Y.set(0, ny, nz); Z.crossVectors(X, Y); P.set(x, y, z);
      M4.makeBasis(X, Y, Z).setPosition(P);
      for (const m of meshes) m.setMatrixAt(k, M4);
    }
    for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.computeBoundingBox && m.computeBoundingBox(); }
    return total;
  }
  layout();
  return {
    // v: prędkość pasa (m/s) względem kadłuba; koła obracają się zgodnie z nią
    update(dt, v) {
      st.s -= v * dt;   // dolny pas stoi na ziemi: względem kadłuba biegnie do tyłu przy jeździe naprzód
      for (const c of circles) if (c.spin) c.spin.rotation.x += v * dt / c.R;
      layout();
    },
    state: st,
  };
}

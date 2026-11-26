// DeformKit — osadzanie siatek do rysowania w siatce fizycznej powłoki: każdy wierzchołek modelu zna najbliższy trójkąt
// siatki fizycznej (współrzędne barycentryczne i odsunięcie wzdłuż normalnej) — obręcze, rąbki, korki jadą za blachą.
// Model nie wie o deformacji: jego siatki są tylko przepisywane do układu świata i przesuwane za powłoką.
//   createEmbedder(S, weld) → { embed(object3d), draw(), dispose() }   S: stan rdzenia (X — cząstki, T — trójkąty)
import * as THREE from '../../../../vendor/three/three.module.js';

export function createEmbedder(S, weld) {
  const { X, T } = S, NT = T.length / 3, key = (x, y, z) => `${Math.round(x / weld)},${Math.round(y / weld)},${Math.round(z / weld)}`;
  // --- normalne trójkątów siatki fizycznej
  const TN = new Float32Array(NT * 3);
  function triNormals() {
    for (let t = 0; t < NT; t++) {
      const a = T[t * 3] * 3, b = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3;
      const ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[c] - X[a], vy = X[c + 1] - X[a + 1], vz = X[c + 2] - X[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      TN[t * 3] = nx / l; TN[t * 3 + 1] = ny / l; TN[t * 3 + 2] = nz / l;
    }
  }
  triNormals();
  // --- najbliższy trójkąt: siatka przestrzenna środków trójkątów
  const CELL = 0.12, grid = new Map(), gk = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  for (let t = 0; t < NT; t++) {
    const a = T[t * 3] * 3, b = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3;
    const k = gk((X[a] + X[b] + X[c]) / 3, (X[a + 1] + X[b + 1] + X[c + 1]) / 3, (X[a + 2] + X[b + 2] + X[c + 2]) / 3);
    let L = grid.get(k); if (!L) grid.set(k, L = []); L.push(t);
  }
  const _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Vector3(), _bc = new THREE.Vector3(), _n = new THREE.Vector3(), _tri = new THREE.Triangle();
  function nearestTri(p) {
    let best = -1, bd = Infinity;
    const test = (t) => {
      _a.fromArray(X, T[t * 3] * 3); _b.fromArray(X, T[t * 3 + 1] * 3); _c.fromArray(X, T[t * 3 + 2] * 3);
      _tri.set(_a, _b, _c).closestPointToPoint(p, _q); const d = _q.distanceToSquared(p);
      if (d < bd) { bd = d; best = t; }
    };
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let r = 1; r <= 4 && best < 0; r++) for (let i = cx - r; i <= cx + r; i++) for (let j = cy - r; j <= cy + r; j++) for (let k = cz - r; k <= cz + r; k++) {
      const L = grid.get(`${i},${j},${k}`); if (L) for (const t of L) test(t);
    }
    if (best < 0) for (let t = 0; t < NT; t++) test(t);   // wierzchołek daleko od siatki fizycznej (ponad 4 komórki): wszystkie trójkąty
    return best;   // −1 tylko dla siatki fizycznej bez trójkątów (createShell to zgłasza)
  }
  const embeds = [];
  function embed(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse((m) => {
      if (!m.isMesh) return;
      const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      // siatka w układzie świata; obiekt bez własnego przesunięcia
      m.geometry = g; m.matrixAutoUpdate = false; m.matrix.identity(); m.matrixWorld.identity(); m.frustumCulled = false;
      const pos = g.attributes.position, n = pos.count, tri = new Int32Array(n), bary = new Float32Array(n * 3), off = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        _p.fromBufferAttribute(pos, i); const t = nearestTri(_p); tri[i] = t;
        _a.fromArray(X, T[t * 3] * 3); _b.fromArray(X, T[t * 3 + 1] * 3); _c.fromArray(X, T[t * 3 + 2] * 3);
        _tri.set(_a, _b, _c).closestPointToPoint(_p, _q); _tri.getBarycoord(_q, _bc);
        bary[i * 3] = _bc.x; bary[i * 3 + 1] = _bc.y; bary[i * 3 + 2] = _bc.z;
        _n.set(TN[t * 3], TN[t * 3 + 1], TN[t * 3 + 2]); off[i] = _p.sub(_q).dot(_n);
      }
      // wierzchołki w tym samym miejscu (szew bryły obrotowej): wspólna normalna, bez widocznej linii
      const same = new Map(), twin = new Int32Array(n).fill(-1);
      for (let i = 0; i < n; i++) { const k = key(pos.getX(i), pos.getY(i), pos.getZ(i)); const j = same.get(k); if (j === undefined) same.set(k, i); else twin[i] = j; }
      embeds.push({ m, g, tri, bary, off, twin, hasTwin: twin.some((x) => x >= 0) });
    });
    obj.traverse((o) => { o.matrixAutoUpdate = false; o.matrix.identity(); });   // przesunięcia siedzą już w siatkach
    obj.updateMatrixWorld(true);
    draw();
    return obj;
  }
  // siatki modelu za cząstkami (po każdym kroku)
  function draw() {
    triNormals();
    for (const E of embeds) {
      const pos = E.g.attributes.position.array, { tri, bary, off } = E, n = tri.length;
      for (let i = 0; i < n; i++) {
        const t = tri[i], a = T[t * 3] * 3, b = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3, u = bary[i * 3], v = bary[i * 3 + 1], w = bary[i * 3 + 2], d = off[i];
        pos[i * 3] = X[a] * u + X[b] * v + X[c] * w + TN[t * 3] * d;
        pos[i * 3 + 1] = X[a + 1] * u + X[b + 1] * v + X[c + 1] * w + TN[t * 3 + 1] * d;
        pos[i * 3 + 2] = X[a + 2] * u + X[b + 2] * v + X[c + 2] * w + TN[t * 3 + 2] * d;
      }
      E.g.attributes.position.needsUpdate = true;
      E.g.computeVertexNormals();
      if (E.hasTwin) {
        const nr = E.g.attributes.normal.array;
        for (let i = 0; i < n; i++) if (E.twin[i] >= 0) { const j = E.twin[i] * 3, q = i * 3; for (let k = 0; k < 3; k++) { const s = nr[q + k] + nr[j + k]; nr[q + k] = nr[j + k] = s; } }
        for (let i = 0; i < n; i++) { const l = Math.hypot(nr[i * 3], nr[i * 3 + 1], nr[i * 3 + 2]) || 1; nr[i * 3] /= l; nr[i * 3 + 1] /= l; nr[i * 3 + 2] /= l; }
      }
      E.g.computeBoundingSphere();
    }
  }
  return { embed, draw, dispose() { for (const E of embeds) E.g.dispose(); } };
}

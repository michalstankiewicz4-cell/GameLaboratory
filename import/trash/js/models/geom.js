// Narzędzia geometrii dla modeli budowanych kodem (bez DOM — działają też w Node, w doktorze modeli).
// Wszystko w metrach, oś Y w górę. Zamknięte bryły są zawsze zwracane ścianami na zewnątrz (orientOutward).
import * as THREE from '../../vendor/three/three.module.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Ziarno losowości — ten sam model za każdym razem. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Wygładzona linia łamana 2D (Catmull-Rom), `n` punktów na odcinek. pts: [[a,b],...]. */
export function smooth2(pts, n = 6, closed = false) {
  const out = [], N = pts.length;
  const at = (i) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  const last = closed ? N : N - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[N - 1].slice());
  return out;
}

/**
 * Bryła obrotowa wokół osi Y z profilu [[r, y], ...] (x = r·sinφ, z = r·cosφ).
 * closed — profil jest pętlą (bryła z grubością, np. opona, garnek). Punkty profilu z r = 0 zamykają oś.
 * UV: u = φ / 2π, v = długość łuku profilu (0…1) — geo.userData.arc: v każdego punktu profilu.
 * Normalne gładkie z profilu; `sharp` — indeksy punktów profilu z ostrą krawędzią (punkt dublowany).
 */
export function lathe(profile, segs = 48, { closed = false, sharp = [] } = {}) {
  let pts = profile.map(([r, y]) => [Math.max(0, r), y]);
  // ostre krawędzie: punkt dublowany, każda kopia dostaje normalną swojego odcinka
  const S = new Set(sharp);
  const L = pts.length, P2 = [], Nn = [];
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
  for (let i = 0; i < L; i++) {
    const prev = closed ? pts[(i - 1 + L) % L] : pts[Math.max(0, i - 1)], next = closed ? pts[(i + 1) % L] : pts[Math.min(L - 1, i + 1)];
    if (S.has(i)) {
      if (closed || i > 0) { P2.push(pts[i]); Nn.push(nrm(prev, pts[i])); }
      if (closed || i < L - 1) { P2.push(pts[i]); Nn.push(nrm(pts[i], next)); }
    } else { P2.push(pts[i]); Nn.push(nrm(prev, next)); }
  }
  if (closed) { P2.push(P2[0]); Nn.push(Nn[0]); }
  // orientacja pętli: normalne mają wskazywać na zewnątrz
  let area = 0; for (let i = 0; i < P2.length - 1; i++) area += P2[i][0] * P2[i + 1][1] - P2[i + 1][0] * P2[i][1];
  const flip = closed ? (area > 0 ? 1 : -1) : 1;   // otwarty profil: podawać od dołu osi do góry (CCW w płaszczyźnie r–y)
  const M = P2.length, arc = [0];
  for (let i = 1; i < M; i++) arc.push(arc[i - 1] + Math.hypot(P2[i][0] - P2[i - 1][0], P2[i][1] - P2[i - 1][1]));
  const tot = arc[M - 1] || 1;
  const pos = [], nor = [], uv = [], idx = [];
  for (let s = 0; s <= segs; s++) {
    const ph = (s / segs) * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
    for (let i = 0; i < M; i++) {
      const [r, y] = P2[i], [nr, ny] = Nn[i];
      pos.push(r * sn, y, r * cs); nor.push(nr * flip * sn, ny * flip, nr * flip * cs); uv.push(s / segs, arc[i] / tot);
    }
  }
  for (let s = 0; s < segs; s++) for (let i = 0; i < M - 1; i++) {
    if (P2[i][0] === P2[i + 1][0] && P2[i][1] === P2[i + 1][1]) continue;   // dublowany punkt ostrej krawędzi
    const a = s * M + i, b = a + 1, c = a + M, d = c + 1;
    if (P2[i][0] > 0 || P2[i + 1][0] > 0) idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // kierunek ścian zgodny z normalnymi (pierwszy niezdegenerowany trójkąt — przy osi trójkąty mają zerowe pole)
  for (let t = 0; t < idx.length; t += 3) {
    const a = V().fromArray(pos, idx[t] * 3), b = V().fromArray(pos, idx[t + 1] * 3), c = V().fromArray(pos, idx[t + 2] * 3);
    const fn = b.clone().sub(a).cross(c.clone().sub(a));
    if (fn.lengthSq() < 1e-14) continue;
    const vn = V().fromArray(nor, idx[t] * 3).add(V().fromArray(nor, idx[t + 1] * 3)).add(V().fromArray(nor, idx[t + 2] * 3));
    if (fn.dot(vn) < 0) { const ia = g.index.array; for (let k = 0; k < ia.length; k += 3) { const x = ia[k + 1]; ia[k + 1] = ia[k + 2]; ia[k + 2] = x; } }
    break;
  }
  g.userData.arc = arc.map((x) => x / tot); g.userData.arcLen = tot;
  return g;
}

/** Skleja wierzchołki w tym samym miejscu (szew bryły obrotowej), żeby cieniowanie było gładkie i bryła szczelna. */
export function weld(g, eps = 1e-6) {
  const pos = g.attributes.position, uv = g.attributes.uv;
  const idx = g.index ? Array.from(g.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  const map = new Map(), remap = new Int32Array(pos.count), P = [], U = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) / eps)},${Math.round(pos.getY(i) / eps)},${Math.round(pos.getZ(i) / eps)}`;
    let j = map.get(k);
    if (j === undefined) { j = P.length / 3; map.set(k, j); P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); if (uv) U.push(uv.getX(i), uv.getY(i)); }
    remap[i] = j;
  }
  const I = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]];
    if (a !== b && b !== c && a !== c) I.push(a, b, c);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  if (uv) o.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  o.setIndex(I); o.computeVertexNormals();
  return o;
}

/** Objętość ze znakiem (zamknięta bryła): > 0 — ściany na zewnątrz. */
export function signedVolume(g) {
  const p = g.attributes.position, idx = g.index ? g.index.array : null, n = idx ? idx.length : p.count;
  let v = 0; const a = V(), b = V(), c = V();
  for (let t = 0; t < n; t += 3) {
    a.fromBufferAttribute(p, idx ? idx[t] : t); b.fromBufferAttribute(p, idx ? idx[t + 1] : t + 1); c.fromBufferAttribute(p, idx ? idx[t + 2] : t + 2);
    v += a.dot(b.cross(c));
  }
  return v / 6;
}

/** Odwraca ściany zamkniętej bryły, jeśli są do środka. */
export function orientOutward(g) {
  if (signedVolume(g) >= 0) return g;
  if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
  const a = g.index.array;
  for (let t = 0; t < a.length; t += 3) { const x = a[t + 1]; a[t + 1] = a[t + 2]; a[t + 2] = x; }
  g.index.needsUpdate = true;
  return g;
}

/**
 * Loft: bryła z kolejnych przekrojów (każdy to tablica Vector3, ta sama liczba punktów, wypukły).
 * smooth — gładkie boki (wspólne wierzchołki w przekroju); caps — zamknięcie końców.
 */
export function loft(rings, { smooth = false, caps = true, closedPath = false } = {}) {
  const P = [], I = [], U = [];
  const R = rings.length, N = rings[0].length;
  if (smooth) {
    for (let r = 0; r < R; r++) for (let k = 0; k <= N; k++) { const p = rings[r][k % N]; P.push(p.x, p.y, p.z); U.push(k / N, r / (R - 1)); }
    const RR = closedPath ? R : R - 1;
    for (let r = 0; r < RR; r++) for (let k = 0; k < N; k++) {
      const r2 = (r + 1) % R;
      const a = r * (N + 1) + k, b = a + 1, c = r2 * (N + 1) + k, d = c + 1;
      I.push(a, c, b, b, c, d);
    }
  } else {
    const RR = closedPath ? R : R - 1;
    for (let r = 0; r < RR; r++) for (let k = 0; k < N; k++) {
      const r2 = (r + 1) % R, p = [rings[r][k], rings[r][(k + 1) % N], rings[r2][k], rings[r2][(k + 1) % N]];
      const o = P.length / 3;
      p.forEach((q) => P.push(q.x, q.y, q.z));
      U.push(k / N, r / (R - 1), (k + 1) / N, r / (R - 1), k / N, (r + 1) / (R - 1), (k + 1) / N, (r + 1) / (R - 1));
      I.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
    }
  }
  // boki: kierunek zgodny z resztą — sprawdzany na końcu przez orientOutward; zaślepki ustawiane względem boków
  const cen = (ring) => { const c = V(); ring.forEach((p) => c.add(p)); return c.multiplyScalar(1 / ring.length); };
  if (caps && !closedPath) for (const [ring, nb] of [[rings[0], rings[1]], [rings[R - 1], rings[R - 2]]]) {
    const c = cen(ring), away = c.clone().sub(cen(nb));
    const o = P.length / 3; P.push(c.x, c.y, c.z); U.push(0.5, 0.5);
    ring.forEach((p) => { P.push(p.x, p.y, p.z); U.push(0.5, 0.5); });
    // normalna wachlarza (suma iloczynów) ma wskazywać od sąsiedniego przekroju
    const nrm = V();
    for (let k = 0; k < N; k++) nrm.add(ring[k].clone().sub(c).cross(ring[(k + 1) % N].clone().sub(c)));
    const flip = nrm.dot(away) < 0;
    for (let k = 0; k < N; k++) { const a = o + 1 + k, b = o + 1 + ((k + 1) % N); if (flip) I.push(o, b, a); else I.push(o, a, b); }
  }
  // boki: normalna pierwszego czworokąta ma wskazywać od osi ścieżki (od środka przekroju)
  if (R > 1) {
    const c0 = cen(rings[0]), a = rings[0][0], b = rings[0][1 % N], d = rings[1][0];
    const fn = d.clone().sub(a).cross(b.clone().sub(a));   // trójkąt (a, c=d, b) z I.push(a, c, b)
    const mid = a.clone().add(b).multiplyScalar(0.5).sub(c0);
    if (fn.dot(mid) < 0) {
      const side = caps && !closedPath ? I.length - 2 * 3 * N : I.length;
      for (let t = 0; t < side; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  if (caps || closedPath) orientOutward(g);
  if (!smooth) { g = g.toNonIndexed(); }
  g.computeVertexNormals();
  return g;
}

/** Przekształca geometrię w miejscu: pozycja, obrót (Euler, radiany), skala. */
export function place(g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...(Array.isArray(s) ? s : [s, s, s])));
  g.applyMatrix4(m);
  if (m.determinant() < 0) orientOutward(g);
  return g;
}

/** Scala geometrie w jedną (position, normal, uv), indeksowaną. */
export function merge(list) {
  const P = [], N = [], U = [], I = [];
  for (const g0 of list) {
    if (!g0) continue;
    const g = g0.index ? g0 : g0.clone().setIndex(Array.from({ length: g0.attributes.position.count }, (_, i) => i));
    if (!g.attributes.normal) g.computeVertexNormals();
    const o = P.length / 3, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i));
      U.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    const a = g.index.array; for (let t = 0; t < a.length; t++) I.push(a[t] + o);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  o.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  o.setIndex(P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
  return o;
}

/** Część modelu: siatka z nazwą (doktor modeli pokazuje ją w wynikach). */
export function part(name, geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.name = name; m.userData.part = name;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/**
 * Prostopadłościan z zaokrąglonymi krawędziami (promień r), środek w (0,0,0). Ściany mają osobne wierzchołki
 * (UV 0…1 na każdej ścianie, czytelne z zewnątrz — jak BoxGeometry), normalne liczone z zaokrąglenia (gładkie).
 */
export function roundedBox(w, h, d, r = 0.01, seg = 2) {
  const n = Math.max(4, seg * 3);
  const g = new THREE.BoxGeometry(w, h, d, n, n, n);
  const p = g.attributes.position, nr = g.attributes.normal, hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r, v = V(), c = V(), dl = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z)));
    dl.copy(v).sub(c);
    if (dl.lengthSq() > 1e-12) { dl.normalize(); nr.setXYZ(i, dl.x, dl.y, dl.z); dl.multiplyScalar(r); }
    p.setXYZ(i, c.x + dl.x, c.y + dl.y, c.z + dl.z);
  }
  return g;
}

/** UV w metrach (rzut na płaszczyznę ściany wg największej składowej normalnej) — tekstury o stałej skali. */
export function uvMeters(g, tile = 1, off = [0, 0]) {
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = -p.getZ(i) * Math.sign(n.getY(i) || 1); }
    else if (ax >= az) { u = -p.getZ(i) * Math.sign(n.getX(i)); v = p.getY(i); }
    else { u = p.getX(i) * Math.sign(n.getZ(i)); v = p.getY(i); }
    uv[i * 2] = u / tile + off[0]; uv[i * 2 + 1] = v / tile + off[1];
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export { V };

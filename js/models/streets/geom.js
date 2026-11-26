// StreetKit — wspólna geometria tras: próbki linii (sample), pasy (ribbon), lica krawężników (wall), skarpy (slope),
// oznakowanie (line), siatki z tablic (geo, mesh); wyposażenie wzdłuż trasy: stanowiska (stations), instancje (inst),
// rury (tubeAlong), przekroje prowadzone po linii (sweep), zaślepki (capEnd), tekstury z płótna (canvasTex), materiały (kitMat).
import * as THREE from '../../../vendor/three/three.module.js';

// próbki linii: punkty co ~step m, z kierunkiem i normalną (w lewo) w płaszczyźnie xz
// punkty [x, z] albo [x, z, y] — trzecia liczba to wysokość trasy (wiadukty, zjazdy); normalna zawsze pozioma
export function sample(points, step = 0.5, closed = false) {
  const c = new THREE.CatmullRomCurve3(points.map(([x, z, y = 0]) => new THREE.Vector3(x, y, z)), closed, 'centripetal');
  const L = c.getLength(), n = Math.max(2, Math.ceil(L / step)), out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = c.getPointAt(u), t = c.getTangentAt(u), h = Math.hypot(t.x, t.z) || 1;
    out.push({ p, t, nx: -t.z / h, nz: t.x / h, s: u * L });
  }
  return { pts: out, L };
}
// wstęga między odsunięciami a…b (m, w lewo od osi) na wysokości y; tile — metry na kafelek tekstury
export function ribbon(S, a, b, y, tile, side = 0) {
  const P = [], N = [], U = [], I = [];
  S.pts.forEach((q, i) => {
    for (const o of [a, b]) { P.push(q.p.x + q.nx * o, q.p.y + y, q.p.z + q.nz * o); N.push(0, 1, 0); U.push(o / tile, q.s / tile); }
    if (i) { const k = i * 2; I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  if (a > b) for (let i = 0; i < I.length; i += 3) [I[i + 1], I[i + 2]] = [I[i + 2], I[i + 1]];
  return geo(P, N, U, I);
}
// pionowa ściana wzdłuż linii (lico krawężnika) od y0 do y1 przy odsunięciu o, zwrócona na stronę dir (+1 w lewo);
// lico widać tylko z tej strony (normalna i kolejność wierzchołków zgodne)
export function wall(S, o, y0, y1, dir, tile) {
  const P = [], N = [], U = [], I = [];
  S.pts.forEach((q, i) => {
    for (const y of [y0, y1]) { P.push(q.p.x + q.nx * o, q.p.y + y, q.p.z + q.nz * o); N.push(q.nx * dir, 0, q.nz * dir); U.push(q.s / tile, y / tile); }
    if (i) { const k = i * 2; if (dir > 0) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  return geo(P, N, U, I);
}
export function geo(P, N, U, I) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeBoundingSphere();
  return g;
}
// wstęga skośna: od (odsunięcie a, wysokość ya) do (b, yb) względem linii trasy — skarpy nasypu, spód pomostu
export function slope(S, a, ya, b, yb, tile, flip = false, ground = null) {
  const P = [], N = [], U = [], I = [];
  S.pts.forEach((q, i) => {
    const pa = [q.p.x + q.nx * a, q.p.y + ya, q.p.z + q.nz * a], pb = [q.p.x + q.nx * b, ground != null ? ground : q.p.y + yb, q.p.z + q.nz * b];
    P.push(...pa, ...pb); N.push(0, 1, 0, 0, 1, 0); U.push(0, q.s / tile, Math.hypot(b - a, (pb[1] - pa[1])) / tile, q.s / tile);
    if (i) { const k = i * 2; if (flip) I.push(k - 2, k, k - 1, k - 1, k, k + 1); else I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = geo(P, N, U, I); g.computeVertexNormals(); return g;
}
export const mesh = (g, m, shadow = true) => { const x = new THREE.Mesh(g, m); x.receiveShadow = true; x.castShadow = shadow; return x; };

// linie: ciągła albo przerywana (3 m kreska, 6 m przerwy — jak na polskich drogach poza miastem; w mieście 3/3)
export function line(S, o, w, kind, y = 0.004) {
  if (kind === 'solid') return [ribbon(S, o - w / 2, o + w / 2, y, 1)];
  const parts = [], dash = 3, gap = kind === 'dashed' ? 3 : 6;
  let seg = [];
  for (const q of S.pts) { const on = (q.s % (dash + gap)) < dash; if (on) seg.push(q); else if (seg.length > 1) { parts.push(ribbon({ pts: seg }, o - w / 2, o + w / 2, y, 1)); seg = []; } else seg = []; }
  if (seg.length > 1) parts.push(ribbon({ pts: seg }, o - w / 2, o + w / 2, y, 1));
  return parts;
}

export const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
// stanowiska co `every` m: macierze (lokalne +x wzdłuż trasy, +z w lewo od osi)
export function stations(S, offset, every, start = every / 2, y = 0) {
  const out = [], step = S.L / (S.pts.length - 1);
  for (let d = start; d <= S.L + 1e-6; d += every) {
    const q = S.pts[Math.min(S.pts.length - 1, Math.round(d / step))];
    out.push(new THREE.Matrix4().compose(new THREE.Vector3(q.p.x + q.nx * offset, q.p.y + y, q.p.z + q.nz * offset), new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-q.t.z, q.t.x)), ONE));
  }
  return out;
}
export function inst(g, m, M, shadow = true) {
  const o = new THREE.InstancedMesh(g, m, Math.max(1, M.length)); o.count = M.length;
  M.forEach((x, i) => o.setMatrixAt(i, x)); o.castShadow = shadow; o.receiveShadow = true; o.computeBoundingSphere(); return o;
}
// rura wzdłuż linii przy odsunięciu, na wysokości y
export function tubeAlong(S, offset, y, r, m) {
  const pts = S.pts.filter((_, i) => i % 4 === 0 || i === S.pts.length - 1).map((q) => new THREE.Vector3(q.p.x + q.nx * offset, q.p.y + y, q.p.z + q.nz * offset));
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(2, pts.length * 2), r, 8), m);
}
// przekrój [[dn, dy], …] przeciągnięty po linii; dn liczone w stronę `side` (±1 w odsunięciach)
// tile — metry na kafelek tekstury (wtedy v liczone po długości przekroju), bez — v od 0 do 1
export function sweep(S, prof, offset, y, side, tile = 0) {
  const P = [], N = [], U = [], I = [], m = prof.length, len = [0];
  for (let j = 1; j < m; j++) len.push(len[j - 1] + Math.hypot(prof[j][0] - prof[j - 1][0], prof[j][1] - prof[j - 1][1]));
  S.pts.forEach((q, i) => {
    prof.forEach(([dn, dy], j) => { const o = offset + side * dn; P.push(q.p.x + q.nx * o, q.p.y + y + dy, q.p.z + q.nz * o); N.push(0, 1, 0); U.push(tile ? q.s / tile : q.s, tile ? len[j] / tile : j / (m - 1)); });
    if (i) for (let j = 0; j < m - 1; j++) { const a = (i - 1) * m + j, b = i * m + j; I.push(a, b, a + 1, a + 1, b, b + 1); }
  });
  const g = geo(P, N, U, I); g.computeVertexNormals(); return g;
}
export const canvasTex = (w, h, draw, repeat = true) => {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const kitMats = new Map();
// zaślepka końca bryły wyciągniętej wzdłuż linii: prostokąt w przekroju (odsunięcia o0…o1, wysokości y0…y1) na początku
// (end 0) albo końcu (end 1) linii, lico na zewnątrz
export function capEnd(S, end, o0, o1, y0, y1, m) {
  const q = S.pts[end ? S.pts.length - 1 : 0], d = end ? 1 : -1, P = [], N = [], U = [];
  for (const [o, y] of [[o0, y0], [o1, y0], [o1, y1], [o0, y1]]) { P.push(q.p.x + q.nx * o, q.p.y + y, q.p.z + q.nz * o); N.push(q.t.x * d, 0, q.t.z * d); U.push(o, y); }
  // kolejność wierzchołków dobrana do kierunku lica
  const a = new THREE.Vector3(P[3] - P[0], P[4] - P[1], P[5] - P[2]), b = new THREE.Vector3(P[6] - P[0], P[7] - P[1], P[8] - P[2]), n = a.cross(b);
  const I = n.x * q.t.x * d + n.z * q.t.z * d > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  return mesh(geo(P, N, U, I), m);
}
export function kitMat(id, make) { if (!kitMats.has(id)) kitMats.set(id, make()); return kitMats.get(id); }

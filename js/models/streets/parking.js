// StreetKit — miejsca parkingowe (buildParking) i symbol osoby na wózku (wheelchair).
import * as THREE from '../../../vendor/three/three.module.js';
import { canvasTex, geo, mesh, sample } from './geom.js';
import { paint } from './surfaces.js';

/* ---------------- miejsca parkingowe ---------------- */
// Pas postojowy wzdłuż jezdni (w przekroju: pas { k: 'parking', w: PARKING[type].depth, h: 0 } przed krawężnikiem)
// i jego oznakowanie: linie P-18 (białe, 12 cm) wyznaczające stanowiska; miejsca dla osób z niepełnosprawnością —
// niebieska powierzchnia z białym obrysem i symbolem P-24 (wózek), przy nich znak D-18 z tabliczką T-29.
// Wymiary jak w przepisach: równoległe 2,5 × 6,0 m (dla niepełnosprawnych tej samej wielkości), skośne 60° i prostopadłe 2,5 × 5,0 m (dla niepełnosprawnych 3,6 × 5,0).
//   PARKING  parallel | angled | perpendicular → { label, depth (szerokość pasa), angle, w, l, wD }
//   buildParking(points, type, { inner, side, disabled, margin }) → { group, stalls: [{ s, o, rot, disabled }] }
//     inner — odsunięcie wewnętrznej krawędzi pasa (brzeg jezdni), side ±1, disabled — ile pierwszych miejsc dla
//     niepełnosprawnych; stalls — środki stanowisk (do ustawiania aut i znaków)
export const PARKING = {
  parallel: { label: 'Równoległe', depth: 2.5, angle: 0, w: 6.0, wD: 6.0 },
  angled: { label: 'Skośne 60°', depth: 5.6, angle: 60, w: 2.5, wD: 3.6, l: 5.0 },
  perpendicular: { label: 'Prostopadłe', depth: 5.0, angle: 90, w: 2.5, wD: 3.6, l: 5.0 },
};
export function wheelchair(c, x, y, s, col) {   // symbol osoby na wózku (P-24, T-29); środek x, y, rozmiar s
  c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(x - s * 0.1, y - s * 0.4, s * 0.085, 0, 7); c.fill();                                  // głowa
  c.lineWidth = s * 0.1;
  c.beginPath(); c.moveTo(x - s * 0.12, y - s * 0.26); c.lineTo(x - s * 0.12, y + s * 0.02); c.lineTo(x + s * 0.16, y + s * 0.02);
  c.lineTo(x + s * 0.24, y + s * 0.3); c.lineTo(x + s * 0.34, y + s * 0.3); c.stroke();                         // tułów, udo, łydka, stopa
  c.lineWidth = s * 0.07; c.beginPath(); c.moveTo(x - s * 0.12, y - s * 0.14); c.lineTo(x + s * 0.1, y - s * 0.14); c.stroke();   // ręka
  c.lineWidth = s * 0.075; c.beginPath(); c.arc(x - s * 0.08, y + s * 0.18, s * 0.26, -0.45, Math.PI * 2 - 2.0); c.stroke();     // koło (otwarte u góry)
}
const stallTex = new Map();
function disabledTex(wm, dm) {   // wm — szerokość stanowiska (u), dm — głębokość (v, od jezdni do krawężnika)
  const k = wm + 'x' + dm; if (stallTex.has(k)) return stallTex.get(k);
  const px = 64, W = Math.round(wm * px), H = Math.round(dm * px);
  const t = canvasTex(W, H, (c) => {
    c.fillStyle = '#1f5fa8'; c.fillRect(0, 0, W, H);
    const s = Math.min(W, H) * 0.62; wheelchair(c, W / 2, H / 2, s, '#f2f2ee');
  }, false);
  stallTex.set(k, t); return t;
}
const parkPaint = paint;
export function buildParking(points, type = 'perpendicular', { inner = 3.25, side = 1, disabled = 0, margin = 3 } = {}) {
  const T = PARKING[type] || PARKING.perpendicular, S = sample(points, 0.5), g = new THREE.Group(); g.name = 'parking: ' + T.label;
  const step = S.L / (S.pts.length - 1), oIn = side * inner, oOut = side * (inner + T.depth);
  // punkt trasy w (s, o): s wzdłuż linii (m), o odsunięcie od osi (m, w lewo dodatnie)
  const at = (s, o, y) => {
    const f = Math.max(0, Math.min(S.pts.length - 1, s / step)), i = Math.min(S.pts.length - 2, Math.floor(f)), u = f - i, a = S.pts[i], b = S.pts[i + 1];
    const x = a.p.x + (b.p.x - a.p.x) * u, z = a.p.z + (b.p.z - a.p.z) * u, nx = a.nx + (b.nx - a.nx) * u, nz = a.nz + (b.nz - a.nz) * u;
    return [x + nx * o, a.p.y + (b.p.y - a.p.y) * u + y, z + nz * o];
  };
  const quads = { P: [], N: [], U: [], I: [] };
  // czworokąt na nawierzchni; kolejność wierzchołków dobrana tak, żeby lico patrzyło w górę (strona i kierunek dowolne)
  const quad = (Q, corners, uv, y) => {
    const k = Q.P.length / 3, p = corners.map(([s, o]) => at(s, o, y));
    p.forEach((v, j) => { Q.P.push(...v); Q.N.push(0, 1, 0); Q.U.push(...uv[j]); });
    const up = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]) > 0;
    if (up) Q.I.push(k, k + 1, k + 2, k, k + 2, k + 3); else Q.I.push(k, k + 2, k + 1, k, k + 3, k + 2);
  };
  const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // pas linii między dwoma punktami (s, o), szerokość 12 cm
  const lineSO = (s0, o0, s1, o1, w = 0.12) => {
    const ds = s1 - s0, dO = o1 - o0, L = Math.hypot(ds, dO) || 1, ps = -dO / L * w / 2, po = ds / L * w / 2;
    quad(quads, [[s0 + ps, o0 + po], [s1 + ps, o1 + po], [s1 - ps, o1 - po], [s0 - ps, o0 - po]], UV, 0.005);
  };
  const stalls = [], blue = [];
  // skos w kierunku jazdy: ruch prawostronny — po stronie −1 jedzie się w +s, po stronie +1 w −s
  const th = T.angle * Math.PI / 180, kOff = T.angle && T.angle < 90 ? -side * T.depth / Math.tan(th) : 0;
  let s = margin + Math.max(0, -kOff), n = 0;
  while (true) {
    const dis = n < disabled, W = dis ? T.wD : T.w, along = T.angle ? W / Math.sin(th) : W;
    if (s + along + Math.max(0, kOff) > S.L - margin) break;
    const c = [[s, oIn], [s + along, oIn], [s + along + kOff, oOut], [s + kOff, oOut]];
    if (n === 0) lineSO(c[0][0], c[0][1], c[3][0], c[3][1]);
    lineSO(c[1][0], c[1][1], c[2][0], c[2][1]);
    if (dis) { lineSO(c[0][0], c[0][1], c[1][0], c[1][1]); lineSO(c[3][0], c[3][1], c[2][0], c[2][1]); blue.push({ c, W, D: T.angle ? T.depth / Math.sin(th) : T.depth }); }
    const mid = at(s + along / 2 + kOff / 2, (oIn + oOut) / 2, 0), q = S.pts[Math.min(S.pts.length - 1, Math.round((s + along / 2) / step))];
    stalls.push({ x: mid[0], y: mid[1], z: mid[2], rot: Math.atan2(-q.t.z, q.t.x) + side * (Math.PI / 2 - (T.angle ? th : 0)) * (T.angle ? 1 : 0), disabled: dis, s: s + along / 2 });
    s += along; n++;
  }
  // linia krawędzi pasa postojowego przy równoległym (oddziela od pasa ruchu)
  if (!T.angle && n) lineSO(margin, oIn, s, oIn);
  const UVd = side > 0 ? UV : [[1, 0], [0, 0], [0, 1], [1, 1]];   // symbol czytelny (nie lustrzany) z jezdni po obu stronach
  g.add(mesh(geo(quads.P, quads.N, quads.U, quads.I), parkPaint, false));
  // niebieskie stanowiska z symbolem P-24 (wózek przodem do jezdni: v od jezdni do krawężnika)
  for (const b of blue) {
    const Q = { P: [], N: [], U: [], I: [] };
    quad(Q, b.c, UVd, 0.003);
    const m = new THREE.MeshStandardMaterial({ map: disabledTex(T.angle ? b.W : b.W, T.angle ? 5 : T.depth), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    g.add(mesh(geo(Q.P, Q.N, Q.U, Q.I), m, false));
  }
  return { group: g, stalls, count: n };
}

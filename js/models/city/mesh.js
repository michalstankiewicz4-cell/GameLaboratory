// CityKit — geometria budynku z układu fasad (layout.js):
//   near(geo, L) — wersja bliska: mur z otworami, wnęki (ościeża), szyby, ramy, słupki, drzwi, parapety, balkony,
//                  pasy (cokół, gzymsy) jako jedna bryła na ścianę
//   far(geo, L)  — wersja daleka: ściana to płaskie prostokąty z wypalonymi teksturami (bake.js) — piętra jednym
//                  prostokątem na ścianę (kafelek powtarzany), parter prostokątem na moduł (rodzaj komórki)
//   top(geo, L)  — wspólne: gzyms wieńczący i dach (roof.js)
// Materiały (nazwy grup): wall, trim, glass, lit1…3 (szyby świecące nocą), door, slab, railing, roof; daleka:
// tile:upper, tile:plain, tile:g:<rodzaj>.
import { facadeFrame } from './geo.js';
import { windowLight, PLAIN_W } from './layout.js';
import { roof } from './roof.js';

const EPS = 1e-4;

// mapowanie tekstur z położenia w świecie (metry / tile): ściany pionowe — wzdłuż ściany i w górę, poziome — z góry
export function worldUV(p, n, tile) {
  if (Math.abs(n[1]) > 0.7) return [p[0] / tile, p[2] / tile];
  const l = Math.hypot(n[0], n[2]) || 1, tx = -n[2] / l, tz = n[0] / l;
  return [(p[0] * tx + p[2] * tz) / tile, p[1] / tile];
}
export function wq(geo, m, pts, n, tile = 1) { geo.quad(m, pts, n, pts.map((p) => worldUV(p, n, tile))); }

/** Bryła w układzie ściany: przód, góra, dół, boki; tył tylko gdy odsunięta od muru. skip — ściany zakryte
 *  (litery l, r, t, b: lewa, prawa, góra, dół) — nie powstają (rama okna przy ościeżach). */
export function box(geo, F, m, u0, u1, v0, v1, z0, z1, tile, skip = '') {
  const P = F.P, D = F.D;
  wq(geo, m, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], D(0, 0, 1), tile);
  if (!skip.includes('t')) wq(geo, m, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], D(0, 1, 0), tile);
  if (!skip.includes('b')) wq(geo, m, [P(u0, v0, z0), P(u1, v0, z0), P(u1, v0, z1), P(u0, v0, z1)], D(0, -1, 0), tile);
  if (!skip.includes('l')) wq(geo, m, [P(u0, v0, z0), P(u0, v1, z0), P(u0, v1, z1), P(u0, v0, z1)], D(-1, 0, 0), tile);
  if (!skip.includes('r')) wq(geo, m, [P(u1, v0, z0), P(u1, v1, z0), P(u1, v1, z1), P(u1, v0, z1)], D(1, 0, 0), tile);
  if (z0 > EPS) wq(geo, m, [P(u0, v0, z0), P(u1, v0, z0), P(u1, v1, z0), P(u0, v1, z0)], D(0, 0, -1), tile);
}

// mur prostokąta [u0, u1] × [v0, v1] bez otworów (pasy pionowe między brzegami otworów)
function wallAround(geo, F, u0, u1, v0, v1, holes, tile) {
  const cuts = [u0, u1];
  for (const h of holes) cuts.push(Math.max(u0, Math.min(u1, h.u0)), Math.max(u0, Math.min(u1, h.u1)));
  const us = [...new Set(cuts.map((x) => Math.round(x * 1e4) / 1e4))].sort((a, b) => a - b);
  for (let i = 0; i + 1 < us.length; i++) {
    const a = us[i], b = us[i + 1]; if (b - a < EPS) continue;
    const vs = holes.filter((h) => h.u0 <= a + EPS && h.u1 >= b - EPS).map((h) => [Math.max(v0, h.v0), Math.min(v1, h.v1)]).sort((x, y) => x[0] - y[0]);
    let v = v0;
    for (const [h0, h1] of vs) { if (h0 - v > EPS) wq(geo, 'wall', [F.P(a, v, 0), F.P(b, v, 0), F.P(b, h0, 0), F.P(a, h0, 0)], F.D(0, 0, 1), tile); v = Math.max(v, h1); }
    if (v1 - v > EPS) wq(geo, 'wall', [F.P(a, v, 0), F.P(b, v, 0), F.P(b, v1, 0), F.P(a, v1, 0)], F.D(0, 0, 1), tile);
  }
}

// otwór: ościeża, szyba lub drzwi, rama, słupki, ślemię
function opening(geo, F, o, glassMat, tile) {
  const { P, D } = F, { u0, u1, v0, v1, depth: d } = o, fw = o.frame, fz = -d + 0.07;
  wq(geo, 'wall', [P(u0, v1, -d), P(u1, v1, -d), P(u1, v1, 0), P(u0, v1, 0)], D(0, -1, 0), tile);
  wq(geo, 'wall', [P(u0, v0, -d), P(u1, v0, -d), P(u1, v0, 0), P(u0, v0, 0)], D(0, 1, 0), tile);
  wq(geo, 'wall', [P(u0, v0, -d), P(u0, v1, -d), P(u0, v1, 0), P(u0, v0, 0)], D(1, 0, 0), tile);
  wq(geo, 'wall', [P(u1, v0, -d), P(u1, v1, -d), P(u1, v1, 0), P(u1, v0, 0)], D(-1, 0, 0), tile);
  const gv0 = o.door ? v0 + o.door : v0;
  if (o.door) wq(geo, 'door', [P(u0, v0, -d + 0.035), P(u1, v0, -d + 0.035), P(u1, gv0, -d + 0.035), P(u0, gv0, -d + 0.035)], D(0, 0, 1));
  if (v1 - gv0 > EPS) wq(geo, glassMat, [P(u0, gv0, -d), P(u1, gv0, -d), P(u1, v1, -d), P(u0, v1, -d)], D(0, 0, 1));
  // rama: ściany przylegające do ościeży i do siebie nie powstają (zakryte; przy oknach stykających się —
  // pasmowych, kurtynowych — leżałyby w jednej płaszczyźnie z ościeżem sąsiada)
  box(geo, F, 'trim', u0, u0 + fw, v0, v1, -d, fz, tile, 'ltb'); box(geo, F, 'trim', u1 - fw, u1, v0, v1, -d, fz, tile, 'rtb');
  box(geo, F, 'trim', u0 + fw, u1 - fw, v1 - fw, v1, -d, fz, tile, 'tlr');
  if (!o.door) box(geo, F, 'trim', u0 + fw, u1 - fw, v0, v0 + fw, -d, fz, tile, 'blr');
  const mt = o.door ? 'b' : '';
  for (let j = 1; j <= o.mull; j++) { const u = u0 + (u1 - u0) * j / (o.mull + 1); box(geo, F, 'trim', u - fw / 2, u + fw / 2, v0 + (o.door ? 0 : fw), v1 - fw, -d, fz, tile, 'tb' + mt); }
  if (o.transom != null) { const v = v0 + o.transom; box(geo, F, 'trim', u0 + fw, u1 - fw, v - fw / 2, v + fw / 2, -d, fz, tile, 'lr'); }
}

// komórki ściany e w rzędzie r (0 — parter): elementy przesunięte i rozciągnięte do szerokości modułu ściany
function rowY(L, r) { const S = L.S; return r === 0 ? [0, S.groundH] : [S.groundH + (r - 1) * S.floorH, S.groundH + r * S.floorH]; }
function cellsOf(L, e, r) {
  const out = [];
  if (e.plain) { out.push({ key: r ? 'plain' : 'g:wall', u: 0, s: e.len / (r ? PLAIN_W : L.mw0), i: 0, plain: true }); return out; }
  for (let i = 0; i < e.n; i++) out.push({ key: r ? 'upper' : 'g:' + e.ground[i], u: i * e.mw, s: e.s, i });
  return out;
}
const placed = (f, c, y0) => ({ ...f, u0: c.u + f.u0 * c.s, u1: c.u + f.u1 * c.s, v0: y0 + f.v0, v1: y0 + f.v1, transom: f.transom });

// pasy (cokół, gzymsy, pasy między piętrami) — bryła przez całą ścianę, bez miejsc, gdzie przecina otwór;
// na rogach wypukłych wydłużona o wysięg (pełny narożnik)
function bands(geo, F, e, list, holes, tile) {
  for (const b of list) {
    const a0 = e.convex0 ? -b.z1 : 0, a1 = e.len + (e.convex1 ? b.z1 : 0);
    const cut = holes.filter((h) => h.v0 < b.v1 - EPS && h.v1 > b.v0 + EPS).map((h) => [h.u0, h.u1]).sort((x, y) => x[0] - y[0]);
    let u = a0;
    for (const [h0, h1] of cut) { if (h0 - u > EPS) box(geo, F, b.m, u, h0, b.v0, b.v1, b.z0, b.z1, tile); u = Math.max(u, h1); }
    if (a1 - u > EPS) box(geo, F, b.m, u, a1, b.v0, b.v1, b.z0, b.z1, tile);
  }
}

/** Wersja bliska. */
export function near(geo, L) {
  const S = L.S, tile = S.wall.tile || 2;
  for (const e of L.edges) {
    const F = facadeFrame(e);
    for (let r = 0; r < S.floors; r++) {
      const [y0, y1] = rowY(L, r), holes = [], bandList = [];
      for (const c of cellsOf(L, e, r)) {
        const feats = L.cells[c.key] || [], cu0 = c.u, cu1 = c.plain ? e.len : c.u + e.mw;
        const mine = feats.filter((f) => !f.band).map((f) => placed(f, c, y0));
        // otwór dochodzący do końca ściany: zostaje słupek muru (inaczej na rogu wnęka byłaby otwarta z boku)
        for (const o of mine) if (o.t === 'open') { const m = o.depth + 0.03; if (o.u0 < m) o.u0 = m; if (o.u1 > e.len - m) o.u1 = e.len - m; }
        const ops = mine.filter((f) => f.t === 'open' && f.u1 - f.u0 >= 0.2);
        if (!bandList.length) for (const f of feats) if (f.band) bandList.push({ ...f, v0: y0 + f.v0, v1: y0 + f.v1 });
        wallAround(geo, F, cu0, cu1, r ? y0 : -0.02, y1, ops, tile);   // parter od −2 cm: do spodu budynku (roof.js)
        for (const o of ops) {
          const li = windowLight(S.seed, e.i + S.edgeBase, c.i, r, o.wid, S.lit);
          opening(geo, F, o, li ? 'lit' + li : 'glass', tile); holes.push(o);
        }
        for (const b of mine) if (b.t === 'box') box(geo, F, b.m, b.u0, b.u1, b.v0, b.v1, b.z0, b.z1, tile);
      }
      bands(geo, F, e, bandList, holes, tile);
    }
    // poddasze: pas muru bez okien nad ostatnią kondygnacją (reszta wysokości części budynku z mapy)
    if (S.attic > 0) { const y0 = L.H - S.attic; wq(geo, 'wall', [F.P(0, y0, 0), F.P(e.len, y0, 0), F.P(e.len, L.H, 0), F.P(0, L.H, 0)], F.D(0, 0, 1), tile); }
  }
}

/** Wersja daleka: prostokąty z teksturami komórek; atrybut aCell — (ściana, moduł parteru albo −1 dla pięter). */
export function far(geo, L) {
  const S = L.S, gh = S.groundH, H = L.H - S.attic, up = S.floors - 1, eb = S.edgeBase;
  for (const e of L.edges) {
    const F = facadeFrame(e), n = F.D(0, 0, 1);
    const q = (key, u0, u1, v0, v1, uv, cell) => geo.quad('tile:' + key, [F.P(u0, v0 || -0.02, 0), F.P(u1, v0 || -0.02, 0), F.P(u1, v1, 0), F.P(u0, v1, 0)], n, uv, cell);   // parter od −2 cm
    if (e.plain) {
      const k = e.len / L.mw0;
      q('g:wall', 0, e.len, 0, gh, [[0, 0], [k, 0], [k, 1], [0, 1]], [e.i + eb, 0]);
      if (up) { const k2 = e.len / PLAIN_W; q('plain', 0, e.len, gh, H, [[0, 0], [k2, 0], [k2, up], [0, up]], [e.i + eb, -1]); }
    } else {
      for (let i = 0; i < e.n; i++) q('g:' + e.ground[i], i * e.mw, (i + 1) * e.mw, 0, gh, [[0, 0], [1, 0], [1, 1], [0, 1]], [e.i + eb, i]);
      if (up) q('upper', 0, e.len, gh, H, [[0, 0], [e.n, 0], [e.n, up], [0, up]], [e.i + eb, -1]);
    }
    if (S.attic > 0) { const k2 = e.len / PLAIN_W, kv = S.attic / S.floorH; q('plain', 0, e.len, H, L.H, [[0, 0], [k2, 0], [k2, kv], [0, kv]], [e.i + eb, -1]); }   // poddasze
  }
}

/** Gzyms wieńczący i dach — takie same z bliska i z daleka. */
export function top(geo, L) {
  const S = L.S, H = L.H, tile = S.wall.tile || 2;
  if (S.bands.top) for (const e of L.edges) {
    const F = facadeFrame(e);
    bands(geo, F, e, [{ v0: H - 0.5, v1: H - 0.18, z0: 0, z1: 0.2, m: 'wall' }, { v0: H - 0.18, v1: H, z0: 0, z1: 0.34, m: 'wall' }], [], tile);
  }
  roof(geo, L);
}

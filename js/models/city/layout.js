// CityKit — układ fasad: z opisu budynku (types.js) i obrysu (footprint.js) liczy, co stoi na każdej ściane.
// Jeden układ dla obu wersji budynku: siatki z bliska (mesh.js) i wypalonych tekstur z daleka (bake.js), żeby wersja
// daleka była zdjęciem bliskiej.
//
// Ściana (krawędź obrysu) dzieli się na moduły piętra (przęsła z opisu, np. okno + balkon), dopasowane do jej
// długości: n modułów po mw metrów (szerokość modułu × s, s blisko 1). Za krótka ściana — gładka (plain).
// Kondygnacje: parter (groundH) i piętra (floorH). Komórka = moduł × kondygnacja; jej zawartość to elementy
// w układzie komórki (u wzdłuż ściany od lewej krawędzi komórki, v w górę od podłogi, z na zewnątrz od lica muru):
//   { t: 'open', u0, u1, v0, v1, depth, wid, mull, transom, door, frame }  otwór: wnęka do głębokości depth, w niej
//        szyba (wid — numer okna w komórce, 1…15), rama, słupki (mull), ślemię (transom — wysokość od dołu otworu),
//        door — dolna część to drzwi (do wysokości door)
//   { t: 'box', u0, u1, v0, v1, z0, z1, m, band }  bryła przed licem (parapet okna, płyta i balustrada balkonu,
//        cokół, gzyms); band — pas poziomy przez całą ścianę (z bliska jedna bryła na ścianę, w teksturze w komórce)
// Materiały elementów (m): wall, trim (ramy, parapety), glass, door, slab (płyta balkonu), railing.
import { footprintPoints, edgesOf, holesOf } from './footprint.js';

export const FRAME = 0.06;   // szerokość ramy okna [m]

/** Elementy przęsła piętra (szerokość bw, wysokość piętra fh). */
function bayFeatures(kind, bw, fh, S, wid0) {
  const W = S.window, out = [];
  if (kind === 'pier') return out;
  if (kind === 'balcony') {
    const d = S.balcony.depth, slab = 0.18, rail = 1.0;
    const dw = Math.min(0.9, bw * 0.32), du0 = Math.max(0.25, bw * 0.08);
    out.push({ t: 'open', u0: du0, u1: du0 + dw, v0: slab, v1: Math.min(fh - 0.3, slab + 2.2), depth: W.depth, wid: wid0, mull: 0, transom: null, door: 0, frame: FRAME });
    const wu0 = du0 + dw + 0.3, wu1 = bw - du0;
    if (wu1 - wu0 >= 0.5) out.push({ t: 'open', u0: wu0, u1: wu1, v0: W.sill, v1: W.sill + W.h, depth: W.depth, wid: wid0 + 1, mull: wu1 - wu0 > 1.1 ? 1 : 0, transom: null, door: 0, frame: FRAME });
    out.push({ t: 'box', u0: 0.08, u1: bw - 0.08, v0: 0, v1: slab, z0: 0, z1: d, m: 'slab' });
    out.push({ t: 'box', u0: 0.08, u1: bw - 0.08, v0: slab, v1: slab + rail, z0: d - 0.05, z1: d, m: 'railing' });
    out.push({ t: 'box', u0: 0.08, u1: 0.13, v0: slab, v1: slab + rail, z0: 0, z1: d - 0.05, m: 'railing' });
    out.push({ t: 'box', u0: bw - 0.13, u1: bw - 0.08, v0: slab, v1: slab + rail, z0: 0, z1: d - 0.05, m: 'railing' });
    return out;
  }
  // pasmowe i kurtynowe: między sąsiednimi otworami 6 cm muru (ościeża sąsiadów nie leżą w jednej płaszczyźnie)
  if (W.style === 'curtain') {
    out.push({ t: 'open', u0: 0.03, u1: bw - 0.03, v0: 0.02, v1: fh - 0.32, depth: W.depth, wid: wid0, mull: W.mullions, transom: null, door: 0, frame: 0.05 });
    return out;
  }
  if (W.style === 'ribbon') {
    out.push({ t: 'open', u0: 0.03, u1: bw - 0.03, v0: W.sill, v1: W.sill + W.h, depth: W.depth, wid: wid0, mull: W.mullions, transom: W.transom ? W.h - 0.45 : null, door: 0, frame: 0.05 });
    return out;
  }
  const u0 = (bw - W.w) / 2, u1 = u0 + W.w;
  out.push({ t: 'open', u0, u1, v0: W.sill, v1: W.sill + W.h, depth: W.depth, wid: wid0, mull: W.mullions, transom: W.transom ? Math.max(0.5, W.h - 0.5) : null, door: 0, frame: FRAME });
  out.push({ t: 'box', u0: u0 - 0.07, u1: u1 + 0.07, v0: W.sill - 0.06, v1: W.sill, z0: 0, z1: 0.07, m: 'trim' });
  return out;
}

/** Elementy komórki piętra: przęsła modułu po kolei, pasy między piętrami. */
function upperCell(S) {
  const out = []; let u = 0, wid = 1;
  for (const k of S.module) {
    for (const f of bayFeatures(k, S.bay, S.floorH, S, wid)) { if (f.t === 'open') wid = Math.max(wid, f.wid + 1); out.push(shift(f, u)); }
    u += S.bay;
  }
  if (S.bands.floors) out.push({ t: 'box', u0: 0, u1: u, v0: 0, v1: 0.14, z0: 0, z1: 0.06, m: 'wall', band: true });
  return out;
}
const shift = (f, du) => ({ ...f, u0: f.u0 + du, u1: f.u1 + du });

/** Elementy komórki parteru rodzaju kind (shop, window, glass, wall, door). */
function groundCell(kind, S) {
  const cw = S.bay * S.module.length, gh = S.groundH, fh = S.floorH, W = S.window, out = [];
  const pl = S.bands.plinth;
  if (kind === 'window') {
    let u = 0, wid = 1;
    for (const k of S.module) {
      if (k !== 'pier') {
        const ww = W.style === 'punched' ? W.w : Math.min(S.bay - 0.3, 2.4), u0 = u + (S.bay - ww) / 2;
        const v0 = Math.max(pl + 0.25, gh - fh + W.sill), v1 = Math.min(gh - 0.35, v0 + W.h);
        if (v1 - v0 > 0.4) {
          out.push({ t: 'open', u0, u1: u0 + ww, v0, v1, depth: W.depth, wid: wid++, mull: Math.min(W.mullions, Math.floor(ww / 0.6)), transom: W.transom ? Math.max(0.4, v1 - v0 - 0.5) : null, door: 0, frame: FRAME });
          out.push({ t: 'box', u0: u0 - 0.07, u1: u0 + ww + 0.07, v0: v0 - 0.06, v1: v0, z0: 0, z1: 0.07, m: 'trim' });
        }
      }
      u += S.bay;
    }
  } else if (kind === 'shop') {
    const u0 = 0.35, u1 = cw - 0.35, v0 = Math.max(0.45, pl + 0.1), v1 = gh - 0.75;
    if (u1 - u0 > 0.8) out.push({ t: 'open', u0, u1, v0, v1, depth: 0.22, wid: 1, mull: Math.max(0, Math.round((u1 - u0) / 2.2) - 1), transom: v1 - v0 > 2.2 ? v1 - v0 - 0.5 : null, door: 0, frame: 0.07 });
  } else if (kind === 'glass') {
    const u0 = 0.06, u1 = cw - 0.06, v1 = gh - 0.45;
    out.push({ t: 'open', u0, u1, v0: 0.05, v1, depth: 0.15, wid: 1, mull: Math.max(0, Math.round((u1 - u0) / 1.6) - 1), transom: v1 > 3.4 ? 2.7 : null, door: 0, frame: 0.06 });
  } else if (kind === 'door') {
    const dw = Math.min(1.8, cw - 0.6), u0 = (cw - dw) / 2, v1 = Math.min(3.0, gh - 0.4), dh = Math.min(2.25, v1);
    out.push({ t: 'open', u0, u1: u0 + dw, v0: 0, v1, depth: 0.32, wid: 1, mull: dw >= 1.4 ? 1 : 0, transom: v1 - dh > 0.25 ? dh : null, door: dh, frame: 0.07 });
  }
  // cokół (bez miejsc, gdzie otwór schodzi niżej) i gzyms nad parterem
  if (pl > 0) out.push({ t: 'box', u0: 0, u1: cw, v0: 0, v1: pl, z0: 0, z1: 0.05, m: 'wall', band: true });
  if (S.bands.cornice) {
    out.push({ t: 'box', u0: 0, u1: cw, v0: gh - 0.3, v1: gh - 0.08, z0: 0, z1: 0.12, m: 'wall', band: true });
    out.push({ t: 'box', u0: 0, u1: cw, v0: gh - 0.08, v1: gh, z0: 0, z1: 0.2, m: 'wall', band: true });
  }
  return out;
}

/** Elementy gładkiej ściany jednej kondygnacji (szerokość pw): tylko pasy. */
function plainCell(S) { return S.bands.floors ? [{ t: 'box', u0: 0, u1: 4, v0: 0, v1: 0.14, z0: 0, z1: 0.06, m: 'wall', band: true }] : []; }
export const PLAIN_W = 4;   // szerokość kafelka gładkiej ściany [m]

/** Układ budynku: obrys, krawędzie z modułami i rodzajami parteru, elementy komórek każdego rodzaju. */
export function layout(S) {
  const poly = footprintPoints(S.footprint), holes = holesOf(S.footprint), mw0 = S.bay * S.module.length;
  // ściany: obrys i dziedzińce (każdy pierścień osobno — sąsiedztwo krawędzi w obrębie pierścienia)
  const ringsE = [poly, ...holes].map((r) => edgesOf(r)), edges = [];
  for (const re of ringsE) for (let k = 0; k < re.length; k++) { const e = re[k]; e.i = edges.length; e.prevE = re[(k - 1 + re.length) % re.length]; e.nextE = re[(k + 1) % re.length]; edges.push(e); }
  const front = Math.min(S.front, edges.length - 1), H = S.groundH + (S.floors - 1) * S.floorH + S.attic;
  let along = 0;
  for (const e of edges) {
    let n = Math.round(e.len / mw0);
    if (n < 1) n = e.len >= mw0 * 0.75 ? 1 : 0;
    e.n = n; e.s = n ? e.len / (n * mw0) : 1; e.mw = n ? e.len / n : e.len; e.plain = !n; e.along = along; along += e.len;
    const gk = e.i === front ? S.ground.front : S.ground.sides;
    e.ground = Array.from({ length: n }, () => gk);
    if (e.i === front && n) {
      const k = Math.min(S.ground.entrances, n);
      for (let j = 0; j < k; j++) e.ground[Math.min(n - 1, Math.round((j + 0.5) * n / k - 0.5))] = 'door';
    }
    // wierzchołki: wypukły (gzymsy wydłużone, żeby róg był pełny) czy wklęsły
    const prev = e.prevE;
    e.convex0 = prev.dir[0] * e.dir[1] - prev.dir[1] * e.dir[0] > 0;
  }
  edges.forEach((e) => { e.convex1 = e.nextE.convex0; });
  for (const e of edges) { delete e.prevE; delete e.nextE; }
  const cells = { upper: upperCell(S), plain: plainCell(S) };
  for (const e of edges) for (const k of e.ground) if (!cells['g:' + k]) cells['g:' + k] = groundCell(k, S);
  if ((edges.some((e) => e.plain) || S.attic > 0) && !cells.plain) cells.plain = plainCell(S);
  if (edges.some((e) => e.plain) && !cells['g:wall']) cells['g:wall'] = groundCell('wall', S);   // parter gładkiej ściany
  return { S, poly, holes, edges, front, H, mw0, cells, perimeter: along };
}

/** Kafelki tekstur: rodzaj komórki → szerokość i wysokość [m] (moduł × kondygnacja). */
export function tileSize(L, key) {
  if (key === 'plain') return [PLAIN_W, L.S.floorH];
  return [L.mw0, key === 'upper' ? L.S.floorH : L.S.groundH];
}
/** Zakres głębokości elementów komórki: [najgłębiej, najdalej przed licem] (m). */
export function depthRange(feats) {
  let lo = 0, hi = 0;
  for (const f of feats) { if (f.t === 'open') lo = Math.min(lo, -f.depth); else hi = Math.max(hi, f.z1); }
  return [lo, hi];
}

/** Liczba z ziarna, jednakowa w JS i w shaderze (facade-material.js): 0…1. Komórka okna: ziarno, ściana, moduł, kondygnacja·16 + okno. */
export function cellHash(a, b, c, d) {
  let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791) ^ Math.imul(d, 2654435761 | 0)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0; h ^= h >>> 16;
  return (h & 0xffffff) / 16777216;
}
/** Okno świeci nocą? 0 — nie, 1…3 — barwa światła (ciepła, neutralna, chłodna). */
export function windowLight(seed, edge, module, floor, wid, lit) {
  if (cellHash(seed, edge, module, floor * 16 + wid) >= lit) return 0;
  const k = cellHash(seed + 7919, edge, module, floor * 16 + wid);
  return k < 0.6 ? 1 : k < 0.88 ? 2 : 3;
}

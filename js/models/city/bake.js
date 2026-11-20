// CityKit — wypalanie fasad: każdy rodzaj komórki (moduł piętra, gładka ściana, komórki parteru: witryna, okna,
// przeszklenie, wejście, mur) rysowany z tych samych elementów co wersja bliska (layout.js) do map w rzucie na lico
// muru, na procesorze, bez WebGL (to samo w laboratorium, edytorze i grze; można zapisać i wczytać):
//   albedo  RGB barwa (sRGB), A — 1 na murze (maska muru)
//   nh      RGB normalna w przestrzeni stycznej (z różnic wysokości + faktura muru MatKit), A — wysokość 0…1
//           (0 — najgłębiej we wnęce, 1 — najdalej przed licem; zakres zlo…zhi w metrach)
//   orm     R zacienienie (AO), G szorstkość, B metaliczność, A — numer okna ×16 (0 — nie szyba): które świeci nocą
// Rozdzielczość: px na metr (domyślnie 64; jakość tekstur silnika — js/render/quality.js — niska: połowa).
import { generate } from '../../render/materials/matkit.js';
import { tileSize, depthRange } from './layout.js';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// barwa, szorstkość, metaliczność materiałów elementów (mur — z MatKit)
export function matTable(S) {
  return {
    trim: { c: hex(S.window.frame), r: 0.45, m: 0.1 },
    glass: { c: hex(S.window.glass), r: 0.06, m: 0.5 },
    door: { c: hex(S.ground.door), r: 0.55, m: 0.05 },
    slab: { c: hex('#a7a39a'), r: 0.9, m: 0 },
    railing: { c: hex(S.balcony.railing), r: 0.45, m: 0.5 },
  };
}

const wallCache = new Map();
/** Mapy muru MatKit (pamiętane po opisie i rozdzielczości). */
export function wallMaps(def, res = 256) {
  const k = JSON.stringify(def) + '|' + res;
  let m = wallCache.get(k); if (!m) { m = generate(def, res); wallCache.set(k, m); if (wallCache.size > 12) wallCache.delete(wallCache.keys().next().value); }
  return m;
}

/** Kafelek komórki key: mapy (Uint8Array RGBA) i wymiary. */
export function bakeTile(L, key, { ppm = 64 } = {}) {
  const S = L.S, feats = L.cells[key] || [], [wm, hm] = tileSize(L, key);
  const w = Math.max(8, Math.round(wm * ppm / 4) * 4), h = Math.max(8, Math.round(hm * ppm / 4) * 4), N = w * h;
  const [zlo0, zhi0] = depthRange(feats), zlo = zlo0, zhi = Math.max(zhi0, zlo + 0.01);
  const M = matTable(S), wall = wallMaps(S.wall, 256), wr = wall.res, tile = S.wall.tile || 2;
  const Z = new Float32Array(N), Zn = new Float32Array(N), ID = new Uint8Array(N), MAT = new Array(N);
  const albedo = new Uint8Array(N * 4), nh = new Uint8Array(N * 4), orm = new Uint8Array(N * 4);
  const opens = feats.filter((f) => f.t === 'open'), boxes = feats.filter((f) => f.t === 'box');
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const u = (x + 0.5) * wm / w, v = (y + 0.5) * hm / h;
    let z = 0, m = 'wall', wid = 0;
    for (const o of opens) {
      if (u < o.u0 || u > o.u1 || v < o.v0 || v > o.v1) continue;
      const fw = o.frame, fz = -o.depth + 0.07;
      z = -o.depth; m = 'glass'; wid = o.wid;
      let frame = u - o.u0 < fw || o.u1 - u < fw || o.v1 - v < fw || (!o.door && v - o.v0 < fw);
      for (let j = 1; j <= o.mull; j++) if (Math.abs(u - (o.u0 + (o.u1 - o.u0) * j / (o.mull + 1))) < fw / 2) frame = true;
      if (o.transom != null && Math.abs(v - (o.v0 + o.transom)) < fw / 2 && u - o.u0 > fw && o.u1 - u > fw) frame = true;
      if (frame) { z = fz; m = 'trim'; wid = 0; } else if (o.door && v < o.v0 + o.door) { z = -o.depth + 0.035; m = 'door'; wid = 0; }
    }
    for (const b of boxes) if (u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1 && b.z1 > z) { z = b.z1; m = b.m; wid = 0; }
    Z[i] = z; MAT[i] = m; ID[i] = wid;
    if (m === 'wall') {   // faktura muru: barwa, szorstkość, AO i drobna rzeźba z MatKit (kafelek w metrach)
      const tx = ((Math.floor(u / tile * wr) % wr) + wr) % wr, ty = ((Math.floor(v / tile * wr) % wr) + wr) % wr, k = ty * wr + tx;
      albedo[i * 4] = wall.albedo[k * 4]; albedo[i * 4 + 1] = wall.albedo[k * 4 + 1]; albedo[i * 4 + 2] = wall.albedo[k * 4 + 2]; albedo[i * 4 + 3] = 255;
      orm[i * 4] = wall.ao[k] * 255; orm[i * 4 + 1] = wall.rough[k] * 255; orm[i * 4 + 2] = wall.metal[k] * 255;
      Zn[i] = z + (wall.height[k] - 0.5) * 0.008 * (wall.def.bump || 1);
    } else {
      const t = M[m] || M.trim;
      albedo[i * 4] = t.c[0]; albedo[i * 4 + 1] = t.c[1]; albedo[i * 4 + 2] = t.c[2]; albedo[i * 4 + 3] = 0;
      orm[i * 4] = 255; orm[i * 4 + 1] = t.r * 255; orm[i * 4 + 2] = t.m * 255;
      Zn[i] = z;
    }
    orm[i * 4 + 3] = wid * 16;
  }
  const wrap = key === 'upper' || key === 'plain' || key === 'g:wall';
  const at = (A, x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); }
    return A[y * w + x];
  };
  // normalne z różnic wysokości (metry na piksel) i wysokość do paralaksy
  const px = wm / w, py = hm / h;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const gx = (at(Zn, x + 1, y) - at(Zn, x - 1, y)) / (2 * px), gy = (at(Zn, x, y + 1) - at(Zn, x, y - 1)) / (2 * py), l = Math.hypot(gx, gy, 1);
    nh[i * 4] = (-gx / l * 0.5 + 0.5) * 255; nh[i * 4 + 1] = (-gy / l * 0.5 + 0.5) * 255; nh[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255;
    nh[i * 4 + 3] = clamp((Z[i] - zlo) / (zhi - zlo)) * 255;
  }
  // zacienienie: zagłębienia względem średniej wysokości sąsiedztwa (ok. 0,2 m) — wnęki okien, pod gzymsami
  const R = Math.max(2, Math.round(0.2 / px)), tmp = new Float32Array(N), avg = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let d = -R; d <= R; d++) s += at(Z, x + d, y); tmp[y * w + x] = s / (2 * R + 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let d = -R; d <= R; d++) s += at(tmp, x, y + d); avg[y * w + x] = s / (2 * R + 1); }
  for (let i = 0; i < N; i++) orm[i * 4] = orm[i * 4] * clamp(1 - Math.max(0, avg[i] - Z[i]) * 2.2, 0.35, 1);
  return { key, w, h, wm, hm, zlo, zhi, albedo, nh, orm };
}

/** Wszystkie kafelki budynku (rodzaje komórek z układu). */
export function bakeAll(L, opts) {
  const t0 = performance.now(), keys = Object.keys(L.cells).filter((k) => k !== 'plain' || L.edges.some((e) => e.plain) );
  if (L.S.floors < 2) { const i = keys.indexOf('upper'); if (i >= 0) keys.splice(i, 1); }
  const tiles = Object.fromEntries(keys.map((k) => [k, bakeTile(L, k, opts)]));
  return { tiles, ms: Math.round(performance.now() - t0), bytes: Object.values(tiles).reduce((s, t) => s + t.w * t.h * 12, 0) };
}

// RegionKit: one world, several kinds of water. A region map says, for every point of the map, how much of each water
// body is there (ocean, fjord, lake, river, harbour water, ice) and which way and how fast the water flows; the sea
// shader blends the bodies' looks, waves, ripples, foam, oil and ice cover by those weights, so a river runs into the
// sea through a brackish plume, a lake reaches the sea down a canal, a fjord opens over its sill, a harbour lies calm
// behind a spit and loose floes thicken into pack ice — with no seams.
//  generateWorld(map, water)  heights (the LandKit format, so the terrain, the sea's shallows and sampleHeight work) plus
//                             the region map, from a layout: one body everywhere, five hand-shaped layouts, or "mixed":
//                             LandKit terrain classified automatically (open sea, enclosed lakes, narrow inlets between
//                             high ground = fjords) with rivers carved from the hills to the sea and an ice edge.
//  regionTextures(T)          two RGBA8 textures: weights of the six bodies, and the flow (x, z).
//  regionUniforms(T, tex)     the textures and every body's look and behaviour for the shader (GLSL_REGIONS).
//  regionAt(T, x, z)          the same blend in JS (for the ship: waves, current, what water it is in).
// Units: metres; the map uses LandKit's coordinates (map = world + uLandOff).
// Built to grow: the weights are layers by name, so land biomes (desert, tundra, tropical…) can follow as another set
// of layers driving the terrain's palette, and another planet is a bundle of sky, water and biome palettes.
import * as THREE from '../../../vendor/three/three.module.js';
import { fbm, generateTerrain } from './landkit.js';
import { WATER_BODIES, LOOKS } from '../water/waterkit.js';

export const BODY_ORDER = ['ocean', 'fjord', 'lake', 'river', 'harbour', 'ice'];
const NB = BODY_ORDER.length;
export const FLOW_MAX = 2.5;                                        // m/s at full scale of the flow texture
// how much of the open sea's waves reach each body (the rest is sheltered: by walls, banks, a spit, the ice)
const WAVES = { ocean: 1, fjord: 0.12, lake: 0.3, river: 0.1, harbour: 0.15, ice: 0.6 };
// chart colours (r, g, b)
export const CHART = { ocean: [36, 86, 128], fjord: [18, 52, 68], lake: [64, 104, 74], river: [128, 120, 72], harbour: [92, 96, 84], ice: [214, 226, 234] };

export const LAYOUTS = {
  single: { label: 'One water body everywhere (terrain from the generator)' },
  estuary: { label: 'River mouth: river, estuary, brackish plume, sea' },
  lake: { label: 'Lake with a canal to the sea' },
  fjord: { label: 'Fjord entrance over a sill, skerries' },
  harbour: { label: 'Sheltered bay behind a spit' },
  iceEdge: { label: 'Ice edge: open sea, loose floes, pack ice' },
  mixed: { label: 'Mixed from the seed: lakes, fjords, rivers, ice' },
};
export const WORLD_DEFAULTS = { layout: 'estuary', body: 'ocean', blend: 400, rivers: 3, ice: 0, biome: 'temperate', biomeBlend: 1200 };

// Land biomes: a second set of region weights (temperate, plains, desert, one spare) shaping the land's heights and the
// terrain's palette (LandKit reads the texture). Plants and rocks as objects belong to their own labs, not here.
export const BIOME_ORDER = ['temperate', 'plains', 'desert'];
export const BIOMES = {
  temperate: { label: 'Northern (grass, heather, rock, snow on the peaks)' },
  plains: { label: 'Plains (flat, gently rolling lowland, meadows and fields)' },
  desert: { label: 'Desert (dunes, stony plateaus, mesas with cliffs)' },
  zones: { label: 'Zones: northern, plains and desert by region' },
};
export const BIOME_CHART = { temperate: null, plains: [104, 128, 60], desert: [196, 160, 108] };

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
// sea floor offshore (c metres from the coast) and a beach rising inland, capped by the land height L
function coastH(c, L, depth) {
  if (c >= 0) return -(0.8 + 3 * sm(0, 150, c) + (depth - 3.8) * Math.pow(sm(0, 3200, c), 0.8));
  return Math.min(L, 0.4 + -c * 0.03);
}

/* ---------------- layouts: heights and raw weights (before the transition blur) ---------------- */
// each returns { h, w (NB per texel), flow (2 per texel), labels: [[text, x, z]] }; u, v in 0..1 across the map
const LAYOUT_FN = {
  estuary(N, S, o) {
    const h = new Float32Array(N * N), w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), seed = o.seed | 0;
    const xr = (v) => 0.5 + 0.07 * Math.sin(2 * Math.PI * v * 1.3 + 0.8) + 0.035 * fbm(0.5, v, 3, 4, 0.5, seed + 3);
    const zcAt = (u) => 0.64 + 0.03 * fbm(u, 0.37, 3, 4, 0.5, seed);
    const zm = zcAt(xr(0.64)), xm = xr(zm);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, k = j * N + i, zc = zcAt(u);
      const t = sm(zc - 0.2, zc, v), wd = 70 + 520 * t * t, d = Math.abs(u - xr(v)) * S, c = (v - zc) * S;
      const n = fbm(u, v, 4, 6, 0.5, seed + 1), n2 = fbm(u, v, 9, 4, 0.5, seed + 2);
      // meadows on the flood plain (above the beach line), hills further out; the banks come down in a short slope
      let L = 6 + 3 * sm(wd, wd + 500, d) + o.relief * 0.45 * sm(wd + 300, wd + 2600, d) * (0.55 + 0.45 * n) + 4 * n2;
      L = Math.min(L, 0.8 + Math.max(0, d - wd * 1.15) * 0.06);
      let y = coastH(c, L, o.depth);
      // the channel runs on past the coast and fades into the sea floor (no step at the mouth)
      const out = sm(zc, zc + 0.035, v), inR = v < zc + 0.035 && d < wd * 1.15;
      if (inR) y = Math.min(y, -(1.2 + (3.5 + 6 * t) * (1 - (d / (wd * 1.15)) ** 2)) * (1 - out) + y * out);
      h[k] = y;
      const dp = Math.hypot((u - xm) * S, (v - zm) * S), plume = v > zm - 0.03 ? 0.7 * (1 - sm(150, 1900, dp)) : 0;
      const riv = Math.max(v < zc + 0.004 ? (1 - sm(wd * 1.1, wd * 1.6, d)) * (1 - 0.45 * t) : 0, plume);
      w[k * NB + 3] = riv; w[k * NB + 0] = 1 - riv;
      if (inR) {                                                      // downstream along the centre line, slowing in the estuary
        const e = 0.002, dx = (xr(v + e) - xr(v - e)) / (2 * e), l = Math.hypot(dx, 1), sp = 1.7 - 1.2 * t;
        flow[k * 2] = dx / l * sp; flow[k * 2 + 1] = 1 / l * sp;
      } else if (plume > 0.01 && dp > 1) {                            // the plume spreads out from the mouth
        const sp = 0.4 * (1 - sm(150, 1900, dp)); flow[k * 2] = (u - xm) * S / dp * sp; flow[k * 2 + 1] = (v - zm) * S / dp * sp;
      }
    }
    return { h, w, flow, labels: [['River', xr(0.3) * S, 0.3 * S], ['Estuary', xr(zm - 0.06) * S, (zm - 0.06) * S], ['Plume', xm * S, (zm + 0.09) * S], ['Open sea', 0.5 * S, 0.9 * S]] };
  },
  lake(N, S, o) {
    const h = new Float32Array(N * N), w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), seed = o.seed | 0;
    const cx = 0.36, cy = 0.46, rx = 0.2, ry = 0.15;
    const ucAt = (v) => 0.8 + 0.025 * fbm(0.2, v, 3, 4, 0.5, seed);
    const vcan = (u) => cy + 0.025 * sm(0.58, 0.68, u);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, k = j * N + i, uc = ucAt(v), c = (u - uc) * S;
      const a = Math.atan2(v - cy, u - cx), rk = 1 + 0.18 * fbm(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5, 3, 4, 0.5, seed + 5);
      const e = Math.hypot((u - cx) / (rx * rk), (v - cy) / (ry * rk)), dl = Math.max(0, e - 1) * ry * rk * S;
      const inCanalU = u > cx + rx * 0.7 && u < uc + 0.03, dc = inCanalU ? Math.abs(v - vcan(u)) * S : 1e9;
      const n = fbm(u, v, 4, 6, 0.5, seed + 1), n2 = fbm(u, v, 9, 4, 0.5, seed + 2), near = Math.min(dl, dc);
      const L = Math.min(6 + 2 * sm(0, 300, near) + o.relief * 0.3 * sm(200, 2200, near) * (0.6 + 0.4 * n) + 4 * n2, 0.8 + near * 0.06);
      let y = coastH(c, L, o.depth);
      if (e < 1) y = Math.min(y, -(1 + 24 * Math.pow(1 - e, 0.6)) + n2 * 1.5);
      if (dc < 60) {                                                                  // dredged canal: flat bed, 1:1.3 banks, fading into the sea floor offshore
        const bed = -7.5 + Math.max(0, dc - 35) * 0.75, f = sm(uc, uc + 0.03, u);
        y = Math.min(y, bed * (1 - f) + y * f);
      }
      h[k] = y;
      let lake = e < 1.08 ? 1 : 0;
      if (dc < 90) { const s = sm(uc - 0.12, uc + 0.01, u); lake = 1 - s; flow[k * 2] = 0.35 * (dc < 45 ? 1 : 0); }
      w[k * NB + 2] = lake; w[k * NB + 0] = 1 - lake;
    }
    return { h, w, flow, labels: [['Lake', cx * S, cy * S], ['Canal', 0.66 * S, (vcan(0.66) - 0.03) * S], ['Open sea', 0.9 * S, 0.5 * S]] };
  },
  fjord(N, S, o) {
    const h = new Float32Array(N * N), w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), seed = o.seed | 0;
    const ucAt = (v) => 0.2 + 0.03 * fbm(0.3, v, 3, 4, 0.5, seed);
    const vf = (u) => 0.5 + 0.09 * Math.sin(Math.PI * (u - 0.2) * 2.4) + 0.03 * fbm(u, 0.5, 3, 4, 0.5, seed + 4);
    const uh = 0.9, wall = Math.max(o.relief, 500), basin = Math.max(o.depth, 160);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, k = j * N + i, uc = ucAt(v), c = (uc - u) * S;
      const wd = 420 - 160 * sm(uc, uh, u), dv = Math.abs(v - vf(Math.min(u, uh))) * S, d = u > uh ? Math.hypot((u - uh) * S, dv) : dv;
      const n = fbm(u, v, 4, 6, 0.5, seed + 1), n2 = fbm(u, v, 7, 5, 0.5, seed + 2, true);
      let L = 4 + wall * sm(wd, wd + 420, d) * (0.7 + 0.3 * n) + wall * 0.25 * Math.max(0, n2) * sm(wd, wd + 1500, d);
      L *= 0.35 + 0.65 * sm(uc, uc + 0.12, u);
      let y = coastH(c, L, o.depth);
      if (u > uc - 0.05 && d < wd) {
        const along = basin + (38 - basin) * (1 - sm(uc + 0.03, uc + 0.09, u));         // a sill at the mouth, the deep basin inside
        const bed = -(3 + (along - 3) * Math.sqrt(1 - (d / wd) ** 2) * (1 - 0.8 * sm(uh - 0.08, uh + 0.02, u))), f = sm(uc - 0.05, uc + 0.01, u);
        y = Math.min(y, y + (bed - y) * f);                                               // the inlet deepens gradually from the sea floor
      }
      if (c > 0 && c < 2200) { const r = fbm(u, v, 24, 4, 0.5, seed + 9); if (r > 0.42) y = Math.max(y, 1 + (r - 0.42) * 90); }   // skerries
      h[k] = y;
      const fj = u > uc ? sm(uc + 0.02, uc + 0.1, u) * (1 - sm(wd * 1.2, wd * 1.8, d)) : 0;
      w[k * NB + 1] = fj; w[k * NB + 0] = 1 - fj;
    }
    return { h, w, flow, labels: [['Fjord', 0.6 * S, (vf(0.6) - 0.07) * S], ['Sill', 0.27 * S, (vf(0.27) + 0.08) * S], ['Skerries', 0.1 * S, 0.3 * S], ['Open sea', 0.06 * S, 0.8 * S]] };
  },
  harbour(N, S, o) {
    const h = new Float32Array(N * N), w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), seed = o.seed | 0;
    const vcAt = (u) => 0.52 + 0.02 * fbm(u, 0.4, 3, 4, 0.5, seed);
    const bx = 0.5, rb = 0.15, vc0 = vcAt(bx), vs = (u) => vc0 + 0.012 + 0.008 * Math.sin((u - 0.4) * 9);
    const gap0 = 0.35, gap1 = 0.385, spitEnd = 0.665;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, k = j * N + i, vc = vcAt(u), c = (v - vc) * S;
      const db = Math.hypot(u - bx, v - vc0) * S, inBay = db < rb * S && v < vs(u);
      const n = fbm(u, v, 4, 6, 0.5, seed + 1), n2 = fbm(u, v, 11, 4, 0.5, seed + 2);
      const L = Math.min(6 + o.relief * 0.3 * sm(150, 2600, Math.min(-c, db - rb * S)) * (0.6 + 0.4 * n) + 3 * n2, 0.8 + Math.max(0, db - rb * S) * 0.06);
      let y = coastH(c, L, o.depth);
      if (db < rb * S) { const f = 1 - sm(vc0 + 0.005, vc0 + 0.035, v), bed = -(1 + 10 * sm(0, 350, rb * S - db)) + n2; y = Math.min(y, y + (bed - y) * f); }   // the bay, dredged to 11 m
      const ds = Math.abs(v - vs(u)) * S;
      if (u > gap1 && u < spitEnd + 0.03) {                                            // the spit: low dunes, sandy slopes into the water
        const end = sm(gap1, gap1 + 0.012, u) * (1 - sm(spitEnd, spitEnd + 0.03, u)), top = ds < 80 ? 1.2 + 4 * (1 - (ds / 80) ** 2) + 2.5 * Math.max(0, n2) : 1.2 - (ds - 80) * 0.045;
        y = Math.max(y, top - (1 - end) * 9);
      }
      h[k] = y;
      const hb = inBay ? 1 : 0;
      w[k * NB + 4] = hb; w[k * NB + 0] = 1 - hb;
    }
    return { h, w, flow, labels: [['Harbour', bx * S, (vc0 - 0.07) * S], ['Entrance', (gap0 + gap1) / 2 * S, (vs(0.37) + 0.035) * S], ['Spit', 0.55 * S, (vs(0.55) + 0.03) * S], ['Open sea', 0.5 * S, 0.85 * S]] };
  },
  iceEdge(N, S, o) {
    const h = new Float32Array(N * N), w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), seed = o.seed | 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N, k = j * N + i;
      const n = fbm(u, v, 5, 7, 0.5, seed);
      h[k] = n > 0.36 ? 0.5 + (n - 0.36) * o.relief * 1.4 : -(0.8 + (o.depth - 0.8) * sm(0.36, 0.0, n));
      let ice = sm(0.3, 0.72, (1 - v) + 0.12 * fbm(u, v, 4, 5, 0.5, seed + 4));
      ice *= 1 - 0.85 * sm(0.5, 0.7, fbm(u, v, 6, 4, 0.5, seed + 8));                  // polynyas: open leads in the pack
      w[k * NB + 5] = ice; w[k * NB + 0] = 1 - ice;
    }
    return { h, w, flow, labels: [['Pack ice', 0.5 * S, 0.1 * S], ['Ice edge', 0.3 * S, 0.5 * S], ['Open sea', 0.6 * S, 0.9 * S]] };
  },
};

/* ---------------- mixed: LandKit terrain, classified, with rivers and an ice edge ---------------- */
function mixed(T, o) {
  const N = T.res, S = T.size, cell = T.cell, h = T.h, wrapI = (i) => (T.wrap ? ((i % N) + N) % N : i);
  const w = new Float32Array(N * N * NB), flow = new Float32Array(N * N * 2), labels = [];
  const inside = (i, j) => T.wrap || (i >= 0 && j >= 0 && i < N && j < N);
  // 1. water components: the largest is the sea, the others are lakes
  const comp = new Int32Array(N * N).fill(-1), sizes = [];
  for (let k = 0; k < N * N; k++) {
    if (h[k] >= 0 || comp[k] >= 0) continue;
    const id = sizes.length, q = [k]; comp[k] = id; let n = 0;
    while (q.length) {
      const p = q.pop(); n++; const pi = p % N, pj = (p / N) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = pi + di, jj = pj + dj; if (!inside(ii, jj)) continue;
        const q2 = wrapI(jj) * N + wrapI(ii); if (h[q2] < 0 && comp[q2] < 0) { comp[q2] = id; q.push(q2); }
      }
    }
    sizes.push(n);
  }
  const sea = sizes.length ? sizes.indexOf(Math.max(...sizes)) : -1;
  // 2. distance from water to land (chamfer, metres) and the highest land within ~700 m
  const dist = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) dist[k] = h[k] >= 0 ? 0 : 1e9;
  const pass = (fwd) => {
    for (let jj = 0; jj < N; jj++) for (let ii = 0; ii < N; ii++) {
      const j = fwd ? jj : N - 1 - jj, i = fwd ? ii : N - 1 - ii, k = j * N + i; if (dist[k] === 0) continue;
      for (const [di, dj, c] of (fwd ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]])) {
        const a = i + di, b = j + dj; if (!inside(a, b)) continue;
        const v = dist[wrapI(b) * N + wrapI(a)] + c * cell; if (v < dist[k]) dist[k] = v;
      }
    }
  };
  pass(true); pass(false); pass(true); pass(false);
  const R = Math.max(2, Math.round(700 / cell)), hl = new Float32Array(N * N), tmp = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) hl[k] = Math.max(0, h[k]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let m = 0; for (let d = -R; d <= R; d += 2) { const a = i + d; if (!inside(a, j)) continue; m = Math.max(m, hl[j * N + wrapI(a)]); } tmp[j * N + i] = m; }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let m = 0; for (let d = -R; d <= R; d += 2) { const b = j + d; if (!inside(i, b)) continue; m = Math.max(m, tmp[wrapI(b) * N + i]); } hl[j * N + i] = m; }
  for (let k = 0; k < N * N; k++) {
    if (h[k] >= 0) continue;
    if (comp[k] !== sea) { w[k * NB + 2] = 1; continue; }
    const fj = (1 - sm(300, 1000, dist[k])) * sm(150, 400, hl[k]);
    w[k * NB + 1] = fj; w[k * NB + 0] = 1 - fj;
  }
  sizes.forEach((n, id) => { if (id !== sea && n * cell * cell > 2e5) { const k = comp.indexOf(id); labels.push(['Lake', (k % N + 0.5) * cell, ((k / N | 0) + 0.5) * cell]); } });
  // 3. rivers: from the hills down the distance-to-the-sea field, carved into the land, with their current
  if (o.rivers > 0 && sea >= 0) {
    const h0 = Float32Array.from(h);
    // distance to the sea in texels (chamfer, so the way down has no grid bias)
    const ds = new Float32Array(N * N).fill(1e9);
    for (let k = 0; k < N * N; k++) if (comp[k] === sea) ds[k] = 0;
    const pass2 = (fwd) => {
      for (let jj = 0; jj < N; jj++) for (let ii = 0; ii < N; ii++) {
        const j = fwd ? jj : N - 1 - jj, i = fwd ? ii : N - 1 - ii, k = j * N + i; if (ds[k] === 0) continue;
        for (const [di, dj, c] of (fwd ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]])) {
          const a = i + di, b = j + dj; if (!inside(a, b)) continue;
          const v = ds[wrapI(b) * N + wrapI(a)] + c; if (v < ds[k]) ds[k] = v;
        }
      }
    };
    pass2(true); pass2(false); pass2(true); pass2(false);
    let hMax = 0; for (let k = 0; k < N * N; k++) hMax = Math.max(hMax, h[k]);
    const r = rng(o.seed * 7 + 3), cands = [];
    for (let k = 0; k < N * N; k += 7) if (h[k] > 0.25 * hMax && ds[k] * cell > 900 && ds[k] < 1e8) cands.push(k);
    // walk downhill in the distance to the sea, swung from side to side (a meander of amplitude amp, radians);
    // returns the path, or null if it never got to the sea
    const walk = (sx, sz, amp, ri) => {
      const path = [[sx, sz]], visited = new Set([sz * N + sx]); let x = sx, z = sz;
      const ph = r() * 6.28, per = 14 + r() * 12;
      for (let step = 0; step < N * 3; step++) {
        const k = wrapI(z) * N + wrapI(x); if (comp[k] === sea) return path;
        const at = (a, b) => { const v = ds[wrapI(b) * N + wrapI(a)]; return v > 1e8 ? ds[k] : v; };
        const gx = at(x - 6, z) - at(x + 6, z), gz = at(x, z - 6) - at(x, z + 6);
        const head = Math.atan2(gz, gx) + amp * (Math.sin(step / per + ph) + 0.5 * fbm(x / N, z / N, 6, 3, 0.5, o.seed + ri * 13));
        let best = null, bv = Infinity;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const a = x + di, b = z + dj; if (!inside(a, b) || visited.has(wrapI(b) * N + wrapI(a))) continue;
          const v = (ds[wrapI(b) * N + wrapI(a)] - ds[k]) * 0.5 + 1.5 * (1 - Math.cos(Math.atan2(dj, di) - head)) + r() * 0.25; if (v < bv) { bv = v; best = [a, b]; }
        }
        if (!best) return null; x = best[0]; z = best[1]; path.push([x, z]); visited.add(wrapI(z) * N + wrapI(x));
      }
      return null;
    };
    const sources = [], paths = [];
    for (let t = 0; t < 400 && paths.length < o.rivers && cands.length; t++) {
      const k = cands[Math.floor(r() * cands.length)], x = k % N, z = (k / N) | 0;
      if (!sources.every((s) => Math.hypot(s[0] - x, s[1] - z) * cell > 2200)) continue;
      let path = null;
      for (const amp of [1.05, 0.55, 0]) { path = walk(x, z, amp, paths.length); if (path) break; }    // less meander if it got lost
      if (path) { sources.push([x, z]); paths.push(path); }
    }
    paths.forEach((path, ri) => {
      // smooth the path, then carve and paint: width and depth grow downstream, the current slows towards the mouth;
      // the valley's sides blend from the river down from the original ground (h0), so carving twice changes nothing
      const P = path.map((_, i) => { let ax = 0, az = 0, n = 0; for (let d = -3; d <= 3; d++) { const p = path[clamp(i + d, 0, path.length - 1)]; ax += p[0]; az += p[1]; n++; } return [ax / n, az / n]; });
      for (let i = 0; i < P.length; i++) {
        const f = i / Math.max(1, P.length - 1), wd = 28 + 90 * f, dep = 2.2 + 4 * f, sp = 1.9 - 1.0 * f;
        const a = P[Math.max(0, i - 2)], b = P[Math.min(P.length - 1, i + 2)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
        const VAL = 650, rr = Math.ceil((wd + VAL) / cell), [cx, cz] = P[i];
        for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
          const gi = Math.round(cx) + di, gj = Math.round(cz) + dj; if (!inside(gi, gj)) continue;
          const k = wrapI(gj) * N + wrapI(gi), d = Math.hypot(gi - cx, gj - cz) * cell;
          if (d < wd) h[k] = Math.min(h[k], -(1 + dep * (1 - (d / wd) ** 2)));
          else if (d < wd + VAL && h0[k] > 0) { const f = sm(wd + VAL, wd + 40, d); h[k] = Math.min(h[k], h0[k] + (Math.min(1.2 + (d - wd) * 0.05, 3.5 + (d - wd) * 0.02) - h0[k]) * f); }   // the valley
          if (d < wd * 1.2 && comp[k] !== sea) {
            const kk = k * NB; for (let c = 0; c < NB; c++) w[kk + c] = 0; w[kk + 3] = 1;
            flow[k * 2] = tx / tl * sp; flow[k * 2 + 1] = tz / tl * sp;
          }
        }
      }
      const m = P[Math.floor(P.length * 0.4)]; if (m) labels.push([`River ${ri + 1}`, m[0] * cell, m[1] * cell]);
    });
  }
  // 4. an ice edge from the north (the top of the chart)
  if (o.ice > 0) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    if (h[k] >= 0 || w[k * NB + 3] > 0) continue;
    const ice = sm(1 - o.ice - 0.12, 1 - o.ice + 0.12, (1 - v) + 0.1 * fbm(u, v, 4, 5, 0.5, o.seed + 4)) * (comp[k] === sea ? 1 : 0.6);
    for (let c = 0; c < NB; c++) w[k * NB + c] *= 1 - ice;
    w[k * NB + 5] += ice;
  }
  if (o.ice > 0) labels.push(['Pack ice', 0.5 * S, 0.06 * S]);
  if (sea >= 0) { let k = 0, best = -1; for (let q = 0; q < N * N; q += 13) if (comp[q] === sea && dist[q] > best && w[q * NB] > 0.9) { best = dist[q]; k = q; } labels.push(['Open sea', (k % N + 0.5) * cell, ((k / N | 0) + 0.5) * cell]); }
  return { w, flow, labels };
}

/* ---------------- transitions: land takes its nearest water's weights, then everything is blurred ---------------- */
function fillLand(T, w, flow) {
  const N = T.res, h = T.h, seen = new Uint8Array(N * N), q = [];
  for (let k = 0; k < N * N; k++) if (h[k] < 0) { seen[k] = 1; q.push(k); }
  if (!q.length) { for (let k = 0; k < N * N; k++) w[k * NB] = 1; return; }
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi], pi = p % N, pj = (p / N) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let a = pi + di, b = pj + dj;
      if (T.wrap) { a = (a + N) % N; b = (b + N) % N; } else if (a < 0 || b < 0 || a >= N || b >= N) continue;
      const p2 = b * N + a; if (seen[p2]) continue; seen[p2] = 1;
      for (let c = 0; c < NB; c++) w[p2 * NB + c] = w[p * NB + c];
      flow[p2 * 2] = 0; flow[p2 * 2 + 1] = 0; q.push(p2);
    }
  }
}
function boxBlur(a, N, C, r, wrap) {
  if (r < 1) return;
  const line = new Float32Array(N * C), out = new Float32Array(N * C);
  const run = (get, set) => {
    for (let l = 0; l < N; l++) {
      for (let i = 0; i < N; i++) for (let c = 0; c < C; c++) line[i * C + c] = a[get(l, i) * C + c];
      for (let c = 0; c < C; c++) {
        let s = 0; const at = (i) => line[(wrap ? ((i % N) + N) % N : clamp(i, 0, N - 1)) * C + c];
        for (let i = -r; i <= r; i++) s += at(i);
        for (let i = 0; i < N; i++) { out[i * C + c] = s / (2 * r + 1); s += at(i + r + 1) - at(i - r); }
      }
      for (let i = 0; i < N; i++) for (let c = 0; c < C; c++) a[get(l, i) * C + c] = out[i * C + c];
    }
  };
  for (let p = 0; p < 2; p++) { run((l, i) => l * N + i); run((l, i) => i * N + l); }
}

/* ---------------- biomes: weights, then the land reshaped by them ---------------- */
function applyBiomes(T, o) {
  const N = T.res, h = T.h, bw = new Float32Array(N * N * 4), seed = (T.seed | 0) + 70, S = T.size;
  const one = BIOME_ORDER.indexOf(o.biome);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, u = (i + 0.5) / N, v = (j + 0.5) / N;
    if (one >= 0) { bw[k * 4 + one] = 1; continue; }
    const des = sm(0.04, 0.2, fbm(u, v, 2, 3, 0.5, seed + 1)), pl = sm(-0.02, 0.14, fbm(u, v, 2, 3, 0.5, seed + 2)) * (1 - des);
    bw[k * 4] = 1 - des - pl; bw[k * 4 + 1] = pl; bw[k * 4 + 2] = des;
  }
  if (one < 0) {
    boxBlur(bw, N, 4, Math.round(o.biomeBlend / T.cell / 2), T.wrap);
    for (let k = 0; k < N * N; k++) { const s = bw[k * 4] + bw[k * 4 + 1] + bw[k * 4 + 2] || 1; for (let c = 0; c < 3; c++) bw[k * 4 + c] /= s; }
  }
  // dunes: crests across a wind from the west-south-west, wave vector whole cycles over the map (a torus stays seamless)
  const nx = Math.max(1, Math.round(S / 330 * 0.93)), nz = Math.round(S / 330 * 0.37), R = Math.max(T.relief, 60);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i; if (h[k] <= 0 || bw[k * 4] > 0.999) continue;
    const u = (i + 0.5) / N, v = (j + 0.5) / N, t = clamp(h[k] / R, 0, 1), coast = sm(0.004, 0.05, t);
    // plains: the relief pressed down to a few tens of metres, long low swells and small hummocks on top
    const hp = Math.max(0.35, 0.4 + 5 * sm(0, 0.03, t) + 34 * Math.pow(t, 0.85) + (7 * fbm(u, v, 5, 4, 0.5, seed + 3) + 3.5 * fbm(u, v, 16, 4, 0.5, seed + 4)) * coast);
    // desert: stepped plateaus (mesas) with cliffs where the ground is high, dune fields where it is low
    const s4 = Math.pow(t, 1.1) * 4, f4 = Math.floor(s4), terr = (f4 + sm(0.72, 0.93, s4 - f4)) / 4;
    const ph = 2 * Math.PI * (nx * u + nz * v) + 5 * fbm(u, v, 3, 3, 0.5, seed + 5), x = ((ph / (2 * Math.PI)) % 1 + 1) % 1;
    const prof = x < 0.72 ? Math.pow(x / 0.72, 1.4) : Math.pow(1 - (x - 0.72) / 0.28, 0.8);   // long windward slope, short steep slip face
    const erg = sm(-0.15, 0.25, fbm(u, v, 3, 3, 0.5, seed + 6));                               // dune seas and flat stony plains between
    const hd = 0.4 + 5 * sm(0, 0.03, t) + R * 0.75 * terr + 24 * prof * erg * coast * (1 - sm(0.25, 0.45, t)) * (0.6 + 0.4 * fbm(u, v, 8, 3, 0.5, seed + 7));
    h[k] = h[k] * bw[k * 4] + hp * bw[k * 4 + 1] + hd * bw[k * 4 + 2];
  }
  const share = Object.fromEntries(BIOME_ORDER.map((b) => [b, 0])); let n = 0;
  for (let k = 0; k < N * N; k++) if (h[k] > 0) { n++; BIOME_ORDER.forEach((b, c) => { share[b] += bw[k * 4 + c]; }); }
  for (const b of BIOME_ORDER) share[b] = n ? share[b] / n : 0;
  return { w: bw, share, biome: o.biome };
}
export function biomeTexture(T) {
  const N = T.res, D = new Uint8Array(N * N * 4), w = T.biomes.w;
  for (let k = 0; k < N * N * 4; k++) D[k] = Math.round(clamp(w[k], 0, 1) * 255);
  const t = new THREE.DataTexture(D, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = T.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
export function biomeAt(T, x, z) {
  const N = T.res, i = clamp(Math.floor(x / T.cell), 0, N - 1), j = clamp(Math.floor(z / T.cell), 0, N - 1), k = (T.wrap ? (((j % N) + N) % N) * N + (((i % N) + N) % N) : j * N + i) * 4;
  return Object.fromEntries(BIOME_ORDER.map((b, c) => [b, T.biomes.w[k + c]]));
}

/* ---------------- the world ---------------- */
// map: LandKit terrain options (seed, size, res, relief, depth, shape, land, wrap, barrier…); water: WORLD_DEFAULTS
export function generateWorld(map, water = {}) {
  const o = { ...WORLD_DEFAULTS, ...water }, t0 = performance.now();
  let T, R;
  if (o.layout === 'single' || o.layout === 'mixed' || !LAYOUT_FN[o.layout]) {
    T = generateTerrain(map);
    T.biomes = applyBiomes(T, o);
    if (o.layout === 'mixed') R = mixed(T, { ...o, seed: map.seed | 0 });
    else {
      const w = new Float32Array(T.res * T.res * NB), b = Math.max(0, BODY_ORDER.indexOf(o.body));
      for (let k = 0; k < T.res * T.res; k++) w[k * NB + b] = 1;
      R = { w, flow: new Float32Array(T.res * T.res * 2), labels: [] };
    }
  } else {
    const N = map.res | 0, S = map.size;
    R = LAYOUT_FN[o.layout](N, S, { ...map, seed: map.seed | 0 });
    T = { ...map, wrap: false, barrier: map.barrier === 'mountains' ? 'wall' : map.barrier, shape: o.layout, h: R.h, res: N, cell: S / N };
    T.biomes = applyBiomes(T, o);
  }
  fillLand(T, R.w, R.flow);
  const rad = Math.round(o.blend / T.cell / 2);
  boxBlur(R.w, T.res, NB, rad, T.wrap); boxBlur(R.flow, T.res, 2, Math.max(1, Math.round(rad / 2)), T.wrap);
  for (let k = 0; k < T.res * T.res; k++) { let s = 0; for (let c = 0; c < NB; c++) s += R.w[k * NB + c]; if (s > 0) for (let c = 0; c < NB; c++) R.w[k * NB + c] /= s; }
  let nLand = 0, maxH = -Infinity, minH = Infinity; for (const y of T.h) { if (y > 0) nLand++; if (y > maxH) maxH = y; if (y < minH) minH = y; }
  const share = Object.fromEntries(BODY_ORDER.map((b) => [b, 0])); let nW = 0;
  for (let k = 0; k < T.res * T.res; k++) if (T.h[k] < 0) { nW++; BODY_ORDER.forEach((b, c) => { share[b] += R.w[k * NB + c]; }); }
  for (const b of BODY_ORDER) share[b] = nW ? share[b] / nW : 0;
  return Object.assign(T, { landShare: nLand / T.h.length, maxH, minH, regions: { w: R.w, flow: R.flow, labels: R.labels, layout: o.layout, share, blend: o.blend }, ms: Math.round(performance.now() - t0) });
}

/* ---------------- GPU ---------------- */
export function regionTextures(T) {
  const N = T.res, A = new Uint8Array(N * N * 4), B = new Uint8Array(N * N * 4), { w, flow } = T.regions, q = (x) => Math.round(clamp(x, 0, 1) * 255);
  for (let k = 0; k < N * N; k++) {
    A[k * 4] = q(w[k * NB]); A[k * 4 + 1] = q(w[k * NB + 1]); A[k * 4 + 2] = q(w[k * NB + 2]); A[k * 4 + 3] = q(w[k * NB + 3]);
    B[k * 4] = q(w[k * NB + 4]); B[k * 4 + 1] = q(w[k * NB + 5]); B[k * 4 + 2] = q(0.5 + 0.5 * flow[k * 2] / FLOW_MAX); B[k * 4 + 3] = q(0.5 + 0.5 * flow[k * 2 + 1] / FLOW_MAX);
  }
  const mk = (d) => { const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = T.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  return { a: mk(A), b: mk(B) };
}
function bodyParams() {
  return BODY_ORDER.map((b) => { const B = WATER_BODIES[b], L = LOOKS[B.look]; return { deep: new THREE.Color(L.deep), scat: new THREE.Color(L.scatter), p: new THREE.Vector4(WAVES[b], L.ripples, L.crest, L.shine), q: new THREE.Vector4(B.oil || 0, B.iceCover || 0, B.reflect || 1, B.current || 0) }; });
}
export function regionUniforms(tex) {
  const P = bodyParams();
  return {
    tRegA: { value: tex.a }, tRegB: { value: tex.b }, uFlowMax: { value: FLOW_MAX },
    uBodyDeep: { value: P.map((x) => x.deep) }, uBodyScat: { value: P.map((x) => x.scat) }, uBodyP: { value: P.map((x) => x.p) }, uBodyQ: { value: P.map((x) => x.q) },
  };
}
export function setRegions(u, tex) { u.tRegA.value = tex.a; u.tRegB.value = tex.b; }

// GLSL (after LandKit's GLSL_LAND, whose uLand / uLandOff place the map): the blended water at a world xz
export const GLSL_REGIONS = /* glsl */`
uniform sampler2D tRegA, tRegB; uniform float uFlowMax;
uniform vec3 uBodyDeep[${NB}]; uniform vec3 uBodyScat[${NB}]; uniform vec4 uBodyP[${NB}]; uniform vec4 uBodyQ[${NB}];
struct Region { vec3 deep; vec3 scat; vec4 p; vec4 q; vec2 flow; };   // p: waves, ripples, crest, shine · q: oil, ice, reflect, -
Region regionAt(vec2 xz) {
  vec2 uv = (xz + uLandOff) / uLand.x;
  if (uLand.z < 0.5) uv = clamp(uv, vec2(0.5 / uLand.y), vec2(1.0 - 0.5 / uLand.y));
  vec4 a = texture2D(tRegA, uv), b = texture2D(tRegB, uv);
  float w[${NB}]; w[0] = a.r; w[1] = a.g; w[2] = a.b; w[3] = a.a; w[4] = b.r; w[5] = b.g;
  float s = 1e-4; for (int i = 0; i < ${NB}; i++) s += w[i];
  Region r; r.deep = vec3(0.0); r.scat = vec3(0.0); r.p = vec4(0.0); r.q = vec4(0.0);
  for (int i = 0; i < ${NB}; i++) { float k = w[i] / s; r.deep += uBodyDeep[i] * k; r.scat += uBodyScat[i] * k; r.p += uBodyP[i] * k; r.q += uBodyQ[i] * k; }
  r.flow = (b.ba * 2.0 - 1.0) * uFlowMax;
  return r;
}
`;

/* ---------------- JS twin (bilinear) ---------------- */
export function regionAt(T, x, z) {
  const N = T.res, c = T.cell, R = T.regions; let fx = x / c - 0.5, fz = z / c - 0.5;
  if (!T.wrap) { fx = clamp(fx, 0, N - 1); fz = clamp(fz, 0, N - 1); }
  const x0 = Math.floor(fx), z0 = Math.floor(fz), u = fx - x0, v = fz - z0, idx = (i, j) => (((j % N) + N) % N) * N + (((i % N) + N) % N);
  const cl = (i) => (T.wrap ? i : clamp(i, 0, N - 1));
  const ks = [[idx(cl(x0), cl(z0)), (1 - u) * (1 - v)], [idx(cl(x0 + 1), cl(z0)), u * (1 - v)], [idx(cl(x0), cl(z0 + 1)), (1 - u) * v], [idx(cl(x0 + 1), cl(z0 + 1)), u * v]];
  const w = new Array(NB).fill(0), flow = [0, 0];
  for (const [k, f] of ks) { for (let b = 0; b < NB; b++) w[b] += R.w[k * NB + b] * f; flow[0] += R.flow[k * 2] * f; flow[1] += R.flow[k * 2 + 1] * f; }
  const waves = BODY_ORDER.reduce((s, b, i) => s + WAVES[b] * w[i], 0);
  return { w: Object.fromEntries(BODY_ORDER.map((b, i) => [b, w[i]])), flow, waves };
}

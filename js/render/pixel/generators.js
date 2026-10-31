// Pixel Studio generators: sprites drawn straight at the pixel resolution by rules of pixel art — one light from the
// top-left, colour ramps with a hue shift (shadows cooler, lights warmer), shapes as clean clusters, dithering only on
// boundaries, a pixel of margin for the outline. Each returns frames (an animation where it makes sense).
//  planet gem potion coin tree rock fire slime — and seamless tiles: grass sand stone water (animated) lava (animated)
import { PixelImage, hex, shade, oklab, fromOklab } from './core.js';

const rng = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
// value noise on a lattice that repeats every `p` cells (seamless tiles), smooth
function vnoise(seed) {
  const H = (i, j) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  return (x, y, p = 1e9) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, w = (i) => ((i % p) + p) % p;
    const a = H(w(xi), w(yi)), b = H(w(xi + 1), w(yi)), c = H(w(xi), w(yi + 1)), d = H(w(xi + 1), w(yi + 1)), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const fbm = (n, x, y, p, oct = 3) => { let s = 0, a = 0.5, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += n(x * f, y * f, p * f) * a; t += a; a *= 0.5; f *= 2; } return s / t; };
// a ramp of n colours around a base (index 0 darkest)
export function ramp(base, n = 5, shift = 0.7) { const c = typeof base === 'string' ? hex(base) : base; return Array.from({ length: n }, (_, i) => shade(c, (i - (n - 1) / 2) * (4 / Math.max(1, n - 1)) * 0.55, shift)); }
const hueBase = (h, s = 0.12, L = 0.62) => fromOklab([L, Math.cos(h) * s, Math.sin(h) * s]);
// pick a ramp step from a light value 0..1, dithering only within `band` of a step boundary
function stepOf(v, n, x, y, band = 0.06) {
  const t = clamp(v, 0, 0.9999) * n, i = Math.floor(t), f = t - i;
  if (band > 0 && f > 1 - band * n && i < n - 1 && BAYER4[(y & 3) * 4 + (x & 3)] < (f - (1 - band * n)) / (band * n)) return i + 1;
  return i;
}
const blank = (w, h, n) => Array.from({ length: n }, () => new PixelImage(w, h));
const L3 = (() => { const v = [-0.55, -0.62, 0.56], l = Math.hypot(...v); return v.map((c) => c / l); })();

export const GENERATORS = {
  planet: {
    label: 'Planet (rotating)', frames: 16, params: { hue: 3.9, land: 0.5, clouds: 0.35 },
    draw(w, h, { seed = 1, frames = 16, hue = 3.9, land = 0.5, clouds = 0.35 }) {
      const out = blank(w, h, frames), n = vnoise(seed), r = Math.floor(Math.min(w, h) / 2) - 2, cx = w / 2, cy = h / 2, r2 = rng(seed);
      const sea = ramp(hueBase(hue, 0.11, 0.5), 4), ground = ramp(hueBase(hue + 2.2 + r2(), 0.1, 0.6), 4), cloud = ramp([236, 240, 244], 3, 0.3);
      for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy; if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2), lit = clamp(dx * L3[0] + dy * L3[1] + nz * L3[2], 0, 1);
        const lon = Math.atan2(dx, nz) / Math.PI + f / frames * 2, lat = Math.asin(clamp(dy, -1, 1)) / Math.PI;
        const P = 8, hgt = fbm(n, lon * P / 2, lat * P / 2 + 7, P, 4), cl = fbm(n, lon * P + 3 + f / frames * 1.5, lat * P * 1.6, P * 2, 3);
        let c;
        const L = 0.12 + 0.88 * lit, isLand = hgt > 1 - land * 0.9 - 0.12;
        if (cl > 1 - clouds * 0.75 && clouds > 0) c = cloud[stepOf(L, 3, x, y)];
        else c = (isLand ? ground : sea)[stepOf(L, 4, x, y)];
        if (d2 > 0.86 && lit > 0.25) c = shade(c, 0.8, 0.4);                                     // a bright atmosphere rim on the day side
        out[f].set(x, y, c);
      }
      return out;
    },
  },
  gem: {
    label: 'Gem (sparkling)', frames: 8, params: { hue: 5.2 },
    draw(w, h, { seed = 1, frames = 8, hue = 5.2 }) {
      const out = blank(w, h, frames), R = ramp(hueBase(hue, 0.16, 0.55), 5), cx = (w - 1) / 2, cy = (h - 1) / 2, rx = Math.floor(w / 2) - 2, ry = Math.floor(h / 2) - 2;
      // a brilliant seen from the side: table (top), crown facets, the girdle, pavilion facets to the point
      const tableY = cy - ry * 0.55, girdleY = cy - ry * 0.15;
      for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = (x - cx) / rx; let v;
        if (y < tableY - 0.5 || y > cy + ry) continue;
        if (y <= girdleY) { const t = (y - tableY) / (girdleY - tableY), half = 0.62 + 0.38 * clamp(t, 0, 1); if (Math.abs(u) > half) continue; v = t < 0.15 ? 0.95 : 0.45 + 0.35 * (-u) + 0.15 * (1 - t); }
        else { const t = (y - girdleY) / (cy + ry - girdleY), half = 1 - t; if (Math.abs(u) > half + 0.02) continue; const facet = Math.floor((u / Math.max(0.05, half) + 1) * 2.5); v = [0.35, 0.55, 0.3, 0.45, 0.2][clamp(facet, 0, 4)] * (1 - t * 0.5) + 0.1; }
        out[f].set(x, y, R[stepOf(v, 5, x, y, 0)]);
      }
      // a glint that travels across the crown, frame by frame
      for (let f = 0; f < frames; f++) {
        const gx = Math.round(cx - rx * 0.6 + (f / frames) * rx * 1.6), gy = Math.round(tableY + 1);
        if (out[f].alpha(gx, gy)) { out[f].set(gx, gy, [255, 255, 250]); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (out[f].alpha(gx + a, gy + b)) out[f].set(gx + a, gy + b, R[4]); }
      }
      return out;
    },
  },
  potion: {
    label: 'Potion (bubbling)', frames: 8, params: { hue: 0.4, level: 0.65 },
    draw(w, h, { seed = 1, frames = 8, hue = 0.4, level = 0.65 }) {
      const out = blank(w, h, frames), liq = ramp(hueBase(hue, 0.17, 0.55), 4), glass = ramp([170, 200, 214], 3, 0.2), cork = ramp([150, 104, 66], 3), r2 = rng(seed);
      const cx = (w - 1) / 2, R = Math.floor(Math.min(w, h * 0.7) / 2) - 2, by = h - 2 - R, neckW = Math.max(2, Math.round(R * 0.45)), neckTop = Math.max(1, by - R - Math.round(h * 0.2));
      const surf = by + R - level * 2 * R, bubbles = Array.from({ length: 4 }, () => [cx + (r2() - 0.5) * R, r2()]);
      for (let f = 0; f < frames; f++) {
        const im = out[f];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = (x - cx) / R, dy = (y - by) / R, inBody = dx * dx + dy * dy <= 1, inNeck = Math.abs(x - cx) <= neckW / 2 && y >= neckTop + 2 && y < by;
          if (!inBody && !inNeck) continue;
          const lit = clamp(0.55 - dx * 0.45 - dy * 0.2, 0, 1);
          if (y > surf + Math.sin(x * 1.3 + f) * 0.6) im.set(x, y, liq[stepOf(lit * 0.9, 4, x, y)]); else im.set(x, y, glass[stepOf(lit * 0.6, 3, x, y, 0)].concat(255));
          if (inBody && dx < -0.45 && dx > -0.65 && dy < 0.3 && dy > -0.6) im.set(x, y, [245, 250, 255]);   // highlight on the glass
        }
        for (let y = neckTop; y < neckTop + 2; y++) for (let x = Math.round(cx - neckW / 2); x <= Math.round(cx + neckW / 2); x++) im.set(x, y, cork[x < cx ? 2 : 1]);
        for (const [bx, ph] of bubbles) { const t = (ph + f / frames) % 1, yy = Math.round(by + R - 2 - t * (by + R - 2 - surf)); const xx = Math.round(bx); if (im.alpha(xx, yy) && yy > surf) im.set(xx, yy, liq[3]); }
      }
      return out;
    },
  },
  coin: {
    label: 'Coin (spinning)', frames: 8, params: { hue: 1.35 },
    draw(w, h, { frames = 8, hue = 1.35 }) {
      const out = blank(w, h, frames), G = ramp(hueBase(hue, 0.13, 0.72), 5), cx = (w - 1) / 2, cy = (h - 1) / 2, r = Math.floor(Math.min(w, h) / 2) - 2;
      for (let f = 0; f < frames; f++) {
        const k = Math.cos(f / frames * Math.PI * 2), rx = Math.max(0.6, Math.abs(k) * r);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / r, d = dx * dx + dy * dy; if (d > 1) continue;
          let v = 0.55 - dx * 0.25 * Math.sign(k || 1) - dy * 0.25;
          if (d > 0.62) v -= 0.25;                                                       // the rim
          if (Math.abs(k) > 0.5 && d < 0.3 && Math.abs(dx) < 0.25 && Math.abs(dy) < 0.5) v += 0.25;   // an embossed mark
          out[f].set(x, y, G[stepOf(v, 5, x, y, 0)]);
        }
      }
      return out;
    },
  },
  tree: {
    label: 'Tree (swaying)', frames: 4, params: { hue: 2.3 },
    draw(w, h, { seed = 1, frames = 4, hue = 2.3 }) {
      const out = blank(w, h, frames), r2 = rng(seed), leaf = ramp(hueBase(hue, 0.13, 0.55), 5), bark = ramp([116, 84, 60], 3), n = vnoise(seed);
      const cx = (w - 1) / 2, trunkW = Math.max(2, Math.round(w * 0.1)), trunkTop = Math.round(h * 0.55);
      const blobs = Array.from({ length: 6 + Math.floor(r2() * 4) }, (_, i) => [cx + (r2() - 0.5) * w * 0.55, h * (0.18 + r2() * 0.38), w * (0.14 + r2() * 0.12)]);
      for (let f = 0; f < frames; f++) {
        const sway = Math.round(Math.sin(f / frames * Math.PI * 2) * Math.max(1, w / 32));
        for (let y = trunkTop; y < h - 1; y++) for (let x = Math.round(cx - trunkW / 2); x <= Math.round(cx + trunkW / 2); x++) out[f].set(x, y, bark[x < cx ? 2 : x > cx ? 0 : 1]);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          let best = -1, lit = 0;
          for (const [bx, by, br] of blobs) { const s = sway * (1 - by / h); const dx = (x - bx - s) / br, dy = (y - by) / br, d = dx * dx + dy * dy + (n(x * 0.5, y * 0.5) - 0.5) * 0.5; if (d < 1) { const nz = Math.sqrt(Math.max(0, 1 - d)); const l = dx * L3[0] + dy * L3[1] + nz * L3[2]; if (l > best || best < 0) { best = 1; lit = Math.max(lit, l); } } }
          if (best < 0) continue;
          out[f].set(x, y, leaf[stepOf(0.1 + lit * 0.85, 5, x, y)]);
        }
      }
      return out;
    },
  },
  rock: {
    label: 'Rock', frames: 1, params: { hue: 0.9 },
    draw(w, h, { seed = 1, hue = 0.9 }) {
      const im = new PixelImage(w, h), R = ramp(hueBase(hue, 0.025, 0.55), 5, 0.4), n = vnoise(seed), cx = (w - 1) / 2, cy = h * 0.6, rx = w / 2 - 2, ry = h * 0.4 - 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), rr = 0.82 + 0.25 * n(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5);
        const d = Math.hypot(dx, dy) / rr; if (d > 1 || y > h - 2) continue;
        const nz = Math.sqrt(Math.max(0, 1 - d * d)), facet = Math.floor(n(x * 0.25, y * 0.25) * 3) * 0.08;
        let v = clamp(dx * L3[0] + dy * L3[1] + nz * L3[2], 0, 1) * 0.8 + 0.1 + facet;
        if (n(x * 0.6 + 9, y * 0.6) > 0.82) v -= 0.3;                                      // cracks
        im.set(x, y, R[stepOf(v, 5, x, y)]);
      }
      return [im];
    },
  },
  fire: {
    label: 'Fire (animated)', frames: 8, params: {},
    draw(w, h, { seed = 1, frames = 8 }) {
      const out = blank(w, h, frames), n = vnoise(seed), E = [hex('#3a1414'), hex('#7a2418'), hex('#c0441c'), hex('#ef7a2a'), hex('#f7b84a'), hex('#fbe7a1')], cx = (w - 1) / 2;
      for (let f = 0; f < frames; f++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = f / frames, up = 1 - y / h, dx = Math.abs(x - cx) / (w * 0.42);
        const shape = (1 - dx / Math.max(0.15, 1 - up * 0.85)) * (1 - up * 0.55);
        const turb = fbm(n, x * 6 / w, (y * 6 / h + t * 6), 6, 3);                         // the noise rises, one period per loop
        const v = shape * 1.4 - (1 - turb) * 0.9 - up * 0.2;
        if (v < 0.05 || y > h - 2) continue;
        out[f].set(x, y, E[clamp(Math.floor(v * 6), 0, 5)]);
      }
      return out;
    },
  },
  slime: {
    label: 'Slime (bouncing)', frames: 8, params: { hue: 2.6 },
    draw(w, h, { frames = 8, hue = 2.6 }) {
      const out = blank(w, h, frames), G = ramp(hueBase(hue, 0.15, 0.6), 5), cx = (w - 1) / 2;
      for (let f = 0; f < frames; f++) {
        const t = f / frames, sq = Math.sin(t * Math.PI * 2), hgt = (h * 0.55) * (1 + 0.18 * sq), wid = (w * 0.42) * (1 - 0.14 * sq), base = h - 2;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = (x - cx) / wid, dy = (base - y) / hgt; if (dy < 0 || dy > 1) continue;
          if (Math.abs(dx) > Math.sqrt(Math.max(0, 1 - dy * dy * dy)) ) continue;
          const nz = Math.sqrt(Math.max(0, 1 - dx * dx - (dy - 0.3) ** 2));
          const v = clamp(0.2 + dx * L3[0] * 0.6 - (dy - 0.4) * L3[1] * 0.6 + nz * 0.5, 0, 1);
          out[f].set(x, y, G[stepOf(v, 5, x, y)]);
        }
        // eyes and a highlight
        const ey = Math.round(base - hgt * 0.55), ex = Math.max(1, Math.round(wid * 0.35));
        for (const s of [-1, 1]) { out[f].set(Math.round(cx + s * ex), ey, [20, 24, 30]); out[f].set(Math.round(cx + s * ex), ey + 1, [20, 24, 30]); }
        out[f].set(Math.round(cx - wid * 0.5), Math.round(base - hgt * 0.75), [240, 255, 240]);
      }
      return out;
    },
  },
  // seamless tiles (fill the whole canvas)
  grass: { label: 'Tile: grass', frames: 1, tile: true, params: { hue: 2.35 }, draw: (w, h, o) => tile(w, h, o, 'grass') },
  sand: { label: 'Tile: sand', frames: 1, tile: true, params: { hue: 1.2 }, draw: (w, h, o) => tile(w, h, o, 'sand') },
  stone: { label: 'Tile: cobblestone', frames: 1, tile: true, params: { hue: 1.0 }, draw: (w, h, o) => tile(w, h, o, 'stone') },
  water: { label: 'Tile: water (animated)', frames: 8, tile: true, params: { hue: 3.7 }, draw: (w, h, o) => tile(w, h, o, 'water') },
  lava: { label: 'Tile: lava (animated)', frames: 8, tile: true, params: {}, draw: (w, h, o) => tile(w, h, o, 'lava') },
};

function tile(w, h, { seed = 1, frames = 1, hue = 2.3 }, kind) {
  const n = vnoise(seed), out = blank(w, h, kind === 'water' || kind === 'lava' ? frames : 1), P = 4;
  const R = kind === 'lava' ? [hex('#3a1414'), hex('#7a2418'), hex('#c0441c'), hex('#ef7a2a'), hex('#f7b84a')] : ramp(hueBase(hue, kind === 'stone' ? 0.03 : kind === 'sand' ? 0.09 : 0.12, kind === 'sand' ? 0.75 : 0.55), 5, 0.6);
  out.forEach((im, f) => {
    const t = f / out.length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w * P, v = y / h * P;                                                // the noise repeats every tile: seamless
      let s;
      if (kind === 'grass') { s = fbm(n, u * 2, v * 2, P * 2, 3); const blade = n(u * 6, v * 3, P * 6) > 0.72 ? 0.25 : 0; s = s * 0.8 + blade; }
      else if (kind === 'sand') { s = 0.5 + (fbm(n, u, v, P, 3) - 0.5) * 0.6 + Math.sin((u + fbm(n, u, v, P) * 1.5) * Math.PI * 2) * 0.08; }
      else if (kind === 'stone') {                                                        // cobbles: cells of a jittered grid, mortar between
        const gx = x / w * 4, gy = y / h * 4, cx = Math.floor(gx), cy = Math.floor(gy); let d1 = 9, d2 = 9;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const px = cx + i + 0.2 + 0.6 * n((cx + i + 4) % 4 * 7.1, ((cy + j + 4) % 4) * 3.3), py = cy + j + 0.2 + 0.6 * n(((cx + i + 4) % 4) * 2.7 + 9, ((cy + j + 4) % 4) * 5.9); const dd = Math.hypot(gx - px, gy - py); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; }
        const edge = d2 - d1; s = edge < 0.12 ? 0.05 : 0.45 + 0.3 * (1 - d1) + (n(x * 0.5, y * 0.5) - 0.5) * 0.15;
      }
      else if (kind === 'water') { s = 0.45 + Math.sin((v + fbm(n, u, v + t * 0, P) * 1.2 + t) * Math.PI * 2) * 0.2 + (fbm(n, u * 2, v * 2, P * 2) - 0.5) * 0.3; if (s > 0.72) s = 0.95; }
      else { s = fbm(n, u + Math.cos(t * 6.283) * 0.25, v + Math.sin(t * 6.283) * 0.25, P, 3); s = s * s * 1.6; }
      im.set(x, y, R[stepOf(clamp(s, 0, 1), 5, x, y, 0.05)]);
    }
  });
  return out;
}
export const GENERATOR_IDS = Object.keys(GENERATORS);
export { oklab };

// Pixel Studio core: images (RGBA at the pixel resolution), colour in OKLab (perceptual distances and ramps),
// palettes, quantisation with optional ordered dithering, outlines, clean-up rules of pixel art, scaling, sheets.
// Everything works on frames: arrays of PixelImage of the same size.

export class PixelImage {
  constructor(w, h, data) { this.w = w; this.h = h; this.data = data || new Uint8ClampedArray(w * h * 4); }
  clone() { return new PixelImage(this.w, this.h, new Uint8ClampedArray(this.data)); }
  i(x, y) { return (y * this.w + x) * 4; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; const i = this.i(x, y); return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]]; }
  set(x, y, c) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = this.i(x, y); this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = c.length > 3 ? c[3] : 255; }
  alpha(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[this.i(x, y) + 3]; }
  key(x, y) { const i = this.i(x, y); return this.data[i + 3] < 128 ? -1 : (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2]; }
}

/* ---------------- colour ---------------- */
export const hex = (s) => { const v = parseInt(s.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
export const toHex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v) => { const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(s * 255))); };
export function oklab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
// A shade of a colour for pixel-art ramps: k < 0 darker and cooler (hue towards blue-violet), k > 0 lighter and warmer
// (towards yellow) — the hue shift that keeps ramps lively instead of muddy.
export function shade(c, k, shift = 0.6) {
  const [L, a, b] = oklab(c), dl = k * 0.13, hs = shift * 0.035 * k;
  return fromOklab([Math.max(0, Math.min(1, L + dl)), a * (1 - Math.abs(k) * 0.08) + hs * 0.3, b + hs]);
}

/* ---------------- palettes ---------------- */
// Own palettes (designed here). "auto" builds one from the image (median cut in OKLab).
export const PALETTES = {
  steel16: { label: 'Steel 16 (general)', colors: ['#0d0f14', '#1f2430', '#3a4252', '#5d687a', '#8b97a8', '#c3ccd6', '#f2f4f0', '#3b1f1a', '#7a3b24', '#c06b34', '#e8b25c', '#2c4a2a', '#4f7a3a', '#8fb45a', '#1d3a5c', '#3f78a8'] },
  moss12: { label: 'Moss 12 (forest)', colors: ['#10140f', '#1f2a1c', '#2f4227', '#46602f', '#6b8539', '#9bab4c', '#cfd07a', '#3a2a1e', '#5f4330', '#8a6a48', '#b8987a', '#e6dcc0'] },
  desert10: { label: 'Desert 10 (sand, rock, sky)', colors: ['#1a1210', '#43271c', '#7a4428', '#b56c38', '#dc9e58', '#f0cf8a', '#fbf0cf', '#3d6a8a', '#77a9c6', '#c3e0ea'] },
  ember8: { label: 'Ember 8 (fire, lava)', colors: ['#120c0c', '#3a1414', '#7a2418', '#c0441c', '#ef7a2a', '#f7b84a', '#fbe7a1', '#fffbea'] },
  night8: { label: 'Night 8 (blue, violet)', colors: ['#07070f', '#151632', '#272a5a', '#3f4b8a', '#5f78b8', '#8fb0dc', '#c7d8f0', '#7a4a8a'] },
  sea12: { label: 'Sea 12 (water, hulls)', colors: ['#060b12', '#0f1e2e', '#17344c', '#1f5470', '#2f7f96', '#58b0b8', '#a6dccf', '#f4fbf6', '#3e4448', '#6c757a', '#a8b0b2', '#7a2a20'] },
  green4: { label: 'Green 4 (handheld style)', colors: ['#0f1f0f', '#2f4f2f', '#6f8f3f', '#c8d890'] },
  mono4: { label: 'Mono 4', colors: ['#101010', '#555555', '#aaaaaa', '#f0f0f0'] },
  bit1: { label: '1-bit', colors: ['#0a0a0a', '#f4f4ee'] },
  auto: { label: 'Auto (from the image)', colors: null },
  free: { label: 'Free (no palette)', colors: null },
};
export const paletteRGB = (id) => (PALETTES[id] && PALETTES[id].colors ? PALETTES[id].colors.map(hex) : null);

// Median cut over the opaque pixels of all frames, in OKLab; n colours.
export function autoPalette(frames, n = 12) {
  const px = [];
  for (const f of frames) for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] >= 128) px.push(oklab([f.data[i], f.data[i + 1], f.data[i + 2]]));
  if (!px.length) return [[0, 0, 0]];
  let boxes = [px];
  while (boxes.length < n) {
    let bi = -1, bestR = 0, bestAx = 0;
    boxes.forEach((b, k) => { if (b.length < 2) return; for (let ax = 0; ax < 3; ax++) { let lo = Infinity, hi = -Infinity; for (const p of b) { lo = Math.min(lo, p[ax]); hi = Math.max(hi, p[ax]); } const r = (hi - lo) * (ax ? 0.6 : 1) * Math.sqrt(b.length); if (r > bestR) { bestR = r; bi = k; bestAx = ax; } } });
    if (bi < 0) break;
    const b = boxes[bi].sort((p, q) => p[bestAx] - q[bestAx]), mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.map((b) => { const m = [0, 0, 0]; for (const p of b) for (let k = 0; k < 3; k++) m[k] += p[k] / b.length; return fromOklab(m); });
}

/* ---------------- quantisation ---------------- */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
const BAYER2 = [0, 2, 3, 1].map((v) => v / 4 - 0.375);
// Nearest palette colour in OKLab; dither 'none' | 'bayer2' | 'bayer4' (ordered: no noise, regular pattern), strength 0..1
export function quantize(img, pal, { dither = 'none', strength = 0.5, alphaCut = 128 } = {}) {
  const out = new PixelImage(img.w, img.h), P = pal.map(oklab), cache = new Map();
  const near = (lab) => { let bi = 0, bd = Infinity; for (let k = 0; k < P.length; k++) { const d = (P[k][0] - lab[0]) ** 2 + (P[k][1] - lab[1]) ** 2 + (P[k][2] - lab[2]) ** 2; if (d < bd) { bd = d; bi = k; } } return bi; };
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = img.i(x, y);
    if (img.data[i + 3] < alphaCut) continue;
    const c = [img.data[i], img.data[i + 1], img.data[i + 2]];
    let lab = oklab(c);
    if (dither !== 'none') {
      const t = dither === 'bayer2' ? BAYER2[(y & 1) * 2 + (x & 1)] : BAYER4[(y & 3) * 4 + (x & 3)];
      lab = [lab[0] + t * strength * 0.12, lab[1], lab[2]];
      const k = near(lab); out.set(x, y, pal[k]); continue;
    }
    const key = (c[0] << 16) | (c[1] << 8) | c[2];
    let k = cache.get(key); if (k === undefined) { k = near(lab); cache.set(key, k); }
    out.set(x, y, pal[k]);
  }
  return out;
}
// Alpha to 0 or 255 only (pixel art has no half-transparent pixels)
export function hardAlpha(img, cut = 128) { const o = img.clone(); for (let i = 3; i < o.data.length; i += 4) o.data[i] = o.data[i] >= cut ? 255 : 0; return o; }

/* ---------------- outlines and clean-up ---------------- */
const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]], N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
// Outer outline: transparent pixels touching the sprite (4-neighbour, or 8 with corners) get a colour —
// 'dark' a fixed colour, 'selout' a darker shade of the neighbour it touches (selective outline, softer)
export function outline(img, { mode = 'dark', color = [14, 12, 18], corners = false } = {}) {
  if (mode === 'none') return img;
  const o = img.clone(), nb = corners ? N8 : N4;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.alpha(x, y) >= 128) continue;
    let src = null;
    for (const [dx, dy] of nb) if (img.alpha(x + dx, y + dy) >= 128) { src = img.get(x + dx, y + dy); break; }
    if (!src) continue;
    o.set(x, y, mode === 'selout' ? shade(src, -2.2, 0.8) : color);
  }
  return o;
}
// Single pixels unlike all 8 neighbours, when most neighbours agree, take the neighbours' colour (noise removal)
export function removeOrphans(img, minAgree = 5) {
  const o = img.clone(); let n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const k = img.key(x, y); if (k < 0) continue;
    const cnt = new Map(); let same = 0;
    for (const [dx, dy] of N8) { const xx = x + dx, yy = y + dy; const kk = xx < 0 || yy < 0 || xx >= img.w || yy >= img.h ? -1 : img.key(xx, yy); if (kk === k) same++; cnt.set(kk, (cnt.get(kk) || 0) + 1); }
    if (same) continue;
    let best = null, bc = 0; for (const [kk, c] of cnt) if (c > bc) { bc = c; best = kk; }
    if (bc >= minAgree) { const i = o.i(x, y); if (best < 0) o.data[i + 3] = 0; else { o.data[i] = best >> 16; o.data[i + 1] = (best >> 8) & 255; o.data[i + 2] = best & 255; o.data[i + 3] = 255; } n++; }
  }
  o.fixed = n; return o;
}
// Pixel-perfect lines: in 1-px strokes of one colour, an L-shaped corner (two neighbours at right angles that also
// touch each other diagonally) doubles the line's thickness — remove the corner pixel. Only for outline-like colours.
export function pixelPerfect(img, isLine) {
  const o = img.clone(); let n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const k = o.key(x, y); if (k < 0 || !isLine(k)) continue;
    const s = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < o.w && yy < o.h && o.key(xx, yy) === k; };
    let c = 0; for (const [dx, dy] of N8) if (s(dx, dy)) c++;
    if (c !== 2) continue;
    for (const [ax, ay, bx, by] of [[0, -1, 1, 0], [1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1]]) {
      if (s(ax, ay) && s(bx, by)) { o.data[o.i(x, y) + 3] = 0; n++; break; }
    }
  }
  o.fixed = n; return o;
}
// Downsample by s with the most frequent colour of each block (keeps hard edges; alpha by majority)
export function modeDownsample(img, s) {
  if (s <= 1) return img;
  const w = Math.floor(img.w / s), h = Math.floor(img.h / s), o = new PixelImage(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cnt = new Map();
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const k = img.key(x * s + i, y * s + j); cnt.set(k, (cnt.get(k) || 0) + 1); }
    let best = -1, bc = -1; for (const [k, c] of cnt) if (c > bc || (c === bc && k >= 0)) { bc = c; best = k; }
    if (best >= 0) o.set(x, y, [best >> 16, (best >> 8) & 255, best & 255, 255]);
  }
  return o;
}
export function colorsOf(frames) { const s = new Set(); for (const f of frames) for (let i = 0; i < f.data.length; i += 4) if (f.data[i + 3] >= 128) s.add((f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2]); return [...s].map((k) => [k >> 16, (k >> 8) & 255, k & 255]); }

/* ---------------- canvases ---------------- */
export function toCanvas(img, scale = 1, canvas) {
  const c = canvas || document.createElement('canvas'); c.width = img.w * scale; c.height = img.h * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
  const t = document.createElement('canvas'); t.width = img.w; t.height = img.h; t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(img.data), img.w, img.h), 0, 0);
  g.drawImage(t, 0, 0, c.width, c.height);
  return c;
}
export function fromCanvas(c) { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height); return new PixelImage(c.width, c.height, d.data); }
// All frames side by side (a sprite sheet)
export function sheet(frames, cols = frames.length) {
  const w = frames[0].w, h = frames[0].h, rows = Math.ceil(frames.length / cols), o = new PixelImage(w * cols, h * rows);
  frames.forEach((f, k) => { const ox = (k % cols) * w, oy = Math.floor(k / cols) * h; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = f.i(x, y); if (f.data[i + 3]) o.set(ox + x, oy + y, [f.data[i], f.data[i + 1], f.data[i + 2], f.data[i + 3]]); } });
  return o;
}
// Fit an image into w × h (centred; cropped if larger)
export function fit(img, w, h) {
  if (img.w === w && img.h === h) return img;
  const o = new PixelImage(w, h), ox = Math.floor((w - img.w) / 2), oy = Math.floor((h - img.h) / 2);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const i = img.i(x, y); if (img.data[i + 3]) o.set(x + ox, y + oy, [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]); }
  return o;
}

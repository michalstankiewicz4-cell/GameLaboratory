// ShipKit · util — małe narzędzia proceduralne: losowanie z ziarnem, szum wartości i fBm, płótno, piksele.
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';

// =====================================================================
// Small procedural toolkit: seeded RNG + tileable value noise / fBm.
// =====================================================================
import { lcgRaw as rng } from '../../../core/rng.js';   // generator z ziarnem (js/core/rng.js)
// Tileable 2D value noise on a (cx × cy) lattice, sampled in [0,1)².
function valueNoise(rand, cx, cy) {
  const g = new Float32Array(cx * cy);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const at = (x, y) => g[((y % cy + cy) % cy) * cx + ((x % cx + cx) % cx)];
  return (u, v) => {
    const fx = u * cx, fy = v * cy, x0 = Math.floor(fx), y0 = Math.floor(fy);
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
}
function fbm(rand, baseX, baseY, octaves) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(valueNoise(rand, baseX << o, baseY << o));
  return (u, v) => {
    let sum = 0, amp = 0.5, norm = 0;
    for (const n of layers) { sum += n(u, v) * amp; norm += amp; amp *= 0.5; }
    return sum / norm;
  };
}
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
// Fill a canvas per-pixel from f(u,v) -> [r,g,b] (0..255).
function paintPixels(ctx, w, h, f) {
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = f(x / w, y / h), i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export { rng, valueNoise, fbm, canvas, paintPixels, clamp };

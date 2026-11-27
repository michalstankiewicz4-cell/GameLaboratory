// ShipKit · util — małe narzędzia proceduralne: losowanie z ziarnem, szum wartości i fBm, płótno, piksele.
// Część ShipKit (js/models/ships-space/shipkit.js — API i definicje statków); moduł ES, wspólne THREE z three-global.js.
import { THREE } from '../../../core/three-global.js';
import { valueNoise } from '../../../core/noise.js';   // szum wartości (js/core/noise.js)

// =====================================================================
// Small procedural toolkit: seeded RNG + tileable value noise / fBm.
// =====================================================================
import { lcgRaw as rng } from '../../../core/rng.js';   // generator z ziarnem (js/core/rng.js)
// Tileable 2D value noise on a (cx × cy) lattice, sampled in [0,1)².
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

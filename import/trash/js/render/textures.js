// Tekstury proceduralne (canvas 2D) dla materiałów z js/models/materials.js — tylko w przeglądarce.
// applyTextures() dokłada mapy wszystkim utworzonym materiałom wg pola `tex` ich opisu (raz na materiał).
import * as THREE from '../../vendor/three/three.module.js';
import { allMaterials } from '../models/materials.js';
import { rng } from '../models/geom.js';

let maxAniso = 8;
export function setAnisotropy(n) { maxAniso = n; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Szum wartości 2D, bezszwowy w okresie (px, py). */
function valueNoise(w, h, cell, seed = 1) {
  const r = rng(seed), gx = Math.max(1, Math.round(w / cell)), gy = Math.max(1, Math.round(h / cell));
  const G = Array.from({ length: gx * gy }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = (x / w) * gx, fy = (y / h) * gy, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = G[(y0 % gy) * gx + (x0 % gx)], b = G[(y0 % gy) * gx + ((x0 + 1) % gx)], c = G[((y0 + 1) % gy) * gx + (x0 % gx)], d = G[((y0 + 1) % gy) * gx + ((x0 + 1) % gx)];
    out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
function fbm(w, h, cells, seed) {
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  cells.forEach((c, i) => { const n = valueNoise(w, h, c, seed + i * 17); for (let k = 0; k < out.length; k++) out[k] += n[k] * amp; tot += amp; amp *= 0.5; });
  for (let k = 0; k < out.length; k++) out[k] /= tot;
  return out;
}
/** Szara mapa (wysokość / szorstkość) z tablicy 0…1. */
function grayCanvas(w, h, f) {
  const [c, x] = canvas(w, h), img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = Math.max(0, Math.min(255, f[i] * 255)); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}

const RECIPES = {
  // guma: drobny szum w szorstkości i wypukłości, lekkie przetarcia
  rubber(m) {
    const S = 256, n = fbm(S, S, [64, 16, 4], 3);
    const rough = n.map((v) => 0.75 + v * 0.25);
    m.roughnessMap = tex(grayCanvas(S, S, rough), { srgb: false, repeat: [8, 2] });
    m.bumpMap = tex(grayCanvas(S, S, fbm(S, S, [8, 3], 9)), { srgb: false, repeat: [8, 2] }); m.bumpScale = 0.4;
  },
  // bok opony: napisy i pierścienie wypukłe (mapa wypukłości), w paśmie profilu podanym przez model (def.bands)
  tireSide(m, d) {
    const W = 4096, H = 512;
    const [c, x] = canvas(W, H);
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    const noise = fbm(512, 64, [32, 8, 2], 5);
    for (const [v0, v1, side] of d.bands) {
      if (v1 <= v0) continue;
      const yA = (1 - v1) * H, yB = (1 - v0) * H, hh = yB - yA;
      // pierścienie (listwa ochronna felgi, linie wzorcowe)
      x.fillStyle = '#9a9a9a';
      x.fillRect(0, side > 0 ? yB - hh * 0.08 : yA, W, hh * 0.05);
      x.fillRect(0, side > 0 ? yA + hh * 0.06 : yB - hh * 0.10, W, Math.max(1.5, hh * 0.025));
      // napisy wokół, powtarzane: litery wypukłe; skala pozioma = proporcja pikseli na metr (obwód / długość profilu)
      x.save();
      const cy = yA + hh * 0.52, ax = (W / d.circ) / (H / d.arcLen);
      x.translate(0, cy);
      if (side < 0) x.scale(-1, -1);   // druga strona: odwrócony kierunek profilu
      x.scale(ax, 1);
      x.fillStyle = '#ffffff'; x.textBaseline = 'middle';
      const txt = d.text || [], span = W / ax;
      const big = Math.round(hh * 0.62), small = Math.round(hh * 0.34);
      for (let rep = 0; rep < 2; rep++) {
        const base = (side < 0 ? -span : 0) + rep * span / 2;
        let px = base + span * 0.02;
        for (let i = 0; i < txt.length; i++) {
          const isBig = i === 0;
          x.font = `${isBig ? 700 : 600} ${isBig ? big : small}px Arial, sans-serif`;
          x.fillText(txt[i], px, 0);
          px += x.measureText(txt[i]).width + span * 0.035;
        }
      }
      x.restore();
    }
    // wypukłość: napisy + szum gumy
    const img = x.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const i = (y * W + xx) * 4, nv = noise[((y >> 3) % 64) * 512 + ((xx >> 3) % 512)] * 40;
      const v = Math.min(255, img.data[i] * 0.8 + nv);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
    x.putImageData(img, 0, 0);
    m.bumpMap = tex(c, { srgb: false }); m.bumpScale = 4;
    // mapa barwy: beżowe boki i czarny pas korony (opony gumwall); przejście miękkie jak przy wulkanizacji
    if (d.crownV) {
      const [c3, x3] = canvas(64, 1024), [v0, v1] = d.crownV, cs = new THREE.Color(d.sideColor), cc = new THREE.Color(d.crownColor);
      const g = x3.createLinearGradient(0, 0, 0, 1024), e = 0.006;
      const st = (v, col) => g.addColorStop(Math.min(1, Math.max(0, 1 - v)), '#' + col.getHexString());
      st(1, cs); st(v1 + e, cs); st(v1 - e, cc); st(v0 + e, cc); st(v0 - e, cs); st(0, cs);
      x3.fillStyle = g; x3.fillRect(0, 0, 64, 1024);
      m.map = tex(c3);
    }
    // szorstkość: litery trochę gładsze (od formy wulkanizacyjnej)
    const [c2, x2] = canvas(W / 4, H / 4); x2.drawImage(c, 0, 0, W / 4, H / 4);
    const im2 = x2.getImageData(0, 0, W / 4, H / 4);
    for (let i = 0; i < im2.data.length; i += 4) { const v = 235 - im2.data[i] * 0.55; im2.data[i] = im2.data[i + 1] = im2.data[i + 2] = v; }
    x2.putImageData(im2, 0, 0);
    m.roughnessMap = tex(c2, { srgb: false });
  },
};

export function applyTextures() {
  for (const m of allMaterials()) {
    if (m.userData.textured) continue;
    m.userData.textured = true;
    const d = m.userData.def, f = d && d.tex && RECIPES[d.tex];
    if (f) { f(m, d); m.needsUpdate = true; }
  }
}
export { RECIPES, canvas, tex, fbm, valueNoise, grayCanvas };

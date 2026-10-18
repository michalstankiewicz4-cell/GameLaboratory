// Realistic look: PBR material factory, procedural canvas textures (deck planks, weathering), merged box geometry
// and the scene lighting. The game is developed for this one look (other styles were removed in 0.3.0).
import * as THREE from '../../vendor/three.module.js';
import { mulberry32 } from '../core/util.js';

/* ---- procedural textures (canvas, generated once) ---- */
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const texCache = {};
// Deck planks: light lines along the ship, staggered butt joints, slight per-plank tint.
export function deckTex() {
  return texCache.deck ||= canvasTex(128, 256, (g, w, h) => {
    const r = mulberry32(3);
    const pw = 8;
    for (let x = 0; x < w; x += pw) {
      const v = 200 + r() * 40;
      g.fillStyle = `rgb(${v},${v * 0.93},${v * 0.82})`; g.fillRect(x, 0, pw, h);
      g.fillStyle = 'rgba(40,28,16,.55)'; g.fillRect(x, 0, 1, h);
      for (let y = r() * 60; y < h; y += 60 + r() * 50) g.fillRect(x, y, pw, 1);
    }
  });
}
// Weathered paint: low-frequency blotches, vertical rust streaks, fine grain (used as a multiply map).
export function grimeTex() {
  return texCache.grime ||= canvasTex(256, 256, (g, w, h) => {
    const r = mulberry32(9);
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, s = 10 + r() * 40, a = 0.03 + r() * 0.06;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      gr.addColorStop(0, `rgba(${r() < 0.4 ? '120,70,40' : '60,60,60'},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h * 0.6, len = 20 + r() * 90;
      g.fillStyle = `rgba(110,62,30,${0.05 + r() * 0.12})`; g.fillRect(x, y, 1 + r() * 1.5, len);
    }
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * 14; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
/* ---- material factory ---- */
// kind: 'hull' | 'deck' | 'paint' | 'metal' | 'dark' | 'land' | 'tree' | 'fx'
const cache = new Map();
export function mat(color, kind = 'paint', extra = {}) {
  const key = `${color}|${kind}|${JSON.stringify(extra)}`;
  if (cache.has(key)) return cache.get(key);
  const p = { color, roughness: 0.7, metalness: 0.15, flatShading: kind === 'tree', ...extra };
  if (kind === 'hull') Object.assign(p, { roughness: 0.55, metalness: 0.35, map: grimeTex() });
  if (kind === 'paint') Object.assign(p, { roughness: 0.6, metalness: 0.3, map: grimeTex() });
  if (kind === 'metal') Object.assign(p, { roughness: 0.4, metalness: 0.7 });
  if (kind === 'dark') Object.assign(p, { roughness: 0.5, metalness: 0.5 });
  if (kind === 'deck') Object.assign(p, { roughness: 0.85, metalness: 0, map: deckTex() });
  if (kind === 'land') Object.assign(p, { roughness: 0.95, metalness: 0 });
  if (kind === 'fx') Object.assign(p, { roughness: 1, metalness: 0 });
  const m = new THREE.MeshStandardMaterial(p);
  cache.set(key, m);
  return m;
}

// Merges [w,h,d,x,y,z,(rx,ry,rz)] boxes into one geometry (one draw call for many small parts).
export function mergeBoxes(list) {
  const pos = [], nor = [], uv = [];
  const e = new THREE.Euler();
  for (const [w, h, d, x, y, z, rx = 0, ry = 0, rz = 0] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e.set(rx, ry, rz)));
    g.translate(x, y, z);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

// Scene lighting: hemisphere + sun; bg is the fog and horizon colour, zenith the top of the sky dome.
export const LIGHT = { hemi: 1.1, sun: 3.4, sky: 0xbcd4e6, ground: 0x1e3040, sunColor: 0xffe4c0, bg: 0x9cb6c8, zenith: 0x4a7eb4 };

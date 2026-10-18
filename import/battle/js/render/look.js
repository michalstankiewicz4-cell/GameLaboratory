// Graphics styles. The style is chosen before the world is built (it decides materials, geometry detail,
// particle shapes, the ocean shading branch and the post-process), so changing it needs a reload.
//   pixel — original low-res pixel-art filter (shared with Capital Quarantine)
//   real  — full resolution, PBR materials with procedural weathering, ACES tone mapping, bloom, shadows
//   toon  — cel shading with banded light, ink outlines, stylised water rings
//   paint — painterly: Kuwahara filter, ink edges, paper grain, watercolour palette
import * as THREE from '../../vendor/three.module.js';
import { mulberry32 } from '../core/util.js';

export const STYLES = ['real', 'pixel', 'toon', 'paint'];        // order shown in Options; 'real' is the default
export const STYLE_ID = { pixel: 0, real: 1, toon: 2, paint: 3 };

export const LOOK = { style: 'real', get detail() { return LOOK.style !== 'pixel'; } };
export function setStyle(s) { LOOK.style = STYLES.includes(s) ? s : 'real'; }

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
// Toon light ramp: three hard bands.
function toonRamp() {
  if (texCache.ramp) return texCache.ramp;
  const t = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return (texCache.ramp = t);
}

/* ---- material factory ---- */
// kind: 'hull' | 'deck' | 'paint' | 'metal' | 'dark' | 'land' | 'tree' | 'fx'
const cache = new Map();
export function mat(color, kind = 'paint', extra = {}) {
  const key = `${LOOK.style}|${color}|${kind}|${JSON.stringify(extra)}`;
  if (cache.has(key)) return cache.get(key);
  const s = LOOK.style;
  let m;
  if (s === 'pixel') m = new THREE.MeshLambertMaterial({ color, flatShading: kind !== 'fx', ...extra });
  else if (s === 'toon') m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
  else {
    const p = { color, roughness: 0.7, metalness: 0.15, flatShading: kind === 'tree', ...extra };
    if (kind === 'hull') Object.assign(p, { roughness: 0.55, metalness: 0.35, map: grimeTex() });
    if (kind === 'paint') Object.assign(p, { roughness: 0.6, metalness: 0.3, map: grimeTex() });
    if (kind === 'metal') Object.assign(p, { roughness: 0.4, metalness: 0.7 });
    if (kind === 'dark') Object.assign(p, { roughness: 0.5, metalness: 0.5 });
    if (kind === 'deck') Object.assign(p, { roughness: 0.85, metalness: 0, map: deckTex() });
    if (kind === 'land') Object.assign(p, { roughness: 0.95, metalness: 0 });
    if (kind === 'fx') Object.assign(p, { roughness: 1, metalness: 0 });
    if (s === 'paint') { p.metalness *= 0.4; p.roughness = Math.min(1, p.roughness + 0.2); }
    m = new THREE.MeshStandardMaterial(p);
  }
  cache.set(key, m);
  return m;
}

// Particle geometry: boxes for pixel art, soft low-poly spheres elsewhere.
export const fxGeometry = () => (LOOK.style === 'pixel' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.IcosahedronGeometry(0.62, 1));

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

// Lighting per style: { hemi, sun, sky, ground, bg }.
export function lightFor(style) {
  switch (style) {
    case 'real': return { hemi: 1.1, sun: 3.4, sky: 0xbcd4e6, ground: 0x1e3040, sunColor: 0xffe4c0, bg: 0x9cb6c8 };
    case 'toon': return { hemi: 1.5, sun: 2.4, sky: 0xe6f2ff, ground: 0x506a80, sunColor: 0xfff6e0, bg: 0x8fd0ee };
    case 'paint': return { hemi: 1.4, sun: 2.6, sky: 0xf0e6d0, ground: 0x4a5a60, sunColor: 0xffe8c8, bg: 0xd8d0bc };
    default: return { hemi: 1.9, sun: 2.6, sky: 0xd8e6f0, ground: 0x2a3a48, sunColor: 0xfff0d8, bg: 0x9fb8c8 };
  }
}

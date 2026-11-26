// StreetKit — pikietaż: słupki hektometrowe i kilometrowe (buildMilepost, buildMileposts).
import * as THREE from '../../../vendor/three/three.module.js';
import { canvasTex, kitMat, sample } from './geom.js';

/* ---------------- słupki pikietażowe ---------------- */
// Pikietaż drogi: słupek hektometrowy co 100 m (biały, 12 × 12 cm, 0,6 m nad ziemią, czarna cyfra hektometra 1–9
// na ścianach zwróconych wzdłuż drogi) i kilometrowy na pełnym kilometrze (większy, z numerem kilometra).
//   buildMilepost(km, hm) → { group }                     hm 0 — słupek kilometrowy
//   buildMileposts(points, { offset, y, start, every }) → { group, count }   start — pikietaż (m) na początku linii
const postTexCache = new Map();
function postFace(text, w, h) {
  const k = text + w + h; if (postTexCache.has(k)) return postTexCache.get(k);
  const t = canvasTex(w, h, (c) => {
    c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `bold ${Math.round(Math.min(w / (text.length * 0.62), h * 0.42))}px Arial, sans-serif`; c.fillText(text, w / 2, h * 0.36);
  }, false);
  postTexCache.set(k, t); return t;
}
export function buildMilepost(km = 0, hm = 1) {
  const g = new THREE.Group(); g.name = hm ? `słupek hektometrowy ${km}+${hm}00` : `słupek kilometrowy ${km}`;
  const big = !hm, W = big ? 0.22 : 0.12, H = big ? 0.9 : 0.6, D = big ? 0.14 : 0.12;
  const white = kitMat('postWhite', () => new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 }));
  const face = new THREE.MeshStandardMaterial({ map: postFace(String(big ? km : hm), big ? 64 : 48, big ? 256 : 240), roughness: 0.8 });
  // lico z numerem wzdłuż drogi (lokalne ±x); 0,2 m w gruncie
  const box = new THREE.Mesh(new THREE.BoxGeometry(D, H + 0.2, W).translate(0, (H - 0.2) / 2, 0), [face, face, white, white, white, white]);
  box.castShadow = box.receiveShadow = true; g.add(box);
  if (big) { const cap = new THREE.Mesh(new THREE.BoxGeometry(D + 0.01, 0.12, W + 0.01).translate(0, H - 0.05, 0), kitMat('postRed', () => new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 }))); g.add(cap); }
  return { group: g };
}
export function buildMileposts(points, { offset = 0, y = 0, start = 0, every = 100 } = {}) {
  const S = sample(points, 0.5), g = new THREE.Group(); g.name = 'pikietaż'; const step = S.L / (S.pts.length - 1);
  let n = 0;
  for (let c = Math.ceil(start / every) * every; c <= start + S.L; c += every) {
    const q = S.pts[Math.min(S.pts.length - 1, Math.round((c - start) / step))];
    const km = Math.floor(c / 1000), hm = Math.round((c % 1000) / 100), p = buildMilepost(km, hm % 10);
    p.group.position.set(q.p.x + q.nx * offset, q.p.y + y, q.p.z + q.nz * offset); p.group.rotation.y = Math.atan2(-q.t.z, q.t.x);
    g.add(p.group); n++;
  }
  return { group: g, count: n };
}

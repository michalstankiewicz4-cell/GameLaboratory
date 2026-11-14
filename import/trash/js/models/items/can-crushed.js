// Puszka zgnieciona: ta sama puszka 0,33 l (js/models/items/can.js) sprasowana wzdłuż osi do ~38 mm — ścianka
// złożona w harmonijkę (fałdy wybrzuszone na zewnątrz, nierówne wokół), wieczko przekrzywione i przesunięte.
// Nadruk zostaje na pogniecionej ściance (te same UV). Warianty jak w puszce.
import * as THREE from '../../../vendor/three/three.module.js';
import { buildCan, VARIANTS } from './can.js';
import { rng } from '../geom.js';

const H0 = 0.1155, W0 = 0.0158, W1 = 0.1085;      // wysokość puszki, początek i koniec ścianki
const KEEP = 0.15;                                  // ścianka po zgnieceniu: 17% wysokości
const FOLDS = 3.5;                                  // liczba fałd harmonijki

function crush(v, seed) {
  // v w układzie puszki przed wyśrodkowaniem (dno y = 0)
  const r = Math.hypot(v.x, v.z), ph = Math.atan2(v.x, v.z);
  const top = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0.35).normalize(), 0.16);
  const wallH = (W1 - W0) * KEEP, drop = (W1 - W0) - wallH;
  let y = v.y, k = 1, ny = 0;
  if (y > W0 && y < W1) {
    const t = (y - W0) / (W1 - W0);
    // fałdy w romby (wyboczenie ścianki cienkiej puszki): grzbiety fałd biegną zygzakiem wokół (4 płaty),
    // sąsiednie fałdy przesunięte o pół płata; nierówno wokół i ostrzej na grzbiecie (fala trójkątna)
    const lobe = 0.6 * Math.sin(2 * ph + seed) + 0.4 * Math.sin(3 * ph - 1.3 * seed);
    const zig = 0.22 * Math.cos(4 * ph + seed) ;
    const u = FOLDS * t + zig + 0.15 * lobe, fr = u - Math.floor(u);
    const tri = 1 - Math.abs(fr * 2 - 1);                     // 0 w dolinie, 1 na grzbiecie
    const rr0 = Math.min(1, r / 0.033);
    k = 1 + (0.12 + 0.07 * Math.sin(Math.PI * t)) * Math.pow(tri, 1.3) * (0.7 + 0.3 * rr0) + 0.03 * lobe;
    ny = 0.00035 * Math.sin(Math.PI * 2 * u + ph * 3);
    y = W0 + t * wallH + ny;
    // ku górze ścianka przechodzi w przekrzywienie wieczka
    const p = new THREE.Vector3(v.x * k, y - W0 - wallH, v.z * k).applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0.35).normalize(), 0.16 * t));
    return new THREE.Vector3(p.x + 0.004 * t, p.y + W0 + wallH, p.z);
  }
  if (y >= W1) {
    const p = new THREE.Vector3(v.x, y - W1, v.z).applyMatrix4(top);
    return new THREE.Vector3(p.x + 0.004, p.y + W0 + wallH, p.z);
  }
  // dno: lekko spłaszczone i rozszerzone przy krawędzi
  return new THREE.Vector3(v.x * (1 + 0.04 * (y / W0)), y * 0.85, v.z * (1 + 0.04 * (y / W0)));
}

export function build(lod = 0, variant = 0) {
  const g = buildCan(variant, lod, lod ? 6 : 36, lod ? 24 : 72);
  const seed = 1.7 + variant * 2.3;
  g.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); v.y += 0.0577;           // z powrotem do układu z dnem na y = 0
      const w = crush(v, seed);
      p.setXYZ(i, w.x, w.y - 0.019, w.z);                   // nowy środek bryły
    }
    p.needsUpdate = true;
    if (o.name !== 'otwór wlewu') o.geometry.computeVertexNormals();
    o.geometry.computeBoundingBox(); o.geometry.computeBoundingSphere();
  });
  g.name = 'can-crushed';
  return g;
}

export const info = {
  id: 'can-crushed', name: 'Puszka zgnieciona', version: '1.0.0',
  mass: 0.0135, material: 'aluminium', variants: VARIANTS.length,
  crush: { x: 2.5, y: 2.5, z: 2.5 }, minScale: { x: 0.55, y: 0.55, z: 0.55 },
  collider: { type: 'cyl', r: 0.038, h: 0.042, segs: 14 },
};

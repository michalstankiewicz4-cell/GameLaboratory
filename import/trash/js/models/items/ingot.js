// Sztabka (gąska) odlana w formie linii odlewniczej: ostrosłup ścięty 400 × 120 mm u góry, 360 × 90 u dołu,
// wys. 80 mm (~3,2 l), zaokrąglone krawędzie, chropowata powierzchnia odlewu, na górze wklęsły skurcz metalu.
// Warianty: 0 — aluminium (2,7 kg/l), 1 — stal (7,85 kg/l), 2 — mieszanka (ciemniejsza, z nalotem).
import * as THREE from '../../../vendor/three/three.module.js';
import { part, loft, V, uvMeters } from '../geom.js';
import { mat, defineMat } from '../materials.js';

export const INGOT = { top: [0.40, 0.12], bottom: [0.36, 0.09], h: 0.08, volume: 0.0032 };
export const VARIANTS = [
  { name: 'aluminium', color: '#b9bdc1', metalness: 0.9, roughness: 0.75, density: 2700 },
  { name: 'stal', color: '#62666a', metalness: 0.9, roughness: 0.8, density: 7850 },
  { name: 'mieszanka', color: '#80786e', metalness: 0.85, roughness: 0.65, density: 5200 },
];

export function ingotGeometry(lod = 0) {
  const [tx, tz] = INGOT.top, [bx, bz] = INGOT.bottom, h = INGOT.h, n = lod ? 2 : 6, rings = [];
  // przekroje poziome od dołu do góry; zaokrąglone narożniki (8 punktów na róg)
  const rr = 0.012, k = lod ? 2 : 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = -h / 2 + h * t;
    // zaokrąglenie dolnej i górnej krawędzi: przekrój zwęża się przy samych krawędziach
    const e = Math.min(1, Math.min(t, 1 - t) * n * 0.8 + 0.55), sx = (bx + (tx - bx) * t) / 2 * (0.97 + 0.03 * e), sz = (bz + (tz - bz) * t) / 2 * (0.95 + 0.05 * e);
    const ring = [];
    for (const [cx, cz, a0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]]) for (let j = 0; j <= k; j++) {
      const a = a0 + (j / k) * Math.PI / 2;
      ring.push(V(cx * (sx - rr) + Math.cos(a) * rr, y, cz * (sz - rr) + Math.sin(a) * rr));
    }
    rings.push(ring);
  }
  const g = loft(rings, { smooth: true });
  // skurcz na górze: wierzchołki górnej zaślepki wciśnięte (środek niżej)
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > h / 2 - 1e-6) { const fx = 1 - Math.abs(p.getX(i)) / (tx / 2), fz = 1 - Math.abs(p.getZ(i)) / (tz / 2); p.setY(i, p.getY(i) - 0.006 * Math.min(fx * 3, 1) * Math.min(fz * 3, 1)); }
  g.computeVertexNormals(); uvMeters(g, 0.12);
  return g;
}

export function build(lod = 0, variant = 0) {
  const v = VARIANTS[variant % VARIANTS.length];
  const id = defineMat('ingot-' + variant, { color: v.color, roughness: v.roughness, metalness: v.metalness, tex: 'cast' });
  const g = new THREE.Group(); g.name = 'ingot';
  g.add(part('sztabka', ingotGeometry(lod), mat(id)));
  return g;
}

const [tx, tz] = INGOT.top, [bx, bz] = INGOT.bottom, hh = INGOT.h / 2;
export const info = {
  id: 'ingot', name: 'Sztabka', version: '1.0.0', variants: VARIANTS.length,
  mass: INGOT.volume * 2700, material: 'metal (wg wariantu)',
  crush: { x: 400, y: 400, z: 400 }, minScale: { x: 1, y: 1, z: 1 },
  collider: { type: 'hulls', hulls: [[-bx / 2, -hh, -bz / 2, bx / 2, -hh, -bz / 2, bx / 2, -hh, bz / 2, -bx / 2, -hh, bz / 2, -tx / 2, hh, -tz / 2, tx / 2, hh, -tz / 2, tx / 2, hh, tz / 2, -tx / 2, hh, tz / 2]] },
};

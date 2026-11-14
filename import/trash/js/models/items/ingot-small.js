// Mała sztabka aluminiowa z osobnych, mniejszych form linii odlewniczej: ostrosłup ścięty 250 × 80 mm u góry,
// 220 × 60 mm u dołu, wys. 50 mm (~0,83 l ≈ 2,2 kg aluminium), zaokrąglone krawędzie, skurcz na górze.
// Wygląd i budowa jak dużej sztabki (js/models/items/ingot.js); warianty składu te same.
import * as THREE from '../../../vendor/three/three.module.js';
import { part } from '../geom.js';
import { mat, defineMat } from '../materials.js';
import { ingotGeometry, VARIANTS } from './ingot.js';

const D = { top: [0.25, 0.08], bottom: [0.22, 0.06], h: 0.05 };
D.volume = D.h * ((D.top[0] * D.top[1] + D.bottom[0] * D.bottom[1] + Math.sqrt(D.top[0] * D.top[1] * D.bottom[0] * D.bottom[1])) / 3);
export const INGOT_SMALL = D;

export function build(lod = 0, variant = 0) {
  const v = VARIANTS[variant % VARIANTS.length];
  const id = defineMat('ingot-' + variant, { color: v.color, roughness: v.roughness, metalness: v.metalness, tex: 'cast' });
  const g = new THREE.Group(); g.name = 'ingot-small';
  g.add(part('mała sztabka', ingotGeometry(lod, D), mat(id)));
  return g;
}

const [tx, tz] = D.top, [bx, bz] = D.bottom, hh = D.h / 2;
export const info = {
  id: 'ingot-small', name: 'Mała sztabka', version: '1.0.0', variants: VARIANTS.length,
  mass: Math.round(D.volume * 2700 * 100) / 100, material: 'metal (wg wariantu)',
  crush: { x: 400, y: 400, z: 400 }, minScale: { x: 1, y: 1, z: 1 },
  collider: { type: 'hulls', hulls: [[-bx / 2, -hh, -bz / 2, bx / 2, -hh, -bz / 2, bx / 2, -hh, bz / 2, -bx / 2, -hh, bz / 2, -tx / 2, hh, -tz / 2, tx / 2, hh, -tz / 2, tx / 2, hh, tz / 2, -tx / 2, hh, tz / 2]] },
};

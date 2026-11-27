// Laboratorium mechaniki — wspólne pomocnicze katalogu przedmiotów: jednostki, porty, materiały, łańcuchy, kawałek wału,
// obrót części, wskaźnik przyporu.
import * as THREE from '../../../vendor/three/three.module.js';
import * as MK from '../../models/mech/mechkit.js';

export const TAU = Math.PI * 2, X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
export const mm = (v, d = 1) => `${(v * 1000).toLocaleString('pl', { maximumFractionDigits: d })} mm`;
export const kg = (v) => `${v.toLocaleString('pl', { maximumFractionDigits: v < 1 ? 3 : 2 })} kg`;
export const kgcm2 = (J) => `${(J * 1e4).toLocaleString('pl', { maximumFractionDigits: 3 })} kg·cm²`;
export const P = (id, name, kind = 'obrót') => ({ id, name, kind });
export const MATS = [['gear', 'stal 42CrMo4 ulepszona'], ['steel', 'stal C45 szlifowana'], ['brass', 'mosiądz CuZn39Pb3'], ['iron', 'żeliwo EN-GJL-250'], ['dark', 'stal czerniona'], ['alu', 'aluminium EN AW-6082']];
export const matName = (k) => (MATS.find((m) => m[0] === k) || [0, k])[1];
export const CHAINS = { '06B': { p: 0.009525, d1: 0.00635 }, '08A': { p: 0.0127, d1: 0.00792 }, '10A': { p: 0.015875, d1: 0.01016 }, '12A': { p: 0.01905, d1: 0.01191 } };
export const shaftBit = (len, r = 0.0125) => { const s = MK.shaft({ len, r }); s.position.x = -len / 2; return s; };   // krótki wał na podglądzie
export const spinAll = (...gs) => (t) => { for (const g of gs) g.userData.spin.rotation.x = t; };

// przybliżony wskaźnik przyporu pary kół zewnętrznych (α = 20°, wysokość głowy = m)
export function contactRatio(z1, z2) {
  const a = 20 * Math.PI / 180, r1 = z1 / 2, r2 = z2 / 2, ra1 = r1 + 1, ra2 = r2 + 1, rb1 = r1 * Math.cos(a), rb2 = r2 * Math.cos(a);
  return (Math.sqrt(ra1 * ra1 - rb1 * rb1) + Math.sqrt(ra2 * ra2 - rb2 * rb2) - (r1 + r2) * Math.sin(a)) / (Math.PI * Math.cos(a));
}

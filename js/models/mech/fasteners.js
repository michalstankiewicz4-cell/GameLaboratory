// MechKit — śruby mocujące (ISO 4017 z podkładką, klasa 8.8): napięcie wstępne i tarcie złącza trzymają część na stole.
import * as THREE from '../../../vendor/three/three.module.js';
import { materials, mesh, ringY, STEEL_RHO } from './base.js';

/* ---------------- śruba mocująca ---------------- */
// śruba z łbem sześciokątnym ISO 4017 z podkładką (klasa 8.8): początek układu — płaszczyzna pod podkładką, oś +y.
// Napięcie wstępne F_p = 0,7·R_p0,2·A_s (R_p0,2 = 640 MPa); siła tarcia złącza μ·F_p (μ = 0,15) trzyma część na stole.
export const BOLTS = { 6: { s: 0.01, k: 0.004, As: 20.1e-6 }, 8: { s: 0.013, k: 0.0053, As: 36.6e-6 }, 10: { s: 0.016, k: 0.0064, As: 58e-6 }, 12: { s: 0.018, k: 0.0075, As: 84.3e-6 }, 16: { s: 0.024, k: 0.01, As: 157e-6 } };
export function bolt({ d = 0.01, len = 0.03, name } = {}) {
  const M = materials(), D = BOLTS[Math.round(d * 1000)] || BOLTS[10], g = new THREE.Group(); g.name = name || `Śruba M${Math.round(d * 1000)} × ${Math.round(len * 1000)}`;
  const wt = d * 0.2, wr = d * 1.05;
  const washer = mesh(ringY(d * 0.54, wr, wt, 24), M.steel); washer.position.y = wt / 2; g.add(washer);
  const head = mesh(new THREE.CylinderGeometry(D.s / 2 / Math.cos(Math.PI / 6), D.s / 2 / Math.cos(Math.PI / 6), D.k, 6), M.dark); head.position.y = wt + D.k / 2; g.add(head);
  const shank = mesh(new THREE.CylinderGeometry(d / 2, d / 2, len, 16), M.dark); shank.position.y = -len / 2 + wt * 0.5; g.add(shank);   // trzpień (w otworze, widać po odkręceniu)
  shank.userData.doctorOk = 'clash';   // trzpień siedzi w otworze gwintowanym części — pasowanie, nie kolizja (łeb i podkładka już tak)
  const Fp = 0.7 * 640e6 * D.As;
  Object.assign(g.userData, { d, len, Fp, mu: 0.15, mass: STEEL_RHO * (Math.PI * d * d / 4 * len + D.s * D.s * 0.87 * D.k), bolt: true });
  return g;
}

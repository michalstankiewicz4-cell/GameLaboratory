// MechKit — łożyska toczne i ślizgowe do osadzenia w oprawie lub obudowie (dane katalogowe dla d = 25 mm, inne
// średnice skalowane): kulkowe, walcowe, stożkowe, wzdłużne, igiełkowe, tuleja z brązu.
import * as THREE from '../../../vendor/three/three.module.js';
import { BRASS_RHO, cyl, DOMAIN, lathe, materials, mesh, newPart, PHYS, port, ringX, STEEL_RHO, TAU } from './base.js';

/* ---------------- łożyska (osobno, do osadzenia w oprawie / obudowie) ---------------- */
// Dane katalogowe dla d = 25 mm (inne średnice — skalowane, ok.): C — nośność dynamiczna, C0 — statyczna (N),
// n — prędkość graniczna (obr/min), mu — współczynnik tarcia (moment M = μ·P·d/2), p — wykładnik trwałości
// (L10 = (C/P)^p · 10⁶ obrotów), Z — liczba elementów tocznych, Dw — ich średnica, alpha — kąt działania
export const BEARINGS = {
  ball: { name: 'Kulkowe zwykłe 6205', D: 0.052, B: 0.015, C: 14800, C0: 7800, n: 18000, mu: 0.0015, p: 3, Z: 9, Dw: 0.00794, alpha: 0, load: 'promieniowe, osiowe do 0,5·C0' },
  roller: { name: 'Walcowe NU 205', D: 0.052, B: 0.015, C: 28600, C0: 27000, n: 15000, mu: 0.0011, p: 10 / 3, Z: 12, Dw: 0.0065, alpha: 0, load: 'promieniowe (duże), bez osiowych' },
  taper: { name: 'Stożkowe 30205', D: 0.052, B: 0.01625, C: 32500, C0: 37000, n: 9000, mu: 0.0018, p: 10 / 3, Z: 15, Dw: 0.0065, alpha: 14 * Math.PI / 180, load: 'promieniowe i osiowe w jedną stronę (para)' },
  thrust: { name: 'Wzdłużne kulkowe 51105', D: 0.042, B: 0.011, C: 15900, C0: 32000, n: 6000, mu: 0.0013, p: 3, Z: 14, Dw: 0.00635, alpha: Math.PI / 2, load: 'tylko osiowe' },
  needle: { name: 'Igiełkowe NK 25/20', D: 0.033, B: 0.02, C: 22000, C0: 32000, n: 13000, mu: 0.0025, p: 10 / 3, Z: 22, Dw: 0.0025, alpha: 0, load: 'promieniowe, mała wysokość' },
  plain: { name: 'Tuleja ślizgowa z brązu (smarowana)', D: 0.03, B: 0.02, C: 0, C0: 0, n: 1500, mu: 0.06, p: 0, Z: 0, Dw: 0, alpha: 0, load: 'promieniowe, p·v ≤ 1,6 MPa·m/s' },
};
// łożysko toczne lub ślizgowe: pierścień zewnętrzny nieruchomy (mocowanie), wewnętrzny w spin, elementy toczne
// w userData.cage (koszyk obraca się z prędkością ω·(1 − Dw·cos α / dm)/2); oś wzdłuż +x
export function rollingBearing({ type = 'ball', d = 0.025, seal = false, name } = {}) {   // seal: uszczelnienia 2RS (kulki zakryte)
  const M = materials(), b0 = BEARINGS[type] || BEARINGS.ball, k = d / 0.025, D = b0.D * k, B = b0.B * k, Dw = b0.Dw * k;
  const g = newPart(name || `Łożysko ${b0.name}${k === 1 ? '' : ` (Ø ${Math.round(d * 1000)}, ok.)`}`), sp = g.userData.spin, cage = new THREE.Group(); g.add(cage);
  const dm = (d + D) / 2, r1 = d / 2, r2 = D / 2;
  const ring = (ri, ro, w, mat, x = 0) => { const m = mesh(lathe([[ri, -w / 2], [ro, -w / 2], [ro, w / 2], [ri, w / 2], [ri, -w / 2]]), mat); m.position.x = x; return m; };
  if (type === 'plain') {
    g.add(ring(r1 + 0.0002, r2, B, M.brass));   // tuleja w obudowie; wał obraca się w niej (luz 0,2 mm)
  } else if (type === 'thrust') {
    g.add(ring(r1 + 0.001, r2, B * 0.3, M.steel, B * 0.35)); sp.add(ring(r1, r2 - 0.001, B * 0.3, M.steel, -B * 0.35));   // podkładka obudowy / wałka
    for (let i = 0; i < b0.Z; i++) { const a = i * TAU / b0.Z, bl = mesh(new THREE.SphereGeometry(Dw / 2, 16, 12), M.steel); bl.position.set(0, dm / 2 * Math.cos(a), dm / 2 * Math.sin(a)); cage.add(bl); }
  } else {
    const t = (r2 - r1) * 0.28;
    g.add(ring(dm / 2 + Dw / 2 * 0.86, r2, B, M.steel)); sp.add(ring(r1, dm / 2 - Dw / 2 * 0.86, B, M.steel));
    for (let i = 0; i < b0.Z; i++) {
      const a = i * TAU / b0.Z, y = dm / 2 * Math.cos(a), z = dm / 2 * Math.sin(a);
      let el;
      if (type === 'ball') el = mesh(new THREE.SphereGeometry(Dw / 2, 16, 12), M.steel);
      else if (type === 'taper') el = mesh(cyl(Dw / 2 * 0.85, B * 0.7, 14, Dw / 2 * 1.1), M.steel);
      else el = mesh(cyl(Dw / 2, type === 'needle' ? B * 0.85 : B * 0.7, 14), M.steel);
      el.position.set(0, y, z);
      if (type === 'taper') el.quaternion.setFromAxisAngle(new THREE.Vector3(0, -Math.sin(a), Math.cos(a)), -b0.alpha);   // wałeczek pochylony o kąt działania
      cage.add(el);
    }
    if (type !== 'needle') { const cg = mesh(new THREE.TorusGeometry(dm / 2, t * 0.12, 6, 48).rotateY(Math.PI / 2), M.brass); cg.position.x = B * 0.36; cage.add(cg); }
    if (seal) for (const sx of [-1, 1]) { const sl = mesh(ringX(dm / 2 - Dw / 2 * 0.86, dm / 2 + Dw / 2 * 0.86, B * 0.06), M.rubber); sl.position.x = sx * B * 0.45; g.add(sl); }
  }
  const vol = Math.PI * (r2 * r2 - r1 * r1) * B * (type === 'plain' ? 1 : 0.62), mass = (type === 'plain' ? BRASS_RHO : STEEL_RHO) * vol, s = k ** 1.8;
  Object.assign(g.userData, { type, d, D, B, dm, Dw, Z: b0.Z, alpha: b0.alpha, cage, mass, J: 0.25 * mass * (r1 * r1 + dm * dm / 4),
    data: { ...b0, C: b0.C * s, C0: b0.C0 * s, n: b0.n / k },
    phys: { mu: b0.mu, drag: PHYS.bearing.drag }, ports: { bore: port('Otwór (wał)', DOMAIN.rot, 'łożysko'), housing: port('Obudowa (mocowanie)', DOMAIN.rot, 'mocowanie') },
    cageRatio: type === 'plain' ? 0 : (1 - Dw * Math.cos(b0.alpha) / dm) / 2 });
  return g;
}

// ClockKit — koła zegarowe z ramionami (zarys ewolwentowy z MechKit), zębniki ze stali hartowanej, osie z czopami.
import * as THREE from '../../../../vendor/three/three.module.js';
import { involuteOutline, DOMAIN } from '../mechkit.js';
import { TAU, EN, mesh, port, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- koło zegarowe: zarys ewolwentowy, wieniec, ramiona ---------------- */
// zarys z MechKit (sx, sy) → płaszczyzna xy zegara: x = −sy, y = sx (ząb przy kącie 0 w górę, obrót +z)
export function clockWheel({ z = 60, m = 0.0006, t = 0.0018, mat = 'brassP', arms = 5, bore = 0.0012, name } = {}) {
  const M = materials(), o = involuteOutline(z, m, { backlash: 0.06 }), shape = new THREE.Shape(o.pts.map((p) => new THREE.Vector2(-p.y, p.x)));
  const rim = o.rf - Math.max(0.0012, 2.2 * m), hubR = Math.max(bore * 3.2, 0.0035);
  shape.holes.push(circle(bore, 24));
  const g = new THREE.Group(); g.name = name || `${EN ? 'Wheel' : 'Koło'} z = ${z}`;
  if (arms && rim - hubR > 0.004) {
    // okna między ramionami (ramiona lekko zwężane jak w zegarach): łuk wieńca, dwa boki ramion, łuk piasty
    const aw = Math.min(0.5, 1.6 / arms) * 0.28;
    for (let k = 0; k < arms; k++) {
      const a0 = k * TAU / arms, a1 = (k + 1) * TAU / arms, gIn = aw * (rim / hubR) * 0.45, gOut = aw * 0.55;
      const p = new THREE.Path();
      p.moveTo(rim * Math.cos(a0 + gOut), rim * Math.sin(a0 + gOut));
      p.absarc(0, 0, rim, a0 + gOut, a1 - gOut, false);
      p.lineTo(hubR * Math.cos(a1 - gIn), hubR * Math.sin(a1 - gIn));
      p.absarc(0, 0, hubR, a1 - gIn, a0 + gIn, true);
      p.closePath(); shape.holes.push(p);
    }
  }
  const body = mesh(slab(shape, t, -t / 2, 0.00012, 12), M[mat]); g.add(body);
  const hub = mesh(cylZ(hubR * 0.8, t * 2.2, 24), M[mat]); g.add(hub);   // piasta (kołnierz) na osi
  g.userData = { z, m, rp: o.rp, ra: o.ra, rf: o.rf, t, mass: Math.PI * o.rp * o.rp * t * 8500 * (arms ? 0.45 : 1), J: 0.5 * 8500 * Math.PI * o.rp ** 4 * t * (arms ? 0.6 : 1), ports: { mesh: port('Zazębienie', DOMAIN.rot, 'zazębienie'), bore: port('Otwór (oś)', DOMAIN.rot, 'wał') } };
  return g;
}
// zębnik (liście) ze stali hartowanej, polerowany, z osią
export function pinion({ z = 10, m = 0.0006, len = 0.004, name } = {}) {
  const M = materials(), o = involuteOutline(z, m, { backlash: 0.06 }), shape = new THREE.Shape(o.pts.map((p) => new THREE.Vector2(-p.y, p.x)));
  const g = new THREE.Group(); g.name = name || `${EN ? 'Pinion' : 'Zębnik'} z = ${z}`;
  g.add(mesh(slab(shape, len, -len / 2, 0.00008, 8), M.steelP));
  g.userData = { z, m, rp: o.rp, ports: { mesh: port('Zazębienie', DOMAIN.rot, 'zazębienie') } };
  return g;
}
// oś (wałek zegarowy) z czopami: od z0 do z1, Ø d, czopy cieńsze na końcach
export function arbor(z0, z1, d = 0.0024, dp = 0.0012) {
  const M = materials(), g = new THREE.Group(), L = z1 - z0, piv = 0.0025;
  const a = mesh(cylZ(d / 2, L - 2 * piv, 16), M.steelP); a.position.z = (z0 + z1) / 2; g.add(a);
  for (const zz of [z0 + piv / 2, z1 - piv / 2]) { const p = mesh(cylZ(dp / 2, piv, 12), M.steelP); p.position.z = zz; g.add(p); }
  return g;
}

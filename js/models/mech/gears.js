// MechKit — zębatka walcowa (gear), koło koronowe (ringGear), koło łańcuchowe (sprocket).
import * as THREE from '../../../vendor/three/three.module.js';
import { PHYS, RHO, STEEL_RHO, TAU, boreHole, circlePath, extrude, materials, mesh, newPart } from './base.js';
import { involuteOutline, sprocketOutline } from './teeth.js';

/* ---------------- zębatka ---------------- */
export function gear({ z = 20, m = 0.004, w = 0.04, bore = 0.0125, mat = 'gear', hub = true, holes: lighten = true, alpha = 20, name } = {}) {
  const M = materials(), o = involuteOutline(z, m, { alpha: alpha * Math.PI / 180 }), shape = new THREE.Shape(o.pts);
  bore = Math.min(bore, (o.rf - 0.5 * m) / 1.35);   // otwór z rowkiem wpustu (do 1,28 r) mieści się pod stopą zęba
  shape.holes.push(boreHole(bore));
  const hubR = Math.max(bore * 1.9, bore + 0.012), ring = o.rf - 0.006 - 1.2 * m;
  let holes = 0;
  if (lighten && ring - hubR > 0.022) {   // otwory odciążające w tarczy
    holes = 6; const rm = (ring + hubR) / 2, rr = Math.min((ring - hubR) * 0.36, rm * Math.sin(Math.PI / holes) * 0.75);   // otwory nie nachodzą na siebie
    for (let k = 0; k < holes; k++) shape.holes.push(circlePath(rr, 32, rm * Math.cos(k * TAU / holes + Math.PI / holes), rm * Math.sin(k * TAU / holes + Math.PI / holes)));
  }
  const g = newPart(name || `Zębatka z = ${z}`), body = mesh(extrude(shape, w), M[mat]);
  g.userData.spin.add(body);
  let hubLen = 0;
  if (hub && holes) {   // piasta po obu stronach tarczy
    hubLen = w * 0.35;
    const hg = new THREE.Shape(); hg.absarc(0, 0, hubR, 0, TAU, false); hg.holes.push(boreHole(bore));
    for (const s of [-1, 1]) { const h = mesh(extrude(hg, hubLen + 0.001, 0.0008), M[mat]); h.position.x = s * (w + hubLen - 0.001) / 2; g.userData.spin.add(h); }   // piasta zachodzi 0,5 mm w tarczę — bez wspólnej płaszczyzny
  }
  const area = Math.PI * (o.rp * o.rp - bore * bore), rho = RHO[mat] || STEEL_RHO, mass = rho * area * w * (holes ? 0.78 : 1);
  Object.assign(g.userData, { phys: { ...PHYS.mesh, luz: PHYS.mesh.thin * m }, z, m, alpha: alpha * Math.PI / 180, rp: o.rp, ra: o.ra, rf: o.rf, rb: o.rb, w, mass, J: 0.5 * mass * (o.rp * o.rp * 0.9 + bore * bore), material: mat, hubLen, holes });
  return g;
}
// koło koronowe: otwór o zarysie „wrębów” (głowa korony = stopa zęba koła zewnętrznego)
export function ringGear({ z = 72, m = 0.002, w = 0.03, rim = 0.012, mat = 'brass', name } = {}) {
  const M = materials(), o = involuteOutline(z, m, { add: 1.25, ded: 1, backlash: -0.04 }), shape = new THREE.Shape();
  const R = o.ra + rim; shape.absarc(0, 0, R, 0, TAU, false);
  shape.holes.push(new THREE.Path(o.pts));
  const g = newPart(name || `Koło koronowe z = ${z}`);
  g.userData.spin.add(mesh(extrude(shape, w, 0.0005, 96), M[mat]));
  const mass = (RHO[mat] || STEEL_RHO) * Math.PI * (R * R - o.rp * o.rp) * w;
  Object.assign(g.userData, { phys: { ...PHYS.planetary, luz: PHYS.mesh.thin * m }, z, m, rp: o.rp, R, ra: o.ra, rf: o.rf, w, internal: true, mass, J: 0.5 * mass * (R * R + o.rp * o.rp) });
  return g;
}

/* ---------------- koło łańcuchowe ---------------- */
export function sprocket({ z = 18, p = 0.0127, d1 = 0.00792, w = 0.0072, bore = 0.0125, mat = 'dark', name } = {}) {
  const M = materials(), { pts, R, rs } = sprocketOutline(z, p, d1);
  bore = Math.min(bore, (R - rs - 0.002) / 1.35);   // otwór z wpustem pod gniazdami rolek
  const shape = new THREE.Shape(pts); shape.holes.push(boreHole(bore));
  const g = newPart(name || `Koło łańcuchowe z = ${z}`);
  g.userData.spin.add(mesh(extrude(shape, w, 0.0005), M[mat]));
  const hubR = Math.max(bore * 1.45, Math.min(R - rs - 0.002, bore * 2.2)), hs = new THREE.Shape(); hs.absarc(0, 0, hubR, 0, TAU, false); hs.holes.push(boreHole(bore));
  const hub = mesh(extrude(hs, 0.023, 0.0008), M[mat]); hub.position.x = -(w + 0.021) / 2; g.userData.spin.add(hub);   // zachodzi 1 mm w tarczę
  const mass = STEEL_RHO * Math.PI * R * R * w + STEEL_RHO * Math.PI * hubR * hubR * 0.022;
  Object.assign(g.userData, { phys: { ...PHYS.chain }, z, p, d1, R, rs, w, sprocket: true, mass, J: 0.5 * mass * R * R * 0.8 });
  return g;
}

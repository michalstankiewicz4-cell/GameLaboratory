// ClockKit — koło zamachowe żeliwne (wieniec toczony, ramiona i piasta malowane).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { TAU, EN, mesh, port, cylZ, materials } from '../common.js';

/* ---------------- koło zamachowe ---------------- */
// żeliwne, wieniec toczony (goła powierzchnia), ramiona i piasta malowane; oś wzdłuż +z
export function flywheel({ D = 0.5, rimW = 0.06, rimT = 0.05, arms = 6, bore = 0.02, mat = 'iron', name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Flywheel' : 'Koło zamachowe'} Ø ${Math.round(D * 1000)}`;
  const R = D / 2, Ri = R - rimT, hubR = Math.max(bore * 2.2, D * 0.09), hubL = rimW * 1.25;
  const rim = mesh(new THREE.LatheGeometry([new THREE.Vector2(Ri, -rimW / 2), new THREE.Vector2(R - 0.002, -rimW / 2), new THREE.Vector2(R, -rimW / 2 + 0.002), new THREE.Vector2(R, rimW / 2 - 0.002), new THREE.Vector2(R - 0.002, rimW / 2), new THREE.Vector2(Ri, rimW / 2), new THREE.Vector2(Ri, -rimW / 2)], 128).rotateX(Math.PI / 2), M.steel);
  g.add(rim);
  for (let k = 0; k < arms; k++) {   // ramiona eliptyczne, zwężane ku wieńcowi, lekko wygięte
    const a = k * TAU / arms, len = Ri - hubR + 0.004, arm = mesh(new THREE.CylinderGeometry(rimW * 0.18, rimW * 0.3, len, 16).scale(1, 1, 0.55), M.castPaint);
    arm.position.set(Math.cos(a) * (hubR + len / 2 - 0.002), Math.sin(a) * (hubR + len / 2 - 0.002), 0); arm.rotation.z = a - Math.PI / 2; g.add(arm);
  }
  const hub = mesh(cylZ(hubR, hubL, 48), M.castPaint); g.add(hub);
  const bh = mesh(cylZ(bore, hubL + 0.002, 32), M.steel); g.add(bh);
  const rho = mat === 'steel' ? 7850 : 7200;
  const mRim = rho * Math.PI * (R * R - Ri * Ri) * rimW, mHub = rho * Math.PI * (hubR * hubR - bore * bore) * hubL, mArm = rho * arms * (Ri - hubR) * Math.PI * (rimW * 0.24) ** 2 * 0.55;
  const J = 0.5 * mRim * (R * R + Ri * Ri) + 0.5 * mHub * (hubR * hubR + bore * bore) + mArm * ((Ri + hubR) / 2) ** 2;
  g.userData = { D, R, Ri, rimW, mass: mRim + mHub + mArm, mRim, J, rho, ports: { bore: port('Otwór z wpustem (wał)', DOMAIN.rot, 'wał') } };
  return g;
}

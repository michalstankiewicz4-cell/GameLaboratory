// Regulator odśrodkowy Watta: wrzeciono pionowe w kolumnie z żeliwa, głowica z przegubami ramion, dwa ramiona z kulami
// (żeliwo toczone), łączniki do tulei przesuwnej, dźwignia przepustnicy na tulei, koło stożkowe napędu u dołu.
// Oś wrzeciona: +y, zawieszenie ramion w (0, top, 0). pose(φ, θ) — kąt ramion i obrót wrzeciona.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN, involuteOutline } from '../mechkit.js';
import { EN, mesh, port, materials } from '../common.js';

export function governor({ L = 0.12, a = 0.06, l = 0.06, ball = 0.024, top = 0.3, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Watt centrifugal governor' : 'Regulator odśrodkowy Watta');
  const base = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 48), M.iron); base.position.y = 0.01; g.add(base);
  const col = mesh(new THREE.CylinderGeometry(0.018, 0.026, top * 0.45, 32), M.castPaint); col.position.y = 0.02 + top * 0.225; g.add(col);
  const spin = new THREE.Group(); g.add(spin);
  const spindle = mesh(new THREE.CylinderGeometry(0.006, 0.006, top + 0.03, 24), M.steelP); spindle.position.y = (top + 0.03) / 2; spin.add(spindle);
  const head = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 24), M.brassP); head.position.y = top; spin.add(head);
  const cap = mesh(new THREE.SphereGeometry(0.012, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.brassP); cap.position.y = top + 0.01; spin.add(cap);
  // koło stożkowe u dołu (wieniec z zębami — zarys ewolwentowy na stożku przybliżony walcem)
  const o = involuteOutline(24, 0.0015), sh = new THREE.Shape(o.pts); const bevel = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }).rotateX(Math.PI / 2), M.brassP); bevel.position.y = 0.02 + top * 0.45 + 0.012; spin.add(bevel);
  const sleeve = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 24), M.brassP); spin.add(sleeve);
  const arms = [], links = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.y = top; spin.add(arm);
    const rod = mesh(new THREE.CylinderGeometry(0.0035, 0.0035, L, 12), M.steelP); rod.position.y = -L / 2; arm.add(rod);
    const b = mesh(new THREE.SphereGeometry(ball, 32, 20), M.iron); b.position.y = -L; arm.add(b);
    arms.push({ g: arm, s });
    const link = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, l, 10), M.steelP); spin.add(link); links.push({ m: link, s });
  }
  const lever = mesh(new THREE.BoxGeometry(0.12, 0.006, 0.01), M.steel); g.add(lever);
  // podpora dźwigni: słupek na łapie podstawy (od stołu), widełki szersze od dźwigni
  const lug = mesh(new THREE.BoxGeometry(0.045, 0.012, 0.016), M.iron); lug.position.set(0.0775, 0.006, 0); g.add(lug);
  const fulcrum = mesh(new THREE.BoxGeometry(0.01, 0.02 + top * 0.5 - 0.012, 0.014), M.iron); fulcrum.position.set(0.09, 0.012 + (0.02 + top * 0.5 - 0.012) / 2, 0); g.add(fulcrum);
  function pose(phi, theta) {
    spin.rotation.y = theta;
    for (const A of arms) A.g.rotation.z = A.s * phi;
    const ys = -a * Math.cos(phi) - Math.sqrt(Math.max(0, l * l - (a * Math.sin(phi)) ** 2));
    sleeve.position.y = top + ys;
    for (const Lk of links) { const p = new THREE.Vector3(Lk.s * -a * Math.sin(phi) * -1, top - a * Math.cos(phi), 0), q = new THREE.Vector3(0, top + ys, 0); Lk.m.position.copy(p).add(q).multiplyScalar(0.5); Lk.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(q).normalize()); }
    lever.position.set(0.045, top + ys, 0); lever.rotation.z = Math.atan2(top + ys - (0.02 + top * 0.5), 0.09) * 0.5;
  }
  pose(0.18, 0);
  g.userData = { L, a, l, ball, top, mass: 2 * (4 / 3) * Math.PI * ball ** 3 * 7200 + 3, pose, ballMass: (4 / 3) * Math.PI * ball ** 3 * 7200,
    ports: { drive: port(EN ? 'Bevel gear (drive from the engine)' : 'Koło stożkowe (napęd od silnika)', DOMAIN.rot, 'zazębienie'), sleeve: port(EN ? 'Sleeve — throttle lever' : 'Tuleja — dźwignia przepustnicy', DOMAIN.lin, 'dźwignia') } };
  return g;
}

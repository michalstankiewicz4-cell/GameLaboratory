// ClockKit — koło zapadkowe z zapadką (kąt zapadki z geometrii zarysu).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { TAU, EN, mesh, port, circle, slab, cylZ, materials } from '../common.js';

/* ---------------- koło zapadkowe i zapadka ---------------- */
// koło z zębami piłowymi (czoło promieniowe, grzbiet pochylony), zapadka na sworzniu ze sprężynką; koło obraca się
// przeciwnie do zegara (+z), zapadka trzyma obrót wstecz. pawlAngle(θ) — kąt zapadki z geometrii (wierzchołek zapadki
// na zarysie koła), wspólne dla modelu i opisu.
export function ratchet({ z = 24, R = 0.03, t = 0.006, h = null, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Ratchet wheel and pawl' : 'Koło zapadkowe z zapadką'} z = ${z}`;
  const p = TAU / z, hh = h || Math.min(0.35 * R * p * 1.3, R * 0.18), Rr = R - hh, pts = [];
  // obrys: dla zęba k — wierzchołek przy kącie a_k, czoło promieniowo w dół, grzbiet od stopy do następnego wierzchołka
  for (let k = 0; k < z; k++) { const a = k * p; pts.push(new THREE.Vector2(Rr * Math.cos(a), Rr * Math.sin(a))); for (let i = 1; i <= 6; i++) { const f = i / 6, aa = a + f * p * 0.999, r = Rr + hh * f; pts.push(new THREE.Vector2(r * Math.cos(aa), r * Math.sin(aa))); } }
  const shape = new THREE.Shape(pts); shape.holes.push(circle(Math.min(0.006, Rr * 0.3), 32));
  const wheel = new THREE.Group(); wheel.add(mesh(slab(shape, t, -t / 2, 0.0002, 8), M.steelP)); g.add(wheel);
  // zarys koła w funkcji kąta (w układzie koła): promień zarysu dla kąta ψ
  const prof = (psi) => { let f = (((psi % p) + p) % p) / p; return Rr + hh * f; };
  // zapadka: sworzeń w punkcie Pv nad kołem, ramię długości lp; wierzchołek ramienia opiera się o zarys
  const Pv = new THREE.Vector2(-R * 0.2, R + R * 0.55), lp = Pv.distanceTo(new THREE.Vector2(0, R)) * 1.02;
  const tip0 = Math.atan2(R - Pv.y, 0 - Pv.x);   // kierunek od sworznia do szczytu koła
  function pawlAngle(theta) {   // największy kąt β (zapadka opuszczana sprężyną), przy którym wierzchołek nie wchodzi w koło
    let best = tip0 - 0.6;
    for (let i = 0; i <= 240; i++) {
      const b = tip0 - 0.6 + 1.2 * i / 240, x = Pv.x + lp * Math.cos(b), y = Pv.y + lp * Math.sin(b), r = Math.hypot(x, y), psi = Math.atan2(y, x) - theta;
      if (r >= prof(psi)) best = b; else break;
    }
    return best;
  }
  const pawl = new THREE.Group(); pawl.position.set(Pv.x, Pv.y, 0); g.add(pawl);
  const ps = new THREE.Shape(); ps.moveTo(0, -0.0035); ps.lineTo(lp, -0.0006); ps.lineTo(lp + 0.0008, 0.0012); ps.lineTo(lp * 0.55, 0.0045); ps.lineTo(0, 0.0045); ps.closePath();
  pawl.add(mesh(slab(ps, t * 0.8, -t * 0.4, 0.0002, 4), M.blued), mesh(cylZ(0.004, t * 1.3, 20), M.brassF));
  const pin = mesh(cylZ(0.0018, t * 1.8, 12), M.steelP); pin.position.set(Pv.x, Pv.y, 0); g.add(pin);
  const springW = mesh(new THREE.TorusGeometry(0.006, 0.0006, 6, 24, Math.PI * 1.2), M.spring); springW.position.set(Pv.x + 0.004, Pv.y + 0.004, t * 0.3); g.add(springW);
  for (const a of [0, Math.PI * 1.2]) { const e = mesh(new THREE.SphereGeometry(0.0006, 8, 6), M.spring); e.position.set(Pv.x + 0.004 + 0.006 * Math.cos(a), Pv.y + 0.004 + 0.006 * Math.sin(a), t * 0.3); g.add(e); }   // końce drutu sprężynki
  const setAngle = (theta) => { wheel.rotation.z = theta; pawl.rotation.z = pawlAngle(theta); };
  setAngle(0);
  g.userData = { z, R, t, h: hh, step: p, setAngle, pawlAngle, mass: Math.PI * R * R * t * 7850 * 0.9, J: 0.5 * Math.PI * R * R * t * 7850 * R * R,
    ports: { bore: port('Otwór (wał)', DOMAIN.rot, 'wał'), pawl: port('Zapadka — sworzeń (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

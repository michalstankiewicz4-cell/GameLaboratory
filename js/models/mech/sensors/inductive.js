// Czujnik indukcyjny zbliżeniowy (EN 60947-5-2): korpus gwintowany z mosiądzu niklowanego, dwie nakrętki, czoło z PBT
// (montaż równy z powierzchnią — „flush” — albo wystające), złącze M12 z diodą LED (żółta — wyjście, zielona — zasilanie).
// Oś wzdłuż +y, czoło czujnika w y = 0 skierowane w −y (patrzy w dół), korpus wyżej. setOn(b) — dioda wyjścia.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, glow } from '../common.js';
import { INDUCTIVE } from '../../../behaviors/land/mech/sensors.js';

const D_OF = { M8: 0.008, M12: 0.012, M18: 0.018, M30: 0.03 }, PITCH = { M8: 0.001, M12: 0.001, M18: 0.001, M30: 0.0015 }, LEN = { M8: 0.04, M12: 0.05, M18: 0.06, M30: 0.065 };
export function inductiveSensor({ size = 'M12', flush = true, name } = {}) {
  const M = materials(), g = new THREE.Group(), d = D_OF[size] || 0.012, r = d / 2, L = LEN[size] || 0.05, p = PITCH[size] || 0.001;
  g.name = name || `${EN ? 'Inductive sensor' : 'Czujnik indukcyjny'} ${size} PNP NO`;
  const nickel = new THREE.MeshPhysicalMaterial({ color: 0xc9ccce, metalness: 1, roughness: 0.22, clearcoat: 0.2 });
  // gwint: profil piłowy toczony (zarys metryczny 60°, głębokość 0,61·P)
  const cap = flush ? 0.0005 : Math.max(0.003, d * 0.25), y0 = cap, pts = [new THREE.Vector2(0, y0)];
  const h = 0.61 * p, n = Math.floor((L - y0) / p);
  pts.push(new THREE.Vector2(r - h, y0));
  for (let i = 0; i < n; i++) { const y = y0 + i * p; pts.push(new THREE.Vector2(r, y + p * 0.35), new THREE.Vector2(r, y + p * 0.5), new THREE.Vector2(r - h, y + p * 0.85)); }
  pts.push(new THREE.Vector2(r - h, L), new THREE.Vector2(0, L));
  g.add(mesh(new THREE.LatheGeometry(pts, 32), nickel));
  // czoło z tworzywa (niebieskie / szare)
  const face = mesh(new THREE.CylinderGeometry(flush ? r - h : r * 0.92, flush ? r - h : r * 0.92, cap + 0.0002, 32), plastic(0x3b6fa8, 0.45)); face.position.y = cap / 2; g.add(face);
  // nakrętki sześciokątne
  for (const y of [L * 0.45, L * 0.62]) { const nut = mesh(new THREE.CylinderGeometry(d * 0.85, d * 0.85, Math.max(0.004, d * 0.33), 6), nickel); nut.position.y = y; g.add(nut); }
  // tył: pierścień LED i złącze M12 (radełkowane)
  const ledO = glow(0xffb020), ledP = glow(0x28e060);
  const ring = mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.004, 32), new THREE.MeshPhysicalMaterial({ color: 0xffe8a0, roughness: 0.2, transmission: 0.4, transparent: true, opacity: 0.85 })); ring.position.y = L + 0.002; g.add(ring);
  const lo = mesh(new THREE.SphereGeometry(r * 0.25, 12, 8), ledO); lo.position.set(r * 0.55, L + 0.002, r * 0.55); g.add(lo);
  const lp = mesh(new THREE.SphereGeometry(r * 0.25, 12, 8), ledP); lp.position.set(-r * 0.55, L + 0.002, r * 0.55); g.add(lp);
  const conn = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 24), nickel); conn.position.y = L + 0.01; g.add(conn);
  const plug = mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.016, 24), M.black); plug.position.y = L + 0.024; g.add(plug);
  const cable = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 12), plastic(0x2a2c2e, 0.7)); cable.position.y = L + 0.056; g.add(cable);
  const spec = INDUCTIVE[size] || INDUCTIVE.M12;
  g.userData = { size, flush, d, L, sn: (flush ? spec.flush : spec.nonflush) / 1000, fmax: spec.f, mass: Math.PI * r * r * L * 8500 * 0.6 + 0.04,
    setOn: (on) => { ledO.emissiveIntensity = on ? 2.2 : 0; }, setPower: (on) => { ledP.emissiveIntensity = on ? 1.2 : 0; },
    ports: { sense: port(EN ? 'Face (metal target)' : 'Czoło (cel metalowy)', DOMAIN.rot, 'pole'), out: port(EN ? 'Output PNP NO (pin 4)' : 'Wyjście PNP NO (pin 4)', DOMAIN.sig, 'PNP 24 V'), supply: port(EN ? 'Supply 10–30 V DC (pins 1, 3)' : 'Zasilanie 10–30 V DC (piny 1, 3)', DOMAIN.el, 'przewód') } };
  g.userData.setPower(true);
  return g;
}

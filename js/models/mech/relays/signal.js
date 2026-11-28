// Przekaźnik sygnałowy wtykowy (miniaturowy, 1 styk przełączny) w gnieździe na szynę DIN: przezroczysta obudowa
// z poliwęglanu (widać cewkę, kotwicę i styki), dioda LED zasilania cewki, zaciski gniazda A1 A2 11 12 14.
// Spód gniazda na szynie w y = 0, front w +z. setState(cewka, styk) — dioda i kotwica.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, glow } from '../common.js';

export function signalRelay({ name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Signal relay 24 V DC (plug-in, socket)' : 'Przekaźnik sygnałowy 24 V DC (wtykowy, gniazdo)');
  const sock = mesh(new THREE.BoxGeometry(0.0155, 0.08, 0.03), plastic(0x2a2c2f, 0.6)); sock.position.set(0, 0.04, 0.015); g.add(sock);
  for (const [y, z] of [[0.072, 0.024], [0.008, 0.024]]) for (const x of [-0.004, 0.004]) { const s = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.003, 12), M.steelP); s.position.set(x, y + 0.0015, z); g.add(s); }
  // przekaźnik: przezroczysta obudowa, w środku cewka, kotwica, styki
  const rel = new THREE.Group(); rel.position.set(0, 0.04, 0.03); g.add(rel);
  const cover = mesh(new THREE.BoxGeometry(0.0125, 0.028, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xdfe8f0, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.35, depthWrite: false })); cover.position.z = 0.015; rel.add(cover);
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xb8692e, metalness: 1, roughness: 0.3 });
  const coil = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 20), copper); coil.position.set(0, -0.004, 0.012); rel.add(coil);
  const arm = mesh(new THREE.BoxGeometry(0.008, 0.0015, 0.016), M.steelP); arm.position.set(0, 0.006, 0.012); rel.add(arm);
  const cnt = mesh(new THREE.BoxGeometry(0.006, 0.001, 0.004), M.brassP); cnt.position.set(0, 0.009, 0.022); cnt.userData.doctorOk = 'floating'; rel.add(cnt);   // styk stały na nośniku (nośnik pod obudową — nie modelowany)
  const led = glow(0xff3020); const l = mesh(new THREE.SphereGeometry(0.0013, 10, 8), led); l.position.set(0, 0.011, 0.0305); l.userData.doctorOk = 'floating'; rel.add(l);   // dioda na płytce pod przezroczystą obudową
  cover.userData.control = 'test';
  g.userData = { mass: 0.04, setState: (coilOn, closed) => { led.emissiveIntensity = coilOn ? 2 : 0; arm.rotation.x = closed ? -0.12 : 0; },
    ports: { coil: port(EN ? 'Coil A1–A2 (24 V DC)' : 'Cewka A1–A2 (24 V DC)', DOMAIN.sig, '24 V'), out: port(EN ? 'Changeover contact 11–12 / 11–14' : 'Styk przełączny 11–12 / 11–14', DOMAIN.el, 'zacisk'), rail: port(EN ? 'DIN rail 35 mm (mount)' : 'Szyna DIN 35 mm (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

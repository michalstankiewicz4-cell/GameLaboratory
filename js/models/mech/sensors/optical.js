// Bariera optyczna jednodrożna: nadajnik i odbiornik w obudowach prostopadłościennych (jak typowe czujniki
// 50 × 50 × 18 mm), soczewki, diody (zielona — zasilanie, żółta — wyjście), uchwyty kątowe. Światło czerwone 660 nm.
// Nadajnik w początku układu, wiązka wzdłuż +x do odbiornika w odległości span. setBeam(wolna) — rysunek wiązki.
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, plastic, glow } from '../common.js';

export function opticalBarrier({ span = 0.3, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Through-beam photoelectric sensor' : 'Bariera optyczna (nadajnik i odbiornik)');
  const leds = [];
  const unit = (x, dir, rx) => {
    const u = new THREE.Group(); u.position.x = x; g.add(u);
    const box = mesh(new THREE.BoxGeometry(0.018, 0.05, 0.05), plastic(rx ? 0x3a3d42 : 0xb02a2a, 0.45)); u.add(box);
    const lens = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.002, 32).rotateZ(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: rx ? 0x202428 : 0x5a0a0a, roughness: 0.05, clearcoat: 1, transmission: 0.3 })); lens.position.x = dir * 0.0095; u.add(lens);
    const bracket = mesh(new THREE.BoxGeometry(0.03, 0.003, 0.05), M.steel); bracket.position.set(-dir * 0.005, -0.0265, 0); u.add(bracket);
    const lg = glow(0x28e060), ly = glow(0xffb020); const a = mesh(new THREE.SphereGeometry(0.0018, 10, 8), lg); a.position.set(-dir * 0.0092, 0.019, 0.012); const b = mesh(new THREE.SphereGeometry(0.0018, 10, 8), ly); b.position.set(-dir * 0.0092, 0.019, -0.012); u.add(a, b);
    lg.emissiveIntensity = 1.2; leds.push(ly);
    return u;
  };
  unit(0, 1, false); unit(span, -1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.35, depthWrite: false });
  const beam = mesh(new THREE.CylinderGeometry(0.0012, 0.0012, span - 0.02, 8, 1, true).rotateZ(Math.PI / 2), beamMat, false); beam.position.x = span / 2; g.add(beam);
  beam.userData.doctorOk = 'floating';
  g.userData = { span, mass: 0.2, beamFrom: new THREE.Vector3(0.0105, 0, 0), beamTo: new THREE.Vector3(span - 0.0105, 0, 0),
    setBeam: (blockedAt) => { if (blockedAt == null) { beam.scale.x = 1; beam.position.x = span / 2; } else { const L = Math.max(0.001, blockedAt - 0.0105); beam.scale.x = L / (span - 0.02); beam.position.x = 0.0105 + L / 2; } leds[0].emissiveIntensity = blockedAt == null ? 0 : 2; },
    ports: { light: port(EN ? 'Beam 660 nm (emitter → receiver)' : 'Wiązka 660 nm (nadajnik → odbiornik)', DOMAIN.light, 'promień'), out: port(EN ? 'Output PNP, dark-on' : 'Wyjście PNP, załącza przy przerwaniu', DOMAIN.sig, 'PNP 24 V') } };
  return g;
}

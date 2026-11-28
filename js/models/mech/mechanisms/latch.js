// Zatrzask z wyzwalaczem: ramię (młotek) na sworzniu ze sprężyną skrętną, zaczep na ramieniu, zapadka na sworzniu
// ze sprężynką dociskającą, elektromagnes (cewka w jarzmie, rdzeń ruchomy) podnoszący zapadkę, zderzak gumowy.
// Płyta montażowa w płaszczyźnie xy (front +z), oś ramienia w (0, 0); ramię wskazuje w +x przy θ = 0, napinanie — w górę.
// pose(θ ramienia, podniesienie zapadki 0–1, wysunięcie rdzenia 0–1).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, cylZ, plastic } from '../common.js';
import { torsionSpring } from '../clock/springs.js';

export function latchUnit({ L = 0.16, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || (EN ? 'Latch with trigger (solenoid)' : 'Zatrzask z wyzwalaczem (elektromagnes)');
  const plate = mesh(new THREE.BoxGeometry(0.3, 0.22, 0.008), M.steel); plate.position.set(0.04, 0.03, -0.004); g.add(plate);
  // ramię z głowicą (młotek) i zaczepem
  const arm = new THREE.Group(); arm.position.z = 0.012; g.add(arm);
  const bar = mesh(new THREE.BoxGeometry(L, 0.016, 0.01), M.steel); bar.position.x = L / 2; arm.add(bar);
  const head = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.022), M.dark); head.position.x = L; arm.add(head);
  const notch = mesh(new THREE.BoxGeometry(0.012, 0.01, 0.01), M.steelP); notch.position.set(-0.02, -0.013, 0); arm.add(notch);   // zaczep (za osią)
  const tail = mesh(new THREE.BoxGeometry(0.03, 0.014, 0.01), M.steel); tail.position.x = -0.012; arm.add(tail);
  const boss = mesh(cylZ(0.012, 0.012, 32), M.steel); arm.add(boss);
  const pin = mesh(cylZ(0.005, 0.039, 16), M.steelP); pin.position.z = 0.0105;   // wystaje 1 mm z tyłu płyty
  pin.userData.doctorOk = 'clash'; g.add(pin);   // sworzeń przez płytę i oczko ramienia
  const spring = torsionSpring({ d: 0.0025, D: 0.03, n: 5, leg: 0.035 }); spring.position.set(0, 0, 0.019); g.add(spring);
  // zapadka na sworzniu pod zaczepem
  const searG = new THREE.Group(); searG.position.set(-0.05, -0.04, 0.012); g.add(searG);
  const sear = mesh(new THREE.BoxGeometry(0.05, 0.012, 0.008), M.blued); sear.position.x = 0.025; searG.add(sear);
  const tooth = mesh(new THREE.BoxGeometry(0.008, 0.014, 0.008), M.blued); tooth.position.set(0.032, 0.012, 0); searG.add(tooth);
  const sp = mesh(cylZ(0.004, 0.03, 12), M.steelP); sp.position.set(-0.05, -0.04, 0.01); g.add(sp);
  // elektromagnes: jarzmo, cewka (miedź), rdzeń połączony z zapadką
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xb8692e, metalness: 1, roughness: 0.32 });
  const yoke = mesh(new THREE.BoxGeometry(0.03, 0.045, 0.03), M.steel); yoke.position.set(-0.04, -0.09, 0.02); g.add(yoke);
  const coil = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 24), copper); coil.position.set(-0.04, -0.09, 0.02); g.add(coil);
  const plunger = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 16), M.steelP); plunger.position.set(-0.04, -0.06, 0.02); g.add(plunger);
  coil.userData.control = 'trigger';
  const stop = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.025), plastic(0x2a2a2a, 0.9)); stop.position.set(L * Math.cos(-0.25) + 0.002, L * Math.sin(-0.25) - 0.025, 0.012); g.add(stop);
  const pose = (th, lift, plg) => { arm.rotation.z = th; searG.rotation.z = -lift * 0.25; plunger.position.y = -0.06 - (1 - plg) * 0.0 + plg * 0.006; spring.userData.setAngle && spring.userData.setAngle(Math.max(0, th + 0.3)); };
  pose(-0.25, 0, 0);
  g.userData = { L, mass: 1.2, pose, arm, ports: { trigger: port(EN ? 'Solenoid coil 24 V DC (trigger)' : 'Cewka elektromagnesu 24 V DC (wyzwalacz)', DOMAIN.el, 'zacisk'), cock: port(EN ? 'Arm — cocking (lever)' : 'Ramię — napinanie (dźwignia)', DOMAIN.rot, 'dźwignia'), mount: port(EN ? 'Mounting plate' : 'Płyta (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

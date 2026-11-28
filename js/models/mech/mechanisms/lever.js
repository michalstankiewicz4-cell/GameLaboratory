// Dźwignia: płaskownik stalowy na sworzniu we wsporniku (podpora), rączka z tworzywa na końcu ramienia siły.
// Rodzaj: 1 — podpora między siłą a obciążeniem, 2 — obciążenie między podporą a siłą, 3 — siła między podporą
// a obciążeniem. Oś obrotu wzdłuż z w (0, 0, 0); ramię siły a (rączka), ramię obciążenia b; setAngle(θ) — obrót.
// Położenia punktów: userData.at(θ) → { effort, load } (w układzie dźwigni, do kontaktów).
import * as THREE from '../../../../vendor/three/three.module.js';
import { DOMAIN } from '../mechkit.js';
import { EN, mesh, port, materials, cylZ, plastic } from '../common.js';

export function lever({ a = 0.25, b = 0.08, cls = 1, w = 0.025, t = 0.008, bracket = true, pinLen = null, name } = {}) {
  const M = materials(), g = new THREE.Group(); g.name = name || `${EN ? 'Lever' : 'Dźwignia'} ${EN ? 'class' : 'rodzaju'} ${cls}`;
  // położenia wzdłuż belki (x): rączka (siła) i obciążenie względem podpory w 0
  const xe = cls === 1 ? -a : a, xl = cls === 3 ? b : cls === 2 ? b : b;
  const x0 = Math.min(0, xe, xl) - 0.02, x1 = Math.max(0, xe, xl) + 0.02;
  const arm = new THREE.Group(); g.add(arm);
  const bar = mesh(new THREE.BoxGeometry(x1 - x0, w, t), M.steel); bar.position.x = (x0 + x1) / 2; arm.add(bar);
  const boss = mesh(cylZ(w * 0.7, t * 1.4, 32), M.steel); arm.add(boss);   // oczko grubsze niż płaskownik
  const grip = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 20), plastic(0x1e1f22, 0.6)); grip.position.set(xe, 0, t / 2 + 0.035); grip.rotation.x = Math.PI / 2; arm.add(grip);
  grip.userData.control = 'lever'; bar.userData.control = 'lever';
  const loadPin = mesh(cylZ(0.006, pinLen || t + 0.012, 16), M.steelP); if (pinLen) loadPin.position.z = -pinLen / 2 + t / 2; loadPin.position.x = xl; arm.add(loadPin);
  // wspornik (dwie blachy) i sworzeń; bez wspornika — dźwignia na cudzym sworzniu (np. współosiowo z ramieniem)
  if (bracket) {
    const pin = mesh(cylZ(0.006, t + 0.03, 16), M.steelP); g.add(pin);
    for (const z of [-(t / 2 + 0.006), t / 2 + 0.006]) { const ear = mesh(new THREE.BoxGeometry(0.04, 0.06, 0.006), M.steel); ear.position.set(0, -0.018, z); g.add(ear); }
    const foot = mesh(new THREE.BoxGeometry(0.06, 0.008, t + 0.03), M.steel); foot.position.y = -0.052; g.add(foot);
  }
  g.userData = { a, b, cls, xe, xl, mass: (x1 - x0) * w * t * 7850,
    setAngle: (th) => { arm.rotation.z = th; },
    at: (th) => ({ effort: new THREE.Vector2(xe * Math.cos(th), xe * Math.sin(th)), load: new THREE.Vector2(xl * Math.cos(th), xl * Math.sin(th)) }),
    ports: { effort: port(EN ? 'Handle (effort)' : 'Rączka (siła)', DOMAIN.rot, 'dźwignia'), load: port(EN ? 'Load pin' : 'Sworzeń obciążenia', DOMAIN.rot, 'dźwignia'), pivot: port(EN ? 'Fulcrum (mount)' : 'Podpora (mocowanie)', DOMAIN.rot, 'mocowanie') } };
  return g;
}

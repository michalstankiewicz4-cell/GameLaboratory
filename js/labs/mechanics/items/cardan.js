// Przegub Cardana — kolizje widełek i krzyżaka w pełnym obrocie przy kącie łamania β (bryły modeli, meshClash) i
// największy kąt, przy którym przegub jeszcze się obraca (połowienie przedziału). Ułożenie jak w przedmiocie i maszynie.
import * as THREE from '../../../../vendor/three/three.module.js';
import * as MK from '../../../models/mech/mechkit.js';
import { createDrive } from '../../../behaviors/land/mech/drive.js';
import { meshClash } from '../../../behaviors/land/mech/contact.js';
import { TAU, X, Y } from './util.js';

export function cardanCheck(betaDeg, samples = 24) {
  const b = betaDeg * Math.PI / 180, dir = new THREE.Vector3(Math.cos(b), 0, Math.sin(b)), q = new THREE.Quaternion().setFromUnitVectors(X, dir), zq = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const gA = new THREE.Group(), yA = MK.yoke(); gA.add(yA);
  const gB = new THREE.Group(), sB = new THREE.Group(), yB = MK.yoke(); gB.quaternion.copy(q); gB.add(sB); yB.rotation.set(Math.PI / 2, Math.PI, 0); sB.add(yB);
  const cr = MK.cross(), root = new THREE.Group(); root.add(gA, gB, cr);
  const d = createDrive(), ea = d.add({ id: 'a', J: 0, frame: { o: new THREE.Vector3(), axis: X, ref: Y } }), eb = d.add({ id: 'b', J: 0, frame: { o: new THREE.Vector3(), axis: dir, ref: Y } });
  d.connect('a', 'out', 'b', 'in', 'ujoint', { pinA: Y.clone(), pinB: zq.clone() }); d.solve('a');
  const a = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Matrix4();
  for (let k = 0; k < samples; k++) {
    d.pose(k * TAU / samples); gA.rotation.x = ea.theta; sB.rotation.x = eb.theta;
    a.copy(Y).applyAxisAngle(X, ea.theta); c.copy(zq).applyAxisAngle(dir, eb.theta); c.addScaledVector(a, -c.dot(a)).normalize();
    cr.quaternion.setFromRotationMatrix(m.makeBasis(new THREE.Vector3().crossVectors(a, c), a, c)); root.updateWorldMatrix(true, true);
    for (const [P, Q, name] of [[yA, yB, 'widełki z widełkami'], [cr, yA, 'krzyżak z widełkami czynnymi'], [cr, yB, 'krzyżak z widełkami biernymi']]) {
      const n = meshClash(P, Q); if (n) return { clash: true, pair: name, at: k * 360 / samples, n };
    }
  }
  return { clash: false };
}
let BETA_MAX = null;
export function cardanMax() {   // największy kąt łamania bez kolizji (dla widełek i krzyżaka MechKit), ±0,5°
  if (BETA_MAX) return BETA_MAX;
  let lo = 0, hi = 89;
  if (!cardanCheck(hi, 12).clash) return (BETA_MAX = { beta: hi });
  while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (cardanCheck(m, 12).clash) hi = m; else lo = m; }
  return (BETA_MAX = { beta: lo, pair: cardanCheck(hi, 12).pair });
}

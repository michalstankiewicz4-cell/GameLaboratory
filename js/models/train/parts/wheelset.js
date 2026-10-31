// Zestaw kołowy: dwa koła z prawdziwym profilem (obrys z TrainKit/data.js), oś,
// znaczniki na tarczach (widać obrót). Z aTrain (js/app.js: wheelGeo, makeWheelset).
// Każda strona to osobna grupa w userData.sides (przesuwana z rozstawem kół).
import { BTB, profileDelta } from "../data.js";
import { trainMaterials } from "../materials.js";
const THREE = window.THREE;

export function wheelGeometry(Rw) {
  const pts = [new THREE.Vector2(0.09, 0)];
  pts.push(new THREE.Vector2(Rw - 0.06, 0));
  for (let a = 0; a <= 0.135 + 1e-9; a += 0.0025) pts.push(new THREE.Vector2(Rw + profileDelta(a), a));
  pts.push(new THREE.Vector2(Rw - 0.06, 0.135), new THREE.Vector2(Rw - 0.08, 0.10), new THREE.Vector2(0.14, 0.10), new THREE.Vector2(0.09, 0.15));
  const g = new THREE.LatheGeometry(pts, 48); g.rotateX(Math.PI / 2); return g;
}

export function wheelset(Rw, btb = BTB) {
  const mat = trainMaterials(), g = new THREE.Group(), wg = wheelGeometry(Rw);
  g.name = "zestaw kołowy";
  g.userData.sides = [];
  for (const sg of [1, -1]) {
    const side = new THREE.Group(); side.position.z = sg * btb; side.userData.sg = sg; g.add(side); g.userData.sides.push(side);
    const w = new THREE.Mesh(wg, mat.wheel); w.scale.z = sg; side.add(w);
    const tg = new THREE.Mesh(new THREE.CylinderGeometry(Rw - 0.005, Rw - 0.005, 0.09, 64, 1, true), mat.tread);
    tg.rotation.x = Math.PI / 2; tg.position.z = sg * 0.09; side.add(tg);
    for (let k = 0; k < 3; k++) {
      const ang = k * 2 * Math.PI / 3;
      const mk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), mat.mark);
      mk.rotation.x = Math.PI / 2; mk.position.set(Math.cos(ang) * (Rw * 0.55), Math.sin(ang) * (Rw * 0.55), sg * 0.105); side.add(mk);
    }
    const sp = new THREE.Mesh(new THREE.BoxGeometry(Rw * 1.6, 0.05, 0.02), mat.mark);
    sp.position.z = sg * 0.105; side.add(sp);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.12, 20), mat.steel); axle.rotation.x = Math.PI / 2; g.add(axle);
  return g;
}

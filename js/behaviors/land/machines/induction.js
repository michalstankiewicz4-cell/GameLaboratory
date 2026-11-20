// Zachowanie „piec indukcyjny” (środowisko: ląd) — z gry Złomowisko (js/machines/induction.js, z historią), na świecie
// przedmiotów GameLaboratory (land/items.js). Przy włączonym zasilaniu metal w tyglu nagrzewa się (lżejszy szybciej)
// i żarzy, po osiągnięciu temperatury topnienia (js/models/junkyard/properties.js, METALS) znika i dolewa objętość do
// kąpieli (masa wg metalu — skład trafia potem do sztabek). Przechył (tiltCmd: +1 w stronę wylewu, −1 z powrotem)
// obraca tygiel wokół osi przy wylewie; tygiel jest bryłą ruchomą (ścianka z 12 wycinków i dno jako prostopadłościany),
// więc przechyla to, co w nim leży; gdy powierzchnia kąpieli sięga wylewu, metal wylewa się strumieniem cząstek
// (metal-flow.js) do rynny. Liczy się w krokach świata przedmiotów (W.hook).
import * as THREE from '../../../../vendor/three/three.module.js';
import { lavaMaterial } from '../../../models/junkyard/lava.js';
import { METALS, metalOf } from '../../../models/junkyard/properties.js';
import { obbFrom, newObb } from '../items.js';
import { colliderBoxes } from './statics.js';

export const ENVIRONMENTS = ['land'];
export class InductionFurnace {
  constructor(W, root, layout, crucibleColliders, flow = null) {
    this.W = W; this.root = root; this.L = layout; this.flow = flow; this.tiltCmd = 0;
    this.tilt = 0; this.power = false; this.melt = { volume: 0, mass: { aluminium: 0, steel: 0 } };
    this.group = root.getObjectByName('tygiel');
    this.meltMesh = this.group.getObjectByName('stopiony metal');
    this.meltMesh.material = lavaMaterial({ heat: 1, scale: 5 });
    this.meltMesh.geometry = this.meltMesh.geometry.clone(); this.meltMesh.geometry.computeBoundingSphere();
    this.mc = this.meltMesh.geometry.boundingSphere.center.clone(); this.meltMesh.geometry.translate(-this.mc.x, -this.mc.y, -this.mc.z);
    this.coil = this.group.getObjectByName('cewka');
    this.coilMat = this.coil.material.clone(); this.coil.material = this.coilMat;
    root.updateMatrixWorld(true);
    // tygiel: bryły ruchome w układzie grupy `tygiel` (dno — walec jako prostopadłościan, ścianka — wycinki)
    this.boxes = colliderBoxes(crucibleColliders).map((b) => ({ ...b, box: newObb() }));
    // obiekt w skali (edytor sceny): tygiel rośnie z modelem (objętość × S³)
    this.S = new THREE.Vector3().setFromMatrixScale(root.matrixWorld).x;
    this.cap = Math.PI * layout.inner.r ** 2 * (layout.inner.top - layout.inner.bottom) * this.S ** 3;
    this.pourAcc = 0; this.q = new THREE.Quaternion(); this.v = new THREE.Vector3();
    this.place(true);
    this.unKin = W.addKinematic(this.boxes.map((b) => b.box));
    this.unHook = W.hook((h) => this.step(h));
  }
  dispose() { this.unKin(); this.unHook(); }
  place(now, h = 0) {
    this.group.rotation.x = this.tilt; this.group.updateMatrixWorld(true);
    const m = this.group.matrixWorld;
    for (const b of this.boxes) {
      const c0 = b.box.c.clone(); obbFrom(m, b.at, b.half, b.rot, b.box);
      if (now || !h) b.box.v.set(0, 0, 0); else b.box.v.copy(b.box.c).sub(c0).divideScalar(h);
    }
  }
  /** Skład kąpieli: udział masy aluminium (0…1) i gęstość mieszaniny. */
  mix() {
    const a = this.melt.mass.aluminium, s = this.melt.mass.steel, m = a + s;
    if (m <= 0) return { al: 1, density: METALS.aluminium.density };
    return { al: a / m, density: m / (a / METALS.aluminium.density + s / METALS.steel.density) };
  }
  step(dt) {
    const flow = this.flow;
    if (this.tiltCmd > 0) this.tilt = Math.min(this.L.maxTilt, this.tilt + this.L.tiltSpeed * dt);
    if (this.tiltCmd < 0) this.tilt = Math.max(0, this.tilt - this.L.tiltSpeed * 1.5 * dt);
    this.place(false, dt);
    const inv = this.group.matrixWorld.clone().invert(), I = this.L.inner;
    // nagrzewanie i topnienie metalu w tyglu (tylko gdy tygiel stoi prawie pionowo)
    for (const it of [...this.W.list]) {
      if (it.held) continue;
      const p = this.v.copy(it.p).applyMatrix4(inv);
      const inside = Math.hypot(p.x - I.cx, p.z - I.cz) < I.r && p.y > I.bottom - 0.05 && p.y < I.top + 0.1;
      if (!inside) { if (it.temp > 20) { it.temp = Math.max(20, it.temp - 60 * dt); it.heat = Math.max(0, Math.min(1, (it.temp - 450) / 900)); } continue; }
      const metal = metalOf(it.kind);
      if (!metal || !this.power) continue;
      it.temp += dt * 320 / Math.pow(it.mass + 0.2, 0.4);
      it.heat = Math.max(0, Math.min(1, (it.temp - 450) / (metal.melt - 450)));
      if (it.temp >= metal.melt) { this.melt.volume += it.mass / metal.density; this.melt.mass[metal.id] += it.mass; this.W.remove(it); }
    }
    // poziom kąpieli i widok (w układzie tygla — przy przechyle powierzchnia pozostaje pozioma w świecie: uproszczenie)
    const level = this.melt.volume / (Math.PI * I.r * I.r);
    this.meltMesh.visible = this.melt.volume > 0.00005;
    if (this.meltMesh.visible) {
      const y = I.bottom + Math.min(level, I.top - I.bottom);
      this.meltMesh.position.set(this.mc.x, y, this.mc.z);
      this.meltMesh.rotation.x = -this.tilt;   // tarcza kąpieli pozostaje pozioma w świecie
    }
    this.coilMat.emissive.setRGB(this.power ? 0.25 : 0, this.power ? 0.07 : 0, 0);
    // wylewanie: próg przechyłu zależy od zapełnienia; szybkość rośnie z przechyłem
    const fill = Math.min(1, this.melt.volume / this.cap), th0 = (1 - fill) * 1.25 + 0.1;
    if (flow && this.tilt > th0 && this.melt.volume > 0) {
      const rate = Math.min(this.melt.volume, (this.tilt - th0) * 0.004 * dt);   // m³
      this.pourAcc += rate;
      const mix = this.mix(), m = this.melt.mass, tot = m.aluminium + m.steel, massOut = rate * mix.density;
      m.aluminium -= massOut * (tot ? m.aluminium / tot : 1); m.steel -= massOut * (tot ? m.steel / tot : 0);
      m.aluminium = Math.max(0, m.aluminium); m.steel = Math.max(0, m.steel);
      this.melt.volume -= rate;
      const S = this.v.set(...this.L.spout).applyMatrix4(this.group.matrixWorld).clone();
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(this.group.matrixWorld));
      while (this.pourAcc >= flow.dV) { this.pourAcc -= flow.dV; flow.emit(S, dir.clone().multiplyScalar(0.7), mix); }
    }
  }
}

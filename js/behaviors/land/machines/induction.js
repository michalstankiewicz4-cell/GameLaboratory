// Piec indukcyjny: przy włączonym zasilaniu metal w tyglu nagrzewa się (lżejszy szybciej) i żarzy, po osiągnięciu
// temperatury topnienia znika i dolewa objętość do kąpieli (masa wg metalu — skład trafia potem do sztabek).
// Przechył (R / F przy pulpicie) obraca tygiel wokół osi przy wylewie; gdy powierzchnia kąpieli sięga wylewu,
// metal wylewa się strumieniem cząstek (MetalFlow) do rynny.
import * as THREE from '../../vendor/three/three.module.js';
import { R, G, groups } from '../physics/world.js';
import { lavaMaterial } from '../render/lava.js';
import { METALS } from '../items/catalog.js';

export class InductionFurnace {
  constructor(ph, items, root, layout, crucibleColliders) {
    this.ph = ph; this.items = items; this.root = root; this.L = layout;
    this.tilt = 0; this.power = false; this.melt = { volume: 0, mass: { aluminium: 0, steel: 0 } };
    this.group = root.getObjectByName('tygiel');
    this.meltMesh = this.group.getObjectByName('stopiony metal');
    this.meltMesh.material = lavaMaterial({ heat: 1, scale: 5 });
    this.meltMesh.geometry = this.meltMesh.geometry.clone(); this.meltMesh.geometry.computeBoundingSphere();
    this.mc = this.meltMesh.geometry.boundingSphere.center.clone(); this.meltMesh.geometry.translate(-this.mc.x, -this.mc.y, -this.mc.z);
    this.coil = this.group.getObjectByName('cewka');
    this.coilMat = this.coil.material.clone(); this.coil.material = this.coilMat;
    root.updateMatrixWorld(true);
    this.body = ph.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    for (const c of crucibleColliders) {
      const d = c.kind === 'cyl' ? R.ColliderDesc.cylinder(c.h / 2, c.r).setTranslation(...c.at) : R.ColliderDesc.convexHull(new Float32Array(c.points));
      ph.world.createCollider(d.setCollisionGroups(groups(G.WORLD, G.ITEM | G.PLAYER | G.VEHICLE | G.HELD)).setFriction(0.6), this.body);
    }
    this.cap = Math.PI * layout.inner.r ** 2 * (layout.inner.top - layout.inner.bottom);
    this.pourAcc = 0; this.q = new THREE.Quaternion(); this.v = new THREE.Vector3();
    this.place(true);
  }
  place(now) {
    this.group.rotation.x = this.tilt; this.group.updateMatrixWorld(true);
    const m = this.group.matrixWorld, p = new THREE.Vector3().setFromMatrixPosition(m), q = new THREE.Quaternion().setFromRotationMatrix(m);
    if (now) { this.body.setTranslation(p, true); this.body.setRotation(q, true); }
    this.body.setNextKinematicTranslation(p); this.body.setNextKinematicRotation(q);
  }
  /** Skład kąpieli: udział masy aluminium (0…1) i gęstość mieszaniny. */
  mix() {
    const a = this.melt.mass.aluminium, s = this.melt.mass.steel, m = a + s;
    if (m <= 0) return { al: 1, density: METALS.aluminium.density };
    return { al: a / m, density: m / (a / METALS.aluminium.density + s / METALS.steel.density) };
  }
  step(dt, input, near, flow) {
    if (near) { if (input.key('KeyR')) this.tilt = Math.min(this.L.maxTilt, this.tilt + this.L.tiltSpeed * dt); if (input.key('KeyF')) this.tilt = Math.max(0, this.tilt - this.L.tiltSpeed * 1.5 * dt); }
    this.place(false);
    const inv = this.group.matrixWorld.clone().invert(), I = this.L.inner;
    // nagrzewanie i topnienie metalu w tyglu (tylko gdy tygiel stoi prawie pionowo)
    for (const it of [...this.items.list]) {
      if (it.held) continue;
      const t = it.body.translation(), p = this.v.set(t.x, t.y, t.z).applyMatrix4(inv);
      const inside = Math.hypot(p.x - I.cx, p.z - I.cz) < I.r && p.y > I.bottom - 0.05 && p.y < I.top + 0.1;
      if (!inside) { if (it.temp > 20) { it.temp = Math.max(20, it.temp - 60 * dt); it.heat = Math.max(0, Math.min(1, (it.temp - 450) / 900)); } continue; }
      const metal = this.items.metal(it);
      if (!metal || !this.power) continue;
      it.temp += dt * 320 / Math.pow(it.mass + 0.2, 0.4);
      it.heat = Math.max(0, Math.min(1, (it.temp - 450) / (metal.melt - 450)));
      if (it.temp >= metal.melt) { this.melt.volume += it.mass / metal.density; this.melt.mass[metal.id] += it.mass; this.items.remove(it); }
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
    if (this.tilt > th0 && this.melt.volume > 0) {
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

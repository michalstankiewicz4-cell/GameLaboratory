// Zachowanie „piec na papier” (środowisko: ląd) — z gry Złomowisko (js/machines/furnace.js, z historią), na świecie
// przedmiotów GameLaboratory (land/items.js). Przedmioty z papieru i tektury (właściwość burn — czas palenia w s,
// js/models/junkyard/properties.js) w strefie spalania płoną — ogień rośnie, przedmiot się żarzy i znika (spalony).
// Inne przedmioty leżą w piecu bez zmian. Ogień i dym: js/models/junkyard/fire.js. Spalanie w krokach świata (W.hook),
// ogień w klatce (frame).
import * as THREE from '../../../../vendor/three/three.module.js';
import { propsOf } from '../../../models/junkyard/properties.js';
import { Fire } from '../../../models/junkyard/fire.js';

export const ENVIRONMENTS = ['land'];
export class PaperFurnace {
  constructor(scene, W, root, layout) {
    this.W = W; this.root = root; root.updateMatrixWorld(true);
    this.Mi = root.matrixWorld.clone().invert(); this.zone = layout.burn;
    this.fire = new Fire(scene, new THREE.Vector3(...layout.fire).applyMatrix4(root.matrixWorld), { spread: [1.6, 1.2] });
    this.smoke = new Fire(scene, new THREE.Vector3(...layout.chimneyTop).applyMatrix4(root.matrixWorld), { count: 120, spread: [0.3, 0.3], smoke: true });
    this.burned = 0; this.burning = 0;
    this.unHook = W.hook((h) => this.step(h));
  }
  dispose() { this.unHook(); this.fire.dispose(); this.smoke.dispose(); }
  step(dt) {
    let n = 0; const z = this.zone;
    for (const it of [...this.W.list]) {
      const k = propsOf(it.kind); if (!k.burn || it.held) continue;
      const p = it.p.clone().applyMatrix4(this.Mi);
      if (Math.abs(p.x - z.center[0]) > z.half[0] || Math.abs(p.y - z.center[1]) > z.half[1] || Math.abs(p.z - z.center[2]) > z.half[2]) continue;
      n++;
      it.burnT = (it.burnT || 0) + dt;
      const f = it.burnT / k.burn;
      it.heat = Math.min(0.6, f * 2) * (0.7 + Math.random() * 0.3);
      if (f >= 1) { this.W.remove(it); this.burned++; }
    }
    this.burning = n;
    const want = 0.25 + Math.min(1, n * 0.35);
    this.fire.power += (want - this.fire.power) * Math.min(1, dt * 2);
    this.smoke.power = 0.2 + this.fire.power * 0.6;
  }
  frame(dt) { this.fire.update(dt); this.smoke.update(dt); }
}

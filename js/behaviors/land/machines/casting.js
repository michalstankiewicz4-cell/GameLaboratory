// Zachowanie „linia odlewnicza” (środowisko: ląd) — z gry Złomowisko (js/machines/casting.js, z historią), na świecie
// przedmiotów GameLaboratory (land/items.js). Formy na przenośniku: metal z rynny (metal-flow.js) napełnia formę pod
// końcem rynny; pełna forma → przenośnik przesuwa formy o podziałkę (jeśli nadjeżdżająca forma jest pusta). Metal
// w formie stygnie (świecenie gaśnie), po zastygnięciu powstaje sztabka (przedmiot w świecie) — wariant wg składu:
// ≥90% aluminium → aluminium, ≥90% stali → stal, inaczej mieszanka; sztabki w formach jadą z przenośnikiem.
// Liczy się w krokach świata przedmiotów (W.hook).
import * as THREE from '../../../../vendor/three/three.module.js';
import { lavaMaterial } from '../../../models/junkyard/lava.js';
import { INGOT } from '../../../models/junkyard/items/ingot.js';
import { INGOT_SMALL } from '../../../models/junkyard/items/ingot-small.js';

export const ENVIRONMENTS = ['land'];
export { INGOT, INGOT_SMALL };
export class Casting {
  /** opt: { group, dims, pitch, moldZ, kind } — duże formy (domyślnie) albo małe formy na aluminium; kit — itemKit */
  constructor(W, kit, root, layout, flow, opt = {}) {
    this.W = W; this.kit = kit; this.root = root; this.L = layout; this.flow = flow;
    this.D = opt.dims || INGOT; this.P = opt.pitch || layout.pitch; this.Z = opt.moldZ || layout.moldZ; this.kind = opt.kind || 'ingot';
    this.group = root.getObjectByName(opt.group || 'formy');
    this.molds = this.group.children.map((mesh, i) => {
      const mat = lavaMaterial({ heat: 0, scale: 10 });
      const fill = new THREE.Mesh(new THREE.BoxGeometry(this.D.top[0] * 0.95, 1, this.D.top[1] * 0.92), mat);
      fill.visible = false; mesh.add(fill);
      return { mesh, fill, mat, slot: i, vol: 0, mass: 0, alMass: 0, temp: 20, offset: 0 };
    });
    this.shift = 0; this.anim = 0; this.cap = this.D.volume;
    for (const m of this.molds) flow.sinks.push({ x: () => m.mesh.position.x, z: this.Z, y: layout.moldTop, hx: this.D.top[0] / 2 - 0.01, hz: this.D.top[1] / 2 - 0.005, add: (dV, al, dens) => this.add(m, dV, al, dens) });
    this.made = 0;
    this.unHook = W.hook((h) => this.step(h));
  }
  dispose() { this.unHook(); for (const m of this.molds) { m.mesh.remove(m.fill); m.fill.geometry.dispose(); m.mat.dispose(); } }
  add(m, dV, al, dens) {
    if (m.vol >= this.cap * 1.1) { this.flow.wasted += dV; return; }   // forma przepełniona (lekki nadlew jeszcze się mieści)
    const mass = dV * dens; m.vol += dV; m.mass += mass; m.alMass += mass * al;   // al — udział masowy aluminium w kąpieli
    m.temp = Math.min(1500, (m.temp * (m.vol - dV) + 1450 * dV) / m.vol + 1e-9);
  }
  pourMold() { return this.molds.find((m) => Math.abs(m.mesh.position.x) < 0.05); }
  occupied(m) {   // czy w formie leży jeszcze sztabka
    m.mesh.updateMatrixWorld(true); const w = new THREE.Vector3().setFromMatrixPosition(m.mesh.matrixWorld);
    return this.W.list.some((it) => it.kind === this.kind && !it.held && Math.abs(it.p.x - w.x) < 0.25 && Math.abs(it.p.z - w.z) < 0.25 && Math.abs(it.p.y - w.y) < 0.2);
  }
  step(dt) {
    const P = this.P, n = this.molds.length, D = this.D;
    // przesuwanie przenośnika
    const pm = this.pourMold();
    if (!this.anim && pm && pm.vol >= this.cap * 0.95) {
      const next = this.molds.find((m) => Math.abs(m.mesh.position.x - (n - 1) * P) < 0.05);
      if (next && next.vol === 0 && !this.occupied(next)) this.anim = 1e-6;
    }
    if (this.anim) {
      const prev = this.anim; this.anim = Math.min(1, this.anim + dt / (0.5 + P * 1.4)); const dx = (this.anim - prev) * P;
      // sztabki leżące w formach jadą razem z nimi
      for (const it of this.W.list) if (it.kind === this.kind && !it.held) {
        const lp = it.p.clone().applyMatrix4(this.root.matrixWorld.clone().invert());
        if (Math.abs(lp.z - this.Z) < 0.2 && lp.x > -0.3 && lp.x < (n - 1) * P + 0.3 && Math.abs(lp.y - (this.L.moldTop - D.h / 2)) < 0.12) {
          it.p.copy(new THREE.Vector3(lp.x + dx, lp.y, lp.z).applyMatrix4(this.root.matrixWorld)); this.W.wake(it);
        }
      }
      for (const m of this.molds) m.mesh.position.x += dx;
      if (this.anim >= 1) { this.anim = 0; for (const m of this.molds) if (m.mesh.position.x > (n - 0.5) * P) m.mesh.position.x -= n * P; for (const m of this.molds) m.mesh.position.x = Math.round(m.mesh.position.x / P) * P; }
    }
    for (const m of this.molds) {
      if (m.vol <= 0) { m.fill.visible = false; continue; }
      const f = Math.min(1, m.vol / this.cap), h = D.h * f;
      m.fill.visible = true; m.fill.scale.y = Math.max(0.002, h); m.fill.position.y = -D.h + h / 2 + 0.001;
      if (m !== pm || this.flow.n === 0) m.temp = Math.max(20, m.temp - 45 * dt);
      m.mat.uniforms.uHeat.value = Math.max(0, Math.min(1, (m.temp - 450) / 900));
      const al = m.mass > 0 ? m.alMass / m.mass : 1;
      m.mat.uniforms.uMetal.value.set(al > 0.9 ? '#b9bdc1' : al < 0.1 ? '#62666a' : '#80786e');
      if (m.temp < 250 && (m !== pm || this.flow.n === 0)) this.solidify(m, f, al);
    }
  }
  solidify(m, f, al) {
    if (f < 0.02) { m.vol = m.mass = m.alMass = 0; return; }
    m.mesh.updateMatrixWorld(true);
    const w = new THREE.Vector3().setFromMatrixPosition(m.mesh.matrixWorld), sy = Math.max(0.08, f);
    const q = new THREE.Quaternion().setFromRotationMatrix(this.root.matrixWorld);
    const variant = al >= 0.9 ? 0 : al <= 0.1 ? 1 : 2;
    this.kit.spawn(this.W, this.kind, { variant, at: [w.x, w.y - this.D.h + this.D.h * sy / 2 + 0.004, w.z], q, scale: [1, sy, 1], mass: m.mass, parent: this.root.parent });
    m.vol = m.mass = m.alMass = 0; m.temp = 20; m.fill.visible = false; this.made++;
  }
}

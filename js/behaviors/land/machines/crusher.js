// Zgniatarka (wspólna logika: puszki — tłok poziomy, metal — płyta pionowa).
// Tłok jest ciałem kinematycznym: sam przesuwa przedmioty (fizyka). Gdy przedmioty zablokują drogę (stos wzdłuż osi
// tłoka dłuższy niż wolne miejsce w danej kolumnie przekroju), tłok zgniata najsłabszy przedmiot w tej kolumnie:
// opór = opór przedmiotu wzdłuż lokalnej osi najbardziej zgodnej z osią tłoka × utwardzenie (rośnie przy zgniataniu).
// Za mocny przedmiot (opór > siła tłoka) zatrzymuje tłok — po chwili cofa się.
import * as THREE from '../../vendor/three/three.module.js';
import { R, G, groups, STEP } from '../physics/world.js';

const CELLS = 4;
export class Crusher {
  /**
   * cfg: { name, ph, items, root (Group maszyny w świecie), layout (LAYOUT modelu), axis ('x' | '-y'),
   *        ramGroup, doorGroup, doorAxis ('y'), eject (zgniatarka puszek: wypycha przez zasuwę), wall (u ściany końcowej) }
   */
  constructor(cfg) {
    Object.assign(this, cfg);
    const L = cfg.layout;
    this.a = cfg.axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, -1, 0);
    this.b = cfg.axis === 'x' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    this.c = new THREE.Vector3().crossVectors(this.a, this.b);
    this.root.updateMatrixWorld(true);
    this.M = this.root.matrixWorld.clone(); this.Mi = this.M.clone().invert();
    this.qRoot = new THREE.Quaternion().setFromRotationMatrix(this.M);
    this.u0 = cfg.axis === 'x' ? L.ram.start : -L.ram.start;          // położenie tłoka (środek płyty) na osi a
    this.uEnd = cfg.axis === 'x' ? L.ram.end : -L.ram.end;
    this.u = this.u0; this.half = L.ram.thickness / 2; this.force = L.ram.force; this.speed = L.ram.speed;
    this.state = 'idle'; this.t = 0; this.stall = 0; this.crushed = 0;
    // ciało tłoka (kinematyczne): płyta jako prostopadłościan
    const ch = L.chamber.half, rs = L.ram.size || [L.ram.thickness, ch[1] * 2 - 0.03, ch[2] * 2 - 0.03];
    const half = cfg.axis === 'x' ? [L.ram.thickness / 2, rs[1] / 2, rs[2] / 2] : [rs[0] / 2, rs[1] / 2, rs[2] / 2];
    this.ram = this.ph.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    this.ph.world.createCollider(R.ColliderDesc.cuboid(...half).setCollisionGroups(groups(G.WORLD, G.ITEM | G.PLAYER | G.VEHICLE | G.HELD)).setFriction(0.6), this.ram);
    this.ramBase = this.ramGroup.position.clone();
    if (this.doorGroup) {
      const ds = L.door.size;
      this.door = this.ph.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
      this.ph.world.createCollider(R.ColliderDesc.cuboid(ds[0] / 2, ds[1] / 2, ds[2] / 2).setCollisionGroups(groups(G.WORLD, G.ITEM | G.PLAYER | G.VEHICLE | G.HELD)), this.door);
      this.doorClosed = this.doorGroup.position.y; this.doorOpen = this.doorClosed + (L.door.openY - L.door.closedY); this.doorY = this.doorClosed;
    }
    // ściana końcowa: zasuwa / dno (u na osi a)
    this.wall = cfg.wall;
    this.chamber = L.chamber;
    this.place(true);
  }
  get busy() { return this.state !== 'idle'; }
  start() { if (this.state === 'idle') { this.state = this.doorGroup && !this.eject && this.doorY > this.doorClosed + 0.01 ? 'close' : 'press'; this.t = 0; this.stall = 0; this.crushed = 0; } }
  stop() { if (this.state !== 'idle') this.state = 'retract'; }
  status() {
    return { idle: 'gotowa', close: 'zamyka bramę', press: 'zgniata', hold: 'docisk', open: 'otwiera', eject: 'wypycha', retract: 'cofa tłok' }[this.state];
  }

  /** Ustawia ciała kinematyczne i grupy modelu wg u i położenia drzwi. */
  place(now = false) {
    const local = this.a.clone().multiplyScalar(this.u);
    if (this.axis === 'x') this.ramGroup.position.set(local.x, this.ramBase.y, this.ramBase.z);
    else this.ramGroup.position.set(this.ramBase.x, -this.u, this.ramBase.z);
    const w = this.ramGroup.position.clone().applyMatrix4(this.M);
    const q = this.qRoot;
    if (now) { this.ram.setTranslation(w, true); this.ram.setRotation(q, true); }
    this.ram.setNextKinematicTranslation(w); this.ram.setNextKinematicRotation(q);
    if (this.door) {
      this.doorGroup.position.y = this.doorY;
      const dw = this.doorGroup.position.clone().applyMatrix4(this.M);
      if (now) { this.door.setTranslation(dw, true); this.door.setRotation(q, true); }
      this.door.setNextKinematicTranslation(dw); this.door.setNextKinematicRotation(q);
    }
  }

  /** Przedmioty w komorze z ich zasięgiem wzdłuż osi tłoka i w przekroju (układ maszyny). */
  contents() {
    const ch = this.chamber, cen = new THREE.Vector3(...ch.center), out = [];
    const qi = this.qRoot.clone().invert();
    for (const it of this.items.list) {
      if (it.held) continue;
      const t = it.body.translation(), p = new THREE.Vector3(t.x, t.y, t.z).applyMatrix4(this.Mi);
      const d = p.clone().sub(cen);
      if (Math.abs(d.x) > ch.half[0] + 0.1 || Math.abs(d.y) > ch.half[1] + 0.6 || Math.abs(d.z) > ch.half[2] + 0.1) continue;
      const r = it.body.rotation(), q = new THREE.Quaternion(r.x, r.y, r.z, r.w).premultiply(qi);
      const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map((v) => v.applyQuaternion(q));
      const h = this.items.halfExtents(it);
      const ext = (v) => ax.reduce((s, A, k) => s + Math.abs(A.dot(v)) * h[k], 0);
      out.push({ it, p, ax, h, ea: ext(this.a), eb: ext(this.b), ec: ext(this.c), ua: p.dot(this.a), ub: p.dot(this.b), uc: p.dot(this.c) });
    }
    return out;
  }

  step(dt) {
    const L = this.layout;
    this.t += dt;
    if (this.door) {
      const want = (this.state === 'open' || this.state === 'eject' || (!this.eject && (this.state === 'idle' && this.opened))) ? this.doorOpen : this.doorClosed;
      if (this.state === 'close') { this.doorY = Math.max(this.doorClosed, this.doorY - 0.5 * dt); if (this.doorY <= this.doorClosed + 1e-3) { this.state = 'press'; this.opened = false; } }
      else this.doorY += Math.sign(want - this.doorY) * Math.min(Math.abs(want - this.doorY), 0.5 * dt);
    }
    if (this.state === 'press') this.press(dt);
    else if (this.state === 'hold') { if (this.t > 0.8) { this.state = this.eject ? 'open' : 'retract'; this.t = 0; } }
    else if (this.state === 'open') { if (Math.abs(this.doorY - this.doorOpen) < 0.01) { this.state = 'eject'; this.t = 0; } }
    else if (this.state === 'eject') { this.u = Math.min(this.u + this.speed * 1.6 * dt, this.wall + 0.25 - this.half); if (this.u >= this.wall + 0.25 - this.half - 1e-3) { this.state = 'retract'; this.t = 0; } }
    else if (this.state === 'retract') {
      this.u = Math.max(this.u0, this.u - this.speed * 2 * dt);
      if (this.u <= this.u0 + 1e-4) { this.state = 'idle'; if (!this.eject && this.door) this.opened = true; }
    }
    this.place();
  }

  press(dt) {
    const face = this.u + this.half, want = Math.min(this.u + this.speed * dt, this.uEnd);
    const C = this.contents(), ch = this.chamber;
    // kolumny przekroju: suma zasięgów (2·ea) przedmiotów pokrywających kolumnę
    const hb = this.axis === 'x' ? ch.half[1] : ch.half[0], hc = this.axis === 'x' ? ch.half[2] : ch.half[2];
    const cb = this.axis === 'x' ? ch.center[1] : ch.center[0], cc = this.axis === 'x' ? ch.center[2] : ch.center[2];
    const cells = Array.from({ length: CELLS * CELLS }, () => ({ sum: 0, list: [] }));
    for (const e of C) {
      if (e.ua + e.ea < face - 0.02 && this.axis === 'x') continue;              // za tłokiem
      const b0 = Math.floor((e.ub - e.eb - (cb - hb)) / (2 * hb) * CELLS), b1 = Math.floor((e.ub + e.eb - (cb - hb)) / (2 * hb) * CELLS);
      const c0 = Math.floor((e.uc - e.ec - (cc - hc)) / (2 * hc) * CELLS), c1 = Math.floor((e.uc + e.ec - (cc - hc)) / (2 * hc) * CELLS);
      for (let i = Math.max(0, b0); i <= Math.min(CELLS - 1, b1); i++) for (let j = Math.max(0, c0); j <= Math.min(CELLS - 1, c1); j++) { cells[i * CELLS + j].sum += 2 * e.ea; cells[i * CELLS + j].list.push(e); }
    }
    let worst = null; for (const c of cells) if (!worst || c.sum > worst.sum) worst = c;
    const free = this.wall - (worst ? worst.sum : 0);        // najdalej, gdzie może być czoło tłoka
    if (want + this.half <= free + 0.005) { this.u = want; this.stall = 0; }
    else {
      // zablokowany: zgnieć najsłabszy przedmiot w najbardziej obciążonej kolumnie
      const need = want + this.half - free;
      let best = null;
      for (const e of worst.list) {
        const k = [0, 1, 2].reduce((m, i) => (Math.abs(e.ax[i].dot(this.a)) > Math.abs(e.ax[m].dot(this.a)) ? i : m), 0);
        const info = this.items.info(e.it.kind), key = 'xyz'[k], min = info.minScale[key], s = e.it.scale[k];
        if (s <= min + 1e-3) continue;
        const harden = 1 + 3 * (1 - s) / Math.max(0.05, 1 - min);
        const res = info.crush[key] * 1000 * harden;
        if (res > this.force) continue;
        if (!best || res < best.res) best = { e, k, res, min };
      }
      if (best) {
        const { e, k, min } = best, A = Math.abs(e.ax[k].dot(this.a));
        const dh = Math.min(need / 2 / Math.max(A, 0.3), e.h[k] * 0.12);
        const s = e.it.scale.slice(), h0 = e.h[k] / s[k];
        s[k] = Math.max(min, (e.h[k] - dh) / h0);
        this.crushed++;
        const kind = this.items.info(e.it.kind).id;
        // cała puszka zgnieciona o połowę → model puszki zgniecionej (oś Y wzdłuż osi tłoka)
        if (kind === 'can' && s[k] < 0.5) this.items.replace(e.it, 'can-crushed', this.a.clone().applyQuaternion(this.qRoot));
        else this.items.setScale(e.it, s);
        this.u = Math.max(this.u, Math.min(want, free - this.half + 0.004));
        this.stall = 0;
      } else {
        this.u = Math.max(this.u, Math.min(want, free - this.half));
        this.stall += dt;
        if (this.stall > 1.2) { this.state = 'hold'; this.t = 0; }
      }
    }
    if (this.u >= this.uEnd - 1e-4) { this.state = 'hold'; this.t = 0; }
  }
}

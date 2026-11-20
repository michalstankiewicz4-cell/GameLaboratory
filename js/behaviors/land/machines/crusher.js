// Zachowanie „zgniatarka” (środowisko: ląd) — z gry Złomowisko (js/machines/crusher.js, z historią), na świecie
// przedmiotów GameLaboratory (land/items.js) zamiast Rapier. Wspólna logika: puszki — tłok poziomy, metal — płyta pionowa.
// Tłok (i zasuwa / brama) jest bryłą ruchomą (kinematyczną): sam przesuwa przedmioty (fizyka). Gdy przedmioty zablokują
// drogę (stos wzdłuż osi tłoka dłuższy niż wolne miejsce w danej kolumnie przekroju), tłok zgniata najsłabszy przedmiot
// w tej kolumnie: opór = opór przedmiotu wzdłuż lokalnej osi najbardziej zgodnej z osią tłoka (info.crush, kN)
// × utwardzenie (rośnie przy zgniataniu, do info.minScale). Za mocny przedmiot (opór > siła tłoka) zatrzymuje tłok —
// po chwili cofa się. Zgnieciona o połowę puszka staje się puszką zgniecioną (właściwość crushTo).
// Liczy się w krokach świata przedmiotów (W.hook, 1/240 s).
import * as THREE from '../../../../vendor/three/three.module.js';
import { obbFrom, newObb } from '../items.js';
import { propsOf } from '../../../models/junkyard/properties.js';

export const ENVIRONMENTS = ['land'];
export const STATUS = { idle: 'ready', close: 'closing the gate', press: 'crushing', hold: 'holding', open: 'opening', eject: 'pushing out', retract: 'retracting' };
export const STATUS_PL = { idle: 'gotowa', close: 'zamyka bramę', press: 'zgniata', hold: 'docisk', open: 'otwiera', eject: 'wypycha', retract: 'cofa tłok' };

const CELLS = 4;
export class Crusher {
  /**
   * cfg: { name, W (świat przedmiotów), kit (itemKit), root (Group maszyny w świecie), layout (LAYOUT modelu), axis ('x' | '-y'),
   *        ramGroup, doorGroup, eject (zgniatarka puszek: wypycha przez zasuwę), wall (u ściany końcowej) }
   */
  constructor(cfg) {
    Object.assign(this, cfg);
    const L = cfg.layout;
    this.a = cfg.axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, -1, 0);
    this.b = cfg.axis === 'x' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    this.c = new THREE.Vector3().crossVectors(this.a, this.b);
    this.root.updateMatrixWorld(true);
    this.M = this.root.matrixWorld.clone(); this.Mi = this.M.clone().invert();
    // obiekt w skali (edytor sceny): S — skala modelu (jednakowa), obrót bez skali
    const sc = new THREE.Vector3(); this.qRoot = new THREE.Quaternion(); this.M.decompose(new THREE.Vector3(), this.qRoot, sc); this.S = sc.x;
    this.u0 = cfg.axis === 'x' ? L.ram.start : -L.ram.start;          // położenie tłoka (środek płyty) na osi a
    this.uEnd = cfg.axis === 'x' ? L.ram.end : -L.ram.end;
    this.u = this.u0; this.half = L.ram.thickness / 2; this.force = L.ram.force; this.speed = L.ram.speed;
    this.state = 'idle'; this.t = 0; this.stall = 0; this.crushed = 0;
    // ciało tłoka (kinematyczne): płyta jako prostopadłościan
    const ch = L.chamber.half, rs = L.ram.size || [L.ram.thickness, ch[1] * 2 - 0.03, ch[2] * 2 - 0.03];
    const half = cfg.axis === 'x' ? [L.ram.thickness / 2, rs[1] / 2, rs[2] / 2] : [rs[0] / 2, rs[1] / 2, rs[2] / 2];
    this.ram = newObb(); this.ramHalf = half;
    this.ramBase = this.ramGroup.position.clone();
    if (this.doorGroup) {
      const ds = L.door.size;
      this.door = newObb(); this.doorHalf = [ds[0] / 2, ds[1] / 2, ds[2] / 2];
      this.doorClosed = this.doorGroup.position.y; this.doorOpen = this.doorClosed + (L.door.openY - L.door.closedY); this.doorY = this.doorClosed;
    }
    // ściana końcowa: zasuwa / dno (u na osi a)
    this.wall = cfg.wall;
    this.chamber = L.chamber;
    this.place(true);
    this.unKin = this.W.addKinematic([this.ram, this.door].filter(Boolean));
    this.unHook = this.W.hook((h) => this.step(h));
  }
  dispose() { this.unKin(); this.unHook(); }
  get busy() { return this.state !== 'idle'; }
  start() { if (this.state === 'idle') { this.state = this.doorGroup && !this.eject && this.doorY > this.doorClosed + 0.01 ? 'close' : 'press'; this.t = 0; this.stall = 0; this.crushed = 0; } }
  stop() { if (this.state !== 'idle') this.state = 'retract'; }
  status(pl = false) { return (pl ? STATUS_PL : STATUS)[this.state]; }

  /** Ustawia bryły ruchome i grupy modelu wg u i położenia drzwi (prędkość bryły z przesunięcia w kroku h). */
  place(now = false, h = 0) {
    const local = this.a.clone().multiplyScalar(this.u);
    if (this.axis === 'x') this.ramGroup.position.set(local.x, this.ramBase.y, this.ramBase.z);
    else this.ramGroup.position.set(this.ramBase.x, -this.u, this.ramBase.z);
    const set = (box, group, half) => {
      const c0 = box.c.clone(); obbFrom(this.M, group.position.toArray(), half, null, box);
      if (now || !h) box.v.set(0, 0, 0); else box.v.copy(box.c).sub(c0).divideScalar(h);
    };
    set(this.ram, this.ramGroup, this.ramHalf);
    if (this.door) { this.doorGroup.position.y = this.doorY; set(this.door, this.doorGroup, this.doorHalf); }
  }

  /** Przedmioty w komorze z ich zasięgiem wzdłuż osi tłoka i w przekroju (układ maszyny). */
  contents() {
    const ch = this.chamber, cen = new THREE.Vector3(...ch.center), out = [];
    const qi = this.qRoot.clone().invert();
    for (const it of this.W.list) {
      if (it.held) continue;
      const p = it.p.clone().applyMatrix4(this.Mi);
      const d = p.clone().sub(cen);
      if (Math.abs(d.x) > ch.half[0] + 0.1 || Math.abs(d.y) > ch.half[1] + 0.6 || Math.abs(d.z) > ch.half[2] + 0.1) continue;
      const q = it.q.clone().premultiply(qi);
      const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)].map((v) => v.applyQuaternion(q));
      const h = it.half.map((x) => x / this.S);   // w układzie modelu
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
    this.place(false, dt);
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
        const info = this.kit.info(e.it.kind), key = 'xyz'[k], min = info.minScale[key], s = e.it.scale[k];
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
        const to = propsOf(e.it.kind).crushTo;
        // cała puszka zgnieciona o połowę → model puszki zgniecionej (oś Y wzdłuż osi tłoka)
        if (to && s[k] < 0.5) this.kit.replace(this.W, e.it, to, this.a.clone().applyQuaternion(this.qRoot));
        else this.W.setScale(e.it, s);
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

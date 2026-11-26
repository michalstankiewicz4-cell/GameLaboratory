// DestructKit — pękanie i statyka (część świata zniszczeń, world.js): część pęka według wzoru z materiału
// (patterns.js) — kawałki w zasięgu uderzenia odlatują, reszta zostaje; kawałki pękniętej części trzymają się, dopóki
// łączą się (wspólną krawędzią) z podporą; część bez podparcia (need — ułamek podpór, który musi zostać) spada w całości
// i pęka o ziemię.
//   createStatics(C) → { breakPart, settle, detachCell, gone, supported, drop, processQueue }
//   C: wspólny stan świata (world.js): batches, chips, bodies, queue, listeners, simT, reveal, tintOf, geoOf,
//      cellMatrix, addPartMesh, spawnFragment, removeBody, sizeOf, chipColor, chipSize
import * as THREE from '../../../../vendor/three/three.module.js';
import { fracture } from './patterns.js';
import { MATS } from './materials.js';
import { makeBody } from './physics.js';
import { bounds, touching } from './geom2d.js';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3(), _n = new THREE.Vector3();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createStatics(C) {
  // hitL: punkt uderzenia w układzie części [x, y]; power 0…1; J: impuls [Vector3] (kierunek wyrzutu); all: wszystko odpada
  function breakPart(part, hitL, power, J, all = false) {
    if (part.fixed || part.state !== 'intact') return;
    C.reveal(part.bld);
    const D = MATS[part.mat], cells = fracture({ poly: part.poly, pattern: D.pattern, pat: { ...(D.pat || {}), ...(part.spec.pat || {}) }, seed: part.spec.seed }, hitL, power, Math.floor(C.simT * 1000));
    C.batches.remove(part.handle); part.handle = null;
    part.state = 'broken'; part.cells = [];
    const Rb = all ? 1e9 : (D.glass ? 1e9 : 0.35 + 1.8 * power);
    const Jl = J ? J.length() : 0, dir = Jl > 1e-6 ? J.clone().divideScalar(Jl) : new THREE.Vector3(0, 0, 0);
    let dynMass = 0; for (const c of cells) if (c.d <= Rb) dynMass += c.a * part.t * D.density;
    const vmag = Math.min(11, Jl / Math.max(40, dynMass) * 0.9 + 1);   // pęd dzielony na wszystkie wyrzucone kawałki
    for (const c of cells) {
      if (c.d <= Rb) {
        const k = 1 - 0.5 * clamp(c.d / Rb, 0, 1);
        const v = dir.clone().multiplyScalar(vmag * k).add(_n.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(2 + 2 * power));
        C.spawnFragment(part, c.poly, v);
      } else {
        const { h } = C.addPartMesh(part, c.poly, C.tintOf(part));
        part.cells.push({ poly: c.poly, c: c.c, a: c.a, h, hp: D.hp * Math.sqrt(Math.max(0.05, c.a)) * 0.35, on: true });
      }
    }
    settle(part);
    if (C.chips) {   // okruchy z miejsca pęknięcia, w kierunku uderzenia
      _p.set(hitL[0], hitL[1], 0).applyMatrix4(part.M);
      const n = clamp(Math.round(part.a * 12 * power * (D.glass ? 2 : 1)), 6, 90);
      C.chips.burst(_p, dir.clone().multiplyScalar(vmag * 0.6), { n, color: C.chipColor(part), size: C.chipSize(part.mat), spread: 1.5 + 2 * power, radius: 0.25 + 0.5 * power });
    }
    for (const f of C.listeners.break) f(part);
  }
  // kawałki pękniętej części, które nie łączą się z podporą, odpadają; część bez kawałków znika
  function settle(part) {
    const cells = part.cells.filter((c) => c.on);
    if (!cells.length) { gone(part); return; }
    const ok = supported(part);
    const [x0, y0, x1, y1] = bounds(part.poly), e = 0.03;
    const base = (c) => {
      if (!ok) return false;
      const [a0, b0, a1, b1] = bounds(c.poly);
      if (part.anchor === 'bottom') return b0 < y0 + e;
      if (part.anchor === 'sides') return a0 < x0 + e || a1 > x1 - e;
      return a0 < x0 + e || a1 > x1 - e || b0 < y0 + e || b1 > y1 - e;
    };
    const held = new Set(), stack = cells.filter(base);
    stack.forEach((c) => held.add(c));
    while (stack.length) {
      const c = stack.pop();
      for (const o of cells) if (!held.has(o) && touching(c.poly, o.poly, 0.02)) { held.add(o); stack.push(o); }
    }
    for (const c of cells) if (!held.has(c)) detachCell(part, c, null);
    if (!part.cells.some((c) => c.on)) gone(part);
    else for (const d of part.dependents) C.queue.add(d);
  }
  function detachCell(part, c, vel) {
    if (!c.on) return;
    c.on = false; C.batches.remove(c.h);
    C.spawnFragment(part, c.poly, vel || new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6), { spin: 0.3 });
  }
  function gone(part) {
    if (part.state === 'gone') return;
    if (part.handle) { C.batches.remove(part.handle); part.handle = null; }
    part.state = 'gone';
    for (const d of part.dependents) C.queue.add(d);
  }
  function integrity(p) {
    if (p.state === 'intact') return 1;
    if (p.state === 'broken') { let s = 0; for (const c of p.cells) if (c.on) s += c.a; return s / p.a; }
    return 0;
  }
  function supported(p) {
    if (p.ground) return true;
    let s = 0, w = 0;
    for (const q of p.supports) { w += q.a; s += q.a * integrity(q); }
    return w > 0 && s / w >= p.need;
  }
  // cała część traci podparcie: spada w całości i pęka przy uderzeniu o ziemię
  function drop(part) {
    if (part.state === 'intact') {
      const g = C.geoOf(part, part.poly), M = C.cellMatrix(part, null, g); M.decompose(_p, _q, _v);
      C.batches.remove(part.handle);
      const D = MATS[part.mat], m = Math.max(0.1, part.vol * D.density * (D.solidFactor || 1));
      const b = makeBody({ p: _p, q: _q, m, pts: g.userData.pts, r: g.userData.r, A: part.a * 0.5, restitution: 0.1 });
      part.handle = null; part.state = 'falling';
      Object.assign(b, { kind: 'part', mat: part.mat, part, size: C.sizeOf(part.poly, part.t), vol: part.vol, handle: C.batches.add(g, part.mat, M, C.tintOf(part)), geo: g, born: C.simT });
      b.onLand = (bb, speed) => { if (speed > 2.2 || bb.age > 6) shatterBody(bb, speed); };
      C.bodies.add(b);
      for (const d of part.dependents) C.queue.add(d);
    } else if (part.state === 'broken') {
      for (const c of part.cells) if (c.on) detachCell(part, c, null);
      gone(part);
    }
  }
  // spadająca część rozbija się o ziemię: kawałki z prędkością bryły
  function shatterBody(b, speed) {
    const part = b.part; if (!part || b.dead) return;
    b.dead = true; C.removeBody(b);
    // układ części po upadku: macierz bryły minus przesunięcie do środka ciężkości
    const c = b.geo.userData.c;
    part.M.compose(b.p, b.q, _s).multiply(_m.makeTranslation(-c[0], -c[1], 0)); part.Minv.copy(part.M).invert();
    // punkt uderzenia: najniższy narożnik
    let low = null, ly = Infinity;
    for (const q of part.poly) { _p.set(q[0], q[1], 0).applyMatrix4(part.M); if (_p.y < ly) { ly = _p.y; low = q; } }
    const D = MATS[part.mat], power = clamp(speed / 9, 0.3, 1);
    const cells = fracture({ poly: part.poly, pattern: D.pattern, pat: D.pat || {}, seed: part.spec.seed + 7 }, low, power, 3);
    part.state = 'gone';
    if (C.chips) C.chips.burst(b.p, b.v.clone().multiplyScalar(0.2), { n: clamp(Math.round(part.a * 10 * power), 8, 120), color: C.chipColor(part), size: C.chipSize(part.mat), spread: 2 * power, up: 2.5 * power, radius: Math.min(1.5, b.r * 0.6) });
    for (const cl of cells) C.spawnFragment(part, cl.poly, b.v.clone().multiplyScalar(0.25).add(_n.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(1.5 * power)), { spin: 0.8 });
  }
  function processQueue() {
    let guard = 0;
    while (C.queue.size && guard++ < 400) {
      const p = C.queue.values().next().value; C.queue.delete(p);
      if ((p.state === 'intact' || p.state === 'broken') && !p.fixed && !supported(p)) drop(p);
      else if (p.state === 'broken') settle(p);
    }
  }
  return { breakPart, settle, detachCell, gone, supported, drop, processQueue };
}

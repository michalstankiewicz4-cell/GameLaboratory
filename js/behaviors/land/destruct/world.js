// DestructKit — świat zniszczeń (zachowanie „zniszczenie”, środowisko ląd; z Tornado.io): budynki z części (HouseKit,
// js/models/houses/), które pękają tak, jak są zbudowane (wzór z materiału części, patterns.js), statyka (część stoi,
// dopóki stoi to, na czym się opiera; kawałki pękniętej ściany trzymają się, dopóki łączą się z podporą — statics.js),
// odłamki jako bryły sztywne (physics.js), uderzenia, wiatr i zderzenia rzuconych przedmiotów z częściami
// (impacts.js). Rysowanie: BatchedMesh na materiał (batches.js). Opis: docs/behaviors/destruct.md.
//
// createWorld(scene, { ground(x, z), wind?(x, y, z, out), maxFragments, chips, physicsWorker }) → world:
//   addHouse(house, { x, z, rot, hidden }) → building    house z buildHouse (js/models/houses/housekit.js)
//   addObject(obj3d, { m, pts, r, A, size, kind, sleep }) → body   przedmiot z własną siatką (beczka, opona…)
//   hit(point, J, { radius })                           uderzenie: punkt [Vector3], impuls [Vector3, N·s]
//   windDamage(x, z, R, speedAt(x, y, z), dt)           wiatr niszczy części w promieniu R (szyby pierwsze)
//   update(dt, { sync })                                fizyka, zderzenia, statyka, rysowanie
//   opts.physicsWorker: adres modułu środowiska (ground, wind) — krok brył w osobnym wątku (physics-link.js,
//     physics-worker.js), wyniki w następnej klatce; env.windState — stan wiatru wysyłany do wątku (same liczby). Bez
//     wątku albo z { sync: true } (np. symulacja dla AI) — krok na głównym wątku.
//   Budynki ukryte (hidden) trafiają na kartę dopiero przy odsłonięciu (pierwsze uszkodzenie, ogień).
//   opts.chips (domyślnie tak): drobny gruz tylko na karcie (chips.js) przy pękaniu części i rozbiciu spadającej —
//     do oglądania, poza fizyką.
//   bodies (Set), buildings, removeBody(b), stats(), clear(), onBreak(fn), onFragment(fn), onReveal(fn)
// Body: { p, q, v, w, m, r, A, size, state 'active' | 'sleep' | 'held', kind 'frag' | 'part' | 'item', mat }
import * as THREE from '../../../../vendor/three/three.module.js';
import { extrude } from './extrude.js';
import { MATS, tileOf } from './materials.js';
import { createBatches } from './batches.js';
import { createChips } from './chips.js';
import { makeBody, stepBody, wake } from './physics.js';
import { bounds, area } from './geom2d.js';
import { createStatics } from './statics.js';
import { createImpacts } from './impacts.js';
import { createPhysicsLink } from './physics-link.js';
export const ENVIRONMENTS = ['land'];

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3();
const CELL = 4;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createWorld(scene, opts = {}) {
  const ground = opts.ground || (() => 0);
  const batches = createBatches(scene);
  const bodies = new Set(), buildings = [], grid = new Map(), queue = new Set();
  const listeners = { break: [], frag: [], reveal: [] };
  let maxFrag = opts.maxFragments || 2500, fragCount = 0;
  const env = { ground, wind: opts.wind || null, windGain: 1 };
  const chips = opts.chips === false ? null : createChips(scene, { ground });
  // wspólny stan dla pękania i statyki (statics.js), uderzeń i wiatru (impacts.js), wątku fizyki (physics-link.js)
  const C = { batches, chips, bodies, queue, listeners, env, simT: 0 };
  // barwa okruchów: średnia z tekstury materiału (szkło jasne, zielonkawe), z odcieniem budynku i zwęgleniem
  const chipCol = new Map();
  C.chipColor = (part) => {
    let c = chipCol.get(part.mat);
    if (!c) {
      const D = MATS[part.mat], t = D.tex || {};
      c = D.glass ? new THREE.Color(0.78, 0.86, 0.88) : t.color ? new THREE.Color(t.color).lerp(new THREE.Color(t.color2 || t.color), 0.5) : new THREE.Color(D.color || 0x8a8580);
      chipCol.set(part.mat, c);
    }
    const tn = tintOf(part); return tn ? c.clone().multiply(tn) : c;
  };
  C.chipSize = (mat) => (MATS[mat].glass ? 0.035 : MATS[mat].pattern === 'planks' || MATS[mat].pattern === 'beam' ? 0.045 : 0.06);

  /* ---------------- siatka przestrzenna części ---------------- */
  function gridAdd(part) {
    const [x0, , z0, x1, , z1] = part.aabb;
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = i * 73856093 ^ j * 19349663; let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(part);
    }
  }
  function query(x, z, r, out = new Set()) {
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
      const a = grid.get(i * 73856093 ^ j * 19349663); if (!a) continue;
      for (const p of a) if (p.state === 'intact' || p.state === 'broken') {
        const b = p.aabb; if (x + r >= b[0] && x - r <= b[3] && z + r >= b[2] && z - r <= b[5]) out.add(p);
      }
    }
    return out;
  }
  C.query = query;

  /* ---------------- budynki ---------------- */
  // hidden: części niewidoczne, dopóki budynek nie dostanie pierwszego uszkodzenia (gra pokazuje do tego czasu model
  // z laboratorium miasta; onReveal mówi, kiedy go schować)
  function addHouse(house, { x = 0, z = 0, rot = 0, hidden = false } = {}) {
    const bM = new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), _s);
    const bld = { house, x, z, rot, M: bM, parts: [], tint: house.tint ? new THREE.Color(house.tint) : null, vol0: 0, volGone: 0, hidden };
    for (const sp of house.parts) {
      const M = new THREE.Matrix4().compose(new THREE.Vector3(...sp.pos), new THREE.Quaternion(...sp.quat), _s).premultiply(bM);
      const a = Math.abs(area(sp.poly)), D = MATS[sp.mat];
      const part = { spec: sp, bld, id: sp.id, mat: sp.mat, poly: sp.poly, t: sp.t, M, Minv: M.clone().invert(), a, vol: a * sp.t,
        hpMax: D.hp * Math.sqrt(Math.max(0.15, a)) * 0.75 * clamp(sp.t / 0.25, 0.35, 1.6), state: 'intact', cells: null, handle: null,
        need: sp.need, anchor: sp.anchor, fixed: !!sp.fixed, supports: [], dependents: [], ground: sp.supports.includes(-1) };
      part.hp = part.hpMax;
      part.aabb = aabbOf(part);
      // ukryty budynek: siatki części na kartę dopiero przy odsłonięciu (reveal) — do tego czasu nie zajmują pamięci GPU
      if (!hidden) part.handle = addPartMesh(part, part.poly, tintOf(part)).h;
      else batches.prepare(part.mat);   // materiał (tekstury) gotowy od razu — odsłonięcie tylko kopiuje siatki
      if (!part.fixed) bld.vol0 += part.vol;
      bld.parts.push(part);
      gridAdd(part);
    }
    for (const part of bld.parts) for (const s of part.spec.supports) if (s >= 0) { part.supports.push(bld.parts[s]); bld.parts[s].dependents.push(part); }
    buildings.push(bld);
    return bld;
  }
  function reveal(bld) {
    if (!bld.hidden) return;
    bld.hidden = false;
    // siatki części na kartę po kawałku (budżet czasu na klatkę) — duży budynek nie zatrzymuje gry; do końca części
    // są niewidoczne, a gra pokazuje dalej model z laboratorium miasta, potem zamiana naraz (onReveal)
    bld.pending = bld.parts.filter((p) => p.state === 'intact' && !p.handle);
    bld.shown = [];
    revealing.add(bld);
  }
  const revealing = new Set(), REVEAL_MS = 5;
  function revealStep() {
    const t0 = performance.now();
    for (const bld of revealing) {
      while (bld.pending.length) {
        const p = bld.pending.pop();
        if (p.state === 'intact' && !p.handle) { p.handle = addPartMesh(p, p.poly, tintOf(p)).h; batches.visible(p.handle, false); bld.shown.push(p); }
        if (performance.now() - t0 > REVEAL_MS) return;
      }
      for (const p of bld.shown) if (p.handle) batches.visible(p.handle, true);
      bld.shown = null; bld.pending = null; revealing.delete(bld);
      for (const f of listeners.reveal) f(bld);
    }
  }
  // barwa części: odcień budynku (tynk, płyta) i zwęglenie od ognia (char 0…1 — ciemnieje)
  function tintOf(part) {
    const base = part.bld.tint && (part.mat === 'plaster' || part.mat === 'panel') ? part.bld.tint : null;
    if (!part.char) return base;
    return (base ? base.clone() : new THREE.Color(1, 1, 1)).multiplyScalar(1 - 0.88 * part.char);
  }
  function setChar(part, k) {
    part.char = Math.max(part.char || 0, Math.min(1, k));
    const c = tintOf(part);
    if (part.handle) batches.color(part.handle, c);
    if (part.cells) for (const cl of part.cells) if (cl.on) batches.color(cl.h, c);
  }
  function sizeOf(poly, t) { const g = bounds(poly); return Math.max(g[2] - g[0], g[3] - g[1], t); }
  function geoOf(part, poly) { return extrude(poly, { t: part.t, orig: part.poly, tile: tileOf(part.mat), frac: MATS[part.mat].frac }); }
  // macierz kawałka: układ części przesunięty do środka wielokąta (extrude centruje siatkę na środku ciężkości)
  function cellMatrix(part, c, geo) {
    const cc = geo ? geo.userData.c : null;
    return new THREE.Matrix4().makeTranslation(cc ? cc[0] : c[0], cc ? cc[1] : c[1], 0).premultiply(part.M);
  }
  function aabbOf(part) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const q of part.poly) for (const z of [-part.t / 2, part.t / 2]) {
      _p.set(q[0], q[1], z).applyMatrix4(part.M);
      b[0] = Math.min(b[0], _p.x); b[1] = Math.min(b[1], _p.y); b[2] = Math.min(b[2], _p.z); b[3] = Math.max(b[3], _p.x); b[4] = Math.max(b[4], _p.y); b[5] = Math.max(b[5], _p.z);
    }
    return b;
  }
  // geometria w addHouse liczona przez extrude ma środek ciężkości; macierz musi go użyć — poprawka po dodaniu
  function addPartMesh(part, poly, color) { const g = geoOf(part, poly); return { g, h: batches.add(g, part.mat, cellMatrix(part, null, g), color) }; }

  /* ---------------- odłamki ---------------- */
  function spawnFragment(part, poly, vel, opts2 = {}) {
    const g = geoOf(part, poly), D = MATS[part.mat];
    const M = cellMatrix(part, null, g); M.decompose(_p, _q, _v);
    const a = g.userData.a, m = Math.max(0.05, a * part.t * D.density * (D.solidFactor || 1));
    const [x0, y0, x1, y1] = bounds(poly), size = Math.max(x1 - x0, y1 - y0, part.t);
    const b = makeBody({ p: _p, q: _q, v: vel, m, pts: g.userData.pts, r: g.userData.r, A: Math.max(a * 0.6, part.t * size) });
    b.w.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4).multiplyScalar(opts2.spin ?? 1);
    Object.assign(b, { kind: 'frag', mat: part.mat, size, vol: a * part.t, handle: batches.add(g, part.mat, M, tintOf(part)), from: part, born: C.simT, char: part.char || 0 });
    bodies.add(b); fragCount++;
    part.bld.volGone += a * part.t;
    for (const f of listeners.frag) f(b);
    return b;
  }
  function removeBody(b) {
    if (!bodies.has(b)) return;
    bodies.delete(b);
    if (phys && b.wid) phys.del.push(b.wid);
    if (b.handle) batches.remove(b.handle);
    if (b.obj && b.obj.parent) b.obj.parent.remove(b.obj);
    if (b.onRemove) b.onRemove(b);
    if (b.kind === 'frag') fragCount--;
  }
  // obj: Object3D (rysowany sam) albo { position, quaternion } z onSync(b) — np. instancja w InstancedMesh
  function addObject(obj, { m, pts, r, A, size, vol, kind = 'item', sleep = true, name = '', onSync = null }) {
    const b = makeBody({ p: obj.position, q: obj.quaternion, m, pts, r, A });
    Object.assign(b, { kind, obj: obj.isObject3D ? obj : null, onSync, size: size || r * 2, name, state: sleep ? 'sleep' : 'active', vol: vol ?? (size || r) ** 3 * 0.3, born: C.simT, moved: true });
    bodies.add(b);
    return b;
  }
  Object.assign(C, { reveal, tintOf, geoOf, cellMatrix, addPartMesh, spawnFragment, removeBody, sizeOf });

  const S = createStatics(C), I = createImpacts(C, S);
  const phys = opts.physicsWorker ? createPhysicsLink(opts.physicsWorker, C) : null;

  /* ---------------- krok ---------------- */
  const sub = 2;
  function update(dt, { sync: inline = false } = {}) {
    dt = Math.min(dt, 1 / 20); C.simT += dt;
    const useWorker = phys && phys.usable && !inline;
    if (useWorker) {
      if (phys.res) { phys.apply(phys.res); phys.res = null; }
      for (const b of bodies) {
        if (b.state !== 'active') continue;
        I.collide(b);
        if (bodies.has(b) && b.p.y < ground(b.p.x, b.p.z) - 30) removeBody(b);
      }
      phys.acc += dt;
      if (!phys.busy) { phys.send(Math.min(phys.acc, 1 / 15)); phys.acc = 0; }
    } else {
      if (phys && phys.busy) phys.stale = true;   // krok w wątku przestarzały — bryły policzone tutaj
      if (phys) phys.res = null;
      const h = dt / sub;
      for (const b of bodies) {
        if (b.state !== 'active') continue;
        for (let i = 0; i < sub && b.state === 'active'; i++) stepBody(b, h, env);
        if (bodies.has(b)) I.collide(b);
        if (b.p.y < ground(b.p.x, b.p.z) - 30) removeBody(b);
      }
    }
    S.processQueue();
    if (revealing.size) revealStep();
    if (chips) chips.update(C.simT);
    // za dużo odłamków: najstarsze leżące najmniejsze znikają (pył)
    if (fragCount > maxFrag) {
      const sleeping = [...bodies].filter((b) => b.kind === 'frag' && b.state === 'sleep').sort((a, c) => a.vol - c.vol || a.born - c.born);
      for (let i = 0; i < sleeping.length && fragCount > maxFrag * 0.9; i++) removeBody(sleeping[i]);
    }
    sync();
  }
  function sync() {
    for (const b of bodies) {
      if (b.state === 'sleep' && !b.moved) continue;
      b.moved = false;
      if (b.handle) { _m.compose(b.p, b.q, b.scale ? _v.setScalar(b.scale) : _s); batches.set(b.handle, _m); }
      else if (b.onSync) b.onSync(b);
      else if (b.obj) { b.obj.position.copy(b.p); b.obj.quaternion.copy(b.q); if (b.scale) b.obj.scale.setScalar(b.scale * (b.baseScale || 1)); }
    }
  }

  function stats() {
    let parts = 0, intact = 0, active = 0, sleep = 0, held = 0, vol0 = 0, volGone = 0;
    for (const bl of buildings) { vol0 += bl.vol0; volGone += Math.min(bl.vol0, bl.volGone); for (const p of bl.parts) { parts++; if (p.state === 'intact') intact++; } }
    for (const b of bodies) { if (b.state === 'active') active++; else if (b.state === 'sleep') sleep++; else if (b.state === 'held') held++; }
    return { parts, intact, fragments: fragCount, active, sleep, held, destroyed: vol0 ? volGone / vol0 : 0, ...batches.stats() };
  }
  function clear() {
    for (const b of [...bodies]) removeBody(b);
    batches.clear(); buildings.length = 0; grid.clear(); queue.clear(); fragCount = 0;
  }

  return {
    addHouse, addObject, hit: I.hit, windDamage: I.windDamage, update, removeBody, stats, clear, query, breakPart: S.breakPart, drop: S.drop, sync,
    bodies, buildings, env, batches, wake,
    set maxFragments(n) { maxFrag = n; },
    onBreak(f) { listeners.break.push(f); }, onReveal(f) { listeners.reveal.push(f); }, reveal, setChar, onFragment(f) { listeners.frag.push(f); },
    get time() { return C.simT; },
    chips,
    get physicsThread() { return !!(phys && phys.usable); },
  };
}

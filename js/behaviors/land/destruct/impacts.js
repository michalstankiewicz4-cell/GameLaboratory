// DestructKit — uderzenia, wiatr i zderzenia brył z częściami (część świata zniszczeń, world.js).
//   createImpacts(C, S) → { hit(point, J, { radius }), windDamage(x, z, R, speedAt, dt), collide(body) }
//   C: wspólny stan świata (world.js): query, reveal, tintOf, batches, simT; S: pękanie i statyka (statics.js)
//   hit        uderzenie: punkt [Vector3], impuls [Vector3, N·s]; cała część traci wytrzymałość (z odległością), pęka
//              przy zerze; pęknięta — kawałki w zasięgu odpadają. Zwraca liczbę pęknięć.
//   windDamage wiatr niszczy części w promieniu R ponad progiem materiału (szyby pierwsze, ściany ostatnie)
//   collide    szybka, ciężka bryła (przedmiot, gruz, spadająca część) uderza w część: niszczy albo odbija się
import * as THREE from '../../../../vendor/three/three.module.js';
import { MATS } from './materials.js';
import { wake } from './physics.js';
import { inside, distTo, bounds } from './geom2d.js';

const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Color();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const xr = (p) => { const b = bounds(p.poly); return [b[0], b[2]]; };
const yr = (p) => { const b = bounds(p.poly); return [b[1], b[3]]; };

export function createImpacts(C, S) {
  const hitSet = new Set();
  function hit(point, J, { radius = 0.6 } = {}) {
    const Jl = J.length(); if (Jl < 1e-3) return 0;
    hitSet.clear(); C.query(point.x, point.z, radius + 0.5, hitSet);
    let broke = 0;
    for (const part of hitSet) {
      if (part.fixed) continue;
      _p.copy(point).applyMatrix4(part.Minv);
      const dz = Math.max(0, Math.abs(_p.z) - part.t / 2), dp = distTo(part.poly, _p.x, _p.y), d = Math.hypot(dz, dp);
      if (d > radius) continue;
      const fall = 1 - 0.7 * (d / radius), dmg = Jl * fall;
      C.reveal(part.bld);
      const hl = [clamp(_p.x, ...xr(part)), clamp(_p.y, ...yr(part))];
      if (part.state === 'intact') {
        part.hp -= dmg;
        if (part.hp <= 0) { S.breakPart(part, hl, clamp(-part.hp / part.hpMax + 0.35, 0.25, 1), J); broke++; }
        else tintDamage(part);
      } else {
        // pęknięta część: kawałki w zasięgu tracą wytrzymałość i odpadają
        let any = false;
        for (const c of part.cells) {
          if (!c.on) continue;
          const dc = Math.hypot(c.c[0] - hl[0], c.c[1] - hl[1]) - Math.sqrt(c.a) * 0.5;
          if (dc > radius + 0.3) continue;
          c.hp -= dmg * (1 - 0.6 * clamp(dc / (radius + 0.3), 0, 1));
          if (c.hp <= 0) { S.detachCell(part, c, J.clone().multiplyScalar(clamp(1 / (c.a * part.t * MATS[part.mat].density), 0, 3) * 2)); any = true; broke++; }
        }
        if (any) S.settle(part);
      }
    }
    return broke;
  }
  // uszkodzona, jeszcze cała część ciemnieje (rysy) — lekka podpowiedź, że zaraz pęknie
  function tintDamage(part) {
    if (!part.handle) return;
    const k = clamp(part.hp / part.hpMax, 0, 1), base = C.tintOf(part);
    _c.setRGB(1, 1, 1); if (base) _c.copy(base);
    _c.multiplyScalar(0.72 + 0.28 * k);
    C.batches.color(part.handle, _c);
  }

  const windSet = new Set();
  function windDamage(x, z, R, speedAt, dt) {
    windSet.clear(); C.query(x, z, R, windSet);
    for (const part of windSet) {
      if (part.fixed) continue;
      const b = part.aabb, cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
      const s = speedAt(cx, cy, cz), D = MATS[part.mat];
      if (s <= D.wind) continue;
      C.reveal(part.bld);
      const over = s - D.wind, dmg = over * over * (0.6 + part.a * 0.15) * dt * 4;
      const dir = _v.set(cx - x, 0, cz - z); const L = dir.length() || 1;
      const J = new THREE.Vector3(-dir.z / L, 0.6, dir.x / L).multiplyScalar(over * 3);
      if (part.state === 'intact') {
        part.hp -= dmg;
        if (part.hp <= 0) {
          _p.set(cx, cy, cz).applyMatrix4(part.Minv);
          S.breakPart(part, [_p.x, _p.y], clamp(over / 30, 0.3, 1), J, D.pattern === 'tiles' || D.pattern === 'sheet' || D.glass);
        } else tintDamage(part);
      } else if (part.state === 'broken') {
        // wiatr odrywa kawałki po kolei
        let any = false;
        for (const c of part.cells) if (c.on && Math.random() < dt * over * 0.05) { c.hp -= dmg * 3; if (c.hp <= 0) { S.detachCell(part, c, J); any = true; } }
        if (any) S.settle(part);
      }
    }
  }

  const colSet = new Set();
  function collide(b) {
    const sp = b.v.length();
    if (sp < 7 || b.m < 0.3 || (b.cool || 0) > C.simT) return;
    colSet.clear(); C.query(b.p.x, b.p.z, b.r, colSet);
    for (const part of colSet) {
      if (b.kind !== 'item' && C.simT - b.born < 0.35) return;   // świeży kawałek leży jeszcze na murze, z którego wypadł
      if (b.p.y < part.aabb[1] - b.r || b.p.y > part.aabb[4] + b.r) continue;
      _p.copy(b.p).applyMatrix4(part.Minv);
      if (Math.abs(_p.z) > part.t / 2 + b.r * 0.55) continue;
      if (!inside(part.poly, _p.x, _p.y, b.r * 0.35)) continue;
      if (part.state === 'broken' && !part.cells.some((c) => c.on && inside(c.poly, _p.x, _p.y, b.r * 0.35))) continue;
      // gruz to luźne kawałki (kruszy się przy uderzeniu) — uderza słabiej niż lity przedmiot
      const J = b.v.clone().multiplyScalar(b.m * (b.thrown ? 0.9 : b.kind === 'frag' ? 0.2 : b.kind === 'part' ? 0.5 : 0.9));
      const before = part.state;
      hit(b.p, J, { radius: clamp(b.r * 1.3, 0.45, 1.6) });
      b.cool = C.simT + 0.12;
      if (part.state !== before || part.state === 'gone') b.v.multiplyScalar(0.65);
      else {
        _n.set(0, 0, 1).transformDirection(part.M); if (_n.dot(b.v) > 0) _n.negate();
        const vn = b.v.dot(_n); b.v.addScaledVector(_n, -1.35 * vn).multiplyScalar(0.55);
        b.p.addScaledVector(_n, 0.05);
      }
      wake(b);
      return;
    }
  }
  return { hit, windDamage, collide };
}

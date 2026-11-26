// Pożary w świecie zniszczeń: palą się tylko materiały palne — części z `burn` w materiale (deski, strop drewniany,
// belki, ramy okien, drzwi, papa), palne przedmioty (gazety, kartony, opony), drewniane odłamki, drzewa i trawa
// (siatka wierzchołków terenu: trawa, zboże; zaorane słabo; droga i plac wcale). Cegła, beton, dachówka, blacha, szkło,
// kamień i metal nie palą się i nie przenoszą ognia.
//   ciepło      płonąca rzecz grzeje palne rzeczy wokół: 0,25 · moc / (0,5 + d²) na sekundę, z wiatrem mocniej;
//               zapłon, gdy ciepło dojdzie do 1; stygnie powoli (0,03/s)
//   palenie     zapas paliwa (czas z materiału i wielkości); w trakcie część czernieje (zwęglenie) i traci
//               wytrzymałość, a gdy paliwo się skończy — rozpada się na zwęglone kawałki (statyka robi resztę: spalony
//               strop zrzuca dach); papier i kartony znikają, opony się wypalają, drzewa zostają czarne
//   trawa       komórka płonie kilka sekund, grzeje sąsiednie (z wiatrem szybciej) i rzeczy nad sobą, potem zostaje
//               wypalona ziemia; ogień trawy rysowany blokami komórek (jedno źródło na blok)
// Wygląd: FireKit (js/render/effects/fire/firekit.js) — źródło ognia na każdą płonącą rzecz i blok trawy.
// createBurning({ world, fire, terrain, forest, wind: [x, z] m/s }) → { ignite(point, r) → ile zapalono, update(dt), stats(), setWind([x, z]) }
import * as THREE from '../../../../vendor/three/three.module.js';
import { MATS } from './materials.js';

// palne przedmioty (id przedmiotu JunkKit → paliwo, czas palenia [s], co zostaje)
export const ITEM_BURN = {
  newspapers: { fuel: 'paper', time: 18, ash: true }, box: { fuel: 'paper', time: 14, ash: true },
  'tire-car': { fuel: 'rubber', time: 90 }, 'tire-bike': { fuel: 'rubber', time: 30 }, 'tire-tractor': { fuel: 'rubber', time: 160 },
};
const TICK = 0.2, COOL = 0.03, BLOCK = 4;

export function createBurning({ world, fire, terrain, forest, wind = [3, 0] }) {
  const G = terrain.grid, N = G.n;
  const gHeat = new Float32Array(N * N), gState = new Uint8Array(N * N), gLeft = new Float32Array(N * N);
  const gBurning = new Set(), blocks = new Map();
  const burning = new Set();          // { kind: 'part' | 'body' | 'tree', ref, left, total, src, fuel }
  const heat = new Map();             // rzecz → ciepło (0…1)
  let W = wind.slice(), acc = 0, burntCells = 0;
  const flam = (p) => MATS[p.mat] && MATS[p.mat].burn;
  const bodyBurn = (b) => b.burnt ? null : b.itemId ? ITEM_BURN[b.itemId] : b.kind === 'frag' && flam(b) ? { fuel: MATS[b.mat].burn.fuel, time: 6 + 10 * Math.min(1, b.size), ash: true } : b.kind === 'tree' ? { fuel: 'wood', time: 40 } : null;
  const isBurning = new WeakSet();
  // kawałki wypalonej części są już spalone (nie zapalają się drugi raz)
  world.onFragment((b) => { if (b.from && b.from.char > 0.85) b.burnt = true; });

  /* ---------------- gdzie i jak duży ogień ---------------- */
  function partShape(p) {
    const b = p.aabb, h = b[4] - b[1];
    return { at: [(b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2], size: [Math.max(0.6, b[3] - b[0]), Math.max(0.6, b[5] - b[2])], height: Math.min(6, h * 0.9 + 0.8) };
  }
  function bodyShape(b) { const s = Math.max(0.3, b.size || 0.5); return { at: [b.p.x, b.p.y - s * 0.3, b.p.z], size: [s, s], height: Math.min(5, 0.6 + s * 1.2) }; }
  function treeShape(t) { return { at: [t.x, t.y + t.h * 0.35, t.z], size: [t.R * 1.2, t.R * 1.2], height: t.h * 0.7 }; }

  /* ---------------- zapłon ---------------- */
  function light(kind, ref, info) {
    if (isBurning.has(ref)) return false;
    let total, shape;
    if (kind === 'part') { const a = ref.a; total = info.time * (Math.sqrt(a) + 1); shape = partShape(ref); }
    else if (kind === 'body') { total = info.time; shape = bodyShape(ref); }
    else { total = info.time; shape = treeShape(ref); }
    const src = fire.add({ ...shape, power: 0.15, fuel: info.fuel });
    const e = { kind, ref, left: total, total, src, fuel: info.fuel, ash: info.ash, age: 0 };
    burning.add(e); isBurning.add(ref); heat.delete(ref);
    if (kind === 'part') world.reveal(ref.bld);
    return true;
  }
  function addHeat(kind, ref, info, dh) {
    if (isBurning.has(ref) || !info) return;
    const h = (heat.get(ref) || 0) + dh;
    if (h >= 1) light(kind, ref, info); else heat.set(ref, h);
  }
  // wiatr: z wiatrem mocniej (cel po stronie, w którą wieje)
  const windK = (dx, dz) => { const d = Math.hypot(dx, dz) || 1, ws = Math.hypot(W[0], W[1]) || 1; return 1 + 0.12 * Math.hypot(W[0], W[1]) * Math.max(0, (dx * W[0] + dz * W[1]) / (d * ws)); };

  /* ---------------- trawa ---------------- */
  function igniteCell(k) { if (k < 0 || gState[k] || G.fuel[k] < 0.05) return false; gState[k] = 1; gLeft[k] = 5 + 5 * G.fuel[k]; gBurning.add(k); return true; }
  function heatCell(k, dh) { if (k < 0 || gState[k] || G.fuel[k] < 0.05) return; gHeat[k] += dh * G.fuel[k]; if (gHeat[k] >= 1) igniteCell(k); }
  function grassTick(dt) {
    const ws = Math.hypot(W[0], W[1]);
    for (const k of [...gBurning]) {
      gLeft[k] -= dt;
      const i = k % N, j = (k / N) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        const d = Math.hypot(di, dj), along = ws > 0.1 ? (di * W[0] + dj * W[1]) / (d * ws) : 0;
        heatCell(jj * N + ii, dt * 0.28 / d * (1 + 0.18 * ws * Math.max(0, along)) * (along < -0.5 ? 0.35 : 1));
      }
      if (gLeft[k] <= 0) { gBurning.delete(k); gState[k] = 2; burntCells++; G.setBurnt(k, 1); }
      else G.setBurnt(k, 0.4 * (1 - gLeft[k] / 10));
    }
    G.flush();
    // źródła ognia trawy: jedno na blok BLOCK × BLOCK komórek
    const seen = new Map();
    for (const k of gBurning) {
      const i = k % N, j = (k / N) | 0, key = ((j / BLOCK) | 0) * 100000 + ((i / BLOCK) | 0);
      let s = seen.get(key); if (!s) seen.set(key, s = { n: 0, x: 0, z: 0 });
      const [x, z] = G.pos(k); s.n++; s.x += x; s.z += z;
    }
    for (const [key, s] of seen) {
      const x = s.x / s.n, z = s.z / s.n, side = Math.sqrt(s.n) * G.step;
      const shape = { at: [x, terrain.heightAt(x, z), z], size: [side, side], height: 0.45 + 0.13 * Math.sqrt(s.n), power: Math.min(1, 0.35 + s.n / 8), fuel: 'grass' };
      const src = blocks.get(key); if (src) src.set(shape); else blocks.set(key, fire.add(shape));
    }
    for (const [key, src] of blocks) if (!seen.has(key)) { src.remove(); blocks.delete(key); }
    // trawa grzeje to, co nad nią stoi (części przy ziemi, przedmioty, drzewa)
    for (const [, s] of seen) {
      const x = s.x / s.n, z = s.z / s.n, r = Math.sqrt(s.n) * G.step * 0.7 + 1.5, P = Math.min(1, s.n / 6);
      heatAround(x, terrain.heightAt(x, z), z, r, P * 0.6, dt, true);
    }
  }

  /* ---------------- ciepło od płonących rzeczy ---------------- */
  const _q = new Set();
  function heatAround(x, y, z, r, P, dt, low = false) {
    _q.clear(); world.query(x, z, r, _q);
    for (const p of _q) {
      const f = flam(p); if (!f) continue;
      const b = p.aabb; if (low && b[1] > y + 2.5) continue;
      const cx = Math.max(b[0], Math.min(x, b[3])), cy = Math.max(b[1], Math.min(y, b[4])), cz = Math.max(b[2], Math.min(z, b[5]));
      const d2 = (cx - x) ** 2 + (cy - y) ** 2 + (cz - z) ** 2;
      addHeat('part', p, f, dt * 0.25 * P / (0.5 + d2) * windK(cx - x, cz - z));
    }
    for (const b of world.bodies) {
      const dx = b.p.x - x, dz = b.p.z - z; if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
      const info = bodyBurn(b); if (!info) continue;
      const d2 = dx * dx + dz * dz + (b.p.y - y) ** 2;
      if (d2 < r * r) addHeat('body', b, info, dt * 0.3 * P / (0.5 + d2) * windK(dx, dz));
    }
    if (forest) for (const t of forest.trees) {
      if (!t.alive || t.burnt) continue;
      const dx = t.x - x, dz = t.z - z; if (Math.abs(dx) > r + t.R || Math.abs(dz) > r + t.R) continue;
      const d = Math.max(0, Math.hypot(dx, dz) - t.R * 0.5);
      addHeat('tree', t, { fuel: 'wood', time: 40 }, dt * 0.2 * P / (0.5 + d * d) * windK(dx, dz));
    }
    // i trawę pod sobą
    if (y - terrain.heightAt(x, z) < 3) {
      const rr = Math.min(r, 4);
      for (let a = -rr; a <= rr; a += G.step) for (let c = -rr; c <= rr; c += G.step) if (a * a + c * c <= rr * rr) heatCell(G.index(x + a, z + c), dt * 0.4 * P);
    }
  }

  function tick(dt) {
    for (const e of [...burning]) {
      e.age += dt; e.left -= dt;
      const f = Math.max(0, e.left / e.total), grow = Math.min(1, e.age / 6);
      const power = grow * Math.min(1, 0.3 + 1.6 * f) ;                          // rozpala się, płonie, przygasa
      let alive = true, x, y, z, r, P;
      if (e.kind === 'part') {
        const p = e.ref;
        if (p.state !== 'intact' && p.state !== 'broken') alive = false;
        else {
          world.setChar(p, 1 - f);
          if (p.state === 'intact') p.hp = Math.min(p.hp, p.hpMax * (0.15 + 0.85 * f));
          const sh = partShape(p); e.src.set({ ...sh, power });
          x = sh.at[0]; y = sh.at[1] + sh.height * 0.4; z = sh.at[2]; r = Math.max(sh.size[0], sh.size[1]) * 0.6 + 2.5; P = power * Math.min(2.5, 0.6 + Math.sqrt(p.a) * 0.4);
          if (e.left <= 0) {
            // wypalone: rozpada się na zwęglone kawałki
            if (p.state === 'intact') world.breakPart(p, [(p.poly[0][0] + p.poly[2][0]) / 2, (p.poly[0][1] + p.poly[2][1]) / 2], 0.35, new THREE.Vector3(0, -50, 0), true);
            else world.drop(p);
            alive = false;
          }
        }
      } else if (e.kind === 'body') {
        const b = e.ref;
        if (!world.bodies.has(b)) alive = false;
        else {
          b.char = 1 - f; const sh = bodyShape(b); e.src.set({ ...sh, power });
          x = b.p.x; y = b.p.y; z = b.p.z; r = 2 + (b.size || 0.5); P = power * Math.min(1.5, 0.4 + (b.size || 0.5));
          if (e.left <= 0) { b.burnt = true; if (e.ash) world.removeBody(b); alive = false; }
        }
      } else {
        const t = e.ref;
        forest.setChar(t, 1 - f);
        const sh = t.alive ? treeShape(t) : null;
        if (sh) e.src.set({ ...sh, power }); else alive = false;
        if (sh) { x = t.x; y = t.y + t.h * 0.4; z = t.z; r = t.R + 4; P = power * 1.5; }
        if (e.left <= 0) { t.burnt = true; alive = false; }
      }
      if (!alive) { e.src.remove(); burning.delete(e); continue; }
      heatAround(x, y, z, r, P, dt);
    }
    // stygnięcie
    for (const [k, h] of heat) { const v = h - COOL * dt; if (v <= 0) heat.delete(k); else heat.set(k, v); }
    grassTick(dt);
  }

  return {
    // podpalenie w punkcie (gracz): trawa w promieniu i najbliższe palne rzeczy w zasięgu r
    ignite(pt, r = 1.6) {
      let n = 0;
      for (let a = -r; a <= r; a += G.step) for (let c = -r; c <= r; c += G.step) if (a * a + c * c <= r * r && igniteCell(G.index(pt.x + a, pt.z + c))) n++;
      _q.clear(); world.query(pt.x, pt.z, r, _q);
      for (const p of _q) {
        const f = flam(p); if (!f) continue;
        const b = p.aabb, cx = Math.max(b[0], Math.min(pt.x, b[3])), cy = Math.max(b[1], Math.min(pt.y, b[4])), cz = Math.max(b[2], Math.min(pt.z, b[5]));
        if (Math.hypot(cx - pt.x, cy - pt.y, cz - pt.z) <= r && light('part', p, f)) n++;
      }
      for (const b of world.bodies) { const info = bodyBurn(b); if (info && b.p.distanceTo(pt) <= r + (b.size || 0) * 0.5 && light('body', b, info)) n++; }
      if (forest) for (const t of forest.trees) if (t.alive && !t.burnt && Math.hypot(t.x - pt.x, t.z - pt.z) <= r + t.R * 0.6 && light('tree', t, { fuel: 'wood', time: 40 })) n++;
      return n;
    },
    update(dt) {
      // źródła na ciałach w ruchu idą za nimi co klatkę (np. płonące rzeczy w wirze trąby)
      for (const e of burning) if (e.kind === 'body' && world.bodies.has(e.ref)) { const sh = bodyShape(e.ref); e.src.at[0] = sh.at[0]; e.src.at[1] = sh.at[1]; e.src.at[2] = sh.at[2]; }
      acc += dt; while (acc >= TICK) { acc -= TICK; tick(TICK); }
    },
    setWind(w) { W = w.slice(); },
    stats() {
      const c = { parts: 0, bodies: 0, trees: 0 };
      for (const e of burning) c[e.kind === 'part' ? 'parts' : e.kind === 'body' ? 'bodies' : 'trees']++;
      return { ...c, grass: gBurning.size, burnt: burntCells, sources: fire.sources.size };
    },
  };
}

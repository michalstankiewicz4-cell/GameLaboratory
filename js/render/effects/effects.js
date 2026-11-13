// EffectKit — efekty z Hive Hunger w jednym miejscu: strzał, kula plazmy, odłamki, błyskawica, piorun łańcuchowy,
// kula cieczy, czarna dziura. Każdy efekt to dane (FX_DEFAULTS: liczby z gry, na klatkę 60 Hz) — laboratorium
// efektów zmienia je suwakami i zapisuje pod nazwą (zasób „effect”, js/scene/assets.js). Kosmos: bez grawitacji.
//
// createEffects(scene, { scale, settings }) → fx
//   scale — metry na jednostkę gry (w Hive Hunger blok = 0.5): wszystko rysuje się w grupie fx.root o tej skali,
//           położenia podaje się w metrach sceny
//   settings — { shot, orb, debris, bolt, zap, bubble, hole } nadpisanie liczb (np. z zasobu „effect”)
// fx.play(kind, opts) — jeden efekt: { from, to } (shot, orb, bubble), { at, dir?, color?, n? } (debris),
//   { path: [[x,y,z], …] } (bolt, zap), { at } (hole); punkty jako [x, y, z] albo Vector3; zwraca true
// fx.step(camera) — jedna klatka gry (1/60 s; wołać stałym krokiem), fx.render(renderer, scene, camera, draw) —
//   obraz z soczewkami czarnych dziur i kul cieczy (draw(target) — rysowanie sceny, np. LookPipeline)
// fx.set(kind, values), fx.counts(), fx.clear(), fx.dispose()
import * as THREE from '../../../vendor/three/three.module.js';
import { Shots } from './shots.js';
import { Orbs } from './orbs.js';
import { Debris3D } from './debris.js';
import { Lightning3D } from './lightning.js';
import { Zaps } from './zaps.js';
import { Bubbles } from './bubbles.js';
import { BlackHoles } from './black-holes.js';

export const STEP = 1 / 60;
const VOXEL = 0.5;   // blok Hive Hunger: rozmiary efektów są w tych jednostkach

// liczby z Hive Hunger (js/config.js: swarm.sniper, swarm.orb, debris, Swarm3D storm, swarm.support, swarm.splasher, holes)
export const FX_DEFAULTS = {
  shot: { speed: 0.05, accel: 1.05, shotSize: [0.07, 0.07, 0.5], shotColor: 0xeaffff, shockRadius: 0.14, shockLength: 0.45, shockColor: 0xff9a3c, shockCore: 0xfff4d8, wake: 0.6, flashFrames: 10, flashSize: 1.6 },
  orb: { speed: 0.045, color: 0xff3ed8, glowColor: 0xff5ae6, glowSize: 3.2, pulse: 0.25, flashFrames: 14, flashSize: 6, tailPerFrame: 3, tailFrames: 22, tailSize: 1.6, tailJitter: 0.12, tailMax: 4000 },
  debris: { max: 4000, minSpeed: 0.06, maxSpeed: 0.28, jitter: 0.18, friction: 0.98, fade: 0.012, size: 0.28, n: 120, color: 0x8a7d70 },
  bolt: { life: 20, jag: 0.35, pieces: 5, glowPx: 2, color: 0x6fbaff },
  zap: { color: 0xffffff, glowColor: 0xdfe8ff, life: 90, fadeOut: 25, points: 24, bend: 0.09, jag: 0.025, glowPx: 4, branchGlowPx: 2, branches: 3, branchLength: 1.6, branchBrightness: 0.6, flowWaves: 3, flowSpeed: 0.05 },
  bubble: { speed: 0.07, size: 1.5, wobble: 0.08 },
  hole: { grow: 60, hold: 120, shrink: 60, size: 2.2, range: 7.5, core: 0.9, pullDebris: 0.004, pullPieces: 0.0015, maxPieceSpeed: 0.05, ringColor: 0xc9a0ff },
};
export const FX_KINDS = {
  shot: { label: 'Shot', labelPl: 'Strzał', needs: 'from, to' },
  orb: { label: 'Plasma orb', labelPl: 'Kula plazmy', needs: 'from, to' },
  debris: { label: 'Debris', labelPl: 'Odłamki', needs: 'at' },
  bolt: { label: 'Lightning', labelPl: 'Błyskawica', needs: 'path' },
  zap: { label: 'Chain lightning', labelPl: 'Piorun łańcuchowy', needs: 'path' },
  bubble: { label: 'Liquid bubble', labelPl: 'Kula cieczy', needs: 'from, to' },
  hole: { label: 'Black hole', labelPl: 'Czarna dziura', needs: 'at' },
};
const clone = (o) => JSON.parse(JSON.stringify(o));

export function createEffects(scene, { scale = 1, settings = {} } = {}) {
  const root = new THREE.Group(); root.name = 'effects'; root.scale.setScalar(scale); scene.add(root);
  const S = clone(FX_DEFAULTS); for (const k of Object.keys(S)) Object.assign(S[k], settings[k] || {});
  let fx = null;
  const v = (p) => (p && p.isVector3 ? p.clone() : new THREE.Vector3(...(p || [0, 0, 0]))).divideScalar(scale);   // metry sceny → jednostki efektów
  function make() {
    if (fx) drop();
    fx = {
      shot: new Shots(root, S.shot, VOXEL), orb: new Orbs(root, S.orb, VOXEL), debris: new Debris3D(root, S.debris),
      bolt: new Lightning3D(root, S.bolt), zap: new Zaps(root, S.zap), bubble: new Bubbles(S.bubble), hole: new BlackHoles(S.hole),
    };
  }
  function drop() {
    fx.shot.clear(); fx.orb.clear(); fx.bolt.clear(); fx.zap.clear(); fx.bubble.clear(); fx.hole.clear();
    root.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach((x) => x.dispose()); });
    root.clear();
  }
  make();
  const rgb = (c) => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
  // piorun łańcuchowy skacze między „statkami roju”: tu — punkty ścieżki jako ich położenia
  const chain = (pts) => ({ pos: Float32Array.from(pts.flatMap((p) => v(p).toArray())), count: pts.length });

  const api = {
    root, get settings() { return clone(S); },
    get lensing() { return fx.hole.holes.length > 0 || fx.bubble.list.length > 0; },   // soczewki: obraz przez render()
    play(kind, o = {}) {
      switch (kind) {
        case 'shot': case 'orb': case 'bubble': fx[kind].fire(v(o.from), v(o.to)); return true;
        case 'debris': { const at = v(o.at); fx.debris.emit(at, rgb(o.color != null ? o.color : S.debris.color), Math.round(o.n || S.debris.n), o.dir ? v(o.dir) : at.lengthSq() ? at : new THREE.Vector3(0, 1, 0)); return true; }
        case 'bolt': { const p = (o.path || []).flatMap((q) => v(q).toArray()); if (p.length < 6) return false; fx.bolt.show(p, o.color != null ? o.color : S.bolt.color, o.strength || 1); return true; }
        case 'zap': { const pts = o.path || []; if (pts.length < 2) return false; fx.zap.add(chain(pts), pts.map((_, i) => i), (Math.random() * 1e9) | 0); return true; }
        case 'hole': fx.hole.add(v(o.at)); return true;
        default: throw new Error(`unknown effect "${kind}" (${Object.keys(FX_KINDS).join(', ')})`);
      }
    },
    step(camera) {
      fx.shot.update(); fx.orb.update(); fx.bubble.update((b) => fx.debris.emit(b.pos.clone(), [0.55, 0.8, 1], 10));   // rozbryzg u celu (splashColor, splash z gry)
      fx.hole.update(fx.debris); fx.debris.update(); fx.bolt.update(camera); fx.zap.update(camera);
    },
    // soczewki (czarne dziury, kule cieczy) potrzebują obrazu sceny: rysują ją do celu i zaginają; bez nich — zwykły obraz
    render(renderer, sc, camera, draw) {
      const lenses = fx.bubble.lenses().map((l) => ({ ...l, pos: l.pos.clone().multiplyScalar(scale), radius: l.radius * scale }));
      const H = fx.hole, keep = H.holes.map((h) => h.pos.clone()), size = H.cfg.size;
      H.holes.forEach((h) => h.pos.multiplyScalar(scale)); H.cfg.size = size * scale;
      try { H.render(renderer, sc, camera, lenses, null, draw); } finally { H.holes.forEach((h, i) => h.pos.copy(keep[i])); H.cfg.size = size; }
    },
    set(kind, values) { Object.assign(S[kind], values); make(); },
    counts: () => ({ shot: fx.shot.list.length, orb: fx.orb.list.length, debris: fx.debris.count, bolt: fx.bolt.bolts.length, zap: fx.zap.list.length, bubble: fx.bubble.list.length, hole: fx.hole.holes.length }),
    clear() { make(); },
    dispose() { drop(); scene.remove(root); },
  };
  return api;
}

// Właściwości przedmiotów złomowiska (z gry Złomowisko, js/items/catalog.js i js/items/items.js — z historią): to, co
// fizyczne — metal (temperatura topnienia, gęstość: piec indukcyjny), palenie (czas w piecu na papier), zgniatanie do
// innego modelu (puszka → puszka zgnieciona), sztabka, guma (tarcie opon). Ceny skupu zostają w grze (ekonomia gry).
// Bryła przedmiotu w świecie przedmiotów (js/behaviors/land/items.js) — prostopadłościan z półwymiarów zderzacza gry
// (halfExtents, jak zgniatarki w grze), kształt — walec dla opon, beczek, puszek i garnków (shapeOf).
//
// itemKit() → kit (moduły przedmiotów załadowane): kit.spawn(W, kind, { at, q, variant, scale, mass, parent }) — model
// i bryła, kit.replace(W, it, kind, osWGórę) — zamiana rodzaju w tym samym miejscu, kit.glow(W) — żarzenie (it.heat).
import * as THREE from '../../../vendor/three/three.module.js';
import { MODELS } from './registry.js';

// metal: rodzaj stopu do pieca indukcyjnego (temperatura topnienia °C, gęstość kg/m³); burn: pali się w piecu na papier [s]
export const METALS = { aluminium: { melt: 660, density: 2700 }, steel: { melt: 1450, density: 7850 } };
export const KINDS = {
  'tire-car': { rubber: true },
  'tire-bike': { rubber: true },
  'tire-tractor': { rubber: true },
  can: { metal: 'aluminium', crushTo: 'can-crushed' },
  'can-crushed': { metal: 'aluminium' },
  pot: { metal: 'steel' },
  newspapers: { burn: 40 },
  box: { burn: 18 },
  barrel: { metal: 'steel' },
  ingot: { ingot: true },
  'ingot-small': { ingot: true },
};
export const propsOf = (kind) => KINDS[kind] || {};
/** Metal przedmiotu (do pieca indukcyjnego) i jego temperatura topnienia. */
export function metalOf(kind) { const m = propsOf(kind).metal; return m ? { id: m, ...METALS[m] } : null; }

/** Półwymiary przedmiotu w jego układzie ze zderzacza gry (info.collider) i skali. */
export function halfExtents(info, s = [1, 1, 1]) {
  const c = info.collider;
  let h;
  if (c.type === 'ring') h = [c.rOut, c.h / 2, c.rOut];
  else if (c.type === 'cyl' || c.type === 'cup') h = [c.r, c.h / 2, c.r];
  else if (c.type === 'box') h = c.size.map((x) => x / 2);
  else { const p = c.hulls[0]; h = [0, 0, 0]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) h[k] = Math.max(h[k], Math.abs(p[i + k])); }
  return [h[0] * s[0], h[1] * s[1], h[2] * s[2]];
}

/** Kształt bryły przedmiotu w świecie przedmiotów: walec (oś y) z zderzacza gry ring / cyl / cup, inaczej prostopadłościan. */
export function shapeOf(info) {
  const c = info.collider;
  if (c.type === 'ring') return { type: 'cyl', hollow: c.rIn / c.rOut };
  if (c.type === 'cyl' || c.type === 'cup') return { type: 'cyl' };
  return { type: 'box' };
}

let texP = null;
const textures = () => { if (typeof document === 'undefined') return; (texP || (texP = import('./textures.js'))).then((t) => t.applyTextures()); };

export async function itemKit() {
  const mods = {};
  for (const m of MODELS.filter((e) => e.group === 'items')) mods[m.id] = await m.load();
  const glowing = new Set();
  const kit = {
    mods,
    info: (kind) => mods[kind].info,
    /** Nowy przedmiot: model (LOD 0) w grupie-uchwycie w `parent` i bryła w świecie W. at: [x, y | null, z] — środek. */
    spawn(W, kind, { at, q = null, variant = 0, scale = [1, 1, 1], mass = null, parent = null, lod = 0 } = {}) {
      const mod = mods[kind], info = mod.info, v = variant % (info.variants || 1);
      const model = mod.build(lod, v), holder = new THREE.Group(); holder.name = kind; holder.add(model);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      if (q) holder.quaternion.copy(q);
      if (parent) parent.add(holder);
      textures();
      const it = W.add({ mesh: holder, mass: mass ?? info.mass, half: halfExtents(info), shape: shapeOf(info), kind, name: kind, variant: v, at, q, rubber: !!propsOf(kind).rubber });
      it.spawned = true;
      if (scale.some((x) => x !== 1)) W.setScale(it, scale);
      return it;
    },
    /** Zamiana rodzaju (np. cała puszka → zgnieciona) w tym samym miejscu; oś Y nowego modelu wzdłuż `axisUp` (świat). */
    replace(W, it, kind, axisUp = null) {
      const q = axisUp ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axisUp) : it.q.clone();
      const parent = it.mesh ? it.mesh.parent : null, p = it.p.clone(), v = it.v.clone();
      W.remove(it);
      const n = kit.spawn(W, kind, { at: p.toArray(), q, variant: it.variant, mass: it.mass, parent });
      n.v.copy(v); return n;
    },
    /** Żarzenie metalu (it.heat 0…1): emisja barwy rozgrzanego metalu, jak w grze (materiały kopiowane przy pierwszym żarze). */
    glow(W) {
      for (const it of W.list) if (it.heat > 0.001 || glowing.has(it)) {
        if (!it.mesh) continue;
        if (!it.glowMats) {
          it.glowMats = [];
          it.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); it.glowMats.push({ m: o.material, e: o.material.emissive.clone(), c: o.material.color.clone() }); } });
        }
        const h = Math.max(0, Math.min(1, it.heat || 0));
        hot(h, tmpC).multiplyScalar(4 * h);
        for (const g of it.glowMats) { g.m.emissive.copy(g.e).add(tmpC); g.m.color.copy(g.c).multiplyScalar(1 - h * 0.6); }
        if (h > 0.001) glowing.add(it); else glowing.delete(it);
      }
      for (const it of glowing) if (it.removed) glowing.delete(it);
    },
  };
  return kit;
}
// barwa rozgrzanego metalu (gra: shader instancji — od wiśniowej przez pomarańczową do jasnożółtej)
const tmpC = new THREE.Color(), cA = new THREE.Color(0.6, 0.02, 0), cB = new THREE.Color(1, 0.35, 0.05), cC = new THREE.Color(1, 0.85, 0.55);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hot(h, out) { out.copy(cA).lerp(cB, sstep(0, 0.5, h)).lerp(cC, sstep(0.5, 1, h)); return out; }

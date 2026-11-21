// Roślinność krajobrazu: lasy, zagajniki, oazy, zarośla i trawa na terenie z RegionKit/LandKit — gatunek z biomu
// (północny, równiny, pustynia), miejsce z gruntu (woda, wysokość, nachylenie). Reguły z laboratorium roślin (widok
// Krajobraz); rysuje ForestKit (pełne modele blisko kamery, impostory dalej, trawa wokół kamery).
//
// VEG_DEFAULTS — ustawienia (zasób „vegetation” z laboratorium roślin): density — gęstość drzew (0.05…2), grass —
//   gęstość trawy (0…1), grassR — promień trawy wokół kamery [m], lod — odległość pełnych modeli [m], impostors,
//   season (0 lato … 1 jesień), seed — rozmieszczenie, radius — promień lasu wokół kamery [m] (kafelki 256 m)
// scatterArea(T, x0, z0, x1, z1, { density }, seed) → [{ id, x, y, z, yaw, s, v }] — rośliny w prostokącie mapy
// createVegetation(renderer, scene) → { set(land, def) — land: { T, uniforms, btex } (teren sceny) albo null,
//   update(camera, dt), light(sun, hemi, fog, env), fog(gęstość), wind(m/s, kierunek° — dokąd wieje: 0° +z, 90° +x;
//   siła PlantKit 0…1,5 — pełna przy 24 m/s), visible, counts, dispose() }
import * as THREE from '../../../vendor/three/three.module.js';
import { sampleHeight, fbm } from '../../envs/land/landkit.js';
import { biomeAt } from '../../envs/land/regionkit.js';
import { windUniforms } from './plantkit.js';
import { Forest, grassField, plantLight } from './forestkit.js';

export const VEG_DEFAULTS = { density: 1, grass: 0.8, grassR: 45, lod: 110, impostors: true, season: 0, seed: 7, radius: 1200 };
const TILE = 256;

// odległość do wody (oazy, brzegi jezior): siatka 96 × 96 na mapę, liczona raz na teren
const WATER = new WeakMap();
function waterGrid(T) {
  if (WATER.has(T)) return WATER.get(T);
  const G = 96, cellG = T.size / G, wd = new Float32Array(G * G).fill(1e9), q = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) if (sampleHeight(T, (i + 0.5) * cellG, (j + 0.5) * cellG) < 0) { wd[j * G + i] = 0; q.push(j * G + i); }
  for (let qi = 0; qi < q.length; qi++) {
    const p = q[qi], pi = p % G, pj = (p / G) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = pi + a, z = pj + b; if (x < 0 || z < 0 || x >= G || z >= G) continue;
      const k = z * G + x; if (wd[k] > wd[p] + cellG) { wd[k] = wd[p] + cellG; q.push(k); }
    }
  }
  const at = (x, z) => wd[Math.min(G - 1, Math.max(0, Math.floor(z / cellG))) * G + Math.min(G - 1, Math.max(0, Math.floor(x / cellG)))];
  WATER.set(T, at); return at;
}

// Gdzie stoi każda roślina: siatka z rozrzutem; biom wybiera gatunki, grunt decyduje (woda, wysokość, nachylenie)
export function scatterArea(T, x0, z0, x1, z1, { density = 1 } = {}, seed = 1) {
  const out = [], size = T.size, rel = (h) => h / Math.max(1, T.relief);
  let s = seed >>> 0; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const water = waterGrid(T);
  const step = 7 / Math.sqrt(Math.max(0.05, density));
  const pick = (tab) => { let t = r() * tab.reduce((a, b) => a + b[1], 0); for (const [id, w] of tab) { t -= w; if (t <= 0) return id; } return tab[0][0]; };
  const wrap = (v) => (T.wrap ? ((v % size) + size) % size : v);
  for (let z = z0; z < z1; z += step) for (let x = x0; x < x1; x += step) {
    const px = x + (r() - 0.5) * step * 0.9, pz = z + (r() - 0.5) * step * 0.9, mx = wrap(px), mz = wrap(pz);
    if (!T.wrap && (mx < 0 || mz < 0 || mx >= size || mz >= size)) continue;
    const h = sampleHeight(T, mx, mz);
    if (h < 0.6) continue;
    const e = 3, sl = Math.hypot(sampleHeight(T, wrap(mx + e), mz) - h, sampleHeight(T, mx, wrap(mz + e)) - h) / e;
    if (sl > 0.7) continue;
    const b = biomeAt(T, mx, mz), u = mx / size, v = mz / size, dw = water(mx, mz);
    const forestN = fbm(u, v, 6, 4, 0.5, seed) + 0.3 * fbm(u, v, 18, 3, 0.5, seed + 1);
    let id = null;
    const roll = r();
    if (roll < b.temperate) {                                            // północ: lasy świerkowe i sosnowe, brzozy na skrajach, jałowiec na wrzosowisku
      if (rel(h) > 0.55 || sl > 0.55) continue;
      if (forestN > 0.0) id = pick([['spruce', 0.55 - rel(h) * 0.4], ['pine', 0.3 + rel(h) * 0.4 + (sl > 0.3 ? 0.3 : 0)], ['birch', forestN < 0.12 ? 0.35 : 0.1]]);
      else if (r() < 0.12) id = pick([['birch', 0.5], ['juniper', 0.8], ['pine', 0.2]]);
    } else if (roll < b.temperate + b.plains) {                         // równiny: zagajniki dębów i brzóz, samotne dęby w polach, brzozy nad wodą
      if (forestN > 0.18) id = pick([['oak', 0.5], ['birch', 0.3], ['pine', 0.2]]);
      else if (dw < 60 && r() < 0.3) id = 'birch';
      else if (r() < 0.02) id = 'oak';
      else if (r() < 0.02) id = 'juniper';
    } else {                                                            // pustynia: palmy w oazach przy wodzie, akacje tu i tam, zarośla łobody
      if (dw < 110 && h < 8) { if (r() < 0.3) id = 'palm'; }
      else if (r() < 0.03 && sl < 0.3) id = 'acacia';
      else if (r() < 0.12 && sl < 0.4) id = 'saltbush';
    }
    if (!id) continue;
    out.push({ id, x: px, y: h - 0.05, z: pz, yaw: r() * 6.283, s: 0.75 + r() * 0.45, v: Math.floor(r() * 3) });
  }
  return out;
}
// ziarno kafelka: to samo ziarno i kafelek — te same rośliny
const tileSeed = (seed, i, j) => ((Math.imul(seed | 0, 73856093) ^ Math.imul(i | 0, 19349663) ^ Math.imul(j | 0, 83492791)) >>> 0) || 1;

export function createVegetation(renderer, scene) {
  const wind = windUniforms(), light = plantLight();
  const group = new THREE.Group(); group.name = 'vegetation'; scene.add(group);
  let land = null, def = null, forest = null, grass = null, tiles = new Map(), keyNow = '', sortT = 0, time = 0;
  const counts = () => ({ plants: forest ? forest.list.length : 0, near: forest ? forest.counts.near : 0, far: forest ? forest.counts.far : 0, tiles: tiles.size, grass: grass ? grass.userData.tufts : 0 });
  function clear() {
    if (forest) { forest.dispose(); forest = null; }
    if (grass) { group.remove(grass); grass.geometry.dispose(); grass.material.dispose(); grass = null; }
    tiles.clear(); keyNow = '';
  }
  // kafelki w promieniu wokół kamery; zmiana zestawu — nowa lista lasu
  function refreshTiles(camera) {
    const R = def.radius, cx = camera.position.x, cz = camera.position.z;
    const i0 = Math.floor((cx - R) / TILE), i1 = Math.floor((cx + R) / TILE), j0 = Math.floor((cz - R) / TILE), j1 = Math.floor((cz + R) / TILE);
    const want = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = Math.max(0, Math.abs(cx - (i + 0.5) * TILE) - TILE / 2), dz = Math.max(0, Math.abs(cz - (j + 0.5) * TILE) - TILE / 2);
      if (dx * dx + dz * dz <= R * R) want.push(i + ',' + j);
    }
    const key = want.join(';'); if (key === keyNow) return false;
    keyNow = key;
    const next = new Map();
    for (const k of want) {
      if (tiles.has(k)) { next.set(k, tiles.get(k)); continue; }
      const [i, j] = k.split(',').map(Number);
      next.set(k, scatterArea(land.T, i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE, def, tileSeed(def.seed, i, j)));
    }
    tiles = next;
    forest.set([].concat(...tiles.values()));
    return true;
  }
  return {
    group, wind: (mps = 6, dirDeg = 225) => { wind.uWind.value = Math.min(1.5, Math.max(0, mps / 16)); const a = dirDeg * Math.PI / 180; wind.uWindDir.value.set(Math.sin(a), Math.cos(a)); },
    get counts() { return counts(); },
    get def() { return def; },
    // teren sceny i ustawienia; null — bez roślin
    set(l, d) {
      const nd = d ? { ...VEG_DEFAULTS, ...d } : null;
      const same = l && land && l.T === land.T && JSON.stringify(nd) === JSON.stringify(def);
      if (same) return;
      clear(); land = l; def = nd;
      if (!land || !def) return;
      wind.uSeason.value = def.season;
      forest = new Forest(renderer, group, { wind, light });
      forest.nearDist = def.lod; forest.impostors = def.impostors;
      if (def.grass > 0.01) { grass = grassField(land.uniforms, land.btex, wind, light, { R: def.grassR, spacing: 0.6 / Math.sqrt(Math.max(0.05, def.grass)), relief: land.T.relief }); group.add(grass); }
    },
    update(camera, dt = 0) {
      time += dt; wind.uTime.value = time;
      if (!forest) return;
      if ((sortT -= dt) <= 0) { sortT = 0.25; refreshTiles(camera); forest.update(camera); }
    },
    // światło roślin z tego samego słońca, nieba i mgły co scena (jak w laboratorium roślin: ÷ π jak światła three)
    light(sun, hemi, fog, env = 0.8) {
      light.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
      light.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
      light.uSkyCol.value.copy(hemi.color).multiplyScalar(hemi.intensity / Math.PI + env * 0.9);
      light.uGroundCol.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity / Math.PI + env * 0.45);
      if (fog) { light.uFogCol.value.copy(fog.color); light.uFogDen.value = fog.density; }
    },
    fog(d) { light.uFogDen.value = d; },
    set visible(b) { group.visible = b; },
    dispose() { clear(); scene.remove(group); },
  };
}

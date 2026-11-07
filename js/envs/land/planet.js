// Ląd z planety: płaski wycinek gruntu planety BodyKit jako teren środowiska „ląd” — drugie źródło terenu obok
// generatora LandKit (docs/guides/lab-breakdown.md, punkt 6). Wysokości, morza i lód liczy shader planety
// (BodyKit.planetTerrain, ten sam, co globus i grunt laboratorium powierzchni), skala jak w SurfaceKit: planeta
// o wielkości 1 (promień Ziemi) ma na gruncie 8 km promienia, góry — mountains × R metrów.
// Wycinek: kwadrat map.size × map.size wokół środka ściany +Z sześcianu planety (równik). Mapa nie jest zawinięta
// (brzeg: map.barrier). Potrzebuje window.BodyKit (js/scene/space.js loadSpace()).
//
//   PLANET_GROUPS                    grupy BodyKit z gruntem (planety, księżyce)
//   PLANETS                          [{ ref: 'grupa/ciało', label, airless }] — planety i księżyce z gruntem
//   planetAirless(ref)               bez atmosfery (niebo kosmosu nad gruntem)
//   świat z planety ma T.atmo { airless, density, hue } — scena bazowa barwi nim niebo (js/labs/shared/stage.js)
//   planetBiome(ref)                 biom RegionKit, który najlepiej pasuje do grupy planety
//   worldFor(renderer, map, water)   świat RegionKit: z planety (map.planet = 'grupa/ciało') albo z generatora
import { generateWorld } from './regionkit.js';

export const PLANET_GROUPS = ['earthlike', 'icy', 'desert', 'clouded', 'lava', 'moons', 'airless'];
const M_PER_SIZE = 8000, DETAIL_WAVE = 140;   // jak w SurfaceKit (js/envs/land/surfacekit/surfacekit.js)

// planety i księżyce z gruntem (BodyKit.GROUPS, grupy PLANET_GROUPS) — lista bez ładowania kitu
export const PLANETS = [['lava/cinder', 'Cinder'], ['lava/magma', 'Magma'], ['earthlike/terra', 'Terra-1'], ['earthlike/pelagia', 'Pelagia'],
  ['icy/rime', 'Rime'], ['icy/glacies', 'Glacies'], ['desert/mars', 'Mars'], ['clouded/venus', 'Venus'], ['moons/luna', 'Luna', true], ['airless/mercury', 'Mercury', true]]
  .map(([ref, label, airless]) => ({ ref, label, airless: !!airless }));   // airless: bez atmosfery — niebo kosmosu
export const planetAirless = (ref) => !!(PLANETS.find((p) => p.ref === ref) || {}).airless;
export const planetBiome = (ref) => (/^(earthlike|icy)\//.test(ref || '') ? 'temperate' : 'desert');

// barwa skały planety [r, g, b, ile] dla gruntu LandKit (uGround): bez atmosfery — szary regolit, rdza — czerwonobrązowa,
// lawa — ciemny bazalt; Ziemia i planety lodowe — bez zmian (ziemskie biomy)
function groundOf(ref, v) {
  if ((v.airless || 0) >= 0.5 || /^(moons|airless)\//.test(ref)) return [0.5, 0.49, 0.47, 1];
  if ((v.lava || 0) >= 0.5) return [0.23, 0.2, 0.19, 0.9];
  if ((v.rust || 0) >= 0.3) return [0.66, 0.4, 0.26, 0.75];
  return null;
}
// wysokości wycinka planety [m] (pod morzem ujemne), maska lodu; null — ciało bez gruntu albo brak BodyKit
function planetHeights(renderer, ref, values, size, res) {
  const BK = window.BodyKit, THREE = window.THREE; if (!BK || !THREE) throw new Error('BodyKit is not loaded (js/scene/space.js loadSpace())');
  const [gid, bid] = ref.split('/'), terrain = BK.planetTerrain(gid, bid, values);
  if (!terrain) return null;
  const v = terrain.values, R = Math.max(0.15, v.size) * M_PER_SIZE, reliefM = v.mountains * R;
  const detailM = 2.5 + 4 * Math.max(v.airless || 0, v.rust || 0, v.lava || 0);
  const seaWorld = v.sea > -0.599 && !(v.airless >= 0.5);
  const cell = size / res, step = (cell / R) / (Math.PI / 4);   // przy środku ściany kąt ≈ uv · π/4
  const face = { axis: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) };
  const s = terrain.sample(renderer, face, -step * res / 2, -step * res / 2, step, res, R / DETAIL_WAVE);
  const h = new Float32Array(res * res);
  for (let k = 0; k < h.length; k++) {
    const up = (s.h[k] - v.sea) * reliefM;
    // ląd: wysokość nad morzem i drobna szorstkość; morze (świat z morzem): głębokość (ujemna), najwyżej 0,5 m pod
    // powierzchnią; świat bez morza: sam grunt (najniżej 0,5 m nad zerem)
    h[k] = seaWorld && s.sea[k] ? Math.min(-0.5, up) : Math.max(0.5, up + s.d[k] * detailM);
  }
  // grawitacja z wielkości (gęstość jak Ziemi: g ∝ R), gęstość powietrza z atmosfery (Ziemia: atmosphere 0,6 → 1,225 kg/m³)
  const airless = (v.airless || 0) >= 0.5 || (v.atmosphere || 0) < 0.02;
  return { h, ice: s.ice, R, gravity: 9.81 * R / M_PER_SIZE, air: airless ? 0 : 1.225 * (v.atmosphere || 0) / 0.6, noSea: !seaWorld, lavaSea: seaWorld && (v.lava || 0) >= 0.5, ground: groundOf(ref, v), atmo: { airless: (v.airless || 0) >= 0.5 || (v.atmosphere || 0) < 0.02, density: v.atmosphere || 0, hue: v.atmoHue ?? 205 } };
}

export function worldFor(renderer, map = {}, water = {}) {
  if (!map.planet) return generateWorld(map, water);
  const size = map.size || 4000, res = map.res || 512;
  const p = planetHeights(renderer, map.planet, map.planetValues, size, res);
  if (!p) throw new Error(`"${map.planet}" has no ground (a planet or a moon: ${PLANET_GROUPS.join(', ')})`);
  let hi = 0, lo = 0; for (const y of p.h) { if (y > hi) hi = y; if (y < lo) lo = y; }
  // wysokość szczytów i głębokość morza z planety (barwy gruntu: śnieg na szczytach, skała; brzeg mapy)
  return generateWorld({ ...map, size, res, relief: Math.max(50, hi), depth: Math.max(8, -lo), heights: p, atmo: p.atmo, gravity: p.gravity, air: p.air, noSea: p.noSea, lavaSea: p.lavaSea, ground: p.ground }, { ...water, layout: 'planet', biome: planetBiome(map.planet) });
}

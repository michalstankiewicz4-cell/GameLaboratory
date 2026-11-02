// The vehicle lab's land page (vehicles.html): the ground "from the land lab". Builds the land lab's world from what the
// land lab saved in this browser (gameLab.land.v1: the map, the water layout, the weather; its defaults if nothing is
// saved) — LandKit terrain with its biomes, and the WaterKit sea mixed by region, sharing the land's uniforms, as in
// js/labs/land/land.js. The page asks for it through window.LandLabWorld(); what comes back:
//   group                  the terrain and the sea, to add to the scene
//   heightAt(x, z)         the ground's height (negative under water), world metres
//   waterAt(x, z, t)       the sea's height (its waves) at a point
//   start                  [x, z]: a spot on land by the water, near the middle of the map
//   sky                    { fog, sunDir, sunColor, sunIntensity, ambient, sky, ground } from the land lab's weather
//   update(t, camera)      each frame: the terrain's rings and the sea follow the camera
//   dispose()
// window.LandLabWorld(step) is async: step(name, fraction) is the loading card's (ui/shell/loader.js LabLoad.run).
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, GLSL_SKY, applySky } from '../../envs/sky/skykit.js';
import { waveSet, heightAt as waveHeight, waterUniforms, setWaves, polarGrid, waterMaterial, LOOKS } from '../../envs/water/waterkit.js';
import { heightTexture, terrainMeshes, sampleHeight, TERRAIN_DEFAULTS, GLSL_LAND } from '../../envs/land/landkit.js';
import { generateWorld, regionTextures, regionUniforms, GLSL_REGIONS, WORLD_DEFAULTS, biomeTexture } from '../../envs/land/regionkit.js';

async function landLabWorld(step = async () => {}) {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('gameLab.land.v1') || 'null'); } catch { saved = null; }
  const map = { ...TERRAIN_DEFAULTS, ...(saved && saved.map) }, water = { ...WORLD_DEFAULTS, ...(saved && saved.water) };
  const skyS = { weather: 'fair', sunEl: 24, sunAz: 210, ...(saved && saved.sky) };
  await step('Heightmap, rivers and water regions', 0.05);
  const T = generateWorld(map, water);
  await step('Terrain, regions and biomes', 0.65);
  const tex = heightTexture(T), rtex = regionTextures(T), btex = biomeTexture(T);
  const terrain = terrainMeshes(T, tex, { biome: btex });
  const group = new THREE.Group(); group.add(terrain.group);

  await step('The sea and the weather', 0.82);
  // the sea, as in the land lab: the land's uniforms (shallows, surf), the regions (looks, ice, oil), the sky's colours
  const skyU = skyUniforms();
  const WU = Object.assign(waterUniforms(), skyU, terrain.uniforms, regionUniforms(rtex));
  const sea = new THREE.Mesh(polarGrid(192, 160, 0.6, 16000), waterMaterial(WU, { sky: '#define SKY_NO_STARS\n' + GLSL_SKY, land: GLSL_LAND, regions: GLSL_REGIONS }));
  sea.frustumCulled = false; sea.renderOrder = 1; group.add(sea);
  WU.uShipFx.value.set(0, 0, 0, 0); WU.uWetOn.value = 0;
  const sh = T.regions.share; WU.uIce.value.set(sh.ice > 0.001 ? 1 : 0, 18, 0.35, 0); WU.uOil.value = sh.harbour > 0.001 ? 1 : 0;
  const w = WEATHER[skyS.weather] || WEATHER.fair;
  // the waves from the weather's wind, repeating across the map (land.js seaFor)
  const U = Math.max(2, w.wind ?? 6), Hs = Math.min(5, 0.0246 * U * U), Lp = Math.min(160, Math.max(12, 0.83 * U * U));
  const waves = waveSet({ Hs, Lp, chop: 0.45, spread: 35, n: 12 }, 230, 7), K = 2 * Math.PI / T.size;
  for (const wv of waves) {
    let kx = Math.round(wv.k * wv.dx / K) * K, kz = Math.round(wv.k * wv.dz / K) * K;
    if (kx === 0 && kz === 0) kz = K;
    wv.k = Math.hypot(kx, kz); wv.dx = kx / wv.k; wv.dz = kz / wv.k; wv.w = Math.sqrt(9.81 * wv.k); wv.L = 2 * Math.PI / wv.k;
  }
  setWaves(WU, waves);
  const lk = LOOKS.atlantic; WU.uDeep.value.set(lk.deep); WU.uScatter.value.set(lk.scatter); WU.uShine.value = lk.shine * 1.8; WU.uRipples.value = lk.ripples; WU.uCrest.value = Math.min(1, lk.crest + U * 0.012);
  // the land lab's light (land.js updateSky)
  const L = applySky(skyU, { ...w, sunEl: skyS.sunEl, sunAz: skyS.sunAz, moon: 0.8 });
  WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar;
  WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen);
  WU.uLight.value = 0.03 + 0.97 * L.day;

  await step('A place to start, by the water', 0.92);
  // where to start: land 0.5–6 m above the sea, by the water, nearest the middle (a spiral search)
  const heightAt = (x, z) => sampleHeight(T, x, z);
  let start = [T.size / 2, T.size / 2];
  search: for (let r = 0, step = T.cell * 2; r < T.size * 0.7; r += step) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / step));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, x = T.size / 2 + Math.cos(a) * r, z = T.size / 2 + Math.sin(a) * r, h = heightAt(x, z);
      if (h > 0.5 && h < 6 && [[25, 0], [-25, 0], [0, 25], [0, -25]].some(([dx, dz]) => heightAt(x + dx, z + dz) < -1)) { start = [x, z]; break search; }
    }
  }
  return {
    group, heightAt, start, T,
    waterAt: (x, z, t) => waveHeight(waves, x, z, t),
    sky: { fog: L.fog.clone(), fogDensity: L.fogDensity, sunDir: L.sunDir.clone(), sunColor: L.sunColor.clone(), sunIntensity: L.sunIntensity, ambient: L.ambient, sky: L.sky.clone(), ground: L.ground.clone() },
    update(t, camera) {
      WU.uTime.value = t;
      terrain.update(camera);
      sea.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
    },
    dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
      tex.dispose(); rtex.a.dispose(); rtex.b.dispose(); btex.dispose();
    },
  };
}
window.LandLabWorld = landLabWorld;

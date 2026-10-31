// Laboratorium filtrów — scena bazowa z grafiką z Battle: niebo (SkyKit) z oświetleniem i mapą otoczenia z tego
// samego nieba, morze (WaterKit) albo płaski grunt. Sceny (scenes/*.js) stawiają na niej model.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment, sunAt } from '../../envs/land/skykit.js';
import { waveSet, heightAt, waterUniforms, setWaves, polarGrid, waterMaterial, hullTexture, LOOKS } from '../../envs/water/waterkit.js';

// oświetlenie do sprawdzania filtrów: pogoda z SkyKit + pora dnia (55° N, koniec października, jak w laboratorium wyglądu)
export const LIGHTS = {
  afternoon: { label: 'Afternoon, fair', weather: 'fair', time: 15.2 },
  noon: { label: 'Noon, broken clouds', weather: 'broken', time: 12 },
  dusk: { label: 'Dusk', weather: 'fair', time: 17.25 },
  overcast: { label: 'Overcast', weather: 'overcast', time: 13 },
};

export function createStage(renderer, scene) {
  const skyU = skyUniforms(), sky = skyDome(skyU); scene.add(sky);
  scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0005);
  const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);

  // morze
  const WU = Object.assign(waterUniforms(), skyU);
  const water = new THREE.Mesh(polarGrid(192, 160), waterMaterial(WU, { sky: '#define SKY_NO_STARS\n' + GLSL_SKY }));
  water.frustumCulled = false; water.renderOrder = 1; scene.add(water);
  const waves = waveSet({ Hs: 1.2, Lp: 34, chop: 0.5, spread: 35, n: 12 }, 210, 7);
  setWaves(WU, waves);
  const L0 = LOOKS.atlantic; WU.uDeep.value.set(L0.deep); WU.uScatter.value.set(L0.scatter); WU.uRipples.value = L0.ripples; WU.uCrest.value = L0.crest;
  WU.uShipFx.value.set(0, 0, 0, 0);

  // grunt (sceny lądowe)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6d7754, roughness: 1 }));
  ground.receiveShadow = true; ground.visible = false; scene.add(ground);

  let envRT = null, envDirty = true, envT = 0, t = 0, shift = 0, sunDir = new THREE.Vector3(0, 1, 0), sunSeen = 1;
  const stage = {
    skyU, WU, sun, hemi, water, ground, waves,
    get sunDir() { return sunDir; }, get sunSeen() { return sunSeen; },
    // 'sea' | 'land' (groundY: wysokość gruntu)
    setSurface(kind, groundY = 0) { water.visible = kind === 'sea'; ground.visible = kind === 'land'; ground.position.y = groundY; },
    // kadłub wycięty z wody (statki z ShipKit morskiego)
    setShip(lines, beam) {
      if (!lines) { WU.uShipFx.value.set(0, 0, 0, 0); return; }
      const h = hullTexture(lines); WU.uHull.value = h.tex; WU.uHullZ.value.set(h.z0, h.z1, h.max, 0);
      WU.uShip.value.set(4, lines.zBow, lines.zStern, beam / 2); WU.uShipFx.value.set(1, 1, 1, 0);
    },
    setLight(id) {
      const p = LIGHTS[id] || LIGHTS.afternoon, w = { ...WEATHER[p.weather] }; delete w.label;
      const L = applySky(skyU, { ...w, ...sunAt(p.time) });
      sunDir = L.sunDir.clone(); sunSeen = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
      sun.position.copy(L.sunDir).multiplyScalar(220); sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity;
      hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
      scene.fog.color.copy(L.fog); scene.fog.density = L.fogDensity; WU.uFogDen.value = L.fogDensity;
      WU.uLight.value = 0.03 + 0.97 * L.day;
      WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen);
      WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar; WU.uShine.value = L0.shine * 1.8;
      scene.environmentIntensity = 0.85 - w.coverage * w.density * 0.45;
      envDirty = true;
      return L;
    },
    // sun shadow box around a model of size s (m)
    fitShadow(center, s) {
      Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 420 + s * 2 }); sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.copy(center); sun.position.copy(center).addScaledVector(sunDir, 220 + s);
    },
    heightAt: (x, z) => (water.visible ? heightAt(waves, x, z, t, shift) : ground.position.y),
    update(dt, camera) {
      t += dt; shift += 4 * dt;
      WU.uTime.value = t; WU.uShift.value = shift;
      skyU.uCloudOff.value.x += dt * 0.004; skyU.uCloudOff.value.y += dt * 0.002;
      sky.position.copy(camera.position);
      water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
      envT += dt; if (envDirty && envT > 0.3) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
      return t;
    },
  };
  return stage;
}

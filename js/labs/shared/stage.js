// Scena bazowa laboratoriów (filtry, scena) z grafiką z Battle: niebo (SkyKit) z oświetleniem i mapą otoczenia z tego
// samego nieba, morze (WaterKit) albo płaski grunt. Sceny (scenes/*.js) stawiają na niej model.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment, sunAt } from '../../envs/sky/skykit.js';
import { heightTexture, terrainMeshes, sampleHeight } from '../../envs/land/landkit.js';
import { generateWorld, biomeTexture } from '../../envs/land/regionkit.js';
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
  // morze domyślne: umiarkowane, północny Atlantyk; setSea(zasób „morze” z laboratorium wody) zmienia je
  const SEA0 = { Hs: 1.2, Lp: 34, chop: 0.5, spread: 35, n: 12, dir: 30 }, L0 = LOOKS.atlantic;
  let waves = null, shine0 = L0.shine;
  function setSea(p = {}) {
    const q = { ...SEA0, ...L0, reflect: 1, ...p };
    waves = waveSet({ Hs: q.Hs, Lp: q.Lp, chop: q.chop, spread: q.spread, n: q.n }, q.dir + 180, 7); setWaves(WU, waves);
    WU.uDeep.value.set(q.deep); WU.uScatter.value.set(q.scatter); WU.uRipples.value = q.ripples; WU.uCrest.value = q.crest;
    if (WU.uReflect) WU.uReflect.value = q.reflect;
    shine0 = q.shine; WU.uShine.value = shine0 * 1.8; envDirty = true;
  }
  WU.uShipFx.value.set(0, 0, 0, 0);

  // grunt (sceny lądowe)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6d7754, roughness: 1 }));
  ground.receiveShadow = true; ground.visible = false; scene.add(ground);

  let envRT = null, envDirty = true, envT = 0, t = 0, shift = 0, sunDir = new THREE.Vector3(0, 1, 0), sunSeen = 1;
  let space = false, spaceEnv = null, lightId = 'afternoon', surfaceKind = 'sea';
  let land = null;   // teren z laboratorium lądu (setLand): { T, tm } — mapa wysokości i siatki LandKit; morze wokół wysp   // kosmos: bez nieba, wody, gruntu i mgły; tło i odbicia daje strona
  setSea();
  const stage = {
    skyU, WU, sun, hemi, water, ground, setSea,
    get waves() { return waves; },
    get sunDir() { return sunDir; }, get sunSeen() { return sunSeen; },
    // 'sea' | 'land' | 'space' (groundY: wysokość gruntu). Kosmos: czarne tło, słońce bez atmosfery (białe, pełne),
    // bez mgły; tło (np. niebo BodyKit) i mapę odbić (setSpaceEnvironment) daje strona
    setSurface(kind, groundY = 0) {
      const was = space; space = kind === 'space'; surfaceKind = kind;
      water.visible = kind === 'sea' || (kind === 'land' && !!land); ground.visible = kind === 'land' && !land; ground.position.y = groundY; sky.visible = !space;
      if (land) land.tm.group.visible = kind === 'land';
      if (space !== was) { if (space) scene.environment = spaceEnv; else envDirty = true; stage.setLight(lightId); }
    },
    get space() { return space; },
    // ląd: teren z laboratorium lądu ({ map, water } — ustawienia LandKit i RegionKit, zasób „land”) albo null — płaski
    // grunt. Teren z wodami (morze, fiordy, jeziora) i biomami; morze sceny widać tam, gdzie teren jest pod wodą.
    // Generowanie trwa (siatka 512² — około sekundy).
    setLand(def) {
      if (land) { scene.remove(land.tm.group); land.tm.group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); land = null; }
      if (def) {
        const T = generateWorld(def.map || {}, def.water || {}), tex = heightTexture(T);
        const tm = terrainMeshes(T, tex, { biome: biomeTexture(T) }); scene.add(tm.group); land = { T, tm };
      }
      stage.setSurface(surfaceKind);
    },
    get land() { return land ? land.T : null; },
    // wysokość gruntu albo poziomu morza (samolot: koła, zderzenie z ziemią)
    groundAt: (x, z) => (land && surfaceKind === 'land' ? Math.max(0, sampleHeight(land.T, x, z)) : ground.visible ? ground.position.y : 0),
    // woda pod punktem (okręty: mielizna, brzeg): morze — wszędzie, teren — tam, gdzie dno jest głębiej niż depth
    isWater: (x, z, depth = 2) => (surfaceKind === 'sea' ? true : surfaceKind === 'land' && land ? sampleHeight(land.T, x, z) < -depth : false),
    setSpaceEnvironment(tex) { spaceEnv = tex; if (space) scene.environment = tex; },
    // kadłub wycięty z wody (statki z ShipKit morskiego)
    setShip(lines, beam) {
      if (!lines) { WU.uShipFx.value.set(0, 0, 0, 0); return; }
      const h = hullTexture(lines); WU.uHull.value = h.tex; WU.uHullZ.value.set(h.z0, h.z1, h.max, 0);
      WU.uShip.value.set(4, lines.zBow, lines.zStern, beam / 2); WU.uShipFx.value.set(1, 1, 1, 0);
    },
    // światło: id z LIGHTS albo pogoda wprost — { coverage, density, haze, rain, vis, sunEl, sunAz, moon, … } (zasób
    // „weather” z laboratorium wyglądu, js/scene/assets.js); sama pogoda bez słońca bierze je z pory dnia (time)
    setLight(id) {
      lightId = id;
      let w;
      if (id && typeof id === 'object') { w = { ...(WEATHER[id.weather] || WEATHER.fair), ...id }; if (w.sunEl == null || w.sunAz == null) Object.assign(w, sunAt(w.time ?? 15.2)); }
      else { const p = LIGHTS[id] || LIGHTS.afternoon; w = { ...WEATHER[p.weather], ...sunAt(p.time) }; }
      delete w.label;
      const L = applySky(skyU, w);
      sunDir = L.sunDir.clone(); sunSeen = Math.max(0, 1 - w.coverage * (0.4 + w.density * 0.6)) * L.sunSeen;
      sun.position.copy(L.sunDir).multiplyScalar(220); sun.color.copy(L.sunColor); sun.intensity = L.sunIntensity;
      hemi.intensity = L.ambient; hemi.color.copy(L.sky); hemi.groundColor.copy(L.ground);
      scene.fog.color.copy(L.fog); scene.fog.density = L.fogDensity; WU.uFogDen.value = L.fogDensity;
      WU.uLight.value = 0.03 + 0.97 * L.day;
      WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen);
      WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar; WU.uShine.value = shine0 * 1.8;
      scene.environmentIntensity = 0.85 - w.coverage * w.density * 0.45;
      envDirty = true;
      if (space) {   // w próżni: słońce białe i pełne (bez atmosfery i chmur), kierunek z pory dnia; prawie bez rozproszonego
        sunSeen = 1; sun.color.setRGB(1, 0.97, 0.92); sun.intensity = 3.2;
        hemi.intensity = 0.04; hemi.color.setRGB(0.6, 0.65, 0.8); hemi.groundColor.setRGB(0.05, 0.05, 0.07);
        scene.fog.density = 0; scene.environmentIntensity = 0.5; envDirty = false;
      }
      return L;
    },
    // sun shadow box around a model of size s (m)
    fitShadow(center, s) {
      Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 420 + s * 2 }); sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.copy(center); sun.position.copy(center).addScaledVector(sunDir, 220 + s);
    },
    heightAt: (x, z) => {
      if (land && surfaceKind === 'land') { const g = sampleHeight(land.T, x, z); return g > 0 ? g : heightAt(waves, x, z, t, shift); }
      return water.visible ? heightAt(waves, x, z, t, shift) : ground.position.y;
    },
    update(dt, camera) {
      t += dt; shift += 4 * dt;
      WU.uTime.value = t; WU.uShift.value = shift;
      skyU.uCloudOff.value.x += dt * 0.004; skyU.uCloudOff.value.y += dt * 0.002;
      sky.position.copy(camera.position);
      water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
      if (land && land.tm.group.visible) land.tm.update(camera);
      envT += dt; if (envDirty && !space && envT > 0.3) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
      return t;
    },
  };
  return stage;
}

// Scena bazowa laboratoriów (filtry, scena) z grafiką z Battle: niebo (SkyKit) z oświetleniem i mapą otoczenia z tego
// samego nieba, morze (WaterKit) albo płaski grunt. Sceny (scenes/*.js) stawiają na niej model.
import * as THREE from '../../../vendor/three/three.module.js';
import { WEATHER, skyUniforms, GLSL_SKY, skyDome, applySky, skyEnvironment, sunAt } from '../../envs/sky/skykit.js';
import { heightTexture, terrainMeshes, sampleHeight, barrierBuoys, GLSL_LAND } from '../../envs/land/landkit.js';
import { worldFor } from '../../envs/land/planet.js';
import { generateWorld, biomeTexture, regionTextures, regionUniforms, setRegions, GLSL_REGIONS } from '../../envs/land/regionkit.js';
import { waveSet, heightAt, waterUniforms, setWaves, polarGrid, waterMaterial, hullTexture, LOOKS } from '../../envs/water/waterkit.js';

// oświetlenie do sprawdzania filtrów: pogoda z SkyKit + pora dnia (55° N, koniec października, jak w laboratorium wyglądu)
export const LIGHTS = {
  afternoon: { label: 'Afternoon, fair', weather: 'fair', time: 15.2 },
  noon: { label: 'Noon, broken clouds', weather: 'broken', time: 12 },
  dusk: { label: 'Dusk', weather: 'fair', time: 17.25 },
  overcast: { label: 'Overcast', weather: 'overcast', time: 13 },
};

// opts: envEvery — co ile sekund najwcześniej odświeżać mapę otoczenia z nieba (0,3 s); skyRadius — promień kopuły
// nieba (4000 m); seaRadius — zasięg siatki morza (6000 m); clouds — dryf chmur [x, y] (na wiatr 3,3 m/s, gdy stage.wind
// ustawiony); shiftSpeed — przesuwanie fal z prądem (4 m/s); fogHeight — mgła rzednie z wysokością kamery (mgła leży
// nisko: z góry patrzy się przez cieńszą warstwę)
export function createStage(renderer, scene, opts = {}) {
  const envEvery = opts.envEvery ?? 0.3, clouds = opts.clouds || [0.004, 0.002], shiftSpeed = opts.shiftSpeed ?? 4;
  const skyU = skyUniforms(), sky = skyDome(skyU, opts.skyRadius || 4000); scene.add(sky);
  if (opts.skyRadius) sky.renderOrder = -1;
  scene.fog = new THREE.FogExp2(0xc9d7e2, 0.0005);
  const hemi = new THREE.HemisphereLight(0xdfe6ec, 0x2a3a46, 0.8);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);

  // morze
  const WU = Object.assign(waterUniforms(), skyU);
  const SEA_SKY = '#define SKY_NO_STARS\n' + GLSL_SKY;   // bez gwiazd w morzu: rozbite falami migałyby jak szum
  const water = new THREE.Mesh(polarGrid(192, 160, 0.6, opts.seaRadius || 6000), waterMaterial(WU, { sky: SEA_SKY }));
  water.frustumCulled = false; water.renderOrder = 1; scene.add(water);
  // morze domyślne: umiarkowane, północny Atlantyk; setSea(zasób „morze” z laboratorium wody) zmienia je
  const SEA0 = { Hs: 1.2, Lp: 34, chop: 0.5, spread: 35, n: 12, dir: 30 }, L0 = LOOKS.atlantic;
  let waves = null, shine0 = L0.shine, seaDef = {};
  function setSea(p = {}) {
    const q = { ...SEA0, ...L0, reflect: 1, ...p };
    seaDef = p; waves = waveSet({ Hs: q.Hs, Lp: q.Lp, chop: q.chop, spread: q.spread, n: q.n }, q.dir + 180, 7);
    if (land) {   // teren: fale powtarzają się co rozmiar mapy (świat zawinięty bez szwu) — wektor każdej fali na całe okresy mapy
      const K = 2 * Math.PI / land.T.size;
      for (const w of waves) {
        let kx = Math.round(w.k * w.dx / K) * K, kz = Math.round(w.k * w.dz / K) * K;
        if (kx === 0 && kz === 0) kz = K;
        w.k = Math.hypot(kx, kz); w.dx = kx / w.k; w.dz = kz / w.k; w.w = Math.sqrt(9.81 * w.k); w.L = 2 * Math.PI / w.k;
      }
    }
    setWaves(WU, waves);
    WU.uDeep.value.set(q.deep); WU.uScatter.value.set(q.scatter); WU.uRipples.value = q.ripples; WU.uCrest.value = q.crest;
    if (WU.uReflect) WU.uReflect.value = q.reflect;
    shine0 = q.shine; WU.uShine.value = shine0 * 1.8; envDirty = true;
  }
  WU.uShipFx.value.set(0, 0, 0, 0);

  // grunt (sceny lądowe)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6d7754, roughness: 1 }));
  ground.receiveShadow = true; ground.visible = false; scene.add(ground);

  let envRT = null, envDirty = true, envT = 0, t = 0, shift = 0, sunDir = new THREE.Vector3(0, 1, 0), sunSeen = 1, fogBase = 0.0005;
  // niebo i powierzchnia są niezależne: skyMode 'day' — niebo dzienne SkyKit (pora dnia, pogoda, mgła, odbicia z nieba),
  // 'space' — niebo kosmosu (tło daje strona, np. BodyKit): słońce bez atmosfery, bez mgły, odbicia setSpaceEnvironment
  let space = false, spaceEnv = null, lightId = 'afternoon', surfaceKind = 'sea';
  let land = null;   // teren (setLand / setWorld): { T, tm, tex, btex, rtex, buoys } — mapa, siatki LandKit, tekstury; morze zna teren
  setSea();
  // atmosfera planety (ląd z planety, T.atmo): niebo dzienne przebarwione na odcień jej atmosfery (Ziemia 205°), tym
  // bledsze i ciemniejsze, im rzadsza atmosfera; bez atmosfery — niebo kosmosu (tryb nieba ustawia strona)
  let atmo = null;
  const EARTH_HUE = 205, hsl = {};
  function tintAtmosphere(a) {
    const dh = (a.hue - EARTH_HUE) / 360, k = Math.min(1, a.density / 0.6), thin = 0.35 + 0.65 * k;
    const tint = (c) => { c.getHSL(hsl); c.setHSL((hsl.h + dh + 1) % 1, hsl.s * (0.4 + 0.6 * k), hsl.l * thin); };
    for (const c of [skyU.uSkyHor.value, skyU.uSkyZen.value, skyU.uSkyLow.value, hemi.color, scene.fog.color, WU.uFogCol.value]) tint(c);
    scene.fog.density *= 0.3 + 0.7 * k; fogBase = scene.fog.density; WU.uFogDen.value = fogBase;   // rzadka atmosfera — mniej mgiełki
  }
  const stage = {
    skyU, WU, sun, hemi, water, ground, setSea,
    // wiatr [m/s] dla dryfu chmur (null — stały, wolny dryf)
    wind: null,
    get time() { return t; }, get shift() { return shift; },
    get waves() { return waves; },
    get sunDir() { return sunDir; }, get sunSeen() { return sunSeen; },
    // powierzchnia: 'sea' | 'land' | 'space' (brak — bez wody i gruntu); groundY: wysokość płaskiego gruntu.
    // Niebo osobno (setSkyMode); bez drugiego argumentu kosmos dostaje niebo kosmosu, morze i ląd — dzienne
    setSurface(kind, groundY = 0) {
      surfaceKind = kind;
      water.visible = kind === 'sea' || (kind === 'land' && !!land && !land.T.noSea);   // planeta bez mórz: bez wody wokół wycinka ground.visible = kind === 'land' && !land; ground.position.y = groundY;
      if (land) { land.tm.group.visible = kind === 'land'; if (land.buoys) land.buoys.visible = kind === 'land'; }
    },
    setSkyMode(mode) {
      const was = space; space = mode === 'space'; sky.visible = !space;
      if (space !== was) { if (space) scene.environment = spaceEnv; else envDirty = true; stage.setLight(lightId); }
    },
    get skyMode() { return space ? 'space' : 'day'; },
    get space() { return space; },
    // ląd: teren z laboratorium lądu ({ map, water } — ustawienia LandKit i RegionKit, zasób „land”) albo null — płaski
    // grunt. Teren z wodami (morze, fiordy, jeziora, rzeki) i biomami; morze sceny zna teren (płycizny, przybój, fale
    // gasnące przy brzegu, barwy i prądy wód RegionKit, lód, olej). Generowanie trwa (siatka 512² — około sekundy).
    // ląd z planety (def.map.planet = 'grupa/ciało', js/envs/land/planet.js) — potrzebuje BodyKit (loadSpace())
    setLand(def) { stage.setWorld(def ? worldFor(renderer, def.map || {}, def.water || {}) : null); },
    // świat już wygenerowany (generateWorld z RegionKit) albo null; ten sam świat ponownie — tylko odświeżenie tekstur
    setWorld(T) {
      if (!T) {
        if (land) {
          scene.remove(land.tm.group); land.tm.group.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
          land.tex.dispose(); land.btex.dispose(); land.rtex.a.dispose(); land.rtex.b.dispose(); if (land.buoys) { scene.remove(land.buoys); land.buoys.geometry.dispose(); }
          land = null;
          const m = water.material; water.material = waterMaterial(WU, { sky: SEA_SKY }); m.dispose();
        }
      } else if (!land) {
        const tex = heightTexture(T), btex = biomeTexture(T), rtex = regionTextures(T);
        const tm = terrainMeshes(T, tex, { biome: btex }); scene.add(tm.group);
        Object.assign(WU, tm.uniforms, regionUniforms(rtex));
        const m = water.material; water.material = waterMaterial(WU, { sky: SEA_SKY, land: GLSL_LAND, regions: GLSL_REGIONS }); m.dispose();
        land = { T, tm, tex, btex, rtex, buoys: null };
      } else {
        land.tex.dispose(); land.tex = heightTexture(T); land.tm.set(T, land.tex);
        land.rtex.a.dispose(); land.rtex.b.dispose(); land.rtex = regionTextures(T); setRegions(WU, land.rtex);
        land.btex.dispose(); land.btex = biomeTexture(T); land.tm.setBiome(land.btex);
        land.T = T;
      }
      if (land) {
        const sh = T.regions.share;
        WU.uIce.value.set(sh.ice > 0.001 ? 1 : 0, 18, 0.35, 0); WU.uOil.value = sh.harbour > 0.001 ? 1 : 0;
        if (land.buoys) { scene.remove(land.buoys); land.buoys.geometry.dispose(); land.buoys = null; }
        if (!T.wrap && T.barrier === 'buoys') { land.buoys = barrierBuoys(T); scene.add(land.buoys); }
      } else { WU.uIce.value.set(0, 18, 0.35, 1); WU.uOil.value = 0; }
      setSea(seaDef);   // fale zawinięte z mapą albo nie
      const was = atmo; atmo = land && land.T.atmo && !land.T.atmo.airless ? land.T.atmo : null;
      stage.setSurface(surfaceKind);
      if (was !== atmo) stage.setLight(lightId);
    },
    get land() { return land ? land.T : null; },
    get terrain() { return land ? land.tm : null; },
    get airless() { return !!(land && land.T.atmo && land.T.atmo.airless); },   // ląd z planety bez atmosfery: strona daje niebo kosmosu   // siatki terenu LandKit (trójkąty, update)
    // wysokość gruntu albo poziomu morza (samolot: koła, zderzenie z ziemią)
    groundAt: (x, z) => (land && surfaceKind === 'land' ? Math.max(0, sampleHeight(land.T, x, z)) : ground.visible ? ground.position.y : 0),
    // grunt bez wody (pojazdy lądowe): teren, dno pod wodą ujemne; płaski grunt; morze — dno głęboko (30 m);
    // kosmos — null (brak gruntu); waterLevel — poziom wody (0) albo null, gdzie wody nie ma
    terrainAt: (x, z) => (surfaceKind === 'land' ? (land ? sampleHeight(land.T, x, z) : ground.position.y) : surfaceKind === 'sea' ? -30 : null),
    waterAt: (x, z) => (water.visible ? heightAt(waves, x, z, t, shift) : null),   // powierzchnia wody z falami albo null
    waterLevel: (x, z) => (surfaceKind === 'sea' || (surfaceKind === 'land' && land) ? 0 : null),
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
      scene.fog.color.copy(L.fog); scene.fog.density = L.fogDensity; WU.uFogDen.value = L.fogDensity; fogBase = L.fogDensity;
      WU.uLight.value = 0.03 + 0.97 * L.day;
      WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.copy(L.glitterColor).multiplyScalar(1.1 * (1 - w.coverage * w.density * 0.8) * L.sunSeen * L.sunSeen);
      WU.uFogCol.value.copy(L.fog); WU.uFogFar.value = L.fogFar; WU.uShine.value = shine0 * 1.8;
      scene.environmentIntensity = 0.85 - w.coverage * w.density * 0.45;
      envDirty = true;
      if (atmo && !space && surfaceKind === 'land') tintAtmosphere(atmo);   // niebo planety: barwa i gęstość jej atmosfery
      if (space) {   // niebo kosmosu: słońce białe i pełne (bez atmosfery i chmur), kierunek z pory dnia; prawie bez rozproszonego
        sunSeen = 1; sun.color.setRGB(1, 0.97, 0.92); sun.intensity = 3.2;
        hemi.intensity = 0.04; hemi.color.setRGB(0.6, 0.65, 0.8); hemi.groundColor.setRGB(0.05, 0.05, 0.07);
        scene.fog.density = 0; fogBase = 0; scene.environmentIntensity = 0.5; envDirty = false;
        // woda pod niebem kosmosu: odbija czarne niebo (niebo dzienne bez słońca, bez chmur i mgiełki) i ostry blask
        // białego słońca; bez mgły nad wodą
        applySky(skyU, { ...w, sunEl: -30, coverage: 0, haze: 0, rain: 0, vis: 25, moon: 0 });
        WU.uFogDen.value = 0; WU.uFogCol.value.setRGB(0.002, 0.002, 0.004); WU.uFogFar.value = 6000; WU.uLight.value = 0.35;   // daleka woda gaśnie w czerń nieba
        WU.uSun.value.copy(L.sunDir); WU.uSunCol.value.setRGB(1, 0.97, 0.92).multiplyScalar(0.55);
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
    // krok czasu: fale, przesunięcie, dryf chmur (laboratorium z własną kamerą woła tick, potem follow)
    tick(dt) {
      t += dt; shift += shiftSpeed * dt;
      WU.uTime.value = t; WU.uShift.value = shift;
      const k = stage.wind == null ? 1 : stage.wind * 0.3;
      skyU.uCloudOff.value.x += dt * clouds[0] * k; skyU.uCloudOff.value.y += dt * clouds[1] * k;
      envT += dt;
      return t;
    },
    // niebo i woda za kamerą, teren, mapa otoczenia z nieba
    follow(camera) {
      sky.position.copy(camera.position);
      water.position.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2);
      if (land && land.tm.group.visible) land.tm.update(camera);
      if (opts.fogHeight && !space) { const f = fogBase / (1 + Math.max(0, camera.position.y - 40) / 300); scene.fog.density = f; WU.uFogDen.value = f; }
      if (envDirty && !space && envT > envEvery) { if (envRT) envRT.dispose(); envRT = skyEnvironment(renderer, skyU); scene.environment = envRT.texture; envDirty = false; envT = 0; }
    },
    update(dt, camera) { stage.tick(dt); stage.follow(camera); return t; },
  };
  return stage;
}

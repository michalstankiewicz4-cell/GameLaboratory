// FireKit — realistyczny ogień na lądzie: płomienie, dym, iskry i światło od wielu źródeł naraz, liczone na GPU
// (każda cząstka zna czas narodzin i swoje losowe liczby; ruch, kształt i kolor liczy shader — co klatkę tylko
// emisja nowych). Wygląd zależy od paliwa (FUELS): drewno, trawa, guma (opony, papa), papier.
//   płomienie  języki ognia jako pionowe billboardy: kształt i drganie z szumu, barwa z temperatury (ciemna czerwień →
//              pomarańcz → żółć → biały rdzeń), jasność ponad 1 (świeci w potoku kamery z poświatą); unoszą się
//              szybciej przy wyższym ogniu (wypór ~ √wysokości), zwężają ku górze, wiatr je kładzie
//   dym        kłęby rosnące z wysokością, zwalniające, niesione wiatrem; barwa i gęstość z paliwa (guma — czarny,
//              gęsty; trawa — jasny), dół kłębów podświetlony ogniem
//   iskry      drobne żarzące się punkty unoszone ciepłem i wiatrem, migoczą i gasną
//   światło    kilka świateł punktowych przydzielanych najsilniejszym źródłom blisko kamery, migotanie z szumu
//
// createFire(scene, { flames, smoke, embers, lights }) → fire
//   fire.add({ at: [x, y, z], size: [szer. x, szer. z], height, power 0…1, fuel }) → źródło { set({…}), remove() }
//   fire.update(dt, camera, { wind: [x, y, z] m/s, light: 0…1 jasność dnia (dym w nocy ciemniejszy) })
//   fire.counts() → { sources, flames, smoke, embers }, fire.clear(), fire.dispose()
// Wymiary w metrach. Gęstość cząstek: QUALITY.fx (js/render/quality.js).
import * as THREE from '../../../../vendor/three/three.module.js';
import { fxCount } from '../../quality.js';

// paliwa: barwa płomienia (mnożnik), szybkość emisji, barwa i gęstość dymu, iskry, życie płomienia (× wysokość)
export const FUELS = {
  wood: { label: 'Wood', labelPl: 'Drewno', flame: [1, 0.92, 0.85], rate: 1, smoke: [0.33, 0.31, 0.29], smokeAmt: 0.55, embers: 1, life: 1 },
  grass: { label: 'Grass', labelPl: 'Trawa', flame: [1, 0.95, 0.8], rate: 1.5, smoke: [0.62, 0.6, 0.55], smokeAmt: 0.45, embers: 1.6, life: 0.7 },
  rubber: { label: 'Rubber, tar', labelPl: 'Guma, papa', flame: [1, 0.72, 0.5], rate: 0.85, smoke: [0.07, 0.065, 0.06], smokeAmt: 1.2, embers: 0.3, life: 1.15 },
  paper: { label: 'Paper, cardboard', labelPl: 'Papier, karton', flame: [1, 1, 0.95], rate: 1.3, smoke: [0.5, 0.49, 0.47], smokeAmt: 0.3, embers: 2.2, life: 0.75 },
};
export const FUEL_IDS = Object.keys(FUELS);
export const FIRE_DEFAULTS = { flames: 7000, smoke: 3500, embers: 2500, lights: 4, smokeScale: 1, emberScale: 1, glow: 1 };

/* ---------------- shadery ---------------- */
const NOISE = /* glsl */`
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += vn(p) * a; p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;
// barwa z temperatury 0…1 (przybliżenie ciała doskonale czarnego dla płomienia)
const RAMP = /* glsl */`
vec3 fireRamp(float k){
  vec3 c = mix(vec3(0.0), vec3(0.45, 0.04, 0.0), smoothstep(0.0, 0.25, k));
  c = mix(c, vec3(1.0, 0.3, 0.03), smoothstep(0.2, 0.5, k));
  c = mix(c, vec3(1.0, 0.68, 0.22), smoothstep(0.45, 0.75, k));
  return mix(c, vec3(1.0, 0.93, 0.78), smoothstep(0.75, 1.0, k));
}`;
// wspólne: czas życia, położenie cząstki (środek źródła + przesunięcie w obszarze), wiatr
const COMMON_VS = /* glsl */`
uniform float uTime; uniform vec3 uWind;
attribute vec3 aOrg; attribute float aBorn; attribute vec4 aSeed; attribute vec4 aSrc; attribute vec4 aFuel;
`;
const FLAME_VS = COMMON_VS + /* glsl */`
uniform float uLifeK;
varying vec2 vUv; varying float vT; varying vec4 vSeed; varying vec3 vTint; varying float vPow;
void main(){
  float H = max(0.15, aSrc.z), pw = aSrc.w;
  float vr = 1.5 * sqrt(H) + 0.6;                                   // wypór: wyższy ogień — szybsze płomienie
  float life = H / vr * (0.55 + 0.7 * aSeed.w) * aFuel.w * uLifeK;
  float t = (uTime - aBorn) / life;
  vT = t; vUv = uv; vSeed = aSeed; vTint = aFuel.rgb; vPow = pw;
  if (t < 0.0 || t > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // ze swojego miejsca w obszarze ku środkowi i w górę; wiatr kładzie górę płomieni
  vec3 off = vec3(aSeed.x * aSrc.x, 0.0, aSeed.y * aSrc.y) * (1.0 - 0.55 * t);
  float y = H * (0.02 + 0.45 * pow(t, 1.3)) * (0.75 + 0.5 * aSeed.z);   // język rośnie od podstawy, odrywa się dopiero u góry
  vec3 lean = uWind * t * t * life * 0.55;
  vec3 tur = vec3(sin(uTime * 6.0 + aSeed.z * 40.0), 0.0, cos(uTime * 5.3 + aSeed.w * 40.0)) * 0.12 * H * t;
  vec3 p = aOrg + off + vec3(0.0, y, 0.0) + lean + tur;
  // język ognia: szeroki u dołu, węższy z wysokością i z czasem; pionowy (oś pochylona z wiatrem)
  float w = clamp(0.32 * min(aSrc.x, aSrc.y) + 0.16 * H, 0.12, 3.0) * (1.0 - 0.4 * t) * (0.7 + 0.6 * aSeed.z) * (0.6 + 0.4 * pw);
  float hq = H * (0.5 + 0.4 * aSeed.w) * (1.0 - 0.3 * t) * (0.6 + 0.4 * pw) + w * 0.6;
  vec3 camR = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 up = normalize(vec3(uWind.x * 0.07, 1.0, uWind.z * 0.07));
  vec3 wp = p + camR * position.x * w + up * (position.y + 0.5) * hq;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const FLAME_FS = NOISE + RAMP + /* glsl */`
uniform float uTime, uGlow; varying vec2 vUv; varying float vT; varying vec4 vSeed; varying vec3 vTint; varying float vPow;
void main(){
  float y = vUv.y, x = (vUv.x - 0.5) * 2.0;
  float n = fbm(vec2(vUv.x * 2.6 + vSeed.x * 13.0, y * 2.2 - uTime * (2.2 + vSeed.y)));
  float n2 = fbm(vec2(vUv.x * 5.0 - vSeed.z * 7.0, y * 4.0 - uTime * 3.6));
  float wdt = 0.78 * pow(max(0.0, 1.0 - y), 0.8) * (0.7 + 0.4 * n);       // zwęża się ku górze, poszarpany brzeg; nigdy do brzegu kwadratu
  float xx = abs(x + (n - 0.5) * 0.9 * y);
  float m = smoothstep(wdt, wdt * 0.3, xx) * smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.45, 0.95, y + (n2 - 0.5) * 0.6)) * smoothstep(1.0, 0.8, abs(x));
  if (m < 0.01) discard;
  float k = clamp(m * (1.15 - y * 0.75) * (1.0 - vT * 0.8) * (0.75 + 0.35 * vPow) + (n2 - 0.5) * 0.2, 0.0, 1.0);
  vec3 c = fireRamp(k) * vTint * (0.45 + 1.6 * k * k) * uGlow;               // wiele języków nakłada się (mieszanie addytywne)
  float a = m * pow(1.0 - vT, 0.7) * smoothstep(0.0, 0.1, vT) * 0.55;
  gl_FragColor = vec4(c * a, a);
}`;
const SMOKE_VS = COMMON_VS + /* glsl */`
uniform float uSmokeK;
varying vec2 vUv; varying float vT; varying vec4 vSeed; varying vec3 vCol;
void main(){
  float H = max(0.15, aSrc.z), pw = aSrc.w;
  float life = (3.5 + 2.5 * aSeed.w) * (0.8 + 0.25 * sqrt(H));
  float t = (uTime - aBorn) / life;
  vT = t; vUv = uv; vSeed = aSeed; vCol = aFuel.rgb;
  if (t < 0.0 || t > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float rise = (2.0 + 1.6 * sqrt(H)) * life * (1.0 - exp(-2.2 * t)) / 2.2 * 1.6;   // wznosi się coraz wolniej
  vec3 off = vec3(aSeed.x * aSrc.x, 0.0, aSeed.y * aSrc.y) * (0.6 + 0.8 * t);
  vec3 p = aOrg + off + vec3(0.0, H * 0.75 + rise, 0.0) + uWind * t * life * 0.85
    + vec3(sin(aSeed.z * 30.0 + t * 3.0), 0.0, cos(aSeed.w * 30.0 + t * 2.5)) * t * (0.5 + 0.2 * H);
  float s = (0.4 + 0.35 * H + 0.25 * max(aSrc.x, aSrc.y)) * (0.45 + 2.4 * t) * (0.7 + 0.6 * aSeed.z) * uSmokeK;
  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float r = aSeed.z * 6.283 + t * (aSeed.w - 0.5) * 2.0;                                  // kłąb obraca się powoli
  vec2 q = mat2(cos(r), -sin(r), sin(r), cos(r)) * position.xy;
  vec3 wp = p + (camR * q.x + camU * q.y) * s;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const SMOKE_FS = NOISE + /* glsl */`
uniform float uTime, uLight, uDens; uniform vec3 uSky, uFogCol; uniform float uFogDen;
varying vec2 vUv; varying float vT; varying vec4 vSeed; varying vec3 vCol;
void main(){
  vec2 c = vUv - 0.5; float d = length(c) * 2.0;
  float n = fbm(vUv * 3.0 + vSeed.xy * 9.0 + vec2(0.0, -uTime * 0.15));
  float puff = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.8);
  if (puff < 0.01) discard;
  // światło: góra kłębu jaśniejsza (niebo), dół świeżego dymu podświetlony ogniem
  vec3 col = vCol * mix(0.55, 1.15, vUv.y) * (0.25 + 0.75 * uLight) * uSky;
  col += vec3(1.0, 0.42, 0.1) * (1.0 - smoothstep(0.0, 0.25, vT)) * (1.0 - vUv.y) * 0.3 * vCol.r * 2.0;   // świeży dym od spodu w świetle ognia
  float a = puff * uDens * pow(1.0 - vT, 1.4) * smoothstep(0.0, 0.1, vT) * (0.6 + 0.6 * n);
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
}`;
const EMBER_VS = COMMON_VS + /* glsl */`
uniform float uPx; varying float vT; varying float vF;
void main(){
  float H = max(0.15, aSrc.z);
  float life = 1.2 + 2.6 * aSeed.w;
  float t = (uTime - aBorn) / life; vT = t;
  vF = 0.6 + 0.4 * sin(uTime * (14.0 + aSeed.z * 20.0) + aSeed.x * 50.0);                // migotanie
  if (t < 0.0 || t > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  float T = t * life;
  vec3 v0 = vec3((aSeed.x) * 1.4, 2.5 + 2.5 * aSeed.z + sqrt(H) * 1.2, (aSeed.y) * 1.4);
  vec3 p = aOrg + vec3(aSeed.x * aSrc.x, H * 0.4, aSeed.y * aSrc.y) + v0 * T - vec3(0.0, 0.6, 0.0) * T * T + uWind * T * 0.9
    + vec3(sin(T * 5.0 + aSeed.z * 20.0), 0.0, cos(T * 4.0 + aSeed.w * 20.0)) * 0.35 * T;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * (0.03 + 0.03 * aSeed.w) / -mv.z, 1.0, 6.0);
}`;
const EMBER_FS = RAMP + /* glsl */`
varying float vT; varying float vF;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float k = (1.0 - vT) * vF;
  gl_FragColor = vec4(fireRamp(0.35 + 0.6 * k) * (2.0 + 3.0 * k) * smoothstep(0.5, 0.1, d), 1.0);
}`;

/* ---------------- pule cząstek ---------------- */
function pool(n, instanced) {
  const org = new Float32Array(n * 3), born = new Float32Array(n).fill(-1e9), seed = new Float32Array(n * 4), src = new Float32Array(n * 4), fuel = new Float32Array(n * 4);
  let g;
  const A = instanced ? THREE.InstancedBufferAttribute : THREE.BufferAttribute;
  if (instanced) { g = new THREE.InstancedBufferGeometry(); const b = new THREE.PlaneGeometry(1, 1); g.index = b.index; g.setAttribute('position', b.attributes.position); g.setAttribute('uv', b.attributes.uv); g.instanceCount = n; }
  else { g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); }
  const at = { aOrg: new A(org, 3), aBorn: new A(born, 1), aSeed: new A(seed, 4), aSrc: new A(src, 4), aFuel: new A(fuel, 4) };
  for (const [k, v] of Object.entries(at)) { v.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, v); }
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return { n, i: 0, g, org, born, seed, src, fuel, at, dirty: false };
}
function emit(P, s, time, fuelVec) {
  const k = P.i++ % P.n;
  P.born[k] = time;
  P.org[k * 3] = s.at[0]; P.org[k * 3 + 1] = s.at[1]; P.org[k * 3 + 2] = s.at[2];
  P.seed[k * 4] = Math.random() - 0.5; P.seed[k * 4 + 1] = Math.random() - 0.5; P.seed[k * 4 + 2] = Math.random(); P.seed[k * 4 + 3] = Math.random();
  P.src[k * 4] = s.size[0]; P.src[k * 4 + 1] = s.size[1]; P.src[k * 4 + 2] = s.height; P.src[k * 4 + 3] = s.power;
  P.fuel.set(fuelVec, k * 4);
  P.dirty = true;
}
function flush(P) { if (!P.dirty) return; for (const a of Object.values(P.at)) a.needsUpdate = true; P.dirty = false; }

export function createFire(scene, opts = {}) {
  const O = { ...FIRE_DEFAULTS, ...opts };
  const F = pool(fxCount(O.flames), true), S = pool(fxCount(O.smoke), true), E = pool(fxCount(O.embers), false);
  const U = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3() } };
  const flameMat = new THREE.ShaderMaterial({ uniforms: { ...U, uLifeK: { value: 1 }, uGlow: { value: O.glow } }, vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, side: THREE.DoubleSide, fog: false });
  const smokeMat = new THREE.ShaderMaterial({ uniforms: { ...U, uSmokeK: { value: O.smokeScale }, uLight: { value: 1 }, uDens: { value: 0.75 }, uSky: { value: new THREE.Color(1, 1, 1) }, uFogCol: { value: new THREE.Color() }, uFogDen: { value: 0 } },
    vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const emberMat = new THREE.ShaderMaterial({ uniforms: { ...U, uPx: { value: 800 } }, vertexShader: EMBER_VS, fragmentShader: EMBER_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const flames = new THREE.Mesh(F.g, flameMat), smoke = new THREE.Mesh(S.g, smokeMat), embers = new THREE.Points(E.g, emberMat);
  for (const m of [flames, smoke, embers]) { m.frustumCulled = false; scene.add(m); }
  flames.renderOrder = 3; smoke.renderOrder = 2; embers.renderOrder = 4; smoke.name = 'fire-smoke'; flames.name = 'fire-flames';
  const lights = Array.from({ length: O.lights }, () => { const l = new THREE.PointLight(0xff8a3a, 0, 0, 2); l.castShadow = false; scene.add(l); return l; });

  const sources = new Set();
  let time = 0;
  const api = {
    sources,
    add(o) {
      const s = { at: [0, 0, 0], size: [1, 1], height: 1.5, power: 1, fuel: 'wood', acc: [0, 0, 0], flick: Math.random() * 100, ...o };
      s.at = Array.isArray(s.at) ? s.at.slice() : [s.at.x, s.at.y, s.at.z];
      s.set = (q) => { Object.assign(s, q); if (q.at) s.at = Array.isArray(q.at) ? q.at.slice() : [q.at.x, q.at.y, q.at.z]; return s; };
      s.remove = () => sources.delete(s);
      sources.add(s); return s;
    },
    update(dt, camera, env = {}) {
      time += dt; U.uTime.value = time;
      if (env.wind) U.uWind.value.fromArray(env.wind);
      if (env.light != null) smokeMat.uniforms.uLight.value = env.light;
      if (env.sky) smokeMat.uniforms.uSky.value.copy(env.sky);
      if (camera) emberMat.uniforms.uPx.value = (window.innerHeight || 800) / (2 * Math.tan((camera.fov || 50) * Math.PI / 360));
      // emisja: płomienie ~ pole^0,7 × moc × paliwo; dym i iskry osobno
      for (const s of sources) {
        if (s.power <= 0.001) continue;
        const Fu = FUELS[s.fuel] || FUELS.wood, area = Math.max(0.05, s.size[0] * s.size[1]);
        const fv = [Fu.flame[0], Fu.flame[1], Fu.flame[2], Fu.life];
        const H = Math.max(0.15, s.height), flLife = H / (1.5 * Math.sqrt(H) + 0.6) * Fu.life;
        s.acc[0] += dt * (10 + 22 * Math.pow(area, 0.7)) * s.power * Fu.rate / Math.max(0.25, flLife) * 0.55;
        s.acc[1] += dt * (1.5 + 3 * Math.pow(area, 0.6) + H) * s.power * Fu.smokeAmt * O.smokeScale;
        s.acc[2] += dt * (2 + 4 * Math.pow(area, 0.5)) * s.power * Fu.embers * O.emberScale;
        for (; s.acc[0] >= 1; s.acc[0]--) emit(F, s, time - Math.random() * dt, fv);
        for (; s.acc[1] >= 1; s.acc[1]--) emit(S, s, time - Math.random() * dt, [Fu.smoke[0], Fu.smoke[1], Fu.smoke[2], 1]);
        for (; s.acc[2] >= 1; s.acc[2]--) emit(E, s, time - Math.random() * dt, fv);
      }
      flush(F); flush(S); flush(E);
      // światła: najsilniejsze źródła blisko kamery
      const cp = camera ? camera.position : new THREE.Vector3();
      const best = [...sources].filter((s) => s.power > 0.02).map((s) => ({ s, k: s.power * s.height * Math.sqrt(s.size[0] * s.size[1] + 0.5) / (1 + Math.hypot(s.at[0] - cp.x, s.at[1] - cp.y, s.at[2] - cp.z) / 40) }))
        .sort((a, b) => b.k - a.k).slice(0, lights.length);
      lights.forEach((l, i) => {
        const b = best[i]; if (!b) { l.intensity = 0; return; }
        const s = b.s; s.flick += dt * (9 + 5 * Math.random());
        const fl = 0.78 + 0.14 * Math.sin(s.flick) + 0.08 * Math.sin(s.flick * 2.7 + 1.3) + (Math.random() - 0.5) * 0.08;
        l.position.set(s.at[0], s.at[1] + s.height * 0.45, s.at[2]);
        l.intensity = 9 * s.power * s.height * Math.sqrt(s.size[0] * s.size[1] + 0.3) * fl * O.glow;
        const Fu = FUELS[s.fuel] || FUELS.wood; l.color.setRGB(1, 0.5 * Fu.flame[1], 0.18 * Fu.flame[2]);
      });
    },
    set(o) { Object.assign(O, o); flameMat.uniforms.uGlow.value = O.glow; smokeMat.uniforms.uSmokeK.value = O.smokeScale; },
    counts() { const live = (P, life) => { let n = 0; for (let i = 0; i < P.n; i++) if (time - P.born[i] < life) n++; return n; }; return { sources: sources.size, flames: live(F, 3), smoke: live(S, 12), embers: live(E, 4) }; },
    clear() { sources.clear(); for (const P of [F, S, E]) { P.born.fill(-1e9); P.dirty = true; flush(P); } },
    dispose() { for (const m of [flames, smoke, embers]) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); } lights.forEach((l) => scene.remove(l)); sources.clear(); },
    objects: { flames, smoke, embers, lights },
  };
  return api;
}

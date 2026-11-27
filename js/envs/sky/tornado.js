// Trąba powietrzna i tornado: wir powietrza od chmury do ziemi — nad wodą trąba wodna (lejek nad morzem, wodny pył
// u podstawy), nad lądem tornado (lejek z kurzem i szczątkami); siła reguluje wszystko naraz (prędkość wiatru, szerokość
// rdzenia, grubość lejka, ilość pyłu). Wędruje po mapie. Część pogody: pole `tornado` pogody SkyKit ({ strength 0…1,
// kind: 'auto' | 'water' | 'land', at?: [x, z], heading?: stopnie — miejsce i kierunek startu), stage.setLight je stawia (js/labs/shared/stage.js), zmienna pogoda wywołuje je
// w burzy (js/envs/sky/weather-cycle.js).
//
// Wiatr (dla fizyki środowiska): wir Rankine'a — w rdzeniu (r < rc) obrót jak bryła sztywna, dalej słabnie jak 1/r;
// przy ziemi napływ do środka, w rdzeniu prąd wznoszący słabnący z wysokością. Prędkość maksymalna 18 m/s (słaba trąba
// wodna) … 100 m/s (silne tornado), promień rdzenia 10 … 120 m.
//   tornadoWind(T, x, y, z, out) → out [vx, vy, vz] m/s (T: { x, z, vmax, rc, base, top, spin })
//   vortexOf(strength) → { vmax, rc, top } — liczby wiru z siły
// createTornado(scene) → { set({ strength, kind, rc?, top?, vmax? } | null) (rc, top, vmax — wir na miarę zamiast liczb z siły), update(dt, camera, { isWater, groundAt, at }), windAt(x, y, z, out),
//   state (T albo null), kind ('water' | 'land' | null), dispose() }
import * as THREE from '../../../vendor/three/three.module.js';

export const TORNADO_DEFAULTS = { strength: 0.5, kind: 'auto' };
export const vortexOf = (s) => ({ vmax: 18 + 82 * s, rc: 10 + 110 * s, top: 650 + 350 * s });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function tornadoWind(T, x, y, z, out = [0, 0, 0]) {
  out[0] = out[1] = out[2] = 0;
  if (!T || T.vmax <= 0) return out;
  const dx = x - T.x, dz = z - T.z, r = Math.hypot(dx, dz), h = y - T.base;
  if (r > T.rc * 40 || h > T.top) return out;
  const rr = Math.max(r, 0.01), q = rr / T.rc;
  const vt = T.vmax * (q < 1 ? q : 1 / q) * T.fade;                       // wir Rankine'a
  const hk = clamp(1 - h / T.top, 0, 1);                                   // słabnie ku chmurze
  const ground = Math.exp(-Math.max(0, h) / (0.6 * T.rc + 20));            // warstwa przyziemna
  const vin = -0.45 * vt * ground;                                         // napływ do środka przy ziemi
  const vup = (q < 1.3 ? (1 - q / 1.3) : 0) * T.vmax * 0.65 * T.fade * (0.4 + 0.6 * hk) + 0.2 * vt * ground;   // prąd wznoszący
  const tx = -dz / rr * T.spin, tz = dx / rr * T.spin, nx = dx / rr, nz = dz / rr;
  out[0] = (tx * vt + nx * vin) * (0.35 + 0.65 * hk);
  out[2] = (tz * vt + nz * vin) * (0.35 + 0.65 * hk);
  out[1] = vup;
  return out;
}

/* ---------------- wygląd: lejek, chmura nad nim, pył albo wodny pył u podstawy ---------------- */
const FUNNEL_VS = /* glsl */`
uniform float uTime, uRc, uTop, uBend, uSpin; uniform vec2 uLean;
varying vec2 vUv; varying float vH; varying vec3 vW;
void main() {
  float h = position.y;                                                   // 0 ziemia … 1 chmura (wysokość: skala siatki = uTop)
  float a = atan(position.z, position.x);
  float r0 = uRc * (0.55 + 0.25 * sin(uTime * 0.7));
  float r = mix(r0, uRc * 3.2, pow(h, 2.4)) * (1.0 + 0.07 * sin(a * 3.0 + h * 9.0 - uTime * uSpin));
  vec3 p = vec3(cos(a) * r, position.y, sin(a) * r);
  p.xz += uLean * pow(h, 1.2) * uTop * 0.35 + uBend * vec2(sin(h * 5.0 + uTime * 0.4), cos(h * 4.0 + uTime * 0.33)) * uRc * 0.6 * (1.0 - h);
  vUv = vec2(a / 6.2832 + 0.5, h); vH = h;
  vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FUNNEL_FS = /* glsl */`
uniform float uTime, uSpin, uAlpha, uLight; uniform vec3 uCol, uFogCol; uniform float uFogDen;
varying vec2 vUv; varying float vH; varying vec3 vW;
float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 q = vec2(vUv.x * 7.0 - uTime * uSpin * 0.18 + vUv.y * 3.0, vUv.y * 14.0 - uTime * 0.9);   // pasma wirują i wznoszą się
  float n = vn(q) * 0.6 + vn(q * 2.3) * 0.3 + vn(q * 5.1) * 0.1;
  float edge = smoothstep(0.0, 0.05, vH) * (1.0 - smoothstep(0.85, 1.0, vH));
  float a = uAlpha * edge * (0.45 + 0.75 * n);
  vec3 c = uCol * (0.55 + 0.45 * n) * uLight;
  float d = length(vW - cameraPosition);
  c = mix(c, uFogCol, 1.0 - exp(-pow(d * uFogDen, 2.0)));
  gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;
const CLOUD_FS = /* glsl */`
uniform float uTime, uSpin, uAlpha, uLight; uniform vec3 uCol, uFogCol; uniform float uFogDen;
varying vec2 vUv; varying vec3 vW;
float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 c0 = vUv - 0.5; float r = length(c0) * 2.0, a = atan(c0.y, c0.x);
  vec2 q = vec2(a * 3.0 + r * 6.0 - uTime * uSpin * 0.05, r * 8.0 - uTime * 0.05);
  float n = vn(q) * 0.6 + vn(q * 2.7) * 0.4;
  float al = uAlpha * (1.0 - smoothstep(0.55, 1.0, r)) * (0.6 + 0.4 * n);
  vec3 c = uCol * (0.6 + 0.4 * n) * uLight;
  float d = length(vW - cameraPosition);
  c = mix(c, uFogCol, 1.0 - exp(-pow(d * uFogDen, 2.0)));
  gl_FragColor = vec4(c, al);
  #include <colorspace_fragment>
}`;
const CLOUD_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';

const DEBRIS = 900;
export function createTornado(scene) {
  const group = new THREE.Group(); group.name = 'tornado'; group.visible = false; scene.add(group);
  const U = { uTime: { value: 0 }, uRc: { value: 50 }, uTop: { value: 800 }, uBend: { value: 1 }, uSpin: { value: 1 }, uLean: { value: new THREE.Vector2(0.2, 0.1) },
    uAlpha: { value: 0.8 }, uLight: { value: 1 }, uCol: { value: new THREE.Color(0.35, 0.33, 0.31) }, uFogCol: { value: new THREE.Color(0.6, 0.62, 0.65) }, uFogDen: { value: 0.0004 } };
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 48, true).translate(0, 0.5, 0),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: FUNNEL_VS, fragmentShader: FUNNEL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  funnel.frustumCulled = false; group.add(funnel);
  const CU = { ...U, uAlpha: { value: 0.85 }, uCol: { value: new THREE.Color(0.18, 0.18, 0.2) } };
  const cloud = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: CU, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  cloud.frustumCulled = false; group.add(cloud);
  // pył / wodny pył u podstawy: cząstki krążą po spirali w górę (kąt, promień, wysokość, życie)
  const dp = new Float32Array(DEBRIS * 3), dg = new THREE.BufferGeometry(), seeds = new Float32Array(DEBRIS * 4);
  for (let i = 0; i < DEBRIS; i++) { seeds[i * 4] = Math.random() * 6.283; seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random(); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  // miękka okrągła drobina pyłu (kwadratowe punkty wyglądały jak konfetti)
  const dc = document.createElement('canvas'); dc.width = dc.height = 64;
  { const g = dc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const dm = new THREE.PointsMaterial({ size: 3, sizeAttenuation: true, color: 0x7a6650, transparent: true, opacity: 0.55, depthWrite: false, map: new THREE.CanvasTexture(dc) });
  const debris = new THREE.Points(dg, dm); debris.frustumCulled = false; group.add(debris);

  let T = null, def = null, kind = null, time = 0, heading = Math.random() * 6.283, want = 0, life = 0;
  const api = {
    get state() { return T; }, get kind() { return kind; }, group,
    // { strength, kind } — wir (siła: z niej wszystko); null — znika (gaśnie w kilka sekund)
    set(d) {
      if (!d || !(d.strength > 0)) { want = 0; return; }
      def = { ...TORNADO_DEFAULTS, ...d }; want = 1;
      const V = vortexOf(clamp(def.strength, 0, 1));
      if (d.rc > 0) V.rc = d.rc; if (d.top > 0) V.top = d.top; if (d.vmax > 0) V.vmax = d.vmax;   // wir na miarę (np. mała trąba gracza)
      if (!T) T = { x: 0, z: 0, base: 0, spin: 1, fade: 0, placed: false, ...V };
      // miejsce i kierunek startu (scena: trąba ma przejść przez miasto): at [x, z], heading w stopniach (0 — na +z, 90 — na +x)
      if (d.at && !T.placed) { T.x = d.at[0]; T.z = d.at[1]; T.placed = true; T.home = [T.x, T.z]; if (d.heading != null) heading = d.heading * Math.PI / 180; }
      Object.assign(T, V);
    },
    windAt(x, y, z, out) { return tornadoWind(T, x, y, z, out); },
    // dt; camera — gdzie postawić nowy wir (ok. 700 m przed kamerą); env: isWater(x, z), groundAt(x, z); at — punkt
    // (x, z) na siłę; light 0…1, fog { color, density }
    update(dt, camera, env = {}) {
      time += dt; U.uTime.value = time;
      if (!T) return;
      if (!T.placed && camera) {
        const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
        T.x = camera.position.x + f.x * 700 + f.z * 250; T.z = camera.position.z + f.z * 700 - f.x * 250; T.placed = true;
        heading = Math.atan2(camera.position.x - T.x, camera.position.z - T.z) + 0.8;   // idzie z boku, nie prosto na kamerę
        T.home = [T.x, T.z];
      }
      if (env.at) { T.x = env.at[0]; T.z = env.at[1]; }
      T.fade = clamp(T.fade + (want ? 1 : -1) * dt / 6, 0, 1);
      if (T.fade <= 0 && !want) { T = null; group.visible = false; kind = null; return; }
      // wędrówka: 6–15 m/s, kierunek błądzi; daleko od miejsca narodzin — zawraca
      const sp = 6 + 9 * def.strength;
      heading += (Math.sin(time * 0.13) * 0.08 + Math.sin(time * 0.041 + 1.7) * 0.05) * dt;
      if (T.home && Math.hypot(T.x - T.home[0], T.z - T.home[1]) > 2500) heading += 0.4 * dt;
      T.x += Math.sin(heading) * sp * dt; T.z += Math.cos(heading) * sp * dt;
      T.base = env.groundAt ? Math.max(0, env.groundAt(T.x, T.z)) : 0;
      const water = env.isWater ? env.isWater(T.x, T.z) : true;
      kind = def.kind === 'water' || def.kind === 'land' ? def.kind : water ? 'water' : 'land';
      // wygląd z siły i podłoża
      const s = def.strength, w = kind === 'water';
      group.visible = true; group.position.set(T.x, T.base, T.z);
      U.uRc.value = T.rc * (w ? 0.35 : 0.6); U.uTop.value = T.top; U.uSpin.value = 0.5 + 2.5 * s; U.uBend.value = w ? 1.4 : 0.6;
      U.uAlpha.value = (w ? 0.55 + 0.3 * s : 0.7 + 0.25 * s) * T.fade;
      U.uCol.value.setRGB(...(w ? [0.62, 0.65, 0.68] : [0.2 + 0.04 * s, 0.18, 0.16]));   // nad lądem ciemny od kurzu
      if (env.light != null) U.uLight.value = env.light;
      if (env.fog) { U.uFogCol.value.copy(env.fog.color); U.uFogDen.value = env.fog.density; }
      funnel.scale.set(1, T.top, 1);
      cloud.position.y = T.top; cloud.scale.setScalar(T.rc * 14); CU.uAlpha.value = 0.85 * T.fade;
      // cząstki: spirala w górę wokół podstawy; woda — biały pył, ląd — kurz i ciemne szczątki
      // rozmiar drobin i wysokość wznoszenia nie większe niż pozwala rdzeń (mała trąba ma mały pył)
      dm.color.setRGB(...(w ? [0.85, 0.88, 0.9] : [0.45, 0.38, 0.3])); dm.opacity = (w ? 0.35 : 0.6) * T.fade; dm.size = Math.min(w ? 4 + 4 * s : 2 + 3 * s, 0.35 + T.rc * 0.2);
      const rise = Math.min((w ? 40 : 60) + 140 * s, T.rc * 3 + 8), R = T.rc;
      for (let i = 0; i < DEBRIS; i++) {
        const a0 = seeds[i * 4], f = (seeds[i * 4 + 1] + time * (0.08 + 0.12 * seeds[i * 4 + 2])) % 1;
        const r = R * (0.4 + 2.2 * seeds[i * 4 + 3]) * (1 - 0.5 * f), ang = a0 + time * (T.vmax / Math.max(r, 5)) * 0.6;
        dp[i * 3] = Math.cos(ang) * r; dp[i * 3 + 1] = f * f * rise; dp[i * 3 + 2] = Math.sin(ang) * r;
      }
      dg.attributes.position.needsUpdate = true;
    },
    dispose() { scene.remove(group); funnel.geometry.dispose(); funnel.material.dispose(); cloud.geometry.dispose(); cloud.material.dispose(); dg.dispose(); dm.dispose(); },
  };
  return api;
}

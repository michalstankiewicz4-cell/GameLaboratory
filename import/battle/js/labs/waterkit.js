// WaterKit: a sea surface for the labs (and later the game) — Gerstner wave sets built from a sea-state description,
// the same wave function in GLSL and JS (so ships float on what is drawn), a physically motivated water shader
// (Fresnel sky or planar reflection, sun glitter, subsurface tint, crest foam, detail ripples, fog) and the ship's
// interaction with it: bow wave and Kelvin wake (shape and foam), hull contact foam, a wet band on the hull.
// Units: metres, seconds; y = 0 is the still waterline; the ship sits at the origin heading +z and the water streams
// past it (uShift), so the ship-relative effects are computed in the ship's frame.
import * as THREE from '../../vendor/three.module.js';

export const MAXW = 16;
const G = 9.81;

/* ---------------- sea states and looks ---------------- */
// Hs: significant wave height (m), Lp: peak wavelength (m), chop: steepness 0..1, spread: directional spread (deg)
export const SEAS = {
  calm: { label: 'Calm (Beaufort 2)', Hs: 0.3, Lp: 12, chop: 0.35, spread: 45, n: 10 },
  moderate: { label: 'Moderate (Beaufort 4)', Hs: 1.2, Lp: 34, chop: 0.55, spread: 40, n: 12 },
  rough: { label: 'Rough (Beaufort 6)', Hs: 3.2, Lp: 70, chop: 0.7, spread: 35, n: 12 },
  gale: { label: 'Gale (Beaufort 8)', Hs: 6.0, Lp: 115, chop: 0.85, spread: 30, n: 14 },
  swell: { label: 'Long swell, light wind', Hs: 2.0, Lp: 190, chop: 0.25, spread: 12, n: 10 },
};
export const LOOKS = {
  atlantic: { label: 'North Atlantic', deep: '#0a2536', scatter: '#1d6a68', shine: 900, ripples: 0.55, crest: 0.55 },
  baltic: { label: 'Baltic grey', deep: '#16272e', scatter: '#3a5c55', shine: 600, ripples: 0.45, crest: 0.5 },
  tropical: { label: 'Tropical', deep: '#03314d', scatter: '#11a3a0', shine: 1400, ripples: 0.6, crest: 0.45 },
  storm: { label: 'Storm slate', deep: '#121c22', scatter: '#2c4648', shine: 400, ripples: 0.7, crest: 0.7 },
};

// Builds a wave set: wavelengths spread (log) around the peak, amplitudes from a falloff, directions inside the
// spread, seeded phases; scaled so that Hs = 4·sqrt(Σ A²/2).
export function waveSet(sea, dirDeg = 30, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const n = Math.max(2, Math.min(MAXW, sea.n | 0)), waves = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const L = sea.Lp * Math.pow(0.12, u) * (1.6 - 0.6 * u) * (0.92 + 0.16 * rnd());       // from 1.6·Lp down to ~0.12·Lp
    const a = Math.pow(L / sea.Lp, 0.85);                                                   // longer = higher
    const ang = (dirDeg + (rnd() * 2 - 1) * sea.spread * (0.4 + 0.6 * u)) * Math.PI / 180;
    waves.push({ L, a, dx: Math.sin(ang), dz: Math.cos(ang), ph: rnd() * Math.PI * 2 });
  }
  const sum = Math.sqrt(waves.reduce((t, w) => t + w.a * w.a / 2, 0));
  for (const w of waves) {
    w.A = (w.a / sum) * sea.Hs / 4;
    w.k = 2 * Math.PI / w.L; w.w = Math.sqrt(G * w.k);
    w.Q = Math.min(1, sea.chop / (w.k * w.A * n + 1e-6));
  }
  return waves;
}

/* ---------------- the wave function (JS twin of the GLSL) ---------------- */
export function gerstner(waves, x, z, t, shift = 0) {
  let dx = 0, dy = 0, dz = 0;
  for (const w of waves) {
    const th = w.k * (w.dx * x + w.dz * (z + shift)) - w.w * t + w.ph, c = Math.cos(th), QA = w.Q * w.A;
    dx += QA * w.dx * c; dz += QA * w.dz * c; dy += w.A * Math.sin(th);
  }
  return [dx, dy, dz];
}
// Surface height above the fixed horizontal point (x, z): the Gerstner surface is shifted sideways, so invert it.
export function heightAt(waves, x, z, t, shift = 0) {
  let px = x, pz = z;
  for (let i = 0; i < 3; i++) { const d = gerstner(waves, px, pz, t, shift); px = x - d[0]; pz = z - d[2]; }
  return gerstner(waves, px, pz, t, shift)[1];
}

/* ---------------- GLSL ---------------- */
export const GLSL_WAVES = /* glsl */`
#define MAXW ${MAXW}
uniform vec4 uWA[MAXW];   // dir.x, dir.z, k, A
uniform vec4 uWB[MAXW];   // omega, phase, Q, -
uniform int uWN;
uniform float uTime, uShift;
vec3 gerstner(vec2 p, out vec3 nrm, out float fold) {
  vec3 d = vec3(p.x, 0.0, p.y); vec3 tx = vec3(1.0, 0.0, 0.0), tz = vec3(0.0, 0.0, 1.0); fold = 0.0;
  for (int i = 0; i < MAXW; i++) {
    if (i >= uWN) break;
    vec4 a = uWA[i], b = uWB[i];
    float th = a.z * dot(a.xy, p + vec2(0.0, uShift)) - b.x * uTime + b.y;
    float c = cos(th), s = sin(th), QA = b.z * a.w, WA = a.z * a.w;
    d.x += QA * a.x * c; d.z += QA * a.y * c; d.y += a.w * s;
    tx += vec3(-b.z * a.x * a.x * WA * s, a.x * WA * c, -b.z * a.x * a.y * WA * s);
    tz += vec3(-b.z * a.x * a.y * WA * s, a.y * WA * c, -b.z * a.y * a.y * WA * s);
    fold += b.z * WA * s;
  }
  nrm = normalize(cross(tz, tx));
  return d;
}
float waveHeight(vec2 p) { vec3 n; float f; vec3 d = gerstner(p, n, f); return d.y; }
`;

// ship frame: hull half-breadth at the waterline from a 1-D texture, speed, bow and stern positions
export const GLSL_SHIP = /* glsl */`
uniform sampler2D uHull;
uniform vec4 uHullZ;      // zMin, zMax, max half-breadth, -
uniform vec4 uShip;       // speed (m/s), bow z, stern z, half beam
uniform vec4 uShipFx;     // bow wave, wake, hull foam, - (0/1)
float hullHW(float z) {
  float u = (z - uHullZ.x) / (uHullZ.y - uHullZ.x);
  if (u < 0.0 || u > 1.0) return -1.0;
  return texture2D(uHull, vec2(u, 0.5)).r * uHullZ.z;
}
// extra surface height made by the moving hull: bow wave crest, Kelvin transverse waves, hull-side trough
float shipWave(vec2 p) {
  float v = uShip.x; if (v < 0.3 || uShipFx.x < 0.5) return 0.0;
  float ub = uShip.y - p.y, ax = abs(p.x), hw = hullHW(p.y), h = 0.0;
  float side = max(ax - max(hw, 0.0), 0.0);
  h += 0.0032 * v * v * exp(-pow((ub - 5.0) / 7.0, 2.0)) * exp(-side / 3.5);             // bow wave along the flare
  if (ub > 0.0) {
    float lam = 6.2832 * v * v / 9.81;                                                    // transverse wavelength
    float edge = smoothstep(ub * 0.3536 + 4.0, ub * 0.3536 - 6.0, ax);
    h += 0.0011 * v * v * cos(6.2832 * ub / lam) * exp(-ub / 260.0) * edge;
    float arm = abs(ax - ub * 0.3536);                                                    // divergent (cusp) crests
    h += 0.0009 * v * v * exp(-arm * arm / (4.0 + ub * 0.08)) * exp(-ub / 320.0) * (0.6 + 0.4 * cos(ub * 0.9));
  }
  if (hw > 0.0) h -= 0.0005 * v * v * exp(-side / 3.0) * smoothstep(uShip.y - 10.0, uShip.y - 30.0, p.y) * smoothstep(uShip.z + 2.0, uShip.z + 20.0, p.y);
  return h;
}
float shipFoam(vec2 p, float n) {
  float v = uShip.x, vk = clamp(v / 18.0, 0.0, 1.4), f = 0.0;
  float ax = abs(p.x), hw = hullHW(p.y), ub = uShip.y - p.y, us = uShip.z - p.y;
  if (uShipFx.y > 0.5 && v > 0.3) {
    if (us > -2.0) { float u2 = max(us, 0.0), w = uShip.w * 0.85 + u2 * 0.032 + sqrt(u2) * 0.35;   // turbulent wake
      float core = smoothstep(w, w * 0.2, ax), age = exp(-u2 / (70.0 + 380.0 * vk));
      f += core * age * smoothstep(0.3 + 0.45 * (1.0 - age), 0.95, n + 0.2) * 0.95 * vk; }
    if (ub > 0.0) { float arm = abs(ax - ub * 0.3536), bw = 0.8 + ub * 0.018;                // Kelvin arms: faint, broken
      f += smoothstep(bw, 0.0, arm) * exp(-ub / (60.0 + 140.0 * vk)) * smoothstep(0.55, 0.95, n + 0.15 * vk) * 0.7 * vk; }
  }
  if (uShipFx.z > 0.5 && hw > 0.0) {                                                        // hull contact foam
    float d = ax - hw, bowk = smoothstep(uShip.y - 34.0, uShip.y, p.y);
    f += smoothstep(0.5 + 2.2 * vk * (0.4 + bowk), 0.0, d) * (0.12 + 0.75 * vk * (0.35 + bowk)) * smoothstep(0.2, 0.75, n + 0.15 * bowk);
  }
  return clamp(f, 0.0, 1.0);
}
`;

/* ---------------- textures ---------------- */
function valueNoise(N, octaves, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = new Float32Array(N * N);
  for (let o = 0; o < octaves; o++) {
    const g = 4 << o, grid = new Float32Array(g * g).map(() => rnd()), amp = Math.pow(0.55, o);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / N * g, fy = y / N * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const v = (a, b) => grid[((b % g + g) % g) * g + ((a % g + g) % g)];
      out[y * N + x] += amp * ((v(x0, y0) * (1 - sx) + v(x0 + 1, y0) * sx) * (1 - sy) + (v(x0, y0 + 1) * (1 - sx) + v(x0 + 1, y0 + 1) * sx) * sy);
    }
  }
  let mn = Infinity, mx = -Infinity; out.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); });
  return out.map((v) => (v - mn) / (mx - mn));
}
let _tex = null;
export function waterTextures() {
  if (_tex) return _tex;
  const N = 256;
  // detail normal map: sum of random sine ripples (tileable)
  const h = new Float32Array(N * N);
  let s = 3;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 48; k++) {
    const fx = (1 + Math.floor(rnd() * 9)) * (rnd() < 0.5 ? 1 : -1), fy = Math.floor(rnd() * 9) + 1, ph = rnd() * 6.28, a = 1 / Math.hypot(fx, fy);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += a * Math.sin(((fx * x + fy * y) / N) * 6.2832 + ph);
  }
  const nd = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x], i = (y * N + x) * 4;
    nd[i] = 128 + dx * 70; nd[i + 1] = 128 + dy * 70; nd[i + 2] = 255; nd[i + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, N, N); normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.magFilter = THREE.LinearFilter;
  normal.minFilter = THREE.LinearMipmapLinearFilter; normal.generateMipmaps = true; normal.needsUpdate = true;
  const fn = valueNoise(N, 5, 11), fd = new Uint8Array(N * N * 4);
  fn.forEach((v, i) => { fd[i * 4] = fd[i * 4 + 1] = fd[i * 4 + 2] = v * 255; fd[i * 4 + 3] = 255; });
  const foam = new THREE.DataTexture(fd, N, N); foam.wrapS = foam.wrapT = THREE.RepeatWrapping; foam.magFilter = THREE.LinearFilter;
  foam.minFilter = THREE.LinearMipmapLinearFilter; foam.generateMipmaps = true; foam.needsUpdate = true;
  _tex = { normal, foam };
  return _tex;
}

// 1-D hull half-breadth texture (waterline) from ShipKit lines
export function hullTexture(lines, n = 256) {
  const z0 = lines.zStern - 1, z1 = lines.zBow + 1, data = new Uint8Array(n * 4);
  let mx = 0; const v = [];
  for (let i = 0; i < n; i++) { const z = z0 + (z1 - z0) * i / (n - 1); const w = z < lines.zStern || z > lines.zBow ? 0 : Math.max(0, lines.hw(z)); v.push(w); mx = Math.max(mx, w); }
  v.forEach((w, i) => { data[i * 4] = Math.round(w / mx * 255); data[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(data, n, 1); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return { tex: t, z0, z1, max: mx };
}

/* ---------------- shared uniforms ---------------- */
// One uniform block per water variant; the water material and the hull's wet band read the same objects.
export function waterUniforms() {
  const tex = waterTextures();
  return {
    uWA: { value: Array.from({ length: MAXW }, () => new THREE.Vector4()) },
    uWB: { value: Array.from({ length: MAXW }, () => new THREE.Vector4()) },
    uWN: { value: 0 }, uTime: { value: 0 }, uShift: { value: 0 },
    uHull: { value: null }, uHullZ: { value: new THREE.Vector4(-60, 60, 6, 0) },
    uShip: { value: new THREE.Vector4(0, 54, -56, 5.6) }, uShipFx: { value: new THREE.Vector4(1, 1, 1, 0) },
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },
    uSkyH: { value: new THREE.Color() }, uSkyZ: { value: new THREE.Color() }, uSkySea: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() }, uScatter: { value: new THREE.Color() },
    uShine: { value: 900 }, uRipples: { value: 0.5 }, uCrest: { value: 0.5 }, uReflect: { value: 1 }, uPlanar: { value: 0 },
    uReflTex: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAlpha: { value: 1 }, uPixelN: { value: 1 },
    uFogCol: { value: new THREE.Color() }, uFogFar: { value: 2600 }, uFogDen: { value: 0 }, uRain: { value: 0 }, uLight: { value: 1 }, uWet: { value: 0.7 }, uWetOn: { value: 1 },
    uFlash: { value: new THREE.Vector4(0, 0, 0, 0) },   // point flash on the sea: position, power (gun flashes, lightning)
    tNormal: { value: tex.normal }, tFoam: { value: tex.foam },
  };
}
export function setWaves(u, waves) {
  u.uWN.value = waves.length;
  waves.forEach((w, i) => { u.uWA.value[i].set(w.dx, w.dz, w.k, w.A); u.uWB.value[i].set(w.w, w.ph, w.Q, 0); });
}

/* ---------------- water surface ---------------- */
// Polar grid centred under the camera: rings grow geometrically, so cells are small near and large far away.
export function polarGrid(segments = 192, rings = 160, r0 = 0.6, r1 = 6000) {
  const pos = [], idx = [];
  pos.push(0, 0, 0);
  const q = Math.pow(r1 / r0, 1 / (rings - 1));
  for (let r = 0; r < rings; r++) {
    const rad = r0 * Math.pow(q, r);
    for (let s = 0; s < segments; s++) { const a = s / segments * Math.PI * 2; pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad); }
  }
  for (let s = 0; s < segments; s++) idx.push(0, 1 + (s + 1) % segments, 1 + s);
  for (let r = 0; r < rings - 1; r++) for (let s = 0; s < segments; s++) {
    const a = 1 + r * segments + s, b = 1 + r * segments + (s + 1) % segments, c = a + segments, d = b + segments;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), r1 + 50);
  return g;
}

// opt.sky: GLSL defining skyColor(d) (SkyKit) — reflections then show the same clouds as the sky dome
export function waterMaterial(u, opt = {}) {
  return new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: true,
    vertexShader: GLSL_WAVES + GLSL_SHIP + /* glsl */`
      varying vec3 vWorld; varying vec3 vN; varying float vFold; varying vec2 vXZ; varying float vShipH;
      void main() {
        vec2 p = (modelMatrix * vec4(position, 1.0)).xz;
        float fold; vec3 n; vec3 d = gerstner(p, n, fold);
        float sh = shipWave(p);
        float e = 0.8, sx = shipWave(p + vec2(e, 0.0)) - sh, sz = shipWave(p + vec2(0.0, e)) - sh;   // ship wave slope
        n = normalize(n + vec3(-sx / e, 0.0, -sz / e));
        vec3 wp = vec3(d.x, d.y + sh, d.z);
        vWorld = wp; vN = n; vFold = fold; vXZ = p; vShipH = sh;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: GLSL_WAVES + GLSL_SHIP + /* glsl */`
      uniform vec3 uSun, uSunCol, uSkyH, uSkyZ, uSkySea, uDeep, uScatter, uFogCol;
      uniform float uShine, uRipples, uCrest, uReflect, uPlanar, uAlpha, uPixelN, uFogFar, uFogDen, uRain, uLight;
      uniform sampler2D uReflTex, tNormal, tFoam; uniform vec2 uRes; uniform vec4 uFlash;
      varying vec3 vWorld; varying vec3 vN; varying float vFold; varying vec2 vXZ; varying float vShipH;
      ${opt.sky ? opt.sky + '\n      vec3 sky(vec3 d) { return skyColor(d); }' : `vec3 sky(vec3 d) {
        float h = d.y; vec3 c = h > 0.0 ? mix(uSkyH, uSkyZ, pow(h, 0.5)) : mix(uSkyH, uSkySea, clamp(-h * 6.0, 0.0, 1.0));
        float s = max(dot(d, uSun), 0.0); return c + uSunCol * pow(s, 10.0) * 0.25;
      }`}
      void main() {
        float dist = length(cameraPosition - vWorld);
        vec3 N = vN; float fold = vFold;
        if (uPixelN > 0.5 && dist < 900.0) { vec3 n2; float f2; gerstner(vXZ, n2, f2);
          float sh = vShipH, e = 0.8; vec2 sl = vec2(shipWave(vXZ + vec2(e, 0.0)) - sh, shipWave(vXZ + vec2(0.0, e)) - sh) / e;
          N = normalize(n2 + vec3(-sl.x, 0.0, -sl.y)); fold = f2; }
        // detail ripples (two scrolling layers), fading with distance
        vec2 q = vXZ + vec2(0.0, uShift);
        vec3 r1 = texture2D(tNormal, q / 9.0 + vec2(uTime * 0.012, uTime * 0.02)).xyz * 2.0 - 1.0;
        vec3 r2 = texture2D(tNormal, q / 23.0 - vec2(uTime * 0.017, -uTime * 0.008)).xyz * 2.0 - 1.0;
        vec2 rip = (r1.xy + r2.xy) * uRipples * 0.35 * exp(-dist / 350.0);
        N = normalize(N + vec3(rip.x, 0.0, rip.y));
        // rain: expanding rings from drops (two layers of cells, each cell one drop with its own phase) and a fine roughening
        if (uRain > 0.0 && dist < 80.0) {
          vec2 rr = vec2(0.0);
          for (int l = 0; l < 2; l++) {
            vec2 g = vXZ * (l == 0 ? 2.2 : 3.1) + float(l) * 7.3, ci = floor(g), cf = fract(g) - 0.5;
            float h1 = fract(sin(dot(ci, vec2(127.1, 311.7))) * 43758.5453), h2 = fract(sin(dot(ci, vec2(269.5, 183.3))) * 43758.5453);
            vec2 c = vec2(h1, h2) * 0.6 - 0.3;
            float t = fract(uTime * (0.9 + h1 * 0.6) + h2), on = step(h1 * 0.7 + 0.3, uRain + 0.25);
            vec2 dv = cf - c; float r = length(dv), ring = r - t * 0.45;
            float w = exp(-ring * ring * 900.0) * (1.0 - t) * on;
            rr += dv / max(r, 1e-3) * w * sin(ring * 60.0);
          }
          N = normalize(N + vec3(rr.x, 0.0, rr.y) * 0.6 * uRain * exp(-dist / 30.0));
        }
        vec3 V = normalize(cameraPosition - vWorld), L = normalize(uSun);
        float NdV = max(dot(N, V), 0.0);
        float F = (0.02 + 0.98 * pow(1.0 - NdV, 5.0)) * uReflect;
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = sky(R);
        if (uPlanar > 0.5) { vec2 uv = gl_FragCoord.xy / uRes + N.xz * 0.04; uv.x = clamp(uv.x, 0.001, 0.999); uv.y = clamp(uv.y, 0.001, 0.999);
          vec4 pr = texture2D(uReflTex, uv); refl = mix(refl, pr.rgb, pr.a); }
        // water body: deep colour lit by the sky, light scattered through wave crests towards the viewer
        float sunUp = clamp(L.y * 1.6, 0.0, 1.0);
        vec3 body = uDeep * (0.35 + 0.65 * sunUp);
        float thick = clamp((vWorld.y + 0.6) * 0.45, 0.0, 1.0);
        float sss = pow(max(dot(V, -vec3(L.x, 0.0, L.z) * 0.9 + vec3(0.0, 0.25, 0.0)), 0.0), 3.0) * thick + thick * 0.25;
        body += uScatter * sss * (0.4 + 0.6 * sunUp);
        body *= uLight;                                          // daylight (dusk and night darken the water body)
        vec3 col = mix(body, refl, F);
        // sun glitter
        vec3 H = normalize(L + V); float spec = pow(max(dot(N, H), 0.0), uShine) * (uShine / 60.0) * smoothstep(-0.02, 0.08, L.y);
        col += uSunCol * spec * 1.6;
        // foam: crests (fold of the Gerstner surface) and the ship's foam
        float fn = texture2D(tFoam, q / 14.0).r, fn2 = texture2D(tFoam, q / 3.5 + vec2(0.31, 0.77)).r;
        float noise = fn * 0.65 + fn2 * 0.35;
        float crest = smoothstep(1.0 - uCrest * 0.55, 1.15 - uCrest * 0.5, fold + noise * 0.35) * uCrest;
        float foam = clamp(crest + shipFoam(vXZ, noise), 0.0, 1.0);
        foam *= smoothstep(0.15, 0.55, noise + foam * 0.5);
        vec3 foamCol = vec3(0.92, 0.95, 0.96) * (0.45 + 0.55 * max(dot(N, L), 0.0) * sunUp + 0.15) * uLight;
        col = mix(col, foamCol, foam * 0.9);
        // a point flash (gun or lightning) lighting the water and its foam
        if (uFlash.w > 0.0) {
          vec3 fv = uFlash.xyz - vWorld; float fd2 = dot(fv, fv); vec3 FL = fv * inversesqrt(fd2);
          float fl = uFlash.w / (fd2 + 4.0);
          col += vec3(1.0, 0.72, 0.45) * fl * (0.03 * max(dot(N, FL), 0.0) + foam * 0.25 + pow(max(dot(N, normalize(FL + V)), 0.0), 120.0) * 2.0);
        }
        // aerial perspective
        float fog = uFogDen > 0.0 ? 1.0 - exp(-pow(dist * uFogDen, 2.0)) : smoothstep(uFogFar * 0.25, uFogFar, dist);
        col = mix(col, uFogCol, fog);
        gl_FragColor = vec4(col, mix(uAlpha, 1.0, max(F, foam)));
      }`,
  });
}

// Wet band on a hull material: darker, glossier paint up to where the water has recently reached.
export function addWetHull(material, u) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    for (const k of ['uWA', 'uWB', 'uWN', 'uTime', 'uShift', 'uHull', 'uHullZ', 'uShip', 'uShipFx', 'uWet', 'uWetOn']) sh.uniforms[k] = u[k];
    sh.vertexShader = 'varying vec3 vWorldW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = GLSL_WAVES + GLSL_SHIP + 'uniform float uWet, uWetOn; varying vec3 vWorldW;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat wl = waveHeight(vWorldW.xz) + shipWave(vWorldW.xz);\nfloat wet = uWetOn * smoothstep(wl + uWet, wl, vWorldW.y);\ndiffuseColor.rgb *= 1.0 - 0.45 * wet;\nroughnessFactor = mix(roughnessFactor, 0.18, wet);');
  };
  material.customProgramCacheKey = () => 'wet-hull';
  material.needsUpdate = true;
}

// SkyKit: a procedural sky with a cloud layer — the weather's look and the scene's light in one place.
// The same GLSL (skyColor) draws the sky dome, the sea's reflections and, through a PMREM pass, the reflections and
// ambient light of every PBR material, so ship, sea and sky always agree. Units: directions (unit vectors), y up.
import * as THREE from '../../vendor/three.module.js';

// weather presets: cloud coverage 0..1, density (how dark and thick), haze (horizon), wind (m/s, moves the clouds)
export const WEATHER = {
  clear: { label: 'Clear', coverage: 0.08, density: 0.25, haze: 0.18, wind: 4, scale: 1.0 },
  fair: { label: 'Fair weather cumulus', coverage: 0.35, density: 0.35, haze: 0.25, wind: 6, scale: 1.0 },
  broken: { label: 'Broken clouds', coverage: 0.6, density: 0.55, haze: 0.3, wind: 9, scale: 0.9 },
  overcast: { label: 'Overcast', coverage: 0.86, density: 0.72, haze: 0.42, wind: 11, scale: 0.8 },
  storm: { label: 'Storm', coverage: 0.97, density: 0.95, haze: 0.6, wind: 18, scale: 0.7 },
};

export function skyUniforms() {
  return {
    uSkySun: { value: new THREE.Vector3(0, 1, 0) }, uSkySunCol: { value: new THREE.Color(1, 0.95, 0.85) },
    uSkyHor: { value: new THREE.Color(0xc9d7e2) }, uSkyZen: { value: new THREE.Color(0x3d6c9a) }, uSkyLow: { value: new THREE.Color(0x1d3a4c) },
    uCloud: { value: new THREE.Vector4(0.4, 0.4, 1, 0.3) },          // coverage, density, scale, haze
    uCloudOff: { value: new THREE.Vector2() },
  };
}

export const GLSL_SKY = /* glsl */`
uniform vec3 uSkySun, uSkySunCol, uSkyHor, uSkyZen, uSkyLow;
uniform vec4 uCloud; uniform vec2 uCloudOff;
float skHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float skNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(skHash(i), skHash(i + vec2(1, 0)), f.x), mix(skHash(i + vec2(0, 1)), skHash(i + vec2(1, 1)), f.x), f.y); }
float skFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * skNoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
// cloud cover along direction d (0 clear … 1 thick) and how lit its underside is
vec2 skClouds(vec3 d) {
  if (d.y < 0.005) return vec2(0.0);
  vec2 p = d.xz / (d.y + 0.08) * 0.9 * uCloud.z + uCloudOff;
  float n = skFbm(p * 0.38) * 0.62 + skFbm(p * 1.6 + 3.7) * 0.28 + skFbm(p * 5.0 + 1.1) * 0.1;
  float cov = uCloud.x;
  float c = smoothstep(1.0 - cov - 0.05, 1.0 - cov + 0.22, n);
  float lit = clamp((skFbm(p * 0.38 + uSkySun.xz * 0.5) - n) * 2.2 + 0.5, 0.0, 1.0);   // the sun side of each cloud is brighter
  return vec2(c * smoothstep(0.005, 0.12, d.y), lit);
}
vec3 skyColor(vec3 d) {
  float h = d.y, s = max(dot(d, uSkySun), 0.0), cov = uCloud.x, den = uCloud.y, haze = uCloud.w;
  vec3 zen = mix(uSkyZen, uSkyHor * 0.82, cov * 0.85);                 // overcast: the blue goes grey
  vec3 col = h > 0.0 ? mix(uSkyHor, zen, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(uSkyHor, uSkyLow, clamp(-h * 6.0, 0.0, 1.0));
  vec2 cl = skClouds(d);
  float shade = mix(0.95, 0.3, den) * (0.45 + 0.75 * cl.y) * mix(1.0, 0.7, smoothstep(0.6, 1.0, cl.x) * den);
  vec3 cloud = mix(uSkyHor * 0.3 + vec3(0.03, 0.035, 0.045), vec3(1.0, 0.99, 0.97), shade) * mix(1.0, 0.72, den * cov);
  cloud += uSkySunCol * pow(s, 6.0) * (cl.x * (1.0 - cl.x)) * 3.2 * (1.0 - den * 0.6);     // silver lining
  cloud += uSkySunCol * pow(s, 3.0) * 0.18 * cl.y;
  col = mix(col, cloud, cl.x);
  col = mix(col, uSkyHor, smoothstep(0.18 + haze * 0.2, 0.0, abs(h)) * haze);              // haze at the horizon
  float through = 1.0 - smoothstep(0.15, 0.85, cl.x);                                         // sun through thin cloud
  col += uSkySunCol * (pow(s, 1800.0) * 60.0 * through + pow(s, 12.0) * 0.35 * (0.4 + 0.6 * through));
  return col;
}
`;

export function skyDome(u, radius = 4000) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: GLSL_SKY + 'varying vec3 vD;void main(){gl_FragColor=vec4(skyColor(normalize(vD)),1.);}',
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat); m.frustumCulled = false;
  return m;
}

// Sets the sky for a sun position and weather; returns the light that goes with it (sun, ambient, fog).
export function applySky(u, { sunEl = 28, sunAz = 150, coverage = 0.4, density = 0.4, scale = 1, haze = 0.3 } = {}) {
  const el = THREE.MathUtils.degToRad(sunEl), az = THREE.MathUtils.degToRad(sunAz);
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  const low = 1 - Math.min(1, el / 0.45);
  const sunCol = new THREE.Color(1, 0.94 - low * 0.3, 0.86 - low * 0.55);
  u.uSkySun.value.copy(dir); u.uSkySunCol.value.copy(sunCol);
  const hor = new THREE.Color(0xc9d7e2).lerp(new THREE.Color(0xe8b48a), low * 0.55).lerp(new THREE.Color(0x9aa3aa), coverage * density * 0.8);
  u.uSkyHor.value.copy(hor);
  u.uSkyZen.value.set(0x3d6c9a).lerp(new THREE.Color(0x2a3a52), low * 0.4);
  u.uSkyLow.value.set(0x1d3a4c).lerp(new THREE.Color(0x1a2328), coverage * 0.6);
  u.uCloud.value.set(coverage, density, scale, haze);
  const shadow = 1 - coverage * density * 0.85;
  return {
    sunDir: dir, sunColor: sunCol, sunIntensity: 3.3 * Math.max(0.05, shadow) * (0.35 + 0.65 * Math.min(1, el / 0.35)),
    ambient: 0.22 + coverage * 0.25, sky: hor.clone().lerp(new THREE.Color(0xdfe6ec), 0.3), ground: new THREE.Color(0x2a3a46),
    fog: hor.clone(), fogFar: 3600 - haze * 2400,
  };
}

// Environment map from the sky (reflections and image-based light for PBR materials)
export function skyEnvironment(renderer, u) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: u,
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: GLSL_SKY + 'varying vec3 vD;void main(){gl_FragColor=vec4(skyColor(normalize(vD)),1.);}',
  })));
  const rt = pm.fromScene(s, 0.02);
  pm.dispose();
  return rt;
}

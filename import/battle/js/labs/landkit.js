// LandKit: procedural land and sea for the labs and, later, the game. Units: metres; y = 0 is sea level.
//  generateTerrain(opt)   heightmap (Float32Array res×res, metres) from periodic noise, so the map can wrap around
//                         (a torus: sail out of one side, in at the other) without a seam; or a bounded map with a
//                         barrier. Shapes: islands, archipelago, coast (a continent on one side), fjords, highlands.
//                         The land share is exact (the sea level is set at the quantile), from 0 % to 100 % land.
//                         Droplet erosion carves valleys and fans; the sea floor gets a shelf near the coast.
//  heightTexture(t)       half-float texture of the heights (repeat for a torus, clamp for a bounded map).
//  terrainMeshes(t, tex)  two camera-centred grids snapped to the heightmap's texels (a fine one near the camera and a
//                         coarse one to the horizon) displaced in the vertex shader, shaded by height and slope (sand,
//                         wet sand, grass, scrub, rock, snow; sea floor from sand to mud). One draw call each.
//  sampleHeight(t, x, z)  the same height in JS (bilinear, wrap or clamp) for ships, grounding and cameras.
import * as THREE from '../../vendor/three.module.js';

/* ---------------- noise (periodic: every octave repeats across the map) ---------------- */
function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// gradient noise with integer period P (in lattice cells): x, y in lattice units; returns about -1..1
function pnoise(x, y, P, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const g = (ix, iy, dx, dy) => {
    const a = hash2(((ix % P) + P) % P, ((iy % P) + P) % P, seed) * Math.PI * 2;
    return Math.cos(a) * dx + Math.sin(a) * dy;
  };
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const n00 = g(x0, y0, fx, fy), n10 = g(x0 + 1, y0, fx - 1, fy), n01 = g(x0, y0 + 1, fx, fy - 1), n11 = g(x0 + 1, y0 + 1, fx - 1, fy - 1);
  return 1.41 * ((n00 + (n10 - n00) * u) + ((n01 + (n11 - n01) * u) - (n00 + (n10 - n00) * u)) * v);
}
// fbm over the unit square (u, v in 0..1), base frequency F cells, octaves, persistence; ridged = sharp crests
function fbm(u, v, F, oct, pers, seed, ridged = false) {
  let s = 0, a = 1, norm = 0, f = F, prev = 1;
  for (let i = 0; i < oct; i++) {
    let n = pnoise(u * f, v * f, f, seed + i * 101);
    if (ridged) { n = 1 - Math.abs(n); n = n * n * prev; prev = Math.min(1, n * 1.6); n = n * 2 - 0.6; }
    s += n * a; norm += a; a *= pers; f *= 2;
  }
  return s / norm;
}

export const SHAPES = {
  islands: { label: 'Islands', F: 4, ridge: 0, warp: 0.06 },
  archipelago: { label: 'Archipelago', F: 9, ridge: 0, warp: 0.04 },
  coast: { label: 'Coast (land on one side)', F: 3, ridge: 0.15, warp: 0.08, continent: 1 },
  fjords: { label: 'Fjords', F: 3, ridge: 0.85, warp: 0.05 },
  highlands: { label: 'Highlands', F: 2, ridge: 0.6, warp: 0.07 },
};
export const TERRAIN_DEFAULTS = { seed: 1939, res: 512, size: 8000, land: 0.35, shape: 'islands', relief: 380, depth: 70, rough: 0.5, erosion: 0.5, wrap: true, barrier: 'buoys' };

/* ---------------- hydraulic erosion (water droplets) ---------------- */
function erode(H, N, drops, wrap, seed) {
  let s = seed >>> 0; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const at = (x, y) => (wrap ? H[(((y % N) + N) % N) * N + (((x % N) + N) % N)] : H[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))]);
  const add = (x, y, v) => { if (wrap) { x = ((x % N) + N) % N; y = ((y % N) + N) % N; } else if (x < 0 || y < 0 || x >= N || y >= N) return; H[y * N + x] += v; };
  const grad = (px, py) => {
    const x = Math.floor(px), y = Math.floor(py), u = px - x, v = py - y;
    const a = at(x, y), b = at(x + 1, y), c = at(x, y + 1), d = at(x + 1, y + 1);
    return [(b - a) * (1 - v) + (d - c) * v, (c - a) * (1 - u) + (d - b) * u, a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v];
  };
  const inertia = 0.05, capK = 4, minCap = 0.01, dep = 0.3, ero = 0.3, evap = 0.02, gravity = 4;
  for (let i = 0; i < drops; i++) {
    let px = rnd() * N, py = rnd() * N, dx = 0, dy = 0, sp = 1, water = 1, sed = 0;
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(px), y = Math.floor(py), u = px - x, v = py - y;
      const [gx, gy, h0] = grad(px, py);
      dx = dx * inertia - gx * (1 - inertia); dy = dy * inertia - gy * (1 - inertia);
      const l = Math.hypot(dx, dy); if (l < 1e-9) break; dx /= l; dy /= l;
      px += dx; py += dy;
      if (!wrap && (px < 0 || py < 0 || px >= N - 1 || py >= N - 1)) break;
      const h1 = grad(px, py)[2], dh = h1 - h0;
      const cap = Math.max(-dh * sp * water * capK, minCap);
      if (sed > cap || dh > 0) {                            // deposit (or fill the pit it is climbing out of)
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * dep; sed -= amt;
        add(x, y, amt * (1 - u) * (1 - v)); add(x + 1, y, amt * u * (1 - v)); add(x, y + 1, amt * (1 - u) * v); add(x + 1, y + 1, amt * u * v);
      } else {                                              // erode (a little around the spot)
        const amt = Math.min((cap - sed) * ero, -dh); sed += amt;
        add(x, y, -amt * (1 - u) * (1 - v)); add(x + 1, y, -amt * u * (1 - v)); add(x, y + 1, -amt * (1 - u) * v); add(x + 1, y + 1, -amt * u * v);
      }
      sp = Math.sqrt(Math.max(0, sp * sp + dh * -gravity)); water *= 1 - evap;
    }
  }
}

export function generateTerrain(opt = {}) {
  const o = { ...TERRAIN_DEFAULTS, ...opt }, t0 = performance.now();
  const N = o.res | 0, S = SHAPES[o.shape] || SHAPES.islands, seed = o.seed | 0;
  const raw = new Float32Array(N * N);
  const oct = Math.max(3, Math.min(9, Math.round(Math.log2(N / S.F)) - 1)), pers = 0.4 + o.rough * 0.22;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let u = (i + 0.5) / N, v = (j + 0.5) / N;
    // domain warp (periodic too) for natural, wandering coastlines
    u += fbm(u, v, 2, 3, 0.5, seed + 7) * S.warp; v += fbm(u + 0.37, v + 0.71, 2, 3, 0.5, seed + 11) * S.warp;
    let n = fbm(u, v, S.F, oct, pers, seed);
    if (S.ridge) n = n * (1 - S.ridge) + fbm(u, v, S.F, oct, pers, seed + 31, true) * S.ridge;
    if (S.continent) n += 0.55 * Math.cos(2 * Math.PI * (u - 0.25));    // a continent on one side, open sea on the other (periodic)
    raw[j * N + i] = n;
  }
  // normalise to 0..1, erode, normalise again
  let mn = Infinity, mx = -Infinity; for (const v of raw) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let k = 0; k < raw.length; k++) raw[k] = (raw[k] - mn) / (mx - mn);
  const drops = Math.round(o.erosion * N * N * 0.35);
  if (drops > 0) erode(raw, N, drops, o.wrap, seed + 99);
  // sea level at the quantile that gives the requested land share
  const sorted = Float32Array.from(raw).sort();
  const land = Math.min(1, Math.max(0, o.land));
  const lo = sorted[0], hi = sorted[sorted.length - 1];
  const thr = land >= 1 ? lo - 1e-6 : land <= 0 ? hi + 1e-6 : sorted[Math.min(sorted.length - 1, Math.floor((1 - land) * sorted.length))];
  const h = new Float32Array(N * N), expo = 1.7 - o.rough * 0.5;
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let k = 0; k < raw.length; k++) {
    const v = raw[k];
    if (v >= thr) {
      const t = (v - thr) / Math.max(1e-6, hi - thr);
      h[k] = 0.4 + o.relief * Math.pow(t, expo) + 6 * sm(0, 0.03, t);            // beaches stay low, the rest climbs
    } else {
      const s = (thr - v) / Math.max(1e-6, thr - lo);
      h[k] = -(o.depth * (0.18 * sm(0, 0.08, s) + 0.82 * sm(0.08, 0.6, s)) + 0.3); // shelf near the coast, then the deep
    }
  }
  // bounded map with a mountain barrier: a range along the edge
  if (!o.wrap && o.barrier === 'mountains') {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const e = Math.min(i, j, N - 1 - i, N - 1 - j) / N, k = j * N + i;
      const ridge = (0.75 + 0.25 * fbm((i + 0.5) / N, (j + 0.5) / N, 16, 4, 0.5, seed + 5)) * Math.max(o.relief, 250) * 1.15;
      h[k] = Math.max(h[k], -o.depth + (ridge + o.depth) * sm(0.05, 0.0, e));
    }
  }
  let nLand = 0, maxH = -Infinity, minH = Infinity; for (const v of h) { if (v > 0) nLand++; if (v > maxH) maxH = v; if (v < minH) minH = v; }
  return { ...o, h, res: N, cell: o.size / N, landShare: nLand / h.length, maxH, minH, ms: Math.round(performance.now() - t0) };
}

/* ---------------- sampling (JS twin of the shader) ---------------- */
// texel i covers [i·cell, (i+1)·cell); its value sits at its centre, as in the shader
export function sampleHeight(T, x, z) {
  const N = T.res, c = T.cell;
  let fx = x / c - 0.5, fz = z / c - 0.5;
  if (!T.wrap) {
    const out = Math.max(-fx, -fz, fx - (N - 1), fz - (N - 1), 0) * c;           // metres outside the map
    fx = Math.min(N - 1, Math.max(0, fx)); fz = Math.min(N - 1, Math.max(0, fz));
    if (out > 0) return outsideHeight(T, bilinear(T, fx, fz), out);
  }
  return bilinear(T, fx, fz);
}
function bilinear(T, fx, fz) {
  const N = T.res, x0 = Math.floor(fx), z0 = Math.floor(fz), u = fx - x0, v = fz - z0;
  const at = (i, j) => T.h[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
  const cl = (i) => (T.wrap ? i : Math.min(N - 1, Math.max(0, i)));
  return at(cl(x0), cl(z0)) * (1 - u) * (1 - v) + at(cl(x0 + 1), cl(z0)) * u * (1 - v) + at(cl(x0), cl(z0 + 1)) * (1 - u) * v + at(cl(x0 + 1), cl(z0 + 1)) * u * v;
}
function outsideHeight(T, edge, out) {
  const k = Math.min(1, out / 300);
  return edge + ((T.barrier === 'mountains' ? Math.max(T.relief, 250) * 1.2 : -T.depth) - edge) * k;
}

/* ---------------- GPU ---------------- */
export function heightTexture(T) {
  const N = T.res, data = new Uint16Array(N * N);
  for (let k = 0; k < data.length; k++) data[k] = THREE.DataUtils.toHalfFloat(T.h[k]);
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.HalfFloatType);
  tex.wrapS = tex.wrapT = T.wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
}

// shared GLSL: the height at a world xz (wrap or clamp + outside), used by the terrain and the sea
export const GLSL_LAND = /* glsl */`
uniform sampler2D tLand; uniform vec4 uLand;      // map size (m), texels, wrap (1/0), barrier height outside (m)
uniform float uLandDepth;
float landH(vec2 xz) {
  vec2 uv = xz / uLand.x;
  if (uLand.z < 0.5) {
    vec2 c = clamp(uv, vec2(0.5 / uLand.y), vec2(1.0 - 0.5 / uLand.y));
    float off = length((uv - c) * uLand.x);
    float e = texture2D(tLand, c).r;
    return off > 0.0 ? mix(e, uLand.w, min(1.0, off / 300.0)) : e;
  }
  return texture2D(tLand, uv).r;
}
`;

export function landUniforms(T, tex) {
  return {
    tLand: { value: tex }, uLandDepth: { value: T.depth },
    uLand: { value: new THREE.Vector4(T.size, T.res, T.wrap ? 1 : 0, T.barrier === 'mountains' ? Math.max(T.relief, 250) * 1.2 : -T.depth) },
  };
}
export function setLand(u, T, tex) {
  u.tLand.value = tex; u.uLandDepth.value = T.depth;
  u.uLand.value.set(T.size, T.res, T.wrap ? 1 : 0, T.barrier === 'mountains' ? Math.max(T.relief, 250) * 1.2 : -T.depth);
}

const TERRAIN_VERT_HEAD = /* glsl */`
${GLSL_LAND}
uniform float uDrop;                               // the far grid sits a little lower, so the fine grid wins where they overlap
varying vec3 vLandP; varying vec3 vLandN;
`;
const TERRAIN_VERT_NORMAL = /* glsl */`
  vec2 lxz = (modelMatrix * vec4(position, 1.0)).xz;
  float e = uLand.x / uLand.y;
  float lh = landH(lxz);
  vec3 objectNormal = normalize(vec3(landH(lxz - vec2(e, 0.0)) - landH(lxz + vec2(e, 0.0)), 2.0 * e, landH(lxz - vec2(0.0, e)) - landH(lxz + vec2(0.0, e))));
  vLandN = objectNormal; vLandP = vec3(lxz.x, lh, lxz.y);
`;
const TERRAIN_FRAG_HEAD = /* glsl */`
uniform vec3 uHole; uniform float uRelief, uTime;
varying vec3 vLandP; varying vec3 vLandN;
float lnHash(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float lnNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(lnHash(i), lnHash(i + vec2(1, 0)), f.x), mix(lnHash(i + vec2(0, 1)), lnHash(i + vec2(1, 1)), f.x), f.y); }
float lnFbm(vec2 p) { return lnNoise(p) * 0.5 + lnNoise(p * 2.1 + 3.1) * 0.3 + lnNoise(p * 4.3 + 7.7) * 0.2; }
`;
const TERRAIN_FRAG_COLOR = /* glsl */`
  if (uHole.z > 0.0 && abs(vLandP.x - uHole.x) < uHole.z && abs(vLandP.z - uHole.y) < uHole.z) discard;
  float hh = vLandP.y, up = normalize(vLandN).y;
  vec2 q = vLandP.xz;
  // detail noise fades out with distance before it gets finer than a pixel (no shimmering, no moiré)
  float fd = length(cameraPosition - vLandP);
  float n0 = lnFbm(q * 0.006), n1 = lnFbm(q * 0.035);
  float n2 = mix(0.5, lnFbm(q * 0.31), smoothstep(3500.0, 900.0, fd)), n3 = mix(0.5, lnNoise(q * 2.3), smoothstep(320.0, 60.0, fd));
  float rel = hh / max(uRelief, 1.0);
  vec3 sand = vec3(0.72, 0.64, 0.48) * (0.9 + 0.2 * n2), wetSand = vec3(0.42, 0.37, 0.29);
  // muted northern vegetation: grass, heather and dry patches, mottled at three scales
  vec3 grass = mix(vec3(0.17, 0.21, 0.1), vec3(0.27, 0.28, 0.15), n1);
  grass = mix(grass, vec3(0.3, 0.26, 0.17), smoothstep(0.55, 0.8, n0) * 0.6);         // dry, brownish areas
  grass = mix(grass, vec3(0.22, 0.17, 0.16), smoothstep(0.6, 0.85, n2) * 0.35);        // heather
  grass *= 0.75 + 0.35 * n2 * (0.7 + 0.3 * n3);
  vec3 scrub = mix(vec3(0.27, 0.25, 0.18), vec3(0.2, 0.2, 0.14), n2) * (0.8 + 0.3 * n3);
  vec3 rock = mix(vec3(0.24, 0.23, 0.22), vec3(0.36, 0.33, 0.29), n1) * (0.8 + 0.3 * n3) * (0.85 + 0.3 * n2);
  vec3 snow = vec3(0.92, 0.94, 0.97);
  vec3 bed = mix(vec3(0.55, 0.5, 0.38), vec3(0.2, 0.22, 0.2), smoothstep(-4.0, -40.0, hh));
  float rough = 0.95;
  vec3 c;
  if (hh < 0.0) { c = mix(bed, rock * 0.6, smoothstep(0.75, 0.55, up) * 0.6); rough = 0.85; }
  else {
    float beach = smoothstep(4.5 + n2 * 2.5, 1.5, hh) * smoothstep(0.82, 0.93, up);
    float veg = smoothstep(0.7, 0.86, up + (n1 - 0.5) * 0.12) * (1.0 - smoothstep(0.45, 0.75, rel + n1 * 0.12));
    float snowy = smoothstep(0.62, 0.8, rel + n1 * 0.15) * smoothstep(0.55, 0.75, up);
    c = rock;
    c = mix(c, mix(scrub, grass, smoothstep(0.5, 0.2, rel)), veg);
    c = mix(c, snow, snowy);
    c = mix(c, sand, beach);
    float wet = smoothstep(1.4, 0.3, hh) * beach;
    c = mix(c, wetSand, wet); rough = mix(0.95, 0.35, wet);
    c *= 0.82 + 0.18 * smoothstep(0.5, 0.95, up);                                     // steeper ground reads darker (soil, shadowed gullies)
  }
  diffuseColor.rgb = c;
`;

function terrainMaterial(lu, extra) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const u = { ...lu, ...extra };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = TERRAIN_VERT_HEAD + sh.vertexShader
      .replace('#include <beginnormal_vertex>', TERRAIN_VERT_NORMAL)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, lh - uDrop, position.z);');
    sh.fragmentShader = TERRAIN_FRAG_HEAD + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + TERRAIN_FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = rough;');
  };
  m.customProgramCacheKey = () => 'landkit-terrain';
  return m;
}
function terrainDepthMaterial(lu, extra) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const u = { ...lu, ...extra };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = GLSL_LAND + 'uniform float uDrop;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      'vec2 lxz = (modelMatrix * vec4(position, 1.0)).xz; vec3 transformed = vec3(position.x, landH(lxz) - uDrop, position.z);');
  };
  m.customProgramCacheKey = () => 'landkit-depth';
  return m;
}

// Fine grid (texel cells, n×n) and far grid (4-texel cells, n×n) around the camera, snapped to their cells.
export function terrainMeshes(T, tex, opt = {}) {
  const n = opt.n || 256, nf = opt.nFar || 192;
  const lu = landUniforms(T, tex);
  const common = { uRelief: { value: T.relief }, uTime: { value: 0 } };
  const mk = (cells, cell, drop, hole) => {
    const g = new THREE.PlaneGeometry(cells * cell, cells * cell, cells, cells); g.rotateX(-Math.PI / 2);
    const extra = { ...common, uDrop: { value: drop }, uHole: { value: hole } };
    const mesh = new THREE.Mesh(g, terrainMaterial(lu, extra));
    mesh.customDepthMaterial = terrainDepthMaterial(lu, extra);
    mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;   // ships cast on the land; the land does not shadow itself (acne on steep faces at this grid)
    mesh.userData.cell = cell; mesh.userData.extra = extra;
    return mesh;
  };
  const group = new THREE.Group(); group.name = 'terrain';
  let fine, far;
  function build(T2) {
    group.clear();
    const c = T2.size / T2.res;
    fine = mk(n, c, 0, new THREE.Vector3(0, 0, 0));
    far = mk(nf, c * 4, 0.6, new THREE.Vector3(0, 0, (n / 2 - 6) * c));
    group.add(fine, far);
    common.uRelief.value = T2.relief;
  }
  build(T);
  return {
    group, uniforms: lu,
    set(T2, tex2) { setLand(lu, T2, tex2); build(T2); },
    update(camera) {
      for (const m of [fine, far]) {
        const c = m.userData.cell;
        m.position.set(Math.round(camera.position.x / c) * c, 0, Math.round(camera.position.z / c) * c);
      }
      far.userData.extra.uHole.value.set(fine.position.x, fine.position.z, far.userData.extra.uHole.value.z);
    },
    get triangles() { return (n * n + nf * nf) * 2; },
  };
}

// Barrier buoys along the edge of a bounded map (one instanced draw call): red and black, every `spacing` metres.
export function barrierBuoys(T, spacing = 80) {
  const inset = 60, L = T.size - inset * 2, per = Math.floor(L / spacing), count = per * 4;
  const g = new THREE.CylinderGeometry(0.35, 0.9, 3.2, 10); g.translate(0, 1.0, 0);
  const top = new THREE.SphereGeometry(0.45, 10, 6); top.translate(0, 2.9, 0);
  const merged = new THREE.BufferGeometry();
  const geos = [g.toNonIndexed(), top.toNonIndexed()];
  const pos = [], nor = [], col = [];
  geos.forEach((q, gi) => { pos.push(...q.attributes.position.array); nor.push(...q.attributes.normal.array); for (let i = 0; i < q.attributes.position.count; i++) col.push(...(gi ? [0.05, 0.05, 0.05] : [0.7, 0.08, 0.06])); });
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); merged.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), count);
  const m = new THREE.Matrix4(); let k = 0;
  for (let side = 0; side < 4; side++) for (let i = 0; i < per; i++) {
    const t = inset + (i + 0.5) * spacing, x = side === 0 ? t : side === 1 ? T.size - inset : side === 2 ? T.size - t : inset, z = side === 0 ? inset : side === 1 ? t : side === 2 ? T.size - inset : T.size - t;
    m.makeTranslation(x, 0, z); mesh.setMatrixAt(k++, m);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.name = 'barrier buoys';
  mesh.userData.inset = inset;
  return mesh;
}

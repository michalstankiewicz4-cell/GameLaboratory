// Procedural ageing for ShipKit ships: one wear slider and per-surface rules, all in the shaders, no texture files.
//  bakeWear(group)        bakes two values per vertex (attribute aWear): x = occlusion (how enclosed the spot is, from
//                         rays marched through a voxel grid of the whole ship), y = edge exposure (the surface does not
//                         continue around the spot: outer edges and corners). Cavities collect grime, edges chip.
//  ageMaterials(mats, u)  patches ShipKit's materials by their key: painted steel (faded, chalky, rust streaks on
//                         vertical faces, rust spots, chipped edges), the hull (plating seams and plate tones, salt above
//                         the waterline, faded boot-top with growth), steel decks (worn walkways), bare metal (dark,
//                         oily, rust bloom), wood (greyed, wet patches), canvas (faded, stained), brass and bronze
//                         (patina), rope (dark). All scaled by uAge and per-effect sliders in the shared uniforms.
import * as THREE from '../../../vendor/three/three.module.js';

export const AGE_KIND = { paint: 1, white: 1, red: 1, hull: 2, deck: 3, metal: 4, dark: 4, wooddeck: 5, wood: 5, canvas: 6, bronze: 7, rope: 8 };
export function ageUniforms() {
  return {
    uAge: { value: 0.55 }, uAO: { value: 0.8 }, uGrime: { value: 0.7 }, uStreak: { value: 0.7 }, uRust: { value: 0.5 },
    uChip: { value: 0.6 }, uSalt: { value: 0.6 }, uPlate: { value: 0.7 }, uWood: { value: 0.7 }, uPatina: { value: 0.7 }, uCanvas: { value: 0.6 },
    uRainWet: { value: 0 }, uRainT: { value: 0 },                  // wet from rain 0..1, time (s) for running water
  };
}

/* ---------------- baking: occlusion and edges from a voxel grid ---------------- */
export function bakeWear(group, opt = {}) {
  const t0 = performance.now(), vox = opt.voxel || 0.35;
  group.updateMatrixWorld(true);
  const meshes = []; group.traverse((o) => { if (o.isMesh && o.geometry.attributes.position) meshes.push(o); });
  const box = new THREE.Box3().setFromObject(group).expandByScalar(3 * vox);
  const nx = Math.ceil((box.max.x - box.min.x) / vox), ny = Math.ceil((box.max.y - box.min.y) / vox), nz = Math.ceil((box.max.z - box.min.z) / vox);
  const grid = new Uint8Array(nx * ny * nz), mn = box.min;
  const cell = (x, y, z) => { const i = Math.floor((x - mn.x) / vox), j = Math.floor((y - mn.y) / vox), k = Math.floor((z - mn.z) / vox);
    return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : (k * ny + j) * nx + i; };
  const occ = (x, y, z) => { const c = cell(x, y, z); return c >= 0 && grid[c] === 1; };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = new THREE.Vector3();
  // rasterise every triangle's surface into the grid
  for (const m of meshes) {
    const g = m.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null, n = idx ? idx.length : pos.count, mw = m.matrixWorld;
    for (let k = 0; k < n; k += 3) {
      a.fromBufferAttribute(pos, idx ? idx[k] : k).applyMatrix4(mw); b.fromBufferAttribute(pos, idx ? idx[k + 1] : k + 1).applyMatrix4(mw); c.fromBufferAttribute(pos, idx ? idx[k + 2] : k + 2).applyMatrix4(mw);
      const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)), s = Math.min(200, Math.ceil(e / (vox * 0.6)));
      for (let i = 0; i <= s; i++) for (let j = 0; j <= s - i; j++) {
        const u = i / s, v = j / s; p.copy(a).addScaledVector(b.clone().sub(a), u).addScaledVector(c.clone().sub(a), v);
        const ci = cell(p.x, p.y, p.z); if (ci >= 0) grid[ci] = 1;
      }
    }
  }
  // per vertex: occlusion along a hemisphere of rays, edge exposure from whether the surface continues around it
  const steps = [0.45, 0.8, 1.25, 1.8, 2.6], dirs = [], n0 = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (let i = 0; i < 6; i++) dirs.push([Math.cos(i / 6 * Math.PI * 2), Math.sin(i / 6 * Math.PI * 2)]);
  let verts = 0;
  for (const m of meshes) {
    const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal; if (!nor) continue;
    const out = new Float32Array(pos.count * 2); nm.getNormalMatrix(m.matrixWorld);
    for (let k = 0; k < pos.count; k++) {
      p.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld); n0.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      t1.set(0, 1, 0); if (Math.abs(n0.y) > 0.9) t1.set(1, 0, 0); t1.sub(d.copy(n0).multiplyScalar(t1.dot(n0))).normalize(); t2.crossVectors(n0, t1);
      // occlusion: the normal and six rays 50° off it
      let hit = 0, wsum = 0;
      for (let r = -1; r < 6; r++) {
        if (r < 0) d.copy(n0); else d.copy(n0).multiplyScalar(0.64).addScaledVector(t1, dirs[r][0] * 0.77).addScaledVector(t2, dirs[r][1] * 0.77);
        const w = r < 0 ? 2 : 1; wsum += w;
        for (const st of steps) { if (occ(p.x + n0.x * vox * 0.9 + d.x * st, p.y + n0.y * vox * 0.9 + d.y * st, p.z + n0.z * vox * 0.9 + d.z * st)) { hit += w * (1.15 - st / 3); break; } }
      }
      // edge: step 0.4 m along the surface in four directions; is there still surface there (or just above/below it)?
      let cont = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        d.copy(t1).multiplyScalar(dx * 0.42).addScaledVector(t2, dy * 0.42);
        const qx = p.x + d.x, qy = p.y + d.y, qz = p.z + d.z;
        if (occ(qx, qy, qz) || occ(qx - n0.x * vox, qy - n0.y * vox, qz - n0.z * vox) || occ(qx + n0.x * vox * 0.5, qy + n0.y * vox * 0.5, qz + n0.z * vox * 0.5)) cont++;
      }
      out[k * 2] = Math.min(1, hit / wsum); out[k * 2 + 1] = 1 - cont / 4;
    }
    g.setAttribute('aWear', new THREE.BufferAttribute(out, 2)); verts += pos.count;
  }
  return { ms: Math.round(performance.now() - t0), voxels: nx * ny * nz, vertices: verts };
}

/* ---------------- shaders ---------------- */
const GLSL_NOISE = /* glsl */`
float agHash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float agNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(agHash(i), agHash(i + vec3(1, 0, 0)), f.x), mix(agHash(i + vec3(0, 1, 0)), agHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(agHash(i + vec3(0, 0, 1)), agHash(i + vec3(1, 0, 1)), f.x), mix(agHash(i + vec3(0, 1, 1)), agHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float agFbm(vec3 p) { return agNoise(p) * 0.55 + agNoise(p * 2.07 + 5.3) * 0.28 + agNoise(p * 4.3 + 1.7) * 0.17; }
`;
const AGE_FRAG = /* glsl */`
{
  float age = uAge; vec3 P = vAgePos; vec3 N = normalize(vAgeNor);
  float vert = 1.0 - abs(N.y), ao = vWear.x, edge = vWear.y;
  float n1 = agFbm(P * 0.6), n2 = agFbm(P * 2.7 + 7.0);
  vec3 c = diffuseColor.rgb; float rough = roughnessFactor, metal = metalnessFactor;
  c *= mix(1.0, 1.0 - 0.62 * ao, uAO);                                                          // baked occlusion
  float grime = smoothstep(0.22, 0.7, ao + (n2 - 0.5) * 0.45) * age * uGrime;
  c = mix(c, c * vec3(0.5, 0.45, 0.38), grime);
  if (uKind == 1 || uKind == 2 || uKind == 3) {                                                 // painted steel
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(lum) * 1.05 + 0.015, 0.32 * age);                                           // faded, chalky
    rough = min(1.0, rough + 0.2 * age);
    if (uKind == 2) {                                                                            // hull plating
      vec2 pl = vec2(P.z / 6.1, P.y / 1.85 + 0.37), f = abs(fract(pl) - 0.5) * 2.0;
      float seam = max(smoothstep(0.988, 1.0, f.x), smoothstep(0.972, 1.0, f.y)) * vert;
      c *= 1.0 - seam * 0.22 * uPlate;
      c *= 1.0 + (agHash(vec3(floor(pl), 3.0)) - 0.5) * 0.09 * uPlate * (0.4 + age);
    }
    float along = P.z * 0.85 + P.x * 0.85;
    float sn = agNoise(vec3(along * 2.4, P.y * 0.09, 0.5)) * 0.65 + agNoise(vec3(along * 7.0, P.y * 0.22, 3.0)) * 0.35;
    float streak = smoothstep(0.6, 0.86, sn) * vert * smoothstep(0.0, 0.9, P.y + 0.3) * age * uStreak;
    float spot = smoothstep(0.72, 0.86, n2 + ao * 0.35) * age * uRust;
    vec3 rustCol = mix(vec3(0.3, 0.13, 0.05), vec3(0.5, 0.25, 0.09), n1);
    float r = clamp(streak * 0.75 + spot, 0.0, 1.0);
    c = mix(c, rustCol, r); rough = mix(rough, 0.92, r); metal = mix(metal, 0.1, r);
    float chip = smoothstep(0.45, 0.72, edge + (n2 - 0.5) * 0.55) * age * uChip;
    c = mix(c, mix(vec3(0.33, 0.18, 0.1), vec3(0.3, 0.3, 0.31), n1), chip); metal = mix(metal, 0.55, chip * 0.5);
    if (uKind == 2) {
      float salt = smoothstep(0.38, 0.65, P.y) * smoothstep(2.0, 0.9, P.y) * smoothstep(0.42, 0.75, n2) * age * uSalt * vert;
      c = mix(c, vec3(0.8, 0.79, 0.74), salt * 0.6);
      if (P.y < 0.42) {
        c = mix(c, c * 1.12 + 0.03, 0.4 * age);
        float growth = smoothstep(0.52, 0.74, n1) * smoothstep(-0.7, -0.1, P.y) * age * uSalt;
        c = mix(c, vec3(0.11, 0.15, 0.06), growth * 0.75);
      }
    }
    if (uKind == 3) {                                                                            // steel decks: worn walkways
      float walk = (1.0 - vert) * smoothstep(0.55, 0.8, agNoise(vec3(P.x * 0.55, 0.0, P.z * 0.12))) * age * uChip;
      c = mix(c, c * 1.25 + vec3(0.03), walk * 0.6); rough = mix(rough, 0.6, walk);
    }
  } else if (uKind == 4) {                                                                       // bare metal
    c = mix(c, c * 0.68, 0.45 * age);
    float bloom = smoothstep(0.7, 0.88, n2 + ao * 0.4) * age * uRust;
    c = mix(c, vec3(0.32, 0.16, 0.07), bloom); rough = mix(rough, 0.85, bloom);
  } else if (uKind == 5) {                                                                       // wood: greys in the sun
    float lum = dot(c, vec3(0.333));
    c = mix(c, vec3(lum) * vec3(0.95, 0.96, 0.99) + 0.07, 0.75 * age * uWood);
    c *= 1.0 - 0.28 * smoothstep(0.6, 0.8, n1) * age * uWood; rough = min(1.0, rough + 0.08 * age);
  } else if (uKind == 6) {                                                                       // canvas
    c = mix(c, c * 1.08 + 0.04, 0.4 * age * uCanvas);
    c = mix(c, c * vec3(0.62, 0.58, 0.5), smoothstep(0.62, 0.82, n2) * age * uCanvas);
  } else if (uKind == 7) {                                                                       // brass and bronze
    float pat = smoothstep(0.3, 0.68, n2 + ao * 0.35) * age * uPatina;
    c = mix(c, mix(vec3(0.17, 0.31, 0.24), vec3(0.28, 0.22, 0.12), n1), pat); metal = mix(metal, 0.2, pat); rough = mix(rough, 0.8, pat);
  } else if (uKind == 8) { c *= 1.0 - 0.35 * age; }                                              // rope
  if (uRainWet > 0.0) {                                                                          // rain: darker, glossy, water running down
    float open = 1.0 - smoothstep(0.35, 0.8, ao);                                                // sheltered spots stay drier
    float run = smoothstep(0.6, 0.72, agFbm(vec3(P.x * 3.0, P.y * 0.35 + uRainT * 0.9, P.z * 3.0))) * vert;
    float wet = uRainWet * open * (0.55 + 0.45 * max(N.y, 0.0));
    c *= 1.0 - 0.32 * wet * (uKind == 5 || uKind == 6 || uKind == 8 ? 1.4 : 1.0);
    rough = mix(rough, 0.12, clamp(wet * 0.75 + run * uRainWet * 0.6, 0.0, 1.0));
  }
  diffuseColor.rgb = c; roughnessFactor = rough; metalnessFactor = metal;
}
`;

const patched = new WeakSet();
export function ageMaterials(mats, u) {
  for (const [key, m] of Object.entries(mats)) {
    const kind = AGE_KIND[key];
    if (!kind || !m.isMeshStandardMaterial || patched.has(m)) continue;
    patched.add(m);
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, u, { uKind: { value: kind } });
      sh.vertexShader = 'attribute vec2 aWear;\nvarying vec2 vWear;\nvarying vec3 vAgePos, vAgeNor;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWear = aWear; vAgePos = transformed; vAgeNor = objectNormal;');
      sh.fragmentShader = 'uniform float uAge, uAO, uGrime, uStreak, uRust, uChip, uSalt, uPlate, uWood, uPatina, uCanvas, uRainWet, uRainT;\nuniform int uKind;\nvarying vec2 vWear;\nvarying vec3 vAgePos, vAgeNor;\n' + GLSL_NOISE
        + sh.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + AGE_FRAG);
    };
    m.customProgramCacheKey = () => 'age' + kind + '|' + prevKey();
    m.needsUpdate = true;
  }
}

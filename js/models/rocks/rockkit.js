// RockKit: kamienie i skały z kodu, w prawdziwej skali (metry, y w górę, podstawa w (0, 0, 0), trochę zakopana).
// Skała = dwudziestościan (ikosaedr) podzielony i odkształcony: zaokrąglony szum (głazy granitowe), płaszczyzny
// pęknięć ścinające bryłę (kanciaste bloki wapienia i bazaltu), warstwy (piaskowiec), wżery (wapień); kształt
// (głaz, blok, płyta, iglica) rozciąga ją w osiach. Powierzchnia z MatKit (js/render/materials/matkit.js — skała:
// granit, wapień, piaskowiec, bazalt) nakładana trójpłaszczyznowo (bez szwów UV), mech i porosty jako barwy wierzchołków
// (mech na ścianach patrzących w górę, porosty plamami).
//
// ROCK_KINDS — rodzaje skał: { name, namePl, note, mat (preset MatKit), round, cuts, strata, pits }
// ROCK_SHAPES — kształty: { name, namePl, scale [x, y, z] }
// ROCK_DEFAULTS — { kind, shape, seed, size (m — największy wymiar), detail (0.5…1.5), moss (0…1), lichen (0…1) }
// rockGeometry(spec) → BufferGeometry (z barwami wierzchołków: mech, porosty) i jej wymiary w userData.size
// rockMaterial(kind) → MeshStandardMaterial (jeden na rodzaj, wspólny dla wszystkich skał tego rodzaju)
// makeRock(spec) → { mesh, size: [x, y, z], tris, spec }
// rockInfo(spec) → dane do opisu (wymiary, masa z gęstości skały, trójkąty)
import * as THREE from '../../../vendor/three/three.module.js';
import { PRESETS, makeMaterial } from '../../render/materials/matkit.js';

export const ROCK_KINDS = {
  granite: { name: 'Granite', namePl: 'Granit', mat: 'granite', density: 2700, round: 0.75, cuts: 2, strata: 0, pits: 0,
    note: 'Coarse-grained igneous rock: rounded boulders weathered along their joints, speckled grey.', notePl: 'Gruboziarnista skała magmowa: zaokrąglone głazy zwietrzałe wzdłuż spękań, szara, nakrapiana.' },
  limestone: { name: 'Limestone', namePl: 'Wapień', mat: 'limestone', density: 2600, round: 0.35, cuts: 5, strata: 0.15, pits: 0.6,
    note: 'Pale sedimentary rock: blocky, sharp edges, small pits dissolved by rain.', notePl: 'Jasna skała osadowa: bloki o ostrych krawędziach, drobne wżery wypłukane przez deszcz.' },
  sandstone: { name: 'Sandstone', namePl: 'Piaskowiec', mat: 'sandstone', density: 2300, round: 0.5, cuts: 3, strata: 0.7, pits: 0.1,
    note: 'Warm sedimentary rock in layers: soft, rounded by wind, the beds show as ridges.', notePl: 'Ciepła skała osadowa w warstwach: miękka, zaokrąglona przez wiatr, ławice widać jako żeberka.' },
  basalt: { name: 'Basalt', namePl: 'Bazalt', mat: 'basalt', density: 3000, round: 0.15, cuts: 7, strata: 0, pits: 0.05,
    note: 'Dark volcanic rock: hard, angular, flat fracture faces.', notePl: 'Ciemna skała wulkaniczna: twarda, kanciasta, płaskie powierzchnie przełamów.' },
};
export const ROCK_SHAPES = {
  boulder: { name: 'Boulder', namePl: 'Głaz', scale: [1, 0.72, 0.88] },
  block: { name: 'Block', namePl: 'Blok', scale: [1, 0.8, 0.75] },
  slab: { name: 'Slab', namePl: 'Płyta', scale: [1, 0.3, 0.8] },
  spire: { name: 'Spire', namePl: 'Iglica', scale: [0.5, 1, 0.45] },
  pebble: { name: 'Pebble', namePl: 'Otoczak', scale: [1, 0.55, 0.75] },
};
export const ROCK_DEFAULTS = { kind: 'granite', shape: 'boulder', seed: 1, size: 1.6, detail: 1, moss: 0.3, lichen: 0.3 };

/* ---------------- noise (3D, deterministic) ---------------- */
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function hash3(x, y, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, seed);
  const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u, x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
  const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u, x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
  return (x00 + (x10 - x00) * v) + ((x01 + (x11 - x01) * v) - (x00 + (x10 - x00) * v)) * w;   // 0…1
}
const fbm3 = (x, y, z, seed, oct = 4) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < oct; i++) { s += a * (vnoise(x * f, y * f, z * f, seed + i * 17) - 0.5); f *= 2.03; a *= 0.5; } return s; };   // ≈ −0.5…0.5

/* ---------------- geometry ---------------- */
// the icosphere's corners are repeated per face: merge them, so the displacement keeps the surface closed
function icosphere(sub) {
  const g = new THREE.IcosahedronGeometry(1, sub), p = g.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
    let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(j);
  }
  g.dispose();
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setIndex(idx);
  return out;
}
export function rockGeometry(spec = {}) {
  const S = { ...ROCK_DEFAULTS, ...spec }, K = ROCK_KINDS[S.kind] || ROCK_KINDS.granite, SH = ROCK_SHAPES[S.shape] || ROCK_SHAPES.boulder;
  const pebble = S.shape === 'pebble', seed = (S.seed | 0) * 7919 + 13;
  const sub = Math.max(pebble ? 1 : 2, Math.min(16, Math.round((pebble ? 4 : 8) * S.detail + (S.size > 3 ? 4 : 0))));   // 20·(sub+1)² triangles: 1 620 at detail 1
  const g = icosphere(sub), P = g.attributes.position, r = rng(seed), V = new THREE.Vector3();
  // fracture planes: each cuts the rock flat where it reaches past it (a rounded rock gets few, a hard one many)
  const cuts = [];
  const nCuts = pebble ? 0 : K.cuts + Math.floor(r() * 2);
  for (let i = 0; i < nCuts; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1) * (i === 0 ? 0.3 : 1);   // one cut near the top: flat-topped blocks
    cuts.push({ n: new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)), d: 0.62 + r() * 0.25 });
  }
  const tilt = (r() - 0.5) * 0.5, strataK = 9 + r() * 6;
  for (let i = 0; i < P.count; i++) {
    V.fromBufferAttribute(P, i);
    // shape of the whole: low-frequency lumps, then finer roughness — less on a rounded rock
    let rad = 1 + fbm3(V.x * 1.1, V.y * 1.1, V.z * 1.1, seed, 3) * (pebble ? 0.25 : 0.55) + fbm3(V.x * 4.5, V.y * 4.5, V.z * 4.5, seed + 5, 3) * 0.12 * (1 - K.round * 0.7);
    if (K.strata) rad *= 1 + K.strata * 0.035 * Math.sin((V.y + V.x * tilt) * strataK + fbm3(V.x * 2, V.y * 2, V.z * 2, seed + 9, 2) * 4);
    if (K.pits) rad -= K.pits * 0.05 * Math.max(0, vnoise(V.x * 9, V.y * 9, V.z * 9, seed + 3) - 0.62) * 2.6;
    V.multiplyScalar(rad);
    for (const c of cuts) { const s = V.dot(c.n) - c.d; if (s > 0) V.addScaledVector(c.n, -s * (1 - K.round * 0.5)); }
    P.setXYZ(i, V.x, V.y, V.z);
  }
  // shape and size: stretch along the axes, scale to the largest dimension, sit on the ground a little buried
  g.computeBoundingBox();
  let b = g.boundingBox, ext = new THREE.Vector3().subVectors(b.max, b.min);
  const sc = new THREE.Vector3(SH.scale[0] / ext.x, SH.scale[1] / ext.y, SH.scale[2] / ext.z).multiplyScalar(S.size);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.scale(sc.x, sc.y, sc.z);
  g.computeBoundingBox(); b = g.boundingBox; ext = new THREE.Vector3().subVectors(b.max, b.min);
  const bury = ext.y * (S.shape === 'spire' ? 0.1 : S.shape === 'slab' ? 0.25 : 0.15);
  // flatten the bottom where it is buried (no rock hanging below the ground line) and drop it in
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y < bury * 0.5) P.setY(i, bury * 0.5 + (y - bury * 0.5) * 0.25); }
  g.translate(0, -bury, 0);
  g.computeVertexNormals();
  // moss on the faces that look up (and in the hollows of the top), lichen in pale and orange spots
  const N = g.attributes.normal, col = new Float32Array(P.count * 3), mossC = [0.34, 0.6, 0.14], lichA = [1.25, 1.22, 1.08], lichB = [1.2, 0.85, 0.45];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) / S.size, y = P.getY(i) / S.size, z = P.getZ(i) / S.size, ny = N.getY(i);
    let c = [1, 1, 1];
    const m = S.moss * Math.max(0, Math.min(1, (ny - 0.45 + fbm3(x * 6, y * 6, z * 6, seed + 21, 3) * 1.4) * 2.2)) * Math.min(1, (y * S.size + bury) / Math.max(0.2, ext.y * 0.25));
    if (m > 0) c = c.map((v, k) => v + (mossC[k] - v) * Math.min(1, m));
    const l = S.lichen * Math.max(0, vnoise(x * 14, y * 14, z * 14, seed + 31) - 0.72) * 4;
    if (l > 0) { const lc = vnoise(x * 3, y * 3, z * 3, seed + 41) > 0.5 ? lichA : lichB; c = c.map((v, k) => v + (lc[k] - v) * Math.min(1, l) * (1 - m)); }
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(P.count * 2), 2));   // the maps are triplanar; three wants the attribute
  g.userData.size = ext.toArray().map((v) => +v.toFixed(3));
  g.userData.bury = +bury.toFixed(3);
  return g;
}

/* ---------------- material: MatKit maps, triplanar ---------------- */
// the surface by object position on three planes, blended by the normal: no UV seams on any shape; the normal map
// through the same three planes (whiteout blend), AO and roughness from MatKit's ORM map
const TRI_VERT_HEAD = 'varying vec3 vRkP; varying vec3 vRkN; varying mat3 vRkR;\n';   // vRkR: object → world rotation (with the instance)
const TRI_FRAG_HEAD = /* glsl */`
varying vec3 vRkP; varying vec3 vRkN; varying mat3 vRkR; uniform float uRkTile;
vec3 rkW() { vec3 w = pow(abs(normalize(vRkN)), vec3(4.0)); return w / (w.x + w.y + w.z); }
vec4 rkTex(sampler2D t) { vec3 w = rkW(); vec3 p = vRkP / uRkTile;
  return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }
`;
const materials = {};
export function rockMaterial(kind = 'granite') {
  if (materials[kind]) return materials[kind];
  const K = ROCK_KINDS[kind] || ROCK_KINDS.granite;
  const mk = makeMaterial({ ...PRESETS[K.mat], seed: 3 }, { res: 512 });
  const m = mk.material; m.vertexColors = true;
  const tile = mk.material.userData.tile || 3;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRkTile = { value: tile };
    sh.vertexShader = TRI_VERT_HEAD + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vRkP = position; vRkN = normal; vRkR = mat3(modelMatrix);
#ifdef USE_INSTANCING
  vRkR = vRkR * mat3(instanceMatrix);
#endif`);
    sh.fragmentShader = TRI_FRAG_HEAD + sh.fragmentShader
      .replace('#include <map_fragment>', 'diffuseColor *= rkTex(map);')
      .replace('#include <roughnessmap_fragment>', 'vec4 texelRoughness = rkTex(roughnessMap); float roughnessFactor = roughness * texelRoughness.g;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * rkTex(metalnessMap).b;')
      .replace('#include <aomap_fragment>', `{ float ambientOcclusion = (rkTex(aoMap).r - 1.0) * aoMapIntensity + 1.0; reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    reflectedLight.indirectSpecular *= computeSpecularOcclusion(saturate(dot(geometryNormal, geometryViewDir)), ambientOcclusion, material.roughness);
  #endif
}`)
      // whiteout-blended triplanar normal map, in object space, then to view space
      .replace('#include <normal_fragment_maps>', `{ vec3 w = rkW(), p = vRkP / uRkTile, n = normalize(vRkN);
  vec3 tx = texture2D(normalMap, p.zy).xyz * 2.0 - 1.0, ty = texture2D(normalMap, p.xz).xyz * 2.0 - 1.0, tz = texture2D(normalMap, p.xy).xyz * 2.0 - 1.0;
  tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x); ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y); tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
  vec3 on = normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
  normal = normalize((viewMatrix * vec4(normalize(vRkR * on), 0.0)).xyz); }`);
  };
  m.customProgramCacheKey = () => 'rockkit-' + kind;
  materials[kind] = m;
  return m;
}

export function makeRock(spec = {}) {
  const S = { ...ROCK_DEFAULTS, ...spec };
  const geo = rockGeometry(S), mesh = new THREE.Mesh(geo, rockMaterial(S.kind));
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = `rock ${S.kind} ${S.shape}`;
  return { mesh, size: geo.userData.size, tris: geo.index.count / 3, spec: S };
}
// volume from the mesh (closed surface, divergence theorem) × the rock's density
export function rockInfo(spec, geo) {
  const S = { ...ROCK_DEFAULTS, ...spec }, K = ROCK_KINDS[S.kind] || ROCK_KINDS.granite, P = geo.attributes.position, I = geo.index.array;
  let vol = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < I.length; i += 3) { a.fromBufferAttribute(P, I[i]); b.fromBufferAttribute(P, I[i + 1]); c.fromBufferAttribute(P, I[i + 2]); vol += a.dot(b.cross(c)) / 6; }
  vol = Math.abs(vol);
  return { size: geo.userData.size, volume: vol, mass: vol * K.density, density: K.density, tris: I.length / 3, buried: geo.userData.bury };
}

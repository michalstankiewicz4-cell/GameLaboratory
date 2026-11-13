// BlockKit — bryły z bloków (wokseli): kształt (js/models/blocks/shapes.js, z Hive Hunger), rodzaje bloków w warstwach
// (jak edytor wokseli Hive Hunger: skała, żelazo, woda, lawa, gaz… — „gdzie w ciele”: powierzchnia, pod powierzchnią,
// głęboko, jądro, żyły, jeziorka; „ile”: procent), rysowane tylko bloki odsłonięte (z pustym albo przezroczystym
// sąsiadem). Bloki stałe mają materiały z biblioteki MatKit (js/render/materials/matkit.js) w układzie świata
// (faktura ciągnie się przez bloki), ciecze i gaz — wygląd z Hive Hunger (js/render/liquid.js). Ugryzienie zdejmuje
// bloki w kuli i zwraca, co wypadło: ciecze i gaz idą do zachowań w kosmosie (js/behaviors/space/liquids.js, gases.js).
// Laboratorium: labs/blocks.html; opis: docs/labs/blocks.md. Jednostka: metr.
//
//   KINDS, WHERE, LIQUIDS, GAS, BODY_DEFAULTS, normalizeBody(def)
//   buildBody(def) → { group, def, isSolid(p), kindAt(p), bite(p, r) → [{ kind, x, y, z }], raycast(origin, dir, max) → punkt
//                     | null, counts(), bound, alive, update(t), dispose() }
import * as THREE from '../../../vendor/three/three.module.js';
import { buildShape } from './shapes.js';
import { NEIGHBORS } from './grid.js';
import { PRESETS, makeMaterial } from '../../render/materials/matkit.js';
import { addLiquidLook, LIQUID_TIME } from '../../render/liquid.js';

// rodzaje bloków (Hive Hunger: CONFIG.voxelKinds i edytor wokseli; ze stałych — materiały MatKit). state: 'solid' |
// 'liquid' (krople po ugryzieniu) | 'gas' (chmura po ugryzieniu); strength — ile trwa jedzenie (skała = 1)
export const KINDS = {
  rock: { name: 'Rock', namePl: 'Skała', state: 'solid', color: '#8a7d70', strength: 1, mat: { ...PRESETS.granite, color: '#8a7d70', color2: '#4e463f', tile: 2 } },
  iron: { name: 'Iron', namePl: 'Żelazo', state: 'solid', color: '#8a8f98', strength: 2, mat: { ...PRESETS.plate, color: '#8a8f98', tile: 1.5, panels: 2, wear: 0.3, rust: 0.25 } },
  ice: { name: 'Ice', namePl: 'Lód', state: 'solid', color: '#bcd7e6', strength: 0.6, mat: { ...PRESETS.ice, tile: 3 } },
  sand: { name: 'Sandstone', namePl: 'Piaskowiec', state: 'solid', color: '#c4a57c', strength: 0.8, mat: { ...PRESETS.sandstone, tile: 3 } },
  water: { name: 'Water', namePl: 'Woda', state: 'liquid', color: '#3f7fd0', strength: 0.5, look: [1, 0, 0] },
  lava: { name: 'Lava', namePl: 'Lawa', state: 'liquid', color: '#ff5a1f', strength: 0.5, look: [0, 1, 0] },
  gas: { name: 'Gas', namePl: 'Gaz', state: 'gas', color: '#c4a0e8', strength: 0.3, look: [0, 0, 1] },
};
const KIND_IDS = Object.keys(KINDS);
const SEE_THROUGH = new Set(['water', 'gas']);   // przez nie widać bloki pod spodem (te też są rysowane)
// gdzie w ciele (edytor wokseli Hive Hunger: „Where in a body”)
export const WHERE = { everywhere: 'Everywhere', surface: 'Surface layer', under: 'Under the surface', deep: 'Deep inside', core: 'The core', veins: 'Veins', pools: 'Pools / lakes' };
// ciecze i gaz w kosmosie (Hive Hunger: CONFIG.liquids, CONFIG.gas — liczby na klatkę 60 Hz, jednostka gry = 1 m)
export const LIQUIDS = {
  water: { color: 0x3f7fd0, opacity: 0.75, size: 0.17, speed: 0.02, damping: 0.99, cohesion: 0.0012, reach: 0.9, rest: 0.38, push: 0.02, crowd: 8 },
  lava: { color: 0xff6a20, glow: true, size: 0.17, speed: 0.012, damping: 0.95, cohesion: 0.003, reach: 0.9, rest: 0.38, push: 0.02, crowd: 8 },
};
export const GAS = { speed: 0.004, damping: 0.96, stir: 0.0001, reach: 1.1, push: 0.0005, maxSpeed: 0.006, size: 1.2, maxSize: 3, grow: 0.006, opacity: 0.45,
  colors: [[196, 160, 232], [150, 200, 240], [235, 185, 225]] };

export const BODY_DEFAULTS = {
  shape: 'sphere', radius: 8, voxel: 0.5, seed: 1, text: 'GL',
  layers: [
    { kind: 'rock', where: 'everywhere', amount: 100 },
    { kind: 'sand', where: 'surface', amount: 60 },
    { kind: 'iron', where: 'veins', amount: 10 },
    { kind: 'water', where: 'pools', amount: 12 },
    { kind: 'gas', where: 'deep', amount: 15 },
    { kind: 'lava', where: 'core', amount: 100 },
  ],
};
export const SHAPES = { sphere: 'Sphere (planetoid)', cube: 'Cube', pair: 'Two spheres', boxes: 'Boxes', belt: 'Belt of rocks', balls: 'Test balls (one per kind)', text: 'Text' };

export function normalizeBody(d = {}) {
  const b = { ...BODY_DEFAULTS, ...d };
  if (!SHAPES[b.shape]) b.shape = 'sphere';
  b.radius = Math.max(1, Math.min(40, +b.radius || 8)); b.voxel = Math.max(0.1, Math.min(2, +b.voxel || 0.5)); b.seed = Math.max(1, Math.round(+b.seed || 1));
  b.layers = (Array.isArray(b.layers) ? b.layers : BODY_DEFAULTS.layers).filter((l) => KINDS[l.kind] && WHERE[l.where]).map((l) => ({ kind: l.kind, where: l.where, amount: Math.max(0, Math.min(100, +l.amount || 0)) }));
  // materiały bloków stałych tej bryły (opisy MatKit; brak — materiał domyślny rodzaju, KINDS[].mat)
  b.mats = Object.fromEntries(Object.entries(b.mats && typeof b.mats === 'object' ? b.mats : {})
    .filter(([k, v]) => KINDS[k] && KINDS[k].state === 'solid' && v && typeof v === 'object'));
  return b;
}

// szum wartości 3D (warstwy: żyły, jeziorka, plamy w strefach)
function noise3(seed) {
  const h = (x, y, z) => { let n = (x * 374761393 + y * 668265263 + z * 1274126177 + seed * 1442695041) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
    const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
  };
}

export function buildBody(def0) {
  const def = normalizeBody(def0), s = def.voxel;
  const look = { shape: def.shape, radius: def.radius, text: def.text, seed: def.seed, size: Math.round(def.radius * 2 / s) || 10, gap: 6,
    rows: [[1, 2, 3], [4, 5, 6, 7]], colors: KIND_IDS.map((k) => [0, 0, 0]), count: 8, max: 4 };
  const sh = buildShape(look, s);
  const [NX, NY, NZ] = sh.dims || [sh.N, sh.N, sh.N], N = NX * NY * NZ;
  const halfX = NX * s / 2, halfY = NY * s / 2, halfZ = NZ * s / 2;
  const at = (i, j, k) => (k * NY + j) * NX + i;
  // 0 — pusto, inaczej indeks rodzaju + 1
  const cell = new Uint8Array(N), tag = new Uint8Array(N);
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const t = sh.fill(i, j, k); if (t) { cell[at(i, j, k)] = 1; tag[at(i, j, k)] = t; } }
  // głębokość od powierzchni (w blokach): przeszukiwanie wszerz od bloków z pustym sąsiadem
  const depth = new Int16Array(N).fill(-1), queue = new Int32Array(N); let qh = 0, qt = 0, maxD = 1;
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const c = at(i, j, k); if (!cell[c]) continue;
    for (const [a, b, e] of NEIGHBORS) { const ii = i + a, jj = j + b, kk = k + e; if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ || !cell[at(ii, jj, kk)]) { depth[c] = 0; queue[qt++] = c; break; } }
  }
  while (qh < qt) {
    const c = queue[qh++], i = c % NX, j = Math.floor(c / NX) % NY, k = Math.floor(c / (NX * NY));
    for (const [a, b, e] of NEIGHBORS) { const ii = i + a, jj = j + b, kk = k + e; if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) continue; const n = at(ii, jj, kk); if (cell[n] && depth[n] < 0) { depth[n] = depth[c] + 1; maxD = Math.max(maxD, depth[n]); queue[qt++] = n; } }
  }
  // warstwy po kolei (późniejsza nadpisuje): strefa z głębokości, żyły i jeziorka z szumu, „ile” — próg szumu
  const n1 = noise3(def.seed * 13 + 1), n2 = noise3(def.seed * 17 + 2), sc = 1 / Math.max(2, 3 / s);
  def.layers.forEach((L, li) => {
    const kid = KIND_IDS.indexOf(L.kind) + 1, a = L.amount / 100, nz = noise3(def.seed * 31 + li * 7);
    for (let c = 0; c < N; c++) {
      if (!cell[c]) continue;
      const i = c % NX, j = Math.floor(c / NX) % NY, k = Math.floor(c / (NX * NY)), d = depth[c] / maxD, dv = depth[c];
      let inZone;
      switch (L.where) {
        case 'everywhere': inZone = true; break;
        case 'surface': inZone = dv <= 1; break;
        case 'under': inZone = dv > 1 && d <= 0.35; break;
        case 'deep': inZone = d > 0.35 && d <= 0.75; break;
        case 'core': inZone = d > 0.75; break;
        case 'veins': inZone = dv > 0 && Math.abs(n1(i * sc * 1.3, j * sc * 1.3, k * sc * 1.3) - 0.5) < a * 0.25; break;   // pasma wzdłuż poziomicy szumu
        case 'pools': inZone = d <= 0.3 && n2(i * sc * 0.8, j * sc * 0.8, k * sc * 0.8) > 1 - a * 1.6; break;
        default: inZone = false;
      }
      if (!inZone) continue;
      if (L.where !== 'veins' && L.where !== 'pools' && a < 1 && nz(i * sc, j * sc, k * sc) > a) continue;
      cell[c] = kid;
    }
  });
  if (def.shape === 'balls') for (let c = 0; c < N; c++) if (cell[c]) cell[c] = Math.min(KIND_IDS.length, tag[c]);   // kule: jedna na rodzaj

  /* ---- rysowanie: dla każdego rodzaju siatka instancji odsłoniętych bloków ---- */
  const group = new THREE.Group(); group.name = 'blocks';
  const box = new THREE.BoxGeometry(s, s, s);
  const meshes = new Map(), mats = [];
  function materialFor(kid) {
    const K = KINDS[KIND_IDS[kid - 1]];
    if (K.state === 'solid') {
      const m = makeMaterial(def.mats[KIND_IDS[kid - 1]] || K.mat, { res: 256 }), tile = m.material.userData.tile;
      // UV w układzie świata (rzut wzdłuż osi ściany): faktura ciągnie się przez sąsiednie bloki zamiast powtarzać się w każdym
      m.material.onBeforeCompile = (sh2) => {
        sh2.vertexShader = sh2.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          vec4 bwp = modelMatrix * instanceMatrix * vec4(position, 1.0); vec3 bn = abs(normal);
          vec2 btp = (bn.x > 0.5 ? bwp.zy : (bn.y > 0.5 ? bwp.xz : bwp.xy)) / ${tile.toFixed(3)};
          #ifdef USE_MAP
          vMapUv = btp;
          #endif
          #ifdef USE_NORMALMAP
          vNormalMapUv = btp;
          #endif
          #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = btp;
          #endif
          #ifdef USE_METALNESSMAP
          vMetalnessMapUv = btp;
          #endif
          #ifdef USE_AOMAP
          vAoMapUv = btp;
          #endif`);
      };
      mats.push(m); return { material: m.material, geo: box };
    }
    // ciecze i gaz: wygląd z Hive Hunger (addLiquidLook) — atrybut „liquid” stały dla całej siatki, miejsce w świecie
    const geo = box.clone(), nv = geo.attributes.position.count, lq = new Float32Array(nv * 3);
    for (let v = 0; v < nv; v++) lq.set(K.look, v * 3);
    geo.setAttribute('liquid', new THREE.BufferAttribute(lq, 3));
    const material = new THREE.MeshStandardMaterial({ color: K.color, roughness: K.state === 'liquid' && KIND_IDS[kid - 1] === 'water' ? 0.08 : 0.6, metalness: 0,
      transparent: SEE_THROUGH.has(KIND_IDS[kid - 1]), opacity: KIND_IDS[kid - 1] === 'gas' ? 0.55 : KIND_IDS[kid - 1] === 'water' ? 0.78 : 1, depthWrite: !SEE_THROUGH.has(KIND_IDS[kid - 1]) });
    material.onBeforeCompile = (sh2) => { addLiquidLook(sh2); sh2.vertexShader = sh2.vertexShader.replace('vSpot = position;', 'vSpot = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz * 0.6;'); };
    mats.push({ dispose: () => { material.dispose(); geo.dispose(); } }); return { material, geo };
  }
  const mtx = new THREE.Matrix4();
  function redraw() {
    const lists = new Map();
    for (let k = 0; k < NZ; k++) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const c = at(i, j, k), kid = cell[c]; if (!kid) continue;
      const me = KIND_IDS[kid - 1], clear = SEE_THROUGH.has(me);
      let shown = false;
      for (const [a, b, e] of NEIGHBORS) {
        const ii = i + a, jj = j + b, kk = k + e;
        if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) { shown = true; break; }
        const nk = cell[at(ii, jj, kk)];
        if (!nk || (!clear && SEE_THROUGH.has(KIND_IDS[nk - 1]))) { shown = true; break; }
      }
      if (!shown) continue;
      if (!lists.has(kid)) lists.set(kid, []);
      lists.get(kid).push((i + 0.5) * s - halfX, (j + 0.5) * s - halfY, (k + 0.5) * s - halfZ);
    }
    for (const [kid, mesh] of meshes) if (!lists.has(kid)) { mesh.count = 0; }
    for (const [kid, p] of lists) {
      let mesh = meshes.get(kid); const n = p.length / 3;
      if (!mesh || mesh.instanceMatrix.count < n) {
        if (mesh) { group.remove(mesh); mesh.dispose(); }
        const f = mesh ? { material: mesh.material, geo: mesh.geometry } : materialFor(kid);
        mesh = new THREE.InstancedMesh(f.geo, f.material, Math.ceil(n * 1.1) + 16);
        mesh.castShadow = mesh.receiveShadow = !SEE_THROUGH.has(KIND_IDS[kid - 1]); mesh.frustumCulled = false; mesh.renderOrder = SEE_THROUGH.has(KIND_IDS[kid - 1]) ? 1 : 0;
        mesh.userData.kind = KIND_IDS[kid - 1]; meshes.set(kid, mesh); group.add(mesh);
      }
      for (let q = 0; q < n; q++) { mtx.makeTranslation(p[q * 3], p[q * 3 + 1], p[q * 3 + 2]); mesh.setMatrixAt(q, mtx); }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    }
  }
  redraw();

  // komórka pod punktem świata (lokalny układ bryły) albo −1
  const local = new THREE.Vector3();
  function cellAt(p) {
    local.copy(p); group.worldToLocal(local);
    const i = Math.floor((local.x + halfX) / s), j = Math.floor((local.y + halfY) / s), k = Math.floor((local.z + halfZ) / s);
    return i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ ? -1 : at(i, j, k);
  }
  const wp = new THREE.Vector3();
  const body = {
    group, def, alive: true, bound: sh.bound || Math.hypot(halfX, halfY, halfZ), voxel: s,
    isSolid(p) { const c = cellAt(p); return c >= 0 && cell[c] > 0; },
    kindAt(p) { const c = cellAt(p); return c >= 0 && cell[c] ? KIND_IDS[cell[c] - 1] : null; },
    // ugryzienie: bloki w kuli (punkt świata, promień m) znikają; zwraca je ze środkami (świat) — ciecze i gaz dla zachowań
    bite(p, r) {
      local.copy(p); group.worldToLocal(local);
      const out = [], R = Math.ceil(r / s), ci = Math.floor((local.x + halfX) / s), cj = Math.floor((local.y + halfY) / s), ck = Math.floor((local.z + halfZ) / s);
      for (let k = ck - R; k <= ck + R; k++) for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
        if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) continue;
        const c = at(i, j, k); if (!cell[c]) continue;
        const x = (i + 0.5) * s - halfX, y = (j + 0.5) * s - halfY, z = (k + 0.5) * s - halfZ;
        if ((x - local.x) ** 2 + (y - local.y) ** 2 + (z - local.z) ** 2 > r * r) continue;
        wp.set(x, y, z); group.localToWorld(wp);
        out.push({ kind: KIND_IDS[cell[c] - 1], x: wp.x, y: wp.y, z: wp.z }); cell[c] = 0;
      }
      if (out.length) redraw();
      return out;
    },
    // pierwszy blok wzdłuż promienia (krok pół bloku) — punkt świata albo null
    raycast(origin, dir, max = 500) {
      const p = new THREE.Vector3(), d = dir.clone().normalize();
      for (let t = 0; t < max; t += s * 0.5) { p.copy(origin).addScaledVector(d, t); if (body.isSolid(p)) return p.clone(); }
      return null;
    },
    counts() { const o = {}; for (let c = 0; c < N; c++) if (cell[c]) { const k = KIND_IDS[cell[c] - 1]; o[k] = (o[k] || 0) + 1; } return o; },
    drawn() { let n = 0; for (const m of meshes.values()) n += m.count; return n; },
    update(t) { LIQUID_TIME.value = t; },
    dispose() { for (const m of meshes.values()) { group.remove(m); m.dispose(); } mats.forEach((m) => m.dispose()); box.dispose(); },
  };
  return body;
}

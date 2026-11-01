// CaveKit: caves from a seed — passages, chambers, stalactites and stalagmites, loose rocks — and the rock they are cut
// in (limestone, granite, sandstone, basalt), dry or wet. The model only: it does not know where it is or how it is lit.
//
// How it is made: the passages are a skeleton (a random walk with branches; chambers at some of its nodes). Together
// they make a signed distance field — negative in the air of the cave, positive in the rock — roughened by 3D noise.
// The wall is where the field crosses zero, found on a grid with surface nets (one vertex per cell the wall passes
// through, a quad per grid edge it crosses), its normals from the field's gradient, pointing into the air.
// The rock's colour is painted per vertex from the same position (layers, veins, speckles); fine relief comes from a
// generated normal map. Lakes: a flat, plain water surface in some chambers, cut to the walls; how the water looks
// (its style) is chosen in the water lab.
//
//   const cave = buildCave({ seed, length, branches, width, winding, chambers, rough, cell, drips, rubble, lakes, rock, wet });
//   scene.add(cave.group); cave.spawn (a point in the air of the first chamber), cave.nodes, cave.lake (the water mesh,
//   or null — its material is a plain placeholder for the water lab's styles), cave.stats; cave.dispose()
//   setRock(cave, rockId, { wet, relief }) — repaints and changes the material without rebuilding the shape.
import * as THREE from '../../../vendor/three/three.module.js';

export const ROCKS = {
  limestone: { name: 'Limestone', namePl: 'Wapień', base: [0.78, 0.74, 0.64], dark: [0.55, 0.5, 0.42], vein: [0.9, 0.88, 0.8], layers: 1.6, layerAmp: 0.18, speckle: 0.05, veins: 0.35, rough: 0.82, note: 'Pale, in thin beds, with white calcite veins — where most caves form.' },
  granite: { name: 'Granite', namePl: 'Granit', base: [0.52, 0.5, 0.48], dark: [0.28, 0.27, 0.27], vein: [0.78, 0.66, 0.6], layers: 0, layerAmp: 0, speckle: 0.32, veins: 0.05, rough: 0.7, note: 'Grey with dark and pink grains, no beds; hard, the walls stay angular.' },
  sandstone: { name: 'Sandstone', namePl: 'Piaskowiec', base: [0.66, 0.44, 0.28], dark: [0.45, 0.27, 0.16], vein: [0.8, 0.62, 0.42], layers: 3.2, layerAmp: 0.32, speckle: 0.08, veins: 0, rough: 0.92, note: 'Rust and ochre in clear bands, matte and sandy.' },
  basalt: { name: 'Basalt', namePl: 'Bazalt', base: [0.2, 0.2, 0.21], dark: [0.1, 0.1, 0.11], vein: [0.36, 0.33, 0.3], layers: 0, layerAmp: 0, speckle: 0.12, veins: 0.08, rough: 0.6, note: 'Almost black, fine-grained — lava tubes are cut in it.' },
};

/* ---------------- random numbers and noise (deterministic from the seed) ---------------- */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function noise3(seed) {
  const P = new Uint8Array(512), R = rng(seed * 7919 + 13);
  for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const h = (x, y, z) => P[P[P[x & 255] + (y & 255)] + (z & 255)] / 255;
  const s = (t) => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
  return (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = s(x - X), v = s(y - Y), w = s(z - Z);
    return L(L(L(h(X, Y, Z), h(X + 1, Y, Z), u), L(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), v),
      L(L(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), L(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), v), w) * 2 - 1;
  };
}
const fbm = (n, x, y, z, oct) => { let a = 0, f = 1, m = 0.5; for (let i = 0; i < oct; i++) { a += n(x * f, y * f, z * f) * m; f *= 2.03; m *= 0.5; } return a; };

/* ---------------- the skeleton: passages and chambers ---------------- */
function skeleton(o) {
  const R = rng(o.seed), segs = [], nodes = [], rooms = [];
  const step = o.width * 1.6;
  function walk(start, dir, n, r0) {
    let p = start.clone(), d = dir.clone().normalize();
    for (let i = 0; i < n; i++) {
      d.x += (R() - 0.5) * o.winding * 1.4; d.z += (R() - 0.5) * o.winding * 1.4; d.y += (R() - 0.5) * o.winding * 0.5 - d.y * 0.35;
      d.normalize();
      const q = p.clone().addScaledVector(d, step * (0.7 + R() * 0.6));
      const r = r0 * (0.75 + R() * 0.5);
      segs.push([p.clone(), q.clone(), r, r * (0.75 + R() * 0.5)]); nodes.push(q.clone());
      p = q;
    }
    return p;
  }
  const n = Math.max(3, Math.round(o.length / step));
  walk(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0.2), n, o.width / 2);
  const main = nodes.slice();
  for (let b = 0; b < o.branches; b++) {
    const from = main[Math.floor(R() * main.length)];
    const ang = R() * Math.PI * 2;
    walk(from, new THREE.Vector3(Math.cos(ang), (R() - 0.5) * 0.6, Math.sin(ang)), Math.max(3, Math.round(n * (0.4 + R() * 0.4))), o.width * (0.3 + R() * 0.15));
  }
  rooms.push([new THREE.Vector3(0, o.width * 0.3, 0), o.width * (1.3 + R() * 0.5)]);   // the entrance chamber: the spawn point
  for (let c = 0; c < o.chambers; c++) {
    const at = nodes[Math.floor(R() * nodes.length)];
    rooms.push([at.clone().add(new THREE.Vector3(0, o.width * 0.4, 0)), o.width * (1.3 + R() * 1.6)]);
  }
  return { segs, nodes, rooms };
}

/* ---------------- the field and the wall (surface nets) ---------------- */
function capsule(px, py, pz, a, b, ra, rb) {
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z, pax = px - a.x, pay = py - a.y, paz = pz - a.z;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy * 1.6 + dz * dz) - (ra + (rb - ra) * h);   // y stretched: passages wider than tall
}
const smin = (a, b, k) => { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };

function surfaceNets(field, nx, ny, nz, org, cell) {
  const idx = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const F = (i, j, k) => field[i + nx * (j + ny * k)];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const q = corners[c]; v[c] = F(i + q[0], j + q[1], k + q[2]); if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]), A = corners[a], B = corners[b];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; cnt++;
    }
    idx[i + nx * (j + ny * k)] = pos.length / 3;
    pos.push(org.x + (i + sx / cnt) * cell, org.y + (j + sy / cnt) * cell, org.z + (k + sz / cnt) * cell);
  }
  const ind = [];
  const I = (i, j, k) => idx[i + nx * (j + ny * k)];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = F(i, j, k) < 0;
    // edge along x from (i,j,k): the 4 cells around it share it
    if (i < nx - 1 && a !== (F(i + 1, j, k) < 0)) quad(I(i, j, k), I(i, j - 1, k), I(i, j - 1, k - 1), I(i, j, k - 1), a);
    if (j < ny - 1 && a !== (F(i, j + 1, k) < 0)) quad(I(i, j, k), I(i, j, k - 1), I(i - 1, j, k - 1), I(i - 1, j, k), a);
    if (k < nz - 1 && a !== (F(i, j, k + 1) < 0)) quad(I(i, j, k), I(i - 1, j, k), I(i - 1, j - 1, k), I(i, j - 1, k), a);
  }
  function quad(p, q, r, s, flip) {
    if (p < 0 || q < 0 || r < 0 || s < 0) return;
    if (flip) ind.push(p, s, r, p, r, q); else ind.push(p, q, r, p, r, s);
  }
  return { pos, ind };
}

/* ---------------- the rock: colour per vertex, relief from a normal map ---------------- */
let reliefTex = null;
function reliefMap() {
  if (reliefTex) return reliefTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), n = noise3(99);
  const H = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S * 8, v = j / S * 8;     // tileable: the noise wraps every 8 lattice cells in x and y
    const t = (a, b) => { let s = 0, f = 1, m = 0.5; for (let o = 0; o < 4; o++) { const p = 8 * f; s += m * n((a * f) % p, (b * f) % p, o * 5.3); f *= 2; m *= 0.5; } return s; };
    H[i + j * S] = t(u, v);
  }
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const hx = H[((i + 1) % S) + j * S] - H[((i + S - 1) % S) + j * S], hy = H[i + ((j + 1) % S) * S] - H[i + ((j + S - 1) % S) * S];
    const k = (i + j * S) * 4, nx = -hx * 3, ny = -hy * 3, l = Math.hypot(nx, ny, 1);
    img.data[k] = (nx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  reliefTex = new THREE.CanvasTexture(c); reliefTex.wrapS = reliefTex.wrapT = THREE.RepeatWrapping; reliefTex.anisotropy = 4;
  return reliefTex;
}

function paint(geo, rock, seed, wet) {
  const R = ROCKS[rock] || ROCKS.limestone, n = noise3(seed + 5), p = geo.attributes.position, nor = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const warp = fbm(n, x * 0.08, y * 0.08, z * 0.08, 2) * 1.5;
    let t = 0.5 + 0.5 * fbm(n, x * 0.35, y * 0.35, z * 0.35, 3);
    if (R.layers) t = t * (1 - R.layerAmp) + R.layerAmp * (0.5 + 0.5 * Math.sin((y + warp) * R.layers * Math.PI));
    const sp = R.speckle ? (n(x * 9.1, y * 9.1, z * 9.1) > 0.45 ? -R.speckle * 2 : n(x * 7.3 + 9, y * 7.3, z * 7.3) > 0.55 ? R.speckle : 0) : 0;
    const vein = R.veins ? Math.max(0, 1 - Math.abs(fbm(n, x * 0.25 + 40, y * 0.25, z * 0.25, 3)) * 18) * R.veins : 0;
    // drip streaks on the walls (wetter darker downwards) and the floor darker where water stands
    const ny = nor ? nor.getY(i) : 0;
    const damp = wet * (0.25 + 0.35 * Math.max(0, ny) + 0.2 * (0.5 + 0.5 * n(x * 2, y * 0.3, z * 2)));
    for (let c = 0; c < 3; c++) {
      let v = R.dark[c] + (R.base[c] - R.dark[c]) * t + sp;
      v = v + (R.vein[c] - v) * vein;
      col[i * 3 + c] = Math.max(0, Math.min(1, v * (1 - damp * 0.45)));
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// box-projected UVs (the axis the normal points along), for the relief map
function projectUV(geo, scale) {
  const p = geo.attributes.position, nor = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) { uv[i * 2] = x / scale; uv[i * 2 + 1] = z / scale; }
    else if (ax >= az) { uv[i * 2] = z / scale; uv[i * 2 + 1] = y / scale; }
    else { uv[i * 2] = x / scale; uv[i * 2 + 1] = y / scale; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function rockMaterial(rock, { wet = 0, relief = 1 } = {}) {
  const R = ROCKS[rock] || ROCKS.limestone;
  // wet rock: a thin film of water — a glossy clear coat over the same rough stone
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: R.rough, metalness: 0, normalMap: reliefMap(), normalScale: new THREE.Vector2(relief, relief),
    clearcoat: wet, clearcoatRoughness: 0.12 + 0.3 * (1 - wet),
  });
}

/* ---------------- stalactites, stalagmites, rubble ---------------- */
function drips(geo, o, R) {
  const p = geo.attributes.position, nor = geo.attributes.normal, out = [];
  const cone = new THREE.ConeGeometry(1, 1, 7, 1, false).translate(0, 0.5, 0);
  for (let i = 0; i < p.count; i++) {
    const ny = nor.getY(i);
    if (ny < -0.8 && R() < o.drips * 0.05) out.push(['down', i]);        // ceiling: the normal points down into the air
    else if (ny > 0.85 && R() < o.drips * 0.025) out.push(['up', i]);
  }
  const geos = [];
  for (const [dir, i] of out) {
    const h = o.width * (0.12 + R() * 0.45), r = h * (0.08 + R() * 0.07);
    const g = cone.clone().scale(r, h, r);
    if (dir === 'down') g.rotateX(Math.PI);
    g.translate(p.getX(i), p.getY(i) + (dir === 'down' ? 0.05 : -0.05), p.getZ(i));
    geos.push(g);
  }
  return geos;
}
function rubble(o, nodes, R) {
  const out = [], base = new THREE.IcosahedronGeometry(1, 1), nz = noise3(o.seed + 17);
  const n = Math.round(o.rubble * nodes.length * 2);
  for (let k = 0; k < n; k++) {
    const at = nodes[Math.floor(R() * nodes.length)], s = o.width * (0.05 + R() * R() * 0.25), off = R() * 100;
    const g = base.clone(), pa = g.attributes.position;
    // each corner pushed by noise of its direction: corners shared by faces move together, the stone stays closed
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), f = 0.72 + 0.45 * (0.5 + 0.5 * nz(x * 1.7 + off, y * 1.7, z * 1.7)); pa.setXYZ(i, x * f, y * f * 0.7, z * f); }
    g.computeVertexNormals(); g.scale(s, s, s);
    g.translate(at.x + (R() - 0.5) * o.width * 0.8, at.y - o.width * 0.35, at.z + (R() - 0.5) * o.width * 0.8);
    out.push(g);
  }
  return out;
}
function merge(geos) {
  let n = 0, m = 0; for (const g of geos) { n += g.attributes.position.count; m += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), ind = new Uint32Array(m);
  let o = 0, q = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    const c = g.attributes.position.count;
    if (g.index) { for (let i = 0; i < g.index.count; i++) ind[q++] = g.index.getX(i) + o; } else { for (let i = 0; i < c; i++) ind[q++] = i + o; }
    o += c; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(ind, 1));
  return out;
}

/* ---------------- the cave ---------------- */
export const CAVE_DEFAULTS = { seed: 7, length: 70, branches: 2, width: 6, winding: 0.5, chambers: 3, rough: 0.5, cell: 0.45, drips: 0.6, rubble: 0.5, lakes: 0.5, rock: 'limestone', wet: 0.3, relief: 1 };

// a plain water surface: dark, glossy, a little see-through — the look of the water itself belongs to the water lab
export function lakeMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: 0x0c1a1c, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.86, clearcoat: 1, clearcoatRoughness: 0.03 });
}

// lakes: in some chambers (never the first), a flat surface a little above the chamber's floor, kept only where the
// field says air — so it ends at the walls whatever their shape
function lakes(o, rooms, sample, cell, R) {
  const pos = [], ind = [];
  for (let r = 1; r < rooms.length; r++) {
    if (R() >= o.lakes) continue;
    const [c, rad] = rooms[r], ry = rad / 1.5, level = c.y - ry * (0.55 + R() * 0.2), ext = rad * 1.3, st = cell;
    const n = Math.ceil(ext * 2 / st) + 1, base = pos.length / 3, air = new Uint8Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = c.x - ext + i * st, z = c.z - ext + j * st;
      air[i + j * n] = sample(x, level, z) < -0.05 ? 1 : 0;
      pos.push(x, level, z);
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = i + j * n;
      if (air[a] && air[a + 1] && air[a + n] && air[a + n + 1]) ind.push(base + a, base + a + n, base + a + 1, base + a + 1, base + a + n, base + a + n + 1);
    }
  }
  if (!ind.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals();
  return g;
}

export function buildCave(opts = {}) {
  const o = { ...CAVE_DEFAULTS, ...opts }, t0 = performance.now();
  const sk = skeleton(o), n = noise3(o.seed);
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const [a, b, ra, rb] of sk.segs) { const r = Math.max(ra, rb); min.min(a.clone().subScalar(r)).min(b.clone().subScalar(r)); max.max(a.clone().addScalar(r)).max(b.clone().addScalar(r)); }
  for (const [c, r] of sk.rooms) { min.min(c.clone().subScalar(r)); max.max(c.clone().addScalar(r)); }
  const pad = o.width * 0.8 + o.rough * o.width; min.subScalar(pad); max.addScalar(pad);
  // the grid: at most ~2.4 M samples, the cell grows when the cave is big
  let cell = o.cell; const ext = max.clone().sub(min);
  while ((ext.x / cell) * (ext.y / cell) * (ext.z / cell) > 2.4e6) cell *= 1.1;
  const nx = Math.ceil(ext.x / cell) + 2, ny = Math.ceil(ext.y / cell) + 2, nz = Math.ceil(ext.z / cell) + 2;
  const field = new Float32Array(nx * ny * nz), amp = o.rough * o.width * 0.35, fq = 0.9 / o.width;
  const k = o.width * 0.6;
  for (let kk = 0; kk < nz; kk++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = min.x + i * cell, y = min.y + j * cell, z = min.z + kk * cell;
    let d = 1e9;
    for (const [a, b, ra, rb] of sk.segs) d = smin(d, capsule(x, y, z, a, b, ra, rb), k);
    for (const [c, r] of sk.rooms) { const dx = x - c.x, dy = (y - c.y) * 1.5, dz = z - c.z; d = smin(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - r, k); }
    d += amp * fbm(n, x * fq, y * fq, z * fq, 3);
        field[i + nx * (j + ny * kk)] = d;
  }
  const { pos, ind } = surfaceNets(field, nx, ny, nz, min, cell);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(ind);
  // normals from the field's gradient, into the air (where the field is negative)
  const nor = new Float32Array(pos.length), G = (i, j, kk) => field[Math.max(0, Math.min(nx - 1, i)) + nx * (Math.max(0, Math.min(ny - 1, j)) + ny * Math.max(0, Math.min(nz - 1, kk)))];
  for (let v = 0; v < pos.length / 3; v++) {
    const fx = (pos[v * 3] - min.x) / cell, fy = (pos[v * 3 + 1] - min.y) / cell, fz = (pos[v * 3 + 2] - min.z) / cell;
    const i = Math.round(fx), j = Math.round(fy), kk = Math.round(fz);
    let gx = G(i + 1, j, kk) - G(i - 1, j, kk), gy = G(i, j + 1, kk) - G(i, j - 1, kk), gz = G(i, j, kk + 1) - G(i, j, kk - 1);
    const l = Math.hypot(gx, gy, gz) || 1; nor[v * 3] = -gx / l; nor[v * 3 + 1] = -gy / l; nor[v * 3 + 2] = -gz / l;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  projectUV(geo, 2.5);
  const group = new THREE.Group(), R = rng(o.seed + 101);
  const wall = new THREE.Mesh(geo, rockMaterial(o.rock, o)); wall.name = 'wall'; wall.castShadow = wall.receiveShadow = true;
  group.add(wall);
  const extras = drips(geo, o, R).concat(rubble(o, sk.nodes, R));
  let extra = null;
  if (extras.length) {
    const eg = merge(extras); projectUV(eg, 1.2);
    extra = new THREE.Mesh(eg, rockMaterial(o.rock, o)); extra.name = 'formations'; extra.castShadow = extra.receiveShadow = true; group.add(extra);
  }
  paint(geo, o.rock, o.seed, o.wet); if (extra) paint(extra.geometry, o.rock, o.seed, o.wet);
  const sample = (x, y, z) => G(Math.round((x - min.x) / cell), Math.round((y - min.y) / cell), Math.round((z - min.z) / cell));
  const lg = o.lakes > 0 ? lakes(o, sk.rooms, sample, cell, rng(o.seed + 303)) : null;
  const lake = lg ? new THREE.Mesh(lg, lakeMaterial()) : null;
  if (lake) { lake.name = 'lake'; lake.receiveShadow = true; lake.renderOrder = 1; group.add(lake); }
  const ms = performance.now() - t0;
  const tris = ind.length / 3 + (extra ? extra.geometry.index.count / 3 : 0) + (lake ? lake.geometry.index.count / 3 : 0);
  return {
    group, wall, extra, lake, opts: o, nodes: sk.nodes, rooms: sk.rooms,
    spawn: sk.rooms[0][0].clone(), bounds: new THREE.Box3(min, max),
    stats: { triangles: Math.round(tris), formations: extras.length, lakes: lake ? 'yes' : 'none', cell, grid: `${nx} × ${ny} × ${nz}`, ms },
    dispose() { for (const m of [wall, extra, lake]) if (m) { m.geometry.dispose(); m.material.dispose(); } },
  };
}

export function setRock(cave, rock, { wet = cave.opts.wet, relief = cave.opts.relief } = {}) {
  cave.opts.rock = rock; cave.opts.wet = wet; cave.opts.relief = relief;
  for (const m of [cave.wall, cave.extra]) {
    if (!m) continue;
    paint(m.geometry, rock, cave.opts.seed, wet);
    m.material.dispose(); m.material = rockMaterial(rock, { wet, relief });
  }
}

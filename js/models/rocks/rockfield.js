// Skały na terenie: głazy, bloki, płyty i piarg na terenie z RegionKit/LandKit — rodzaj skały z biomu (północ: granit,
// równiny: wapień i granit, pustynia: piaskowiec, bazalt na urwiskach), miejsce z gruntu: na zboczach więcej głazów,
// piarg pod stromymi ścianami, otoczaki na plażach, mało na płaskich łąkach, nic w wodzie. Reguły z laboratorium skał
// (tryb Rumowisko); każdy kamień inny: wariant kształtu, własne proporcje, pochylenie zgodne ze stokiem i odcień.
//
// ROCKS_DEFAULTS — ustawienia (zasób „rocks” z laboratorium skał): density — ile głazów (0…2), max — największy [m],
//   scree — piarg (0…2), moss, lichen (0…1), seed, radius — promień wokół kamery [m] (kafelki 128 m; piarg tylko do ~220 m)
// scatterRocks(T, x0, z0, x1, z1, def, seed) → [{ kind, shape (wariant), x, y, z, s, yaw, lean, tilt [x, z], shade, scree }]
// createRockField(scene) → { set(land, def) — land: { T } albo null, update(camera), counts, visible, dispose() }
import * as THREE from '../../../vendor/three/three.module.js';
import { sampleHeight } from '../../envs/land/landkit.js';
import { biomeAt } from '../../envs/land/regionkit.js';
import { rockGeometry, rockMaterial } from './rockkit.js';

export const ROCKS_DEFAULTS = { density: 1, max: 3, scree: 1, moss: 0.3, lichen: 0.3, seed: 5, radius: 600 };
const TILE = 128, VARIANTS = 6, SHAPES = ['boulder', 'block', 'slab'], SCREE_R = 220;   // scree (small stones) only within ~220 m

// gdzie leży każdy kamień: siatka z rozrzutem; biom wybiera rodzaj, grunt decyduje (woda, wysokość, nachylenie)
export function scatterRocks(T, x0, z0, x1, z1, def = {}, seed = 1) {
  const D = { ...ROCKS_DEFAULTS, ...def }, out = [], size = T.size;
  let s = seed >>> 0 || 1; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const wrap = (v) => (T.wrap ? ((v % size) + size) % size : v);
  const step = 6;
  for (let z = z0; z < z1; z += step) for (let x = x0; x < x1; x += step) {
    const px = x + (r() - 0.5) * step, pz = z + (r() - 0.5) * step, mx = wrap(px), mz = wrap(pz);
    if (!T.wrap && (mx < 0 || mz < 0 || mx >= size || mz >= size)) continue;
    const h = sampleHeight(T, mx, mz);
    if (h < 0.3) continue;
    const e = 2, gx = (sampleHeight(T, wrap(mx + e), mz) - h) / e, gz = (sampleHeight(T, mx, wrap(mz + e)) - h) / e, sl = Math.hypot(gx, gz);
    const b = biomeAt(T, mx, mz), rel = h / Math.max(1, T.relief);
    // chance of a boulder here: slopes and high ground have more, flat lowland meadows few; very steep faces shed them
    const ground = 0.05 + 0.9 * Math.min(1, sl / 0.6) * (sl > 1.4 ? 0.4 : 1) + 0.25 * Math.min(1, rel * 1.5);
    const beach = h < 3 && sl < 0.15 ? 1 : 0;
    const roll = r();
    const kind = roll < b.temperate ? (r() < 0.85 ? 'granite' : 'limestone')
      : roll < b.temperate + b.plains ? (r() < 0.6 ? 'limestone' : 'granite')
        : sl > 0.6 && r() < 0.5 ? 'basalt' : 'sandstone';
    const pick = r();
    if (pick < 0.045 * D.density * ground * (b.plains > 0.5 ? 0.5 : 1)) {       // a boulder
      const sz = Math.max(0.3, D.max * Math.pow(r(), 2.4));
      out.push({ kind, shape: SHAPES[Math.floor(r() * 3)], v: Math.floor(r() * VARIANTS), x: px, y: h, z: pz, s: sz, yaw: r() * 6.283, gx, gz, shade: r(), scree: false });
    }
    // scree under steep ground and pebbles on beaches: small stones in drifts
    const screeK = D.scree * (Math.min(1, Math.max(0, (sl - 0.35) / 0.5)) * 1.2 + beach * 0.6 + 0.06);
    const n = Math.floor(screeK * 1.5 + r());
    for (let i = 0; i < n; i++) {
      const qx = px + (r() - 0.5) * step, qz = pz + (r() - 0.5) * step;
      out.push({ kind, shape: 'pebble', v: Math.floor(r() * VARIANTS), x: qx, y: sampleHeight(T, wrap(qx), wrap(qz)), z: qz, s: 0.05 + 0.3 * Math.pow(r(), 2.2), yaw: r() * 6.283, gx, gz, shade: r(), scree: true });
    }
  }
  return out;
}
const tileSeed = (seed, i, j) => ((Math.imul(seed | 0, 2654435761) ^ Math.imul(i | 0, 40503) ^ Math.imul(j | 0, 9973)) >>> 0) || 1;

export function createRockField(scene) {
  const group = new THREE.Group(); group.name = 'rocks'; scene.add(group);
  let land = null, def = null, tiles = new Map(), near = new Set(), keyNow = '', sortT = 0, geos = new Map(), stones = 0;
  const geo = (kind, shape, v) => {   // variants per kind and shape, shared by all the tiles
    const k = `${kind}/${shape}/${v}`;
    if (!geos.has(k)) geos.set(k, rockGeometry({ kind, shape, size: 1, seed: def.seed * 131 + v * 17 + shape.length * 7, detail: shape === 'pebble' ? 0.25 : 0.55, moss: def.moss, lichen: def.lichen }));   // scree: 80 triangles a stone, boulders ~500 (many, far)
    return geos.get(k);
  };
  function clearMeshes() { for (const m of group.children) m.dispose && m.dispose(); group.clear(); }
  function clear() { clearMeshes(); for (const g of geos.values()) g.dispose(); geos.clear(); tiles.clear(); near = new Set(); keyNow = ''; stones = 0; }
  // the stones of the tiles around the camera, instanced by kind, shape and variant
  function rebuild() {
    clearMeshes();
    const by = new Map();
    for (const [tk, list] of tiles) for (const p of list) { if (p.scree && !near.has(tk)) continue; const k = `${p.kind}/${p.shape}/${p.v}`; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qt = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), C = new THREE.Color();
    stones = 0;
    for (const [k, list] of by) {
      const [kind, shape, v] = k.split('/'), im = new THREE.InstancedMesh(geo(kind, shape, +v), rockMaterial(kind), list.length);
      list.forEach((p, i) => {
        // lies along the slope (half of it), its own proportions and shade
        A.set(-p.gz, 0, p.gx); const sl = Math.hypot(p.gx, p.gz), ang = Math.atan(sl) * 0.5;   // axis: up × the ground's normal
        Q.setFromAxisAngle(Y, p.yaw); if (sl > 1e-4) { Qt.setFromAxisAngle(A.normalize(), ang); Q.premultiply(Qt); }
        const f = p.shade;
        Sc.set(p.s * (0.78 + 0.44 * ((f * 7.3) % 1)), p.s * (0.72 + 0.5 * ((f * 3.7) % 1)), p.s * (0.78 + 0.44 * ((f * 5.1) % 1)));
        M.compose(P.set(p.x, p.y - p.s * 0.04, p.z), Q, Sc); im.setMatrixAt(i, M);
        const vv = 0.88 + 0.24 * f, w = (((f * 11.3) % 1) - 0.5) * 0.08; im.setColorAt(i, C.setRGB(vv * (1 + w), vv, vv * (1 - w)));
      });
      im.castShadow = !list[0].scree; im.receiveShadow = true; im.frustumCulled = false;
      group.add(im); stones += list.length;
    }
  }
  function refresh(camera) {
    const R = def.radius, cx = camera.position.x, cz = camera.position.z;
    const i0 = Math.floor((cx - R) / TILE), i1 = Math.floor((cx + R) / TILE), j0 = Math.floor((cz - R) / TILE), j1 = Math.floor((cz + R) / TILE);
    const want = [], nearNow = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = Math.max(0, Math.abs(cx - (i + 0.5) * TILE) - TILE / 2), dz = Math.max(0, Math.abs(cz - (j + 0.5) * TILE) - TILE / 2), d2 = dx * dx + dz * dz;
      if (d2 <= R * R) want.push(i + ',' + j);
      if (d2 <= SCREE_R * SCREE_R) nearNow.push(i + ',' + j);
    }
    const key = want.join(';') + '|' + nearNow.join(';'); if (key === keyNow) return;
    keyNow = key; near = new Set(nearNow);
    const next = new Map();
    for (const k of want) {
      if (tiles.has(k)) { next.set(k, tiles.get(k)); continue; }
      const [i, j] = k.split(',').map(Number);
      next.set(k, scatterRocks(land.T, i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE, def, tileSeed(def.seed, i, j)));
    }
    tiles = next;
    rebuild();
  }
  return {
    group,
    get def() { return def; },
    get counts() { return { stones, tiles: tiles.size, variants: geos.size }; },
    set(l, d) {
      const nd = d ? { ...ROCKS_DEFAULTS, ...d } : null;
      if (l && land && l.T === land.T && JSON.stringify(nd) === JSON.stringify(def)) return;
      clear(); land = l; def = nd;
    },
    update(camera, dt = 0) {
      if (!land || !def) return;
      if ((sortT -= dt) <= 0) { sortT = 0.5; refresh(camera); }
    },
    set visible(b) { group.visible = b; },
    dispose() { clear(); scene.remove(group); },
  };
}

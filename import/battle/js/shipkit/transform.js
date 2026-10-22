// ShipKit transformer: turns a lab ship (hundreds of pieces, ~100 draw calls) into a game-ready one.
//  - three levels of detail in a THREE.LOD: LOD0 full detail merged per material, LOD1 lower segment counts without
//    rails, rigging and small pieces, LOD2 a primitive proxy (low hull + boxes); turrets and guns stay separate groups
//    on every level (they train and elevate) and are driven together through aim().
//  - many hitboxes for procedural destruction: the hull cut into compartments (length × side × bottom/belt/upper),
//    superstructure, funnel, masts and platforms in a 3 m grid, one box per mount and one per gun; each knows its
//    neighbours, volume and hit points; ray tests against the current pose.
//  - every vertex of every level carries the id of its hitbox (attribute aHit); a damage texture drives the
//    materials (scorching, dents in the hull, collapse of superstructure), so damage costs no extra draw calls.
// Units: the ShipKit ones (metres, +z bow, y = 0 waterline).
import * as THREE from '../../vendor/three.module.js';
import { KIT } from './geom.js';
import { SHIPS } from './index.js';
import { loftHull, sideAt } from './hull.js';

export const LOD_SPECS = [
  { name: 'LOD0', detail: 1, minSize: 0, dropThin: false, proxy: false, distance: 0 },
  { name: 'LOD1', detail: 0.5, minSize: 0.5, dropThin: true, proxy: false, distance: 170, staticSmallMounts: true,
    remap: { glass: 'dark', canvas: 'paint', bronze: 'metal', rope: 'metal', red: 'paint', lamp: 'white', wood: 'wooddeck' } },
  // far: boxes in two materials; only the main battery still trains (guns merged into their mounts)
  { name: 'LOD2', detail: 0.25, minSize: 2.2, dropThin: true, proxy: true, distance: 650, staticSmallMounts: true, flatMounts: true,
    remap: { '*': 'paint', hull: 'hull', deck: 'deck', wooddeck: 'deck' } },
];
export const KINDS = ['hull', 'superstructure', 'funnel', 'mast', 'platform', 'fitting', 'mount', 'gun'];
const REMOVABLE = new Set(['superstructure', 'funnel', 'mast', 'platform', 'fitting']);
const KIND_OF_PART = { superstructure: 'superstructure', funnel: 'funnel', masts: 'mast', antiAircraft: 'platform', fittings: 'fitting', torpedoes: 'platform', mainBattery: 'platform', hull: 'hull' };
const HP_PER_M3 = { hull: 60, superstructure: 25, funnel: 20, mast: 40, platform: 30, fitting: 20, mount: 90, gun: 120 };

const box3 = () => new THREE.Box3();
const inTree = (o, root) => { for (; o; o = o.parent) if (o === root) return true; return false; };
const topPart = (o, root) => { let p = o; while (p.parent && p.parent !== root) p = p.parent; return p.parent === root ? p.name : ''; };
function thinPiece(mesh) {
  const g = mesh.geometry, p = g.parameters;
  if (g.type === 'CylinderGeometry' && p && Math.max(p.radiusTop, p.radiusBottom) < 0.09) return true;
  g.computeBoundingBox(); const s = g.boundingBox.getSize(new THREE.Vector3()).toArray().sort((a, b) => a - b);
  return s[1] < 0.12;
}

/* ---------------- hitboxes ---------------- */
function hullCells(lines, step = 4) {
  const out = [];
  for (let z0 = lines.zStern; z0 < lines.zBow - 0.5; z0 += step) {
    const z1 = Math.min(lines.zBow, z0 + step), zs = [z0, (z0 + z1) / 2, z1];
    const T = Math.max(...zs.map((z) => lines.T(z))), deck = Math.max(...zs.map((z) => lines.deck(z)));
    const layers = [['bottom', -Math.max(T, 0.5), -1.2], ['belt', -1.2, 1.2], ['upper', 1.2, deck]];
    for (const [layer, y0, y1] of layers) {
      if (y1 - y0 < 0.2 || (layer === 'bottom' && T < 1.3)) continue;
      let hw = 0;
      for (const z of zs) for (const y of [y0, (y0 + y1) / 2, y1]) hw = Math.max(hw, sideAt(lines, z, Math.min(y, lines.deck(z))));
      if (hw < 0.3) continue;
      for (const s of [-1, 1]) out.push({ kind: 'hull', layer, side: s, box: new THREE.Box3(new THREE.Vector3(s > 0 ? 0 : -hw, y0, z0), new THREE.Vector3(s > 0 ? hw : 0, y1, z1)) });
    }
  }
  return out;
}

// One build of the ship, unmerged: hitboxes in ship space plus the piece lists the levels are merged from.
function analyse(id, detail) {
  KIT.unmerged = true;
  let b; try { b = SHIPS[id].build({ detail }); } finally { KIT.unmerged = false; }
  b.group.updateMatrixWorld(true);
  return b;
}

function makeHitboxes(b) {
  const root = b.group, boxes = [];
  for (const c of hullCells(b.lines)) boxes.push({ ...c, node: 'ship' });
  // mounts: one box per mount (swept around its training axis) and one per gun
  b.mounts.forEach((mt, i) => {
    const bb = box3().setFromObject(mt.group), c = new THREE.Vector3().setFromMatrixPosition(mt.group.matrixWorld);
    const r = Math.max(Math.abs(bb.min.x - c.x), Math.abs(bb.max.x - c.x), Math.abs(bb.min.z - c.z), Math.abs(bb.max.z - c.z)) * (mt.torp ? 1 : 0.85);
    boxes.push({ kind: 'mount', mount: i, name: mt.name, node: 'ship', box: new THREE.Box3(new THREE.Vector3(c.x - r, bb.min.y, c.z - r), new THREE.Vector3(c.x + r, bb.max.y, c.z + r)) });
    mt.guns.forEach((g, j) => {
      const gb = box3(), inv = g.matrixWorld.clone().invert();
      g.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); gb.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))); } });
      if (!gb.isEmpty()) boxes.push({ kind: 'gun', mount: i, gun: j, name: `${mt.name} gun ${j + 1}`, node: `gun:${i}:${j}`, box: gb });
    });
  });
  // superstructure, funnel, masts, platforms, fittings: the pieces clipped into a 3 m grid, one box per part and cell
  const CELL = new THREE.Vector3(3, 2.5, 3), cells = new Map();
  const mountGroups = b.mounts.map((m) => m.group);
  root.traverse((o) => {
    if (!o.isMesh || mountGroups.some((g) => inTree(o, g))) return;
    const part = topPart(o, root), kind = KIND_OF_PART[part] || 'fitting';
    if (kind === 'hull' || o.name === 'ensign' || o.name === 'sternName' || o.userData.decal || thinPiece(o)) return;
    const pb = box3().setFromObject(o);
    if (pb.isEmpty()) return;
    const i0 = Math.floor(pb.min.x / CELL.x), i1 = Math.floor(pb.max.x / CELL.x), j0 = Math.floor(pb.min.y / CELL.y), j1 = Math.floor(pb.max.y / CELL.y), k0 = Math.floor(pb.min.z / CELL.z), k1 = Math.floor(pb.max.z / CELL.z);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const cb = new THREE.Box3(new THREE.Vector3(i * CELL.x, j * CELL.y, k * CELL.z), new THREE.Vector3((i + 1) * CELL.x, (j + 1) * CELL.y, (k + 1) * CELL.z)).intersect(pb.clone());
      if (cb.isEmpty() || cb.getSize(new THREE.Vector3()).toArray().some((v) => v < 0.02)) continue;
      const key = `${kind}|${i}|${j}|${k}`;
      const c = cells.get(key); if (c) c.box.union(cb); else cells.set(key, { kind, part, node: 'ship', box: cb });
    }
  });
  for (const c of cells.values()) boxes.push(c);
  // ids, size, hit points, neighbours
  boxes.forEach((h, i) => {
    h.id = i; const s = h.box.getSize(new THREE.Vector3()); h.volume = s.x * s.y * s.z;
    h.hp = Math.round(Math.max(20, h.volume * HP_PER_M3[h.kind]));
    h.removable = REMOVABLE.has(h.kind);
  });
  const grow = boxes.map((h) => h.box.clone().expandByScalar(0.3));
  boxes.forEach((h) => { h.neighbours = []; });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (boxes[i].node !== boxes[j].node && boxes[i].kind !== 'mount' && boxes[j].kind !== 'mount') continue;
    if (grow[i].intersectsBox(grow[j])) { boxes[i].neighbours.push(j); boxes[j].neighbours.push(i); }
  }
  return boxes;
}

/* ---------------- merging ---------------- */
// Finds the hitbox of a ship-space point: the smallest box (of the preferred kinds) containing it, else the nearest.
function hitFinder(boxes) {
  const ship = boxes.filter((h) => h.node === 'ship');
  const tmp = new THREE.Vector3();
  return (p, prefer) => {
    let best = -1, bv = Infinity, near = -1, nd = Infinity;
    for (const h of ship) {
      if (prefer && !prefer(h)) continue;
      if (h.box.containsPoint(p)) { if (h.volume < bv) { bv = h.volume; best = h.id; } }
      else if (best < 0) { const d = h.box.distanceToPoint(p); if (d < nd) { nd = d; near = h.id; } }
    }
    return best >= 0 ? best : near >= 0 ? near : (prefer ? hitFinder(boxes)(p) : 0);
  };
}

// Merges a list of { mesh, toSpace (Matrix4), hit (fn(vertex in ship space) → id) | id } by material.
function mergeByMaterial(items, matOf) {
  const bins = new Map();
  for (const it of items) { const m = matOf(it.mesh); if (!bins.has(m)) bins.set(m, []); bins.get(m).push(it); }
  const meshes = [];
  const v = new THREE.Vector3(), ws = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const [mat, list] of bins) {
    let n = 0;
    const geos = list.map((it) => { const g = it.geo.index ? it.geo.toNonIndexed() : it.geo; n += g.attributes.position.count; return g; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), hit = new Float32Array(n);
    let o = 0;
    list.forEach((it, li) => {
      const g = geos[li], P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      nm.getNormalMatrix(it.toSpace);
      for (let k = 0; k < P.count; k++, o++) {
        v.fromBufferAttribute(P, k); ws.copy(v).applyMatrix4(it.toShip);
        v.applyMatrix4(it.toSpace); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, k).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z; }
        if (U) { uv[o * 2] = U.getX(k); uv[o * 2 + 1] = U.getY(k); }
        hit[o] = typeof it.hit === 'number' ? it.hit : it.hit(ws);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aHit', new THREE.BufferAttribute(hit, 1));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = (mat.name || 'mat') + ' ×' + list.length;
    meshes.push(mesh);
  }
  return meshes;
}

function boxGeo(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox, s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  return new THREE.BoxGeometry(Math.max(s.x, 0.05), Math.max(s.y, 0.05), Math.max(s.z, 0.05)).translate(c.x, c.y, c.z);
}

/* ---------------- damage ---------------- */
// One texel per hitbox (row 0: damage, half height; row 1: centre, kind 0 hull / 1 removable / 2 mount / 3 inert)
// plus a last inert one for rigging and rails, which only follow the ship.
function damageSystem(boxes) {
  const N = boxes.length + 1, data = new Float32Array(N * 2 * 4);
  data.set([0, 0, 0, 3], (N + N - 1) * 4);
  boxes.forEach((h, i) => {
    const c = h.box.getCenter(new THREE.Vector3()), s = h.box.getSize(new THREE.Vector3());
    const kind = h.kind === 'hull' ? 0 : h.removable ? 1 : 2;
    data.set([0, s.y / 2, 0, 0], i * 4); data.set([c.x, c.y, c.z, kind], (N + i) * 4);
  });
  const tex = new THREE.DataTexture(data, N, 2, THREE.RGBAFormat, THREE.FloatType);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true;
  const uniforms = { tDamage: { value: tex }, uDamageN: { value: N }, uDamageT: { value: 0 } };
  const level = new Float32Array(N);
  return {
    tex, uniforms, level,
    set(i, d) { level[i] = Math.max(0, Math.min(1, d)); data[i * 4] = level[i]; tex.needsUpdate = true; },
    add(i, d) { this.set(i, level[i] + d); },
    reset() { level.fill(0); for (let i = 0; i < N; i++) data[i * 4] = 0; tex.needsUpdate = true; },
  };
}
const patched = new WeakSet();
function patchMaterial(mat, uniforms) {
  if (patched.has(mat)) return; patched.add(mat);
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'attribute float aHit;\nuniform sampler2D tDamage; uniform float uDamageN, uDamageT;\nvarying float vDmg, vFire;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float hu = (aHit + 0.5) / uDamageN;
      vec4 dm = texture2D(tDamage, vec2(hu, 0.25)), cen = texture2D(tDamage, vec2(hu, 0.75));
      float dmg = dm.r; vDmg = dmg;
      float jit = fract(sin(float(gl_VertexID) * 12.9898 + aHit * 7.31) * 43758.5453);
      vFire = (cen.w > 0.5 && cen.w < 1.5) ? smoothstep(0.8, 1.0, dmg) * step(0.55, jit) : 0.0;   // embers in wrecked superstructure only
      if (cen.w < 0.5) transformed -= normal * dmg * dmg * (0.25 + 0.45 * jit);                          // hull: dented plating
      else if (cen.w < 1.5) {                                                                                  // superstructure: buckles, then collapses
        float c = smoothstep(0.45, 1.0, dmg); vec3 rel = transformed - cen.xyz;
        vec3 down = cen.xyz + vec3(rel.x * (1.0 + 0.25 * c) + (jit - 0.5) * 0.6 * c, rel.y * (1.0 - 0.8 * c) - dm.g * 0.75 * c, rel.z * (1.0 + 0.15 * c));
        transformed = mix(transformed, down, c) + normal * (jit - 0.5) * 0.25 * smoothstep(0.2, 0.6, dmg);
      }`);
    sh.fragmentShader = 'uniform float uDamageT;\nvarying float vDmg, vFire;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(1.0, 0.13, smoothstep(0.08, 0.8, vDmg));`);
    if (sh.fragmentShader.includes('#include <emissivemap_fragment>')) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1.0, 0.3, 0.06) * vFire * vFire * (0.55 + 0.45 * sin(uDamageT * 6.0 + gl_FragCoord.x * 0.07 + gl_FragCoord.y * 0.05)) * 0.6;`);
  };
  mat.customProgramCacheKey = () => 'dmg|' + prevKey();
  mat.needsUpdate = true;
}

/* ---------------- the transformer ---------------- */
export function transformShip(id, opt = {}) {
  const t0 = performance.now();
  const specs = opt.levels || LOD_SPECS;
  const base = analyse(id, 1);
  const boxes = makeHitboxes(base);
  const find = hitFinder(boxes);
  const hullKind = (h) => h.kind === 'hull', notHull = (h) => h.kind !== 'hull';
  const damage = damageSystem(boxes);
  const mats = base.materials, keyOf = new Map(Object.entries(mats).map(([k, m]) => [m, k]));
  Object.values(mats).forEach((m) => { m.name = keyOf.get(m); if (m.isMeshStandardMaterial || m.isMeshBasicMaterial) patchMaterial(m, damage.uniforms); });

  const lod = new THREE.LOD(); lod.name = `${id} (LOD)`;
  const levels = [], mountsAll = base.mounts.map((m) => ({ name: m.name, yaw0: m.yaw0, arc: m.arc, torp: !!m.torp, aa: !!m.aa, trains: [], guns: [] }));
  for (const spec of specs) {
    const t1 = performance.now();
    const b = spec.detail === 1 ? base : analyse(id, spec.detail);
    const root = b.group, bMats = b.materials, bKey = new Map(Object.entries(bMats).map(([k, m]) => [m, k]));
    const remap = spec.remap || {};
    const matOf = (mesh) => {
      if (!bKey.has(mesh.material)) return mesh.material;
      const k = bKey.get(mesh.material);
      return mats[remap[k] || (remap['*'] && !(k in remap) ? remap['*'] : k)];
    };
    const rotates = (mt) => !spec.staticSmallMounts || (!mt.aa && !mt.torp);      // far away AA and tubes do not visibly train
    const level = new THREE.Group(); level.name = spec.name;
    const statics = [], extras = [];
    const mountGroups = b.mounts.map((m) => m.group);
    const shipInv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name === 'ensign' || o.name === 'sternName' || o.userData.decal) { if (!spec.proxy) extras.push(o); return; }
      if (b.mounts.some((m) => rotates(m) && inTree(o, m.train))) return;          // handled with its mount below
      const part = topPart(o, root);
      if (spec.dropThin && thinPiece(o) && !(spec.proxy && part === 'masts')) return;
      o.geometry.computeBoundingBox();
      const diag = o.geometry.boundingBox.getSize(new THREE.Vector3()).length();
      if (spec.minSize && diag < spec.minSize && (part !== 'hull' || spec.proxy) && o.name !== 'hull' && o.name !== 'decks') return;
      if (spec.proxy && part === 'masts') { const s = o.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().sort((a, b2) => a - b2); if (s[1] > 0.6) return; }
      const geo = spec.proxy && o.name !== 'hull' && o.name !== 'decks' ? boxGeo(o.geometry) : o.geometry;
      const toShip = shipInv.clone().multiply(o.matrixWorld);
      const mi = mountGroups.findIndex((g) => inTree(o, g));
      const mountBox = mi >= 0 ? boxes.find((h) => h.kind === 'mount' && h.mount === mi).id : -1;
      // long thin pieces (rigging, rails) are not torn between boxes: they stay as they are
      let hit = mountBox >= 0 ? mountBox : (part === 'hull' ? (p) => find(p, hullKind) : (p) => find(p, notHull));
      if (mountBox < 0 && thinPiece(o) && diag > 4) hit = boxes.length;                  // the inert texel
      statics.push({ mesh: o, geo, toShip, toSpace: toShip, hit });
    });
    for (const m of mergeByMaterial(statics, matOf)) level.add(m);
    for (const e of extras) { const c = e.clone(); c.applyMatrix4(shipInv.clone().multiply(e.parent.matrixWorld)); level.add(c); }
    // mounts: the train group (rotates) and each gun group (elevates) keep their own merged meshes
    b.mounts.forEach((mt, i) => {
      if (!rotates(mt)) return;
      const mBox = boxes.find((h) => h.kind === 'mount' && h.mount === i).id;
      const pivot = new THREE.Group(); pivot.name = mt.name;
      const tw = mt.train.matrixWorld, rel = shipInv.clone().multiply(tw);
      rel.decompose(pivot.position, pivot.quaternion, pivot.scale);
      const trainItems = [], gunGroups = [];
      const tInv = tw.clone().invert();
      mt.train.traverse((o) => {
        if (!o.isMesh || (!spec.flatMounts && mt.guns.some((g) => inTree(o, g)))) return;
        if (spec.dropThin && thinPiece(o)) return;
        o.geometry.computeBoundingBox(); if (spec.minSize && o.geometry.boundingBox.getSize(new THREE.Vector3()).length() < spec.minSize * 0.5) return;
        trainItems.push({ mesh: o, geo: spec.proxy ? boxGeo(o.geometry) : o.geometry, toShip: shipInv.clone().multiply(o.matrixWorld), toSpace: tInv.clone().multiply(o.matrixWorld), hit: mBox });
      });
      for (const m of mergeByMaterial(trainItems, matOf)) pivot.add(m);
      if (!spec.flatMounts) mt.guns.forEach((g, j) => {
        const gBox = boxes.find((h) => h.kind === 'gun' && h.mount === i && h.gun === j);
        const gp = new THREE.Group(); gp.name = 'gun ' + (j + 1);
        tInv.clone().multiply(g.matrixWorld).decompose(gp.position, gp.quaternion, gp.scale);
        const gInv = g.matrixWorld.clone().invert(), items = [];
        g.traverse((o) => { if (o.isMesh && !(spec.proxy && o.material === bMats.canvas)) items.push({ mesh: o, geo: spec.proxy ? boxGeo(o.geometry) : o.geometry, toShip: shipInv.clone().multiply(o.matrixWorld), toSpace: gInv.clone().multiply(o.matrixWorld), hit: gBox ? gBox.id : mBox }); });
        for (const m of mergeByMaterial(items, matOf)) gp.add(m);
        pivot.add(gp); gunGroups.push(gp);
      });
      level.add(pivot);
      mountsAll[i].trains.push(pivot); mountsAll[i].guns.push(gunGroups);
      pivot.userData.yaw0 = pivot.quaternion.clone();
    });
    // stats
    let tris = 0, calls = 0; const used = new Set();
    level.traverse((o) => { if (o.isMesh) { calls++; used.add(o.material); tris += o.geometry.attributes.position.count / 3; } });
    levels.push({ ...spec, group: level, triangles: Math.round(tris), drawCalls: calls, materials: used.size, ms: Math.round(performance.now() - t1) });
    lod.addLevel(level, spec.distance);
  }
  // the original lab build, merged the lab's way, for comparison
  const lab = SHIPS[id].build({ detail: 1 });
  let lt = 0, lc = 0; lab.group.traverse((o) => { if (o.isMesh) { lc++; lt += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });

  // hit test against the current pose: boxes live in ship space or in a gun's space (level 0 nodes stand for all)
  const ray = new THREE.Ray(), hitP = new THREE.Vector3(), inv = new THREE.Matrix4();
  function nodeOf(h) { if (h.node === 'ship') return lod; const [, i, j] = h.node.split(':').map(Number); return mountsAll[i].guns[0][j]; }
  function raycast(worldRay) {
    let best = null;
    lod.updateMatrixWorld(true);
    for (const h of boxes) {
      let node = nodeOf(h), box = h.box;
      if (h.kind === 'mount') node = lod;
      inv.copy(node.matrixWorld).invert(); ray.copy(worldRay).applyMatrix4(inv);
      if (ray.intersectBox(box, hitP)) {
        const p = hitP.clone().applyMatrix4(node.matrixWorld), d = p.distanceTo(worldRay.origin);
        if (!best || d < best.distance - 1e-4 || (Math.abs(d - best.distance) < 0.3 && h.volume < best.box.volume)) best = { box: h, point: p, distance: d };
      }
    }
    return best;
  }
  function aim(i, yaw, elev) {
    const m = mountsAll[i]; if (!m) return;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m.trains.forEach((p) => { p.quaternion.copy(p.userData.yaw0).multiply(q); });
    m.guns.forEach((list) => list.forEach((g) => { g.rotation.x = -elev; }));
  }
  return {
    lod, levels, hitboxes: boxes, damage, mounts: mountsAll, raycast, aim, info: base.info, lines: base.lines,
    original: { group: lab.group, triangles: Math.round(lt), drawCalls: lc },
    ms: Math.round(performance.now() - t0),
  };
}

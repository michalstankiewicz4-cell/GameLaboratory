// Low-poly ship models built from primitives: extruded hull with a pointed bow, deck, superstructure,
// funnels and rotating turrets. Local axes: +z = bow, +x = starboard, y = up (waterline at 0).
// Detail: railings, AA mounts, lifeboats, masts with radar, bridge windows, funnel caps; submarine casing details.
import * as THREE from '../../../../vendor/three/three.module.js';
import { mat, mergeBoxes } from '../../../render/sea/materials.js';

const COLORS = {
  player: { hull: 0x6c7884, deck: 0x8f7c5e, top: 0x7e8a96, turret: 0x77838f, stripe: 0x2a3a4a },
  enemy: { hull: 0x5c5458, deck: 0x6e5e4c, top: 0x6a6266, turret: 0x6a6266, stripe: 0x8a2a2a },
};
const DETAIL_DECK = { player: 0xc8b48c, enemy: 0xa89070 };
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);

// Half-width of the hull at local z (same taper as hullHit in ships.js).
function halfWidth(cls, z) {
  const hl = cls.L / 2, hw = cls.W / 2;
  const t = z > 0 ? Math.min(1, Math.max(0.12, (hl - z) / (hl * 0.6))) : Math.min(1, Math.max(0.55, (hl + z) / (hl * 0.25)));
  return hw * t;
}

function hullGeometry(L, W, H) {
  const hl = L / 2, hw = W / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw * 0.75, -hl);
  s.lineTo(hw * 0.75, -hl);
  s.quadraticCurveTo(hw, -hl * 0.85, hw, -hl * 0.5);
  s.lineTo(hw, hl * 0.35);
  s.quadraticCurveTo(hw * 0.9, hl * 0.8, 0, hl);
  s.quadraticCurveTo(-hw * 0.9, hl * 0.8, -hw, hl * 0.35);
  s.lineTo(-hw, -hl * 0.5);
  s.quadraticCurveTo(-hw, -hl * 0.85, -hw * 0.75, -hl);
  const depth = H + 0.5;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(Math.PI / 2);          // shape y (forward) -> +z, extrusion -> down
  g.translate(0, H, 0);            // deck at y = H, keel at -0.5
  // planks run along the ship: scale UVs to world units
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.25);
  return g;
}

function turret(spec, c) {
  const s = spec.size;
  const pivot = new THREE.Group();
  const tm = mat(c.turret, 'paint'), metal = mat(0x3a3e44, 'metal');
  const base = cyl(s * 0.55, s * 0.6, s * 0.25, tm, 16);
  base.position.y = s * 0.12;
  const house = box(s * 1.0, s * 0.42, s * 1.15, tm);
  house.position.set(0, s * 0.42, -s * 0.05);
  pivot.add(base, house);
  {
    const face = box(s * 0.9, s * 0.3, s * 0.08, tm); face.position.set(0, s * 0.48, s * 0.56); face.rotation.x = -0.35; pivot.add(face);
    const rf = box(s * 0.3, s * 0.12, s * 0.3, metal); rf.position.set(s * 0.25, s * 0.69, -s * 0.3); pivot.add(rf);   // rangefinder hood
  }
  const gap = s * 0.32;
  for (let i = 0; i < spec.barrels; i++) {
    const x = (i - (spec.barrels - 1) / 2) * gap;
    const b = cyl(s * 0.05, s * 0.07, s * 1.5, metal, 8); b.rotation.x = Math.PI / 2; b.position.set(x, s * 0.45, s * 1.1); pivot.add(b);
    const muz = cyl(s * 0.075, s * 0.075, s * 0.12, metal, 8); muz.rotation.x = Math.PI / 2; muz.position.set(x, s * 0.45, s * 1.83); pivot.add(muz);
  }
  return pivot;
}

// Extra detail (merged geometry per material).
function addDetail(body, cls, side, c) {
  const { L, W, H } = cls;
  const top = mat(c.top, 'paint'), metal = mat(0x40444a, 'metal'), dark = mat(0x22252a, 'dark'), white = mat(0xd8d6cc, 'paint');
  const rails = [], aa = [], boats = [], misc = [], glass = [];
  // railings: top rail + posts along both sides, following the hull taper
  const step = 0.45;
  for (let z = -L / 2 + 0.4; z < L / 2 - 0.6; z += step) {
    const z2 = Math.min(L / 2 - 0.6, z + step);
    for (const sx of [-1, 1]) {
      const x1 = sx * (halfWidth(cls, z) - 0.06), x2 = sx * (halfWidth(cls, z2) - 0.06);
      const len = Math.hypot(x2 - x1, z2 - z), ang = Math.atan2(x2 - x1, z2 - z);
      rails.push([0.025, 0.025, len, (x1 + x2) / 2, H + 0.26, (z + z2) / 2, 0, ang, 0]);
      rails.push([0.02, 0.02, len, (x1 + x2) / 2, H + 0.14, (z + z2) / 2, 0, ang, 0]);
      rails.push([0.025, 0.26, 0.025, x1, H + 0.13, z]);
    }
  }
  // lifeboats on both sides near the funnels (cruiser and battleship), small boats on the destroyer
  const taken = [];                    // space already used: { x0, x1, y0, y1, z0, z1, roof } (starboard side, x ≥ 0)
  body.updateMatrixWorld(true);
  for (const o of body.children) {
    if (!o.isMesh || o.userData.hull) continue;
    const b = new THREE.Box3().setFromObject(o);
    taken.push({ x0: Math.max(0, -b.max.x, b.min.x), x1: Math.max(b.max.x, -b.min.x), y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z, roof: o.geometry.type === 'BoxGeometry' });
  }
  for (const t of cls.turrets) taken.push({ x0: 0, x1: t.size * 0.7, y0: 0, y1: H + t.y + t.size * 0.9, z0: t.z - t.size * 0.7, z1: t.z + t.size * 2.0 });
  const nb = cls.key === 'dd' ? 1 : 2;
  for (let i = 0; i < nb; i++) {
    const z = -0.6 - i * 1.0, x = halfWidth(cls, z) - 0.3;
    for (const sx of [-1, 1]) {
      boats.push([0.32, 0.16, 0.9, sx * x, H + 0.45, z], [0.22, 0.08, 0.7, sx * x, H + 0.56, z]);
      misc.push([0.03, 0.4, 0.03, sx * (x + 0.12), H + 0.3, z + 0.35], [0.03, 0.4, 0.03, sx * (x + 0.12), H + 0.3, z - 0.35]);
    }
    taken.push({ x0: x - 0.2, x1: x + 0.2, y0: H, y1: H + 0.7, z0: z - 0.5, z1: z + 0.5 });
  }
  // AA mounts along the sides, wherever the whole mount (base, shield, barrels) clears everything already on deck
  const nAA = cls.key === 'dd' ? 1 : cls.key === 'ca' ? 3 : 5;
  // a mount (base, shield, raised barrels) at (x, y, z) must not overlap anything; on a deck or on a deckhouse roof
  const fits = (x, y, z) => taken.every((t) => x + 0.2 <= t.x0 || x - 0.2 >= t.x1 || z + 0.62 <= t.z0 || z - 0.22 >= t.z1 || y + 0.55 <= t.y0 || y >= t.y1 - 0.001);
  const spots = [];
  const tryAt = (x, y, z) => { if (x > 0.3 && fits(x, y, z) && spots.every((q) => Math.hypot(q.z - z, q.y - y) > 0.95)) { spots.push({ x, y, z }); return true; } return false; };
  for (let z = -L * 0.3; z <= L * 0.22 && spots.length < nAA; z += 0.1) tryAt(halfWidth(cls, z) - 0.24, H, z);
  for (const t of taken.filter((q) => q.roof && q.y1 < H + 1.6 && q.y1 > H + 0.3 && q.x1 > 0.5 && q.z1 - q.z0 > 0.9)) {      // on deckhouse roofs
    for (let z = t.z0 + 0.22; z + 0.62 <= t.z1 && spots.length < nAA; z += 0.1) if (tryAt(t.x1 - 0.21, t.y1, z)) break;
  }
  for (const { x: ax, y, z } of spots) for (const sx of [-1, 1]) {
    const x = sx * ax;
    aa.push([0.36, 0.14, 0.36, x, y + 0.07, z]);
    aa.push([0.26, 0.2, 0.06, x, y + 0.2, z + 0.21]);
    for (const bx of [-0.06, 0.06]) aa.push([0.035, 0.035, 0.5, x + bx, y + 0.3, z + 0.3, -0.5, 0, 0]);
  }
  // mast with yard, radar and aerial lines; bridge windows; funnel caps
  const mastZ = cls.key === 'dd' ? 1.3 : cls.key === 'ca' ? 1.0 : 1.2;
  const mastH = cls.key === 'dd' ? 2.6 : cls.key === 'ca' ? 3.6 : 5.0;
  misc.push([0.08, mastH, 0.08, 0, H + mastH / 2 + 0.6, mastZ]);
  misc.push([W * 0.5, 0.05, 0.05, 0, H + mastH * 0.8 + 0.6, mastZ]);
  misc.push([0.5, 0.18, 0.08, 0, H + mastH + 0.6, mastZ]);
  misc.push([0.02, 0.02, L * 0.42, 0, H + mastH * 0.55 + 0.6, mastZ - L * 0.21, 0.18, 0, 0]);
  const bridge = { dd: [W * 0.7, 0.9, 1.8, 1.3], ca: [W * 0.7, 1.1, 2.5, 0.3], bb: [W * 0.6, 1.2, 3.2, -0.2] }[cls.key];
  glass.push([bridge[0] * 1.02, 0.12, 0.05, 0, H + bridge[1] * 0.8, bridge[3] + bridge[2] / 2 + 0.02]);
  glass.push([bridge[0] * 1.02, 0.1, bridge[2] * 0.7, 0, H + bridge[1] * 0.8, bridge[3]]);
  const capY = H + (cls.key === 'bb' ? 2.4 : cls.key === 'ca' ? 1.6 : 1.3) - 0.08;     // funnel tops
  const funnels = cls.key === 'dd' ? [[0.27, 0.4], [0.27, -0.9]] : cls.key === 'ca' ? [[0.35, 0.1], [0.35, -1.4]] : [[0.56, -0.4]];
  for (const [r, z] of funnels) glass.push([r * 1.75, 0.18, r * 1.75, 0, capY, z]);
  // bollards and anchor windlass at the bow
  for (const sx of [-1, 1]) misc.push([0.12, 0.14, 0.12, sx * 0.25, H + 0.07, L / 2 - 1.4], [0.12, 0.14, 0.12, sx * 0.45, H + 0.07, -L / 2 + 0.6]);
  const t0 = cls.turrets[0];
  if (L / 2 - 2.0 - 0.15 > t0.z + t0.size * 0.66) misc.push([0.5, 0.18, 0.3, 0, H + 0.09, L / 2 - 2.0]);

  const add = (list, m) => { if (list.length) { const g = new THREE.Mesh(mergeBoxes(list), m); g.castShadow = true; body.add(g); } };
  add(rails, metal); add(aa, top); add(boats, white); add(misc, metal); add(glass, dark);
  // flag at the stern
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), mat(side === 'player' ? 0x2c4a7a : 0x9a2a22, 'fx', { side: THREE.DoubleSide }));
  flag.position.set(0, H + 0.82, -L / 2 - 0.05); flag.rotation.y = Math.PI / 2;
  const pole = box(0.03, 1.0, 0.03, metal); pole.position.set(0, H + 0.5, -L / 2 + 0.2);
  body.add(pole, flag);
}

// Returns { group, body (rolls/pitches), turrets: [pivot] }
export function buildShip(cls, side) {
  const c = COLORS[side];
  const { L, W, H } = cls;
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.order = 'YXZ';
  group.add(body);

  const deckM = cls.key === 'ss' ? mat(0x2e343a, 'paint') : mat(DETAIL_DECK[side], 'deck');
  const hull = new THREE.Mesh(hullGeometry(L, W, H), [deckM, mat(cls.key === 'ss' ? (side === 'player' ? 0x434d57 : 0x4e4649) : c.hull, 'hull')]);
  hull.userData.hull = true; body.add(hull);
  // waterline stripe (boot topping)
  const stripe = box(W * 1.01, 0.18, L * 0.62, mat(0x5a2420, 'paint'));
  stripe.position.set(0, 0.1, -L * 0.05); stripe.userData.hull = true;
  body.add(stripe);

  const top = mat(c.top, 'paint'), fun = mat(0x4a4e54, 'dark'), tor = mat(0x50565c, 'metal'), dm = mat(c.turret, 'paint');
  if (cls.key === 'dd') {
    const br = box(W * 0.7, 0.9, 1.3, top); br.position.set(0, H + 0.45, 1.8); body.add(br);
    const br2 = box(W * 0.5, 0.45, 0.7, top); br2.position.set(0, H + 1.1, 1.9); body.add(br2);
    for (const z of [0.4, -0.9]) { const f = cyl(0.26, 0.3, 1.3, fun, 14); f.position.set(0, H + 0.65, z); body.add(f); }
    for (const z of [-0.2, -2.2]) { const tl = box(0.55, 0.3, 1.0, tor); tl.position.set(0, H + 0.15, z); body.add(tl); }
  } else if (cls.key === 'ca') {
    const br = box(W * 0.7, 1.1, 2.2, top); br.position.set(0, H + 0.55, 1.4); body.add(br);
    const tw = box(W * 0.45, 1.0, 0.9, top); tw.position.set(0, H + 1.6, 1.6); body.add(tw);
    for (const z of [0.1, -1.4]) { const f = cyl(0.34, 0.4, 1.6, fun, 14); f.position.set(0, H + 0.8, z); body.add(f); }
    const aft = box(W * 0.6, 0.7, 1.4, top); aft.position.set(0, H + 0.35, -2.8); body.add(aft);
  } else if (cls.key === 'ss') {
    // conning tower (sail) with a rounded front, periscopes and snorkel, dive planes, stern fin
    const sailM = mat(side === 'player' ? 0x3e4852 : 0x4a4448, 'paint');
    const sail = box(W * 0.5, 0.95, 1.5, sailM); sail.position.set(0, H + 0.47, 0.5); body.add(sail);
    const nose = cyl(W * 0.25, W * 0.25, 0.93, sailM, 12); nose.position.set(0, H + 0.47, 1.25); body.add(nose);
    const bridge = box(W * 0.42, 0.12, 1.1, mat(0x22252a, 'dark')); bridge.position.set(0, H + 0.98, 0.55); body.add(bridge);
    for (const [x, z, h] of [[0.08, 0.75, 1.25], [-0.08, 0.45, 1.0], [0, 0.15, 0.8]]) {
      const sc = cyl(0.035, 0.045, h, mat(0x30343a, 'metal'), 6); sc.position.set(x, H + 0.95 + h / 2, z); sc.name = 'scope'; body.add(sc);
    }
    for (const sx of [-1, 1]) {
      const pl = box(0.9, 0.05, 0.35, sailM); pl.position.set(sx * (W * 0.5 + 0.35), H - 0.25, L * 0.32); body.add(pl);
      const sp = box(0.8, 0.05, 0.3, sailM); sp.position.set(sx * (W * 0.5 + 0.25), 0.0, -L * 0.42); body.add(sp);
    }
    const fin = box(0.06, 0.8, 0.7, sailM); fin.position.set(0, H - 0.1, -L * 0.47); body.add(fin);
  } else {
    const br = box(W * 0.6, 1.2, 3.6, top); br.position.set(0, H + 0.6, 1.4); body.add(br);
    const tw = box(W * 0.42, 2.4, 1.4, top); tw.position.set(0, H + 2.0, 2.2); body.add(tw);
    const tw2 = box(W * 0.3, 0.6, 0.9, top); tw2.position.set(0, H + 3.4, 2.2); body.add(tw2);
    const f = cyl(0.55, 0.65, 2.0, fun, 16); f.position.set(0, H + 1.4, -0.4); body.add(f);
    const aft = box(W * 0.5, 0.9, 1.6, top); aft.position.set(0, H + 0.45, -2.9); body.add(aft);
    for (const sx of [-1, 1]) for (const z of [-1.6, 0, 1.6]) {
      const sec = box(0.4, 0.3, 0.45, dm); sec.position.set(sx * W * 0.38, H + 0.15, z); body.add(sec);
    }
  }
  let k = 0;
  for (const o of body.children) {
    if (!o.isMesh || o.userData.hull) continue;
    const sink = 0.1 + 0.02 * (k++ % 6);          // different depths, so two sunk bottoms never share a plane either
    const g = o.geometry; g.computeBoundingBox();
    const bottom = o.position.y + g.boundingBox.min.y, top = g.boundingBox.max.y, hgt = g.boundingBox.max.y - g.boundingBox.min.y;
    if (Math.abs(bottom - H) < 0.012 && hgt > 0) { g.translate(0, -top, 0); g.scale(1, (hgt + sink) / hgt, 1); g.translate(0, top, 0); g.computeBoundingBox(); }
  }
  if (cls.key === 'ss') addSubDetail(body, cls); else addDetail(body, cls, side, c);

  const turrets = cls.turrets.map((spec) => {
    const p = turret(spec, c);
    p.position.set(0, H + spec.y, spec.z);
    if (spec.y > 0) { const ped = cyl(spec.size * 0.6, spec.size * 0.65, spec.y, top, 12); ped.position.set(0, H + spec.y / 2, spec.z); body.add(ped); }
    if (spec.arc.c !== 0) p.rotation.y = Math.PI;
    body.add(p);
    return p;
  });
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, body, turrets };
}

// Submarine detail: deck rail along the casing, limber holes strip, hatches, bow tube doors.
function addSubDetail(body, cls) {
  const { L, W, H } = cls;
  const list = [], dark = [];
  for (const sx of [-1, 1]) {
    list.push([0.02, 0.02, L * 0.5, sx * W * 0.32, H + 0.2, -L * 0.05]);
    for (let z = -L * 0.3; z <= L * 0.2; z += 0.45) list.push([0.02, 0.2, 0.02, sx * W * 0.32, H + 0.1, z]);
    dark.push([0.02, 0.08, L * 0.6, sx * (W * 0.5 + 0.005), H - 0.12, -L * 0.04]);
    for (let i = 0; i < 2; i++) dark.push([0.02, 0.14, 0.18, sx * (W * 0.33), 0.05, L * 0.4 - i * 0.25]);
  }
  for (const z of [L * 0.3, -L * 0.25]) dark.push([0.3, 0.03, 0.3, 0, H + 0.015, z]);
  body.add(new THREE.Mesh(mergeBoxes(list), mat(0x40444a, 'metal')), new THREE.Mesh(mergeBoxes(dark), mat(0x1e2126, 'dark')));
}

// Underwater "ghost": while a submarine is below the surface its hull is drawn as a dark translucent silhouette
// over the water (periscopes stay solid). Materials are swapped per mesh and restored when it surfaces.
const GHOST = new THREE.MeshBasicMaterial({ color: 0x0a2638, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false });
export function setGhost(model, on, opacity = 0.5) {
  GHOST.opacity = opacity;
  model.group.traverse((o) => {
    if (!o.isMesh || o.name === 'scope') return;
    if (on) { if (!o.userData.mat0) { o.userData.mat0 = o.material; o.material = GHOST; o.renderOrder = 5; o.castShadow = false; } }
    else if (o.userData.mat0) { o.material = o.userData.mat0; o.userData.mat0 = null; o.renderOrder = 0; o.castShadow = true; }
  });
}

export const torpGeo = () => new THREE.BoxGeometry(0.22, 0.18, 1.1);

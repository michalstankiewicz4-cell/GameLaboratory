// Low-poly ship models built from primitives: extruded hull with a pointed bow, deck, superstructure,
// funnels and rotating turrets. Local axes: +z = bow, +x = starboard, y = up (waterline at 0).
import * as THREE from '../../vendor/three.module.js';

const LOOK = {
  player: { hull: 0x6c7884, deck: 0x8f7c5e, top: 0x7e8a96, turret: 0x77838f, stripe: 0x2a3a4a },
  enemy: { hull: 0x5c5458, deck: 0x6e5e4c, top: 0x6a6266, turret: 0x6a6266, stripe: 0x8a2a2a },
};
const mats = new Map();
const lam = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return mats.get(c); };
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
const cyl = (rt, rb, h, c, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), lam(c));

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
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(Math.PI / 2);          // shape y (forward) -> +z, extrusion -> down
  g.translate(0, H, 0);            // deck at y = H, keel at -0.5
  return g;
}

function turret(spec, look) {
  const s = spec.size;
  const pivot = new THREE.Group();
  const base = cyl(s * 0.55, s * 0.6, s * 0.25, look.turret, 10);
  base.position.y = s * 0.12;
  const house = box(s * 1.0, s * 0.42, s * 1.15, look.turret);
  house.position.set(0, s * 0.42, -s * 0.05);
  pivot.add(base, house);
  const gap = s * 0.32;
  for (let i = 0; i < spec.barrels; i++) {
    const b = box(s * 0.12, s * 0.12, s * 1.5, 0x3a3e44);
    b.position.set((i - (spec.barrels - 1) / 2) * gap, s * 0.45, s * 1.1);
    pivot.add(b);
  }
  return pivot;
}

// Returns { group, body (rolls/pitches), turrets: [pivot], muzzleZ: [local barrel length per turret] }
export function buildShip(cls, side) {
  const look = LOOK[side];
  const { L, W, H } = cls;
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.rotation.order = 'YXZ';
  group.add(body);

  const hull = new THREE.Mesh(hullGeometry(L, W, H), [lam(look.deck), lam(look.hull)]);
  body.add(hull);
  // waterline stripe
  const stripe = box(W * 1.01, 0.12, L * 0.62, look.stripe);
  stripe.position.set(0, 0.1, -L * 0.05);
  body.add(stripe);

  // superstructure by class
  const top = look.top;
  if (cls.key === 'dd') {
    const br = box(W * 0.7, 0.9, 1.3, top); br.position.set(0, H + 0.45, 1.8); body.add(br);
    const br2 = box(W * 0.5, 0.45, 0.7, top); br2.position.set(0, H + 1.1, 1.9); body.add(br2);
    for (const z of [0.4, -0.9]) { const f = cyl(0.26, 0.3, 1.3, 0x4a4e54); f.position.set(0, H + 0.65, z); body.add(f); }
    for (const z of [-0.2, -2.2]) { const tl = box(0.55, 0.3, 1.0, 0x50565c); tl.position.set(0, H + 0.15, z); body.add(tl); }
  } else if (cls.key === 'ca') {
    const br = box(W * 0.7, 1.1, 2.2, top); br.position.set(0, H + 0.55, 1.4); body.add(br);
    const tw = box(W * 0.45, 1.0, 0.9, top); tw.position.set(0, H + 1.6, 1.6); body.add(tw);
    const mast = box(0.1, 1.6, 0.1, 0x3a3e44); mast.position.set(0, H + 2.7, 1.5); body.add(mast);
    for (const z of [0.1, -1.4]) { const f = cyl(0.34, 0.4, 1.6, 0x4a4e54); f.position.set(0, H + 0.8, z); body.add(f); }
    const aft = box(W * 0.6, 0.7, 1.4, top); aft.position.set(0, H + 0.35, -2.8); body.add(aft);
  } else {
    const br = box(W * 0.6, 1.2, 3.6, top); br.position.set(0, H + 0.6, 1.4); body.add(br);
    const tw = box(W * 0.42, 2.4, 1.4, top); tw.position.set(0, H + 2.0, 2.2); body.add(tw);
    const tw2 = box(W * 0.3, 0.6, 0.9, top); tw2.position.set(0, H + 3.4, 2.2); body.add(tw2);
    const f = cyl(0.55, 0.65, 2.0, 0x4a4e54); f.position.set(0, H + 1.4, -0.4); body.add(f);
    const aft = box(W * 0.5, 0.9, 1.6, top); aft.position.set(0, H + 0.45, -2.9); body.add(aft);
    for (const sx of [-1, 1]) for (const z of [-1.6, 0, 1.6]) {
      const sec = box(0.4, 0.3, 0.45, look.turret); sec.position.set(sx * W * 0.38, H + 0.15, z); body.add(sec);
    }
  }

  const turrets = cls.turrets.map((spec) => {
    const p = turret(spec, look);
    p.position.set(0, H + spec.y, spec.z);
    if (spec.y > 0) { const ped = cyl(spec.size * 0.6, spec.size * 0.65, spec.y, top, 10); ped.position.set(0, H + spec.y / 2, spec.z); body.add(ped); }
    if (spec.arc.c !== 0) p.rotation.y = Math.PI;
    body.add(p);
    return p;
  });
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, body, turrets };
}

// Instanced torpedo/shell geometry helpers.
export const torpGeo = () => new THREE.BoxGeometry(0.22, 0.18, 1.1);
export const shellGeo = () => new THREE.BoxGeometry(0.25, 0.25, 0.9);

// City Lab — destruction: things to throw at a building (from Tornado.io): junk from JunkKit (js/models/junkyard/items/
// — the items lab: cans, tyres, drums, newspapers, boxes, a pot) and stones from RockKit, at real size and mass.
// Each model is built once per kind and variant (the far model, LOD 1), then cloned (shared geometry and materials).
//   MISSILES                           { id: { name, mass, variants } }
//   loadMissiles() → Promise           builds the models (JunkKit needs MatKit's textures)
//   makeMissile(id, { variant }) → { obj, m, pts, r, A, size, half, name }   for world.addObject (DestructKit)
import * as THREE from '../../../../vendor/three/three.module.js';
import * as can from '../../../models/junkyard/items/can.js';
import * as canCrushed from '../../../models/junkyard/items/can-crushed.js';
import * as pot from '../../../models/junkyard/items/pot.js';
import * as newspapers from '../../../models/junkyard/items/newspapers.js';
import * as box from '../../../models/junkyard/items/box.js';
import * as barrel from '../../../models/junkyard/items/barrel.js';
import * as tireCar from '../../../models/junkyard/items/tire-car.js';
import * as tireBike from '../../../models/junkyard/items/tire-bike.js';
import * as tireTractor from '../../../models/junkyard/items/tire-tractor.js';
import { applyTextures } from '../../../models/junkyard/textures.js';
import { rockGeometry, rockMaterial, rockInfo } from '../../../models/rocks/rockkit.js';

const JUNK = { can, 'can-crushed': canCrushed, pot, newspapers, box, barrel, 'tire-car': tireCar, 'tire-bike': tireBike, 'tire-tractor': tireTractor };
export const MISSILES = {
  can: { name: 'Can' }, 'can-crushed': { name: 'Crushed can' }, pot: { name: 'Pot' }, newspapers: { name: 'Newspapers' },
  box: { name: 'Box' }, barrel: { name: 'Steel drum' }, 'tire-car': { name: 'Car tyre' }, 'tire-bike': { name: 'Bike tyre' },
  'tire-tractor': { name: 'Tractor tyre' }, pebble: { name: 'Stone' }, rock: { name: 'Boulder' }, boulder: { name: 'Big boulder' },
};
for (const [id, m] of Object.entries(JUNK)) { MISSILES[id].mass = m.info.mass; MISSILES[id].variants = m.info.variants || 1; }
const ROCKS = { pebble: { size: 0.28, shape: 'pebble' }, rock: { size: 0.7, shape: 'boulder' }, boulder: { size: 1.4, shape: 'boulder' } };
const ROCK_KINDS = ['granite', 'limestone', 'sandstone', 'basalt'];

const proto = new Map();   // id:variant → { obj, m, pts, r, A, size, half }
let ready = null;
export function loadMissiles() {
  if (ready) return ready;
  ready = (async () => {
    for (const [id, mod] of Object.entries(JUNK)) {
      for (let v = 0; v < (mod.info.variants || 1); v++) {
        const g = mod.build(1, v); g.name = id;
        proto.set(id + ':' + v, measure(g, mod.info.mass));
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    applyTextures();
    for (const [id, R] of Object.entries(ROCKS)) for (let v = 0; v < 4; v++) {
      const kind = ROCK_KINDS[v], geo = rockGeometry({ kind, shape: R.shape, size: R.size, seed: 11 + v * 7, detail: 0.75, moss: 0.25, lichen: 0.3 });
      const mesh = new THREE.Mesh(geo, rockMaterial(kind)), g = new THREE.Group(); g.add(mesh);
      // the stone lies buried in the ground: the middle of its box at the object's middle
      geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3()); mesh.position.sub(c);
      proto.set(id + ':' + v, measure(g, rockInfo({ kind, shape: R.shape, size: R.size }, geo).mass));
    }
  })();
  return ready;
}
function measure(g, mass) {
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const bb = new THREE.Box3().setFromObject(g), s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((ch) => ch.position.sub(c));   // the box's middle at the object's middle (it turns about it)
  const pts = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(x * s.x / 2, y * s.y / 2, z * s.z / 2);
  return { obj: g, m: mass, pts: new Float32Array(pts), r: s.length() / 2, A: Math.max(s.x * s.y, s.y * s.z, s.x * s.z), size: Math.max(s.x, s.y, s.z), half: s.clone().multiplyScalar(0.5) };
}
export function makeMissile(id, { variant = 0 } = {}) {
  const n = MISSILES[id] ? (MISSILES[id].variants || 4) : 1, P = proto.get(id + ':' + (variant % n)) || proto.get(id + ':0');
  if (!P) throw new Error('no item ' + id);
  const obj = P.obj.clone(); obj.name = id;
  return { obj, m: P.m, pts: P.pts, r: P.r, A: P.A, size: P.size, half: P.half, name: MISSILES[id].name };
}

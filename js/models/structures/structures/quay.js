// Quay wall (nabrzeże): a berth for ships along a straight quay, in three classic constructions —
//  gravity: precast concrete blocks stacked on a rubble bed (the interwar Baltic ports built many like this),
//  sheetpile: an anchored steel sheet-pile wall (U-profile piles) with a concrete capping beam,
//  piled: an open piled deck (relieving platform) on steel tubular piles over a rock revetment.
// Common furniture: capping beam with a yellow safety kerb, tee-head bollards, cylindrical rubber fenders on chains,
// recessed ladders, crane rails, lighting masts, paved apron. Metres; the quay face is the plane x = 0, water on +x,
// land on −x, the quay runs along z. Sources and assumptions: docs/structures/coastal.md.
import * as THREE from '../../../../vendor/three/three.module.js';
import { Part } from '../../ships-sea/geom.js';
import { structMaterials } from '../materials.js';
import * as C from '../coastal.js';

export const info = {
  id: 'quay',
  name: 'Quay wall (berth)',
  year: 'typical construction',
  type: 'Quay: gravity block wall, steel sheet-pile wall or open piled deck',
  builder: 'Parametric: built from typical port-engineering dimensions (see docs/structures/coastal.md)',
  note: 'A typical quay, not a particular one: the construction types, the furniture and their spacing follow common port practice; sizes are parameters. Assumptions and sources: docs/structures/coastal.md.',
  specs: [
    ['Cope level', '+2.6 m above mean sea level (default)'],
    ['Berth depth', 'the lab\'s water depth (default 11 m)'],
    ['Bollards', 'tee-head, every 15 m, 0.9 m from the edge'],
    ['Fenders', 'cylindrical rubber, Ø 1.4 / 0.8 m × 2.2 m, every 15 m'],
    ['Ladders', 'recessed, every 30 m'],
    ['Crane rails', 'gauge 10.5 m, the seaward rail 2.5 m from the edge'],
    ['Gravity wall', 'precast blocks 4 × 2 m in courses on a 2 m rubble bed'],
    ['Sheet piles', 'U-profile, 0.6 m wide, 0.42 m deep corrugation'],
    ['Piled deck', '24 m wide deck on Ø 1.0 m steel tubes, 6 m × 6 m grid, rock slope 1:1.5 below'],
  ],
  sources: [
    ['Delft University: fender systems on quay walls (cylindrical fender sizes, Ø 1400/800 mm × 2200 mm)', 'https://repository.tudelft.nl/file/File_e58dee98-a90b-400b-b26c-d329bf7909ec'],
    ['Wikipedia: Wharf (quay, berth, construction)', 'https://en.wikipedia.org/wiki/Wharf'],
    ['Wikipedia: Sheet pile', 'https://en.wikipedia.org/wiki/Sheet_pile'],
  ],
};

export const PARAMS = [
  { key: 'kind', label: 'Construction', options: [['gravity', 'Gravity block wall'], ['sheetpile', 'Steel sheet-pile wall'], ['piled', 'Open piled deck']], def: 'gravity' },
  { key: 'length', label: 'Quay length', min: 60, max: 600, step: 10, def: 240, fmt: (v) => v + ' m' },
  { key: 'cope', label: 'Cope level', min: 1.2, max: 4.5, step: 0.1, def: 2.6, fmt: (v) => '+' + v.toFixed(1) + ' m' },
];

export function build({ detail = 1, depth = 11, kind = 'gravity', length = 240, cope = 2.6 } = {}) {
  const mats = structMaterials();
  const root = new THREE.Group(); root.name = 'quay';
  const parts = {}, put = (name, part) => { parts[name] = part.finish(); root.add(parts[name]); };
  const L = length, z0 = -L / 2, z1 = L / 2, bed = -depth;
  const apron = 70;                                               // paved land behind the quay

  /* ---------------- the wall ---------------- */
  const wall = new Part('quay wall', mats);
  const capH = 2.2, capW = 3.2;                                   // capping beam / superstructure
  let deckW = 0;
  if (kind === 'gravity') {
    const courses = Math.ceil((cope - capH - bed + 2) / 2);
    for (let c = 0; c < courses; c++) {
      const y = bed - 2 + c * 2 + 1, w = 9 - c * 0.5, off = (c % 2) * 2;      // stepped courses, narrowing upward
      for (let z = z0 - off; z < z1; z += 4) {
        const za = Math.max(z, z0), zb = Math.min(z + 4, z1); if (zb - za < 0.5) continue;
        wall.box('concrete', w, 1.96, zb - za - 0.06, [-w / 2 - 0.02 * c, y, (za + zb) / 2]);
      }
    }
    wall.box('core', 16, 2, L + 4, [-5, bed - 1, 0]);             // rubble bed
  } else if (kind === 'sheetpile') {
    // U-profile sheet piles: a corrugated wall in plan, extruded from below the bed to the capping beam
    const pts = [], pw = 0.6, dd = 0.42;
    for (let z = z0; z <= z1 + 1e-6; z += pw * 2) pts.push([0, z], [-dd, z + pw * 0.25], [-dd, z + pw * 0.75], [0, z + pw], [0, z + pw * 1.25], [-dd * 0.02, z + pw * 2]);
    const shape = new THREE.Shape(); shape.moveTo(pts[0][0], pts[0][1]);
    for (const [x, z] of pts.slice(1)) shape.lineTo(x, z);
    for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(pts[i][0] - 0.02, pts[i][1]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: cope - capH + 0.3 - (bed - 4), bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, cope - capH + 0.3, 0);
    wall.add('steelPile', g);
    wall.box('core', 30, 4, L, [-15, bed - 2, 0]);               // fill behind the wall, seen from below
  } else {
    deckW = 24;
    const piles = new Part('piles', mats);
    for (let z = z0 + 3; z < z1; z += 6) for (let k = 0; k < 4; k++) {
      const x = -2 - k * (deckW - 4) / 3, ground = Math.min(cope - 1.3, bed + (-x) / 1.5);   // the revetment under the deck
      const top = cope - 1.2, bottom = ground - 3;                                           // piles driven 3 m into it (visible part)
      piles.cyl('steelPile', 0.5, 0.5, top - bottom, 10, [x, (top + bottom) / 2, z]);
    }
    put('piles', piles);
    wall.box('concrete', deckW, 1.2, L, [-deckW / 2, cope - 0.6, 0]);               // deck slab
    for (let z = z0 + 3; z < z1; z += 6) wall.box('concrete', deckW, 0.9, 1.4, [-deckW / 2, cope - 1.6, z]);   // cross beams
    // rock revetment from the seabed up under the deck to the land
    const rev = C.layUnits((u, v) => ({ p: new THREE.Vector3(-v * 0.832, bed + v * 0.555, z0 + u), n: new THREE.Vector3(0.555, 0.832, 0) }), L, Math.min((cope - bed) / 0.555, 40), 1.4, { layers: 2, seed: 11, tilt: 1.2 });
    const rocks = [0, 1, 2].map((k) => C.instanced(C.rockGeometry(1.4, 21 + k), mats.rock, rev.filter((_, i) => i % 3 === k), 'revetment rock'));
    const rg = new THREE.Group(); rg.name = 'revetment'; rocks.forEach((m) => rg.add(m)); root.add(rg); parts.revetment = rg;
    wall.add('core', C.sweepZ([[0, bed], [-(cope - bed) * 1.5, cope - 1.3], [-(cope - bed) * 1.5 - 20, cope - 1.3], [-(cope - bed) * 1.5 - 20, bed - 2], [0, bed - 2]], z0, z1));
  }
  // capping beam (or the piled deck's edge beam) with the yellow safety kerb
  if (kind !== 'piled') wall.box('concrete', capW, capH, L, [-capW / 2, cope - capH / 2, 0]);
  wall.box('kerb', 0.3, 0.2, L, [-0.2, cope + 0.1, 0]);
  for (let z = z0 + 2; z < z1; z += 4) wall.box('dark', 0.32, 0.21, 0.5, [-0.2, cope + 0.1, z]);   // black kerb stripes
  put('quay wall', wall);

  /* ---------------- land, rails, furniture ---------------- */
  const land = new Part('apron', mats);
  const back = kind === 'piled' ? deckW : capW;
  land.box('paving', apron, 0.3, L, [-back - apron / 2, cope - 0.15, 0]);
  land.box('core', apron, cope - bed + 2, L, [-back - apron / 2 - (kind === 'piled' ? 0 : 0), (cope - 0.3 + bed - 2) / 2, 0]);
  if (kind !== 'piled') land.box('paving', capW, 0.05, L, [-capW / 2, cope + 0.01, 0]);
  for (const x of [-2.5, -13]) for (const s of [-0.38, 0.38]) land.box('metal', 0.14, 0.18, L, [x + s, cope + 0.06, 0]);   // crane rails
  put('apron', land);

  const furn = new Part('furniture', mats);
  const bollards = [];
  for (let z = z0 + 7.5; z < z1; z += 15) { C.bollard(furn, -0.9, cope, z); bollards.push([-0.9, cope + 0.9, z]); }
  for (let z = z0 + 15; z < z1 - 1; z += 15) C.cylinderFender(furn, 0, cope - 1.6, z);
  for (let z = z0 + 22.5; z < z1; z += 30) C.quayLadder(furn, 0, -0.8, cope, z);
  for (let z = z0 + 25; z < z1; z += 50) C.lightMast(furn, -26, cope, z);
  put('bollards, fenders, ladders', furn);

  // height of the quay (for the sea's shallows and surf): land at the cope level behind the face, the berth in front
  const heightAt = (x, z) => (Math.abs(z) > L / 2 + 2 || x < -back - apron ? -depth : x < 0 ? cope : -depth);
  return { group: root, parts, info, materials: mats, heightAt, anchors: { face: 0, cope, bollards, length: L }, bounds: { x0: -back - apron, x1: 30, z0, z1 } };
}

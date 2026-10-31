// Model doctor — models from the sea (Battle): the Ship Lab's ships (ShipKit, unmerged, 1:1), the game's class
// models (merged box lists split into single boxes, a line of fire per barrel) and the transformer's levels of detail.
import * as THREE from '../../../vendor/three/three.module.js';
import { explodeBoxes } from '../modeldoctor.js';
import { countDraw } from './common.js';
import { KIT } from '../../../js/models/ships-sea/geom.js';
import { SHIPS } from '../../../js/models/ships-sea/index.js';
import { transformShip } from '../../../js/models/ships-sea/transform.js';
import { sideAt } from '../../../js/models/ships-sea/hull.js';
import { buildShip as buildGameShip } from '../../../js/models/ships-sea/world/models.js';
import { CLASSES } from '../../../js/models/ships-sea/world/constants.js';

const GAME_NAMES = { dd: 'Destroyer', ca: 'Cruiser', bb: 'Battleship', ss: 'Submarine' };
// per-level budgets the transformer aims at (LOD0 is only drawn close up)
const LOD_BUDGET = [{ triangles: 40000, drawCalls: 70 }, { triangles: 15000, drawCalls: 35 }, { triangles: 3000, drawCalls: 10 }];
const transformed = {};

// a lab ship, unmerged; the game's budget is set on the page (sliders)
function labShip(ship) {
  const S = SHIPS[ship];
  const merged = S.build({ detail: 1 });
  const measured = countDraw(merged.group);
  KIT.unmerged = true;
  let b; try { b = S.build({ detail: 1 }); } finally { KIT.unmerged = false; }
  const underwater = (name) => name.startsWith('hull');
  return {
    root: b.group, measured, gameBudget: true,
    opts: {
      mounts: b.mounts, waterline: true, planeEps: 0.02, below: underwater, outboard: underwater,
      hullSide: (z, y) => (z > S.lines.zStern && z < S.lines.zBow + 3 ? sideAt(S.lines, z, y) : -1), deck: (z) => S.lines.deck(z),
    },
  };
}

// a transformer level (merged): geometry checks only (arcs, slivers and the like were checked on the unmerged pieces);
// a coarser see-through grid, since every ray now tests whole merged meshes
function lodLevel(ship, level) {
  const T = transformed[ship] || (transformed[ship] = transformShip(ship));
  const lv = T.levels[level], root = new THREE.Group(); root.name = lv.name;
  lv.group.visible = true; root.add(lv.group);                       // out of the THREE.LOD, which hides the other levels
  const mounts = T.mounts.map((mt) => {
    const train = mt.trains[level]; if (!train || !mt.arc) return null;
    return { name: mt.name, group: train, train, guns: mt.guns[level] || [], arc: mt.arc, base: train.rotation.y, aa: mt.aa };
  }).filter((x) => x && x.guns.length);
  return { root, measured: { triangles: lv.triangles, drawCalls: lv.drawCalls, materials: lv.materials }, opts: {
    checks: ['nan', 'inverted', 'facing', 'seethrough', 'zfight', 'floating', 'hidden', 'speck', 'budget'], seeGrid: 40,
    mounts, planeEps: 0.02, budget: { ...LOD_BUDGET[level], measured: { triangles: lv.triangles, drawCalls: lv.drawCalls } } } };
}

// a game class model: merged box lists are split into single boxes; turrets get a line of fire per barrel
function gameShip(k) {
  const cls = CLASSES[k];
  const g = buildGameShip(cls, 'player');
  const measured = countDraw(g.group);
  g.body.children[0].name = 'hull'; g.body.children[0].userData.doctorOk = 'sliver';   // flat extruded cap: its fan triangles are harmless
  g.group.updateMatrixWorld(true);
  explodeBoxes(g.group);
  const mounts = g.turrets.map((pivot, i) => {
    const spec = cls.turrets[i], s = spec.size, gap = s * 0.32;
    pivot.name = `turret ${i + 1} (z ${spec.z}${spec.y ? ', raised' : ''})`; pivot.userData.part = true;
    const guns = [];
    for (let b = 0; b < spec.barrels; b++) {
      const o = new THREE.Object3D(); o.position.set((b - (spec.barrels - 1) / 2) * gap, s * 0.45, s * 0.3); o.userData.len = s * 1.6; pivot.add(o); guns.push(o);
    }
    return { name: pivot.name, group: pivot, train: pivot, guns, base: pivot.rotation.y, arc: Math.round(spec.arc.w * 180 / Math.PI) };
  });
  return { root: g.group, measured, opts: { mounts, waterline: !cls.sub, below: (n) => n.startsWith('hull') || n.startsWith('boot-top') } };
}

export const models = [
  ...Object.keys(SHIPS).map((id) => ({ id: 'sea/lab/' + id, label: SHIPS[id].info.name, sub: 'sea · Ship Lab · 1:1', family: 'sea', water: true, build: () => labShip(id) })),
  ...Object.keys(CLASSES).map((k) => ({ id: 'sea/game/' + k, label: GAME_NAMES[k] || k, sub: 'sea · game model', family: 'sea', water: true, build: () => gameShip(k) })),
  ...Object.keys(SHIPS).flatMap((id) => [0, 1, 2].map((L) => ({ id: `sea/lod/${id}/${L}`, label: `${SHIPS[id].info.name} LOD${L}`, sub: 'sea · transformer', family: 'sea', water: true, build: () => lodLevel(id, L) }))),
];

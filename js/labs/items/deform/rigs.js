// Items Lab — deformation: the two set-ups (from Tornado.io's deformation lab). Each rig is one barrel: JunkKit's
// model, its sparse shell (info.shell → js/models/junkyard/shells.js) as a DeformKit shell (js/behaviors/land/deform/)
// with the model embedded, its supports and its press.
//   board     five barrels, upright, tilted 23°, 45° and 68° in L-shaped cradles, and on their side between wedges;
//             a press above each
//   container an open steel container (inside 2.2 × 1.3 m, walls 1.6 m) with seven barrels in two layers and one press
// buildRigs(sceneId, { holder, barrel, mats }) → { rigs: [{ set, shell, supports, press, ground, h0, model }], presses,
//   walls, paint }
import * as THREE from '../../../../vendor/three/three.module.js';
import { createShell, makeBox } from '../../../behaviors/land/deform/shell.js';
import { shellGeometry } from '../../../models/junkyard/shells.js';

const one = new THREE.Vector3(1, 1, 1), Z = new THREE.Vector3(0, 0, 1);
const SETS = [{ deg: 0, label: 'Upright' }, { deg: 23, label: '23°' }, { deg: 45, label: '45°' }, { deg: 68, label: '68°' }, { deg: 90, label: 'On its side' }];
export const GAP = 3.0;   // between the barrels on the board, m
export const CR = 0.025;  // contact radius of the barrels in the container (they touch each other with particles)

export function buildRigs(sceneId, ctx) {
  const out = { rigs: [], presses: [], walls: [] };
  const B = ctx.barrel.info.shell, mass = ctx.barrel.info.mass;
  const HT = B.h, R_MAX = B.rMax;
  const mesh = (geo, mat, m4) => { const m = new THREE.Mesh(geo, mat); if (m4) { m.matrixAutoUpdate = false; m.matrix.copy(m4); } m.castShadow = m.receiveShadow = true; ctx.holder.add(m); return m; };
  const pressMatrix = (p) => new THREE.Matrix4().makeTranslation(p.x, p.y + p.half[1], 0);
  function addPress(x, y0, stop, half) {
    const press = { y0, y: y0, stop, x, half };
    press.box = makeBox(half, pressMatrix(press), 0.8); press.box.plastic = true;
    press.mesh = mesh(new THREE.BoxGeometry(half[0] * 2, half[1] * 2, half[2] * 2), ctx.mats.steel, press.box.matrix);
    press.matrix = pressMatrix;
    out.presses.push(press);
    return press;
  }
  // an L-shaped cradle tilted with the barrel: a slab under its bottom (across the axis) and a slab along its side from
  // the bottom to a little past the centre of mass — the barrel neither returns upright nor slides, and the press
  // pushes it into the cradle; → [[half, Matrix4]]
  function cradle(th, a, n, c) {
    const q = new THREE.Quaternion().setFromAxisAngle(Z, -th), qs = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2 - th);
    const hb = [R_MAX + 0.12, 0.15, 0.42], hs = [0.45, 0.25, 0.42];   // thick slabs — thin ones let the crushed sheet through
    return [
      [hb, new THREE.Matrix4().compose(c.clone().addScaledVector(a, -(HT / 2 + 0.006 + hb[1])).addScaledVector(n, 0.06), q, one)],
      [hs, new THREE.Matrix4().compose(c.clone().addScaledVector(n, R_MAX + 0.006 + hs[1]).addScaledVector(a, -HT / 2 - 0.16 + hs[0]), qs, one)],
    ];
  }
  function placement(deg) {
    const th = deg * Math.PI / 180, a = new THREE.Vector3(Math.sin(th), Math.cos(th), 0), n = new THREE.Vector3(Math.cos(th), -Math.sin(th), 0);
    // upright and on its side: on the ground; tilted: in the cradle — the lowest corner of the cradle on the ground
    let cy = (HT / 2) * Math.cos(th) + R_MAX * Math.sin(th) + 0.003;
    if (deg > 0 && deg < 90) {
      let lo = Infinity;
      for (const [half, m4] of cradle(th, a, n, new THREE.Vector3(0, cy, 0))) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) lo = Math.min(lo, new THREE.Vector3(sx * half[0], sy * half[1], sz * half[2]).applyMatrix4(m4).y);
      cy -= lo;
    }
    return { th, a, n, cy };
  }

  function board() {
    SETS.forEach((set, k) => {
      const x = (k - (SETS.length - 1) / 2) * GAP, { th, a, n, cy } = placement(set.deg);
      const M = new THREE.Matrix4().compose(new THREE.Vector3(x, cy, 0), new THREE.Quaternion().setFromAxisAngle(Z, -th), one);
      const model = ctx.barrel.build(0, k % ctx.barrel.VARIANTS.length);
      const sim = shellGeometry(B).applyMatrix4(M);
      const shell = createShell([sim], { mass, worker: true });   // each barrel in its own thread — they run in parallel
      model.matrixAutoUpdate = false; model.matrix.copy(M); ctx.holder.add(model);
      shell.embed(model); sim.dispose();
      // supports: a concrete cradle under a tilted barrel, wedges under the one on its side
      const supports = [];
      const addBox = (half, m4) => { supports.push(makeBox(half, m4, 0.7)); mesh(new THREE.BoxGeometry(half[0] * 2, half[1] * 2, half[2] * 2), ctx.mats.concrete, m4); };
      if (set.deg > 0 && set.deg < 90) for (const [half, m4] of cradle(th, a, n, new THREE.Vector3(x, cy, 0))) addBox(half, m4);
      else if (set.deg >= 90) for (const sz of [-1, 1]) addBox([0.42, 0.09, 0.09], new THREE.Matrix4().compose(new THREE.Vector3(x, 0, sz * 0.25), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4), one));
      // the press: a steel block 1.5 × 0.4 × 1.2 m above the barrel (tilted: a narrower one above its upper half — the
      // cradle stands under the lower); it stops on a support (samples along the edges of the boxes under the block) or
      // 2 cm above the ground
      const tilted = set.deg > 0 && set.deg < 90, [, hi] = shell.bounds(), pressHalf = tilted ? [0.45, 0.2, 0.6] : [0.75, 0.2, 0.6], px = tilted ? x + a.x * 0.3 : x;
      let stop = 0.02;
      for (const b of supports) {
        const h = b.half;
        for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) for (let t = -1; t <= 1.0001; t += 0.125) {
          const v = [0, 0, 0]; v[i] = s1 * h[i]; v[j] = s2 * h[j]; v[3 - i - j] = t * h[3 - i - j];
          const p = new THREE.Vector3(...v).applyMatrix4(b.matrix);
          if (Math.abs(p.x - px) < pressHalf[0] && Math.abs(p.z) < pressHalf[2]) stop = Math.max(stop, p.y + 0.01);
        }
      }
      const press = addPress(px, hi + 0.08, stop, pressHalf);
      out.rigs.push({ set, shell, supports, press, ground: 0, h0: hi, model });
    });
  }

  // the container: an open steel box on two skids, the floor at FLOOR; the lower layer — two upright, one across, one
  // along, one upright; the upper — one lying on the upright ones and one tilted over the lying ones (they start a little
  // higher, fall and settle by themselves). The press 2.17 × 1.27 m (1.5 cm from the walls) goes down to 8 cm above the floor.
  const CW = 1.1, CD = 0.65, CH = 1.6, FLOOR = 0.14, WALL_T = 0.004;
  function container() {
    const RW = B.r, BARRELS = [
      // [x, y above the floor (centre), z], axis turns: about z (tilt), about x, about y (degrees)
      { label: 'Upright 1', p: [-0.78, HT / 2, -0.33], r: [0, 0, 0] },
      { label: 'Upright 2', p: [-0.78, HT / 2, 0.33], r: [0, 0, 0] },
      { label: 'Lying across', p: [-0.16, RW, 0], r: [0, 90, 0] },
      { label: 'Lying along', p: [0.59, RW, -0.33], r: [90, 0, 0] },
      { label: 'Upright 3', p: [0.8, HT / 2, 0.33], r: [0, 0, 0] },
      { label: 'On the upright', p: [-0.78, HT + RW + 0.03, 0], r: [0, 90, 8] },
      { label: 'Tilted', p: [0.22, RW * 2 + 0.36, 0.05], r: [62, 0, 25] },
    ];
    // floor and walls drawn thin (sheet), collisions with thick boxes behind the inner face
    const T = 0.2, q0 = new THREE.Quaternion();
    const wall = (cx, cy, cz, hx, hy, hz, vis) => {
      out.walls.push(makeBox([hx, hy, hz], new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), q0, one), 0.6));
      const m = mesh(new THREE.BoxGeometry(...vis.size), ctx.mats.paint); m.castShadow = false; m.position.set(...vis.pos); m.userData.wall = true;
    };
    const yc = FLOOR + CH / 2;
    wall(-CW - T, yc, 0, T, CH / 2, CD + 2 * T, { size: [WALL_T, CH, CD * 2 + WALL_T * 2], pos: [-CW - WALL_T / 2, yc, 0] });
    wall(CW + T, yc, 0, T, CH / 2, CD + 2 * T, { size: [WALL_T, CH, CD * 2 + WALL_T * 2], pos: [CW + WALL_T / 2, yc, 0] });
    wall(0, yc, -CD - T, CW, CH / 2, T, { size: [CW * 2, CH, WALL_T], pos: [0, yc, -CD - WALL_T / 2] });
    wall(0, yc, CD + T, CW, CH / 2, T, { size: [CW * 2, CH, WALL_T], pos: [0, yc, CD + WALL_T / 2] });
    const floor = mesh(new THREE.BoxGeometry(CW * 2 + 0.01, 0.01, CD * 2 + 0.01), ctx.mats.paint); floor.castShadow = false; floor.position.set(0, FLOOR - 0.005, 0); floor.userData.wall = true;
    for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(CW * 2 + 0.2, FLOOR - 0.01, 0.16), ctx.mats.steel).position.set(0, (FLOOR - 0.01) / 2, sz * (CD - 0.15));
    const press = addPress(0, FLOOR + CH + 0.05, FLOOR + 0.08, [CW - 0.015, 0.2, CD - 0.015]);   // a 1.5 cm gap — narrower than the particles' contact (5 cm)
    // placing: each barrel is lifted by 1 cm until its shell is at least 1 cm above contact (2 × CR) with the ones already
    // placed — none starts pressed into another (that dented the sheet and mixed the layers)
    const placed = [], clear = 2 * CR + 0.01;
    const gap = (P) => { let m = Infinity; for (const Q of placed) for (let i = 0; i < P.length; i += 3) for (let j = 0; j < Q.length; j += 3) { const dx = P[i] - Q[j], dy = P[i + 1] - Q[j + 1], dz = P[i + 2] - Q[j + 2], d = dx * dx + dy * dy + dz * dz; if (d < m) m = d; } return Math.sqrt(m); };
    BARRELS.forEach((b, k) => {
      const d = Math.PI / 180, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(b.r[1] * d, b.r[2] * d, b.r[0] * d, 'YXZ'));
      const at = new THREE.Vector3(b.p[0], FLOOR + b.p[1] + 0.004, b.p[2]);
      let M = new THREE.Matrix4().compose(at, q, one);
      const sim = shellGeometry(B, { inset: CR }).applyMatrix4(M);
      for (let n = 0; n < 60 && gap(sim.attributes.position.array) < clear; n++) { sim.translate(0, 0.01, 0); at.y += 0.01; }
      M = new THREE.Matrix4().compose(at, q, one);
      placed.push(sim.attributes.position.array);
      const model = ctx.barrel.build(0, k % ctx.barrel.VARIANTS.length);
      const shell = createShell([sim], { mass, radius: CR, worker: true });
      model.matrixAutoUpdate = false; model.matrix.copy(M); ctx.holder.add(model);
      shell.embed(model);
      out.rigs.push({ set: { label: b.label }, shell, supports: out.walls, press, ground: FLOOR, h0: shell.bounds()[1], model });
    });
  }

  if (sceneId === 'container') container(); else board();
  return out;
}

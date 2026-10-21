// Jack-up drilling rig of the Marathon LeTourneau Super 300 design (1983): triangular hull, three square truss legs
// with rack-and-pinion jacking, cantilevered drill floor and derrick over the stern, quarters and helideck forward.
// Main figures from the operator's published specification sheet of a Super 300 unit; the deck layout is
// reconstructed (see docs/structures/super300.md for sources and every assumption). Metres, y up, +z = bow.
import * as THREE from '../../../vendor/three.module.js';
import { Part, plan } from '../../shipkit/geom.js';
import { structMaterials } from '../materials.js';
import * as P from '../parts.js';

const FT = 0.3048;
export const info = {
  id: 'super300',
  name: 'Jack-up drilling rig, Super 300 class',
  year: '1983 (built) · 2015 (last upgrade)',
  type: 'Self-elevating (jack-up) drilling unit, independent legs, cantilever',
  builder: 'Design: Marathon LeTourneau, Super 300 · modelled on a unit whose specification sheet is public (see sources)',
  note: 'Built from code at real scale (1 unit = 1 m). Hull, legs, spud cans, derrick, cranes and quarters follow the published specification sheet; the deck layout, the leg truss pattern and the colours are reconstructed — every assumption is listed in docs/structures/super300.md.',
  specs: [
    ['Hull', '270 ft × 268 ft × 28 ft (82.3 × 81.7 × 8.5 m)'],
    ['Legs', '3 × 515 ft (157 m), square truss, rack and pinion'],
    ['Spud cans', '55 ft (16.8 m) diameter'],
    ['Water depth', 'up to 375 ft (114 m)'],
    ['Cantilever envelope', '60 ft × 24 ft (18.3 × 7.3 m)'],
    ['Derrick', '160 ft × 30 ft × 30 ft (48.8 m high, 9.1 m square base); 1,300,000 lb static hook load, 14 lines'],
    ['Drawworks / top drive', '2,700 hp · 650 short-ton top drive, 50,900 ft·lb'],
    ['Mud pumps', '3 × 2,200 hp, 7,500 psi'],
    ['Cranes', '3 pedestal cranes, 50 short tons at 50 ft: 2 × 140 ft booms (42.7 m), 1 × 100 ft (30.5 m)'],
    ['Power', '5 × 1,855 hp diesel engines with 1,305 kW generators'],
    ['Quarters', '120 persons'],
    ['Storage', '4 + 4 bulk silos (mud, cement; 6,800 ft³ each kind) · 12,791 bbl drill water · 1,977 bbl liquid mud'],
    ['Variable load (drilling)', '≈ 7,800 kips'],
  ],
  sources: [
    ['Shelf Drilling: "Baltic" specification sheet (Sep 2023)', 'https://www.shelfdrilling.com/wp-content/uploads/2013/11/Shelf-Drilling_Baltic_Spec-Sheet-Sep-2023.pdf'],
    ['Shelf Drilling: "Baltic" specification sheet (May 2015)', 'https://www.shelfdrilling.com/wp-content/uploads/2015/06/Shelf-Drilling_Baltic_Spec-Sheet-May-2015.pdf'],
    ['Horizon Offshore: Marathon LeTourneau Class 84 (leg spacing, spud cans, helideck, lifeboats — proportions)', 'https://horizonoffshoreservices.com/wp-content/uploads/2023/06/Jack-up-Presentation.pdf'],
    ['Wikipedia: Jackup rig (legs, rack and pinion, preload, air gap)', 'https://en.wikipedia.org/wiki/Jackup_rig'],
    ['ORLEN Petrobaltic: Baltic platforms (context: jack-ups in the Baltic, air gap 21.2 m on Petro Giant)', 'https://petrobaltic.orlen.pl/en/oil-and-gas/platforms'],
  ],
};

// main dimensions (m)
export const DIM = {
  L: 270 * FT, B: 268 * FT, D: 28 * FT, legLen: 515 * FT, legW: 10.4, spud: 55 * FT, spudH: 6.5,
  canti: 60 * FT, derrickH: 160 * FT, derrickB: 30 * FT, draught: 4.0,
  legs: [[0, 27.5], [-25.6, -16.0], [25.6, -16.0]],              // leg centres (x, z): one forward, two aft
  maxDepth: 375 * FT,
};

export function build({ detail = 1 } = {}) {
  const d = detail, mats = structMaterials({ hull: 0x8f9699, leg: 0xd6a01c });
  mats.helideck = P.helideckMaterial();
  const root = new THREE.Group(); root.name = 'super300';
  const parts = {};
  const add = (name, obj, parent = hullG) => { parts[name] = obj; parent.add(obj); return obj; };
  const { L, B, D } = DIM, hl = L / 2;

  /* ---------------- hull (moves up and down) ---------------- */
  const hullG = new THREE.Group(); hullG.name = 'hull'; root.add(hullG);
  // triangular hull: a broad square stern, sides converging to a blunt bow
  const outline = [[-B / 2, -hl + 4], [-B / 2 + 4, -hl], [B / 2 - 4, -hl], [B / 2, -hl + 4], [13.5, hl - 6], [7.5, hl], [-7.5, hl], [-13.5, hl - 6]];
  const hw = (z) => { const t = (z - (-hl + 4)) / ((hl - 6) - (-hl + 4)); return B / 2 + (13.5 - B / 2) * Math.min(1, Math.max(0, t)); };
  const hull = new Part('hull', mats);
  hull.add('hull', plan(outline, D));
  hull.add('deck', plan(outline.map(([x, z]) => [x * 0.985, z * 0.985]), 0.05), [0, D + 0.01, 0]);
  // leg wells: dark openings in the deck around each leg
  for (const [x, z] of DIM.legs) hull.box('dark', DIM.legW + 1.6, 0.06, DIM.legW + 1.6, [x, D + 0.05, z]);
  // draught marks and a dark band at the waterline when afloat
  hull.add('dark', plan(outline.map(([x, z]) => [x * 1.002, z * 1.002]), 0.5), [0, 4.0, 0]);
  add('hull', hull.finish());

  const deck = new Part('deck', mats);
  P.railing(deck, d, outline.map(([x, z]) => [x * 0.98, z * 0.98]), D, 1.1, 'yellow', true);
  // engine room and mud modules (aft starboard), exhaust stacks
  deck.box('hull', 15, 6, 17, [13, D + 3, -27]);
  deck.box('white', 15.2, 0.6, 17.2, [13, D + 6.3, -27]);
  P.windows(deck, [5.45, D + 4.2, -27], 14, 6, 'x-', [0.8, 0.6]);
  for (const z of [-31, -26]) deck.cyl('dark', 0.55, 0.6, 7, 10, [17, D + 9.5, z]);
  deck.box('hull', 10, 4.5, 10, [-15, D + 2.25, -30]);                                  // mud pits and pumps (aft port)
  // bulk silos: 2 × 4 vertical tanks for mud and cement (starboard, midships)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const x = 18 + j * 4.2, z = -10 + i * 4.2;
    deck.cyl('silo', 1.8, 1.8, 7.5, 16, [x, D + 1.2 + 3.75, z]);
    deck.cyl('silo', 0.4, 1.8, 1.4, 16, [x, D + 0.7, z]);
    for (const s of [-1, 1]) deck.rod('metal', [x + s * 1.3, D, z], [x + s * 1.3, D + 1.5, z], 0.12, 5);
  }
  // pipe deck (port, midships): racks of drill pipe and casing
  deck.box('deck', 16, 0.4, 20, [-14, D + 0.2, -6]);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) deck.tubeZ(r % 2 ? 'red' : 'metal', 0.16, 0.16, 12, 6, [-20 + k * 0.42 + r * 4, D + 0.6 + (k % 3) * 0.3, -6]);
  for (const z of [-15, -6, 3]) deck.box('yellow', 15, 0.6, 0.4, [-14, D + 0.7, z]);
  // stairs from the main deck to the quarters roof
  P.stairs(deck, d, [-11, D, 4.5], [-11, D + 12, -4], 1.0);
  add('deck', deck.finish());

  /* ---------------- quarters and helideck (forward) ---------------- */
  const q = new Part('quarters', mats);
  const qz0 = 4.5, qz1 = 19.5, qw = 22;
  for (let k = 0; k < 4; k++) {
    const y = D + k * 3;
    q.box('white', qw - k * 0.6, 3, qz1 - qz0, [0, y + 1.5, (qz0 + qz1) / 2]);
    P.windows(q, [0, y + 1.8, qz0 - 0.03], qw - 4, 9, 'z-', [1.0, 0.9]);
    P.windows(q, [qw / 2 - k * 0.3 + 0.03, y + 1.8, (qz0 + qz1) / 2], qz1 - qz0 - 3, 6, 'x+', [1.0, 0.9]);
    P.windows(q, [-qw / 2 + k * 0.3 - 0.03, y + 1.8, (qz0 + qz1) / 2], qz1 - qz0 - 3, 6, 'x-', [1.0, 0.9]);
  }
  q.box('white', 6, 3, 5, [5, D + 13.5, 12]);                                           // radio room on the roof
  q.rod('metal', [5, D + 15, 12], [5, D + 24, 12], 0.12, 6);                             // antenna mast
  for (const y of [D + 18, D + 21]) q.rod('metal', [3.5, y, 12], [6.5, y, 12], 0.06, 4);
  P.railing(q, d, [[-10.5, 4.6], [10.5, 4.6], [10.5, 19.4], [-10.5, 19.4]], D + 12, 1.1, 'yellow', true);
  // survival craft: two totally enclosed lifeboats on the starboard side, one to port
  P.lifeboat(q, d, 8.5, [12.8, D + 3.4, 8], 0); P.lifeboat(q, d, 8.5, [12.8, D + 3.4, 16.5], 0); P.lifeboat(q, d, 8.5, [-12.8, D + 3.4, 12], 0);
  add('quarters', q.finish());

  const heli = new Part('helideck', mats);
  const hx = -22.5, hz = 17, hy = D + 14.2, hr = 11.1;                                   // D-value 22.2 m (S-61 / S-92 class), port bow
  const top = new THREE.CylinderGeometry(hr, hr, 0.35, 8, 1); top.rotateY(Math.PI / 8);
  heli.add('helideck', top, [hx, hy, hz]);
  heli.cyl('metal', hr + 1.5, hr + 1.5, 0.12, 8, [hx, hy - 0.3, hz]);                   // safety-net shelf
  for (let i = 0; i < 8; i++) {                                                        // supports down to the quarters and hull side
    const a = (i + 0.5) / 8 * Math.PI * 2, x = hx + Math.cos(a) * hr * 0.8, z = hz + Math.sin(a) * hr * 0.8;
    const footX = Math.max(-hw(z) + 1, Math.min(-qw / 2 + 1, x)), footY = x > -qw / 2 ? D + 12 : D;
    heli.rod('metal', [x, hy - 0.2, z], [footX, footY, z * 0.9 + 1.2], 0.28, 6);
  }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; heli.add('lampGreen', new THREE.SphereGeometry(0.16, 6, 4), [hx + Math.cos(a) * (hr + 0.3), hy + 0.25, hz + Math.sin(a) * (hr + 0.3)]); }
  P.stairs(heli, d, [-11, D + 12, 13], [hx + hr * 0.6, hy, hz - 2], 1.0);
  add('helideck', heli.finish());

  /* ---------------- cantilever, drill floor and derrick (stern; skids aft) ---------------- */
  const cant = new THREE.Group(); cant.name = 'cantilever'; hullG.add(cant); parts.cantilever = cant;
  const cp = new Part('cantilever beams', mats);
  const cz0 = -hl + 2, cl = 30;                                                           // beams run 30 m forward from the stern
  for (const s of [-1, 1]) {
    cp.box('yellow', 1.4, 3.2, cl, [s * 6.5, D + 1.6, cz0 + cl / 2 - 6]);
    cp.box('dark', 1.8, 0.3, cl, [s * 6.5, D + 3.3, cz0 + cl / 2 - 6]);
  }
  for (let i = 0; i < 6; i++) cp.box('yellow', 13, 0.6, 0.6, [0, D + 2.9, cz0 - 6 + i * 5.5]);
  // drill floor house on the end of the cantilever, with the derrick on top
  const fz = cz0 - 5, fy = D + 3.4;
  cp.box('white', 14, 7, 14, [0, fy + 3.5, fz]);
  P.windows(cp, [0, fy + 5, fz + 7.02], 10, 4, 'z+', [1.2, 0.9]);
  cp.box('deck', 15, 0.5, 15, [0, fy + 7.25, fz]);                                        // drill floor
  P.railing(cp, d, [[-7.4, fz - 7.4], [7.4, fz - 7.4], [7.4, fz + 7.4], [-7.4, fz + 7.4]], fy + 7.5, 1.1, 'yellow', true);
  cp.box('white', 4, 3, 3.5, [-4.5, fy + 9, fz + 4.5]);                                   // driller's cabin
  cp.box('glass', 3.6, 1.4, 0.05, [-4.5, fy + 9.5, fz + 2.73]);
  const dy0 = fy + 7.5;
  P.latticeTower(cp, d, { b0: DIM.derrickB, b1: 3.2, h: DIM.derrickH, y0: dy0, bays: 14, key: 'white', r: 0.16 });
  cp.box('red', 4.4, 2.6, 4.4, [0, dy0 + DIM.derrickH + 1.3, fz]);              // crown block house
  cp.box('white', 5.4, 0.3, 5.4, [0, dy0 + DIM.derrickH * 0.55, fz]);                     // monkey board
  cp.box('dark', 1.6, 6, 1.4, [0, dy0 + 18, fz]);                                         // top drive on its guide rails
  cp.box('yellow', 1.8, 2.5, 1.8, [0, dy0 + 22.5, fz]);                                   // travelling block
  for (const s of [-1, 1]) cp.rod('rope', [s * 0.4, dy0 + 23.8, fz], [s * 0.4, dy0 + DIM.derrickH, fz], 0.05, 4);
  cp.rod('metal', [0, dy0 + 2, fz + 0], [0, dy0 + 15, fz], 0.1, 4);
  // pipe ramp (catwalk) from the pipe deck up to the V-door
  cp.rod('yellow', [-3, D + 3.5, fz + 22], [-1, dy0 + 0.2, fz + 7], 0.3, 6);
  cp.rod('yellow', [-1, D + 3.5, fz + 22], [1, dy0 + 0.2, fz + 7], 0.3, 6);
  // conductor and BOP below the drill floor, down to the water (they hang from the floor)
  cp.box('red', 2.6, 6, 2.6, [0, fy - 3, fz]);
  cp.cyl('metal', 0.38, 0.38, 60, 10, [0, fy - 36, fz]);
  cp.add('lampRed', new THREE.SphereGeometry(0.28, 8, 6), [0, dy0 + DIM.derrickH + 2.9, fz]);      // obstruction light on the crown
  cant.add(cp.finish());

  /* ---------------- burner booms (well test), two at the stern corners ---------------- */
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * (B / 2 - 3), D + 1.5, -hl + 3); g.rotation.set(-0.08, Math.PI + s * -0.75, 0);
    const bp = new Part('burner boom', mats); P.latticeBoom(bp, d, { len: 26, w0: 1.6, w1: 1.0, key: 'red', r: 0.1, bays: 9 });
    bp.box('dark', 1.2, 1.2, 1.2, [0, 0, 26.4]);
    g.add(bp.finish()); hullG.add(g); parts['burner boom ' + (s > 0 ? 'stbd' : 'port')] = g;
  }

  /* ---------------- cranes ---------------- */
  const cranes = [];
  for (const [x, z, boom, yaw] of [[-30, -1.5, 140 * FT, -0.6], [30, 2, 140 * FT, 0.5], [30.5, -33, 100 * FT, 0.1]]) {
    const c = P.pedestalCrane(mats, d, { boom, pedestal: 9 });
    c.group.position.set(x, D, z); c.slew.rotation.y = yaw; c.boom.rotation.x = -0.32; c.yaw0 = yaw;
    hullG.add(c.group); cranes.push(c);
  }
  parts.cranes = new THREE.Group(); parts.cranes.name = 'cranes';
  cranes.forEach((c) => parts.cranes.add(c.group)); hullG.add(parts.cranes);

  /* ---------------- legs with spud cans and jack houses ---------------- */
  const legs = [];
  const jh = new Part('jack houses', mats);
  for (const [x, z] of DIM.legs) P.jackHouse(jh, d, { w: DIM.legW, h: 14, y0: D });
  add('jack houses', jh.finish());
  const legLen = DIM.legLen - DIM.spudH;
  for (const [x, z] of DIM.legs) {
    const g = new THREE.Group(); g.name = 'leg';
    const lp = new Part('leg', mats);
    P.trussLeg(lp, d, { len: legLen, width: DIM.legW, bay: 5.2, chordR: 0.5, braceR: 0.16 });
    P.spudCan(lp, d, DIM.spud, DIM.spudH);
    lp.box('dark', DIM.legW + 1, 0.4, DIM.legW + 1, [0, legLen, 0]);                       // leg top cap
    lp.add('lampRed', new THREE.SphereGeometry(0.35, 8, 6), [0, legLen + 0.6, 0]);        // obstruction light
    g.add(lp.finish()); g.position.set(x, 0, z); root.add(g);
    legs.push({ group: g, x, z, len: legLen });
  }
  parts.legs = new THREE.Group(); parts.legs.name = 'legs'; legs.forEach((l) => parts.legs.add(l.group)); root.add(parts.legs);

  // Places the hull and legs: water depth (m), air gap (sea level to the hull's bottom; negative = afloat at that
  // draught) and how far the legs are lowered (0 = raised for tow, 1 = on the seabed).
  function pose({ depth = 60, air = 15, legsDown = 1, penetration = 2 }) {
    hullG.position.y = air;
    const seabedY = -depth - penetration + DIM.spudH;                                    // spud can top when the can sits in the seabed
    const towY = air - 1 + DIM.spudH;                                                     // cans tucked under the hull bottom
    for (const l of legs) l.group.position.y = towY + (seabedY - towY) * legsDown;
  }
  pose({});
  return {
    group: root, parts, legs, cranes, cantilever: cant, hull: hullG, info, pose, materials: mats, dim: DIM,
    anchors: { helideck: [hx, hy, hz], drillFloor: [0, dy0, fz] },
  };
}

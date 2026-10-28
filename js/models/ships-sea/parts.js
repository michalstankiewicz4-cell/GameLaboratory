// ShipKit building blocks in metres: gun mounts, AA guns, torpedo tubes, searchlights, rangefinders, boats,
// ventilators, bollards, guard rails, masts, propellers. Each mount is its own Part (rotatable); small fittings
// are added to a shared Part. `d` = detail (segment multiplier).
import * as THREE from '../../../vendor/three/three.module.js';
import { Part, prism } from './geom.js';

const seg = (n, d) => Math.max(4, Math.round(n * d));

// Shielded 120 mm Bofors mount (twin or single). Returns { part, train (Group), guns: [elevating Groups] }.
// Origin at the deck under the training axis; guns point +z.
export function bofors120(mats, d, barrels = 2) {
  const part = new Part(barrels === 2 ? 'mount120x2' : 'mount120x1', mats);
  const w = barrels === 2 ? 4.0 : 2.7, L = 5.0, H = 2.45;
  // fixed base ring
  part.cyl('paint', 2.05, 2.15, 0.35, seg(32, d), [0, 0.17, 0]);
  const train = new THREE.Group(); train.name = 'train';
  const shield = new Part('shield', mats);
  // shield: sloped front, sloped sides, flat roof, open-backed overhang (as on the Bofors M34/36 mounts)
  const prof = [[-w / 2, 0], [w / 2, 0], [w / 2 - 0.12, H * 0.82], [w / 2 - 0.35, H], [-w / 2 + 0.35, H], [-w / 2 + 0.12, H * 0.82]];
  const body = prism(prof, L); body.translate(0, 0.35, -0.5);
  shield.add('paint', body);
  // sloped face plate
  shield.add('paint', prism([[-w / 2 + 0.05, 0], [w / 2 - 0.05, 0], [w / 2 - 0.35, H - 0.05], [-w / 2 + 0.35, H - 0.05]], 0.12), [0, 0.35, L / 2 - 0.45], [-0.42, 0, 0]);
  // sight hoods on the roof, ventilator, rear access hatch, roof ladder rungs
  for (const sx of [-1, 1]) shield.box('paint', 0.45, 0.32, 0.8, [sx * (w / 2 - 0.55), 0.35 + H + 0.16, 0.9]);
  shield.cyl('paint', 0.16, 0.16, 0.3, seg(10, d), [0, 0.35 + H + 0.15, -1.2]);
  shield.box('dark', w * 0.5, 1.5, 0.05, [0, 1.3, -0.5 - L / 2 - 0.03]);
  for (let i = 0; i < 4; i++) shield.box('metal', 0.5, 0.04, 0.04, [w / 2 - 0.45, 0.6 + i * 0.45, -0.5 - L / 2 - 0.05]);
  // gun ports in the face
  const gap = barrels === 2 ? 1.5 : 0;
  for (let b = 0; b < barrels; b++) shield.box('dark', 0.55, 0.9, 0.2, [(b - (barrels - 1) / 2) * gap, 1.25, L / 2 - 0.3]);
  train.add(shield.finish());
  const guns = [];
  for (let b = 0; b < barrels; b++) {
    const g = new THREE.Group(); g.name = 'gun';
    g.position.set((b - (barrels - 1) / 2) * gap, 1.3, L / 2 - 0.6);
    const bar = new Part('barrel', mats);
    // 50-calibre barrel (6.0 m), tapered, with the jacket, muzzle swell and canvas blast bag at the port
    bar.tubeZ('metal', 0.19, 0.115, 4.6, seg(14, d), [0, 0, 2.6]);
    bar.tubeZ('metal', 0.21, 0.19, 1.0, seg(14, d), [0, 0, 0.5]);
    bar.tubeZ('metal', 0.125, 0.14, 0.18, seg(14, d), [0, 0, 4.95]);
    bar.add('canvas', new THREE.SphereGeometry(0.42, seg(10, d), seg(6, d)), [0, 0, 0.1], [0, 0, 0], [1, 1, 0.9]);
    g.add(bar.finish());
    train.add(g); guns.push(g);
  }
  part.group.add(train);
  part.finish();
  return { part: part.group, train, guns };
}

// Twin 40 mm Bofors (open mount): pedestal, cradle, two barrels with flash hiders, seats, sight, splinter tub
// (tub: false — no tub, e.g. the submarine's mount that retracts into a well; the deck disc is then `disc` m across).
export function bofors40(mats, d, { tub = true, disc = 3.84 } = {}) {
  const part = new Part('bofors40', mats);
  if (tub) {
    part.add('paint', new THREE.CylinderGeometry(2.0, 2.0, 1.0, seg(28, d), 1, true), [0, 0.5, 0]);   // splinter tub (open ring)
    part.add('paint', new THREE.TorusGeometry(2.0, 0.05, 4, seg(28, d)), [0, 1.0, 0], [Math.PI / 2, 0, 0]);
  }
  part.cyl('deck', disc / 2, disc / 2, tub ? 0.04 : 0.12, seg(28, d), [0, tub ? 0.04 : 0.06, 0]);
  const train = new THREE.Group();
  const t = new Part('train', mats);
  t.cyl('metal', 0.55, 0.7, 0.86, seg(14, d), [0, 0.49, 0]);
  t.box('metal', 1.3, 0.55, 1.2, [0, 1.1, 0]);
  for (const sx of [-1, 1]) {
    t.box('metal', 0.5, 0.08, 0.5, [sx * 1.05, 0.8, -0.2]);                       // layer seats
    t.box('metal', 0.08, 0.6, 0.08, [sx * 1.05, 0.5, -0.2]);
  }
  t.box('dark', 0.2, 0.25, 0.3, [0.75, 1.45, 0.1]);                                  // sight
  train.add(t.finish());
  const guns = new THREE.Group(); guns.position.set(0, 1.15, 0.2);
  const g = new Part('guns', mats);
  for (const sx of [-0.28, 0.28]) {
    g.tubeZ('metal', 0.06, 0.05, 2.3, seg(10, d), [sx, 0, 1.3]);
    g.tubeZ('metal', 0.075, 0.07, 0.35, seg(10, d), [sx, 0, 2.55]);                 // flash hider
    g.box('metal', 0.22, 0.32, 0.9, [sx, 0.12, 0.1]);                                 // breech / loader guide
  }
  guns.add(g.finish());
  train.add(guns);
  part.group.add(train);
  part.finish();
  return { part: part.group, train, guns: [guns] };
}

// Twin 13.2 mm Hotchkiss machine gun on a pedestal with a small shield.
export function hotchkiss(mats, d) {
  const part = new Part('hotchkiss', mats);
  part.cyl('metal', 0.12, 0.18, 1.0, seg(10, d), [0, 0.5, 0]);
  const train = new THREE.Group(); train.position.y = 1.05;
  const t = new Part('mg', mats);
  t.box('paint', 0.9, 0.55, 0.04, [0, 0.1, 0.35]);
  for (const sx of [-0.14, 0.14]) { t.tubeZ('metal', 0.03, 0.025, 1.25, seg(8, d), [sx, 0.05, 0.55]); t.box('dark', 0.1, 0.16, 0.5, [sx, 0.05, 0]); }
  t.box('dark', 0.08, 0.22, 0.2, [0, 0.25, -0.15]);
  train.add(t.finish());
  part.group.add(train);
  part.finish();
  return { part: part.group, train, guns: [] };
}

// Torpedo tube mount (550 mm) on a rotating base: by default the destroyer's triple bank (6.25 m tubes) with a small
// trainer's shelter; { tubes: 2, len: 7.2, shelter: false } gives the submarine's twin mount between the hulls.
export function torpedoTubes(mats, d, { tubes = 3, len = 6.25, shelter = true } = {}) {
  const part = new Part('tubes', mats);
  part.cyl('paint', 1.3, 1.4, 0.35, seg(24, d), [0, 0.18, 0]);
  const train = new THREE.Group();
  const t = new Part('tt', mats);
  t.box('paint', tubes * 0.8, 0.3, len * 0.48, [0, 0.5, -0.3]);
  for (let k = 0; k < tubes; k++) {
    const x = (k - (tubes - 1) / 2) * 0.72, zm = 0.5 + len / 2;
    t.tubeZ('paint', 0.33, 0.33, len, seg(14, d), [x, 0.95, 0.5]);
    t.cyl('dark', 0.3, 0.3, 0.05, seg(14, d), [x, 0.95, zm + 0.035], [Math.PI / 2, 0, 0]);   // muzzle
    t.tubeZ('metal', 0.37, 0.37, 0.12, seg(14, d), [x, 0.95, 0.5 - len / 2 - 0.015]);          // rear door ring
    for (const u of [-0.32, 0.016, 0.304]) t.tubeZ('metal', 0.37, 0.37, 0.08, seg(14, d), [x, 0.95, 0.5 + u * len]);
  }
  if (shelter) {
    t.box('paint', 1.0, 1.1, 0.9, [0, 1.6, -2.4]);                                            // trainer's shelter
    t.box('glass', 0.7, 0.18, 0.02, [0, 1.9, -1.93]);
  }
  train.add(t.finish());
  part.group.add(train);
  part.finish();
  return { part: part.group, train, guns: [] };
}

// 105 mm/41 Bofors submarine deck gun on a pedestal with a training shield ("rotating mask"): low pedestal on the
// casing, cradle with recoil cylinders, 4.3 m barrel, curved front shield with side wings, layer's and trainer's seats.
// Returns { part, train, guns: [elevating Group] }; origin on the deck under the training axis; points +z.
export function deckGun105(mats, d) {
  const part = new Part('gun105', mats);
  part.cyl('paint', 0.55, 0.75, 0.55, seg(18, d), [0, 0.27, 0]);                  // pedestal on the casing
  const train = new THREE.Group(); train.name = 'train';
  const t = new Part('carriage', mats);
  t.cyl('metal', 0.5, 0.5, 0.35, seg(16, d), [0, 0.72, 0]);                         // training race
  for (const sx of [-1, 1]) t.box('paint', 0.12, 0.75, 1.0, [sx * 0.42, 1.25, 0.05]); // trunnion brackets
  // shield: curved front (an arc of a cylinder) with side wings, open at the back and the top
  const sh = new THREE.CylinderGeometry(1.25, 1.25, 1.55, seg(18, d), 1, true, -0.95, 1.9); 
  t.add('paint', sh, [0, 1.62, -0.35]);
  t.box('dark', 0.34, 0.36, 0.06, [0, 1.4, 0.91]);                                   // gun port
  for (const sx of [-1, 1]) {
    t.box('metal', 0.4, 0.06, 0.35, [sx * 0.75, 1.05, -0.55]);                     // seats
    t.box('metal', 0.06, 0.4, 0.06, [sx * 0.75, 0.85, -0.55]);
    t.box('dark', 0.12, 0.18, 0.4, [sx * 0.6, 1.6, 0.05]);                          // sights
  }
  train.add(t.finish());
  const gun = new THREE.Group(); gun.name = 'gun'; gun.position.set(0, 1.42, 0.1);
  const g = new Part('barrel', mats);
  g.tubeZ('metal', 0.13, 0.085, 3.7, seg(14, d), [0, 0, 2.2]);                     // barrel (41 calibres = 4.3 m with the breech)
  g.tubeZ('metal', 0.1, 0.1, 0.12, seg(14, d), [0, 0, 4.1]);                       // muzzle ring
  g.box('metal', 0.42, 0.42, 0.8, [0, 0, -0.2]);                                    // breech block
  for (const sx of [-1, 1]) g.tubeZ('metal', 0.07, 0.07, 1.4, seg(8, d), [sx * 0.2, -0.17, 0.75]);   // recoil cylinders
  g.tubeZ('dark', 0.11, 0.11, 0.03, seg(12, d), [0, 0, 4.17]);                      // tampion
  gun.add(g.finish());
  train.add(gun);
  part.group.add(train);
  part.finish();
  return { part: part.group, train, guns: [gun] };
}

// Polish naval ensign (1919–1945 pattern simplified): white over red, the red eagle shield in the white field.
export function ensign(mats, at) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 128, 40); g.fillStyle = '#c4161c'; g.fillRect(0, 40, 128, 40);
  g.beginPath(); g.moveTo(16, 8); g.lineTo(40, 8); g.lineTo(40, 26); g.quadraticCurveTo(28, 38, 16, 26); g.closePath(); g.fill();
  g.fillStyle = '#f2f2ee'; g.beginPath(); g.ellipse(28, 18, 6, 7, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94, 8, 2), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 }));
  const p = m.geometry.attributes.position;                               // a little wave in the cloth
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.75) * 4) * 0.06 * (p.getX(i) + 0.75));
  m.geometry.computeVertexNormals();
  m.position.set(at[0], at[1], at[2]); m.rotation.y = Math.PI / 2; m.name = 'ensign';
  return m;
}

// Painted lettering (a canvas texture on a plane): text, colour, size w × h metres, font; facing +z unless rotated.
export function lettering(text, at, { w = 3.4, h = 0.42, color = '#b3201a', font = 'bold 44px Georgia, serif', yaw = 0, name = 'lettering' } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(at[0], at[1], at[2]); m.rotation.y = yaw; m.name = name; m.userData.decal = true;
  return m;
}

// Searchlight (drum with a glowing lens) on a pedestal; dia in metres.
export function searchlight(p, d, dia = 0.9, at = [0, 0, 0], yaw = 0) {
  p.cyl('metal', 0.1, 0.16, 0.6, seg(8, d), [at[0], at[1] + 0.3, at[2]]);
  p.tubeZ('paint', dia / 2, dia / 2, dia * 0.9, seg(16, d), [at[0], at[1] + 0.6 + dia / 2, at[2]], [0, yaw, 0]);
  p.add('lamp', new THREE.CircleGeometry(dia * 0.42, seg(16, d)), [at[0] + Math.sin(yaw) * (dia * 0.45 + 0.03), at[1] + 0.6 + dia / 2, at[2] + Math.cos(yaw) * (dia * 0.45 + 0.03)], [0, yaw, 0]);
}

// Coincidence rangefinder: horizontal tube of `len` metres with end hoods, on a pedestal with an operator's hood.
export function rangefinder(p, d, len, at, yaw = 0) {
  const [x, y, z] = at;
  p.cyl('paint', 0.35, 0.45, 0.9, seg(12, d), [x, y + 0.45, z]);
  p.box('paint', 1.0, 0.6, 0.9, [x, y + 1.15, z]);
  const g = new THREE.CylinderGeometry(0.16, 0.16, len, seg(12, d)); g.rotateZ(Math.PI / 2);
  p.add('paint', g, [x, y + 1.25, z], [0, yaw, 0]);
  for (const s of [-1, 1]) p.box('paint', 0.28, 0.36, 0.36, [x + Math.cos(yaw) * s * len / 2, y + 1.25, z - Math.sin(yaw) * s * len / 2], [0, yaw, 0]);
}

// Ship's boat (whaler / motor boat) lying in chocks: length len.
export function boat(p, d, len, at, motor = false) {
  const [x, y, z] = at, b = len * 0.24;
  const g = new THREE.SphereGeometry(1, seg(14, d), seg(6, d), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  p.add('white', g, [x, y + b * 0.45, z], [0, 0, 0], [b / 2, b * 0.45, len / 2]);
  p.box('wood', b * 0.92, 0.05, len * 0.86, [x, y + b * 0.45, z]);
  if (motor) p.box('white', b * 0.7, 0.45, len * 0.3, [x, y + b * 0.45 + 0.22, z + len * 0.12]);
  for (const s of [-0.3, 0.3]) p.box('wood', b * 0.9, 0.35, 0.18, [x, y + 0.17, z + s * len]);       // chocks
}

// Cowl ventilator (curved hood) facing yaw.
export function ventilator(p, d, at, r = 0.25, h = 1.0, yaw = 0) {
  const [x, y, z] = at;
  p.cyl('paint', r, r, h, seg(10, d), [x, y + h / 2, z]);
  // quarter-bend from the pipe top: the torus is shifted so its arc starts on the pipe axis going up and ends
  // R further on, horizontal; local -x (where the arc ends) is turned to face `yaw`
  const R = r * 1.3, sx = Math.sin(yaw), sz = Math.cos(yaw);
  const t = new THREE.TorusGeometry(R, r, seg(8, d), seg(10, d), Math.PI / 2); t.translate(-R, 0, 0);
  p.add('paint', t, [x, y + h, z], [0, yaw + Math.PI / 2, 0]);
  // bell mouth (flared, open) and the dark inside, facing yaw
  const bell = new THREE.CylinderGeometry(r * 1.35, r, r * 0.5, seg(12, d), 1, true); bell.rotateX(Math.PI / 2);
  p.add('paint', bell, [x + sx * (R + r * 0.25), y + h + R, z + sz * (R + r * 0.25)], [0, yaw, 0]);
  p.add('dark', new THREE.CircleGeometry(r * 0.98, seg(12, d)), [x + sx * (R - 0.02), y + h + R, z + sz * (R - 0.02)], [0, yaw, 0]);
}

// Pair of mooring bollards.
export function bollards(p, d, at) {
  const [x, y, z] = at;
  p.box('paint', 0.4, 0.12, 1.1, [x, y + 0.06, z]);
  for (const s of [-0.3, 0.3]) { p.cyl('metal', 0.13, 0.13, 0.45, seg(10, d), [x, y + 0.3, z + s]); p.cyl('metal', 0.17, 0.17, 0.05, seg(10, d), [x, y + 0.53, z + s]); }
}

// Guard rail along a polyline of deck-edge points [[x,y,z],...]: stanchions every `step`, three wires.
export function rail(p, pts, step = 1.4, h = 1.0) {
  let acc = step;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (const k of [0.33, 0.66, 1]) p.rod('metal', [a[0], a[1] + h * k, a[2]], [b[0], b[1] + h * k, b[2]], k === 1 ? 0.022 : 0.012, 3);
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    while (acc <= len) {
      const u = acc / len;
      p.rod('metal', [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + h, a[2] + (b[2] - a[2]) * u], 0.025, 4);
      acc += step;
    }
    acc -= len;
  }
}

// Three-bladed propeller (diameter dia) facing +z at `at`.
export function propeller(p, d, dia, at, hand = 1) {
  const [x, y, z] = at;
  p.add('bronze', new THREE.SphereGeometry(dia * 0.11, seg(10, d), seg(8, d)), [x, y, z], [0, 0, 0], [1, 1, 1.6]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const blade = new THREE.SphereGeometry(1, seg(10, d), seg(6, d));
    p.add('bronze', blade, [x + Math.cos(a) * dia * 0.27, y + Math.sin(a) * dia * 0.27, z], [0.45 * hand, 0, a], [dia * 0.25, dia * 0.12, 0.05]);
  }
}

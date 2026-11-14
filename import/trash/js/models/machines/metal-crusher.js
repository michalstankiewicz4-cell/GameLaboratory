// Ogromna zgniatarka do metalu (prasa pionowa 400 kN): komora 3,0 × 1,4 × 2,0 m z grubych blach z żebrami,
// otwarta od góry, z podnoszoną bramą z przodu do wyjmowania kostki; 4 kolumny 0,35 m, poprzecznica u góry,
// 2 siłowniki Ø 300 mm, płyta dociskowa 2,9 × 0,35 × 1,9 m z żebrami i pasami ostrzegawczymi, agregat z chłodnicą,
// pulpit sterowniczy, podest ze schodami przy komorze. Układ: środek podstawy w (0,0,0), brama od strony +z.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox } from '../geom.js';
import { mat } from '../materials.js';

const CX = 3.0, CY = 1.4, CZ = 2.0, Y0 = 0.45, WT = 0.1, COL = 0.35, HT = 5.6;
export const LAYOUT = {
  chamber: { center: [0, Y0 + CY / 2, 0], half: [CX / 2, CY / 2, CZ / 2] },
  ram: { axis: [0, -1, 0], start: HT - 1.45, end: Y0 + 0.2, thickness: 0.35, force: 400000, speed: 0.18, size: [CX - 0.1, 0.35, CZ - 0.1] },
  door: { z: CZ / 2 + WT / 2, closedY: Y0 + CY / 2, openY: Y0 + CY / 2 + CY + 0.1, size: [CX + 0.1, CY, WT] },
  button: [-CX / 2 - 1.0, 1.1, CZ / 2 + 0.9],
  size: [CX + 2 * COL + 1.6, HT + 3.9, CZ + 1.4],
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const cyl = (r, h, x, y, z, s = 24, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, s); uvMeters(g, 1); return place(g, [x, y, z], [rx, 0, rz]); };
const XC = CX / 2 + COL / 2 + 0.05, ZC = CZ / 2 - 0.1;

function foundation() { return merge([box(CX + 2 * COL + 0.8, Y0, CZ + 1.0, 0, Y0 / 2, 0)]); }
function chamber() {
  const o = [];
  o.push(box(CX + 2 * WT, 0.12, CZ + 2 * WT, 0, Y0 - 0.06 + 0.06, 0));   // dno (płyta 12 cm na fundamencie)
  for (const s of [-1, 1]) o.push(box(WT, CY, CZ + 2 * WT, s * (CX / 2 + WT / 2), Y0 + CY / 2 + 0.06, 0));
  o.push(box(CX, CY, WT, 0, Y0 + CY / 2 + 0.06, -CZ / 2 - WT / 2));
  // żebra pionowe i pas górny
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) o.push(box(0.08, CY, 0.12, s * (CX / 2 + WT + 0.04), Y0 + CY / 2 + 0.06, -CZ / 2 + 0.3 + i * (CZ - 0.6) / 3));
  for (let i = 0; i < 6; i++) o.push(box(0.12, CY, 0.08, -CX / 2 + 0.25 + i * (CX - 0.5) / 5, Y0 + CY / 2 + 0.06, -CZ / 2 - WT - 0.04));
  o.push(box(CX + 2 * WT + 0.16, 0.1, 0.16, 0, Y0 + CY + 0.01, -CZ / 2 - WT / 2));
  // prowadnice bramy
  for (const s of [-1, 1]) o.push(box(0.14, CY * 2 + 0.3, 0.14, s * (CX / 2 + 0.1), Y0 + CY + 0.2, CZ / 2 + WT / 2));
  return merge(o);
}
function columns() {
  const o = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    o.push(box(COL, HT - Y0, COL, sx * XC, Y0 + (HT - Y0) / 2, sz * ZC));
    o.push(box(COL + 0.25, 0.06, COL + 0.25, sx * XC, Y0 + 0.03, sz * ZC));   // stopa kolumny
    for (const k of [0, 1, 2, 3]) {   // śruby kotwiące
      const a = k * Math.PI / 2 + Math.PI / 4;
      o.push(cyl(0.025, 0.08, sx * XC + Math.cos(a) * 0.24, Y0 + 0.1, sz * ZC + Math.sin(a) * 0.24, 6));
    }
  }
  // poprzecznica (skrzynkowa) u góry
  o.push(box(CX + 2 * COL + 0.5, 0.8, CZ + 0.6, 0, HT - 0.4, 0));
  for (let i = 0; i < 5; i++) o.push(box(0.1, 0.8, CZ + 0.62, -CX / 2 + i * CX / 4, HT - 0.4, 0));
  return merge(o);
}
function cylinders(lod) {   // siłowniki stoją na poprzecznicy (skok 3,5 m — tłoczyska chowają się w cylindrach)
  const o = [], s = lod ? 12 : 32, L = 3.7;
  for (const sx of [-0.75, 0.75]) {
    o.push(cyl(0.2, L, sx, HT + L / 2, 0, s));
    o.push(cyl(0.25, 0.16, sx, HT + 0.08, 0, s), cyl(0.25, 0.16, sx, HT + L - 0.08, 0, s), cyl(0.12, 0.1, sx, HT + L + 0.05, 0, s));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; o.push(cyl(0.022, 0.06, sx + Math.cos(a) * 0.22, HT + 0.19, Math.sin(a) * 0.22, 6)); }
    o.push(cyl(0.035, 0.5, sx + 0.27, HT + L - 0.4, 0, 10), cyl(0.035, 0.5, sx + 0.27, HT + 0.5, 0, 10));
  }
  return merge(o);
}
/** Płyta dociskowa z tłoczyskami (grupa przesuwana w y; środek płyty w (0,0,0) grupy). */
function platen(lod) {
  const [w, h, d] = LAYOUT.ram.size, o = [], rods = [];
  o.push(roundedBox(w, h, d, 0.02, 1)); uvMeters(o[0], 1);
  for (let i = 0; i < 5; i++) o.push(box(0.08, 0.3, d - 0.05, -w / 2 + 0.3 + i * (w - 0.6) / 4, h / 2 + 0.15, 0));
  o.push(box(w - 0.05, 0.3, 0.08, 0, h / 2 + 0.15, 0));
  // prowadnice na kolumnach (tuleje)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.12, h, 0.5, sx * (w / 2 + 0.06), 0, sz * (ZC)));
  for (const sx of [-0.75, 0.75]) rods.push(cyl(0.14, 3.9, sx, h / 2 + 1.95, 0, lod ? 12 : 28));
  const stripe = [];
  for (const sz of [-1, 1]) stripe.push(box(w + 0.004, 0.12, 0.005, 0, -h / 2 + 0.08, sz * (d / 2 + 0.003)));
  for (const sx of [-1, 1]) stripe.push(box(0.005, 0.12, d + 0.004, sx * (w / 2 + 0.003), -h / 2 + 0.08, 0));
  return { plate: merge(o), rods: merge(rods), stripe: merge(stripe) };
}
function door() { const g = roundedBox(...LAYOUT.door.size, 0.01, 1); uvMeters(g, 1); const ribs = [0, 1, 2].map((i) => box(0.1, CY - 0.1, 0.08, -CX / 2 + 0.5 + i * (CX - 1) / 2, 0, WT / 2 + 0.04)); return merge([g, ...ribs]); }
function powerUnit(lod) {
  const o = [], x = -CX / 2 - COL - 1.0, z = -0.4;
  o.push(roundedBox(1.0, 1.0, 1.6, 0.03, 1)); place(o[0], [x, Y0 + 0.5, z]); uvMeters(o[0], 1);
  o.push(cyl(0.22, 0.6, x, Y0 + 1.25, z - 0.4, lod ? 12 : 28, 0, Math.PI / 2));
  for (let i = 0; i < 12; i++) o.push(cyl(0.232, 0.01, x - 0.25 + i * 0.045, Y0 + 1.25, z - 0.4, lod ? 12 : 28, 0, Math.PI / 2));
  o.push(box(0.9, 0.7, 0.08, x, Y0 + 1.36, z + 0.5));   // chłodnica oleju
  for (let i = 0; i < (lod ? 4 : 16); i++) o.push(box(0.86, 0.66, 0.004, x, Y0 + 1.36, z + 0.46 - 0.004 * 0 + i * 0.005 - 0.04));
  return merge(o);
}
function hoses(lod) {
  const t = [], x = -CX / 2 - COL - 1.0;
  for (const [sx, dz] of [[-0.75, -0.1], [0.75, 0.1]]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x + 0.4, Y0 + 1.0, -0.2 + dz), new THREE.Vector3(-CX / 2 - COL - 0.2, 3.2, dz), new THREE.Vector3(-1.6, HT + 0.6, dz), new THREE.Vector3(sx + 0.27, HT + 3.1, 0)]);
    t.push(new THREE.TubeGeometry(c, lod ? 12 : 48, 0.03, 8, false));
  }
  return merge(t);
}
function console_() {
  const [bx, by, bz] = LAYOUT.button, o = [];
  const desk = roundedBox(0.7, 0.3, 0.45, 0.02, 1); place(desk, [bx, by, bz], [-0.5, 0, 0]); uvMeters(desk, 1); o.push(desk);
  o.push(box(0.4, by - 0.15, 0.3, bx, (by - 0.15) / 2, bz - 0.05), box(0.6, 0.02, 0.5, bx, 0.01, bz - 0.05));
  const bt = (dx, r) => place(new THREE.CylinderGeometry(r, r, 0.03, 16), [bx + dx, by + 0.16 * Math.cos(0.5) - 0.0, bz + 0.16 * Math.sin(0.5) - 0.06], [-0.5, 0, 0]);
  return { desk: merge(o), green: bt(-0.18, 0.035), red: bt(0, 0.035), estop: bt(0.2, 0.05) };
}
function stairs() {   // podest przy prawej ścianie komory (wys. 1,45 m), schody w stronę −z — wrzucanie z ręki ponad ścianę
  const o = [], x0 = XC + COL / 2 + 0.47, deck = 1.45;
  o.push(box(0.9, 0.04, 1.3, x0, deck, 0.1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.05, deck, 0.05, x0 + sx * 0.42, deck / 2, 0.1 + sz * 0.62));
  for (let i = 0; i < 7; i++) { const t = (i + 1) / 8; o.push(box(0.8, 0.03, 0.24, x0, deck * t, -0.55 - (1 - t) * 1.55 - 0.12)); }
  for (const sx of [-1, 1]) o.push(box(0.03, 0.06, 2.0, x0 + sx * 0.41, deck / 2, -1.35, 0.72, 0, 0));
  o.push(box(0.035, 0.035, 1.3, x0 + 0.44, deck + 1.0, 0.1), box(0.035, 1.0, 0.035, x0 + 0.44, deck + 0.5, -0.53), box(0.035, 1.0, 0.035, x0 + 0.44, deck + 0.5, 0.73));
  o.push(box(0.9, 0.035, 0.035, x0, deck + 1.0, 0.75), box(0.035, 1.0, 0.035, x0 - 0.43, deck + 0.5, 0.75));
  return merge(o);
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'metal-crusher';
  g.add(part('fundament', foundation(), mat('concreteDark')));
  g.add(part('komora', chamber(), mat('paintYellow')));
  g.add(part('kolumny i poprzecznica', columns(), mat('paintYellow')));
  g.add(part('siłowniki', cylinders(lod), mat('paintGrey')));
  g.add(part('agregat', powerUnit(lod), mat('paintGrey')));
  g.add(part('przewody', hoses(lod), mat('rubberBlack')));
  const c = console_();
  g.add(part('pulpit', c.desk, mat('paintGrey')));
  const gm = new THREE.MeshStandardMaterial({ color: '#2fa34a', roughness: 0.4 }), rm = new THREE.MeshStandardMaterial({ color: '#c42020', roughness: 0.4 });
  gm.name = 'przycisk zielony'; rm.name = 'przycisk czerwony';
  g.add(part('przycisk START', c.green, gm), part('przycisk STOP', c.red, rm), part('wyłącznik awaryjny', c.estop, rm));
  g.add(part('podest', stairs(), mat('galvanized')));
  const p = platen(lod), pg = new THREE.Group(); pg.name = 'płyta dociskowa';
  pg.add(part('płyta dociskowa', p.plate, mat('steelPlate')), part('tłoczyska', p.rods, mat('stainless')), part('pasy na płycie', p.stripe, mat('hazard')));
  pg.position.set(0, LAYOUT.ram.start, 0); g.add(pg);
  const dg = new THREE.Group(); dg.name = 'brama'; dg.add(part('brama', door(), mat('paintYellow')));
  dg.position.set(0, LAYOUT.door.closedY + 0.06, LAYOUT.door.z); g.add(dg);
  return g;
}

export function colliders() {
  const c = [], b = (w, h, d, x, y, z) => c.push({ kind: 'box', half: [w / 2, h / 2, d / 2], at: [x, y, z] });
  b(CX + 2 * COL + 0.8, Y0 + 0.12, CZ + 1.0, 0, (Y0 + 0.12) / 2, 0);
  for (const s of [-1, 1]) b(WT + 0.1, CY, CZ + 0.2, s * (CX / 2 + WT / 2 + 0.03), Y0 + 0.06 + CY / 2, 0);
  b(CX, CY, WT + 0.08, 0, Y0 + 0.06 + CY / 2, -CZ / 2 - WT / 2 - 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(COL, HT - Y0, COL, sx * XC, Y0 + (HT - Y0) / 2, sz * ZC);
  b(CX + 2 * COL + 0.5, 0.8, CZ + 0.6, 0, HT - 0.4, 0);
  b(1.0, 1.0, 1.6, -CX / 2 - COL - 1.0, Y0 + 0.5, -0.4);
  b(0.7, LAYOUT.button[1] + 0.15, 0.45, LAYOUT.button[0], (LAYOUT.button[1] + 0.15) / 2, LAYOUT.button[2]);
  const x0 = XC + COL / 2 + 0.47;
  b(0.9, 0.04, 1.3, x0, 1.45, 0.1);
  for (let i = 0; i < 7; i++) { const t = (i + 1) / 8; b(0.8, 0.03 + 1.45 * t, 0.24, x0, 1.45 * t / 2, -0.55 - (1 - t) * 1.55 - 0.12); }
  b(0.04, 1.0, 1.3, x0 + 0.44, 1.95, 0.1);
  return c;
}

export const info = { id: 'metal-crusher', name: 'Zgniatarka do metalu (prasa 400 kN)', version: '1.0.0' };

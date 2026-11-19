// Zgniatarka do puszek aluminiowych na dużą ilość: lej zasypowy 2,2 × 1,6 m nad komorą 1,6 × 1,0 × 1,0 m,
// poziomy tłok hydrauliczny (siłownik Ø 125 mm, skok 1,35 m), podnoszona zasuwa wylotowa, zsyp do kosza
// z siatki, agregat hydrauliczny z silnikiem i zbiornikiem, przewody, szafka sterownicza z przyciskami,
// podest ze schodkami i barierką do zasypywania ręcznego. Układ: środek podstawy w (0,0,0), oś tłoka = +x.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox, lathe } from '../geom.js';
import { mat } from '../materials.js';

const CX = 1.6, CY = 1.0, CZ = 1.0, Y0 = 0.9, T = 0.012;   // komora wewnątrz; dno komory na wysokości Y0
export const LAYOUT = {
  chamber: { center: [0, Y0 + CY / 2, 0], half: [CX / 2, CY / 2, CZ / 2] },
  ram: { axis: [1, 0, 0], start: -CX / 2 + 0.04, end: CX / 2 - 0.22, thickness: 0.06, force: 9000, speed: 0.25 },  // N, m/s
  door: { x: CX / 2 + 0.03, closedY: Y0 + CY / 2, openY: Y0 + CY / 2 + CY + 0.05, size: [0.03, CY + 0.02, CZ + 0.02] },
  hopper: { top: Y0 + CY + 0.8, size: [2.2, 1.6] },
  button: [-1.25, 1.15, CZ / 2 + 0.45],
  bin: { center: [CX / 2 + 1.25, 0.45, 0], half: [0.55, 0.45, 0.6] },
  size: [4.2, 2.8, 2.6],
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const cyl = (r, h, x, y, z, rx = 0, ry = 0, rz = 0, s = 20) => { const g = new THREE.CylinderGeometry(r, r, h, s); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };

function chamber() {
  const o = [];
  o.push(box(CX + 0.1, T * 2, CZ + 2 * T, 0, Y0 - T, 0));                        // dno
  for (const s of [-1, 1]) o.push(box(CX + 0.1, CY, T, 0, Y0 + CY / 2, s * (CZ / 2 + T / 2)));   // boki
  o.push(box(T, CY, CZ + 2 * T, -CX / 2 - 0.05, Y0 + CY / 2, 0));               // ściana za tłokiem (z otworem na tłoczysko — pod osłoną)
  // żebra usztywniające boków
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) o.push(box(0.06, CY, 0.05, -CX / 2 + 0.1 + i * (CX - 0.2) / 4, Y0 + CY / 2, s * (CZ / 2 + T + 0.025)));
  // prowadnice zasuwy
  for (const s of [-1, 1]) o.push(box(0.08, CY * 2 + 0.2, 0.06, CX / 2 + 0.03, Y0 + CY + 0.1, s * (CZ / 2 + 0.05)));
  o.push(box(0.1, 0.08, CZ + 0.2, CX / 2 + 0.03, Y0 + 2 * CY + 0.24, 0));
  return merge(o);
}
function hopper() {   // lej: 4 pochyłe blachy od wymiaru komory do 2,2 × 1,6 m
  const o = [], h = 0.8, y = Y0 + CY + h / 2, tx = 2.2, tz = 1.6;
  const ax = Math.atan2((tx - CX) / 2, h), az = Math.atan2((tz - CZ) / 2, h);
  for (const s of [-1, 1]) {
    o.push(box(T, Math.hypot(h, (tx - CX) / 2), tz - 0.02, s * (CX + tx) / 4, y, 0, 0, 0, -s * ax));
    o.push(box(tx - 0.02, Math.hypot(h, (tz - CZ) / 2), T, 0, y, s * (CZ + tz) / 4, s * az, 0, 0));
  }
  // obrzeże leja z kątownika
  o.push(box(tx + 0.06, 0.05, 0.05, 0, Y0 + CY + h, tz / 2 + 0.01), box(tx + 0.06, 0.05, 0.05, 0, Y0 + CY + h, -tz / 2 - 0.01));
  o.push(box(0.05, 0.05, tz, tx / 2 + 0.01, Y0 + CY + h, 0), box(0.05, 0.05, tz, -tx / 2 - 0.01, Y0 + CY + h, 0));
  return merge(o);
}
function frame() {   // rama z dwuteowników: 6 nóg i podłużnice
  const o = [];
  for (const x of [-0.85, 0, 0.85]) for (const s of [-1, 1]) {
    o.push(box(0.12, Y0 - T * 2, 0.12, x, (Y0 - T * 2) / 2, s * (CZ / 2 - 0.02)));
    o.push(box(0.22, 0.015, 0.22, x, 0.0075, s * (CZ / 2 - 0.02)));          // stopa
  }
  for (const s of [-1, 1]) o.push(box(CX + 0.2, 0.14, 0.1, 0, Y0 - 0.1, s * (CZ / 2 - 0.02)));
  for (const x of [-0.85, 0.85]) o.push(box(0.08, 0.08, CZ, x, 0.35, 0));
  return merge(o);
}
/** Tłok: płyta dociskowa + tłoczysko (osobna grupa — gra ją przesuwa wzdłuż x). */
function ram(lod) {
  const plate = roundedBox(0.06, CY - 0.03, CZ - 0.03, 0.01, 1); uvMeters(plate, 1);
  const ribs = [box(0.08, CY - 0.1, 0.04, -0.06, 0, -0.25), box(0.08, CY - 0.1, 0.04, -0.06, 0, 0.25)];
  const rod = cyl(0.045, 1.5, -0.8, 0, 0, 0, 0, Math.PI / 2, lod ? 10 : 24);
  return { plate: merge([plate, ...ribs]), rod };
}
function cylinder(lod) {   // siłownik: cylinder Ø 125 mm za komorą, głowice, ucho mocujące
  const o = [], y = Y0 + CY / 2, x0 = -CX / 2 - 0.08, s = lod ? 10 : 28;
  o.push(cyl(0.075, 1.45, x0 - 0.78, y, 0, 0, 0, Math.PI / 2, s));
  o.push(cyl(0.095, 0.12, x0 - 0.08, y, 0, 0, 0, Math.PI / 2, s), cyl(0.095, 0.12, x0 - 1.5, y, 0, 0, 0, Math.PI / 2, s));
  o.push(box(0.1, 0.24, 0.2, x0 - 1.62, y, 0));
  // wspornik siłownika
  o.push(box(0.1, Y0 + CY / 2, 0.3, x0 - 1.62, (Y0 + CY / 2) / 2, 0), box(0.4, 0.02, 0.4, x0 - 1.62, 0.01, 0));
  // osłona tłoczyska (pancerz między komorą a cylindrem)
  for (const s2 of [-1, 1]) o.push(box(0.2, 0.012, 0.3, x0 - 0.04, y + s2 * 0.16, 0));
  return merge(o);
}
function powerUnit(lod) {   // agregat: zbiornik oleju, silnik elektryczny, pompa, przewody do siłownika
  const o = [], hose = [];
  const x = -1.85, z = -0.85;
  o.push(roundedBox(0.7, 0.45, 0.5, 0.02, 1)); place(o[0], [x, 0.25, z]); uvMeters(o[0], 1);
  o.push(cyl(0.13, 0.36, x, 0.67, z, 0, 0, Math.PI / 2, lod ? 10 : 24));        // silnik
  for (let i = 0; i < 10; i++) o.push(cyl(0.137, 0.008, x - 0.15 + i * 0.033, 0.67, z, 0, 0, Math.PI / 2, lod ? 10 : 24));   // żebra chłodzące
  o.push(cyl(0.05, 0.08, x + 0.22, 0.67, z, 0, 0, Math.PI / 2, 12), box(0.12, 0.1, 0.1, x + 0.3, 0.6, z));   // sprzęgło, pompa
  o.push(cyl(0.03, 0.06, x - 0.2, 0.5, z + 0.12, 0, 0, 0, 10));                  // korek wlewu
  const pts = (a, b, c) => new THREE.CatmullRomCurve3([a, b, c]);
  const yC = Y0 + CY / 2;
  hose.push(new THREE.TubeGeometry(pts(new THREE.Vector3(x + 0.33, 0.62, z), new THREE.Vector3(-1.4, 0.4, -0.5), new THREE.Vector3(-1.0, yC - 0.08, -0.08)), lod ? 8 : 32, 0.016, 8, false));
  hose.push(new THREE.TubeGeometry(pts(new THREE.Vector3(x + 0.33, 0.58, z + 0.04), new THREE.Vector3(-2.0, 0.45, -0.3), new THREE.Vector3(-2.2, yC - 0.08, -0.08)), lod ? 8 : 32, 0.016, 8, false));
  return { body: merge(o), hose: merge(hose) };
}
function controlBox() {   // szafka sterownicza na słupku: 2 przyciski (zielony START, czerwony STOP), grzybek awaryjny
  const [bx, by, bz] = LAYOUT.button;
  const cab = roundedBox(0.4, 0.5, 0.18, 0.015, 1); uvMeters(cab, 1); place(cab, [bx, by, bz]);
  const post = box(0.06, by - 0.25, 0.06, bx, (by - 0.25) / 2, bz - 0.04);
  const foot = box(0.25, 0.015, 0.25, bx, 0.0075, bz - 0.04);
  const bt = (x, y, r) => cyl(r, 0.03, bx + x, by + y, bz + 0.1, Math.PI / 2, 0, 0, 16);
  return { cab: merge([cab, post, foot]), green: bt(-0.09, 0.08, 0.03), red: bt(0.09, 0.08, 0.03), estop: bt(0, -0.1, 0.045) };
}
function door() { const g = roundedBox(...LAYOUT.door.size, 0.006, 1); uvMeters(g, 1); return g; }
function chuteAndBin(lod) {
  const o = [], mesh = [], { center: [bx, by, bz], half: [hx, hy, hz] } = LAYOUT.bin;
  // zsyp: blacha pochyła z burtami od zasuwy do kosza
  const L = 1.0, ang = 0.62, cx = CX / 2 + 0.12 + Math.cos(ang) * L / 2, cy = Y0 - 0.02 - Math.sin(ang) * L / 2;
  o.push(box(L, T, CZ, cx, cy, 0, 0, 0, -ang));
  for (const s of [-1, 1]) o.push(box(L, 0.15, T, cx, cy + 0.07, s * CZ / 2, 0, 0, -ang));
  for (const s of [-1, 1]) o.push(box(0.05, cy, 0.05, cx + 0.3, cy / 2, s * (CZ / 2 - 0.03)));
  // kosz: rama z kątowników + ścianki z siatki (cienkie pręty)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.04, hy * 2, 0.04, bx + sx * hx, by, bz + sz * hz));
  for (const y of [0.02, hy * 2]) { o.push(box(hx * 2, 0.04, 0.04, bx, y, bz - hz), box(hx * 2, 0.04, 0.04, bx, y, bz + hz), box(0.04, 0.04, hz * 2, bx - hx, y, bz), box(0.04, 0.04, hz * 2, bx + hx, y, bz)); }
  o.push(box(hx * 2, 0.02, hz * 2, bx, 0.03, bz));
  const n = lod ? 4 : 10;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    for (const sz of [-1, 1]) mesh.push(box(0.008, hy * 2, 0.008, bx - hx + t * hx * 2, by, bz + sz * hz));
    for (const sx of [-1, 1]) mesh.push(box(0.008, hy * 2, 0.008, bx + sx * hx, by, bz - hz + t * hz * 2));
    for (const sz of [-1, 1]) mesh.push(box(hx * 2, 0.008, 0.008, bx, t * hy * 2, bz + sz * hz));
    for (const sx of [-1, 1]) mesh.push(box(0.008, 0.008, hz * 2, bx + sx * hx, t * hy * 2, bz));
  }
  return { steel: merge(o), mesh: merge(mesh) };
}
function stairs() {   // podest przy leju (wys. 1,2 m) ze schodkami i barierką, od strony +z
  const o = [], z0 = CZ / 2 + 0.75, deck = 1.15;
  o.push(box(1.6, 0.04, 0.7, 0.2, deck, z0 + 0.1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.05, deck, 0.05, 0.2 + sx * 0.77, deck / 2, z0 + 0.1 + sz * 0.32));
  for (let i = 0; i < 6; i++) { const t = (i + 1) / 7; o.push(box(0.6, 0.03, 0.22, 1.25 + (1 - t) * 1.0, deck * t, z0 + 0.1)); }
  for (const sz of [-1, 1]) o.push(box(1.35, 0.06, 0.03, 1.72, deck / 2, z0 + 0.1 + sz * 0.31, 0, 0, -0.84));
  // barierka od tyłu i boków podestu
  for (const x of [-0.58, 0.2, 0.98]) o.push(box(0.035, 1.0, 0.035, x, deck + 0.5, z0 + 0.43));
  o.push(box(1.6, 0.035, 0.035, 0.2, deck + 1.0, z0 + 0.43), box(1.6, 0.035, 0.035, 0.2, deck + 0.5, z0 + 0.43));
  o.push(box(0.035, 1.0, 0.035, -0.58, deck + 0.5, z0 - 0.22), box(0.035, 0.035, 0.65, -0.58, deck + 1.0, z0 + 0.1));
  return merge(o);
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'can-crusher';
  g.add(part('komora', chamber(), mat('paintGreen')));
  g.add(part('lej zasypowy', hopper(), mat('paintGreen')));
  g.add(part('rama', frame(), mat('steelDark')));
  g.add(part('siłownik', cylinder(lod), mat('paintGrey')));
  const pu = powerUnit(lod);
  g.add(part('agregat', pu.body, mat('paintRed')), part('przewody hydrauliczne', pu.hose, mat('rubberBlack')));
  const cb = controlBox();
  g.add(part('szafka sterownicza', cb.cab, mat('paintGrey')));
  const gm = new THREE.MeshStandardMaterial({ color: '#2fa34a', roughness: 0.4 }); gm.name = 'przycisk zielony';
  const rm = new THREE.MeshStandardMaterial({ color: '#c42020', roughness: 0.4 }); rm.name = 'przycisk czerwony';
  g.add(part('przycisk START', cb.green, gm), part('przycisk STOP', cb.red, rm), part('wyłącznik awaryjny', cb.estop, rm));
  const cbn = chuteAndBin(lod);
  g.add(part('zsyp i kosz', cbn.steel, mat('galvanized')), part('siatka kosza', cbn.mesh, mat('galvanized')));
  g.add(part('podest', stairs(), mat('galvanized')));
  // ruchome: tłok (grupa przesuwana w x) i zasuwa (w y)
  const r = ram(lod), rg = new THREE.Group(); rg.name = 'tłok';
  rg.add(part('płyta tłoka', r.plate, mat('steelPlate')), part('tłoczysko', r.rod, mat('stainless')));
  rg.position.set(LAYOUT.ram.start, Y0 + CY / 2, 0); g.add(rg);
  const dg = new THREE.Group(); dg.name = 'zasuwa'; dg.add(part('zasuwa', door(), mat('steelPlate')));
  dg.position.set(LAYOUT.door.x, LAYOUT.door.closedY, 0); g.add(dg);
  return g;
}

/** Zderzacze statyczne (lokalnie). Tłok i zasuwa są kinematyczne w grze (LAYOUT.ram, LAYOUT.door). */
export function colliders() {
  const c = [], b = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => c.push({ kind: 'box', half: [w / 2, h / 2, d / 2], at: [x, y, z], rot: [rx, ry, rz] });
  b(CX + 0.1, 0.06, CZ + 0.1, 0, Y0 - 0.03, 0);
  for (const s of [-1, 1]) b(CX + 0.1, CY, 0.06, 0, Y0 + CY / 2, s * (CZ / 2 + 0.03));
  b(0.06, CY, CZ + 0.1, -CX / 2 - 0.08, Y0 + CY / 2, 0);
  const h = 0.8, y = Y0 + CY + h / 2, tx = 2.2, tz = 1.6, ax = Math.atan2((tx - CX) / 2, h), az = Math.atan2((tz - CZ) / 2, h);
  for (const s of [-1, 1]) { b(0.04, Math.hypot(h, (tx - CX) / 2), tz, s * (CX + tx) / 4, y, 0, 0, 0, -s * ax); b(tx, Math.hypot(h, (tz - CZ) / 2), 0.04, 0, y, s * (CZ + tz) / 4, s * az, 0, 0); }
  b(CX + 0.2, Y0 - 0.1, CZ, 0, (Y0 - 0.1) / 2, 0);                                   // rama pod komorą (pełna bryła)
  const L = 1.0, ang = 0.62, cx = CX / 2 + 0.12 + Math.cos(ang) * L / 2, cy = Y0 - 0.02 - Math.sin(ang) * L / 2;
  b(L, 0.03, CZ, cx, cy, 0, 0, 0, -ang);
  for (const s of [-1, 1]) b(L, 0.15, 0.03, cx, cy + 0.07, s * CZ / 2, 0, 0, -ang);
  const { center: [bx, by, bz], half: [hx, hy, hz] } = LAYOUT.bin;
  b(hx * 2, 0.04, hz * 2, bx, 0.03, bz);
  for (const s of [-1, 1]) { b(hx * 2, hy * 2, 0.03, bx, by, bz + s * hz); b(0.03, hy * 2, hz * 2, bx + s * hx, by, bz); }
  b(1.6, 0.04, 0.7, 0.2, 1.15, CZ / 2 + 0.85);                                        // podest
  for (let i = 0; i < 6; i++) { const t = (i + 1) / 7; b(0.6, 0.03 + 1.15 * t, 0.22, 1.25 + (1 - t) * 1.0, 1.15 * t / 2, CZ / 2 + 0.85); }
  b(1.6, 1.0, 0.04, 0.2, 1.65, CZ / 2 + 1.18);                                        // barierka
  b(0.7, 0.45, 0.5, -1.85, 0.25, -0.85);                                              // agregat
  b(0.4, 0.5, 0.2, -1.25, 1.15, CZ / 2 + 0.45);
  b(1.7, 0.25, 0.25, -CX / 2 - 0.86, Y0 + CY / 2, 0);                                // siłownik
  return c;
}

export const info = { id: 'can-crusher', name: 'Zgniatarka do puszek', version: '1.0.0' };

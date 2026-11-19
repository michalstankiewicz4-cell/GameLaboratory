// Linia odlewnicza za piecem indukcyjnym: rynna spustowa (stalowa, wyłożona masą ogniotrwałą, 2,4 m ze spadkiem)
// prowadzi ciekły metal z wylewu pieca do form na przenośniku. Przenośnik (4,6 m, rolki, łańcuch, napęd) przesuwa
// 8 żeliwnych form o jedną podziałkę, gdy forma pod rynną jest pełna; metal stygnie w formach, gotowe sztabki
// się wyjmuje. Drugi przenośnik z 10 mniejszymi formami na aluminium; rozdzielacz z zasuwą (dźwignia) wybiera przenośnik.
// Układ: początek rynny nad (0,0,0); rynna biegnie w +z, przenośnik w +x; forma 0 pod końcem rynny.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox } from '../geom.js';
import { mat } from '../materials.js';
import { INGOT } from '../items/ingot.js';
import { INGOT_SMALL } from '../items/ingot-small.js';

const TL = 2.45, Y_A = 1.42, Y_B = 1.02, TW = 0.13, TD = 0.1;      // rynna: długość, wysokości końców, szer./głęb. wnętrza
const MZ = TL + 0.1, MY = 0.86, PITCH = 0.5, NM = 8;               // formy: środek w z, wierzch form, podziałka, liczba
const MZ2 = MZ + 0.78, PITCH2 = 0.36, NM2 = 10;                    // małe formy (aluminium) na drugim przenośniku
export const LAYOUT = {
  trough: { start: [0, Y_A, 0], end: [0, Y_B, TL], width: TW, depth: TD },
  pour: [0, MY, MZ],                       // punkt nalewania (środek wnęki formy pod rynną)
  pitch: PITCH, molds: NM, moldTop: MY, moldZ: MZ,
  cavity: { top: INGOT.top, bottom: INGOT.bottom, depth: INGOT.h, volume: INGOT.volume },
  conveyor: { x0: -0.6, x1: 4.0 },
  // drugi przenośnik z mniejszymi formami (aluminium); rozdzielacz z zasuwą kieruje metal do jednej z dysz
  pour2: [0, MY, MZ2], moldZ2: MZ2, pitch2: PITCH2, molds2: NM2,
  cavity2: { top: INGOT_SMALL.top, bottom: INGOT_SMALL.bottom, depth: INGOT_SMALL.h, volume: INGOT_SMALL.volume },
  lever: [0.45, 1.1, TL + 0.3],
  size: [4.8, 1.6, 4.1],
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const cyl = (r, h, x, y, z, s = 16, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, s); uvMeters(g, 1); return place(g, [x, y, z], [rx, 0, rz]); };

function trough() {
  const ang = Math.atan2(Y_A - Y_B, TL), L = Math.hypot(TL, Y_A - Y_B), cy = (Y_A + Y_B) / 2, cz = TL / 2, steel = [], lin = [];
  const along = (w, h, d, x, y) => box(w, h, d, x, cy + y, cz, ang, 0, 0);
  steel.push(along(TW + 0.1, 0.02, L, 0, -TD / 2 - 0.035), along(0.01, TD + 0.08, L, -TW / 2 - 0.045, 0), along(0.01, TD + 0.08, L, TW / 2 + 0.045, 0));
  lin.push(along(TW + 0.08, 0.04, L, 0, -TD / 2 - 0.005), along(0.04, TD + 0.04, L, -TW / 2 - 0.02, 0.01), along(0.04, TD + 0.04, L, TW / 2 + 0.02, 0.01));
  lin.push(box(TW + 0.08, TD + 0.04, 0.04, 0, Y_A + 0.01, -0.02));   // ścianka czołowa (zamknięty początek)
  // rozdzielacz na końcu rynny: pozioma rynienka nad oboma przenośnikami z dwiema dyszami (rura w dół nad formę);
  // zasuwa (grupa `zasuwa rozdzielacza`) zamyka jedną z dysz — metal spływa do drugiej
  const ny = Y_B - TD / 2 - 0.02;
  steel.push(box(TW + 0.1, 0.02, MZ2 - TL + 0.2, 0, ny + 0.01, (TL + MZ2) / 2 + 0.03));
  for (const sx of [-1, 1]) steel.push(box(0.01, TD, MZ2 - TL + 0.2, sx * (TW / 2 + 0.045), ny + TD / 2, (TL + MZ2) / 2 + 0.03));
  steel.push(box(TW + 0.1, TD, 0.01, 0, ny + TD / 2, MZ2 + 0.13));
  for (const nz of [MZ, MZ2]) {
    steel.push(place(new THREE.CylinderGeometry(0.05, 0.035, ny - MY - 0.03, 16, 1, true), [0, (ny + MY + 0.03) / 2, nz]));
    lin.push(place(new THREE.CylinderGeometry(0.036, 0.025, ny - MY - 0.031, 16), [0, (ny + MY + 0.03) / 2, nz]));
  }
  steel.push(box(0.06, ny - 0.02, 0.06, 0.12, (ny - 0.02) / 2, MZ2 + 0.2), box(0.06, ny - 0.02, 0.06, -0.12, (ny - 0.02) / 2, MZ2 + 0.2), box(0.4, 0.015, 0.25, 0, 0.0075, MZ2 + 0.2));
  for (const z of [0.25, TL - 0.35]) { const y = Y_A - (Y_A - Y_B) * z / TL; steel.push(box(0.06, y - 0.1, 0.06, -0.12, (y - 0.1) / 2, z), box(0.06, y - 0.1, 0.06, 0.12, (y - 0.1) / 2, z), box(0.3, 0.04, 0.06, 0, y - 0.12, z), box(0.4, 0.015, 0.25, 0, 0.0075, z)); }
  return { steel: merge(steel), lining: merge(lin) };
}
function conveyor(lod, MZ = LAYOUT.moldZ, depth = INGOT.h, motor = true) {
  const { x0, x1 } = LAYOUT.conveyor, L = x1 - x0, cx = (x0 + x1) / 2, o = [], rollers = [], y = MY - depth - 0.12;
  for (const s of [-1, 1]) o.push(box(L, 0.16, 0.06, cx, y, MZ + s * 0.33));
  for (let i = 0; i <= 5; i++) { const x = x0 + 0.1 + i * (L - 0.2) / 5; for (const s of [-1, 1]) o.push(box(0.07, y, 0.07, x, y / 2, MZ + s * 0.33)); o.push(box(0.06, 0.06, 0.66, x, 0.25, MZ)); }
  for (let i = 0; i < (lod ? 6 : 18); i++) rollers.push(cyl(0.04, 0.6, x0 + 0.15 + i * (L - 0.3) / ((lod ? 6 : 18) - 1), y + 0.05, MZ, lod ? 8 : 14, Math.PI / 2, 0));
  if (!motor) return { frame: merge(o), rollers: merge(rollers) };
  // napęd: motoreduktor na końcu
  o.push(roundedBox(0.3, 0.25, 0.3, 0.02, 1)); place(o[o.length - 1], [x1 + 0.1, y - 0.1, MZ - 0.5]); uvMeters(o[o.length - 1], 1);
  o.push(cyl(0.1, 0.35, x1 + 0.1, y - 0.1, MZ - 0.8, 16, Math.PI / 2, 0));
  return { frame: merge(o), rollers: merge(rollers) };
}
/** Forma żeliwna z wnęką w kształcie sztabki (zamknięta bryła: zewnętrze + wnęka). */
export function moldGeometry(K = INGOT, W = 0.46, D = 0.56) {
  const H = K.h + 0.05, [tx, tz] = K.top, [bx, bz] = K.bottom, dd = K.h;
  const P = [], I = [];
  const v = (x, y, z) => { P.push(x, y, z); return P.length / 3 - 1; };
  const quad = (a, b, c, d) => I.push(a, b, c, a, c, d);
  const y1 = 0, y0 = -H;      // wierzch formy na y = 0
  // osobne wierzchołki na każdą ścianę (ostre krawędzie)
  // ściana z żądanym kierunkiem normalnej (nx, ny, nz) — kolejność wierzchołków odwracana w razie potrzeby
  let want = [0, 1, 0];
  const faceQuad = (pts) => {
    const [a, b, c] = pts, e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) pts = pts.slice().reverse();
    const ids = pts.map((p) => v(...p)); quad(...ids);
  };
  const O = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
  const C = [[-tx / 2, -tz / 2], [tx / 2, -tz / 2], [tx / 2, tz / 2], [-tx / 2, tz / 2]];
  const B = [[-bx / 2, -bz / 2], [bx / 2, -bz / 2], [bx / 2, bz / 2], [-bx / 2, bz / 2]];
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    const mx = (O[k][0] + O[k2][0]) / 2, mz = (O[k][1] + O[k2][1]) / 2, l = Math.hypot(mx, mz);
    want = [0, 1, 0];
    faceQuad([[O[k][0], y1, O[k][1]], [O[k2][0], y1, O[k2][1]], [C[k2][0], y1, C[k2][1]], [C[k][0], y1, C[k][1]]]);           // wierzch (pierścień)
    want = [-mx / l, 0.3, -mz / l];
    faceQuad([[C[k][0], y1, C[k][1]], [C[k2][0], y1, C[k2][1]], [B[k2][0], y1 - dd, B[k2][1]], [B[k][0], y1 - dd, B[k][1]]]);   // ścianki wnęki (do środka wnęki)
    want = [mx / l, 0, mz / l];
    faceQuad([[O[k2][0], y1, O[k2][1]], [O[k][0], y1, O[k][1]], [O[k][0], y0, O[k][1]], [O[k2][0], y0, O[k2][1]]]);            // boki
  }
  want = [0, 1, 0]; faceQuad(B.map(([x, z]) => [x, y1 - dd, z]));    // dno wnęki
  want = [0, -1, 0]; faceQuad(O.map(([x, z]) => [x, y0, z]));        // spód
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  // kierunek: objętość dodatnia
  g.computeVertexNormals(); uvMeters(g, 0.5);
  return g;
}

/** Zasuwa rozdzielacza (płytka ślizgająca się w rynience) i dźwignia na słupku. Stan: 0 — duże formy, 1 — małe. */
function diverter() {
  const ny = Y_B - TD / 2 - 0.02;
  const gate = box(TW + 0.02, 0.012, 0.16, 0, ny + 0.03, 0);
  const [lx, ly, lz] = LAYOUT.lever;
  const post = merge([box(0.06, ly, 0.06, lx, ly / 2, lz), box(0.25, 0.015, 0.25, lx, 0.0075, lz), box(0.1, 0.12, 0.12, lx, ly, lz)]);
  const arm = merge([box(0.03, 0.42, 0.03, 0, 0.21, 0), place(new THREE.SphereGeometry(0.035, 12, 8), [0, 0.43, 0])]);
  return { gate, post, arm };
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'casting-line';
  const t = trough(); g.add(part('rynna', t.steel, mat('steelDark')), part('wyłożenie rynny', t.lining, mat('refractory')));
  const c = conveyor(lod); g.add(part('przenośnik', c.frame, mat('paintGrey')), part('rolki', c.rollers, mat('steelDark')));
  const c2 = conveyor(lod, MZ2, INGOT_SMALL.h, false); g.add(part('przenośnik małych form', c2.frame, mat('paintGrey')), part('rolki małych form', c2.rollers, mat('steelDark')));
  const dv = diverter();
  const gg = new THREE.Group(); gg.name = 'zasuwa rozdzielacza'; gg.position.z = MZ2; gg.add(part('zasuwa', dv.gate, mat('stainless'))); g.add(gg);
  g.add(part('słupek dźwigni', dv.post, mat('paintGrey')));
  const lg = new THREE.Group(); lg.name = 'dźwignia'; lg.position.set(LAYOUT.lever[0], LAYOUT.lever[1] + 0.06, LAYOUT.lever[2]); lg.rotation.x = -0.5;
  const red = new THREE.MeshStandardMaterial({ color: '#c42020', roughness: 0.5 }); red.name = 'gałka';
  lg.add(part('dźwignia', dv.arm, red)); g.add(lg);
  const small = new THREE.Group(); small.name = 'formy małe';
  const sg = moldGeometry(INGOT_SMALL, 0.32, 0.4);
  for (let i = 0; i < NM2; i++) { const m = part('mała forma ' + (i + 1), sg, mat('castIron')); m.position.set(i * PITCH2, MY, MZ2); small.add(m); }
  g.add(small);
  const molds = new THREE.Group(); molds.name = 'formy';
  const mg = moldGeometry();
  for (let i = 0; i < NM; i++) { const m = part('forma ' + (i + 1), mg, mat('castIron')); m.position.set(i * PITCH, MY, MZ); molds.add(m); }
  g.add(molds);
  return g;
}

export function colliders() {
  const c = [], b = (w, h, d, x, y, z, rx = 0) => c.push({ kind: 'box', half: [w / 2, h / 2, d / 2], at: [x, y, z], rot: [rx, 0, 0] });
  const ang = Math.atan2(Y_A - Y_B, TL), L = Math.hypot(TL, Y_A - Y_B), cy = (Y_A + Y_B) / 2;
  b(TW + 0.1, 0.06, L, 0, cy - TD / 2 - 0.03, TL / 2, ang);
  b(0.05, TD + 0.08, L, -TW / 2 - 0.035, cy, TL / 2, ang); b(0.05, TD + 0.08, L, TW / 2 + 0.035, cy, TL / 2, ang);
  const { x0, x1 } = LAYOUT.conveyor;
  b(x1 - x0, MY - INGOT.h - 0.05, 0.72, (x0 + x1) / 2, (MY - INGOT.h - 0.05) / 2, MZ);
  b(x1 - x0, MY - INGOT_SMALL.h - 0.05, 0.72, (x0 + x1) / 2, (MY - INGOT_SMALL.h - 0.05) / 2, MZ2);
  b(0.12, LAYOUT.lever[1], 0.12, LAYOUT.lever[0], LAYOUT.lever[1] / 2, LAYOUT.lever[2]);
  return c;
}

export const info = { id: 'casting-line', name: 'Rynna i przenośnik z formami', version: '1.1.0' };

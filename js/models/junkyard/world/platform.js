// Platforma na środku wysypiska (jak na zrzucie): podest z betonu 26 × 18 m, wys. 0,5 m, nawierzchnia z płyt
// 2 × 2 m z fugami (każda płyta trochę inaczej osiadła), krawężnik w pasy ostrzegawcze, rampa z blachy ryflowanej
// (dla pojazdu) i 4 kratowe maszty z naświetlaczami w narożnikach.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, rng, uvMeters, roundedBox } from '../geom.js';
import { mat } from '../materials.js';

export const PLATFORM = { w: 26, d: 18, h: 0.5, tile: 2, ramp: { x: 0, w: 5, len: 7 } };
const { w: PW, d: PD, h: PH } = PLATFORM;
export const TOP = PH + 0.06;   // wysokość nawierzchni (płyty 6 cm na podbudowie)

function tiles(lod) {
  const r = rng(77), out = [], nx = PW / 2, nz = PD / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const g = lod ? new THREE.BoxGeometry(1.98, 0.06, 1.98) : roundedBox(1.982, 0.06, 1.982, 0.008, 1);
    uvMeters(g, 1, [r() * 4, r() * 4]);
    place(g, [-PW / 2 + 1 + i * 2, PH + 0.031 + (r() - 0.5) * 0.006, -PD / 2 + 1 + j * 2], [(r() - 0.5) * 0.004, 0, (r() - 0.5) * 0.004]);
    out.push(g);
  }
  return merge(out);
}

function base() {
  const g = new THREE.BoxGeometry(PW + 0.2, PH, PD + 0.2); uvMeters(g, 1); place(g, [0, PH / 2, 0]);
  return g;
}

/** Krawężnik ostrzegawczy na obwodzie (bez odcinka przy rampie). */
function curb() {
  const out = [], hw = 0.25, hh = 0.1, y = PH + hh / 2 + 0.02, R = PLATFORM.ramp;
  const add = (w, d, x, z) => { const g = new THREE.BoxGeometry(w, hh, d); uvMeters(g, 1); place(g, [x, y, z]); out.push(g); };
  add(PW + 0.2, hw, 0, -PD / 2 + hw / 2 - 0.1);
  add(hw, PD + 0.2 - 2 * hw, -PW / 2 + hw / 2 - 0.1, 0); add(hw, PD + 0.2 - 2 * hw, PW / 2 - hw / 2 + 0.1, 0);
  const seg = (PW + 0.2 - R.w) / 2;
  add(seg, hw, -PW / 2 - 0.1 + seg / 2, PD / 2 - hw / 2 + 0.1); add(seg, hw, PW / 2 + 0.1 - seg / 2, PD / 2 - hw / 2 + 0.1);
  // pas ostrzegawczy na pionowej krawędzi podestu (malowany, 8 mm przed ścianą)
  for (const [w, d, x, z] of [[PW + 0.2, 0.01, 0, PD / 2 + 0.105], [PW + 0.2, 0.01, 0, -PD / 2 - 0.105], [0.01, PD + 0.2, PW / 2 + 0.105, 0], [0.01, PD + 0.2, -PW / 2 - 0.105, 0]]) {
    const g = new THREE.BoxGeometry(w, 0.18, d); uvMeters(g, 1); place(g, [x, PH - 0.12, z]); out.push(g);
  }
  return merge(out);
}

/** Rampa: płyta ryflowana na podłużnicach z ceowników, pochylona od nawierzchni do gruntu. */
function ramp(lod) {
  const R = PLATFORM.ramp, ang = Math.atan2(TOP, R.len), L = Math.hypot(TOP, R.len);
  const z0 = PD / 2 + 0.1, cz = z0 + R.len / 2, cy = TOP / 2;
  const plate = new THREE.BoxGeometry(R.w, 0.03, L); uvMeters(plate, 1);
  place(plate, [R.x, cy - 0.015, cz], [ang, 0, 0]);
  const beams = [];
  for (const sx of [-1, -0.33, 0.33, 1]) {
    const b = new THREE.BoxGeometry(0.1, 0.16, L - 0.2); uvMeters(b, 1);
    place(b, [R.x + sx * (R.w / 2 - 0.06), cy - 0.11, cz], [ang, 0, 0]); beams.push(b);
  }
  // listwa najazdowa przy gruncie
  const lip = new THREE.BoxGeometry(R.w, 0.02, 0.3); uvMeters(lip, 1); place(lip, [R.x, 0.005, z0 + R.len + 0.1], [0.06, 0, 0]);
  return { plate: merge([plate, lip]), beams: merge(beams) };
}

/** Maszt kratowy 9 m z dwoma naświetlaczami. */
function mast(x, z, face, lod) {
  const steel = [], lamp = [], lens = [], H = 9, a = 0.35, y0 = TOP;
  const tube = (p0, p1, rad) => {
    const d = new THREE.Vector3().subVectors(p1, p0), L = d.length();
    const c = new THREE.CylinderGeometry(rad, rad, L, lod ? 4 : 8, 1);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    c.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); steel.push(c);
  };
  const C = [[-a, -a], [a, -a], [a, a], [-a, a]].map(([dx, dz]) => [x + dx / 2, z + dz / 2]);
  C.forEach(([cx, cz]) => tube(new THREE.Vector3(cx, y0, cz), new THREE.Vector3(cx, y0 + H, cz), 0.03));
  if (!lod) for (let k = 0; k < 9; k++) for (let s = 0; s < 4; s++) {
    const [ax, az] = C[s], [bx, bz] = C[(s + 1) % 4], y1 = y0 + k * 1.0, y2 = y1 + 1.0;
    tube(new THREE.Vector3(ax, y1 + 0.02, az), new THREE.Vector3(bx, y2 - 0.02, bz), 0.012);
    tube(new THREE.Vector3(ax, y2, az), new THREE.Vector3(bx, y2, bz), 0.012);
  }
  // stopa i głowica
  const foot = new THREE.BoxGeometry(0.7, 0.03, 0.7); place(foot, [x, y0 + 0.019, z]); steel.push(foot);
  const bar = new THREE.BoxGeometry(1.4, 0.08, 0.08); place(bar, [x, y0 + H + 0.1, z], [0, face, 0]); steel.push(bar);
  for (const s of [-1, 1]) {
    const ox = Math.cos(face) * s * 0.55, oz = -Math.sin(face) * s * 0.55;
    const box = roundedBox(0.42, 0.32, 0.16, 0.02, 1); place(box, [x + ox, y0 + H + 0.32, z + oz], [-0.5, face + Math.PI, 0, 'YXZ']); lamp.push(box);
    const glass = new THREE.BoxGeometry(0.36, 0.26, 0.01);
    const fx = Math.sin(face + Math.PI) * 0.085, fz = Math.cos(face + Math.PI) * 0.085;
    place(glass, [x + ox + fx * Math.cos(0.5), y0 + H + 0.32 - 0.085 * Math.sin(0.5), z + oz + fz * Math.cos(0.5)], [-0.5, face + Math.PI, 0, 'YXZ']); lens.push(glass);
  }
  return { steel: merge(steel), lamp: merge(lamp), lens: merge(lens) };
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'platform';
  g.add(part('podbudowa', base(), mat('concreteDark')));
  g.add(part('płyty', tiles(lod), mat('concrete')));
  g.add(part('krawężnik ostrzegawczy', curb(), mat('hazard')));
  const rp = ramp(lod);
  g.add(part('rampa', rp.plate, mat('treadPlate')));
  g.add(part('rampa — podłużnice', rp.beams, mat('steelDark')));
  const masts = [[-PW / 2 + 0.6, -PD / 2 + 0.6, Math.PI * 0.75], [PW / 2 - 0.6, -PD / 2 + 0.6, -Math.PI * 0.75], [PW / 2 - 0.6, PD / 2 - 0.6, -Math.PI * 0.25], [-PW / 2 + 0.6, PD / 2 - 0.6, Math.PI * 0.25]];
  masts.forEach(([x, z, f], i) => {
    const m = mast(x, z, f, lod);
    g.add(part('maszt ' + (i + 1), m.steel, mat('galvanized')));
    g.add(part('naświetlacze ' + (i + 1), m.lamp, mat('paintGrey')));
    g.add(part('szyby naświetlaczy ' + (i + 1), m.lens, mat('lampLens')));
  });
  return g;
}

/** Zderzacze statyczne (świat): podest z płytami i rampa. */
export function colliders() {
  const R = PLATFORM.ramp, z0 = PD / 2 + 0.1;
  return [
    { kind: 'box', half: [PW / 2 + 0.1, TOP / 2, PD / 2 + 0.1], at: [0, TOP / 2, 0] },
    { kind: 'hull', points: [R.x - R.w / 2, 0, z0 + R.len, R.x + R.w / 2, 0, z0 + R.len, R.x - R.w / 2, TOP, z0, R.x + R.w / 2, TOP, z0, R.x - R.w / 2, 0, z0, R.x + R.w / 2, 0, z0] },
  ];
}

export const info = { id: 'platform', name: 'Platforma', version: '1.0.0', doctor: {} };

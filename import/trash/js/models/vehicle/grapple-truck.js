// Przeładowarka kołowa do złomu (jak na wysypiskach): podwozie z 4 kołami (opony przemysłowe na felgach stalowych),
// 4 podpory, wieniec obrotu, nadwozie obrotowe z silnikiem, przeciwwagą i kabiną na podwyższeniu (szyby, drabinka,
// poręcze), wysięgnik skrzynkowy z 2 siłownikami, ramię z siłownikiem, chwytak „pomarańczowa skórka" z rotatorem
// i 4 trójkątnymi, zakrzywionymi szczękami (każda na sworzniu z własnym siłownikiem).
// Grupy ruchome (nazwy): podwozie › koło 0…3; nadwozie (obrót wokół y) › wysięgnik (x) › ramię (x) › chwytak › szczęka 0…3 (x).
// Układ: środek podwozia na ziemi w (0,0,0), przód +z.
import * as THREE from '../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox, lathe, loft, V } from '../geom.js';
import { mat } from '../materials.js';
import { buildTire } from '../items/tire-core.js';

const WR = 0.56, AX = 1.45, TRACK = 1.05;            // promień koła, rozstaw osi (połowa), rozstaw kół (połowa)
export const LAYOUT = {
  wheels: [[-TRACK, WR, AX], [TRACK, WR, AX], [-TRACK, WR, -AX], [TRACK, WR, -AX]], wheelRadius: WR,
  chassis: { half: [1.05, 0.35, 2.4], at: [0, 1.0, 0] }, mass: 18000,
  slew: [0, 1.45, 0],                       // oś obrotu nadwozia
  boomPivot: [0.15, 2.05, 1.05],            // w nadwoziu
  boomLen: 6.2, stickLen: 4.4,
  cab: [-0.75, 2.35, 0.6], eye: [-0.75, 3.35, 0.75],
  grappleHang: 0.55,                        // od końca ramienia do osi szczęk
  jawHinge: 0.36, jaws: 4, jawOpen: -1.0, jawClosed: -0.1,   // kąt szczęki wokół sworznia: ujemny — otwarta
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const cyl = (r, h, x, y, z, s = 20, rx = 0, ry = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, s); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const rbox = (w, h, d, r, x, y, z) => { const g = roundedBox(w, h, d, r, 1); uvMeters(g, 1); return place(g, [x, y, z]); };

// opona przemysłowa 18-19.5 (lita bieżnikiem blokowym) — z generatora opon
const TIRE = {
  id: 'tire-ind', rim: 0.2477 * 2 / 2 + 0.0, outer: WR, width: 0.46, tread: 0.40, depth: 0.03, bead: 0.36,
  wall: 0.02, crown: 0.04, shoulder: 0.4, bulge: 0.5, segs: 64, text: ['18-19.5', '16 PR', 'INDUSTRIAL', 'TL'],
  pattern(add, { Wt }) {
    const N = 22, d = (Math.PI * 2) / N;
    for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
      const a = i * d + (s > 0 ? 0 : d / 2), y0 = s > 0 ? 0.015 : -Wt / 2 - 0.01, y1 = s > 0 ? Wt / 2 + 0.01 : -0.015;
      add.block(a, a + d * 0.55, y0, y1, { slant: 0.5 * s, chamfer: 0.004 });
    }
  },
};
function wheel(lod) {
  const g = new THREE.Group();
  const t = buildTire(TIRE, lod); t.rotation.z = Math.PI / 2; t.children.forEach((c) => { c.name = 'opona ' + c.name; c.userData.part = c.name; }); g.add(t);
  // felga stalowa z otworami i śrubami
  const s = lod ? 16 : 40, rr = TIRE.rim;
  const rim = lathe([[0.09, -0.02], [rr - 0.06, -0.02], [rr - 0.01, -0.17], [rr + 0.02, -0.19], [rr + 0.02, -0.175], [rr - 0.005, -0.16], [rr - 0.005, 0.16], [rr + 0.02, 0.175], [rr + 0.02, 0.19], [rr - 0.012, 0.17], [rr - 0.06, 0.03], [0.09, 0.03]].reverse().map(([r, y]) => [r, y]), s, { closed: true });
  rim.rotateZ(Math.PI / 2); g.add(part('felga', rim, mat('paintYellow')));
  const hub = cyl(0.13, 0.16, 0.06, 0, 0, lod ? 10 : 24, 0, 0, Math.PI / 2);
  const nuts = []; if (!lod) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; nuts.push(cyl(0.016, 0.04, 0.05, Math.sin(a) * 0.105, Math.cos(a) * 0.105, 6, 0, 0, Math.PI / 2)); }
  g.add(part('piasta i nakrętki', merge([hub, ...nuts]), mat('steelDark')));
  return g;
}
function chassis(lod) {
  const o = [], y = 1.0;
  o.push(rbox(1.3, 0.6, 4.6, 0.04, 0, y, 0));                              // rama skrzynkowa
  for (const z of [AX, -AX]) o.push(box(TRACK * 2 - 0.5, 0.22, 0.28, 0, WR, z), box(0.5, 0.3, 0.4, 0, WR + 0.18, z));  // mosty i obudowy dyferencjałów
  o.push(rbox(1.0, 0.25, 1.6, 0.03, 0, y + 0.42, 0));                      // podstawa wieńca
  // podpory: belki i stopy (złożone)
  const leg = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    leg.push(box(0.9, 0.18, 0.22, sx * 0.85, y - 0.05, sz * 2.05, 0, 0, sx * 0.35));
    leg.push(cyl(0.06, 0.7, sx * 1.15, y + 0.1, sz * 2.05 - sz * 0.15, 12, 0, 0, sx * 0.6));
    leg.push(rbox(0.45, 0.06, 0.45, 0.01, sx * 1.3, 0.48, sz * 2.05));
  }
  // błotniki i stopnie
  const fend = [];
  for (const [x, , z] of LAYOUT.wheels) fend.push(box(0.55, 0.03, 1.3, x * 1.02, WR * 2 + 0.12, z, 0, 0, 0));
  return { frame: merge(o), legs: merge(leg), fenders: merge(fend) };
}
function upper(lod) {
  const o = [], y = 1.6, glass = [], rail = [], dark = [];
  o.push(cyl(0.75, 0.18, 0, 1.52, 0, lod ? 16 : 40));                      // wieniec obrotu
  o.push(rbox(2.4, 0.22, 4.0, 0.03, 0, y + 0.02, -0.3));                   // platforma
  o.push(rbox(2.3, 1.15, 1.6, 0.06, 0.15, y + 0.7, -1.35));                // maska silnika
  for (let i = 0; i < (lod ? 4 : 14); i++) dark.push(box(0.012, 0.6, 0.04, 1.31, y + 0.75, -1.9 + i * 0.08));   // żaluzje chłodnicy
  o.push(rbox(2.4, 0.95, 0.75, 0.15, 0, y + 0.55, -2.55));                 // przeciwwaga
  o.push(cyl(0.07, 0.9, 0.7, y + 1.65, -1.6, 12), cyl(0.09, 0.12, 0.7, y + 2.12, -1.6, 12));   // rura wydechowa
  // kabina na podwyższeniu (lewa przednia strona)
  const [cx, cy, cz] = LAYOUT.cab;
  o.push(box(0.9, 0.7, 1.0, cx, y + 0.45, cz));                            // podwyższenie
  const cabY = cy + 0.95, cw = 0.95, ch = 1.45, cd = 1.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.06, ch, 0.06, cx + sx * cw / 2, cabY, cz + sz * cd / 2));
  o.push(rbox(cw + 0.1, 0.1, cd + 0.12, 0.03, cx, cabY + ch / 2 + 0.04, cz), box(cw + 0.06, 0.08, cd + 0.06, cx, cabY - ch / 2, cz));
  glass.push(box(0.012, ch - 0.08, cd - 0.06, cx - cw / 2, cabY, cz), box(0.012, ch - 0.08, cd - 0.06, cx + cw / 2, cabY, cz), box(cw - 0.06, ch - 0.08, 0.012, cx, cabY, cz + cd / 2), box(cw - 0.06, ch - 0.08, 0.012, cx, cabY, cz - cd / 2));
  dark.push(box(0.5, 0.5, 0.5, cx, cabY - 0.45, cz - 0.2), box(0.08, 0.6, 0.08, cx + 0.2, cabY - 0.3, cz + 0.35));   // fotel, dźwignie
  o.push(box(0.4, 0.04, 0.12, cx, cabY + ch / 2 + 0.14, cz + cd / 2 - 0.1));   // lampa robocza
  // drabinka i poręcze
  for (let i = 0; i < 5; i++) rail.push(cyl(0.015, 0.4, cx - 0.55, 0.55 + i * 0.32, cz + 0.6, 8, 0, 0, Math.PI / 2));
  for (const dz of [0.4, 0.8]) rail.push(cyl(0.02, 2.0, cx - 0.55, 1.4, cz + dz - 0.0, 8));
  rail.push(cyl(0.02, 1.8, cx - 0.62, y + 1.0, cz - 0.6, 8), cyl(0.02, 2.3, 1.15, y + 0.9, -0.6, 8, Math.PI / 2, 0, 0));
  // wsporniki wysięgnika
  const [px, py, pz] = LAYOUT.boomPivot;
  for (const s of [-1, 1]) o.push(box(0.08, 0.75, 0.9, px + s * 0.28, py - 0.25, pz - 0.15));
  o.push(cyl(0.07, 0.75, px, py, pz, 16, 0, 0, Math.PI / 2));
  return { body: merge(o), glass: merge(glass), rail: merge(rail), dark: merge(dark) };
}
function boom(lod) {   // w układzie wysięgnika: oś obrotu w (0,0,0), wysięgnik wzdłuż +z (przy kącie 0 poziomo)
  const L = LAYOUT.boomLen, o = [], cylS = [], rod = [];
  // skrzynka zwężająca się ku końcowi, lekko wygięta (dwa odcinki)
  const seg = (z0, z1, h0, h1, w, dy0, dy1) => {
    const rings = [];
    for (const [z, h, dy] of [[z0, h0, dy0], [z1, h1, dy1]]) rings.push([V(-w / 2, dy - h / 2, z), V(w / 2, dy - h / 2, z), V(w / 2, dy + h / 2, z), V(-w / 2, dy + h / 2, z)]);
    const g = loft(rings); uvMeters(g, 1); return g;
  };
  o.push(seg(-0.25, L * 0.45, 0.62, 0.55, 0.48, 0, 0.32), seg(L * 0.45, L + 0.2, 0.55, 0.42, 0.44, 0.32, 0.05));
  o.push(cyl(0.065, 0.62, 0, 0.05, L, 16, 0, 0, Math.PI / 2));     // sworzeń końca
  for (const s of [-1, 1]) o.push(box(0.04, 0.3, 0.3, s * 0.26, 0.35, L * 0.42));   // ucha siłowników
  // siłowniki podnoszenia (od nadwozia — narysowane w układzie wysięgnika jako skośne cylindry pod spodem)
  for (const s of [-1, 1]) { cylS.push(cyl(0.085, 1.9, s * 0.33, -0.44, 1.0, lod ? 10 : 20, Math.PI / 2 - 0.12, 0, 0)); rod.push(cyl(0.05, 1.2, s * 0.33, -0.31, 2.45, 12, Math.PI / 2 - 0.12, 0, 0)); }
  // siłownik ramienia na grzbiecie
  cylS.push(cyl(0.08, 2.4, 0, 0.62, L * 0.5, lod ? 10 : 20, Math.PI / 2 + 0.06, 0, 0)); rod.push(cyl(0.05, 1.5, 0, 0.5, L * 0.5 + 1.9, 12, Math.PI / 2 + 0.06, 0, 0));
  return { body: merge(o), cyl: merge(cylS), rod: merge(rod) };
}
function stick(lod) {   // ramię: oś w (0,0,0), wzdłuż +z
  const L = LAYOUT.stickLen, o = [];
  const g = loft([[V(-0.2, -0.24, -0.35), V(0.2, -0.24, -0.35), V(0.2, 0.26, -0.35), V(-0.2, 0.26, -0.35)], [V(-0.16, -0.16, L), V(0.16, -0.16, L), V(0.16, 0.16, L), V(-0.16, 0.16, L)]]); uvMeters(g, 1);
  o.push(g, cyl(0.055, 0.42, 0, 0, L, 16, 0, 0, Math.PI / 2), box(0.36, 0.3, 0.2, 0, 0.3, -0.38));
  return merge(o);
}
/** Jedna szczęka: zakrzywiony trójkąt (szeroki przy sworzniu, ostry na końcu), z żebrem; sworzeń w (0,0,0), oś x. */
export function jawGeometry(lod) {
  const R = 0.95, n = lod ? 5 : 14, rings = [], rib = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ph = 0.05 + t * 1.45;
    const p = V(0, -R * Math.sin(ph), R * (Math.cos(ph) - 1) * 0.55 + 0.0);
    const tg = V(0, -Math.cos(ph), -Math.sin(ph) * 0.55).normalize(), nr = V(0, -tg.z, tg.y);   // normalna w płaszczyźnie (do środka chwytaka: −z)
    const w = 0.5 * (1 - t) + 0.035, th = 0.045 * (1 - t * 0.6);
    rings.push([p.clone().add(V(-w / 2, 0, 0)).addScaledVector(nr, th / 2), p.clone().add(V(w / 2, 0, 0)).addScaledVector(nr, th / 2), p.clone().add(V(w / 2, 0, 0)).addScaledVector(nr, -th / 2), p.clone().add(V(-w / 2, 0, 0)).addScaledVector(nr, -th / 2)]);
    const rh = 0.12 * (1 - t) + 0.02;
    rib.push([p.clone().add(V(-0.02, 0, 0)).addScaledVector(nr, th / 2 - 0.005), p.clone().add(V(0.02, 0, 0)).addScaledVector(nr, th / 2 - 0.005), p.clone().add(V(0.02, 0, 0)).addScaledVector(nr, th / 2 + rh), p.clone().add(V(-0.02, 0, 0)).addScaledVector(nr, th / 2 + rh)]);
  }
  const blade = loft(rings), r = loft(rib); uvMeters(blade, 1); uvMeters(r, 1);
  const knuckle = cyl(0.07, 0.36, 0, 0, 0, 16, 0, 0, Math.PI / 2);
  return merge([blade, r, knuckle]);
}
function grappleHead(lod) {   // w układzie chwytaka: zawieszenie w (0,0,0), oś szczęk na y = −grappleHang
  const h = LAYOUT.grappleHang, o = [], c = [];
  o.push(box(0.16, 0.3, 0.1, 0, -0.1, 0), cyl(0.05, 0.2, 0, 0, 0, 12, 0, 0, Math.PI / 2));     // łącznik
  o.push(cyl(0.2, 0.2, 0, -0.3, 0, lod ? 12 : 28));                                              // rotator
  o.push(cyl(0.3, 0.3, 0, -h + 0.05, 0, lod ? 12 : 32), cyl(0.16, 0.25, 0, -h - 0.15, 0, lod ? 10 : 24));   // korpus z siłownikami
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    o.push(place(box(0.12, 0.16, 0.14, 0, -h, LAYOUT.jawHinge - 0.04), [0, 0, 0], [0, a, 0]));
    c.push(place(cyl(0.045, 0.5, 0, -h + 0.25, 0.25, 12, 0.55, 0, 0), [0, 0, 0], [0, a, 0]));   // siłownik szczęki
  }
  return { body: merge(o), cyl: merge(c) };
}

/** Wpisuje przekształcenia potomków grupy w ich geometrię (grupa i potomkowie bez obrotu i przesunięcia). */
function bake(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), rot = new THREE.Matrix4().makeRotationFromEuler(group.rotation);
  group.traverse((o) => { if (o.isMesh) { const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).premultiply(rot); o.geometry = o.geometry.clone().applyMatrix4(m); } });
  const meshes = []; group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  group.clear(); meshes.forEach((m) => { m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); group.add(m); });
  group.rotation.set(0, 0, 0);
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'grapple-truck';
  const ch = new THREE.Group(); ch.name = 'podwozie'; g.add(ch);
  const cs = chassis(lod);
  ch.add(part('rama podwozia', cs.frame, mat('paintYellow')), part('podpory', cs.legs, mat('paintYellow')), part('błotniki', cs.fenders, mat('steelDark')));
  LAYOUT.wheels.forEach(([x, y, z], i) => {
    const w = wheel(lod); w.name = 'koło ' + i;
    // lewe koła: obrót o 180° wpisany w geometrię (felga na zewnątrz), grupa bez obrotu — kręci się nim gra
    if (x < 0) { w.rotation.z = Math.PI; bake(w); }
    w.position.set(x, y, z); ch.add(w);
  });
  const up = new THREE.Group(); up.name = 'nadwozie'; up.position.set(...LAYOUT.slew); g.add(up);
  const u = upper(lod); [u.body, u.glass, u.rail, u.dark].forEach((geo) => geo.translate(0, -LAYOUT.slew[1], 0));
  up.add(part('nadwozie', u.body, mat('paintYellow')), part('szyby kabiny', u.glass, mat('glass')), part('poręcze', u.rail, mat('steelDark')), part('detale', u.dark, mat('bakelite')));
  const bm = new THREE.Group(); bm.name = 'wysięgnik';
  bm.position.set(LAYOUT.boomPivot[0], LAYOUT.boomPivot[1] - LAYOUT.slew[1], LAYOUT.boomPivot[2]); bm.rotation.x = -0.55; up.add(bm);
  const b = boom(lod); bm.add(part('wysięgnik', b.body, mat('paintYellow')), part('siłowniki', b.cyl, mat('steelDark')), part('tłoczyska', b.rod, mat('stainless')));
  const st = new THREE.Group(); st.name = 'ramię'; st.position.set(0, 0.05, LAYOUT.boomLen); st.rotation.x = 1.75; bm.add(st);
  st.add(part('ramię', stick(lod), mat('paintYellow')));
  const gr = new THREE.Group(); gr.name = 'chwytak'; gr.position.set(0, 0, LAYOUT.stickLen); st.add(gr);
  // chwytak wisi pionowo: kompensacja obrotów wysięgnika i ramienia (gra ustawia go fizycznie)
  gr.rotation.x = -(bm.rotation.x + st.rotation.x);
  const gh = grappleHead(lod); gr.add(part('głowica chwytaka', gh.body, mat('paintGrey')), part('siłowniki szczęk', gh.cyl, mat('steelDark')));
  const jg = jawGeometry(lod);
  for (let k = 0; k < LAYOUT.jaws; k++) {
    const pivot = new THREE.Group(); pivot.rotation.y = k * Math.PI / 2; gr.add(pivot);
    const j = new THREE.Group(); j.name = 'szczęka ' + k; j.position.set(0, -LAYOUT.grappleHang, LAYOUT.jawHinge); j.rotation.x = LAYOUT.jawOpen * 0.5;
    j.add(part('szczęka', jg, mat('rusty'))); pivot.add(j);
  }
  return g;
}

export const info = { id: 'grapple-truck', name: 'Przeładowarka z chwytakiem', version: '1.0.0' };

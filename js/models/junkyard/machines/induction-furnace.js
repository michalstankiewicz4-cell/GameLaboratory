// Piec indukcyjny tyglowy (przechylny): tygiel z wymurówką Ø 1,1 m, wys. 1,2 m (wnętrze Ø 0,7 × 0,95 m ≈ 365 l),
// odsłonięta cewka z rury miedzianej (11 zwojów) w klatce z prętów izolacyjnych, wylew z dzióbkiem z przodu (+z),
// rama przechyłu na dwóch stojakach z łożyskami (oś obrotu przy wylewie — strumień nie ucieka przy przechylaniu),
// siłownik przechyłu z tyłu, szafa zasilania (falownik) z miernikami, szyny prądowe i węże chłodzenia, podest ze
// schodami za piecem. Grupa `tygiel` obraca się wokół osi x w punkcie LAYOUT.pivot.
import * as THREE from '../../../../vendor/three/three.module.js';
import { merge, part, place, uvMeters, roundedBox, lathe } from '../geom.js';
import { mat } from '../materials.js';

const RO = 0.55, RI = 0.35, HC = 1.2, YB = 0.55;            // tygiel: promień zewn., wewn., wysokość, spód nad podłożem
const PIV = [0, YB + HC + 0.02, RO + 0.12];                  // oś przechyłu (przy krawędzi wylewu)
export const LAYOUT = {
  pivot: PIV,
  // w układzie grupy `tygiel` (początek w osi przechyłu):
  inner: { r: RI, bottom: YB + 0.25 - PIV[1], top: YB + HC - PIV[1], cx: 0, cz: -PIV[2] },
  spout: [0, YB + HC + 0.03 - PIV[1], RO + 0.2 - PIV[2]],
  maxTilt: 1.75, tiltSpeed: 0.18,
  panel: [1.75, 1.2, 0.2],
  size: [3.6, 2.9, 3.6],
};
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); uvMeters(g, 1); return place(g, [x, y, z], [rx, ry, rz]); };
const cyl = (r, h, x, y, z, s = 24, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, s); uvMeters(g, 1); return place(g, [x, y, z], [rx, 0, rz]); };

/** Tygiel w układzie grupy (oś przechyłu w (0,0,0)). */
function crucible(lod) {
  const s = lod ? 20 : 64, y0 = YB - PIV[1], z0 = -PIV[2], y1 = y0 + HC;
  // wymurówka (masa ogniotrwała) z grubością: na zewnątrz, w górę, przez koronę, w dół wnętrza do dna
  const lining = lathe([[0, y0], [RO - 0.08, y0], [RO - 0.08, y1 - 0.02], [RO - 0.04, y1 + 0.04], [RI + 0.03, y1 + 0.05], [RI, y1 - 0.02], [RI, y0 + 0.3], [RI - 0.05, y0 + 0.25], [0, y0 + 0.25]], s);
  place(lining, [0, 0, z0]);
  // płaszcz stalowy u dołu i u góry (pierścienie) + dno
  const ring = (ya, yb, r) => place(lathe([[r - 0.025, ya], [r, ya], [r, yb], [r - 0.025, yb]].reverse().reverse(), s), [0, 0, z0]);
  const shell = merge([
    place(lathe([[0, y0 - 0.06], [RO + 0.02, y0 - 0.06], [RO + 0.02, y0 + 0.12], [RO - 0.075, y0 + 0.12], [0, y0 + 0.12]], s), [0, 0, z0]),
    place(lathe([[RO - 0.075, y1 - 0.16], [RO + 0.02, y1 - 0.16], [RO + 0.02, y1 + 0.02], [RO - 0.075, y1 + 0.02]], s), [0, 0, z0]),
  ]);
  // wylew (rynienka z dzióbkiem) — trapezowa blacha wyłożona masą
  const spout = merge([
    box(0.26, 0.08, 0.36, 0, y1 - 0.02, z0 + RO + 0.06, -0.12, 0, 0),
    box(0.04, 0.12, 0.36, -0.13, y1 + 0.02, z0 + RO + 0.06, -0.12, 0, 0), box(0.04, 0.12, 0.36, 0.13, y1 + 0.02, z0 + RO + 0.06, -0.12, 0, 0),
  ]);
  // cewka: rura miedziana Ø 32 mm, 11 zwojów spiralą
  const turns = 11, pts = [], n = lod ? 160 : 660, rc = RO - 0.04, ya = y0 + 0.2, yb = y1 - 0.24;
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * rc, ya + (yb - ya) * t, z0 + Math.cos(a) * rc)); }
  const coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.018, lod ? 5 : 10, false);
  const coilEnds = merge([place(new THREE.SphereGeometry(0.018, 10, 8), [pts[0].x, pts[0].y, pts[0].z]), place(new THREE.SphereGeometry(0.018, 10, 8), [pts[n].x, pts[n].y, pts[n].z])]);
  // klatka: pręty izolacyjne (pionowe listwy) i zaciski cewki
  const bars = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; bars.push(box(0.05, yb - ya + 0.2, 0.04, Math.sin(a) * (rc + 0.035), (ya + yb) / 2, z0 + Math.cos(a) * (rc + 0.035), 0, a, 0)); }
  // czopy (oś przechyłu) po bokach
  const trun = merge([cyl(0.07, 0.2, -RO - 0.1, 0, 0, 16, 0, Math.PI / 2), cyl(0.07, 0.2, RO + 0.1, 0, 0, 16, 0, Math.PI / 2),
    box(0.06, 0.24, RO * 2 + 0.24, -RO - 0.03, -0.1, -RO - 0.12 + 0.12, 0, 0, 0), box(0.06, 0.24, RO * 2 + 0.24, RO + 0.03, -0.1, -RO), ]);
  // powierzchnia stopionego metalu (gra ustawia wysokość i widoczność)
  const melt = new THREE.CircleGeometry(RI - 0.003, s); place(melt, [0, y0 + 0.5, z0], [-Math.PI / 2, 0, 0]);
  return { lining, shell, spout, coil: merge([coil, coilEnds]), bars: merge(bars), trun, melt };
}
function stands() {   // dwa stojaki z łożyskami osi przechyłu i belka fundamentowa
  const o = [];
  for (const s of [-1, 1]) {
    const x = s * (RO + 0.26);
    o.push(box(0.22, PIV[1] - 0.05, 0.5, x, (PIV[1] - 0.05) / 2, PIV[2]));
    o.push(cyl(0.13, 0.24, x, PIV[1], PIV[2], 20, 0, Math.PI / 2));             // obudowa łożyska
    o.push(box(0.5, 0.04, 0.8, x, 0.02, PIV[2]));
  }
  o.push(box(RO * 2 + 0.8, 0.12, 0.3, 0, 0.06, PIV[2]));
  // siłownik przechyłu z tyłu (od fundamentu do ucha na tyle tygla — w spoczynku pionowo)
  o.push(cyl(0.08, 1.1, 0, 0.62, -RO - 0.45, 20), box(0.3, 0.1, 0.3, 0, 0.05, -RO - 0.45));
  return merge(o);
}
function platform() {   // podest za piecem (wys. 1,3 m) ze schodami z boku (−x) i barierką
  const o = [], deck = 1.3, z = -RO - 1.05;
  o.push(box(2.2, 0.04, 0.9, 0, deck, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.push(box(0.05, deck, 0.05, sx * 1.05, deck / 2, z + sz * 0.42));
  for (let i = 0; i < 6; i++) { const t = (i + 1) / 7; o.push(box(0.24, 0.03, 0.8, -1.25 - (1 - t) * 1.5, deck * t, z)); }
  o.push(box(2.2, 0.035, 0.035, 0, deck + 1.0, z - 0.43), box(0.035, 1.0, 0.035, -1.08, deck + 0.5, z - 0.43), box(0.035, 1.0, 0.035, 1.08, deck + 0.5, z - 0.43), box(0.035, 1.0, 0.035, 0, deck + 0.5, z - 0.43));
  o.push(box(0.035, 0.035, 0.9, 1.08, deck + 1.0, z), box(0.035, 1.0, 0.035, 1.08, deck + 0.5, z + 0.43));
  return merge(o);
}
function cabinet(lod) {   // szafa zasilania (falownik średniej częstotliwości) z miernikami, szyny i węże
  const [px, py, pz] = LAYOUT.panel, o = [], meters = [], hoseB = [], hoseR = [];
  const cab = roundedBox(1.0, 2.0, 0.6, 0.02, 1); uvMeters(cab, 1); place(cab, [px + 0.2, 1.0, pz - 0.6]); o.push(cab);
  for (let i = 0; i < 3; i++) meters.push(place(lathe([[0, -0.01], [0.07, -0.01], [0.075, 0.01], [0, 0.012]], 24), [px - 0.05 + i * 0.25, 1.55, pz - 0.29], [Math.PI / 2, 0, 0]));
  o.push(box(0.04, 0.6, 0.04, px - 0.3 + 0.62, 1.0, pz - 0.28));   // klamka
  // pulpit z przyciskami przed szafą
  const desk = roundedBox(0.6, 0.25, 0.4, 0.02, 1); uvMeters(desk, 1); place(desk, [px, py, pz], [-0.5, 0, 0]); o.push(desk);
  o.push(box(0.35, py - 0.12, 0.25, px, (py - 0.12) / 2, pz - 0.05));
  // szyny prądowe od szafy do zacisków cewki (miedź)
  const bus = [box(0.9, 0.02, 0.08, px - 0.55, 1.75, pz - 0.6), box(0.02, 0.6, 0.08, RO + 0.1, 1.45, -0.3 + 0)];
  // węże chłodzenia (niebieski — zasilanie, czerwony — powrót)
  const hose = (arr, dy) => arr.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(px - 0.25, 0.4 + dy, pz - 0.3), new THREE.Vector3(1.0, 0.25 + dy, -0.2), new THREE.Vector3(RO + 0.2, PIV[1] - 0.1 + dy, PIV[2] - 0.05)]), lod ? 10 : 36, 0.02, 8, false));
  hose(hoseB, 0); hose(hoseR, 0.08);
  const bt = (dx, r) => place(new THREE.CylinderGeometry(r, r, 0.03, 16), [px + dx, py + 0.13 * Math.cos(0.5), pz + 0.13 * Math.sin(0.5) - 0.06], [-0.5, 0, 0]);
  return { cab: merge(o), meters: merge(meters), bus: merge(bus), hoseB: merge(hoseB), hoseR: merge(hoseR), green: bt(-0.15, 0.03), red: bt(0, 0.03), tilt: bt(0.15, 0.035) };
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'induction-furnace';
  g.add(part('stojaki i siłownik przechyłu', stands(), mat('paintGrey')));
  g.add(part('podest', platform(), mat('galvanized')));
  const c = cabinet(lod);
  g.add(part('szafa zasilania', c.cab, mat('paintGrey')), part('mierniki', c.meters, mat('bakelite')), part('szyny prądowe', c.bus, mat('copper')));
  const blue = new THREE.MeshStandardMaterial({ color: '#1f4fa8', roughness: 0.6 }), red = new THREE.MeshStandardMaterial({ color: '#b02020', roughness: 0.6 }), green = new THREE.MeshStandardMaterial({ color: '#2fa34a', roughness: 0.4 }), yel = new THREE.MeshStandardMaterial({ color: '#e0b020', roughness: 0.4 });
  blue.name = 'wąż niebieski'; red.name = 'wąż czerwony'; green.name = 'przycisk zielony'; yel.name = 'przycisk żółty';
  g.add(part('wąż zasilający', c.hoseB, blue), part('wąż powrotny', c.hoseR, red));
  g.add(part('przycisk ZAŁ', c.green, green), part('przycisk WYŁ', c.red, red), part('przycisk PRZECHYŁ', c.tilt, yel));
  const t = new THREE.Group(); t.name = 'tygiel'; t.position.set(...PIV);
  const cr = crucible(lod);
  t.add(part('wymurówka', cr.lining, mat('refractory')), part('płaszcz', cr.shell, mat('steelDark')), part('wylew', cr.spout, mat('steelDark')));
  t.add(part('cewka', cr.coil, mat('copper')), part('klatka cewki', cr.bars, mat('bakelite')), part('czopy', cr.trun, mat('steelDark')));
  const melt = part('stopiony metal', cr.melt, mat('glowOrange')); melt.visible = false; melt.castShadow = false; melt.userData.doctorOk = true; t.add(melt);
  g.add(t);
  return g;
}

export function colliders() {
  const c = [], b = (w, h, d, x, y, z) => c.push({ kind: 'box', half: [w / 2, h / 2, d / 2], at: [x, y, z] });
  for (const s of [-1, 1]) b(0.22, PIV[1], 0.5, s * (RO + 0.26), PIV[1] / 2, PIV[2]);
  const deck = 1.3, z = -RO - 1.05;
  b(2.2, 0.04, 0.9, 0, deck, z); b(2.2, 1.0, 0.04, 0, deck + 0.5, z - 0.43);
  for (let i = 0; i < 6; i++) { const t = (i + 1) / 7; b(0.24, 0.03 + deck * t, 0.8, -1.25 - (1 - t) * 1.5, deck * t / 2, z); }
  const [px, py, pz] = LAYOUT.panel;
  b(1.0, 2.0, 0.6, px + 0.2, 1.0, pz - 0.6); b(0.6, py + 0.1, 0.4, px, (py + 0.1) / 2, pz);
  return c;
}
/** Zderzacze tygla (w układzie grupy `tygiel`, obracają się z nim): dno i ścianki z wycinków. */
export function crucibleColliders() {
  const c = [], y0 = YB - PIV[1], z0 = -PIV[2], n = 12;
  c.push({ kind: 'cyl', r: RO, h: 0.3, at: [0, y0 + 0.15, z0] });
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, p = [];
    for (const a of [a0, (a0 + a1) / 2, a1]) for (const r of [RI, RO]) for (const y of [y0 + 0.25, y0 + HC + 0.05]) p.push(Math.sin(a) * r, y, z0 + Math.cos(a) * r);
    c.push({ kind: 'hull', points: p });
  }
  return c;
}

export const info = { id: 'induction-furnace', name: 'Piec indukcyjny z cewką', version: '1.0.0' };

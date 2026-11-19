// Karton zamknięty (klapowy, typ F0201), 40 × 30 × 30 cm, tektura falista 4 mm: ścianki lekko wybrzuszone,
// jeden górny róg wgnieciony, klapy górne z widoczną szczeliną, taśma pakowa przez szczelinę zawinięta na boki,
// zakładka klejona na jednym narożniku; nadruki (strzałki „góra”, szkło, recykling, pieczątka wymiarów).
import * as THREE from '../../../../vendor/three/three.module.js';
import { merge, part, place, roundedBox } from '../geom.js';
import { mat } from '../materials.js';

const L = 0.40, H = 0.30, W = 0.30, T = 0.004;

function body(lod) {
  const g = roundedBox(L, H - T, W, 0.004, 2);
  const p = g.attributes.position, v = new THREE.Vector3();
  const dent = new THREE.Vector3(L / 2, (H - T) / 2, -W / 2);   // wgnieciony róg
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // wybrzuszenie: przesunięcie wzdłuż największej składowej (ściana), największe na środku ściany
    const ax = Math.abs(v.x) / (L / 2), ay = Math.abs(v.y) / ((H - T) / 2), az = Math.abs(v.z) / (W / 2);
    const b = 0.006;
    if (ax > 0.995) v.x += Math.sign(v.x) * b * (1 - ay * ay) * (1 - az * az);
    else if (az > 0.995) v.z += Math.sign(v.z) * b * (1 - ax * ax) * (1 - ay * ay);
    else if (ay > 0.995 && v.y < 0) v.y -= b * 0.4 * (1 - ax * ax) * (1 - az * az);
    // wgniecenie rogu: do środka, gładko malejące z odległością
    const d = v.distanceTo(dent), k = Math.max(0, 1 - d / 0.13);
    v.addScaledVector(new THREE.Vector3(-0.6, -1, 0.5).normalize(), 0.034 * k * k * (3 - 2 * k));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Klapy górne: dwie płyty tektury ze szczeliną 2,5 mm na środku (osadzone 1 mm w korpusie). */
function flaps() {
  const out = [], y = (H - T) / 2 + T / 2 - 0.001;
  for (const s of [-1, 1]) {
    const f = roundedBox(L - 0.004, T, W / 2 - 0.0012 - 0.002, 0.0015, 1);
    place(f, [0, y, s * (W / 4 + 0.0006)], [s * 0.012, 0, 0]);   // klapy lekko uniesione przy szczelinie
    out.push(f);
  }
  // wgniecenie rogu klapy razem z korpusem
  return out;
}

/** Taśma: pas 48 mm przez szczelinę i 70 mm w dół na obu krótszych ścianach. */
function tape() {
  const out = [], w = 0.048, t = 0.0005, y = H / 2 + 0.0026;
  const top = new THREE.BoxGeometry(L + 0.012, t, w); place(top, [0, y, 0]); out.push(top);
  for (const s of [-1, 1]) {
    const side = new THREE.BoxGeometry(t, 0.07, w); place(side, [s * (L / 2 + 0.0063), y - 0.036, 0], [0, 0, 0]); out.push(side);
    // zagięcie na krawędzi
    const bend = new THREE.CylinderGeometry(0.0035, 0.0035, w, 8, 1, false, s > 0 ? 0 : Math.PI, Math.PI / 2);
    place(bend, [s * (L / 2 + 0.0027), y - 0.0031, 0], [Math.PI / 2, 0, 0]); 
  }
  return merge(out);
}

/** Zakładka klejona (łączenie fabryczne) — pasek 35 mm na jednym pionowym narożniku. */
function joint() {
  const g = roundedBox(0.035, H - T - 0.01, 0.0025, 0.001, 1);
  place(g, [-L / 2 + 0.019, 0, W / 2 + 0.0055]);
  return g;
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'box';
  g.add(part('korpus', body(lod), mat('cardboard')));
  g.add(part('klapy', merge(flaps()), mat('cardboardPlain')));
  g.add(part('taśma', tape(), mat('tape')));
  if (!lod) g.add(part('zakładka klejona', joint(), mat('cardboardPlain')));
  g.children.forEach((c) => c.geometry.translate(0, -T / 2, 0));
  return g;
}

export const info = {
  id: 'box', name: 'Karton zamknięty 40×30×30', version: '1.0.0',
  mass: 4.0, material: 'tektura',
  crush: { x: 1.0, y: 1.6, z: 1.0 }, minScale: { x: 0.15, y: 0.12, z: 0.15 },
  collider: { type: 'box', size: [L + 0.01, H, W + 0.01] },
};

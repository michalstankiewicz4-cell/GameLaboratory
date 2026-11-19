// Związany stos gazet (makulatura): ~60 gazet w formacie tabloidu złożonych na pół (42 × 30 cm), w warstwach lekko
// przesuniętych i skręconych, na wierzchu pierwsza strona; obwiązany sznurkiem jutowym na krzyż z supłem na górze.
import * as THREE from '../../../../vendor/three/three.module.js';
import { merge, part, place, roundedBox, rng } from '../geom.js';
import { mat } from '../materials.js';

const L = 0.42, W = 0.30, H = 0.22, N = 30;     // długość, szerokość, wysokość, liczba warstw (po ~2 gazety)

function slabs(lod) {
  const r = rng(42), out = [], n = lod ? 6 : N;
  const t = H / n;
  for (let i = 0; i < n; i++) {
    // warstwa: lekko wybrzuszona na środku (gazety nie leżą płasko), nachodzi 1 mm na sąsiednią
    const g = roundedBox(L - r() * 0.006, t + 0.0010, W - r() * 0.005, Math.min(0.0028, t * 0.4), 2);
    // przesunięcie UV — każda warstwa inna linia kartek
    const uv = g.attributes.uv; const du = r(), dv = r();
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) + du, uv.getY(k) * 0.9 + dv);
    place(g, [(r() - 0.5) * 0.007, -H / 2 + t * (i + 0.5), (r() - 0.5) * 0.006], [0, (r() - 0.5) * 0.018, 0]);
    out.push(g);
  }
  return merge(out);
}

/** Sznurek: zamknięta pętla wokół stosu (płaszczyzna pionowa), narożniki wcinają się w papier. */
function loop(alongX, lod) {
  const a = (alongX ? L : W) / 2 + 0.0075, h = H / 2 + 0.0034, c = 0.014, pts = [];
  // narożniki w kolejności: (+,+) → (+,-) → (-,-) → (-,+)
  const C = [[a, h, 1, 1], [a, -h, 1, -1], [-a, -h, -1, -1], [-a, h, -1, 1]];
  C.forEach(([cx, cy, sx, sy], i) => {
    for (let k = 0; k <= 4; k++) {
      // obrót po łuku od kierunku wchodzącego do wychodzącego
      const ang = ((i + k / 4) * Math.PI / 2);
      pts.push([cx - sx * c + Math.sin(ang) * c * 0.8, cy - sy * c + Math.cos(ang) * c * 0.8]);
    }
  });
  const v = pts.map(([p, q]) => alongX ? new THREE.Vector3(p, q, 0.012) : new THREE.Vector3(-0.015, q, p));
  const curve = new THREE.CatmullRomCurve3(v, true, 'centripetal');
  return new THREE.TubeGeometry(curve, lod ? 48 : 220, 0.0026, lod ? 5 : 8, true);
}

function knot(lod) {
  const parts = [];
  const y = H / 2 + 0.003;
  // supeł: zgrubienie z kilku zwojów
  const k = new THREE.TorusKnotGeometry(0.0062, 0.0026, lod ? 24 : 64, lod ? 5 : 8, 2, 3);
  place(k, [-0.015, y + 0.0035, 0.012], [Math.PI / 2, 0, 0.3], [1, 1, 0.7]);
  parts.push(k);
  // dwa luźne końce z rozczochranymi końcówkami (zakończone kulką — zamknięta bryła)
  for (const [dx, dz, ang] of [[0.05, 0.03, 0.5], [-0.035, 0.055, 2.2]]) {
    const p = [new THREE.Vector3(-0.015, y + 0.004, 0.012), new THREE.Vector3(-0.015 + dx * 0.5, y + 0.006, 0.012 + dz * 0.4), new THREE.Vector3(-0.015 + dx, y + 0.0025, 0.012 + dz)];
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), lod ? 6 : 20, 0.0024, lod ? 5 : 8, false);
    const end = new THREE.SphereGeometry(0.0027, 8, 6); end.translate(p[2].x, p[2].y, p[2].z);
    const beg = new THREE.SphereGeometry(0.0027, 8, 6); beg.translate(p[0].x, p[0].y, p[0].z);
    parts.push(tube, end, beg);
  }
  return merge(parts);
}

/** Pierwsza strona na wierzchu (cienka kartka nad górną warstwą). */
function frontPage() {
  // kartka jako bardzo cienka bryła (0,8 mm) — z każdej strony zamknięta
  const g = new THREE.BoxGeometry(L - 0.012, 0.0008, W - 0.010);
  place(g, [0.002, H / 2 + 0.0011, 0.001], [0, 0.012, 0]);
  return g;
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'newspapers';
  g.add(part('gazety', slabs(lod), mat('newsprint')));
  g.add(part('pierwsza strona', frontPage(), mat('newsTop')));
  g.add(part('sznurek', merge([loop(true, lod), loop(false, lod), knot(lod)]), mat('twine')));
  return g;
}

export const info = {
  id: 'newspapers', name: 'Gazety związane sznurkiem', version: '1.0.1',
  mass: 12.5, material: 'papier',
  // sprasowany papier prawie się nie zgniata; najłatwiej z góry
  crush: { x: 25, y: 60, z: 25 }, minScale: { x: 0.9, y: 0.82, z: 0.9 },
  collider: { type: 'box', size: [L, H + 0.006, W] },
};

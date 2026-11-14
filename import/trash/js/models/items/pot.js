// Garnek ze stali nierdzewnej 6 l (Ø 24 cm, wys. 15 cm), bez pokrywki: ścianka 1 mm z zawiniętym brzegiem,
// dno kapsułowe (warstwowe, grubsze, mniejszej średnicy), dwa uchwyty pałąkowe przynitowane do ścianki
// (płytka, 2 nity z łbami w środku garnka). Otwarty — w środku mieszczą się mniejsze przedmioty.
import * as THREE from '../../../vendor/three/three.module.js';
import { lathe, merge, part, place, roundedBox } from '../geom.js';
import { mat } from '../materials.js';

const RO = 0.1200, T = 0.0011, H = 0.1500;
// profil od środka dna (spód), na zewnątrz, w górę, przez zawinięty brzeg, w dół wnętrzem do środka dna
const PROFILE = [
  [0, 0], [0.098, 0], [0.1035, 0.0006], [0.1050, 0.0025], [0.1052, 0.0058],      // dno kapsułowe (5,8 mm)
  [0.1075, 0.0064], [0.1125, 0.0072], [0.1168, 0.0098], [0.1192, 0.0140], [RO, 0.0200],   // przejście w ściankę
  [RO, H - 0.003], [RO + 0.0012, H - 0.0012], [RO + 0.0020, H + 0.0004], [RO + 0.0013, H + 0.0018], [RO - 0.0004, H + 0.0016], // zawinięty brzeg
  [RO - T, H], [RO - T, 0.0205], [0.1180, 0.0145], [0.1158, 0.0108], [0.1118, 0.0085], [0.1060, 0.0074], [0, 0.0070],
];

function handle(side, lod) {
  const parts = [];
  // pałąk: rura spłaszczona po łuku od płytki na zewnątrz, z prostym chwytem
  const s = side, y = H - 0.032;
  const pts = [[0.0, 0.010], [0.018, 0.012], [0.034, 0.010], [0.044, 0.0], [0.034, -0.010], [0.018, -0.012], [0.0, -0.010]]
    .map(([d, z]) => new THREE.Vector3(s * (RO + 0.004 + d), y + (d > 0.03 ? 0.004 : d * 0.13), z * 3.2));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const tube = new THREE.TubeGeometry(curve, lod ? 10 : 48, 0.0052, lod ? 6 : 14, false);
  // spłaszczenie przekroju w pionie (uchwyt owalny 10,4 × 7 mm)
  tube.translate(0, -y, 0); tube.scale(1, 0.68, 1); tube.translate(0, y, 0);
  parts.push(part('uchwyt — pałąk', tube, mat('stainless')));
  // końcówki rury zaślepione półkulami (rura wchodzi w płytkę)
  // płytki mocujące przy ściance (wygięte do ścianki — tu cienkie zaokrąglone płytki osadzone w ściance)
  for (const z of [-1, 1]) {
    const plate = roundedBox(0.008, 0.030, 0.024, 0.0025);
    place(plate, [s * (RO + 0.0025), y, z * 0.032], [0, 0, 0]);
    parts.push(part('uchwyt — płytka', plate, mat('stainless')));
    // nity: łeb na zewnątrz płytki i w środku garnka
    for (const dy of [-0.007, 0.007]) {
      const out = new THREE.SphereGeometry(0.0028, lod ? 6 : 12, lod ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const inn = new THREE.SphereGeometry(0.0032, lod ? 6 : 12, lod ? 4 : 8, 0, Math.PI * 2, 0, Math.PI / 2);
      if (!lod) {
        const capO = merge([out, new THREE.CircleGeometry(0.0028, 12).rotateX(Math.PI / 2)]);
        place(capO, [s * (RO + 0.0062), y + dy, z * 0.032], [0, 0, -s * Math.PI / 2]);
        parts.push(part('nit', capO, mat('stainless')));
      }
      const capI = merge([inn, new THREE.CircleGeometry(0.0032, 12).rotateX(Math.PI / 2)]);
      place(capI, [s * (RO - T - 0.0003), y + dy, z * 0.032], [0, 0, s * Math.PI / 2]);
      parts.push(part('nit — łeb wewnątrz', capI, mat('stainless')));
    }
  }
  return parts;
}

export function build(lod = 0) {
  const g = new THREE.Group(); g.name = 'pot';
  g.add(part('korpus', lathe(PROFILE, lod ? 32 : 112), mat('stainless')));
  // znak pojemności wytłoczony w środku dna / spód: płytka kapsuły (cieńsza warstwa aluminium widoczna od spodu)
  for (const s of [-1, 1]) handle(s, lod).forEach((p) => g.add(p));
  g.children.forEach((c) => c.geometry.translate(0, -(H + 0.0018) / 2, 0));
  return g;
}

export const info = {
  id: 'pot', name: 'Garnek nierdzewny 6 l', version: '1.0.0',
  mass: 1.6, material: 'stal nierdzewna',
  crush: { x: 3, y: 6, z: 3 }, minScale: { x: 0.3, y: 0.35, z: 0.3 },
  collider: { type: 'cup', r: 0.121, h: 0.1518, wall: 0.006, bottom: 0.008, segs: 14, handles: { x: 0.165, y: 0.0438, w: 0.024, h: 0.012, d: 0.075 } },
};

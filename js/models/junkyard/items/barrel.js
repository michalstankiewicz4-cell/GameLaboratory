// Beczka stalowa 200 l (typ 1A1, zamknięta): Ø 572 mm (rąbki 585 mm), wys. 880 mm, blacha 1 mm. Dwa obręcze
// toczne (przetłoczenia), zwijane rąbki dna i wieka, wieko wpuszczone z dwoma korkami gwintowanymi (2" i 3/4")
// z żeberkami, wgniecenia, łuszcząca się farba z rdzą na krawędziach. Warianty farby: niebieska, czerwona, oliwkowa.
import * as THREE from '../../../../vendor/three/three.module.js';
import { lathe, merge, part, place, rng } from '../geom.js';
import { mat, defineMat, DEFS } from '../materials.js';

const R = 0.2858, HT = 0.880;
export const VARIANTS = [
  { name: 'niebieska', paint: '#1f4f8f' }, { name: 'czerwona', paint: '#9e2a22' }, { name: 'oliwkowa', paint: '#4f5a2c' },
];

function hoop(y) {   // obręcz toczna: przetłoczenie na zewnątrz 11 mm na wysokości ~32 mm
  return [[R, y - 0.020], [R + 0.004, y - 0.012], [R + 0.0105, y - 0.004], [R + 0.011, y], [R + 0.0105, y + 0.004], [R + 0.004, y + 0.012], [R, y + 0.020]];
}
function profile(lod) {
  const bottom = [[0.24, 0.0142], [0.268, 0.0146], [0.2745, 0.0128], [0.2785, 0.0060], [0.2815, 0.0008], [0.2870, 0.0], [0.2915, 0.0035], [0.2928, 0.0090], [0.2912, 0.0145], [0.2880, 0.0185], [R, 0.0235]];
  const top = bottom.map(([r, y]) => [r, HT - y]).reverse();
  const wall = [[R, 0.07], ...hoop(0.293), [R, 0.44], ...hoop(0.587), [R, HT - 0.07]];
  return bottom.concat(wall, top);
}

/** Korek gwintowany: kołnierz w wieku i korek z 8 żeberkami (klucz do beczek). */
function bung(rb, x, z, lod) {
  const y0 = HT - 0.0142, parts = [];
  parts.push(place(lathe([[0, y0 - 0.002], [rb + 0.012, y0 - 0.002], [rb + 0.013, y0 + 0.002], [rb + 0.010, y0 + 0.0045], [0, y0 + 0.0045]], lod ? 12 : 32), [x, 0, z]));
  const cap = lathe([[0, y0 + 0.003], [rb, y0 + 0.003], [rb, y0 + 0.0115], [rb - 0.003, y0 + 0.0135], [0, y0 + 0.0135]], lod ? 12 : 32);
  parts.push(place(cap, [x, 0, z]));
  if (!lod) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, rib = new THREE.BoxGeometry(0.004, 0.006, rb * 0.55);
    place(rib, [x + Math.sin(a) * rb * 0.42, y0 + 0.0155, z + Math.cos(a) * rb * 0.42], [0, a, 0]);
    parts.push(rib);
  }
  return merge(parts);
}

function dent(g, seed) {
  const r = rng(seed), p = g.attributes.position, v = new THREE.Vector3();
  const D = [0, 1].map(() => ({ ph: r() * Math.PI * 2, y: 0.12 + r() * 0.62, rad: 0.07 + r() * 0.06, depth: 0.012 + r() * 0.018 }));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rr = Math.hypot(v.x, v.z); if (rr < R - 0.002) continue;
    const ph = Math.atan2(v.x, v.z);
    let k = 1;
    for (const d of D) {
      let dp = Math.abs(ph - d.ph); dp = Math.min(dp, Math.PI * 2 - dp);
      const dist = Math.hypot(dp * R, v.y - d.y), t = Math.max(0, 1 - dist / d.rad);
      k -= (d.depth / rr) * t * t * (3 - 2 * t);
    }
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.computeVertexNormals();
}

export function build(lod = 0, variant = 0) {
  const g = new THREE.Group(); g.name = 'barrel';
  const prof = profile(lod), body = lathe(prof, lod ? 28 : 128);
  if (!lod) dent(body, 7 + variant * 13);
  const v = VARIANTS[variant % VARIANTS.length];
  // rejony rdzy (v profilu): rąbki i obręcze — tam farba schodzi najpierw
  const arc = body.userData.arc, rustV = [];
  prof.forEach(([r, y], i) => { if (r > R + 0.004) rustV.push(arc[i]); });
  const id = defineMat('drum-' + variant, { ...DEFS.drumPaint, paint: v.paint, rustV, seed: variant + 1 });
  g.add(part('beczka', body, mat(id)));
  const headId = defineMat('drumHead-' + variant, { ...DEFS.drumPaint, paint: v.paint, rustV: [], head: true, seed: variant + 5 });
  // dno i wieko: płaskie krążki z płaskim UV (na bryle obrotowej tekstura zbiegałaby się promieniście w środku)
  for (const [y, up] of [[0.0142, false], [HT - 0.0142, true]]) {
    const disk = new THREE.CircleGeometry(0.2402, lod ? 28 : 128);
    place(disk, [0, y, 0], [up ? -Math.PI / 2 : Math.PI / 2, 0, 0]);
    g.add(part(up ? 'wieko' : 'dno', disk, mat(headId)));
  }
  g.add(part('korek 2"', bung(0.030, 0.0, -0.20, lod), mat('steelDark')));
  g.add(part('korek 3/4"', bung(0.014, 0.0, 0.205, lod), mat('steelDark')));
  g.children.forEach((c) => c.geometry.translate(0, -HT / 2, 0));
  return g;
}

export const info = {
  id: 'barrel', name: 'Beczka stalowa 200 l', version: '1.0.0',
  mass: 18, material: 'stal', variants: VARIANTS.length,
  crush: { x: 12, y: 45, z: 12 }, minScale: { x: 0.25, y: 0.2, z: 0.25 },
  collider: { type: 'cyl', r: 0.292, h: HT, segs: 18 },
};

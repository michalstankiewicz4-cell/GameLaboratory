// Wygląd budynku z części przed zniszczeniem (HouseKit, budynki Warszawy z części): części jednego materiału scalone
// w jedną siatkę (extrude.js — ta sama bryła co w świecie zniszczeń DestructKit, materiały z materials.js), barwa budynku
// mnoży kolory (szkło bez barwy). Prefabrykaty sceny (js/scene/prefabs-houses.js).
//   houseModel(house) → THREE.Group
import * as THREE from '../../../vendor/three/three.module.js';
import { extrude } from './extrude.js';
import { MATS, tileOf, renderMaterial } from './materials.js';

const ONE = new THREE.Vector3(1, 1, 1);

// części jednego materiału scalone w jedną siatkę (położenie części i przesunięcie do środka wielokąta jak w świecie)
export function houseModel(house) {
  const root = new THREE.Group(), byMat = new Map(), tint = house.tint ? new THREE.Color(house.tint) : null;
  for (const sp of house.parts) {
    const g = extrude(sp.poly, { t: sp.t, orig: sp.poly, tile: tileOf(sp.mat), frac: MATS[sp.mat].frac }), c = g.userData.c;
    const M = new THREE.Matrix4().compose(new THREE.Vector3(...sp.pos), new THREE.Quaternion(...sp.quat), ONE).multiply(new THREE.Matrix4().makeTranslation(c[0], c[1], 0));
    g.applyMatrix4(M);
    if (!byMat.has(sp.mat)) byMat.set(sp.mat, []);
    byMat.get(sp.mat).push(g);
  }
  for (const [mat, gs] of byMat) {
    const geo = merge(gs, MATS[mat].glass ? null : tint); gs.forEach((g) => g.dispose());
    const m = new THREE.Mesh(geo, renderMaterial(mat)); m.name = mat;
    m.castShadow = !MATS[mat].glass; m.receiveShadow = true; root.add(m);
  }
  return root;
}
// scalenie siatek z extrude (te same atrybuty: position, normal, uv, color, indeks); barwa budynku mnoży kolory
function merge(gs, tint) {
  const names = ['position', 'normal', 'uv', 'color'], out = {}, idx = [];
  for (const n of names) out[n] = [];
  let base = 0;
  for (const g of gs) {
    for (const n of names) { const a = g.attributes[n]; if (a) out[n].push(...a.array); }
    const I = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    for (const i of I) idx.push(i + base);
    base += g.attributes.position.count;
  }
  if (tint) for (let i = 0; i < out.color.length; i += 3) { out.color[i] *= tint.r; out.color[i + 1] *= tint.g; out.color[i + 2] *= tint.b; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.normal, 3));
  if (out.uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  if (out.color.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(out.color, 3));
  geo.setIndex(idx); geo.computeBoundingSphere();
  return geo;
}

// Zniszczenie w scenie (zachowanie „destruct”, środowisko ląd): budynki z części (rodzina houses — HouseKit i budynki
// Warszawy z części) w jednym świecie DestructKit na scenę (js/behaviors/land/destruct/world.js). Silnik, wspólny dla
// edytora (▶ Graj) i gier. Trąba powietrzna / tornado z pogody sceny (stage.tornado, stage.windAt) niszczy części
// w promieniu 3 rdzeni, a lekkie odłamki unosi; część bez podparcia spada. Do pierwszego uszkodzenia widać model
// prefabrykatu (houseModel albo budynek CityKit), potem części świata (onReveal chowa model).
//   houseModel(house) → THREE.Group      wygląd budynku z części przed zniszczeniem: jedna siatka na materiał
//   createSceneDestruct({ scene, groundAt, windAt, tornado }) → { addHouse(house, built, { x, z, rot }), hud(bld), frame(dt), stop() }
//   destructBehavior                       wpis zachowania dla js/scene/behaviors.js (BEHAVIORS.destruct)
// Opis: docs/scene/README.md („Zniszczenie w scenie”).
import * as THREE from '../../vendor/three/three.module.js';
import { createWorld } from '../behaviors/land/destruct/world.js';
import { extrude } from '../behaviors/land/destruct/extrude.js';
import { MATS, tileOf, renderMaterial } from '../behaviors/land/destruct/materials.js';

const D2R = Math.PI / 180, ONE = new THREE.Vector3(1, 1, 1);

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

export function createSceneDestruct({ scene, groundAt, windAt, tornado }) {
  const world = createWorld(scene, { ground: (x, z) => { const h = groundAt(x, z); return h == null ? 0 : h; }, wind: (x, y, z, out) => windAt(x, y, z, out) });
  const shown = new Map();   // budynek świata → model prefabrykatu (chowany przy odsłonięciu)
  world.onReveal((bld) => { const b = shown.get(bld); if (b) b.root.visible = false; });
  return {
    world,
    addHouse(house, built, { x = 0, z = 0, rot = 0 } = {}) { const bld = world.addHouse(house, { x, z, rot, hidden: true }); shown.set(bld, built); return bld; },
    // linia stanu: ile części stoi i ile budynku zniszczono
    hud(bld) {
      const intact = bld.parts.filter((p) => p.state === 'intact').length;
      return [['parts', `${intact}/${bld.parts.length}`], ['destroyed', `${Math.round(100 * (bld.vol0 ? bld.volGone / bld.vol0 : 0))}%`]];
    },
    frame(dt) {
      const T = tornado();
      world.tornadoDamage(T, windAt, dt);   // DestructKit: części w promieniu 3 rdzeni, gruz się budzi
      if (dt > 0) world.update(dt);
    },
    stop() { world.dispose(); for (const b of shown.values()) b.root.visible = true; shown.clear(); },
  };
}

export const destructBehavior = {
  label: 'Destruction (breaks as it is built)', labelPl: 'Zniszczenie (pęka tak, jak jest zbudowany)', env: 'land', throttle: [0, 0], lodFree: true,
  fits: (prefabId) => prefabId.startsWith('houses/'),
  keys: 'the tornado from the scene\'s weather breaks it', keysPl: 'niszczy go tornado z pogody sceny',
  // world.destruct — wspólny świat zniszczeń sceny (createSceneDestruct; tworzy go gra przy pierwszym budynku)
  create(obj, built, world) {
    const k = built.kit || {}, D = world.destruct; if (!k.house || !D) return null;
    const bld = D.addHouse(k.house, built, { x: obj.pos[0], z: obj.pos[2], rot: ((obj.rot && obj.rot[1]) || 0) * D2R });
    return { state: {}, step() {}, hud: () => ({ speed: 0, unit: '', throttle: 0, machine: D.hud(bld) }), reset() {} };
  },
};

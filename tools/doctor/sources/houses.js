// Model doctor — budynki z części HouseKit (js/models/houses/housekit.js, z Tornado.io): każda część jako osobna siatka,
// tak jak w DestructKit przed zniszczeniem (js/behaviors/land/destruct/: extrude z materiału części). Stoją na ziemi
// (opts.ground 0 — nikt ich nie ogląda spod gruntu); planeEps 1 cm. Budynki Warszawy z części (landmark-house.js) —
// nie tu: mają tysiące części.
import * as THREE from '../../../vendor/three/three.module.js';
import { countDraw } from './common.js';
import { HOUSE_IDS, HOUSE_TYPES, buildHouse } from '../../../js/models/houses/housekit.js';
import { extrude } from '../../../js/behaviors/land/destruct/extrude.js';
import { MATS, tileOf } from '../../../js/behaviors/land/destruct/materials.js';

const matCache = {};
const houseMat = (m) => (matCache[m] ||= new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((Object.keys(MATS).indexOf(m) * 0.137) % 1, 0.4, 0.55), name: m }));

export const models = HOUSE_IDS.map((id) => ({
  id: 'houses/' + id, label: HOUSE_TYPES[id].name, sub: 'land · HouseKit', family: 'houses',
  build: () => {
    const h = buildHouse(id), root = new THREE.Group(); root.name = id;
    h.parts.forEach((sp, i) => {
      const g = extrude(sp.poly, { t: sp.t, orig: sp.poly, tile: tileOf(sp.mat), frac: MATS[sp.mat].frac }), c = g.userData.c;
      const m = new THREE.Mesh(g, houseMat(sp.mat)); m.name = (sp.name || sp.mat) + ' #' + i;
      m.matrixAutoUpdate = false;
      m.matrix.compose(new THREE.Vector3(...sp.pos), new THREE.Quaternion(...sp.quat), new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(c[0], c[1], 0));
      root.add(m);
    });
    root.updateMatrixWorld(true);
    return { root, measured: countDraw(root), opts: { planeEps: 0.01, ground: 0 } };
  },
}));

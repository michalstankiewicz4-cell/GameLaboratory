// Model doctor — skały (RockKit, js/models/rocks/rockkit.js): każdy rodzaj skały w każdym kształcie (ziarno 1, wielkość
// domyślna, pełny szczegół) jako jedna siatka z materiałem rodzaju (trójpłaszczyznowym).
import * as THREE from '../../../vendor/three/three.module.js';
import { countDraw } from './common.js';
import { ROCK_KINDS, ROCK_SHAPES, rockGeometry, rockMaterial } from '../../../js/models/rocks/rockkit.js';

export const models = Object.keys(ROCK_KINDS).flatMap((kind) => Object.keys(ROCK_SHAPES).map((shape) => ({
  id: `rocks/${kind}-${shape}`, label: `${ROCK_KINDS[kind].name} ${ROCK_SHAPES[shape].name.toLowerCase()}`, sub: 'land · RockKit', family: 'rocks',
  build: () => {
    const root = new THREE.Group(); root.name = `${kind} ${shape}`;
    const m = new THREE.Mesh(rockGeometry({ kind, shape, seed: 1 }), rockMaterial(kind)); m.name = 'rock'; root.add(m);
    return { root, measured: countDraw(root), opts: {} };
  },
})));

// Model doctor — rośliny (PlantKit, js/models/plants/plantkit.js): każdy gatunek (ziarno 1, pełny szczegół) jako dwie
// części — kora (pień i gałęzie, jednostronna) i liście (karty dwustronne); bez scalania z innymi.
import * as THREE from '../../../vendor/three/three.module.js';
import { countDraw } from './common.js';
import { SPECIES, SPECIES_IDS, growPlant, plantMaterials, windUniforms } from '../../../js/models/plants/plantkit.js';

export const models = SPECIES_IDS.map((id) => ({
  id: 'plants/' + id, label: SPECIES[id].name, sub: 'land · PlantKit', family: 'plants',
  build: () => {
    const p = growPlant(id, { seed: 1, size: 1, detail: 1 }), mats = plantMaterials(id, windUniforms());
    const root = new THREE.Group(); root.name = SPECIES[id].name;
    if (p.bark) { const m = new THREE.Mesh(p.bark, mats.bark); m.name = 'bark'; root.add(m); }
    if (p.leaf) { const m = new THREE.Mesh(p.leaf, mats.leaf); m.name = 'leaves'; root.add(m); }
    return { root, measured: countDraw(root), opts: {} };
  },
}));

// Scena: skład z TrainKit na torze, na płaskim gruncie. TrainKit używa window.THREE — strona importuje najpierw
// js/core/three-window.js (r186 bez łatek wyglądu r128).
import * as THREE from '../../../../vendor/three/three.module.js';
import { buildTrain, DEFAULT_TRAIN } from '../../../models/train/trainkit.js';
import { buildTrack } from '../../../models/structures/railway/track.js';
import { trainMaterials } from '../../../models/train/materials.js';

export const trainScene = {
  id: 'land/train', label: 'Train on a track', surface: 'land',
  build(stage) {
    const root = new THREE.Group(), track = buildTrack({ length: 75, railLength: 25 }); track.position.x = -60; root.add(track);
    const train = buildTrain(DEFAULT_TRAIN); root.add(train);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    stage.ground.material = trainMaterials().ground; stage.setSurface('land', -0.45);
    return { root, size: 34, target: new THREE.Vector3(-train.userData.length / 2, 1.8, 0) };
  },
};

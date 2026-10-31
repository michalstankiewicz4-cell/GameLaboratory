// Scena: platforma wiertnicza Super 300 (StructKit) na nogach, na morzu.
import * as THREE from '../../../../vendor/three/three.module.js';
import { buildStructure, structureInfo } from '../../../models/structures/index.js';

export const rigScene = {
  id: 'sea/super300', label: 'Jack-up rig ' + (structureInfo('super300').name || 'Super 300'), surface: 'sea',
  build() {
    const st = buildStructure('super300', { detail: 1 }), root = new THREE.Group(); root.add(st.group);
    root.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } });
    const box = new THREE.Box3().setFromObject(st.hull), size = box.getSize(new THREE.Vector3()).length() * 1.4;
    return { root, size, target: box.getCenter(new THREE.Vector3()) };
  },
};

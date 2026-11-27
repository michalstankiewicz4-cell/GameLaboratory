// Układ silnika — zestaw z części MechKit i ControlKit (z laboratorium mechaniki, z Tornado.io): maszyna na żeliwnym łożu
// z elementów połączonych portami (machine.js) i instalacja elektryczna z regulatorem (installation.js). Model nie liczy
// ruchu: kąty daje napęd (drive.js — tryb Maszyna laboratorium) albo fizyka układu (js/behaviors/land/mech/engine-layout.js
// — tryb Fizyka i scena). Oglądany w laboratorium mechaniki; w scenie prefabrykat mech/machine (js/scene/mechanics.js).
//   buildEngineLayout({ hall }) → { group, mc, reg, elecG, ELEC }   hall — posadzka i lampy hali (laboratorium)
import * as THREE from '../../../../../vendor/three/three.module.js';
import * as MK from '../../mechkit.js';
import { buildMachine } from './machine.js';
import { buildInstallation } from './installation.js';

export function buildEngineLayout({ hall = false } = {}) {
  const group = new THREE.Group(), root = new THREE.Group(); group.add(root);
  const M = MK.materials();
  const mc = buildMachine({ scene: group, root, M, hall });
  const { reg, elecG, ELEC } = buildInstallation({ scene: group, mc, M });
  reg.group.visible = true; elecG.visible = true;
  mc.applyAngles();
  return { group, mc, reg, elecG, ELEC };
}

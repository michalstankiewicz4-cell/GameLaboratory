// OptiKit — wspólne: słupek Ø 12,7 mm w tulei Ø 19 z podstawą (wycięcie pod śrubę M6), jak przy lustrze; materiały optyczne
// (szkło z załamaniem, czernione aluminium, nierdzewka). Oś optyczna elementów: +z (światło biegnie w +z), na wysokości AXIS_Y.
import * as THREE from '../../../../vendor/three/three.module.js';
import { materials } from '../mechkit.js';
import { mesh } from '../common.js';

export const AXIS_Y = 0.121;   // jak oś lustra 1" w uchwycie kinematycznym (wspólna wysokość wiązki na stole)
let OM = null;
export function opticMaterials() {
  if (OM) return OM;
  const M = materials();
  OM = { ...M,
    glass: (color = 0xf4fbff, ior = 1.517) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.01, metalness: 0, transmission: 1, thickness: 0.004, ior, transparent: true, specularIntensity: 1, envMapIntensity: 1.3 }),
    anod: new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.42, metalness: 0.55, clearcoat: 0.2 }),   // aluminium anodowane na czarno
    steelP: new THREE.MeshPhysicalMaterial({ color: 0xd9dde0, metalness: 1, roughness: 0.12 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.85 }),
  };
  return OM;
}
// słupek z tuleją i podstawą; head — grupa elementu (jej środek ustawiony na wysokości osi); spód podstawy w y = 0
export function postMount(head, { yc = AXIS_Y, headDrop = 0.019 } = {}) {
  const M = opticMaterials(), g = new THREE.Group(); head.position.y = yc; g.add(head);
  const top = yc - headDrop, postL = top - 0.01 - 0.044, post = mesh(new THREE.CylinderGeometry(0.00635, 0.00635, postL + 0.006, 24), M.steelP); post.position.y = 0.01 + 0.044 + postL / 2 - 0.003; g.add(post);
  const holder = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.044, 32), M.anod); holder.position.y = 0.01 + 0.022; g.add(holder);
  const thumb = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12).rotateZ(Math.PI / 2), M.anod); thumb.position.set(0.013, 0.04, 0); g.add(thumb);
  const bs = new THREE.Shape(); bs.moveTo(-0.0125, -0.0375); bs.lineTo(0.0125, -0.0375); bs.lineTo(0.0125, 0.0375); bs.lineTo(-0.0125, 0.0375); bs.closePath();
  const slot = new THREE.Path(); slot.moveTo(-0.0033, -0.03); slot.lineTo(-0.0033, -0.012); slot.absarc(0, -0.012, 0.0033, Math.PI, 0, true); slot.lineTo(0.0033, -0.03); slot.absarc(0, -0.03, 0.0033, 0, Math.PI, true); bs.holes.push(slot);
  const base = mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.01, bevelEnabled: false }).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), M.anod); g.add(base);
  return g;
}
// opis powierzchni w świecie dla śledzenia promieni (js/behaviors/land/mech/raytrace.js — fromDesc)
export const toWorld = (obj, v) => v.clone().applyMatrix4(obj.matrixWorld);
export const dirWorld = (obj, v) => v.clone().transformDirection(obj.matrixWorld).normalize();

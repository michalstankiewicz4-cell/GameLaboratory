// DeformKit — prostopadłościany zderzeń powłoki (prasa ruchoma, podpory i ściany nieruchome) i zderzacze kroku jako
// same liczby (idą też do wątku shell-worker.js).
//   makeBox(half, matrix, friction) → box: { half, friction, plastic, matrix, inv, prevInv, aabb, set(matrix), data() }
//     plastic: true — docisk tym prostopadłościanem włącza plastyczność (prasa); set(m) co klatkę (poprzednie położenie
//     zostaje w prevInv — z niego tarcie przesuwającej się prasy)
//   colliders(C) → { ground, boxes: [box.data()], others, yield, pin } — z opcji kroku shell.step(dt, C)
import * as THREE from '../../../../vendor/three/three.module.js';

export function makeBox(half, matrix = new THREE.Matrix4(), friction = 0.6) {
  const b = { half, friction, plastic: false, matrix: matrix.clone(), inv: matrix.clone().invert(), prevInv: matrix.clone().invert(), aabb: new THREE.Box3() };
  const upd = () => { b.aabb.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(half[0] * 2, half[1] * 2, half[2] * 2)).applyMatrix4(b.matrix); };
  b.set = (m) => { b.prevInv.copy(b.inv); b.matrix.copy(m); b.inv.copy(m).invert(); upd(); };
  // dane dla rdzenia (same liczby — idą też do wątku)
  b.data = () => ({ half: b.half, m: b.matrix.elements, inv: b.inv.elements, prevInv: b.prevInv.elements, aabb: [...b.aabb.min.toArray(), ...b.aabb.max.toArray()], friction: b.friction, plastic: b.plastic });
  upd();
  return b;
}
export const colliders = (C) => ({ ground: C.ground ?? null, boxes: (C.boxes || []).map((b) => b.data()), others: C.others || null, yield: !!C.yield, pin: C.pin || null });

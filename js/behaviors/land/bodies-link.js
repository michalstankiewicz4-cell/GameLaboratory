// Połączenie światów brył na lądzie (środowisko ląd): odłamki budynków (DestructKit, js/behaviors/land/destruct/)
// i luźne przedmioty (land/items.js — beczki, opony, puszki) zderzają się ze sobą. Każdy świat liczy swoje bryły jak
// dotąd (wyniki laboratoriów bez zmian); łącznik wstawia odłamki bliskie przedmiotom do świata przedmiotów jako bryły
// ruchome (OBB z prędkością — prostopadłościan z narożników odłamka) i oddaje odłamkom odrzut, który dały przedmiotom
// (impuls i moment z każdego kroku 1/240 s świata przedmiotów).
//   linkBodies(items, destruct, { near }) → { frame(), unlink() }
//     items — świat przedmiotów (createItems), destruct — świat zniszczeń (createWorld); near — odległość [m], z której
//     odłamek zaczyna się liczyć dla przedmiotów (domyślnie 3 m od brzegu przedmiotu)
//     frame() — raz na klatkę, po kroku świata zniszczeń: lista odłamków dla następnego kroku przedmiotów
// Opis: docs/behaviors/README.md.
import * as THREE from '../../../vendor/three/three.module.js';

export const ENVIRONMENTS = ['land'];

export function linkBodies(W, D, { near = 3 } = {}) {
  const obbs = new Map();   // odłamek → jego OBB w świecie przedmiotów (J, T — odrzut z ostatniego kroku)
  let current = [], unKin = () => {};
  // odrzut z poprzedniego kroku 1/240 s → prędkość i obrót odłamka (zanim świat przedmiotów go wyzeruje)
  const unHook = W.hook(() => {
    for (const [b, o] of obbs) {
      if (!o.J.lengthSq() && !o.T.lengthSq()) continue;
      b.v.addScaledVector(o.J, 1 / b.m); b.w.addScaledVector(o.T, 1 / b.I);
      if (b.state === 'sleep') D.wake(b);
    }
  });
  const halfOf = (b) => {   // półwymiary i środek prostopadłościanu z narożników (w układzie bryły), raz na odłamek
    if (b._obb) return b._obb;
    const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = lo.clone().negate();
    for (const p of b.pts) { lo.min(p); hi.max(p); }
    return (b._obb = { e: hi.clone().sub(lo).multiplyScalar(0.5).toArray(), mid: hi.clone().add(lo).multiplyScalar(0.5) });
  };
  return {
    frame() {
      unKin();
      const its = W.list.filter((it) => !it.held);
      const next = [];
      if (its.length) for (const b of D.bodies) {
        if (b.state === 'held' || b.state === 'static' || !b.pts) continue;
        const reach = (b.r || 0.5) + near;
        if (!its.some((it) => Math.abs(it.p.x - b.p.x) < reach + it.half[0] + it.half[2] && Math.abs(it.p.z - b.p.z) < reach + it.half[0] + it.half[2] && Math.abs(it.p.y - b.p.y) < reach + it.half[1])) continue;
        const h = halfOf(b);
        let o = obbs.get(b);
        if (!o) { o = { c: new THREE.Vector3(), ax: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e: h.e, v: new THREE.Vector3(), J: new THREE.Vector3(), T: new THREE.Vector3() }; obbs.set(b, o); }
        o.ax[0].set(1, 0, 0).applyQuaternion(b.q); o.ax[1].set(0, 1, 0).applyQuaternion(b.q); o.ax[2].set(0, 0, 1).applyQuaternion(b.q);
        o.c.copy(h.mid).applyQuaternion(b.q).add(b.p); o.v.copy(b.v);
        next.push(o);
      }
      for (const b of [...obbs.keys()]) if (!D.bodies.has(b) || !next.includes(obbs.get(b))) obbs.delete(b);   // poza zasięgiem albo zniknął
      current = next; unKin = current.length ? W.addKinematic(current) : () => {};
      return current.length;
    },
    unlink() { unKin(); unHook(); obbs.clear(); },
  };
}

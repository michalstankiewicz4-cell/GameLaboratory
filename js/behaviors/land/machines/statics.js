// Zderzacze nieruchome modeli złomowiska (colliders() modeli JunkKit — jak zderzacze statyczne w grze) jako
// prostopadłościany świata przedmiotów (land/items.js). Rodzaje z gry: box (półwymiary, środek, obrót), cyl (walec —
// prostopadłościan opisany), hull (bryła wypukła — prostopadłościan wokół jej punktów, obrócony wokół pionu w stronę
// środka bryły: wycinek ścianki tygla zostaje wycinkiem, nie wchodzi do wnętrza).
import * as THREE from '../../../../vendor/three/three.module.js';
import { obbFrom } from '../items.js';

/** Opis zderzaczy → [{ at, half, rot }] w układzie modelu. */
export function colliderBoxes(colliders) {
  const out = [];
  for (const c of colliders) {
    if (c.kind === 'box') out.push({ at: c.at, half: c.half, rot: c.rot || null });
    else if (c.kind === 'cyl') out.push({ at: c.at, half: [c.r, c.h / 2, c.r], rot: null });
    else if (c.kind === 'hull') {
      const p = c.points, n = p.length / 3;
      let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p[i * 3]; cz += p[i * 3 + 2]; }
      cx /= n; cz /= n;
      const a = Math.atan2(cx, cz), ca = Math.cos(a), sa = Math.sin(a);   // obrót wokół y: lokalne z w stronę środka bryły
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < n; i++) {
        const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], l = [x * ca - z * sa, y, x * sa + z * ca];
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], l[k]); hi[k] = Math.max(hi[k], l[k]); }
      }
      const m = lo.map((v, k) => (v + hi[k]) / 2), half = lo.map((v, k) => (hi[k] - v) / 2);
      const at = new THREE.Vector3(...m).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).toArray();
      out.push({ at, half, rot: [0, a, 0] });
    }
  }
  return out;
}

/** Zderzacze modelu (jego colliders()) w świecie W jako bryły nieruchome; zwraca odpięcie. */
export function addModelStatics(W, colliders, root) {
  root.updateMatrixWorld(true);
  const boxes = colliderBoxes(colliders).map((b) => obbFrom(root.matrixWorld, b.at, b.half, b.rot));
  return W.addStatics(boxes);
}

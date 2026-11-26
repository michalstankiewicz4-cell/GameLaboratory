// Streets Lab — the ground under the samples: the lab stage's flat ground (js/labs/shared/stage.js), a ground with holes
// above the ramps and stairwells (the underpass and the subway), and the hill of the tunnel sample with the approaches in
// a cutting (slopes 1 : 0.8). From Tornado.io's streets lab.
//   createGround(scene, stageGround) → { holes(rects | null) }   rects: [[x0, x1, z0, z1]]
//   hill(x, z) → height of the tunnel sample's hill (m); hillTerrain(Px, c) → Group (the hill, cut down to the road
//   beyond the portals at ±Px; c — the cutting's half width)
import * as THREE from '../../../vendor/three/three.module.js';
import { surface } from '../../models/streets/streetkit.js';

const R = 3000;
export function createGround(scene, stageGround) {
  let holed = null;
  return {
    holes(rects) {
      if (holed) { scene.remove(holed); holed.geometry.dispose(); holed = null; }
      stageGround.visible = !rects; if (!rects) return;
      const sh = new THREE.Shape(); sh.absarc(0, 0, R, 0, Math.PI * 2, false);
      // rectangles [x0, x1, z0, z1]; the shape lies in (x, −z) before the turn
      for (const [x0, x1, z0, z1] of rects) sh.holes.push(new THREE.Path([new THREE.Vector2(x0, -z1), new THREE.Vector2(x1, -z1), new THREE.Vector2(x1, -z0), new THREE.Vector2(x0, -z0)]));
      const geo = new THREE.ShapeGeometry(sh, 64).rotateX(-Math.PI / 2);
      holed = new THREE.Mesh(geo, stageGround.material); holed.receiveShadow = true; holed.position.y = stageGround.position.y; scene.add(holed);
    },
  };
}

// the hill: a ridge across the road
export function hill(x, z) {
  const r = Math.exp(-((x / 46) ** 2)) * Math.exp(-((z / 80) ** 4)), n = 1 + 0.05 * Math.sin(x * 0.11 + z * 0.07) + 0.03 * Math.sin(z * 0.17 - x * 0.05);
  return 34 * r * n - 0.4;
}
export function hillTerrain(Px, c) {
  const g = new THREE.Group(), mat = surface('sod');
  const part = (x0, x1, cut) => {
    const nx = Math.max(2, Math.round((x1 - x0) / 1)), nz = 200, P = [], U = [], I = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const x = x0 + (x1 - x0) * i / nx, z = -100 + 200 * j / nz;
      let y = hill(x, z); if (cut) y = Math.min(y, Math.abs(z) < c ? -0.08 : (Math.abs(z) - c) * 1.25 - 0.08);
      P.push(x, Math.max(-0.08, y), z); U.push(x / 3, z / 3);
      if (i && j) { const a = (i - 1) * (nz + 1) + j - 1, b = i * (nz + 1) + j - 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = m.castShadow = true; g.add(m);
  };
  part(-Px, Px, false); part(-110, -Px, true); part(Px, 110, true);
  return g;
}

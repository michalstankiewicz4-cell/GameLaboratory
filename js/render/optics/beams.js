// Wiązki światła (warstwa obrazu): odcinki promieni jako cienkie świecące walce (instancje, kolor z długości fali,
// jasność z natężenia, mieszanie addytywne), plamki na ekranach i fotodiodach oraz jasne punkty w miejscu wyjścia z lasera.
//   const b = createBeams({ max }) ; root.add(b.group) ; b.set(segs, spots)   (segs/spots z raytrace.simulate)
import * as THREE from '../../../vendor/three/three.module.js';
import { waveColor } from '../../behaviors/land/mech/optics.js';

export function createBeams({ max = 900, spotsMax = 200, r = 0.0004 } = {}) {
  const group = new THREE.Group(); group.userData.doctorOk = 'clash';
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const lines = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), mat, max); lines.frustumCulled = false; lines.count = 0; lines.userData.doctorOk = 'clash'; group.add(lines);
  const halo = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), max); halo.frustumCulled = false; halo.count = 0; group.add(halo);
  const spotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const spots = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }), spotsMax); spots.frustumCulled = false; spots.count = 0; group.add(spots);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), sc = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3(), c = new THREE.Color();
  function set(segs, sp = []) {
    let n = 0;
    for (const s of segs) {
      if (n >= max) break; const L = s.a.distanceTo(s.b); if (L < 1e-5 || s.I < 0.002) continue;
      dir.subVectors(s.b, s.a).divideScalar(L); q.setFromUnitVectors(Y, dir); mid.addVectors(s.a, s.b).multiplyScalar(0.5);
      const ir = s.nm > 750 || s.nm < 380, k = Math.min(1, s.I) * (ir ? 0.25 : 1);
      c.copy(waveColor(s.nm)).multiplyScalar(k);
      m4.compose(mid, q, sc.set(r, L, r)); lines.setMatrixAt(n, m4); lines.setColorAt(n, c);
      m4.compose(mid, q, sc.set(r * 4, L, r * 4)); halo.setMatrixAt(n, m4); halo.setColorAt(n, c);
      n++;
    }
    lines.count = halo.count = n; lines.instanceMatrix.needsUpdate = halo.instanceMatrix.needsUpdate = true; if (lines.instanceColor) { lines.instanceColor.needsUpdate = true; halo.instanceColor.needsUpdate = true; }
    let k = 0;
    for (const s of sp) {
      if (k >= spotsMax) break; const nrm = s.d.clone().negate(); q.setFromUnitVectors(Z, nrm);
      c.copy(waveColor(s.nm)).multiplyScalar(Math.min(1, s.I * 6)); m4.compose(s.p.clone().addScaledVector(nrm, 0.0004), q, sc.set(0.004, 0.004, 1)); spots.setMatrixAt(k, m4); spots.setColorAt(k, c); k++;
    }
    spots.count = k; spots.instanceMatrix.needsUpdate = true; if (spots.instanceColor) spots.instanceColor.needsUpdate = true;
  }
  return { group, set };
}

// Items Lab — deformation: grabbing a barrel with the mouse. A click on a barrel sticks it to the pointer at the hit
// point (the shell's particles within 8 cm are pulled to the target — DeformKit `pin`); the pointer leads that point
// over a vertical plane facing the camera (up lifts it); the next click lets go.
//   createGrab(camera, canvas) → { current, pick(event, rigs) → grab | null, aim(event), release(), pin(rig) }
import * as THREE from '../../../../vendor/three/three.module.js';

export function createGrab(camera, cv) {
  let grab = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hitP = new THREE.Vector3();
  function pointer(e) { const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function pick(e, rigs) {
    pointer(e);
    const hits = ray.intersectObjects(rigs.map((r) => r.model), true);
    if (!hits.length) return null;
    const p = hits[0].point, rig = rigs.find((r) => { let o = hits[0].object; while (o && o !== r.model) o = o.parent; return !!o; });
    if (!rig) return null;
    const X = rig.shell.particles, ids = [], off = [];
    let best = -1, bd = Infinity;
    for (let i = 0; i < X.length / 3; i++) {
      const d = Math.hypot(X[i * 3] - p.x, X[i * 3 + 1] - p.y, X[i * 3 + 2] - p.z);
      if (d < bd) { bd = d; best = i; }
      if (d < 0.08) { ids.push(i); off.push(X[i * 3] - p.x, X[i * 3 + 1] - p.y, X[i * 3 + 2] - p.z); }
    }
    if (!ids.length) { ids.push(best); off.push(X[best * 3] - p.x, X[best * 3 + 1] - p.y, X[best * 3 + 2] - p.z); }
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(camera.position.x - p.x, 0, camera.position.z - p.z).normalize(), p);
    grab = { rig, ids, off, target: [p.x, p.y, p.z] };
    rig.shell.wake(); cv.classList.add('grabbing');
    return grab;
  }
  function aim(e) {
    if (!grab) return;
    pointer(e);
    if (!ray.ray.intersectPlane(plane, hitP)) return;
    grab.target[0] = hitP.x; grab.target[1] = Math.max(grab.rig.ground + 0.02, Math.min(3, hitP.y)); grab.target[2] = hitP.z;
  }
  return {
    get current() { return grab; },
    pick, aim,
    release() { grab = null; cv.classList.remove('grabbing'); },
    // the step's pin for this rig (or null)
    pin(rig) { return grab && grab.rig === rig ? { ids: grab.ids, off: grab.off, target: grab.target, k: 0.5 } : null; },
  };
}

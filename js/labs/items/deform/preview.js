// Items Lab — deformation: the colliders, drawn through everything: the collision boxes (press red, supports and walls
// yellow), each barrel's physics mesh with its particles (a dot = the contact diameter), the barrels' bounding boxes
// (purple — neighbours for collisions are picked by them) and the grabbed particles (green).
//   createPreview(scene) → { build(set, on), sync(grab) }   set: { rigs, presses }
import * as THREE from '../../../../vendor/three/three.module.js';

export function createPreview(scene) {
  const dbg = new THREE.Group(); dbg.renderOrder = 10; scene.add(dbg);
  const dmat = (color, o = {}) => Object.assign(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false }), o);
  const M_PRESS = dmat(0xff5a4a), M_BOX = dmat(0xffc14a), M_SIM = new THREE.MeshBasicMaterial({ color: 0x4ad2ff, wireframe: true, transparent: true, opacity: 0.35, depthTest: false });
  const M_AABB = dmat(0xb48cff, { opacity: 0.6 }), M_PIN = new THREE.PointsMaterial({ color: 0x5aff7a, size: 0.05, depthTest: false });
  let items = [];
  function build(set, on) {
    for (const o of dbg.children) { if (o.geometry) o.geometry.dispose(); if (o.isPoints && o.material !== M_PIN) o.material.dispose(); }
    dbg.clear(); items = [];
    dbg.visible = on;
    if (!on || !set) return;
    const boxLines = (b, mat) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.half[0] * 2, b.half[1] * 2, b.half[2] * 2)), mat); l.matrixAutoUpdate = false; l.renderOrder = 10; dbg.add(l); items.push({ kind: 'box', b, l }); };
    for (const P of set.presses) boxLines(P.box, M_PRESS);
    const seen = new Set();
    for (const r of set.rigs) for (const b of r.supports) if (!seen.has(b)) { seen.add(b); boxLines(b, M_BOX); }
    for (const r of set.rigs) {
      const g = new THREE.BufferGeometry(), pos = new THREE.BufferAttribute(r.shell.particles, 3);
      g.setAttribute('position', pos); g.setIndex(new THREE.BufferAttribute(Uint32Array.from(r.shell.triangles), 1));
      const mesh = new THREE.Mesh(g, M_SIM); mesh.frustumCulled = false; mesh.renderOrder = 10;
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x4ad2ff, size: r.shell.radius * 2, transparent: true, opacity: 0.7, depthTest: false })); pts.frustumCulled = false; pts.renderOrder = 10;
      const aabb = new THREE.Box3Helper(new THREE.Box3(), 0xb48cff); aabb.material = M_AABB; aabb.renderOrder = 10;
      dbg.add(mesh, pts, aabb); items.push({ kind: 'rig', r, pos, aabb });
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 256), 3)); pg.setDrawRange(0, 0);
    const pin = new THREE.Points(pg, M_PIN); pin.frustumCulled = false; pin.renderOrder = 11; dbg.add(pin); items.push({ kind: 'pin', pin });
  }
  function sync(grab) {
    if (!dbg.visible) return;
    for (const it of items) {
      if (it.kind === 'box') it.l.matrix.copy(it.b.matrix);
      else if (it.kind === 'rig') {
        if (it.pos.array !== it.r.shell.particles) it.pos.array = it.r.shell.particles;
        it.pos.needsUpdate = true;
        const b = it.r.shell.box(); it.aabb.box.min.set(b[0], b[1], b[2]); it.aabb.box.max.set(b[3], b[4], b[5]);
      } else if (it.kind === 'pin') {
        const g = it.pin.geometry, a = g.attributes.position, n = grab ? Math.min(256, grab.ids.length) : 0;
        if (n) { const X = grab.rig.shell.particles; for (let k = 0; k < n; k++) { const i = grab.ids[k] * 3; a.array[k * 3] = X[i]; a.array[k * 3 + 1] = X[i + 1]; a.array[k * 3 + 2] = X[i + 2]; } a.needsUpdate = true; }
        g.setDrawRange(0, n);
      }
    }
  }
  return { build, sync, set visible(v) { dbg.visible = v; } };
}

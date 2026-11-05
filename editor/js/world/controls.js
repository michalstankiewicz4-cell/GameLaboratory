// Kamera (orbita, kadrowanie; w grze jedzie za graczem — play/play.js), uchwyt (przesuń / obróć / skaluj) i wybór kliknięciem. Uchwyt zmienia model na żywo,
// a po puszczeniu (i w trakcie) zapisuje położenie z powrotem do danych sceny.
import * as THREE from '../../../vendor/three/three.module.js';
import { OrbitControls } from '../../../vendor/three/addons/controls/OrbitControls.js';
import { TransformControls } from '../../../vendor/three/addons/controls/TransformControls.js';

const D2R = Math.PI / 180;

export function createControls(world, store) {
  const { camera, renderer } = world;
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.495; orbit.target.set(0, 3, 0);
  const gizmo = new TransformControls(camera, renderer.domElement);
  world.scene.add(gizmo.getHelper());

  // uchwyt → dane (zaokrąglone, żeby plik sceny był czytelny)
  const fromGizmo = () => {
    const id = store.selectedId, g = gizmo.object; if (!id || !g) return;
    const e = new THREE.Euler().setFromQuaternion(g.quaternion, 'YXZ');
    store.update(id, { pos: g.position.toArray().map((v) => +v.toFixed(3)), rot: [e.x, e.y, e.z].map((v) => +(v / D2R).toFixed(2)), scale: +Math.max(0.01, g.scale.x).toFixed(4) });
  };
  gizmo.addEventListener('objectChange', fromGizmo);
  gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; if (e.value) store.seal(); });   // każde przeciągnięcie to osobny krok cofania
  const attach = () => { if (playing) { gizmo.detach(); return; } const r = world.objectRoot(store.selectedId); if (r) gizmo.attach(r); else gizmo.detach(); };

  // wybór kliknięciem (nie przeciągnięciem)
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null, playing = false;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    const click = down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4 && !gizmo.dragging; down = null;
    if (!click || playing) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
    let o = (ray.intersectObjects(world.root.children, true)[0] || {}).object;
    while (o && !o.userData.sceneId) o = o.parent;
    store.select(o ? o.userData.sceneId : null);
  });

  function frameBox(box) {
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(60, 10, 60));
    const c = box.getCenter(new THREE.Vector3()), rad = Math.max(4, box.getSize(new THREE.Vector3()).length() * 0.6);
    const dir = camera.position.clone().sub(orbit.target).normalize();
    orbit.target.copy(c); camera.position.copy(c).addScaledVector(dir, rad / Math.tan(camera.fov * D2R / 2) * 0.9);
    camera.position.y = Math.max(camera.position.y, c.y + 2);
  }
  return {
    orbit, gizmo, attach,
    setMode: (m) => gizmo.setMode(m),
    // w grze: bez uchwytu i bez wyboru kliknięciem (kamera dalej się obraca)
    setPlaying(on) { playing = on; if (on) gizmo.detach(); },
    frameSelection: () => frameBox(world.bounds(store.selectedId)),
    frameAll: () => frameBox(world.bounds(null)),
    update: () => orbit.update(),
  };
}

// Świat 3D edytora: renderer, scena bazowa (niebo, morze, grunt — js/labs/shared/stage.js), potok obrazu z laboratoriów
// wodnych (js/render/sea/look.js) i modele sceny zbudowane z prefabrykatów. Odbija dane ze store: buduje brakujące
// i zmienione modele, usuwa nieobecne, ustawia położenie, środowisko i wygląd kamery.
import * as THREE from '../../../vendor/three/three.module.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../../js/render/sea/look.js';
import { createStage, LIGHTS } from '../../../js/labs/shared/stage.js';
import { prefab } from '../../../js/scene/prefabs.js';

export { LIGHTS };
const D2R = Math.PI / 180;
export const PROFILES_KEY = 'gameLab.lookProfiles.v1';      // profile z laboratorium filtrów
export function readProfiles() { try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}') || {}; } catch { return {}; } }

export function createWorld(container, store, onWarn) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 9000); camera.position.set(140, 60, 160);
  const look = new LookPipeline(renderer); look.setAA(true);
  const stage = createStage(renderer, scene);
  const root = new THREE.Group(); root.name = 'scene objects'; scene.add(root);
  const built = new Map();                                   // id obiektu → { prefab, root, dispose, size }

  function build(o) {
    const p = prefab(o.prefab);
    if (!p) { onWarn && onWarn(o.prefab); return; }
    const b = p.build(), g = new THREE.Group(); g.userData.sceneId = o.id; g.add(b.root);
    g.traverse((m) => { if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) { m.castShadow = true; m.receiveShadow = true; } });
    built.set(o.id, { prefab: o.prefab, root: g, dispose: b.dispose, size: new THREE.Box3().setFromObject(b.root).getSize(new THREE.Vector3()).length() });
    root.add(g);
  }
  function drop(id) {
    const r = built.get(id); if (!r) return;
    root.remove(r.root); if (r.dispose) { try { r.dispose(); } catch { /* bez zwalniania */ } }
    built.delete(id);
  }
  function place(o) {
    const r = built.get(o.id); if (!r) return;
    r.root.position.fromArray(o.pos); r.root.rotation.set(o.rot[0] * D2R, o.rot[1] * D2R, o.rot[2] * D2R, 'YXZ');
    r.root.scale.setScalar(o.scale); r.root.name = o.name;
  }
  // modele, które trzeba zbudować (nowe albo z innym prefabrykatem)
  const pending = () => store.scene.objects.filter((o) => { const r = built.get(o.id); return !r || r.prefab !== o.prefab; });
  function syncObjects() {
    const ids = new Set(store.scene.objects.map((o) => o.id));
    [...built.keys()].forEach((id) => { if (!ids.has(id)) drop(id); });
    store.scene.objects.forEach((o) => { const r = built.get(o.id); if (r && r.prefab !== o.prefab) drop(o.id); if (!built.has(o.id)) build(o); place(o); });
    fitShadow();
  }
  function syncPlaces() { store.scene.objects.forEach(place); fitShadow(); }
  function syncEnv() {
    const env = store.scene.env;
    stage.setSurface(env.surface === 'land' ? 'land' : 'sea');
    stage.setLight(LIGHTS[env.light] ? env.light : 'afternoon');
    look.sunVisible = stage.sunSeen;
    const L = { ...LOOK_DEFAULTS, ...((env.look && readProfiles()[env.look]) || {}) };
    look.set(L, 'A'); look.set({ ...LOOK_DEFAULTS, exposure: L.exposure }, 'B');
    fitShadow();
  }
  function bounds(id) {
    const box = new THREE.Box3();
    if (id) { const r = built.get(id); if (r) box.setFromObject(r.root); } else built.forEach((r) => box.expandByObject(r.root));
    return box;
  }
  function fitShadow() {
    const box = bounds(null);
    if (box.isEmpty()) { stage.fitShadow(new THREE.Vector3(), 60); return; }
    stage.fitShadow(box.getCenter(new THREE.Vector3()), Math.min(600, box.getSize(new THREE.Vector3()).length() * 0.6 + 10));
  }
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); look.resize(innerWidth, innerHeight); }
  addEventListener('resize', resize); resize();

  let last = performance.now(), before = null;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stage.update(dt, camera); if (before) before(dt);
    look.sun(camera, stage.sunDir);
    window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);   // okno Wydajność i dolny pasek
    requestAnimationFrame(frame);
  }
  return {
    renderer, scene, camera, root, built, pending, syncObjects, syncPlaces, syncEnv, bounds,
    objectRoot: (id) => (built.get(id) || {}).root || null,
    size: (id) => (built.get(id) || {}).size || 10,
    start(beforeFrame) { before = beforeFrame; requestAnimationFrame((t) => { last = t; frame(t); }); },
  };
}

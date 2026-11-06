// Świat 3D edytora: renderer, scena bazowa (niebo, morze, grunt — js/labs/shared/stage.js), potok obrazu z laboratoriów
// wodnych (js/render/sea/look.js) i modele sceny zbudowane z prefabrykatów. Odbija dane ze store: buduje brakujące
// i zmienione modele, usuwa nieobecne, ustawia położenie, środowisko i wygląd kamery.
import * as THREE from '../../../vendor/three/three.module.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../../js/render/sea/look.js';
import { createStage, LIGHTS } from '../../../js/labs/shared/stage.js';
import { prefab } from '../../../js/scene/prefabs.js';
import { getAsset } from '../../../js/scene/assets.js';
import { spaceReady, loadSpace, SKY_PRESET } from '../../../js/scene/space.js';

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
  const built = new Map();                                   // id obiektu → { prefab, root, kit, dispose, size }

  // kity ze Space ładują się dopiero, gdy są potrzebne: model czeka, a po załadowaniu świat dobudowuje brakujące
  const later = () => loadSpace().then(() => { syncObjects(); syncEnv(); if (world.afterAsync) world.afterAsync(); })
    .catch((e) => { if (window.LabLog) window.LabLog.add('error', 'Space kits: ' + e.message); });
  function build(o) {
    const p = prefab(o.prefab);
    if (!p) { onWarn && onWarn(o.prefab); return; }
    if (p.needs === 'space' && !spaceReady()) { later(); return; }
    const b = p.build(), g = new THREE.Group(); g.userData.sceneId = o.id; g.add(b.root);
    g.traverse((m) => { if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) { m.castShadow = true; m.receiveShadow = true; } });
    built.set(o.id, { prefab: o.prefab, root: g, kit: b.kit || null, tick: b.tick || null, driven: false, dispose: b.dispose, size: new THREE.Box3().setFromObject(b.root).getSize(new THREE.Vector3()).length() });
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
  let lastSea = 'null';
  // kosmos: niebo BodyKit (gotowe tło z SystemKit albo zasób „sky” z laboratorium ciał niebieskich) i odbicia ShipKit
  let skyBody = null, skyKey = '', spaceEnvSet = false;
  function skyValues(name) {
    const SK = window.SystemKit.SKIES;
    if (!name) return SK.find((x) => x.id === 'deep').values || {};
    if (name.startsWith(SKY_PRESET)) { const d = SK.find((x) => x.id === name.slice(SKY_PRESET.length)); if (d) return d.none ? null : d.values || {}; }
    else { const a = getAsset('sky', name); if (a) return a; }
    if (onWarn) onWarn('sky:' + name);
    return SK.find((x) => x.id === 'deep').values || {};
  }
  function syncSpace(env) {
    const on = env.surface === 'space';
    if (!on) { if (skyBody) skyBody.group.visible = false; return; }
    if (!spaceReady()) { later(); return; }
    if (!spaceEnvSet) { stage.setSpaceEnvironment(window.ShipKit.makeEnvironment(renderer)); spaceEnvSet = true; }
    const v = skyValues(env.sky || ''), key = JSON.stringify(v);
    if (key !== skyKey) {
      skyKey = key;
      if (skyBody) { scene.remove(skyBody.group); window.BodyKit.disposeBody(skyBody); skyBody = null; }
      if (v) {
        const ref = window.BodyKit.GAME_KINDS.sky;
        skyBody = window.BodyKit.buildBody(ref.groupId, ref.bodyId, { detail: 1, values: v });
        skyBody.setRadius(4000); skyBody.setOctaves(window.BodyKit.QUALITY_OCTAVES[2]); scene.add(skyBody.group);
      }
    }
    if (skyBody) skyBody.group.visible = true;
  }
  function syncEnv() {
    const env = store.scene.env;
    stage.setSurface(env.surface === 'land' || env.surface === 'space' ? env.surface : 'sea');
    syncSpace(env);
    stage.setLight(LIGHTS[env.light] ? env.light : 'afternoon');
    // morze: zasób z laboratorium wody (po nazwie) albo domyślne; brak zasobu w tej przeglądarce — domyślne i ostrzeżenie
    const sea = env.sea ? getAsset('sea', env.sea) : null, seaKey = JSON.stringify(sea);
    if (env.sea && !sea && onWarn) onWarn('sea:' + env.sea);
    if (seaKey !== lastSea) { stage.setSea(sea || {}); lastSea = seaKey; }
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
  // the view's own size: with Panels (ui/shell/windows.js) it is the free middle between the panels and the console
  function resize() {
    const w = Math.max(1, container.clientWidth || innerWidth), h = Math.max(1, container.clientHeight || innerHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); look.resize(w, h);
  }
  addEventListener('resize', resize); resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

  let last = performance.now(), before = null;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = stage.update(dt, camera); if (before) before(dt, t);
    built.forEach((r) => { if (r.tick && !r.driven) r.tick(t, dt); });   // części na postoju (statki kosmiczne)
    if (skyBody && skyBody.group.visible) skyBody.update(t, dt, { center: camera.position, renderer });
    look.sun(camera, stage.sunDir);
    window.LabPerf.begin(renderer); look.render(scene, camera); window.LabPerf.end(renderer);   // okno Wydajność i dolny pasek
    requestAnimationFrame(frame);
  }
  const world = {
    renderer, scene, camera, root, built, stage, pending, syncObjects, syncPlaces, syncEnv, bounds,
    objectRoot: (id) => (built.get(id) || {}).root || null,
    size: (id) => (built.get(id) || {}).size || 10,
    start(beforeFrame) { before = beforeFrame; requestAnimationFrame((t) => { last = t; frame(t); }); },
    afterAsync: null,   // po dobudowaniu modeli, które czekały na kity (edytor: uchwyt, okna)
  };
  return world;
}

// Świat 3D edytora: renderer, scena bazowa (niebo, morze, grunt — js/labs/shared/stage.js), potok obrazu z laboratoriów
// wodnych (js/render/sea/look.js) i modele sceny zbudowane z prefabrykatów. Odbija dane ze store: buduje brakujące
// i zmienione modele, usuwa nieobecne, ustawia położenie, środowisko i wygląd kamery.
import { worldBox } from '../../../js/scene/doctor.js';
import * as THREE from '../../../vendor/three/three.module.js';
import { LookPipeline, LOOK_DEFAULTS } from '../../../js/render/sea/look.js';
import { createStage, LIGHTS } from '../../../js/labs/shared/stage.js';
import { prefab } from '../../../js/scene/prefabs.js';
import { getAsset, listAssets } from '../../../js/scene/assets.js';
import { planetAirless } from '../../../js/envs/land/planet.js';
import { spaceReady, loadSpace, SKY_PRESET, SKY_DAY } from '../../../js/scene/space.js';
import { createEffectLibrary, STEP as FX_STEP } from '../../../js/render/effects/effects.js';
import { DamageFx, shipDamage } from '../../../js/render/effects/damage.js';

export { LIGHTS };
const D2R = Math.PI / 180;
// wygląd kamery: zasoby „look” z laboratorium filtrów (js/scene/assets.js)
export function readProfiles() { return Object.fromEntries(listAssets('look').map((n) => [n, getAsset('look', n)])); }

export function createWorld(container, store, onWarn) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.localClippingEnabled = true;   // budowa modułów bazy (BaseKit setProgress: płaszczyzna odcięcia)
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
    const b = p.build({ asset: assetData(o) }), g = new THREE.Group(); g.userData.sceneId = o.id; g.add(b.root);
    const lb = new THREE.Box3().setFromObject(g);   // obrys w układzie obiektu (g jeszcze bez położenia) — lekarz sceny
    g.traverse((m) => { if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) { m.castShadow = true; m.receiveShadow = true; } });
    built.set(o.id, { prefab: o.prefab, key: keyOf(o), root: g, kit: b.kit || null, tick: b.tick || null, driven: false, dispose: b.dispose, size: new THREE.Box3().setFromObject(b.root).getSize(new THREE.Vector3()).length(),
      local: lb.isEmpty() ? null : { min: lb.min.toArray(), max: lb.max.toArray() }, cost: costOf(g) });
    root.add(g);
    wireShots(o, b.kit);
  }
  // koszt modelu: trójkąty (instancje razem) i wywołania rysowania (siatka × grupy materiałów)
  function costOf(g) {
    let tris = 0, draws = 0;
    g.traverse((m) => {
      if (!(m.isMesh || m.isLine || m.isPoints) || !m.geometry) return;
      const geo = m.geometry, n = geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0), inst = m.isInstancedMesh ? m.count : 1;
      if (m.isMesh) tris += (n / 3) * inst;
      draws += Array.isArray(m.material) ? Math.max(1, geo.groups.length) : 1;
    });
    return { tris: Math.round(tris), draws };
  }
  function drop(id) {
    const r = built.get(id); if (!r) return;
    if (r.dmg) r.dmg.dispose();
    root.remove(r.root); if (r.dispose) { try { r.dispose(); } catch { /* bez zwalniania */ } }
    built.delete(id);
  }
  function place(o) {
    const r = built.get(o.id); if (!r) return;
    r.root.position.fromArray(o.pos); r.root.rotation.set(o.rot[0] * D2R, o.rot[1] * D2R, o.rot[2] * D2R, 'YXZ');
    r.root.scale.setScalar(o.scale); r.root.name = o.name;
  }
  // zasób obiektu (pole „asset”, rodzaj z prefabrykatu, np. bryła z bloków): dane albo null — model domyślny
  function assetData(o) { const p = prefab(o.prefab); return p && p.assetKind && o.asset ? getAsset(p.assetKind, o.asset) : null; }
  // co wyznacza zbudowany model: prefabrykat i dane zasobu (zapis zasobu w laboratorium przebudowuje model)
  const keyOf = (o) => o.prefab + (o.asset ? '|' + o.asset + '|' + JSON.stringify(assetData(o)) : '');
  // modele, które trzeba zbudować (nowe, z innym prefabrykatem albo zasobem)
  const pending = () => store.scene.objects.filter((o) => { const r = built.get(o.id); return !r || r.key !== keyOf(o); });
  function syncObjects() {
    const ids = new Set(store.scene.objects.map((o) => o.id));
    [...built.keys()].forEach((id) => { if (!ids.has(id)) drop(id); });
    store.scene.objects.forEach((o) => { const r = built.get(o.id); if (r && r.key !== keyOf(o)) drop(o.id); if (!built.has(o.id)) build(o); place(o); });
    fitShadow();
  }
  function syncPlaces() { store.scene.objects.forEach(place); fitShadow(); }
  let lastSea = 'null', lastLand = 'null';
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
  // niebo niezależne od powierzchni: env.sky '' — domyślne dla powierzchni (morze, ląd — dzienne; kosmos — Deep field),
  // 'day' — dzienne (pora dnia i pogoda), 'preset:<id>' albo nazwa zasobu — niebo kosmosu (także nad morzem i lądem)
  // niebo kosmosu: wybrane, kosmos albo ląd z planety bez atmosfery (Luna, Mercury)
  const airlessLand = (env) => { const d = env.surface === 'land' && env.land ? getAsset('land', env.land) : null; return !!(d && d.map && d.map.planet && planetAirless(d.map.planet)); };
  const skyIsSpace = (env) => (env.sky ? env.sky !== SKY_DAY : env.surface === 'space' || airlessLand(env));
  function syncSpace(env) {
    const on = skyIsSpace(env);
    stage.setSkyMode(on ? 'space' : 'day');
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
    // ląd: teren z laboratorium lądu (zasób „land”) albo płaski grunt; generowanie tylko po zmianie zasobu
    const landDef = env.surface === 'land' && env.land ? getAsset('land', env.land) : null, landKey = JSON.stringify(landDef);
    if (env.surface === 'land' && env.land && !landDef && onWarn) onWarn('land:' + env.land);
    if (landKey !== lastLand) {
      if (landDef && landDef.map && landDef.map.planet && !spaceReady()) { later(); return; }   // ląd z planety: najpierw BodyKit
      lastLand = landKey; stage.setLand(landDef);
    }
    stage.setSurface(env.surface === 'land' || env.surface === 'space' ? env.surface : 'sea');
    syncSpace(env);   // przed światłem: tryb nieba decyduje o słońcu, mgle i odbiciach
    // światło: gotowe (LIGHTS) albo zasób „weather” z laboratorium wyglądu; brak zasobu — popołudnie i ostrzeżenie
    let light = LIGHTS[env.light] ? env.light : env.light ? getAsset('weather', env.light) : null;
    if (!light) { if (env.light && onWarn) onWarn('light:' + env.light); light = 'afternoon'; }
    stage.setLight(light);
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
  // efekty sceny: jeden EffectKit na zapisany efekt (zasób „effect”: rodzaj, skala, liczby) albo na gotowy rodzaj
  const fxLib = createEffectLibrary(scene, getAsset), dmgFx = new DamageFx(scene); let fxAcc = 0;
  const effect = (e) => fxLib.play(e.asset || e.kind, e);
  // strzały statków (ShipKit model.onShot): efekt wybrany dla obiektu (pole „shot”: rodzaj albo zapisany efekt; brak — strzał)
  function wireShots(o, kit) {
    if (!kit || !('onShot' in kit)) return;
    const r = built.get(o.id); if (r && kit.damageView) r.dmg = shipDamage(kit, dmgFx);   // uszkodzenia: laboratorium efektów
    kit.onScan = (s) => { try { fxLib.play('scan', { at: s.at.toArray(), radius: s.radius, color: s.color }); } catch { /* bez fali */ } };   // fala skanu: laboratorium efektów
    kit.onShot = (s) => { const cur = store.scene.objects.find((q) => q.id === o.id); try { fxLib.shot((cur && cur.shot) || 'shot', s); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'Shot effect: ' + err.message); } };
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = stage.update(dt, camera); if (before) before(dt, t);
    // kosmos: słońce w scenie (ciało „Sol”) jest źródłem światła — ciała niebieskie oświetla jego położenie, statki
    // światło sceny z jego kierunku (od środka kadru); czarna dziura w scenie — soczewkowanie, słońce — flara i promienie
    // (efekty kosmosu potoku kamery, js/render/space-fx.js)
    let sunB = null, holeB = null;
    if (stage.space) built.forEach((r) => { if (!sunB && r.prefab === 'bodies/sol') sunB = r; if (!holeB && r.prefab === 'bodies/abyss') holeB = r; });
    if (sunB) stage.aimSun(sunB.root.position.clone().sub(camera.position).normalize());   // światło od słońca w scenie
    const at = { sunDir: stage.sunDir, sunPos: sunB ? sunB.root.position : null, center: camera.position };   // dla ciał niebieskich: światło, kamera
    built.forEach((r) => { if (r.tick && !r.driven) r.tick(t, dt, at); });   // części na postoju (statki kosmiczne, ciała niebieskie)
    if (skyBody && skyBody.group.visible) skyBody.update(t, dt, { center: camera.position, renderer });
    const rad = (r) => (r.kit && r.kit.radius ? r.kit.radius : 50) * r.root.scale.x;
    look.space = stage.space && (sunB || holeB) ? {
      lens: holeB ? { object: holeB.root, position: holeB.root.position, radius: rad(holeB) } : null,
      flare: sunB ? { position: sunB.root.position, radius: rad(sunB), strength: 1, rays: 1 } : null,
    } : null;
    look.sun(camera, stage.sunDir);
    // efekty (EffectKit, zdarzenie „effect”): stałym krokiem 1/60 s; czarna dziura i kula cieczy — obraz przez soczewki
    fxAcc += dt; let fxN = 0;
    while (fxAcc >= FX_STEP && fxN < 6) { fxLib.step(camera); built.forEach((r) => r.dmg && r.dmg.step()); dmgFx.step(); fxAcc -= FX_STEP; fxN++; }
    if (fxN === 6) fxAcc = 0;
    window.LabPerf.begin(renderer);   // okno Wydajność i dolny pasek
    if (fxLib.lensing) fxLib.render(renderer, scene, camera, (target) => look.render(scene, camera, target)); else look.render(scene, camera);
    window.LabPerf.end(renderer);
    requestAnimationFrame(frame);
  }
  const world = {
    renderer, scene, camera, root, built, stage, pending, syncObjects, syncPlaces, syncEnv, bounds, effect,
    clearEffects: () => fxLib.dispose(), forgetEffect: (n) => fxLib.forget(n),
    objectRoot: (id) => (built.get(id) || {}).root || null,
    // lekarz sceny (js/scene/doctor.js): obrys w świecie z danych obiektu i koszt zbudowanego modelu; null — niezbudowany
    boxOf: (o) => { const r = built.get(o.id); return r && r.prefab === o.prefab && r.local ? worldBox(r.local, o) : null; },
    costOf: (o) => { const r = built.get(o.id); return r && r.prefab === o.prefab ? r.cost : null; },
    size: (id) => (built.get(id) || {}).size || 10,
    start(beforeFrame) { before = beforeFrame; requestAnimationFrame((t) => { last = t; frame(t); }); },
    afterAsync: null,   // po dobudowaniu modeli, które czekały na kity (edytor: uchwyt, okna)
  };
  return world;
}

// Narzędzie edytora „budowa bazy”: moduł bazy (BaseKit) jako hologram pod kursorem — turkusowy, gdy pasuje, czerwony,
// gdy nie; kliknięcie stawia moduł, R obraca o 45°, Esc albo prawy przycisk kończy. Zasady jak w laboratorium powierzchni
// (SurfaceKit, docs/labs/surface.md, „Building”): grunt nie za stromy (maxSlope modułu), nie na wodzie ani lawie (moduł
// „wet” może stać na płyciźnie do 1,5 m), nie za blisko innego modułu (obrysy footprint się nie zachodzą).
// Moduły w scenie stoją gotowe; budowanie w czasie gry — zachowanie „budowa” (js/scene/behaviors.js).
import * as THREE from '../../../vendor/three/three.module.js';

const D2R = Math.PI / 180;

export function createPlacer(world, store, actions, { t }) {
  const { camera, renderer, scene, stage } = world;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let cur = null;   // { prefab, def, mod, rot, at: Vector3 | null, why }

  // grunt pod kursorem: marsz po promieniu, aż zejdzie pod grunt (teren z laboratorium lądu albo płaski grunt)
  function groundHit(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
    const o = ray.ray.origin, d = ray.ray.direction, gAt = (x, z) => stage.terrainAt(x, z) ?? stage.groundAt(x, z);
    let prev = 0;
    for (let s = 1; s < 6000; s += Math.max(1, s * 0.01)) {
      const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s;
      if (y < gAt(x, z)) {   // dokładniej: połowienie między poprzednim a tym krokiem
        let a = prev, b = s;
        for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (o.y + d.y * m < gAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
        const px = o.x + d.x * b, pz = o.z + d.z * b; return new THREE.Vector3(px, gAt(px, pz), pz);
      }
      prev = s;
    }
    return null;
  }
  // czy moduł pasuje tutaj: '' albo kod powodu (steep, water, lava, close:<nazwa>, surface)
  function check(def, at) {
    const S = store.scene;
    if (S.env.surface !== 'land') return 'surface';
    const R = def.footprint, gAt = (x, z) => stage.terrainAt(x, z) ?? stage.groundAt(x, z);
    let lo = Infinity, hi = -Infinity, wet = 0;
    for (let k = 0; k <= 12; k++) {
      const a = k / 12 * Math.PI * 2, rr = k === 12 ? 0 : R, x = at.x + Math.cos(a) * rr, z = at.z + Math.sin(a) * rr, h = gAt(x, z);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
      const w = stage.waterLevel(x, z); if (w != null && h < w) wet = Math.max(wet, w - h);
    }
    if (wet > 0 && (!def.wet || wet > 1.5)) return stage.lava ? 'lava' : 'water';
    if ((hi - lo) / (2 * R) > def.maxSlope) return 'steep';
    for (const o of S.objects) {
      if (!o.prefab.startsWith('base/')) continue;
      const od = window.BaseKit.MODULES.find((m) => 'base/' + m.id === o.prefab); if (!od) continue;
      if (Math.hypot(o.pos[0] - at.x, o.pos[2] - at.z) < R + od.footprint) return 'close:' + o.name;
    }
    return '';
  }
  function say() {
    if (!cur) return;
    const [code, name] = (cur.why || '').split(':');
    actions.status(cur.at ? (code ? t('place.' + code, { name }) : t('place.ok', { name: cur.def.name })) : t('place.aim', { name: cur.def.name }));
  }
  function move(e) {
    if (!cur) return;
    cur.at = groundHit(e);
    if (!cur.at) { cur.mod.group.visible = false; say(); return; }
    cur.why = check(cur.def, cur.at);
    cur.mod.group.visible = true; cur.mod.group.position.copy(cur.at); cur.mod.group.rotation.y = cur.rot * D2R;
    cur.mod.setGhostState(cur.why ? 'bad' : 'ok'); say();
  }
  let down = null;
  function pdown(e) { if (cur) down = [e.clientX, e.clientY, e.button]; }
  function pup(e) {
    if (!cur || !down) return;
    const click = Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4, btn = down[2]; down = null;
    if (!click) return;
    e.stopImmediatePropagation();   // nie wybieraj obiektu pod kursorem
    if (btn === 2) { stop(); return; }
    if (!cur.at || cur.why) { say(); return; }
    const p = cur.prefab, at = cur.at, rot = cur.rot;
    actions.build(() => { const o = store.add(p.id, p.label, [+at.x.toFixed(1), +at.y.toFixed(2), +at.z.toFixed(1)]); store.update(o.id, { rot: [0, rot, 0] }); });
    move(e);   // ten sam moduł dalej pod kursorem: następny obok
  }
  function key(e) {
    if (!cur || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); stop(); }
    else if (k === 'r') { e.preventDefault(); e.stopImmediatePropagation(); cur.rot = (cur.rot + 45) % 360; if (cur.at) cur.mod.group.rotation.y = cur.rot * D2R; }
  }
  const el = renderer.domElement;
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerdown', pdown, true);
  el.addEventListener('pointerup', pup, true);
  el.addEventListener('contextmenu', (e) => { if (cur) e.preventDefault(); });
  addEventListener('keydown', key, true);
  let tAcc = 0;

  function stop() {
    if (!cur) return;
    scene.remove(cur.mod.group); window.BaseKit.disposeModule(cur.mod); cur = null;
    document.body.classList.remove('placing'); actions.status(t('place.off'));
  }
  return {
    get active() { return !!cur; },
    // start(prefab): BaseKit musi być załadowany (js/scene/space.js loadSpace())
    start(p) {
      stop();
      const id = p.id.slice(5), def = window.BaseKit.MODULES.find((m) => m.id === id); if (!def) return;
      const mod = window.BaseKit.buildModule(id, { detail: 1 }); mod.group.visible = false; scene.add(mod.group);
      cur = { prefab: p, def: { ...def, name: p.label }, mod, rot: 0, at: null, why: '' };
      document.body.classList.add('placing'); say();
    },
    stop,
    frame(dt) { if (cur) { tAcc += dt; cur.mod.update(tAcc, dt); } },   // hologram: linie skanowania
  };
}

// Gra w edytorze („Graj” / „Stop”): zachowania z js/scene/behaviors.js ruszają modele sceny, gracz steruje jednym z nich
// klawiaturą (play/input.js), kamera jedzie za nim (orbita zostaje: można się obracać wokół). Dane sceny się nie
// zmieniają — zachowania ustawiają tylko modele w świecie 3D; po „Stop” modele wracają na miejsca z danych.
import * as THREE from '../../../vendor/three/three.module.js';
import { BEHAVIORS, behaviorOf, bodyRank, JUNK_KIT } from '../../../js/scene/behaviors.js';
import { createItems } from '../../../js/behaviors/land/items.js';
import { LIQUID_TIME } from '../../../js/render/liquid.js';
import { createInput } from './input.js';
import { createPlayUI } from './gameui-play.js';
import { createSettings } from '../../../js/core/settings.js';
import { mixer } from '../../../js/audio/mixer.js';
import { createSceneSounds } from '../../../js/scene/sounds.js';
import { createSceneMusic } from '../../../js/scene/music.js';
import { createSceneWeather } from '../../../js/scene/weather.js';
import { createSceneDestruct } from '../../../js/scene/destruct.js';
import { applyGraphics, refresh } from '../../../js/render/game-graphics.js';

const { t, lang } = window.EditorI18n;

export function createPlay(store, world, controls, actions, events) {
  // ustawienia gry gracza (js/core/settings.js; te same co w laboratorium UI gry): grafika i mysz w czasie gry,
  // klawisze czynności dla sterowania; menu Opcje UI gry zmienia je w biegu
  const settings = createSettings();
  mixer().bindSettings(settings);   // głośności gracza (Opcje → Dźwięk) na szynach miksera
  const input = createInput(() => settings.data.keys);
  const playUI = createPlayUI(store, world, events, settings);   // UI gry ze sceny (env.ui) jako nakładka w czasie gry
  const orbit0 = { rot: controls.orbit.rotateSpeed, zoom: controls.orbit.zoomSpeed };
  const gfxTarget = () => ({ renderer: world.renderer, look: world.look, scene: world.scene, sun: world.stage.sun, stage: world.stage, camera: world.camera });
  function gameGraphics(on) {
    const d = settings.data;
    world.gameGfx = on ? d.gfx : null;
    const changed = applyGraphics(gfxTarget(), on ? d.gfx : null); world.syncEnv();   // syncEnv: potok kamery i zasięg cieni
    if (changed.includes('fx')) world.clearEffects();   // efekty zbudowane od nowa z nową gęstością
    controls.orbit.rotateSpeed = orbit0.rot * (on ? d.mouse.rotSens : 1); controls.orbit.zoomSpeed = orbit0.zoom * (on ? d.mouse.zoomSens : 1);
  }
  settings.onChange(() => { if (runs.length) gameGraphics(true); });
  // dźwięk w scenie (js/scene/sounds.js): źródła przy obiektach (pole „sound”), silniki zachowań, strzały i efekty;
  // położenie obiektu — model w świecie (zachowania złomowiska ruszają model, nie grupę obiektu)
  const tmpV = world.camera.position.clone();
  const positionOf = (id) => { const b = world.built.get(id); if (!b) return null; const k = b.kit, m = k && k.model && k.model.isObject3D && k.model.parent ? k.model : b.root; return m.getWorldPosition(tmpV).toArray(); };
  const music = createSceneMusic();   // muzyka sceny (env.music) i muzyka akcji po głośnych zdarzeniach (env.musicAction)
  const weather = createSceneWeather((p) => world.setWeather(p));   // zmienna pogoda z zasobu „weather” (cycle.on)
  const sounds = createSceneSounds({ positionOf, onLoud: () => { if (runs.length) music.action(); } });
  world.onShot = (o, s) => sounds.shot(s, o.shot || 'shot');   // strzał statku (ShipKit onShot) — także poza grą
  world.onDamage = (o, e) => sounds.damage(e);   // wybuch statku (ShipKit onDamage { type: 'blast' })
  world.onSound = (o, e) => sounds.model(e);   // dźwięk modelu (onSound: drzwi, właz, podwozie, klapy)
  let lightT = 0, fpsN = 0, fpsT = 0;
  playUI.onQuit = () => stop();
  // akcje modelu (statki kosmiczne: ogień, skan, druk, wyłączenie, zniszczenie) — zdarzenie „action” na szynie; słucha
  // go zachowanie obiektu (run.act), dziennik i później dźwięk, interfejs, sieć
  if (events) events.on('action', (e) => { const r = runs.find((x) => x.obj.id === e.object); if (r && r.run.act) r.run.act(e.action, e.on); });
  function act(id, action, on) {
    const r = runs.find((x) => x.obj.id === id); if (!r || !r.run.actions) return { ok: false, error: 'no actions' };
    const a = r.run.actions().find((x) => x.id === action);
    if (!a) return { ok: false, error: `no action "${action}" (actions: ${r.run.actions().map((x) => x.id).join(', ')})` };
    const st = a.kind === 'toggle' ? (on != null ? !!on : !a.on) : undefined;
    if (events) events.emit('action', { object: id, name: r.obj.name, action, ...(st != null ? { on: st } : {}) });
    return { ok: true, action, ...(st != null ? { on: st } : {}) };
  }
  // klawisze 1…9: akcje gracza po kolei (lista w linii stanu po starcie)
  addEventListener('keydown', (e) => {
    if (!runs.length || !me || !me.run.actions || e.repeat || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    const n = +e.key; if (!(n >= 1 && n <= 9)) return;
    const a = me.run.actions()[n - 1]; if (!a) return;
    e.preventDefault(); act(me.obj.id, a.id);
  });
  let runs = [], me = null, last = null, hudT = 0, items = null, machines = [], destruct = null;
  // mysz w grze: zachowania z pointer() (układ silnika: wyłączniki, przyciski, pokrętła) łapią klik przed kamerą
  const cv = world.renderer.domElement, pray = new THREE.Raycaster(), pndc = new THREE.Vector2();
  let grabbed = null, py = 0;
  const rayOf = (e) => { const r = cv.getBoundingClientRect(); pndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); pray.setFromCamera(pndc, world.camera); return pray.ray; };
  cv.addEventListener('pointerdown', (e) => {
    if (!runs.length || e.button !== 0) return;
    const r = rayOf(e), hit = runs.find((x) => x.run.pointer && x.run.pointer('down', r.origin, r.direction, 0));
    if (!hit) return;
    grabbed = hit; py = e.clientY; controls.orbit.enabled = false; cv.setPointerCapture(e.pointerId); e.stopImmediatePropagation(); e.preventDefault();
  }, { capture: true });
  cv.addEventListener('pointermove', (e) => {
    if (grabbed) { grabbed.run.pointer('move', null, null, e.clientY - py); py = e.clientY; e.stopImmediatePropagation(); return; }
    if (runs.length) { const r = rayOf(e); cv.classList.toggle('grab', runs.some((x) => x.run.hover && x.run.hover(r.origin, r.direction))); }
  }, { capture: true });
  const letGo = (e) => { if (!grabbed) return; grabbed.run.pointer('up'); grabbed = null; controls.orbit.enabled = true; if (e) e.stopImmediatePropagation(); };
  cv.addEventListener('pointerup', letGo, { capture: true }); cv.addEventListener('pointercancel', letGo, { capture: true });

  function start() {
    if (runs.length) return;
    const env = { get surface() { return store.scene.env.surface; }, get waves() { return world.stage.waves; }, isWater: (x, z) => world.stage.isWater(x, z), groundAt: (x, z) => world.stage.groundAt(x, z),
      terrainAt: (x, z) => world.stage.terrainAt(x, z), waterLevel: (x, z) => world.stage.waterLevel(x, z), waterAt: (x, z) => world.stage.waterAt(x, z),   // pojazdy lądowe: grunt i dno, poziom wody
      // orbita: inne obiekty sceny i ich bieżące położenie, kierunek słońca, kamera
      objects: store.scene.objects, objectPos: (id) => { const b = world.built.get(id); return b ? b.root.position.toArray() : null; },
      get gravity() { return world.stage.gravity; }, get airDensity() { return world.stage.airDensity; },   // lądowanie: prawa planety
      get sunDir() { return world.stage.sunDir; }, get cameraPos() { return world.camera.position; },
      windAt: (x, y, z, out) => world.stage.windAt(x, y, z, out),   // wiatr trąby powietrznej / tornada (pogoda sceny)
      // złomowisko: wspólny świat przedmiotów (land/items.js) — przedmioty, maszyny, przeładowarka; liczony w frame()
      get items() { return items || (items = createItems({ ground: { height: (x, z) => { const h = world.stage.terrainAt(x, z); return h == null ? 0 : h; } }, wind: (x, y, z, out) => world.stage.windAt(x, y, z, out) })); },
      // budynki z części: wspólny świat zniszczeń sceny (js/scene/destruct.js) — tornado z pogody je niszczy; liczony w frame()
      get destruct() { return destruct || (destruct = createSceneDestruct({ scene: world.scene, groundAt: (x, z) => world.stage.groundAt(x, z), windAt: (x, y, z, out) => world.stage.windAt(x, y, z, out), tornado: () => world.stage.tornado })); },
      scene: world.root, machines };
    runs = store.scene.objects.map((o) => {
      const id = behaviorOf(o, store.scene.env.surface), b = world.built.get(o.id); if (!id || !b) return null;
      const run = BEHAVIORS[id].create(o, b, env);
      if (run) { b.driven = true; b.lodFree = !!BEHAVIORS[id].lodFree; }   // ruch i części daje zachowanie (świat nie wywołuje tick); lodFree — wersja daleka może zostać
      return run && { obj: o, id, b, run };
    }).filter(Boolean);
    runs.sort((a, b) => bodyRank(b.obj.prefab) - bodyRank(a.obj.prefab));   // środki orbit przed ciałami, które wokół nich krążą
    if (!runs.length) { actions.status(t('play.none')); return; }
    // gracz steruje wybranym (gdy ma zachowanie), inaczej pierwszym
    me = runs.find((r) => r.obj.id === store.selectedId) || runs[0];
    input.reset(BEHAVIORS[me.id], me.run.hud().throttle);
    gameGraphics(true);
    last = me.b.root.position.clone(); hudT = 4;   // przez pierwsze sekundy linia stanu pokazuje klawisze
    controls.setPlaying(true); document.body.classList.add('playing');
    const acts = me.run.actions ? me.run.actions().map((a, i) => `${i + 1}: ${a.label.toLowerCase()}`).join(' · ') : '';
    actions.status(t('play.on', { name: me.obj.name, keys: (lang === 'pl' ? BEHAVIORS[me.id].keysPl : BEHAVIORS[me.id].keys) + (acts ? ' · ' + acts : '') }));
    playUI.start(me.obj.name);
    sounds.start(store.scene.objects, runs);
    music.start(store.scene.env);
    weather.start(store.scene.env);
    if (world.stage.resetTornado) world.stage.resetTornado();   // tornado z pogody sceny — od miejsca startu
    if (window.LabLog) window.LabLog.add('info', 'Play: ' + runs.length + ' object(s), controlling ' + me.obj.name);
    changed();
  }
  function stop() {
    if (!runs.length) return;
    sounds.stop(); music.stop(); weather.stop();
    if (world.stage.resetTornado) world.stage.resetTornado();
    runs.forEach((r) => { if (r.run.reset) r.run.reset(); r.b.driven = false; r.b.lodFree = false; });
    // przedmioty powstałe w grze (sztabki, puszki zgniecione) znikają ze świata
    if (items) for (const it of [...items.list]) if (it.spawned) items.remove(it);
    items = null; machines.length = 0;
    if (destruct) { destruct.stop(); destruct = null; }
    letGo(); cv.classList.remove('grab');
    runs = []; me = null; input.release(); playUI.stop();
    gameGraphics(false);   // wygląd edytora
    controls.setPlaying(false); document.body.classList.remove('playing');
    world.syncPlaces(); controls.attach();
    actions.status(t('play.off'));
    changed();
  }
  // klatka: zachowania, kamera za graczem, linia stanu
  function frame(dt, time) {
    if (!runs.length) return;
    weather.frame(dt);   // pogoda niezależna od reszty klatki
    const c = input.read(dt);
    runs.forEach((r) => { r.input = r === me ? c : {}; r.run.step(dt, r.input, time); });
    if (items) { items.step(dt); items.sync(); JUNK_KIT.glow(items); if (machines.length) LIQUID_TIME.value += dt; }
    if (destruct) destruct.frame(dt);
    const p = me.b.root.position, d = p.clone().sub(last); last.copy(p);
    controls.orbit.target.add(d); world.camera.position.add(d);
    if ((hudT -= dt) <= 0) { hudT = 0.2; actions.status(hudText(me.run.hud())); }
    playUI.frame(dt, me, runs);
    if ((lightT += dt) > 0.5) { lightT = 0; refresh(world.scene, settings.data.gfx, world.renderer.capabilities.getMaxAnisotropy()); }   // to, co pojawiło się w grze (ogień, lampy, wersje dalekie modeli)
    sounds.frame(); music.frame();
    if (mixer().started) { const c2 = world.camera, f = c2.getWorldDirection(c2.position.clone()), u = c2.up; mixer().listen(c2.position.toArray(), f.toArray(), u.toArray()); }   // słuchacz — kamera
    fpsN++; if ((fpsT += dt) >= 1) { if (playUI.ui) playUI.ui.fps(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  }
  function hudText(h) {
    if (h.machine) return [me.obj.name, ...h.machine.map(([k, v]) => `${k} ${v}`)].join(' · ');
    const parts = h.progress != null ? [me.obj.name, `${t('play.build')} ${Math.round(h.progress * 100)}%`]
      : [me.obj.name, `${t('play.speed')} ${h.speed.toFixed(h.unit === 'kn' ? 1 : 0)} ${h.unit}`, `${t('play.throttle')} ${Math.round(h.throttle * 100)}%`];
    if (h.alt != null) parts.push(`${t('play.alt')} ${h.alt.toFixed(0)} m`);
    if (h.vs != null) parts.push(`${t('play.vs')} ${h.vs.toFixed(1)} m/s`);
    if (h.landed) parts.push(t('play.landed'));
    if (h.crashed) parts.push(t('play.crashed')); else if (h.stall) parts.push(t('play.stall'));
    if (h.aground) parts.push(t('play.aground'));
    if (h.load != null) parts.push(`${t('play.load')} ${Math.round(h.load)} kg`);
    return parts.join(' · ');
  }
  const subs = new Set(), changed = () => subs.forEach((f) => f(!!runs.length));
  return {
    start, stop, frame, act, sounds, music, weather,
    actionsOf: (id) => { const r = runs.find((x) => x.obj.id === id); return r && r.run.actions ? r.run.actions() : []; },
    toggle: () => (runs.length ? stop() : start()),
    get playing() { return runs.length > 0; },
    get controlled() { return me ? me.obj.id : null; },
    get ui() { return playUI.ui; }, takesEscape: () => playUI.takesEscape(), settings,
    onChange: (f) => subs.add(f),
  };
}

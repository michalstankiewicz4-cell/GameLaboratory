// Gra w edytorze („Graj” / „Stop”): zachowania z js/scene/behaviors.js ruszają modele sceny, gracz steruje jednym z nich
// klawiaturą (play/input.js), kamera jedzie za nim (orbita zostaje: można się obracać wokół). Dane sceny się nie
// zmieniają — zachowania ustawiają tylko modele w świecie 3D; po „Stop” modele wracają na miejsca z danych.
import { BEHAVIORS, behaviorOf } from '../../../js/scene/behaviors.js';
import { createInput } from './input.js';

const { t, lang } = window.EditorI18n;

export function createPlay(store, world, controls, actions) {
  const input = createInput();
  let runs = [], me = null, last = null, hudT = 0;

  function start() {
    if (runs.length) return;
    const env = { get surface() { return store.scene.env.surface; }, get waves() { return world.stage.waves; }, isWater: (x, z) => world.stage.isWater(x, z), groundAt: (x, z) => world.stage.groundAt(x, z) };
    runs = store.scene.objects.map((o) => {
      const id = behaviorOf(o), b = world.built.get(o.id); if (!id || !b) return null;
      const run = BEHAVIORS[id].create(o, b, env);
      if (run) b.driven = true;   // ruch i części daje zachowanie (świat nie wywołuje tick)
      return run && { obj: o, id, b, run };
    }).filter(Boolean);
    if (!runs.length) { actions.status(t('play.none')); return; }
    // gracz steruje wybranym (gdy ma zachowanie), inaczej pierwszym
    me = runs.find((r) => r.obj.id === store.selectedId) || runs[0];
    input.reset(BEHAVIORS[me.id], me.run.hud().throttle);
    last = me.b.root.position.clone(); hudT = 4;   // przez pierwsze sekundy linia stanu pokazuje klawisze
    controls.setPlaying(true); document.body.classList.add('playing');
    actions.status(t('play.on', { name: me.obj.name, keys: lang === 'pl' ? BEHAVIORS[me.id].keysPl : BEHAVIORS[me.id].keys }));
    if (window.LabLog) window.LabLog.add('info', 'Play: ' + runs.length + ' object(s), controlling ' + me.obj.name);
    changed();
  }
  function stop() {
    if (!runs.length) return;
    runs.forEach((r) => { if (r.run.reset) r.run.reset(); r.b.driven = false; });
    runs = []; me = null; input.release();
    controls.setPlaying(false); document.body.classList.remove('playing');
    world.syncPlaces(); controls.attach();
    actions.status(t('play.off'));
    changed();
  }
  // klatka: zachowania, kamera za graczem, linia stanu
  function frame(dt, time) {
    if (!runs.length) return;
    const c = input.read(dt);
    runs.forEach((r) => r.run.step(dt, r === me ? c : {}, time));
    const p = me.b.root.position, d = p.clone().sub(last); last.copy(p);
    controls.orbit.target.add(d); world.camera.position.add(d);
    if ((hudT -= dt) <= 0) { hudT = 0.2; actions.status(hudText(me.run.hud())); }
  }
  function hudText(h) {
    const parts = [me.obj.name, `${t('play.speed')} ${h.speed.toFixed(h.unit === 'kn' ? 1 : 0)} ${h.unit}`, `${t('play.throttle')} ${Math.round(h.throttle * 100)}%`];
    if (h.alt != null) parts.push(`${t('play.alt')} ${h.alt.toFixed(0)} m`);
    if (h.crashed) parts.push(t('play.crashed')); else if (h.stall) parts.push(t('play.stall'));
    if (h.aground) parts.push(t('play.aground'));
    return parts.join(' · ');
  }
  const subs = new Set(), changed = () => subs.forEach((f) => f(!!runs.length));
  return {
    start, stop, frame,
    toggle: () => (runs.length ? stop() : start()),
    get playing() { return runs.length > 0; },
    get controlled() { return me ? me.obj.id : null; },
    onChange: (f) => subs.add(f),
  };
}

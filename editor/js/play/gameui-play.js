// UI gry w ▶ Graj edytora: definicja z laboratorium UI gry (zasób „ui”, wybrana w środowisku sceny: env.ui) jako
// nakładka nad widokiem (js/gameui/gameui.js). Stan gry dla HUD — z zachowań (linia stanu gracza: hud()) i ze sceny;
// zdarzenia szyny (akcje statków) — do dziennika; akcje UI: „quit” zatrzymuje grę, „event:<nazwa>” i wybory
// w dialogu — zdarzenie „ui” na szynie (js/core/events.js). Opis stanu: docs/labs/gameui.md, „UI gry w scenie”.
//
// stan gry (bind w definicji UI):
//   player: { name, speed, unit, throttle (−1…1), throttlePct, alt, vs, landed, crashed, stall, aground, progress }
//   scene: { name, surface, objects }, time (s gry), radar: [{ x, y, kind: 'me' | 'body' | 'other', name }] (metry od gracza)
import { createGameUI, normalizeUI } from '../../../js/gameui/gameui.js';
import { getAsset } from '../../../js/scene/assets.js';

export function createPlayUI(store, world, events) {
  let ui = null, offs = [], tAcc = 0, time = 0;
  const S = {};
  function start(meName) {
    stop();
    const name = store.scene.env.ui; if (!name) return null;
    const a = getAsset('ui', name);
    if (!a) { if (window.LabLog) window.LabLog.add('warn', `Game UI "${name}" is not saved in this browser (the game UI lab)`); return null; }
    let def; try { def = normalizeUI(a); } catch (e) { if (window.LabLog) window.LabLog.add('error', 'Game UI: ' + e.message); return null; }
    time = 0; Object.assign(S, { player: { name: meName }, scene: { name: store.scene.name, surface: store.scene.env.surface, objects: store.scene.objects.length }, time: 0, radar: [], settings: {} });
    ui = createGameUI(document.getElementById('view'), def, { state: S });
    ui.on((act, arg) => {
      if (act === 'quit') { if (api.onQuit) api.onQuit(); }
      else if (act === 'event' || act === 'choice') events && events.emit('ui', act === 'event' ? { name: arg } : { choice: arg });
    });
    if (events) offs.push(events.on('action', (e) => ui && ui.log(`${e.name || e.object}: ${e.action}${e.on != null ? (e.on ? ' on' : ' off') : ''}`, e.action === 'destroy' ? 'alert' : 'info')));
    return ui;
  }
  // co klatkę: stan gracza i radar (co 0,1 s)
  function frame(dt, me, runs) {
    if (!ui) return;
    time += dt; ui.tick(dt);
    if ((tAcc += dt) < 0.1) return; tAcc = 0;
    const h = me.run.hud(), p = me.b.root.position;
    S.player = { name: me.obj.name, speed: +(h.speed || 0), unit: h.unit || '', throttle: +(h.throttle || 0), throttlePct: Math.round((h.throttle || 0) * 100),
      alt: h.alt, vs: h.vs, landed: !!h.landed, crashed: !!h.crashed, stall: !!h.stall, aground: !!h.aground, progress: h.progress };
    S.time = time;
    S.radar = store.scene.objects.map((o) => {
      const b = world.built.get(o.id); if (!b) return null;
      const q = b.root.position;
      return { x: q.x - p.x, y: q.z - p.z, kind: o.id === me.obj.id ? 'me' : o.prefab.startsWith('bodies/') ? 'body' : 'other', name: o.name };
    }).filter(Boolean);
    ui.set(S);
  }
  // Esc w grze: UI go obsłuży (dialog, okno, menu albo ekran pauzy) — wtedy gra się nie zatrzymuje
  function takesEscape() {
    if (!ui) return false;
    const el = ui.el;
    return !!(el.querySelector('.gDialog:not([hidden])') || el.querySelector('.gWin:not([hidden])') || ui.menuOpen || (ui.def.pause && ui.def.screens[ui.def.pause]));
  }
  function stop() { offs.forEach((f) => f()); offs = []; if (ui) { ui.destroy(); ui = null; } }
  const api = { start, frame, stop, takesEscape, get ui() { return ui; }, onQuit: null };
  return api;
}

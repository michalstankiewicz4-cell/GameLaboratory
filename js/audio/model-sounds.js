// Słuchanie modeli: zdarzenia dźwięku modelu (onSound — js/models/shared/sound-events.js) grane przez SfxKit na
// mikserze silnika, w miejscu części (dźwięk przestrzenny; słuchacza — kamerę — ustawia laboratorium albo gra).
// hearModel(model, { gain, on }) → true, gdy model zgłasza dźwięki; on(e) — także dostaje zdarzenie (np. dziennik).
import { play, refOf } from './sfx/sfxkit.js';

export function hearModel(model, { gain = 1, on = null } = {}) {
  if (!model || !('onSound' in model)) return false;
  model.onSound = (e) => {
    if (on) on(e);
    if (!e.def || !e.def.sound) return;
    try { play(e.def, { at: e.at, ref: e.def.ref || refOf(e.def.sound), gain }); } catch (err) { if (window.LabLog) window.LabLog.add('warn', 'Model sound: ' + err.message); }
  };
  return true;
}

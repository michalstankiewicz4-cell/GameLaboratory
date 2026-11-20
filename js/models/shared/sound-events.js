// Dźwięki modelu jako zdarzenia: model nie gra dźwięku (nie wie, gdzie jest ani czy ktoś słucha) — zgłasza, co się
// dzieje z jego częścią („drzwi zaczynają się otwierać, tutaj”), jak strzał (ShipKit onShot). Gra ten, kto słucha:
// laboratorium, edytor sceny, gra (js/audio/model-sounds.js — SfxKit przez mikser silnika, w miejscu).
//
// Model ustawia kanał: const snd = soundChannel(info.sounds); … snd.emit('door-open', część); na końcu
// withSound(model, snd) — model dostaje właściwość onSound (słuchacz: (e) => …) i sounds (opisy z danych).
// Zdarzenie: { id, at: [x, y, z] (świat; null — bez części), def: opis dźwięku z danych modelu albo null }.
// Opisy w danych modelu (info.sounds): { '<id>': { sound: id SfxKit, params, gain? }, engine: { cylinders, idle,
// redline } — silnik dla zachowań (js/scene/sounds.js) }.
//
// motion(nazwa, część, spoczynek = 0) — ruch części 0…1 (drzwi, właz, podwozie, klapy): co klatkę step(cel, stan) zgłasza
// '<nazwa>-open' (cel 1: rusza w stronę 1), '<nazwa>-close' (cel 0), '<nazwa>-opened' (doszło do 1), '<nazwa>-shut'
// (doszło do 0). Model wybiera w danych, które z nich mają dźwięk.
import * as THREE from '../../../vendor/three/three.module.js';

const w = new THREE.Vector3();
export function soundChannel(defs = {}) {
  const ch = {
    fn: null, defs,
    emit(id, part) {
      if (!ch.fn) return;
      const at = part && part.getWorldPosition ? part.getWorldPosition(w).toArray() : null;
      ch.fn({ id, at, def: defs[id] || null });
    },
    motion(name, part, rest = 0) {   // rest — stan spoczynku (drzwi zamknięte: 0, podwozie wypuszczone: 1)
      let target = rest, phase = null;
      return {
        step(tgt, v) {
          const t = tgt ? 1 : 0;
          if (t !== target) { target = t; phase = t; ch.emit(`${name}-${t ? 'open' : 'close'}`, part); }
          if (phase === 1 && v > 0.97) { phase = null; ch.emit(`${name}-opened`, part); }
          else if (phase === 0 && v < 0.03) { phase = null; ch.emit(`${name}-shut`, part); }
        },
      };
    },
  };
  return ch;
}
// model: właściwość onSound (słuchacz) i sounds (opisy dźwięków z danych)
export function withSound(model, ch) {
  Object.defineProperty(model, 'onSound', { get: () => ch.fn, set: (f) => { ch.fn = f || null; }, enumerable: true, configurable: true });
  model.sounds = ch.defs;
  return model;
}
